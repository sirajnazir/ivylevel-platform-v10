import express from 'express';
import { Pool } from 'pg';
import fetch from 'node-fetch';
import { 
  Opportunity,
  OpportunityScore,
  OpportunityBucket,
  BombardmentTrigger,
  BombardmentEpisode
} from '@types/ivylevel';
import { logger } from '@packages/logger';

const app = express();
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://saadnazir@localhost/ivylevel'
});

const PORT = process.env.PORT || 4204;
const CATALOG_URL = process.env.CATALOG_URL || 'http://localhost:4202';
const SCORER_URL = process.env.SCORER_URL || 'http://localhost:4203';
const API_URL = process.env.API_URL || 'http://localhost:4000';

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'opportunity-recommender' });
});

// Get recommendations for a student
app.get('/recommendations/:student_id', async (req, res) => {
  try {
    const { student_id } = req.params;
    const { 
      limit = 10,
      buckets,
      min_score = 50,
      kinds,
      refresh = false
    } = req.query;
    
    // If refresh requested, trigger rescoring
    if (refresh === 'true') {
      await fetch(`${SCORER_URL}/scores/recalculate/${student_id}`, { method: 'POST' });
    }
    
    // Build query to fetch scored opportunities
    let query = `
      SELECT 
        os.*,
        o.name as opportunity_name,
        o.kind as opportunity_kind,
        o.tier as opportunity_tier,
        o.category as opportunity_category,
        o.mission as opportunity_mission,
        o.deadlines as opportunity_deadlines,
        o.commitment as opportunity_commitment,
        o.recognition_level as opportunity_recognition_level
      FROM opportunity_scores os
      JOIN opportunities o ON os.opportunity_id = o.id
      WHERE os.student_id = $1 AND os.total_score >= $2
    `;
    const params: any[] = [student_id, Number(min_score)];
    
    if (buckets) {
      const bucketList = Array.isArray(buckets) ? buckets : [buckets];
      params.push(bucketList);
      query += ` AND os.bucket = ANY($${params.length})`;
    }
    
    if (kinds) {
      const kindList = Array.isArray(kinds) ? kinds : [kinds];
      params.push(kindList);
      query += ` AND o.kind = ANY($${params.length})`;
    }
    
    // Order by bucket priority then score
    query += ` ORDER BY 
      CASE os.bucket
        WHEN 'immediate_action' THEN 1
        WHEN 'priority_pipeline' THEN 2
        WHEN 'safety' THEN 3
        WHEN 'strategic_reserve' THEN 4
        WHEN 'reach' THEN 5
      END,
      os.total_score DESC
      LIMIT $${params.length + 1}
    `;
    params.push(Number(limit));
    
    const result = await pool.query(query, params);
    
    // Group by bucket for cleaner response
    const byBucket: Record<string, any[]> = {};
    result.rows.forEach(row => {
      if (!byBucket[row.bucket]) {
        byBucket[row.bucket] = [];
      }
      byBucket[row.bucket].push({
        opportunity_id: row.opportunity_id,
        name: row.opportunity_name,
        kind: row.opportunity_kind,
        tier: row.opportunity_tier,
        category: row.opportunity_category,
        score: row.total_score,
        components: row.components,
        rationale: row.rationale,
        deadlines: row.opportunity_deadlines,
        commitment: row.opportunity_commitment
      });
    });
    
    res.json({
      student_id,
      total_recommendations: result.rowCount,
      recommendations_by_bucket: byBucket,
      summary: {
        immediate_action: byBucket.immediate_action?.length || 0,
        priority_pipeline: byBucket.priority_pipeline?.length || 0,
        strategic_reserve: byBucket.strategic_reserve?.length || 0,
        reach: byBucket.reach?.length || 0,
        safety: byBucket.safety?.length || 0
      }
    });
  } catch (error) {
    logger.error('Error getting recommendations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get bombardment opportunities (burst recommendations)
app.post('/bombardment/:student_id', async (req, res) => {
  try {
    const { student_id } = req.params;
    const { 
      trigger = { type: 'coach_directive' },
      size = 5,
      exclude_buckets = ['reach']
    } = req.body;
    
    // Fetch student vitals to check state
    const vitalsResponse = await fetch(`${API_URL}/students/${student_id}/state`);
    if (!vitalsResponse.ok) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const vitals = await vitalsResponse.json();
    
    // Determine bombardment strategy based on trigger
    const strategy = determineBombardmentStrategy(trigger, vitals);
    
    // Fetch recommendations with strategic filters
    let query = `
      SELECT 
        os.*,
        o.name as opportunity_name,
        o.kind as opportunity_kind,
        o.tier as opportunity_tier,
        o.deadlines as opportunity_deadlines,
        o.commitment as opportunity_commitment
      FROM opportunity_scores os
      JOIN opportunities o ON os.opportunity_id = o.id
      WHERE os.student_id = $1 
        AND os.total_score >= $2
        AND os.bucket != ALL($3)
    `;
    
    const params: any[] = [
      student_id,
      strategy.min_score,
      exclude_buckets
    ];
    
    // Add strategic filters
    if (strategy.prefer_kinds) {
      params.push(strategy.prefer_kinds);
      query += ` AND o.kind = ANY($${params.length})`;
    }
    
    if (strategy.deadline_window) {
      query += ` AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(o.deadlines) AS d
        WHERE (d->>'date')::date BETWEEN CURRENT_DATE + INTERVAL '${strategy.deadline_window[0]} days' 
          AND CURRENT_DATE + INTERVAL '${strategy.deadline_window[1]} days'
      )`;
    }
    
    // Order strategically
    query += ` ORDER BY 
      ${strategy.prioritize_immediate ? 'os.bucket = \'immediate_action\' DESC,' : ''}
      ${strategy.prioritize_safety ? 'os.bucket = \'safety\' DESC,' : ''}
      os.total_score DESC
      LIMIT $${params.length + 1}
    `;
    params.push(size);
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'No suitable opportunities found for bombardment' 
      });
    }
    
    // Create bombardment episode
    const opportunities = result.rows.map(r => r.opportunity_id);
    const episode = await pool.query(`
      INSERT INTO bombardment_episodes 
      (student_id, window, trigger, size, opportunities, coach_rationale)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      student_id,
      `[${new Date().toISOString()}, ${new Date(Date.now() + 30*24*60*60*1000).toISOString()})`,
      JSON.stringify(trigger),
      opportunities.length,
      opportunities,
      strategy.rationale
    ]);
    
    logger.info(`Created bombardment episode for student ${student_id}: ${opportunities.length} opportunities`);
    
    res.json({
      episode: episode.rows[0],
      opportunities: result.rows.map(row => ({
        opportunity_id: row.opportunity_id,
        name: row.opportunity_name,
        kind: row.opportunity_kind,
        tier: row.opportunity_tier,
        score: row.total_score,
        bucket: row.bucket,
        rationale: row.rationale,
        deadlines: row.opportunity_deadlines
      })),
      strategy
    });
  } catch (error) {
    logger.error('Error creating bombardment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update bombardment episode outcomes
app.put('/bombardment/:episode_id/outcomes', async (req, res) => {
  try {
    const { episode_id } = req.params;
    const { outcomes, derived_metrics } = req.body;
    
    const result = await pool.query(`
      UPDATE bombardment_episodes
      SET 
        outcomes = $2,
        derived_metrics = $3
      WHERE id = $1
      RETURNING *
    `, [
      episode_id,
      JSON.stringify(outcomes),
      JSON.stringify(derived_metrics)
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Episode not found' });
    }
    
    logger.info(`Updated bombardment episode ${episode_id} outcomes`);
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error updating bombardment outcomes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get bombardment history for a student
app.get('/bombardment/history/:student_id', async (req, res) => {
  try {
    const { student_id } = req.params;
    
    const result = await pool.query(`
      SELECT * FROM bombardment_episodes
      WHERE student_id = $1
      ORDER BY created_at DESC
    `, [student_id]);
    
    res.json({
      student_id,
      episodes: result.rows,
      total: result.rowCount
    });
  } catch (error) {
    logger.error('Error fetching bombardment history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Smart discovery - find new opportunities not yet scored
app.get('/discover/:student_id', async (req, res) => {
  try {
    const { student_id } = req.params;
    const { limit = 20 } = req.query;
    
    // Fetch student vitals
    const vitalsResponse = await fetch(`${API_URL}/students/${student_id}/state`);
    if (!vitalsResponse.ok) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const vitals = await vitalsResponse.json();
    
    // Find opportunities not yet scored
    const unscored = await pool.query(`
      SELECT o.* FROM opportunities o
      WHERE NOT EXISTS (
        SELECT 1 FROM opportunity_scores os
        WHERE os.opportunity_id = o.id AND os.student_id = $1
      )
      AND ($2 = ANY(o.requirements->'grade_levels') OR o.requirements->'grade_levels' IS NULL)
      ORDER BY 
        CASE 
          WHEN o.tier = 'tier_1' THEN 1
          WHEN o.tier = 'tier_2' THEN 2
          ELSE 3
        END,
        o.created_at DESC
      LIMIT $3
    `, [
      student_id,
      vitals.academic?.grade || '11',
      Number(limit)
    ]);
    
    if (unscored.rows.length === 0) {
      return res.json({
        student_id,
        new_opportunities: [],
        message: 'No new opportunities to discover'
      });
    }
    
    // Trigger scoring for these opportunities
    const opportunity_ids = unscored.rows.map(o => o.id);
    const scoreResponse = await fetch(`${SCORER_URL}/score/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id, opportunity_ids })
    });
    
    if (!scoreResponse.ok) {
      logger.error('Failed to score discovered opportunities');
      return res.status(500).json({ error: 'Failed to score opportunities' });
    }
    
    const scoreData = await scoreResponse.json();
    
    // Fetch the newly scored opportunities
    const scored = await pool.query(`
      SELECT 
        os.*,
        o.name as opportunity_name,
        o.kind as opportunity_kind,
        o.tier as opportunity_tier,
        o.deadlines as opportunity_deadlines
      FROM opportunity_scores os
      JOIN opportunities o ON os.opportunity_id = o.id
      WHERE os.student_id = $1 AND os.opportunity_id = ANY($2)
      ORDER BY os.total_score DESC
    `, [student_id, opportunity_ids]);
    
    res.json({
      student_id,
      new_opportunities: scored.rows.map(row => ({
        opportunity_id: row.opportunity_id,
        name: row.opportunity_name,
        kind: row.opportunity_kind,
        tier: row.opportunity_tier,
        score: row.total_score,
        bucket: row.bucket,
        rationale: row.rationale,
        deadlines: row.opportunity_deadlines
      })),
      scoring_summary: scoreData
    });
  } catch (error) {
    logger.error('Error in opportunity discovery:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to determine bombardment strategy
function determineBombardmentStrategy(trigger: BombardmentTrigger, vitals: any) {
  const strategy: any = {
    min_score: 60,
    prioritize_immediate: false,
    prioritize_safety: false,
    prefer_kinds: null,
    deadline_window: null,
    rationale: ''
  };
  
  switch (trigger.type) {
    case 'rejection_spike':
      strategy.min_score = 65;
      strategy.prioritize_safety = true;
      strategy.prefer_kinds = ['scholarship', 'summer', 'network'];
      strategy.rationale = 'Focus on higher-probability opportunities to rebuild momentum';
      break;
      
    case 'seasonal':
      strategy.prioritize_immediate = true;
      strategy.deadline_window = [0, 45]; // Next 45 days
      strategy.rationale = 'Capture seasonal opportunities before deadlines';
      break;
      
    case 'morale_drop':
      strategy.min_score = 70;
      strategy.prefer_kinds = ['award', 'summer'];
      strategy.prioritize_safety = true;
      strategy.rationale = 'Quick wins to boost confidence';
      break;
      
    case 'coach_directive':
    default:
      strategy.min_score = 55;
      strategy.rationale = trigger.description || 'Strategic opportunity push';
      break;
  }
  
  return strategy;
}

app.listen(PORT, () => {
  logger.info(`Opportunity Recommender service started on port ${PORT}`);
});
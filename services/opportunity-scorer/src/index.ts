import express from 'express';
import { Pool } from 'pg';
import fetch from 'node-fetch';
import { 
  Opportunity,
  OpportunityScore,
  OpportunityScoreComponents,
  OpportunityBucket
} from '../../../packages/types/dist';
import { logger } from '@packages/logger';

const app = express();
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://saadnazir@localhost/ivylevel'
});

const PORT = process.env.PORT || 4203;
const API_URL = process.env.API_URL || 'http://localhost:4000';
const CATALOG_URL = process.env.CATALOG_URL || 'http://localhost:4202';

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'opportunity-scorer' });
});

// Score a single opportunity for a student
app.post('/score', async (req, res) => {
  try {
    const { student_id, opportunity_id } = req.body;
    
    if (!student_id || !opportunity_id) {
      return res.status(400).json({ 
        error: 'student_id and opportunity_id are required' 
      });
    }

    // Fetch student vitals
    const vitalsResponse = await fetch(`${API_URL}/students/${student_id}/state`);
    if (!vitalsResponse.ok) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const vitals = await vitalsResponse.json() as any;

    // Fetch opportunity details
    const oppResponse = await fetch(`${CATALOG_URL}/opportunities/${opportunity_id}`);
    if (!oppResponse.ok) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }
    const opportunity = await oppResponse.json() as Opportunity;

    // Calculate score components
    const components = calculateScoreComponents(vitals, opportunity);
    const total_score = Object.values(components).reduce((a, b) => a + b, 0);
    const bucket = determineBucket(components, total_score, opportunity);
    const rationale = generateRationale(vitals, opportunity, components, bucket);

    // Save score to database
    const result = await pool.query(`
      INSERT INTO opportunity_scores 
      (student_id, opportunity_id, total_score, components, bucket, rationale)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (student_id, opportunity_id) 
      DO UPDATE SET 
        total_score = EXCLUDED.total_score,
        components = EXCLUDED.components,
        bucket = EXCLUDED.bucket,
        rationale = EXCLUDED.rationale,
        created_at = NOW()
      RETURNING *
    `, [
      student_id,
      opportunity_id,
      total_score,
      JSON.stringify(components),
      bucket,
      rationale
    ]);

    logger.info(`Scored opportunity ${opportunity.name} for student ${student_id}: ${total_score}`);
    res.json(result.rows[0]);
  } catch (error) {
    logger.error(error, 'Error scoring opportunity');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Batch score multiple opportunities for a student
app.post('/score/batch', async (req, res) => {
  try {
    const { student_id, opportunity_ids } = req.body;
    
    if (!student_id || !Array.isArray(opportunity_ids)) {
      return res.status(400).json({ 
        error: 'student_id and opportunity_ids array are required' 
      });
    }

    // Fetch student vitals once
    const vitalsResponse = await fetch(`${API_URL}/students/${student_id}/state`);
    if (!vitalsResponse.ok) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const vitals = await vitalsResponse.json() as any;

    const results = [];
    for (const opportunity_id of opportunity_ids) {
      try {
        // Fetch opportunity details
        const oppResponse = await fetch(`${CATALOG_URL}/opportunities/${opportunity_id}`);
        if (!oppResponse.ok) {
          results.push({ 
            success: false, 
            opportunity_id, 
            error: 'Opportunity not found' 
          });
          continue;
        }
        const opportunity = await oppResponse.json() as Opportunity;

        // Calculate score
        const components = calculateScoreComponents(vitals, opportunity);
        const total_score = Object.values(components).reduce((a, b) => a + b, 0);
        const bucket = determineBucket(components, total_score, opportunity);
        const rationale = generateRationale(vitals, opportunity, components, bucket);

        // Save score
        const result = await pool.query(`
          INSERT INTO opportunity_scores 
          (student_id, opportunity_id, total_score, components, bucket, rationale)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (student_id, opportunity_id) 
          DO UPDATE SET 
            total_score = EXCLUDED.total_score,
            components = EXCLUDED.components,
            bucket = EXCLUDED.bucket,
            rationale = EXCLUDED.rationale,
            created_at = NOW()
          RETURNING *
        `, [
          student_id,
          opportunity_id,
          total_score,
          JSON.stringify(components),
          bucket,
          rationale
        ]);

        results.push({ 
          success: true, 
          score: result.rows[0] 
        });
      } catch (error) {
        results.push({ 
          success: false, 
          opportunity_id, 
          error: (error as Error).message 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    logger.info(`Batch scored ${successCount}/${opportunity_ids.length} opportunities for student ${student_id}`);

    res.json({
      student_id,
      total: opportunity_ids.length,
      success: successCount,
      failed: opportunity_ids.length - successCount,
      results
    });
  } catch (error) {
    logger.error(error, 'Error in batch scoring');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all scores for a student
app.get('/scores/student/:student_id', async (req, res) => {
  try {
    const { student_id } = req.params;
    const { bucket } = req.query;
    
    let query = `
      SELECT 
        os.*,
        o.name as opportunity_name,
        o.kind as opportunity_kind,
        o.tier as opportunity_tier,
        o.deadlines as opportunity_deadlines
      FROM opportunity_scores os
      JOIN opportunities o ON os.opportunity_id = o.id
      WHERE os.student_id = $1
    `;
    const params: any[] = [student_id];
    
    if (bucket) {
      params.push(bucket);
      query += ` AND os.bucket = $${params.length}`;
    }
    
    query += ' ORDER BY os.total_score DESC';
    
    const result = await pool.query(query, params);
    res.json({
      student_id,
      scores: result.rows,
      total: result.rowCount
    });
  } catch (error) {
    logger.error(error, 'Error fetching student scores');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Recalculate all scores for a student (e.g., after vitals update)
app.post('/scores/recalculate/:student_id', async (req, res) => {
  try {
    const { student_id } = req.params;
    
    // Fetch student vitals
    const vitalsResponse = await fetch(`${API_URL}/students/${student_id}/state`);
    if (!vitalsResponse.ok) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const vitals = await vitalsResponse.json() as any;
    
    // Get all existing scores for this student
    const existingScores = await pool.query(
      'SELECT opportunity_id FROM opportunity_scores WHERE student_id = $1',
      [student_id]
    );
    
    const updated = [];
    for (const row of existingScores.rows) {
      try {
        // Fetch opportunity details
        const oppResponse = await fetch(`${CATALOG_URL}/opportunities/${row.opportunity_id}`);
        if (!oppResponse.ok) continue;
        
        const opportunity = await oppResponse.json() as Opportunity;
        
        // Recalculate score
        const components = calculateScoreComponents(vitals, opportunity);
        const total_score = Object.values(components).reduce((a, b) => a + b, 0);
        const bucket = determineBucket(components, total_score, opportunity);
        const rationale = generateRationale(vitals, opportunity, components, bucket);
        
        // Update score
        await pool.query(`
          UPDATE opportunity_scores 
          SET 
            total_score = $3,
            components = $4,
            bucket = $5,
            rationale = $6,
            created_at = NOW()
          WHERE student_id = $1 AND opportunity_id = $2
        `, [
          student_id,
          row.opportunity_id,
          total_score,
          JSON.stringify(components),
          bucket,
          rationale
        ]);
        
        updated.push(row.opportunity_id);
      } catch (error) {
        logger.error(error, `Error recalculating score for opportunity ${row.opportunity_id}`);
      }
    }
    
    logger.info(`Recalculated ${updated.length} scores for student ${student_id}`);
    res.json({
      student_id,
      recalculated: updated.length,
      opportunity_ids: updated
    });
  } catch (error) {
    logger.error(error, 'Error recalculating scores');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper functions
function calculateScoreComponents(vitals: any, opportunity: Opportunity): OpportunityScoreComponents {
  const components: OpportunityScoreComponents = {
    academic_fit: 0,      // 0-30
    narrative_fit: 0,     // 0-25
    strategic_value: 0,   // 0-20
    resource_fit: 0,      // 0-15
    timeline_fit: 0       // 0-10
  };

  // Academic fit (0-30)
  // Check GPA requirement
  if (opportunity.requirements.gpa_min && vitals.academic?.gpa) {
    const gpaGap = vitals.academic.gpa - opportunity.requirements.gpa_min;
    if (gpaGap >= 0) {
      components.academic_fit += Math.min(15, 10 + gpaGap * 5);
    } else {
      components.academic_fit += Math.max(0, 10 + gpaGap * 10);
    }
  } else {
    components.academic_fit += 10; // Default if no GPA requirement
  }

  // Check SAT/ACT requirement
  if (opportunity.requirements.sat_min && vitals.test_scores?.sat) {
    const satGap = vitals.test_scores.sat - opportunity.requirements.sat_min;
    if (satGap >= 0) {
      components.academic_fit += Math.min(15, 10 + satGap / 20);
    } else {
      components.academic_fit += Math.max(0, 10 + satGap / 40);
    }
  } else if (opportunity.requirements.act_min && vitals.test_scores?.act) {
    const actGap = vitals.test_scores.act - opportunity.requirements.act_min;
    if (actGap >= 0) {
      components.academic_fit += Math.min(15, 10 + actGap * 2);
    } else {
      components.academic_fit += Math.max(0, 10 + actGap * 4);
    }
  } else {
    components.academic_fit += 10; // Default if no test requirement
  }

  // Narrative fit (0-25)
  // Check skill match
  if (opportunity.requirements.skill_match && vitals.activities?.submitted?.ecs) {
    const studentSkills = new Set<string>();
    vitals.activities.submitted.ecs.forEach((ec: any) => {
      if (ec.tags) ec.tags.forEach((tag: string) => studentSkills.add(tag.toLowerCase()));
      if (ec.skills) ec.skills.forEach((skill: string) => studentSkills.add(skill.toLowerCase()));
    });
    
    const requiredSkills = opportunity.requirements.skill_match.map(s => s.toLowerCase());
    const matchedSkills = requiredSkills.filter(skill => studentSkills.has(skill));
    const matchRatio = matchedSkills.length / requiredSkills.length;
    
    components.narrative_fit += Math.round(matchRatio * 15);
  } else {
    components.narrative_fit += 8;
  }

  // Check theme alignment
  if (vitals.narrative?.themes && opportunity.category) {
    const themes = vitals.narrative.themes.map((t: string) => t.toLowerCase());
    const categoryWords = opportunity.category.toLowerCase().split('_');
    const themeMatch = themes.some((theme: string) => 
      categoryWords.some(word => theme.includes(word))
    );
    if (themeMatch) {
      components.narrative_fit += 10;
    } else {
      components.narrative_fit += 5;
    }
  } else {
    components.narrative_fit += 5;
  }

  // Strategic value (0-20)
  // Tier-based value
  if (opportunity.tier === 'tier_1') {
    components.strategic_value += 10;
  } else if (opportunity.tier === 'tier_2') {
    components.strategic_value += 7;
  } else {
    components.strategic_value += 5;
  }

  // Recognition level value
  if (opportunity.recognition_level === 'global') {
    components.strategic_value += 10;
  } else if (opportunity.recognition_level === 'national') {
    components.strategic_value += 8;
  } else if (opportunity.recognition_level === 'regional') {
    components.strategic_value += 5;
  } else {
    components.strategic_value += 3;
  }

  // Resource fit (0-15)
  // Time commitment check
  const hoursAvailable = vitals.resources?.hours_per_week || 20;
  const hoursRequired = opportunity.commitment.time_cost;
  if (hoursRequired <= hoursAvailable * 0.3) {
    components.resource_fit += 8; // Easy to fit
  } else if (hoursRequired <= hoursAvailable * 0.5) {
    components.resource_fit += 6; // Moderate fit
  } else if (hoursRequired <= hoursAvailable * 0.7) {
    components.resource_fit += 4; // Tight fit
  } else {
    components.resource_fit += 2; // Very tight
  }

  // Financial fit
  const budget = vitals.resources?.budget || 5000;
  const cost = opportunity.commitment.financial_cost;
  if (cost === 0) {
    components.resource_fit += 7; // Free is best
  } else if (cost <= budget * 0.1) {
    components.resource_fit += 6;
  } else if (cost <= budget * 0.2) {
    components.resource_fit += 4;
  } else if (cost <= budget * 0.3) {
    components.resource_fit += 2;
  } else {
    components.resource_fit += 0; // Too expensive
  }

  // Timeline fit (0-10)
  // Check deadline proximity
  const now = new Date();
  const earliestDeadline = opportunity.deadlines
    .map(d => new Date(d.date))
    .sort((a, b) => a.getTime() - b.getTime())[0];
  
  if (earliestDeadline) {
    const daysUntilDeadline = Math.floor((earliestDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDeadline > 60) {
      components.timeline_fit += 10; // Plenty of time
    } else if (daysUntilDeadline > 30) {
      components.timeline_fit += 8;
    } else if (daysUntilDeadline > 14) {
      components.timeline_fit += 6;
    } else if (daysUntilDeadline > 7) {
      components.timeline_fit += 4;
    } else if (daysUntilDeadline > 0) {
      components.timeline_fit += 2;
    } else {
      components.timeline_fit += 0; // Deadline passed
    }
  } else {
    components.timeline_fit += 5; // No deadline info
  }

  return components;
}

function determineBucket(
  components: OpportunityScoreComponents, 
  totalScore: number,
  opportunity: Opportunity
): OpportunityBucket {
  const now = new Date();
  const earliestDeadline = opportunity.deadlines
    .map(d => new Date(d.date))
    .sort((a, b) => a.getTime() - b.getTime())[0];
  
  const daysUntilDeadline = earliestDeadline ? 
    Math.floor((earliestDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 
    999;

  // Immediate action: High score + urgent deadline
  if (totalScore >= 70 && daysUntilDeadline < 14) {
    return 'immediate_action';
  }

  // Priority pipeline: Good score + reasonable timeline
  if (totalScore >= 60 && daysUntilDeadline >= 14 && daysUntilDeadline < 60) {
    return 'priority_pipeline';
  }

  // Strategic reserve: Decent score + future timeline
  if (totalScore >= 50 && daysUntilDeadline >= 60) {
    return 'strategic_reserve';
  }

  // Reach: High tier but lower fit score
  if (opportunity.tier === 'tier_1' && totalScore < 50) {
    return 'reach';
  }

  // Safety: Lower tier but high fit
  if ((opportunity.tier === 'tier_3' || !opportunity.tier) && totalScore >= 60) {
    return 'safety';
  }

  // Default to strategic reserve
  return 'strategic_reserve';
}

function generateRationale(
  vitals: any,
  opportunity: Opportunity,
  components: OpportunityScoreComponents,
  bucket: OpportunityBucket
): string {
  const parts: string[] = [];

  // Mention strongest component
  const componentEntries = Object.entries(components).sort(([,a], [,b]) => b - a);
  const [strongestComponent, strongestScore] = componentEntries[0];
  const componentNames = {
    academic_fit: 'academic profile',
    narrative_fit: 'narrative alignment',
    strategic_value: 'strategic positioning',
    resource_fit: 'resource availability',
    timeline_fit: 'timeline compatibility'
  };

  parts.push(`Strong ${componentNames[strongestComponent as keyof typeof componentNames]} (${strongestScore}pts)`);

  // Mention any weaknesses
  const [weakestComponent, weakestScore] = componentEntries[componentEntries.length - 1];
  const maxScores = { academic_fit: 30, narrative_fit: 25, strategic_value: 20, resource_fit: 15, timeline_fit: 10 };
  const weaknessRatio = weakestScore / maxScores[weakestComponent as keyof typeof maxScores];
  
  if (weaknessRatio < 0.4) {
    parts.push(`limited by ${componentNames[weakestComponent as keyof typeof componentNames]}`);
  }

  // Bucket-specific rationale
  switch (bucket) {
    case 'immediate_action':
      parts.push('urgent deadline requires immediate attention');
      break;
    case 'priority_pipeline':
      parts.push('ideal timing for application preparation');
      break;
    case 'reach':
      parts.push('prestigious opportunity worth attempting despite lower fit');
      break;
    case 'safety':
      parts.push('reliable option with high success probability');
      break;
  }

  return parts.join('; ');
}

app.listen(PORT, () => {
  logger.info(`Opportunity Scorer service started on port ${PORT}`);
});
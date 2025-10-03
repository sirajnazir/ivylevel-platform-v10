import express from 'express';
import { Pool } from 'pg';
import { 
  Opportunity, 
  OpportunityKind, 
  OpportunityTier, 
  OpportunityCategory,
  RecognitionLevel 
} from '../../../packages/types/dist';
import { logger } from '@packages/logger';

const app = express();
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://saadnazir@localhost/ivylevel'
});

const PORT = process.env.PORT || 4202;

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'opportunity-catalog' });
});

// List all opportunities with filtering
app.get('/opportunities', async (req, res) => {
  try {
    const { 
      kind, 
      tier, 
      category, 
      recognition_level,
      grade_level,
      limit = 100,
      offset = 0 
    } = req.query;
    
    let query = 'SELECT * FROM opportunities WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    if (kind) {
      params.push(kind);
      query += ` AND kind = $${++paramCount}`;
    }
    if (tier) {
      params.push(tier);
      query += ` AND tier = $${++paramCount}`;
    }
    if (category) {
      params.push(category);
      query += ` AND category = $${++paramCount}`;
    }
    if (recognition_level) {
      params.push(recognition_level);
      query += ` AND recognition_level = $${++paramCount}`;
    }
    if (grade_level) {
      query += ` AND requirements->'grade_levels' ? $${++paramCount}`;
      params.push(grade_level);
    }

    query += ` ORDER BY 
      CASE 
        WHEN tier = 'tier_1' THEN 1
        WHEN tier = 'tier_2' THEN 2
        WHEN tier = 'tier_3' THEN 3
        ELSE 4
      END,
      created_at DESC`;
    
    params.push(limit);
    query += ` LIMIT $${++paramCount}`;
    params.push(offset);
    query += ` OFFSET $${++paramCount}`;

    const result = await pool.query(query, params);
    
    res.json({
      opportunities: result.rows,
      total: result.rowCount,
      limit: Number(limit),
      offset: Number(offset)
    });
  } catch (error) {
    logger.error(error, 'Error fetching opportunities');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single opportunity
app.get('/opportunities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM opportunities WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error(error, 'Error fetching opportunity');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create opportunity (admin)
app.post('/opportunities', async (req, res) => {
  try {
    const opportunity: Opportunity = req.body;
    
    const result = await pool.query(`
      INSERT INTO opportunities (
        name, kind, tier, category, mission, requirements,
        recognition_level, commitment, deadlines, source, meta
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      opportunity.name,
      opportunity.kind,
      opportunity.tier,
      opportunity.category,
      opportunity.mission,
      JSON.stringify(opportunity.requirements),
      opportunity.recognition_level,
      JSON.stringify(opportunity.commitment),
      JSON.stringify(opportunity.deadlines),
      opportunity.source,
      JSON.stringify(opportunity.meta || {})
    ]);

    logger.info(`Created opportunity: ${opportunity.name}`);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error(error, 'Error creating opportunity');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update opportunity (admin)
app.put('/opportunities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Build dynamic update query
    const updateFields: string[] = [];
    const params: any[] = [];
    let paramCount = 0;

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at') {
        params.push(typeof value === 'object' ? JSON.stringify(value) : value);
        updateFields.push(`${key} = $${++paramCount}`);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    params.push(id);
    const query = `
      UPDATE opportunities 
      SET ${updateFields.join(', ')}
      WHERE id = $${++paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    logger.info(`Updated opportunity: ${id}`);
    res.json(result.rows[0]);
  } catch (error) {
    logger.error(error, 'Error updating opportunity');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete opportunity (admin)
app.delete('/opportunities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM opportunities WHERE id = $1 RETURNING id, name',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    logger.info(`Deleted opportunity: ${result.rows[0].name}`);
    res.json({ message: 'Opportunity deleted', id });
  } catch (error) {
    logger.error(error, 'Error deleting opportunity');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Batch import opportunities (admin)
app.post('/opportunities/batch', async (req, res) => {
  try {
    const { opportunities } = req.body;
    
    if (!Array.isArray(opportunities)) {
      return res.status(400).json({ error: 'opportunities must be an array' });
    }

    const results = [];
    for (const opp of opportunities) {
      try {
        const result = await pool.query(`
          INSERT INTO opportunities (
            name, kind, tier, category, mission, requirements,
            recognition_level, commitment, deadlines, source, meta
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id, name
        `, [
          opp.name,
          opp.kind,
          opp.tier,
          opp.category,
          opp.mission,
          JSON.stringify(opp.requirements),
          opp.recognition_level,
          JSON.stringify(opp.commitment),
          JSON.stringify(opp.deadlines),
          opp.source,
          JSON.stringify(opp.meta || {})
        ]);
        results.push({ success: true, opportunity: result.rows[0] });
      } catch (error) {
        results.push({ success: false, name: opp.name, error: (error as Error).message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    logger.info(`Batch imported ${successCount}/${opportunities.length} opportunities`);
    
    res.json({
      total: opportunities.length,
      success: successCount,
      failed: opportunities.length - successCount,
      results
    });
  } catch (error) {
    logger.error(error, 'Error in batch import');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search opportunities by deadline
app.get('/opportunities/by-deadline', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const result = await pool.query(`
      SELECT * FROM opportunities
      WHERE EXISTS (
        SELECT 1 FROM jsonb_array_elements(deadlines) AS d
        WHERE (d->>'date')::date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '$1 days'
      )
      ORDER BY (
        SELECT MIN((d->>'date')::date) 
        FROM jsonb_array_elements(deadlines) AS d
      )
    `, [days]);

    res.json({
      opportunities: result.rows,
      total: result.rowCount,
      days_ahead: Number(days)
    });
  } catch (error) {
    logger.error(error, 'Error fetching opportunities by deadline');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get opportunity statistics
app.get('/opportunities/stats', async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT kind) as unique_kinds,
        COUNT(DISTINCT category) as unique_categories,
        COUNT(CASE WHEN tier = 'tier_1' THEN 1 END) as tier_1_count,
        COUNT(CASE WHEN tier = 'tier_2' THEN 1 END) as tier_2_count,
        COUNT(CASE WHEN tier = 'tier_3' THEN 1 END) as tier_3_count,
        COUNT(CASE WHEN recognition_level = 'national' THEN 1 END) as national_count,
        COUNT(CASE WHEN recognition_level = 'global' THEN 1 END) as global_count
      FROM opportunities
    `);

    const byKind = await pool.query(`
      SELECT kind, COUNT(*) as count 
      FROM opportunities 
      GROUP BY kind 
      ORDER BY count DESC
    `);

    const byCategory = await pool.query(`
      SELECT category, COUNT(*) as count 
      FROM opportunities 
      WHERE category IS NOT NULL
      GROUP BY category 
      ORDER BY count DESC
    `);

    res.json({
      summary: stats.rows[0],
      by_kind: byKind.rows,
      by_category: byCategory.rows
    });
  } catch (error) {
    logger.error(error, 'Error fetching opportunity stats');
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  logger.info(`Opportunity Catalog service started on port ${PORT}`);
});
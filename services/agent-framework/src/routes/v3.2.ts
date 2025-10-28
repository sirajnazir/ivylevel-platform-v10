/**
 * v3.2 API Routes
 * Purpose: Frontend integration for v3.2 infrastructure
 * Features: Evidence chips, HGTI, 412 UX, Growth events
 * Date: 2025-10-23
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { ChipRepository } from '../chips/chip-repository.js';
import { GrowthTracker } from '../hgti/growth-tracker.js';

export function v32Router(pool: Pool): Router {
  const router = Router();
  const chipRepo = new ChipRepository(pool);
  const growthTracker = new GrowthTracker();

  // ============================================================================
  // EVIDENCE CHIPS API
  // ============================================================================

  /**
   * GET /students/:id/chips
   * Fetch evidence chips for a student with optional filtering
   */
  router.get('/students/:id/chips', async (req: Request, res: Response) => {
    try {
      const studentId = req.params.id;
      const { kind, limit = '50', trace_id } = req.query;

      // RLS check: Verify user has access to this student
      // TODO: Add RLS middleware when auth is integrated

      const filters: any = {};
      if (kind) filters.kind = kind as string;
      if (trace_id) filters.trace_id = trace_id as string;

      const chips = await chipRepo.findByStudent(
        studentId,
        kind as any,
        parseInt(limit as string, 10)
      );

      res.json(chips);
    } catch (error: any) {
      console.error('[v3.2] Error fetching chips:', error);
      res.status(500).json({
        error: 'Failed to fetch evidence chips',
        message: error.message
      });
    }
  });

  /**
   * GET /students/:id/chips/:chip_id
   * Fetch a specific chip by ID
   */
  router.get('/students/:id/chips/:chip_id', async (req: Request, res: Response) => {
    try {
      const { id: studentId, chip_id } = req.params;

      const chip = await chipRepo.findById(chip_id);

      if (!chip || chip.student_id !== studentId) {
        return res.status(404).json({ error: 'Chip not found' });
      }

      res.json(chip);
    } catch (error: any) {
      console.error('[v3.2] Error fetching chip:', error);
      res.status(500).json({
        error: 'Failed to fetch chip',
        message: error.message
      });
    }
  });

  // ============================================================================
  // HGTI (GROWTH TRACKING) API
  // ============================================================================

  /**
   * GET /students/:id/hgti
   * Get HGTI (Human Growth & Transformation Index) score
   * Query params: mode=cached|realtime (default: cached)
   */
  router.get('/students/:id/hgti', async (req: Request, res: Response) => {
    try {
      const studentId = req.params.id;
      const { mode = 'cached' } = req.query;

      // RLS check
      // TODO: Add RLS middleware

      const stats = await growthTracker.getHGTIStats(studentId, { realtime: mode === 'realtime' });

      if (!stats) {
        return res.status(404).json({
          error: 'HGTI score not available',
          message: 'No growth barriers detected yet for this student'
        });
      }

      // Get breakdown by barrier type
      const breakdownResult = await pool.query(`
        SELECT
          barrier_type,
          AVG(transformation_delta) as contribution
        FROM growth_events
        WHERE student_id = $1
        GROUP BY barrier_type
        ORDER BY contribution DESC
      `, [studentId]);

      const breakdown = breakdownResult.rows.map((row: any) => ({
        barrier_type: row.barrier_type,
        contribution: parseFloat(row.contribution) * 100, // Convert to percentage
      }));

      // Return frontend-compatible format
      res.json({
        student_id: studentId,
        score: stats.avg_transformation * 100, // Convert 0-1 to 0-100
        version: 1,
        calculated_at: stats.latest_event_date?.toISOString() || new Date().toISOString(),
        breakdown,
      });
    } catch (error: any) {
      console.error('[v3.2] Error fetching HGTI score:', error);
      res.status(500).json({
        error: 'Failed to fetch HGTI score',
        message: error.message
      });
    }
  });

  /**
   * GET /students/:id/growth-events
   * Get growth/transformation events for student
   * Query params: limit, barrier_type
   */
  router.get('/students/:id/growth-events', async (req: Request, res: Response) => {
    try {
      const studentId = req.params.id;
      const { limit = '20', barrier_type } = req.query;

      // RLS check
      // TODO: Add RLS middleware

      let events;
      if (barrier_type) {
        events = await growthTracker.getEventsByBarrierType(studentId, barrier_type as any);
      } else {
        // Get all events
        const result = await pool.query(`
          SELECT *
          FROM growth_events
          WHERE student_id = $1
          ORDER BY occurred_at DESC
          LIMIT $2
        `, [studentId, parseInt(limit as string, 10)]);

        events = result.rows.map((row: any) => ({
          id: row.id,
          student_id: row.student_id,
          barrier_type: row.barrier_type,
          trigger: row.trigger,
          coach_reflection: row.coach_reflection,
          student_reflection: row.student_reflection,
          breakthrough: row.breakthrough,
          transformation_delta: parseFloat(row.transformation_delta),
          occurred_at: row.occurred_at,
          created_at: row.created_at,
        }));
      }

      res.json(events);
    } catch (error: any) {
      console.error('[v3.2] Error fetching growth events:', error);
      res.status(500).json({
        error: 'Failed to fetch growth events',
        message: error.message
      });
    }
  });

  // ============================================================================
  // 412 UX (MISSING EVIDENCE) API
  // ============================================================================

  /**
   * GET /students/:id/facts/:type
   * Get a fact for a student, returns 412 if missing evidence
   * Examples:
   *   /students/123/facts/gpa_latest
   *   /students/123/facts/sat_latest
   *   /students/123/facts/deadline_latest
   */
  router.get('/students/:id/facts/:type', async (req: Request, res: Response) => {
    try {
      const { id: studentId, type: factType } = req.params;

      // RLS check
      // TODO: Add RLS middleware

      // Query fact from database
      const fact = await queryFact(pool, studentId, factType);

      if (!fact) {
        // Return 412 with structured guidance
        const missingEvidence = generateMissingEvidenceResponse(factType);
        return res.status(412).json(missingEvidence);
      }

      res.json(fact);
    } catch (error: any) {
      console.error('[v3.2] Error fetching fact:', error);
      res.status(500).json({
        error: 'Failed to fetch fact',
        message: error.message
      });
    }
  });

  return router;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Query a fact from the database
 * This is a simplified version - extend based on actual fact schema
 */
async function queryFact(pool: Pool, studentId: string, factType: string): Promise<any | null> {
  try {
    // Map fact types to database queries
    const factQueries: Record<string, string> = {
      gpa_latest: `
        SELECT value, occurred_at
        FROM student_facts
        WHERE student_id = $1 AND kind = 'gpa'
        ORDER BY occurred_at DESC LIMIT 1
      `,
      sat_latest: `
        SELECT value, occurred_at
        FROM student_facts
        WHERE student_id = $1 AND kind = 'sat_total_score'
        ORDER BY occurred_at DESC LIMIT 1
      `,
      act_latest: `
        SELECT value, occurred_at
        FROM student_facts
        WHERE student_id = $1 AND kind = 'act_composite'
        ORDER BY occurred_at DESC LIMIT 1
      `,
      deadline_latest: `
        SELECT deadline, college_name
        FROM deadlines
        WHERE student_id = $1
        ORDER BY deadline ASC LIMIT 1
      `,
    };

    const query = factQueries[factType];
    if (!query) {
      return null; // Unknown fact type
    }

    const result = await pool.query(query, [studentId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('[v3.2] Error querying fact:', error);
    return null;
  }
}

/**
 * Generate 412 missing evidence response
 * Week 0: Only suggest add_award and upload_transcript actions
 */
function generateMissingEvidenceResponse(factType: string): any {
  const responses: Record<string, any> = {
    gpa_latest: {
      fact_type: 'gpa_latest',
      status: 412,
      message: 'We need your transcript to calculate your GPA',
      missing: [
        'High school transcript with grades',
        'Course list with credit hours',
      ],
      suggested_actions: [
        {
          action: 'upload_transcript',
          description: 'Upload your high school transcript',
          endpoint: '/profile/transcripts',
        },
      ],
    },
    sat_latest: {
      fact_type: 'sat_latest',
      status: 412,
      message: 'We need your SAT scores to show your testing progress',
      missing: [
        'SAT score report (official or unofficial)',
        'Test date and section scores',
      ],
      suggested_actions: [
        {
          action: 'upload_transcript',
          description: 'Upload your SAT score report',
          endpoint: '/profile/testing',
        },
      ],
    },
    act_latest: {
      fact_type: 'act_latest',
      status: 412,
      message: 'We need your ACT scores to show your testing progress',
      missing: [
        'ACT score report (official or unofficial)',
        'Test date and section scores',
      ],
      suggested_actions: [
        {
          action: 'upload_transcript',
          description: 'Upload your ACT score report',
          endpoint: '/profile/testing',
        },
      ],
    },
    deadline_latest: {
      fact_type: 'deadline_latest',
      status: 412,
      message: 'We need your college list to track deadlines',
      missing: [
        'College application deadlines',
        'List of schools you\'re applying to',
      ],
      suggested_actions: [
        {
          action: 'add_award',
          description: 'Add colleges to your list',
          endpoint: '/profile/colleges',
        },
      ],
    },
  };

  return responses[factType] || {
    fact_type: factType,
    status: 412,
    message: `We need more information about ${factType}`,
    missing: ['Required data not available'],
    suggested_actions: [],
  };
}

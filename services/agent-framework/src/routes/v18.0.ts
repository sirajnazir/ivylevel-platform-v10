/**
 * v18.0 API Routes - GamePlan Dynamic Adaptive Features
 * Purpose: APIs for dynamic game plan features (revisions, quarterly reviews, events, parallel plans)
 * Database: gameplan_revisions, gameplan_events, quarterly_reviews, parallel_plans (from migration 012)
 * Date: 2025-10-29
 *
 * Extends v12.0 with dynamic adaptive primitives:
 * - Revision history tracking
 * - Quarterly review results
 * - Event-driven pivots
 * - Parallel plans for undecided students
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

export function v18Router(pool: Pool): Router {
  const router = Router();

  // ============================================================================
  // GAME PLAN REVISIONS APIs
  // ============================================================================

  /**
   * GET /api/v18/students/:studentId/game-plan/revisions
   * Get revision history for student's game plan
   */
  router.get('/students/:studentId/game-plan/revisions', async (req: Request, res: Response) => {
    try {
      const { studentId } = req.params;
      const { limit = 20 } = req.query;

      const result = await pool.query(
        `SELECT * FROM v_gameplan_revision_history
         WHERE student_id = $1
         ORDER BY revision_date DESC
         LIMIT $2`,
        [studentId, parseInt(limit as string)]
      );

      res.json({
        student_id: studentId,
        revision_count: result.rows.length,
        revisions: result.rows,
      });
    } catch (error) {
      console.error('Error fetching revision history:', error);
      res.status(500).json({ error: 'Internal server error', message: (error as Error).message });
    }
  });

  /**
   * GET /api/v18/students/:studentId/game-plan/revisions/:revisionId
   * Get detailed information for a specific revision
   */
  router.get(
    '/students/:studentId/game-plan/revisions/:revisionId',
    async (req: Request, res: Response) => {
      try {
        const { studentId, revisionId } = req.params;

        const result = await pool.query(
          `SELECT gr.*, gp.student_id
           FROM gameplan_revisions gr
           JOIN game_plans gp ON gr.game_plan_id = gp.game_plan_id
           WHERE gr.revision_id = $1 AND gp.student_id = $2`,
          [revisionId, studentId]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({
            error: 'Revision not found',
            message: `Revision ${revisionId} not found for student ${studentId}`,
          });
        }

        res.json(result.rows[0]);
      } catch (error) {
        console.error('Error fetching revision:', error);
        res
          .status(500)
          .json({ error: 'Internal server error', message: (error as Error).message });
      }
    }
  );

  // ============================================================================
  // QUARTERLY REVIEWS APIs
  // ============================================================================

  /**
   * GET /api/v18/students/:studentId/game-plan/quarterly-reviews
   * Get all quarterly reviews for student
   */
  router.get(
    '/students/:studentId/game-plan/quarterly-reviews',
    async (req: Request, res: Response) => {
      try {
        const { studentId } = req.params;

        const result = await pool.query(
          `SELECT * FROM quarterly_reviews
           WHERE student_id = $1
           ORDER BY review_date DESC`,
          [studentId]
        );

        // Calculate overall progress trend
        const reviewsWithTrend = result.rows.map((review, index, arr) => {
          const previousReview = arr[index + 1];
          const trend = previousReview
            ? review.rubric_score_delta - previousReview.rubric_score_delta
            : null;

          return {
            ...review,
            trend: trend ? (trend > 0 ? 'improving' : trend < 0 ? 'declining' : 'stable') : null,
          };
        });

        res.json({
          student_id: studentId,
          review_count: result.rows.length,
          latest_review: result.rows[0] || null,
          quarterly_reviews: reviewsWithTrend,
        });
      } catch (error) {
        console.error('Error fetching quarterly reviews:', error);
        res
          .status(500)
          .json({ error: 'Internal server error', message: (error as Error).message });
      }
    }
  );

  /**
   * GET /api/v18/students/:studentId/game-plan/quarterly-reviews/latest
   * Get latest quarterly review
   */
  router.get(
    '/students/:studentId/game-plan/quarterly-reviews/latest',
    async (req: Request, res: Response) => {
      try {
        const { studentId } = req.params;

        const result = await pool.query(
          `SELECT * FROM quarterly_reviews
           WHERE student_id = $1
           ORDER BY review_date DESC
           LIMIT 1`,
          [studentId]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({
            error: 'No quarterly reviews found',
            message: `No quarterly reviews exist for student ${studentId}`,
          });
        }

        res.json(result.rows[0]);
      } catch (error) {
        console.error('Error fetching latest quarterly review:', error);
        res
          .status(500)
          .json({ error: 'Internal server error', message: (error as Error).message });
      }
    }
  );

  /**
   * GET /api/v18/students/:studentId/game-plan/due-for-review
   * Check if student's game plan is due for quarterly review
   */
  router.get(
    '/students/:studentId/game-plan/due-for-review',
    async (req: Request, res: Response) => {
      try {
        const { studentId } = req.params;

        const result = await pool.query(
          `SELECT * FROM v_game_plans_due_for_review
           WHERE student_id = $1`,
          [studentId]
        );

        const isDue = result.rows.length > 0;

        res.json({
          student_id: studentId,
          is_due_for_review: isDue,
          game_plan: isDue ? result.rows[0] : null,
        });
      } catch (error) {
        console.error('Error checking review status:', error);
        res
          .status(500)
          .json({ error: 'Internal server error', message: (error as Error).message });
      }
    }
  );

  // ============================================================================
  // GAMEPLAN EVENTS APIs
  // ============================================================================

  /**
   * GET /api/v18/students/:studentId/game-plan/events
   * Get all significant events for student's game plan
   */
  router.get('/students/:studentId/game-plan/events', async (req: Request, res: Response) => {
    try {
      const { studentId } = req.params;
      const { event_type, significance, limit = 50 } = req.query;

      let query = `
        SELECT * FROM gameplan_events
        WHERE student_id = $1
      `;
      const params: any[] = [studentId];

      if (event_type) {
        params.push(event_type);
        query += ` AND event_type = $${params.length}`;
      }

      if (significance) {
        params.push(significance);
        query += ` AND significance = $${params.length}`;
      }

      params.push(parseInt(limit as string));
      query += ` ORDER BY event_date DESC LIMIT $${params.length}`;

      const result = await pool.query(query, params);

      // Group events by type
      const eventsByType = result.rows.reduce(
        (acc, event) => {
          if (!acc[event.event_type]) {
            acc[event.event_type] = [];
          }
          acc[event.event_type].push(event);
          return acc;
        },
        {} as Record<string, any[]>
      );

      res.json({
        student_id: studentId,
        event_count: result.rows.length,
        events_by_type: eventsByType,
        all_events: result.rows,
      });
    } catch (error) {
      console.error('Error fetching game plan events:', error);
      res.status(500).json({ error: 'Internal server error', message: (error as Error).message });
    }
  });

  /**
   * POST /api/v18/students/:studentId/game-plan/events
   * Create a new game plan event (e.g., award won, program accepted)
   */
  router.post('/students/:studentId/game-plan/events', async (req: Request, res: Response) => {
    try {
      const { studentId } = req.params;
      const {
        game_plan_id,
        event_type,
        event_title,
        event_description,
        significance,
        week_number,
        impact_on_profile,
      } = req.body;

      // Validate required fields
      if (!game_plan_id || !event_type || !event_title || !significance || !week_number) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: [
            'game_plan_id',
            'event_type',
            'event_title',
            'significance',
            'week_number',
          ],
        });
      }

      // Determine if this event should trigger revision
      const shouldTriggerRevision = significance === 'MAJOR';

      const result = await pool.query(
        `INSERT INTO gameplan_events (
          student_id, game_plan_id, event_type, event_title, event_description,
          significance, week_number, impact_on_profile, triggered_revision
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          studentId,
          game_plan_id,
          event_type,
          event_title,
          event_description || null,
          significance,
          week_number,
          JSON.stringify(impact_on_profile || {}),
          shouldTriggerRevision,
        ]
      );

      res.status(201).json({
        event: result.rows[0],
        will_trigger_revision: shouldTriggerRevision,
      });
    } catch (error) {
      console.error('Error creating game plan event:', error);
      res.status(500).json({ error: 'Internal server error', message: (error as Error).message });
    }
  });

  /**
   * GET /api/v18/students/:studentId/game-plan/event-impact
   * Get event impact summary (aggregated statistics)
   */
  router.get(
    '/students/:studentId/game-plan/event-impact',
    async (req: Request, res: Response) => {
      try {
        const { studentId } = req.params;

        const result = await pool.query(
          `SELECT * FROM v_gameplan_event_impact
           WHERE student_id = $1
           ORDER BY significance DESC, event_count DESC`,
          [studentId]
        );

        res.json({
          student_id: studentId,
          impact_summary: result.rows,
        });
      } catch (error) {
        console.error('Error fetching event impact:', error);
        res
          .status(500)
          .json({ error: 'Internal server error', message: (error as Error).message });
      }
    }
  );

  // ============================================================================
  // PARALLEL PLANS APIs (for undecided students)
  // ============================================================================

  /**
   * GET /api/v18/students/:studentId/game-plan/parallel-plans
   * Get all parallel plans for undecided student
   */
  router.get(
    '/students/:studentId/game-plan/parallel-plans',
    async (req: Request, res: Response) => {
      try {
        const { studentId } = req.params;

        // Get parallel plans
        const plansResult = await pool.query(
          `SELECT * FROM parallel_plans
           WHERE student_id = $1
           ORDER BY confidence_score DESC`,
          [studentId]
        );

        // Get summary
        const summaryResult = await pool.query(
          `SELECT * FROM v_parallel_plans_summary
           WHERE student_id = $1`,
          [studentId]
        );

        res.json({
          student_id: studentId,
          has_parallel_plans: plansResult.rows.length > 0,
          summary: summaryResult.rows[0] || null,
          parallel_plans: plansResult.rows,
        });
      } catch (error) {
        console.error('Error fetching parallel plans:', error);
        res
          .status(500)
          .json({ error: 'Internal server error', message: (error as Error).message });
      }
    }
  );

  /**
   * POST /api/v18/students/:studentId/game-plan/parallel-plans
   * Create a new parallel plan (e.g., exploring CS vs ChemEng)
   */
  router.post(
    '/students/:studentId/game-plan/parallel-plans',
    async (req: Request, res: Response) => {
      try {
        const { studentId } = req.params;
        const {
          parent_game_plan_id,
          major_focus,
          target_schools,
          target_profile_name,
          confidence_score,
        } = req.body;

        // Validate required fields
        if (!parent_game_plan_id || !major_focus || !confidence_score) {
          return res.status(400).json({
            error: 'Missing required fields',
            required: ['parent_game_plan_id', 'major_focus', 'confidence_score'],
          });
        }

        const result = await pool.query(
          `INSERT INTO parallel_plans (
            student_id, parent_game_plan_id, major_focus, target_schools,
            target_profile_name, confidence_score, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *`,
          [
            studentId,
            parent_game_plan_id,
            major_focus,
            target_schools || [],
            target_profile_name || null,
            confidence_score,
            'exploring',
          ]
        );

        res.status(201).json({
          parallel_plan: result.rows[0],
        });
      } catch (error) {
        console.error('Error creating parallel plan:', error);
        res
          .status(500)
          .json({ error: 'Internal server error', message: (error as Error).message });
      }
    }
  );

  /**
   * PUT /api/v18/students/:studentId/game-plan/parallel-plans/:parallelPlanId
   * Update parallel plan (e.g., update confidence score, add signals, change status)
   */
  router.put(
    '/students/:studentId/game-plan/parallel-plans/:parallelPlanId',
    async (req: Request, res: Response) => {
      try {
        const { studentId, parallelPlanId } = req.params;
        const { confidence_score, status, passion_signals, aptitude_signals } = req.body;

        // Build dynamic update query
        const updates: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        if (confidence_score !== undefined) {
          params.push(confidence_score);
          updates.push(`confidence_score = $${paramIndex++}`);
        }

        if (status) {
          params.push(status);
          updates.push(`status = $${paramIndex++}`);
        }

        if (passion_signals) {
          params.push(JSON.stringify(passion_signals));
          updates.push(`passion_signals = $${paramIndex++}`);
        }

        if (aptitude_signals) {
          params.push(JSON.stringify(aptitude_signals));
          updates.push(`aptitude_signals = $${paramIndex++}`);
        }

        if (updates.length === 0) {
          return res.status(400).json({ error: 'No fields to update' });
        }

        updates.push(`updated_at = NOW()`);

        params.push(parallelPlanId, studentId);
        const query = `
          UPDATE parallel_plans
          SET ${updates.join(', ')}
          WHERE parallel_plan_id = $${paramIndex++} AND student_id = $${paramIndex++}
          RETURNING *
        `;

        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
          return res.status(404).json({
            error: 'Parallel plan not found',
            message: `Parallel plan ${parallelPlanId} not found for student ${studentId}`,
          });
        }

        res.json({
          parallel_plan: result.rows[0],
        });
      } catch (error) {
        console.error('Error updating parallel plan:', error);
        res
          .status(500)
          .json({ error: 'Internal server error', message: (error as Error).message });
      }
    }
  );

  /**
   * GET /api/v18/students/:studentId/game-plan/convergence-status
   * Get convergence status for undecided student (which path is winning?)
   */
  router.get(
    '/students/:studentId/game-plan/convergence-status',
    async (req: Request, res: Response) => {
      try {
        const { studentId } = req.params;

        const summaryResult = await pool.query(
          `SELECT * FROM v_parallel_plans_summary
           WHERE student_id = $1`,
          [studentId]
        );

        if (summaryResult.rows.length === 0) {
          return res.json({
            student_id: studentId,
            has_parallel_plans: false,
            message: 'Student has no parallel plans (already decided)',
          });
        }

        const summary = summaryResult.rows[0];

        // Get all parallel plans with details
        const plansResult = await pool.query(
          `SELECT * FROM parallel_plans
           WHERE student_id = $1
           ORDER BY confidence_score DESC`,
          [studentId]
        );

        // Determine convergence recommendation
        const leadingPlan = plansResult.rows[0];
        const convergenceRecommendation =
          leadingPlan.confidence_score > 0.7
            ? 'ready_to_converge'
            : summary.exploring_count > 2
              ? 'narrow_to_two'
              : 'continue_exploring';

        res.json({
          student_id: studentId,
          has_parallel_plans: true,
          convergence_recommendation,
          leading_path: summary.leading_path,
          highest_confidence: parseFloat(summary.highest_confidence_score),
          total_paths: parseInt(summary.total_parallel_paths),
          status_breakdown: {
            exploring: parseInt(summary.exploring_count),
            narrowing: parseInt(summary.narrowing_count),
            converged: parseInt(summary.converged_count),
            eliminated: parseInt(summary.eliminated_count),
          },
          parallel_plans: plansResult.rows,
        });
      } catch (error) {
        console.error('Error fetching convergence status:', error);
        res
          .status(500)
          .json({ error: 'Internal server error', message: (error as Error).message });
      }
    }
  );

  return router;
}

/**
 * Game Plan Resolvers
 *
 * Facts-first deterministic SQL resolvers for:
 * - Game plan summary (narrative + targets)
 * - Game plan vs execution
 * - Plan events
 *
 * NO RAG - pure SQL with full provenance
 */

import type { Pool } from 'pg';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('resolvers-gameplan');

// ============================================================================
// GAME PLAN
// ============================================================================

export const gameplan = {
  summaryInitial: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('gameplan.summaryInitial_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT student_id, narrative_items, award_targets, ec_targets, program_targets
         FROM v_gameplan_summary_initial
        WHERE student_id=$1
        LIMIT 1`,
      [studentId]
    );

    log.event('gameplan.summaryInitial_complete', {
      student_id: studentId,
      found: rows.length > 0,
      took_ms: Date.now() - start
    });

    return rows[0] || null;
  },

  vsExecution: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('gameplan.vsExecution_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT *
         FROM v_gameplan_vs_execution
        WHERE student_id=$1`,
      [studentId]
    );

    log.event('gameplan.vsExecution_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  planEvents: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('gameplan.planEvents_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT *
         FROM v_plan_events_summary
        WHERE student_id=$1
        ORDER BY event_date DESC
        LIMIT 50`,
      [studentId]
    );

    log.event('gameplan.planEvents_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  }
};

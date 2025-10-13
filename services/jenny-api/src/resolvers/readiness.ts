/**
 * Readiness / IvyScore Resolvers
 *
 * Facts-first deterministic SQL resolvers for:
 * - IvyScore (latest snapshot)
 * - Readiness features (breakdown)
 * - Readiness progression (historical scores)
 *
 * NO RAG - pure SQL with full provenance
 */

import type { Pool } from 'pg';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('resolvers-readiness');

// ============================================================================
// IVYSCORE / READINESS
// ============================================================================

export const ivyscore = {
  latest: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    console.log('[RESOLVER:ivyscore.latest] 🎯 Called with studentId:', studentId);
    log.event('ivyscore.latest_start', { student_id: studentId });

    const query = `SELECT student_id, rubric_id, snapshot_phase, as_of, overall_score, snapshot_id
         FROM v_ivyready_latest
        WHERE student_id=$1
        LIMIT 1`;
    console.log('[RESOLVER:ivyscore.latest] → Executing SQL:', query);
    console.log('[RESOLVER:ivyscore.latest] → With params:', [studentId]);

    const { rows } = await pg.query(query, [studentId]);

    console.log('[RESOLVER:ivyscore.latest] ✓ Query returned', rows.length, 'rows');
    if (rows.length > 0) {
      console.log('[RESOLVER:ivyscore.latest] → First row:', JSON.stringify(rows[0]));
    } else {
      console.log('[RESOLVER:ivyscore.latest] ⚠️  NO DATA FOUND - view may be empty or view name incorrect');
    }

    log.event('ivyscore.latest_complete', {
      student_id: studentId,
      found: rows.length > 0,
      score: rows[0]?.overall_score,
      took_ms: Date.now() - start
    });

    return rows[0] || null;
  },

  current: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('ivyscore.current_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT student_id, rubric_id, snapshot_phase, as_of, overall_score
         FROM v_ivyready_current
        WHERE student_id=$1
        LIMIT 1`,
      [studentId]
    );

    log.event('ivyscore.current_complete', {
      student_id: studentId,
      found: rows.length > 0,
      score: rows[0]?.overall_score,
      took_ms: Date.now() - start
    });

    return rows[0] || null;
  },

  progression: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('ivyscore.progression_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT student_id, rubric_id, snapshot_phase, as_of, overall_score
         FROM v_ivyready_progression
        WHERE student_id=$1
        ORDER BY as_of`,
      [studentId]
    );

    log.event('ivyscore.progression_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  }
};

export const readiness = {
  topPriorities: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('readiness.topPriorities_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT *
         FROM v_readiness_top_priorities
        WHERE student_id=$1
        ORDER BY gap_weighted DESC
        LIMIT 5`,
      [studentId]
    );

    log.event('readiness.topPriorities_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  weakspots: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('readiness.weakspots_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT *
         FROM v_readiness_weakspots
        WHERE student_id=$1
        ORDER BY gap DESC
        LIMIT 5`,
      [studentId]
    );

    log.event('readiness.weakspots_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  }
};

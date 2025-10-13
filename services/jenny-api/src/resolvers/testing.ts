/**
 * Testing Resolver (SAT/ACT/AP)
 *
 * Provides temporal resolution for standardized test scores
 * Backed by v_sat_enum_* views
 */

import type { Pool } from 'pg';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('resolvers-testing');

// ============================================================================
// SAT
// ============================================================================

export const sat = {
  /**
   * First SAT score (earliest)
   */
  first: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('sat.first_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT * FROM v_sat_enum_first WHERE student_id = $1`,
      [studentId]
    );

    log.event('sat.first_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  /**
   * Latest SAT score (most recent)
   */
  latest: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('sat.latest_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT * FROM v_sat_enum_latest WHERE student_id = $1`,
      [studentId]
    );

    log.event('sat.latest_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  /**
   * All SAT scores (progression/history)
   */
  progression: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('sat.progression_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT * FROM v_sat_enum_progression WHERE student_id = $1 ORDER BY nth`,
      [studentId]
    );

    log.event('sat.progression_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  }
};

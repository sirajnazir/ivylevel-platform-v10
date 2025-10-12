/**
 * Enumerations Resolvers - Facts-first deterministic queries
 *
 * For initial/final/won awards, ECs, narratives, and plan events
 * Based on canonical tables from derived CSVs (JTBD Index, Interactions, Facts)
 */

import { Pool } from 'pg';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('resolver-enumerations');

// ============================================================================
// Types
// ============================================================================

export type AwardTarget = {
  id: number;
  student_id: string;
  phase: string;
  item_label: string;
  as_of: string | null;
  source_id: string | null;
  jtbd_id: string | null;
};

export type ECTarget = {
  id: number;
  student_id: string;
  phase: string;
  item_label: string;
  as_of: string | null;
  source_id: string | null;
  jtbd_id: string | null;
};

export type AwardWon = {
  student_id: string;
  as_of: string;
  evidence: string;
  source_id: string | null;
  jtbd_id: string | null;
  snippet_id: string | null;
};

export type SATScore = {
  student_id: string;
  as_of: string;
  numeric_value: number;
  type: string | null;
  confidence: string | null;
  source_id: string | null;
  nth?: number;
};

export type EnumResult<T> = {
  items: T[];
  count: number;
  trace: {
    query_type: string;
    took_ms: number;
    student_id: string;
  };
};

// ============================================================================
// Award Targets Resolvers
// ============================================================================

export async function getInitialAwards(
  pool: Pool,
  studentId: string
): Promise<EnumResult<AwardTarget>> {
  const startTime = Date.now();
  log.event('enum_awards_initial_start', { student_id: studentId });

  try {
    const { rows } = await pool.query<AwardTarget>(
      `SELECT * FROM v_awards_enum_initial WHERE student_id = $1`,
      [studentId]
    );

    const result: EnumResult<AwardTarget> = {
      items: rows,
      count: rows.length,
      trace: {
        query_type: 'awards_initial',
        took_ms: Date.now() - startTime,
        student_id: studentId
      }
    };

    log.event('enum_awards_initial_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: result.trace.took_ms
    });

    return result;
  } catch (error: any) {
    log.error('Failed to resolve initial awards', {
      error: error.message,
      student_id: studentId
    });
    throw new Error(`Failed to resolve initial awards: ${error.message}`);
  }
}

export async function getFinalAwards(
  pool: Pool,
  studentId: string
): Promise<EnumResult<AwardTarget>> {
  const startTime = Date.now();
  log.event('enum_awards_final_start', { student_id: studentId });

  try {
    const { rows } = await pool.query<AwardTarget>(
      `SELECT * FROM v_awards_enum_final WHERE student_id = $1`,
      [studentId]
    );

    const result: EnumResult<AwardTarget> = {
      items: rows,
      count: rows.length,
      trace: {
        query_type: 'awards_final',
        took_ms: Date.now() - startTime,
        student_id: studentId
      }
    };

    log.event('enum_awards_final_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: result.trace.took_ms
    });

    return result;
  } catch (error: any) {
    log.error('Failed to resolve final awards', {
      error: error.message,
      student_id: studentId
    });
    throw new Error(`Failed to resolve final awards: ${error.message}`);
  }
}

export async function getAwardsWon(
  pool: Pool,
  studentId: string
): Promise<EnumResult<AwardWon>> {
  const startTime = Date.now();
  log.event('enum_awards_won_start', { student_id: studentId });

  try {
    const { rows } = await pool.query<AwardWon>(
      `SELECT * FROM v_awards_enum_won WHERE student_id = $1`,
      [studentId]
    );

    const result: EnumResult<AwardWon> = {
      items: rows,
      count: rows.length,
      trace: {
        query_type: 'awards_won',
        took_ms: Date.now() - startTime,
        student_id: studentId
      }
    };

    log.event('enum_awards_won_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: result.trace.took_ms
    });

    return result;
  } catch (error: any) {
    log.error('Failed to resolve awards won', {
      error: error.message,
      student_id: studentId
    });
    throw new Error(`Failed to resolve awards won: ${error.message}`);
  }
}

// ============================================================================
// EC Targets Resolvers
// ============================================================================

export async function getInitialECs(
  pool: Pool,
  studentId: string
): Promise<EnumResult<ECTarget>> {
  const startTime = Date.now();
  log.event('enum_ec_initial_start', { student_id: studentId });

  try {
    const { rows } = await pool.query<ECTarget>(
      `SELECT * FROM v_ec_enum_initial WHERE student_id = $1`,
      [studentId]
    );

    const result: EnumResult<ECTarget> = {
      items: rows,
      count: rows.length,
      trace: {
        query_type: 'ec_initial',
        took_ms: Date.now() - startTime,
        student_id: studentId
      }
    };

    log.event('enum_ec_initial_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: result.trace.took_ms
    });

    return result;
  } catch (error: any) {
    log.error('Failed to resolve initial ECs', {
      error: error.message,
      student_id: studentId
    });
    throw new Error(`Failed to resolve initial ECs: ${error.message}`);
  }
}

export async function getFinalECs(
  pool: Pool,
  studentId: string
): Promise<EnumResult<ECTarget>> {
  const startTime = Date.now();
  log.event('enum_ec_final_start', { student_id: studentId });

  try {
    const { rows } = await pool.query<ECTarget>(
      `SELECT * FROM v_ec_enum_final WHERE student_id = $1`,
      [studentId]
    );

    const result: EnumResult<ECTarget> = {
      items: rows,
      count: rows.length,
      trace: {
        query_type: 'ec_final',
        took_ms: Date.now() - startTime,
        student_id: studentId
      }
    };

    log.event('enum_ec_final_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: result.trace.took_ms
    });

    return result;
  } catch (error: any) {
    log.error('Failed to resolve final ECs', {
      error: error.message,
      student_id: studentId
    });
    throw new Error(`Failed to resolve final ECs: ${error.message}`);
  }
}

// ============================================================================
// SAT Resolvers (Temporal)
// ============================================================================

export async function getSatFirst(
  pool: Pool,
  studentId: string
): Promise<SATScore | null> {
  const startTime = Date.now();
  log.event('enum_sat_first_start', { student_id: studentId });

  try {
    const { rows } = await pool.query<SATScore>(
      `SELECT * FROM v_sat_enum_first WHERE student_id = $1`,
      [studentId]
    );

    log.event('enum_sat_first_complete', {
      student_id: studentId,
      found: rows.length > 0,
      took_ms: Date.now() - startTime
    });

    return rows[0] || null;
  } catch (error: any) {
    log.error('Failed to resolve first SAT', {
      error: error.message,
      student_id: studentId
    });
    throw new Error(`Failed to resolve first SAT: ${error.message}`);
  }
}

export async function getSatLatest(
  pool: Pool,
  studentId: string
): Promise<SATScore | null> {
  const startTime = Date.now();
  log.event('enum_sat_latest_start', { student_id: studentId });

  try {
    const { rows } = await pool.query<SATScore>(
      `SELECT * FROM v_sat_enum_latest WHERE student_id = $1`,
      [studentId]
    );

    log.event('enum_sat_latest_complete', {
      student_id: studentId,
      found: rows.length > 0,
      took_ms: Date.now() - startTime
    });

    return rows[0] || null;
  } catch (error: any) {
    log.error('Failed to resolve latest SAT', {
      error: error.message,
      student_id: studentId
    });
    throw new Error(`Failed to resolve latest SAT: ${error.message}`);
  }
}

export async function getSatProgression(
  pool: Pool,
  studentId: string
): Promise<EnumResult<SATScore>> {
  const startTime = Date.now();
  log.event('enum_sat_progression_start', { student_id: studentId });

  try {
    const { rows } = await pool.query<SATScore>(
      `SELECT * FROM v_sat_enum_progression WHERE student_id = $1`,
      [studentId]
    );

    const result: EnumResult<SATScore> = {
      items: rows,
      count: rows.length,
      trace: {
        query_type: 'sat_progression',
        took_ms: Date.now() - startTime,
        student_id: studentId
      }
    };

    log.event('enum_sat_progression_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: result.trace.took_ms
    });

    return result;
  } catch (error: any) {
    log.error('Failed to resolve SAT progression', {
      error: error.message,
      student_id: studentId
    });
    throw new Error(`Failed to resolve SAT progression: ${error.message}`);
  }
}

export async function getSatNth(
  pool: Pool,
  studentId: string,
  nth: number
): Promise<SATScore | null> {
  const startTime = Date.now();
  log.event('enum_sat_nth_start', { student_id: studentId, nth });

  try {
    const { rows } = await pool.query<SATScore>(
      `SELECT * FROM get_sat_nth($1, $2)`,
      [studentId, nth]
    );

    log.event('enum_sat_nth_complete', {
      student_id: studentId,
      nth,
      found: rows.length > 0,
      took_ms: Date.now() - startTime
    });

    return rows[0] || null;
  } catch (error: any) {
    log.error('Failed to resolve nth SAT', {
      error: error.message,
      student_id: studentId,
      nth
    });
    throw new Error(`Failed to resolve nth SAT: ${error.message}`);
  }
}

export async function getSatAsOf(
  pool: Pool,
  studentId: string,
  asOfDate: string
): Promise<SATScore | null> {
  const startTime = Date.now();
  log.event('enum_sat_asof_start', { student_id: studentId, as_of: asOfDate });

  try {
    const { rows } = await pool.query<SATScore>(
      `SELECT * FROM sat_enum_as_of($1, $2::date)`,
      [studentId, asOfDate]
    );

    log.event('enum_sat_asof_complete', {
      student_id: studentId,
      as_of: asOfDate,
      found: rows.length > 0,
      took_ms: Date.now() - startTime
    });

    return rows[0] || null;
  } catch (error: any) {
    log.error('Failed to resolve SAT as-of', {
      error: error.message,
      student_id: studentId,
      as_of: asOfDate
    });
    throw new Error(`Failed to resolve SAT as-of: ${error.message}`);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate chips from enum results
 */
export function chipsFromEnum(rows: Array<{ source_id?: string | null; jtbd_id?: string | null; item_label?: string }>) {
  return rows
    .filter(r => r.source_id || r.jtbd_id)
    .map(r => ({
      kind: 'enum',
      label: r.item_label || 'item',
      source_id: r.source_id,
      jtbd_id: r.jtbd_id
    }));
}

/**
 * Generate chips from SAT score
 */
export function chipsFromSat(row: SATScore | null) {
  if (!row) return [];
  return [{
    kind: 'fact',
    label: `SAT ${row.numeric_value}`,
    as_of: row.as_of,
    source_id: row.source_id
  }];
}

/**
 * Format award targets for display
 */
export function formatAwardTargets(result: EnumResult<AwardTarget>, phase: string): string {
  if (result.count === 0) {
    return `No ${phase} award targets found.`;
  }

  const awardsList = result.items
    .map((item, idx) => `${idx + 1}. ${item.item_label}`)
    .join('\n');

  return `${phase.charAt(0).toUpperCase() + phase.slice(1)} award targets (${result.count}):\n${awardsList}`;
}

/**
 * Format awards won for display
 */
export function formatAwardsWon(result: EnumResult<AwardWon>): string {
  if (result.count === 0) {
    return 'No awards won found in execution timeline.';
  }

  const awardsList = result.items
    .map((item, idx) => `${idx + 1}. ${item.evidence} (${item.as_of})`)
    .join('\n');

  return `Awards won (${result.count}):\n${awardsList}`;
}

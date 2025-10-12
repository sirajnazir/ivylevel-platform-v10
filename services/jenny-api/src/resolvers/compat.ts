/**
 * Compat Resolvers - Bridge to Legacy vital_facts Table
 *
 * Maps v3.0 resolver API to compat.* views that query legacy vital_facts table.
 * This allows v10.2 to work with existing data without ETL migration.
 *
 * Routes:
 * - awards.initial/final/progression → compat.v_awards_*
 * - ecs.initial/final → compat.v_kb_items (filtered)
 * - programs.initial/submitted/decisions/final → compat.v_kb_items (filtered)
 * - academics.gpa.latest → compat.v_academics_latest
 * - academics.sat.ordinal → compat.v_sat_timeline
 * - academics.summary → compat.v_academics_latest
 */

import type { Pool } from 'pg';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('resolvers-compat');

// ============================================================================
// AWARDS (from compat.v_awards_final, compat.v_outcomes)
// ============================================================================

export const awards = {
  initial: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('compat.awards.initial_start', { student_id: studentId });

    // compat layer doesn't have initial phase for awards (only final/won)
    // Return empty for now
    log.event('compat.awards.initial_complete', {
      student_id: studentId,
      count: 0,
      took_ms: Date.now() - start,
      note: 'compat layer only has final awards'
    });

    return [];
  },

  final: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('compat.awards.final_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT award_name, won_date, source_id, confidence
         FROM compat.v_awards_final
        WHERE student_id=$1
        ORDER BY won_date NULLS LAST, award_name`,
      [studentId]
    );

    log.event('compat.awards.final_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  progression: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('compat.awards.progression_start', { student_id: studentId });

    // Not implemented in compat layer yet
    log.event('compat.awards.progression_complete', {
      student_id: studentId,
      count: 0,
      took_ms: Date.now() - start,
      note: 'progression not yet implemented'
    });

    return [];
  }
};

// ============================================================================
// ECS / ACTIVITIES (from compat.v_kb_items filtered by item_type='ec')
// ============================================================================

export const ecs = {
  initial: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('compat.ecs.initial_start', { student_id: studentId });

    // compat layer doesn't distinguish initial vs final for ECs yet
    log.event('compat.ecs.initial_complete', {
      student_id: studentId,
      count: 0,
      took_ms: Date.now() - start,
      note: 'compat layer ECs not yet structured'
    });

    return [];
  },

  final: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('compat.ecs.final_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT item_key AS activity_name, item_value, as_of, source_id
         FROM compat.v_kb_items
        WHERE student_id=$1 AND item_type='ec'
        ORDER BY item_key`,
      [studentId]
    );

    log.event('compat.ecs.final_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  progression: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('compat.ecs.progression_start', { student_id: studentId });

    log.event('compat.ecs.progression_complete', {
      student_id: studentId,
      count: 0,
      took_ms: Date.now() - start,
      note: 'progression not yet implemented'
    });

    return [];
  }
};

// ============================================================================
// SUMMER PROGRAMS (from compat.v_kb_items filtered by item_type='program')
// ============================================================================

export const programs = {
  initial: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('compat.programs.initial_start', { student_id: studentId });

    log.event('compat.programs.initial_complete', {
      student_id: studentId,
      count: 0,
      took_ms: Date.now() - start,
      note: 'compat layer programs not yet structured'
    });

    return [];
  },

  submitted: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('compat.programs.submitted_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT item_key AS program_name, item_value, as_of, source_id
         FROM compat.v_kb_items
        WHERE student_id=$1 AND item_type='program'
        ORDER BY item_key`,
      [studentId]
    );

    log.event('compat.programs.submitted_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  final: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('compat.programs.final_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT item_key AS program_name, item_value, as_of, source_id
         FROM compat.v_kb_items
        WHERE student_id=$1 AND item_type='program'
        ORDER BY item_key`,
      [studentId]
    );

    log.event('compat.programs.final_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  decisions: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('compat.programs.decisions_start', { student_id: studentId });

    log.event('compat.programs.decisions_complete', {
      student_id: studentId,
      count: 0,
      took_ms: Date.now() - start,
      note: 'decisions not yet implemented in compat layer'
    });

    return [];
  },

  progression: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('compat.programs.progression_start', { student_id: studentId });

    log.event('compat.programs.progression_complete', {
      student_id: studentId,
      count: 0,
      took_ms: Date.now() - start,
      note: 'progression not yet implemented'
    });

    return [];
  }
};

// ============================================================================
// ACADEMICS (from compat.v_academics_latest, compat.v_academics_series)
// ============================================================================

export const academics = {
  // GPA queries
  gpa: {
    latest: async (pg: Pool, studentId: string) => {
      const start = Date.now();
      log.event('compat.gpa.latest_start', { student_id: studentId });

      const { rows } = await pg.query(
        `SELECT student_id, gpa_weighted, gpa_unweighted, computed_at
           FROM compat.v_academics_latest
          WHERE student_id=$1`,
        [studentId]
      );

      log.event('compat.gpa.latest_complete', {
        student_id: studentId,
        found: rows.length > 0,
        took_ms: Date.now() - start
      });

      return rows[0] || null;
    },

    initial: async (pg: Pool, studentId: string) => {
      const start = Date.now();
      log.event('compat.gpa.initial_start', { student_id: studentId });

      // Get first GPA entry from time series
      const { rows } = await pg.query(
        `SELECT student_id, metric, value_num, as_of, source_id
           FROM compat.v_academics_series
          WHERE student_id=$1 AND metric IN ('gpa_weighted', 'gpa_unweighted')
          ORDER BY as_of ASC
          LIMIT 1`,
        [studentId]
      );

      log.event('compat.gpa.initial_complete', {
        student_id: studentId,
        found: rows.length > 0,
        took_ms: Date.now() - start
      });

      return rows[0] || null;
    },

    final: async (pg: Pool, studentId: string) => {
      // Same as latest for compat layer
      return academics.gpa.latest(pg, studentId);
    },

    progression: async (pg: Pool, studentId: string) => {
      const start = Date.now();
      log.event('compat.gpa.progression_start', { student_id: studentId });

      const { rows } = await pg.query(
        `SELECT student_id, metric, value_num, as_of, source_id
           FROM compat.v_academics_series
          WHERE student_id=$1 AND metric IN ('gpa_weighted', 'gpa_unweighted')
          ORDER BY as_of ASC`,
        [studentId]
      );

      log.event('compat.gpa.progression_complete', {
        student_id: studentId,
        count: rows.length,
        took_ms: Date.now() - start
      });

      return rows;
    }
  },

  // SAT queries
  sat: {
    ordinal: async (pg: Pool, studentId: string, attempt: number = 1) => {
      const start = Date.now();
      log.event('compat.sat.ordinal_start', { student_id: studentId, attempt });

      const { rows } = await pg.query(
        `SELECT student_id, total_score, fact_date, attempt_number, source_id
           FROM compat.v_sat_timeline
          WHERE student_id=$1 AND attempt_number=$2`,
        [studentId, attempt]
      );

      log.event('compat.sat.ordinal_complete', {
        student_id: studentId,
        attempt,
        found: rows.length > 0,
        took_ms: Date.now() - start
      });

      return rows[0] || null;
    },

    latest: async (pg: Pool, studentId: string) => {
      const start = Date.now();
      log.event('compat.sat.latest_start', { student_id: studentId });

      const { rows } = await pg.query(
        `SELECT student_id, sat_total, sat_math, sat_ebrw
           FROM compat.v_academics_latest
          WHERE student_id=$1`,
        [studentId]
      );

      log.event('compat.sat.latest_complete', {
        student_id: studentId,
        found: rows.length > 0,
        took_ms: Date.now() - start
      });

      return rows[0] || null;
    },

    progression: async (pg: Pool, studentId: string) => {
      const start = Date.now();
      log.event('compat.sat.progression_start', { student_id: studentId });

      const { rows } = await pg.query(
        `SELECT student_id, total_score, fact_date, attempt_number, source_id
           FROM compat.v_sat_timeline
          WHERE student_id=$1
          ORDER BY attempt_number ASC`,
        [studentId]
      );

      log.event('compat.sat.progression_complete', {
        student_id: studentId,
        count: rows.length,
        took_ms: Date.now() - start
      });

      return rows;
    }
  },

  // Summary (all vitals)
  summary: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('compat.academics.summary_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT student_id, sat_total, sat_math, sat_ebrw, act_composite,
              gpa_weighted, gpa_unweighted, ap_count, computed_at
         FROM compat.v_academics_latest
        WHERE student_id=$1`,
      [studentId]
    );

    log.event('compat.academics.summary_complete', {
      student_id: studentId,
      found: rows.length > 0,
      took_ms: Date.now() - start
    });

    return rows[0] || null;
  }
};

// ============================================================================
// PROGRESSION (generic timeline for all entity types)
// ============================================================================

export const progression = {
  timeline: async (pg: Pool, studentId: string, entityType?: string) => {
    const start = Date.now();
    log.event('compat.progression.timeline_start', {
      student_id: studentId,
      entity_type: entityType
    });

    // For now, return academic progression (GPA + SAT time series)
    const { rows } = await pg.query(
      `SELECT student_id, metric, value_num, value_text, as_of, source_id
         FROM compat.v_academics_series
        WHERE student_id=$1
        ORDER BY as_of ASC`,
      [studentId]
    );

    log.event('compat.progression.timeline_complete', {
      student_id: studentId,
      entity_type: entityType,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  }
};

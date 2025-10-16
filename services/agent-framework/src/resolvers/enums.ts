/**
 * Universal Enumerations Resolvers
 *
 * Facts-first deterministic SQL resolvers for:
 * - Awards (initial/final/progression)
 * - ECs/Activities (initial/final/progression)
 * - Narrative (initial)
 * - Summer Programs (initial/submitted/decisions/progression)
 *
 * NO RAG - pure SQL with full provenance (source_id + chip_id)
 */

import type { Pool } from 'pg';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('resolvers-enums');

// ============================================================================
// AWARDS
// ============================================================================

export const awards = {
  initial: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('awards.initial_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT award_name, tier, as_of, source_id, chip_id
         FROM v_awards_initial
        WHERE student_id=$1
        ORDER BY award_name`,
      [studentId]
    );

    log.event('awards.initial_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  final: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('awards.final_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT award_name, tier, won_date, source_id, chip_id
         FROM v_awards_won
        WHERE student_id=$1
        ORDER BY won_date NULLS LAST, award_name`,
      [studentId]
    );

    log.event('awards.final_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  progression: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('awards.progression_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT award_name, phase, as_of, source_id, chip_id, chip_table
         FROM v_awards_progression
        WHERE student_id=$1
        ORDER BY award_name, as_of`,
      [studentId]
    );

    log.event('awards.progression_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  }
};

// ============================================================================
// ECS / ACTIVITIES
// ============================================================================

export const ecs = {
  initial: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('ecs.initial_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT activity_name, category, status_detail, event_date, source_id, chip_id
         FROM v_ecs_initial
        WHERE student_id=$1
        ORDER BY activity_name`,
      [studentId]
    );

    log.event('ecs.initial_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  final: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('ecs.final_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT activity_name, category, status_detail,
              submit_date, outcome_date, source_id, chip_id
         FROM v_ecs_final
        WHERE student_id=$1`,
      [studentId]
    );

    log.event('ecs.final_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  progression: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('ecs.progression_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT activity_name, category, phase, as_of, source_id, chip_id, chip_table
         FROM v_ecs_progression
        WHERE student_id=$1
        ORDER BY activity_name, as_of`,
      [studentId]
    );

    log.event('ecs.progression_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  byRolePattern: async (pg: Pool, studentId: string, rolePattern: string, phase: 'initial' | 'final' = 'final') => {
    const start = Date.now();
    log.event('ecs.byRolePattern_start', { student_id: studentId, role_pattern: rolePattern, phase });

    const view = phase === 'initial' ? 'v_ecs_initial' : 'v_ecs_final';
    const dateCol = phase === 'initial' ? 'event_date' : 'submit_date';

    // ✅ Role information is in status_detail column (not 'role')
    const { rows } = await pg.query(
      `SELECT activity_name, category, status_detail as role, ${dateCol} as date, source_id, chip_id
         FROM ${view}
        WHERE student_id=$1
          AND status_detail ILIKE $2
        ORDER BY activity_name`,
      [studentId, `%${rolePattern}%`]
    );

    log.event('ecs.byRolePattern_complete', {
      student_id: studentId,
      role_pattern: rolePattern,
      phase,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  }
};

// ============================================================================
// NARRATIVE
// ============================================================================

export const narrative = {
  initial: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('narrative.initial_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT label, narrative_text, as_of, source_id, chip_id
         FROM v_narrative_initial
        WHERE student_id=$1
        ORDER BY as_of NULLS LAST
        LIMIT 1`,
      [studentId]
    );

    log.event('narrative.initial_complete', {
      student_id: studentId,
      found: rows.length > 0,
      took_ms: Date.now() - start
    });

    return rows[0] || null;
  }
};

// ============================================================================
// SUMMER PROGRAMS
// ============================================================================

export const programs = {
  initial: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('programs.initial_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT program_name, provider_or_track AS provider, status_detail,
              event_date, source_id, chip_id
         FROM v_programs_initial
        WHERE student_id=$1
        ORDER BY program_name`,
      [studentId]
    );

    log.event('programs.initial_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  submitted: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('programs.submitted_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT program_name, provider_or_track AS provider, submit_date,
              status_detail, source_id, chip_id
         FROM v_programs_submitted
        WHERE student_id=$1
        ORDER BY submit_date NULLS LAST, program_name`,
      [studentId]
    );

    log.event('programs.submitted_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  final: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('programs.final_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT program_name, provider, event_date, submit_date, source_id, chip_id
         FROM v_programs_final
        WHERE student_id=$1
        ORDER BY program_name`,
      [studentId]
    );

    log.event('programs.final_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  decisions: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('programs.decisions_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT program_name, provider, decision, session, site, attending,
              decision_date, source_id, chip_id
         FROM v_programs_decisions
        WHERE student_id=$1
        ORDER BY decision_date NULLS LAST, program_name`,
      [studentId]
    );

    log.event('programs.decisions_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  progression: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('programs.progression_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT program_name, provider, phase, as_of, source_id, chip_id, chip_table
         FROM v_programs_progression
        WHERE student_id=$1
        ORDER BY program_name, as_of`,
      [studentId]
    );

    log.event('programs.progression_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  }
};

/**
 * Academics Resolvers - Deterministic SQL for Transcript + GPA + SAT
 *
 * Routes:
 * - transcript.initial/final/progression
 * - gpa.initial/final/progression
 * - (SAT uses existing sat_timeline_enum resolvers)
 */

import type { Pool } from 'pg';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('resolvers-academics');

// ============================================================================
// TRANSCRIPT
// ============================================================================

export const transcript = {
  initial: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('transcript.initial_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT term_code, grade_level, course_title, subject_area, level,
              grade_letter, grade_percent, credits, weighting,
              term_source, course_source, grade_source, confidence,
              chip_id, chip_table
         FROM v_transcript_initial
        WHERE student_id=$1
        ORDER BY term_code, course_title`,
      [studentId]
    );

    log.event('transcript.initial_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  final: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('transcript.final_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT term_code, grade_level, course_title, subject_area, level,
              grade_letter, grade_percent, credits, weighting,
              term_source, course_source, grade_source, confidence,
              chip_id, chip_table
         FROM v_transcript_final
        WHERE student_id=$1
        ORDER BY term_code, course_title`,
      [studentId]
    );

    log.event('transcript.final_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  progression: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('transcript.progression_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT term_code, grade_level, course_title, subject_area, level,
              grade_letter, grade_percent, credits, weighting, status,
              start_date, end_date, recorded_at,
              term_source, course_source, grade_source, confidence,
              chip_id, chip_table
         FROM v_transcript_progression
        WHERE student_id=$1`,
      [studentId]
    );

    log.event('transcript.progression_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  }
};

// ============================================================================
// GPA
// ============================================================================

export const gpa = {
  initial: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('gpa.initial_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT scope, scope_key, gpa_unweighted, gpa_weighted,
              credits_attempted, credits_earned, calc_method,
              recorded_at, source_id, confidence,
              chip_id, chip_table
         FROM v_gpa_progression
        WHERE student_id=$1
        ORDER BY recorded_at ASC
        LIMIT 1`,
      [studentId]
    );

    log.event('gpa.initial_complete', {
      student_id: studentId,
      found: rows.length > 0,
      took_ms: Date.now() - start
    });

    return rows[0] || null;
  },

  final: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('gpa.final_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT scope, scope_key, gpa_unweighted, gpa_weighted,
              credits_attempted, credits_earned, calc_method,
              recorded_at, source_id, confidence,
              chip_id, chip_table
         FROM v_gpa_final
        WHERE student_id=$1
        ORDER BY scope, recorded_at DESC`,
      [studentId]
    );

    log.event('gpa.final_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  progression: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('gpa.progression_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT scope, scope_key, gpa_unweighted, gpa_weighted,
              credits_attempted, credits_earned, calc_method,
              recorded_at, source_id, confidence,
              chip_id, chip_table
         FROM v_gpa_progression
        WHERE student_id=$1`,
      [studentId]
    );

    log.event('gpa.progression_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  latest: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('gpa.latest_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT scope, scope_key, gpa_unweighted, gpa_weighted,
              credits_attempted, credits_earned, calc_method,
              recorded_at, source_id, confidence,
              chip_id, chip_table
         FROM v_gpa_latest
        WHERE student_id=$1`,
      [studentId]
    );

    log.event('gpa.latest_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  }
};

// ============================================================================
// ACADEMICS OVERVIEW (GPA + SAT combined)
// ============================================================================

export const overview = async (pg: Pool, studentId: string) => {
  const start = Date.now();
  log.event('academics.overview_start', { student_id: studentId });

  const { rows } = await pg.query(
    `SELECT student_id, scope, scope_key, gpa_unweighted, gpa_weighted,
            gpa_recorded_at, gpa_source, sat_date, sat_score, sat_type, sat_source
       FROM v_academics_overview
      WHERE student_id=$1`,
    [studentId]
  );

  log.event('academics.overview_complete', {
    student_id: studentId,
    count: rows.length,
    took_ms: Date.now() - start
  });

  return rows;
};

// ============================================================================
// VITALS TIMELINE (Weekly GPA, AP rigor, course load W01-W93)
// ============================================================================

export const vitals = {
  latest: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('vitals.latest_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT student_id, week_no, as_of_date, gpa_unweighted, gpa_weighted,
              ap_count_cum, honors_count_cum, core_stem_load, workload_hours_week
         FROM v_academics_latest
        WHERE student_id=$1`,
      [studentId]
    );

    log.event('vitals.latest_complete', {
      student_id: studentId,
      found: rows.length > 0,
      took_ms: Date.now() - start
    });

    return rows[0] || null;
  },

  trend: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('vitals.trend_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT student_id, first_week, last_week,
              gpa_u_min, gpa_u_max, gpa_w_min, gpa_w_max,
              ap_max, weeks_recorded
         FROM v_academics_trend
        WHERE student_id=$1`,
      [studentId]
    );

    log.event('vitals.trend_complete', {
      student_id: studentId,
      found: rows.length > 0,
      took_ms: Date.now() - start
    });

    return rows[0] || null;
  },

  events: async (pg: Pool, studentId: string, eventType?: string) => {
    const start = Date.now();
    log.event('vitals.events_start', { student_id: studentId, event_type: eventType });

    const query = eventType
      ? `SELECT student_id, event_id, week_no, event_date, event_type, label, details, provenance
           FROM academics_events
          WHERE student_id=$1 AND event_type=$2
          ORDER BY week_no, event_date`
      : `SELECT student_id, event_id, week_no, event_date, event_type, label, details, provenance
           FROM academics_events
          WHERE student_id=$1
          ORDER BY week_no, event_date`;

    const params = eventType ? [studentId, eventType] : [studentId];
    const { rows } = await pg.query(query, params);

    log.event('vitals.events_complete', {
      student_id: studentId,
      event_type: eventType,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  }
};

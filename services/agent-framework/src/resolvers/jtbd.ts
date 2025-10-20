/**
 * JTBD (Jobs To Be Done) Resolvers - v10.6
 *
 * Pure fact-based resolvers for weekly execution tracking
 * - byWeek: What got done in a specific week
 * - completed: All completed jobs chronologically
 * - pending: All planned/in-progress jobs
 * - progression: Week-over-week completion rates
 * - summary: Student-level execution summary
 *
 * ⚠️ IMPORTANT: Queries jtbd_weekly table (NOT jtbd - that's for iMessage interactions)
 * NO RAG - pure SQL from jtbd_weekly table
 * Focus: WHAT got done (facts), not HOW or WHY (coaching)
 */

import type { Pool } from 'pg';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('resolvers-jtbd');

// ============================================================================
// JTBD - WEEKLY EXECUTION
// ============================================================================

export const jtbd = {
  /**
   * Get all jobs for a specific week
   */
  async byWeek(pg: Pool, studentId: string, weekNumber: number) {
    const start = Date.now();
    log.event('jtbd.by_week_start', { student_id: studentId, week_number: weekNumber });

    const { rows } = await pg.query(
      `SELECT total_jobs, completed_jobs, in_progress_jobs, planned_jobs,
              completed_job_types, completed_descriptions, week_start_date, week_end_date
         FROM v_jtbd_weekly_by_week
        WHERE student_id = $1 AND week_number = $2`,
      [studentId, weekNumber]
    );

    log.event('jtbd.by_week_complete', {
      student_id: studentId,
      week_number: weekNumber,
      found: rows.length > 0,
      took_ms: Date.now() - start
    });

    return rows[0] || null;
  },

  /**
   * Get jobs for a date range (multiple weeks)
   */
  async byDateRange(pg: Pool, studentId: string, startDate: string, endDate: string) {
    const start = Date.now();
    log.event('jtbd.by_date_range_start', { student_id: studentId, start_date: startDate, end_date: endDate });

    const { rows } = await pg.query(
      `SELECT week_number, total_jobs, completed_jobs, in_progress_jobs, planned_jobs,
              completed_job_types, completed_descriptions, week_start_date, week_end_date
         FROM v_jtbd_weekly_by_week
        WHERE student_id = $1
          AND week_start_date >= $2::date
          AND week_end_date <= $3::date
        ORDER BY week_number`,
      [studentId, startDate, endDate]
    );

    log.event('jtbd.by_date_range_complete', {
      student_id: studentId,
      weeks_found: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  // ============================================================================
  // JTBD - COMPLETED JOBS
  // ============================================================================

  /**
   * Get all completed jobs chronologically
   */
  async completed(pg: Pool, studentId: string) {
    const start = Date.now();
    log.event('jtbd.completed_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT jtbd_id, week_number, job_type, job_description, completion_date,
              outcome_metric, outcome_value, outcome_unit, linked_chip_id, source_id
         FROM v_jtbd_weekly_completed
        WHERE student_id = $1
        ORDER BY completion_date DESC, week_number DESC`,
      [studentId]
    );

    log.event('jtbd.completed_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  /**
   * Get completed jobs for a specific week
   */
  async completedByWeek(pg: Pool, studentId: string, weekNumber: number) {
    const start = Date.now();
    log.event('jtbd.completed_by_week_start', { student_id: studentId, week_number: weekNumber });

    const { rows } = await pg.query(
      `SELECT jtbd_id, job_type, job_description, completion_date,
              outcome_metric, outcome_value, outcome_unit, linked_chip_id, source_id
         FROM v_jtbd_weekly_completed
        WHERE student_id = $1 AND week_number = $2
        ORDER BY completion_date`,
      [studentId, weekNumber]
    );

    log.event('jtbd.completed_by_week_complete', {
      student_id: studentId,
      week_number: weekNumber,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  /**
   * Get completed jobs of a specific type (application, test, ec_milestone, etc.)
   */
  async completedByType(pg: Pool, studentId: string, jobType: string) {
    const start = Date.now();
    log.event('jtbd.completed_by_type_start', { student_id: studentId, job_type: jobType });

    const { rows } = await pg.query(
      `SELECT jtbd_id, week_number, job_description, completion_date,
              outcome_metric, outcome_value, outcome_unit, linked_chip_id, source_id
         FROM v_jtbd_weekly_completed
        WHERE student_id = $1 AND job_type = $2
        ORDER BY completion_date DESC`,
      [studentId, jobType]
    );

    log.event('jtbd.completed_by_type_complete', {
      student_id: studentId,
      job_type: jobType,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  // ============================================================================
  // JTBD - PENDING JOBS
  // ============================================================================

  /**
   * Get all pending/in-progress jobs
   */
  async pending(pg: Pool, studentId: string) {
    const start = Date.now();
    log.event('jtbd.pending_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT jtbd_id, week_number, week_start_date, week_end_date,
              job_type, job_description, status, linked_chip_id, source_id
         FROM v_jtbd_weekly_pending
        WHERE student_id = $1
        ORDER BY week_number, job_type`,
      [studentId]
    );

    log.event('jtbd.pending_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  /**
   * Get pending jobs for a specific week
   */
  async pendingByWeek(pg: Pool, studentId: string, weekNumber: number) {
    const start = Date.now();
    log.event('jtbd.pending_by_week_start', { student_id: studentId, week_number: weekNumber });

    const { rows } = await pg.query(
      `SELECT jtbd_id, job_type, job_description, status, linked_chip_id, source_id
         FROM v_jtbd_weekly_pending
        WHERE student_id = $1 AND week_number = $2
        ORDER BY job_type`,
      [studentId, weekNumber]
    );

    log.event('jtbd.pending_by_week_complete', {
      student_id: studentId,
      week_number: weekNumber,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  // ============================================================================
  // JTBD - PROGRESSION & SUMMARY
  // ============================================================================

  /**
   * Get week-over-week progression (completion rates)
   */
  async progression(pg: Pool, studentId: string) {
    const start = Date.now();
    log.event('jtbd.progression_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT week_number, total_jobs, completed_jobs, completion_rate
         FROM v_jtbd_weekly_progression
        WHERE student_id = $1
        ORDER BY week_number`,
      [studentId]
    );

    log.event('jtbd.progression_complete', {
      student_id: studentId,
      weeks: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  /**
   * Get student-level execution summary
   */
  async summary(pg: Pool, studentId: string) {
    const start = Date.now();
    log.event('jtbd.summary_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT total_jobs, completed_jobs, in_progress_jobs, planned_jobs,
              program_start, latest_week, job_types_tracked
         FROM v_jtbd_weekly_summary
        WHERE student_id = $1`,
      [studentId]
    );

    log.event('jtbd.summary_complete', {
      student_id: studentId,
      found: rows.length > 0,
      took_ms: Date.now() - start
    });

    return rows[0] || null;
  },

  // ============================================================================
  // CONVENIENCE QUERIES
  // ============================================================================

  /**
   * Get recent completed jobs (last N jobs)
   */
  async recentCompleted(pg: Pool, studentId: string, limit: number = 10) {
    const start = Date.now();
    log.event('jtbd.recent_completed_start', { student_id: studentId, limit });

    const { rows } = await pg.query(
      `SELECT jtbd_id, week_number, job_type, job_description, completion_date,
              outcome_metric, outcome_value, outcome_unit, linked_chip_id, source_id
         FROM v_jtbd_weekly_completed
        WHERE student_id = $1
        ORDER BY completion_date DESC, week_number DESC
        LIMIT $2`,
      [studentId, limit]
    );

    log.event('jtbd.recent_completed_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  /**
   * Get milestones only (completed EC milestones)
   */
  async milestones(pg: Pool, studentId: string) {
    const start = Date.now();
    log.event('jtbd.milestones_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT jtbd_id, week_number, job_description, completion_date,
              outcome_metric, outcome_value, outcome_unit, linked_chip_id, source_id
         FROM v_jtbd_weekly_completed
        WHERE student_id = $1 AND job_type = 'ec_milestone'
        ORDER BY completion_date DESC`,
      [studentId]
    );

    log.event('jtbd.milestones_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  }
};

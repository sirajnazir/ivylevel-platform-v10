/**
 * Scholarship Resolvers - v1.0
 *
 * Pure fact-based resolvers for scholarship tracking
 * - list: All scholarships for a student
 * - applied: Scholarships with status 'Applied' or 'Pending'
 * - accepted: Scholarships with status 'Accepted'
 * - rejected: Scholarships with status 'Rejected'
 * - summary: Scholarship summary stats
 *
 * NO RAG - pure SQL from scholarships table
 * Focus: WHAT scholarships applied/accepted, amounts, status
 */

import type { Pool } from 'pg';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('resolvers-scholarships');

export const scholarships = {
  /**
   * Get all scholarships for a student
   */
  async list(pg: Pool, studentId: string) {
    const start = Date.now();
    log.event('scholarships.list_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT scholarship_id, scholarship_name, sponsor_org, amount_usd,
              application_status, decision_date, notes, created_ts
         FROM scholarships
        WHERE student_id = $1
        ORDER BY
          CASE application_status
            WHEN 'Accepted' THEN 1
            WHEN 'Pending' THEN 2
            WHEN 'Applied' THEN 3
            WHEN 'Rejected' THEN 4
            ELSE 5
          END,
          decision_date DESC NULLS LAST,
          created_ts DESC`,
      [studentId]
    );

    log.event('scholarships.list_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  /**
   * Get scholarships by status (Applied, Pending, Accepted, Rejected)
   */
  async byStatus(pg: Pool, studentId: string, status: 'Applied' | 'Pending' | 'Accepted' | 'Rejected') {
    const start = Date.now();
    log.event('scholarships.by_status_start', { student_id: studentId, status });

    const { rows } = await pg.query(
      `SELECT scholarship_id, scholarship_name, sponsor_org, amount_usd,
              application_status, decision_date, notes, created_ts
         FROM scholarships
        WHERE student_id = $1 AND application_status = $2
        ORDER BY decision_date DESC NULLS LAST, created_ts DESC`,
      [studentId, status]
    );

    log.event('scholarships.by_status_complete', {
      student_id: studentId,
      status,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  /**
   * Get pending/applied scholarships (what student is waiting on)
   */
  async pending(pg: Pool, studentId: string) {
    const start = Date.now();
    log.event('scholarships.pending_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT scholarship_id, scholarship_name, sponsor_org, amount_usd,
              application_status, decision_date, notes, created_ts
         FROM scholarships
        WHERE student_id = $1
          AND application_status IN ('Applied', 'Pending')
        ORDER BY decision_date ASC NULLS FIRST, created_ts DESC`,
      [studentId]
    );

    log.event('scholarships.pending_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  /**
   * Get accepted scholarships
   */
  async accepted(pg: Pool, studentId: string) {
    const start = Date.now();
    log.event('scholarships.accepted_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT scholarship_id, scholarship_name, sponsor_org, amount_usd,
              application_status, decision_date, notes, created_ts
         FROM scholarships
        WHERE student_id = $1 AND application_status = 'Accepted'
        ORDER BY amount_usd DESC NULLS LAST, decision_date DESC`,
      [studentId]
    );

    log.event('scholarships.accepted_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  /**
   * Get summary statistics
   */
  async summary(pg: Pool, studentId: string) {
    const start = Date.now();
    log.event('scholarships.summary_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT
         COUNT(*) AS total_scholarships,
         COUNT(*) FILTER (WHERE application_status = 'Applied') AS applied_count,
         COUNT(*) FILTER (WHERE application_status = 'Pending') AS pending_count,
         COUNT(*) FILTER (WHERE application_status = 'Accepted') AS accepted_count,
         COUNT(*) FILTER (WHERE application_status = 'Rejected') AS rejected_count,
         COALESCE(SUM(amount_usd) FILTER (WHERE application_status = 'Accepted'), 0) AS total_awarded_usd,
         COALESCE(SUM(amount_usd) FILTER (WHERE application_status IN ('Applied', 'Pending')), 0) AS total_pending_usd,
         COALESCE(AVG(amount_usd) FILTER (WHERE application_status = 'Accepted'), 0) AS avg_scholarship_usd,
         ROUND(
           100.0 * COUNT(*) FILTER (WHERE application_status = 'Accepted') /
           NULLIF(COUNT(*) FILTER (WHERE application_status IN ('Accepted', 'Rejected')), 0),
           1
         ) AS acceptance_rate
       FROM scholarships
       WHERE student_id = $1`,
      [studentId]
    );

    const summary = rows[0];

    log.event('scholarships.summary_complete', {
      student_id: studentId,
      total: summary.total_scholarships,
      accepted: summary.accepted_count,
      took_ms: Date.now() - start
    });

    return summary;
  },

  /**
   * Get total money awarded
   */
  async totalAwarded(pg: Pool, studentId: string) {
    const start = Date.now();
    log.event('scholarships.total_awarded_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT
         COALESCE(SUM(amount_usd), 0) AS total_awarded_usd,
         COUNT(*) AS scholarships_accepted
       FROM scholarships
       WHERE student_id = $1 AND application_status = 'Accepted'`,
      [studentId]
    );

    log.event('scholarships.total_awarded_complete', {
      student_id: studentId,
      total_usd: rows[0].total_awarded_usd,
      took_ms: Date.now() - start
    });

    return rows[0];
  },
};

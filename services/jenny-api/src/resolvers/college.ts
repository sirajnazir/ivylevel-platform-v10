/**
 * College List & Applications Resolvers
 *
 * Facts-first deterministic SQL resolvers for:
 * - College list (all colleges on list)
 * - College attending (final decision)
 * - Applications (submissions + decisions)
 *
 * NO RAG - pure SQL with full provenance
 */

import type { Pool } from 'pg';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('resolvers-college');

// ============================================================================
// COLLEGE LIST
// ============================================================================

export const collegeList = {
  all: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('collegeList.all_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT college_id, college_name, bucket_category, decision_plan,
              decision_result, attending, program, location, acceptance_rate
         FROM college_list
        WHERE student_id=$1
        ORDER BY
          CASE bucket_category
            WHEN 'Wild Card' THEN 1
            WHEN 'Reach' THEN 2
            WHEN 'Match' THEN 3
            WHEN 'Safety' THEN 4
          END,
          college_name`,
      [studentId]
    );

    log.event('collegeList.all_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  attending: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('collegeList.attending_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT college_id, college_name, bucket_category, decision_plan,
              decision_result, program, location
         FROM college_list
        WHERE student_id=$1
          AND attending = TRUE
        LIMIT 1`,
      [studentId]
    );

    log.event('collegeList.attending_complete', {
      student_id: studentId,
      found: rows.length > 0,
      college: rows[0]?.college_name,
      took_ms: Date.now() - start
    });

    return rows[0] || null;
  },

  byBucket: async (pg: Pool, studentId: string, bucket: string) => {
    const start = Date.now();
    log.event('collegeList.byBucket_start', { student_id: studentId, bucket });

    const { rows } = await pg.query(
      `SELECT college_id, college_name, bucket_category, decision_plan,
              decision_result, attending, program, location, acceptance_rate
         FROM college_list
        WHERE student_id=$1
          AND bucket_category=$2
        ORDER BY college_name`,
      [studentId, bucket]
    );

    log.event('collegeList.byBucket_complete', {
      student_id: studentId,
      bucket,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  accepted: async (pg: Pool, studentId: string) => {
    const start = Date.now();
    log.event('collegeList.accepted_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT college_id, college_name, bucket_category, decision_plan,
              decision_result, program, location
         FROM college_list
        WHERE student_id=$1
          AND decision_result = 'Accepted'
        ORDER BY
          CASE bucket_category
            WHEN 'Wild Card' THEN 1
            WHEN 'Reach' THEN 2
            WHEN 'Match' THEN 3
            WHEN 'Safety' THEN 4
          END,
          college_name`,
      [studentId]
    );

    log.event('collegeList.accepted_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  byDecisionPlan: async (pg: Pool, studentId: string, decisionPlan: string) => {
    const start = Date.now();
    log.event('collegeList.byDecisionPlan_start', { student_id: studentId, decision_plan: decisionPlan });

    const { rows } = await pg.query(
      `SELECT college_id, college_name, bucket_category, decision_plan,
              decision_result, program, location, acceptance_rate
         FROM college_list
        WHERE student_id=$1
          AND decision_plan=$2
        ORDER BY college_name`,
      [studentId, decisionPlan]
    );

    log.event('collegeList.byDecisionPlan_complete', {
      student_id: studentId,
      decision_plan: decisionPlan,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  }
};

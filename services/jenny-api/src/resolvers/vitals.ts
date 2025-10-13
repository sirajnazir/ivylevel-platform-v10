/**
 * EC Vitals Resolvers - v10.6
 *
 * Pure fact-based resolvers for EC metric progression tracking
 * - latest: Most recent value for each metric
 * - progression: Full timeline of metric changes
 * - byType: Aggregated by metric type (scale, financial, product, etc.)
 * - byActivity: All metrics for a specific activity
 * - summary: Student-level vitals summary
 *
 * NO RAG - pure SQL from ec_vitals table
 */

import type { Pool } from 'pg';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('resolvers-vitals');

// ============================================================================
// EC VITALS - LATEST VALUES
// ============================================================================

export const vitals = {
  /**
   * Get latest value for each metric across all activities
   */
  async latest(pg: Pool, studentId: string) {
    const start = Date.now();
    log.event('vitals.latest_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT vital_id, chip_id, activity_name, metric_type, metric_name,
              numeric_value, text_value, unit, as_of, source_id
         FROM v_ec_vitals_latest
        WHERE student_id = $1
        ORDER BY activity_name, metric_type, metric_name`,
      [studentId]
    );

    log.event('vitals.latest_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  /**
   * Get latest values for a specific activity
   */
  async latestByActivity(pg: Pool, studentId: string, chipId: string) {
    const start = Date.now();
    log.event('vitals.latest_by_activity_start', { student_id: studentId, chip_id: chipId });

    const { rows } = await pg.query(
      `SELECT vital_id, activity_name, metric_type, metric_name,
              numeric_value, text_value, unit, as_of, source_id
         FROM v_ec_vitals_latest
        WHERE student_id = $1 AND chip_id = $2
        ORDER BY metric_type, metric_name`,
      [studentId, chipId]
    );

    log.event('vitals.latest_by_activity_complete', {
      student_id: studentId,
      chip_id: chipId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  /**
   * Get latest values for a specific metric type (scale, financial, etc.)
   */
  async latestByType(pg: Pool, studentId: string, metricType: string) {
    const start = Date.now();
    log.event('vitals.latest_by_type_start', { student_id: studentId, metric_type: metricType });

    const { rows } = await pg.query(
      `SELECT vital_id, chip_id, activity_name, metric_name,
              numeric_value, text_value, unit, as_of, source_id
         FROM v_ec_vitals_latest
        WHERE student_id = $1 AND metric_type = $2
        ORDER BY activity_name, metric_name`,
      [studentId, metricType]
    );

    log.event('vitals.latest_by_type_complete', {
      student_id: studentId,
      metric_type: metricType,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  // ============================================================================
  // EC VITALS - PROGRESSION (TEMPORAL)
  // ============================================================================

  /**
   * Get full progression timeline for all metrics
   */
  async progression(pg: Pool, studentId: string) {
    const start = Date.now();
    log.event('vitals.progression_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT vital_id, chip_id, activity_name, metric_type, metric_name,
              numeric_value, text_value, unit, as_of, nth, source_id
         FROM v_ec_vitals_progression
        WHERE student_id = $1
        ORDER BY activity_name, metric_name, nth`,
      [studentId]
    );

    log.event('vitals.progression_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  /**
   * Get progression for a specific activity
   */
  async progressionByActivity(pg: Pool, studentId: string, chipId: string) {
    const start = Date.now();
    log.event('vitals.progression_by_activity_start', { student_id: studentId, chip_id: chipId });

    const { rows } = await pg.query(
      `SELECT vital_id, activity_name, metric_type, metric_name,
              numeric_value, text_value, unit, as_of, nth, source_id
         FROM v_ec_vitals_progression
        WHERE student_id = $1 AND chip_id = $2
        ORDER BY metric_name, nth`,
      [studentId, chipId]
    );

    log.event('vitals.progression_by_activity_complete', {
      student_id: studentId,
      chip_id: chipId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  /**
   * Get progression for a specific metric across all activities
   */
  async progressionByMetric(pg: Pool, studentId: string, metricName: string) {
    const start = Date.now();
    log.event('vitals.progression_by_metric_start', { student_id: studentId, metric_name: metricName });

    const { rows } = await pg.query(
      `SELECT vital_id, chip_id, activity_name, metric_type,
              numeric_value, text_value, unit, as_of, nth, source_id
         FROM v_ec_vitals_progression
        WHERE student_id = $1 AND metric_name = $2
        ORDER BY activity_name, nth`,
      [studentId, metricName]
    );

    log.event('vitals.progression_by_metric_complete', {
      student_id: studentId,
      metric_name: metricName,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  // ============================================================================
  // EC VITALS - AGGREGATIONS
  // ============================================================================

  /**
   * Get aggregated summary by metric type
   */
  async byType(pg: Pool, studentId: string) {
    const start = Date.now();
    log.event('vitals.by_type_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT metric_type, activities_count, metrics_count, total_snapshots,
              earliest_snapshot, latest_snapshot
         FROM v_ec_vitals_by_type
        WHERE student_id = $1
        ORDER BY metric_type`,
      [studentId]
    );

    log.event('vitals.by_type_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  /**
   * Get student-level vitals summary
   */
  async summary(pg: Pool, studentId: string) {
    const start = Date.now();
    log.event('vitals.summary_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT activities_tracked, unique_metrics, total_snapshots,
              tracking_start, tracking_latest, metric_types_tracked
         FROM v_ec_vitals_summary
        WHERE student_id = $1`,
      [studentId]
    );

    log.event('vitals.summary_complete', {
      student_id: studentId,
      found: rows.length > 0,
      took_ms: Date.now() - start
    });

    return rows[0] || null;
  },

  // ============================================================================
  // SPECIFIC METRIC QUERIES (Convenience Wrappers)
  // ============================================================================

  /**
   * Get funding progression across all activities
   */
  async fundingProgression(pg: Pool, studentId: string) {
    const start = Date.now();
    log.event('vitals.funding_progression_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT vital_id, chip_id, activity_name, numeric_value, unit, as_of, nth, source_id
         FROM v_ec_vitals_progression
        WHERE student_id = $1
          AND metric_type = 'financial'
          AND metric_name = 'funding_raised'
        ORDER BY activity_name, nth`,
      [studentId]
    );

    log.event('vitals.funding_progression_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  /**
   * Get scale metrics progression (students reached, members, etc.)
   */
  async scaleProgression(pg: Pool, studentId: string) {
    const start = Date.now();
    log.event('vitals.scale_progression_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT vital_id, chip_id, activity_name, metric_name,
              numeric_value, unit, as_of, nth, source_id
         FROM v_ec_vitals_progression
        WHERE student_id = $1 AND metric_type = 'scale'
        ORDER BY activity_name, metric_name, nth`,
      [studentId]
    );

    log.event('vitals.scale_progression_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  },

  /**
   * Get impact metrics (media features, social reach, etc.)
   */
  async impactMetrics(pg: Pool, studentId: string) {
    const start = Date.now();
    log.event('vitals.impact_metrics_start', { student_id: studentId });

    const { rows } = await pg.query(
      `SELECT vital_id, chip_id, activity_name, metric_name,
              numeric_value, text_value, unit, as_of, source_id
         FROM v_ec_vitals_latest
        WHERE student_id = $1 AND metric_type = 'impact'
        ORDER BY activity_name, metric_name`,
      [studentId]
    );

    log.event('vitals.impact_metrics_complete', {
      student_id: studentId,
      count: rows.length,
      took_ms: Date.now() - start
    });

    return rows;
  }
};

/**
 * v3.7.1 Snapshot API
 *
 * Allows manual capture of feature snapshots for historical tracking.
 * POST /students/:studentId/snapshots
 */

import { Router } from 'express';
import type { Pool } from 'pg';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const router = Router();
const log = createLogger('snapshots-api');

export function createSnapshotRoutes(pg: Pool) {
  /**
   * POST /students/:studentId/snapshots
   *
   * Captures current feature state and IvyReady score as a named snapshot.
   *
   * Body: { snapshot_name: string }
   * Returns: { snapshot_id, snapshot_name, ivy_ready_score, features_json, created_at }
   */
  router.post('/students/:studentId/snapshots', async (req, res) => {
    const { studentId } = req.params;
    const { snapshot_name } = req.body;

    if (!snapshot_name || typeof snapshot_name !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid snapshot_name in request body',
      });
    }

    try {
      log.event('snapshot.create_start', { student_id: studentId, snapshot_name });

      // 1. Get current IvyReady score
      const scoreQuery = `
        SELECT ivy_ready_score, factor_breakdown
        FROM v_ivyready_current
        WHERE student_id = $1
      `;
      const { rows: scoreRows } = await pg.query(scoreQuery, [studentId]);

      const ivyReadyScore = scoreRows.length > 0 ? scoreRows[0].ivy_ready_score : null;
      const factorBreakdown = scoreRows.length > 0 ? scoreRows[0].factor_breakdown : {};

      // 2. Get all current features
      const featuresQuery = `
        SELECT domain, feature_key, feature_value, chip_table, chip_id, source_id, measured_at
        FROM v_features_all
        WHERE student_id = $1
        ORDER BY domain, feature_key
      `;
      const { rows: featureRows } = await pg.query(featuresQuery, [studentId]);

      // 3. Group features by domain for JSONB storage
      const featuresJson: Record<string, any[]> = {};
      featureRows.forEach((f: any) => {
        if (!featuresJson[f.domain]) {
          featuresJson[f.domain] = [];
        }
        featuresJson[f.domain].push({
          key: f.feature_key,
          value: f.feature_value,
          chip_table: f.chip_table,
          chip_id: f.chip_id,
          source_id: f.source_id,
          measured_at: f.measured_at,
        });
      });

      // Add metadata
      const snapshotData = {
        ivy_ready_score: ivyReadyScore,
        factor_breakdown: factorBreakdown,
        features: featuresJson,
        feature_count: featureRows.length,
        captured_at: new Date().toISOString(),
      };

      // 4. Insert snapshot
      const insertQuery = `
        INSERT INTO readiness_snapshots (student_id, snapshot_name, ivy_ready_score, features_json)
        VALUES ($1, $2, $3, $4)
        RETURNING snapshot_id, snapshot_name, ivy_ready_score, features_json, created_at
      `;
      const { rows: insertRows } = await pg.query(insertQuery, [
        studentId,
        snapshot_name,
        ivyReadyScore,
        JSON.stringify(snapshotData),
      ]);

      const snapshot = insertRows[0];

      log.event('snapshot.create_success', {
        student_id: studentId,
        snapshot_id: snapshot.snapshot_id,
        snapshot_name: snapshot.snapshot_name,
        ivy_ready_score: snapshot.ivy_ready_score,
        feature_count: featureRows.length,
      });

      return res.status(201).json({
        snapshot_id: snapshot.snapshot_id,
        snapshot_name: snapshot.snapshot_name,
        ivy_ready_score: snapshot.ivy_ready_score,
        features_json: snapshot.features_json,
        created_at: snapshot.created_at,
      });
    } catch (error: any) {
      log.event('snapshot.create_error', {
        student_id: studentId,
        snapshot_name,
        error: error.message,
      });

      return res.status(500).json({
        error: 'Failed to create snapshot',
        message: error.message,
      });
    }
  });

  /**
   * GET /students/:studentId/snapshots
   *
   * Lists all snapshots for a student.
   * Returns: Array of { snapshot_id, snapshot_name, ivy_ready_score, created_at }
   */
  router.get('/students/:studentId/snapshots', async (req, res) => {
    const { studentId } = req.params;

    try {
      const query = `
        SELECT snapshot_id, snapshot_name, ivy_ready_score, created_at
        FROM readiness_snapshots
        WHERE student_id = $1
        ORDER BY created_at DESC
      `;
      const { rows } = await pg.query(query, [studentId]);

      return res.status(200).json({
        student_id: studentId,
        snapshots: rows,
        count: rows.length,
      });
    } catch (error: any) {
      log.event('snapshot.list_error', {
        student_id: studentId,
        error: error.message,
      });

      return res.status(500).json({
        error: 'Failed to list snapshots',
        message: error.message,
      });
    }
  });

  /**
   * GET /students/:studentId/snapshots/:snapshotId
   *
   * Gets a specific snapshot with full feature details.
   * Returns: { snapshot_id, snapshot_name, ivy_ready_score, features_json, created_at }
   */
  router.get('/students/:studentId/snapshots/:snapshotId', async (req, res) => {
    const { studentId, snapshotId } = req.params;

    try {
      const query = `
        SELECT snapshot_id, snapshot_name, ivy_ready_score, features_json, created_at
        FROM readiness_snapshots
        WHERE student_id = $1 AND snapshot_id = $2
      `;
      const { rows } = await pg.query(query, [studentId, snapshotId]);

      if (rows.length === 0) {
        return res.status(404).json({
          error: 'Snapshot not found',
        });
      }

      return res.status(200).json(rows[0]);
    } catch (error: any) {
      log.event('snapshot.get_error', {
        student_id: studentId,
        snapshot_id: snapshotId,
        error: error.message,
      });

      return res.status(500).json({
        error: 'Failed to get snapshot',
        message: error.message,
      });
    }
  });

  return router;
}

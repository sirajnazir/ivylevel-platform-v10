/**
 * Growth Tracker - HGTI (Human Growth & Transformation Index)
 *
 * Tracks student growth events and computes HGTI scores for IvyScore integration.
 *
 * Version: v3.2.0
 * Fix #9: HGTI Infrastructure & IvyScore Integration
 */

import { pool } from '../db/pool-rls.js';

// ============================================================================
// TYPES
// ============================================================================

export type BarrierType =
  | 'INTERNAL_CONFIDENCE'
  | 'SOCIAL_EXCLUSION'
  | 'NEURODIVERSITY'
  | 'PARENT_CONFLICT'
  | 'SELF_IMAGE'
  | 'MOTIVATION_DROP'
  | 'BURNOUT'
  | 'TIME_MANAGEMENT';

export interface GrowthEvent {
  id: string;
  student_id: string;
  barrier_type: BarrierType;
  trigger: string;
  coach_reflection: string;
  student_reflection?: string; // Private, not shown to parents
  breakthrough: boolean;
  transformation_delta: number; // 0-1
  occurred_at: Date;
  linked_artifacts: string[]; // Chip IDs, essay IDs, etc.
  created_at: Date;
}

export interface HGTIScore {
  student_id: string;
  avg_transformation: number; // 0-1
  breakthrough_count: number;
  total_events: number;
  latest_event_date: Date | null;
}

// ============================================================================
// GROWTH TRACKER CLASS
// ============================================================================

export class GrowthTracker {
  /**
   * Records a growth event for a student.
   *
   * @param event - Growth event details
   * @returns Created growth event
   */
  async recordEvent(event: {
    studentId: string;
    barrierType: BarrierType;
    trigger: string;
    coachReflection: string;
    studentReflection?: string;
    breakthrough: boolean;
    transformationDelta: number; // 0-1
    linkedArtifacts?: string[];
  }): Promise<GrowthEvent> {
    const query = `
      INSERT INTO growth_events (
        student_id,
        barrier_type,
        trigger,
        coach_reflection,
        student_reflection,
        breakthrough,
        transformation_delta,
        occurred_at,
        linked_artifacts
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, $8)
      RETURNING *
    `;

    const values = [
      event.studentId,
      event.barrierType,
      event.trigger,
      event.coachReflection,
      event.studentReflection || null,
      event.breakthrough,
      event.transformationDelta,
      JSON.stringify(event.linkedArtifacts || []),
    ];

    const result = await pool.query(query, values);

    console.log(
      `[HGTI] ✅ Recorded growth event for ${event.studentId} (${event.barrierType}, delta: ${event.transformationDelta})`
    );

    return this.mapRow(result.rows[0]);
  }

  /**
   * Gets the HGTI score for a student.
   *
   * @param studentId - Student ID
   * @param opts - Options (realtime = compute fresh vs cached MV)
   * @returns HGTI score (0-1)
   */
  async getHGTIScore(
    studentId: string,
    opts: { realtime?: boolean } = {}
  ): Promise<number> {
    if (opts.realtime) {
      // Compute fresh delta (not cached MV)
      const result = await pool.query(
        `
        SELECT AVG(transformation_delta) AS avg_transformation
        FROM growth_events
        WHERE student_id = $1
        `,
        [studentId]
      );

      return result.rows[0]?.avg_transformation || 0;
    }

    // Use cached MV (5-min stale max)
    const result = await pool.query(
      `SELECT avg_transformation FROM mv_hgti_scores WHERE student_id = $1`,
      [studentId]
    );

    return result.rows[0]?.avg_transformation || 0;
  }

  /**
   * Gets full HGTI stats for a student.
   *
   * @param studentId - Student ID
   * @param opts - Options (realtime = compute fresh vs cached MV)
   * @returns HGTI stats
   */
  async getHGTIStats(
    studentId: string,
    opts: { realtime?: boolean } = {}
  ): Promise<HGTIScore | null> {
    if (opts.realtime) {
      // Compute fresh stats
      const result = await pool.query(
        `
        SELECT
          student_id,
          AVG(transformation_delta) AS avg_transformation,
          SUM(CASE WHEN breakthrough THEN 1 ELSE 0 END) AS breakthrough_count,
          COUNT(*) AS total_events,
          MAX(occurred_at) AS latest_event_date
        FROM growth_events
        WHERE student_id = $1
        GROUP BY student_id
        `,
        [studentId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return {
        student_id: result.rows[0].student_id,
        avg_transformation: parseFloat(result.rows[0].avg_transformation) || 0,
        breakthrough_count: parseInt(result.rows[0].breakthrough_count, 10) || 0,
        total_events: parseInt(result.rows[0].total_events, 10) || 0,
        latest_event_date: result.rows[0].latest_event_date ? new Date(result.rows[0].latest_event_date) : null,
      };
    }

    // Use cached MV
    const result = await pool.query(
      `SELECT * FROM mv_hgti_scores WHERE student_id = $1`,
      [studentId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return {
      student_id: result.rows[0].student_id,
      avg_transformation: parseFloat(result.rows[0].avg_transformation) || 0,
      breakthrough_count: parseInt(result.rows[0].breakthrough_count, 10) || 0,
      total_events: parseInt(result.rows[0].total_events, 10) || 0,
      latest_event_date: result.rows[0].latest_event_date ? new Date(result.rows[0].latest_event_date) : null,
    };
  }

  /**
   * Gets the growth timeline for a student (all events).
   *
   * @param studentId - Student ID
   * @param limit - Optional limit (default 100)
   * @returns Array of growth events
   */
  async getTimeline(studentId: string, limit: number = 100): Promise<GrowthEvent[]> {
    const result = await pool.query(
      `
      SELECT * FROM growth_events
      WHERE student_id = $1
      ORDER BY occurred_at DESC
      LIMIT $2
      `,
      [studentId, limit]
    );

    return result.rows.map(this.mapRow);
  }

  /**
   * Gets breakthroughs for a student.
   *
   * @param studentId - Student ID
   * @returns Array of breakthrough events
   */
  async getBreakthroughs(studentId: string): Promise<GrowthEvent[]> {
    const result = await pool.query(
      `
      SELECT * FROM growth_events
      WHERE student_id = $1 AND breakthrough = true
      ORDER BY occurred_at DESC
      `,
      [studentId]
    );

    return result.rows.map(this.mapRow);
  }

  /**
   * Gets growth events by barrier type.
   *
   * @param studentId - Student ID
   * @param barrierType - Barrier type
   * @returns Array of growth events
   */
  async getEventsByBarrierType(
    studentId: string,
    barrierType: BarrierType
  ): Promise<GrowthEvent[]> {
    const result = await pool.query(
      `
      SELECT * FROM growth_events
      WHERE student_id = $1 AND barrier_type = $2
      ORDER BY occurred_at DESC
      `,
      [studentId, barrierType]
    );

    return result.rows.map(this.mapRow);
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Maps database row to GrowthEvent object.
   */
  private mapRow(row: any): GrowthEvent {
    return {
      id: row.id,
      student_id: row.student_id,
      barrier_type: row.barrier_type,
      trigger: row.trigger,
      coach_reflection: row.coach_reflection,
      student_reflection: row.student_reflection,
      breakthrough: row.breakthrough,
      transformation_delta: parseFloat(row.transformation_delta),
      occurred_at: new Date(row.occurred_at),
      linked_artifacts: typeof row.linked_artifacts === 'string'
        ? JSON.parse(row.linked_artifacts)
        : row.linked_artifacts,
      created_at: new Date(row.created_at),
    };
  }
}

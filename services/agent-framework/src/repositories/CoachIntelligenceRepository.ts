/**
 * Coach Intelligence Repository
 *
 * Data access layer for coach intelligence profiles
 */

import { Pool, PoolClient } from 'pg';
import { CoachIntelligence, CoachingTool, PatternLibrary } from '../types/CoachIntelligence.js';

export class CoachIntelligenceRepository {
  constructor(private pool: Pool) {}

  /**
   * Get coach intelligence by coach_id
   */
  async getByCoachId(
    coachId: string,
    client?: PoolClient
  ): Promise<CoachIntelligence | null> {
    const db = client || this.pool;

    const result = await db.query(
      `SELECT
        coach_id,
        coach_name,
        specialty,
        credibility_markers,
        intelligence_layers,
        personas,
        custom_tools,
        pattern_library,
        created_at,
        updated_at
      FROM coach_intelligence
      WHERE coach_id = $1`,
      [coachId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToCoachIntelligence(result.rows[0]);
  }

  /**
   * Get all coaches
   */
  async getAll(client?: PoolClient): Promise<CoachIntelligence[]> {
    const db = client || this.pool;

    const result = await db.query(
      `SELECT
        coach_id,
        coach_name,
        specialty,
        credibility_markers,
        intelligence_layers,
        personas,
        custom_tools,
        pattern_library,
        created_at,
        updated_at
      FROM coach_intelligence
      ORDER BY created_at DESC`
    );

    return result.rows.map((row) => this.mapRowToCoachIntelligence(row));
  }

  /**
   * Update coach custom tools
   */
  async updateCustomTools(
    coachId: string,
    customTools: CoachingTool[],
    client?: PoolClient
  ): Promise<CoachIntelligence | null> {
    const db = client || this.pool;

    const result = await db.query(
      `UPDATE coach_intelligence
       SET custom_tools = $1::jsonb,
           updated_at = NOW()
       WHERE coach_id = $2
       RETURNING *`,
      [JSON.stringify(customTools), coachId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToCoachIntelligence(result.rows[0]);
  }

  /**
   * Update pattern library
   * Used when coach completes assessments/gameplans or discovers new patterns
   */
  async updatePatternLibrary(
    coachId: string,
    patternLibrary: PatternLibrary,
    client?: PoolClient
  ): Promise<CoachIntelligence | null> {
    const db = client || this.pool;

    const result = await db.query(
      `UPDATE coach_intelligence
       SET pattern_library = $1::jsonb,
           updated_at = NOW()
       WHERE coach_id = $2
       RETURNING *`,
      [JSON.stringify(patternLibrary), coachId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToCoachIntelligence(result.rows[0]);
  }

  /**
   * Increment assessment/gameplan counters
   */
  async incrementCounters(
    coachId: string,
    updates: {
      assessments_completed?: number;
      gameplans_generated?: number;
      students_coached?: number;
    },
    client?: PoolClient
  ): Promise<void> {
    const db = client || this.pool;

    const setClauses: string[] = [];

    if (updates.assessments_completed !== undefined) {
      setClauses.push(
        `pattern_library = jsonb_set(
          pattern_library,
          '{assessments_completed}',
          to_jsonb((pattern_library->>'assessments_completed')::int + ${updates.assessments_completed})
        )`
      );
    }

    if (updates.gameplans_generated !== undefined) {
      setClauses.push(
        `pattern_library = jsonb_set(
          pattern_library,
          '{gameplans_generated}',
          to_jsonb((pattern_library->>'gameplans_generated')::int + ${updates.gameplans_generated})
        )`
      );
    }

    if (updates.students_coached !== undefined) {
      setClauses.push(
        `pattern_library = jsonb_set(
          pattern_library,
          '{students_coached}',
          to_jsonb((pattern_library->>'students_coached')::int + ${updates.students_coached})
        )`
      );
    }

    if (setClauses.length === 0) {
      return;
    }

    await db.query(
      `UPDATE coach_intelligence
       SET ${setClauses.join(', ')},
           updated_at = NOW()
       WHERE coach_id = $1`,
      [coachId]
    );
  }

  /**
   * Map database row to CoachIntelligence
   */
  private mapRowToCoachIntelligence(row: any): CoachIntelligence {
    return {
      coach_id: row.coach_id,
      coach_name: row.coach_name,
      specialty: row.specialty,
      credibility_markers: row.credibility_markers,
      intelligence_layers: row.intelligence_layers,
      personas: row.personas,
      custom_tools: row.custom_tools,
      pattern_library: row.pattern_library,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

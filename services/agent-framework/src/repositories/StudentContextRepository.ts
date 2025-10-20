/**
 * Student Context Repository
 *
 * Data access layer for student context intelligence
 * Enforces student-coach isolation via RLS policies
 */

import { Pool, PoolClient } from 'pg';
import { StudentContext, StudentContextUpdate } from '../types/StudentContext.js';

export class StudentContextRepository {
  constructor(private pool: Pool) {}

  /**
   * Get student context by student_id
   * RLS policy enforces: student sees only their own context OR coach sees their students
   */
  async getByStudentId(
    studentId: string,
    client?: PoolClient
  ): Promise<StudentContext | null> {
    const db = client || this.pool;

    const result = await db.query(
      `SELECT
        student_id,
        coach_id,
        name,
        email,
        phone,
        class_year,
        current_week,
        psycho_behavioral,
        academic,
        family,
        interests,
        goals,
        state,
        custom_context,
        created_at,
        updated_at
      FROM student_context
      WHERE student_id = $1`,
      [studentId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToStudentContext(result.rows[0]);
  }

  /**
   * Get all students for a coach
   * Used by coach to see all their assigned students
   */
  async getByCoachId(
    coachId: string,
    client?: PoolClient
  ): Promise<StudentContext[]> {
    const db = client || this.pool;

    const result = await db.query(
      `SELECT
        student_id,
        coach_id,
        name,
        email,
        phone,
        class_year,
        current_week,
        psycho_behavioral,
        academic,
        family,
        interests,
        goals,
        state,
        custom_context,
        created_at,
        updated_at
      FROM student_context
      WHERE coach_id = $1
      ORDER BY created_at DESC`,
      [coachId]
    );

    return result.rows.map((row) => this.mapRowToStudentContext(row));
  }

  /**
   * Create new student context
   */
  async create(
    context: Omit<StudentContext, 'created_at' | 'updated_at'>,
    client?: PoolClient
  ): Promise<StudentContext> {
    const db = client || this.pool;

    const result = await db.query(
      `INSERT INTO student_context (
        student_id,
        coach_id,
        name,
        email,
        phone,
        class_year,
        current_week,
        psycho_behavioral,
        academic,
        family,
        interests,
        goals,
        state,
        custom_context
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        context.student_id,
        context.coach_id,
        context.name,
        context.email,
        context.phone,
        context.class_year,
        context.current_week,
        JSON.stringify(context.psycho_behavioral),
        JSON.stringify(context.academic),
        JSON.stringify(context.family),
        JSON.stringify(context.interests),
        JSON.stringify(context.goals),
        JSON.stringify(context.state),
        context.custom_context ? JSON.stringify(context.custom_context) : null,
      ]
    );

    return this.mapRowToStudentContext(result.rows[0]);
  }

  /**
   * Update student context
   */
  async update(
    studentId: string,
    updates: StudentContextUpdate,
    client?: PoolClient
  ): Promise<StudentContext | null> {
    const db = client || this.pool;

    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.psycho_behavioral) {
      setClauses.push(`psycho_behavioral = psycho_behavioral || $${paramIndex}::jsonb`);
      values.push(JSON.stringify(updates.psycho_behavioral));
      paramIndex++;
    }

    if (updates.academic) {
      setClauses.push(`academic = academic || $${paramIndex}::jsonb`);
      values.push(JSON.stringify(updates.academic));
      paramIndex++;
    }

    if (updates.family) {
      setClauses.push(`family = family || $${paramIndex}::jsonb`);
      values.push(JSON.stringify(updates.family));
      paramIndex++;
    }

    if (updates.interests) {
      setClauses.push(`interests = interests || $${paramIndex}::jsonb`);
      values.push(JSON.stringify(updates.interests));
      paramIndex++;
    }

    if (updates.goals) {
      setClauses.push(`goals = goals || $${paramIndex}::jsonb`);
      values.push(JSON.stringify(updates.goals));
      paramIndex++;
    }

    if (updates.state) {
      setClauses.push(`state = state || $${paramIndex}::jsonb`);
      values.push(JSON.stringify(updates.state));
      paramIndex++;
    }

    if (updates.custom_context) {
      setClauses.push(`custom_context = $${paramIndex}::jsonb`);
      values.push(JSON.stringify(updates.custom_context));
      paramIndex++;
    }

    if (updates.current_week !== undefined) {
      setClauses.push(`current_week = $${paramIndex}`);
      values.push(updates.current_week);
      paramIndex++;
    }

    if (setClauses.length === 0) {
      // No updates provided
      return this.getByStudentId(studentId, client);
    }

    setClauses.push(`updated_at = NOW()`);

    values.push(studentId);

    const result = await db.query(
      `UPDATE student_context
       SET ${setClauses.join(', ')}
       WHERE student_id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToStudentContext(result.rows[0]);
  }

  /**
   * Get student's assigned coach
   */
  async getStudentCoach(
    studentId: string,
    client?: PoolClient
  ): Promise<string | null> {
    const db = client || this.pool;

    const result = await db.query(
      `SELECT get_student_coach($1) as coach_id`,
      [studentId]
    );

    return result.rows[0]?.coach_id || null;
  }

  /**
   * Check if student can access agent (student-coach isolation)
   */
  async canStudentAccessAgent(
    studentId: string,
    agentCoachId: string,
    client?: PoolClient
  ): Promise<boolean> {
    const db = client || this.pool;

    const result = await db.query(
      `SELECT can_student_access_agent($1, $2) as can_access`,
      [studentId, agentCoachId]
    );

    return result.rows[0]?.can_access || false;
  }

  /**
   * Map database row to StudentContext
   */
  private mapRowToStudentContext(row: any): StudentContext {
    return {
      student_id: row.student_id,
      coach_id: row.coach_id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      class_year: row.class_year,
      current_week: row.current_week,
      psycho_behavioral: row.psycho_behavioral,
      academic: row.academic,
      family: row.family,
      interests: row.interests,
      goals: row.goals,
      state: row.state,
      custom_context: row.custom_context,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

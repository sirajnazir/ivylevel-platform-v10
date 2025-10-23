/**
 * Chip Repository - Database Persistence for Evidence Chips
 *
 * Handles CRUD operations for chips with deduplication support.
 *
 * Version: v3.2.0
 * Fix #4: Chip persistence with PII scrubbing
 */

import { Pool } from 'pg';
import { Chip } from './chip-creator';

// ============================================================================
// CHIP REPOSITORY
// ============================================================================

export class ChipRepository {
  constructor(private pool: Pool) {}

  /**
   * Saves a chip to the database with deduplication.
   *
   * If a chip with the same (student_id, hash) already exists, returns the existing chip.
   * Otherwise, inserts the new chip.
   *
   * @param chip - Chip to save
   * @returns Saved chip (existing or new)
   */
  async save(chip: Chip): Promise<Chip> {
    const query = `
      INSERT INTO chips (id, student_id, kind, source, hash, trace_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (student_id, hash) DO UPDATE
        SET trace_id = EXCLUDED.trace_id,
            created_at = EXCLUDED.created_at
      RETURNING *
    `;

    const values = [
      chip.id,
      chip.student_id,
      chip.kind,
      JSON.stringify(chip.source),
      chip.hash,
      chip.trace_id,
      chip.created_at,
    ];

    const result = await this.pool.query(query, values);

    return this.mapRow(result.rows[0]);
  }

  /**
   * Finds a chip by ID.
   *
   * @param chipId - Chip ID
   * @returns Chip or null if not found
   */
  async findById(chipId: string): Promise<Chip | null> {
    const query = `SELECT * FROM chips WHERE id = $1`;
    const result = await this.pool.query(query, [chipId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  /**
   * Finds chips by student ID with optional kind filter.
   *
   * @param studentId - Student ID
   * @param kind - Optional kind filter (SQL, RAG, LLM, EQ, NARRATIVE)
   * @param limit - Optional limit (default 100)
   * @returns Array of chips
   */
  async findByStudent(
    studentId: string,
    kind?: Chip['kind'],
    limit: number = 100
  ): Promise<Chip[]> {
    let query = `SELECT * FROM chips WHERE student_id = $1`;
    const values: any[] = [studentId];

    if (kind) {
      query += ` AND kind = $2`;
      values.push(kind);
    }

    query += ` ORDER BY created_at DESC LIMIT $${values.length + 1}`;
    values.push(limit);

    const result = await this.pool.query(query, values);

    return result.rows.map(this.mapRow);
  }

  /**
   * Finds chips by trace ID (for distributed tracing).
   *
   * @param traceId - OpenTelemetry trace ID
   * @returns Array of chips
   */
  async findByTrace(traceId: string): Promise<Chip[]> {
    const query = `SELECT * FROM chips WHERE trace_id = $1 ORDER BY created_at ASC`;
    const result = await this.pool.query(query, [traceId]);

    return result.rows.map(this.mapRow);
  }

  /**
   * Checks if a chip with the given hash already exists for the student.
   *
   * @param studentId - Student ID
   * @param hash - Chip hash
   * @returns Existing chip or null
   */
  async findByHash(studentId: string, hash: string): Promise<Chip | null> {
    const query = `SELECT * FROM chips WHERE student_id = $1 AND hash = $2`;
    const result = await this.pool.query(query, [studentId, hash]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  /**
   * Deletes chips older than the specified number of days.
   *
   * @param days - Number of days to retain
   * @returns Number of chips deleted
   */
  async deleteOlderThan(days: number): Promise<number> {
    const query = `
      DELETE FROM chips
      WHERE created_at < NOW() - INTERVAL '${days} days'
    `;

    const result = await this.pool.query(query);

    return result.rowCount || 0;
  }

  /**
   * Gets chip statistics for a student.
   *
   * @param studentId - Student ID
   * @returns Chip stats by kind
   */
  async getStats(studentId: string): Promise<Record<string, number>> {
    const query = `
      SELECT kind, COUNT(*) as count
      FROM chips
      WHERE student_id = $1
      GROUP BY kind
    `;

    const result = await this.pool.query(query, [studentId]);

    const stats: Record<string, number> = {};
    for (const row of result.rows) {
      stats[row.kind] = parseInt(row.count, 10);
    }

    return stats;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Maps database row to Chip object.
   */
  private mapRow(row: any): Chip {
    return {
      id: row.id,
      student_id: row.student_id,
      kind: row.kind,
      source: typeof row.source === 'string' ? JSON.parse(row.source) : row.source,
      hash: row.hash,
      trace_id: row.trace_id,
      created_at: new Date(row.created_at),
    };
  }
}

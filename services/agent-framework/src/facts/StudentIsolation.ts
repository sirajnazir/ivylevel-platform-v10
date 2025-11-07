import { ProductionTable } from './UniversalFact.js';

/**
 * Student Isolation Layer
 *
 * Prevents clone/test student data from contaminating production student records.
 *
 * Strategy: Clone students write to {table}_clone tables
 */
export class StudentIsolation {
  /**
   * Patterns identifying clone students
   */
  private static readonly CLONE_PATTERNS = [
    /^.*-v\d+-.*$/,        // huda-v26-2025, huda-v27-2025
    /^.*-clone-.*$/,       // huda-clone-2025
    /^clone_.*$/,          // clone_huda
    /^test_.*$/,           // test_student_123
  ];

  /**
   * Check if student ID is a clone/test student
   */
  static isCloneStudent(studentId: string): boolean {
    return this.CLONE_PATTERNS.some(pattern => pattern.test(studentId));
  }

  /**
   * Get correct table name based on student type
   *
   * Clone students → {table}_clone
   * Real students → {table}
   */
  static getTableName(baseTable: ProductionTable, studentId: string): string {
    if (this.isCloneStudent(studentId)) {
      return `${baseTable}_clone`;
    }
    return baseTable;
  }

  /**
   * Validate table exists before writing
   * (Throws error if clone table not created yet)
   */
  static async validateTableExists(
    pool: any,
    tableName: string
  ): Promise<void> {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = $1
      ) as exists
    `, [tableName]);

    if (!result.rows[0].exists) {
      throw new Error(
        `Clone table '${tableName}' does not exist. ` +
        `Run migration 034_create_clone_tables.sql first.`
      );
    }
  }

  /**
   * Get all clone table names for a list of base tables
   */
  static getCloneTableNames(baseTables: ProductionTable[]): string[] {
    return baseTables.map(table => `${table}_clone`);
  }
}

/**
 * Example Usage:
 *
 * const studentId = 'huda-v26-2025';
 *
 * // Check if clone
 * const isClone = StudentIsolation.isCloneStudent(studentId);
 * // → true
 *
 * // Get table name
 * const tableName = StudentIsolation.getTableName(
 *   ProductionTable.STUDENTS,
 *   studentId
 * );
 * // → 'students_clone' (not 'students')
 *
 * // Use in query
 * await pool.query(`
 *   INSERT INTO ${tableName} (student_id, grade, ...)
 *   VALUES ($1, $2, ...)
 * `, [studentId, grade, ...]);
 * // Writes to students_clone, not students ✅
 */

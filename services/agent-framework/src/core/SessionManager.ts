/**
 * SessionManager.ts
 * Manages agent sessions with student context
 * Created: 2025-10-16 (Phase 1, Week 2)
 */

import type { IvyLevelSession, StudentContext } from './types.js';
import { pool } from '../db/pool.js';
import { vitals } from '../resolvers/vitals.js';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('session-manager');

/**
 * SessionManager - Manages agent sessions
 * Responsibilities:
 * - Create new sessions
 * - Load student context
 * - Store/retrieve sessions (in-memory for now, can add Redis later)
 */
export class SessionManager {
  private sessions: Map<string, IvyLevelSession> = new Map();

  /**
   * Create a new session for a student
   */
  async createSession(studentId: string): Promise<IvyLevelSession> {
    const sessionId = `sess_${studentId}_${Date.now()}`;

    log.event('session.create', { session_id: sessionId, student_id: studentId });

    // Load student context
    const context = await this.loadStudentContext(studentId);

    const session: IvyLevelSession = {
      session_id: sessionId,
      student_id: studentId,
      student_name: context.student_name,
      context,
      messages: [],
      created_at: new Date(),
      last_active: new Date(),
      turn_count: 0,
    };

    this.sessions.set(sessionId, session);

    return session;
  }

  /**
   * Get existing session by ID
   */
  getSession(sessionId: string): IvyLevelSession | null {
    const session = this.sessions.get(sessionId);

    if (session) {
      log.event('session.retrieved', {
        session_id: sessionId,
        turn_count: session.turn_count,
      });
    }

    return session || null;
  }

  /**
   * Get or create session for student
   * Finds most recent active session or creates new one
   */
  async getOrCreateSession(studentId: string): Promise<IvyLevelSession> {
    // Find most recent session for this student
    const existingSessions = Array.from(this.sessions.values()).filter(
      (s) => s.student_id === studentId
    );

    if (existingSessions.length > 0) {
      // Return most recent
      const mostRecent = existingSessions.sort(
        (a, b) => b.last_active.getTime() - a.last_active.getTime()
      )[0];

      log.event('session.reused', {
        session_id: mostRecent.session_id,
        student_id: studentId,
        turn_count: mostRecent.turn_count,
      });

      return mostRecent;
    }

    // Create new session
    return await this.createSession(studentId);
  }

  /**
   * Update session (after agent execution)
   */
  updateSession(session: IvyLevelSession): void {
    this.sessions.set(session.session_id, session);

    log.event('session.updated', {
      session_id: session.session_id,
      turn_count: session.turn_count,
    });
  }

  /**
   * Load student context from database
   * Fetches core vitals and caches them in session
   */
  private async loadStudentContext(studentId: string): Promise<StudentContext> {
    log.event('session.load_context_start', { student_id: studentId });

    try {
      // Get student vitals
      const vitalData = await vitals.latest(pool, studentId);

      // Extract key metrics
      const context: StudentContext = {
        student_id: studentId,
        student_name: this.extractVital(vitalData, 'student_name', 'Student'),
        grade: parseInt(this.extractVital(vitalData, 'grade', '11')),
        high_school: this.extractVital(vitalData, 'high_school'),
        gpa: parseFloat(this.extractVital(vitalData, 'gpa_weighted', '0') || '0') || undefined,
        sat_total: parseInt(this.extractVital(vitalData, 'sat_total', '0') || '0') || undefined,
        act_composite:
          parseInt(this.extractVital(vitalData, 'act_composite', '0') || '0') || undefined,
        loaded_at: new Date(),
      };

      // Get counts from KB items
      const countsResult = await pool.query(
        `
        SELECT
          COUNT(DISTINCT CASE WHEN kb_category = 'ec' THEN chip_id END) AS ecs_count,
          COUNT(DISTINCT CASE WHEN kb_category = 'award' THEN chip_id END) AS awards_count,
          COUNT(DISTINCT CASE WHEN kb_category = 'program' THEN chip_id END) AS programs_count
        FROM kb_items
        WHERE student_id = $1
      `,
        [studentId]
      );

      if (countsResult.rows[0]) {
        context.ecs_count = parseInt(countsResult.rows[0].ecs_count || '0');
        context.awards_count = parseInt(countsResult.rows[0].awards_count || '0');
        context.programs_count = parseInt(countsResult.rows[0].programs_count || '0');
      }

      log.event('session.load_context_complete', {
        student_id: studentId,
        context_keys: Object.keys(context).length,
      });

      return context;
    } catch (error: any) {
      log.error('session.load_context_error', error, { student_id: studentId });

      // Return minimal context
      return {
        student_id: studentId,
        student_name: 'Student',
        grade: 11,
        loaded_at: new Date(),
      };
    }
  }

  /**
   * Extract vital value from vitals array
   */
  private extractVital(
    vitals: any[],
    metricType: string,
    defaultValue: string = ''
  ): string | undefined {
    const vital = vitals.find((v) => v.metric_type === metricType);
    return vital?.item_value || (defaultValue || undefined);
  }

  /**
   * Clear old sessions (for cleanup)
   */
  clearOldSessions(maxAgeMs: number = 3600000): number {
    const now = Date.now();
    let cleared = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.last_active.getTime() > maxAgeMs) {
        this.sessions.delete(sessionId);
        cleared++;
      }
    }

    if (cleared > 0) {
      log.event('session.cleanup', { cleared_count: cleared });
    }

    return cleared;
  }

  /**
   * Get session stats
   */
  getStats() {
    return {
      total_sessions: this.sessions.size,
      sessions_by_student: this.groupSessionsByStudent(),
    };
  }

  private groupSessionsByStudent(): Record<string, number> {
    const byStudent: Record<string, number> = {};

    for (const session of this.sessions.values()) {
      byStudent[session.student_id] = (byStudent[session.student_id] || 0) + 1;
    }

    return byStudent;
  }
}

// Singleton instance
export const sessionManager = new SessionManager();

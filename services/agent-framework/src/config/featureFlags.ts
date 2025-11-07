/**
 * Feature Flag Service for Zero-Downtime Migration
 *
 * Purpose: Controls gradual rollout of LangGraph orchestration
 * Default: 0% (all traffic goes to existing v30 system)
 *
 * Architecture:
 * - Global rollout percentage (0-100%)
 * - Student-specific overrides for testing
 * - Consistent hashing (same student always gets same result)
 * - In-memory cache (1 minute TTL) for performance
 *
 * Created: 2025-11-04 (v31.0 Phase 2)
 */

import { Pool } from 'pg';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('feature-flags');

export interface FeatureFlags {
  useLangGraph: boolean;
  studentId: string;
  rolloutPercentage: number;
}

/**
 * Feature Flag Service
 *
 * Controls which orchestration system to use:
 * - false (default): Use existing v30 multi-agent system
 * - true: Use new LangGraph orchestration
 */
export class FeatureFlagService {
  private pool: Pool;
  private cache: Map<string, { value: boolean; expiry: number }> = new Map();
  private cacheExpiry: number = 60000; // 1 minute cache

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Check if student should use LangGraph orchestration
   *
   * Logic:
   * 1. Check explicit student override (for testing)
   * 2. Check global rollout percentage with consistent hashing
   * 3. Default to false (existing v30 system)
   */
  async shouldUseLangGraph(studentId: string): Promise<boolean> {
    const startTime = Date.now();

    // Check cache first
    const cacheKey = `langgraph:${studentId}`;
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiry > Date.now()) {
      log.event('feature_flag.cache_hit', {
        student_id: studentId,
        result: cached.value,
        duration_ms: Date.now() - startTime
      });
      return cached.value;
    }

    try {
      // Check for explicit student-specific override
      const overrideResult = await this.pool.query(`
        SELECT enabled FROM feature_flags
        WHERE flag_name = 'langgraph_orchestration'
          AND student_id = $1
        LIMIT 1
      `, [studentId]);

      if (overrideResult.rows.length > 0) {
        const result = overrideResult.rows[0].enabled;
        this.setCache(cacheKey, result);

        log.event('feature_flag.student_override', {
          student_id: studentId,
          enabled: result,
          duration_ms: Date.now() - startTime
        });

        return result;
      }

      // Check global rollout percentage
      const globalResult = await this.pool.query(`
        SELECT rollout_percentage FROM feature_flags
        WHERE flag_name = 'langgraph_orchestration'
          AND student_id IS NULL
        LIMIT 1
      `);

      if (globalResult.rows.length > 0) {
        const rolloutPct = globalResult.rows[0].rollout_percentage;

        // Consistent hashing: Same student always gets same result
        const hash = this.hashStudentId(studentId);
        const result = hash < rolloutPct;

        this.setCache(cacheKey, result);

        log.event('feature_flag.global_rollout', {
          student_id: studentId,
          rollout_percentage: rolloutPct,
          hash_value: hash,
          result,
          duration_ms: Date.now() - startTime
        });

        return result;
      }

      // Default: Use existing v30 system (safe fallback)
      this.setCache(cacheKey, false);

      log.event('feature_flag.default', {
        student_id: studentId,
        result: false,
        reason: 'no_flag_configured',
        duration_ms: Date.now() - startTime
      });

      return false;

    } catch (error) {
      // On error, default to existing system (safe failure mode)
      log.error('feature_flag.error', {
        student_id: studentId,
        error: String(error),
        fallback: 'existing_system',
        duration_ms: Date.now() - startTime
      });

      return false;
    }
  }

  /**
   * Hash student ID to percentage (0-100)
   * Ensures consistent assignment across requests
   *
   * Uses simple hash function that distributes evenly
   */
  private hashStudentId(studentId: string): number {
    let hash = 0;
    for (let i = 0; i < studentId.length; i++) {
      hash = ((hash << 5) - hash) + studentId.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % 100;
  }

  /**
   * Set cache with expiry
   */
  private setCache(key: string, value: boolean): void {
    this.cache.set(key, {
      value,
      expiry: Date.now() + this.cacheExpiry
    });
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
    log.event('feature_flag.cache_cleared', {});
  }

  /**
   * Manually enable LangGraph for specific student (testing)
   */
  async enableForStudent(studentId: string): Promise<void> {
    await this.pool.query(`
      INSERT INTO feature_flags (flag_name, student_id, enabled)
      VALUES ('langgraph_orchestration', $1, true)
      ON CONFLICT (flag_name, student_id)
      DO UPDATE SET enabled = true, updated_at = NOW()
    `, [studentId]);

    this.cache.delete(`langgraph:${studentId}`);

    log.event('feature_flag.student_enabled', { student_id: studentId });
  }

  /**
   * Manually disable LangGraph for specific student (rollback)
   */
  async disableForStudent(studentId: string): Promise<void> {
    await this.pool.query(`
      INSERT INTO feature_flags (flag_name, student_id, enabled)
      VALUES ('langgraph_orchestration', $1, false)
      ON CONFLICT (flag_name, student_id)
      DO UPDATE SET enabled = false, updated_at = NOW()
    `, [studentId]);

    this.cache.delete(`langgraph:${studentId}`);

    log.event('feature_flag.student_disabled', { student_id: studentId });
  }

  /**
   * Set global rollout percentage (0-100)
   */
  async setRolloutPercentage(percentage: number): Promise<void> {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Rollout percentage must be 0-100');
    }

    await this.pool.query(`
      UPDATE feature_flags
      SET rollout_percentage = $1, updated_at = NOW()
      WHERE flag_name = 'langgraph_orchestration' AND student_id IS NULL
    `, [percentage]);

    // Clear cache to force refresh
    this.cache.clear();

    log.event('feature_flag.rollout_updated', {
      new_percentage: percentage
    });
  }

  /**
   * Get current rollout status
   */
  async getRolloutStatus(): Promise<{
    rolloutPercentage: number;
    explicitEnables: number;
    explicitDisables: number;
  }> {
    const [global, enables, disables] = await Promise.all([
      this.pool.query(`
        SELECT rollout_percentage FROM feature_flags
        WHERE flag_name = 'langgraph_orchestration' AND student_id IS NULL
      `),
      this.pool.query(`
        SELECT COUNT(*) as count FROM feature_flags
        WHERE flag_name = 'langgraph_orchestration' AND enabled = true AND student_id IS NOT NULL
      `),
      this.pool.query(`
        SELECT COUNT(*) as count FROM feature_flags
        WHERE flag_name = 'langgraph_orchestration' AND enabled = false AND student_id IS NOT NULL
      `)
    ]);

    return {
      rolloutPercentage: global.rows[0]?.rollout_percentage || 0,
      explicitEnables: parseInt(enables.rows[0].count),
      explicitDisables: parseInt(disables.rows[0].count)
    };
  }
}

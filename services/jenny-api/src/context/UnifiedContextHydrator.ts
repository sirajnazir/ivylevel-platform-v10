/**
 * v13.0 Unified Context Hydrator
 *
 * Purpose: Aggregate student context from multiple sources for <100ms hydration
 *
 * Architecture:
 * - Parallel queries to SQL (CAT-1 facts), Pinecone (CAT-2 strategy), conversation history
 * - In-memory caching with 5-minute TTL
 * - Denormalized student profile from students table
 * - Recent turns from conversation_turns table
 * - Strategic insights from strategic_insights table
 * - Emotional state from emotional_trajectory table
 *
 * Performance Target: p95 latency <100ms
 */

import { Pool } from 'pg';
import { pool } from '../db/pool.js';

// ============================================================================
// TYPES
// ============================================================================

export interface UnifiedContext {
  student_id: string;
  session_id: string | null;

  // Profile snapshot (from students table)
  profile: StudentProfile;

  // Progress snapshot (from CAT-1 SQL views)
  progress: ProgressSnapshot;

  // Emotional state (from emotional_trajectory table)
  emotional_state: EmotionalState;

  // Strategy memory (from strategic_insights table)
  strategy_memory: StrategyMemory;

  // Recent turns (from conversation_turns table)
  recent_turns: ConversationTurn[];

  // Outcome metrics (pre-calculated)
  outcome_metrics: OutcomeMetrics | null;

  // Metadata
  hydrated_at: Date;
  source_tables: string[];
  hydration_latency_ms: number;
}

export interface StudentProfile {
  student_id: string;
  full_name: string;
  email: string | null;
  graduation_year: number | null;

  // Academic profile
  gpa_unweighted: number | null;
  gpa_weighted: number | null;
  sat_score: number | null;
  act_score: number | null;

  // Strategic profile
  ec_spike_theme: string | null;
  awards_count: number;
  leadership_positions: string[];

  // College profile
  target_schools: string[];
  target_major: string | null;
  early_decision_school: string | null;
}

export interface ProgressSnapshot {
  // Applications progress
  applications: {
    total: number;
    submitted: number;
    in_progress: number;
    decisions_received: number;
    acceptances: number;
    rejections: number;
  };

  // Awards progress
  awards: {
    total: number;
    initial: number;
    final: number;
  };

  // ECs progress
  extracurriculars: {
    total: number;
    initial: number;
    final: number;
  };

  // Academics progress
  academics: {
    courses_count: number;
    latest_gpa: number | null;
    gpa_trend: 'improving' | 'stable' | 'declining' | 'unknown';
  };
}

export interface EmotionalState {
  current_mood: string | null;
  current_stress_level: number | null;
  sentiment_score: number | null;
  recent_triggers: Array<{
    trigger_event: string;
    trigger_category: string;
    measured_at: Date;
  }>;
  trajectory: 'improving' | 'stable' | 'declining' | 'unknown';
}

export interface StrategyMemory {
  active_insights: Array<{
    insight_id: number;
    insight_type: string;
    insight_summary: string;
    confidence_score: number;
    is_evergreen: boolean;
  }>;

  completed_action_items: string[];
  pending_action_items: string[];

  key_recommendations: string[];
}

export interface ConversationTurn {
  turn_id: number;
  turn_number: number;
  created_at: Date;
  student_message: string;
  coach_response: string;
  intent_detected: any;
  has_pronouns: boolean;
  resolved_references: any;
}

export interface OutcomeMetrics {
  acceptance_probability: {
    overall: number;
    by_school: Record<string, number>;
  };

  improvement_levers: Array<{
    lever: string;
    impact: 'high' | 'medium' | 'low';
    current_status: string;
    recommended_action: string;
  }>;

  readiness_score: number; // 0-100
  timeline_health: 'on_track' | 'at_risk' | 'behind';
}

// ============================================================================
// CACHE
// ============================================================================

interface CacheEntry {
  context: UnifiedContext;
  expires_at: Date;
  is_stale: boolean;
}

const contextCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// UNIFIED CONTEXT HYDRATOR
// ============================================================================

export class UnifiedContextHydrator {
  private pool: Pool;

  constructor(dbPool: Pool = pool) {
    this.pool = dbPool;
  }

  /**
   * Hydrate unified context for a student and session
   *
   * Performance target: <100ms p95
   *
   * @param student_id Student identifier
   * @param session_id Optional session identifier (for recent turns)
   * @returns Unified context with profile, progress, emotional state, strategy memory
   */
  async hydrate(student_id: string, session_id: string | null = null): Promise<UnifiedContext> {
    const start = Date.now();
    const cache_key = `context:${student_id}:${session_id || 'global'}`;

    // Check cache first
    const cached = contextCache.get(cache_key);
    if (cached && !cached.is_stale && cached.expires_at > new Date()) {
      console.log(`[UnifiedContextHydrator] Cache HIT for ${cache_key} (${Date.now() - start}ms)`);
      return cached.context;
    }

    console.log(`[UnifiedContextHydrator] Cache MISS for ${cache_key}, hydrating from DB...`);

    // Parallel hydration from all sources
    const [profile, progress, emotional, strategic, turns] = await Promise.all([
      this.hydrateProfile(student_id),
      this.hydrateProgress(student_id),
      this.hydrateEmotionalState(student_id),
      this.hydrateStrategicMemory(student_id),
      this.hydrateRecentTurns(session_id, 10)
    ]);

    // Calculate outcome metrics (optional, can be expensive)
    const outcome_metrics = null; // TODO: Implement in Phase 2

    const hydration_latency_ms = Date.now() - start;

    const context: UnifiedContext = {
      student_id,
      session_id,
      profile,
      progress,
      emotional_state: emotional,
      strategy_memory: strategic,
      recent_turns: turns,
      outcome_metrics,
      hydrated_at: new Date(),
      source_tables: ['students', 'outcomes', 'awards', 'ecs', 'academics', 'emotional_trajectory', 'strategic_insights', 'conversation_turns'],
      hydration_latency_ms
    };

    // Cache for 5 minutes
    contextCache.set(cache_key, {
      context,
      expires_at: new Date(Date.now() + CACHE_TTL_MS),
      is_stale: false
    });

    console.log(`[UnifiedContextHydrator] Hydrated context for ${student_id} in ${hydration_latency_ms}ms`);

    return context;
  }

  /**
   * Invalidate cache for a student (called after new data is written)
   */
  invalidateCache(student_id: string, session_id: string | null = null): void {
    const cache_key = `context:${student_id}:${session_id || 'global'}`;
    const entry = contextCache.get(cache_key);
    if (entry) {
      entry.is_stale = true;
      console.log(`[UnifiedContextHydrator] Invalidated cache for ${cache_key}`);
    }
  }

  /**
   * Clear all cache entries (useful for testing)
   */
  clearCache(): void {
    contextCache.clear();
    console.log(`[UnifiedContextHydrator] Cleared all cache entries`);
  }

  // ============================================================================
  // PRIVATE HYDRATION METHODS
  // ============================================================================

  private async hydrateProfile(student_id: string): Promise<StudentProfile> {
    const result = await this.pool.query(`
      SELECT
        student_id,
        full_name,
        email,
        graduation_year,
        gpa_unweighted,
        gpa_weighted,
        sat_score,
        act_score,
        ec_spike_theme,
        awards_count,
        leadership_positions,
        target_schools,
        target_major,
        early_decision_school
      FROM students
      WHERE student_id = $1
    `, [student_id]);

    if (result.rows.length === 0) {
      throw new Error(`Student not found: ${student_id}`);
    }

    const row = result.rows[0];
    return {
      student_id: row.student_id,
      full_name: row.full_name,
      email: row.email,
      graduation_year: row.graduation_year,
      gpa_unweighted: row.gpa_unweighted,
      gpa_weighted: row.gpa_weighted,
      sat_score: row.sat_score,
      act_score: row.act_score,
      ec_spike_theme: row.ec_spike_theme,
      awards_count: row.awards_count || 0,
      leadership_positions: row.leadership_positions || [],
      target_schools: row.target_schools || [],
      target_major: row.target_major,
      early_decision_school: row.early_decision_school
    };
  }

  private async hydrateProgress(student_id: string): Promise<ProgressSnapshot> {
    // Query applications progress from outcomes table (type='admission' for college applications)
    const applicationsResult = await this.pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE admission_result IS NOT NULL) AS decisions_received,
        COUNT(*) FILTER (WHERE admission_result = 'accepted') AS acceptances,
        COUNT(*) FILTER (WHERE admission_result = 'rejected') AS rejections,
        COUNT(*) FILTER (WHERE admission_result = 'waitlisted') AS waitlisted,
        COUNT(*) FILTER (WHERE admission_result IS NULL) AS in_progress
      FROM outcomes
      WHERE student_id = $1 AND type = 'admission'
    `, [student_id]);

    const applications = applicationsResult.rows[0] || { total: 0, in_progress: 0, decisions_received: 0, acceptances: 0, rejections: 0, waitlisted: 0 };

    // TODO Phase 1B: Query from universal enumerations (kb_awards, kb_ecs, academic_courses)
    // For now, return placeholder data
    return {
      applications: {
        total: parseInt(applications.total),
        submitted: parseInt(applications.decisions_received) + parseInt(applications.in_progress),
        in_progress: parseInt(applications.in_progress),
        decisions_received: parseInt(applications.decisions_received),
        acceptances: parseInt(applications.acceptances),
        rejections: parseInt(applications.rejections)
      },
      awards: {
        total: 0, // TODO: Query from kb_awards table (Phase 1B)
        initial: 0,
        final: 0
      },
      extracurriculars: {
        total: 0, // TODO: Query from kb_ecs table (Phase 1B)
        initial: 0,
        final: 0
      },
      academics: {
        courses_count: 0, // TODO: Query from academic_courses table (Phase 1B)
        latest_gpa: null,
        gpa_trend: 'unknown'
      }
    };
  }

  private async hydrateEmotionalState(student_id: string): Promise<EmotionalState> {
    // Get latest emotional measurement
    const latestResult = await this.pool.query(`
      SELECT mood, stress_level, sentiment_score
      FROM emotional_trajectory
      WHERE student_id = $1
      ORDER BY measured_at DESC
      LIMIT 1
    `, [student_id]);

    // Get recent triggers (last 5)
    const triggersResult = await this.pool.query(`
      SELECT trigger_event, trigger_category, measured_at
      FROM emotional_trajectory
      WHERE student_id = $1 AND trigger_event IS NOT NULL
      ORDER BY measured_at DESC
      LIMIT 5
    `, [student_id]);

    const latest = latestResult.rows[0];

    return {
      current_mood: latest?.mood || null,
      current_stress_level: latest?.stress_level || null,
      sentiment_score: latest?.sentiment_score || null,
      recent_triggers: triggersResult.rows.map(row => ({
        trigger_event: row.trigger_event,
        trigger_category: row.trigger_category,
        measured_at: row.measured_at
      })),
      trajectory: 'unknown' // TODO: Calculate trend from last 10 measurements
    };
  }

  private async hydrateStrategicMemory(student_id: string): Promise<StrategyMemory> {
    // Get active insights (top 10 by confidence)
    const insightsResult = await this.pool.query(`
      SELECT
        insight_id,
        insight_type,
        insight_summary,
        confidence_score,
        is_evergreen
      FROM strategic_insights
      WHERE student_id = $1 AND is_active = TRUE
      ORDER BY confidence_score DESC NULLS LAST, created_at DESC
      LIMIT 10
    `, [student_id]);

    // Get recent action items from sessions
    const actionItemsResult = await this.pool.query(`
      SELECT action_items_given
      FROM sessions
      WHERE student_id = $1 AND action_items_given IS NOT NULL
      ORDER BY started_at DESC
      LIMIT 5
    `, [student_id]);

    const all_action_items = actionItemsResult.rows.flatMap(row => row.action_items_given || []);

    return {
      active_insights: insightsResult.rows.map(row => ({
        insight_id: row.insight_id,
        insight_type: row.insight_type,
        insight_summary: row.insight_summary || '',
        confidence_score: row.confidence_score || 0,
        is_evergreen: row.is_evergreen
      })),
      completed_action_items: [], // TODO: Track completion in Phase 2
      pending_action_items: all_action_items,
      key_recommendations: [] // TODO: Derive from insights in Phase 2
    };
  }

  private async hydrateRecentTurns(session_id: string | null, limit: number = 10): Promise<ConversationTurn[]> {
    if (!session_id) {
      return [];
    }

    const result = await this.pool.query(`
      SELECT
        turn_id,
        turn_number,
        created_at,
        student_message,
        coach_response,
        intent_detected,
        has_pronouns,
        resolved_references
      FROM conversation_turns
      WHERE session_id = $1
      ORDER BY turn_number DESC
      LIMIT $2
    `, [session_id, limit]);

    return result.rows.map(row => ({
      turn_id: row.turn_id,
      turn_number: row.turn_number,
      created_at: row.created_at,
      student_message: row.student_message,
      coach_response: row.coach_response,
      intent_detected: row.intent_detected,
      has_pronouns: row.has_pronouns,
      resolved_references: row.resolved_references
    })).reverse(); // Return in chronological order
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const unifiedContextHydrator = new UnifiedContextHydrator();

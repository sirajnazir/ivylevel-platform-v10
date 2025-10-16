/**
 * v13.0 Parallel Intelligence Executor
 *
 * Purpose: Execute CAT-1 (SQL facts), CAT-2 (KB strategy), CAT-3 (EQ warmth) based on intent
 *
 * Architecture:
 * - Parallel execution using Promise.all() when possible
 * - Sequential execution when order matters (hybrid mode)
 * - Result aggregation with metadata tracking
 * - Error handling with graceful degradation
 *
 * Evolution from v12.0:
 * - v12.0: Priority routing (CAT-1 → if empty → CAT-2 → if empty → CAT-3)
 * - v13.0: Parallel execution (CAT-1 + CAT-2 + CAT-3 simultaneously)
 */

import type { Pool } from 'pg';
import type { UnifiedContext } from '../context/UnifiedContextHydrator.js';
import type { MultiDimensionalIntent } from '../intent/MultiDimensionalIntentAnalyzer.js';
import { pool } from '../db/pool.js';

// ============================================================================
// TYPES
// ============================================================================

export interface UnifiedIntelligence {
  // Intelligence from each CAT
  factual: FactualIntelligence | null;
  strategic: StrategicIntelligence | null;
  emotional: EmotionalIntelligence | null;

  // Execution metadata
  execution_mode: 'sequential' | 'parallel' | 'hybrid';
  executed_at: Date;
  total_latency_ms: number;
  cat_latencies: {
    cat1_ms: number | null;
    cat2_ms: number | null;
    cat3_ms: number | null;
  };
}

export interface FactualIntelligence {
  type: 'factual';
  confidence: number;
  results: FactualResult[];
  data_sources: string[];
  has_data: boolean;
  error: string | null;
}

export interface FactualResult {
  source: string; // SQL view/table name
  data: any; // Query results
  row_count: number;
}

export interface StrategicIntelligence {
  type: 'strategic';
  confidence: number;
  insights: StrategyInsight[];
  kb_namespaces: string[];
  has_insights: boolean;
  error: string | null;
}

export interface StrategyInsight {
  content: string;
  relevance_score: number;
  source_chip_id: string;
  namespace: string;
}

export interface EmotionalIntelligence {
  type: 'emotional';
  confidence: number;
  detected_emotions: string[];
  sentiment_score: number;
  eq_categories: string[];
  suggested_response_tone: 'supportive' | 'encouraging' | 'celebratory' | 'normalizing' | 'practical';
  has_emotional_need: boolean;
  error: string | null;
}

// ============================================================================
// PARALLEL INTELLIGENCE EXECUTOR
// ============================================================================

export class ParallelIntelligenceExecutor {
  private pool: Pool;

  constructor(dbPool: Pool = pool) {
    this.pool = dbPool;
  }

  /**
   * Execute intelligence gathering based on multi-dimensional intent
   *
   * @param query Enriched student query
   * @param context Unified context from hydrator
   * @param intent Multi-dimensional intent from analyzer
   * @returns Unified intelligence from all applicable CATs
   */
  async execute(
    query: string,
    context: UnifiedContext,
    intent: MultiDimensionalIntent
  ): Promise<UnifiedIntelligence> {
    const start = Date.now();

    const cat_latencies = {
      cat1_ms: null as number | null,
      cat2_ms: null as number | null,
      cat3_ms: null as number | null
    };

    let factual: FactualIntelligence | null = null;
    let strategic: StrategicIntelligence | null = null;
    let emotional: EmotionalIntelligence | null = null;

    // Execute based on mode
    if (intent.execution.mode === 'parallel') {
      // Parallel execution: All dimensions at once
      console.log('[ParallelExecutor] Executing in PARALLEL mode');

      const tasks: Array<Promise<void>> = [];

      if (intent.dimensions.factual.has_intent) {
        tasks.push(
          (async () => {
            const cat1_start = Date.now();
            factual = await this.executeFactual(query, context, intent.dimensions.factual);
            cat_latencies.cat1_ms = Date.now() - cat1_start;
          })()
        );
      }

      if (intent.dimensions.strategic.has_intent) {
        tasks.push(
          (async () => {
            const cat2_start = Date.now();
            strategic = await this.executeStrategic(query, context, intent.dimensions.strategic);
            cat_latencies.cat2_ms = Date.now() - cat2_start;
          })()
        );
      }

      if (intent.dimensions.emotional.has_intent) {
        tasks.push(
          (async () => {
            const cat3_start = Date.now();
            emotional = await this.executeEmotional(query, context, intent.dimensions.emotional);
            cat_latencies.cat3_ms = Date.now() - cat3_start;
          })()
        );
      }

      await Promise.all(tasks);

    } else if (intent.execution.mode === 'hybrid') {
      // Hybrid execution: Primary first, then EQ wrap
      console.log('[ParallelExecutor] Executing in HYBRID mode');

      for (const dimension of intent.execution.order || []) {
        if (dimension === 'factual' && intent.dimensions.factual.has_intent) {
          const cat1_start = Date.now();
          factual = await this.executeFactual(query, context, intent.dimensions.factual);
          cat_latencies.cat1_ms = Date.now() - cat1_start;
        } else if (dimension === 'strategic' && intent.dimensions.strategic.has_intent) {
          const cat2_start = Date.now();
          strategic = await this.executeStrategic(query, context, intent.dimensions.strategic);
          cat_latencies.cat2_ms = Date.now() - cat2_start;
        } else if (dimension === 'emotional' && intent.dimensions.emotional.has_intent) {
          const cat3_start = Date.now();
          emotional = await this.executeEmotional(query, context, intent.dimensions.emotional);
          cat_latencies.cat3_ms = Date.now() - cat3_start;
        }
      }

    } else {
      // Sequential execution: Single dimension
      console.log('[ParallelExecutor] Executing in SEQUENTIAL mode');

      if (intent.dimensions.factual.has_intent) {
        const cat1_start = Date.now();
        factual = await this.executeFactual(query, context, intent.dimensions.factual);
        cat_latencies.cat1_ms = Date.now() - cat1_start;
      } else if (intent.dimensions.strategic.has_intent) {
        const cat2_start = Date.now();
        strategic = await this.executeStrategic(query, context, intent.dimensions.strategic);
        cat_latencies.cat2_ms = Date.now() - cat2_start;
      } else if (intent.dimensions.emotional.has_intent) {
        const cat3_start = Date.now();
        emotional = await this.executeEmotional(query, context, intent.dimensions.emotional);
        cat_latencies.cat3_ms = Date.now() - cat3_start;
      }
    }

    const total_latency_ms = Date.now() - start;

    console.log(`[ParallelExecutor] Execution complete in ${total_latency_ms}ms (CAT-1: ${cat_latencies.cat1_ms}ms, CAT-2: ${cat_latencies.cat2_ms}ms, CAT-3: ${cat_latencies.cat3_ms}ms)`);

    return {
      factual,
      strategic,
      emotional,
      execution_mode: intent.execution.mode,
      executed_at: new Date(),
      total_latency_ms,
      cat_latencies
    };
  }

  // ============================================================================
  // CAT EXECUTORS
  // ============================================================================

  /**
   * CAT-1: Execute SQL queries for factual data via EXISTING RESOLVERS (v13.0 Universal Fix)
   *
   * ARCHITECTURE: Delegates to proven resolver functions instead of duplicating SQL
   * - MultiDimensionalIntentAnalyzer detects sub_intents (e.g., "gpa.latest")
   * - ResolverMapper routes to existing resolver (e.g., academicsGPA())
   * - Resolver executes proven SQL (e.g., SELECT * FROM v_gpa_timeline)
   *
   * Benefits:
   * - Zero SQL duplication
   * - Uses battle-tested resolver code from silo system
   * - Future-proof: add mapping, not SQL
   */
  private async executeFactual(
    query: string,
    context: UnifiedContext,
    dimension: MultiDimensionalIntent['dimensions']['factual']
  ): Promise<FactualIntelligence> {
    console.log(`[CAT-1] Executing factual queries via resolvers: ${dimension.sub_intents.join(', ')}`);

    const results: FactualResult[] = [];

    try {
      // Import universal resolver mapper
      const { callResolverForIntent } = await import('./ResolverMapper.js');

      // Execute resolver for each sub-intent
      for (const sub_intent of dimension.sub_intents) {
        try {
          console.log(`[CAT-1] Calling resolver for sub-intent: ${sub_intent}`);

          // CALL EXISTING RESOLVER (not duplicate SQL)
          const resolver_result = await callResolverForIntent(
            sub_intent,
            this.pool,
            context.student_id,
            query
          );

          // Only include results with actual data
          if (resolver_result.hits && resolver_result.hits.length > 0) {
            results.push({
              source: sub_intent,
              data: resolver_result.hits,
              row_count: resolver_result.hits.length
            });
            console.log(`[CAT-1] ✓ Resolver returned ${resolver_result.hits.length} rows for ${sub_intent}`);
          } else {
            console.log(`[CAT-1] ✗ No data returned for ${sub_intent}`);
          }

        } catch (err) {
          console.error(`[CAT-1] Error calling resolver for ${sub_intent}:`, err);
          // Continue with other sub-intents
        }
      }

      return {
        type: 'factual',
        confidence: dimension.confidence,
        results,
        data_sources: dimension.sub_intents, // Sub-intents are the "data sources"
        has_data: results.length > 0,
        error: null
      };

    } catch (err) {
      console.error('[CAT-1] Fatal error:', err);
      return {
        type: 'factual',
        confidence: dimension.confidence,
        results: [],
        data_sources: dimension.sub_intents,
        has_data: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  }

  /**
   * CAT-2: Execute KB retrieval for strategic insights (REAL Pinecone)
   */
  private async executeStrategic(
    query: string,
    context: UnifiedContext,
    dimension: MultiDimensionalIntent['dimensions']['strategic']
  ): Promise<StrategicIntelligence> {
    console.log(`[CAT-2] Executing strategic queries: ${dimension.sub_intents.join(', ')}`);

    try {
      // Import hybrid search (REAL Pinecone)
      const { hybridSearch } = await import('../retrieval/hybrid.js');

      // Execute hybrid search (Pinecone + lexical)
      const hits = await hybridSearch(query, context.student_id);

      // Extract insights from hits
      const insights: StrategyInsight[] = hits.slice(0, 5).map((hit: any) => {
        // Extract text from various possible field names
        const content = hit._text || hit.text || hit.content || hit.insight_vector || hit.body || '';
        const score = hit.score || hit.relevance_score || 0.5;
        const chip_id = hit.id || hit.chip_id || 'unknown';
        const namespace = hit.namespace || 'KBv6';

        return {
          content,
          relevance_score: score,
          source_chip_id: chip_id,
          namespace
        };
      }).filter(insight => insight.content.trim().length > 0);

      console.log(`[CAT-2] Found ${insights.length} strategic insights from Pinecone`);

      return {
        type: 'strategic',
        confidence: dimension.confidence,
        insights,
        kb_namespaces: dimension.kb_namespaces,
        has_insights: insights.length > 0,
        error: null
      };

    } catch (err) {
      console.error('[CAT-2] Error:', err);
      return {
        type: 'strategic',
        confidence: dimension.confidence,
        insights: [],
        kb_namespaces: dimension.kb_namespaces,
        has_insights: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  }

  /**
   * CAT-3: Execute emotional intelligence analysis
   */
  private async executeEmotional(
    query: string,
    context: UnifiedContext,
    dimension: MultiDimensionalIntent['dimensions']['emotional']
  ): Promise<EmotionalIntelligence> {
    console.log(`[CAT-3] Executing emotional analysis: ${dimension.detected_emotions.join(', ')}`);

    // Determine response tone based on emotions and sentiment
    let suggested_response_tone: EmotionalIntelligence['suggested_response_tone'] = 'supportive';

    if (dimension.detected_emotions.includes('excitement') || dimension.sentiment_score > 0.5) {
      suggested_response_tone = 'celebratory';
    } else if (dimension.detected_emotions.includes('anxiety') || dimension.detected_emotions.includes('stress')) {
      suggested_response_tone = 'normalizing';
    } else if (dimension.detected_emotions.includes('doubt') || dimension.sentiment_score < -0.3) {
      suggested_response_tone = 'encouraging';
    } else if (dimension.detected_emotions.includes('frustration')) {
      suggested_response_tone = 'practical';
    }

    return {
      type: 'emotional',
      confidence: dimension.confidence,
      detected_emotions: dimension.detected_emotions,
      sentiment_score: dimension.sentiment_score,
      eq_categories: dimension.eq_categories,
      suggested_response_tone,
      has_emotional_need: dimension.detected_emotions.length > 0,
      error: null
    };
  }

  // ============================================================================
  // REMOVED: queryDataSource() method
  // ============================================================================
  //
  // v13.0 Universal Fix: SQL queries now delegated to existing resolvers
  // See: ResolverMapper.ts for intent → resolver routing
  // See: services/resolvers.ts for ALL SQL queries (single source of truth)
  //
  // This eliminates SQL duplication and ensures future-proof architecture
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const parallelIntelligenceExecutor = new ParallelIntelligenceExecutor();

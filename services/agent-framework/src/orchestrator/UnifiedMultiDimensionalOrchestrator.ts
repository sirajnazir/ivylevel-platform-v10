/**
 * v13.0 Unified Multi-Dimensional Orchestrator
 *
 * Orchestrates the complete v13.0 pipeline:
 * 1. Context Hydration (student profile)
 * 2. Multi-Dimensional Intent Analysis (CAT-1/2/3 detection)
 * 3. Parallel Intelligence Execution (SQL + Pinecone + EQ)
 * 4. Context Fusion Synthesis (LLM blending)
 *
 * Replaces old v11 orchestrator with true multi-dimensional architecture.
 */

import { pool } from '../db/pool.js';
import { analyzeMultiDimensionalIntent } from '../intent/GPTIntentAnalyzer.js';
import { ParallelIntelligenceExecutor } from '../execution/ParallelIntelligenceExecutor.js';
import { ContextFusionSynthesizer } from '../synthesis/ContextFusionSynthesizer.js';

export interface UnifiedRequest {
  message: string;
  student_id: string;
  session_id?: string | null;
}

export interface UnifiedResponse {
  answer: string;
  model: string;
  usage: {
    total_tokens: number;
  };
  metadata: {
    synthesis_method: string;
    used_cats: string[];
    quality_score: {
      factuality: number;
      coherence: number;
      empathy: number;
      actionability: number;
    };
    total_pipeline_latency_ms: number;
    breakdown: {
      context_hydration_ms: number;
      intent_analysis_ms: number;
      intelligence_execution_ms: number;
      synthesis_ms: number;
    };
  };
}

export class UnifiedMultiDimensionalOrchestrator {
  private intelligenceExecutor: ParallelIntelligenceExecutor;
  private synthesizer: ContextFusionSynthesizer;

  constructor() {
    this.intelligenceExecutor = new ParallelIntelligenceExecutor();
    this.synthesizer = new ContextFusionSynthesizer();
  }

  async orchestrate(request: UnifiedRequest): Promise<UnifiedResponse> {
    const pipelineStart = Date.now();
    const breakdown = {
      context_hydration_ms: 0,
      intent_analysis_ms: 0,
      intelligence_execution_ms: 0,
      synthesis_ms: 0
    };

    try {
      // PHASE 1: Context Hydration
      const contextStart = Date.now();
      const context = await this.hydrateContext(request.student_id);
      breakdown.context_hydration_ms = Date.now() - contextStart;

      // PHASE 2: Multi-Dimensional Intent Analysis (GPT-4o-mini JSON - v12.0 proven)
      const intentStart = Date.now();
      const intent = await analyzeMultiDimensionalIntent(request.message, context);
      breakdown.intent_analysis_ms = Date.now() - intentStart;

      // PHASE 3: Parallel Intelligence Execution
      const executionStart = Date.now();
      const intelligence = await this.intelligenceExecutor.execute(
        request.message,
        context,
        intent
      );
      breakdown.intelligence_execution_ms = Date.now() - executionStart;

      // PHASE 4: Context Fusion Synthesis
      const synthesisStart = Date.now();
      console.log('[v13-Orchestrator] Starting synthesis phase...');
      console.log('[v13-Orchestrator] Intelligence gathered:', {
        factual: intelligence.factual ? 'present' : 'missing',
        strategic: intelligence.strategic ? 'present' : 'missing',
        emotional: intelligence.emotional ? 'present' : 'missing'
      });

      const synthesisResult = await this.synthesizer.synthesize(
        request.message,
        context,
        intent,
        intelligence
      );
      breakdown.synthesis_ms = Date.now() - synthesisStart;
      console.log('[v13-Orchestrator] Synthesis complete:', breakdown.synthesis_ms, 'ms');

      const total_pipeline_latency_ms = Date.now() - pipelineStart;

      // Build response
      return {
        answer: synthesisResult.response,
        model: synthesisResult.model_used,
        usage: {
          total_tokens: synthesisResult.tokens_used
        },
        metadata: {
          synthesis_method: synthesisResult.synthesis_method,
          used_cats: synthesisResult.used_cats,
          quality_score: synthesisResult.quality_score,
          total_pipeline_latency_ms,
          breakdown
        }
      };

    } catch (error: any) {
      console.error('[v13-Orchestrator] Pipeline error:', error);

      // Graceful degradation
      return {
        answer: "I'm having trouble processing your question right now. Could you try rephrasing it?",
        model: 'error',
        usage: { total_tokens: 0 },
        metadata: {
          synthesis_method: 'error',
          used_cats: [],
          quality_score: {
            factuality: 0,
            coherence: 0,
            empathy: 0,
            actionability: 0
          },
          total_pipeline_latency_ms: Date.now() - pipelineStart,
          breakdown
        }
      };
    }
  }

  private async hydrateContext(student_id: string): Promise<any> {
    try {
      const result = await pool.query(
        `SELECT
          student_id,
          full_name,
          email,
          grad_year
        FROM students
        WHERE student_id = $1`,
        [student_id]
      );

      const profile = result.rows.length > 0
        ? result.rows[0]
        : { student_id, full_name: 'Student', email: '', grad_year: null };

      // Return proper UnifiedContext structure with complete StudentProfile
      return {
        student_id,
        session_id: null,
        profile: {
          student_id: profile.student_id,
          full_name: profile.full_name,
          email: profile.email,
          graduation_year: profile.grad_year,
          // Academic profile (to be enriched later)
          gpa_unweighted: null,
          gpa_weighted: null,
          sat_score: null,
          act_score: null,
          // Strategic profile (to be enriched later)
          ec_spike_theme: null,
          awards_count: 0,
          leadership_positions: [],
          // College profile (to be enriched later)
          target_schools: [],
          target_major: null,
          early_decision_school: null
        },
        progress: {
          applications: {
            total: 0,
            submitted: 0,
            in_progress: 0,
            decisions_received: 0,
            acceptances: 0,
            rejections: 0
          },
          awards: {
            total: 0,
            initial: 0,
            won: 0
          },
          testing: {
            sat_attempts: 0,
            act_attempts: 0,
            ap_exams: 0
          }
        },
        emotional_state: {},
        strategy_memory: {},
        recent_turns: [],
        outcome_metrics: null,
        hydrated_at: new Date(),
        source_tables: ['students'],
        hydration_latency_ms: 0
      };

    } catch (error) {
      console.error('[v13-Orchestrator] Context hydration error:', error);
      // Return minimal valid context with complete structure
      return {
        student_id,
        session_id: null,
        profile: {
          student_id,
          full_name: 'Student',
          email: '',
          graduation_year: null,
          gpa_unweighted: null,
          gpa_weighted: null,
          sat_score: null,
          act_score: null,
          ec_spike_theme: null,
          awards_count: 0,
          leadership_positions: [],
          target_schools: [],
          target_major: null,
          early_decision_school: null
        },
        progress: {
          applications: {
            total: 0,
            submitted: 0,
            in_progress: 0,
            decisions_received: 0,
            acceptances: 0,
            rejections: 0
          },
          awards: {
            total: 0,
            initial: 0,
            won: 0
          },
          testing: {
            sat_attempts: 0,
            act_attempts: 0,
            ap_exams: 0
          }
        },
        emotional_state: {},
        strategy_memory: {},
        recent_turns: [],
        outcome_metrics: null,
        hydrated_at: new Date(),
        source_tables: [],
        hydration_latency_ms: 0
      };
    }
  }
}

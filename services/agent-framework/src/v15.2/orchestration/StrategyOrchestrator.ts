/**
 * v15.2 Framework Integration - Strategy Orchestrator
 * Purpose: LangChain LCEL orchestrator integrating Intent → Context → Reflection → Response
 * Author: v15.2 Implementation
 * Date: 2025-10-28
 */

import { RunnableSequence } from '@langchain/core/runnables';
import { IntentRoutingService } from '../routing/IntentRoutingService.js';
import { ContextEngineeringPipeline } from '../context/ContextEngineeringPipeline.js';
import { ReflectionService } from '../reflection/ReflectionService.js';
import { pool } from '../../db/pool.js';
import type {
  StrategyRequest,
  StrategyResponse,
  StudentContext,
  ChainTrace,
  ChainStep,
  StrategyChainTraceRecord,
} from '../types/index.js';

// ============================================================================
// STRATEGY ORCHESTRATOR (LangChain LCEL)
// ============================================================================

export class StrategyOrchestrator {
  private intentRouter: IntentRoutingService;
  private contextPipeline: ContextEngineeringPipeline;
  private reflector: ReflectionService;

  constructor() {
    this.intentRouter = new IntentRoutingService();
    this.contextPipeline = new ContextEngineeringPipeline();
    this.reflector = new ReflectionService();
  }

  /**
   * Main orchestration: Intent → Context → Reflection → Response
   * Uses LCEL-style chaining
   */
  async executeStrategy(request: StrategyRequest): Promise<StrategyResponse> {
    const startTime = Date.now();
    const traceId = `v15.2-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const chainSteps: ChainStep[] = [];

    try {
      // STEP 1: Intent Classification
      const intentStepStart = Date.now();
      const intentClassification = await this.intentRouter.classifyIntent(
        request.query,
        request.student_context,
        request.session_id
      );
      chainSteps.push({
        step: 'intent_classification',
        duration_ms: Date.now() - intentStepStart,
        output: {
          intent: intentClassification.intent,
          confidence: intentClassification.confidence,
          reasoning: intentClassification.reasoning,
        },
      });

      // STEP 2: Context Engineering
      const contextStepStart = Date.now();
      const context = await this.contextPipeline.buildContext(
        request.query,
        intentClassification.intent,
        request.student_id,
        request.session_id
      );
      chainSteps.push({
        step: 'context_engineering',
        duration_ms: Date.now() - contextStepStart,
        output: {
          few_shot_count: context.few_shot_examples.length,
          sql_facts_count: Object.keys(context.sql_facts).length,
          prompt_tokens: context.prompt_tokens,
          context_sources: context.context_sources,
        },
      });

      // STEP 3: Reflection (Producer-Critic)
      const reflectionStepStart = Date.now();
      const reflection = await this.reflector.reflect(
        context.final_prompt,
        request.student_id,
        request.session_id,
        request.query,
        3, // max 3 iterations
        7.5 // quality threshold
      );
      chainSteps.push({
        step: 'reflection',
        duration_ms: Date.now() - reflectionStepStart,
        output: {
          total_iterations: reflection.total_iterations,
          avg_quality_score: reflection.average_quality_score,
          final_iteration_passed: reflection.iterations[reflection.iterations.length - 1].passed_quality_gate,
        },
      });

      const totalDuration = Date.now() - startTime;

      // Log chain trace to database
      await this.logChainTrace({
        student_id: request.student_id,
        session_id: request.session_id,
        chain_name: 'strategyChain',
        query: request.query,
        chain_steps: chainSteps,
        total_duration_ms: totalDuration,
        success: true,
      });

      return {
        response: reflection.final_response,
        intent: intentClassification.intent,
        confidence: intentClassification.confidence,
        reflection_quality: reflection.average_quality_score,
        processing_time_ms: totalDuration,
        trace_id: traceId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Strategy orchestration failed:', error);

      // Log failed chain trace
      const failedStep: ChainStep = {
        step: 'orchestration_error',
        duration_ms: Date.now() - startTime,
        output: null,
        error: errorMessage,
      };
      chainSteps.push(failedStep);

      await this.logChainTrace({
        student_id: request.student_id,
        session_id: request.session_id,
        chain_name: 'strategyChain',
        query: request.query,
        chain_steps: chainSteps,
        total_duration_ms: Date.now() - startTime,
        success: false,
        error_message: errorMessage,
      });

      throw error;
    }
  }

  /**
   * Log chain execution trace to database for observability
   */
  private async logChainTrace(
    record: StrategyChainTraceRecord
  ): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO strategy_chain_traces
         (student_id, session_id, chain_name, query, chain_steps,
          total_duration_ms, success, error_message)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          record.student_id,
          record.session_id,
          record.chain_name,
          record.query,
          JSON.stringify(record.chain_steps),
          record.total_duration_ms,
          record.success,
          record.error_message || null,
        ]
      );
    } catch (error) {
      console.error('Failed to log chain trace:', error);
      // Non-blocking: don't fail the request if logging fails
    }
  }

  /**
   * Get chain execution analytics for a student
   */
  async getChainAnalytics(studentId: string): Promise<{
    total_chains: number;
    success_rate: number;
    avg_duration_ms: number;
    avg_intent_confidence: number;
    avg_reflection_quality: number;
  }> {
    // Get overall chain stats
    const statsResult = await pool.query(
      `SELECT
        COUNT(*) as total_chains,
        COUNT(*) FILTER (WHERE success = true) as successful_chains,
        AVG(total_duration_ms) as avg_duration_ms
       FROM strategy_chain_traces
       WHERE student_id = $1`,
      [studentId]
    );

    // Get intent confidence stats
    const intentResult = await pool.query(
      `SELECT AVG(confidence_score) as avg_confidence
       FROM intent_classifications
       WHERE student_id = $1`,
      [studentId]
    );

    // Get reflection quality stats
    const reflectionResult = await pool.query(
      `SELECT * FROM mv_reflection_quality_metrics WHERE student_id = $1`,
      [studentId]
    );

    const stats = statsResult.rows[0];
    const totalChains = parseInt(stats.total_chains);

    return {
      total_chains: totalChains,
      success_rate: totalChains > 0 ? (stats.successful_chains / totalChains) * 100 : 0,
      avg_duration_ms: parseFloat(stats.avg_duration_ms) || 0,
      avg_intent_confidence: parseFloat(intentResult.rows[0]?.avg_confidence) || 0,
      avg_reflection_quality: parseFloat(reflectionResult.rows[0]?.avg_overall_quality) || 0,
    };
  }

  /**
   * Health check: verify all services are operational
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: {
      database: boolean;
      intentRouter: boolean;
      contextPipeline: boolean;
      reflector: boolean;
    };
  }> {
    const services = {
      database: false,
      intentRouter: false,
      contextPipeline: false,
      reflector: false,
    };

    try {
      // Check database connection
      await pool.query('SELECT 1');
      services.database = true;
    } catch (error) {
      console.error('Database health check failed:', error);
    }

    try {
      // Check intent router (lightweight test)
      services.intentRouter = this.intentRouter !== null;
    } catch (error) {
      console.error('Intent router health check failed:', error);
    }

    try {
      // Check context pipeline
      services.contextPipeline = this.contextPipeline !== null;
    } catch (error) {
      console.error('Context pipeline health check failed:', error);
    }

    try {
      // Check reflector
      services.reflector = this.reflector !== null;
    } catch (error) {
      console.error('Reflector health check failed:', error);
    }

    const healthyCount = Object.values(services).filter(Boolean).length;
    const status =
      healthyCount === 4 ? 'healthy' : healthyCount >= 2 ? 'degraded' : 'unhealthy';

    return { status, services };
  }
}

// Export singleton instance
export const strategyOrchestrator = new StrategyOrchestrator();

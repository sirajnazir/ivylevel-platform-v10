/**
 * v15.3 Universal Agent - 6-Phase Lifecycle Implementation
 *
 * Date: 2025-10-28
 * Purpose: Single agent class that all domain agents extend/configure
 * Architecture: Based on FUNDAMENTAL_AGENT_ARCHITECTURE_V1.md
 *
 * @module primitives/UniversalAgent
 */

import {
  UniversalAgentConfig,
  AgentExecutionResult,
  Context,
  SubGoal,
  ToolResult,
  VerificationResult,
  QualityMetrics,
} from './types';

/**
 * Universal Agent: Single agent class configured for different domains
 *
 * All domain agents (Assessment, GamePlan, Awards, etc.) are just
 * different configurations of this universal agent.
 *
 * Lifecycle: Perception → Context → Reasoning → Action → Synthesis → Memory
 */
export class UniversalAgent<
  TRawInput = any,
  TStructuredInput = any,
  TContext extends Context = Context,
  TOutput = any
> {
  private readonly config: UniversalAgentConfig<TRawInput, TStructuredInput, TContext, TOutput>;

  constructor(config: UniversalAgentConfig<TRawInput, TStructuredInput, TContext, TOutput>) {
    this.config = config;
  }

  /**
   * Main execution method - orchestrates the 6-phase lifecycle
   */
  async execute(rawInput: TRawInput, sessionId?: string): Promise<AgentExecutionResult<TOutput>> {
    const startTime = Date.now();
    const phaseTimes: Record<string, number> = {};
    const toolsUsed: string[] = [];

    const actualSessionId = sessionId || this.generateSessionId();

    try {
      // ========================================================================
      // PHASE 1: PERCEPTION
      // Transform raw input into structured representation
      // ========================================================================
      const phase1Start = Date.now();

      // Validate input first
      const validationResult = await this.config.perceptor.validate(rawInput);
      if (!validationResult.valid) {
        throw new Error(`Input validation failed: ${validationResult.errors?.join(', ')}`);
      }

      // Perceive structured input
      const structuredInput = await this.config.perceptor.perceive(rawInput);

      phaseTimes.perception = Date.now() - phase1Start;

      // ========================================================================
      // PHASE 2: CONTEXT
      // Load execution context (student profile, coaching intelligence, etc.)
      // ========================================================================
      const phase2Start = Date.now();

      let context = await this.config.contextLoader.loadContext(actualSessionId, {
        input: structuredInput
      });

      // Enrich with coaching intelligence if available
      if (this.config.intelligenceLoader) {
        const intelligence = await this.config.intelligenceLoader.loadIntelligence(
          context.student_id || 'default'
        );
        context = { ...context, intelligence };
      }

      // Further enrich context
      context = await this.config.contextLoader.enrichContext(context);

      phaseTimes.context = Date.now() - phase2Start;

      // ========================================================================
      // PHASE 3: REASONING
      // Routing and/or Planning
      // ========================================================================
      const phase3Start = Date.now();

      let plan: SubGoal[] = [];

      // If router is configured, route first
      if (this.config.router) {
        const destination = await this.config.router.route(structuredInput, context);
        // Router might delegate to another agent or select a sub-strategy
        // For now, we continue with current agent
      }

      // If planner is configured, decompose goal into sub-goals
      if (this.config.planner) {
        plan = await this.config.planner.plan(structuredInput, context);
      } else {
        // No planner: create single "execute" sub-goal
        plan = [{
          id: 'execute',
          description: 'Execute with tools',
          dependencies: [],
          status: 'pending'
        }];
      }

      phaseTimes.reasoning = Date.now() - phase3Start;

      // ========================================================================
      // PHASE 4: ACTION
      // Execute tools based on plan
      // ========================================================================
      const phase4Start = Date.now();

      const actionResults: any[] = [];

      for (const subGoal of plan) {
        // Mark sub-goal as in progress
        subGoal.status = 'in_progress';

        // Execute tools for this sub-goal
        // In a real implementation, this would be more sophisticated
        // For now, we execute all available tools that make sense for the input

        const tools = this.config.toolExecutor.getTools();

        for (const tool of tools) {
          try {
            // Simple heuristic: execute tool if it seems relevant
            // In production, this would be LLM-driven tool selection
            const result = await this.config.toolExecutor.executeTool(
              tool.metadata.name,
              structuredInput,
              context
            );

            if (result.success) {
              actionResults.push({
                tool: tool.metadata.name,
                result: result.data,
                metadata: result.metadata
              });
              toolsUsed.push(tool.metadata.name);
            }
          } catch (error) {
            // Tool execution failed, continue with next tool
            console.error(`Tool ${tool.metadata.name} failed:`, error);
          }
        }

        // Mark sub-goal as completed
        subGoal.status = 'completed';
      }

      phaseTimes.action = Date.now() - phase4Start;

      // ========================================================================
      // PHASE 5: SYNTHESIS
      // Combine results and verify quality
      // ========================================================================
      const phase5Start = Date.now();

      // Synthesize all action results into final output
      let output = await this.config.synthesizer.synthesize(actionResults);

      // Verify output quality
      const verificationResult = await this.config.verifier.verify(output, {
        context,
        input: structuredInput
      });

      // If verification fails, attempt to heal the output
      if (!verificationResult.passed) {
        output = await this.config.verifier.heal(output, verificationResult);

        // Verify again after healing
        const reVerification = await this.config.verifier.verify(output, {
          context,
          input: structuredInput
        });

        if (!reVerification.passed) {
          console.warn('Output verification still failing after heal attempt');
        }
      }

      phaseTimes.synthesis = Date.now() - phase5Start;

      // ========================================================================
      // PHASE 6: MEMORY
      // Persist session state and long-term memories
      // ========================================================================
      const phase6Start = Date.now();

      // Save session state
      await this.config.stateStore.save(actualSessionId, {
        input: structuredInput,
        context,
        output,
        plan,
        verification: verificationResult,
        timestamp: new Date()
      });

      // If memory store is configured, store long-term memories
      if (this.config.memoryStore && verificationResult.passed) {
        // Store successful interaction as procedural memory
        await this.config.memoryStore.store({
          id: this.generateMemoryId(),
          content: {
            input: structuredInput,
            output,
            effectiveness: verificationResult.score
          },
          type: 'procedural',
          timestamp: new Date(),
          metadata: {
            agent_id: this.config.agentId,
            session_id: actualSessionId,
            tools_used: toolsUsed
          }
        });
      }

      phaseTimes.memory = Date.now() - phase6Start;

      // ========================================================================
      // RETURN RESULT
      // ========================================================================
      const totalTime = Date.now() - startTime;

      return {
        success: true,
        output,
        sessionId: actualSessionId,
        metadata: {
          execution_time_ms: totalTime,
          tools_used: toolsUsed,
          verification_score: verificationResult.score,
          phase_timings: phaseTimes
        }
      };

    } catch (error: any) {
      // Error handling
      const totalTime = Date.now() - startTime;

      return {
        success: false,
        output: null as any,
        sessionId: actualSessionId,
        metadata: {
          execution_time_ms: totalTime,
          tools_used: toolsUsed,
          verification_score: 0,
          phase_timings: phaseTimes
        },
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Get agent configuration
   */
  getConfig(): UniversalAgentConfig<TRawInput, TStructuredInput, TContext, TOutput> {
    return this.config;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `${this.config.agentId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique memory ID
   */
  private generateMemoryId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Agent Builder: Fluent API for configuring Universal Agent
 */
export class AgentBuilder<
  TRawInput = any,
  TStructuredInput = any,
  TContext extends Context = Context,
  TOutput = any
> {
  private config: Partial<UniversalAgentConfig<TRawInput, TStructuredInput, TContext, TOutput>> = {};

  constructor(agentId: string) {
    this.config.agentId = agentId;
  }

  withPerceptor(perceptor: UniversalAgentConfig<TRawInput, TStructuredInput, TContext, TOutput>['perceptor']): this {
    this.config.perceptor = perceptor;
    return this;
  }

  withContextLoader(contextLoader: UniversalAgentConfig<TRawInput, TStructuredInput, TContext, TOutput>['contextLoader']): this {
    this.config.contextLoader = contextLoader;
    return this;
  }

  withIntelligenceLoader(intelligenceLoader: UniversalAgentConfig<TRawInput, TStructuredInput, TContext, TOutput>['intelligenceLoader']): this {
    this.config.intelligenceLoader = intelligenceLoader;
    return this;
  }

  withRouter(router: UniversalAgentConfig<TRawInput, TStructuredInput, TContext, TOutput>['router']): this {
    this.config.router = router;
    return this;
  }

  withPlanner(planner: UniversalAgentConfig<TRawInput, TStructuredInput, TContext, TOutput>['planner']): this {
    this.config.planner = planner;
    return this;
  }

  withToolExecutor(toolExecutor: UniversalAgentConfig<TRawInput, TStructuredInput, TContext, TOutput>['toolExecutor']): this {
    this.config.toolExecutor = toolExecutor;
    return this;
  }

  withSynthesizer(synthesizer: UniversalAgentConfig<TRawInput, TStructuredInput, TContext, TOutput>['synthesizer']): this {
    this.config.synthesizer = synthesizer;
    return this;
  }

  withVerifier(verifier: UniversalAgentConfig<TRawInput, TStructuredInput, TContext, TOutput>['verifier']): this {
    this.config.verifier = verifier;
    return this;
  }

  withStateStore(stateStore: UniversalAgentConfig<TRawInput, TStructuredInput, TContext, TOutput>['stateStore']): this {
    this.config.stateStore = stateStore;
    return this;
  }

  withMemoryStore(memoryStore: UniversalAgentConfig<TRawInput, TStructuredInput, TContext, TOutput>['memoryStore']): this {
    this.config.memoryStore = memoryStore;
    return this;
  }

  build(): UniversalAgent<TRawInput, TStructuredInput, TContext, TOutput> {
    // Validate required components
    if (!this.config.agentId) throw new Error('agentId is required');
    if (!this.config.perceptor) throw new Error('perceptor is required');
    if (!this.config.contextLoader) throw new Error('contextLoader is required');
    if (!this.config.toolExecutor) throw new Error('toolExecutor is required');
    if (!this.config.synthesizer) throw new Error('synthesizer is required');
    if (!this.config.verifier) throw new Error('verifier is required');
    if (!this.config.stateStore) throw new Error('stateStore is required');

    return new UniversalAgent(this.config as UniversalAgentConfig<TRawInput, TStructuredInput, TContext, TOutput>);
  }
}

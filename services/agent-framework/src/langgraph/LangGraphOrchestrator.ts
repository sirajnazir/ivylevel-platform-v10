/**
 * LangGraph Orchestrator (v31.0 Phase 2 → V2 Async Delegation)
 *
 * Purpose: NEW orchestration layer using LangGraph with async multi-agent delegation
 * Design: Runs in parallel with existing v30 system, controlled by feature flag
 *
 * V2 Features (ACTIVE):
 * - ✅ Async delegation (GamePlan → Awards + ECs in parallel)
 * - ✅ Parallel execution using LangGraph conditional edges
 * - ✅ Result aggregation node
 * - ✅ State management for delegation tracking
 *
 * Architecture:
 * - Wraps existing agents as LangGraph tools (agents UNCHANGED)
 * - StateGraph with conditional routing for parallel delegation
 * - Aggregation node combines parallel results
 * - Full LangSmith tracing for observability
 * - Feature-flag controlled (100% rollout for testing)
 *
 * Created: 2025-11-04 (v31.0 Phase 2)
 * Updated: 2025-11-04 (V2 Async Delegation)
 */

import { StateGraph, END, START } from "@langchain/langgraph";
import { RedisSaver } from "@langchain/langgraph-checkpoint-redis";
import { DynamicStructuredTool } from "@langchain/core/tools";
import Redis from "ioredis";
import { Pool } from "pg";
import { FactStore } from "../facts/FactStore.js";
import { wrapAgentAsTool, parseAgentToolResult } from "./AgentToolWrapper.js";
import { createLogger } from "../../../../packages/observability/dist/unified-logger.js";
import {
  CollaborationOrchestrator,
  CollaborationPatterns,
  CollaborationMode,
  type CollaborationState,
  type CollaborationPattern
} from "./MultiAgentCollaborationFramework.js";

// Import existing agents (UNCHANGED)
import { AssessmentAgentV3ConversationalRealtime } from "../agents/v18/AssessmentAgentV3ConversationalRealtime.js";
import { GamePlanAgentV3 } from "../agents/v18/GamePlanAgentV3.js";
import { ExecutionAgent } from "../agents/v18/ExecutionAgent.js";
import { AwardsAgentRefactored } from "../agents/v18/AwardsAgentRefactored.js";
import { ExtracurricularsAgentRefactored } from "../agents/v18/ExtracurricularsAgentRefactored.js";
import { ScholarshipsAgent } from "../agents/v18/ScholarshipsAgent.js";

const log = createLogger('langgraph-orchestrator');

/**
 * Workflow state (shared across all nodes)
 * V2: Added delegation tracking for parallel execution
 */
interface WorkflowState {
  student_id: string;
  session_id: string;
  message: string;
  current_agent: string;
  agent_response: string;
  confidence?: number;
  intelligence_triggered?: string[];
  error?: string;
  agent_metadata?: Record<string, any>; // v31.3: Preserve agent's full metadata

  // V2: Async delegation fields
  should_delegate?: boolean;
  delegated_to?: string[];
  delegation_results?: Record<string, any>;
  aggregated_response?: string;
}

/**
 * LangGraph Orchestrator
 *
 * V1 (Phase 2): Simple pass-through to existing agents
 * V2 (Phase 3): Add async delegation and streaming
 */
export class LangGraphOrchestrator {
  private pool: Pool;
  private factStore: FactStore;
  private checkpointer: RedisSaver | null = null;
  private app: any;  // Compiled LangGraph app (legacy simple routing)

  // Wrapped agent tools
  private assessmentTool: DynamicStructuredTool;
  private gameplanTool: DynamicStructuredTool;
  private executionTool: DynamicStructuredTool;
  private awardsTool: DynamicStructuredTool;
  private ecsTool: DynamicStructuredTool;
  private scholarshipsTool: DynamicStructuredTool;

  // V2: Collaboration orchestrators for different patterns
  private delegationOrchestrator: CollaborationOrchestrator | null = null;
  private handoffOrchestrator: CollaborationOrchestrator | null = null;
  private sequentialOrchestrator: CollaborationOrchestrator | null = null;

  constructor(pool: Pool, factStore: FactStore, redisUrl?: string) {
    this.pool = pool;
    this.factStore = factStore;

    // Initialize Redis checkpointer if URL provided
    if (redisUrl) {
      try {
        const redis = new Redis(redisUrl);
        this.checkpointer = new RedisSaver(redis);
        log.event('langgraph.redis_initialized', { redis_url: redisUrl });
      } catch (error) {
        log.error('langgraph.redis_init_failed', {
          error: String(error),
          fallback: 'stateless_mode'
        });
        // Continue without checkpointing (stateless mode)
      }
    }

    // Wrap existing agents as tools
    this.initializeAgentTools();

    // V2: Initialize collaboration patterns
    this.initializeCollaborationPatterns();

    // Build workflow graph (legacy simple routing)
    this.buildWorkflowGraph();
  }

  /**
   * Initialize agent tools (wrapping existing agents)
   * ZERO changes to agent code - just wrapping them
   */
  private initializeAgentTools(): void {
    log.event('langgraph.init_tools_start', {});

    // Create existing agents (UNCHANGED code paths)
    const assessmentAgent = new AssessmentAgentV3ConversationalRealtime(this.factStore, this.pool);
    const gameplanAgent = new GamePlanAgentV3(this.factStore, this.pool);
    const executionAgent = new ExecutionAgent(this.factStore);
    const awardsAgent = new AwardsAgentRefactored(this.factStore);
    const ecsAgent = new ExtracurricularsAgentRefactored(this.factStore);
    const scholarshipsAgent = new ScholarshipsAgent(this.factStore);

    // Wrap as LangGraph tools
    this.assessmentTool = wrapAgentAsTool(
      assessmentAgent,
      'assessment-agent-v18',
      'Runs 4-phase assessment conversation using TYPE-080 intelligence. Returns student profile analysis and conversation state.'
    );

    this.gameplanTool = wrapAgentAsTool(
      gameplanAgent,
      'gameplan-agent-v18',
      'Creates strategic game plan using TYPE-081 intelligence. Can delegate to specialist agents for awards and extracurriculars.'
    );

    this.executionTool = wrapAgentAsTool(
      executionAgent,
      'execution-agent-v20',
      'Manages weekly execution using TYPE-082 (168-hour framework). Tracks progress and provides accountability.'
    );

    this.awardsTool = wrapAgentAsTool(
      awardsAgent,
      'awards-agent-v18',
      'Analyzes 127 awards database and recommends top 5 strategic matches using TYPE-023 (Award Arbitrage).'
    );

    this.ecsTool = wrapAgentAsTool(
      ecsAgent,
      'extracurriculars-agent-v18',
      'Audits extracurricular portfolio and classifies activities into tiers (T1-T4) using TYPE-013 (EC Portfolio Optimization).'
    );

    this.scholarshipsTool = wrapAgentAsTool(
      scholarshipsAgent,
      'scholarships-agent-v21',
      'Recommends scholarships based on student profile, timeline, and eligibility criteria.'
    );

    log.event('langgraph.tools_initialized', {
      tools: ['assessment', 'gameplan', 'execution', 'awards', 'ecs', 'scholarships']
    });
  }

  /**
   * V2: Initialize Collaboration Patterns
   *
   * Creates pre-built orchestrators for common collaboration modes:
   * - DELEGATION: GamePlan → Awards + ECs (parallel)
   * - HANDOFF: Assessment → GamePlan (sequential)
   * - SEQUENTIAL: Assessment → GamePlan → Execution (pipeline)
   */
  private initializeCollaborationPatterns(): void {
    log.event('langgraph.init_patterns_start', {});

    // Pattern 1: DELEGATION (GamePlan → Awards + ECs in parallel)
    const delegationPattern = CollaborationPatterns.delegation(
      this.gameplanTool,
      this.awardsTool,
      this.ecsTool
    );
    this.delegationOrchestrator = new CollaborationOrchestrator(delegationPattern);

    // Pattern 2: HANDOFF (Assessment → GamePlan)
    const handoffPattern = CollaborationPatterns.handoff(
      this.assessmentTool,
      this.gameplanTool
    );
    this.handoffOrchestrator = new CollaborationOrchestrator(handoffPattern);

    // Pattern 3: SEQUENTIAL (Assessment → GamePlan → Execution)
    const sequentialPattern = CollaborationPatterns.sequential(
      this.assessmentTool,
      this.gameplanTool,
      this.executionTool
    );
    this.sequentialOrchestrator = new CollaborationOrchestrator(sequentialPattern);

    log.event('langgraph.patterns_initialized', {
      patterns: ['delegation', 'handoff', 'sequential']
    });
  }

  /**
   * Build LangGraph workflow (V1: Simple routing)
   *
   * V1 Strategy: Same routing logic as existing v30 system
   * Just proves the infrastructure works before adding async features
   */
  private buildWorkflowGraph(): void {
    log.event('langgraph.build_graph_start', { version: 'v1_simple_routing' });

    const workflow = new StateGraph<WorkflowState>({
      channels: {
        student_id: { value: (x: string, y: string) => y, default: () => "" },
        session_id: { value: (x: string, y: string) => y, default: () => "" },
        message: { value: (x: string, y: string) => y, default: () => "" },
        current_agent: { value: (x: string, y: string) => y, default: () => "" },
        agent_response: { value: (x: string, y: string) => y, default: () => "" },
        confidence: { value: (x: number, y: number) => y, default: () => undefined },
        intelligence_triggered: { value: (x: string[], y: string[]) => y, default: () => [] },
        error: { value: (x: string, y: string) => y, default: () => undefined }
      }
    });

    // Node: Determine which agent to route to
    workflow.addNode("route_to_agent", async (state: WorkflowState) => {
      const agentId = await this.determineAgentFromSession(state.session_id);

      log.event('langgraph.route_determined', {
        session_id: state.session_id,
        current_agent: agentId
      });

      return { current_agent: agentId };
    });

    // Node: Call the appropriate agent
    workflow.addNode("call_agent", async (state: WorkflowState) => {
      const toolMap: Record<string, DynamicStructuredTool> = {
        'assessment': this.assessmentTool,
        'gameplan': this.gameplanTool,
        'execution': this.executionTool,
        'awards': this.awardsTool,
        'extracurriculars': this.ecsTool,
        'scholarships': this.scholarshipsTool
      };

      const tool = toolMap[state.current_agent];

      if (!tool) {
        log.error('langgraph.agent_not_found', {
          current_agent: state.current_agent,
          available: Object.keys(toolMap)
        });

        return {
          agent_response: 'Error: Agent not found',
          error: `Unknown agent: ${state.current_agent}`
        };
      }

      // Call agent tool
      const result = await tool.func({
        student_id: state.student_id,
        session_id: state.session_id,
        message: state.message,
        is_a2a_handover: false
      });

      // Parse result
      const parsed = parseAgentToolResult(result as string);

      // v31.3: Debug logging to trace metadata flow from agent tool
      log.event('langgraph.agent_tool_result', {
        agent: state.current_agent,
        success: parsed.success,
        duration_ms: parsed.duration_ms,
        has_metadata: !!parsed.metadata,
        metadata_keys: parsed.metadata ? Object.keys(parsed.metadata) : [],
        metadata_preview: parsed.metadata ? JSON.stringify(parsed.metadata).substring(0, 200) : 'empty'
      });

      log.event('langgraph.agent_called', {
        agent: state.current_agent,
        success: parsed.success,
        duration_ms: parsed.duration_ms
      });

      return {
        agent_response: parsed.response || parsed.error || 'No response',
        confidence: parsed.confidence,
        intelligence_triggered: parsed.intelligence_triggered || [],
        error: parsed.error,
        agent_metadata: parsed.metadata || {} // v31.3: Preserve agent's metadata (includes data_collected_so_far)
      };
    });

    // Define workflow edges
    workflow.addEdge(START, "route_to_agent");
    workflow.addEdge("route_to_agent", "call_agent");
    workflow.addEdge("call_agent", END);

    // Compile workflow
    const compileOptions = this.checkpointer
      ? { checkpointer: this.checkpointer }
      : {};

    this.app = workflow.compile(compileOptions);

    log.event('langgraph.graph_built', {
      version: 'v1_simple',
      nodes: ['route_to_agent', 'call_agent'],
      checkpointing: !!this.checkpointer
    });
  }

  /**
   * Handle incoming message using LangGraph orchestration
   * This is the main entry point (replaces existing routing)
   */
  async handleMessage(request: {
    student_id: string;
    session_id: string;
    message: string;
  }): Promise<{
    response: string;
    confidence?: number;
    intelligence_triggered?: string[];
    duration_ms: number;
    metadata?: any;
  }> {
    const startTime = Date.now();

    log.event('langgraph.handle_message_start', {
      student_id: request.student_id,
      session_id: request.session_id,
      message_length: request.message.length
    });

    try {
      // Initial state
      const initialState: Partial<WorkflowState> = {
        student_id: request.student_id,
        session_id: request.session_id,
        message: request.message
      };

      // Execution config
      const config = this.checkpointer ? {
        configurable: {
          thread_id: request.session_id,
          checkpoint_ns: "v31_production"
        }
      } : {};

      // Execute workflow
      let finalState: WorkflowState | null = null;

      for await (const event of await this.app.stream(initialState, config)) {
        // Extract final state
        if (event.call_agent) {
          finalState = event.call_agent;
        }
      }

      if (!finalState || !finalState.agent_response) {
        throw new Error('Workflow did not produce final state');
      }

      const duration = Date.now() - startTime;

      log.event('langgraph.handle_message_success', {
        student_id: request.student_id,
        session_id: request.session_id,
        duration_ms: duration,
        agent_used: finalState.current_agent,
        confidence: finalState.confidence
      });

      // v31.3: Debug logging to trace metadata flow
      log.event('langgraph.final_state_metadata', {
        has_agent_metadata: !!finalState.agent_metadata,
        agent_metadata_keys: finalState.agent_metadata ? Object.keys(finalState.agent_metadata) : [],
        agent_metadata_preview: finalState.agent_metadata ? JSON.stringify(finalState.agent_metadata).substring(0, 200) : 'empty'
      });

      return {
        response: finalState.agent_response,
        confidence: finalState.confidence,
        intelligence_triggered: finalState.intelligence_triggered || [],
        duration_ms: duration,
        metadata: {
          orchestration: 'langgraph',
          version: 'v31.0',
          agent: finalState.current_agent,
          checkpointing: !!this.checkpointer,
          // v31.3: Include agent's metadata (with data_collected_so_far)
          ...finalState.agent_metadata
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      log.error('langgraph.handle_message_error', {
        student_id: request.student_id,
        session_id: request.session_id,
        error: String(error),
        duration_ms: duration
      });

      throw error;
    }
  }

  /**
   * V2: Execute using Collaboration Pattern
   *
   * Determines which collaboration pattern to use based on context
   * and executes the appropriate workflow
   */
  async executeCollaborationPattern(request: {
    student_id: string;
    session_id: string;
    message: string;
    pattern?: 'delegation' | 'handoff' | 'sequential';
  }): Promise<{
    response: string;
    confidence?: number;
    intelligence_triggered?: string[];
    duration_ms: number;
    metadata?: any;
  }> {
    const startTime = Date.now();

    log.event('langgraph.execute_pattern_start', {
      pattern: request.pattern || 'auto',
      session_id: request.session_id
    });

    // Determine which pattern to use
    let orchestrator: CollaborationOrchestrator | null = null;

    if (request.pattern === 'delegation') {
      orchestrator = this.delegationOrchestrator;
    } else if (request.pattern === 'handoff') {
      orchestrator = this.handoffOrchestrator;
    } else if (request.pattern === 'sequential') {
      orchestrator = this.sequentialOrchestrator;
    } else {
      // Auto-detect based on session state
      const currentAgent = await this.determineAgentFromSession(request.session_id);

      if (currentAgent === 'gameplan') {
        // GamePlan usually delegates
        orchestrator = this.delegationOrchestrator;
      } else if (currentAgent === 'assessment') {
        // Assessment usually hands off
        orchestrator = this.handoffOrchestrator;
      }
    }

    if (!orchestrator) {
      throw new Error('No suitable collaboration pattern found');
    }

    // Execute collaboration workflow
    const result = await orchestrator.execute({
      student_id: request.student_id,
      session_id: request.session_id,
      message: request.message
    });

    const duration = Date.now() - startTime;

    // Extract response from collaboration state
    const response = result.aggregated_response ||
                    result.agent_responses[result.current_agent]?.response ||
                    'No response generated';

    return {
      response,
      confidence: result.confidence,
      intelligence_triggered: result.intelligence_triggered,
      duration_ms: duration,
      metadata: {
        orchestration: 'langgraph_collaboration',
        collaboration_mode: result.collaboration_mode,
        workflow_step: result.workflow_step,
        agents_executed: Object.keys(result.agent_responses)
      }
    };
  }

  /**
   * Determine which agent to use based on session state
   * Same logic as existing v30 system
   */
  private async determineAgentFromSession(sessionId: string): Promise<string> {
    try {
      const session = await this.pool.query(`
        SELECT current_phase, current_agent
        FROM multiagent_sessions
        WHERE id = $1
      `, [sessionId]);

      if (session.rows.length === 0) {
        // New session - default to assessment
        return 'assessment';
      }

      // Map current_agent to tool name
      const currentAgent = session.rows[0].current_agent;
      const agentMap: Record<string, string> = {
        'assessment-agent-v18': 'assessment',
        'gameplan-agent-v18': 'gameplan',
        'execution-agent-v20': 'execution',
        'awards-agent-v18': 'awards',
        'extracurriculars-agent-v18': 'extracurriculars',
        'scholarships-agent-v21': 'scholarships'
      };

      return agentMap[currentAgent] || 'assessment';

    } catch (error) {
      log.error('langgraph.determine_agent_error', {
        session_id: sessionId,
        error: String(error),
        fallback: 'assessment'
      });

      return 'assessment';
    }
  }
}

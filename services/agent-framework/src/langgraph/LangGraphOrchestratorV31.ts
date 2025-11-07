/**
 * LangGraph Orchestrator v31.4 - Production-Grade Multi-Agent Coordination
 *
 * Purpose: Clean, single-path orchestration for all multi-agent interactions
 *
 * Key Design Principles:
 * 1. NO changes to agents or intelligence types
 * 2. NO changes to database schema or fact tables
 * 3. State managed by LangGraph + Redis checkpointing
 * 4. Memory persists across conversation turns
 * 5. Facts accumulate across all agents
 * 6. Deep logging and tracing by design
 *
 * Architecture:
 * - StateGraph workflow with conditional routing
 * - Redis-backed checkpointing for state persistence
 * - Agents wrapped as tools (zero changes to agent code)
 * - Full LangSmith tracing for observability
 *
 * Created: 2025-11-04 (v31.4)
 */

import { StateGraph, END, START } from "@langchain/langgraph";
import { RedisSaver } from "@langchain/langgraph-checkpoint-redis";
import { DynamicStructuredTool } from "@langchain/core/tools";
import Redis from "ioredis";
import { Pool } from "pg";
import { FactStore } from "../facts/FactStore.js";
import { WorkflowState, StateChannels, createInitialState } from "./state.js";
import { wrapAgentAsTool, parseAgentToolResult } from "./AgentToolWrapper.js";
import { createLogger } from "../../../../packages/observability/dist/unified-logger.js";

// Import existing agents (UNCHANGED implementations)
import { AssessmentAgentV3ConversationalRealtime } from "../agents/v18/AssessmentAgentV3ConversationalRealtime.js";
import { GamePlanAgentV3 } from "../agents/v18/GamePlanAgentV3.js";
import { ExecutionAgent } from "../agents/v18/ExecutionAgent.js";
import { AwardsAgentRefactored } from "../agents/v18/AwardsAgentRefactored.js";
import { ExtracurricularsAgentRefactored } from "../agents/v18/ExtracurricularsAgentRefactored.js";
import { ScholarshipsAgent } from "../agents/v18/ScholarshipsAgent.js";

const log = createLogger('langgraph-orchestrator-v31');

/**
 * LangGraph Orchestrator v31.4
 *
 * Single orchestration path for all multi-agent interactions
 */
export class LangGraphOrchestratorV31 {
  private pool: Pool;
  private factStore: FactStore;
  private checkpointer: RedisSaver | null = null;
  private app: any;  // Compiled LangGraph app
  private tools: Map<string, DynamicStructuredTool> = new Map();

  constructor(pool: Pool, factStore: FactStore, redisUrl?: string) {
    this.pool = pool;
    this.factStore = factStore;

    // Initialize Redis checkpointer if URL provided
    if (redisUrl) {
      try {
        const redis = new Redis(redisUrl);
        this.checkpointer = new RedisSaver(redis);
        log.event('redis.initialized', { redis_url: redisUrl });
      } catch (error) {
        log.error('redis.init_failed', {
          error: String(error),
          fallback: 'stateless_mode'
        });
        // Continue without checkpointing (stateless mode)
      }
    }

    // Initialize agent tools
    this.initializeAgentTools();

    // Build workflow graph
    this.buildWorkflow();

    log.event('orchestrator.initialized', {
      agents_count: this.tools.size,
      checkpointing_enabled: !!this.checkpointer
    });
  }

  /**
   * Initialize all agent tools
   * Wraps existing agents as LangGraph tools (zero changes to agent code)
   */
  private initializeAgentTools(): void {
    log.event('tools.init_start', {});

    // Create existing agents (UNCHANGED implementations)
    const assessmentAgent = new AssessmentAgentV3ConversationalRealtime(this.factStore, this.pool);
    const gameplanAgent = new GamePlanAgentV3(this.factStore, this.pool);
    const executionAgent = new ExecutionAgent(this.factStore);
    const awardsAgent = new AwardsAgentRefactored(this.factStore);
    const ecsAgent = new ExtracurricularsAgentRefactored(this.factStore);
    const scholarshipsAgent = new ScholarshipsAgent(this.factStore);

    // Wrap as LangGraph tools
    this.tools.set('assessment-agent-v18', wrapAgentAsTool(
      assessmentAgent,
      'assessment-agent-v18',
      'Runs 4-phase systematic assessment using TYPE-080 intelligence. Collects student profile, activities, awards, and identifies gaps.'
    ));

    this.tools.set('gameplan-agent-v18', wrapAgentAsTool(
      gameplanAgent,
      'gameplan-agent-v18',
      'Creates strategic 4-year roadmap using TYPE-081 intelligence. Coordinates with specialist agents for opportunities.'
    ));

    this.tools.set('execution-agent', wrapAgentAsTool(
      executionAgent,
      'execution-agent',
      'Generates weekly execution plans using TYPE-049-063 intelligence. Implements 168-hour framework.'
    ));

    this.tools.set('awards-agent-v18', wrapAgentAsTool(
      awardsAgent,
      'awards-agent-v18',
      'Finds and recommends award opportunities matched to student profile.'
    ));

    this.tools.set('extracurriculars-agent-v18', wrapAgentAsTool(
      ecsAgent,
      'extracurriculars-agent-v18',
      'Finds and recommends extracurricular activities and programs.'
    ));

    this.tools.set('scholarships-agent', wrapAgentAsTool(
      scholarshipsAgent,
      'scholarships-agent',
      'Finds and recommends scholarship opportunities.'
    ));

    log.event('tools.init_complete', {
      tools_count: this.tools.size,
      tool_names: Array.from(this.tools.keys())
    });
  }

  /**
   * Build LangGraph workflow
   * Defines nodes and edges for multi-agent coordination
   */
  private buildWorkflow(): void {
    log.event('workflow.build_start', {});

    const workflow = new StateGraph<WorkflowState>({
      channels: StateChannels
    });

    // ========================================================================
    // NODE 1: Load State
    // Load conversation history and collected facts from database
    // ========================================================================
    workflow.addNode("load_state", async (state: WorkflowState) => {
      log.event('node.load_state.start', {
        session_id: state.session_id,
        student_id: state.student_id
      });

      // Load conversation history from database if not in state
      if (!state.conversation_history || state.conversation_history.length === 0) {
        log.event('node.load_state.loading_history', { session_id: state.session_id });

        const messages = await this.pool.query(`
          SELECT role, content, timestamp, agent_id, metadata
          FROM multiagent_messages
          WHERE session_id = $1
          ORDER BY timestamp ASC
        `, [state.session_id]);

        if (messages.rows.length > 0) {
          state.conversation_history = messages.rows.map(row => ({
            role: row.role,
            content: row.content,
            timestamp: new Date(row.timestamp),
            agent_id: row.agent_id,
            metadata: row.metadata
          }));

          log.event('node.load_state.history_loaded', {
            session_id: state.session_id,
            messages_count: state.conversation_history.length
          });
        }
      }

      // Load collected facts from kb_items (cumulative across all agents)
      if (!state.collected_facts || Object.keys(state.collected_facts).length === 0) {
        log.event('node.load_state.loading_facts', { student_id: state.student_id });

        const facts = await this.pool.query(`
          SELECT edges FROM kb_items
          WHERE student_id = $1
            AND source_ref = 'gpt4o_conversational_extraction_v28'
        `, [state.student_id]);

        if (facts.rows.length > 0) {
          // Merge all fact edges into single object
          state.collected_facts = facts.rows.reduce((acc, row) => {
            return { ...acc, ...row.edges };
          }, {});

          log.event('node.load_state.facts_loaded', {
            student_id: state.student_id,
            facts_keys: Object.keys(state.collected_facts),
            facts_count: facts.rows.length
          });
        }
      }

      log.event('node.load_state.complete', {
        session_id: state.session_id,
        history_messages: state.conversation_history.length,
        facts_keys_count: Object.keys(state.collected_facts || {}).length
      });

      return state;
    });

    // ========================================================================
    // NODE 2: Call Agent
    // Call the current agent with full context (memory + facts)
    // ========================================================================
    workflow.addNode("call_agent", async (state: WorkflowState) => {
      const currentAgent = state.agent_context.current_agent;
      const tool = this.tools.get(currentAgent);

      if (!tool) {
        log.error('node.call_agent.agent_not_found', {
          agent: currentAgent,
          available_agents: Array.from(this.tools.keys())
        });
        return {
          error: `Agent not found: ${currentAgent}`,
          current_response: `Error: Agent ${currentAgent} not available`
        };
      }

      const lastMessage = state.conversation_history[state.conversation_history.length - 1];

      log.event('node.call_agent.start', {
        agent: currentAgent,
        student_id: state.student_id,  // v31.4: DEBUG - Verify student_id in state
        session_id: state.session_id,  // v31.4: DEBUG - Verify session_id in state
        message_length: lastMessage.content.length,
        history_length: state.conversation_history.length,
        collected_facts_keys: Object.keys(state.collected_facts || {})
      });

      try {
        // Call agent tool with FULL context
        console.log('[V31.4_WORKFLOW] About to call tool.func():', {
          tool_name: tool.name,
          student_id: state.student_id,
          session_id: state.session_id,
          message_preview: lastMessage.content.substring(0, 50)
        });

        const result = await tool.func({
          student_id: state.student_id,
          session_id: state.session_id,
          message: lastMessage.content,

          // v31.4: Pass memory and state
          conversation_history: state.conversation_history,
          collected_facts: state.collected_facts,
          agent_context: state.agent_context,
          is_delegation: false
        });

        console.log('[V31.4_WORKFLOW] tool.func() returned:', {
          result_type: typeof result,
          result_preview: typeof result === 'string' ? result.substring(0, 100) : String(result).substring(0, 100)
        });

        const parsed = parseAgentToolResult(result as string);

        console.log('[V31.4_WORKFLOW] Parsed result:', {
          success: parsed.success,
          has_response: !!parsed.response,
          response_preview: parsed.response?.substring(0, 50),
          error: parsed.error
        });

        log.event('node.call_agent.complete', {
          agent: currentAgent,
          success: parsed.success,
          response_length: parsed.response?.length || 0,
          intelligence_count: parsed.intelligence_triggered?.length || 0,
          has_metadata: !!parsed.metadata,
          metadata_keys: parsed.metadata ? Object.keys(parsed.metadata) : []
        });

        if (!parsed.success) {
          return {
            error: parsed.error || 'Agent call failed',
            current_response: 'I apologize, but I encountered an error. Please try again.'
          };
        }

        // Extract new facts from this turn (from metadata.data_collected_so_far)
        const newFacts = parsed.metadata?.data_collected_so_far || {};

        log.event('node.call_agent.facts_extracted', {
          agent: currentAgent,
          new_facts_keys: Object.keys(newFacts),
          new_facts_count: Object.keys(newFacts).length
        });

        // Update assessment progress if Assessment Agent
        let assessmentProgress = state.agent_context.assessment_progress;
        if (currentAgent === 'assessment-agent-v18' && parsed.metadata?.current_phase) {
          const phaseComplete = parsed.metadata.current_phase;
          assessmentProgress = phaseComplete / 4.0;  // 4 phases total

          log.event('node.call_agent.assessment_progress', {
            phase: phaseComplete,
            progress: assessmentProgress
          });
        }

        return {
          current_response: parsed.response,
          current_metadata: parsed.metadata,
          current_intelligence_triggered: parsed.intelligence_triggered,
          current_confidence: parsed.confidence,

          // Merge new facts with existing (cumulative)
          collected_facts: { ...state.collected_facts, ...newFacts },

          // Update agent context
          agent_context: {
            ...state.agent_context,
            assessment_progress: assessmentProgress
          },

          // Append agent response to conversation history
          conversation_history: [{
            role: 'agent' as const,
            content: parsed.response || '',
            timestamp: new Date(),
            agent_id: currentAgent,
            metadata: parsed.metadata
          }]
        };

      } catch (error) {
        log.error('node.call_agent.error', {
          agent: currentAgent,
          error: String(error)
        });

        return {
          error: String(error),
          current_response: 'I apologize, but I encountered an error processing your message. Please try again.'
        };
      }
    });

    // ========================================================================
    // Workflow Edges
    // ========================================================================
    workflow.addEdge(START, "load_state");
    workflow.addEdge("load_state", "call_agent");
    workflow.addEdge("call_agent", END);

    // Compile workflow with checkpointing
    this.app = this.checkpointer
      ? workflow.compile({ checkpointer: this.checkpointer })
      : workflow.compile();

    log.event('workflow.build_complete', {
      checkpointing_enabled: !!this.checkpointer
    });
  }

  /**
   * Handle incoming message
   * Main entry point for all multi-agent interactions
   */
  async handleMessage(request: {
    student_id: string;
    session_id: string;
    message: string;
  }): Promise<any> {
    const startTime = Date.now();

    console.log('[V31.4_ORCHESTRATOR] handleMessage() called:', {
      student_id: request.student_id,
      session_id: request.session_id,
      message_preview: request.message.substring(0, 50)
    });

    log.event('orchestrator.handle_message.start', {
      student_id: request.student_id,
      session_id: request.session_id,
      message_length: request.message.length
    });

    try {
      // Configuration for checkpointing
      const config = this.checkpointer ? {
        configurable: {
          thread_id: request.session_id,
          checkpoint_ns: "production"
        }
      } : undefined;

      // Prepare initial state
      const initialState = {
        ...createInitialState(request.student_id, request.session_id),
        conversation_history: [{
          role: 'user' as const,
          content: request.message,
          timestamp: new Date()
        }]
      };

      console.log('[V31.4_ORCHESTRATOR] initialState created:', {
        student_id: initialState.student_id,
        session_id: initialState.session_id,
        has_agent_context: !!initialState.agent_context,
        current_agent: initialState.agent_context?.current_agent
      });

      // Execute workflow
      const result = await this.app.invoke(initialState, config);

      const duration = Date.now() - startTime;

      log.event('orchestrator.handle_message.complete', {
        session_id: request.session_id,
        duration_ms: duration,
        success: !result.error,
        intelligence_count: result.current_intelligence_triggered?.length || 0
      });

      return {
        ...result,
        duration_ms: duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      log.error('orchestrator.handle_message.error', {
        session_id: request.session_id,
        error: String(error),
        duration_ms: duration
      });

      throw error;
    }
  }
}

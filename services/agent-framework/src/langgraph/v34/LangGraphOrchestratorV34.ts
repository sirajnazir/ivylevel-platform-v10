/**
 * LangGraph Orchestrator v34.0 - Universal Multi-Agent Orchestration
 *
 * Purpose: Universal orchestration with clean separation of concerns
 *
 * Key Design Principles (v34.0):
 * 1. Agents return signals (completion hints), orchestrator makes routing decisions
 * 2. Decision engines centralize handover, delegation, escalation logic
 * 3. Backward compatible with v26 metadata (fallback during migration)
 * 4. Frontend-compatible (MultiAgents Tab 2.0 expects specific format)
 * 5. Zero breaking changes for intelligence types (46 types unchanged)
 *
 * Architecture Evolution:
 * - v31.4: Basic workflow (load_state → call_agent → END)
 * - v34.0: Full orchestration (+ extract_signals → check_handover → check_delegation → check_escalation)
 *
 * Created: 2025-11-05 (v34.0)
 */

import { StateGraph, END, START } from "@langchain/langgraph";
import { RedisSaver } from "@langchain/langgraph-checkpoint-redis";
import { DynamicStructuredTool } from "@langchain/core/tools";
import Redis from "ioredis";
import { Pool } from "pg";
import { FactStore } from "../../facts/FactStore.js";
import { WorkflowState, StateChannels, createInitialState } from "../state.js";
import { wrapAgentAsTool, parseAgentToolResult } from "../AgentToolWrapper.js";
import { createLogger } from "../../../../../packages/observability/dist/unified-logger.js";

// v34.0: Decision engines
import { HandoverDecisionEngine } from "./HandoverDecisionEngine.js";
import { DelegationDecisionEngine } from "./DelegationDecisionEngine.js";
import { EscalationDecisionEngine } from "./EscalationDecisionEngine.js";

// v34.0: Types
import {
  AgentCompletionSignals,
  HandoverDecision,
  DelegationDecision,
  EscalationDecision,
  FrontendA2AHandover,
  FrontendDelegationMetadata,
  FrontendOrchestratorResponse,
  V26MetadataConvention,
  SignalExtractionResult
} from "./types.js";

// Import existing agents (UNCHANGED implementations)
import { AssessmentAgentV3ConversationalRealtime } from "../../agents/v18/AssessmentAgentV3ConversationalRealtime.js";
import { GamePlanAgentV3 } from "../../agents/v18/GamePlanAgentV3.js";
import { ExecutionAgent } from "../../agents/v18/ExecutionAgent.js";
import { AwardsAgentRefactored } from "../../agents/v18/AwardsAgentRefactored.js";
import { ExtracurricularsAgentRefactored } from "../../agents/v18/ExtracurricularsAgentRefactored.js";
import { ScholarshipsAgent } from "../../agents/v18/ScholarshipsAgent.js";

const log = createLogger('langgraph-orchestrator-v34');

// Node names (for TypeScript edge safety)
const NODE_LOAD_STATE = "load_state" as const;
const NODE_CALL_AGENT = "call_agent" as const;
const NODE_EXTRACT_SIGNALS = "extract_signals" as const;
const NODE_CHECK_ESCALATION = "check_escalation" as const;
const NODE_CHECK_DELEGATION = "check_delegation" as const;
const NODE_CHECK_HANDOVER = "check_handover" as const;
const NODE_EXECUTE_HANDOVER = "execute_handover" as const;

/**
 * LangGraph Orchestrator v34.0
 *
 * Universal orchestration with decision engines
 */
export class LangGraphOrchestratorV34 {
  private pool: Pool;
  private factStore: FactStore;
  private checkpointer: RedisSaver | null = null;
  private app: any;  // Compiled LangGraph app
  private tools: Map<string, DynamicStructuredTool> = new Map();

  // v34.0: Decision engines
  private handoverEngine: HandoverDecisionEngine;
  private delegationEngine: DelegationDecisionEngine;
  private escalationEngine: EscalationDecisionEngine;

  constructor(pool: Pool, factStore: FactStore, redisUrl?: string) {
    this.pool = pool;
    this.factStore = factStore;

    // Initialize decision engines
    this.handoverEngine = new HandoverDecisionEngine();
    this.delegationEngine = new DelegationDecisionEngine();
    this.escalationEngine = new EscalationDecisionEngine();

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
      }
    }

    // Initialize agent tools
    this.initializeAgentTools();

    // Build workflow graph
    this.buildWorkflow();

    log.event('orchestrator.initialized', {
      version: 'v34.0',
      agents_count: this.tools.size,
      checkpointing_enabled: !!this.checkpointer,
      decision_engines: ['handover', 'delegation', 'escalation']
    });
  }

  /**
   * Initialize all agent tools
   * Wraps existing agents as LangGraph tools (zero changes to agent code)
   */
  private initializeAgentTools(): void {
    log.event('tools.init_start', {});

    const assessmentAgent = new AssessmentAgentV3ConversationalRealtime(this.factStore, this.pool);
    const gameplanAgent = new GamePlanAgentV3(this.factStore, this.pool);
    const executionAgent = new ExecutionAgent(this.factStore);
    const awardsAgent = new AwardsAgentRefactored(this.factStore);
    const ecsAgent = new ExtracurricularsAgentRefactored(this.factStore);
    const scholarshipsAgent = new ScholarshipsAgent(this.factStore);

    this.tools.set('assessment-agent-v18', wrapAgentAsTool(
      assessmentAgent,
      'assessment-agent-v18',
      'Runs 4-phase systematic assessment using TYPE-080 intelligence.'
    ));

    this.tools.set('gameplan-agent-v18', wrapAgentAsTool(
      gameplanAgent,
      'gameplan-agent-v18',
      'Creates strategic 4-year roadmap using TYPE-081 intelligence.'
    ));

    this.tools.set('execution-agent', wrapAgentAsTool(
      executionAgent,
      'execution-agent',
      'Generates weekly execution plans using TYPE-049-063 intelligence.'
    ));

    this.tools.set('awards-agent-v18', wrapAgentAsTool(
      awardsAgent,
      'awards-agent-v18',
      'Finds and recommends award opportunities.'
    ));

    this.tools.set('extracurriculars-agent-v18', wrapAgentAsTool(
      ecsAgent,
      'extracurriculars-agent-v18',
      'Finds and recommends extracurricular activities.'
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
   * Build LangGraph workflow (v34.0)
   *
   * Workflow: load_state → call_agent → extract_signals → check_escalation
   *           → check_delegation → execute_delegation → check_handover
   *           → execute_handover → format_response → END
   */
  private buildWorkflow(): void {
    log.event('workflow.build_start', { version: 'v34.0' });

    const workflow = new StateGraph<WorkflowState>({
      channels: StateChannels
    });

    // ========================================================================
    // NODE 1: Load State (from v31.4, UNCHANGED)
    // ========================================================================
    workflow.addNode(NODE_LOAD_STATE, async (state: WorkflowState) => {
      try {
        log.event('node.load_state.start', {
          session_id: state.session_id,
          student_id: state.student_id
        });

        // Load conversation history if not in state
        if (!state.conversation_history || state.conversation_history.length === 0) {
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
              messages_count: state.conversation_history.length
            });
          }
        }

        // Load collected facts
        if (!state.collected_facts || Object.keys(state.collected_facts).length === 0) {
          const facts = await this.pool.query(`
            SELECT edges FROM kb_items
            WHERE student_id = $1
              AND source_ref = 'gpt4o_conversational_extraction_v28'
          `, [state.student_id]);

          if (facts.rows.length > 0) {
            state.collected_facts = facts.rows.reduce((acc, row) => {
              return { ...acc, ...row.edges };
            }, {});

            log.event('node.load_state.facts_loaded', {
              facts_count: facts.rows.length
            });
          }
        }

        log.event('node.load_state.complete', {
          history_messages: state.conversation_history?.length || 0,
          facts_keys_count: Object.keys(state.collected_facts || {}).length
        });

        return state;

      } catch (error) {
        log.error('node.load_state.error', {
          session_id: state.session_id,
          error: String(error),
          stack: error instanceof Error ? error.stack : undefined
        });

        // Return state with error flag (don't throw - let workflow continue)
        return {
          ...state,
          agent_context: {
            ...state.agent_context,
            execution_error: true
          },
          current_metadata: {
            error: 'load_state_failed',
            error_message: error instanceof Error ? error.message : String(error)
          }
        };
      }
    });

    // ========================================================================
    // NODE 2: Call Agent (from v31.4, UNCHANGED)
    // ========================================================================
    workflow.addNode(NODE_CALL_AGENT, async (state: WorkflowState) => {
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
        student_id: state.student_id,
        session_id: state.session_id,
        message_length: lastMessage.content.length
      });

      try {
        const result = await tool.func({
          student_id: state.student_id,
          session_id: state.session_id,
          message: lastMessage.content,
          conversation_history: state.conversation_history,
          collected_facts: state.collected_facts,
          agent_context: state.agent_context,
          is_delegation: false
        });

        const parsed = parseAgentToolResult(result as string);

        if (!parsed.success) {
          return {
            error: parsed.error || 'Agent call failed',
            current_response: 'I apologize, but I encountered an error. Please try again.'
          };
        }

        const newFacts = parsed.metadata?.data_collected_so_far || {};

        // Update assessment progress if Assessment Agent
        let assessmentProgress = state.agent_context.assessment_progress;
        if (currentAgent === 'assessment-agent-v18' && parsed.metadata?.current_phase) {
          assessmentProgress = parsed.metadata.current_phase / 4.0;
        }

        return {
          current_response: parsed.response,
          current_metadata: parsed.metadata,
          current_intelligence_triggered: parsed.intelligence_triggered,
          current_confidence: parsed.confidence,
          collected_facts: { ...state.collected_facts, ...newFacts },
          agent_context: {
            ...state.agent_context,
            assessment_progress: assessmentProgress
          },
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
          current_response: 'I apologize, but I encountered an error. Please try again.'
        };
      }
    });

    // ========================================================================
    // NODE 3: Extract Signals (v34.0 NEW)
    // Extract completion signals from agent response
    // Supports both v34 signals and v26 metadata fallback
    // ========================================================================
    workflow.addNode(NODE_EXTRACT_SIGNALS, async (state: WorkflowState) => {
      try {
        log.event('node.extract_signals.start', {
          agent: state.agent_context.current_agent
        });

        const extraction = this.extractSignals(state.current_metadata || {});

        log.event('node.extract_signals.complete', {
          source: extraction.source,
          phase_complete: extraction.signals.phase_complete,
          completion: extraction.signals.completion_percentage,
          confidence: extraction.signals.confidence
        });

        return {
          current_signals: extraction.signals
        };

      } catch (error) {
        log.error('node.extract_signals.error', {
          agent: state.agent_context.current_agent,
          error: String(error),
          stack: error instanceof Error ? error.stack : undefined
        });

        // Return default signals on error
        return {
          current_signals: {
            phase_complete: false,
            completion_percentage: 0,
            confidence: 0.0
          }
        };
      }
    });

    // ========================================================================
    // NODE 4: Check Escalation (v34.0 NEW)
    // ========================================================================
    workflow.addNode(NODE_CHECK_ESCALATION, async (state: WorkflowState) => {
      try {
        log.event('node.check_escalation.start', {});

        const decision = this.escalationEngine.shouldEscalate(
          state,
          state.current_signals!
        );

        if (decision.should_escalate) {
          log.event('node.check_escalation.escalate', {
            reason: decision.reason,
            type: decision.escalation_type
          });

          return {
            agent_context: {
              ...state.agent_context,
              escalation_pending: true,
              escalation_reason: decision.reason
            }
          };
        }

        log.event('node.check_escalation.no_escalation', {});
        return {};

      } catch (error) {
        log.error('node.check_escalation.error', {
          error: String(error),
          stack: error instanceof Error ? error.stack : undefined
        });

        // On error, don't escalate
        return {};
      }
    });

    // ========================================================================
    // NODE 5: Check Delegation (v34.0 NEW)
    // ========================================================================
    workflow.addNode(NODE_CHECK_DELEGATION, async (state: WorkflowState) => {
      try {
        log.event('node.check_delegation.start', {});

        const decision = this.delegationEngine.shouldDelegate(
          state,
          state.current_signals!
        );

        if (decision.should_delegate) {
          log.event('node.check_delegation.delegate', {
            target_agents: decision.target_agents,
            domains: decision.metadata?.domains_requested
          });

          return {
            agent_context: {
              ...state.agent_context,
              delegation_pending: true,
              delegation_targets: decision.target_agents
            }
          };
        }

        log.event('node.check_delegation.no_delegation', {});
        return {};

      } catch (error) {
        log.error('node.check_delegation.error', {
          error: String(error),
          stack: error instanceof Error ? error.stack : undefined
        });

        // On error, don't delegate
        return {};
      }
    });

    // ========================================================================
    // NODE 6: Check Handover (v34.0 NEW)
    // ========================================================================
    workflow.addNode(NODE_CHECK_HANDOVER, async (state: WorkflowState) => {
      try {
        log.event('node.check_handover.start', {});

        const decision = this.handoverEngine.shouldHandover(
          state,
          state.current_signals!
        );

        if (decision.should_handover) {
          log.event('node.check_handover.handover', {
            from_agent: state.agent_context.current_agent,
            to_agent: decision.next_agent,
            reason: decision.reason
          });

          return {
            agent_context: {
              ...state.agent_context,
              handover_pending: true,
              next_agent: decision.next_agent,
              handover_reason: decision.reason
            }
          };
        }

        log.event('node.check_handover.no_handover', {});
        return {};

      } catch (error) {
        log.error('node.check_handover.error', {
          error: String(error),
          stack: error instanceof Error ? error.stack : undefined
        });

        // On error, don't handover
        return {};
      }
    });

    // ========================================================================
    // NODE 7: Execute Handover (v34.0 NEW)
    // ========================================================================
    workflow.addNode(NODE_EXECUTE_HANDOVER, async (state: WorkflowState) => {
      try {
        if (!state.agent_context.handover_pending) {
          return {};
        }

        const fromAgent = state.agent_context.current_agent;
        const toAgent = state.agent_context.next_agent!;

        log.event('node.execute_handover.start', {
          from_agent: fromAgent,
          to_agent: toAgent
        });

        // Generate handover ID
        const handoverId = `h_${Date.now()}_${fromAgent}_${toAgent}`;

        // Update agent context
        return {
          agent_context: {
            ...state.agent_context,
            previous_agent: fromAgent,
            current_agent: toAgent,
            handover_pending: false,
            next_agent: undefined,
            handover_id: handoverId
          }
        };

      } catch (error) {
        log.error('node.execute_handover.error', {
          error: String(error),
          stack: error instanceof Error ? error.stack : undefined
        });

        // On error, don't execute handover
        return {
          agent_context: {
            ...state.agent_context,
            handover_pending: false
          }
        };
      }
    });

    // ========================================================================
    // Workflow Edges (v34.0)
    // ========================================================================
    workflow.addEdge(START, NODE_LOAD_STATE);
    workflow.addEdge(NODE_LOAD_STATE, NODE_CALL_AGENT);
    workflow.addEdge(NODE_CALL_AGENT, NODE_EXTRACT_SIGNALS);
    workflow.addEdge(NODE_EXTRACT_SIGNALS, NODE_CHECK_ESCALATION);
    workflow.addEdge(NODE_CHECK_ESCALATION, NODE_CHECK_DELEGATION);
    workflow.addEdge(NODE_CHECK_DELEGATION, NODE_CHECK_HANDOVER);
    workflow.addEdge(NODE_CHECK_HANDOVER, NODE_EXECUTE_HANDOVER);
    workflow.addEdge(NODE_EXECUTE_HANDOVER, END);

    // Compile workflow
    this.app = this.checkpointer
      ? workflow.compile({ checkpointer: this.checkpointer })
      : workflow.compile();

    log.event('workflow.build_complete', {
      version: 'v34.0',
      checkpointing_enabled: !!this.checkpointer
    });
  }

  /**
   * Extract signals from agent response
   *
   * v34.0: Supports both new signal format and v26 metadata fallback
   * TODO v35.0: Remove v26 fallback after migration complete
   */
  private extractSignals(metadata: Record<string, any>): SignalExtractionResult {
    // Check for v34 signals first (new format)
    if (metadata.signals) {
      log.event('signals.extracted_v34', {
        phase_complete: metadata.signals.phase_complete
      });

      return {
        signals: metadata.signals,
        source: 'v34_signals'
      };
    }

    // Fallback to v26 metadata (backward compatibility)
    log.event('signals.fallback_v26', {
      has_a2a_handover: !!metadata.a2a_handover_complete
    });

    const v26Metadata = metadata as V26MetadataConvention;

    return {
      signals: {
        phase_complete: v26Metadata.a2a_handover_complete || v26Metadata.synthesis_delivered || false,
        completion_percentage: v26Metadata.overall_completion || 0,
        confidence: 0.8,  // Default for v26 agents
        suggested_next_phase: v26Metadata.next_step as any,
        requires_delegation: this.extractV26Delegation(v26Metadata),
        needs_human_escalation: v26Metadata.escalate_to_human
      },
      source: 'v26_metadata_fallback',
      raw_metadata: v26Metadata
    };
  }

  /**
   * Extract delegation requests from v26 metadata flags
   */
  private extractV26Delegation(metadata: V26MetadataConvention): any[] | undefined {
    const requests: any[] = [];

    if (metadata.needs_awards_consultation) {
      requests.push({ domain: 'awards', reason: 'v26 flag', context: {} });
    }
    if (metadata.needs_ec_consultation) {
      requests.push({ domain: 'extracurriculars', reason: 'v26 flag', context: {} });
    }
    if (metadata.needs_programs_consultation) {
      requests.push({ domain: 'programs', reason: 'v26 flag', context: {} });
    }

    return requests.length > 0 ? requests : undefined;
  }

  /**
   * Handle incoming message (v34.0)
   * Main entry point for all multi-agent interactions
   * Layer 2 Defense: Input validation + timeout + undefined guards
   */
  async handleMessage(request: {
    student_id: string;
    session_id: string;
    message: string;
  }): Promise<FrontendOrchestratorResponse> {
    const startTime = Date.now();

    try {
      // ✅ Layer 2 Fix: Validate inputs
      if (!request.student_id || !request.session_id || !request.message) {
        log.error('handleMessage.invalid_input', {
          has_student_id: !!request.student_id,
          has_session_id: !!request.session_id,
          has_message: !!request.message
        });

        return this.createErrorResponse('Invalid request parameters', startTime);
      }

      log.event('orchestrator.handle_message.start', {
        version: 'v34.0',
        student_id: request.student_id,
        session_id: request.session_id,
        message_length: request.message.length
      });

      const config = this.checkpointer ? {
        configurable: {
          thread_id: request.session_id,
          checkpoint_ns: "production"
        }
      } : undefined;

      const initialState = {
        ...createInitialState(request.student_id, request.session_id),
        conversation_history: [{
          role: 'user' as const,
          content: request.message,
          timestamp: new Date()
        }]
      };

      // ✅ Layer 2 Fix: Wrap invoke with try-catch and timeout
      let result: WorkflowState | undefined;

      log.event('workflow.invoke.start', {
        session_id: request.session_id,
        student_id: request.student_id
      });

      try {
        // Add 30-second timeout protection
        result = await Promise.race([
          this.app.invoke(initialState, config),
          new Promise<undefined>((_, reject) =>
            setTimeout(() => reject(new Error('Workflow timeout after 30s')), 30000)
          )
        ]) as WorkflowState | undefined;

      } catch (invokeError) {
        log.error('workflow.invoke.failed', {
          session_id: request.session_id,
          error: String(invokeError),
          stack: invokeError instanceof Error ? invokeError.stack : undefined
        });

        return this.createErrorResponse(
          invokeError instanceof Error ? invokeError.message : 'Workflow execution failed',
          startTime
        );
      }

      // ✅ Layer 2 Fix: Check if result is undefined
      if (!result) {
        log.error('workflow.invoke.returned_undefined', {
          session_id: request.session_id,
          student_id: request.student_id
        });

        return this.createErrorResponse('Workflow returned no result', startTime);
      }

      const duration = Date.now() - startTime;

      // Log invoke result for debugging
      log.event('orchestrator.invoke.complete', {
        session_id: request.session_id,
        has_result: true,
        has_current_response: !!result.current_response,
        has_agent_context: !!result.agent_context,
        execution_error: !!result.agent_context?.execution_error,
        duration_ms: duration
      });

      // Format response for frontend (MultiAgents Tab 2.0 compatibility)
      const response = this.formatFrontendResponse(result, duration);

      log.event('orchestrator.handle_message.complete', {
        session_id: request.session_id,
        duration_ms: duration,
        had_handover: !!response.a2a_handover,
        had_delegation: !!response.metadata.delegation_started
      });

      return response;

    } catch (error) {
      const duration = Date.now() - startTime;

      log.error('orchestrator.handle_message.unexpected_error', {
        session_id: request.session_id,
        error: String(error),
        stack: error instanceof Error ? error.stack : undefined,
        duration_ms: duration
      });

      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Unknown error',
        startTime
      );
    }
  }

  /**
   * ✅ Layer 2 Helper: Create error response
   */
  private createErrorResponse(
    errorMessage: string,
    startTime: number
  ): FrontendOrchestratorResponse {
    return {
      agent_response: 'I apologize, but I encountered an error. Please try again or contact support if this persists.',
      agent_message_id: `msg_error_${Date.now()}`,
      intelligence_triggered: [],
      confidence: 0.0,
      processing_time: Date.now() - startTime,
      metadata: {
        data_collected_so_far: {},
        orchestration: 'langgraph_v34.0',
        error: true,
        error_message: errorMessage
      }
    };
  }

  /**
   * Format response for frontend (MultiAgents Tab 2.0)
   *
   * Ensures response matches UI expectations:
   * - data.a2a_handover.handover_complete
   * - data.metadata.delegation_started
   * - data.metadata.data_collected_so_far
   */
  private formatFrontendResponse(
    workflowResult: WorkflowState | undefined,
    durationMs: number
  ): FrontendOrchestratorResponse {
    // Guard: Handle undefined workflowResult
    if (!workflowResult) {
      log.error('formatFrontendResponse.null_workflow_result', {
        duration_ms: durationMs
      });

      return {
        agent_response: 'I apologize, but I encountered an error processing your message. Please try again.',
        agent_message_id: `msg_${Date.now()}`,
        intelligence_triggered: [],
        confidence: 0.0,
        processing_time: durationMs,
        metadata: {
          data_collected_so_far: {},
          orchestration: 'langgraph_v34.0',
          error: 'workflow_result_undefined'
        }
      };
    }

    const response: FrontendOrchestratorResponse = {
      agent_response: workflowResult.current_response || '',
      agent_message_id: `msg_${Date.now()}`,
      intelligence_triggered: workflowResult.current_intelligence_triggered || [],
      confidence: workflowResult.current_confidence || 0.8,
      processing_time: durationMs,

      metadata: {
        data_collected_so_far: workflowResult.collected_facts || {},
        orchestration: 'langgraph_v34.0',
        _internal_signals: workflowResult.current_signals
      }
    };

    // Add handover data if handover occurred (use optional chaining)
    if (workflowResult.agent_context?.previous_agent && workflowResult.agent_context?.handover_id) {
      response.a2a_handover = {
        handover_complete: true,
        from_agent: workflowResult.agent_context.previous_agent,
        to_agent: workflowResult.agent_context.current_agent,
        handover_id: workflowResult.agent_context.handover_id,
        new_phase: this.mapAgentToPhase(workflowResult.agent_context.current_agent),
        timestamp: new Date().toISOString()
      };
    }

    // Add delegation metadata if delegation pending (use optional chaining)
    if (workflowResult.agent_context?.delegation_pending) {
      response.metadata.delegation_started = true;
      response.metadata.delegated_to = workflowResult.agent_context.delegation_targets;
      response.metadata.delegating_agent = workflowResult.agent_context.current_agent;
    }

    return response;
  }

  /**
   * Map agent ID to phase name (for frontend)
   */
  private mapAgentToPhase(agentId: string): string {
    const phaseMap: Record<string, string> = {
      'assessment-agent-v18': 'assessment',
      'gameplan-agent-v18': 'gameplan',
      'execution-agent': 'execution'
    };

    return phaseMap[agentId] || 'unknown';
  }
}

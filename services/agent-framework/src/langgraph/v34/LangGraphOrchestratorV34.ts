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
import { HandoverDecisionEngine } from "../../handover/HandoverDecisionEngine.js";
import { HandoverLogger } from "../../handover/HandoverLogger.js";
import { DelegationDecisionEngine } from "./DelegationDecisionEngine.js";
import { EscalationDecisionEngine } from "./EscalationDecisionEngine.js";

// Universal Fact Protocol
import { UniversalFact } from "../../facts/UniversalFact.js";

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
const NODE_EXECUTE_DELEGATION = "execute_delegation" as const;
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

  // v34.0: Decision engines (handoverEngine now static, no instance needed)
  private delegationEngine: DelegationDecisionEngine;
  private escalationEngine: EscalationDecisionEngine;

  constructor(pool: Pool, factStore: FactStore, redisUrl?: string) {
    this.pool = pool;
    this.factStore = factStore;

    // Initialize HandoverLogger (creates logs directory if needed)
    HandoverLogger.initialize();

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

    // Initialize agent tools first (needed for delegation engine)
    this.initializeAgentTools();

    // ✅ Initialize decision engines (delegation needs available agents)
    // Note: HandoverDecisionEngine is now static (called via HandoverDecisionEngine.checkHandover())
    this.escalationEngine = new EscalationDecisionEngine();

    // DelegationDecisionEngine requires Set of available agent IDs for validation
    const availableAgents = new Set(Array.from(this.tools.keys()));
    this.delegationEngine = new DelegationDecisionEngine(availableAgents);

    // Build workflow graph
    try {
      console.log('[v34.0 DEBUG] About to call buildWorkflow()...');
      this.buildWorkflow();
      console.log('[v34.0 DEBUG] buildWorkflow() completed successfully!');
    } catch (buildError) {
      console.error('[v34.0 ERROR] buildWorkflow() failed:', buildError);
      console.error('[v34.0 ERROR] Stack:', buildError instanceof Error ? buildError.stack : 'No stack');
      throw buildError; // Re-throw to prevent broken orchestrator
    }

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
    // NODE 2: Call Agent (v34.1 - Delegation Feedback Support)
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

      // ✅ DELEGATION FEEDBACK TURN: Detect if this is a feedback turn
      let message: string;
      let isDelegationFeedback = false;

      if (state.agent_context.is_delegation_feedback_turn) {
        // This is a delegation feedback turn - construct message with findings
        isDelegationFeedback = true;

        const findingsSummary = Object.keys(state.agent_context.specialist_findings || {})
          .map(specialist => {
            const finding = state.agent_context.specialist_findings![specialist];
            if (finding.error) {
              return `${specialist}: [ERROR] ${finding.error}`;
            }
            const preview = finding.response?.substring(0, 200) || 'No response';
            return `${specialist}: ${preview}${finding.response && finding.response.length > 200 ? '...' : ''}`;
          })
          .join('\n\n');

        message = `[Specialist Consultation Results]\n\n${findingsSummary}\n\n` +
                  `Please synthesize these findings into your game plan.`;

        log.event('call_agent.delegation_feedback', {
          agent: currentAgent,
          specialists_count: Object.keys(state.agent_context.specialist_findings || {}).length,
          message_length: message.length
        });

      } else {
        // Normal turn - use last user message
        const lastMessage = state.conversation_history[state.conversation_history.length - 1];
        message = lastMessage.content;

        log.event('node.call_agent.start', {
          agent: currentAgent,
          student_id: state.student_id,
          session_id: state.session_id,
          message_length: message.length,
          is_delegation_feedback: false
        });
      }

      try {
        const result = await tool.func({
          student_id: state.student_id,
          session_id: state.session_id,
          message: message,
          conversation_history: state.conversation_history,
          collected_facts: state.collected_facts,
          agent_context: state.agent_context,
          is_delegation: false,
          is_delegation_feedback: isDelegationFeedback,
          specialist_findings: isDelegationFeedback ? state.agent_context.specialist_findings : undefined
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
            assessment_progress: assessmentProgress,
            // ✅ Clear delegation feedback flag after processing
            is_delegation_feedback_turn: false
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
        console.log('[v34.0 NODE_EXTRACT_SIGNALS] Extracting signals from metadata...');
        console.log('[v34.0 NODE_EXTRACT_SIGNALS] Has metadata:', !!state.current_metadata);
        console.log('[v34.0 NODE_EXTRACT_SIGNALS] Has metadata.signals:', !!state.current_metadata?.signals);

        log.event('node.extract_signals.start', {
          agent: state.agent_context.current_agent
        });

        const extraction = this.extractSignals(state.current_metadata || {});

        console.log('[v34.0 NODE_EXTRACT_SIGNALS] Extraction result:');
        console.log('[v34.0 NODE_EXTRACT_SIGNALS]   - source:', extraction.source);
        console.log('[v34.0 NODE_EXTRACT_SIGNALS]   - phase_complete:', extraction.signals.phase_complete);
        console.log('[v34.0 NODE_EXTRACT_SIGNALS]   - completion_percentage:', extraction.signals.completion_percentage);

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
        console.log('[v34.2 NODE_CHECK_ESCALATION] ✅ NODE REACHED!');
        console.log('[v34.2 NODE_CHECK_ESCALATION] Session:', state.session_id);

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
    // NODE 6: Execute Delegation (v34.0 Phase 1)
    // ========================================================================
    workflow.addNode(NODE_EXECUTE_DELEGATION, async (state: WorkflowState) => {
      try {
        // Skip if no delegation pending
        if (!state.agent_context.delegation_pending) {
          return {};
        }

        const delegatingAgent = state.agent_context.current_agent;
        const targetAgents = state.agent_context.delegation_targets || [];

        log.event('node.execute_delegation.start', {
          delegating_agent: delegatingAgent,
          target_agents: targetAgents,
          target_count: targetAgents.length
        });

        // ✅ PARALLEL EXECUTION: Call all specialists simultaneously with timeout protection
        const specialistPromises = targetAgents.map(async (targetAgent) => {
          try {
            // FIX: Property is 'this.tools' (Map), not 'this.agentTools'
            const specialistTool = this.tools.get(targetAgent);

            if (!specialistTool) {
              log.error('execute_delegation.specialist_not_found', {
                specialist: targetAgent,
                delegating_agent: delegatingAgent,
                available: Array.from(this.tools.keys())
              });

              return {
                targetAgent,
                success: false,
                error: 'Agent not registered'
              };
            }

            log.event('execute_delegation.calling_specialist', {
              specialist: targetAgent,
              delegating_agent: delegatingAgent,
              facts_count: Object.keys(state.collected_facts).length
            });

            // Call specialist with timeout protection (30 seconds)
            const result = await Promise.race([
              specialistTool.invoke({
                student_id: state.student_id,
                session_id: state.session_id,
                message: `${delegatingAgent} requests consultation on ${targetAgent.replace('-agent-v18', '')} opportunities`,
                context: {
                  delegation: true,
                  delegating_agent: delegatingAgent,
                  collected_facts: state.collected_facts,
                  // Only pass last 5 messages to reduce context size
                  conversation_history: state.conversation_history.slice(-5)
                }
              }),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Specialist timeout after 30s')), 30000)
              )
            ]);

            log.event('execute_delegation.specialist_complete', {
              specialist: targetAgent,
              has_response: !!result
            });

            return {
              targetAgent,
              success: true,
              result: result
            };

          } catch (error) {
            log.error('execute_delegation.specialist_failed', {
              specialist: targetAgent,
              error: String(error),
              stack: error instanceof Error ? error.stack : undefined
            });

            return {
              targetAgent,
              success: false,
              error: error instanceof Error ? error.message : String(error)
            };
          }
        });

        // Wait for all specialists to complete (or fail)
        const specialistResults = await Promise.all(specialistPromises);

        // Aggregate findings
        const specialistFindings: Record<string, any> = {};
        let successCount = 0;

        for (const result of specialistResults) {
          if (result.success && result.result) {
            // Parse specialist response
            const parsedResult = parseAgentToolResult(result.result);

            specialistFindings[result.targetAgent] = {
              response: parsedResult.agent_response || parsedResult.response || '',
              intelligence_triggered: parsedResult.intelligence_triggered || [],
              metadata: parsedResult.metadata || {},
              timestamp: new Date().toISOString()
            };

            successCount++;
          } else {
            // Store error but continue with other results
            specialistFindings[result.targetAgent] = {
              response: '',
              error: result.error || 'Unknown error',
              timestamp: new Date().toISOString()
            };
          }
        }

        log.event('execute_delegation.complete', {
          delegating_agent: delegatingAgent,
          total_specialists: targetAgents.length,
          successful: successCount,
          failed: targetAgents.length - successCount
        });

        // ✅ Add delegation message to conversation history (for context)
        const delegationMessage: ConversationMessage = {
          role: 'system' as const,
          content: `[DELEGATION] ${delegatingAgent} consulted specialists: ${targetAgents.join(', ')}. ${successCount} succeeded, ${targetAgents.length - successCount} failed.`,
          timestamp: new Date(),
          metadata: {
            delegation: true,
            delegating_agent: delegatingAgent,
            specialists_called: targetAgents,
            findings_count: successCount
          }
        };

        // Update state: delegation complete, store findings, mark feedback turn
        return {
          conversation_history: [...state.conversation_history, delegationMessage],
          agent_context: {
            ...state.agent_context,
            delegation_pending: false,
            delegation_complete: true,
            specialist_findings: specialistFindings,
            delegation_targets: undefined,
            // ✅ CRITICAL: Flag to differentiate feedback turn from normal turn
            is_delegation_feedback_turn: true
          },
          current_metadata: {
            ...state.current_metadata,
            delegation_complete: true,
            specialist_findings: specialistFindings
          }
        };

      } catch (error) {
        log.error('node.execute_delegation.error', {
          error: String(error),
          stack: error instanceof Error ? error.stack : undefined
        });

        // On error, mark delegation as failed but continue workflow
        return {
          agent_context: {
            ...state.agent_context,
            delegation_pending: false,
            delegation_complete: false,
            delegation_error: true
          }
        };
      }
    });

    // ========================================================================
    // NODE 7: Check Handover (v34.2 Universal Data Architecture)
    // ========================================================================
    workflow.addNode(NODE_CHECK_HANDOVER, async (state: WorkflowState) => {
      try {
        console.log('[v34.2 NODE_CHECK_HANDOVER] ✅ NODE REACHED!');
        console.log('[v34.2 NODE_CHECK_HANDOVER] Session:', state.session_id);
        console.log('[v34.2 NODE_CHECK_HANDOVER] Agent:', state.agent_context.current_agent);

        log.event('node.check_handover.start', {
          session_id: state.session_id,
          current_agent: state.agent_context.current_agent
        });

        // ========================================================================
        // HYBRID FACTS LOADING (Database + In-Memory)
        // ========================================================================

        // 1. Load facts from database (already persisted)
        console.log('[v34.2 NODE_CHECK_HANDOVER] Loading facts from database...');
        let facts = await this.loadUniversalFacts(
          state.student_id,
          state.session_id
        );
        console.log('[v34.2 NODE_CHECK_HANDOVER] Database facts loaded:', facts.length);

        log.event('handover.facts.from_database', {
          session_id: state.session_id,
          facts_count: facts.length,
          field_names: facts.map(f => f.data.metadata?.field_name)
        });

        // 2. Extract facts from current agent response (in-memory)
        console.log('[v34.2 NODE_CHECK_HANDOVER] Checking for in-memory facts...');
        console.log('[v34.2 NODE_CHECK_HANDOVER] current_metadata keys:', Object.keys(state.current_metadata || {}));
        console.log('[v34.2 NODE_CHECK_HANDOVER] Has universal_facts:', !!state.current_metadata?.universal_facts);
        console.log('[v34.2 NODE_CHECK_HANDOVER] universal_facts length:', (state.current_metadata?.universal_facts as any[])?.length || 0);

        // v34.2: Universal Facts are already in UniversalFact format!
        // Just use them directly instead of trying to extract from metadata
        if (state.current_metadata?.universal_facts && Array.isArray(state.current_metadata.universal_facts)) {
          const inMemoryFacts = state.current_metadata.universal_facts as UniversalFact[];
          console.log('[v34.2 NODE_CHECK_HANDOVER] In-memory facts extracted:', inMemoryFacts.length);

          log.event('handover.facts.from_memory', {
            session_id: state.session_id,
            facts_count: inMemoryFacts.length,
            field_names: inMemoryFacts.map(f => f.data.metadata?.field_name)
          });

          // Merge in-memory facts with database facts
          // Use Map to deduplicate by field_name (in-memory takes precedence)
          const factsMap = new Map<string, UniversalFact>();

          // Add database facts first
          console.log('[v34.2 NODE_CHECK_HANDOVER] Adding database facts to map...');
          for (const fact of facts) {
            const fieldName = fact.data.metadata?.field_name;
            console.log('[v34.2 NODE_CHECK_HANDOVER] DB fact field_name:', fieldName);
            if (fieldName) {
              factsMap.set(fieldName, fact);
            }
          }
          console.log('[v34.2 NODE_CHECK_HANDOVER] Map size after DB facts:', factsMap.size);

          // Add in-memory facts (overwrite if duplicate)
          console.log('[v34.2 NODE_CHECK_HANDOVER] Adding in-memory facts to map...');
          for (const fact of inMemoryFacts) {
            const fieldName = fact.data.metadata?.field_name;
            console.log('[v34.2 NODE_CHECK_HANDOVER] In-memory fact field_name:', fieldName);
            if (fieldName) {
              factsMap.set(fieldName, fact);
            }
          }
          console.log('[v34.2 NODE_CHECK_HANDOVER] Map size after in-memory facts:', factsMap.size);

          facts = Array.from(factsMap.values());

          log.event('handover.facts.merged', {
            session_id: state.session_id,
            total_facts: facts.length,
            field_names: Array.from(factsMap.keys())
          });
        }

        // 3. Check if we have any facts
        console.log('[v34.2 NODE_CHECK_HANDOVER] Total facts:', facts.length);
        if (facts.length === 0) {
          console.log('[v34.2 NODE_CHECK_HANDOVER] ❌ No facts - exiting early');
          log.event('handover.no_facts', {
            session_id: state.session_id,
            message: 'No facts in database or memory'
          });

          return {
            agent_context: {
              ...state.agent_context,
              handover_pending: false
            }
          };
        }

        // 4. Calculate conversation turns from conversation_history
        const conversationTurns = state.conversation_history?.length || 0;
        console.log('[v34.2 NODE_CHECK_HANDOVER] Conversation turns:', conversationTurns);

        // 5. Call Universal HandoverDecisionEngine
        console.log('[v34.2 NODE_CHECK_HANDOVER] Calling HandoverDecisionEngine.checkHandover()...');
        const decision = await HandoverDecisionEngine.checkHandover(
          state.session_id,
          state.agent_context.current_agent,
          facts,
          conversationTurns
        );
        console.log('[v34.2 NODE_CHECK_HANDOVER] Decision:', decision ? 'READY' : 'NOT_READY');

        if (!decision) {
          log.event('node.check_handover.not_ready', {
            session_id: state.session_id,
            current_agent: state.agent_context.current_agent,
            facts_count: facts.length,
            conversation_turns: conversationTurns
          });
          return {};
        }

        // Handover ready!
        log.event('node.check_handover.ready', {
          session_id: state.session_id,
          from_agent: decision.from_agent,
          to_agent: decision.to_agent,
          quality_score: decision.quality_score,
          gates_passed: `${decision.quality_gates_passed}/${decision.quality_gates_total}`
        });

        return {
          agent_context: {
            ...state.agent_context,
            handover_pending: true,
            next_agent: decision.to_agent,
            handover_reason: decision.reason
          }
        };

      } catch (error) {
        console.log('[v34.2 NODE_CHECK_HANDOVER] ❌ ERROR CAUGHT!');
        console.log('[v34.2 NODE_CHECK_HANDOVER] Error:', String(error));
        console.log('[v34.2 NODE_CHECK_HANDOVER] Stack:', error instanceof Error ? error.stack : undefined);

        log.error('node.check_handover.error', {
          error: String(error),
          stack: error instanceof Error ? error.stack : undefined
        });

        // On error, don't handover
        return {};
      }
    });

    // ========================================================================
    // NODE 8: Execute Handover (v34.2 Universal Data Architecture)
    // ========================================================================
    workflow.addNode(NODE_EXECUTE_HANDOVER, async (state: WorkflowState) => {
      try {
        if (!state.agent_context.handover_pending) {
          // No handover pending, preserve current_response
          return {
            current_response: state.current_response,
            current_metadata: state.current_metadata,
            current_signals: state.current_signals,
            current_intelligence_triggered: state.current_intelligence_triggered,
            current_confidence: state.current_confidence
          };
        }

        const fromAgent = state.agent_context.current_agent;
        const toAgent = state.agent_context.next_agent!;

        // Log handover execution start
        HandoverLogger.logHandoverExecutionStart(
          state.session_id,
          fromAgent,
          toAgent
        );

        // Generate handover ID
        const handoverId = `h_${Date.now()}_${fromAgent}_${toAgent}`;

        // Log handover execution complete (success)
        HandoverLogger.logHandoverExecutionComplete(
          state.session_id,
          fromAgent,
          toAgent,
          true
        );

        // Update agent context AND preserve current response
        return {
          current_response: state.current_response,
          current_metadata: state.current_metadata,
          current_signals: state.current_signals,
          current_intelligence_triggered: state.current_intelligence_triggered,
          current_confidence: state.current_confidence,
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
        const fromAgent = state.agent_context.current_agent;
        const toAgent = state.agent_context.next_agent || 'unknown';

        // Log handover execution complete (failure)
        HandoverLogger.logHandoverExecutionComplete(
          state.session_id,
          fromAgent,
          toAgent,
          false,
          String(error)
        );

        // On error, don't execute handover but preserve response
        return {
          current_response: state.current_response,
          current_metadata: state.current_metadata,
          current_signals: state.current_signals,
          current_intelligence_triggered: state.current_intelligence_triggered,
          current_confidence: state.current_confidence,
          agent_context: {
            ...state.agent_context,
            handover_pending: false
          }
        };
      }
    });

    // ========================================================================
    // Workflow Edges (v34.1 Phase 1 - Delegation Feedback Loop)
    // ========================================================================
    workflow.addEdge(START, NODE_LOAD_STATE);
    workflow.addEdge(NODE_LOAD_STATE, NODE_CALL_AGENT);
    workflow.addEdge(NODE_CALL_AGENT, NODE_EXTRACT_SIGNALS);
    workflow.addEdge(NODE_EXTRACT_SIGNALS, NODE_CHECK_ESCALATION);
    // v34.1 FIX: Check HANDOVER before DELEGATION
    // Assessment needs to hand over to GamePlan BEFORE GamePlan can delegate
    workflow.addEdge(NODE_CHECK_ESCALATION, NODE_CHECK_HANDOVER);
    workflow.addConditionalEdges(
      NODE_CHECK_HANDOVER,
      (state: WorkflowState) => {
        // If handover is pending, execute it
        if (state.agent_context.handover_pending) {
          return 'handover';
        }
        // Otherwise check for delegation
        return 'check_delegation';
      },
      {
        handover: NODE_EXECUTE_HANDOVER,
        check_delegation: NODE_CHECK_DELEGATION
      }
    );
    workflow.addEdge(NODE_CHECK_DELEGATION, NODE_EXECUTE_DELEGATION);

    // ✅ UNIVERSAL FIX: Delegation feedback loop
    // After delegation completes, loop back to CALL_AGENT so delegating agent
    // can process specialist findings and synthesize results
    workflow.addConditionalEdges(
      NODE_EXECUTE_DELEGATION,
      (state: WorkflowState) => {
        // If delegation completed successfully, loop back to agent with findings
        if (state.agent_context.delegation_complete) {
          return 'loop_back';
        }
        // Otherwise workflow complete (no delegation or failed)
        return 'end';
      },
      {
        loop_back: NODE_CALL_AGENT,      // Loop back with specialist findings
        end: END                          // Workflow complete
      }
    );

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
   * Load UniversalFacts from database for handover decision
   *
   * v34.2: Universal Data Architecture integration
   * Loads facts from kb_items and converts to UniversalFact protocol
   */
  private async loadUniversalFacts(
    studentId: string,
    sessionId: string
  ): Promise<UniversalFact[]> {
    try {
      // Query kb_items for v28 extracted facts
      const result = await this.pool.query(`
        SELECT edges as data
        FROM kb_items
        WHERE student_id = $1
          AND source_ref = 'gpt4o_conversational_extraction_v28'
      `, [studentId]);

      if (result.rows.length === 0) {
        log.event('load_universal_facts.no_facts', {
          student_id: studentId,
          session_id: sessionId
        });
        return [];
      }

      // Convert to UniversalFact format
      const universalFacts: UniversalFact[] = [];

      for (const row of result.rows) {
        const data = row.data;

        // v28 facts are stored in FLAT format: { grade: 11, high_school: "...", interests: [...], v28_metadata: {...} }
        // Extract each field as a separate UniversalFact
        for (const [key, value] of Object.entries(data)) {
          // Skip metadata and numeric keys (old format)
          if (key === 'v28_metadata' || key === 'metadata' || !isNaN(parseInt(key))) {
            continue;
          }

          // Skip empty values
          if (value === null || value === undefined || value === '') {
            continue;
          }

          // Skip empty arrays
          if (Array.isArray(value) && value.length === 0) {
            continue;
          }

          console.log('[loadUniversalFacts] ✅ Extracting field:', key, 'value:', value);

          // Create UniversalFact for this field
          const fact: UniversalFact = {
            fact_id: `db_${studentId}_${key}_${Date.now()}`,
            student_id: studentId,
            category: 'profile' as any,
            subcategory: key,
            schema_target: {
              primary_table: 'kb_items' as any,
              update_strategy: 'upsert' as const
            },
            data: {
              fields: { [key]: value },
              metadata: {
                field_name: key,  // ✅ CRITICAL: Set field_name for merge logic!
                confidence: data.v28_metadata?.confidence || 1.0,
                source_ref: 'gpt4o_conversational_extraction_v28',
                extracted_at: data.v28_metadata?.created_at || new Date().toISOString()
              }
            },
            source: {
              agent_id: 'assessment-agent-v18',
              extraction_method: 'gpt4o_conversational_extraction_v28',
              source_type: 'conversation' as const,
              session_id: sessionId
            },
            confidence: data.v28_metadata?.confidence || 1.0,
            extracted_at: data.v28_metadata?.created_at || new Date().toISOString(),
            verified: false
          };

          universalFacts.push(fact);
        }
      }

      log.event('load_universal_facts.loaded', {
        student_id: studentId,
        session_id: sessionId,
        facts_count: universalFacts.length
      });

      return universalFacts;

    } catch (error) {
      log.error('load_universal_facts.error', {
        student_id: studentId,
        session_id: sessionId,
        error: String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return [];
    }
  }

  /**
   * Extract UniversalFacts from agent response metadata
   *
   * Converts in-memory data_collected_so_far to UniversalFact format
   * This enables handover during real-time conversation before facts are persisted
   */
  private extractFactsFromMetadata(
    studentId: string,
    dataCollected: any
  ): UniversalFact[] {
    const facts: UniversalFact[] = [];
    const timestamp = Date.now();

    try {
      log.event('extract_facts.from_metadata.start', {
        student_id: studentId,
        data_keys: Object.keys(dataCollected || {})
      });

      // Skip if no data
      if (!dataCollected || typeof dataCollected !== 'object') {
        console.log('[extractFactsFromMetadata] No data or not an object');
        return facts;
      }

      // Iterate through collected data
      const allKeys = Object.keys(dataCollected);
      console.log('[extractFactsFromMetadata] Iterating through', allKeys.length, 'keys:', allKeys);
      for (const [key, value] of Object.entries(dataCollected)) {
        console.log('[extractFactsFromMetadata] Processing key:', key, 'value type:', typeof value);

        // Skip metadata fields
        if (key === 'v28_metadata' || key === 'metadata') {
          console.log('[extractFactsFromMetadata] Skipping metadata key:', key);
          continue;
        }

        // Skip numeric keys (array indices from old format)
        if (!isNaN(parseInt(key))) {
          console.log('[extractFactsFromMetadata] Skipping numeric key:', key);
          continue;
        }

        // Skip empty values
        if (value === null || value === undefined || value === '') {
          console.log('[extractFactsFromMetadata] Skipping empty value for key:', key);
          continue;
        }

        // Skip empty arrays
        if (Array.isArray(value) && value.length === 0) {
          console.log('[extractFactsFromMetadata] Skipping empty array for key:', key);
          continue;
        }

        console.log('[extractFactsFromMetadata] Creating fact for key:', key);
        // Create UniversalFact
        const fact: UniversalFact = {
          fact_id: `memory_${studentId}_${key}_${timestamp}`,
          student_id: studentId,
          category: 'profile' as any,
          subcategory: key,

          schema_target: {
            primary_table: 'kb_items' as any,
            update_strategy: 'upsert' as const
          },

          data: {
            fields: { [key]: value },

            // CRITICAL: Set metadata.field_name for HandoverValidator
            metadata: {
              field_name: key,
              data_type: Array.isArray(value) ? 'array' : typeof value,
              schema_requirement: this.isRequiredField(key) ? 'required' : 'optional',
              source: 'in_memory'
            }
          },

          source: {
            agent_id: 'assessment-agent-v18',
            extraction_method: 'in_memory_collection',
            source_type: 'conversation' as const
          },

          confidence: 0.90,
          extracted_at: new Date().toISOString(),
          verified: false
        };

        facts.push(fact);

        log.event('extract_facts.from_metadata.fact_created', {
          fact_id: fact.fact_id,
          field_name: key,
          has_value: !!value
        });
      }

      log.event('extract_facts.from_metadata.complete', {
        student_id: studentId,
        facts_extracted: facts.length,
        field_names: facts.map(f => f.data.metadata?.field_name)
      });

      return facts;

    } catch (error) {
      console.log('[extractFactsFromMetadata] ❌ ERROR:', String(error));
      console.log('[extractFactsFromMetadata] Stack:', error instanceof Error ? error.stack : undefined);

      log.error('extract_facts.from_metadata.error', {
        student_id: studentId,
        error: String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      return [];
    }
  }

  /**
   * Check if field is required for handover
   */
  private isRequiredField(fieldName: string): boolean {
    const requiredFields = ['grade', 'high_school', 'interests'];
    return requiredFields.includes(fieldName);
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

    console.log('[v34.0 HANDLEMESSAGE] Called with:', {
      student_id: request.student_id,
      session_id: request.session_id,
      message_preview: request.message.substring(0, 50)
    });

    try {
      // ✅ Layer 2 Fix: Validate inputs
      if (!request.student_id || !request.session_id || !request.message) {
        console.error('[v34.0 HANDLEMESSAGE] Invalid input!');
        log.error('handleMessage.invalid_input', {
          has_student_id: !!request.student_id,
          has_session_id: !!request.session_id,
          has_message: !!request.message
        });

        return this.createErrorResponse('Invalid request parameters', startTime);
      }

      console.log('[v34.0 HANDLEMESSAGE] Input validated, logging event...');
      log.event('orchestrator.handle_message.start', {
        version: 'v34.0',
        student_id: request.student_id,
        session_id: request.session_id,
        message_length: request.message.length
      });
      console.log('[v34.0 HANDLEMESSAGE] Event logged');

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
        console.log('[v34.0 WORKFLOW] About to invoke workflow...');
        console.log('[v34.0 WORKFLOW] initialState keys:', Object.keys(initialState));
        console.log('[v34.0 WORKFLOW] config:', config ? 'present' : 'undefined');

        // Add 30-second timeout protection
        result = await Promise.race([
          this.app.invoke(initialState, config),
          new Promise<undefined>((_, reject) =>
            setTimeout(() => reject(new Error('Workflow timeout after 30s')), 30000)
          )
        ]) as WorkflowState | undefined;

        console.log('[v34.0 WORKFLOW] Invoke completed!');
        console.log('[v34.0 WORKFLOW] Result type:', typeof result);
        console.log('[v34.0 WORKFLOW] Result keys:', result ? Object.keys(result) : 'undefined');
        console.log('[v34.0 WORKFLOW] Has current_response:', !!result?.current_response);
        console.log('[v34.0 WORKFLOW] current_response value:', result?.current_response);

      } catch (invokeError) {
        console.error('[v34.0 WORKFLOW] Invoke failed:', invokeError);
        console.error('[v34.0 WORKFLOW] Error stack:', invokeError instanceof Error ? invokeError.stack : 'No stack');
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

    console.log('[v34.0 FORMAT_RESPONSE] workflowResult keys:', Object.keys(workflowResult));
    console.log('[v34.0 FORMAT_RESPONSE] current_signals:', workflowResult.current_signals);
    console.log('[v34.0 FORMAT_RESPONSE] current_response present:', !!workflowResult.current_response);

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

    // Add delegation complete metadata if delegation finished (v34.1 Phase 1)
    if (workflowResult.agent_context?.delegation_complete) {
      response.metadata.delegation_complete = true;
      response.metadata.specialist_findings = workflowResult.agent_context.specialist_findings;
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

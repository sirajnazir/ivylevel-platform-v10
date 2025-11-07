/**
 * v34.0 Universal Orchestration Types
 *
 * Universal signal protocol for agent-orchestrator communication
 *
 * Key Design Principles:
 * - Agents return signals (completion state)
 * - Orchestrator makes routing decisions
 * - Frontend compatibility (supports existing MultiAgents Tab 2.0 UI)
 *
 * Created: 2025-11-05
 */

// ============================================================================
// UNIVERSAL SIGNAL PROTOCOL
// ============================================================================

/**
 * Agent Completion Signals
 *
 * Agents return signals about their completion state.
 * Orchestrator interprets signals and decides routing.
 *
 * This is a HINT system (not commands):
 * - Agent says "I'm done" (phase_complete: true)
 * - Orchestrator decides "Should we handover?" based on rules
 */
export interface AgentCompletionSignals {
  // Core completion state
  phase_complete: boolean;              // "I'm done with this phase"
  completion_percentage: number;        // 0-100
  confidence: number;                   // 0-1

  // Next step suggestions (hints, not commands)
  suggested_next_phase?: 'gameplan' | 'execution';
  requires_delegation?: DelegationRequest[];

  // Conditions
  needs_human_escalation?: boolean;     // "I can't handle this"
  needs_more_data?: boolean;            // "Ask more questions"

  // Quality metrics
  fact_coverage?: number;               // 0-1 (how much data collected)
  conversation_depth?: number;          // 1-5 (shallow to deep)

  // v34.0: Extensibility escape hatch (team feedback)
  extensions?: Record<string, any>;
}

/**
 * Delegation Request
 *
 * Agent requests help from specialist agents
 */
export interface DelegationRequest {
  domain: 'awards' | 'extracurriculars' | 'programs' | 'scholarships';
  reason: string;
  context: Record<string, any>;
}

// ============================================================================
// DECISION ENGINE TYPES
// ============================================================================

/**
 * Handover Decision
 *
 * Result of orchestrator evaluating if agent switch should occur
 */
export interface HandoverDecision {
  should_handover: boolean;
  next_agent?: string;
  reason: string;
  // Metadata for logging/debugging
  metadata?: {
    phase_completion: number;
    confidence: number;
    rules_evaluated: string[];
  };
}

/**
 * Delegation Decision
 *
 * Result of orchestrator evaluating if specialists needed
 */
export interface DelegationDecision {
  should_delegate: boolean;
  target_agents?: string[];
  delegation_requests?: DelegationRequest[];
  // Metadata for logging
  metadata?: {
    requesting_agent: string;
    domains_requested: string[];
  };
}

/**
 * Escalation Decision
 *
 * Result of orchestrator evaluating if human coach needed
 */
export interface EscalationDecision {
  should_escalate: boolean;
  reason?: string;
  escalation_type?: 'human_coach' | 'technical_support' | 'data_quality';
  // Metadata for logging
  metadata?: {
    trigger: string;
    confidence_at_escalation?: number;
    conversation_length?: number;
  };
}

// ============================================================================
// FRONTEND COMPATIBILITY TYPES
// ============================================================================

/**
 * Frontend A2A Handover Format
 *
 * MultiAgents Tab 2.0 expects this structure:
 * - data.a2a_handover.handover_complete
 * - data.a2a_handover.from_agent
 * - data.a2a_handover.to_agent
 * - data.a2a_handover.handover_id
 */
export interface FrontendA2AHandover {
  handover_complete: boolean;
  from_agent: string;
  to_agent: string;
  handover_id: string;
  new_phase: string;
  timestamp: string;
}

/**
 * Frontend Delegation Format
 *
 * MultiAgents Tab 2.0 expects:
 * - data.metadata.delegation_started
 * - data.metadata.delegated_to[]
 * - data.metadata.delegation_complete
 */
export interface FrontendDelegationMetadata {
  delegation_started?: boolean;
  delegated_to?: string[];
  delegation_complete?: boolean;
  delegating_agent?: string;
}

/**
 * Frontend Collaboration Event
 *
 * MultiAgents Tab 2.0 displays these in intelligence logs:
 * - data.metadata.collaboration_events[]
 */
export interface FrontendCollaborationEvent {
  timestamp: string;
  event: string;
  message: string;
  details?: Record<string, any>;
}

/**
 * Frontend Orchestrator Response
 *
 * Complete response format expected by MultiAgents Tab 2.0
 */
export interface FrontendOrchestratorResponse {
  // Core response
  agent_response: string;
  agent_message_id: string;

  // Intelligence
  intelligence_triggered: string[];
  confidence: number;
  validation_score?: number;
  processing_time?: number;

  // A2A Handover (if occurred)
  a2a_handover?: FrontendA2AHandover;

  // V26 context (for logging)
  v26_context?: {
    is_clone_student: boolean;
    clone_student_id: string;
    real_student_id: string;
    conversation_turns: number;
    intent_classification: string;
    processing_steps: string[];
  };

  // Metadata
  metadata: {
    // Fact collection
    data_collected_so_far: Record<string, any>;

    // Quick replies (v29.5)
    suggested_responses?: string[];

    // Orchestration info
    orchestration: string;  // 'langgraph_v34.0'

    // Delegation (v30.2)
    delegation_started?: boolean;
    delegated_to?: string[];
    delegation_complete?: boolean;
    delegating_agent?: string;

    // Collaboration events (v31.1)
    collaboration_events?: FrontendCollaborationEvent[];

    // v34.0: Internal signals (for debugging)
    _internal_signals?: AgentCompletionSignals;
  };
}

// ============================================================================
// MIGRATION COMPATIBILITY (v26 → v34)
// ============================================================================

/**
 * v26 Metadata Convention (for backward compatibility)
 *
 * During migration, we support both:
 * - New: signals (AgentCompletionSignals)
 * - Old: v26 metadata conventions
 */
export interface V26MetadataConvention {
  // v26 handover convention
  a2a_handover_complete?: boolean;
  agent_id?: string;  // Next agent ID
  handover_id?: string;
  handover_payload?: any;

  // v26 synthesis flag
  synthesis_delivered?: boolean;

  // v29 delegation flags
  needs_awards_consultation?: boolean;
  needs_ec_consultation?: boolean;
  needs_programs_consultation?: boolean;

  // v29 escalation flag
  escalate_to_human?: boolean;

  // Other metadata
  overall_completion?: number;
  next_step?: string;
  [key: string]: any;
}

/**
 * Signal Extraction Result
 *
 * Result of extracting signals from agent response
 * (supports both v34 signals and v26 metadata fallback)
 */
export interface SignalExtractionResult {
  signals: AgentCompletionSignals;
  source: 'v34_signals' | 'v26_metadata_fallback';
  raw_metadata?: V26MetadataConvention;
}

// ============================================================================
// INTERNAL ORCHESTRATION TYPES
// ============================================================================

/**
 * Orchestrator State Update
 *
 * Result of workflow node execution
 */
export interface OrchestratorStateUpdate {
  // Agent context updates
  agent_context?: {
    current_agent?: string;
    previous_agent?: string;
    handover_pending?: boolean;
    next_agent?: string;
    handover_reason?: string;
    delegation_pending?: boolean;
    delegation_targets?: string[];
    specialist_findings?: Record<string, any>;
    escalation_pending?: boolean;
    escalation_reason?: string;
  };

  // Turn results
  current_response?: string;
  current_intelligence_triggered?: string[];
  current_confidence?: number;
  current_metadata?: Record<string, any>;
  current_signals?: AgentCompletionSignals;

  // Memory updates
  conversation_history?: any[];
  collected_facts?: Record<string, any>;
}

/**
 * Workflow Execution Context
 *
 * Context passed through workflow nodes
 */
export interface WorkflowExecutionContext {
  session_id: string;
  student_id: string;
  node_name: string;
  start_time: number;
  trace_id: string;
}

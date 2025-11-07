/**
 * LangGraph Workflow State Interface
 *
 * Purpose: Defines the complete state structure for multi-agent orchestration
 *
 * Key Principles:
 * - Memory persists across conversation turns (conversation_history)
 * - Facts accumulate across all agents (collected_facts)
 * - State checkpointed to Redis after each node
 * - No changes to database schema or agent implementations
 *
 * Created: 2025-11-04 (v31.4)
 */

/**
 * Conversation message structure
 */
export interface ConversationMessage {
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
  agent_id?: string;
  metadata?: Record<string, any>;
}

/**
 * Complete workflow state
 * Managed by LangGraph StateGraph with Redis checkpointing
 */
export interface WorkflowState {
  // ============================================================================
  // IDENTITY & SESSION
  // ============================================================================
  student_id: string;
  session_id: string;

  // ============================================================================
  // MEMORY (persists across turns via Redis checkpointing)
  // ============================================================================
  conversation_history: ConversationMessage[];

  // ============================================================================
  // COLLECTED FACTS (cumulative from all agents)
  // NOTE: Facts are ALSO stored in database (kb_items table) - unchanged
  // This is just in-memory cache for current session
  // ============================================================================
  collected_facts: {
    // From Assessment Agent (via GPT-4o extraction)
    student_profile?: Record<string, any>;
    academic_data?: Record<string, any>;
    activities?: Array<any>;
    awards?: Array<any>;
    gaps?: Array<{
      category: string;
      severity: 'critical' | 'high' | 'moderate' | 'low';
      description: string;
      recommendation?: string;
    }>;
    strengths?: string[];
    ivy_score?: Record<string, any>;

    // From GamePlan Agent
    roadmap?: Record<string, any>;
    opportunities?: {
      awards?: Array<any>;
      programs?: Array<any>;
      scholarships?: Array<any>;
    };
    timeline?: Array<any>;

    // From Execution Agent
    week_plan?: Record<string, any>;
  };

  // ============================================================================
  // AGENT COORDINATION (current workflow state)
  // ============================================================================
  agent_context: {
    current_agent: string;
    current_phase: 'assessment' | 'gameplan' | 'execution' | 'complete';

    // Assessment progress (0.0 - 1.0 for 4 phases: 0.25, 0.5, 0.75, 1.0)
    assessment_progress: number;

    // GamePlan status
    gameplan_status?: 'not_started' | 'in_progress' | 'delegating' | 'complete';

    // Delegation tracking (for parallel specialist execution)
    delegation_active: boolean;
    delegated_to?: string[];
    delegation_results?: Record<string, any>;

    // Handover tracking (for sequential agent transitions)
    handover_pending: boolean;
    handover_to?: string;
    handover_reason?: string;
    data_package?: Record<string, any>;

    // v34.0: Additional handover/delegation fields
    previous_agent?: string;          // Track previous agent for handover reporting
    next_agent?: string;              // Next agent (before handover completes)
    handover_id?: string;             // Unique handover ID for tracking
    delegation_pending?: boolean;     // Delegation in progress
    delegation_targets?: string[];    // Target specialist agents
    delegation_complete?: boolean;    // Delegation finished
    specialist_findings?: Record<string, any>;  // Results from specialist agents
    escalation_pending?: boolean;     // Human escalation needed
    escalation_reason?: string;       // Why escalation triggered

    // v34.1: Delegation feedback turn marker
    is_delegation_feedback_turn?: boolean;  // Flag to differentiate feedback turn from normal turn
  };

  // ============================================================================
  // CURRENT TURN OUTPUT
  // ============================================================================
  current_response?: string;
  current_metadata?: Record<string, any>;
  current_intelligence_triggered?: string[];
  current_confidence?: number;

  // v34.0: Agent completion signals
  current_signals?: any;  // AgentCompletionSignals (avoiding circular import)

  // ============================================================================
  // ERROR HANDLING & RETRY
  // ============================================================================
  error?: string;
  retry_count: number;
  last_error_timestamp?: Date;
}

/**
 * Initial state factory
 * Creates a clean state for new sessions
 */
export function createInitialState(
  student_id: string,
  session_id: string,
  initial_agent: string = 'assessment-agent-v18'
): Partial<WorkflowState> {
  return {
    student_id,
    session_id,
    conversation_history: [],
    collected_facts: {},
    agent_context: {
      current_agent: initial_agent,
      current_phase: 'assessment',
      assessment_progress: 0.0,
      delegation_active: false,
      handover_pending: false
    },
    retry_count: 0
  };
}

/**
 * State channel reducers for LangGraph
 * Defines how state updates are merged
 */
export const StateChannels = {
  // v31.4 FIX: Identity fields (immutable - set once at session start)
  student_id: {
    value: (prev: string | undefined, next: string | undefined) => {
      return next || prev; // Use new if provided, else keep previous
    },
    default: () => undefined
  },

  session_id: {
    value: (prev: string | undefined, next: string | undefined) => {
      return next || prev; // Use new if provided, else keep previous
    },
    default: () => undefined
  },

  // Conversation history: append new messages
  conversation_history: {
    value: (prev: ConversationMessage[], next: ConversationMessage[]) => {
      return [...prev, ...next];
    },
    default: () => []
  },

  // Collected facts: merge new facts with existing
  collected_facts: {
    value: (prev: Record<string, any>, next: Record<string, any>) => {
      return { ...prev, ...next };
    },
    default: () => ({})
  },

  // Agent context: replace with new
  agent_context: {
    value: (prev: any, next: any) => {
      return { ...prev, ...next };
    },
    default: () => ({
      current_agent: 'assessment-agent-v18',
      current_phase: 'assessment',
      assessment_progress: 0.0,
      delegation_active: false,
      handover_pending: false
    })
  },

  // v31.4 FIX: Add response channel (latest response wins)
  current_response: {
    value: (prev: string | undefined, next: string | undefined) => {
      return next; // Latest response overwrites previous
    },
    default: () => undefined
  },

  // v31.4 FIX: Add metadata channel (merge with previous)
  current_metadata: {
    value: (prev: Record<string, any> | undefined, next: Record<string, any> | undefined) => {
      return { ...prev, ...next };
    },
    default: () => ({})
  },

  // v31.4 FIX: Add intelligence triggered channel (latest wins)
  current_intelligence_triggered: {
    value: (prev: string[] | undefined, next: string[] | undefined) => {
      return next; // Latest intelligence list wins
    },
    default: () => []
  },

  // v31.4 FIX: Add confidence channel (latest wins)
  current_confidence: {
    value: (prev: number | undefined, next: number | undefined) => {
      return next;
    },
    default: () => 0.0
  }
};

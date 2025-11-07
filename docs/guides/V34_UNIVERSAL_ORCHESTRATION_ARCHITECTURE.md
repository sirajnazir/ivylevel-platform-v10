# v34.0 Universal Orchestration Architecture - First Principles Design

**Version:** v34.0
**Date:** 2025-11-05
**Status:** Design Complete - Ready for Implementation
**Based On:** v32.0 (LangGraph StateChannels Fixed) + First Principles Analysis

---

## Executive Summary

v34.0 implements **universal multi-agent orchestration** with clean separation of concerns:
- **Agents** = Domain logic + intelligence types (UNCHANGED from v32.0)
- **Orchestrator** = Control flow + state management + routing decisions
- **Protocol** = Universal signals (not v26-specific metadata)

### Key Guarantee

**✅ Intelligence types WILL NOT break** - they run in `BaseAgentWithIntelligence.processIntelligenceTypes()` which is completely independent of orchestration logic.

---

## First Principles: Universal Orchestration Interface

### Core Abstraction

```typescript
/**
 * Universal Multi-Agent Orchestrator Interface
 *
 * Responsibilities:
 * - State management (load/save/checkpoint)
 * - Agent routing (which agent should handle this?)
 * - Control flow (handover, delegation, parallel execution)
 * - Observability (tracing, logging)
 *
 * NOT responsible for:
 * - Domain logic (belongs in agents)
 * - Intelligence processing (belongs in agents)
 * - Fact validation (belongs in agents)
 */
interface UniversalOrchestrator {
  /**
   * Main entry point: handle a user message
   */
  handleMessage(params: {
    student_id: string;
    session_id: string;
    message: string;
  }): Promise<OrchestratorResponse>;

  /**
   * State management
   */
  loadState(session_id: string): Promise<OrchestratorState>;
  saveState(state: OrchestratorState): Promise<void>;
  checkpoint(session_id: string): Promise<void>;

  /**
   * Agent registry
   */
  registerAgent(agent: Agent): void;
  getAgent(agent_id: string): Agent | undefined;
}
```

---

## The Universal Protocol: Agent Signals

### Problem with v26 Convention

```typescript
// ❌ BAD: Agent makes orchestration decisions
return {
  response: "Assessment complete!",
  metadata: {
    a2a_handover_complete: true,      // Orchestration command
    agent_id: 'gameplan-agent',       // Agent knows about other agents
    handover_payload: {...}           // v26-specific structure
  }
};
```

**Issues:**
- Agent knows about other agents (coupling)
- Agent makes routing decisions (violates SoC)
- Protocol is v26-specific (not universal)

### Universal Agent Signal Protocol

```typescript
/**
 * Universal Agent Response
 *
 * Agents return:
 * 1. response (what to say to user)
 * 2. signals (completion state for orchestrator)
 * 3. intelligence_results (what types triggered)
 * 4. facts (what was learned)
 */
interface AgentResponse {
  // User-facing response
  response: string;

  // Orchestration signals (universal)
  signals: AgentCompletionSignals;

  // Intelligence results (for observability)
  intelligence_triggered: string[];
  intelligence_results: IntelligenceResult[];

  // Facts (for state accumulation)
  facts_extracted: Record<string, any>;
  facts_used: string[];

  // Metadata (for debugging/UI)
  metadata: {
    confidence: number;
    processing_time_ms: number;
    [key: string]: any;
  };
}

/**
 * Agent Completion Signals
 *
 * Signals tell orchestrator about agent's completion state.
 * Orchestrator decides what to do with these signals.
 */
interface AgentCompletionSignals {
  // Phase completion
  phase_complete: boolean;              // "I'm done with this phase"
  completion_percentage: number;        // 0-100
  confidence: number;                   // 0-1

  // Next step suggestions (hints, not commands)
  suggested_next_phase?: string;        // "gameplan" | "execution"
  requires_delegation?: DelegationRequest[];  // "I need help from specialists"

  // Conditions
  needs_human_escalation?: boolean;     // "I can't handle this"
  needs_more_data?: boolean;            // "Ask more questions"

  // Quality metrics
  fact_coverage?: number;               // 0-1 (how much data collected)
  conversation_depth?: number;          // 1-5 (shallow to deep)
}

/**
 * Delegation Request
 *
 * Agent can request help from specialists (but orchestrator decides)
 */
interface DelegationRequest {
  domain: 'awards' | 'extracurriculars' | 'programs' | 'scholarships';
  reason: string;
  context: Record<string, any>;
}
```

---

## Orchestrator Decision Logic (Not in Agents!)

### Handover Decision Engine

```typescript
/**
 * Orchestrator decides when to handover (not agents!)
 *
 * Based on:
 * - Agent signals
 * - Current state
 * - System rules
 */
class HandoverDecisionEngine {
  shouldHandover(
    state: OrchestratorState,
    signals: AgentCompletionSignals
  ): HandoverDecision {
    const currentAgent = state.current_agent;

    // Rule 1: Phase must be complete
    if (!signals.phase_complete) {
      return { should_handover: false, reason: 'phase_incomplete' };
    }

    // Rule 2: Minimum completion threshold
    if (signals.completion_percentage < 100) {
      return { should_handover: false, reason: 'below_threshold' };
    }

    // Rule 3: Confidence threshold
    if (signals.confidence < 0.8) {
      return { should_handover: false, reason: 'low_confidence' };
    }

    // Rule 4: Route based on current agent
    if (currentAgent === 'assessment-agent-v18') {
      return {
        should_handover: true,
        next_agent: 'gameplan-agent-v18',
        reason: 'assessment_complete'
      };
    }

    if (currentAgent === 'gameplan-agent-v18') {
      return {
        should_handover: true,
        next_agent: 'execution-agent',
        reason: 'gameplan_complete'
      };
    }

    return { should_handover: false, reason: 'terminal_agent' };
  }
}
```

### Delegation Decision Engine

```typescript
/**
 * Orchestrator decides when to delegate (not agents!)
 */
class DelegationDecisionEngine {
  shouldDelegate(
    state: OrchestratorState,
    signals: AgentCompletionSignals
  ): DelegationDecision {
    // Only GamePlan can request delegation
    if (state.current_agent !== 'gameplan-agent-v18') {
      return { should_delegate: false };
    }

    // Check if agent requested delegation
    if (!signals.requires_delegation || signals.requires_delegation.length === 0) {
      return { should_delegate: false };
    }

    // Map requests to agents
    const targetAgents = signals.requires_delegation.map(req => {
      switch (req.domain) {
        case 'awards': return 'awards-agent-v18';
        case 'extracurriculars': return 'extracurriculars-agent-v18';
        case 'programs': return 'scholarships-agent';  // TODO: separate programs agent
        case 'scholarships': return 'scholarships-agent';
        default: return null;
      }
    }).filter(Boolean);

    return {
      should_delegate: true,
      target_agents: targetAgents,
      delegation_requests: signals.requires_delegation
    };
  }
}
```

---

## LangGraph Implementation (v34.0)

### Workflow Graph

```
START
  ↓
load_state (load facts + history + agent context)
  ↓
call_agent (call current agent with full state)
  ↓
  Agent processes:
    1. BaseAgentWithIntelligence.processIntelligenceTypes() ← UNCHANGED
    2. Agent domain logic ← MODIFIED to return signals
    3. Return AgentResponse with signals
  ↓
extract_signals (parse agent response signals)
  ↓
check_escalation (needs human coach?)
  ├─ YES → escalate_to_human → END
  └─ NO  → check_delegation
              ↓
            check_delegation (needs specialists?)
              ├─ YES → delegate_to_specialists → merge_results → check_handover
              └─ NO  → check_handover
                          ↓
                        check_handover (phase complete?)
                          ├─ YES → execute_handover → call_agent (loop)
                          └─ NO  → save_state → END
```

### Implementation: LangGraphOrchestratorV34.ts

```typescript
/**
 * LangGraph Orchestrator v34.0 - Universal Multi-Agent Coordination
 *
 * Key changes from v31.4:
 * - Agents return universal signals (not v26 metadata)
 * - Orchestrator owns ALL routing decisions
 * - Clean separation: agents = domain, orchestrator = control
 */
export class LangGraphOrchestratorV34 {
  private pool: Pool;
  private factStore: FactStore;
  private checkpointer: RedisSaver;
  private app: any;  // Compiled LangGraph app
  private agents: Map<string, Agent> = new Map();

  // Decision engines (orchestrator owns these)
  private handoverEngine: HandoverDecisionEngine;
  private delegationEngine: DelegationDecisionEngine;
  private escalationEngine: EscalationDecisionEngine;

  constructor(pool: Pool, factStore: FactStore, redisUrl: string) {
    this.pool = pool;
    this.factStore = factStore;

    // Initialize Redis checkpointer (mandatory in v34.0)
    const redis = new Redis(redisUrl);
    this.checkpointer = new RedisSaver(redis);

    // Initialize decision engines
    this.handoverEngine = new HandoverDecisionEngine();
    this.delegationEngine = new DelegationDecisionEngine();
    this.escalationEngine = new EscalationDecisionEngine();

    // Register agents
    this.registerAgents();

    // Build workflow
    this.buildWorkflow();
  }

  private registerAgents(): void {
    // Create agents (UNCHANGED implementations)
    const assessmentAgent = new AssessmentAgentV3ConversationalRealtime(
      this.factStore,
      this.pool
    );
    const gameplanAgent = new GamePlanAgentV3(this.factStore, this.pool);
    const executionAgent = new ExecutionAgent(this.factStore);
    const awardsAgent = new AwardsAgentRefactored(this.factStore);
    const ecsAgent = new ExtracurricularsAgentRefactored(this.factStore);
    const scholarshipsAgent = new ScholarshipsAgent(this.factStore);

    // Register agents
    this.agents.set('assessment-agent-v18', assessmentAgent);
    this.agents.set('gameplan-agent-v18', gameplanAgent);
    this.agents.set('execution-agent', executionAgent);
    this.agents.set('awards-agent-v18', awardsAgent);
    this.agents.set('extracurriculars-agent-v18', ecsAgent);
    this.agents.set('scholarships-agent', scholarshipsAgent);
  }

  private buildWorkflow(): void {
    const workflow = new StateGraph<WorkflowState>({
      channels: StateChannels
    });

    // ========================================================================
    // NODE 1: Load State
    // ========================================================================
    workflow.addNode("load_state", async (state: WorkflowState) => {
      // Load conversation history
      const history = await this.pool.query(`
        SELECT role, content, timestamp, metadata
        FROM multiagent_messages
        WHERE session_id = $1
        ORDER BY timestamp ASC
      `, [state.session_id]);

      // Load collected facts
      const facts = await this.pool.query(`
        SELECT edges FROM kb_items
        WHERE student_id = $1
          AND source_ref = 'gpt4o_conversational_extraction_v28'
      `, [state.student_id]);

      const collectedFacts = facts.rows.reduce((acc, row) => {
        return { ...acc, ...row.edges };
      }, {});

      return {
        conversation_history: history.rows,
        collected_facts: collectedFacts
      };
    });

    // ========================================================================
    // NODE 2: Call Agent
    // ========================================================================
    workflow.addNode("call_agent", async (state: WorkflowState) => {
      const agent = this.agents.get(state.agent_context.current_agent);

      if (!agent) {
        throw new Error(`Agent not found: ${state.agent_context.current_agent}`);
      }

      const lastMessage = state.conversation_history[state.conversation_history.length - 1];

      // Call agent (intelligence types run here automatically)
      const result = await agent.handleQuery({
        entity_id: state.student_id,
        session_id: state.session_id,
        query: lastMessage.content,
        metadata: {
          conversation_history: state.conversation_history,
          collected_facts: state.collected_facts,
          agent_context: state.agent_context
        }
      });

      // v34.0: Parse universal signals from response
      const signals = this.extractSignals(result);

      return {
        current_response: result.response,
        current_intelligence_triggered: result.intelligence_triggered,
        current_confidence: result.validation_score || 0.0,
        current_metadata: result.metadata,
        current_signals: signals  // v34.0: Store signals in state
      };
    });

    // ========================================================================
    // NODE 3: Extract Signals
    // ========================================================================
    workflow.addNode("extract_signals", async (state: WorkflowState) => {
      // Parse signals from agent response
      // (For v34.0, we'll add a migration adapter for existing agents)
      const signals = this.extractSignalsFromResponse(state);

      return {
        current_signals: signals
      };
    });

    // ========================================================================
    // NODE 4: Check Escalation
    // ========================================================================
    workflow.addNode("check_escalation", async (state: WorkflowState) => {
      const decision = this.escalationEngine.shouldEscalate(
        state,
        state.current_signals
      );

      return {
        agent_context: {
          ...state.agent_context,
          escalation_pending: decision.should_escalate,
          escalation_reason: decision.reason
        }
      };
    });

    // ========================================================================
    // NODE 5: Check Delegation
    // ========================================================================
    workflow.addNode("check_delegation", async (state: WorkflowState) => {
      const decision = this.delegationEngine.shouldDelegate(
        state,
        state.current_signals
      );

      return {
        agent_context: {
          ...state.agent_context,
          delegation_pending: decision.should_delegate,
          delegation_targets: decision.target_agents || []
        }
      };
    });

    // ========================================================================
    // NODE 6: Execute Delegation (Parallel Specialists)
    // ========================================================================
    workflow.addNode("execute_delegation", async (state: WorkflowState) => {
      const targets = state.agent_context.delegation_targets || [];

      // Call specialists in parallel
      const results = await Promise.all(
        targets.map(async (agentId) => {
          const agent = this.agents.get(agentId);
          if (!agent) return null;

          const result = await agent.handleQuery({
            entity_id: state.student_id,
            session_id: state.session_id,
            query: `Find opportunities based on: ${JSON.stringify(state.collected_facts)}`,
            metadata: {
              is_delegation: true,
              parent_agent: state.agent_context.current_agent
            }
          });

          return { agent_id: agentId, result };
        })
      );

      const successfulResults = results.filter(r => r !== null);

      return {
        agent_context: {
          ...state.agent_context,
          delegation_pending: false,
          specialist_findings: successfulResults.reduce((acc, r) => {
            return { ...acc, [r!.agent_id]: r!.result };
          }, {})
        }
      };
    });

    // ========================================================================
    // NODE 7: Check Handover
    // ========================================================================
    workflow.addNode("check_handover", async (state: WorkflowState) => {
      const decision = this.handoverEngine.shouldHandover(
        state,
        state.current_signals
      );

      return {
        agent_context: {
          ...state.agent_context,
          handover_pending: decision.should_handover,
          next_agent: decision.next_agent,
          handover_reason: decision.reason
        }
      };
    });

    // ========================================================================
    // NODE 8: Execute Handover
    // ========================================================================
    workflow.addNode("execute_handover", async (state: WorkflowState) => {
      const nextAgent = state.agent_context.next_agent!;

      // Create handover message
      const handoverMessage: ConversationMessage = {
        role: 'system',
        content: `[HANDOVER] ${state.agent_context.current_agent} → ${nextAgent}. Reason: ${state.agent_context.handover_reason}`,
        timestamp: new Date().toISOString(),
        metadata: {
          handover: true,
          from_agent: state.agent_context.current_agent,
          to_agent: nextAgent
        }
      };

      return {
        conversation_history: [...state.conversation_history, handoverMessage],
        agent_context: {
          ...state.agent_context,
          current_agent: nextAgent,
          previous_agent: state.agent_context.current_agent,
          handover_pending: false
        }
      };
    });

    // ========================================================================
    // NODE 9: Save State
    // ========================================================================
    workflow.addNode("save_state", async (state: WorkflowState) => {
      // Save collected facts
      if (Object.keys(state.collected_facts).length > 0) {
        await this.pool.query(`
          INSERT INTO kb_items (student_id, category, edges, source_ref)
          VALUES ($1, 'session_facts', $2, 'langgraph_v34_session')
          ON CONFLICT (student_id, category, source_ref)
          DO UPDATE SET edges = EXCLUDED.edges
        `, [state.student_id, state.collected_facts]);
      }

      return state;
    });

    // ========================================================================
    // EDGES: Wire up the workflow
    // ========================================================================
    workflow.addEdge(START, "load_state");
    workflow.addEdge("load_state", "call_agent");
    workflow.addEdge("call_agent", "extract_signals");
    workflow.addEdge("extract_signals", "check_escalation");

    // Conditional: escalation?
    workflow.addConditionalEdges(
      "check_escalation",
      (state) => state.agent_context.escalation_pending ? "escalate" : "continue",
      {
        escalate: END,  // TODO: Add escalate_to_human node
        continue: "check_delegation"
      }
    );

    // Conditional: delegation?
    workflow.addConditionalEdges(
      "check_delegation",
      (state) => state.agent_context.delegation_pending ? "delegate" : "check_handover",
      {
        delegate: "execute_delegation",
        check_handover: "check_handover"
      }
    );

    workflow.addEdge("execute_delegation", "check_handover");

    // Conditional: handover?
    workflow.addConditionalEdges(
      "check_handover",
      (state) => state.agent_context.handover_pending ? "handover" : "end",
      {
        handover: "execute_handover",
        end: "save_state"
      }
    );

    // Loop back after handover
    workflow.addEdge("execute_handover", "call_agent");

    workflow.addEdge("save_state", END);

    // Compile workflow
    this.app = workflow.compile({
      checkpointer: this.checkpointer
    });
  }

  /**
   * Extract universal signals from agent response
   *
   * v34.0: This is where we adapt existing agent responses to universal protocol
   */
  private extractSignalsFromResponse(state: WorkflowState): AgentCompletionSignals {
    const metadata = state.current_metadata || {};

    // v34.0 MIGRATION: Adapt v26/v29 conventions to universal signals

    // Check for v26 handover completion (backward compat during migration)
    const phaseComplete = metadata.a2a_handover_complete === true ||
                          metadata.synthesis_delivered === true ||
                          false;

    // Extract completion percentage
    const completionPercentage = metadata.overall_completion || 0;

    // Extract confidence
    const confidence = state.current_confidence || 0.0;

    // Check for delegation needs (v29 convention)
    const requiresDelegation: DelegationRequest[] = [];
    if (metadata.needs_awards_consultation) {
      requiresDelegation.push({
        domain: 'awards',
        reason: 'GamePlan needs awards opportunities',
        context: {}
      });
    }
    if (metadata.needs_ec_consultation) {
      requiresDelegation.push({
        domain: 'extracurriculars',
        reason: 'GamePlan needs EC opportunities',
        context: {}
      });
    }

    return {
      phase_complete: phaseComplete,
      completion_percentage: completionPercentage,
      confidence: confidence,
      suggested_next_phase: metadata.next_step,
      requires_delegation: requiresDelegation.length > 0 ? requiresDelegation : undefined,
      needs_human_escalation: metadata.escalate_to_human === true,
      fact_coverage: completionPercentage / 100,
      conversation_depth: 3  // TODO: Calculate from conversation history
    };
  }

  /**
   * Main entry point
   */
  async handleMessage(params: {
    student_id: string;
    session_id: string;
    message: string;
  }): Promise<OrchestratorResponse> {
    const { student_id, session_id, message } = params;

    // Create initial state
    const initialState: WorkflowState = {
      student_id,
      session_id,
      conversation_history: [
        {
          role: 'user',
          content: message,
          timestamp: new Date().toISOString()
        }
      ],
      collected_facts: {},
      agent_context: {
        current_agent: 'assessment-agent-v18',
        current_phase: 'assessment',
        assessment_progress: 0.0,
        delegation_active: false,
        handover_pending: false
      },
      current_signals: {
        phase_complete: false,
        completion_percentage: 0,
        confidence: 0.0
      }
    };

    // Execute workflow with checkpointing
    const config = {
      configurable: {
        thread_id: session_id  // Redis checkpoint key
      }
    };

    const result = await this.app.invoke(initialState, config);

    return {
      response: result.current_response,
      agent_id: result.agent_context.current_agent,
      intelligence_triggered: result.current_intelligence_triggered || [],
      metadata: {
        ...result.current_metadata,
        signals: result.current_signals,
        handover_occurred: result.agent_context.previous_agent !== undefined,
        delegation_occurred: result.agent_context.specialist_findings !== undefined
      }
    };
  }
}
```

---

## State Schema (v34.0)

```typescript
interface WorkflowState {
  // Identity (immutable)
  student_id: string;
  session_id: string;

  // Memory (accumulated)
  conversation_history: ConversationMessage[];
  collected_facts: Record<string, any>;

  // Agent context (orchestrator-managed)
  agent_context: {
    current_agent: string;
    previous_agent?: string;
    current_phase: string;

    // Handover state
    handover_pending: boolean;
    next_agent?: string;
    handover_reason?: string;

    // Delegation state
    delegation_pending: boolean;
    delegation_targets?: string[];
    specialist_findings?: Record<string, any>;

    // Escalation state
    escalation_pending?: boolean;
    escalation_reason?: string;

    // Progress tracking
    assessment_progress: number;
    gameplan_progress?: number;
    execution_progress?: number;
  };

  // Current turn results
  current_response?: string;
  current_intelligence_triggered?: string[];
  current_confidence?: number;
  current_metadata?: Record<string, any>;

  // v34.0: Universal signals
  current_signals: AgentCompletionSignals;
}
```

---

## Migration Strategy: From v32.0 to v34.0

### Phase 1: Add Signal Extraction (Week 1-2)

**Step 1:** Add signal extraction to existing agents (backward compatible)

```typescript
// In AssessmentAgentV3ConversationalRealtime.ts

// BEFORE (v32.0):
return {
  response: "Assessment complete!",
  metadata: {
    a2a_handover_complete: true,
    agent_id: 'gameplan-agent'
  }
};

// AFTER (v34.0 - during migration):
return {
  response: "Assessment complete!",

  // v34.0: Universal signals
  signals: {
    phase_complete: true,
    completion_percentage: 100,
    confidence: 0.85,
    suggested_next_phase: 'gameplan'
  },

  // Keep v26 convention during migration (will remove in Phase 2)
  metadata: {
    a2a_handover_complete: true,
    agent_id: 'gameplan-agent'
  }
};
```

**Step 2:** Update orchestrator to read signals first, fallback to v26 metadata

```typescript
private extractSignalsFromResponse(state: WorkflowState): AgentCompletionSignals {
  // v34.0: Try universal signals first
  if (state.current_metadata?.signals) {
    return state.current_metadata.signals;
  }

  // Fallback: Convert v26 conventions (backward compat)
  return this.convertV26ToSignals(state.current_metadata);
}
```

### Phase 2: Remove v26 Conventions (Week 3-4)

Once all agents return universal signals, remove v26 fallback:

```typescript
// Remove from agents:
- metadata.a2a_handover_complete
- metadata.agent_id
- metadata.handover_payload

// Remove from orchestrator:
- convertV26ToSignals() fallback
```

---

## Intelligence Types Guarantee

### Why Intelligence Types Won't Break

**Intelligence processing happens BEFORE orchestration signals:**

```typescript
// In BaseAgentWithIntelligence.handleQuery()

async handleQuery(query: AgentQuery): Promise<AgentResponse> {
  // Step 1: Load facts
  const facts = await this.factStore.loadFacts(query.entity_id);

  // Step 2: Process intelligence types (UNCHANGED)
  const intelligenceResults = await this.processIntelligenceTypes(query, facts);

  // Step 3: Agent domain logic generates response
  // v34.0 CHANGE: Also generate signals here
  const response = await this.generateResponse(facts, intelligenceResults);

  const signals = this.generateCompletionSignals(facts, intelligenceResults);

  // Return response with signals
  return {
    response: response.text,
    intelligence_triggered: intelligenceResults.filter(r => r.triggered).map(r => r.type_id),
    intelligence_results: intelligenceResults,
    signals: signals,  // v34.0: Add signals
    ...
  };
}
```

**Intelligence types run in Step 2, signals are generated in Step 3.**
**They are completely independent.**

---

## Implementation Timeline

### Week 1-2: Build v34.0 Orchestrator
- Create `LangGraphOrchestratorV34.ts`
- Implement decision engines (handover, delegation, escalation)
- Add signal extraction with v26 fallback
- Wire up workflow graph
- Test with existing agents (signals extracted from v26 metadata)

**Deliverable:** v34.0 orchestrator working with v32.0 agents

### Week 3-4: Migrate Agents to Universal Signals
- Update Assessment Agent to return signals
- Update GamePlan Agent to return signals
- Update delegation requests to use signals
- Remove v26 metadata conventions
- Update tests

**Deliverable:** All agents using universal protocol

### Week 5-6: Frontend Integration & Polish
- Update MultiAgentsTabRedesigned.tsx for v34.0
- Add handover timeline visualization
- Add delegation progress indicators
- Test end-to-end workflows

**Deliverable:** v34.0 production-ready

---

## Success Criteria

### v34.0 Success Metrics
- [ ] ✅ Intelligence types run without errors (verified independently)
- [ ] ✅ Assessment → GamePlan handover working (100% success rate)
- [ ] ✅ GamePlan → Execution handover working (100% success rate)
- [ ] ✅ GamePlan → Awards/ECs delegation working (parallel < 2s)
- [ ] ✅ Sessions resume from Redis checkpoints (100% success rate)
- [ ] ✅ Zero v26-specific conventions in final code
- [ ] ✅ Universal signals protocol documented and followed

---

## Risk Mitigation

### Risk 1: Intelligence types break during migration
**Mitigation:** Intelligence processing is in `BaseAgentWithIntelligence`, completely separate from orchestration
**Test:** Run intelligence tests independently before/after migration

### Risk 2: Signal extraction misses v26 handovers
**Mitigation:** Keep v26 fallback during Phase 1, comprehensive logging
**Test:** Parallel testing (v26 metadata vs extracted signals)

### Risk 3: Migration takes too long
**Mitigation:** Phase 1 delivers working system (backward compatible)
**Rollback:** Can stop after Phase 1, system still works

---

## Files to Create

### New Files
1. `services/agent-framework/src/langgraph/LangGraphOrchestratorV34.ts` - Main orchestrator
2. `services/agent-framework/src/langgraph/v34/HandoverDecisionEngine.ts` - Handover logic
3. `services/agent-framework/src/langgraph/v34/DelegationDecisionEngine.ts` - Delegation logic
4. `services/agent-framework/src/langgraph/v34/EscalationDecisionEngine.ts` - Escalation logic
5. `services/agent-framework/src/langgraph/v34/types.ts` - Universal signal types
6. `docs/guides/V34_UNIVERSAL_ORCHESTRATION_ARCHITECTURE.md` - This document
7. `docs/guides/V34_MIGRATION_GUIDE.md` - Migration steps

### Files to Modify
1. `services/agent-framework/src/agents/v18/AssessmentAgentV3ConversationalRealtime.ts` - Add signals
2. `services/agent-framework/src/agents/v18/GamePlanAgentV3.ts` - Add signals
3. `services/agent-framework/src/agents/v18/ExecutionAgent.ts` - Add signals
4. `services/agent-framework/src/langgraph/state.ts` - Add current_signals channel
5. `services/agent-framework/src/routes/v26-multiagents.ts` - Use v34.0 orchestrator
6. `unified-frontend/apps/unified-app/src/components/v26/MultiAgentsTabRedesigned.tsx` - v34.0 UI
7. `docs/PROD_FEATURE_RELEASE_DETAILS.md` - v34.0 section
8. `docs/MASTER_PROD_TECH_SPEC.md` - v34.0 version bump
9. `CHANGELOG.md` - v34.0 entry

---

## Conclusion

**v34.0 is the right architecture** - clean separation, universal protocol, no bandaids.

**Intelligence types are safe** - they run in `BaseAgentWithIntelligence.processIntelligenceTypes()` which is completely independent of orchestration logic.

**Timeline: 6 weeks total**
- Weeks 1-2: Build v34.0 orchestrator (backward compatible)
- Weeks 3-4: Migrate agents to universal signals
- Weeks 5-6: Frontend integration & polish

**Ready to proceed?**

---

**Status:** Design Complete - Ready for Implementation
**Risk Level:** Low (intelligence types protected, incremental migration)
**Confidence:** High (95% - first principles design + backward compatibility)

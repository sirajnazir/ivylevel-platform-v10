# v33.0 Multi-Agent Workflow Implementation Plan

**Version:** v33.0
**Date:** 2025-11-05
**Status:** Planning Complete - Ready for Implementation
**Based On:** v32.0 (LangGraph StateChannels Fixed)

---

## Executive Summary

This document outlines the implementation plan for enabling full multi-agent workflow orchestration in the IvyLevel platform, building on the v32.0 state management fix. The plan is divided into two phases over 4 weeks.

### Current State (v32.0)
- ✅ LangGraph v31.4 orchestration operational
- ✅ State management working (student_id, session_id persist)
- ✅ Multi-turn fact accumulation working
- ✅ All 6 agents wrapped as tools (Assessment, GamePlan, Execution, Awards, ECs, Scholarships)
- ❌ **Gap:** Workflow is single-agent only (no handover logic)
- ❌ **Gap:** No checkpointing (sessions don't resume)
- ❌ **Gap:** No NSM outcome tracking
- ❌ **Gap:** No human coach escalation

### Target State (v33.0+)
- ✅ Full multi-agent workflow: Assessment → GamePlan → Execution
- ✅ Specialist agent delegation: GamePlan calls Awards/ECs/Programs during planning
- ✅ Redis checkpointing for session resume
- ✅ Cross-session fact persistence
- ✅ NSM outcome tracking integration
- ✅ Human coach escalation triggers

---

## Phase 1: Complete Multi-Agent Workflow (3 weeks)

### Week 1: Core Handover Flow (Assessment → GamePlan → Execution)

**Goal:** Implement linear handover between core 3 agents

#### 1.1 Design Handover Decision Logic
**File:** `services/agent-framework/src/langgraph/handover-logic.ts`

Create handover decision engine that determines:
- When Assessment is complete (TYPE-080 4-phase completion = 100%)
- When GamePlan is complete (93-week roadmap generated)
- When Execution starts (Week 1 planning begins)

```typescript
export interface HandoverDecision {
  should_handover: boolean;
  next_agent: string | null;
  reason: string;
  handover_payload?: Record<string, any>;
}

export function shouldHandoverToGamePlan(state: WorkflowState): HandoverDecision {
  // Check TYPE-080 completion
  // Check if synthesis delivered
  // Check confidence threshold (>= 0.8)
}

export function shouldHandoverToExecution(state: WorkflowState): HandoverDecision {
  // Check if GamePlan roadmap exists
  // Check if week 1 ready
}
```

#### 1.2 Add Handover Node to Workflow
**File:** `services/agent-framework/src/langgraph/LangGraphOrchestratorV31.ts`

Add new node after `call_agent`:

```typescript
workflow.addNode("check_handover", async (state: WorkflowState) => {
  const currentAgent = state.agent_context.current_agent;

  let decision: HandoverDecision;

  if (currentAgent === 'assessment-agent-v18') {
    decision = shouldHandoverToGamePlan(state);
  } else if (currentAgent === 'gameplan-agent-v18') {
    decision = shouldHandoverToExecution(state);
  } else {
    decision = { should_handover: false, next_agent: null, reason: 'terminal_agent' };
  }

  return {
    agent_context: {
      ...state.agent_context,
      handover_pending: decision.should_handover,
      next_agent: decision.next_agent,
      handover_reason: decision.reason
    }
  };
});
```

#### 1.3 Add Conditional Routing
**File:** `services/agent-framework/src/langgraph/LangGraphOrchestratorV31.ts`

Replace simple edge with conditional:

```typescript
workflow.addConditionalEdges(
  "check_handover",
  (state: WorkflowState) => {
    if (state.agent_context.handover_pending && state.agent_context.next_agent) {
      return "handover";
    }
    return "end";
  },
  {
    handover: "perform_handover",
    end: END
  }
);
```

#### 1.4 Add Handover Execution Node
**File:** `services/agent-framework/src/langgraph/LangGraphOrchestratorV31.ts`

```typescript
workflow.addNode("perform_handover", async (state: WorkflowState) => {
  const nextAgent = state.agent_context.next_agent!;

  log.event('handover.executing', {
    from_agent: state.agent_context.current_agent,
    to_agent: nextAgent,
    reason: state.agent_context.handover_reason
  });

  // Create handover message
  const handoverMessage: ConversationMessage = {
    role: 'system',
    content: `Handover from ${state.agent_context.current_agent} to ${nextAgent}. Reason: ${state.agent_context.handover_reason}`,
    timestamp: new Date().toISOString(),
    metadata: {
      handover: true,
      facts_transferred: Object.keys(state.collected_facts).length
    }
  };

  return {
    conversation_history: [...state.conversation_history, handoverMessage],
    agent_context: {
      ...state.agent_context,
      current_agent: nextAgent,
      handover_pending: false,
      previous_agent: state.agent_context.current_agent
    }
  };
});

workflow.addEdge("perform_handover", "call_agent");  // Loop back to call new agent
```

**Deliverables:**
- ✅ Handover decision logic implemented
- ✅ Workflow nodes added (check_handover, perform_handover)
- ✅ Conditional routing working
- ✅ Test: Assessment completes → GamePlan activates

---

### Week 2: Specialist Agent Delegation

**Goal:** GamePlan calls specialist agents (Awards, ECs, Programs) during planning

#### 2.1 Add Delegation Node
**File:** `services/agent-framework/src/langgraph/LangGraphOrchestratorV31.ts`

```typescript
workflow.addNode("check_delegation", async (state: WorkflowState) => {
  const currentAgent = state.agent_context.current_agent;

  // Only GamePlan can delegate
  if (currentAgent !== 'gameplan-agent-v18') {
    return { agent_context: { ...state.agent_context, delegation_active: false } };
  }

  // Check if GamePlan wants to consult specialists
  const lastMetadata = state.current_metadata;
  const needsAwards = lastMetadata?.needs_awards_consultation === true;
  const needsECs = lastMetadata?.needs_ec_consultation === true;
  const needsPrograms = lastMetadata?.needs_programs_consultation === true;

  if (needsAwards || needsECs || needsPrograms) {
    return {
      agent_context: {
        ...state.agent_context,
        delegation_active: true,
        delegation_targets: [
          needsAwards && 'awards-agent-v18',
          needsECs && 'extracurriculars-agent-v18',
          needsPrograms && 'scholarships-agent'
        ].filter(Boolean)
      }
    };
  }

  return { agent_context: { ...state.agent_context, delegation_active: false } };
});
```

#### 2.2 Add Parallel Specialist Calls
**File:** `services/agent-framework/src/langgraph/LangGraphOrchestratorV31.ts`

```typescript
workflow.addNode("call_specialists", async (state: WorkflowState) => {
  const targets = state.agent_context.delegation_targets || [];

  // Call specialists in parallel
  const results = await Promise.all(
    targets.map(async (agentId) => {
      const tool = this.tools.get(agentId);
      if (!tool) return null;

      const result = await tool.func({
        student_id: state.student_id,
        session_id: state.session_id,
        message: `Find opportunities for: ${JSON.stringify(state.collected_facts)}`,
        conversation_history: state.conversation_history,
        collected_facts: state.collected_facts,
        agent_context: state.agent_context,
        is_delegation: true
      });

      return { agent: agentId, result };
    })
  );

  // Merge specialist findings into state
  const specialistFindings = results.reduce((acc, r) => {
    if (!r) return acc;
    const parsed = parseAgentToolResult(r.result as string);
    return { ...acc, [r.agent]: parsed };
  }, {});

  return {
    agent_context: {
      ...state.agent_context,
      delegation_active: false,
      specialist_findings: specialistFindings
    }
  };
});
```

**Deliverables:**
- ✅ Delegation detection logic
- ✅ Parallel specialist calls working
- ✅ Findings merged back to GamePlan context
- ✅ Test: GamePlan queries Awards + ECs simultaneously

---

### Week 3: Frontend Integration & Polish

**Goal:** Wire multi-agent workflow to production frontend

#### 3.1 Update Frontend API Client
**File:** `unified-frontend/apps/unified-app/src/components/v26/MultiAgentsTabRedesigned.tsx`

Add agent transition visualization:

```typescript
interface AgentTransition {
  from_agent: string;
  to_agent: string;
  timestamp: string;
  reason: string;
}

// Show agent transitions in UI
{transitions.map((t) => (
  <div className="agent-transition">
    <span className="from-agent">{t.from_agent}</span>
    <span className="arrow">→</span>
    <span className="to-agent">{t.to_agent}</span>
    <span className="reason">{t.reason}</span>
  </div>
))}
```

#### 3.2 Add Agent Status Indicators
Show which agents are active:

```typescript
const AgentStatusBar = () => (
  <div className="agent-status-bar">
    <AgentCard
      name="Assessment"
      status={currentAgent === 'assessment-agent-v18' ? 'active' : 'complete'}
    />
    <AgentCard
      name="GamePlan"
      status={currentAgent === 'gameplan-agent-v18' ? 'active' : 'pending'}
    />
    <AgentCard
      name="Execution"
      status={currentAgent === 'execution-agent' ? 'active' : 'pending'}
    />
  </div>
);
```

#### 3.3 Add Handover Notifications
**File:** `unified-frontend/apps/unified-app/src/components/v26/HandoverNotification.tsx`

```typescript
export const HandoverNotification = ({ from, to, reason }) => (
  <div className="handover-notification">
    <div className="icon">🔄</div>
    <div className="content">
      <h4>Transitioning to {to}</h4>
      <p>{reason}</p>
    </div>
  </div>
);
```

**Deliverables:**
- ✅ Agent transitions visible in UI
- ✅ Status indicators show current agent
- ✅ Handover notifications appear
- ✅ Test: User sees Assessment → GamePlan transition

---

## Phase 2: Platform Infrastructure (1 week)

### Week 4: Production-Ready Foundation

#### 4.1 Redis Checkpointing (Session Resume)
**File:** `services/agent-framework/src/langgraph/LangGraphOrchestratorV31.ts`

Enable Redis checkpointing (currently disabled):

```typescript
constructor(pool: Pool, factStore: FactStore, redisUrl?: string) {
  // ALWAYS initialize Redis (not optional)
  if (!redisUrl) {
    throw new Error('Redis URL required for checkpointing');
  }

  const redis = new Redis(redisUrl);
  this.checkpointer = new RedisSaver(redis);
}

// Configure checkpoint on invoke
const config = {
  configurable: {
    thread_id: session_id  // Use session_id as checkpoint key
  }
};

const result = await this.app.invoke(finalState, config);
```

**Test:**
- Start session with Assessment
- Close browser
- Reopen → Session resumes from exact state

#### 4.2 Cross-Session Fact Persistence
**File:** `services/agent-framework/src/langgraph/LangGraphOrchestratorV31.ts`

Ensure facts persist across sessions:

```typescript
workflow.addNode("save_facts", async (state: WorkflowState) => {
  // Save collected_facts to kb_items
  await this.pool.query(`
    INSERT INTO kb_items (
      student_id,
      category,
      edges,
      source_ref
    ) VALUES ($1, 'session_facts', $2, 'langgraph_v32_session')
    ON CONFLICT (student_id, category, source_ref)
    DO UPDATE SET edges = EXCLUDED.edges
  `, [state.student_id, state.collected_facts]);

  return state;
});

workflow.addEdge("call_agent", "save_facts");
workflow.addEdge("save_facts", "check_handover");
```

#### 4.3 NSM Outcome Tracking
**File:** `services/agent-framework/src/langgraph/nsm-tracking.ts`

Track agent outcomes for NSM dashboard:

```typescript
export async function trackAgentOutcome(
  pool: Pool,
  session_id: string,
  agent_id: string,
  outcome: {
    completion_status: 'complete' | 'incomplete' | 'escalated';
    facts_collected: number;
    confidence: number;
    handover_quality?: number;
  }
) {
  await pool.query(`
    INSERT INTO agent_outcomes (
      session_id,
      agent_id,
      completion_status,
      facts_collected,
      confidence,
      handover_quality,
      created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
  `, [
    session_id,
    agent_id,
    outcome.completion_status,
    outcome.facts_collected,
    outcome.confidence,
    outcome.handover_quality
  ]);
}
```

Create NSM table:

```sql
CREATE TABLE agent_outcomes (
  id SERIAL PRIMARY KEY,
  session_id UUID NOT NULL,
  agent_id TEXT NOT NULL,
  completion_status TEXT NOT NULL,
  facts_collected INTEGER NOT NULL,
  confidence FLOAT NOT NULL,
  handover_quality FLOAT,
  created_at TIMESTAMP NOT NULL,
  FOREIGN KEY (session_id) REFERENCES conversation_sessions(id)
);

CREATE INDEX idx_agent_outcomes_session ON agent_outcomes(session_id);
CREATE INDEX idx_agent_outcomes_agent ON agent_outcomes(agent_id);
```

#### 4.4 Human Coach Escalation
**File:** `services/agent-framework/src/langgraph/escalation-logic.ts`

Detect when human coach is needed:

```typescript
export function shouldEscalateToHuman(state: WorkflowState): boolean {
  // Escalate if:
  // 1. Student explicitly requests human coach
  if (state.conversation_history.some(m =>
    m.content.toLowerCase().includes('human coach') ||
    m.content.toLowerCase().includes('talk to someone')
  )) {
    return true;
  }

  // 2. Confidence very low (< 0.5)
  if (state.current_confidence < 0.5) {
    return true;
  }

  // 3. No progress after 10 messages
  if (state.conversation_history.length > 10 &&
      Object.keys(state.collected_facts).length < 3) {
    return true;
  }

  // 4. Agent explicitly requests escalation
  if (state.current_metadata?.escalate_to_human === true) {
    return true;
  }

  return false;
}

// Add to workflow
workflow.addNode("check_escalation", async (state: WorkflowState) => {
  if (shouldEscalateToHuman(state)) {
    // Create Slack notification
    await notifyHumanCoach({
      student_id: state.student_id,
      session_id: state.session_id,
      reason: 'Agent escalation',
      facts_collected: state.collected_facts,
      conversation_snippet: state.conversation_history.slice(-5)
    });

    return {
      current_response: "I've notified a human coach to help you. They'll reach out within 24 hours.",
      agent_context: {
        ...state.agent_context,
        escalated: true
      }
    };
  }

  return state;
});
```

**Deliverables:**
- ✅ Redis checkpointing enabled
- ✅ Sessions resume from exact state
- ✅ Facts persist across sessions
- ✅ NSM tracking operational
- ✅ Human coach escalation working

---

## Success Metrics

### Phase 1 Success Criteria
- [ ] Assessment → GamePlan handover working (100% success rate)
- [ ] GamePlan → Execution handover working (100% success rate)
- [ ] GamePlan delegation to Awards/ECs working (parallel execution < 2s)
- [ ] Frontend shows agent transitions clearly
- [ ] Zero data loss during handovers

### Phase 2 Success Criteria
- [ ] Sessions resume after browser close (100% success rate)
- [ ] Facts persist across sessions (zero loss)
- [ ] NSM dashboard shows agent metrics
- [ ] Human coach escalation triggers correctly (< 5% false positives)

---

## Technical Architecture

### Workflow Graph (v33.0)

```
START
  ↓
load_state (load facts + history from DB)
  ↓
call_agent (call current agent with full context)
  ↓
save_facts (persist new facts to DB)
  ↓
check_escalation (human coach needed?)
  ↓
check_delegation (GamePlan needs specialists?)
  ├─ YES → call_specialists (parallel Awards/ECs/Programs)
  │         ↓
  │       merge results back
  │         ↓
  └─ NO  → check_handover (next agent?)
             ├─ YES → perform_handover (switch agent)
             │         ↓
             │       call_agent (loop)
             └─ NO  → END
```

### State Schema (v33.0)

```typescript
interface WorkflowState {
  // Identity
  student_id: string;
  session_id: string;

  // Memory
  conversation_history: ConversationMessage[];
  collected_facts: Record<string, any>;

  // Agent context
  agent_context: {
    current_agent: string;
    previous_agent?: string;
    current_phase: string;
    handover_pending: boolean;
    next_agent?: string;
    handover_reason?: string;
    delegation_active: boolean;
    delegation_targets?: string[];
    specialist_findings?: Record<string, any>;
    escalated?: boolean;
  };

  // Current turn results
  current_response?: string;
  current_metadata?: Record<string, any>;
  current_intelligence_triggered?: string[];
  current_confidence?: number;
}
```

---

## Migration Path

### From v32.0 to v33.0

**Zero Breaking Changes:**
- Existing single-agent sessions continue working
- New handover logic only activates when enabled
- Frontend backward compatible (degrades gracefully)

**Migration Steps:**
1. Deploy v33.0 backend (handover logic inactive)
2. Enable feature flag: `ENABLE_MULTIAGENT_HANDOVER=true`
3. Test with pilot users
4. Deploy frontend updates
5. Enable for all users

**Rollback Plan:**
- Set `ENABLE_MULTIAGENT_HANDOVER=false`
- System reverts to v32.0 behavior

---

## Files to Create

### New Files
1. `services/agent-framework/src/langgraph/handover-logic.ts` - Handover decision engine
2. `services/agent-framework/src/langgraph/escalation-logic.ts` - Human escalation detection
3. `services/agent-framework/src/langgraph/nsm-tracking.ts` - NSM outcome tracking
4. `services/agent-framework/migrations/033_agent_outcomes.sql` - NSM table
5. `unified-frontend/apps/unified-app/src/components/v26/HandoverNotification.tsx` - UI component
6. `unified-frontend/apps/unified-app/src/components/v26/AgentStatusBar.tsx` - UI component
7. `docs/guides/V33_MULTIAGENT_WORKFLOW_IMPLEMENTATION_PLAN.md` - This document

### Files to Modify
1. `services/agent-framework/src/langgraph/LangGraphOrchestratorV31.ts` - Add handover nodes
2. `services/agent-framework/src/langgraph/state.ts` - Extend agent_context fields
3. `unified-frontend/apps/unified-app/src/components/v26/MultiAgentsTabRedesigned.tsx` - Agent transitions UI
4. `services/agent-framework/src/routes/v26-multiagents.ts` - Session resume endpoint
5. `docs/PROD_FEATURE_RELEASE_DETAILS.md` - v33.0 section
6. `docs/MASTER_PROD_TECH_SPEC.md` - v33.0 version bump
7. `CHANGELOG.md` - v33.0 entry

---

## Risk Mitigation

### Risk 1: Handover Failures
**Mitigation:** Extensive logging + fallback to single-agent mode

### Risk 2: State Loss During Handover
**Mitigation:** Atomic state updates + Redis checkpointing

### Risk 3: Specialist Delegation Timeout
**Mitigation:** 5s timeout per specialist + graceful degradation

### Risk 4: Redis Downtime
**Mitigation:** Fallback to stateless mode + warning log

---

## Timeline

| Week | Focus | Deliverables |
|------|-------|--------------|
| Week 1 | Core handover (Assessment→GamePlan→Execution) | Handover nodes, conditional routing |
| Week 2 | Specialist delegation (GamePlan→Awards/ECs/Programs) | Parallel calls, findings merge |
| Week 3 | Frontend integration | Agent status UI, transitions, notifications |
| Week 4 | Infrastructure (checkpointing, NSM, escalation) | Redis, NSM table, human escalation |

---

## Next Steps

1. ✅ Review this plan with team
2. ⏳ Start Week 1: Implement handover decision logic
3. ⏳ Create `handover-logic.ts` file
4. ⏳ Add `check_handover` node to workflow
5. ⏳ Test Assessment → GamePlan handover

---

**Status:** Ready for Implementation
**Estimated Effort:** 4 weeks (3 weeks Phase 1 + 1 week Phase 2)
**Dependencies:** v32.0 (completed)
**Risk Level:** Low (building on stable v32.0 foundation)

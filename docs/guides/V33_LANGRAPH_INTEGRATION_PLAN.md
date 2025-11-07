# v33.0 LangGraph Integration Plan - Unifying Existing Multi-Agent Logic

**Version:** v33.0
**Date:** 2025-11-05
**Status:** Planning Complete - Integration Strategy
**Based On:** v32.0 (LangGraph StateChannels Fixed) + Existing v26 Multi-Agent Implementation

---

## Executive Summary

**CRITICAL REALIZATION:** The multi-agent handover and delegation logic **is already implemented** in the v26 codebase!

### What Already Exists (v26/v29 Implementation)

✅ **Assessment → GamePlan Handover**
- `AssessmentAgentV3ConversationalRealtime.ts:840-854`
- Triggers when `synthesis_delivered = true` + sufficient depth
- Returns `a2a_handover_complete: true` with handover_payload
- Frontend shows agent transition in MultiAgentsTabRedesigned.tsx

✅ **GamePlan → Awards/ECs Delegation**
- `GamePlanAgentV3.ts:65,75` - Has `AgentDelegator` instance
- `AgentDelegator.ts` - Handles parallel specialist calls
- `HandoverPayloadExtractor.ts` - Normalizes Assessment data for GamePlan
- Frontend shows "delegating" status in agent cards

✅ **Frontend Multi-Agent UI**
- `MultiAgentsTabRedesigned.tsx` - Agent cards with handover states
- Agent status: `'ready' | 'active' | 'handed_off' | 'delegating'`
- Handover info tracking (handedTo, handoverId, timestamp)
- Grayscale effect for handed-off agents

✅ **Backend Orchestration**
- `V26AgentWrapperReal.ts` - Routes messages to correct agents
- `v26-multiagents.ts` routes - Handle handover metadata
- Phase mapping: assessment → gameplan → execution

### The Problem

**The v26 implementation got BROKEN when we switched to LangGraph v31.4!**

Why? Because LangGraph v31.4 workflow is **single-agent only**:
```typescript
workflow.addEdge("call_agent", END);  // Immediately ends after one agent call
```

The v26 handover logic sets `a2a_handover_complete: true` and `next_agent`, but **LangGraph workflow doesn't respect this** - it just ends the workflow.

---

## The Real Problem Statement

**We don't need to implement multi-agent workflow from scratch.**
**We need to INTEGRATE the existing v26 handover/delegation logic INTO the LangGraph v31.4 workflow.**

---

## v33.0 Integration Strategy

### Goal

**Make LangGraph v31.4 orchestration respect and execute the existing v26 handover/delegation decisions.**

### Approach

**Thin Adapter Pattern:**
- LangGraph workflow reads handover metadata from agent responses
- Executes handover by switching `agent_context.current_agent`
- Loops back to call the next agent
- **Zero changes to existing agents** (they already work!)

---

## Implementation Plan (2 Weeks, Not 4!)

### Week 1: LangGraph Handover Integration

#### Day 1-2: Add Handover Detection Node

**File:** `services/agent-framework/src/langgraph/LangGraphOrchestratorV31.ts`

Add node after `call_agent`:

```typescript
workflow.addNode("detect_handover", async (state: WorkflowState) => {
  // Check if agent response contains handover metadata
  const metadata = state.current_metadata;

  if (metadata?.a2a_handover_complete === true) {
    const nextAgent = metadata.agent_id;  // e.g., 'gameplan-agent'
    const handoverId = metadata.handover_id;
    const handoverPayload = metadata.handover_payload;

    log.event('handover.detected', {
      from_agent: state.agent_context.current_agent,
      to_agent: nextAgent,
      handover_id: handoverId,
      payload_keys: Object.keys(handoverPayload || {})
    });

    return {
      agent_context: {
        ...state.agent_context,
        handover_pending: true,
        next_agent: nextAgent,
        handover_id: handoverId,
        handover_payload: handoverPayload
      }
    };
  }

  return {
    agent_context: {
      ...state.agent_context,
      handover_pending: false
    }
  };
});

// Replace direct edge to END
workflow.addEdge("call_agent", "detect_handover");
```

#### Day 3-4: Add Conditional Routing

```typescript
workflow.addConditionalEdges(
  "detect_handover",
  (state: WorkflowState) => {
    if (state.agent_context.handover_pending) {
      return "execute_handover";
    }
    return "end";
  },
  {
    execute_handover: "execute_handover",
    end: END
  }
);
```

#### Day 5: Add Handover Execution Node

```typescript
workflow.addNode("execute_handover", async (state: WorkflowState) => {
  const nextAgent = state.agent_context.next_agent!;
  const handoverId = state.agent_context.handover_id!;
  const handoverPayload = state.agent_context.handover_payload;

  log.event('handover.executing', {
    from_agent: state.agent_context.current_agent,
    to_agent: nextAgent,
    handover_id: handoverId
  });

  // Create system message for handover
  const handoverMessage: ConversationMessage = {
    role: 'system',
    content: `[HANDOVER] Assessment complete. Transitioning to GamePlan Agent. Handover ID: ${handoverId}`,
    timestamp: new Date().toISOString(),
    metadata: {
      handover: true,
      handover_id: handoverId,
      from_agent: state.agent_context.current_agent,
      to_agent: nextAgent,
      payload: handoverPayload
    }
  };

  // Switch to next agent
  return {
    conversation_history: [...state.conversation_history, handoverMessage],
    agent_context: {
      ...state.agent_context,
      current_agent: nextAgent,
      previous_agent: state.agent_context.current_agent,
      handover_pending: false,
      handover_payload: handoverPayload  // Preserve for next agent
    }
  };
});

// Loop back to call new agent
workflow.addEdge("execute_handover", "call_agent");
```

**Test:** Assessment completes → Automatically calls GamePlan

---

### Week 2: Delegation Integration + Frontend Sync

#### Day 6-7: Detect Delegation Requests

GamePlan agent already has `AgentDelegator` but doesn't trigger it in LangGraph context. We need to check metadata for delegation needs:

```typescript
workflow.addNode("detect_delegation", async (state: WorkflowState) => {
  const metadata = state.current_metadata;
  const currentAgent = state.agent_context.current_agent;

  // Only GamePlan can delegate
  if (currentAgent !== 'gameplan-agent' && currentAgent !== 'gameplan-agent-v18') {
    return { agent_context: { ...state.agent_context, delegation_active: false } };
  }

  // Check if metadata requests delegation
  const needsAwards = metadata?.needs_awards_consultation === true;
  const needsECs = metadata?.needs_ec_consultation === true;

  if (needsAwards || needsECs) {
    log.event('delegation.detected', {
      agent: currentAgent,
      needs_awards: needsAwards,
      needs_ecs: needsECs
    });

    return {
      agent_context: {
        ...state.agent_context,
        delegation_active: true,
        delegation_targets: [
          needsAwards && 'awards-agent-v18',
          needsECs && 'extracurriculars-agent-v18'
        ].filter(Boolean) as string[]
      }
    };
  }

  return { agent_context: { ...state.agent_context, delegation_active: false } };
});

workflow.addEdge("detect_handover", "detect_delegation");
```

#### Day 8-9: Execute Parallel Delegation

```typescript
workflow.addConditionalEdges(
  "detect_delegation",
  (state: WorkflowState) => {
    if (state.agent_context.delegation_active) {
      return "execute_delegation";
    }
    return "end";
  },
  {
    execute_delegation: "execute_delegation",
    end: END
  }
);

workflow.addNode("execute_delegation", async (state: WorkflowState) => {
  const targets = state.agent_context.delegation_targets || [];

  log.event('delegation.executing', {
    agent: state.agent_context.current_agent,
    targets
  });

  // Call specialists in parallel
  const results = await Promise.all(
    targets.map(async (agentId) => {
      const tool = this.tools.get(agentId);
      if (!tool) {
        log.error('delegation.tool_not_found', { agent_id: agentId });
        return null;
      }

      try {
        const result = await tool.func({
          student_id: state.student_id,
          session_id: state.session_id,
          message: `Find opportunities for student based on profile: ${JSON.stringify(state.collected_facts)}`,
          conversation_history: state.conversation_history,
          collected_facts: state.collected_facts,
          agent_context: state.agent_context,
          is_delegation: true
        });

        const parsed = parseAgentToolResult(result as string);
        return { agent: agentId, ...parsed };
      } catch (error) {
        log.error('delegation.call_failed', {
          agent_id: agentId,
          error: String(error)
        });
        return null;
      }
    })
  );

  // Filter out failed calls
  const successfulResults = results.filter(r => r !== null);

  log.event('delegation.complete', {
    targets_count: targets.length,
    successful_count: successfulResults.length
  });

  return {
    agent_context: {
      ...state.agent_context,
      delegation_active: false,
      specialist_findings: successfulResults.reduce((acc, r) => {
        if (!r) return acc;
        return { ...acc, [r.agent]: r };
      }, {})
    }
  };
});

workflow.addEdge("execute_delegation", END);
```

#### Day 10: Frontend Sync

Update `MultiAgentsTabRedesigned.tsx` to show LangGraph transitions:

```typescript
// Extract handover events from metadata
const handoverEvents = messages
  .filter(m => m.metadata?.handover === true)
  .map(m => ({
    from_agent: m.metadata.from_agent,
    to_agent: m.metadata.to_agent,
    handover_id: m.metadata.handover_id,
    timestamp: m.timestamp
  }));

// Show handover timeline
{handoverEvents.map((event) => (
  <HandoverEvent key={event.handover_id}>
    <span className="from-agent">{event.from_agent}</span>
    <span className="arrow">→</span>
    <span className="to-agent">{event.to_agent}</span>
    <span className="timestamp">{formatTime(event.timestamp)}</span>
  </HandoverEvent>
))}
```

---

## Final Architecture (v33.0)

### LangGraph Workflow

```
START
  ↓
load_state (load facts + history)
  ↓
call_agent (call current agent - EXISTING v26 AGENT LOGIC RUNS HERE)
  ↓
detect_handover (check metadata.a2a_handover_complete)
  ├─ YES → execute_handover (switch agent) → call_agent (loop)
  └─ NO  → detect_delegation (check metadata.needs_*_consultation)
             ├─ YES → execute_delegation (parallel specialist calls) → END
             └─ NO  → END
```

### What Agents See (No Changes!)

From the agent's perspective, **nothing changes**:
- Assessment Agent still sets `a2a_handover_complete: true`
- GamePlan Agent still has `AgentDelegator` instance
- All existing v26 logic intact

**LangGraph just becomes the orchestrator that executes their decisions.**

---

## Success Criteria

### Week 1 Success
- [ ] Assessment completes → LangGraph detects handover
- [ ] LangGraph switches to GamePlan agent
- [ ] GamePlan receives full handover_payload
- [ ] Test: Assessment → GamePlan transition working

### Week 2 Success
- [ ] GamePlan requests delegation → LangGraph detects
- [ ] LangGraph calls Awards + ECs in parallel
- [ ] GamePlan receives specialist findings
- [ ] Frontend shows agent transitions
- [ ] Test: End-to-end Assessment → GamePlan → (Awards+ECs delegation)

---

## Why This Is Better Than v33.0 Original Plan

| Aspect | Original v33.0 Plan | Revised Plan |
|--------|---------------------|--------------|
| Timeline | 4 weeks | 2 weeks |
| Agent changes | Implement handover logic | Zero (already exists!) |
| Delegation | Build from scratch | Integrate existing AgentDelegator |
| Frontend | Build new UI | Update existing MultiAgentsTab |
| Risk | High (new implementation) | Low (just integration) |
| Testing | All new paths | Test existing + integration layer |

---

## Migration Path

### Phase 1: Enable Handover (Week 1)
1. Deploy LangGraph handover nodes
2. Feature flag: `LANGGRAPH_HANDOVER_ENABLED=true`
3. Test with pilot users
4. Monitor for handover failures

### Phase 2: Enable Delegation (Week 2)
1. Deploy delegation nodes
2. Feature flag: `LANGGRAPH_DELEGATION_ENABLED=true`
3. Test GamePlan → Awards/ECs delegation
4. Full rollout

### Rollback
- Set flags to `false`
- System reverts to v32.0 behavior (single-agent only)

---

## Files to Create

1. ✅ `docs/guides/V33_LANGRAPH_INTEGRATION_PLAN.md` (this file)

## Files to Modify

1. `services/agent-framework/src/langgraph/LangGraphOrchestratorV31.ts`
   - Add `detect_handover` node
   - Add `execute_handover` node
   - Add `detect_delegation` node
   - Add `execute_delegation` node
   - Update workflow edges

2. `services/agent-framework/src/langgraph/state.ts`
   - Extend `agent_context` with:
     - `handover_pending: boolean`
     - `next_agent?: string`
     - `handover_id?: string`
     - `handover_payload?: any`
     - `delegation_active: boolean`
     - `delegation_targets?: string[]`
     - `specialist_findings?: Record<string, any>`

3. `unified-frontend/apps/unified-app/src/components/v26/MultiAgentsTabRedesigned.tsx`
   - Add handover event timeline
   - Update agent status indicators
   - Show delegation progress

4. `docs/PROD_FEATURE_RELEASE_DETAILS.md` - v33.0 section
5. `docs/MASTER_PROD_TECH_SPEC.md` - v33.0 version bump
6. `CHANGELOG.md` - v33.0 entry

---

## Risk Mitigation

### Risk 1: Agent metadata format mismatch
**Mitigation:** Validate metadata fields exist before accessing

### Risk 2: Infinite handover loops
**Mitigation:** Track handover chain depth, max 3 hops

### Risk 3: Delegation timeout
**Mitigation:** 5s timeout per specialist, continue if partial results

---

## Key Insight

**The v26 multi-agent system was working before we introduced LangGraph.**

**We don't need to rebuild it. We just need to make LangGraph execute what the agents are already telling us to do.**

**This is an INTEGRATION problem, not an IMPLEMENTATION problem.**

---

## Next Steps

1. ✅ Review this revised plan
2. ⏳ Start Week 1 Day 1: Add `detect_handover` node
3. ⏳ Test with existing Assessment → GamePlan handover
4. ⏳ Verify handover_payload flows correctly
5. ⏳ Week 2: Add delegation nodes

---

**Status:** Ready for Integration
**Estimated Effort:** 2 weeks (10 engineering days)
**Dependencies:** v32.0 (completed)
**Risk Level:** Low (integrating existing working code)
**Confidence:** High (95% - existing logic proven in v26)

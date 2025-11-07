# V31.4: Clean Orchestration Architecture

**Date:** 2025-11-04
**Version:** v31.4
**Focus:** Simplify orchestration, remove unnecessary layers

---

## Problem Statement

Current v26 multi-agent system has **4+ orchestration layers** with:
- Metadata loss between layers
- Complex JSON serialization/parsing
- Feature flag complexity
- Multiple wrapper classes
- Difficult to debug

**Root Cause:** We're using LangGraph (designed for complex multi-agent workflows) for simple single-agent calls.

---

## Clean Architecture Design

### Principle: Use the Right Tool for the Right Job

```
Simple Single-Agent Call → Direct Agent Call (fast, simple)
Complex Multi-Agent Workflow → LangGraph (tracing, parallelization)
```

### New Flow

```
REQUEST
  ↓
Route Handler (v26-multiagents.ts)
  ↓
┌─────────────────────────────┐
│  Is this a complex workflow? │
│  (multi-agent, parallel, etc)│
└──────────┬──────────────────┘
           │
    ┌──────┴──────┐
    NO            YES
    │             │
    ▼             ▼
Direct Call    LangGraph
(simple)       (complex)
    │             │
    └──────┬──────┘
           ▼
      Real Agent
```

---

## Layer Breakdown

### Layer 1: Route Handler (SIMPLIFIED)

**File:** `routes/v26-multiagents.ts`

**Responsibilities:**
- Parse request
- Map real → clone student
- Save user message
- **Route based on WORKFLOW COMPLEXITY** (not feature flag)
- Save agent response
- Return to frontend

**Changes:**
- Remove feature flag check
- Add workflow complexity detection
- Direct agent call for simple cases

### Layer 2A: Direct Agent Call (NEW - for simple cases)

**New Pattern:**

```typescript
// For simple single-agent calls
const agent = agentRegistry.getAgent(agentId);
const agentResponse = await agent.handleQuery({
  entity_id: cloneStudentId,
  session_id,
  query: message
});

// That's it! No wrappers, no serialization
```

**Benefits:**
- Zero overhead
- Direct metadata passing (no loss)
- Easy to debug
- Fast

### Layer 2B: LangGraph (ONLY for complex workflows)

**Use Cases:**
- GamePlan agent delegating to Awards + ECs in parallel
- Multi-step workflows with state
- Workflows requiring tracing/observability

**Not Used For:**
- Single agent calls
- Simple request-response

---

## Implementation Plan

### Step 1: Create Simple Agent Caller

```typescript
// File: src/orchestration/SimpleAgentCaller.ts

export class SimpleAgentCaller {
  private agentRegistry: AgentRegistry;
  private pool: Pool;

  async callAgent(params: {
    agentId: string;
    studentId: string;
    sessionId: string;
    message: string;
    conversationHistory?: ConversationMessage[];
  }): Promise<AgentResponse> {

    // Get agent from registry
    const agent = this.agentRegistry.getAgent(params.agentId);

    // Build query
    const query: AgentQuery = {
      entity_id: params.studentId,
      session_id: params.sessionId,
      query: params.message,
      metadata: {
        conversation_history: params.conversationHistory
      }
    };

    // Call agent directly - NO WRAPPERS
    const response = await agent.handleQuery(query);

    // Return with full metadata preserved
    return response;
  }
}
```

**Key:** Direct call, zero transformations, metadata preserved.

### Step 2: Update Route Handler

```typescript
// File: routes/v26-multiagents.ts

// Determine if this requires complex orchestration
const needsComplexOrchestration =
  agentId === 'gameplan-agent' && shouldDelegate(message);

let agentResponse: AgentResponse;

if (needsComplexOrchestration) {
  // Use LangGraph for complex workflows
  agentResponse = await langGraphOrchestrator.handleMessage({
    student_id: cloneStudentId,
    session_id,
    message,
    agent_id: agentId
  });
} else {
  // Use simple direct call (90% of cases)
  agentResponse = await simpleAgentCaller.callAgent({
    agentId,
    studentId: cloneStudentId,
    sessionId: session_id,
    message,
    conversationHistory: await getConversationHistory(session_id)
  });
}

// Save and return response
// Metadata is preserved in both paths
```

### Step 3: Remove Unnecessary Code

**Files to REMOVE:**
1. `agents/V26AgentWrapper.ts` (fake stub - unused)
2. `config/featureFlags.ts` (no longer need gradual rollout)
3. `migrations/031_feature_flags.sql` (can archive)

**Files to KEEP:**
1. `agents/V26AgentWrapperReal.ts` → RENAME to `agents/AgentRegistry.ts`
   - Keep student mapping logic
   - Keep conversation history loading
   - Keep intent classification
   - Remove wrapper abstraction

2. `langgraph/LangGraphOrchestrator.ts` (for complex workflows)
3. `langgraph/AgentToolWrapper.ts` (for LangGraph tools)

### Step 4: Simplify V26AgentWrapperReal

**Current:** Acts as a wrapper with complex routing

**Simplified:** Becomes a utility class

```typescript
// File: src/orchestration/AgentOrchestrationUtils.ts

export class AgentOrchestrationUtils {

  // Keep these useful utilities:
  static mapToCloneStudent(studentId: string): string { ... }

  static async loadConversationHistory(
    pool: Pool,
    sessionId: string
  ): Promise<ConversationMessage[]> { ... }

  static classifyIntent(
    message: string,
    history: ConversationMessage[]
  ): string { ... }
}
```

---

## Metadata Flow (Simplified)

### Before (v31.3):

```
Agent
  → metadata: { data_collected_so_far: {...} }
  ↓
AgentToolWrapper
  → JSON.stringify(metadata) ⚠️ potential loss
  ↓
LangGraph call_agent
  → JSON.parse(result) ⚠️ potential loss
  ↓
LangGraph handleMessage
  → spread agent_metadata ⚠️ shallow copy
  ↓
Route Handler
  → agentResponse.metadata ⚠️ may be empty
  ↓
Frontend
  ❌ data_collected_so_far MISSING
```

### After (v31.4):

```
Agent
  → metadata: { data_collected_so_far: {...} }
  ↓
(no transformations)
  ↓
Route Handler
  → agentResponse.metadata ✅ full object
  ↓
Frontend
  ✅ data_collected_so_far PRESENT
```

---

## Benefits

### 1. Simplicity
- 50% less orchestration code
- No JSON serialization/parsing
- No feature flags
- Easy to understand

### 2. Performance
- Zero overhead for simple calls
- Direct function call
- No Redis checkpointing needed for single-agent

### 3. Reliability
- Direct metadata passing
- No transformation layers
- No loss of data

### 4. Maintainability
- Clear separation: simple vs complex
- Easy to debug
- Fewer files to understand

### 5. Still Powerful
- LangGraph available for complex workflows
- Parallel delegation still works
- Tracing available when needed

---

## Migration Strategy

### Phase 1: Add Simple Caller (No Breaking Changes)

1. Create `SimpleAgentCaller` class
2. Add to route handler as alternative path
3. Test with Assessment Agent
4. Verify metadata preservation

### Phase 2: Switch Default (Gradual)

1. Make simple caller the default
2. Use LangGraph only for flagged workflows
3. Monitor for issues
4. Roll back if problems

### Phase 3: Clean Up

1. Remove `V26AgentWrapper.ts` (fake stub)
2. Remove feature flags
3. Simplify `V26AgentWrapperReal` → utility class
4. Update documentation

---

## Code Structure (After)

```
src/
├── routes/
│   └── v26-multiagents.ts (simplified routing)
│
├── orchestration/
│   ├── SimpleAgentCaller.ts (NEW - direct calls)
│   ├── AgentRegistry.ts (renamed from V26AgentWrapperReal)
│   └── AgentOrchestrationUtils.ts (utilities)
│
├── langgraph/ (ONLY for complex workflows)
│   ├── LangGraphOrchestrator.ts
│   ├── AgentToolWrapper.ts
│   └── MultiAgentCollaborationFramework.ts
│
├── agents/
│   ├── registry.ts (agent lookup)
│   └── v18/ (actual agents - UNCHANGED)
│
└── config/
    └── (remove featureFlags.ts)
```

---

## What Stays Unchanged

✅ **All Agents** - Zero changes to agent code
✅ **Intelligence Types** - All work exactly the same
✅ **Database Schema** - No migration needed
✅ **Frontend** - Same API contract
✅ **Student Mapping** - Still maps real → clone
✅ **Conversation History** - Still loaded

---

## Testing Strategy

### 1. Unit Tests
- SimpleAgentCaller direct call
- Metadata preservation
- Agent response format

### 2. Integration Tests
- Assessment Agent full flow
- GamePlan Agent with delegation
- Metadata end-to-end

### 3. Comparison Test
- Run same request through old and new paths
- Compare responses
- Verify metadata matches

---

## Success Criteria

1. ✅ Assessment Agent `data_collected_so_far` reaches frontend
2. ✅ 50% less orchestration code
3. ✅ No changes to agent implementations
4. ✅ All intelligence types work
5. ✅ GamePlan parallel delegation still works
6. ✅ Response time improved (no serialization overhead)

---

## Risk Mitigation

**Risk:** Breaking existing functionality
**Mitigation:** Add simple caller alongside existing system, switch gradually

**Risk:** Losing LangGraph benefits
**Mitigation:** Keep LangGraph for complex workflows where it adds value

**Risk:** Metadata still lost
**Mitigation:** Direct object passing eliminates transformation layers

---

## Next Steps

1. Implement `SimpleAgentCaller` class
2. Add to routes as alternative path
3. Test with Assessment Agent
4. Verify metadata preservation
5. Gradually switch over
6. Clean up old code

---

**This design prioritizes simplicity while keeping advanced features available when needed.**

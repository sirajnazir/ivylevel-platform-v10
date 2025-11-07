# v31.5: State-First Architecture - The Proper Solution

**Date:** 2025-11-05
**Status:** Design Document
**Goal:** Redesign v31.4 using first principles - facts live in LangGraph state, not DB queries

---

## Problem with v31.4

**Current Approach:** Query database for facts on EVERY conversation turn
**Result:** Slow, complex, fights against LangGraph's design

**Root Cause:** Trying to use DB as primary source of truth during a session

---

## First Principles: Where Should Facts Live?

### During a Conversation Session
**Answer:** In LangGraph State (in-memory)

**Why:**
- ✅ Fast (no DB latency)
- ✅ Sequential consistency (no race conditions)
- ✅ Shared across all agents in workflow
- ✅ Built-in with LangGraph StateGraph
- ✅ Can checkpoint/restore automatically

### Between Sessions
**Answer:** In Database (persistent storage)

**Why:**
- ✅ Survives server restarts
- ✅ Can query across students
- ✅ Audit trail
- ✅ Analytics/reporting

---

## The Proper Architecture

```
┌──────────────────────────────────────────────────────────────┐
│ SESSION LIFECYCLE                                             │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ 1. SESSION START                                             │
│    ├─ Load facts from DB (ONE TIME)                          │
│    └─ Seed state.collected_facts                             │
│                                                               │
│ 2. CONVERSATION TURNS (all in-memory)                        │
│    ├─ Turn 1                                                 │
│    │  ├─ Extract new facts from message                      │
│    │  ├─ Merge into state.collected_facts                    │
│    │  └─ Generate response with ALL facts                    │
│    ├─ Turn 2                                                 │
│    │  ├─ Extract new facts                                   │
│    │  ├─ Merge into state (cumulative!)                      │
│    │  └─ Response sees facts from Turn 1 + Turn 2            │
│    └─ Turn N...                                              │
│                                                               │
│ 3. SESSION END (or periodic checkpoint)                      │
│    └─ Save state.collected_facts → DB                        │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Implementation Guide

### 1. State Channel Configuration

**File:** `/services/agent-framework/src/langgraph/state.ts`

```typescript
export const StateChannels = {

  // Facts accumulate here during session
  collected_facts: {
    value: (prev: FactSet, next: FactSet) => {
      // Deep merge: combine all categories
      return {
        profile: { ...prev.profile, ...next.profile },
        academics: { ...prev.academics, ...next.academics },
        extracurriculars: { ...prev.extracurriculars, ...next.extracurriculars },
        awards: { ...prev.awards, ...next.awards },
        goals: { ...prev.goals, ...next.goals },
        context: { ...prev.context, ...next.context }
      };
    },
    default: () => ({
      profile: {},
      academics: {},
      extracurriculars: {},
      awards: {},
      goals: {},
      context: {}
    })
  }
};
```

**Status in v31.4:** ✅ EXISTS but uses shallow merge
**Fix Needed:** Deep merge for nested fact categories

---

### 2. Load Facts from DB ONCE at Session Start

**File:** `/services/agent-framework/src/langgraph/LangGraphOrchestratorV31.ts`

**Node:** `load_state`

```typescript
workflow.addNode("load_state", async (state: WorkflowState) => {

  // Only load from DB if state.collected_facts is empty
  // (first turn of session)
  if (!state.collected_facts || Object.keys(state.collected_facts).length === 0) {

    console.log('[LOAD_STATE] Loading facts from DB for student:', state.student_id);

    const facts = await this.pool.query(`
      SELECT category, key, value, confidence, created_at
      FROM kb_items
      WHERE student_id = $1
        AND source_ref = 'gpt4o_conversational_extraction_v28'
      ORDER BY created_at ASC
    `, [state.student_id]);

    // Group facts by category
    const factSet: FactSet = {
      profile: {},
      academics: {},
      extracurriculars: {},
      awards: {},
      goals: {},
      context: {}
    };

    for (const row of facts.rows) {
      const category = row.category as keyof FactSet;
      factSet[category][row.key] = {
        value: row.value,
        confidence: row.confidence,
        extracted_at: row.created_at
      };
    }

    console.log('[LOAD_STATE] Loaded facts:', {
      total: facts.rows.length,
      by_category: Object.keys(factSet).map(cat =>
        `${cat}: ${Object.keys(factSet[cat]).length}`
      )
    });

    // Seed state with DB facts
    state.collected_facts = factSet;
  }

  return state;  // Pass state forward with facts
});
```

**Status in v31.4:** ✅ EXISTS and works correctly
**Issue:** `state.student_id` is undefined, so query returns 0 rows

---

### 3. Agent Node: Read Facts from State, Not DB

**File:** `/services/agent-framework/src/langgraph/LangGraphOrchestratorV31.ts`

**Node:** `call_agent`

```typescript
workflow.addNode("call_agent", async (state: WorkflowState) => {

  const currentAgent = state.agent_context.current_agent;
  const tool = this.tools.get(currentAgent);

  console.log('[CALL_AGENT] Calling agent with state facts:', {
    agent: currentAgent,
    facts_in_state: Object.keys(state.collected_facts || {}).length
  });

  // Call agent - it extracts NEW facts
  const result = await tool.func({
    student_id: state.student_id,  // ← CRITICAL: Must pass this
    session_id: state.session_id,
    message: lastMessage.content,

    // Pass existing facts from STATE
    conversation_history: state.conversation_history,
    collected_facts: state.collected_facts,  // ← Agent sees all facts
    agent_context: state.agent_context
  });

  const parsed = parseAgentToolResult(result as string);

  // Extract new facts from agent response
  const newFacts = parsed.metadata?.data_collected_so_far || {};

  // Merge NEW facts into EXISTING facts (cumulative)
  const mergedFacts = {
    profile: { ...state.collected_facts.profile, ...newFacts.profile },
    academics: { ...state.collected_facts.academics, ...newFacts.academics },
    // ... other categories
  };

  console.log('[CALL_AGENT] Facts after merge:', {
    facts_before: Object.keys(state.collected_facts || {}).length,
    new_facts: Object.keys(newFacts).length,
    facts_after: Object.keys(mergedFacts).length
  });

  return {
    current_response: parsed.response,
    current_metadata: {
      ...parsed.metadata,
      data_collected_so_far: mergedFacts  // ← Include ALL facts in metadata
    },
    collected_facts: mergedFacts  // ← Update state
  };
});
```

**Status in v31.4:** ⚠️ PARTIAL
- ✅ Merges facts: `{ ...state.collected_facts, ...newFacts }`
- ❌ But `newFacts` is empty because agent doesn't receive facts properly

---

### 4. Fix Agent Tool Wrapper to Pass student_id

**File:** `/services/agent-framework/src/langgraph/AgentToolWrapper.ts`

**Current code (line 100):**
```typescript
const query: AgentQuery = {
  entity_id: input.student_id,  // ← Maps student_id → entity_id
  session_id: input.session_id,
  query: input.message,
  // ...
};
```

**Problem:** The `input` object might not have `student_id` field!

**Fix:** Add debug logging and verify input structure:

```typescript
console.log('[AGENT_TOOL_WRAPPER] Input received:', {
  has_student_id: !!input.student_id,
  has_entity_id: !!input.entity_id,
  student_id_value: input.student_id,
  input_keys: Object.keys(input)
});

const query: AgentQuery = {
  entity_id: input.student_id || input.entity_id,  // ← Fallback
  session_id: input.session_id,
  query: input.message,
  metadata: {
    conversation_history: input.conversation_history,
    collected_facts: input.collected_facts,  // ← Pass facts to agent
    agent_context: input.agent_context
  }
};

console.log('[AGENT_TOOL_WRAPPER] Query created:', {
  entity_id: query.entity_id,
  has_metadata: !!query.metadata,
  has_collected_facts: !!query.metadata?.collected_facts
});
```

**Status in v31.4:** ❌ BROKEN
- `input.student_id` is undefined
- Need to trace where input comes from

---

### 5. Save Facts to DB at Session End

**File:** `/services/agent-framework/src/routes/v26-multiagents.ts`

```typescript
router.post('/agents/:agentId/message', async (req, res) => {

  const { message, student_id, session_id } = req.body;

  // Run workflow
  const result = await orchestrator.handleMessage({
    student_id: cloneStudentId,
    session_id,
    message
  });

  // ✅ Save facts to DB after workflow completes
  if (result.current_metadata?.data_collected_so_far) {
    await saveFactsToDB(
      cloneStudentId,
      result.current_metadata.data_collected_so_far
    );
  }

  res.json({
    agent_response: result.current_response,
    metadata: result.current_metadata
  });
});

async function saveFactsToDB(
  studentId: string,
  factSet: FactSet
): Promise<void> {

  // Upsert facts (update if exists, insert if new)
  for (const category of Object.keys(factSet) as (keyof FactSet)[]) {
    for (const [key, factValue] of Object.entries(factSet[category])) {
      await pool.query(`
        INSERT INTO kb_items (student_id, category, key, value, confidence, source_ref)
        VALUES ($1, $2, $3, $4, $5, 'gpt4o_conversational_extraction_v28')
        ON CONFLICT (student_id, key)
        DO UPDATE SET
          value = EXCLUDED.value,
          confidence = EXCLUDED.confidence,
          updated_at = NOW()
      `, [studentId, category, key, factValue.value, factValue.confidence]);
    }
  }
}
```

**Status in v31.4:** ❌ MISSING
- Facts are saved during extraction, not at end
- No cleanup/deduplication

---

## The student_id Bug: Root Cause

### Current Flow (BROKEN)

```
1. Route receives:
   student_id: "huda-2025"

2. Route maps to clone:
   cloneStudentId: "huda-v26-2025" ✅

3. Orchestrator receives:
   request.student_id: "huda-v26-2025" ✅

4. Creates initialState:
   state.student_id: "huda-v26-2025" ✅

5. Workflow invokes with initialState:
   state.student_id: "huda-v26-2025" ✅

6. call_agent node calls tool.func:
   input.student_id: ???  ❌ LOST HERE!

7. Agent Tool Wrapper creates query:
   query.entity_id: undefined  ❌

8. Assessment Agent receives:
   query.entity_id: undefined  ❌

9. Tries to load facts:
   SELECT * FROM kb_items WHERE student_id = undefined  → 0 rows
```

### Where is student_id Lost?

**Hypothesis:** The LangGraph tool invocation doesn't automatically pass state fields to tool input.

**LangGraph Tool Pattern:**
```typescript
// When you call tool.func(input)
// LangGraph doesn't automatically include state.student_id in input!
// You must explicitly pass it

const result = await tool.func({
  student_id: state.student_id,  // ← Must be explicit
  message: lastMessage.content,
  // ...
});
```

**Current code (line 264-274 in orchestrator):**
```typescript
const result = await tool.func({
  student_id: state.student_id,  // ← This line EXISTS!
  session_id: state.session_id,
  message: lastMessage.content,
  conversation_history: state.conversation_history,
  collected_facts: state.collected_facts,
  agent_context: state.agent_context,
  is_delegation: false
});
```

This looks CORRECT! So why is it undefined?

**Possible causes:**
1. TypeScript type mismatch (input type doesn't have student_id field)
2. Tool wrapper doesn't handle student_id parameter
3. LangGraph tool schema doesn't include student_id

---

## Debug Steps

### Step 1: Add Comprehensive Logging

**In `call_agent` node (line 257):**
```typescript
console.log('[CALL_AGENT] About to call tool.func with input:', {
  student_id: state.student_id,
  session_id: state.session_id,
  message_preview: lastMessage.content.substring(0, 50),
  has_collected_facts: !!state.collected_facts,
  facts_count: Object.keys(state.collected_facts || {}).length
});

const result = await tool.func({
  student_id: state.student_id,
  session_id: state.session_id,
  message: lastMessage.content,
  conversation_history: state.conversation_history,
  collected_facts: state.collected_facts,
  agent_context: state.agent_context,
  is_delegation: false
});
```

**In Agent Tool Wrapper (line 80):**
```typescript
async func(input: any): Promise<string> {
  console.log('[AGENT_TOOL_WRAPPER] func() called with input:', {
    student_id: input.student_id,
    entity_id: input.entity_id,
    session_id: input.session_id,
    message_preview: input.message?.substring(0, 50),
    input_keys: Object.keys(input),
    has_collected_facts: !!input.collected_facts
  });

  // ...rest of function
}
```

### Step 2: Check Tool Definition

LangGraph tools might have a schema that defines allowed parameters. Check if `student_id` is in the schema:

```typescript
// In wrapAgentAsTool function
const tool = new DynamicStructuredTool({
  name: toolName,
  description: description,
  schema: z.object({
    student_id: z.string(),  // ← Must be defined!
    session_id: z.string(),
    message: z.string(),
    conversation_history: z.any().optional(),
    collected_facts: z.any().optional(),
    agent_context: z.any().optional(),
    is_delegation: z.boolean().optional()
  }),
  func: async (input) => {
    // ...
  }
});
```

If `student_id` is NOT in the schema, LangGraph will drop it!

---

## Recommended Fix Priority

### Priority 1: Fix student_id Passing (1 hour)

**Task:** Ensure `student_id` flows from state → tool input → agent query

**Files to check:**
1. `LangGraphOrchestratorV31.ts` line 264 - Verify student_id passed
2. `AgentToolWrapper.ts` line 42 (schema) - Verify student_id in schema
3. `AgentToolWrapper.ts` line 80 (func) - Add logging
4. `AgentToolWrapper.ts` line 100 - Verify entity_id mapping

**Test:**
```
Send message → Check logs → Should see:
  [CALL_AGENT] student_id: "huda-v26-2025"
  [AGENT_TOOL_WRAPPER] input.student_id: "huda-v26-2025"
  [AGENT_TOOL_WRAPPER] query.entity_id: "huda-v26-2025"
  [V26.5_REALTIME] Student: "huda-v26-2025"
  [V26.5_REALTIME] Facts loaded: 1+
```

### Priority 2: Verify State Persistence (30 min)

**Task:** Confirm facts accumulate in state across turns

**Test:**
```
Turn 1: "I'm a junior"
  → state.collected_facts: { profile: { grade: "junior" } }
  → metadata.data_collected_so_far: { profile: { grade: "junior" } }

Turn 2: "I have a 3.8 GPA"
  → state.collected_facts: {
      profile: { grade: "junior" },
      academics: { gpa: 3.8 }
    }
  → metadata.data_collected_so_far: { ... } (same as state)
```

### Priority 3: Add DB Save at Workflow End (1 hour)

**Task:** Save state.collected_facts to DB after each message

**Why:** Current approach saves during extraction, but doesn't consolidate

**Implementation:** Add `saveFactsToDB()` call in route handler

---

## Expected Outcome

After fixes:

**Turn 1:**
```json
{
  "agent_response": "What grade are you in?",
  "metadata": {
    "data_collected_so_far": {},
    "overall_completion": 0
  }
}
```

**Turn 2: User says "11th grade"**
```json
{
  "agent_response": "What school do you attend?",
  "metadata": {
    "data_collected_so_far": {
      "profile": {
        "grade": { "value": 11, "confidence": 1.0 }
      }
    },
    "overall_completion": 7,  // 1/15 facts = 7%
    "total_facts_collected": 1
  }
}
```

**Turn 3: User says "Lincoln High"**
```json
{
  "agent_response": "What subjects interest you?",
  "metadata": {
    "data_collected_so_far": {
      "profile": {
        "grade": { "value": 11, "confidence": 1.0 },  // ✅ Still here!
        "school": { "value": "Lincoln High", "confidence": 1.0 }  // ✅ Added!
      }
    },
    "overall_completion": 13,  // 2/15 = 13%
    "total_facts_collected": 2
  }
}
```

---

## Summary

**The Architecture is Correct:** v31.4 already uses state-based fact management!

**The Bug is Tactical:** `student_id` gets lost somewhere between workflow state and agent query.

**The Fix is Simple:** Add logging, find where student_id drops, ensure it's passed through the chain.

**Time Estimate:** 2-3 hours to debug and fix student_id passing.

---

**Next Steps:**
1. Add debug logging to trace student_id flow
2. Fix the broken link in the chain
3. Test multi-turn fact accumulation
4. Document the working architecture

This is NOT a redesign - it's a debugging exercise to fix parameter passing.

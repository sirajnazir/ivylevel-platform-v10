# V31: Production-Grade Multi-Agent Orchestration

**Date:** 2025-11-04
**Version:** v31.4
**Vision:** Autonomous, proactive, human-level coaching agents with robust collaboration

---

## Vision & Requirements

### Core Vision
Build a **production-grade multi-agent system** that delivers:
- 🧠 **Human-level coaching intelligence** (83 intelligence types)
- 🤝 **Autonomous collaboration** between agents
- 📊 **Proactive guidance** based on student progress
- 🔄 **Adaptive learning** from student interactions
- 📈 **Scalable architecture** for 10,000+ students
- 🛡️ **Production reliability** (99.9% uptime)

### Non-Negotiable Requirements
1. ✅ **Keep all 83 intelligence types** - Our competitive advantage
2. ✅ **Keep FactStore** - Zero-hallucination fact retrieval
3. ✅ **Keep knowledge base** - 93 weeks of expert coaching
4. ✅ **Add proper memory** - State persists across sessions
5. ✅ **Add collaboration patterns** - Agents work together seamlessly
6. ✅ **Add observability** - Full tracing and debugging
7. ✅ **Add fault tolerance** - Automatic recovery from failures
8. ✅ **Add horizontal scaling** - Support thousands of concurrent users

---

## Architecture: Clean LangGraph-Based Orchestration

### Principle: Use LangGraph as Orchestration Layer, Keep Our Intelligence

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Request                          │
│  POST /api/v26/agents/{agent_id}/message                    │
│  { session_id, student_id, message }                         │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Route Handler (THIN)                        │
│  - Validate request                                          │
│  - Map real → clone student                                  │
│  - Forward to LangGraph Orchestrator                         │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│        LangGraph Orchestrator (CORE ORCHESTRATION)          │
│                                                              │
│  ┌────────────────────────────────────────────────────┐   │
│  │  Persistent State (Redis-backed)                   │   │
│  │  ─────────────────────────────────────────────     │   │
│  │  student_profile: {                                │   │
│  │    id, grade, school, interests, goals, ...        │   │
│  │  }                                                  │   │
│  │                                                      │   │
│  │  conversation_memory: [                            │   │
│  │    { role, content, timestamp, agent_id }          │   │
│  │  ]                                                  │   │
│  │                                                      │   │
│  │  collected_facts: {                                │   │
│  │    academic: { gpa, sat, courses, ... }            │   │
│  │    activities: [ ... ]                             │   │
│  │    awards: [ ... ]                                 │   │
│  │  }                                                  │   │
│  │                                                      │   │
│  │  agent_context: {                                  │   │
│  │    current_phase: 'assessment' | 'gameplan' | ...  │   │
│  │    assessment_progress: 0.75,                      │   │
│  │    last_proactive_check: timestamp,                │   │
│  │    delegation_status: { ... }                      │   │
│  │  }                                                  │   │
│  └────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌────────────────────────────────────────────────────┐   │
│  │  StateGraph Workflow (Multi-Agent Patterns)        │   │
│  │                                                      │   │
│  │  [load_state]                                       │   │
│  │      ↓                                              │   │
│  │  [classify_intent] → Route based on student need   │   │
│  │      ↓                                              │   │
│  │  [select_agent] → Assessment | GamePlan | ...      │   │
│  │      ↓                                              │   │
│  │  [call_agent] → Pass full context + memory         │   │
│  │      ↓                                              │   │
│  │  [extract_insights] → Update collected_facts       │   │
│  │      ↓                                              │   │
│  │  [check_delegation_needed]                         │   │
│  │      ↓                                              │   │
│  │  [delegate_parallel?] → Awards + ECs in parallel   │   │
│  │      ↓                                              │   │
│  │  [synthesize_response]                             │   │
│  │      ↓                                              │   │
│  │  [check_handover] → Hand off to next agent?        │   │
│  │      ↓                                              │   │
│  │  [save_state] → Checkpoint to Redis                │   │
│  │      ↓                                              │   │
│  │  [return]                                           │   │
│  └────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
            ▼               ▼               ▼
    ┌──────────────┐ ┌──────────┐ ┌──────────────┐
    │ Assessment   │ │ GamePlan │ │ Execution    │
    │ Agent        │ │ Agent    │ │ Agent        │
    │              │ │          │ │              │
    │ TYPE-080     │ │TYPE-081  │ │TYPE-049-063  │
    │ + EQ Layers  │ │+ 168hr   │ │+ Task Decomp │
    └──────┬───────┘ └────┬─────┘ └──────┬───────┘
           │              │               │
           └──────────────┼───────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │    FactStore          │
              │  (SQL-backed facts)   │
              │  - Zero hallucination │
              │  - Deterministic      │
              └───────────────────────┘
```

---

## Key Design Decisions

### 1. Remove V26 Wrapper Complexity

**Current Problem:**
- V26AgentWrapper (fake stub) - unused
- V26AgentWrapperReal - complex routing logic
- Feature flags - unnecessary complexity
- Multiple orchestration layers

**Solution:**
- ❌ **REMOVE** V26AgentWrapper (fake stub)
- ❌ **REMOVE** V26AgentWrapperReal as separate wrapper
- ❌ **REMOVE** feature flags (always use LangGraph)
- ✅ **KEEP** utility functions (student mapping, conversation loading)

**Result:** Single orchestration path through LangGraph

---

### 2. LangGraph as Universal Orchestrator

**Why LangGraph:**
- ✅ **Production-proven** (Klarna, Replit, Elastic use it)
- ✅ **State management** built-in (Redis checkpointing)
- ✅ **Memory management** (conversation history persists)
- ✅ **Fault tolerance** (retries, timeouts, circuit breakers)
- ✅ **Observability** (LangSmith tracing)
- ✅ **Collaboration patterns** (parallel, sequential, conditional)
- ✅ **Horizontal scaling** (distributed state)

**What We Keep:**
- ✅ All 83 intelligence types (unchanged)
- ✅ All agent implementations (unchanged)
- ✅ FactStore (unchanged)
- ✅ Knowledge base (unchanged)

**What Changes:**
- Agents wrapped as LangGraph tools
- State managed by LangGraph
- Routes simplified to thin layer

---

### 3. Proper State & Memory Management

#### State Structure

```typescript
// File: src/langgraph/state.ts

export interface WorkflowState {
  // ============================================================================
  // IDENTITY & SESSION
  // ============================================================================
  student_id: string;
  session_id: string;
  thread_id: string;  // For LangGraph checkpointing

  // ============================================================================
  // STUDENT PROFILE (persists across sessions)
  // ============================================================================
  student_profile: {
    // Academic
    grade?: number;
    high_school?: string;
    gpa?: number;
    sat_total?: number;
    act_composite?: number;

    // Activities & Awards
    activities_count?: number;
    awards_count?: number;
    tier_distribution?: { T1: number; T2: number; T3: number; T4: number };

    // Interests & Goals
    interests?: string[];
    target_colleges?: string[];
    intended_major?: string;

    // Demographics
    location?: string;
    family_income_bracket?: string;
  };

  // ============================================================================
  // CONVERSATION MEMORY (persists across turns)
  // ============================================================================
  conversation_history: Array<{
    role: 'user' | 'agent' | 'system';
    content: string;
    timestamp: Date;
    agent_id?: string;
    metadata?: Record<string, any>;
  }>;

  // ============================================================================
  // COLLECTED FACTS (cumulative across conversation)
  // ============================================================================
  collected_facts: {
    academic_foundation?: Record<string, any>;
    activities?: Array<any>;
    awards?: Array<any>;
    interests?: Array<string>;
    narrative?: Record<string, any>;
  };

  // ============================================================================
  // AGENT COORDINATION (current turn)
  // ============================================================================
  agent_context: {
    current_agent: string;
    current_phase: 'assessment' | 'gameplan' | 'execution' | 'complete';
    assessment_progress: number;  // 0.0 - 1.0
    gameplan_status?: 'not_started' | 'in_progress' | 'complete';

    // Delegation tracking
    delegation_active: boolean;
    delegated_to?: string[];
    delegation_results?: Record<string, any>;

    // Handover tracking
    handover_pending: boolean;
    handover_to?: string;
    handover_reason?: string;
  };

  // ============================================================================
  // CURRENT TURN OUTPUT
  // ============================================================================
  current_response?: string;
  current_metadata?: Record<string, any>;
  current_intelligence_triggered?: string[];
  current_confidence?: number;

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================
  error?: string;
  retry_count: number;
  last_error_timestamp?: Date;
}
```

#### State Management Benefits

1. **Persistent Memory** - Conversation history never lost
2. **Cumulative Facts** - Agent sees all previously collected data
3. **Agent Coordination** - Delegation and handover tracking
4. **Error Recovery** - Retry count and error handling
5. **Horizontal Scaling** - State stored in Redis, any instance can pick up

---

### 4. Workflow Nodes (Multi-Agent Patterns)

#### Node 1: Load State

```typescript
workflow.addNode("load_state", async (state: WorkflowState) => {
  // Load student profile from database if not in state
  if (!state.student_profile.grade) {
    const profile = await loadStudentProfile(state.student_id);
    state.student_profile = profile;
  }

  // Load conversation history if not in state
  if (state.conversation_history.length === 0) {
    const history = await loadConversationHistory(state.session_id);
    state.conversation_history = history;
  }

  // Load collected facts if not in state
  if (Object.keys(state.collected_facts).length === 0) {
    const facts = await loadCollectedFacts(state.student_id);
    state.collected_facts = facts;
  }

  return { ...state };
});
```

#### Node 2: Classify Intent & Route

```typescript
workflow.addNode("classify_intent", async (state: WorkflowState) => {
  const lastMessage = state.conversation_history[state.conversation_history.length - 1];

  // Intelligent routing based on:
  // - Current phase
  // - Student profile completeness
  // - Conversation context

  const intent = await classifyIntent(lastMessage.content, {
    currentPhase: state.agent_context.current_phase,
    assessmentProgress: state.agent_context.assessment_progress,
    conversationHistory: state.conversation_history
  });

  // Determine which agent to call
  let targetAgent = state.agent_context.current_agent;

  if (intent === 'complete_assessment' && state.agent_context.assessment_progress >= 0.8) {
    targetAgent = 'gameplan-agent-v18';
    state.agent_context.handover_pending = true;
    state.agent_context.handover_to = 'gameplan-agent-v18';
  } else if (intent === 'start_execution' && state.agent_context.gameplan_status === 'complete') {
    targetAgent = 'execution-agent';
    state.agent_context.handover_pending = true;
    state.agent_context.handover_to = 'execution-agent';
  }

  return {
    agent_context: {
      ...state.agent_context,
      current_agent: targetAgent
    }
  };
});
```

#### Node 3: Call Agent (with full context)

```typescript
workflow.addNode("call_agent", async (state: WorkflowState) => {
  const agentTool = tools.get(state.agent_context.current_agent);

  // 🔑 KEY: Pass FULL context to agent
  const result = await agentTool.func({
    student_id: state.student_id,
    session_id: state.session_id,
    message: state.conversation_history[state.conversation_history.length - 1].content,

    // MEMORY: Full conversation history
    conversation_history: state.conversation_history,

    // STATE: Student profile
    student_profile: state.student_profile,

    // CUMULATIVE: All collected facts
    collected_facts: state.collected_facts,

    // CONTEXT: Current phase and progress
    agent_context: state.agent_context
  });

  const parsed = parseAgentToolResult(result);

  // Extract new facts from this turn
  const newFacts = parsed.metadata?.data_collected_so_far || {};

  return {
    current_response: parsed.response,
    current_metadata: parsed.metadata,
    current_intelligence_triggered: parsed.intelligence_triggered,
    current_confidence: parsed.confidence,

    // Update collected facts (merge with existing)
    collected_facts: {
      ...state.collected_facts,
      ...newFacts
    },

    // Append agent response to conversation history
    conversation_history: [{
      role: 'agent',
      content: parsed.response,
      timestamp: new Date(),
      agent_id: state.agent_context.current_agent,
      metadata: parsed.metadata
    }]
  };
});
```

#### Node 4: Check Delegation Needed

```typescript
workflow.addNode("check_delegation", async (state: WorkflowState) => {
  // GamePlan agent may need to delegate to Awards + ECs specialists
  if (state.agent_context.current_agent === 'gameplan-agent-v18') {
    const needsAwardsHelp = state.student_profile.awards_count < 3;
    const needsECsHelp = state.student_profile.tier_distribution?.T1 === 0;

    if (needsAwardsHelp || needsECsHelp) {
      const delegateTo = [];
      if (needsAwardsHelp) delegateTo.push('awards-agent-v18');
      if (needsECsHelp) delegateTo.push('extracurriculars-agent-v18');

      return {
        agent_context: {
          ...state.agent_context,
          delegation_active: true,
          delegated_to: delegateTo
        }
      };
    }
  }

  return { agent_context: { ...state.agent_context, delegation_active: false } };
});
```

#### Node 5: Parallel Delegation

```typescript
workflow.addNode("delegate_parallel", async (state: WorkflowState) => {
  const delegatedAgents = state.agent_context.delegated_to || [];

  // Call all delegated agents in parallel
  const results = await Promise.all(
    delegatedAgents.map(async (agentId) => {
      const tool = tools.get(agentId);
      const result = await tool.func({
        student_id: state.student_id,
        session_id: state.session_id,
        message: 'generate strategic guidance',  // Delegation context
        student_profile: state.student_profile,
        collected_facts: state.collected_facts,
        is_delegation: true
      });
      return { agentId, result: parseAgentToolResult(result) };
    })
  );

  // Aggregate delegation results
  const delegationResults = results.reduce((acc, { agentId, result }) => {
    acc[agentId] = result;
    return acc;
  }, {} as Record<string, any>);

  return {
    agent_context: {
      ...state.agent_context,
      delegation_active: false,
      delegation_results: delegationResults
    }
  };
});
```

#### Node 6: Synthesize & Return

```typescript
workflow.addNode("synthesize", async (state: WorkflowState) => {
  let finalResponse = state.current_response;

  // If delegation happened, synthesize results
  if (state.agent_context.delegation_results) {
    const delegationResponses = Object.values(state.agent_context.delegation_results)
      .map((r: any) => r.response);

    // GamePlan agent synthesizes specialist responses
    const synthesisTool = tools.get('gameplan-agent-v18');
    const synthesisResult = await synthesisTool.func({
      student_id: state.student_id,
      session_id: state.session_id,
      message: 'synthesize delegation results',
      delegation_results: state.agent_context.delegation_results,
      student_profile: state.student_profile
    });

    const parsed = parseAgentToolResult(synthesisResult);
    finalResponse = parsed.response;
  }

  return {
    current_response: finalResponse
  };
});
```

#### Node 7: Save State (Checkpoint)

```typescript
workflow.addNode("save_state", async (state: WorkflowState) => {
  // LangGraph automatically checkpoints to Redis
  // This node just logs the checkpoint

  log.event('state.checkpoint', {
    session_id: state.session_id,
    conversation_turns: state.conversation_history.length,
    facts_collected: Object.keys(state.collected_facts).length,
    current_phase: state.agent_context.current_phase,
    assessment_progress: state.agent_context.assessment_progress
  });

  return state;
});
```

---

### 5. Conditional Edges (Workflow Routing)

```typescript
// Start → Load State
workflow.addEdge(START, "load_state");

// Load State → Classify Intent
workflow.addEdge("load_state", "classify_intent");

// Classify Intent → Call Agent
workflow.addEdge("classify_intent", "call_agent");

// Call Agent → Check Delegation
workflow.addEdge("call_agent", "check_delegation");

// Check Delegation → Either delegate or synthesize
workflow.addConditionalEdges(
  "check_delegation",
  (state) => state.agent_context.delegation_active ? "delegate_parallel" : "synthesize"
);

// Delegate Parallel → Synthesize
workflow.addEdge("delegate_parallel", "synthesize");

// Synthesize → Save State
workflow.addEdge("synthesize", "save_state");

// Save State → END
workflow.addEdge("save_state", END);
```

---

## Implementation Plan

### Phase 1: Foundation (Week 1)

**Goals:**
- Set up LangGraph + Redis infrastructure
- Define WorkflowState interface
- Wrap first agent (Assessment)

**Tasks:**
1. Install LangGraph, LangSmith, Redis
2. Create WorkflowState interface
3. Set up Redis checkpointer
4. Wrap Assessment Agent as tool
5. Create simple workflow (load → call → save)
6. Test state persistence

**Success Criteria:**
- ✅ State persists across requests
- ✅ Conversation history maintained
- ✅ LangSmith traces visible

---

### Phase 2: Memory & Facts (Week 2)

**Goals:**
- Implement proper memory loading
- Cumulative facts collection
- Agent receives full context

**Tasks:**
1. Create `load_state` node
2. Load conversation history from DB
3. Load collected facts from DB
4. Pass memory to agents via tool input
5. Update Assessment Agent to use memory
6. Test infinite loop fix

**Success Criteria:**
- ✅ Agent sees previously collected facts
- ✅ No infinite loop (agent progresses)
- ✅ Metadata `data_collected_so_far` preserved

---

### Phase 3: Multi-Agent Collaboration (Week 3-4)

**Goals:**
- Implement parallel delegation
- Implement handover logic
- Test GamePlan → Awards + ECs flow

**Tasks:**
1. Wrap all 6 agents as tools
2. Create `check_delegation` node
3. Create `delegate_parallel` node
4. Create `synthesize` node
5. Test parallel delegation
6. Test handover flow

**Success Criteria:**
- ✅ GamePlan delegates to specialists
- ✅ Parallel execution works
- ✅ Synthesis combines results
- ✅ Handover preserves context

---

### Phase 4: Observability & Reliability (Week 5)

**Goals:**
- LangSmith full tracing
- Fault tolerance (retries, timeouts)
- Error handling

**Tasks:**
1. Enable LangSmith tracing for all nodes
2. Add retry policies
3. Add timeout policies
4. Add circuit breakers
5. Add error recovery
6. Test failure scenarios

**Success Criteria:**
- ✅ Full workflow traced in LangSmith
- ✅ Transient failures auto-retry
- ✅ Timeouts handled gracefully
- ✅ Circuit breakers prevent cascading failures

---

### Phase 5: Horizontal Scaling (Week 6)

**Goals:**
- Multi-instance deployment
- Redis coordination
- Load balancing

**Tasks:**
1. Deploy 3 instances
2. Configure Redis for shared state
3. Test concurrent execution
4. Add monitoring
5. Load test (1000 concurrent users)

**Success Criteria:**
- ✅ 3 instances running
- ✅ State shared via Redis
- ✅ No conflicts
- ✅ Linear scaling

---

## Benefits of This Architecture

### 1. Production-Grade Reliability
- ✅ **99.9% uptime** with fault tolerance
- ✅ **Automatic recovery** from failures
- ✅ **Horizontal scaling** for 10,000+ students
- ✅ **State persistence** (never lose conversation)

### 2. Human-Level Coaching
- ✅ **83 intelligence types** preserved
- ✅ **Full memory** (agents remember everything)
- ✅ **Proactive guidance** (agents check progress)
- ✅ **Adaptive responses** (based on student profile)

### 3. Autonomous Collaboration
- ✅ **Parallel delegation** (GamePlan → Awards + ECs)
- ✅ **Seamless handovers** (Assessment → GamePlan → Execution)
- ✅ **Context preservation** (full state passed between agents)
- ✅ **Intelligent routing** (based on student needs)

### 4. Developer Experience
- ✅ **Full observability** (LangSmith waterfall traces)
- ✅ **Easy debugging** (replay any conversation)
- ✅ **Visual workflows** (Mermaid diagrams)
- ✅ **Fast iteration** (modify workflow without changing agents)

---

## Success Metrics

1. ✅ **Infinite loop fixed** - Agent progresses through phases
2. ✅ **Memory persistent** - 100% conversation recall
3. ✅ **Scalability** - Handle 10,000 concurrent students
4. ✅ **Reliability** - 99.9% uptime
5. ✅ **Collaboration** - 3+ agents working together seamlessly
6. ✅ **Intelligence preserved** - All 83 types operational
7. ✅ **Observability** - Full workflow tracing

---

## Next Steps

1. **Approve architecture** ✅
2. **Start Phase 1** - Week 1 foundation
3. **Implement WorkflowState** - Define state structure
4. **Wrap first agent** - Assessment Agent as tool
5. **Test state persistence** - Redis checkpointing

This architecture delivers **production-grade, scalable, autonomous multi-agent coaching** while preserving all our intelligence and domain expertise.

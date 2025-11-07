# V31 Implementation Plan: Production-Grade Multi-Agent Orchestration

**Date:** 2025-11-04
**Version:** v31.4
**Status:** 🟢 Ready to Implement
**Based On:** MULTIAGENTS_V26 Specs + Gold Standard Gap Analysis

---

## Executive Summary

**Goal:** Build production-grade LangGraph-based orchestration that delivers the v26 multi-agent user experience with:
- ✅ Autonomous, proactive agents with 83 intelligence types
- ✅ Seamless collaboration (delegation, handovers, parallel execution)
- ✅ Full state/memory persistence
- ✅ Real-time progress tracking and transparency
- ✅ 99.9% reliability at scale

**Strategy:**
1. **Remove complexity**: Delete V26 wrappers, feature flags, duplicate code
2. **Single orchestration**: LangGraph handles ALL routing/coordination
3. **Preserve intelligence**: Zero changes to agents or intelligence types
4. **Meet UI contract**: All metadata fields frontend expects

---

## Architecture Overview

```
Frontend Request (POST /api/v26/agents/{agentId}/message)
    ↓
Route Handler (THIN - just validation + forwarding)
    ↓
LangGraph Orchestrator (CORE - all orchestration logic)
    ├─ Load State (conversation, facts, profile)
    ├─ Route to Agent (based on context)
    ├─ Call Agent (with full memory)
    ├─ Extract Insights (update collected facts)
    ├─ Check Delegation (parallel if needed)
    ├─ Check Handover (next agent if ready)
    └─ Save State (checkpoint to Redis)
    ↓
Agent (wrapped as tool, UNCHANGED implementation)
    ├─ Receives: full context + memory + collected facts
    ├─ Runs: intelligence types (parallel)
    └─ Returns: response + metadata (data_collected_so_far)
    ↓
Response to Frontend
```

---

## What to Remove (Clean Up First)

### Files to DELETE
```bash
# OLD fake stub wrapper (NOT USED)
rm services/agent-framework/src/agents/V26AgentWrapper.ts

# Feature flags (always use LangGraph)
rm services/agent-framework/src/config/featureFlags.ts
rm services/agent-framework/migrations/031_feature_flags.sql
```

### Files to REFACTOR
```bash
# V26AgentWrapperReal → Extract utilities only
services/agent-framework/src/agents/V26AgentWrapperReal.ts
# Becomes:
services/agent-framework/src/orchestration/utils.ts
# Keep: student mapping, conversation loading
# Remove: complex routing, wrapper abstraction
```

### Routes to SIMPLIFY
```typescript
// services/agent-framework/src/routes/v26-multiagents.ts

// BEFORE (v30): 847 lines with feature flags, dual paths
if (useLangGraph && langGraphOrchestrator) { ... }
if (!useLangGraph) { ... }

// AFTER (v31): ~200 lines, single path
const orchestrator = new LangGraphOrchestrator(pool, factStore, redisUrl);
const result = await orchestrator.handleMessage({ session_id, student_id, message });
res.json(result);
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)

#### 1.1: Set Up Infrastructure

**Install Dependencies:**
```bash
cd services/agent-framework
npm install @langchain/langgraph @langchain/core langsmith ioredis
npm install @langchain/langgraph-checkpoint-redis
```

**Configure Environment:**
```bash
# .env.local
LANGSMITH_API_KEY=ls_proj_...
LANGSMITH_PROJECT=ivylevel-production
REDIS_URL=redis://localhost:6379
```

**Start Redis:**
```bash
docker run -d --name ivylevel-redis -p 6379:6379 redis:alpine
```

#### 1.2: Define State Interface

```typescript
// File: src/langgraph/state.ts

export interface ConversationMessage {
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
  agent_id?: string;
  metadata?: Record<string, any>;
}

export interface WorkflowState {
  // IDENTITY
  student_id: string;
  session_id: string;

  // MEMORY (persists across turns)
  conversation_history: ConversationMessage[];

  // COLLECTED FACTS (cumulative from all agents)
  collected_facts: {
    // From Assessment Agent
    student_profile?: Record<string, any>;
    academic_data?: Record<string, any>;
    activities?: Array<any>;
    awards?: Array<any>;
    gaps?: Array<{ category: string; severity: string; description: string }>;
    strengths?: string[];

    // From GamePlan Agent
    roadmap?: Record<string, any>;
    opportunities?: Record<string, any>;
    timeline?: Array<any>;

    // From Execution Agent
    week_plan?: Record<string, any>;
  };

  // AGENT CONTEXT (coordination state)
  agent_context: {
    current_agent: string;
    current_phase: 'assessment' | 'gameplan' | 'execution' | 'complete';
    assessment_progress: number;  // 0.0 - 1.0 (for 4 phases: 0.25, 0.5, 0.75, 1.0)

    // Delegation
    delegation_active: boolean;
    delegated_to?: string[];
    delegation_results?: Record<string, any>;

    // Handover
    handover_pending: boolean;
    handover_to?: string;
    data_package?: Record<string, any>;
  };

  // CURRENT TURN
  current_response?: string;
  current_metadata?: Record<string, any>;
  current_intelligence_triggered?: string[];

  // ERROR HANDLING
  error?: string;
  retry_count: number;
}
```

#### 1.3: Create LangGraph Orchestrator (Skeleton)

```typescript
// File: src/langgraph/LangGraphOrchestrator.ts

import { StateGraph, END, START } from "@langchain/langgraph";
import { RedisSaver } from "@langchain/langgraph-checkpoint-redis";
import Redis from "ioredis";
import { WorkflowState } from "./state.js";
import { wrapAgentAsTool } from "./AgentToolWrapper.js";
import { AssessmentAgentV3ConversationalRealtime } from "../agents/v18/AssessmentAgentV3ConversationalRealtime.js";

export class LangGraphOrchestrator {
  private checkpointer: RedisSaver;
  private app: any;
  private tools: Map<string, any>;

  constructor(pool: Pool, factStore: FactStore, redisUrl: string) {
    // Initialize Redis checkpointer
    const redis = new Redis(redisUrl);
    this.checkpointer = new RedisSaver(redis);

    // Initialize agent tools
    this.initializeTools(factStore, pool);

    // Build workflow
    this.buildWorkflow();
  }

  private initializeTools(factStore: FactStore, pool: Pool) {
    this.tools = new Map();

    // Wrap Assessment Agent
    const assessmentAgent = new AssessmentAgentV3ConversationalRealtime(factStore, pool);
    this.tools.set('assessment-agent-v18', wrapAgentAsTool(
      assessmentAgent,
      'assessment-agent-v18',
      'Runs 4-phase assessment using TYPE-080'
    ));

    // TODO: Wrap other agents (GamePlan, Execution, Awards, ECs, Scholarships)
  }

  private buildWorkflow() {
    const workflow = new StateGraph<WorkflowState>({
      channels: {
        conversation_history: {
          value: (prev, next) => [...prev, ...next],
          default: () => []
        },
        collected_facts: {
          value: (prev, next) => ({ ...prev, ...next }),
          default: () => ({})
        }
      }
    });

    // Define nodes (Phase 2)
    this.defineNodes(workflow);

    // Define edges (Phase 2)
    this.defineEdges(workflow);

    // Compile with checkpointing
    this.app = workflow.compile({ checkpointer: this.checkpointer });
  }

  async handleMessage(request: {
    student_id: string;
    session_id: string;
    message: string;
  }) {
    // Execute workflow with checkpointing
    const config = {
      configurable: {
        thread_id: request.session_id,
        checkpoint_ns: "production"
      }
    };

    const result = await this.app.invoke({
      student_id: request.student_id,
      session_id: request.session_id,
      conversation_history: [{
        role: 'user',
        content: request.message,
        timestamp: new Date()
      }]
    }, config);

    return result;
  }
}
```

#### 1.4: Update Routes (Simplify to Thin Layer)

```typescript
// File: src/routes/v26-multiagents.ts

import { LangGraphOrchestrator } from '../langgraph/LangGraphOrchestrator.js';

// Initialize orchestrator (singleton)
const orchestrator = new LangGraphOrchestrator(pool, factStore, process.env.REDIS_URL!);

router.post('/agents/:agentId/message', async (req, res) => {
  const { session_id, message, student_id } = req.body;
  const { agentId } = req.params;

  try {
    // 🎯 SINGLE ORCHESTRATION PATH
    const result = await orchestrator.handleMessage({
      student_id,
      session_id,
      message
    });

    // Return response matching frontend contract
    res.json({
      user_message_id: userMessage.id,
      agent_message_id: agentMessage.id,
      agent_response: result.current_response,
      processing_time: result.duration_ms,
      confidence: result.current_metadata?.confidence || 1.0,
      intelligence_triggered: result.current_intelligence_triggered || [],

      // 🔑 KEY: Metadata with data_collected_so_far
      metadata: result.current_metadata,

      // v26 context for frontend
      v26_context: {
        real_student_id: student_id,
        clone_student_id: result.student_id,
        is_clone_student: true
      }
    });

  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});
```

**Success Criteria:**
- ✅ Redis running and checkpointing works
- ✅ Assessment Agent wrapped as tool
- ✅ Simple workflow executes (load → call agent → return)
- ✅ State persists across requests
- ✅ LangSmith traces visible

---

### Phase 2: Core Workflow Nodes (Week 1-2)

#### 2.1: Load State Node

```typescript
workflow.addNode("load_state", async (state: WorkflowState) => {
  // Load conversation history from DB if not in state
  if (!state.conversation_history || state.conversation_history.length === 0) {
    const messages = await pool.query(`
      SELECT role, content, timestamp, agent_id, metadata
      FROM multiagent_messages
      WHERE session_id = $1
      ORDER BY timestamp ASC
    `, [state.session_id]);

    state.conversation_history = messages.rows;
  }

  // Load collected facts from kb_items
  if (!state.collected_facts || Object.keys(state.collected_facts).length === 0) {
    const facts = await pool.query(`
      SELECT edges FROM kb_items
      WHERE student_id = $1 AND source_ref = 'gpt4o_conversational_extraction_v28'
    `, [state.student_id]);

    state.collected_facts = facts.rows.reduce((acc, row) => ({ ...acc, ...row.edges }), {});
  }

  return { ...state };
});
```

#### 2.2: Call Agent Node (with Full Context)

```typescript
workflow.addNode("call_agent", async (state: WorkflowState) => {
  const tool = this.tools.get(state.agent_context.current_agent);
  const lastMessage = state.conversation_history[state.conversation_history.length - 1];

  // 🔑 Pass FULL context to agent
  const result = await tool.func({
    student_id: state.student_id,
    session_id: state.session_id,
    message: lastMessage.content,

    // 🆕 MEMORY + STATE
    conversation_history: state.conversation_history,
    collected_facts: state.collected_facts,
    agent_context: state.agent_context
  });

  const parsed = parseAgentToolResult(result);

  // Extract new facts from this turn
  const newFacts = parsed.metadata?.data_collected_so_far || {};

  // Update assessment progress if Assessment Agent
  let assessmentProgress = state.agent_context.assessment_progress;
  if (state.agent_context.current_agent === 'assessment-agent-v18') {
    const phaseComplete = parsed.metadata?.current_phase || 1;
    assessmentProgress = phaseComplete / 4.0;  // 4 phases total
  }

  return {
    current_response: parsed.response,
    current_metadata: parsed.metadata,
    current_intelligence_triggered: parsed.intelligence_triggered,

    // Merge collected facts
    collected_facts: { ...state.collected_facts, ...newFacts },

    // Update agent context
    agent_context: {
      ...state.agent_context,
      assessment_progress: assessmentProgress
    },

    // Append to conversation history
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

#### 2.3: Check Handover Node

```typescript
workflow.addNode("check_handover", async (state: WorkflowState) => {
  // Assessment → GamePlan handover (when 4 phases complete)
  if (state.agent_context.current_agent === 'assessment-agent-v18' &&
      state.agent_context.assessment_progress >= 1.0) {
    return {
      agent_context: {
        ...state.agent_context,
        handover_pending: true,
        handover_to: 'gameplan-agent-v18',
        data_package: {
          assessment_complete: true,
          ivyScore: state.collected_facts.ivy_score,
          gaps: state.collected_facts.gaps,
          strengths: state.collected_facts.strengths
        }
      }
    };
  }

  // GamePlan → Execution handover (when roadmap complete)
  if (state.agent_context.current_agent === 'gameplan-agent-v18' &&
      state.collected_facts.roadmap) {
    return {
      agent_context: {
        ...state.agent_context,
        handover_pending: true,
        handover_to: 'execution-agent',
        data_package: {
          gameplan_complete: true,
          roadmap: state.collected_facts.roadmap,
          opportunities: state.collected_facts.opportunities
        }
      }
    };
  }

  return { agent_context: { ...state.agent_context, handover_pending: false } };
});
```

#### 2.4: Define Edges

```typescript
// Start → Load State
workflow.addEdge(START, "load_state");

// Load State → Call Agent
workflow.addEdge("load_state", "call_agent");

// Call Agent → Check Handover
workflow.addEdge("call_agent", "check_handover");

// Check Handover → Either handover or end
workflow.addConditionalEdges(
  "check_handover",
  (state) => state.agent_context.handover_pending ? "handover" : END
);

// Handover → Update agent → Call new agent
workflow.addNode("handover", async (state: WorkflowState) => {
  return {
    agent_context: {
      ...state.agent_context,
      current_agent: state.agent_context.handover_to!,
      handover_pending: false
    }
  };
});

workflow.addEdge("handover", "call_agent");
```

**Success Criteria:**
- ✅ State loads from database on first message
- ✅ Agent receives full conversation history
- ✅ Agent receives all collected facts
- ✅ Infinite loop fixed (agent sees previous facts)
- ✅ Handover triggers when phase complete

---

### Phase 3: Parallel Delegation (Week 2)

#### 3.1: Wrap Specialist Agents

```typescript
// In initializeTools()
const gameplanAgent = new GamePlanAgentV3(factStore, pool);
const awardsAgent = new AwardsAgentRefactored(factStore);
const ecsAgent = new ExtracurricularsAgentRefactored(factStore);
const scholarshipsAgent = new ScholarshipsAgent(factStore);

this.tools.set('gameplan-agent-v18', wrapAgentAsTool(gameplanAgent, 'gameplan-agent-v18', 'Creates strategic roadmap'));
this.tools.set('awards-agent-v18', wrapAgentAsTool(awardsAgent, 'awards-agent-v18', 'Finds award opportunities'));
this.tools.set('extracurriculars-agent-v18', wrapAgentAsTool(ecsAgent, 'extracurriculars-agent-v18', 'Finds EC opportunities'));
this.tools.set('scholarships-agent', wrapAgentAsTool(scholarshipsAgent, 'scholarships-agent', 'Finds scholarships'));
```

#### 3.2: Check Delegation Node

```typescript
workflow.addNode("check_delegation", async (state: WorkflowState) => {
  // Only GamePlan Agent delegates
  if (state.agent_context.current_agent !== 'gameplan-agent-v18') {
    return { agent_context: { ...state.agent_context, delegation_active: false } };
  }

  // Check if delegation is needed (based on student profile)
  const needsAwards = !state.collected_facts.awards || state.collected_facts.awards.length < 3;
  const needsECs = !state.collected_facts.activities || state.collected_facts.activities.length < 2;
  const needsScholarships = true;  // Always search scholarships

  const delegateTo: string[] = [];
  if (needsAwards) delegateTo.push('awards-agent-v18');
  if (needsECs) delegateTo.push('extracurriculars-agent-v18');
  if (needsScholarships) delegateTo.push('scholarships-agent');

  if (delegateTo.length > 0) {
    return {
      agent_context: {
        ...state.agent_context,
        delegation_active: true,
        delegated_to: delegateTo
      }
    };
  }

  return { agent_context: { ...state.agent_context, delegation_active: false } };
});
```

#### 3.3: Delegate Parallel Node

```typescript
workflow.addNode("delegate_parallel", async (state: WorkflowState) => {
  const delegatedAgents = state.agent_context.delegated_to || [];

  // Call all delegated agents in PARALLEL
  const results = await Promise.all(
    delegatedAgents.map(async (agentId) => {
      const tool = this.tools.get(agentId);
      const result = await tool.func({
        student_id: state.student_id,
        session_id: state.session_id,
        message: 'find opportunities',  // Delegation context
        conversation_history: state.conversation_history,
        collected_facts: state.collected_facts,
        is_delegation: true
      });
      return { agentId, result: parseAgentToolResult(result) };
    })
  );

  // Aggregate results
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

#### 3.4: Synthesize Delegation Results

```typescript
workflow.addNode("synthesize_delegation", async (state: WorkflowState) => {
  if (!state.agent_context.delegation_results) {
    return { current_response: state.current_response };
  }

  // GamePlan Agent synthesizes all specialist responses
  const gameplanTool = this.tools.get('gameplan-agent-v18');
  const synthesisResult = await gameplanTool.func({
    student_id: state.student_id,
    session_id: state.session_id,
    message: 'synthesize delegation results',
    delegation_results: state.agent_context.delegation_results,
    collected_facts: state.collected_facts
  });

  const parsed = parseAgentToolResult(synthesisResult);

  return {
    current_response: parsed.response,
    current_metadata: parsed.metadata
  };
});
```

#### 3.5: Update Edges for Delegation

```typescript
// Call Agent → Check Delegation
workflow.addEdge("call_agent", "check_delegation");

// Check Delegation → Either delegate or check handover
workflow.addConditionalEdges(
  "check_delegation",
  (state) => state.agent_context.delegation_active ? "delegate_parallel" : "check_handover"
);

// Delegate Parallel → Synthesize
workflow.addEdge("delegate_parallel", "synthesize_delegation");

// Synthesize → Check Handover
workflow.addEdge("synthesize_delegation", "check_handover");
```

**Success Criteria:**
- ✅ GamePlan delegates to 3 specialists
- ✅ All 3 run in parallel (total time ~3s, not 9s)
- ✅ Results aggregated correctly
- ✅ Synthesis combines all responses
- ✅ Frontend receives delegation metadata

---

### Phase 4: Observability & Testing (Week 3)

#### 4.1: Enable LangSmith Tracing

```typescript
// All tracing is automatic with LangGraph + LangSmith
// Just ensure environment variables are set:

LANGSMITH_API_KEY=ls_proj_...
LANGSMITH_PROJECT=ivylevel-production
LANGSMITH_TRACING=true
```

#### 4.2: Add Logging at Each Node

```typescript
workflow.addNode("call_agent", async (state: WorkflowState) => {
  log.event('workflow.call_agent', {
    agent: state.agent_context.current_agent,
    conversation_turns: state.conversation_history.length,
    facts_collected_keys: Object.keys(state.collected_facts)
  });

  // ... node implementation

  log.event('workflow.call_agent_complete', {
    agent: state.agent_context.current_agent,
    new_facts_keys: Object.keys(newFacts),
    intelligence_count: parsed.intelligence_triggered?.length || 0
  });
});
```

#### 4.3: Integration Testing

```typescript
// File: tests/integration/orchestration.test.ts

describe('LangGraph Orchestration', () => {
  test('Full onboarding flow', async () => {
    const sessionId = await createSession('huda-2025');

    // Send 5 messages to Assessment Agent
    for (let i = 1; i <= 5; i++) {
      const result = await orchestrator.handleMessage({
        student_id: 'huda-2025',
        session_id: sessionId,
        message: testMessages[i]
      });

      expect(result.current_response).toBeTruthy();
      expect(result.collected_facts).toBeTruthy();
    }

    // Verify state persistence
    const state = await loadState(sessionId);
    expect(state.conversation_history).toHaveLength(10); // 5 user + 5 agent
    expect(state.collected_facts.grade).toBe(11);
  });

  test('Parallel delegation', async () => {
    const result = await orchestrator.handleMessage({
      student_id: 'huda-2025',
      session_id: sessionId,
      message: 'create my gameplan'
    });

    expect(result.agent_context.delegation_results).toBeTruthy();
    expect(Object.keys(result.agent_context.delegation_results)).toHaveLength(3);
  });
});
```

**Success Criteria:**
- ✅ All workflows traced in LangSmith
- ✅ Integration tests passing
- ✅ State persistence verified
- ✅ Parallel delegation tested

---

### Phase 5: Production Deployment (Week 3-4)

#### 5.1: Horizontal Scaling Setup

```yaml
# docker-compose.yml
version: '3.8'
services:
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"

  agent-service-1:
    build: .
    environment:
      REDIS_URL: redis://redis:6379
      LANGSMITH_API_KEY: ${LANGSMITH_API_KEY}
    ports:
      - "8787:8787"

  agent-service-2:
    build: .
    environment:
      REDIS_URL: redis://redis:6379
      LANGSMITH_API_KEY: ${LANGSMITH_API_KEY}
    ports:
      - "8788:8787"

  agent-service-3:
    build: .
    environment:
      REDIS_URL: redis://redis:6379
      LANGSMITH_API_KEY: ${LANGSMITH_API_KEY}
    ports:
      - "8789:8787"

  load-balancer:
    image: nginx:alpine
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    ports:
      - "80:80"
```

#### 5.2: Monitoring & Alerting

```typescript
// Add metrics collection
import { metrics } from './observability/metrics.js';

workflow.addNode("call_agent", async (state: WorkflowState) => {
  const startTime = Date.now();

  try {
    const result = await tool.func({ ... });

    metrics.recordAgentLatency(state.agent_context.current_agent, Date.now() - startTime);
    metrics.recordAgentSuccess(state.agent_context.current_agent);

    return result;
  } catch (error) {
    metrics.recordAgentError(state.agent_context.current_agent, error);
    throw error;
  }
});
```

**Success Criteria:**
- ✅ 3 instances running
- ✅ Load balanced
- ✅ Redis coordinating state
- ✅ No conflicts under load
- ✅ Metrics dashboard live

---

## Timeline Summary

| Week | Phase | Deliverables |
|------|-------|--------------|
| 1 | Foundation | Redis + LangGraph + State interface + Simple workflow |
| 1-2 | Core Workflow | Load state + Call agent + Check handover + Tests |
| 2 | Delegation | Parallel delegation + Synthesis + Tests |
| 3 | Observability | LangSmith + Logging + Integration tests |
| 3-4 | Production | Horizontal scaling + Monitoring + Load testing |

**Total:** 3-4 weeks to production-ready system

---

## Success Metrics

1. ✅ **Infinite loop fixed** - Agent progresses through phases
2. ✅ **Memory persistent** - 100% conversation recall
3. ✅ **Parallel delegation** - GamePlan → 3 specialists in ~3s
4. ✅ **Seamless handovers** - Assessment → GamePlan → Execution
5. ✅ **Metadata preserved** - `data_collected_so_far` reaches frontend
6. ✅ **Horizontal scaling** - 3+ instances sharing state
7. ✅ **Full observability** - LangSmith waterfall traces
8. ✅ **Production reliability** - 99.9% uptime

---

## Next Steps

1. **Start Phase 1** - Set up infrastructure (Redis, LangGraph, LangSmith)
2. **Define WorkflowState** - Complete state interface
3. **Wrap first agent** - Assessment Agent as tool
4. **Build simple workflow** - Load → Call → Return
5. **Test state persistence** - Verify Redis checkpointing

Ready to begin implementation!

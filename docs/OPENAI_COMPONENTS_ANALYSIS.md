# OpenAI Components Analysis for IvyLevel Platform v1.0

**Document Status:** Architectural Decision Document
**Created:** 2025-10-16
**Purpose:** Evaluate OpenAI Agent SDK, ChatKit, and other components for v1.0 implementation
**Decision Deadline:** Before Phase 1 implementation begins

---

## Executive Summary

This document analyzes OpenAI's agent framework components to determine:

1. **Which architectural patterns from OpenAI Agents SDK should IvyLevel adopt?**
2. **Which OpenAI components can deliver "best highest quality near-human agentic AI digital twin"?**
3. **Should we use OpenAI ChatKit or build a custom solution?**

### Key Recommendations (TL;DR)

| Component | Recommendation | Rationale |
|-----------|---------------|-----------|
| **OpenAI Agents SDK** | ✅ **ADOPT - Selectively** | Use Runner, Handoffs, Sessions primitives; integrate with v14 resolvers as tools |
| **OpenAI ChatKit** | ⚠️ **EVALUATE - Hybrid Approach** | Use for standard chat UX; extend with custom widgets for IvyLevel-specific features |
| **Agent Builder** | ❌ **DEFER** | Build custom React Flow-based builder with IvyLevel domain knowledge |
| **Swarm (multi-agent)** | ✅ **ADOPT - Conceptually** | Use handoff patterns; implement with LangGraph for state management |

**Bottom Line:** Use OpenAI Agents SDK as the **execution engine** for individual agents, but wrap it with IvyLevel's **zero-hallucination architecture** (v14 resolvers + 105 views) and **domain-specific orchestration** (LangGraph + CAT-1/2/3).

---

## Table of Contents

1. [OpenAI Agents SDK Architectural Analysis](#openai-agents-sdk-architectural-analysis)
2. [ChatKit vs Custom UI Decision](#chatkit-vs-custom-ui-decision)
3. [Other OpenAI Components Evaluation](#other-openai-components-evaluation)
4. [Integration Architecture](#integration-architecture)
5. [Implementation Roadmap](#implementation-roadmap)
6. [Risks & Mitigations](#risks--mitigations)

---

## 1. OpenAI Agents SDK Architectural Analysis

### 1.1 Core Primitives

OpenAI Agents SDK provides these key abstractions:

| Primitive | Description | IvyLevel Applicability | Decision |
|-----------|-------------|----------------------|----------|
| **Agent** | Stateless function with instructions + tools | ✅ Perfect for 8 core agents | **ADOPT** |
| **Runner** | Event loop for agent execution | ✅ Handles tool calls, streaming | **ADOPT** |
| **Tool** | Function callable by agent (auto-schema) | ✅ Wrap v14 resolvers | **ADOPT** |
| **Handoffs** | Agent-to-agent delegation | ✅ Multi-agent routing | **ADOPT** |
| **Sessions** | Conversation history + context | ✅ Replace kb_sessions | **ADOPT** |
| **Guardrails** | Input/output validation | ✅ Enhance existing guardrails | **ADOPT** |

### 1.2 Architectural Patterns to Adopt

#### Pattern 1: **Tool-Based Zero Hallucination**

**OpenAI Pattern:**
```python
from agents import Agent, Tool

def get_weather(location: str) -> str:
    """Get current weather for a location."""
    # Real API call - no hallucination
    return fetch_weather_api(location)

agent = Agent(
    name="WeatherAgent",
    instructions="You help with weather. Use get_weather tool for all queries.",
    tools=[Tool(fn=get_weather)]
)
```

**IvyLevel Adaptation:**
```typescript
// services/agent-framework/src/tools/resolvers.ts
import { Tool } from '@openai/agents-sdk';
import { pool } from '../db/pool';

// Wrap v14 resolvers as OpenAI tools
export const getGPALatest = Tool({
  name: 'get_gpa_latest',
  description: 'Get student\'s latest weighted GPA from academic records',
  parameters: {
    type: 'object',
    properties: {
      student_id: { type: 'string', description: 'Student UUID' }
    },
    required: ['student_id']
  },
  fn: async ({ student_id }: { student_id: string }) => {
    const result = await pool.query(
      'SELECT * FROM v_gpa_latest WHERE student_id = $1',
      [student_id]
    );
    return result.rows[0] || { error: 'No GPA data found' };
  }
});

export const getAwardsInitial = Tool({
  name: 'get_awards_initial',
  description: 'Get student\'s initial award targets from Game Plan',
  parameters: {
    type: 'object',
    properties: {
      student_id: { type: 'string' }
    }
  },
  fn: async ({ student_id }) => {
    const result = await pool.query(
      'SELECT * FROM v_awards_initial WHERE student_id = $1',
      [student_id]
    );
    return result.rows;
  }
});
```

**Why This Works:**
- ✅ **Maintains v14's zero-hallucination guarantee** - All facts from SQL
- ✅ **Automatic schema generation** - OpenAI SDK handles function calling
- ✅ **Type safety** - TypeScript ensures correct tool parameters
- ✅ **Reuses 105 temporal views** - No duplication of v14 infrastructure

#### Pattern 2: **Agent Handoffs for Multi-Agent Routing**

**OpenAI Pattern (Swarm):**
```python
from agents import Agent

triage_agent = Agent(
    name="TriageAgent",
    instructions="Route user to correct specialist",
    handoffs=["sales", "refunds", "technical"]
)

sales_agent = Agent(
    name="SalesAgent",
    instructions="Help with purchases"
)

# Runner automatically handles handoffs
runner.run(triage_agent, user_message="I want to buy something")
# → Automatically hands off to sales_agent
```

**IvyLevel Adaptation:**
```typescript
// services/agent-framework/src/agents/triage-agent.ts
import { Agent } from '@openai/agents-sdk';

export const triageAgent = new Agent({
  name: 'TriageAgent',
  instructions: `You are the triage agent for IvyLevel coaching platform.

  Route user questions to specialist agents:
  - "game-plan" → Overall strategy, goal setting, timelines
  - "extracurriculars" → EC planning, leadership roles, impact
  - "awards" → Award targeting, competition research
  - "summer-programs" → Summer program selection and applications
  - "college-list" → College research, list building, chances
  - "essay" → Essay brainstorming, drafting, editing
  - "weekly" → Weekly check-ins, task completion
  - "scholarship" → Scholarship search and applications

  If unclear, ask clarifying questions before routing.
  `,
  handoffs: [
    'game-plan',
    'extracurriculars',
    'awards',
    'summer-programs',
    'college-list',
    'essay',
    'weekly',
    'scholarship'
  ]
});
```

**Integration with LangGraph:**
```typescript
// services/agent-framework/src/langgraph/graph.ts
import { StateGraph } from '@langchain/langgraph';
import { triageAgent } from '../agents/triage-agent';
import { gamePlanAgent } from '../agents/game-plan-agent';
// ... other agents

// Build conditional routing graph
const graph = new StateGraph({
  channels: {
    messages: [],
    current_agent: null,
    context_id: null,
    student_id: null
  }
});

graph.addNode('triage', async (state) => {
  const result = await runner.run(triageAgent, state.messages[-1]);
  return {
    ...state,
    current_agent: result.handoff_target || 'triage',
    messages: [...state.messages, result.message]
  };
});

graph.addNode('game-plan', async (state) => {
  const result = await runner.run(gamePlanAgent, state.messages[-1], {
    context: { student_id: state.student_id }
  });
  return { ...state, messages: [...state.messages, result.message] };
});

// Add conditional edges based on handoffs
graph.addConditionalEdges(
  'triage',
  (state) => state.current_agent,
  {
    'game-plan': 'game-plan',
    'extracurriculars': 'extracurriculars',
    // ... other mappings
  }
);
```

**Why This Works:**
- ✅ **Simplified routing** - OpenAI SDK handles handoff mechanics
- ✅ **LangGraph state management** - Maintains conversation context across handoffs
- ✅ **Replaces complex intent router** - Natural language routing vs rule-based
- ✅ **Preserves CAT-1/2/3 orchestration** - Each agent still uses v14 infrastructure

#### Pattern 3: **Session Management with Context**

**OpenAI Pattern:**
```python
from agents import Session

session = Session(
    session_id="user123_session456",
    context={
        "user_id": "user123",
        "student_id": "student789",
        "coach_id": "coach101"
    }
)

# Context available to all agents in session
runner.run(agent, message, session=session)
```

**IvyLevel Adaptation:**
```typescript
// services/agent-framework/src/core/SessionManager.ts
import { Session } from '@openai/agents-sdk';
import { pool } from '../db/pool';

export class IvyLevelSession extends Session {
  student_id: string;
  coach_id: string;
  context_id: string;

  constructor(params: {
    session_id: string;
    student_id: string;
    coach_id: string;
    context_id: string;
  }) {
    super({
      session_id: params.session_id,
      context: {
        student_id: params.student_id,
        coach_id: params.coach_id,
        context_id: params.context_id
      }
    });

    this.student_id = params.student_id;
    this.coach_id = params.coach_id;
    this.context_id = params.context_id;
  }

  // Load student context on session creation
  async loadStudentContext() {
    const vital = await pool.query(
      'SELECT * FROM v_vital_facts WHERE student_id = $1',
      [this.student_id]
    );

    const gpa = await pool.query(
      'SELECT * FROM v_gpa_latest WHERE student_id = $1',
      [this.student_id]
    );

    const awards = await pool.query(
      'SELECT * FROM v_awards_progression WHERE student_id = $1',
      [this.student_id]
    );

    // Store in session context for all agents
    this.context = {
      ...this.context,
      vital_facts: vital.rows[0],
      gpa: gpa.rows[0],
      awards: awards.rows
    };

    return this.context;
  }

  // Persist to kb_sessions for v14 compatibility
  async persist() {
    await pool.query(
      `INSERT INTO kb_sessions (session_id, student_id, context_id, session_data)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (session_id) DO UPDATE SET session_data = $4`,
      [this.session_id, this.student_id, this.context_id, this.context]
    );
  }
}
```

**Why This Works:**
- ✅ **Rich context available to all agents** - Pre-loaded student facts
- ✅ **Backward compatible** - Still persists to kb_sessions
- ✅ **Type-safe** - TypeScript ensures correct context structure
- ✅ **Performance** - Context loaded once per session, not per message

#### Pattern 4: **Guardrails for Quality Control**

**OpenAI Pattern:**
```python
from agents import Guardrail

def validate_no_hallucination(input_msg, output_msg):
    """Ensure output only contains facts from tools."""
    # Check if output contains unverified claims
    if contains_unverified_facts(output_msg):
        return {"error": "Response contains unverified facts"}
    return {"ok": True}

agent = Agent(
    name="FactAgent",
    instructions="Only use tools for facts",
    tools=[get_gpa, get_awards],
    guardrails=[Guardrail(fn=validate_no_hallucination)]
)
```

**IvyLevel Adaptation:**
```typescript
// services/agent-framework/src/quality/guardrails.ts
import { Guardrail } from '@openai/agents-sdk';
import { ResponseVerifier } from './response-verifier'; // v14 verifier

// Guardrail 1: Zero-Hallucination Check
export const zeroHallucinationGuardrail = new Guardrail({
  name: 'zero_hallucination',
  fn: async (input, output, context) => {
    const verifier = new ResponseVerifier();
    const verification = await verifier.verifyResponse(
      output.content,
      context.tool_calls || []
    );

    if (!verification.verified) {
      return {
        error: 'Response contains unverified facts',
        violations: verification.violations
      };
    }

    return { ok: true };
  }
});

// Guardrail 2: EQ/Warmth Check (CAT-3)
export const warmthGuardrail = new Guardrail({
  name: 'warmth_check',
  fn: async (input, output) => {
    // Use jenny_v9_eq fine-tuned model to score warmth
    const warmthScore = await scoreWarmth(output.content);

    if (warmthScore < 0.6) {
      return {
        error: 'Response lacks warmth and empathy',
        score: warmthScore
      };
    }

    return { ok: true, score: warmthScore };
  }
});

// Guardrail 3: Action Extraction
export const actionGuardrail = new Guardrail({
  name: 'action_extraction',
  fn: async (input, output) => {
    const actions = extractActions(output.content);

    if (actions.length === 0 && requiresAction(input.content)) {
      return {
        warning: 'No actionable next steps provided',
        suggestion: 'Add concrete next steps for student'
      };
    }

    return { ok: true, actions };
  }
});

// Apply all guardrails to agents
export const ivyLevelGuardrails = [
  zeroHallucinationGuardrail,
  warmthGuardrail,
  actionGuardrail
];
```

**Why This Works:**
- ✅ **Reuses v14 ResponseVerifier** - No duplication of quality checks
- ✅ **Composable** - Stack multiple guardrails per agent
- ✅ **Observable** - Guardrail failures logged for debugging
- ✅ **Enforces quality** - Automatically rejects low-quality responses

### 1.3 What NOT to Adopt from OpenAI SDK

| Component | Reason to Avoid | IvyLevel Alternative |
|-----------|-----------------|---------------------|
| **OpenAI-hosted backend** | Lock-in risk, data privacy concerns | Self-hosted agents on IvyLevel infrastructure |
| **Simple tool definitions** | Need complex temporal resolution (initial/final/progression) | Keep v14 resolvers with 105 views |
| **Generic instructions** | Need domain-specific college counseling knowledge | Use fine-tuned prompts + Knowledge Moat |
| **Basic session storage** | Need provenance tracking, audit logs | Use kb_sessions with full lineage |

---

## 2. ChatKit vs Custom UI Decision

### 2.1 OpenAI ChatKit Overview

**What is ChatKit?**
- Embeddable React component for chat UX
- Pre-built widgets: Chain-of-thought, tool calls, file attachments
- Theming system for brand customization
- Streaming support with real-time updates

**ChatKit Architecture:**
```typescript
import { Chat, ChatProvider } from '@openai/chatkit';

<ChatProvider
  endpoint="/api/agent/chat"
  sessionId={sessionId}
  theme="ivylevel-theme"
>
  <Chat
    widgets={['chain-of-thought', 'tool-calls', 'files']}
    onMessage={(msg) => console.log('Sent:', msg)}
  />
</ChatProvider>
```

### 2.2 Current Custom UI (Jenny Test Lab v4.0)

**What We Have:**
- Custom-built test harness in `/apps/test-chat-ui/`
- 90 golden tests (30 CAT-1 + 25 CAT-2 + 35 CAT-3)
- Deep trace inspection (OTel spans)
- Downloadable logs
- Custom validation UI for warmth/action scoring

**Custom UI Architecture:**
```typescript
// apps/test-chat-ui/app/test-lab/page.tsx
export default function TestLabPage() {
  const [currentResult, setCurrentResult] = useState<TestRunResponse | null>(null);
  const [suiteResult, setSuiteResult] = useState<SuiteResult | null>(null);

  return (
    <div className="grid grid-cols-3 gap-6">
      <ScenarioBuilder onRunSingle={handleRunSingle} />
      <LiveResults currentResult={currentResult} />
      <LogsPanel currentResult={currentResult} />
    </div>
  );
}
```

### 2.3 Comparison Matrix

| Feature | OpenAI ChatKit | Custom UI (Test Lab v4.0) | Winner |
|---------|---------------|---------------------------|--------|
| **Development Speed** | ✅ Drop-in component (hours) | ❌ Built from scratch (weeks) | ChatKit |
| **Production-Ready** | ✅ Battle-tested by OpenAI | ⚠️ Needs hardening | ChatKit |
| **Customization** | ⚠️ Limited to theming | ✅ Full control | Custom |
| **IvyLevel Branding** | ⚠️ Requires CSS overrides | ✅ Native branding | Custom |
| **Multi-Agent UX** | ⚠️ Generic chat bubbles | ✅ Agent-specific widgets | Custom |
| **Trace Inspection** | ❌ Not built-in | ✅ Full OTel visualization | Custom |
| **Golden Testing** | ❌ No test harness | ✅ 90 automated tests | Custom |
| **Streaming** | ✅ Native support | ⚠️ Custom SSE implementation | ChatKit |
| **File Attachments** | ✅ Built-in | ❌ Not implemented | ChatKit |
| **Mobile Support** | ✅ Responsive | ⚠️ Desktop-first | ChatKit |
| **Knowledge Moat Display** | ❌ Generic text | ✅ Can show CDS benchmarks, rubric factors | Custom |
| **Session History** | ⚠️ Basic history | ✅ Full session replay | Custom |
| **Cost** | ✅ Free (OSS) | ✅ Free (self-built) | Tie |
| **Lock-in Risk** | ⚠️ Dependent on OpenAI | ✅ Full ownership | Custom |

### 2.4 Recommended Hybrid Approach

**Recommendation:** ✅ **Use ChatKit as base, extend with IvyLevel-specific widgets**

**Architecture:**
```typescript
// apps/ivylevel-chat-ui/app/page.tsx
import { Chat, ChatProvider } from '@openai/chatkit';
import { KnowledgeMoatWidget } from '@/components/widgets/KnowledgeMoatWidget';
import { GPAProgressWidget } from '@/components/widgets/GPAProgressWidget';
import { CollegeListWidget } from '@/components/widgets/CollegeListWidget';

export default function IvyLevelChat() {
  return (
    <ChatProvider
      endpoint="/api/agent/chat"
      sessionId={sessionId}
      theme="ivylevel"
    >
      <Chat
        // Use ChatKit's standard widgets
        widgets={[
          'chain-of-thought',  // Show agent reasoning
          'tool-calls',        // Show resolver calls
          'streaming'          // Real-time updates
        ]}

        // Add IvyLevel custom widgets
        customWidgets={[
          {
            type: 'knowledge-moat',
            component: KnowledgeMoatWidget,
            trigger: (msg) => msg.includes('benchmark') || msg.includes('rubric')
          },
          {
            type: 'gpa-progress',
            component: GPAProgressWidget,
            trigger: (msg) => msg.intent === 'academics.gpa.progression'
          },
          {
            type: 'college-list',
            component: CollegeListWidget,
            trigger: (msg) => msg.intent === 'college.list'
          }
        ]}
      />
    </ChatProvider>
  );
}
```

**Custom Widget Example:**
```typescript
// components/widgets/KnowledgeMoatWidget.tsx
import { Widget } from '@openai/chatkit';

export const KnowledgeMoatWidget: Widget = ({ data }) => {
  const { college, benchmarks } = data;

  return (
    <div className="knowledge-moat-widget bg-purple-50 p-4 rounded-lg">
      <h3 className="font-bold">{college} Benchmarks (CDS Data)</h3>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <div>
          <span className="text-sm text-gray-600">GPA Range</span>
          <p className="text-lg font-bold">{benchmarks.gpa_range}</p>
        </div>

        <div>
          <span className="text-sm text-gray-600">Acceptance Rate</span>
          <p className="text-lg font-bold">{benchmarks.acceptance_rate}%</p>
        </div>
      </div>

      <div className="mt-4">
        <span className="text-sm text-gray-600">Rubric Factors (Stanford Model)</span>
        <ul className="list-disc list-inside mt-2">
          {benchmarks.rubric_factors.map(factor => (
            <li key={factor}>{factor}</li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-gray-500 mt-4">
        Source: CDS 2024 + Stanford Rubric Research
      </p>
    </div>
  );
};
```

### 2.5 Migration Strategy

**Phase 1 (Week 9):** Keep Test Lab v4.0 for internal testing
**Phase 2 (Week 13):** Build production ChatKit-based UI
**Phase 3 (Week 14):** Add custom IvyLevel widgets
**Phase 4 (Week 15):** User testing with coaches
**Phase 5 (Week 16):** Production deployment

**Rationale:**
- ✅ **Speed:** ChatKit gets us 80% there instantly
- ✅ **Quality:** Test Lab v4.0 continues to validate agents
- ✅ **Differentiation:** Custom widgets showcase Knowledge Moat
- ✅ **Flexibility:** Can replace ChatKit later if needed

---

## 3. Other OpenAI Components Evaluation

### 3.1 Agent Builder

**What is it?**
- Visual canvas for building multi-step workflows
- Drag-and-drop nodes for agents, tools, conditions
- Generates agent manifests automatically

**Should we use it?**
❌ **NO - Build custom React Flow-based builder**

**Rationale:**

| Requirement | Agent Builder | IvyLevel Custom Builder |
|-------------|---------------|------------------------|
| **Domain Knowledge** | ❌ Generic (sales, support) | ✅ College counseling-specific |
| **Knowledge Moat Integration** | ❌ Not aware of DS1-DS8 | ✅ Native moat data sources |
| **Template Library** | ❌ Generic templates | ✅ "Essay Agent", "Awards Agent" templates |
| **Manifest Format** | ⚠️ OpenAI-specific | ✅ IvyLevel YAML schema |
| **Validation** | ⚠️ Basic syntax check | ✅ Validates against v14 resolvers, moat schema |
| **Custom Nodes** | ⚠️ Limited extensibility | ✅ IvyLevel-specific nodes (e.g., "Query CDS", "Check Rubric") |

**Custom Builder Architecture:**
```typescript
// apps/agent-builder/components/AgentBuilderCanvas.tsx
import ReactFlow, { Node, Edge } from 'reactflow';

const ivyLevelNodes = [
  {
    type: 'query-resolver',
    label: 'Query Student Facts',
    icon: 'database',
    config: {
      resolver: ['v_gpa_latest', 'v_awards_progression', 'v_ecs_initial']
    }
  },
  {
    type: 'query-moat',
    label: 'Query Knowledge Moat',
    icon: 'shield',
    config: {
      source: ['moat_cds_colleges', 'moat_rubric_factors', 'moat_programs_library']
    }
  },
  {
    type: 'agent-handoff',
    label: 'Hand Off to Agent',
    icon: 'arrow-right',
    config: {
      target_agent: ['game-plan', 'awards', 'essay', 'college-list']
    }
  },
  {
    type: 'llm-call',
    label: 'LLM Reasoning',
    icon: 'brain',
    config: {
      model: ['gpt-4o', 'jenny_v9_eq'],
      temperature: 0.7
    }
  }
];

export function AgentBuilderCanvas() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  const onSave = async () => {
    // Generate IvyLevel agent manifest
    const manifest = generateManifest(nodes, edges);

    // Validate against schema
    const validation = await validateManifest(manifest);

    if (validation.valid) {
      await fetch('/api/builder/manifests', {
        method: 'POST',
        body: JSON.stringify(manifest)
      });
    }
  };

  return (
    <div className="h-screen">
      <NodePalette nodes={ivyLevelNodes} />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={setNodes}
        onEdgesChange={setEdges}
      />
      <PropertiesPanel selectedNode={selectedNode} />
    </div>
  );
}
```

### 3.2 Observability (OpenAI Traces)

**What is it?**
- Distributed tracing for agent execution
- Logs tool calls, handoffs, guardrail checks
- Integration with OpenTelemetry

**Should we use it?**
✅ **YES - Extend v14 OTel tracing**

**Integration:**
```typescript
// services/agent-framework/src/observability/telemetry.ts
import { trace, context } from '@opentelemetry/api';
import { AgentSpanProcessor } from '@openai/agents-sdk/otel';

// Extend v14 OTel setup
export function setupAgentTracing() {
  const tracer = trace.getTracer('ivylevel-agent-framework');

  // Add OpenAI Agent span processor
  tracerProvider.addSpanProcessor(new AgentSpanProcessor({
    // Capture all agent events
    captureToolCalls: true,
    captureHandoffs: true,
    captureGuardrails: true,

    // Send to existing Grafana
    exporter: grafanaExporter
  }));

  return tracer;
}
```

**Benefits:**
- ✅ Unified tracing for v14 + v1.0
- ✅ Visualize agent handoffs in Grafana
- ✅ Debug tool call failures
- ✅ Track guardrail violations

### 3.3 Fine-Tuning Integration

**What is it?**
- Automatic fine-tuning based on agent interactions
- A/B testing framework
- Continuous learning pipeline

**Should we use it?**
⚠️ **PARTIALLY - Extend with IvyLevel-specific training**

**Hybrid Approach:**
```typescript
// services/agent-framework/src/training/FineTuningPipeline.ts
import { FineTuningJob } from '@openai/agents-sdk';
import { TrainingLogger } from './TrainingLogger';

export class IvyLevelFineTuningPipeline {
  private logger: TrainingLogger;

  async collectTrainingData() {
    // Collect from kb_sessions + coach feedback
    const interactions = await pool.query(`
      SELECT
        ks.session_id,
        ks.user_input,
        ks.agent_response,
        cf.coach_rating,
        cf.correction
      FROM kb_sessions ks
      LEFT JOIN coach_feedback cf ON ks.session_id = cf.session_id
      WHERE cf.coach_rating >= 4  -- Only positive examples
    `);

    // Format for OpenAI fine-tuning
    const trainingData = interactions.rows.map(row => ({
      messages: [
        { role: 'system', content: 'You are IvyLevel coaching AI...' },
        { role: 'user', content: row.user_input },
        { role: 'assistant', content: row.correction || row.agent_response }
      ]
    }));

    return trainingData;
  }

  async runFineTuningJob(agent_name: string) {
    const data = await this.collectTrainingData();

    // Use OpenAI SDK for job creation
    const job = await FineTuningJob.create({
      model: 'gpt-4o-mini',
      training_data: data,
      suffix: `ivylevel_${agent_name}_${Date.now()}`
    });

    // Track in IvyLevel database
    await pool.query(`
      INSERT INTO finetuning_jobs (job_id, agent_name, status, created_at)
      VALUES ($1, $2, 'running', NOW())
    `, [job.id, agent_name]);

    return job;
  }
}
```

---

## 4. Integration Architecture

### 4.1 Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                           │
│  ┌──────────────────────────┐  ┌──────────────────────────────┐ │
│  │   ChatKit (Base UI)      │  │  IvyLevel Custom Widgets     │ │
│  │  - Chat bubbles          │  │  - Knowledge Moat display    │ │
│  │  - Streaming             │  │  - GPA progress charts       │ │
│  │  - Tool call widgets     │  │  - College list builder      │ │
│  └──────────────────────────┘  └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/SSE
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Agent Framework API                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  UnifiedOrchestrator (v14 CAT-1/2/3 + LangGraph)         │   │
│  │  - Routes to correct agent                               │   │
│  │  - Manages session context                               │   │
│  │  - Applies guardrails                                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              │                                   │
│              ┌───────────────┴────────────────┐                 │
│              │                                │                  │
│              ▼                                ▼                  │
│  ┌───────────────────────┐      ┌────────────────────────────┐ │
│  │  OpenAI Agents SDK    │      │   LangGraph State Graph    │ │
│  │  - Runner (exec loop) │      │   - Multi-agent routing    │ │
│  │  - Sessions           │      │   - Conditional edges      │ │
│  │  - Handoffs           │      │   - State persistence      │ │
│  └───────────────────────┘      └────────────────────────────┘ │
│              │                                │                  │
│              ▼                                ▼                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                8 Core Agents (OpenAI Agent instances)   │   │
│  │  [GamePlan] [ECs] [Awards] [Summer] [College] [Essay]  │   │
│  │              [Weekly] [Scholarship]                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│              │                                                   │
│              │ Tool Calls                                        │
│              ▼                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  v14 Infrastructure (Zero-Hallucination Foundation)     │   │
│  │  ┌────────────┐  ┌─────────────┐  ┌─────────────────┐  │   │
│  │  │ Resolvers  │  │ Retrieval   │  │ Composition EQ  │  │   │
│  │  │ (105 views)│  │ (Hybrid RAG)│  │ (jenny_v9_eq)   │  │   │
│  │  └────────────┘  └─────────────┘  └─────────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Data Layer (PostgreSQL 15+)                   │
│  ┌────────────────┐  ┌──────────────────┐  ┌─────────────────┐ │
│  │ v14 Core Facts │  │ Knowledge Moat   │  │ Agent System    │ │
│  │ - students     │  │ - moat_cds       │  │ - agent_manifests│ │
│  │ - vital_facts  │  │ - moat_rubrics   │  │ - finetuning_jobs│ │
│  │ - outcomes     │  │ - moat_twins     │  │ - ab_experiments │ │
│  │ - kb_items     │  │ - moat_programs  │  │ - training_logs  │ │
│  │ - 105 views    │  │ - moat_research  │  │                 │ │
│  └────────────────┘  └──────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Request Flow Example

**Scenario:** Student asks "What awards should I target?"

```
1. User sends message via ChatKit
   │
   ▼
2. API receives POST /api/agent/chat
   │
   ▼
3. UnifiedOrchestrator creates IvyLevelSession
   - Loads student context (GPA, ECs, demographics)
   │
   ▼
4. LangGraph routes to TriageAgent
   - TriageAgent determines: "awards" handoff
   │
   ▼
5. LangGraph transitions to AwardsAgent
   │
   ▼
6. OpenAI Runner executes AwardsAgent
   - Agent instructions: "Help student target competitive awards"
   - Available tools: [get_awards_initial, get_moat_programs, search_kb]
   │
   ▼
7. Agent calls tools (automatically via OpenAI SDK)
   a) get_awards_initial(student_id) → v14 resolver
      - Queries: SELECT * FROM v_awards_initial WHERE student_id = ...
      - Returns: [{award_category: 'STEM', status: 'target', ...}]

   b) get_moat_programs(category: 'STEM') → Knowledge Moat
      - Queries: SELECT * FROM moat_programs_library WHERE category = 'STEM'
      - Returns: [{program_name: 'Regeneron STS', prestige: 'high', ...}]
   │
   ▼
8. Agent generates response using tool results
   - No hallucination - all facts from tools
   │
   ▼
9. Guardrails validate response
   - Zero-hallucination check: ✅ All facts verified
   - Warmth check: ✅ Score 0.82
   - Action check: ✅ 3 actionable next steps
   │
   ▼
10. Response sent to ChatKit
    - Standard chat bubble + KnowledgeMoatWidget
    - Widget displays: STEM programs, deadlines, prestige tiers
    │
    ▼
11. Observability logged
    - OTel trace: triage → awards → 2 tool calls → guardrails → response
    - Stored in Grafana for debugging
```

### 4.3 Code Integration Points

| Layer | Component | Technology Stack | Key Files |
|-------|-----------|-----------------|-----------|
| **UI** | Chat Interface | ChatKit + React + Custom Widgets | `apps/ivylevel-chat-ui/app/page.tsx` |
| **API** | REST Endpoints | Next.js API Routes | `apps/ivylevel-chat-ui/app/api/agent-chat/route.ts` |
| **Orchestration** | Unified Orchestrator | OpenAI Runner + LangGraph | `services/agent-framework/src/core/UnifiedOrchestrator.ts` |
| **Agents** | 8 Core Agents | OpenAI Agents SDK | `services/agent-framework/src/agents/*.ts` |
| **Tools** | Resolver Tools | v14 Resolvers wrapped as Tools | `services/agent-framework/src/tools/resolvers.ts` |
| **Data** | Knowledge Moat | PostgreSQL + v15 schema | `services/agent-framework/db/migrations/v15_001_knowledge_moat.sql` |
| **Quality** | Guardrails | OpenAI Guardrails + v14 Verifiers | `services/agent-framework/src/quality/guardrails.ts` |
| **Observability** | Tracing | OpenTelemetry + OpenAI Agent spans | `services/agent-framework/src/observability/telemetry.ts` |

---

## 5. Implementation Roadmap

### Phase 1: OpenAI SDK Integration (Weeks 5-6)

**Week 5:**
- Install OpenAI Agents SDK: `npm install @openai/agents-sdk`
- Create tool wrappers for v14 resolvers (10 core resolvers)
- Build BaseAgent class extending OpenAI Agent
- Create IvyLevelSession extending OpenAI Session

**Week 6:**
- Implement GamePlanAgent using OpenAI SDK
- Add guardrails (zero-hallucination + warmth)
- Write integration tests
- Deploy to staging

**Deliverables:**
- ✅ `services/agent-framework/src/tools/resolvers.ts` (v14 tools)
- ✅ `services/agent-framework/src/core/BaseAgent.ts`
- ✅ `services/agent-framework/src/core/SessionManager.ts`
- ✅ `services/agent-framework/src/agents/GamePlanAgent.ts`
- ✅ Integration tests pass 100%

### Phase 2: Multi-Agent Routing (Weeks 7-8)

**Week 7:**
- Implement TriageAgent with handoffs
- Build LangGraph state graph
- Integrate with UnifiedOrchestrator
- Add 3 more agents (ECs, Awards, Summer)

**Week 8:**
- Complete remaining 4 agents (College, Essay, Weekly, Scholarship)
- Test agent-to-agent handoffs
- Add observability for handoffs

**Deliverables:**
- ✅ All 8 agents implemented
- ✅ LangGraph routing working
- ✅ Agent handoff traces visible in Grafana

### Phase 3: ChatKit UI (Weeks 13-14)

**Week 13:**
- Set up ChatKit in new Next.js app
- Theme ChatKit with IvyLevel branding
- Connect to `/api/agent/chat` endpoint
- Test basic chat flow

**Week 14:**
- Build 5 custom widgets:
  1. KnowledgeMoatWidget
  2. GPAProgressWidget
  3. CollegeListWidget
  4. AwardTargetsWidget
  5. EssayDraftsWidget
- Add widget triggers based on intent
- User testing with coaches

**Deliverables:**
- ✅ `apps/ivylevel-chat-ui/` (ChatKit-based)
- ✅ Custom widgets integrated
- ✅ Coach feedback collected

### Phase 4: Production (Weeks 15-16)

**Week 15:**
- Load testing (1000 concurrent users)
- Performance optimization (caching, connection pooling)
- Security audit
- Documentation

**Week 16:**
- Production deployment (blue-green)
- Route 5% traffic to v1.0
- Monitor for 48 hours
- Full cutover if healthy

**Deliverables:**
- ✅ Production deployment
- ✅ All agents live
- ✅ Observability healthy

---

## 6. Risks & Mitigations

### Risk 1: OpenAI SDK Lock-In

**Risk:** Dependence on OpenAI Agents SDK could limit flexibility

**Mitigation:**
- ✅ Abstract SDK behind IvyLevel interfaces (BaseAgent, IvyLevelSession)
- ✅ Keep v14 infrastructure independent (resolvers, RAG, composition)
- ✅ Can swap SDK if needed without rewriting business logic

**Code Pattern:**
```typescript
// services/agent-framework/src/core/BaseAgent.ts
import { Agent as OpenAIAgent } from '@openai/agents-sdk';

// Abstract interface
export interface IvyLevelAgent {
  name: string;
  run(message: string, session: IvyLevelSession): Promise<AgentResponse>;
}

// OpenAI implementation
export class OpenAIAgentImpl implements IvyLevelAgent {
  private agent: OpenAIAgent;

  constructor(config: AgentConfig) {
    this.agent = new OpenAIAgent({
      name: config.name,
      instructions: config.instructions,
      tools: config.tools
    });
  }

  async run(message: string, session: IvyLevelSession) {
    // Delegate to OpenAI SDK
    const result = await runner.run(this.agent, message, { session });
    return this.transformResponse(result);
  }
}

// Can swap to LangChain, Anthropic, or custom implementation later
export class LangChainAgentImpl implements IvyLevelAgent {
  // Alternative implementation
}
```

### Risk 2: ChatKit Customization Limits

**Risk:** ChatKit theming may not support full IvyLevel design

**Mitigation:**
- ✅ Start with ChatKit for MVP
- ✅ Build custom widgets for differentiation
- ✅ Keep Test Lab v4.0 as fallback
- ✅ Can fork ChatKit if needed (OSS license)

### Risk 3: Performance Degradation

**Risk:** OpenAI SDK overhead could slow responses

**Mitigation:**
- ✅ Load test early (Week 15)
- ✅ Implement caching layer
- ✅ Use streaming for perceived performance
- ✅ Benchmark vs v14 baseline

**Target Metrics:**
- p50 latency: < 1.5s (v14: 1.2s)
- p95 latency: < 3.0s (v14: 2.8s)
- Throughput: > 100 req/s (v14: 120 req/s)

### Risk 4: Agent Hallucinations

**Risk:** OpenAI agents could hallucinate despite tools

**Mitigation:**
- ✅ Strict guardrails (zero-hallucination check)
- ✅ Mandatory tool usage in instructions
- ✅ Response verification (v14 ResponseVerifier)
- ✅ Golden tests (100% pass rate required)

**Guardrail Example:**
```typescript
// If agent response contains facts not in tool results, reject
if (!allFactsVerified(output, tool_results)) {
  return {
    error: 'Hallucination detected',
    retry_with_tools: true
  };
}
```

---

## Conclusion

### Summary of Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Agent Execution** | ✅ OpenAI Agents SDK | Battle-tested primitives, streaming support, tool integration |
| **Orchestration** | ✅ LangGraph + OpenAI Handoffs | Best of both: LangGraph state + SDK handoffs |
| **Tools** | ✅ Wrap v14 Resolvers | Preserves zero-hallucination, reuses 105 views |
| **Sessions** | ✅ IvyLevelSession extends OpenAI Session | Rich context + backward compatibility |
| **Guardrails** | ✅ OpenAI + v14 Verifiers | Composable quality checks |
| **UI** | ✅ ChatKit + Custom Widgets | Fast MVP + IvyLevel differentiation |
| **Agent Builder** | ❌ Build Custom | Domain-specific, Knowledge Moat integration |
| **Observability** | ✅ OTel + OpenAI Spans | Unified tracing across v14 + v1.0 |

### Next Steps

1. **Get approval** on architectural decisions
2. **Begin Phase 1** (Week 5): OpenAI SDK integration
3. **Update v1.0 spec** with OpenAI components
4. **Kickoff implementation** per roadmap

### Open Questions

1. **OpenAI API Key Management:** Self-hosted vs OpenAI-hosted agents?
   - Recommendation: Self-hosted for data privacy

2. **ChatKit Licensing:** Any restrictions for commercial use?
   - TODO: Review license terms

3. **Fine-Tuning Budget:** Cost of continuous fine-tuning pipeline?
   - TODO: Estimate based on interaction volume

---

**Document Version:** 1.0
**Status:** Awaiting Approval
**Next Review:** Before Phase 1 implementation (Week 5)
**Owner:** Sami Nazir + Engineering Team

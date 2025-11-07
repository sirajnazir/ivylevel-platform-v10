# IvyLevel v31.4 Multi-Agent Platform - Full Stack Architecture & Design

**Version:** v31.4 (LangGraph Orchestration)
**Date:** 2025-11-04
**Status:** Implementation Complete (Non-Functional - Debugging Required)
**Author:** Platform Engineering Team

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture Overview](#system-architecture-overview)
3. [Frontend Architecture](#frontend-architecture)
4. [Backend Architecture](#backend-architecture)
5. [Database Schema](#database-schema)
6. [Data Flow & Message Flow](#data-flow--message-flow)
7. [User Cloning & Isolation](#user-cloning--isolation)
8. [State Management](#state-management)
9. [Intelligence System](#intelligence-system)
10. [API Specifications](#api-specifications)
11. [Deployment Architecture](#deployment-architecture)
12. [Security & Authentication](#security--authentication)
13. [Error Handling & Logging](#error-handling--logging)
14. [Performance Considerations](#performance-considerations)

---

## Executive Summary

### Platform Purpose
IvyLevel v31.4 is a multi-agent AI coaching platform designed to help high school students optimize their college application profiles through personalized assessment, strategic planning, and execution guidance.

### Key Technologies
- **Frontend:** React (Next.js), TypeScript, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript
- **Orchestration:** LangGraph (StateGraph-based workflow)
- **AI Models:** GPT-4o (assessment extraction), Fine-tuned GPT-4o-mini (Jenny v1)
- **Database:** PostgreSQL
- **Vector Store:** Pinecone (embeddings)
- **Caching:** Redis (planned for state checkpointing)
- **Observability:** Custom logger with LangSmith integration

### Architecture Philosophy
- **Agent Isolation:** Each specialized agent focuses on one domain (Assessment, GamePlan, Execution, etc.)
- **State Persistence:** Conversation history and facts persist across turns via LangGraph state management
- **Zero Agent Changes:** Existing agents remain unchanged; wrapper layer handles LangGraph integration
- **Student Cloning:** Production students cloned to isolated sandbox for v26 testing
- **Intelligence-Driven:** 46+ intelligence types guide agent decision-making

---

## System Architecture Overview

### High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USER (Browser)                                 │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ HTTPS
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js React App)                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  MultiAgentsTabRedesigned.tsx (v31.4)                          │   │
│  │  - Agent Cards (6 specialized agents)                          │   │
│  │  - Chat Interface                                              │   │
│  │  - Intelligence Trace Panel                                    │   │
│  │  - Real-time collaboration events                              │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                    Port: 5173 (Vite Dev Server)                        │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ HTTP (Proxied via Vite)
                                 │ POST /api/v26/session/start
                                 │ POST /api/v26/agents/:agentId/message
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    BACKEND (Express + TypeScript)                       │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  Route Layer (v26-multiagents.ts)                              │   │
│  │  - API Key Authentication                                      │   │
│  │  - Rate Limiting                                               │   │
│  │  - Student ID Mapping (huda-2025 → huda-v26-2025)              │   │
│  │  - Request/Response Transformation                             │   │
│  └──────────────────────────┬─────────────────────────────────────┘   │
│                             ▼                                           │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  LangGraph Orchestrator v31.4                                  │   │
│  │  ┌──────────────────────────────────────────────────────────┐ │   │
│  │  │  StateGraph Workflow                                      │ │   │
│  │  │  ┌────────────┐   ┌────────────┐   ┌────────────┐       │ │   │
│  │  │  │ load_state │──▶│ call_agent │──▶│    END     │       │ │   │
│  │  │  └────────────┘   └────────────┘   └────────────┘       │ │   │
│  │  │                                                           │ │   │
│  │  │  WorkflowState:                                          │ │   │
│  │  │  - student_id, session_id                                │ │   │
│  │  │  - conversation_history (cumulative)                     │ │   │
│  │  │  - collected_facts (cumulative)                          │ │   │
│  │  │  - agent_context (current phase, progress)               │ │   │
│  │  │  - current_response, current_metadata                    │ │   │
│  │  └──────────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────┬─────────────────────────────────────┘   │
│                             ▼                                           │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  Agent Tool Wrappers (AgentToolWrapper.ts)                     │   │
│  │  - assessment_agent_v18                                        │   │
│  │  - gameplan_agent_v18                                          │   │
│  │  - execution_agent                                             │   │
│  │  - extracurriculars_agent                                      │   │
│  │  - scholarships_agent                                          │   │
│  │  - summer_programs_agent                                       │   │
│  └──────────────────────────┬─────────────────────────────────────┘   │
│                             ▼                                           │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  Specialized Agents (BaseAgentWithIntelligence)                │   │
│  │  ┌──────────────────────────────────────────────────────────┐ │   │
│  │  │  AssessmentAgentV3ConversationalRealtime                 │ │   │
│  │  │  - TYPE-080: 4-Phase Assessment Flow                     │ │   │
│  │  │  - TYPE-081: IvyScore Calculation                        │ │   │
│  │  │  - TYPE-082: Gap Analysis Engine                         │ │   │
│  │  │  - TYPE-083: Potential Indicator Extraction              │ │   │
│  │  │  - TYPE-085: Rubric Scoring Engine                       │ │   │
│  │  │  - TYPE-086: Gap Priority Analyzer                       │ │   │
│  │  └──────────────────────────────────────────────────────────┘ │   │
│  │  ┌──────────────────────────────────────────────────────────┐ │   │
│  │  │  GamePlanAgentV3                                         │ │   │
│  │  │  - TYPE-001: Game Plan Synthesis                        │ │   │
│  │  │  - TYPE-002: Weak Spot Prioritization                   │ │   │
│  │  │  - TYPE-003: Timeline Architecture                      │ │   │
│  │  │  - TYPE-004: Multi-Path Convergence                     │ │   │
│  │  │  - TYPE-006: Quarterly Adaptation                       │ │   │
│  │  │  - TYPE-007: Time Mathematician                         │ │   │
│  │  └──────────────────────────────────────────────────────────┘ │   │
│  │  ┌──────────────────────────────────────────────────────────┐ │   │
│  │  │  ExecutionAgent                                          │ │   │
│  │  │  - TYPE-049 through TYPE-063 (15 intelligence types)    │ │   │
│  │  └──────────────────────────────────────────────────────────┘ │   │
│  │  ┌──────────────────────────────────────────────────────────┐ │   │
│  │  │  ExtracurricularsAgentRefactored                         │ │   │
│  │  │  - TYPE-013 through TYPE-019 (7 intelligence types)     │ │   │
│  │  └──────────────────────────────────────────────────────────┘ │   │
│  │  ┌──────────────────────────────────────────────────────────┐ │   │
│  │  │  ScholarshipsAgent                                       │ │   │
│  │  │  - TYPE-031 through TYPE-033 (3 intelligence types)     │ │   │
│  │  └──────────────────────────────────────────────────────────┘ │   │
│  │  ┌──────────────────────────────────────────────────────────┐ │   │
│  │  │  SummerProgramsAgentRefactored                           │ │   │
│  │  │  - TYPE-028 through TYPE-030 (3 intelligence types)     │ │   │
│  │  └──────────────────────────────────────────────────────────┘ │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                    Port: 8787 (Express Server)                         │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│   PostgreSQL Database       │   │   Pinecone Vector Store     │
│   - multiagent_sessions     │   │   Index: jenny-v3-3072      │
│   - multiagent_messages     │   │   Dimension: 3072           │
│   - kb_items (facts)        │   │   Model: text-embedding-    │
│   - intelligence_activations│   │          3-large            │
│   - students (production)   │   │                             │
│   Port: 5432                │   │   Namespaces:               │
└─────────────────────────────┘   │   - sessions/jtbd: 924      │
                                  │   - imessage: 40            │
                    ┌─────────────┤   - assessment: 9           │
                    ▼             └─────────────────────────────┘
┌─────────────────────────────┐
│   External AI Services      │
│   - OpenAI GPT-4o           │
│   - OpenAI GPT-4o-mini      │
│     (Fine-tuned: Jenny v1)  │
│   - LangSmith (tracing)     │
└─────────────────────────────┘
```

---

## Frontend Architecture

### Technology Stack

- **Framework:** Next.js 14 (React 18)
- **Language:** TypeScript 5.x
- **Styling:** Tailwind CSS
- **Build Tool:** Vite
- **State Management:** React Hooks (useState, useEffect)
- **HTTP Client:** Fetch API

### Component Hierarchy

```
MultiAgentsTabRedesigned.tsx (Main Component)
├── AgentCardsGrid (2-column responsive layout)
│   ├── AssessmentAgentCard
│   ├── GamePlanAgentCard
│   ├── ExecutionAgentCard
│   ├── ExtracurricularsAgentCard
│   ├── ScholarshipsAgentCard
│   └── SummerProgramsAgentCard
├── ChatInterface
│   ├── MessagesContainer
│   │   ├── UserMessage (role: user)
│   │   ├── AgentMessage (role: agent)
│   │   └── SystemMessage (role: system)
│   └── MessageInput (text input + send button)
└── IntelligencePanel (right sidebar)
    ├── PanelHeader ("v31.4 LangGraph" badge)
    ├── IntelligenceLogsList
    │   └── IntelligenceLogEntry[]
    │       ├── timestamp
    │       ├── event type
    │       ├── message
    │       └── details (expandable)
    └── ScrollToBottom
```

### Key Component: MultiAgentsTabRedesigned.tsx

**Location:** `/unified-frontend/apps/unified-app/src/components/v26/MultiAgentsTabRedesigned.tsx`

**State Management:**

```typescript
interface ComponentState {
  // Session Management
  sessionId: string | null;
  sessionStatus: 'idle' | 'starting' | 'active' | 'error';

  // Messages
  messages: Message[];

  // Intelligence Logs
  intelligenceLogs: IntelligenceLog[];

  // UI State
  currentInput: string;
  isLoading: boolean;
  error: string | null;

  // Agent State
  currentAgent: string;  // 'assessment-agent-v18', etc.
  currentPhase: 'assessment' | 'gameplan' | 'execution' | 'complete';

  // Real-time Updates
  collaborationEvents: CollaborationEvent[];
}

interface Message {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: string;
  agent_id?: string;
  metadata?: {
    data_collected_so_far?: Record<string, any>;
    current_phase?: number;
    intelligence_triggered?: string[];
  };
}

interface IntelligenceLog {
  timestamp: string;
  event: string;
  message: string;
  details?: Record<string, any>;
}
```

**API Integration:**

```typescript
// 1. Start Session
const startSession = async () => {
  const response = await fetch('/api/v26/session/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'test-key'
    },
    body: JSON.stringify({
      student_id: 'huda-2025',  // Real student ID
      session_type: 'onboarding'
    })
  });

  const data = await response.json();
  // data.session_id
  // data.welcome_message
  // data.v26_context.clone_student_id: 'huda-v26-2025'
};

// 2. Send Message
const sendMessage = async (message: string) => {
  const response = await fetch('/api/v26/agents/assessment-agent-v18/message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'test-key'
    },
    body: JSON.stringify({
      session_id: sessionId,
      student_id: 'huda-2025',  // Real student ID
      message: message
    })
  });

  const data = await response.json();
  // data.response (agent's reply)
  // data.metadata.data_collected_so_far
  // data.metadata.collaboration_events
  // data.metadata.intelligence_triggered
};
```

**Vite Proxy Configuration:**

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api/v26': {
        target: 'http://localhost:8787',
        changeOrigin: true
      }
    }
  }
});
```

### Visual Design

**Color Scheme:**
- Assessment Agent: Purple/Indigo (#6366f1)
- GamePlan Agent: Blue (#3b82f6)
- Execution Agent: Green (#10b981)
- Extracurriculars Agent: Orange (#f97316)
- Scholarships Agent: Yellow (#eab308)
- Summer Programs Agent: Pink (#ec4899)

**Agent Card States:**
- **Inactive:** Grayscale filter, opacity 0.5
- **Active:** Full color, border highlight, glow effect
- **Delegated:** Pulsing animation, "⚡ Delegated" badge

**Intelligence Panel:**
- **Event Types:**
  - `orchestrator_invoke` - 🚀 LangGraph v31.4 orchestration
  - `state_loaded` - 💾 Conversation history and facts loaded
  - `agent_execution` - 🤖 Agent executed with full context
  - `intelligence_triggered` - 🧠 Intelligence types activated
  - `workflow_complete` - ✅ Workflow completed

---

## Backend Architecture

### Technology Stack

- **Runtime:** Node.js 22.16.0
- **Framework:** Express 4.x
- **Language:** TypeScript 5.x
- **Process Manager:** tsx (TypeScript execution)
- **Orchestration:** LangGraph (@langchain/langgraph)
- **Database Client:** node-postgres (pg)
- **Vector Store:** @pinecone-database/pinecone
- **AI SDK:** @langchain/openai
- **Observability:** Custom logger (unified-logger)

### Directory Structure

```
services/agent-framework/
├── src/
│   ├── server-utfa.ts                    # Main entry point
│   ├── routes/
│   │   └── v26-multiagents.ts            # v31.4 API routes
│   ├── langgraph/                        # v31.4 LangGraph orchestration
│   │   ├── LangGraphOrchestratorV31.ts   # StateGraph workflow
│   │   ├── state.ts                      # WorkflowState interface
│   │   └── AgentToolWrapper.ts           # Agent → LangGraph tool adapter
│   ├── agents/
│   │   ├── BaseAgentWithIntelligence.ts  # Base class for all agents
│   │   └── v18/                          # v18 agent implementations
│   │       ├── AssessmentAgentV3ConversationalRealtime.ts
│   │       ├── GamePlanAgentV3.ts
│   │       ├── ExecutionAgent.ts
│   │       ├── ExtracurricularsAgentRefactored.ts
│   │       ├── ScholarshipsAgent.ts
│   │       └── SummerProgramsAgentRefactored.ts
│   ├── intelligence/
│   │   ├── IntelligenceRegistry.ts       # Central registry for 46 types
│   │   └── types/                        # Intelligence type implementations
│   │       ├── TYPE-001-GamePlanSynthesis.ts
│   │       ├── TYPE-080-FourPhaseAssessmentFlow.ts
│   │       └── ... (46 total types)
│   ├── facts/
│   │   ├── FactStore.ts                  # Facts persistence layer
│   │   └── FactCategoryMapper.ts         # Categorize facts
│   ├── nlp/
│   │   └── assessmentExtract.ts          # GPT-4o conversational extraction
│   ├── db/
│   │   └── pool.ts                       # PostgreSQL connection pool
│   └── config/
│       └── featureFlags.ts               # Feature flag system
├── logs/                                 # Application logs
│   └── backend-v31.4-debug-student-id.log
├── migrations/                           # Database migrations
│   ├── 030_create_agent_delegations.sql
│   └── 031_feature_flags.sql
└── package.json
```

### Core Components

#### 1. Server Entry Point

**File:** `src/server-utfa.ts`

```typescript
import express from 'express';
import { Pool } from 'pg';
import { createV26MultiAgentsRouter } from './routes/v26-multiagents.js';
import { AgentRegistry } from './agents/AgentRegistry.js';

const app = express();
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

// Initialize Agent Registry
const agentRegistry = new AgentRegistry(pool);

// Mount v26 routes
const v26Router = createV26MultiAgentsRouter(pool, agentRegistry);
app.use('/api/v26', v26Router);

app.listen(8787, () => {
  console.log('Jenny v3 API with UTFA + KBv6 Locked');
  console.log('Port: 8787');
});
```

#### 2. Route Handler

**File:** `src/routes/v26-multiagents.ts`

**Key Functions:**

```typescript
export function createV26MultiAgentsRouter(
  pool: Pool,
  agentRegistry: AgentRegistry
): Router {
  const router = Router();

  // Initialize LangGraph Orchestrator (SINGLETON)
  const orchestrator = new LangGraphOrchestratorV31(
    pool,
    agentRegistry.getFactStore(),
    undefined  // Redis disabled for now
  );

  // Route 1: Start Session
  router.post('/session/start', async (req, res) => {
    // ... (implementation below)
  });

  // Route 2: Send Message to Agent
  router.post('/agents/:agentId/message', async (req, res) => {
    // ... (implementation below)
  });

  // Route 3: Get Session
  router.get('/session/:sessionId', async (req, res) => {
    // ... (fetch session + messages from DB)
  });

  return router;
}
```

#### 3. LangGraph Orchestrator

**File:** `src/langgraph/LangGraphOrchestratorV31.ts`

**Class Structure:**

```typescript
export class LangGraphOrchestratorV31 {
  private pool: Pool;
  private factStore: FactStore;
  private checkpointer?: RedisSaver;  // Optional Redis checkpointing
  private app: StateGraph;            // Compiled LangGraph workflow
  private tools: Map<string, DynamicStructuredTool>;  // Agent tools

  constructor(pool: Pool, factStore: FactStore, redisUrl?: string) {
    this.pool = pool;
    this.factStore = factStore;

    // Initialize Redis checkpointer (optional)
    if (redisUrl) {
      const redisClient = createClient({ url: redisUrl });
      this.checkpointer = new RedisSaver(redisClient);
    }

    // Initialize agent tools (wrap all agents)
    this.initializeAgentTools();

    // Build LangGraph workflow
    this.app = this.buildWorkflow();
  }

  private initializeAgentTools() {
    // Instantiate all 6 agents
    const assessmentAgent = new AssessmentAgentV3ConversationalRealtime(
      this.pool,
      this.factStore
    );
    // ... (5 more agents)

    // Wrap each as LangGraph tool
    this.tools.set('assessment-agent-v18', wrapAgentAsTool(
      assessmentAgent,
      'assessment-agent-v18',
      'Runs 4-phase assessment using TYPE-080 through TYPE-086'
    ));
    // ... (5 more tools)
  }

  private buildWorkflow(): StateGraph {
    const workflow = new StateGraph<WorkflowState>({
      channels: {
        student_id: { ... },
        session_id: { ... },
        conversation_history: { ... },  // Append reducer
        collected_facts: { ... },       // Merge reducer
        agent_context: { ... },
        current_response: { ... },
        // ... more channels
      }
    });

    // Node 1: Load State
    workflow.addNode("load_state", async (state) => {
      // Load conversation history & facts from DB
      return {};  // State passes through
    });

    // Node 2: Call Agent
    workflow.addNode("call_agent", async (state) => {
      const currentAgent = state.agent_context.current_agent;
      const tool = this.tools.get(currentAgent);

      const result = await tool.func({
        student_id: state.student_id,
        session_id: state.session_id,
        message: state.conversation_history[state.conversation_history.length - 1].content,
        conversation_history: state.conversation_history,
        collected_facts: state.collected_facts,
        agent_context: state.agent_context
      });

      const parsed = parseAgentToolResult(result);

      return {
        current_response: parsed.response,
        current_metadata: parsed.metadata,
        collected_facts: { ...state.collected_facts, ...parsed.metadata?.data_collected_so_far },
        // ... more state updates
      };
    });

    // Define edges
    workflow.setEntryPoint("load_state");
    workflow.addEdge("load_state", "call_agent");
    workflow.addEdge("call_agent", "__end__");

    // Compile with optional checkpointing
    return workflow.compile({ checkpointer: this.checkpointer });
  }

  async handleMessage(request: {
    student_id: string;
    session_id: string;
    message: string;
  }): Promise<WorkflowState> {
    // Create initial state
    const initialState = {
      ...createInitialState(request.student_id, request.session_id),
      conversation_history: [{
        role: 'user' as const,
        content: request.message,
        timestamp: new Date()
      }]
    };

    // Execute workflow
    const config = this.checkpointer ? {
      configurable: {
        thread_id: request.session_id,
        checkpoint_ns: "production"
      }
    } : undefined;

    const result = await this.app.invoke(initialState, config);

    return result;
  }
}
```

#### 4. Agent Tool Wrapper

**File:** `src/langgraph/AgentToolWrapper.ts`

```typescript
export function wrapAgentAsTool(
  agent: BaseAgentWithIntelligence,
  agentId: string,
  description: string
): DynamicStructuredTool {
  const toolName = agentId.replace(/-/g, '_');

  return new DynamicStructuredTool({
    name: toolName,
    description,
    schema: AgentToolInputSchema,  // Zod schema

    func: async (input: AgentToolInput): Promise<string> => {
      // Transform LangGraph input → AgentQuery format
      const query: AgentQuery = {
        entity_id: input.student_id,
        session_id: input.session_id,
        query: input.message,
        metadata: {
          conversation_history: input.conversation_history,
          collected_facts: input.collected_facts,
          agent_context: input.agent_context
        }
      };

      // Call agent (unchanged interface)
      const result = await agent.handleQuery(query);

      // Transform AgentResponse → LangGraph tool output (JSON string)
      return JSON.stringify({
        success: true,
        response: result.response,
        confidence: result.validation_score,
        intelligence_triggered: result.intelligence_results?.map(r => r.type_id),
        metadata: result.metadata  // Includes data_collected_so_far
      });
    }
  });
}

export function parseAgentToolResult(result: string): {
  success: boolean;
  response?: string;
  metadata?: Record<string, any>;
  // ...
} {
  return JSON.parse(result);
}
```

#### 5. Workflow State Interface

**File:** `src/langgraph/state.ts`

```typescript
export interface WorkflowState {
  // Identity
  student_id: string;
  session_id: string;

  // Memory (persists across turns)
  conversation_history: ConversationMessage[];

  // Collected Facts (cumulative)
  collected_facts: {
    student_profile?: Record<string, any>;
    academic_data?: Record<string, any>;
    activities?: Array<any>;
    awards?: Array<any>;
    gaps?: Array<any>;
    strengths?: string[];
    ivy_score?: Record<string, any>;
    // ... more fact categories
  };

  // Agent Coordination
  agent_context: {
    current_agent: string;
    current_phase: 'assessment' | 'gameplan' | 'execution' | 'complete';
    assessment_progress: number;  // 0.0 - 1.0
    delegation_active: boolean;
    handover_pending: boolean;
    // ...
  };

  // Current Turn Output
  current_response?: string;
  current_metadata?: Record<string, any>;
  current_intelligence_triggered?: string[];
  current_confidence?: number;

  // Error Handling
  error?: string;
  retry_count: number;
}

export function createInitialState(
  student_id: string,
  session_id: string
): Partial<WorkflowState> {
  return {
    student_id,
    session_id,
    conversation_history: [],
    collected_facts: {},
    agent_context: {
      current_agent: 'assessment-agent-v18',
      current_phase: 'assessment',
      assessment_progress: 0.0,
      delegation_active: false,
      handover_pending: false
    },
    retry_count: 0
  };
}
```

---

## Database Schema

### PostgreSQL Tables

#### 1. multiagent_sessions

**Purpose:** Track multi-agent conversation sessions

```sql
CREATE TABLE multiagent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id VARCHAR(255) NOT NULL,  -- Clone student ID (e.g., 'huda-v26-2025')
  session_type VARCHAR(50) NOT NULL,  -- 'onboarding' | 'weekly_execution'
  status VARCHAR(50) NOT NULL,        -- 'in_progress' | 'completed' | 'error'
  current_phase VARCHAR(50),          -- 'assessment' | 'gameplan' | 'execution'
  current_agent VARCHAR(100),         -- 'assessment-agent-v18' | 'gameplan-agent-v18' | ...

  -- Assessment Package (JSON)
  assessment_package JSONB,
  -- { ivy_score: {...}, gaps: [...], strengths: [...] }

  -- GamePlan Package (JSON)
  gameplan_package JSONB,
  -- { roadmap: {...}, opportunities: {...}, timeline: [...] }

  -- Execution Package (JSON)
  execution_package JSONB,
  -- { week_plan: {...}, tasks: [...] }

  -- Analytics
  analytics JSONB,

  -- Timestamps
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,

  -- Indexes
  INDEX idx_student_sessions (student_id, started_at DESC)
);
```

#### 2. multiagent_messages

**Purpose:** Store conversation messages (user + agent)

```sql
CREATE TABLE multiagent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES multiagent_sessions(id) ON DELETE CASCADE,
  agent_id VARCHAR(100),              -- 'assessment-agent-v18' | NULL (for user messages)
  role VARCHAR(20) NOT NULL,          -- 'user' | 'agent' | 'system'
  content TEXT NOT NULL,              -- Message text
  processing_time INTEGER,            -- Milliseconds (for agent messages)
  confidence DECIMAL(5,2),            -- 0-100 (for agent messages)
  metadata JSONB,                     -- { data_collected_so_far, intelligence_triggered, ... }
  timestamp TIMESTAMP DEFAULT NOW(),

  -- Indexes
  INDEX idx_session_messages (session_id, timestamp ASC)
);
```

#### 3. kb_items (Knowledge Base Items)

**Purpose:** Store extracted facts from conversational assessment

```sql
CREATE TABLE kb_items (
  item_id VARCHAR(255) PRIMARY KEY,   -- '{student_id}_{category}_conversational_v28'
  student_id VARCHAR(255) NOT NULL,   -- Clone student ID
  item_type VARCHAR(100) NOT NULL,    -- 'Academic' | 'Activity' | 'Award' | 'Testing' | ...
  subtype VARCHAR(100),               -- Specific fact type (e.g., 'grade', 'gpa', 'sat_score')
  title_name TEXT,                    -- Human-readable title
  tier1_state VARCHAR(50),            -- 'In Transit' | 'Planned' | 'Outcome'
  source_ref VARCHAR(100),            -- 'gpt4o_conversational_extraction_v28'
  confidence VARCHAR(20),             -- 'high' | 'medium' | 'low'
  edges JSONB,                        -- { fact_type: value, v28_metadata: {...} }
  created_ts TIMESTAMP DEFAULT NOW(),
  updated_ts TIMESTAMP DEFAULT NOW(),

  -- Indexes
  INDEX idx_student_facts (student_id, source_ref)
);
```

**Example kb_item:**

```json
{
  "item_id": "huda-v26-2025_academic_conversational_v28",
  "student_id": "huda-v26-2025",
  "item_type": "Academic",
  "subtype": "grade",
  "title_name": "Conversational Assessment - Academic",
  "tier1_state": "In Transit",
  "source_ref": "gpt4o_conversational_extraction_v28",
  "confidence": "medium",
  "edges": {
    "grade": 10,
    "v28_metadata": {
      "confidence": 0.95,
      "quality_score": 0.9,
      "is_student_specific": true,
      "extraction_method": "gpt4o_conversational",
      "source_agent": "assessment-agent-v18",
      "created_at": "2025-11-04T23:26:45.123Z"
    }
  }
}
```

#### 4. intelligence_activations

**Purpose:** Track which intelligence types were triggered during agent execution

```sql
CREATE TABLE intelligence_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES multiagent_sessions(id),
  message_id UUID NOT NULL REFERENCES multiagent_messages(id),
  agent_id VARCHAR(100) NOT NULL,
  intelligence_type VARCHAR(50) NOT NULL,  -- 'TYPE-080' | 'TYPE-001' | ...
  status VARCHAR(20),                      -- 'triggered' | 'not_triggered'
  confidence DECIMAL(5,2),                 -- 0-100
  generated_text TEXT,                     -- Output from intelligence type
  timestamp TIMESTAMP DEFAULT NOW(),

  -- Indexes
  INDEX idx_session_intelligence (session_id, timestamp),
  INDEX idx_intelligence_type (intelligence_type)
);
```

#### 5. students (Production Table - Read Only for v26)

**Purpose:** Production student profiles (NOT modified by v26)

```sql
CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  student_id VARCHAR(255) UNIQUE NOT NULL,  -- 'huda-2025'
  name VARCHAR(255),
  email VARCHAR(255),
  grade INTEGER,
  school VARCHAR(255),
  -- ... many more fields
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Note:** v26 agents operate on CLONED student IDs, never touching production student records.

---

## Data Flow & Message Flow

### End-to-End Message Flow (Detailed)

#### Step 1: User Initiates Session

```
User (Browser)
  │
  │ 1. Clicks "Start Session" button
  │
  ▼
Frontend (MultiAgentsTabRedesigned.tsx)
  │
  │ 2. POST /api/v26/session/start
  │    Body: { student_id: "huda-2025", session_type: "onboarding" }
  │
  ▼
Vite Proxy (port 5173 → 8787)
  │
  ▼
Backend Route Handler (v26-multiagents.ts:107)
  │
  │ 3. Student ID Mapping
  │    "huda-2025" → "huda-v26-2025" (clone)
  │
  │ 4. Database Cleanup (for clone student)
  │    DELETE FROM intelligence_activations WHERE session_id IN (SELECT id FROM multiagent_sessions WHERE student_id = 'huda-v26-2025')
  │    DELETE FROM multiagent_messages WHERE session_id IN (SELECT id FROM multiagent_sessions WHERE student_id = 'huda-v26-2025')
  │    DELETE FROM multiagent_sessions WHERE student_id = 'huda-v26-2025'
  │    DELETE FROM kb_items WHERE student_id = 'huda-v26-2025'
  │
  │ 5. Create New Session
  │    INSERT INTO multiagent_sessions (student_id, session_type, status, current_phase, current_agent)
  │    VALUES ('huda-v26-2025', 'onboarding', 'in_progress', 'assessment', 'assessment-agent-v18')
  │    RETURNING id, status, current_phase, current_agent, started_at
  │
  │ 6. Generate Welcome Message
  │    "Hi Huda A.! 👋 Welcome to IvyLevel's MultiAgent Coaching Platform v2.0..."
  │
  │ 7. Insert Welcome Message
  │    INSERT INTO multiagent_messages (session_id, agent_id, role, content)
  │    VALUES ('{session_id}', 'system', 'system', '{welcome_message}')
  │
  │ 8. Return Response
  │    Status: 201 Created
  │    Body: {
  │      session_id: "bf79cc5b-c1d3-4e9c-a2af-09a03d4abdf3",
  │      status: "in_progress",
  │      current_phase: "assessment",
  │      current_agent: "assessment-agent-v18",
  │      started_at: "2025-11-04T23:26:44.253Z",
  │      welcome_message: "Hi Huda A.! ...",
  │      v26_context: {
  │        real_student_id: "huda-2025",
  │        clone_student_id: "huda-v26-2025",
  │        is_clone_student: true
  │      }
  │    }
  │
  ▼
Frontend
  │
  │ 9. Store session_id in state
  │    setSessionId("bf79cc5b-c1d3-4e9c-a2af-09a03d4abdf3")
  │    setSessionStatus("active")
  │
  │ 10. Display welcome message
  │     messages.push({ role: 'system', content: welcome_message })
  │
  ▼
User sees welcome message and chat interface
```

#### Step 2: User Sends First Message

```
User (Browser)
  │
  │ 1. Types "10th grade" and clicks Send
  │
  ▼
Frontend (MultiAgentsTabRedesigned.tsx)
  │
  │ 2. Add user message to UI immediately (optimistic update)
  │    messages.push({ role: 'user', content: '10th grade', timestamp: now() })
  │
  │ 3. POST /api/v26/agents/assessment-agent-v18/message
  │    Body: {
  │      session_id: "bf79cc5b-c1d3-4e9c-a2af-09a03d4abdf3",
  │      student_id: "huda-2025",  // Real student ID
  │      message: "10th grade"
  │    }
  │
  ▼
Vite Proxy (port 5173 → 8787)
  │
  ▼
Backend Route Handler (v26-multiagents.ts:316)
  │
  │ 4. Extract request parameters
  │    agentId = 'assessment-agent-v18'
  │    session_id = 'bf79cc5b-c1d3-4e9c-a2af-09a03d4abdf3'
  │    student_id = 'huda-2025'
  │    message = '10th grade'
  │
  │ 5. Get Clone Student ID from Session
  │    SELECT student_id, current_phase
  │    FROM multiagent_sessions
  │    WHERE id = 'bf79cc5b-c1d3-4e9c-a2af-09a03d4abdf3'
  │
  │    Result: cloneStudentId = 'huda-v26-2025'
  │
  │ 6. Save User Message to Database
  │    INSERT INTO multiagent_messages (session_id, agent_id, role, content)
  │    VALUES ('bf79cc5b-c1d3-4e9c-a2af-09a03d4abdf3', 'assessment-agent-v18', 'user', '10th grade')
  │    RETURNING id, timestamp
  │
  │ 7. Call LangGraph Orchestrator
  │    result = await orchestrator.handleMessage({
  │      student_id: 'huda-v26-2025',  // ✅ Clone student ID
  │      session_id: 'bf79cc5b-c1d3-4e9c-a2af-09a03d4abdf3',
  │      message: '10th grade'
  │    })
  │
  ▼
LangGraphOrchestratorV31 (LangGraphOrchestratorV31.ts:365)
  │
  │ 8. Create Initial State
  │    initialState = {
  │      student_id: 'huda-v26-2025',
  │      session_id: 'bf79cc5b-c1d3-4e9c-a2af-09a03d4abdf3',
  │      conversation_history: [{
  │        role: 'user',
  │        content: '10th grade',
  │        timestamp: now()
  │      }],
  │      collected_facts: {},
  │      agent_context: {
  │        current_agent: 'assessment-agent-v18',
  │        current_phase: 'assessment',
  │        assessment_progress: 0.0,
  │        delegation_active: false,
  │        handover_pending: false
  │      },
  │      retry_count: 0
  │    }
  │
  │ 9. Execute StateGraph Workflow
  │    result = await this.app.invoke(initialState, config)
  │
  ▼
StateGraph Workflow
  │
  │ 10. NODE: load_state
  │     - Load conversation history from DB (if checkpointing disabled)
  │     - Load collected facts from kb_items
  │     - State passes through unchanged
  │
  │ 11. EDGE: load_state → call_agent
  │
  │ 12. NODE: call_agent
  │     ┌──────────────────────────────────────────────┐
  │     │ 12a. Get current agent                       │
  │     │      currentAgent = 'assessment-agent-v18'   │
  │     │                                              │
  │     │ 12b. Get agent tool                          │
  │     │      tool = this.tools.get(currentAgent)     │
  │     │                                              │
  │     │ 12c. Extract last message                    │
  │     │      lastMessage = state.conversation_history[last] │
  │     │      // { role: 'user', content: '10th grade' }    │
  │     │                                              │
  │     │ 12d. Call agent tool                         │
  │     │      result = await tool.func({              │
  │     │        student_id: 'huda-v26-2025',          │
  │     │        session_id: 'bf79cc5b...',            │
  │     │        message: '10th grade',                │
  │     │        conversation_history: [...],          │
  │     │        collected_facts: {},                  │
  │     │        agent_context: {...}                  │
  │     │      })                                      │
  │     └──────────────────────────────────────────────┘
  │
  ▼
AgentToolWrapper (AgentToolWrapper.ts:80)
  │
  │ 13. Transform Input to AgentQuery
  │     query = {
  │       entity_id: 'huda-v26-2025',  // student_id → entity_id
  │       session_id: 'bf79cc5b...',
  │       query: '10th grade',          // message → query
  │       metadata: {
  │         conversation_history: [...],
  │         collected_facts: {},
  │         agent_context: {...}
  │       }
  │     }
  │
  │ 14. Call Agent
  │     result = await agent.handleQuery(query)
  │
  ▼
AssessmentAgentV3ConversationalRealtime (AssessmentAgentV3ConversationalRealtime.ts)
  │
  │ 15. Log Entry
  │     console.log('[V26.5_REALTIME] AssessmentAgentV3ConversationalRealtime.handleQuery() CALLED')
  │     console.log('[V26.5_REALTIME] Session:', session_id)
  │     console.log('[V26.5_REALTIME] Student:', entity_id)  // Should be 'huda-v26-2025'
  │     console.log('[V26.5_REALTIME] Message:', query)
  │
  │ 16. Load Existing Facts from kb_items
  │     SELECT * FROM kb_items
  │     WHERE student_id = 'huda-v26-2025'
  │       AND source_ref = 'gpt4o_conversational_extraction_v28'
  │
  │     Result: 0 rows (first turn, no facts yet)
  │
  │ 17. Call GPT-4o for Extraction
  │     prompt = `Extract structured data from: "10th grade"
  │               Previous data: {}
  │               Extract: grade, gpa, test_scores, activities, awards, etc.`
  │
  │     gpt4oResponse = await openai.chat.completions.create({
  │       model: 'gpt-4o',
  │       messages: [{ role: 'user', content: prompt }],
  │       response_format: { type: 'json_object' }
  │     })
  │
  │     console.log('[GPT4o_EXTRACT] ✅ Extracted data:', gpt4oResponse)
  │
  │     extractedData = {
  │       grade: 10
  │     }
  │
  │ 18. Store Facts in kb_items
  │     INSERT INTO kb_items (item_id, student_id, item_type, subtype, edges, source_ref)
  │     VALUES (
  │       'huda-v26-2025_academic_conversational_v28',
  │       'huda-v26-2025',
  │       'Academic',
  │       'grade',
  │       '{"grade": 10, "v28_metadata": {...}}',
  │       'gpt4o_conversational_extraction_v28'
  │     )
  │
  │     console.log('[EXTRACT_GPT4O] ✅ Stored 1 data points')
  │
  │ 19. Trigger Intelligence Types
  │     intelligenceRegistry.trigger('TYPE-080', {
  │       student_id: 'huda-v26-2025',
  │       session_id: 'bf79cc5b...',
  │       collected_data: { grade: 10 }
  │     })
  │
  │     TYPE-080 (4-Phase Assessment Flow):
  │       Phase 1: Academic Foundation (25%)
  │       Required: grade ✅, gpa ❌, courses ❌, test_scores ❌
  │       Status: IN PROGRESS (1/4 required fields)
  │
  │       Decision: Continue Phase 1 → Ask for GPA next
  │
  │ 20. Generate Response
  │     response = "Great! You're in 10th grade. That gives us good context for planning.
  │
  │                 Now let's talk about your academics. What's your current GPA?"
  │
  │ 21. Return Agent Result
  │     return {
  │       response: "Great! You're in 10th grade...",
  │       validation_score: 0.95,
  │       intelligence_results: [
  │         { type_id: 'TYPE-080', triggered: true, confidence: 1.0, data: {...} },
  │         { type_id: 'TYPE-081', triggered: false, ... }
  │       ],
  │       metadata: {
  │         data_collected_so_far: { grade: 10 },
  │         current_phase: 1,
  │         phase_progress: 0.25,
  │         missing_fields: ['gpa', 'courses', 'test_scores']
  │       }
  │     }
  │
  ▼
AgentToolWrapper (AgentToolWrapper.ts:144)
  │
  │ 22. Transform to JSON String
  │     return JSON.stringify({
  │       success: true,
  │       response: "Great! You're in 10th grade...",
  │       confidence: 0.95,
  │       intelligence_triggered: ['TYPE-080'],
  │       metadata: {
  │         data_collected_so_far: { grade: 10 },
  │         current_phase: 1,
  │         ...
  │       }
  │     })
  │
  ▼
StateGraph Workflow (call_agent node continues)
  │
  │ 23. Parse Agent Result
  │     parsed = parseAgentToolResult(result)
  │     // {
  │     //   success: true,
  │     //   response: "Great! You're in 10th grade...",
  │     //   metadata: { data_collected_so_far: { grade: 10 }, ... }
  │     // }
  │
  │ 24. Extract New Facts
  │     newFacts = parsed.metadata?.data_collected_so_far || {}
  │     // { grade: 10 }
  │
  │ 25. Update State
  │     return {
  │       current_response: parsed.response,
  │       current_metadata: parsed.metadata,
  │       current_intelligence_triggered: ['TYPE-080'],
  │       current_confidence: 0.95,
  │
  │       // Merge new facts with existing (cumulative)
  │       collected_facts: {
  │         ...state.collected_facts,  // {}
  │         ...newFacts                // { grade: 10 }
  │       },  // Result: { grade: 10 }
  │
  │       // Append agent response to conversation history
  │       conversation_history: [{
  │         role: 'agent',
  │         content: "Great! You're in 10th grade...",
  │         timestamp: now(),
  │         agent_id: 'assessment-agent-v18',
  │         metadata: parsed.metadata
  │       }]
  │     }
  │
  │ 26. EDGE: call_agent → END
  │
  ▼
StateGraph Workflow (END)
  │
  │ 27. Return Final State
  │     finalState = {
  │       student_id: 'huda-v26-2025',
  │       session_id: 'bf79cc5b...',
  │       conversation_history: [
  │         { role: 'user', content: '10th grade', ... },
  │         { role: 'agent', content: 'Great! ...', ... }
  │       ],
  │       collected_facts: { grade: 10 },
  │       agent_context: { ... },
  │       current_response: "Great! You're in 10th grade...",
  │       current_metadata: { data_collected_so_far: { grade: 10 }, ... },
  │       current_intelligence_triggered: ['TYPE-080'],
  │       current_confidence: 0.95
  │     }
  │
  ▼
LangGraphOrchestratorV31 (returns to handleMessage)
  │
  │ 28. Return to Route Handler
  │     return finalState
  │
  ▼
Backend Route Handler (v26-multiagents.ts:372)
  │
  │ 29. Transform Orchestrator Result
  │     agentResponse = {
  │       response: result.current_response,  // "Great! You're in 10th grade..."
  │       validation_score: result.current_confidence,  // 0.95
  │       intelligence_triggered: result.current_intelligence_triggered,  // ['TYPE-080']
  │       metadata: {
  │         ...result.current_metadata,
  │         orchestration: 'langgraph_v31.4',
  │         processing_time_ms: 2345,
  │         data_collected_so_far: { grade: 10 },
  │         collaboration_events: [
  │           { timestamp: '...', event: 'orchestrator_invoke', message: '🚀 LangGraph v31.4 orchestration' },
  │           { timestamp: '...', event: 'state_loaded', message: '💾 Conversation history and facts loaded' },
  │           { timestamp: '...', event: 'agent_execution', message: '🤖 assessment-agent-v18 executed' },
  │           { timestamp: '...', event: 'intelligence_triggered', message: '🧠 1 intelligence types activated' },
  │           { timestamp: '...', event: 'workflow_complete', message: '✅ Workflow completed (2345ms)' }
  │         ]
  │       }
  │     }
  │
  │ 30. Save Agent Response to Database
  │     INSERT INTO multiagent_messages (
  │       session_id, agent_id, role, content, processing_time, confidence, metadata
  │     ) VALUES (
  │       'bf79cc5b...',
  │       'assessment-agent-v18',
  │       'agent',
  │       'Great! You're in 10th grade...',  // ❌ NULL ISSUE HERE
  │       2345,
  │       95.0,
  │       '{"data_collected_so_far": {"grade": 10}, ...}'
  │     ) RETURNING id, timestamp
  │
  │ 31. Save Intelligence Activations
  │     INSERT INTO intelligence_activations (
  │       session_id, message_id, agent_id, intelligence_type, status, confidence
  │     ) VALUES (
  │       'bf79cc5b...', '{message_id}', 'assessment-agent-v18', 'TYPE-080', 'triggered', 100.0
  │     )
  │
  │ 32. Return HTTP Response
  │     Status: 200 OK
  │     Body: {
  │       response: "Great! You're in 10th grade...",
  │       metadata: {
  │         data_collected_so_far: { grade: 10 },
  │         current_phase: 1,
  │         orchestration: 'langgraph_v31.4',
  │         collaboration_events: [...]
  │       },
  │       v26_context: {
  │         real_student_id: 'huda-2025',
  │         clone_student_id: 'huda-v26-2025',
  │         orchestration: 'langgraph_v31.4'
  │       }
  │     }
  │
  ▼
Frontend (MultiAgentsTabRedesigned.tsx)
  │
  │ 33. Receive Response
  │     const data = await response.json()
  │
  │ 34. Update UI
  │     messages.push({
  │       role: 'agent',
  │       content: data.response,
  │       timestamp: now(),
  │       metadata: data.metadata
  │     })
  │
  │ 35. Update Intelligence Logs
  │     data.metadata.collaboration_events.forEach(event => {
  │       intelligenceLogs.push({
  │         timestamp: event.timestamp,
  │         event: event.event,
  │         message: event.message,
  │         details: event.details
  │       })
  │     })
  │
  │ 36. Scroll to Bottom
  │     messagesContainerRef.current.scrollToBottom()
  │
  ▼
User sees agent response: "Great! You're in 10th grade. That gives us good context for planning. Now let's talk about your academics. What's your current GPA?"
```

#### Step 3: Second Turn (Cumulative State)

When user sends "3.8 GPA":

```
Previous State (from LangGraph checkpointing or database):
  conversation_history: [
    { role: 'user', content: '10th grade' },
    { role: 'agent', content: 'Great! ...' }
  ]
  collected_facts: { grade: 10 }

New State After Second Turn:
  conversation_history: [
    { role: 'user', content: '10th grade' },
    { role: 'agent', content: 'Great! ...' },
    { role: 'user', content: '3.8 GPA' },
    { role: 'agent', content: 'Excellent! A 3.8 GPA...' }
  ]
  collected_facts: { grade: 10, gpa: 3.8 }  // ✅ Cumulative merge
```

**Key Point:** Each turn ADDS to `collected_facts`, never replaces. This is handled by the StateGraph channel reducer:

```typescript
collected_facts: {
  value: (prev: Record<string, any>, next: Record<string, any>) => {
    return { ...prev, ...next };  // Merge, not replace
  },
  default: () => ({})
}
```

---

## User Cloning & Isolation

### Purpose

The v26 multi-agent system operates in a **sandboxed environment** separate from production data:
- Test new orchestration logic without affecting real student profiles
- Allow experimentation with AI responses
- Enable parallel development of v26 features while v1/v2 remain in production

### Clone Student Mapping

**Mapping Table:**

| Real Student ID | Clone Student ID | Purpose |
|----------------|------------------|---------|
| `huda-2025` | `huda-v26-2025` | v26 testing student |
| `{student_id}` | `{student_id}-v26-clone` | Fallback pattern |

**Implementation (v26-multiagents.ts:121-124):**

```typescript
const V26_STUDENT_MAPPING: Record<string, string> = {
  'huda-2025': 'huda-v26-2025',
};
const cloneStudentId = V26_STUDENT_MAPPING[student_id] || `${student_id}-v26-clone`;
```

### Data Isolation

**Clone Student Data (Isolated):**
- `multiagent_sessions.student_id = 'huda-v26-2025'`
- `multiagent_messages` linked to clone sessions
- `kb_items.student_id = 'huda-v26-2025'`
- `intelligence_activations` linked to clone sessions

**Production Student Data (Untouched):**
- `students.student_id = 'huda-2025'` - Never modified
- Production facts, awards, activities - Never read or written by v26

### Session Cleanup

**Every session start clears old clone data (v26-multiagents.ts:133-166):**

```typescript
// Delete intelligence activations (linked via session_id)
DELETE FROM intelligence_activations
WHERE session_id IN (SELECT id FROM multiagent_sessions WHERE student_id = $1)

// Delete multiagent messages
DELETE FROM multiagent_messages
WHERE session_id IN (SELECT id FROM multiagent_sessions WHERE student_id = $1)

// Delete multiagent sessions
DELETE FROM multiagent_sessions WHERE student_id = $1

// Delete kb_items (facts)
DELETE FROM kb_items WHERE student_id = $1
```

**This ensures:**
- Clean baseline for each test run
- No stale facts from previous conversations
- Consistent starting state

### Frontend Context Display

**v26_context in API responses:**

```json
{
  "v26_context": {
    "real_student_id": "huda-2025",
    "clone_student_id": "huda-v26-2025",
    "is_clone_student": true,
    "orchestration": "langgraph_v31.4"
  }
}
```

This allows frontend to:
- Display "Testing Mode" indicator
- Show which clone student is active
- Confirm orchestration version

---

## State Management

### LangGraph StateGraph

**State Persistence Strategy:**

1. **In-Memory (Current Turn):**
   - `WorkflowState` object passed through nodes
   - Modifications made via node return values
   - Channel reducers merge updates

2. **Redis Checkpointing (Planned, Currently Disabled):**
   - After each node execution, state saved to Redis
   - State keyed by `thread_id = session_id`
   - Enables pause/resume across API calls

3. **Database Persistence (Active):**
   - `conversation_history` → `multiagent_messages` table
   - `collected_facts` → `kb_items` table
   - `agent_context` → `multiagent_sessions.current_phase`, etc.

### State Channel Reducers

**Conversation History (Append):**

```typescript
conversation_history: {
  value: (prev: ConversationMessage[], next: ConversationMessage[]) => {
    return [...prev, ...next];  // Append new messages
  },
  default: () => []
}
```

**Collected Facts (Merge):**

```typescript
collected_facts: {
  value: (prev: Record<string, any>, next: Record<string, any>) => {
    return { ...prev, ...next };  // Merge new facts, preserve existing
  },
  default: () => ({})
}
```

**Agent Context (Replace):**

```typescript
agent_context: {
  value: (prev: any, next: any) => {
    return { ...prev, ...next };  // Replace with new context
  },
  default: () => ({
    current_agent: 'assessment-agent-v18',
    current_phase: 'assessment',
    assessment_progress: 0.0,
    delegation_active: false,
    handover_pending: false
  })
}
```

### State Lifecycle

```
Request Start
  │
  ▼
createInitialState(student_id, session_id)
  │ Returns: Partial<WorkflowState>
  │   - student_id, session_id
  │   - conversation_history: [{ role: 'user', content: message }]
  │   - collected_facts: {}
  │   - agent_context: { current_agent, current_phase, ... }
  │
  ▼
StateGraph.invoke(initialState, config)
  │
  ├─▶ NODE: load_state
  │     Returns: {} (state passes through)
  │     State: { ...initialState }
  │
  ├─▶ EDGE: load_state → call_agent
  │
  ├─▶ NODE: call_agent
  │     Returns: {
  │       current_response: "...",
  │       current_metadata: {...},
  │       collected_facts: { grade: 10 },  ← New facts
  │       conversation_history: [{ role: 'agent', ... }]  ← New message
  │     }
  │     State: {
  │       ...previous state,
  │       current_response: "...",
  │       collected_facts: { ...prev, grade: 10 },  ← Merged by reducer
  │       conversation_history: [...prev, { role: 'agent', ... }]  ← Appended by reducer
  │     }
  │
  ├─▶ EDGE: call_agent → END
  │
  ▼
Return finalState
  │
  ▼
Route Handler receives finalState
  │
  ▼
Save to Database:
  - INSERT INTO multiagent_messages (content = finalState.current_response)
  - INSERT INTO kb_items (edges = finalState.collected_facts)
  - UPDATE multiagent_sessions SET analytics = finalState.agent_context
```

---

## Intelligence System

### Intelligence Types Registry

**Total Count:** 46 intelligence types (TYPE-001 through TYPE-086)

**Categories:**

1. **Assessment Intelligence (TYPE-080 - TYPE-086):** 7 types
   - TYPE-080: 4-Phase Assessment Flow
   - TYPE-081: IvyScore Calculation
   - TYPE-082: Gap Analysis Engine
   - TYPE-083: Potential Indicator Extraction
   - TYPE-085: Rubric Scoring Engine
   - TYPE-086: Gap Priority Analyzer

2. **GamePlan Intelligence (TYPE-001 - TYPE-007):** 7 types
   - TYPE-001: Game Plan Synthesis
   - TYPE-002: Weak Spot Prioritization
   - TYPE-003: Timeline Architecture
   - TYPE-004: Multi-Path Convergence
   - TYPE-006: Quarterly Adaptation
   - TYPE-007: Time Mathematician

3. **Execution Intelligence (TYPE-049 - TYPE-063):** 15 types
   - TYPE-049: Execution Ladder Navigation
   - TYPE-050: Outcome Engineering
   - TYPE-051: Task Decomposition Intelligence
   - TYPE-052: Portfolio Operating Cadence
   - TYPE-053: Time Architecture & Capacity
   - TYPE-054: Metric Ladder Instrumentation
   - TYPE-055: Blocking Detection & Escalation
   - TYPE-056: LoR Engineering
   - TYPE-057: Proof Engineering
   - TYPE-058: Application Mastery Rail
   - TYPE-059: Narrative Harmonization
   - TYPE-060: Seasonal Energy Allocation
   - TYPE-061: Multi-Agent Delegation
   - TYPE-062: Qualitative Transformation Tracking
   - TYPE-063: Progress Velocity & Momentum

4. **Extracurriculars Intelligence (TYPE-013 - TYPE-019):** 7 types
   - TYPE-013: EC Portfolio Optimization
   - TYPE-014: Narrative Synthesis
   - TYPE-015: Impact Engineering
   - TYPE-016: Time Mathematics
   - TYPE-019: Formalization Ladder

5. **Scholarships Intelligence (TYPE-031 - TYPE-033):** 3 types
   - TYPE-031: Scholarship Selection Matrix
   - TYPE-032: Application Timeline Strategy
   - TYPE-033: Financial Aid Intelligence

6. **Summer Programs Intelligence (TYPE-028 - TYPE-030):** 3 types
   - TYPE-028: Program Selection Matrix
   - TYPE-029: Program Application Strategy
   - TYPE-030: Cost-Benefit Intelligence

7. **Opportunity Intelligence (TYPE-020, TYPE-017, TYPE-022 - TYPE-027):** 7 types
   - TYPE-020: Opportunity Pipeline Architecture
   - TYPE-017: Task Multiplication (5X Formula)
   - TYPE-022: Award Strategy Orchestration
   - TYPE-023: Award Arbitrage System
   - TYPE-024: Award Tier Classification
   - TYPE-025: Content Recycling Matrix
   - TYPE-026: 70/20/10 Portfolio Rule
   - TYPE-027: Quick Wins Strategy

### Intelligence Activation Flow

**Example: TYPE-080 (4-Phase Assessment Flow)**

```typescript
// File: src/intelligence/types/TYPE-080-FourPhaseAssessmentFlow.ts

export class TYPE080_FourPhaseAssessmentFlow implements IntelligenceType {
  async execute(context: IntelligenceContext): Promise<IntelligenceResult> {
    const { student_id, collected_data, conversation_history } = context;

    // Phase 1: Academic Foundation (25%)
    const phase1Required = ['grade', 'gpa', 'courses', 'test_scores'];
    const phase1Collected = phase1Required.filter(field => !!collected_data[field]);
    const phase1Progress = phase1Collected.length / phase1Required.length;

    if (phase1Progress < 1.0) {
      // Phase 1 incomplete - continue gathering
      const nextField = phase1Required.find(field => !collected_data[field]);

      return {
        triggered: true,
        confidence: 1.0,
        data: {
          current_phase: 1,
          phase_progress: phase1Progress,
          missing_fields: phase1Required.filter(f => !collected_data[f]),
          next_question_focus: nextField,
          recommendation: `Continue Phase 1: Ask about ${nextField}`
        }
      };
    }

    // Phase 2: Extracurriculars (50%)
    const phase2Required = ['activities', 'leadership_roles', 'time_commitment'];
    // ... similar logic

    // Phase 3: Awards & Recognition (75%)
    // ... similar logic

    // Phase 4: Essays & Narrative (100%)
    // ... similar logic

    // All phases complete
    return {
      triggered: true,
      confidence: 1.0,
      data: {
        current_phase: 4,
        phase_progress: 1.0,
        assessment_complete: true,
        recommendation: 'Hand over to GamePlan Agent'
      }
    };
  }
}
```

**Integration in AssessmentAgent:**

```typescript
// After extracting facts from conversation
const intelligenceResults = await this.intelligenceRegistry.trigger('TYPE-080', {
  student_id: entity_id,
  session_id: session_id,
  collected_data: dataCollectedSoFar,
  conversation_history: query.metadata?.conversation_history
});

const phase1Intelligence = intelligenceResults.find(r => r.type_id === 'TYPE-080');

if (phase1Intelligence?.data?.next_question_focus) {
  // Use intelligence recommendation for next question
  const nextPrompt = this.generateQuestionFor(phase1Intelligence.data.next_question_focus);
  response = nextPrompt;
}
```

### Intelligence Activation Logging

**Database:**

```sql
INSERT INTO intelligence_activations (
  session_id,
  message_id,
  agent_id,
  intelligence_type,
  status,
  confidence,
  generated_text
) VALUES (
  '{session_id}',
  '{message_id}',
  'assessment-agent-v18',
  'TYPE-080',
  'triggered',
  100.0,
  '{"current_phase": 1, "phase_progress": 0.25, "missing_fields": ["gpa", "courses", "test_scores"]}'
)
```

**Frontend Intelligence Panel:**

```typescript
intelligenceLogs.push({
  timestamp: '2025-11-04T23:26:45.123Z',
  event: 'intelligence_triggered',
  message: '🧠 1 intelligence types activated',
  details: {
    types: ['TYPE-080'],
    results: [
      {
        type_id: 'TYPE-080',
        name: '4-Phase Assessment Flow',
        triggered: true,
        confidence: 1.0,
        data: {
          current_phase: 1,
          phase_progress: 0.25,
          missing_fields: ['gpa', 'courses', 'test_scores']
        }
      }
    ]
  }
});
```

---

## API Specifications

### Base URL

- **Development:** `http://localhost:8787`
- **Frontend Proxy:** `http://localhost:5173/api/v26` → `http://localhost:8787/api/v26`

### Authentication

**Header:** `x-api-key: test-key`

**Example:**

```bash
curl -X POST http://localhost:8787/api/v26/session/start \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-key" \
  --data '{"student_id":"huda-2025"}'
```

### Endpoints

#### 1. POST /api/v26/session/start

**Purpose:** Initialize a new multi-agent session

**Request:**

```json
{
  "student_id": "huda-2025",
  "session_type": "onboarding"  // or "weekly_execution"
}
```

**Response (201 Created):**

```json
{
  "session_id": "bf79cc5b-c1d3-4e9c-a2af-09a03d4abdf3",
  "status": "in_progress",
  "current_phase": "assessment",
  "current_agent": "assessment-agent-v18",
  "started_at": "2025-11-04T23:26:44.253Z",
  "welcome_message": "Hi Huda A.! 👋 Welcome to IvyLevel's MultiAgent Coaching Platform v2.0...",
  "v26_context": {
    "real_student_id": "huda-2025",
    "clone_student_id": "huda-v26-2025",
    "is_clone_student": true
  }
}
```

**Response (400 Bad Request):**

```json
{
  "error": "Missing student_id",
  "message": "student_id is required to start a session"
}
```

#### 2. POST /api/v26/agents/:agentId/message

**Purpose:** Send a message to a specific agent

**Path Parameters:**
- `agentId`: One of:
  - `assessment-agent-v18`
  - `gameplan-agent-v18`
  - `execution-agent`
  - `extracurriculars-agent`
  - `scholarships-agent`
  - `summer-programs-agent`

**Request:**

```json
{
  "session_id": "bf79cc5b-c1d3-4e9c-a2af-09a03d4abdf3",
  "student_id": "huda-2025",
  "message": "10th grade"
}
```

**Response (200 OK):**

```json
{
  "response": "Great! You're in 10th grade. That gives us good context for planning.\n\nNow let's talk about your academics. What's your current GPA?",
  "metadata": {
    "data_collected_so_far": {
      "grade": 10
    },
    "current_phase": 1,
    "phase_progress": 0.25,
    "missing_fields": ["gpa", "courses", "test_scores"],
    "orchestration": "langgraph_v31.4",
    "processing_time_ms": 2345,
    "collaboration_events": [
      {
        "timestamp": "2025-11-04T23:26:45.000Z",
        "event": "orchestrator_invoke",
        "message": "🚀 LangGraph v31.4 orchestration",
        "details": { "session_id": "...", "agent_id": "assessment-agent-v18" }
      },
      {
        "timestamp": "2025-11-04T23:26:45.100Z",
        "event": "state_loaded",
        "message": "💾 Conversation history and facts loaded",
        "details": { "history_messages": 1, "facts_keys": 0 }
      },
      {
        "timestamp": "2025-11-04T23:26:47.200Z",
        "event": "agent_execution",
        "message": "🤖 assessment-agent-v18 executed with full context",
        "details": { "agent": "assessment-agent-v18" }
      },
      {
        "timestamp": "2025-11-04T23:26:47.300Z",
        "event": "intelligence_triggered",
        "message": "🧠 1 intelligence types activated",
        "details": { "types": ["TYPE-080"] }
      },
      {
        "timestamp": "2025-11-04T23:26:47.345Z",
        "event": "workflow_complete",
        "message": "✅ Workflow completed (2345ms)",
        "details": { "duration_ms": 2345, "confidence": 0.95 }
      }
    ]
  },
  "v26_context": {
    "real_student_id": "huda-2025",
    "clone_student_id": "huda-v26-2025",
    "is_clone_student": true,
    "orchestration": "langgraph_v31.4"
  }
}
```

**Response (500 Internal Server Error - Current Bug):**

```json
{
  "error": "Failed to process message",
  "message": "null value in column \"content\" of relation \"multiagent_messages\" violates not-null constraint"
}
```

#### 3. GET /api/v26/session/:sessionId

**Purpose:** Retrieve session details and message history

**Response (200 OK):**

```json
{
  "session": {
    "id": "bf79cc5b-c1d3-4e9c-a2af-09a03d4abdf3",
    "student_id": "huda-v26-2025",
    "session_type": "onboarding",
    "status": "in_progress",
    "current_phase": "assessment",
    "current_agent": "assessment-agent-v18",
    "assessment_package": null,
    "gameplan_package": null,
    "execution_package": null,
    "analytics": null,
    "started_at": "2025-11-04T23:26:44.253Z",
    "completed_at": null
  },
  "messages": [
    {
      "id": "msg-001",
      "session_id": "bf79cc5b-c1d3-4e9c-a2af-09a03d4abdf3",
      "agent_id": "system",
      "role": "system",
      "content": "Hi Huda A.! 👋 Welcome to IvyLevel's MultiAgent Coaching Platform v2.0...",
      "timestamp": "2025-11-04T23:26:44.253Z"
    },
    {
      "id": "msg-002",
      "session_id": "bf79cc5b-c1d3-4e9c-a2af-09a03d4abdf3",
      "agent_id": "assessment-agent-v18",
      "role": "user",
      "content": "10th grade",
      "timestamp": "2025-11-04T23:26:45.000Z"
    },
    {
      "id": "msg-003",
      "session_id": "bf79cc5b-c1d3-4e9c-a2af-09a03d4abdf3",
      "agent_id": "assessment-agent-v18",
      "role": "agent",
      "content": "Great! You're in 10th grade...",
      "processing_time": 2345,
      "confidence": 95.0,
      "metadata": {
        "data_collected_so_far": { "grade": 10 },
        "current_phase": 1
      },
      "timestamp": "2025-11-04T23:26:47.345Z"
    }
  ],
  "intelligence_activations_count": 1
}
```

---

## Deployment Architecture

### Development Environment

**Backend:**
- **Process:** `tsx src/server-utfa.ts`
- **Port:** 8787
- **Log Output:** `logs/backend-v31.4-debug-student-id.log`

**Frontend:**
- **Process:** `npm run dev` (Vite)
- **Port:** 5173
- **Proxy:** `/api/v26` → `http://localhost:8787/api/v26`

### Database Connections

**PostgreSQL:**
- **Host:** `localhost` (dev) / `{RDS_ENDPOINT}` (prod)
- **Port:** 5432
- **Database:** `ivylevel_platform`
- **User:** `postgres`
- **Connection Pool:** Max 20 connections

**Pinecone:**
- **Index:** `jenny-v3-3072-093025`
- **Dimension:** 3072
- **Metric:** Cosine similarity
- **Namespaces:**
  - `sessions_jtbd`: 924 vectors
  - `imessage`: 40 vectors
  - `assessment`: 9 vectors

### Environment Variables

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ivylevel_platform
DB_USER=postgres
DB_PASSWORD=localpass

# OpenAI
OPENAI_API_KEY=sk-proj-...OjEA  # Force overridden in .env.local

# Pinecone
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=us-west1-gcp
PINECONE_INDEX=jenny-v3-3072-093025

# Redis (Optional, currently disabled)
REDIS_URL=redis://localhost:6379

# LangSmith (Optional)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=...
LANGCHAIN_PROJECT=ivylevel-v31.4

# Server
PORT=8787
NODE_ENV=development
```

### Process Management

**Start Backend:**
```bash
cd /Users/snazir/ivylevel-platform-v10/services/agent-framework
tsx src/server-utfa.ts
```

**Start Frontend:**
```bash
cd /Users/snazir/ivylevel-platform-v10/unified-frontend
npm run dev
```

**Background Processes (for debugging):**
```bash
# Backend with logging
tsx src/server-utfa.ts 2>&1 | tee logs/backend-v31.4-debug-student-id.log &

# Frontend
npm run dev &
```

---

## Security & Authentication

### API Key Authentication

**Middleware:** `withApiKey`

```typescript
const withApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== 'test-key') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing API key'
    });
  }

  next();
};
```

**Usage:**
```typescript
router.post('/session/start', withRateLimit, withApiKey, async (req, res) => {
  // Handler
});
```

### Rate Limiting

**Middleware:** `withRateLimit`

```typescript
const withRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                   // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
```

### Data Isolation

**Clone Student Boundary:**
- Frontend sends `real_student_id` in requests
- Backend ALWAYS maps to `clone_student_id`
- Database queries ONLY use `clone_student_id`
- Production `students` table NEVER queried or modified

**SQL Injection Protection:**
- All queries use parameterized statements
- No string concatenation for SQL

```typescript
// ✅ SAFE
const result = await pool.query(
  'SELECT * FROM multiagent_sessions WHERE student_id = $1',
  [cloneStudentId]
);

// ❌ DANGEROUS (never do this)
const result = await pool.query(
  `SELECT * FROM multiagent_sessions WHERE student_id = '${cloneStudentId}'`
);
```

---

## Error Handling & Logging

### Logging Strategy

**Observability Package:**
- **Location:** `packages/observability/dist/unified-logger.js`
- **Usage:** `const log = createLogger('component-name')`

**Log Levels:**
```typescript
log.event('orchestrator.init.start', { ... });     // Info level
log.error('orchestrator.init.failed', { ... });    // Error level
```

**Console Logging:**
- **Purpose:** Real-time debugging
- **Format:** `[COMPONENT_TAG] Description: { data }`
- **Examples:**
  - `[V31.4_ORCHESTRATOR] handleMessage() called: { ... }`
  - `[V26.5_REALTIME] AssessmentAgent.handleQuery() CALLED`
  - `[GPT4o_EXTRACT] ✅ Extracted data: { ... }`

**Log Files:**
- `logs/backend-v31.4-debug-student-id.log` - Current debug session
- `logs/backend-v31.4-live.log` - Live production logs

### Error Handling Patterns

**Try-Catch in Route Handlers:**

```typescript
router.post('/agents/:agentId/message', async (req, res) => {
  try {
    // ... implementation
    return res.status(200).json({ response, metadata });
  } catch (error) {
    logger.error('v26.agent.message.error', { error: String(error) });
    return res.status(500).json({
      error: 'Failed to process message',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
```

**Agent-Level Error Handling:**

```typescript
// AgentToolWrapper.ts
try {
  const result = await agent.handleQuery(query);
  return JSON.stringify({ success: true, response: result.response, ... });
} catch (error) {
  log.error('agent_tool.error', { agent_id: agentId, error: String(error) });
  return JSON.stringify({
    success: false,
    error: String(error),
    error_type: error instanceof Error ? error.constructor.name : 'UnknownError'
  });
}
```

**LangGraph Workflow Error Handling:**

```typescript
// call_agent node
if (!tool) {
  log.error('node.call_agent.agent_not_found', {
    agent: currentAgent,
    available_agents: Array.from(this.tools.keys())
  });
  return {
    error: `Agent not found: ${currentAgent}`,
    current_response: `Error: Agent ${currentAgent} not available`
  };
}
```

### Current Known Issues

**Issue 1: Null Response from LangGraph**
- **Symptom:** `current_response: null` causing database constraint violation
- **Location:** `LangGraphOrchestratorV31.ts:413` (workflow.invoke returns null response)
- **Impact:** All message sends fail with 500 error
- **Status:** Unresolved

**Issue 2: Missing Execution Logs**
- **Symptom:** No logs appear from workflow execution (load_state, call_agent nodes)
- **Expected:** Console.log statements in orchestrator and agent
- **Actual:** Only startup logs visible
- **Impact:** Unable to debug workflow execution
- **Status:** Under investigation

---

## Performance Considerations

### Response Time Targets

- **Session Start:** < 500ms
- **Message Processing:** < 3000ms
  - Route handler: < 50ms
  - LangGraph orchestration: < 100ms
  - Agent execution: < 2000ms
  - GPT-4o extraction: < 1500ms
  - Intelligence types: < 200ms
  - Database saves: < 150ms

### Database Query Optimization

**Indexes:**
```sql
-- Session lookups by student
CREATE INDEX idx_student_sessions ON multiagent_sessions(student_id, started_at DESC);

-- Message retrieval by session
CREATE INDEX idx_session_messages ON multiagent_messages(session_id, timestamp ASC);

-- Fact lookups by student and source
CREATE INDEX idx_student_facts ON kb_items(student_id, source_ref);

-- Intelligence tracking
CREATE INDEX idx_session_intelligence ON intelligence_activations(session_id, timestamp);
CREATE INDEX idx_intelligence_type ON intelligence_activations(intelligence_type);
```

**Connection Pooling:**
```typescript
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,              // Max connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});
```

### LangGraph State Optimization

**Redis Checkpointing (Future):**
- Avoids re-loading conversation history from DB on each turn
- State keyed by `thread_id = session_id`
- Automatic state expiration after 24 hours

**State Size Management:**
- `conversation_history`: Limit to last 20 messages (sliding window)
- `collected_facts`: No limit (all facts needed for intelligence)
- `agent_context`: Small fixed size

### Caching Strategy

**Pinecone Vector Cache:**
- RAG queries cached at application level
- TTL: 15 minutes
- Cache key: `query_hash + namespace`

**GPT-4o Response Cache:**
- Not currently implemented
- Future: Cache common extraction patterns

---

## Appendices

### A. File Locations Reference

**Backend Files:**
```
/Users/snazir/ivylevel-platform-v10/services/agent-framework/
├── src/
│   ├── server-utfa.ts
│   ├── routes/v26-multiagents.ts
│   ├── langgraph/
│   │   ├── LangGraphOrchestratorV31.ts
│   │   ├── state.ts
│   │   └── AgentToolWrapper.ts
│   └── agents/v18/
│       └── AssessmentAgentV3ConversationalRealtime.ts
└── logs/
    └── backend-v31.4-debug-student-id.log
```

**Frontend Files:**
```
/Users/snazir/ivylevel-platform-v10/unified-frontend/
├── apps/unified-app/src/components/v26/
│   └── MultiAgentsTabRedesigned.tsx
└── vite.config.ts
```

**Documentation:**
```
/Users/snazir/ivylevel-platform-v10/docs/
└── guides/
    └── V31_4_FULL_STACK_ARCHITECTURE.md (this file)
```

### B. Debugging Commands

**Start Backend with Debug Logging:**
```bash
cd /Users/snazir/ivylevel-platform-v10/services/agent-framework
tsx src/server-utfa.ts 2>&1 | tee logs/backend-debug-$(date +%Y%m%d-%H%M%S).log
```

**Test Session Start:**
```bash
curl -X POST http://localhost:8787/api/v26/session/start \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-key" \
  --data '{"student_id":"huda-2025","session_type":"onboarding"}'
```

**Test Message Send:**
```bash
SESSION_ID="bf79cc5b-c1d3-4e9c-a2af-09a03d4abdf3"

curl -X POST "http://localhost:8787/api/v26/agents/assessment-agent-v18/message" \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-key" \
  --data "{\"session_id\":\"$SESSION_ID\",\"student_id\":\"huda-2025\",\"message\":\"10th grade\"}"
```

**Check Database State:**
```bash
PGPASSWORD=localpass psql -h localhost -U postgres -d ivylevel_platform

-- Check sessions
SELECT id, student_id, current_phase, started_at FROM multiagent_sessions ORDER BY started_at DESC LIMIT 5;

-- Check messages
SELECT session_id, role, content, timestamp FROM multiagent_messages WHERE session_id = 'bf79cc5b...' ORDER BY timestamp;

-- Check facts
SELECT student_id, item_type, edges FROM kb_items WHERE student_id = 'huda-v26-2025';

-- Check intelligence activations
SELECT agent_id, intelligence_type, status, timestamp FROM intelligence_activations WHERE session_id = 'bf79cc5b...' ORDER BY timestamp;
```

### C. Common Troubleshooting

**Problem: Frontend shows 500 error "Failed to process message"**
- **Check:** Backend logs for database constraint violations
- **Fix:** Verify `current_response` is not null before database insert

**Problem: Facts not persisting across turns**
- **Check:** `kb_items` table for student_id = clone student
- **Check:** StateGraph channel reducers (should merge, not replace)
- **Fix:** Verify `collected_facts` reducer uses `{ ...prev, ...next }`

**Problem: No logs appearing during message processing**
- **Check:** Console.log buffering
- **Fix:** Add `console.log` flush or use file logging with `tee`

**Problem: Redis connection errors**
- **Check:** `REDIS_URL` environment variable
- **Fix:** Set `redisUrl` parameter to `undefined` in orchestrator initialization

---

## Conclusion

This document provides a comprehensive technical overview of the IvyLevel v31.4 Multi-Agent Platform, covering:
- Full-stack architecture (Frontend React + Backend Express + LangGraph)
- Complete data flow from user input to database persistence
- Student cloning and data isolation mechanisms
- Intelligence system with 46 specialized types
- API specifications and error handling
- Performance optimization strategies

**Current Status:** Implementation complete but non-functional due to LangGraph workflow returning null `current_response`. Requires immediate investigation of StateGraph channel configuration or workflow node return values.

**Next Steps for Tech Team:**
1. Debug LangGraph `this.app.invoke()` to identify why `current_response` is null
2. Add defensive null checks in route handler before database insert
3. Consider fallback to direct agent calls if LangGraph fails
4. Implement comprehensive error boundaries throughout workflow

---

**Document Version:** 1.0
**Last Updated:** 2025-11-04
**Maintained By:** Platform Engineering Team

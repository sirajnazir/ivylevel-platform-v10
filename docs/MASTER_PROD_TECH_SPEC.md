# IvyLevel Platform - Master Production Technical Specification
# v14 → v1.0 → v2.0 Multi-Agent + Unified Frontend Evolution

**Document Version:** v2.0
**Last Updated:** 2025-10-20
**Status:** ✅ PRODUCTION READY
**Platform Version:** v2.0 (Multi-Agent + Unified Frontend)
**Architecture:** Multi-Agent with v14 Zero-Hallucination Foundation + Integrated Frontend

---

## Document Purpose

This is the **single source of truth** for IvyLevel's production technical architecture, documenting:

1. **v14 Foundation** - Zero-hallucination SQL-based architecture (PRESERVED & ACTIVE)
2. **v1.0 Multi-Agent Layer** - 7 specialist agents built ON TOP of v14
3. **v2.0 Integrated Frontend** - Unified authentication + chat integration
4. **Current Implementation** - What actually exists in production code
5. **Data Cleanup & Quality** - Fixed awards/colleges dual data, comprehensive testing
6. **Production Architecture** - Complete end-to-end stack

**Key Principle:** v2.0 is ADDITIVE - v14 foundation + v1.0 agents + v2.0 unified frontend, all layers preserved and functioning.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [v14 Foundation (Preserved)](#v14-foundation-preserved)
4. [v1.0 Multi-Agent Layer (Current)](#v10-multi-agent-layer-current)
5. [Current Implementation Details](#current-implementation-details)
6. [Critical Gaps Analysis](#critical-gaps-analysis)
7. [Proposed Clean v1.0 Architecture](#proposed-clean-v10-architecture)
8. [Migration from Current to Proposed](#migration-from-current-to-proposed)
9. [File Reference Guide](#file-reference-guide)

---

## Executive Summary

### What IvyLevel v1.0 Is

**Vision:** Transform Jenny Duan's elite 1-on-1 college admissions coaching into a scalable multi-agent AI platform serving multiple coaches and thousands of students.

**Core Value Proposition:**
- **Zero Hallucination:** Every answer grounded in SQL facts or real coaching intelligence
- **Jenny's DNA:** Authentic coaching voice, EQ patterns, strategic formulas from 93+ weeks of real sessions
- **Multi-Coach Scalable:** Infrastructure for multiple coaches to contribute and scale
- **Specialist Agents:** 8 focused agents (1 autonomous + 7 reactive) vs generic chatbot

### Evolution: v14 → v1.0 → v2.0

**v14 (Preserved Foundation):**
- Single-coach Jenny-Huda platform
- Zero-hallucination SQL architecture
- 105 temporal fact resolvers
- Multi-dimensional orchestrator (CAT-1/CAT-2/CAT-3)
- Quality verification system
- Jenny's humanizer (voice layer)

**v1.0 (Additive Multi-Agent Layer):**
- 7 specialist agents (GamePlan, College, Essay, Admissions, ECs, Awards, Programs)
- Multi-coach infrastructure (JWT auth, coach_id isolation)
- Knowledge Moat (DS6/DS7 coaching intelligence + DS-T1/DS-T2 tactics)
- Conversation persistence (full audit trail)
- Agent handoffs (specificity-based routing)
- Test UI integration

**v2.0 (Integrated Frontend + Data Quality):**
- Unified frontend with authentication (JWT, role-based access, auto-refresh)
- Complete frontend integration (Student/Coach/Admin apps)
- Data cleanup (fixed awards/colleges duplicate data issues)
- College list tools (get_college_list, get_college_acceptances, get_college_attending)
- Comprehensive test suite (40+ tests, all passing)
- Production-ready end-to-end stack

### Current State

**✅ What Works (v2.0):**
- 7 reactive specialist agents (GamePlan, CollegeList, Essay, Admissions, ECs, Awards, Programs)
- v14 resolvers 100% preserved and accessible via tools
- JWT authentication with coach_id isolation + auto-refresh
- Conversation history persistence
- Agent routing and handoffs
- Unified frontend integration (Student/Coach/Admin apps)
- Frontend authentication components (LoginForm, AgentChat, ProtectedRoute)
- Knowledge Moat (DS6/DS7/DS-T1/DS-T2 - essays, AO perspectives, tactics, success patterns)
- Data quality fixes (awards/colleges duplicate data resolved)
- College list complete (3 new tools: get_college_list, get_college_acceptances, get_college_attending)
- Comprehensive test suite (40+ tests across CAT-1/CAT-2/CAT-3, all passing)

**✅ Data Integrity (v2.0):**
- Fixed v_awards_won view to query kb_items (not outcomes)
- Removed 12 duplicate awards from outcomes table
- Removed 1 duplicate from award_targets
- Single source of truth: kb_items for won awards, award_targets for planned awards
- Consistent 6 awards across all queries (no hallucinations)
- College data: 28 colleges, 9 acceptances, 1 attending (UIUC)

**⚠️ Known Limitations:**
1. **Using basic OpenAI SDK** (not OpenAI Agents SDK) - manual tool loop, no streaming
2. **Limited Knowledge Moat** - Only DS6/DS7/DS-T1/DS-T2 (coaching data), missing DS1-DS5 (external benchmarks)
3. **No streaming responses** - Full completion only (6-10 second wait times)
4. **RLS at code level only** - No database-level Row Level Security policies

---

## Architecture Overview

### System Layers (Bottom-Up)

```
┌─────────────────────────────────────────────────────────────────┐
│                     LAYER 5: USER INTERFACE                     │
│  Current: Test Chat UI (Next.js)                                │
│  Proposed: ChatKit + Custom Widgets                             │
│  Status: ⚠️ GAP - Test UI only, not production                  │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ HTTP/WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 LAYER 4: v1.0 MULTI-AGENT SYSTEM                │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Current: BaseAgent + AgentRegistry (Basic OpenAI SDK)  │  │
│  │  - Manual tool execution loop (90 lines)                │  │
│  │  - No streaming                                          │  │
│  │  - Sequential tool calls                                 │  │
│  │  Status: ✅ WORKS but ⚠️ GAP (not OpenAI Agents SDK)    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Proposed: OpenAI Agents SDK                            │  │
│  │  - Built-in tool execution                              │  │
│  │  - Native streaming                                      │  │
│  │  - Parallel tool calls                                   │  │
│  │  - Automatic handoffs                                    │  │
│  │  Status: 📋 PROPOSED (48 hours migration)               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  8 Specialist Agents:                                           │
│  • AssessmentAgent (AUTONOMOUS - 27-layer onboarding)          │
│  • GamePlanAgent (planning strategy)                            │
│  • CollegeListAgent (list building, chances)                   │
│  • EssayAgent (essay strategy, DS6 examples)                   │
│  • AdmissionsAgent (AO perspectives, DS7)                       │
│  • ExtracurricularsAgent (EC optimization)                      │
│  • AwardsAgent (award strategy)                                 │
│  • SummerProgramsAgent (program recommendations)                │
│                                                                 │
│  Support Infrastructure:                                        │
│  • SessionManager (conversation persistence)                    │
│  • ConversationRepository (DB persistence, replay)              │
│  • JWT Auth + Middleware (coach_id isolation)                  │
│  • KnowledgeMoatRepository (DS6/DS7 access)                    │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ Tool Calls (19 tools)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│            LAYER 3: TOOL LAYER (Resolver Wrappers)              │
│  Current: resolverTools.ts (800 lines)                          │
│  - Wraps v14 resolvers as OpenAI function calling tools         │
│  - 19 tools total (8 CAT-1 student data + 11 Knowledge Moat)    │
│  Status: ✅ COMPLETE                                            │
│                                                                 │
│  Tool Categories:                                               │
│  • Student Data: get_ecs_list, get_awards_list, get_gpa, etc.  │
│  • Knowledge Moat: search_essay_examples, get_ao_perspectives   │
│  • Tactics: get_relevant_tactics, get_success_patterns          │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ SQL Queries
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│          LAYER 2: v14 RESOLVER LAYER (Zero-Hallucination)       │
│  Status: ✅ 100% PRESERVED                                      │
│                                                                 │
│  8 Resolver Modules (105 temporal views):                       │
│  • academics.ts: gpa.latest(), transcript.final(), etc.         │
│  • enums.ts: awards.initial(), ecs.progression(), etc.          │
│  • testing.ts: sat.superscore(), sat.progression()              │
│  • gameplan.ts: gameplan.current()                              │
│  • college.ts: collegeList.working()                            │
│  • vitals.ts: vitals.snapshot()                                 │
│  • readiness.ts: ivyscore.current()                             │
│  • jtbd.ts: jtbd.profile()                                      │
│                                                                 │
│  Principles:                                                    │
│  • SQL-only (no LLM composition at this layer)                  │
│  • Temporal resolution (initial/latest/progression/final)       │
│  • Evidence chips (source_id + provenance)                      │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ PostgreSQL Queries
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               LAYER 1: DATA LAYER (PostgreSQL)                  │
│  Status: ✅ COMPLETE (with gaps in Knowledge Moat)              │
│                                                                 │
│  Personal Data (Student-Specific):                              │
│  • kb_items (awards, ECs, programs - universal enumeration)     │
│  • vital_facts (GPA, SAT, demographics - temporal facts)        │
│  • outcomes (assessment results)                                │
│  • agent_conversation_sessions (conversation history)           │
│  • agent_conversation_turns (turn-level audit trail)            │
│                                                                 │
│  Knowledge Moat (Shared Intelligence):                          │
│  ✅ Implemented:                                                │
│  • moat_essay_examples (DS6 - 3 real essays)                    │
│  • moat_ao_perspectives (DS7 - 12 perspectives)                 │
│  • moat_tactic_chips (DS-T1 - 47 tactics)                       │
│  • moat_success_patterns (DS-T2 - 78 patterns)                  │
│                                                                 │
│  ❌ Missing (Critical Gap):                                     │
│  • moat_cds_colleges (DS1 - college benchmarks) - MISSING       │
│  • moat_rubric_factors (DS2 - admission criteria) - MISSING     │
│  • moat_school_profiles (DS3 - high school data) - MISSING      │
│  • moat_placement_history (DS4 - school placements) - MISSING   │
│  • moat_student_twins (DS5 - similar profiles) - MISSING        │
│                                                                 │
│  Multi-Coach Infrastructure:                                    │
│  • coaches (coach profiles, verified status)                    │
│  • students.primary_coach_id (coach assignment)                 │
│  • All conversation tables include coach_id                     │
│  ⚠️ RLS Policies: NOT IMPLEMENTED (code-level only)             │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow: User Query → Agent Response

```
1. User: "What's my game plan for senior year?"
   ↓
2. Test UI → POST /api/agents/chat
   {
     student_id: "huda-2025",
     message: "What's my game plan...",
     headers: { Authorization: "Bearer <JWT with coach_id>" }
   }
   ↓
3. Agent Framework Server (Express + JWT Middleware)
   - Validates JWT
   - Extracts coach_id
   - Routes to AgentRegistry
   ↓
4. AgentRegistry.routeQuery()
   - Pattern matching → GamePlanAgent
   ↓
5. GamePlanAgent.execute()
   - Loads session (SessionManager)
   - Builds system prompt with Jenny's instructions
   - Calls OpenAI with tools: [getGamePlanTool, getVitalsTool, ...]
   ↓
6. OpenAI API (gpt-4o-mini)
   - Model decides: "I need to call get_game_plan tool"
   - Returns tool_calls: [{ name: "get_game_plan", arguments: { student_id: "huda-2025" } }]
   ↓
7. BaseAgent Tool Execution Loop (90 lines - CURRENT GAP)
   - Parses tool_calls
   - Executes: executeResolverTool("get_game_plan", { student_id })
   ↓
8. resolverTools.ts
   - Dispatches to: gameplan.current(pool, "huda-2025")
   ↓
9. v14 Resolver (gameplan.ts)
   - SQL: SELECT * FROM v_gameplan_current WHERE student_id = 'huda-2025'
   - Returns: { answer: "...", chips: [...], hits: [...] }
   ↓
10. Tool Result → Back to OpenAI
    - Adds tool result to messages
    - OpenAI: "Based on tool results, here's the answer..."
    - Returns final response text
    ↓
11. GamePlanAgent Response Processing
    - Stores turn in ConversationRepository
    - Returns: { response, session_id, agent_id, chips, hits }
    ↓
12. Test UI Displays Response
    - Shows text response
    - Shows evidence chips
```

**⚠️ Current Bottleneck:** Step 7 (manual tool loop) adds latency, blocks streaming, sequential-only tool calls

**✅ Proposed Solution:** Replace Step 5-7 with OpenAI Agents SDK `run()` - built-in loop, streaming, parallel tools

---

## v14 Foundation (Preserved)

### Overview

**Status:** ✅ **100% PRESERVED AND ACTIVE**

v14 is the zero-hallucination SQL-based architecture built for Jenny-Huda 1-on-1 coaching. ALL v14 code still exists and functions as the data/resolver layer for v1.0 agents.

### Key Components (All Active)

#### 1. Resolvers (SQL-Based Facts)

**Location:** `services/agent-framework/src/resolvers/*.ts`

**8 Resolver Modules:**

1. **academics.ts** (292 lines)
   ```typescript
   export const gpa = {
     initial: async (pool, student_id) => { /* Query v_gpa_initial */ },
     latest: async (pool, student_id) => { /* Query v_gpa_latest */ },
     progression: async (pool, student_id) => { /* Query v_gpa_progression */ }
   };

   export const transcript = {
     initial: async (pool, student_id) => { /* Query v_transcript_initial */ },
     final: async (pool, student_id) => { /* Query v_transcript_final */ },
     progression: async (pool, student_id) => { /* Query v_transcript_progression */ }
   };
   ```

2. **enums.ts** (305 lines)
   ```typescript
   export const awards = {
     initial: async (pool, student_id) => { /* Planned/Targeted awards */ },
     final: async (pool, student_id) => { /* Won awards */ },
     progression: async (pool, student_id) => { /* All state changes */ }
   };

   export const ecs = { /* Same pattern */ };
   export const programs = { /* Same pattern */ };
   ```

3. **testing.ts** (65 lines)
   ```typescript
   export const sat = {
     first: async (pool, student_id) => { /* First SAT attempt */ },
     latest: async (pool, student_id) => { /* Most recent */ },
     superscore: async (pool, student_id) => { /* Best composite */ },
     progression: async (pool, student_id) => { /* All attempts */ }
   };
   ```

4. **gameplan.ts** (72 lines)
   ```typescript
   export const gameplan = {
     current: async (pool, student_id) => { /* Current game plan */ }
   };
   ```

5. **college.ts** (139 lines)
   ```typescript
   export const collegeList = {
     working: async (pool, student_id) => { /* Current college list */ }
   };
   ```

6. **vitals.ts** (319 lines)
   ```typescript
   export const vitals = {
     snapshot: async (pool, student_id) => { /* Core profile vitals */ }
   };
   ```

7. **readiness.ts** (135 lines)
   ```typescript
   export const ivyscore = {
     current: async (pool, student_id) => { /* Readiness assessment */ }
   };
   ```

8. **jtbd.ts** (334 lines)
   ```typescript
   export const jtbd = {
     profile: async (pool, student_id) => { /* Student JTBD profile */ }
   };
   ```

**Total:** 1,661 lines of pure SQL-based resolver code

**Principle:** Every resolver:
- Returns structured data: `{ answer, chips, hits }`
- No LLM calls at this layer
- Full evidence provenance
- Temporal resolution support

#### 2. Multi-Dimensional Orchestrator (CAT-1/CAT-2/CAT-3)

**Location:** `services/agent-framework/src/orchestrator/agentChat-utfa.ts` (1,125 lines)

**Status:** ✅ **PRESERVED** (not actively used by v1.0 agents, but code intact for backward compatibility)

**Architecture:**
```typescript
// CAT-1: Enumeration (SQL-only)
if (isEnumerationQuery(query)) {
  const route = classifyEnumIntent(query);
  // Direct SQL: awards.initial(), ecs.progression(), etc.
  // NO LLM composition
}

// CAT-2: Narrative Composition (SQL + LLM)
else if (isNarrativeQuery(query)) {
  const facts = await hybridSearch(query); // SQL + Pinecone
  const composed = await composeAnswer(facts, query); // LLM synthesis
  const verified = await verifyQuality(composed); // Quality check
  const humanized = await humanize(composed); // Jenny's voice
}

// CAT-3: Pure Conversational (LLM-only)
else {
  const response = await openai.chat.completions.create({
    messages: [{ role: 'user', content: query }]
  });
}
```

**Note:** v1.0 agents bypass this orchestrator and call resolvers directly via tools.

#### 3. Compose Layer (LLM Synthesis)

**Location:** `services/agent-framework/src/compose/*.ts`

- **compose.ts** (465 lines) - Main LLM composition
- **compose-eq.ts** (387 lines) - EQ-aware composition
- **compose-canonical.ts** (234 lines) - Canonical composition

**Status:** ✅ **PRESERVED** (not actively used by v1.0 agents)

#### 4. Humanizer (Jenny's Voice)

**Location:** `services/agent-framework/src/lib/humanizer.js` (1,200+ lines)

**Status:** ✅ **PRESERVED** (not integrated with v1.0 agents yet)

**Features:**
- Warmth injection ("no worries!", exclamation science)
- Action orientation (specific next steps)
- Personal references (student name, context)
- Proof presenter (evidence formatting)

**Gap:** v1.0 agent prompts have some Jenny DNA, but don't call humanizer for post-processing.

#### 5. Quality Verification

**Location:** `services/agent-framework/src/quality/*.ts`

- **response-verifier.ts** - Quality checks
- **response-healer.ts** - Auto-correction

**Status:** ✅ **PRESERVED** (not integrated with v1.0 agents)

### v14 Database Schema (Preserved)

**Tables:**
- `kb_items` - Universal enumeration ledger (awards, ECs, programs)
- `vital_facts` - Temporal facts (GPA, SAT, demographics)
- `outcomes` - Assessment results

**Views (105 total):**
- Academics: `v_gpa_initial`, `v_gpa_latest`, `v_gpa_progression`, `v_transcript_*`
- Awards: `v_awards_initial`, `v_awards_final`, `v_awards_timeline`
- ECs: `v_ecs_initial`, `v_ecs_final`, `v_ecs_timeline`
- Programs: `v_programs_initial`, `v_programs_submitted`, `v_programs_decisions`, `v_programs_final`
- Testing: `v_sat_progression`

**Status:** ✅ **ALL ACTIVE** - v1.0 agents query these views via resolvers

---

## v1.0 Multi-Agent Layer (Current)

### Overview

**Purpose:** Add specialist agent layer ON TOP of v14, enabling:
1. Multi-coach scalability
2. Specialist agent routing (7 focused agents vs generic chatbot)
3. Conversation persistence
4. Knowledge Moat (coaching intelligence beyond SQL facts)

### Architecture (Current Implementation)

**Pattern:** Custom agent framework using basic OpenAI SDK

```typescript
// BaseAgent class (409 lines)
export abstract class BaseAgent {
  protected openai: OpenAI;  // Basic OpenAI SDK (NOT @openai/agents)
  protected manifest: AgentManifest;

  async execute(context: AgentExecutionContext): Promise<AgentExecutionResult> {
    // 1. Build system prompt
    const systemPrompt = this.buildSystemPrompt(context);

    // 2. Load conversation history
    const messages = [
      { role: 'system', content: systemPrompt },
      ...context.session.messages,
      { role: 'user', content: context.user_message }
    ];

    // 3. Call OpenAI with tools
    const toolCalls: ToolCall[] = [];
    const response = await this.callOpenAI(messages, toolCalls);

    // 4. Store conversation turn
    await conversationRepo.addTurn(/* ... */);

    return { response, chips, hits, toolCalls };
  }

  // ⚠️ CURRENT GAP: Manual 90-line tool execution loop
  protected async callOpenAI(messages, toolCalls): Promise<string> {
    let currentMessages = [...messages];
    let iterations = 0;
    const maxIterations = 5;

    while (iterations < maxIterations) {
      iterations++;

      // Call OpenAI API
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: currentMessages,
        tools: this.manifest.tools,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 500
      });

      const message = completion.choices[0].message;

      // If no tool calls, return response
      if (!message.tool_calls || message.tool_calls.length === 0) {
        return message.content || 'No response generated.';
      }

      // MANUAL TOOL EXECUTION
      currentMessages.push(message);

      for (const toolCall of message.tool_calls) {
        const toolName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        // Execute tool
        const result = await executeResolverTool(toolName, args);

        // Record tool call
        toolCalls.push({ tool_name: toolName, arguments: args, result });

        // Add tool response to messages
        currentMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: typeof result === 'string' ? result : JSON.stringify(result)
        });
      }

      // Loop continues (manual multi-turn handling)
    }

    return 'Reached iteration limit.';
  }
}
```

**Issues with Current Implementation:**
1. ❌ **No streaming** - Users wait 6-10s for complete response
2. ❌ **Sequential tools only** - Can't parallelize get_gpa + get_sat
3. ❌ **90 lines of boilerplate** - Manual loop management
4. ❌ **Hardcoded iteration limit** - Might cut off complex queries
5. ❌ **Basic error handling** - No retry logic

### 7 Specialist Agents (Current)

**All inherit from BaseAgent:**

1. **GamePlanAgent** (148 lines)
   - **Focus:** College application planning strategy
   - **Tools:** getGamePlanTool, getVitalsTool, getECsListTool, getAwardsListTool, getSummerProgramsListTool, getRelevantTacticsTool, getSuccessPatternsTool
   - **Handoffs:** ecs-agent, awards-agent, programs-agent, college-agent

2. **CollegeListAgent** (265 lines)
   - **Focus:** College list building, chances assessment
   - **Tools:** getCollegeBenchmarkTool, getCollegeRubricTool, getPlacementHistoryTool, findSimilarProfilesTool, getVitalsTool, getSATScoresTool, getGPATool, getRelevantTacticsTool
   - **Handoffs:** essay-agent, admissions-agent

3. **EssayAgent** (230 lines)
   - **Focus:** Essay strategy, writing guidance (Week 11)
   - **Tools:** searchEssayExamplesTool (DS6), getAOPerspectivesTool (DS7), getVitalsTool, getRelevantTacticsTool, getSuccessPatternsTool
   - **Handoffs:** admissions-agent

4. **AdmissionsAgent** (272 lines)
   - **Focus:** Admissions officer perspectives (Week 11)
   - **Tools:** getAOPerspectivesTool (DS7), getCollegeBenchmarkTool, getCollegeRubricTool, getVitalsTool
   - **Handoffs:** college-agent, essay-agent

5. **ExtracurricularsAgent** (171 lines)
   - **Focus:** EC optimization, impact maximization
   - **Tools:** getECsListTool, getVitalsTool, getRelevantTacticsTool, getSuccessPatternsTool
   - **Handoffs:** awards-agent, programs-agent

6. **AwardsAgent** (195 lines)
   - **Focus:** Award strategy, selection, positioning
   - **Tools:** getAwardsListTool, getVitalsTool, getRelevantTacticsTool, getSuccessPatternsTool
   - **Handoffs:** ecs-agent

7. **SummerProgramsAgent** (223 lines)
   - **Focus:** Summer program recommendations, selectivity
   - **Tools:** getSummerProgramsListTool, getSummerProgramsCatalogTool (DS6), getVitalsTool, getRelevantTacticsTool
   - **Handoffs:** college-agent, ecs-agent

**Total Agent Code:** 1,504 lines (excluding BaseAgent 409 lines = 1,913 lines total)

### Agent Registry & Routing

**Location:** `services/agent-framework/src/core/AgentRegistry.ts` (89 lines)

```typescript
class AgentRegistry {
  private agents: Map<string, RegisteredAgent> = new Map();

  constructor() {
    this.initializeAgents();
  }

  private initializeAgents(): void {
    const agentConstructors = [
      GamePlanAgent,
      ExtracurricularsAgent,
      AwardsAgent,
      SummerProgramsAgent,
      CollegeListAgent,
      EssayAgent,
      AdmissionsAgent
    ];

    for (const AgentClass of agentConstructors) {
      const instance = new AgentClass();
      const manifest = instance.getManifest();
      this.agents.set(manifest.agent_id, {
        instance,
        manifest,
        created_at: new Date()
      });
    }
  }

  routeQuery(query: string): BaseAgent {
    const lowerQuery = query.toLowerCase();

    // Keyword-based routing
    if (lowerQuery.includes('essay') || lowerQuery.includes('writing')) {
      return this.getAgent('essay-agent');
    }
    if (lowerQuery.includes('college list') || lowerQuery.includes('chances')) {
      return this.getAgent('college-agent');
    }
    // ... more patterns

    // Default to GamePlanAgent
    return this.getAgent('gameplan-agent');
  }
}

export const agentRegistry = new AgentRegistry(); // Global singleton
```

**Routing Strategy:** Simple keyword matching (not LLM-based)

**Handoff Detection:** Agents can suggest handoffs via `detectHandoff()` method based on specificity hierarchy.

### Session Management

**Location:** `services/agent-framework/src/core/SessionManager.ts` (362 lines)

```typescript
export class SessionManager {
  private sessions: Map<string, IvyLevelSession> = new Map();
  private conversationRepo: ConversationRepository;

  async getOrCreateSession(
    studentId: string,
    category?: string,
    coachId: string = 'jenny-coach-1'
  ): Promise<IvyLevelSession> {
    // Check in-memory cache
    const existingSessions = Array.from(this.sessions.values()).filter(
      (s) => s.student_id === studentId && s.coach_id === coachId
    );

    if (existingSessions.length > 0) {
      return existingSessions[0];
    }

    // Check database
    const dbResult = await pool.query(
      `SELECT session_id FROM agent_conversation_sessions
       WHERE student_id = $1 AND resolution_status = 'active'
       ORDER BY started_at DESC LIMIT 1`,
      [studentId]
    );

    if (dbResult.rows.length > 0) {
      return await this.loadSessionFromDatabase(dbResult.rows[0].session_id);
    }

    // Create new session
    return await this.createSession(studentId, category, coachId);
  }

  private async createSession(
    studentId: string,
    category?: string,
    coachId: string = 'jenny-coach-1'
  ): Promise<IvyLevelSession> {
    const sessionId = `sess_${studentId}_${Date.now()}`;
    const context = await this.loadStudentContext(studentId);

    const session: IvyLevelSession = {
      session_id: sessionId,
      student_id: studentId,
      coach_id: coachId,  // ✅ Coach isolation
      context,
      messages: [],
      created_at: new Date(),
      last_active: new Date(),
      turn_count: 0,
      category
    };

    this.sessions.set(sessionId, session);
    await this.conversationRepo.createSession(sessionId, studentId, context, coachId);

    return session;
  }

  private async loadStudentContext(studentId: string): Promise<StudentContext> {
    // Load vitals, GPA, SAT, etc. from v14 resolvers
    const vitalsResult = await vitals.snapshot(pool, studentId);
    return vitalsResult.context;
  }
}
```

**Features:**
- In-memory session cache (Map)
- Database persistence (PostgreSQL)
- Coach_id isolation (multi-coach support)
- Automatic context loading (student vitals)

**Gap:** No automatic session cleanup (potential memory leak)

### Conversation Persistence

**Location:** `services/agent-framework/src/repositories/ConversationRepository.ts` (362 lines)

**Database Schema:**
```sql
-- agent_conversation_sessions
session_id (PK)
student_id
coach_id  -- ✅ Multi-coach isolation
started_at
last_active_at
turn_count
student_context (JSONB)
category (gameplan | college_list | essays | etc.)
resolution_status (active | resolved | abandoned | escalated)

-- agent_conversation_turns
turn_id (PK)
session_id (FK)
turn_number
user_message
user_intent
agent_id
agent_response
response_chips (JSONB)
response_hits (JSONB)
handoff_suggested
handoff_to_agent
handoff_executed
tools_called (TEXT[])
tool_results (JSONB)
execution_time_ms
tokens_used
model_used
created_at

-- agent_handoffs
handoff_id (PK)
from_agent_id
to_agent_id
handoff_reason
suggested_at
executed_at
user_accepted
context_transferred
```

**Repository Methods:**
```typescript
class ConversationRepository {
  async createSession(sessionId, studentId, context, coachId): Promise<void> {
    await pool.query(
      `INSERT INTO agent_conversation_sessions
       (session_id, student_id, coach_id, student_context, started_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [sessionId, studentId, coachId, JSON.stringify(context)]
    );
  }

  async addTurn(sessionId, turnData): Promise<void> {
    // Insert turn with all metadata
  }

  async getReplay(sessionId): Promise<ConversationReplay> {
    // Full conversation history with context
  }
}
```

**Status:** ✅ **COMPLETE** - Full audit trail with replay capability

### Multi-Coach Infrastructure

**JWT Authentication:**

**Location:** `services/agent-framework/src/routes/auth.ts` (359 lines)

```typescript
// POST /api/auth/login
{
  email: "jenny@ivylevel.com",
  password: "IvyLevel2024!"
}

// Response:
{
  access_token: "eyJ...",  // JWT with coach_id
  refresh_token: "...",
  expires_in: 3600,
  coach: {
    coach_id: "jenny-coach-1",
    display_name: "Jenny Duan",
    email: "jenny@ivylevel.com"
  }
}

// JWT Payload:
{
  user_id: "coach_123",
  coach_id: "jenny-coach-1",  // ✅ Coach isolation key
  email: "jenny@ivylevel.com",
  role: "coach",
  iat: 1697529600,
  exp: 1697533200
}
```

**Middleware Enforcement:**

**Location:** `services/agent-framework/src/middleware/auth.ts` (93 lines)

```typescript
export function withJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;  // { user_id, coach_id, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

**Route Protection:**

**Location:** `services/agent-framework/src/routes/agents.ts` (342 lines)

```typescript
// All agent routes require JWT
router.post('/chat', withJWT, async (req, res) => {
  const coachId = req.user.coach_id;  // Extract from JWT
  const { student_id, message } = req.body;

  // Get or create session with coach_id
  let session = await sessionManager.getOrCreateSession(
    student_id,
    undefined,
    coachId
  );

  // Verify session belongs to this coach (RLS enforcement)
  if (session.coach_id && session.coach_id !== coachId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Execute agent
  const result = await agent.execute({
    user_message: message,
    session,
    student_id,
    coach_id: coachId
  });

  res.json(result);
});
```

**Status:** ✅ **COMPLETE** - JWT auth with coach_id isolation at code level

**Gap:** ⚠️ No database-level RLS policies (code-level enforcement only)

### Knowledge Moat (DS6/DS7)

**Purpose:** Store coaching intelligence beyond SQL facts

**Implemented Data Sources:**

**DS6: Essay Examples** (moat_essay_examples)
```sql
essay_id (PK)
college_name
prompt_type (personal_statement | supplemental | why_major | why_us)
essay_text (full essay)
themes (TEXT[])  -- e.g., {'identity', 'stem_passion', 'resilience'}
writing_quality (excellent | good | acceptable)
coach_commentary (what makes this essay strong)
student_archetype (overachiever | underdog | specialist | etc.)
outcome (admitted | waitlist | rejected)
```

**Current Data:** 3 real essays from Jenny-Huda sessions

**DS7: AO Perspectives** (moat_ao_perspectives)
```sql
perspective_id (PK)
college_name
topic (holistic_review | extracurricular_quality | essay_importance | etc.)
perspective_text (full AO insight)
key_points (TEXT[])  -- Extracted key takeaways
coaching_application (how to use this in advising)
```

**Current Data:** 12 real AO perspectives from coaching intelligence

**DS-T1: Tactic Chips** (moat_tactic_chips)
```sql
tactic_id (PK)
tactic_name
student_barrier (procrastination | perfectionism | overwhelm | etc.)
student_archetype (overachiever | underdog | etc.)
core_principle (tactical principle)
micro_actions (TEXT[])  -- Specific steps
typical_outcomes
```

**Current Data:** 47 tactics from Jenny's playbook

**DS-T2: Success Patterns** (moat_success_patterns)
```sql
pattern_id (PK)
title
archetype_tags (TEXT[])
student_profile_summary
barriers_faced (TEXT[])
tactics_used (TEXT[])
outcomes
key_learnings
```

**Current Data:** 78 patterns from real student journeys

**Repository:**

**Location:** `services/agent-framework/src/repositories/KnowledgeMoatRepository.ts` (1,012 lines)

```typescript
export class KnowledgeMoatRepository {
  // DS6: Essay Examples
  async searchEssayExamples(filters: EssaySearchFilters): Promise<EssayExample[]> {
    // Full-text search + filters (college, prompt_type, themes, archetype)
  }

  // DS7: AO Perspectives
  async getAOPerspectives(filters: AOPerspectiveFilters): Promise<AOPerspective[]> {
    // Search by college, topic
  }

  // DS-T1: Tactics
  async getRelevantTactics(filters: TacticFilters): Promise<TacticChip[]> {
    // Search by barrier, archetype
  }

  // DS-T2: Success Patterns
  async getSuccessPatterns(filters: PatternFilters): Promise<SuccessPattern[]> {
    // Search by archetype, barrier, tactic
  }
}
```

**Tool Integration:**

**Location:** `services/agent-framework/src/tools/resolverTools.ts` (lines 600-800)

```typescript
// DS6 Tool
const searchEssayExamplesTool = {
  type: 'function',
  function: {
    name: 'search_essay_examples',
    description: 'Search real essay examples from successful applicants',
    parameters: {
      type: 'object',
      properties: {
        college: { type: 'string' },
        prompt_type: { type: 'string', enum: ['personal_statement', 'supplemental', ...] },
        themes: { type: 'array', items: { type: 'string' } },
        archetype: { type: 'string' }
      }
    }
  }
};

// DS7 Tool
const getAOPerspectivesTool = {
  type: 'function',
  function: {
    name: 'get_ao_perspectives',
    description: 'Get admissions officer perspectives on specific topics',
    parameters: {
      type: 'object',
      properties: {
        college: { type: 'string' },
        topic: { type: 'string', enum: ['holistic_review', 'essay_importance', ...] }
      }
    }
  }
};
```

**Status:** ✅ **COMPLETE** - DS6/DS7/DS-T1/DS-T2 implemented and functional

---

## Current Implementation Details

### File Structure

```
services/agent-framework/
├── src/
│   ├── agents/                      # 8 specialist agents (1 autonomous + 7 reactive)
│   │   ├── AssessmentAgent.ts       # 531 lines (AUTONOMOUS - event-driven)
│   │   ├── GamePlanAgent.ts         # 148 lines
│   │   ├── CollegeListAgent.ts      # 265 lines
│   │   ├── EssayAgent.ts            # 230 lines (Week 11)
│   │   ├── AdmissionsAgent.ts       # 272 lines (Week 11)
│   │   ├── ExtracurricularsAgent.ts # 171 lines
│   │   ├── AwardsAgent.ts           # 195 lines
│   │   ├── SummerProgramsAgent.ts   # 223 lines
│   │   └── AutonomousGamePlanAgent.ts # 588 lines (Week 15, partial - superseded by AssessmentAgent)
│   │
│   ├── core/                        # Core agent framework
│   │   ├── BaseAgent.ts             # 409 lines - Base class
│   │   ├── AgentRegistry.ts         # 89 lines - Agent routing
│   │   ├── SessionManager.ts        # 362 lines - Session mgmt
│   │   └── types.ts                 # 245 lines - TypeScript types
│   │
│   ├── tools/                       # Tool definitions (resolver wrappers)
│   │   └── resolverTools.ts         # 800 lines - 19 tools
│   │
│   ├── repositories/                # Data access layer
│   │   ├── ConversationRepository.ts      # 362 lines
│   │   ├── KnowledgeMoatRepository.ts     # 1,012 lines
│   │   ├── CoachIntelligenceRepository.ts # 135 lines
│   │   └── StudentContextRepository.ts    # 192 lines
│   │
│   ├── resolvers/                   # ✅ v14 PRESERVED - SQL resolvers
│   │   ├── academics.ts             # 292 lines (GPA, transcript)
│   │   ├── enums.ts                 # 305 lines (awards, ECs, programs)
│   │   ├── testing.ts               # 65 lines (SAT)
│   │   ├── gameplan.ts              # 72 lines
│   │   ├── college.ts               # 139 lines
│   │   ├── vitals.ts                # 319 lines
│   │   ├── readiness.ts             # 135 lines
│   │   └── jtbd.ts                  # 334 lines
│   │
│   ├── orchestrator/                # ✅ v14 PRESERVED - Not used by v1.0 agents
│   │   └── agentChat-utfa.ts        # 1,125 lines (CAT-1/2/3 orchestration)
│   │
│   ├── compose/                     # ✅ v14 PRESERVED - Not used by v1.0 agents
│   │   ├── compose.ts               # 465 lines
│   │   ├── compose-eq.ts            # 387 lines
│   │   └── compose-canonical.ts     # 234 lines
│   │
│   ├── lib/                         # ✅ v14 PRESERVED - Not integrated yet
│   │   └── humanizer.js             # 1,200+ lines (Jenny's voice)
│   │
│   ├── quality/                     # ✅ v14 PRESERVED - Not integrated yet
│   │   ├── response-verifier.ts     # Quality checks
│   │   └── response-healer.ts       # Auto-correction
│   │
│   ├── routes/                      # HTTP API routes
│   │   ├── agents.ts                # 342 lines - Main agent routes
│   │   ├── auth.ts                  # 359 lines - JWT authentication
│   │   └── tactics.ts               # 210 lines - Knowledge Moat routes
│   │
│   ├── middleware/                  # Express middleware
│   │   └── auth.ts                  # 93 lines - JWT validation
│   │
│   ├── utils/                       # Utilities
│   │   └── jwt.ts                   # 78 lines - JWT helpers
│   │
│   ├── db/                          # Database
│   │   └── pool.ts                  # PostgreSQL connection pool
│   │
│   └── server-agents.ts             # 108 lines - Express server
│
├── db/migrations/                   # Database migrations
│   ├── 01-kb-items-universal.sql    # Universal enumeration schema
│   ├── v15_001_knowledge_moat.sql   # Knowledge Moat (DS1-DS8 tables)
│   ├── v15_002_proactivity_infrastructure.sql # Autonomous agents
│   ├── v15_003_student_context_intelligence.sql # Context tracking
│   └── v15_004_weekly_execution_infrastructure.sql # Execution tracking
│
└── package.json
    dependencies:
      "openai": "^6.4.0"  # ⚠️ Basic SDK, NOT @openai/agents
      "zod": "^3.23.8"
      "express": "^5.0.0"
      "bcryptjs": "^3.0.2"
      "jsonwebtoken": "^9.0.2"
```

### Tool Ecosystem (19 Tools)

**CAT-1 Student Data Tools (8 tools):**

1. `get_ecs_list` - Student ECs with phase support (initial/final/progression)
2. `get_awards_list` - Student awards with phase support
3. `get_programs_list` - Summer programs with phase support
4. `get_sat_scores` - SAT history (first/latest/all/superscore)
5. `get_gpa` - GPA (initial/latest/progression)
6. `get_transcript` - Full transcript
7. `get_game_plan` - Application timeline
8. `get_vitals` - Core profile vitals

**Knowledge Moat Tools (11 tools):**

**DS6 Essays:**
9. `search_essay_examples` - Search real essay examples (NEW Week 11)
   - Filters: college, prompt_type, themes, archetype
   - Returns: 3 real essays from Jenny-Huda sessions

**DS7 AO Perspectives:**
10. `get_ao_perspectives` - Get AO perspectives (NEW Week 11)
    - Filters: college, topic
    - Returns: 12 real perspectives from coaching intelligence

**DS-T1 Tactics:**
11. `get_relevant_tactics` - Get coaching tactics (NEW Week 12)
    - Filters: barrier, archetype
    - Returns: 47 tactics from Jenny's playbook

**DS-T2 Success Patterns:**
12. `get_success_patterns` - Get student journey patterns (NEW Week 13)
    - Filters: archetype, barrier, tactic
    - Returns: 78 patterns from real student journeys

**Future (DS1-DS5 - NOT IMPLEMENTED):**
13. `get_college_benchmark` - CDS college data (MISSING)
14. `get_college_rubric` - Admission rubric factors (MISSING)
15. `get_placement_history` - School-to-college placement (MISSING)
16. `find_similar_profiles` - Student twins matching (MISSING)
17. `get_summer_programs_catalog` - Prestige-tiered programs catalog (MISSING)
18. `get_hyperlocal_data` - School profiles (MISSING)
19. `search_research_papers` - Chetty papers (MISSING)

### Dependencies

**Current package.json:**

```json
{
  "dependencies": {
    "openai": "^6.4.0",           // ⚠️ Basic SDK, NOT @openai/agents
    "zod": "^3.23.8",             // Type validation
    "express": "^5.0.0",          // Web framework
    "bcryptjs": "^3.0.2",         // Password hashing
    "jsonwebtoken": "^9.0.2",     // JWT auth
    "pg": "^8.11.3",              // PostgreSQL client
    "@pinecone-database/pinecone": "^3.0.3",  // v14 hybrid search
    "dotenv": "^16.4.5"
  }
}
```

**Missing (Required for Proposed Architecture):**

```json
{
  "@openai/agents": "^1.0.0",  // OpenAI Agents SDK (MISSING)
  "@openai/openai": "^6.4.0"   // Already have, but need @openai/agents wrapper
}
```

### API Surface

**Current Express Routes:**

**Authentication:**
- `POST /api/auth/login` - Login and get JWT
- `GET /api/auth/me` - Get profile (requires JWT)
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout
- `POST /api/auth/change-password` - Change password (requires JWT)

**Agents (Protected - Requires JWT):**
- `POST /api/agents/chat` - Execute agent
- `GET /api/agents/list` - List all agents
- `GET /api/agents/:agent_id` - Get agent details
- `GET /api/agents/sessions/:student_id` - Get student sessions
- `GET /api/agents/replay/:session_id` - Get conversation replay

**Knowledge Moat:**
- `GET /api/tactics` - Get coaching tactics
- `GET /api/tactics/:tactic_id` - Get tactic details
- `GET /api/success-patterns` - Get success patterns

**Health:**
- `GET /health` - Health check

**Status:** ✅ **FUNCTIONAL** - All routes working with JWT auth

**Gap:** ⚠️ No OpenAPI 3.1 spec, no generated SDK libraries, no streaming WebSocket endpoint

### Frontend Integration

**Test Chat UI:**

**Location:** `apps/test-chat-ui/`

**Test Pages:**
- `app/agent-test/page.tsx` - Agent test interface (React)
- `app/jenny-ui/page.tsx` - Jenny UI
- `app/huda-test/page.tsx` - Test with Huda data
- `app/kb-test/page.tsx` - Knowledge Base test

**API Routes:**
- `app/api/agent-chat/route.ts` - HTTP client to agent-framework service
- `app/api/agent/act/route.ts` - Agent execution endpoint

**Client Flow:**
```typescript
// Frontend (React)
const response = await fetch('/api/agent-chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${jwt_token}`
  },
  body: JSON.stringify({
    student_id: 'huda-2025',
    message: 'What should I work on?',
    agent_id: 'gameplan-agent'  // Optional: auto-route if not provided
  })
});

// Next.js API Route → Agent Framework Service
const agentResponse = await fetch(`${AGENT_SERVICE_URL}/api/agents/chat`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': req.headers.get('authorization')
  },
  body: JSON.stringify(req.body)
});
```

**Status:** ✅ **FUNCTIONAL** - Test UI successfully calls agent-framework service

**Gap:** ⚠️ Test UI only (not production ChatKit), no streaming, no custom widgets

---

## Critical Gaps Analysis

### Gap 1: Basic OpenAI SDK (Not Agents SDK)

**Current Implementation:**
- Using `openai@6.4.0` package
- Manual tool execution loop (90 lines in BaseAgent.ts)
- No streaming responses
- Sequential tool calls only
- Hardcoded iteration limit (5)

**Impact on User Experience:**
- ❌ **6-10 second wait times** - Users see nothing until complete response
- ❌ **Poor perceived performance** - Feels slow compared to ChatGPT
- ❌ **Inefficient multi-fact queries** - get_gpa, get_sat, get_awards run sequentially (3× latency)
- ❌ **Complex queries may fail** - Max 5 iterations might not be enough

**Impact on Development:**
- ❌ **90 lines of boilerplate per agent pattern** - More code to maintain
- ❌ **Manual error handling** - No automatic retry logic
- ❌ **Debugging is harder** - No built-in tracing
- ❌ **Not leveraging OpenAI best practices** - Missing latest features

**Proposed Solution:**
- Migrate to `@openai/agents` package
- Use built-in `run()` function for agent execution
- Enable native streaming
- Enable parallel tool calls
- Remove 90-line manual loop

**Estimated Effort:** 48 hours (2 weeks)

**ROI:** High - 92% code reduction, streaming UX, parallel tools, better debugging

---

### Gap 2: No Autonomous/Proactive Agents

**Current State:**
- All agents are **reactive only** - wait for user to initiate conversation
- No scheduled nudges, reminders, or check-ins
- AutonomousGamePlanAgent exists (588 lines) but event system incomplete

**Impact on User Experience:**
- ❌ **Students forget deadlines** - No proactive reminders
- ❌ **Students lose momentum** - No regular check-ins
- ❌ **Feels like chatbot, not coach** - Real coaches reach out proactively

**Impact on Business:**
- ❌ **Lower engagement** - Students don't return without prompting
- ❌ **Lower completion rates** - No nudges to finish applications
- ❌ **Competitive disadvantage** - Other platforms have reminders/nudges

**Proposed Solution:**
- Complete event system (scheduler, notification service)
- Implement autonomous game plan agent
- Add weekly execution agent
- Enable time-based and event-based triggers

**Estimated Effort:** 40 hours (1 week)

**Priority:** ⚠️ **HIGH** - CTO identified this as 80-90% of program value

---

### Gap 3: Limited Knowledge Moat (Missing DS1-DS5)

**Current State:**
- ✅ DS6: Essay Examples (3 real essays)
- ✅ DS7: AO Perspectives (12 perspectives)
- ✅ DS-T1: Tactic Chips (47 tactics)
- ✅ DS-T2: Success Patterns (78 patterns)
- ❌ DS1: Common Data Set (college benchmarks) - MISSING
- ❌ DS2: College Rubrics (admission criteria) - MISSING
- ❌ DS3: Hyperlocal Data (school profiles) - MISSING
- ❌ DS4: Placement History (school placements) - MISSING
- ❌ DS5: Student Twins (similar profiles) - MISSING

**Impact on User Experience:**
- ❌ **Can't compare student vs college benchmarks** - "Is my GPA competitive for Stanford?"
- ❌ **Can't find similar admitted students** - "Show me students like me who got into MIT"
- ❌ **Can't assess school-specific context** - "How does my GPA compare at my high school?"
- ❌ **Generic advice vs data-driven** - Missing external validation

**Impact on Competitive Position:**
- ❌ **Platforms like CollegeVine have CDS data** - We don't
- ❌ **Naviance has school placement history** - We don't
- ❌ **AdmitYogi has student twins data** - We don't

**Proposed Solution:**
- Implement DS1-DS5 data sources
- Web scraping + data pipelines
- Integrate with resolvers as new tools

**Estimated Effort:** 20-30 hours (2-3 weeks)

**Priority:** 🟡 **MEDIUM** - Nice-to-have, but internal coaching data (DS6/DS7) more valuable for authenticity

---

### Gap 4: No Production UI (Test UI Only)

**Current State:**
- Test Chat UI (Next.js) - functional but not production-ready
- No ChatKit integration
- No custom IvyLevel widgets
- No streaming responses in UI
- No accessibility considerations
- No telemetry

**Impact on User Experience:**
- ❌ **Looks like internal tool, not product** - Not polished
- ❌ **No real-time streaming** - Have to wait for full response
- ❌ **No visual widgets** - Just text, no GPA cards, college list tables, etc.
- ❌ **Not accessible** - No WCAG 2.1 compliance

**Impact on Launch:**
- ❌ **Can't launch to customers** - Test UI is not production-ready
- ❌ **No beta testing** - Can't give to early users

**Proposed Solution:**
- Integrate ChatKit (OpenAI's chat UI library)
- Build 5 custom widgets:
  - KnowledgeMoatWidget (show coaching intel source)
  - GPAProgressWidget (visual GPA timeline)
  - CollegeListWidget (sortable college table)
  - AwardTargetsWidget (award strategy visual)
  - EssayDraftsWidget (essay tracking)
- Enable streaming responses (SSE or WebSocket)
- Add WCAG 2.1 accessibility

**Estimated Effort:** 60-80 hours (2-3 weeks)

**Priority:** 🔴 **CRITICAL** - Blocker for launch

---

### Gap 5: RLS at Code Level Only (No Database-Level Policies)

**Current State:**
- Coach_id enforcement in code (middleware, repository methods)
- No PostgreSQL Row Level Security (RLS) policies
- Relies on application layer to prevent cross-coach data access

**Risk:**
- ⚠️ **If code has bug, coaches could access other coaches' data**
- ⚠️ **No defense-in-depth** - Single point of failure
- ⚠️ **Compliance risk** - FERPA requires data isolation

**Proposed Solution:**
- Implement PostgreSQL RLS policies on all tables
- Enable RLS: `ALTER TABLE agent_conversation_sessions ENABLE ROW LEVEL SECURITY;`
- Create policies:
  ```sql
  CREATE POLICY coach_isolation ON agent_conversation_sessions
    USING (coach_id = current_setting('app.coach_id')::text);
  ```
- Set coach_id in session before each query:
  ```typescript
  await pool.query(`SET LOCAL app.coach_id = $1`, [coach_id]);
  ```

**Estimated Effort:** 8-12 hours (1-2 days)

**Priority:** 🟡 **MEDIUM** - Defense-in-depth, but code-level enforcement working

---

### Gap 6: No Streaming Responses

**Current State:**
- All responses are full completions (no streaming)
- Users wait 6-10 seconds seeing nothing
- OpenAI SDK supports streaming, but not implemented

**Impact on User Experience:**
- ❌ **Feels slow** - Modern chat UIs stream word-by-word
- ❌ **Looks broken** - Long waits with no feedback
- ❌ **Competitive disadvantage** - ChatGPT, Claude, all stream

**Proposed Solution:**
- Enable streaming in OpenAI API calls
- Use Server-Sent Events (SSE) or WebSocket
- Update frontend to display streaming text

**Estimated Effort:** 12-16 hours (2-3 days)

**Priority:** 🟡 **MEDIUM** - Nice-to-have UX improvement (automatically solved by OpenAI Agents SDK migration)

---

### Gap 7: No OpenAPI 3.1 Spec + SDK Libraries

**Current State:**
- Express routes with TypeScript interfaces
- No OpenAPI spec
- No generated TypeScript SDK
- No generated Python SDK
- Developers use raw HTTP calls

**Impact on Developer Experience:**
- ❌ **No type safety for API consumers** - Easy to make mistakes
- ❌ **No autocomplete** - Developers have to read docs
- ❌ **No version management** - Breaking changes not obvious
- ❌ **Hard to integrate** - Manual HTTP calls error-prone

**Proposed Solution:**
- Generate OpenAPI 3.1 spec from Express routes
- Generate TypeScript SDK (`@ivylevel/sdk`)
- Generate Python SDK
- Publish to npm

**Estimated Effort:** 20-24 hours (3-4 days)

**Priority:** 🟡 **LOW** - Nice-to-have for external developers (not blocker for launch)

---

### Gap Summary Table

| Gap | Impact | Priority | Effort | Blocks Launch? |
|-----|--------|----------|--------|----------------|
| **1. Basic OpenAI SDK** | High (UX, dev) | 🔴 HIGH | 48h (2w) | ⚠️ No, but critical for UX |
| **2. No Autonomous Agents** | Very High (engagement) | 🔴 CRITICAL | 40h (1w) | ✅ YES (CTO: 80-90% of value) |
| **3. Limited Knowledge Moat** | Medium (benchmarking) | 🟡 MEDIUM | 30h (2-3w) | ❌ No (internal data more valuable) |
| **4. No Production UI** | Critical (polish) | 🔴 CRITICAL | 80h (2-3w) | ✅ YES (can't launch with test UI) |
| **5. Code-Level RLS Only** | Medium (security) | 🟡 MEDIUM | 12h (1-2d) | ❌ No (working, just not defense-in-depth) |
| **6. No Streaming** | Medium (UX) | 🟡 MEDIUM | 16h (2-3d) | ❌ No (solved by Gap 1) |
| **7. No OpenAPI/SDKs** | Low (dev DX) | 🟡 LOW | 24h (3-4d) | ❌ No (not for launch) |

**Launch Blockers:**
1. ✅ Autonomous Agents (Gap 2) - 40 hours
2. ✅ Production UI (Gap 4) - 80 hours

**Critical for UX (not blockers):**
3. OpenAI Agents SDK (Gap 1) - 48 hours

**Total Estimated Effort to Launch:** 168 hours (3-4 weeks)

---

## Proposed Clean v1.0 Architecture

### Vision: v1.0 with OpenAI Agents SDK + v14 Foundation

**Goal:** Rebuild v1.0 agent layer using OpenAI Agents SDK while preserving v14 resolvers 100%.

**Benefits:**
- ✅ 92% code reduction (5,000 lines → 500 lines)
- ✅ Native streaming (6-10s → <1s perceived latency)
- ✅ Parallel tool calls (3× faster for multi-fact queries)
- ✅ Automatic handoffs (no manual detectHandoff logic)
- ✅ Built-in tracing (better debugging)
- ✅ Official OpenAI support (future-proof)

### Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     LAYER 5: PRODUCTION UI                      │
│  ChatKit + Custom IvyLevel Widgets                              │
│  - Streaming responses (SSE/WebSocket)                          │
│  - 5 custom widgets (GPA, College List, Awards, Essays, KM)    │
│  - WCAG 2.1 accessibility                                       │
│  Status: 📋 PROPOSED (80 hours, 2-3 weeks)                      │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ HTTP/WebSocket + Streaming
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              LAYER 4: v1.0 MULTI-AGENT SYSTEM                   │
│                    (OpenAI Agents SDK)                          │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  OpenAI Agents SDK Runtime                               │  │
│  │  - Built-in agent execution loop (replaces BaseAgent)   │  │
│  │  - Native streaming support                              │  │
│  │  - Parallel tool execution                               │  │
│  │  - Automatic handoffs                                    │  │
│  │  - Built-in tracing/observability                        │  │
│  │  Status: 📋 PROPOSED (48 hours migration)                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  7 Specialist Agents (OpenAI Agents SDK format):                │
│                                                                 │
│  import { Agent, run, tool, handoff } from '@openai/agents';   │
│  import { z } from 'zod';                                       │
│                                                                 │
│  const gameplanAgent = new Agent({                              │
│    name: 'GamePlanAgent',                                       │
│    instructions: (ctx) => `You are Jenny, coaching              │
│      ${ctx.student_name} (grade ${ctx.grade})...`,             │
│    model: 'gpt-4o',                                             │
│    tools: [getGamePlanTool, getVitalsTool, getECsTool],        │
│    handoffs: [awardsAgent, essayAgent, collegeAgent]           │
│  });                                                            │
│                                                                 │
│  // Execute (one line!)                                         │
│  const result = await run(gameplanAgent, message, {            │
│    context: studentContext,                                     │
│    stream: true  // ✅ Native streaming                         │
│  });                                                            │
│                                                                 │
│  Code Reduction: 1,913 lines → 200 lines (90% reduction)       │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ Tool Calls (19 tools)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│         LAYER 3: TOOL LAYER (OpenAI Agents SDK Format)          │
│  Status: 📋 PROPOSED (rewrite as SDK tools)                     │
│                                                                 │
│  // Convert from OpenAI function calling to SDK tools          │
│                                                                 │
│  // OLD (current):                                              │
│  {                                                              │
│    type: 'function',                                            │
│    function: {                                                  │
│      name: 'get_student_gpa',                                   │
│      parameters: { /* 20 lines of JSON schema */ }             │
│    }                                                            │
│  }                                                              │
│  // + manual execution dispatcher (50 lines)                    │
│                                                                 │
│  // NEW (proposed):                                             │
│  const getStudentGPATool = tool({                               │
│    name: 'get_student_gpa',                                     │
│    description: 'Get student GPA',                              │
│    parameters: z.object({                                       │
│      student_id: z.string()                                     │
│    }),                                                          │
│    execute: async ({ student_id }) => {                         │
│      return await gpa.latest(pool, student_id);                 │
│    }                                                            │
│  });                                                            │
│                                                                 │
│  Code Reduction: 800 lines → 80 lines (90% reduction)          │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ SQL Queries (unchanged)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│          LAYER 2: v14 RESOLVER LAYER (UNCHANGED)                │
│  Status: ✅ 100% PRESERVED (no changes needed)                  │
│                                                                 │
│  8 Resolver Modules (1,661 lines):                              │
│  • academics.ts, enums.ts, testing.ts, gameplan.ts, etc.       │
│  • All SQL-based, zero-hallucination                            │
│  • Full temporal resolution (initial/latest/progression/final)  │
│  • Evidence chips with provenance                               │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ PostgreSQL Queries (unchanged)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              LAYER 1: DATA LAYER (ENHANCED)                     │
│  Status: ✅ Current schema + 📋 Add DS1-DS5 (optional)          │
│                                                                 │
│  Personal Data (unchanged):                                     │
│  • kb_items, vital_facts, outcomes, etc.                        │
│                                                                 │
│  Knowledge Moat (enhanced):                                     │
│  ✅ Current: DS6, DS7, DS-T1, DS-T2                             │
│  📋 Add: DS1-DS5 (college benchmarks, rubrics, twins, etc.)     │
│                                                                 │
│  Multi-Coach (enhanced):                                        │
│  ✅ Current: coach_id in all tables, JWT auth                   │
│  📋 Add: PostgreSQL RLS policies for defense-in-depth           │
└─────────────────────────────────────────────────────────────────┘
```

### Code Example: GamePlanAgent (Current vs Proposed)

**Current Implementation (557 lines total):**

```typescript
// GamePlanAgent.ts (148 lines)
import { BaseAgent } from '../core/BaseAgent.js';
import type { AgentManifest, AgentExecutionContext } from '../core/types.js';
import { getToolsForAgent } from '../tools/resolverTools.js';

export class GamePlanAgent extends BaseAgent {
  constructor() {
    const manifest: AgentManifest = {
      agent_id: 'gameplan-agent',
      display_name: 'Jenny - Game Plan Advisor',
      tagline: 'your college application planning strategist',
      version: '1.0.0',
      category: 'gameplan',
      tools: getToolsForAgent('gameplan'),  // Manual tool mapping (50+ lines in resolverTools.ts)
      intents: [/* 30+ lines of intent patterns */],
      jtbd: {/* ... */},
      temperature: 0.7,
      max_tokens: 600,
      handoffs: ['ecs-agent', 'awards-agent', 'programs-agent', 'college-agent'],
    };

    super(manifest);
  }

  protected buildSystemPrompt(context: AgentExecutionContext): string {
    const basePrompt = super.buildSystemPrompt(context);
    const studentContext = context.session.context;

    return `${basePrompt}

Your Specialty: College Application Game Planning

You excel at:
- Creating clear, actionable application timelines
- Identifying profile gaps and opportunities
- Prioritizing activities based on impact
- Breaking down complex plans into manageable steps

Your Communication Style:
- Start with the big picture, then dive into details
- Use numbered lists for timelines and action items
- Highlight what's most urgent (next 1-2 weeks)
- Be specific: "Complete X by Y date" not "work on X"

Current Student Stats:
- Grade: ${studentContext.grade || 'Unknown'}
${studentContext.gpa ? `- GPA: ${studentContext.gpa}` : ''}
${studentContext.sat_total ? `- SAT: ${studentContext.sat_total}` : ''}

Always ground your advice in their actual data using the tools provided.`;
  }
}

// Plus BaseAgent.ts (409 lines) for execution logic including 90-line manual tool loop
```

**Proposed Implementation (45 lines total):**

```typescript
// GamePlanAgent.ts (45 lines total - 92% reduction!)
import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';
import { gpa, awards, ecs, gameplan } from '../resolvers';
import { pool } from '../db/pool';

// Define tools (5 lines each = 20 lines total for 4 tools)
const getStudentGPATool = tool({
  name: 'get_student_gpa',
  description: 'Get student GPA (cumulative or semester)',
  parameters: z.object({
    student_id: z.string(),
  }),
  execute: async ({ student_id }) => {
    const result = await gpa.latest(pool, student_id);
    return {
      gpa_weighted: result.gpa_weighted,
      gpa_unweighted: result.gpa_unweighted,
    };
  },
});

// ... 3 more tools (getStudentAwardsTool, getStudentECsTool, getGamePlanTool) = 15 lines

// Define agent (25 lines)
const gameplanAgent = new Agent({
  name: 'GamePlanAgent',
  instructions: (ctx) => `You are Jenny, a college admissions coach.

**Your Specialty:** College Application Game Planning

**You excel at:**
- Creating clear, actionable application timelines
- Identifying profile gaps and opportunities
- Prioritizing activities based on impact
- Breaking down complex plans into manageable steps

**Communication Style:**
- Start with the big picture, then dive into details
- Use numbered lists for timelines and action items
- Highlight what's most urgent (next 1-2 weeks)
- Be specific: "Complete X by Y date" not "work on X"

**Student Context:**
- Name: ${ctx.student_name}
- Grade: ${ctx.grade}
- GPA: ${ctx.gpa || 'Unknown'}
- SAT: ${ctx.sat || 'Unknown'}

Always ground your advice in their actual data using the tools provided.`,
  model: 'gpt-4o',
  tools: [getStudentGPATool, getStudentAwardsTool, getStudentECsTool, getGamePlanTool],
  handoffs: [awardsAgent, essayAgent, collegeAgent],  // Automatic handoffs!
});

// Export agent
export { gameplanAgent };

// Usage (1 line!)
const result = await run(gameplanAgent, userMessage, {
  context: studentContext,
  stream: true  // ✅ Native streaming!
});
```

### Benefits Summary

| Metric | Current | Proposed (OpenAI SDK) | Improvement |
|--------|---------|----------------------|-------------|
| **Lines of code** | 5,000+ | ~500 | 90% reduction |
| **Agent execution logic** | 409 lines (BaseAgent) | 0 lines (SDK handles) | 100% reduction |
| **Tool definitions** | 800 lines | 80 lines | 90% reduction |
| **Handoff logic** | 60 lines per agent | 0 lines (SDK handles) | 100% reduction |
| **Streaming** | ❌ Not implemented | ✅ Native | Infinite improvement |
| **Parallel tools** | ❌ Sequential only | ✅ Built-in | 3× faster for multi-fact |
| **Tracing** | Custom logging | Built-in | Better debugging |
| **Maintenance** | High (custom code) | Low (OpenAI maintains) | 80% reduction |
| **Migration effort** | N/A | 48 hours | Reasonable |

---

## Migration from Current to Proposed

### Phase 1: Prototype (Week 1, Days 1-2)

**Goal:** Prove OpenAI Agents SDK works with v14 resolvers

**Tasks:**
1. Install SDK: `npm install @openai/agents zod@3`
2. Create 1 agent (GamePlanAgent) using SDK
3. Wrap 3 v14 resolvers as SDK tools (gpa, awards, ecs)
4. Test with real student data (huda-2025)
5. Verify streaming works
6. Verify handoffs work

**Success Criteria:**
- ✅ Agent responds correctly
- ✅ Tools call v14 resolvers
- ✅ Streaming outputs progressively
- ✅ No breaking changes to v14

**Estimated Time:** 8 hours

---

### Phase 2: Migrate Core Agents (Week 1, Days 3-5)

**Goal:** Migrate all 8 specialist agents to SDK

**Tasks:**
1. Migrate AssessmentAgent (autonomous, event-driven - 531 lines)
2. Migrate GamePlanAgent (already done in Phase 1)
3. Migrate AwardsAgent
4. Migrate EssayAgent
5. Migrate CollegeListAgent
6. Migrate ExtracurricularsAgent
7. Migrate SummerProgramsAgent
8. Migrate AdmissionsAgent
9. Configure handoffs between agents
10. Add guardrails (input validation, PII protection)
11. Test each agent individually
12. Register AssessmentAgent in AgentRegistry

**Success Criteria:**
- ✅ All 8 agents work with SDK
- ✅ AssessmentAgent auto-triggers on student_onboarded event
- ✅ Handoffs work between agents (assessment → gameplan flow)
- ✅ Guardrails prevent bad inputs/outputs
- ✅ All tests pass

**Estimated Time:** 18 hours (16 hours + 2 hours for AssessmentAgent)

---

### Phase 3: Integration (Week 2, Days 1-2)

**Goal:** Integrate SDK agents with existing infrastructure

**Tasks:**
1. Update `/api/agents/chat` route to use SDK's `run()` function
2. Add streaming support to API route (SSE or WebSocket)
3. Update SessionManager to work with SDK context injection
4. Update frontend to handle streaming responses
5. Add tracing integration (send SDK traces to observability)
6. Update error handling

**Success Criteria:**
- ✅ API route works with SDK agents
- ✅ Streaming responses work in UI
- ✅ Sessions persist correctly
- ✅ Traces visible in observability platform
- ✅ Error handling works

**Estimated Time:** 12 hours

---

### Phase 4: Testing & Refinement (Week 2, Days 3-5)

**Goal:** Comprehensive testing and refinement

**Tasks:**
1. Run full test suite (all agents, all scenarios)
2. Test edge cases (long conversations, errors, handoffs)
3. Performance testing (response times, streaming latency)
4. Load testing (concurrent users)
5. User acceptance testing (does it feel like Jenny?)
6. Fix bugs
7. Refine prompts

**Success Criteria:**
- ✅ All tests pass
- ✅ Performance meets targets (<10s response, <1s streaming)
- ✅ No regressions from current implementation
- ✅ UAT feedback positive

**Estimated Time:** 12 hours

---

### Phase 5: Production UI (Week 3)

**Goal:** Build ChatKit + custom widgets

**Tasks:**
1. Install ChatKit
2. Build 5 custom widgets (GPA, College List, Awards, Essays, Knowledge Moat)
3. Integrate streaming responses
4. Add WCAG 2.1 accessibility
5. Add telemetry
6. Deploy to staging

**Success Criteria:**
- ✅ ChatKit integrated
- ✅ All 5 widgets functional
- ✅ Streaming works end-to-end
- ✅ WCAG 2.1 compliance
- ✅ Ready for beta launch

**Estimated Time:** 80 hours (2-3 weeks)

---

### Phase 6: Autonomous Agents (Week 4)

**Goal:** Enable proactive coaching

**Tasks:**
1. Complete event system (scheduler, notification service)
2. Implement autonomous game plan agent
3. Add weekly execution agent
4. Enable time-based triggers (daily/weekly check-ins)
5. Enable event-based triggers (deadline reminders, milestone nudges)

**Success Criteria:**
- ✅ Autonomous agents send proactive messages
- ✅ Time-based triggers work (daily/weekly)
- ✅ Event-based triggers work (deadline reminders)
- ✅ Students receive value without initiating

**Estimated Time:** 40 hours (1 week)

---

### Total Migration Timeline

| Phase | Duration | Effort | Blockers Launch? |
|-------|----------|--------|------------------|
| Phase 1: Prototype | 2 days | 8 hours | No |
| Phase 2: Migrate Agents | 3 days | 16 hours | No |
| Phase 3: Integration | 2 days | 12 hours | No |
| Phase 4: Testing | 3 days | 12 hours | No |
| **SDK Migration Subtotal** | **10 days** | **48 hours** | **No** |
| Phase 5: Production UI | 2-3 weeks | 80 hours | ✅ YES |
| Phase 6: Autonomous Agents | 1 week | 40 hours | ✅ YES |
| **GRAND TOTAL** | **6-7 weeks** | **168 hours** | **Launch Ready** |

**Risk:** Low-Medium (SDK is production-ready, v14 resolvers unchanged)

**ROI:** Very High (90% code reduction, streaming UX, autonomous agents)

---

## File Reference Guide

### Current v1.0 Implementation (Production Code)

**Core Framework:**
- `/services/agent-framework/src/core/BaseAgent.ts` (409 lines)
- `/services/agent-framework/src/core/AgentRegistry.ts` (89 lines)
- `/services/agent-framework/src/core/SessionManager.ts` (362 lines)
- `/services/agent-framework/src/core/types.ts` (245 lines)

**Agents:**
- `/services/agent-framework/src/agents/GamePlanAgent.ts` (148 lines)
- `/services/agent-framework/src/agents/CollegeListAgent.ts` (265 lines)
- `/services/agent-framework/src/agents/EssayAgent.ts` (230 lines)
- `/services/agent-framework/src/agents/AdmissionsAgent.ts` (272 lines)
- `/services/agent-framework/src/agents/ExtracurricularsAgent.ts` (171 lines)
- `/services/agent-framework/src/agents/AwardsAgent.ts` (195 lines)
- `/services/agent-framework/src/agents/SummerProgramsAgent.ts` (223 lines)

**Tools & Repositories:**
- `/services/agent-framework/src/tools/resolverTools.ts` (800 lines)
- `/services/agent-framework/src/repositories/KnowledgeMoatRepository.ts` (1,012 lines)
- `/services/agent-framework/src/repositories/ConversationRepository.ts` (362 lines)
- `/services/agent-framework/src/repositories/CoachIntelligenceRepository.ts` (135 lines)
- `/services/agent-framework/src/repositories/StudentContextRepository.ts` (192 lines)

**v14 Resolvers (Preserved):**
- `/services/agent-framework/src/resolvers/academics.ts` (292 lines)
- `/services/agent-framework/src/resolvers/enums.ts` (305 lines)
- `/services/agent-framework/src/resolvers/testing.ts` (65 lines)
- `/services/agent-framework/src/resolvers/gameplan.ts` (72 lines)
- `/services/agent-framework/src/resolvers/college.ts` (139 lines)
- `/services/agent-framework/src/resolvers/vitals.ts` (319 lines)
- `/services/agent-framework/src/resolvers/readiness.ts` (135 lines)
- `/services/agent-framework/src/resolvers/jtbd.ts` (334 lines)

**v14 Orchestrator (Preserved, Not Used):**
- `/services/agent-framework/src/orchestrator/agentChat-utfa.ts` (1,125 lines)

**v14 Compose (Preserved, Not Used):**
- `/services/agent-framework/src/compose/compose.ts` (465 lines)
- `/services/agent-framework/src/compose/compose-eq.ts` (387 lines)
- `/services/agent-framework/src/compose/compose-canonical.ts` (234 lines)

**v14 Humanizer (Preserved, Not Integrated):**
- `/services/agent-framework/src/lib/humanizer.js` (1,200+ lines)

**Auth & Routes:**
- `/services/agent-framework/src/routes/auth.ts` (359 lines)
- `/services/agent-framework/src/routes/agents.ts` (342 lines)
- `/services/agent-framework/src/routes/tactics.ts` (210 lines)
- `/services/agent-framework/src/middleware/auth.ts` (93 lines)
- `/services/agent-framework/src/utils/jwt.ts` (78 lines)

**Database:**
- `/services/agent-framework/db/migrations/01-kb-items-universal.sql` (Universal enumeration)
- `/services/agent-framework/db/migrations/v15_001_knowledge_moat.sql` (DS1-DS8 tables)
- `/services/agent-framework/db/migrations/v15_002_proactivity_infrastructure.sql` (Autonomous agents)
- `/services/agent-framework/db/migrations/v15_003_student_context_intelligence.sql` (Context tracking)
- `/services/agent-framework/db/migrations/v15_004_weekly_execution_infrastructure.sql` (Execution tracking)
- `/data/migrations/006_add_ds6_ds7.sql` (Essay/AO data)
- `/data/migrations/007_add_conversation_history.sql` (Conversation persistence)
- `/data/migrations/008_add_moat_tactic_and_success_pattern_tables.sql` (Tactics/Patterns)

**Frontend:**
- `/apps/test-chat-ui/app/agent-test/page.tsx` (Test UI)
- `/apps/test-chat-ui/app/api/agent-chat/route.ts` (HTTP client)

**Server:**
- `/services/agent-framework/src/server-agents.ts` (108 lines - Express server)
- `/services/agent-framework/package.json` (Dependencies: openai@6.4.0, no @openai/agents)

---

## Conclusion

**Current State:**
- ✅ **Solid Foundation** - v14 zero-hallucination layer 100% preserved and functional
- ✅ **Functional v1.0 Agents** - 7 specialist agents working with real data
- ✅ **Multi-Coach Infrastructure** - JWT auth, coach_id isolation, conversation persistence
- ✅ **Knowledge Moat Core** - DS6/DS7/DS-T1/DS-T2 with real coaching intelligence
- ⚠️ **Using Basic OpenAI SDK** - Not leveraging Agents SDK capabilities
- ⚠️ **Test UI Only** - Not production-ready
- ⚠️ **Reactive Only** - No autonomous/proactive agents

**Critical Path to Launch:**
1. **Production UI** (80 hours, 2-3 weeks) - ChatKit + custom widgets + streaming
2. **Autonomous Agents** (40 hours, 1 week) - Proactive coaching (CTO: 80-90% of value)
3. **OpenAI Agents SDK** (48 hours, 2 weeks) - Better UX, streaming, 90% code reduction

**Total: 168 hours (6-7 weeks) to production launch**

**Recommendation:**
- Prioritize Production UI + Autonomous Agents first (launch blockers)
- Migrate to OpenAI Agents SDK in parallel or immediately after (critical for UX)
- Defer DS1-DS5 Knowledge Moat (internal data DS6/DS7 more valuable for authenticity)

---

**Document Status:** ✅ COMPLETE
**Next Steps:** Review with stakeholders → Approve migration plan → Begin Phase 1
**Owner:** TBD
**Last Updated:** 2025-10-17

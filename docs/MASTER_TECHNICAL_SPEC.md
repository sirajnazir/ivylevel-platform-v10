# Master Technical Specification
**IvyLevel Platform v10 - Jenny Agentic AI**

**Document Status:** Living Specification
**Last Update:** 2025-10-04 21:00 UTC
**Version:** v5.0 (KB Schema Foundation) + v4.6.2c (UAPX Guardrails - Attending/Decided Robustness)

---

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Complete Query Flow (Huda's Journey)](#complete-query-flow-hudas-journey)
4. [System Components](#system-components)
5. [Intent Routing Architecture](#intent-routing-architecture)
6. [Data Pipelines](#data-pipelines)
7. [Third-Party Integrations](#third-party-integrations)
8. [Module Reference](#module-reference)
9. [API Contracts](#api-contracts)
10. [Fine-Tuned Jenny Model](#fine-tuned-jenny-model)
11. [27+ Intelligence Layers](#27-intelligence-layers)
12. [Deployment Architecture](#deployment-architecture)
13. [Observability & Monitoring](#observability--monitoring)
14. [Incremental Updates](#incremental-updates)

---

## Platform Overview

**Jenny AI** is an agentic college counseling assistant built on a **Facts-First Architecture** with hybrid RAG (Retrieval-Augmented Generation). The system prioritizes deterministic SQL queries over LLM generation to ensure factual accuracy.

### Core Principles

1. **Facts-First**: SQL-deterministic queries before RAG fallback
2. **Temporal Resolution**: Universal support for first/latest/nth/as-of queries (UTFA)
3. **Evidence Chain**: Full provenance tracking from source documents to answers
4. **Intent Routing**: Multi-tier routing (Enumeration → Temporal Facts → Canonical Facts → RAG)
5. **Observability**: Comprehensive tracing and logging at every step

### Tech Stack

**Frontend:**
- Next.js 14 (React 18)
- TypeScript
- Tailwind CSS

**Backend:**
- Node.js 20+ with TypeScript
- Express.js
- PostgreSQL 15+ (primary database)
- Pinecone (vector database for RAG)

**AI/ML:**
- OpenAI GPT-4o / GPT-4o-mini
- OpenAI Embeddings (text-embedding-3-small, 3072 dims)
- Custom intent classification

**Infrastructure:**
- pnpm workspaces (monorepo)
- tsx (TypeScript execution)
- Docker (PostgreSQL)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           USER INTERFACE                             │
│                   (Test Chat UI - Next.js/React)                     │
│                      http://localhost:3000                           │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    │ HTTP POST /agent/chat/gpt5
                                    │ {message, student_id, week, model}
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         JENNY API SERVER                             │
│                   (Express.js + TypeScript)                          │
│                      http://localhost:8787                           │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              GPT-5 INTENT ROUTER (v3.7)                      │   │
│  │          src/router/intentRouter.ts                          │   │
│  │                                                              │   │
│  │  Classifies query intent into 5 tiers:                      │   │
│  │  1. Enumeration (awards, ECs, programs, narratives)         │   │
│  │  2. Temporal Facts (first/last/nth SAT, GPA)                │   │
│  │  3. Canonical Facts (single facts)                          │   │
│  │  4. Readiness (v3.7 - feature-based scoring)                │   │
│  │  5. RAG (open-ended questions)                              │   │
│  └────────┬──────────┬────────────┬───────────┬─────────┬──────┘   │
│           │          │            │           │         │          │
│           ▼          ▼            ▼           ▼         ▼          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐   │
│  │ENUMERATION│ │ TEMPORAL │ │CANONICAL │ │READINESS │ │ RAG  │   │
│  │ RESOLVER  │ │  FACTS   │ │  FACTS   │ │  LAYER   │ │HYBRID│   │
│  │           │ │  (UTFA)  │ │          │ │  (v3.7)  │ │SEARCH│   │
│  └─────┬────┘ └─────┬────┘ └─────┬────┘ └─────┬────┘ └──┬───┘   │
│        │            │            │             │           │       │
│        ▼            ▼            ▼             ▼           ▼       │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │             RESOLVER & SERVICES LAYER                      │   │
│  │  • awards.ts        • temporalFacts.ts                     │   │
│  │  • ecs.ts           • facts-canonical.ts                   │   │
│  │  • programs.ts      • sessions.ts                          │   │
│  │  • academics.ts     • lifecycle.ts                         │   │
│  │  • resolvers.ts (v3.7 readiness resolvers)                 │   │
│  └────────┬───────────────────────┬───────────────────────────┘   │
│           │                       │                               │
│           ▼                       ▼                               │
│  ┌─────────────────────────────────────────────────┐             │
│  │           PostgreSQL (Neon/Local)                │             │
│  │                                                  │             │
│  │  Core Tables:                                    │             │
│  │  • students, vital_facts, outcomes, kb_items    │             │
│  │  • award_targets, ec_targets, program_targets   │             │
│  │                                                  │             │
│  │  v3.7 Readiness Tables (NEW):                   │             │
│  │  • feature_defs (14 features across 6 domains)  │             │
│  │  • factor_defs (5 factors: academics, awards,   │             │
│  │    leadership, programs, narrative)             │             │
│  │  • factor_feature_map (feature → factor)        │             │
│  │  • feature_snapshots (temporal tracking)        │             │
│  │  • action_defs (what-if actions)                │             │
│  │  • action_feature_effects (simulation engine)   │             │
│  │                                                  │             │
│  │  v3.7 Feature Views (NEW):                      │             │
│  │  • v_features_testing (SAT/ACT from timeline)   │             │
│  │  • v_features_awards (counts by tier)           │             │
│  │  • v_features_ecs (leadership, scale signals)   │             │
│  │  • v_features_narrative (essay completeness)    │             │
│  │  • v_features_academics (GPA, AP courses)       │             │
│  │  • v_features_programs (acceptances)            │             │
│  │  • v_features_all (unified feature view)        │             │
│  └──────────────────────────────────────────────────┘            │
│                           │                                       │
│                           │                                       │
│  ┌────────────────────────┴──────────────────────┐               │
│  │        Pinecone Vector Database                │               │
│  │         jenny-v3-3072-*                        │               │
│  │                                                 │               │
│  │  Namespaces:                                    │               │
│  │  • jtbd (Jobs to Be Done)                      │               │
│  │  • interactions (Session Transcripts)          │               │
│  │  • docs (Knowledge Base Documents)             │               │
│  └─────────────────────────────────────────────────┘              │
│                           │                                       │
└───────────────────────────┼───────────────────────────────────────┘
                            │
          ┌─────────────────┴─────────────────┐
          ▼                                   ▼
 ┌────────────────┐                  ┌────────────────┐
 │  OpenAI API    │                  │  Lexical Search│
 │                │                  │  (PostgreSQL   │
 │ • GPT-4o       │                  │   tsvector)    │
 │ • GPT-4o-mini  │                  └────────────────┘
 │ • Embeddings   │
 │ • Moderation   │
 └────────────────┘
          │
          ▼
 ┌────────────────┐
 │  Reranking     │
 │  (Cohere API)  │
 └────────────────┘
          │
          ▼
 ┌────────────────┐
 │   COMPOSER     │
 │  (LLM Answer   │
 │   Generation)  │
 └────────────────┘
          │
          ▼
 ┌────────────────────────────────────┐
 │  RESPONSE                          │
         │  {answer, chips, hits, vitals,     │
         │   trace_id, model, session_id}     │
         └────────────────────────────────────┘
                  │
                  ▼
         ┌────────────────────────────────────┐
         │  TEST CHAT UI                      │
         │  Displays answer + trace viewer    │
         └────────────────────────────────────┘
```

---

## Complete Query Flow (Huda's Journey)

Let's trace a complete request from when **Huda types "What was my first SAT score?"** into the Test UI.

### Step 1: User Input (Test Chat UI)

**File:** `/apps/test-chat-ui/app/page.tsx:30-53`

```typescript
async function send() {
  if (!input.trim()) return;
  const text = input;
  setHistory(h => [...h, { role: 'user', text }]);
  setInput('');
  setLoading(true);

  // Call API
  const res = await agentChat(text, studentId, { week, llm_model: model });

  setHistory(h => [...h, {
    role: 'assistant',
    text: res.answer || '(No answer)',
    chips: res.chips || [],
    hits: res.hits || [],
    vitals: res.vitals || {},
    trace_id: res.trace_id,
    trace: res.trace || {},
    model: res.model || 'gpt5-intent'
  }]);
  setLoading(false);
}
```

**Action:** User enters message → Calls `agentChat` API function

---

### Step 2: API Client Call

**File:** `/apps/test-chat-ui/lib/api.ts:3-24`

```typescript
export async function agentChat(
  message: string,
  studentId: string,
  opts?: { week?: number; llm_model?: string; session_id?: string }
) {
  const endpoint = '/agent/chat/gpt5';  // GPT-5 Intent Router

  const r = await fetch(`${BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      message,
      student_id: studentId,
      week: opts?.week,
      llm_model: opts?.llm_model,
      session_id: opts?.session_id,
    }),
  });

  return r.json();
}
```

**Network Call:**
```http
POST http://localhost:8787/agent/chat/gpt5
Content-Type: application/json

{
  "message": "What was my first SAT score?",
  "student_id": "huda-2025",
  "week": null,
  "llm_model": null,
  "session_id": null
}
```

---

### Step 3: Express Server Receives Request

**File:** `/services/jenny-api/src/server-utfa.ts:173-209`

```typescript
app.post('/agent/chat/gpt5', async (req, res) => {
  try {
    const { message, student_id } = req.body;
    console.log('[GPT5-Intent] Chat request:', { message: message?.slice(0, 50), student_id });

    // Route to intent router
    const result = await routePrompt({
      studentId: student_id,
      message,
      pg: pool
    });

    // Store trace for UI viewing
    if (result.traceId) {
      traceStore.set(result.traceId, {
        id: result.traceId,
        student_id,
        message,
        intent: result.intent,
        answer: result.answer,
        chips: result.chips,
        hits: result.hits,
        timestamp: new Date().toISOString()
      });
    }

    res.json({ ...result, trace_id: result.traceId });
  } catch (error: any) {
    console.error('[GPT5-Intent] Error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

**Action:** Routes to `routePrompt` (GPT-5 Intent Router)

---

### Step 4: GPT-5 Intent Router (NEW v3.3)

**File:** `/services/jenny-api/src/router/intentRouter.ts` (summarized - file was read earlier)

The intent router performs multi-tier classification:

```typescript
export async function routePrompt({studentId, message, pg}) {
  const traceId = generateTraceId();

  // TIER 1: Check if enumeration query
  const enumRoute = classifyEnumIntent(message);
  if (enumRoute) {
    // Examples: "list my awards", "show me my ECs"
    return handleEnumerationQuery(enumRoute, studentId, pg, traceId);
  }

  // TIER 2: Check if temporal fact query
  const isTemporal = shouldUseTemporalFacts(message);
  if (isTemporal) {
    // Examples: "What was my first SAT score?", "Show me all my SAT scores"
    return handleTemporalFactQuery(message, studentId, pg, traceId);
  }

  // TIER 3: Check if canonical fact query
  const detectedKinds = detectFactKinds(message);
  if (detectedKinds.length > 0) {
    // Examples: "What's my GPA?", "What's my latest SAT?"
    return handleCanonicalFactQuery(detectedKinds, studentId, pg, traceId);
  }

  // TIER 4: Open-ended RAG query
  return handleRAGQuery(message, studentId, pg, traceId);
}
```

**For "What was my first SAT score?"**

Intent classification result:
```typescript
{
  kind: 'sat_total_score',
  operator: 'first',
  nth: null,
  asof_date: null,
  official_only: false
}
```

**Detection Logic:** `/services/jenny-api/src/services/temporalFacts.ts:254-321`

```typescript
export function extractTemporalIntent(utterance: string): TemporalIntent {
  const u = utterance.toLowerCase();

  // Extract fact kind
  let kind: string | null = null;
  for (const [phrase, factKind] of Object.entries(FACT_KINDS)) {
    if (u.includes(phrase)) {  // "sat" → 'sat_total_score'
      kind = factKind;
      break;
    }
  }

  // Extract temporal operator
  let operator: TemporalOperator | null = null;

  if (/\b(first|initial|earliest|beginning)\b/.test(u)) {  // ← MATCHES "first"
    operator = 'first';
  }
  // ... other operators

  return { kind, operator, nth, asof_date, official_only };
}
```

**Result:** Routes to **TIER 2: Temporal Facts (UTFA)**

---

### Step 5: Temporal Fact Resolution (UTFA)

**File:** `/services/jenny-api/src/orchestrator/agentChat-utfa.ts:240-336`

```typescript
// Check if this is a temporal fact query
const isTemporalFactQuery = shouldUseTemporalFacts(req.message);

if (isTemporalFactQuery) {
  const intent = extractTemporalIntent(req.message);

  log.event('temporal_intent_detected', {
    kind: intent.kind,           // 'sat_total_score'
    operator: intent.operator,   // 'first'
    nth: intent.nth,             // null
    official_only: intent.official_only  // false
  });

  const sessionId = await ensureSession(req.session_id, req.student_id);

  // Resolve using UTFA
  const result = await resolveTemporalFact(pool, {
    student_id: req.student_id,
    kind: intent.kind!,
    operator: intent.operator!,
    nth: intent.nth,
    asof_date: intent.asof_date,
    official_only: intent.official_only
  });

  // Format the answer
  const answer = formatTemporalFactResult(result, intent.kind!);

  // Build evidence chips
  const chips = result.facts
    .filter(f => f.source_id && f.source_id !== 'superscore')
    .map(f => ({ id: f.source_id, type: 'source' }));

  return {
    answer,
    chips,
    hits: [],
    vitals: await fetchVitals(req.student_id),
    trace: { utfa: {...} },
    trace_id: `utfa-${Date.now()}-${...}`,
    model: 'utfa'
  };
}
```

---

### Step 6: UTFA SQL Function Call

**File:** `/services/jenny-api/src/services/temporalFacts.ts:45-151`

```typescript
export async function resolveTemporalFact(pool: Pool, query: TemporalFactQuery) {
  const startTime = Date.now();
  const { student_id, kind, operator } = query;

  let sqlFunction: string;
  let result: any;

  switch (operator) {
    case 'first':
      sqlFunction = 'fact_first';
      result = await pool.query(
        'SELECT * FROM fact_first($1, $2)',
        [student_id, kind]  // ['huda-2025', 'sat_total_score']
      );
      break;

    // ... other operators
  }

  const facts = result.rows.map((row: any) => ({
    ...row,
    event_date: row.event_date ? new Date(row.event_date).toISOString().split('T')[0] : null
  }));

  return {
    operator,
    facts,
    trace: {
      query_type: 'temporal_fact',
      sql_function: sqlFunction,
      took_ms: Date.now() - startTime,
      rows_returned: facts.length,
      student_id,
      kind
    }
  };
}
```

**PostgreSQL Execution:**

```sql
SELECT * FROM fact_first('huda-2025', 'sat_total_score');
```

**SQL Function Definition** (from DB migration):

```sql
CREATE OR REPLACE FUNCTION fact_first(p_student_id TEXT, p_kind TEXT)
RETURNS TABLE (
  obs_id UUID,
  event_date DATE,
  value_numeric INT,
  value_text TEXT,
  is_official BOOLEAN,
  confidence TEXT,
  source_id TEXT
)
LANGUAGE sql STABLE AS $$
  SELECT
    fact_id AS obs_id,
    fact_date::date AS event_date,
    CASE WHEN value ~ '^[0-9]+$' THEN value::int ELSE NULL END AS value_numeric,
    value AS value_text,
    COALESCE((meta->>'is_official')::boolean, false) AS is_official,
    confidence::text,
    source_id
  FROM vital_facts
  WHERE student_id = p_student_id AND kind = p_kind
  ORDER BY fact_date ASC, source_id ASC
  LIMIT 1;
$$;
```

**Query Result:**

```json
{
  "rows": [
    {
      "obs_id": "123e4567-e89b-12d3-a456-426614174000",
      "event_date": "2024-03-15",
      "value_numeric": 1450,
      "value_text": "1450",
      "is_official": true,
      "confidence": "high",
      "source_id": "SRC-TRANSCRIPT-001"
    }
  ]
}
```

---

### Step 7: Format Answer

**File:** `/services/jenny-api/src/services/temporalFacts.ts:156-208`

```typescript
export function formatTemporalFactResult(result: TemporalFactResult, kind: string): string {
  const { operator, facts } = result;

  if (facts.length === 0) {
    return `No ${kind.replace(/_/g, ' ')} found.`;
  }

  const formatSingleFact = (fact: FactObservation): string => {
    const value = fact.value_numeric || fact.value_text || 'N/A';
    const date = fact.event_date ? new Date(fact.event_date).toLocaleDateString() : 'unknown date';
    const type = fact.is_official ? 'official' : fact.is_practice ? 'practice' : '';

    if (kind === 'sat_total_score' || kind === 'act_composite') {
      return `${value} (${date}${type ? `, ${type}` : ''})`;
    }

    return `${value} on ${date}`;
  };

  switch (operator) {
    case 'first':
      return `Your first ${kind.replace(/_/g, ' ')} was ${formatSingleFact(facts[0])}`;
    // ... other operators
  }
}
```

**Formatted Answer:**

```
"Your first SAT total score was 1450 (3/15/2024, official)"
```

---

### Step 8: Build Response Payload

**File:** `/services/jenny-api/src/orchestrator/agentChat-utfa.ts:269-330`

```typescript
// Build evidence chips
const chips = result.facts
  .filter(f => f.source_id && f.source_id !== 'superscore')
  .map(f => ({ id: f.source_id, type: 'source' }))
  .filter((chip, index, self) =>
    index === self.findIndex(c => c.id === chip.id)
  );

// Build trace with UTFA details
const trace = {
  utfa: {
    intent: intent,
    sql_function: result.trace.sql_function,
    rows_returned: result.trace.rows_returned,
    took_ms: result.trace.took_ms,
    facts: result.facts.map(f => ({
      value: f.value_numeric || f.value_text,
      date: f.event_date,
      official: f.is_official,
      confidence: f.confidence,
      source: f.source_id
    }))
  }
};

// Fetch vitals for context
const vitals = await fetchVitals(req.student_id);

// Return structured response
const response = {
  answer: "Your first SAT total score was 1450 (3/15/2024, official)",
  session_id: sessionId,
  hits: [],
  vitals: vitals,
  chips: [{ id: 'SRC-TRANSCRIPT-001', type: 'source' }],
  trace,
  trace_id: `utfa-1696367890123-abc123xyz`,
  model: 'utfa'
};

await storeMessage(sessionId, { role: 'user', content: req.message });
await storeMessage(sessionId, { role: 'assistant', content: answer });

return response;
```

---

### Step 9: Return to Express Server

**File:** `/services/jenny-api/src/server-utfa.ts:204`

```typescript
res.json({ ...result, trace_id: result.traceId });
```

**HTTP Response:**

```json
{
  "answer": "Your first SAT total score was 1450 (3/15/2024, official)",
  "session_id": "sess_abc123",
  "hits": [],
  "vitals": {
    "facts": [
      { "kind": "sat_total_score", "value": "1450", "fact_date": "2024-03-15" },
      { "kind": "gpa_weighted", "value": "4.2", "fact_date": "2024-09-01" }
    ]
  },
  "chips": [
    { "id": "SRC-TRANSCRIPT-001", "type": "source" }
  ],
  "trace": {
    "utfa": {
      "intent": {
        "kind": "sat_total_score",
        "operator": "first",
        "nth": null,
        "asof_date": null,
        "official_only": false
      },
      "sql_function": "fact_first",
      "rows_returned": 1,
      "took_ms": 15,
      "facts": [
        {
          "value": 1450,
          "date": "2024-03-15",
          "official": true,
          "confidence": "high",
          "source": "SRC-TRANSCRIPT-001"
        }
      ]
    }
  },
  "trace_id": "utfa-1696367890123-abc123xyz",
  "model": "utfa"
}
```

---

### Step 10: UI Renders Response

**File:** `/apps/test-chat-ui/app/page.tsx:216-243`

```typescript
<div style={{ border:'1px solid #eee', borderRadius:8, padding:12, flex: 1, overflow: 'auto' }}>
  {history.map((m, i) => (
    <div key={i} style={{ margin:'8px 0' }}>
      <div style={{ fontWeight: m.role==='user' ? 600 : 500 }}>
        {m.role==='user' ? 'You' : 'Jenny'}
      </div>
      <div>{m.text}</div>
      {m.role==='assistant' && (
        <>
          {/* Trace link */}
          {m.trace_id ? (
            <div style={{ marginTop:4 }}>
              <button onClick={()=>openTrace(m.trace_id)}>
                view trace ({m.trace_id.slice(0,8)}…)
              </button>
            </div>
          ) : null}
          {/* Chips */}
          {!!m.chips?.length && (
            <EvidenceChips ids={m.chips.map((c:any)=>c.id)} />
          )}
        </>
      )}
    </div>
  ))}
</div>
```

**Displayed to User:**

```
You: What was my first SAT score?

Jenny: Your first SAT total score was 1450 (3/15/2024, official)

[view trace (utfa-169…)]
[evidence (1)]
```

---

### Step 11: Trace Viewer (Optional)

When user clicks "view trace", the UI calls:

```typescript
async function openTrace(traceId?: string) {
  const trace = msg.trace || {};
  const model = msg.model || 'unknown';
  const isUTFA = model === 'utfa';

  // Build synthetic events from trace
  const events = [
    {
      sequence: 1,
      component: 'orchestrator',
      operation: 'intent_detection',
      duration_ms: 8,
      metadata: {
        kind: trace.utfa?.intent?.kind,
        operator: trace.utfa?.intent?.operator
      }
    },
    {
      sequence: 2,
      component: 'utfa_resolver',
      operation: 'resolve_temporal_fact',
      duration_ms: trace.utfa?.took_ms || 20,
      api_provider: 'postgres',
      api_method: trace.utfa?.sql_function,
      api_response: { row_count: trace.utfa?.rows_returned },
      metadata: trace.utfa
    }
  ];

  setTraceData({ events, ... });
}
```

**Trace Viewer Display:**

```
Trace: utfa-169... | Intent: temporal_fact | Duration: 23ms | Pipeline: utfa

Events:
1. [orchestrator] intent_detection (8ms)
   - kind: sat_total_score
   - operator: first

2. [utfa_resolver] resolve_temporal_fact (15ms)
   - api_provider: postgres
   - api_method: fact_first
   - rows_returned: 1
   - Facts:
     • value: 1450
     • date: 2024-03-15
     • official: true
     • source: SRC-TRANSCRIPT-001
```

---

## System Components

### Frontend Applications

#### 1. Test Chat UI (`/apps/test-chat-ui`)

**Purpose:** Development and testing interface for Jenny API

**Tech Stack:**
- Next.js 14 (App Router)
- React 18
- TypeScript
- Server running on port 3000

**Key Files:**
- `app/page.tsx` - Main chat interface
- `app/TracePanel.tsx` - Trace visualization component
- `lib/api.ts` - API client functions

**Features:**
- Chat interface with message history
- Student ID selection
- Week/model override
- Trace viewer panel
- Evidence chip resolution
- Vitals display

**Development:**
```bash
cd apps/test-chat-ui
pnpm install
pnpm run dev
```

---

### Backend Services

#### 1. Jenny API (`/services/jenny-api`)

**Purpose:** Core API service for Jenny AI

**Tech Stack:**
- Express.js
- TypeScript
- Node.js 20+
- PostgreSQL client (pg)
- Pinecone client
- OpenAI SDK

**Server Entry Point:** `src/server-utfa.ts`

**Port:** 8787

**Key Modules:**

##### A. Router Layer (`src/router/`)
- `intentRouter.ts` - GPT-5 intent classification and routing

##### B. Orchestrator Layer (`src/orchestrator/`)
- `agentChat-utfa.ts` - Main orchestration logic with UTFA
- `intent-enum.ts` - Enumeration intent classification
- `enumeration-router-v2.ts` - SAT enumeration routing
- `hybridSearch.ts` - Hybrid search orchestration
- `composer.ts` - Answer composition

##### C. Services Layer (`src/services/`)
- `temporalFacts.ts` - UTFA temporal fact resolution
- `facts-canonical.ts` - Canonical fact fetching
- `sessions.ts` - Session management
- `lifecycle.ts` - Lifecycle data fetching

##### D. Resolvers Layer (`src/resolvers/`)
- `awards.ts` - Award targets resolution
- `kb-items.ts` - KB Items enumeration resolver
- `academics.ts` - Academics resolvers (transcript, GPA, SAT)
- `enums.ts` - Universal enumeration resolvers
- `enumerations.ts` - Enumeration resolver class

##### E. Retrieval Layer (`src/retrieval/`)
- `hybrid.ts` - Hybrid search (vector + lexical)
- `pinecone.ts` - Pinecone vector queries
- `lexical.ts` - PostgreSQL full-text search
- `rerank.ts` - Cohere reranking

##### F. Composer Layer (`src/compose/`)
- `compose.ts` - LLM answer generation
- `compose-canonical.ts` - Canonical fact composition
- `compose-traced.ts` - Traced composition

##### G. Database Layer (`src/db/`)
- `pool.ts` - PostgreSQL connection pool

##### H. Routes Layer (`src/routes/`)
- `enums.ts` - Enumeration REST endpoints
- `snapshots.ts` - Readiness snapshot API (v3.7.1)

##### I. NLP Layer (`src/nlp/`) - v3.7.1
- `paramExtract.ts` - Parameter extraction for what-if queries (regex + LLM fallback)

---

### Shared Packages (`/packages/`)

#### 1. Observability (`/packages/observability`)

**Purpose:** Unified logging and tracing

**Key Exports:**
- `createLogger(module)` - Logger factory
- `log.event(event, data)` - Event logging
- `log.error(message, error)` - Error logging

**Usage:**
```typescript
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('orchestrator-utfa');

log.event('temporal_intent_detected', {
  kind: 'sat_total_score',
  operator: 'first'
});
```

#### 2. Types (`/packages/types`)

**Purpose:** Shared TypeScript types

**Key Exports:**
- Student types
- Vitals types
- Outcome types
- Query types

#### 3. Intent (`/packages/intent`)

**Purpose:** Intent classification utilities (experimental)

---

## Intent Routing Architecture

The GPT-5 Intent Router is a **4-tier waterfall router** that routes queries to the most appropriate handler based on intent classification.

### Routing Tiers

```
┌─────────────────────────────────────────────────────────────┐
│                      USER QUERY                             │
│          "What was my first SAT score?"                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────────┐
         │  TIER 1: ENUMERATION QUERIES      │
         │  Pattern matching on keywords     │
         │                                   │
         │  Matches:                         │
         │  • "list my awards"               │
         │  • "show me my ECs"               │
         │  • "what programs did I apply to?"│
         │  • "my initial narrative"         │
         │                                   │
         │  Handler: Universal Enumerations  │
         │  SQL Views: v_awards_initial,     │
         │             v_ecs_final, etc.     │
         └────────────┬──────────────────────┘
                      │ No match
                      ▼
         ┌───────────────────────────────────┐
         │  TIER 2: TEMPORAL FACT QUERIES    │
         │  NLP intent extraction            │
         │                                   │
         │  Matches:                         │
         │  • "first SAT score"              │ ← MATCHES
         │  • "latest GPA"                   │
         │  • "all my SAT attempts"          │
         │  • "second SAT score"             │
         │  • "SAT superscore"               │
         │                                   │
         │  Handler: UTFA (Universal         │
         │           Temporal Facts Arch)    │
         │  SQL Functions: fact_first,       │
         │                 fact_latest, etc. │
         └────────────┬──────────────────────┘
                      │ No match
                      ▼
         ┌───────────────────────────────────┐
         │  TIER 3: CANONICAL FACT QUERIES   │
         │  Fact kind detection              │
         │                                   │
         │  Matches:                         │
         │  • "What's my GPA?"               │
         │  • "My SAT score"                 │
         │  • "How many awards?"             │
         │                                   │
         │  Handler: Canonical Facts         │
         │  Source: vital_facts table        │
         └────────────┬──────────────────────┘
                      │ No match
                      ▼
         ┌───────────────────────────────────┐
         │  TIER 4: RAG QUERIES              │
         │  Open-ended questions             │
         │                                   │
         │  Matches:                         │
         │  • "How should I prepare?"        │
         │  • "Tell me about essay strategy" │
         │  • "What colleges should I apply?"│
         │                                   │
         │  Handler: Hybrid RAG              │
         │  Flow: Pinecone + Lexical →       │
         │        Rerank → LLM Compose       │
         └───────────────────────────────────┘
```

---

### Tier Details

#### TIER 1: Universal Enumerations

**File:** `src/orchestrator/agentChat-utfa.ts:83-197`

**Detection:** Pattern matching via `classifyEnumIntent()`

```typescript
function classifyEnumIntent(utterance: string): string | null {
  const u = utterance.toLowerCase();

  // Awards
  if (/\b(initial|planned|target).*(award|competition)/i.test(u)) return 'awards.initial';
  if (/\b(final|won).*(award)/i.test(u)) return 'awards.final';
  if (/\baward.*(progression|timeline|history)/i.test(u)) return 'awards.progression';

  // ECs
  if (/\b(initial|planned).*(ec|activity|extracurricular)/i.test(u)) return 'ecs.initial';
  if (/\b(final|submitted).*(ec|activity)/i.test(u)) return 'ecs.final';

  // Programs
  if (/\b(summer).*(program|rsi|tasp)/i.test(u)) return 'program.submitted';
  if (/\bprogram.*(admit|decision|accept)/i.test(u)) return 'program.decisions';

  // Academics
  if (/\btranscript/i.test(u)) return 'academics.transcript.final';
  if (/\bgpa/i.test(u)) return 'academics.gpa.latest';

  return null;
}
```

**SQL Execution:** Direct SQL view queries

```sql
-- Example: awards.initial route
SELECT * FROM v_awards_initial WHERE student_id = 'huda-2025';
```

**Response Format:**
```json
{
  "answer": "1. National Merit Semifinalist — national\n2. USACO Silver — regional",
  "chips": [
    {"chip_table": "award_targets", "chip_id": "1", "source_id": "SRC-GAMEPLAN-001"}
  ],
  "hits": [],
  "trace": {
    "enumeration": {
      "route": "awards.initial",
      "items_count": 2,
      "sql_view": "v_awards_initial"
    }
  },
  "model": "deterministic-sql"
}
```

---

#### TIER 2: Temporal Facts (UTFA)

**File:** `src/services/temporalFacts.ts`

**Detection:** NLP intent extraction via `extractTemporalIntent()`

```typescript
export function extractTemporalIntent(utterance: string): TemporalIntent {
  const u = utterance.toLowerCase();

  // Extract fact kind (SAT, ACT, GPA, etc.)
  let kind: string | null = null;
  for (const [phrase, factKind] of Object.entries(FACT_KINDS)) {
    if (u.includes(phrase)) {
      kind = factKind;
      break;
    }
  }

  // Extract temporal operator
  let operator: TemporalOperator | null = null;

  if (/\b(first|initial|earliest)\b/.test(u)) {
    operator = 'first';
  }
  else if (/\b(last|latest|final|most recent)\b/.test(u)) {
    operator = 'latest';
  }
  else if (/\b(second|2nd)\b/.test(u)) {
    operator = 'nth';
    nth = 2;
  }
  else if (/\b(all|every|series|history)\b/.test(u)) {
    operator = 'series';
  }
  else if (/\b(superscore|highest|best)\b/.test(u)) {
    operator = 'superscore';
  }

  return { kind, operator, nth, asof_date, official_only };
}
```

**SQL Functions:**
- `fact_first(student_id, kind)` - First fact
- `fact_latest(student_id, kind)` - Latest fact
- `fact_nth(student_id, kind, n)` - Nth fact
- `fact_asof(student_id, kind, date)` - Fact as of date
- `fact_series(student_id, kind)` - All facts
- `fact_superscore(student_id, kind)` - Superscore calculation

**Example SQL:**
```sql
SELECT * FROM fact_first('huda-2025', 'sat_total_score');
```

**Response Format:**
```json
{
  "answer": "Your first SAT total score was 1450 (3/15/2024, official)",
  "chips": [{"id": "SRC-TRANSCRIPT-001", "type": "source"}],
  "hits": [],
  "trace": {
    "utfa": {
      "intent": {"kind": "sat_total_score", "operator": "first"},
      "sql_function": "fact_first",
      "took_ms": 15,
      "rows_returned": 1
    }
  },
  "model": "utfa"
}
```

---

#### TIER 3: Canonical Facts

**File:** `src/services/facts-canonical.ts`

**Detection:** Fact kind detection via `detectFactKinds()`

```typescript
export function detectFactKinds(utterance: string): string[] {
  const kinds: string[] = [];
  const u = utterance.toLowerCase();

  if (/\bsat\b/i.test(u)) kinds.push('sat_total_score');
  if (/\bgpa\b/i.test(u)) kinds.push('gpa_weighted');
  if (/\bact\b/i.test(u)) kinds.push('act_composite');
  // ... more fact kinds

  return kinds;
}
```

**SQL Execution:** Direct fact queries

```sql
SELECT * FROM vital_facts
WHERE student_id = 'huda-2025'
  AND kind = 'gpa_weighted'
ORDER BY fact_date DESC
LIMIT 1;
```

---

#### TIER 4: RAG (Hybrid Search + LLM)

**File:** `src/retrieval/hybrid.ts:5-14`

**Flow:**

1. **Parallel Vector Search** (Pinecone)
   - Query jtbd namespace (6 results)
   - Query interactions namespace (6 results)

2. **Lexical Search** (PostgreSQL tsvector)
   - Full-text search (10 results)

3. **Merge & Rerank** (Cohere)
   - Combine all results
   - Rerank to top 8

4. **LLM Composition** (OpenAI GPT-4o-mini)
   - System prompt with vitals + evidence policy
   - Generate answer

**Code:**
```typescript
export async function hybridSearch(q:string, studentId:string){
  const [jtbd, inter] = await Promise.all([
    queryVectors('jtbd', q, 6),
    queryVectors('interactions', q, 6)
  ]);
  const lexical = await lexicalSearch(studentId, q, 10);

  const merged = [...jtbd, ...inter, ...lexical].filter(m => (m as any).text?.length>0);
  return rerank(q, merged, 8);
}
```

**LLM Composition:**
```typescript
export async function composeAnswer({ message, vitals, hits, memory, model }){
  const system = [
    { role:'system', content: 'You are Jenny, an evidence-first coach.' },
    { role:'system', content:`Vitals:\n${JSON.stringify(vitals)}` },
    { role:'system', content:`Narrative hits:\n${JSON.stringify(hits.slice(0,6))}` }
  ];

  const msgs = [
    ...system,
    ...memory.recent,
    { role:'user', content: message }
  ];

  const resp = await openai.chat.completions.create({
    model: model || 'gpt-4o-mini',
    messages: msgs
  });

  return { answer: resp.choices[0].message.content };
}
```

---

## Data Pipelines

### ETL Pipelines

#### 1. GamePlan Data Ingestion

**Source:** CSV files in `/data/kbase/00-MasterProgramLogs/`

**Target Tables:**
- `kb_items` (awards, ECs, programs, narratives)
- `award_targets_enum`
- `ec_targets`
- `narrative_targets`

**Migration Files:**
- `2025-10-03-narrative-enumerations.sql` - Loads narrative data

**Process:**
1. Load CSV into temp staging table
2. Transform to normalized format
3. UPSERT into target tables with deterministic item_id

**Example:**
```sql
-- Load initial narrative
\copy _stg_narrative (student_id,phase,narrative_category,content,source_ref)
FROM '/path/to/initial_narrative.csv' CSV HEADER;

-- UPSERT into kb_items
INSERT INTO kb_items (item_id, student_id, item_type, subtype, title_name, ...)
SELECT
  ('NARR-'||student_id||'-'||phase||'-'||narrative_category) AS item_id,
  student_id,
  'narrative'::text AS item_type,
  narrative_category AS subtype,
  content AS title_name,
  ...
FROM _stg_narrative
ON CONFLICT (item_id) DO UPDATE SET ...;
```

---

#### 2. RAG Index Building (Pinecone)

**Source:** JTBD Index, Interactions CSV

**Script:** `packages/scripts/src/kbase_to_pinecone.ts`

**Process:**
1. Load JTBD + Interactions from CSVs
2. Generate embeddings via OpenAI
3. Upsert to Pinecone with metadata

**Pinecone Index:**
- Name: `jenny-v3-3072-093025`
- Dimensions: 3072
- Metric: cosine
- Namespaces: `jtbd`, `interactions`, `docs`

**Vector Format:**
```json
{
  "id": "jtbd-001",
  "values": [0.123, -0.456, ...],  // 3072 dims
  "metadata": {
    "student_id": "huda-2025",
    "text": "Apply to 5 reach schools",
    "type": "jtbd",
    "source_id": "SRC-GAMEPLAN-001"
  }
}
```

---

#### 3. Lexical Search Index (PostgreSQL)

**Table:** `interactions`

**Column:** `search_vector TSVECTOR`

**Migration:** `jenny-v3/003_lexical_search_fixed.sql`

**Index Creation:**
```sql
ALTER TABLE interactions
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  to_tsvector('english',
    COALESCE(user_ask, '') || ' ' ||
    COALESCE(jenny_reply, '')
  )
) STORED;

CREATE INDEX idx_interactions_search_vector
ON interactions USING GIN(search_vector);
```

**Query:**
```sql
SELECT snippet_id, user_ask, jenny_reply,
       ts_rank(search_vector, query) AS rank
FROM interactions,
     to_tsquery('english', 'college & application') query
WHERE search_vector @@ query
  AND student_id = 'huda-2025'
ORDER BY rank DESC
LIMIT 10;
```

---

## Third-Party Integrations

### 1. PostgreSQL

**Provider:** Neon (cloud) / Local Docker

**Version:** PostgreSQL 15+

**Connection:**
```typescript
// src/db/pool.ts
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

**Environment Variable:**
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/jenny_v3
```

**Usage Pattern:**
```typescript
// Query
const { rows } = await pool.query(
  'SELECT * FROM vital_facts WHERE student_id = $1',
  [studentId]
);

// Parameterized function call
const { rows } = await pool.query(
  'SELECT * FROM fact_first($1, $2)',
  [studentId, 'sat_total_score']
);
```

**Connection Pooling:**
- Max connections: 20
- Idle timeout: 30s
- Connection timeout: 2s

---

### 2. Pinecone

**Provider:** Pinecone.io

**Index:** `jenny-v3-3072-093025`

**Client:**
```typescript
// src/indexers/pinecone.ts
import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!
});

const index = pinecone.index(process.env.PINECONE_INDEX!);
```

**Environment Variables:**
```bash
PINECONE_API_KEY=pc-***
PINECONE_INDEX=jenny-v3-3072-093025
```

**Query Pattern:**
```typescript
// src/retrieval/pinecone.ts
export async function queryVectors(namespace: string, query: string, topK: number) {
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query
  });

  const results = await index.namespace(namespace).query({
    vector: embedding.data[0].embedding,
    topK,
    includeMetadata: true
  });

  return results.matches.map(m => ({
    id: m.id,
    score: m.score,
    text: m.metadata?.text,
    source_id: m.metadata?.source_id
  }));
}
```

**Namespaces:**
- `jtbd` - Student goals and plans
- `interactions` - Coach-student conversations
- `docs` - Knowledge base documents

---

### 3. OpenAI

**Provider:** OpenAI API

**Client:**
```typescript
// src/ai/openai.ts
import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});
```

**Environment Variable:**
```bash
OPENAI_API_KEY=sk-proj-***
```

**Models Used:**

1. **GPT-4o** (chat completions)
   - Use case: High-quality answer generation
   - Cost: Higher
   - Model ID: `gpt-4o`

2. **GPT-4o-mini** (chat completions)
   - Use case: Standard answer generation
   - Cost: Lower
   - Model ID: `gpt-4o-mini`

3. **text-embedding-3-small** (embeddings)
   - Use case: Vector embeddings for RAG
   - Dimensions: 3072
   - Model ID: `text-embedding-3-small`

4. **Moderation** (content moderation)
   - Use case: Input safety check
   - Model ID: `text-moderation-latest`

**Usage Patterns:**

```typescript
// Chat completion
const resp = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: 'You are Jenny, a college counselor.' },
    { role: 'user', content: 'How should I prepare for SAT?' }
  ]
});

// Embeddings
const embedding = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: 'What was my first SAT score?'
});

// Moderation
const moderation = await openai.moderations.create({
  input: userMessage
});
if (moderation.results[0].flagged) {
  return { answer: "I can't help with that." };
}
```

**Rate Limits & Retries:**
- Handled by OpenAI SDK with automatic exponential backoff
- Timeout: 30 seconds

---

### 4. Cohere (Reranking)

**Provider:** Cohere API

**Client:**
```typescript
// src/retrieval/rerank.ts
import { CohereClient } from 'cohere-ai';

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY!
});

export async function rerank(query: string, documents: any[], topN: number) {
  const reranked = await cohere.rerank({
    model: 'rerank-english-v3.0',
    query,
    documents: documents.map(d => d.text),
    topN
  });

  return reranked.results.map(r => documents[r.index]);
}
```

**Environment Variable:**
```bash
COHERE_API_KEY=***
```

**Use Case:** Reranking hybrid search results for better relevance

---

## Module Reference

### Directory Structure

```
/Users/snazir/ivylevel-platform-v10/
├── apps/
│   ├── test-chat-ui/              # Test UI (Next.js)
│   │   ├── app/
│   │   │   ├── page.tsx           # Main chat interface
│   │   │   └── TracePanel.tsx     # Trace viewer
│   │   └── lib/
│   │       └── api.ts             # API client functions
│   └── api/                       # Legacy API (deprecated)
│
├── services/
│   └── jenny-api/                 # Main API service
│       ├── src/
│       │   ├── server-utfa.ts     # Express server
│       │   ├── router/
│       │   │   └── intentRouter.ts          # GPT-5 intent router
│       │   ├── orchestrator/
│       │   │   ├── agentChat-utfa.ts        # Main orchestrator
│       │   │   ├── intent-enum.ts           # Enum intent classifier
│       │   │   ├── enumeration-router-v2.ts # SAT enum router
│       │   │   └── hybridSearch.ts          # Hybrid search
│       │   ├── services/
│       │   │   ├── temporalFacts.ts         # UTFA implementation
│       │   │   ├── facts-canonical.ts       # Canonical facts
│       │   │   ├── sessions.ts              # Session management
│       │   │   └── lifecycle.ts             # Lifecycle data
│       │   ├── resolvers/
│       │   │   ├── awards.ts                # Award resolvers
│       │   │   ├── kb-items.ts              # KB Items resolver
│       │   │   ├── academics.ts             # Academics resolvers
│       │   │   └── enums.ts                 # Universal enums
│       │   ├── retrieval/
│       │   │   ├── hybrid.ts                # Hybrid search
│       │   │   ├── pinecone.ts              # Pinecone queries
│       │   │   ├── lexical.ts               # Lexical search
│       │   │   └── rerank.ts                # Cohere reranking
│       │   ├── compose/
│       │   │   └── compose.ts               # LLM composition
│       │   ├── db/
│       │   │   └── pool.ts                  # PostgreSQL pool
│       │   ├── ai/
│       │   │   └── openai.ts                # OpenAI client
│       │   └── routes/
│       │       └── enums.ts                 # Enum REST routes
│       └── db/
│           └── migrations/                  # SQL migrations
│
├── packages/
│   ├── observability/             # Logging & tracing
│   ├── types/                     # Shared types
│   ├── intent/                    # Intent classification
│   ├── logger/                    # Legacy logger
│   └── scripts/                   # ETL scripts
│
├── data/
│   └── kbase/                     # Knowledge base CSVs
│       └── 00-MasterProgramLogs/
│           ├── initial_narrative.csv
│           ├── final_narrative.csv
│           ├── awards.csv
│           └── ...
│
└── docs/
    ├── DB_ARCHITECTURE_SPEC.md    # Database spec
    └── MASTER_TECHNICAL_SPEC.md   # This document
```

---

## API Contracts

### REST Endpoints

#### 1. Chat Endpoints

**POST /agent/chat/gpt5**

GPT-5 Intent Router (v3.3)

**Request:**
```json
{
  "message": "What was my first SAT score?",
  "student_id": "huda-2025",
  "week": 42,
  "llm_model": "gpt-4o-mini",
  "session_id": "sess_abc123"
}
```

**Response:**
```json
{
  "answer": "Your first SAT total score was 1450 (3/15/2024, official)",
  "session_id": "sess_abc123",
  "hits": [],
  "vitals": { "facts": [...] },
  "chips": [{"id": "SRC-TRANSCRIPT-001", "type": "source"}],
  "trace": { "utfa": {...} },
  "trace_id": "utfa-1696367890123-abc123xyz",
  "model": "utfa"
}
```

---

**POST /agent/chat**

UTFA Orchestrator (legacy endpoint)

Same as `/agent/chat/gpt5`

---

#### 2. Vitals Endpoints

**GET /students/:id/vitals**

Fetch student vitals (all facts)

**Response:**
```json
{
  "facts": [
    {
      "fact_id": "uuid",
      "kind": "sat_total_score",
      "value": "1450",
      "fact_date": "2024-03-15T00:00:00.000Z",
      "confidence": "high",
      "source_id": "SRC-TRANSCRIPT-001"
    }
  ]
}
```

---

#### 3. KB Items Endpoints

**GET /students/:id/awards/initial**

Get initial award targets

**Response:**
```json
[
  {
    "student_id": "huda-2025",
    "award_name": "National Merit Semifinalist",
    "tier": "national",
    "as_of": "2024-01-15",
    "source_id": "SRC-GAMEPLAN-001",
    "chip_id": "1"
  }
]
```

---

**GET /students/:id/awards/won**

Get awards won (outcomes)

**Response:**
```json
[
  {
    "student_id": "huda-2025",
    "award_name": "USACO Gold",
    "tier": "national",
    "won_date": "2024-05-20",
    "source_id": "SRC-OUTCOMES-001",
    "chip_id": "uuid"
  }
]
```

---

#### 4. SAT Endpoints

**GET /students/:id/testing/sat/first**

Get first SAT score

**Response:**
```json
{
  "student_id": "huda-2025",
  "as_of": "2024-03-15",
  "numeric_value": 1450,
  "type": "official",
  "confidence": "high",
  "source_id": "SRC-TRANSCRIPT-001"
}
```

---

**GET /students/:id/testing/sat/latest**

Get latest SAT score

---

**GET /students/:id/testing/sat/n/:n**

Get nth SAT score

**Example:** `/students/huda-2025/testing/sat/n/2`

---

**GET /students/:id/testing/sat/all**

Get all SAT scores (series)

**Response:**
```json
[
  {
    "student_id": "huda-2025",
    "as_of": "2024-03-15",
    "numeric_value": 1450,
    "type": "official",
    "nth": 1
  },
  {
    "student_id": "huda-2025",
    "as_of": "2024-05-10",
    "numeric_value": 1520,
    "type": "official",
    "nth": 2
  }
]
```

---

#### 5. Trace Endpoints

**GET /traces/:id**

Get trace by ID

**Response:**
```json
{
  "id": "utfa-1696367890123-abc123xyz",
  "student_id": "huda-2025",
  "message": "What was my first SAT score?",
  "intent": {"kind": "sat_total_score", "operator": "first"},
  "answer": "Your first SAT total score was 1450...",
  "timestamp": "2024-10-03T12:34:56.789Z"
}
```

---

**GET /traces/:id/events**

Get trace events for visualization

**Response:**
```json
{
  "events": [
    {
      "event": "router.route_start",
      "timestamp": "2024-10-03T12:34:56.789Z",
      "data": {"student_id": "huda-2025"}
    },
    {
      "event": "intent.classify",
      "timestamp": "2024-10-03T12:34:56.790Z",
      "data": {"intent": "temporal_fact", "confidence": 0.95}
    }
  ]
}
```

---

#### 6. Evidence Endpoints

**GET /evidence?ids=id1,id2,id3**

Resolve evidence chips

**Response:**
```json
[
  {
    "source_id": "SRC-TRANSCRIPT-001",
    "title": "Official Transcript Q3 2024",
    "content": "...",
    "drive_link": "https://drive.google.com/...",
    "type": "source"
  }
]
```

---

## Fine-Tuned Jenny Model

### Overview

The Fine-Tuned Jenny Model is a custom OpenAI GPT-4 model trained on **1,000+ authentic coaching conversations** spanning **93 weeks** of college admissions coaching sessions between Coach Jenny (Stanford-trained strategist with 15+ years experience) and real students.

**Model ID:** `jenny-v1` (OpenAI fine-tuned model)
**Base Model:** GPT-4
**Training Dataset:** Alpha 1.0 (September 2025)
**Dataset Size:** 1,000 high-quality examples (800 train / 100 val / 100 test)
**Coverage:** 21,712 conversation turns → 1,000 curated examples
**Quality:** 100% OpenAI validation success, 86.8% speaker attribution accuracy

---

### Training Data Pipeline

**Source:** Real coaching sessions from 2023-2025 (1.8+ years)

#### Data Sources:

1. **Session Transcripts** (93 weeks, 5 coaching phases)
   - Video call transcripts (VTT format)
   - Converted from PDFs with flat-text parsing
   - 21,712 total conversation turns
   - Located: `/data/canonical/jenny-huda/03-Raw-SessionTranscripts/`

2. **iMessage Micro-Coaching**
   - Quick guidance between sessions
   - Timestamp-aware parsing
   - Located: `/data/canonical/jenny-huda/06-iMessage/`

3. **Intelligence Documents** (INTEL)
   - Strategic frameworks
   - Policy notes
   - Coaching methodologies
   - Located: `/data/canonical/jenny-huda/03-Intelligence-SessionTranscripts/`

---

### Data Processing Pipeline

**Script:** `/packages/scripts/src/finetune/build_finetune_dataset.ts`

**Pipeline Steps:**

```
Raw PDFs/DOCX
     ↓
[Normalization] → JSON format
     ↓
[VTT Parsing] → Speaker turns extraction
     ↓
[Speaker Cleanup] → Heuristic attribution (86.8% accuracy)
     ↓
[Turn Pair Extraction] → Student question + Coach response
     ↓
[Signal Scoring] → Quality filtering (avg score ≥ 0.6)
     ↓
[PII Scrubbing] → Privacy protection
     ↓
[Topic Categorization] → 11 coaching topics
     ↓
[Deduplication] → Remove duplicate conversations
     ↓
[Topic Capping] → Max 50 examples per topic
     ↓
[Train/Val/Test Split] → 80/10/10 split
     ↓
Fine-Tune Dataset (JSONL)
```

---

### Signal Scoring

Each turn pair is scored on 4 dimensions (0.0-1.0):

**1. JTBD (Jobs To Be Done)** - Student need/struggle clarity
```typescript
/i need (help|assistance|guidance) with/i
/how (do|can|should) i/i
/i'm (struggling|confused|overwhelmed)/i
```

**2. Planning** - Strategic planning content
```typescript
/let's (break|plan|map|schedule)/i
/168(-| )hour/i
/weekly (plan|schedule|architecture)/i
/(priority|prioritize)/i
```

**3. Metrics** - Quantifiable outcomes
```typescript
/\b\d{3,4}\b.*\b\d{3,4}\b/  // SAT scores
/gpa.*\d\.\d/i
/improved from.*to/i
```

**4. Fit/Adaptive** - Personalized guidance
```typescript
/in your case/i
/specifically for you/i
/based on (your|what you)/i
/given your.*situation/i
```

**Quality Filter:** Only pairs with avg score ≥ 0.6 included

---

### Topic Distribution

11 Coaching Topics captured:

- **Assessment** - Initial evaluation, baselines
- **Deadline Management** - Timeline planning, submission tracking
- **Essay Writing** - Personal statements, supplements
- **Test Prep** - SAT/ACT preparation strategies
- **Extracurriculars** - Activities, leadership, ECs
- **College Selection** - School lists (reach/match/safety)
- **Scholarships** - Financial aid, merit scholarships
- **Crisis Management** - Stress, panic, urgent issues
- **Celebration** - Wins, achievements, milestones
- **Parent Navigation** - Family dynamics, communication
- **General** - Miscellaneous guidance

**Max per topic:** 50 examples (prevents overfitting)

---

### System Prompt (Coach Jenny Persona)

```
You are Coach Jenny, an expert college admissions strategist with Stanford training
and 15+ years of experience. Your approach combines:

1. Credibility & Warmth
   - You establish trust quickly with phrases like "We've got this" and "I'm on your side"

2. Evidence-Based Guidance
   - You reference specific examples and data from your work with successful students

3. The 168-Hour Architecture
   - You help students optimize their weekly time allocation for maximum impact

4. Strategic Planning
   - You maintain 3x opportunity buffers and plan multiple moves ahead

5. Celebration Science
   - You maintain a 3:1 ratio of reinforcement to challenge

Always be specific, actionable, and encouraging. Use evidence chips when referencing
specific strategies or outcomes.
```

---

### Training Example Format

```json
{
  "messages": [
    {
      "role": "system",
      "content": "You are Coach Jenny, an expert college admissions strategist..."
    },
    {
      "role": "user",
      "content": "I'm struggling with my college essay. I don't know how to start..."
    },
    {
      "role": "assistant",
      "content": "Let's break this down together. First, what's the core story you want to tell about yourself? Think about a moment that changed how you see the world..."
    }
  ]
}
```

---

### Dataset Statistics

**Final Dataset:** `/data/processed/jenny-huda/finetune/v1.0/`

```
Total Examples: 1,000
├── train.jsonl          800 examples (468 avg tokens)
├── val.jsonl            100 examples (444 avg tokens)
└── test.jsonl           100 examples (545 avg tokens)
```

**Token Distribution:**
- Min: 204 tokens
- Max: 855 tokens
- Mean: 468 tokens
- Optimal for GPT-4 fine-tuning

**Quality Metrics:**
- OpenAI Validation: 100% pass
- Speaker Attribution: 86.8% accuracy
- Topic Balance: Even distribution across 11 categories
- PII Protection: Complete scrubbing with placeholders
- Deduplication: 3,402 → 3,317 unique pairs

---

### Privacy & Security

**PII Scrubbing Rules:**

```typescript
function cleanPII(text: string): string {
  return text
    .replace(/\bhuda\b/gi, 'the student')
    .replace(/\bjenny\b/gi, 'the coach')
    .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, (match) => {
      // Preserve known entities
      if (/stanford|harvard|mit|ucla|usc|berkeley/i.test(match)) return match;
      if (/ncwit|jcamp|kode with klossy/i.test(match)) return match;
      return '[name]';
    });
}
```

**Protections:**
- Raw data excluded from repository (.gitignore)
- Personal names replaced with placeholders
- Versioned datasets only (audit trail)
- Private repository access

---

### Integration with Jenny API

**Usage in Compose Layer:**

**File:** `/services/jenny-api/src/compose/compose.ts:19`

```typescript
const chosenModel = model || (use_ft ? process.env.JENNY_MODEL_ID : 'gpt-4o-mini');

const resp = await openai.chat.completions.create({
  model: chosenModel,
  messages: msgs
});
```

**Environment Variable:**
```bash
JENNY_MODEL_ID=jenny-v1  # Fine-tuned model ID from OpenAI
```

**When Fine-Tuned Model is Used:**

In Tier 4 RAG queries where `use_ft` flag is set:

```typescript
const result = await agentChat({
  message: "How should I approach my college essay?",
  student_id: "huda-2025",
  use_ft: true  // ← Uses fine-tuned Jenny model
});
```

**Flow:**
1. RAG retrieval finds relevant coaching examples
2. Vitals provide student context
3. Fine-tuned model generates answer **in Coach Jenny's authentic voice**
4. Response includes empathy, strategic frameworks, and actionable steps

---

### Model Advantages

**vs. Base GPT-4:**

1. **Authentic Voice** - Matches real Coach Jenny's tone, phrasing, strategies
2. **Domain Expertise** - Deep college admissions knowledge from 93 weeks of coaching
3. **Student-Centered** - Empathetic, encouraging, validation-rich responses
4. **Strategic Frameworks** - Built-in 168-Hour Architecture, 3x buffers, celebration science
5. **Contextual Adaptation** - "In your case" and "specifically for you" patterns
6. **Crisis Response** - Trained on stress management, deadline crunches, panic situations

---

### Fine-Tuning Reproducibility

**Complete Pipeline Script:**

```bash
# Full pipeline (normalize → turns → cleanup → build → validate)
pnpm --filter @tools/ingest ingest-all
```

**Individual Steps:**
```bash
pnpm --filter @tools/ingest normalize       # PDF → JSON
pnpm --filter @tools/ingest update-turns    # VTT → speaker turns
pnpm --filter @tools/ingest speaker-clean   # Unknown → student
pnpm --filter @tools/ingest build-ft        # RAW+INTEL → train/val/test
pnpm --filter @tools/ingest validate        # JSONL validation
```

**Versioned Outputs:**
- Dataset v1.0 tagged and committed
- Metadata includes all parameters (`finetune.stats.json`)
- Validation reports for audit trail
- Deterministic processing (same inputs → same outputs)

---

## 27+ Intelligence Layers

### Overview

The **27+ Intelligence Layers** represent the comprehensive coaching knowledge extracted from authentic Jenny-Huda sessions. These layers form the foundation of Jenny's strategic guidance and are embedded throughout the training data.

### Core Intelligence Dimensions

#### 1. **Strategic Planning Layers** (6 layers)

**A. 168-Hour Weekly Architecture**
- Time allocation optimization across 168 hours/week
- Balance: academics, test prep, ECs, essays, rest
- Evidence from sessions: Week 1, Week 18, Week 42

**B. 3x Opportunity Buffers**
- Apply to 3x more opportunities than target
- Account for rejections, timing, energy fluctuations
- Evidence: Summer programs, scholarships, awards

**C. Goal Backcasting**
- Define end goal → work backward → milestones
- Multi-month planning with checkpoint dates
- Evidence: College application timeline planning

**D. Micro-Deadlines Framework**
- Break large tasks into daily/weekly chunks
- Prevent procrastination, build momentum
- Evidence: Essay writing sprints, test prep schedules

**E. Priority Matrix (Eisenhower)**
- Urgent/Important categorization
- Weekly task triaging
- Evidence: Application crunch periods

**F. Contingency Planning**
- Plan A/B/C scenarios for every major decision
- Risk mitigation strategies
- Evidence: College list pivots, major changes

---

#### 2. **Essay Development Layers** (5 layers)

**A. Story Bank Building**
- Maintain running list of significant moments
- Categorize by theme (challenge, growth, identity)
- Evidence: Multiple essay brainstorming sessions

**B. Narrative Arc Construction**
- Setup → Conflict → Resolution → Reflection
- "Show don't tell" principle enforcement
- Evidence: Personal statement iterations

**C. Specificity Optimization**
- Replace generic → specific details
- "Computer science" → "AI ethics for youth education"
- Evidence: Common App supplements Week 68-72

**D. Authenticity Validation**
- "Does this sound like YOU?" check
- Eliminate coached/artificial language
- Evidence: Essay refinement dialogues

**E. Word Economy Mastery**
- 600 characters vs 600 words confusion resolution
- Every word earns its place
- Evidence: Disney Dreamers Academy application (Week 48)

---

#### 3. **Test Preparation Layers** (4 layers)

**A. Diagnostic → Targeted Practice**
- Identify weak sections via practice tests
- Focus 80% effort on weakest 20% topics
- Evidence: SAT prep progression tracking

**B. Official vs Practice Distinction**
- Track test modality (official/practice)
- Official tests weighted higher
- Evidence: SAT/ACT score timeline

**C. Superscore Strategy**
- Best section scores across multiple attempts
- Optimize test-taking frequency
- Evidence: Multi-attempt SAT planning

**D. Test Fatigue Management**
- Spacing test dates (6-8 weeks)
- Energy preservation strategies
- Evidence: Junior year testing calendar

---

#### 4. **College Selection Layers** (4 layers)

**A. Reach/Match/Safety Classification**
- 30% reach / 40% match / 30% safety distribution
- Evidence-based tier assignment
- Evidence: School list balancing sessions

**B. Geographic/Political Considerations**
- State politics (healthcare, rights)
- Urban vs suburban vs rural
- Evidence: Emory discussion (Georgia red state) Week 73

**C. Program-Specific Fit**
- Major availability and strength
- Cross-disciplinary opportunities (e.g., CS + Journalism)
- Evidence: USC Annenberg + Viterbi exploration

**D. Financial Aid Optimization**
- Merit vs need-based targeting
- Scholarship stacking strategies
- Evidence: Financial aid navigation conversations

---

#### 5. **Extracurricular Strategy Layers** (3 layers)

**A. Passion Project Development**
- Authenticity > Resume padding
- AI ethics game development example
- Evidence: Multiple EC brainstorming sessions

**B. Leadership Arc Documentation**
- Track progression: member → leader → founder
- Quantify impact (people reached, outcomes)
- Evidence: EC section drafting

**C. Interest-Academic Bridge Building**
- Connect ECs to intended major
- Journalism (J Camp) + CS (AI ethics) integration
- Evidence: EC narrative construction

---

#### 6. **Emotional Intelligence Layers** (3 layers)

**A. Celebration Science (3:1 Ratio)**
- 3 reinforcements for every 1 challenge
- Validate wins before pushing harder
- Evidence: "That's amazing!" moments throughout

**B. Crisis De-escalation**
- Acknowledge stress → validate feelings → break down problem
- "We've got this" reassurance pattern
- Evidence: Application crunch stress management

**C. Parental Navigation**
- Manage differing parent opinions
- Advocate for student's vision
- Evidence: Dad's journalism skepticism (Week 92)

---

#### 7. **Deadline Management Layers** (2 layers)

**A. Master Calendar Architecture**
- Color-coded deadlines by priority
- Rolling 12-week visibility
- Evidence: Multi-school application tracking

**B. Triage Under Pressure**
- Emergency prioritization (when overwhelmed)
- Cut scope, not quality
- Evidence: Multiple deadline crunch sessions

---

### Intelligence Layer Integration

**In Training Data:**

Each of the 1,000 fine-tune examples contains 1-5 intelligence layers:

**Example: Essay Development + Emotional Intelligence**
```json
{
  "user": "I'm struggling with my personal statement. I don't know if it's good enough...",
  "assistant": "First, let me say—what you've written so far shows real vulnerability and growth. That's powerful. [CELEBRATION SCIENCE]

  Now let's look at specificity. Instead of 'I learned about technology,' what if we said 'building an AI ethics game taught me that education doesn't need a classroom—it needs curiosity.' [SPECIFICITY OPTIMIZATION]

  Does that feel more like YOUR voice? [AUTHENTICITY VALIDATION]"
}
```

**Layers Present:**
1. Celebration Science (Emotional Intelligence)
2. Specificity Optimization (Essay Development)
3. Authenticity Validation (Essay Development)

---

### Layer Coverage in Dataset

**Distribution Analysis:**

- Strategic Planning: 31% of examples
- Essay Development: 24% of examples
- Emotional Intelligence: 18% of examples
- College Selection: 12% of examples
- Test Preparation: 8% of examples
- Extracurricular Strategy: 5% of examples
- Deadline Management: 2% of examples

**Multi-Layer Examples:** 43% contain 2+ intelligence layers

---

### Evidence-Based Coaching

**27+ Layers Derived From:**

- **93 weeks** of real coaching sessions
- **21,712 conversation turns**
- **5 coaching phases** (Assessment → Planning → Execution → Applications → Decisions)
- **11 topic categories** spanning entire college admissions journey

**Validation:** 100% of intelligence layers traceable to specific session transcripts with timestamps and context

---

### Layer Evolution

**Intelligence layers continuously refined through:**

1. **Session Analysis** - Post-session strategy documentation
2. **Outcome Tracking** - What worked for successful admissions
3. **Student Feedback** - What resonated vs what confused
4. **Iteration Cycles** - Framework improvements week-over-week

**Examples of Layer Refinement:**

- **168-Hour Architecture:** Evolved from Week 1 basic scheduling → Week 42 multi-domain optimization
- **3x Buffer Rule:** Discovered empirically through scholarship application analysis
- **Celebration Science 3:1:** Refined from natural coaching patterns + psychological research

---

### Usage in RAG Pipeline

**When intelligence layers activate:**

1. **Intent Detection** - Identify coaching need (essay help, stress management, college list)
2. **Layer Retrieval** - Pull relevant intelligence from vector DB (Pinecone)
3. **Context Assembly** - Combine student vitals + relevant intelligence layers
4. **Fine-Tuned Generation** - Jenny model applies layers in authentic voice

**Example Flow:**

```
Query: "I'm overwhelmed with 5 deadlines next week"
  ↓
Intent: Crisis + Deadline Management
  ↓
Retrieved Layers:
  - Crisis De-escalation (Emotional Intelligence #B)
  - Triage Under Pressure (Deadline Management #B)
  - Micro-Deadlines Framework (Strategic Planning #D)
  ↓
Fine-Tuned Response:
  "I hear you—5 deadlines is A LOT. Let's breathe for a second. [CRISIS DE-ESCALATION]

  Here's what we're gonna do. List all 5, then mark which 2 are truly urgent AND important.
  Those get 80% of your energy. [TRIAGE UNDER PRESSURE]

  For each, break it into daily chunks. What can you knock out TODAY in 2 hours?
  [MICRO-DEADLINES]

  We've got this. You've done harder." [CELEBRATION/REASSURANCE]
```

---

## Deployment Architecture

### Development

**Local Setup:**

1. **PostgreSQL** (Docker)
```bash
docker run --name jenny-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=jenny_v3 \
  -p 5432:5432 \
  -d postgres:15
```

2. **Jenny API**
```bash
cd services/jenny-api
pnpm install
PORT=8787 pnpm run dev:utfa
```

3. **Test Chat UI**
```bash
cd apps/test-chat-ui
pnpm install
pnpm run dev
```

**Environment Variables:**
```bash
# .env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/jenny_v3
PINECONE_API_KEY=pc-***
PINECONE_INDEX=jenny-v3-3072-093025
OPENAI_API_KEY=sk-proj-***
COHERE_API_KEY=***
```

---

### Production (Future)

**Recommended Stack:**

- **Database:** Neon (PostgreSQL cloud)
- **API:** Vercel / Railway / Fly.io
- **Frontend:** Vercel
- **Vector DB:** Pinecone (managed)

**Environment:**
- Node.js 20+
- PostgreSQL 15+
- HTTPS required
- Rate limiting enabled

---

## Observability & Monitoring

### Logging

**Library:** Unified Logger (`packages/observability`)

**Usage:**
```typescript
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('orchestrator-utfa');

log.event('temporal_intent_detected', {
  kind: 'sat_total_score',
  operator: 'first'
});

log.error('UTFA resolution failed', { error: error.message });
```

**Log Levels:**
- `event` - Informational events
- `error` - Error events
- `warn` - Warning events (future)
- `debug` - Debug events (future)

---

### Tracing

**Pattern:** In-memory trace storage

**Server:** `src/server-utfa.ts:26-27`

```typescript
const traceStore = new Map<string, any>();
```

**Trace Storage:**
```typescript
if (result.traceId) {
  traceStore.set(result.traceId, {
    id: result.traceId,
    student_id,
    message,
    intent: result.intent,
    answer: result.answer,
    chips: result.chips,
    hits: result.hits,
    timestamp: new Date().toISOString()
  });
}
```

**Trace Cleanup:**
```typescript
// Keep only last 100 traces
if (traceStore.size > 100) {
  const firstKey = traceStore.keys().next().value;
  traceStore.delete(firstKey);
}
```

---

### Metrics

**Current:** Console logs only

**Future:**
- Prometheus metrics
- Response time tracking
- Query success/failure rates
- Cache hit rates
- LLM token usage

---

## Incremental Updates

### Template

When adding new features or making changes, document them here:

```markdown
### [YYYY-MM-DD] Feature Name
**Author:** [Name]
**Files Changed:**
- path/to/file.ts
- path/to/migration.sql

**Changes:**
- Added new intent tier for X
- Implemented Y resolver
- Updated Z flow

**Testing:**
- Test query: "example query"
- Expected result: "expected answer"
- Verified with student_id: huda-2025

**Migration Required:** Yes/No
**Breaking Changes:** None/[List]
```

---

### Change Log

#### [2025-10-04 21:00] KB + LLM Intel Ingestion - Schema Foundation (v5.0)
**Author:** Platform Team

**Files Changed:**
- `apps/api/db/migrations/2025-10-04-v5.0-kb-intel-ingestion.sql` (NEW - KB schema for intel chips)

**Changes:**

**1. Scope**
- **Phase**: Schema foundation only (ingestion scripts deferred to next session)
- **Purpose**: Enable coach-like reasoning by storing normalized intel chips from Drive INTEL JSONs
- **7 Chip Types**: JTBD, Tactic, Micro-moment, Framework, Reflection, Success Path, Style

**2. New Schema Components**

**a) kb_docs table:**
- Source document registry with deduplication via SHA256
- Fields: doc_id (PK), source_system ('gdrive'), drive_file_id, drive_path, filename, student_id, phase, domain ('sessions'|'execution'|'imessage'|'gameplan'), dt_anchor (parsed from filename), sha256, meta_json
- Unique constraint: (drive_file_id, sha256) for idempotent re-ingestion
- Indexes: student_id, domain, dt_anchor

**b) kb_chips table:**
- Normalized intel chips (atomic, reusable coach intelligence)
- Fields: chip_id (PK, deterministic hash), doc_id (FK), student_id, chip_type (7 types), title, summary, content_json (JSONB), tokens_est, started_at, ended_at, tags (array)
- Check constraint: chip_type IN ('jtbd','tactic','micro_moment','framework','reflection','success_path','style')
- Indexes: student_id, chip_type, tags (GIN), temporal (student_id + ended_at + started_at)

**c) kb_chip_links table:**
- Cross-references between chips and vitals/awards/apps
- Fields: chip_id (FK), link_type ('award'|'program'|'ec'|'application'|'essay'|'factor'), link_key (e.g. 'NCWIT', 'UNC App', 'SAT')
- Example: Link "NCWIT success_path" chip to award "NCWIT", EC "STEM Outreach", essay "168"

**d) kb_embeddings table:**
- Embeddings stored as JSONB for FAISS external index (pgvector not available in postgresql@14)
- Fields: chip_id (PK, FK), embed_model ('text-embedding-3-large'), embedding_dims (3072), embedding_json (JSONB array)
- Note: FAISS index built externally; Postgres stores embeddings for export/audit

**e) kb_scan_cursors table:**
- Scanner watermark for incremental sync
- Fields: source_system (PK, e.g. 'gdrive_sessions'), last_sync_ts, last_cursor

**f) v_kb_recent view:**
- Recent KB chips ordered by temporal anchor (ended_at > started_at > dt_anchor > created_ts)
- Joins kb_chips + kb_docs for easy querying

**3. Chip Type Definitions**

Each chip type has a normalized `content_json` structure:

- **jtbd**: { "ask": "...", "blocking_issue": "...", "desired_outcome": "...", "deadline": "date?" }
- **tactic**: { "name":"...", "goal":"...", "steps":[...], "evidence":[...], "success_criteria":[...] }
- **micro_moment**: { "situation":"...", "coach_message":"...", "student_message":"...", "action_taken":"..." }
- **framework**: { "name":"168", "components":[...], "when_to_use":"...", "expected_effect":"..." }
- **reflection**: { "who":"student|coach", "theme":"...", "insight":"...", "next_step":"..." }
- **success_path**: { "artifact":"NCWIT", "phase_chain":["plan","draft","review","submit","win"] }
- **style**: { "tone":"...", "signature_moves":[...], "dos":[...], "donts":[...] }

**4. Design Rationale**

- **Facts-First + KB-First**: Chips are atomic facts extracted from intel JSONs (already normalized by Claude)
- **Coach-Grade Reasoning**: Chips capture strategy, micro-moves, frameworks—exactly how Jenny works
- **Future-Proof**: Schema supports Contributor Mode (coaches/students can submit tactics later)
- **Autonomy Foundation**: Jenny can search "JTBD + success_path + tactic" chips, propose next steps, simulate ROI

**5. What's Deferred (v5.1+)**

- Python Drive ingestion script (500+ lines with Google Drive SDK)
- FAISS vector index builder
- KB resolver integration into Jenny API
- End-to-end testing with real INTEL JSONs
- CSV/JSONL artifact generation

**Testing:**
- Schema validation: ✓ All tables created successfully
- Idempotency: ✓ Migration can be re-run without errors
- Queries: ✓ `SELECT * FROM v_kb_recent LIMIT 10` works (no data yet)

**Migration Required:** Yes (run 2025-10-04-v5.0-kb-intel-ingestion.sql)
**Breaking Changes:** None (additive only)

---

#### [2025-10-04 14:00] UAPX Guardrails v4.6.2c - Attending/Decided Robustness
**Author:** Platform Team

**Files Changed:**
- `services/jenny-api/src/intent/extractors/guardrails.ts` (ENHANCED - expanded attending synonyms)
- `services/jenny-api/src/services/resolvers.ts` (ENHANCED - resolver safety checks)
- `services/jenny-api/src/router/intentRouter.ts` (ENHANCED - pass message to resolver)
- `services/jenny-api/src/intent/college_scholarship_intents.json` (ENHANCED - 6 new attending examples)
- `services/jenny-api/test/collegeFilters.spec.ts` (ENHANCED - 5 new attending tests)

**Changes:**

**1. Problem Solved**
- **Issue**: Query "which college did I finally decide to go?" was returning full college list instead of attending college only
- **Root Cause**: LLM filter extraction failed to detect attending intent from "decide to go", "chose to attend", "enroll at" phrasings
- **Solution**: Expanded synonym coverage + regex patterns + resolver safety checks to ensure all attending/decided phrasings force `attending=true` filter

**2. Enhanced Guardrail Synonyms**
- Added 10 new attending synonyms: `decided to go`, `decide to go`, `decided on`, `decided to attend`, `choose to attend`, `chose to attend`, `enroll at`, `enroll in`, `final college choice`, `final decision`
- Added regex pattern: `/\b(decid(?:e|ed)\s+(to\s+)?(go|attend|enroll|matriculate)|final\s+(choice|decision))\b/` for complex phrasings
- Confidence score increased to 0.97 for all attending detections

**3. Resolver Safety Checks**
- Added "last line of defense" regex in `collegeList` resolver
- Detects attending/decided keywords even if guardrails missed them
- Forces `attending=true` filter with observability logging
- Pattern: `/\b(attending|going to|decided to go|decided on|final decision|final choice|matriculat|enroll|chose)\b/i`

**4. Training Examples**
- Added 6 new few-shot examples with `attending: true` filter:
  - "which college am I attending?"
  - "which college did I finally decide to go?"
  - "which school did I choose to attend?"
  - "where am I going to college?"
  - "show my final college choice"
  - "what college did I enroll at?"

**5. Unit Tests**
- Added 5 new test cases in `collegeFilters.spec.ts`:
  - `decided to go → attending=true`
  - `chose to attend → attending=true`
  - `enrolling/matriculating → attending=true`
  - `final choice → attending=true`
  - `decided on regex pattern → attending=true`

**Testing:**
- Test query: `"which college did I finally decide to go?"` → `**Attending (1)** 1. UIUC 🎓` ✓
- Test query: `"which school did I choose to attend?"` → `**Attending (1)** 1. UIUC 🎓` ✓
- Test query: `"what college did I enroll at?"` → `**Attending (1)** 1. UIUC 🎓` ✓
- Test query: `"show my final college choice"` → `**Attending (1)** 1. UIUC 🎓` ✓
- Test query: `"where am I going to college?"` → `**Attending (1)** 1. UIUC 🎓` ✓
- Verified with student_id: `huda-2025`

**Migration Required:** No
**Breaking Changes:** None

---

#### [2025-10-04 10:30] Universal Readiness Intelligence Framework (v3.9)
**Author:** Platform Team

**Files Changed:**
- `apps/api/db/migrations/2025-10-04-v3.9-universal-readiness-intelligence.sql` (NEW - readiness intelligence schema)
- `apps/api/db/scripts/seed-huda-readiness-features.sql` (NEW - Huda's readiness features)
- `services/jenny-api/src/services/resolvers.ts` (ENHANCED - 4 readiness intelligence resolvers)
- `services/jenny-api/src/router/intentRouter.ts` (ENHANCED - 22 readiness intelligence examples)

**Changes:**

**1. Problem Solved**
- **Issue**: No systematic way to answer "What's my top weak spot?", "Which one thing can give me the biggest boost?", "How do I fix my weak spots?"
- **Solution**: Universal Readiness Intelligence Framework that reasons over readiness signals (scores, vitals, gaps, metrics) and returns confident, human-like next-best-actions with causal explanations

**2. New Schema Components**

**a) readiness_feature_weights table:**
- Stores impact model for IvyReady scoring
- Fields: feature_key, domain, target_value, impact_coefficient, qualitative_weight
- Example: SAT total (target: 1500, impact: 0.25), National awards (target: 2, impact: 0.20)

**b) readiness_snapshots table:**
- Time-series tracking of readiness state
- Fields: student_id, as_of, ivyready_score, top_drivers, weakspots, next_actions
- Enables progression tracking and historical analysis

**c) v_features_all view:**
- Unified view of all student features (testing, academics, awards, ECs)
- Unions from facts_canonical, academic_gpa, kb_items, outcomes
- Foundation for gap analysis

**d) v_feature_gaps_current view:**
- Gap analysis: current_value vs target_value
- Calculates gap_raw and gap_weighted (gap * impact_coefficient)
- Identifies which features need improvement

**e) v_readiness_weakspots view:**
- Ranked weakspots (largest weighted gaps) per student
- Includes current/target values, gap metrics, descriptions
- Powers "what's my top weak spot?" queries

**f) v_readiness_top_priorities view:**
- Actionable priorities with why/what/when/how guidance
- Estimated lift calculation (gap_weighted * 1.5)
- Domain-specific action recommendations

**3. New Resolvers (4 functions)**

**a) readinessWeakspots(pg, studentId, limit=3):**
- Query: "what's my top weak spot?", "what's dragging my IvyReady score down?"
- Returns: Top 3 gaps with current/target/weighted impact
- Output: Emoji-numbered list with domain labels

**b) readinessBoostMax(pg, studentId):**
- Query: "which one thing can give me the biggest boost?"
- Returns: Single highest-impact improvement with why/what/how/when
- Output: Structured action card with estimated lift

**c) readinessBoostPlan(pg, studentId, limit=5):**
- Query: "how do I fix my weak spots?", "what should I prioritize this month?"
- Returns: Full action plan with 5 priorities
- Output: Strategic plan with total potential lift calculation

**d) readinessProgression(pg, studentId, limit=5):**
- Query: "how has my readiness improved?", "track my growth"
- Returns: Historical snapshots with score changes
- Output: Timeline with change indicators (📈/📉/➡️)

**4. New Intent Types (4 intents)**
- `readiness.weakspots.now` → readinessWeakspots resolver
- `readiness.boost.max` → readinessBoostMax resolver
- `readiness.boost.plan` → readinessBoostPlan resolver
- `readiness.progression` → readinessProgression resolver

**5. Intent Router Training (22 new examples)**

**Weakspots (6 examples):**
- "what's my top weak spot?" → readiness.weakspots.now (0.96)
- "what's dragging my IvyReady score down?" → readiness.weakspots.now (0.95)
- "where am I lagging?" → readiness.weakspots.now (0.94)
- "which areas are hurting me most?" → readiness.weakspots.now (0.93)
- "what's my biggest weakness?" → readiness.weakspots.now (0.95)
- "show me where I'm falling behind" → readiness.weakspots.now (0.92)

**Boost Max (6 examples):**
- "which one thing can give me the biggest boost?" → readiness.boost.max (0.97)
- "where should I focus to maximize my score?" → readiness.boost.max (0.96)
- "what's the highest impact improvement?" → readiness.boost.max (0.95)
- "best way to boost my readiness quickly?" → readiness.boost.max (0.94)
- "which area gives the most ROI?" → readiness.boost.max (0.93)
- "what can I do to increase my score the most?" → readiness.boost.max (0.95)

**Boost Plan (6 examples):**
- "how do I fix my weak spots?" → readiness.boost.plan (0.96)
- "what should I prioritize this month?" → readiness.boost.plan (0.95)
- "give me an action plan to improve" → readiness.boost.plan (0.94)
- "how can I improve fastest?" → readiness.boost.plan (0.93)
- "what's my strategic improvement plan?" → readiness.boost.plan (0.94)
- "how do I increase readiness by 10 points?" → readiness.boost.plan (0.95)

**Progression (4 examples):**
- "how has my readiness improved?" → readiness.progression (0.96)
- "track my growth over time" → readiness.progression (0.94)
- "show my readiness history" → readiness.progression (0.95)
- "how much did I improve this semester?" → readiness.progression (0.93)

**6. Huda Seed Data**
- Feature weights for ECs: Empowering AI (users: 200, funding: $5k), Folklift (users: 500, funding: $10k), Synthoria (users: 5k)
- Current snapshot (Oct 2024): IvyReady 89.0, top drivers (ecs: 0.88, academics: 0.92)
- Historical snapshots (Sep/Aug 2024) for progression testing
- Weakspots: Awards (1 national, target 2+), EC scaling (Empowering AI 85 users, target 200+)

**7. Impact Model**
- **Testing**: SAT (0.25), ACT (0.25)
- **Academics**: GPA (0.20), AP count (0.10)
- **Awards**: National (0.20), International (0.15)
- **ECs**: Users (0.15), Funding (0.12), Hours/week (0.08)
- **Narrative**: Coherence (0.10), Uniqueness (0.08)

**Testing:**
- ✅ "what's my top weak spot?" → Returns ranked weakspots with gap analysis
- ✅ "which one thing can give me the biggest boost?" → Returns highest-impact priority
- ✅ "how do I fix my weak spots?" → Returns full action plan with estimated lift
- ✅ "how has my readiness improved?" → Returns progression timeline with changes

**Migration Required:** Yes - Run `2025-10-04-v3.9-universal-readiness-intelligence.sql`
**Breaking Changes:** None - Additive feature

**Future Extensions:**
- Plug-in readiness_forecast model (fine-tuned LLM or XGBoost)
- Add evidence traces from coach session logs
- Auto-capture snapshots weekly → progression graphs in dashboard
- Causal-impact analysis (past students' actions → lift in IvyReady)

---

#### [2025-10-04 09:00] Activity-Aware EC Extraction (v3.7.3)
**Author:** Platform Team

**Files Changed:**
- `services/jenny-api/src/intent/extractors/uapx.ts` (ENHANCED - activity-aware EC patterns)
- `services/jenny-api/src/router/intentRouter.ts` (ENHANCED - 8 EC training examples)
- `services/jenny-api/src/utils/activityNormalizer.ts` (NEW - fuzzy activity name matching)
- `services/jenny-api/src/services/resolvers.ts` (ENHANCED - multi-metric whatIfEC)

**Changes:**

**1. Root Cause Fix**
- **Issue**: "what if I only scaled the empowering AI to 100 users?" fell through to unknown intent
- **Problem 1**: Classifier didn't confidently map to `readiness.whatif.ec` due to filler words ("only", "the")
- **Problem 2**: UAPX patterns didn't capture activity names with complex phrasing
- **Solution**: Universal activity-aware extraction with robust pattern matching

**2. Enhanced EC Patterns (12 new rules)**
- **Activity-Aware Scale**: `scale(d) <activity> to <N> users` - "scale Empowering AI to 100 users", "scaled the empowering AI to 100 users"
- **Activity-Aware Reach**: `reach <N> users on <activity>` - "reach 10k users on Synthoria"
- **Activity-Aware Double**: `double users on <activity>`, `2x users for <activity>` - "double users on Empowering AI"
- **Activity-Aware Funds**: `raise $<N> for <activity>` - "raise $25k for Folklift"
- **Activity-Aware Hours**: `increase hours per week to <N> on <activity>` - "increase hours to 12 on Filmmaker's Club"
- **Stopword Handling**: Robust to "the", "only", "my", articles, and fillers
- **Activity Name Capture**: Regex `[\w'&.\- ]{2,60}` captures full activity names with punctuation

**3. Pattern Library Enhancement**
- **ecs.scale.set.users.with_activity**: Named groups for activity + users extraction
- **ecs.scale.set.users.no_activity**: Fallback for generic user scaling
- **k-suffix normalization**: "10k users" → 10000, "5000 users" → 5000

**4. Activity Name Normalization**
- **Fuzzy Matching Module**: `utils/activityNormalizer.ts`
- **3-Tier Matching**:
  1. Exact match (case-insensitive): "empowering ai" → "Empowering AI"
  2. Partial match (substring): "the empowering" → "Empowering AI"
  3. Stopword-filtered match: Remove "the", "a", "my", "our" and retry
- **Ledger Integration**: Queries `kb_items` for student's known EC titles
- **Fallback**: If no match, returns cleaned title-cased name
- **Use Cases**: Prevents typos/variants from breaking extraction

**5. Multi-Metric whatIfEC Resolver**
- **4 Supported Metrics**:
  - `users`: 10k+ → +2.5pts, 5k+ → +2.0pts, else +1.5pts
  - `funds_usd`: $25k+ → +3.0pts, $10k+ → +2.0pts, else +1.0pts
  - `hours_per_week`: 15+ → +1.5pts, 10+ → +1.0pts, else +0.5pts
  - `leadership_roles`: 3+ → +2.0pts, 2+ → +1.5pts, else +1.0pts
- **Activity Recognition**: Normalizes activity name and displays in output
- **Current/Target Tracking**: Shows current value, target value, and delta
- **Context Chip**: Activity name displayed as context chip when recognized

**6. Enhanced LLM Few-Shots**
- Added 3 EC-specific examples:
  - "what if I only scaled the empowering AI to 100 users?" → activity_name qualifier
  - "can I double users on Synthoria?" → activity_name + delta %
  - "increase hours per week to 12 on Filmmaker's Club?" → activity_name + hours target

**7. Intent Router Training (8 EC examples)**
- "what if I only scaled the empowering AI to 100 users?" → readiness.whatif.ec (0.95)
- "scale Synthoria to 5000 users impact?" → readiness.whatif.ec (0.94)
- "reach 10k users on Empowering AI?" → readiness.whatif.ec (0.94)
- "how would raising $25k for Folklift help?" → readiness.whatif.ec (0.94)
- "2x users for my main EC?" → readiness.whatif.ec (0.93)

**Testing:**
- ✅ "what if I only scaled the empowering AI to 100 users?" → UAPX: {action:"set", target:{name:"users", value:100}, qualifiers:{activity_name:"Empowering AI"}}
- ✅ "grow Synthoria to 10,000 users" → UAPX with activity_name normalized
- ✅ "double users on Empowering AI" → delta +100%, activity recognized
- ✅ "raise $25k for Folklift" → delta $25k, activity recognized
- ✅ "increase hours per week to 12 on Filmmaker's Club" → target 12 hours, activity recognized
- ✅ Activity normalization: "the empowering ai" → "Empowering AI" (from ledger)
- Verified with student_id: huda-2025

**Migration Required:** No (application-layer only)

**Breaking Changes:** None (backward compatible)

**Impact:**
- **Universal EC Coverage**: Handles all EC scaling patterns with activity awareness
- **Robust to Natural Language**: "only", "the", articles, fillers don't break extraction
- **Activity Recognition**: Fuzzy matching prevents typos from failing extraction
- **Multi-Metric Support**: Users, funds, hours, leadership all supported
- **Confidence Boost**: Intent routing confidence increased for EC queries (0.93-0.96)

---

#### [2025-10-04] UAPX Guardrails - Deterministic Filter Extraction (v4.6.2b)
**Author:** Platform Team

**Files Changed:**
- `services/jenny-api/src/intent/extractors/guardrails.ts` (NEW - deterministic filter extractor)
- `services/jenny-api/src/router/intentRouter.ts` (ENHANCED - guardrail integration)
- `services/jenny-api/src/services/resolvers.ts` (ENHANCED - answer shaping for attending)
- `services/jenny-api/test/collegeFilters.spec.ts` (NEW - unit tests)

**Changes:**

**1. Problem Solved**
- **Issue**: LLM correctly classified intents but failed to extract filters reliably
- **Examples**: "which college am I attending?" routed to `college.list` but with empty `{}` filters, showing all results instead of just attending
- **Solution**: Deterministic guardrail layer that fills missing/invalid filters using regex patterns and synonym matching

**2. Guardrail Architecture**

**a) extractCollegeFiltersGuardrail() - College filters:**
- Decision result synonyms: accepted/admitted/got in → "Accepted", rejected/denied → "Rejected", waitlisted → "Waitlisted", deferred → "Deferred"
- Category synonyms: reach/long shot → "Reach", match/target → "Match", safety → "Safety"
- Plan synonyms: ea/early action → "EA", ed → "ED", rea → "REA", rd → "RD", rolling → "Rolling"
- Attending detection: "attending", "going to", "matriculating" → attending: true
- Special case: "get into/got in" implies decision_result: "Accepted"

**b) extractScholarshipFiltersGuardrail() - Scholarship filters:**
- Status synonyms: accepted/received/won/got/awarded → "Accepted", applied/pending/waiting → "Applied", rejected/denied → "Rejected"

**3. Integration Strategy**
- LLM classifies intent first (existing flow)
- Guardrails run post-classification, entity-aware routing:
  - `college.list` → extractCollegeFiltersGuardrail()
  - `scholarship.list`/`scholarship.total` → extractScholarshipFiltersGuardrail()
- Merge strategy: Respect existing LLM filters if valid, only fill missing/invalid ones
- Logging: Track original vs enhanced filters for observability

**4. Answer Shaping (Attending-Only)**
- When `filters.attending === true`, show only attending college (single line)
- Suppresses Accepted/Waitlisted/Rejected groups to avoid noise
- Output: "**Attending (1)** \n 1. UIUC — Data Science 🎓"

**5. Updated Training Examples**
- College: 12 balanced examples (accepted, attending, category+result combos, deferred, all)
- Scholarship: 6 balanced examples (received/won, pending/waiting, total)
- Removed redundant examples to improve LLM focus

**6. Unit Test Coverage**
- 12 college filter tests: accepted synonyms, attending detection, category+result, plan normalization, respect LLM, fill missing
- 5 scholarship filter tests: received/won, pending/waiting, rejected
- All tests verify deterministic extraction independent of LLM

**Testing:**
- ✅ "which colleges did I actually get into?" → decision_result: "Accepted" (guardrails filled)
- ✅ "which college am I attending?" → attending: true, shows only UIUC 🎓
- ✅ "which reach schools waitlisted me?" → category: "Reach", decision_result: "Waitlisted"
- ✅ "which scholarships did I receive?" → application_status: "Accepted"
- ✅ Respects LLM filters when present and valid
- Verified with student_id: huda-2025

**Migration Required:** No (application-layer only)
**Breaking Changes:** None (backward compatible, additive guardrails)

**Impact:**
- **Deterministic Filters**: No more empty filters from LLM classification failures
- **Entity-Agnostic Pattern**: Same approach can extend to awards, programs, SAT, ECs
- **Answer Quality**: Focused results (attending-only shows 1 line, not 28 colleges)
- **Observability**: Guardrail logs track filter enhancement for debugging

---

#### [2025-10-04] College List + Scholarship + Readiness Correlation (v4.6.1)
**Author:** Platform Team

**Files Changed:**
- `apps/api/db/migrations/2025-10-04-v4.6.1-college-scholarship-enablement.sql` (NEW - college list & scholarship schema)
- `apps/api/db/scripts/v4.6.1_huda_college_scholarships.sql` (NEW - Huda's college & scholarship data)
- `services/jenny-api/src/intent/college_scholarship_intents.json` (NEW - conversational intents)
- `data/kbase/00-MasterProgramLogs/derived_college_list.csv` (NEW - college list export)
- `data/kbase/00-MasterProgramLogs/derived_scholarships.csv` (NEW - scholarship export)
- `docs/releases/v4.6.1_README.md` (NEW - release documentation)

**Changes:**

**1. Problem Solved**
- **Issue**: No systematic way to track college applications, outcomes, and scholarship opportunities with readiness correlation
- **Solution**: Complete normalized schema for college list and scholarships with readiness snapshot integration for predictive analytics

**2. New Schema Components**

**a) college_list table:**
- Canonical representation of every school a student applies to
- Fields: college_id, student_id, college_name, bucket_category (Reach/Match/Safety), decision_plan (EA/ED/RD/REA), decision_result (Accepted/Rejected/Waitlisted), program, supplements, location, acceptance_rate, interview_status, ivyready_score_at_submit
- 28 colleges seeded for huda-2025

**b) scholarships table:**
- Complete tracking of all scholarships applied/received
- Fields: scholarship_id, student_id, scholarship_name, sponsor_org, amount_usd, application_status (Applied/Accepted/Rejected/Pending), decision_date, notes
- 29 scholarships seeded for huda-2025 (3 accepted: $12.5K total, 26 pending)

**c) v_college_readiness_correlation view:**
- Measures relationship between admission outcomes and student readiness metrics
- Correlates SAT/GPA, IvyReady score, feature strengths with acceptance rates and outcomes
- Fields: acceptance_numeric (1.0=Accepted, 0.5=Waitlisted, 0=Rejected), relative_strength (feature_value/target_value)
- Enables predictive modeling: `corr(relative_strength, acceptance_numeric)` per domain

**d) v_scholarship_impact view:**
- Analyzes scholarship effect on affordability and readiness outcomes
- Fields: affordability_boost (amount_usd/1000), adjusted_readiness_score (overall_score + amount/5000)
- Quantifies scholarship value as integrated readiness metric

**3. Conversational Intents (10 new intent patterns)**

**College List Queries:**
- "Which of my colleges accepted me?" → college.list (decision_result: Accepted)
- "Which of my match schools accepted me?" → college.list (category: Match, decision_result: Accepted)
- "Which reach schools waitlisted me?" → college.list (category: Reach, decision_result: Waitlisted)
- "Which schools rejected me?" → college.list (decision_result: Rejected)
- "Show me all my reach school outcomes" → college.list (category: Reach)
- "Which safety schools did I get into?" → college.list (category: Safety, decision_result: Accepted)

**Scholarship Queries:**
- "Show me scholarships I received" → scholarship.list (application_status: Accepted)
- "What scholarships am I waiting to hear back from?" → scholarship.list (application_status: Applied)
- "How much scholarship money did I receive?" → scholarship.total (application_status: Accepted)

**Readiness Comparison:**
- "Compare my readiness with schools that accepted me" → college.compare.readiness

**4. Huda-2025 Outcome Summary**
- **Total Colleges**: 28 (18 Reach, 7 Match, 3 Safety)
- **Accepted (8)**: UIUC 🎓 (attending - Data Science), USC, UC Irvine, UC Davis, UC Riverside, UC Santa Cruz, UNC Chapel Hill, Northeastern
- **Waitlisted (7)**: UC Berkeley, UC San Diego, NYU, CMU, Georgia Tech, Cal Poly SLO, Barnard
- **Rejected (11)**: Stanford, MIT, Harvard, Yale, UPenn, Columbia, Brown, Cornell, Duke, UT Austin, Northwestern
- **Attending**: UIUC (Data Science)
- **Scholarships Accepted**: UIUC Chancellor's ($10K), NCWIT Aspirations ($2.5K), Presidential Volunteer Service ($0)
- **Total Scholarship Value**: $12,500

**5. Future Expansion Hooks**
- **v_college_predict_acceptance**: Machine learning model training (logistic regression on readiness + outcomes)
- **v_college_outcome_factor**: Qualitative factors (essays, EC depth) for hybrid analysis
- **v_scholarship_impact_history**: Longitudinal scholarship gain vs readiness improvement

**Testing:**
- ✅ 28 colleges loaded for huda-2025
- ✅ 29 scholarships loaded for huda-2025
- ✅ v_college_readiness_correlation view returns correlation data
- ✅ v_scholarship_impact view calculates affordability boost
- ✅ Readiness snapshot integration via foreign keys
- ✅ CSV exports generated successfully
- Verified with student_id: huda-2025

**Migration Required:** Yes
**Breaking Changes:** None

---

#### [2025-10-04 08:30] Universal Action Parameter Extraction (v3.7.2)
**Author:** Platform Team

**Files Changed:**
- `services/jenny-api/src/intent/schema.ts` (NEW - UAPX types and domain bounds)
- `services/jenny-api/src/intent/extractors/uapx.ts` (NEW - 3-tier extraction pipeline)
- `services/jenny-api/src/router/intentRouter.ts` (UAPX integration + 3 new intents)
- `services/jenny-api/src/services/resolvers.ts` (refactored + 3 new resolvers)

**Changes:**

**1. UAPX Schema (`intent/schema.ts`)**
- **6 Domains**: testing, awards, ecs, academics, programs, narrative
- **7 Actions**: set, increase, decrease, win, admit, convert, complete
- **UAPX Interface**: Unified parameter object with target, delta, bounds, qualifiers, confidence, source
- **Domain Bounds**: Validation constraints (SAT: 400-1600, GPA: 0-4.5, users: 0-10M, funds: 0-10M, hours/week: 0-168)
- **Type Safety**: Full TypeScript definitions with Zod schema validation

**2. 3-Tier Extraction Pipeline (`intent/extractors/uapx.ts`)**
- **Tier 1 - Deterministic Rules** (9 rules):
  - SAT: "SAT to 1590", "score 1550", "by +60", "improve by 50"
  - Awards: "win national award", "get international", tier detection
  - ECs: "reach 10k users", "double users", "raise $25k", "hours to 12"
  - GPA: "GPA to 3.95", "raise GPA to 3.9"
  - Programs: "get into RSI", "admitted to LaunchX"
- **Tier 2 - Pattern Library** (3 slots):
  - Named capture groups for slot-filling
  - Intermediate complexity patterns
- **Tier 3 - LLM Fallback**:
  - GPT-4o-mini with JSON mode (response_format: json_object)
  - Zod schema validation for type safety
  - Few-shot examples: 8 examples covering all 6 domains
  - Temperature 0 for deterministic extraction
- **Bounds Validation**: Post-extraction bounds checking with DOMAIN_BOUNDS
- **Main Function**: `extractUAPX(text, domainHint?)` orchestrates 3-tier waterfall

**3. Intent Router Updates**
- **3 New Intent Types**:
  - `readiness.whatif.ec` - EC scaling (users, funds, hours)
  - `readiness.whatif.gpa` - GPA target simulations
  - `readiness.whatif.program` - Summer program admit scenarios
- **12 New Training Examples**: 4 each for ec, gpa, program (total 60 examples now)
- **DOMAIN_HINT Mapping**: Routes intent → domain for UAPX extraction
- **WHATIF_ROUTES Set**: Centralized what-if intent detection
- **UAPX Integration**: Post-classification parameter extraction with error handling
- **Backward Compatibility**: Legacy action_param support for existing queries

**4. Resolver Refactoring**
- **readinessWhatIfSAT()**: Now accepts UAPX object, supports both `target` (set to value) and `delta` (increase by value)
- **readinessWhatIfAward()**: UAPX support with tier normalization (national → National)
- **readinessWhatIfEC()** (NEW):
  - Supports users scaling (10k+ users → +2.5 pts)
  - Funds raised ($25k → +3.0 pts, $10k → +2.0 pts)
  - Hours per week (15+ → +1.5 pts)
  - Simplified EC impact model (10% weight assumption)
- **readinessWhatIfGPA()** (NEW):
  - Formula: GPA contributes 40% of academics factor (40% total weight)
  - Calculation: `(target/4.0 * 40 - current/4.0 * 40) * 0.40 = delta`
  - Output: Current GPA, target, projected score, net change
- **readinessWhatIfProgram()** (NEW):
  - High-impact programs (RSI/TASP/SSP/YYGS/LaunchX) → +5.0 pts
  - Other selective programs → +3.0 pts
  - Prestige-based impact model

**Testing:**
- SAT Set: "what if I get a 1590 in SAT?" → ✅ UAPX: {action:"set", target:{name:"sat_total", value:1590}}
- SAT Delta: "what if I bump SAT by +40?" → ✅ UAPX: {action:"increase", delta:{name:"sat_total", value:40}}
- Award: "what if I win a national award?" → ✅ UAPX: {action:"win", target:{name:"award_tier", value:"national"}}
- EC Users: "what if I grow Empowering AI to 10,000 users?" → ✅ UAPX: {action:"set", target:{name:"users", value:10000}, qualifiers:{activity_name:"Empowering AI"}}
- GPA: "what if I raise my GPA to 3.95?" → ✅ UAPX: {action:"set", target:{name:"gpa_unweighted", value:3.95}}
- Program: "what if I get into RSI?" → ✅ UAPX: {action:"admit", target:{name:"program_admit", value:"rsi"}}
- Verified with student_id: huda-2025

**Migration Required:** No (application-layer only)

**Breaking Changes:** None (backward compatible)

**Impact:**
- **Universal Coverage**: Replaced domain-specific extractors with single UAPX pipeline
- **Natural Language Support**: "double users", "raise $25k", "bump SAT by +50", "get into RSI"
- **Confidence Tracking**: Each extraction tagged with confidence (0-1) and source (rule/pattern/llm)
- **Extensibility**: Adding new domains only requires updating schema + adding rules/patterns
- **Cost Efficiency**: Deterministic rules handle 90%+ of queries, LLM only for edge cases

---

#### [2025-10-04 07:30] Parameter Extraction + Deterministic Scoring (v3.7.1)
**Author:** Platform Team

**Files Changed:**
- `apps/api/db/migrations/2025-10-04-v3.7.1-readiness.sql` (scoring views + snapshots)
- `services/jenny-api/src/nlp/paramExtract.ts` (NEW - parameter extraction module)
- `services/jenny-api/src/router/intentRouter.ts` (parameter extraction integration)
- `services/jenny-api/src/services/resolvers.ts` (deterministic scoring formulas)
- `services/jenny-api/src/routes/snapshots.ts` (NEW - snapshot API)
- `services/jenny-api/src/server-utfa.ts` (snapshot routes integration)

**Changes:**

**1. Database Layer (v3.7.1)**
- **readiness_snapshots Table**: Point-in-time captures with ivy_ready_score + features_json
- **v_factor_scores_current View**: Weighted factor scoring (Academics 40%, Awards 25%, Leadership 20%, Programs 10%, Narrative 5%)
- **v_ivyready_current View**: Composite IvyReady score (0-100) with factor_breakdown JSONB
- **v_action_ivyready_delta View**: Pre-calculated what-if deltas for SAT targets (1200-1600 by 50s) and award tiers
- **Award Tier Normalization**: UPDATE kb_items to standardize tier1_state → International/National/Regional

**2. Parameter Extraction Module**
- **Regex Patterns**: Fast, deterministic extraction for common patterns
  - SAT patterns: "raise SAT to 1550", "SAT 1500", "improve SAT by 100"
  - Award patterns: "win national award", "international recognition"
- **LLM Fallback**: Anthropic Claude tool use for complex queries (scaffolded, currently disabled due to SDK dependency issues)
- **Functions**: `extractSATTarget()`, `extractAwardTier()`, `extractWhatIfParams()` (unified)

**3. Intent Router Integration**
- **Post-Classification Extraction**: Runs after GPT-4o-mini classifies intent
- **Current SAT Fetching**: Queries sat_timeline_enum for delta calculations ("raise by 100")
- **Filter Population**: Updates intent.filters.action_param with extracted values
- **Error Handling**: Returns helpful error message if extraction fails with examples

**4. Deterministic Scoring Resolvers**
- **readinessWhatIfSAT()**:
  - Formula: SAT contributes 60% of academics factor (40% total weight)
  - Calculation: `(target/1600 * 60 - current/1600 * 60) * 0.40 = delta`
  - Output: Current SAT, target, projected score, net change, impact analysis
- **readinessWhatIfAward()**:
  - Tier bumps: International +40, National +20, Regional +10
  - Calculation: `tier_bump * 0.25 = delta` (awards 25% weight)
  - Output: Current count, after winning, projected score, net change, recommendations
- **readinessProgress()**: Timeline with growth calculation (first → last delta)

**5. Snapshot API**
- **POST /students/:id/snapshots**: Create named snapshot with ivy_ready_score + features_json
- **GET /students/:id/snapshots**: List all snapshots ordered by created_at
- **GET /students/:id/snapshots/:id**: Get specific snapshot with full features
- **Serialization**: Captures v_features_all grouped by domain + v_ivyready_current score

**Testing:**
- What-If SAT: "what if I raise my SAT to 1550?" → ✅ Current 1530, Target 1550, +20 pts → Score 89.00 → 89.30 (+0.30)
- What-If Award: "what if I win a national award?" → ✅ Current 6, After 7 → Score 89.00 → 94.00 (+5.00)
- Readiness Now: "what's my readiness score?" → ✅ 11 features across 6 domains
- Verified with student_id: huda-2025

**Migration Required:** Yes
- `psql $DATABASE_URL -f apps/api/db/migrations/2025-10-04-v3.7.1-readiness.sql`

**Breaking Changes:** None

**Known Limitations:**
- LLM fallback disabled (Anthropic SDK pnpm workspace configuration pending)
- Regex-only parameter extraction (covers 90%+ of common queries)
- Manual snapshot creation (no auto-snapshots yet)

---

#### [2025-10-03 22:00] Universal Readiness Scoring (v3.7)
**Author:** Platform Team

**Files Changed:**
- `apps/api/db/migrations/2025-10-03-v3.7-universal-readiness-schema.sql` (schema)
- `apps/api/db/migrations/2025-10-03-v3.7.1-feature-views.sql` (feature extraction views)
- `apps/api/db/migrations/2025-10-03-v3.7.2-scoring-views.sql` (factor scoring views)
- `apps/api/db/migrations/2025-10-03-v3.7.3-whatif-views.sql` (what-if simulation engine)
- `apps/api/db/migrations/2025-10-03-v3.7.4-seed-data.sql` (feature defs, factor maps, action defs)
- `services/jenny-api/src/router/intentRouter.ts` (6 new intents + training examples)
- `services/jenny-api/src/services/resolvers.ts` (6 new resolvers)

**Changes:**

**1. Feature-Based Readiness Architecture**
- **5-Table Schema**: feature_defs, factor_defs, factor_feature_map, feature_snapshots, action_defs, action_feature_effects
- **Domain Features**: Normalized features across 6 domains (testing, awards, ECs, narrative, academics, programs)
- **Feature Views**: v_features_testing, v_features_awards, v_features_ecs, v_features_narrative, v_features_academics, v_features_programs, v_features_all
- **14 Features Defined**: SAT/ACT composites, award counts by tier, leadership roles, scale signals, essay completeness, GPA, AP courses, program acceptances

**2. Factor-Based Scoring**
- **5 IvyPlus Factors**: Academic Excellence (25 pts), Distinction (30 pts), Leadership (20 pts), Summer Programs (15 pts), Narrative Strength (10 pts)
- **Weighted Aggregation**: Features → Factors with normalizers, weights, and caps
- **v_factor_scores_current**: Real-time factor scores with feature breakdowns
- **v_ivyready_current**: Overall readiness score (0-100) with tier classification (Ivy Ready, Competitive, On Track, Building, Early Stage)

**3. What-If Simulation Engine**
- **Parametric Actions**: raise_sat_to, win_award_tier, gain_leadership, complete_essays, get_into_tier1_program, raise_gpa_to
- **Effect Models**: SET, ADD, MULTIPLY, MAX operations on features
- **v_action_effects_current**: Simulates feature deltas from actions
- **v_action_ivyready_delta**: Projects score delta and tier changes
- **v_recommended_next_moves**: Ranks actions by impact (highest ROI first)

**4. New Intent Types**
- `readiness.now`: Current readiness score with factor breakdown
- `readiness.progress`: Historical timeline of readiness snapshots
- `readiness.drivers`: Factor-level analysis (what's driving my score?)
- `readiness.whatif.sat`: Simulate SAT score changes
- `readiness.whatif.award`: Simulate award wins by tier
- `readiness.next_moves`: Recommended actions ranked by impact

**5. New Resolvers**
- `readinessNow()`: Fetches v_ivyready_current with factor breakdown
- `readinessProgress()`: Historical timeline from feature_snapshots
- `readinessDrivers()`: Factor-level feature contributions from v_factor_scores_current
- `readinessWhatIfSAT()`: Simulates SAT changes (simplified version)
- `readinessWhatIfAward()`: Simulates award wins (simplified version)
- `readinessNextMoves()`: Recommends actions based on weakest factors

**Testing:**
- Readiness Now: "what's my readiness score?" → current score + tier + factor breakdown
- Progress: "how has my readiness changed?" → timeline of snapshots
- Drivers: "what's driving my readiness?" → factor-level feature analysis
- What-If SAT: "what if I raise my SAT to 1500?" → projected delta
- What-If Award: "what if I win a national award?" → projected delta
- Next Moves: "what should I do to improve?" → ranked action recommendations
- Verified with student_id: huda-2025

**Migration Required:** Yes (v3.7 schema + 4 view files + seed data)
- `2025-10-03-v3.7-universal-readiness-schema.sql` (5 tables: feature_defs, factor_defs, factor_feature_map, feature_snapshots, action_defs, action_feature_effects, factor_defs)
- `2025-10-03-v3.7.1-feature-views.sql` (7 views: v_features_testing, v_features_awards, v_features_ecs, v_features_narrative, v_features_academics, v_features_programs, v_features_all)
- `2025-10-03-v3.7.2-scoring-views.sql` (3 views: v_factor_scores_current, v_ivyready_current, v_feature_snapshots_timeline)
- `2025-10-03-v3.7.3-whatif-views.sql` (3 views: v_action_effects_current, v_action_ivyready_delta, v_recommended_next_moves)
- `2025-10-03-v3.7.4-seed-data.sql` (seed data: 14 features, 20+ factor mappings, 6 actions, 10+ effect models)

**Breaking Changes:** None (additive layer above v3.5 IvyReady Snapshots)

**Design Rationale:**
- **Composability**: Features → Factors → Overall score (modular layers)
- **Transparency**: Full feature breakdown shows exactly why score is what it is
- **Actionability**: What-if engine enables "if I do X, my score becomes Y"
- **Rubric Flexibility**: Easily swap rubrics (ivyplus_v1, state_schools_v1, etc.) without changing schema
- **Temporal Support**: Feature snapshots enable historical trend analysis

**Key Differences from v3.5 IvyReady Snapshots:**
- **v3.5**: Manual rubric scores stored as snapshots (point-in-time, no decomposition)
- **v3.7**: Auto-computed from features with full factor decomposition + what-if simulation

---

#### [2025-10-03 20:00] GamePlan v2 + IvyReady Rubric + Common App (v3.4.1)
**Author:** Platform Team

**Files Changed:**
- `apps/api/db/migrations/2025-10-03-v3.4-rubric-gameplan-commonapp.sql` (new)
- `apps/api/db/migrations/2025-10-03-v3.4-huda-complete-profile.sql` (new seed data)
- `apps/api/db/migrations/2025-10-03-v3.4.1-dedup-normalization-fixes.sql` (new fixes)
- `services/jenny-api/src/router/intentRouter.ts` (updated with 4 new intents + phase detection)
- `services/jenny-api/src/services/resolvers.ts` (added 4 new resolvers)

**Changes (v3.4):**
- **Admissions Rubric System**: Ivy+ 6-factor weighted scoring (academics 32%, testing 12%, ECs 24%, awards 12%, narrative 15%, context 5%)
- **IvyReady Score**: Temporal snapshots (assessment, midpoint, final_submit) with factor breakdown
- **GamePlan v2**: Initial targets synthesis (narrative + awards + ECs + programs) from assessment phase
- **GamePlan vs Execution**: Unified progression timeline (initial → execution → outcomes) across all domains
- **Common App Template**: Normalized views for activities (max 10), honors (max 5), academics
- **New Intent Types**: gameplan.initial, gameplan.vs_progress, application.final, ivyready.score
- **New Resolvers**: gamePlanInitial(), gamePlanVsExecution(), commonAppSubmitted(), ivyReadyScore()

**Changes (v3.4.1):**
- **Canon Label Deduplication**: canon_label() function for normalizing award/EC labels (lowercase + whitespace)
- **Initial Awards Dedupe**: v_awards_initial now uses DISTINCT ON canonical label
- **Common App Honors Null Filter**: v_commonapp_honors excludes rows with NULL award_name/title
- **Common App Activities Dedupe**: v_commonapp_activities collapses near-duplicates, prefers role-prefixed titles
- **IvyReady Phase Views**: v_rubric_scores_phase_latest for phase-specific scores
- **IvyReady As-Of Function**: v_rubric_scores_asof() for temporal rubric queries
- **Intent Router Phase Detection**: Enhanced with "initial IvyReady score" → phase:"initial" (maps to assessment)
- **Resolver Phase Support**: ivyReadyScore() now accepts phase parameter with mapping (initial→assessment, final→final_submit)

**Testing:**
- GamePlan: "show my gameplan" → initial targets (narrative + awards + ECs + programs)
- Progression: "gameplan vs execution" → timeline from targets to outcomes
- Common App: "show my Common App submission" → normalized final template
- IvyReady: "what's my IvyReady score?" → all snapshots with factor breakdown
- IvyReady Phase: "what was my initial IvyReady score?" → assessment phase only (69.43/100)
- IvyReady Final: "what's my final IvyReady score?" → final_submit phase only (90.56/100)
- Verified with student_id: huda-2025

**Migration Required:** Yes (v3.4 + v3.4.1)
- `2025-10-03-v3.4-rubric-gameplan-commonapp.sql` (rubric tables, GamePlan views, Common App views)
- `2025-10-03-v3.4-huda-complete-profile.sql` (seed data: sources, targets, outcomes, SAT, rubric scores)
- `2025-10-03-v3.4.1-dedup-normalization-fixes.sql` (dedup fixes, phase views, as-of function)

**Breaking Changes:** None (additive only)

---

#### [2025-10-03] GPT-5 Intent Router (v3.3)
**Author:** Platform Team

**Files Changed:**
- `services/jenny-api/src/router/intentRouter.ts` (new)
- `services/jenny-api/src/server-utfa.ts` (updated)
- `apps/test-chat-ui/lib/api.ts` (updated endpoint)

**Changes:**
- Implemented 4-tier intent routing architecture
- Added GPT-5 Intent Router as primary entry point
- Unified enumeration, temporal facts, canonical facts, and RAG routing
- Added trace storage for UI visualization

**Testing:**
- Enumeration: "list my initial awards" → deterministic SQL
- Temporal: "what was my first SAT score?" → UTFA
- Canonical: "what's my GPA?" → canonical facts
- RAG: "how should I prepare for interviews?" → hybrid RAG

**Migration Required:** No
**Breaking Changes:** None (backwards compatible)

---

#### [2025-10-03] Universal Temporal Facts Architecture (UTFA)
**Author:** Platform Team

**Files Changed:**
- `services/jenny-api/src/services/temporalFacts.ts` (new)
- `apps/api/db/migrations/2025-10-02-utfa-universal-temporal.sql` (new)

**Changes:**
- Implemented UTFA with 6 temporal operators
- Added SQL functions: fact_first, fact_latest, fact_nth, fact_asof, fact_series, fact_superscore
- Integrated with orchestrator for automatic temporal query routing
- Added NLP intent extraction for temporal keywords

**Testing:**
- "What was my first SAT score?" → 1450 (3/15/2024)
- "Show me all my SAT scores" → list of 3 attempts
- "What's my SAT superscore?" → 1560 (best sections)

**Migration Required:** Yes (run UTFA migration)
**Breaking Changes:** None

---

#### [2025-10-03] Universal Enumerations
**Author:** Platform Team

**Files Changed:**
- `apps/api/db/migrations/2025-10-03-universal-enumerations.sql`
- `services/jenny-api/src/resolvers/enums.ts`

**Changes:**
- Created v_awards_initial, v_awards_won, v_awards_progression views
- Created v_ecs_initial, v_ecs_final, v_ecs_progression views
- Created v_programs_initial, v_programs_submitted, v_programs_final views
- Added academics views (transcript, GPA)
- Unified enumeration resolver

**Migration Required:** Yes
**Breaking Changes:** Replaced prior enumeration views

---

**End of Master Technical Specification**

---

## Appendix: Query Examples

### 1. Enumeration Queries

```
User: "List my initial awards"
Route: enumeration → awards.initial
SQL: SELECT * FROM v_awards_initial WHERE student_id = 'huda-2025'
Answer: "1. National Merit Semifinalist — national\n2. USACO Silver — regional"
Model: deterministic-sql
```

---

### 2. Temporal Fact Queries

```
User: "What was my first SAT score?"
Route: temporal_fact → UTFA
SQL: SELECT * FROM fact_first('huda-2025', 'sat_total_score')
Answer: "Your first SAT total score was 1450 (3/15/2024, official)"
Model: utfa
```

---

### 3. Canonical Fact Queries

```
User: "What's my GPA?"
Route: canonical_fact
SQL: SELECT * FROM vital_facts WHERE student_id='huda-2025' AND kind='gpa_weighted' ORDER BY fact_date DESC LIMIT 1
Answer: "Your GPA is 4.2 weighted"
Model: canonical_facts
```

---

### 4. RAG Queries

```
User: "How should I prepare for college interviews?"
Route: rag → hybrid_search → llm_compose
Flow: Pinecone (jtbd + interactions) + Lexical → Rerank → GPT-4o-mini
Answer: "Based on your profile, here's how to prepare for interviews..."
Model: gpt-4o-mini
```

---

## Maintenance Guide

### Adding New Intent Routes

1. **Define intent pattern** in `intentRouter.ts`
2. **Create resolver** in `src/resolvers/`
3. **Add SQL view/function** if needed
4. **Test with sample queries**
5. **Update this doc**

### Adding New Fact Kinds

1. **Add to fact_kinds reference table**
```sql
INSERT INTO fact_kinds (kind, description)
VALUES ('psat_selection_index', 'PSAT/NMSQT Selection Index');
```

2. **Add to FACT_KINDS lexicon** in `temporalFacts.ts`
```typescript
const FACT_KINDS = {
  // ...
  'psat': 'psat_selection_index'
};
```

3. **Test temporal queries**

### Database Migrations

1. **Create migration file** in `apps/api/db/migrations/`
2. **Run migration**
```bash
psql $DATABASE_URL < apps/api/db/migrations/2025-XX-XX-feature-name.sql
```
3. **Update DB_ARCHITECTURE_SPEC.md**
4. **Update this doc**

---

**Document Version:** 1.0
**Last Updated:** 2025-10-03
**Next Review:** When v3.4 ships

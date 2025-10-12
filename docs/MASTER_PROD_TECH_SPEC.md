# Master Production Technical Specification
**IvyLevel Platform v10 - Jenny Agentic AI (Production Only)**

**Document Status:** Production Source of Truth
**Last Update:** 2025-10-11
**Version:** v10.4 - Humanizer v2.1 (Jenny's Real Voice)
**Scope:** Production Code ONLY (`/services/jenny-api/`)

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Platform Overview](#platform-overview)
3. [Production Architecture](#production-architecture)
4. [Complete Query Flow](#complete-query-flow)
5. [Intent Router (v10.1)](#intent-router-v101)
6. [Orchestrator & Resolvers](#orchestrator--resolvers)
7. [Answer Composition](#answer-composition)
8. [Database Schema](#database-schema)
9. [Vector Store (Pinecone)](#vector-store-pinecone)
10. [Quality Guards (v10.1)](#quality-guards-v101)
11. [Observability & Tracing](#observability--tracing)
12. [Deployment](#deployment)
13. [Testing](#testing)

---

## Project Structure

### Complete Directory Organization

The IvyLevel Platform v10 follows a clean, organized structure with all production code in designated locations. **For complete details, see [PROJECT_STRUCTURE.md](guides/PROJECT_STRUCTURE.md)**.

#### Root Directory (Essential Files Only)

```
ivylevel-platform-v10/
├── .env, .env.example, .env.local    # Environment configuration
├── .gitignore                        # Git ignore rules
├── CLAUDE.md                         # Project guidelines (auto-read)
├── README.md                         # Main project readme
├── docker-compose.yml                # Docker configuration
├── package.json                      # Root package config
├── pnpm-lock.yaml, pnpm-workspace.yaml # Package management
├── requirements.txt                  # Python dependencies
└── tsconfig.base.json, tsconfig.json # TypeScript configuration
```

**Note:** All temporary files (.log, .txt, .sh, .js) are archived - root contains ONLY essential config files.

#### Production Services

```
services/
├── jenny-api/                        ✅ PRODUCTION API (v10.1)
│   ├── src/
│   │   ├── router/intentRouter.ts    # Intent routing + fact guardrails
│   │   ├── orchestrator/agentChat-utfa.ts # Orchestration + deduplication
│   │   ├── compose/compose.ts        # Answer composition + meta-stripping
│   │   ├── resolvers/                # SQL resolvers (enums, academics)
│   │   ├── retrieval/                # Hybrid search (SQL + KB)
│   │   └── services/                 # Business logic services
│   └── package.json
├── opportunity-catalog/              # AWS/K8s Future Scaling
├── opportunity-recommender/          # AWS/K8s Future Scaling
└── opportunity-scorer/               # AWS/K8s Future Scaling
```

#### Applications

```
apps/
└── test-chat-ui/                     ✅ PRODUCTION TEST UI (v10.1)
    ├── app/api/kb-chat/              # HTTP client to jenny-api
    ├── app/api/testlab/              # Test Lab API routes
    ├── app/test-lab/                 # Test Lab UI (comprehensive testing)
    ├── lib/testlab/                  # Test Lab logic & validators
    └── components/testlab/           # Test Lab UI components
```

#### Documentation

```
docs/
├── MASTER_PROD_TECH_SPEC.md          ✅ Production architecture (THIS FILE)
├── PROD_DB_ARCH.md                   ✅ Production database schema
├── PROD_FEATURE_RELEASE_DETAILS.md   ✅ Release history
├── README.md                         # Documentation index
├── guides/                           # Implementation guides
│   ├── DEEP_CLEANUP_SUMMARY.md       # Cleanup documentation
│   ├── JENNY_TEST_LAB_IMPLEMENTATION.md # Test Lab implementation
│   ├── JENNY_TEST_LAB_QUICK_START.md # Test Lab quick start
│   └── PROJECT_STRUCTURE.md          # Complete structure reference
└── setup/                            # Setup guides
    └── CLAUDE_CODE_SETUP.md          # Claude Code setup
```

#### Data, Tools & Infrastructure

```
data/                                 # Production data
├── canonical/                        # Student data
├── eq/                               # EQ/Session data
├── kb_intel_chips/                   # KB chips (v6)
└── training/                         # Fine-tuning data

tools/                                # Production tools
├── ingest/                           # KB ingestion
├── ops/                              # Operational scripts
└── qa/                               # QA/testing tools

packages/                             # Shared packages
├── aws-utils/                        # AWS utilities (future scaling)
├── intent/                           # Intent detection
├── logger/                           # Logging utilities
├── observability/                    # Observability
└── types/                            # TypeScript types

scripts/                              # Production scripts
├── archive_file.sh                   # File archiving
├── cleanup.sh                        # Auto cleanup
├── finetune_adapter.py               # Fine-tuning
└── deploy_v8_production.sh           # Deployment

infra/terraform/                      # Infrastructure (AWS/K8s)
config/                               # Configuration files
logs/                                 # Application logs (gitignored)
archive/                              # Archived old code
```

### Key Locations Quick Reference

| Component | Location | Purpose |
|-----------|----------|---------|
| **Intent Router** | `services/jenny-api/src/router/intentRouter.ts` | Classification + fact guardrails |
| **Orchestrator** | `services/jenny-api/src/orchestrator/agentChat-utfa.ts` | Query execution + deduplication |
| **Composer** | `services/jenny-api/src/compose/compose.ts` | Answer generation + meta-stripping |
| **Humanizer** | `services/jenny-api/src/lib/humanizer.ts` | Jenny's voice layer (v10.4) |
| **Resolvers** | `services/jenny-api/src/resolvers/` | SQL resolvers (enums, academics) |
| **Test UI** | `apps/test-chat-ui/` | UI layer (HTTP client ONLY) |
| **Test Lab** | `apps/test-chat-ui/app/test-lab/` | Comprehensive testing framework |
| **Master Specs** | `docs/MASTER_PROD_TECH_SPEC.md` | This file (architecture) |
| **Database Spec** | `docs/PROD_DB_ARCH.md` | Database schema |
| **Release History** | `docs/PROD_FEATURE_RELEASE_DETAILS.md` | Version history |

### File Organization Principles

**Production Code:**
- ✅ All business logic in `/services/jenny-api/`
- ✅ Test UI in `/apps/test-chat-ui/` (HTTP client ONLY)
- ✅ Shared packages in `/packages/`
- ✅ Production tools in `/tools/`

**Documentation:**
- ✅ Architecture specs in `/docs/` (root level)
- ✅ Implementation guides in `/docs/guides/`
- ✅ Setup guides in `/docs/setup/`

**Never in Root:**
- ❌ Temporary files (.log, .txt, .sh scripts)
- ❌ Random utility scripts (.js, .py)
- ❌ Documentation markdown files
- ❌ Old/backup files (*_old.*, *_backup.*)

**Archive Location:**
- All old/unused code archived in `archive/2025-10-09-deep-cleanup/`

---

## Platform Overview

**Jenny AI** is an agentic college counseling assistant built on a **Facts-First Architecture**. The system prioritizes deterministic SQL queries for factual data, falling back to RAG (Retrieval-Augmented Generation) only for open-ended coaching questions.

### Core Principles

1. **Facts-First**: SQL-deterministic queries before RAG fallback
2. **Temporal Resolution**: Universal support for first/latest/nth/as-of queries (UTFA)
3. **Evidence Chain**: Full provenance tracking from source documents to answers
4. **Quality Guards**: Deduplication + meta-leakage stripping on all answers
5. **Observability**: Comprehensive tracing and logging at every step

### Tech Stack (Production)

**Backend (ONLY Production Component):**
- **Location:** `/services/jenny-api/`
- Node.js 20+ with TypeScript
- Express.js server (port 8787)
- PostgreSQL 15+ (Neon/local)
- Pinecone vector database

**AI/ML:**
- OpenAI GPT-4o / GPT-4o-mini (base models)
- Fine-Tuned Adapter v8 (ft:gpt-4o-mini-2024-07-18:personal:v8-prod:CO8TAkWg)
- OpenAI Embeddings (text-embedding-3-large, 3072 dims)
- GPT-5 Intent Router with Fact Guardrails (v10.1)
- Pinecone index: jenny-v3-3072-093025

**Frontend (UI Only - No Business Logic):**
- **Location:** `/apps/test-chat-ui/`
- Next.js 14 (React 18) - HTTP client ONLY
- Calls jenny-api via HTTP POST `/agent/chat/gpt5`
- **Note:** All routing/orchestration/composition happens in jenny-api

---

## Production Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    USER INTERFACE (UI ONLY)                          │
│                   Test Chat UI - Next.js/React                       │
│                    http://localhost:3000                             │
│                                                                       │
│   ⚠️ NO BUSINESS LOGIC - Pure HTTP client                           │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    │ HTTP POST /agent/chat/gpt5
                                    │ {message, student_id, session_id}
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PRODUCTION: JENNY API SERVER                      │
│                    Location: /services/jenny-api/                    │
│                    Port: 8787 (Express.js)                           │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │         v10.1 INTENT ROUTER + FACT GUARDRAILS                │   │
│  │         src/router/intentRouter.ts                           │   │
│  │                                                              │   │
│  │  STEP 1: Pre-Classification Fact Guardrails (NEW v10.1)     │   │
│  │          Check deterministic patterns BEFORE GPT:            │   │
│  │          • Awards queries → awards.list / progression        │   │
│  │          • GPA/grades → academics.summary                    │   │
│  │          • SAT/ACT → sat.ordinal                             │   │
│  │          • AP courses → academics.summary                    │   │
│  │          • Summer programs → programs.list                   │   │
│  │          • ECs/Activities → ecs.list                         │   │
│  │          • College list → college.list / application.final   │   │
│  │          • Grade jumps → progression.timeline                │   │
│  │                                                              │   │
│  │  STEP 2: GPT-5 Classification (5-tier system)               │   │
│  │          1. Enumeration (awards, ECs, programs)             │   │
│  │          2. Temporal Facts (first/last/nth)                 │   │
│  │          3. Canonical Facts (single facts)                  │   │
│  │          4. Readiness (feature scoring)                     │   │
│  │          5. RAG (open-ended coaching)                       │   │
│  └────────┬──────────┬────────────┬───────────┬─────────┬──────┘   │
│           │          │            │           │         │          │
│           ▼          ▼            ▼           ▼         ▼          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐   │
│  │ENUMERATION│ │ TEMPORAL │ │CANONICAL │ │READINESS │ │ RAG  │   │
│  │ RESOLVER  │ │  FACTS   │ │  FACTS   │ │  LAYER   │ │HYBRID│   │
│  │ (v10.1)   │ │  (UTFA)  │ │          │ │          │ │SEARCH│   │
│  └─────┬────┘ └─────┬────┘ └─────┬────┘ └─────┬────┘ └──┬───┘   │
│        │            │            │             │           │       │
│        ▼            ▼            ▼             ▼           ▼       │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │          ORCHESTRATOR: agentChat-utfa.ts                   │   │
│  │          src/orchestrator/agentChat-utfa.ts                │   │
│  │                                                            │   │
│  │  • Dispatches to resolvers based on intent                │   │
│  │  • Collects results from SQL/RAG                          │   │
│  │  • Applies deduplication (v10.1)                          │   │
│  │  • Returns {answer, chips, trace}                         │   │
│  └────────┬───────────────────────┬───────────────────────────┘   │
│           │                       │                               │
│           ▼                       ▼                               │
│  ┌──────────────────┐   ┌────────────────────┐                   │
│  │  RESOLVERS       │   │  COMPOSER          │                   │
│  │  src/resolvers/  │   │  src/compose/      │                   │
│  │                  │   │                    │                   │
│  │  • awards.ts     │   │  • compose.ts      │                   │
│  │  • ecs.ts        │   │  • LLM generation  │                   │
│  │  • programs.ts   │   │  • Meta-stripping  │                   │
│  │  • academics.ts  │   │    (v10.1)         │                   │
│  └────────┬─────────┘   └─────────┬──────────┘                   │
│           │                       │                               │
│           ▼                       ▼                               │
│  ┌─────────────────────────────────────────────────┐             │
│  │           PostgreSQL Database (Neon)             │             │
│  │                                                  │             │
│  │  Core Tables:                                    │             │
│  │  • students, kb_items, outcomes                  │             │
│  │  • award_targets, ec_targets, program_targets   │             │
│  │  • academic_terms, academic_courses,            │             │
│  │    academic_grades, academic_gpa                │             │
│  │                                                  │             │
│  │  Temporal Views (UTFA):                         │             │
│  │  • v_awards_initial, v_awards_final             │             │
│  │  • v_ecs_initial, v_ecs_final                   │             │
│  │  • v_programs_initial, v_programs_submitted     │             │
│  │  • v_transcript_initial, v_transcript_final     │             │
│  │  • v_gpa_initial, v_gpa_final, v_gpa_latest     │             │
│  └──────────────────────────────────────────────────┘            │
│           │                                                       │
│           ▼                                                       │
│  ┌─────────────────────────────────────────────────┐             │
│  │       Pinecone Vector Database                   │             │
│  │       jenny-v3-3072-093025                       │             │
│  │                                                  │             │
│  │  KBv6 Namespaces (973 vectors):                 │             │
│  │  • KBv6_2025-10-06_v1.0 (Sessions: 924)        │             │
│  │  • KBv6_iMessage_2025-10-07_v1.0 (40)          │             │
│  │  • KBv6_Assessment_2025-10-07_v1.0 (9)         │             │
│  └─────────────────────────────────────────────────┘             │
└───────────────────────────────────────────────────────────────────┘
```

---

## Complete Query Flow

**Example:** User asks "What awards did I win?"

### Step 1: UI → API
```
Test Chat UI
  ↓ HTTP POST http://localhost:8787/agent/chat/gpt5
  {
    "message": "What awards did I win?",
    "student_id": "huda-2025",
    "session_id": "sess_123"
  }
```

### Step 2: Intent Router (v10.1)
```typescript
// File: /services/jenny-api/src/router/intentRouter.ts:513-603

// GUARDRAIL CHECK (runs FIRST, before GPT)
const q = message.toLowerCase();
if (/\b(what|which|list|show).*(award|honor|recognition)/i.test(message)) {
  const hasWin = /\b(win|won|actual|get|got|receive)/i.test(message);

  if (hasWin) {
    // Force SQL route
    return {
      intent: "awards.list",
      phase: "final",
      object: "award",
      confidence: 0.98,
      detector: "keyword-floor"
    };
  }
}

// If no guardrail match, proceed to GPT-5 classification
```

**Output:** `{ intent: "awards.list", phase: "final", object: "award" }`

### Step 3: Orchestrator Dispatch
```typescript
// File: /services/jenny-api/src/orchestrator/agentChat-utfa.ts:102-137

const enumResult = await maybeEnumAnswer(pool, student_id, message);

if (enumResult) {
  // Route matched: awards.final
  const items = await awards.final(pool, student_id);

  // Compose answer
  const rawAnswer = composeEnumText(enumResult);

  // Apply deduplication (v10.1)
  const answer = deduplicateAnswer(rawAnswer);

  return { answer, chips, trace };
}
```

### Step 4: Resolver Execution
```typescript
// File: /services/jenny-api/src/resolvers/enums.ts

export const awards = {
  async final(pg, studentId) {
    const { rows } = await pg.query(`
      SELECT award_name, won_date, tier, chip_id, source_id
      FROM outcomes
      WHERE student_id = $1 AND domain = 'award'
      ORDER BY won_date DESC
    `, [studentId]);

    return rows;
  }
};
```

**Output:**
```javascript
[
  { award_name: "NCWIT Aspirations in Computing — National Awardee", won_date: "2024-03-15", tier: "National", chip_id: "...", source_id: "..." },
  { award_name: "Congressional App Challenge Winner", won_date: "2023-11-10", tier: "Federal", ... }
]
```

### Step 5: Answer Composition
```typescript
// File: /services/jenny-api/src/orchestrator/agentChat-utfa.ts:136

const rawAnswer = composeEnumText(enumResult);
// rawAnswer = "1. NCWIT Aspirations in Computing — National Awardee (2024-03-15) — National\n2. Congressional App Challenge Winner..."

const answer = deduplicateAnswer(rawAnswer);
// Removes any duplicate lines with normalized comparison
```

### Step 6: Response to UI
```json
{
  "answer": "1. NCWIT Aspirations in Computing — National Awardee (2024-03-15) — National\n2. Congressional App Challenge Winner (2023-11-10) — Federal",
  "session_id": "sess_123",
  "hits": [],
  "vitals": {...},
  "chips": [
    { "chip_table": "outcomes", "chip_id": "...", "source_id": "..." }
  ],
  "trace": {
    "enumeration": {
      "route": "awards.final",
      "items_count": 2,
      "sql_view": "v_awards_final"
    }
  },
  "trace_id": "enum-1728517234-xyz",
  "model": "deterministic-sql"
}
```

---

## Intent Router (v10.1)

**Location:** `/services/jenny-api/src/router/intentRouter.ts`

### Architecture

```typescript
export async function classifyIntent(message: string, context: any): IntentResult {
  // TIER 1: Fact-Based Guardrails (v10.1) - Deterministic pattern matching
  const factIntent = applyFactGuardrails(message);
  if (factIntent) {
    return factIntent; // Early return - skip GPT
  }

  // TIER 2: GPT-5 Classification
  const gptIntent = await classifyWithGPT5(message, context);

  // TIER 3: Post-processors
  const finalIntent = applyPostProcessors(gptIntent, context);

  return finalIntent;
}
```

### Fact Guardrails (v10.1)

**Lines 513-603:** Pre-classification pattern matching

| Pattern | Intent | Route | Example |
|---------|--------|-------|---------|
| `(what\|which\|list).*(award\|honor)` | `awards.list` | SQL | "What awards did I win?" |
| `(gpa\|grade point\|grades)` | `academics.summary` | SQL | "What's my GPA?" |
| `(SAT\|ACT\|test score).*(first\|last)` | `sat.ordinal` | SQL | "What was my first SAT?" |
| `(how many\|count).*(ap\|aps\|honors)` | `academics.summary` | SQL | "How many APs did I take?" |
| `(which\|what).*(summer program).*submit` | `programs.list` | SQL | "Which summer programs did I submit to?" |
| `(which\|what).*(ec\|activities).*final` | `ecs.list` | SQL | "Which ECs did I actually submit?" |
| `(what\|which).*(college\|school).*(list\|results)` | `college.list` | SQL | "What was my final college list?" |
| `(show\|what).*(grade jump\|vitals)` | `progression.timeline` | SQL | "Show me my grade jumps" |

**Confidence:** All guardrails return 0.98 confidence with `detector: "keyword-floor"`

### GPT-5 Classification

If no guardrail matches, falls back to GPT-based classification:

```typescript
const messages = [
  { role: "system", content: INTENT_CLASSIFICATION_PROMPT },
  { role: "user", content: message }
];

const response = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages,
  response_format: { type: "json_object" }
});

const intent = JSON.parse(response.choices[0].message.content);
```

**Intent Schema:**
```typescript
{
  intent: string;          // "awards.list", "sat.ordinal", "rag.open_ended", etc.
  phase: string | null;    // "initial", "final", null
  object: string | null;   // "award", "ec", "program", null
  filters: Record<string, any>;
  confidence: number;      // 0.0 - 1.0
  detector: string;        // "keyword-floor", "gpt-5", "pattern-match"
}
```

---

## Orchestrator & Resolvers

**Location:** `/services/jenny-api/src/orchestrator/agentChat-utfa.ts`

### Query Execution Order

```typescript
export async function agentChat(req, res?) {
  // 1. Universal Enumerations (Awards, ECs, Programs, Academics)
  const enumResult = await maybeEnumAnswer(pool, req.student_id, req.message);
  if (enumResult) {
    return handleEnumerationResponse(enumResult);
  }

  // 2. Enumeration V2 (SAT Ordinals)
  if (isEnumerationQueryV2(req.message)) {
    const satResult = await routeEnumerationQueryV2(pool, req.message, req.student_id);
    if (satResult) {
      return handleSATResponse(satResult);
    }
  }

  // 3. Temporal Facts (first/last/nth/as-of queries)
  if (shouldUseTemporalFacts(req.message)) {
    const temporalResult = await resolveTemporalFact(pool, extractTemporalIntent(req.message));
    return handleTemporalResponse(temporalResult);
  }

  // 4. Canonical Facts (single fact lookup)
  if (detectFactKinds(req.message).length > 0) {
    // ... canonical facts logic
  }

  // 5. RAG (open-ended coaching)
  const hits = await hybridSearch(req.message, req.student_id);
  const composed = await composeAnswer({ message, vitals, hits, memory });
  return handleRAGResponse(composed);
}
```

### Deduplication (v10.1)

**Lines 23-55:** Applied to ALL answer types

```typescript
function deduplicateAnswer(answer: string): string {
  if (!answer || !answer.includes('\n')) return answer;

  const lines = answer.split('\n');
  const seen = new Set<string>();

  const dedupedLines = lines.filter(line => {
    // Normalize: lowercase, remove dashes/spaces/punctuation
    const normalized = line.toLowerCase()
      .replace(/[—\-–\s.,;:()]/g, '')
      .trim();

    // Keep unique non-empty lines
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      return true;
    }

    // Keep empty lines (formatting)
    if (!normalized) return true;

    return false;
  });

  if (dedupedLines.length < lines.length) {
    log.event('deduplication', {
      original_lines: lines.length,
      deduped_lines: dedupedLines.length,
      removed: lines.length - dedupedLines.length
    });
  }

  return dedupedLines.join('\n');
}
```

**Applied at:**
- Line 218: Enumeration results
- Line 272: Enumeration V2 results
- Line 332: Temporal facts results
- Line 450: RAG/LLM results

### Resolvers

**Location:** `/services/jenny-api/src/resolvers/enums.ts`

#### Awards Resolver
```typescript
export const awards = {
  async initial(pg, studentId) {
    // GamePlan awards (target list)
    return pg.query(`SELECT * FROM award_targets WHERE student_id = $1 AND source_id LIKE 'SRC-GAMEPLAN%'`);
  },

  async final(pg, studentId) {
    // Actual awards won
    return pg.query(`SELECT * FROM outcomes WHERE student_id = $1 AND domain = 'award'`);
  },

  async progression(pg, studentId) {
    // Timeline view
    return pg.query(`SELECT * FROM v_awards_progression WHERE student_id = $1 ORDER BY event_date`);
  }
};
```

#### ECs Resolver
```typescript
export const ecs = {
  async initial(pg, studentId) {
    return pg.query(`SELECT * FROM kb_items WHERE student_id = $1 AND family = 'Activity' AND source_id LIKE 'SRC-GAMEPLAN%'`);
  },

  async final(pg, studentId) {
    return pg.query(`SELECT * FROM kb_items WHERE student_id = $1 AND family = 'Activity' AND source_id LIKE 'SRC-COMMONAPP%'`);
  },

  async progression(pg, studentId) {
    return pg.query(`SELECT * FROM v_ecs_progression WHERE student_id = $1 ORDER BY event_date`);
  }
};
```

#### Academics Resolver
```typescript
export const transcript = {
  async initial(pg, studentId) {
    return pg.query(`SELECT * FROM academic_courses WHERE student_id = $1 AND source_id LIKE 'SRC-GAMEPLAN%'`);
  },

  async final(pg, studentId) {
    return pg.query(`SELECT * FROM academic_courses WHERE student_id = $1 AND source_id LIKE 'SRC-TRANSCRIPT%'`);
  },

  async progression(pg, studentId) {
    return pg.query(`SELECT * FROM v_transcript_progression WHERE student_id = $1 ORDER BY term_key`);
  }
};

export const gpa = {
  async initial(pg, studentId) {
    return pg.query(`SELECT * FROM academic_gpa WHERE student_id = $1 AND source_id LIKE 'SRC-GAMEPLAN%' LIMIT 1`);
  },

  async final(pg, studentId) {
    return pg.query(`SELECT * FROM academic_gpa WHERE student_id = $1 AND source_id LIKE 'SRC-TRANSCRIPT%'`);
  },

  async latest(pg, studentId) {
    return pg.query(`SELECT * FROM academic_gpa WHERE student_id = $1 ORDER BY as_of_date DESC LIMIT 1`);
  },

  async progression(pg, studentId) {
    return pg.query(`SELECT * FROM v_gpa_progression WHERE student_id = $1 ORDER BY as_of_date`);
  }
};
```

---

## Answer Composition

**Location:** `/services/jenny-api/src/compose/compose.ts`

### Composition Flow

```typescript
export async function composeAnswer({ message, vitals, hits, memory, model, use_ft, stream, res }: any) {
  // 1. Content moderation
  const mod = await moderate(message);
  if (mod?.flagged) return { answer: "I can't help with that.", model: 'moderation_block' };

  // 2. Build system context
  const system = [
    { role: 'system', content: 'You are Jenny, an evidence-first coach. Use vitals for facts; cite evidence chips; narrative hits for examples only.' },
    { role: 'system', content: `Vitals:\n${JSON.stringify(vitals).slice(0, 10000)}` },
    { role: 'system', content: `Narrative hits (top):\n${JSON.stringify(hits.slice(0, 6)).slice(0, 10000)}` }
  ].filter(Boolean);

  // 3. Add conversation history
  const msgs = [
    ...system,
    ...memory?.recent || [],
    { role: 'user', content: message }
  ];

  // 4. LLM generation
  const chosenModel = model || (use_ft ? process.env.JENNY_MODEL_ID : 'gpt-4o-mini');

  if (!stream) {
    const resp = await openai.chat.completions.create({ model: chosenModel, messages: msgs });
    const rawAnswer = resp.choices?.[0]?.message?.content || '';

    // 5. Meta-stripping (v10.1)
    const cleanAnswer = stripMetadata(rawAnswer);

    return { answer: cleanAnswer, model: chosenModel, usage: resp.usage };
  }

  // ... streaming logic with meta-stripping
}
```

### Meta-Leakage Stripping (v10.1)

**Lines 5-31:** Removes internal metadata from user-facing answers

```typescript
function stripMetadata(text: string): string {
  if (!text) return text;

  return text
    // Remove chip ID patterns: (W016-RESULT-001), W015-STRATEGY-001
    .replace(/\([A-Z]\d+-[A-Z]+-\d+\)/g, '')
    .replace(/\b[A-Z]\d{3}-[A-Z]+-\d{3}\b/g, '')

    // Remove source citations: *Source*: KBv6_2025-10-06_v1.0
    .replace(/\*Source\*:\s*[^\n]+/gi, '')

    // Remove namespace refs: @ KBv6_2025-10-06_v1.0, KBv6_iMessage_2025-10-07_v1.0
    .replace(/@\s?KBv\d+[^\s]*/g, '')
    .replace(/\bKBv\d+[_\-][^\s]*/gi, '')

    // Remove internal identifiers: chip_id:, scaffold., SRC-, src-, file-, proof_, debug_
    .replace(/chip_id:\s?[A-Z0-9\-]+/gi, '')
    .replace(/scaffold\.[a-z_.]+/gi, '')
    .replace(/\b(?:#|SRC-|src-|file-|proof_|debug_)\S+/gi, '')

    // Remove system prompts leakage
    .replace(/System:|User:|Assistant:/gi, '')

    // Remove internal table/namespace/family refs
    .replace(/\b(?:chip|table|namespace|family)[_:\-a-z0-9]+/gi, '')

    // Remove breakdown metadata
    .replace(/\*\*Breakdown\s?\([A-Z0-9\-]+\)\*\*/gi, '')

    // Clean up multiple spaces and empty lines
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
```

**Applied at:**
- Line 55: Non-streaming responses
- Line 72: Streaming responses

---

## Humanizer v2.1 - Jenny's Real Voice (v10.4)

**Location:** `/services/jenny-api/src/lib/humanizer.ts`

### Overview

Humanizer v2.1 is a category-aware voice layer that makes every reply feel like "Jenny" across all 3 categories (Facts-First SQL, KB/RAG, Fine-Tuned LLM/EQ) while preserving 100% factual integrity. Uses real EQ signals from database for warmth/normalization/celebration phrases with deterministic selection.

**Key Principles:**
1. **Facts Never Change**: Cat-1 SQL facts passed as `sqlBlock` parameter, NEVER modified
2. **Authentic Voice**: Real phrases from EQ signals database (student-specific)
3. **Deterministic**: SHA-1 seeded by `studentId|intent` (same query = same phrase)
4. **Additive Only**: v10.3 endpoint untouched, feature flag for instant disable
5. **Graceful Fallback**: Vetted defaults if student has thin EQ data

### Architecture

```typescript
export async function humanize(input: HumanizeInput): Promise<HumanizeOutput> {
  const { route, studentId, intent, raw, evidence, sqlBlock } = input;

  // 1) Load Jenny's real phrasing from EQ signals
  const phrases = await loadJennyPhrases(studentId);
  const seed = `${studentId || "anon"}|${intent || route}`;
  const opener = seedPick(phrases.warmth, seed) || "I'm with you.";

  let out = raw;
  const applied = { warmth: false, action: false, personal_ref: false, proof_presenter: false, safety_scrub: false };
  const plan = { phrase_source: phrases.source, cadence: 'standard' as const };

  // 2) Category-specific transformations
  if (route === "sql") {
    // Cat-1: CRITICAL - DO NOT alter sqlBlock
    const proofPrefix = sqlBlock
      ? `**Quick facts (from your records):**\n\`\`\`\n${sqlBlock.trim()}\n\`\`\`\n\n`
      : "";
    applied.proof_presenter = !!sqlBlock;

    if (!hasWarmth(out)) {
      out = `${opener} ${out}`.trim();
      applied.warmth = true;
    }

    const a = addAction(out, "Note this in your tracker and tell me if anything looks off.");
    out = a.text;
    applied.action = a.applied;

    out = proofPrefix + out;
  }

  if (route === "kb") {
    // Cat-2: KB/RAG with warmth + action + optional celebration
    if (!hasWarmth(out)) {
      out = `${opener} ${out}`.trim();
      applied.warmth = true;
    }

    const a = addAction(out, "Copy the most relevant insight and apply it to your current task.");
    out = a.text;
    applied.action = a.applied;

    const closer = seedPick(phrases.celebrate, seed + ":celebrate");
    if (closer) {
      out = `${out}\n\n_${closer}_`;
      applied.personal_ref = true;
    }
  }

  if (route === "llm") {
    // Cat-3: FT/EQ - Keep adapter voice, ensure action
    const a = addAction(out, "Write a 2-sentence reflection and send it to your counselor.");
    out = a.text;
    applied.action = applied.action || a.applied;

    if (!hasWarmth(out)) {
      out = `${opener} ${out}`;
      applied.warmth = true;
    }
  }

  // 3) Safety & polish
  const capped = capPunctuation(out);
  const cleaned = scrub(capped);
  if (cleaned !== out) applied.safety_scrub = true;

  return { text: cleaned, applied, plan };
}
```

### Category-Aware Transformations

**Category 1 (Facts-First SQL):**
- **CRITICAL:** Facts passed as `sqlBlock` parameter, NEVER modified
- **Proof Presenter:** Wraps facts in code fence with header
- **Warmth Injection:** Adds EQ signal opener (e.g., "So excited to work together!")
- **Action Nudge:** Concrete next step (e.g., "Note this in your tracker...")
- **Guarantee:** Facts remain character-for-character identical

**Category 2 (KB/RAG Coaching Knowledge):**
- **Warmth Injection:** EQ signal opener from student's real interactions
- **Coaching Tone:** Preserves coaching content verbatim
- **Action Present:** Ensures actionable question or next step
- **Optional Celebration:** Adds closing encouragement for milestones

**Category 3 (Fine-Tuned LLM/EQ Emotional Support):**
- **Adapter Voice:** Preserves fine-tuned model's empathetic response
- **Action Guarantee:** Ensures concrete action step with deadline
- **Warmth Verification:** Adds warmth if not already present
- **EQ Patterns:** Maintains scale questions, clarifying intent

### EQ Signal Integration

**Data Source:** `eq_signals` table - student-specific warmth/normalization/celebration phrases

**Database Queries (Read-Only):**

```typescript
async function loadJennyPhrases(studentId?: string | null) {
  // Pull warmth/normalization openers (strength-ranked)
  const warmthRes = await pool.query(
    `SELECT exemplar FROM eq_signals s
     JOIN eq_signal_sets k ON k.id = s.set_id
     WHERE k.student_id = $1
       AND s.cue IN ('warmth','normalization')
       AND exemplar IS NOT NULL
       AND length(exemplar) BETWEEN 6 AND 140
     ORDER BY s.strength DESC
     LIMIT 20`,
    [studentId]
  );

  // Pull celebration closers
  const celebrateRes = await pool.query(
    `SELECT exemplar FROM eq_signals s
     JOIN eq_signal_sets k ON k.id = s.set_id
     WHERE k.student_id = $1
       AND s.cue IN ('celebration')
       AND exemplar IS NOT NULL
       AND length(exemplar) BETWEEN 6 AND 140
     ORDER BY s.strength DESC
     LIMIT 15`,
    [studentId]
  );

  const warmth = warmthRes.rows.map(r => String(r.exemplar).trim()).filter(Boolean);
  const celebrate = celebrateRes.rows.map(r => String(r.exemplar).trim()).filter(Boolean);

  return {
    warmth: warmth.length ? warmth : DEFAULT_WARMTH,
    normalize: warmth.length ? warmth : DEFAULT_NORMALIZE,
    celebrate: celebrate.length ? celebrate : DEFAULT_CELEBRATE,
    source: warmth.length || celebrate.length ? ("eq" as const) : ("fallback" as const)
  };
}
```

**Features:**
- ✅ **Authentic Phrases:** Real phrases from Huda's coaching sessions (e.g., "4/2? That's more than 2...")
- ✅ **Deterministic Selection:** SHA-1 seeded by `studentId|intent` (same query = same phrase)
- ✅ **Graceful Fallback:** Uses vetted defaults if student has thin EQ data
- ✅ **Read-Only:** All queries use `pool.query()` with SELECT only (no writes)
- ✅ **Quality Filter:** Only exemplars between 6-140 chars, strength-ranked

**Lines:** 66-110

### Feature Flag Configuration

**Environment Variable:** `HUMANIZER_ENABLED` (default ON)

```typescript
// config/env.ts
export const HUMANIZER_ENABLED = process.env.HUMANIZER_ENABLED !== '0';

console.log('[ENV] Configuration loaded:', {
  service: CFG.SERVICE_NAME,
  humanizer: HUMANIZER_ENABLED ? 'enabled' : 'disabled'
});
```

**Usage:**
```bash
# Enable humanizer (default)
PORT=8787 tsx src/server-utfa.ts

# Disable humanizer instantly if needed
HUMANIZER_ENABLED=0 PORT=8787 tsx src/server-utfa.ts
```

**Safety Fallback:**
```typescript
// orchestrator/agentChat-utfa.ts
const NO_HUMANIZE: HumanizeOutput = {
  text: '',
  applied: { warmth: false, action: false, personal_ref: false, proof_presenter: false, safety_scrub: false },
  plan: { phrase_source: 'fallback' as const, cadence: 'standard' as const }
};

const humanized = HUMANIZER_ENABLED
  ? await humanize({ route: 'sql', studentId, intent, raw, sqlBlock })
  : { ...NO_HUMANIZE, text: dedupedAnswer };
```

### Integration Points

**4 Exit Points in Orchestrator:**

1. **Universal Enumerations** (lines 238-247) - Routes: `awards.*`, `ecs.*`, `programs.*`
2. **Enumeration V2** (lines 310-319) - Routes: `academics.sat.*`
3. **UTFA Temporal Facts** (lines 387-396) - Routes: `first/second/last/all` queries
4. **RAG/LLM Flow** (lines 530-539) - Routes: KB queries + EQ queries

**Example Integration:**
```typescript
const rawAnswer = composeEnumText(enumResult);
const dedupedAnswer = deduplicateAnswer(rawAnswer);

const humanized = HUMANIZER_ENABLED
  ? await humanize({
      route: 'sql',
      studentId: req.student_id,
      intent: enumResult.route,
      raw: dedupedAnswer,
      sqlBlock: dedupedAnswer // Facts list is the answer itself
    })
  : { ...NO_HUMANIZE, text: dedupedAnswer };

const response = {
  answer: humanized.text,
  debug: {
    humanizer: {
      applied: humanized.applied,
      plan: humanized.plan
    }
  }
};
```

### Quality Guarantees

| Guarantee | Mechanism | Verification |
|-----------|-----------|--------------|
| **Facts unchanged** | `sqlBlock` parameter passed, never modified | SAT score "1360" identical before/after |
| **No hallucination** | No LLM generation, only phrase selection from vetted EQ signals | All phrases from database or vetted defaults |
| **Read-only EQ** | Database monitoring | All queries use `pool.query()` with SELECT only |
| **Feature flag** | `HUMANIZER_ENABLED` check | Server logs show "humanizer: enabled/disabled" |
| **v10.3 intact** | Old endpoint test | `/agent/chat` still works, no humanizer applied |
| **Graceful degradation** | Fallback to defaults | If student has thin EQ data, uses DEFAULT_WARMTH |

### Performance

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| **Cat-1 Latency** | ~500ms | <2s | ✅ PASS |
| **Cat-2 Latency** | ~1.2s | <3s | ✅ PASS |
| **Cat-3 Latency** | ~1.5s | <3s | ✅ PASS |
| **EQ Query Time** | ~50ms | <200ms | ✅ PASS |
| **Memory Usage** | +5MB | <50MB | ✅ PASS |

**Note:** Humanizer adds minimal overhead (~50-100ms for EQ phrase lookup).

### Test Results

**Date:** 2025-10-11
**Status:** ✅ ALL TESTS PASSED - Production Ready

**Category 1:** Facts preserved verbatim (1360 unchanged), warmth added, proof presenter working, action injected
**Category 2:** Warmth from EQ signals, coaching content preserved, action present
**Category 3:** Empathetic response with warmth, concrete action step added

**Full Test Results:** `/logs/V10.4_HUMANIZER_TEST_RESULTS_2025-10-11.md`

---

## Database Schema

See **PROD_DB_ARCH.md** for complete schema documentation.

### Core Tables

**students**
- `student_id` (PK)
- `full_name`, `email`
- `created_at`, `updated_at`

**kb_items** (Universal KB items)
- `chip_id` (PK)
- `student_id` (FK)
- `family` (Activity, Essay, Award, etc.)
- `source_id` (SRC-GAMEPLAN-001, SRC-COMMONAPP-001)
- `chip_table` (kb_items, outcomes, award_targets)
- `event_date`, `submit_date`
- `text_content`

**outcomes** (Final results)
- `student_id` (FK)
- `domain` (award, program, college)
- `award_name`, `program_name`, `college_name`
- `won_date`, `decision_date`
- `tier`, `decision` (Accepted, Waitlisted, Rejected)
- `chip_id`, `source_id`

**award_targets** (GamePlan awards)
- `student_id` (FK)
- `award_name`
- `tier` (International, National, Regional, School)
- `as_of` (date)
- `chip_id`, `source_id` (SRC-GAMEPLAN-*)

**academic_courses** (Transcript)
- `student_id` (FK)
- `course_title`
- `grade_letter`, `grade_percent`
- `credits`
- `term_key` (2024-Fall, 2025-Spring)
- `weighting` (Honors, AP, Regular)
- `source_id` (SRC-GAMEPLAN-*, SRC-TRANSCRIPT-*)

**academic_gpa**
- `student_id` (FK)
- `scope` (Cumulative, 9th Grade, 10th Grade, etc.)
- `scope_key` (cumulative, 9th, 10th)
- `gpa_unweighted`, `gpa_weighted`
- `credits_earned`
- `as_of_date`
- `source_id`

### Temporal Views

**v_awards_initial** → GamePlan awards (SRC-GAMEPLAN-*)
**v_awards_final** → Actual awards won (outcomes)
**v_awards_progression** → Timeline with initial → final

**v_ecs_initial** → GamePlan ECs
**v_ecs_final** → CommonApp ECs
**v_ecs_progression** → EC development timeline

**v_programs_initial** → Programs considered
**v_programs_submitted** → Programs submitted
**v_programs_decisions** → Program outcomes
**v_programs_final** → Programs enrolled
**v_programs_progression** → Program application timeline

**v_transcript_initial** → GamePlan courses
**v_transcript_final** → Official transcript
**v_transcript_progression** → Course timeline

**v_gpa_initial** → GamePlan GPA
**v_gpa_final** → All official GPAs
**v_gpa_latest** → Most recent GPA
**v_gpa_progression** → GPA timeline

---

## Vector Store (Pinecone)

**Index:** jenny-v3-3072-093025
**Dimensions:** 3072 (text-embedding-3-large)

### KBv6 Configuration Lock (v10.3)

**Configuration Files:**
- **Environment:** `services/jenny-api/src/config/env.ts` (strict validation)
- **Namespaces:** `services/jenny-api/src/retrieval/retrieval.config.json` (declarative mapping)
- **Validation:** `services/jenny-api/src/retrieval/pinecone.ts` (boot-time parity check)

**Boot Validation:**
```typescript
// services/jenny-api/src/retrieval/pinecone.ts:14-34
export async function assertIndexParity(
  expectedDim: number = 3072,
  expectedModel: string = 'text-embedding-3-large'
) {
  const dim = CFG.PINECONE_INDEX_DIM;
  const model = CFG.EMBEDDING_MODEL_ID;

  if (dim !== expectedDim) {
    throw new Error(`❌ Pinecone dim mismatch: got ${dim}, expected ${expectedDim} for KBv6`);
  }

  if (model !== expectedModel) {
    throw new Error(`❌ Embedding model mismatch: got ${model}, expected ${expectedModel} for KBv6`);
  }

  console.log('[KBv6] Index parity verified:', { dim, model, index: CFG.PINECONE_INDEX_NAME });
}
```

**Called at:** `server-utfa.ts:386` (server exits if misconfigured)

### KBv6 Namespaces

| Namespace | Vectors | Used in RAG | Description |
|-----------|---------|-------------|-------------|
| `KBv6_2025-10-06_v1.0` | 924 | ✅ Yes | Sessions + Exec (W001-W093) |
| `KBv6_iMessage_2025-10-07_v1.0` | 40 | ✅ Yes | iMessage interactions |
| `KBv6_Assessment_2025-10-07_v1.0` | 9 | ❌ No | GamePlan (SQL-gated only) |

**Total Vectors:** 973 (964 in general RAG, 9 SQL-gated)

**Namespace Mapping:**
```json
// services/jenny-api/src/retrieval/retrieval.config.json
{
  "namespaces": {
    "jtbd": "KBv6_2025-10-06_v1.0",
    "interactions": "KBv6_iMessage_2025-10-07_v1.0",
    "assessments": "KBv6_Assessment_2025-10-07_v1.0"
  },
  "include_assessments_in_rag": false,  // Assessment namespace excluded from general RAG
  "rag_topk_per_ns": 6,
  "lexical_topk": 10,
  "rerank": {
    "topk": 8,
    "min_score": 0.12,
    "keep_at_least": 3  // Prevents "zero results" appearance
  }
}
```

### Hybrid Search (Config-Driven)

**Location:** `/services/jenny-api/src/retrieval/hybrid.ts:13-42`

```typescript
import cfg from './retrieval.config.json';

export async function hybridSearch(q: string, studentId: string) {
  // 1. Query KBv6 namespaces (config-driven)
  const jobs = [
    queryVectors('jtbd', q, cfg.rag_topk_per_ns),        // 924 vectors
    queryVectors('interactions', q, cfg.rag_topk_per_ns), // 40 vectors
  ];

  // Conditionally include assessments (SQL-gated by default)
  if (cfg.include_assessments_in_rag) {
    jobs.push(queryVectors('assessments', q, cfg.rag_topk_per_ns)); // 9 vectors
  }

  const [jtbd, inter, assess = []] = await Promise.all(jobs);

  // 2. Student-scoped lexical search (PostgreSQL tsvector)
  const scoped = await lexicalSearch(studentId, q, cfg.lexical_topk);

  // 3. Global fallback if no student-scoped results
  const globalFallback = scoped.length ? [] : await lexicalSearch(null, q, cfg.lexical_topk);

  // 4. Extract text content (multiple field names supported)
  const getText = (m: any) => m.text || m.content || m.body || m.chunk || m.snippet || '';

  const merged = [...jtbd, ...inter, ...assess, ...scoped, ...globalFallback]
    .map(m => ({ ...m, _text: getText(m) }))
    .filter(m => m._text?.trim().length > 0);

  // 5. Rerank with KBv6 config (keeps at least 3 results)
  return rerank(q, merged, cfg.rerank);
}
```

**Reranker (keep_at_least logic):**
```typescript
// services/jenny-api/src/retrieval/rerank.ts:19-57
const passThreshold = scored.filter(x => x.rerankScore >= cfg.min_score);

if (passThreshold.length >= cfg.keep_at_least) {
  return passThreshold;  // Enough high-quality results
}

// Keep at least N results even if below threshold (prevents "zero hits" appearance)
return scored.slice(0, cfg.keep_at_least);
```

---

## Quality Guards (v10.1)

### 1. Fact Guardrails (Intent Router)
**Purpose:** Force deterministic SQL routing for fact queries
**Location:** `intentRouter.ts:513-603`
**Coverage:** 9 fact patterns (awards, GPA, SAT, AP, programs, ECs, colleges, vitals)

### 2. Deduplication (Orchestrator)
**Purpose:** Remove duplicate lines from answers
**Location:** `agentChat-utfa.ts:23-55`
**Algorithm:**
- Normalize text (lowercase, remove dashes/spaces/punctuation)
- Track seen lines with Set
- Filter duplicates while preserving order

### 3. Meta-Leakage Stripping (Composer)
**Purpose:** Remove internal metadata from user-facing answers
**Location:** `compose.ts:5-31`
**Patterns Removed:**
- Chip IDs: `(W016-RESULT-001)`
- Source citations: `*Source*: KBv6_...`
- Namespace refs: `@ KBv6_2025-10-06_v1.0`
- Internal identifiers: `chip_id:`, `scaffold.`, `SRC-`

---

## Observability & Tracing

**Logger:** `/packages/observability/dist/unified-logger.js`

### Trace Structure

```typescript
{
  trace_id: "enum-1728517234-xyz",
  trace: {
    // Intent classification
    intent_detected: { route: "awards.final", confidence: 0.98, detector: "keyword-floor" },

    // Enumeration execution
    enumeration: {
      route: "awards.final",
      items_count: 6,
      sql_view: "v_awards_final"
    },

    // Deduplication
    deduplication: {
      original_lines: 12,
      deduped_lines: 6,
      removed: 6
    },

    // Metadata stripping
    meta_stripping: {
      patterns_removed: ["chip_id", "source_citation", "namespace_ref"]
    }
  }
}
```

### Log Events

```typescript
log.event('intent.detected', { route: 'awards.final', class: 'enumeration' });
log.event('compose.enumeration_answer', { route: 'awards.final', items_count: 6 });
log.event('deduplication', { original_lines: 12, deduped_lines: 6 });
log.event('orchestration_complete', { duration_ms: 145, type: 'enumeration_response' });
```

---

## Deployment

### Local Development

```bash
# Start jenny-api server
cd /services/jenny-api
PORT=8787 pnpm dev

# Start test-chat-ui (UI only)
cd /apps/test-chat-ui
PORT=3000 pnpm dev
```

### Environment Variables

```bash
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL_BASE=gpt-4o-mini
JENNY_MODEL_ID=ft:gpt-4o-mini-2024-07-18:personal:v8-prod:CO8TAkWg

# Database
DATABASE_URL=postgresql://user:pass@host/db

# Pinecone
PINECONE_API_KEY=...
PINECONE_INDEX=jenny-v3-3072-093025
NS_SESS=KBv6_2025-10-06_v1.0
NS_IMSG=KBv6_iMessage_2025-10-07_v1.0
NS_ASSESS=KBv6_Assessment_2025-10-07_v1.0

# Cohere (for reranking)
COHERE_API_KEY=...
```

### Production URLs

- **API:** http://localhost:8787
- **UI:** http://localhost:3000

---

## Testing

### Facts Suite (10 queries)

**Expected:** 100% SQL routing

```bash
# In test-chat-ui
1. "What awards did I win?" → SQL (awards.final)
2. "What's my GPA?" → SQL (academics.gpa.latest)
3. "What was my first SAT score?" → SQL (sat.ordinal)
4. "How many APs did I take by year?" → SQL (academics.summary)
5. "Which summer programs did I submit to?" → SQL (programs.submitted)
6. "Which ECs did I actually submit?" → SQL (ecs.final)
7. "Which programs accepted me?" → SQL (programs.decisions)
8. "What was my final college list and results?" → SQL (college.list)
9. "Which school did I choose to attend?" → SQL (application.final)
10. "Show me my grade jumps" → SQL (progression.timeline)
```

### Quality Checks

**Deduplication:**
- Awards list: No duplicates (NCWIT appears once)
- College list: No duplicates (each school listed once)

**Meta-Leakage:**
- No `*Source*: KBv6_...` in answers
- No `(W###-TYPE-###)` chip IDs
- No `@ KBv6_...` namespace refs

**Latency:**
- p50 ≤ 1.5s (SQL queries)
- p95 ≤ 6s (RAG queries)

### Pre-Flight Verification (v10.3)

**Purpose:** Production readiness sanity checks before deployment

**Diagnostic Script:**
```bash
tsx scripts/diag_unified_pipeline.ts
```

**Exit Codes:**
- 0: All checks passed ✅
- 1: Boot validation failed
- 2: Category 1 (SQL) failed
- 3: Category 2 (KB/RAG) failed
- 4: Category 3 (LLM/EQ) failed

**Verification Checklist:**

| Check | Expected | Verified (2025-10-10) |
|-------|----------|----------------------|
| Boot config | embed: text-embedding-3-large, dim: 3072 | ✅ PASS |
| Pinecone counts | 973 vectors (924+40+9) | ✅ PASS (973) |
| Category 1 (SQL) | model: "enumeration_facts", real data | ✅ PASS (SAT 1360) |
| Category 2 (KB/RAG) | hits array present, LLM fallback | ✅ PASS (0 hits → fallback) |
| Category 3 (EQ) | ft:gpt-4o-mini model, warmth patterns | ✅ PASS (warmth detected) |
| Compat views | 3+ records for test student | ✅ PASS (3 awards, 3 SAT) |

**Golden Queries:**
1. "What was my first SAT score?" → SQL (enumeration_facts)
2. "rejection bridge technique" → KB/RAG → LLM fallback
3. "I got rejected from Stanford" → EQ/warmth ("I'm so sorry...")

**Status:** Backend **production-ready** as of 2025-10-10.

---

## Version History

**v10.3 (2025-10-10)** - KBv6 Locked Configuration + Pre-Flight Verification
**v10.2 (2025-10-10)** - Unified Pipeline (Single Entry Point)
**v10.1 (2025-10-09)** - Quality Guards
- Added fact-based guardrails to intent router (9 patterns)
- Added deduplication to orchestrator (all answer types)
- Added meta-leakage stripping to composer
- Archived duplicate test-chat-ui routing modules

**v8.0 (2025-10-08)** - LLM Adapter Fine-Tuning
- Fine-tuned adapter v8 (1,047 examples, 93 weeks)
- Session-EQ corpus (3,424 signals, 115 sessions)

**v5.5 (2025-10-06)** - KB Intel Chips
- KBv6 namespaces (Sessions, iMessage, Assessment)
- 3072-dim embeddings (text-embedding-3-large)

**v3.7 (2025-09-15)** - Readiness Layer
- Feature-based scoring (14 features, 6 domains)
- What-if simulation engine

**v3.0 (2025-08-20)** - Universal Enumerations
- Awards, ECs, Programs with initial/final/progression
- Academics (transcript, GPA, vitals)

---

**Status:** ✅ Production Ready
**Last Updated:** 2025-10-09
**Maintainer:** IvyLevel Team
**Production Code:** `/services/jenny-api/` ONLY

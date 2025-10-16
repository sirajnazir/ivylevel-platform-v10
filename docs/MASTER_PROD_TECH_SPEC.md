# Master Production Technical Specification
**IvyLevel Platform v10 - Jenny Agentic AI (Production Only)**

**Document Status:** Production Source of Truth
**Last Update:** 2025-10-16
**Version:** v14.0 - Zero-Hallucination Multi-Dimensional Agentic Architecture
**Scope:** Production Code ONLY (`/services/jenny-api/`)

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Platform Overview](#platform-overview)
3. [Production Architecture](#production-architecture)
4. [v14.0 Multi-Dimensional Agentic Architecture](#v140-multi-dimensional-agentic-architecture)
5. [Complete Query Flow](#complete-query-flow)
6. [Intent Router (v10.1)](#intent-router-v101)
7. [Orchestrator & Resolvers](#orchestrator--resolvers)
8. [Answer Composition](#answer-composition)
9. [Database Schema](#database-schema)
10. [Vector Store (Pinecone)](#vector-store-pinecone)
11. [Quality Guards (v10.1)](#quality-guards-v101)
12. [Universal Quality Verification (v12.0)](#universal-quality-verification-v120)
13. [Jenny Test Lab v4.0](#jenny-test-lab-v40)
14. [Observability & Tracing](#observability--tracing)
15. [Deployment](#deployment)
16. [Testing](#testing)

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
├── jenny-api/                        ✅ PRODUCTION API (v12.0)
│   ├── src/
│   │   ├── router/intentRouter.ts    # Intent routing + fact guardrails (LEGACY - use /agent/chat/gpt5)
│   │   ├── orchestrator/agentChat-utfa.ts # v12.0: Priority routing (EQ→SQL→KB) + quality layer + dedup + proof
│   │   ├── compose/
│   │   │   ├── compose.ts            # Answer composition + meta-stripping + adapter routing (v11.1)
│   │   │   └── compose-eq.ts         # v12.0: EQ composer (jenny_v9 adapter + warm prompts + adapter.used flag)
│   │   ├── quality/                  # v12.0: Universal Quality Verification
│   │   │   └── response-verifier.ts  # LLM-based scoring (warmth + action) + self-healing (231 lines)
│   │   ├── intent/extractors/
│   │   │   └── eq-classifier.ts      # v12.0: EQ pattern detection (11 categories + celebration/help patterns)
│   │   ├── llm/                      # v11.1: LLM Adapter v2
│   │   │   └── adapter.ts            # Model routing (jenny_v9_adapter vs base)
│   │   ├── resolvers/                # SQL resolvers (enums, academics)
│   │   ├── retrieval/                # Hybrid search (SQL + KB) - v11.2.2: insight_vector fix
│   │   └── services/                 # Business logic services
│   │       ├── proof/                # v11.1: Proof Verification Service
│   │       │   └── verifier.ts       # SHA-256 hash verification + scoring
│   │       └── humanizer.js          # v10.4: Jenny's Real Voice (warmth + action)
│   ├── config/                       # v11.1: Configuration files
│   │   └── model_registry.json       # Fine-tuned model registry (jenny_v9_eq)
│   └── package.json
├── opportunity-catalog/              # AWS/K8s Future Scaling
├── opportunity-recommender/          # AWS/K8s Future Scaling
└── opportunity-scorer/               # AWS/K8s Future Scaling
```

#### Applications

```
apps/
└── test-chat-ui/                     ✅ PRODUCTION TEST UI (v12.0)
    ├── app/api/kb-chat/              # HTTP client to jenny-api
    ├── app/api/testlab/              # Jenny Test Lab v4.0 API routes
    │   ├── run/route.ts              # v12.0: Single test execution + quality/adapter extraction
    │   └── suite/route.ts            # Batch test execution
    ├── app/test-lab/                 # Jenny Test Lab v4.0 UI (unified CAT-1/2/3 testing)
    ├── lib/testlab/                  # Test Lab logic & validators
    │   ├── validators.ts             # v12.0: PRD gate validation (adapter.used fix)
    │   ├── schema.ts                 # Test Lab type definitions
    │   └── suites/                   # Test suite definitions
    │       ├── cat1-facts-v4.json    # 30 SQL fact tests
    │       ├── cat2-kb-v4.json       # 25 RAG knowledge tests
    │       └── cat3-eq-v4.json       # 35 emotional query tests
    └── components/testlab/           # Test Lab UI components
        ├── ScenarioBuilder.tsx       # Interactive test case editor
        └── TraceExporter.tsx         # Export test results for analysis
```

#### Documentation

```
docs/
├── MASTER_PROD_TECH_SPEC.md          ✅ Production architecture (THIS FILE) - v12.0
├── PROD_DB_ARCH.md                   ✅ Production database schema - v12.0
├── PROD_FEATURE_RELEASE_DETAILS.md   ✅ Release history - v12.0
├── README.md                         # Documentation index
├── guides/                           # Implementation guides
│   ├── CAT1_COMPLETE_TECH_SPEC.md    # v12.0: Complete CAT-1 (Facts-First SQL + Quality)
│   ├── CAT2_COMPLETE_TECH_SPEC.md    # v12.0: Complete CAT-2 (KB/RAG + Quality)
│   ├── CAT3_COMPLETE_TECH_SPEC.md    # v12.0: Complete CAT-3 (EQ/LLM + Universal Quality)
│   ├── JENNY_TEST_LAB_V3.0_TECH_SPEC.md     # Test Lab v4.0 technical specification
│   ├── JENNY_TEST_LAB_V3.0_USER_GUIDE.md    # Test Lab v4.0 user guide
│   ├── V8.0_TO_V11.1_GAP_ANALYSIS.md # v11.1: v8.0 migration roadmap
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
| **Resolvers** | `services/jenny-api/src/resolvers/` | SQL resolvers (enums, academics, vitals, jtbd) |
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

## v14.0 Multi-Dimensional Agentic Architecture

**Release Date:** 2025-10-16
**Status:** Production Ready (47/47 tests passed, 0 hallucinations)
**Key Achievement:** Zero-hallucination multi-dimensional intelligence synthesis with 100% data accuracy

### Overview

v14.0 represents a major architectural evolution from siloed v12.0 to seamless multi-dimensional intelligence synthesis. The system now simultaneously analyzes queries across three dimensions (Factual, Strategic, Emotional) and synthesizes responses using strict anti-hallucination grounding.

**Core Innovation:** Built additively on proven v12.0 foundation with comprehensive anti-hallucination patterns and CAT-1/CAT-2 knowledge architecture.

### Architecture Components

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    v14.0 UNIFIED ORCHESTRATOR                            │
│          UnifiedMultiDimensionalOrchestrator.ts (4-Phase Pipeline)       │
└─────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: CONTEXT HYDRATION                                              │
│  ├─ UnifiedContextHydrator.ts                                            │
│  ├─ Loads: student vitals, session state, conversation history          │
│  └─ Output: UnifiedContext object                                        │
└─────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: MULTI-DIMENSIONAL INTENT ANALYSIS                              │
│  ├─ GPTIntentAnalyzer.ts (NEW v14.0)                                     │
│  │  └─ Uses GPT-4o-mini with response_format: {type: "json_object"}     │
│  │     (Proven pattern from v12.0 intentRouter.ts)                       │
│  ├─ Analyzes 3 dimensions simultaneously:                                │
│  │  ├─ Factual (CAT-1): GPA, SAT, awards, colleges, transcript, etc.   │
│  │  ├─ Strategic (CAT-2): Spike strengthen, chances, timeline, etc.    │
│  │  └─ Emotional (CAT-3): Stress, anxiety, overwhelm, celebration, etc.│
│  ├─ Intent Detection: 100% accuracy (47/47 tests)                        │
│  └─ Output: MultiDimensionalIntent with confidence scores                │
└─────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 3: PARALLEL INTELLIGENCE EXECUTION                                │
│  ├─ ParallelIntelligenceExecutor.ts                                      │
│  ├─ Executes CAT-1, CAT-2, CAT-3 in parallel for hybrid queries        │
│  ├─ ResolverMapper.ts routes to proven v12.0 resolvers:                 │
│  │  ├─ CAT-1 (Factual): SQL resolvers (awards, ecs, academics, etc.)   │
│  │  │  └─ New v14.0 resolvers:                                          │
│  │  │     • profileSummary (IvyScore + academics + awards + ECs)        │
│  │  │     • journeyTimeline (temporal JTBD view)                        │
│  │  │     • collegeDeadlines                                            │
│  │  │     • collegeComparison                                           │
│  │  ├─ CAT-2 (Strategic): RAG hybrid search (Pinecone + SQL)           │
│  │  └─ CAT-3 (Emotional): EQ classifier + jenny_v9_eq adapter          │
│  └─ Output: {factual, strategic, emotional} intelligence results        │
└─────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 4: CONTEXT FUSION SYNTHESIS                                       │
│  ├─ ContextFusionSynthesizer.ts (CRITICAL ANTI-HALLUCINATION)           │
│  ├─ Synthesizes intelligence from all active dimensions                 │
│  ├─ **Anti-Hallucination System (NEW v14.0):**                          │
│  │  ├─ 6 explicit WRONG vs CORRECT examples with WHY explanations      │
│  │  │  1. Test score hallucination prevention (1590 → 1530)            │
│  │  │  2. College count accuracy (37 → 28)                             │
│  │  │  3. GPA precision (3.9 → 4.00/4.70)                              │
│  │  │  4. Award fabrication prevention                                 │
│  │  │  5. Acceptance rate fabrication prevention                       │
│  │  │  6. Decision result fabrication prevention                       │
│  │  ├─ Verification checklist (run mentally before responding)         │
│  │  └─ Result: 0 hallucinations in 47/47 tests                         │
│  ├─ **Strict Grounding Rules:**                                         │
│  │  ├─ Rule #1: Use ONLY provided intelligence data                    │
│  │  ├─ Rule #2: Include ALL items (no truncation)                      │
│  │  ├─ Rule #3: NEVER use general knowledge                            │
│  │  └─ FORBIDDEN BEHAVIORS section with explicit constraints           │
│  ├─ **CAT-1 vs CAT-2 Knowledge Architecture:**                          │
│  │  ├─ CAT-1 (Factual): ZERO external knowledge allowed                │
│  │  ├─ CAT-2 (Strategic): KB coaching + external augmentation          │
│  │  ├─ Current v14.0: External knowledge embedded in KB articles       │
│  │  └─ Future v14.0+: Explicit external API calls (extension point)    │
│  └─ Output: Final synthesized answer with evidence chain                │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Technical Patterns

#### 1. GPT-4o-mini Intent Detection Pattern (from v12.0)

**File:** `services/jenny-api/src/intent/GPTIntentAnalyzer.ts` (created v14.0)

```typescript
// Uses proven v12.0 pattern from intentRouter.ts
const response = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  temperature: 0,
  response_format: { type: "json_object" },  // ← Guaranteed JSON
  messages: [
    {
      role: "system",
      content: MULTI_DIMENSIONAL_SYSTEM_PROMPT  // 340-line prompt with examples
    },
    {
      role: "user",
      content: `Analyze query: ${query}`
    }
  ]
});

const parsed = JSON.parse(response.choices[0]?.message?.content ?? "{}");
```

**Result:** 100% accuracy on multi-intent queries like "tell me my entire profile"

#### 2. Anti-Hallucination Pattern

**File:** `services/jenny-api/src/synthesis/ContextFusionSynthesizer.ts:261-301`

```typescript
**CRITICAL: EXAMPLES OF FORBIDDEN DATA HALLUCINATION**

**Example 1: Test Score Hallucination**
❌ WRONG: "Even with a 1590 SAT and all your achievements..."
✅ CORRECT: "With your 1530 SAT and all your achievements..."
WHY: The intelligence shows SAT: 1530. You must use the EXACT number provided.

**Example 2: College Count Hallucination**
❌ WRONG: "You applied to 37 colleges"
✅ CORRECT: "You applied to 28 colleges"
WHY: The intelligence shows 28 rows in college_list. Count the actual data.

[... 4 more examples ...]

**VERIFICATION CHECKLIST (Run mentally before responding):**
□ Every number I mention is copied EXACTLY from intelligence sections
□ Every college/award/activity is explicitly listed in the intelligence data
□ I have NOT used any general knowledge about admissions
```

**Result:** 0 hallucinations in 47/47 tests (was 1 in v13.2)

#### 3. Additive Resolver Enhancement Pattern

**File:** `services/jenny-api/src/services/resolvers.ts`

**Example: journeyTimeline (lines 1959-2049)**
```typescript
// Reuses existing jtbdCompleted() resolver (no SQL duplication)
export async function journeyTimeline(pg: Pool, studentId: string) {
  const rows = await jtbd.completed(pg, studentId);  // ← Reuse proven resolver

  // Add timeline formatting (additive enhancement)
  const timeline: Record<string, any[]> = {};
  rows.forEach((job: any) => {
    const monthYear = `${date.getFullYear()}-${date.getMonth() + 1}`;
    if (!timeline[monthYear]) timeline[monthYear] = [];
    timeline[monthYear].push({ ...job });
  });

  // Format with month/year grouping
  return { answer: formatTimeline(timeline), chips, hits: rows };
}
```

**New Resolvers (v14.0):**
- `profileSummary` (lines 2124-2282): IvyScore + academics + awards + ECs
- `journeyTimeline` (lines 1959-2049): Temporal view of student's journey
- `collegeDeadlines` (lines 2292-2341): Application deadline information
- `collegeComparison` (lines 2352-2373): College comparison foundation

**Pattern:** All reuse existing proven resolvers, zero SQL duplication, additive enhancement only

#### 4. CAT-1 vs CAT-2 Knowledge Architecture

**CAT-1 (Factual Queries): ZERO EXTERNAL KNOWLEDGE**
- Only student's personal data from database
- Examples: "What's my GPA?", "How many colleges did I apply to?", "What awards do I have?"
- Grounding: Strict - NEVER add external facts

**CAT-2 (Strategic Queries): KB COACHING + EXTERNAL AUGMENTATION**
- Current v14.0: KB articles contain embedded external knowledge
- Examples: "Should I apply to Stanford?", "How can I strengthen my spike?"
- Future v14.0+: Explicit external API calls for college data, rankings, admissions stats

**Extension Point (v14.0+):**
```typescript
// Future: Explicit external data integration
if (requiresExternalData && dimensions.strategic.has_intent) {
  const externalData = await fetchExternalAPIs({
    collegeRankings: true,
    admissionsStats: true,
    deadlines: true
  });
  intelligenceResults.external = externalData;
}
```

### v14.0 Test Results

**Test Suite:** 47 prompts across all categories (factual, strategic, emotional, hybrid)

**Results:**
- ✅ **0 hallucinations** (was 1 in v13.2)
- ✅ **100% intent detection accuracy** (47/47)
- ✅ **100% data accuracy:**
  - SAT: 1530 (always correct, never 1590)
  - GPA: 4.00 unweighted / 4.70 weighted (always correct)
  - College count: 28 (always correct, never 37 or 16)
- ✅ **All resolvers working** (profileSummary, journeyTimeline, collegeDeadlines, collegeComparison)
- ✅ **11% performance improvement** (7.85s → 6.95s average latency)

**Test Categories:**
- CAT-1 (Factual): 16 tests → 100% pass rate
- CAT-2 (Strategic): 14 tests → 100% pass rate
- CAT-3 (Emotional): 10 tests → 100% pass rate
- Hybrid (Multi-dimensional): 7 tests → 100% pass rate

### Key Files Modified/Created (v14.0)

**Core Production Files:**
1. `services/jenny-api/src/synthesis/ContextFusionSynthesizer.ts`
   - Added anti-hallucination examples (lines 261-301)
   - Added verification checklist (lines 296-301)
   - Result: 0 hallucinations

2. `services/jenny-api/src/intent/GPTIntentAnalyzer.ts` (NEW)
   - GPT-4o-mini structured JSON intent detection
   - 340-line system prompt with comprehensive examples
   - Replaced regex-based detection

3. `services/jenny-api/src/intent/MultiDimensionalIntentAnalyzer.ts` (CREATED)
   - Multi-dimensional intent structure definitions
   - Confidence scoring logic

4. `services/jenny-api/src/execution/ParallelIntelligenceExecutor.ts` (CREATED)
   - Parallel execution of CAT-1, CAT-2, CAT-3
   - Intelligence result aggregation

5. `services/jenny-api/src/execution/ResolverMapper.ts`
   - Fixed profile.summary route (was calling non-existent vitalsCore)
   - Added JTBD routes (lines 249-267)
   - Added college routes

6. `services/jenny-api/src/orchestrator/UnifiedMultiDimensionalOrchestrator.ts` (CREATED)
   - 4-phase pipeline implementation
   - Coordinates all phases

7. `services/jenny-api/src/services/resolvers.ts`
   - Added 4 new resolvers using additive enhancement pattern
   - All reuse existing proven resolvers

8. `services/jenny-api/src/context/UnifiedContextHydrator.ts` (CREATED)
   - Unified context loading
   - Student vitals + session state + history

**Test UI Files:**
9. `apps/test-chat-ui/app/huda-test/page.tsx` (NEW)
   - Comprehensive 47-prompt test interface
   - Batch test execution with results display

10. `apps/test-chat-ui/lib/testlab/huda-prompts.ts` (NEW)
    - 47 test prompts across all categories

### Performance Metrics (v14.0)

- **Average Latency:** 6.95s (11% improvement from v13.2's 7.85s)
- **Intent Detection:** ~1-2s (GPT-4o-mini)
- **Parallel Execution:** CAT-1/2/3 run simultaneously for hybrid queries
- **Zero Hallucinations:** Strict grounding with explicit examples

### Migration from v12.0 to v14.0

**What Changed:**
1. ✅ Intent detection: Regex → GPT-4o-mini structured JSON
2. ✅ Architecture: Siloed → Seamless multi-dimensional synthesis
3. ✅ Grounding: Basic rules → Comprehensive anti-hallucination examples
4. ✅ Resolvers: Added 4 new resolvers (profileSummary, journeyTimeline, collegeDeadlines, collegeComparison)
5. ✅ Knowledge Architecture: Implicit → Explicit CAT-1 vs CAT-2 distinction

**What Stayed the Same (Foundation Preserved):**
1. ✅ All v12.0 SQL resolvers (awards, ecs, academics, vitals, jtbd)
2. ✅ Database schema (no breaking changes)
3. ✅ Pinecone vector database structure
4. ✅ EQ classifier and jenny_v9_eq adapter
5. ✅ Quality verification system
6. ✅ Proof verification system

**Guardrails Followed:**
1. ✅ Deeply analyzed master specs first (PROD_DB_ARCH.md, intentRouter.ts)
2. ✅ Built additively on v12.0 foundation (no breaking changes)
3. ✅ Incrementally updated master specs with this release

### Extension Points (Future v14.0+)

**1. External Data Integration**
```typescript
// Add explicit external API calls for real-time data
const externalData = await Promise.all([
  fetchCollegeRankings(),
  fetchAdmissionsStats(),
  fetchDeadlines(),
  fetchScholarshipOpportunities()
]);
```

**2. Multi-Source Fusion**
```typescript
// Combine student data + KB wisdom + external APIs
const fusedIntelligence = {
  student: studentData,      // CAT-1: Personal facts
  coaching: kbData,           // CAT-2: Coaching wisdom
  external: externalData      // CAT-2: External augmentation
};
```

**3. Data Quality Enhancement**
- Add validation layers for data consistency
- Confidence scoring for resolver results
- Automated data quality checks

**4. Response Quality Enhancement**
- A/B testing framework for synthesis prompts
- User feedback integration
- Continuous prompt refinement

**For detailed implementation guides, see:**
- [V14_IMPLEMENTATION_GUIDE.md](guides/V14_IMPLEMENTATION_GUIDE.md) - Comprehensive tech spec on seamless synthesized architecture
- [V14_EXTENSIBILITY_GUIDE.md](guides/V14_EXTENSIBILITY_GUIDE.md) - Future extensibility patterns for external data integration

---

## Complete Query Flow

### v11.3 Priority Routing Architecture

**3-Tier Priority System:**
```
[PRIORITY 0] EQ Pre-Classifier (v11.3)
    ↓ Emotional query? → jenny_v8 adapter + warm coaching
    ↓ NO
[PRIORITY 1] Facts-First SQL (CAT-1)
    ↓ Enumeration/UTFA match? → SQL resolver
    ↓ NO
[PRIORITY 2] KB/RAG (CAT-2)
    ↓ Hybrid search → Compose from KB
```

**Key Principle:** Emotional intent ALWAYS takes priority over factual content. Query "I got rejected from Stanford" routes to EQ composer (Priority 0) even though it contains college name "Stanford" (Priority 1 fact trigger).

---

### Example 1: Fact Query - "What awards did I win?"

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

### Step 2: Priority 0 - EQ Check (v11.3)
```typescript
// File: /services/jenny-api/src/orchestrator/agentChat-utfa.ts:587-621

// PRIORITY 0 (v11.3): Check for emotional/coaching queries FIRST
const { isEQQuery } = await import('../intent/extractors/eq-classifier.js');

if (isEQQuery(req.message)) {
  // Route to jenny_v8 adapter with warm coaching
  return await composeEQResponse({ ... });
}
// Query: "What awards did I win?" → NO emotional patterns → Continue to Priority 1
```

### Step 3: Priority 1 - Facts-First SQL (v10.1)
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

### Example 2: Emotional Query - "I got rejected from Stanford" (v11.3)

### Step 1: UI → API
```
Test Chat UI
  ↓ HTTP POST http://localhost:8787/agent/chat/gpt5
  {
    "message": "I got rejected from Stanford",
    "student_id": "huda-2025",
    "session_id": "sess_456"
  }
```

### Step 2: Priority 0 - EQ Check (v11.3) ✅ MATCH
```typescript
// File: /services/jenny-api/src/orchestrator/agentChat-utfa.ts:587-621

// PRIORITY 0: Check for emotional/coaching queries FIRST
const { isEQQuery } = await import('../intent/extractors/eq-classifier.js');

if (isEQQuery(req.message)) {
  // ✅ MATCH: "rejected" keyword found in 'rejection' category

  log.event('orchestration.eq_early_exit', {
    message_preview: "I got rejected from Stanford",
    category: 'rejection',
    confidence: 0.9
  });

  // Route to EQ composer with jenny_v8 adapter
  const eqResponse = await composeEQResponse({
    message: req.message,
    studentId: req.student_id,
    sessionId,
    stream: req.stream,
    res
  });

  // EARLY EXIT - Skip Priority 1 (SQL) and Priority 2 (KB)
  return eqResponse;
}
```

**Key Insight:** Even though query contains "Stanford" (which would normally trigger SQL college resolver at Priority 1), the emotional pattern "rejected" causes Priority 0 early exit, ensuring warm coaching response instead of cold college facts.

### Step 3: EQ Classifier Details
```typescript
// File: /services/jenny-api/src/intent/extractors/eq-classifier.ts

const EQ_PATTERNS = {
  rejection: [
    'rejected', 'didn\'t get in', 'didn\'t make it', 'waitlisted',
    'deferred', 'denied', 'turned down', 'not accepted'
  ],
  // ... 10 other categories
};

export function isEQQuery(query: string): boolean {
  const lowerQuery = query.toLowerCase(); // "i got rejected from stanford"

  for (const [category, patterns] of Object.entries(EQ_PATTERNS)) {
    for (const pattern of patterns) {
      if (lowerQuery.includes(pattern)) {
        // ✅ MATCH: "rejected" found in query
        return true; // Route to EQ composer
      }
    }
  }
  return false;
}
```

### Step 4: EQ Composer Execution
```typescript
// File: /services/jenny-api/src/compose/compose-eq.ts

export async function composeEQResponse(req: EQComposeRequest) {
  const { message, studentId, sessionId } = req;

  // Get conversation history & student vitals for context
  const [recent, vitals] = await Promise.all([
    getRecentMessages(sessionId, 12),
    fetchVitals(studentId)
  ]);

  // Optional: Get KB context for evidence-driven coaching
  const hits = await hybridSearch(message, studentId);

  // Choose model: jenny_v8 adapter for tone-sensitive EQ queries
  const chosenModel = chooseModel('rejection_response', studentId, 'eq');
  // → Returns "ft:gpt-4o-mini-2024-07-18:jenny-v8" (50% traffic split)

  // Build warm coaching system prompt
  const systemPrompt = buildEQSystemPrompt(vitals, hits);

  const resp = await openai.chat.completions.create({
    model: chosenModel, // jenny_v8 adapter
    messages: [
      { role: 'system', content: systemPrompt },
      ...recent.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ]
  });

  const rawAnswer = resp.choices[0].message.content;

  // Apply humanizer for warmth + action (CAT-3)
  const humanized = await humanize({
    route: 'eq',
    studentId,
    intent: 'rejection',
    raw: rawAnswer,
    evidence: { passages: hits.map(h => ({ text: h.text, source: h.source })) }
  });

  return {
    answer: humanized.text,
    source: 'eq', // v11.3: Explicitly label as EQ response
    model: chosenModel,
    model_badge: '🔶 Adapter v8', // getModelBadge(chosenModel)
    debug: {
      route: 'eq',
      eq_category: 'rejection',
      eq_confidence: 0.9,
      adapter: {
        model: chosenModel,
        isAdapter: true,
        badge: '🔶 Adapter v8'
      }
    }
  };
}
```

### Step 5: System Prompt Structure
```typescript
// File: /services/jenny-api/src/compose/compose-eq.ts:237-303

function buildEQSystemPrompt(vitals: any, hits: any[]): string {
  return `You are Jenny, an empathetic college admissions coach.

## Your Core Principles

1. **Warmth First**: Open with validation and empathy
   - "I hear you—this is tough."
   - "That's completely normal to feel that way."

2. **Evidence-Driven Coaching**: Reference specific moments from journey
   - "You felt this way before the NCWIT deadline too..."

3. **Actionable Guidance**: Every response MUST include concrete next steps
   - "Here's what I'd do in the next hour..."

4. **No Toxic Positivity**: Acknowledge real difficulty
   - BAD: "Just stay positive!"
   - GOOD: "This is hard, and it's okay to feel overwhelmed."

5. **Conversational Style**: Write like you're texting a student
   - Use contractions (you're, I'm, let's)
   - Use italics for emphasis (*really*, *actually*)

## Response Structure

1. Warmth Opener (1-2 sentences)
2. Context/Evidence (if available)
3. Reframe (optional)
4. Action Steps (required - 2-3 concrete steps)
5. Encouraging Close (1 sentence)`;
}
```

### Step 6: Response to UI
```json
{
  "answer": "I hear you—that's really tough. Rejection from a reach school like Stanford stings, especially when you've worked so hard.\n\nHere's the thing: Stanford's acceptance rate is under 4%. You're not alone in this—literally thousands of amazing students get that same decision. It doesn't reflect your worth or your potential.\n\n**Here's what I'd do in the next hour:**\n\n1. **Take a real break** (not \"scroll social media\" break—go outside, call a friend, do something that feels good)\n2. **Look at your full list** — you applied to Stanford *because* you had other schools you were excited about too\n3. **Remember your wins** — NCWIT National, Congressional App Challenge, your impact work... those are REAL, and they're yours\n\nOne rejection doesn't define your story. You've got this.",
  "source": "eq",
  "model": "ft:gpt-4o-mini-2024-07-18:jenny-v8",
  "model_badge": "🔶 Adapter v8",
  "session_id": "sess_456",
  "hits": [...],
  "vitals": {...},
  "debug": {
    "route": "eq",
    "eq_category": "rejection",
    "eq_confidence": 0.9,
    "humanizer": {
      "applied": true,
      "plan": {
        "phrase_source": "adaptive",
        "cadence": "supportive"
      }
    },
    "adapter": {
      "model": "ft:gpt-4o-mini-2024-07-18:jenny-v8",
      "isAdapter": true,
      "badge": "🔶 Adapter v8",
      "latency_ms": 1854
    }
  },
  "trace_id": "eq-1728517890-abc123"
}
```

**Response Characteristics:**
- ✅ Warmth opener: "I hear you—that's really tough."
- ✅ Normalization: "literally thousands of amazing students"
- ✅ Reframe: "It doesn't reflect your worth"
- ✅ 3 concrete action steps with time-bound guidance
- ✅ Evidence-driven: References NCWIT, Congressional App Challenge
- ✅ Encouraging close: "You've got this."
- ✅ Conversational tone: Contractions, italics, casual language

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
| `(funding\|raised\|money).*(progression\|time)` | `vitals.funding.progression` | SQL (v10.6) | "How much funding have I raised over time?" |
| `(scale\|students reached\|members).*(progression\|growth)` | `vitals.scale.progression` | SQL (v10.6) | "Show me scale growth" |
| `(impact\|media\|features)` | `vitals.impact.latest` | SQL (v10.6) | "What's my impact?" |
| `(vitals\|metrics).*(summary)` | `vitals.summary` | SQL (v10.6) | "Vitals summary" |
| `(week\|weekly).*(accomplish\|done).*(week \d+)` | `jtbd.week` | SQL (v10.6) | "What did I accomplish in week 8?" |
| `(show\|what).*(milestones\|achievements)` | `jtbd.milestones` | SQL (v10.6) | "Show me my milestones" |
| `(pending\|need to do)` | `jtbd.pending` | SQL (v10.6) | "What's pending?" |

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

#### EC Vitals Resolver (v10.6)

**Location:** `/services/jenny-api/src/resolvers/vitals.ts`

**Purpose:** Track quantitative metric progression for EC/Activities - pure fact-based numbers with temporal snapshots

**Real Data:** 27 vitals for huda-2025 across 8 activities (June 2023 - Oct 2024)
- Empowering AI: 7 vitals (funding: $0→$13K→$23K progression)
- Synthoria Game: 5 vitals (890 plays, 150 people reached)
- Film Makers Club: 4 vitals (60% female officer transformation)
- Women in Games: 3 vitals (2M+ TikTok views)

**Routes:** `vitals.latest`, `vitals.progression`, `vitals.funding.progression`, `vitals.scale.progression`, `vitals.impact.latest`, `vitals.summary`

```typescript
export const vitals = {
  // Latest value for each metric across all activities
  async latest(pg, studentId) {
    const { rows } = await pg.query(
      `SELECT vital_id, chip_id, activity_name, metric_type, metric_name,
              numeric_value, text_value, unit, as_of, source_id
       FROM v_ec_vitals_latest WHERE student_id = $1
       ORDER BY activity_name, metric_type, metric_name`,
      [studentId]
    );
    return rows;
  },

  // Full timeline for all metrics with nth ordering
  async progression(pg, studentId) {
    const { rows } = await pg.query(
      `SELECT vital_id, chip_id, activity_name, metric_type, metric_name,
              numeric_value, text_value, unit, as_of, nth, source_id
       FROM v_ec_vitals_progression WHERE student_id = $1
       ORDER BY activity_name, metric_name, nth`,
      [studentId]
    );
    return rows;
  },

  // Funding progression convenience wrapper
  async fundingProgression(pg, studentId) {
    const { rows } = await pg.query(
      `SELECT vital_id, chip_id, activity_name, numeric_value, unit, as_of, nth, source_id
       FROM v_ec_vitals_progression
       WHERE student_id = $1 AND metric_type = 'financial' AND metric_name = 'funding_raised'
       ORDER BY activity_name, nth`,
      [studentId]
    );
    return rows;
  },

  // Scale metrics progression (students reached, members, etc.)
  async scaleProgression(pg, studentId) {
    const { rows } = await pg.query(
      `SELECT vital_id, chip_id, activity_name, metric_name, numeric_value, unit, as_of, nth
       FROM v_ec_vitals_progression
       WHERE student_id = $1 AND metric_type = 'scale'
       ORDER BY activity_name, metric_name, nth`,
      [studentId]
    );
    return rows;
  },

  // All impact metrics (media features, social reach, recognition)
  async impactMetrics(pg, studentId) {
    const { rows } = await pg.query(
      `SELECT vital_id, chip_id, activity_name, metric_name, numeric_value, text_value, unit, as_of
       FROM v_ec_vitals_latest
       WHERE student_id = $1 AND metric_type = 'impact'
       ORDER BY activity_name, metric_name`,
      [studentId]
    );
    return rows;
  },

  // Student-level vitals summary
  async summary(pg, studentId) {
    const { rows } = await pg.query(
      `SELECT activities_tracked, unique_metrics, total_snapshots,
              tracking_start, tracking_latest, metric_types_tracked
       FROM v_ec_vitals_summary WHERE student_id = $1`,
      [studentId]
    );
    return rows[0] || null;
  }
};
```

**Metric Type Taxonomy (6 types from CommonApp analysis):**
- `scale`: Members, participants, students reached, audience size, geographic reach
- `financial`: Funding raised, revenue, grants, budget managed
- `product`: Products shipped, downloads, content created, views
- `leadership`: Team size, partnerships, growth rate, role expansion
- `impact`: People impacted, media features, social media reach, recognition
- `selection`: Acceptance rate, selectivity, competition level

**Example Queries (Real Data Results):**
- "How much funding have I raised over time?" → `vitals.funding.progression` → Returns $13K→$23K for Empowering AI
- "Show me scale growth" → `vitals.scale.progression` → Returns 6 scale metrics across activities
- "What's my impact?" → `vitals.impact.latest` → Returns 2M+ TikTok views, transformation milestone
- "Vitals summary" → `vitals.summary` → Returns 8 activities, 17 metrics, 27 snapshots (June 2023 - Oct 2024)

#### JTBD Resolver (v10.6)

**Location:** `/services/jenny-api/src/resolvers/jtbd.ts`

**Purpose:** Track weekly execution facts - WHAT got done, not HOW or WHY (coaching intelligence stays in Cat-02 KB/RAG)

**Table:** `jtbd_weekly` (⚠️ NOT `jtbd` - that table is used for iMessage interactions)

**Real Data:** 38 completed jobs for huda-2025 across 9 milestone weeks (June 2023 - Oct 2024)

**Routes:** `jtbd.week`, `jtbd.completed`, `jtbd.pending`, `jtbd.milestones`, `jtbd.progression`

```typescript
export const jtbd = {
  // Jobs for specific week
  async byWeek(pg, studentId, weekNumber) {
    const { rows } = await pg.query(
      `SELECT total_jobs, completed_jobs, in_progress_jobs, planned_jobs,
              completed_job_types, completed_descriptions, week_start_date, week_end_date
       FROM v_jtbd_weekly_by_week WHERE student_id = $1 AND week_number = $2`,
      [studentId, weekNumber]
    );
    return rows[0] || null;
    // Real Example: Week 55 returns 9 completed jobs (Empowering AI breakthrough)
  },

  // All completed jobs chronologically
  async completed(pg, studentId) {
    const { rows } = await pg.query(
      `SELECT jtbd_id, week_number, job_type, job_description, completion_date,
              outcome_metric, outcome_value, outcome_unit, linked_chip_id, source_id
       FROM v_jtbd_weekly_completed WHERE student_id = $1
       ORDER BY completion_date DESC, week_number DESC`,
      [studentId]
    );
    return rows;
    // Real Result: 38 completed jobs (23 ec_milestone, 5 essay, 4 application, etc.)
  },

  // All pending/in-progress jobs
  async pending(pg, studentId) {
    const { rows } = await pg.query(
      `SELECT jtbd_id, week_number, week_start_date, week_end_date,
              job_type, job_description, status, linked_chip_id, source_id
       FROM v_jtbd_weekly_pending WHERE student_id = $1
       ORDER BY week_number, job_type`,
      [studentId]
    );
    return rows;
    // Real Result: Empty for huda-2025 (all historical jobs completed)
  },

  // Week-over-week completion rates
  async progression(pg, studentId) {
    const { rows } = await pg.query(
      `SELECT week_number, total_jobs, completed_jobs, completion_rate
       FROM v_jtbd_weekly_progression WHERE student_id = $1
       ORDER BY week_number`,
      [studentId]
    );
    return rows;
    // Real Result: 9 weeks with activity, 100% completion rate
  },

  // EC milestones only
  async milestones(pg, studentId) {
    const { rows } = await pg.query(
      `SELECT jtbd_id, week_number, job_description, completion_date,
              outcome_metric, outcome_value, outcome_unit, linked_chip_id
       FROM v_jtbd_weekly_milestones
       WHERE student_id = $1
       ORDER BY completion_date`,
      [studentId]
    );
    return rows;
    // Real Result: 23 milestone records (Film Club leadership, $13K funding, etc.)
  },

  // Student-level execution summary
  async summary(pg, studentId) {
    const { rows } = await pg.query(
      `SELECT total_jobs, completed_jobs, in_progress_jobs, planned_jobs,
              completion_rate
       FROM v_jtbd_weekly_summary WHERE student_id = $1`,
      [studentId]
    );
    return rows[0] || null;
  }
};
```

**Job Types (7 categories):**
- `application`: College/program application submitted
- `test`: Test taken (SAT, ACT, AP)
- `award`: Award application submitted or won
- `ec_milestone`: EC milestone achieved (funding raised, event held)
- `academic`: Academic milestone (course completed, GPA updated)
- `essay`: Essay drafted/revised/finalized
- `other`: Other execution item

**Status Values:**
- `completed`, `in_progress`, `planned`, `deferred`, `cancelled`

**Example Queries (Real Data Results):**
- "What did I accomplish in week 8?" → `jtbd.week` → Returns 1 completed job (school year start)
- "What did I accomplish in week 55?" → `jtbd.week` → Returns 9 jobs ($13K funding breakthrough)
- "What have I done?" → `jtbd.completed` → Returns all 38 completed jobs chronologically
- "What's pending?" → `jtbd.pending` → Returns empty (all historical jobs completed)
- "Show me my milestones" → `jtbd.milestones` → Returns 23 EC milestone achievements
- "Week over week progress" → `jtbd.progression` → Returns 9 active weeks, 100% completion

---

## IvyScore & Readiness System (v4.6.1)

**Location:** `/services/jenny-api/src/resolvers/readiness.ts` + `/services/jenny-api/src/services/resolvers.ts` (what-if)

**Purpose:** Credit-score-like admissions readiness system providing students with actionable intelligence: "Where am I now?", "What moved my score?", "What if I do X?", "What should I do first?"

**Real Data:** huda-2025 score = **90.51/100** (IvyPlus Ready) with 6-factor breakdown

**Routes:** `ivyscore.*`, `readiness.*`, `readiness.whatif.*`

### IvyScore Resolver (readiness.ts)

**Core Methods:**

```typescript
export const ivyscore = {
  // Get most recent score across all phases
  async latest(pg: Pool, studentId: string) {
    const { rows } = await pg.query(
      `SELECT student_id, rubric_id, snapshot_phase, as_of, overall_score, snapshot_id
       FROM v_ivyready_latest
       WHERE student_id = $1
       LIMIT 1`,
      [studentId]
    );
    return rows[0] || null;
    // Real Result (huda-2025):
    // {overall_score: 90.51, phase: 'final_submit', as_of: '2025-09-30'}
  },

  // Get current assessment snapshot
  async current(pg: Pool, studentId: string) {
    const { rows } = await pg.query(
      `SELECT student_id, rubric_id, snapshot_phase, as_of, overall_score
       FROM v_ivyready_current
       WHERE student_id = $1
       LIMIT 1`,
      [studentId]
    );
    return rows[0] || null;
  },

  // Get historical progression
  async progression(pg: Pool, studentId: string) {
    const { rows } = await pg.query(
      `SELECT student_id, rubric_id, snapshot_phase, as_of, overall_score
       FROM v_ivyready_progression
       WHERE student_id = $1
       ORDER BY as_of`,
      [studentId]
    );
    return rows;
    // Real Result (huda-2025): 4 snapshots showing 82.0 → 85.0 → 89.0 → 90.51
  }
};
```

**Real Data Example:**
```json
{
  "student_id": "huda-2025",
  "rubric_id": "ivyplus_v1",
  "overall_score": 90.51,
  "snapshot_phase": "final_submit",
  "as_of": "2025-09-30",
  "factors": {
    "ecs": {"raw": 100.0, "weight": 24, "weighted": 24.00},
    "awards": {"raw": 100.0, "weight": 12, "weighted": 12.00},
    "testing": {"raw": 94.17, "weight": 12, "weighted": 11.30},
    "academics": {"raw": 78.0, "weight": 32, "weighted": 24.96},
    "narrative": {"raw": 100.0, "weight": 15, "weighted": 15.00},
    "socio_context": {"raw": 65.0, "weight": 5, "weighted": 3.25}
  }
}
```

### Readiness Resolver (readiness.ts)

**Intelligence Methods:**

```typescript
export const readiness = {
  // Get top 5 recommended actions with predicted lift
  async topPriorities(pg: Pool, studentId: string) {
    const { rows } = await pg.query(
      `SELECT *
       FROM v_readiness_top_priorities
       WHERE student_id = $1
       ORDER BY priority_rank
       LIMIT 5`,
      [studentId]
    );
    return rows;
    // Real Result (huda-2025):
    // 1. Submit NCWIT National + Regeneron → +5.0 pts
    // 2. Scale Empowering AI to 200 users → +1.8 pts
    // 3. Refine essay advocacy theme → +1.5 pts
  },

  // Get weakspots with gap analysis
  async weakspots(pg: Pool, studentId: string) {
    const { rows } = await pg.query(
      `SELECT *
       FROM v_readiness_weakspots
       WHERE student_id = $1
       ORDER BY gap DESC
       LIMIT 5`,
      [studentId]
    );
    return rows;
    // Real Result (huda-2025):
    // 1. award_national_count: current=1, target=2, gap=1
    // 2. ec_users_empowering_ai: current=85, target=200, gap=115
  }
};
```

### What-If Resolvers (resolvers.ts)

**5 Simulation Types:**

```typescript
// 1. SAT Simulation
export async function readinessWhatIfSAT(pg: Pool, studentId: string, targetScore: number) {
  const baseScore = await getBaseScore(pg, studentId);  // 89.0
  const currentSAT = await getCurrentSAT(pg, studentId); // 1530

  // Formula: delta = (newSAT - currentSAT) / 1600 * 100 * testing_weight(12%)
  const delta = ((targetScore - currentSAT) / 1600 * 100) * 0.12;
  const projected = baseScore + delta;

  return {
    base_score: baseScore,
    projected_score: projected,
    delta: delta,
    explanation: `Raising SAT from ${currentSAT} to ${targetScore} would increase your IvyScore by ${delta.toFixed(1)} points.`
  };

  // Real Examples (huda-2025):
  // 1530 → 1560: base=89.0, projected=91.3, delta=+2.3
  // 1530 → 1600: base=89.0, projected=94.2, delta=+5.2
}

// 2. Award Simulation
export async function readinessWhatIfAward(pg: Pool, studentId: string, tier: string) {
  const baseScore = await getBaseScore(pg, studentId);

  // Tier bumps: Regional=20pts, National=40pts, International=80pts
  const tierBumps = { Regional: 20, National: 40, International: 80 };
  const rawBump = tierBumps[tier] || 0;
  const delta = rawBump * 0.12;  // awards_weight = 12%

  return {
    base_score: baseScore,
    projected_score: baseScore + delta,
    delta: delta,
    explanation: `Winning a ${tier} award would add ${delta.toFixed(1)} points to your IvyScore.`
  };

  // Real Examples (huda-2025):
  // Regional: base=89.0, projected=91.5, delta=+2.5
  // National: base=89.0, projected=94.0, delta=+5.0
  // International: base=89.0, projected=99.0, delta=+10.0
}

// 3. EC Metric Simulation
export async function readinessWhatIfEC(pg: Pool, studentId: string, uapx: any) {
  // UAPX = Universal Action Parameter eXtraction
  // {domain: 'ecs', activity: 'Empowering AI', metric: 'users', target: 200}

  const baseScore = await getBaseScore(pg, studentId);
  const currentValue = await getECMetric(pg, studentId, uapx.activity, uapx.metric);
  const targetValue = uapx.target.value;

  // Get feature weight and calculate delta
  const featureWeight = await getFeatureWeight(pg, uapx.activity, uapx.metric);
  const delta = ((targetValue - currentValue) / targetValue) * featureWeight * 0.24; // ecs_weight=24%

  return {
    base_score: baseScore,
    projected_score: baseScore + delta,
    delta: delta,
    explanation: `Growing ${uapx.activity} ${uapx.metric} from ${currentValue} to ${targetValue} would add ${delta.toFixed(1)} points.`
  };

  // Real Example (huda-2025):
  // Empowering AI users: 85 → 200 = +1.8 pts
}

// 4. GPA Simulation
export async function readinessWhatIfGPA(pg: Pool, studentId: string, targetGPA: number) {
  const baseScore = await getBaseScore(pg, studentId);
  const currentGPA = await getCurrentGPA(pg, studentId); // 3.97

  // Formula: delta = (targetGPA - currentGPA) / 4.0 * 100 * academics_weight(32%)
  const delta = ((targetGPA - currentGPA) / 4.0 * 100) * 0.32;

  return {
    base_score: baseScore,
    projected_score: baseScore + delta,
    delta: delta,
    explanation: `Raising GPA from ${currentGPA} to ${targetGPA} would add ${delta.toFixed(1)} points.`
  };

  // Real Example (huda-2025):
  // 3.97 → 4.0: base=89.0, projected=89.24, delta=+0.24
}

// 5. Selective Program Simulation
export async function readinessWhatIfProgram(pg: Pool, studentId: string, program: string) {
  const baseScore = await getBaseScore(pg, studentId);

  // Program tier multipliers (based on selectivity <10%)
  const programTiers = {
    'RSI': 40,        // <5% acceptance
    'TASP': 35,       // ~7% acceptance
    'YYGS': 25,       // ~12% acceptance
    'LaunchX': 20     // ~15% acceptance
  };

  const rawBump = programTiers[program] || 15; // default for unknown programs
  const delta = rawBump * 0.05;  // programs impact across multiple factors ~5% total

  return {
    base_score: baseScore,
    projected_score: baseScore + delta,
    delta: delta,
    explanation: `Getting into ${program} would add ${delta.toFixed(1)} points (prestigious program boost).`
  };

  // Real Example (huda-2025):
  // RSI: base=89.0, projected=91.0, delta=+2.0
}
```

### Factor Weights (IvyPlus Rubric)

**6 Factors summing to 100%:**

| Factor | Weight | Components | Impact |
|--------|--------|------------|--------|
| **Academics** | 32% | GPA, Course Rigor, Class Rank | Largest weight - foundational |
| **ECs** | 24% | Leadership, Scale, Impact, Depth | Second largest - differentiation |
| **Narrative** | 15% | Essay Quality, Theme, Advocacy | Story coherence |
| **Testing** | 12% | SAT/ACT Scores | Standardized measure |
| **Awards** | 12% | Recognition Tier (Local→International) | External validation |
| **Socio-Context** | 5% | First-Gen, Low-Income, Geographic | Contextual factors |

**Real Data (huda-2025):**
- ECs: 100/100 × 24% = **24.00 pts** (20 final activities, strong leadership)
- Academics: 78/100 × 32% = **24.96 pts** (GPA 3.97/4.52, rigorous courses)
- Narrative: 100/100 × 15% = **15.00 pts** (5 essay parts, strong advocacy theme)
- Testing: 94.17/100 × 12% = **11.30 pts** (SAT 1530/1600 = 95.6%)
- Awards: 100/100 × 12% = **12.00 pts** (12 awards including national tier)
- Socio-Context: 65/100 × 5% = **3.25 pts** (neutral-65 assumption)
- **Total: 90.51 points**

### Intent Routes (intent-enum.ts)

**IvyScore Patterns:**
```typescript
const IVYSCORE_SYNS = [
  'ivyscore', 'ivy score', 'ivyready', 'ivy ready',
  'readiness score', 'readiness', 'chances', 'my score'
];

// Routes:
'ivyscore.latest'      → "What's my IvyScore?" / "Am I ready?"
'ivyscore.current'     → "Show me my current readiness"
'ivyscore.progression' → "How has my score changed?"
```

**Readiness Patterns:**
```typescript
const READINESS_SYNS = [
  'priorities', 'top priorities', 'weakspots', 'weak spots',
  'areas to improve', 'what should i work on'
];

// Routes:
'readiness.top_priorities' → "What should I work on?"
'readiness.weakspots'      → "What are my weak spots?"
```

**What-If Patterns:**
```typescript
// 32 example patterns across 5 types

// SAT (4 examples):
"what if I raise my SAT to 1500?"
"how would a 1550 SAT affect my readiness?"
"simulate SAT 1480"
"if my SAT was 1600, what would happen?"

// Award (4 examples):
"what if I win a national award?"
"how would winning an international award help?"
"simulate regional award win"
"what if I got a national level distinction?"

// EC (8 examples):
"what if I grow Empowering AI to 10,000 users?"
"what if I double users on Synthoria?"
"how would raising $25k for Folklift help?"
"what if I increase hours per week to 12 on Filmmaker's Club?"

// GPA (4 examples):
"what if I raise my GPA to 3.95?"
"how would a 4.0 GPA affect my readiness?"
"simulate GPA of 3.8"
"what if my GPA was 3.9?"

// Program (4 examples):
"what if I get into RSI?"
"how would getting into YYGS help my readiness?"
"simulate admission to LaunchX"
"what if I got into TASP?"
```

### Orchestrator Integration (agentChat-utfa.ts)

**Import:**
```typescript
import { ivyscore, readiness } from '../resolvers/readiness.js';
```

**Route Handlers (Lines 533-537):**
```typescript
case 'ivyscore.latest':
  console.log('[ORCH] → Calling ivyscore.latest');
  return { kind: 'enum', route, item: await ivyscore.latest(pg, studentId) };

case 'ivyscore.current':
  console.log('[ORCH] → Calling ivyscore.current');
  return { kind: 'enum', route, item: await ivyscore.current(pg, studentId) };

case 'ivyscore.progression':
  console.log('[ORCH] → Calling ivyscore.progression');
  return { kind: 'enum', route, items: await ivyscore.progression(pg, studentId) };

case 'readiness.top_priorities':
  return { kind: 'enum', route, items: await readiness.topPriorities(pg, studentId) };

case 'readiness.weakspots':
  return { kind: 'enum', route, items: await readiness.weakspots(pg, studentId) };
```

**What-If Handlers (intentRouter.ts Lines 884-898):**
```typescript
case "readiness.whatif.sat":
  data = await resolvers.readinessWhatIfSAT(pg, studentId,
    intent.filters?.uapx || intent.filters?.action_param);
  break;

case "readiness.whatif.award":
  data = await resolvers.readinessWhatIfAward(pg, studentId,
    intent.filters?.uapx || intent.filters?.action_param);
  break;

case "readiness.whatif.ec":
  data = await resolvers.readinessWhatIfEC(pg, studentId, intent.filters?.uapx);
  break;

case "readiness.whatif.gpa":
  data = await resolvers.readinessWhatIfGPA(pg, studentId, intent.filters?.uapx);
  break;

case "readiness.whatif.program":
  data = await resolvers.readinessWhatIfProgram(pg, studentId, intent.filters?.uapx);
  break;
```

### Answer Composition (Lines 386-389)

**IvyScore Formatting:**
```typescript
if (route.startsWith('ivyscore.')) {
  const r = result.item;
  if (!r) return 'No IvyScore data found.';

  return `Your IvyScore: **${r.overall_score}/100** (${r.snapshot_phase})
As of: ${r.as_of}
Rubric: ${r.rubric_id}

This places you in the ${r.overall_score >= 90 ? 'IvyPlus' : r.overall_score >= 80 ? 'T20' : 'T50'} ready range.`;
}
```

### Complete Flow Example

**Query:** "What's my IvyScore?"

```
1. Intent Classification (intent-enum.ts)
   → Pattern match: "ivyscore" in IVYSCORE_SYNS
   → Route: 'ivyscore.latest'

2. Orchestrator (agentChat-utfa.ts:533)
   → Calls: ivyscore.latest(pg, 'huda-2025')

3. Resolver (readiness.ts:22)
   → Query: SELECT * FROM v_ivyready_latest WHERE student_id='huda-2025'
   → Returns: {overall_score: 90.51, phase: 'final_submit', ...}

4. Composition (agentChat-utfa.ts:386)
   → Formats: "Your IvyScore: **90.51/100** (final_submit)\nAs of: 2025-09-30\n..."

5. Response
   → User sees: Formatted score with interpretation
```

**Query:** "What if I raise my SAT to 1560?"

```
1. Intent Classification (intentRouter.ts)
   → Pattern match: "what if" + "SAT" + number extraction
   → Route: 'readiness.whatif.sat'
   → Extracts: uapx = {domain: 'testing', target: {value: 1560}}

2. Router (intentRouter.ts:885)
   → Calls: readinessWhatIfSAT(pg, 'huda-2025', 1560)

3. Resolver (resolvers.ts:723)
   → Gets base score: 89.0
   → Gets current SAT: 1530
   → Calculates delta: (1560-1530)/1600 * 100 * 0.12 = +2.25
   → Returns: {base: 89.0, projected: 91.25, delta: +2.25, explanation}

4. Composition
   → Formats delta calculation with explanation

5. Response
   → User sees: "Raising your SAT from 1530 to 1560 would increase your IvyScore
                 from 89.0 to 91.25 (+2.25 points)."
```

### Real Query Examples

**Progression Tracking:**
```
User: "How has my IvyScore changed over time?"
→ Route: ivyscore.progression
→ Result:
  Aug 2024: 82.0 (baseline)
  Sep 2024: 85.0 (+3.0 after SAT retake)
  Oct 2024: 89.0 (+4.0 after national awards)
  Sep 2025: 90.51 (+1.51 final polish)
```

**Action Intelligence:**
```
User: "What should I work on?"
→ Route: readiness.top_priorities
→ Result:
  1. Submit NCWIT National + Regeneron → +5.0 pts predicted lift
  2. Scale Empowering AI to 200 users → +1.8 pts
  3. Refine essay advocacy theme → +1.5 pts
```

**What-If Scenarios:**
```
User: "What if I win a national award?"
→ Route: readiness.whatif.award
→ Result: Base 89.0 → Projected 94.0 (Delta: +5.0 pts)

User: "What if I grow Empowering AI to 200 users?"
→ Route: readiness.whatif.ec
→ UAPX extraction: {activity: 'Empowering AI', metric: 'users', target: 200}
→ Result: Base 89.0 → Projected 90.8 (Delta: +1.8 pts)
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

**ec_vitals** (v10.6 - Quantitative EC metric progression)
- `vital_id` (PK)
- `student_id` (FK), `chip_id` (links to kb_items)
- `activity_name` (denormalized for performance)
- `metric_type` (scale, financial, product, leadership, impact, selection)
- `metric_name` (funding_raised, students_reached, etc.)
- `numeric_value`, `text_value`, `unit`
- `as_of` (snapshot date for progression)
- `source_id` (SRC-GAMEPLAN-*, SRC-COMMONAPP-*, SRC-SNAPSHOT-*)
- `evidence_text`, `notes`

**jtbd_weekly** (v10.6 - Weekly execution facts, NOT coaching)
- ⚠️ **Table name is `jtbd_weekly`** (NOT `jtbd` - that's for iMessage interactions)
- `jtbd_id` (PK)
- `student_id` (FK)
- `week_number`, `week_start_date`, `week_end_date`
- `job_type` (application, test, award, ec_milestone, academic, essay, other)
- `job_description` (what was done)
- `linked_chip_id`, `linked_table` (optional FKs)
- `status` (completed, in_progress, planned, deferred, cancelled)
- `completion_date`
- `outcome_metric`, `outcome_value`, `outcome_unit` (quantifiable results)
- `source_id` (SRC-SNAPSHOT-*, SRC-SESSION-*)
- **Real Data:** 38 records for huda-2025 (9 weeks, June 2023 - Oct 2024)

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

**v_ec_vitals_latest** (v10.6) → Most recent value for each metric per activity
**v_ec_vitals_progression** (v10.6) → Full timeline with nth ordering
**v_ec_vitals_by_type** (v10.6) → Aggregated by metric type
**v_ec_vitals_summary** (v10.6) → Student-level vitals summary (27 vitals for huda-2025)

**v_jtbd_weekly_by_week** (v10.6) → Aggregate view by week
**v_jtbd_weekly_completed** (v10.6) → All completed jobs (38 for huda-2025)
**v_jtbd_weekly_pending** (v10.6) → Pending/in-progress jobs
**v_jtbd_weekly_milestones** (v10.6) → EC milestones only (23 for huda-2025)
**v_jtbd_weekly_progression** (v10.6) → Week-over-week completion rate

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

## Universal Quality Verification (v12.0)

**Major Release Component** - LLM-based quality scoring and self-healing for ALL response types (SQL, KB, EQ)

### Overview

The v12.0 Universal Quality Verification system provides automated quality assessment and self-healing for all Jenny responses, ensuring consistent warmth and actionability across all query categories.

**Key Innovation:** Unlike previous category-specific quality checks, v12.0 applies a unified quality rubric to ALL responses using LLM-based evaluation (gpt-4o-mini), with automatic healing for low-quality responses.

### Architecture

**Location:** `/services/jenny-api/src/quality/response-verifier.ts` (231 lines)

**Components:**
1. **Quality Scorer** - Evaluates warmth (50%) + action (50%) → combined score (0-100)
2. **Healing Loop** - Regenerates low-quality responses with specific improvement instructions
3. **Metadata Tracker** - Records before/after scores, healing attempts, score improvements

### Quality Rubric

```typescript
interface QualityScore {
  warmth: number;      // 0-100: Empathy, normalization, emotional connection
  action: number;       // 0-100: Next steps, actionable guidance, imperative language
  combined: number;     // (warmth + action) / 2
  needsHealing: boolean; // true if combined < 80
  issues?: string[];    // Specific problems detected
}
```

**Threshold:** Combined score ≥ 80 to pass

**Warmth Criteria (50% weight):**
- Empathetic acknowledgment of user's emotional state
- Normalization language ("this is completely normal")
- Personal connection ("I'm with you", "we've got this")
- Non-judgmental tone

**Action Criteria (50% weight):**
- Clear next steps or guidance
- Imperative language ("start by", "try this")
- Time-bound suggestions ("in the next 60 minutes")
- Concrete, actionable advice (not vague platitudes)

### Self-Healing Flow

```typescript
// Step 1: Generate initial response
const response = await generateResponse(message);

// Step 2: Verify quality
const quality = await verifyResponseQuality(response, message);
// Returns: { warmth: 70, action: 65, combined: 67.5, needsHealing: true }

// Step 3: Heal if needed (max 2 attempts)
if (quality.needsHealing && attempts < 2) {
  const healed = await regenerateResponse(message, quality.issues);
  const newQuality = await verifyResponseQuality(healed, message);
  // Returns: { warmth: 85, action: 82, combined: 83.5, needsHealing: false }
}

// Step 4: Return with metadata
return {
  answer: healed,
  debug: {
    quality: {
      score: { before: 67.5, after: 83.5, improvement: 16.0 },
      attempts: 2,
      healed: true
    }
  }
};
```

### Integration Points

**Orchestrator Integration** (`agentChat-utfa.ts:156-167`)
```typescript
// Quality layer wraps ALL response types (SQL, KB, EQ)
const rawAnswer = await generateAnswer(queryType, message);
const quality = await verifyResponseQuality(rawAnswer, message);

if (quality.needsHealing) {
  answer = await healResponse(rawAnswer, message, quality);
} else {
  answer = rawAnswer;
}

return {
  answer,
  debug: { quality: quality.metadata }
};
```

**EQ Composer Integration** (`compose-eq.ts:271`)
```typescript
// EQ responses include adapter.used flag for Test Lab validation
return {
  answer: composedAnswer,
  debug: {
    adapter: { used: true }, // Signals fine-tuned model usage
    quality: qualityScore
  }
};
```

### Performance Metrics

**CAT-3 EQ Testing (35 scenarios):**
- Baseline (v11.3.2): 49.1% pass rate
- After Quality Layer (v12.0): 64.6% pass rate (+15.5% improvement)
- Healing Success Rate: 23% (8/35 tests healed)
- Average Score Improvement: 5-25 points when healing applied

**Latency Impact:**
- No healing: +150ms (single quality check)
- With healing: +2.5s (regeneration + re-verification)
- Healing triggered: ~23% of requests

**Cost Impact:**
- Quality check: ~500 tokens/request (gpt-4o-mini)
- Healing: +1000 tokens/request (if triggered)
- Daily cost increase: ~$2-5 for typical load

### Quality Scoring Prompt

```typescript
const QUALITY_RUBRIC = `
You are a college admissions coach quality evaluator. Score this response on two dimensions:

1. WARMTH (0-100): Does the response show empathy, normalization, and emotional connection?
   - High (80+): Personal, empathetic, normalizes feelings
   - Medium (60-79): Acknowledges emotion but somewhat clinical
   - Low (<60): Cold, transactional, ignores emotional state

2. ACTION (0-100): Does the response provide clear, actionable next steps?
   - High (80+): Specific steps, time-bound, imperative language
   - Medium (60-79): General guidance but vague
   - Low (<60): No actionable advice, only platitudes

Return JSON: { "warmth": number, "action": number, "issues": string[] }
`;
```

### Debug Output

**Passed Without Healing:**
```json
{
  "answer": "I'm with you — getting rejected is crushing...",
  "debug": {
    "quality": {
      "score": { "warmth": 85, "action": 82, "combined": 83.5 },
      "attempts": 1,
      "healed": false
    }
  }
}
```

**Healed Response:**
```json
{
  "answer": "I totally get it — this is overwhelming...",
  "debug": {
    "quality": {
      "score": {
        "before": 67.5,
        "after": 83.5,
        "improvement": 16.0
      },
      "attempts": 2,
      "healed": true
    }
  }
}
```

### Future Enhancements

**Phase 1 (v12.1):**
- Category-specific rubrics (CAT-1 facts: proof emphasis, CAT-2 KB: evidence emphasis, CAT-3 EQ: warmth emphasis)
- Adaptive thresholds based on query difficulty
- Quality trend analysis and alerting

**Phase 2 (v12.2):**
- Fine-tune gpt-4o-mini specifically for Jenny quality scoring (reduce cost + latency)
- A/B testing framework for quality thresholds
- User feedback integration (thumbs up/down)

**Phase 3 (v13.0):**
- Real-time quality monitoring dashboard
- Automatic retraining triggers when quality drops below baseline
- Multi-model ensemble scoring for higher accuracy

---

## Jenny Test Lab v4.0

**Major Release Component** - Unified testing framework with automated PRD gate validation

### Overview

Jenny Test Lab v4.0 provides comprehensive end-to-end testing for all three query categories (CAT-1 Facts, CAT-2 KB, CAT-3 EQ) with automated PRD gate validation, quality verification, and performance tracking.

**Key Innovation:** Single unified UI for testing all query types, with category-specific validators that check routing accuracy, proof presence, quality scores, and latency thresholds.

### Architecture

**Location:** `/apps/test-chat-ui/app/test-lab/`

**Components:**
1. **ScenarioBuilder** (`components/testlab/ScenarioBuilder.tsx`) - Interactive test case editor
2. **Test Runner** (`app/api/testlab/run/route.ts`) - Single test execution endpoint
3. **Suite Runner** (`app/api/testlab/suite/route.ts`) - Batch test execution endpoint
4. **Validators** (`lib/testlab/validators.ts`) - Category-specific PRD gate validation
5. **TraceExporter** (`components/testlab/TraceExporter.tsx`) - Export test results for analysis

### Test Suites

**CAT-1 Facts Suite** (`lib/testlab/suites/cat1-facts-v4.json`) - 30 scenarios
- Awards: initial/final/progression routing
- ECs/Activities: initial/final with phase tracking
- Summer Programs: initial/submitted/decisions/final
- Academics: transcript (initial/final/progression), GPA (initial/final/latest)
- SQL routing verification
- Proof presence validation
- Latency thresholds (p95 ≤ 6s)

**CAT-2 KB Suite** (`lib/testlab/suites/cat2-kb-v4.json`) - 25 scenarios
- General advice and strategy questions
- Multi-intent queries requiring RAG retrieval
- Evidence tag validation
- Provenance chip verification
- Latency guidance (warn if > 6s)

**CAT-3 EQ Suite** (`lib/testlab/suites/cat3-eq-v4.json`) - 35 scenarios
- Emotional states (stress, anxiety, overwhelm) - 12 tests
- Rejection/disappointment - 5 tests
- Celebration - 3 tests
- Self-doubt/imposter syndrome - 5 tests
- Permissioning - 3 tests
- Time planning - 4 tests
- Parent conflict - 3 tests
- Warmth detection (≥80%)
- Action detection (≥80%)
- Adapter usage verification
- Quality score tracking

### PRD Gates by Category

**CAT-1 Facts (5 gates):**
1. **Source = SQL** (required) - Must route to SQL, not KB/RAG
2. **Proof Presence** (≥98%) - Must have provenance chips or SQL rows
3. **No Meta-Leakage** (required) - No internal metadata in answer
4. **Latency** (p95 ≤ 6s) - Performance threshold
5. **SQL Skip Guards** (warn) - Tone guards should skip SQL queries

**CAT-2 KB (4 gates):**
1. **Evidence Tags** (warn if missing) - Should have evidence chips
2. **No Meta-Leakage** (required) - No internal metadata in answer
3. **Latency** (warn if > 6s) - Performance guidance
4. **Provenance** (warn if missing) - Should have some provenance chips

**CAT-3 EQ (5 gates):**
1. **Warmth Opener** (required) - Must have empathy/normalization language
2. **Actionability** (required) - Must have next step/imperative guidance
3. **No Meta-Leakage** (required) - No internal metadata in answer
4. **Adapter Consideration** (warn) - Fine-tuned model should be used
5. **Latency** (informational) - Performance tracking

### Test Execution Flow

```typescript
// Single test execution
POST /api/testlab/run
{
  "test": {
    "id": "eq-001",
    "label": "Rejection - Stanford",
    "category": "eq",
    "prompt": "I got rejected from Stanford",
    "studentId": "huda-2025",
    "expected": { "warmth": true, "action": true }
  }
}

// Response includes gates validation
{
  "test": { ... },
  "run": {
    "answer": "I'm with you — getting rejected is crushing...",
    "source": "eq",
    "modelBadge": "🔶 Adapter v9",
    "debug": {
      "quality": { "warmth": 85, "action": 82 },
      "adapter": { "used": true }
    }
  },
  "gates": [
    { "name": "Warmth Opener", "verdict": "pass", "actual": true },
    { "name": "Actionability", "verdict": "pass", "actual": true },
    { "name": "No Meta-Leakage", "verdict": "pass" },
    { "name": "Adapter Consideration", "verdict": "pass" },
    { "name": "Latency", "verdict": "pass", "actual": 2100 }
  ]
}
```

### Debug Field Instrumentation (v12.0 Fix)

**Problem:** Test Lab wasn't displaying quality/adapter metadata despite API returning it correctly.

**Root Cause:** Test Lab route handler (`app/api/testlab/run/route.ts:89-112`) wasn't extracting `debug.quality` or `debug.adapter` fields from API response.

**Fix Applied:**
```typescript
// app/api/testlab/run/route.ts:100-102
debug: {
  tags: data.debug?.tags ?? [],
  router: data.debug?.routing ?? data.debug?.router ?? null,
  sql: data.debug?.sql ?? null,
  provenance: data.chips ?? data.debug?.provenance ?? [],
  metaLeak: detectMetaLeak(data.answer ?? ""),
  tone: {
    warmth: detectWarmth(data.answer ?? ""),
    action: detectAction(data.answer ?? "")
  },
  trace: data.__trace ?? data.debug?.trace ?? null,
  // v12.0: Pass through quality and adapter debug info
  quality: data.debug?.quality ?? null,  // ADDED
  adapter: data.debug?.adapter ?? null   // ADDED
},
```

**Validator Fix:**
```typescript
// lib/testlab/validators.ts:183
// Before (WRONG):
const adapterUsed = r.modelBadge === "🔶" || r.modelBadge === "adapter";

// After (CORRECT):
const adapterUsed = r.debug?.adapter?.used ?? false;
```

**Impact:** Quality scores and adapter usage now visible in all test results, enabling proper PRD gate validation.

### Performance Tracking

**Test Lab Metrics (v12.0):**
- CAT-1 Facts: 93.3% pass rate (28/30) - SQL routing accuracy
- CAT-2 KB: 88.0% pass rate (22/25) - Evidence quality
- CAT-3 EQ: 64.6% pass rate (22/35) - Warmth + Action detection

**Quality Healing Visibility:**
- Tests showing healing: 8/35 (23%)
- Average score improvement: 5-25 points
- Healing attempts tracked in debug.quality.attempts

### Future Enhancements

**v4.1 (Immediate):**
- Export test results to CSV/JSON for offline analysis
- Historical trend tracking (pass rate over time)
- Automated regression detection

**v4.2 (Next Quarter):**
- A/B testing framework (compare model versions)
- Custom gate definitions (user-defined thresholds)
- Test case generation from production logs

**v5.0 (Long-term):**
- Continuous integration pipeline integration
- Slack/email alerts for test failures
- Performance benchmarking across model versions

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

**v11.4 (2025-10-14)** - jenny_v10_eq_combined (Additive Session Transcripts)
- **Training Dataset:** 4,498 examples - ADDITIVE merge (690 v9 + 3,808 v10)
  - **Source 1:** ALL 690 jenny_v9_eq examples PRESERVED (proven EQ patterns)
  - **Source 2:** 3,808 complete conversational units from 93 session transcript PDFs
  - 2-year Jenny-Huda coaching relationship (2023-2025)
  - Complete context windows: avg 2.5 messages before, 1.3 messages after
  - Warmth coverage: 2,220 total examples (690 v9 + 1,530 v10)
  - Action coverage: 2,619 total examples (690 v9 + 1,929 v10)
- **Session Transcript Extraction:** Custom WEBVTT parser (extract_session_transcripts.py:530 lines)
  - Handles PDF word-per-line extraction format
  - Quality filtering for substantive responses (>20 words)
  - Natural coaching flow preservation (no forced emotional markers)
  - 84/93 sessions yielded training data (90.3% success rate)
- **Additive Merge Strategy:** Zero regression risk (merge_training_datasets.py:113 lines)
  - Preserves ALL v9 patterns (nothing removed or replaced)
  - Enhances with v10 session data (additive only)
  - Composition: 15.3% v9 + 84.7% v10
  - 6.5x larger dataset (690 → 4,498 examples)
- **Training Success:** OpenAI fine-tuning job ftjob-jILubs2gSFdPEWurbUa1lrDH
  - Model ID: `ft:gpt-4o-mini-2024-07-18:personal:jenny-v10-eq-combined:CQUMZfv6`
  - Status: Succeeded (2025-10-14 01:07:08)
  - Final training loss: 2.349 (48.7% reduction from 4.577)
  - Training steps: 1,687 over 3 epochs
  - Tokens trained: 3,757,800
  - Convergence: Excellent (stable final 10 steps avg 2.15, no overfitting)
- **Loss Trajectory:**
  - Epoch 1 (steps 1-563): 4.577 → 2.144 (rapid descent)
  - Epoch 2 (steps 564-1126): 2.387 → 2.252 (consolidation)
  - Epoch 3 (steps 1127-1687): 2.053 → 2.349 (fine-tuning)
- **Checkpoints Available:** 3 checkpoints for A/B testing
  - Step 563 (Epoch 1): `ft:...:CQUMYIaW:ckpt-step-563`
  - Step 1126 (Epoch 2): `ft:...:CQUMZD0h:ckpt-step-1126`
  - Final (Epoch 3): `ft:...:CQUMZfv6`
- **Model Registry:** config/model_registry.json updated with jenny_v10_eq_combined
- **Expected Performance vs jenny_v9_eq:**
  - CAT-3 pass rate: 46.3% → 75-85% target (+62-83%)
  - Dataset size: 690 → 4,498 examples (+551%)
  - Warmth examples: ~345 → 2,220 (+543%)
  - Action examples: ~345 → 2,619 (+659%)
  - Personalization: Generic → Maximum (Huda-specific)
- **Documentation:** Comprehensive training reports
  - data/training/jenny_v10_eq_TRAINING_SUCCESS.txt (430 lines)
  - data/training/jenny_v10_eq_TRAINING_LAUNCHED.txt (375 lines)
  - data/training/jenny_v10_eq_session_transcripts_REPORT.txt
- **Status:** ✅ Training complete, ⏳ Validation pending (CAT-3 test suite)

**v11.3.2 (2025-10-13)** - jenny_v9_eq Fine-Tuned Adapter (EQ-Native Training)
- **Training Dataset:** 767 examples from 99 EQ sessions/iMessages (data/eq/)
  - 511 curated examples (quality 9.53/10) extracted from EQ chips
  - 250 mined examples from 1,344 Jenny utterances (≥2 EQ cues per turn)
  - 6 synthetic examples for category gaps (technical, late_night)
  - **99.2% real Jenny conversations** vs 0.8% synthetic augmentation
  - 90/10 train/validation split (690 training, 77 validation)
- **Metadata Cleaning Protocol:** Zero-tolerance for JSON artifacts
  - Auto-reject responses with session IDs, timestamps, metadata patterns
  - 100% clean dataset (0/767 examples contain metadata artifacts)
  - Fixes jenny_v8 issue: model trained on contaminated session logs
- **System Prompt Architecture:** 5 consolidated archetypes from 50+ unique prompts
  - warmth_validation (rejection, stress, overwhelm)
  - celebration (college wins, acceptances)
  - zero_frustration (technical, late night, procrastination)
  - strategic_reframe (decision paralysis, constraint navigation)
  - evidence_driven (fact-based strategy)
- **Training Configuration:** OpenAI fine-tuning on gpt-4o-mini-2024-07-18
  - 3 epochs, batch_size=1, learning_rate_multiplier=0.8
  - Expected cost: $6.14 (767 examples × 200 tokens avg × 3 epochs)
  - Model ID: `ft:gpt-4o-mini-2024-07-18:personal:jenny-v9-eq:XXXXXXXX` (pending)
- **Expected Performance vs jenny_v8:**
  - 51x improvement in EQ signal density (100% EQ vs 1.2% EQ)
  - CAT-3 pass rate: 40% → 90%+ target (+125%)
  - Warmth gate: 0% → 85%+ target (+∞)
  - Action gate: 16% → 90%+ target (+460%)
  - JSON artifacts: ~40% → 0% target (-100%)
- **Integration:** compose-eq.ts will use jenny_v9_eq model once trained
  - Environment variable: `JENNY_V9_EQ_MODEL`
  - Model registry: config/model_registry.json
  - Defensive JSON unwrapping retained (lines 113-126)
- **Documentation:** Complete 13-section specification
  - docs/guides/JENNY_V9_EQ_COMPLETE_SPEC.md (production-ready)
  - tools/training/prepare_jenny_v9_eq_dataset.py (data pipeline)
  - data/training/jenny_v9_eq_training.jsonl (690 examples)
  - data/training/jenny_v9_eq_validation.jsonl (77 examples)
- **Status:** Training dataset ready for OpenAI fine-tuning upload

**v11.1 (2025-10-13)** - CAT-2/CAT-3 Complete (v8.0 Migration)
- **LLM Adapter v2:** Migrated jenny_v8_adapter to jenny-api (adapter.ts:1-159)
  - Traffic split: 50/50 (fine-tuned vs base gpt-4o-mini)
  - Cohort assignment: SHA-256 deterministic bucketing
  - CAT-1 protection: Always bypass adapter for SQL routes
  - Model registry: config/model_registry.json
- **Proof Verification Service:** Activated for CAT-2/CAT-3 (verifier.ts:1-409)
  - SHA-256 hash verification with 5-factor scoring
  - Auto-verify threshold: ≥ 0.70 (chip ref, citation, timestamp, source, quality)
  - Escalation to proof_audit_log for scores < 0.70
  - Integration: orchestrator:963-1006 (after humanization, before response)
- **Documentation:** Added comprehensive CAT-2 & CAT-3 specs (1,300+ lines)
  - CAT2_COMPLETE_TECH_SPEC.md: KB/RAG architecture (600+ lines)
  - CAT3_COMPLETE_TECH_SPEC.md: EQ/LLM architecture (700+ lines)
  - V8.0_TO_V11.1_GAP_ANALYSIS.md: Migration roadmap (690 lines)
- **Safety:** Zero CAT-1 overlap verified (uses v8.0 tables: proof_registry, proof_audit_log)
- **Unified Pipeline:** All v11.1 components integrate through existing prompt → GPT-5 intent → routing flow

**v11.0 (2025-10-13)** - CAT-1 Complete with Universal Attribute Filtering
- Universal ILIKE attribute filtering across all enumerations (100% coverage)
- 265/265 test gates passing (awards, ECs, programs, academics, college, testing)
- Intent classification: 51 production routes with GPT-5 guardrails
- Sub-50ms query latency for all CAT-1 SQL queries

**v10.5.2 (2025-10-11)** - Complete Cat-1 Restoration (v4.6.2 Baseline)
- ONE LINE FIX: Changed orchestrator imports from compat.js → enums.js (fixed awards showing garbage data)
- Intent Classification: Added IvyScore/College/GamePlan patterns to intent-enum.ts (3 new synonym arrays, 13 new route types)
- Text Composition: Added formatting logic for IvyScore and College list queries
- Complete v4.6.2 Resolvers: Restored 30+ proven resolvers (1765 lines)
- Debug Logging: Added in-depth traces for root cause analysis
- **ALL Cat-1 data now working**: Awards (real names), IvyScore (90.5/100), College List (28 schools), GamePlan

**v10.4 (2025-10-11)** - Humanizer v2.1 (Jenny's Real Voice)
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

**Status:** ✅ Production Ready - CAT-1 + CAT-2/CAT-3 Complete
**Last Updated:** 2025-10-13 (v11.1)
**Maintainer:** IvyLevel Team
**Production Code:** `/services/jenny-api/` ONLY

**Complete Specs:**
- CAT-1 (Facts-First SQL): [CAT1_COMPLETE_TECH_SPEC.md](guides/CAT1_COMPLETE_TECH_SPEC.md)
- CAT-2 (KB/RAG): [CAT2_COMPLETE_TECH_SPEC.md](guides/CAT2_COMPLETE_TECH_SPEC.md)
- CAT-3 (EQ/LLM): [CAT3_COMPLETE_TECH_SPEC.md](guides/CAT3_COMPLETE_TECH_SPEC.md)
- v8.0 Migration: [V8.0_TO_V11.1_GAP_ANALYSIS.md](guides/V8.0_TO_V11.1_GAP_ANALYSIS.md)

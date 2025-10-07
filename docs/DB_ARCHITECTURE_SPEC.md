# Master Database Architecture & Technical Specification
**IvyLevel Platform v10 - Jenny Agentic AI**

**Document Status:** Living Specification
**Last Major Update:** 2025-10-07 14:30 PST
**Version:** v2.3 - Universal Routing System v1.3 (Production-Ready)
**Previous:** v1.2 (KBv6 Assessment+GamePlan + Legacy Cleanup) + v5.5 (KB Intel Chips + Vector DB) + v4.6.1 (College + Scholarship)

---

## Table of Contents
1. [Overview](#overview)
2. [Core Architecture Patterns](#core-architecture-patterns)
3. [Core Schema](#core-schema)
4. [Universal Ledger (KB Items)](#universal-ledger-kb-items)
5. [Enumeration Tables](#enumeration-tables)
6. [Vector Database (Pinecone) - v5.5](#vector-database-pinecone---v55)
7. [Views & Queries](#views--queries)
8. [Functions & Helpers](#functions--helpers)
9. [Data Types & Enums](#data-types--enums)
10. [Indexes & Performance](#indexes--performance)
11. [Migration History](#migration-history)
12. [Incremental Updates](#incremental-updates)

---

## Overview

The Jenny Agentic AI database follows a **hybrid architecture** combining:
- **PostgreSQL (Primary)**: Structured data with temporal resolution
  - Universal Vitals Model: Append-only temporal facts for student data
  - Universal KB Items Ledger: Single table for all targets and outcomes with state machine
  - Enumeration Tables: Domain-specific optimized tables for phase-based tracking
  - Outcomes & Interactions: Event sourcing for student journey
- **Pinecone (Vector DB)**: Intel Chips knowledge base (v1.2)
  - 973 vectors across 4 KBv6 families (sessions+exec: 924, iMessage: 40, assessment+gameplan: 9)
  - Federated search with namespace isolation and guard protection
  - Metadata-rich embeddings for reranking
  - Legacy cleanup complete (100% KBv6)

**Key Principles:**
- Facts-First: SQL-deterministic queries before RAG fallback
- Temporal Resolution: Support for first/latest/nth/as-of queries
- Provenance Tracking: All data linked to sources with evidence chains
- State Machines: Explicit lifecycle states (Planned → In Transit → Submitted → Outcome → Archived)
- Vector Search: Semantic retrieval for open-ended queries

---

## Core Architecture Patterns

### 1. Universal Vitals Model (v3.0)
**Purpose:** Atomic, append-only facts with temporal ordering

**Key Tables:**
- `students` - Student registry
- `sources` - Provenance tracking (documents, transcripts, submissions)
- `jtbd` - Jobs To Be Done (goals/phases)
- `vital_facts` - Atomic facts (SAT scores, GPAs, dates)
- `outcomes` - Event outcomes (admissions, awards won, program decisions)
- `interactions` - Student-coach conversation history
- `evidence_links` - Source evidence chips

**Pattern:** Never update facts, only append new ones with timestamps

---

### 2. Universal KB Items Ledger (v3.0)
**Purpose:** Single table for all student targets and outcomes with explicit state machine

**Table:** `kb_items`

**State Machine:**
```
Planned → In Transit → Submitted → Outcome → Archived
   ↓          ↓            ↓           ↓
 Target   Working     Submitted    Result
```

**Supported Entity Types:**
- `Award_Competition` - Awards and competitions
- `EC_Project` / `activity` - Extracurricular activities
- `Test` - Standardized tests
- `program` / `summer_program` - Summer programs
- `narrative` - Student narrative/story
- `Application` - College applications (future)
- `Decision` - Admissions decisions (future)

**Pattern:** Single source of truth with flexible schema via JSON and state columns

---

### 3. Enumeration Tables (v3.2)
**Purpose:** Phase-based tracking with deterministic SQL queries

**Tables:**
- `award_targets_enum` - Award targets (initial/revised/final)
- `ec_targets` - EC targets (initial/revised/final)
- `narrative_targets` - Student narratives
- `plan_events` - Execution timeline events
- `sat_timeline_enum` - SAT score progression

**Pattern:** Denormalized views for fast temporal queries (first/latest/as-of)

---

## Core Schema

### students
**Purpose:** Student registry

```sql
CREATE TABLE students (
  student_id       TEXT PRIMARY KEY,
  full_name        TEXT,
  grad_year        INT,
  created_ts       TIMESTAMPTZ DEFAULT now()
);
```

**Key Fields:**
- `student_id`: Unique identifier (e.g., `huda-2025`)
- `grad_year`: Graduation year

---

### sources
**Purpose:** Document provenance tracking

```sql
CREATE TABLE sources (
  source_id        TEXT PRIMARY KEY,
  student_id       TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  source_type      TEXT NOT NULL CHECK (source_type IN (
                     'transcript','exec_doc','imessage','artifact','submission','email','other'
                   )),
  title            TEXT NOT NULL,
  date_start       TIMESTAMPTZ,
  date_end         TIMESTAMPTZ,
  drive_link       TEXT,
  local_name       TEXT,
  notes            TEXT,
  created_ts       TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- `idx_sources_student` ON (student_id)

**Source Types:**
- `transcript` - Academic transcripts
- `exec_doc` - Execution documents (GamePlan, Common App)
- `imessage` - iMessage conversations
- `artifact` - Student work artifacts
- `submission` - Application submissions
- `email` - Email communications
- `other` - Miscellaneous sources

**Pattern:** All facts/outcomes reference a source for full provenance

---

### jtbd (Jobs To Be Done)
**Purpose:** Student goals and phases

```sql
CREATE TABLE jtbd (
  jtbd_id          TEXT PRIMARY KEY,
  student_id       TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  jtbd_title       TEXT NOT NULL,
  phase            TEXT,
  date_start       TIMESTAMPTZ,
  date_end         TIMESTAMPTZ,
  domain           lifecycle_domain,
  synopsis         TEXT,
  created_ts       TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- `idx_jtbd_student` ON (student_id)

**Domains:** (see `lifecycle_domain` enum)
- application, award, test, essay, recommender, ec_portfolio, aid_css_fafsa, ops_policy

---

### vital_facts
**Purpose:** Atomic, append-only temporal facts

```sql
CREATE TABLE vital_facts (
  fact_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id       TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  kind             TEXT NOT NULL REFERENCES fact_kinds(kind),
  value            TEXT NOT NULL,
  unit             TEXT,
  fact_date        TIMESTAMPTZ NOT NULL,
  confidence       fact_confidence NOT NULL DEFAULT 'high',
  source_id        TEXT NOT NULL REFERENCES sources(source_id) ON DELETE RESTRICT,
  created_ts       TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- `idx_facts_student_date` ON (student_id, fact_date DESC)
- `idx_facts_kind` ON (kind)

**Fact Kinds:** (see `fact_kinds` table)
- `sat_total_score`, `sat_math`, `sat_ebrw`
- `act_composite`
- `gpa_weighted`, `gpa_unweighted`
- `class_rank_percentile`
- `award_won`, `award_level`
- Many more (extensible via fact_kinds table)

**Pattern:** Never delete or update - only append with new fact_date

---

### outcomes
**Purpose:** Event outcomes (admissions, awards, program decisions)

```sql
CREATE TABLE outcomes (
  outcome_id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  jtbd_id              TEXT REFERENCES jtbd(jtbd_id) ON DELETE SET NULL,
  student_id           TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  type                 outcome_type NOT NULL,
  admission_result     admission_result,
  lifecycle_item_id    TEXT REFERENCES lifecycle_items(item_id) ON DELETE SET NULL,
  details_json         JSONB,
  occurred_at          TIMESTAMPTZ,
  source_id            TEXT REFERENCES sources(source_id) ON DELETE SET NULL,
  created_ts           TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- `idx_outcomes_student_date` ON (student_id, occurred_at DESC)
- `idx_outcomes_jtbd` ON (jtbd_id)
- `idx_outcomes_programs` ON (student_id, type, occurred_at)

**Outcome Types:** (see `outcome_type` enum)
- `admission` - College admission decision
- `award` - Award won
- `program` / `program_application` - Summer program decision
- `milestone`, `result`, `submission`, etc.

**Details JSON Fields (varies by type):**
- Awards: `{"award_name":"...", "tier":"national|regional|school"}`
- Programs: `{"program_name":"...", "provider":"...", "decision":"admit|deny|waitlist", "attending": true|false}`
- Admissions: `{"school":"...", "program":"...", "decision":"..."}`

---

### interactions
**Purpose:** Student-coach conversation history

```sql
CREATE TABLE interactions (
  snippet_id       TEXT PRIMARY KEY,
  jtbd_id          TEXT NOT NULL REFERENCES jtbd(jtbd_id) ON DELETE CASCADE,
  student_id       TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  occurred_at      TIMESTAMPTZ NOT NULL,
  channel          TEXT NOT NULL,
  user_ask         TEXT,
  jenny_reply      TEXT,
  tactic_name      TEXT REFERENCES tactic_kinds(name),
  framework        TEXT REFERENCES framework_kinds(name),
  tags             TEXT[],
  source_id        TEXT REFERENCES sources(source_id) ON DELETE SET NULL,
  confidence       fact_confidence,
  excluded_from_tactic_scoring BOOLEAN NOT NULL DEFAULT FALSE,
  created_ts       TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- `idx_interactions_student_date` ON (student_id, occurred_at DESC)
- `idx_interactions_jtbd` ON (jtbd_id)
- `idx_interactions_tactic` ON (tactic_name)

**Channels:** chat, email, raw_transcript, imessage

**Tactics & Frameworks:** See reference tables `tactic_kinds`, `framework_kinds`

---

### evidence_links
**Purpose:** Source evidence chips for facts/interactions/outcomes

```sql
CREATE TABLE evidence_links (
  evidence_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id        TEXT NOT NULL REFERENCES sources(source_id) ON DELETE RESTRICT,
  snippet_id       TEXT,
  offset_start     INT,
  offset_end       INT,
  quote            TEXT,
  created_ts       TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- `idx_evidence_source` ON (source_id)

**Pattern:** Link to sources with optional text offsets for precise citations

---

## Universal Ledger (KB Items)

### kb_items
**Purpose:** Universal ledger for all student targets and outcomes

---

## KB Intel Tables (v5.4)

### Overview
**Purpose:** Store coaching intelligence chips from INTEL JSONs with metadata-rich schema for filtering and future contributor mode.

**Key Features:**
- 7 chip types: tactic, micro_moment, jtbd, framework, reflection, success_path, style
- Metadata-rich: award, framework, activity, phase, week as top-level columns
- Content-based deduplication via content_hash
- Vector search: FAISS (local) + Pinecone (production) with blue/green migration

### kb_sources
```sql
CREATE TABLE IF NOT EXISTS kb_sources (
  source_id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  meta JSONB
);
```

### kb_docs
```sql
CREATE TABLE IF NOT EXISTS kb_docs (
  doc_id TEXT PRIMARY KEY,
  student_id TEXT,
  source_kind TEXT CHECK (source_kind IN ('TRANS-INTEL','EXEC-INTEL','IMSG-INTEL','DOCX-RECOVERED','RAW','OTHER')),
  phase TEXT,
  week INT,
  doc_date DATE,
  title TEXT,
  path TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### kb_chips (v5.4 - Metadata-Rich)
```sql
CREATE TABLE IF NOT EXISTS kb_chips (
  chip_id TEXT PRIMARY KEY,                -- "chip_{sha256(text+meta)}"
  content_hash TEXT UNIQUE,                -- SHA256 for deduplication
  doc_id TEXT REFERENCES kb_docs(doc_id) ON DELETE CASCADE,
  chip_type TEXT CHECK (chip_type IN ('tactic','micro_moment','jtbd','framework','reflection','success_path','style')),
  text TEXT NOT NULL,                      -- Full chip content
  tokens INT,
  student_id TEXT,
  source_kind TEXT,
  phase TEXT,
  week INT,
  chip_date DATE,
  award TEXT,                              -- For filtering: e.g. "NCWIT"
  activity TEXT,                           -- For filtering: e.g. "Empowering AI"
  framework TEXT,                          -- For filtering: e.g. "168"
  metrics TEXT[] DEFAULT '{}',
  confidence NUMERIC,                      -- Extraction confidence 0.0-1.0
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kb_chips_doc ON kb_chips(doc_id);
CREATE INDEX IF NOT EXISTS idx_kb_chips_type ON kb_chips(chip_type);
CREATE INDEX IF NOT EXISTS idx_kb_chips_student ON kb_chips(student_id);
CREATE INDEX IF NOT EXISTS idx_kb_chips_award ON kb_chips(award) WHERE award IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kb_chips_framework ON kb_chips(framework) WHERE framework IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kb_chips_date ON kb_chips(chip_date) WHERE chip_date IS NOT NULL;
```

**Design Rationale:**
- **Metadata-first**: Top-level columns (award, framework, activity) enable fast SQL + Pinecone filtering
- **Content-based dedup**: content_hash UNIQUE prevents duplicates across re-ingestions
- **Text-based**: Stores full text instead of structured JSON for better embedding quality
- **Future-proof**: Supports contributor mode (coaches/students submit tactics)

---

### kb_items (Student Targets)
**Purpose:** Universal ledger for all student targets and outcomes

```sql
CREATE TABLE kb_items (
  item_id            TEXT PRIMARY KEY,
  student_id         TEXT NOT NULL,
  item_type          TEXT NOT NULL,
  subtype            TEXT,
  title_name         TEXT NOT NULL,
  tier1_state        TEXT NOT NULL,
  tier2_substate     TEXT,
  status_detail      TEXT,
  key_metric_type    TEXT,
  key_metric_value   TEXT,
  key_metric_unit    TEXT,
  deadline_date      DATE,
  event_date         DATE,
  submit_date        DATE,
  outcome_date       DATE,
  owner              TEXT,
  cadence            TEXT,
  evidence_links     TEXT[],
  source_ref         TEXT NOT NULL,
  confidence         TEXT DEFAULT 'medium',
  created_ts         TIMESTAMPTZ DEFAULT now(),
  updated_ts         TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT kb_items_tier1_state_check
    CHECK (tier1_state IN ('Planned', 'In Transit', 'Submitted', 'Outcome', 'Archived')),
  CONSTRAINT kb_items_confidence_check
    CHECK (confidence IN ('high', 'medium', 'low'))
);
```

**Indexes:**
- `kb_items_by_student` ON (student_id)
- `kb_items_type_state` ON (item_type, tier1_state, outcome_date, event_date, submit_date)
- `kb_items_source_ref` ON (source_ref)
- `kb_items_temporal` ON (student_id, item_type, COALESCE(outcome_date, event_date, submit_date, deadline_date))

---

### Item Types & Subtypes

**Award_Competition:**
- Subtype: National, Regional, School-Level
- States: Planned → In Transit → Submitted → Outcome
- Key Metrics: placement, tier

**EC_Project / activity:**
- Subtype: Computer/Technology, Journalism, Research, Sports, etc.
- States: Planned → In Transit → Submitted → Outcome
- Key Metrics: hours, leadership_role, articles_published

**program / summer_program:**
- Subtype: Provider name (RSI, TASP, SSP, etc.)
- States: Planned → Submitted → Outcome
- Key Metrics: session, site

**Test:**
- Subtype: SAT, ACT, AP, SAT Subject
- States: Planned → In Transit (prep) → Outcome
- Key Metrics: score_total, score_math, score_ebrw

**narrative:**
- Subtype: aptitude, passion, advocacy, framing, why_statement
- States: Planned → Submitted
- Key Metrics: N/A (content stored in title_name or status_detail)

**Application (future):**
- Subtype: UC, Common App, Coalition
- States: Planned → In Transit → Submitted → Outcome

**Decision (future):**
- Subtype: College name
- States: Outcome
- Key Metrics: decision (admit/deny/waitlist)

---

### State Machine Details

**tier1_state:**
- `Planned` - Target/goal set
- `In Transit` - Work in progress
- `Submitted` - Application/submission complete
- `Outcome` - Result received
- `Archived` - No longer active

**tier2_substate (examples):**
- Awards: `Targeted`, `Applying`, `Finalist`, `Winner`, `Honorable Mention`
- ECs: `Planned`, `Active`, `Leadership`, `Published`
- Programs: `Researching`, `Applying`, `Admitted`, `Attending`
- Tests: `Prepping`, `Registered`, `Completed`

---

## Enumeration Tables

### award_targets_enum
**Purpose:** Phase-based award targets (initial/revised/final)

```sql
CREATE TABLE award_targets_enum (
  id             BIGSERIAL PRIMARY KEY,
  student_id     TEXT NOT NULL,
  phase          TEXT NOT NULL CHECK (phase IN ('initial','revised','final')),
  item_label     TEXT NOT NULL,
  as_of          DATE,
  source_id      TEXT,
  jtbd_id        TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),

  UNIQUE(student_id, phase, item_label)
);
```

**Indexes:**
- `idx_award_targets_enum_sid_phase` ON (student_id, phase)
- `idx_award_targets_enum_asof` ON (as_of)

**Phases:**
- `initial` - GamePlan targets
- `revised` - Mid-year updates
- `final` - Common App submitted targets

**Migration:** `/apps/api/db/migrations/2025-10-03-canonical-targets-enumerations.sql`

---

### ec_targets
**Purpose:** Phase-based EC targets

```sql
CREATE TABLE ec_targets (
  id             BIGSERIAL PRIMARY KEY,
  student_id     TEXT NOT NULL,
  phase          TEXT NOT NULL CHECK (phase IN ('initial','revised','final')),
  item_label     TEXT NOT NULL,
  as_of          DATE,
  source_id      TEXT,
  jtbd_id        TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),

  UNIQUE(student_id, phase, item_label)
);
```

**Indexes:**
- `idx_ec_targets_sid_phase` ON (student_id, phase)

---

### narrative_targets
**Purpose:** Student narratives (initial/final)

```sql
CREATE TABLE narrative_targets (
  id             BIGSERIAL PRIMARY KEY,
  student_id     TEXT NOT NULL,
  narrative      TEXT NOT NULL,
  as_of          DATE,
  source_id      TEXT,
  jtbd_id        TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- `idx_narrative_targets_sid` ON (student_id)

---

### plan_events
**Purpose:** Execution timeline events from interactions

```sql
CREATE TABLE plan_events (
  id             BIGSERIAL PRIMARY KEY,
  student_id     TEXT NOT NULL,
  as_of          DATE NOT NULL,
  event          TEXT NOT NULL,
  jtbd_id        TEXT,
  snippet_id     TEXT,
  source_id      TEXT,
  text           TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- `idx_plan_events_sid_date` ON (student_id, as_of)
- `idx_plan_events_kind` ON (event)

**Event Types:**
- `award_won` - Award outcome
- `application_submitted` - App submitted
- `interview_scheduled` - Interview booked
- `lor_activity` - LOR requested/received
- `milestone` - General milestone

---

### sat_timeline_enum
**Purpose:** SAT score progression with temporal ordering

```sql
CREATE TABLE sat_timeline_enum (
  id             BIGSERIAL PRIMARY KEY,
  student_id     TEXT NOT NULL,
  as_of          DATE NOT NULL,
  numeric_value  INT NOT NULL,
  type           TEXT,
  confidence     TEXT,
  source_id      TEXT,
  raw_name       TEXT,
  raw_value      TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- `idx_sat_timeline_enum_sid_date` ON (student_id, as_of)

**Types:**
- `official` - Official SAT
- `practice` - Practice test
- `unknown` - Type not specified

---

## Vector Database (Pinecone) - v1.2

**Release:** 2025-10-07 (v1.2 updated)
**Status:** Production
**Purpose:** Semantic search over Intel Chips knowledge base

### Architecture Overview

The vector database stores **Intel Chips** - high-density knowledge artifacts extracted from Jenny's complete engagement lifecycle: pre-assessment, weekly sessions, execution frameworks, and micro-interactions. These chips support semantic retrieval for open-ended queries that cannot be answered via SQL.

**Key Metrics:**
- **Total Vectors:** 973 (v1.2 - 100% KBv6, legacy cleaned)
- **Embedding Model:** `text-embedding-3-large` (3072 dimensions)
- **Metric:** Cosine similarity
- **Index:** `jenny-v3-3072-093025`
- **Namespaces:** 3 KBv6 namespaces (sessions+exec, iMessage, assessment+gameplan)
- **Security:** Namespace guard (`PINECONE_ALLOWED_NAMESPACES`) blocks unauthorized access

### Four-Family Schema (KBv6)

| Family | Namespace | Count | Chip Types | ID Format |
|--------|-----------|-------|------------|-----------|
| **Sessions+Exec** | `KBv6_2025-10-06_v1.0` | 924 | Framework, Strategy, Tactic, Result, Silver, Trust, Insight, Channel, Adaptation, Relatability, Framework_Chip | `W024-FRAMEWORK-001`, `W001-FRAMEWORK-168HOUR` |
| **iMessage** | `KBv6_iMessage_2025-10-07_v1.0` | 40 | Message_Template_Chip, Tone_Cue_Chip, Escalation_Pattern_Chip, Micro_Tactic_Chip, Turnaround_Case_Chip | `IMSG-ESCALATIONPATTERNCHIP-abc123` |
| **Assessment+GamePlan** | `KBv6_Assessment_2025-10-07_v1.0` | 9 | Insight_Chip, Trust_Chip, Strategy_Chip, Silver_Bullet_Chip | `ASSESS-INSIGHT-001`, `GAMEPLAN-STRATEGY-001` |

**Timeline Boundaries:**
- **Assessment** (pre-execution): Rapid assessment, strengths/gaps mapping, constraint identification
- **GamePlan** (pre-execution): Tactics, portfolio architecture, identity synthesis
- **W001 Execution** (post-assessment/gameplan): 168-hour framework, weekly planning cadence

### Vector Schema

**Pinecone Vector Format:**
```json
{
  "id": "W024-FRAMEWORK-001",
  "values": [0.123, -0.456, ...],  // 3072 dimensions
  "metadata": {
    "chip_id": "W024-FRAMEWORK-001",
    "chip_family": "session",
    "type": "Framework_Chip",
    "week": "024",
    "phase": "P3-JUNIOR",
    "quality_score": 0.96,
    "confidence_score": 0.94,
    "content": "Assessment→Acceptance Ladder — A nine-rung execution...",
    "filename": "2023-06-21_W024_SessionNotes.pdf",
    "participants": ["Jenny", "Huda"],

    // iMessage chips only:
    "situation_tag": "deadline_crunch"  // 16 possible tags
  }
}
```

### Metadata Fields

**Common Fields (all chips):**
- `chip_id` (string) - Unique identifier
- `chip_family` (string) - "session", "exec", "imessage", "assessment", or "gameplan"
- `type` (string) - Chip type (Framework_Chip, Insight_Chip, etc.)
- `week` (string) - Week number or "IMSG"/"000"/"001" (for W001 exec chips)
- `phase` (string) - Student phase (P1-P5, EXEC, IMSG, FOUNDATION)
- `quality_score` (float) - Content quality (0.85-0.98)
- `confidence_score` (float) - Extraction confidence (0.85-0.95)
- `content` (string) - Full chip text (truncated to 500 chars in metadata)
- `filename` (string) - Source document
- `participants` (array) - ["Jenny", "Huda", ...]

**iMessage-Specific Fields:**
- `situation_tag` (string) - One of 16 situation tags:
  - `deadline_crunch`, `parent_pushback`, `confidence_reset`
  - `recommender_outreach`, `blocker_unresponsive`, `time_management`
  - `scope_creep`, `application_clarification`, `health_crisis`
  - `schedule_conflict`, `offer_evaluation`, `scholarship_strategy`
  - `logistics_followup`, `essay_block`, `testing_strategy`, `interview_prep`
- `original_chip_id` (string) - Original ID before v3 transformation

### Chip Types Distribution

**Session Chips (877):**
- FRAMEWORK: 93 (structural playbooks)
- STRATEGY: 120 (multi-step approaches)
- TACTIC: 150 (concrete actions)
- RESULT: 85 (outcome examples)
- SILVER: 45 (high-impact silver bullets)
- TRUST: 120 (mindset/confidence resets)
- INSIGHT: 90 (key realizations)
- CHANNEL: 75 (communication strategies)
- ADAPTATION: 60 (course corrections)
- RELATABILITY: 39 (relatable examples)

**Execution Chips (46):**
- Framework_Chip: 46 (cross-week execution frameworks)
  - Assessment→Acceptance Ladder (9-rung framework)
  - Outcome Correlation Map (task-to-evidence mapping)
  - Narrative Architecture (thread weave)
  - Synthoria DNA Embedding (identity OS)
  - Proofpack Structure (artifacts & testimonials)

**iMessage Chips (40):**
- Message_Template_Chip: 12 (reusable scripts)
- Tone_Cue_Chip: 8 (emoji/tone guidance)
- Escalation_Pattern_Chip: 10 (progressive urgency)
- Micro_Tactic_Chip: 6 (quick-fix one-liners)
- Turnaround_Case_Chip: 4 (48-hour success stories)

### Federated Search

**Strategy:** Pool results from multiple namespaces, then rerank by score

**Query Flow:**
1. Embed query with `text-embedding-3-large`
2. Query each namespace in parallel (topK=10 per namespace)
3. Pool all results into single list
4. Sort by cosine similarity score
5. Return top-8 results

**Filter Options:**
- `source: 'both'` - Query all namespaces
- `source: 'sessions'` - Query sessions+exec only
- `source: 'imessage'` - Query iMessage only

**Implementation:** `services/jenny-api/src/services/kb_resolver.ts`

### Data Sources

**Session Chips:**
```
data/kb_intel_chips/chips/
├── w001_intel_chips_batch.json  (10 chips)
├── w002_intel_chips_batch.json  (10 chips)
...
└── w093_chips.json              (10 chips)
```

**Execution Chips:**
```
data/kb_intel_chips/exec-chips/
└── EXEC_Intel_Chips_Batch_v2.jsonl  (46 chips)
```

**iMessage Chips:**
```
data/kb_intel_chips/imsg-chips/
├── iMessage_Intel_Chips_Batch_v3.jsonl     (40 chips)
└── imsg_situations_taxonomy.json           (16 situation tags)
```

### Ingestion Pipeline

**Scripts:**
- `tools/ingest/embed_kb_v6_to_v8.py` - Embed sessions+exec chips
- `tools/ingest/embed_imsg_chips_v3.py` - Embed iMessage chips (with --overwrite)
- `tools/ingest/transform_imsg_chips_v3.py` - Transform v2→v3 (add situation_tag)
- `tools/ingest/validate_kb_v6_chips.py` - Validate KB v6 schema

**Workflow:**
```bash
# 1. Validate schema
python3 tools/ingest/validate_kb_v6_chips.py data/kb_intel_chips/chips/

# 2. Embed to Pinecone
python3 tools/ingest/embed_kb_v6_to_v8.py \
  --input data/kb_intel_chips/chips/ \
  --namespace KBv6_2025-10-06_v1.0

# 3. Verify counts
python3 tools/qa/check_vector_counts.py
```

### Quality Assurance

**QA Suite Location:** `tools/qa/`

**Components:**
1. **Smoke Tests** - 2 queries, 10 seconds
2. **Vector Count Validation** - Expected: 923 + 40
3. **Precision Probes** - 25 golden queries
4. **Federated Search Check** - Namespace isolation
5. **Drift Watch** - Count monitoring (alert if > 2% drift)
6. **Deployment Version Check** - Manifest validation
7. **Backup Utility** - Snapshot/rollback capability

**CI/CD:** `.github/workflows/kb-qa.yml`
- Smoke tests on PRs (blocks merge if fails)
- Full suite nightly
- Drift watch nightly

### Performance

**Query Latency (P90):**
- Single namespace: ~250ms
- Federated (both): ~450ms

**Precision (v5.5 baseline):**
- Sessions: Top-1 ≥ 0.50 on 78% probes
- iMessage: Top-1 ≥ 0.48 on 89% probes
- Top-3 coverage: 100% for both families

**Storage:**
- Pinecone vectors: ~12.3MB
- Metadata: ~2MB
- Total: ~14.5MB

### Operational Procedures

**Daily:**
- Run smoke tests before deploy: `./tools/qa/smoke_tests.sh`
- Check deployment version: `python3 tools/qa/check_deployment_version.py`

**Weekly:**
- Review precision probe trends
- Check drift reports: `data/kb_intel_chips/qa_runs/drift_*/`

**Before Re-Embed:**
1. Backup: `python3 tools/qa/backup_namespace.py --all`
2. Note baseline counts
3. Document expected changes

**After Re-Embed:**
1. Verify deployment version
2. Run smoke tests
3. Check drift matches expected delta
4. Update manifest if permanent

### Migration from v5.4

**Changes:**
- ✅ Upgraded: `text-embedding-3-small` → `text-embedding-3-large`
- ✅ Added execution chips (46 W000-prefixed frameworks)
- ✅ Added iMessage chips (40 micro-interactions)
- ✅ Implemented federated search (2 namespaces)
- ⚠️ **Breaking:** Namespace names changed (date-stamped)

**Rollback:**
```bash
# Restore from snapshot
cd data/kb_intel_chips/snapshots/YYYYMMDD_HHMMSS/
cat MANIFEST.json  # Review snapshot details
# Use Pinecone API to restore from vector_ids
```

---

## Views & Queries

### Awards Views

**v_awards_initial**
```sql
CREATE OR REPLACE VIEW v_awards_initial AS
SELECT student_id, award_label AS award_name, tier, rationale, as_of::date, source_id, id::text AS chip_id
FROM award_targets
WHERE phase = 'initial';
```

**v_awards_final_targets**
```sql
CREATE OR REPLACE VIEW v_awards_final_targets AS
SELECT student_id, award_label AS award_name, tier, rationale, as_of::date, source_id, id::text AS chip_id
FROM award_targets
WHERE phase = 'final';
```

**v_awards_won**
```sql
CREATE OR REPLACE VIEW v_awards_won AS
SELECT
  student_id,
  COALESCE(details_json->>'award_name', details_json->>'title', '(award)') AS award_name,
  details_json->>'tier' AS tier,
  occurred_at::date AS won_date,
  source_id,
  outcome_id::text AS chip_id
FROM outcomes
WHERE CAST(type AS TEXT) IN ('award');
```

**v_awards_progression**
```sql
CREATE OR REPLACE VIEW v_awards_progression AS
WITH t AS (
  SELECT student_id, award_label AS award_name, 'target'::text AS phase, as_of::date AS as_of,
         source_id, id::text AS chip_id, 'award_targets'::text AS chip_table
  FROM award_targets
),
w AS (
  SELECT student_id, COALESCE(details_json->>'award_name', details_json->>'title', '(award)') AS award_name,
         'won'::text AS phase, occurred_at::date AS as_of,
         source_id, outcome_id::text AS chip_id, 'outcomes'::text AS chip_table
  FROM outcomes
  WHERE CAST(type AS TEXT) IN ('award')
)
SELECT * FROM (SELECT * FROM t UNION ALL SELECT * FROM w) u
ORDER BY student_id, award_name, as_of NULLS LAST;
```

---

### ECs/Activities Views

**v_ecs_all**
```sql
CREATE OR REPLACE VIEW v_ecs_all AS
SELECT
  student_id,
  title_name AS activity_name,
  subtype AS category,
  tier1_state,
  tier2_substate,
  status_detail,
  key_metric_type, key_metric_value, key_metric_unit,
  event_date, submit_date, outcome_date,
  evidence_links,
  source_ref AS source_id,
  confidence,
  item_id AS chip_id
FROM kb_items
WHERE lower(item_type) IN ('ec','activity');
```

**v_ecs_initial**
```sql
CREATE OR REPLACE VIEW v_ecs_initial AS
SELECT * FROM v_ecs_all WHERE tier1_state = 'Planned';
```

**v_ecs_final**
```sql
CREATE OR REPLACE VIEW v_ecs_final AS
SELECT * FROM v_ecs_all
WHERE tier1_state IN ('Submitted','Outcome')
ORDER BY COALESCE(outcome_date, submit_date) NULLS LAST, activity_name;
```

**v_ecs_progression**
```sql
CREATE OR REPLACE VIEW v_ecs_progression AS
WITH tgt AS (
  SELECT student_id, activity_name, category, 'target'::text AS phase,
         COALESCE(event_date, submit_date, outcome_date)::date AS as_of,
         source_id, chip_id, 'kb_items'::text AS chip_table
  FROM v_ecs_all WHERE tier1_state = 'Planned'
),
sub AS (
  SELECT student_id, activity_name, category, 'submitted'::text AS phase,
         COALESCE(submit_date, event_date, outcome_date)::date AS as_of,
         source_id, chip_id, 'kb_items'::text AS chip_table
  FROM v_ecs_all WHERE tier1_state = 'Submitted'
),
outc AS (
  SELECT student_id, activity_name, category, 'outcome'::text AS phase,
         COALESCE(outcome_date, submit_date, event_date)::date AS as_of,
         source_id, chip_id, 'kb_items'::text AS chip_table
  FROM v_ecs_all WHERE tier1_state = 'Outcome'
)
SELECT * FROM (SELECT * FROM tgt UNION ALL SELECT * FROM sub UNION ALL SELECT * FROM outc) u
ORDER BY student_id, activity_name, as_of NULLS LAST;
```

---

### Narrative Views

**v_narrative_initial** (from kb_items)
```sql
CREATE OR REPLACE VIEW v_narrative_initial AS
SELECT
  student_id,
  subtype AS narrative_category,
  title_name AS content,
  source_ref,
  item_id
FROM kb_items
WHERE item_type='narrative' AND tier1_state='Planned'
ORDER BY narrative_category;
```

**v_narrative_final** (from kb_items)
```sql
CREATE OR REPLACE VIEW v_narrative_final AS
SELECT
  student_id,
  subtype AS narrative_category,
  title_name AS content,
  source_ref,
  item_id
FROM kb_items
WHERE item_type='narrative' AND tier1_state='Submitted'
ORDER BY narrative_category;
```

---

### Summer Programs Views

**v_programs_all**
```sql
CREATE OR REPLACE VIEW v_programs_all AS
SELECT
  student_id,
  title_name AS program_name,
  subtype AS provider_or_track,
  tier1_state,
  tier2_substate,
  status_detail,
  key_metric_type, key_metric_value, key_metric_unit,
  event_date,
  submit_date,
  outcome_date,
  source_ref AS source_id,
  confidence,
  item_id AS chip_id
FROM kb_items
WHERE lower(item_type) IN ('program','summer_program');
```

**v_programs_initial**
```sql
CREATE OR REPLACE VIEW v_programs_initial AS
SELECT * FROM v_programs_all WHERE tier1_state = 'Planned';
```

**v_programs_submitted**
```sql
CREATE OR REPLACE VIEW v_programs_submitted AS
SELECT * FROM v_programs_all WHERE tier1_state = 'Submitted' OR submit_date IS NOT NULL;
```

**v_program_outcomes**
```sql
CREATE OR REPLACE VIEW v_program_outcomes AS
SELECT
  student_id,
  COALESCE(details_json->>'program_name', details_json->>'title', '(program)') AS program_name,
  details_json->>'provider' AS provider,
  details_json->>'decision' AS decision,
  details_json->>'session' AS session,
  details_json->>'site' AS site,
  (details_json->>'attending')::boolean AS attending,
  occurred_at::date AS decision_date,
  source_id,
  CAST(type AS TEXT) AS type,
  outcome_id::text AS chip_id
FROM outcomes
WHERE CAST(type AS TEXT) IN ('program','program_application');
```

**v_programs_final**
```sql
CREATE OR REPLACE VIEW v_programs_final AS
SELECT * FROM v_program_outcomes;
```

**v_programs_admits** (alias for GPT-5 intent router)
```sql
CREATE OR REPLACE VIEW v_programs_admits AS
SELECT
  student_id,
  program_name as title_name,
  provider,
  decision_date as occurred_at,
  source_id,
  chip_id,
  'outcomes'::text AS chip_table
FROM v_programs_final;
```

**v_programs_progression**
```sql
CREATE OR REPLACE VIEW v_programs_progression AS
WITH tgt AS (
  SELECT student_id, program_name, provider_or_track AS provider,
         'target'::text AS phase,
         COALESCE(event_date, submit_date, outcome_date)::date AS as_of,
         source_id, chip_id, 'kb_items'::text AS chip_table
  FROM v_programs_all WHERE tier1_state = 'Planned'
),
subm AS (
  SELECT student_id, program_name, provider_or_track AS provider,
         'submitted'::text AS phase,
         COALESCE(submit_date, event_date, outcome_date)::date AS as_of,
         source_id, chip_id, 'kb_items'::text AS chip_table
  FROM v_programs_all WHERE tier1_state = 'Submitted' OR submit_date IS NOT NULL
),
dec AS (
  SELECT student_id, program_name, provider,
         CASE WHEN decision IS NULL THEN 'outcome' ELSE decision END AS phase,
         decision_date AS as_of,
         source_id, chip_id, 'outcomes'::text AS chip_table
  FROM v_program_outcomes
)
SELECT * FROM (SELECT * FROM tgt UNION ALL SELECT * FROM subm UNION ALL SELECT * FROM dec) u
ORDER BY student_id, program_name, as_of NULLS LAST;
```

---

### SAT Views

**v_sat_enum_first**
```sql
CREATE OR REPLACE VIEW v_sat_enum_first AS
SELECT DISTINCT ON (student_id)
  student_id, as_of, numeric_value, type, confidence, source_id
FROM sat_timeline_enum
ORDER BY student_id, as_of ASC, numeric_value ASC;
```

**v_sat_enum_latest**
```sql
CREATE OR REPLACE VIEW v_sat_enum_latest AS
SELECT DISTINCT ON (student_id)
  student_id, as_of, numeric_value, type, confidence, source_id
FROM sat_timeline_enum
ORDER BY student_id, as_of DESC, numeric_value DESC;
```

**v_sat_enum_progression**
```sql
CREATE OR REPLACE VIEW v_sat_enum_progression AS
SELECT
  student_id,
  as_of,
  numeric_value,
  type,
  confidence,
  source_id,
  ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY as_of ASC) as nth
FROM sat_timeline_enum
ORDER BY student_id, as_of ASC;
```

**v_sat_progression** (from vital_facts - legacy)
```sql
CREATE OR REPLACE VIEW v_sat_progression AS
SELECT
  student_id,
  fact_date,
  CASE WHEN value ~ '^[0-9]+$' THEN value::int ELSE NULL END AS score_total,
  modality,
  confidence,
  source_id,
  ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY fact_date ASC, source_id ASC) AS nth
FROM vital_facts
WHERE kind = 'sat_total_score';
```

---

### GPA Views

**v_gpa_timeline**
```sql
-- Note: This view structure varies by implementation
-- Typically sourced from vital_facts or a dedicated gpa table
SELECT * FROM v_gpa_timeline WHERE student_id='huda-2025' ORDER BY recorded_at;
```

---

### Transcript Views

**v_transcript_initial**
```sql
CREATE OR REPLACE VIEW v_transcript_initial AS
SELECT * FROM v_transcript_all WHERE source_phase = 'initial';
```

**v_transcript_final**
```sql
CREATE OR REPLACE VIEW v_transcript_final AS
SELECT * FROM v_transcript_all WHERE source_phase = 'final';
```

---

### Summary Views

**v_kb_items_summary**
```sql
CREATE OR REPLACE VIEW v_kb_items_summary AS
SELECT
  student_id,
  item_type,
  tier1_state,
  COUNT(*) as item_count,
  STRING_AGG(title_name, '; ' ORDER BY title_name) as items_list,
  MIN(COALESCE(event_date, submit_date, deadline_date)) as earliest_date,
  MAX(COALESCE(outcome_date, event_date, submit_date)) as latest_date
FROM kb_items
GROUP BY student_id, item_type, tier1_state;
```

**v_plan_events_summary**
```sql
CREATE OR REPLACE VIEW v_plan_events_summary AS
SELECT
  student_id,
  event,
  COUNT(*) as event_count,
  MIN(as_of) as first_date,
  MAX(as_of) as last_date,
  STRING_AGG(DISTINCT source_id, ', ') as sources
FROM plan_events
GROUP BY student_id, event
ORDER BY student_id, first_date;
```

---

## Functions & Helpers

### SAT Temporal Functions

**sat_enum_as_of(p_student, p_date)**
```sql
CREATE OR REPLACE FUNCTION sat_enum_as_of(p_student TEXT, p_date DATE)
RETURNS TABLE(
  student_id TEXT,
  as_of DATE,
  numeric_value INT,
  type TEXT,
  confidence TEXT,
  source_id TEXT
)
LANGUAGE sql STABLE AS $$
  SELECT student_id, as_of, numeric_value, type, confidence, source_id
  FROM sat_timeline_enum
  WHERE student_id = p_student AND as_of <= p_date
  ORDER BY as_of DESC, numeric_value DESC
  LIMIT 1;
$$;
```

**get_sat_nth(p_student, p_nth)**
```sql
CREATE OR REPLACE FUNCTION get_sat_nth(p_student TEXT, p_nth INT)
RETURNS TABLE(
  student_id TEXT,
  as_of DATE,
  numeric_value INT,
  type TEXT,
  confidence TEXT,
  source_id TEXT,
  nth BIGINT
)
LANGUAGE sql STABLE AS $$
  SELECT *
  FROM v_sat_enum_progression
  WHERE student_id = p_student AND nth = p_nth;
$$;
```

---

### Awards Temporal Functions

**awards_enum_as_of(p_student, p_date, p_phase)**
```sql
CREATE OR REPLACE FUNCTION awards_enum_as_of(p_student TEXT, p_date DATE, p_phase TEXT DEFAULT 'initial')
RETURNS TABLE(
  item_label TEXT,
  as_of DATE,
  source_id TEXT,
  jtbd_id TEXT
)
LANGUAGE sql STABLE AS $$
  SELECT item_label, as_of, source_id, jtbd_id
  FROM award_targets_enum
  WHERE student_id = p_student
    AND phase = p_phase
    AND (as_of IS NULL OR as_of <= p_date)
  ORDER BY as_of NULLS LAST, item_label;
$$;
```

---

### KB Items Helper Functions

**get_kb_items_by_type_state(p_student_id, p_item_type, p_tier1_state, p_tier2_substate)**
```sql
CREATE OR REPLACE FUNCTION get_kb_items_by_type_state(
  p_student_id TEXT,
  p_item_type TEXT,
  p_tier1_state TEXT DEFAULT NULL,
  p_tier2_substate TEXT DEFAULT NULL
)
RETURNS TABLE(
  item_id TEXT,
  title_name TEXT,
  tier1_state TEXT,
  tier2_substate TEXT,
  status_detail TEXT,
  key_metric_type TEXT,
  key_metric_value TEXT,
  event_date DATE,
  outcome_date DATE,
  source_ref TEXT,
  evidence_links TEXT[],
  confidence TEXT
)
LANGUAGE sql STABLE AS $$
  SELECT
    item_id, title_name, tier1_state, tier2_substate, status_detail,
    key_metric_type, key_metric_value, event_date, outcome_date,
    source_ref, evidence_links, confidence
  FROM kb_items
  WHERE student_id = p_student_id
    AND item_type = p_item_type
    AND (p_tier1_state IS NULL OR tier1_state = p_tier1_state)
    AND (p_tier2_substate IS NULL OR tier2_substate = p_tier2_substate)
  ORDER BY COALESCE(outcome_date, event_date, submit_date, deadline_date) NULLS LAST;
$$;
```

**get_kb_items_progression(p_student_id, p_item_type)**
```sql
CREATE OR REPLACE FUNCTION get_kb_items_progression(
  p_student_id TEXT,
  p_item_type TEXT
)
RETURNS TABLE(
  item_id TEXT,
  title_name TEXT,
  tier1_state TEXT,
  status_detail TEXT,
  key_metric_value TEXT,
  temporal_date DATE,
  source_ref TEXT,
  nth INTEGER
)
LANGUAGE sql STABLE AS $$
  SELECT
    item_id, title_name, tier1_state, status_detail, key_metric_value,
    COALESCE(outcome_date, event_date, submit_date, deadline_date) AS temporal_date,
    source_ref,
    ROW_NUMBER() OVER (ORDER BY COALESCE(outcome_date, event_date, submit_date, deadline_date) ASC)::INTEGER AS nth
  FROM kb_items
  WHERE student_id = p_student_id AND item_type = p_item_type
  ORDER BY nth;
$$;
```

---

## Data Types & Enums

### PostgreSQL Enums

**lifecycle_status**
```sql
CREATE TYPE lifecycle_status AS ENUM (
  'planned', 'in_progress', 'submitted', 'outcome', 'archived'
);
```

**lifecycle_domain**
```sql
CREATE TYPE lifecycle_domain AS ENUM (
  'application', 'award', 'test', 'essay', 'recommender',
  'ec_portfolio', 'aid_css_fafsa', 'ops_policy'
);
```

**outcome_type**
```sql
CREATE TYPE outcome_type AS ENUM (
  'admission', 'plan', 'tracking', 'momentum', 'artifact',
  'draft', 'submission', 'result', 'milestone', 'ops',
  'policy', 'registry', 'content_bank', 'communication', 'planning',
  'award', 'program', 'program_application'
);
```

**admission_result**
```sql
CREATE TYPE admission_result AS ENUM (
  'accepted', 'waitlisted', 'rejected', 'deferred', 'withdrawn', 'unknown'
);
```

**momentum_status**
```sql
CREATE TYPE momentum_status AS ENUM (
  'booked', 'sent', 'received', 'logged', 'won'
);
```

**fact_confidence**
```sql
CREATE TYPE fact_confidence AS ENUM (
  'high', 'medium', 'low'
);
```

---

### Reference Tables

**fact_kinds**
```sql
CREATE TABLE fact_kinds (
  kind TEXT PRIMARY KEY,
  description TEXT
);
```

**Common Fact Kinds:**
- `sat_total_score`, `sat_math`, `sat_ebrw`
- `act_composite`
- `ap_score`
- `psat_selection_index`
- `gpa_weighted`, `gpa_unweighted`
- `class_rank_percentile`
- `uc_app_submitted`, `uc_app_opened`
- `commonapp_submitted`, `coalition_submitted`
- `portfolio_demo_count`
- `club_leadership_count`
- `volunteer_hours`
- `award_won`, `award_level`
- `css_profile_submitted`, `fafsa_submitted`
- `lor_requested`, `lor_received`
- `essay_finalized`
- `recommendation_quality_score`
- `coach_session_count`

**tactic_kinds**
```sql
CREATE TABLE tactic_kinds (
  name TEXT PRIMARY KEY,
  description TEXT
);
```

**Common Tactics:**
- `spaced_practice`, `deliberate_practice`, `pomodoro`
- `micro_deadlines`, `rubric_reverse_engineering`
- `socratic_prompting`, `cold_email_outreach`, `mentor_outreach`
- `portfolio_slices`, `checklist_to_system`
- `goal_backcasting`, `gap_drilldown`
- `red_team_review`, `peer_review_circle`
- `story_bank_build`, `coach_sync`, `parent_sync`
- `weekly_retro`, `mock_interview`, `essay_mini_outline`

**framework_kinds**
```sql
CREATE TABLE framework_kinds (
  name TEXT PRIMARY KEY,
  description TEXT
);
```

**Common Frameworks:**
- `SMART`, `OKR`, `WOOP`
- `Feynman`, `GTD`, `AtomicHabits`
- `ICE`, `RICE`, `4DX`
- `STAR`, `Cialdini`

---

## Indexes & Performance

### Core Indexes

**students:**
- Primary key on `student_id`

**sources:**
- Primary key on `source_id`
- `idx_sources_student` ON (student_id)

**jtbd:**
- Primary key on `jtbd_id`
- `idx_jtbd_student` ON (student_id)

**vital_facts:**
- Primary key on `fact_id`
- `idx_facts_student_date` ON (student_id, fact_date DESC)
- `idx_facts_kind` ON (kind)

**outcomes:**
- Primary key on `outcome_id`
- `idx_outcomes_student_date` ON (student_id, occurred_at DESC)
- `idx_outcomes_jtbd` ON (jtbd_id)
- `idx_outcomes_programs` ON (student_id, type, occurred_at)

**interactions:**
- Primary key on `snippet_id`
- `idx_interactions_student_date` ON (student_id, occurred_at DESC)
- `idx_interactions_jtbd` ON (jtbd_id)
- `idx_interactions_tactic` ON (tactic_name)

**evidence_links:**
- Primary key on `evidence_id`
- `idx_evidence_source` ON (source_id)

**kb_items:**
- Primary key on `item_id`
- `kb_items_by_student` ON (student_id)
- `kb_items_type_state` ON (item_type, tier1_state, outcome_date, event_date, submit_date)
- `kb_items_source_ref` ON (source_ref)
- `kb_items_temporal` ON (student_id, item_type, COALESCE(outcome_date, event_date, submit_date, deadline_date))

**award_targets_enum:**
- Primary key on `id`
- Unique constraint on (student_id, phase, item_label)
- `idx_award_targets_enum_sid_phase` ON (student_id, phase)
- `idx_award_targets_enum_asof` ON (as_of)

**ec_targets:**
- Primary key on `id`
- Unique constraint on (student_id, phase, item_label)
- `idx_ec_targets_sid_phase` ON (student_id, phase)

**narrative_targets:**
- Primary key on `id`
- `idx_narrative_targets_sid` ON (student_id)

**plan_events:**
- Primary key on `id`
- `idx_plan_events_sid_date` ON (student_id, as_of)
- `idx_plan_events_kind` ON (event)

**sat_timeline_enum:**
- Primary key on `id`
- `idx_sat_timeline_enum_sid_date` ON (student_id, as_of)

---

### Performance Considerations

1. **Temporal Queries:** Use DISTINCT ON with ORDER BY for first/latest patterns
2. **Progression Queries:** Use ROW_NUMBER() window functions with PARTITION BY
3. **As-of Queries:** Filter with `as_of <= p_date` and ORDER BY as_of DESC LIMIT 1
4. **Joins:** Always join on indexed foreign keys (student_id, source_id, jtbd_id)
5. **Full Text Search:** Use tsvector columns if implementing lexical search (see migration 003_lexical_search.sql)

---

## Migration History

### Core Schema Migrations

**2025-09-23: Student Facts**
- File: `2025-09-23-student-facts.sql`
- Description: Initial student facts table

**2025-09-24: Vitals Observations Outcomes**
- File: `2025-09-24-vitals-observations-outcomes.sql`
- Description: Core vitals model with observations and outcomes

**2025-09-25: Opportunities v1.2**
- File: `2025-09-25-opportunities-v1.2.sql`
- Description: Opportunity catalog and scoring tables

**2025-09-30: Canon Registry**
- File: `2025-09-30-canon-registry.sql`
- Description: Canonical data registry

---

### Jenny v3 Migrations (Universal Vitals Model)

**jenny-v3/001: Universal Vitals Model**
- File: `jenny-v3/001_universal_vitals_model.sql`
- Date: 2025-10-02
- Description: Complete DDL for universal vitals model
- Tables: students, sources, jtbd, vital_facts, outcomes, interactions, evidence_links, lifecycle_items
- Enums: lifecycle_status, lifecycle_domain, outcome_type, admission_result, momentum_status, fact_confidence
- Reference tables: fact_kinds, tactic_kinds, framework_kinds

**jenny-v3/002: Chat Sessions**
- File: `jenny-v3/002_chat_sessions.sql`
- Description: Chat session management

**jenny-v3/003: Lexical Search**
- File: `jenny-v3/003_lexical_search_fixed.sql`
- Description: Full-text search support (tsvector columns)

---

### v3.2 Migrations (Canonical Facts Framework)

**2025-10-02: Canonical Facts Framework**
- File: `2025-10-02-canonical-facts-framework-fixed.sql`
- Description: Canonical facts framework with confidence and selectors

**2025-10-02: Temporal Facts Normalization**
- File: `2025-10-02-temporal-facts-normalization.sql`
- Description: Normalized temporal facts with type-safe views

**2025-10-02: UTFA Universal Temporal**
- File: `2025-10-02-utfa-universal-temporal.sql`
- Description: Universal Temporal Fact Architecture (UTFA)

**2025-10-02: Query Traces**
- File: `2025-10-02-query-traces-v2.sql`
- Description: Query tracing and observability

---

### v3.3 Migrations (Universal Enumerations & KB Items)

**2025-10-03: Canonical Targets & Enumerations**
- File: `2025-10-03-canonical-targets-enumerations.sql`
- Date: 2025-10-03
- Description: Phase-based enumeration tables
- Tables: award_targets_enum, ec_targets, narrative_targets, plan_events, sat_timeline_enum
- Views: v_awards_enum_initial, v_awards_enum_final, v_ec_enum_initial, v_ec_enum_final, v_sat_enum_first, v_sat_enum_latest, v_sat_enum_progression
- Functions: sat_enum_as_of, awards_enum_as_of, get_sat_nth

**2025-10-03: KB Items Universal**
- File: `2025-10-03-kb-items-universal.sql`
- Date: 2025-10-03
- Description: Universal ledger for all targets and outcomes
- Table: kb_items (with state machine)
- Views: v_awards_initial, v_awards_won, v_awards_timeline, v_ecs_timeline, v_testing_timeline, v_applications_timeline, v_decisions_timeline, v_kb_items_summary
- Functions: get_kb_items_by_type_state, get_kb_items_progression

**2025-10-03: Universal Enumerations**
- File: `2025-10-03-universal-enumerations.sql`
- Date: 2025-10-03
- Description: Universal enumeration views over kb_items and enumeration tables
- Views: v_awards_initial, v_awards_final_targets, v_awards_won, v_awards_progression, v_ecs_all, v_ecs_initial, v_ecs_final, v_ecs_progression, v_narrative_initial, v_programs_all, v_programs_initial, v_programs_submitted, v_program_outcomes, v_programs_final, v_programs_progression
- Indexes: idx_award_targets_sid_phase, idx_award_targets_asof, idx_kb_items_type_state, idx_kb_items_by_student, idx_outcomes_programs

**2025-10-03: Initial Targets Awards**
- File: `2025-10-03-initial-targets-awards.sql`
- Description: Load initial award targets data

---

### Jenny API Migrations

**2025-10-03: GPT-5 Intent Router Views**
- File: `services/jenny-api/db/migrations/2025-10-03-gpt5-intent-router-views.sql`
- Date: 2025-10-03
- Description: Views for GPT-5 intent router
- Views: v_programs_admits (alias of v_programs_final)

**2025-10-03: Narrative Enumerations**
- File: `services/jenny-api/db/migrations/2025-10-03-narrative-enumerations.sql`
- Date: 2025-10-03
- Description: Load narrative data into kb_items
- Data: initial_narrative.csv, final_narrative.csv
- Views: v_narrative_initial, v_narrative_final

---

## Incremental Updates

### Template for Updates

When adding new features or schema changes, append entries here with timestamp:

```markdown
### [YYYY-MM-DD] Feature Name
**Migration:** path/to/migration.sql
**Author:** [name]
**Description:** Brief description of changes

**Schema Changes:**
- Added table: `table_name` with columns [...]
- Modified table: `table_name` - added column `column_name`
- Added view: `v_view_name`
- Added function: `function_name(params)`

**Data Changes:**
- Loaded data from: path/to/data.csv
- Updated N rows in table_name

**Breaking Changes:**
- [List any breaking changes]

**Migration Notes:**
- [Any special instructions for running migration]
```

---

### Change Log

#### [2025-10-07 14:30] v2.3: Universal Routing System v1.3 (Query Routing Logic)
**Migration:** None (routing logic updates only, no schema changes)
**Author:** Platform Team
**Description:** Production-ready universal routing system achieving 97.1% accuracy through deterministic decision tree with iterative refinements (v1.1-v1.3). No database schema changes, updates are to application-layer routing logic only.

**Query Routing Enhancements:**
- **Routing Accuracy**: Improved from 72.9% to 97.1% (+24.2%, 18 tests fixed)
- **Universal Router Updates** (`apps/test-chat-ui/lib/universalRouter.ts`):
  - Step 4.5: Assessment keyword override with SQL metric exclusion
  - Step 4.6: Chips/metadata query detection (proof_links intent)
  - Step 4.7: Strategy query pattern detection (hybrid vs KB split)
  - Updated inferIntentFromTags function to accept query parameter for context-aware decisions
  - Added SQL metric exclusion in tag-based intent detection (prevents incorrect KB routing)
  - Added publications intent inference in inferSQLIntentFromEnumeration
- **Query Shape Detector Updates** (`apps/test-chat-ui/lib/queryShapes.ts`):
  - Expanded enumeration detector to match "all X" patterns (J37: "Show all competitions")
  - Added "publication" to SQL entity list (X69: "List my publications")
  - Enhanced clarifier threshold for 2-word vague queries (L40: "help me")
  - Added template request exclusions to privacy detector (P53: "Template ask vs email")

**Test Results:**
- **Pass Rate**: 68/70 tests passing (97.1%)
- **Test Suite**: http://localhost:3001/test-suite
- **Remaining Edge Cases**:
  - O50: Multi-turn mutation ("I won NCWIT") - requires context-aware update detection
  - P52: Ambiguous query ("Assessment of my GPA trend") - defensible as either SQL or KB route

**Breaking Changes:** None (backward compatible routing logic updates)

**Notes:**
- This update enhances the application-layer routing system without modifying database schema
- All changes are in TypeScript routing logic files
- Three iterative releases (v1.1, v1.2, v1.3) documented in apps/test-chat-ui/ROUTING_FIXES_*.md
- Production-ready deployment with comprehensive test coverage

---

#### [2025-10-04] v4.6.1: College List + Scholarship + Readiness Correlation
**Migration:** `apps/api/db/migrations/2025-10-04-v4.6.1-college-scholarship-enablement.sql`
**Data Script:** `apps/api/db/scripts/v4.6.1_huda_college_scholarships.sql`
**Author:** Platform Team
**Description:** Complete normalized schema for tracking college applications, outcomes, and scholarships with readiness correlation. Enables predictive analytics and conversational queries about admissions outcomes.

**Schema Changes:**

**Tables Added:**
1. **college_list** - Canonical representation of every school a student applies to
   - `college_id` SERIAL PRIMARY KEY
   - `student_id` TEXT REFERENCES students(student_id)
   - `college_name` TEXT NOT NULL
   - `bucket_category` TEXT (Wild Card, Reach, Match, Safety)
   - `decision_plan` TEXT (EA, ED, RD, REA, Rolling)
   - `decision_result` TEXT (Accepted, Rejected, Waitlisted, Deferred, Withdrawn, Pending)
   - `waitlist` BOOLEAN DEFAULT FALSE
   - `program` TEXT - Intended major/program
   - `supplements` TEXT - Required supplemental essays
   - `location` TEXT - Geographic location
   - `acceptance_rate` NUMERIC - College acceptance rate
   - `interview_status` TEXT - Interview requirement/status
   - `ivyready_score_at_submit` NUMERIC - Student's readiness score at submission
   - `created_ts` TIMESTAMPTZ DEFAULT NOW()

2. **scholarships** - Complete tracking of all scholarships applied/received
   - `scholarship_id` SERIAL PRIMARY KEY
   - `student_id` TEXT REFERENCES students(student_id)
   - `scholarship_name` TEXT NOT NULL
   - `sponsor_org` TEXT - Sponsoring organization
   - `amount_usd` NUMERIC - Scholarship amount in USD
   - `application_status` TEXT (Applied, Accepted, Rejected, Pending)
   - `decision_date` DATE - Decision notification date
   - `notes` TEXT - Additional notes
   - `created_ts` TIMESTAMPTZ DEFAULT NOW()

**Views Added:**
1. **v_college_readiness_correlation** - Readiness correlation analysis
   - Correlates student features (SAT, GPA, awards, ECs) with admission outcomes
   - Fields: acceptance_numeric (1.0=Accepted, 0.5=Waitlisted, 0=Rejected), relative_strength (feature_value/target_value)
   - Enables predictive modeling: `corr(relative_strength, acceptance_numeric)` per domain
   - Joins: college_list, ivyready_snapshots, v_features_all, readiness_feature_weights

2. **v_scholarship_impact** - Scholarship affordability and readiness impact
   - Quantifies scholarship value as integrated readiness metric
   - Fields: affordability_boost (amount_usd/1000), adjusted_readiness_score (overall_score + amount/5000)
   - Joins: scholarships, ivyready_snapshots

**Data Changes:**
- Loaded 28 colleges for huda-2025 (18 Reach, 7 Match, 3 Safety)
- Loaded 29 scholarships for huda-2025 (3 accepted: $12.5K, 26 pending)
- Outcomes: 8 Accepted (attending UIUC), 7 Waitlisted, 11 Rejected
- CSV exports: derived_college_list.csv, derived_scholarships.csv

**Conversational Intents Added:**
- College queries: "Which colleges accepted me?", "Which reach schools waitlisted me?"
- Scholarship queries: "Show me scholarships I received", "How much scholarship money did I get?"
- Readiness comparison: "Compare my readiness with schools that accepted me"

**Breaking Changes:** None

**Migration Notes:**
- Requires `students` table with `student_id` column
- Optional integration with `ivyready_snapshots` (snapshot_phase = 'final_submit')
- Run migration first, then data script for Huda seed data
- CSV exports available in `data/kbase/00-MasterProgramLogs/`

---

#### [2025-10-04 10:30] v3.9: Universal Readiness Intelligence Framework
**Migration:** `apps/api/db/migrations/2025-10-04-v3.9-universal-readiness-intelligence.sql`
**Author:** Platform Team
**Description:** Systematize how students discover, interpret, and act on their next best move. Enables queries like "What's my top weak spot?", "Which one thing can give me the biggest boost?", "How do I fix my weak spots?", with confident, human-like next-best-actions and causal explanations.

**Schema Changes:**

**Tables Added:**
1. **readiness_feature_weights** - Universal feature impact model
   - `feature_key` TEXT PRIMARY KEY - Unique feature identifier (e.g., sat_total, ecs_users_empowering_ai)
   - `domain` TEXT - Feature domain (testing, academics, awards, ecs, narrative, programs)
   - `target_value` NUMERIC - Ivy+ competitive benchmark value
   - `impact_coefficient` NUMERIC - Weight of feature on IvyReady score (0-1)
   - `qualitative_weight` NUMERIC - For narrative-type signals
   - `description` TEXT - Human-readable description

2. **readiness_snapshots** - Time-series readiness tracking
   - `snapshot_id` UUID PRIMARY KEY
   - `student_id` TEXT
   - `as_of` DATE - Snapshot date
   - `ivyready_score` NUMERIC - Score at this point in time
   - `top_drivers` JSONB - Top performing domains (e.g., {"ecs":0.92})
   - `weakspots` JSONB - Identified weaknesses
   - `next_actions` JSONB - Recommended actions with estimated lift
   - UNIQUE(student_id, as_of)

**Views Added:**
1. **v_features_all** - Unified view of all student features
   - Unions from: facts_canonical, academic_gpa, kb_items, outcomes
   - Columns: student_id, domain, feature_key, value_num, source_id, recorded_at
   - Foundation for gap analysis

2. **v_feature_gaps_current** - Gap analysis (current vs target)
   - Columns: student_id, domain, feature_key, current_value, target_value, gap_raw, gap_weighted, description
   - Formula: gap_weighted = impact_coefficient * (target_value - current_value)
   - Identifies which features need improvement

3. **v_readiness_weakspots** - Ranked weakspots per student
   - Columns: student_id, domain, feature_key, current_value, target_value, gap_raw, gap_weighted, description, rank
   - Ordered by gap_weighted DESC
   - Powers "what's my top weak spot?" queries

4. **v_readiness_top_priorities** - Actionable priorities with guidance
   - Columns: student_id, domain, feature_key, gap_raw, gap_weighted, why, what, how, when, estimated_lift
   - Domain-specific action recommendations (testing, awards, ECs, academics, narrative)
   - Formula: estimated_lift = gap_weighted * 1.5

**Application Layer Changes:**
- Enhanced: `services/jenny-api/src/services/resolvers.ts` - 4 new readiness intelligence resolvers (readinessWeakspots, readinessBoostMax, readinessBoostPlan, readinessProgression)
- Enhanced: `services/jenny-api/src/router/intentRouter.ts` - 4 new intent types, 22 training examples
- Added: `apps/api/db/scripts/seed-huda-readiness-features.sql` - Huda's feature weights and snapshots

**Data Changes:**
- Seed data: 11 universal feature weights (SAT, GPA, AP count, awards, EC metrics, narrative scores)
- Huda-specific weights: 6 EC-level features (Empowering AI, Folklift, Synthoria, Filmmaker's Club)
- Huda snapshots: 3 historical snapshots (Aug, Sep, Oct 2024) for progression testing

**New Intent Types:**
- `readiness.weakspots.now` → readinessWeakspots(pg, studentId, 3)
- `readiness.boost.max` → readinessBoostMax(pg, studentId)
- `readiness.boost.plan` → readinessBoostPlan(pg, studentId, 5)
- `readiness.progression` → readinessProgression(pg, studentId, 5)

**Impact Model:**
- Testing: SAT (0.25), ACT (0.25)
- Academics: GPA (0.20), AP count (0.10)
- Awards: National (0.20), International (0.15)
- ECs: Users (0.15), Funding (0.12), Hours/week (0.08)
- Narrative: Coherence (0.10), Uniqueness (0.08)

**Breaking Changes:** None - Additive feature

**Migration Notes:**
1. Run migration: `psql $DATABASE_URL -f apps/api/db/migrations/2025-10-04-v3.9-universal-readiness-intelligence.sql`
2. Seed Huda data: `psql $DATABASE_URL -f apps/api/db/scripts/seed-huda-readiness-features.sql`
3. Restart jenny-api server to load new resolvers

**Future Extensions:**
- Plug-in readiness_forecast model (fine-tuned LLM or XGBoost)
- Auto-capture snapshots weekly via cron job
- Add evidence traces from coach session transcripts
- Causal-impact analysis (historical students → lift predictions)

---

#### [2025-10-04 09:00] v3.7.3: Activity-Aware EC Extraction
**Migration:** None (application-layer only)
**Author:** Platform Team
**Description:** Enhanced UAPX extractor with activity-aware EC patterns, fuzzy activity name matching, and multi-metric whatIfEC resolver. Fixes "what if I only scaled the empowering AI to 100 users?" routing issue.

**Application Layer Changes:**
- Enhanced: `services/jenny-api/src/intent/extractors/uapx.ts` - 12 new activity-aware EC patterns with stopword handling
- Enhanced: `services/jenny-api/src/router/intentRouter.ts` - 8 EC training examples with activity names
- Added: `services/jenny-api/src/utils/activityNormalizer.ts` - Fuzzy activity name matching module
- Enhanced: `services/jenny-api/src/services/resolvers.ts` - Multi-metric whatIfEC with activity recognition

**Enhanced EC Patterns (12 new rules):**
```typescript
// Activity-aware scale: "scale(d) Empowering AI to 100 users"
/\b(?:scale(?:d)?|grow|expand)\s+(?:the\s+)?([\w'&.\- ]{2,60}?)\s+(?:to|reach)\s+([\d,.]+)k?\s*(users?|members?)\b/i

// Activity-aware reach: "reach 10k users on Synthoria"
/\breach\s+([\d,.]+)k?\s*(users?|members?)\s+(?:on|for|in)\s+(?:the\s+)?([\w'&.\- ]{2,60})\b/i

// Activity-aware double: "double users on Empowering AI"
/\b(?:double|2x)\s+(?:the\s+)?users?\s+(?:on|for|in)\s+(?:the\s+)?([\w'&.\- ]{2,60})\b/i

// Activity-aware funds: "raise $25k for Folklift"
/\b(?:raise|fundraise|get)\s*\$?\s*([\d,.]+)(k)?\s+(?:for|on|in)\s+(?:the\s+)?([\w'&.\- ]{2,60})\b/i

// Activity-aware hours: "increase hours per week to 12 on Filmmaker's Club"
/\b(?:increase|raise|bump)\s*(?:hours|hrs)\s*(?:per|\/)\s*week\s*(?:to|by)\s*([\d.]+)\s+(?:on|for|in)\s+(?:the\s+)?([\w'&.\- ]{2,60})\b/i
```

**Activity Name Normalization Algorithm:**
```typescript
// 3-tier fuzzy matching against kb_items ledger
async function normalizeActivityName(pg: Pool, studentId: string, rawName: string) {
  const ecNames = await getStudentECNames(studentId); // FROM kb_items WHERE item_type IN ('ec','activity')

  // 1. Exact match (case-insensitive)
  const exact = ecNames.find(ec => ec.toLowerCase() === rawName.toLowerCase());
  if (exact) return exact;

  // 2. Partial match (substring)
  const partial = ecNames.find(ec => ec.toLowerCase().includes(rawName.toLowerCase()) ||
                                     rawName.toLowerCase().includes(ec.toLowerCase()));
  if (partial) return partial;

  // 3. Stopword-filtered match
  const stopwords = ['the', 'a', 'an', 'my', 'our', 'for', 'on', 'in'];
  const filteredRaw = removeStopwords(rawName, stopwords);
  const filtered = ecNames.find(ec => removeStopwords(ec, stopwords) === filteredRaw);
  if (filtered) return filtered;

  // 4. Fallback: clean and title-case
  return cleanActivityName(rawName);
}
```

**Multi-Metric whatIfEC Resolver:**
```typescript
// Supports 4 metrics with activity awareness
metrics: ["users", "funds_usd", "hours_per_week", "leadership_roles"]

// Metric-specific impact scoring
users:             10k+ → +2.5pts, 5k+ → +2.0pts, else +1.5pts
funds_usd:         $25k+ → +3.0pts, $10k+ → +2.0pts, else +1.0pts
hours_per_week:    15+ → +1.5pts, 10+ → +1.0pts, else +0.5pts
leadership_roles:  3+ → +2.0pts, 2+ → +1.5pts, else +1.0pts

// Activity normalization
const activityName = await normalizeActivityName(pg, studentId, uapx.qualifiers?.activity_name);
// Output: "the empowering ai" → "Empowering AI" (from ledger)
```

**LLM Few-Shot Examples Added:**
```json
Q: what if I only scaled the empowering AI to 100 users?
A: {"domain":"ecs","action":"set","target":{"name":"users","value":100,"unit":"users"},"qualifiers":{"activity_name":"Empowering AI"},"confidence":0.90,"source":"llm"}

Q: can I double users on Synthoria?
A: {"domain":"ecs","action":"increase","delta":{"name":"users","value":100,"unit":"%"},"qualifiers":{"activity_name":"Synthoria"},"confidence":0.90,"source":"llm"}

Q: increase hours per week to 12 on Filmmaker's Club?
A: {"domain":"ecs","action":"set","target":{"name":"hours_per_week","value":12,"unit":"hours_per_week"},"qualifiers":{"activity_name":"Filmmaker's Club"},"confidence":0.89,"source":"llm"}
```

**Data Changes:**
None (no database modifications)

**Breaking Changes:**
None (backward compatible)

**Migration Notes:**
- No migration required
- Activity normalization queries kb_items dynamically
- Existing EC queries continue to work

**Impact:**
- **Universal EC Coverage**: Activity-aware patterns handle complex phrasing with fillers ("only", "the", articles)
- **Fuzzy Matching**: Typos/variants don't break extraction ("empowering ai" → "Empowering AI")
- **Multi-Metric Support**: Users, funds, hours, leadership all supported with metric-specific scoring
- **Confidence Boost**: Intent routing confidence for EC queries increased to 0.93-0.96
- **Activity Recognition**: Activity names displayed in output and context chips

---

#### [2025-10-04 08:30] v3.7.2: Universal Action Parameter Extraction (UAPX)
**Migration:** None (application-layer only)
**Author:** Platform Team
**Description:** Universal domain-agnostic parameter extraction layer with 3-tier pipeline (deterministic rules → pattern library → LLM fallback) to replace domain-specific extractors. No database schema changes.

**Application Layer Changes:**
- Added module: `services/jenny-api/src/intent/schema.ts` - UAPX type definitions with 6 domains (testing, awards, ecs, academics, programs, narrative) and 7 actions (set, increase, decrease, win, admit, convert, complete)
- Added module: `services/jenny-api/src/intent/extractors/uapx.ts` - 3-tier extraction pipeline with 9 deterministic rules, 3 pattern slots, GPT-4o-mini LLM fallback with Zod validation
- Updated: `services/jenny-api/src/router/intentRouter.ts` - Added 3 new intent types (readiness.whatif.ec, readiness.whatif.gpa, readiness.whatif.program) with 12 training examples
- Updated: `services/jenny-api/src/services/resolvers.ts` - Refactored existing what-if resolvers + 3 new resolvers (readinessWhatIfEC, readinessWhatIfGPA, readinessWhatIfProgram)

**Parameter Extraction Pipeline:**
```typescript
// Tier 1: Deterministic Rules (9 rules, ~90% coverage)
Rules: SAT, Awards, ECs (users/funds/hours), GPA, Programs
Examples: "SAT to 1590", "win national award", "double users", "raise $25k", "get into RSI"

// Tier 2: Pattern Library (3 slots, named capture groups)
Slots: testing.sat.set, awards.tier, ecs.users.set
Regex: Named groups for slot-filling

// Tier 3: LLM Fallback (GPT-4o-mini JSON mode)
Model: gpt-4o-mini, temperature=0, response_format=json_object
Validation: Zod schema with bounds checking
Few-shot: 8 examples covering all 6 domains
```

**UAPX Schema:**
```typescript
interface UAPX {
  domain: "testing" | "awards" | "ecs" | "academics" | "programs" | "narrative"
  action: "set" | "increase" | "decrease" | "win" | "admit" | "convert" | "complete"
  target?: { name: string, value: number|string, unit?: string }
  delta?: { name: string, value: number, unit?: string }
  bounds?: { min?: number, max?: number }
  qualifiers?: { activity_name?, award_name?, tier?, program_name?, subject?, years? }
  confidence: number  // 0-1
  source: "rule" | "pattern" | "llm"
}
```

**Domain Bounds Validation:**
- SAT: 400-1600
- ACT: 1-36
- GPA (unweighted): 0-4.0
- GPA (weighted): 0-5.0
- Users: 0-10M
- Funds (USD): 0-10M
- Hours per week: 0-168

**New Resolver Logic:**
```sql
-- readinessWhatIfEC: EC scaling impact
users >= 10000 → +2.5 pts
funds >= 25000 → +3.0 pts, >= 10000 → +2.0 pts
hours >= 15 → +1.5 pts

-- readinessWhatIfGPA: GPA target simulation
delta = (target/4.0 * 40 - current/4.0 * 40) * 0.40

-- readinessWhatIfProgram: Summer program admit
RSI/TASP/SSP/YYGS/LaunchX → +5.0 pts
Other selective → +3.0 pts
```

**Data Changes:**
None (no database modifications)

**Breaking Changes:**
None (backward compatible with legacy action_param)

**Migration Notes:**
- No migration required
- Existing queries continue to work
- New UAPX format provides richer parameter extraction

**Impact:**
- **Universal Coverage**: Single pipeline for all 6 domains (previously domain-specific)
- **Natural Language**: Supports "double users", "raise $25k", "bump SAT by +50", "get into RSI"
- **Confidence Tracking**: Each extraction tagged with confidence (0-1) and source (rule/pattern/llm)
- **Extensibility**: Adding new domains only requires updating schema + rules/patterns
- **Cost Efficiency**: Deterministic rules handle 90%+ of queries, LLM only for edge cases

---

#### [2025-10-04 07:30] v3.7.1: Parameter Extraction + Deterministic Scoring
**Migration:** `2025-10-04-v3.7.1-readiness.sql`
**Author:** Platform Team
**Description:** Completes v3.7 readiness system with parameter extraction, deterministic scoring formulas, and snapshot API

**Schema Changes:**
- Added table: `readiness_snapshots` - Point-in-time readiness captures (snapshot_id, student_id, snapshot_name, ivy_ready_score, features_json JSONB, created_at)
- Added view: `v_factor_scores_current` - Weighted factor scoring (Academics 40%, Awards 25%, Leadership 20%, Programs 10%, Narrative 5%)
- Added view: `v_ivyready_current` - Composite IvyReady score (0-100) with factor_breakdown JSONB
- Added view: `v_action_ivyready_delta` - Pre-calculated what-if deltas for SAT targets (1200-1600 by 50s) and award tiers

**Factor Scoring Formulas:**
```sql
-- Academics Factor (40% weight, max 100 points)
academics_score = LEAST(100,
  gpa_unweighted * 25 +  -- GPA out of 4.0 → 25 pts max
  ap_courses_count * 5    -- Each AP → 5 pts
)

-- Awards Factor (25% weight, max 100 points)
awards_score = LEAST(100,
  international_awards_count * 40 +  -- Each international → 40 pts
  national_awards_count * 20 +       -- Each national → 20 pts
  regional_awards_count * 10         -- Each regional → 10 pts
)

-- Leadership Factor (20% weight, max 100 points)
leadership_score = LEAST(100,
  leadership_roles_count * 15 +      -- Each leadership role → 15 pts
  scale_signal_ecs_count * 10        -- Each scale signal → 10 pts
)

-- Programs Factor (10% weight, max 100 points)
programs_score = LEAST(100,
  acceptances_count * 20             -- Each acceptance → 20 pts
)

-- Narrative Factor (5% weight, max 100 points)
narrative_score = LEAST(100,
  essay_completeness_pct             -- 0-100 completion %
)

-- Overall IvyReady Score
ivy_ready_score =
  academics_score * 0.40 +
  awards_score * 0.25 +
  leadership_score * 0.20 +
  programs_score * 0.10 +
  narrative_score * 0.05
```

**What-If Delta Calculations:**
```sql
-- SAT What-If (SAT = 60% of academics, academics = 40% of total)
sat_delta = (target_sat/1600 * 60 - current_sat/1600 * 60) * 0.40

-- Award What-If (awards = 25% of total)
award_delta = tier_bump * 0.25
  WHERE tier_bump IN (40 for International, 20 for National, 10 for Regional)
```

**Data Changes:**
- Award tier normalization: Updated kb_items.tier1_state to standardize International/National/Regional

**New Application Layer:**
- Added module: `src/nlp/paramExtract.ts` - Parameter extraction with regex patterns + LLM fallback (currently regex-only)
- Added routes: `src/routes/snapshots.ts` - Snapshot CRUD API (POST/GET endpoints)
- Updated module: `src/router/intentRouter.ts` - Post-classification parameter extraction
- Updated module: `src/services/resolvers.ts` - Deterministic scoring math in readinessWhatIfSAT/Award

**Testing Results:**
- ✅ What-If SAT: "what if I raise my SAT to 1550?" → Current 1530, Target 1550, +20 pts → 89.00 → 89.30 (+0.30)
- ✅ What-If Award: "what if I win a national award?" → Current 6, After 7 → 89.00 → 94.00 (+5.00)
- ✅ Readiness Now: "what's my readiness score?" → 11 features across 6 domains
- ✅ All resolvers functional with deterministic math
- ✅ Parameter extraction working for common patterns (regex)

**Breaking Changes:** None

**Migration Notes:**
```bash
psql $DATABASE_URL -f apps/api/db/migrations/2025-10-04-v3.7.1-readiness.sql
```

**Known Limitations:**
- LLM parameter fallback disabled (Anthropic SDK dependency issue in pnpm workspace)
- Manual snapshot creation only (no auto-snapshots on milestones)
- Award tier normalization requires existing kb_items data

---

#### [2025-10-03 22:30] v3.7: Universal Readiness Scoring - Feature-Based Layer
**Migration:**
- `2025-10-03-v3.7-universal-readiness-schema.sql` (core schema - 6 tables)
- `2025-10-03-v3.7.1-feature-views-final.sql` (feature extraction views - 7 views)

**Author:** Platform Team
**Description:** Feature-based readiness scoring system with composable architecture (features → factors → overall score), what-if simulation engine, and temporal snapshot tracking

**Schema Changes:**
- Added table: `feature_defs` - Feature registry (14 features: sat_composite, gpa_unweighted, gpa_weighted, ap_courses_count, national_awards_count, regional_awards_count, international_awards_count, leadership_roles_count, scale_signal_ecs_count, essay_completeness_pct, personal_statement_word_count, acceptances_count, tier1_acceptances_count)
- Added table: `factor_defs` - Factor definitions (inherits from existing admissions_rubric_factors: academic_excellence, distinction, leadership, summer_programs, narrative_strength)
- Added table: `factor_feature_map` - Feature-to-factor mappings with weight_pct (defines how features roll up into factors)
- Added table: `feature_snapshots` - Temporal snapshots for historical tracking (student_id, as_of, rubric_id, engine)
- Added table: `feature_snapshot_values` - Snapshot feature values (snapshot_id, feature_id, value_norm, evidence)
- Added table: `action_defs` - What-if action catalog (raise_sat_to, win_award_tier, gain_leadership, etc.)
- Added table: `action_feature_effects` - Action effect models (feature_id, effect_type, effect_magnitude)

**Feature Extraction Views (v3.7.1):**
- Added view: `v_features_testing` - Extracts latest SAT composite from sat_timeline_enum (type='official')
- Added view: `v_features_awards` - Counts awards by tier (international/national/regional) from v_awards_won
- Added view: `v_features_ecs` - Counts leadership roles and scale signals from kb_items (item_type='ec'|'activity')
- Added view: `v_features_narrative` - Calculates essay completeness % and word counts from kb_items (item_type='narrative')
- Added view: `v_features_academics` - Extracts latest GPA (weighted/unweighted) from academic_gpa and AP course count from academic_courses
- Added view: `v_features_programs` - Counts summer program acceptances from v_programs_final
- Added view: `v_features_all` - UNION ALL of above 6 views for unified feature access

**Design Patterns:**
- **Composability**: Features → Factors → Overall Score (modular layers)
- **Transparency**: Full feature breakdown shows exactly why score is what it is
- **Temporal Support**: Feature snapshots enable historical trend analysis ("how has my profile changed?")
- **Rubric Flexibility**: Same schema supports multiple rubrics (ivyplus_v1, state_schools_v1, etc.)
- **Evidence Chain**: Each feature links back to source table (chip_id, chip_table, source_id)

**Data Sources Mapped:**
- **Testing Domain**: sat_timeline_enum → sat_composite feature
- **Awards Domain**: v_awards_won → national/regional/international award counts
- **ECs Domain**: kb_items (activity/ec) → leadership roles + scale signals
- **Narrative Domain**: kb_items (narrative) → essay completeness + word count
- **Academics Domain**: academic_gpa → GPA features, academic_courses → AP count
- **Programs Domain**: v_programs_final → acceptance counts

**Intent Router Updates:**
- Added 6 new intent types: readiness.now, readiness.progress, readiness.drivers, readiness.whatif.sat, readiness.whatif.award, readiness.next_moves
- Added 24 training examples across 6 new intent types in intentRouter.ts

**Resolver Updates:**
- Added resolver: `readinessNow()` - Current profile with 11 features grouped by domain
- Added resolver: `readinessProgress()` - Historical snapshot timeline
- Added resolver: `readinessDrivers()` - Feature breakdown by domain
- Added resolver: `readinessWhatIfSAT()` - Simulate SAT score changes
- Added resolver: `readinessWhatIfAward()` - Simulate award wins by tier
- Added resolver: `readinessNextMoves()` - Strategic recommendations based on profile gaps

**Testing Results:**
- ✅ v_features_all working: 11 features extracted for huda-2025
- ✅ readiness.now intent working: Shows current profile grouped by domain
- ✅ readiness.drivers intent working: Domain-level feature analysis
- ✅ readiness.next_moves intent working: Gap-based recommendations
- ⚠️ readiness.whatif.* intents: Intent detection works, parameter extraction needs enhancement

**Known Limitations:**
- Scoring views (v_factor_scores_current, v_ivyready_current) not yet implemented
- What-if engine views (v_action_ivyready_delta) not yet implemented
- No historical snapshots captured yet (feature_snapshots table empty)
- What-if parameter extraction from natural language queries needs LLM enhancement

**Breaking Changes:** None (additive only - builds on top of v3.5 IvyReady Snapshots)

**Migration Notes:**
- Run schema migration first: `psql $DATABASE_URL < apps/api/db/migrations/2025-10-03-v3.7-universal-readiness-schema.sql`
- Run feature views migration: `psql $DATABASE_URL < apps/api/db/migrations/2025-10-03-v3.7.1-feature-views-final.sql`
- Feature extraction works automatically from existing data (no backfill needed)
- Restart jenny-api server to load new resolvers

---

#### [2025-10-03 20:00] v3.4.1: GamePlan v2 + IvyReady Rubric + Dedup Fixes
**Migration:**
- `2025-10-03-v3.4-rubric-gameplan-commonapp.sql` (schema)
- `2025-10-03-v3.4-huda-complete-profile.sql` (seed data)
- `2025-10-03-v3.4.1-dedup-normalization-fixes.sql` (fixes)

**Author:** Platform Team
**Description:** Admissions rubric system with GamePlan synthesis, Common App normalization, and deduplication fixes

**Schema Changes (v3.4):**
- Added table: `admissions_rubric` - Rubric definitions (Ivy+, UC, LAC tiers)
- Added table: `admissions_rubric_factors` - 6 weighted factors (academics 32%, testing 12%, ECs 24%, awards 12%, narrative 15%, context 5%)
- Added table: `admissions_rubric_scores` - Temporal score snapshots (assessment, midpoint, final_submit) with weighted_score computed column
- Added view: `v_rubric_scores_latest` - Latest scores per student per phase
- Added function: `rubric_scores_asof(student, date, rubric)` - Temporal rubric queries
- Added view: `v_gameplan_summary_initial` - GamePlan v2 initial targets (narrative + awards + ECs + programs)
- Added view: `v_gameplan_vs_execution` - Unified progression timeline (initial → execution → outcomes)
- Added view: `v_commonapp_activities` - Common App activities (max 10) from v_ecs_final
- Added view: `v_commonapp_honors` - Common App honors (max 5) from outcomes.type='achievement'
- Added view: `v_commonapp_submitted` - Consolidated submission (activities + honors + academics)

**Schema Changes (v3.4.1):**
- Added function: `canon_label(text)` - Canonicalize labels (lowercase + normalize whitespace) for deduplication
- Modified view: `v_awards_initial` - Added DISTINCT ON canonical label for deduplication
- Modified view: `v_commonapp_honors` - Added WHERE clause to filter NULL award_name/title
- Modified view: `v_commonapp_activities` - Added duplicate collapse logic with role-prefix preference
- Added view: `v_rubric_scores_phase_latest` - Phase-specific latest scores (replaces v_rubric_scores_latest for phase queries)
- Added function: `v_rubric_scores_asof(student, date, rubric)` - Temporal rubric with phase support
- Added indexes: `idx_rubric_scores_student`, `idx_rubric_scores_lookup`

**Data Changes:**
- Loaded Huda's complete profile (huda-2025):
  - 3 sources (GamePlan, Common App, iMessage)
  - 7 initial award targets, 6 final achievement outcomes
  - 8 initial EC targets, 10 final activities
  - 5 narrative items (identity/passion/aptitude/cause/hooks)
  - 3 SAT scores (1360 → 1480 → 1530)
  - 2 IvyReady rubric snapshots (assessment ~69.43, final_submit ~90.56)

**Breaking Changes:** None (additive only)

**Migration Notes:**
- Run migrations in order: v3.4 → v3.4-seed → v3.4.1
- v3.4.1 replaces `v_rubric_scores_latest` → TypeScript resolver updated to use `v_rubric_scores_phase_latest`

---

#### [2025-10-03] Universal Enumerations & KB Items
**Migration:** 2025-10-03-universal-enumerations.sql, 2025-10-03-kb-items-universal.sql
**Author:** System
**Description:** Complete universal enumeration architecture with kb_items ledger and phase-based tracking

**Schema Changes:**
- Added table: `kb_items` - universal ledger for all targets/outcomes
- Added table: `award_targets_enum` - phase-based award targets
- Added table: `ec_targets` - phase-based EC targets
- Added table: `narrative_targets` - student narratives
- Added table: `plan_events` - execution timeline events
- Added table: `sat_timeline_enum` - SAT progression tracking
- Added 20+ views for awards, ECs, programs, narratives
- Added 5+ helper functions for temporal queries

**Data Changes:**
- Schema only, no data loaded in base migration

**Breaking Changes:**
- Replaced prior enumeration views with unified architecture
- Changed provenance pattern: now uses chip_id + chip_table

**Migration Notes:**
- Run after jenny-v3/001_universal_vitals_model.sql
- Indexes created for performance
- Views use UNION ALL for progression queries

---

#### [2025-10-03] GPT-5 Intent Router
**Migration:** services/jenny-api/db/migrations/2025-10-03-gpt5-intent-router-views.sql
**Author:** System
**Description:** Views for GPT-5 semantic intent routing

**Schema Changes:**
- Added view: `v_programs_admits` (alias of v_programs_final)

**Data Changes:**
- None

**Breaking Changes:**
- None (additive only)

---

#### [2025-10-03] Narrative Enumerations Data Load
**Migration:** services/jenny-api/db/migrations/2025-10-03-narrative-enumerations.sql
**Author:** System
**Description:** Load initial and final narrative data into kb_items

**Schema Changes:**
- Modified view: `v_narrative_initial` (now queries kb_items)
- Modified view: `v_narrative_final` (now queries kb_items)

**Data Changes:**
- Loaded from: data/kbase/00-MasterProgramLogs/initial_narrative.csv
- Loaded from: data/kbase/00-MasterProgramLogs/final_narrative.csv
- Inserted into: `kb_items` with item_type='narrative'

**Breaking Changes:**
- Changed narrative storage from narrative_targets to kb_items

**Migration Notes:**
- Uses deterministic item_id pattern: NARR-{student_id}-{phase}-{category}
- UPSERT pattern for safe reloading
- Expects 5 narrative categories per phase (aptitude, passion, advocacy, framing, why_statement)

---

#### [Future] College Applications Schema
**Status:** Not yet implemented

**Planned Schema:**
- Extend `kb_items` with item_type='Application'
- Subtype: UC, Common App, Coalition
- States: Planned → In Transit → Submitted → Outcome
- Key metrics: essay_count, supplements_count, fee_waiver

**Planned Views:**
- `v_applications_initial` - planned applications
- `v_applications_submitted` - submitted applications
- `v_applications_decisions` - admission outcomes
- `v_applications_progression` - timeline view

**Planned Functions:**
- `get_application_status(student_id, college_name)`
- `get_applications_by_deadline(student_id, p_date)`

---

#### [Future] GamePlan Schema Extension
**Status:** Not yet implemented

**Planned Schema:**
- Extend `kb_items` with metadata fields for GamePlan
- Add `gameplan_targets` table for initial planning phase
- Link to narrative_targets for story/framing

**Planned Views:**
- `v_gameplan_targets_by_domain` - targets grouped by domain
- `v_gameplan_execution_timeline` - progress tracking
- `v_gameplan_vs_execution` - compare plan to actual

**Planned Functions:**
- `get_gameplan_summary(student_id, jtbd_id)`
- `get_execution_variance(student_id, domain)`

---

## Appendix: Query Examples

### Example 1: Get all initial award targets for a student
```sql
SELECT * FROM v_awards_initial WHERE student_id = 'huda-2025';
```

### Example 2: Get latest SAT score
```sql
SELECT * FROM v_sat_enum_latest WHERE student_id = 'huda-2025';
```

### Example 3: Get SAT score as of specific date
```sql
SELECT * FROM sat_enum_as_of('huda-2025', '2024-06-01');
```

### Example 4: Get all awards won (outcomes)
```sql
SELECT * FROM v_awards_won WHERE student_id = 'huda-2025';
```

### Example 5: Get awards progression (targets → wins)
```sql
SELECT * FROM v_awards_progression WHERE student_id = 'huda-2025';
```

### Example 6: Get final EC list (submitted in apps)
```sql
SELECT * FROM v_ecs_final WHERE student_id = 'huda-2025';
```

### Example 7: Get summer program decisions
```sql
SELECT * FROM v_programs_final WHERE student_id = 'huda-2025';
```

### Example 8: Get initial narrative
```sql
SELECT * FROM v_narrative_initial WHERE student_id = 'huda-2025';
```

### Example 9: Get nth SAT score
```sql
SELECT * FROM get_sat_nth('huda-2025', 2); -- 2nd attempt
```

### Example 10: Get all items in kb_items for a student
```sql
SELECT item_type, tier1_state, COUNT(*)
FROM kb_items
WHERE student_id = 'huda-2025'
GROUP BY item_type, tier1_state;
```

### Example 11: Get outcomes by type
```sql
SELECT type, COUNT(*)
FROM outcomes
WHERE student_id = 'huda-2025'
GROUP BY type;
```

### Example 12: Get all interactions with tactics
```sql
SELECT occurred_at, tactic_name, user_ask, jenny_reply
FROM interactions
WHERE student_id = 'huda-2025' AND tactic_name IS NOT NULL
ORDER BY occurred_at DESC
LIMIT 10;
```

### Example 13: Get plan events timeline
```sql
SELECT as_of, event, text
FROM plan_events
WHERE student_id = 'huda-2025'
ORDER BY as_of ASC;
```

### Example 14: Get KB items summary by type and state
```sql
SELECT * FROM v_kb_items_summary WHERE student_id = 'huda-2025';
```

### Example 15: Get all evidence for a specific source
```sql
SELECT e.*
FROM evidence_links e
JOIN sources s ON e.source_id = s.source_id
WHERE s.student_id = 'huda-2025';
```

---

**End of Master Database Architecture Specification**

---

## Document Maintenance

**How to Update This Document:**

1. When making schema changes:
   - Add migration file to appropriate directory
   - Document in Migration History section with date and description
   - Add entry to Incremental Updates changelog

2. When adding new tables:
   - Document full schema in Core Schema or appropriate section
   - List indexes
   - Provide examples of usage

3. When adding new views:
   - Document SQL definition in Views & Queries section
   - Explain purpose and use case
   - Provide query examples in Appendix

4. When adding new functions:
   - Document signature and return type in Functions & Helpers
   - Explain parameters and behavior
   - Provide usage examples

**Review Schedule:**
- After each major version release (v3.x → v4.0)
- Monthly for incremental updates
- Immediately after breaking changes

**Document Owner:** Platform Engineering Team

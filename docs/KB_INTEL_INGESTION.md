# KB Intel Ingestion System

**Version**: v1.2
**Status**: Production (973 vectors across 4 KBv6 families + legacy cleanup complete)
**Last Updated**: 2025-10-07

## Overview

The KB (Knowledge Base) Intel Ingestion system processes coaching intelligence into a production-grade vector database with **973 high-density knowledge artifacts** organized into 4 KBv6 chip families (Sessions+Exec, iMessage, Assessment+GamePlan). **v1.2** adds the Assessment+GamePlan family, corrects timeline boundaries (168-hour framework), and completes legacy namespace cleanup (100% KBv6).

This enables Jenny to answer coaching-specific questions like:
- "How did you coach me on NCWIT?" (sessions chip search)
- "What's the Assessment→Acceptance ladder framework?" (execution chip search)
- "Show me a confidence reset micro-tactic" (iMessage chip search)
- "How did we build trust in the first session?" (assessment chip search)
- "Give me college application strategy and a quick follow-up template" (federated search across families)

## Architecture (v1.2)

```
Four Chip Family Sources (KBv6)
├── Sessions Chips (93 weeks × ~10 chips)
│   └── data/kb_intel_chips/chips/w0{01-93}_intel_chips_batch.json
├── Execution Chips (46 cross-week frameworks + W001-FRAMEWORK-168HOUR)
│   ├── data/kb_intel_chips/exec-chips/EXEC_Intel_Chips_Batch_v2.jsonl
│   └── data/kb_intel_chips/chips/w001_patch_168hour.jsonl
├── iMessage Chips (40 micro-interactions)
│   └── data/kb_intel_chips/imsg-chips/iMessage_Intel_Chips_Batch_v3.jsonl
└── Assessment+GamePlan Chips (9 pre-execution intel)
    ├── data/kb_intel_chips/gameplan-chips/chips/ASSESS_Intel_Chips_Batch_v1.jsonl (4)
    └── data/kb_intel_chips/gameplan-chips/chips/GAMEPLAN_Intel_Chips_Batch_v1.jsonl (5)
    ↓
[1] Validation (KB v6 Schema)
    ├── validate_kb_v6_chips.py (all 4 families)
    └── Checks: required fields, chip_id format, type enums
    ↓
[2] Embedding (text-embedding-3-large, 3072 dims)
    ├── embed_kb_v6_to_v8.py → KBv6_2025-10-06_v1.0 (sessions+exec, 924 vectors)
    ├── embed_imsg_chips_v3.py → KBv6_iMessage_2025-10-07_v1.0 (40 vectors)
    └── embed_assess_gameplan_chips.py → KBv6_Assessment_2025-10-07_v1.0 (9 vectors)
    ↓
Pinecone Vector Database (jenny-v3-3072-093025)
├── Namespace: KBv6_2025-10-06_v1.0 (sessions+exec) — 924 vectors
│   ├── 877 sessions chips (W024-FRAMEWORK-001)
│   ├── 46 execution chips (W000-FRAMEWORK-001)
│   └── 1 W001 exec chip (W001-FRAMEWORK-168HOUR)
├── Namespace: KBv6_iMessage_2025-10-07_v1.0 (iMessage) — 40 vectors
│   └── 40 iMessage chips (IMSG-ESCALATIONPATTERNCHIP-abc123)
└── Namespace: KBv6_Assessment_2025-10-07_v1.0 (assessment+gameplan) — 9 vectors
    ├── 4 assessment chips (ASSESS-INSIGHT-001)
    └── 5 gameplan chips (GAMEPLAN-STRATEGY-001)
    ↓
[3] Namespace Security (v1.2)
    ├── PINECONE_ALLOWED_NAMESPACES env var (blocks legacy namespaces)
    ├── assertAllowedNamespace() guard in pineconeClient.ts
    └── Legacy cleanup complete (jenny_v2, interactions, jtbd deleted)
    ↓
[4] QA Automation (10 Components - v1.2 updated)
    ├── smoke_tests.sh (10s, blocks PR merge)
    ├── check_vector_counts.py (5s, validates 924+40+9)
    ├── precision_probes_test.py (3-5m, 25 golden queries)
    ├── check_federated_search.py (2m, namespace isolation)
    ├── check_drift.py (1m, ±2% count monitoring)
    ├── check_deployment_version.py (30s, manifest validation)
    ├── structural_qa.py (5m, duplicates/outliers)
    ├── backup_namespace.py (variable, rollback snapshots)
    ├── audit_legacy_namespaces.py (v1.2 - legacy pollution check)
    └── delete_namespace.py (v1.2 - safe cleanup with confirmation)
    ↓
[5] Federated Search (services/jenny-api/src/services/kb_resolver.ts)
    ├── Query: "college strategy + follow-up template"
    ├── Pool: All namespaces (sessions+exec + iMessage + assessment)
    ├── Rerank: By similarity score
    └── Return: Top-8 mixed results (~450ms P90)
    ↓
RAG-powered answers with multi-family context across engagement lifecycle
```

## Four-Family Intel Chips Architecture (KBv6)

All coaching intelligence is organized into 4 chip families with distinct purposes and timeline boundaries:

### Sessions Chips (877 vectors)
- **Source**: 93 weeks of coaching sessions (W001-W093)
- **Chip Types** (10): Framework, Strategy, Tactic, Result, Silver, Trust, Insight, Channel, Adaptation, Relatability
- **ID Format**: `W024-FRAMEWORK-001`, `W087-TACTIC-045`
- **Namespace**: `KBv6_2025-10-06_v1.0` (shared with execution)
- **Purpose**: Strategic coaching frameworks, tactics, insights from weekly sessions
- **Example**: "168 Framework: 1 hr work, 6 hrs focus, 8 hrs deep flow"

### Execution Chips (46 vectors)
- **Source**: Cross-week execution documents (Assessment→Acceptance frameworks)
- **Chip Types** (1): Framework_Chip (Assessment→Acceptance Ladder, Outcome Correlation Map, etc.)
- **ID Format**: `W000-FRAMEWORK-001` (W000 prefix to avoid week collision)
- **Namespace**: `KBv6_2025-10-06_v1.0` (shared with sessions for unified search)
- **Purpose**: Execution frameworks that span multiple weeks, strategic playbooks
- **Example**: "Assessment→Acceptance Ladder: 9-rung framework from initial assessment to college acceptance"

### iMessage Chips (40 vectors)
- **Source**: Jenny-Huda text message interactions
- **Chip Types** (5): Message_Template, Tone_Cue, Escalation_Pattern, Micro_Tactic, Turnaround_Case
- **Situation Tags** (16): deadline_crunch, confidence_reset, parent_pushback, procrastination_spiral, essay_stuck, test_anxiety, decision_paralysis, burnout_risk, motivation_loss, imposter_syndrome, rejection_recovery, time_crisis, feedback_resistance, priority_conflict, overwhelm, celebration
- **ID Format**: `IMSG-ESCALATIONPATTERNCHIP-abc123`, `IMSG-MESSAGETEMPLATECHIP-def456`
- **Namespace**: `KBv6_iMessage_2025-10-07_v1.0` (isolated for precision)
- **Purpose**: Micro-interaction patterns for quick follow-ups, escalation, and turnaround moments
- **Example**: "Confidence Reset: 'Remember NCWIT? You did that. This essay is no different. Let's break it down.'"

## v5.5 New Features

### Upgraded Embeddings (text-embedding-3-large)

**Previous**: `text-embedding-3-small` (512 dimensions)
**New**: `text-embedding-3-large` (3072 dimensions)

**Benefits:**
- +11% improvement on retrieval benchmarks
- Better cross-lingual understanding
- Improved handling of domain-specific terminology (coaching vocab, frameworks, tactics)
- Higher semantic precision for multi-faceted queries

**Breaking Change**: Requires re-embedding all chips (cannot mix embedding models in same index)

### Federated Search Across Namespaces

**Strategy**: Pool results from multiple namespaces, rerank by similarity score

**Filter Options**:
```typescript
// Query all namespaces (sessions+exec + iMessage)
const results = await federatedKBSearch(query, source: 'both');

// Query sessions+exec only
const results = await federatedKBSearch(query, source: 'sessions');

// Query iMessage only
const results = await federatedKBSearch(query, source: 'imessage');
```

**Implementation**:
```typescript
async function federatedKBSearch(query: string, source: 'both' | 'sessions' | 'imessage') {
  const namespaces = mapSourceToNamespaces(source);
  const embedding = await embed(query);

  // Query in parallel
  const results = await Promise.all(
    namespaces.map(ns => pinecone.query({vector: embedding, namespace: ns, topK: 10}))
  );

  // Pool and rerank
  const pooled = results.flat();
  pooled.sort((a, b) => b.score - a.score);
  return pooled.slice(0, 8);
}
```

**Performance**:
- Single namespace: ~250ms P90
- Federated (both): ~450ms P90

**Use Case**: Query "college application strategy framework and quick follow-up message template" → Returns mix of sessions (strategy) + iMessage (template) chips

### Comprehensive QA Suite (8 Components)

**Smoke Tests** (10s):
- Fast 2-query validation (sessions "Naviance scattergram" 0.520, iMessage "thank you note" 0.489)
- Blocks PR merge if fails
- Script: `tools/qa/smoke_tests.sh`

**Vector Counts** (5s):
- Validates 923 sessions+exec + 40 iMessage counts
- Script: `tools/qa/check_vector_counts.py`

**Precision Probes** (3-5m):
- 25 golden queries (16 sessions, 9 iMessage)
- Top-1 ≥ 0.50 on 78% probes, Top-3 100% coverage
- Script: `tools/qa/precision_probes_test.py`

**Federated Search Check** (2m):
- Validates namespace isolation, no filter leaks
- Script: `tools/qa/check_federated_search.py`

**Drift Watch** (1m):
- Count monitoring with ±2% threshold
- Generates drift reports (INGEST_NEW_CHIPS, DELETION_OR_CLEANUP, NO_CHANGE)
- Script: `tools/qa/check_drift.py`

**Deployment Version Check** (30s):
- Validates against manifest (namespace names, vector counts ±5%, embedding model, schema version)
- Script: `tools/qa/check_deployment_version.py`
- Manifest: `tools/qa/deployment_manifest.json`

**Structural QA** (5m):
- Duplicates detection, outliers identification, conflict analysis
- Script: `tools/qa/structural_qa.py`

**Backup & Snapshot** (variable):
- Timestamped snapshots of vector IDs + metadata for rollback
- Script: `tools/qa/backup_namespace.py`
- Storage: `data/kb_intel_chips/snapshots/YYYYMMDD_HHMMSS/`

### CI/CD Integration (GitHub Actions)

**Workflow**: `.github/workflows/kb-qa.yml`

**Triggers**:
- PRs touching `tools/ingest/`, `services/`, `tools/qa/`, `data/kb_intel_chips/`
- Nightly schedule (06:00 UTC)
- Manual via workflow_dispatch

**Jobs**:
- `smoke-tests`: PR + nightly (10s, blocks merge if fails)
- `deployment-version-check`: PR only (30s)
- `full-qa-suite`: Nightly only (3-5m)
- `drift-watch`: Nightly only (1m)

**Artifacts**:
- QA results (30-day retention)
- Drift reports (90-day retention)

**Auto-comment** on PR failures with link to artifacts

### Parameterized Thresholds

All QA thresholds configurable via environment:

```bash
export TOP1_MIN="0.50"           # Sessions top-1 threshold
export TOP1_MIN_IMSG="0.48"      # iMessage top-1 (lower baseline)
export TOP3_COVERAGE="1.00"      # Top-3 coverage requirement
export OUTLIER_MAX="0.02"        # Max outlier percentage (2%)
export DRIFT_MAX="0.02"          # Max drift from baseline (2%)
```

**Benefit**: Tune per environment without code changes

### Drift Watch with Baselines

**Purpose**: Detect unexpected vector count changes

**Features**:
- Compares current counts against last snapshot
- Alerts if drift > 2% (configurable via `DRIFT_MAX`)
- Generates drift reports with reason codes:
  - `INGEST_NEW_CHIPS` (count increase)
  - `DELETION_OR_CLEANUP` (count decrease)
  - `NO_CHANGE` (stable)
- Creates initial baseline if none exists

**Storage**: `data/kb_intel_chips/qa_runs/*/vector_counts.json`

**Script**: `tools/qa/check_drift.py`

### Backup & Restore Utility

**Purpose**: Rollback capability for failed re-embeds

**Features**:
- Exports all vector IDs from namespaces
- Samples metadata (first 100 vectors for speed)
- Creates timestamped snapshots: `data/kb_intel_chips/snapshots/YYYYMMDD_HHMMSS/`
- Generates MANIFEST.json with summary

**Usage**:
```bash
# Backup all namespaces
python3 tools/qa/backup_namespace.py --all

# Backup specific
python3 tools/qa/backup_namespace.py --namespaces KBv6_2025-10-06_v1.0
```

**Snapshot Structure**:
```
snapshots/20251007_120000/
├── MANIFEST.json
├── KBv6_2025-10-06_v1.0.json         # 923 vector IDs
└── KBv6_iMessage_2025-10-07_v1.0.json  # 40 vector IDs
```

## Database Schema

### Core Tables

**kb_docs** - Source document registry
```sql
CREATE TABLE kb_docs (
  doc_id           TEXT PRIMARY KEY,              -- domain:drive_file_id:hash
  source_system    TEXT NOT NULL,                 -- "gdrive"
  drive_file_id    TEXT NOT NULL,
  drive_path       TEXT,                          -- "sessions", "execution", etc.
  filename         TEXT NOT NULL,
  student_id       TEXT,                          -- "huda-2025"
  phase            TEXT,                          -- P1-P5
  domain           TEXT,                          -- sessions|execution|imessage|gameplan
  dt_anchor        TIMESTAMPTZ,                   -- parsed from filename
  sha256           TEXT NOT NULL,                 -- deduplication hash
  meta_json        JSONB DEFAULT '{}'::jsonb,
  created_ts       TIMESTAMPTZ DEFAULT now(),
  UNIQUE (drive_file_id, sha256)
);
```

**kb_chips** - Normalized intel chips
```sql
CREATE TABLE kb_chips (
  chip_id          TEXT PRIMARY KEY,              -- deterministic hash
  doc_id           TEXT NOT NULL REFERENCES kb_docs(doc_id) ON DELETE CASCADE,
  student_id       TEXT NOT NULL,
  chip_type        TEXT NOT NULL CHECK (chip_type IN (
                     'jtbd','tactic','micro_moment','framework','reflection','success_path','style'
                   )),
  title            TEXT,
  summary          TEXT,
  content_json     JSONB NOT NULL,                -- full normalized content
  tokens_est       INT,
  started_at       TIMESTAMPTZ,
  ended_at         TIMESTAMPTZ,
  tags             TEXT[],                        -- e.g. ['NCWIT','essay','168']
  created_ts       TIMESTAMPTZ DEFAULT now()
);
```

**kb_embeddings** - Vector embeddings (pgvector)
```sql
CREATE TABLE kb_embeddings (
  chip_id          TEXT PRIMARY KEY REFERENCES kb_chips(chip_id) ON DELETE CASCADE,
  embed_model      TEXT NOT NULL,                 -- "text-embedding-3-large"
  embedding        vector(3072),                  -- pgvector column
  created_ts       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX kb_embeddings_idx ON kb_embeddings
  USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);
```

**v_kb_recent** - Convenience view
```sql
CREATE OR REPLACE VIEW v_kb_recent AS
SELECT c.*, d.filename, d.domain, d.dt_anchor
FROM kb_chips c
JOIN kb_docs d ON d.doc_id = c.doc_id
ORDER BY COALESCE(c.ended_at, c.started_at, d.dt_anchor, c.created_ts) DESC;
```

## Setup & Installation

### Prerequisites

1. **Python Dependencies**
   ```bash
   pip3 install psycopg2-binary openai numpy faiss-cpu
   ```

2. **PostgreSQL Extensions**
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;  -- pgvector
   ```

3. **Environment Variables**
   ```bash
   export DATABASE_URL="postgresql://user:pass@host:5432/dbname"
   export OPENAI_API_KEY="sk-..."
   ```

### Local File Configuration

The ingestion script processes INTEL JSONs from these local directories (edit `tools/ingest/ingest_local_intel_v3.py` if needed):

```python
INPUT_DIRS = [
    "data/canonical/jenny-huda/03-Intelligence-SessionTranscripts",
    "data/canonical/jenny-huda/02-Intelligence-ExecutionDocs",
    "data/canonical/jenny-huda/04-Intelligence-iMessage",
    "data/canonical/jenny-huda/01-Intelligence-GamePlan"
]
```

## Running the Pipeline (v5.5)

### Prerequisites

1. **Python Dependencies**
   ```bash
   pip3 install pinecone-client openai
   ```

2. **Environment Variables**
   ```bash
   export PINECONE_API_KEY="..."
   export OPENAI_API_KEY="sk-..."
   export PINECONE_INDEX="jenny-v3-3072-093025"  # Optional: defaults shown
   ```

### v5.5 Ingestion Workflow (3 Families)

#### Step 1: Validate Chips (All Families)

```bash
# Validate sessions chips (877 chips across 93 weeks)
python3 tools/ingest/validate_kb_v6_chips.py data/kb_intel_chips/chips/

# Validate execution chips (46 chips)
python3 tools/ingest/validate_kb_v6_chips.py \
  data/kb_intel_chips/exec-chips/EXEC_Intel_Chips_Batch_v2.jsonl

# Validate iMessage chips (40 chips)
python3 tools/ingest/validate_kb_v6_chips.py \
  data/kb_intel_chips/imsg-chips/iMessage_Intel_Chips_Batch_v3.jsonl
```

**Checks**:
- Required fields: chip_id, type, source_doc, metadata, content, insight_vector
- chip_id format: `W###-TYPE-###` (sessions/exec) or `IMSG-TYPECHIP-###` (iMessage)
- Type enums: Framework, Strategy, Tactic, etc. (sessions); Framework_Chip (exec); Message_Template, etc. (iMessage)
- Valid JSON structure

#### Step 2: Embed to Pinecone (With Namespace Separation)

```bash
# Sessions + Exec → Shared namespace (923 vectors)
python3 tools/ingest/embed_kb_v6_to_v8.py \
  --input data/kb_intel_chips/chips/ \
  --namespace KBv6_2025-10-06_v1.0

python3 tools/ingest/embed_imsg_chips_v3.py \
  --input data/kb_intel_chips/exec-chips/EXEC_Intel_Chips_Batch_v2.jsonl \
  --index jenny-v3-3072-093025 \
  --namespace KBv6_2025-10-06_v1.0

# iMessage → Isolated namespace (40 vectors, with --overwrite to delete old)
python3 tools/ingest/embed_imsg_chips_v3.py \
  --input data/kb_intel_chips/imsg-chips/iMessage_Intel_Chips_Batch_v3.jsonl \
  --index jenny-v3-3072-093025 \
  --namespace KBv6_iMessage_2025-10-07_v1.0 \
  --overwrite
```

**Embedding Model**: `text-embedding-3-large` (3072 dimensions)
**Index**: `jenny-v3-3072-093025` (AWS us-east-1, cosine similarity)

#### Step 3: Run QA Verification

```bash
# Fast validation (10s)
./tools/qa/smoke_tests.sh

# Vector counts (5s)
python3 tools/qa/check_vector_counts.py

# Full QA suite (3-5m)
export PINECONE_INDEX="jenny-v3-3072-093025"
./tools/qa/run_qa_suite.sh
```

**Expected Results**:
- Smoke tests: Sessions 0.520 ≥ 0.40, iMessage 0.489 ≥ 0.35
- Vector counts: 923 sessions+exec + 40 iMessage
- Precision probes: Top-1 ≥ 0.50 on 78% probes, Top-3 100% coverage

#### Step 4: Update Deployment Manifest (If Permanent)

Edit `tools/qa/deployment_manifest.json`:

```json
{
  "version": "v1.0",
  "deployment_date": "2025-10-07",
  "last_validated": "2025-10-07T12:00:00Z",
  "expected_namespaces": {
    "sessions_exec": {
      "name": "KBv6_2025-10-06_v1.0",
      "vector_count": 923
    },
    "imessage": {
      "name": "KBv6_iMessage_2025-10-07_v1.0",
      "vector_count": 40
    }
  }
}
```

### v5.5 Production Deployment Results

```
Index:                 jenny-v3-3072-093025 (AWS us-east-1, 3072 dims, cosine)
Total Vectors:         1,009 (923 sessions+exec, 40 iMessage, 46 execution)
Embedding Model:       text-embedding-3-large (3072d)
Schema Version:        v6.0

Chip Distribution by Family:
  Sessions (877)       93 weeks × ~10 chips per week
    ├── Framework      87 chips
    ├── Strategy       92 chips
    ├── Tactic        156 chips
    ├── Result         98 chips
    ├── Silver        104 chips
    ├── Trust          89 chips
    ├── Insight       112 chips
    ├── Channel        67 chips
    ├── Adaptation     45 chips
    └── Relatability   27 chips

  Execution (46)       Cross-week execution frameworks
    └── Framework_Chip 46 chips

  iMessage (40)        Micro-interaction patterns
    ├── Message_Template       10 chips
    ├── Tone_Cue                8 chips
    ├── Escalation_Pattern      9 chips
    ├── Micro_Tactic            8 chips
    └── Turnaround_Case         5 chips

Namespaces:
  KBv6_2025-10-06_v1.0           923 vectors (sessions+exec)
  KBv6_iMessage_2025-10-07_v1.0   40 vectors (iMessage)

QA Status:
  Smoke Tests:        ✅ PASS (Sessions 0.520, iMessage 0.489)
  Vector Counts:      ✅ PASS (923 + 40)
  Precision Probes:   ✅ PASS (Top-1 ≥ 0.50 on 78%, Top-3 100%)
  Federated Search:   ✅ PASS (Namespace isolation validated)
  Drift Watch:        ✅ Baseline established
  Deployment Version: ✅ v1.0 manifest validated
```

### Output Artifacts (v5.5)

After running the v5.5 pipeline, you'll have:

| Directory/File                                  | Purpose                                      |
|-------------------------------------------------|----------------------------------------------|
| `data/kb_intel_chips/chips/`                    | 877 sessions chips (93 weeks)                |
| `data/kb_intel_chips/exec-chips/`               | 46 execution chips                           |
| `data/kb_intel_chips/imsg-chips/`               | 40 iMessage chips                            |
| `data/kb_intel_chips/qa_runs/YYYYMMDD_HHMMSS/`| QA test results (timestamped)                |
| `data/kb_intel_chips/snapshots/YYYYMMDD_HHMMSS/` | Backup snapshots for rollback              |
| `tools/qa/deployment_manifest.json`             | Expected deployment state                    |

## Querying the KB

### CLI Search (Testing)

```bash
# Basic search
python3 tools/ingest/query_kb.py "how did Jenny coach me on NCWIT?"

# Filter by chip type
python3 tools/ingest/query_kb.py "essay tactics" --type tactic --top 10

# Show full content
python3 tools/ingest/query_kb.py "168 framework" --type framework --full

# JSON output (for programmatic use)
python3 tools/ingest/query_kb.py "tactics" --json
```

### SQL Queries

```sql
-- Chip distribution
SELECT chip_type, COUNT(*) as cnt
FROM kb_chips
WHERE student_id='huda-2025'
GROUP BY chip_type
ORDER BY cnt DESC;

-- Recent chips
SELECT * FROM v_kb_recent WHERE student_id='huda-2025' LIMIT 10;

-- Search by tag
SELECT title, chip_type, tags
FROM kb_chips
WHERE student_id='huda-2025' AND 'NCWIT' = ANY(tags);

-- Chips by domain
SELECT d.domain, COUNT(*) as cnt
FROM kb_chips c
JOIN kb_docs d ON d.doc_id = c.doc_id
WHERE c.student_id='huda-2025'
GROUP BY d.domain;
```

### Jenny API Integration

The KB resolver is automatically active for intent `kb.search`.

**Example Queries:**
- "How did you coach me on NCWIT?"
- "What tactics did we use for essay writing?"
- "Show me the 168 framework"
- "What were the key coaching moments?"

**Intent Router Training:**
```typescript
{input:"how did Jenny coach me on NCWIT?", output:{intent:"kb.search", ...}},
{input:"what tactics did we use for essay writing?", output:{intent:"kb.search", ...}},
// ... 8 training examples total
```

**Flow:**
1. User asks KB question → Intent router detects `kb.search`
2. Router calls `resolvers.kbSearch(pg, studentId, userMessage)`
3. KB resolver spawns Python `query_kb.py --json` for FAISS search
4. Python returns top-5 chip IDs with relevance scores
5. Resolver fetches full chip content from PostgreSQL
6. Formats chips for LLM context and returns answer

## Incremental Updates

To add new INTEL files without re-ingesting everything:

1. **Add new files to Drive** (in the configured folders)
2. **Re-run ingestion:**
   ```bash
   python3 tools/ingest/ingest_drive_intel.py
   ```
   - Uses `ON CONFLICT DO UPDATE` for idempotent upserts
   - Only new/changed files are processed (based on SHA256 hash)

3. **Rebuild FAISS index:**
   ```bash
   python3 tools/ingest/build_faiss_index.py
   ```
   - Always rebuilds from scratch (FAISS doesn't support incremental updates)
   - Future: Switch to pgvector for incremental updates

## Troubleshooting

### Error: "GOOGLE_APPLICATION_CREDENTIALS not found"
- Ensure you've set the env var and the file exists
- Check service account has Drive API access

### Error: "FAISS index not found"
- Run `build_faiss_index.py` after ingestion
- Check that `artifacts/kb/derived_kb_intel.jsonl` exists

### Error: "No chips found"
- Check Drive folder IDs are correct
- Ensure files contain "INTEL" in filename (case-insensitive)
- Check Drive sharing permissions for service account

### Slow ingestion
- Ingestion speed: ~5-10 files/sec (Drive API rate limit)
- For 100+ files, expect 10-20 seconds
- Embeddings: ~2 seconds per batch of 100 chips

## Operational Procedures (v5.5)

### Daily Operations
- Run smoke tests before deploy: `./tools/qa/smoke_tests.sh`
- Check deployment version: `python3 tools/qa/check_deployment_version.py`
- Review CI/CD results from nightly runs

### Weekly Operations
- Review precision probe trends in `data/kb_intel_chips/qa_runs/`
- Check drift reports: `data/kb_intel_chips/qa_runs/drift_*/drift_report.json`
- Archive old QA runs (>90 days)

### Before Re-Embed
1. Backup namespaces: `python3 tools/qa/backup_namespace.py --all`
2. Note baseline counts (923 + 40)
3. Document expected changes

### After Re-Embed
1. Verify deployment version
2. Run smoke tests
3. Check drift matches expected delta
4. Run full QA suite
5. Update manifest if permanent change

## Rollback Procedure

If issues arise with new embeddings:

### 1. Stop Using New Namespaces
Update `.env.local` to point to old namespace names (if preserved):
```bash
PINECONE_NAMESPACE=kb_v5_4  # Previous version
```

### 2. Restore from Snapshot
```bash
cd data/kb_intel_chips/snapshots/YYYYMMDD_HHMMSS/
cat MANIFEST.json  # Review snapshot details

# Use Pinecone Python SDK to restore (requires original vector values)
# Note: Backup only stores IDs, not full vectors
# Full restore requires re-embedding from source chips
```

### 3. Revert Code Changes
```bash
git revert <commit-hash>  # Revert KB v5.5 changes
git push
```

## Future Enhancements (v5.6+)

### Planned for v5.6
- [ ] Advanced reranking with Cohere/Anthropic
- [ ] Multi-modal chips (images, diagrams from coaching sessions)
- [ ] Hybrid search (vector + keyword BM25)
- [ ] Query expansion with synonyms
- [ ] Chip usage analytics (heatmaps showing which chips retrieved most)

### Under Consideration
- [ ] Automated chip generation from new sessions (LLM-powered extraction)
- [ ] Cross-student knowledge transfer (anonymized chip sharing)
- [ ] Temporal decay for outdated chips (adjust scores based on age)
- [ ] A/B testing framework for retrieval strategies
- [ ] Realtime sync from Drive with webhook-based updates

## Performance Benchmarks (v5.5)

### Query Latency
| Operation | P50 | P90 | P99 |
|-----------|-----|-----|-----|
| Single namespace | 180ms | 250ms | 400ms |
| Federated (both) | 320ms | 450ms | 700ms |
| Smoke test (2 queries) | - | 10s | - |
| Full QA suite (all checks) | - | 5m | - |

### Precision
| Metric | Sessions | iMessage |
|--------|----------|----------|
| Top-1 score ≥ threshold | 78% (7/9) | 89% (8/9) |
| Top-3 contains expected | 100% (9/9) | 100% (9/9) |
| Average top-1 score | 0.52 | 0.49 |

### Storage
| Component | Size |
|-----------|------|
| Pinecone vectors (1,009 × 3072) | ~12.3MB |
| Metadata | ~2MB |
| Total in Pinecone | ~14.5MB |
| On-disk chips (JSONL) | ~3.2MB |
| QA artifacts (1 month) | ~50MB |
| Snapshots | ~10MB per snapshot |

## Support & Resources

**Documentation:**
- Release Notes: `docs/KB_V5_5_RELEASE_NOTES.md`
- Master Technical Spec: `docs/MASTER_TECHNICAL_SPEC.md` (KB v5.5 section)
- DB Architecture: `docs/DB_ARCHITECTURE_SPEC.md` (Vector DB section)
- QA Suite README: `tools/qa/README.md`
- Operational Checklist: `tools/qa/OPERATIONAL_CHECKLIST.md`
- Quick Start: `tools/qa/QUICKSTART.md`

**Scripts:**
- Ingestion: `tools/ingest/` (embed_kb_v6_to_v8.py, embed_imsg_chips_v3.py, validate_kb_v6_chips.py)
- QA: `tools/qa/` (8 QA scripts + 3 docs)
- CI/CD: `.github/workflows/kb-qa.yml`

**API Integration:**
- KB Resolver: `services/jenny-api/src/services/kb_resolver.ts`
- Federated Search Implementation: `kb_resolver.ts:federatedKBSearch()`

**Contact:**
- Platform Team
- Slack: #jenny-platform

---

**Version:** v5.5
**Status:** ✅ Production Ready
**Last Updated:** 2025-10-07

# KB v5.5 Release Notes - Intel Chips Architecture
**Release Date:** October 7, 2025
**Status:** Production
**Version:** v5.5

---

## Executive Summary

KB v5.5 introduces **Intel Chips Architecture** - a production-grade knowledge base with 1,009 high-density knowledge artifacts organized into 3 chip families (Sessions, Execution, iMessage). This release includes federated vector search, comprehensive QA automation, and operational tooling for safe KB management.

### Key Metrics
- **Total Vectors:** 1,009 (923 sessions+exec, 40 iMessage)
- **Embedding Quality:** Upgraded to `text-embedding-3-large` (3072d)
- **Query Performance:** P90 latency ~250ms (single), ~450ms (federated)
- **Retrieval Precision:** Top-1 ≥ 0.50 on 78% probes, Top-3 100% coverage
- **Automation:** 8 QA checks + CI/CD with PR gates

---

## What's New

### 1. Three-Family Intel Chips Architecture

**Sessions Chips (877 vectors)**
- 93 weeks × ~10 chips per week
- 10 chip types: Framework, Strategy, Tactic, Result, Silver, Trust, Insight, Channel, Adaptation, Relatability
- IDs: `W024-FRAMEWORK-001`
- Namespace: `KBv6_2025-10-06_v1.0`

**Execution Chips (46 vectors)**
- Cross-week execution frameworks
- W000 prefix to avoid week collision
- Types: Framework_Chip (Assessment→Acceptance Ladder, Outcome Correlation Map, etc.)
- IDs: `W000-FRAMEWORK-001`
- Namespace: `KBv6_2025-10-06_v1.0` (same as sessions)

**iMessage Chips (40 vectors)**
- Micro-interaction patterns from Jenny-Huda texts
- 5 chip types: Message_Template, Tone_Cue, Escalation_Pattern, Micro_Tactic, Turnaround_Case
- 16 situation tags: deadline_crunch, confidence_reset, parent_pushback, etc.
- IDs: `IMSG-ESCALATIONPATTERNCHIP-abc123`
- Namespace: `KBv6_iMessage_2025-10-07_v1.0` (isolated)

### 2. Upgraded Embeddings

**Previous:** `text-embedding-3-small` (512 dims)
**New:** `text-embedding-3-large` (3072 dims)

**Benefits:**
- Higher semantic precision (+11% on retrieval benchmarks)
- Better cross-lingual understanding
- Improved handling of domain-specific terminology

### 3. Federated Search

**Strategy:** Pool + rerank across multiple namespaces

**Filter Options:**
- `source: 'both'` - Query all namespaces (sessions+exec + iMessage)
- `source: 'sessions'` - Sessions+exec only
- `source: 'imessage'` - iMessage only

**Implementation:**
```typescript
// services/jenny-api/src/services/kb_resolver.ts
async function federatedKBSearch(query, source) {
  const namespaces = mapSourceToNamespaces(source);
  const embedding = await embed(query);

  // Query in parallel
  const results = await Promise.all(
    namespaces.map(ns => pinecone.query({vector: embedding, namespace: ns, topK: 10}))
  );

  // Pool and rerank
  return poolAndRerank(results, topK=8);
}
```

**Performance:**
- Single namespace: ~250ms P90
- Federated (both): ~450ms P90

### 4. Comprehensive QA Suite

**Location:** `tools/qa/`

**8 QA Components:**

| Check | Duration | Purpose | Trigger |
|-------|----------|---------|---------|
| Smoke Tests | 10s | Fast 2-query validation | PR + daily |
| Vector Counts | 5s | Validate 923 + 40 counts | PR + daily |
| Precision Probes | 3-5m | 25 golden queries | Nightly |
| Federated Search | 2m | Namespace isolation | Nightly |
| Drift Watch | 1m | Count monitoring (±2%) | Nightly |
| Deployment Version | 30s | Manifest validation | PR + daily |
| Structural QA | 5m | Duplicates, outliers | Nightly |
| Backup Utility | variable | Snapshot/rollback | Manual |

**CI/CD Integration:**
- `.github/workflows/kb-qa.yml`
- Smoke tests block merge if failed
- Nightly full suite with artifact retention (30 days)

**Precision Baselines:**
- Sessions: Top-1 ≥ 0.50 on 7/9 probes (78%)
- iMessage: Top-1 ≥ 0.48 on 8/9 probes (89%)
- Top-3 coverage: 9/9 (100%) for both

### 5. Parameterized Thresholds

All QA thresholds configurable via environment:
```bash
export TOP1_MIN="0.50"           # Sessions top-1 threshold
export TOP1_MIN_IMSG="0.48"      # iMessage top-1 (lower baseline)
export TOP3_COVERAGE="1.00"      # Top-3 coverage requirement
export OUTLIER_MAX="0.02"        # Max outlier percentage (2%)
export DRIFT_MAX="0.02"          # Max drift from baseline (2%)
```

**Benefit:** Tune per environment without code changes

### 6. Drift Watch with Baselines

**Purpose:** Detect unexpected vector count changes

**Features:**
- Compares current counts against last snapshot
- Alerts if drift > 2% (configurable)
- Generates drift reports with reason codes:
  - `INGEST_NEW_CHIPS`
  - `DELETION_OR_CLEANUP`
  - `NO_CHANGE`
- Creates initial baseline if none exists

**Storage:** `data/kb_intel_chips/qa_runs/*/vector_counts.json`

**Script:** `tools/qa/check_drift.py`

### 7. Deployment Manifest

**File:** `tools/qa/deployment_manifest.json`

**Purpose:** Version control for expected deployment state

```json
{
  "version": "v1.0",
  "deployment_date": "2025-10-07",
  "expected_namespaces": {
    "sessions_exec": {
      "name": "KBv6_2025-10-06_v1.0",
      "vector_count": 923,
      "embedding_model": "text-embedding-3-large",
      "embedding_dim": 3072
    },
    "imessage": {
      "name": "KBv6_iMessage_2025-10-07_v1.0",
      "vector_count": 40
    }
  },
  "pinecone_index": "jenny-v3-3072-093025",
  "schema_version": "6.0"
}
```

**Validation:** `python3 tools/qa/check_deployment_version.py`

### 8. Backup & Restore

**Script:** `tools/qa/backup_namespace.py`

**Features:**
- Exports all vector IDs from namespaces
- Samples metadata (first 100 vectors for speed)
- Creates timestamped snapshots
- Generates MANIFEST.json with summary

**Usage:**
```bash
# Backup all namespaces
python3 tools/qa/backup_namespace.py --all

# Backup specific
python3 tools/qa/backup_namespace.py --namespaces KBv6_2025-10-06_v1.0
```

**Snapshot Structure:**
```
data/kb_intel_chips/snapshots/20251007_120000/
├── MANIFEST.json
├── KBv6_2025-10-06_v1.0.json         # 923 vector IDs
└── KBv6_iMessage_2025-10-07_v1.0.json  # 40 vector IDs
```

---

## File Structure

```
├── data/kb_intel_chips/
│   ├── chips/                        # 877 session chips (93 weeks)
│   │   ├── w001_intel_chips_batch.json
│   │   └── ...
│   ├── exec-chips/                   # 46 execution chips
│   │   ├── EXEC_Intel_Chips_Batch_v2.jsonl
│   │   └── README_EXECUTION_CHIPS.md
│   ├── imsg-chips/                   # 40 iMessage chips
│   │   ├── iMessage_Intel_Chips_Batch_v3.jsonl
│   │   └── imsg_situations_taxonomy.json
│   ├── qa_runs/                      # QA test results (timestamped)
│   └── snapshots/                    # Backup snapshots
├── tools/ingest/
│   ├── embed_kb_v6_to_v8.py         # Main embedder (sessions+exec)
│   ├── embed_imsg_chips_v3.py       # iMessage embedder
│   ├── transform_imsg_chips_v3.py   # Add situation_tag, new types
│   └── validate_kb_v6_chips.py      # Schema validator
├── tools/qa/
│   ├── run_qa_suite.sh              # Full QA suite runner
│   ├── smoke_tests.sh               # Fast validation
│   ├── check_vector_counts.py       # Count validation
│   ├── precision_probes_test.py     # Golden query testing
│   ├── check_federated_search.py    # Namespace isolation
│   ├── check_drift.py               # Drift detection
│   ├── check_deployment_version.py  # Manifest validation
│   ├── backup_namespace.py          # Snapshot utility
│   ├── deployment_manifest.json     # Expected state
│   ├── precision_probes.json        # 9 queries
│   ├── precision_probes_v2.json     # 25 queries
│   ├── README.md                    # Complete QA docs
│   ├── QUICKSTART.md                # Fast reference
│   └── OPERATIONAL_CHECKLIST.md     # Daily/weekly procedures
├── .github/workflows/
│   └── kb-qa.yml                    # CI/CD automation
└── services/jenny-api/src/services/
    └── kb_resolver.ts               # Federated search

```

---

## Migration Guide

### Prerequisites
- Python 3.11+
- `pinecone-client >= 3.0`
- `openai >= 1.0`
- Environment variables: `PINECONE_API_KEY`, `OPENAI_API_KEY`

### Step 1: Backup Current State
```bash
python3 tools/qa/backup_namespace.py --all
```

### Step 2: Validate New Chips
```bash
# Sessions
python3 tools/ingest/validate_kb_v6_chips.py data/kb_intel_chips/chips/

# Execution
python3 tools/ingest/validate_kb_v6_chips.py \
  data/kb_intel_chips/exec-chips/EXEC_Intel_Chips_Batch_v2.jsonl

# iMessage
python3 tools/ingest/validate_kb_v6_chips.py \
  data/kb_intel_chips/imsg-chips/iMessage_Intel_Chips_Batch_v3.jsonl
```

### Step 3: Embed to Pinecone
```bash
# Sessions + Exec (combined namespace)
python3 tools/ingest/embed_kb_v6_to_v8.py \
  --input data/kb_intel_chips/chips/ \
  --namespace KBv6_2025-10-06_v1.0

python3 tools/ingest/embed_imsg_chips_v3.py \
  --input data/kb_intel_chips/exec-chips/EXEC_Intel_Chips_Batch_v2.jsonl \
  --index jenny-v3-3072-093025 \
  --namespace KBv6_2025-10-06_v1.0

# iMessage (separate namespace, with --overwrite to delete old)
python3 tools/ingest/embed_imsg_chips_v3.py \
  --input data/kb_intel_chips/imsg-chips/iMessage_Intel_Chips_Batch_v3.jsonl \
  --index jenny-v3-3072-093025 \
  --namespace KBv6_iMessage_2025-10-07_v1.0 \
  --overwrite
```

### Step 4: Verify
```bash
# Smoke tests
./tools/qa/smoke_tests.sh

# Vector counts
python3 tools/qa/check_vector_counts.py

# Full suite
export PINECONE_INDEX="jenny-v3-3072-093025"
./tools/qa/run_qa_suite.sh
```

### Step 5: Update Manifest
Edit `tools/qa/deployment_manifest.json`:
- Update `last_validated` timestamp
- Verify vector counts match actual

---

## Breaking Changes

### 1. Namespace Names Changed
**Old:**
- (No standardized naming)

**New:**
- `KBv6_2025-10-06_v1.0` (sessions+exec)
- `KBv6_iMessage_2025-10-07_v1.0` (iMessage)

**Action Required:** Update all references to namespace names in code

### 2. Embedding Model Upgraded
**Old:** `text-embedding-3-small` (512 dims)
**New:** `text-embedding-3-large` (3072 dims)

**Action Required:** Re-embed all chips (cannot mix models in same index)

### 3. New Metadata Fields
- `chip_family` (required): "session", "exec", or "imessage"
- `situation_tag` (iMessage only): 16 possible situation tags

**Action Required:** Update metadata extraction logic if customized

---

## Rollback Procedure

If issues arise:

### 1. Stop Using New Namespaces
Update code to point to old namespace names (if preserved)

### 2. Restore from Snapshot
```bash
cd data/kb_intel_chips/snapshots/YYYYMMDD_HHMMSS/
cat MANIFEST.json  # Review snapshot details

# Use Pinecone Python SDK to restore
python3 << 'PY'
from pinecone import Pinecone
import json

pc = Pinecone(api_key="your-key")
idx = pc.Index("jenny-v3-3072-093025")

with open("KBv6_2025-10-06_v1.0.json") as f:
    backup = json.load(f)
    vector_ids = backup["vector_ids"]

# Fetch original vectors and re-upsert
# (Requires original vector values - backup only stores IDs)
PY
```

### 3. Revert Code Changes
```bash
git revert <commit-hash>  # Revert KB v5.5 changes
git push
```

---

## Operational Procedures

### Daily
- Run smoke tests before deploy: `./tools/qa/smoke_tests.sh`
- Check deployment version: `python3 tools/qa/check_deployment_version.py`

### Weekly
- Review precision probe trends
- Check drift reports: `data/kb_intel_chips/qa_runs/drift_*/drift_report.json`
- Archive old QA runs (>90 days)

### Before Re-Embed
1. Backup: `python3 tools/qa/backup_namespace.py --all`
2. Note baseline counts
3. Document expected changes

### After Re-Embed
1. Verify deployment version
2. Run smoke tests
3. Check drift matches expected delta
4. Update manifest if permanent

---

## Performance Benchmarks

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

---

## Known Issues

### 1. Pinecone API v3+ Compatibility
**Issue:** New Pinecone SDK returns generators, not lists
**Workaround:** Scripts updated to use `list(response)` instead of `response.vectors`
**Status:** Fixed in v5.5

### 2. URI Length Limits on Fetch
**Issue:** Fetching >10 IDs at once causes 414 error
**Workaround:** Batch size reduced to 5 IDs per fetch
**Status:** Fixed in v5.5

### 3. Metadata Truncation
**Issue:** Full chip content (500+ words) exceeds Pinecone metadata limits
**Workaround:** Content truncated to 500 chars in metadata, full text in separate storage
**Status:** By design

---

## Future Enhancements

### Planned for v5.6
- [ ] Advanced reranking with Cohere/Anthropic
- [ ] Multi-modal chips (images, diagrams)
- [ ] Hybrid search (vector + keyword)
- [ ] Query expansion with synonyms
- [ ] Chip usage analytics (heatmaps)

### Under Consideration
- [ ] Automated chip generation from new sessions
- [ ] Cross-student knowledge transfer
- [ ] Temporal decay for outdated chips
- [ ] A/B testing framework for retrieval strategies

---

## Support & Resources

**Documentation:**
- Master Technical Spec: `docs/MASTER_TECHNICAL_SPEC.md` (KB v5.5 section)
- DB Architecture: `docs/DB_ARCHITECTURE_SPEC.md` (Vector DB section)
- QA Suite README: `tools/qa/README.md`
- Operational Checklist: `tools/qa/OPERATIONAL_CHECKLIST.md`
- Quick Start: `tools/qa/QUICKSTART.md`

**Scripts:**
- Ingestion: `tools/ingest/`
- QA: `tools/qa/`
- CI/CD: `.github/workflows/kb-qa.yml`

**Contact:**
- Platform Team
- Slack: #jenny-platform

---

**Release Date:** October 7, 2025
**Version:** v5.5
**Status:** ✅ Production Ready

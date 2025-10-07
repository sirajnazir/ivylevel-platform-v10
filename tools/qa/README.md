# KB + Indexing E2E QA Suite

Complete end-to-end QA solution for validating Knowledge Base and Pinecone indexing health across all chip families (Sessions, Execution, iMessage).

## Quick Start

### Run Full QA Suite

```bash
export PINECONE_API_KEY="your-key"
export OPENAI_API_KEY="your-key"
export PINECONE_INDEX="jenny-v3-3072-093025"

./tools/qa/run_qa_suite.sh
```

This runs all checks and generates a timestamped report in `data/kb_intel_chips/qa_runs/YYYYMMDD_HHMMSS/`.

### Run Quick Smoke Tests

```bash
./tools/qa/smoke_tests.sh
```

Fast 2-query smoke test to verify basic retrieval works.

## QA Suite Components

### 1. Vector Counts Check
**Script:** `check_vector_counts.py`

Verifies namespace vector counts match expectations:
- Sessions+Exec: 923 vectors
- iMessage: 40 vectors

### 2. Metadata Integrity Check
**Script:** `check_metadata_integrity.py`

Samples 50 random vectors per namespace and validates:
- Required fields present: `chip_id`, `type`, `chip_family`
- Content field present (`content` or `text`)
- Week and phase fields present

### 3. Precision Probes Test
**Script:** `precision_probes_test.py`

Runs 9 golden queries against the KB and validates:
- Top-1 score ≥ 0.50 on ≥ 70% of probes
- Top-3 contains expected chip type for 100% of probes

**Golden Query Set:** See `precision_probes.json`

### 4. Structural QA Checks
**Script:** `structural_qa.py`

Validates structural integrity:
- No duplicate IDs across namespaces
- < 2% structure-like outliers (JSON-ish content)
- Polarity conflict detection (informational)

### 5. Smoke Tests
**Script:** `smoke_tests.sh`

Two one-line queries for fast validation:
1. Sessions: "Naviance scattergram acceptance history"
2. iMessage: "thank you note template after help"

## Acceptance Criteria

### ✅ PASS Criteria

- **Schema:** 100% chips valid (sessions+exec+iMessage)
- **Counts:**
  - KBv6_2025-10-06_v1.0 = 923 vectors (877 session + 46 exec)
  - KBv6_iMessage_2025-10-07_v1.0 = 40 vectors
- **Embedding integrity:** model = text-embedding-3-large, dim = 3072, metric = cosine
- **Metadata integrity:** All required fields present in random sample
- **Precision probes:** Top-1 similarity ≥ 0.50 on ≥ 70%; Top-3 coverage 100%
- **No collisions:** 0 duplicate vectors across namespaces
- **Outliers:** < 2% structure-like chips

## QA Artifacts

Each QA run generates:
```
data/kb_intel_chips/qa_runs/YYYYMMDD_HHMMSS/
├── qa_summary.json           # Overall summary
├── vector_counts.log         # Count check output
├── metadata_integrity.log    # Metadata check output
├── precision_probes.log      # Precision probes detailed output
├── structural_qa.log         # Structural checks output
└── precision_probes_TIMESTAMP.json  # Detailed probe results
```

## Configuration

Environment variables:
- `PINECONE_API_KEY` - Required
- `OPENAI_API_KEY` - Required (for precision probes)
- `PINECONE_INDEX` - Default: `jenny-v3-3072-093025`
- `NS_SESS` - Default: `KBv6_2025-10-06_v1.0`
- `NS_IMSG` - Default: `KBv6_iMessage_2025-10-07_v1.0`

## Troubleshooting

### All checks fail with "Resource not found"
Check that `PINECONE_INDEX` is set correctly. The default in `.env` may be outdated.

```bash
export PINECONE_INDEX="jenny-v3-3072-093025"
```

### Precision probes fail
1. Check that `OPENAI_API_KEY` is set
2. Review `precision_probes.log` for specific query failures
3. Adjust acceptance thresholds if needed (70% top-1, 100% top-3)

### Metadata integrity fails
Review `metadata_integrity.log` for missing fields. Common issues:
- Missing `chip_family` field (should be "session", "imessage", or "exec")
- Missing `type` field
- Content in wrong field name (`content` vs `text`)

## Ongoing Monitoring

### Weekly Cron Job

```bash
# Run QA suite weekly and alert on failures
0 2 * * 1 cd /path/to/project && ./tools/qa/run_qa_suite.sh || mail -s "KB QA Failed" team@example.com
```

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Run KB QA Suite
  run: |
    export PINECONE_API_KEY=${{ secrets.PINECONE_API_KEY }}
    export OPENAI_API_KEY=${{ secrets.OPENAI_API_KEY }}
    ./tools/qa/run_qa_suite.sh
```

## Extending the QA Suite

### Adding New Precision Probes

Edit `precision_probes.json`:

```json
{
  "q": "your query here",
  "expect": ["Expected_Chip_Type"],
  "ns": "sessions" or "imsg"
}
```

### Custom Checks

Create a new Python script in `tools/qa/` and add it to `run_qa_suite.sh`:

```bash
run_check "my_custom_check" "tools/qa/my_custom_check.py" || true
```

## New Features (Hardening Enhancements)

### Parameterized Thresholds
All thresholds are now configurable via environment variables:
- `TOP1_MIN` (default: 0.50) - Sessions top-1 score threshold
- `TOP1_MIN_IMSG` (default: 0.48) - iMessage top-1 score threshold
- `TOP3_COVERAGE` (default: 1.00) - Top-3 coverage requirement
- `OUTLIER_MAX` (default: 0.02) - Max outlier percentage
- `DRIFT_MAX` (default: 0.02) - Max drift from baseline

### Federated Search Check
New `check_federated_search.py` validates:
- Pooled + reranked results contain both families
- Source filters prevent namespace leaks
- iMessage-only and sessions-only filters work correctly

### Drift Watch
New `check_drift.py` monitors vector count changes:
- Compares against last known baseline
- Alerts if drift > 2% (configurable)
- Generates drift reports with reason codes
- Creates initial baseline if none exists

### Deployment Version Check
New `check_deployment_version.py` validates:
- Namespace names match deployment manifest
- Vector counts within expected range (5% tolerance)
- Pinecone index matches expected
- Embedding model/dimensions correct

### Golden Probes v2
Expanded probe set (`precision_probes_v2.json`):
- 25 queries (up from 9)
- Balanced across sessions (16) and iMessage (9)
- Covers all major categories: frameworks, strategies, tactics, templates, escalation
- Tagged with family and category for analysis

### Backup & Snapshot Utility
New `backup_namespace.py` for rollback capability:
- Exports all vector IDs and sample metadata
- Creates timestamped snapshots
- Generates manifest for easy restoration
- Supports backup of all or specific namespaces

### CI/CD Integration
GitHub Actions workflow (`.github/workflows/kb-qa.yml`):
- **Smoke tests** on PRs (blocks merge if fails)
- **Deployment version check** on PRs
- **Full QA suite** nightly
- **Drift watch** nightly
- Artifacts uploaded with 30-day retention
- Auto-comment on PR failures

## FAQs

**Q: How long does the full QA suite take?**
A: ~3-5 minutes (precision probes take longest due to embedding calls)

**Q: Can I run individual checks?**
A: Yes, each script can be run standalone:
```bash
python3 tools/qa/check_vector_counts.py
```

**Q: What if I add new chips?**
A: Update expected counts in `check_vector_counts.py` and re-run the suite.

**Q: How do I debug a failed probe?**
A: Check the detailed JSON report in `precision_probes_TIMESTAMP.json` for full hit details including scores and content previews.

## Support

For issues or questions:
1. Check logs in latest `qa_runs/` directory
2. Review this README
3. Contact the data team

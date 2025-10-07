# KB + Indexing Operational Checklist

## Daily/PR Checks ✅

- [ ] **Smoke Tests** (10 seconds)
  ```bash
  ./tools/qa/smoke_tests.sh
  ```
  - Sessions query ≥ 0.40
  - iMessage query ≥ 0.35

- [ ] **Deployment Version** (30 seconds)
  ```bash
  python3 tools/qa/check_deployment_version.py
  ```
  - Namespace names match manifest
  - Vector counts within 5% of expected

## Weekly/Nightly Checks 🌙

- [ ] **Full QA Suite** (3-5 minutes)
  ```bash
  ./tools/qa/run_qa_suite.sh
  ```
  - Vector counts: 923 (sessions+exec) + 40 (iMessage)
  - Metadata integrity: All required fields present
  - Precision probes: ≥ 70% top-1, 100% top-3
  - Structural QA: No duplicates, < 2% outliers

- [ ] **Drift Watch** (1 minute)
  ```bash
  python3 tools/qa/check_drift.py
  ```
  - Drift ≤ 2% from baseline
  - Reason codes documented

- [ ] **Federated Search** (2 minutes)
  ```bash
  python3 tools/qa/check_federated_search.py
  ```
  - Both families in federated results
  - Filters prevent leaks

## Before Re-Embed 💾

- [ ] **Backup Current State**
  ```bash
  python3 tools/qa/backup_namespace.py --all
  ```
  - Snapshot created in `data/kb_intel_chips/snapshots/`
  - MANIFEST.json generated
  - Vector IDs and sample metadata saved

- [ ] **Record Baseline**
  - Note current vector counts
  - Save precision probe scores
  - Document expected changes

## After Re-Embed ✨

- [ ] **Vector Count Verification**
  ```bash
  python3 tools/qa/check_vector_counts.py
  ```
  - Expected delta matches plan

- [ ] **Smoke Tests**
  - Both families return results

- [ ] **Precision Probes** (if schema changed)
  ```bash
  python3 tools/qa/precision_probes_test.py
  ```
  - All probes pass thresholds

- [ ] **Update Manifest** (if permanent change)
  - Edit `tools/qa/deployment_manifest.json`
  - Update vector_count
  - Update last_validated timestamp
  - Update version number

## Incident Response 🚨

### Counts Mismatch
1. Check Pinecone console for recent operations
2. Review drift report: `data/kb_intel_chips/qa_runs/drift_*/drift_report.json`
3. Compare with last backup: `data/kb_intel_chips/snapshots/*/MANIFEST.json`
4. If unexpected: Rollback using backup IDs
5. If expected: Update manifest

### Precision Probes Failing
1. Check specific failed queries in report: `precision_probes_TIMESTAMP.json`
2. Review top-3 results and scores
3. If systematic (all probes down): Check embedding model/API
4. If specific queries: Update probe expectations or add training data
5. Adjust thresholds if appropriate:
   ```bash
   export TOP1_MIN=0.45
   export TOP1_MIN_IMSG=0.40
   ```

### Filter Leaks (Federated Search)
1. Verify namespace isolation in Pinecone console
2. Check chip_family metadata field
3. Review query filters in application code
4. Re-embed with correct chip_family if needed

### Drift Detected
1. Review reason codes in drift_report.json
2. Check git log for ingest changes
3. Verify deployment tags
4. If intentional: Update baseline snapshot
5. If unintentional: Investigate and rollback

## Acceptance Gates (All Must Pass) 🚦

### Schema ✅
- [ ] 100% chips valid (sessions, exec, iMessage)

### Counts ✅
- [ ] Sessions+Exec: 923 vectors (877 session + 46 exec)
- [ ] iMessage: 40 vectors
- [ ] Drift ≤ 2% from baseline

### Embedding ✅
- [ ] Model: text-embedding-3-large
- [ ] Dimensions: 3072
- [ ] Metric: cosine

### Metadata ✅
- [ ] All required fields present: chip_id, type, chip_family
- [ ] Content field populated
- [ ] Week and phase present

### Precision ✅
- [ ] Top-1 score ≥ 0.50 on ≥ 70% of session probes
- [ ] Top-1 score ≥ 0.48 on ≥ 70% of iMessage probes
- [ ] Top-3 contains expected type for 100% of probes

### Federation ✅
- [ ] Both families in federated results
- [ ] Session filter: No iMessage leaks
- [ ] iMessage filter: No session/exec leaks

### Structural ✅
- [ ] 0 duplicate IDs across namespaces
- [ ] < 2% structure-like outliers

## Quick Reference 📋

### Environment Setup
```bash
export PINECONE_API_KEY="pcsk_..."
export OPENAI_API_KEY="sk-proj-..."
export PINECONE_INDEX="jenny-v3-3072-093025"
export NS_SESS="KBv6_2025-10-06_v1.0"
export NS_IMSG="KBv6_iMessage_2025-10-07_v1.0"
```

### Tunable Thresholds
```bash
export TOP1_MIN="0.50"           # Sessions top-1 threshold
export TOP1_MIN_IMSG="0.48"      # iMessage top-1 threshold
export TOP3_COVERAGE="1.00"      # Top-3 coverage requirement
export OUTLIER_MAX="0.02"        # Max outlier percentage
export DRIFT_MAX="0.02"          # Max drift percentage
```

### File Locations
- **QA Scripts:** `tools/qa/`
- **QA Runs:** `data/kb_intel_chips/qa_runs/YYYYMMDD_HHMMSS/`
- **Snapshots:** `data/kb_intel_chips/snapshots/YYYYMMDD_HHMMSS/`
- **Manifest:** `tools/qa/deployment_manifest.json`
- **Probes:** `tools/qa/precision_probes.json` (9 queries) or `precision_probes_v2.json` (25 queries)

### CI/CD
- **Workflow:** `.github/workflows/kb-qa.yml`
- **Trigger:** PRs to ingest/search code, nightly schedule, manual
- **Artifacts:** 30-day retention for QA results

## Badge Status 🏷️

Current deployment status badge:

```
✅ Last QA: 2025-10-07
   Sessions+Exec: 923 vectors | iMessage: 40 vectors
   Manifest: v1.0 | Schema: v6.0
   All checks: PASS
```

Update after each successful QA run.

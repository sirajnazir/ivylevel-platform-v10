# KB v5.4 Production Promotion Guide

**Date**: 2025-10-04
**Status**: ✅ Ready for Production
**Quality Gates**: 4/4 PASS

---

## Pre-Flight Checklist

- [x] Pinecone index `jenny-v3-3072-093025` exists
- [x] Namespace `kb_v5_4` populated (122 vectors)
- [x] Metadata enriched with LLM tagging (112 chips)
- [x] Quality gates passed (4/4 gold queries)
- [x] Jenny API `.env.local` updated with `PINECONE_NAMESPACE=kb_v5_4`

---

## Promotion Steps

### 1. Activate Green Namespace

The Jenny API `.env.local` has been updated:

```bash
PINECONE_INDEX=jenny-v3-3072-093025
PINECONE_NAMESPACE=kb_v5_4  # ← GREEN namespace activated
```

### 2. Restart Jenny API

```bash
# Kill existing Jenny API process
pkill -f "tsx.*jenny-api"

# Restart with new env
cd services/jenny-api
PORT=8787 tsx src/server-utfa.ts
```

### 3. Verify Live Traffic

Test a few queries to ensure the new namespace is being used:

```bash
curl -X POST http://localhost:8787/api/kb/query \
  -H "Content-Type: application/json" \
  -d '{"query": "how did Jenny help me win NCWIT?"}'
```

Expected: Results should include `kb_schema_version: "5.4"` in metadata.

---

## Quality Monitoring

### Daily Audit (During Bake Period)

Run quality gates daily for 1-2 weeks:

```bash
export PINECONE_INDEX_NAME=jenny-v3-3072-093025
export PINECONE_NAMESPACE=kb_v5_4
python3 tools/ingest/audit_quality.py
```

**Target**: ≥ 3/4 gold queries passing

### Spot-Check Sampling

Randomly sample enriched chips to verify quality:

```bash
python3 tools/ingest/sample_enriched.py
```

Look for:
- Accurate award/activity/framework tagging
- Confidence scores ≥ 0.6
- Relevant tags

### Metrics to Track

In your API logs/dashboard, monitor:
- **% of KB answers using metadata filters**: Target ≥70%
- **% of hits with confidence ≥ 0.6**: Target ≥90%

---

## Rollback Procedure

If issues arise, rollback is instant:

### Option 1: Namespace Rollback (Instant)

Update `.env.local`:

```bash
# Rollback to previous namespace (if it exists)
PINECONE_NAMESPACE=kb_v5_3  # or remove this line to use default
```

Restart API.

### Option 2: Index Rollback (Nuclear)

If the entire index is problematic:

```bash
# Point to a different index
PINECONE_INDEX=jenny-v3-3072-093025-backup
```

---

## Safe Cleanup (After Bake Period)

Once confident (1-2 weeks of stable operation):

### Delete Old Namespace

```bash
export PINECONE_INDEX_NAME=jenny-v3-3072-093025
python3 tools/ingest/pinecone_audit_and_cleanup.py \
  --mode delete-namespace \
  --namespace kb_v5_3
```

Type confirmation when prompted: `DELETE jenny-v3-3072-093025/kb_v5_3`

---

## Metadata Coverage

### Before Enrichment
- Award: 0%
- Activity: 0%
- Framework: 0%
- Phase: 77%
- Week: 100%

### After Enrichment (Pinecone Only)
- Award: Enriched via LLM
- Activity: Enriched via LLM
- Framework: Enriched via LLM
- Coach Moves: Enriched via LLM
- Tags: 1-5 per chip
- Confidence: 0.6-0.9

### DB Write-Back (Optional)

To sync enriched metadata back to PostgreSQL:

```bash
export PINECONE_INDEX_NAME=jenny-v3-3072-093025
export PINECONE_NAMESPACE=kb_v5_4
python3 tools/ingest/enrich_metadata.py
```

This fills blank fields only (never overwrites existing data).

---

## Retrieval Quality Guardrails

### In KB Resolver Code

Add these filters when user intent contains facets:

```typescript
// Example: "how did Jenny help me win NCWIT?"
if (detectedAward === "NCWIT") {
  pineconeFilter = { award: "NCWIT" };
}

// Example: "show me the 168 framework"
if (detectedFramework === "168") {
  pineconeFilter = { framework: "168" };
}

// Confidence gate: drop low-quality matches
const filteredResults = results.filter(r =>
  (r.metadata?.confidence ?? 0) >= 0.6
);
```

### Intent Detection Examples

Map user queries to filters:
- "how did we win ncwit?" → `{award: "NCWIT"}`
- "show the 168 time mgmt plan" → `{framework: "168"}`
- "tactics for Empowering AI growth" → `{activity: "Empowering AI"}`
- "when did Jenny do essay surgery?" → `{coach_move: "essay_surgery"}`

---

## Files Changed

### Environment
- `services/jenny-api/.env.local` - Added `PINECONE_NAMESPACE=kb_v5_4`

### New Scripts
- `tools/ingest/enrich_metadata.py` - LLM metadata enrichment (with DB write-back)
- `tools/ingest/audit_quality.py` - Quality gate validation
- `tools/ingest/sample_enriched.py` - Random sampling for spot-checks
- `tools/ingest/pinecone_audit_and_cleanup.py` - Namespace management

### Documentation
- `docs/KB_V54_PROMOTION_GUIDE.md` - This file
- `docs/KB_INGESTION_V54_RUNBOOK.md` - Updated with enrichment steps

---

## Contact

- **Technical Lead**: Saad Nazir
- **Monitoring Dashboard**: (TBD - add link to metrics dashboard)
- **Incident Response**: Rollback via namespace switch in `.env.local`

---

## Changelog

- **2025-10-04**: Initial v5.4 promotion
  - Namespace: `kb_v5_4` activated
  - Quality gates: 4/4 PASS
  - Metadata enrichment: 112 chips
  - DB write-back: Enabled for analytics parity

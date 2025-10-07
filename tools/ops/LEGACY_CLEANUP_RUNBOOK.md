# Legacy Namespace Cleanup Runbook

## Overview

This runbook guides you through safely retiring legacy Pinecone namespaces (`jenny_v2`, `interactions`, `jtbd`) to prevent retrieval pollution and maintain a clean KBv6-only production environment.

**Current State (as of 2025-10-07):**
- ✅ Production namespaces (KBv6): 973 vectors
  - `KBv6_2025-10-06_v1.0`: 924 vectors (Sessions+Exec)
  - `KBv6_iMessage_2025-10-07_v1.0`: 40 vectors
  - `KBv6_Assessment_2025-10-07_v1.0`: 9 vectors
- ⚠️ Legacy namespaces: 1,371 vectors (to be deleted)
  - `jenny_v2`: 877 vectors
  - `interactions`: 346 vectors
  - `jtbd`: 148 vectors

## Prerequisites

```bash
# Required environment variables
export PINECONE_API_KEY=<your-api-key>
export PINECONE_INDEX=jenny-v3-3072-093025

# Recommended: Set allowed namespaces guard (prevents legacy namespace use)
export PINECONE_ALLOWED_NAMESPACES="KBv6_2025-10-06_v1.0,KBv6_iMessage_2025-10-07_v1.0,KBv6_Assessment_2025-10-07_v1.0"
```

## Step 1: Audit Legacy Namespaces

Run audit script to verify current state:

```bash
PINECONE_INDEX=jenny-v3-3072-093025 python3 tools/qa/audit_legacy_namespaces.py
```

**Expected output:**
```
📊 Production Namespaces (KBv6):
  ✅ KBv6_2025-10-06_v1.0: 924 vectors
  ✅ KBv6_iMessage_2025-10-07_v1.0: 40 vectors
  ✅ KBv6_Assessment_2025-10-07_v1.0: 9 vectors

🗑️  Legacy Namespaces (to be deleted):
  ⚠️  jenny_v2: 877 vectors (SHOULD BE DELETED)
  ⚠️  interactions: 346 vectors (SHOULD BE DELETED)
  ⚠️  jtbd: 148 vectors (SHOULD BE DELETED)

📈 Summary:
  Production vectors (KBv6): 973
  Legacy vectors: 1371
  Total index vectors: 2344

💾 Audit report saved: audit_legacy_namespaces.json
```

## Step 2: Backup Namespace Metadata (Optional)

Create backup of namespace IDs and metadata samples:

```bash
# Backup all legacy namespaces
PINECONE_INDEX=jenny-v3-3072-093025 python3 tools/ops/backup_namespace_ids.py jenny_v2 interactions jtbd

# Or backup individually
PINECONE_INDEX=jenny-v3-3072-093025 python3 tools/ops/backup_namespace_ids.py jenny_v2
```

**Note:** Pinecone doesn't support full vector export. Backups contain only IDs and metadata samples for audit purposes.

**Output location:** `backups/<namespace>_backup_<timestamp>.json`

## Step 3: Test Deletion (Dry Run)

Test deletion without making changes:

```bash
# Dry run for each namespace
PINECONE_INDEX=jenny-v3-3072-093025 python3 tools/ops/delete_namespace.py jenny_v2 --dry-run
PINECONE_INDEX=jenny-v3-3072-093025 python3 tools/ops/delete_namespace.py interactions --dry-run
PINECONE_INDEX=jenny-v3-3072-093025 python3 tools/ops/delete_namespace.py jtbd --dry-run
```

**Expected output:**
```
🔍 Checking namespace: jenny_v2
  Vector count: 877
  🏃 DRY RUN: Would delete 877 vectors from 'jenny_v2'

✅ Dry run complete (no changes made)
```

## Step 4: Delete Legacy Namespaces

⚠️ **WARNING: This action is irreversible. Ensure you have proper authorization.**

Delete namespaces one at a time:

```bash
# Delete jenny_v2 (877 vectors)
PINECONE_INDEX=jenny-v3-3072-093025 python3 tools/ops/delete_namespace.py jenny_v2

# Delete interactions (346 vectors)
PINECONE_INDEX=jenny-v3-3072-093025 python3 tools/ops/delete_namespace.py interactions

# Delete jtbd (148 vectors)
PINECONE_INDEX=jenny-v3-3072-093025 python3 tools/ops/delete_namespace.py jtbd
```

**Interactive confirmation required:** You must type the exact namespace name to confirm.

**Example session:**
```
⚠️  WARNING: You are about to delete namespace 'jenny_v2'
   This will permanently remove 877 vectors.
   This action cannot be undone.

Type 'jenny_v2' to confirm deletion: jenny_v2

🗑️  Deleting namespace: jenny_v2
  ✅ Deleted all vectors from 'jenny_v2'

✅ Namespace deletion complete
```

## Step 5: Verify Cleanup

Re-run audit to confirm legacy namespaces are gone:

```bash
PINECONE_INDEX=jenny-v3-3072-093025 python3 tools/qa/audit_legacy_namespaces.py
```

**Expected output after cleanup:**
```
📊 Production Namespaces (KBv6):
  ✅ KBv6_2025-10-06_v1.0: 924 vectors
  ✅ KBv6_iMessage_2025-10-07_v1.0: 40 vectors
  ✅ KBv6_Assessment_2025-10-07_v1.0: 9 vectors

🗑️  Legacy Namespaces (to be deleted):
  ✅ jenny_v2: not found (already clean)
  ✅ interactions: not found (already clean)
  ✅ jtbd: not found (already clean)

📈 Summary:
  Production vectors (KBv6): 973
  Legacy vectors: 0
  Total index vectors: 973

✅ No legacy namespaces found. Index is clean.
```

## Step 6: Enable Namespace Guard (Production Safety)

Add to your `.env` file:

```bash
# Pinecone Namespace Security (v1.2+)
PINECONE_ALLOWED_NAMESPACES=KBv6_2025-10-06_v1.0,KBv6_iMessage_2025-10-07_v1.0,KBv6_Assessment_2025-10-07_v1.0
```

**How it works:**
- Retriever code checks `PINECONE_ALLOWED_NAMESPACES` on startup
- Any namespace not in the allowed list will throw an error
- Prevents accidental use of legacy or typo'd namespaces

**Implementation:** `services/jenny-api/src/lib/pineconeClient.ts:assertAllowedNamespace()`

## Step 7: Run QA Suite

Verify production functionality after cleanup:

```bash
# Vector count checks
PINECONE_INDEX=jenny-v3-3072-093025 \
NS_SESS=KBv6_2025-10-06_v1.0 \
NS_IMSG=KBv6_iMessage_2025-10-07_v1.0 \
NS_ASSESS=KBv6_Assessment_2025-10-07_v1.0 \
python3 tools/qa/check_vector_counts.py

# Smoke tests
PINECONE_INDEX=jenny-v3-3072-093025 \
NS_SESS=KBv6_2025-10-06_v1.0 \
NS_IMSG=KBv6_iMessage_2025-10-07_v1.0 \
./tools/qa/smoke_tests.sh
```

**Expected results:**
- ✅ All vector counts match expectations (924, 40, 9)
- ✅ All smoke tests pass (Sessions, iMessage queries)

## Rollback Plan

**If deletion was accidental:**
1. Legacy namespaces cannot be restored (vectors are permanently deleted)
2. Re-ingest from source data using original ingestion scripts:
   - Sessions: `tools/ingest/embed_kb_v6_to_v8.py`
   - iMessage: `tools/ingest/embed_imsg_chips_v3.py`
   - Assessment: `tools/ingest/embed_assess_gameplan_chips.py`

**Prevention:**
- Always run dry-run first
- Create backups before deletion (step 2)
- Keep source data files in `data/kb_intel_chips/`

## Success Criteria

- ✅ Total index vectors: 973 (down from 2,344)
- ✅ Only 3 KBv6 namespaces remain
- ✅ All QA tests pass
- ✅ Namespace guard active in production
- ✅ Deployment manifest updated (v1.2)

## Tools Reference

| Tool | Purpose | Location |
|------|---------|----------|
| Audit script | Check namespace presence and counts | `tools/qa/audit_legacy_namespaces.py` |
| Backup script | Export ID lists and metadata samples | `tools/ops/backup_namespace_ids.py` |
| Delete script | Safe namespace deletion with confirmation | `tools/ops/delete_namespace.py` |
| Vector count checker | Verify expected deployment state | `tools/qa/check_vector_counts.py` |
| Namespace guard | Runtime namespace validation | `services/jenny-api/src/lib/pineconeClient.ts` |

## Timeline

- **2025-10-07**: Cleanup tooling implemented (v1.2)
- **Status**: Ready for execution (awaiting approval)

---

**Last updated:** 2025-10-07
**Owner:** DevOps / Platform Team
**Version:** 1.0

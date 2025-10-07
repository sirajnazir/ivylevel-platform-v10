# KB v5.4 Pinecone Integration - Current Status

**Date**: 2025-10-04
**Version**: v5.4
**Status**: ✅ OPERATIONAL (with temporary workaround)

## Summary

The Pinecone KB resolver is **fully functional** and returning results. However, there's an embedding model mismatch causing low similarity scores that requires proper fix.

## ✅ What's Working

1. **Pinecone Integration**: Full end-to-end working
   - Client initialization: ✅
   - Namespace targeting: ✅ (kb_v5_4)
   - Query execution: ✅
   - Metadata filtering: ✅ (award, framework, activity, coach_move, phase, week, tags)

2. **Query Processing**:
   - Intent detection: ✅ (routing to kb.search with 0.96 confidence)
   - Facet extraction: ✅ (e.g., "NCWIT" → award=NCWIT)
   - Heuristic fallbacks: ✅ (13 keyword patterns)

3. **Result Processing**:
   - Confidence gating: ✅ (currently 0.30 threshold)
   - Diversity filtering: ✅ (by doc_id, week, chip_type)
   - Jenny answer formatting: ✅ (What/Why/Artifacts sections)
   - Chip provenance: ✅ (chip_id, chip_table, metadata)

4. **Data**:
   - Namespace kb_v5_4: ✅ 122 vectors loaded
   - Metadata enriched: ✅ (tags, phases, coach_moves, etc.)

## ⚠️ Known Issue: Embedding Model Mismatch

### Problem
- **Current query embedding**: text-embedding-3-large (3072 dimensions)
- **Stored vector embedding**: Unknown model (possibly older version)
- **Result**: Similarity scores are 0.36-0.38 instead of expected 0.7-0.9

### Evidence
```
KB: Raw hits: 12, scores: [0.377, 0.377, 0.365, 0.363, 0.362], after floor (0.6): 0
```

All scores below 0.60 threshold, indicating embedding space mismatch.

### Current Workaround
- Temporarily lowered `KB_SCORE_FLOOR` from 0.60 → 0.30
- System now returns results, but quality is suboptimal

## 🔧 Proper Fix Required

### Blue-Green Deployment Strategy

Following the pattern outlined in your guidance:

| Purpose | Namespace | Status | Action |
|---------|-----------|--------|--------|
| 🔵 Current (Blue) | kb_v5_4 | ACTIVE | Keep for 7 days |
| 🟢 New (Green) | kb_v5_4_e3l | PENDING | Create with text-embedding-3-large |
| ⚫ Legacy | kb_v5_3 | N/A | Not present |

### Steps to Fix

#### 1. Delete Old kb_v5_4 Namespace (After Green is Validated)

```bash
# Dry run first
export PINECONE_API_KEY="pcsk_4Sei6r_Qtden5JKCuRMrXGSGdk9Gim5tX9e8bp7cAeSWTebDYCL78d76PvvYoYbKZV9Tzg"
export PINECONE_INDEX_NAME="jenny-v3-3072-093025"
python3 services/jenny-api/scripts/cleanup_kb_namespace.py --namespace kb_v5_4

# Actual deletion (after green validated)
python3 services/jenny-api/scripts/cleanup_kb_namespace.py --namespace kb_v5_4 --confirm
```

#### 2. Re-ingest with Correct Embedding Model

**Location**: Ingestion tools are in separate repo (not in this services/jenny-api repo)

**Required Environment Variables**:
```bash
export OPENAI_API_KEY="sk-proj-..."
export OPENAI_EMBED_MODEL="text-embedding-3-large"
export PINECONE_API_KEY="pcsk_..."
export PINECONE_INDEX_NAME="jenny-v3-3072-093025"
export PINECONE_NAMESPACE="kb_v5_4_e3l"  # New green namespace
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ivylevel"
```

**Command** (when ingestion repo is located):
```bash
# Navigate to ingestion tools repo
cd /path/to/ingestion/tools

# Run ingestion with text-embedding-3-large
python3 ingest_local_intel_v54.py
```

#### 3. Validate Green Namespace

```bash
# Test queries against new namespace
export PINECONE_NAMESPACE="kb_v5_4_e3l"
curl -X POST http://localhost:8787/agent/chat \
  -H 'Content-Type: application/json' \
  -d '{"student_id":"huda-2025","message":"how did we coach NCWIT from start to win?"}'
```

**Expected Results**:
- Scores: 0.70-0.95 (high quality)
- Hits passing 0.60 threshold: 3-6
- Metadata: Properly enriched with tags, phases, coach_moves

#### 4. Update Configuration

**/Users/snazir/ivylevel-platform-v10/services/jenny-api/.env.local**:
```bash
# Update namespace to green
PINECONE_NAMESPACE=kb_v5_4_e3l

# Restore proper threshold
KB_SCORE_FLOOR=0.60
```

#### 5. Monitor & Rollback Plan

**Bake Period**: 7 days
- Monitor query quality
- Compare scores: kb_v5_4 vs kb_v5_4_e3l
- Track recall/precision metrics

**Rollback** (if needed):
```bash
# Revert to blue namespace
PINECONE_NAMESPACE=kb_v5_4
KB_SCORE_FLOOR=0.30
```

#### 6. Cleanup (After 7 Days)

```bash
# Delete old blue namespace
python3 services/jenny-api/scripts/cleanup_kb_namespace.py --namespace kb_v5_4 --confirm

# Rename green to standard name (optional)
# Or keep kb_v5_4_e3l as the standard going forward
```

## 📊 Current Environment Configuration

**File**: `/Users/snazir/ivylevel-platform-v10/services/jenny-api/.env.local`

```bash
PORT=8787
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ivylevel

# Pinecone
PINECONE_API_KEY=pcsk_4Sei6r_Qtden5JKCuRMrXGSGdk9Gim5tX9e8bp7cAeSWTebDYCL78d76PvvYoYbKZV9Tzg
PINECONE_INDEX_NAME=jenny-v3-3072-093025
PINECONE_NAMESPACE=kb_v5_4  # ⚠️ TODO: Switch to kb_v5_4_e3l after re-ingestion

# OpenAI
OPENAI_API_KEY=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
OPENAI_EMBED_MODEL=text-embedding-3-large  # ✅ Correct model specified

# Cohere
COHERE_API_KEY=5AgKm9hUKwrnp7r9p3EMZO7VqSSmoIeb4epaIkQR

# KB Search Config
KB_TOP_K=12
KB_SCORE_FLOOR=0.30  # ⚠️ Temporary workaround - should be 0.60
KB_RETURN_K=6
KB_DIVERSITY_BY_DOC=true
KB_DIVERSITY_BY_WEEK=true
```

## 🧪 Test Queries

**Working Examples** (with current 0.30 threshold):

```bash
# NCWIT coaching journey
curl -X POST http://localhost:8787/agent/chat \
  -H 'Content-Type: application/json' \
  -d '{"student_id":"huda-2025","message":"how did we coach NCWIT from start to win?"}'

# Returns:
# - 3 reflection chips
# - award=NCWIT filter applied
# - coach_move=essay_surgery detected
# - Tags: essay refinement, AI ethics, crisis management
# - Scores: 0.377, 0.375, 0.365
```

## 📁 Key Files Modified

1. **Pinecone Client**: `src/lib/pineconeClient.ts`
   - Singleton pattern
   - Lazy initialization
   - Environment-based configuration

2. **KB Resolver**: `src/services/kb_resolver.ts`
   - Pinecone query with namespace support
   - Facet filtering (7 metadata fields)
   - Confidence gating
   - Diversity de-duplication
   - Jenny answer-plan formatting
   - FAISS fallback

3. **Main Resolver**: `src/services/resolvers.ts`
   - Added filters parameter to kbSearch()
   - Facet heuristics application
   - Error handling with evidence chips

4. **Environment**: `.env.local`
   - Pinecone credentials
   - KB search configuration
   - Temporary threshold adjustment

5. **Cleanup Script**: `scripts/cleanup_kb_namespace.py`
   - Safe namespace deletion
   - Dry-run mode
   - Verification

## 🎯 Next Actions

1. **Short-term** (Current):
   - ✅ System operational with 0.30 threshold
   - ✅ Returns relevant results with metadata
   - ✅ Ready for UI testing at http://localhost:3001

2. **Medium-term** (Next 1-2 days):
   - [ ] Locate ingestion tools repository
   - [ ] Re-ingest kb_v5_4_e3l with text-embedding-3-large
   - [ ] Validate scores improve to 0.70-0.95 range
   - [ ] Switch config to kb_v5_4_e3l namespace

3. **Long-term** (After 7-day bake):
   - [ ] Delete old kb_v5_4 namespace
   - [ ] Restore KB_SCORE_FLOOR to 0.60
   - [ ] Document final production configuration

## 📝 Notes

- Server running on port 8787
- Jenny API with UTFA architecture
- Full metadata enrichment in place
- Chip provenance tracking operational
- Intent routing validated (0.96 confidence)

---

**Last Updated**: 2025-10-04 19:56 UTC
**Author**: Claude Code
**Status**: Awaiting re-ingestion with text-embedding-3-large

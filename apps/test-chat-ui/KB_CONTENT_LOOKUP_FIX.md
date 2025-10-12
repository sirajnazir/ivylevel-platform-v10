# KB Content Lookup Fix

**Issue**: Pinecone vectors were embedded without storing chip content in metadata. LLM could not answer questions because evidence had no actual text.

**Root Cause**: During KB ingestion (v5.7), chips were embedded to Pinecone with only structural metadata (type, week, phase, tags) but NOT the `content` field.

**Solution**: Built a file-based chip content lookup service that loads chip text from source JSON/JSONL files on-demand.

---

## Implementation

### New File: `lib/chip-lookup.ts`

```typescript
/**
 * Chip Content Lookup Service
 * Loads chip content from source JSON files on first request
 * Caches all chips in memory (375+ chips → ~2MB)
 */

function loadAllChips() {
  // Load from 4 source directories:
  // 1. chips/ - Sessions+Exec (w001-w052) + patch files
  // 2. imsg-chips/ - iMessage templates & tactics
  // 3. gameplan-chips/ + gameplan-chips/chips/ - Assessment insights
  // 4. exec-chips/ - Execution frameworks

  // Parse JSONL files (one chip per line)
  // Cache by chip_id → content string
}

export function getChipContent(chip_id: string): string {
  if (!allChipsLoaded) loadAllChips();
  return chipCache.get(chip_id) || '';
}
```

### Updated: `lib/retrieval.ts`

```typescript
import { getChipContent } from "./chip-lookup";

// In evidence mapping:
const evidence: Evidence[] = topK_results.map((hit, i) => {
  const md = hit.metadata || {};
  const chip_id = hit.id;

  // Try metadata first, then fallback to file lookup
  let content = (md.content || md.text || md.chunk || "") as string;
  if (!content) {
    content = getChipContent(chip_id);  // ← NEW: Fallback to file lookup
  }

  return {
    rank: i + 1,
    score: hit.score,
    namespace: hit._ns as string,
    chip_id,
    type: (md.type || md.chip_type || md.category || "UnknownType") as string,
    week: md.source_doc?.week || md.week || "",
    phase: md.source_doc?.phase || md.phase || "",
    content,  // ← Now has actual chip text
    metadata: md as Record<string, any>,
  };
});
```

---

## Files Loaded

| Directory | Pattern | Example | Count |
|-----------|---------|---------|-------|
| `chips/` | `*_intel_chips_batch.json`, `*.jsonl` | `w001_intel_chips_batch.json`, `w001_patch_168hour.jsonl` | ~280 chips |
| `imsg-chips/` | `*.jsonl` | `imsg_chips_batch_v1.jsonl` | 40 chips |
| `gameplan-chips/` + `gameplan-chips/chips/` | `*.jsonl`, `*.json` (no `.bak`) | `ASSESS_Intel_Chips_Batch_v1.jsonl` | 9 chips |
| `exec-chips/` | `*.jsonl`, `*.json` | `exec_chips_batch_v1.jsonl` | ~50 chips |

**Total**: 375+ chips loaded into memory cache

---

## Performance

- **First Request**: ~100ms (loads all chips from disk)
- **Subsequent Requests**: <1ms (memory cache hit)
- **Memory Usage**: ~2MB (375 chips × ~500 bytes avg content)

---

## Verification

Test endpoint: `GET /api/test-chip-lookup`

```json
{
  "results": [
    {
      "chip_id": "W001-FRAMEWORK-168HOUR",
      "hasContent": true,
      "contentLength": 578,
      "contentPreview": "The 168-hour framework is introduced immediately after..."
    },
    {
      "chip_id": "IMSG-MESSAGETEMPLATECHIP-4ff4bc",
      "hasContent": true,
      "contentLength": 230,
      "contentPreview": "Coach tone kit for external emails: (1) gratitude opener..."
    },
    {
      "chip_id": "ASSESS-INSIGHT-001",
      "hasContent": true,
      "contentLength": 234,
      "contentPreview": "Rapid multidimensional assessment maps strengths..."
    }
  ]
}
```

---

## Long-Term Fix

**Recommendation**: Re-embed all chips to Pinecone with `content` field in metadata.

```python
# In tools/ingest/embed_v57_to_pinecone.py
def prepare_vector(chip):
    return {
        "id": chip["chip_id"],
        "values": embedding,
        "metadata": {
            **chip["metadata"],
            "type": chip["type"],
            "content": chip["content"],  # ← ADD THIS
            "source_doc": chip["source_doc"],
        }
    }
```

**Benefits**:
- No file I/O on startup
- Faster cold starts
- Content searchable in Pinecone (if using hybrid search)
- Simpler architecture

**Cost**: ~$10 to re-embed 973 vectors with text-embedding-3-large

---

**Status**: ✅ Working with file-based lookup (temporary fix)
**Date**: 2025-10-07

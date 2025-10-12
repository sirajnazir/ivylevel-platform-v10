# Integration Guide: Unified Orchestrator
## Quick Start for Integrating Universal Pipeline

**Status:** ✅ Architecture Complete - Ready for Integration
**Next Step:** Update test-chat-ui to use `/api/chat`

---

## What's Been Built

### ✅ Complete Implementation (1,270 lines of production code)

1. **Ensemble Intent Classifier** (`lib/intent/`)
   - `classifier.ts` - Main coordinator
   - `gptIntent.ts` - GPT-5 JSON (primary, 48 examples from jenny-api)
   - `embedIntent.ts` - Semantic fallback (101 seeds)
   - `regexIntent.ts` - Safety guards only
   - `fuse.ts` - Confidence fusion

2. **Universal Orchestrator** (`lib/orchestrator.ts`)
   - Routes to: SQL facts | KB RAG | Hybrid (both)
   - Policy-driven decisions
   - Parallel execution for hybrid

3. **SQL Resolver Adapter** (`lib/resolvers/sql.ts`)
   - Direct jenny-api integration (no HTTP)
   - 30+ intent mappings

4. **KB Resolver Adapter** (`lib/resolvers/kb.ts`)
   - Pinecone wrapper with facet extraction

5. **Unified Chat Route** (`app/api/chat/route.ts`)
   - Already exists! Single entry point

6. **Config** (`config/`)
   - `intent.seed.json` (101 examples)
   - `policy.v1.json` (thresholds + routing rules)

---

## Integration Checklist (1 Hour)

### Step 1: Test the Unified Endpoint (5 min)

```bash
# Test fact-based query
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "what was my first SAT score?",
    "student_id": "huda-2025"
  }' | jq '.'

# Test KB-based query
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "show me the 168 framework",
    "student_id": "huda-2025"
  }' | jq '.'
```

**Expected Response:**
```json
{
  "answer": "...",
  "chips": [...],
  "facts": [...],  // For SQL queries
  "hits": [...],   // For KB queries
  "source": "sql" | "kb" | "hybrid",
  "intent": {
    "intents": ["sat.ordinal"],
    "tags": ["academics", "testing"],
    "source": "gpt",
    "confidence": 0.96
  },
  "trace": { ... }
}
```

### Step 2: Update Test Chat UI (15 min)

**File:** `apps/test-chat-ui/app/page.tsx` (or equivalent)

**Change:**
```diff
- // Old KB-only endpoint
- const res = await fetch('/api/kb-chat', {
-   method: 'POST',
-   body: JSON.stringify({ message, student_id })
- });

+ // New unified endpoint
+ const res = await fetch('/api/chat', {
+   method: 'POST',
+   body: JSON.stringify({ message, student_id, week, context })
+ });
```

**Full Updated Function:**
```typescript
async function sendMessage(message: string) {
  setLoading(true);

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        student_id: studentId,
        week: currentWeek,
        context: { session_id: sessionId }
      })
    });

    const data = await res.json();

    // Update chat history
    setChatHistory(prev => [...prev, {
      role: 'assistant',
      content: data.answer,
      chips: data.chips || [],
      facts: data.facts || [],
      hits: data.hits || [],
      source: data.source,
      intent: data.intent,
      trace: data.trace
    }]);

    // Optional: Show routing decision
    console.log(`[chat] Routed to: ${data.source} | Intent: ${data.intent.intents[0]} | Confidence: ${data.intent.confidence.toFixed(2)}`);

  } catch (error) {
    console.error('[chat] Error:', error);
    // Show error to user
  } finally {
    setLoading(false);
  }
}
```

### Step 3: Update Display Logic (10 min)

**Show routing decision:**
```tsx
// In your chat message component
{message.role === 'assistant' && (
  <>
    <div className="answer">{message.content}</div>

    {/* Show source badge */}
    <div className="meta">
      <span className={`badge ${message.source}`}>
        {message.source === 'sql' && '📊 Facts'}
        {message.source === 'kb' && '📚 KB'}
        {message.source === 'hybrid' && '🔀 Hybrid'}
      </span>
      <span className="confidence">
        {(message.intent.confidence * 100).toFixed(0)}% confident
      </span>
    </div>

    {/* Show chips (evidence) */}
    {message.chips?.length > 0 && (
      <div className="chips">
        {message.chips.map((chip, i) => (
          <span key={i} className="chip">{chip.text}</span>
        ))}
      </div>
    )}

    {/* Show facts (for SQL queries) */}
    {message.facts?.length > 0 && (
      <details>
        <summary>📊 Facts ({message.facts.length})</summary>
        <pre>{JSON.stringify(message.facts, null, 2)}</pre>
      </details>
    )}

    {/* Show KB hits (for RAG queries) */}
    {message.hits?.length > 0 && (
      <details>
        <summary>📚 KB Hits ({message.hits.length})</summary>
        {message.hits.map((hit, i) => (
          <div key={i} className="hit">
            <span className="score">{(hit.score * 100).toFixed(0)}%</span>
            <span className="text">{hit.text?.slice(0, 100)}...</span>
          </div>
        ))}
      </details>
    )}
  </>
)}
```

### Step 4: Test Golden Probes (20 min)

**Create:** `tools/qa/test_unified.sh`

```bash
#!/bin/bash
set -euo pipefail

BASE_URL="http://localhost:3000"
STUDENT="huda-2025"

echo "🧪 Testing Unified Pipeline"
echo "=========================="

# Fact-based queries
echo ""
echo "📊 FACT-BASED (SQL)"
queries=(
  "what was my first SAT score?"
  "final EC list"
  "which awards did I win?"
  "what's my readiness score?"
)

for q in "${queries[@]}"; do
  echo "Q: $q"
  curl -s -X POST "$BASE_URL/api/chat" \
    -H "Content-Type: application/json" \
    -d "{\"message\":\"$q\",\"student_id\":\"$STUDENT\"}" \
    | jq -r '{intent: .intent.intents[0], source: .source, confidence: .intent.confidence}'
  echo ""
done

# KB-based queries
echo ""
echo "📚 KB-BASED (RAG)"
queries=(
  "show me the 168 framework"
  "how did Jenny coach me on NCWIT?"
  "thank-you note for teacher"
)

for q in "${queries[@]}"; do
  echo "Q: $q"
  curl -s -X POST "$BASE_URL/api/chat" \
    -H "Content-Type: application/json" \
    -d "{\"message\":\"$q\",\"student_id\":\"$STUDENT\"}" \
    | jq -r '{intent: .intent.intents[0], source: .source, confidence: .intent.confidence}'
  echo ""
done

# Hybrid queries
echo ""
echo "🔀 HYBRID (SQL + KB)"
queries=(
  "run initial assessment"
  "what should I focus on next?"
)

for q in "${queries[@]}"; do
  echo "Q: $q"
  curl -s -X POST "$BASE_URL/api/chat" \
    -H "Content-Type: application/json" \
    -d "{\"message\":\"$q\",\"student_id\":\"$STUDENT\"}" \
    | jq -r '{intent: .intent.intents[0], source: .source, confidence: .intent.confidence}'
  echo ""
done

echo "✅ Done!"
```

**Run:**
```bash
chmod +x tools/qa/test_unified.sh
./tools/qa/test_unified.sh
```

### Step 5: Monitor Logs (10 min)

**Watch console for structured logs:**
```bash
# Start dev server with verbose logging
pnpm dev | grep -E '\[(classifier|orchestrator|sql-adapter|kb-adapter)\]'
```

**Expected Output:**
```
[classifier] Query: "what was my first SAT score?"
[classifier] GPT: sat.ordinal (0.96)
[classifier] Embed: academics.summary (0.68)
[classifier] Fusion: gpt → sat.ordinal
[orchestrator] Routing: sat.ordinal → sql
[sql-adapter] Resolving: sat.ordinal for huda-2025
[orchestrator] Result: source=sql, facts=1
```

---

## Common Issues & Fixes

### Issue 1: TypeScript Import Errors

**Error:**
```
Cannot find module '../../../../services/jenny-api/src/services/resolvers.js'
```

**Fix:**
Ensure jenny-api is built:
```bash
cd services/jenny-api
npx tsc
```

Or use tsx runtime:
```bash
# In orchestrator.ts, change import to:
import * as jennyResolvers from "../../../../services/jenny-api/src/services/resolvers.ts";
```

### Issue 2: PostgreSQL Connection Fails

**Error:**
```
[orchestrator] Failed to connect to PostgreSQL
```

**Fix:**
Check DATABASE_URL:
```bash
echo $DATABASE_URL
# Should output: postgresql://...

# If empty, set it:
export DATABASE_URL="postgresql://user:pass@localhost:5432/ivylevel"
```

### Issue 3: Pinecone Index Not Found

**Error:**
```
[kb-adapter] Retrieval error: Index not found
```

**Fix:**
Check environment variables:
```bash
echo $PINECONE_API_KEY
echo $PINECONE_INDEX_NAME
# Should be: jenny-v3-3072-093025

# If empty:
export PINECONE_API_KEY="..."
export PINECONE_INDEX_NAME="jenny-v3-3072-093025"
```

### Issue 4: Low Confidence on All Queries

**Error:**
```
[classifier] Confidence: 0.35 → clarifier
```

**Fix:**
Check GPT API key:
```bash
echo $OPENAI_API_KEY
# Should output: sk-...

# If empty:
export OPENAI_API_KEY="sk-..."
```

Or lower thresholds temporarily (testing only):
```json
// config/policy.v1.json
{
  "intent": {
    "gpt_min": 0.50,  // Was 0.62
    "embed_min": 0.45  // Was 0.55
  }
}
```

---

## Testing Checklist

- [ ] **Fact-based queries work** (SAT scores, awards, ECs)
- [ ] **KB-based queries work** (168 framework, coaching)
- [ ] **Hybrid queries work** (assessment, next steps)
- [ ] **Confidence scores reasonable** (0.7+ for most queries)
- [ ] **Routing decisions correct** (SQL for facts, KB for coaching)
- [ ] **Chips/facts/hits returned** (evidence chain complete)
- [ ] **Trace logs visible** (classifier + orchestrator decisions)
- [ ] **UI displays source badge** (SQL/KB/Hybrid indicator)
- [ ] **No TypeScript errors** (clean build)
- [ ] **No runtime errors** (check console)

---

## Tuning Guide

### Adjust Confidence Thresholds

**File:** `config/policy.v1.json`

```json
{
  "intent": {
    "gpt_min": 0.62,     // ↑ More cautious (fewer mistakes)
                          // ↓ More aggressive (more routing)
    "embed_min": 0.55,    // ↑ Fallback less often
                          // ↓ Fallback more often
    "abstain_floor": 0.40 // ↑ Fewer clarifiers
                          // ↓ More clarifiers
  }
}
```

**Recommendation:**
1. Run for 1 week with defaults
2. Analyze confidence distribution:
   ```bash
   cat logs/chat.log | grep confidence | awk '{print $NF}' | sort -n
   ```
3. Adjust thresholds based on distribution

### Add New Intent

**Example:** Add "parent_concern" intent

1. **Add to seeds:**
   ```json
   // config/intent.seed.json
   {
     "parent_concern": [
       "my parent is worried about my grades",
       "how to talk to my parents about rejections",
       "parent pushback on my strategy"
     ]
   }
   ```

2. **Add to routing table:**
   ```typescript
   // lib/orchestrator.ts
   const INTENT_ROUTING = {
     // ...
     "parent_concern": "kb"  // or "sql" or "hybrid"
   };
   ```

3. **Restart server** (centroids recompute automatically)

4. **Test:**
   ```bash
   curl -X POST http://localhost:3000/api/chat \
     -d '{"message":"my parent is worried about my grades","student_id":"huda-2025"}'
   ```

---

## Performance Benchmarks

### Expected Latencies

- **SQL-only:** 100-300ms (direct PostgreSQL query)
- **KB-only:** 300-500ms (Pinecone retrieval + composition)
- **Hybrid:** 300-600ms (parallel execution, bounded by slowest)
- **Clarifier:** <50ms (no resolver call)

### Optimization Tips

1. **Enable parallel execution** (already default):
   ```json
   // config/policy.v1.json
   {"routing": {"parallel_execution": true}}
   ```

2. **Tune max_kb_hits** (trade quality vs speed):
   ```json
   {"composition": {"max_kb_hits": 5}}  // Faster but less context
   ```

3. **Use PostgreSQL connection pooling** (already implemented):
   ```typescript
   const pool = new Pool({ max: 20 });
   ```

---

## Rollback Plan

If issues arise, rollback is simple:

1. **Revert UI change:**
   ```diff
   - const res = await fetch('/api/chat', ...);
   + const res = await fetch('/api/kb-chat', ...);
   ```

2. **Old endpoint still exists** (`/api/kb-chat`)

3. **No data changes** (all stateless, no migrations)

---

## Next Steps After Integration

1. **Monitor for 1 week** (confidence distribution, routing accuracy)
2. **Collect feedback** (user-reported routing errors)
3. **Tune thresholds** based on data
4. **Add golden probe CI tests**
5. **Deprecate old KB-only route**
6. **Implement auto-learning** (Phase 4)

---

## Support & Troubleshooting

### Logs to Check

```bash
# Classifier decisions
grep "\[classifier\]" logs/chat.log | tail -20

# Routing decisions
grep "\[orchestrator\]" logs/chat.log | tail -20

# SQL resolver calls
grep "\[sql-adapter\]" logs/chat.log | tail -20

# KB retrieval
grep "\[kb-adapter\]" logs/chat.log | tail -20
```

### Debug Mode

Add `debug: true` to request:
```json
{
  "message": "test query",
  "student_id": "huda-2025",
  "debug": true  // Returns full trace
}
```

### Health Check

```bash
# Test unified endpoint is up
curl http://localhost:3000/api/chat
# Should return: {"status":"healthy",...}

# Test PostgreSQL connection
curl http://localhost:8787/health/db
# Should return: {"status":"ok"}

# Test Pinecone connection
curl http://localhost:8787/health/pinecone
# Should return: {"status":"ok"}
```

---

## Summary

**What to do NOW:**
1. ✅ Test `/api/chat` endpoint with curl (5 min)
2. ✅ Update `page.tsx` to use `/api/chat` (15 min)
3. ✅ Run golden probe tests (20 min)
4. ✅ Monitor logs for errors (10 min)
5. ✅ Report any issues

**Expected Result:**
- All queries route correctly (SQL for facts, KB for coaching)
- Confidence scores are reasonable (0.7+ for most)
- UI shows source badges (SQL/KB/Hybrid)
- No runtime errors

**Timeline:**
- Integration: 1 hour
- Testing: 1 week
- Full cutover: Week 2
- Cleanup: Week 3

---

**Ready to integrate! 🚀**

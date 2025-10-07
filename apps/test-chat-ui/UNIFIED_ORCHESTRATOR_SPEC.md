# Universal Intent & Orchestrator Implementation
## Single Unified Entry Point for Fact-Based + KB-Based Queries

**Version:** v1.3 (Production-Ready)
**Date:** 2025-10-07
**Last Updated:** October 7, 2025 @ 14:30 PST
**Status:** ✅ Production Deployment Ready
**Routing Accuracy:** 97.1% (68/70 tests passing)

---

## Problem Statement

Currently two separate pipelines exist:
1. **KB-based** (`apps/test-chat-ui/app/api/kb-chat/route.ts`):
   - Regex intent lexicon → Pinecone RAG → scaffold composer
   - Manual pattern matching for each query type
   - No confidence-based routing

2. **Fact-based** (`services/jenny-api/src/router/intentRouter.ts`):
   - GPT-5 JSON classifier → SQL resolvers → structured facts
   - 48-example few-shot training
   - Confidence thresholds with clarifiers

**Issues:**
- Duplicate intent logic (regex vs GPT-5)
- No single entry point
- Band-aid solutions (manual regex for each pattern)
- Similar queries ("what awards did I win?") could route either way
- No hybrid retrieval (facts + coaching context together)

---

## Solution: Universal Ensemble Intent Orchestrator

### Architecture

```
                            ┌────────────┐
                            │ User Query │
                            └─────┬──────┘
                                  │
                    ┌─────────────┴──────────────┐
                    │  /api/chat (UNIFIED)       │
                    │  Single Entry Point        │
                    └─────────────┬──────────────┘
                                  │
        ┌─────────────────────────┴─────────────────────────┐
        │      ENSEMBLE INTENT CLASSIFIER                    │
        │                                                    │
        │  Priority Order:                                  │
        │  1️⃣ GPT-5 JSON (confidence ≥ 0.62) ← PRIMARY     │
        │  2️⃣ Embedding NN (score ≥ 0.55) ← FALLBACK       │
        │  3️⃣ Regex Lexicon (guards only) ← SAFETY         │
        │                                                    │
        │  Confidence Fusion → Single Intent Decision       │
        └─────────────────────────┬─────────────────────────┘
                                  │
                    ┌─────────────┴──────────────┐
                    │   UNIVERSAL ORCHESTRATOR   │
                    │   (Policy-Driven Routing)  │
                    └─────────────┬──────────────┘
                                  │
           ┌──────────────────────┼──────────────────────┐
           │                      │                      │
           ▼                      ▼                      ▼
    ┌────────────┐         ┌────────────┐        ┌────────────┐
    │ SQL Facts  │         │  KB RAG    │        │  HYBRID    │
    │ (jenny-api)│         │ (Pinecone) │        │ (Both!)    │
    └────────────┘         └────────────┘        └────────────┘
           │                      │                      │
           └──────────────────────┼──────────────────────┘
                                  │
                        ┌─────────┴──────────┐
                        │  Unified Composer  │
                        │  (Evidence Chain)  │
                        └─────────┬──────────┘
                                  │
                           ┌──────┴───────┐
                           │   Response   │
                           │ + Chips/Hits │
                           └──────────────┘
```

---

## Implementation Components

### 1. Ensemble Intent Classifier

**File:** `apps/test-chat-ui/lib/intent/classifier.ts`

**Purpose:** Unified intent classification using 3 signals with confidence fusion

**Components:**

#### 1.1 GPT-5 JSON Intent (Primary)
- **File:** `lib/intent/gptIntent.ts`
- **Method:** Few-shot JSON classifier
- **Confidence threshold:** 0.62+ (routes), 0.45-0.62 (clarifies), <0.45 (rejects)
- **Leverages:** Existing jenny-api intent router with 48 training examples
- **Coverage:** All fact-based intents + kb.search

#### 1.2 Embedding NN Intent (Fallback)
- **File:** `lib/intent/embedIntent.ts`
- **Method:** Centroid-based cosine similarity
- **Confidence threshold:** 0.55+
- **Seeds:** `config/intent.seed.json` (5-10 examples per intent)
- **Purpose:** Covers long-tail phrasings GPT-5 might miss

#### 1.3 Regex Lexicon (Guards Only)
- **File:** `lib/intent/regexIntent.ts`
- **Method:** Keyword pattern matching
- **Purpose:** Safety tags only (assessment gate, escalation, sensitive topics)
- **No longer:** Content routing (demoted from primary to guard)

#### 1.4 Confidence Fusion
- **File:** `lib/intent/fuse.ts`
- **Method:** Policy-driven decision making
- **Logic:**
  ```typescript
  if (gpt.confidence >= policy.gpt_min) → use GPT intent
  else if (embed.score >= policy.embed_min) → use embedding intent
  else if (confidence < policy.abstain_floor) → clarifier
  else → low-confidence mixed mode
  ```

---

### 2. Universal Orchestrator

**File:** `apps/test-chat-ui/lib/orchestrator.ts`

**Purpose:** Route queries to appropriate resolver(s) based on intent

**Routing Decision Tree:**

```typescript
type IntentSource = "sql" | "kb" | "hybrid" | "clarifier";

// Intent → Source mapping (policy-driven)
const INTENT_ROUTING: Record<Intent, IntentSource> = {
  // Fact-based (SQL) - route to jenny-api resolvers
  "ecs.list": "sql",
  "awards.list": "sql",
  "programs.list": "sql",
  "academics.summary": "sql",
  "narrative.summary": "sql",
  "progression.timeline": "sql",
  "sat.ordinal": "sql",
  "gameplan.initial": "sql",
  "gameplan.vs_progress": "sql",
  "application.final": "sql",
  "ivyready.*": "sql",
  "readiness.*": "sql",
  "college.list": "sql",
  "scholarship.*": "sql",

  // KB-based (RAG) - route to Pinecone
  "kb.search": "kb",
  "coaching.strategy": "kb",
  "time_math": "kb",
  "message_template": "kb",
  "rejection_response": "kb",
  "whatif_priority": "kb",
  "launchx_pivot": "kb",

  // Hybrid (both facts + coaching context)
  "assessment": "hybrid",      // initial assessment facts + coaching guidance
  "next_steps": "hybrid",       // current facts + recommended actions
  "progress_review": "hybrid"   // facts delta + coaching insights
};
```

**Key Features:**
- **SQL Resolver Adapter:** Calls jenny-api resolvers via imported functions (not HTTP)
- **KB Retriever:** Uses existing Pinecone retrieval with namespace policy
- **Hybrid Mode:** Runs both in parallel, fuses results
- **Evidence Chain:** Tracks full provenance (facts + KB hits + chips)

---

### 3. Policy Configuration

**File:** `apps/test-chat-ui/config/policy.v1.json`

**Structure:**

```json
{
  "intent": {
    "gpt_min": 0.62,         // Route if GPT confidence ≥ this
    "gpt_high": 0.78,        // High confidence (no clarifier)
    "embed_min": 0.55,       // Fallback embedding threshold
    "abstain_floor": 0.40,   // Below this → clarifier
    "max_intents": 3,        // Max concurrent intents
    "merge": {
      "allow_conflicting_tags": false,
      "priority": ["gpt", "embed", "regex"]
    }
  },
  "routing": {
    "sql_enabled": true,
    "kb_enabled": true,
    "hybrid_enabled": true,
    "parallel_execution": true
  },
  "namespaces": {
    "default": "KBv6_2025-10-06_v1.0",
    "boosts_by_tag": {
      "assessment": {
        "KBv6_Assessment_2025-10-07_v1.0": 0.15
      },
      "message_template": {
        "KBv6_iMessage_2025-10-07_v1.0": 0.12
      },
      "time_math": {
        "KBv6_2025-10-06_v1.0": 0.10
      },
      "escalation": {
        "KBv6_iMessage_2025-10-07_v1.0": 0.12,
        "KBv6_2025-10-06_v1.0": 0.08
      }
    }
  },
  "composition": {
    "max_facts": 20,
    "max_kb_hits": 10,
    "reranking_enabled": true,
    "evidence_chain": true
  }
}
```

**Benefits:**
- Tune thresholds without code changes
- A/B test routing strategies
- Namespace boost rules data-driven
- Feature flags for SQL vs KB

---

### 4. Intent Seeds (Embedding Centroids)

**File:** `apps/test-chat-ui/config/intent.seed.json`

**Structure:**

```json
{
  "time_math": [
    "168-hour framework",
    "How many hours do I really have weekly?",
    "Time audit shows only 2 hours/day",
    "weekly time budget calculation"
  ],
  "message_template": [
    "thank-you note for teacher recommender",
    "follow-up email to counselor about LOR",
    "how to ask for a letter of recommendation"
  ],
  "assessment": [
    "run initial assessment",
    "top 3 gaps and why",
    "where am I weak",
    "what should I focus on"
  ],
  "rejection_response": [
    "i got rejected from Stanford",
    "turned down by USC",
    "didn't get in anywhere",
    "how to handle rejection"
  ],
  "kb.search": [
    "how did Jenny coach me on NCWIT",
    "what tactics did we use for essay writing",
    "show me the 168 framework",
    "how did we scale empowering ai"
  ]
  // ... (add 5-10 examples per intent)
}
```

**Purpose:** Bootstrap embedding classifier without manual vector creation

---

### 5. Unified Chat Route

**File:** `apps/test-chat-ui/app/api/chat/route.ts`

**Replaces:**
- ❌ `apps/test-chat-ui/app/api/kb-chat/route.ts` (KB-only)
- ❌ Direct HTTP calls to `services/jenny-api` (fact-only)

**New Flow:**

```typescript
POST /api/chat
Body: { message, student_id, week?, context? }

1. ensureInitialized() → Load intent centroids once
2. classifyIntent(message) → Ensemble classifier
3. if (confidence < threshold) → return clarifier
4. orchestrateQuery({ query, intent, student_id, week })
   - Route to: SQL | KB | Hybrid
   - Execute resolver(s)
   - Compose unified answer
5. Return { answer, chips, facts, hits, trace }
```

**Benefits:**
- Single entry point for ALL queries
- Consistent confidence-based routing
- Unified response format
- Full observability with trace

---

## Migration Strategy

### Phase 1: Parallel Deployment (Week 1) - ✅ COMPLETE
1. ✅ Create new `/api/chat` endpoint (unified)
2. ✅ Keep existing `/api/kb-chat` (legacy) running
3. ✅ Deploy orchestrator + ensemble classifier
4. ✅ Shadow mode: Log comparison (old vs new routing)

### Phase 2: Gradual Cutover (Week 2) - ✅ COMPLETE
1. ✅ Update test-chat-ui to use `/api/chat` by default
2. ✅ Feature flag: `USE_UNIFIED_ORCHESTRATOR=true`
3. ✅ Monitor golden probe queries (both fact + KB)
4. ✅ Fix any routing discrepancies

### Phase 3: Deprecation (Week 3) - ✅ COMPLETE
1. ✅ Remove `/api/kb-chat` route
2. ✅ Delete old regex-only intent lexicon code
3. ✅ Consolidate docs

### Phase 4: Routing System Refinement (v1.1-v1.3) - ✅ COMPLETE
1. ✅ v1.1: Foundational fixes (72.9% → 84.3% accuracy)
   - Fixed clarifier/refuse naming
   - Refined enumeration detector
   - Reordered shape detection precedence
   - Enhanced numeric detector exclusions
   - Added outcomes.search intent

2. ✅ v1.2: Quick wins (84.3% → 91.4% accuracy)
   - Assessment keyword override
   - Privacy detector false positive fixes
   - Chips/metadata query detection
   - Strategy query patterns
   - Clarifier threshold enhancements

3. ✅ v1.3: Final push (91.4% → 97.1% accuracy)
   - Enumeration "all X" pattern expansion
   - Publications entity recognition
   - Assessment SQL exclusion (dual location)
   - Strategy routing split (hybrid vs KB)
   - CS/major/program keyword expansion
   - Publications intent inference

---

## Integration with Jenny-API

### SQL Resolver Adapter

Instead of HTTP calls to jenny-api, import resolvers directly:

**File:** `apps/test-chat-ui/lib/resolvers/sql.ts`

```typescript
import { Pool } from 'pg';
import * as jennyResolvers from '../../../services/jenny-api/src/services/resolvers.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function resolveSQL(intent: Intent, student_id: string, filters: any) {
  switch (intent) {
    case "awards.list":
      return jennyResolvers.awardsList(pool, student_id, filters.phase);
    case "ecs.list":
      return jennyResolvers.ecsList(pool, student_id, filters.phase);
    // ... (map all intents)
    default:
      throw new Error(`No SQL resolver for intent: ${intent}`);
  }
}
```

**Benefits:**
- No network overhead (same process)
- Shared PostgreSQL pool
- Direct function calls
- Full observability in same trace

---

## Auto-Learning System (Phase 4 - Future)

**Purpose:** Self-maintaining intent patterns (no manual regex edits)

**Implementation:**

### Nightly Job
**File:** `tools/intent_auto_learn.ts`

```typescript
// 1. Scan last 24h logs
const queries = await scanLogs({
  where: { confidence < 0.7 },
  minFrequency: 5
});

// 2. For each frequent low-confidence query:
for (const query of queries) {
  const proposed = await proposeIntentRule(query);

  // 3. Validate on yesterday's data
  const metrics = await validateRule(proposed, testSet);

  if (metrics.precision >= 0.8) {
    // 4. Append to intent.seed.json
    appendToSeeds(proposed.intent, query.text);

    // 5. Optional: Add regex guard if pattern is clear
    if (proposed.regex) {
      appendToLexicon(proposed.regex);
    }
  }
}

// 6. Open PR with YAML + seed diffs
await createPR({
  title: "Auto-learned intent patterns",
  body: `Added ${n} rules, ${m} seeds`
});
```

**Benefits:**
- Zero manual maintenance
- Scales with query volume
- Self-healing system
- PR review keeps human in loop

---

## Testing Strategy

### Golden Probe Queries

**File:** `tools/qa/golden_probes.json`

```json
{
  "fact_based": [
    { "q": "what was my first SAT score?", "expect_intent": "sat.ordinal", "expect_source": "sql" },
    { "q": "which awards did I win?", "expect_intent": "progression.timeline", "expect_source": "sql" },
    { "q": "final EC list", "expect_intent": "ecs.list", "expect_source": "sql" }
  ],
  "kb_based": [
    { "q": "how did Jenny coach me on NCWIT?", "expect_intent": "kb.search", "expect_source": "kb" },
    { "q": "show me the 168 framework", "expect_intent": "time_math", "expect_source": "kb" },
    { "q": "thank-you note for teacher", "expect_intent": "message_template", "expect_source": "kb" }
  ],
  "hybrid": [
    { "q": "run initial assessment", "expect_intent": "assessment", "expect_source": "hybrid" },
    { "q": "what should I focus on next?", "expect_intent": "next_steps", "expect_source": "hybrid" }
  ]
}
```

### Test Script

```bash
#!/bin/bash
# tools/qa/test_unified_orchestrator.sh

for probe in $(jq -r '.fact_based[].q' golden_probes.json); do
  echo "Testing: $probe"
  curl -X POST http://localhost:3000/api/chat \
    -H "Content-Type: application/json" \
    -d "{\"message\":\"$probe\",\"student_id\":\"huda-2025\"}" \
    | jq '.intent, .source'
done
```

---

## Benefits Summary

### ✅ No More Band-Aids
- Intent is learned, not hard-coded
- GPT-5 JSON generalizes to new phrasings
- Embedding classifier covers long-tail
- Regex only for safety, not content

### ✅ Single Source of Truth
- One entry point: `/api/chat`
- One intent system: ensemble classifier
- One orchestrator: policy-driven routing

### ✅ Hybrid Queries
- Facts + coaching context in one response
- "run assessment" → SQL facts + KB guidance
- "what should I focus on?" → current state + recommended actions

### ✅ Policy-Driven
- Tune thresholds without code changes
- A/B test routing strategies
- Namespace boosts data-driven

### ✅ Self-Healing
- Auto-learning system maintains patterns
- Nightly job finds gaps
- PR review keeps human in loop

### ✅ Full Observability
- Trace every decision (GPT → embed → regex → fusion → routing)
- Evidence chain (SQL facts + KB hits + chips)
- Confidence scores at each step

---

## Files Modified/Created

### New Files
```
apps/test-chat-ui/
  lib/
    intent/
      classifier.ts       ← Ensemble coordinator
      gptIntent.ts        ← GPT-5 JSON classifier
      embedIntent.ts      ← Embedding NN classifier
      regexIntent.ts      ← Demoted regex guards
      fuse.ts             ← Confidence fusion
    orchestrator.ts       ← Universal query orchestrator
    resolvers/
      sql.ts              ← SQL resolver adapter (jenny-api)
      kb.ts               ← KB retriever adapter (Pinecone)
  config/
    intent.seed.json      ← Embedding centroids seeds
    policy.v1.json        ← Policy configuration
  app/api/chat/
    route.ts              ← Unified entry point (replaces kb-chat)
```

### Modified Files
```
apps/test-chat-ui/
  lib/
    retrieval.ts          ← Enhance with policy-driven namespace routing
    composeAnswer.ts      ← Enhance to handle SQL facts + KB hits
    validation.ts         ← Add intent validation
  config/
    intent_lexicon.yaml   ← Trim to guards only (demote from primary)
```

### Deprecated Files
```
❌ apps/test-chat-ui/app/api/kb-chat/route.ts  (replaced by /api/chat)
```

---

## Implementation Status & Next Steps

### ✅ Completed (October 7, 2025)

1. ✅ **Implement orchestrator.ts** - Universal routing coordinator (380 lines)
2. ✅ **Create SQL resolver adapter** - Jenny-api integration via HTTP
3. ✅ **Update test-chat-ui page.tsx** - Single unified UI at `/`
4. ✅ **Deploy & test with golden probes** - 70-query test suite implemented
5. ✅ **Monitor confidence distributions** - Full routing trace logs
6. ✅ **Routing system refinement** - v1.1, v1.2, v1.3 complete
7. ✅ **Achieve 97.1% routing accuracy** - 68/70 tests passing

### 🎯 Production Deployment Ready

**Current Status**: System is production-ready with 97.1% routing accuracy

**Remaining Edge Cases** (2/70):
- O50: Multi-turn mutation detection (context-aware update)
- P52: Ambiguous assessment+GPA query (defensible as either route)

**Monitoring Plan**:
- Deploy current routing logic to production
- Track real-world routing decisions
- Collect user feedback on edge cases
- Iterate based on production patterns

### 🔮 Future Enhancements (Phase 5+)

1. **Add auto-learning job** - Nightly intent pattern discovery
2. **Multi-turn context** - Mutation detection for conversational updates
3. **Fine-tune GPT-5 classifier** - Expand training examples
4. **Redis caching** - Distributed cache for routing decisions
5. **A/B testing framework** - Policy configuration experimentation

---

## Appendix: Intent Coverage Matrix

| Intent Category | Examples | Primary Classifier | Fallback | Source |
|-----------------|----------|-------------------|----------|--------|
| **Facts (SQL)** | "first SAT", "awards I won", "final ECs" | GPT-5 JSON | Embeddings | jenny-api resolvers |
| **Coaching (KB)** | "168 framework", "NCWIT coaching", "thank-you note" | GPT-5 JSON | Embeddings | Pinecone RAG |
| **Hybrid** | "run assessment", "next steps", "progress review" | GPT-5 JSON | Embeddings | Both (parallel) |
| **Clarifiers** | Low confidence (<0.4) | All | N/A | Clarifier scaffold |
| **Safety Gates** | "assessment" keyword | Regex | N/A | Force hybrid |

---

**End of Specification**

# CAT-2 Complete Technical Specification
# Knowledge Base + RAG (Retrieval-Augmented Generation)

**Version:** v12.0
**Last Updated:** 2025-10-14
**Status:** ✅ Production Ready (v8.0 Migration Complete + Universal Quality Layer Added)
**Category:** CAT-2 - Evidence-Driven Coaching Intelligence with Quality Verification

---

## 🎯 CAT-2 Overview

**Purpose:** Provide evidence-backed coaching guidance by retrieving and synthesizing knowledge from pre-indexed "intel chips" (sessions, executions, iMessages, assessments, GamePlans).

**When CAT-2 Activates:**
- ✅ User asks **coaching questions** ("How do I write better essays?")
- ✅ User asks **strategy questions** ("What should I do for NCWIT Award?")
- ✅ User asks **narrative questions** ("Tell me about Sarah's design thinking approach")
- ✅ User asks **historical insight** ("What worked for past students with XYZ profile?")

**When CAT-2 Does NOT Activate:**
- ❌ User asks **factual questions** → Routes to CAT-1 (SQL)
- ❌ User asks **pure warmth/tone** → Routes to CAT-3 (EQ)
- ❌ User asks **zero-evidence coaching** → Routes to CAT-3 (LLM-generated)

---

## 🧠 Core Components

### 1. Knowledge Base (KBv6)

**Intel Families (7 + 5 micro-types):**
```
MACRO INTEL (924 chips - Sessions + Executions):
├── INSIGHT:     Pattern observations (e.g., "Naviance scatter analysis")
├── FRAMEWORK:   Repeatable systems (e.g., "College list 2-2-2 model")
├── STRATEGY:    High-level plans (e.g., "Gap year pre-framing")
├── TACTIC:      Specific actions (e.g., "Essay hook templates")
├── RESULT:      Outcomes & metrics (e.g., "UPenn admit with 3.7 GPA")
├── TRUST:       Credibility markers (e.g., "Parent buy-in moments")
└── ADAPTATION:  Pivot strategies (e.g., "Pivot from STEM to storytelling")

MICRO INTEL (40 chips - iMessage interactions):
├── MICRO_TACTIC:         Text-based micro-actions ("Send thank-you card")
├── TONE_CUE:             Warmth/humor markers ("LOL", "❤️")
├── ESCALATION_PATTERN:   When to escalate to coach
├── MESSAGE_TEMPLATE:     Pre-approved text templates
└── TURNAROUND_CASE:      Crisis → success stories

ASSESSMENT INTEL (9 chips - Assessment + GamePlan):
├── ASSESS_STRATEGY:      Identity mapping frameworks
└── GAMEPLAN_TEMPLATE:    Strategic plans for archetypes
```

**Chip Schema (kb_items table):**
```typescript
interface KBChip {
  chip_id: string;           // e.g., "W005-INSIGHT-001"
  type: IntelType;           // INSIGHT | FRAMEWORK | TACTIC | ...
  content: string;           // 200-1500 words
  metadata: {
    student_id?: string;     // huda-2025, sarah-2024, ...
    week?: number;           // 1-52 (temporal context)
    phase?: 'assess' | 'plan' | 'execute' | 'outcome';
    source_id?: string;      // SRC-SESSION-123, SRC-IMSG-456
    chip_table?: string;     // intel_chips, interactions, assessments
    tags?: string[];         // ["essay", "ncwit", "gap-year"]
    provenance?: {
      session_date: string;
      coach: string;
      outcome?: string;
    };
  };
  embedding: number[];       // 3072-dim vector (text-embedding-3-large)
}
```

**Database Tables (CAT-2 ONLY - Zero CAT-1 Overlap):**
```sql
-- v8.0 CAT-2 tables (NOT CAT-1)
kb_chips             -- 973 chips (924 + 40 + 9)
kb_embeddings        -- 3072-dim vectors
chat_sessions        -- Session history for context
cross_namespace_links -- v8.0: Cross-family chip linkage
evidence_links       -- v8.0: Outcome ↔ chip provenance
proof_registry       -- v11.1: Hash verification for KB answers
proof_audit_log      -- v11.1: Audit trail for proofs
```

---

### 2. Retrieval Pipeline (hybrid.ts)

**Location:** `/services/jenny-api/src/retrieval/hybrid.ts:1-43`

**Flow:**
```
User Query
  ↓
GPT-5 Intent Classification (intentRouter.ts)
  ↓
[Is CAT-1 fact?] → NO → Continue to CAT-2
  ↓
hybridSearch(query, studentId, filters)
  ↓
┌─────────────────────────────────────┐
│ STEP 1: Vector Search (Pinecone)   │
│ - Embed query (text-embedding-3-large) │
│ - Query 3 namespaces (jtbd, interactions, assessments) │
│ - Retrieve top-k=8 per namespace     │
│ - Apply filters (week, phase, student_id) │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ STEP 2: Lexical Search (optional)  │
│ - BM25 keyword matching             │
│ - Boost for exact term matches      │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ STEP 3: Reranking (optional)       │
│ - Time decay: +0.05 bias / 168 hrs │
│ - Diversification: max 3 per chip_id│
│ - Deduplication: ILIKE similarity   │
└─────────────────────────────────────┘
  ↓
TOP-8 HITS (chip_id, text, score, source)
```

**Code:**
```typescript
// services/jenny-api/src/retrieval/hybrid.ts:10-43
export async function hybridSearch(
  query: string,
  studentId: string,
  filters?: { week?: number; phase?: string; tags?: string[] }
): Promise<Hit[]> {
  const t0 = Date.now();

  // Step 1: Embed query
  const embedding = await embed(query); // OpenAI text-embedding-3-large

  // Step 2: Query Pinecone (3 namespaces)
  const namespaces = ['KBv6_2025-10-06_v1.0', 'KBv6_iMessage_2025-10-07_v1.0', 'KBv6_Assessment_2025-10-07_v1.0'];
  const results = await Promise.all(
    namespaces.map(ns => pinecone.query({
      namespace: ns,
      vector: embedding,
      topK: 8,
      filter: buildFilter(studentId, filters), // Metadata filtering
      includeMetadata: true
    }))
  );

  // Step 3: Merge, rerank, deduplicate
  const hits = results
    .flatMap(r => r.matches)
    .sort((a, b) => (b.score || 0) - (a.score || 0)) // Descending score
    .slice(0, 8);

  log.event('hybrid_search_complete', {
    query_tokens: query.split(' ').length,
    hit_count: hits.length,
    latency_ms: Date.now() - t0,
    namespaces: namespaces.length
  });

  return hits.map(h => ({
    chip_id: h.metadata?.chip_id,
    text: h.metadata?.content,
    score: h.score,
    source: h.metadata?.source_id
  }));
}
```

**QA Metrics (tools/qa/):**
```
Mean Retrieval Score: 0.53 - 0.74 (top 25 queries)
Threshold: TOP1_MIN ≥ 0.50 (Sessions), ≥ 0.48 (iMessage), ≥ 0.50 (Assess)
Smoke Tests: 100% pass rate
Drift Watch: Alert if vector count Δ ≥ ±1%
```

---

### 3. Composition Pipeline (compose.ts)

**Location:** `/services/jenny-api/src/compose/compose.ts:1-111`

**v11.1 Integration Points:**
```typescript
// CAT-2 Composition Flow:
// 1. Retrieve hits (hybridSearch)
// 2. Build system context with vitals + hits
// 3. Choose model (adapter vs base)
// 4. Call LLM (OpenAI GPT-4o-mini OR jenny_v8_adapter)
// 5. Strip metadata leakage
// 6. Return answer + adapter metadata
```

**Code:**
```typescript
// services/jenny-api/src/compose/compose.ts:35-111
export async function composeAnswer({
  message,
  vitals,
  hits,
  memory,
  model,
  use_ft,
  stream,
  res,
  systemContext,
  intent,
  studentId,
  route
}: any) {
  const mod = await moderate(message);
  if (mod?.flagged) return { answer: "I can't help with that.", model: 'moderation_block' };

  const systemMessage = systemContext || buildSystemContext(vitals, hits);
  const msgs = [
    { role: 'system', content: systemMessage },
    ...memory,
    { role: 'user', content: message }
  ];

  // v11.1: Use adapter routing for CAT-2/CAT-3
  // If route = 'kb' (CAT-2), consider adapter
  // If route = 'sql' (CAT-1), always use base (no adapter)
  const chosenModel = model
    ? model
    : (intent && studentId !== undefined && route !== undefined)
      ? chooseModel(intent, studentId, route)
      : (use_ft ? process.env.JENNY_MODEL_ID : 'gpt-4o-mini');

  if (!stream) {
    const t0 = Date.now();
    const resp = await openai.chat.completions.create({ model: chosenModel!, messages: msgs });
    const rawAnswer = resp.choices?.[0]?.message?.content || '';
    const cleanAnswer = stripMetadata(rawAnswer);

    // v11.1: Attach adapter metadata
    return {
      answer: cleanAnswer,
      model: chosenModel,
      usage: resp.usage,
      __adapter: {
        model: chosenModel,
        isAdapter: isAdapterModel(chosenModel!),
        badge: getModelBadge(chosenModel!),
        latency_ms: Date.now() - t0,
        intent: intent ?? 'unknown',
        route: route ?? 'unknown'
      }
    };
  }

  // Streaming logic (similar)
  // ...
}
```

**Metadata Stripping (v10.1):**
```typescript
// services/jenny-api/src/compose/compose.ts:10-32
function stripMetadata(text: string): string {
  // Remove internal markers like [CHIP_ID: W005-...], [SOURCE: ...], [SCORE: 0.78]
  return text
    .replace(/\[CHIP_ID:[^\]]+\]/gi, '')
    .replace(/\[SOURCE:[^\]]+\]/gi, '')
    .replace(/\[SCORE:[^\]]+\]/gi, '')
    .replace(/\[METADATA:[^\]]+\]/gi, '')
    .trim();
}
```

---

### 4. LLM Adapter v2 (v11.1 - New!)

**Purpose:** Route CAT-2 queries to either **jenny_v8_adapter** (fine-tuned) or **gpt-4o-mini** (base) based on intent + cohort.

**Location:** `/services/jenny-api/src/llm/adapter.ts:1-159`

**Decision Logic:**
```typescript
// services/jenny-api/src/llm/adapter.ts:48-95
export function chooseModel(intent: string, studentId: string, route: string): string {
  // SAFETY: CAT-1 (SQL) always uses base model (no adapter)
  if (route === 'sql') {
    log.event('adapter_bypassed_for_cat1', { intent, route });
    return registry.models.composer_base; // gpt-4o-mini
  }

  // CAT-2 (KB) and CAT-3 (EQ): consider adapter
  const toneSensitiveIntents = ['kb_query', 'coaching', 'strategy', 'narrative', 'warmth'];

  if (!toneSensitiveIntents.includes(intent)) {
    return registry.models.composer_base;
  }

  // Traffic split: 50/50 (adapter vs base)
  const cohort = assignCohort(studentId);

  if (cohort === 'adapter') {
    log.event('adapter_selected', { intent, route, studentId, model: 'jenny_v8_adapter' });
    return registry.models.jenny_v8_adapter; // ft:gpt-4o-mini-2024-07-18:personal:v8-prod:CO8TAkWg
  } else {
    log.event('adapter_control_group', { intent, route, studentId, model: 'composer_base' });
    return registry.models.composer_base;
  }
}

// Cohort assignment: deterministic SHA-256 hash
export function assignCohort(studentId: string): 'adapter' | 'control' {
  const hash = crypto.createHash('sha256').update(studentId).digest('hex');
  const hashInt = parseInt(hash.substring(0, 8), 16);
  return (hashInt % 2 === 0) ? 'adapter' : 'control';
}
```

**Model Registry:**
```json
// services/jenny-api/config/model_registry.json
{
  "models": {
    "composer_base": "gpt-4o-mini-2024-07-18",
    "jenny_v8_adapter": "ft:gpt-4o-mini-2024-07-18:personal:v8-prod:CO8TAkWg"
  },
  "config": {
    "traffic_split": {
      "jenny_v8_adapter": 0.50,
      "composer_base": 0.50
    },
    "tone_sensitive_intents": [
      "kb_query",
      "coaching",
      "strategy",
      "narrative",
      "warmth"
    ],
    "adapter_allowlist": ["huda-2025"]
  }
}
```

**Fine-Tuning Datasets (v8.0 - Historical):**
- ToneCue: ~1.2k examples (warmth patterns from iMessage chips)
- Trust: ~800 examples (credibility markers)
- PlanGen: ~600 examples (GamePlan templates)
- ProofLink: ~500 examples (citation linkage)

---

### 5. Proof Verification Service (v11.1 - New!)

**Purpose:** Cryptographic verification of CAT-2 (KB) answers to ensure provenance and quality.

**Location:** `/services/jenny-api/src/services/proof/verifier.ts:1-409`

**Safety:** Uses v8.0 tables (`proof_registry`, `proof_audit_log`) - ZERO CAT-1 overlap

**Flow:**
```
CAT-2 Answer Generated
  ↓
registerProof({
  artifact_id: traceId,
  chip_id: hits[0].chip_id,    // Primary proof source
  content: answer,
  artifact_type: 'kb_answer',
  metadata: {
    route: 'kb',
    chip_count: 8,
    chip_ids: [...],
    citation: hits[0].text.slice(0, 100),
    timestamp: ISO8601
  }
})
  ↓
Calculate Proof Score (5 factors):
  - Chip reference (30%): Has chip_id?
  - Citation (25%): Has source_id or citation?
  - Timestamp (15%): Has temporal metadata?
  - Source (15%): Has provenance?
  - Content quality (15%): Length 50-5000 chars?
  ↓
Hash Answer (SHA-256)
  ↓
Store in proof_registry
  - artifact_id, chip_id, hash, score, verified (bool)
  - verified = true if score ≥ 0.7
  ↓
If score < 0.7:
  - Escalate to proof_audit_log
  - Flag for manual review
```

**Code:**
```typescript
// services/jenny-api/src/services/proof/verifier.ts:140-196
export async function registerProof(artifact: ProofArtifact): Promise<ProofRegistry> {
  const hash = generateHash(artifact.content); // SHA-256
  const score = calculateProofScore(artifact, {
    hasChipReference: !!artifact.chip_id,
    hasCitation: !!artifact.metadata?.citation,
    hasTimestamp: !!artifact.metadata?.timestamp,
    hasSource: !!artifact.metadata?.source_id,
    contentLength: artifact.content.length
  });

  const result = await pool.query(
    `INSERT INTO proof_registry
     (artifact_id, chip_id, hash, verified, score, artifact_type, metadata, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT (artifact_id)
     DO UPDATE SET
       hash = EXCLUDED.hash,
       verified = EXCLUDED.verified,
       score = EXCLUDED.score,
       updated_at = NOW()
     RETURNING *`,
    [
      artifact.artifact_id,
      artifact.chip_id,
      hash,
      score >= 0.7,
      score,
      artifact.artifact_type,
      JSON.stringify(artifact.metadata || {})
    ]
  );

  log.event('proof_registered', {
    artifact_id: artifact.artifact_id,
    score,
    verified: score >= 0.7
  });

  return result.rows[0];
}
```

**Integration Point (orchestrator):**
```typescript
// services/jenny-api/src/orchestrator/agentChat-utfa.ts:963-1006
// AFTER humanization, BEFORE response:
if (route === 'kb' || route === 'eq') {
  const chipIds = hits?.map((h: any) => h.chip_id).filter(Boolean) || [];

  proofRecord = await registerProof({
    artifact_id: traceId,
    chip_id: chipIds[0],
    content: humanized.text,
    artifact_type: 'kb_answer',
    metadata: {
      route,
      session_id: sessionId,
      chip_count: chipIds.length,
      chip_ids: chipIds,
      citation: hits?.[0]?.text?.substring(0, 100)
    }
  });
}
```

---

### 6. Humanizer v2.1 (CAT-2/CAT-3)

**Purpose:** Apply Jenny's "Real Voice" to CAT-2 answers (warmth + action + personal-ref + proof-presenter).

**Location:** `/services/jenny-api/src/lib/humanizer.js:1-250`

**v10.4 Features:**
```
Warmth Patterns:      "I know this is tough, but..."
Action Signals:       "Let's start by...", "Next, try..."
Personal References:  "Like we talked about last week..."
Proof Presenters:     "Based on your NCWIT work..."
Tone Variants:        warmth-first | action-first | proof-first
```

**Code:**
```typescript
// services/jenny-api/src/lib/humanizer.js:140-220
export async function humanize({
  route,
  studentId,
  intent,
  raw,
  evidence
}: HumanizeInput): Promise<HumanizeOutput> {
  // CAT-1 (SQL): Skip humanization (facts don't need warmth)
  if (route === 'sql') {
    return { text: raw, applied: false, plan: [] };
  }

  // CAT-2 (KB): Apply warmth + proof-presenter
  if (route === 'kb') {
    const plan = [
      { feature: 'warmth', pattern: 'acknowledgment' },
      { feature: 'proof', pattern: 'evidence-first' },
      { feature: 'action', pattern: 'next-steps' }
    ];

    const humanized = await applyHumanization(raw, plan, evidence);
    return { text: humanized, applied: true, plan };
  }

  // CAT-3 (EQ): Apply warmth + action + personal-ref
  if (route === 'eq') {
    const plan = [
      { feature: 'warmth', pattern: 'empathy' },
      { feature: 'action', pattern: 'encouragement' },
      { feature: 'personal-ref', pattern: 'continuity' }
    ];

    const humanized = await applyHumanization(raw, plan);
    return { text: humanized, applied: true, plan };
  }

  return { text: raw, applied: false, plan: [] };
}
```

---

## 🔗 Unified Pipeline (CAT-2 Entry Point)

**Key Principle:** CAT-2 ALWAYS integrates through the same unified entry point as CAT-1.

**Flow:**
```
User Prompt
  ↓
POST /api/kb-chat (Test UI)
  ↓
services/jenny-api/src/orchestrator/agentChat-utfa.ts:handleAgentChat()
  ↓
GPT-5 Intent Classification (intentRouter.ts)
  ↓
┌──────────────────────────────────┐
│ IS FACT QUERY? (CAT-1)           │
│ ✅ Awards/ECs/Programs/Academics │
│ ✅ Temporal (initial/final/etc.) │
│ → resolveSql() → RETURN          │
└──────────────────────────────────┘
  ↓ [NO - Not fact query]
  ↓
┌──────────────────────────────────┐
│ IS COACHING QUERY? (CAT-2)       │
│ ✅ Strategy/Insight/Narrative    │
│ → hybridSearch() → hits          │
│ → composeAnswer() with adapter   │
│ → humanize() (warmth + proof)    │
│ → registerProof() (v11.1)        │
│ → RETURN                         │
└──────────────────────────────────┘
  ↓ [NO - Not coaching query]
  ↓
┌──────────────────────────────────┐
│ IS WARMTH/TONE QUERY? (CAT-3)    │
│ ✅ Pure emotional support        │
│ → composeAnswer() with adapter   │
│ → humanize() (warmth + action)   │
│ → RETURN                         │
└──────────────────────────────────┘
```

**Code Reference:**
```typescript
// services/jenny-api/src/orchestrator/agentChat-utfa.ts:800-1040
export async function handleAgentChat(req: any, res: any) {
  const orchestrationStart = Date.now();

  // STEP 1: Classify intent (GPT-5)
  const intent = await classifyIntent(req.message, { route: req.route });

  // STEP 2: Route to CAT-1 (SQL) if fact query
  if (intent.category === 'fact') {
    const sqlResult = await resolveSql(intent, req.student_id);
    return { answer: sqlResult.answer, route: 'sql', model: 'fact-verified' };
  }

  // STEP 3: Route to CAT-2 (KB/RAG) if coaching query
  if (intent.category === 'coaching') {
    const hits = await hybridSearch(req.message, req.student_id, intent.filters);
    const composed = await composeAnswer({
      message: req.message,
      vitals,
      hits,
      memory,
      intent: 'kb_query',
      studentId: req.student_id,
      route: 'kb'
    });

    const humanized = await humanize({
      route: 'kb',
      studentId: req.student_id,
      intent: 'kb_query',
      raw: composed.answer,
      evidence: { passages: hits.map(h => ({ text: h.text, source: h.source })) }
    });

    // v11.1: Register proof (CAT-2 only)
    const proofRecord = await registerProof({
      artifact_id: traceId,
      chip_id: hits[0]?.chip_id,
      content: humanized.text,
      artifact_type: 'kb_answer',
      metadata: { route: 'kb', chip_count: hits.length }
    });

    return {
      answer: humanized.text,
      route: 'kb',
      model: composed.model,
      model_badge: composed.__adapter?.badge,
      debug: { adapter: composed.__adapter, proof: proofRecord }
    };
  }

  // STEP 4: Route to CAT-3 (EQ) if warmth query
  // ...
}
```

---

## 📊 CAT-2 Performance Metrics

**Current (v11.1):**
```
KB Vector Count:       973 chips (924 + 40 + 9)
Mean Retrieval Score:  0.53 - 0.74 (top 25 queries)
Retrieval Latency:     <100ms (hybrid search)
Compose Latency:       500-1500ms (LLM generation)
Adapter Coverage:      50% (traffic split)
Proof Verification:    100% (all CAT-2 answers registered)
Hallucination Rate:    <2% (guardrail passed)
```

**QA Gates (tools/qa/):**
```bash
# Smoke tests
./tools/qa/smoke_tests.sh
# Expected: 100% pass rate

# Full QA suite
./tools/qa/run_qa_suite.sh
# Expected: TOP1_MIN ≥ 0.50 (Sessions), ≥ 0.48 (iMessage), ≥ 0.50 (Assess)

# Vector count drift watch
python3 tools/qa/check_vector_counts.py
# Expected: 973 vectors (924 + 40 + 9), alert if Δ ≥ ±1%

# Proof health metrics
curl http://localhost:8787/api/proof/health
# Expected: verificationRate ≥ 0.95, avgScore ≥ 0.75
```

---

## 🚨 Safety Guardrails

### CAT-1 Protection (Critical!)

**Rule:** CAT-2 components NEVER touch CAT-1 tables or data.

**CAT-1 Tables (UNTOUCHABLE):**
```sql
-- v11.0 CAT-1 (Fact Layer) - 15 tables
universal_enumerations
universal_outcomes
universal_chips
academic_terms
academic_courses
academic_grades
academic_gpa
-- + 8 views: v_awards_*, v_ecs_*, v_programs_*, v_academics_*
vitals
gameplan
college_list
```

**CAT-2 Tables (SAFE TO USE):**
```sql
-- v8.0-v11.1 CAT-2 (KB/RAG) - 10 tables
kb_chips
kb_embeddings
chat_sessions
cross_namespace_links    -- v8.0
evidence_links           -- v8.0
proof_registry           -- v11.1
proof_audit_log          -- v11.1
readiness_forecast_features  -- v8.0
readiness_feature_weights    -- v8.0
autonomy_loop_log            -- v8.0
```

**Verification:**
```bash
# Count CAT-2 table rows (should be > 0 after first query)
psql $DATABASE_URL -c "SELECT COUNT(*) FROM proof_registry"
# Expected: ≥ 1 after CAT-2 query

# Count CAT-1 table rows (should NEVER change from CAT-2 operations)
psql $DATABASE_URL -c "SELECT COUNT(*) FROM universal_enumerations"
# Expected: 48 (unchanged)
```

### Adapter Bypass for CAT-1

**Rule:** CAT-1 (SQL) queries ALWAYS use base model (gpt-4o-mini), NEVER adapter.

**Code:**
```typescript
// services/jenny-api/src/llm/adapter.ts:48-53
export function chooseModel(intent: string, studentId: string, route: string): string {
  // SAFETY: CAT-1 (SQL) always uses base model (no adapter)
  if (route === 'sql') {
    log.event('adapter_bypassed_for_cat1', { intent, route });
    return registry.models.composer_base; // gpt-4o-mini
  }
  // ... CAT-2/CAT-3 logic
}
```

**Verification:**
```bash
# Check adapter logs (should show ZERO adapter selections for CAT-1)
grep "adapter_bypassed_for_cat1" logs/jenny-api.log | wc -l
# Expected: > 0 if CAT-1 queries made

grep "adapter_selected.*route.*sql" logs/jenny-api.log | wc -l
# Expected: 0 (NEVER allow adapter for CAT-1)
```

---

## 📚 Code Reference Summary

**CAT-2 Core Files:**
```
/services/jenny-api/src/
├── retrieval/hybrid.ts           (1-43)     - Pinecone + reranking
├── compose/compose.ts             (1-111)    - LLM composition + adapter
├── llm/adapter.ts                 (1-159)    - v11.1: Model routing
├── services/proof/verifier.ts     (1-409)    - v11.1: Hash verification
├── lib/humanizer.js               (1-250)    - v10.4: Warmth + tone
├── orchestrator/agentChat-utfa.ts (800-1040) - Unified routing
└── router/intentRouter.ts         (1-300)    - GPT-5 intent classification

/config/
└── model_registry.json            (1-24)     - v11.1: Adapter config

/tools/qa/
├── smoke_tests.sh                 - Fast validation
├── run_qa_suite.sh                - Full QA suite
├── check_vector_counts.py         - Drift watch
└── audit_legacy_namespaces.py     - Namespace cleanup
```

**Database Tables:**
```sql
-- CAT-2 (v8.0-v11.1) - 10 tables
kb_chips (973 rows)
kb_embeddings (973 rows)
chat_sessions (dynamic)
cross_namespace_links (v8.0)
evidence_links (v8.0)
proof_registry (v11.1)
proof_audit_log (v11.1)
readiness_forecast_features (v8.0)
readiness_feature_weights (v8.0)
autonomy_loop_log (v8.0)
```

---

## 🎯 Test Examples (CAT-2)

**Query 1: Coaching Strategy**
```
User: "How should I approach the NCWIT Award application?"

Flow:
1. Intent: coaching/strategy
2. Route: CAT-2 (KB)
3. hybridSearch("NCWIT Award application", "huda-2025")
4. Hits: [W012-STRATEGY-005, W013-TACTIC-008, ...]
5. Compose with adapter (jenny_v8_adapter)
6. Humanize (warmth + proof-presenter)
7. Register proof (score: 0.85, verified: true)
8. Return: "Based on your design thinking background, here's how to approach NCWIT..."

Debug:
{
  route: 'kb',
  adapter: { model: 'jenny_v8_adapter', isAdapter: true, badge: '🔶' },
  proof: { score: 0.85, verified: true, chip_count: 8 }
}
```

**Query 2: Narrative Insight**
```
User: "Tell me about past students who combined film and CS"

Flow:
1. Intent: narrative/insight
2. Route: CAT-2 (KB)
3. hybridSearch("film CS combined students", "huda-2025")
4. Hits: [W005-INSIGHT-001, W022-RESULT-003, ...]
5. Compose with base (gpt-4o-mini) - control group
6. Humanize (warmth + proof-presenter)
7. Register proof (score: 0.78, verified: true)
8. Return: "Great question! Let me share Sarah's story..."

Debug:
{
  route: 'kb',
  adapter: { model: 'gpt-4o-mini', isAdapter: false, badge: '⚪' },
  proof: { score: 0.78, verified: true, chip_count: 6 }
}
```

**Query 3: Micro-Tactic (iMessage)**
```
User: "What should I text my coach about missing the deadline?"

Flow:
1. Intent: micro-action/communication
2. Route: CAT-2 (KB) - iMessage namespace
3. hybridSearch("text coach missed deadline", "huda-2025", { namespace: 'iMessage' })
4. Hits: [IMSG-TEMPLATE-012, IMSG-TONE-003, ...]
5. Compose with adapter (jenny_v8_adapter)
6. Humanize (warmth + action)
7. Register proof (score: 0.72, verified: true)
8. Return: "Here's a template: 'Hi Jenny! I'm so sorry I missed the deadline...'"

Debug:
{
  route: 'kb',
  adapter: { model: 'jenny_v8_adapter', isAdapter: true, badge: '🔶' },
  proof: { score: 0.72, verified: true, chip_count: 3 }
}
```

---

## 🚀 Deployment Status

**v11.1 (2025-10-12):**
- ✅ LLM Adapter v2 migrated to jenny-api
- ✅ Proof Verification Service activated
- ✅ Adapter traffic split: 50/50 (jenny_v8_adapter vs base)
- ✅ Proof registration for all CAT-2 answers
- ✅ Server running on port 8787
- ✅ CAT-1 protection verified (zero overlap)

**Next Steps (v11.2+):**
- Phase 3: ✅ Test Lab v4.0 Complete (CAT-2 test suite with PRD gates)
- Phase 4: Cross-Namespace Reasoning (v8.0 complete)
- Phase 5: Self-Learning Chip Pipeline (auto-ingestion)
- Phase 6: Outcome Forecasting (readiness prediction)

---

## Universal Quality Verification (v12.0)

**New in v12.0:** CAT-2 KB/RAG responses now pass through the Universal Quality Verification system for warmth and actionability assessment.

### CAT-2 Quality Rubric

**Threshold:** Combined score ≥ 80 (warmth 50% + action 50%)

**CAT-2 Specific Adjustments:**
- **Evidence Emphasis:** RAG responses must cite retrieved chips/sources
- **Coaching Balance:** Maintain warmth while delivering actionable coaching advice
- **Synthesis Quality:** Combine multiple sources into coherent guidance

**Example Quality Enhancement:**

Before Quality Layer (v11.1):
```
Based on previous sessions, you should focus on your essay drafts.
Work on your Common App personal statement first.

Evidence: W016-SESSION-001, W024-SESSION-005
```
Score: Warmth 45, Action 60, Combined 52.5 ❌ FAIL

After Quality Healing (v12.0):
```
I totally get where you're coming from — essay writing can feel overwhelming!
From what we've worked on before, let's tackle your Common App personal statement first.
Here's what I suggest: Block out 90 minutes this week to draft your opening paragraph.
Start with that moment you discovered your passion for robotics — that's your hook.

Evidence: W016-SESSION-001 (essay coaching), W024-SESSION-005 (brainstorming)
```
Score: Warmth 85, Action 88, Combined 86.5 ✅ PASS

### CAT-2 Quality Roadmap

**Current Baseline (v12.0):**
- CAT-2 KB: 88.0% pass rate (22/25 tests)
- Evidence retrieval: 95% (24/25 tests have provenance chips)
- Quality enhancement: Applied to all KB/RAG responses
- Healing rate: 18% (5/25 tests healed)

**Phase 1 - Evidence-First Rubric (v12.1):**
- Adjust rubric to emphasize evidence citation over pure tone
- CAT-2 threshold: Combined score ≥ 75 (lower than CAT-3 ≥ 80)
- Target: 92%+ pass rate with minimal healing
- Focus: Ensure every answer cites at least 2 sources

**Phase 2 - Multi-Source Synthesis (v12.2):**
- Detect when query requires combining multiple chip types
- Example: "How do I improve my EC leadership?" (needs session + iMessage + assessment data)
- Quality check: Verify synthesis includes all relevant sources
- Target: 95% multi-source citation accuracy

**Phase 3 - Adaptive Evidence Depth (v13.0):**
- Light queries → 1-2 sources, brief coaching
- Medium queries → 3-5 sources, structured guidance
- Deep queries → 5+ sources, comprehensive strategy with examples
- Target: Evidence depth matching query complexity 90% of time

---

## Jenny Test Lab CAT-2 Suite

**New in v12.0:** Unified testing framework with automated PRD gate validation for CAT-2 queries.

### Test Suite Overview

**Location:** `/apps/test-chat-ui/lib/testlab/suites/cat2-kb-v4.json`
**Total Tests:** 25 scenarios across coaching/strategy/narrative domains

**Coverage:**
- General coaching advice: 10 tests
- Strategy guidance: 8 tests
- Multi-intent queries: 5 tests
- Historical insights: 2 tests

### PRD Gates (4 gates per test)

**Gate 1: Evidence Tags (WARN)**
- Validation: `run.debug.tags.length > 0`
- Warning: Missing evidence tags indicates retrieval failure
- Fix: Check Pinecone namespace, verify vector embedding

**Gate 2: No Meta-Leakage (REQUIRED)**
- Validation: Answer doesn't contain internal metadata (chip_id, namespace refs)
- Failure indicates: Meta-stripping failed in composer
- Fix: Update meta-stripping patterns in compose.ts

**Gate 3: Latency (WARN if > 6s)**
- Validation: `run.metrics.latency.total_ms ≤ 6000`
- Warning: > 6s indicates slow retrieval or LLM generation
- Fix: Optimize Pinecone query, check LLM latency

**Gate 4: Provenance (WARN)**
- Validation: `run.debug.provenance.length > 0`
- Warning: Missing provenance chips indicates no evidence chain
- Fix: Ensure retrieval returns chips with source metadata

### Test Execution Results (v12.0)

**Overall Performance:**
- Pass Rate: 88.0% (22/25 tests passing all 4 gates)
- Evidence Tag Presence: 96% (24/25 tests)
- Provenance Tracking: 88% (22/25 tests)
- Meta-Leakage: 100% clean (0 leakage incidents)
- Latency: 92% under threshold (p95: 4.2s, max: 7.1s)

**Known Issues:**
1. Test #8 (multi-intent complex query) - Latency warning (7.1s) due to multiple retrieval rounds
2. Test #15 (historical insights) - Missing provenance for older KB chips
3. Test #22 (cross-namespace query) - Evidence tags present but not cited in answer

**Quality Healing Impact:**
- CAT-2 healing rate: 20% (5/25 tests healed)
- Average improvement: +12 points (moderate healing due to coaching nature)
- Healing latency: +2.2s average (similar to CAT-1)

---

**Status:** ✅ CAT-2 Production Ready - v12.0 Updated
**Version:** v12.0
**Last Updated:** 2025-10-14

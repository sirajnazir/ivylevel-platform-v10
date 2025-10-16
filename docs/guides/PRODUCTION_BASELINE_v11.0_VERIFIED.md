# Production Baseline Assessment (v11.0 VERIFIED)

**Date:** 2025-10-14
**Purpose:** Establish VERIFIED production baseline before unified orchestration work
**Guardrail:** MANDATORY - Do not break any existing functionality

---

## Git Verified Baseline

### Last Committed Production Code
```bash
Commit: c9240fb
Message: "v11.0: CAT-1 Complete - Universal Attribute Filtering (100% Test Coverage)"
Date: [from git log]
Branch: release/v1.1.0
```

### Production Code State (Committed in Git)
**Location:** `/services/jenny-api/src/`

```
✅ COMMITTED (Production Baseline v11.0):
- orchestrator/agentChat-utfa.ts (v10.x baseline)
- router/intentRouter.ts (universal intent classification)
- resolvers/enums.ts (awards, ECs, programs)
- resolvers/academics.ts (transcript, GPA)
- retrieval/hybrid.ts (Pinecone hybrid search)
- compose/compose.ts (base composition + meta-stripping)
- services/facts-canonical.ts (vitals, temporal facts)
- services/sessions.ts (conversation history)

❌ NOT COMMITTED (Work-in-Progress v11.1-11.4):
- compose/compose-eq.ts (EQ-specific composer)
- intent/extractors/eq-classifier.ts (emotional query detection)
- llm/adapter.ts (model routing logic)
- services/proof/verifier.ts (proof verification)
- config/model_registry.json (fine-tuned model registry)
```

---

## Uncommitted Work-in-Progress

### Files Created (NOT in git)
These are experiments/enhancements built on v11.0:

1. **CAT-3 EQ Enhancement (v11.1-11.3)**
   - `src/compose/compose-eq.ts` (375 lines)
   - `src/intent/extractors/eq-classifier.ts`
   - Enhanced system prompts for warmth + action

2. **LLM Adapter System (v11.1)**
   - `src/llm/adapter.ts`
   - `config/model_registry.json`
   - Model routing (jenny_v8_adapter vs base)

3. **Proof Verification (v11.1)**
   - `src/services/proof/verifier.ts`
   - SHA-256 hash verification

4. **Training Data & Analysis**
   - `data/training/jenny_v9_eq_*.jsonl` (jenny_v9_eq model - 690 examples)
   - `data/training/jenny_v10_eq_*.jsonl` (jenny_v10_eq_combined - 4,498 examples - FAILED)
   - `data/training/FINAL_RECOMMENDATION.txt`
   - `data/training/NORTH_STAR_GAP_ANALYSIS.txt`

5. **Documentation**
   - `docs/guides/HOLISTIC_CAT_INTEGRATION_ANALYSIS.md`
   - `docs/guides/SILO_PERFORMANCE_VALIDATION_v11.3.md`
   - `docs/guides/JENNY_V9_EQ_COMPLETE_SPEC.md`

### Environment Variables (Current Deployment)
```bash
JENNY_V10_EQ_MODEL=NOT_SET
JENNY_V9_EQ_MODEL=ft:gpt-4o-mini-2024-07-18:personal:jenny-v9_eq:CQMYIrRA
```

**Deployment Status:**
- ✅ jenny_v9_eq is ACTIVE (46.3% CAT-3 pass rate)
- ❌ jenny_v10_eq_combined FAILED (0% pass rate, not deployed)

---

## Current Runtime State (What's Actually Running)

### Orchestration Flow (v11.0 + Uncommitted Enhancements)

**File:** `services/jenny-api/src/orchestrator/agentChat-utfa.ts`

**Current Flow (Modified but Uncommitted):**
```typescript
export async function agentChat(req: any, res?: any) {
  // PRIORITY 0 (v11.3 UNCOMMITTED): EQ Early Exit
  if (isEQQuery(req.message)) {
    const eqResponse = await composeEQResponse({ ... });
    return eqResponse; // Uses compose-eq.ts (UNCOMMITTED FILE)
  }

  // PRIORITY 1: Universal Enumerations (v11.0 COMMITTED)
  const enumResult = await maybeEnumAnswer(pool, req.student_id, req.message);
  if (enumResult) {
    // Returns SQL facts with humanizer
    return response;
  }

  // PRIORITY 2: Temporal Facts (v10.x COMMITTED)
  if (isTemporalFactQuery) {
    const result = await resolveTemporalFact(pool, { ... });
    return response;
  }

  // PRIORITY 3: RAG + LLM (v10.x COMMITTED)
  const hits = await hybridSearch(req.message, req.student_id);
  const composed = await composeAnswer({ ... });
  return payload;
}
```

**Status:** The orchestrator has uncommitted EQ early exit logic that calls uncommitted `compose-eq.ts`.

---

## Production-Safe Baseline (What We Can Build On)

### Safe Foundation (Committed Code Only)

**CAT-1 (SQL Facts) - v11.0 COMMITTED ✅**
- Intent Classification: `router/intentRouter.ts`
- Resolvers: `resolvers/enums.ts`, `resolvers/academics.ts`
- Orchestration: `orchestrator/agentChat-utfa.ts` (enumeration routing)
- Performance: ~90-95% fact accuracy, near-zero hallucination

**CAT-2 (KB/Intel) - v10.x COMMITTED ✅**
- Hybrid Search: `retrieval/hybrid.ts`
- Pinecone: `retrieval/pinecone-logged.ts`
- Composition: `compose/compose.ts`
- Performance: ~75-85% retrieval relevance

**CAT-3 (EQ/Human) - PARTIALLY UNCOMMITTED ⚠️**
- EQ Detection: `intent/extractors/eq-classifier.ts` (UNCOMMITTED)
- EQ Composer: `compose/compose-eq.ts` (UNCOMMITTED)
- Model: jenny_v9_eq (deployed via env var, but routing logic uncommitted)
- Performance: 46.3% pass rate (warmth 1.4%, action 42.6%)

---

## Risk Assessment for Unified Integration

### High Risk (Would Break Production)
❌ **Modifying committed files without testing:**
- `orchestrator/agentChat-utfa.ts` - Core routing logic
- `compose/compose.ts` - Base composition
- `router/intentRouter.ts` - Intent classification

### Medium Risk (Uncommitted, Safe to Modify)
⚠️ **Working with uncommitted files:**
- `compose/compose-eq.ts` - Can enhance, not in production baseline
- `intent/extractors/eq-classifier.ts` - Can modify, experimental
- `llm/adapter.ts` - Can redesign, not in git

### Zero Risk (Additive New Files)
✅ **Creating new files:**
- `orchestrator/evidence-aggregator.ts` - NEW, additive
- `compose/compose-unified.ts` - NEW, additive
- Feature flags for gradual rollout

---

## Recommended Approach (Guardrail-Compliant)

### Phase 1: Commit Current WIP or Discard
**Decision Point:** The uncommitted code (v11.1-11.4) is in limbo. We must:

**Option A: Commit WIP as v11.x baseline**
```bash
git add src/compose/compose-eq.ts src/intent/extractors/eq-classifier.ts src/llm/ src/services/proof/
git commit -m "v11.3: CAT-3 EQ Enhancement (compose-eq + eq-classifier + adapter)"
```
- Establishes new baseline
- Allows us to build unified orchestration on top
- Preserves rollback capability (git revert)

**Option B: Discard WIP, start from v11.0**
```bash
git restore src/compose/compose.ts src/orchestrator/agentChat-utfa.ts
rm -rf src/compose/compose-eq.ts src/intent/extractors/eq-classifier.ts src/llm/ src/services/proof/
```
- Returns to clean v11.0 baseline
- Requires rebuilding EQ logic (but we have specs)
- Guarantees no hidden dependencies

**Option C: Branch WIP, build unified on v11.0**
```bash
git stash  # Save WIP
git checkout -b feature/unified-orchestration
# Build unified system on clean v11.0
```
- Keeps WIP safe
- Builds unified on verified baseline
- Merges WIP features later if needed

### Phase 2: Build Unified Orchestration (Additive Only)

**Principle:** Create NEW files, don't modify COMMITTED files

**New Files to Create:**
1. `src/orchestrator/evidence-aggregator.ts` (NEW)
   - Aggregates SQL + KB + EQ evidence in parallel
   - No modification to existing resolvers

2. `src/compose/compose-unified.ts` (NEW)
   - Synthesizes multi-source evidence
   - Calls existing compose.ts internally (doesn't replace it)

3. `src/orchestrator/agentChat-unified.ts` (NEW)
   - Unified orchestration flow
   - Can coexist with agentChat-utfa.ts

**Feature Flag Pattern:**
```typescript
// In agentChat-utfa.ts (minimal change)
export async function agentChat(req: any, res?: any) {
  // Feature flag: Try unified orchestration first
  if (process.env.UNIFIED_ORCHESTRATION_ENABLED === '1') {
    const { agentChatUnified } = await import('./agentChat-unified.js');
    return agentChatUnified(req, res);
  }

  // FALLBACK: Existing logic (v11.0 committed code)
  // ... existing orchestration ...
}
```

**Benefits:**
- ✅ Zero risk to production (flag disabled by default)
- ✅ Easy rollback (just disable flag)
- ✅ Gradual testing (enable for test student, then cohort)
- ✅ No modification to committed baseline

---

## Next Steps (Guardrail-Safe)

### Immediate Actions

1. **Verify Current State:**
   ```bash
   # Test what's currently running
   cd services/jenny-api
   PORT=8787 tsx src/server-utfa.ts &
   # Run CAT-1, CAT-2, CAT-3 tests to establish baseline metrics
   ```

2. **Decision on WIP:**
   - Do we commit v11.1-11.4 WIP as new baseline?
   - Or do we stash/branch and build unified on clean v11.0?

3. **Document Baseline Performance:**
   - CAT-1: Run `cat1-facts-v4.json` test suite → measure pass rate
   - CAT-2: Run `cat2-kb-v4.json` test suite → measure pass rate
   - CAT-3: Run `cat3-eq-v4.json` test suite → measure pass rate (currently 46.3%)

4. **Design Unified Orchestration (Additive):**
   - Create `evidence-aggregator.ts` (gathers all sources)
   - Create `compose-unified.ts` (synthesizes evidence)
   - Create `agentChat-unified.ts` (unified flow)
   - Add feature flag to `agentChat-utfa.ts`

### Success Criteria

**Before ANY coding:**
- [ ] Baseline metrics documented (CAT-1, CAT-2, CAT-3 pass rates)
- [ ] WIP decision made (commit, discard, or branch)
- [ ] Git baseline clean (no uncommitted production code)

**During development:**
- [ ] All new code in NEW files only
- [ ] No modification to committed baseline (except feature flag)
- [ ] Feature flag disabled by default

**Before deployment:**
- [ ] Unified system passes all CAT-1, CAT-2, CAT-3 tests
- [ ] Baseline system still passes (feature flag OFF)
- [ ] Gradual rollout plan (test student → cohort → all)

---

## Files Requiring Master Spec Updates

**After WIP decision and baseline testing:**

1. `docs/MASTER_PROD_TECH_SPEC.md`
   - Update version to match git baseline (currently claims v11.4, git shows v11.0)
   - Document unified orchestration architecture (NEW section)
   - Add feature flag documentation

2. `docs/PROD_FEATURE_RELEASE_DETAILS.md`
   - Add v11.x entry for WIP (if committed)
   - Add v12.0 entry for unified orchestration
   - Include before/after metrics

3. `docs/PROD_DB_ARCH.md`
   - No changes needed (unified orchestration doesn't touch DB)

4. `CHANGELOG.md`
   - Document baseline verification
   - Document unified orchestration implementation
   - Include file:line references

---

**Status:** Baseline assessment complete. Awaiting decision on WIP handling.

**Recommendation:** COMMIT WIP as v11.3, then build unified orchestration additively on top with feature flags.

**Rationale:**
- WIP includes valuable enhancements (compose-eq.ts, eq-classifier.ts)
- Committing establishes clean baseline for unified work
- Git history preserves rollback capability
- Feature flags ensure safety during unified development

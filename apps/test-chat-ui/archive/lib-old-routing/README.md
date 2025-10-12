# Archived: Old Test-Chat-UI Routing Modules

**Date Archived:** 2025-10-09
**Reason:** Duplicate functionality - production uses `/services/jenny-api/` exclusively

---

## What Happened

These files were created as part of the test-chat-ui development but duplicated production routing logic that exists in `/services/jenny-api/`. This caused confusion and maintenance issues.

### Duplicate Files Archived

1. **`intentLexicon.ts`** - Pattern-based intent router with 7 universal overrides
   - **Production equivalent:** `/services/jenny-api/src/router/intentRouter.ts` (GPT-5 classifier with fact guardrails)

2. **`orchestrator.ts`** - Query orchestrator with deduplication logic
   - **Production equivalent:** `/services/jenny-api/src/orchestrator/agentChat-utfa.ts`

3. **`composerGuards.ts`** - Answer guards with meta-leakage stripping
   - **Production equivalent:** `/services/jenny-api/src/compose/` (multiple files)

4. **`composeAnswer.ts`** - Answer composition with Handlebars scaffolds
   - **Production equivalent:** `/services/jenny-api/src/compose/compose.ts`

---

## Architecture Clarification

### Correct Production Flow

```
User → Test Chat UI (Next.js) → HTTP POST → Jenny API Server (Express)
                                               ↓
                                      GPT-5 Intent Router (intentRouter.ts)
                                               ↓
                                      Fact Guardrails (v10.1)
                                               ↓
                                      Resolvers (awards, ecs, academics, etc.)
                                               ↓
                                      PostgreSQL Database
                                               ↓
                                      Answer Composer (with dedup + meta-stripping)
                                               ↓
                                      Return to UI
```

### What Test-Chat-UI Should Be

**ONLY a UI layer** - no business logic, no routing, no orchestration.

- Display interface for testing queries
- HTTP client to call Jenny API
- Render responses from Jenny API

---

## Why These Were Wrong

1. **Parallel Logic:** Created separate routing system from production
2. **Divergence:** Fixes applied here didn't reach production jenny-api
3. **Maintenance:** Two codebases to update for every fix
4. **Confusion:** Unclear which system was "production"

---

## Fixes Applied to Production (v10.1)

All fixes from these files were ported to production jenny-api:

### 1. Fact-Based Guardrails
**Location:** `/services/jenny-api/src/router/intentRouter.ts:513-603`

Pre-classification pattern matching for:
- Awards queries → `awards.list` or `progression.timeline`
- GPA/grades → `academics.summary`
- SAT/ACT → `sat.ordinal`
- AP courses → `academics.summary`
- Summer programs → `programs.list`
- ECs/Activities → `ecs.list`
- College list/decisions → `college.list` or `application.final`
- Grade jumps/vitals → `progression.timeline`

### 2. Answer Deduplication
**Location:** `/services/jenny-api/src/orchestrator/agentChat-utfa.ts:23-55`

Normalizes and removes duplicate lines from answers:
- Applied to enumeration results (awards, ECs, programs)
- Applied to temporal facts results (SAT scores, GPA progression)
- Applied to RAG/LLM answers

### 3. Meta-Leakage Stripping
**Location:** `/services/jenny-api/src/compose/compose.ts:5-31`

Removes internal metadata from user-facing answers:
- Chip IDs: `(W016-RESULT-001)`, `W015-STRATEGY-001`
- Source citations: `*Source*: KBv6_2025-10-06_v1.0`
- Namespace refs: `@ KBv6_iMessage_2025-10-07_v1.0`
- Internal identifiers: `chip_id:`, `scaffold.`, `SRC-`, etc.

---

## Do NOT Use These Files

**Production code lives ONLY in `/services/jenny-api/`**

If you need to make routing/orchestration/composition changes:
1. ✅ Modify `/services/jenny-api/src/`
2. ❌ Do NOT modify test-chat-ui (it's just a UI!)

---

## Reference Documentation

See the new master specs for production architecture:
- `/docs/MASTER_PROD_TECH_SPEC.md` - Production architecture
- `/docs/PROD_DB_ARCH.md` - Production database schema
- `/docs/PROD_FEATURE_RELEASE_DETAILS.md` - Release history

---

**Status:** 🗄️ Archived - Do Not Use
**Replaced By:** Production jenny-api modules
**Last Modified:** 2025-10-09

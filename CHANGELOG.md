# Changelog

## [2025-10-14 18:15] v11.3.1: Explicit jenny_v9_eq Deployment Documentation

### Modified
- `services/jenny-api/src/compose/compose-eq.ts:91-98` - Updated comments to reflect jenny_v9_eq deployment (not v10)
- `services/jenny-api/src/compose/compose-eq.ts:136-140` - Clarified humanizer strategy for jenny_v9_eq warmth gap

### Documentation
- Updated `docs/MASTER_PROD_TECH_SPEC.md` to v11.3.1
- Updated `docs/PROD_FEATURE_RELEASE_DETAILS.md` with explicit deployment status

### Impact
- **CRITICAL CLARIFICATION**: jenny_v9_eq is DEPLOYED (46.3% baseline)
- jenny_v10_eq_combined was trained but FAILED (0% pass rate, NOT deployed)
- Enhanced system prompts (350+ lines) + humanizer compensate for jenny_v9_eq warmth gap (1.4%)
- Rollback from v10 to v9 documented explicitly

## [2025-10-14 18:00] v11.3: CAT-3 EQ Infrastructure

### Added
- `services/jenny-api/src/compose/compose-eq.ts` (375 lines) - Dedicated EQ composer with comprehensive warmth+action system prompts
- `services/jenny-api/src/intent/extractors/eq-classifier.ts` - Emotional pattern detection (11 categories)
- `services/jenny-api/src/llm/adapter.ts` - LLM model routing system
- `services/jenny-api/src/services/proof/verifier.ts` - Proof verification service
- `services/jenny-api/config/model_registry.json` - Fine-tuned model registry

### Modified
- `services/jenny-api/src/orchestrator/agentChat-utfa.ts:587-621` - EQ early exit routing
- `services/jenny-api/src/compose/compose.ts:35-59` - LLM adapter integration
- `services/jenny-api/src/router/intentRouter.ts` - Intent classification enhancements
- `services/jenny-api/src/retrieval/hybrid.ts` - KB retrieval improvements

### Documentation
- Updated `docs/MASTER_PROD_TECH_SPEC.md` to v11.3
- Updated `docs/PROD_FEATURE_RELEASE_DETAILS.md` with v11.3 section
- Added mandatory Git+Specs sync guardrail to `CLAUDE.md`

### Impact
- Established complete CAT-3 (Emotional Intelligence) infrastructure
- Enhanced system prompts with 350+ lines of explicit warmth/action guidance
- Foundation for unified orchestration (CAT-1 + CAT-2 + CAT-3)
- jenny_v9_eq remains deployed (46.3% CAT-3 pass rate baseline)

## [2025-10-14 17:30] docs: Add mandatory Git+Specs sync guardrail to CLAUDE.md

- Added Step 2 (MANDATORY Git Commit immediately after spec updates)
- Added Step 3 (Verify Git+Specs Sync before new work)
- Added Anti-pattern examples (out-of-sync specs)
- Purpose: Prevent master specs/code/git drift

CLAUDE.md:42-125

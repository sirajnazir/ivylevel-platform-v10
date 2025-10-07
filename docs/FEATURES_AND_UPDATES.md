# Features & Updates Tracker

**IvyLevel Platform v10 - Jenny Agentic AI**
**Last Updated:** 2025-10-07 09:45 UTC
**Current Version:** v1.2 (KBv6 Assessment+GamePlan + Legacy Cleanup) + v5.5 (KB Intel Chips Architecture + Production QA) + v4.6.2c (UAPX Guardrails)

---

## Purpose

This document tracks all features, enhancements, and updates to the platform. Each entry includes implementation date, version, and reference to relevant specs/migrations.

---

## Active Features (v3.7.1)

### Core Architecture

#### ✅ Universal Vitals Model (v3.0)
- **Status:** Production
- **Date:** 2025-09-30
- **Description:** Append-only temporal facts model with complete provenance tracking
- **Tables:** `vital_facts`, `students`, `sources`, `jtbd`
- **Key Features:**
  - Temporal resolution (first/latest/nth/as-of)
  - Source gating (SRC-GAMEPLAN-*, SRC-COMMONAPP-*)
  - Evidence chain linking
- **References:**
  - Migration: `apps/api/db/migrations/jenny-v3/001_universal_vitals_model.sql`
  - Spec: `docs/DB_ARCHITECTURE_SPEC.md`

#### ✅ Universal KB Items Ledger (v3.0)
- **Status:** Production
- **Date:** 2025-10-03
- **Description:** Single table for all targets/outcomes with state machine
- **Table:** `kb_items`
- **State Machine:** Planned → In Transit → Submitted → Outcome → Archived
- **Supported Types:** Awards, ECs, Programs, Narratives, Plan Events
- **References:**
  - Migration: `2025-10-03-kb-items-universal.sql`
  - Spec: `docs/DB_ARCHITECTURE_SPEC.md#kb-items-universal-ledger`

#### ✅ KB Intel Chips Architecture v1.2 (Four-Family KBv6 + Legacy Cleanup)
- **Status:** Production (v1.2 with Assessment+GamePlan + Legacy Cleanup Complete)
- **Date:** 2025-10-07 (v1.2 updated)
- **Description:** Production-grade knowledge base with 973 high-density knowledge artifacts organized into 4 KBv6 chip families with comprehensive QA automation and legacy cleanup
- **Key Metrics:**
  - Total Vectors: 973 (100% KBv6 - legacy cleaned)
  - Embedding: `text-embedding-3-large` (3072 dimensions)
  - Query Performance: P90 ~250ms (single), ~450ms (federated)
  - Retrieval Precision: Top-1 ≥ 0.50 on 78% probes, Top-3 100% coverage
  - Legacy Cleanup: Removed 1,371 vectors (jenny_v2: 877, interactions: 346, jtbd: 148)
- **Four-Family Architecture (KBv6):**
  - **Sessions+Exec (924 vectors)**: 93 weeks + execution frameworks + W001-FRAMEWORK-168HOUR, 10 chip types, IDs: W024-FRAMEWORK-001, W001-FRAMEWORK-168HOUR, Namespace: `KBv6_2025-10-06_v1.0`
  - **iMessage (40 vectors)**: Micro-interaction patterns, 5 chip types (Message_Template, Tone_Cue, Escalation_Pattern, Micro_Tactic, Turnaround_Case), 16 situation tags, IDs: IMSG-ESCALATIONPATTERNCHIP-abc123, Namespace: `KBv6_iMessage_2025-10-07_v1.0`
  - **Assessment+GamePlan (9 vectors)**: Pre-execution intel (4 assessment + 5 gameplan), Types: Insight_Chip, Trust_Chip, Strategy_Chip, Silver_Bullet_Chip, IDs: ASSESS-INSIGHT-001, GAMEPLAN-STRATEGY-001, Namespace: `KBv6_Assessment_2025-10-07_v1.0`
- **Timeline Boundaries:**
  - Assessment (pre-execution): Rapid assessment, strengths/gaps, time constraints
  - GamePlan (pre-execution): Tactics, portfolio architecture, identity synthesis
  - W001 Execution (post-assessment/gameplan): 168-hour framework belongs here, not in assessment
- **Namespace Security (v1.2):**
  - Guard: `PINECONE_ALLOWED_NAMESPACES` env var blocks legacy namespaces at runtime
  - Implementation: `services/jenny-api/src/lib/pineconeClient.ts:assertAllowedNamespace()`
  - Backwards compatible (allows all if unset)
- **Federated Search:**
  - Strategy: Pool + rerank across multiple namespaces
  - Filter options: `source: 'both'` (all namespaces), `source: 'sessions'` (sessions+exec only), `source: 'imessage'` (iMessage only), `source: 'assessment'` (assessment+gameplan only)
  - Implementation: `services/jenny-api/src/services/kb_resolver.ts`
  - Performance: Single namespace ~250ms P90, Federated (both) ~450ms P90
- **Comprehensive QA Suite (10 Components - v1.2 updated):**
  - Smoke Tests (10s): Fast 2-query validation, PR + daily trigger
  - Vector Counts (5s): Validate 924 + 40 + 9 counts, PR + daily trigger
  - Precision Probes (3-5m): 25 golden queries, Nightly trigger
  - Federated Search (2m): Namespace isolation validation, Nightly trigger
  - Drift Watch (1m): Count monitoring (±2%), Nightly trigger
  - Deployment Version (30s): Manifest validation, PR + daily trigger
  - Structural QA (5m): Duplicates/outliers/conflicts, Nightly trigger
  - Backup Utility (variable): Snapshot/rollback, Manual trigger
  - **Legacy Audit (v1.2)**: Check for legacy namespace pollution, Manual/scheduled trigger
  - **Namespace Cleanup (v1.2)**: Safe deletion with confirmation and backup, Manual trigger
- **CI/CD Integration:**
  - GitHub Actions: `.github/workflows/kb-qa.yml`
  - Smoke tests block merge if failed
  - Nightly full suite with artifact retention (30 days)
  - Precision Baselines: Sessions Top-1 ≥ 0.50 on 7/9 probes (78%), iMessage Top-1 ≥ 0.48 on 8/9 probes (89%), Top-3 coverage 9/9 (100%)
- **Parameterized Thresholds:**
  - All QA thresholds configurable via environment: TOP1_MIN (0.50), TOP1_MIN_IMSG (0.48), TOP3_COVERAGE (1.00), OUTLIER_MAX (0.02), DRIFT_MAX (0.02)
  - Benefit: Tune per environment without code changes
- **Drift Watch with Baselines:**
  - Compares current counts against last snapshot
  - Alerts if drift > 2% (configurable)
  - Generates drift reports with reason codes (INGEST_NEW_CHIPS, DELETION_OR_CLEANUP, NO_CHANGE)
  - Storage: `data/kb_intel_chips/qa_runs/*/vector_counts.json`
- **Deployment Manifest:**
  - File: `tools/qa/deployment_manifest.json`
  - Version control for expected deployment state
  - Validates namespace names, vector counts (±5% tolerance), embedding model/dimensions, schema version
- **Backup & Restore:**
  - Script: `tools/qa/backup_namespace.py`
  - Exports all vector IDs from namespaces
  - Samples metadata (first 100 vectors for speed)
  - Creates timestamped snapshots: `data/kb_intel_chips/snapshots/YYYYMMDD_HHMMSS/`
- **Pipeline:**
  - `embed_kb_v6_to_v8.py` - Sessions+Exec embedder
  - `embed_imsg_chips_v3.py` - iMessage embedder
  - `transform_imsg_chips_v3.py` - Add situation_tag, new types
  - `validate_kb_v6_chips.py` - Schema validator
  - `tools/qa/run_qa_suite.sh` - Full QA suite runner
  - `tools/qa/smoke_tests.sh` - Fast validation
  - `tools/qa/check_vector_counts.py` - Count validation
  - `tools/qa/precision_probes_test.py` - Golden query testing
  - `tools/qa/check_federated_search.py` - Namespace isolation
  - `tools/qa/check_drift.py` - Drift detection
  - `tools/qa/check_deployment_version.py` - Manifest validation
  - `tools/qa/backup_namespace.py` - Snapshot utility
- **Production Deployment (v5.5):**
  - Index: `jenny-v3-3072-093025` (AWS us-east-1, 3072 dims)
  - Sessions+Exec Namespace: `KBv6_2025-10-06_v1.0` (923 vectors)
  - iMessage Namespace: `KBv6_iMessage_2025-10-07_v1.0` (40 vectors)
  - Embedding Model: text-embedding-3-large (3072d, cosine)
  - Schema Version: v6.0
  - Smoke Tests: ✅ PASS (Sessions 0.520, iMessage 0.489)
- **File Structure:**
  - `data/kb_intel_chips/chips/` - 877 session chips (93 weeks)
  - `data/kb_intel_chips/exec-chips/` - 46 execution chips
  - `data/kb_intel_chips/imsg-chips/` - 40 iMessage chips
  - `data/kb_intel_chips/qa_runs/` - QA test results (timestamped)
  - `data/kb_intel_chips/snapshots/` - Backup snapshots
  - `tools/ingest/` - Ingestion scripts
  - `tools/qa/` - QA suite (8 scripts, 3 docs)
  - `.github/workflows/kb-qa.yml` - CI/CD automation
- **Breaking Changes from v5.4:**
  - Namespace names changed: No standardized naming → `KBv6_2025-10-06_v1.0` (sessions+exec) + `KBv6_iMessage_2025-10-07_v1.0`
  - Embedding model upgraded: `text-embedding-3-small` (512 dims) → `text-embedding-3-large` (3072 dims)
  - New metadata fields: `chip_family` (required), `situation_tag` (iMessage only)
- **References:**
  - Release Notes: `docs/KB_V5_5_RELEASE_NOTES.md`
  - Master Spec: `docs/MASTER_TECHNICAL_SPEC.md` (v5.5 KB section)
  - DB Spec: `docs/DB_ARCHITECTURE_SPEC.md` (Vector Database v5.5 section)
  - QA Suite README: `tools/qa/README.md`
  - Operational Checklist: `tools/qa/OPERATIONAL_CHECKLIST.md`
  - Quickstart: `tools/qa/QUICKSTART.md`

#### ✅ GPT-5 Intent Router (v3.3)
- **Status:** Production
- **Date:** 2025-10-03
- **Description:** 4-tier waterfall intent routing with LLM-based classification
- **Tiers:**
  1. Enumeration (SQL deterministic) - awards, ECs, programs, narratives
  2. Temporal Facts (UTFA) - first/latest/nth queries
  3. Canonical Facts - single fact lookups
  4. RAG (Hybrid Search) - open-ended questions
- **Implementation:** `services/jenny-api/src/router/intentRouter.ts`
- **References:**
  - Release: `docs/releases/V3.2_GPT5_INTENT_ROUTER.md`
  - Spec: `docs/MASTER_TECHNICAL_SPEC.md#intent-routing-architecture`

#### ✅ Fuzzy Intent Training Pack (v3.4)
- **Status:** Production
- **Date:** 2025-10-03
- **Description:** 48 comprehensive few-shot examples with synonym expansion
- **Key Features:**
  - Phase synonym bags (initial/first/gameplan, final/submitted/application)
  - Object synonym bags (ecs/extracurriculars, programs/summer programs)
  - Tiered confidence routing (≥0.62 route, 0.45-0.62 clarify, <0.45 suggest)
  - Keyword floor detection for generic queries
- **Implementation:** `services/jenny-api/src/router/intentRouter.ts:15-120`
- **References:**
  - Release: `docs/releases/V3.4_FUZZY_INTENT_TRAINING.md`
  - Spec: `docs/MASTER_TECHNICAL_SPEC.md#intent-routing`

#### ✅ GamePlan v2 (v3.4)
- **Status:** Production
- **Date:** 2025-10-03
- **Description:** Synthesized GamePlan views for targets, execution, and outcomes
- **Views:**
  - `v_gameplan_summary_initial` - Initial targets (narrative + awards + ECs + programs)
  - `v_gameplan_vs_execution` - Unified progression timeline (initial → execution → outcomes)
- **Intents:** gameplan.initial, gameplan.vs_progress
- **Resolvers:** gamePlanInitial(), gamePlanVsExecution()
- **References:**
  - Migration: `2025-10-03-v3.4-rubric-gameplan-commonapp.sql`
  - Spec: `docs/DB_ARCHITECTURE_SPEC.md#gameplan-synthesis-views`

#### ✅ IvyReady Rubric (v3.4/v3.4.1)
- **Status:** Production
- **Date:** 2025-10-03
- **Description:** Admissions rubric scoring with temporal snapshots and phase detection
- **Tables:**
  - `admissions_rubric` - Rubric definitions (Ivy+, UC, LAC)
  - `admissions_rubric_factors` - 6 weighted factors (academics 32%, testing 12%, ECs 24%, awards 12%, narrative 15%, context 5%)
  - `admissions_rubric_scores` - Temporal score snapshots (assessment, midpoint, final_submit)
- **Views:**
  - `v_rubric_scores_phase_latest` - Latest scores per student per phase
- **Functions:**
  - `rubric_scores_asof(student, date, rubric)` - Temporal rubric queries
  - `v_rubric_scores_asof(student, date, rubric)` - Phase-aware temporal queries
- **Intent:** ivyready.score (with phase detection: initial → assessment, final → final_submit)
- **Resolver:** ivyReadyScore(pg, studentId, phase)
- **References:**
  - Migrations: `2025-10-03-v3.4-rubric-gameplan-commonapp.sql`, `2025-10-03-v3.4.1-dedup-normalization-fixes.sql`

#### ✅ Universal Readiness Scoring (v3.7) **NEW**
- **Status:** Production (Phase 1 - Feature Extraction)
- **Date:** 2025-10-03
- **Description:** Feature-based readiness scoring with composable architecture (features → factors → overall score) and what-if simulation engine
- **Tables:**
  - `feature_defs` - Feature registry (14 features across 6 domains)
  - `factor_defs` - Factor definitions (5 factors: academic_excellence, distinction, leadership, summer_programs, narrative_strength)
  - `factor_feature_map` - Feature-to-factor mappings with weight_pct
  - `feature_snapshots` - Temporal snapshots for historical tracking
  - `feature_snapshot_values` - Snapshot feature values with evidence
  - `action_defs` - What-if action catalog (raise_sat_to, win_award_tier, etc.)
  - `action_feature_effects` - Action effect models
- **Feature Extraction Views:**
  - `v_features_testing` - SAT/ACT from sat_timeline_enum
  - `v_features_awards` - Award counts by tier from v_awards_won
  - `v_features_ecs` - Leadership roles + scale signals from kb_items
  - `v_features_narrative` - Essay completeness from kb_items
  - `v_features_academics` - GPA + AP courses from academic tables
  - `v_features_programs` - Summer program acceptances from v_programs_final
  - `v_features_all` - UNION ALL unified feature view
- **Intents:** readiness.now, readiness.progress, readiness.drivers, readiness.whatif.sat, readiness.whatif.award, readiness.next_moves
- **Resolvers:**
  - `readinessNow()` - Current profile with 11 features grouped by domain
  - `readinessProgress()` - Historical snapshot timeline
  - `readinessDrivers()` - Feature breakdown by domain
  - `readinessWhatIfSAT()` - Simulate SAT score changes
  - `readinessWhatIfAward()` - Simulate award wins by tier
  - `readinessNextMoves()` - Strategic recommendations
- **Design Patterns:**
  - **Composability**: Features → Factors → Overall Score (modular layers)
  - **Transparency**: Full feature breakdown shows why score is what it is
  - **Temporal Support**: Feature snapshots enable historical trend analysis
  - **Rubric Flexibility**: Same schema supports multiple rubrics (ivyplus_v1, state_schools_v1, etc.)
  - **Evidence Chain**: Each feature links back to source (chip_id, chip_table, source_id)
- **Testing Results:**
  - ✅ 11 features extracted for huda-2025 (SAT 1530, 6 national awards, 5 leadership roles, 3.97 GPA, etc.)
  - ✅ readiness.now, readiness.drivers, readiness.next_moves working
  - ⚠️ readiness.whatif.* parameter extraction needs LLM enhancement
- **Known Limitations:**
  - Scoring views (v_factor_scores_current, v_ivyready_current) planned for v3.7.2
  - What-if engine views (v_action_ivyready_delta) planned for v3.7.3
  - No historical snapshots captured yet (manual snapshot creation needed)
  - Parameter extraction from natural language queries needs enhancement
- **References:**
  - Migrations: `2025-10-03-v3.7-universal-readiness-schema.sql`, `2025-10-03-v3.7.1-feature-views-final.sql`
  - Spec: `docs/DB_ARCHITECTURE_SPEC.md#v37-universal-readiness-scoring`
  - Spec: `docs/DB_ARCHITECTURE_SPEC.md#admissions-rubric-core-tables`

#### ✅ Common App Template (v3.4/v3.4.1)
- **Status:** Production
- **Date:** 2025-10-03
- **Description:** Normalized Common App submission views with deduplication
- **Views:**
  - `v_commonapp_activities` - Activities (max 10) from v_ecs_final with near-duplicate collapse
  - `v_commonapp_honors` - Honors/Awards (max 5) from outcomes with null filtering
  - `v_commonapp_submitted` - Consolidated submission (activities + honors + academics)
- **Functions:**
  - `canon_label(text)` - Canonicalize labels for deduplication
- **Intent:** application.final
- **Resolver:** commonAppSubmitted(pg, studentId)
- **References:**
  - Migrations: `2025-10-03-v3.4-rubric-gameplan-commonapp.sql`, `2025-10-03-v3.4.1-dedup-normalization-fixes.sql`
  - Spec: `docs/DB_ARCHITECTURE_SPEC.md#common-app-normalization-views`

### Enumeration System

#### ✅ Awards Enumeration
- **Status:** Production
- **Date:** 2025-10-03
- **Views:**
  - `v_awards_initial` - Early planning awards (SRC-GAMEPLAN-*)
  - `v_awards_won` - Awards actually won (outcomes)
  - `v_awards_progression` - All awards over time
- **Resolver:** `services/jenny-api/src/services/resolvers.ts:awardsList()`
- **Queries Supported:**
  - "initial awards list" / "what awards did I plan?"
  - "final awards list" / "which awards did I win?"
  - "awards progression" / "show me my awards timeline"
- **References:**
  - Migration: `2025-10-03-canonical-targets-enumerations.sql`
  - Data: `services/jenny-api/src/data/awards_targets.csv`

#### ✅ ECs/Activities Enumeration
- **Status:** Production
- **Date:** 2025-10-03
- **Views:**
  - `v_ecs_initial` - Early planning activities
  - `v_ecs_final` - Submitted activities (CommonApp)
  - `v_ecs_progression` - Complete timeline
- **Resolver:** `services/jenny-api/src/services/resolvers.ts:ecsList()`
- **Queries Supported:**
  - "initial ECs list" / "what activities did I plan?"
  - "final ECs list" / "which ECs did I submit?"
  - "ECs progression" / "show my activities timeline"
- **References:**
  - Migration: `2025-10-03-canonical-targets-enumerations.sql`
  - Data: `services/jenny-api/src/data/ecs_final_huda.csv`

#### ✅ Summer Programs Enumeration
- **Status:** Production
- **Date:** 2025-10-03
- **Views:**
  - `v_programs_initial` - Early exploration
  - `v_programs_final` - Submitted applications
  - `v_programs_decisions` - Admission outcomes
- **Resolver:** `services/jenny-api/src/services/resolvers.ts:programsList()`
- **Queries Supported:**
  - "initial programs list"
  - "final programs list" / "which programs did I apply to?"
  - "program decisions" / "which programs accepted me?"
- **References:**
  - Migration: `2025-10-03-canonical-targets-enumerations.sql`
  - Data: `services/jenny-api/src/data/programs_*.csv`

#### ✅ Narrative Enumeration
- **Status:** Production
- **Date:** 2025-10-03
- **Views:**
  - `v_narrative_initial` - Early drafts (GamePlan)
  - `v_narrative_final` - Submitted essays (CommonApp)
- **Resolver:** `services/jenny-api/src/services/resolvers.ts:narrativeInitial(), narrativeFinal()`
- **Queries Supported:**
  - "initial narrative" / "show my early essay drafts"
  - "final narrative" / "show my submitted essays"
- **Categories:** Personal Statement, Supplemental Essays, Short Responses
- **References:**
  - Migration: `2025-10-03-canonical-targets-enumerations.sql`

### Academics System (v3.3)

#### ✅ SAT Timeline Enumeration
- **Status:** Production
- **Date:** 2025-10-03
- **Views:**
  - `v_sat_enum_first` - First SAT score
  - `v_sat_enum_latest` - Most recent SAT
  - `v_sat_enum_progression` - All SAT attempts
- **Resolver:** `services/jenny-api/src/services/resolvers.ts:academicsSAT()`
- **Queries Supported:**
  - "first SAT" / "what was my first SAT score?"
  - "latest SAT" / "what's my current SAT?"
  - "SAT progression" / "show all my SAT scores"
  - "nth SAT" / "what was my second SAT score?"
- **References:**
  - Migration: `2025-10-03-canonical-targets-enumerations.sql`
  - Release: `docs/releases/V3.3_ACADEMICS_ENHANCEMENT.md`

#### ✅ GPA Timeline
- **Status:** Production
- **Date:** 2025-10-03
- **Tables:** `academic_gpa`
- **View:** `v_gpa_timeline`
- **Resolver:** `services/jenny-api/src/services/resolvers.ts:academicsGPA()`
- **Scopes Supported:** Cumulative, Junior Year, Senior Year (Fall/Spring)
- **Queries Supported:**
  - "latest GPA" / "what's my current GPA?"
  - "GPA timeline" / "show my GPA history"
- **References:**
  - Migration: `2025-10-03-canonical-targets-enumerations.sql`
  - Release: `docs/releases/V3.3_ACADEMICS_ENHANCEMENT.md`

#### ✅ Transcript Views
- **Status:** Production
- **Date:** 2025-10-03
- **Tables:** `academic_terms`, `academic_courses`, `academic_grades`
- **Views:**
  - `v_transcript_initial` - Early planning courses
  - `v_transcript_final` - Official transcript
- **Resolver:** `services/jenny-api/src/services/resolvers.ts:academicsTranscript()`
- **Queries Supported:**
  - "initial transcript" / "show my planned courses"
  - "final transcript" / "show my official transcript"
- **References:**
  - Migration: `2025-10-03-canonical-targets-enumerations.sql`

#### ✅ Academics Summary
- **Status:** Production
- **Date:** 2025-10-03
- **Description:** Combined view of GPA + SAT + Grades
- **Resolver:** `services/jenny-api/src/services/resolvers.ts:academicsSummary()`
- **Queries Supported:**
  - "my academics" / "academic summary"
  - "latest academic stats"
- **Metrics:** GPA (weighted/unweighted), SAT (total/sections), grade trends
- **References:**
  - Release: `docs/releases/V3.3_ACADEMICS_ENHANCEMENT.md`

### RAG System

#### ✅ Hybrid Search (v2.0)
- **Status:** Production
- **Date:** 2025-09-30
- **Description:** Combined vector + BM25 search with reranking
- **Pipeline:**
  1. Vector search (Pinecone) - top 50 candidates
  2. BM25 search (in-memory) - top 50 candidates
  3. Reciprocal Rank Fusion (k=60)
  4. Cohere reranking - top 10 results
- **Implementation:** `services/jenny-api/src/retrieval/hybridSearch.ts`
- **References:**
  - Spec: `docs/MASTER_TECHNICAL_SPEC.md#hybrid-search`

#### ✅ Fine-Tuned Jenny Model (jenny-v1)
- **Status:** Production
- **Date:** 2025-09-23
- **Description:** GPT-4 fine-tuned on 1,000 coaching examples
- **Training Data:**
  - 93 weeks of authentic coaching sessions
  - 21,712 conversation turns processed
  - 27+ intelligence layers
  - 11 coaching topics
- **Signal Scoring:** JTBD, Planning, Metrics, Fit/Adaptive
- **Environment Variable:** `JENNY_MODEL_ID`
- **References:**
  - Release: `docs/releases/ALPHA-1.0-RELEASE-NOTES.md`
  - Spec: `docs/MASTER_TECHNICAL_SPEC.md#fine-tuned-jenny-model`
  - Dataset Builder: `packages/scripts/src/finetune/build_finetune_dataset.ts`

### Observability & Tracing

#### ✅ Query Trace System (v3.2)
- **Status:** Production
- **Date:** 2025-10-02
- **Description:** End-to-end query execution tracing
- **Tables:** `query_traces`, `trace_events`
- **Features:**
  - Component-level tracing (orchestrator, resolver, retrieval, composer)
  - API call tracking (provider, method, request/response)
  - Duration metrics (component-level, total)
  - UI trace viewer integration
- **Implementation:**
  - Server: `services/jenny-api/src/server-utfa.ts` (trace storage)
  - UI: `apps/test-chat-ui/app/TracePanel.tsx`
- **References:**
  - Migration: `2025-10-02-query-traces-v2.sql`
  - Spec: `docs/MASTER_TECHNICAL_SPEC.md#observability--monitoring`

#### ✅ Unified Logger (v3.0)
- **Status:** Production
- **Date:** 2025-09-30
- **Description:** Structured logging across all services
- **Package:** `packages/observability`
- **Features:**
  - Component-based logger factory
  - Event-based structured logging
  - Pino-based JSON output
  - Automatic context propagation
- **Usage:**
  ```typescript
  import { createLogger } from '@observability/unified-logger';
  const log = createLogger('component-name');
  log.event('operation_name', { metadata });
  ```
- **References:**
  - Implementation: `packages/observability/src/unified-logger.ts`

---

## Recent Updates (Last 30 Days)

### 2025-10-07 12:00: KB v5.5 Intel Chips Architecture + Production QA Suite
- **Problem Solved**: No production-ready knowledge base architecture with systematic quality validation, drift monitoring, and rollback capability
- **Solution**: Three-family Intel Chips Architecture (1,009 vectors across Sessions/Execution/iMessage) with comprehensive 8-component QA suite and CI/CD automation
- **Three-Family Intel Chips Architecture**:
  - **Sessions Chips (877 vectors)**: 93 weeks of coaching sessions, 10 chip types (Framework, Strategy, Tactic, Result, Silver, Trust, Insight, Channel, Adaptation, Relatability), W024-FRAMEWORK-001 IDs, Namespace: `KBv6_2025-10-06_v1.0`
  - **Execution Chips (46 vectors)**: Cross-week execution frameworks (Assessment→Acceptance Ladder, Outcome Correlation Map, etc.), W000 prefix to avoid collision, Namespace: `KBv6_2025-10-06_v1.0` (shared with sessions for unified search)
  - **iMessage Chips (40 vectors)**: Micro-interaction patterns from Jenny-Huda texts, 5 chip types (Message_Template, Tone_Cue, Escalation_Pattern, Micro_Tactic, Turnaround_Case), 16 situation tags (deadline_crunch, confidence_reset, parent_pushback, etc.), Namespace: `KBv6_iMessage_2025-10-07_v1.0` (isolated for precision)
- **Upgraded Embeddings**:
  - Previous: `text-embedding-3-small` (512 dims)
  - New: `text-embedding-3-large` (3072 dims)
  - Benefits: +11% on retrieval benchmarks, better cross-lingual understanding, improved domain terminology handling
- **Federated Search**:
  - Strategy: Pool results from multiple namespaces, rerank by similarity score
  - Filter options: `source: 'both'` (all), `source: 'sessions'` (sessions+exec), `source: 'imessage'` (iMessage only)
  - Performance: Single namespace ~250ms P90, Federated (both) ~450ms P90
  - Implementation: `services/jenny-api/src/services/kb_resolver.ts`
- **Comprehensive QA Suite (8 Components)**:
  - **Smoke Tests** (10s): Fast 2-query validation (sessions "Naviance scattergram" 0.520, iMessage "thank you note" 0.489), blocks merge if fails
  - **Vector Counts** (5s): Validates 923 sessions+exec + 40 iMessage counts
  - **Precision Probes** (3-5m): 25 golden queries (16 sessions, 9 iMessage), Top-1 ≥ 0.50 on 78% probes, Top-3 100% coverage
  - **Federated Search Check** (2m): Validates namespace isolation, no filter leaks
  - **Drift Watch** (1m): Count monitoring with ±2% threshold, generates drift reports (INGEST_NEW_CHIPS, DELETION_OR_CLEANUP, NO_CHANGE)
  - **Deployment Version Check** (30s): Validates against manifest (namespace names, vector counts ±5%, embedding model, schema version)
  - **Structural QA** (5m): Duplicates detection, outliers identification, conflict analysis
  - **Backup & Snapshot** (variable): Timestamped snapshots of vector IDs + metadata for rollback
- **Production Hardening Enhancements**:
  - **Parameterized Thresholds**: All QA thresholds configurable via environment (TOP1_MIN=0.50, TOP1_MIN_IMSG=0.48, TOP3_COVERAGE=1.00, OUTLIER_MAX=0.02, DRIFT_MAX=0.02)
  - **Drift Watch with Baselines**: Monitors count changes, alerts on >2% drift, creates initial baseline if none exists
  - **Deployment Manifest**: Version-controlled expected state (`tools/qa/deployment_manifest.json`)
  - **CI/CD Integration**: GitHub Actions (`.github/workflows/kb-qa.yml`) - smoke tests on PRs block merge, nightly full suite with 30-day artifact retention
  - **Backup Utility**: Exports vector IDs + metadata samples, timestamped snapshots for rollback
- **New Ingestion Scripts**:
  - `tools/ingest/embed_kb_v6_to_v8.py` - Sessions+Exec embedder (to shared namespace)
  - `tools/ingest/embed_imsg_chips_v3.py` - iMessage embedder (to isolated namespace)
  - `tools/ingest/transform_imsg_chips_v3.py` - Add situation_tag, new chip types
  - `tools/ingest/validate_kb_v6_chips.py` - KB v6 schema validator
- **New QA Scripts (16 files total)**:
  - `tools/qa/run_qa_suite.sh` - Full QA suite orchestrator with parameterized thresholds
  - `tools/qa/smoke_tests.sh` - Fast 2-query validation
  - `tools/qa/check_vector_counts.py` - Count validation
  - `tools/qa/precision_probes_test.py` - Golden query testing with family-specific thresholds
  - `tools/qa/check_federated_search.py` - Namespace isolation validation
  - `tools/qa/check_drift.py` - Drift detection with baseline tracking
  - `tools/qa/check_deployment_version.py` - Manifest validation
  - `tools/qa/backup_namespace.py` - Snapshot utility
  - `tools/qa/check_metadata_integrity.py` - Metadata field checks
  - `tools/qa/structural_qa.py` - Duplicates/outliers/conflicts
  - `tools/qa/precision_probes.json` - 9 golden queries (initial)
  - `tools/qa/precision_probes_v2.json` - 25 golden queries (expanded)
  - `tools/qa/deployment_manifest.json` - Expected deployment state
  - `tools/qa/README.md`, `QUICKSTART.md`, `OPERATIONAL_CHECKLIST.md` - Complete documentation
- **CI/CD Workflow**:
  - File: `.github/workflows/kb-qa.yml`
  - Triggers: PRs touching KB files, Nightly (06:00 UTC), Manual
  - Jobs: smoke-tests (PR + nightly), deployment-version-check (PR), full-qa-suite (nightly), drift-watch (nightly)
  - Artifacts: QA results (30-day retention), drift reports (90-day retention)
  - Auto-comment on PR failures with artifact links
- **Production Deployment Results**:
  - Index: `jenny-v3-3072-093025` (AWS us-east-1, 3072 dims, cosine)
  - Sessions+Exec Namespace: `KBv6_2025-10-06_v1.0` (923 vectors: 877 sessions + 46 exec)
  - iMessage Namespace: `KBv6_iMessage_2025-10-07_v1.0` (40 vectors)
  - Embedding Model: text-embedding-3-large (3072d)
  - Schema Version: v6.0
  - Smoke Tests: ✅ PASS (Sessions 0.520 ≥ 0.40, iMessage 0.489 ≥ 0.35)
  - Vector Counts: ✅ 923 + 40
- **Breaking Changes**:
  - Namespace names changed: No standardized naming → `KBv6_2025-10-06_v1.0` (sessions+exec) + `KBv6_iMessage_2025-10-07_v1.0` (iMessage)
  - Embedding model upgraded: `text-embedding-3-small` (512 dims) → `text-embedding-3-large` (3072 dims) - requires re-embedding
  - New metadata fields: `chip_family` (required: "session", "exec", "imessage"), `situation_tag` (iMessage only: 16 tags)
- **Migration Required**: Re-embed all chips with new model (cannot mix models in same index)
- **Rollback Procedure**: Backup snapshots available in `data/kb_intel_chips/snapshots/`, revert code changes via git, update namespace references
- **Operational Procedures**:
  - **Daily**: Run smoke tests before deploy (`./tools/qa/smoke_tests.sh`), check deployment version
  - **Weekly**: Review precision probe trends, check drift reports, archive old QA runs (>90 days)
  - **Before Re-Embed**: Backup namespaces, note baseline counts, document expected changes
  - **After Re-Embed**: Verify deployment version, run smoke tests, check drift matches expected delta, update manifest if permanent
- **Files Changed**:
  - NEW: `tools/ingest/embed_kb_v6_to_v8.py`, `embed_imsg_chips_v3.py`, `transform_imsg_chips_v3.py`, `validate_kb_v6_chips.py`
  - NEW: 16 QA files in `tools/qa/` (scripts, configs, docs)
  - NEW: `.github/workflows/kb-qa.yml`
  - NEW: `data/kb_intel_chips/` directory structure (chips, exec-chips, imsg-chips, qa_runs, snapshots)
  - NEW: `docs/KB_V5_5_RELEASE_NOTES.md` (comprehensive 500+ line release notes)
  - UPDATED: `docs/MASTER_TECHNICAL_SPEC.md` (added KB v5.5 section, ~400 lines)
  - UPDATED: `docs/DB_ARCHITECTURE_SPEC.md` (added Vector Database v5.5 section, ~250 lines)
  - UPDATED: `docs/FEATURES_AND_UPDATES.md` (this file)
- **Testing**: ✅ Smoke tests PASS, ✅ Vector counts 923+40, ✅ CI/CD configured, ✅ Docs complete, ✅ Backups ready, ✅ Drift watch baseline tracking, ✅ Federated search validated, ✅ Deployment manifest v1.0
- **Impact**: Production-ready KB with 1,009 high-density intel chips across 3 families, automated quality gates prevent regressions, drift monitoring catches unexpected changes, rollback capability for failed re-embeds, CI/CD ensures no broken deployments, comprehensive documentation for operations team
- **References**:
  - Release Notes: `docs/KB_V5_5_RELEASE_NOTES.md`
  - Master Spec: `docs/MASTER_TECHNICAL_SPEC.md` (KB v5.5 section)
  - DB Spec: `docs/DB_ARCHITECTURE_SPEC.md` (Vector Database v5.5 section)
  - QA Suite README: `tools/qa/README.md`
  - Operational Checklist: `tools/qa/OPERATIONAL_CHECKLIST.md`
  - Quickstart: `tools/qa/QUICKSTART.md`

### 2025-10-04 23:00: KB v5.4 Production Promotion (Metadata Enrichment + Blue/Green Deployment)
- **Problem Solved**: Quality gates failing (0/4 PASS) due to missing metadata fields in v5.3 schema; no safe rollback mechanism for Pinecone deployments
- **Solution**: LLM-based metadata enrichment with blue/green namespace deployment for zero-downtime migrations
- **LLM Metadata Enrichment**:
  - gpt-4o-mini tags chips with structured metadata: award, activity, framework, coach_move, phase, week, tags, confidence
  - Confidence gating: Only enrich chips with ≥0.6 confidence scores
  - Minimum quality filter: Skip chips with <120 characters
  - Pinecone in-place updates: Enrich metadata without re-embedding vectors
  - Optional DB write-back: Sync enriched metadata to PostgreSQL for analytics parity (fills blanks only, never overwrites)
- **Blue/Green Deployment**:
  - Namespace strategy: `kb_v5_3` (BLUE, legacy) → `kb_v5_4` (GREEN, active)
  - Safe promotion: Update `.env.local` with `PINECONE_NAMESPACE=kb_v5_4`, restart API
  - Instant rollback: Change namespace back to `kb_v5_3` and restart
  - Quality monitoring: Daily audit script validates 4 gold queries during bake period
- **Production Deployment Results**:
  - Namespace: `kb_v5_4` (GREEN, active)
  - Index: `jenny-v3-3072-093025` (AWS us-east-1, 3072 dims)
  - Vectors: 122 chips exported
  - Enriched: 112 chips with LLM metadata
  - Quality Gates: **4/4 PASS** ✅
    - NCWIT coaching: 10 hits (confidence 0.9)
    - 168 framework: 10 hits (confidence 0.9)
    - Empowering AI growth: 10 hits (confidence 0.9)
    - Essay surgery move: 10 hits (confidence 0.9)
  - Metadata Coverage: award ✓, activity ✓, framework ✓, coach_move ✓, phase ✓, week ✓, tags (1-5 per chip) ✓
  - Confidence Scores: 0.9-1.0 (exceeds 0.6 target by 50%)
- **New Scripts**:
  - `enrich_metadata.py` - LLM metadata enrichment with DB write-back (fills blanks only)
  - `audit_quality.py` - Quality gate validation with 4 gold queries
  - `sample_enriched.py` - Random sampling for quality spot-checks
  - `pinecone_audit_and_cleanup.py` - Namespace auditing and safe deletion
- **Jenny API Updates**:
  - `.env.local`: Added `PINECONE_NAMESPACE=kb_v5_4` for namespace activation
  - Fixed duplicate `kbSearch` export in `resolvers.ts` (removed old stub)
  - KB resolver still using FAISS (Pinecone integration deferred to next release)
- **Files Changed**:
  - NEW: `tools/ingest/enrich_metadata.py` (LLM enrichment + DB write-back)
  - NEW: `tools/ingest/audit_quality.py` (quality gates)
  - NEW: `tools/ingest/sample_enriched.py` (spot-check sampling with vector queries)
  - NEW: `tools/ingest/pinecone_audit_and_cleanup.py` (namespace management)
  - NEW: `docs/KB_V54_PROMOTION_GUIDE.md` (complete promotion/rollback guide)
  - UPDATED: `services/jenny-api/.env.local` (activated kb_v5_4 namespace)
  - FIXED: `services/jenny-api/src/services/resolvers.ts` (removed duplicate kbSearch)
- **Testing**: ✅ Quality audit 4/4 PASS, ✅ Enrichment spot-checks validated, ✅ Jenny API restarted successfully
- **Migration Required**: No SQL migrations (Pinecone-only updates)
- **Impact**: Production-ready KB with metadata-rich filtering, safe blue/green deployments with instant rollback, 4/4 quality gates passing, foundation for intent-driven KB queries like "how did Jenny help me win NCWIT?" with award-filtered retrieval
- **References**:
  - Promotion Guide: `docs/KB_V54_PROMOTION_GUIDE.md`
  - Runbook: `docs/KB_INGESTION_V54_RUNBOOK.md`

### 2025-10-04 21:00: KB + LLM Intel Ingestion - Schema Foundation (v5.0)
- **Problem Solved**: No systematic way to store and query coach intelligence (tactics, frameworks, micro-moments, success paths) extracted from Drive INTEL JSONs
- **Scope**: Schema foundation only; ingestion scripts, FAISS indexing, and API integration deferred to v5.1+
- **7 Chip Types**: JTBD, Tactic, Micro-moment, Framework, Reflection, Success Path, Style
- **New Tables**:
  - **kb_docs**: Source document registry with SHA256 deduplication (doc_id PK, drive_file_id, filename, student_id, domain, dt_anchor, sha256)
  - **kb_chips**: Normalized intel chips (chip_id PK via deterministic hash, doc_id FK, student_id, chip_type, title, summary, content_json JSONB, tags array, started_at, ended_at)
  - **kb_chip_links**: Cross-references to vitals/awards/apps (chip_id FK, link_type, link_key) - e.g., link "NCWIT success_path" to award "NCWIT", EC "STEM Outreach"
  - **kb_embeddings**: Embeddings as JSONB for FAISS external index (chip_id PK FK, embed_model, embedding_dims, embedding_json) - pgvector unavailable in postgresql@14
  - **kb_scan_cursors**: Incremental sync watermark (source_system PK, last_sync_ts, last_cursor)
- **Views**: `v_kb_recent` (joins kb_chips + kb_docs, ordered by temporal anchor)
- **Design Rationale**:
  - **Facts-First + KB-First**: Atomic chips extracted from Claude-normalized intel JSONs (no raw PDF parsing needed)
  - **Coach-Grade Reasoning**: Captures tactics ("push essay deadline 2 weeks early"), micro-moments ("TikTok intervention after 168 framework"), success paths ("NCWIT: plan → draft → review → submit → win")
  - **Future-Proof**: Schema supports Contributor Mode (coaches/students can submit their own tactics), autonomous planning (Jenny searches "JTBD + success_path + tactic" to propose next steps)
- **Chip Type Structures**:
  - **jtbd**: `{ "ask": "...", "blocking_issue": "...", "desired_outcome": "...", "deadline": "date?" }`
  - **tactic**: `{ "name":"...", "goal":"...", "steps":[...], "evidence":[...], "success_criteria":[...] }`
  - **micro_moment**: `{ "situation":"...", "coach_message":"...", "student_message":"...", "action_taken":"..." }`
  - **framework**: `{ "name":"168", "components":[...], "when_to_use":"...", "expected_effect":"..." }`
  - **reflection**: `{ "who":"student|coach", "theme":"...", "insight":"...", "next_step":"..." }`
  - **success_path**: `{ "artifact":"NCWIT", "phase_chain":["plan","draft","review","submit","win"] }`
  - **style**: `{ "tone":"...", "signature_moves":[...], "dos":[...], "donts":[...] }`
- **Files Changed**:
  - NEW: `apps/api/db/migrations/2025-10-04-v5.0-kb-intel-ingestion.sql` (KB schema)
- **Testing**: ✅ Schema created successfully, ✅ Idempotent migration, ✅ `SELECT * FROM v_kb_recent` works (no data yet)
- **What's Deferred to v5.1+**: Python Drive ingestion script (500+ lines), FAISS vector index builder, KB resolver API integration, end-to-end testing with real INTEL JSONs, CSV/JSONL artifact generation
- **Migration Required**: Yes
- **Impact**: Foundation for autonomous coach reasoning - Jenny will be able to answer "What tactics did you use to win NCWIT?", "Show me the exact micro-moment when TikTok time dropped", "What's the 168 framework playbook for stuck essays?"

### 2025-10-04 20:00: UAPX Guardrails - Attending/Decided Robustness (v4.6.2c)
- **Problem Solved**: Query "which college did I finally decide to go?" was returning full college list (28 colleges) instead of attending college only, due to LLM filter extraction failing on "decide to go", "chose to attend", "enroll at" phrasings
- **Root Cause**: v4.6.2b guardrails had limited synonym coverage for attending intent detection, missing common phrasings like "decide to go", "choose to attend", "enroll at/in"
- **Solution**: Expanded synonym coverage + regex patterns + resolver safety checks to ensure all attending/decided phrasings force `attending=true` filter
- **Enhanced Components**:
  - **Guardrail Synonyms**: Added 10 new attending synonyms (`decided to go`, `decide to go`, `decided on`, `decided to attend`, `choose to attend`, `chose to attend`, `enroll at`, `enroll in`, `final college choice`, `final decision`)
  - **Regex Pattern**: Added `/\b(decid(?:e|ed)\s+(to\s+)?(go|attend|enroll|matriculate)|final\s+(choice|decision))\b/` for complex multi-word phrasings
  - **Resolver Safety Check**: Added "last line of defense" regex in `collegeList` resolver to detect attending/decided keywords even if guardrails missed them, forces `attending=true` filter with observability logging
  - **Training Examples**: Added 6 new few-shot examples with `attending: true` filter ("which college am I attending?", "which college did I finally decide to go?", "which school did I choose to attend?", "where am I going to college?", "show my final college choice", "what college did I enroll at?")
  - **Unit Tests**: Added 5 new test cases in `collegeFilters.spec.ts` for decided/chosen/enroll phrasings
- **Files Changed**:
  - ENHANCED: `services/jenny-api/src/intent/extractors/guardrails.ts` (expanded attending synonyms, added regex patterns)
  - ENHANCED: `services/jenny-api/src/services/resolvers.ts` (resolver safety checks with userMessage parameter)
  - ENHANCED: `services/jenny-api/src/router/intentRouter.ts` (pass message to collegeList resolver)
  - ENHANCED: `services/jenny-api/src/intent/college_scholarship_intents.json` (6 new attending examples)
  - ENHANCED: `services/jenny-api/test/collegeFilters.spec.ts` (5 new attending tests)
- **Testing**: ✅ "which college did I finally decide to go?" → `**Attending (1)** 1. UIUC 🎓`, ✅ "which school did I choose to attend?" → `**Attending (1)** 1. UIUC 🎓`, ✅ "what college did I enroll at?" → `**Attending (1)** 1. UIUC 🎓`, ✅ "show my final college choice" → `**Attending (1)** 1. UIUC 🎓`, ✅ "where am I going to college?" → `**Attending (1)** 1. UIUC 🎓`
- **Impact**: Robust attending detection across all phrasings (present/past tense, synonyms, multi-word), double-layer protection (guardrails + resolver safety), improved answer quality (1 line vs 28 colleges)

### 2025-10-04 18:00: UAPX Guardrails - Deterministic Filter Extraction (v4.6.2b)
- **Problem Solved**: LLM correctly classified intents (`college.list`, `scholarship.list`) but failed to extract filters reliably, causing queries like "which college am I attending?" to show all 28 colleges instead of just the attending one
- **Solution**: Deterministic guardrail layer using regex patterns and synonym matching to fill missing/invalid filters post-LLM classification
- **Guardrail Architecture**:
  - **extractCollegeFiltersGuardrail()**: Decision result (accepted/admitted/got in → "Accepted", rejected/denied → "Rejected", waitlisted → "Waitlisted", deferred → "Deferred"), Category (reach → "Reach", match → "Match", safety → "Safety"), Plan (ea/early action → "EA"), Attending ("attending"/"going to" → attending: true)
  - **extractScholarshipFiltersGuardrail()**: Status (accepted/received/won → "Accepted", applied/pending/waiting → "Applied", rejected → "Rejected")
- **Integration Strategy**:
  - Post-LLM classification, entity-aware routing (college.list → college guardrails, scholarship.list → scholarship guardrails)
  - Merge strategy: Respect existing LLM filters if valid, only fill missing/invalid ones
  - Observability: Logs original vs enhanced filters for debugging
- **Answer Shaping**: When `filters.attending === true`, show only attending college (1 line: "**Attending (1)** \n 1. UIUC 🎓"), suppress other groups
- **Updated Training**: College (12 balanced examples), Scholarship (6 balanced examples), removed redundant examples
- **Unit Tests**: 17 tests (12 college, 5 scholarship) verifying deterministic extraction independent of LLM
- **Files Changed**:
  - NEW: `services/jenny-api/src/intent/extractors/guardrails.ts` (guardrail extractors)
  - NEW: `services/jenny-api/test/collegeFilters.spec.ts` (unit tests)
  - ENHANCED: `services/jenny-api/src/router/intentRouter.ts` (guardrail integration)
  - ENHANCED: `services/jenny-api/src/services/resolvers.ts` (answer shaping)
- **Testing**: ✅ "which colleges did I actually get into?" → decision_result: "Accepted", ✅ "which college am I attending?" → attending: true + single line output, ✅ "which reach schools waitlisted me?" → category: "Reach" + decision_result: "Waitlisted"
- **Impact**: Deterministic filters eliminate LLM extraction failures, entity-agnostic pattern extends to all list/what-if intents, focused answer quality (attending shows 1 line not 28)

### 2025-10-04 16:00: College List + Scholarship + Readiness Correlation (v4.6.1)
- **Problem Solved**: No systematic way to track college applications, outcomes, and scholarship opportunities with readiness correlation for predictive analytics
- **Solution**: Complete normalized schema for college list and scholarships with readiness snapshot integration, supporting conversational queries and future ML modeling
- **New Schema Components**:
  - **college_list table**: Canonical representation of every college a student applies to
    - Fields: college_id, student_id, college_name, bucket_category (Reach/Match/Safety), decision_plan (EA/ED/RD/REA), decision_result (Accepted/Rejected/Waitlisted), program, supplements, location, acceptance_rate, interview_status, ivyready_score_at_submit
    - 28 colleges seeded for huda-2025 (18 Reach, 7 Match, 3 Safety)
  - **scholarships table**: Complete tracking of all scholarships applied/received
    - Fields: scholarship_id, student_id, scholarship_name, sponsor_org, amount_usd, application_status (Applied/Accepted/Rejected/Pending), decision_date, notes
    - 29 scholarships seeded for huda-2025 (3 accepted: $12.5K total, 26 pending)
  - **v_college_readiness_correlation view**: Readiness correlation analysis
    - Correlates student features (SAT, GPA, awards, ECs) with admission outcomes
    - Fields: acceptance_numeric (1.0=Accepted, 0.5=Waitlisted, 0=Rejected), relative_strength (feature_value/target_value)
    - Enables predictive modeling: `corr(relative_strength, acceptance_numeric)` per domain
    - Joins: college_list, ivyready_snapshots, v_features_all, readiness_feature_weights
  - **v_scholarship_impact view**: Scholarship affordability and readiness impact
    - Fields: affordability_boost (amount_usd/1000), adjusted_readiness_score (overall_score + amount/5000)
    - Joins: scholarships, ivyready_snapshots
- **Conversational Intents Added**:
  - College queries: "Which colleges accepted me?", "Which match schools accepted me?", "Which reach schools waitlisted me?", "Which schools rejected me?", "Show me all my reach school outcomes", "Which safety schools did I get into?"
  - Scholarship queries: "Show me scholarships I received", "What scholarships am I waiting to hear back from?", "How much scholarship money did I receive?"
  - Readiness comparison: "Compare my readiness with schools that accepted me"
- **Huda-2025 Outcome Summary**:
  - Total Colleges: 28 (18 Reach, 7 Match, 3 Safety)
  - Accepted (8): UIUC 🎓 (attending - Data Science), USC, UC Irvine, UC Davis, UC Riverside, UC Santa Cruz, UNC Chapel Hill, Northeastern
  - Waitlisted (7): UC Berkeley, UC San Diego, NYU, CMU, Georgia Tech, Cal Poly SLO, Barnard
  - Rejected (11): Stanford, MIT, Harvard, Yale, UPenn, Columbia, Brown, Cornell, Duke, UT Austin, Northwestern
  - Attending: UIUC (Data Science)
  - Scholarships Accepted: UIUC Chancellor's ($10K), NCWIT Aspirations ($2.5K), Presidential Volunteer Service ($0)
  - Total Scholarship Value: $12,500
- **Future Expansion Hooks**:
  - v_college_predict_acceptance: Machine learning model training (logistic regression on readiness + outcomes)
  - v_college_outcome_factor: Qualitative factors (essays, EC depth) for hybrid analysis
  - v_scholarship_impact_history: Longitudinal scholarship gain vs readiness improvement
- **Files Changed**:
  - Migration: `2025-10-04-v4.6.1-college-scholarship-enablement.sql`
  - Data script: `v4.6.1_huda_college_scholarships.sql`
  - Intents: `services/jenny-api/src/intent/college_scholarship_intents.json`
  - CSV exports: `data/kbase/00-MasterProgramLogs/derived_college_list.csv`, `derived_scholarships.csv`
  - Docs: `docs/releases/v4.6.1_README.md`
- **Testing**: ✅ 28 colleges loaded, 29 scholarships loaded, correlation view verified, scholarship impact calculated, CSV exports generated
- **Impact**: Complete college outcomes and scholarship tracking system with readiness correlation, enabling predictive analytics and conversational intelligence for admissions outcomes

### 2025-10-04 14:40: Universal Readiness Intelligence - Hotfix (v3.9.1)
- **Problem Solved**: Three critical bugs in v3.9 initial release
- **Fixes Applied**:
  1. **Intent Routing Fix**: "which one thing would boost me most?" was routing to `readiness.next_moves` instead of `readiness.boost.max`
     - Root cause: Conflicting training example in `readiness.next_moves` ("what will have the biggest impact on my readiness?")
     - Solution: Removed conflicting example, added 2 stronger boost.max examples with 0.98 confidence
  2. **SQL Reserved Keywords**: Views using `rank` and `when` as column aliases caused syntax errors
     - Root cause: `rank` and `when` are PostgreSQL reserved keywords
     - Solution: Renamed `rank` → `gap_rank`, `when` → `recommended_window` in all views and resolvers
  3. **Type Safety**: `.toFixed()` called on PostgreSQL string values caused "not a function" errors
     - Root cause: PostgreSQL returns numeric values as strings in node-postgres
     - Solution: Added `num()` helper function for safe number coercion, updated all resolvers
- **Files Changed**:
  - `intentRouter.ts`: Removed conflicting next_moves example, stronger boost.max patterns
  - `resolvers.ts`: Added num() helper, updated all 4 readiness resolvers
  - SQL views: Applied via psql (v_readiness_weakspots, v_readiness_top_priorities)
- **Testing**: All 3 queries validated:
  - ✅ "which one thing would boost me most?" → readiness.boost.max (confidence 0.98)
  - ✅ "how do I fix my weak spots?" → returns action plan without SQL errors
  - ✅ "how has my readiness changed?" → returns progression without type errors
- **References**:
  - Changes: `services/jenny-api/src/router/intentRouter.ts:287-290`
  - Changes: `services/jenny-api/src/services/resolvers.ts:1088-1353`

### 2025-10-04 10:30: Universal Readiness Intelligence Framework (v3.9)
- **Problem Solved**: Systematic answers to "What's my top weak spot?", "Which one thing can give me the biggest boost?", "How do I fix my weak spots?", "What should I prioritize this month?"
- **Solution**: Framework that reasons over readiness signals (scores, vitals, gaps, metrics) and returns confident, human-like next-best-actions with causal explanations (why/what/how/when)
- **New Schema Components**:
  - **readiness_feature_weights table**: Universal feature impact model (feature_key, domain, target_value, impact_coefficient)
  - **readiness_snapshots table**: Time-series readiness tracking (student_id, as_of, ivyready_score, top_drivers, weakspots, next_actions)
  - **v_features_all view**: Unified student features from facts_canonical, academic_gpa, kb_items, outcomes
  - **v_feature_gaps_current view**: Gap analysis (current vs target, gap_weighted = impact_coefficient * gap_raw)
  - **v_readiness_weakspots view**: Ranked weakspots (largest weighted gaps) per student
  - **v_readiness_top_priorities view**: Actionable priorities with why/what/how/when guidance, estimated lift
- **4 New Resolvers**:
  - **readinessWeakspots(pg, studentId, limit=3)**: "what's my top weak spot?" → Top 3 gaps with current/target/impact
  - **readinessBoostMax(pg, studentId)**: "which one thing can give me the biggest boost?" → Single highest-impact improvement with guidance
  - **readinessBoostPlan(pg, studentId, limit=5)**: "how do I fix my weak spots?" → Full action plan with 5 priorities and total lift
  - **readinessProgression(pg, studentId, limit=5)**: "how has my readiness improved?" → Historical snapshots with score changes (📈/📉/➡️)
- **4 New Intent Types**: readiness.weakspots.now, readiness.boost.max, readiness.boost.plan, readiness.progression
- **22 Training Examples**: 6 weakspots, 6 boost max, 6 boost plan, 4 progression (confidence 0.92-0.97)
- **Impact Model**: Testing (SAT 0.25, ACT 0.25), Academics (GPA 0.20, AP 0.10), Awards (National 0.20, Intl 0.15), ECs (Users 0.15, Funding 0.12, Hours 0.08), Narrative (Coherence 0.10, Uniqueness 0.08)
- **Huda Seed Data**: 6 EC-specific features (Empowering AI, Folklift, Synthoria), 3 historical snapshots (Aug/Sep/Oct 2024), weakspots (awards, EC scaling)
- **Migration**: `2025-10-04-v3.9-universal-readiness-intelligence.sql`, seed script: `seed-huda-readiness-features.sql`
- **Testing**: ✅ All 4 resolvers tested with natural language queries, gap analysis verified, progression timeline validated
- **Future Extensions**: Readiness forecast model (XGBoost), auto-capture snapshots weekly, coach session evidence traces, causal-impact analysis
- **Impact**: Real-Jenny-grade insight—interpret, prioritize, and simulate outcomes with full causal explanations. Enables strategic planning and progress tracking with confidence.

---

### 2025-10-04 09:00: Activity-Aware EC Extraction (v3.7.3)
- **Root Cause Fix**: Resolved "what if I only scaled the empowering AI to 100 users?" routing failure due to filler words and complex phrasing
- **12 Enhanced EC Patterns**:
  - Activity-aware scale: "scale(d) Empowering AI to 100 users", "scaled the empowering AI to 100 users"
  - Activity-aware reach: "reach 10k users on Synthoria"
  - Activity-aware double: "double users on Empowering AI", "2x users for Synthoria"
  - Activity-aware funds: "raise $25k for Folklift", "fundraise 10000 for Empowering AI"
  - Activity-aware hours: "increase hours per week to 12 on Filmmaker's Club"
  - Stopword handling: Robust to "the", "only", "my", articles, and fillers
  - Activity name capture: Regex `[\w'&.\- ]{2,60}` captures full names with punctuation
- **Fuzzy Activity Name Matching** (`utils/activityNormalizer.ts`):
  - 3-tier matching: Exact → Partial (substring) → Stopword-filtered
  - KB Items integration: Queries student's EC ledger for known activity names
  - Normalization examples: "the empowering ai" → "Empowering AI", "filmmaker's club" → "Filmmaker's Club"
  - Fallback: Title-cased cleaned name if no match
- **Multi-Metric whatIfEC Resolver**:
  - 4 metrics: `users`, `funds_usd`, `hours_per_week`, `leadership_roles`
  - Metric-specific scoring: Users (10k+ → +2.5pts), Funds ($25k+ → +3.0pts), Hours (15+ → +1.5pts), Leadership (3+ → +2.0pts)
  - Activity recognition: Normalizes and displays activity name in output and context chips
  - Current/target tracking: Shows current value, target value, and delta for transparency
- **Enhanced Intent Router Training**: 8 EC examples with activity names, confidence 0.93-0.96
- **Enhanced LLM Few-Shots**: 3 EC-specific examples with activity_name qualifiers
- **Testing**: ✅ All EC patterns tested with natural language queries, activity normalization verified
- **Impact:** Universal EC coverage with activity awareness, robust to natural language variations, multi-metric support, confidence boost for EC queries.

### 2025-10-04 08:30: Universal Action Parameter Extraction (v3.7.2)
- **UAPX Schema**: Universal domain-agnostic parameter extraction with 6 domains (testing, awards, ecs, academics, programs, narrative) and 7 actions (set, increase, decrease, win, admit, convert, complete)
- **3-Tier Extraction Pipeline**:
  - Tier 1 - Deterministic Rules (9 rules, ~90% coverage): SAT, Awards, ECs, GPA, Programs
  - Tier 2 - Pattern Library (3 slots with named capture groups)
  - Tier 3 - LLM Fallback (GPT-4o-mini JSON mode with Zod validation)
- **Natural Language Support**: "double users", "raise $25k", "bump SAT by +50", "get into RSI"
- **Domain Bounds Validation**: SAT (400-1600), GPA (0-4.5), Users (0-10M), Funds (0-10M), Hours/week (0-168)
- **3 New Intent Types**:
  - `readiness.whatif.ec` - EC scaling simulations (users, funds, hours)
  - `readiness.whatif.gpa` - GPA target what-if scenarios
  - `readiness.whatif.program` - Summer program admit simulations
- **3 New Resolvers**:
  - `readinessWhatIfEC()`: Users (10k+ → +2.5pts), Funds ($25k → +3.0pts), Hours (15+ → +1.5pts)
  - `readinessWhatIfGPA()`: Formula: `(target/4.0 * 40 - current/4.0 * 40) * 0.40`
  - `readinessWhatIfProgram()`: High-impact (RSI/TASP/SSP) → +5.0pts, Other selective → +3.0pts
- **Backward Compatibility**: Existing what-if SAT/award queries continue to work with legacy action_param
- **Confidence Tracking**: Each extraction tagged with confidence (0-1) and source (rule/pattern/llm)
- **Testing**: ✅ All 6 domains tested with natural language queries (SAT set/delta, award tier, EC users/funds/hours, GPA target, program admit)
- **Impact:** Universal coverage across all domains, replacing domain-specific extractors with single unified pipeline. Cost-efficient with deterministic rules handling 90%+ of queries.

### 2025-10-04 07:30: Parameter Extraction + Deterministic Scoring (v3.7.1)
- **Parameter Extraction Module**: NLP-based parameter extraction from natural language queries
  - Regex patterns for common cases: "raise SAT to 1550", "win national award"
  - LLM fallback scaffolded (currently disabled due to SDK dependency)
  - Functions: `extractSATTarget()`, `extractAwardTier()`, `extractWhatIfParams()`
- **Deterministic Scoring Views**:
  - `v_factor_scores_current`: Weighted factor scoring (Academics 40%, Awards 25%, Leadership 20%, Programs 10%, Narrative 5%)
  - `v_ivyready_current`: Composite IvyReady score (0-100) with factor_breakdown JSONB
  - `v_action_ivyready_delta`: Pre-calculated what-if deltas for SAT targets and award tiers
- **Snapshot API**:
  - POST /students/:id/snapshots - Create named snapshots
  - GET /students/:id/snapshots - List all snapshots
  - GET /students/:id/snapshots/:id - Get specific snapshot
  - Captures v_features_all + ivy_ready_score as JSONB
- **Scoring Formulas**:
  - SAT what-if: `(target/1600 * 60 - current/1600 * 60) * 0.40 = delta`
  - Award what-if: `tier_bump * 0.25 = delta` (Int'l: 40, Nat'l: 20, Regional: 10)
- **Intent Router Integration**: Post-classification parameter extraction with error handling
- **Resolver Updates**: Deterministic math in `readinessWhatIfSAT()` and `readinessWhatIfAward()`
- **Testing**: ✅ All what-if queries functional with accurate delta calculations
- **Impact:** Complete what-if simulation engine with transparent, reproducible scoring

### 2025-10-03 22:00: Universal Readiness Scoring (v3.7)
- **Feature-Based Architecture**: 11 features across 6 domains (testing, awards, ECs, narrative, academics, programs)
- **Feature Extraction Views**: v_features_testing, v_features_awards, v_features_ecs, v_features_narrative, v_features_academics, v_features_programs, v_features_all
- **6 New Intent Types**: readiness.now, readiness.progress, readiness.drivers, readiness.whatif.sat, readiness.whatif.award, readiness.next_moves
- **6 New Resolvers**: Feature-based readiness tracking and analysis
- **Impact:** Composable readiness scoring system with full feature transparency

### 2025-10-03 20:00: GamePlan v2 + IvyReady Rubric (v3.4.1)
- **GamePlan v2**: Initial targets synthesis view (narrative + awards + ECs + programs)
- **GamePlan vs Execution**: Unified progression timeline across all domains
- **IvyReady Rubric**: Temporal admissions scoring with 6-factor weighted model
  - Academics (32%), Testing (12%), ECs (24%), Awards (12%), Narrative (15%), Context (5%)
  - Snapshots: assessment, midpoint, final_submit
  - Phase detection: "initial IvyReady score" → assessment, "final" → final_submit
- **Common App Template**: Normalized views for activities (max 10), honors (max 5), academics
- **Deduplication Fixes** (v3.4.1):
  - Canon label function for award/EC normalization
  - Initial awards deduplicated by canonical label
  - Common App honors null-filtered
  - Common App activities near-duplicate collapse with role-prefix preference
- **New Intents**: gameplan.initial, gameplan.vs_progress, application.final, ivyready.score
- **New Resolvers**: gamePlanInitial(), gamePlanVsExecution(), commonAppSubmitted(), ivyReadyScore()
- **Impact:** Complete GamePlan + Application lifecycle tracking with rubric-based readiness scoring

### 2025-10-03: Fuzzy Intent Training Pack (v3.4)
- Added 48 comprehensive few-shot examples
- Implemented synonym expansion (phase/object bags)
- Added tiered confidence routing
- Fixed "which ECs did I add to college app?" routing issue
- **Impact:** Eliminated intent detection brittleness

### 2025-10-03: Academics Enhancement (v3.3)
- Added SAT timeline enumeration (first/latest/nth/progression)
- Added GPA timeline tracking (multiple scopes)
- Added transcript views (initial/final)
- Added academics summary resolver
- **Impact:** Complete academics support with temporal queries

### 2025-10-03: Universal Enumerations Complete
- Awards enumeration (initial/wins/progression)
- ECs enumeration (initial/final/progression)
- Programs enumeration (initial/final/decisions)
- Narrative enumeration (initial/final)
- **Impact:** Facts-first SQL for all major student data

### 2025-10-02: GPT-5 Intent Router (v3.2-v3.3)
- Replaced regex-based routing with LLM classifier
- 4-tier waterfall: Enumeration → Temporal → Canonical → RAG
- Standardized intent schema with confidence scoring
- Intent detection accuracy: 95%+ on test suite
- **Impact:** Robust natural language understanding

### 2025-09-30: Universal KB Items Ledger
- Single table for all targets/outcomes
- State machine (Planned → In Transit → Submitted → Outcome → Archived)
- Dual tracking: outcomes table + kb_items
- Evidence ledger with full provenance
- **Impact:** Simplified data model, complete audit trail

### 2025-09-23: Fine-Tuned Jenny Model (jenny-v1)
- 1,000 training examples from 93 weeks
- 27+ intelligence layers captured
- 86.8% speaker attribution accuracy
- PII scrubbing and privacy protection
- **Impact:** Authentic Coach Jenny voice in responses

---

## Planned Features (Backlog)

### 🔄 College Application Targets
- **Status:** Designed, Not Implemented
- **Description:** Track college targets with reach/match/safety tiers
- **Tables:** `college_targets` (planned)
- **Views:** `v_colleges_initial`, `v_colleges_final`, `v_college_decisions`
- **Queries:**
  - "which colleges am I applying to?"
  - "show my college list"
  - "college decisions"
- **Priority:** High
- **ETA:** TBD

### 🔄 GamePlan Integration
- **Status:** Partial (vitals exist, no structured views)
- **Description:** Weekly planning and task management
- **Tables:** Exists in `vital_facts` as kind=gameplan_*
- **Views Needed:** `v_gameplan_weekly`, `v_gameplan_tasks`
- **Queries:**
  - "show my game plan for week 15"
  - "what's on my to-do list?"
  - "weekly plan"
- **Priority:** Medium
- **ETA:** TBD

### 🔄 Testing & Standardized Tests Beyond SAT
- **Status:** SAT complete, ACT/AP not implemented
- **Description:** Support for ACT, AP, Subject Tests
- **Tables Needed:** `test_timeline` (generalized)
- **Views:** `v_act_timeline`, `v_ap_timeline`
- **Priority:** Medium
- **ETA:** TBD

### 🔄 Opportunity Recommender
- **Status:** Designed, Not Implemented
- **Description:** Personalized opportunity recommendations
- **Service:** `services/opportunity-recommender`
- **Features:**
  - ML-based scoring
  - Fit analysis (profile → opportunity)
  - Timing optimization
- **Priority:** High
- **ETA:** TBD

### 🔄 Multi-Student Support
- **Status:** Architecture supports, UI single-student
- **Description:** Support multiple students per account
- **Changes Needed:**
  - Student selector in UI
  - Session management per student
  - Student switcher component
- **Priority:** Low
- **ETA:** TBD

---

## Migration History

All database migrations are tracked in `apps/api/db/migrations/` with naming convention:
`YYYY-MM-DD-description.sql`

### Recent Migrations (Last 30 Days)

| Date | File | Description |
|------|------|-------------|
| 2025-10-03 | `2025-10-03-canonical-targets-enumerations.sql` | Universal enumerations (awards, ECs, programs, narratives, academics) |
| 2025-10-03 | `2025-10-03-kb-items-universal.sql` | Universal KB Items ledger with state machine |
| 2025-10-03 | `2025-10-03-initial-targets-awards.sql` | Initial awards targets CSV seed |
| 2025-10-02 | `2025-10-02-query-traces-v2.sql` | Query tracing system |
| 2025-10-02 | `2025-10-02-utfa-universal-temporal.sql` | UTFA temporal functions (first/latest/nth/asof) |
| 2025-09-30 | `2025-09-30-canon-registry.sql` | Canonical facts registry |

### Core Migrations (Foundation)

| Date | File | Description |
|------|------|-------------|
| 2025-09-30 | `jenny-v3/001_universal_vitals_model.sql` | Core vitals model (v3.0 foundation) |
| 2025-09-30 | `jenny-v3/002_temporal_resolution.sql` | Temporal query functions |
| 2025-09-30 | `jenny-v3/003_evidence_chain.sql` | Evidence linking system |

---

## Feature Toggles & Environment Variables

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/jenny_db

# OpenAI
OPENAI_API_KEY=sk-...
JENNY_MODEL_ID=ft:gpt-4o-2024-08-06:...  # Fine-tuned model (optional, defaults to gpt-4o-mini)

# Pinecone (for RAG)
PINECONE_API_KEY=...
PINECONE_INDEX=jenny-v3-3072-093025
PINECONE_NAMESPACE=kb_v5_4  # Optional: defaults to no namespace if omitted

# Cohere (for reranking)
COHERE_API_KEY=...
```

### Feature Flags (Planned)

Currently all features are production-enabled. Future feature flag system:
- `ENABLE_RAG_FALLBACK` (default: true)
- `ENABLE_TRACE_LOGGING` (default: true)
- `ENABLE_FT_MODEL` (default: true if JENNY_MODEL_ID set)

---

## Deprecation Notices

### ⚠️ Deprecated (v3.0+)

1. **Old Master Spec (v1.0)**
   - File: `docs/archive/MASTER_SPEC_v1.0.md`
   - Replaced By: `docs/MASTER_TECHNICAL_SPEC.md`
   - Reason: Architecture evolved to UTFA + GPT-5 router

2. **Regex-Based Intent Router**
   - File: `services/agent/src/intent.ts` (old)
   - Replaced By: `services/jenny-api/src/router/intentRouter.ts`
   - Reason: Too brittle, couldn't handle natural language variations

3. **Direct Pinecone Queries**
   - Replaced By: Hybrid Search (vector + BM25 + reranking)
   - Reason: Better recall and precision

4. **Manual Evidence Chips**
   - Replaced By: Automatic provenance from kb_items
   - Reason: Complete audit trail

---

## Version History

| Version | Date | Codename | Major Features |
|---------|------|----------|----------------|
| v5.5 | 2025-10-07 | Intel Chips Architecture | 3-family KB (1,009 vectors), QA suite, CI/CD, federated search |
| v4.6.2c | 2025-10-04 | UAPX Guardrails v2 | Attending robustness, expanded synonyms |
| v4.6.2b | 2025-10-04 | UAPX Guardrails | Deterministic filter extraction, answer shaping |
| v4.6.1 | 2025-10-04 | College & Scholarships | College list, scholarship tracking, readiness correlation |
| v3.9.1 | 2025-10-04 | Readiness Hotfix | Intent routing, SQL keywords, type safety fixes |
| v3.9 | 2025-10-04 | Readiness Intelligence | Weakspots, boost planning, progression tracking |
| v3.7.3 | 2025-10-04 | Activity-Aware EC | Fuzzy activity matching, multi-metric EC scaling |
| v3.7.2 | 2025-10-04 | UAPX | Universal parameter extraction, 3-tier pipeline |
| v3.7.1 | 2025-10-04 | Deterministic Scoring | What-if engine, snapshot API, feature scoring |
| v3.7 | 2025-10-03 | Feature Layer | Universal Readiness (14 features, 6 domains, what-if engine) |
| v3.4.1 | 2025-10-03 | Dedup Fixes | Canon label deduplication, phase views, as-of functions |
| v3.4 | 2025-10-03 | Fuzzy Intent | 48 few-shot examples, synonym expansion, tiered confidence |
| v3.3 | 2025-10-03 | Academics | SAT/GPA/Transcript enumeration, academics summary |
| v3.2 | 2025-10-03 | GPT-5 Router | LLM-based intent classification, 4-tier routing |
| v3.1 | 2025-09-30 | Enumerations | Universal enums (awards, ECs, programs, narratives) |
| v3.0 | 2025-09-30 | UTFA | Universal Temporal Facts Architecture, vitals model |
| v2.0 | 2025-09-30 | Hybrid RAG | Vector + BM25 + Cohere reranking |
| v1.0 | 2025-09-23 | Jenny FT | Fine-tuned model, 27+ layers, 1,000 examples |
| Alpha | 2025-09-23 | Foundation | Initial RAG, basic vitals, Pinecone integration |

---

## Contributing Updates

When adding a new feature or update:

1. **Add to Active Features section** with:
   - Status (Production/Beta/Experimental)
   - Date implemented
   - Description
   - Key components/files
   - Queries supported
   - References (migrations, specs, releases)

2. **Add to Recent Updates** with:
   - Date, version, and impact

3. **Update Migration History** if database changes

4. **Update Version History** if major release

5. **Move old features to archive** when deprecated

---

## Questions & Support

For questions about features or to request new functionality:
- Check `docs/MASTER_TECHNICAL_SPEC.md` for architecture details
- Check `docs/DB_ARCHITECTURE_SPEC.md` for database schema
- Review release notes in `docs/releases/`
- Check archived docs in `docs/archive/` for historical context

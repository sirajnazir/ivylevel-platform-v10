# Documentation Index

**IvyLevel Platform v10 - Jenny Agentic AI**
**Last Updated:** 2025-10-03

---

## 📚 Master Documentation (Source of Truth)

These are the primary, actively maintained documents that represent the current state of the platform.

### 🏗️ Architecture & Design

#### [MASTER_TECHNICAL_SPEC.md](./MASTER_TECHNICAL_SPEC.md)
**Primary technical specification** for the entire platform.
- Complete end-to-end query flow (11 steps)
- Architecture diagrams and component overview
- Intent routing architecture (4-tier waterfall)
- Fine-tuned Jenny model details
- 27+ Intelligence layers documentation
- Third-party integrations (PostgreSQL, Pinecone, OpenAI, Cohere)
- Module reference with file paths
- API contracts

#### [DB_ARCHITECTURE_SPEC.md](./DB_ARCHITECTURE_SPEC.md)
**Complete database architecture specification**.
- Core schema (students, sources, vital_facts, kb_items, outcomes)
- 30+ views for temporal resolution
- Temporal query functions (first/latest/nth/as-of)
- Enumeration tables (awards, ECs, programs, narratives, academics)
- Migration history with timestamps
- Indexes and performance optimization

#### [FEATURES_AND_UPDATES.md](./FEATURES_AND_UPDATES.md)
**Living tracker of all features and updates**.
- Active features (v3.4)
- Recent updates (last 30 days)
- Planned features (backlog)
- Migration history
- Version history
- Deprecation notices

### 📋 Operations & Runbooks

#### [OPERATOR_RUNBOOK.md](./OPERATOR_RUNBOOK.md)
**Operational procedures for running the platform**.
- Startup procedures
- Service management
- Common operations
- Troubleshooting guides

#### [INCIDENT_PLAYBOOK.md](./INCIDENT_PLAYBOOK.md)
**Incident response procedures**.
- Incident severity levels
- Response workflows
- Common issues and resolutions
- Escalation paths

#### [CHANGELOG.md](./CHANGELOG.md)
**Chronological log of all changes**.
- Feature additions
- Bug fixes
- Breaking changes
- Performance improvements

---

## 📦 Release Documentation

Version-specific implementation details and release notes.

### Current Releases (v3.x)

- [V3.4_FUZZY_INTENT_TRAINING.md](./releases/V3.4_FUZZY_INTENT_TRAINING.md) - **Latest** (2025-10-03)
  - 48 few-shot examples with synonym expansion
  - Tiered confidence routing
  - Fixes for natural language variations

- [V3.3_ACADEMICS_ENHANCEMENT.md](./releases/V3.3_ACADEMICS_ENHANCEMENT.md) (2025-10-03)
  - SAT timeline enumeration
  - GPA tracking and timeline
  - Transcript views (initial/final)

- [V3.2_IMPLEMENTATION_STATUS.md](./releases/V3.2_IMPLEMENTATION_STATUS.md) (2025-10-03)
  - GPT-5 intent router implementation status
  - Testing results and validation

- [V3.2_GPT5_INTENT_ROUTER.md](./releases/V3.2_GPT5_INTENT_ROUTER.md) (2025-10-03)
  - LLM-based intent classification
  - 4-tier waterfall routing
  - Intent schema standardization

- [V3.1_IMPLEMENTATION_SUMMARY.md](./releases/V3.1_IMPLEMENTATION_SUMMARY.md) (2025-09-30)
  - Universal enumerations
  - Awards, ECs, programs, narratives

### Legacy Releases (v1.x)

- [ALPHA-1.0-RELEASE-NOTES.md](./releases/ALPHA-1.0-RELEASE-NOTES.md) (2025-09-23)
  - Fine-tuned Jenny model (jenny-v1)
  - 1,000 training examples
  - 27+ intelligence layers

- [v1.2.4_RELEASE_NOTES.md](./releases/v1.2.4_RELEASE_NOTES.md) (2025-09-24)
- [v1.2.3_RELEASE_NOTES.md](./releases/v1.2.3_RELEASE_NOTES.md) (2025-09-23)
- [v1.2_RELEASE_NOTES.md](./releases/v1.2_RELEASE_NOTES.md) (2025-09-23)

---

## 📊 Reports & Status

Implementation summaries, test results, and validation reports.

### Implementation Reports

- [UNIVERSAL_ENUMERATIONS_COMPLETE.md](./reports/UNIVERSAL_ENUMERATIONS_COMPLETE.md)
  - Awards, ECs, programs, narratives enumerations
  - Implementation validation

- [GAMEPLAN_SEED_COMPLETE.md](./reports/GAMEPLAN_SEED_COMPLETE.md)
  - GamePlan data loading status
  - CSV seed validation

- [FINAL_ECS_LOADED.md](./reports/FINAL_ECS_LOADED.md)
  - Final ECs data validation
  - CommonApp integration

- [CORRECT_GAMEPLAN_DATA_LOADED.md](./reports/CORRECT_GAMEPLAN_DATA_LOADED.md)
  - GamePlan data correction report
  - Data quality fixes

### Test & Validation Reports

- [UI_TEST_STATUS.md](./reports/UI_TEST_STATUS.md)
  - Test UI validation results
  - Query testing status

- [TRACE_TEST_RESULTS.md](./reports/TRACE_TEST_RESULTS.md)
  - Query trace testing
  - Trace viewer validation

- [UI_TRACE_FIX_COMPLETE.md](./reports/UI_TRACE_FIX_COMPLETE.md)
  - Trace panel fixes
  - UI improvements

- [VALIDATION_REPORT.md](./reports/VALIDATION_REPORT.md)
  - System validation results
  - Integration testing

- [VALIDATION_RESULTS.md](./reports/VALIDATION_RESULTS.md)
  - Additional validation metrics

### Status Reports

- [FINAL_STATUS.md](./reports/FINAL_STATUS.md)
  - Overall platform status
  - Feature completeness

- [JENNY_V3_SETUP.md](./reports/JENNY_V3_SETUP.md)
  - v3.0 setup guide
  - Migration status

- [UI_ACCESS_INSTRUCTIONS.md](./reports/UI_ACCESS_INSTRUCTIONS.md)
  - Test UI access guide
  - Local development setup

- [IMPLEMENTATION_SUMMARY.md](./reports/IMPLEMENTATION_SUMMARY.md)
  - High-level implementation summary

- [PINECONE_V2_STATUS.md](./reports/PINECONE_V2_STATUS.md)
  - Pinecone v2 migration status
  - Vector database updates

- [ENV_CONFIG.md](./reports/ENV_CONFIG.md)
  - Environment configuration guide
  - Required variables

### Legacy Reports

- [v1.2.4.1_release_acceptance.md](./reports/v1.2.4.1_release_acceptance.md)
- [v1.2.4_hotfix_report.md](./reports/v1.2.4_hotfix_report.md)
- [opportunity_report_huda.md](./reports/opportunity_report_huda.md)
- [temporal_investigation.md](./reports/temporal_investigation.md)
- [REMAINING_FIXES_NEEDED.md](./reports/REMAINING_FIXES_NEEDED.md)

### Evaluation Reports

- [eval/quick_scorecard_2025-09-24T00-28.md](./reports/eval/quick_scorecard_2025-09-24T00-28.md)
  - Model evaluation metrics
  - Performance scoring

---

## 🗄️ Archived Documentation

Historical documentation kept for reference. **Not actively maintained.**

### Superseded Specifications

- [archive/MASTER_SPEC_v1.0.md](./archive/MASTER_SPEC_v1.0.md)
  - Original v1.0 master spec
  - **Replaced by:** MASTER_TECHNICAL_SPEC.md
  - **Reason:** Architecture evolved to UTFA + GPT-5 router

- [archive/TECHNICAL_SPEC.md](./archive/TECHNICAL_SPEC.md)
  - Early technical spec
  - **Replaced by:** MASTER_TECHNICAL_SPEC.md

- [archive/IMPLEMENTATION_TRACKER.md](./archive/IMPLEMENTATION_TRACKER.md)
  - Old feature tracker
  - **Replaced by:** FEATURES_AND_UPDATES.md

### Historical Documentation

- [archive/PENDING_BACKLOG.md](./archive/PENDING_BACKLOG.md) - Old backlog tracker
- [archive/RUN_SNAPSHOT_2025-09-23.md](./archive/RUN_SNAPSHOT_2025-09-23.md) - Point-in-time snapshot
- [archive/RUN_SNAPSHOT_2025-09-24.md](./archive/RUN_SNAPSHOT_2025-09-24.md) - Point-in-time snapshot
- [archive/HANDOVER.md](./archive/HANDOVER.md) - Old handover doc
- [archive/MANUAL_STEPS_CHECKLIST.md](./archive/MANUAL_STEPS_CHECKLIST.md) - Obsolete manual steps
- [archive/VITALS_QUICK_START.md](./archive/VITALS_QUICK_START.md) - Old vitals guide
- [archive/UI_CARD_SPEC.md](./archive/UI_CARD_SPEC.md) - Old UI spec

---

## 🚀 Quick Start Guides

### For Developers

1. **Understanding the Architecture**
   - Start with [MASTER_TECHNICAL_SPEC.md](./MASTER_TECHNICAL_SPEC.md) for overview
   - Review [DB_ARCHITECTURE_SPEC.md](./DB_ARCHITECTURE_SPEC.md) for data model
   - Check [FEATURES_AND_UPDATES.md](./FEATURES_AND_UPDATES.md) for current features

2. **Making Changes**
   - Review [OPERATOR_RUNBOOK.md](./OPERATOR_RUNBOOK.md) for operations
   - Check [CHANGELOG.md](./CHANGELOG.md) for recent changes
   - Update [FEATURES_AND_UPDATES.md](./FEATURES_AND_UPDATES.md) when adding features

3. **Troubleshooting**
   - Consult [INCIDENT_PLAYBOOK.md](./INCIDENT_PLAYBOOK.md) for common issues
   - Check [reports/](./reports/) for recent status updates

### For Product/Business

1. **Current Capabilities**
   - [FEATURES_AND_UPDATES.md](./FEATURES_AND_UPDATES.md) - Active features section
   - [MASTER_TECHNICAL_SPEC.md](./MASTER_TECHNICAL_SPEC.md#fine-tuned-jenny-model) - Jenny model details

2. **Roadmap**
   - [FEATURES_AND_UPDATES.md](./FEATURES_AND_UPDATES.md#planned-features-backlog) - Planned features

3. **Release History**
   - [releases/](./releases/) - All release notes
   - [CHANGELOG.md](./CHANGELOG.md) - Chronological changes

---

## 📝 Documentation Standards

### When to Update Each Doc

#### MASTER_TECHNICAL_SPEC.md
- Architecture changes
- New system components
- API contract changes
- Integration updates

#### DB_ARCHITECTURE_SPEC.md
- New tables/views/functions
- Schema changes
- Migration additions
- Index updates

#### FEATURES_AND_UPDATES.md
- New features (add to Active Features)
- Feature updates (add to Recent Updates)
- Deprecations (add to Deprecation Notices)
- Version bumps (update Version History)

#### CHANGELOG.md
- Every commit to main
- Bug fixes
- Performance improvements
- Breaking changes

### Creating New Documentation

#### For New Features
1. Implement the feature
2. Run migration (if DB changes)
3. Add to `FEATURES_AND_UPDATES.md` (Active Features)
4. Add to `FEATURES_AND_UPDATES.md` (Recent Updates)
5. Update `DB_ARCHITECTURE_SPEC.md` (if DB changes)
6. Update `MASTER_TECHNICAL_SPEC.md` (if architecture changes)
7. Add entry to `CHANGELOG.md`

#### For New Releases
1. Create release doc in `releases/` (e.g., `V3.5_FEATURE_NAME.md`)
2. Update `FEATURES_AND_UPDATES.md` version history
3. Link from this README under Release Documentation

#### For Bug Fixes/Hotfixes
1. Fix the bug
2. Add entry to `CHANGELOG.md`
3. If significant, create report in `reports/`

---

## 🔍 Finding Information

### "How do I...?"

| Task | Documentation |
|------|---------------|
| Understand the overall architecture | [MASTER_TECHNICAL_SPEC.md](./MASTER_TECHNICAL_SPEC.md) |
| Find database schema details | [DB_ARCHITECTURE_SPEC.md](./DB_ARCHITECTURE_SPEC.md) |
| Check what features are available | [FEATURES_AND_UPDATES.md](./FEATURES_AND_UPDATES.md#active-features-v34) |
| See what changed recently | [CHANGELOG.md](./CHANGELOG.md) |
| Troubleshoot an issue | [INCIDENT_PLAYBOOK.md](./INCIDENT_PLAYBOOK.md) |
| Run the platform locally | [OPERATOR_RUNBOOK.md](./OPERATOR_RUNBOOK.md) |
| Understand the intent router | [releases/V3.2_GPT5_INTENT_ROUTER.md](./releases/V3.2_GPT5_INTENT_ROUTER.md) |
| Learn about the fine-tuned model | [MASTER_TECHNICAL_SPEC.md#fine-tuned-jenny-model](./MASTER_TECHNICAL_SPEC.md#fine-tuned-jenny-model) |
| See migration history | [DB_ARCHITECTURE_SPEC.md#migration-history](./DB_ARCHITECTURE_SPEC.md#migration-history) |

### "What's the status of...?"

| Feature | Check |
|---------|-------|
| Universal enumerations | [reports/UNIVERSAL_ENUMERATIONS_COMPLETE.md](./reports/UNIVERSAL_ENUMERATIONS_COMPLETE.md) |
| Academics (SAT/GPA) | [releases/V3.3_ACADEMICS_ENHANCEMENT.md](./releases/V3.3_ACADEMICS_ENHANCEMENT.md) |
| Intent routing | [releases/V3.4_FUZZY_INTENT_TRAINING.md](./releases/V3.4_FUZZY_INTENT_TRAINING.md) |
| Fine-tuned model | [releases/ALPHA-1.0-RELEASE-NOTES.md](./releases/ALPHA-1.0-RELEASE-NOTES.md) |
| Test UI | [reports/UI_TEST_STATUS.md](./reports/UI_TEST_STATUS.md) |

---

## 📂 Folder Structure

```
docs/
├── README.md                          # This file - documentation index
├── MASTER_TECHNICAL_SPEC.md           # 🔴 Primary technical spec
├── DB_ARCHITECTURE_SPEC.md            # 🔴 Database architecture
├── FEATURES_AND_UPDATES.md            # 🔴 Feature tracker (living doc)
├── CHANGELOG.md                       # Chronological change log
├── OPERATOR_RUNBOOK.md                # Operations guide
├── INCIDENT_PLAYBOOK.md               # Incident response
│
├── releases/                          # Version-specific releases
│   ├── V3.4_FUZZY_INTENT_TRAINING.md
│   ├── V3.3_ACADEMICS_ENHANCEMENT.md
│   ├── V3.2_GPT5_INTENT_ROUTER.md
│   ├── V3.2_IMPLEMENTATION_STATUS.md
│   ├── V3.1_IMPLEMENTATION_SUMMARY.md
│   ├── ALPHA-1.0-RELEASE-NOTES.md
│   ├── v1.2.4_RELEASE_NOTES.md
│   ├── v1.2.3_RELEASE_NOTES.md
│   └── v1.2_RELEASE_NOTES.md
│
├── reports/                           # Status reports & test results
│   ├── UNIVERSAL_ENUMERATIONS_COMPLETE.md
│   ├── GAMEPLAN_SEED_COMPLETE.md
│   ├── UI_TEST_STATUS.md
│   ├── TRACE_TEST_RESULTS.md
│   ├── VALIDATION_REPORT.md
│   ├── FINAL_STATUS.md
│   └── eval/
│       └── quick_scorecard_2025-09-24T00-28.md
│
└── archive/                           # Historical/superseded docs
    ├── MASTER_SPEC_v1.0.md
    ├── TECHNICAL_SPEC.md
    ├── IMPLEMENTATION_TRACKER.md
    ├── VITALS_QUICK_START.md
    └── ...
```

---

## 🎯 Key Principles

1. **Single Source of Truth**: Master docs in `/docs` root are authoritative
2. **Living Documentation**: Update with every significant change
3. **Historical Context**: Archive superseded docs, don't delete
4. **Clear Navigation**: This README is the entry point to all docs
5. **Version Tracking**: All releases documented in `/releases`

---

## 📞 Questions?

- **Technical Questions:** Check [MASTER_TECHNICAL_SPEC.md](./MASTER_TECHNICAL_SPEC.md)
- **Database Questions:** Check [DB_ARCHITECTURE_SPEC.md](./DB_ARCHITECTURE_SPEC.md)
- **Feature Questions:** Check [FEATURES_AND_UPDATES.md](./FEATURES_AND_UPDATES.md)
- **Operational Issues:** Check [INCIDENT_PLAYBOOK.md](./INCIDENT_PLAYBOOK.md)

---

**Last Updated:** 2025-10-03
**Version:** v3.4 (Fuzzy Intent Training)

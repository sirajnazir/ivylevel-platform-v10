# Implementation Tracker (Spec IDs → Status)
_Update this table in every PR. DoD must be checked before merge._

| ID      | Title                                         | Owner | Status | DoD | ETA   | Tests / Verify |
|---------|-----------------------------------------------|-------|--------|-----|-------|----------------|
| API-001 | /health                                       | CTO   | ✅     | ✅  | —     | curl /health   |
| API-002 | /agent/chat → agent.respond                   | CTO   | ✅     | ✅  | —     | curl example   |
| API-003 | /search → retriever                           | SWE   | ✅     | ✅  | —     | curl example   |
| AGT-001 | Week→Phase router                             | CTO   | ✅     | ✅  | —     | unit test      |
| AGT-021 | 168h reminders in weekly node (scaffold)      | SWE   | ⏳     | ☐  | 2025-09-28 | prompt test |
| AGT-030 | Evidence enforcement in replies               | SWE   | ⏳     | ☐  | 2025-09-28 | reply has chips |
| AGT-050 | LangGraph: assessmentNode                     | CTO   | ❌     | ☐  | 2025-10-02 | golden answers |
| AGT-060 | LangGraph: weeklyNode                         | SWE   | ❌     | ☐  | 2025-10-04 | scenarios pass |
| AGT-070 | LangGraph: appsNode                           | CTO   | ❌     | ☐  | 2025-10-06 | app checks    |
| RAG-010 | pineconeQuery                                 | SWE   | ✅     | ✅  | —     | mock + live    |
| RAG-020 | /upsert validation                            | SWE   | ✅     | ✅  | —     | ingest tests   |
| RAG-030 | keyword fallback (if no vectors)              | SWE   | ❌     | ☐  | 2025-10-01 | search test    |
| ING-001 | build_corpus: INTEL-first parsing             | CTO   | ✅     | ✅  | —     | parse_report   |
| ING-008 | Skip Copy_of* + coverage_matrix               | SWE   | ✅     | ✅  | —     | coverage csv   |
| FT-001  | launch_finetune.py                            | CTO   | ✅     | ✅  | —     | fine-tune job  |
| EVAL-001| Indistinguishability baseline scripts         | SWE   | ✅     | ✅  | —     | eval runner    |
| EVAL-010| Evidence compliance >=95% (gate)              | CTO   | ❌     | ☐  | 2025-10-05 | pipeline gate  |
| UI-001  | Evidence Chips minimal UI (Next.js)           | SWE   | ❌     | ☐  | 2025-10-03 | visual check   |
| VIT-001 | Vitals DB Schema + Observations              | CTO   | ✅     | ✅  | —     | DB migration   |
| VIT-002 | Event-sourced reducer logic                   | CTO   | ✅     | ✅  | —     | unit tests     |
| VIT-003 | Excel/CSV college decisions parser            | CTO   | ✅     | ✅  | —     | 28 colleges    |
| VIT-004 | Never-blank doctrine integration              | CTO   | ✅     | ✅  | —     | agent tests    |
| VIT-005 | GamePlan→Exec→Apps standardization           | CTO   | ✅     | ✅  | —     | backfill done  |
| OPP-001 | Opportunity Catalog Service                   | CTO   | ✅     | ✅  | —     | CRUD ops       |
| OPP-002 | Opportunity Scorer Service                    | CTO   | ✅     | ✅  | —     | scoring algo   |
| OPP-003 | Opportunity Recommender Service               | CTO   | ✅     | ✅  | —     | recommendations|
| OPP-004 | Automated opportunity mining                  | CTO   | ✅     | ✅  | —     | 10K+ extracted |
| OPP-005 | Parent-facing opportunity report              | CTO   | ✅     | ✅  | —     | 89.2% win rate |
| OPP-006 | Category yield analysis                       | CTO   | ✅     | ✅  | —     | SQL + report   |
| OPP-007 | Temporal pattern analysis                     | CTO   | ✅     | ✅  | —     | bombardment    |
| OPP-008 | Fine-tune augmentation for lists              | CTO   | ✅     | ✅  | —     | JSONL dataset  |
| REP-001 | Reports API endpoint /reports/:id             | CTO   | ✅     | ✅  | —     | curl tests     |
| REP-002 | Agent report integration                      | CTO   | ✅     | ✅  | —     | query tests    |
| REP-003 | Nightly cron for report generation            | CTO   | ✅     | ✅  | —     | cron script    |
| REP-004 | UI card spec for Reports tab                 | CTO   | ✅     | ✅  | —     | spec document  |
| REP-005 | Report unit and smoke tests                   | CTO   | ✅     | ✅  | —     | test suite     |

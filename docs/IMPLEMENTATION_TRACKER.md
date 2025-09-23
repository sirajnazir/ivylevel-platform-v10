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

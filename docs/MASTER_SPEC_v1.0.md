# Ivylevel v1.0 — Master Technical, Architecture & Coding Spec
_Last updated: 2025-09-23_  
_Source of Truth for engineering. PRs must reference Spec IDs from this document._

## 0. Version / Scope
- **Repo:** `ivylevel-v1-master`
- **Audience:** Engineering (backend, data, infra), Tech Lead, QA
- **Goal:** Achieve **indistinguishable** digital twin quality for Coach Jenny for (a) Real Huda and (b) New Student.
- **North Star Metric (NSM):** Human–AI indistinguishability on Jenny’s style **and** correctness (evidence-backed).
- **Leading Metrics:** Autonomy (weekly flow), Evidence Chips present, Opportunity Precision@K, On-time GamePlan.

---

## 1. System Overview
**Actors**: Student (Huda / New Student), Digital Jenny, Coach (optional hybrid), Admin.  
**Phases** (from PRD v10.0):
1. **Assessment (Week 0 → GamePlan in 24h)** — 4-Step Framework; 1:43:35 session (W001), 27 layers, 147 quotes, 83 techniques.
2. **Prep Execution (Weeks 2–52)** — **168-hour architecture**; weekly planning; task multiplication; pipeline buffers.
3. **Apps (Weeks 53–93)** — Narrative mastery, award cadence, rejection alchemy, application polish to acceptance.

**Services** (current code):
- `services/agent` — Orchestrator (LangGraph-ready) → drives phase logic, enforces evidence.
- `services/retriever` — Pinecone RAG, embeddings, `/search` and `/upsert`.
- `apps/api` — REST gateway `/agent/chat`, `/search`, `/health`.
- `tools/ingest` — Local ingestion (no Colab): raw → `rag_index.jsonl` + `finetune_chat.jsonl`.
- `packages/logger` — pino logger; console + file logs.
- `packages/types` — shared DTOs.
- `infra/terraform/prod` — optional 2-user AWS tier (off by default).

---

## 2. Architecture
```
[UI/Client] → apps/api (HTTP)
                 ├─ POST /agent/chat  → services/agent /respond
                 └─ POST /search      → services/retriever /search
services/agent ↔ services/retriever (/search evidence)
              ↘ (future) recommender (/opportunities)
tools/ingest  → data/processed/<coach>/(rag_index.jsonl, finetune_chat.jsonl)
                               └─ packages/scripts → retriever /upsert
Pinecone (index: jenny-v1, namespace: jenny_v1) ← embeddings: text-embedding-3-small
OpenAI (gpt-4o-mini base, fine-tuned: jenny-v0-2*) for chat completion
```

**State model (simplified):**
```ts
type AgentState = { coachId: "jenny"; studentId: string; nowWeek: number; phase: 1|2|3|4|5; memory: Record<string,any> }
phase = f(nowWeek): 1→Foundation, 2→Building, 3→Junior, 4→Summer, 5→Senior/Apps
```

**Evidence rule (global):**
- Every assistant message must include `evidence_chips[]` derived from RAG metadata.  
- Chip fields: `title`, `kind` (TRANS-INTEL|EXEC-INTEL|IMSG-INTEL|APP-DOC), `week`, `phase`, `link` (doc url), `span` (quote id).

---

## 3. Data Layer
### 3.1 Corpus Layout (from PRD ART VIII)
```
01-Intelligence-GamePlan/       (e.g., 01-Huda-Assessment-Intelligence-IvyLevel-4Step-Complete.json)
02-Intelligence-ExecutionDocs/  (e.g., W001-093 COMPLETE EXEC-INTEL OutcomeCorrelationMap.json)
03-Intelligence-SessionTranscripts/  (93 files: ..._TRANS-INTEL_*.json)
04-Intelligence-iMessage/       (7 files: ..._IMSG-INTEL_*.json)
09-Raw-ApplicationDocs/         (Common App, UC App, college list and outcomes)
```
**Totals:** 93 sessions, 277 iMessage files (rolled into INTEL), 264 intelligence assets, 22 apps, 9 acceptances.

### 3.2 Ingestion outputs
- `rag_index.jsonl` — one JSON object per quote/script/fact:
```json
{
  "id": "w026-ncwit-01",
  "text": "i'm crying i just got the ncwit email NATIONAL!!!! 😭😭😭😭",
  "type": "quote",
  "week": 26,
  "phase": "P2",
  "layers": ["Awards Strategy","Celebration Science"],
  "kind": "IMSG-INTEL",
  "doc_name": "2023-12-.._IMSG-INTEL_...json",
  "link": "https://docs.google.com/...",
  "coach": "jenny",
  "student": "huda"
}
```
- `finetune_chat.jsonl` — OpenAI chat format per sample:
```json
{
  "messages":[
    {"role":"system","content":"You are Coach Jenny... Use evidence chips."},
    {"role":"user","content":"I feel devastated after a rejection. What do I do?"},
    {"role":"assistant","content":"Yeah, that's completely fair... Onto the next. I’m introducing 3 new options within 48 hours."}
  ]
}
```

### 3.3 Pinecone schema
- **Index:** `jenny-v1` (dimension per embedding model)  
- **Namespace:** `jenny_v1`  
- **Vector metadata:** `text`, `type`, `week`, `phase`, `layers[]`, `kind`, `doc_name`, `link`, `coach`, `student`

### 3.4 Postgres (future)
- Tables (planned): `students`, `coaches`, `sessions`, `gameplans`, `opportunities`, `messages`, `eval_runs`.  
- _Out of scope for v1 unless needed for persistence beyond logs._

---

## 4. Intelligence Layers (Selected, with examples)
> Grounded in the Jenny–Huda corpus. Each maps to code behaviors.

- **L1: Credibility & Warmth** — “We’ve got this. Stanford-trained coach on your side.”  
- **L2: Success Metrics Framework** — SAT progression tracking **1360→1480→1490→1530**, GPA 3.85→3.93; APs=11.  
- **L3: 168h Architecture** — “Total 168: Sleep 56, School 37.5, Transport 4.5, Misc 21, Sunday School 2, Social 7, Homework 14 → Remaining 26.”  
- **L4: Task Multiplication** — Folklift: “Name, website (Figma) done; booked filming; 16 Applicants; 2 making ads → 35+ touchpoints.”  
- **L5: Opportunity Pipeline (3x buffer)** — Always 5+ active; target win rate ≈ 33%.  
- **L6: Awards Strategy** — NCWIT National quote; “That’s the same one I got too!!!” (relatability).  
- **L7: Summer Strategy** — JCamp (“life changing”), Kode with Klossy, GWC SIP; rejections handled with buffer.  
- **L8: Narrative & Essays** — UC + Common App docs ground truth (UNC app submission PDF).  
- **L9: Celebration Science (3:1 ratio)** — mix of reinforcement to challenge.  
- **L10: Counselor & Parent Navigation** — supportive scripts.  
- **… up to 31 layers** (see Appendix A: full list).

**Evidence Chips must reference INTEL or APP docs** whenever issuing guidance linked to these layers.

---

## 5. APIs (contracts)
### 5.1 apps/api
- `GET /health` → 200 OK `{ "status":"ok" }`
- `POST /agent/chat`  
  **Req:** `{ "message": string, "nowWeek": number, "studentId"?: string }`  
  **Res:** `{
    "reply": string,
    "evidence_chips": [{"title":string,"kind":string,"week":number,"phase":string,"link":string,"span":string}],
    "state": {"phase":number,"nowWeek":number},
    "logs_path": string
  }`
- `POST /search`  
  **Req:** `{ "q": string (required), "k"?: number (optional, default: 6), "filters"?: object (optional) }`  
  **Res:** `{ "hits":[{"text":string,"score":number,"metadata":object}] }`  
  **Error:** 400 `{ "error": "Missing required parameter: q (string)" }` if q is missing or not a string

### 5.2 services/agent
- `POST /respond`  
  **Req:** `{ "message": string, "state": AgentState }`  
  **Res:** `{ "reply": string, "evidence_chips": [...], "state": AgentState }`

### 5.3 services/retriever
- `POST /search`  
  **Req:** `{ "q": string (required), "k"?: number (optional, default: 6), "namespace"?: string (optional), "filter"?: object (optional) }`  
  **Res:** `{ "hits":[{"text":string,"score":number,"metadata":object}] }`  
  **Error:** 400 `{ "error": "Missing required parameter: q (string)" }` if q is missing or not a string
- `POST /upsert`  
  **Req:** `{ "records": RagRecord[] }`  
  **Res:** `{ "ok": true, "count": number }`

---

## 6. File-by-file Coding Spec (what each file does)
### 6.1 apps/api/src/index.ts
- Boots Fastify server, mounts `/agent/chat`, `/search`, `/health`.
- Validates JSON bodies; adds request `reqId` to logs.
- For `/agent/chat`: builds `AgentState` (`phase = f(nowWeek)`), calls `services/agent /respond`, returns reply+chips.
- **Logging**: request/response body masked (secrets), file log at `logs/api/app.log`.
- **Spec IDs:** API-001, API-002, API-003.

### 6.2 services/agent/src/orchestrator.ts
- `routeByPhase(state)`: 1→assessment node, 2→weekly node, 5→apps node.
- `ensureEvidence(reply, query)`: if no chips present, calls retriever `/search` for top-3, appends chips to payload.
- **Stubbed** for LangGraph replacement in `graph.ts`.
- **Spec IDs:** AGT-001, AGT-021, AGT-030.

### 6.3 services/agent/src/graph.ts
- **Target**: LangGraph definition for nodes:
  - `assessmentNode` → runs 4-Step; emits “GamePlan in 24h” promise + mini outline.
  - `weeklyNode` → consumes 168h slots; proposes schedule shifts + 3x buffer opportunities.
  - `appsNode` → verifies essay state, deadlines, and pulls APP docs as evidence.
- **Spec IDs:** AGT-050..099 (sprint backlog).

### 6.4 services/retriever/src/pineconeClient.ts
- `pineconeQuery(q,k,ns,filter)` → embeds with `text-embedding-3-small`, queries Pinecone, returns hits.
- `pineconeUpsert(records,ns)` → batch embeddings + upsert.
- **Spec IDs:** RAG-010..019.

### 6.5 services/retriever/src/server.ts
- Exposes `/search` and `/upsert` using above client.
- Validates record metadata (`week`, `phase`, `layers`, `kind`, `link`).
- **Spec IDs:** RAG-020..029.

### 6.6 packages/logger/src/index.ts
- Pino instance with pretty console + rotating file logs: `logs/<service>/app.log`.
- `child(meta)` API for per-request context.
- **Spec ID:** LOG-001..004.

### 6.7 tools/ingest/build_corpus.py
- Scans `data/raw/<coach>`; prioritizes **INTEL JSON**; falls back to DOCX/PDF extraction.
- Skips files starting with `Copy_of`.
- Outputs: `rag_index.jsonl`, `finetune_chat.jsonl`, `coverage_matrix.csv`, `parse_report.csv`.
- Naive layer tagging; TODO: plug a layer dictionary from 03-Intelligence corpus.
- **Spec IDs:** ING-001..015.

### 6.8 tools/ingest/launch_finetune.py
- Uploads JSONL to OpenAI; starts fine-tune job; prints model id.
- **Spec IDs:** FT-001..004.

---

## 7. Evidence Chips — Rules
- If the assistant asserts a factual or programmatic directive, **must include** evidence chips.  
- At least one chip from the **same phase** as the guidance; prefer `kind` that matches context:  
  - empathy scripts → `IMSG-INTEL`  
  - weekly tactics → `EXEC-INTEL`  
  - assessment → `TRANS-INTEL`  
  - application facts → `APP-DOC`  
- Each chip must include `link` back to the exact source doc.  
- Fallback: if no phase-matching doc found, attach top-1 general chip and mark `reason: "best-effort"` in logs.

---

## 8. Eval Methodology (NSM + Leading Metrics)
- **Indistinguishability** — style markers present (e.g., warmth + credibility + 24h promise); threshold ≥ 0.75.
- **Autonomy** — weekly triggers propose 168h shifts and 3-buffer opps after rejection; threshold ≥ 0.8 scenarios passed.
- **Evidence** — ≥ 95% messages with ≥ 1 correct chip.
- **Precision@K (opportunities)** — offline eval once recommender added.

**How to run:** see `MANUAL_STEPS_CHECKLIST.md` section E.

---

## 9. Security & Privacy
- No PII in logs (student names masked unless consent).  
- Keys loaded via env; never checked into repo.  
- FERPA-aware handling of application docs; evidence chips can show titles & links but not raw content unless authorized.

---

## 10. Backlog (Spec IDs)
- **AGT-05x** LangGraph nodes for assessment/weekly/apps.
- **RAG-03x** Keyword fallback if embeddings miss.
- **ING-01x** Layer dictionary loader; robust PDF parsers.
- **EVAL-0xx** Endpoints to run evals and persist scorecards.
- **UI-0xx** Minimal Next.js with Evidence Chips + Ivylevel Rings.

---

## Appendix A — More Intelligence Layers (illustrative)
- Vulnerability Matching, Hyper-Relatability, Crisis Mgmt, Parent Navigation, Counselor Navigation, Celebration Science, Rejection Alchemy, Opportunity Precision, Narrative Refinement, etc. (see PRD v10.0).

## Appendix B — Real Quotes / Facts (examples wired to layers)
- “i’m crying i just got the ncwit email NATIONAL!!!! 😭😭😭😭” → Awards + Celebration.  
- “JCamp … life changing experience!!” → Summer Strategy + Narrative.  
- SAT: 1360 (08/05/2023) → 1480 (09/16/2023) → 1490 (10/05/2023) → **1530** (02/11/2025).  
- 168h breakdown table (Week 1 Foundation).

---

## 11. v1.0.8 Updates - Fine-tuning Dataset Generation

### 11.1 Fine-tune Dataset Builder Specification
**Purpose:** Generate high-quality JSONL training data from Jenny-Huda corpus for OpenAI fine-tuning

**Inputs:**
- RAW canonical JSON files (03-Raw-SessionTranscripts/)
- INTEL JSON files (03-Intelligence-SessionTranscripts/)
- Pattern recognition and signal scoring

**Outputs:**
- `train.jsonl` (80% of data)
- `val.jsonl` (10% of data) 
- `test.jsonl` (10% of data)

### 11.2 Mining Logic
**Turn Pair Mining (from RAW transcripts):**
- Extract student questions → coach responses
- Focus on high-signal exchanges:
  - JTBD moments ("I need help with...")
  - Planning discussions ("Let's break down your week...")
  - Metrics/progress ("Your SAT went from X to Y")
  - Fit-adaptive content (personalized to Huda's context)

**Policy/Strategy Mining (from INTEL documents):**
- Extract coaching frameworks and methodologies
- Identify reusable patterns and techniques
- Map to intelligence layers (L1-L31)

### 11.3 Quality Controls
**PII Scrubbing:**
- Replace "Huda" → "the student"
- Replace "Jenny" → "the coach"
- Preserve context and meaning

**Deduplication:**
- Cap examples per topic/pattern to prevent overfitting
- Ensure diverse representation across all phases (P1-P5)
- Balance turn types (questions, guidance, celebration, crisis mgmt)

**Signal Scoring:**
- Score each turn pair on 4 dimensions:
  - JTBD clarity (0-1)
  - Planning specificity (0-1)
  - Metrics presence (0-1)
  - Fit-adaptive quality (0-1)
- Threshold: Include if avg score ≥ 0.6

### 11.4 Dataset Structure
```json
{
  "messages": [
    {
      "role": "system",
      "content": "You are Coach Jenny, an expert college admissions strategist..."
    },
    {
      "role": "user", 
      "content": "I'm overwhelmed with all these application deadlines..."
    },
    {
      "role": "assistant",
      "content": "I hear you. Let's break this down using our 168-hour framework..."
    }
  ],
  "metadata": {
    "week": 67,
    "phase": "P4",
    "topic": "deadline_management",
    "signal_scores": {
      "jtbd": 0.9,
      "planning": 0.95,
      "metrics": 0.7,
      "fit_adaptive": 0.85
    }
  }
}
```

### 11.5 Implementation Files
- `packages/scripts/src/finetune/build_finetune_dataset.ts` - Main builder
- `packages/scripts/src/finetune/validate_jsonl.ts` - Validator utility

**Spec IDs:** FT-010..019 (dataset generation), FT-020..029 (validation)

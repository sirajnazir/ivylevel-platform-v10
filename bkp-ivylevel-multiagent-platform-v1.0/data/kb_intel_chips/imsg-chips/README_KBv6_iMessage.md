# KBv6 – iMessage Intel Chips

**Where to put these files (local):**  
`data/canonical/jenny-huda/KBv6/iMessage/`

**Files in this drop:**
- `iMessage_Intel_Chips_Batch_v1.jsonl` — 12 Intel Chips derived from iMessage threads (Mar–Oct 2024 sample).
- `iMessage_Processing_Summary_v1.json` — batch metadata and ingestion guidance.

**How to embed (same pipeline as session chips):**
1. Point your embedder to `data/canonical/jenny-huda/KBv6/iMessage/iMessage_Intel_Chips_Batch_v1.jsonl`.
2. For each line/object:
   - Text to embed = `content` + `insight_vector` (concat with newline).
   - Metadata to store: `chip_id`, `type`, `source_doc.*`, `metadata.*`.
3. Upsert to Pinecone namespace `kb_v6_imessages` (or your configured vector store/namespace).

**Rationale:**
- iMessage chips capture *micro‑interventions* (tone rewrites, crisis playbooks, schedule adaptations, formatting micro‑tactics) that don’t appear in longform sessions but are decisive in execution outcomes.
- These chips use compact `insight_vector` strings to improve retrieval signal for agentic “what do I do now?” prompts.

**Safety/Privacy:**
- Keep personal emails/IDs out of embeddings. Current chips are scrubbed of PII beyond first names already present in your corpus.

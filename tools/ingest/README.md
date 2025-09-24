# Ingestion Tools

This directory contains tools for processing and ingesting data into the IvyLevel platform.

## Quick Start

### Original Pipeline
This pipeline turns raw coach data into:
- `rag_index.jsonl` (Retriever → Pinecone)
- `finetune_chat.jsonl` (OpenAI fine–tuning)

```bash
# 1. Normalize raw data
python tools/ingest/build_corpus.py --root data/raw/jenny-huda --out data/processed/jenny-huda --coach_id jenny --student_id huda --skip_prefix Copy_of

# 2. Upsert to retriever
export RETRIEVER_UPSERT_URL=http://localhost:4102/upsert
export RAG_JSONL=data/processed/jenny-huda/rag_index.jsonl
pnpm --filter @packages/scripts run upsert:jsonl

# 3. Fine-tune (optional)
python tools/ingest/launch_finetune.py --dataset data/processed/jenny-huda/finetune_chat.jsonl --suffix jenny-v0-2
```

## Opportunity Mining (v1.2.2)

The opportunity miner scans the normalized corpus to extract real opportunity mentions from transcripts, messages, and documents.

### Usage

```bash
# Build the tools
pnpm build

# Mine opportunities (dry run)
pnpm mine-opps \
  --in data/canonical/jenny-huda \
  --student huda \
  --out data/processed/jenny-huda/opportunities.jsonl \
  --dry

# Mine and emit to observations API
pnpm mine-opps \
  --in data/canonical/jenny-huda \
  --student huda \
  --observe http://localhost:4000/observe \
  --out data/processed/jenny-huda/opportunities.jsonl

# Recompute vitals after mining
curl -X POST http://localhost:4000/admin/recompute-all
```

### What It Extracts

- **Opportunity names**: Uses canonicalization to map aliases (e.g., "ncwit" → "NCWIT Aspirations in Computing")
- **Status tracking**: proposal → applied → accepted/rejected/waitlisted
- **Deadlines**: Extracts dates from context (±4 lines)
- **Categories**: Automatically classifies as summer_program, competition_award, research_program, etc.
- **Sources**: Tracks which file, week, and text span each mention came from

### Idempotency

The miner generates deterministic SHA1 hashes for each observation, preventing duplicates on re-runs.

### Supported Document Types

- Session transcripts (TRANS-RAW)
- iMessages (IMSG-RAW)  
- Execution documents (EXEC-RAW)
- GamePlan documents
- Reports
- Application documents

## Tool Scripts

- `normalize.ts` - Normalizes raw documents
- `update_turns.ts` - Updates turn-based conversations
- `imessage_turns.ts` - Processes iMessage conversations
- `speaker_cleanup.ts` - Cleans speaker labels
- `build_finetune_dataset.ts` - Builds fine-tuning datasets
- `ingest_opportunities.ts` - Manual opportunity ingestion from CSV/Excel/JSON
- `build_opportunity_ft.ts` - Builds opportunity-specific fine-tuning data
- `mine_opportunities.ts` - Automated opportunity extraction from corpus

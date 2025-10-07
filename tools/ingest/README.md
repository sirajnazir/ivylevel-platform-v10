# Ingestion Tools

This directory contains tools for processing and ingesting data into the IvyLevel platform.

---

## 🆕 KB Intel Ingestion (v5.3) - Production Ready

**NEW**: Production-grade pipeline with **embedded DOCX recovery** for ingesting coaching intelligence from local files into PostgreSQL + FAISS.

### Quick Start

```bash
# 1. Set environment variables
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"
export OPENAI_API_KEY="sk-..."

# 2. Run the full pipeline
python3 tools/ingest/ingest_local_intel_v3.py
```

### Tools

| Tool                          | Purpose                                                |
|-------------------------------|--------------------------------------------------------|
| `ingest_local_intel_v3.py`    | **v5.3**: Universal INTEL adapter + DOCX recovery      |
| `utils_docx_extract.py`       | **NEW**: Extract text from embedded DOCX ZIP bytes    |
| `utils_json_repair.py`        | **v5.3**: Enhanced JSON repair with DOCX detection    |
| `adapters_intel.py`           | **v5.3**: Schema-agnostic chip extraction + sanitization |
| `build_faiss_index.py`        | Build FAISS vector index from chips                   |
| `query_kb.py`                 | CLI search tool for testing KB queries                |

### Documentation

- **Full Guide**: `/docs/KB_INTEL_INGESTION.md`
- **Technical Spec**: `/docs/MASTER_TECHNICAL_SPEC.md` (Section: KB Intel)

### What You Get

After running the pipeline:
- **PostgreSQL**: Normalized chips in `kb_docs`, `kb_chips`, `kb_embeddings`
- **FAISS Index**: Vector search index at `artifacts/kb/kb_intel.faiss`
- **Artifacts**: CSV + JSONL for inspection/auditing at `artifacts/kb/`
- **97.5% Success Rate**: Universal adapter handles multiple INTEL schema variations
- **DOCX Recovery**: Automatically extracts text from embedded binary DOCX files

### v5.3 Features

- **Embedded DOCX Recovery**: Handles JSON files with DOCX ZIP bytes in "text"/"segments" fields
- **Universal Adapter**: Schema-agnostic recursive finder with synonym maps + shape detection
- **7 Chip Types**: jtbd, tactic, framework, micro_moment, reflection, success_path, style
- **JSON Repair**: Auto-fixes LLM-generated JSON syntax errors (trailing commas, missing values, etc.)
- **Sanitization**: Removes control characters that cause PostgreSQL errors
- **Deterministic IDs**: SHA256-based chip_id for safe re-ingestion

### Results

```
Files processed:   115/118 (97.5% success)
Total chips:       837 (713 v2 + 124 v5.3 recovered)

Chip distribution:
  micro_moment       285 ( 12,527 tokens)
  tactic             284 ( 15,571 tokens)
  jtbd               138 (  8,176 tokens)
  reflection         110 (149,455 tokens) ← NEW from DOCX recovery
  framework           20 (  1,589 tokens)
```

### Example Queries

```bash
# CLI search
python3 query_kb.py "how did Jenny coach me on NCWIT?"

# Via Jenny API
# User: "What tactics did we use for essay writing?"
# Jenny: [searches KB chips and returns coaching intelligence]
```

---

## Original Pipeline (Legacy)

### Quick Start

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

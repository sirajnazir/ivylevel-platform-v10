# Local Ingestion Pipeline (No Colab)

This pipeline turns raw coach data into:
- `rag_index.jsonl` (Retriever → Pinecone)
- `finetune_chat.jsonl` (OpenAI fine–tuning)

Filesystem quick start:
1) Put exported files under `data/raw/<coach>/`.
2) Run:
   ```bash
   python tools/ingest/build_corpus.py --root data/raw/jenny-huda --out data/processed/jenny-huda --coach_id jenny --student_id huda --skip_prefix Copy_of
   ```
3) Upsert:
   ```bash
   export RETRIEVER_UPSERT_URL=http://localhost:4102/upsert
   export RAG_JSONL=data/processed/jenny-huda/rag_index.jsonl
   pnpm --filter @packages/scripts run upsert:jsonl
   ```
4) Fine-tune (optional):
   ```bash
   python tools/ingest/launch_finetune.py --dataset data/processed/jenny-huda/finetune_chat.jsonl --suffix jenny-v0-2
   ```

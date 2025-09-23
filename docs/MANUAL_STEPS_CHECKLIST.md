# Manual Steps Checklist (Agent-first bring-up)

## A) Local dev
```bash
corepack enable && corepack prepare pnpm@latest --activate
pnpm install
export OPENAI_API_KEY=sk-...
export PINECONE_API_KEY=pcn-...
export PINECONE_INDEX=jenny-v1
export PINECONE_NAMESPACE=jenny_v1

# Start services (3 terminals)
pnpm --filter @services/retriever dev
pnpm --filter @services/agent dev
pnpm --filter @apps/api dev
```

## B) Ingest a new coach
1. Place raw exports under `data/raw/<coach>/` preserving INTEL folder structure.
2. Run:
```bash
python tools/ingest/build_corpus.py   --root data/raw/jenny-huda   --out data/processed/jenny-huda   --coach_id jenny --student_id huda   --skip_prefix Copy_of
```
Artifacts: `rag_index.jsonl`, `finetune_chat.jsonl`, `coverage_matrix.csv`, `parse_report.csv`.

## C) Upsert RAG
```bash
export RETRIEVER_UPSERT_URL=http://localhost:4102/upsert
export RAG_JSONL=data/processed/jenny-huda/rag_index.jsonl
pnpm --filter @packages/scripts run upsert:jsonl
```

## D) (Optional) Fine-tune
```bash
python tools/ingest/launch_finetune.py   --dataset data/processed/jenny-huda/finetune_chat.jsonl   --suffix jenny-v0-2
```

## E) Evaluate
```bash
# Baseline
python jenny-pipeline/eval_runner.py --suite jenny-pipeline/_templates/eval_indistinguishability.csv --model gpt-4o-mini
python jenny-pipeline/eval_runner.py --suite jenny-pipeline/_templates/eval_autonomy.csv --model gpt-4o-mini
python jenny-pipeline/eval_runner.py --suite jenny-pipeline/_templates/eval_evidence.csv --model gpt-4o-mini
# Fine-tuned
python jenny-pipeline/eval_runner.py --suite jenny-pipeline/_templates/eval_indistinguishability.csv --model <FINE_TUNED_MODEL_ID>
```

## F) Logs / Debug
- Console + file logs in `./logs/<service>/app.log`.
- Attach logs when filing a bug; mask PII.

## G) AWS (optional later)
- See `infra/terraform/prod/README.md` for the 2-user tier. Disabled by default to control cost.

# Jenny Pipeline (Colab-compatible)
_Last updated: 2025-09-23_

This folder contains the **exact scripts** we referenced earlier for the Colab flow.

Order to run (same as chat notes):
1) Upload artifacts to `/content/` in Colab (or run locally):
   - `rag_index.jsonl` (or `rag_index.ndjson`)
   - `finetune_v0_2_chat.jsonl`
   - `eval_indistinguishability.csv`
   - `eval_autonomy.csv`
   - `eval_evidence.csv`

2) Upsert RAG
   ```bash
   python pinecone_upsert.py --jsonl /content/rag_index.jsonl --index $PINECONE_INDEX --namespace $PINECONE_NAMESPACE
   ```

3) Kick off fine-tune
   ```bash
   python openai_finetune_launcher.py --dataset /content/finetune_v0_2_chat.jsonl --suffix jenny-v0-2
   ```

4) Evaluate (baseline → fine-tuned)
   ```bash
   # baseline
   python eval_runner.py --suite /content/eval_indistinguishability.csv --model gpt-4o-mini
   python eval_runner.py --suite /content/eval_autonomy.csv --model gpt-4o-mini
   python eval_runner.py --suite /content/eval_evidence.csv --model gpt-4o-mini

   # fine-tuned (replace MODEL_ID with the one returned by fine-tune launcher)
   python eval_runner.py --suite /content/eval_indistinguishability.csv --model MODEL_ID
   python eval_runner.py --suite /content/eval_autonomy.csv --model MODEL_ID
   python eval_runner.py --suite /content/eval_evidence.csv --model MODEL_ID
   ```

Environment variables required:
- `OPENAI_API_KEY`
- `PINECONE_API_KEY`
- `PINECONE_INDEX` (e.g., `jenny-v1`)
- `PINECONE_NAMESPACE` (e.g., `jenny_v1`)

Notes:
- These scripts are **standalone** and do not require the monorepo to run.
- They output logs to stdout and create small JSONL/CSV outputs next to the input file for provenance.

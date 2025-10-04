# Ivylevel v1 — Master Technical Spec
_Last updated: 2025-09-23_

**NSM:** Agent indistinguishable from human Jenny for Real Huda + New Student.  
**Focus:** Agent quality & evidence; infra optional.

## Repo layout
- services/agent — phase graph stub (swap in LangGraph + fine-tuned model)
- services/retriever — Pinecone RAG (OpenAI embeddings, upsert/query)
- apps/api — REST gateway for chat/search
- packages/logger — pino logger (console + file)
- packages/types — shared types
- packages/scripts — JSONL → Pinecone upsert
- infra/terraform/prod — AWS 2-user tier (optional)
- scripts/aws-cost-*.{py,sh}

## Env
OPENAI_API_KEY, PINECONE_API_KEY, PINECONE_INDEX, PINECONE_NAMESPACE

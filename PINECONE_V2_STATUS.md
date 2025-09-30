# Pinecone V2 Index Status

## ✅ Index Created
- **Name**: jenny-v2
- **Dimension**: 1536 (for text-embedding-3-small)
- **Metric**: cosine
- **Status**: Ready and accepting vectors

## 🔄 Data Ingestion Progress
- **Total entries to ingest**: 1,115
- **Processed so far**: 299+ vectors
- **Namespaces**:
  - `transcript`: 1,108 entries (in progress)
  - `appdoc`: 1 entry
  - `gameplan`: 6 entries
  - `exec`: 0 entries (no data found in current ETL)
  - `imessage`: 0 entries (no data found in current ETL)

## 📝 To Complete Setup

1. **Resume the upsert** (it's using checkpoints, so it will continue where it left off):
   ```bash
   cd /Users/snazir/ivylevel-platform-v10/packages/scripts
   PINECONE_INDEX=jenny-v2 node dist/upsert_by_namespace.cjs jenny-v2 /Users/snazir/ivylevel-platform-v10/data/kbase/rag_index_v2.jsonl
   ```

2. **Update environment variables** for services:
   ```bash
   # In your .env or when starting services:
   PINECONE_INDEX=jenny-v2
   PINECONE_NAMESPACE=transcript  # Default namespace
   ```

3. **Restart services** with new index:
   ```bash
   PINECONE_INDEX=jenny-v2 pnpm --filter services/retriever dev
   PINECONE_INDEX=jenny-v2 pnpm --filter services/agent dev
   ```

## 🧪 Testing the New Index

Test query already shows it's working:
```
Query: "What is my SAT score?"
Top result: Student asked: "How's your sat going?"
```

Once fully populated, the index will support:
- Kind-locked retrieval by namespace
- Phase-aware filtering
- Week-based queries
- Evidence-first responses

## 📊 Monitoring

Check index stats:
```bash
PINECONE_INDEX=jenny-v2 node dist/pinecone_stats.js
```

Test specific queries:
```bash
node dist/test_pinecone_v2.cjs
```

## ⚠️ Important Notes

1. The old `jenny-v1` index is still the default in most scripts
2. You need to explicitly set `PINECONE_INDEX=jenny-v2` when running services
3. The namespace structure is different (transcript, exec, etc. vs the old structure)
4. Make sure to update any deployment configs to use the new index name
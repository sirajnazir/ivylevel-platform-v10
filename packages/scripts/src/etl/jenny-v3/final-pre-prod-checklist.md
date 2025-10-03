# Jenny v3 Final Pre-Production Checklist

## ✅ API Environment
```bash
# Set the correct Pinecone index
export PINECONE_INDEX=jenny-v3-3072-20250930

# Restart the service
# (restart command depends on your deployment method)
```

## ✅ OpenAPI Spec Updates
- [x] Fixed /health response schema: `{ "ok": true }`
- [x] Fixed /lifecycle response type: returns array instead of object wrapper

## ✅ Postman Collection
- Created: `jenny-v3-postman-collection.json`
- Import into Postman to test all endpoints
- Includes variables: baseUrl, apiKey, studentId (defaults to huda-2025)

## ✅ Golden 20 Verification
Run the Postman collection and ensure:
- [ ] Health endpoint returns `{ "ok": true }`
- [ ] Vitals endpoint returns facts with source_id references
- [ ] Lifecycle endpoint returns array of items
- [ ] Search endpoint returns chips ≥1 for factful queries
- [ ] No facts/outcomes appear in vector hits (only in vitals/lifecycle)
- [ ] 412 error when querying student with no facts

## ✅ Index Cleanup
```bash
# Archive old 1536-dim indexes
# (Use Pinecone dashboard or CLI to delete old indexes)
# Keep only: jenny-v3-3072-20250930
```

## ✅ Cron Jobs
```bash
# Add to crontab:
# Nightly FTS refresh
0 2 * * * psql "postgresql://postgres:postgres@localhost:5432/ivylevel" -c "SELECT refresh_fts();"

# Weekly reindex (optional)
0 3 * * 0 cd /path/to/project && ./reindex_weekly.sh
```

## 🎯 Current Status
- Pinecone Index: `jenny-v3-3072-20250930` (3072 dims, text-embedding-3-large)
- Total Records: 148 JTBDs + 346 Interactions = 494 vectors
- Facts in PostgreSQL: 264 (including golden SAT: 1530 on 2024-04-17)
- Sources: 265 with canonical IDs (SRC-XXXX format)
- Architecture: Vitals-first with facts from PostgreSQL, narrative from Pinecone
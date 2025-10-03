# Jenny v3 Go-Live Checklist Results 🚀

## 1. Environment Consistency ✅
- **Runtime uses PINECONE_INDEX**: ✓ Verified
  - All runtime code (`services/retriever`, `services/jenny-api`) uses `process.env.PINECONE_INDEX`
  - ETL scripts use `PINECONE_INDEX_NAME` for generation only
- **Required env vars for production**:
  - `PINECONE_INDEX=jenny-v3-3072-20250930`
  - `OPENAI_API_KEY` (for embeddings)
  - `PINECONE_API_KEY` (for vector search)
  - `DATABASE_URL` (PostgreSQL connection)

## 2. Observability & SLOs 📊
**To implement before production:**
- [ ] Query logging with p95 latency tracking (target: <1.5s on `/search`)
- [ ] Alerts needed:
  - p95 latency breach
  - 5xx rate threshold
  - Vector upsert errors
  - DB connection pool exhaustion
- [ ] Log retention: Configure 7-14 days

## 3. Security & Quotas 🔒
**To implement before production:**
- [ ] Enable `X-API-Key` middleware for production
- [ ] Rate limiting (suggested: 100 req/min per key)
- [ ] Tighter limits on write routes if applicable

## 4. Data Hygiene Invariants ✅
All SQL checks **PASSED**:
- Facts without sources: **0** ✓
- Orphaned admission outcomes: **0** ✓
- Raw transcripts in scoring: **0** ✓

## 5. Index Hygiene ✅
- **Current index**: `jenny-v3-3072-20250930` (3072 dims)
- **Namespaces**: Only `jtbd` (148) and `interactions` (345) ✓
- **Old indexes**: `jenny-v3-20250930` (1536 dims) ⚠️ **Needs archival**

## Action Items Before Production

### Immediate:
1. Archive old Pinecone index: `jenny-v3-20250930`
2. Set production environment variables

### Before Go-Live:
1. Implement API key authentication
2. Add rate limiting
3. Set up monitoring/alerting
4. Configure log retention

### Post Go-Live:
1. Monitor p95 latencies
2. Watch for 5xx errors
3. Review query patterns for optimization

## Deployment Command
```bash
# Production environment
export PINECONE_INDEX=jenny-v3-3072-20250930
export DATABASE_URL=<production_postgres_url>
export OPENAI_API_KEY=<api_key>
export PINECONE_API_KEY=<api_key>

# Start service
cd services/jenny-api
npm run build
npm start
```
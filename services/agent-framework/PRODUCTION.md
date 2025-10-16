# Jenny API - Production Deployment Guide

## Production Enhancements

This guide covers all production-ready enhancements added to Jenny API v3.

### 1. Facts-First Guardrail ✅

The orchestrator now enforces evidence requirements:
- Returns HTTP 412 if no source-backed facts exist
- Ensures factual claims always have provenance
- Located in: `src/orchestrator/index.ts`

### 2. Analytics with n≥5 Gating ✅

Tactic-outcome correlations now show:
- Actual counts when n≥5 data points exist
- `{ note: "insufficient data (n<5)" }` for sparse data
- Prevents noisy/misleading rates
- Located in: `src/services/analytics.ts`

### 3. Observability & Query Logging ✅

All API requests are logged to `query_log` table:
- Route, student_id, query text
- Latency measurements
- Hit counts and evidence chip counts
- Index name for debugging
- Auto-cleanup after 7 days

Create the table:
```bash
psql $DATABASE_URL -f src/indexers/sql/query_log.sql
```

Monitor performance:
```sql
-- p95 latency check
SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) 
FROM query_log 
WHERE ts > now() - interval '1 hour';
```

### 4. Authentication & Rate Limiting ✅

**API Key Authentication:**
- Set `API_KEY` environment variable
- Pass via `x-api-key` header
- `/health` endpoints remain public

**Rate Limiting:**
- 120 requests/minute per IP
- Memory-based (resets on restart)
- Returns HTTP 429 when exceeded

### 5. Pagination Caps ✅

Prevents large payload attacks:
- Facts limited to 500 most recent
- Search results capped at 50
- Evidence resolution optimized

### 6. Health Monitoring ✅

**Basic health:** `GET /health`

**Detailed health:** `GET /health/details`
```json
{
  "ok": true,
  "index_name": "jenny-v3-20250930-1430",
  "db_ping": "ok",
  "fts_freshness_hours": {
    "jtbd_age": 2.5,
    "interactions_age": 2.5
  },
  "uptime_seconds": 3600,
  "memory_mb": 128
}
```

### 7. Container Deployment ✅

**Build image:**
```bash
docker build -t jenny-api .
```

**Run container:**
```bash
docker run -d \
  --name jenny-api \
  -p 8787:8787 \
  --env-file .env \
  jenny-api
```

**GitHub Container Registry:**
- Automated builds on push to main
- Tagged with branch and SHA
- See `.github/workflows/ci.yml`

### 8. Scheduled Maintenance ✅

Set up cron jobs:
```bash
./scripts/cron-setup.sh
```

**Nightly (2 AM UTC):** FTS refresh
```bash
psql $DATABASE_URL -c 'SELECT refresh_fts();'
```

**Daily (3 AM UTC):** Log cleanup
```bash
psql $DATABASE_URL -c 'SELECT cleanup_old_logs();'
```

**Weekly (optional):** Clean reindex
- Creates timestamped index
- Outputs new index name
- Requires manual env update

### 9. Production Checklist ✅

Run before deployment:
```bash
./scripts/production-checklist.sh
```

Validates:
- Environment variables
- Database connectivity
- Build status
- API health
- Golden queries
- Performance metrics
- Cron jobs
- Docker readiness

### 10. Golden Query Testing ✅

Test critical paths:
```bash
./scripts/golden-queries.sh
```

Pass criteria:
- ✅ Facts have source_id
- ✅ No outcomes in vector search
- ✅ Evidence chips exist
- ✅ Lifecycle data correct
- ✅ Analytics show n≥5 gating

## Deployment Steps

### 1. Pre-deployment
```bash
# Run checklist
./scripts/production-checklist.sh

# Test golden queries
API_KEY=your-key ./scripts/golden-queries.sh
```

### 2. Deploy
```bash
# Build and push image
docker build -t ghcr.io/your-org/jenny-api:latest .
docker push ghcr.io/your-org/jenny-api:latest

# Deploy to your platform
kubectl set image deployment/jenny-api jenny-api=ghcr.io/your-org/jenny-api:latest
```

### 3. Post-deployment
```bash
# Verify health
curl https://api.jenny.ai/health/details

# Check logs
kubectl logs -f deployment/jenny-api

# Monitor query performance
psql $DATABASE_URL -c "
  SELECT route, percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95
  FROM query_log 
  WHERE ts > now() - interval '1 hour'
  GROUP BY route
"
```

### 4. Set up monitoring
```bash
# Set up cron jobs on a persistent node
./scripts/cron-setup.sh

# Enable alerts for:
# - p95 latency > 1500ms
# - Error rate > 1%
# - FTS freshness > 48 hours
```

## Rollback Plan

If issues arise:

1. **Revert deployment:**
   ```bash
   kubectl rollout undo deployment/jenny-api
   ```

2. **Switch Pinecone index:**
   ```bash
   # Use previous index
   kubectl set env deployment/jenny-api PINECONE_INDEX=jenny-v3-previous
   ```

3. **Check logs:**
   ```bash
   # Query errors
   psql $DATABASE_URL -c "
     SELECT ts, route, student_id, latency_ms 
     FROM query_log 
     WHERE latency_ms > 5000 
     ORDER BY ts DESC LIMIT 20
   "
   ```

## Performance Targets

- **p95 latency:** < 1500ms
- **Error rate:** < 0.1%
- **Uptime:** > 99.9%
- **FTS freshness:** < 24 hours

## Security Notes

- API key rotated monthly
- Database credentials in secrets manager
- No PII in logs
- TLS required for all connections
- Rate limiting prevents DoS

## Support

- Logs: `/var/log/jenny-api-*.log`
- Metrics: Query `query_log` table
- Health: `/health/details` endpoint
- Alerts: Configure based on query_log metrics
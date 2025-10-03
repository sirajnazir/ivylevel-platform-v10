# Jenny v3 Production Ready 🚀

## ✅ Final Actions Completed

### 1. Old Index Archived
- **Deleted**: `jenny-v3-20250930` (1536 dims) ✓
- **Kept**: `jenny-v3-3072-20250930` (3072 dims) ✓

### 2. Production Hardening Scripts Created
- `production_sanity_checks.sh` - Run sanity tests before go-live
- `production_launch.sh` - Launch script with all env vars

## 🚦 Production Checklist

### Environment Variables
```bash
# Required
export PINECONE_INDEX=jenny-v3-3072-20250930
export DATABASE_URL="postgresql://<user>:<pass>@<host>:5432/<db>"
export OPENAI_API_KEY="<key>"
export PINECONE_API_KEY="<key>"
export API_KEY="<strong-random-key>"

# Optional hardening
export RATE_LIMIT_RPM=100
export RATE_LIMIT_WINDOW_MS=60000
export LOG_LEVEL=info
export LOG_RETENTION_DAYS=14
```

### Cron Jobs
```bash
# Add to production crontab
crontab -e

# Nightly FTS refresh
0 2 * * * psql "$DATABASE_URL" -c "SELECT refresh_fts();"

# Optional weekly reindex
0 3 * * 0 cd /path/to/repo/packages/scripts/src/etl/jenny-v3 && ./reindex_weekly.sh
```

### Quick Sanity Test
```bash
# Run before go-live
chmod +x production_sanity_checks.sh
./production_sanity_checks.sh
```

### Launch Command
```bash
chmod +x production_launch.sh
./production_launch.sh
```

## 📊 System Status
- **Facts/Lifecycle**: PostgreSQL ✓
- **JTBD + Interactions**: Pinecone (3072) ✓
- **Guardrails**: 412 on no evidence ✓
- **API Docs**: Swagger UI at `/docs` ✓
- **Postman**: Collection ready ✓

## 🎯 You're ready to ship!

The Jenny v3 system is production-ready with:
- Vitals-first architecture
- Evidence-backed responses
- Proper index configuration
- Production hardening options

Green light! 🚦
# 📘 Operator Runbook

## Version History
- v1.1.1 - Vitals standardization, facts-first policy
- v1.2.0 - Smart Precision Opportunity Recommendation Engine [NEW]

## Quick Reference

### Service Management

#### Start All Services
```bash
# Development
pnpm dev

# Production (with PM2)
pm2 start ecosystem.config.js
pm2 logs --lines 100
```

#### Restart Services
```bash
# Individual services
pm2 restart api
pm2 restart agent
pm2 restart retriever

# All services
pm2 restart all

# View logs
pm2 logs agent --lines 100
pm2 logs api --lines 100
```

#### Check Service Status
```bash
# PM2 status
pm2 status

# Health checks
curl http://localhost:4000/health    # API
curl http://localhost:4101/health    # Agent
curl http://localhost:4102/health    # Retriever

# Database connection
psql -U postgres -d ivylevel -c "SELECT COUNT(*) FROM observations;"
```

## Common Operations

### 1. Recompute Student Vitals

#### Single Student
```bash
curl -X POST http://localhost:4000/admin/recompute \
  -H "content-type: application/json" \
  -d '{"studentId":"huda"}'
```

#### All Students
```bash
curl -X POST http://localhost:4000/admin/recompute-all
```

#### Via Database (Emergency)
```sql
-- Check last vitals update
SELECT student_id, updated_at 
FROM student_state 
ORDER BY updated_at DESC;

-- Force recompute by clearing vitals
UPDATE student_state 
SET vitals = '{}', updated_at = NOW() - INTERVAL '1 day' 
WHERE student_id = 'huda';
```

### 2. Backfill Operations

#### Quick Backfill (All Types)
```bash
cd tools/backfill

# Run all legacy backfills
pnpm run emit-huda
pnpm run emit-execution  
pnpm run emit-applications

# Recompute vitals
curl -s -X POST http://localhost:4000/admin/recompute-all
```

#### Full Pipeline Backfill (Detailed)
```bash
cd tools/backfill

# 1. GamePlan targets
pnpm emit-gameplan /data/canonical/jenny-huda/01-* huda

# 2. Execution updates
pnpm emit-execution /data/canonical/jenny-huda/02-* huda

# 3. College decisions
pnpm emit-college-decisions /data/canonical/jenny-huda/09-*/huda-final-college-list-and-decisions.json huda

# 4. Application subset
pnpm emit-apps /data/canonical/jenny-huda/09-* huda

# 5. Recompute after backfill
curl -X POST http://localhost:4000/admin/recompute-all
```

#### Single Observation Type
```bash
# Just college decisions
cd tools/backfill
pnpm emit-college-decisions <json-file> huda
```

### 3. Data Ingestion & Normalization

#### Normalize Raw Data
```bash
cd tools/ingest
pnpm build

# Normalize a specific folder
pnpm normalize /data/raw/jenny-huda/02-* /data/canonical/jenny-huda/02-*

# Normalize everything
pnpm normalize /data/raw/jenny-huda /data/canonical/jenny-huda
```

#### Process Excel/CSV Files
```bash
# College decisions Excel → JSON → Observations
pnpm normalize /path/to/excel/folder /output/folder
cd ../backfill
pnpm emit-college-decisions /output/folder/college-decisions.json huda
```

### 4. Vector Store (Pinecone) Operations

#### Check Index Stats
```bash
# Via retriever service
curl http://localhost:4102/stats

# Direct (requires PINECONE_API_KEY)
node -e "
const { Pinecone } = require('@pinecone-database/pinecone');
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
pc.index('jenny-huda-v1').describeIndexStats().then(console.log);
"
```

#### Reindex Documents
```bash
cd packages/scripts
PINECONE_API_KEY=xxx PINECONE_INDEX=jenny-huda-v1 \
  pnpm ts-node src/upsert_direct.ts /data/processed/jenny-huda/rag_index.jsonl
```

### 5. Fine-Tuning Operations

#### Launch New Fine-Tune
```bash
cd packages/scripts

# Validate dataset
pnpm validate-ft /data/processed/jenny-huda/finetune.jsonl

# Upload and start
OPENAI_API_KEY=xxx pnpm launch-ft \
  --dataset /data/processed/jenny-huda/finetune.jsonl \
  --model gpt-4o-mini-2024-07-18 \
  --suffix jenny-v2
```

#### Check Fine-Tune Status
```bash
curl https://api.openai.com/v1/fine_tuning/jobs \
  -H "Authorization: Bearer $OPENAI_API_KEY" | jq '.data[0]'
```

## Troubleshooting

### Service Won't Start

#### Port Already in Use
```bash
# Find process using port
lsof -i :4000  # API
lsof -i :4101  # Agent
lsof -i :4102  # Retriever

# Kill process
kill $(lsof -t -i:4000)

# Or force kill
kill -9 $(lsof -t -i:4000)
```

#### Database Connection Failed
```bash
# Check PostgreSQL status
pg_ctl status
brew services list | grep postgresql

# Start PostgreSQL
brew services start postgresql@14

# Check connection
psql -U postgres -d ivylevel -c "SELECT 1;"
```

### Agent Not Using Vitals

1. Check observations exist:
```sql
SELECT kind, COUNT(*) 
FROM observations 
WHERE student_id = 'huda' 
GROUP BY kind;
```

2. Force recompute:
```bash
curl -X POST http://localhost:4000/admin/recompute \
  -d '{"studentId":"huda"}'
```

3. Check vitals populated:
```bash
curl http://localhost:4000/students/huda/state | jq '.apps.collegeList | length'
```

### Facts Returning Generic Responses

1. Check NEVER_BLANK_MODE:
```bash
grep NEVER_BLANK_MODE services/agent/.env
# Should be: NEVER_BLANK_MODE=1
```

2. Verify temperature settings:
```bash
grep -E "temperature|TEMPERATURE" services/agent/src/orchestrator.ts
# Facts should use 0.3, conversation 0.7
```

3. Test directly:
```bash
curl -X POST http://localhost:4101/respond \
  -H "content-type: application/json" \
  -d '{"studentId":"huda","message":"What is my SAT score?"}'
```

### Database Migrations

#### Run Migrations
```bash
cd apps/api
node db/run-migrations.js

# Or manually
psql -U postgres -d ivylevel -f db/migrations/2025-09-24-vitals-observations-outcomes.sql
```

#### Check Migration Status
```sql
SELECT * FROM migrations ORDER BY executed_at DESC;
```

## Rollback Procedures

### Quick Rollback Commands

```bash
# 1. Restore Database
psql $DATABASE_URL < backups/pg-2025-09-24-v1.1.0.sql

# 2. Revert to Production Tag
git checkout v1.1.0-prod

# 3. Restart Services
pm2 restart all
```

### Code Rollback

#### To Previous Tag
```bash
# List tags
git tag -l "v1.1.*"

# Checkout previous version
git checkout v1.1.0

# Create hotfix branch
git checkout -b hotfix/v1.1.0-fix
```

#### Emergency Revert
```bash
# Find commit to revert to
git log --oneline -10

# Reset hard (DESTRUCTIVE)
git reset --hard <commit-hash>

# Force deploy
pm2 restart all
```

### Database Rollback

#### Backup Before Changes
```bash
pg_dump -U postgres -d ivylevel > backups/pre-change-$(date +%F-%H%M).sql
```

#### Restore from Backup
```bash
# Stop services first
pm2 stop all

# Restore (with connection string)
psql $DATABASE_URL < backups/pg-2025-09-24-v1.1.0.sql

# Or with explicit params
psql -U postgres -d ivylevel < backups/pg-2025-09-24-v1.1.0.sql

# Restart
pm2 restart all
```

### Vitals Rollback

#### Clear Specific Observations
```sql
-- Remove bad observations by date
DELETE FROM observations 
WHERE created_at > '2025-09-24 20:00:00' 
AND kind = 'APPS';

-- Clear vitals to force recompute
UPDATE student_state 
SET vitals = '{}', updated_at = NOW() - INTERVAL '1 day';
```

## Monitoring & Alerts

### Log Locations
```bash
# PM2 logs
~/.pm2/logs/

# Application logs
logs/api.log
logs/agent.log
logs/retriever.log

# System logs
/tmp/api.log  # Development
```

### Key Metrics to Monitor

1. **API Response Times**
```bash
# Check recent request times
grep "request.start" logs/api.log | tail -20
```

2. **Vitals Freshness**
```sql
SELECT 
  student_id,
  updated_at,
  NOW() - updated_at as age
FROM student_state
ORDER BY updated_at DESC;
```

3. **Observation Pipeline**
```sql
-- Observations per day
SELECT 
  DATE(created_at) as date,
  kind,
  COUNT(*)
FROM observations
GROUP BY DATE(created_at), kind
ORDER BY date DESC;
```

### Health Check Script
```bash
#!/bin/bash
# save as scripts/health-check-all.sh

echo "=== Service Health ==="
curl -s http://localhost:4000/health | jq '.ok' | xargs echo "API:"
curl -s http://localhost:4101/health | jq '.ok' | xargs echo "Agent:"
curl -s http://localhost:4102/health | jq '.ok' | xargs echo "Retriever:"

echo -e "\n=== Database Health ==="
psql -U postgres -d ivylevel -t -c "SELECT 'Observations:', COUNT(*) FROM observations;"
psql -U postgres -d ivylevel -t -c "SELECT 'Students:', COUNT(*) FROM student_state;"

echo -e "\n=== Latest Activity ==="
psql -U postgres -d ivylevel -t -c "
SELECT 'Last observation:', MAX(created_at) FROM observations;
"
```

## Security Checklist

### Regular Tasks

1. **Rotate API Keys** (Monthly)
```bash
# Update in .env files
OPENAI_API_KEY=sk-proj-xxx
PINECONE_API_KEY=pcsk_xxx

# Restart services
pm2 restart all
```

2. **Check for Exposed Secrets**
```bash
# Scan for keys
grep -r "sk-" . --exclude-dir=node_modules --exclude-dir=.git | grep -v ".env"

# Check git history
git log -p | grep -E "sk-|key=|secret=" | head -20
```

3. **Database Backups** (Daily via cron)
```bash
# Add to crontab
0 3 * * * pg_dump -U postgres ivylevel > /backups/ivylevel-$(date +\%F).sql
```

## Contact & Escalation

- **Primary**: Engineering Team Slack #ivylevel-ops
- **Database Issues**: DBA on-call
- **API Keys**: Security team for rotation
- **Business Logic**: Product team for vitals/observations questions

---

## v1.2 Opportunity Services

### Service Ports
- Opportunity Catalog: 4202
- Opportunity Scorer: 4203  
- Opportunity Recommender: 4204

### Start Opportunity Services
```bash
# Start all opportunity services
pm2 start ecosystem.opportunities.config.js

# Start individually
pm2 start opportunity-catalog
pm2 start opportunity-scorer
pm2 start opportunity-recommender
```

### Health Checks
```bash
curl http://localhost:4202/health  # Catalog
curl http://localhost:4203/health  # Scorer
curl http://localhost:4204/health  # Recommender
```

### Common Operations

#### Ingest Opportunities
```bash
cd tools/ingest
pnpm build
pnpm ingest-opportunities <file.csv|json|xlsx> "source-name"
```

#### Get Recommendations
```bash
# All recommendations
curl "http://localhost:4000/students/huda/opportunities/recommendations"

# By type
curl "http://localhost:4000/students/huda/opportunities/recommendations?kinds=summer"

# By bucket
curl "http://localhost:4000/students/huda/opportunities/recommendations?buckets=immediate_action"
```

#### Create Bombardment
```bash
curl -X POST http://localhost:4000/students/huda/opportunities/bombardment \
  -H "Content-Type: application/json" \
  -d '{
    "trigger": {"type": "morale_drop"},
    "size": 5
  }'
```

#### Track Opportunity Application
```bash
curl -X POST http://localhost:4000/observe \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "huda",
    "kind": "OPPORTUNITY",
    "subtype": "APPLIED",
    "value": {"opportunity_id": "opp-123"},
    "source": "manual",
    "at": "2025-01-15"
  }'
```

### Troubleshooting

#### No Recommendations Showing
1. Check opportunities exist:
```sql
SELECT COUNT(*) FROM opportunities;
SELECT kind, COUNT(*) FROM opportunities GROUP BY kind;
```

2. Check scores exist:
```sql
SELECT COUNT(*) FROM opportunity_scores WHERE student_id = 'huda';
```

3. Trigger rescoring:
```bash
curl -X POST http://localhost:4203/scores/recalculate/huda
```

#### Scoring Issues
1. Check vitals exist for student
2. Verify opportunity requirements are reasonable
3. Check scorer logs: `pm2 logs opportunity-scorer`

#### Agent Not Showing Opportunities
1. Verify agent has latest code with opportunity support
2. Check API proxy endpoints are working
3. Test directly: Ask "What summer programs should I apply to?"

---

Last Updated: 2025-09-25
Version: v1.2.0
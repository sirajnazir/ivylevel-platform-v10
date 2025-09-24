#!/bin/bash

# v1.2 Update Script - Smart Precision Opportunity Recommendation Engine
# Run this script to update from v1.1.x to v1.2.0

set -e

echo "🚀 Starting v1.2 update process..."
echo

# 1. Backup current database
echo "📦 Backing up database..."
pg_dump $DATABASE_URL > backups/pg-$(date +%Y-%m-%d)-pre-v1.2.sql
echo "✅ Database backed up"
echo

# 2. Run database migration
echo "🗄️ Running v1.2 database migration..."
psql $DATABASE_URL < apps/api/db/migrations/2025-09-25-opportunities-v1.2.sql
echo "✅ Database migration complete"
echo

# 3. Build services
echo "🔨 Building opportunity services..."
cd services/opportunity-catalog && pnpm install && pnpm build && cd ../..
cd services/opportunity-scorer && pnpm install && pnpm build && cd ../..
cd services/opportunity-recommender && pnpm install && pnpm build && cd ../..
echo "✅ Services built"
echo

# 4. Build updated API and Agent
echo "🔨 Building updated API and Agent..."
cd apps/api && pnpm build && cd ../..
cd services/agent && pnpm build && cd ../..
echo "✅ API and Agent updated"
echo

# 5. Build ingestion tools
echo "🔨 Building ingestion tools..."
cd tools/ingest && pnpm install && pnpm build && cd ../..
echo "✅ Ingestion tools ready"
echo

# 6. Start new services
echo "🚀 Starting opportunity services..."
pm2 start ecosystem.opportunities.config.js
echo "✅ Opportunity services started"
echo

# 7. Restart updated services
echo "♻️ Restarting API and Agent..."
pm2 restart api agent
echo "✅ Services restarted"
echo

# 8. Load sample opportunities (optional)
read -p "Load sample opportunities? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📥 Loading sample opportunities..."
    cd tools/ingest
    node dist/ingest_opportunities.js sample_opportunities.json "v1.2-sample"
    cd ../..
    echo "✅ Sample opportunities loaded"
fi
echo

# 9. Run smoke tests
echo "🧪 Running smoke tests..."
curl -s http://localhost:4202/health | grep -q "ok" && echo "✅ Catalog service healthy"
curl -s http://localhost:4203/health | grep -q "ok" && echo "✅ Scorer service healthy"
curl -s http://localhost:4204/health | grep -q "ok" && echo "✅ Recommender service healthy"
curl -s http://localhost:4000/opportunities | grep -q "opportunities" && echo "✅ API proxy working"
echo

echo "🎉 v1.2 update complete!"
echo
echo "Next steps:"
echo "1. Run evaluation suite: ./services/agent/tests/run-opportunity-eval.sh"
echo "2. Ingest your opportunity data: cd tools/ingest && pnpm ingest-opportunities <file>"
echo "3. Test with: curl http://localhost:4000/students/huda/opportunities/recommendations"
echo
echo "📖 See docs/v1.2_RELEASE_NOTES.md for full details"
#!/bin/bash

echo "=== Jenny v3 Final Self-Checks ==="
echo

# 1) API points to the new index
echo "1. Checking PINECONE_INDEX environment variable:"
export PINECONE_INDEX=jenny-v3-3072-20250930
echo "PINECONE_INDEX=$PINECONE_INDEX"
echo

# 2) Database connection test
echo "2. Testing PostgreSQL connection and facts retrieval:"
psql "postgresql://postgres:postgres@localhost:5432/ivylevel" -c "
SELECT 
  'Golden SAT' as test,
  kind,
  value,
  fact_date,
  confidence,
  source_id
FROM vital_facts
WHERE student_id = 'huda-2025' 
  AND kind = 'sat_total_score'
  AND value = '1530'
LIMIT 1;
"
echo

# 3) Pinecone index verification
echo "3. Verifying Pinecone index structure:"
node -e "
const { Pinecone } = require('@pinecone-database/pinecone');
require('dotenv').config();

(async () => {
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pc.index('jenny-v3-3072-20250930');
  
  try {
    const stats = await index.describeIndexStats();
    console.log('Index Stats:', {
      totalRecordCount: stats.totalRecordCount,
      namespaces: Object.keys(stats.namespaces || {}),
      dimension: stats.dimension
    });
    
    // Check namespaces
    for (const [ns, data] of Object.entries(stats.namespaces || {})) {
      console.log(\`  - \${ns}: \${data.recordCount} records\`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
"
echo

# 4) Environment consistency check
echo "4. Environment consistency check:"
echo "PINECONE_INDEX=$PINECONE_INDEX"
echo "DATABASE_URL=${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/ivylevel}"
echo

# 5) Archive reminder
echo "5. Archive old indexes reminder:"
echo "Old indexes to archive:"
echo "  - jenny-v2 (1536 dimensions)"
echo "  - Any other v2/v1 indexes"
echo "Keep only: jenny-v3-3072-20250930"
echo

# 6) Cron setup reminder
echo "6. Cron setup reminder:"
echo "Add to crontab with: crontab -e"
echo ""
echo "# Nightly FTS refresh"
echo "0 2 * * * psql \"postgresql://postgres:postgres@localhost:5432/ivylevel\" -c \"SELECT refresh_fts();\""
echo ""
echo "# Weekly reindex (optional)"
echo "0 3 * * 0 cd $(pwd) && ./reindex_weekly.sh"
echo

echo "=== Self-checks complete ==="
echo
echo "Note: To test the API endpoints, start the Jenny API server with:"
echo "  cd /services/jenny-api && npm run dev"
echo "Then access:"
echo "  - Health: http://localhost:8787/health"
echo "  - Docs: http://localhost:8787/docs"
echo "  - Import jenny-v3-postman-collection.json into Postman for full testing"
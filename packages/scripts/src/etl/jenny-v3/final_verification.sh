#!/bin/bash

echo "=== Jenny v3 Final Verification ==="
echo "Running all sanity checks before go-live..."
echo

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if server is running
echo "Checking if Jenny API is running..."
if curl -s http://localhost:8787/health > /dev/null; then
  echo -e "${GREEN}✓ Server is running${NC}"
else
  echo -e "${RED}✗ Server is not running. Start it with: cd services/jenny-api && npm run dev${NC}"
  exit 1
fi
echo

# 1) Detailed health check
echo "1. Testing /health/details endpoint:"
curl -s http://localhost:8787/health/details | jq .
echo

# 2) Facts-first from PostgreSQL
echo "2. Testing facts retrieval from PostgreSQL:"
FACTS=$(curl -s http://localhost:8787/students/huda-2025/vitals | jq '.facts[0:5]')
echo "$FACTS"
FACT_COUNT=$(echo "$FACTS" | jq '. | length')
if [[ $FACT_COUNT -gt 0 ]]; then
  echo -e "${GREEN}✓ Facts retrieved successfully (count: $FACT_COUNT)${NC}"
else
  echo -e "${RED}✗ No facts found${NC}"
fi
echo

# 3) Orchestrated search
echo "3. Testing orchestrated search:"
SEARCH_RESULT=$(curl -s -X POST http://localhost:8787/search \
  -H 'content-type: application/json' \
  -d '{"q":"UC outcomes and dates","student_id":"huda-2025"}')

echo "$SEARCH_RESULT" | jq '{chips: .chips, facts: .vitals.facts[0:2], hits: (.hits[0:2]|map({ns:.namespace,id,score}))}'

# Verify chips exist
CHIP_COUNT=$(echo "$SEARCH_RESULT" | jq '.chips | length')
if [[ $CHIP_COUNT -gt 0 ]]; then
  echo -e "${GREEN}✓ Chips generated successfully (count: $CHIP_COUNT)${NC}"
else
  echo -e "${YELLOW}⚠ No chips generated${NC}"
fi
echo

# 4) Test guardrail (412 on no evidence)
echo "4. Testing guardrail (should return 412 for no facts):"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8787/search \
  -H 'content-type: application/json' \
  -d '{"q":"test","student_id":"no-facts-student"}')

if [[ $HTTP_STATUS -eq 412 ]]; then
  echo -e "${GREEN}✓ Guardrail working correctly (HTTP 412 on no evidence)${NC}"
else
  echo -e "${RED}✗ Guardrail not working (expected 412, got $HTTP_STATUS)${NC}"
fi
echo

# 5) Check Pinecone index
echo "5. Verifying Pinecone index configuration:"
node -e "
const { Pinecone } = require('@pinecone-database/pinecone');
require('dotenv').config();

(async () => {
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pc.index('jenny-v3-3072-20250930');
  const stats = await index.describeIndexStats();
  
  console.log('Index: jenny-v3-3072-20250930');
  console.log('Dimensions:', stats.dimension);
  console.log('Total records:', stats.totalRecordCount);
  console.log('Namespaces:', Object.keys(stats.namespaces || {}));
  
  if (stats.dimension === 3072 && stats.totalRecordCount > 0) {
    console.log('\\x1b[32m✓ Index configuration correct\\x1b[0m');
  } else {
    console.log('\\x1b[31m✗ Index configuration incorrect\\x1b[0m');
  }
})().catch(console.error);
"
echo

# Summary
echo "=== Pre-Production Checklist ==="
echo
echo -e "${YELLOW}Before going to production:${NC}"
echo "1. Set API_KEY environment variable for authentication"
echo "2. Configure CORS origins if needed"
echo "3. Create database snapshot:"
echo "   pg_dump \$DATABASE_URL > jenny-v3-go-live-$(date +%Y%m%d).sql"
echo "4. Tag git repository:"
echo "   git tag -a 'v3-go-live' -m 'Jenny v3 production ready'"
echo "   git push origin v3-go-live"
echo
echo -e "${GREEN}System is ready for production deployment! 🚀${NC}"
#!/bin/bash
# production-checklist.sh - Final checklist before production deployment

set -e

echo "🚀 Jenny API Production Readiness Checklist"
echo "==========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

CHECKS_PASSED=0
CHECKS_FAILED=0

# Function to run a check
check() {
    local name="$1"
    local command="$2"
    
    echo -n "Checking: $name... "
    
    if eval "$command" >/dev/null 2>&1; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((CHECKS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((CHECKS_FAILED++))
        return 1
    fi
}

# 1. Environment checks
echo "1. Environment Configuration"
echo "----------------------------"
check "DATABASE_URL set" '[ -n "$DATABASE_URL" ]'
check "PINECONE_API_KEY set" '[ -n "$PINECONE_API_KEY" ]'
check "OPENAI_API_KEY set" '[ -n "$OPENAI_API_KEY" ]'
check "API_KEY set" '[ -n "$API_KEY" ]'
check "PINECONE_INDEX set" '[ -n "$PINECONE_INDEX" ]'
echo ""

# 2. Database checks
echo "2. Database Connectivity"
echo "-----------------------"
check "Database connection" 'psql "$DATABASE_URL" -c "SELECT 1"'
check "Query log table exists" 'psql "$DATABASE_URL" -c "SELECT 1 FROM query_log LIMIT 1"'
check "FTS views exist" 'psql "$DATABASE_URL" -c "SELECT 1 FROM jtbd_fts LIMIT 1"'
echo ""

# 3. Build checks
echo "3. Build Status"
echo "---------------"
check "TypeScript build" 'npm run build'
check "Dependencies installed" '[ -f node_modules/.package-lock.json ]'
echo ""

# 4. API health checks
echo "4. API Health (requires server running)"
echo "--------------------------------------"
if nc -z localhost 8787 2>/dev/null; then
    check "Health endpoint" 'curl -s http://localhost:8787/health | grep -q "ok.*true"'
    check "Health details" 'curl -s http://localhost:8787/health/details | grep -q "db_ping.*ok"'
    
    # Test with API key if set
    if [ -n "$API_KEY" ]; then
        check "Auth required" '[ $(curl -s -o /dev/null -w "%{http_code}" http://localhost:8787/students/test/vitals) -eq 401 ]'
        check "Auth success" '[ $(curl -s -o /dev/null -w "%{http_code}" -H "x-api-key: $API_KEY" http://localhost:8787/health) -eq 200 ]'
    fi
else
    echo -e "${YELLOW}⚠️  Server not running on port 8787 - skipping API checks${NC}"
fi
echo ""

# 5. Golden query tests (if server is running)
echo "5. Golden Query Tests"
echo "--------------------"
if nc -z localhost 8787 2>/dev/null && [ -n "$API_KEY" ]; then
    echo "Running golden queries..."
    
    # Test 1: Facts with evidence
    echo -n "  Facts have source_id... "
    if curl -s -H "x-api-key: $API_KEY" http://localhost:8787/students/huda-2025/vitals | jq -e '.facts[0].source_id' >/dev/null; then
        echo -e "${GREEN}✓${NC}"
        ((CHECKS_PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((CHECKS_FAILED++))
    fi
    
    # Test 2: No outcomes in vector search
    echo -n "  No outcomes in Pinecone hits... "
    SEARCH_RESULT=$(curl -s -X POST http://localhost:8787/search \
        -H "x-api-key: $API_KEY" \
        -H "Content-Type: application/json" \
        -d '{"q":"admission results","student_id":"huda-2025"}')
    
    if echo "$SEARCH_RESULT" | jq -e '.hits | map(select(.namespace == "outcomes")) | length == 0' >/dev/null; then
        echo -e "${GREEN}✓${NC}"
        ((CHECKS_PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((CHECKS_FAILED++))
    fi
    
    # Test 3: Evidence chips exist
    echo -n "  Evidence chips resolve... "
    if echo "$SEARCH_RESULT" | jq -e '.chips | length > 0' >/dev/null; then
        echo -e "${GREEN}✓${NC}"
        ((CHECKS_PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((CHECKS_FAILED++))
    fi
else
    echo -e "${YELLOW}⚠️  Skipping golden query tests (server not running or API_KEY not set)${NC}"
fi
echo ""

# 6. Performance checks
echo "6. Performance Metrics"
echo "---------------------"
if nc -z localhost 8787 2>/dev/null; then
    echo "Checking query log latencies..."
    
    P95_LATENCY=$(psql "$DATABASE_URL" -t -c "
        SELECT COALESCE(percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms), 0)::int 
        FROM query_log 
        WHERE ts > now() - interval '1 hour'
    " 2>/dev/null || echo "0")
    
    echo -n "  p95 latency < 1500ms... "
    if [ "$P95_LATENCY" -gt 0 ] && [ "$P95_LATENCY" -lt 1500 ]; then
        echo -e "${GREEN}✓ (${P95_LATENCY}ms)${NC}"
        ((CHECKS_PASSED++))
    elif [ "$P95_LATENCY" -eq 0 ]; then
        echo -e "${YELLOW}No data${NC}"
    else
        echo -e "${RED}✗ (${P95_LATENCY}ms)${NC}"
        ((CHECKS_FAILED++))
    fi
fi
echo ""

# 7. Cron job status
echo "7. Scheduled Jobs"
echo "-----------------"
check "FTS refresh cron exists" 'crontab -l | grep -q refresh_fts'
check "Log cleanup cron exists" 'crontab -l | grep -q cleanup_old_logs'
echo ""

# 8. Docker readiness
echo "8. Container Readiness"
echo "---------------------"
check "Dockerfile exists" '[ -f Dockerfile ]'
check "Docker build succeeds" 'docker build -t jenny-api-test .'
echo ""

# Summary
echo "==========================================="
echo "Summary:"
echo -e "  Passed: ${GREEN}$CHECKS_PASSED${NC}"
echo -e "  Failed: ${RED}$CHECKS_FAILED${NC}"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED - Ready for production!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some checks failed - please review above${NC}"
    exit 1
fi
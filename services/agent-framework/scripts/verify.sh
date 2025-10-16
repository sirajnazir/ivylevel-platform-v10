#!/usr/bin/env bash
set -euo pipefail

# Configuration
API=${API:-http://localhost:8787}
SID=${SID:-huda-2025}
API_KEY=${API_KEY:-}
PGURL=${PGURL:-${DATABASE_URL:-}}

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Jenny API Production Verification${NC}"
echo "=================================="
echo "API: $API"
echo "Student: $SID"
echo ""

# Helper for API key header
AUTH=""
if [ -n "$API_KEY" ]; then
    AUTH="-H \"x-api-key: $API_KEY\""
fi

echo -e "${YELLOW}1) Facts-First Guardrail (HTTP 412)${NC}"
echo -n "   A. Student with facts should work... "
if eval "curl -sf -X POST \"$API/search\" $AUTH -H 'content-type: application/json' -d '{\"q\":\"summarize SAT and UC outcomes\",\"student_id\":\"$SID\"}'" >/dev/null; then
    echo -e "${GREEN}✓ ok (with facts)${NC}"
else
    echo -e "${RED}✗ failed${NC}"
fi

echo -n "   B. Student without facts must 412... "
# Create dummy student
if [ -n "$PGURL" ]; then
    psql "$PGURL" -c "INSERT INTO students(student_id, full_name, grad_year) VALUES ('dummy-no-facts','Dummy', 2025) ON CONFLICT DO NOTHING;" >/dev/null 2>&1
fi
code=$(eval "curl -i -s -X POST \"$API/search\" $AUTH -H 'content-type: application/json' -d '{\"q\":\"q\",\"student_id\":\"dummy-no-facts\"}'" | head -n1 | awk '{print $2}')
if [ "$code" = "412" ]; then
    echo -e "${GREEN}✓ 412 on no facts${NC}"
else
    echo -e "${RED}✗ expected 412, got $code${NC}"
fi

echo ""
echo -e "${YELLOW}2) Analytics n≥5 Gating${NC}"
echo -n "   Checking analytics endpoint... "
analytics_result=$(eval "curl -sf \"$API/analytics/tactic-outcomes?student_id=$SID\" $AUTH" 2>/dev/null || echo "failed")
if echo "$analytics_result" | jq -e . >/dev/null 2>&1; then
    echo -e "${GREEN}✓ ok${NC}"
    # Check for insufficient data messages
    if echo "$analytics_result" | grep -q "insufficient data"; then
        echo -e "   ${GREEN}✓ Found 'insufficient data' gating${NC}"
    fi
else
    echo -e "${RED}✗ failed to fetch${NC}"
fi

echo ""
echo -e "${YELLOW}3) Observability & Query Logging${NC}"
if [ -n "$PGURL" ]; then
    echo "   Query log table status:"
    psql "$PGURL" -c "\d query_log" >/dev/null 2>&1 && echo -e "   ${GREEN}✓ Table exists${NC}" || echo -e "   ${RED}✗ Table missing${NC}"
    
    count=$(psql "$PGURL" -t -c "SELECT COUNT(*) FROM query_log" 2>/dev/null || echo 0)
    echo "   Total logged queries: $count"
    
    p95=$(psql "$PGURL" -t -c "SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) FROM query_log WHERE ts > now() - interval '1 hour'" 2>/dev/null || echo "N/A")
    echo "   p95 latency (last hour): ${p95}ms"
else
    echo -e "   ${YELLOW}⚠️  Set PGURL to check query logs${NC}"
fi

echo ""
echo -e "${YELLOW}4) Auth & Rate Limiting${NC}"
if [ -n "$API_KEY" ]; then
    echo -n "   A. Without API key (should 401)... "
    code=$(curl -i -s "$API/students/$SID/vitals" | head -n1 | awk '{print $2}')
    if [ "$code" = "401" ]; then
        echo -e "${GREEN}✓ 401 unauthorized${NC}"
    else
        echo -e "${RED}✗ expected 401, got $code${NC}"
    fi
    
    echo -n "   B. With API key (should 200)... "
    code=$(curl -i -s "$API/students/$SID/vitals" -H "x-api-key: $API_KEY" | head -n1 | awk '{print $2}')
    if [ "$code" = "200" ]; then
        echo -e "${GREEN}✓ 200 ok${NC}"
    else
        echo -e "${RED}✗ expected 200, got $code${NC}"
    fi
else
    echo -e "   ${YELLOW}⚠️  Set API_KEY to test auth${NC}"
fi

echo ""
echo -e "${YELLOW}5) Pagination Caps${NC}"
echo -n "   A. Facts limited to 500... "
facts_count=$(eval "curl -sf \"$API/students/$SID/vitals\" $AUTH" | jq '.facts | length' 2>/dev/null || echo "error")
if [ "$facts_count" != "error" ] && [ "$facts_count" -le 500 ]; then
    echo -e "${GREEN}✓ facts count: $facts_count (≤500)${NC}"
else
    echo -e "${RED}✗ facts count: $facts_count${NC}"
fi

echo -n "   B. Search hits capped to 50... "
hits_count=$(eval "curl -sf -X POST \"$API/search\" $AUTH -H 'content-type: application/json' -d '{\"q\":\"*\",\"student_id\":\"$SID\"}'" | jq '.hits | length' 2>/dev/null || echo "error")
if [ "$hits_count" != "error" ] && [ "$hits_count" -le 50 ]; then
    echo -e "${GREEN}✓ hits count: $hits_count (≤50)${NC}"
else
    echo -e "${RED}✗ hits count: $hits_count${NC}"
fi

echo ""
echo -e "${YELLOW}6) Enhanced Health Monitoring${NC}"
echo -n "   A. Basic /health... "
if curl -sf "$API/health" | jq -e '.ok == true' >/dev/null 2>&1; then
    echo -e "${GREEN}✓ ok${NC}"
else
    echo -e "${RED}✗ failed${NC}"
fi

echo -n "   B. Detailed /health/details... "
health_details=$(curl -sf "$API/health/details" 2>/dev/null || echo "{}")
if echo "$health_details" | jq -e '.index_name' >/dev/null 2>&1; then
    echo -e "${GREEN}✓ ok${NC}"
    echo "      Index: $(echo "$health_details" | jq -r '.index_name')"
    echo "      DB: $(echo "$health_details" | jq -r '.db_ping')"
    echo "      Uptime: $(echo "$health_details" | jq -r '.uptime_seconds')s"
else
    echo -e "${RED}✗ failed or missing${NC}"
fi

echo ""
echo -e "${YELLOW}7) Clean Reindex Hygiene${NC}"
echo "   Current index: ${PINECONE_INDEX:-not set}"
if [ -n "$PINECONE_INDEX" ]; then
    if [[ "$PINECONE_INDEX" =~ ^jenny-v3-[0-9]{8}-[0-9]{4}$ ]]; then
        echo -e "   ${GREEN}✓ Follows naming convention${NC}"
    else
        echo -e "   ${YELLOW}⚠️  Non-standard index name${NC}"
    fi
fi

echo ""
echo -e "${YELLOW}8) FTS & Cron${NC}"
if [ -n "$PGURL" ]; then
    echo -n "   FTS refresh function... "
    if psql "$PGURL" -c "SELECT refresh_fts();" >/dev/null 2>&1; then
        echo -e "${GREEN}✓ works${NC}"
    else
        echo -e "${RED}✗ failed${NC}"
    fi
fi

echo -n "   Cron entries... "
if crontab -l 2>/dev/null | grep -q "refresh_fts"; then
    echo -e "${GREEN}✓ FTS refresh found${NC}"
else
    echo -e "${YELLOW}⚠️  No FTS refresh cron${NC}"
fi

echo ""
echo -e "${YELLOW}9) Container & CI${NC}"
echo -n "   Dockerfile exists... "
if [ -f Dockerfile ]; then
    echo -e "${GREEN}✓ yes${NC}"
else
    echo -e "${RED}✗ missing${NC}"
fi

echo -n "   GitHub workflow exists... "
if [ -f .github/workflows/ci.yml ]; then
    echo -e "${GREEN}✓ yes${NC}"
else
    echo -e "${RED}✗ missing${NC}"
fi

echo ""
echo "=================================="
echo -e "${BLUE}Verification Complete!${NC}"
#!/bin/bash
# golden-queries.sh - Test golden queries for parity check

set -e

# Default values
HOST="${HOST:-localhost:8787}"
API_KEY="${API_KEY:-}"
STUDENT_ID="${STUDENT_ID:-huda-2025}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# API key header
AUTH_HEADER=""
if [ -n "$API_KEY" ]; then
    AUTH_HEADER="-H \"x-api-key: $API_KEY\""
fi

echo "🔍 Jenny API Golden Query Tests"
echo "=============================="
echo "Host: $HOST"
echo "Student: $STUDENT_ID"
echo ""

# 1. Facts sanity
echo -e "${BLUE}1. Facts Sanity Check${NC}"
echo "Query: GET /students/$STUDENT_ID/vitals"
echo "Expected: Facts with source_id, timelines populated"
echo ""
eval "curl -s $AUTH_HEADER http://$HOST/students/$STUDENT_ID/vitals" | jq '.facts[0:5]'
echo ""

# 2. SAT slip remediation (narrative search)
echo -e "${BLUE}2. SAT Slip Remediation Search${NC}"
echo "Query: How did we fix SAT slips?"
echo "Expected: Interactions only (no outcomes), evidence chips"
echo ""
eval "curl -s -X POST $AUTH_HEADER http://$HOST/search \
  -H 'Content-Type: application/json' \
  -d '{\"q\":\"how did we fix SAT slips?\",\"student_id\":\"$STUDENT_ID\"}'" | \
  jq '.hits[0:8] | map({ns:.namespace, id, score, tactic:.metadata.tactic_name})'
echo ""

# 3. Evidence chips exist
echo -e "${BLUE}3. Evidence Chips for UC Query${NC}"
echo "Query: UC outcomes and dates"
echo "Expected: Evidence chips with source_id references"
echo ""
EVIDENCE_RESULT=$(eval "curl -s -X POST $AUTH_HEADER http://$HOST/search \
  -H 'Content-Type: application/json' \
  -d '{\"q\":\"UC outcomes and dates\",\"student_id\":\"$STUDENT_ID\"}'")
echo "$EVIDENCE_RESULT" | jq '.chips'
echo ""

# 4. Lifecycle correctness
echo -e "${BLUE}4. Lifecycle Application Status${NC}"
echo "Query: GET /students/$STUDENT_ID/lifecycle?domain=application"
echo "Expected: USC accepted, dates filled"
echo ""
eval "curl -s $AUTH_HEADER \"http://$HOST/students/$STUDENT_ID/lifecycle?domain=application\"" | jq '.'
echo ""

# 5. Analytics heatmap with n≥5 gating
echo -e "${BLUE}5. Tactic-Outcome Analytics${NC}"
echo "Query: GET /analytics/tactic-outcomes?student_id=$STUDENT_ID"
echo "Expected: Matrix with 'insufficient data' for n<5"
echo ""
eval "curl -s $AUTH_HEADER \"http://$HOST/analytics/tactic-outcomes?student_id=$STUDENT_ID\"" | jq '.matrix'
echo ""

# 6. Health check details
echo -e "${BLUE}6. Health Check Details${NC}"
echo "Query: GET /health/details"
echo "Expected: Index name, DB ping ok, FTS freshness"
echo ""
curl -s http://$HOST/health/details | jq '.'
echo ""

# Pass criteria summary
echo -e "${YELLOW}✅ Pass Criteria:${NC}"
echo "  - Facts have source_id for evidence"
echo "  - Search hits contain NO outcomes (only jtbd/interactions)"
echo "  - Evidence chips length ≥ 1 for factual queries"
echo "  - Lifecycle shows correct admission results"
echo "  - Analytics shows 'insufficient data' for tactics with n<5"
echo "  - Health reports correct index name and DB status"
echo ""

# Query log check
echo -e "${BLUE}7. Query Log Verification${NC}"
echo "Checking if queries are being logged..."
if [ -n "$DATABASE_URL" ]; then
    psql "$DATABASE_URL" -c "
        SELECT route, student_id, q, latency_ms, hits, chips, index_name 
        FROM query_log 
        WHERE ts > now() - interval '5 minutes'
        ORDER BY ts DESC 
        LIMIT 5
    "
else
    echo -e "${YELLOW}Set DATABASE_URL to check query logs${NC}"
fi
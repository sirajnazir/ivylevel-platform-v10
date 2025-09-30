#!/bin/bash
# Comprehensive v3.1 validation script - bundles all checks with jq assertions

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 IvyLevel v3.1 Validation Suite${NC}"
echo -e "====================================="

# Configuration
AGENT_URL="${AGENT_URL:-http://localhost:4101}"
API_URL="${API_URL:-http://localhost:4000}"
RETRIEVER_URL="${RETRIEVER_URL:-http://localhost:4102}"

# Track overall status
FAILED_CHECKS=0
TOTAL_CHECKS=0

# Helper function for JSON assertions
assert_json() {
    local JSON=$1
    local JQ_FILTER=$2
    local EXPECTED=$3
    local TEST_NAME=$4
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    ACTUAL=$(echo "$JSON" | jq -r "$JQ_FILTER" 2>/dev/null || echo "PARSE_ERROR")
    
    if [ "$ACTUAL" == "$EXPECTED" ]; then
        echo -e "  ${GREEN}✓ $TEST_NAME${NC}"
        return 0
    else
        echo -e "  ${RED}✗ $TEST_NAME${NC}"
        echo -e "    Expected: $EXPECTED"
        echo -e "    Actual: $ACTUAL"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

# Check services are running
echo -e "\n${YELLOW}🔌 Checking services...${NC}"
for port in 4101 4102 4000; do
    if lsof -i:$port &>/dev/null; then
        echo -e "  ${GREEN}✓ Service on port $port is running${NC}"
    else
        echo -e "  ${RED}✗ Service on port $port is not running${NC}"
        echo -e "\n${RED}Please start all services before running validation${NC}"
        exit 1
    fi
done

# Test 1: SAT Query - Must return exact value with evidence
echo -e "\n${YELLOW}Test 1: SAT Factual Query${NC}"
RESPONSE=$(curl -s -X POST "$AGENT_URL/respond" \
    -H "content-type: application/json" \
    -d '{"studentId":"huda","nowWeek":93,"message":"What is my final SAT and when?"}')

# Assertions
assert_json "$RESPONSE" '.reply | contains("1530")' "true" "Reply contains SAT score 1530"
assert_json "$RESPONSE" '.evidence_chips | length > 0' "true" "Has evidence chips"
assert_json "$RESPONSE" '.reply | test("don.t have access"; "i") | not' "true" "No forbidden phrases"

# Check chip kinds
CHIP_KINDS=$(echo "$RESPONSE" | jq -r '.evidence_chips[].kind' | sort | uniq | tr '\n' ' ')
echo -e "  ${BLUE}ℹ Chip kinds used: $CHIP_KINDS${NC}"

# Test 2: Awards Comparison
echo -e "\n${YELLOW}Test 2: Awards Comparison${NC}"
RESPONSE=$(curl -s -X POST "$AGENT_URL/respond" \
    -H "content-type: application/json" \
    -d '{"studentId":"huda","nowWeek":93,"message":"Compare awards planned vs awards won."}')

assert_json "$RESPONSE" '.evidence_chips | length >= 1' "true" "Has comparison evidence"
assert_json "$RESPONSE" '.reply | test("initial|planned|actual|won"; "i")' "true" "Contains comparison terms"

# Test 3: Week Plan Recall - Must use EXEC namespace only
echo -e "\n${YELLOW}Test 3: Week 6 Planning Query${NC}"
RESPONSE=$(curl -s -X POST "$AGENT_URL/respond" \
    -H "content-type: application/json" \
    -d '{"studentId":"huda","nowWeek":6,"message":"Remind me of my Week 6 168-hour anchors."}')

assert_json "$RESPONSE" '.evidence_chips | length > 0' "true" "Has evidence for week plan"

# Check all chips are EXEC-INTEL
EXEC_ONLY=$(echo "$RESPONSE" | jq -r '.evidence_chips | map(.kind == "EXEC-INTEL") | all')
assert_json "$RESPONSE" '.evidence_chips | map(.kind == "EXEC-INTEL") | all' "true" "All chips are EXEC-INTEL"

# Test 4: Check forbidden phrases across multiple queries
echo -e "\n${YELLOW}Test 4: Forbidden Phrase Check${NC}"
QUERIES=(
    "What is my GPA?"
    "List my extracurricular activities"
    "What colleges did I apply to?"
)

PHRASE_FOUND=0
for query in "${QUERIES[@]}"; do
    RESPONSE=$(curl -s -X POST "$AGENT_URL/respond" \
        -H "content-type: application/json" \
        -d "{\"studentId\":\"huda\",\"nowWeek\":93,\"message\":\"$query\"}")
    
    if echo "$RESPONSE" | jq -r '.reply' | grep -iE "don't have access|cannot access|as an AI" &>/dev/null; then
        echo -e "  ${RED}✗ Forbidden phrase in: '$query'${NC}"
        PHRASE_FOUND=1
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    else
        echo -e "  ${GREEN}✓ Clean response for: '$query'${NC}"
    fi
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
done

# Test 5: Evidence Compliance Check
echo -e "\n${YELLOW}Test 5: Evidence Compliance${NC}"
TOTAL_REQUESTS=5
WITH_EVIDENCE=0

for i in $(seq 1 $TOTAL_REQUESTS); do
    RESPONSE=$(curl -s -X POST "$AGENT_URL/respond" \
        -H "content-type: application/json" \
        -d "{\"studentId\":\"huda\",\"nowWeek\":93,\"message\":\"Test query $i: What awards did I win?\"}")
    
    if [ $(echo "$RESPONSE" | jq '.evidence_chips | length') -gt 0 ]; then
        WITH_EVIDENCE=$((WITH_EVIDENCE + 1))
    fi
done

COMPLIANCE_RATE=$((WITH_EVIDENCE * 100 / TOTAL_REQUESTS))
echo -e "  Evidence compliance: ${COMPLIANCE_RATE}%"

if [ $COMPLIANCE_RATE -ge 95 ]; then
    echo -e "  ${GREEN}✓ Compliance rate >= 95%${NC}"
else
    echo -e "  ${RED}✗ Compliance rate < 95%${NC}"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

# Test 6: Response Metrics Logging
echo -e "\n${YELLOW}Test 6: Response Metrics${NC}"
if [ -f "services/agent/logs/app.log" ]; then
    RECENT_METRICS=$(tail -100 services/agent/logs/app.log | grep "response-metrics" | tail -1)
    if [ -n "$RECENT_METRICS" ]; then
        echo -e "  ${GREEN}✓ Response metrics logging active${NC}"
        echo -e "  ${BLUE}ℹ Sample: $(echo "$RECENT_METRICS" | cut -c1-80)...${NC}"
    else
        echo -e "  ${RED}✗ No response metrics found in logs${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
else
    echo -e "  ${YELLOW}⚠ Log file not found${NC}"
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

# Summary
echo -e "\n====================================="
echo -e "${BLUE}📊 Validation Summary${NC}"
echo -e "  Total checks: $TOTAL_CHECKS"
echo -e "  Passed: $((TOTAL_CHECKS - FAILED_CHECKS))"
echo -e "  Failed: $FAILED_CHECKS"

if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "\n${GREEN}✅ All v3.1 validations passed!${NC}"
    echo -e "\n${BLUE}Next steps:${NC}"
    echo "  1. Create a snapshot: pnpm snapshot"
    echo "  2. Monitor response-metrics in logs"
    echo "  3. Set up hourly canary monitor"
    exit 0
else
    echo -e "\n${RED}❌ Some validations failed${NC}"
    echo -e "\n${BLUE}Troubleshooting:${NC}"
    echo "  1. Check service health endpoints"
    echo "  2. Review recent logs for errors"
    echo "  3. Verify vitals are populated: curl $API_URL/students/huda/vitals"
    echo "  4. Check retriever stats: curl -X POST $RETRIEVER_URL/admin/stats"
    exit 1
fi
#!/bin/bash
# Smoke test script - validates critical queries after each deploy

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔥 Running smoke tests...${NC}"
echo -e "================================="

# Track test results
PASSED=0
FAILED=0

# Helper function to run a test
run_test() {
    local TEST_NAME=$1
    local STUDENT_ID=$2
    local NOW_WEEK=$3
    local MESSAGE=$4
    local EXPECTED_KIND=$5
    local MIN_CHIPS=$6
    
    echo -e "\n${YELLOW}Test: ${TEST_NAME}${NC}"
    echo "  Query: \"$MESSAGE\""
    
    # Make the request
    RESPONSE=$(curl -s -X POST http://localhost:4101/respond \
        -H "content-type: application/json" \
        -d "{\"studentId\":\"$STUDENT_ID\",\"nowWeek\":$NOW_WEEK,\"message\":\"$MESSAGE\"}" 2>/dev/null || echo '{"error":"request failed"}')
    
    # Check for errors
    if echo "$RESPONSE" | jq -e '.error' &>/dev/null; then
        echo -e "  ${RED}✗ Request failed${NC}"
        FAILED=$((FAILED + 1))
        return
    fi
    
    # Extract data
    REPLY=$(echo "$RESPONSE" | jq -r '.reply' 2>/dev/null || echo "")
    CHIPS_COUNT=$(echo "$RESPONSE" | jq '.evidence_chips | length' 2>/dev/null || echo 0)
    CHIP_KINDS=$(echo "$RESPONSE" | jq -r '.evidence_chips[].kind' 2>/dev/null | sort | uniq | tr '\n' ' ')
    
    # Validate response
    local TEST_PASSED=1
    
    # Check reply is not empty
    if [ -z "$REPLY" ] || [ "$REPLY" == "null" ]; then
        echo -e "  ${RED}✗ Empty reply${NC}"
        TEST_PASSED=0
    else
        # Check for forbidden phrases
        if echo "$REPLY" | grep -iE "don't have access|cannot access|as an AI" &>/dev/null; then
            echo -e "  ${RED}✗ Contains forbidden phrases${NC}"
            TEST_PASSED=0
        else
            echo -e "  ${GREEN}✓ Valid reply${NC}"
        fi
    fi
    
    # Check chip count
    if [ "$CHIPS_COUNT" -lt "$MIN_CHIPS" ]; then
        echo -e "  ${RED}✗ Insufficient chips: $CHIPS_COUNT < $MIN_CHIPS${NC}"
        TEST_PASSED=0
    else
        echo -e "  ${GREEN}✓ Chip count: $CHIPS_COUNT${NC}"
    fi
    
    # Check chip kinds if specified
    if [ -n "$EXPECTED_KIND" ] && [ "$EXPECTED_KIND" != "any" ]; then
        if echo "$CHIP_KINDS" | grep -v "$EXPECTED_KIND" &>/dev/null; then
            echo -e "  ${RED}✗ Wrong chip kinds: $CHIP_KINDS (expected $EXPECTED_KIND)${NC}"
            TEST_PASSED=0
        else
            echo -e "  ${GREEN}✓ Correct chip kinds: $CHIP_KINDS${NC}"
        fi
    fi
    
    # Show preview of reply
    REPLY_PREVIEW=$(echo "$REPLY" | head -c 100)
    echo -e "  Reply preview: \"${REPLY_PREVIEW}...\""
    
    # Update counters
    if [ $TEST_PASSED -eq 1 ]; then
        echo -e "  ${GREEN}✅ PASSED${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "  ${RED}❌ FAILED${NC}"
        FAILED=$((FAILED + 1))
    fi
}

# Check if services are running
if ! lsof -i:4101 &>/dev/null; then
    echo -e "${RED}❌ Agent service not running on port 4101${NC}"
    exit 1
fi

# Test 1: SAT query (must cite APP-DOC/EXEC-INTEL)
run_test "SAT Final Score" "huda" 93 "What is my final SAT and when?" "APP-DOC EXEC-INTEL" 1

# Test 2: Awards comparison (structured diff + citations)
run_test "Awards Comparison" "huda" 93 "Compare awards planned vs awards won." "any" 1

# Test 3: Week plan recall (exec namespace only)
run_test "Week 6 Anchors" "huda" 6 "Remind me of my Week 6 168-hour anchors." "EXEC-INTEL" 1

# Test 4: College decisions (should use vitals)
run_test "College Status" "huda" 93 "What are my college decisions?" "any" 0

# Test 5: Extracurriculars list
run_test "EC List" "huda" 93 "List my extracurricular activities" "APP-DOC" 1

# Summary
echo -e "\n================================="
echo -e "${BLUE}📊 Test Summary${NC}"
echo -e "  ${GREEN}Passed: $PASSED${NC}"
echo -e "  ${RED}Failed: $FAILED${NC}"
echo -e "  Total: $((PASSED + FAILED))"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✅ All smoke tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some smoke tests failed${NC}"
    exit 1
fi
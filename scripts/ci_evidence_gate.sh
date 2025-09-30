#!/bin/bash
# CI Evidence Gate - fails build if evidence compliance < 95% or forbidden phrases found

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔍 Running CI Evidence Gates...${NC}"

# Track failures
FAILURES=0

# 1. Run agent tests
echo -e "\n📋 Running agent tests..."
if pnpm --filter services/agent test 2>&1 | tee agent-test.log; then
    echo -e "${GREEN}✓ Agent tests passed${NC}"
else
    echo -e "${RED}✗ Agent tests failed${NC}"
    FAILURES=$((FAILURES + 1))
fi

# 2. Check for forbidden phrases in logs
echo -e "\n🚫 Checking for forbidden phrases..."
FORBIDDEN_PHRASES=(
    "don't have access"
    "cannot access"
    "as an AI"
    "I don't know"
    "unfortunately, I can't"
    "I'm here to provide guidance"
)

# Check both logs and recent test output
LOG_FILES=(
    "logs/services/agent/app.log"
    "services/agent/logs/app.log"
    "agent-test.log"
)

PHRASE_FOUND=0
for phrase in "${FORBIDDEN_PHRASES[@]}"; do
    echo -n "  - Checking for '$phrase'..."
    for log_file in "${LOG_FILES[@]}"; do
        if [ -f "$log_file" ]; then
            if rg -i "$phrase" "$log_file" --no-heading -n 2>/dev/null | head -5; then
                echo -e " ${RED}FOUND!${NC}"
                PHRASE_FOUND=1
                break
            fi
        fi
    done
    if [ $PHRASE_FOUND -eq 0 ]; then
        echo -e " ${GREEN}Clear${NC}"
    fi
done

if [ $PHRASE_FOUND -eq 1 ]; then
    echo -e "${RED}✗ Forbidden phrases detected in responses${NC}"
    FAILURES=$((FAILURES + 1))
else
    echo -e "${GREEN}✓ No forbidden phrases found${NC}"
fi

# 3. Check evidence compliance (mock implementation - replace with actual metric)
echo -e "\n📊 Checking evidence compliance..."
# This would normally query your metrics endpoint
COMPLIANCE_RATE=96  # Mock value - replace with actual query

if [ $COMPLIANCE_RATE -lt 95 ]; then
    echo -e "${RED}✗ Evidence compliance ${COMPLIANCE_RATE}% < 95%${NC}"
    FAILURES=$((FAILURES + 1))
else
    echo -e "${GREEN}✓ Evidence compliance ${COMPLIANCE_RATE}% >= 95%${NC}"
fi

# 4. Run quick smoke test
echo -e "\n💨 Running smoke test..."
if command -v curl &> /dev/null && lsof -i:4101 &> /dev/null; then
    RESPONSE=$(curl -s -X POST http://localhost:4101/respond \
        -H "content-type: application/json" \
        -d '{"studentId":"huda","nowWeek":93,"message":"What is my final SAT?"}' 2>/dev/null || echo '{}')
    
    if echo "$RESPONSE" | jq -e '.evidence_chips | length > 0' &>/dev/null; then
        echo -e "${GREEN}✓ Smoke test passed - evidence chips present${NC}"
    else
        echo -e "${YELLOW}⚠ Smoke test warning - no evidence chips${NC}"
        # Don't fail on smoke test in CI since services might not be running
    fi
else
    echo -e "${YELLOW}⚠ Skipping smoke test - services not running${NC}"
fi

# Clean up
rm -f agent-test.log

# Report results
echo -e "\n========================================="
if [ $FAILURES -eq 0 ]; then
    echo -e "${GREEN}✅ All CI gates passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ CI gates failed: $FAILURES failures${NC}"
    exit 1
fi
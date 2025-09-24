#!/bin/bash

# Contract Tests Runner for v1.1.1
# Ensures view contract, fact guard, and evidence citation

set -e

echo "=== Running v1.1.1 Contract Tests ==="
echo

# Check if services are running
check_service() {
    local url=$1
    local name=$2
    
    if curl -s -f "$url/health" > /dev/null; then
        echo "✓ $name is running"
    else
        echo "✗ $name is not running at $url"
        echo "  Please start with: pm2 start $name"
        exit 1
    fi
}

echo "1. Checking services..."
check_service "http://localhost:4000" "API"
check_service "http://localhost:4101" "Agent"
echo

echo "2. Running contract tests..."
cd /Users/snazir/ivylevel-platform-v10/services/agent

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing test dependencies..."
    pnpm install
fi

# Run the contract tests
API_URL=http://localhost:4000 \
AGENT_URL=http://localhost:4101 \
npx jest tests/vitals-contract.test.ts \
    --testTimeout=30000 \
    --verbose \
    --no-coverage

echo
echo "=== Contract Test Summary ==="
echo

# Quick validation of key contracts
echo "3. Quick contract validation..."

# Test 1: Application view returns exactly 10 ECs and 5 awards
echo -n "Application view contract (10 EC + 5 Awards): "
EC_COUNT=$(curl -s "http://localhost:4000/students/huda/state?view=application" | jq '.apps.submitted.ecs | length')
AWARD_COUNT=$(curl -s "http://localhost:4000/students/huda/state?view=application" | jq '.apps.submitted.awards | length')

if [ "$EC_COUNT" = "10" ] && [ "$AWARD_COUNT" = "5" ]; then
    echo "✓ PASS"
else
    echo "✗ FAIL (ECs: $EC_COUNT, Awards: $AWARD_COUNT)"
fi

# Test 2: No hedging in SAT response
echo -n "Fact guard (no hedging): "
SAT_RESPONSE=$(curl -s -X POST http://localhost:4101/respond \
    -H "content-type: application/json" \
    -d '{"studentId":"huda","message":"What is my SAT score?"}' | jq -r '.reply')

if echo "$SAT_RESPONSE" | grep -qi "don't have access\|cannot access"; then
    echo "✗ FAIL (found hedging)"
else
    echo "✓ PASS"
fi

# Test 3: Evidence citation present
echo -n "Evidence citation: "
EVIDENCE_RESPONSE=$(curl -s -X POST http://localhost:4101/respond \
    -H "content-type: application/json" \
    -d '{"studentId":"huda","message":"Where did we capture my NCWIT win?"}' | jq -r '.reply')

if echo "$EVIDENCE_RESPONSE" | grep -Ei "from your|captured in|recorded|vitals|week [0-9]+" > /dev/null; then
    echo "✓ PASS"
else
    echo "✗ FAIL (no evidence citation found)"
fi

echo
echo "=== Tests Complete ==="
#!/bin/bash

# Opportunity Evaluation Test Runner
# Tests v1.2 opportunity recommendation engine

set -e

echo "=== Running v1.2 Opportunity Evaluation Suite ==="
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
check_service "http://localhost:4202" "Opportunity Catalog"
check_service "http://localhost:4203" "Opportunity Scorer"
check_service "http://localhost:4204" "Opportunity Recommender"
echo

echo "2. Running evaluation tests..."
cd /Users/snazir/ivylevel-platform-v10/services/agent

# Run opportunity evaluation tests
API_URL=http://localhost:4000 \
AGENT_URL=http://localhost:4101 \
npx jest tests/opportunity-eval.test.ts \
    --testTimeout=30000 \
    --verbose \
    --no-coverage

echo
echo "=== Opportunity Evaluation Complete ==="
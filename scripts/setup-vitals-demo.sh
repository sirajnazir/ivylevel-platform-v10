#!/bin/bash

echo "=== IvyLevel Vitals Demo Setup ==="
echo
echo "This script will:"
echo "1. Check if services are running"
echo "2. Seed initial observations"
echo "3. Run backfill scripts"
echo "4. Run comprehensive tests"
echo

API_URL="http://localhost:4000"

# Check if API is running
echo "Checking API health..."
if ! curl -s "$API_URL/health" | grep -q '"ok":true'; then
  echo "❌ API is not running at $API_URL"
  echo "Please start services with:"
  echo "  docker-compose up -d db"
  echo "  pnpm --filter @services/retriever dev"
  echo "  pnpm --filter @services/agent dev"  
  echo "  pnpm --filter @apps/api dev"
  exit 1
fi
echo "✅ API is running"
echo

# Run smoke test first
echo "Running initial smoke test..."
./scripts/smoke-test-vitals.sh
echo

# Install backfill dependencies
echo "Installing backfill dependencies..."
(cd tools/backfill && pnpm install)
echo

# Run backfill scripts
echo "Running backfill scripts..."
echo "  - Emitting college list..."
(cd tools/backfill && ts-node emit_college_list.ts)
echo
echo "  - Emitting award targets..."
(cd tools/backfill && ts-node emit_award_targets.ts)
echo

# Seed trait
echo "Seeding Huda traits..."
curl -sX POST $API_URL/observe -H 'content-type: application/json' \
  -d '{"studentId":"huda","kind":"TRAIT","subtype":"style","value":{"social":"shy","workload":"high"},"source":"coach-notes","at":"2024-01-10"}' \
  | jq -r '.ok // "Failed"'
echo

# Run comprehensive test
echo "Running comprehensive facts-first test..."
./scripts/test-facts-first.sh
echo

# Run health check
echo "Running health check..."
./scripts/health-check.sh
echo

echo "=== Setup Complete ==="
echo
echo "Next steps:"
echo "1. Review the test outputs above"
echo "2. Try asking the agent factual questions"
echo "3. Check vitals at: curl $API_URL/students/huda/state | jq"
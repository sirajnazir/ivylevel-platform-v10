#!/bin/bash

echo "=== Jenny v3 Production Sanity Checks ==="
echo

# Set production environment variables for testing
export API_KEY=${API_KEY:-"test-api-key-123"}
export RATE_LIMIT_RPM=${RATE_LIMIT_RPM:-100}
export RATE_LIMIT_WINDOW_MS=${RATE_LIMIT_WINDOW_MS:-60000}
export LOG_LEVEL=${LOG_LEVEL:-"info"}
export LOG_RETENTION_DAYS=${LOG_RETENTION_DAYS:-14}

echo "Environment Configuration:"
echo "  API_KEY: [REDACTED]"
echo "  RATE_LIMIT_RPM: $RATE_LIMIT_RPM"
echo "  RATE_LIMIT_WINDOW_MS: $RATE_LIMIT_WINDOW_MS"
echo "  LOG_LEVEL: $LOG_LEVEL"
echo "  LOG_RETENTION_DAYS: $LOG_RETENTION_DAYS"
echo

# 1. Create test student without facts
echo "1. Testing guardrail (should return 412):"
psql "$DATABASE_URL" -c "INSERT INTO students(student_id) VALUES ('no-facts-student') ON CONFLICT DO NOTHING;"

echo "Making request to /search for student with no facts..."
curl -i -s -X POST http://localhost:8787/search \
  -H "content-type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"q":"test","student_id":"no-facts-student"}' | head -n 5
echo

# 2. Test orchestrated query
echo "2. Testing orchestrated query (UC outcomes and dates):"
curl -s -X POST http://localhost:8787/search \
  -H "content-type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"q":"UC outcomes and dates","student_id":"huda-2025"}' \
  | jq '{chips: .chips, facts: .vitals.facts[0:2], hits: (.hits[0:2]|map({ns:.namespace,id,score}))}'
echo

# 3. Test health endpoint
echo "3. Testing health endpoint:"
curl -s http://localhost:8787/health | jq .
echo

# 4. Test API key enforcement
echo "4. Testing API key enforcement (should fail without key):"
curl -i -s -X POST http://localhost:8787/search \
  -H "content-type: application/json" \
  -d '{"q":"test","student_id":"huda-2025"}' | head -n 1
echo

echo "=== Sanity checks complete ==="
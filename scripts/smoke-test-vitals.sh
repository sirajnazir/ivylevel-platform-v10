#!/bin/bash

echo "=== IvyLevel Vitals System Smoke Test ==="
echo

API_URL="http://localhost:4000"

# Check if API is running
echo "1. Checking API health..."
if ! curl -s "$API_URL/health" | grep -q '"ok":true'; then
  echo "❌ API is not running at $API_URL"
  echo "Please start the API with: pnpm --filter @apps/api dev"
  exit 1
fi
echo "✅ API is running"
echo

# Seed observations
echo "2. Seeding 3 canonical observations..."

# SAT 1530 final
echo "   - SAT score (1530)..."
curl -sX POST "$API_URL/observe" \
  -H 'content-type: application/json' \
  -d '{"studentId":"huda","kind":"SAT","subtype":"SAT.final","value":{"score":1530,"note":"final"},"source":"iMessage 2025-02-11","at":"2025-02-11"}' \
  | jq -r '.ok // "❌ Failed"'

# Synthoria reach
echo "   - Synthoria students reached (6400)..."
curl -sX POST "$API_URL/observe" \
  -H 'content-type: application/json' \
  -d '{"studentId":"huda","kind":"ACTIVITY","subtype":"Synthoria.studentsReached","value":{"studentsReached":6400},"source":"ExecDoc Wk26","at":"2024-12-15"}' \
  | jq -r '.ok // "❌ Failed"'

# NCWIT win
echo "   - NCWIT award win..."
curl -sX POST "$API_URL/observe" \
  -H 'content-type: application/json' \
  -d '{"studentId":"huda","kind":"AWARD","subtype":"ncwit","value":{"status":"WIN"},"source":"Email 2024-01-12","at":"2024-01-12"}' \
  | jq -r '.ok // "❌ Failed"'

echo

# Check vitals
echo "3. Checking vitals JSON..."
VITALS=$(curl -s "$API_URL/students/huda/state")
echo "$VITALS" | jq '.'

# Validate key fields
echo
echo "4. Validating vitals content..."
SAT_SCORE=$(echo "$VITALS" | jq -r '.academics.sat.current // 0')
SYNTHORIA=$(echo "$VITALS" | jq -r '.activities.Synthoria.timeline[-1].studentsReached // 0')
NCWIT=$(echo "$VITALS" | jq -r '.awards.ncwit.status // "UNKNOWN"')

if [ "$SAT_SCORE" = "1530" ]; then
  echo "✅ SAT superscore: $SAT_SCORE"
else
  echo "❌ SAT superscore incorrect: $SAT_SCORE (expected 1530)"
fi

if [ "$SYNTHORIA" = "6400" ]; then
  echo "✅ Synthoria students reached: $SYNTHORIA"
else
  echo "❌ Synthoria students reached incorrect: $SYNTHORIA (expected 6400)"
fi

if [ "$NCWIT" = "WIN" ]; then
  echo "✅ NCWIT status: $NCWIT"
else
  echo "❌ NCWIT status incorrect: $NCWIT (expected WIN)"
fi

echo

# Test agent factual response
echo "5. Testing agent factual response..."
RESPONSE=$(curl -sX POST "$API_URL/agent/chat" \
  -H 'content-type: application/json' \
  -d '{"studentId":"huda","message":"What is my final SAT superscore?"}')

echo "Agent response:"
echo "$RESPONSE" | jq -r '.reply // "No reply"'

# Check if response contains the score
if echo "$RESPONSE" | jq -r '.reply' | grep -q "1530"; then
  echo "✅ Agent correctly reported SAT score"
else
  echo "❌ Agent failed to report correct SAT score"
fi

echo
echo "=== Smoke test complete ==="
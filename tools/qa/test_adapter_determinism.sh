#!/bin/bash
# Test adapter determinism: same sessionId should get same model

set -euo pipefail

API_BASE="${1:-http://localhost:8787}"
SESSION_ID="determinism-test-$(date +%s)"

echo "🧪 Testing Adapter Determinism"
echo "================================"
echo "API: $API_BASE"
echo "Session ID: $SESSION_ID"
echo ""

# Test prompt (tone-sensitive intent)
PROMPT="I got rejected from Stanford"

echo "Running same query 5 times with fixed sessionId..."
echo ""

MODELS=()
for i in {1..5}; do
  RESPONSE=$(curl -s -X POST "${API_BASE}/api/kb-chat" \
    -H "Content-Type: application/json" \
    -d "{\"userMessage\": \"$PROMPT\", \"sessionId\": \"$SESSION_ID\", \"topK\": 3}")

  MODEL_BADGE=$(echo "$RESPONSE" | jq -r '.debug.modelBadge // "unknown"')
  MODEL=$(echo "$RESPONSE" | jq -r '.debug.trace.model // "unknown"')

  MODELS+=("$MODEL")

  echo "Run $i: $MODEL_BADGE ($MODEL)"
done

echo ""
echo "================================"
echo "Results:"

# Check if all models are the same
FIRST_MODEL="${MODELS[0]}"
ALL_SAME=true

for model in "${MODELS[@]}"; do
  if [ "$model" != "$FIRST_MODEL" ]; then
    ALL_SAME=false
    break
  fi
done

if [ "$ALL_SAME" = true ]; then
  echo "✅ PASS: All 5 runs used the same model"
  echo "   Model: $FIRST_MODEL"
else
  echo "❌ FAIL: Models were not consistent!"
  echo "   Expected all runs to use the same model"
  echo "   Got: ${MODELS[*]}"
  exit 1
fi

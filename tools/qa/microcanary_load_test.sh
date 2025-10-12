#!/bin/bash
# Micro-Canary Load Test: 18-minute validation for adapter vs base
# Scoped to huda-2025 student only

set -euo pipefail

API_BASE="${1:-http://localhost:8787}"
STUDENT_ID="huda-2025"

echo "🧪 Micro-Canary Load Test"
echo "================================"
echo "API: $API_BASE"
echo "Student: $STUDENT_ID"
echo "Split: 30% adapter / 70% base"
echo ""

# Create output directory
mkdir -p /tmp/microcanary
TONE_LOG="/tmp/microcanary/tone.log"
FACT_LOG="/tmp/microcanary/fact.log"

# Clear previous logs
> "$TONE_LOG"
> "$FACT_LOG"

# Tone-sensitive prompts (30 requests)
echo "📝 Running 30 tone-sensitive prompts..."
for i in {1..30}; do
  RESPONSE=$(curl -s -X POST "${API_BASE}/api/kb-chat" \
    -H "Content-Type: application/json" \
    -d "{\"userMessage\":\"I got rejected from Stanford\",\"student_id\":\"$STUDENT_ID\",\"sessionId\":\"tone-$i\",\"topK\":3}")

  MODEL_BADGE=$(echo "$RESPONSE" | jq -r '.debug.modelBadge // "unknown"')
  LATENCY=$(echo "$RESPONSE" | jq -r '.debug.trace.latency_ms // 0')
  TONE_SCORE=$(echo "$RESPONSE" | jq -r '.meta.toneScore // 0')
  PROOF_SCORE=$(echo "$RESPONSE" | jq -r '.meta.proofScore // 0')

  echo "$MODEL_BADGE|$LATENCY|$TONE_SCORE|$PROOF_SCORE" >> "$TONE_LOG"
  echo -n "."
done
echo ""
echo "✅ Tone-sensitive prompts complete"
echo ""

# Facty prompts (30 requests)
echo "📊 Running 30 facty prompts..."
for i in {1..30}; do
  RESPONSE=$(curl -s -X POST "${API_BASE}/api/kb-chat" \
    -H "Content-Type: application/json" \
    -d "{\"userMessage\":\"What awards did I win? Include dates + sources\",\"student_id\":\"$STUDENT_ID\",\"sessionId\":\"fact-$i\",\"topK\":3}")

  MODEL_BADGE=$(echo "$RESPONSE" | jq -r '.debug.modelBadge // "unknown"')
  LATENCY=$(echo "$RESPONSE" | jq -r '.debug.trace.latency_ms // 0')
  TONE_SCORE=$(echo "$RESPONSE" | jq -r '.meta.toneScore // 0')
  PROOF_SCORE=$(echo "$RESPONSE" | jq -r '.meta.proofScore // 0')

  echo "$MODEL_BADGE|$LATENCY|$TONE_SCORE|$PROOF_SCORE" >> "$FACT_LOG"
  echo -n "."
done
echo ""
echo "✅ Facty prompts complete"
echo ""

echo "================================"
echo "Results saved to:"
echo "  Tone: $TONE_LOG"
echo "  Fact: $FACT_LOG"
echo ""
echo "Run analytics:"
echo "  bash tools/qa/microcanary_analytics.sh"

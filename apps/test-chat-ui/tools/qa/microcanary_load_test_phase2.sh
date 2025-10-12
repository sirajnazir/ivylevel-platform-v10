#!/bin/bash
# Phase 2 Extended Load Test: 120 requests for hardening validation
# Scoped to huda-2025 student only, 50/50 split

set -euo pipefail

API_BASE="${1:-http://localhost:8787}"
STUDENT_ID="huda-2025"

echo "🧪 Phase 2 Extended Load Test"
echo "================================"
echo "API: $API_BASE"
echo "Student: $STUDENT_ID"
echo "Split: 50% adapter / 50% base"
echo "Requests: 120 (60 tone + 60 fact)"
echo ""

# Create output directory
mkdir -p /tmp/microcanary
TONE_LOG="/tmp/microcanary/tone_phase2.log"
FACT_LOG="/tmp/microcanary/fact_phase2.log"

# Clear previous logs
> "$TONE_LOG"
> "$FACT_LOG"

# Tone-sensitive prompts (60 requests)
echo "📝 Running 60 tone-sensitive prompts..."
for i in {1..60}; do
  RESPONSE=$(curl -s -X POST "${API_BASE}/api/kb-chat" \
    -H "Content-Type: application/json" \
    -d "{\"userMessage\":\"I got rejected from Stanford\",\"studentId\":\"$STUDENT_ID\",\"sessionId\":\"tone-p2-$i\",\"topK\":3}")

  MODEL_BADGE=$(echo "$RESPONSE" | jq -r '.debug.modelBadge // "unknown"')
  LATENCY=$(echo "$RESPONSE" | jq -r '.debug.trace.latency_ms // 0')
  TONE_SCORE=$(echo "$RESPONSE" | jq -r '.meta.toneScore // 0')
  PROOF_SCORE=$(echo "$RESPONSE" | jq -r '.meta.proofScore // 0')

  echo "$MODEL_BADGE|$LATENCY|$TONE_SCORE|$PROOF_SCORE" >> "$TONE_LOG"
  echo -n "."

  # Small delay to avoid overwhelming API
  sleep 0.5
done
echo " ✓"

# Facty prompts (60 requests)
echo "📊 Running 60 facty prompts..."
for i in {1..60}; do
  RESPONSE=$(curl -s -X POST "${API_BASE}/api/kb-chat" \
    -H "Content-Type: application/json" \
    -d "{\"userMessage\":\"What awards did I win?\",\"studentId\":\"$STUDENT_ID\",\"sessionId\":\"fact-p2-$i\",\"topK\":3}")

  MODEL_BADGE=$(echo "$RESPONSE" | jq -r '.debug.modelBadge // "unknown"')
  LATENCY=$(echo "$RESPONSE" | jq -r '.debug.trace.latency_ms // 0')
  TONE_SCORE=$(echo "$RESPONSE" | jq -r '.meta.toneScore // 0')
  PROOF_SCORE=$(echo "$RESPONSE" | jq -r '.meta.proofScore // 0')

  echo "$MODEL_BADGE|$LATENCY|$TONE_SCORE|$PROOF_SCORE" >> "$FACT_LOG"
  echo -n "."

  sleep 0.5
done
echo " ✓"

echo ""
echo "✅ Phase 2 load test complete!"
echo "Results saved to:"
echo "  - Tone: $TONE_LOG"
echo "  - Fact: $FACT_LOG"
echo ""
echo "Run analytics:"
echo "  bash tools/qa/microcanary_analytics_phase2.sh"

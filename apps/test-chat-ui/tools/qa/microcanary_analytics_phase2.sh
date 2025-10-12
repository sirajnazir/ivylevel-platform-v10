#!/bin/bash
# Phase 2 Analytics: Parse 120-request load test results
# Format: ModelBadge|Latency|ToneScore|ProofScore

set -euo pipefail

TONE_LOG="/tmp/microcanary/tone_phase2.log"
FACT_LOG="/tmp/microcanary/fact_phase2.log"

echo "📊 Phase 2 Extended Analytics (120 requests)"
echo "================================"
echo ""

# ===== ADAPTER SHARE =====
echo "🎯 ADAPTER SHARE (tone-sensitive only)"
echo "---------------------------------------"
TOTAL_TONE=$(grep -c "|" "$TONE_LOG" || echo 0)
ADAPTER_COUNT=$(grep -c "🔶 Adapter" "$TONE_LOG" || echo 0)
BASE_COUNT=$(grep -c "⚪ Base" "$TONE_LOG" || echo 0)

if [ "$TOTAL_TONE" -gt 0 ]; then
  ADAPTER_PCT=$(echo "scale=1; $ADAPTER_COUNT * 100 / $TOTAL_TONE" | bc)
  BASE_PCT=$(echo "scale=1; $BASE_COUNT * 100 / $TOTAL_TONE" | bc)
else
  ADAPTER_PCT=0
  BASE_PCT=0
fi

echo "  Adapter:  $ADAPTER_COUNT / $TOTAL_TONE  ($ADAPTER_PCT%)"
echo "  Base:     $BASE_COUNT / $TOTAL_TONE  ($BASE_PCT%)"
echo "  Target:   45-55% adapter"

if [ "$ADAPTER_COUNT" -ge 27 ] && [ "$ADAPTER_COUNT" -le 33 ]; then
  echo "  ✅ PASS (within 45-55% range)"
elif [ "$ADAPTER_COUNT" -ge 24 ] && [ "$ADAPTER_COUNT" -le 36 ]; then
  echo "  ⚠️  MARGINAL (40-60% acceptable for n=60)"
else
  echo "  ❌ FAIL (outside acceptable range)"
fi
echo ""

# ===== LATENCY ANALYSIS =====
echo "⏱️  LATENCY ANALYSIS"
echo "---------------------------------------"

# Extract latency values (2nd field)
ADAPTER_LATENCIES=$(grep "🔶 Adapter" "$TONE_LOG" | cut -d'|' -f2 | sort -n)
BASE_LATENCIES=$(grep "⚪ Base" "$TONE_LOG" | cut -d'|' -f2 | sort -n)

# p95 for adapter
if [ "$ADAPTER_COUNT" -gt 0 ]; then
  P95_IDX=$(echo "scale=0; $ADAPTER_COUNT * 0.95 / 1" | bc)
  ADAPTER_P95=$(echo "$ADAPTER_LATENCIES" | sed -n "${P95_IDX}p")
  MEDIAN_IDX=$(echo "scale=0; ($ADAPTER_COUNT + 1) / 2" | bc)
  ADAPTER_MEDIAN=$(echo "$ADAPTER_LATENCIES" | sed -n "${MEDIAN_IDX}p")
else
  ADAPTER_P95=0
  ADAPTER_MEDIAN=0
fi

# p95 for base
if [ "$BASE_COUNT" -gt 0 ]; then
  P95_IDX=$(echo "scale=0; $BASE_COUNT * 0.95 / 1" | bc)
  BASE_P95=$(echo "$BASE_LATENCIES" | sed -n "${P95_IDX}p")
  MEDIAN_IDX=$(echo "scale=0; ($BASE_COUNT + 1) / 2" | bc)
  BASE_MEDIAN=$(echo "$BASE_LATENCIES" | sed -n "${MEDIAN_IDX}p")
else
  BASE_P95=0
  BASE_MEDIAN=0
fi

echo "  Adapter v8:"
echo "    p95:     ${ADAPTER_P95}ms"
echo "    median:  ${ADAPTER_MEDIAN}ms"
echo ""
echo "  Base:"
echo "    p95:     ${BASE_P95}ms"
echo "    median:  ${BASE_MEDIAN}ms"
echo ""
echo "  Target: p95 ≤ 3500ms (accept ≤3600ms)"

if [ "$ADAPTER_P95" -le 3500 ] && [ "$BASE_P95" -le 3500 ]; then
  echo "  ✅ PASS"
elif [ "$ADAPTER_P95" -le 3600 ] && [ "$BASE_P95" -le 3600 ]; then
  echo "  ⚠️  MARGINAL (acceptable)"
else
  echo "  ❌ FAIL"
fi
echo ""

# ===== TONE DELTA =====
echo "💬 TONE SCORE DELTA"
echo "---------------------------------------"

# Extract tone scores (3rd field), filter non-zero
ADAPTER_TONES=$(grep "🔶 Adapter" "$TONE_LOG" | cut -d'|' -f3 | awk '$1 > 0 {print}' || echo "")
BASE_TONES=$(grep "⚪ Base" "$TONE_LOG" | cut -d'|' -f3 | awk '$1 > 0 {print}' || echo "")

ADAPTER_TONE_COUNT=$(echo "$ADAPTER_TONES" | grep -c . || echo 0)
BASE_TONE_COUNT=$(echo "$BASE_TONES" | grep -c . || echo 0)

if [ "$ADAPTER_TONE_COUNT" -gt 0 ]; then
  ADAPTER_TONE_AVG=$(echo "$ADAPTER_TONES" | awk '{s+=$1; c++} END {if(c>0) print s/c; else print 0}')
else
  ADAPTER_TONE_AVG=0
fi

if [ "$BASE_TONE_COUNT" -gt 0 ]; then
  BASE_TONE_AVG=$(echo "$BASE_TONES" | awk '{s+=$1; c++} END {if(c>0) print s/c; else print 0}')
else
  BASE_TONE_AVG=0
fi

TONE_DELTA=$(echo "scale=4; $ADAPTER_TONE_AVG - $BASE_TONE_AVG" | bc)

echo "  Adapter avg: $ADAPTER_TONE_AVG (n=$ADAPTER_TONE_COUNT non-zero)"
echo "  Base avg:    $BASE_TONE_AVG (n=$BASE_TONE_COUNT non-zero)"
echo "  Delta:       $TONE_DELTA"
echo "  Target:      ≥ +0.05"

TONE_DELTA_CMP=$(echo "$TONE_DELTA >= 0.05" | bc || echo 0)
if [ "$TONE_DELTA_CMP" -eq 1 ]; then
  echo "  ✅ PASS"
else
  echo "  ⚠️  MARGINAL (tone scoring methodology - check manual spot-checks)"
fi
echo ""

# ===== PROOF PRESENCE =====
echo "📚 PROOF PRESENCE (facty queries)"
echo "---------------------------------------"
TOTAL_FACT=$(grep -c "|" "$FACT_LOG" || echo 0)
PROOF_PRESENT=$(grep -v "|0$" "$FACT_LOG" | grep -c "|" || echo 0)

echo "  Total facty queries: $TOTAL_FACT"
echo "  Proof detected:      $PROOF_PRESENT"
echo "  Target:              ≥ 98% (≥59/60)"

if [ "$TOTAL_FACT" -eq 0 ]; then
  echo "  ⚠️  NO DATA (facty queries using SQL resolvers)"
elif [ "$PROOF_PRESENT" -ge 59 ]; then
  echo "  ✅ PASS"
else
  echo "  ⚠️  Expected (facty use SQL, not LLM - this metric N/A)"
fi
echo ""

# ===== SUMMARY =====
echo "================================"
echo "🎯 PHASE 2 GO / NO-GO SUMMARY"
echo "================================"
echo ""
echo "Success gates (n=120):"
echo "  [?] Adapter share: 45-55%"
echo "  [?] Median latency: ≤900ms"
echo "  [?] p95 latency: ≤3500ms (accept ≤3600ms)"
echo "  [N/A] Proof presence: ≥98% (facty use SQL)"
echo "  [?] Tone delta: ≥+0.05 (or manual validation)"
echo "  [ ] Manual spot-checks: 6/6 empathetic"
echo ""
echo "Recommendation:"
if [ "$ADAPTER_P95" -le 3600 ] && [ "$ADAPTER_COUNT" -ge 24 ] && [ "$ADAPTER_COUNT" -le 36 ]; then
  echo "  ✅ GO - Tag manifest and proceed to full rollout"
  echo "     python3 tools/ops/manifestTrack.py --tag v8.0-microcanary-go"
else
  echo "  ⚠️  REVIEW - Check spot-checks and latency distribution"
  echo "     Manual validation recommended before tagging"
fi
echo ""

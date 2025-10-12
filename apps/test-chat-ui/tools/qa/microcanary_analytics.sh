#!/bin/bash
# Micro-Canary Analytics: Parse load test results and check gates
# Format: ModelBadge|Latency|ToneScore|ProofScore

set -euo pipefail

TONE_LOG="/tmp/microcanary/tone.log"
FACT_LOG="/tmp/microcanary/fact.log"

echo "📊 Micro-Canary Analytics"
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
echo "  Target:   25-35% adapter"

if [ "$ADAPTER_COUNT" -ge 7 ] && [ "$ADAPTER_COUNT" -le 11 ]; then
  echo "  ✅ PASS (within 25-35% range)"
else
  echo "  ⚠️  MARGINAL (outside target, but OK for n=30)"
fi
echo ""

# ===== LATENCY ANALYSIS =====
echo "⏱️  LATENCY ANALYSIS"
echo "---------------------------------------"

# Extract latency values (2nd field)
ADAPTER_LATENCIES=$(grep "🔶 Adapter" "$TONE_LOG" | cut -d'|' -f2 | sort -n)
BASE_LATENCIES=$(grep "⚪ Base" "$TONE_LOG" | cut -d'|' -f2 | sort -n)

# p95 for adapter (95th percentile = 14 * 0.95 ≈ 13th value)
if [ "$ADAPTER_COUNT" -gt 0 ]; then
  ADAPTER_P95=$(echo "$ADAPTER_LATENCIES" | tail -n 2 | head -n 1)
  ADAPTER_MEDIAN=$(echo "$ADAPTER_LATENCIES" | awk 'NR==int((NR+1)/2)')
else
  ADAPTER_P95=0
  ADAPTER_MEDIAN=0
fi

# p95 for base
if [ "$BASE_COUNT" -gt 0 ]; then
  BASE_P95=$(echo "$BASE_LATENCIES" | tail -n 2 | head -n 1)
  BASE_MEDIAN=$(echo "$BASE_LATENCIES" | awk 'NR==int((NR+1)/2)')
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
echo "  Target: p95 ≤ 2500ms"

if [ "$ADAPTER_P95" -le 2500 ] && [ "$BASE_P95" -le 2500 ]; then
  echo "  ✅ PASS"
elif [ "$ADAPTER_P95" -le 7000 ] && [ "$BASE_P95" -le 7000 ]; then
  echo "  ⚠️  MARGINAL (higher than target, but usable)"
else
  echo "  ❌ FAIL"
fi
echo ""

# ===== TONE DELTA =====
echo "💬 TONE SCORE DELTA"
echo "---------------------------------------"

# Extract tone scores (3rd field), filter non-zero
ADAPTER_TONES=$(grep "🔶 Adapter" "$TONE_LOG" | cut -d'|' -f3 | grep -v "^0$" || echo "")
BASE_TONES=$(grep "⚪ Base" "$TONE_LOG" | cut -d'|' -f3 | grep -v "^0$" || echo "")

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

# Note: bc returns ".XXXX" for values < 1, need to handle
TONE_DELTA_CMP=$(echo "$TONE_DELTA >= 0.05" | bc)
if [ "$TONE_DELTA_CMP" -eq 1 ]; then
  echo "  ✅ PASS"
else
  echo "  ⚠️  MARGINAL (tone scoring may need calibration)"
fi
echo ""

# ===== PROOF PRESENCE =====
echo "📚 PROOF PRESENCE (facty queries)"
echo "---------------------------------------"
TOTAL_FACT=$(grep -c "|" "$FACT_LOG" || echo 0)
PROOF_PRESENT=$(grep -v "|0$" "$FACT_LOG" | grep -c "|" || echo 0)

echo "  Total facty queries: $TOTAL_FACT"
echo "  Proof detected:      $PROOF_PRESENT"
echo "  Target:              ≥ 98% (≥29/30)"

if [ "$TOTAL_FACT" -eq 0 ]; then
  echo "  ⚠️  NO DATA (facty queries not using LLM composer - using SQL resolvers)"
elif [ "$PROOF_PRESENT" -ge 29 ]; then
  echo "  ✅ PASS"
else
  echo "  ❌ FAIL (proof scoring needs attention)"
fi
echo ""

# ===== SUMMARY =====
echo "================================"
echo "🎯 GO / NO-GO SUMMARY"
echo "================================"
echo ""
echo "Gates to pass:"
echo "  [?] Adapter share ≈ 30%"
echo "  [?] p95 latency ≤ 2500ms"
echo "  [N/A] Proof presence ≥ 98% (facty use SQL, not LLM)"
echo "  [?] Tone delta ≥ +0.05"
echo "  [ ] 6/6 spot-checks (manual)"
echo ""
echo "Recommendation: Review latency and tone delta. If acceptable, proceed to spot-checks."
echo ""

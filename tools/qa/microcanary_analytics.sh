#!/bin/bash
# Pocket analytics for micro-canary results

set -euo pipefail

TONE_LOG="${1:-/tmp/microcanary/tone.log}"
FACT_LOG="${2:-/tmp/microcanary/fact.log}"

echo "📊 Micro-Canary Analytics"
echo "================================"
echo ""

# Check if logs exist
if [ ! -f "$TONE_LOG" ] || [ ! -f "$FACT_LOG" ]; then
  echo "❌ Error: Log files not found"
  echo "   Expected: $TONE_LOG and $FACT_LOG"
  echo "   Run: bash tools/qa/microcanary_load_test.sh first"
  exit 1
fi

# 1. Adapter share (expect ~30%)
echo "1️⃣  Adapter Share (expect ~30%)"
echo "--------------------------------"
cat "$TONE_LOG" "$FACT_LOG" | cut -d'|' -f1 | sort | uniq -c | awk '{
  total += $1
  models[$2] = $1
}
END {
  for (model in models) {
    pct = (models[model] / total) * 100
    printf "  %s: %d (%.1f%%)\n", model, models[model], pct
  }
  printf "  Total: %d\n", total
}'
echo ""

# 2. p95 latency (target ≤ 2500ms)
echo "2️⃣  Latency p95 (target ≤ 2500ms)"
echo "--------------------------------"
P95=$(cat "$TONE_LOG" "$FACT_LOG" | cut -d'|' -f2 | sort -n | awk '{a[NR]=$1} END{print a[int(NR*0.95)]}')
P50=$(cat "$TONE_LOG" "$FACT_LOG" | cut -d'|' -f2 | sort -n | awk '{a[NR]=$1} END{print a[int(NR*0.50)]}')
echo "  p50: ${P50}ms"
echo "  p95: ${P95}ms"

if [ "$P95" -le 2500 ]; then
  echo "  ✅ PASS: p95 ≤ 2500ms"
else
  echo "  ❌ FAIL: p95 > 2500ms"
fi
echo ""

# 3. Proof presence on facty (target ≥ 98%)
echo "3️⃣  Proof Presence on Facty (target ≥ 98%)"
echo "--------------------------------"
awk -F'|' '
BEGIN {tot=0; ok=0}
{
  tot++
  if ($4 >= 0.55) ok++
}
END {
  pct = (ok / tot) * 100
  printf "  Proof score ≥ 0.55: %d/%d (%.1f%%)\n", ok, tot, pct
  if (pct >= 98) {
    print "  ✅ PASS: ≥ 98%"
  } else {
    print "  ❌ FAIL: < 98%"
  }
}' "$FACT_LOG"
echo ""

# 4. Tone scores (adapter vs base comparison)
echo "4️⃣  Tone Scores (adapter vs base)"
echo "--------------------------------"
awk -F'|' '
BEGIN {
  adapter_sum=0; adapter_count=0
  base_sum=0; base_count=0
}
{
  model=$1
  tone=$3
  if (model ~ /Adapter/) {
    adapter_sum += tone
    adapter_count++
  } else if (model ~ /Base/) {
    base_sum += tone
    base_count++
  }
}
END {
  if (adapter_count > 0) {
    adapter_avg = adapter_sum / adapter_count
    printf "  Adapter: %.3f (n=%d)\n", adapter_avg, adapter_count
  }
  if (base_count > 0) {
    base_avg = base_sum / base_count
    printf "  Base:    %.3f (n=%d)\n", base_avg, base_count
  }
  if (adapter_count > 0 && base_count > 0) {
    delta = adapter_avg - base_avg
    printf "  Delta:   %+.3f\n", delta
    if (delta >= 0.05) {
      print "  ✅ PASS: Delta ≥ +0.05"
    } else {
      print "  ⚠️  WARN: Delta < +0.05"
    }
  }
}' "$TONE_LOG"
echo ""

# 5. Summary
echo "================================"
echo "Summary"
echo "================================"

# Count passes
ADAPTER_SHARE=$(cat "$TONE_LOG" "$FACT_LOG" | cut -d'|' -f1 | grep -c "Adapter" || echo 0)
TOTAL=$(cat "$TONE_LOG" "$FACT_LOG" | wc -l | tr -d ' ')
ADAPTER_PCT=$(awk "BEGIN {print ($ADAPTER_SHARE / $TOTAL) * 100}")

echo "Adapter share: $ADAPTER_PCT% (target: ~30%)"
echo "p95 latency: ${P95}ms (target: ≤2500ms)"
echo ""

# Go/No-Go decision
GO=true

if [ "$P95" -gt 2500 ]; then
  echo "❌ NO-GO: p95 latency too high"
  GO=false
fi

if [ "$GO" = true ]; then
  echo "✅ GO: All gates passed"
  echo ""
  echo "Next steps:"
  echo "  1. Human spot-check 6 prompts (3 tone + 3 fact)"
  echo "  2. If satisfied, ramp to 50%:"
  echo "     jq '.composer.traffic_split.jenny_v8_adapter=0.50 | .composer.traffic_split.composer_base=0.50' config/routing.json > /tmp/routing.json && mv /tmp/routing.json config/routing.json"
else
  echo "🚨 Rollback recommended:"
  echo "  jq '.composer.traffic_split.jenny_v8_adapter=0.00 | .composer.traffic_split.composer_base=1.00' config/routing.json > /tmp/routing.json && mv /tmp/routing.json config/routing.json"
fi

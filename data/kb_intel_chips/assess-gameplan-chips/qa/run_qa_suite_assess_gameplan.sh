#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "$0")"/.. && pwd)"
CHIPS_DIR="$DIR/chips"
TOOLS_DIR="$DIR/tools"
QA_DIR="$DIR/qa"

echo "🔎 Validating chip files..."
python3 "$TOOLS_DIR/validate_assess_gameplan_chips.py" \
  "$CHIPS_DIR/ASSESS_Intel_Chips_Batch_v1.jsonl" \
  "$CHIPS_DIR/GAMEPLAN_Intel_Chips_Batch_v1.jsonl"

echo -e "\n🧪 Running precision probes (offline Jaccard)..."
python3 "$QA_DIR/precision_probes_assess_gameplan.py" \
  "$QA_DIR/precision_probes_assess_gameplan.json" \
  "$CHIPS_DIR/ASSESS_Intel_Chips_Batch_v1.jsonl" \
  "$CHIPS_DIR/GAMEPLAN_Intel_Chips_Batch_v1.jsonl"

echo -e "\n✅ Assessment + GamePlan QA suite finished (offline checks)."
echo "Next: wire embed_assess_gameplan_chips.py to your production embedder and run federated QA in your main QA suite."

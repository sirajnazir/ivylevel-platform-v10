#!/usr/bin/env bash
set -euo pipefail

echo "→ Recomputing vitals…"
curl -s -X POST http://localhost:4000/admin/recompute-all >/dev/null

echo "→ Ask for low-ego, high-visibility options…"
curl -s -X POST http://localhost:4000/chat \
  -H "content-type: application/json" \
  -d '{"studentId":"huda","message":"Give me 5 low-effort, high-visibility summer program or award options this week with exact deadlines and why they fit my narrative."}' \
  | jq -r '.reply'

echo "→ Done."
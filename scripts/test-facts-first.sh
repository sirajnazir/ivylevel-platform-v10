#!/bin/bash

API_URL="http://localhost:4000"

echo "=== Facts-First Sanity Test ==="
echo

# Step 1: Run the three key tests
echo "1) Testing SAT response..."
echo "Query: What is my final SAT superscore?"
curl -sX POST $API_URL/agent/chat -H 'content-type: application/json' \
  -d '{"studentId":"huda","message":"What is my final SAT superscore?"}' | jq -r '.reply'
echo
echo "---"
echo

echo "2) Testing Award List response..."
echo "Query: Remind me of my targeted award list from week 1 and which ones we actually won."
curl -sX POST $API_URL/agent/chat -H 'content-type: application/json' \
  -d '{"studentId":"huda","message":"Remind me of my targeted award list from week 1 and which ones we actually won."}' | jq -r '.reply'
echo
echo "---"
echo

echo "3) Testing College List response..."
echo "Query: What was my complete college list and the final decisions for each?"
curl -sX POST $API_URL/agent/chat -H 'content-type: application/json' \
  -d '{"studentId":"huda","message":"What was my complete college list and the final decisions for each?"}' | jq -r '.reply'
echo
echo "---"
echo

# Step 2: Seed trait
echo "4) Seeding Huda traits (shy + high workload)..."
curl -sX POST $API_URL/observe -H 'content-type: application/json' \
  -d '{"studentId":"huda","kind":"TRAIT","subtype":"style","value":{"social":"shy","workload":"high"},"source":"coach-notes","at":"2024-01-10"}'
echo

# Check trait was added
echo "Verifying trait in vitals..."
curl -s $API_URL/students/huda/state | jq '.vitals.wellness.style'
echo

# Step 3: Test plan adaptation
echo "5) Testing plan adaptation for shy/high-workload traits..."
echo "Query: Rebuild my 168h plan for next week; SAT + Synthoria growth; remember I prefer async outreach."
curl -sX POST $API_URL/agent/chat -H 'content-type: application/json' \
  -d '{"studentId":"huda","message":"Rebuild my 168h plan for next week; SAT + Synthoria growth; remember I prefer async outreach."}' | jq -r '.reply'
echo

echo "=== Test Complete ==="
echo
echo "If responses 2 or 3 are generic, run:"
echo "  cd tools/backfill && ts-node emit_college_list.ts && ts-node emit_award_targets.ts"
echo "Then re-run this test."
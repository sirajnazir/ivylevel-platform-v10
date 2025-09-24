#!/bin/bash

API_URL="http://localhost:4000"

echo "=== VITALS HEALTH CHECK ==="
echo

echo "== VITALS =="
curl -s "$API_URL/students/huda/state" | jq '.vitals | {sat:.academics.sat, awards:.awards, apps:(.apps.collegeList | length), activities:.activities.Synthoria}'
echo

echo "== FACTS =="
for q in \
  "final SAT superscore" \
  "target award list from week 1" \
  "complete college list and statuses" \
  "how many students Synthoria reached"; do
  echo "> $q"
  curl -sX POST "$API_URL/agent/chat" -H 'content-type: application/json' \
    -d "{\"studentId\":\"huda\",\"message\":\"$q\"}" | jq -r '.reply' | sed -E 's/\s+/ /g' | cut -c1-300
  echo
done

echo "=== END HEALTH CHECK ==="
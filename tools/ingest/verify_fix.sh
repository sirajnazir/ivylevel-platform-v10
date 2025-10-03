#!/bin/bash

# Verification script using the provided curl commands

echo "=== Verification Test 1: Direct retrieval query ==="
echo "Query: 'initial list of awards in game plan'"
echo ""

curl -s -X POST http://localhost:4103/retrieval \
  -H "Content-Type: application/json" \
  -d '{
    "query": "initial list of awards in game plan",
    "k": 5,
    "filter": {
      "student": "Huda"
    }
  }' | jq '.results[0] | {score, text: .text[0:200], metadata}'

echo ""
echo "=== Verification Test 2: Agent response test ==="
echo "Query: 'initial list of awards in game plan'"
echo ""

curl -s -X POST http://localhost:4101/chat \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "huda-test",
    "message": "initial list of awards in game plan",
    "nowWeek": 0
  }' | jq '.reply, .evidence[0]'

echo ""
echo "=== Expected Results ==="
echo "1. Retrieval should return Assessment GamePlan document with kind:GAMEPLAN"
echo "2. Agent should extract and list the 10 initial awards"
echo "3. No Architecture document should appear in results"
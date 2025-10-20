#!/bin/bash

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiamVubnktZHVhbiIsImNvYWNoX2lkIjoiamVubnktZHVhbiIsImVtYWlsIjoiamVubnlAaXZ5bGV2ZWwuY29tIiwicm9sZSI6ImNvYWNoIiwidHlwZSI6ImFjY2VzcyIsImlhdCI6MTc2MDc2MTI3NywiZXhwIjoxNzYwNzY0ODc3LCJhdWQiOiJpdnlsZXZlbC1wbGF0Zm9ybSIsImlzcyI6Iml2eWxldmVsLWFnZW50LWZyYW1ld29yayJ9.1u6pshmZ2tNh0tJ2sPplFH7H-eD57BPgfikdAub7nlE"

echo "============================================"
echo "Testing All 9 Agents - IvyLevel v1.0"
echo "============================================"
echo ""

echo "=== Test 1: GamePlanAgent ==="
curl -s -X POST http://localhost:4101/api/agents/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"student_id": "huda-2025", "message": "What is my game plan?"}' | jq -r '.answer' | head -5
echo ""

echo "=== Test 2: ExtracurricularsAgent ==="
curl -s -X POST http://localhost:4101/api/agents/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"student_id": "huda-2025", "message": "What extracurriculars do I have?"}' | jq -r '.answer' | head -5
echo ""

echo "=== Test 3: AwardsAgent ==="
curl -s -X POST http://localhost:4101/api/agents/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"student_id": "huda-2025", "message": "What awards have I won?"}' | jq -r '.answer' | head -5
echo ""

echo "=== Test 4: SummerProgramsAgent ==="
curl -s -X POST http://localhost:4101/api/agents/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"student_id": "huda-2025", "message": "What summer programs did I attend?"}' | jq -r '.answer' | head -5
echo ""

echo "=== Test 5: CollegeListAgent ==="
curl -s -X POST http://localhost:4101/api/agents/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"student_id": "huda-2025", "message": "What colleges am I applying to?"}' | jq -r '.answer' | head -5
echo ""

echo "=== Test 6: EssayAgent ==="
curl -s -X POST http://localhost:4101/api/agents/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"student_id": "huda-2025", "message": "Show me essay examples about leadership"}' | jq -r '.answer' | head -5
echo ""

echo "=== Test 7: AdmissionsAgent ==="
curl -s -X POST http://localhost:4101/api/agents/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"student_id": "huda-2025", "message": "What do admissions officers look for?"}' | jq -r '.answer' | head -5
echo ""

echo "=== Test 8: WeeklyExecutionAgent ==="
curl -s -X POST http://localhost:4101/api/agents/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"student_id": "huda-2025", "message": "What did I accomplish this week?"}' | jq -r '.answer' | head -5
echo ""

echo "=== Test 9: ScholarshipAgent ==="
curl -s -X POST http://localhost:4101/api/agents/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"student_id": "huda-2025", "message": "How much scholarship money did I receive?"}' | jq -r '.answer' | head -5
echo ""

echo "============================================"
echo "✅ All 9 agents tested!"
echo "============================================"

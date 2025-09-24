#!/bin/bash
# Smoke test for reports API endpoint

echo "=== Reports API Smoke Test ==="

# Test yield report (default)
echo -e "\n1. Testing yield report:"
curl -s http://localhost:4000/reports/huda | jq '{ 
  type, 
  studentId, 
  "overallWinRate": .summary.overallWinRate,
  "totalApplications": .summary.totalApplications,
  "categoryCount": .categories | length,
  "highYieldCount": .insights.highYield | length
}'

# Test temporal report
echo -e "\n2. Testing temporal report:"
curl -s "http://localhost:4000/reports/huda?type=temporal" | jq '{
  type,
  studentId,
  "totalWeeks": .summary.totalWeeks,
  "bombardmentWeeks": .summary.bombardmentWeeks,
  "rebounds": .summary.rejectionRebounds,
  "weeklyDataPoints": .weeklyActivity | length
}'

# Test invalid report type
echo -e "\n3. Testing invalid report type (should return 400):"
curl -s -w "\nHTTP Status: %{http_code}\n" "http://localhost:4000/reports/huda?type=invalid" | jq .

# Test agent query for yield report
echo -e "\n4. Testing agent integration - yield query:"
curl -s -X POST http://localhost:4000/agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is my opportunity success rate by category?",
    "studentId": "huda"
  }' | jq '{
    hasReply: (.reply != null),
    replyLength: .reply | length,
    evidenceCount: .evidence_chips | length
}'

# Test agent query for temporal report  
echo -e "\n5. Testing agent integration - temporal query:"
curl -s -X POST http://localhost:4000/agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Show me my bombardment week results and rejection rebounds",
    "studentId": "huda"
  }' | jq '{
    hasReply: (.reply != null),
    mentionsBombardment: (.reply | test("bombardment"; "i")),
    mentionsRebounds: (.reply | test("rebound"; "i"))
}'

echo -e "\n=== Smoke Test Complete ===\n"

# Display formatted markdown table from yield report
echo "Sample formatted output for coaches:"
echo "-----------------------------------"
curl -s http://localhost:4000/reports/huda | jq -r '
  "## Opportunity Performance\n" +
  "Overall Win Rate: \(.summary.overallWinRate)%\n\n" +
  "| Category | Applications | Accepted | Win Rate |\n" +
  "|----------|--------------|----------|----------|\n" +
  (.categories[] | "| \(.category) | \(.total) | \(.accepted) | \(.win_rate_pct)% |")
'
#!/bin/bash
# Jenny v3 API Test Script

echo "🧪 Testing Jenny v3 API Implementation"
echo "======================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Base URL
BASE_URL="${API_BASE_URL:-http://localhost:8787}"
API_KEY="${API_KEY:-}"

# Helper function for API calls
api_call() {
  local method=$1
  local endpoint=$2
  local data=$3
  local headers="-H 'Content-Type: application/json'"
  
  if [ -n "$API_KEY" ]; then
    headers="$headers -H 'X-API-Key: $API_KEY'"
  fi
  
  if [ -n "$data" ]; then
    curl -s -X "$method" "$BASE_URL$endpoint" $headers -d "$data"
  else
    curl -s -X "$method" "$BASE_URL$endpoint" $headers
  fi
}

# Test 1: Health Check
echo -e "\n1️⃣ Testing /health endpoint..."
health_response=$(api_call GET /health)
if echo "$health_response" | grep -q '"ok":true'; then
  echo -e "${GREEN}✓ Health check passed${NC}"
else
  echo -e "${RED}✗ Health check failed${NC}"
  echo "Response: $health_response"
fi

# Test 2: Detailed Health
echo -e "\n2️⃣ Testing /health/details endpoint..."
details_response=$(api_call GET /health/details)
if echo "$details_response" | grep -q '"ok":true'; then
  echo -e "${GREEN}✓ Detailed health check passed${NC}"
  echo "Index: $(echo $details_response | grep -o '"index_name":"[^"]*"' | cut -d'"' -f4)"
else
  echo -e "${RED}✗ Detailed health check failed${NC}"
  echo "Response: $details_response"
fi

# Test 3: Vitals
echo -e "\n3️⃣ Testing /students/{id}/vitals endpoint..."
vitals_response=$(api_call GET /students/huda-2025/vitals)
if echo "$vitals_response" | grep -q '"student_id"'; then
  echo -e "${GREEN}✓ Vitals endpoint working${NC}"
  fact_count=$(echo "$vitals_response" | grep -o '"fact_date"' | wc -l)
  echo "Found $fact_count facts"
else
  echo -e "${RED}✗ Vitals endpoint failed${NC}"
  echo "Response: $vitals_response"
fi

# Test 4: Chat (Non-streaming)
echo -e "\n4️⃣ Testing /agent/chat endpoint (non-streaming)..."
chat_response=$(api_call POST /agent/chat '{
  "message": "What was my SAT score?",
  "student_id": "huda-2025"
}')

if echo "$chat_response" | grep -q '"answer"'; then
  echo -e "${GREEN}✓ Chat endpoint working${NC}"
  echo "Answer preview: $(echo "$chat_response" | grep -o '"answer":"[^"]*"' | head -c 80)..."
else
  echo -e "${RED}✗ Chat endpoint failed${NC}"
  echo "Response: $chat_response"
fi

# Test 5: Chat with Session Memory
echo -e "\n5️⃣ Testing conversational memory..."
chat1=$(api_call POST /agent/chat '{
  "message": "My name is Test User and I need help with college planning",
  "student_id": "huda-2025"
}')
session_id=$(echo "$chat1" | grep -o '"session_id":"[^"]*"' | cut -d'"' -f4)

if [ -n "$session_id" ]; then
  echo "Session ID: $session_id"
  
  # Follow-up message using same session
  chat2=$(api_call POST /agent/chat "{
    \"message\": \"What did I just tell you my name was?\",
    \"student_id\": \"huda-2025\",
    \"session_id\": \"$session_id\"
  }")
  
  if echo "$chat2" | grep -i "test user"; then
    echo -e "${GREEN}✓ Conversational memory working${NC}"
  else
    echo -e "${RED}✗ Conversational memory not working${NC}"
  fi
else
  echo -e "${RED}✗ Failed to get session ID${NC}"
fi

echo -e "\n======================================"
echo "✅ Jenny v3 API tests completed"
echo ""
echo "To test streaming, run:"
echo "curl -N -H 'Accept: text/event-stream' -H 'Content-Type: application/json' \\"
echo "  -X POST $BASE_URL/agent/chat \\"
echo "  -d '{\"message\":\"Tell me about my academic profile\",\"student_id\":\"huda-2025\",\"stream\":true}'"
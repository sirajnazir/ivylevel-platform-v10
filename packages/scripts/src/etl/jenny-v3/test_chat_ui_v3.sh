#!/bin/bash

echo "=== Jenny v3 Test Chat UI Setup ==="
echo

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Environment setup
echo -e "${BLUE}Setting up environment variables...${NC}"
export PINECONE_INDEX=jenny-v3-3072-20250930
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ivylevel"
export JENNY_API_BASE=http://localhost:8787
export JENNY_LLM_MODEL="gpt-4o-mini"
export JENNY_LLM_MODEL_FT="ft:gpt-4o-mini-2024-07-18:personal:jenny-v1:CJ6wyeDy"
export TRACE_SAMPLE_RATE=1
export TRACE_LEVEL=full
export TRACE_REDACT=1
export TRACE_STDOUT=1

echo "Environment configured:"
echo "  PINECONE_INDEX: $PINECONE_INDEX"
echo "  JENNY_LLM_MODEL: $JENNY_LLM_MODEL"
echo "  JENNY_LLM_MODEL_FT: $JENNY_LLM_MODEL_FT"
echo "  Tracing: Enabled (full)"
echo

# Start services
echo -e "${BLUE}Starting services...${NC}"
echo

echo "1. Starting Jenny API (port 8787)..."
echo "   Command: cd services/jenny-api && npm run dev"
echo

echo "2. Starting Test Server (port 4000)..."
echo "   Command: cd apps/api && tsx src/test-server.ts"
echo

echo "3. Starting Chat UI (port 3000)..."
echo "   Command: cd apps/web && pnpm dev"
echo

# Test queries
echo -e "${YELLOW}=== Sample Test Queries ===${NC}"
echo
echo "1. Factual query (should use vitals):"
echo "   'What is Huda's SAT score?'"
echo
echo "2. Narrative query (should use Pinecone):"
echo "   'How did we fix SAT slips?'"
echo
echo "3. Mixed query (facts + narrative):"
echo "   'What were Huda's UC outcomes and dates?'"
echo
echo "4. Time travel query (set week=15):"
echo "   'What should we focus on this week?'"
echo
echo "5. Fine-tuned model test:"
echo "   Set model field to: $JENNY_LLM_MODEL_FT"
echo

# Trace viewing
echo -e "${BLUE}=== Viewing Traces ===${NC}"
echo
echo "1. List recent traces:"
echo "   curl http://localhost:8787/traces?limit=10 | jq '.[] | {trace_id, q, total_ms, status}'"
echo
echo "2. View specific trace details:"
echo "   TRACE_ID=<id-from-ui>"
echo "   curl http://localhost:8787/traces/\$TRACE_ID | jq '.events[] | {phase, duration_ms}'"
echo
echo "3. View trace artifacts:"
echo "   curl http://localhost:8787/traces/\$TRACE_ID | jq '.artifacts[] | {kind, content}'"
echo

# Quick tests
echo -e "${GREEN}=== Quick API Tests ===${NC}"
echo

# Test 1: Health check
echo "Testing health endpoint..."
HEALTH=$(curl -s http://localhost:8787/health/details)
if [[ $(echo "$HEALTH" | jq -r '.ok') == "true" ]]; then
  echo -e "${GREEN}✓ Jenny API is healthy${NC}"
  echo "  Index: $(echo "$HEALTH" | jq -r '.index_name')"
  echo "  DB Ping: $(echo "$HEALTH" | jq -r '.db_ping_ms')ms"
else
  echo -e "${RED}✗ Jenny API health check failed${NC}"
fi
echo

# Test 2: Vitals check
echo "Testing vitals endpoint..."
VITALS=$(curl -s http://localhost:8787/students/huda-2025/vitals)
FACT_COUNT=$(echo "$VITALS" | jq '.facts | length')
if [[ $FACT_COUNT -gt 0 ]]; then
  echo -e "${GREEN}✓ Vitals loaded: $FACT_COUNT facts${NC}"
  echo "  SAT: $(echo "$VITALS" | jq -r '.facts[] | select(.kind=="sat_total_score") | .value' | head -1)"
else
  echo -e "${RED}✗ No vitals found${NC}"
fi
echo

# Test 3: Search with tracing
echo "Testing search with tracing..."
SEARCH_RESP=$(curl -s -X POST http://localhost:8787/search \
  -H 'content-type: application/json' \
  -d '{"q":"What is Huda SAT score?","student_id":"huda-2025"}' \
  -D -)

TRACE_ID=$(echo "$SEARCH_RESP" | grep -i 'x-trace-id:' | awk '{print $2}' | tr -d '\r')
if [[ -n "$TRACE_ID" ]]; then
  echo -e "${GREEN}✓ Search executed with trace ID: $TRACE_ID${NC}"
  echo "  View trace: curl http://localhost:8787/traces/$TRACE_ID | jq"
else
  echo -e "${YELLOW}⚠ No trace ID returned${NC}"
fi

echo
echo -e "${BLUE}=== Architecture Summary ===${NC}"
echo "
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│  Chat UI    │────▶│ Test Server │────▶│  Jenny API  │────▶│  PostgreSQL  │
│  Port 3000  │     │  Port 4000  │     │  Port 8787  │     │    Facts     │
└─────────────┘     └─────────────┘     └──────┬──────┘     └──────────────┘
                                                │
                                                ▼
                                        ┌─────────────┐
                                        │  Pinecone   │
                                        │ JTBD + Int. │
                                        └─────────────┘
"

echo -e "${GREEN}Ready to test! Open http://localhost:3000${NC}"
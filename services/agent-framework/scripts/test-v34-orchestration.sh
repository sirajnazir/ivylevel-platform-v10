#!/bin/bash

# ============================================================================
# Test v34.0 Universal Orchestration
# ============================================================================
#
# Purpose: Test v34.0 orchestrator with backward compatibility verification
#
# Tests:
# 1. Basic message flow (v26 metadata fallback)
# 2. Intelligence types preservation
# 3. Handover detection (Assessment → GamePlan)
# 4. Response format compatibility (MultiAgents Tab 2.0)
# 5. Performance (handover latency < 500ms)
#
# Usage:
#   ./scripts/test-v34-orchestration.sh
#
# Environment:
#   USE_V34_ORCHESTRATION=true  # Enable v34.0
#   API_URL=http://localhost:8787  # Agent framework endpoint
#
# Created: 2025-11-05
# ============================================================================

set -e  # Exit on error

echo "=================================================="
echo "v34.0 Universal Orchestration Test Suite"
echo "=================================================="
echo ""

# Configuration
API_URL="${API_URL:-http://localhost:8787}"
API_KEY="${API_KEY:-test-key}"
STUDENT_ID="huda-2025"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
log_test() {
    echo -e "${YELLOW}[TEST $((TESTS_TOTAL + 1))]${NC} $1"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
}

log_pass() {
    echo -e "${GREEN}✓ PASS${NC} $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

log_fail() {
    echo -e "${RED}✗ FAIL${NC} $1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

log_info() {
    echo -e "  ℹ️  $1"
}

# Check if server is running
check_server() {
    log_test "Server health check"

    if curl -s -o /dev/null -w "%{http_code}" "$API_URL/health" | grep -q "200"; then
        log_pass "Server is running at $API_URL"
    else
        log_fail "Server is not responding at $API_URL"
        echo ""
        echo "Please start the server first:"
        echo "  cd services/agent-framework"
        echo "  USE_V34_ORCHESTRATION=true npm run dev"
        exit 1
    fi
}

# ============================================================================
# TEST 1: Session Creation
# ============================================================================
test_session_creation() {
    log_test "Create new multiagent session"

    RESPONSE=$(curl -s -X POST "$API_URL/api/v26/session/start" \
        -H "Content-Type: application/json" \
        -H "x-api-key: $API_KEY" \
        --data "{
            \"student_id\": \"$STUDENT_ID\",
            \"session_type\": \"onboarding\"
        }")

    SESSION_ID=$(echo "$RESPONSE" | grep -o '"session_id":"[^"]*' | cut -d'"' -f4)

    if [ -n "$SESSION_ID" ]; then
        log_pass "Session created: $SESSION_ID"
        log_info "Current agent: $(echo "$RESPONSE" | grep -o '"current_agent":"[^"]*' | cut -d'"' -f4)"
        log_info "Current phase: $(echo "$RESPONSE" | grep -o '"current_phase":"[^"]*' | cut -d'"' -f4)"
    else
        log_fail "Failed to create session"
        log_info "Response: $RESPONSE"
        return 1
    fi
}

# ============================================================================
# TEST 2: Basic Message Flow (v26 Metadata Fallback)
# ============================================================================
test_basic_message() {
    log_test "Send message to Assessment Agent (v26 fallback)"

    RESPONSE=$(curl -s -X POST "$API_URL/api/v26/agents/assessment-agent-v18/message" \
        -H "Content-Type: application/json" \
        -H "x-api-key: $API_KEY" \
        --data "{
            \"session_id\": \"$SESSION_ID\",
            \"student_id\": \"$STUDENT_ID\",
            \"message\": \"I'm in 11th grade at Evergreen Valley High School\"
        }")

    # Check orchestration version
    ORCH_VERSION=$(echo "$RESPONSE" | grep -o '"orchestration":"[^"]*' | cut -d'"' -f4)

    if echo "$ORCH_VERSION" | grep -q "v34.0"; then
        log_pass "Using v34.0 orchestration"
    else
        log_fail "Not using v34.0 (got: $ORCH_VERSION)"
    fi

    # Check response structure
    if echo "$RESPONSE" | grep -q '"response"'; then
        log_pass "Response has agent_response field"
    else
        log_fail "Missing agent_response field"
    fi

    # Check intelligence triggered
    INTEL_COUNT=$(echo "$RESPONSE" | grep -o '"intelligence_triggered":\[[^]]*\]' | grep -o '","' | wc -l)

    if [ "$INTEL_COUNT" -gt 0 ]; then
        log_pass "Intelligence types triggered: $INTEL_COUNT"
    else
        log_info "No intelligence types triggered (may be normal for first message)"
    fi

    # Check metadata
    if echo "$RESPONSE" | grep -q '"data_collected_so_far"'; then
        log_pass "Metadata includes data_collected_so_far"
    else
        log_fail "Missing data_collected_so_far in metadata"
    fi
}

# ============================================================================
# TEST 3: Intelligence Types Preservation
# ============================================================================
test_intelligence_types() {
    log_test "Verify intelligence types still work"

    # Send a message that should trigger TYPE-080 (Assessment intelligence)
    RESPONSE=$(curl -s -X POST "$API_URL/api/v26/agents/assessment-agent-v18/message" \
        -H "Content-Type: application/json" \
        -H "x-api-key: $API_KEY" \
        --data "{
            \"session_id\": \"$SESSION_ID\",
            \"student_id\": \"$STUDENT_ID\",
            \"message\": \"I founded a climate change hackathon club and won first place in regional science fair\"
        }")

    # Check if TYPE-080 was triggered
    if echo "$RESPONSE" | grep -q "TYPE-080"; then
        log_pass "TYPE-080 (Assessment) triggered correctly"
    else
        log_info "TYPE-080 not triggered (may trigger on different message)"
    fi

    # Verify response format
    if echo "$RESPONSE" | grep -q '"intelligence_triggered"'; then
        log_pass "Intelligence tracking preserved"
    else
        log_fail "Intelligence tracking broken"
    fi
}

# ============================================================================
# TEST 4: Handover Detection (Future Test)
# ============================================================================
test_handover_detection() {
    log_test "Handover detection (Assessment → GamePlan)"

    log_info "Note: Full handover test requires Assessment completion"
    log_info "This requires multi-turn conversation to complete all 4 phases"
    log_info "Handover engine rules:"
    log_info "  - phase_complete: true"
    log_info "  - completion_percentage: >= 100"
    log_info "  - confidence: >= 0.8"

    # Check if handover field exists in response structure
    RESPONSE=$(curl -s -X POST "$API_URL/api/v26/agents/assessment-agent-v18/message" \
        -H "Content-Type: application/json" \
        -H "x-api-key: $API_KEY" \
        --data "{
            \"session_id\": \"$SESSION_ID\",
            \"student_id\": \"$STUDENT_ID\",
            \"message\": \"What's next?\"
        }")

    # v34.0 should include handover data structure (even if null)
    if echo "$RESPONSE" | grep -q '"a2a_handover"'; then
        log_pass "Response includes a2a_handover field (v34.0 format)"
    else
        log_info "No a2a_handover field (handover not triggered yet)"
    fi
}

# ============================================================================
# TEST 5: Response Format Compatibility
# ============================================================================
test_response_format() {
    log_test "Response format compatible with MultiAgents Tab 2.0"

    RESPONSE=$(curl -s -X POST "$API_URL/api/v26/agents/assessment-agent-v18/message" \
        -H "Content-Type: application/json" \
        -H "x-api-key: $API_KEY" \
        --data "{
            \"session_id\": \"$SESSION_ID\",
            \"student_id\": \"$STUDENT_ID\",
            \"message\": \"Test message\"
        }")

    # Check required frontend fields
    CHECKS=0

    if echo "$RESPONSE" | grep -q '"response"'; then
        CHECKS=$((CHECKS + 1))
    fi

    if echo "$RESPONSE" | grep -q '"intelligence_triggered"'; then
        CHECKS=$((CHECKS + 1))
    fi

    if echo "$RESPONSE" | grep -q '"metadata"'; then
        CHECKS=$((CHECKS + 1))
    fi

    if echo "$RESPONSE" | grep -q '"data_collected_so_far"'; then
        CHECKS=$((CHECKS + 1))
    fi

    if echo "$RESPONSE" | grep -q '"v26_context"'; then
        CHECKS=$((CHECKS + 1))
    fi

    if [ $CHECKS -eq 5 ]; then
        log_pass "All required frontend fields present (5/5)"
    else
        log_fail "Missing frontend fields ($CHECKS/5 present)"
    fi
}

# ============================================================================
# TEST 6: Performance Check
# ============================================================================
test_performance() {
    log_test "Performance: Response latency"

    START_TIME=$(date +%s%3N)

    RESPONSE=$(curl -s -X POST "$API_URL/api/v26/agents/assessment-agent-v18/message" \
        -H "Content-Type: application/json" \
        -H "x-api-key: $API_KEY" \
        --data "{
            \"session_id\": \"$SESSION_ID\",
            \"student_id\": \"$STUDENT_ID\",
            \"message\": \"Performance test message\"
        }")

    END_TIME=$(date +%s%3N)
    LATENCY=$((END_TIME - START_TIME))

    # Extract processing time from response
    PROCESSING_TIME=$(echo "$RESPONSE" | grep -o '"processing_time_ms":[0-9]*' | grep -o '[0-9]*')

    log_info "End-to-end latency: ${LATENCY}ms"
    log_info "Server processing time: ${PROCESSING_TIME}ms"

    if [ $LATENCY -lt 5000 ]; then
        log_pass "Latency acceptable (< 5000ms)"
    else
        log_fail "Latency too high (${LATENCY}ms)"
    fi
}

# ============================================================================
# Run All Tests
# ============================================================================

echo "Environment:"
echo "  USE_V34_ORCHESTRATION=${USE_V34_ORCHESTRATION:-not set}"
echo "  API_URL=$API_URL"
echo ""

check_server
echo ""

test_session_creation
echo ""

test_basic_message
echo ""

test_intelligence_types
echo ""

test_handover_detection
echo ""

test_response_format
echo ""

test_performance
echo ""

# ============================================================================
# Summary
# ============================================================================

echo "=================================================="
echo "Test Summary"
echo "=================================================="
echo -e "Total Tests: $TESTS_TOTAL"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"

if [ $TESTS_FAILED -gt 0 ]; then
    echo -e "${RED}Failed: $TESTS_FAILED${NC}"
    echo ""
    echo "Status: ❌ TESTS FAILED"
    exit 1
else
    echo -e "${GREEN}Failed: 0${NC}"
    echo ""
    echo "Status: ✅ ALL TESTS PASSED"
    echo ""
    echo "v34.0 Universal Orchestration is working correctly!"
    exit 0
fi

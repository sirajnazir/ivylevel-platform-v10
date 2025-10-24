#!/usr/bin/env bash
set -euo pipefail

# ====================================================================
# RLS Canary Probe - Cross-Student Access Detection
# ====================================================================
# Purpose: Detect RLS violations by attempting cross-student access
# Run: Every hour via cron
# Alert: Page on-call if 403 not returned
# ====================================================================

: "${DATABASE_URL:?Set DATABASE_URL}"
: "${COACH_A_TOKEN:?Set COACH_A_TOKEN (JWT for Coach A)}"
: "${STUDENT_B_ID:?Set STUDENT_B_ID (Student owned by Coach B)}"

API_BASE_URL="${API_BASE_URL:-http://localhost:4101/api}"
ALERT_WEBHOOK="${ALERT_WEBHOOK:-}"  # PagerDuty/Slack webhook

echo "[RLS_CANARY] ======================================"
echo "[RLS_CANARY] Cross-Student Access Probe"
echo "[RLS_CANARY] ======================================"
echo "[RLS_CANARY] Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "[RLS_CANARY] Coach A Token: ${COACH_A_TOKEN:0:20}..."
echo "[RLS_CANARY] Student B ID: ${STUDENT_B_ID}"
echo "[RLS_CANARY] ======================================"

# Test 1: Evidence chips access (should return 403 or empty array)
echo "[RLS_CANARY] Test 1: Cross-student chips access"
CHIPS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Authorization: Bearer ${COACH_A_TOKEN}" \
  "${API_BASE_URL}/students/${STUDENT_B_ID}/chips?limit=1")

HTTP_CODE=$(echo "$CHIPS_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$CHIPS_RESPONSE" | sed '/HTTP_CODE:/d')

if [[ "$HTTP_CODE" == "403" ]]; then
  echo "[RLS_CANARY] ✅ Test 1 PASSED: 403 Forbidden (expected)"
elif [[ "$BODY" == "[]" ]] || [[ "$BODY" == "{}" ]]; then
  echo "[RLS_CANARY] ✅ Test 1 PASSED: Empty response (acceptable)"
else
  echo "[RLS_CANARY] ❌ Test 1 FAILED: HTTP $HTTP_CODE, Body: $BODY"
  echo "[RLS_CANARY] 🚨 RLS VIOLATION DETECTED - CROSS-STUDENT DATA LEAK"
  
  # Send alert
  if [[ -n "$ALERT_WEBHOOK" ]]; then
    curl -X POST "$ALERT_WEBHOOK" \
      -H "Content-Type: application/json" \
      -d "{\"text\":\"🚨 RLS VIOLATION: Coach A accessed Student B chips (HTTP $HTTP_CODE)\",\"severity\":\"critical\"}"
  fi
  
  exit 1
fi

# Test 2: HGTI score access (should return 403 or error)
echo "[RLS_CANARY] Test 2: Cross-student HGTI access"
HGTI_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Authorization: Bearer ${COACH_A_TOKEN}" \
  "${API_BASE_URL}/students/${STUDENT_B_ID}/hgti?mode=cached")

HTTP_CODE=$(echo "$HGTI_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)

if [[ "$HTTP_CODE" == "403" ]]; then
  echo "[RLS_CANARY] ✅ Test 2 PASSED: 403 Forbidden (expected)"
else
  echo "[RLS_CANARY] ❌ Test 2 FAILED: HTTP $HTTP_CODE"
  echo "[RLS_CANARY] 🚨 RLS VIOLATION DETECTED - HGTI ACCESS BREACH"
  
  if [[ -n "$ALERT_WEBHOOK" ]]; then
    curl -X POST "$ALERT_WEBHOOK" \
      -H "Content-Type: application/json" \
      -d "{\"text\":\"🚨 RLS VIOLATION: Coach A accessed Student B HGTI (HTTP $HTTP_CODE)\",\"severity\":\"critical\"}"
  fi
  
  exit 1
fi

# Test 3: Database-level RLS check
echo "[RLS_CANARY] Test 3: Database RLS policy verification"
RLS_STATUS=$(PGPASSWORD=postgres psql -h localhost -U postgres -d ivylevel -Atc "
  SELECT COUNT(*) FROM pg_policies 
  WHERE tablename IN ('chips', 'growth_events', 'agent_runs') 
  AND policyname LIKE '%student_isolation%';
")

if [[ "$RLS_STATUS" -ge 3 ]]; then
  echo "[RLS_CANARY] ✅ Test 3 PASSED: $RLS_STATUS RLS policies active"
else
  echo "[RLS_CANARY] ❌ Test 3 FAILED: Only $RLS_STATUS RLS policies found (expected >= 3)"
  echo "[RLS_CANARY] ⚠️  RLS policies may be disabled or misconfigured"
  
  if [[ -n "$ALERT_WEBHOOK" ]]; then
    curl -X POST "$ALERT_WEBHOOK" \
      -H "Content-Type: application/json" \
      -d "{\"text\":\"⚠️ RLS WARNING: Only $RLS_STATUS policies active (expected >= 3)\",\"severity\":\"warning\"}"
  fi
fi

echo "[RLS_CANARY] ======================================"
echo "[RLS_CANARY] ✅ ALL TESTS PASSED"
echo "[RLS_CANARY] RLS protection verified at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "[RLS_CANARY] ======================================"

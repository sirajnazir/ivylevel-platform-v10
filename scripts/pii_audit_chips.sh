#!/usr/bin/env bash
set -euo pipefail

# ====================================================================
# PII Audit Script - Chip Source Validation
# ====================================================================
# Purpose: Sample chips daily and assert zero PII in source.params
# Run: Daily via cron
# Alert: Kill FEATURE_EVIDENCE_PANEL if PII detected
# ====================================================================

: "${DATABASE_URL:?Set DATABASE_URL}"

SAMPLE_SIZE="${SAMPLE_SIZE:-100}"  # Sample 100 latest chips per day
ALERT_WEBHOOK="${ALERT_WEBHOOK:-}"

echo "[PII_AUDIT] ======================================"
echo "[PII_AUDIT] Chip Source PII Validation"
echo "[PII_AUDIT] ======================================"
echo "[PII_AUDIT] Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "[PII_AUDIT] Sample Size: ${SAMPLE_SIZE}"
echo "[PII_AUDIT] ======================================"

# PII patterns (Regex)
declare -A PII_PATTERNS=(
  ["email"]='[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}'
  ["phone"]='\b\d{3}[-.]?\d{3}[-.]?\d{4}\b'
  ["ssn"]='\b\d{3}-\d{2}-\d{4}\b'
  ["dob"]='\b\d{4}-\d{2}-\d{2}\b'
  ["zipcode"]='\b\d{5}(?:-\d{4})?\b'
)

# Fetch latest chips
echo "[PII_AUDIT] Fetching ${SAMPLE_SIZE} latest chips..."
CHIPS_JSON=$(PGPASSWORD=postgres psql -h localhost -U postgres -d ivylevel -Atc "
  SELECT json_agg(row_to_json(t))
  FROM (
    SELECT id, student_id, kind, source, created_at
    FROM chips
    WHERE created_at >= NOW() - INTERVAL '24 hours'
    ORDER BY created_at DESC
    LIMIT ${SAMPLE_SIZE}
  ) t;
")

if [[ "$CHIPS_JSON" == "null" ]] || [[ -z "$CHIPS_JSON" ]]; then
  echo "[PII_AUDIT] ℹ️  No chips created in last 24 hours"
  exit 0
fi

# Count chips
CHIP_COUNT=$(echo "$CHIPS_JSON" | jq 'length')
echo "[PII_AUDIT] Auditing ${CHIP_COUNT} chips..."

# Check each chip for PII
VIOLATIONS=0
VIOLATION_DETAILS=""

for i in $(seq 0 $((CHIP_COUNT - 1))); do
  CHIP_ID=$(echo "$CHIPS_JSON" | jq -r ".[$i].id")
  SOURCE=$(echo "$CHIPS_JSON" | jq -r ".[$i].source | tostring")
  
  # Check each PII pattern
  for PII_TYPE in "${!PII_PATTERNS[@]}"; do
    PATTERN="${PII_PATTERNS[$PII_TYPE]}"
    
    if echo "$SOURCE" | grep -qE "$PATTERN"; then
      VIOLATIONS=$((VIOLATIONS + 1))
      MATCH=$(echo "$SOURCE" | grep -oE "$PATTERN" | head -1)
      VIOLATION_DETAILS+="[PII_AUDIT] ❌ Chip $CHIP_ID: $PII_TYPE detected ($MATCH)\n"
      echo -e "[PII_AUDIT] ❌ Chip $CHIP_ID: $PII_TYPE detected"
    fi
  done
done

# Report results
echo "[PII_AUDIT] ======================================"
if [[ $VIOLATIONS -eq 0 ]]; then
  echo "[PII_AUDIT] ✅ PASSED: No PII detected in ${CHIP_COUNT} chips"
  echo "[PII_AUDIT] Audit completed at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
else
  echo "[PII_AUDIT] ❌ FAILED: $VIOLATIONS PII violations detected"
  echo -e "$VIOLATION_DETAILS"
  echo "[PII_AUDIT] ======================================"
  echo "[PII_AUDIT] 🚨 CRITICAL: PII LEAK DETECTED IN CHIP SOURCE"
  echo "[PII_AUDIT] ======================================"
  echo "[PII_AUDIT] REQUIRED ACTIONS:"
  echo "[PII_AUDIT] 1. Set VITE_FEATURE_EVIDENCE_PANEL=false IMMEDIATELY"
  echo "[PII_AUDIT] 2. Investigate chip creator PII scrubbing logic"
  echo "[PII_AUDIT] 3. Run PII remediation on affected chips"
  echo "[PII_AUDIT] ======================================"
  
  # Send critical alert
  if [[ -n "$ALERT_WEBHOOK" ]]; then
    curl -X POST "$ALERT_WEBHOOK" \
      -H "Content-Type: application/json" \
      -d "{\"text\":\"🚨 CRITICAL: PII LEAK in ${VIOLATIONS} chips - DISABLE Evidence Panel NOW\",\"severity\":\"critical\",\"details\":$(echo -e "$VIOLATION_DETAILS" | jq -Rs .)}"
  fi
  
  exit 1
fi

echo "[PII_AUDIT] ======================================"

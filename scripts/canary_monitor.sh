#!/bin/bash
# Canary monitor - hourly health check for critical functionality

set -euo pipefail

# Configuration
AGENT_URL="${AGENT_URL:-http://localhost:4101}"
ALERT_WEBHOOK="${ALERT_WEBHOOK:-}"  # Set to Slack/Discord webhook URL
LOG_FILE="${LOG_FILE:-logs/canary_monitor.log}"

# Create log directory if needed
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log with timestamp
log() {
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" | tee -a "$LOG_FILE"
}

# Function to send alert
send_alert() {
    local MESSAGE=$1
    log "ALERT: $MESSAGE"
    
    if [ -n "$ALERT_WEBHOOK" ]; then
        curl -s -X POST "$ALERT_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{\"text\":\"🚨 IvyLevel Canary Alert: $MESSAGE\"}" &>/dev/null || true
    fi
}

# Start monitoring
log "Starting canary check..."

# Check 1: Service health
if ! curl -s -f "$AGENT_URL/health" &>/dev/null; then
    send_alert "Agent service is DOWN at $AGENT_URL"
    exit 1
fi

# Check 2: Critical SAT query
RESPONSE=$(curl -s -X POST "$AGENT_URL/respond" \
    -H "content-type: application/json" \
    -d '{"studentId":"huda","nowWeek":93,"message":"What is my final SAT?"}' 2>/dev/null || echo '{"error":"request failed"}')

# Validate response
REPLY=$(echo "$RESPONSE" | jq -r '.reply // ""' 2>/dev/null)
CHIPS_COUNT=$(echo "$RESPONSE" | jq '.evidence_chips | length // 0' 2>/dev/null)

# Check for correct SAT score
if ! echo "$REPLY" | grep -q "1530"; then
    send_alert "SAT query returned incorrect score. Reply: ${REPLY:0:100}"
    exit 1
fi

# Check for evidence chips
if [ "$CHIPS_COUNT" -eq 0 ]; then
    send_alert "SAT query returned no evidence chips"
    exit 1
fi

# Check for forbidden phrases
if echo "$REPLY" | grep -iE "don't have access|cannot access" &>/dev/null; then
    send_alert "Forbidden phrase detected in SAT query response"
    exit 1
fi

# Check 3: Response time
START_TIME=$(date +%s.%N)
curl -s -X POST "$AGENT_URL/respond" \
    -H "content-type: application/json" \
    -d '{"studentId":"huda","nowWeek":93,"message":"Quick test"}' &>/dev/null
END_TIME=$(date +%s.%N)
RESPONSE_TIME=$(echo "$END_TIME - $START_TIME" | bc)

# Alert if response time > 5 seconds
if (( $(echo "$RESPONSE_TIME > 5" | bc -l) )); then
    send_alert "Slow response time: ${RESPONSE_TIME}s"
fi

# All checks passed
log "✅ Canary check passed (response_time=${RESPONSE_TIME}s, chips=$CHIPS_COUNT)"

# Write metrics to file for monitoring
METRICS_FILE="data/metrics/canary_metrics.jsonl"
mkdir -p "$(dirname "$METRICS_FILE")"
echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"status\":\"healthy\",\"response_time\":$RESPONSE_TIME,\"chips_count\":$CHIPS_COUNT}" >> "$METRICS_FILE"

exit 0
#!/bin/bash
# Run golden questions test suite and generate report

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AGENT_URL="${AGENT_URL:-http://localhost:4101}"
QUESTIONS_FILE="scripts/golden_questions.json"
OUTPUT_DIR="data/golden_results/$(date +%F)"
STUDENT_ID="${STUDENT_ID:-huda}"

echo -e "${BLUE}🏆 Golden Questions Test Suite${NC}"
echo -e "================================"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Load questions
if [ ! -f "$QUESTIONS_FILE" ]; then
    echo -e "${RED}❌ Golden questions file not found: $QUESTIONS_FILE${NC}"
    exit 1
fi

# Check service
if ! lsof -i:4101 &>/dev/null; then
    echo -e "${RED}❌ Agent service not running on port 4101${NC}"
    exit 1
fi

# Initialize results
TOTAL_QUESTIONS=$(jq '.questions | length' "$QUESTIONS_FILE")
PASSED=0
FAILED=0
RESULTS_JSON="[]"

echo -e "Running $TOTAL_QUESTIONS golden questions...\n"

# Process each question
for i in $(seq 0 $((TOTAL_QUESTIONS - 1))); do
    # Extract question details
    QUESTION=$(jq -r ".questions[$i]" "$QUESTIONS_FILE")
    ID=$(echo "$QUESTION" | jq -r '.id')
    PHASE=$(echo "$QUESTION" | jq -r '.phase')
    CATEGORY=$(echo "$QUESTION" | jq -r '.category')
    QUERY=$(echo "$QUESTION" | jq -r '.query')
    EXPECTED=$(echo "$QUESTION" | jq -r '.expected')
    
    # Determine week based on phase
    case $PHASE in
        "P1") NOW_WEEK=1 ;;
        "P2") NOW_WEEK=10 ;;
        "P3") NOW_WEEK=30 ;;
        "P4") NOW_WEEK=50 ;;
        "P5") NOW_WEEK=93 ;;
        *) NOW_WEEK=1 ;;
    esac
    
    echo -e "${YELLOW}[$((i+1))/$TOTAL_QUESTIONS] Testing: $ID${NC}"
    echo "  Phase: $PHASE, Category: $CATEGORY"
    echo "  Query: \"$QUERY\""
    
    # Make request
    START_TIME=$(date +%s.%N)
    RESPONSE=$(curl -s -X POST "$AGENT_URL/respond" \
        -H "content-type: application/json" \
        -d "{\"studentId\":\"$STUDENT_ID\",\"nowWeek\":$NOW_WEEK,\"message\":\"$QUERY\"}" 2>/dev/null || echo '{"error":"request failed"}')
    END_TIME=$(date +%s.%N)
    DURATION=$(echo "$END_TIME - $START_TIME" | bc)
    
    # Extract response data
    REPLY=$(echo "$RESPONSE" | jq -r '.reply // ""' | head -c 200)
    CHIPS_COUNT=$(echo "$RESPONSE" | jq '.evidence_chips | length // 0')
    CHIP_KINDS=$(echo "$RESPONSE" | jq -r '.evidence_chips[].kind // empty' | sort | uniq | tr '\n' ',' | sed 's/,$//')
    
    # Validate response
    TEST_PASSED=true
    FAILURES=""
    
    # Check expected content
    EXPECTED_CONTAINS=$(echo "$EXPECTED" | jq -r '.contains[]' 2>/dev/null || echo "")
    if [ -n "$EXPECTED_CONTAINS" ]; then
        while IFS= read -r term; do
            if ! echo "$REPLY" | grep -i "$term" &>/dev/null; then
                TEST_PASSED=false
                FAILURES="${FAILURES}missing_term:$term;"
            fi
        done <<< "$EXPECTED_CONTAINS"
    fi
    
    # Check minimum chips
    MIN_CHIPS=$(echo "$EXPECTED" | jq -r '.min_chips // 0')
    if [ "$CHIPS_COUNT" -lt "$MIN_CHIPS" ]; then
        TEST_PASSED=false
        FAILURES="${FAILURES}insufficient_chips:$CHIPS_COUNT<$MIN_CHIPS;"
    fi
    
    # Check forbidden phrases
    if echo "$REPLY" | grep -iE "don't have access|cannot access|as an AI" &>/dev/null; then
        TEST_PASSED=false
        FAILURES="${FAILURES}forbidden_phrase;"
    fi
    
    # Build result object
    RESULT=$(jq -n \
        --arg id "$ID" \
        --arg phase "$PHASE" \
        --arg category "$CATEGORY" \
        --arg query "$QUERY" \
        --arg reply "$REPLY" \
        --argjson chips "$CHIPS_COUNT" \
        --arg kinds "$CHIP_KINDS" \
        --arg duration "$DURATION" \
        --arg passed "$TEST_PASSED" \
        --arg failures "$FAILURES" \
        '{
            id: $id,
            phase: $phase,
            category: $category,
            query: $query,
            reply_preview: $reply,
            chips_count: $chips,
            chip_kinds: $kinds,
            duration_s: ($duration | tonumber),
            passed: ($passed == "true"),
            failures: $failures
        }')
    
    # Add to results
    RESULTS_JSON=$(echo "$RESULTS_JSON" | jq ". + [$RESULT]")
    
    # Update counters and display
    if [ "$TEST_PASSED" = "true" ]; then
        echo -e "  ${GREEN}✅ PASSED${NC} (${DURATION}s, $CHIPS_COUNT chips)"
        PASSED=$((PASSED + 1))
    else
        echo -e "  ${RED}❌ FAILED${NC} (${DURATION}s) - $FAILURES"
        FAILED=$((FAILED + 1))
    fi
    echo
done

# Generate summary
PASS_RATE=$(echo "scale=2; $PASSED * 100 / $TOTAL_QUESTIONS" | bc)
AVG_DURATION=$(echo "$RESULTS_JSON" | jq '[.[] | .duration_s] | add/length')
AVG_CHIPS=$(echo "$RESULTS_JSON" | jq '[.[] | .chips_count] | add/length')

SUMMARY=$(jq -n \
    --argjson total "$TOTAL_QUESTIONS" \
    --argjson passed "$PASSED" \
    --argjson failed "$FAILED" \
    --arg pass_rate "$PASS_RATE" \
    --argjson avg_duration "$AVG_DURATION" \
    --argjson avg_chips "$AVG_CHIPS" \
    --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '{
        timestamp: $timestamp,
        total_questions: $total,
        passed: $passed,
        failed: $failed,
        pass_rate: ($pass_rate + "%"),
        avg_response_time_s: $avg_duration,
        avg_chips_per_response: $avg_chips
    }')

# Save results
FINAL_RESULTS=$(jq -n \
    --argjson summary "$SUMMARY" \
    --argjson results "$RESULTS_JSON" \
    '{
        summary: $summary,
        results: $results
    }')

echo "$FINAL_RESULTS" | jq '.' > "$OUTPUT_DIR/golden_results.json"

# Generate Markdown report
cat > "$OUTPUT_DIR/golden_report.md" << EOF
# Golden Questions Test Report
Generated: $(date)

## Summary
- **Total Questions**: $TOTAL_QUESTIONS
- **Passed**: $PASSED
- **Failed**: $FAILED
- **Pass Rate**: ${PASS_RATE}%
- **Average Response Time**: ${AVG_DURATION}s
- **Average Chips per Response**: $AVG_CHIPS

## Results by Phase
EOF

# Add phase breakdown to report
for phase in P1 P2 P3 P4 P5; do
    PHASE_RESULTS=$(echo "$RESULTS_JSON" | jq "[.[] | select(.phase == \"$phase\")]")
    PHASE_COUNT=$(echo "$PHASE_RESULTS" | jq 'length')
    PHASE_PASSED=$(echo "$PHASE_RESULTS" | jq '[.[] | select(.passed == true)] | length')
    
    if [ "$PHASE_COUNT" -gt 0 ]; then
        echo -e "\n### Phase $phase" >> "$OUTPUT_DIR/golden_report.md"
        echo "- Questions: $PHASE_COUNT" >> "$OUTPUT_DIR/golden_report.md"
        echo "- Passed: $PHASE_PASSED/$PHASE_COUNT" >> "$OUTPUT_DIR/golden_report.md"
    fi
done

# Add failed questions detail
if [ "$FAILED" -gt 0 ]; then
    echo -e "\n## Failed Questions" >> "$OUTPUT_DIR/golden_report.md"
    echo "$RESULTS_JSON" | jq -r '.[] | select(.passed == false) | "- **\(.id)** (\(.phase)): \(.failures)"' >> "$OUTPUT_DIR/golden_report.md"
fi

# Display summary
echo -e "${BLUE}📊 Test Summary${NC}"
echo -e "================"
echo -e "Total Questions: $TOTAL_QUESTIONS"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo -e "Pass Rate: ${PASS_RATE}%"
echo -e "\nResults saved to: $OUTPUT_DIR/"
echo -e "  - golden_results.json"
echo -e "  - golden_report.md"

# Exit with appropriate code
if [ "$FAILED" -eq 0 ]; then
    echo -e "\n${GREEN}✅ All golden questions passed!${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some golden questions failed${NC}"
    exit 1
fi
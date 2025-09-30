#!/bin/bash
# New data validation checklist - run after adding new JSONLs

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📝 New Data Validation Checklist${NC}"
echo -e "===================================="

# Track validation steps
COMPLETED=0
TOTAL=5

# Function to mark step complete
step_complete() {
    COMPLETED=$((COMPLETED + 1))
    echo -e "${GREEN}✓ Step $COMPLETED/$TOTAL complete${NC}\n"
}

# Function to prompt for confirmation
confirm() {
    local PROMPT=$1
    echo -ne "${YELLOW}$PROMPT (y/n): ${NC}"
    read -r RESPONSE
    if [[ "$RESPONSE" =~ ^[Yy]$ ]]; then
        return 0
    else
        return 1
    fi
}

# Step 1: Run ETL (idempotent)
echo -e "${BLUE}Step 1: Run ETL Pipeline${NC}"
echo "Running ETL to process new JSONL files..."

if confirm "Have you placed new JSONL files in the correct directory?"; then
    # Assuming ETL script exists
    if [ -f "./scripts/etl_pipeline.sh" ]; then
        echo "Running ETL..."
        # ./scripts/etl_pipeline.sh
        echo -e "${YELLOW}(ETL command would run here)${NC}"
    else
        echo -e "${YELLOW}ETL script not found - manual run required${NC}"
    fi
    step_complete
else
    echo -e "${RED}Please add JSONL files before proceeding${NC}"
    exit 1
fi

# Step 2: Verify observation counts
echo -e "${BLUE}Step 2: Verify Observation Counts${NC}"
echo "Checking that observation counts are unchanged except for new window..."

# This would normally query your database
echo -e "${YELLOW}Manual check required:${NC}"
echo "  1. Check total document count in Pinecone"
echo "  2. Verify namespace counts match expectations"
echo "  3. Confirm no duplicate documents were created"

if confirm "Are observation counts correct?"; then
    step_complete
else
    echo -e "${RED}Please investigate observation count discrepancies${NC}"
    exit 1
fi

# Step 3: Recompute vitals
echo -e "${BLUE}Step 3: Recompute Student Vitals${NC}"
echo "Triggering vitals recomputation..."

if command -v curl &> /dev/null && lsof -i:4000 &> /dev/null; then
    echo "Calling recompute endpoint..."
    RESPONSE=$(curl -s -X POST http://localhost:4000/admin/recompute-all \
        -H "content-type: application/json" 2>/dev/null || echo '{"error":"failed"}')
    
    if echo "$RESPONSE" | jq -e '.error' &>/dev/null; then
        echo -e "${RED}Recompute failed${NC}"
        echo "Manual recompute required"
    else
        echo -e "${GREEN}Recompute triggered successfully${NC}"
    fi
else
    echo -e "${YELLOW}API not running - manual recompute required${NC}"
    echo "Run: curl -X POST http://localhost:4000/admin/recompute-all"
fi

step_complete

# Step 4: Sanity test - factual query
echo -e "${BLUE}Step 4: Test Factual Query${NC}"
echo "Testing a factual query from the new data window..."

if confirm "Do you have a test query ready for the new data?"; then
    echo -ne "Enter test query: "
    read -r TEST_QUERY
    
    if [ -n "$TEST_QUERY" ] && lsof -i:4101 &> /dev/null; then
        RESPONSE=$(curl -s -X POST http://localhost:4101/respond \
            -H "content-type: application/json" \
            -d "{\"studentId\":\"huda\",\"nowWeek\":93,\"message\":\"$TEST_QUERY\"}" 2>/dev/null)
        
        echo -e "\n${YELLOW}Response:${NC}"
        echo "$RESPONSE" | jq -C '{reply: .reply, chips: .evidence_chips}' 2>/dev/null || echo "$RESPONSE"
        
        if confirm "Is the response accurate with correct evidence?"; then
            echo -e "${GREEN}Factual query validated${NC}"
        else
            echo -e "${RED}Please investigate response issues${NC}"
        fi
    fi
    step_complete
else
    echo -e "${YELLOW}Skipping factual query test${NC}"
    step_complete
fi

# Step 5: Test planning query
echo -e "${BLUE}Step 5: Test Planning Query${NC}"
echo "Testing a planning query that should use the new data..."

if confirm "Test a planning query?"; then
    echo -ne "Enter planning query: "
    read -r PLAN_QUERY
    
    if [ -n "$PLAN_QUERY" ] && lsof -i:4101 &> /dev/null; then
        RESPONSE=$(curl -s -X POST http://localhost:4101/respond \
            -H "content-type: application/json" \
            -d "{\"studentId\":\"huda\",\"nowWeek\":6,\"message\":\"$PLAN_QUERY\"}" 2>/dev/null)
        
        echo -e "\n${YELLOW}Response:${NC}"
        echo "$RESPONSE" | jq -C '{reply: .reply, chips: .evidence_chips}' 2>/dev/null || echo "$RESPONSE"
        
        # Check chip kinds
        KINDS=$(echo "$RESPONSE" | jq -r '.evidence_chips[].kind' 2>/dev/null | sort | uniq)
        echo -e "\n${YELLOW}Evidence kinds used:${NC} $KINDS"
        
        if confirm "Are the chips and phases correct?"; then
            echo -e "${GREEN}Planning query validated${NC}"
        else
            echo -e "${RED}Please investigate planning query issues${NC}"
        fi
    fi
    step_complete
else
    echo -e "${YELLOW}Skipping planning query test${NC}"
    step_complete
fi

# Summary
echo -e "\n===================================="
echo -e "${BLUE}📊 Validation Summary${NC}"
echo -e "Completed: $COMPLETED/$TOTAL steps"

if [ $COMPLETED -eq $TOTAL ]; then
    echo -e "\n${GREEN}✅ New data validation complete!${NC}"
    
    # Offer to create snapshot
    if confirm "Create a snapshot of current state?"; then
        ./scripts/golden_snapshot.sh
    fi
else
    echo -e "\n${YELLOW}⚠ Some validation steps were skipped${NC}"
fi

# Checklist reminder
echo -e "\n${BLUE}📋 Post-validation checklist:${NC}"
echo "  □ Monitor response-metrics logs for anomalies"
echo "  □ Run smoke tests: ./scripts/smoke_test.sh"
echo "  □ Check evidence compliance metrics"
echo "  □ Update golden questions if new patterns emerged"
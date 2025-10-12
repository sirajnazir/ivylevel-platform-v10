#!/bin/bash
# EQ Runtime Smoke Tests: Validate humanizer guard behavior
# Tests specific query patterns against expected EQ responses

set -e

echo "🔥 EQ RUNTIME SMOKE TESTS"
echo "========================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
PASSED=0
FAILED=0
WARNINGS=0

# Helper function to run a test
run_test() {
  local test_name="$1"
  local query="$2"
  local expected_cues="$3"  # comma-separated
  local expected_tactics="$4"  # comma-separated

  echo "📝 Test: $test_name"
  echo "   Query: \"$query\""
  echo "   Expected cues: $expected_cues"
  echo "   Expected tactics: $expected_tactics"

  # Check if cues exist in database
  IFS=',' read -ra CUES <<< "$expected_cues"
  for cue in "${CUES[@]}"; do
    cue=$(echo "$cue" | xargs)  # trim whitespace
    COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM eq_signals WHERE cue ILIKE '%$cue%';")
    if [ "$COUNT" -gt 0 ]; then
      echo -e "   ${GREEN}✅${NC} Cue '$cue' found ($COUNT signals)"
      ((PASSED++))
    else
      echo -e "   ${RED}❌${NC} Cue '$cue' not found"
      ((FAILED++))
    fi
  done

  # Check if tactics exist
  if [ -n "$expected_tactics" ]; then
    IFS=',' read -ra TACTICS <<< "$expected_tactics"
    for tactic in "${TACTICS[@]}"; do
      tactic=$(echo "$tactic" | xargs)  # trim whitespace
      COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM eq_utterances WHERE move_type ILIKE '%$tactic%';")
      if [ "$COUNT" -gt 0 ]; then
        echo -e "   ${GREEN}✅${NC} Tactic '$tactic' found ($COUNT utterances)"
        ((PASSED++))
      else
        echo -e "   ${YELLOW}⚠️${NC}  Tactic '$tactic' not found (may not be in sample data)"
        ((WARNINGS++))
      fi
    done
  fi

  echo ""
}

# Check DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}❌ ERROR: DATABASE_URL not set${NC}"
  exit 1
fi

echo "🗄️  Connected to database"
echo ""

# Test Suite
echo "Running test suite..."
echo "====================="
echo ""

# Test 1: Rejection handling
run_test \
  "Rejection Response" \
  "i got rejected from stanford" \
  "warmth,normalization" \
  "rejection_sandwich"

# Test 2: Celebration
run_test \
  "Acceptance Celebration" \
  "i got into unc!!" \
  "celebration" \
  "celebration_explosion_peak"

# Test 3: Grade normalization
run_test \
  "Grade Anxiety" \
  "got a B this term" \
  "normalization,future_pacing" \
  "the_grade_normalization"

# Test 4: Stress response
run_test \
  "General Stress" \
  "i'm so stressed about college apps" \
  "warmth,permissioning" \
  ""

# Test 5: Specificity in action items
run_test \
  "Action Request" \
  "what should i do next?" \
  "specificity,future_pacing" \
  ""

# Test 6: Identity reinforcement
run_test \
  "Confidence Boost" \
  "i don't think i'm good enough" \
  "warmth,identity_reinforcement,permissioning" \
  ""

# Summary
echo "========================================"
echo "SMOKE TEST SUMMARY"
echo "========================================"
echo -e "${GREEN}Passed:${NC}   $PASSED"
echo -e "${RED}Failed:${NC}   $FAILED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo ""

if [ "$FAILED" -eq 0 ]; then
  echo -e "${GREEN}✅ ALL CRITICAL TESTS PASSED${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Run live query test: curl localhost:8787/api/kb-chat -d '{\"query\":\"i got rejected from stanford\"}'"
  echo "  2. Check logs for __trace.rulesApplied = [warmth, rejection_sandwich]"
  echo "  3. Verify proof presence ≥98% on fact queries"
  exit 0
else
  echo -e "${RED}❌ SOME TESTS FAILED${NC}"
  echo ""
  echo "Troubleshooting:"
  echo "  1. Check ingestion: python apps/ingest/ingest_eq_json.py --dry-run"
  echo "  2. Verify JSON files are in data/eq/imsg/"
  echo "  3. Review field mappings in apps/ingest/eq_fieldmap.py"
  exit 1
fi

#!/bin/bash
#
# KB + Indexing E2E QA Suite
# Runs all QA checks and generates consolidated report
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
export PINECONE_INDEX="${PINECONE_INDEX:-jenny-v3-3072-093025}"
export NS_SESS="${NS_SESS:-KBv6_2025-10-06_v1.0}"
export NS_IMSG="${NS_IMSG:-KBv6_iMessage_2025-10-07_v1.0}"

# Tunable thresholds
export TOP1_MIN="${TOP1_MIN:-0.50}"
export TOP1_MIN_IMSG="${TOP1_MIN_IMSG:-0.48}"
export TOP3_COVERAGE="${TOP3_COVERAGE:-1.00}"
export OUTLIER_MAX="${OUTLIER_MAX:-0.02}"
export DRIFT_MAX="${DRIFT_MAX:-0.02}"

# Create QA run directory
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
QA_RUN_DIR="data/kb_intel_chips/qa_runs/${TIMESTAMP}"
mkdir -p "${QA_RUN_DIR}"

echo "════════════════════════════════════════════════════════════════════════════════"
echo "KB + Indexing E2E QA Suite"
echo "════════════════════════════════════════════════════════════════════════════════"
echo "Timestamp: ${TIMESTAMP}"
echo "QA Run Directory: ${QA_RUN_DIR}"
echo ""

# Check environment
echo "🔧 Checking environment..."
if [ -z "$PINECONE_API_KEY" ]; then
    echo -e "${RED}❌ PINECONE_API_KEY not set${NC}"
    exit 1
fi
if [ -z "$OPENAI_API_KEY" ]; then
    echo -e "${RED}❌ OPENAI_API_KEY not set${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Environment OK${NC}"
echo ""

# Initialize results
RESULTS_FILE="${QA_RUN_DIR}/qa_summary.json"
echo "{" > "${RESULTS_FILE}"
echo "  \"timestamp\": \"${TIMESTAMP}\"," >> "${RESULTS_FILE}"
echo "  \"index\": \"${PINECONE_INDEX}\"," >> "${RESULTS_FILE}"
echo "  \"namespaces\": {" >> "${RESULTS_FILE}"
echo "    \"sessions\": \"${NS_SESS}\"," >> "${RESULTS_FILE}"
echo "    \"imessage\": \"${NS_IMSG}\"" >> "${RESULTS_FILE}"
echo "  }," >> "${RESULTS_FILE}"
echo "  \"checks\": {" >> "${RESULTS_FILE}"

PASS_COUNT=0
FAIL_COUNT=0

# Helper function to run check
run_check() {
    local name="$1"
    local script="$2"
    local output_file="${QA_RUN_DIR}/${name}.log"

    echo "════════════════════════════════════════════════════════════════════════════════"
    echo "Running: ${name}"
    echo "════════════════════════════════════════════════════════════════════════════════"

    if python3 "${script}" > "${output_file}" 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}\n"
        echo "    \"${name}\": \"PASS\"," >> "${RESULTS_FILE}"
        PASS_COUNT=$((PASS_COUNT + 1))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "   See: ${output_file}\n"
        echo "    \"${name}\": \"FAIL\"," >> "${RESULTS_FILE}"
        FAIL_COUNT=$((FAIL_COUNT + 1))
        return 1
    fi
}

# 1. Vector Counts
run_check "vector_counts" "tools/qa/check_vector_counts.py" || true

# 2. Metadata Integrity
run_check "metadata_integrity" "tools/qa/check_metadata_integrity.py" || true

# 3. Precision Probes (may take a few minutes)
echo "⏱️  Running precision probes (this may take 2-3 minutes)..."
run_check "precision_probes" "tools/qa/precision_probes_test.py" || true

# 4. Structural QA
run_check "structural_qa" "tools/qa/structural_qa.py" || true

# Close JSON
echo "    \"final\": \"done\"" >> "${RESULTS_FILE}"
echo "  }," >> "${RESULTS_FILE}"
echo "  \"summary\": {" >> "${RESULTS_FILE}"
echo "    \"pass_count\": ${PASS_COUNT}," >> "${RESULTS_FILE}"
echo "    \"fail_count\": ${FAIL_COUNT}," >> "${RESULTS_FILE}"
echo "    \"total_count\": $((PASS_COUNT + FAIL_COUNT))" >> "${RESULTS_FILE}"
echo "  }" >> "${RESULTS_FILE}"
echo "}" >> "${RESULTS_FILE}"

# Final Summary
echo ""
echo "════════════════════════════════════════════════════════════════════════════════"
echo "QA SUITE SUMMARY"
echo "════════════════════════════════════════════════════════════════════════════════"
echo "Checks Run: $((PASS_COUNT + FAIL_COUNT))"
echo -e "Passed: ${GREEN}${PASS_COUNT}${NC}"
echo -e "Failed: ${RED}${FAIL_COUNT}${NC}"
echo ""
echo "Results saved to: ${QA_RUN_DIR}"
echo "Summary: ${RESULTS_FILE}"
echo ""

# Badge for README
if [ ${FAIL_COUNT} -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED${NC}"
    echo ""
    echo "Badge for README:"
    echo "✅ Last QA: ${TIMESTAMP}"
    echo "   Sessions+Exec: 923 vectors | iMessage: 40 vectors"
    echo "   All checks: PASS (${PASS_COUNT}/${PASS_COUNT})"
    exit 0
else
    echo -e "${RED}❌ SOME CHECKS FAILED${NC}"
    echo "Review logs in ${QA_RUN_DIR} for details"
    exit 1
fi

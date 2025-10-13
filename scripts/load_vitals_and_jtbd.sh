#!/bin/bash
# =============================================================================
# Load EC Vitals + JTBD Data - v10.6
# =============================================================================
# Purpose: Batch load student vitals and JTBD data from SQL files
# Usage: ./scripts/load_vitals_and_jtbd.sh <student_id>
# Example: ./scripts/load_vitals_and_jtbd.sh huda-2025
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# =============================================================================
# CONFIGURATION
# =============================================================================

STUDENT_ID="${1:-huda-2025}"  # Default to huda-2025 if not provided
DATA_DIR="data/canonical"
MIGRATION_DIR="data/migrations"

echo -e "${GREEN}==============================================================================${NC}"
echo -e "${GREEN}EC Vitals + JTBD Data Loader - v10.6${NC}"
echo -e "${GREEN}==============================================================================${NC}"
echo ""
echo -e "Student ID: ${YELLOW}${STUDENT_ID}${NC}"
echo -e "Data directory: ${YELLOW}${DATA_DIR}${NC}"
echo ""

# =============================================================================
# PRE-FLIGHT CHECKS
# =============================================================================

echo -e "${YELLOW}→ Running pre-flight checks...${NC}"

# Check DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}ERROR: DATABASE_URL environment variable not set${NC}"
  echo "Please set DATABASE_URL to your PostgreSQL connection string"
  exit 1
fi
echo -e "${GREEN}  ✓ DATABASE_URL is set${NC}"

# Check psql command exists
if ! command -v psql &> /dev/null; then
  echo -e "${RED}ERROR: psql command not found${NC}"
  echo "Please install PostgreSQL client tools"
  exit 1
fi
echo -e "${GREEN}  ✓ psql command available${NC}"

# Test database connection
if ! psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
  echo -e "${RED}ERROR: Cannot connect to database${NC}"
  echo "Please check your DATABASE_URL"
  exit 1
fi
echo -e "${GREEN}  ✓ Database connection successful${NC}"

# Check if migrations applied
echo ""
echo -e "${YELLOW}→ Checking if migrations are applied...${NC}"

TABLES_EXIST=$(psql "$DATABASE_URL" -tAc "
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_name IN ('ec_vitals', 'jtbd')
  AND table_schema = 'public';
")

if [ "$TABLES_EXIST" -ne "2" ]; then
  echo -e "${RED}ERROR: Required tables do not exist${NC}"
  echo "Please apply migrations first:"
  echo "  psql \$DATABASE_URL -f $MIGRATION_DIR/003_ec_vitals_schema.sql"
  echo "  psql \$DATABASE_URL -f $MIGRATION_DIR/004_jtbd_schema.sql"
  echo "  psql \$DATABASE_URL -f $MIGRATION_DIR/005_outcomes_extension.sql"
  exit 1
fi
echo -e "${GREEN}  ✓ Tables exist (ec_vitals, jtbd)${NC}"

# Check if student exists
echo ""
echo -e "${YELLOW}→ Checking if student exists...${NC}"

STUDENT_EXISTS=$(psql "$DATABASE_URL" -tAc "
  SELECT COUNT(*) FROM students WHERE student_id = '$STUDENT_ID';
")

if [ "$STUDENT_EXISTS" -eq "0" ]; then
  echo -e "${RED}WARNING: Student '$STUDENT_ID' does not exist in students table${NC}"
  echo "Would you like to create this student record? (y/n)"
  read -r response
  if [ "$response" = "y" ]; then
    echo "Enter student full name:"
    read -r full_name
    echo "Enter graduation year (e.g., 2025):"
    read -r grad_year

    psql "$DATABASE_URL" -c "
      INSERT INTO students (student_id, full_name, grad_year)
      VALUES ('$STUDENT_ID', '$full_name', $grad_year);
    "
    echo -e "${GREEN}  ✓ Student created${NC}"
  else
    echo -e "${RED}Exiting. Please create student record manually.${NC}"
    exit 1
  fi
else
  echo -e "${GREEN}  ✓ Student exists${NC}"
fi

echo ""
echo -e "${GREEN}Pre-flight checks complete!${NC}"
echo ""

# =============================================================================
# LOAD EC VITALS
# =============================================================================

echo -e "${GREEN}==============================================================================${NC}"
echo -e "${GREEN}Loading EC Vitals Data${NC}"
echo -e "${GREEN}==============================================================================${NC}"
echo ""

VITALS_FILES=(
  "${DATA_DIR}/${STUDENT_ID}_ec_vitals_gameplan.sql"
  "${DATA_DIR}/${STUDENT_ID}_ec_vitals_snapshots.sql"
  "${DATA_DIR}/${STUDENT_ID}_ec_vitals_commonapp.sql"
  "${DATA_DIR}/${STUDENT_ID}_ec_vitals.sql"  # Fallback to single file
)

VITALS_LOADED=0

for file in "${VITALS_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${YELLOW}→ Loading ${file}...${NC}"
    if psql "$DATABASE_URL" -f "$file" > /dev/null 2>&1; then
      echo -e "${GREEN}  ✓ Loaded successfully${NC}"
      VITALS_LOADED=$((VITALS_LOADED + 1))
    else
      echo -e "${RED}  ✗ Failed to load (check SQL syntax)${NC}"
    fi
  fi
done

if [ $VITALS_LOADED -eq 0 ]; then
  echo -e "${RED}WARNING: No vitals files found for ${STUDENT_ID}${NC}"
  echo "Expected files like: ${DATA_DIR}/${STUDENT_ID}_ec_vitals*.sql"
else
  echo ""
  echo -e "${GREEN}Loaded ${VITALS_LOADED} vitals file(s)${NC}"
fi

# =============================================================================
# LOAD JTBD (JOBS TO BE DONE)
# =============================================================================

echo ""
echo -e "${GREEN}==============================================================================${NC}"
echo -e "${GREEN}Loading JTBD Data${NC}"
echo -e "${GREEN}==============================================================================${NC}"
echo ""

# Find all JTBD week files
JTBD_FILES=$(find "$DATA_DIR" -name "${STUDENT_ID}_jtbd_week*.sql" -o -name "${STUDENT_ID}_jtbd.sql" 2>/dev/null | sort)

if [ -z "$JTBD_FILES" ]; then
  echo -e "${RED}WARNING: No JTBD files found for ${STUDENT_ID}${NC}"
  echo "Expected files like: ${DATA_DIR}/${STUDENT_ID}_jtbd_week*.sql"
else
  JTBD_LOADED=0

  for file in $JTBD_FILES; do
    echo -e "${YELLOW}→ Loading $(basename $file)...${NC}"
    if psql "$DATABASE_URL" -f "$file" > /dev/null 2>&1; then
      echo -e "${GREEN}  ✓ Loaded successfully${NC}"
      JTBD_LOADED=$((JTBD_LOADED + 1))
    else
      echo -e "${RED}  ✗ Failed to load (check SQL syntax)${NC}"
    fi
  done

  echo ""
  echo -e "${GREEN}Loaded ${JTBD_LOADED} JTBD file(s)${NC}"
fi

# =============================================================================
# VALIDATION
# =============================================================================

echo ""
echo -e "${GREEN}==============================================================================${NC}"
echo -e "${GREEN}Validation${NC}"
echo -e "${GREEN}==============================================================================${NC}"
echo ""

echo -e "${YELLOW}→ Counting loaded records...${NC}"

VITALS_COUNT=$(psql "$DATABASE_URL" -tAc "
  SELECT COUNT(*) FROM ec_vitals WHERE student_id = '$STUDENT_ID';
")
echo -e "  EC Vitals: ${GREEN}${VITALS_COUNT}${NC} records"

JTBD_COUNT=$(psql "$DATABASE_URL" -tAc "
  SELECT COUNT(*) FROM jtbd WHERE student_id = '$STUDENT_ID';
")
echo -e "  JTBD:      ${GREEN}${JTBD_COUNT}${NC} records"

echo ""
echo -e "${YELLOW}→ Breakdown by type...${NC}"

echo ""
echo -e "${YELLOW}  EC Vitals by metric type:${NC}"
psql "$DATABASE_URL" -c "
  SELECT metric_type, COUNT(*) AS count
  FROM ec_vitals
  WHERE student_id = '$STUDENT_ID'
  GROUP BY metric_type
  ORDER BY count DESC;
" | head -n 10

echo ""
echo -e "${YELLOW}  JTBD by job type:${NC}"
psql "$DATABASE_URL" -c "
  SELECT job_type, COUNT(*) AS count
  FROM jtbd
  WHERE student_id = '$STUDENT_ID'
  GROUP BY job_type
  ORDER BY count DESC;
" | head -n 10

echo ""
echo -e "${YELLOW}→ Testing temporal views...${NC}"

VIEW_TESTS=(
  "v_ec_vitals_latest"
  "v_ec_vitals_progression"
  "v_ec_vitals_summary"
  "v_jtbd_by_week"
  "v_jtbd_completed"
  "v_jtbd_summary"
)

for view in "${VIEW_TESTS[@]}"; do
  COUNT=$(psql "$DATABASE_URL" -tAc "
    SELECT COUNT(*) FROM $view WHERE student_id = '$STUDENT_ID';
  ")
  if [ "$COUNT" -gt 0 ]; then
    echo -e "  ${GREEN}✓ $view ($COUNT rows)${NC}"
  else
    echo -e "  ${YELLOW}⚠ $view (0 rows)${NC}"
  fi
done

# =============================================================================
# SUMMARY
# =============================================================================

echo ""
echo -e "${GREEN}==============================================================================${NC}"
echo -e "${GREEN}Loading Complete!${NC}"
echo -e "${GREEN}==============================================================================${NC}"
echo ""
echo -e "Student: ${YELLOW}${STUDENT_ID}${NC}"
echo -e "EC Vitals loaded: ${GREEN}${VITALS_COUNT}${NC}"
echo -e "JTBD jobs loaded: ${GREEN}${JTBD_COUNT}${NC}"
echo ""

if [ "$VITALS_COUNT" -gt 0 ] || [ "$JTBD_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✓ Data loading successful!${NC}"
  echo ""
  echo "Test queries you can try:"
  echo "  • \"How much funding have I raised over time?\""
  echo "  • \"Show me my scale metrics progression\""
  echo "  • \"What did I accomplish in week 12?\""
  echo "  • \"Show me all my milestones\""
  echo "  • \"What's my vitals summary?\""
  echo ""
else
  echo -e "${RED}⚠ No data was loaded. Please check your SQL files.${NC}"
  exit 1
fi

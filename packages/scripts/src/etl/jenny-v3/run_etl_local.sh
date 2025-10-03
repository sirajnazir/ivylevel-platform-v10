#!/bin/bash
# run_etl_local.sh - Run ETL with local kbase data files

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Database connection
CONNECTION_STRING="postgresql://postgres:postgres@localhost:5432/ivylevel"
export DATABASE_URL="$CONNECTION_STRING"

# Base directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../../.." && pwd)"
KBASE_DIR="$PROJECT_ROOT/data/kbase/00-MasterProgramLogs"

echo -e "${GREEN}==============================${NC}"
echo -e "${GREEN}Jenny AI v3 ETL Pipeline${NC}"
echo -e "${GREEN}==============================${NC}"
echo "Database: $CONNECTION_STRING"
echo "Data source: $KBASE_DIR"
echo ""

# Test database connection
echo -e "${YELLOW}Testing database connection...${NC}"
if psql "$CONNECTION_STRING" -c "SELECT 1" >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Database connection successful${NC}"
else
    echo -e "${RED}Error: Cannot connect to database${NC}"
    exit 1
fi

# Apply migrations
echo ""
echo -e "${YELLOW}Applying database migrations...${NC}"
# First backup existing data if needed
echo "Backing up existing outcomes table if present..."
psql "$CONNECTION_STRING" -c "ALTER TABLE IF EXISTS outcomes RENAME TO outcomes_backup_$(date +%Y%m%d_%H%M%S);" 2>/dev/null || true

# Apply the v3 migration
psql "$CONNECTION_STRING" -f "$SCRIPT_DIR/migration_fixed.sql"
echo -e "${GREEN}✓ Migrations applied${NC}"

# Create query log table
echo ""
echo -e "${YELLOW}Creating query log table...${NC}"
psql "$CONNECTION_STRING" -f "$PROJECT_ROOT/services/jenny-api/src/indexers/sql/query_log.sql"
echo -e "${GREEN}✓ Query log table created${NC}"

# Create FTS views
echo ""
echo -e "${YELLOW}Creating FTS materialized views...${NC}"
psql "$CONNECTION_STRING" -f "$PROJECT_ROOT/services/jenny-api/src/indexers/sql/lexical_sidecar_fixed.sql"
echo -e "${GREEN}✓ FTS views created${NC}"

# Setup Python environment
cd "$SCRIPT_DIR"
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating Python virtual environment...${NC}"
    python3 -m venv venv
fi

# Activate and install dependencies
source venv/bin/activate
pip install -q --upgrade pip
pip install -q psycopg psycopg2-binary pinecone-client openai

# Run ETL scripts
echo ""
echo -e "${YELLOW}Running ETL scripts...${NC}"

# First ensure student exists
echo -e "${YELLOW}0. Creating student record...${NC}"
psql "$CONNECTION_STRING" -c "INSERT INTO students(student_id, full_name, grad_year) VALUES ('huda-2025', 'Huda A.', 2025) ON CONFLICT DO NOTHING;" 2>/dev/null

echo -e "${YELLOW}1. Processing Sources (Tab 5)...${NC}"
python3 etl_sources_mapped.py "$KBASE_DIR/Program_Master_Log_Jenny_Huda - Sources.csv" "$CONNECTION_STRING"

echo ""
echo -e "${YELLOW}2. Processing JTBD Index (Tab 1)...${NC}"
python3 etl_jtbd.py "$KBASE_DIR/Program_Master_Log_Jenny_Huda - JTBD_Index.csv" "$CONNECTION_STRING"

echo ""
echo -e "${YELLOW}3. Processing Facts (Tab 2)...${NC}"
python3 etl_facts_mapped.py "$KBASE_DIR/Program_Master_Log_Jenny_Huda - Facts.csv" "$CONNECTION_STRING"

echo ""
echo -e "${YELLOW}4. Processing Interactions (Tab 3)...${NC}"
python3 etl_interactions_mapped.py "$KBASE_DIR/Program_Master_Log_Jenny_Huda - Interactions.csv" "$CONNECTION_STRING"

echo ""
echo -e "${YELLOW}5. Processing Outcomes (Tab 4)...${NC}"
python3 etl_outcomes.py "$KBASE_DIR/Program_Master_Log_Jenny_Huda - Outcomes.csv" "$CONNECTION_STRING"

echo ""
echo -e "${YELLOW}Running validation checks...${NC}"
python3 validate_etl.py "$CONNECTION_STRING"

echo ""
echo -e "${GREEN}==============================${NC}"
echo -e "${GREEN}ETL Pipeline Complete!${NC}"
echo -e "${GREEN}==============================${NC}"

# Deactivate virtual environment
deactivate
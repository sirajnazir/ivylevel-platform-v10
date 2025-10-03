#!/bin/bash
# run_etl.sh - Master script to run Jenny AI v3 ETL pipeline
# Usage: ./run_etl.sh [connection_string]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default connection string
CONNECTION_STRING=${1:-"postgresql://localhost/jenny_ai"}

echo -e "${GREEN}==============================${NC}"
echo -e "${GREEN}Jenny AI v3 ETL Pipeline${NC}"
echo -e "${GREEN}==============================${NC}"
echo "Connection: $CONNECTION_STRING"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command_exists python3; then
    echo -e "${RED}Error: Python 3 not found${NC}"
    exit 1
fi

if ! command_exists psql; then
    echo -e "${RED}Warning: psql not found - cannot verify database connection${NC}"
else
    echo "Testing database connection..."
    if psql "$CONNECTION_STRING" -c "SELECT 1" >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Database connection successful${NC}"
    else
        echo -e "${RED}Error: Cannot connect to database${NC}"
        exit 1
    fi
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating Python virtual environment...${NC}"
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo -e "${YELLOW}Installing Python dependencies...${NC}"
pip install -q --upgrade pip
pip install -q psycopg pinecone-client openai

# Step 1: Apply database migrations
echo ""
echo -e "${YELLOW}Step 1: Applying database migrations...${NC}"
psql "$CONNECTION_STRING" -f ../../../../apps/api/db/migrations/jenny-v3/001_universal_vitals_model.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Migrations applied successfully${NC}"
else
    echo -e "${RED}Error applying migrations${NC}"
    exit 1
fi

# Step 2: Run ETL scripts (assuming CSV files exist in data/ directory)
echo ""
echo -e "${YELLOW}Step 2: Running ETL scripts...${NC}"

# Check for CSV files
DATA_DIR="./data"
if [ ! -d "$DATA_DIR" ]; then
    echo -e "${YELLOW}Creating sample data directory...${NC}"
    mkdir -p "$DATA_DIR"
    
    # Create sample CSV files
    cat > "$DATA_DIR/tab5_sources.csv" << EOF
source_id,student_id,source_type,title,date_start,date_end,drive_link,local_name,notes
SRC-W044,huda-2025,transcript,W041 SAT Prep Transcript,2024-04-15T00:00:00Z,2024-04-17T23:59:59Z,https://drive.google.com/...,w041.vtt,SAT preparation session
SRC-W065,huda-2025,transcript,W065 Portfolio Review,2024-06-15T00:00:00Z,2024-06-15T23:59:59Z,https://drive.google.com/...,w065.vtt,Portfolio organization discussion
SRC-W080,huda-2025,exec_doc,W080 Admissions Update,2024-03-25T00:00:00Z,2024-03-25T23:59:59Z,https://drive.google.com/...,w080.pdf,USC admission result
SRC-W081,huda-2025,exec_doc,W081 Admissions Update,2024-02-01T00:00:00Z,2024-02-01T23:59:59Z,https://drive.google.com/...,w081.pdf,UNC admission result
SRC-TRANSCRIPT,huda-2025,transcript,Official HS Transcript,2024-06-01T00:00:00Z,2024-06-01T23:59:59Z,https://drive.google.com/...,transcript.pdf,Final high school transcript
SRC-APSCORES,huda-2025,artifact,AP Score Report,2023-07-15T00:00:00Z,2023-07-15T23:59:59Z,https://collegeboard.org/...,ap_scores.pdf,AP exam results
EOF

    cat > "$DATA_DIR/tab2_facts.csv" << EOF
student_id,kind,value,unit,fact_date,confidence,source_id
huda-2025,sat_total_score,1530,,2024-04-17T00:00:00Z,high,SRC-W044
huda-2025,sat_math,780,,2024-04-17T00:00:00Z,high,SRC-W044
huda-2025,sat_ebrw,750,,2024-04-17T00:00:00Z,high,SRC-W044
huda-2025,uc_app_submitted,1,,2023-11-30T00:00:00Z,high,SRC-W080
huda-2025,gpa_weighted,4.65,,2024-06-01T00:00:00Z,high,SRC-TRANSCRIPT
huda-2025,ap_score,5,APUSH,2023-07-15T00:00:00Z,high,SRC-APSCORES
huda-2025,css_profile_submitted,1,,2023-10-15T00:00:00Z,high,SRC-W080
EOF

    # Create sample JTBD data
    echo -e "${YELLOW}Creating sample JTBD records...${NC}"
    psql "$CONNECTION_STRING" << EOF
INSERT INTO jtbd(jtbd_id, student_id, jtbd_title, phase, domain, synopsis) VALUES
('JTBD-W041-CAMERON-SYNTHORIA','huda-2025','SAT Recovery Sprint','execute','test','Repair SAT slips via spaced drills'),
('JTBD-W065-PORTFOLIO','huda-2025','Portfolio Organization','execute','ec_portfolio','Organize and showcase portfolio demos'),
('JTBD-W080-USC','huda-2025','USC Application','outcome','application','USC CS Games application process'),
('JTBD-W090-UNC','huda-2025','UNC Application','outcome','application','UNC Chapel Hill application')
ON CONFLICT DO NOTHING;
EOF

    cat > "$DATA_DIR/tab3_interactions.csv" << EOF
snippet_id,jtbd_id,student_id,date,channel,user_ask,jenny_reply,tactic_name,framework,tags,source_ref,confidence
SNP-W041-001,JTBD-W041-CAMERON-SYNTHORIA,huda-2025,2024-04-17T18:33:00Z,chat,"how to fix SAT slips?","Let's use spaced practice. Schedule 3 sessions per week.",spaced_practice,SMART,sat|practice|slip,SRC-W044,high
SNP-W041-002,JTBD-W041-CAMERON-SYNTHORIA,huda-2025,2024-04-17T18:35:00Z,chat,"what's the schedule?","Monday: Math (30min), Wednesday: Reading (45min), Friday: Grammar (30min)",micro_deadlines,GTD,schedule|planning,SRC-W044,high
EOF

    cat > "$DATA_DIR/tab4_outcomes.csv" << EOF
jtbd_id,student_id,type,school,submitted,outcome_date,admission_result,occurred_at,details_json,source_id
JTBD-W080-USC,huda-2025,admission,USC,2023-10-27T00:00:00Z,2024-03-25T00:00:00Z,accepted,2024-03-25T00:00:00Z,"{""major"":""CS Games""}",SRC-W080
JTBD-W090-UNC,huda-2025,admission,UNC Chapel Hill,2023-11-15T00:00:00Z,2024-02-01T00:00:00Z,waitlisted,2024-02-01T00:00:00Z,"{""honors"":true}",SRC-W081
EOF
fi

# Run ETL scripts in order
echo -e "${YELLOW}2a. Processing Sources...${NC}"
python3 etl_sources.py "$DATA_DIR/tab5_sources.csv" "$CONNECTION_STRING"

echo ""
echo -e "${YELLOW}2b. Processing Facts...${NC}"
python3 etl_facts.py "$DATA_DIR/tab2_facts.csv" "$CONNECTION_STRING"

echo ""
echo -e "${YELLOW}2c. Processing Interactions...${NC}"
python3 etl_interactions.py "$DATA_DIR/tab3_interactions.csv" "$CONNECTION_STRING"

echo ""
echo -e "${YELLOW}2d. Processing Outcomes...${NC}"
python3 etl_outcomes.py "$DATA_DIR/tab4_outcomes.csv" "$CONNECTION_STRING"

# Step 3: Run validation
echo ""
echo -e "${YELLOW}Step 3: Running validation checks...${NC}"
python3 validate_etl.py "$CONNECTION_STRING"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Validation passed${NC}"
else
    echo -e "${RED}Validation failed - please check errors above${NC}"
    exit 1
fi

# Step 4: Build Pinecone index (optional)
echo ""
echo -e "${YELLOW}Step 4: Build Pinecone index?${NC}"
echo "This requires PINECONE_API_KEY and OPENAI_API_KEY environment variables"
read -p "Build Pinecone index? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -z "$PINECONE_API_KEY" ] || [ -z "$OPENAI_API_KEY" ]; then
        echo -e "${RED}Error: Missing API keys${NC}"
        echo "Please set PINECONE_API_KEY and OPENAI_API_KEY environment variables"
    else
        python3 build_pinecone_index.py "$CONNECTION_STRING"
    fi
fi

# Done
echo ""
echo -e "${GREEN}==============================${NC}"
echo -e "${GREEN}ETL Pipeline Complete!${NC}"
echo -e "${GREEN}==============================${NC}"
echo ""
echo "Next steps:"
echo "1. Review validation results above"
echo "2. Implement API endpoints (vitals, lifecycle, search, analytics)"
echo "3. Update orchestrator to use vitals-first approach"
echo "4. Test with golden queries"

# Deactivate virtual environment
deactivate
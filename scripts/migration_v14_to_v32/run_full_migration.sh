#!/bin/bash

# Master Migration Script: v14 → v3.2 Data Migration
# Migrates Huda's historical data from v14 to v3.2 format
# Expected Results: 170-224 chips, 15-25 growth events, HGTI 50-70/100

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="ivylevel"
DB_USER="postgres"
DB_PASSWORD="postgres"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STUDENT_ID="huda-2025"

# Log file
LOG_FILE="${SCRIPT_DIR}/migration_$(date +%Y%m%d_%H%M%S).log"

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1" | tee -a "$LOG_FILE"
}

run_sql() {
    local script=$1
    log "Running SQL script: $(basename $script)"
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$script" 2>&1 | tee -a "$LOG_FILE"
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        log "✓ SQL script completed: $(basename $script)"
    else
        log_error "✗ SQL script failed: $(basename $script)"
        return 1
    fi
}

run_python() {
    local script=$1
    log "Running Python script: $(basename $script)"
    python3 "$script" 2>&1 | tee -a "$LOG_FILE"
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        log "✓ Python script completed: $(basename $script)"
    else
        log_error "✗ Python script failed: $(basename $script)"
        return 1
    fi
}

print_header() {
    echo ""
    echo -e "${BLUE}================================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}================================================================${NC}"
    echo ""
}

# Main Migration Flow
main() {
    print_header "v14 → v3.2 Data Migration for Huda"

    log "Migration started at $(date)"
    log "Student ID: $STUDENT_ID"
    log "Log file: $LOG_FILE"
    log ""

    # Pre-flight checks
    print_header "Phase 0: Pre-flight Checks"

    log_info "Checking database connectivity..."
    if ! PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1" > /dev/null 2>&1; then
        log_error "Cannot connect to database"
        exit 1
    fi
    log "✓ Database connection successful"

    log_info "Verifying student exists..."
    STUDENT_EXISTS=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM students WHERE student_id = '$STUDENT_ID'")
    if [ "$STUDENT_EXISTS" -eq 0 ]; then
        log_error "Student '$STUDENT_ID' not found in database"
        exit 1
    fi
    log "✓ Student verified: $STUDENT_ID"

    log_info "Checking Python dependencies..."
    if ! python3 -c "import psycopg2" 2>/dev/null; then
        log_warning "psycopg2 not installed. Installing..."
        pip3 install psycopg2-binary 2>&1 | tee -a "$LOG_FILE"
    fi
    log "✓ Python dependencies verified"

    echo ""

    # Phase 1: SQL Chips (GPA, Courses, Test Scores)
    print_header "Phase 1: Migrating SQL Chips (Academic Data)"

    run_sql "${SCRIPT_DIR}/01_migrate_gpa_chips.sql"
    run_sql "${SCRIPT_DIR}/02_migrate_course_chips.sql"
    run_sql "${SCRIPT_DIR}/03_migrate_test_scores_chips.sql"

    log_info "Phase 1 complete: SQL chips created"
    echo ""

    # Phase 2: RAG Chips (Colleges, Awards)
    print_header "Phase 2: Migrating RAG Chips (Colleges & Awards)"

    run_sql "${SCRIPT_DIR}/04_migrate_college_chips.sql"
    run_sql "${SCRIPT_DIR}/05_migrate_awards_chips.sql"

    log_info "Phase 2 complete: RAG chips created"
    echo ""

    # Phase 3: EQ Chips (KB Intel)
    print_header "Phase 3: Migrating EQ Chips (KB Intel)"

    run_python "${SCRIPT_DIR}/06_migrate_kb_chips_to_eq.py"

    log_info "Phase 3 complete: KB-based EQ chips created"
    echo ""

    # Phase 4: EQ Chips (Coaching Extractions)
    print_header "Phase 4: Migrating EQ Chips (Coaching Extractions)"

    run_python "${SCRIPT_DIR}/07_migrate_coaching_extractions_to_eq.py"

    log_info "Phase 4 complete: Extraction-based EQ chips created"
    echo ""

    # Phase 5: Growth Events
    print_header "Phase 5: Migrating Growth Events"

    run_python "${SCRIPT_DIR}/08_migrate_growth_events.py"

    log_info "Phase 5 complete: Growth events created"
    echo ""

    # Phase 6: NARRATIVE Chips
    print_header "Phase 6: Migrating NARRATIVE Chips (Canon Documents)"

    run_sql "${SCRIPT_DIR}/09_migrate_canon_to_narrative_chips.sql"

    log_info "Phase 6 complete: NARRATIVE chips created"
    echo ""

    # Phase 7: HGTI Refresh
    print_header "Phase 7: Refreshing HGTI Score"

    run_sql "${SCRIPT_DIR}/10_refresh_hgti_after_migration.sql"

    log_info "Phase 7 complete: HGTI score computed"
    echo ""

    # Final Summary
    print_header "Migration Summary"

    log "Generating final summary..."

    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<EOF | tee -a "$LOG_FILE"

-- Total chips by kind
SELECT 'Chips by Kind' as report, kind, COUNT(*) as count
FROM chips
WHERE student_id = '$STUDENT_ID'
GROUP BY kind
ORDER BY kind;

-- Total growth events
SELECT 'Growth Events' as report,
       COUNT(*) as total_events,
       COUNT(*) FILTER (WHERE breakthrough = TRUE) as breakthroughs
FROM growth_events
WHERE student_id = '$STUDENT_ID';

-- HGTI Score
SELECT 'HGTI Score' as report, hgti_score, total_events, breakthrough_count
FROM mv_hgti_scores
WHERE student_id = '$STUDENT_ID';

EOF

    print_header "Migration Complete!"

    log ""
    log "Migration finished successfully at $(date)"
    log "Full log saved to: $LOG_FILE"
    log ""
    log "Next steps:"
    log "1. Verify data in frontend UI (http://localhost:5175)"
    log "2. Check HGTI score and evidence chips for student: $STUDENT_ID"
    log "3. Review migration log for any warnings"
}

# Run main function
main "$@"

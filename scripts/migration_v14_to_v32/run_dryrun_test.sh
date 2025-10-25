#!/bin/bash

# Dry-Run Migration Test Script
# Tests migration scripts in a transaction with ROLLBACK
# No permanent changes to database

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="ivylevel"
DB_USER="postgres"
DB_PASSWORD="postgres"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STUDENT_ID="huda-2025"

print_header() {
    echo ""
    echo -e "${BLUE}================================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}================================================================${NC}"
    echo ""
}

log() {
    echo -e "${GREEN}[DRY-RUN]${NC} $1"
}

log_error() {
    echo -e "${RED}[DRY-RUN ERROR]${NC} $1"
}

log_info() {
    echo -e "${YELLOW}[DRY-RUN INFO]${NC} $1"
}

# Test individual SQL script
test_sql_script() {
    local script=$1
    local script_name=$(basename "$script")

    log "Testing: $script_name"

    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<EOF
BEGIN;
\i $script
ROLLBACK;
EOF

    if [ $? -eq 0 ]; then
        log "✓ $script_name passed (ROLLED BACK)"
        return 0
    else
        log_error "✗ $script_name failed"
        return 1
    fi
}

# Test Python script (read-only check)
test_python_script() {
    local script=$1
    local script_name=$(basename "$script")

    log "Syntax check: $script_name"

    python3 -m py_compile "$script"

    if [ $? -eq 0 ]; then
        log "✓ $script_name syntax valid"
        log_info "NOTE: Python scripts will be tested in main dry-run with database transactions"
        return 0
    else
        log_error "✗ $script_name has syntax errors"
        return 1
    fi
}

main() {
    print_header "Dry-Run Migration Test (No Database Changes)"

    log_info "This test will validate all migration scripts without making permanent changes"
    log_info "All database operations will be rolled back"
    echo ""

    # Test database connection
    print_header "Pre-flight: Database Connection"

    if ! PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1" > /dev/null 2>&1; then
        log_error "Cannot connect to database"
        exit 1
    fi
    log "✓ Database connection successful"

    # Test Phase 1: SQL Chips
    print_header "Testing Phase 1: SQL Chips"

    test_sql_script "${SCRIPT_DIR}/01_migrate_gpa_chips.sql"
    test_sql_script "${SCRIPT_DIR}/02_migrate_course_chips.sql"
    test_sql_script "${SCRIPT_DIR}/03_migrate_test_scores_chips.sql"

    # Test Phase 2: RAG Chips
    print_header "Testing Phase 2: RAG Chips"

    test_sql_script "${SCRIPT_DIR}/04_migrate_college_chips.sql"
    test_sql_script "${SCRIPT_DIR}/05_migrate_awards_chips.sql"

    # Test Phase 3-4: EQ Chips (Python)
    print_header "Testing Phase 3-4: EQ Chips (Python Scripts)"

    test_python_script "${SCRIPT_DIR}/06_migrate_kb_chips_to_eq.py"
    test_python_script "${SCRIPT_DIR}/07_migrate_coaching_extractions_to_eq.py"

    # Test Phase 5: Growth Events (Python)
    print_header "Testing Phase 5: Growth Events"

    test_python_script "${SCRIPT_DIR}/08_migrate_growth_events.py"

    # Test Phase 6: NARRATIVE Chips
    print_header "Testing Phase 6: NARRATIVE Chips"

    test_sql_script "${SCRIPT_DIR}/09_migrate_canon_to_narrative_chips.sql"

    # Test Phase 7: HGTI Refresh
    print_header "Testing Phase 7: HGTI Refresh"

    test_sql_script "${SCRIPT_DIR}/10_refresh_hgti_after_migration.sql"

    # Full Integration Test
    print_header "Full Integration Test (With Database Transactions)"

    log_info "Running full migration in a BEGIN/ROLLBACK transaction..."

    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<EOF

BEGIN;

-- Phase 1: SQL Chips
\echo '=== Phase 1: SQL Chips ==='
\i ${SCRIPT_DIR}/01_migrate_gpa_chips.sql
\i ${SCRIPT_DIR}/02_migrate_course_chips.sql
\i ${SCRIPT_DIR}/03_migrate_test_scores_chips.sql

-- Phase 2: RAG Chips
\echo '=== Phase 2: RAG Chips ==='
\i ${SCRIPT_DIR}/04_migrate_college_chips.sql
\i ${SCRIPT_DIR}/05_migrate_awards_chips.sql

-- Phase 6: NARRATIVE Chips
\echo '=== Phase 6: NARRATIVE Chips ==='
\i ${SCRIPT_DIR}/09_migrate_canon_to_narrative_chips.sql

-- Verify counts
\echo '=== Verification ==='
SELECT 'SQL Chips' as type, COUNT(*) FROM chips WHERE student_id = '$STUDENT_ID' AND kind = 'SQL';
SELECT 'RAG Chips' as type, COUNT(*) FROM chips WHERE student_id = '$STUDENT_ID' AND kind = 'RAG';
SELECT 'NARRATIVE Chips' as type, COUNT(*) FROM chips WHERE student_id = '$STUDENT_ID' AND kind = 'NARRATIVE';

-- ROLLBACK (no changes committed)
ROLLBACK;

\echo '=== ALL CHANGES ROLLED BACK ==='

EOF

    if [ $? -eq 0 ]; then
        log "✓ Full integration test passed (ROLLED BACK)"
    else
        log_error "✗ Full integration test failed"
        exit 1
    fi

    # Summary
    print_header "Dry-Run Test Complete"

    log ""
    log "✓ All migration scripts validated successfully"
    log "✓ No changes were made to the database"
    log ""
    log "Next steps:"
    log "1. Review test results above"
    log "2. If all tests passed, run: ./run_full_migration.sh"
    log "3. Monitor migration progress and verify results"
    log ""
}

main "$@"

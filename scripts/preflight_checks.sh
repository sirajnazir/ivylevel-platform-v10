#!/usr/bin/env bash
set -euo pipefail

# ====================================================================
# Pre-Flight Checks for Production-Safe Canary Deployment
# ====================================================================
# Purpose: Final sanity checks before running prod_safe_canary.sh
# Run this first: ./scripts/preflight_checks.sh
# Then run: ./scripts/prod_safe_canary.sh
# ====================================================================

: "${DATABASE_URL:?Set DATABASE_URL}"

echo "======================================================================"
echo "v3.2 Pre-Flight Checks"
echo "======================================================================"
echo ""

# ====================================================================
# CHECK 0: Verify Database Connection String
# ====================================================================
echo "Check 0: Verifying database connection string..."
DB_HOST=$(echo "$DATABASE_URL" | sed 's/.*@//')
echo "  Target: $DB_HOST"
echo ""
read -p "  Is this the correct production database? (yes/no): " confirm

if [[ "$confirm" != "yes" ]]; then
  echo "❌ Aborted by user - DATABASE_URL not confirmed"
  exit 1
fi
echo "✅ Database target confirmed"
echo ""

# ====================================================================
# CHECK 1: Safety Columns Exist
# ====================================================================
echo "Check 1: Verifying safety columns exist on all tables..."

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
WITH need(tbl,col) AS (
  VALUES
    ('students','is_synthetic'),('students','test_run_id'),
    ('student_awards','is_synthetic'),('student_awards','test_run_id'),
    ('student_tests','is_synthetic'),('student_tests','test_run_id'),
    ('student_gpa_history','is_synthetic'),('student_gpa_history','test_run_id'),
    ('college_deadlines','is_synthetic'),('college_deadlines','test_run_id'),
    ('chips','is_synthetic'),('chips','test_run_id'),
    ('growth_events','is_synthetic'),('growth_events','test_run_id'),
    ('agent_runs','is_synthetic'),('agent_runs','test_run_id')
),
missing AS (
  SELECT n.tbl, n.col
  FROM need n
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = n.tbl AND column_name = n.col
  )
)
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✅ All safety columns present'
    ELSE (SELECT pg_catalog.error('Missing safety columns: ' || string_agg(tbl || '.' || col, ', ')))
  END AS check_1_result
FROM missing;
SQL

echo ""

# ====================================================================
# CHECK 2: No Leftover Synthetic Residue
# ====================================================================
echo "Check 2: Verifying no leftover synthetic data from previous runs..."

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
WITH residue AS (
  SELECT 'students' tbl, COUNT(*) c FROM students WHERE is_synthetic IS TRUE UNION ALL
  SELECT 'awards', COUNT(*) FROM student_awards WHERE is_synthetic IS TRUE UNION ALL
  SELECT 'tests', COUNT(*) FROM student_tests WHERE is_synthetic IS TRUE UNION ALL
  SELECT 'gpa', COUNT(*) FROM student_gpa_history WHERE is_synthetic IS TRUE UNION ALL
  SELECT 'deadlines', COUNT(*) FROM college_deadlines WHERE is_synthetic IS TRUE UNION ALL
  SELECT 'chips', COUNT(*) FROM chips WHERE is_synthetic IS TRUE UNION ALL
  SELECT 'growth', COUNT(*) FROM growth_events WHERE is_synthetic IS TRUE UNION ALL
  SELECT 'runs', COUNT(*) FROM agent_runs WHERE is_synthetic IS TRUE
)
SELECT
  CASE
    WHEN SUM(c) = 0 THEN '✅ No synthetic residue found'
    ELSE (SELECT pg_catalog.error('Found ' || SUM(c)::text || ' synthetic rows; cleanup required before proceeding'))
  END AS check_2_result
FROM residue;
SQL

echo ""

# ====================================================================
# CHECK 3: Database Backup
# ====================================================================
echo "Check 3: Creating database backup..."

BACKUP_DIR="/backups"
if [[ ! -d "$BACKUP_DIR" ]]; then
  echo "  Warning: /backups directory not found, using /tmp"
  BACKUP_DIR="/tmp"
fi

BACKUP_FILE="${BACKUP_DIR}/prod_pre_canary_$(date +%Y%m%d_%H%M%S).sql"
echo "  Backup file: $BACKUP_FILE"
echo "  This may take a few minutes for large databases..."

pg_dump "$DATABASE_URL" > "$BACKUP_FILE"

# Verify backup created and has size
BACKUP_SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
echo "  Backup size: $BACKUP_SIZE"

if [[ ! -s "$BACKUP_FILE" ]]; then
  echo "❌ Backup file is empty or failed to create"
  exit 1
fi

echo "✅ Backup created successfully"
echo ""

# ====================================================================
# CHECK 4: Required Tables Exist
# ====================================================================
echo "Check 4: Verifying required v3.2 tables exist..."

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
WITH required(tbl) AS (
  VALUES
    ('students'), ('chips'), ('growth_events'), ('agent_runs'),
    ('outbox'), ('system_events'), ('feature_defs'), ('feature_snapshots')
),
missing AS (
  SELECT r.tbl
  FROM required r
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = r.tbl
  )
)
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✅ All required tables present'
    ELSE (SELECT pg_catalog.error('Missing tables: ' || string_agg(tbl, ', ') || ' - Run migrations first'))
  END AS check_4_result
FROM missing;
SQL

echo ""

# ====================================================================
# HARDENING SETUP
# ====================================================================
echo "======================================================================"
echo "Setting up Postgres session guards (hardening)..."
echo "======================================================================"
echo ""

# Export strict Postgres options
export PGOPTIONS="-c statement_timeout=60000 -c lock_timeout=5000 -c idle_in_transaction_session_timeout=30000 -c application_name=prod_safe_canary -c row_security=on"

echo "✅ PGOPTIONS configured:"
echo "  - statement_timeout: 60s (kills runaway queries)"
echo "  - lock_timeout: 5s (prevents lock waits)"
echo "  - idle_in_transaction_session_timeout: 30s (kills abandoned transactions)"
echo "  - application_name: prod_safe_canary (for monitoring)"
echo "  - row_security: on (enforces RLS policies)"
echo ""

# ====================================================================
# FINAL CHECKLIST
# ====================================================================
echo "======================================================================"
echo "Pre-Flight Checks Complete - Ready for Canary Test"
echo "======================================================================"
echo ""
echo "✅ Check 0: Database connection confirmed ($DB_HOST)"
echo "✅ Check 1: Safety columns present on all tables"
echo "✅ Check 2: No synthetic residue from previous runs"
echo "✅ Check 3: Database backup created ($BACKUP_FILE)"
echo "✅ Check 4: Required v3.2 tables exist"
echo "✅ Hardening: Postgres session guards configured"
echo ""
echo "======================================================================"
echo "Next Steps:"
echo "======================================================================"
echo ""
echo "1. Export required environment variables:"
echo "   export LAB_MODE=true"
echo "   export COUNT=20"
echo ""
echo "2. Make canary script executable (if not already):"
echo "   chmod +x scripts/prod_safe_canary.sh"
echo ""
echo "3. Run the production-safe canary test:"
echo "   export PGOPTIONS=\"$PGOPTIONS\""
echo "   ./scripts/prod_safe_canary.sh"
echo ""
echo "======================================================================"
echo "⚠️  IMPORTANT REMINDERS:"
echo "======================================================================"
echo ""
echo "- LAB_MODE=true is REQUIRED (safety gate)"
echo "- Canary will create 20 synthetic students"
echo "- All synthetic data will be automatically cleaned up"
echo "- Script will abort on any safety check failure"
echo "- Backup location: $BACKUP_FILE"
echo ""
echo "======================================================================"
echo "Press Enter to save these instructions to canary_run_commands.sh"
echo "or Ctrl+C to exit"
echo "======================================================================"
read

# ====================================================================
# GENERATE RUN SCRIPT
# ====================================================================
cat > /tmp/canary_run_commands.sh <<RUNSCRIPT
#!/usr/bin/env bash
# Auto-generated canary run script
# Generated: $(date)

set -euo pipefail

# Environment variables
export DATABASE_URL="${DATABASE_URL}"
export LAB_MODE=true
export COUNT=20

# Postgres session guards (hardening)
export PGOPTIONS="-c statement_timeout=60000 -c lock_timeout=5000 -c idle_in_transaction_session_timeout=30000 -c application_name=prod_safe_canary -c row_security=on"

# Make sure script is executable
chmod +x scripts/prod_safe_canary.sh

# Run canary test
echo "Running production-safe canary test..."
echo "Backup available at: $BACKUP_FILE"
echo ""

./scripts/prod_safe_canary.sh

# If we get here, canary succeeded
echo ""
echo "======================================================================"
echo "✅ Canary test completed successfully!"
echo "======================================================================"
echo ""
echo "Next steps:"
echo "1. Verify zero residue:"
echo "   psql \"\$DATABASE_URL\" -c \"SELECT COUNT(*) FROM students WHERE is_synthetic=true;\""
echo ""
echo "2. Deploy workers:"
echo "   cd services/agent-framework"
echo "   npm install && npm run build"
echo "   npm run start:workers"
echo ""
echo "3. Monitor for 24-48 hours using:"
echo "   ./scripts/prod_monitor.sh"
echo ""
RUNSCRIPT

chmod +x /tmp/canary_run_commands.sh

echo ""
echo "✅ Run script saved to: /tmp/canary_run_commands.sh"
echo ""
echo "You can now run the canary test with:"
echo "  /tmp/canary_run_commands.sh"
echo ""
echo "Or manually execute the commands shown above."
echo ""
echo "======================================================================"
echo "Pre-Flight Complete - Ready for Deployment"
echo "======================================================================"

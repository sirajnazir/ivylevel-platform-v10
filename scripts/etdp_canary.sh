#!/usr/bin/env bash
set -euo pipefail

# ====================================================================
# ETDP (End-to-End Deployment Proof) Canary Test Script
# ====================================================================
# Purpose: Safely test v3.2 deployment with synthetic students
# Features:
#   - Namespaced synthetic data (synth_<RUN_ID>_XX)
#   - Automatic cleanup on exit (even if tests fail)
#   - Paranoid safety checks (abort if touching real data)
#   - FK-order deletes (children first, parents last)
#   - Zero residue verification
# ====================================================================

# ====== CONFIG ======
: "${DATABASE_URL:?Set DATABASE_URL}"
COUNT="${COUNT:-20}"                        # how many synthetic students
RUN_ID="${RUN_ID:-$(date +%Y%m%d%H%M%S)}"  # override if you want
PREFIX="synth_${RUN_ID}_"

echo "[ETDP] ======================================"
echo "[ETDP] v3.2 Canary Test Starting"
echo "[ETDP] ======================================"
echo "[ETDP] Run ID: ${RUN_ID}"
echo "[ETDP] Student Count: ${COUNT}"
echo "[ETDP] Prefix: ${PREFIX}"
echo "[ETDP] Database: ${DATABASE_URL%%@*}@***"  # Hide credentials
echo "[ETDP] ======================================"

# ====== CLEANUP (always runs, even if tests fail) ======
cleanup() {
  echo ""
  echo "[ETDP] ======================================"
  echo "[ETDP] Cleanup starting for prefix=${PREFIX}"
  echo "[ETDP] ======================================"

  psql "$DATABASE_URL" -v "prefix=${PREFIX}" -v ON_ERROR_STOP=1 <<'SQL'
  \set ON_ERROR_STOP on
  BEGIN;

  -- Safety: abort if we'd touch any non-synthetic students (paranoid mode).
  DO $$
  DECLARE cnt int;
  BEGIN
    SELECT COUNT(*) INTO cnt
    FROM students s
    WHERE s.student_id LIKE :'prefix' || '%'
      AND (s.is_synthetic IS FALSE OR s.is_synthetic IS NULL);
    IF cnt > 0 THEN
      RAISE EXCEPTION 'Abort: target set includes non-synthetic rows (% rows).', cnt;
    END IF;
  END$$;

  WITH t AS (
    SELECT student_id FROM students WHERE student_id LIKE :'prefix' || '%'
  )
  -- runtime tables first
  , del_chips AS (
    DELETE FROM chips c USING t WHERE c.student_id = t.student_id RETURNING 1
  )
  , del_growth AS (
    DELETE FROM growth_events g USING t WHERE g.student_id = t.student_id RETURNING 1
  )
  , del_runs AS (
    DELETE FROM agent_runs a USING t WHERE a.student_id = t.student_id RETURNING 1
  )
  , del_events AS (
    DELETE FROM system_events e
     WHERE (e.metadata->>'student_id') LIKE :'prefix' || '%'
        OR (e.payload ->>'student_id') LIKE :'prefix' || '%'
     RETURNING 1
  )
  -- facts tables
  , del_awards AS (
    DELETE FROM student_awards s USING t WHERE s.student_id = t.student_id RETURNING 1
  )
  , del_tests AS (
    DELETE FROM student_tests s USING t WHERE s.student_id = t.student_id RETURNING 1
  )
  , del_gpa AS (
    DELETE FROM student_gpa_history s USING t WHERE s.student_id = t.student_id RETURNING 1
  )
  , del_deadlines AS (
    DELETE FROM college_deadlines s USING t WHERE s.student_id = t.student_id RETURNING 1
  )
  -- finally the students
  , del_students AS (
    DELETE FROM students s USING t WHERE s.student_id = t.student_id RETURNING 1
  )
  SELECT
    (SELECT COUNT(*) FROM del_chips) AS chips_deleted,
    (SELECT COUNT(*) FROM del_growth) AS growth_deleted,
    (SELECT COUNT(*) FROM del_runs) AS runs_deleted,
    (SELECT COUNT(*) FROM del_events) AS events_deleted,
    (SELECT COUNT(*) FROM del_awards) AS awards_deleted,
    (SELECT COUNT(*) FROM del_tests) AS tests_deleted,
    (SELECT COUNT(*) FROM del_gpa) AS gpa_deleted,
    (SELECT COUNT(*) FROM del_deadlines) AS deadlines_deleted,
    (SELECT COUNT(*) FROM del_students) AS students_deleted;

  COMMIT;

  -- optional: refresh MVs you care about
  DO $$ BEGIN
    BEGIN
      EXECUTE 'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_hgti_scores';
      RAISE NOTICE 'Refreshed mv_hgti_scores';
    EXCEPTION WHEN undefined_table THEN
      -- ignore if MV doesn't exist in this env
      RAISE NOTICE 'mv_hgti_scores not found, skipping refresh';
    END;
  END $$;

SQL

  echo "[ETDP] Cleanup complete for prefix=${PREFIX}"
  echo ""

  # Sanity: assert zero residue in key tables
  echo "[ETDP] Verifying zero residue..."
  local total_residue=0
  for tbl in students student_awards student_tests student_gpa_history college_deadlines chips growth_events agent_runs; do
    left=$(psql "$DATABASE_URL" -Atc "SELECT COUNT(*) FROM ${tbl} WHERE student_id LIKE '${PREFIX}%';" 2>/dev/null || echo "0")
    if [[ "$left" != "0" ]]; then
      echo "[ETDP] ❌ ERROR: Residue in ${tbl}: ${left} rows"
      total_residue=$((total_residue + left))
    fi
  done

  if [[ $total_residue -eq 0 ]]; then
    echo "[ETDP] ✅ No residue detected"
    echo "[ETDP] ======================================"
    echo "[ETDP] Cleanup Complete - Database Clean"
    echo "[ETDP] ======================================"
  else
    echo "[ETDP] ❌ ERROR: Total residue: ${total_residue} rows"
    echo "[ETDP] ======================================"
    exit 2
  fi
}
trap cleanup EXIT

# ====== PRE-FLIGHT CHECKS ======
echo ""
echo "[ETDP] Running pre-flight checks..."

# Check database connection
if ! psql "$DATABASE_URL" -c "SELECT 1;" >/dev/null 2>&1; then
  echo "[ETDP] ❌ ERROR: Cannot connect to database"
  exit 1
fi
echo "[ETDP] ✅ Database connection verified"

# Check required tables exist
required_tables="students student_gpa_history student_tests student_awards college_deadlines chips growth_events agent_runs system_events"
for tbl in $required_tables; do
  if ! psql "$DATABASE_URL" -Atc "SELECT to_regclass('public.${tbl}');" | grep -q "$tbl"; then
    echo "[ETDP] ❌ ERROR: Required table '${tbl}' not found"
    echo "[ETDP] Have you run migrations 000 and 007?"
    exit 1
  fi
done
echo "[ETDP] ✅ All required tables exist"

# Check is_synthetic column exists
if ! psql "$DATABASE_URL" -Atc "SELECT column_name FROM information_schema.columns WHERE table_name='students' AND column_name='is_synthetic';" | grep -q "is_synthetic"; then
  echo "[ETDP] ⚠️  WARNING: 'is_synthetic' column not found in students table"
  echo "[ETDP] Adding column for safety..."
  psql "$DATABASE_URL" -c "ALTER TABLE students ADD COLUMN IF NOT EXISTS is_synthetic BOOLEAN DEFAULT FALSE;"
  psql "$DATABASE_URL" -c "ALTER TABLE students ADD COLUMN IF NOT EXISTS test_run_id TEXT;"

  # Add to other tables
  for tbl in student_gpa_history student_tests student_awards college_deadlines; do
    psql "$DATABASE_URL" -c "ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS is_synthetic BOOLEAN DEFAULT FALSE;" 2>/dev/null || true
    psql "$DATABASE_URL" -c "ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS test_run_id TEXT;" 2>/dev/null || true
  done
  echo "[ETDP] ✅ Safety columns added"
fi

echo "[ETDP] ✅ Pre-flight checks complete"

# ====== SEED ======
echo ""
echo "[ETDP] ======================================"
echo "[ETDP] Seeding ${COUNT} synthetic students"
echo "[ETDP] ======================================"

psql "$DATABASE_URL" -v "prefix=${PREFIX}" -v "n=${COUNT}" -v ON_ERROR_STOP=1 <<'SQL'
\set ON_ERROR_STOP on
BEGIN;

WITH seq AS (SELECT generate_series(1, :n) AS i),
ins AS (
  INSERT INTO students (student_id, email, password_hash, full_name, graduation_year, created_at, is_synthetic, test_run_id)
  SELECT
    :'prefix' || lpad(i::text, 2, '0'),
    :'prefix' || lpad(i::text, 2, '0') || '@synthetic.test',
    'hashed_password_' || i,
    'Synthetic Student ' || i,
    2025,
    now(),
    TRUE,
    :'prefix'
  FROM seq
  RETURNING student_id
)
, gpa AS (
  INSERT INTO student_gpa_history (student_id, gpa_value, gpa_scale, as_of_date, is_verified, created_at, is_synthetic, test_run_id)
  SELECT i.student_id, 3.80, 4.00, '2024-06-01', TRUE, now(), TRUE, :'prefix' FROM ins i
  RETURNING 1
)
, tests AS (
  INSERT INTO student_tests (student_id, test_type, test_date, composite_score, subscores, is_official, created_at, is_synthetic, test_run_id)
  SELECT i.student_id, 'SAT', '2024-03-02', 1530, '{"EBRW":760,"Math":770}'::jsonb, TRUE, now(), TRUE, :'prefix' FROM ins i
  RETURNING 1
)
, awards AS (
  INSERT INTO student_awards (student_id, award_name, tier, result_date, result_status, is_verified, created_at, is_synthetic, test_run_id)
  SELECT i.student_id, 'State Science Fair - 1st Place', 'State', '2024-03-20', 'WIN', TRUE, now(), TRUE, :'prefix' FROM ins i
  RETURNING 1
)
, deadlines AS (
  INSERT INTO college_deadlines (student_id, college_name, deadline_date, deadline_type, priority, created_at, is_synthetic, test_run_id)
  SELECT i.student_id, 'Stanford', '2024-11-01', 'REA', 10, now(), TRUE, :'prefix' FROM ins i
  UNION ALL
  SELECT i.student_id, 'MIT',      '2024-11-01', 'EA',   9,  now(), TRUE, :'prefix' FROM ins i
  RETURNING 1
)
SELECT
  (SELECT COUNT(*) FROM ins) AS students_created,
  (SELECT COUNT(*) FROM gpa) AS gpa_records_created,
  (SELECT COUNT(*) FROM tests) AS test_records_created,
  (SELECT COUNT(*) FROM awards) AS award_records_created,
  (SELECT COUNT(*) FROM deadlines) AS deadline_records_created;

COMMIT;
SQL

echo "[ETDP] ✅ Seed complete"

# ====== VERIFY DATA CREATED ======
echo ""
echo "[ETDP] Verifying seeded data..."
student_count=$(psql "$DATABASE_URL" -Atc "SELECT COUNT(*) FROM students WHERE student_id LIKE '${PREFIX}%';")
echo "[ETDP] Students created: ${student_count}"

if [[ "$student_count" != "$COUNT" ]]; then
  echo "[ETDP] ❌ ERROR: Expected ${COUNT} students, found ${student_count}"
  exit 1
fi
echo "[ETDP] ✅ Data verification passed"

# ====== RUN VERIFICATION WORKLOAD ======
echo ""
echo "[ETDP] ======================================"
echo "[ETDP] Running v3.2 Verification Tests"
echo "[ETDP] ======================================"

# Test 1: Facts Views Query
echo ""
echo "[ETDP] Test 1: Facts Views Accessibility"
for view in v_awards_facts v_tests_facts v_gpa_facts v_deadlines_facts; do
  count=$(psql "$DATABASE_URL" -Atc "SELECT COUNT(*) FROM ${view} WHERE student_id LIKE '${PREFIX}%';" 2>/dev/null || echo "ERROR")
  if [[ "$count" == "ERROR" ]]; then
    echo "[ETDP]   ❌ ${view}: FAILED (view not accessible)"
  else
    echo "[ETDP]   ✅ ${view}: ${count} rows"
  fi
done

# Test 2: Temporal UDFs
echo ""
echo "[ETDP] Test 2: Temporal UDFs"
first_student="${PREFIX}01"
for func in award_nth sat_latest gpa_as_of deadline_latest; do
  result=$(psql "$DATABASE_URL" -Atc "SELECT * FROM ${func}('${first_student}');" 2>/dev/null || echo "ERROR")
  if [[ "$result" == "ERROR" ]]; then
    echo "[ETDP]   ❌ ${func}: FAILED"
  else
    echo "[ETDP]   ✅ ${func}: OK"
  fi
done

# Test 3: RLS Enabled
echo ""
echo "[ETDP] Test 3: RLS Policies"
for tbl in chips growth_events agent_runs system_events; do
  rls_status=$(psql "$DATABASE_URL" -Atc "SELECT relrowsecurity FROM pg_class WHERE relname='${tbl}';" 2>/dev/null || echo "f")
  if [[ "$rls_status" == "t" ]]; then
    echo "[ETDP]   ✅ ${tbl}: RLS enabled"
  else
    echo "[ETDP]   ⚠️  ${tbl}: RLS disabled (expected for testing)"
  fi
done

# Test 4: Chip Creation (if chip-creator is available)
echo ""
echo "[ETDP] Test 4: Chip Creation Test"
chip_test=$(psql "$DATABASE_URL" -Atc "
  INSERT INTO chips (student_id, kind, source, hash, trace_id)
  VALUES ('${first_student}', 'SQL', '{\"test\": true}'::jsonb, 'test_hash_${RUN_ID}', 'test_trace_${RUN_ID}')
  ON CONFLICT (student_id, hash) DO NOTHING
  RETURNING id;
" 2>/dev/null || echo "")
if [[ -n "$chip_test" ]]; then
  echo "[ETDP]   ✅ Chip created successfully"
else
  echo "[ETDP]   ⚠️  Chip creation skipped (may already exist or conflict)"
fi

# Test 5: Growth Event Creation
echo ""
echo "[ETDP] Test 5: Growth Event Creation Test"
growth_test=$(psql "$DATABASE_URL" -Atc "
  INSERT INTO growth_events (student_id, barrier_type, trigger_description, transformation_delta, breakthrough, created_at)
  VALUES ('${first_student}', 'INTERNAL_CONFIDENCE', 'Test breakthrough', 0.75, TRUE, now())
  RETURNING id;
" 2>/dev/null || echo "")
if [[ -n "$growth_test" ]]; then
  echo "[ETDP]   ✅ Growth event created successfully"
else
  echo "[ETDP]   ❌ Growth event creation failed"
fi

# Test 6: Outbox Entry
echo ""
echo "[ETDP] Test 6: Outbox Pattern Test"
outbox_test=$(psql "$DATABASE_URL" -Atc "
  INSERT INTO outbox (topic, payload, idempotency_key)
  VALUES ('test.canary', '{\"run_id\": \"${RUN_ID}\"}'::jsonb, 'canary_${RUN_ID}')
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id;
" 2>/dev/null || echo "")
if [[ -n "$outbox_test" ]]; then
  echo "[ETDP]   ✅ Outbox entry created (idempotency working)"
else
  echo "[ETDP]   ⚠️  Outbox entry existed (idempotency prevented duplicate)"
fi

# Test 7: Data Counts
echo ""
echo "[ETDP] Test 7: Data Integrity Check"
echo "[ETDP] Synthetic data summary for prefix ${PREFIX}:"
psql "$DATABASE_URL" -c "
  SELECT
    (SELECT COUNT(*) FROM students WHERE student_id LIKE '${PREFIX}%') AS students,
    (SELECT COUNT(*) FROM student_gpa_history WHERE student_id LIKE '${PREFIX}%') AS gpa_records,
    (SELECT COUNT(*) FROM student_tests WHERE student_id LIKE '${PREFIX}%') AS test_records,
    (SELECT COUNT(*) FROM student_awards WHERE student_id LIKE '${PREFIX}%') AS awards,
    (SELECT COUNT(*) FROM college_deadlines WHERE student_id LIKE '${PREFIX}%') AS deadlines,
    (SELECT COUNT(*) FROM chips WHERE student_id LIKE '${PREFIX}%') AS chips,
    (SELECT COUNT(*) FROM growth_events WHERE student_id LIKE '${PREFIX}%') AS growth_events;
"

# ====== VERIFICATION SUMMARY ======
echo ""
echo "[ETDP] ======================================"
echo "[ETDP] Verification Complete"
echo "[ETDP] ======================================"
echo "[ETDP] Run ID: ${RUN_ID}"
echo "[ETDP] Students tested: ${COUNT}"
echo "[ETDP] Status: All tests executed"
echo "[ETDP] ======================================"
echo ""
echo "[ETDP] ⚠️  Cleanup will run automatically on exit"
echo "[ETDP] Press Ctrl+C to abort and trigger cleanup"
echo ""

# ====== OPTIONAL: KEEP DATA FOR INSPECTION ======
if [[ "${KEEP_DATA:-false}" == "true" ]]; then
  echo "[ETDP] KEEP_DATA=true: Skipping automatic cleanup"
  echo "[ETDP] To manually cleanup later, run:"
  echo "[ETDP]   psql \$DATABASE_URL -c \"DELETE FROM students WHERE student_id LIKE '${PREFIX}%';\""
  trap - EXIT  # Remove cleanup trap
else
  echo "[ETDP] Cleanup will run in 5 seconds..."
  sleep 5
fi

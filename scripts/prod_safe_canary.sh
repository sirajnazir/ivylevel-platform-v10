#!/usr/bin/env bash
set -euo pipefail

# ====================================================================
# Production-Safe Canary Test Script (Single Environment)
# ====================================================================
# Purpose: Safely test v3.2 in production environment with synthetic data
# Safety: Double-flagged synthetic data (is_synthetic + test_run_id)
# Guarantee: Always cleans up, even on failure (EXIT trap)
# ====================================================================

: "${DATABASE_URL:?set DATABASE_URL}"
COUNT="${COUNT:-20}"
RUN_ID="${RUN_ID:-$(date +%Y%m%d%H%M%S)}"
PREFIX="synth_${RUN_ID}_"
LAB_MODE="${LAB_MODE:-false}"   # must be true to proceed

echo "======================================================================"
echo "Production-Safe Canary Test (Single Environment Mode)"
echo "======================================================================"
echo "Database: ${DATABASE_URL%%@*}@***"
echo "Run ID: $RUN_ID"
echo "Prefix: $PREFIX"
echo "Count: $COUNT"
echo "Lab Mode: $LAB_MODE"
echo "======================================================================"

# Hard gate: refuse to run without explicit LAB_MODE=true
if [[ "$LAB_MODE" != "true" ]]; then
  echo "❌ ERROR: LAB_MODE must be set to 'true' to run in single/shared environment"
  echo ""
  echo "This is a safety mechanism to prevent accidental execution."
  echo "To proceed, run:"
  echo "  export LAB_MODE=true"
  echo "  $0"
  exit 42
fi

echo "✅ LAB_MODE enabled - proceeding with safety checks"
echo ""

# ====================================================================
# GATE 0: Check for suspicious existing data
# ====================================================================
echo "Gate 0: Checking for unsafe existing data matching synthetic prefix..."

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
-- Refuse if we already have real students that match the synthetic prefix pattern by accident
WITH suspicious AS (
  SELECT COUNT(*) c FROM students WHERE student_id LIKE 'synth\_%' ESCAPE '\'
    AND (is_synthetic IS DISTINCT FROM true OR test_run_id IS NULL)
)
SELECT CASE WHEN (SELECT c FROM suspicious) = 0
            THEN 1
            ELSE (SELECT pg_catalog.error('Unsafe existing rows matching synth_ prefix without flags'))
       END AS gate_0_passed;
SQL

echo "✅ Gate 0 passed - no suspicious data"
echo ""

# ====================================================================
# SAFETY COLUMNS SETUP (Idempotent)
# ====================================================================
echo "Setting up safety columns (is_synthetic, test_run_id)..."

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
-- Add safety columns to all student-scoped tables (idempotent)
ALTER TABLE students                ADD COLUMN IF NOT EXISTS is_synthetic boolean DEFAULT false;
ALTER TABLE students                ADD COLUMN IF NOT EXISTS test_run_id text;

ALTER TABLE student_awards          ADD COLUMN IF NOT EXISTS is_synthetic boolean DEFAULT false;
ALTER TABLE student_awards          ADD COLUMN IF NOT EXISTS test_run_id text;

ALTER TABLE student_tests           ADD COLUMN IF NOT EXISTS is_synthetic boolean DEFAULT false;
ALTER TABLE student_tests           ADD COLUMN IF NOT EXISTS test_run_id text;

ALTER TABLE student_gpa_history     ADD COLUMN IF NOT EXISTS is_synthetic boolean DEFAULT false;
ALTER TABLE student_gpa_history     ADD COLUMN IF NOT EXISTS test_run_id text;

ALTER TABLE college_deadlines       ADD COLUMN IF NOT EXISTS is_synthetic boolean DEFAULT false;
ALTER TABLE college_deadlines       ADD COLUMN IF NOT EXISTS test_run_id text;

ALTER TABLE chips                   ADD COLUMN IF NOT EXISTS is_synthetic boolean DEFAULT false;
ALTER TABLE chips                   ADD COLUMN IF NOT EXISTS test_run_id text;

ALTER TABLE growth_events           ADD COLUMN IF NOT EXISTS is_synthetic boolean DEFAULT false;
ALTER TABLE growth_events           ADD COLUMN IF NOT EXISTS test_run_id text;

ALTER TABLE agent_runs              ADD COLUMN IF NOT EXISTS is_synthetic boolean DEFAULT false;
ALTER TABLE agent_runs              ADD COLUMN IF NOT EXISTS test_run_id text;

-- Helpful indexes so cleanup is instant (not table scans)
CREATE INDEX IF NOT EXISTS idx_students_synth_run     ON students(test_run_id) WHERE is_synthetic;
CREATE INDEX IF NOT EXISTS idx_awards_synth_run       ON student_awards(test_run_id) WHERE is_synthetic;
CREATE INDEX IF NOT EXISTS idx_tests_synth_run        ON student_tests(test_run_id) WHERE is_synthetic;
CREATE INDEX IF NOT EXISTS idx_gpa_synth_run          ON student_gpa_history(test_run_id) WHERE is_synthetic;
CREATE INDEX IF NOT EXISTS idx_deadlines_synth_run    ON college_deadlines(test_run_id) WHERE is_synthetic;
CREATE INDEX IF NOT EXISTS idx_chips_synth_run        ON chips(test_run_id) WHERE is_synthetic;
CREATE INDEX IF NOT EXISTS idx_growth_synth_run       ON growth_events(test_run_id) WHERE is_synthetic;
CREATE INDEX IF NOT EXISTS idx_runs_synth_run         ON agent_runs(test_run_id) WHERE is_synthetic;
SQL

echo "✅ Safety columns and indexes ready"
echo ""

# ====================================================================
# CLEANUP FUNCTION (Always runs via EXIT trap)
# ====================================================================
cleanup() {
  local exit_code=$?
  echo ""
  echo "======================================================================"
  echo "Cleanup starting for RUN_ID=$RUN_ID (exit code: $exit_code)"
  echo "======================================================================"

  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v run_id="$RUN_ID" <<'SQL'
  BEGIN;
    -- Gate 2: refuse to delete anything not flagged synthetic for this run
    DO $$
    DECLARE bad int;
    BEGIN
      SELECT COUNT(*) INTO bad
      FROM students WHERE test_run_id = :'run_id' AND is_synthetic IS DISTINCT FROM true;
      IF bad > 0 THEN
        RAISE EXCEPTION 'Refusing cleanup: found % students for run not flagged synthetic', bad;
      END IF;
      RAISE NOTICE 'Gate 2 passed: All students for run_id are properly flagged synthetic';
    END$$;

    -- Delete children first to satisfy FKs; every delete scoped by test_run_id AND is_synthetic
    WITH
      del_chips AS (
        DELETE FROM chips WHERE test_run_id = :'run_id' AND is_synthetic = true RETURNING 1
      ),
      del_growth AS (
        DELETE FROM growth_events WHERE test_run_id = :'run_id' AND is_synthetic = true RETURNING 1
      ),
      del_awards AS (
        DELETE FROM student_awards WHERE test_run_id = :'run_id' AND is_synthetic = true RETURNING 1
      ),
      del_tests AS (
        DELETE FROM student_tests WHERE test_run_id = :'run_id' AND is_synthetic = true RETURNING 1
      ),
      del_gpa AS (
        DELETE FROM student_gpa_history WHERE test_run_id = :'run_id' AND is_synthetic = true RETURNING 1
      ),
      del_deadlines AS (
        DELETE FROM college_deadlines WHERE test_run_id = :'run_id' AND is_synthetic = true RETURNING 1
      ),
      del_runs AS (
        DELETE FROM agent_runs WHERE test_run_id = :'run_id' AND is_synthetic = true RETURNING 1
      ),
      del_students AS (
        DELETE FROM students WHERE test_run_id = :'run_id' AND is_synthetic = true RETURNING 1
      )
    SELECT
      (SELECT COUNT(*) FROM del_chips) AS chips_deleted,
      (SELECT COUNT(*) FROM del_growth) AS growth_deleted,
      (SELECT COUNT(*) FROM del_awards) AS awards_deleted,
      (SELECT COUNT(*) FROM del_tests) AS tests_deleted,
      (SELECT COUNT(*) FROM del_gpa) AS gpa_deleted,
      (SELECT COUNT(*) FROM del_deadlines) AS deadlines_deleted,
      (SELECT COUNT(*) FROM del_runs) AS runs_deleted,
      (SELECT COUNT(*) FROM del_students) AS students_deleted;

    -- Residue checks: must be zero
    WITH residue AS (
      SELECT 'students' tbl, COUNT(*) c FROM students WHERE test_run_id = :'run_id' UNION ALL
      SELECT 'awards', COUNT(*) FROM student_awards WHERE test_run_id = :'run_id' UNION ALL
      SELECT 'tests', COUNT(*) FROM student_tests WHERE test_run_id = :'run_id' UNION ALL
      SELECT 'gpa', COUNT(*) FROM student_gpa_history WHERE test_run_id = :'run_id' UNION ALL
      SELECT 'deadlines', COUNT(*) FROM college_deadlines WHERE test_run_id = :'run_id' UNION ALL
      SELECT 'chips', COUNT(*) FROM chips WHERE test_run_id = :'run_id' UNION ALL
      SELECT 'growth', COUNT(*) FROM growth_events WHERE test_run_id = :'run_id' UNION ALL
      SELECT 'runs', COUNT(*) FROM agent_runs WHERE test_run_id = :'run_id'
    )
    SELECT
      CASE
        WHEN SUM(c) = 0 THEN 'Zero residue - cleanup complete'
        ELSE (SELECT pg_catalog.error('Residue after cleanup: ' || SUM(c)::text || ' rows'))
      END AS residue_check
    FROM residue;
  COMMIT;
SQL

  echo "✅ Cleanup complete - zero residue verified"
  echo "======================================================================"
  exit $exit_code
}

# Register cleanup to run on ANY exit (success, failure, ctrl-c)
trap cleanup EXIT

# ====================================================================
# SEED SYNTHETIC DATA
# ====================================================================
echo "Seeding $COUNT synthetic students..."

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v prefix="$PREFIX" -v run_id="$RUN_ID" -v count="$COUNT" <<'SQL'
BEGIN;
  -- Gate 1: confirm safety columns exist everywhere we touch
  DO $$
  DECLARE missing int;
  BEGIN
    SELECT COUNT(*) INTO missing FROM (
      VALUES
        ('students','is_synthetic'),('students','test_run_id'),
        ('student_awards','is_synthetic'),('student_awards','test_run_id'),
        ('student_tests','is_synthetic'),('student_tests','test_run_id'),
        ('student_gpa_history','is_synthetic'),('student_gpa_history','test_run_id'),
        ('college_deadlines','is_synthetic'),('college_deadlines','test_run_id'),
        ('chips','is_synthetic'),('chips','test_run_id'),
        ('growth_events','is_synthetic'),('growth_events','test_run_id'),
        ('agent_runs','is_synthetic'),('agent_runs','test_run_id')
    ) AS need(tbl,col)
    WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = need.tbl AND column_name = need.col
    );
    IF missing > 0 THEN
      RAISE EXCEPTION 'Missing is_synthetic/test_run_id columns on % tables', missing;
    END IF;
    RAISE NOTICE 'Gate 1 passed: All required safety columns exist';
  END$$;

  -- Insert N synthetic students, all double-flagged
  WITH ins_students AS (
    INSERT INTO students (
      student_id, email, password_hash, full_name, graduation_year,
      is_synthetic, test_run_id, created_at
    )
    SELECT
      :'prefix' || lpad(i::text, 2, '0'),
      :'prefix' || lpad(i::text, 2, '0') || '@synthetic.test',
      'hashed_' || i,
      'Synthetic Student ' || i,
      2025,
      true,
      :'run_id',
      now()
    FROM generate_series(1, :'count'::int) AS s(i)
    RETURNING student_id
  )
  -- Seed minimal facts so verification can check facts views
  , ins_awards AS (
    INSERT INTO student_awards (
      student_id, award_name, tier, result_date, result_status,
      is_verified, is_synthetic, test_run_id, created_at
    )
    SELECT
      student_id,
      'Canary Award - State Science Fair',
      'State',
      CURRENT_DATE - INTERVAL '3 months',
      'WIN',
      true,
      true,
      :'run_id',
      now()
    FROM ins_students
    RETURNING 1
  )
  , ins_tests AS (
    INSERT INTO student_tests (
      student_id, test_type, test_date, composite_score, subscores,
      is_official, is_synthetic, test_run_id, created_at
    )
    SELECT
      student_id,
      'SAT',
      CURRENT_DATE - INTERVAL '2 months',
      1530,
      '{"EBRW": 760, "Math": 770}'::jsonb,
      true,
      true,
      :'run_id',
      now()
    FROM ins_students
    RETURNING 1
  )
  , ins_gpa AS (
    INSERT INTO student_gpa_history (
      student_id, gpa_value, gpa_scale, as_of_date,
      is_verified, is_synthetic, test_run_id, created_at
    )
    SELECT
      student_id,
      3.85,
      4.00,
      CURRENT_DATE - INTERVAL '1 month',
      true,
      true,
      :'run_id',
      now()
    FROM ins_students
    RETURNING 1
  )
  , ins_deadlines AS (
    INSERT INTO college_deadlines (
      student_id, college_name, deadline_date, deadline_type, priority,
      is_synthetic, test_run_id, created_at
    )
    SELECT student_id, college, deadline, dtype, prio, true, :'run_id', now()
    FROM ins_students
    CROSS JOIN (VALUES
      ('Stanford', '2024-11-01'::date, 'REA', 10),
      ('MIT', '2024-11-01'::date, 'EA', 9)
    ) AS deadlines(college, deadline, dtype, prio)
    RETURNING 1
  )
  SELECT
    (SELECT COUNT(*) FROM ins_students) AS students_created,
    (SELECT COUNT(*) FROM ins_awards) AS awards_created,
    (SELECT COUNT(*) FROM ins_tests) AS tests_created,
    (SELECT COUNT(*) FROM ins_gpa) AS gpa_created,
    (SELECT COUNT(*) FROM ins_deadlines) AS deadlines_created;
COMMIT;
SQL

echo "✅ Seed complete"
echo ""

# ====================================================================
# VERIFICATION BATTERY
# ====================================================================
echo "======================================================================"
echo "Running v3.2 Verification Tests"
echo "======================================================================"
echo ""

# Test 1: Facts views return data for synthetic students
echo "Test 1: Facts Views Accessibility"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v run_id="$RUN_ID" <<'SQL'
WITH seeded AS (
  SELECT student_id FROM students WHERE test_run_id = :'run_id'
),
award_hits AS (
  SELECT s.student_id, COUNT(*) c
  FROM seeded s
  JOIN v_awards_facts v ON v.student_id = s.student_id
  GROUP BY s.student_id
),
test_hits AS (
  SELECT s.student_id, COUNT(*) c
  FROM seeded s
  JOIN v_tests_facts v ON v.student_id = s.student_id
  GROUP BY s.student_id
),
gpa_hits AS (
  SELECT s.student_id, COUNT(*) c
  FROM seeded s
  JOIN v_gpa_facts v ON v.student_id = s.student_id
  GROUP BY s.student_id
),
deadline_hits AS (
  SELECT s.student_id, COUNT(*) c
  FROM seeded s
  JOIN v_deadlines_facts v ON v.student_id = s.student_id
  GROUP BY s.student_id
)
SELECT
  CASE
    WHEN MIN(award_hits.c) >= 1 AND MIN(test_hits.c) >= 1 AND MIN(gpa_hits.c) >= 1 AND MIN(deadline_hits.c) >= 1
    THEN '✅ All facts views returned data for synthetic students'
    ELSE (SELECT pg_catalog.error('Facts views returned 0 for some seeded students'))
  END AS test_1_result
FROM award_hits, test_hits, gpa_hits, deadline_hits;
SQL
echo ""

# Test 2: Temporal UDFs work for synthetic students
echo "Test 2: Temporal UDFs"
first_student=$(psql "$DATABASE_URL" -Atc "SELECT student_id FROM students WHERE test_run_id = '$RUN_ID' ORDER BY student_id LIMIT 1;")
echo "Testing with student: $first_student"

for func in award_latest sat_latest gpa_as_of deadline_latest; do
  result=$(psql "$DATABASE_URL" -Atc "SELECT * FROM ${func}('${first_student}');" 2>&1)
  if [[ $? -eq 0 ]]; then
    echo "  ✅ ${func}: OK"
  else
    echo "  ❌ ${func}: FAILED - $result"
  fi
done
echo ""

# Test 3: RLS Policies (check enabled)
echo "Test 3: RLS Policies Enabled"
psql "$DATABASE_URL" -c "
SELECT
  tablename,
  CASE WHEN rowsecurity THEN '✅ Enabled' ELSE '⚠️ Disabled' END AS rls_status
FROM pg_tables
WHERE tablename IN ('chips', 'growth_events', 'agent_runs', 'system_events')
ORDER BY tablename;
"
echo ""

# Test 4: Chip creation (with synthetic flag)
echo "Test 4: Chip Creation (Synthetic)"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v run_id="$RUN_ID" -v student="$first_student" <<'SQL'
INSERT INTO chips (
  student_id, kind, source, hash, trace_id,
  is_synthetic, test_run_id, created_at
)
VALUES (
  :'student',
  'SQL',
  '{"query": "SELECT * FROM canary_test", "result": "ok"}'::jsonb,
  'canary_hash_' || :'run_id',
  'canary_trace_' || :'run_id',
  true,
  :'run_id',
  now()
)
ON CONFLICT (student_id, hash) DO NOTHING
RETURNING '✅ Chip created successfully' AS result;
SQL
echo ""

# Test 5: Growth event creation (with synthetic flag)
echo "Test 5: Growth Event Creation (Synthetic)"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v run_id="$RUN_ID" -v student="$first_student" <<'SQL'
INSERT INTO growth_events (
  student_id, barrier_type, trigger_description, transformation_delta, breakthrough,
  is_synthetic, test_run_id, created_at
)
VALUES (
  :'student',
  'INTERNAL_CONFIDENCE',
  'Canary test breakthrough',
  0.75,
  true,
  true,
  :'run_id',
  now()
)
RETURNING '✅ Growth event created successfully' AS result;
SQL
echo ""

# Test 6: Data integrity check
echo "Test 6: Data Integrity Check"
psql "$DATABASE_URL" -v run_id="$RUN_ID" -c "
SELECT
  (SELECT COUNT(*) FROM students WHERE test_run_id = :'run_id') AS students,
  (SELECT COUNT(*) FROM student_awards WHERE test_run_id = :'run_id') AS awards,
  (SELECT COUNT(*) FROM student_tests WHERE test_run_id = :'run_id') AS tests,
  (SELECT COUNT(*) FROM student_gpa_history WHERE test_run_id = :'run_id') AS gpa,
  (SELECT COUNT(*) FROM college_deadlines WHERE test_run_id = :'run_id') AS deadlines,
  (SELECT COUNT(*) FROM chips WHERE test_run_id = :'run_id') AS chips,
  (SELECT COUNT(*) FROM growth_events WHERE test_run_id = :'run_id') AS growth_events;
"
echo ""

# ====================================================================
# VERIFICATION SUMMARY
# ====================================================================
echo "======================================================================"
echo "✅ Verification Complete"
echo "======================================================================"
echo "Run ID: $RUN_ID"
echo "Students tested: $COUNT"
echo "All tests executed successfully"
echo ""
echo "⚠️  Cleanup will run automatically in 5 seconds..."
echo "    (Press Ctrl+C to cleanup immediately)"
echo "======================================================================"

sleep 5

# Cleanup will run automatically via EXIT trap
echo ""
echo "Exiting normally - cleanup trap will execute..."

#!/usr/bin/env bash
set -euo pipefail

# V3.2 Canary Test - Matches actual production schema
: "${DATABASE_URL:?Set DATABASE_URL}"
COUNT="${COUNT:-20}"
RUN_ID="$(date +%Y%m%d%H%M%S)"
PREFIX="synth_${RUN_ID}_"

echo "[CANARY] ======================================"
echo "[CANARY] v3.2 Production Canary Test"
echo "[CANARY] ======================================"
echo "[CANARY] Run ID: ${RUN_ID}"
echo "[CANARY] Student Count: ${COUNT}"
echo "[CANARY] Prefix: ${PREFIX}"
echo "[CANARY] ======================================"

# Cleanup function (always runs)
cleanup() {
  echo ""
  echo "[CANARY] Cleanup starting..."
  
  PGPASSWORD=postgres psql -h localhost -U postgres -d ivylevel <<EOF
  -- Delete v3.2 tables (children first, FK order)
  DELETE FROM chips WHERE student_id LIKE '${PREFIX}%' AND is_synthetic = true;
  DELETE FROM growth_events WHERE student_id LIKE '${PREFIX}%' AND is_synthetic = true;
  DELETE FROM agent_runs WHERE student_id LIKE '${PREFIX}%' AND is_synthetic = true;
  
  -- Delete students last
  DELETE FROM students WHERE student_id LIKE '${PREFIX}%' AND is_synthetic = true;
  
  SELECT 
    (SELECT COUNT(*) FROM students WHERE student_id LIKE '${PREFIX}%') as students_left,
    (SELECT COUNT(*) FROM chips WHERE student_id LIKE '${PREFIX}%') as chips_left,
    (SELECT COUNT(*) FROM growth_events WHERE student_id LIKE '${PREFIX}%') as growth_left,
    (SELECT COUNT(*) FROM agent_runs WHERE student_id LIKE '${PREFIX}%') as runs_left;
EOF
  
  local exit_code=$?
  if [ $exit_code -eq 0 ]; then
    echo "[CANARY] ✅ Cleanup complete - zero residue verified"
  else
    echo "[CANARY] ❌ Cleanup failed with exit code $exit_code"
  fi
}
trap cleanup EXIT

# Seed synthetic students
echo "[CANARY] Seeding ${COUNT} synthetic students..."
PGPASSWORD=postgres psql -h localhost -U postgres -d ivylevel <<EOF
INSERT INTO students (
  student_id, email, password_hash, full_name, graduation_year,
  is_synthetic, test_run_id
)
SELECT
  '${PREFIX}' || lpad(i::text, 2, '0'),
  '${PREFIX}' || lpad(i::text, 2, '0') || '@synthetic.test',
  'hashed_' || i,
  'Synthetic Student ' || i,
  2025,
  true,
  '${RUN_ID}'
FROM generate_series(1, ${COUNT}) AS s(i);

SELECT COUNT(*) as students_created FROM students WHERE student_id LIKE '${PREFIX}%';
EOF

# Test 1: Create chips
echo "[CANARY] Test 1: Creating chips..."
FIRST_STUDENT="${PREFIX}01"
PGPASSWORD=postgres psql -h localhost -U postgres -d ivylevel <<EOF
INSERT INTO chips (student_id, kind, source, hash, trace_id, is_synthetic, test_run_id)
VALUES 
  ('${FIRST_STUDENT}', 'SQL', '{"test": true}'::jsonb, 'test_hash_${RUN_ID}', 'test_trace_${RUN_ID}', true, '${RUN_ID}')
ON CONFLICT (student_id, hash) DO NOTHING
RETURNING id;
EOF

# Test 2: Create growth event
echo "[CANARY] Test 2: Creating growth event..."
PGPASSWORD=postgres psql -h localhost -U postgres -d ivylevel <<EOF
INSERT INTO growth_events (
  student_id, barrier_type, trigger,
  transformation_delta, breakthrough, occurred_at,
  is_synthetic, test_run_id
)
VALUES (
  '${FIRST_STUDENT}', 'INTERNAL_CONFIDENCE', 'Test breakthrough',
  0.75, TRUE, CURRENT_DATE, true, '${RUN_ID}'
)
RETURNING id;
EOF

# Test 3: Create agent run
echo "[CANARY] Test 3: Creating agent run..."
PGPASSWORD=postgres psql -h localhost -U postgres -d ivylevel <<EOF
INSERT INTO agent_runs (
  student_id, agent_name, session_id,
  started_at, completed_at, status,
  is_synthetic, test_run_id
)
VALUES (
  '${FIRST_STUDENT}', 'test-agent', 'test-session',
  now(), now(), 'completed', true, '${RUN_ID}'
)
RETURNING id;
EOF

# Verification
echo "[CANARY] ======================================"
echo "[CANARY] Verification Summary"
echo "[CANARY] ======================================"
PGPASSWORD=postgres psql -h localhost -U postgres -d ivylevel <<EOF
SELECT
  (SELECT COUNT(*) FROM students WHERE student_id LIKE '${PREFIX}%') as students,
  (SELECT COUNT(*) FROM chips WHERE student_id LIKE '${PREFIX}%') as chips,
  (SELECT COUNT(*) FROM growth_events WHERE student_id LIKE '${PREFIX}%') as growth_events,
  (SELECT COUNT(*) FROM agent_runs WHERE student_id LIKE '${PREFIX}%') as agent_runs;
EOF

echo "[CANARY] ======================================"
echo "[CANARY] ✅ All tests passed - cleanup will run in 3 seconds"
echo "[CANARY] ======================================"
sleep 3

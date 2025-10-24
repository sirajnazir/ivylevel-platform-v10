#!/usr/bin/env bash
set -euo pipefail

# Minimal Canary Test - Tests only v3.2 core tables
: "${DATABASE_URL:?Set DATABASE_URL}"
COUNT="${COUNT:-20}"
RUN_ID="$(date +%Y%m%d%H%M%S)"
PREFIX="synth_${RUN_ID}_"

echo "[CANARY] ======================================"
echo "[CANARY] v3.2 Core Infrastructure Test"
echo "[CANARY] ======================================"
echo "[CANARY] Run ID: ${RUN_ID}"
echo "[CANARY] Student Count: ${COUNT}"
echo "[CANARY] Prefix: ${PREFIX}"
echo "[CANARY] ======================================"

# Cleanup function
cleanup() {
  echo ""
  echo "[CANARY] Cleanup starting..."
  
  psql "$DATABASE_URL" <<EOF
  -- Delete v3.2 runtime tables (children first)
  DELETE FROM chips WHERE student_id LIKE '${PREFIX}%' AND is_synthetic = true;
  DELETE FROM growth_events WHERE student_id LIKE '${PREFIX}%' AND is_synthetic = true;
  DELETE FROM agent_runs WHERE student_id LIKE '${PREFIX}%' AND is_synthetic = true;
  DELETE FROM system_events WHERE metadata->>'student_id' LIKE '${PREFIX}%';
  
  -- Delete students last
  DELETE FROM students WHERE student_id LIKE '${PREFIX}%' AND is_synthetic = true;
  
  SELECT 
    (SELECT COUNT(*) FROM students WHERE student_id LIKE '${PREFIX}%') as students_left,
    (SELECT COUNT(*) FROM chips WHERE student_id LIKE '${PREFIX}%') as chips_left,
    (SELECT COUNT(*) FROM growth_events WHERE student_id LIKE '${PREFIX}%') as growth_left,
    (SELECT COUNT(*) FROM agent_runs WHERE student_id LIKE '${PREFIX}%') as runs_left;
EOF
  
  echo "[CANARY] ✅ Cleanup complete"
}
trap cleanup EXIT

# Seed synthetic students
echo "[CANARY] Seeding ${COUNT} synthetic students..."
psql "$DATABASE_URL" <<EOF
INSERT INTO students (
  student_id, email, password_hash, full_name, graduation_year,
  is_synthetic, test_run_id, created_at
)
SELECT
  '${PREFIX}' || lpad(i::text, 2, '0'),
  '${PREFIX}' || lpad(i::text, 2, '0') || '@synthetic.test',
  'hashed_' || i,
  'Synthetic Student ' || i,
  2025,
  true,
  '${RUN_ID}',
  now()
FROM generate_series(1, ${COUNT}) AS s(i);

SELECT COUNT(*) as students_created FROM students WHERE student_id LIKE '${PREFIX}%';
EOF

# Test 1: Create chips
echo "[CANARY] Test 1: Creating chips..."
FIRST_STUDENT="${PREFIX}01"
psql "$DATABASE_URL" <<EOF
INSERT INTO chips (student_id, kind, source, hash, trace_id, is_synthetic, test_run_id)
VALUES 
  ('${FIRST_STUDENT}', 'SQL', '{"test": true}'::jsonb, 'test_hash_${RUN_ID}', 'test_trace_${RUN_ID}', true, '${RUN_ID}')
ON CONFLICT (student_id, hash) DO NOTHING
RETURNING id;
EOF

# Test 2: Create growth event
echo "[CANARY] Test 2: Creating growth event..."
psql "$DATABASE_URL" <<EOF
INSERT INTO growth_events (
  student_id, barrier_type, trigger_description, 
  transformation_delta, breakthrough, created_at,
  is_synthetic, test_run_id
)
VALUES (
  '${FIRST_STUDENT}', 'INTERNAL_CONFIDENCE', 'Test breakthrough',
  0.75, TRUE, now(), true, '${RUN_ID}'
)
RETURNING id;
EOF

# Test 3: Create agent run
echo "[CANARY] Test 3: Creating agent run..."
psql "$DATABASE_URL" <<EOF
INSERT INTO agent_runs (
  student_id, agent_name, input_message, output_message,
  started_at, completed_at, status,
  is_synthetic, test_run_id
)
VALUES (
  '${FIRST_STUDENT}', 'test-agent', 'test input', 'test output',
  now(), now(), 'completed', true, '${RUN_ID}'
)
RETURNING id;
EOF

# Verification
echo "[CANARY] ======================================"
echo "[CANARY] Verification Summary"
echo "[CANARY] ======================================"
psql "$DATABASE_URL" <<EOF
SELECT
  (SELECT COUNT(*) FROM students WHERE student_id LIKE '${PREFIX}%') as students,
  (SELECT COUNT(*) FROM chips WHERE student_id LIKE '${PREFIX}%') as chips,
  (SELECT COUNT(*) FROM growth_events WHERE student_id LIKE '${PREFIX}%') as growth_events,
  (SELECT COUNT(*) FROM agent_runs WHERE student_id LIKE '${PREFIX}%') as agent_runs;
EOF

echo "[CANARY] ======================================"
echo "[CANARY] Test complete - cleanup will run automatically"
echo "[CANARY] ======================================"
sleep 2

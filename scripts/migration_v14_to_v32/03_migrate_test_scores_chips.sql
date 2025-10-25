-- Migration Script: Test Scores → SQL Chips
-- Source: fact_observations (v14) where kind IN ('sat_total_score', 'act_composite', 'ap_score')
-- Target: chips (v3.2)
-- Expected: 3 chips (SAT, ACT, AP)

-- Clear any existing test score chips for this migration (idempotent)
DELETE FROM chips
WHERE student_id = 'huda-2025'
AND kind = 'SQL'
AND source->>'source_table' = 'fact_observations'
AND source->>'fact_category' = 'test_scores'
AND trace_id LIKE 'migration_v14_to_v32_tests%';

-- Insert SAT chip
INSERT INTO chips (id, student_id, kind, source, hash, trace_id, created_at)
SELECT
  gen_random_uuid(),
  'huda-2025',
  'SQL',
  jsonb_build_object(
    'query', 'SELECT * FROM fact_observations WHERE student_id = ''huda-2025'' AND kind = ''sat_total_score''',
    'result', jsonb_agg(
      jsonb_build_object(
        'event_date', event_date,
        'kind', kind,
        'value_numeric', value_numeric,
        'value_text', value_text,
        'meta', meta
      ) ORDER BY event_date
    ),
    'metadata', jsonb_build_object(
      'source_table', 'fact_observations',
      'fact_category', 'test_scores',
      'test_type', 'SAT',
      'migration_source', 'v14_to_v32',
      'migration_date', NOW(),
      'record_count', COUNT(*)
    )
  ),
  md5('huda_sat_v14_migration'),
  'migration_v14_to_v32_tests_sat',
  NOW()
FROM fact_observations
WHERE student_id = 'huda-2025'
AND kind = 'sat_total_score'
GROUP BY student_id;

-- Insert ACT chip
INSERT INTO chips (id, student_id, kind, source, hash, trace_id, created_at)
SELECT
  gen_random_uuid(),
  'huda-2025',
  'SQL',
  jsonb_build_object(
    'query', 'SELECT * FROM fact_observations WHERE student_id = ''huda-2025'' AND kind = ''act_composite''',
    'result', jsonb_agg(
      jsonb_build_object(
        'event_date', event_date,
        'kind', kind,
        'value_numeric', value_numeric,
        'value_text', value_text,
        'meta', meta
      ) ORDER BY event_date
    ),
    'metadata', jsonb_build_object(
      'source_table', 'fact_observations',
      'fact_category', 'test_scores',
      'test_type', 'ACT',
      'migration_source', 'v14_to_v32',
      'migration_date', NOW(),
      'record_count', COUNT(*)
    )
  ),
  md5('huda_act_v14_migration'),
  'migration_v14_to_v32_tests_act',
  NOW()
FROM fact_observations
WHERE student_id = 'huda-2025'
AND kind = 'act_composite'
GROUP BY student_id;

-- Insert AP chip
INSERT INTO chips (id, student_id, kind, source, hash, trace_id, created_at)
SELECT
  gen_random_uuid(),
  'huda-2025',
  'SQL',
  jsonb_build_object(
    'query', 'SELECT * FROM fact_observations WHERE student_id = ''huda-2025'' AND kind = ''ap_score''',
    'result', jsonb_agg(
      jsonb_build_object(
        'event_date', event_date,
        'kind', kind,
        'value_numeric', value_numeric,
        'value_text', value_text,
        'meta', meta
      ) ORDER BY event_date
    ),
    'metadata', jsonb_build_object(
      'source_table', 'fact_observations',
      'fact_category', 'test_scores',
      'test_type', 'AP',
      'migration_source', 'v14_to_v32',
      'migration_date', NOW(),
      'record_count', COUNT(*)
    )
  ),
  md5('huda_ap_v14_migration'),
  'migration_v14_to_v32_tests_ap',
  NOW()
FROM fact_observations
WHERE student_id = 'huda-2025'
AND kind = 'ap_score'
GROUP BY student_id;

-- Verification
SELECT
  'Test Score Chips' as migration_step,
  source->>'metadata'->>'test_type' as test_type,
  COUNT(*) as chips_created,
  jsonb_array_length(source->'result') as score_records
FROM chips
WHERE student_id = 'huda-2025'
AND kind = 'SQL'
AND source->>'fact_category' = 'test_scores'
GROUP BY source->>'metadata'->>'test_type';

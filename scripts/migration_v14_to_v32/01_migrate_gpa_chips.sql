-- Migration Script: GPA Data → SQL Chips
-- Source: academic_gpa (v14)
-- Target: chips (v3.2)
-- Expected: 1 chip with all GPA records

-- Clear any existing GPA chips for this migration (idempotent)
DELETE FROM chips
WHERE student_id = 'huda-2025'
AND kind = 'SQL'
AND source->>'source_table' = 'academic_gpa'
AND trace_id LIKE 'migration_v14_to_v32_gpa%';

-- Insert GPA chip
INSERT INTO chips (id, student_id, kind, source, hash, trace_id, created_at)
SELECT
  gen_random_uuid(),
  'huda-2025',
  'SQL',
  jsonb_build_object(
    'query', 'SELECT * FROM academic_gpa WHERE student_id = ''huda-2025'' ORDER BY scope, scope_key',
    'result', jsonb_agg(
      jsonb_build_object(
        'scope', scope,
        'scope_key', scope_key,
        'gpa_unweighted', gpa_unweighted,
        'gpa_weighted', gpa_weighted,
        'credits_attempted', credits_attempted,
        'credits_earned', credits_earned,
        'recorded_at', recorded_at
      ) ORDER BY scope, scope_key
    ),
    'metadata', jsonb_build_object(
      'source_table', 'academic_gpa',
      'migration_source', 'v14_to_v32',
      'migration_date', NOW(),
      'record_count', COUNT(*)
    )
  ),
  md5('huda_gpa_v14_migration'),
  'migration_v14_to_v32_gpa',
  NOW()
FROM academic_gpa
WHERE student_id = 'huda-2025'
GROUP BY student_id;

-- Verification
SELECT
  'GPA Chips' as migration_step,
  COUNT(*) as chips_created,
  jsonb_array_length(source->'result') as gpa_records
FROM chips
WHERE student_id = 'huda-2025'
AND kind = 'SQL'
AND source->>'source_table' = 'academic_gpa';

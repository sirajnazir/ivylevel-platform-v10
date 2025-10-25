-- Migration Script: College List → RAG Chips
-- Source: college_list (v14)
-- Target: chips (v3.2)
-- Expected: 1-2 chips (all colleges, or split by category)

-- Clear any existing college chips for this migration (idempotent)
DELETE FROM chips
WHERE student_id = 'huda-2025'
AND kind = 'RAG'
AND source->>'source_table' = 'college_list'
AND trace_id LIKE 'migration_v14_to_v32_colleges%';

-- Insert College List chip
INSERT INTO chips (id, student_id, kind, source, hash, trace_id, created_at)
SELECT
  gen_random_uuid(),
  'huda-2025',
  'RAG',
  jsonb_build_object(
    'rag_query', 'What colleges is Huda considering?',
    'retrieved_documents', jsonb_agg(
      jsonb_build_object(
        'college_name', college_name,
        'bucket_category', bucket_category,
        'decision_plan', decision_plan,
        'decision_result', decision_result,
        'program', program,
        'location', location,
        'created_ts', created_ts
      ) ORDER BY bucket_category, college_name
    ),
    'metadata', jsonb_build_object(
      'source_table', 'college_list',
      'migration_source', 'v14_to_v32',
      'migration_date', NOW(),
      'total_colleges', COUNT(*)
    )
  ),
  md5('huda_colleges_v14_migration'),
  'migration_v14_to_v32_colleges',
  NOW()
FROM college_list
WHERE student_id = 'huda-2025'
GROUP BY student_id;

-- Verification
SELECT
  'College Chips' as migration_step,
  COUNT(*) as chips_created,
  jsonb_array_length(source->'retrieved_documents') as college_count,
  source->'metadata'->>'total_colleges' as total_colleges
FROM chips
WHERE student_id = 'huda-2025'
AND kind = 'RAG'
AND source->>'source_table' = 'college_list';

-- Migration Script: Awards → RAG Chips
-- Source: fact_observations (v14) where kind = 'award_won'
-- Target: chips (v3.2)
-- Expected: 1 chip with 2 awards

-- Clear any existing awards chips for this migration (idempotent)
DELETE FROM chips
WHERE student_id = 'huda-2025'
AND kind = 'RAG'
AND source->>'source_table' = 'fact_observations'
AND source->>'fact_category' = 'awards'
AND trace_id LIKE 'migration_v14_to_v32_awards%';

-- Insert Awards chip
INSERT INTO chips (id, student_id, kind, source, hash, trace_id, created_at)
SELECT
  gen_random_uuid(),
  'huda-2025',
  'RAG',
  jsonb_build_object(
    'rag_query', 'What awards has Huda won?',
    'retrieved_documents', jsonb_agg(
      jsonb_build_object(
        'event_date', event_date,
        'kind', kind,
        'value_text', value_text,
        'meta', meta
      ) ORDER BY event_date
    ),
    'metadata', jsonb_build_object(
      'source_table', 'fact_observations',
      'fact_category', 'awards',
      'migration_source', 'v14_to_v32',
      'migration_date', NOW(),
      'award_count', COUNT(*)
    )
  ),
  md5('huda_awards_v14_migration'),
  'migration_v14_to_v32_awards',
  NOW()
FROM fact_observations
WHERE student_id = 'huda-2025'
AND kind = 'award_won'
GROUP BY student_id;

-- Verification
SELECT
  'Awards Chips' as migration_step,
  COUNT(*) as chips_created,
  jsonb_array_length(source->'retrieved_documents') as award_count
FROM chips
WHERE student_id = 'huda-2025'
AND kind = 'RAG'
AND source->>'fact_category' = 'awards';

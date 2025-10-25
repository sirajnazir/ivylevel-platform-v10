-- Migration Script: Canon Documents → NARRATIVE Chips
-- Source: canon (v14)
-- Target: chips (v3.2)
-- Expected: 1 NARRATIVE chip (metadata-based)
-- Note: Canon table has metadata only (drive_link), not full content

-- Clear any existing canon-based NARRATIVE chips for this migration (idempotent)
DELETE FROM chips
WHERE student_id = 'huda-2025'
AND kind = 'NARRATIVE'
AND source->>'source_table' = 'canon'
AND trace_id LIKE 'migration_v14_to_v32_canon%';

-- Insert NARRATIVE chip (metadata from canon documents)
INSERT INTO chips (id, student_id, kind, source, hash, trace_id, created_at)
SELECT
  gen_random_uuid(),
  'huda-2025',
  'NARRATIVE',
  jsonb_build_object(
    'narrative_type', 'canon_metadata',
    'canon_documents', jsonb_agg(
      jsonb_build_object(
        'key', key,
        'source_type', source_type,
        'source_title', source_title,
        'section', section,
        'drive_link', drive_link,
        'date_range', date_range,
        'updated_at', updated_at
      ) ORDER BY updated_at
    ),
    'metadata', jsonb_build_object(
      'source_table', 'canon',
      'migration_source', 'v14_to_v32',
      'migration_date', NOW(),
      'document_count', COUNT(*)
    )
  ),
  md5('huda_canon_v14_migration'),
  'migration_v14_to_v32_canon',
  NOW()
FROM canon
WHERE student_id = 'huda-2025'
GROUP BY student_id;

-- Verification
SELECT
  'NARRATIVE Chips' as migration_step,
  COUNT(*) as chips_created,
  (source->'canon_documents')::jsonb as document_count
FROM chips
WHERE student_id = 'huda-2025'
AND kind = 'NARRATIVE'
AND source->>'source_table' = 'canon';

-- Cleanup Script: Fix Test Score SQL Chips
-- Problem: ap_score and act_composite chips contain corrupted data
-- Solution: Delete bad chips and create clean ones with only valid data

-- Delete corrupted test score chips
DELETE FROM chips
WHERE student_id = 'huda-2025'
AND kind = 'SQL'
AND (
  source->>'metadata'->>'fact_category' = 'test_scores'
  OR source->'query' LIKE '%ap_score%'
  OR source->'query' LIKE '%act_composite%'
);

-- Create clean SAT chip (already good, recreate for consistency)
INSERT INTO chips (id, student_id, kind, source, hash, trace_id, created_at)
VALUES (
  gen_random_uuid(),
  'huda-2025',
  'SQL',
  jsonb_build_object(
    'query', 'SELECT * FROM fact_observations WHERE student_id = ''huda-2025'' AND kind = ''sat_total_score'' ORDER BY event_date',
    'result', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'kind', kind,
          'event_date', event_date,
          'value_text', value_text,
          'value_numeric', value_numeric,
          'meta', meta
        ) ORDER BY event_date
      )
      FROM fact_observations
      WHERE student_id = 'huda-2025'
      AND kind = 'sat_total_score'
      AND value_numeric IS NOT NULL  -- Only valid numeric SAT scores
      AND value_numeric BETWEEN 400 AND 1600  -- Valid SAT range
    ),
    'metadata', jsonb_build_object(
      'test_type', 'SAT',
      'source_table', 'fact_observations',
      'fact_category', 'test_scores',
      'record_count', (
        SELECT COUNT(*)
        FROM fact_observations
        WHERE student_id = 'huda-2025'
        AND kind = 'sat_total_score'
        AND value_numeric BETWEEN 400 AND 1600
      ),
      'migration_source', 'v14_to_v32_cleaned',
      'migration_date', NOW()
    )
  ),
  md5('huda_sat_scores_clean'),
  'migration_v14_to_v32_sat_cleaned',
  NOW()
)
ON CONFLICT (student_id, hash) DO NOTHING;

-- Create clean AP chip (only valid AP scores: 1-5 scale)
INSERT INTO chips (id, student_id, kind, source, hash, trace_id, created_at)
VALUES (
  gen_random_uuid(),
  'huda-2025',
  'SQL',
  jsonb_build_object(
    'query', 'SELECT * FROM fact_observations WHERE student_id = ''huda-2025'' AND kind = ''ap_score'' AND value_text IN (''1'',''2'',''3'',''4'',''5'') ORDER BY event_date',
    'result', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'kind', kind,
          'event_date', event_date,
          'value_text', value_text,
          'value_numeric', CAST(value_text AS INTEGER),
          'meta', meta,
          'note', 'Valid AP score (1-5 scale)'
        ) ORDER BY event_date
      )
      FROM fact_observations
      WHERE student_id = 'huda-2025'
      AND kind = 'ap_score'
      AND value_text IN ('1', '2', '3', '4', '5')  -- Only valid AP scores
    ),
    'metadata', jsonb_build_object(
      'test_type', 'AP',
      'source_table', 'fact_observations',
      'fact_category', 'test_scores',
      'record_count', (
        SELECT COUNT(*)
        FROM fact_observations
        WHERE student_id = 'huda-2025'
        AND kind = 'ap_score'
        AND value_text IN ('1', '2', '3', '4', '5')
      ),
      'note', 'Filtered to only valid AP scores (1-5). Excluded corrupted data.',
      'migration_source', 'v14_to_v32_cleaned',
      'migration_date', NOW()
    )
  ),
  md5('huda_ap_scores_clean'),
  'migration_v14_to_v32_ap_cleaned',
  NOW()
)
ON CONFLICT (student_id, hash) DO NOTHING;

-- NOTE: ACT chip NOT created because fact_observations contains no valid ACT data
-- Valid ACT composite scores are 1-36, but the data shows values like "proof_over_prose", "seeded", etc.

-- Verification
SELECT
  'Test Score Chips After Cleanup' as status,
  COUNT(*) as total_chips,
  COUNT(*) FILTER (WHERE source->'metadata'->>'test_type' = 'SAT') as sat_chips,
  COUNT(*) FILTER (WHERE source->'metadata'->>'test_type' = 'AP') as ap_chips,
  COUNT(*) FILTER (WHERE source->'metadata'->>'test_type' = 'ACT') as act_chips
FROM chips
WHERE student_id = 'huda-2025'
AND kind = 'SQL'
AND source->'metadata'->>'fact_category' = 'test_scores';

-- Show SAT data
SELECT
  'SAT Scores' as chip_type,
  jsonb_pretty(source->'result') as data
FROM chips
WHERE student_id = 'huda-2025'
AND kind = 'SQL'
AND source->'metadata'->>'test_type' = 'SAT'
LIMIT 1;

-- Show AP data
SELECT
  'AP Scores' as chip_type,
  jsonb_pretty(source->'result') as data
FROM chips
WHERE student_id = 'huda-2025'
AND kind = 'SQL'
AND source->'metadata'->>'test_type' = 'AP'
LIMIT 1;

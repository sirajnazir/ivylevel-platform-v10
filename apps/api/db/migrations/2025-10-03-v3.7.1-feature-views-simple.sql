-- v3.7.1 Universal Readiness: Feature Views (SIMPLIFIED - student-level aggregation)
-- Creates domain-specific feature extraction views that normalize raw data into standardized features

-- ========================================
-- 1. TESTING FEATURES
-- ========================================
CREATE OR REPLACE VIEW v_features_testing AS
SELECT DISTINCT ON (student_id)
  student_id,
  'sat_timeline_enum' AS chip_table,
  id::text AS chip_id,
  source_id,
  'testing' AS domain,
  'sat_composite' AS feature_key,
  numeric_value::NUMERIC AS feature_value,
  as_of::TIMESTAMP AS measured_at
FROM sat_timeline_enum
WHERE type = 'official'
  AND numeric_value IS NOT NULL
ORDER BY student_id, as_of DESC;

-- ========================================
-- 2. AWARDS FEATURES (using existing v_awards_won view)
-- ========================================
CREATE OR REPLACE VIEW v_features_awards AS
SELECT
  student_id,
  'v_awards_won' AS chip_table,
  student_id AS chip_id,
  'aggregate' AS source_id,
  'awards' AS domain,
  'national_awards_count' AS feature_key,
  COUNT(*) FILTER (WHERE tier = 'National')::NUMERIC AS feature_value,
  MAX(won_date::TIMESTAMP) AS measured_at
FROM v_awards_won
GROUP BY student_id

UNION ALL

SELECT
  student_id,
  'v_awards_won' AS chip_table,
  student_id AS chip_id,
  'aggregate' AS source_id,
  'awards' AS domain,
  'regional_awards_count' AS feature_key,
  COUNT(*) FILTER (WHERE tier = 'Regional')::NUMERIC AS feature_value,
  MAX(won_date::TIMESTAMP) AS measured_at
FROM v_awards_won
GROUP BY student_id

UNION ALL

SELECT
  student_id,
  'v_awards_won' AS chip_table,
  student_id AS chip_id,
  'aggregate' AS source_id,
  'awards' AS domain,
  'international_awards_count' AS feature_key,
  COUNT(*) FILTER (WHERE tier = 'International')::NUMERIC AS feature_value,
  MAX(won_date::TIMESTAMP) AS measured_at
FROM v_awards_won
GROUP BY student_id;

-- ========================================
-- 3. ECS FEATURES (using kb_items)
-- ========================================
CREATE OR REPLACE VIEW v_features_ecs AS
SELECT
  student_id,
  'kb_items' AS chip_table,
  student_id AS chip_id,
  'aggregate' AS source_id,
  'ecs' AS domain,
  'leadership_roles_count' AS feature_key,
  COUNT(*) FILTER (
    WHERE (
      title ILIKE '%president%'
      OR title ILIKE '%founder%'
      OR title ILIKE '%captain%'
      OR title ILIKE '%director%'
    )
  )::NUMERIC AS feature_value,
  MAX(updated_at) AS measured_at
FROM kb_items
WHERE item_type IN ('ec', 'activity')
GROUP BY student_id

UNION ALL

SELECT
  student_id,
  'kb_items' AS chip_table,
  student_id AS chip_id,
  'aggregate' AS source_id,
  'ecs' AS domain,
  'scale_signal_ecs_count' AS feature_key,
  COUNT(*) FILTER (
    WHERE (
      (details_json->>'hours_per_week')::INTEGER >= 10
      OR details_json->>'impact_description' ILIKE '%raised $%'
    )
  )::NUMERIC AS feature_value,
  MAX(updated_at) AS measured_at
FROM kb_items
WHERE item_type IN ('ec', 'activity')
GROUP BY student_id;

-- ========================================
-- 4. NARRATIVE FEATURES
-- ========================================
CREATE OR REPLACE VIEW v_features_narrative AS
SELECT
  student_id,
  'kb_items' AS chip_table,
  student_id AS chip_id,
  'aggregate' AS source_id,
  'narrative' AS domain,
  'essay_completeness_pct' AS feature_key,
  ROUND(
    (COUNT(*) FILTER (WHERE content IS NOT NULL AND LENGTH(content) > 100)::NUMERIC /
     NULLIF(COUNT(*), 0) * 100),
    2
  ) AS feature_value,
  MAX(updated_at) AS measured_at
FROM kb_items
WHERE item_type = 'narrative'
GROUP BY student_id

UNION ALL

SELECT
  student_id,
  'kb_items' AS chip_table,
  student_id AS chip_id,
  source_ref AS source_id,
  'narrative' AS domain,
  'personal_statement_word_count' AS feature_key,
  ARRAY_LENGTH(REGEXP_SPLIT_TO_ARRAY(TRIM(content), '\s+'), 1)::NUMERIC AS feature_value,
  updated_at AS measured_at
FROM kb_items
WHERE item_type = 'narrative'
  AND title ILIKE '%personal statement%'
  AND content IS NOT NULL;

-- ========================================
-- 5. ACADEMICS FEATURES
-- ========================================
CREATE OR REPLACE VIEW v_features_academics AS
SELECT DISTINCT ON (student_id)
  student_id,
  'academic_gpa' AS chip_table,
  gpa_id AS chip_id,
  source_id,
  'academics' AS domain,
  'gpa_unweighted' AS feature_key,
  gpa_unweighted AS feature_value,
  recorded_at AS measured_at
FROM academic_gpa
WHERE gpa_unweighted IS NOT NULL
ORDER BY student_id, recorded_at DESC

UNION ALL

SELECT DISTINCT ON (student_id)
  student_id,
  'academic_gpa' AS chip_table,
  gpa_id AS chip_id,
  source_id,
  'academics' AS domain,
  'gpa_weighted' AS feature_key,
  gpa_weighted AS feature_value,
  recorded_at AS measured_at
FROM academic_gpa
WHERE gpa_weighted IS NOT NULL
ORDER BY student_id, recorded_at DESC

UNION ALL

SELECT
  student_id,
  'academic_courses' AS chip_table,
  student_id AS chip_id,
  'aggregate' AS source_id,
  'academics' AS domain,
  'ap_courses_count' AS feature_key,
  COUNT(*)::NUMERIC AS feature_value,
  MAX(updated_ts) AS measured_at
FROM academic_courses
WHERE course_level = 'AP'
GROUP BY student_id;

-- ========================================
-- 6. PROGRAMS FEATURES (using v_programs_final view)
-- ========================================
CREATE OR REPLACE VIEW v_features_programs AS
SELECT
  student_id,
  'v_programs_final' AS chip_table,
  student_id AS chip_id,
  'aggregate' AS source_id,
  'programs' AS domain,
  'acceptances_count' AS feature_key,
  COUNT(*)::NUMERIC AS feature_value,
  MAX(submit_date::TIMESTAMP) AS measured_at
FROM v_programs_final
GROUP BY student_id

UNION ALL

SELECT
  student_id,
  'v_programs_final' AS chip_table,
  student_id AS chip_id,
  'aggregate' AS source_id,
  'programs' AS domain,
  'tier1_acceptances_count' AS feature_key,
  COUNT(*) FILTER (WHERE tier1_state = 'Tier 1')::NUMERIC AS feature_value,
  MAX(submit_date::TIMESTAMP) AS measured_at
FROM v_programs_final
GROUP BY student_id;

-- ========================================
-- 7. UNIFIED FEATURES VIEW
-- ========================================
CREATE OR REPLACE VIEW v_features_all AS
SELECT * FROM v_features_testing
UNION ALL
SELECT * FROM v_features_awards
UNION ALL
SELECT * FROM v_features_ecs
UNION ALL
SELECT * FROM v_features_narrative
UNION ALL
SELECT * FROM v_features_academics
UNION ALL
SELECT * FROM v_features_programs;

COMMENT ON VIEW v_features_testing IS 'Testing features: Latest SAT score from sat_timeline_enum';
COMMENT ON VIEW v_features_awards IS 'Awards features: Award counts by tier from v_awards_won';
COMMENT ON VIEW v_features_ecs IS 'EC features: Leadership roles and scale signals from kb_items';
COMMENT ON VIEW v_features_narrative IS 'Narrative features: Essay completeness from kb_items';
COMMENT ON VIEW v_features_academics IS 'Academics features: Latest GPA and AP course counts';
COMMENT ON VIEW v_features_programs IS 'Programs features: Summer program counts from v_programs_final';
COMMENT ON VIEW v_features_all IS 'Union of all domain-specific feature views for universal access';

-- v3.7.1 Universal Readiness: Feature Views (FINAL - corrected for actual schema)
-- Creates domain-specific feature extraction views that normalize raw data into standardized features

-- Drop existing views if they exist
DROP VIEW IF EXISTS v_features_all CASCADE;
DROP VIEW IF EXISTS v_features_testing CASCADE;
DROP VIEW IF EXISTS v_features_awards CASCADE;
DROP VIEW IF EXISTS v_features_ecs CASCADE;
DROP VIEW IF EXISTS v_features_narrative CASCADE;
DROP VIEW IF EXISTS v_features_academics CASCADE;
DROP VIEW IF EXISTS v_features_programs CASCADE;

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
  as_of AT TIME ZONE 'UTC' AS measured_at
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
  MAX(won_date AT TIME ZONE 'UTC') AS measured_at
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
  MAX(won_date AT TIME ZONE 'UTC') AS measured_at
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
  MAX(won_date AT TIME ZONE 'UTC') AS measured_at
FROM v_awards_won
GROUP BY student_id;

-- ========================================
-- 3. ECS FEATURES (using kb_items with correct column names)
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
      title_name ILIKE '%president%'
      OR title_name ILIKE '%founder%'
      OR title_name ILIKE '%captain%'
      OR title_name ILIKE '%director%'
    )
  )::NUMERIC AS feature_value,
  MAX(updated_ts) AS measured_at
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
  COUNT(*)::NUMERIC AS feature_value,
  MAX(updated_ts) AS measured_at
FROM kb_items
WHERE item_type IN ('ec', 'activity')
  AND (key_metric_value IS NOT NULL OR tier1_state IS NOT NULL)
GROUP BY student_id;

-- ========================================
-- 4. NARRATIVE FEATURES (using kb_items)
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
    (COUNT(*) FILTER (WHERE status_detail IS NOT NULL)::NUMERIC /
     NULLIF(COUNT(*), 0) * 100),
    2
  ) AS feature_value,
  MAX(updated_ts) AS measured_at
FROM kb_items
WHERE item_type = 'narrative'
GROUP BY student_id

UNION ALL

SELECT
  student_id,
  'kb_items' AS chip_table,
  item_id AS chip_id,
  source_ref AS source_id,
  'narrative' AS domain,
  'personal_statement_word_count' AS feature_key,
  CASE
    WHEN key_metric_value ~ '^[0-9]+$' THEN key_metric_value::NUMERIC
    ELSE 0
  END AS feature_value,
  updated_ts AS measured_at
FROM kb_items
WHERE item_type = 'narrative'
  AND title_name ILIKE '%personal statement%';

-- ========================================
-- 5. ACADEMICS FEATURES
-- ========================================
CREATE OR REPLACE VIEW v_features_academics AS
SELECT DISTINCT ON (g.student_id)
  g.student_id,
  'academic_gpa' AS chip_table,
  g.gpa_id AS chip_id,
  g.source_id,
  'academics' AS domain,
  'gpa_unweighted' AS feature_key,
  g.gpa_unweighted AS feature_value,
  g.recorded_at AS measured_at
FROM academic_gpa g
WHERE g.gpa_unweighted IS NOT NULL
ORDER BY g.student_id, g.recorded_at DESC

UNION ALL

SELECT DISTINCT ON (g.student_id)
  g.student_id,
  'academic_gpa' AS chip_table,
  g.gpa_id AS chip_id,
  g.source_id,
  'academics' AS domain,
  'gpa_weighted' AS feature_key,
  g.gpa_weighted AS feature_value,
  g.recorded_at AS measured_at
FROM academic_gpa g
WHERE g.gpa_weighted IS NOT NULL
ORDER BY g.student_id, g.recorded_at DESC

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
  MAX(submit_date AT TIME ZONE 'UTC') AS measured_at
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

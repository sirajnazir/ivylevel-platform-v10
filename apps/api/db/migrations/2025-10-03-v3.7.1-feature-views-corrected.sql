-- v3.7.1 Universal Readiness: Feature Views (CORRECTED for actual schema)
-- Creates domain-specific feature extraction views that normalize raw data into standardized features

-- ========================================
-- 1. TESTING FEATURES
-- ========================================
CREATE OR REPLACE VIEW v_features_testing AS
SELECT
  s.student_id,
  'sat_timeline_enum' AS chip_table,
  s.id::text AS chip_id,
  s.source_id,
  'testing' AS domain,
  'sat_composite' AS feature_key,
  s.numeric_value::NUMERIC AS feature_value,
  s.as_of::TIMESTAMP AS measured_at
FROM sat_timeline_enum s
WHERE s.type = 'official'
  AND s.numeric_value IS NOT NULL;

-- ========================================
-- 2. AWARDS FEATURES
-- ========================================
CREATE OR REPLACE VIEW v_features_awards AS
SELECT
  student_id,
  'outcomes' AS chip_table,
  outcome_id::text AS chip_id,
  source_id,
  'awards' AS domain,
  'national_awards_count' AS feature_key,
  COUNT(*)::NUMERIC AS feature_value,
  MAX(occurred_at) AS measured_at
FROM outcomes
WHERE type = 'achievement'
  AND details_json->>'category' = 'award'
  AND details_json->>'tier' = 'National'
  AND details_json->>'status' IN ('Won', 'Finalist')
GROUP BY student_id, outcome_id, source_id

UNION ALL

SELECT
  student_id,
  'outcomes' AS chip_table,
  outcome_id::text AS chip_id,
  source_id,
  'awards' AS domain,
  'regional_awards_count' AS feature_key,
  COUNT(*)::NUMERIC AS feature_value,
  MAX(occurred_at) AS measured_at
FROM outcomes
WHERE type = 'achievement'
  AND details_json->>'category' = 'award'
  AND details_json->>'tier' = 'Regional'
  AND details_json->>'status' IN ('Won', 'Finalist')
GROUP BY student_id, outcome_id, source_id

UNION ALL

SELECT
  student_id,
  'outcomes' AS chip_table,
  outcome_id::text AS chip_id,
  source_id,
  'awards' AS domain,
  'international_awards_count' AS feature_key,
  COUNT(*)::NUMERIC AS feature_value,
  MAX(occurred_at) AS measured_at
FROM outcomes
WHERE type = 'achievement'
  AND details_json->>'category' = 'award'
  AND details_json->>'tier' = 'International'
  AND details_json->>'status' IN ('Won', 'Finalist')
GROUP BY student_id, outcome_id, source_id;

-- ========================================
-- 3. ECS FEATURES
-- ========================================
CREATE OR REPLACE VIEW v_features_ecs AS
SELECT
  student_id,
  'kb_items' AS chip_table,
  item_id AS chip_id,
  source_id,
  'ecs' AS domain,
  'leadership_roles_count' AS feature_key,
  COUNT(*)::NUMERIC AS feature_value,
  MAX(updated_at) AS measured_at
FROM kb_items
WHERE item_type IN ('ec', 'activity')
  AND (
    title ILIKE '%president%'
    OR title ILIKE '%founder%'
    OR title ILIKE '%captain%'
    OR title ILIKE '%editor%chief%'
    OR title ILIKE '%director%'
    OR details_json->>'position_title' ILIKE '%president%'
    OR details_json->>'position_title' ILIKE '%founder%'
    OR details_json->>'position_title' ILIKE '%captain%'
  )
GROUP BY student_id, item_id, source_id

UNION ALL

SELECT
  student_id,
  'kb_items' AS chip_table,
  item_id AS chip_id,
  source_id,
  'ecs' AS domain,
  'scale_signal_ecs_count' AS feature_key,
  COUNT(*)::NUMERIC AS feature_value,
  MAX(updated_at) AS measured_at
FROM kb_items
WHERE item_type IN ('ec', 'activity')
  AND (
    (details_json->>'hours_per_week')::INTEGER >= 10
    OR (details_json->>'weeks_per_year')::INTEGER >= 40
    OR details_json->>'impact_description' ILIKE '%raised $%'
    OR details_json->>'impact_description' ILIKE '%led team%'
  )
GROUP BY student_id, item_id, source_id;

-- ========================================
-- 4. NARRATIVE FEATURES
-- ========================================
CREATE OR REPLACE VIEW v_features_narrative AS
SELECT
  student_id,
  'kb_items' AS chip_table,
  item_id AS chip_id,
  source_id,
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
GROUP BY student_id, item_id, source_id

UNION ALL

SELECT
  student_id,
  'kb_items' AS chip_table,
  item_id AS chip_id,
  source_id,
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
SELECT
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

UNION ALL

SELECT
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

UNION ALL

SELECT
  student_id,
  'academic_courses' AS chip_table,
  course_id AS chip_id,
  source_id,
  'academics' AS domain,
  'ap_courses_count' AS feature_key,
  COUNT(*)::NUMERIC AS feature_value,
  MAX(end_date::TIMESTAMP) AS measured_at
FROM academic_courses
WHERE course_level = 'AP'
GROUP BY student_id, course_id, source_id;

-- ========================================
-- 6. PROGRAMS FEATURES
-- ========================================
CREATE OR REPLACE VIEW v_features_programs AS
SELECT
  student_id,
  'outcomes' AS chip_table,
  outcome_id::text AS chip_id,
  source_id,
  'programs' AS domain,
  'acceptances_count' AS feature_key,
  COUNT(*)::NUMERIC AS feature_value,
  MAX(occurred_at) AS measured_at
FROM outcomes
WHERE type IN ('achievement', 'result')
  AND details_json->>'category' = 'summer_program'
  AND details_json->>'status' = 'Accepted'
GROUP BY student_id, outcome_id, source_id

UNION ALL

SELECT
  student_id,
  'outcomes' AS chip_table,
  outcome_id::text AS chip_id,
  source_id,
  'programs' AS domain,
  'tier1_acceptances_count' AS feature_key,
  COUNT(*)::NUMERIC AS feature_value,
  MAX(occurred_at) AS measured_at
FROM outcomes
WHERE type IN ('achievement', 'result')
  AND details_json->>'category' = 'summer_program'
  AND details_json->>'status' = 'Accepted'
  AND details_json->>'tier' = 'Tier 1'
GROUP BY student_id, outcome_id, source_id;

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

COMMENT ON VIEW v_features_testing IS 'Testing features: SAT/ACT scores from sat_timeline_enum';
COMMENT ON VIEW v_features_awards IS 'Awards features: National/regional/international counts from outcomes';
COMMENT ON VIEW v_features_ecs IS 'EC features: Leadership roles and scale signals from kb_items';
COMMENT ON VIEW v_features_narrative IS 'Narrative features: Essay completeness and word counts from kb_items';
COMMENT ON VIEW v_features_academics IS 'Academics features: GPA and AP course counts from academic tables';
COMMENT ON VIEW v_features_programs IS 'Programs features: Summer program acceptances from outcomes';
COMMENT ON VIEW v_features_all IS 'Union of all domain-specific feature views for universal access';

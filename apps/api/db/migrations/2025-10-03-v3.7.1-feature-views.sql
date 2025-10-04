-- v3.7.1 Universal Readiness: Feature Views
-- Creates domain-specific feature extraction views that normalize raw data into standardized features

-- ========================================
-- 1. TESTING FEATURES
-- ========================================
CREATE OR REPLACE VIEW v_features_testing AS
SELECT
  s.student_id,
  s.chip_id,
  s.chip_table,
  s.source_id,
  'testing' AS domain,
  'sat_composite' AS feature_key,
  s.sat_composite AS feature_value,
  s.snapshot_date AS measured_at
FROM v_testing_latest s
WHERE s.sat_composite IS NOT NULL

UNION ALL

SELECT
  s.student_id,
  s.chip_id,
  s.chip_table,
  s.source_id,
  'testing' AS domain,
  'act_composite' AS feature_key,
  s.act_composite AS feature_value,
  s.snapshot_date AS measured_at
FROM v_testing_latest s
WHERE s.act_composite IS NOT NULL;

-- ========================================
-- 2. AWARDS FEATURES
-- ========================================
CREATE OR REPLACE VIEW v_features_awards AS
SELECT
  student_id,
  chip_id,
  chip_table,
  source_id,
  'awards' AS domain,
  'national_awards_count' AS feature_key,
  COUNT(*) AS feature_value,
  MAX(awarded_at) AS measured_at
FROM outcomes
WHERE outcome_type = 'AWARD'
  AND award_tier = 'National'
  AND outcome_status IN ('Won', 'Finalist')
GROUP BY student_id, chip_id, chip_table, source_id

UNION ALL

SELECT
  student_id,
  chip_id,
  chip_table,
  source_id,
  'awards' AS domain,
  'regional_awards_count' AS feature_key,
  COUNT(*) AS feature_value,
  MAX(awarded_at) AS measured_at
FROM outcomes
WHERE outcome_type = 'AWARD'
  AND award_tier = 'Regional'
  AND outcome_status IN ('Won', 'Finalist')
GROUP BY student_id, chip_id, chip_table, source_id

UNION ALL

SELECT
  student_id,
  chip_id,
  chip_table,
  source_id,
  'awards' AS domain,
  'international_awards_count' AS feature_key,
  COUNT(*) AS feature_value,
  MAX(awarded_at) AS measured_at
FROM outcomes
WHERE outcome_type = 'AWARD'
  AND award_tier = 'International'
  AND outcome_status IN ('Won', 'Finalist')
GROUP BY student_id, chip_id, chip_table, source_id;

-- ========================================
-- 3. ECS FEATURES
-- ========================================
CREATE OR REPLACE VIEW v_features_ecs AS
SELECT
  student_id,
  chip_id,
  chip_table,
  source_id,
  'ecs' AS domain,
  'leadership_roles_count' AS feature_key,
  COUNT(*) AS feature_value,
  MAX(participation_end_date) AS measured_at
FROM outcomes
WHERE outcome_type = 'EC'
  AND (
    position_title ILIKE '%president%'
    OR position_title ILIKE '%founder%'
    OR position_title ILIKE '%captain%'
    OR position_title ILIKE '%editor%chief%'
    OR position_title ILIKE '%director%'
  )
GROUP BY student_id, chip_id, chip_table, source_id

UNION ALL

SELECT
  student_id,
  chip_id,
  chip_table,
  source_id,
  'ecs' AS domain,
  'scale_signal_ecs_count' AS feature_key,
  COUNT(*) AS feature_value,
  MAX(participation_end_date) AS measured_at
FROM outcomes
WHERE outcome_type = 'EC'
  AND (
    hours_per_week >= 10
    OR weeks_per_year >= 40
    OR impact_description ILIKE '%raised $%'
    OR impact_description ILIKE '%led team%'
    OR impact_description ILIKE '%managed%people%'
  )
GROUP BY student_id, chip_id, chip_table, source_id;

-- ========================================
-- 4. NARRATIVE FEATURES
-- ========================================
CREATE OR REPLACE VIEW v_features_narrative AS
SELECT
  student_id,
  chip_id,
  chip_table,
  source_id,
  'narrative' AS domain,
  'essay_completeness_pct' AS feature_key,
  ROUND(
    (COUNT(*) FILTER (WHERE essay_text IS NOT NULL AND LENGTH(essay_text) > 100)::NUMERIC /
     NULLIF(COUNT(*), 0) * 100),
    2
  ) AS feature_value,
  MAX(updated_at) AS measured_at
FROM kb_items
WHERE item_type = 'ESSAY'
GROUP BY student_id, chip_id, chip_table, source_id

UNION ALL

SELECT
  student_id,
  chip_id,
  chip_table,
  source_id,
  'narrative' AS domain,
  'personal_statement_word_count' AS feature_key,
  ARRAY_LENGTH(REGEXP_SPLIT_TO_ARRAY(TRIM(essay_text), '\s+'), 1) AS feature_value,
  updated_at AS measured_at
FROM kb_items
WHERE item_type = 'ESSAY'
  AND essay_type = 'Personal Statement'
  AND essay_text IS NOT NULL;

-- ========================================
-- 5. ACADEMICS FEATURES
-- ========================================
CREATE OR REPLACE VIEW v_features_academics AS
SELECT
  g.student_id,
  g.chip_id,
  g.chip_table,
  g.source_id,
  'academics' AS domain,
  'gpa_unweighted' AS feature_key,
  g.gpa_unweighted AS feature_value,
  g.measured_at
FROM v_academics_gpa_latest g
WHERE g.gpa_unweighted IS NOT NULL

UNION ALL

SELECT
  g.student_id,
  g.chip_id,
  g.chip_table,
  g.source_id,
  'academics' AS domain,
  'gpa_weighted' AS feature_key,
  g.gpa_weighted AS feature_value,
  g.measured_at
FROM v_academics_gpa_latest g
WHERE g.gpa_weighted IS NOT NULL

UNION ALL

SELECT
  student_id,
  chip_id,
  chip_table,
  source_id,
  'academics' AS domain,
  'ap_courses_count' AS feature_key,
  COUNT(*) AS feature_value,
  MAX(end_date) AS measured_at
FROM academic_courses
WHERE course_level = 'AP'
GROUP BY student_id, chip_id, chip_table, source_id;

-- ========================================
-- 6. PROGRAMS FEATURES
-- ========================================
CREATE OR REPLACE VIEW v_features_programs AS
SELECT
  student_id,
  chip_id,
  chip_table,
  source_id,
  'programs' AS domain,
  'acceptances_count' AS feature_key,
  COUNT(*) AS feature_value,
  MAX(decision_date) AS measured_at
FROM outcomes
WHERE outcome_type = 'SUMMER_PROGRAM'
  AND outcome_status = 'Accepted'
GROUP BY student_id, chip_id, chip_table, source_id

UNION ALL

SELECT
  student_id,
  chip_id,
  chip_table,
  source_id,
  'programs' AS domain,
  'tier1_acceptances_count' AS feature_key,
  COUNT(*) AS feature_value,
  MAX(decision_date) AS measured_at
FROM outcomes
WHERE outcome_type = 'SUMMER_PROGRAM'
  AND outcome_status = 'Accepted'
  AND program_tier = 'Tier 1'
GROUP BY student_id, chip_id, chip_table, source_id;

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

COMMENT ON VIEW v_features_testing IS 'Testing features: SAT/ACT scores normalized from v_testing_latest';
COMMENT ON VIEW v_features_awards IS 'Awards features: National/regional/international counts from outcomes';
COMMENT ON VIEW v_features_ecs IS 'EC features: Leadership roles and scale signals from outcomes';
COMMENT ON VIEW v_features_narrative IS 'Narrative features: Essay completeness and word counts from kb_items';
COMMENT ON VIEW v_features_academics IS 'Academics features: GPA and AP course counts from academic tables';
COMMENT ON VIEW v_features_programs IS 'Programs features: Summer program acceptances from outcomes';
COMMENT ON VIEW v_features_all IS 'Union of all domain-specific feature views for universal access';

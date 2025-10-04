-- v3.7.3 Universal Readiness: What-If Engine Views
-- Simulates action effects on features, factors, and overall IvyReady score

-- ========================================
-- 1. ACTION EFFECTS (Action Params → Feature Deltas)
-- ========================================
CREATE OR REPLACE VIEW v_action_effects_current AS
WITH action_params AS (
  -- Define parametric actions with their inputs
  -- In production, this would come from a table or be passed as parameters
  -- Example: ('raise_sat_to', 1500), ('win_award_tier', 'National')
  SELECT
    'raise_sat_to'::TEXT AS action_key,
    1500::NUMERIC AS action_param
),
current_features AS (
  -- Get current feature values for the student
  SELECT DISTINCT ON (student_id, feature_key)
    student_id,
    chip_id,
    chip_table,
    source_id,
    feature_key,
    feature_value,
    measured_at
  FROM v_features_all
  ORDER BY student_id, feature_key, measured_at DESC
)
SELECT
  ap.action_key,
  ap.action_param,
  cf.student_id,
  cf.chip_id,
  cf.chip_table,
  cf.source_id,
  afe.feature_key,
  cf.feature_value AS current_value,
  -- Apply the effect model to compute new feature value
  CASE
    WHEN afe.effect_type = 'SET' THEN ap.action_param
    WHEN afe.effect_type = 'ADD' THEN cf.feature_value + afe.effect_magnitude
    WHEN afe.effect_type = 'MULTIPLY' THEN cf.feature_value * afe.effect_magnitude
    WHEN afe.effect_type = 'MAX' THEN GREATEST(cf.feature_value, afe.effect_magnitude)
    ELSE cf.feature_value
  END AS projected_value,
  -- Feature delta
  CASE
    WHEN afe.effect_type = 'SET' THEN ap.action_param - cf.feature_value
    WHEN afe.effect_type = 'ADD' THEN afe.effect_magnitude
    WHEN afe.effect_type = 'MULTIPLY' THEN cf.feature_value * (afe.effect_magnitude - 1)
    WHEN afe.effect_type = 'MAX' THEN GREATEST(0, afe.effect_magnitude - cf.feature_value)
    ELSE 0
  END AS feature_delta,
  afe.effect_type,
  afe.effect_magnitude,
  NOW() AS simulated_at
FROM action_params ap
INNER JOIN action_feature_effects afe ON ap.action_key = afe.action_key
LEFT JOIN current_features cf ON afe.feature_key = cf.feature_key;

-- ========================================
-- 2. WHAT-IF IVYREADY DELTA (Feature Deltas → Score Delta)
-- ========================================
CREATE OR REPLACE VIEW v_action_ivyready_delta AS
WITH current_score AS (
  -- Baseline: current IvyReady score
  SELECT
    student_id,
    chip_id,
    chip_table,
    source_id,
    rubric_id,
    ivyready_score AS current_ivyready_score,
    readiness_tier AS current_tier,
    factor_breakdown AS current_factors
  FROM v_ivyready_current
),
action_effects AS (
  -- Get projected feature changes from actions
  SELECT * FROM v_action_effects_current
),
projected_features AS (
  -- Combine current features with projected changes
  SELECT
    COALESCE(ae.student_id, cf.student_id) AS student_id,
    COALESCE(ae.chip_id, cf.chip_id) AS chip_id,
    COALESCE(ae.chip_table, cf.chip_table) AS chip_table,
    COALESCE(ae.source_id, cf.source_id) AS source_id,
    COALESCE(ae.feature_key, cf.feature_key) AS feature_key,
    COALESCE(ae.projected_value, cf.feature_value) AS feature_value,
    ae.action_key,
    ae.action_param
  FROM action_effects ae
  FULL OUTER JOIN (
    SELECT DISTINCT ON (student_id, feature_key)
      student_id, chip_id, chip_table, source_id, feature_key, feature_value
    FROM v_features_all
    ORDER BY student_id, feature_key, measured_at DESC
  ) cf ON ae.student_id = cf.student_id AND ae.feature_key = cf.feature_key
),
projected_factor_scores AS (
  -- Recompute factor scores using projected features
  SELECT
    pf.student_id,
    pf.chip_id,
    pf.chip_table,
    pf.source_id,
    pf.action_key,
    pf.action_param,
    fm.rubric_id,
    fm.factor_key,
    fd.factor_name,
    ROUND(
      SUM(
        LEAST(
          (pf.feature_value::NUMERIC / NULLIF(fm.feature_normalizer, 0)) * fm.feature_weight,
          fm.feature_cap
        )
      )::NUMERIC,
      2
    ) AS projected_factor_score,
    fd.factor_max_score
  FROM projected_features pf
  INNER JOIN factor_feature_map fm ON pf.feature_key = fm.feature_key
  INNER JOIN factor_defs fd ON fm.rubric_id = fd.rubric_id AND fm.factor_key = fd.factor_key
  GROUP BY
    pf.student_id, pf.chip_id, pf.chip_table, pf.source_id,
    pf.action_key, pf.action_param,
    fm.rubric_id, fm.factor_key, fd.factor_name, fd.factor_max_score
),
projected_overall AS (
  -- Recompute overall IvyReady score
  SELECT
    pfs.student_id,
    pfs.chip_id,
    pfs.chip_table,
    pfs.source_id,
    pfs.action_key,
    pfs.action_param,
    pfs.rubric_id,
    ROUND(
      (SUM(pfs.projected_factor_score) / NULLIF(SUM(pfs.factor_max_score), 0) * 100)::NUMERIC,
      2
    ) AS projected_ivyready_score,
    CASE
      WHEN (SUM(pfs.projected_factor_score) / NULLIF(SUM(pfs.factor_max_score), 0) * 100) >= 90 THEN 'Ivy Ready'
      WHEN (SUM(pfs.projected_factor_score) / NULLIF(SUM(pfs.factor_max_score), 0) * 100) >= 75 THEN 'Competitive'
      WHEN (SUM(pfs.projected_factor_score) / NULLIF(SUM(pfs.factor_max_score), 0) * 100) >= 60 THEN 'On Track'
      WHEN (SUM(pfs.projected_factor_score) / NULLIF(SUM(pfs.factor_max_score), 0) * 100) >= 40 THEN 'Building'
      ELSE 'Early Stage'
    END AS projected_tier,
    JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'factor_key', pfs.factor_key,
        'factor_name', pfs.factor_name,
        'projected_score', pfs.projected_factor_score,
        'max_score', pfs.factor_max_score
      )
    ) AS projected_factors
  FROM projected_factor_scores pfs
  GROUP BY
    pfs.student_id, pfs.chip_id, pfs.chip_table, pfs.source_id,
    pfs.action_key, pfs.action_param, pfs.rubric_id
)
SELECT
  po.student_id,
  po.chip_id,
  po.chip_table,
  po.source_id,
  po.action_key,
  po.action_param,
  po.rubric_id,
  ad.action_name,
  ad.action_description,
  cs.current_ivyready_score,
  cs.current_tier,
  po.projected_ivyready_score,
  po.projected_tier,
  -- Delta
  ROUND(
    (po.projected_ivyready_score - cs.current_ivyready_score)::NUMERIC,
    2
  ) AS ivyready_delta,
  CASE
    WHEN po.projected_tier != cs.current_tier THEN TRUE
    ELSE FALSE
  END AS tier_changed,
  -- Breakdowns
  cs.current_factors,
  po.projected_factors,
  NOW() AS simulated_at
FROM projected_overall po
INNER JOIN current_score cs
  ON po.student_id = cs.student_id
  AND po.chip_id = cs.chip_id
  AND po.rubric_id = cs.rubric_id
INNER JOIN action_defs ad
  ON po.action_key = ad.action_key
  AND po.rubric_id = ad.rubric_id;

-- ========================================
-- 3. RECOMMENDED NEXT MOVES
-- ========================================
-- Ranks actions by their projected impact on IvyReady score
CREATE OR REPLACE VIEW v_recommended_next_moves AS
SELECT
  student_id,
  chip_id,
  chip_table,
  source_id,
  action_key,
  action_name,
  action_description,
  action_param,
  ivyready_delta,
  tier_changed,
  current_ivyready_score,
  projected_ivyready_score,
  current_tier,
  projected_tier,
  -- Rank actions by delta (highest impact first)
  ROW_NUMBER() OVER (
    PARTITION BY student_id, chip_id
    ORDER BY ivyready_delta DESC, tier_changed DESC
  ) AS impact_rank,
  simulated_at
FROM v_action_ivyready_delta
WHERE ivyready_delta > 0
ORDER BY student_id, impact_rank;

COMMENT ON VIEW v_action_effects_current IS 'Simulates action effects on individual features';
COMMENT ON VIEW v_action_ivyready_delta IS 'Projects how actions affect overall IvyReady score and tier';
COMMENT ON VIEW v_recommended_next_moves IS 'Ranks actions by projected impact for strategic planning';

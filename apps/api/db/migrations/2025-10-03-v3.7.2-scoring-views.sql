-- v3.7.2 Universal Readiness: Scoring Views
-- Aggregates features into factor scores, then factor scores into overall IvyReady score

-- ========================================
-- 1. FACTOR SCORES (Features → Factors)
-- ========================================
CREATE OR REPLACE VIEW v_factor_scores_current AS
WITH latest_features AS (
  -- Get the most recent value for each feature per student
  SELECT DISTINCT ON (student_id, feature_key)
    student_id,
    chip_id,
    chip_table,
    source_id,
    domain,
    feature_key,
    feature_value,
    measured_at
  FROM v_features_all
  ORDER BY student_id, feature_key, measured_at DESC
),
feature_scores AS (
  -- Join features with their factor mappings and apply weights
  SELECT
    lf.student_id,
    lf.chip_id,
    lf.chip_table,
    lf.source_id,
    fm.rubric_id,
    fm.factor_key,
    fm.feature_key,
    lf.feature_value,
    fm.feature_weight,
    fm.feature_normalizer,
    fm.feature_cap,
    -- Normalize and cap the feature value
    LEAST(
      (lf.feature_value::NUMERIC / NULLIF(fm.feature_normalizer, 0)) * fm.feature_weight,
      fm.feature_cap
    ) AS weighted_score,
    lf.measured_at
  FROM latest_features lf
  INNER JOIN factor_feature_map fm ON lf.feature_key = fm.feature_key
)
SELECT
  fs.student_id,
  fs.chip_id,
  fs.chip_table,
  fs.source_id,
  fs.rubric_id,
  fs.factor_key,
  fd.factor_name,
  fd.factor_description,
  -- Sum weighted scores for all features contributing to this factor
  ROUND(SUM(fs.weighted_score)::NUMERIC, 2) AS factor_score,
  fd.factor_max_score,
  -- Calculate percentage of max possible score
  ROUND(
    (SUM(fs.weighted_score)::NUMERIC / NULLIF(fd.factor_max_score, 0) * 100),
    2
  ) AS factor_pct,
  -- JSON array of feature contributions
  JSONB_AGG(
    JSONB_BUILD_OBJECT(
      'feature_key', fs.feature_key,
      'feature_value', fs.feature_value,
      'weighted_score', ROUND(fs.weighted_score::NUMERIC, 2),
      'measured_at', fs.measured_at
    ) ORDER BY fs.weighted_score DESC
  ) AS feature_breakdown,
  MAX(fs.measured_at) AS computed_at
FROM feature_scores fs
INNER JOIN factor_defs fd ON fs.rubric_id = fd.rubric_id AND fs.factor_key = fd.factor_key
GROUP BY
  fs.student_id,
  fs.chip_id,
  fs.chip_table,
  fs.source_id,
  fs.rubric_id,
  fs.factor_key,
  fd.factor_name,
  fd.factor_description,
  fd.factor_max_score;

-- ========================================
-- 2. OVERALL IVYREADY SCORE (Factors → Overall)
-- ========================================
CREATE OR REPLACE VIEW v_ivyready_current AS
WITH factor_totals AS (
  SELECT
    student_id,
    chip_id,
    chip_table,
    source_id,
    rubric_id,
    SUM(factor_score) AS total_score,
    SUM(factor_max_score) AS total_max_score,
    JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'factor_key', factor_key,
        'factor_name', factor_name,
        'factor_score', factor_score,
        'factor_max_score', factor_max_score,
        'factor_pct', factor_pct,
        'feature_breakdown', feature_breakdown
      ) ORDER BY factor_score DESC
    ) AS factor_breakdown,
    MAX(computed_at) AS computed_at
  FROM v_factor_scores_current
  GROUP BY student_id, chip_id, chip_table, source_id, rubric_id
)
SELECT
  ft.student_id,
  ft.chip_id,
  ft.chip_table,
  ft.source_id,
  ft.rubric_id,
  -- Overall score (0-100 scale)
  ROUND(
    (ft.total_score / NULLIF(ft.total_max_score, 0) * 100)::NUMERIC,
    2
  ) AS ivyready_score,
  -- Tier classification
  CASE
    WHEN (ft.total_score / NULLIF(ft.total_max_score, 0) * 100) >= 90 THEN 'Ivy Ready'
    WHEN (ft.total_score / NULLIF(ft.total_max_score, 0) * 100) >= 75 THEN 'Competitive'
    WHEN (ft.total_score / NULLIF(ft.total_max_score, 0) * 100) >= 60 THEN 'On Track'
    WHEN (ft.total_score / NULLIF(ft.total_max_score, 0) * 100) >= 40 THEN 'Building'
    ELSE 'Early Stage'
  END AS readiness_tier,
  -- Raw totals
  ROUND(ft.total_score::NUMERIC, 2) AS total_score,
  ft.total_max_score,
  -- Factor breakdown
  ft.factor_breakdown,
  ft.computed_at
FROM factor_totals ft;

-- ========================================
-- 3. TEMPORAL SNAPSHOTS
-- ========================================
-- Captures point-in-time snapshots of feature values for historical tracking
CREATE OR REPLACE VIEW v_feature_snapshots_timeline AS
SELECT
  fs.snapshot_id,
  fs.student_id,
  fs.chip_id,
  fs.chip_table,
  fs.source_id,
  fs.rubric_id,
  fs.feature_key,
  fs.feature_value,
  fs.snapshot_date,
  fd.feature_name,
  fd.feature_description,
  fd.domain
FROM feature_snapshots fs
INNER JOIN feature_defs fd ON fs.rubric_id = fd.rubric_id AND fs.feature_key = fd.feature_key
ORDER BY fs.student_id, fs.snapshot_date DESC, fs.feature_key;

COMMENT ON VIEW v_factor_scores_current IS 'Current factor scores computed from latest feature values';
COMMENT ON VIEW v_ivyready_current IS 'Current overall IvyReady score aggregated from factor scores';
COMMENT ON VIEW v_feature_snapshots_timeline IS 'Historical timeline of feature snapshots for trend analysis';

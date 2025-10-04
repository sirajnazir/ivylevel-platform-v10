-- v3.7.1 Universal Readiness: Scoring Views + Snapshots
-- Adds lightweight scoring views and snapshot mechanism for readiness tracking

-- ========================================
-- 1. READINESS SNAPSHOTS TABLE (v3.7.1)
-- ========================================
CREATE TABLE IF NOT EXISTS readiness_snapshots (
  snapshot_id TEXT PRIMARY KEY DEFAULT ('snap-' || gen_random_uuid()::text),
  student_id TEXT NOT NULL,
  snapshot_name TEXT NOT NULL,
  ivy_ready_score NUMERIC(5,2),
  features_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_student_readiness FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_readiness_snapshots_student ON readiness_snapshots(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_readiness_snapshots_name ON readiness_snapshots(student_id, snapshot_name);

COMMENT ON TABLE readiness_snapshots IS 'Point-in-time readiness feature captures for historical tracking';
COMMENT ON COLUMN readiness_snapshots.features_json IS 'Serialized v_features_all snapshot with domain grouping';

-- ========================================
-- 2. FACTOR SCORES VIEW (Weighted Aggregation)
-- ========================================
CREATE OR REPLACE VIEW v_factor_scores_current AS
WITH feature_values AS (
  SELECT
    student_id,
    domain,
    feature_key,
    feature_value
  FROM v_features_all
),
-- ACADEMICS FACTOR (40% weight)
academics_score AS (
  SELECT
    student_id,
    'academics' AS factor,
    ROUND(
      LEAST(100, GREATEST(0,
        COALESCE((SELECT feature_value FROM feature_values WHERE student_id = fv.student_id AND feature_key = 'gpa_unweighted'), 0) * 25 +
        COALESCE((SELECT feature_value FROM feature_values WHERE student_id = fv.student_id AND feature_key = 'ap_courses_count'), 0) * 5
      )),
      2
    ) AS score,
    0.40 AS weight
  FROM (SELECT DISTINCT student_id FROM feature_values) fv
),
-- AWARDS FACTOR (25% weight)
awards_score AS (
  SELECT
    student_id,
    'awards' AS factor,
    ROUND(
      LEAST(100, GREATEST(0,
        COALESCE((SELECT feature_value FROM feature_values WHERE student_id = fv.student_id AND feature_key = 'international_awards_count'), 0) * 40 +
        COALESCE((SELECT feature_value FROM feature_values WHERE student_id = fv.student_id AND feature_key = 'national_awards_count'), 0) * 20 +
        COALESCE((SELECT feature_value FROM feature_values WHERE student_id = fv.student_id AND feature_key = 'regional_awards_count'), 0) * 10
      )),
      2
    ) AS score,
    0.25 AS weight
  FROM (SELECT DISTINCT student_id FROM feature_values) fv
),
-- LEADERSHIP FACTOR (20% weight)
leadership_score AS (
  SELECT
    student_id,
    'leadership' AS factor,
    ROUND(
      LEAST(100, GREATEST(0,
        COALESCE((SELECT feature_value FROM feature_values WHERE student_id = fv.student_id AND feature_key = 'leadership_roles_count'), 0) * 15 +
        COALESCE((SELECT feature_value FROM feature_values WHERE student_id = fv.student_id AND feature_key = 'scale_signal_ecs_count'), 0) * 10
      )),
      2
    ) AS score,
    0.20 AS weight
  FROM (SELECT DISTINCT student_id FROM feature_values) fv
),
-- PROGRAMS FACTOR (10% weight)
programs_score AS (
  SELECT
    student_id,
    'programs' AS factor,
    ROUND(
      LEAST(100, GREATEST(0,
        COALESCE((SELECT feature_value FROM feature_values WHERE student_id = fv.student_id AND feature_key = 'acceptances_count'), 0) * 20
      )),
      2
    ) AS score,
    0.10 AS weight
  FROM (SELECT DISTINCT student_id FROM feature_values) fv
),
-- NARRATIVE FACTOR (5% weight)
narrative_score AS (
  SELECT
    student_id,
    'narrative' AS factor,
    ROUND(
      LEAST(100, GREATEST(0,
        COALESCE((SELECT feature_value FROM feature_values WHERE student_id = fv.student_id AND feature_key = 'essay_completeness_pct'), 0)
      )),
      2
    ) AS score,
    0.05 AS weight
  FROM (SELECT DISTINCT student_id FROM feature_values) fv
)
SELECT * FROM academics_score
UNION ALL SELECT * FROM awards_score
UNION ALL SELECT * FROM leadership_score
UNION ALL SELECT * FROM programs_score
UNION ALL SELECT * FROM narrative_score;

COMMENT ON VIEW v_factor_scores_current IS 'Weighted factor scores from current features (academics 40%, awards 25%, leadership 20%, programs 10%, narrative 5%)';

-- ========================================
-- 3. IVYREADY COMPOSITE SCORE VIEW
-- ========================================
CREATE OR REPLACE VIEW v_ivyready_current AS
SELECT
  student_id,
  ROUND(SUM(score * weight), 2) AS ivy_ready_score,
  jsonb_object_agg(factor, score ORDER BY factor) AS factor_breakdown,
  NOW() AS calculated_at
FROM v_factor_scores_current
GROUP BY student_id;

COMMENT ON VIEW v_ivyready_current IS 'Composite IvyReady score (0-100) with factor breakdown';

-- ========================================
-- 4. WHAT-IF DELTA VIEW
-- ========================================
CREATE OR REPLACE VIEW v_action_ivyready_delta AS
WITH base_scores AS (
  SELECT
    student_id,
    ivy_ready_score AS base_score,
    factor_breakdown
  FROM v_ivyready_current
),
-- SAT improvement actions (maps to academics factor)
sat_actions AS (
  SELECT
    bs.student_id,
    'raise_sat_to' AS action_type,
    target_sat::TEXT AS action_param,
    base_score,
    -- Delta calculation: SAT contributes to academics (40% weight)
    -- Assume SAT is 60% of academics factor, scaled from 1600 max
    ROUND(
      base_score + (
        (target_sat / 1600.0 * 60) -
        COALESCE((bs.factor_breakdown->>'academics')::NUMERIC * 0.6, 0)
      ) * 0.40,
      2
    ) AS projected_score,
    ROUND(
      (
        (target_sat / 1600.0 * 60) -
        COALESCE((bs.factor_breakdown->>'academics')::NUMERIC * 0.6, 0)
      ) * 0.40,
      2
    ) AS delta
  FROM base_scores bs
  CROSS JOIN (
    SELECT generate_series(1200, 1600, 50) AS target_sat
  ) targets
),
-- Award tier actions (maps to awards factor)
award_actions AS (
  SELECT
    bs.student_id,
    'win_award_tier' AS action_type,
    tier AS action_param,
    base_score,
    -- Delta calculation: Award contributes to awards factor (25% weight)
    ROUND(
      base_score + tier_bump * 0.25,
      2
    ) AS projected_score,
    ROUND(tier_bump * 0.25, 2) AS delta
  FROM base_scores bs
  CROSS JOIN (
    VALUES
      ('International', 40),
      ('National', 20),
      ('Regional', 10)
  ) AS tiers(tier, tier_bump)
)
SELECT * FROM sat_actions
UNION ALL
SELECT * FROM award_actions;

COMMENT ON VIEW v_action_ivyready_delta IS 'Pre-calculated what-if deltas for SAT targets and award tiers';

-- ========================================
-- 5. SEED DATA: Award Tier Normalization
-- ========================================
-- Update existing awards to use normalized tiers
UPDATE kb_items
SET tier1_state = 'International'
WHERE item_type = 'award'
  AND tier1_state IN ('international', 'INTERNATIONAL', 'global', 'Global');

UPDATE kb_items
SET tier1_state = 'National'
WHERE item_type = 'award'
  AND tier1_state IN ('national', 'NATIONAL', 'country');

UPDATE kb_items
SET tier1_state = 'Regional'
WHERE item_type = 'award'
  AND tier1_state IN ('regional', 'REGIONAL', 'state', 'State', 'local', 'Local');

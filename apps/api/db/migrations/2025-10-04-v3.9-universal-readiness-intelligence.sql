-- ============================================================================
-- v3.9 Universal Readiness Intelligence Framework
-- ============================================================================
-- Purpose: Systematize how students discover, interpret, and act on next best move
-- Enables queries like:
--   - "What's my top weak spot right now?"
--   - "Which one thing can give me the biggest boost?"
--   - "How do I fix my weak spot?"
--   - "What should I prioritize this month?"
--   - "What's dragging my IvyReady score down?"
-- ============================================================================

-- 1. Readiness Feature Weights (Universal Impact Model)
-- ============================================================================
CREATE TABLE IF NOT EXISTS readiness_feature_weights (
  feature_key        TEXT PRIMARY KEY,
  domain             TEXT NOT NULL,
  target_value       NUMERIC,            -- benchmark (Ivy+ competitive level)
  impact_coefficient NUMERIC,            -- 0..1 (sensitivity weight on IvyReady)
  qualitative_weight NUMERIC DEFAULT 0,  -- for narrative-type signals
  description        TEXT,
  created_at         TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE readiness_feature_weights IS 'Universal feature impact model for IvyReady scoring';
COMMENT ON COLUMN readiness_feature_weights.feature_key IS 'Unique feature identifier (e.g., sat_total, ecs_users_empowering_ai)';
COMMENT ON COLUMN readiness_feature_weights.domain IS 'Feature domain (testing, academics, awards, ecs, narrative, programs)';
COMMENT ON COLUMN readiness_feature_weights.target_value IS 'Ivy+ competitive benchmark value';
COMMENT ON COLUMN readiness_feature_weights.impact_coefficient IS 'Weight of feature on IvyReady score (0-1)';

-- 2. Readiness Snapshots (Time-Series Tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS readiness_snapshots (
  snapshot_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id     TEXT NOT NULL,
  as_of          DATE NOT NULL,
  ivyready_score NUMERIC,
  top_drivers    JSONB,           -- e.g. {"ecs":0.92,"awards":0.88}
  weakspots      JSONB,           -- {"awards":"lacking national wins"}
  next_actions   JSONB,           -- [{"action":"win national award","lift":5.0}]
  metadata       JSONB,           -- extensible for coach notes, etc.
  created_ts     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, as_of)
);

CREATE INDEX IF NOT EXISTS idx_readiness_snapshots_student ON readiness_snapshots(student_id, as_of DESC);
COMMENT ON TABLE readiness_snapshots IS 'Time-series snapshots of student readiness state';

-- 3. Feature Values View (Unified Current State)
-- ============================================================================
-- Note: This assumes you have a features table or need to union from existing tables
-- For now, creating a placeholder view that unions common features
CREATE OR REPLACE VIEW v_features_all AS
-- Testing features
SELECT
  student_id,
  'testing' AS domain,
  'sat_total' AS feature_key,
  value_num,
  source_id,
  recorded_at
FROM facts_canonical
WHERE kind = 'sat_total_score'

UNION ALL

-- GPA features
SELECT
  student_id,
  'academics' AS domain,
  'gpa_unweighted' AS feature_key,
  gpa_unweighted AS value_num,
  'transcript' AS source_id,
  recorded_at
FROM academic_gpa
WHERE recorded_at = (SELECT MAX(recorded_at) FROM academic_gpa g2 WHERE g2.student_id = academic_gpa.student_id)

UNION ALL

-- EC user metrics
SELECT
  k.student_id,
  'ecs' AS domain,
  'ec_users_' || lower(regexp_replace(k.title_name, '[^a-zA-Z0-9]', '_', 'g')) AS feature_key,
  COALESCE((k.metadata->>'users')::numeric, 0) AS value_num,
  k.chip_id AS source_id,
  k.recorded_at
FROM kb_items k
WHERE k.item_type = 'ec'
  AND k.metadata->>'users' IS NOT NULL

UNION ALL

-- Award counts by tier
SELECT
  student_id,
  'awards' AS domain,
  'awards_national_count' AS feature_key,
  COUNT(*) AS value_num,
  'outcomes' AS source_id,
  MAX(recorded_at) AS recorded_at
FROM outcomes
WHERE outcome_type = 'award'
  AND outcome_status = 'won'
  AND outcome_tier = 'national'
GROUP BY student_id;

COMMENT ON VIEW v_features_all IS 'Unified view of all student features for readiness analysis';

-- 4. Feature Gaps Current (Gap Analysis)
-- ============================================================================
CREATE OR REPLACE VIEW v_feature_gaps_current AS
SELECT
  f.student_id,
  f.domain,
  f.feature_key,
  f.value_num AS current_value,
  w.target_value,
  (w.target_value - f.value_num) AS gap_raw,
  w.impact_coefficient,
  (w.impact_coefficient * (w.target_value - f.value_num)) AS gap_weighted,
  w.description
FROM v_features_all f
JOIN readiness_feature_weights w USING (feature_key)
WHERE f.student_id IS NOT NULL
  AND f.value_num IS NOT NULL;

COMMENT ON VIEW v_feature_gaps_current IS 'Current gap analysis between student features and Ivy+ benchmarks';

-- 5. Readiness Weakspots (Top Gaps)
-- ============================================================================
CREATE OR REPLACE VIEW v_readiness_weakspots AS
SELECT
  student_id,
  domain,
  feature_key,
  current_value,
  target_value,
  gap_raw,
  gap_weighted,
  description,
  rank() OVER (PARTITION BY student_id ORDER BY gap_weighted DESC) AS rank
FROM v_feature_gaps_current
WHERE gap_weighted > 0;

COMMENT ON VIEW v_readiness_weakspots IS 'Ranked weakspots (largest weighted gaps) per student';

-- 6. Readiness Top Priorities (Action Recommendations)
-- ============================================================================
CREATE OR REPLACE VIEW v_readiness_top_priorities AS
SELECT
  g.student_id,
  g.domain,
  g.feature_key,
  g.current_value,
  g.target_value,
  g.gap_raw,
  g.gap_weighted,
  g.description AS why,
  CASE g.domain
    WHEN 'testing' THEN 'Raise SAT/ACT score through retake or prep plan'
    WHEN 'awards'  THEN 'Target higher-tier (national/international) awards'
    WHEN 'ecs'     THEN 'Deepen EC impact or scale user reach/funding'
    WHEN 'academics' THEN 'Improve GPA or AP rigor via senior-year course plan'
    WHEN 'narrative' THEN 'Refine essays and unify storytelling'
    ELSE 'Review guidance with coach'
  END AS what,
  'Next 4–6 weeks' AS when,
  CASE g.domain
    WHEN 'testing' THEN 'Schedule retake, use prep resources, target +50-100 points'
    WHEN 'awards'  THEN 'Apply for national awards within submission windows (NCWIT, Regeneron, BofA Leaders)'
    WHEN 'ecs'     THEN 'Set metrics goals (users, funding, hours/week) and track progress'
    WHEN 'academics' THEN 'Enroll in challenging senior courses, maintain A/A- grades'
    WHEN 'narrative' THEN 'Work with coach to refine essays and connect to core theme'
    ELSE 'Use coach session or self-tracking to push metric to benchmark'
  END AS how,
  -- Estimated lift calculation (simple linear model for now)
  ROUND(g.gap_weighted * 1.5, 1) AS estimated_lift
FROM v_feature_gaps_current g
WHERE gap_weighted > 0
ORDER BY g.gap_weighted DESC;

COMMENT ON VIEW v_readiness_top_priorities IS 'Actionable priorities with why/what/when/how guidance';

-- 7. Sample Feature Weights (Initial Seed Data)
-- ============================================================================
INSERT INTO readiness_feature_weights (feature_key, domain, target_value, impact_coefficient, description)
VALUES
  -- Testing
  ('sat_total', 'testing', 1500, 0.25, 'SAT total score (Ivy competitive: 1500+)'),
  ('act_composite', 'testing', 34, 0.25, 'ACT composite score (Ivy competitive: 34+)'),

  -- Academics
  ('gpa_unweighted', 'academics', 3.9, 0.20, 'Unweighted GPA (Ivy competitive: 3.9+)'),
  ('ap_count', 'academics', 8, 0.10, 'Number of AP courses (Ivy competitive: 8+)'),

  -- Awards
  ('awards_national_count', 'awards', 2, 0.20, 'National awards won (Ivy competitive: 2+)'),
  ('awards_international_count', 'awards', 1, 0.15, 'International awards won (Ivy competitive: 1+)'),

  -- ECs (generic user scaling)
  ('ec_users_total', 'ecs', 500, 0.15, 'Total EC user reach (Ivy competitive: 500+)'),
  ('ec_funding_total', 'ecs', 10000, 0.12, 'Total EC funding raised (Ivy competitive: $10k+)'),
  ('ec_hours_per_week', 'ecs', 15, 0.08, 'Hours per week on primary EC (Ivy competitive: 15+)'),

  -- Narrative (qualitative)
  ('narrative_coherence', 'narrative', 0.9, 0.10, 'Essay coherence score (0-1, Ivy competitive: 0.9+)'),
  ('narrative_uniqueness', 'narrative', 0.85, 0.08, 'Essay uniqueness score (0-1, Ivy competitive: 0.85+)')

ON CONFLICT (feature_key) DO UPDATE SET
  target_value = EXCLUDED.target_value,
  impact_coefficient = EXCLUDED.impact_coefficient,
  description = EXCLUDED.description;

-- 8. Grant permissions
-- ============================================================================
GRANT SELECT ON readiness_feature_weights TO PUBLIC;
GRANT SELECT ON readiness_snapshots TO PUBLIC;
GRANT SELECT ON v_features_all TO PUBLIC;
GRANT SELECT ON v_feature_gaps_current TO PUBLIC;
GRANT SELECT ON v_readiness_weakspots TO PUBLIC;
GRANT SELECT ON v_readiness_top_priorities TO PUBLIC;

-- ============================================================================
-- End v3.9 Universal Readiness Intelligence Framework
-- ============================================================================

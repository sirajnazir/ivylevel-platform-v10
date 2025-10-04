-- ============================================================================
-- v3.9 Universal Readiness Intelligence Framework (CORRECTED)
-- ============================================================================
-- Integrates with existing v_features_all view and readiness_snapshots table
-- ============================================================================

-- 1. Readiness Feature Weights (already created, skip if exists)
CREATE TABLE IF NOT EXISTS readiness_feature_weights (
  feature_key        TEXT PRIMARY KEY,
  domain             TEXT NOT NULL,
  target_value       NUMERIC,
  impact_coefficient NUMERIC NOT NULL,
  qualitative_weight NUMERIC DEFAULT 0,
  description        TEXT
);

CREATE INDEX IF NOT EXISTS idx_rfw_domain ON readiness_feature_weights(domain);

-- 2. Feature Gaps Current View (using correct column names from v_features_all)
CREATE OR REPLACE VIEW v_feature_gaps_current AS
SELECT
  f.student_id,
  f.domain,
  f.feature_key,
  f.feature_value AS current_value,
  w.target_value,
  (w.target_value - f.feature_value) AS gap_raw,
  w.impact_coefficient,
  (w.impact_coefficient * GREATEST(w.target_value - f.feature_value, 0)) AS gap_weighted,
  w.description
FROM v_features_all f
JOIN readiness_feature_weights w USING (feature_key)
WHERE f.feature_value IS NOT NULL;

COMMENT ON VIEW v_feature_gaps_current IS 'Current gap analysis between student features and Ivy+ benchmarks';

-- 3. Readiness Weakspots View
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

-- 4. Readiness Top Priorities View
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
  ROUND(g.gap_weighted * 1.5, 1) AS estimated_lift
FROM v_feature_gaps_current g
WHERE gap_weighted > 0
ORDER BY g.gap_weighted DESC;

COMMENT ON VIEW v_readiness_top_priorities IS 'Actionable priorities with why/what/when/how guidance';

-- 5. Sample Feature Weights (Initial Seed Data)
INSERT INTO readiness_feature_weights (feature_key, domain, target_value, impact_coefficient, description)
VALUES
  -- Testing
  ('testing.sat_total', 'testing', 1560, 0.25, 'SAT total score (Ivy competitive: 1560+)'),
  ('testing.act_composite', 'testing', 34, 0.25, 'ACT composite score (Ivy competitive: 34+)'),

  -- Academics
  ('academics.gpa_unweighted', 'academics', 3.95, 0.20, 'Unweighted GPA (Ivy competitive: 3.95+)'),
  ('academics.gpa_weighted', 'academics', 4.40, 0.05, 'Weighted GPA (lower coefficient to avoid double-count)'),
  ('academics.ap_count', 'academics', 8.00, 0.05, 'AP course count by graduation'),

  -- Awards (counts by tier)
  ('awards.international_count', 'awards', 2.00, 0.10, 'International-tier distinctions'),
  ('awards.national_count', 'awards', 6.00, 0.20, 'National-tier distinctions'),
  ('awards.regional_count', 'awards', 3.00, 0.05, 'Regional-tier distinctions'),

  -- ECs (scaling + leadership)
  ('ecs.leadership_roles', 'ecs', 5.00, 0.07, 'Leadership positions'),
  ('ecs.scale_signals', 'ecs', 30.00, 0.08, 'Scaled EC indicators (users, funds, cities, outputs)'),

  -- Programs
  ('programs.acceptances', 'programs', 2.00, 0.05, 'Admits to selective programs aligned to narrative'),

  -- Narrative (placeholder for now)
  ('narrative.essay_ready_pct', 'narrative', 100.0, 0.05, 'Essay completion/quality readiness %')

ON CONFLICT (feature_key) DO UPDATE SET
  target_value = EXCLUDED.target_value,
  impact_coefficient = EXCLUDED.impact_coefficient,
  description = EXCLUDED.description;

-- 6. Grant permissions
GRANT SELECT ON readiness_feature_weights TO PUBLIC;
GRANT SELECT ON v_feature_gaps_current TO PUBLIC;
GRANT SELECT ON v_readiness_weakspots TO PUBLIC;
GRANT SELECT ON v_readiness_top_priorities TO PUBLIC;

-- ============================================================================
-- End v3.9 Universal Readiness Intelligence Framework (CORRECTED)
-- ============================================================================

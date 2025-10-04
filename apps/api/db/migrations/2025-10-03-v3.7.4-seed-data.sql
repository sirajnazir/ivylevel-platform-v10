-- v3.7.4 Universal Readiness: Seed Data
-- Populates feature definitions, factor mappings, action definitions, and effect models

-- ========================================
-- 1. FEATURE DEFINITIONS
-- ========================================
INSERT INTO feature_defs (rubric_id, feature_key, feature_name, feature_description, domain, feature_unit, feature_min, feature_max)
VALUES
  -- Testing
  ('ivyplus_v1', 'sat_composite', 'SAT Composite Score', 'Total SAT score (400-1600 scale)', 'testing', 'score', 400, 1600),
  ('ivyplus_v1', 'act_composite', 'ACT Composite Score', 'Total ACT score (1-36 scale)', 'testing', 'score', 1, 36),

  -- Awards
  ('ivyplus_v1', 'national_awards_count', 'National Awards', 'Count of national-level awards won or finalist', 'awards', 'count', 0, 20),
  ('ivyplus_v1', 'regional_awards_count', 'Regional Awards', 'Count of regional-level awards won or finalist', 'awards', 'count', 0, 20),
  ('ivyplus_v1', 'international_awards_count', 'International Awards', 'Count of international-level awards won or finalist', 'awards', 'count', 0, 10),

  -- ECs
  ('ivyplus_v1', 'leadership_roles_count', 'Leadership Roles', 'Count of leadership positions (president, founder, captain, etc.)', 'ecs', 'count', 0, 15),
  ('ivyplus_v1', 'scale_signal_ecs_count', 'Scale Signal ECs', 'Count of ECs with significant scale (10+ hrs/wk, 40+ wks/yr, fundraising, team management)', 'ecs', 'count', 0, 10),

  -- Narrative
  ('ivyplus_v1', 'essay_completeness_pct', 'Essay Completeness', 'Percentage of required essays completed (>100 words)', 'narrative', 'percent', 0, 100),
  ('ivyplus_v1', 'personal_statement_word_count', 'Personal Statement Word Count', 'Word count of main personal statement', 'narrative', 'words', 0, 1000),

  -- Academics
  ('ivyplus_v1', 'gpa_unweighted', 'Unweighted GPA', 'Cumulative unweighted GPA (0-4.0 scale)', 'academics', 'gpa', 0, 4.0),
  ('ivyplus_v1', 'gpa_weighted', 'Weighted GPA', 'Cumulative weighted GPA (honors/AP boost)', 'academics', 'gpa', 0, 5.0),
  ('ivyplus_v1', 'ap_courses_count', 'AP Courses', 'Count of AP courses taken', 'academics', 'count', 0, 20),

  -- Programs
  ('ivyplus_v1', 'acceptances_count', 'Summer Program Acceptances', 'Count of competitive summer program acceptances', 'programs', 'count', 0, 10),
  ('ivyplus_v1', 'tier1_acceptances_count', 'Tier 1 Program Acceptances', 'Count of Tier 1 (most selective) program acceptances', 'programs', 'count', 0, 5)
ON CONFLICT (rubric_id, feature_key) DO UPDATE SET
  feature_name = EXCLUDED.feature_name,
  feature_description = EXCLUDED.feature_description,
  domain = EXCLUDED.domain,
  feature_unit = EXCLUDED.feature_unit,
  feature_min = EXCLUDED.feature_min,
  feature_max = EXCLUDED.feature_max;

-- ========================================
-- 2. FACTOR-FEATURE MAP (Features → Factors)
-- ========================================
INSERT INTO factor_feature_map (rubric_id, factor_key, feature_key, feature_weight, feature_normalizer, feature_cap)
VALUES
  -- ACADEMIC EXCELLENCE (weight: 25/100)
  ('ivyplus_v1', 'academic_excellence', 'gpa_unweighted', 6.0, 4.0, 6.0),      -- 6 pts max (GPA/4.0 * 6)
  ('ivyplus_v1', 'academic_excellence', 'gpa_weighted', 4.0, 5.0, 4.0),        -- 4 pts max (GPA/5.0 * 4)
  ('ivyplus_v1', 'academic_excellence', 'ap_courses_count', 1.0, 1.0, 10.0),   -- 1 pt per AP, cap at 10
  ('ivyplus_v1', 'academic_excellence', 'sat_composite', 5.0, 1600, 5.0),      -- 5 pts max (SAT/1600 * 5)

  -- DISTINCTION (weight: 30/100)
  ('ivyplus_v1', 'distinction', 'international_awards_count', 5.0, 1.0, 15.0), -- 5 pts each, cap 15
  ('ivyplus_v1', 'distinction', 'national_awards_count', 3.0, 1.0, 12.0),      -- 3 pts each, cap 12
  ('ivyplus_v1', 'distinction', 'regional_awards_count', 1.0, 1.0, 3.0),       -- 1 pt each, cap 3

  -- LEADERSHIP (weight: 20/100)
  ('ivyplus_v1', 'leadership', 'leadership_roles_count', 2.5, 1.0, 15.0),      -- 2.5 pts each, cap 15
  ('ivyplus_v1', 'leadership', 'scale_signal_ecs_count', 1.0, 1.0, 5.0),       -- 1 pt each, cap 5

  -- SUMMER PROGRAMS (weight: 15/100)
  ('ivyplus_v1', 'summer_programs', 'tier1_acceptances_count', 5.0, 1.0, 10.0),-- 5 pts each, cap 10
  ('ivyplus_v1', 'summer_programs', 'acceptances_count', 1.0, 1.0, 5.0),       -- 1 pt each, cap 5

  -- NARRATIVE STRENGTH (weight: 10/100)
  ('ivyplus_v1', 'narrative_strength', 'essay_completeness_pct', 0.05, 1.0, 5.0), -- 0.05 per %, cap 5 (100% = 5 pts)
  ('ivyplus_v1', 'narrative_strength', 'personal_statement_word_count', 0.005, 1.0, 5.0) -- 0.005 per word, cap 5 (1000 words = 5 pts)
ON CONFLICT (rubric_id, factor_key, feature_key) DO UPDATE SET
  feature_weight = EXCLUDED.feature_weight,
  feature_normalizer = EXCLUDED.feature_normalizer,
  feature_cap = EXCLUDED.feature_cap;

-- ========================================
-- 3. ACTION DEFINITIONS
-- ========================================
INSERT INTO action_defs (rubric_id, action_key, action_name, action_description, action_params_schema)
VALUES
  ('ivyplus_v1', 'raise_sat_to', 'Raise SAT to Target', 'Simulate raising SAT composite score to a specific value',
   '{"type": "object", "properties": {"target_score": {"type": "number", "minimum": 400, "maximum": 1600}}, "required": ["target_score"]}'::JSONB),

  ('ivyplus_v1', 'win_award_tier', 'Win Award at Tier', 'Simulate winning an award at a specific tier (Regional/National/International)',
   '{"type": "object", "properties": {"tier": {"type": "string", "enum": ["Regional", "National", "International"]}}, "required": ["tier"]}'::JSONB),

  ('ivyplus_v1', 'gain_leadership', 'Gain Leadership Role', 'Simulate gaining a new leadership position',
   '{"type": "object", "properties": {"with_scale": {"type": "boolean", "description": "Whether the role has scale signals"}}, "required": ["with_scale"]}'::JSONB),

  ('ivyplus_v1', 'complete_essays', 'Complete Essays', 'Simulate completing all required essays',
   '{"type": "object", "properties": {"count": {"type": "number", "minimum": 1}}, "required": ["count"]}'::JSONB),

  ('ivyplus_v1', 'get_into_tier1_program', 'Get into Tier 1 Program', 'Simulate acceptance to a Tier 1 summer program',
   '{"type": "object", "properties": {}, "required": []}'::JSONB),

  ('ivyplus_v1', 'raise_gpa_to', 'Raise GPA to Target', 'Simulate raising unweighted GPA to a specific value',
   '{"type": "object", "properties": {"target_gpa": {"type": "number", "minimum": 0, "maximum": 4.0}}, "required": ["target_gpa"]}'::JSONB)
ON CONFLICT (rubric_id, action_key) DO UPDATE SET
  action_name = EXCLUDED.action_name,
  action_description = EXCLUDED.action_description,
  action_params_schema = EXCLUDED.action_params_schema;

-- ========================================
-- 4. ACTION-FEATURE EFFECTS
-- ========================================
INSERT INTO action_feature_effects (action_key, feature_key, effect_type, effect_magnitude)
VALUES
  -- raise_sat_to: SET sat_composite to param value
  ('raise_sat_to', 'sat_composite', 'SET', 0),  -- magnitude ignored for SET (uses param)

  -- win_award_tier: ADD 1 to the appropriate tier count
  ('win_award_tier', 'regional_awards_count', 'ADD', 1),
  ('win_award_tier', 'national_awards_count', 'ADD', 1),
  ('win_award_tier', 'international_awards_count', 'ADD', 1),

  -- gain_leadership: ADD 1 to leadership_roles, optionally +1 to scale_signal_ecs
  ('gain_leadership', 'leadership_roles_count', 'ADD', 1),
  ('gain_leadership', 'scale_signal_ecs_count', 'ADD', 1),

  -- complete_essays: SET essay_completeness_pct to 100
  ('complete_essays', 'essay_completeness_pct', 'SET', 100),
  ('complete_essays', 'personal_statement_word_count', 'MAX', 650),

  -- get_into_tier1_program: ADD 1 to tier1_acceptances_count and acceptances_count
  ('get_into_tier1_program', 'tier1_acceptances_count', 'ADD', 1),
  ('get_into_tier1_program', 'acceptances_count', 'ADD', 1),

  -- raise_gpa_to: SET gpa_unweighted to param value
  ('raise_gpa_to', 'gpa_unweighted', 'SET', 0)  -- magnitude ignored for SET (uses param)
ON CONFLICT (action_key, feature_key) DO UPDATE SET
  effect_type = EXCLUDED.effect_type,
  effect_magnitude = EXCLUDED.effect_magnitude;

-- ========================================
-- 5. VALIDATION QUERIES
-- ========================================
-- Uncomment to run validation after migration

-- SELECT 'Feature Defs Count' AS check, COUNT(*) AS result FROM feature_defs WHERE rubric_id = 'ivyplus_v1';
-- SELECT 'Factor-Feature Map Count' AS check, COUNT(*) AS result FROM factor_feature_map WHERE rubric_id = 'ivyplus_v1';
-- SELECT 'Action Defs Count' AS check, COUNT(*) AS result FROM action_defs WHERE rubric_id = 'ivyplus_v1';
-- SELECT 'Action Effects Count' AS check, COUNT(*) AS result FROM action_feature_effects;

-- SELECT 'Factor Score Sum' AS check, SUM(factor_max_score) AS result FROM factor_defs WHERE rubric_id = 'ivyplus_v1';
-- Expected: 100 (25 + 30 + 20 + 15 + 10)

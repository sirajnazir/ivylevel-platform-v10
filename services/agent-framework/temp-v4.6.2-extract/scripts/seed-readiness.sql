-- ============================================================================
-- Huda-Specific Feature Weights Seed (v3.9)
-- ============================================================================
-- Purpose: Seed Huda's actual feature values for readiness intelligence
-- Based on: Huda's complete profile data from gameplan + commonapp
-- ============================================================================

-- 1. Seed Huda-Specific EC Feature Weights
-- ============================================================================
INSERT INTO readiness_feature_weights (feature_key, domain, target_value, impact_coefficient, description)
VALUES
  -- Empowering AI EC
  ('ec_users_empowering_ai', 'ecs', 200, 0.15, 'Empowering AI user reach (target: 200+)'),
  ('ec_funding_empowering_ai', 'ecs', 5000, 0.10, 'Empowering AI funding (target: $5k+)'),

  -- Folklift EC
  ('ec_users_folklift', 'ecs', 500, 0.12, 'Folklift user reach (target: 500+)'),
  ('ec_funding_folklift', 'ecs', 10000, 0.12, 'Folklift funding (target: $10k+)'),

  -- Synthoria EC
  ('ec_users_synthoria', 'ecs', 5000, 0.18, 'Synthoria user reach (target: 5k+)'),

  -- Filmmaker's Club EC
  ('ec_hours_filmmakers_club', 'ecs', 12, 0.08, 'Filmmaker\'s Club hours/week (target: 12+)')

ON CONFLICT (feature_key) DO UPDATE SET
  target_value = EXCLUDED.target_value,
  impact_coefficient = EXCLUDED.impact_coefficient,
  description = EXCLUDED.description;

-- 2. Seed Huda's Current Feature Values (as of Oct 2024)
-- ============================================================================
-- Note: This data is for testing/validation. In production, features will be
-- dynamically pulled from kb_items, facts_canonical, outcomes, etc.

-- Create a temporary snapshot for Huda (as of Oct 2024)
INSERT INTO readiness_snapshots (student_id, as_of, ivyready_score, top_drivers, weakspots, next_actions)
VALUES (
  'huda-2025',
  '2024-10-04',
  89.0,
  '{
    "ecs": 0.88,
    "academics": 0.92,
    "narrative": 0.85
  }'::jsonb,
  '{
    "awards": "Only 1 national award (target: 2+)",
    "ec_scaling": "Empowering AI at 85 users (target: 200+)",
    "narrative_depth": "Essays need stronger advocacy focus"
  }'::jsonb,
  '[
    {"action": "Submit NCWIT National + Regeneron", "lift": 5.0},
    {"action": "Scale Empowering AI to 200 users", "lift": 1.8},
    {"action": "Refine essay advocacy theme", "lift": 1.5}
  ]'::jsonb
)
ON CONFLICT (student_id, as_of) DO UPDATE SET
  ivyready_score = EXCLUDED.ivyready_score,
  top_drivers = EXCLUDED.top_drivers,
  weakspots = EXCLUDED.weakspots,
  next_actions = EXCLUDED.next_actions;

-- 3. Sample Historical Snapshots (for progression tracking)
-- ============================================================================
INSERT INTO readiness_snapshots (student_id, as_of, ivyready_score, top_drivers, weakspots, next_actions)
VALUES
  (
    'huda-2025',
    '2024-09-01',
    85.0,
    '{
      "ecs": 0.82,
      "academics": 0.90,
      "narrative": 0.80
    }'::jsonb,
    '{
      "awards": "No national awards yet",
      "ec_scaling": "Empowering AI at 50 users",
      "testing": "SAT 1440 (target: 1500+)"
    }'::jsonb,
    '[
      {"action": "Retake SAT for 1500+", "lift": 3.0},
      {"action": "Apply for national awards", "lift": 5.0},
      {"action": "Grow Empowering AI user base", "lift": 2.0}
    ]'::jsonb
  ),
  (
    'huda-2025',
    '2024-08-01',
    82.0,
    '{
      "ecs": 0.78,
      "academics": 0.88,
      "narrative": 0.75
    }'::jsonb,
    '{
      "awards": "No national awards",
      "ec_scaling": "Limited user reach across ECs",
      "testing": "SAT 1380 (needs retake)"
    }'::jsonb,
    '[
      {"action": "Prep for SAT retake", "lift": 4.0},
      {"action": "Research national awards", "lift": 3.0},
      {"action": "Set EC growth metrics", "lift": 2.0}
    ]'::jsonb
  )
ON CONFLICT (student_id, as_of) DO UPDATE SET
  ivyready_score = EXCLUDED.ivyready_score,
  top_drivers = EXCLUDED.top_drivers,
  weakspots = EXCLUDED.weakspots,
  next_actions = EXCLUDED.next_actions;

-- 4. Validation Query (to test readiness intelligence views)
-- ============================================================================
-- Run this to verify the data is correctly seeded:
/*
SELECT * FROM v_readiness_weakspots WHERE student_id = 'huda-2025' ORDER BY rank LIMIT 3;
SELECT * FROM v_readiness_top_priorities WHERE student_id = 'huda-2025' ORDER BY gap_weighted DESC LIMIT 5;
SELECT * FROM readiness_snapshots WHERE student_id = 'huda-2025' ORDER BY as_of DESC;
*/

-- ============================================================================
-- End Huda-Specific Feature Weights Seed
-- ============================================================================

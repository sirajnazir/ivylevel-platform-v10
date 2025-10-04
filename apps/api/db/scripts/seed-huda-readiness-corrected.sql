-- ============================================================================
-- Huda-Specific Readiness Seed Data (v3.9 CORRECTED)
-- ============================================================================
-- Uses existing readiness_snapshots table structure with snapshot_name
-- ============================================================================

-- 1. Huda-Specific EC Feature Weights
INSERT INTO readiness_feature_weights (feature_key, domain, target_value, impact_coefficient, description)
VALUES
  -- Empowering AI EC
  ('ecs.empowering_ai_users', 'ecs', 200, 0.15, 'Empowering AI user reach (target: 200+)'),
  ('ecs.empowering_ai_funding', 'ecs', 5000, 0.10, 'Empowering AI funding (target: $5k+)'),

  -- Folklift EC
  ('ecs.folklift_users', 'ecs', 500, 0.12, 'Folklift user reach (target: 500+)'),
  ('ecs.folklift_funding', 'ecs', 10000, 0.12, 'Folklift funding (target: $10k+)'),

  -- Synthoria EC
  ('ecs.synthoria_users', 'ecs', 5000, 0.18, 'Synthoria user reach (target: 5k+)'),

  -- Filmmaker's Club EC
  ('ecs.filmmakers_club_hours', 'ecs', 12, 0.08, 'Filmmakers Club hours/week (target: 12+)')

ON CONFLICT (feature_key) DO UPDATE SET
  target_value = EXCLUDED.target_value,
  impact_coefficient = EXCLUDED.impact_coefficient,
  description = EXCLUDED.description;

-- 2. Historical Readiness Snapshots for Huda (using existing table structure)
-- Assessment snapshot (June 2023)
INSERT INTO readiness_snapshots (student_id, snapshot_name, ivy_ready_score, features_json)
VALUES (
  'huda-2025',
  'assessment',
  69.40,
  '{
    "top_drivers": {"ecs": 0.72, "awards": 0.55, "testing": 0.65, "academics": 0.75, "narrative": 0.70, "socio_context": 0.65},
    "weakspots": [
      {"feature_key": "awards.national_count", "gap_weighted": 4.8, "description": "Missing national awards"},
      {"feature_key": "academics.ap_count", "gap_weighted": 1.5, "description": "Need 3 more AP courses"}
    ],
    "next_actions": [
      {"action": "Target NCWIT National + Games for Change", "lift": 5.0, "domain": "awards"},
      {"action": "Add 3 APs", "lift": 1.0, "domain": "academics"}
    ]
  }'::jsonb
)
ON CONFLICT DO NOTHING;

-- Midpoint snapshot (September 2024)
INSERT INTO readiness_snapshots (student_id, snapshot_name, ivy_ready_score, features_json)
VALUES (
  'huda-2025',
  'midpoint',
  85.00,
  '{
    "top_drivers": {"ecs": 0.82, "awards": 0.75, "testing": 0.90, "academics": 0.88, "narrative": 0.85, "socio_context": 0.68},
    "weakspots": [
      {"feature_key": "awards.national_count", "gap_weighted": 2.0, "description": "Still need 1-2 more national awards"},
      {"feature_key": "ecs.empowering_ai_users", "gap_weighted": 1.5, "description": "Empowering AI at 85 users (target: 200+)"}
    ],
    "next_actions": [
      {"action": "Submit NCWIT National + Regeneron", "lift": 3.0, "domain": "awards"},
      {"action": "Scale Empowering AI to 200 users", "lift": 1.8, "domain": "ecs"}
    ]
  }'::jsonb
)
ON CONFLICT DO NOTHING;

-- Final submit snapshot (October 2024)
INSERT INTO readiness_snapshots (student_id, snapshot_name, ivy_ready_score, features_json)
VALUES (
  'huda-2025',
  'final_submit',
  90.60,
  '{
    "top_drivers": {"ecs": 0.92, "awards": 0.88, "testing": 0.96, "academics": 0.90, "narrative": 0.94, "socio_context": 0.70},
    "weakspots": [],
    "next_actions": []
  }'::jsonb
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Validation Queries
-- ============================================================================
-- Run these to verify the data:
/*
-- Check weakspots
SELECT * FROM v_readiness_weakspots WHERE student_id = 'huda-2025' ORDER BY rank LIMIT 3;

-- Check top priorities
SELECT * FROM v_readiness_top_priorities WHERE student_id = 'huda-2025' ORDER BY gap_weighted DESC LIMIT 5;

-- Check progression snapshots
SELECT student_id, snapshot_name, ivy_ready_score, created_at
FROM readiness_snapshots
WHERE student_id = 'huda-2025'
ORDER BY created_at;
*/

-- ============================================================================
-- End Huda Readiness Seed Data
-- ============================================================================

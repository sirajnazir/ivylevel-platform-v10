-- =============================================================================
-- OUTCOMES TABLE EXTENSION - v10.6
-- Add EC Milestone Domain for Activity Progression Outcomes
-- =============================================================================
-- Purpose: Track EC-specific outcomes and milestones (not just awards/programs/colleges)
-- Scope: Extends existing outcomes table with new 'ec_milestone' domain
-- Examples: "Reached 5k students", "Secured first partnership", "Launched product"
-- =============================================================================
-- NOTE: This is ADDITIVE - existing award/program/college outcomes unchanged
-- =============================================================================

-- No schema change needed - outcomes table already exists
-- We're just documenting the new domain value and adding helper views

-- =============================================================================
-- USAGE: ec_milestone domain in outcomes table
-- =============================================================================
--
-- INSERT INTO outcomes (student_id, domain, chip_id, source_id, metadata)
-- VALUES (
--   'huda-2025',
--   'ec_milestone',                    -- NEW domain value
--   'E001',                            -- Links to kb_items chip_id
--   'SRC-SNAPSHOT-2024-06-15',
--   '{
--     "milestone": "reached_5k_students",
--     "date": "2024-06-15",
--     "activity_name": "Empowering AI",
--     "metric_type": "scale",
--     "metric_name": "students_reached",
--     "value": 5000,
--     "context": "Reached 5,000 students through AI education workshops"
--   }'::jsonb
-- );

-- =============================================================================
-- HELPER VIEWS FOR EC MILESTONES
-- =============================================================================

-- View: v_ec_milestones
-- Purpose: Filter outcomes table to show only EC milestones
CREATE OR REPLACE VIEW v_ec_milestones AS
SELECT
  student_id,
  chip_id,
  source_id,
  metadata->>'milestone' AS milestone,
  (metadata->>'date')::date AS milestone_date,
  metadata->>'activity_name' AS activity_name,
  metadata->>'metric_type' AS metric_type,
  metadata->>'metric_name' AS metric_name,
  (metadata->>'value')::numeric AS value,
  metadata->>'context' AS context,
  metadata,
  created_at
FROM outcomes
WHERE domain = 'ec_milestone'
ORDER BY student_id, (metadata->>'date')::date;

-- View: v_ec_milestones_by_activity
-- Purpose: Group milestones by activity for summary queries
CREATE OR REPLACE VIEW v_ec_milestones_by_activity AS
SELECT
  student_id,
  chip_id,
  metadata->>'activity_name' AS activity_name,
  COUNT(*) AS milestone_count,
  ARRAY_AGG(metadata->>'milestone' ORDER BY (metadata->>'date')::date) AS milestones,
  MIN((metadata->>'date')::date) AS first_milestone,
  MAX((metadata->>'date')::date) AS latest_milestone
FROM outcomes
WHERE domain = 'ec_milestone'
GROUP BY student_id, chip_id, metadata->>'activity_name'
ORDER BY student_id, activity_name;

-- View: v_outcomes_extended
-- Purpose: Union of all outcome types (awards, programs, colleges, ec_milestones)
CREATE OR REPLACE VIEW v_outcomes_extended AS
-- Awards
SELECT
  student_id,
  'award' AS outcome_type,
  chip_id,
  award_name AS outcome_name,
  won_date AS outcome_date,
  tier AS outcome_detail,
  source_id,
  created_at
FROM outcomes
WHERE domain = 'award'

UNION ALL

-- Programs
SELECT
  student_id,
  'program' AS outcome_type,
  chip_id,
  program_name AS outcome_name,
  decision_date AS outcome_date,
  decision AS outcome_detail,
  source_id,
  created_at
FROM outcomes
WHERE domain = 'program'

UNION ALL

-- Colleges
SELECT
  student_id,
  'college' AS outcome_type,
  chip_id,
  college_name AS outcome_name,
  decision_date AS outcome_date,
  decision_type AS outcome_detail,
  source_id,
  created_at
FROM outcomes
WHERE domain = 'college'

UNION ALL

-- EC Milestones (NEW)
SELECT
  student_id,
  'ec_milestone' AS outcome_type,
  chip_id,
  metadata->>'activity_name' AS outcome_name,
  (metadata->>'date')::date AS outcome_date,
  metadata->>'milestone' AS outcome_detail,
  source_id,
  created_at
FROM outcomes
WHERE domain = 'ec_milestone'

ORDER BY student_id, outcome_date DESC, outcome_type;

COMMENT ON VIEW v_ec_milestones IS 'v10.6: EC-specific milestones from outcomes table (domain = ec_milestone)';
COMMENT ON VIEW v_ec_milestones_by_activity IS 'v10.6: EC milestones grouped by activity for summary queries';
COMMENT ON VIEW v_outcomes_extended IS 'v10.6: Unified view of all outcome types (awards, programs, colleges, ec_milestones)';

-- =============================================================================
-- SAMPLE DATA FOR DOCUMENTATION
-- =============================================================================
--
-- Examples of ec_milestone outcomes (for reference):
--
-- 1. Reached scale milestone:
-- INSERT INTO outcomes (student_id, domain, chip_id, source_id, metadata)
-- VALUES (
--   'huda-2025', 'ec_milestone', 'E001', 'SRC-SNAPSHOT-2024-06-15',
--   '{"milestone": "reached_5k_students", "date": "2024-06-15", "activity_name": "Empowering AI",
--     "metric_type": "scale", "metric_name": "students_reached", "value": 5000,
--     "context": "Reached 5,000 students through AI education workshops"}'::jsonb
-- );
--
-- 2. Funding milestone:
-- INSERT INTO outcomes (student_id, domain, chip_id, source_id, metadata)
-- VALUES (
--   'huda-2025', 'ec_milestone', 'E001', 'SRC-SNAPSHOT-2024-08-01',
--   '{"milestone": "raised_20k_funding", "date": "2024-08-01", "activity_name": "Empowering AI",
--     "metric_type": "financial", "metric_name": "funding_raised", "value": 20000,
--     "context": "Raised $20k in grants for AI education camps"}'::jsonb
-- );
--
-- 3. Partnership milestone:
-- INSERT INTO outcomes (student_id, domain, chip_id, source_id, metadata)
-- VALUES (
--   'huda-2025', 'ec_milestone', 'E002', 'SRC-SNAPSHOT-2024-05-15',
--   '{"milestone": "secured_first_partnership", "date": "2024-05-15", "activity_name": "Folklift",
--     "metric_type": "leadership", "metric_name": "partnerships", "value": 1,
--     "context": "Secured partnership with local cultural organization"}'::jsonb
-- );

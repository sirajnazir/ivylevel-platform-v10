-- Universal Enumerations: Awards, ECs, Narrative, Summer Programs
-- Additive, backward-compatible views for deterministic SQL-only enumeration queries
-- NO RAG for these queries - pure SQL with full provenance

-- =========================
-- Drop existing views first (to allow type changes)
-- =========================
DROP VIEW IF EXISTS v_programs_progression CASCADE;
DROP VIEW IF EXISTS v_programs_final CASCADE;
DROP VIEW IF EXISTS v_program_outcomes CASCADE;
DROP VIEW IF EXISTS v_programs_submitted CASCADE;
DROP VIEW IF EXISTS v_programs_initial CASCADE;
DROP VIEW IF EXISTS v_programs_all CASCADE;
DROP VIEW IF EXISTS v_narrative_initial CASCADE;
DROP VIEW IF EXISTS v_ecs_progression CASCADE;
DROP VIEW IF EXISTS v_ecs_final CASCADE;
DROP VIEW IF EXISTS v_ecs_initial CASCADE;
DROP VIEW IF EXISTS v_ecs_all CASCADE;
DROP VIEW IF EXISTS v_awards_progression CASCADE;
DROP VIEW IF EXISTS v_awards_won CASCADE;
DROP VIEW IF EXISTS v_awards_final_targets CASCADE;
DROP VIEW IF EXISTS v_awards_initial CASCADE;

-- =========================
-- Common helpers / indexes
-- =========================
CREATE INDEX IF NOT EXISTS idx_award_targets_sid_phase ON award_targets(student_id, phase);
CREATE INDEX IF NOT EXISTS idx_award_targets_asof      ON award_targets(student_id, as_of);
CREATE INDEX IF NOT EXISTS idx_kb_items_type_state     ON kb_items(item_type, tier1_state, outcome_date, event_date, submit_date);
CREATE INDEX IF NOT EXISTS idx_kb_items_by_student     ON kb_items(student_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_programs       ON outcomes(student_id, type, occurred_at);

-- =========================
-- AWARDS
-- =========================
-- 1) Initial/Final awards targets projected from award_targets
CREATE OR REPLACE VIEW v_awards_initial AS
SELECT student_id, award_label AS award_name, tier, rationale, as_of::date, source_id, id::text AS chip_id
FROM award_targets
WHERE phase = 'initial';

CREATE OR REPLACE VIEW v_awards_final_targets AS
SELECT student_id, award_label AS award_name, tier, rationale, as_of::date, source_id, id::text AS chip_id
FROM award_targets
WHERE phase = 'final';

-- 2) Award outcomes (actual wins) projected from outcomes
-- Convention: outcomes.type IN ('award') with details_json {"award_name":"...", "tier":"national|regional|school", ...}
CREATE OR REPLACE VIEW v_awards_won AS
SELECT
  student_id,
  COALESCE(details_json->>'award_name', details_json->>'title', '(award)') AS award_name,
  details_json->>'tier'     AS tier,
  occurred_at::date         AS won_date,
  source_id,
  outcome_id::text          AS chip_id
FROM outcomes
WHERE CAST(type AS TEXT) IN ('award');

-- 3) Award progression (target -> won)
CREATE OR REPLACE VIEW v_awards_progression AS
WITH t AS (
  SELECT student_id, award_label AS award_name, 'target'::text AS phase, as_of::date AS as_of,
         source_id, id::text AS chip_id, 'award_targets'::text AS chip_table
  FROM award_targets
),
w AS (
  SELECT student_id, COALESCE(details_json->>'award_name', details_json->>'title', '(award)') AS award_name,
         'won'::text AS phase, occurred_at::date AS as_of,
         source_id, outcome_id::text AS chip_id, 'outcomes'::text AS chip_table
  FROM outcomes
  WHERE CAST(type AS TEXT) IN ('award')
)
SELECT * FROM (
  SELECT * FROM t
  UNION ALL
  SELECT * FROM w
) u
ORDER BY student_id, award_name, as_of NULLS LAST;

-- =========================
-- ECS / ACTIVITIES (kb_items)
-- =========================
-- We treat Activities as kb_items rows with item_type IN ('ec','activity').
-- States: Planned|In Transit|Submitted|Outcome
CREATE OR REPLACE VIEW v_ecs_all AS
SELECT
  student_id,
  title_name            AS activity_name,
  subtype               AS category,                 -- e.g., Computer/Technology, Journalism
  tier1_state,
  tier2_substate,
  status_detail,
  key_metric_type, key_metric_value, key_metric_unit,
  event_date, submit_date, outcome_date,
  evidence_links,
  source_ref            AS source_id,
  confidence,
  item_id               AS chip_id
FROM kb_items
WHERE lower(item_type) IN ('ec','activity');

CREATE OR REPLACE VIEW v_ecs_initial AS
SELECT * FROM v_ecs_all WHERE tier1_state = 'Planned';

-- "Final EC list" is the set we **actually submitted** in applications or reached Outcome state
-- Prefer Outcome; else Submitted as the final snapshot
CREATE OR REPLACE VIEW v_ecs_final AS
SELECT * FROM v_ecs_all
WHERE tier1_state IN ('Submitted','Outcome')
ORDER BY COALESCE(outcome_date, submit_date) NULLS LAST, activity_name;

-- Longitudinal view: target -> submitted -> outcome
CREATE OR REPLACE VIEW v_ecs_progression AS
WITH tgt AS (
  SELECT student_id, activity_name, category, 'target'::text AS phase,
         COALESCE(event_date, submit_date, outcome_date)::date AS as_of,
         source_id, chip_id, 'kb_items'::text AS chip_table
  FROM v_ecs_all WHERE tier1_state = 'Planned'
),
sub AS (
  SELECT student_id, activity_name, category, 'submitted'::text AS phase,
         COALESCE(submit_date, event_date, outcome_date)::date AS as_of,
         source_id, chip_id, 'kb_items'::text AS chip_table
  FROM v_ecs_all WHERE tier1_state = 'Submitted'
),
outc AS (
  SELECT student_id, activity_name, category, 'outcome'::text AS phase,
         COALESCE(outcome_date, submit_date, event_date)::date AS as_of,
         source_id, chip_id, 'kb_items'::text AS chip_table
  FROM v_ecs_all WHERE tier1_state = 'Outcome'
)
SELECT * FROM (
  SELECT * FROM tgt
  UNION ALL
  SELECT * FROM sub
  UNION ALL
  SELECT * FROM outc
) u
ORDER BY student_id, activity_name, as_of NULLS LAST;

-- =========================
-- NARRATIVE (kb_items)
-- =========================
-- Store initial narrative in kb_items:
--   item_type='narrative', title_name='initial_narrative'
--   status_detail or key fields in details_json if you choose to add a json column later
CREATE OR REPLACE VIEW v_narrative_initial AS
SELECT
  student_id,
  title_name AS label,
  status_detail AS narrative_text,
  event_date AS as_of,
  source_ref AS source_id,
  item_id AS chip_id
FROM kb_items
WHERE lower(item_type) = 'narrative'
  AND lower(title_name) IN ('initial','initial_narrative','gameplan_narrative')
ORDER BY as_of NULLS LAST;

-- =========================
-- SUMMER PROGRAMS (Programs)
-- =========================
-- Programs are applications+decisions; targets and submissions live in kb_items; decisions in outcomes.
CREATE OR REPLACE VIEW v_programs_all AS
SELECT
  student_id,
  title_name          AS program_name,
  subtype             AS provider_or_track,
  tier1_state,
  tier2_substate,
  status_detail,
  key_metric_type, key_metric_value, key_metric_unit,
  event_date,
  submit_date,
  outcome_date,
  source_ref          AS source_id,
  confidence,
  item_id             AS chip_id
FROM kb_items
WHERE lower(item_type) IN ('program','summer_program');

CREATE OR REPLACE VIEW v_programs_initial AS
SELECT * FROM v_programs_all WHERE tier1_state = 'Planned';

CREATE OR REPLACE VIEW v_programs_submitted AS
SELECT * FROM v_programs_all WHERE tier1_state = 'Submitted' OR submit_date IS NOT NULL;

CREATE OR REPLACE VIEW v_program_outcomes AS
SELECT
  student_id,
  COALESCE(details_json->>'program_name', details_json->>'title', '(program)') AS program_name,
  details_json->>'provider'   AS provider,
  details_json->>'decision'   AS decision,     -- admit|waitlist|deny|defer
  details_json->>'session'    AS session,
  details_json->>'site'       AS site,
  (details_json->>'attending')::boolean AS attending,
  occurred_at::date           AS decision_date,
  source_id,
  CAST(type AS TEXT)          AS type,
  outcome_id::text            AS chip_id
FROM outcomes
WHERE CAST(type AS TEXT) IN ('program','program_application');

CREATE OR REPLACE VIEW v_programs_final AS
SELECT * FROM v_program_outcomes;

CREATE OR REPLACE VIEW v_programs_progression AS
WITH tgt AS (
  SELECT student_id, program_name, provider_or_track AS provider,
         'target'::text AS phase,
         COALESCE(event_date, submit_date, outcome_date)::date AS as_of,
         source_id, chip_id, 'kb_items'::text AS chip_table
  FROM v_programs_all
  WHERE tier1_state = 'Planned'
),
subm AS (
  SELECT student_id, program_name, provider_or_track AS provider,
         'submitted'::text AS phase,
         COALESCE(submit_date, event_date, outcome_date)::date AS as_of,
         source_id, chip_id, 'kb_items'::text AS chip_table
  FROM v_programs_all
  WHERE tier1_state = 'Submitted' OR submit_date IS NOT NULL
),
dec AS (
  SELECT student_id, program_name, provider,
         CASE WHEN decision IS NULL THEN 'outcome'
              ELSE decision END AS phase,
         decision_date AS as_of,
         source_id, chip_id, 'outcomes'::text AS chip_table
  FROM v_program_outcomes
)
SELECT * FROM (
  SELECT * FROM tgt
  UNION ALL
  SELECT * FROM subm
  UNION ALL
  SELECT * FROM dec
) u
ORDER BY student_id, program_name, as_of NULLS LAST;

-- =========================
-- Comments
-- =========================
COMMENT ON VIEW v_awards_initial IS 'Initial award targets from award_targets (phase=initial)';
COMMENT ON VIEW v_awards_won IS 'Actual awards won from outcomes table';
COMMENT ON VIEW v_awards_progression IS 'Timeline: targets → wins';
COMMENT ON VIEW v_ecs_all IS 'All ECs/Activities from kb_items';
COMMENT ON VIEW v_ecs_initial IS 'Initial EC targets (Planned state)';
COMMENT ON VIEW v_ecs_final IS 'Final ECs (Submitted/Outcome states)';
COMMENT ON VIEW v_ecs_progression IS 'Timeline: target → submitted → outcome';
COMMENT ON VIEW v_narrative_initial IS 'Initial narrative from kb_items';
COMMENT ON VIEW v_programs_all IS 'All summer programs from kb_items';
COMMENT ON VIEW v_programs_initial IS 'Initial program targets (Planned)';
COMMENT ON VIEW v_programs_submitted IS 'Programs submitted';
COMMENT ON VIEW v_program_outcomes IS 'Program decisions from outcomes';
COMMENT ON VIEW v_programs_final IS 'Final program decisions';
COMMENT ON VIEW v_programs_progression IS 'Timeline: target → submitted → decision';

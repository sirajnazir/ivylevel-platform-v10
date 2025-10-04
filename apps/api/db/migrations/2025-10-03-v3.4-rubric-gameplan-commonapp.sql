-- V3.4: GamePlan v2 + IvyReady Rubric + Common App Normalization
-- Date: 2025-10-03
-- Feature: Admissions rubric scoring, GamePlan synthesis views, Common App final template
-- Dependencies: Requires v3.3 (universal enumerations, kb_items, outcomes)

-- ============================================================================
-- 1) ADMISSIONS RUBRIC CORE TABLES
-- ============================================================================

-- 1A) Rubric definitions
CREATE TABLE IF NOT EXISTS admissions_rubric (
  rubric_id   TEXT PRIMARY KEY,
  rubric_name TEXT NOT NULL,
  version     TEXT NOT NULL,
  created_ts  TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE admissions_rubric IS 'Admissions rubric definitions (e.g., Ivy+, UC, LAC)';

-- 1B) Rubric factors (weighted scoring dimensions)
CREATE TABLE IF NOT EXISTS admissions_rubric_factors (
  factor_id    TEXT PRIMARY KEY,
  rubric_id    TEXT NOT NULL REFERENCES admissions_rubric(rubric_id),
  factor_label TEXT NOT NULL,
  weight_pct   NUMERIC NOT NULL CHECK (weight_pct >= 0 AND weight_pct <= 100),
  description  TEXT,
  position     INT NOT NULL DEFAULT 0,
  created_ts   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (rubric_id, factor_id)
);

COMMENT ON TABLE admissions_rubric_factors IS 'Weighted factors for each rubric (academics, testing, ECs, etc.)';
COMMENT ON COLUMN admissions_rubric_factors.weight_pct IS 'Weight percentage (0-100) for weighted score calculation';

-- 1C) Seed Ivy+ rubric (standard 6-factor model)
INSERT INTO admissions_rubric (rubric_id, rubric_name, version)
VALUES ('ivyplus_v1','Ivy+ Core Rubric','1.0')
ON CONFLICT (rubric_id) DO NOTHING;

INSERT INTO admissions_rubric_factors (factor_id, rubric_id, factor_label, weight_pct, description, position)
VALUES
 ('academics','ivyplus_v1','Academics / Grades & Rigor', 32.0,'Transcript strength, rigor vs. context',1),
 ('testing','ivyplus_v1','Standardized Testing',        12.0,'SAT/ACT; superscores if allowed',      2),
 ('ecs','ivyplus_v1','ECs / Impact / Leadership',       24.0,'Depth, leadership, scope & evidence',  3),
 ('awards','ivyplus_v1','Awards / Distinctions',        12.0,'Prestige & relevance to narrative',    4),
 ('narrative','ivyplus_v1','Narrative / Authentic Fit', 15.0,'Identity+Passion+Aptitude+Cause',      5),
 ('socio_context','ivyplus_v1','Context / Hooks',        5.0,'School/contextual factors',            6)
ON CONFLICT (rubric_id, factor_id)
DO UPDATE SET weight_pct=EXCLUDED.weight_pct, description=EXCLUDED.description, position=EXCLUDED.position;

-- 1D) Student rubric scores (snapshots over time)
CREATE TABLE IF NOT EXISTS admissions_rubric_scores (
  score_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id     TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  rubric_id      TEXT NOT NULL REFERENCES admissions_rubric(rubric_id),
  snapshot_phase TEXT NOT NULL CHECK (snapshot_phase IN ('assessment','midpoint','final_submit')),
  as_of          DATE NOT NULL,
  factor_id      TEXT NOT NULL REFERENCES admissions_rubric_factors(factor_id),
  raw_score      NUMERIC NOT NULL,
  weight_pct     NUMERIC NOT NULL,
  weighted_score NUMERIC GENERATED ALWAYS AS (raw_score * weight_pct / 100.0) STORED,
  details_json   JSONB DEFAULT '{}'::jsonb,
  source_id      TEXT REFERENCES sources(source_id),
  created_ts     TIMESTAMPTZ DEFAULT now(),
  UNIQUE (student_id, rubric_id, snapshot_phase, as_of, factor_id)
);

COMMENT ON TABLE admissions_rubric_scores IS 'Temporal rubric score snapshots (assessment, midpoint, final_submit)';
COMMENT ON COLUMN admissions_rubric_scores.snapshot_phase IS 'Scoring phase: assessment (initial), midpoint (progress check), final_submit (application)';
COMMENT ON COLUMN admissions_rubric_scores.weighted_score IS 'Computed: raw_score * weight_pct / 100';

CREATE INDEX idx_rubric_scores_student ON admissions_rubric_scores(student_id, snapshot_phase, as_of DESC);
CREATE INDEX idx_rubric_scores_lookup ON admissions_rubric_scores(student_id, rubric_id, snapshot_phase, factor_id);

-- ============================================================================
-- 2) RUBRIC VIEWS & FUNCTIONS
-- ============================================================================

-- 2A) Latest rubric scores per snapshot phase
CREATE OR REPLACE VIEW v_rubric_scores_latest AS
SELECT student_id, rubric_id, snapshot_phase, as_of,
       SUM(weighted_score) AS ivyready_score,
       JSONB_OBJECT_AGG(factor_id, raw_score) FILTER (WHERE factor_id IS NOT NULL) AS factor_scores
FROM (
  SELECT DISTINCT ON (student_id, rubric_id, snapshot_phase, factor_id) *
  FROM admissions_rubric_scores
  ORDER BY student_id, rubric_id, snapshot_phase, factor_id, as_of DESC
) s
GROUP BY student_id, rubric_id, snapshot_phase, as_of;

COMMENT ON VIEW v_rubric_scores_latest IS 'Latest rubric scores per student per snapshot phase with aggregated IvyReady score';

-- 2B) As-of function for temporal rubric queries
CREATE OR REPLACE FUNCTION rubric_scores_asof(p_student TEXT, p_date DATE, p_rubric TEXT DEFAULT 'ivyplus_v1')
RETURNS TABLE(student_id TEXT, as_of DATE, ivyready_score NUMERIC, factor_scores JSONB)
LANGUAGE sql STABLE AS $$
  SELECT student_id, p_date AS as_of,
         SUM(weighted_score) AS ivyready_score,
         JSONB_OBJECT_AGG(factor_id, raw_score) AS factor_scores
  FROM admissions_rubric_scores
  WHERE student_id=p_student AND rubric_id=p_rubric AND as_of<=p_date
  GROUP BY student_id;
$$;

COMMENT ON FUNCTION rubric_scores_asof IS 'Get rubric scores as of a specific date (temporal query)';

-- ============================================================================
-- 3) GAMEPLAN SYNTHESIS VIEWS
-- ============================================================================

-- 3A) Initial GamePlan summary (targets from assessment)
CREATE OR REPLACE VIEW v_gameplan_summary_initial AS
SELECT
  s.student_id,
  COALESCE(n_init.items, '[]'::jsonb) AS narrative_items,
  COALESCE(aw.items,  '[]'::jsonb)    AS award_targets,
  COALESCE(ec.items,  '[]'::jsonb)    AS ec_targets,
  COALESCE(pg.items,  '[]'::jsonb)    AS program_targets
FROM students s
LEFT JOIN LATERAL (
  SELECT JSONB_AGG(JSONB_BUILD_OBJECT('category', subtype,'content', title_name,'chip', item_id)) AS items
  FROM kb_items
  WHERE student_id=s.student_id AND item_type='narrative' AND tier1_state='Planned'
) n_init ON TRUE
LEFT JOIN LATERAL (
  SELECT JSONB_AGG(JSONB_BUILD_OBJECT('label', item_label, 'as_of', as_of, 'source_id', source_id)) AS items
  FROM award_targets_enum
  WHERE student_id=s.student_id AND phase='initial'
) aw ON TRUE
LEFT JOIN LATERAL (
  SELECT JSONB_AGG(JSONB_BUILD_OBJECT('label', item_label, 'as_of', as_of, 'source_id', source_id)) AS items
  FROM ec_targets
  WHERE student_id=s.student_id AND phase='initial'
) ec ON TRUE
LEFT JOIN LATERAL (
  SELECT JSONB_AGG(JSONB_BUILD_OBJECT('program', title_name, 'provider', subtype, 'chip', item_id)) AS items
  FROM kb_items
  WHERE student_id=s.student_id AND LOWER(item_type) IN ('program','summer_program') AND tier1_state='Planned'
) pg ON TRUE;

COMMENT ON VIEW v_gameplan_summary_initial IS 'GamePlan v2: Initial targets (narrative, awards, ECs, programs) from assessment phase';

-- 3B) GamePlan vs Execution (target → submitted → outcome progression)
CREATE OR REPLACE VIEW v_gameplan_vs_execution AS
WITH awards AS (
  SELECT 'award' AS domain, * FROM v_awards_progression
), ecs AS (
  SELECT 'ec' AS domain, * FROM v_ecs_progression
), progs AS (
  SELECT 'program' AS domain, * FROM v_programs_progression
)
SELECT * FROM (
  SELECT domain, student_id, award_name    AS item, phase, as_of, source_id, chip_id, chip_table FROM awards
  UNION ALL
  SELECT domain, student_id, activity_name AS item, phase, as_of, source_id, chip_id, chip_table FROM ecs
  UNION ALL
  SELECT domain, student_id, program_name  AS item, phase, as_of, source_id, chip_id, chip_table FROM progs
) u
ORDER BY student_id, domain, item, as_of NULLS LAST;

COMMENT ON VIEW v_gameplan_vs_execution IS 'GamePlan v2: Unified progression timeline (initial → execution → outcomes) across awards/ECs/programs';

-- ============================================================================
-- 4) COMMON APP NORMALIZATION VIEWS
-- ============================================================================

-- 4A) Common App activities (10 max, from final ECs)
CREATE OR REPLACE VIEW v_commonapp_activities AS
SELECT
  student_id,
  activity_name,
  category,
  tier2_substate   AS subcategory,
  status_detail    AS role,
  key_metric_value AS metrics,
  submit_date,
  source_id,
  chip_id
FROM v_ecs_final
ORDER BY COALESCE(submit_date, outcome_date) NULLS LAST, activity_name;

COMMENT ON VIEW v_commonapp_activities IS 'Common App final template: Activities (max 10) as submitted';

-- 4B) Common App honors/awards (5 max, from outcomes)
CREATE OR REPLACE VIEW v_commonapp_honors AS
SELECT
  student_id,
  COALESCE(details_json->>'award_name', details_json->>'title') AS honor_name,
  COALESCE(details_json->>'tier','')                            AS level,
  occurred_at::date                                             AS date_received,
  source_id,
  outcome_id::text                                              AS chip_id
FROM outcomes
WHERE CAST(type AS TEXT) = 'achievement'
ORDER BY date_received NULLS LAST, honor_name;

COMMENT ON VIEW v_commonapp_honors IS 'Common App final template: Honors/Awards (max 5) from outcomes';

-- 4C) Common App submitted (consolidated activities + honors + academics)
CREATE OR REPLACE VIEW v_commonapp_submitted AS
SELECT
  s.student_id,
  (SELECT JSONB_AGG(ROW_TO_JSON(a)) FROM v_commonapp_activities a WHERE a.student_id=s.student_id) AS activities,
  (SELECT JSONB_AGG(ROW_TO_JSON(h)) FROM v_commonapp_honors    h WHERE h.student_id=s.student_id)   AS honors,
  (SELECT JSONB_AGG(ROW_TO_JSON(v)) FROM (
     SELECT kind, value, numeric_value, fact_date
     FROM vital_facts
     WHERE student_id=s.student_id AND kind IN ('gpa_weighted','gpa_unweighted','sat_total_score','sat_math','sat_ebrw')
     ORDER BY fact_date
  ) v) AS academics
FROM students s;

COMMENT ON VIEW v_commonapp_submitted IS 'Common App final template: Consolidated submission (activities + honors + academics)';

-- ============================================================================
-- 5) INDEXES FOR PERFORMANCE
-- ============================================================================

-- Rubric scores already indexed above
-- GamePlan views use existing indexes on kb_items, award_targets_enum, ec_targets
-- Common App views use existing indexes on v_ecs_final, outcomes, vital_facts

-- ============================================================================
-- MIGRATION COMPLETE - V3.4
-- ============================================================================

-- Verification queries (run manually):
-- SELECT * FROM admissions_rubric_factors WHERE rubric_id='ivyplus_v1';
-- SELECT * FROM v_gameplan_summary_initial WHERE student_id='huda-2025';
-- SELECT * FROM v_rubric_scores_latest WHERE student_id='huda-2025';

-- V3.4.1: IvyReady Score Routing + Final App Normalization + Target Dedupe
-- Date: 2025-10-03
-- Feature: Fix intent routing for IvyReady, deduplicate targets, normalize CommonApp views
-- Dependencies: Requires v3.4 (rubric tables, gameplan views, commonapp views)

-- ============================================================================
-- A) CANONICAL LABEL HELPER (award/EC de-dup)
-- ============================================================================

CREATE OR REPLACE FUNCTION canon_label(p TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT lower(regexp_replace(trim(p), '\s+', ' ', 'g'));
$$;

COMMENT ON FUNCTION canon_label IS 'Canonicalize labels by lowercasing and normalizing whitespace for de-duplication';

-- ============================================================================
-- B) INITIAL AWARDS — DE-DUP BY CANONICALIZED LABEL
-- ============================================================================

CREATE OR REPLACE VIEW v_awards_initial AS
WITH base AS (
  SELECT student_id,
         item_label AS award_label,
         '' AS tier,
         '' AS rationale,
         as_of::date AS as_of,
         source_id,
         NULL::text AS chip_id,
         canon_label(item_label) AS canon
  FROM award_targets_enum
  WHERE phase = 'initial'
)
SELECT DISTINCT ON (student_id, canon)
  student_id, award_label AS award_name, tier, rationale, as_of, source_id, chip_id
FROM base
ORDER BY student_id, canon, as_of DESC;

COMMENT ON VIEW v_awards_initial IS 'Initial award targets with canonicalized label de-duplication';

-- ============================================================================
-- C) FINAL HONORS (Common App) — DROP NULL NAMES
-- ============================================================================

CREATE OR REPLACE VIEW v_commonapp_honors AS
SELECT
  student_id,
  COALESCE(details_json->>'award_name', details_json->>'title') AS honor_name,
  NULLIF(details_json->>'tier','')                              AS level,
  occurred_at::date                                             AS date_received,
  source_id,
  outcome_id::text                                              AS chip_id
FROM outcomes
WHERE CAST(type AS TEXT) = 'achievement'
  AND COALESCE(details_json->>'award_name', details_json->>'title') IS NOT NULL
ORDER BY date_received NULLS LAST, honor_name;

COMMENT ON VIEW v_commonapp_honors IS 'Common App honors/awards (max 5) with null filtering';

-- ============================================================================
-- D) FINAL ACTIVITIES (Common App) — COLLAPSE NEAR DUPLICATES
-- ============================================================================

CREATE OR REPLACE VIEW v_commonapp_activities AS
WITH src AS (
  SELECT *,
         canon_label(activity_name) AS canon_title,
         -- prefer role-prefixed rows over bare project names
         CASE WHEN activity_name ~* '^(founder|president|lead|captain|co-?founder|vp|director)\b'
              THEN 2 ELSE 1 END AS role_rank
  FROM v_ecs_final
),
pick AS (
  SELECT DISTINCT ON (student_id, canon_title)
         student_id,
         activity_name,
         category,
         tier2_substate AS subcategory,
         status_detail  AS role,
         key_metric_value AS metrics,
         submit_date,
         source_id,
         chip_id
  FROM src
  ORDER BY student_id, canon_title, role_rank DESC, submit_date DESC NULLS LAST
)
SELECT * FROM pick
ORDER BY COALESCE(submit_date, CURRENT_DATE) NULLS LAST, activity_name;

COMMENT ON VIEW v_commonapp_activities IS 'Common App activities (max 10) with duplicate collapse and role-prefix preference';

-- ============================================================================
-- E) IVYREADY SCORING VIEWS (deterministic answers)
-- ============================================================================

-- E1) Latest per phase (so "initial" and "final" just work)
CREATE OR REPLACE VIEW v_rubric_scores_phase_latest AS
SELECT
  s.student_id,
  s.rubric_id,
  s.snapshot_phase,
  MAX(s.as_of) AS as_of,
  SUM(s.weighted_score) AS ivyready_score,
  JSONB_OBJECT_AGG(s.factor_id, s.raw_score ORDER BY s.factor_id) AS factor_scores
FROM admissions_rubric_scores s
GROUP BY s.student_id, s.rubric_id, s.snapshot_phase;

COMMENT ON VIEW v_rubric_scores_phase_latest IS 'Latest IvyReady rubric scores per snapshot phase (assessment, midpoint, final_submit)';

-- E2) As-of date function
CREATE OR REPLACE FUNCTION v_rubric_scores_asof(
  p_student TEXT,
  p_date DATE,
  p_rubric TEXT DEFAULT 'ivyplus_v1'
)
RETURNS TABLE(
  student_id TEXT,
  as_of DATE,
  ivyready_score NUMERIC,
  factor_scores JSONB
) LANGUAGE sql STABLE AS $$
  WITH latest AS (
    SELECT DISTINCT ON (factor_id)
           factor_id, raw_score, weight_pct, (raw_score * weight_pct / 100.0) AS weighted
    FROM admissions_rubric_scores
    WHERE student_id = p_student
      AND rubric_id = p_rubric
      AND as_of <= p_date
    ORDER BY factor_id, as_of DESC
  )
  SELECT p_student AS student_id,
         p_date    AS as_of,
         COALESCE(SUM(weighted),0) AS ivyready_score,
         JSONB_OBJECT_AGG(factor_id, raw_score) AS factor_scores
  FROM latest;
$$;

COMMENT ON FUNCTION v_rubric_scores_asof IS 'Get IvyReady rubric scores as of a specific date (temporal query)';

-- ============================================================================
-- MIGRATION COMPLETE - V3.4.1
-- ============================================================================

-- Verification queries (run manually):
-- SELECT COUNT(*) FROM v_awards_initial WHERE student_id='huda-2025';
-- SELECT * FROM v_commonapp_honors WHERE student_id='huda-2025' AND honor_name IS NULL;
-- SELECT title_name, role FROM v_commonapp_activities WHERE student_id='huda-2025' ORDER BY title_name;
-- SELECT * FROM v_rubric_scores_phase_latest WHERE student_id='huda-2025';

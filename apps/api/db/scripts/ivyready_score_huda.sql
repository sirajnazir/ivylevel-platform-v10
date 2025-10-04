-- v3.5: Deterministic IvyReady Scoring for huda-2025
-- Created: 2025-10-03
-- Purpose: Compute and UPSERT two snapshots (assessment + final_submit) using only existing DB data
-- Factors: academics, testing, ecs, awards, narrative, socio_context
-- Engine: SQL (deterministic, facts-first)

-- PARAMETERS
WITH params AS (
  SELECT 'huda-2025'::text AS sid, 'ivyplus_v1'::text AS rubric
),

-- DATES: assessment (from initial GP targets) + final_submit (derive from data)
dates AS (
  SELECT
    sid,
    -- initial game plan date (min as_of across award/ec targets; fallback to earliest source)
    COALESCE(
      (SELECT MIN(as_of) FROM award_targets WHERE student_id=sid AND phase='initial'),
      (SELECT MIN(as_of) FROM award_targets_enum WHERE student_id=sid AND phase='initial'),
      (SELECT date_trunc('day', MIN(created_ts))::date FROM sources WHERE student_id=sid)
    ) AS assessment_date,
    -- final submit derived: prefer explicit Common App submit source; else latest submitted/outcome signal
    COALESCE(
      (SELECT date_trunc('day', MAX(submit_date))::date FROM kb_items WHERE student_id=sid AND lower(item_type) IN ('application','commonapp') AND tier1_state IN ('Submitted','Outcome')),
      (SELECT date_trunc('day', MAX(occurred_at))::date FROM outcomes WHERE student_id=sid),
      (SELECT date_trunc('day', MAX(COALESCE(outcome_date, submit_date, event_date)))::date FROM kb_items WHERE student_id=sid),
      (SELECT date_trunc('day', MAX(as_of))::date FROM sat_timeline_enum WHERE student_id=sid)
    ) AS final_submit_date
  FROM params
),

-- SAT latest (0..100)
testing AS (
  SELECT p.sid,
         CASE
           WHEN s.numeric_value IS NULL THEN NULL
           ELSE LEAST(100.0, GREATEST(0.0, (s.numeric_value - 400.0) * (100.0 - 0.0) / (1600.0 - 400.0)))
         END::numeric AS testing_score,                -- linear 400→0, 1600→100
         s.numeric_value AS sat_total, s.as_of::date AS sat_asof, s.source_id AS sat_source
  FROM params p
  LEFT JOIN LATERAL (
    SELECT DISTINCT ON (student_id) *
    FROM v_sat_enum_latest
    WHERE student_id=p.sid
    ORDER BY student_id, as_of DESC, numeric_value DESC
  ) s ON TRUE
),

-- Academics (GPA, rigor) → 0..100
academics AS (
  SELECT p.sid,
         -- prefer unweighted if present; else weighted; else infer modest neutral
         COALESCE(
           (SELECT (value::numeric/4.0)*92.0 FROM vital_facts WHERE student_id=p.sid AND kind='gpa_unweighted' ORDER BY fact_date DESC LIMIT 1),
           (SELECT LEAST(100.0, (value::numeric/5.0)*95.0) FROM vital_facts WHERE student_id=p.sid AND kind='gpa_weighted' ORDER BY fact_date DESC LIMIT 1),
           78.0
         )::numeric AS academics_score
  FROM params p
),

-- ECs score: leadership + count (final submitted only) → 0..100
ecs AS (
  WITH final_ecs AS (
    SELECT *
    FROM v_ecs_final
    WHERE student_id=(SELECT sid FROM params)
  )
  SELECT
    (SELECT sid FROM params) AS sid,
    COALESCE(LEAST(
      40.0 +                        -- base for having final ECs
      5.0 * (SELECT COUNT(*) FROM final_ecs WHERE lower(status_detail) ~ '(president|founder|lead|captain|vp)') +
      2.0 * (SELECT COUNT(*) FROM final_ecs), 100.0
    ), 30.0)::numeric AS ecs_score,
    (SELECT COUNT(*) FROM final_ecs) AS ec_count
  FROM params p
),

-- Awards score: tiered weights (final won only) → 0..100
awards AS (
  WITH won AS (
    SELECT *
    FROM v_awards_won
    WHERE student_id=(SELECT sid FROM params)
  )
  SELECT
    (SELECT sid FROM params) AS sid,
    COALESCE(LEAST(
      15.0 * (SELECT COUNT(*) FROM won WHERE lower(tier) IN ('international','global')) +
      12.0 * (SELECT COUNT(*) FROM won WHERE lower(tier)='national') +
       6.0 * (SELECT COUNT(*) FROM won WHERE lower(tier)='regional') +
       3.0 * (SELECT COUNT(*) FROM won WHERE lower(tier) ~ 'school|district|cte|local')
    , 100.0), 0.0)::numeric AS awards_score,
    (SELECT COUNT(*) FROM won) AS awards_count
  FROM params p
),

-- Narrative score: completeness of 5 parts (initial & final) → 0..100 using final
narrative AS (
  WITH nf AS (
    SELECT COUNT(*) AS parts
    FROM v_narrative_final
    WHERE student_id=(SELECT sid FROM params)
  ), ni AS (
    SELECT COUNT(*) AS parts
    FROM v_narrative_initial
    WHERE student_id=(SELECT sid FROM params)
  )
  SELECT
    (SELECT sid FROM params) AS sid,
    CASE WHEN (SELECT parts FROM nf) >= 5 THEN 100.0
         WHEN (SELECT parts FROM nf) >= 3 THEN 80.0
         WHEN (SELECT parts FROM ni) >= 3 THEN 65.0
         ELSE 50.0
    END::numeric AS narrative_score,
    COALESCE((SELECT parts FROM nf),(SELECT parts FROM ni),0) AS parts_present
  FROM params p
),

-- Socio-context: neutral (configurable later) → 0..100
socio AS (
  SELECT (SELECT sid FROM params) AS sid, 65.0::numeric AS socio_score
),

-- Join factors with rubric weights
weighted AS (
  SELECT
    p.sid, r.rubric_id,
    a.academics_score, t.testing_score, e.ecs_score, w.awards_score, n.narrative_score, s.socio_score,
    rf_ac.weight_pct AS w_academics,
    rf_te.weight_pct AS w_testing,
    rf_ec.weight_pct AS w_ecs,
    rf_aw.weight_pct AS w_awards,
    rf_na.weight_pct AS w_narrative,
    rf_so.weight_pct AS w_socio
  FROM params p
  JOIN admissions_rubric r ON r.rubric_id=p.rubric
  LEFT JOIN academics  a ON a.sid=p.sid
  LEFT JOIN testing    t ON t.sid=p.sid
  LEFT JOIN ecs        e ON e.sid=p.sid
  LEFT JOIN awards     w ON w.sid=p.sid
  LEFT JOIN narrative  n ON n.sid=p.sid
  LEFT JOIN socio      s ON s.sid=p.sid
  LEFT JOIN admissions_rubric_factors rf_ac ON rf_ac.rubric_id=r.rubric_id AND rf_ac.factor_id='academics'
  LEFT JOIN admissions_rubric_factors rf_te ON rf_te.rubric_id=r.rubric_id AND rf_te.factor_id='testing'
  LEFT JOIN admissions_rubric_factors rf_ec ON rf_ec.rubric_id=r.rubric_id AND rf_ec.factor_id='ecs'
  LEFT JOIN admissions_rubric_factors rf_aw ON rf_aw.rubric_id=r.rubric_id AND rf_aw.factor_id='awards'
  LEFT JOIN admissions_rubric_factors rf_na ON rf_na.rubric_id=r.rubric_id AND rf_na.factor_id='narrative'
  LEFT JOIN admissions_rubric_factors rf_so ON rf_so.rubric_id=r.rubric_id AND rf_so.factor_id='socio_context'
),

scores AS (
  SELECT
    sid, rubric_id,
    academics_score, testing_score, ecs_score, awards_score, narrative_score, socio_score,
    (academics_score * w_academics/100.0 +
     COALESCE(testing_score,  0) * w_testing/100.0  +
     ecs_score       * w_ecs/100.0      +
     awards_score    * w_awards/100.0   +
     narrative_score * w_narrative/100.0+
     socio_score     * w_socio/100.0) AS overall_score
  FROM weighted
),

-- SNAPSHOT INSERT/UPSERT: assessment + final_submit
ins_assessment AS (
  INSERT INTO ivyready_snapshots (student_id, rubric_id, snapshot_phase, as_of, engine, overall_score, notes, source_id)
  SELECT
    d.sid, 'ivyplus_v1', 'assessment', d.assessment_date, 'sql',
    s.overall_score,
    'Auto-scored from initial GamePlan & base vitals',
    NULL
  FROM dates d
  CROSS JOIN scores s
  WHERE s.sid=d.sid
  ON CONFLICT (student_id, rubric_id, snapshot_phase, as_of) DO UPDATE
  SET overall_score = EXCLUDED.overall_score,
      notes         = EXCLUDED.notes
  RETURNING snapshot_id, student_id
),
ins_final AS (
  INSERT INTO ivyready_snapshots (student_id, rubric_id, snapshot_phase, as_of, engine, overall_score, notes, source_id)
  SELECT
    d.sid, 'ivyplus_v1', 'final_submit', d.final_submit_date, 'sql',
    s.overall_score,
    'Auto-scored from final submitted ECs/Awards, SAT latest, narrative final',
    NULL
  FROM dates d
  CROSS JOIN scores s
  WHERE s.sid=d.sid
  ON CONFLICT (student_id, rubric_id, snapshot_phase, as_of) DO UPDATE
  SET overall_score = EXCLUDED.overall_score,
      notes         = EXCLUDED.notes
  RETURNING snapshot_id, student_id
),

-- Delete old factor rows before inserting fresh ones
del_assessment_factors AS (
  DELETE FROM ivyready_snapshot_factors f
  USING ins_assessment t
  WHERE f.snapshot_id = t.snapshot_id
),
del_final_factors AS (
  DELETE FROM ivyready_snapshot_factors f
  USING ins_final t
  WHERE f.snapshot_id = t.snapshot_id
),

-- Insert assessment factors
ins_assessment_factors AS (
  INSERT INTO ivyready_snapshot_factors (snapshot_id, factor_id, raw_score, weight_pct, details_json)
  SELECT t.snapshot_id, q.f_id, q.r_score, q.w_pct, q.djson
  FROM ins_assessment t
  CROSS JOIN LATERAL (
    SELECT 'academics'::text AS f_id,
           (SELECT academics_score FROM scores) AS r_score,
           (SELECT weight_pct FROM admissions_rubric_factors WHERE factor_id='academics' AND rubric_id='ivyplus_v1') AS w_pct,
           jsonb_build_object('source','sql','note','assessment snapshot') AS djson
    UNION ALL
    SELECT 'testing',
           (SELECT testing_score FROM testing),
           (SELECT weight_pct FROM admissions_rubric_factors WHERE factor_id='testing' AND rubric_id='ivyplus_v1'),
           jsonb_build_object('sat_total',(SELECT sat_total FROM testing),'as_of',(SELECT sat_asof FROM testing),'source',(SELECT sat_source FROM testing))
    UNION ALL
    SELECT 'ecs',
           (SELECT ecs_score FROM ecs),
           (SELECT weight_pct FROM admissions_rubric_factors WHERE factor_id='ecs' AND rubric_id='ivyplus_v1'),
           jsonb_build_object('final_ec_count',(SELECT ec_count FROM ecs))
    UNION ALL
    SELECT 'awards',
           (SELECT awards_score FROM awards),
           (SELECT weight_pct FROM admissions_rubric_factors WHERE factor_id='awards' AND rubric_id='ivyplus_v1'),
           jsonb_build_object('awards_count',(SELECT awards_count FROM awards))
    UNION ALL
    SELECT 'narrative',
           (SELECT narrative_score FROM narrative),
           (SELECT weight_pct FROM admissions_rubric_factors WHERE factor_id='narrative' AND rubric_id='ivyplus_v1'),
           jsonb_build_object('parts_present',(SELECT parts_present FROM narrative))
    UNION ALL
    SELECT 'socio_context',
           (SELECT socio_score FROM socio),
           (SELECT weight_pct FROM admissions_rubric_factors WHERE factor_id='socio_context' AND rubric_id='ivyplus_v1'),
           jsonb_build_object('assumption','neutral-65')
  ) q
  RETURNING snapshot_id
),

-- Insert final factors
ins_final_factors AS (
  INSERT INTO ivyready_snapshot_factors (snapshot_id, factor_id, raw_score, weight_pct, details_json)
  SELECT t.snapshot_id, q.f_id, q.r_score, q.w_pct, q.djson
  FROM ins_final t
  CROSS JOIN LATERAL (
    SELECT 'academics'::text AS f_id,
           (SELECT academics_score FROM scores) AS r_score,
           (SELECT weight_pct FROM admissions_rubric_factors WHERE factor_id='academics' AND rubric_id='ivyplus_v1') AS w_pct,
           jsonb_build_object('source','sql','note','final snapshot') AS djson
    UNION ALL
    SELECT 'testing',
           (SELECT testing_score FROM testing),
           (SELECT weight_pct FROM admissions_rubric_factors WHERE factor_id='testing' AND rubric_id='ivyplus_v1'),
           jsonb_build_object('sat_total',(SELECT sat_total FROM testing),'as_of',(SELECT sat_asof FROM testing),'source',(SELECT sat_source FROM testing))
    UNION ALL
    SELECT 'ecs',
           (SELECT ecs_score FROM ecs),
           (SELECT weight_pct FROM admissions_rubric_factors WHERE factor_id='ecs' AND rubric_id='ivyplus_v1'),
           jsonb_build_object('final_ec_count',(SELECT ec_count FROM ecs))
    UNION ALL
    SELECT 'awards',
           (SELECT awards_score FROM awards),
           (SELECT weight_pct FROM admissions_rubric_factors WHERE factor_id='awards' AND rubric_id='ivyplus_v1'),
           jsonb_build_object('awards_count',(SELECT awards_count FROM awards))
    UNION ALL
    SELECT 'narrative',
           (SELECT narrative_score FROM narrative),
           (SELECT weight_pct FROM admissions_rubric_factors WHERE factor_id='narrative' AND rubric_id='ivyplus_v1'),
           jsonb_build_object('parts_present',(SELECT parts_present FROM narrative))
    UNION ALL
    SELECT 'socio_context',
           (SELECT socio_score FROM socio),
           (SELECT weight_pct FROM admissions_rubric_factors WHERE factor_id='socio_context' AND rubric_id='ivyplus_v1'),
           jsonb_build_object('assumption','neutral-65')
  ) q
  RETURNING snapshot_id
)
SELECT 'IvyReady snapshots created for huda-2025' AS status;

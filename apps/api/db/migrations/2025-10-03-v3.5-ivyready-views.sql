-- v3.5: IvyReady Comparison and Delta Views
-- Created: 2025-10-03
-- Purpose: Friendly views for UX queries (compare, factor deltas, progression)

-- Latest + progression already created in DDL migration.
-- Add a friendly compare view for UX:
CREATE OR REPLACE VIEW v_ivyready_assessment_vs_final AS
WITH a AS (
  SELECT * FROM ivyready_snapshots
  WHERE snapshot_phase='assessment'
),
f AS (
  SELECT * FROM ivyready_snapshots
  WHERE snapshot_phase='final_submit'
)
SELECT
  a.student_id,
  a.as_of  AS assessment_as_of,
  a.overall_score AS assessment_score,
  f.as_of  AS final_as_of,
  f.overall_score AS final_score,
  (f.overall_score - a.overall_score) AS delta
FROM a
JOIN f USING (student_id, rubric_id);

-- Factor deltas (optional, great for "what changed?")
CREATE OR REPLACE VIEW v_ivyready_factor_deltas AS
SELECT
  a.student_id, a.snapshot_id AS assessment_sid, f.snapshot_id AS final_sid, a_f.factor_id,
  a_f.raw_score AS assessment_factor, f_f.raw_score AS final_factor,
  (f_f.raw_score - a_f.raw_score) AS delta
FROM ivyready_snapshots a
JOIN ivyready_snapshots f
  ON f.student_id=a.student_id AND f.rubric_id=a.rubric_id
 AND a.snapshot_phase='assessment' AND f.snapshot_phase='final_submit'
JOIN ivyready_snapshot_factors a_f ON a_f.snapshot_id=a.snapshot_id
JOIN ivyready_snapshot_factors f_f ON f_f.snapshot_id=f.snapshot_id AND f_f.factor_id=a_f.factor_id
ORDER BY a.student_id, a_f.factor_id;

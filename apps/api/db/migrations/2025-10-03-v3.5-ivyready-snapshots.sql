-- v3.5: IvyReady Snapshots (Credit-Score Layer)
-- Created: 2025-10-03
-- Purpose: First-class scoring layer that turns raw vitals into time-stamped credit-score snapshots
-- Features: assessment + final_submit snapshots, factor breakdowns, feature evidence, deterministic SQL-first

-- 1) Rubric definition (global) — keep if already created; harmless to re-run
CREATE TABLE IF NOT EXISTS admissions_rubric (
  rubric_id   TEXT PRIMARY KEY,
  rubric_name TEXT NOT NULL,
  version     TEXT NOT NULL,
  created_ts  TIMESTAMPTZ DEFAULT now()
);

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

INSERT INTO admissions_rubric (rubric_id, rubric_name, version)
VALUES ('ivyplus_v1', 'Ivy+ Core Rubric', '1.0')
ON CONFLICT (rubric_id) DO NOTHING;

INSERT INTO admissions_rubric_factors (factor_id, rubric_id, factor_label, weight_pct, description, position)
VALUES
('academics',     'ivyplus_v1','Academics / Grades & Rigor', 32.0, 'Transcript strength, rigor vs. context', 1),
('testing',       'ivyplus_v1','Standardized Testing',        12.0, 'SAT/ACT; superscores if allowed',       2),
('ecs',           'ivyplus_v1','ECs / Impact / Leadership',   24.0, 'Depth, leadership, scope & evidence',   3),
('awards',        'ivyplus_v1','Awards / Distinctions',       12.0, 'Prestige & relevance to narrative',     4),
('narrative',     'ivyplus_v1','Narrative / Authentic Fit',   15.0, 'Identity+Passion+Aptitude+Cause',       5),
('socio_context', 'ivyplus_v1','Context / Hooks',              5.0, 'School context, background, access',    6)
ON CONFLICT (rubric_id, factor_id)
DO UPDATE SET weight_pct=EXCLUDED.weight_pct,
              description=EXCLUDED.description,
              position=EXCLUDED.position;

-- 2) IvyReady Snapshots (new canonical scoring layer)
CREATE TABLE IF NOT EXISTS ivyready_snapshots (
  snapshot_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id      TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  rubric_id       TEXT NOT NULL REFERENCES admissions_rubric(rubric_id),
  snapshot_phase  TEXT NOT NULL CHECK (snapshot_phase IN ('assessment','midpoint','final_submit','rolling')),
  as_of           DATE NOT NULL,
  engine          TEXT NOT NULL DEFAULT 'sql',       -- 'sql' | 'ml'
  overall_score   NUMERIC,                           -- 0..100 (denormalized for fast reads)
  notes           TEXT,
  source_id       TEXT REFERENCES sources(source_id),
  created_ts      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, rubric_id, snapshot_phase, as_of)
);

-- 3) Per-factor breakdown captured at snapshot time
CREATE TABLE IF NOT EXISTS ivyready_snapshot_factors (
  snapshot_id    UUID NOT NULL REFERENCES ivyready_snapshots(snapshot_id) ON DELETE CASCADE,
  factor_id      TEXT NOT NULL REFERENCES admissions_rubric_factors(factor_id),
  raw_score      NUMERIC NOT NULL,                   -- 0..100
  weight_pct     NUMERIC NOT NULL,                   -- copied from rubric at scoring time
  weighted_score NUMERIC GENERATED ALWAYS AS (raw_score * weight_pct / 100.0) STORED,
  details_json   JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (snapshot_id, factor_id)
);

-- 4) Feature evidence / drivers (arbitrary key-value signals)
CREATE TABLE IF NOT EXISTS ivyready_snapshot_features (
  feature_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snapshot_id   UUID NOT NULL REFERENCES ivyready_snapshots(snapshot_id) ON DELETE CASCADE,
  feature_name  TEXT NOT NULL,
  feature_value TEXT,
  feature_unit  TEXT,
  weight        NUMERIC,            -- optional local weight
  source_ref    TEXT,               -- chip-id like 'outcomes:xxxx' or 'kb_items:yyyy'
  created_ts    TIMESTAMPTZ DEFAULT now()
);

-- 5) Convenience views
CREATE OR REPLACE VIEW v_ivyready_latest AS
SELECT DISTINCT ON (student_id)
  i.student_id, i.rubric_id, i.snapshot_phase, i.as_of, i.overall_score, i.snapshot_id
FROM ivyready_snapshots i
ORDER BY student_id, as_of DESC;

CREATE OR REPLACE VIEW v_ivyready_progression AS
SELECT
  i.student_id, i.rubric_id, i.snapshot_phase, i.as_of, i.overall_score,
  JSONB_OBJECT_AGG(f.factor_id, f.raw_score ORDER BY f.factor_id) AS factor_scores
FROM ivyready_snapshots i
JOIN ivyready_snapshot_factors f USING (snapshot_id)
GROUP BY i.student_id, i.rubric_id, i.snapshot_phase, i.as_of, i.overall_score
ORDER BY i.student_id, i.as_of;

-- 6) Helper to fetch "as of" quickly
CREATE OR REPLACE FUNCTION ivyready_asof(p_student TEXT, p_date DATE, p_rubric TEXT DEFAULT 'ivyplus_v1')
RETURNS TABLE(
  student_id TEXT, as_of DATE, rubric_id TEXT, snapshot_phase TEXT, overall_score NUMERIC
) LANGUAGE sql STABLE AS $$
  SELECT student_id, as_of, rubric_id, snapshot_phase, overall_score
  FROM ivyready_snapshots
  WHERE student_id = p_student AND rubric_id = p_rubric AND as_of <= p_date
  ORDER BY as_of DESC
  LIMIT 1;
$$;

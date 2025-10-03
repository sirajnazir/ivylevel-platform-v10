-- Universal Temporal Facts Architecture (UTFA)
-- This migration creates a universal, future-proof temporal solution for all fact types

-- 1) Canonical data model: fact_observations table
CREATE TABLE IF NOT EXISTS fact_observations (
  obs_id            TEXT PRIMARY KEY,             -- stable canonical id
  student_id        TEXT NOT NULL,
  kind              TEXT NOT NULL,                -- 'sat_total_score', 'act_composite', 'award_x', ...
  value_numeric     NUMERIC NULL,                 -- numeric form when applicable (e.g., 1530)
  value_text        TEXT NULL,                    -- text form (e.g., "practice", rubric labels)
  unit              TEXT NULL,                    -- 'score','points','percent','bool','label'
  is_official       BOOLEAN NOT NULL DEFAULT FALSE,
  is_practice       BOOLEAN NOT NULL DEFAULT FALSE,
  attempt_no        INTEGER NULL,                 -- if known (1,2,3) otherwise computed later
  event_date        DATE NOT NULL,                -- when the fact "happened" (exam date)
  recorded_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), -- when we learned it
  source_id         TEXT NOT NULL REFERENCES sources(source_id),
  confidence        TEXT NOT NULL CHECK (confidence IN ('low','medium','high')),
  origin            TEXT NOT NULL,                -- 'etl_csv','session_transcript','email','imessage','execdoc', ...
  dedupe_fingerprint TEXT NOT NULL,               -- hash on (student,kind,event_date,value,is_official,source_id)
  meta              JSONB NOT NULL DEFAULT '{}',  -- e.g., test center, section subscores, doc url
  CONSTRAINT fact_obs_unique UNIQUE (dedupe_fingerprint)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_fact_obs_student_kind ON fact_observations(student_id, kind);
CREATE INDEX IF NOT EXISTS idx_fact_obs_event_date ON fact_observations(event_date);
CREATE INDEX IF NOT EXISTS idx_fact_obs_dedupe ON fact_observations(dedupe_fingerprint);

-- 2) Policy table for tie-breakers
CREATE TABLE IF NOT EXISTS fact_priorities (
  kind TEXT PRIMARY KEY,
  weight_official INTEGER NOT NULL DEFAULT 100,
  weight_conf_high INTEGER NOT NULL DEFAULT 30,
  weight_conf_med  INTEGER NOT NULL DEFAULT 15,
  weight_recent_days INTEGER NOT NULL DEFAULT 0,        -- optional decay/reward
  preferred_sources TEXT[] NOT NULL DEFAULT '{}',       -- e.g., '{SRC-CollegeBoard,SRC-Naviance}'
  blocked_sources   TEXT[] NOT NULL DEFAULT '{}'        -- if any
);

-- Insert default priorities for common fact types
INSERT INTO fact_priorities (kind, weight_official, weight_conf_high, weight_conf_med, preferred_sources)
VALUES 
  ('sat_total_score', 100, 30, 15, ARRAY['SRC-CollegeBoard', 'SRC-Naviance']),
  ('act_composite', 100, 30, 15, ARRAY['SRC-ACT', 'SRC-Naviance']),
  ('ap_score', 100, 30, 15, ARRAY['SRC-CollegeBoard']),
  ('gpa_weighted', 80, 30, 15, ARRAY['SRC-Transcript']),
  ('gpa_unweighted', 80, 30, 15, ARRAY['SRC-Transcript']),
  ('award_won', 50, 30, 15, ARRAY[]::TEXT[]),
  ('award_applied', 50, 30, 15, ARRAY[]::TEXT[])
ON CONFLICT (kind) DO NOTHING;

-- 3) Core view: v_fact_timeline
CREATE OR REPLACE VIEW v_fact_timeline AS
WITH base AS (
  SELECT
    student_id,
    kind,
    obs_id,
    event_date,
    recorded_at,
    value_numeric,
    value_text,
    is_official,
    is_practice,
    confidence,
    source_id,
    meta,
    attempt_no,
    -- score primary weight: official > confidence > preferred source > recency
    (
      (CASE WHEN is_official THEN COALESCE(fp.weight_official, 100) ELSE 0 END) +
      (CASE confidence
          WHEN 'high' THEN COALESCE(fp.weight_conf_high, 30)
          WHEN 'medium' THEN COALESCE(fp.weight_conf_med, 15)
          ELSE 0 END) +
      (CASE WHEN source_id = ANY(COALESCE(fp.preferred_sources, ARRAY[]::TEXT[])) THEN 5 ELSE 0 END)
    ) AS policy_score
  FROM fact_observations fo
  LEFT JOIN fact_priorities fp USING (kind)
  WHERE source_id <> ALL(COALESCE(fp.blocked_sources, ARRAY[]::TEXT[]))
),
-- order events chronologically; break ties with policy & recorded_at
ordered AS (
  SELECT
    *,
    ROW_NUMBER() OVER (
      PARTITION BY student_id, kind
      ORDER BY event_date ASC, policy_score DESC, recorded_at ASC, obs_id ASC
    ) AS rank_chron,                   -- 1=earliest
    ROW_NUMBER() OVER (
      PARTITION BY student_id, kind
      ORDER BY event_date DESC, policy_score DESC, recorded_at DESC, obs_id DESC
    ) AS rank_reverse                  -- 1=latest
  FROM base
),
-- compute attempt_no if missing: densify by event_date ascending
numbered AS (
  SELECT *,
    COALESCE(attempt_no,
      DENSE_RANK() OVER (PARTITION BY student_id, kind ORDER BY event_date ASC)
    ) AS attempt_resolved
  FROM ordered
)
SELECT
  student_id, kind, obs_id, event_date, recorded_at,
  value_numeric, value_text, is_official, is_practice, confidence, source_id, meta,
  policy_score, rank_chron, rank_reverse, attempt_resolved
FROM numbered;

-- 4) Universal query functions

-- a) First (earliest)
CREATE OR REPLACE FUNCTION fact_first(p_student TEXT, p_kind TEXT)
RETURNS TABLE(obs_id TEXT, event_date DATE, value_numeric NUMERIC, value_text TEXT, is_official BOOLEAN, confidence TEXT, source_id TEXT, meta JSONB) 
LANGUAGE sql STABLE AS $$
  SELECT obs_id, event_date, value_numeric, value_text, is_official, confidence, source_id, meta
  FROM v_fact_timeline
  WHERE student_id = p_student AND kind = p_kind
  ORDER BY rank_chron ASC
  LIMIT 1;
$$;

-- b) Latest (final)
CREATE OR REPLACE FUNCTION fact_latest(p_student TEXT, p_kind TEXT)
RETURNS TABLE(obs_id TEXT, event_date DATE, value_numeric NUMERIC, value_text TEXT, is_official BOOLEAN, confidence TEXT, source_id TEXT, meta JSONB) 
LANGUAGE sql STABLE AS $$
  SELECT obs_id, event_date, value_numeric, value_text, is_official, confidence, source_id, meta
  FROM v_fact_timeline
  WHERE student_id = p_student AND kind = p_kind
  ORDER BY rank_reverse ASC
  LIMIT 1;
$$;

-- c) Nth (ordinal)
CREATE OR REPLACE FUNCTION fact_nth(p_student TEXT, p_kind TEXT, p_n INT)
RETURNS TABLE(obs_id TEXT, event_date DATE, value_numeric NUMERIC, value_text TEXT, is_official BOOLEAN, confidence TEXT, source_id TEXT, meta JSONB) 
LANGUAGE sql STABLE AS $$
  SELECT obs_id, event_date, value_numeric, value_text, is_official, confidence, source_id, meta
  FROM v_fact_timeline
  WHERE student_id = p_student AND kind = p_kind
  ORDER BY rank_chron ASC
  OFFSET GREATEST(p_n - 1, 0) LIMIT 1;
$$;

-- d) As-of date
CREATE OR REPLACE FUNCTION fact_asof(p_student TEXT, p_kind TEXT, p_date DATE)
RETURNS TABLE(obs_id TEXT, event_date DATE, value_numeric NUMERIC, value_text TEXT, is_official BOOLEAN, confidence TEXT, source_id TEXT, meta JSONB) 
LANGUAGE sql STABLE AS $$
  SELECT obs_id, event_date, value_numeric, value_text, is_official, confidence, source_id, meta
  FROM v_fact_timeline
  WHERE student_id = p_student AND kind = p_kind
    AND event_date <= p_date
  ORDER BY event_date DESC, policy_score DESC, recorded_at DESC
  LIMIT 1;
$$;

-- e) Series (all in order)
CREATE OR REPLACE FUNCTION fact_series(p_student TEXT, p_kind TEXT)
RETURNS TABLE(idx INT, obs_id TEXT, event_date DATE, value_numeric NUMERIC, value_text TEXT, is_official BOOLEAN, confidence TEXT, source_id TEXT, meta JSONB) 
LANGUAGE sql STABLE AS $$
  SELECT rank_chron::INT AS idx, obs_id, event_date, value_numeric, value_text, is_official, confidence, source_id, meta
  FROM v_fact_timeline
  WHERE student_id = p_student AND kind = p_kind
  ORDER BY rank_chron ASC;
$$;

-- f) Series with filters
CREATE OR REPLACE FUNCTION fact_series_filtered(p_student TEXT, p_kind TEXT, p_official_only BOOLEAN DEFAULT FALSE)
RETURNS TABLE(idx INT, obs_id TEXT, event_date DATE, value_numeric NUMERIC, value_text TEXT, is_official BOOLEAN, confidence TEXT, source_id TEXT, meta JSONB) 
LANGUAGE sql STABLE AS $$
  WITH filtered AS (
    SELECT *, ROW_NUMBER() OVER (ORDER BY event_date ASC) as filtered_idx
    FROM v_fact_timeline
    WHERE student_id = p_student AND kind = p_kind
      AND (NOT p_official_only OR is_official = TRUE)
    ORDER BY rank_chron ASC
  )
  SELECT filtered_idx::INT AS idx, obs_id, event_date, value_numeric, value_text, is_official, confidence, source_id, meta
  FROM filtered
  ORDER BY filtered_idx;
$$;

-- 5) Backfill function to migrate from vital_facts
CREATE OR REPLACE FUNCTION backfill_fact_observations()
RETURNS VOID AS $$
BEGIN
  -- Migrate existing vital_facts to fact_observations
  INSERT INTO fact_observations (
    obs_id,
    student_id,
    kind,
    value_numeric,
    value_text,
    unit,
    is_official,
    is_practice,
    event_date,
    recorded_at,
    source_id,
    confidence,
    origin,
    dedupe_fingerprint,
    meta
  )
  SELECT 
    'obs_' || md5(student_id || kind || value || fact_date::TEXT || source_id) AS obs_id,
    student_id,
    kind,
    numeric_value,
    value,
    CASE 
      WHEN kind IN ('sat_total_score', 'act_composite') THEN 'score'
      WHEN kind LIKE '%_score' THEN 'score'
      WHEN kind LIKE 'gpa_%' THEN 'points'
      ELSE 'label'
    END AS unit,
    COALESCE(modality = 'official', FALSE) AS is_official,
    COALESCE(modality = 'practice', FALSE) AS is_practice,
    fact_date::DATE AS event_date,
    created_at AS recorded_at,
    source_id,
    confidence::TEXT,
    'migrated_vital_facts' AS origin,
    md5(student_id || kind || value || fact_date::TEXT || COALESCE(modality, 'any') || source_id) AS dedupe_fingerprint,
    CASE 
      WHEN modality IS NOT NULL THEN jsonb_build_object('modality', modality)
      ELSE '{}'::JSONB
    END AS meta
  FROM vital_facts
  WHERE NOT EXISTS (
    SELECT 1 FROM fact_observations fo 
    WHERE fo.dedupe_fingerprint = md5(vital_facts.student_id || vital_facts.kind || vital_facts.value || vital_facts.fact_date::TEXT || COALESCE(vital_facts.modality, 'any') || vital_facts.source_id)
  );
END;
$$ LANGUAGE plpgsql;

-- Execute the backfill
SELECT backfill_fact_observations();

-- 6) Helper function to get superscore (for SAT/ACT)
CREATE OR REPLACE FUNCTION fact_superscore(p_student TEXT, p_kind TEXT)
RETURNS TABLE(value_numeric NUMERIC, event_dates DATE[], source_ids TEXT[]) 
LANGUAGE sql STABLE AS $$
  WITH scores AS (
    SELECT value_numeric, event_date, source_id
    FROM v_fact_timeline
    WHERE student_id = p_student AND kind = p_kind
      AND value_numeric IS NOT NULL
    ORDER BY value_numeric DESC
  )
  SELECT 
    MAX(value_numeric) AS value_numeric,
    array_agg(DISTINCT event_date ORDER BY event_date) AS event_dates,
    array_agg(DISTINCT source_id) AS source_ids
  FROM scores
  WHERE value_numeric = (SELECT MAX(value_numeric) FROM scores);
$$;
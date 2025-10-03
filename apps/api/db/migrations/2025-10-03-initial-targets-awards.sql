-- Initial Targets Architecture - Award Targets
-- This migration creates tables and views for deterministic initial award targets

-- 1) Award targets table
CREATE TABLE IF NOT EXISTS award_targets (
  id               BIGSERIAL PRIMARY KEY,
  student_id       TEXT        NOT NULL,
  award_label      TEXT        NOT NULL,   -- e.g., "NCWiT Aspirations in Computing"
  tier             TEXT        NULL,       -- e.g., national/regional/school (optional)
  rationale        TEXT        NULL,       -- optional notes from game plan
  phase            TEXT        NOT NULL CHECK (phase IN ('initial','revised','final')),
  as_of            TIMESTAMPTZ NOT NULL,   -- timestamp the target list was set
  confidence       TEXT        NOT NULL DEFAULT 'medium', -- align with your facts policy
  source_id        TEXT        NOT NULL,   -- from Sources.csv / assessment filename key
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_award_targets_student_phase
  ON award_targets (student_id, phase);

CREATE INDEX IF NOT EXISTS idx_award_targets_asof
  ON award_targets (student_id, as_of);

-- Unique constraint to prevent duplicates
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'award_targets_unique_student_label_phase'
  ) THEN
    ALTER TABLE award_targets 
    ADD CONSTRAINT award_targets_unique_student_label_phase 
    UNIQUE (student_id, award_label, phase);
  END IF;
END $$;

-- 2) Initial-only view (deterministic)
CREATE OR REPLACE VIEW v_award_targets_initial AS
SELECT *
FROM award_targets
WHERE phase = 'initial';

-- 3) Temporal as-of view (window the set a client asked about)
-- Returns the most recent target-set at or before the given timestamp
CREATE OR REPLACE VIEW v_award_targets_asof AS
SELECT at1.*
FROM award_targets at1
JOIN (
  SELECT student_id, MAX(as_of) AS max_as_of
  FROM award_targets
  GROUP BY student_id
) last ON last.student_id = at1.student_id AND last.max_as_of = at1.as_of;

-- 4) Parameterized function for "as of" queries
CREATE OR REPLACE FUNCTION get_award_targets_asof(p_student_id TEXT, p_ts TIMESTAMPTZ)
RETURNS SETOF award_targets 
LANGUAGE sql 
STABLE AS $$
  SELECT *
  FROM award_targets
  WHERE student_id = p_student_id
    AND as_of = (
      SELECT MAX(as_of)
      FROM award_targets
      WHERE student_id = p_student_id
        AND as_of <= p_ts
    )
  ORDER BY award_label;
$$;

-- 5) Helper function to get targets by phase
CREATE OR REPLACE FUNCTION get_award_targets_by_phase(p_student_id TEXT, p_phase TEXT)
RETURNS TABLE(
  award_label TEXT,
  tier TEXT,
  phase TEXT,
  as_of TIMESTAMPTZ,
  confidence TEXT,
  source_id TEXT,
  rationale TEXT
) 
LANGUAGE sql 
STABLE AS $$
  SELECT 
    award_label,
    tier,
    phase,
    as_of,
    confidence,
    source_id,
    rationale
  FROM award_targets
  WHERE student_id = p_student_id
    AND phase = p_phase
  ORDER BY award_label ASC;
$$;

-- 6) Summary view for quick lookups
CREATE OR REPLACE VIEW v_award_targets_summary AS
SELECT 
  student_id,
  phase,
  COUNT(*) as target_count,
  as_of,
  STRING_AGG(award_label, '; ' ORDER BY award_label) as awards_list,
  source_id
FROM award_targets
GROUP BY student_id, phase, as_of, source_id;

-- Seed initial data from known Game Plan source
-- Based on the "Target Ivy+ Awards Profile" from Huda's Assessment
INSERT INTO award_targets 
  (student_id, award_label, tier, rationale, phase, as_of, confidence, source_id)
VALUES
  ('huda-2025', 'NCWiT Aspirations in Computing Award', 'national', NULL, 'initial', '2025-06-22T00:00:00Z', 'high', 'SRC-huda-2025-gameplan-report'),
  ('huda-2025', 'Presidential Volunteer Service Award', 'national', NULL, 'initial', '2025-06-22T00:00:00Z', 'high', 'SRC-huda-2025-gameplan-report'),
  ('huda-2025', 'National Merit Finalist Award', 'national', NULL, 'initial', '2025-06-22T00:00:00Z', 'high', 'SRC-huda-2025-gameplan-report'),
  ('huda-2025', 'Game Hackathon Awards', NULL, NULL, 'initial', '2025-06-22T00:00:00Z', 'high', 'SRC-huda-2025-gameplan-report'),
  ('huda-2025', 'Advocacy Award', NULL, NULL, 'initial', '2025-06-22T00:00:00Z', 'high', 'SRC-huda-2025-gameplan-report'),
  ('huda-2025', 'Game Impact Challenge Award', NULL, NULL, 'initial', '2025-06-22T00:00:00Z', 'high', 'SRC-huda-2025-gameplan-report'),
  ('huda-2025', 'JCamp', NULL, NULL, 'initial', '2025-06-22T00:00:00Z', 'high', 'SRC-huda-2025-gameplan-report')
ON CONFLICT DO NOTHING;

-- Grant permissions if needed
-- GRANT SELECT ON award_targets TO jenny_api_user;
-- GRANT SELECT ON v_award_targets_initial TO jenny_api_user;
-- GRANT SELECT ON v_award_targets_asof TO jenny_api_user;
-- GRANT SELECT ON v_award_targets_summary TO jenny_api_user;
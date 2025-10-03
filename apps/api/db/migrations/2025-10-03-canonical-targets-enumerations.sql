-- Canonical Targets & Enumerations Architecture
-- Facts-first tables for initial/final targets and execution timeline
-- Based on derived CSVs from JTBD Index, Interactions, and Facts

-- ============================================================================
-- 1. Award Targets (initial/revised/final from GamePlan → Common App)
-- ============================================================================
CREATE TABLE IF NOT EXISTS award_targets_enum (
  id           BIGSERIAL PRIMARY KEY,
  student_id   TEXT NOT NULL,
  phase        TEXT NOT NULL CHECK (phase IN ('initial','revised','final')),
  item_label   TEXT NOT NULL,
  as_of        DATE,
  source_id    TEXT,             -- e.g., SRC-****
  jtbd_id      TEXT,             -- cross-ref to JTBD row
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),

  UNIQUE(student_id, phase, item_label)
);

CREATE INDEX IF NOT EXISTS idx_award_targets_enum_sid_phase
  ON award_targets_enum(student_id, phase);
CREATE INDEX IF NOT EXISTS idx_award_targets_enum_asof
  ON award_targets_enum(as_of);

-- ============================================================================
-- 2. EC Targets (initial/revised/final)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ec_targets (
  id           BIGSERIAL PRIMARY KEY,
  student_id   TEXT NOT NULL,
  phase        TEXT NOT NULL CHECK (phase IN ('initial','revised','final')),
  item_label   TEXT NOT NULL,
  as_of        DATE,
  source_id    TEXT,
  jtbd_id      TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),

  UNIQUE(student_id, phase, item_label)
);

CREATE INDEX IF NOT EXISTS idx_ec_targets_sid_phase
  ON ec_targets(student_id, phase);

-- ============================================================================
-- 3. Narrative Targets (initial narrative from GamePlan)
-- ============================================================================
CREATE TABLE IF NOT EXISTS narrative_targets (
  id           BIGSERIAL PRIMARY KEY,
  student_id   TEXT NOT NULL,
  narrative    TEXT NOT NULL,
  as_of        DATE,
  source_id    TEXT,
  jtbd_id      TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_narrative_targets_sid
  ON narrative_targets(student_id);

-- ============================================================================
-- 4. Plan Events (execution timeline from iMessage/Interactions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS plan_events (
  id           BIGSERIAL PRIMARY KEY,
  student_id   TEXT NOT NULL,
  as_of        DATE NOT NULL,
  event        TEXT NOT NULL, -- award_won, application_submitted, interview_scheduled, lor_activity, milestone
  jtbd_id      TEXT,
  snippet_id   TEXT,
  source_id    TEXT,
  text         TEXT,          -- short context snippet
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_events_sid_date
  ON plan_events(student_id, as_of);
CREATE INDEX IF NOT EXISTS idx_plan_events_kind
  ON plan_events(event);

-- ============================================================================
-- 5. SAT Timeline (dedicated temporal table from Facts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sat_timeline_enum (
  id           BIGSERIAL PRIMARY KEY,
  student_id   TEXT NOT NULL,
  as_of        DATE NOT NULL,
  numeric_value INT NOT NULL,
  type         TEXT,          -- official|practice|unknown
  confidence   TEXT,
  source_id    TEXT,
  raw_name     TEXT,
  raw_value    TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sat_timeline_enum_sid_date
  ON sat_timeline_enum(student_id, as_of);

-- ============================================================================
-- VIEWS: First/Latest/Phase-based for Awards & ECs
-- ============================================================================

-- Initial awards
CREATE OR REPLACE VIEW v_awards_enum_initial AS
SELECT * FROM award_targets_enum WHERE phase='initial' ORDER BY as_of NULLS LAST, item_label;

-- Final awards
CREATE OR REPLACE VIEW v_awards_enum_final AS
SELECT * FROM award_targets_enum WHERE phase='final' ORDER BY as_of NULLS LAST, item_label;

-- Initial ECs
CREATE OR REPLACE VIEW v_ec_enum_initial AS
SELECT * FROM ec_targets WHERE phase='initial' ORDER BY as_of NULLS LAST, item_label;

-- Final ECs
CREATE OR REPLACE VIEW v_ec_enum_final AS
SELECT * FROM ec_targets WHERE phase='final' ORDER BY as_of NULLS LAST, item_label;

-- Award wins from plan_events (and later union outcomes)
CREATE OR REPLACE VIEW v_awards_enum_won AS
SELECT student_id, as_of, text AS evidence, source_id, jtbd_id, snippet_id
FROM plan_events
WHERE event = 'award_won'
ORDER BY as_of ASC;

-- ============================================================================
-- VIEWS: SAT Temporal Queries
-- ============================================================================

-- First SAT (earliest attempt)
CREATE OR REPLACE VIEW v_sat_enum_first AS
SELECT DISTINCT ON (student_id)
  student_id, as_of, numeric_value, type, confidence, source_id
FROM sat_timeline_enum
ORDER BY student_id, as_of ASC, numeric_value ASC;

-- Latest SAT (most recent attempt)
CREATE OR REPLACE VIEW v_sat_enum_latest AS
SELECT DISTINCT ON (student_id)
  student_id, as_of, numeric_value, type, confidence, source_id
FROM sat_timeline_enum
ORDER BY student_id, as_of DESC, numeric_value DESC;

-- SAT Progression (all attempts in order)
CREATE OR REPLACE VIEW v_sat_enum_progression AS
SELECT
  student_id,
  as_of,
  numeric_value,
  type,
  confidence,
  source_id,
  ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY as_of ASC) as nth
FROM sat_timeline_enum
ORDER BY student_id, as_of ASC;

-- ============================================================================
-- FUNCTIONS: As-of date queries
-- ============================================================================

-- Get SAT score as of a specific date
CREATE OR REPLACE FUNCTION sat_enum_as_of(p_student TEXT, p_date DATE)
RETURNS TABLE(
  student_id TEXT,
  as_of DATE,
  numeric_value INT,
  type TEXT,
  confidence TEXT,
  source_id TEXT
)
LANGUAGE sql
STABLE AS $$
  SELECT student_id, as_of, numeric_value, type, confidence, source_id
  FROM sat_timeline_enum
  WHERE student_id = p_student AND as_of <= p_date
  ORDER BY as_of DESC, numeric_value DESC
  LIMIT 1;
$$;

-- Get awards as of a specific date
CREATE OR REPLACE FUNCTION awards_enum_as_of(p_student TEXT, p_date DATE, p_phase TEXT DEFAULT 'initial')
RETURNS TABLE(
  item_label TEXT,
  as_of DATE,
  source_id TEXT,
  jtbd_id TEXT
)
LANGUAGE sql
STABLE AS $$
  SELECT item_label, as_of, source_id, jtbd_id
  FROM award_targets_enum
  WHERE student_id = p_student
    AND phase = p_phase
    AND (as_of IS NULL OR as_of <= p_date)
  ORDER BY as_of NULLS LAST, item_label;
$$;

-- ============================================================================
-- HELPER FUNCTIONS: Get nth SAT score
-- ============================================================================
CREATE OR REPLACE FUNCTION get_sat_nth(p_student TEXT, p_nth INT)
RETURNS TABLE(
  student_id TEXT,
  as_of DATE,
  numeric_value INT,
  type TEXT,
  confidence TEXT,
  source_id TEXT,
  nth BIGINT
)
LANGUAGE sql
STABLE AS $$
  SELECT *
  FROM v_sat_enum_progression
  WHERE student_id = p_student AND nth = p_nth;
$$;

-- ============================================================================
-- SUMMARY VIEWS
-- ============================================================================

-- Execution timeline summary
CREATE OR REPLACE VIEW v_plan_events_summary AS
SELECT
  student_id,
  event,
  COUNT(*) as event_count,
  MIN(as_of) as first_date,
  MAX(as_of) as last_date,
  STRING_AGG(DISTINCT source_id, ', ') as sources
FROM plan_events
GROUP BY student_id, event
ORDER BY student_id, first_date;

-- Narrative targets summary
CREATE OR REPLACE VIEW v_narrative_summary AS
SELECT
  student_id,
  COUNT(*) as narrative_count,
  MIN(as_of) as earliest_date,
  STRING_AGG(LEFT(narrative, 100), ' | ') as narrative_preview
FROM narrative_targets
GROUP BY student_id;

COMMENT ON TABLE award_targets_enum IS 'Canonical award targets from JTBD Index (initial/revised/final phases)';
COMMENT ON TABLE ec_targets IS 'Canonical EC targets from JTBD Index (initial/revised/final phases)';
COMMENT ON TABLE narrative_targets IS 'Initial narrative targets from GamePlan';
COMMENT ON TABLE plan_events IS 'Execution timeline events from Interactions.csv (iMessage/calls)';
COMMENT ON TABLE sat_timeline_enum IS 'SAT score timeline from Facts.csv with temporal ordering';

COMMENT ON VIEW v_sat_enum_progression IS 'SAT scores ordered chronologically with nth numbering';
COMMENT ON VIEW v_awards_enum_won IS 'Awards won from execution timeline (plan_events)';

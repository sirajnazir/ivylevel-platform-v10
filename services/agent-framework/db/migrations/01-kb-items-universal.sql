-- Universal KB Items Architecture
-- Single ledger for all targets & outcomes with explicit state machine
-- Supports: Awards, ECs, Tests, Applications, Decisions, etc.

-- 1) Unified items ledger (awards, ECs, tests, apps, decisions, etc.)
CREATE TABLE IF NOT EXISTS kb_items (
  item_id            TEXT PRIMARY KEY,
  student_id         TEXT NOT NULL,
  item_type          TEXT NOT NULL,         -- e.g., 'Award_Competition' | 'EC_Project' | 'Test' | 'Application' | 'Decision'
  subtype            TEXT,                  -- e.g., 'SAT' | 'UC' | 'College' | 'Tech/Impact'
  title_name         TEXT NOT NULL,         -- human-readable name
  tier1_state        TEXT NOT NULL,         -- Planned | In Transit | Submitted | Outcome | Archived
  tier2_substate     TEXT,                  -- constrained by item_type (see YAML policy)
  status_detail      TEXT,                  -- freeform detail ("Finalist", "Submission Complete", etc.)
  key_metric_type    TEXT,                  -- e.g., 'score_total' | 'placement' | 'articles_published'
  key_metric_value   TEXT,
  key_metric_unit    TEXT,
  deadline_date      DATE,
  event_date         DATE,                  -- when the score/outcome happened
  submit_date        DATE,
  outcome_date       DATE,
  owner              TEXT,                  -- 'student' | 'coach'
  cadence            TEXT,
  evidence_links     TEXT[],                -- URLs to proofs, artifact clips, confirmations
  source_ref         TEXT NOT NULL,         -- e.g., "Common App UNC", "Outcomes.csv row 42"
  confidence         TEXT DEFAULT 'medium', -- high|medium|low
  created_ts         TIMESTAMPTZ DEFAULT now(),
  updated_ts         TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT kb_items_tier1_state_check
    CHECK (tier1_state IN ('Planned', 'In Transit', 'Submitted', 'Outcome', 'Archived')),
  CONSTRAINT kb_items_confidence_check
    CHECK (confidence IN ('high', 'medium', 'low'))
);

-- 2) Indexes for performance/temporal ordering
CREATE INDEX IF NOT EXISTS kb_items_by_student
  ON kb_items (student_id);

CREATE INDEX IF NOT EXISTS kb_items_type_state
  ON kb_items (item_type, tier1_state, outcome_date, event_date, submit_date);

CREATE INDEX IF NOT EXISTS kb_items_source_ref
  ON kb_items (source_ref);

CREATE INDEX IF NOT EXISTS kb_items_temporal
  ON kb_items (student_id, item_type, COALESCE(outcome_date, event_date, submit_date, deadline_date));

-- 3) SAT progression view (from vital_facts)
CREATE OR REPLACE VIEW v_sat_progression AS
SELECT
  student_id,
  fact_date,
  CASE
    WHEN value ~ '^[0-9]+$' THEN value::int
    ELSE NULL
  END AS score_total,
  modality,        -- e.g., 'practice' | 'official' (if present in your data)
  confidence,
  source_id,
  ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY fact_date ASC, source_id ASC) AS nth
FROM vital_facts
WHERE kind = 'sat_total_score';

-- 4) Awards "initial targets" (Planned/Targeted)
CREATE OR REPLACE VIEW v_awards_initial AS
SELECT *
FROM kb_items
WHERE item_type = 'Award_Competition'
  AND tier1_state = 'Planned'
  AND COALESCE(tier2_substate, '') ILIKE '%Targeted%'
ORDER BY title_name;

-- 5) Awards "won" (Outcome: Winner/Finalist/Honorable Mention)
CREATE OR REPLACE VIEW v_awards_won AS
SELECT *
FROM kb_items
WHERE item_type = 'Award_Competition'
  AND tier1_state = 'Outcome'
  AND COALESCE(status_detail,'') <> ''
ORDER BY COALESCE(outcome_date, event_date, submit_date) NULLS LAST;

-- 6) Awards timeline (all state changes)
CREATE OR REPLACE VIEW v_awards_timeline AS
SELECT *
FROM kb_items
WHERE item_type = 'Award_Competition'
ORDER BY student_id, COALESCE(event_date, submit_date, outcome_date, deadline_date, created_ts);

-- 7) ECs timeline
CREATE OR REPLACE VIEW v_ecs_timeline AS
SELECT *
FROM kb_items
WHERE item_type LIKE 'EC_%'
ORDER BY student_id, COALESCE(event_date, submit_date, created_ts);

-- 8) Testing timeline (all test attempts)
CREATE OR REPLACE VIEW v_testing_timeline AS
SELECT *
FROM kb_items
WHERE item_type = 'Test'
ORDER BY student_id, COALESCE(event_date, submit_date) NULLS LAST;

-- 9) Applications timeline
CREATE OR REPLACE VIEW v_applications_timeline AS
SELECT *
FROM kb_items
WHERE item_type = 'Application'
ORDER BY student_id, COALESCE(submit_date, deadline_date) NULLS LAST;

-- 10) Decisions timeline
CREATE OR REPLACE VIEW v_decisions_timeline AS
SELECT *
FROM kb_items
WHERE item_type = 'Decision'
ORDER BY student_id, COALESCE(outcome_date, event_date) NULLS LAST;

-- 11) Helper function: Get items by type and state
CREATE OR REPLACE FUNCTION get_kb_items_by_type_state(
  p_student_id TEXT,
  p_item_type TEXT,
  p_tier1_state TEXT DEFAULT NULL,
  p_tier2_substate TEXT DEFAULT NULL
)
RETURNS TABLE(
  item_id TEXT,
  title_name TEXT,
  tier1_state TEXT,
  tier2_substate TEXT,
  status_detail TEXT,
  key_metric_type TEXT,
  key_metric_value TEXT,
  event_date DATE,
  outcome_date DATE,
  source_ref TEXT,
  evidence_links TEXT[],
  confidence TEXT
)
LANGUAGE sql
STABLE AS $$
  SELECT
    item_id,
    title_name,
    tier1_state,
    tier2_substate,
    status_detail,
    key_metric_type,
    key_metric_value,
    event_date,
    outcome_date,
    source_ref,
    evidence_links,
    confidence
  FROM kb_items
  WHERE student_id = p_student_id
    AND item_type = p_item_type
    AND (p_tier1_state IS NULL OR tier1_state = p_tier1_state)
    AND (p_tier2_substate IS NULL OR tier2_substate = p_tier2_substate)
  ORDER BY COALESCE(outcome_date, event_date, submit_date, deadline_date) NULLS LAST;
$$;

-- 12) Helper function: Get progression/timeline
CREATE OR REPLACE FUNCTION get_kb_items_progression(
  p_student_id TEXT,
  p_item_type TEXT
)
RETURNS TABLE(
  item_id TEXT,
  title_name TEXT,
  tier1_state TEXT,
  status_detail TEXT,
  key_metric_value TEXT,
  temporal_date DATE,
  source_ref TEXT,
  nth INTEGER
)
LANGUAGE sql
STABLE AS $$
  SELECT
    item_id,
    title_name,
    tier1_state,
    status_detail,
    key_metric_value,
    COALESCE(outcome_date, event_date, submit_date, deadline_date) AS temporal_date,
    source_ref,
    ROW_NUMBER() OVER (
      ORDER BY COALESCE(outcome_date, event_date, submit_date, deadline_date) ASC
    )::INTEGER AS nth
  FROM kb_items
  WHERE student_id = p_student_id
    AND item_type = p_item_type
  ORDER BY nth;
$$;

-- 13) Summary view for quick lookups
CREATE OR REPLACE VIEW v_kb_items_summary AS
SELECT
  student_id,
  item_type,
  tier1_state,
  COUNT(*) as item_count,
  STRING_AGG(title_name, '; ' ORDER BY title_name) as items_list,
  MIN(COALESCE(event_date, submit_date, deadline_date)) as earliest_date,
  MAX(COALESCE(outcome_date, event_date, submit_date)) as latest_date
FROM kb_items
GROUP BY student_id, item_type, tier1_state;

-- Grant permissions if needed
-- GRANT SELECT ON kb_items TO jenny_api_user;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO jenny_api_user;

COMMENT ON TABLE kb_items IS 'Universal ledger for all student targets and outcomes with explicit state machine (Planned → In Transit → Submitted → Outcome → Archived)';
COMMENT ON COLUMN kb_items.tier1_state IS 'Primary state: Planned | In Transit | Submitted | Outcome | Archived';
COMMENT ON COLUMN kb_items.tier2_substate IS 'Secondary state specific to item_type (e.g., Targeted, Applied, Winner, Finalist)';
COMMENT ON COLUMN kb_items.source_ref IS 'Provenance reference (e.g., Common App UNC, Outcomes.csv row 42, GamePlan v1)';
COMMENT ON COLUMN kb_items.evidence_links IS 'Array of URLs to proofs, artifacts, confirmations';

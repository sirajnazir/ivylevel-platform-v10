-- =============================================================================
-- JTBD (JOBS TO BE DONE) SCHEMA - v10.6
-- Pure Fact-Based Weekly Execution Tracking
-- =============================================================================
-- Purpose: Track WHAT got done week-by-week (pure facts, no coaching intelligence)
-- Scope: Cat-1 (Facts-First SQL) - execution milestones, task completion, outcomes
-- Examples: "Week 8: Submitted 3 college apps", "Week 12: Raised $5k for Empowering AI"
-- =============================================================================
-- NOTE: Coaching tactics, frameworks, and guidance remain in KB/RAG (Cat-02)
-- =============================================================================

-- =============================================================================
-- TABLE: jtbd
-- =============================================================================
-- Tracks weekly execution facts and milestones
-- Enables queries like: "What did I accomplish in Week 8?", "Show me my weekly progress"

CREATE TABLE IF NOT EXISTS jtbd (
  -- Primary key
  jtbd_id          TEXT PRIMARY KEY,           -- Format: J{nnn} (e.g., J001, J002)

  -- Foreign keys
  student_id       TEXT NOT NULL REFERENCES students(student_id),

  -- Temporal context
  week_number      INT NOT NULL,               -- Program week (1-52)
  week_start_date  DATE NOT NULL,              -- Week start date
  week_end_date    DATE NOT NULL,              -- Week end date

  -- Execution facts (WHAT was done, not HOW or WHY)
  job_type         TEXT NOT NULL CHECK (job_type IN (
    'application',   -- College/program application submitted
    'test',          -- Test taken (SAT, ACT, AP)
    'award',         -- Award application submitted or won
    'ec_milestone',  -- EC milestone achieved (funding raised, event held)
    'academic',      -- Academic milestone (course completed, GPA updated)
    'essay',         -- Essay drafted/revised/finalized
    'other'          -- Other execution item
  )),
  job_description  TEXT NOT NULL,              -- Brief description of what was done

  -- Linked entities (optional foreign keys to specific items)
  linked_chip_id   TEXT,                       -- Links to kb_items, outcomes, ec_vitals, etc.
  linked_table     TEXT,                       -- Table name of linked entity

  -- Status tracking
  status           TEXT NOT NULL CHECK (status IN (
    'planned',       -- Planned to do this week
    'in_progress',   -- Started but not completed
    'completed',     -- Completed this week
    'deferred',      -- Pushed to future week
    'cancelled'      -- No longer doing
  )),
  completion_date  DATE,                       -- Actual completion date (if completed)

  -- Outcome metrics (quantifiable results)
  outcome_metric   TEXT,                       -- What metric changed (e.g., 'apps_submitted', 'funding_raised')
  outcome_value    NUMERIC,                    -- Numeric value (e.g., 3, 5000)
  outcome_unit     TEXT,                       -- Unit (e.g., 'applications', '$')

  -- Provenance
  source_id        TEXT NOT NULL,              -- Source: SRC-SNAPSHOT-YYYY-MM-DD, SRC-SESSION-nnn

  -- Metadata
  notes            TEXT,                       -- Optional context
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  UNIQUE(student_id, week_number, job_type, job_description),
  CHECK (week_end_date >= week_start_date),
  CHECK ((status = 'completed' AND completion_date IS NOT NULL) OR status != 'completed')
);

-- Indexes for performance
CREATE INDEX idx_jtbd_student ON jtbd(student_id);
CREATE INDEX idx_jtbd_week ON jtbd(week_number);
CREATE INDEX idx_jtbd_student_week ON jtbd(student_id, week_number);
CREATE INDEX idx_jtbd_job_type ON jtbd(job_type);
CREATE INDEX idx_jtbd_status ON jtbd(status);
CREATE INDEX idx_jtbd_week_start ON jtbd(week_start_date);
CREATE INDEX idx_jtbd_source ON jtbd(source_id);
CREATE INDEX idx_jtbd_linked_chip ON jtbd(linked_chip_id);

-- =============================================================================
-- TEMPORAL VIEWS FOR JTBD
-- =============================================================================

-- View: v_jtbd_by_week
-- Purpose: Aggregate view of execution by week
CREATE OR REPLACE VIEW v_jtbd_by_week AS
SELECT
  student_id,
  week_number,
  week_start_date,
  week_end_date,
  COUNT(*) AS total_jobs,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed_jobs,
  COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_jobs,
  COUNT(*) FILTER (WHERE status = 'planned') AS planned_jobs,
  ARRAY_AGG(job_type ORDER BY job_type) FILTER (WHERE status = 'completed') AS completed_job_types,
  ARRAY_AGG(job_description ORDER BY completion_date) FILTER (WHERE status = 'completed') AS completed_descriptions
FROM jtbd
GROUP BY student_id, week_number, week_start_date, week_end_date
ORDER BY student_id, week_number;

-- View: v_jtbd_completed
-- Purpose: All completed jobs in chronological order
CREATE OR REPLACE VIEW v_jtbd_completed AS
SELECT
  jtbd_id,
  student_id,
  week_number,
  job_type,
  job_description,
  completion_date,
  outcome_metric,
  outcome_value,
  outcome_unit,
  linked_chip_id,
  source_id
FROM jtbd
WHERE status = 'completed'
ORDER BY student_id, completion_date, week_number;

-- View: v_jtbd_pending
-- Purpose: All pending/in-progress jobs
CREATE OR REPLACE VIEW v_jtbd_pending AS
SELECT
  jtbd_id,
  student_id,
  week_number,
  week_start_date,
  week_end_date,
  job_type,
  job_description,
  status,
  linked_chip_id,
  source_id
FROM jtbd
WHERE status IN ('planned', 'in_progress')
ORDER BY student_id, week_number, job_type;

-- View: v_jtbd_summary
-- Purpose: Student-level execution summary
CREATE OR REPLACE VIEW v_jtbd_summary AS
SELECT
  student_id,
  COUNT(*) AS total_jobs,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed_jobs,
  COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_jobs,
  COUNT(*) FILTER (WHERE status = 'planned') AS planned_jobs,
  MIN(week_start_date) AS program_start,
  MAX(week_end_date) AS latest_week,
  ARRAY_AGG(DISTINCT job_type ORDER BY job_type) AS job_types_tracked
FROM jtbd
GROUP BY student_id;

-- View: v_jtbd_progression
-- Purpose: Week-over-week completion rate for progression queries
CREATE OR REPLACE VIEW v_jtbd_progression AS
SELECT
  student_id,
  week_number,
  week_start_date,
  COUNT(*) AS jobs_this_week,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed_this_week,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'completed') / NULLIF(COUNT(*), 0), 1) AS completion_rate,
  SUM(COUNT(*)) OVER (PARTITION BY student_id ORDER BY week_number) AS cumulative_jobs,
  SUM(COUNT(*) FILTER (WHERE status = 'completed')) OVER (PARTITION BY student_id ORDER BY week_number) AS cumulative_completed
FROM jtbd
GROUP BY student_id, week_number, week_start_date
ORDER BY student_id, week_number;

COMMENT ON TABLE jtbd IS 'v10.6: Weekly execution facts - WHAT got done (Cat-1), not coaching HOW/WHY (Cat-2)';
COMMENT ON COLUMN jtbd.job_type IS 'Category of execution: application, test, award, ec_milestone, academic, essay, other';
COMMENT ON COLUMN jtbd.job_description IS 'Brief factual description of what was accomplished';
COMMENT ON COLUMN jtbd.linked_chip_id IS 'Optional link to related entity (kb_items, outcomes, ec_vitals, etc.)';
COMMENT ON COLUMN jtbd.outcome_metric IS 'Quantifiable result metric (e.g., apps_submitted, funding_raised)';
COMMENT ON COLUMN jtbd.source_id IS 'Provenance: SRC-SNAPSHOT-YYYY-MM-DD (weekly snapshot) or SRC-SESSION-nnn (coaching session)';

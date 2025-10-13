-- =============================================================================
-- EC VITALS SCHEMA - v10.6
-- Pure Fact-Based Metric Tracking for Extracurricular Activities
-- =============================================================================
-- Purpose: Track quantitative progression metrics for ECs/Activities
-- Scope: Cat-1 (Facts-First SQL) - NO coaching intelligence, pure numbers
-- Examples: funding raised ($5k → $23k), students reached (500 → 6.4k)
-- =============================================================================

-- =============================================================================
-- TABLE: ec_vitals
-- =============================================================================
-- Tracks atomic metric values over time for each EC/Activity
-- Enables queries like: "How much funding have I raised?", "Show me scale growth"
-- Temporal resolution: as_of date allows progression tracking

CREATE TABLE IF NOT EXISTS ec_vitals (
  -- Primary key
  vital_id         TEXT PRIMARY KEY,           -- Format: V{nnn} (e.g., V001, V002)

  -- Foreign keys
  student_id       TEXT NOT NULL REFERENCES students(student_id),
  chip_id          TEXT NOT NULL,              -- Links to kb_items.chip_id
  activity_name    TEXT NOT NULL,              -- Denormalized for quick queries

  -- Metric classification (based on CommonApp analysis)
  metric_type      TEXT NOT NULL CHECK (metric_type IN (
    'scale',       -- Members served, participants, geographic reach, audience size
    'financial',   -- Funding raised, revenue, grants, budget managed
    'product',     -- Products shipped, content created, downloads, views
    'leadership',  -- Team size, growth rate, partnerships, role expansion
    'impact',      -- People impacted, media features, social reach, recognition
    'selection'    -- Acceptance rate, selectivity, competition level
  )),
  metric_name      TEXT NOT NULL,              -- Specific metric (e.g., 'funding_raised', 'students_reached')

  -- Value tracking (flexible for different data types)
  numeric_value    NUMERIC,                    -- For quantitative metrics (23000, 6400, 413)
  text_value       TEXT,                       -- For qualitative metrics ("3 publications", "Regional Winner")
  unit             TEXT,                       -- Unit of measurement ('$', 'students', 'members', '%', 'partnerships')

  -- Temporal tracking
  as_of            DATE NOT NULL,              -- Snapshot date (enables progression queries)

  -- Provenance
  source_id        TEXT NOT NULL,              -- Source gating: SRC-GAMEPLAN-*, SRC-COMMONAPP-*, SRC-SNAPSHOT-*

  -- Context & evidence
  notes            TEXT,                       -- Optional context
  evidence_text    TEXT,                       -- Original text where metric was extracted from

  -- Metadata
  created_at       TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  UNIQUE(student_id, chip_id, metric_name, as_of),
  CHECK (numeric_value IS NOT NULL OR text_value IS NOT NULL)  -- At least one value required
);

-- Indexes for performance
CREATE INDEX idx_ec_vitals_student ON ec_vitals(student_id);
CREATE INDEX idx_ec_vitals_chip ON ec_vitals(chip_id);
CREATE INDEX idx_ec_vitals_metric_type ON ec_vitals(metric_type);
CREATE INDEX idx_ec_vitals_metric_name ON ec_vitals(metric_name);
CREATE INDEX idx_ec_vitals_as_of ON ec_vitals(as_of);
CREATE INDEX idx_ec_vitals_source ON ec_vitals(source_id);
CREATE INDEX idx_ec_vitals_student_chip ON ec_vitals(student_id, chip_id);

-- =============================================================================
-- TEMPORAL VIEWS FOR VITALS
-- =============================================================================

-- View: v_ec_vitals_latest
-- Purpose: Get most recent value for each metric per activity
CREATE OR REPLACE VIEW v_ec_vitals_latest AS
SELECT DISTINCT ON (student_id, chip_id, metric_name)
  vital_id,
  student_id,
  chip_id,
  activity_name,
  metric_type,
  metric_name,
  numeric_value,
  text_value,
  unit,
  as_of,
  source_id,
  evidence_text
FROM ec_vitals
ORDER BY student_id, chip_id, metric_name, as_of DESC;

-- View: v_ec_vitals_progression
-- Purpose: Full timeline of metric changes for progression queries
CREATE OR REPLACE VIEW v_ec_vitals_progression AS
SELECT
  vital_id,
  student_id,
  chip_id,
  activity_name,
  metric_type,
  metric_name,
  numeric_value,
  text_value,
  unit,
  as_of,
  source_id,
  evidence_text,
  ROW_NUMBER() OVER (PARTITION BY student_id, chip_id, metric_name ORDER BY as_of) AS nth
FROM ec_vitals
ORDER BY student_id, chip_id, metric_name, as_of;

-- View: v_ec_vitals_by_type
-- Purpose: Aggregate view grouped by metric type for summary queries
CREATE OR REPLACE VIEW v_ec_vitals_by_type AS
SELECT
  student_id,
  metric_type,
  COUNT(DISTINCT chip_id) AS activities_count,
  COUNT(DISTINCT metric_name) AS metrics_count,
  COUNT(*) AS total_snapshots,
  MIN(as_of) AS earliest_snapshot,
  MAX(as_of) AS latest_snapshot
FROM ec_vitals
GROUP BY student_id, metric_type;

-- View: v_ec_vitals_summary
-- Purpose: Student-level summary of all vitals tracking
CREATE OR REPLACE VIEW v_ec_vitals_summary AS
SELECT
  student_id,
  COUNT(DISTINCT chip_id) AS activities_tracked,
  COUNT(DISTINCT metric_name) AS unique_metrics,
  COUNT(*) AS total_snapshots,
  MIN(as_of) AS tracking_start,
  MAX(as_of) AS tracking_latest,
  ARRAY_AGG(DISTINCT metric_type ORDER BY metric_type) AS metric_types_tracked
FROM ec_vitals
GROUP BY student_id;

COMMENT ON TABLE ec_vitals IS 'v10.6: Fact-based metric tracking for EC progression (Cat-1)';
COMMENT ON COLUMN ec_vitals.metric_type IS 'Category from CommonApp analysis: scale, financial, product, leadership, impact, selection';
COMMENT ON COLUMN ec_vitals.metric_name IS 'Specific metric tracked: funding_raised, students_reached, team_size, etc.';
COMMENT ON COLUMN ec_vitals.as_of IS 'Snapshot date - enables temporal progression queries';
COMMENT ON COLUMN ec_vitals.source_id IS 'Source gating: SRC-GAMEPLAN (initial), SRC-COMMONAPP (final), SRC-SNAPSHOT (weekly)';
COMMENT ON COLUMN ec_vitals.evidence_text IS 'Original text from description where metric was extracted';

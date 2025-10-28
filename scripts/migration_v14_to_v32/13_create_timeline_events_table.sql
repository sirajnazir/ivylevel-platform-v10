-- Migration: Create timeline_events table for Growth Transformations Tab
-- Version: v13.1
-- Date: 2025-10-28
-- Purpose: Unified timeline capturing college prep journey combining:
--   - Application lifecycle events
--   - Growth & transformation breakthroughs
--   - Academic milestones
--   - Projects & extracurriculars
--   - Awards & programs

-- ============================================================================
-- TIMELINE EVENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,

  -- Event Classification
  event_type TEXT NOT NULL CHECK (event_type IN (
    'growth_event',      -- HGTI breakthroughs, barrier transformations
    'phase_transition',  -- Foundation → Build → Application → Decision
    'academic',          -- GPA updates, test scores, course milestones
    'application',       -- College app submissions, decisions, deadlines
    'project',           -- EC projects, Alpha/Beta/Launch/Episodes
    'award',             -- Awards and recognitions received
    'program'            -- Summer programs, competitions participated
  )),
  subtype TEXT,          -- More specific categorization (e.g., 'EA', 'RD', 'SAT', 'breakthrough')

  -- Core Event Data
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  description TEXT NOT NULL,
  impact TEXT CHECK (impact IN ('minor', 'moderate', 'major')),

  -- Flexible Metadata (event-type specific data)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Provenance (link back to source data)
  source_table TEXT,     -- Reference to original table (e.g., 'growth_events', 'chips', 'kb_items')
  source_id UUID,        -- Reference to original record ID

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE timeline_events IS 'Unified timeline for Growth Transformations Tab - combines all student journey events';
COMMENT ON COLUMN timeline_events.event_type IS 'Primary event category for filtering and grouping';
COMMENT ON COLUMN timeline_events.subtype IS 'Secondary classification (e.g., application_type: EA/RD, test_type: SAT/ACT)';
COMMENT ON COLUMN timeline_events.metadata IS 'Event-specific JSONB data (e.g., {"college": "MIT", "decision": "Accepted", "scholarship": "$10000"})';
COMMENT ON COLUMN timeline_events.impact IS 'Subjective importance: minor=routine, moderate=significant, major=life-changing';

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_timeline_events_student_date ON timeline_events(student_id, event_date DESC);
CREATE INDEX idx_timeline_events_type ON timeline_events(event_type);
CREATE INDEX idx_timeline_events_impact ON timeline_events(impact) WHERE impact = 'major';
CREATE INDEX idx_timeline_events_source ON timeline_events(source_table, source_id) WHERE source_table IS NOT NULL;
CREATE INDEX idx_timeline_events_metadata ON timeline_events USING gin(metadata);

-- ============================================================================
-- ROW LEVEL SECURITY (STUDENT DATA ISOLATION)
-- ============================================================================

ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY timeline_events_student_isolation ON timeline_events
  USING (student_id = current_setting('app.student_id', true));

COMMENT ON POLICY timeline_events_student_isolation ON timeline_events IS 'Isolate timeline events by student_id session variable';

-- ============================================================================
-- TRIGGER FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_timeline_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER timeline_events_updated_at_trigger
  BEFORE UPDATE ON timeline_events
  FOR EACH ROW
  EXECUTE FUNCTION update_timeline_events_updated_at();

-- ============================================================================
-- SAMPLE METADATA SCHEMAS BY EVENT TYPE
-- ============================================================================

-- event_type: 'growth_event'
-- metadata: {
--   "barrier_type": "INTERNAL_CONFIDENCE",
--   "breakthrough": true,
--   "transformation_delta": 0.35,
--   "coach_reflection": "Overcame fear of public speaking",
--   "student_reflection": "I finally feel confident presenting"
-- }

-- event_type: 'phase_transition'
-- metadata: {
--   "from_phase": "Foundation",
--   "to_phase": "Build",
--   "trigger": "Completed baseline assessment",
--   "readiness_score": 0.78
-- }

-- event_type: 'academic'
-- metadata: {
--   "test_type": "SAT",
--   "score": 1520,
--   "math": 790,
--   "verbal": 730,
--   "attempt": 2
-- }

-- event_type: 'application'
-- metadata: {
--   "college": "MIT",
--   "application_type": "EA",
--   "decision": "Accepted",
--   "scholarship": 15000,
--   "aid_type": "Merit",
--   "submitted_date": "2024-11-01",
--   "decision_date": "2024-12-15"
-- }

-- event_type: 'project'
-- metadata: {
--   "project_name": "AI Research Paper",
--   "project_phase": "Launch",
--   "category": "Research",
--   "hours_invested": 120,
--   "outcomes": ["Published in journal", "Presented at conference"]
-- }

-- event_type: 'award'
-- metadata: {
--   "award_name": "National Merit Finalist",
--   "level": "National",
--   "organization": "National Merit Scholarship Corporation",
--   "prize_amount": 2500
-- }

-- event_type: 'program'
-- metadata: {
--   "program_name": "MIT Launch X",
--   "program_type": "Summer Program",
--   "duration_weeks": 6,
--   "acceptance_rate": "5%",
--   "outcomes": ["Launched startup", "Raised $10k seed"]
-- }

-- ============================================================================
-- MIGRATION STATUS
-- ============================================================================

-- This table is designed to be populated by:
-- 1. Batch import from existing data sources (growth_events, chips, kb_items)
-- 2. Real-time inserts from new events as they occur
-- 3. Manual data entry for historical events not yet captured

-- Next steps:
-- 1. Run data migration script to populate from Huda's college list JSON
-- 2. Extract project milestones from execution docs/transcripts
-- 3. Extract phase transitions from longitudinal analysis
-- 4. Link existing growth_events via source_table/source_id
-- 5. Create VIEW for convenient querying if needed

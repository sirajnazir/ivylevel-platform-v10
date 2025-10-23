-- Migration 006: Interactive Sessions & Coaching Intelligence
-- Date: 2025-10-20
-- Purpose: Add support for interactive coaching sessions powered by Old Huda intelligence

-- ============================================================================
-- INTERACTIVE SESSIONS TABLE
-- ============================================================================
-- Tracks both interactive (real dialogue) and simulated (autonomous) sessions

CREATE TABLE IF NOT EXISTS interactive_sessions (
  session_id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  session_type TEXT NOT NULL CHECK (session_type IN ('assessment', 'week_1_planning', 'weekly_checkin')),
  mode TEXT NOT NULL CHECK (mode IN ('interactive', 'simulated')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  current_layer INTEGER DEFAULT 1,
  total_layers INTEGER NOT NULL,
  intelligence_source TEXT, -- parent_student_id from which coaching intelligence was extracted
  session_state JSONB NOT NULL DEFAULT '{}', -- Stores progress through the session
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_interactive_sessions_student ON interactive_sessions(student_id);
CREATE INDEX idx_interactive_sessions_type ON interactive_sessions(session_type);
CREATE INDEX idx_interactive_sessions_mode ON interactive_sessions(mode);
CREATE INDEX idx_interactive_sessions_completed ON interactive_sessions(completed);

COMMENT ON TABLE interactive_sessions IS 'Tracks interactive coaching sessions (real dialogue) and simulated sessions (autonomous)';
COMMENT ON COLUMN interactive_sessions.mode IS 'interactive = real back-and-forth, simulated = agent generates all responses';
COMMENT ON COLUMN interactive_sessions.intelligence_source IS 'student_id from which coaching patterns were extracted (e.g., huda-2025)';
COMMENT ON COLUMN interactive_sessions.session_state IS 'JSON: {responses: {}, insights_captured: {}, rubric_scores_draft: {}}';

-- ============================================================================
-- COACHING FRAMEWORKS TABLE
-- ============================================================================
-- Stores extracted coaching frameworks (assessment questions, weekly planning, etc.)

CREATE TABLE IF NOT EXISTS coaching_frameworks (
  framework_id TEXT PRIMARY KEY,
  framework_name TEXT NOT NULL, -- '27_layer_assessment', '168_hour_framework', 'rejection_alchemy'
  source_student_id TEXT REFERENCES students(student_id), -- Which student's journey provided this intel
  framework_content JSONB NOT NULL, -- The actual framework structure
  prompts JSONB, -- Conversational prompts for interactive sessions
  tactics_referenced TEXT[], -- Which Jenny tactics this framework uses
  quality_score DECIMAL(3,2) DEFAULT 0.95, -- Confidence in this extraction (0-1)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_coaching_frameworks_name ON coaching_frameworks(framework_name);
CREATE INDEX idx_coaching_frameworks_source ON coaching_frameworks(source_student_id);

COMMENT ON TABLE coaching_frameworks IS 'Extracted coaching intelligence from successful student journeys';
COMMENT ON COLUMN coaching_frameworks.prompts IS 'JSON: {prompts: [{step, prompt, purpose, follow_up_conditions, ...}]}';

-- ============================================================================
-- COACHING INTELLIGENCE EXTRACTION TABLE
-- ============================================================================
-- Tracks raw extractions from Old Huda sessions before converting to frameworks

CREATE TABLE IF NOT EXISTS coaching_intelligence_extraction (
  extraction_id TEXT PRIMARY KEY,
  source_student_id TEXT NOT NULL REFERENCES students(student_id),
  extraction_type TEXT NOT NULL CHECK (extraction_type IN ('assessment_questions', 'weekly_framework', 'tactic_application', 'rejection_handling')),
  week_number INTEGER,
  extracted_content JSONB NOT NULL,
  quality_score DECIMAL(3,2) DEFAULT 0.95,
  extraction_method TEXT, -- 'manual', 'gpt4_analysis', 'pattern_matching'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_coaching_intel_source ON coaching_intelligence_extraction(source_student_id);
CREATE INDEX idx_coaching_intel_type ON coaching_intelligence_extraction(extraction_type);
CREATE INDEX idx_coaching_intel_week ON coaching_intelligence_extraction(week_number);

COMMENT ON TABLE coaching_intelligence_extraction IS 'Raw coaching intelligence extracted from historical sessions';

-- ============================================================================
-- STUDENT TABLE MODIFICATIONS
-- ============================================================================
-- Add assessment_mode preference to students table

ALTER TABLE students ADD COLUMN IF NOT EXISTS assessment_mode TEXT DEFAULT 'interactive' CHECK (assessment_mode IN ('interactive', 'simulated'));
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_student_id TEXT REFERENCES students(student_id); -- Link to "template" student

COMMENT ON COLUMN students.assessment_mode IS 'interactive = real coaching dialogue, simulated = autonomous fast execution';
COMMENT ON COLUMN students.parent_student_id IS 'If this is a "new" student, link to the historical student they are based on (e.g., huda-2025)';

-- ============================================================================
-- UPDATE TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_interactive_sessions_updated_at
BEFORE UPDATE ON interactive_sessions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coaching_frameworks_updated_at
BEFORE UPDATE ON coaching_frameworks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA: Setup New Huda as interactive-mode student
-- ============================================================================

-- Create "New Huda" student linked to Old Huda's intelligence
-- Using actual column names: full_name, target_major, graduation_year
INSERT INTO students (
  student_id,
  email,
  password_hash,
  full_name,
  graduation_year,
  high_school,
  target_major,
  primary_coach_id,
  assessment_mode,
  parent_student_id
) VALUES (
  'huda-2025-new',
  'newhuda@test.com',
  '$2b$10$Y8Z8LqVXJ0fK5H0Z8Y0Z8Y0Z8Y0Z8Y0Z8Y0Z8Y0Z8Y0Z8Y0Z8Y0', -- test password: "test123"
  'Huda New',
  2029, -- Class of 2029 (currently 9th grade)
  'Test High School',
  'Computer Science',
  'jenny', -- Use existing coach_id
  'interactive', -- Use interactive mode
  'huda-2025' -- Based on Old Huda's intelligence
) ON CONFLICT (student_id) DO UPDATE SET
  assessment_mode = 'interactive',
  parent_student_id = 'huda-2025',
  primary_coach_id = 'jenny';

-- Link Old Huda as the intelligence source
UPDATE students
SET assessment_mode = 'simulated' -- Old Huda used simulated mode
WHERE student_id = 'huda-2025';

-- ============================================================================
-- VIEWS FOR EASY QUERYING
-- ============================================================================

-- Active interactive sessions
CREATE OR REPLACE VIEW v_active_interactive_sessions AS
SELECT
  s.session_id,
  s.student_id,
  st.full_name,
  st.email,
  s.session_type,
  s.mode,
  s.current_layer,
  s.total_layers,
  s.intelligence_source,
  s.started_at,
  EXTRACT(EPOCH FROM (NOW() - s.started_at)) / 60 AS duration_minutes,
  s.session_state
FROM interactive_sessions s
JOIN students st ON s.student_id = st.student_id
WHERE s.completed = false
ORDER BY s.started_at DESC;

COMMENT ON VIEW v_active_interactive_sessions IS 'Currently active interactive/simulated sessions';

-- Coaching frameworks catalog
CREATE OR REPLACE VIEW v_coaching_frameworks_catalog AS
SELECT
  f.framework_id,
  f.framework_name,
  f.source_student_id,
  st.full_name AS source_student_name,
  f.quality_score,
  jsonb_array_length(f.prompts->'prompts') AS prompt_count,
  array_length(f.tactics_referenced, 1) AS tactics_count,
  f.created_at
FROM coaching_frameworks f
LEFT JOIN students st ON f.source_student_id = st.student_id
ORDER BY f.created_at DESC;

COMMENT ON VIEW v_coaching_frameworks_catalog IS 'Catalog of available coaching frameworks with metadata';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON interactive_sessions TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON coaching_frameworks TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON coaching_intelligence_extraction TO PUBLIC;
GRANT SELECT ON v_active_interactive_sessions TO PUBLIC;
GRANT SELECT ON v_coaching_frameworks_catalog TO PUBLIC;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify New Huda setup
SELECT
  student_id,
  email,
  full_name,
  assessment_mode,
  parent_student_id
FROM students
WHERE student_id IN ('huda-2025', 'huda-2025-new');

-- Check active sessions
SELECT * FROM v_active_interactive_sessions;

-- Check coaching frameworks
SELECT * FROM v_coaching_frameworks_catalog;

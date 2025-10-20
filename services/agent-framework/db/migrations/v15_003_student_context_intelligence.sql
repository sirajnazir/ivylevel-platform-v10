-- =====================================================================
-- Migration: v15_003_student_context_intelligence.sql
-- Version: v10.3
-- Created: 2025-10-17
-- Purpose: Student context engine for hyper-personalized coaching
--          Stores psycho-behavioral profile, academic context, family
--          dynamics, interests, goals for context-aware intelligence
-- =====================================================================

-- Enable migration mode
SET app.migration = 'true';

-- =====================================================================
-- 1. STUDENT CONTEXT TABLE
--    Purpose: Complete student profile for context-aware coaching
-- =====================================================================

CREATE TABLE IF NOT EXISTS student_context (
  student_id TEXT PRIMARY KEY,
  coach_id TEXT NOT NULL,

  -- Core identity
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  class_year TEXT NOT NULL CHECK (class_year IN ('freshman', 'sophomore', 'junior', 'senior')),
  current_week INTEGER NOT NULL DEFAULT 1,

  -- Psycho-behavioral profile (from assessment)
  psycho_behavioral JSONB NOT NULL DEFAULT '{}'::jsonb,
  /* Structure:
  {
    "personality_type": "Type_B_collaborative",
    "capacity_level": "medium",
    "social_style": "quiet",
    "motivation_drivers": ["community", "curiosity"],
    "risk_tolerance": "low",
    "execution_style": "needs_structure"
  }
  */

  -- Academic context
  academic JSONB NOT NULL DEFAULT '{}'::jsonb,
  /* Structure:
  {
    "gpa_weighted": 4.3,
    "gpa_unweighted": 3.9,
    "test_scores": {
      "sat": 1530,
      "act": null,
      "ap_count": 11
    },
    "school_competitiveness": "non_competitive",
    "school_name": "Local High School",
    "class_rank": null
  }
  */

  -- Family dynamics
  family JSONB NOT NULL DEFAULT '{}'::jsonb,
  /* Structure:
  {
    "parent_involvement": "high",
    "parent_anxiety_level": 7,
    "parent_concerns": ["identity emphasis", "college prestige"],
    "cultural_factors": ["Muslim", "Indian"],
    "family_constraints": []
  }
  */

  -- Interests & narrative
  interests JSONB NOT NULL DEFAULT '{}'::jsonb,
  /* Structure:
  {
    "primary_passions": ["film", "game_dev", "algorithmic_justice"],
    "skills": ["coding", "storytelling", "design"],
    "unique_angles": ["Muslim in tech", "quiet leadership"],
    "identity_fusion": "Film × CS → Digital Storyteller"
  }
  */

  -- Goals & targets
  goals JSONB NOT NULL DEFAULT '{}'::jsonb,
  /* Structure:
  {
    "target_schools": [
      {"name": "USC Games", "probability": 0.15, "strategic_priority": 1},
      {"name": "Stanford CS", "probability": 0.01, "strategic_priority": 3}
    ],
    "target_major": "Computer Science / Game Design",
    "career_interests": ["game developer", "digital storyteller"]
  }
  */

  -- Current state (tracking progress)
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  /* Structure:
  {
    "identity_score": 2,
    "confidence_level": 0.2,
    "rubric_scores": {
      "academics": 7,
      "leadership": 2,
      "service": 1,
      "artifacts": 3,
      "recognition": 1,
      "total": 14
    },
    "lifecycle_state": "onboarded"
  }
  */

  -- Extensibility for specialty coaches
  custom_context JSONB,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Foreign keys
  FOREIGN KEY (coach_id) REFERENCES coaches(coach_id)
);

CREATE INDEX IF NOT EXISTS idx_student_context_coach_id ON student_context(coach_id);
CREATE INDEX IF NOT EXISTS idx_student_context_class_year ON student_context(class_year);
CREATE INDEX IF NOT EXISTS idx_student_context_current_week ON student_context(current_week);

COMMENT ON TABLE student_context IS 'Complete student profile for hyper-personalized, context-aware coaching';

-- =====================================================================
-- 2. COACH INTELLIGENCE REGISTRY
--    Purpose: Track which coaches have which intelligence layers/tools
-- =====================================================================

CREATE TABLE IF NOT EXISTS coach_intelligence (
  coach_id TEXT PRIMARY KEY,
  coach_name TEXT NOT NULL,
  specialty TEXT[] NOT NULL,
  credibility_markers TEXT[] NOT NULL,

  -- Intelligence configuration
  intelligence_layers INTEGER NOT NULL DEFAULT 31,
  personas INTEGER NOT NULL DEFAULT 7,

  -- Custom tools registry
  custom_tools JSONB NOT NULL DEFAULT '[]'::jsonb,
  /* Structure:
  [
    {
      "tool_id": "ncwit_insider",
      "name": "NCWIT Insider Strategy",
      "description": "Jenny won NCWIT twice, knows what wins",
      "applicable_to": ["STEM", "female", "underrepresented"]
    }
  ]
  */

  -- Pattern library (grows with experience)
  pattern_library JSONB NOT NULL DEFAULT '{}'::jsonb,
  /* Structure:
  {
    "assessments_completed": 1,
    "gameplans_generated": 1,
    "students_coached": 1,
    "success_patterns": [
      {
        "pattern_name": "Type_B_community_angle",
        "student_archetype": "Type_B_collaborative",
        "outcome_achieved": "NCWIT National Award",
        "reusable": true
      }
    ]
  }
  */

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Foreign key
  FOREIGN KEY (coach_id) REFERENCES coaches(coach_id)
);

COMMENT ON TABLE coach_intelligence IS 'Coach intelligence layers, custom tools, and pattern library';

-- =====================================================================
-- 3. STUDENT-COACH ASSIGNMENTS
--    Purpose: Enforce isolation - students only see their coach's agents
--    NOTE: Table already exists, we just need to ensure FK compatibility
-- =====================================================================

-- Table already exists with schema:
-- student_id, coach_id, assigned_at, assigned_by, is_primary, role,
-- is_active, unassigned_at, unassignment_reason

-- Just ensure it has the proper foreign key to coach_intelligence if needed
-- (Will be handled by seed data using existing FK to coaches table)

-- =====================================================================
-- 4. ASSESSMENT SESSIONS
--    Purpose: Track autonomous assessment sessions
-- =====================================================================

CREATE TABLE IF NOT EXISTS assessment_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL,
  coach_id TEXT NOT NULL,

  -- Session metadata
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_minutes INTEGER,

  -- Assessment results
  diagnostic_result JSONB,
  eq_profile JSONB,
  rubric_scores JSONB,
  time_architecture JSONB,
  gap_analysis JSONB,

  -- Intelligence layer execution
  layers_executed INTEGER DEFAULT 0,
  synthesis_moment_timestamp TIMESTAMPTZ,

  -- Assessment outcome
  assessment_complete BOOLEAN DEFAULT FALSE,
  gameplan_triggered BOOLEAN DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  FOREIGN KEY (student_id) REFERENCES student_context(student_id),
  FOREIGN KEY (coach_id) REFERENCES coach_intelligence(coach_id)
);

CREATE INDEX IF NOT EXISTS idx_assessment_sessions_student ON assessment_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_coach ON assessment_sessions(coach_id);
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_complete ON assessment_sessions(assessment_complete);

COMMENT ON TABLE assessment_sessions IS 'Autonomous assessment sessions with 27-layer execution tracking';

-- =====================================================================
-- 5. GAMEPLAN REPORTS
--    Purpose: Track autonomous gameplan generation
-- =====================================================================

CREATE TABLE IF NOT EXISTS gameplan_reports (
  gameplan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL,
  coach_id TEXT NOT NULL,
  assessment_session_id UUID,

  -- Gameplan content
  four_pillar_plan JSONB NOT NULL,
  priority_ladder JSONB NOT NULL,
  timeline JSONB NOT NULL,
  parent_brief JSONB NOT NULL,

  -- Dual-layer messaging
  dual_layer_encoded BOOLEAN DEFAULT TRUE,

  -- Strategic calculations (hidden from student)
  hidden_target_school TEXT,  -- e.g., "USC Games"
  probability_calculations JSONB,

  -- Generation metadata
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_to_student BOOLEAN DEFAULT FALSE,
  delivered_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  FOREIGN KEY (student_id) REFERENCES student_context(student_id),
  FOREIGN KEY (coach_id) REFERENCES coach_intelligence(coach_id),
  FOREIGN KEY (assessment_session_id) REFERENCES assessment_sessions(session_id)
);

CREATE INDEX IF NOT EXISTS idx_gameplan_reports_student ON gameplan_reports(student_id);
CREATE INDEX IF NOT EXISTS idx_gameplan_reports_coach ON gameplan_reports(coach_id);

COMMENT ON TABLE gameplan_reports IS 'Autonomous gameplan generation with dual-layer messaging';

-- =====================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
--    Purpose: Enforce student-coach isolation at database level
-- =====================================================================

ALTER TABLE student_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_coach_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gameplan_reports ENABLE ROW LEVEL SECURITY;

-- Policy: student_context - students see only their own data
DROP POLICY IF EXISTS student_context_isolation ON student_context;
CREATE POLICY student_context_isolation ON student_context
  USING (
    student_id = current_setting('app.student_id', true)::text
    OR coach_id = current_setting('app.coach_id', true)::text
  );

-- Policy: assessment_sessions - students see only their sessions with their coach
DROP POLICY IF EXISTS assessment_sessions_isolation ON assessment_sessions;
CREATE POLICY assessment_sessions_isolation ON assessment_sessions
  USING (
    student_id = current_setting('app.student_id', true)::text
    OR coach_id = current_setting('app.coach_id', true)::text
  );

-- Policy: gameplan_reports - students see only their gameplans from their coach
DROP POLICY IF EXISTS gameplan_reports_isolation ON gameplan_reports;
CREATE POLICY gameplan_reports_isolation ON gameplan_reports
  USING (
    student_id = current_setting('app.student_id', true)::text
    OR coach_id = current_setting('app.coach_id', true)::text
  );

-- =====================================================================
-- 7. SEED DATA - HUDA'S BASELINE CONTEXT
-- =====================================================================

-- Ensure Huda exists in students table
INSERT INTO students (student_id, full_name, email, phone, grad_year, graduation_year, gpa_weighted, gpa_unweighted, sat_score, ap_courses_count, high_school)
VALUES ('huda-2025', 'Huda', 'huda@example.com', '+1234567890', 2025, 2025, 4.30, 3.90, 1360, 11, 'Local High School')
ON CONFLICT (student_id) DO UPDATE SET
  gpa_weighted = EXCLUDED.gpa_weighted,
  gpa_unweighted = EXCLUDED.gpa_unweighted,
  sat_score = EXCLUDED.sat_score,
  ap_courses_count = EXCLUDED.ap_courses_count;

-- Insert Jenny as coach (using existing coach_id 'jenny')
INSERT INTO coach_intelligence (coach_id, coach_name, specialty, credibility_markers, intelligence_layers, personas, custom_tools, pattern_library)
VALUES (
  'jenny',
  'Jenny Duan',
  ARRAY['builder', 'STEM', 'underrepresented', 'games', 'CS'],
  ARRAY['Stanford', 'NCWIT winner', 'KWK instructor'],
  31,
  7,
  '[
    {
      "tool_id": "ncwit_insider",
      "name": "NCWIT Insider Strategy",
      "description": "Jenny won NCWIT twice, knows what wins",
      "applicable_to": ["STEM", "female", "underrepresented"]
    },
    {
      "tool_id": "builder_strategy",
      "name": "Passion Project Builder",
      "description": "Jenny specializes in scaling student projects",
      "applicable_to": ["Type_B_collaborative", "coding"]
    },
    {
      "tool_id": "usc_games_optimization",
      "name": "USC Games Strategic Alignment",
      "description": "Hidden optimization for USC Games admissions",
      "applicable_to": ["game_dev", "film", "CS"]
    }
  ]'::jsonb,
  '{
    "assessments_completed": 1,
    "gameplans_generated": 1,
    "students_coached": 1,
    "success_patterns": []
  }'::jsonb
)
ON CONFLICT (coach_id) DO UPDATE SET
  specialty = EXCLUDED.specialty,
  credibility_markers = EXCLUDED.credibility_markers,
  custom_tools = EXCLUDED.custom_tools;

-- Insert Huda's baseline context (Week 1, before assessment)
INSERT INTO student_context (
  student_id,
  coach_id,
  name,
  email,
  phone,
  class_year,
  current_week,
  psycho_behavioral,
  academic,
  family,
  interests,
  goals,
  state
)
VALUES (
  'huda-2025',
  'jenny',
  'Huda',
  'huda@example.com',
  '+1234567890',
  'junior',
  1,
  '{
    "personality_type": "Type_B_collaborative",
    "capacity_level": "medium",
    "social_style": "quiet",
    "motivation_drivers": ["community", "curiosity"],
    "risk_tolerance": "low",
    "execution_style": "needs_structure"
  }'::jsonb,
  '{
    "gpa_weighted": 4.3,
    "gpa_unweighted": 3.9,
    "test_scores": {
      "sat": 1360,
      "act": null,
      "ap_count": 11
    },
    "school_competitiveness": "non_competitive",
    "school_name": "Local High School",
    "class_rank": null
  }'::jsonb,
  '{
    "parent_involvement": "high",
    "parent_anxiety_level": 7,
    "parent_concerns": ["identity emphasis", "college prestige"],
    "cultural_factors": ["Muslim", "Indian"],
    "family_constraints": []
  }'::jsonb,
  '{
    "primary_passions": ["film", "game_dev", "computer_science"],
    "skills": ["coding", "storytelling", "design"],
    "unique_angles": ["Muslim in tech", "quiet leadership"],
    "identity_fusion": null
  }'::jsonb,
  '{
    "target_schools": [
      {"name": "Stanford CS", "probability": 0.01, "strategic_priority": 3},
      {"name": "USC Games", "probability": 0.15, "strategic_priority": 1},
      {"name": "MIT", "probability": 0.02, "strategic_priority": 2}
    ],
    "target_major": "Computer Science",
    "career_interests": ["game developer", "software engineer"]
  }'::jsonb,
  '{
    "identity_score": 2,
    "confidence_level": 0.2,
    "rubric_scores": {
      "academics": 7,
      "leadership": 2,
      "service": 1,
      "artifacts": 3,
      "recognition": 0,
      "total": 13
    },
    "lifecycle_state": "onboarded"
  }'::jsonb
)
ON CONFLICT (student_id) DO UPDATE SET
  psycho_behavioral = EXCLUDED.psycho_behavioral,
  academic = EXCLUDED.academic,
  family = EXCLUDED.family,
  interests = EXCLUDED.interests,
  goals = EXCLUDED.goals,
  state = EXCLUDED.state;

-- Huda already assigned to Jenny in student_coach_assignments
-- (assignment already exists: student_id='huda-2025', coach_id='jenny', is_primary=true)

-- =====================================================================
-- 8. HELPER FUNCTIONS
-- =====================================================================

-- Function: Get student's assigned coach
CREATE OR REPLACE FUNCTION get_student_coach(p_student_id TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT coach_id
    FROM student_coach_assignments
    WHERE student_id = p_student_id
      AND is_active = TRUE
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql;

-- Function: Check if student should see this agent
CREATE OR REPLACE FUNCTION can_student_access_agent(p_student_id TEXT, p_agent_coach_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM student_coach_assignments
    WHERE student_id = p_student_id
      AND coach_id = p_agent_coach_id
      AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================

COMMENT ON SCHEMA public IS 'v10.3 - Student context engine with coach-student isolation';

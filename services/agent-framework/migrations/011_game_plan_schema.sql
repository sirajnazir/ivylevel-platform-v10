-- Migration 011: Game Plan Schema
-- Version: v12.0
-- Date: 2025-10-28
-- Description: Creates game plan tables for multi-year precision roadmap

-- Enable migration mode
SET app.migration = true;

-- ============================================================================
-- TABLE 1: game_plans
-- ============================================================================
CREATE TABLE IF NOT EXISTS game_plans (
  game_plan_id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL, -- 'Jenny' | 'Agent' | 'System'
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,

  -- Profile Assessment (JSONB)
  profile_assessment JSONB NOT NULL,

  -- Readiness Tracking (JSONB)
  readiness_score JSONB NOT NULL,

  -- Strategic Components (JSONB)
  target_profile JSONB NOT NULL,
  target_schools JSONB,

  -- Current Phase
  current_phase_id TEXT,

  -- Context (JSONB)
  school_context JSONB,
  family_context JSONB,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_game_plans_student ON game_plans(student_id);
CREATE INDEX idx_game_plans_version ON game_plans(student_id, version DESC);

COMMENT ON TABLE game_plans IS 'v12.0 - Multi-year game plans for students with profile assessment and readiness tracking';
COMMENT ON COLUMN game_plans.profile_assessment IS 'ProfileAssessment: standout_strengths[], weak_spots[], unique_story, potential_spikes[]';
COMMENT ON COLUMN game_plans.readiness_score IS 'ReadinessScore: overall_score, dimensional_scores[], historical_scores[]';
COMMENT ON COLUMN game_plans.target_profile IS 'TargetProfile: profile_name, three_pillar_model{aptitude,passion,service}, narrative';

-- ============================================================================
-- TABLE 2: game_plan_phases
-- ============================================================================
CREATE TABLE IF NOT EXISTS game_plan_phases (
  phase_id TEXT PRIMARY KEY,
  game_plan_id TEXT NOT NULL REFERENCES game_plans(game_plan_id) ON DELETE CASCADE,
  phase_number INTEGER NOT NULL,
  phase_name TEXT NOT NULL,

  -- Timeline
  start_week INTEGER NOT NULL,
  end_week INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Content
  goal TEXT NOT NULL,
  expected_outcomes JSONB NOT NULL,
  success_criteria JSONB,

  -- Status
  status TEXT NOT NULL CHECK (status IN ('not_started', 'in_progress', 'completed')),
  completion_percentage INTEGER NOT NULL DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_phases_game_plan ON game_plan_phases(game_plan_id);
CREATE INDEX idx_phases_status ON game_plan_phases(game_plan_id, status);
CREATE INDEX idx_phases_week_range ON game_plan_phases(start_week, end_week);

COMMENT ON TABLE game_plan_phases IS 'v12.0 - Game plan phases (e.g., Exploration & Convergence, Deepening & Achieving)';
COMMENT ON COLUMN game_plan_phases.expected_outcomes IS 'ExpectedOutcome[]: {outcome_id, category, description, target_date, achieved, evidence}';

-- ============================================================================
-- TABLE 3: game_plan_milestones
-- ============================================================================
CREATE TABLE IF NOT EXISTS game_plan_milestones (
  milestone_id TEXT PRIMARY KEY,
  phase_id TEXT NOT NULL REFERENCES game_plan_phases(phase_id) ON DELETE CASCADE,

  -- Details
  title TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Timeline
  target_week INTEGER NOT NULL,
  target_date DATE NOT NULL,

  -- Status
  status TEXT NOT NULL CHECK (status IN ('not_started', 'in_progress', 'completed', 'blocked', 'missed')),

  -- Links
  linked_weak_spot_id TEXT,
  linked_opportunity_id TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_milestones_phase ON game_plan_milestones(phase_id);
CREATE INDEX idx_milestones_status ON game_plan_milestones(status);
CREATE INDEX idx_milestones_target_week ON game_plan_milestones(target_week);
CREATE INDEX idx_milestones_target_date ON game_plan_milestones(target_date);

COMMENT ON TABLE game_plan_milestones IS 'v12.0 - Key milestones within game plan phases';

-- ============================================================================
-- TABLE 4: tactical_plans
-- ============================================================================
CREATE TABLE IF NOT EXISTS tactical_plans (
  tactical_plan_id TEXT PRIMARY KEY,
  phase_id TEXT NOT NULL REFERENCES game_plan_phases(phase_id) ON DELETE CASCADE,

  -- Details
  title TEXT NOT NULL,
  objective TEXT NOT NULL,

  -- Priority
  priority TEXT NOT NULL CHECK (priority IN ('P0', 'P1', 'P2')),

  -- Timeline
  start_week INTEGER NOT NULL,
  end_week INTEGER NOT NULL,

  -- Content (JSONB)
  steps JSONB NOT NULL,
  metrics JSONB,

  -- Status
  status TEXT NOT NULL CHECK (status IN ('not_started', 'in_progress', 'completed', 'blocked')),
  completion_percentage INTEGER NOT NULL DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),

  -- Links
  linked_weekly_plans JSONB,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tactical_plans_phase ON tactical_plans(phase_id);
CREATE INDEX idx_tactical_plans_priority ON tactical_plans(priority);
CREATE INDEX idx_tactical_plans_status ON tactical_plans(status);

COMMENT ON TABLE tactical_plans IS 'v12.0 - Tactical plans for addressing weak spots and achieving phase goals';
COMMENT ON COLUMN tactical_plans.steps IS 'TacticalStep[]: {step_id, step_number, description, target_week_range, metric, status}';
COMMENT ON COLUMN tactical_plans.metrics IS 'Metric[]: {metric_id, metric_name, metric_type, target_value, current_value, unit}';

-- ============================================================================
-- TABLE 5: opportunities
-- ============================================================================
CREATE TABLE IF NOT EXISTS opportunities (
  opportunity_id TEXT PRIMARY KEY,
  game_plan_id TEXT NOT NULL REFERENCES game_plans(game_plan_id) ON DELETE CASCADE,

  -- Details
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('summer_program', 'competition', 'award', 'internship', 'volunteer', 'research')),

  description TEXT NOT NULL,
  why_recommended TEXT NOT NULL,

  -- Timeline
  deadline TIMESTAMPTZ NOT NULL,

  -- Content (JSONB)
  application_requirements JSONB,
  time_commitment TEXT,
  expected_outcomes JSONB,

  -- Priority
  priority TEXT NOT NULL CHECK (priority IN ('P0', 'P1', 'P2')),

  -- Status
  status TEXT NOT NULL CHECK (status IN ('recommended', 'researching', 'applying', 'accepted', 'declined', 'completed')),

  -- Links
  linked_weak_spot_ids JSONB,
  linked_tactical_plan_id TEXT REFERENCES tactical_plans(tactical_plan_id),

  -- Application Progress (JSONB)
  application_progress JSONB,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_opportunities_game_plan ON opportunities(game_plan_id);
CREATE INDEX idx_opportunities_deadline ON opportunities(deadline);
CREATE INDEX idx_opportunities_priority ON opportunities(priority);
CREATE INDEX idx_opportunities_status ON opportunities(status);
CREATE INDEX idx_opportunities_category ON opportunities(category);

COMMENT ON TABLE opportunities IS 'v12.0 - Time-sensitive opportunities (programs, competitions, awards) with deadlines';
COMMENT ON COLUMN opportunities.application_progress IS '{requirements_completed, requirements_total, submitted_date, decision_date, outcome}';

-- ============================================================================
-- TABLE 6: application_components
-- ============================================================================
CREATE TABLE IF NOT EXISTS application_components (
  component_id TEXT PRIMARY KEY,
  game_plan_id TEXT NOT NULL REFERENCES game_plans(game_plan_id) ON DELETE CASCADE,

  -- Type
  component_type TEXT NOT NULL CHECK (component_type IN ('common_app_essay', 'supplemental_essay', 'activity_list', 'lor', 'test_scores', 'transcript')),

  -- Details
  title TEXT NOT NULL,
  description TEXT,

  -- Links (JSONB)
  linked_game_plan_elements JSONB NOT NULL,

  -- Status
  status TEXT NOT NULL CHECK (status IN ('not_started', 'drafting', 'revising', 'completed')),

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_application_components_game_plan ON application_components(game_plan_id);
CREATE INDEX idx_application_components_type ON application_components(component_type);
CREATE INDEX idx_application_components_status ON application_components(status);

COMMENT ON TABLE application_components IS 'v12.0 - College application components linked to game plan evidence';
COMMENT ON COLUMN application_components.linked_game_plan_elements IS '{strength_ids[], pillar_names[], milestone_ids[], opportunity_ids[]}';

-- ============================================================================
-- TABLE 7: Update weekly_vitals with game plan links
-- ============================================================================
ALTER TABLE weekly_vitals
ADD COLUMN IF NOT EXISTS linked_milestone_ids JSONB,
ADD COLUMN IF NOT EXISTS linked_tactical_plan_ids JSONB;

CREATE INDEX IF NOT EXISTS idx_weekly_vitals_milestones ON weekly_vitals USING GIN (linked_milestone_ids);
CREATE INDEX IF NOT EXISTS idx_weekly_vitals_tactical_plans ON weekly_vitals USING GIN (linked_tactical_plan_ids);

COMMENT ON COLUMN weekly_vitals.linked_milestone_ids IS 'v12.0 - Array of milestone_ids due this week';
COMMENT ON COLUMN weekly_vitals.linked_tactical_plan_ids IS 'v12.0 - Array of tactical_plan_ids with steps this week';

-- ============================================================================
-- COMPLETION MARKER
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Migration 011 completed successfully - Game Plan Schema v12.0 created';
END $$;

-- Migration 012: GamePlan Dynamic Adaptive Enhancements
-- Version: v13.0
-- Date: 2025-10-29
-- Description: Enhances existing v12.0 game_plans schema with dynamic adaptive primitives
--              Adds support for quarterly reviews, event-driven pivots, parallel plans,
--              living document sync, and version history tracking

-- Enable migration mode
SET app.migration = true;

-- ============================================================================
-- ENHANCEMENT 1: Add dynamic fields to existing game_plans table
-- ============================================================================

-- Add new columns to game_plans (backward compatible)
ALTER TABLE game_plans
ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'single' CHECK (plan_type IN ('single', 'parallel', 'converged')),
ADD COLUMN IF NOT EXISTS revision_trigger TEXT CHECK (revision_trigger IN ('initial', 'quarterly_review', 'event_driven', 'escalation', 'reassessment')),
ADD COLUMN IF NOT EXISTS long_term_vision JSONB, -- 2-year quarterly roadmap (strategic north star)
ADD COLUMN IF NOT EXISTS tactical_horizon JSONB, -- Next 3 months weekly tasks (synced with WeeklyExecution)
ADD COLUMN IF NOT EXISTS convergence_status TEXT CHECK (convergence_status IN ('exploring', 'narrowing', 'converged', NULL)),
ADD COLUMN IF NOT EXISTS convergence_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_review_date TIMESTAMPTZ; -- Automatic quarterly review trigger

CREATE INDEX IF NOT EXISTS idx_game_plans_plan_type ON game_plans(plan_type);
CREATE INDEX IF NOT EXISTS idx_game_plans_next_review ON game_plans(next_review_date) WHERE next_review_date IS NOT NULL;

COMMENT ON COLUMN game_plans.plan_type IS 'v13.0 - Type: single (decided), parallel (exploring multiple), converged (was parallel, now decided)';
COMMENT ON COLUMN game_plans.revision_trigger IS 'v13.0 - What triggered this version: initial, quarterly_review, event_driven, escalation, reassessment';
COMMENT ON COLUMN game_plans.long_term_vision IS 'v13.0 - 2-year strategic roadmap {quarters: [{quarter_name, start_week, end_week, goal, key_milestones}]}';
COMMENT ON COLUMN game_plans.tactical_horizon IS 'v13.0 - Next 3 months tactical view {weeks: [{week_number, top_3_tasks, deadlines, linked_milestone_ids}]}';
COMMENT ON COLUMN game_plans.convergence_status IS 'v13.0 - For parallel plans: exploring → narrowing → converged';
COMMENT ON COLUMN game_plans.next_review_date IS 'v13.0 - Auto-calculated: created_date + 12 weeks, triggers quarterly review';

-- ============================================================================
-- TABLE 1: gameplan_revisions (version history tracking)
-- Note: Foreign keys to gameplan_events and quarterly_reviews added later to avoid circular dependency
-- ============================================================================
CREATE TABLE IF NOT EXISTS gameplan_revisions (
  revision_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_plan_id TEXT NOT NULL REFERENCES game_plans(game_plan_id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,

  -- Revision metadata
  revision_trigger TEXT NOT NULL CHECK (revision_trigger IN ('quarterly_review', 'event_driven', 'escalation', 'reassessment', 'parallel_convergence')),
  revision_reason TEXT NOT NULL, -- Human-readable explanation
  revised_by TEXT NOT NULL, -- 'GamePlanAgent' | 'WeeklyExecutionAgent' | 'Jenny'

  -- State snapshots (what changed)
  previous_state JSONB NOT NULL, -- Snapshot of game_plan before revision
  new_state JSONB NOT NULL,      -- Snapshot of game_plan after revision

  -- Impact tracking
  rubric_score_change INTEGER, -- e.g., +3 (improved from 15 → 18)
  target_school_change TEXT,   -- e.g., "Added USC Games as primary target"
  phase_adjustment TEXT,        -- e.g., "Extended Phase 1 by 4 weeks"

  -- Context (foreign keys added later)
  triggering_event_id UUID, -- Will reference gameplan_events(event_id)
  review_id UUID,           -- Will reference quarterly_reviews(review_id)

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_revisions_game_plan ON gameplan_revisions(game_plan_id, version_number DESC);
CREATE INDEX idx_revisions_trigger ON gameplan_revisions(revision_trigger);
CREATE INDEX idx_revisions_date ON gameplan_revisions(created_at DESC);

COMMENT ON TABLE gameplan_revisions IS 'v13.0 - Version history tracking for game plans with state snapshots and change reasons';
COMMENT ON COLUMN gameplan_revisions.previous_state IS 'JSONB snapshot: {target_profile, target_schools, phases[], rubric_scores, etc.}';
COMMENT ON COLUMN gameplan_revisions.new_state IS 'JSONB snapshot after revision (same structure as previous_state)';

-- ============================================================================
-- TABLE 2: gameplan_events (significant milestones/setbacks)
-- ============================================================================
CREATE TABLE IF NOT EXISTS gameplan_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL,
  game_plan_id TEXT REFERENCES game_plans(game_plan_id) ON DELETE CASCADE,

  -- Event details
  event_type TEXT NOT NULL CHECK (event_type IN (
    'award_won', 'award_lost', 'program_accepted', 'program_rejected',
    'competition_win', 'competition_loss', 'leadership_achieved',
    'burnout_detected', 'off_track_3_weeks', 'major_life_change',
    'parent_intervention', 'target_school_visit', 'reassessment_triggered'
  )),
  event_title TEXT NOT NULL,
  event_description TEXT,

  -- Significance scoring
  significance TEXT NOT NULL CHECK (significance IN ('MAJOR', 'MODERATE', 'MINOR')),
  impact_on_profile JSONB, -- {rubric_dimension: 'recognition', score_change: +2, explanation: '...'}

  -- Timeline
  week_number INTEGER NOT NULL,
  event_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Actions taken
  triggered_revision BOOLEAN DEFAULT false,
  revision_id UUID REFERENCES gameplan_revisions(revision_id),
  recommended_actions JSONB, -- [{action: 'Pivot to X', priority: 'P0', rationale: '...'}]

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_student ON gameplan_events(student_id);
CREATE INDEX idx_events_game_plan ON gameplan_events(game_plan_id);
CREATE INDEX idx_events_type ON gameplan_events(event_type);
CREATE INDEX idx_events_significance ON gameplan_events(significance);
CREATE INDEX idx_events_week ON gameplan_events(week_number);
CREATE INDEX idx_events_date ON gameplan_events(event_date DESC);

COMMENT ON TABLE gameplan_events IS 'v13.0 - Significant events (awards, programs, life changes) that may trigger game plan revisions';
COMMENT ON COLUMN gameplan_events.impact_on_profile IS 'JSONB: {rubric_dimension, score_change, new_opportunities[], blocked_paths[]}';
COMMENT ON COLUMN gameplan_events.recommended_actions IS 'JSONB array: [{action, priority, rationale, estimated_weeks}]';

-- ============================================================================
-- TABLE 3: quarterly_reviews (scheduled assessments every 12 weeks)
-- ============================================================================
CREATE TABLE IF NOT EXISTS quarterly_reviews (
  review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL,
  game_plan_id TEXT NOT NULL REFERENCES game_plans(game_plan_id) ON DELETE CASCADE,

  -- Review period
  quarter TEXT NOT NULL, -- e.g., "Q1 2024-25", "Q2 2024-25"
  review_week_start INTEGER NOT NULL,
  review_week_end INTEGER NOT NULL,
  review_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Planned vs Actual outcomes
  planned_outcomes JSONB NOT NULL, -- From original game plan phase
  actual_outcomes JSONB NOT NULL,  -- What actually happened

  -- Rubric progress tracking
  previous_rubric_scores JSONB NOT NULL, -- At start of quarter
  current_rubric_scores JSONB NOT NULL,  -- At end of quarter
  rubric_score_delta INTEGER NOT NULL,   -- Total change (e.g., +3)

  -- Progress velocity assessment
  progress_velocity TEXT NOT NULL CHECK (progress_velocity IN ('ahead', 'on_track', 'behind', 'stalled')),
  velocity_explanation TEXT NOT NULL,

  -- Recommendations for next quarter
  continue_actions JSONB, -- What's working well
  stop_actions JSONB,     -- What to stop doing
  start_actions JSONB,    -- New initiatives

  -- Revision decision
  requires_revision BOOLEAN DEFAULT false,
  revision_id UUID REFERENCES gameplan_revisions(revision_id),

  -- Metadata
  reviewed_by TEXT NOT NULL, -- 'GamePlanAgent' | 'Jenny' | 'System'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quarterly_reviews_student ON quarterly_reviews(student_id);
CREATE INDEX idx_quarterly_reviews_game_plan ON quarterly_reviews(game_plan_id);
CREATE INDEX idx_quarterly_reviews_quarter ON quarterly_reviews(quarter);
CREATE INDEX idx_quarterly_reviews_velocity ON quarterly_reviews(progress_velocity);
CREATE INDEX idx_quarterly_reviews_date ON quarterly_reviews(review_date DESC);

COMMENT ON TABLE quarterly_reviews IS 'v13.0 - Scheduled quarterly assessments (every 12 weeks) to track progress and adapt game plan';
COMMENT ON COLUMN quarterly_reviews.planned_outcomes IS 'JSONB array: [{milestone, target_date, completion_status, evidence}]';
COMMENT ON COLUMN quarterly_reviews.actual_outcomes IS 'JSONB array: [{what_happened, variance_from_plan, impact}]';
COMMENT ON COLUMN quarterly_reviews.continue_actions IS 'JSONB array: [{action, impact_score, reason_to_continue}]';

-- ============================================================================
-- TABLE 4: parallel_plans (for undecided students exploring multiple paths)
-- ============================================================================
CREATE TABLE IF NOT EXISTS parallel_plans (
  parallel_plan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL,
  parent_game_plan_id TEXT NOT NULL REFERENCES game_plans(game_plan_id) ON DELETE CASCADE,

  -- Path details
  major_focus TEXT NOT NULL, -- e.g., "Computer Science", "Chemical Engineering", "Pre-Med"
  target_schools TEXT[], -- e.g., ["MIT", "Stanford", "CMU"]
  target_profile_name TEXT, -- e.g., "The AI Researcher", "The ChemEng Innovator"

  -- Confidence tracking
  confidence_score DECIMAL NOT NULL CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
  confidence_trajectory JSONB, -- [{week, score, reason_for_change}]

  -- Status lifecycle: exploring → narrowing → converged → eliminated
  status TEXT NOT NULL DEFAULT 'exploring' CHECK (status IN ('exploring', 'narrowing', 'converged', 'eliminated')),

  -- Decision signals
  passion_signals JSONB, -- [{signal: 'Loved game dev internship', strength: 0.8, week: 12}]
  aptitude_signals JSONB, -- [{signal: 'A+ in AP Chem', strength: 0.9, week: 8}]
  elimination_reasons JSONB, -- If status='eliminated': [{reason, week_eliminated}]
  convergence_date TIMESTAMPTZ, -- If status='converged'

  -- Linked game plan
  child_game_plan_id TEXT REFERENCES game_plans(game_plan_id), -- If converged, new focused game plan

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_parallel_plans_student ON parallel_plans(student_id);
CREATE INDEX idx_parallel_plans_parent ON parallel_plans(parent_game_plan_id);
CREATE INDEX idx_parallel_plans_status ON parallel_plans(status);
CREATE INDEX idx_parallel_plans_confidence ON parallel_plans(confidence_score DESC);

COMMENT ON TABLE parallel_plans IS 'v13.0 - Multiple parallel game plans for undecided students (e.g., Hiba exploring 4 majors)';
COMMENT ON COLUMN parallel_plans.confidence_score IS 'Current confidence in this path (0.0-1.0), updated weekly based on signals';
COMMENT ON COLUMN parallel_plans.passion_signals IS 'JSONB array: Evidence student enjoys this path';
COMMENT ON COLUMN parallel_plans.aptitude_signals IS 'JSONB array: Evidence student excels in this path';

-- ============================================================================
-- ENHANCEMENT 2: Add revision tracking to game_plan_phases
-- ============================================================================

ALTER TABLE game_plan_phases
ADD COLUMN IF NOT EXISTS original_start_week INTEGER,
ADD COLUMN IF NOT EXISTS original_end_week INTEGER,
ADD COLUMN IF NOT EXISTS phase_extended_weeks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS phase_revision_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_revised_date TIMESTAMPTZ;

COMMENT ON COLUMN game_plan_phases.original_start_week IS 'v13.0 - Original planned start week (for tracking drift)';
COMMENT ON COLUMN game_plan_phases.phase_extended_weeks IS 'v13.0 - How many weeks phase was extended beyond original plan';
COMMENT ON COLUMN game_plan_phases.phase_revision_count IS 'v13.0 - Number of times this phase was revised';

-- ============================================================================
-- ENHANCEMENT 3: Add event linkage to opportunities
-- Note: Foreign keys added later after gameplan_events table is created
-- ============================================================================

ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS discovered_via_event_id UUID,
ADD COLUMN IF NOT EXISTS removed_via_event_id UUID,
ADD COLUMN IF NOT EXISTS opportunity_roi_score DECIMAL CHECK (opportunity_roi_score >= 0.0 AND opportunity_roi_score <= 10.0);

COMMENT ON COLUMN opportunities.discovered_via_event_id IS 'v13.0 - If opportunity was added via event-driven revision';
COMMENT ON COLUMN opportunities.removed_via_event_id IS 'v13.0 - If opportunity was removed due to event';
COMMENT ON COLUMN opportunities.opportunity_roi_score IS 'v13.0 - ROI score (0-10) based on effort vs impact';

-- ============================================================================
-- FUNCTION 1: Auto-calculate next quarterly review date
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_next_review_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Set next review date to 12 weeks from creation
  NEW.next_review_date := NEW.created_date + INTERVAL '12 weeks';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_next_review_date
  BEFORE INSERT ON game_plans
  FOR EACH ROW
  WHEN (NEW.next_review_date IS NULL)
  EXECUTE FUNCTION calculate_next_review_date();

COMMENT ON FUNCTION calculate_next_review_date IS 'v13.0 - Auto-sets next_review_date to 12 weeks from creation';

-- ============================================================================
-- FUNCTION 2: Track phase revisions
-- ============================================================================

CREATE OR REPLACE FUNCTION track_phase_revision()
RETURNS TRIGGER AS $$
BEGIN
  -- If start_week or end_week changed, increment revision count
  IF (OLD.start_week != NEW.start_week OR OLD.end_week != NEW.end_week) THEN
    NEW.phase_revision_count := OLD.phase_revision_count + 1;
    NEW.last_revised_date := NOW();

    -- Track original values if first revision
    IF OLD.original_start_week IS NULL THEN
      NEW.original_start_week := OLD.start_week;
      NEW.original_end_week := OLD.end_week;
    END IF;

    -- Calculate extension
    NEW.phase_extended_weeks := NEW.end_week - COALESCE(NEW.original_end_week, OLD.end_week);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_phase_revision
  BEFORE UPDATE ON game_plan_phases
  FOR EACH ROW
  EXECUTE FUNCTION track_phase_revision();

COMMENT ON FUNCTION track_phase_revision IS 'v13.0 - Auto-tracks phase timeline revisions and extensions';

-- ============================================================================
-- VIEW 1: Active game plans needing quarterly review
-- ============================================================================

CREATE OR REPLACE VIEW v_game_plans_due_for_review AS
SELECT
  gp.game_plan_id,
  gp.student_id,
  gp.version,
  gp.next_review_date,
  gp.created_date,
  EXTRACT(DAY FROM (NOW() - gp.next_review_date)) AS days_overdue,
  gp.target_profile->>'profile_name' AS profile_name,
  gp.current_phase_id
FROM game_plans gp
WHERE gp.next_review_date <= NOW()
  AND NOT EXISTS (
    -- No review created in last 2 weeks
    SELECT 1 FROM quarterly_reviews qr
    WHERE qr.game_plan_id = gp.game_plan_id
      AND qr.review_date > NOW() - INTERVAL '2 weeks'
  )
ORDER BY gp.next_review_date ASC;

COMMENT ON VIEW v_game_plans_due_for_review IS 'v13.0 - Game plans needing quarterly review (next_review_date passed, no recent review)';

-- ============================================================================
-- VIEW 2: Parallel plans convergence summary
-- ============================================================================

CREATE OR REPLACE VIEW v_parallel_plans_summary AS
SELECT
  pp.student_id,
  pp.parent_game_plan_id,
  COUNT(*) AS total_parallel_paths,
  COUNT(*) FILTER (WHERE pp.status = 'exploring') AS exploring_count,
  COUNT(*) FILTER (WHERE pp.status = 'narrowing') AS narrowing_count,
  COUNT(*) FILTER (WHERE pp.status = 'converged') AS converged_count,
  COUNT(*) FILTER (WHERE pp.status = 'eliminated') AS eliminated_count,
  MAX(pp.confidence_score) AS highest_confidence_score,
  (ARRAY_AGG(pp.major_focus ORDER BY pp.confidence_score DESC))[1] AS leading_path
FROM parallel_plans pp
GROUP BY pp.student_id, pp.parent_game_plan_id;

COMMENT ON VIEW v_parallel_plans_summary IS 'v13.0 - Summary of parallel plan convergence status per student';

-- ============================================================================
-- VIEW 3: Game plan revision history
-- ============================================================================

CREATE OR REPLACE VIEW v_gameplan_revision_history AS
SELECT
  gr.game_plan_id,
  gp.student_id,
  gr.version_number,
  gr.revision_trigger,
  gr.revision_reason,
  gr.rubric_score_change,
  gr.target_school_change,
  gr.phase_adjustment,
  gr.revised_by,
  gr.created_at AS revision_date,
  ge.event_type AS triggering_event_type,
  qr.quarter AS triggering_quarter
FROM gameplan_revisions gr
JOIN game_plans gp ON gr.game_plan_id = gp.game_plan_id
LEFT JOIN gameplan_events ge ON gr.triggering_event_id = ge.event_id
LEFT JOIN quarterly_reviews qr ON gr.review_id = qr.review_id
ORDER BY gr.created_at DESC;

COMMENT ON VIEW v_gameplan_revision_history IS 'v13.0 - Complete revision history with triggering events and contexts';

-- ============================================================================
-- VIEW 4: Event impact summary
-- ============================================================================

CREATE OR REPLACE VIEW v_gameplan_event_impact AS
SELECT
  ge.student_id,
  ge.event_type,
  ge.significance,
  COUNT(*) AS event_count,
  COUNT(*) FILTER (WHERE ge.triggered_revision = true) AS revision_triggered_count,
  AVG((ge.impact_on_profile->>'score_change')::INTEGER) AS avg_score_impact
FROM gameplan_events ge
WHERE ge.event_date > NOW() - INTERVAL '1 year'
GROUP BY ge.student_id, ge.event_type, ge.significance
ORDER BY ge.student_id, significance DESC, event_count DESC;

COMMENT ON VIEW v_gameplan_event_impact IS 'v13.0 - Summary of event types and their impact on game plan revisions';

-- ============================================================================
-- ENHANCEMENT 4: Add foreign key constraints (after all tables created)
-- ============================================================================

-- Add foreign keys to gameplan_revisions (now that gameplan_events and quarterly_reviews exist)
ALTER TABLE gameplan_revisions
ADD CONSTRAINT fk_revisions_triggering_event
  FOREIGN KEY (triggering_event_id) REFERENCES gameplan_events(event_id) ON DELETE SET NULL;

ALTER TABLE gameplan_revisions
ADD CONSTRAINT fk_revisions_review
  FOREIGN KEY (review_id) REFERENCES quarterly_reviews(review_id) ON DELETE SET NULL;

-- Add foreign key to opportunities (now that gameplan_events exists)
ALTER TABLE opportunities
ADD CONSTRAINT fk_opportunities_discovered_event
  FOREIGN KEY (discovered_via_event_id) REFERENCES gameplan_events(event_id) ON DELETE SET NULL;

ALTER TABLE opportunities
ADD CONSTRAINT fk_opportunities_removed_event
  FOREIGN KEY (removed_via_event_id) REFERENCES gameplan_events(event_id) ON DELETE SET NULL;

COMMENT ON CONSTRAINT fk_revisions_triggering_event ON gameplan_revisions IS 'v13.0 - Link revision to triggering event';
COMMENT ON CONSTRAINT fk_revisions_review ON gameplan_revisions IS 'v13.0 - Link revision to quarterly review';

-- ============================================================================
-- COMPLETION MARKER
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Migration 012 completed successfully - GamePlan Dynamic Adaptive Enhancements v13.0';
  RAISE NOTICE 'Added: gameplan_revisions, gameplan_events, quarterly_reviews, parallel_plans tables';
  RAISE NOTICE 'Enhanced: game_plans (8 new columns), game_plan_phases (5 new columns), opportunities (3 new columns)';
  RAISE NOTICE 'Created: 2 triggers, 4 views, 4 foreign key constraints for dynamic game plan management';
END $$;

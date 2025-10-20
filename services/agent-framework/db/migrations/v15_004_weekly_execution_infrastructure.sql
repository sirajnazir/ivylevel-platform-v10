/**
 * v15_004 - Weekly Execution Infrastructure
 *
 * Purpose: Enable autonomous weekly execution coaching (THE CORE USP)
 *
 * Features:
 * - Task/todo management for execution tracking
 * - Weekly execution plans (Jenny's GSD documents)
 * - Progress tracking and completion metrics
 * - Nudge/notification scheduling
 * - Student lifecycle state machine
 * - Rule engine for proactive triggers
 *
 * Why Critical: This is the 80-90% of multi-year program that transforms
 * students from "thinkers" to "DOERS". AI advantage over human coaches is
 * massive here - 24/7 availability, instant responses, never forgets, learns
 * patterns, adapts to Type A vs Type B students.
 */

-- ============================================================================
-- 1. WEEKLY EXECUTION PLANS
-- ============================================================================

/**
 * weekly_execution_plans
 *
 * Stores Jenny's weekly GSD (Get Shit Done) plans
 * Replaces human weekly 1:1 sessions with autonomous plan generation
 *
 * Each week:
 * - Top 3-5 priorities based on deadlines, gaps, opportunities
 * - Specific tactics recommended (168-Hour Framework, Daily Schedule, etc.)
 * - Progress tracking from last week
 * - Adaptive guidance based on student capacity/style
 */
CREATE TABLE IF NOT EXISTS weekly_execution_plans (
  plan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL REFERENCES student_context(student_id),
  coach_id TEXT NOT NULL REFERENCES coaches(coach_id),

  -- Week metadata
  week_number INTEGER NOT NULL,  -- Sequential week number in program
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,

  -- Plan content
  top_priorities JSONB NOT NULL,  -- Top 3-5 priorities for the week
  tactical_guidance JSONB NOT NULL,  -- Specific tactics, systems, frameworks
  recommended_tactics TEXT[],  -- Tactic slugs from moat_tactic_chips
  deadline_reminders JSONB,  -- Upcoming deadlines to track
  progress_from_last_week JSONB,  -- What was completed/incomplete

  -- Adaptive coaching
  student_capacity_assessment TEXT,  -- 'high', 'medium', 'low' based on recent performance
  coaching_tone TEXT,  -- 'structured' (Type A), 'flexible' (Type B), 'motivational'
  personalization_notes TEXT,  -- Student-specific adjustments

  -- Execution tracking
  tasks_created INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  completion_rate DECIMAL(3,2),  -- 0.00 to 1.00

  -- Status
  delivered_to_student BOOLEAN DEFAULT false,
  delivered_at TIMESTAMPTZ,
  student_acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,

  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_weekly_plans_student ON weekly_execution_plans(student_id);
CREATE INDEX idx_weekly_plans_week ON weekly_execution_plans(week_start_date);
CREATE INDEX idx_weekly_plans_delivered ON weekly_execution_plans(delivered_to_student);

-- RLS policy
ALTER TABLE weekly_execution_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY weekly_plans_isolation ON weekly_execution_plans
  USING (
    student_id = current_setting('app.student_id', true)
    OR coach_id = current_setting('app.coach_id', true)
  );

-- ============================================================================
-- 2. STUDENT TASKS (GSD Items)
-- ============================================================================

/**
 * student_tasks
 *
 * Individual actionable tasks from weekly execution plans
 * Tracks completion, blockers, time estimates
 * Enables progress tracking and nudge triggers
 */
CREATE TABLE IF NOT EXISTS student_tasks (
  task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL REFERENCES student_context(student_id),
  coach_id TEXT NOT NULL REFERENCES coaches(coach_id),
  plan_id UUID REFERENCES weekly_execution_plans(plan_id),

  -- Task details
  title TEXT NOT NULL,
  description TEXT,
  priority INTEGER NOT NULL,  -- 1 = highest, 5 = lowest
  category TEXT,  -- 'academics', 'ecs', 'essays', 'applications', 'awards', 'research'

  -- Deadlines
  due_date DATE,
  is_hard_deadline BOOLEAN DEFAULT false,  -- College deadline vs internal goal
  deadline_type TEXT,  -- 'college_app', 'award_submission', 'ec_event', 'internal_milestone'

  -- Execution support
  estimated_duration_hours DECIMAL(4,1),  -- How long Jenny estimates this will take
  tactic_recommended TEXT,  -- Tactic slug to help complete this task
  micro_actions JSONB,  -- Step-by-step breakdown
  resources JSONB,  -- Links, docs, examples

  -- Progress tracking
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'in_progress', 'blocked', 'completed', 'abandoned'
  progress_percentage INTEGER DEFAULT 0,  -- 0-100
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  time_spent_hours DECIMAL(4,1),  -- Actual time spent

  -- Blocker detection
  blocker_notes TEXT,  -- Why student is stuck
  blocker_detected_at TIMESTAMPTZ,
  intervention_needed BOOLEAN DEFAULT false,
  intervention_triggered_at TIMESTAMPTZ,

  -- Tracking
  last_nudge_sent_at TIMESTAMPTZ,
  nudge_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_student ON student_tasks(student_id);
CREATE INDEX idx_tasks_plan ON student_tasks(plan_id);
CREATE INDEX idx_tasks_status ON student_tasks(status);
CREATE INDEX idx_tasks_due_date ON student_tasks(due_date);
CREATE INDEX idx_tasks_blocker ON student_tasks(intervention_needed) WHERE intervention_needed = true;

-- RLS policy
ALTER TABLE student_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY tasks_isolation ON student_tasks
  USING (
    student_id = current_setting('app.student_id', true)
    OR coach_id = current_setting('app.coach_id', true)
  );

-- ============================================================================
-- 3. STUDENT LIFECYCLE STATE MACHINE
-- ============================================================================

/**
 * student_lifecycle_states
 *
 * Tracks student journey through coaching program
 * Enables lifecycle-driven automation (onboarded → assessed → planning → execution → outcomes)
 * Triggers different agent behaviors based on state
 */
CREATE TABLE IF NOT EXISTS student_lifecycle_states (
  lifecycle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL UNIQUE REFERENCES student_context(student_id),
  coach_id TEXT NOT NULL REFERENCES coaches(coach_id),

  -- Current state
  current_state TEXT NOT NULL DEFAULT 'onboarded',
  /* States:
     - onboarded: Student just joined, needs assessment
     - assessing: AssessmentAgent running 27-layer assessment
     - assessment_complete: Ready for game plan
     - gameplan_generated: 4-pillar plan created
     - weekly_execution: In active execution phase (bulk of program)
     - application_season: Senior fall, submitting apps
     - decision_season: Senior spring, making college choice
     - program_complete: Graduated, outcomes tracked
     - inactive: No activity for 30+ days
     - churned: Left program
  */

  -- State transitions
  state_history JSONB,  -- Array of {state, entered_at, exited_at}
  entered_current_state_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Program metrics
  program_start_date DATE NOT NULL,
  program_week_number INTEGER NOT NULL DEFAULT 1,  -- Week 1, 2, 3... in program
  class_year TEXT NOT NULL,  -- 'freshman', 'sophomore', 'junior', 'senior'

  -- Engagement metrics
  last_activity_at TIMESTAMPTZ,
  days_since_last_activity INTEGER,
  weekly_plans_generated INTEGER DEFAULT 0,
  weekly_plans_completed INTEGER DEFAULT 0,
  tasks_completed_total INTEGER DEFAULT 0,

  -- Outcome tracking
  outcomes JSONB,  -- Awards won, programs accepted, college acceptances

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lifecycle_student ON student_lifecycle_states(student_id);
CREATE INDEX idx_lifecycle_state ON student_lifecycle_states(current_state);
CREATE INDEX idx_lifecycle_inactive ON student_lifecycle_states(days_since_last_activity) WHERE days_since_last_activity > 3;

-- RLS policy
ALTER TABLE student_lifecycle_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY lifecycle_isolation ON student_lifecycle_states
  USING (
    student_id = current_setting('app.student_id', true)
    OR coach_id = current_setting('app.coach_id', true)
  );

-- ============================================================================
-- 4. SCHEDULED NUDGES & NOTIFICATIONS
-- ============================================================================

/**
 * scheduled_nudges
 *
 * Queue for autonomous nudges, reminders, interventions
 * Enables 24/7 proactive coaching without human intervention
 *
 * Nudge types:
 * - Task reminders (due soon, overdue)
 * - Progress check-ins (Friday recap)
 * - Blocker interventions (stuck detection)
 * - Celebration (win acknowledgment)
 * - Opportunity alerts (new award posted)
 * - Weekly plan delivery (Monday morning)
 */
CREATE TABLE IF NOT EXISTS scheduled_nudges (
  nudge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL REFERENCES student_context(student_id),
  coach_id TEXT NOT NULL REFERENCES coaches(coach_id),

  -- Nudge details
  nudge_type TEXT NOT NULL,
  /* Types:
     - task_reminder: "Hey, essay draft due in 2 days"
     - deadline_alert: "College app deadline in 1 week"
     - progress_checkin: "How's this week going?"
     - blocker_intervention: "I noticed you're stuck on X"
     - celebration: "Congrats on completing 5/5 tasks!"
     - opportunity_alert: "New award matches your profile"
     - weekly_plan_delivery: "Your week 23 plan is ready"
     - inactive_nudge: "Haven't seen you in 3 days, everything ok?"
  */

  priority TEXT NOT NULL DEFAULT 'medium',  -- 'critical', 'high', 'medium', 'low'

  -- Message content
  message_subject TEXT,
  message_body TEXT NOT NULL,
  message_tone TEXT,  -- 'urgent', 'motivational', 'supportive', 'celebratory', 'informational'

  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL,
  send_via TEXT[] DEFAULT ARRAY['sms', 'email'],  -- Delivery channels

  -- Execution
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'sent', 'failed', 'cancelled'
  sent_at TIMESTAMPTZ,
  delivery_status JSONB,  -- {sms: 'delivered', email: 'opened'}

  -- Context
  related_task_id UUID REFERENCES student_tasks(task_id),
  related_plan_id UUID REFERENCES weekly_execution_plans(plan_id),
  trigger_rule TEXT,  -- Rule that triggered this nudge

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_nudges_student ON scheduled_nudges(student_id);
CREATE INDEX idx_nudges_scheduled ON scheduled_nudges(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_nudges_type ON scheduled_nudges(nudge_type);

-- RLS policy
ALTER TABLE scheduled_nudges ENABLE ROW LEVEL SECURITY;

CREATE POLICY nudges_isolation ON scheduled_nudges
  USING (
    student_id = current_setting('app.student_id', true)
    OR coach_id = current_setting('app.coach_id', true)
  );

-- ============================================================================
-- 5. RULE ENGINE (Proactive Triggers)
-- ============================================================================

/**
 * execution_rules
 *
 * Define if/then conditions for autonomous coaching
 * Enables Jenny intelligence to trigger interventions automatically
 *
 * Examples:
 * - IF task overdue 2+ days AND status='in_progress' THEN send blocker intervention
 * - IF completion_rate < 0.5 for 2 consecutive weeks THEN adjust capacity assessment
 * - IF no activity for 3+ days THEN send inactive nudge
 * - IF student completes 5/5 tasks THEN send celebration
 */
CREATE TABLE IF NOT EXISTS execution_rules (
  rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL UNIQUE,
  description TEXT,

  -- Rule definition
  trigger_condition JSONB NOT NULL,
  /* Examples:
     {"type": "task_overdue", "days": 2, "status": "in_progress"}
     {"type": "completion_rate", "operator": "<", "threshold": 0.5, "consecutive_weeks": 2}
     {"type": "inactivity", "days": 3}
     {"type": "streak", "completed_tasks": 5}
  */

  -- Action to take
  action_type TEXT NOT NULL,  -- 'send_nudge', 'create_intervention', 'adjust_capacity', 'escalate_to_coach'
  action_config JSONB NOT NULL,
  /* Examples:
     {"nudge_type": "blocker_intervention", "priority": "high", "tone": "supportive"}
     {"intervention": "schedule_1on1", "urgency": "high"}
     {"capacity": "low", "reduce_tasks_by": 2}
  */

  -- Execution limits
  max_triggers_per_week INTEGER,  -- Prevent spam
  cooldown_hours INTEGER,  -- Wait time between triggers

  -- Targeting
  applies_to_student_types TEXT[],  -- null = all, or ['type_a', 'type_b', 'high_achiever', 'struggling']
  applies_to_lifecycle_states TEXT[],  -- null = all, or ['weekly_execution', 'application_season']

  -- Status
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 5,  -- 1 = highest

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rules_active ON execution_rules(is_active) WHERE is_active = true;
CREATE INDEX idx_rules_priority ON execution_rules(priority);

-- ============================================================================
-- 6. PROGRESS SNAPSHOTS (Weekly Metrics)
-- ============================================================================

/**
 * weekly_progress_snapshots
 *
 * Captures weekly execution metrics for trend analysis
 * Enables adaptive coaching (detect declining performance, celebrate wins)
 * Powers ML learning over time
 */
CREATE TABLE IF NOT EXISTS weekly_progress_snapshots (
  snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL REFERENCES student_context(student_id),
  coach_id TEXT NOT NULL REFERENCES coaches(coach_id),
  plan_id UUID REFERENCES weekly_execution_plans(plan_id),

  -- Week metadata
  week_number INTEGER NOT NULL,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,

  -- Task metrics
  tasks_assigned INTEGER NOT NULL,
  tasks_completed INTEGER NOT NULL,
  tasks_in_progress INTEGER NOT NULL,
  tasks_blocked INTEGER NOT NULL,
  tasks_abandoned INTEGER NOT NULL,
  completion_rate DECIMAL(3,2),  -- 0.00 to 1.00

  -- Time metrics
  total_hours_estimated DECIMAL(5,1),
  total_hours_actual DECIMAL(5,1),
  efficiency_ratio DECIMAL(3,2),  -- actual/estimated

  -- Quality metrics
  blocker_count INTEGER DEFAULT 0,
  interventions_needed INTEGER DEFAULT 0,
  nudges_sent INTEGER DEFAULT 0,
  student_response_rate DECIMAL(3,2),  -- How often student responds to nudges

  -- Trend indicators
  completion_trend TEXT,  -- 'improving', 'stable', 'declining'
  capacity_assessment TEXT,  -- 'high', 'medium', 'low' based on performance
  recommended_adjustment TEXT,  -- 'increase_load', 'maintain', 'decrease_load', 'intervention'

  -- Wins & challenges
  wins JSONB,  -- Completed milestones, awards won, breakthroughs
  challenges JSONB,  -- Blockers encountered, struggles

  snapshot_taken_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_snapshots_student ON weekly_progress_snapshots(student_id);
CREATE INDEX idx_snapshots_week ON weekly_progress_snapshots(week_start_date);

-- RLS policy
ALTER TABLE weekly_progress_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY snapshots_isolation ON weekly_progress_snapshots
  USING (
    student_id = current_setting('app.student_id', true)
    OR coach_id = current_setting('app.coach_id', true)
  );

-- ============================================================================
-- SEED DATA: Default Execution Rules
-- ============================================================================

INSERT INTO execution_rules (rule_name, description, trigger_condition, action_type, action_config, max_triggers_per_week, cooldown_hours, priority) VALUES

-- Task overdue blocker intervention
('task_overdue_blocker',
 'Detect when student is stuck on overdue task',
 '{"type": "task_overdue", "days": 2, "status": "in_progress"}'::jsonb,
 'send_nudge',
 '{"nudge_type": "blocker_intervention", "priority": "high", "tone": "supportive", "message": "I noticed you''re stuck on {task_title}. Need help breaking through?"}'::jsonb,
 2, 24, 1),

-- Inactivity detection
('student_inactive_3days',
 'Nudge student who hasn''t logged in for 3+ days',
 '{"type": "inactivity", "days": 3}'::jsonb,
 'send_nudge',
 '{"nudge_type": "inactive_nudge", "priority": "medium", "tone": "supportive", "message": "Haven''t seen you in a few days! Everything ok? Let me know if you need anything."}'::jsonb,
 1, 72, 3),

-- Celebration for task completion streak
('completion_streak_celebration',
 'Celebrate when student completes all weekly tasks',
 '{"type": "completion_rate", "operator": ">=", "threshold": 1.0}'::jsonb,
 'send_nudge',
 '{"nudge_type": "celebration", "priority": "low", "tone": "celebratory", "message": "🎉 You completed all {task_count} tasks this week! Amazing work!"}'::jsonb,
 1, 168, 5),

-- Low completion rate capacity adjustment
('low_completion_adjust_capacity',
 'Reduce task load when student consistently underperforms',
 '{"type": "completion_rate", "operator": "<", "threshold": 0.5, "consecutive_weeks": 2}'::jsonb,
 'send_nudge',
 '{"nudge_type": "progress_checkin", "priority": "medium", "tone": "supportive", "message": "I noticed you''ve been completing fewer tasks lately. Let''s adjust your plan to match your current capacity."}'::jsonb,
 1, 168, 2),

-- Deadline approaching reminder
('deadline_approaching_1week',
 'Remind student of upcoming hard deadlines',
 '{"type": "deadline_approaching", "days": 7, "is_hard_deadline": true}'::jsonb,
 'send_nudge',
 '{"nudge_type": "deadline_alert", "priority": "high", "tone": "urgent", "message": "⚠️ {deadline_type} deadline in 1 week: {task_title}"}'::jsonb,
 10, 24, 1);

-- ============================================================================
-- FUNCTIONS: Helper Functions for Progress Tracking
-- ============================================================================

/**
 * Function: update_plan_completion_rate
 * Automatically recalculate completion rate when tasks change
 */
CREATE OR REPLACE FUNCTION update_plan_completion_rate()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE weekly_execution_plans
  SET
    tasks_completed = (
      SELECT COUNT(*) FROM student_tasks
      WHERE plan_id = NEW.plan_id AND status = 'completed'
    ),
    completion_rate = (
      SELECT
        CASE
          WHEN COUNT(*) = 0 THEN 0
          ELSE COUNT(*) FILTER (WHERE status = 'completed')::decimal / COUNT(*)
        END
      FROM student_tasks
      WHERE plan_id = NEW.plan_id
    )
  WHERE plan_id = NEW.plan_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_status_update_trigger
  AFTER INSERT OR UPDATE OF status ON student_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_plan_completion_rate();

/**
 * Function: update_lifecycle_activity
 * Track last activity timestamp for inactivity detection
 */
CREATE OR REPLACE FUNCTION update_lifecycle_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE student_lifecycle_states
  SET
    last_activity_at = NOW(),
    days_since_last_activity = 0
  WHERE student_id = NEW.student_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_activity_trigger
  AFTER INSERT OR UPDATE ON student_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_lifecycle_activity();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE weekly_execution_plans IS 'Jenny weekly GSD (Get Shit Done) plans - core 80-90% of program';
COMMENT ON TABLE student_tasks IS 'Individual actionable tasks from weekly plans - execution tracking';
COMMENT ON TABLE student_lifecycle_states IS 'Student journey state machine - enables lifecycle-driven automation';
COMMENT ON TABLE scheduled_nudges IS 'Autonomous nudge/notification queue - 24/7 proactive coaching';
COMMENT ON TABLE execution_rules IS 'If/then trigger rules for autonomous interventions';
COMMENT ON TABLE weekly_progress_snapshots IS 'Weekly metrics for trend analysis and adaptive coaching';

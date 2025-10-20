-- =====================================================================
-- Migration: v15_002_proactivity_infrastructure.sql
-- Version: v10.2
-- Created: 2025-10-17
-- Purpose: Week 17 - Proactivity Foundation Infrastructure
--          Enables autonomous agent lifecycle with scheduler, events,
--          notifications, tasks, and state machine
-- =====================================================================

-- Enable migration mode
SET app.migration = 'true';

-- =====================================================================
-- 1. SCHEDULED JOBS TABLE
--    Purpose: Background scheduler for cron jobs (weekly plans, reminders, nudges)
--    Use Cases:
--      - Weekly execution plan generation (every Monday 8am)
--      - Deadline reminders (3 days before, 1 day before)
--      - Proactive nudges (task overdue, no activity detected)
-- =====================================================================

CREATE TABLE IF NOT EXISTS scheduled_jobs (
  job_id SERIAL PRIMARY KEY,
  job_type TEXT NOT NULL,
  student_id TEXT NOT NULL,
  coach_id TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payload JSONB,
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  executed_at TIMESTAMPTZ,
  CONSTRAINT scheduled_jobs_status_check CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_status_scheduled_for
  ON scheduled_jobs(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_student_id
  ON scheduled_jobs(student_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_coach_id
  ON scheduled_jobs(coach_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_job_type
  ON scheduled_jobs(job_type);

COMMENT ON TABLE scheduled_jobs IS 'Background scheduler for autonomous agent lifecycle jobs';
COMMENT ON COLUMN scheduled_jobs.job_type IS 'Type of job: weekly_plan, deadline_reminder, nudge, assessment_followup, etc.';
COMMENT ON COLUMN scheduled_jobs.payload IS 'Job-specific data (e.g., deadline_id, task_id)';
COMMENT ON COLUMN scheduled_jobs.result IS 'Job execution result (e.g., plan_generated, notification_sent)';

-- =====================================================================
-- 2. EVENTS TABLE
--    Purpose: Event-driven triggers for student lifecycle automation
--    Use Cases:
--      - student_onboarded → schedule assessment followup
--      - task_completed → celebrate + update progress
--      - task_overdue → send nudge
--      - assessment_completed → trigger game plan generation
-- =====================================================================

CREATE TABLE IF NOT EXISTS events (
  event_id SERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  student_id TEXT NOT NULL,
  coach_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  handler_result JSONB,
  CONSTRAINT events_event_type_check CHECK (event_type IN (
    'student_onboarded',
    'assessment_completed',
    'game_plan_generated',
    'task_created',
    'task_completed',
    'task_overdue',
    'deadline_approaching',
    'no_activity_detected',
    'milestone_achieved'
  ))
);

CREATE INDEX IF NOT EXISTS idx_events_processed_created_at
  ON events(processed, created_at);
CREATE INDEX IF NOT EXISTS idx_events_student_id
  ON events(student_id);
CREATE INDEX IF NOT EXISTS idx_events_coach_id
  ON events(coach_id);
CREATE INDEX IF NOT EXISTS idx_events_event_type
  ON events(event_type);

COMMENT ON TABLE events IS 'Event-driven triggers for autonomous agent lifecycle';
COMMENT ON COLUMN events.event_type IS 'Type of lifecycle event that occurred';
COMMENT ON COLUMN events.payload IS 'Event-specific data (e.g., task_id, assessment_results)';
COMMENT ON COLUMN events.handler_result IS 'Result from event handler (e.g., actions taken)';

-- =====================================================================
-- 3. NOTIFICATIONS TABLE
--    Purpose: Multi-channel notification delivery (SMS, Email, In-App)
--    Use Cases:
--      - Twilio SMS for urgent nudges
--      - SendGrid email for weekly plans
--      - In-app notifications for milestones
-- =====================================================================

CREATE TABLE IF NOT EXISTS notifications (
  notification_id SERIAL PRIMARY KEY,
  student_id TEXT NOT NULL,
  coach_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB,
  CONSTRAINT notifications_channel_check CHECK (channel IN ('sms', 'email', 'in_app', 'push')),
  CONSTRAINT notifications_status_check CHECK (status IN ('pending', 'sent', 'delivered', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_status
  ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_student_id
  ON notifications(student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_coach_id
  ON notifications(coach_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON notifications(created_at);

COMMENT ON TABLE notifications IS 'Multi-channel notification delivery system';
COMMENT ON COLUMN notifications.channel IS 'Delivery channel: sms, email, in_app, push';
COMMENT ON COLUMN notifications.recipient IS 'Phone number (for SMS) or email address';
COMMENT ON COLUMN notifications.metadata IS 'Channel-specific data (e.g., twilio_sid, sendgrid_message_id)';

-- =====================================================================
-- 4. STUDENT TASKS TABLE
--    Purpose: Task/Todo management with progress tracking
--    Use Cases:
--      - Weekly execution plan todos
--      - Essay draft milestones
--      - Application deadline tracking
--      - Parent meeting follow-ups
-- =====================================================================

CREATE TABLE IF NOT EXISTS student_tasks (
  task_id SERIAL PRIMARY KEY,
  student_id TEXT NOT NULL,
  coach_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'medium',
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  agent_id TEXT,
  source_session_id TEXT,
  metadata JSONB,
  CONSTRAINT student_tasks_status_check CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'overdue')),
  CONSTRAINT student_tasks_priority_check CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
);

CREATE INDEX IF NOT EXISTS idx_student_tasks_student_id
  ON student_tasks(student_id);
CREATE INDEX IF NOT EXISTS idx_student_tasks_coach_id
  ON student_tasks(coach_id);
CREATE INDEX IF NOT EXISTS idx_student_tasks_status
  ON student_tasks(status);
CREATE INDEX IF NOT EXISTS idx_student_tasks_due_date
  ON student_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_student_tasks_agent_id
  ON student_tasks(agent_id);

COMMENT ON TABLE student_tasks IS 'Task/Todo management for weekly execution plans';
COMMENT ON COLUMN student_tasks.agent_id IS 'Which agent created this task (e.g., WeeklyExecutionAgent, EssayAgent)';
COMMENT ON COLUMN student_tasks.source_session_id IS 'Session that generated this task';
COMMENT ON COLUMN student_tasks.metadata IS 'Task-specific data (e.g., essay_id, college_id)';

-- =====================================================================
-- 5. WEEKLY PROGRESS SNAPSHOTS TABLE
--    Purpose: Track weekly progress for adaptive nudging
--    Use Cases:
--      - Calculate completion rates for nudge personalization
--      - Identify low-activity students for intervention
--      - Generate weekly summary reports
-- =====================================================================

CREATE TABLE IF NOT EXISTS weekly_progress_snapshots (
  snapshot_id SERIAL PRIMARY KEY,
  student_id TEXT NOT NULL,
  coach_id TEXT NOT NULL,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  tasks_total INTEGER NOT NULL DEFAULT 0,
  tasks_completed INTEGER NOT NULL DEFAULT 0,
  completion_rate NUMERIC(5,2),
  agent_sessions_count INTEGER NOT NULL DEFAULT 0,
  total_interaction_time_mins INTEGER NOT NULL DEFAULT 0,
  top_achievements TEXT[],
  open_blockers TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, week_start_date)
);

CREATE INDEX IF NOT EXISTS idx_weekly_progress_student_id
  ON weekly_progress_snapshots(student_id);
CREATE INDEX IF NOT EXISTS idx_weekly_progress_coach_id
  ON weekly_progress_snapshots(coach_id);
CREATE INDEX IF NOT EXISTS idx_weekly_progress_week_start
  ON weekly_progress_snapshots(week_start_date);

COMMENT ON TABLE weekly_progress_snapshots IS 'Weekly progress tracking for adaptive nudging';
COMMENT ON COLUMN weekly_progress_snapshots.completion_rate IS 'Percentage of tasks completed (0-100)';
COMMENT ON COLUMN weekly_progress_snapshots.top_achievements IS 'Top 3 accomplishments this week';
COMMENT ON COLUMN weekly_progress_snapshots.open_blockers IS 'Unresolved blockers needing coach attention';

-- =====================================================================
-- 6. STUDENT STATE TABLE
--    Purpose: State machine for student lifecycle orchestration
--    Use Cases:
--      - Track where student is in their journey
--      - Determine which agents should be proactively invoked
--      - Prevent duplicate onboarding/assessment
--    Note: student_state already exists with (student_id, vitals, updated_at)
--          We need to ADD columns for lifecycle state tracking
-- =====================================================================

-- Add new columns to existing student_state table
ALTER TABLE student_state ADD COLUMN IF NOT EXISTS coach_id TEXT;
ALTER TABLE student_state ADD COLUMN IF NOT EXISTS current_state TEXT;
ALTER TABLE student_state ADD COLUMN IF NOT EXISTS previous_state TEXT;
ALTER TABLE student_state ADD COLUMN IF NOT EXISTS state_entered_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE student_state ADD COLUMN IF NOT EXISTS state_data JSONB;

-- Add constraint after column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'student_state_current_state_check'
  ) THEN
    ALTER TABLE student_state ADD CONSTRAINT student_state_current_state_check CHECK (
      current_state IS NULL OR current_state IN (
        'onboarded',
        'assessment_scheduled',
        'assessment_in_progress',
        'assessment_completed',
        'game_plan_generated',
        'active_execution',
        'paused',
        'completed'
      )
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_student_state_coach_id
  ON student_state(coach_id);
CREATE INDEX IF NOT EXISTS idx_student_state_current_state
  ON student_state(current_state);

COMMENT ON TABLE student_state IS 'Student lifecycle state machine for agent orchestration (extended from original vitals table)';
COMMENT ON COLUMN student_state.current_state IS 'Current lifecycle state (determines which agents to invoke)';
COMMENT ON COLUMN student_state.state_data IS 'State-specific data (e.g., assessment_date, game_plan_id)';
COMMENT ON COLUMN student_state.vitals IS 'Original vitals data (preserved for compatibility)';

-- =====================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
--    Purpose: Enforce coach_id isolation for all proactivity tables
-- =====================================================================

ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_progress_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_state ENABLE ROW LEVEL SECURITY;

-- Policy: scheduled_jobs
DROP POLICY IF EXISTS scheduled_jobs_coach_isolation ON scheduled_jobs;
CREATE POLICY scheduled_jobs_coach_isolation ON scheduled_jobs
  USING (coach_id = current_setting('app.coach_id', true)::text);

-- Policy: events
DROP POLICY IF EXISTS events_coach_isolation ON events;
CREATE POLICY events_coach_isolation ON events
  USING (coach_id = current_setting('app.coach_id', true)::text);

-- Policy: notifications
DROP POLICY IF EXISTS notifications_coach_isolation ON notifications;
CREATE POLICY notifications_coach_isolation ON notifications
  USING (coach_id = current_setting('app.coach_id', true)::text);

-- Policy: student_tasks
DROP POLICY IF EXISTS student_tasks_coach_isolation ON student_tasks;
CREATE POLICY student_tasks_coach_isolation ON student_tasks
  USING (coach_id = current_setting('app.coach_id', true)::text);

-- Policy: weekly_progress_snapshots
DROP POLICY IF EXISTS weekly_progress_snapshots_coach_isolation ON weekly_progress_snapshots;
CREATE POLICY weekly_progress_snapshots_coach_isolation ON weekly_progress_snapshots
  USING (coach_id = current_setting('app.coach_id', true)::text);

-- Policy: student_state
DROP POLICY IF EXISTS student_state_coach_isolation ON student_state;
CREATE POLICY student_state_coach_isolation ON student_state
  USING (coach_id = current_setting('app.coach_id', true)::text);

-- =====================================================================
-- 8. HELPER FUNCTIONS
-- =====================================================================

-- Function: Update task status based on due date
CREATE OR REPLACE FUNCTION update_overdue_tasks()
RETURNS INTEGER AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE student_tasks
  SET status = 'overdue', updated_at = NOW()
  WHERE status = 'pending'
    AND due_date < CURRENT_DATE;

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_overdue_tasks IS 'Updates tasks to overdue status if past due date (run via cron)';

-- Function: Calculate weekly progress snapshot
CREATE OR REPLACE FUNCTION calculate_weekly_progress(p_student_id TEXT, p_week_start DATE)
RETURNS SETOF weekly_progress_snapshots AS $$
BEGIN
  RETURN QUERY
  INSERT INTO weekly_progress_snapshots (
    student_id,
    coach_id,
    week_start_date,
    week_end_date,
    tasks_total,
    tasks_completed,
    completion_rate
  )
  SELECT
    t.student_id,
    t.coach_id,
    p_week_start,
    p_week_start + INTERVAL '6 days',
    COUNT(*) AS tasks_total,
    SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) AS tasks_completed,
    ROUND(100.0 * SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) AS completion_rate
  FROM student_tasks t
  WHERE t.student_id = p_student_id
    AND t.created_at >= p_week_start
    AND t.created_at < p_week_start + INTERVAL '7 days'
  GROUP BY t.student_id, t.coach_id
  ON CONFLICT (student_id, week_start_date)
  DO UPDATE SET
    tasks_total = EXCLUDED.tasks_total,
    tasks_completed = EXCLUDED.tasks_completed,
    completion_rate = EXCLUDED.completion_rate
  RETURNING *;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_weekly_progress IS 'Calculate weekly progress snapshot for a student';

-- =====================================================================
-- 9. SEED DATA - Sample student state for testing
-- =====================================================================

INSERT INTO student_state (student_id, coach_id, current_state, state_data)
VALUES
  ('huda-2025', 'jenny-duan', 'active_execution', '{"game_plan_generated_at": "2024-08-15", "weeks_active": 12}'::jsonb),
  ('test-student-1', 'jenny-duan', 'onboarded', '{"onboarded_at": "2025-10-17"}'::jsonb)
ON CONFLICT (student_id) DO NOTHING;

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================

-- Summary of tables created:
--   1. scheduled_jobs (6 rows expected after Week 17 implementation)
--   2. events (10+ rows expected after event handlers)
--   3. notifications (20+ rows expected after notification service)
--   4. student_tasks (50+ rows expected after WeeklyExecutionAgent)
--   5. weekly_progress_snapshots (12 rows for Huda's 12 weeks)
--   6. student_state (2 rows seeded)

-- Next steps:
--   - Implement SchedulerService (src/scheduler/jobs.ts)
--   - Implement EventBus (src/events/eventBus.ts)
--   - Implement NotificationService (src/services/NotificationService.ts)
--   - Implement event handlers (src/events/handlers.ts)
--   - Test with sample student data

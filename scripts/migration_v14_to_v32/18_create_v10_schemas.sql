-- =====================================================
-- V10.0 Database Schema Migration
-- Creates all new tables and materialized views for gap implementation
-- =====================================================

-- Enable migration mode to bypass DDL blocks
SET app.migration = true;

-- GAP 1: Weekly Vitals Dashboard
-- =====================================================

CREATE TABLE IF NOT EXISTS weekly_vitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL REFERENCES students(student_id),
    week_number INTEGER NOT NULL,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,

    -- Weekly focus (top 3 priorities from gameplan)
    focus_areas JSONB,

    -- Progress tracking
    progress_status TEXT CHECK (progress_status IN ('behind', 'on_track', 'ahead')),
    completion_percentage DECIMAL(5,2),

    -- Vitals snapshot (calculated weekly)
    academic_vitals JSONB,
    ec_vitals JSONB,
    growth_vitals JSONB,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(student_id, week_number)
);

CREATE INDEX IF NOT EXISTS idx_weekly_vitals_student_week ON weekly_vitals(student_id, week_number DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_vitals_dates ON weekly_vitals(week_start_date, week_end_date);

CREATE TABLE IF NOT EXISTS deadlines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL REFERENCES students(student_id),

    -- Deadline info
    title TEXT NOT NULL,
    description TEXT,
    deadline_date DATE NOT NULL,
    deadline_time TIME,

    -- Categorization
    category TEXT NOT NULL CHECK (category IN ('application', 'award', 'program', 'essay', 'test', 'session', 'other')),
    priority TEXT NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'missed', 'canceled')),
    completed_at TIMESTAMPTZ,

    -- Related entities
    related_college_id TEXT,
    related_award_name TEXT,
    related_program_name TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deadlines_student ON deadlines(student_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_date ON deadlines(deadline_date);
CREATE INDEX IF NOT EXISTS idx_deadlines_status ON deadlines(status);
CREATE INDEX IF NOT EXISTS idx_deadlines_category ON deadlines(category);

-- GAP 2: Task Manager
-- =====================================================

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL REFERENCES students(student_id),

    -- Task info
    title TEXT NOT NULL,
    description TEXT,

    -- Assignment source
    assigned_by TEXT,
    assigned_in_session_id UUID,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),

    -- Scheduling
    due_date DATE,
    week_number INTEGER,

    -- Priority and categorization
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    category TEXT CHECK (category IN ('application', 'essay', 'project', 'award', 'program', 'test_prep', 'research', 'other')),

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'blocked', 'canceled')),
    completed_at TIMESTAMPTZ,
    blocked_reason TEXT,

    -- Related entities
    related_college_id TEXT,
    related_project_id UUID,
    related_essay_id UUID,

    -- Evidence of completion
    completion_proof JSONB,
    coach_verified BOOLEAN DEFAULT FALSE,
    coach_feedback TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_student ON tasks(student_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_week ON tasks(week_number);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);

-- GAP 3: Timeline Visualization
-- =====================================================

CREATE TABLE IF NOT EXISTS timeline_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL REFERENCES students(student_id),

    -- Event info
    title TEXT NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    week_number INTEGER,

    -- Event type
    event_type TEXT NOT NULL CHECK (event_type IN (
        'growth_event',
        'academic',
        'award',
        'program',
        'project',
        'application',
        'decision',
        'session',
        'phase_transition',
        'other'
    )),

    -- Visual styling
    icon TEXT,
    color TEXT,
    importance TEXT CHECK (importance IN ('critical', 'high', 'medium', 'low')),

    -- Related entities
    related_growth_event_id UUID,
    related_chip_id UUID,
    related_college_id TEXT,
    related_project_id UUID,

    -- Evidence
    evidence_chips JSONB,
    proof_url TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timeline_events_student ON timeline_events(student_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_date ON timeline_events(event_date);
CREATE INDEX IF NOT EXISTS idx_timeline_events_type ON timeline_events(event_type);
CREATE INDEX IF NOT EXISTS idx_timeline_events_week ON timeline_events(week_number);

-- GAP 4: Application Manager (Enhance existing college_list)
-- =====================================================

-- Add new columns to college_list if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='college_list' AND column_name='application_status') THEN
        ALTER TABLE college_list ADD COLUMN application_status TEXT DEFAULT 'not_started'
            CHECK (application_status IN ('not_started', 'in_progress', 'ready_to_submit', 'submitted', 'incomplete'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='college_list' AND column_name='submission_date') THEN
        ALTER TABLE college_list ADD COLUMN submission_date TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='college_list' AND column_name='documents_checklist') THEN
        ALTER TABLE college_list ADD COLUMN documents_checklist JSONB;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='college_list' AND column_name='essays_required') THEN
        ALTER TABLE college_list ADD COLUMN essays_required JSONB;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='college_list' AND column_name='financial_aid_amount') THEN
        ALTER TABLE college_list ADD COLUMN financial_aid_amount DECIMAL(10,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='college_list' AND column_name='financial_aid_details') THEN
        ALTER TABLE college_list ADD COLUMN financial_aid_details JSONB;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_college_list_app_status ON college_list(application_status);
CREATE INDEX IF NOT EXISTS idx_college_list_decision_date ON college_list(decision_date);

CREATE TABLE IF NOT EXISTS essays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL REFERENCES students(student_id),

    -- Essay info
    title TEXT NOT NULL,
    prompt TEXT NOT NULL,
    essay_type TEXT NOT NULL CHECK (essay_type IN ('common_app', 'coalition', 'uc_piq', 'supplement', 'scholarship', 'other')),

    -- Content
    current_version TEXT,
    word_count INTEGER,
    word_limit INTEGER,

    -- Status
    status TEXT NOT NULL DEFAULT 'brainstorming' CHECK (status IN ('brainstorming', 'outlining', 'first_draft', 'revision', 'final', 'submitted')),
    last_edited_at TIMESTAMPTZ,

    -- Related colleges (for supplements)
    related_colleges TEXT[],

    -- Feedback
    coach_feedback JSONB,
    peer_feedback JSONB,

    -- Version history
    versions JSONB,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_essays_student ON essays(student_id);
CREATE INDEX IF NOT EXISTS idx_essays_type ON essays(essay_type);
CREATE INDEX IF NOT EXISTS idx_essays_status ON essays(status);

-- GAP 5: Session Prep Interface
-- =====================================================

CREATE TABLE IF NOT EXISTS session_prep (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL REFERENCES students(student_id),

    -- Session info
    session_date TIMESTAMPTZ NOT NULL,
    session_number INTEGER,

    -- Prep content
    wins_since_last TEXT,
    challenges_faced TEXT,
    blockers TEXT,
    questions JSONB,
    topics_to_discuss JSONB,

    -- Action item review
    previous_action_items JSONB,
    items_completed INTEGER,
    items_blocked INTEGER,

    -- Goals for session
    session_goals TEXT,
    desired_outcomes TEXT,

    -- Status
    submitted_at TIMESTAMPTZ,
    reviewed_by_coach BOOLEAN DEFAULT FALSE,
    coach_reviewed_at TIMESTAMPTZ,
    coach_pre_notes TEXT,

    -- Post-session
    session_completed BOOLEAN DEFAULT FALSE,
    session_completed_at TIMESTAMPTZ,
    session_summary TEXT,
    new_action_items JSONB,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_prep_student ON session_prep(student_id);
CREATE INDEX IF NOT EXISTS idx_session_prep_date ON session_prep(session_date);
CREATE INDEX IF NOT EXISTS idx_session_prep_submitted ON session_prep(submitted_at) WHERE submitted_at IS NOT NULL;

-- GAP 6: Project Workspace
-- =====================================================

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL REFERENCES students(student_id),

    -- Project info
    title TEXT NOT NULL,
    description TEXT,
    category TEXT CHECK (category IN ('research', 'creative', 'technical', 'business', 'service', 'other')),

    -- Timeline
    start_date DATE,
    target_completion_date DATE,
    actual_completion_date DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('planning', 'active', 'paused', 'completed', 'abandoned')),

    -- Milestones
    milestones JSONB,

    -- Files & Links
    files JSONB,
    external_links JSONB,

    -- Impact & Outcomes
    impact_summary TEXT,
    metrics JSONB,

    -- Application usage
    used_in_applications BOOLEAN DEFAULT FALSE,
    application_description TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_student ON projects(student_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- =====================================================
-- Materialized Views
-- =====================================================

-- View 1: Current Week Vitals
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_current_week_vitals AS
SELECT
    wv.student_id,
    wv.week_number,
    wv.week_start_date,
    wv.week_end_date,
    wv.focus_areas,
    wv.progress_status,
    wv.completion_percentage,
    wv.academic_vitals,
    wv.ec_vitals,
    wv.growth_vitals,

    -- Upcoming deadlines (T-7, T-3, T-0)
    (
        SELECT jsonb_agg(
            jsonb_build_object(
                'title', d.title,
                'date', d.deadline_date,
                'days_until', d.deadline_date - CURRENT_DATE,
                'urgency', CASE
                    WHEN d.deadline_date - CURRENT_DATE = 0 THEN 'T-0'
                    WHEN d.deadline_date - CURRENT_DATE <= 3 THEN 'T-3'
                    WHEN d.deadline_date - CURRENT_DATE <= 7 THEN 'T-7'
                    ELSE 'future'
                END,
                'category', d.category,
                'status', d.status
            ) ORDER BY d.deadline_date
        )
        FROM deadlines d
        WHERE d.student_id = wv.student_id
        AND d.deadline_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
        AND d.status != 'completed'
    ) as upcoming_deadlines,

    -- Overdue items
    (
        SELECT COUNT(*)
        FROM deadlines d
        WHERE d.student_id = wv.student_id
        AND d.deadline_date < CURRENT_DATE
        AND d.status NOT IN ('completed', 'canceled')
    ) as overdue_count,

    -- This week's tasks
    (
        SELECT jsonb_agg(
            jsonb_build_object(
                'title', t.title,
                'status', t.status,
                'due_date', t.due_date,
                'priority', t.priority
            ) ORDER BY t.due_date, t.priority DESC
        )
        FROM tasks t
        WHERE t.student_id = wv.student_id
        AND t.due_date BETWEEN wv.week_start_date AND wv.week_end_date
    ) as this_week_tasks

FROM weekly_vitals wv
WHERE wv.week_start_date <= CURRENT_DATE
AND wv.week_end_date >= CURRENT_DATE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_current_week_vitals_student ON mv_current_week_vitals(student_id);

-- View 2: Task Completion Stats
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_task_completion_stats AS
SELECT
    student_id,

    -- Overall stats
    COUNT(*) as total_tasks,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
    COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tasks,
    COUNT(*) FILTER (WHERE status = 'not_started') as not_started_tasks,
    COUNT(*) FILTER (WHERE status = 'blocked') as blocked_tasks,
    COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status NOT IN ('completed', 'canceled')) as overdue_tasks,

    -- Completion rate
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE status = 'completed') / NULLIF(COUNT(*), 0),
        1
    ) as completion_rate_percent,

    -- By priority
    COUNT(*) FILTER (WHERE priority = 'critical' AND status != 'completed') as critical_pending,
    COUNT(*) FILTER (WHERE priority = 'high' AND status != 'completed') as high_pending,

    -- Recent activity
    MAX(completed_at) as last_completed_at,
    MAX(updated_at) as last_updated_at

FROM tasks
GROUP BY student_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_task_stats_student ON mv_task_completion_stats(student_id);

-- View 3: Timeline Summary
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_timeline_summary AS
SELECT
    student_id,

    -- Event counts by type
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE event_type = 'growth_event') as growth_events,
    COUNT(*) FILTER (WHERE event_type = 'academic') as academic_events,
    COUNT(*) FILTER (WHERE event_type = 'award') as award_events,
    COUNT(*) FILTER (WHERE event_type = 'program') as program_events,
    COUNT(*) FILTER (WHERE event_type = 'decision') as decision_events,

    -- Timeline span
    MIN(event_date) as journey_start,
    MAX(event_date) as journey_end,
    EXTRACT(DAY FROM MAX(event_date) - MIN(event_date)) as journey_days

FROM timeline_events
GROUP BY student_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_timeline_summary_student ON mv_timeline_summary(student_id);

-- View 4: Application Progress
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_application_progress AS
SELECT
    student_id,

    -- Application stats
    COUNT(*) as total_colleges,
    COUNT(*) FILTER (WHERE application_status = 'submitted') as submitted_count,
    COUNT(*) FILTER (WHERE application_status IN ('not_started', 'in_progress')) as pending_count,

    -- By decision plan
    COUNT(*) FILTER (WHERE decision_plan = 'REA') as rea_count,
    COUNT(*) FILTER (WHERE decision_plan = 'EA') as ea_count,
    COUNT(*) FILTER (WHERE decision_plan = 'ED') as ed_count,
    COUNT(*) FILTER (WHERE decision_plan = 'RD') as rd_count,

    -- Decision outcomes
    COUNT(*) FILTER (WHERE decision_status = 'Accepted') as accepted_count,
    COUNT(*) FILTER (WHERE decision_status = 'Waitlisted') as waitlisted_count,
    COUNT(*) FILTER (WHERE decision_status = 'Rejected') as rejected_count,
    COUNT(*) FILTER (WHERE decision_status = 'Pending') as pending_decisions,

    -- Deadlines upcoming
    COUNT(*) FILTER (WHERE application_deadline BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
                     AND application_status != 'submitted') as deadlines_this_week,
    COUNT(*) FILTER (WHERE application_deadline < CURRENT_DATE
                     AND application_status != 'submitted') as overdue_applications,

    -- Financial aid
    SUM(financial_aid_amount) FILTER (WHERE decision_status = 'Accepted') as total_aid_offered

FROM college_list
GROUP BY student_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_app_progress_student ON mv_application_progress(student_id);

-- =====================================================
-- Grant Permissions (if using RLS)
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE weekly_vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE essays ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_prep ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (student can only see their own data)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'weekly_vitals' AND policyname = 'weekly_vitals_policy') THEN
        CREATE POLICY weekly_vitals_policy ON weekly_vitals
            FOR ALL USING (student_id = current_setting('app.current_student_id', true));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'deadlines' AND policyname = 'deadlines_policy') THEN
        CREATE POLICY deadlines_policy ON deadlines
            FOR ALL USING (student_id = current_setting('app.current_student_id', true));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'tasks_policy') THEN
        CREATE POLICY tasks_policy ON tasks
            FOR ALL USING (student_id = current_setting('app.current_student_id', true));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'timeline_events' AND policyname = 'timeline_events_policy') THEN
        CREATE POLICY timeline_events_policy ON timeline_events
            FOR ALL USING (student_id = current_setting('app.current_student_id', true));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'essays' AND policyname = 'essays_policy') THEN
        CREATE POLICY essays_policy ON essays
            FOR ALL USING (student_id = current_setting('app.current_student_id', true));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'session_prep' AND policyname = 'session_prep_policy') THEN
        CREATE POLICY session_prep_policy ON session_prep
            FOR ALL USING (student_id = current_setting('app.current_student_id', true));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'projects_policy') THEN
        CREATE POLICY projects_policy ON projects
            FOR ALL USING (student_id = current_setting('app.current_student_id', true));
    END IF;
END $$;

-- =====================================================
-- Verification
-- =====================================================

-- Check all tables were created
SELECT
    table_name,
    CASE
        WHEN table_name IN (
            'weekly_vitals', 'deadlines', 'tasks', 'timeline_events',
            'essays', 'session_prep', 'projects'
        ) THEN 'v10.0 New Table'
        ELSE 'Existing Enhanced'
    END as table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
    'weekly_vitals', 'deadlines', 'tasks', 'timeline_events',
    'essays', 'session_prep', 'projects', 'college_list'
)
ORDER BY table_name;

-- Check all materialized views were created
SELECT
    matviewname as view_name,
    'v10.0 Materialized View' as view_type
FROM pg_matviews
WHERE schemaname = 'public'
AND matviewname IN (
    'mv_current_week_vitals',
    'mv_task_completion_stats',
    'mv_timeline_summary',
    'mv_application_progress'
)
ORDER BY matviewname;

COMMENT ON TABLE weekly_vitals IS 'v10.0: Weekly focus areas and progress tracking';
COMMENT ON TABLE deadlines IS 'v10.0: Application, award, program deadlines';
COMMENT ON TABLE tasks IS 'v10.0: Action items from coaching sessions';
COMMENT ON TABLE timeline_events IS 'v10.0: Complete student journey visualization';
COMMENT ON TABLE essays IS 'v10.0: Essay drafts, feedback, version history';
COMMENT ON TABLE session_prep IS 'v10.0: Pre-session preparation forms';
COMMENT ON TABLE projects IS 'v10.0: Project workspace and milestone tracking';

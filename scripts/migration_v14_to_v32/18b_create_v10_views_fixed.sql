-- Fix for v10.0 Materialized Views
SET app.migration = true;

-- View 3: Timeline Summary (Fixed)
DROP MATERIALIZED VIEW IF EXISTS mv_timeline_summary CASCADE;

CREATE MATERIALIZED VIEW mv_timeline_summary AS
SELECT
    student_id,

    -- Event counts by type
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE event_type = 'growth_event') as growth_events,
    COUNT(*) FILTER (WHERE event_type = 'academic') as academic_events,
    COUNT(*) FILTER (WHERE event_type = 'award') as award_events,
    COUNT(*) FILTER (WHERE event_type = 'program') as program_events,
    COUNT(*) FILTER (WHERE event_type = 'decision') as decision_events,

    -- Timeline span (simplified - just dates, not day count)
    MIN(event_date) as journey_start,
    MAX(event_date) as journey_end

FROM timeline_events
GROUP BY student_id;

CREATE UNIQUE INDEX idx_mv_timeline_summary_student ON mv_timeline_summary(student_id);

-- View 4: Application Progress (Fixed - use decision_result not outcome)
DROP MATERIALIZED VIEW IF EXISTS mv_application_progress CASCADE;

CREATE MATERIALIZED VIEW mv_application_progress AS
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

    -- Decision outcomes (use decision_result column)
    COUNT(*) FILTER (WHERE decision_result = 'Accepted') as accepted_count,
    COUNT(*) FILTER (WHERE decision_result = 'Waitlisted') as waitlisted_count,
    COUNT(*) FILTER (WHERE decision_result = 'Rejected') as rejected_count,
    COUNT(*) FILTER (WHERE decision_result IS NULL OR decision_result = 'Pending') as pending_decisions,

    -- Deadlines upcoming
    COUNT(*) FILTER (WHERE application_deadline BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
                     AND application_status != 'submitted') as deadlines_this_week,
    COUNT(*) FILTER (WHERE application_deadline < CURRENT_DATE
                     AND application_status != 'submitted') as overdue_applications,

    -- Financial aid
    SUM(financial_aid_amount) FILTER (WHERE decision_result = 'Accepted') as total_aid_offered

FROM college_list
GROUP BY student_id;

CREATE UNIQUE INDEX idx_mv_app_progress_student ON mv_application_progress(student_id);

-- Verification
SELECT 'Materialized Views Created' as status,
       matviewname as view_name
FROM pg_matviews
WHERE schemaname = 'public'
AND matviewname IN (
    'mv_current_week_vitals',
    'mv_task_completion_stats',
    'mv_timeline_summary',
    'mv_application_progress'
)
ORDER BY matviewname;

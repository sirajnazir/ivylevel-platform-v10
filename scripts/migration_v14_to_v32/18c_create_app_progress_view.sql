-- Create Application Progress View (Simplified)
SET app.migration = true;

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

    -- Decision outcomes
    COUNT(*) FILTER (WHERE decision_result = 'Accepted') as accepted_count,
    COUNT(*) FILTER (WHERE decision_result = 'Waitlisted') as waitlisted_count,
    COUNT(*) FILTER (WHERE decision_result = 'Rejected') as rejected_count,
    COUNT(*) FILTER (WHERE decision_result IS NULL OR decision_result = 'Pending') as pending_decisions,

    -- Financial aid
    SUM(financial_aid_amount) FILTER (WHERE decision_result = 'Accepted') as total_aid_offered

FROM college_list
GROUP BY student_id;

CREATE UNIQUE INDEX idx_mv_app_progress_student ON mv_application_progress(student_id);

SELECT 'All 4 Materialized Views Created' as status,
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

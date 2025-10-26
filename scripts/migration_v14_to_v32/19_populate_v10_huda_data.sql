-- =====================================================
-- V10.0 Data Migration for Huda
-- Populates all new tables with Huda's 2+ years of coaching data
-- =====================================================

SET app.migration = true;

-- =====================================================
-- GAP 3: Timeline Events (Populate First - Foundation)
-- =====================================================

-- Phase Transitions
INSERT INTO timeline_events (student_id, title, description, event_date, week_number, event_type, icon, color, importance)
VALUES
('huda-2025', 'Coaching Begins: Foundation Phase', 'Started 2-year coaching journey with identity exploration', '2023-06-21', 1, 'phase_transition', '🚀', 'blue', 'critical'),
('huda-2025', 'Phase Transition: Build Phase', 'Shifted focus to execution and project development', '2023-09-15', 13, 'phase_transition', '🔨', 'green', 'high'),
('huda-2025', 'Phase Transition: Application Phase', 'Began college applications and essay writing', '2024-08-01', 57, 'phase_transition', '📝', 'orange', 'critical'),
('huda-2025', 'Phase Transition: Decision Phase', 'Reviewing acceptances and making final choice', '2025-03-01', 88, 'phase_transition', '🎯', 'purple', 'critical')
ON CONFLICT DO NOTHING;

-- Growth Events (from existing growth_events table)
INSERT INTO timeline_events (student_id, title, description, event_date, week_number, event_type, icon, color, importance, related_growth_event_id)
SELECT
    student_id,
    event_summary,
    transformation_story,
    event_date,
    week_number,
    'growth_event',
    '🌱',
    'purple',
    CASE
        WHEN transformation_delta >= 1.0 THEN 'critical'
        WHEN transformation_delta >= 0.5 THEN 'high'
        ELSE 'medium'
    END,
    id
FROM growth_events
WHERE student_id = 'huda-2025'
ON CONFLICT DO NOTHING;

-- Academic Milestones
INSERT INTO timeline_events (student_id, title, description, event_date, week_number, event_type, icon, color, importance)
VALUES
('huda-2025', 'SAT Score: 1360', 'First SAT attempt', '2023-10-07', 16, 'academic', '📚', 'blue', 'medium'),
('huda-2025', 'SAT Score: 1480', 'Second SAT - significant improvement', '2024-03-09', 38, 'academic', '📚', 'blue', 'high'),
('huda-2025', 'SAT Score: 1530', 'Final SAT score achieved', '2024-08-24', 62, 'academic', '📚', 'blue', 'critical'),
('huda-2025', 'Final GPA: 3.97 / 4.52 W', 'Senior year cumulative GPA locked in', '2025-01-15', 82, 'academic', '🎓', 'blue', 'high')
ON CONFLICT DO NOTHING;

-- Awards
INSERT INTO timeline_events (student_id, title, description, event_date, week_number, event_type, icon, color, importance)
VALUES
('huda-2025', 'NCWIT Aspirations Award Winner', 'Won national award for women in computing', '2024-03-15', 39, 'award', '🏆', 'yellow', 'critical'),
('huda-2025', 'National History Day State Finalist', 'Advanced to state competition with digital documentary', '2024-04-20', 44, 'award', '🏆', 'yellow', 'high')
ON CONFLICT DO NOTHING;

-- Programs
INSERT INTO timeline_events (student_id, title, description, event_date, week_number, event_type, icon, color, importance)
VALUES
('huda-2025', 'J-Camp Journalism Program', 'Attended summer journalism camp', '2023-07-15', 4, 'program', '📰', 'green', 'high'),
('huda-2025', 'Kode With Klossy', 'Summer coding bootcamp', '2023-08-01', 7, 'program', '💻', 'green', 'high')
ON CONFLICT DO NOTHING;

-- Project Milestones
INSERT INTO timeline_events (student_id, title, description, event_date, week_number, event_type, icon, color, importance)
VALUES
('huda-2025', 'AI Game: Alpha Version', 'Completed first playable version of AI ethics game', '2024-01-15', 30, 'project', '🎮', 'indigo', 'high'),
('huda-2025', 'AI Game: Beta Launch', 'Released beta version to 100+ testers', '2024-06-01', 49, 'project', '🎮', 'indigo', 'critical'),
('huda-2025', 'Small Business Stories: Episode 1', 'Published first episode of podcast series', '2024-02-01', 33, 'project', '🎙️', 'indigo', 'medium')
ON CONFLICT DO NOTHING;

-- Application Milestones
INSERT INTO timeline_events (student_id, title, description, event_date, week_number, event_type, icon, color, importance, related_college_id)
VALUES
('huda-2025', 'Common App Essay: Final Version', 'Submitted polished personal statement', '2024-10-15', 68, 'application', '✍️', 'orange', 'critical', NULL),
('huda-2025', 'Stanford REA Submitted', 'Submitted Restrictive Early Action to Stanford', '2024-11-01', 70, 'application', '📮', 'orange', 'critical', 'Stanford University'),
('huda-2025', 'UC Applications Submitted', 'Submitted to all 9 UC campuses', '2024-11-30', 74, 'application', '📮', 'orange', 'critical', NULL)
ON CONFLICT DO NOTHING;

-- Decisions (from college_list) - Note: Will be populated after decision_date column is added
-- For now, skip this as college_list doesn't have decision_date yet
-- This will be added in later migration when we add timeline tracking

-- =====================================================
-- GAP 6: Projects (Populate Next - Referenced by other data)
-- =====================================================

INSERT INTO projects (student_id, title, description, category, start_date, target_completion_date, actual_completion_date, status, milestones, impact_summary, metrics, used_in_applications)
VALUES
('huda-2025', 'AI Ethics Game for Young Women', 'Interactive game teaching AI ethics through ethical dilemma scenarios', 'technical', '2023-07-01', '2024-06-01', '2024-06-15', 'completed',
 '[
   {"title": "Concept & Design", "target_date": "2023-08-01", "completed": true, "completed_date": "2023-07-28"},
   {"title": "Alpha Version (Core Mechanics)", "target_date": "2024-01-15", "completed": true, "completed_date": "2024-01-12"},
   {"title": "Beta Testing with 50 Users", "target_date": "2024-04-01", "completed": true, "completed_date": "2024-03-28"},
   {"title": "Public Launch", "target_date": "2024-06-01", "completed": true, "completed_date": "2024-06-15"}
 ]'::jsonb,
 'Created educational AI game reaching 150+ young women, teaching AI ethics through interactive gameplay',
 '{"users": 150, "play_sessions": 500, "avg_completion_rate": 78, "press_mentions": 2}'::jsonb,
 true),

('huda-2025', 'Small Business Stories Podcast', 'Multimedia journalism project profiling immigrant small business owners', 'creative', '2023-09-01', '2024-05-01', '2024-05-15', 'completed',
 '[
   {"title": "Concept & Interview Subjects", "target_date": "2023-09-15", "completed": true, "completed_date": "2023-09-12"},
   {"title": "Episode 1: Local Restaurant Owner", "target_date": "2024-02-01", "completed": true, "completed_date": "2024-02-03"},
   {"title": "Episode 2-3 Production", "target_date": "2024-04-01", "completed": true, "completed_date": "2024-04-05"},
   {"title": "Series Publication", "target_date": "2024-05-01", "completed": true, "completed_date": "2024-05-15"}
 ]'::jsonb,
 'Published 3-part multimedia series highlighting immigrant entrepreneurship, featured in school newspaper and local community site',
 '{"episodes": 3, "total_listens": 200, "avg_rating": 4.7}'::jsonb,
 true),

('huda-2025', 'Science Communication Instagram', 'Digital content making CS/AI accessible to non-technical audiences', 'creative', '2023-10-01', NULL, NULL, 'active',
 '[
   {"title": "Launch Account & Branding", "target_date": "2023-10-15", "completed": true, "completed_date": "2023-10-12"},
   {"title": "Reach 500 Followers", "target_date": "2024-01-01", "completed": true, "completed_date": "2023-12-28"},
   {"title": "Reach 1000 Followers", "target_date": "2024-06-01", "completed": true, "completed_date": "2024-05-20"},
   {"title": "Launch YouTube Channel", "target_date": "2024-09-01", "completed": false, "completed_date": null}
 ]'::jsonb,
 'Grew science communication platform to 1200+ followers, creating accessible AI/tech content for general audiences',
 '{"followers": 1200, "posts": 45, "avg_engagement": 8.5}'::jsonb,
 true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- GAP 1: Deadlines (From applications and programs)
-- =====================================================

-- Populate deadlines from college applications
-- Note: Skipping for now as application_deadline column doesn't exist yet in college_list
-- Will add sample deadlines manually below

-- Populate award deadlines
INSERT INTO deadlines (student_id, title, description, deadline_date, category, priority, status, related_award_name)
VALUES
('huda-2025', 'NCWIT Aspirations Award Application', 'National award for women in computing', '2024-03-15', 'award', 'high', 'completed', 'NCWIT'),
('huda-2025', 'Young Arts Application', 'National Foundation for the Advancement of Artists', '2024-10-15', 'award', 'high', 'pending', 'Young Arts'),
('huda-2025', 'National History Day', 'Multimedia project submission', '2024-02-01', 'award', 'medium', 'completed', 'National History Day')
ON CONFLICT DO NOTHING;

-- Populate program deadlines
INSERT INTO deadlines (student_id, title, description, deadline_date, category, priority, status, related_program_name)
VALUES
('huda-2025', 'J-Camp Application', 'Journalism camp', '2023-03-01', 'program', 'high', 'completed', 'J-Camp'),
('huda-2025', 'Kode With Klossy Application', 'Coding bootcamp', '2023-04-01', 'program', 'high', 'completed', 'Kode With Klossy')
ON CONFLICT DO NOTHING;

-- =====================================================
-- GAP 2: Tasks (Sample tasks from coaching journey)
-- =====================================================

INSERT INTO tasks (student_id, title, description, due_date, week_number, priority, category, assigned_by, status)
VALUES
-- Week 1 tasks
('huda-2025', 'Complete identity exploration exercise', 'Film+CS synthesis worksheet', '2023-06-28', 1, 'high', 'other', 'jenny', 'completed'),
('huda-2025', 'Research Stanford AI4All program', 'Look into summer AI programs', '2023-07-05', 2, 'high', 'program', 'jenny', 'completed'),

-- Week 12 tasks
('huda-2025', 'Submit NCWIT Aspirations Award', 'Complete application with AI game project', '2024-03-15', 12, 'critical', 'award', 'jenny', 'completed'),

-- Week 50-60 tasks (Application season)
('huda-2025', 'Draft Common App Personal Statement V1', 'Scene-first story about service-oriented building', '2024-09-01', 50, 'critical', 'essay', 'jenny', 'completed'),
('huda-2025', 'Finalize Stanford REA application', 'Submit complete application by Nov 1', '2024-11-01', 70, 'critical', 'application', 'jenny', 'completed'),
('huda-2025', 'Complete UC PIQ essays', 'Write all 4 UC Personal Insight Questions', '2024-11-30', 72, 'critical', 'essay', 'jenny', 'completed'),

-- Current/future tasks (for demo)
('huda-2025', 'Review college acceptance offers', 'Compare financial aid packages', '2025-04-15', 86, 'high', 'application', 'jenny', 'in_progress'),
('huda-2025', 'Make final college decision', 'Choose college and submit enrollment deposit', '2025-05-01', 88, 'critical', 'application', 'jenny', 'not_started')
ON CONFLICT DO NOTHING;

-- =====================================================
-- GAP 1: Weekly Vitals (89 weeks backfill)
-- =====================================================

DO $$
DECLARE
    week_num INTEGER;
    week_start DATE;
    week_end DATE;
BEGIN
    FOR week_num IN 1..89 LOOP
        week_start := '2023-06-21'::date + (week_num - 1) * INTERVAL '7 days';
        week_end := week_start + INTERVAL '6 days';

        INSERT INTO weekly_vitals (
            student_id, week_number, week_start_date, week_end_date,
            focus_areas, progress_status, completion_percentage,
            academic_vitals, ec_vitals, growth_vitals
        ) VALUES (
            'huda-2025',
            week_num,
            week_start,
            week_end,
            jsonb_build_array(
                jsonb_build_object(
                    'priority', 1,
                    'area', 'Weekly coaching session execution',
                    'target_date', week_end::text,
                    'source', 'gameplan'
                )
            ),
            'on_track',
            75.0,
            '{"gpa_unweighted": 3.97, "gpa_weighted": 4.52, "sat_score": 1530, "ap_count": 3}'::jsonb,
            '{"projects_active": 3, "awards_won": 2, "programs_attended": 2, "leadership_roles": 2}'::jsonb,
            '{"hgti_score": 74.38, "events_total": 8, "breakthroughs": 3}'::jsonb
        )
        ON CONFLICT (student_id, week_number) DO NOTHING;
    END LOOP;
END $$;

-- =====================================================
-- GAP 4: Application Manager (Update college_list)
-- =====================================================

UPDATE college_list
SET
    application_status = 'submitted',
    submission_date = application_deadline,
    documents_checklist = '{
        "transcript": true,
        "lor1": true,
        "lor2": true,
        "lor3": true,
        "test_scores": true,
        "css_profile": true,
        "common_app": true
    }'::jsonb,
    essays_required = CASE
        WHEN decision_plan IN ('REA', 'EA', 'ED') THEN '[
            {"type": "common_app", "status": "submitted"},
            {"type": "supplement", "prompt": "Why us?", "word_count": 250, "status": "submitted"}
        ]'::jsonb
        ELSE '[
            {"type": "common_app", "status": "submitted"},
            {"type": "supplement", "prompt": "Why us?", "word_count": 250, "status": "submitted"},
            {"type": "supplement", "prompt": "Community contribution", "word_count": 150, "status": "submitted"}
        ]'::jsonb
    END
WHERE student_id = 'huda-2025';

-- Populate essay records
INSERT INTO essays (student_id, title, prompt, essay_type, current_version, word_count, word_limit, status, related_colleges)
VALUES
('huda-2025', 'Common App Personal Statement', 'The lessons we take from obstacles we encounter can be fundamental to later success...', 'common_app',
 'Scene-first story about building as service, identity synthesis of film+CS...', 648, 650, 'submitted', NULL),

('huda-2025', 'UC PIQ 1: Leadership', 'Describe an example of your leadership experience...', 'uc_piq',
 'School newspaper editor - led digital transformation...', 350, 350, 'submitted', ARRAY['UC Berkeley', 'UCLA', 'UCSD', 'UCI']),

('huda-2025', 'UC PIQ 2: Creativity', 'Every person has a creative side...', 'uc_piq',
 'AI game development combining coding and ethical storytelling...', 350, 350, 'submitted', ARRAY['UC Berkeley', 'UCLA', 'UCSD', 'UCI']),

('huda-2025', 'UC PIQ 3: Talent/Skill', 'What would you say is your greatest talent or skill?', 'uc_piq',
 'Digital storytelling - synthesis of film, writing, and technology...', 350, 350, 'submitted', ARRAY['UC Berkeley', 'UCLA', 'UCSD', 'UCI']),

('huda-2025', 'UC PIQ 4: Opportunity/Barrier', 'Describe how you have taken advantage of a significant educational opportunity...', 'uc_piq',
 'J-Camp and Kode With Klossy programs as launchpad...', 350, 350, 'submitted', ARRAY['UC Berkeley', 'UCLA', 'UCSD', 'UCI']),

('huda-2025', 'Stanford: Why Stanford?', 'The Stanford community is deeply curious and driven to learn...', 'supplement',
 'AI ethics research alignment with professors, media studies...', 250, 250, 'submitted', ARRAY['Stanford University']),

('huda-2025', 'MIT: Community contribution', 'At MIT, we bring people together to better the lives of others...', 'supplement',
 'Digital storytelling workshops for underrepresented students...', 200, 200, 'submitted', ARRAY['MIT'])
ON CONFLICT DO NOTHING;

-- =====================================================
-- Refresh All Materialized Views
-- =====================================================

REFRESH MATERIALIZED VIEW CONCURRENTLY mv_current_week_vitals;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_task_completion_stats;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_timeline_summary;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_application_progress;

-- =====================================================
-- Verification Queries
-- =====================================================

-- Timeline Events
SELECT
    'Timeline Events' as metric,
    event_type,
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE importance = 'critical') as critical_count
FROM timeline_events
WHERE student_id = 'huda-2025'
GROUP BY event_type
ORDER BY count DESC;

-- Projects
SELECT
    'Projects' as metric,
    title,
    status,
    jsonb_array_length(milestones) as milestone_count,
    (SELECT COUNT(*) FROM jsonb_array_elements(milestones) m WHERE m->>'completed' = 'true') as completed_milestones
FROM projects
WHERE student_id = 'huda-2025';

-- Weekly Vitals
SELECT
    'Weekly Vitals' as metric,
    COUNT(*) as total_weeks,
    MIN(week_number) as first_week,
    MAX(week_number) as last_week
FROM weekly_vitals
WHERE student_id = 'huda-2025';

-- Tasks
SELECT
    'Tasks' as metric,
    status,
    COUNT(*) as count
FROM tasks
WHERE student_id = 'huda-2025'
GROUP BY status;

-- Deadlines
SELECT
    'Deadlines' as metric,
    category,
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE status = 'completed') as completed
FROM deadlines
WHERE student_id = 'huda-2025'
GROUP BY category;

-- Essays
SELECT
    'Essays' as metric,
    essay_type,
    COUNT(*) as count
FROM essays
WHERE student_id = 'huda-2025'
GROUP BY essay_type;

-- Application Progress View
SELECT * FROM mv_application_progress WHERE student_id = 'huda-2025';

-- Task Stats View
SELECT * FROM mv_task_completion_stats WHERE student_id = 'huda-2025';

-- Timeline Summary View
SELECT * FROM mv_timeline_summary WHERE student_id = 'huda-2025';

-- Current Week Vitals View
SELECT * FROM mv_current_week_vitals WHERE student_id = 'huda-2025';

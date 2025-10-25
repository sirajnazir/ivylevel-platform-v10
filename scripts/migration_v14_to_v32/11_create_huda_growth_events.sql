-- Create Growth Events for Huda from KB Intel Patterns and Academic Progression
-- Based on 2 years of coaching data (June 2023 - June 2025, 89 weeks)
-- Source: KB intel chips + academic achievements + coaching timeline

-- Week 1 (June 2023): Initial Identity Synthesis Breakthrough
INSERT INTO growth_events (
    id, student_id, barrier_type, trigger, coach_reflection, student_reflection,
    transformation_delta, breakthrough, occurred_at, linked_artifacts, is_synthetic
)
VALUES (
    gen_random_uuid(),
    'huda-2025',
    'SELF_IMAGE',
    'Struggling with disconnected interests (film vs CS) and quiet personality in non-competitive school',
    'Jenny synthesized Huda''s film and CS interests into unified "digital storyteller" identity through Connection Synthesis technique. Revealed hidden strength: coding since age 8, 4.3 GPA, dual passion. Strategic pivot from CS to Data Science/Cognitive Science alternatives.',
    'Transformation from feeling torn between interests to unified interdisciplinary advantage',
    0.85,
    true,
    '2023-06-21',
    '{"kb_week": 1, "chip_types": ["Insight", "Strategy", "Framework"], "frameworks": ["Connection Synthesis", "168-hour framework"]}'::jsonb,
    false
);

-- Week 4-8 (July 2023): Time Management & Execution System
INSERT INTO growth_events (
    id, student_id, barrier_type, trigger, coach_reflection, student_reflection,
    transformation_delta, breakthrough, occurred_at, linked_artifacts, is_synthetic
)
VALUES (
    gen_random_uuid(),
    'huda-2025',
    'TIME_MANAGEMENT',
    'Only 2 hours daily for impact activities after school/sleep/homework (168-hour framework revealed critical constraint)',
    'Coach Jenny deployed time audit revealing stark reality: 8h school + 8h sleep + 4h homework + 2h basics = only 2 hours for everything that matters. Created urgency for strategic time allocation and portfolio architecture.',
    'Shifted from reactive scheduling to intentional time design; learned to say no to low-impact activities',
    0.75,
    false,
    '2023-07-15',
    '{"kb_weeks": [4,5,6,7,8], "framework": "168-hour time audit", "behavioral_change": "strategic time allocation"}'::jsonb,
    false
);

-- Week 12-16 (August-Sept 2023): Confidence Building Through NCWIT & Awards
INSERT INTO growth_events (
    id, student_id, barrier_type, trigger, coach_reflection, student_reflection,
    transformation_delta, breakthrough, occurred_at, linked_artifacts, is_synthetic
)
VALUES (
    gen_random_uuid(),
    'huda-2025',
    'INTERNAL_CONFIDENCE',
    'Self-doubt about competing for awards; "I''m not exceptional" mindset despite strong academics',
    'Jenny''s affirmation: "Huda, I know you are exceptional, I want you to believe it for yourself." Reframed existing AI game for NCWIT Aspirations Award. Provided tactical playbook with 6 specific programs and measurable targets.',
    'Began submitting to competitive awards; internalized "digital storyteller" identity',
    0.70,
    false,
    '2023-09-01',
    '{"awards_targeted": ["NCWIT", "Young Arts", "National History Day"], "programs": 6, "identity_shift": true}'::jsonb,
    false
);

-- Week 20-30 (Oct 2023 - Jan 2024): Stanford Positioning & AI Ethics Focus
INSERT INTO growth_events (
    id, student_id, barrier_type, trigger, coach_reflection, student_reflection,
    transformation_delta, breakthrough, occurred_at, linked_artifacts, is_synthetic
)
VALUES (
    gen_random_uuid(),
    'huda-2025',
    'MOTIVATION_DROP',
    'Uncertainty about college positioning and major selection in highly competitive landscape',
    'Jenny deployed Intel Drop: Stanford''s heavy AI ethics funding creates strategic alignment. Positioned game development as ethics education for young women. Major pivot from pure CS to strategic alternatives (Data Science, Social Systems) to reduce competition while maintaining trajectory.',
    'Gained clarity on Stanford positioning; AI ethics became unifying narrative thread',
    0.80,
    true,
    '2024-01-15',
    '{"strategic_pivot": "AI ethics positioning", "stanford_alignment": true, "major_alternatives": ["Data Science", "Cognitive Science", "Social Systems"]}'::jsonb,
    false
);

-- Week 35-45 (Feb-May 2024): Project Execution & Community Impact
INSERT INTO growth_events (
    id, student_id, barrier_type, trigger, coach_reflection, student_reflection,
    transformation_delta, breakthrough, occurred_at, linked_artifacts, is_synthetic
)
VALUES (
    gen_random_uuid(),
    'huda-2025',
    'SELF_IMAGE',
    'Missing community service layer; profile lacked depth in civic engagement dimension',
    'Jenny integrated community service into every project: Small Business Stories (supporting local entrepreneurs), AI game (ethics education for young women), film projects (science communication). Portfolio architecture ensured multiple interconnected passion projects with measurable impact: 100+ users target, 30 states coverage.',
    'Transformed from individual achiever to community builder; projects gained social purpose dimension',
    0.65,
    false,
    '2024-03-15',
    '{"projects": ["Small Business Stories", "AI Ethics Game", "Science Comm Films"], "impact_metrics": {"game_users": "100+", "states": 30}}'::jsonb,
    false
);

-- Week 50-60 (June-Sept 2024): Academic Rigor & Senior Year Planning
INSERT INTO growth_events (
    id, student_id, barrier_type, trigger, coach_reflection, student_reflection,
    transformation_delta, breakthrough, occurred_at, linked_artifacts, is_synthetic
)
VALUES (
    gen_random_uuid(),
    'huda-2025',
    'INTERNAL_CONFIDENCE',
    'Senior year course load planning; balancing rigor with impact activities',
    'Maintained 4.0+ GPA while taking 5-6 AP courses. Coach guided strategic course selection to demonstrate academic excellence without compromising time for portfolio projects. Community college course added for advanced learning signal.',
    'Built confidence in academic capability while maintaining strategic time allocation for impact work',
    0.60,
    false,
    '2024-08-01',
    '{"ap_courses": 6, "gpa_maintained": 4.0, "community_college": true}'::jsonb,
    false
);

-- Week 70-80 (Nov 2024 - Feb 2025): College Application Season & Parent Navigation
INSERT INTO growth_events (
    id, student_id, barrier_type, trigger, coach_reflection, student_reflection,
    transformation_delta, breakthrough, occurred_at, linked_artifacts, is_synthetic
)
VALUES (
    gen_random_uuid(),
    'huda-2025',
    'PARENT_CONFLICT',
    'Parent stress during application season; managing expectations while maintaining autonomy',
    'Jenny navigated parent dynamics expertly from Week 1 ("This is music to my ears" - Dad buy-in). Continued through application season maintaining student autonomy while addressing parental concerns. Created 28-college balanced list (18 Reach, 7 Match, 3 Safety) with strategic positioning.',
    'Maintained healthy parent relationship while owning college application process; learned advocacy skills',
    0.70,
    false,
    '2024-12-15',
    '{"parent_buy_in": true, "college_list_finalized": 28, "parent_stress_managed": true}'::jsonb,
    false
);

-- Week 85-89 (April-June 2025): Decision Season & Reflection
INSERT INTO growth_events (
    id, student_id, barrier_type, trigger, coach_reflection, student_reflection,
    transformation_delta, breakthrough, occurred_at, linked_artifacts, is_synthetic
)
VALUES (
    gen_random_uuid(),
    'huda-2025',
    'SELF_IMAGE',
    'College decision season; synthesizing 2-year coaching journey and choosing final path',
    'Culmination of 219 coaching sessions over 2 years. From quiet student with disconnected interests to confident digital storyteller with unified identity (Film+CS=Digital Storyteller). Strategic Stanford/MIT/Berkeley positioning achieved through AI ethics narrative, community impact portfolio, and interdisciplinary excellence.',
    'Internalized growth journey; recognized transformation from "not exceptional" to exemplary interdisciplinary scholar',
    0.90,
    true,
    '2025-05-15',
    '{"coaching_weeks": 89, "total_sessions": 219, "final_identity": "Digital Storyteller", "transformation_complete": true}'::jsonb,
    false
);

-- Verification
SELECT
    'Growth Events Created' as summary,
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE breakthrough = TRUE) as breakthroughs,
    AVG(transformation_delta)::numeric(4,2) as avg_transformation,
    (AVG(transformation_delta) * 100)::numeric(5,2) as hgti_score_preview
FROM growth_events
WHERE student_id = 'huda-2025'
  AND is_synthetic = false;

-- Show timeline
SELECT
    occurred_at::date as event_date,
    barrier_type,
    LEFT(trigger, 60) || '...' as trigger_preview,
    transformation_delta,
    breakthrough
FROM growth_events
WHERE student_id = 'huda-2025'
  AND is_synthetic = false
ORDER BY occurred_at;

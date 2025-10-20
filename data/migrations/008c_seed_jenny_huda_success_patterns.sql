-- Migration 008c: Seed Success Pattern Chips from Jenny-Huda Journey
-- Created: 2025-10-16
-- Purpose: Load comprehensive success patterns across 16 categories
-- Source: 678 intel chips analyzed longitudinally

-- Enable migration mode
SET app.migration = true;

-- ============================================================================
-- SEED DATA: COMPREHENSIVE SUCCESS PATTERNS (16 CATEGORIES)
-- ============================================================================


-- Pattern ACTIVITY_OUTPUT_SURGE: 10 Meaningful Activities Output Surge
INSERT INTO moat_student_success_patterns (
  contributor_type, contributor_id, student_id, coach_id,
  title, pattern_slug, outcome_category,
  student_archetype, archetype_tags,
  start_date, outcome_date,
  starting_stats, barriers_faced, initial_challenges,
  tactics_used, tactic_sequence, most_impactful,
  key_turning_points, what_clicked,
  final_outcomes, measurable_results,
  what_worked, what_was_hard, what_would_change, advice_to_similar,
  data_completeness, validation_status, validated_by, quality_score,
  created_at, updated_at
)
VALUES (
  'coach',
  'jenny-duan',
  'huda-2025',
  'jenny-duan',
  '10 Meaningful Activities Output Surge',
  'activity-output-surge',
  'Activity Output Acceleration',
  '{"demographics": {"identity": "Muslim girl, first-gen immigrant, public HS", "family": "Language barrier household, parent involvement", "location": "Public high school, competitive region"}, "academic_profile": {"starting_gpa": "4.3 weighted", "pattern": "B first semester → A second semester", "sat_baseline": "1360", "courses": "8→11 APs through self-study"}, "starting_stats": {"activities": "Game dev since age 8, film interest, Sunday School teaching", "time_crisis": "4 hrs/day social media, scattered focus", "barriers": "Time management, generic narrative, hidden identity"}}'::jsonb,
  ARRAY['first-gen-immigrant', 'muslim-female', 'STEM', 'public-school', 'time-crisis', 'high-achiever'],
  '2023-06-26'::date,
  '2023-06-26'::date,
  '{"gpa": "4.3 weighted", "sat": 1360, "ecs": "Game dev project, Sunday School teaching, film interest", "screen_time": "4 hours/day social media", "productivity": "Low - scattered, no system"}'::jsonb,
  ARRAY['time-crisis', 'procrastination', 'generic-narrative', 'identity-hiding', 'low-differentiation'],
  'Scattered activities, no compound-benefit thinking',
  ARRAY['168-hour-framework', 'parent-story-reframe', 'early-work-showcase', 'daily-schedule-architecture', 'identity-as-differentiator'],
  '{"week_1_3": "168-hour-framework, early-work-showcase", "week_3_6": "daily-schedule-architecture, identity-as-differentiator", "week_12": "parent-story-reframe (NCWIT essay)"}'::jsonb,
  ARRAY['168-hour-framework', 'parent-story-reframe', 'identity-as-differentiator'],
  '{"week_1": "Game demo moment - Jenny sees technical sophistication", "week_3": "168-hour framework reveals 26 hrs/week available", "week_12": "Parent story reframe unlocks authentic essay"}'::jsonb,
  'Activity Output Acceleration breakthrough came from systematic application of coaching tactics over 2 weeks across P1-FOUNDATION phases',
  '{"activities_before": 2, "activities_after": 10, "timeframe": "6 months"}'::jsonb,
  '{"productivity": "Time management improvement", "test_scores": "SAT improvement detected", "academic": "GPA improvement detected", "recognition": "Award won"}'::jsonb,
  'Compound-benefit thinking: one activity yields multiple outcomes. 2 → 10 meaningful activities in 6 months.',
  'Sustaining discipline over 2 weeks. Phases: P1-FOUNDATION. Required consistent coaching check-ins.',
  'Would start identity clarity work even earlier',
  'Think compound-benefit: game project = CS skills + portfolio + NCWIT + essays + GitHub. 10 activities from 2 base projects.',
  0.95,
  'verified',
  'jenny-duan',
  0.94,
  '2023-06-26'::timestamptz,
  now()
);


-- Pattern BARRIER_BREAKTHROUGH: Barrier Breaking Moments
INSERT INTO moat_student_success_patterns (
  contributor_type, contributor_id, student_id, coach_id,
  title, pattern_slug, outcome_category,
  student_archetype, archetype_tags,
  start_date, outcome_date,
  starting_stats, barriers_faced, initial_challenges,
  tactics_used, tactic_sequence, most_impactful,
  key_turning_points, what_clicked,
  final_outcomes, measurable_results,
  what_worked, what_was_hard, what_would_change, advice_to_similar,
  data_completeness, validation_status, validated_by, quality_score,
  created_at, updated_at
)
VALUES (
  'coach',
  'jenny-duan',
  'huda-2025',
  'jenny-duan',
  'Barrier Breaking Moments',
  'barrier-breakthrough',
  'Barrier Breaking Moment',
  '{"demographics": {"identity": "Muslim girl, first-gen immigrant, public HS", "family": "Language barrier household, parent involvement", "location": "Public high school, competitive region"}, "academic_profile": {"starting_gpa": "4.3 weighted", "pattern": "B first semester → A second semester", "sat_baseline": "1360", "courses": "8→11 APs through self-study"}, "starting_stats": {"activities": "Game dev since age 8, film interest, Sunday School teaching", "time_crisis": "4 hrs/day social media, scattered focus", "barriers": "Time management, generic narrative, hidden identity"}}'::jsonb,
  ARRAY['first-gen-immigrant', 'muslim-female', 'STEM', 'public-school', 'time-crisis', 'high-achiever'],
  '2023-06-21'::date,
  '2023-10-23'::date,
  '{"gpa": "4.3 weighted", "sat": 1360, "ecs": "Game dev project, Sunday School teaching, film interest", "screen_time": "4 hours/day social media", "productivity": "Low - scattered, no system"}'::jsonb,
  ARRAY['time-crisis', 'procrastination', 'generic-narrative', 'identity-hiding', 'low-differentiation'],
  'Multiple barriers: time, identity, narrative, scale',
  ARRAY['168-hour-framework', 'parent-story-reframe', 'early-work-showcase', 'daily-schedule-architecture', 'identity-as-differentiator'],
  '{"week_1_3": "168-hour-framework, early-work-showcase", "week_3_6": "daily-schedule-architecture, identity-as-differentiator", "week_12": "parent-story-reframe (NCWIT essay)"}'::jsonb,
  ARRAY['168-hour-framework', 'parent-story-reframe', 'identity-as-differentiator'],
  '{"week_1": "Game demo moment - Jenny sees technical sophistication", "week_3": "168-hour framework reveals 26 hrs/week available", "week_12": "Parent story reframe unlocks authentic essay"}'::jsonb,
  'Barrier Breaking Moment breakthrough came from systematic application of coaching tactics over 11 weeks across P1-FOUNDATION, P2-BUILDING phases',
  '{"barriers_broken": 5, "timeframe": "6 months"}'::jsonb,
  '{"ec_funding": "Funding acquired", "productivity": "Time management improvement", "recognition": "Award won", "test_scores": "SAT improvement detected", "academic": "GPA improvement detected"}'::jsonb,
  'Multiple barriers broken systematically over 11 weeks: time management, narrative, identity, scale, leadership.',
  'Sustaining discipline over 11 weeks. Phases: P1-FOUNDATION, P2-BUILDING. Required consistent coaching check-ins.',
  'Would start identity clarity work even earlier',
  'Barriers fall systematically with coaching. Time → narrative → identity → scale. Each builds on previous.',
  0.95,
  'verified',
  'jenny-duan',
  0.95,
  '2023-06-21'::timestamptz,
  now()
);


-- Pattern COMMUNITY_IMPACT_SCALE: Community Impact & Sunday School Teaching
INSERT INTO moat_student_success_patterns (
  contributor_type, contributor_id, student_id, coach_id,
  title, pattern_slug, outcome_category,
  student_archetype, archetype_tags,
  start_date, outcome_date,
  starting_stats, barriers_faced, initial_challenges,
  tactics_used, tactic_sequence, most_impactful,
  key_turning_points, what_clicked,
  final_outcomes, measurable_results,
  what_worked, what_was_hard, what_would_change, advice_to_similar,
  data_completeness, validation_status, validated_by, quality_score,
  created_at, updated_at
)
VALUES (
  'coach',
  'jenny-duan',
  'huda-2025',
  'jenny-duan',
  'Community Impact & Sunday School Teaching',
  'community-impact-scale',
  'Community Impact Growth',
  '{"demographics": {"identity": "Muslim girl, first-gen immigrant, public HS", "family": "Language barrier household, parent involvement", "location": "Public high school, competitive region"}, "academic_profile": {"starting_gpa": "4.3 weighted", "pattern": "B first semester → A second semester", "sat_baseline": "1360", "courses": "8→11 APs through self-study"}, "starting_stats": {"activities": "Game dev since age 8, film interest, Sunday School teaching", "time_crisis": "4 hrs/day social media, scattered focus", "barriers": "Time management, generic narrative, hidden identity"}}'::jsonb,
  ARRAY['first-gen-immigrant', 'muslim-female', 'STEM', 'public-school', 'time-crisis', 'high-achiever'],
  '2023-06-21'::date,
  '2023-12-11'::date,
  '{"gpa": "4.3 weighted", "sat": 1360, "ecs": "Game dev project, Sunday School teaching, film interest", "screen_time": "4 hours/day social media", "productivity": "Low - scattered, no system"}'::jsonb,
  ARRAY['time-crisis', 'procrastination', 'generic-narrative', 'identity-hiding', 'low-differentiation'],
  'Sunday School teaching not leveraged as differentiator',
  ARRAY['168-hour-framework', 'parent-story-reframe', 'early-work-showcase', 'daily-schedule-architecture', 'identity-as-differentiator'],
  '{"week_1_3": "168-hour-framework, early-work-showcase", "week_3_6": "daily-schedule-architecture, identity-as-differentiator", "week_12": "parent-story-reframe (NCWIT essay)"}'::jsonb,
  ARRAY['168-hour-framework', 'parent-story-reframe', 'identity-as-differentiator'],
  '{"week_1": "Game demo moment - Jenny sees technical sophistication", "week_3": "168-hour framework reveals 26 hrs/week available", "week_12": "Parent story reframe unlocks authentic essay"}'::jsonb,
  'Community Impact Growth breakthrough came from systematic application of coaching tactics over 14 weeks across P1-FOUNDATION, P2-BUILDING phases',
  '{"students_taught": "50+ Sunday School", "cultural_content": "Video series created"}'::jsonb,
  '{"academic": "GPA improvement detected", "recognition": "Award won", "ec_funding": "Funding acquired", "productivity": "Time management improvement", "ec_impact": "Scale growth detected", "test_scores": "SAT improvement detected"}'::jsonb,
  'Sunday School teaching + cultural video series positioned as community impact differentiator. 50+ students taught.',
  'Sustaining discipline over 14 weeks. Phases: P1-FOUNDATION, P2-BUILDING. Required consistent coaching check-ins.',
  'Would start identity clarity work even earlier',
  'Leverage existing community ties (Sunday School). Document hours + students taught. Cultural content is differentiator.',
  0.95,
  'verified',
  'jenny-duan',
  0.94,
  '2023-06-21'::timestamptz,
  now()
);


-- Pattern EC_FUNDING: Funding & Resource Acquisition Pattern
INSERT INTO moat_student_success_patterns (
  contributor_type, contributor_id, student_id, coach_id,
  title, pattern_slug, outcome_category,
  student_archetype, archetype_tags,
  start_date, outcome_date,
  starting_stats, barriers_faced, initial_challenges,
  tactics_used, tactic_sequence, most_impactful,
  key_turning_points, what_clicked,
  final_outcomes, measurable_results,
  what_worked, what_was_hard, what_would_change, advice_to_similar,
  data_completeness, validation_status, validated_by, quality_score,
  created_at, updated_at
)
VALUES (
  'coach',
  'jenny-duan',
  'huda-2025',
  'jenny-duan',
  'Funding & Resource Acquisition Pattern',
  'ec-funding',
  'EC Funding & Resources',
  '{"demographics": {"identity": "Muslim girl, first-gen immigrant, public HS", "family": "Language barrier household, parent involvement", "location": "Public high school, competitive region"}, "academic_profile": {"starting_gpa": "4.3 weighted", "pattern": "B first semester → A second semester", "sat_baseline": "1360", "courses": "8→11 APs through self-study"}, "starting_stats": {"activities": "Game dev since age 8, film interest, Sunday School teaching", "time_crisis": "4 hrs/day social media, scattered focus", "barriers": "Time management, generic narrative, hidden identity"}}'::jsonb,
  ARRAY['first-gen-immigrant', 'muslim-female', 'STEM', 'public-school', 'time-crisis', 'high-achiever'],
  '2023-06-21'::date,
  '2023-11-16'::date,
  '{"gpa": "4.3 weighted", "sat": 1360, "ecs": "Game dev project, Sunday School teaching, film interest", "screen_time": "4 hours/day social media", "productivity": "Low - scattered, no system"}'::jsonb,
  ARRAY['time-crisis', 'procrastination', 'generic-narrative', 'identity-hiding', 'low-differentiation'],
  'No funding sources identified, resource constraints',
  ARRAY['168-hour-framework', 'parent-story-reframe', 'early-work-showcase', 'daily-schedule-architecture', 'identity-as-differentiator'],
  '{"week_1_3": "168-hour-framework, early-work-showcase", "week_3_6": "daily-schedule-architecture, identity-as-differentiator", "week_12": "parent-story-reframe (NCWIT essay)"}'::jsonb,
  ARRAY['168-hour-framework', 'parent-story-reframe', 'identity-as-differentiator'],
  '{"week_1": "Game demo moment - Jenny sees technical sophistication", "week_3": "168-hour framework reveals 26 hrs/week available", "week_12": "Parent story reframe unlocks authentic essay"}'::jsonb,
  'EC Funding & Resources breakthrough came from systematic application of coaching tactics over 8 weeks across P1-FOUNDATION, P2-BUILDING phases',
  '{"amount": "$5000+", "sources": "School grants, competitions"}'::jsonb,
  '{"ec_funding": "Funding acquired", "productivity": "Time management improvement", "test_scores": "SAT improvement detected", "academic": "GPA improvement detected", "recognition": "Award won", "ec_impact": "Scale growth detected"}'::jsonb,
  'Resource acquisition through strategic grant applications and competition winnings. Multiple funding sources secured.',
  'Sustaining discipline over 8 weeks. Phases: P1-FOUNDATION, P2-BUILDING. Required consistent coaching check-ins.',
  'Would start identity clarity work even earlier',
  'Apply to grants early and often. School resources, competitions, foundations. Multiple small sources add up.',
  0.95,
  'verified',
  'jenny-duan',
  0.94,
  '2023-06-21'::timestamptz,
  now()
);


-- Pattern EC_LEADERSHIP_ROLE: Leadership Role Acquisition
INSERT INTO moat_student_success_patterns (
  contributor_type, contributor_id, student_id, coach_id,
  title, pattern_slug, outcome_category,
  student_archetype, archetype_tags,
  start_date, outcome_date,
  starting_stats, barriers_faced, initial_challenges,
  tactics_used, tactic_sequence, most_impactful,
  key_turning_points, what_clicked,
  final_outcomes, measurable_results,
  what_worked, what_was_hard, what_would_change, advice_to_similar,
  data_completeness, validation_status, validated_by, quality_score,
  created_at, updated_at
)
VALUES (
  'coach',
  'jenny-duan',
  'huda-2025',
  'jenny-duan',
  'Leadership Role Acquisition',
  'ec-leadership-role',
  'EC Leadership Acquisition',
  '{"demographics": {"identity": "Muslim girl, first-gen immigrant, public HS", "family": "Language barrier household, parent involvement", "location": "Public high school, competitive region"}, "academic_profile": {"starting_gpa": "4.3 weighted", "pattern": "B first semester → A second semester", "sat_baseline": "1360", "courses": "8→11 APs through self-study"}, "starting_stats": {"activities": "Game dev since age 8, film interest, Sunday School teaching", "time_crisis": "4 hrs/day social media, scattered focus", "barriers": "Time management, generic narrative, hidden identity"}}'::jsonb,
  ARRAY['first-gen-immigrant', 'muslim-female', 'STEM', 'public-school', 'time-crisis', 'high-achiever'],
  '2023-06-21'::date,
  '2023-12-10'::date,
  '{"gpa": "4.3 weighted", "sat": 1360, "ecs": "Game dev project, Sunday School teaching, film interest", "screen_time": "4 hours/day social media", "productivity": "Low - scattered, no system"}'::jsonb,
  ARRAY['time-crisis', 'procrastination', 'generic-narrative', 'identity-hiding', 'low-differentiation'],
  'Follower mindset, no leadership positions',
  ARRAY['168-hour-framework', 'parent-story-reframe', 'early-work-showcase', 'daily-schedule-architecture', 'identity-as-differentiator'],
  '{"week_1_3": "168-hour-framework, early-work-showcase", "week_3_6": "daily-schedule-architecture, identity-as-differentiator", "week_12": "parent-story-reframe (NCWIT essay)"}'::jsonb,
  ARRAY['168-hour-framework', 'parent-story-reframe', 'identity-as-differentiator'],
  '{"week_1": "Game demo moment - Jenny sees technical sophistication", "week_3": "168-hour framework reveals 26 hrs/week available", "week_12": "Parent story reframe unlocks authentic essay"}'::jsonb,
  'EC Leadership Acquisition breakthrough came from systematic application of coaching tactics over 16 weeks across P1-FOUNDATION, P2-BUILDING phases',
  '{"roles": "Women in AI Club Founder, Encode Justice Lead"}'::jsonb,
  '{"recognition": "Award won", "ec_funding": "Funding acquired", "productivity": "Time management improvement", "test_scores": "SAT improvement detected", "academic": "GPA improvement detected"}'::jsonb,
  'Leadership roles acquired through founder mindset shift. Women in AI Club + Encode Justice leadership established.',
  'Sustaining discipline over 16 weeks. Phases: P1-FOUNDATION, P2-BUILDING. Required consistent coaching check-ins.',
  'Would start identity clarity work even earlier',
  'Founder > member. Create new clubs aligned with your identity. Leadership through initiative, not just titles.',
  0.95,
  'verified',
  'jenny-duan',
  0.95,
  '2023-06-21'::timestamptz,
  now()
);


-- Pattern EC_USER_SCALE: Synthoria Scale Growth Journey
INSERT INTO moat_student_success_patterns (
  contributor_type, contributor_id, student_id, coach_id,
  title, pattern_slug, outcome_category,
  student_archetype, archetype_tags,
  start_date, outcome_date,
  starting_stats, barriers_faced, initial_challenges,
  tactics_used, tactic_sequence, most_impactful,
  key_turning_points, what_clicked,
  final_outcomes, measurable_results,
  what_worked, what_was_hard, what_would_change, advice_to_similar,
  data_completeness, validation_status, validated_by, quality_score,
  created_at, updated_at
)
VALUES (
  'coach',
  'jenny-duan',
  'huda-2025',
  'jenny-duan',
  'Synthoria Scale Growth Journey',
  'ec-user-scale',
  'EC User/Impact Scale Growth',
  '{"demographics": {"identity": "Muslim girl, first-gen immigrant, public HS", "family": "Language barrier household, parent involvement", "location": "Public high school, competitive region"}, "academic_profile": {"starting_gpa": "4.3 weighted", "pattern": "B first semester → A second semester", "sat_baseline": "1360", "courses": "8→11 APs through self-study"}, "starting_stats": {"activities": "Game dev since age 8, film interest, Sunday School teaching", "time_crisis": "4 hrs/day social media, scattered focus", "barriers": "Time management, generic narrative, hidden identity"}}'::jsonb,
  ARRAY['first-gen-immigrant', 'muslim-female', 'STEM', 'public-school', 'time-crisis', 'high-achiever'],
  '2023-06-21'::date,
  '2023-12-17'::date,
  '{"gpa": "4.3 weighted", "sat": 1360, "ecs": "Game dev project, Sunday School teaching, film interest", "screen_time": "4 hours/day social media", "productivity": "Low - scattered, no system"}'::jsonb,
  ARRAY['time-crisis', 'procrastination', 'generic-narrative', 'identity-hiding', 'low-differentiation'],
  'Synthoria struggling to scale beyond initial users',
  ARRAY['168-hour-framework', 'parent-story-reframe', 'early-work-showcase', 'daily-schedule-architecture', 'identity-as-differentiator'],
  '{"week_1_3": "168-hour-framework, early-work-showcase", "week_3_6": "daily-schedule-architecture, identity-as-differentiator", "week_12": "parent-story-reframe (NCWIT essay)"}'::jsonb,
  ARRAY['168-hour-framework', 'parent-story-reframe', 'identity-as-differentiator'],
  '{"week_1": "Game demo moment - Jenny sees technical sophistication", "week_3": "168-hour framework reveals 26 hrs/week available", "week_12": "Parent story reframe unlocks authentic essay"}'::jsonb,
  'EC User/Impact Scale Growth breakthrough came from systematic application of coaching tactics over 7 weeks across P1-FOUNDATION, P2-BUILDING phases',
  '{"users_before": "<100", "users_after": "500+", "impact": "Immigrant families helped"}'::jsonb,
  '{"academic": "GPA improvement detected", "ec_impact": "Scale growth detected", "recognition": "Award won", "ec_funding": "Funding acquired", "productivity": "Time management improvement", "test_scores": "SAT improvement detected"}'::jsonb,
  'Synthoria scale growth through targeted user acquisition and iterative improvements. 17 coaching interventions over 7 weeks.',
  'Sustaining discipline over 7 weeks. Phases: P1-FOUNDATION, P2-BUILDING. Required consistent coaching check-ins.',
  'Would start identity clarity work even earlier',
  'Scale requires iteration + user feedback. Start small, improve systematically. Document impact metrics for applications.',
  0.95,
  'verified',
  'jenny-duan',
  0.94,
  '2023-06-21'::timestamptz,
  now()
);


-- Pattern ESSAY_TRANSFORMATION: Essay Generic → Differentiated Transformation
INSERT INTO moat_student_success_patterns (
  contributor_type, contributor_id, student_id, coach_id,
  title, pattern_slug, outcome_category,
  student_archetype, archetype_tags,
  start_date, outcome_date,
  starting_stats, barriers_faced, initial_challenges,
  tactics_used, tactic_sequence, most_impactful,
  key_turning_points, what_clicked,
  final_outcomes, measurable_results,
  what_worked, what_was_hard, what_would_change, advice_to_similar,
  data_completeness, validation_status, validated_by, quality_score,
  created_at, updated_at
)
VALUES (
  'coach',
  'jenny-duan',
  'huda-2025',
  'jenny-duan',
  'Essay Generic → Differentiated Transformation',
  'essay-transformation',
  'Essay Quality Transformation',
  '{"demographics": {"identity": "Muslim girl, first-gen immigrant, public HS", "family": "Language barrier household, parent involvement", "location": "Public high school, competitive region"}, "academic_profile": {"starting_gpa": "4.3 weighted", "pattern": "B first semester → A second semester", "sat_baseline": "1360", "courses": "8→11 APs through self-study"}, "starting_stats": {"activities": "Game dev since age 8, film interest, Sunday School teaching", "time_crisis": "4 hrs/day social media, scattered focus", "barriers": "Time management, generic narrative, hidden identity"}}'::jsonb,
  ARRAY['first-gen-immigrant', 'muslim-female', 'STEM', 'public-school', 'time-crisis', 'high-achiever'],
  '2023-06-21'::date,
  '2023-12-11'::date,
  '{"gpa": "4.3 weighted", "sat": 1360, "ecs": "Game dev project, Sunday School teaching, film interest", "screen_time": "4 hours/day social media", "productivity": "Low - scattered, no system"}'::jsonb,
  ARRAY['time-crisis', 'procrastination', 'generic-narrative', 'identity-hiding', 'low-differentiation'],
  'Generic parent sacrifice story, no differentiation',
  ARRAY['168-hour-framework', 'parent-story-reframe', 'early-work-showcase', 'daily-schedule-architecture', 'identity-as-differentiator'],
  '{"week_1_3": "168-hour-framework, early-work-showcase", "week_3_6": "daily-schedule-architecture, identity-as-differentiator", "week_12": "parent-story-reframe (NCWIT essay)"}'::jsonb,
  ARRAY['168-hour-framework', 'parent-story-reframe', 'identity-as-differentiator'],
  '{"week_1": "Game demo moment - Jenny sees technical sophistication", "week_3": "168-hour framework reveals 26 hrs/week available", "week_12": "Parent story reframe unlocks authentic essay"}'::jsonb,
  'Essay Quality Transformation breakthrough came from systematic application of coaching tactics over 19 weeks across P1-FOUNDATION, P2-BUILDING phases',
  '{"quality_before": "3/10", "quality_after": "9/10", "authenticity": "Generic → Deeply personal"}'::jsonb,
  '{"ec_funding": "Funding acquired", "academic": "GPA improvement detected", "ec_impact": "Scale growth detected", "recognition": "Award won", "test_scores": "SAT improvement detected", "productivity": "Time management improvement"}'::jsonb,
  'Parent story reframe technique: surface unconscious experiences (mom language barrier) → connect to mission (AI tutor) → specific sensory details. Generic → 9/10 authentic.',
  'Sustaining discipline over 19 weeks. Phases: P1-FOUNDATION, P2-BUILDING. Required consistent coaching check-ins.',
  'Would start identity clarity work even earlier',
  'Avoid generic parent stories. Surface YOUR unconscious experiences. Connect parent barrier → your mission. Specific sensory details, not abstract concepts.',
  0.95,
  'verified',
  'jenny-duan',
  0.95,
  '2023-06-21'::timestamptz,
  now()
);


-- Pattern GPA_BOOST: All A's Consistency Strategy
INSERT INTO moat_student_success_patterns (
  contributor_type, contributor_id, student_id, coach_id,
  title, pattern_slug, outcome_category,
  student_archetype, archetype_tags,
  start_date, outcome_date,
  starting_stats, barriers_faced, initial_challenges,
  tactics_used, tactic_sequence, most_impactful,
  key_turning_points, what_clicked,
  final_outcomes, measurable_results,
  what_worked, what_was_hard, what_would_change, advice_to_similar,
  data_completeness, validation_status, validated_by, quality_score,
  created_at, updated_at
)
VALUES (
  'coach',
  'jenny-duan',
  'huda-2025',
  'jenny-duan',
  'All A''s Consistency Strategy',
  'gpa-boost',
  'GPA/Grade Improvement',
  '{"demographics": {"identity": "Muslim girl, first-gen immigrant, public HS", "family": "Language barrier household, parent involvement", "location": "Public high school, competitive region"}, "academic_profile": {"starting_gpa": "4.3 weighted", "pattern": "B first semester → A second semester", "sat_baseline": "1360", "courses": "8→11 APs through self-study"}, "starting_stats": {"activities": "Game dev since age 8, film interest, Sunday School teaching", "time_crisis": "4 hrs/day social media, scattered focus", "barriers": "Time management, generic narrative, hidden identity"}}'::jsonb,
  ARRAY['first-gen-immigrant', 'muslim-female', 'STEM', 'public-school', 'time-crisis', 'high-achiever'],
  '2023-06-21'::date,
  '2023-11-16'::date,
  '{"gpa": "4.3 weighted", "sat": 1360, "ecs": "Game dev project, Sunday School teaching, film interest", "screen_time": "4 hours/day social media", "productivity": "Low - scattered, no system"}'::jsonb,
  ARRAY['time-crisis', 'procrastination', 'generic-narrative', 'identity-hiding', 'low-differentiation'],
  'B→A pattern showing adjustment issues, needed consistency',
  ARRAY['168-hour-framework', 'parent-story-reframe', 'early-work-showcase', 'daily-schedule-architecture', 'identity-as-differentiator'],
  '{"week_1_3": "168-hour-framework, early-work-showcase", "week_3_6": "daily-schedule-architecture, identity-as-differentiator", "week_12": "parent-story-reframe (NCWIT essay)"}'::jsonb,
  ARRAY['168-hour-framework', 'parent-story-reframe', 'identity-as-differentiator'],
  '{"week_1": "Game demo moment - Jenny sees technical sophistication", "week_3": "168-hour framework reveals 26 hrs/week available", "week_12": "Parent story reframe unlocks authentic essay"}'::jsonb,
  'GPA/Grade Improvement breakthrough came from systematic application of coaching tactics over 9 weeks across P1-FOUNDATION, P2-BUILDING phases',
  '{"gpa_final": "4.0 unweighted, 4.5+ weighted", "consistency": "All A''s both semesters"}'::jsonb,
  '{"academic": "GPA improvement detected", "recognition": "Award won", "ec_impact": "Scale growth detected", "productivity": "Time management improvement", "test_scores": "SAT improvement detected", "ec_funding": "Funding acquired"}'::jsonb,
  'Breaking B→A pattern required first-semester front-loading. All A''s both semesters achieved through schedule discipline.',
  'Sustaining discipline over 9 weeks. Phases: P1-FOUNDATION, P2-BUILDING. Required consistent coaching check-ins.',
  'Would start identity clarity work even earlier',
  'Front-load first semester. Don''t settle for B→A pattern. All A''s both semesters shows consistency to colleges.',
  0.95,
  'verified',
  'jenny-duan',
  0.94,
  '2023-06-21'::timestamptz,
  now()
);


-- Pattern IDENTITY_CLARITY: Muslim Tech Pioneer Identity Crystallization
INSERT INTO moat_student_success_patterns (
  contributor_type, contributor_id, student_id, coach_id,
  title, pattern_slug, outcome_category,
  student_archetype, archetype_tags,
  start_date, outcome_date,
  starting_stats, barriers_faced, initial_challenges,
  tactics_used, tactic_sequence, most_impactful,
  key_turning_points, what_clicked,
  final_outcomes, measurable_results,
  what_worked, what_was_hard, what_would_change, advice_to_similar,
  data_completeness, validation_status, validated_by, quality_score,
  created_at, updated_at
)
VALUES (
  'coach',
  'jenny-duan',
  'huda-2025',
  'jenny-duan',
  'Muslim Tech Pioneer Identity Crystallization',
  'identity-clarity',
  'Identity & Positioning Clarity',
  '{"demographics": {"identity": "Muslim girl, first-gen immigrant, public HS", "family": "Language barrier household, parent involvement", "location": "Public high school, competitive region"}, "academic_profile": {"starting_gpa": "4.3 weighted", "pattern": "B first semester → A second semester", "sat_baseline": "1360", "courses": "8→11 APs through self-study"}, "starting_stats": {"activities": "Game dev since age 8, film interest, Sunday School teaching", "time_crisis": "4 hrs/day social media, scattered focus", "barriers": "Time management, generic narrative, hidden identity"}}'::jsonb,
  ARRAY['first-gen-immigrant', 'muslim-female', 'STEM', 'public-school', 'time-crisis', 'high-achiever'],
  '2023-06-21'::date,
  '2023-12-11'::date,
  '{"gpa": "4.3 weighted", "sat": 1360, "ecs": "Game dev project, Sunday School teaching, film interest", "screen_time": "4 hours/day social media", "productivity": "Low - scattered, no system"}'::jsonb,
  ARRAY['time-crisis', 'procrastination', 'generic-narrative', 'identity-hiding', 'low-differentiation'],
  'Hiding Muslim identity due to Asian CS stereotype fears',
  ARRAY['168-hour-framework', 'parent-story-reframe', 'early-work-showcase', 'daily-schedule-architecture', 'identity-as-differentiator'],
  '{"week_1_3": "168-hour-framework, early-work-showcase", "week_3_6": "daily-schedule-architecture, identity-as-differentiator", "week_12": "parent-story-reframe (NCWIT essay)"}'::jsonb,
  ARRAY['168-hour-framework', 'parent-story-reframe', 'identity-as-differentiator'],
  '{"week_1": "Game demo moment - Jenny sees technical sophistication", "week_3": "168-hour framework reveals 26 hrs/week available", "week_12": "Parent story reframe unlocks authentic essay"}'::jsonb,
  'Identity & Positioning Clarity breakthrough came from systematic application of coaching tactics over 15 weeks across P1-FOUNDATION, P2-BUILDING phases',
  '{"narrative": "Muslim tech pioneer breaking barriers through games", "confidence": "Hiding → Leading with identity"}'::jsonb,
  '{"ec_funding": "Funding acquired", "recognition": "Award won", "academic": "GPA improvement detected", "ec_impact": "Scale growth detected", "productivity": "Time management improvement", "test_scores": "SAT improvement detected"}'::jsonb,
  'Identity as differentiator strategy: validate cultural identity → build coherent narrative → weave into all components. Muslim girl breaking tech barriers became core brand.',
  'Sustaining discipline over 15 weeks. Phases: P1-FOUNDATION, P2-BUILDING. Required consistent coaching check-ins.',
  'Would start identity clarity work even earlier',
  'Your cultural identity is an ASSET post-affirmative action. Don''t hide it. Build coherent narrative. Research college cultural fit (MSAs at target schools).',
  0.95,
  'verified',
  'jenny-duan',
  0.94,
  '2023-06-21'::timestamptz,
  now()
);


-- Pattern NATIONAL_AWARD_WIN: NCWIT National Winner Journey
INSERT INTO moat_student_success_patterns (
  contributor_type, contributor_id, student_id, coach_id,
  title, pattern_slug, outcome_category,
  student_archetype, archetype_tags,
  start_date, outcome_date,
  starting_stats, barriers_faced, initial_challenges,
  tactics_used, tactic_sequence, most_impactful,
  key_turning_points, what_clicked,
  final_outcomes, measurable_results,
  what_worked, what_was_hard, what_would_change, advice_to_similar,
  data_completeness, validation_status, validated_by, quality_score,
  created_at, updated_at
)
VALUES (
  'coach',
  'jenny-duan',
  'huda-2025',
  'jenny-duan',
  'NCWIT National Winner Journey',
  'national-award-win',
  'National Award Win',
  '{"demographics": {"identity": "Muslim girl, first-gen immigrant, public HS", "family": "Language barrier household, parent involvement", "location": "Public high school, competitive region"}, "academic_profile": {"starting_gpa": "4.3 weighted", "pattern": "B first semester → A second semester", "sat_baseline": "1360", "courses": "8→11 APs through self-study"}, "starting_stats": {"activities": "Game dev since age 8, film interest, Sunday School teaching", "time_crisis": "4 hrs/day social media, scattered focus", "barriers": "Time management, generic narrative, hidden identity"}}'::jsonb,
  ARRAY['first-gen-immigrant', 'muslim-female', 'STEM', 'public-school', 'time-crisis', 'high-achiever'],
  '2023-06-21'::date,
  '2023-12-17'::date,
  '{"gpa": "4.3 weighted", "sat": 1360, "ecs": "Game dev project, Sunday School teaching, film interest", "screen_time": "4 hours/day social media", "productivity": "Low - scattered, no system"}'::jsonb,
  ARRAY['time-crisis', 'procrastination', 'generic-narrative', 'identity-hiding', 'low-differentiation'],
  'No national recognition, generic CS narrative, hidden projects',
  ARRAY['168-hour-framework', 'parent-story-reframe', 'early-work-showcase', 'daily-schedule-architecture', 'identity-as-differentiator'],
  '{"week_1_3": "168-hour-framework, early-work-showcase", "week_3_6": "daily-schedule-architecture, identity-as-differentiator", "week_12": "parent-story-reframe (NCWIT essay)"}'::jsonb,
  ARRAY['168-hour-framework', 'parent-story-reframe', 'identity-as-differentiator'],
  '{"week_1": "Game demo moment - Jenny sees technical sophistication", "week_3": "168-hour framework reveals 26 hrs/week available", "week_12": "Parent story reframe unlocks authentic essay"}'::jsonb,
  'National Award Win breakthrough came from systematic application of coaching tactics over 19 weeks across P1-FOUNDATION, P2-BUILDING phases',
  '{"award": "NCWIT National Winner (Top 40 in US)", "date": "2024-03-15", "category": "CS + Social Impact"}'::jsonb,
  '{"academic": "GPA improvement detected", "recognition": "Award won", "ec_impact": "Scale growth detected", "productivity": "Time management improvement", "test_scores": "SAT improvement detected", "ec_funding": "Funding acquired"}'::jsonb,
  'Systematic narrative building over 19 weeks. Parent story reframe created authentic differentiation. Cultural identity positioned as asset, not liability. Technical portfolio + essay + identity = NCWIT win.',
  'Sustaining discipline over 19 weeks. Phases: P1-FOUNDATION, P2-BUILDING. Required consistent coaching check-ins.',
  'Would start identity clarity work even earlier',
  'Start early (junior summer). Build authentic narrative. Don''t hide cultural identity. Connect personal story to technical work. NCWIT values authenticity + impact.',
  0.95,
  'verified',
  'jenny-duan',
  0.94,
  '2023-06-21'::timestamptz,
  now()
);


-- Pattern PORTFOLIO_SHOWCASE: Portfolio & GitHub Showcase Strategy
INSERT INTO moat_student_success_patterns (
  contributor_type, contributor_id, student_id, coach_id,
  title, pattern_slug, outcome_category,
  student_archetype, archetype_tags,
  start_date, outcome_date,
  starting_stats, barriers_faced, initial_challenges,
  tactics_used, tactic_sequence, most_impactful,
  key_turning_points, what_clicked,
  final_outcomes, measurable_results,
  what_worked, what_was_hard, what_would_change, advice_to_similar,
  data_completeness, validation_status, validated_by, quality_score,
  created_at, updated_at
)
VALUES (
  'coach',
  'jenny-duan',
  'huda-2025',
  'jenny-duan',
  'Portfolio & GitHub Showcase Strategy',
  'portfolio-showcase',
  'Portfolio & Showcase Creation',
  '{"demographics": {"identity": "Muslim girl, first-gen immigrant, public HS", "family": "Language barrier household, parent involvement", "location": "Public high school, competitive region"}, "academic_profile": {"starting_gpa": "4.3 weighted", "pattern": "B first semester → A second semester", "sat_baseline": "1360", "courses": "8→11 APs through self-study"}, "starting_stats": {"activities": "Game dev since age 8, film interest, Sunday School teaching", "time_crisis": "4 hrs/day social media, scattered focus", "barriers": "Time management, generic narrative, hidden identity"}}'::jsonb,
  ARRAY['first-gen-immigrant', 'muslim-female', 'STEM', 'public-school', 'time-crisis', 'high-achiever'],
  '2023-06-21'::date,
  '2023-12-17'::date,
  '{"gpa": "4.3 weighted", "sat": 1360, "ecs": "Game dev project, Sunday School teaching, film interest", "screen_time": "4 hours/day social media", "productivity": "Low - scattered, no system"}'::jsonb,
  ARRAY['time-crisis', 'procrastination', 'generic-narrative', 'identity-hiding', 'low-differentiation'],
  'Hidden game project, no GitHub presence',
  ARRAY['168-hour-framework', 'parent-story-reframe', 'early-work-showcase', 'daily-schedule-architecture', 'identity-as-differentiator'],
  '{"week_1_3": "168-hour-framework, early-work-showcase", "week_3_6": "daily-schedule-architecture, identity-as-differentiator", "week_12": "parent-story-reframe (NCWIT essay)"}'::jsonb,
  ARRAY['168-hour-framework', 'parent-story-reframe', 'identity-as-differentiator'],
  '{"week_1": "Game demo moment - Jenny sees technical sophistication", "week_3": "168-hour framework reveals 26 hrs/week available", "week_12": "Parent story reframe unlocks authentic essay"}'::jsonb,
  'Portfolio & Showcase Creation breakthrough came from systematic application of coaching tactics over 17 weeks across P1-FOUNDATION, P2-BUILDING phases',
  '{"github_projects": 5, "showcase_quality": "College-level work demonstrated"}'::jsonb,
  '{"academic": "GPA improvement detected", "ec_impact": "Scale growth detected", "recognition": "Award won", "ec_funding": "Funding acquired", "productivity": "Time management improvement", "test_scores": "SAT improvement detected"}'::jsonb,
  'GitHub portfolio built systematically. 5 projects showcased demonstrating college-level technical maturity.',
  'Sustaining discipline over 17 weeks. Phases: P1-FOUNDATION, P2-BUILDING. Required consistent coaching check-ins.',
  'Would start identity clarity work even earlier',
  'GitHub is your resume. 5 quality projects > 20 random repos. Document your thought process, not just code.',
  0.95,
  'verified',
  'jenny-duan',
  0.94,
  '2023-06-21'::timestamptz,
  now()
);


-- Pattern REGIONAL_AWARD_WIN: Regional/State Award Wins
INSERT INTO moat_student_success_patterns (
  contributor_type, contributor_id, student_id, coach_id,
  title, pattern_slug, outcome_category,
  student_archetype, archetype_tags,
  start_date, outcome_date,
  starting_stats, barriers_faced, initial_challenges,
  tactics_used, tactic_sequence, most_impactful,
  key_turning_points, what_clicked,
  final_outcomes, measurable_results,
  what_worked, what_was_hard, what_would_change, advice_to_similar,
  data_completeness, validation_status, validated_by, quality_score,
  created_at, updated_at
)
VALUES (
  'coach',
  'jenny-duan',
  'huda-2025',
  'jenny-duan',
  'Regional/State Award Wins',
  'regional-award-win',
  'Regional/State Award',
  '{"demographics": {"identity": "Muslim girl, first-gen immigrant, public HS", "family": "Language barrier household, parent involvement", "location": "Public high school, competitive region"}, "academic_profile": {"starting_gpa": "4.3 weighted", "pattern": "B first semester → A second semester", "sat_baseline": "1360", "courses": "8→11 APs through self-study"}, "starting_stats": {"activities": "Game dev since age 8, film interest, Sunday School teaching", "time_crisis": "4 hrs/day social media, scattered focus", "barriers": "Time management, generic narrative, hidden identity"}}'::jsonb,
  ARRAY['first-gen-immigrant', 'muslim-female', 'STEM', 'public-school', 'time-crisis', 'high-achiever'],
  '2023-06-21'::date,
  '2023-12-11'::date,
  '{"gpa": "4.3 weighted", "sat": 1360, "ecs": "Game dev project, Sunday School teaching, film interest", "screen_time": "4 hours/day social media", "productivity": "Low - scattered, no system"}'::jsonb,
  ARRAY['time-crisis', 'procrastination', 'generic-narrative', 'identity-hiding', 'low-differentiation'],
  'No regional recognition established',
  ARRAY['168-hour-framework', 'parent-story-reframe', 'early-work-showcase', 'daily-schedule-architecture', 'identity-as-differentiator'],
  '{"week_1_3": "168-hour-framework, early-work-showcase", "week_3_6": "daily-schedule-architecture, identity-as-differentiator", "week_12": "parent-story-reframe (NCWIT essay)"}'::jsonb,
  ARRAY['168-hour-framework', 'parent-story-reframe', 'identity-as-differentiator'],
  '{"week_1": "Game demo moment - Jenny sees technical sophistication", "week_3": "168-hour framework reveals 26 hrs/week available", "week_12": "Parent story reframe unlocks authentic essay"}'::jsonb,
  'Regional/State Award breakthrough came from systematic application of coaching tactics over 5 weeks across P1-FOUNDATION, P2-BUILDING phases',
  '{"count": 2, "categories": "Speech & Debate, Film"}'::jsonb,
  '{"academic": "GPA improvement detected", "ec_impact": "Scale growth detected", "recognition": "Award won", "productivity": "Time management improvement", "test_scores": "SAT improvement detected"}'::jsonb,
  'Regional recognition in speech & debate and film. Foundation for national-level applications.',
  'Sustaining discipline over 5 weeks. Phases: P1-FOUNDATION, P2-BUILDING. Required consistent coaching check-ins.',
  'Would start identity clarity work even earlier',
  'Regional awards build credibility for national. Apply strategically, don''t spread too thin.',
  0.95,
  'verified',
  'jenny-duan',
  0.94,
  '2023-06-21'::timestamptz,
  now()
);


-- Pattern TECHNICAL_SKILL_DEVELOPMENT: Technical Skills Mastery Journey
INSERT INTO moat_student_success_patterns (
  contributor_type, contributor_id, student_id, coach_id,
  title, pattern_slug, outcome_category,
  student_archetype, archetype_tags,
  start_date, outcome_date,
  starting_stats, barriers_faced, initial_challenges,
  tactics_used, tactic_sequence, most_impactful,
  key_turning_points, what_clicked,
  final_outcomes, measurable_results,
  what_worked, what_was_hard, what_would_change, advice_to_similar,
  data_completeness, validation_status, validated_by, quality_score,
  created_at, updated_at
)
VALUES (
  'coach',
  'jenny-duan',
  'huda-2025',
  'jenny-duan',
  'Technical Skills Mastery Journey',
  'technical-skill-development',
  'Technical Skill Mastery',
  '{"demographics": {"identity": "Muslim girl, first-gen immigrant, public HS", "family": "Language barrier household, parent involvement", "location": "Public high school, competitive region"}, "academic_profile": {"starting_gpa": "4.3 weighted", "pattern": "B first semester → A second semester", "sat_baseline": "1360", "courses": "8→11 APs through self-study"}, "starting_stats": {"activities": "Game dev since age 8, film interest, Sunday School teaching", "time_crisis": "4 hrs/day social media, scattered focus", "barriers": "Time management, generic narrative, hidden identity"}}'::jsonb,
  ARRAY['first-gen-immigrant', 'muslim-female', 'STEM', 'public-school', 'time-crisis', 'high-achiever'],
  '2023-06-21'::date,
  '2023-12-17'::date,
  '{"gpa": "4.3 weighted", "sat": 1360, "ecs": "Game dev project, Sunday School teaching, film interest", "screen_time": "4 hours/day social media", "productivity": "Low - scattered, no system"}'::jsonb,
  ARRAY['time-crisis', 'procrastination', 'generic-narrative', 'identity-hiding', 'low-differentiation'],
  'Self-taught but no portfolio proof',
  ARRAY['168-hour-framework', 'parent-story-reframe', 'early-work-showcase', 'daily-schedule-architecture', 'identity-as-differentiator'],
  '{"week_1_3": "168-hour-framework, early-work-showcase", "week_3_6": "daily-schedule-architecture, identity-as-differentiator", "week_12": "parent-story-reframe (NCWIT essay)"}'::jsonb,
  ARRAY['168-hour-framework', 'parent-story-reframe', 'identity-as-differentiator'],
  '{"week_1": "Game demo moment - Jenny sees technical sophistication", "week_3": "168-hour framework reveals 26 hrs/week available", "week_12": "Parent story reframe unlocks authentic essay"}'::jsonb,
  'Technical Skill Mastery breakthrough came from systematic application of coaching tactics over 16 weeks across P1-FOUNDATION, P2-BUILDING phases',
  '{"skills_acquired": "Backend, frontend, ML, portfolio building"}'::jsonb,
  '{"ec_funding": "Funding acquired", "productivity": "Time management improvement", "test_scores": "SAT improvement detected", "recognition": "Award won", "academic": "GPA improvement detected"}'::jsonb,
  'Technical skills mastery through systematic project building. Backend, frontend, ML skills demonstrated in portfolio.',
  'Sustaining discipline over 16 weeks. Phases: P1-FOUNDATION, P2-BUILDING. Required consistent coaching check-ins.',
  'Would start identity clarity work even earlier',
  'Self-taught is valid IF you have portfolio proof. Build projects, showcase on GitHub, document learning.',
  0.95,
  'verified',
  'jenny-duan',
  0.94,
  '2023-06-21'::timestamptz,
  now()
);


-- Pattern TEST_SCORE_BOOST: SAT 1360 → 1550+ Breakthrough
INSERT INTO moat_student_success_patterns (
  contributor_type, contributor_id, student_id, coach_id,
  title, pattern_slug, outcome_category,
  student_archetype, archetype_tags,
  start_date, outcome_date,
  starting_stats, barriers_faced, initial_challenges,
  tactics_used, tactic_sequence, most_impactful,
  key_turning_points, what_clicked,
  final_outcomes, measurable_results,
  what_worked, what_was_hard, what_would_change, advice_to_similar,
  data_completeness, validation_status, validated_by, quality_score,
  created_at, updated_at
)
VALUES (
  'coach',
  'jenny-duan',
  'huda-2025',
  'jenny-duan',
  'SAT 1360 → 1550+ Breakthrough',
  'test-score-boost',
  'Test Score Breakthrough',
  '{"demographics": {"identity": "Muslim girl, first-gen immigrant, public HS", "family": "Language barrier household, parent involvement", "location": "Public high school, competitive region"}, "academic_profile": {"starting_gpa": "4.3 weighted", "pattern": "B first semester → A second semester", "sat_baseline": "1360", "courses": "8→11 APs through self-study"}, "starting_stats": {"activities": "Game dev since age 8, film interest, Sunday School teaching", "time_crisis": "4 hrs/day social media, scattered focus", "barriers": "Time management, generic narrative, hidden identity"}}'::jsonb,
  ARRAY['first-gen-immigrant', 'muslim-female', 'STEM', 'public-school', 'time-crisis', 'high-achiever'],
  '2023-06-21'::date,
  '2023-12-17'::date,
  '{"gpa": "4.3 weighted", "sat": 1360, "ecs": "Game dev project, Sunday School teaching, film interest", "screen_time": "4 hours/day social media", "productivity": "Low - scattered, no system"}'::jsonb,
  ARRAY['time-crisis', 'procrastination', 'generic-narrative', 'identity-hiding', 'low-differentiation'],
  'SAT 1360 baseline, needed 190+ point jump for top schools',
  ARRAY['168-hour-framework', 'parent-story-reframe', 'early-work-showcase', 'daily-schedule-architecture', 'identity-as-differentiator'],
  '{"week_1_3": "168-hour-framework, early-work-showcase", "week_3_6": "daily-schedule-architecture, identity-as-differentiator", "week_12": "parent-story-reframe (NCWIT essay)"}'::jsonb,
  ARRAY['168-hour-framework', 'parent-story-reframe', 'identity-as-differentiator'],
  '{"week_1": "Game demo moment - Jenny sees technical sophistication", "week_3": "168-hour framework reveals 26 hrs/week available", "week_12": "Parent story reframe unlocks authentic essay"}'::jsonb,
  'Test Score Breakthrough breakthrough came from systematic application of coaching tactics over 23 weeks across P1-FOUNDATION, P2-BUILDING phases',
  '{"sat_final": 1550, "increase": 190, "percentile": "99th"}'::jsonb,
  '{"academic": "GPA improvement detected", "recognition": "Award won", "ec_impact": "Scale growth detected", "productivity": "Time management improvement", "test_scores": "SAT improvement detected", "ec_funding": "Funding acquired"}'::jsonb,
  'Consistent SAT prep integrated into 168-hour schedule. Targeted practice on weak areas. Achieved 190+ point increase through disciplined approach.',
  'Sustaining discipline over 23 weeks. Phases: P1-FOUNDATION, P2-BUILDING. Required consistent coaching check-ins.',
  'Would start identity clarity work even earlier',
  'Integrate SAT prep into daily schedule. Consistent small blocks > cramming. Use Khan Academy + practice tests. 190+ point jumps are possible with discipline.',
  0.95,
  'verified',
  'jenny-duan',
  0.94,
  '2023-06-21'::timestamptz,
  now()
);


-- Pattern TIME_MANAGEMENT_BREAKTHROUGH: 168-Hour Framework & 10 Activities in 6 Months
INSERT INTO moat_student_success_patterns (
  contributor_type, contributor_id, student_id, coach_id,
  title, pattern_slug, outcome_category,
  student_archetype, archetype_tags,
  start_date, outcome_date,
  starting_stats, barriers_faced, initial_challenges,
  tactics_used, tactic_sequence, most_impactful,
  key_turning_points, what_clicked,
  final_outcomes, measurable_results,
  what_worked, what_was_hard, what_would_change, advice_to_similar,
  data_completeness, validation_status, validated_by, quality_score,
  created_at, updated_at
)
VALUES (
  'coach',
  'jenny-duan',
  'huda-2025',
  'jenny-duan',
  '168-Hour Framework & 10 Activities in 6 Months',
  'time-management-breakthrough',
  'Time Management System',
  '{"demographics": {"identity": "Muslim girl, first-gen immigrant, public HS", "family": "Language barrier household, parent involvement", "location": "Public high school, competitive region"}, "academic_profile": {"starting_gpa": "4.3 weighted", "pattern": "B first semester → A second semester", "sat_baseline": "1360", "courses": "8→11 APs through self-study"}, "starting_stats": {"activities": "Game dev since age 8, film interest, Sunday School teaching", "time_crisis": "4 hrs/day social media, scattered focus", "barriers": "Time management, generic narrative, hidden identity"}}'::jsonb,
  ARRAY['first-gen-immigrant', 'muslim-female', 'STEM', 'public-school', 'time-crisis', 'high-achiever'],
  '2023-06-21'::date,
  '2023-12-10'::date,
  '{"gpa": "4.3 weighted", "sat": 1360, "ecs": "Game dev project, Sunday School teaching, film interest", "screen_time": "4 hours/day social media", "productivity": "Low - scattered, no system"}'::jsonb,
  ARRAY['time-crisis', 'procrastination', 'generic-narrative', 'identity-hiding', 'low-differentiation'],
  '4 hrs/day social media, no structured schedule',
  ARRAY['168-hour-framework', 'parent-story-reframe', 'early-work-showcase', 'daily-schedule-architecture', 'identity-as-differentiator'],
  '{"week_1_3": "168-hour-framework, early-work-showcase", "week_3_6": "daily-schedule-architecture, identity-as-differentiator", "week_12": "parent-story-reframe (NCWIT essay)"}'::jsonb,
  ARRAY['168-hour-framework', 'parent-story-reframe', 'identity-as-differentiator'],
  '{"week_1": "Game demo moment - Jenny sees technical sophistication", "week_3": "168-hour framework reveals 26 hrs/week available", "week_12": "Parent story reframe unlocks authentic essay"}'::jsonb,
  'Time Management System breakthrough came from systematic application of coaching tactics over 19 weeks across P1-FOUNDATION, P2-BUILDING phases',
  '{"time_reclaimed": "20-40 hrs/week", "activities_completed": 10, "duration": "6 months"}'::jsonb,
  '{"ec_funding": "Funding acquired", "productivity": "Time management improvement", "test_scores": "SAT improvement detected", "academic": "GPA improvement detected", "recognition": "Award won", "ec_impact": "Scale growth detected"}'::jsonb,
  '168-hour framework + compound-benefit activities = 10 meaningful activities in 6 months. Time reclaimed: 20-40 hrs/week through optimization.',
  'Sustaining discipline over 19 weeks. Phases: P1-FOUNDATION, P2-BUILDING. Required consistent coaching check-ins.',
  'Would start identity clarity work even earlier',
  'Map all 168 hours. Design compound-benefit activities (one activity → multiple outcomes). Optimize through delegation, batching, feedback loops.',
  0.95,
  'verified',
  'jenny-duan',
  0.94,
  '2023-06-21'::timestamptz,
  now()
);


-- Pattern TRUST_BUILDING: Coach-Student Trust Building Pattern
INSERT INTO moat_student_success_patterns (
  contributor_type, contributor_id, student_id, coach_id,
  title, pattern_slug, outcome_category,
  student_archetype, archetype_tags,
  start_date, outcome_date,
  starting_stats, barriers_faced, initial_challenges,
  tactics_used, tactic_sequence, most_impactful,
  key_turning_points, what_clicked,
  final_outcomes, measurable_results,
  what_worked, what_was_hard, what_would_change, advice_to_similar,
  data_completeness, validation_status, validated_by, quality_score,
  created_at, updated_at
)
VALUES (
  'coach',
  'jenny-duan',
  'huda-2025',
  'jenny-duan',
  'Coach-Student Trust Building Pattern',
  'trust-building',
  'Coach-Student Trust Building',
  '{"demographics": {"identity": "Muslim girl, first-gen immigrant, public HS", "family": "Language barrier household, parent involvement", "location": "Public high school, competitive region"}, "academic_profile": {"starting_gpa": "4.3 weighted", "pattern": "B first semester → A second semester", "sat_baseline": "1360", "courses": "8→11 APs through self-study"}, "starting_stats": {"activities": "Game dev since age 8, film interest, Sunday School teaching", "time_crisis": "4 hrs/day social media, scattered focus", "barriers": "Time management, generic narrative, hidden identity"}}'::jsonb,
  ARRAY['first-gen-immigrant', 'muslim-female', 'STEM', 'public-school', 'time-crisis', 'high-achiever'],
  '2023-06-21'::date,
  '2023-12-17'::date,
  '{"gpa": "4.3 weighted", "sat": 1360, "ecs": "Game dev project, Sunday School teaching, film interest", "screen_time": "4 hours/day social media", "productivity": "Low - scattered, no system"}'::jsonb,
  ARRAY['time-crisis', 'procrastination', 'generic-narrative', 'identity-hiding', 'low-differentiation'],
  'New coach relationship, student skepticism',
  ARRAY['168-hour-framework', 'parent-story-reframe', 'early-work-showcase', 'daily-schedule-architecture', 'identity-as-differentiator'],
  '{"week_1_3": "168-hour-framework, early-work-showcase", "week_3_6": "daily-schedule-architecture, identity-as-differentiator", "week_12": "parent-story-reframe (NCWIT essay)"}'::jsonb,
  ARRAY['168-hour-framework', 'parent-story-reframe', 'identity-as-differentiator'],
  '{"week_1": "Game demo moment - Jenny sees technical sophistication", "week_3": "168-hour framework reveals 26 hrs/week available", "week_12": "Parent story reframe unlocks authentic essay"}'::jsonb,
  'Coach-Student Trust Building breakthrough came from systematic application of coaching tactics over 22 weeks across P1-FOUNDATION, P2-BUILDING phases',
  '{"investment": "90%+ task completion", "trust_score": "High"}'::jsonb,
  '{"recognition": "Award won", "academic": "GPA improvement detected", "ec_impact": "Scale growth detected", "productivity": "Time management improvement", "test_scores": "SAT improvement detected", "ec_funding": "Funding acquired"}'::jsonb,
  'Early work showcase (game demo) created massive investment. 90%+ task completion rate sustained through trust.',
  'Sustaining discipline over 22 weeks. Phases: P1-FOUNDATION, P2-BUILDING. Required consistent coaching check-ins.',
  'Would start identity clarity work even earlier',
  'Show your work early. Game demo moment = trust. Complete 90%+ of tasks coach assigns. Trust enables aggressive goal-setting.',
  0.95,
  'verified',
  'jenny-duan',
  0.94,
  '2023-06-21'::timestamptz,
  now()
);


-- Verification
SELECT
  'Seed Complete' as status,
  COUNT(*) as patterns_loaded,
  STRING_AGG(DISTINCT outcome_category, ', ') as categories
FROM moat_student_success_patterns
WHERE student_id = 'huda-2025';

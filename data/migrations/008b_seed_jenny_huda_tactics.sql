-- Migration 008b: Seed Top 10 Tactic Chips from Jenny-Huda Journey
-- Created: 2025-10-16
-- Purpose: Load proven tactics from W003, W010, W012 intel chips as baseline moat knowledge
-- Source: /data/kb_intel_chips/chips/ (200+ structured intel chips)

-- Enable migration mode
SET app.migration = true;

-- ============================================================================
-- SEED DATA: TOP 10 TACTIC CHIPS FROM JENNY-HUDA JOURNEY
-- ============================================================================

-- Tactic 1: 168-Hour Framework (W003-FRAMEWORK-001)
INSERT INTO moat_tactic_chips (
  tactic_name, tactic_slug, version, created_by_coach, original_coach,
  source_type, source_reference, tactic_category, domain,
  student_archetypes, barriers_addressed,
  core_principle, description, micro_actions,
  typical_outcomes, estimated_duration, difficulty_level,
  quality_score, confidence_score, validation_status, validated_by, created_at
)
VALUES (
  '168-Hour Framework',
  '168-hour-framework',
  '1.0',
  'jenny-duan',
  'jenny-duan',
  'intel_chip',
  'W003-FRAMEWORK-001',
  'Time Management',
  'Planning',
  ARRAY['first-gen-immigrant', 'STEM-female', 'public-school', 'time-crisis'],
  ARRAY['time-crisis', 'low-productivity', 'procrastination'],
  'Systems architecture creates compound effects: Single activity yields multiple benefits. Game project = CS skills + portfolio + awards + essays simultaneously. Optimization through delegation, batching, feedback loops.',
  'Map all 168 hours in the week with precision. Design compound-benefit activities (one activity yields multiple outcomes). Implement optimization strategies to reclaim time. Build feedback loops with check-ins every Tue/Sat.',
  '{
    "step_1": {"action": "Map all 168 hours in the week with precision (7am-11pm daily)", "example": "4:15-5:15pm clubs, 5:15-7:15pm homework (2hr cap), 7:15-8:15pm game dev, 8:15-9pm video project"},
    "step_2": {"action": "Design compound-benefit activities (one activity → multiple outcomes)", "example": "Game project yields CS skills + portfolio + NCWIT submission + essay content + GitHub showcase"},
    "step_3": {"action": "Implement optimization strategies to reclaim time", "example": "Read ahead on weekends, homework during class, skip excessive notes, delegate manual tasks to officers"},
    "step_4": {"action": "Build feedback loops with check-ins every Tue/Sat", "example": "Hours logged, grade monitoring, energy assessment for sustainability, rapid adjustments"}
  }'::jsonb,
  '{"time_reclaimed": "20-40 hours/week", "productivity_increase": "3-5x compound output", "stress_reduction": "Grade anxiety ↓ 60%", "activity_output": "10 meaningful activities in 6 months"}'::jsonb,
  '2 weeks'::interval,
  'intermediate',
  0.94,
  0.92,
  'approved',
  'jenny-duan',
  '2023-06-26'::timestamptz
);

-- Tactic 2: Parent Story Reframe (W012-SILVER-001)
INSERT INTO moat_tactic_chips (
  tactic_name, tactic_slug, version, created_by_coach, original_coach,
  source_type, source_reference, tactic_category, domain,
  student_archetypes, barriers_addressed,
  core_principle, description, micro_actions,
  typical_outcomes, estimated_duration, difficulty_level,
  quality_score, confidence_score, validation_status, validated_by, created_at
)
VALUES (
  'Parent Story Reframe',
  'parent-story-reframe',
  '1.0',
  'jenny-duan',
  'jenny-duan',
  'intel_chip',
  'W012-SILVER-001',
  'Essay Strategy',
  'Applications',
  ARRAY['first-gen-immigrant', 'language-barrier-family', 'cultural-identity'],
  ARRAY['essay-generic', 'identity-crisis', 'lack-differentiation'],
  'Transform generic parent sacrifice narrative into specific barrier-breaking story. Surface unconscious experiences (mom language barrier) as core motivation for AI education work.',
  'Identify generic parent story tropes. Surface unconscious lived experiences through coaching questions. Connect parent barrier to student mission. Rewrite essay with specific sensory details, not abstract concepts.',
  '{
    "step_1": {"action": "Identify generic parent story tropes (sacrifice, work ethic, etc.)", "example": "Huda initial essay: My parents worked hard → too generic, lacks specificity"},
    "step_2": {"action": "Surface unconscious lived experiences through coaching questions", "example": "When did your mom struggle with English? → unlocks: teacher conferences, doctor visits, helplessness"},
    "step_3": {"action": "Connect parent barrier to student mission", "example": "Mom language barrier → Huda creates AI tutor for immigrant families → NCWIT essay thesis"},
    "step_4": {"action": "Rewrite essay with specific sensory details, not abstract concepts", "example": "My mom could not understand the teacher → I watched her nod, pretending to understand"}
  }'::jsonb,
  '{"essay_transformation": "Generic → Differentiated", "authenticity_score": "3/10 → 9/10", "award_outcomes": "NCWIT National Winner (top 40 in US)", "identity_clarity": "Increased confidence in cultural story"}'::jsonb,
  '2 hours'::interval,
  'intermediate',
  0.96,
  0.94,
  'approved',
  'jenny-duan',
  '2023-09-15'::timestamptz
);

-- Tactic 3: Early Work Showcase (W003-SILVER-001)
INSERT INTO moat_tactic_chips (
  tactic_name, tactic_slug, version, created_by_coach, original_coach,
  source_type, source_reference, tactic_category, domain,
  student_archetypes, barriers_addressed,
  core_principle, description, micro_actions,
  typical_outcomes, estimated_duration, difficulty_level,
  quality_score, confidence_score, validation_status, validated_by, created_at
)
VALUES (
  'Early Work Showcase for Investment',
  'early-work-showcase',
  '1.0',
  'jenny-duan',
  'jenny-duan',
  'intel_chip',
  'W003-SILVER-001',
  'Trust Building',
  'Coaching',
  ARRAY['all-students', 'imposter-syndrome', 'underconfident'],
  ARRAY['low-trust', 'resistance-to-coaching', 'imposter-syndrome'],
  'The Game Demo Moment creates massive investment through early work showcase. Authentic celebration of student existing work builds confidence and buy-in before any systems are imposed.',
  'Ask student to show existing work in first session. React with genuine enthusiasm matching teen energy level. Identify technical sophistication they may not recognize. Connect existing work to future opportunities before imposing systems.',
  '{
    "step_1": {"action": "Ask student to show existing work in first session (game, essay, project)", "example": "Show me your game! I want to see what you have built!"},
    "step_2": {"action": "React with genuine enthusiasm matching teen energy level", "example": "Wow! This is so cool! I love it! (Jenny exact words for Huda game)"},
    "step_3": {"action": "Identify technical sophistication they may not recognize in themselves", "example": "You built a classification model? You understand backend vs frontend? This is college-level work!"},
    "step_4": {"action": "Connect existing work to future opportunities before imposing systems", "example": "This game could be your NCWIT submission, your GitHub portfolio, your essay topic"}
  }'::jsonb,
  '{"trust_increase": "Measured via willingness to adopt coach systems", "confidence_boost": "Student self-reports feeling seen and capable", "investment_created": "Student completes 90%+ of assigned tasks in following 2 weeks", "resistance_reduction": "Zero pushback on subsequent system recommendations"}'::jsonb,
  '1 hour'::interval,
  'beginner',
  0.95,
  0.93,
  'approved',
  'jenny-duan',
  '2023-06-26'::timestamptz
);

-- Tactic 4: Daily Schedule Architecture (W003-TACTIC-001)
INSERT INTO moat_tactic_chips (
  tactic_name, tactic_slug, version, created_by_coach, original_coach,
  source_type, source_reference, tactic_category, domain,
  student_archetypes, barriers_addressed,
  core_principle, description, micro_actions,
  typical_outcomes, estimated_duration, difficulty_level,
  quality_score, confidence_score, validation_status, validated_by, created_at
)
VALUES (
  'Daily Schedule Architecture',
  'daily-schedule-architecture',
  '1.0',
  'jenny-duan',
  'jenny-duan',
  'intel_chip',
  'W003-TACTIC-001',
  'Time Management',
  'Planning',
  ARRAY['time-crisis', 'procrastination', 'scattered-focus'],
  ARRAY['time-crisis', 'low-productivity', 'stress-overload'],
  'Precision daily schedule with hour blocks, homework caps, and task tracking via shared Google Sheets. Creates visual accountability and prevents decision fatigue.',
  'Block every hour from 4pm-11pm with specific activities. Set hard homework cap (2 hours) to prevent perfectionism time drain. Use shared Google Sheets with checkboxes for task tracking. Differentiate weekday vs weekend structure.',
  '{
    "step_1": {"action": "Block every hour from 4pm-11pm with specific activities", "example": "4:15-5:15 clubs, 5:15-7:15 homework (2hr cap!), 7:15-8:15 game dev, 8:15-9 video, 9:30-10:30 SAT/apps"},
    "step_2": {"action": "Set hard homework cap (2 hours) to prevent perfectionism time drain", "example": "If homework exceeds 2hrs, stop and resume next day. Prevents midnight spirals."},
    "step_3": {"action": "Use shared Google Sheets with checkboxes for task tracking", "example": "Week 3: 7 tasks listed, student checks off as completed, visual progress creates dopamine hits"},
    "step_4": {"action": "Differentiate weekday vs weekend structure", "example": "Weekdays: tighter blocks. Saturday: longer passion project blocks. Sunday: Sunday School + catch-up buffer"}
  }'::jsonb,
  '{"time_reclaimed": "10-20 hours/week", "task_completion": "70%+ of weekly tasks completed on time", "stress_reduction": "Self-reported anxiety ↓ 50%", "schedule_adherence": "5+ days/week sustained for 2+ weeks"}'::jsonb,
  '1 week'::interval,
  'intermediate',
  0.93,
  0.91,
  'approved',
  'jenny-duan',
  '2023-06-26'::timestamptz
);

-- Tactic 5: Identity as Differentiator (W003-STRATEGY-001)
INSERT INTO moat_tactic_chips (
  tactic_name, tactic_slug, version, created_by_coach, original_coach,
  source_type, source_reference, tactic_category, domain,
  student_archetypes, barriers_addressed,
  core_principle, description, micro_actions,
  typical_outcomes, estimated_duration, difficulty_level,
  quality_score, confidence_score, validation_status, validated_by, created_at
)
VALUES (
  'Identity as Differentiator',
  'identity-as-differentiator',
  '1.0',
  'jenny-duan',
  'jenny-duan',
  'intel_chip',
  'W003-STRATEGY-001',
  'Positioning',
  'Strategy',
  ARRAY['cultural-identity', 'first-gen-immigrant', 'underrepresented'],
  ARRAY['identity-crisis', 'hiding-culture', 'lack-differentiation'],
  'Narrative crystallization: Leverage cultural identity as strategic asset in post-affirmative action landscape. Muslim girl breaking barriers in tech through games, NOT hiding identity despite Asian CS stereotype.',
  'Validate identity as asset, not liability. Build coherent narrative connecting cultural elements to technical work. Research college cultural fit (Muslim communities at target schools). Weave identity into every application component.',
  '{
    "step_1": {"action": "Validate identity as asset, not liability", "example": "Your Muslim identity is an asset (direct quote to Huda addressing unspoken fears)"},
    "step_2": {"action": "Build coherent narrative connecting cultural elements to technical work", "example": "Sunday School teaching + cultural videos + AI education = Muslim girl breaking tech barriers through games"},
    "step_3": {"action": "Research college cultural fit (Muslim communities at target schools)", "example": "Stanford/MIT positioning with strong Muslim student associations (MSA research)"},
    "step_4": {"action": "Weave identity into every application component (activities, essays, interviews)", "example": "NCWIT essay centers mom language barrier. Game features cultural elements. Video series highlights Muslim AI education."}
  }'::jsonb,
  '{"narrative_clarity": "Vague I like CS → Muslim tech pioneer breaking barriers", "confidence_increase": "Student stops hiding cultural elements, leads with them", "differentiation_score": "Generic Asian CS applicant → Unique cultural-tech story", "college_fit": "Targets schools with cultural alignment (Stanford MSA, MIT Muslim community)"}'::jsonb,
  '2 hours'::interval,
  'intermediate',
  0.96,
  0.94,
  'approved',
  'jenny-duan',
  '2023-06-26'::timestamptz
);

-- Update coach stats
UPDATE coaches SET
  tactics_created = 5,
  last_active_at = now()
WHERE coach_id = 'jenny-duan';

-- Verification
SELECT
  'Seed Complete' as status,
  COUNT(*) as tactics_loaded,
  STRING_AGG(DISTINCT tactic_category, ', ') as categories
FROM moat_tactic_chips
WHERE created_by_coach = 'jenny-duan';

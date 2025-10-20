/**
 * v15_005_nsm_tracking_infrastructure.sql
 * NSM Tracking Infrastructure - Comprehensive Framework
 *
 * Tables:
 * 1. nsm_ivyscore_tracking - Monthly IvyScore snapshots
 * 2. nsm_academic_vitals - Academic metrics (GPA, SAT, courses)
 * 3. nsm_recognition_vitals - Award submissions and wins
 * 4. nsm_leadership_vitals - Officer positions, club founding
 * 5. nsm_service_vitals - Volunteer hours, community impact
 * 6. nsm_artifacts_vitals - Research papers, portfolio projects
 * 7. nsm_program_vitals - Summer program applications and acceptances
 * 8. nsm_essay_vitals - Essay drafts and revision progress
 * 9. nsm_college_list_vitals - College list optimization
 * 10. nsm_admission_vitals - Application submission tracking
 * 11. nsm_lagging_outcomes - Final college acceptances and scholarships
 *
 * Created: 2025-10-17
 */

-- ============================================================================
-- 1. IvyScore Tracking (Overall Progress)
-- ============================================================================

CREATE TABLE IF NOT EXISTS nsm_ivyscore_tracking (
  tracking_id SERIAL PRIMARY KEY,
  student_id TEXT NOT NULL,
  coach_id TEXT NOT NULL,

  -- Timestamp
  snapshot_month INTEGER NOT NULL, -- 0-12 (Month 0 = baseline, Month 12 = final)
  snapshot_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- IvyScore Components (0-5 each, except Recognition can exceed 5)
  academics_score INTEGER NOT NULL DEFAULT 0, -- 0-5
  leadership_score INTEGER NOT NULL DEFAULT 0, -- 0-5
  service_score INTEGER NOT NULL DEFAULT 0, -- 0-5
  artifacts_score INTEGER NOT NULL DEFAULT 0, -- 0-5
  recognition_score INTEGER NOT NULL DEFAULT 0, -- 0-5+ (can exceed 5)

  -- Total
  total_ivyscore INTEGER GENERATED ALWAYS AS (
    academics_score + leadership_score + service_score + artifacts_score + recognition_score
  ) STORED,

  -- Trajectory
  target_ivyscore INTEGER, -- Target for Month 12
  on_track BOOLEAN GENERATED ALWAYS AS (
    total_ivyscore >= (target_ivyscore * snapshot_month / 12)
  ) STORED,

  -- Metadata
  agent_assessor TEXT, -- Which agent measured this
  notes TEXT,

  UNIQUE(student_id, snapshot_month)
);

CREATE INDEX idx_nsm_ivyscore_student ON nsm_ivyscore_tracking(student_id);
CREATE INDEX idx_nsm_ivyscore_month ON nsm_ivyscore_tracking(snapshot_month);

COMMENT ON TABLE nsm_ivyscore_tracking IS 'Monthly IvyScore snapshots (0-25+ scale)';

-- ============================================================================
-- 2. Academic Vitals (Academics Score 4 → 5)
-- ============================================================================

CREATE TABLE IF NOT EXISTS nsm_academic_vitals (
  vital_id SERIAL PRIMARY KEY,
  student_id TEXT NOT NULL,

  -- Timestamp
  measured_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- GPA Metrics
  gpa_weighted NUMERIC(3, 2), -- e.g., 4.30
  gpa_unweighted NUMERIC(3, 2), -- e.g., 3.95
  gpa_target_weighted NUMERIC(3, 2), -- Target: 4.50
  gpa_target_unweighted NUMERIC(3, 2), -- Target: 4.00

  -- Test Scores
  sat_score INTEGER, -- e.g., 1360
  sat_target INTEGER, -- Target: 1500
  act_score INTEGER,
  act_target INTEGER,

  -- Course Rigor
  ap_courses_taken INTEGER, -- e.g., 6
  ap_courses_target INTEGER, -- Target: 10
  ap_fives_count INTEGER, -- AP scores of 5
  ap_fives_target INTEGER, -- Target: 7
  course_rigor_rating INTEGER, -- 0-10 scale
  course_rigor_target INTEGER, -- Target: 10

  -- Grades
  current_semester_gpa NUMERIC(3, 2),
  b_grade_count INTEGER, -- Number of B's (need to convert to A's)

  -- Agent
  measured_by_agent TEXT, -- GamePlanAgent, AssessmentAgent

  FOREIGN KEY (student_id) REFERENCES students(student_id)
);

CREATE INDEX idx_nsm_academic_student ON nsm_academic_vitals(student_id);
CREATE INDEX idx_nsm_academic_date ON nsm_academic_vitals(measured_date);

COMMENT ON TABLE nsm_academic_vitals IS 'Academic metrics (GPA, SAT, course rigor) - drives Academics score';

-- ============================================================================
-- 3. Recognition Vitals (Recognition Score 1 → 6)
-- ============================================================================

CREATE TABLE IF NOT EXISTS nsm_recognition_vitals (
  vital_id SERIAL PRIMARY KEY,
  student_id TEXT NOT NULL,

  -- Timestamp
  measured_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Award Counts
  national_awards_won INTEGER DEFAULT 0, -- Target: 2+
  regional_awards_won INTEGER DEFAULT 0, -- Target: 5+
  local_awards_won INTEGER DEFAULT 0, -- Target: 10+

  -- Application Metrics
  award_applications_submitted INTEGER DEFAULT 0, -- Target: 20+
  award_applications_pending INTEGER DEFAULT 0,
  award_win_rate NUMERIC(3, 2), -- e.g., 0.33 (33%)
  award_win_rate_target NUMERIC(3, 2), -- Target: 0.50 (50%)

  -- ROI Targeting
  high_roi_awards_targeted INTEGER DEFAULT 0, -- Target: 10+
  high_roi_awards_won INTEGER DEFAULT 0,

  -- Scholarship $ (optional, part of lagging metric)
  scholarship_dollars_won INTEGER DEFAULT 0,

  -- Agent
  measured_by_agent TEXT, -- AwardsAgent

  FOREIGN KEY (student_id) REFERENCES students(student_id)
);

CREATE INDEX idx_nsm_recognition_student ON nsm_recognition_vitals(student_id);
CREATE INDEX idx_nsm_recognition_date ON nsm_recognition_vitals(measured_date);

COMMENT ON TABLE nsm_recognition_vitals IS 'Award submissions and wins - drives Recognition score';

-- ============================================================================
-- 4. Leadership Vitals (Leadership Score 2 → 4)
-- ============================================================================

CREATE TABLE IF NOT EXISTS nsm_leadership_vitals (
  vital_id SERIAL PRIMARY KEY,
  student_id TEXT NOT NULL,

  -- Timestamp
  measured_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Leadership Positions
  officer_positions_held INTEGER DEFAULT 0, -- Target: 2+
  club_founding_count INTEGER DEFAULT 0, -- Target: 1+
  team_captain_roles INTEGER DEFAULT 0, -- Target: 2+

  -- Leadership Hours
  volunteer_hours_leadership INTEGER DEFAULT 0, -- Target: 200+
  mentoring_hours INTEGER DEFAULT 0, -- Target: 100+

  -- Impact
  fundraising_led_dollars INTEGER DEFAULT 0, -- Target: $5K+
  team_members_led INTEGER DEFAULT 0, -- Number of people led

  -- Agent
  measured_by_agent TEXT, -- ExtracurricularsAgent

  FOREIGN KEY (student_id) REFERENCES students(student_id)
);

CREATE INDEX idx_nsm_leadership_student ON nsm_leadership_vitals(student_id);
CREATE INDEX idx_nsm_leadership_date ON nsm_leadership_vitals(measured_date);

COMMENT ON TABLE nsm_leadership_vitals IS 'Leadership positions and impact - drives Leadership score';

-- ============================================================================
-- 5. Service Vitals (Service Score 1 → 3)
-- ============================================================================

CREATE TABLE IF NOT EXISTS nsm_service_vitals (
  vital_id SERIAL PRIMARY KEY,
  student_id TEXT NOT NULL,

  -- Timestamp
  measured_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Service Hours
  volunteer_hours_total INTEGER DEFAULT 0, -- Target: 300+
  volunteer_hours_target INTEGER DEFAULT 300,

  -- Impact
  community_impact_people INTEGER DEFAULT 0, -- Target: 500+
  sustained_service_months INTEGER DEFAULT 0, -- Target: 12+

  -- Leadership
  service_leadership_role BOOLEAN DEFAULT FALSE, -- Target: TRUE

  -- Agent
  measured_by_agent TEXT, -- ExtracurricularsAgent

  FOREIGN KEY (student_id) REFERENCES students(student_id)
);

CREATE INDEX idx_nsm_service_student ON nsm_service_vitals(student_id);
CREATE INDEX idx_nsm_service_date ON nsm_service_vitals(measured_date);

COMMENT ON TABLE nsm_service_vitals IS 'Volunteer hours and community impact - drives Service score';

-- ============================================================================
-- 6. Artifacts Vitals (Artifacts Score 3 → 5)
-- ============================================================================

CREATE TABLE IF NOT EXISTS nsm_artifacts_vitals (
  vital_id SERIAL PRIMARY KEY,
  student_id TEXT NOT NULL,

  -- Timestamp
  measured_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Research
  research_papers_published INTEGER DEFAULT 0, -- Target: 1+
  conference_presentations INTEGER DEFAULT 0, -- Target: 1+

  -- Projects
  portfolio_projects_count INTEGER DEFAULT 0, -- Target: 10+
  github_contributions INTEGER DEFAULT 0, -- Target: 500+

  -- Experience
  internships_completed INTEGER DEFAULT 0, -- Target: 1+

  -- Agent
  measured_by_agent TEXT, -- SummerProgramsAgent, GamePlanAgent

  FOREIGN KEY (student_id) REFERENCES students(student_id)
);

CREATE INDEX idx_nsm_artifacts_student ON nsm_artifacts_vitals(student_id);
CREATE INDEX idx_nsm_artifacts_date ON nsm_artifacts_vitals(measured_date);

COMMENT ON TABLE nsm_artifacts_vitals IS 'Research papers, portfolio projects - drives Artifacts score';

-- ============================================================================
-- 7. Summer Program Vitals (Prestige + Artifacts Boost)
-- ============================================================================

CREATE TABLE IF NOT EXISTS nsm_program_vitals (
  vital_id SERIAL PRIMARY KEY,
  student_id TEXT NOT NULL,

  -- Timestamp
  measured_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Applications
  programs_applied INTEGER DEFAULT 0, -- Target: 5+
  programs_accepted INTEGER DEFAULT 0,
  programs_attended INTEGER DEFAULT 0,

  -- Prestige
  prestigious_programs_accepted INTEGER DEFAULT 0, -- RSI, TASP, SSP

  -- Agent
  measured_by_agent TEXT, -- SummerProgramsAgent

  FOREIGN KEY (student_id) REFERENCES students(student_id)
);

CREATE INDEX idx_nsm_program_student ON nsm_program_vitals(student_id);
CREATE INDEX idx_nsm_program_date ON nsm_program_vitals(measured_date);

COMMENT ON TABLE nsm_program_vitals IS 'Summer program applications and acceptances - drives Artifacts + Recognition';

-- ============================================================================
-- 8. Essay Vitals (Narrative Execution)
-- ============================================================================

CREATE TABLE IF NOT EXISTS nsm_essay_vitals (
  vital_id SERIAL PRIMARY KEY,
  student_id TEXT NOT NULL,

  -- Timestamp
  measured_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Essay Progress
  common_app_essay_quality TEXT, -- 'draft', 'good', 'exceptional'
  supplemental_essays_complete INTEGER DEFAULT 0, -- Target: 15+
  identity_fusion_clarity TEXT, -- 'weak', 'moderate', 'strong'
  essay_revisions_completed INTEGER DEFAULT 0, -- Target: 5+ per essay

  -- Agent
  measured_by_agent TEXT, -- EssayAgent

  FOREIGN KEY (student_id) REFERENCES students(student_id)
);

CREATE INDEX idx_nsm_essay_student ON nsm_essay_vitals(student_id);
CREATE INDEX idx_nsm_essay_date ON nsm_essay_vitals(measured_date);

COMMENT ON TABLE nsm_essay_vitals IS 'Essay quality and progress - converts IvyScore into narrative';

-- ============================================================================
-- 9. College List Vitals (Strategic Fit)
-- ============================================================================

CREATE TABLE IF NOT EXISTS nsm_college_list_vitals (
  vital_id SERIAL PRIMARY KEY,
  student_id TEXT NOT NULL,

  -- Timestamp
  measured_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- List Composition
  reach_schools_count INTEGER DEFAULT 0, -- Target: 5
  match_schools_count INTEGER DEFAULT 0, -- Target: 5
  safety_schools_count INTEGER DEFAULT 0, -- Target: 3

  -- Strategy
  ed_ea_strategy TEXT, -- '1 ED + 3 EA' or NULL
  fit_score INTEGER, -- 0-10 scale, target 9

  -- Agent
  measured_by_agent TEXT, -- CollegeListAgent

  FOREIGN KEY (student_id) REFERENCES students(student_id)
);

CREATE INDEX idx_nsm_college_list_student ON nsm_college_list_vitals(student_id);
CREATE INDEX idx_nsm_college_list_date ON nsm_college_list_vitals(measured_date);

COMMENT ON TABLE nsm_college_list_vitals IS 'College list optimization - strategic targeting';

-- ============================================================================
-- 10. Admission Vitals (Execution)
-- ============================================================================

CREATE TABLE IF NOT EXISTS nsm_admission_vitals (
  vital_id SERIAL PRIMARY KEY,
  student_id TEXT NOT NULL,

  -- Timestamp
  measured_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Execution
  applications_submitted_on_time INTEGER DEFAULT 0, -- Target: 100%
  applications_total INTEGER DEFAULT 0,
  recommendation_letters_secured INTEGER DEFAULT 0, -- Target: 3+
  transcripts_submitted INTEGER DEFAULT 0,
  test_scores_sent INTEGER DEFAULT 0,
  fee_waivers_obtained INTEGER DEFAULT 0,

  -- Interview
  interview_prep_completed BOOLEAN DEFAULT FALSE, -- Target: TRUE

  -- Agent
  measured_by_agent TEXT, -- AdmissionsAgent

  FOREIGN KEY (student_id) REFERENCES students(student_id)
);

CREATE INDEX idx_nsm_admission_student ON nsm_admission_vitals(student_id);
CREATE INDEX idx_nsm_admission_date ON nsm_admission_vitals(measured_date);

COMMENT ON TABLE nsm_admission_vitals IS 'Application execution - deadline tracking';

-- ============================================================================
-- 11. Lagging Outcomes (Final NSM - College Acceptances + Scholarships)
-- ============================================================================

CREATE TABLE IF NOT EXISTS nsm_lagging_outcomes (
  outcome_id SERIAL PRIMARY KEY,
  student_id TEXT NOT NULL,

  -- Timestamp
  outcome_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  graduation_year INTEGER NOT NULL,

  -- College Acceptances
  tier1_acceptances INTEGER DEFAULT 0, -- HYPSM + Ivy
  tier2_acceptances INTEGER DEFAULT 0, -- Top 20
  tier3_acceptances INTEGER DEFAULT 0, -- Top 50
  total_acceptances INTEGER DEFAULT 0,

  -- Scholarships
  total_scholarship_dollars INTEGER DEFAULT 0,
  scholarship_per_hour NUMERIC(10, 2), -- $ per hour invested (ROI)

  -- Tier Improvement
  initial_tier TEXT, -- 'safety', 'match', 'reach'
  final_tier TEXT, -- Tier of college enrolled
  tier_improvement BOOLEAN GENERATED ALWAYS AS (
    (initial_tier = 'safety' AND final_tier IN ('match', 'reach')) OR
    (initial_tier = 'match' AND final_tier = 'reach')
  ) STORED,

  -- Final IvyScore
  final_ivyscore INTEGER, -- From nsm_ivyscore_tracking Month 12

  -- Metadata
  notes TEXT,

  FOREIGN KEY (student_id) REFERENCES students(student_id),
  UNIQUE(student_id, graduation_year)
);

CREATE INDEX idx_nsm_outcomes_student ON nsm_lagging_outcomes(student_id);
CREATE INDEX idx_nsm_outcomes_year ON nsm_lagging_outcomes(graduation_year);

COMMENT ON TABLE nsm_lagging_outcomes IS 'Final college acceptances and scholarships - Ultimate NSM';

-- ============================================================================
-- Views for Quick NSM Queries
-- ============================================================================

-- Current IvyScore (latest snapshot per student)
CREATE OR REPLACE VIEW v_nsm_current_ivyscore AS
SELECT DISTINCT ON (student_id)
  student_id,
  snapshot_month,
  snapshot_date,
  academics_score,
  leadership_score,
  service_score,
  artifacts_score,
  recognition_score,
  total_ivyscore,
  target_ivyscore,
  on_track
FROM nsm_ivyscore_tracking
ORDER BY student_id, snapshot_month DESC;

-- NSM Dashboard (all vitals, latest snapshot per student)
CREATE OR REPLACE VIEW v_nsm_dashboard AS
SELECT
  s.student_id,
  s.full_name,
  s.graduation_year,

  -- IvyScore
  ivs.total_ivyscore,
  ivs.target_ivyscore,
  ivs.on_track,

  -- Academic Vitals
  av.gpa_weighted,
  av.sat_score,
  av.ap_courses_taken,

  -- Recognition Vitals
  rv.national_awards_won,
  rv.regional_awards_won,
  rv.award_win_rate,

  -- Leadership Vitals
  lv.officer_positions_held,
  lv.club_founding_count,

  -- Service Vitals
  sv.volunteer_hours_total,
  sv.community_impact_people,

  -- Artifacts Vitals
  artv.research_papers_published,
  artv.portfolio_projects_count,

  -- Program Vitals
  pv.prestigious_programs_accepted,

  -- Essay Vitals
  ev.common_app_essay_quality,
  ev.identity_fusion_clarity,

  -- College List Vitals
  clv.reach_schools_count,
  clv.fit_score,

  -- Admission Vitals
  adv.applications_submitted_on_time,
  adv.applications_total

FROM students s
LEFT JOIN v_nsm_current_ivyscore ivs ON s.student_id = ivs.student_id
LEFT JOIN LATERAL (
  SELECT * FROM nsm_academic_vitals av2
  WHERE av2.student_id = s.student_id
  ORDER BY measured_date DESC LIMIT 1
) av ON TRUE
LEFT JOIN LATERAL (
  SELECT * FROM nsm_recognition_vitals rv2
  WHERE rv2.student_id = s.student_id
  ORDER BY measured_date DESC LIMIT 1
) rv ON TRUE
LEFT JOIN LATERAL (
  SELECT * FROM nsm_leadership_vitals lv2
  WHERE lv2.student_id = s.student_id
  ORDER BY measured_date DESC LIMIT 1
) lv ON TRUE
LEFT JOIN LATERAL (
  SELECT * FROM nsm_service_vitals sv2
  WHERE sv2.student_id = s.student_id
  ORDER BY measured_date DESC LIMIT 1
) sv ON TRUE
LEFT JOIN LATERAL (
  SELECT * FROM nsm_artifacts_vitals artv2
  WHERE artv2.student_id = s.student_id
  ORDER BY measured_date DESC LIMIT 1
) artv ON TRUE
LEFT JOIN LATERAL (
  SELECT * FROM nsm_program_vitals pv2
  WHERE pv2.student_id = s.student_id
  ORDER BY measured_date DESC LIMIT 1
) pv ON TRUE
LEFT JOIN LATERAL (
  SELECT * FROM nsm_essay_vitals ev2
  WHERE ev2.student_id = s.student_id
  ORDER BY measured_date DESC LIMIT 1
) ev ON TRUE
LEFT JOIN LATERAL (
  SELECT * FROM nsm_college_list_vitals clv2
  WHERE clv2.student_id = s.student_id
  ORDER BY measured_date DESC LIMIT 1
) clv ON TRUE
LEFT JOIN LATERAL (
  SELECT * FROM nsm_admission_vitals adv2
  WHERE adv2.student_id = s.student_id
  ORDER BY measured_date DESC LIMIT 1
) adv ON TRUE;

COMMENT ON VIEW v_nsm_dashboard IS 'Real-time NSM dashboard - all vitals for all students';

-- ============================================================================
-- Sample Data: Huda-2025 Baseline (Month 0)
-- ============================================================================

-- IvyScore Baseline
INSERT INTO nsm_ivyscore_tracking (
  student_id, coach_id, snapshot_month,
  academics_score, leadership_score, service_score, artifacts_score, recognition_score,
  target_ivyscore, agent_assessor, notes
) VALUES (
  'huda-2025', 'jenny-coach-1', 0,
  4, 2, 1, 3, 1,
  23, 'AssessmentAgent', 'Baseline assessment - Identity: Digital Storyteller (Film × CS)'
) ON CONFLICT (student_id, snapshot_month) DO NOTHING;

-- Academic Vitals Baseline
INSERT INTO nsm_academic_vitals (
  student_id, gpa_weighted, gpa_unweighted, gpa_target_weighted, gpa_target_unweighted,
  sat_score, sat_target, ap_courses_taken, ap_courses_target,
  ap_fives_count, ap_fives_target, course_rigor_rating, course_rigor_target,
  b_grade_count, measured_by_agent
) VALUES (
  'huda-2025', 4.30, 3.95, 4.50, 4.00,
  1360, 1500, 6, 10,
  3, 7, 7, 10,
  2, 'AssessmentAgent'
);

-- Recognition Vitals Baseline
INSERT INTO nsm_recognition_vitals (
  student_id, national_awards_won, regional_awards_won, local_awards_won,
  award_applications_submitted, award_win_rate, award_win_rate_target,
  high_roi_awards_targeted, measured_by_agent
) VALUES (
  'huda-2025', 0, 2, 4,
  6, 0.33, 0.50,
  2, 'AwardsAgent'
);

-- Leadership Vitals Baseline
INSERT INTO nsm_leadership_vitals (
  student_id, officer_positions_held, club_founding_count, team_captain_roles,
  volunteer_hours_leadership, mentoring_hours, fundraising_led_dollars,
  measured_by_agent
) VALUES (
  'huda-2025', 0, 0, 1,
  50, 0, 0,
  'ExtracurricularsAgent'
);

-- Service Vitals Baseline
INSERT INTO nsm_service_vitals (
  student_id, volunteer_hours_total, volunteer_hours_target,
  community_impact_people, sustained_service_months, service_leadership_role,
  measured_by_agent
) VALUES (
  'huda-2025', 50, 300,
  20, 3, FALSE,
  'ExtracurricularsAgent'
);

-- Artifacts Vitals Baseline
INSERT INTO nsm_artifacts_vitals (
  student_id, research_papers_published, conference_presentations,
  portfolio_projects_count, github_contributions, internships_completed,
  measured_by_agent
) VALUES (
  'huda-2025', 0, 0,
  3, 50, 0,
  'SummerProgramsAgent'
);

-- Program Vitals Baseline
INSERT INTO nsm_program_vitals (
  student_id, programs_applied, programs_accepted, programs_attended,
  prestigious_programs_accepted, measured_by_agent
) VALUES (
  'huda-2025', 0, 0, 0,
  0, 'SummerProgramsAgent'
);

-- Essay Vitals Baseline
INSERT INTO nsm_essay_vitals (
  student_id, common_app_essay_quality, supplemental_essays_complete,
  identity_fusion_clarity, essay_revisions_completed, measured_by_agent
) VALUES (
  'huda-2025', 'draft', 0,
  'weak', 1, 'EssayAgent'
);

-- College List Vitals Baseline
INSERT INTO nsm_college_list_vitals (
  student_id, reach_schools_count, match_schools_count, safety_schools_count,
  ed_ea_strategy, fit_score, measured_by_agent
) VALUES (
  'huda-2025', 2, 3, 5,
  NULL, 6, 'CollegeListAgent'
);

-- Admission Vitals Baseline
INSERT INTO nsm_admission_vitals (
  student_id, applications_submitted_on_time, applications_total,
  recommendation_letters_secured, transcripts_submitted, test_scores_sent,
  fee_waivers_obtained, interview_prep_completed, measured_by_agent
) VALUES (
  'huda-2025', 0, 0,
  0, 0, 0,
  0, FALSE, 'AdmissionsAgent'
);

-- ============================================================
-- NSM Tracking Extensions (v15.005)
-- Date: 2025-10-17
-- Purpose: Extend existing schema for NSM tracking WITHOUT duplication
--
-- Strategy:
--   - Leverage existing kb_items, feature_snapshots, college_list, scholarships
--   - Add ONLY 2 truly missing tables (essay_progress, admission_checklist)
--   - Create NSM views that aggregate existing data
--   - Zero duplicate data structures
-- ============================================================

-- Enable migration mode
SET app.migration = 'true';

-- ============================================================
-- SECTION 1: Missing Tables (Only 2 - What's NOT in existing schema)
-- ============================================================

-- Essay Quality Tracking (Not covered by kb_items)
-- Tracks drafts, revisions, identity fusion clarity
CREATE TABLE IF NOT EXISTS essay_progress (
  essay_id SERIAL PRIMARY KEY,
  student_id TEXT NOT NULL,
  essay_type TEXT NOT NULL,           -- 'Common App' | 'Supplemental'
  college_id INTEGER,                 -- NULL for Common App, college_id for supplementals
  draft_version INTEGER DEFAULT 1,
  quality_rating TEXT,                -- 'draft' | 'good' | 'exceptional'
  identity_fusion_clarity TEXT,       -- 'weak' | 'moderate' | 'strong'
  differentiation_score INTEGER,      -- 1-10 (how unique vs generic)
  revision_count INTEGER DEFAULT 0,
  word_count INTEGER,
  last_updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  CONSTRAINT essay_quality_check CHECK (quality_rating IN ('draft', 'good', 'exceptional')),
  CONSTRAINT essay_fusion_check CHECK (identity_fusion_clarity IN ('weak', 'moderate', 'strong'))
);

CREATE INDEX idx_essay_progress_student ON essay_progress(student_id);
CREATE INDEX idx_essay_progress_type ON essay_progress(essay_type);

-- Admission Execution Checklist (Partial overlap with kb_items, but adds granular tracking)
-- Tracks recommendation letters, transcripts, interview prep
CREATE TABLE IF NOT EXISTS admission_checklist (
  checklist_id SERIAL PRIMARY KEY,
  student_id TEXT NOT NULL,
  college_id INTEGER,  -- References college_list(college_id) - FK removed due to permissions

  -- Recommendation Letters
  recommendation_letters_secured INTEGER DEFAULT 0,
  recommendation_letters_required INTEGER DEFAULT 3,
  rec_letter_teacher1_status TEXT,    -- 'Not Asked' | 'Asked' | 'Received'
  rec_letter_teacher2_status TEXT,
  rec_letter_counselor_status TEXT,

  -- Official Documents
  transcript_requested_at TIMESTAMP,
  transcript_submitted BOOLEAN DEFAULT FALSE,
  test_scores_sent BOOLEAN DEFAULT FALSE,
  midyear_report_submitted BOOLEAN DEFAULT FALSE,

  -- Supplemental Requirements
  portfolio_submitted BOOLEAN DEFAULT FALSE,
  interview_scheduled BOOLEAN DEFAULT FALSE,
  interview_prep_done BOOLEAN DEFAULT FALSE,
  interview_completed_at TIMESTAMP,

  -- Financial Aid
  fafsa_submitted BOOLEAN DEFAULT FALSE,
  css_profile_submitted BOOLEAN DEFAULT FALSE,

  -- Tracking
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT rec_status_check CHECK (rec_letter_teacher1_status IN ('Not Asked', 'Asked', 'Received'))
);

CREATE INDEX idx_admission_checklist_student ON admission_checklist(student_id);
CREATE INDEX idx_admission_checklist_college ON admission_checklist(college_id);

-- ============================================================
-- SECTION 2: Missing Feature Definitions (For feature_defs)
-- ============================================================

-- Essay quality features
INSERT INTO feature_defs (feature_id, domain, label, description, scale_max)
VALUES
  ('essay_common_app_quality', 'narrative', 'Common App Essay Quality', 'Quality rating of Common App essay', 100),
  ('essay_identity_fusion_clarity', 'narrative', 'Identity Fusion Clarity', 'Clarity of identity fusion in essays', 100),
  ('essay_differentiation_score', 'narrative', 'Essay Differentiation', 'How unique vs generic (1-10)', 10)
ON CONFLICT (feature_id) DO NOTHING;

-- Admission execution features
INSERT INTO feature_defs (feature_id, domain, label, description, scale_max)
VALUES
  ('admission_on_time_rate', 'execution', 'Applications On Time %', 'Percentage of applications submitted on time', 100),
  ('admission_rec_letters_complete', 'execution', 'Rec Letters Complete', 'All recommendation letters secured', 1),
  ('admission_checklist_complete_rate', 'execution', 'Checklist Completion %', 'Overall admission checklist completion', 100)
ON CONFLICT (feature_id) DO NOTHING;

-- ============================================================
-- SECTION 3: NSM Views (Aggregate existing tables - NO duplication)
-- ============================================================

-- ============================================================
-- View 1: IvyScore Trajectory (from feature_snapshots)
-- ============================================================
CREATE OR REPLACE VIEW v_nsm_ivyscore_trajectory AS
SELECT
  fs.student_id,
  fs.as_of AS snapshot_month,
  fs.snapshot_id,

  -- Domain scores (0-5 each, sum to 25)
  COALESCE(SUM(CASE WHEN fd.domain = 'academics' THEN fsv.value_norm ELSE 0 END) / 100.0 * 5, 0) AS academics_score,
  COALESCE(SUM(CASE WHEN fd.domain = 'leadership' THEN fsv.value_norm ELSE 0 END) / 100.0 * 5, 0) AS leadership_score,
  COALESCE(SUM(CASE WHEN fd.domain = 'service' THEN fsv.value_norm ELSE 0 END) / 100.0 * 5, 0) AS service_score,
  COALESCE(SUM(CASE WHEN fd.domain = 'artifacts' THEN fsv.value_norm ELSE 0 END) / 100.0 * 5, 0) AS artifacts_score,
  COALESCE(SUM(CASE WHEN fd.domain = 'awards' THEN fsv.value_norm ELSE 0 END) / 100.0 * 5, 0) AS recognition_score,

  -- Total IvyScore (0-25)
  COALESCE(
    SUM(CASE WHEN fd.domain IN ('academics', 'leadership', 'service', 'artifacts', 'awards')
        THEN fsv.value_norm ELSE 0 END) / 100.0 * 5, 0
  ) AS total_ivyscore,

  fs.created_ts AS calculated_at

FROM feature_snapshots fs
JOIN feature_snapshot_values fsv ON fs.snapshot_id = fsv.snapshot_id
JOIN feature_defs fd ON fsv.feature_id = fd.feature_id
GROUP BY fs.student_id, fs.as_of, fs.snapshot_id, fs.created_ts
ORDER BY fs.student_id, fs.as_of;

COMMENT ON VIEW v_nsm_ivyscore_trajectory IS 'NSM: Monthly IvyScore trajectory leveraging existing feature_snapshots (zero duplication)';

-- ============================================================
-- View 2: Current IvyScore (Latest snapshot per student)
-- ============================================================
CREATE OR REPLACE VIEW v_nsm_current_ivyscore AS
SELECT DISTINCT ON (student_id)
  student_id,
  snapshot_month,
  academics_score,
  leadership_score,
  service_score,
  artifacts_score,
  recognition_score,
  total_ivyscore,
  calculated_at
FROM v_nsm_ivyscore_trajectory
ORDER BY student_id, snapshot_month DESC;

COMMENT ON VIEW v_nsm_current_ivyscore IS 'NSM: Latest IvyScore per student (most recent snapshot)';

-- ============================================================
-- View 3: Recognition Vitals (from kb_items - Award_Competition)
-- ============================================================
CREATE OR REPLACE VIEW v_nsm_recognition_vitals AS
SELECT
  student_id,

  -- Award wins by tier
  COUNT(*) FILTER (WHERE subtype = 'National' AND status_detail IN ('Winner', 'Finalist')) AS national_awards_won,
  COUNT(*) FILTER (WHERE subtype = 'Regional' AND status_detail IN ('Winner', 'Finalist')) AS regional_awards_won,
  COUNT(*) FILTER (WHERE subtype = 'Local' AND status_detail IN ('Winner', 'Finalist')) AS local_awards_won,

  -- Award applications
  COUNT(*) FILTER (WHERE tier1_state IN ('Submitted', 'Outcome')) AS total_awards_applied,
  COUNT(*) FILTER (WHERE tier1_state = 'Outcome') AS total_awards_outcomes,

  -- Win rate (outcomes / applied)
  CASE
    WHEN COUNT(*) FILTER (WHERE tier1_state IN ('Submitted', 'Outcome')) > 0
    THEN COUNT(*) FILTER (WHERE status_detail IN ('Winner', 'Finalist'))::NUMERIC /
         NULLIF(COUNT(*) FILTER (WHERE tier1_state IN ('Submitted', 'Outcome')), 0)
    ELSE 0
  END AS award_win_rate,

  -- Total award submissions (including planned)
  COUNT(*) FILTER (WHERE tier1_state = 'Submitted') AS awards_in_review,
  COUNT(*) FILTER (WHERE tier1_state = 'Planned') AS awards_planned

FROM kb_items
WHERE item_type = 'Award_Competition'
GROUP BY student_id;

COMMENT ON VIEW v_nsm_recognition_vitals IS 'NSM: Award wins and win rate from kb_items (zero duplication)';

-- ============================================================
-- View 4: Academic Vitals (from kb_items - Test)
-- ============================================================
CREATE OR REPLACE VIEW v_nsm_academic_vitals AS
SELECT
  student_id,

  -- SAT/ACT scores (latest per test type)
  MAX(CASE WHEN subtype = 'SAT' AND key_metric_type = 'score_total'
      THEN key_metric_value::INTEGER END) AS sat_score_latest,
  MAX(CASE WHEN subtype = 'ACT' AND key_metric_type = 'score_composite'
      THEN key_metric_value::INTEGER END) AS act_score_latest,

  -- AP exams
  COUNT(*) FILTER (WHERE subtype = 'AP' AND key_metric_value::INTEGER >= 3) AS ap_exams_passed,
  COUNT(*) FILTER (WHERE subtype = 'AP' AND key_metric_value::INTEGER = 5) AS ap_exams_perfect,

  -- Test attempts (for trajectory)
  COUNT(*) FILTER (WHERE subtype = 'SAT') AS sat_attempts,
  COUNT(*) FILTER (WHERE subtype = 'ACT') AS act_attempts

FROM kb_items
WHERE item_type = 'Test'
GROUP BY student_id;

COMMENT ON VIEW v_nsm_academic_vitals IS 'NSM: Test scores from kb_items (zero duplication)';

-- ============================================================
-- View 5: Leadership Vitals (from kb_items - EC with leadership)
-- ============================================================
CREATE OR REPLACE VIEW v_nsm_leadership_vitals AS
SELECT
  student_id,

  -- Officer positions (status_detail contains leadership roles)
  COUNT(*) FILTER (WHERE status_detail IN ('President', 'Vice President', 'Captain', 'Officer')) AS officer_positions_held,
  COUNT(*) FILTER (WHERE status_detail = 'President') AS president_positions,
  COUNT(*) FILTER (WHERE status_detail = 'Founder') AS clubs_founded,

  -- Total leadership hours per week
  SUM(CASE WHEN status_detail IN ('President', 'Vice President', 'Captain', 'Officer', 'Founder')
      AND key_metric_type = 'hours_per_week'
      THEN key_metric_value::NUMERIC ELSE 0 END) AS total_leadership_hours_per_week,

  -- Fundraising impact (if key_metric_type = 'fundraising_amount')
  SUM(CASE WHEN key_metric_type = 'fundraising_amount'
      THEN key_metric_value::NUMERIC ELSE 0 END) AS total_fundraising_dollars

FROM kb_items
WHERE item_type LIKE 'EC_%'
  AND tier1_state IN ('In Transit', 'Submitted', 'Outcome')
GROUP BY student_id;

COMMENT ON VIEW v_nsm_leadership_vitals IS 'NSM: Leadership positions from kb_items (zero duplication)';

-- ============================================================
-- View 6: Service Vitals (from kb_items - EC_Service)
-- ============================================================
CREATE OR REPLACE VIEW v_nsm_service_vitals AS
SELECT
  student_id,

  -- Total volunteer hours (hours_per_week * weeks_per_year * years)
  SUM(CASE
    WHEN key_metric_type = 'hours_per_week'
    THEN key_metric_value::NUMERIC * 48 *
         EXTRACT(YEAR FROM AGE(COALESCE(outcome_date, NOW()), event_date))
    ELSE 0
  END) AS total_volunteer_hours,

  -- Community impact (people_impacted)
  SUM(CASE WHEN key_metric_type = 'people_impacted'
      THEN key_metric_value::NUMERIC ELSE 0 END) AS total_people_impacted,

  -- Duration (how many months sustained)
  MAX(EXTRACT(MONTH FROM AGE(COALESCE(outcome_date, NOW()), event_date))) AS max_sustained_months,

  -- Service activities count
  COUNT(*) AS service_activities_count

FROM kb_items
WHERE item_type = 'EC_Service'
  AND tier1_state IN ('In Transit', 'Submitted', 'Outcome')
GROUP BY student_id;

COMMENT ON VIEW v_nsm_service_vitals IS 'NSM: Volunteer hours and impact from kb_items (zero duplication)';

-- ============================================================
-- View 7: Artifacts Vitals (from kb_items - EC_Project)
-- ============================================================
CREATE OR REPLACE VIEW v_nsm_artifacts_vitals AS
SELECT
  student_id,

  -- Research papers (subtype = 'Research')
  COUNT(*) FILTER (WHERE subtype = 'Research') AS research_papers_published,
  COUNT(*) FILTER (WHERE subtype = 'Research' AND status_detail = 'Published') AS research_papers_peer_reviewed,

  -- Portfolio projects
  COUNT(*) FILTER (WHERE subtype IN ('Portfolio', 'GitHub')) AS portfolio_projects_count,

  -- Internships
  COUNT(*) FILTER (WHERE subtype = 'Internship') AS internships_completed,

  -- Conference presentations
  COUNT(*) FILTER (WHERE subtype = 'Conference') AS conference_presentations

FROM kb_items
WHERE item_type = 'EC_Project'
  AND tier1_state IN ('Submitted', 'Outcome')
GROUP BY student_id;

COMMENT ON VIEW v_nsm_artifacts_vitals IS 'NSM: Research papers and projects from kb_items (zero duplication)';

-- ============================================================
-- View 8: Summer Program Vitals (from moat_summer_programs)
-- ============================================================
-- Note: Assuming moat_summer_programs exists (from previous migrations)
-- If not, this will need to reference kb_items with item_type = 'Program'

CREATE OR REPLACE VIEW v_nsm_program_vitals AS
SELECT
  student_id,

  -- Applications
  COUNT(*) FILTER (WHERE tier1_state IN ('Submitted', 'Outcome')) AS programs_applied,

  -- Acceptances by prestige
  COUNT(*) FILTER (WHERE tier1_state = 'Outcome' AND status_detail = 'Accepted'
                   AND subtype IN ('RSI', 'TASP', 'SSP')) AS prestigious_programs_accepted,
  COUNT(*) FILTER (WHERE tier1_state = 'Outcome' AND status_detail = 'Accepted') AS total_programs_accepted,

  -- Acceptance rate
  CASE
    WHEN COUNT(*) FILTER (WHERE tier1_state IN ('Submitted', 'Outcome')) > 0
    THEN COUNT(*) FILTER (WHERE status_detail = 'Accepted')::NUMERIC /
         NULLIF(COUNT(*) FILTER (WHERE tier1_state IN ('Submitted', 'Outcome')), 0)
    ELSE 0
  END AS program_acceptance_rate

FROM kb_items
WHERE item_type = 'Program'
GROUP BY student_id;

COMMENT ON VIEW v_nsm_program_vitals IS 'NSM: Summer program applications and acceptances from kb_items (zero duplication)';

-- ============================================================
-- View 9: Essay Vitals (from essay_progress - NEW table)
-- ============================================================
CREATE OR REPLACE VIEW v_nsm_essay_vitals AS
SELECT
  student_id,

  -- Common App essay
  MAX(CASE WHEN essay_type = 'Common App' THEN quality_rating END) AS common_app_essay_quality,
  MAX(CASE WHEN essay_type = 'Common App' THEN identity_fusion_clarity END) AS identity_fusion_clarity,
  MAX(CASE WHEN essay_type = 'Common App' THEN differentiation_score END) AS differentiation_score,
  MAX(CASE WHEN essay_type = 'Common App' THEN revision_count END) AS common_app_revisions,

  -- Supplemental essays
  COUNT(*) FILTER (WHERE essay_type = 'Supplemental') AS supplemental_essays_count,
  COUNT(*) FILTER (WHERE essay_type = 'Supplemental' AND completed_at IS NOT NULL) AS supplemental_essays_completed,

  -- Average quality
  AVG(CASE
    WHEN quality_rating = 'exceptional' THEN 3
    WHEN quality_rating = 'good' THEN 2
    WHEN quality_rating = 'draft' THEN 1
  END) AS avg_essay_quality_score

FROM essay_progress
GROUP BY student_id;

COMMENT ON VIEW v_nsm_essay_vitals IS 'NSM: Essay quality metrics from essay_progress (new table)';

-- ============================================================
-- View 10: College List Vitals (from college_list)
-- ============================================================
CREATE OR REPLACE VIEW v_nsm_college_list_vitals AS
SELECT
  student_id,

  -- College count by bucket_category (actual column name)
  COUNT(*) FILTER (WHERE bucket_category = 'Reach') AS reach_schools_count,
  COUNT(*) FILTER (WHERE bucket_category = 'Match') AS match_schools_count,
  COUNT(*) FILTER (WHERE bucket_category = 'Safety') AS safety_schools_count,
  COUNT(*) FILTER (WHERE bucket_category = 'Wild Card') AS wildcard_schools_count,

  -- ED/EA strategy (decision_plan is actual column name)
  COUNT(*) FILTER (WHERE decision_plan = 'ED') AS ed_schools_count,
  COUNT(*) FILTER (WHERE decision_plan = 'EA') AS ea_schools_count,
  COUNT(*) FILTER (WHERE decision_plan = 'RD') AS rd_schools_count,
  COUNT(*) FILTER (WHERE decision_plan = 'REA') AS rea_schools_count,
  COUNT(*) FILTER (WHERE decision_plan = 'Rolling') AS rolling_schools_count,

  -- Fit score (ivyready_score_at_submit is actual column name)
  AVG(ivyready_score_at_submit) AS avg_fit_score,

  -- Total applications
  COUNT(*) AS total_colleges

FROM college_list
GROUP BY student_id;

COMMENT ON VIEW v_nsm_college_list_vitals IS 'NSM: College list strategy from college_list (zero duplication)';

-- ============================================================
-- View 11: Admission Execution Vitals (from admission_checklist + college_list)
-- ============================================================
CREATE OR REPLACE VIEW v_nsm_admission_vitals AS
SELECT
  ac.student_id,

  -- Applications submitted (use decision_result IS NOT NULL as proxy for submitted)
  COUNT(DISTINCT cl.college_id) FILTER (WHERE cl.decision_result IS NOT NULL) AS applications_submitted,
  COUNT(DISTINCT cl.college_id) AS applications_total,

  -- Submission completion rate
  CASE
    WHEN COUNT(DISTINCT cl.college_id) > 0
    THEN COUNT(DISTINCT cl.college_id) FILTER (WHERE cl.decision_result IS NOT NULL)::NUMERIC /
         NULLIF(COUNT(DISTINCT cl.college_id), 0)
    ELSE 0
  END AS submission_completion_rate,

  -- Recommendation letters
  AVG(ac.recommendation_letters_secured) AS avg_rec_letters_secured,

  -- Checklist completion (% of required items done)
  AVG(
    (CASE WHEN ac.transcript_submitted THEN 1 ELSE 0 END +
     CASE WHEN ac.test_scores_sent THEN 1 ELSE 0 END +
     CASE WHEN ac.recommendation_letters_secured >= ac.recommendation_letters_required THEN 1 ELSE 0 END +
     CASE WHEN ac.interview_prep_done OR NOT ac.interview_scheduled THEN 1 ELSE 0 END)::NUMERIC / 4.0
  ) AS avg_checklist_completion_rate

FROM admission_checklist ac
JOIN college_list cl ON ac.college_id = cl.college_id AND ac.student_id = cl.student_id
GROUP BY ac.student_id;

COMMENT ON VIEW v_nsm_admission_vitals IS 'NSM: Execution tracking from admission_checklist + college_list (minimal duplication)';

-- ============================================================
-- View 12: Lagging Outcomes (from college_list + scholarships)
-- ============================================================
CREATE OR REPLACE VIEW v_nsm_lagging_outcomes AS
SELECT
  cl.student_id,

  -- Acceptances by bucket_category (actual column name)
  COUNT(*) FILTER (WHERE cl.decision_result = 'Accepted' AND cl.bucket_category = 'Reach') AS reach_acceptances,
  COUNT(*) FILTER (WHERE cl.decision_result = 'Accepted' AND cl.bucket_category = 'Match') AS match_acceptances,
  COUNT(*) FILTER (WHERE cl.decision_result = 'Accepted' AND cl.bucket_category = 'Safety') AS safety_acceptances,
  COUNT(*) FILTER (WHERE cl.decision_result = 'Accepted' AND cl.bucket_category = 'Wild Card') AS wildcard_acceptances,

  -- Total outcomes (decision_result is actual column name)
  COUNT(*) FILTER (WHERE cl.decision_result = 'Accepted') AS total_acceptances,
  COUNT(*) FILTER (WHERE cl.decision_result = 'Rejected') AS total_rejections,
  COUNT(*) FILTER (WHERE cl.decision_result = 'Waitlisted') AS total_waitlists,
  COUNT(*) FILTER (WHERE cl.decision_result = 'Deferred') AS total_deferred,

  -- Scholarship $ awarded (scholarships table has different schema)
  COALESCE(SUM(s.amount_usd), 0) AS total_scholarship_awarded,
  COUNT(DISTINCT s.scholarship_id) FILTER (WHERE s.application_status = 'Accepted') AS scholarships_won,

  -- Tier improvement (highest acceptance bucket_category)
  MAX(CASE
    WHEN cl.decision_result = 'Accepted' AND cl.bucket_category = 'Reach' THEN 'Reach'
    WHEN cl.decision_result = 'Accepted' AND cl.bucket_category = 'Match' THEN 'Match'
    WHEN cl.decision_result = 'Accepted' AND cl.bucket_category = 'Safety' THEN 'Safety'
    WHEN cl.decision_result = 'Accepted' AND cl.bucket_category = 'Wild Card' THEN 'Wild Card'
  END) AS final_acceptance_tier,

  -- Attending college
  MAX(CASE WHEN cl.attending = TRUE THEN cl.college_name END) AS attending_college,
  MAX(CASE WHEN cl.attending = TRUE THEN cl.bucket_category END) AS attending_tier

FROM college_list cl
LEFT JOIN scholarships s ON cl.student_id = s.student_id
WHERE cl.decision_result IS NOT NULL
GROUP BY cl.student_id;

COMMENT ON VIEW v_nsm_lagging_outcomes IS 'NSM: Final acceptances and scholarships from college_list + scholarships (zero duplication)';

-- ============================================================
-- View 13: NSM Dashboard (All vitals combined)
-- ============================================================
CREATE OR REPLACE VIEW v_nsm_dashboard AS
SELECT
  ivy.student_id,

  -- IvyScore
  ivy.total_ivyscore AS current_ivyscore,
  ivy.academics_score,
  ivy.leadership_score,
  ivy.service_score,
  ivy.artifacts_score,
  ivy.recognition_score,

  -- Academic vitals
  acad.sat_score_latest,
  acad.act_score_latest,
  acad.ap_exams_passed,

  -- Recognition vitals
  rec.national_awards_won,
  rec.regional_awards_won,
  rec.award_win_rate,

  -- Leadership vitals
  lead.officer_positions_held,
  lead.clubs_founded,

  -- Service vitals
  serv.total_volunteer_hours,
  serv.total_people_impacted,

  -- Artifacts vitals
  art.research_papers_published,
  art.portfolio_projects_count,

  -- Summer program vitals
  prog.prestigious_programs_accepted,

  -- Essay vitals
  ess.common_app_essay_quality,
  ess.identity_fusion_clarity,

  -- College list vitals
  coll.reach_schools_count,
  coll.match_schools_count,
  coll.safety_schools_count,
  coll.avg_fit_score,

  -- Admission vitals
  adm.applications_submitted,
  adm.submission_completion_rate,

  -- Lagging outcomes
  lag.reach_acceptances,
  lag.match_acceptances,
  lag.total_scholarship_awarded,

  ivy.snapshot_month AS as_of_date

FROM v_nsm_current_ivyscore ivy
LEFT JOIN v_nsm_academic_vitals acad ON ivy.student_id = acad.student_id
LEFT JOIN v_nsm_recognition_vitals rec ON ivy.student_id = rec.student_id
LEFT JOIN v_nsm_leadership_vitals lead ON ivy.student_id = lead.student_id
LEFT JOIN v_nsm_service_vitals serv ON ivy.student_id = serv.student_id
LEFT JOIN v_nsm_artifacts_vitals art ON ivy.student_id = art.student_id
LEFT JOIN v_nsm_program_vitals prog ON ivy.student_id = prog.student_id
LEFT JOIN v_nsm_essay_vitals ess ON ivy.student_id = ess.student_id
LEFT JOIN v_nsm_college_list_vitals coll ON ivy.student_id = coll.student_id
LEFT JOIN v_nsm_admission_vitals adm ON ivy.student_id = adm.student_id
LEFT JOIN v_nsm_lagging_outcomes lag ON ivy.student_id = lag.student_id;

COMMENT ON VIEW v_nsm_dashboard IS 'NSM: Unified dashboard with all vitals (leverages existing schema, zero duplication)';

-- ============================================================
-- SECTION 4: Sample Data (Huda-2025 Baseline)
-- ============================================================

-- Essay progress baseline
INSERT INTO essay_progress (student_id, essay_type, draft_version, quality_rating, identity_fusion_clarity, differentiation_score, revision_count, word_count)
VALUES
  ('huda-2025', 'Common App', 1, 'draft', 'weak', 4, 0, 580)
ON CONFLICT DO NOTHING;

-- Note: kb_items, feature_snapshots, college_list data should already exist from previous migrations
-- This migration only adds essay tracking and admission checklist

-- Admission checklist (will be populated as Huda applies to colleges)
-- No baseline data needed - will be created when colleges are added to college_list

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Check IvyScore trajectory
-- SELECT * FROM v_nsm_ivyscore_trajectory WHERE student_id = 'huda-2025';

-- Check current IvyScore
-- SELECT * FROM v_nsm_current_ivyscore WHERE student_id = 'huda-2025';

-- Check recognition vitals (awards from kb_items)
-- SELECT * FROM v_nsm_recognition_vitals WHERE student_id = 'huda-2025';

-- Check full dashboard
-- SELECT * FROM v_nsm_dashboard WHERE student_id = 'huda-2025';

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
-- Result:
--   - 2 new tables (essay_progress, admission_checklist)
--   - 13 NSM views leveraging existing schema
--   - Zero duplicate data structures
--   - Full NSM tracking using kb_items, feature_snapshots, college_list, scholarships
-- ============================================================

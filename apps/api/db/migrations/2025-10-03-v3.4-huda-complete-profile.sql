-- V3.4: Huda Complete Profile (End-to-End Provisioning)
-- Date: 2025-10-03
-- Feature: Huda's initial targets (GamePlan) + final outcomes (Common App) + rubric snapshots
-- Dependencies: Requires 2025-10-03-v3.4-rubric-gameplan-commonapp.sql

-- ============================================================================
-- 1) SOURCES (Provenance)
-- ============================================================================

-- GamePlan (initial assessment)
INSERT INTO sources (source_id, student_id, source_type, title, date_start, local_name)
VALUES ('SRC-GP-2023-06-22','huda-2025','exec_doc','Huda GamePlan Report (Initial)','2023-06-22','Huda_Assessment_Gameplan_...pdf')
ON CONFLICT (source_id) DO NOTHING;

-- Common App (final submission)
INSERT INTO sources (source_id, student_id, source_type, title, date_start, local_name)
VALUES ('SRC-CAPP-2024-10-01','huda-2025','submission','Common App \u2014 UNC Submission','2024-10-01','UNC APP - SUBMITTED.pdf')
ON CONFLICT (source_id) DO NOTHING;

-- iMessage archive (interactions/evidence)
INSERT INTO sources (source_id, student_id, source_type, title, date_start, local_name)
VALUES ('SRC-IMSG-2023-2025','huda-2025','imessage','Jenny\u2013Huda iMessage Archive','2023-06-01','Jenny-Huda Private iMessage Texts (3 parts)')
ON CONFLICT (source_id) DO NOTHING;

-- ============================================================================
-- 2) INITIAL TARGETS (GamePlan Assessment Phase)
-- ============================================================================

-- 2A) Award Targets (7 canonical from GamePlan)
INSERT INTO award_targets_enum (student_id, phase, item_label, as_of, source_id)
VALUES
 ('huda-2025','initial','NCWIT Aspirations in Computing','2023-06-22','SRC-GP-2023-06-22'),
 ('huda-2025','initial','Presidential Volunteer Service Award','2023-06-22','SRC-GP-2023-06-22'),
 ('huda-2025','initial','National Merit Finalist','2023-06-22','SRC-GP-2023-06-22'),
 ('huda-2025','initial','Game Hackathon Awards','2023-06-22','SRC-GP-2023-06-22'),
 ('huda-2025','initial','Advocacy Award','2023-06-22','SRC-GP-2023-06-22'),
 ('huda-2025','initial','Game Impact Challenge Award','2023-06-22','SRC-GP-2023-06-22'),
 ('huda-2025','initial','JCamp','2023-06-22','SRC-GP-2023-06-22')
ON CONFLICT (student_id, phase, item_label) DO NOTHING;

-- 2B) EC Targets (8 initial from GamePlan)
INSERT INTO ec_targets (student_id, phase, item_label, as_of, source_id)
VALUES
 ('huda-2025','initial','Empowering AI (Founder)','2023-06-22','SRC-GP-2023-06-22'),
 ('huda-2025','initial','Synthoria (Founder/Dev)','2023-06-22','SRC-GP-2023-06-22'),
 ('huda-2025','initial','Filmmaker''s Club (President)','2023-06-22','SRC-GP-2023-06-22'),
 ('huda-2025','initial','Folklift (Founder)','2023-06-22','SRC-GP-2023-06-22'),
 ('huda-2025','initial','Women in Games (Ambassador)','2023-06-22','SRC-GP-2023-06-22'),
 ('huda-2025','initial','Kode With Klossy (Scholar)','2023-06-22','SRC-GP-2023-06-22'),
 ('huda-2025','initial','Mustang Studios Podcast (VP)','2023-06-22','SRC-GP-2023-06-22'),
 ('huda-2025','initial','Sunday School Teacher','2023-06-22','SRC-GP-2023-06-22')
ON CONFLICT (student_id, phase, item_label) DO NOTHING;

-- 2C) Narrative - Initial (5 categories from GamePlan)
INSERT INTO kb_items (item_id, student_id, item_type, subtype, title_name, tier1_state, source_ref, confidence)
VALUES
 ('NARR-huda-2025-initial-advocacy','huda-2025','narrative','advocacy','AI Ethics Advocacy, Youth Advisory, Cultural Nonprofit','Planned','SRC-GP-2023-06-22','high'),
 ('NARR-huda-2025-initial-aptitude','huda-2025','narrative','aptitude','Technology, CS, AI, Game Development','Planned','SRC-GP-2023-06-22','high'),
 ('NARR-huda-2025-initial-framing','huda-2025','narrative','framing','Natural storyteller through code and film','Planned','SRC-GP-2023-06-22','high'),
 ('NARR-huda-2025-initial-passion','huda-2025','narrative','passion','Videography, Games, Interactive Media Arts','Planned','SRC-GP-2023-06-22','high'),
 ('NARR-huda-2025-initial-why_statement','huda-2025','narrative','why_statement','Why I engage in impactful work: games + AI ethics + interactive media','Planned','SRC-GP-2023-06-22','high')
ON CONFLICT (item_id) DO NOTHING;

-- ============================================================================
-- 3) FINAL OUTCOMES (Common App Submission)
-- ============================================================================

-- 3A) Awards Won (6 honors from outcomes)
INSERT INTO outcomes (student_id, type, details_json, occurred_at, source_id)
VALUES
 ('huda-2025','achievement','{"award_name":"NCWIT Aspirations in Computing - National Awardee","tier":"National"}','2024-03-15','SRC-IMSG-2023-2025'),
 ('huda-2025','achievement','{"award_name":"NCWIT Aspirations in Computing - Northern California Regional Winner","tier":"Regional"}','2024-03-15','SRC-IMSG-2023-2025'),
 ('huda-2025','achievement','{"award_name":"Mountain House HS Computer Science CTE Award","tier":"School"}','2024-06-01','SRC-IMSG-2023-2025'),
 ('huda-2025','achievement','{"award_name":"AP Scholar with Distinction","tier":"National"}','2024-07-01','SRC-IMSG-2023-2025'),
 ('huda-2025','achievement','{"award_name":"Games for Change Writing Impact Award","tier":"International"}','2024-07-20','SRC-IMSG-2023-2025'),
 ('huda-2025','achievement','{"award_name":"College Board National Rural and Small Town Award","tier":"National"}','2024-09-01','SRC-IMSG-2023-2025')
ON CONFLICT DO NOTHING;

-- 3B) ECs - Final (10 activities as submitted to Common App)
INSERT INTO kb_items (item_id, student_id, item_type, subtype, title_name, tier1_state, status_detail, key_metric_value, submit_date, source_ref, confidence)
VALUES
-- 1) Empowering AI (Founder)
('KBI-huda-2025-ec-empowering-ai','huda-2025','activity','Computer/Technology',
 'Founder, Empowering AI; An initiative providing resources to girls, fostering education in AI & ethics',
 'Submitted','Founder',
 'Years: 10-12; 8 hr/wk, 50 wk/yr; Impact: Raised $23k+; Led AI ethics panel (Google, NVIDIA); Founded EmpowHER Hacks (44 cities); Organized national officer board',
 '2024-10-01','SRC-CAPP-2024-10-01','high'),

-- 2) Synthoria (Founder/Solo Developer)
('KBI-huda-2025-ec-synthoria','huda-2025','activity','Computer/Technology',
 'Founder/Solo Developer, Synthoria',
 'Submitted','Founder/Solo Developer',
 'Years: 9-12; 6 hr/wk, 48 wk/yr; Impact: Distributed with lesson kit to 200 classes (6.4k students); Featured on "Games for Good" podcast',
 '2024-10-01','SRC-CAPP-2024-10-01','high'),

-- 3) Filmmaker''s Club (President)
('KBI-huda-2025-ec-filmmakers','huda-2025','activity','Journalism/Publication',
 'President, Filmmaker''s Club',
 'Submitted','President',
 'Years: 9-12; 5 hr/wk, 36 wk/yr; Impact: Increased membership by 413%; Directed award-winning films "Bluff" & "Breaking Bad Grades"; Anchored & edited student news to 2.5k students',
 '2024-10-01','SRC-CAPP-2024-10-01','high'),

-- 4) AAJA JCamp (Student Leader/Scholar)
('KBI-huda-2025-ec-jcamp','huda-2025','activity','Journalism/Publication',
 'Student Leader, Asian American Journalist Association JCamp (6-day journalism summer program)',
 'Submitted','Student Leader (Scholar)',
 'Year: 12; 100 hr/wk, 1 wk/yr; Impact: Selected among top 30 US student journalists; Reported with CNN/WaPo/Bloomberg/ABC7 on Austin political climate',
 '2024-10-01','SRC-CAPP-2024-10-01','high'),

-- 5) Sunday School Teacher (Religious/Community)
('KBI-huda-2025-ec-sunday-school','huda-2025','activity','Religious',
 'Sunday School Teacher, Mountain House Muslim Association',
 'Submitted','Teacher',
 'Years: 10-12; 2 hr/wk, 42 wk/yr; Impact: 126 volunteer hours; Crafted lesson plans; Gamified learning via trivia competitions',
 '2024-10-01','SRC-CAPP-2024-10-01','high'),

-- 6) Folklift (Founder)
('KBI-huda-2025-ec-folklift','huda-2025','activity','Journalism/Publication',
 'Founder, Folklift (non-profit gazette highlighting minority stories)',
 'Submitted','Founder',
 'Years: 11-12; 4 hr/wk, 50 wk/yr; Impact: International online news platform via React.js; Interviews boosted local Muslim-owned businesses; Featured in local newspaper',
 '2024-10-01','SRC-CAPP-2024-10-01','high'),

-- 7) Kode With Klossy (Scholar)
('KBI-huda-2025-ec-kwk','huda-2025','activity','Computer/Technology',
 'Scholar, Kode With Klossy',
 'Submitted','Scholar',
 'Years: 11-12; 15 hr/wk, 4 wk/yr; Impact: Built data viz on access to tech vs GDP; Trained acne-type ML classifier',
 '2024-10-01','SRC-CAPP-2024-10-01','high'),

-- 8) Women in Games (Ambassador)
('KBI-huda-2025-ec-wig','huda-2025','activity','Computer/Technology',
 'Ambassador, Women in Games',
 'Submitted','Ambassador',
 'Years: 11-12; 2 hr/wk, 30 wk/yr; Impact: Youngest ambassador; Hosted "Game Dev for STEMinism" workshop; 46 cities reach via org footprint',
 '2024-10-01','SRC-CAPP-2024-10-01','high'),

-- 9) Mustang Studios Podcast (VP)
('KBI-huda-2025-ec-podcast','huda-2025','activity','Career Oriented',
 'Vice President, Mustang Studios Podcast Club',
 'Submitted','Vice President',
 'Years: 11-12; 4 hr/wk, 50 wk/yr; Impact: Produced 30+ episodes (Spotify/TuneIn); Platformed local change topics (construction, local gov.)',
 '2024-10-01','SRC-CAPP-2024-10-01','high'),

-- 10) Tech Influencer & Freelancer
('KBI-huda-2025-ec-tech-influencer','huda-2025','activity','Computer/Technology',
 'Technology influencer & freelancer (Independent)',
 'Submitted','Creator/Developer',
 'Years: 11-12; Time varies; Impact: TikTok 2M+ views / 364k likes; built MHTJobz used by ~300 locals; competed in college hackathon',
 '2024-10-01','SRC-CAPP-2024-10-01','medium')
ON CONFLICT (item_id) DO NOTHING;

-- 3C) Narrative - Final (5 categories as submitted)
INSERT INTO kb_items (item_id, student_id, item_type, subtype, title_name, tier1_state, source_ref, confidence)
VALUES
 ('NARR-huda-2025-final-advocacy','huda-2025','narrative','advocacy','Global AI ethics advocacy; hackathon leadership; journalism/media','Submitted','SRC-CAPP-2024-10-01','high'),
 ('NARR-huda-2025-final-aptitude','huda-2025','narrative','aptitude','CS/Game aptitude (AP/CTE), SAT 1530, rigorous course load','Submitted','SRC-CAPP-2024-10-01','high'),
 ('NARR-huda-2025-final-framing','huda-2025','narrative','framing','Tech-driven change-maker; founder-builder identity','Submitted','SRC-CAPP-2024-10-01','high'),
 ('NARR-huda-2025-final-passion','huda-2025','narrative','passion','Games, AI, storytelling via Empowering AI, Synthoria, Folklift','Submitted','SRC-CAPP-2024-10-01','high'),
 ('NARR-huda-2025-final-why_statement','huda-2025','narrative','why_statement','Fusion of games, AI, and social impact aligned to CS/Game Design','Submitted','SRC-CAPP-2024-10-01','high')
ON CONFLICT (item_id) DO NOTHING;

-- ============================================================================
-- 4) SAT TIMELINE (Progression: Practice → Official → Final)
-- ============================================================================

INSERT INTO sat_timeline_enum (student_id, as_of, numeric_value, type, confidence, source_id, raw_name, raw_value)
VALUES
 ('huda-2025','2024-01-15',1360,'practice','high','SRC-IMSG-2023-2025','SAT Total','1360'),
 ('huda-2025','2024-03-09',1480,'official','high','SRC-IMSG-2023-2025','SAT Total','1480'),
 ('huda-2025','2024-04-20',1530,'official','high','SRC-IMSG-2023-2025','SAT Total','1530')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 5) IVYREADY RUBRIC SNAPSHOTS
-- ============================================================================

-- 5A) Assessment Snapshot (GamePlan baseline - 2023-06-22)
WITH w AS (
  SELECT factor_id, weight_pct FROM admissions_rubric_factors WHERE rubric_id='ivyplus_v1'
)
INSERT INTO admissions_rubric_scores
(student_id, rubric_id, snapshot_phase, as_of, factor_id, raw_score, weight_pct, details_json, source_id)
SELECT
  'huda-2025','ivyplus_v1','assessment','2023-06-22', w.factor_id,
  CASE w.factor_id
    WHEN 'academics'     THEN 75  -- Strong trajectory, early rigor planning
    WHEN 'testing'       THEN 65  -- Pre-1530 (targets set)
    WHEN 'ecs'           THEN 72  -- Early leadership/portfolio forming
    WHEN 'awards'        THEN 55  -- Targets set but not won yet
    WHEN 'narrative'     THEN 70  -- Clear GP framing, needs evidence
    WHEN 'socio_context' THEN 65  -- Baseline school/context
  END AS raw_score,
  w.weight_pct,
  jsonb_build_object('notes','Initial GamePlan baseline'),
  'SRC-GP-2023-06-22'
FROM w
ON CONFLICT (student_id, rubric_id, snapshot_phase, as_of, factor_id) DO NOTHING;

-- 5B) Final Submit Snapshot (Common App - 2024-10-01)
WITH w AS (
  SELECT factor_id, weight_pct FROM admissions_rubric_factors WHERE rubric_id='ivyplus_v1'
)
INSERT INTO admissions_rubric_scores
(student_id, rubric_id, snapshot_phase, as_of, factor_id, raw_score, weight_pct, details_json, source_id)
SELECT
  'huda-2025','ivyplus_v1','final_submit','2024-10-01', w.factor_id,
  CASE w.factor_id
    WHEN 'academics'     THEN 90  -- Strong transcript & rigor
    WHEN 'testing'       THEN 96  -- SAT 1530
    WHEN 'ecs'           THEN 92  -- 10 ECs, founder roles, scale & evidence
    WHEN 'awards'        THEN 88  -- 6 credible honors (NCWIT nat/reg, G4C, AP Dist., CB NRST, CTE)
    WHEN 'narrative'     THEN 94  -- Coherent, 5-part final narrative present
    WHEN 'socio_context' THEN 70  -- Steady
  END AS raw_score,
  w.weight_pct,
  jsonb_build_object('notes','Final Common App submitted profile'),
  'SRC-CAPP-2024-10-01'
FROM w
ON CONFLICT (student_id, rubric_id, snapshot_phase, as_of, factor_id) DO NOTHING;

-- ============================================================================
-- MIGRATION COMPLETE - V3.4 HUDA PROFILE
-- ============================================================================

-- Verification queries (run manually after migration):
/*
-- 1) Initial GamePlan targets
SELECT
  jsonb_array_length(award_targets) AS initial_award_targets,
  jsonb_array_length(ec_targets)    AS initial_ec_targets,
  jsonb_array_length(narrative_items) AS initial_narrative
FROM v_gameplan_summary_initial WHERE student_id='huda-2025';
-- Expected: awards=7, ECs=8, narrative=5

-- 2) Awards won (final)
SELECT COUNT(*) FROM v_awards_won WHERE student_id='huda-2025';
-- Expected: 6

-- 3) Final ECs (Common App-ready)
SELECT COUNT(*) FROM v_commonapp_activities WHERE student_id='huda-2025';
-- Expected: 10

-- 4) SAT progression
SELECT * FROM v_sat_enum_progression WHERE student_id='huda-2025' ORDER BY as_of;
-- Expected: 3 rows (1360, 1480, 1530)

-- 5) IvyReady score (latest snapshots)
SELECT snapshot_phase, ivyready_score, factor_scores
FROM v_rubric_scores_latest
WHERE student_id='huda-2025';
-- Expected: 2 snapshots (assessment ~68, final_submit ~90)

-- 6) Common App consolidated
SELECT
  jsonb_array_length(activities) AS act_count,
  jsonb_array_length(honors)     AS honors_count
FROM v_commonapp_submitted WHERE student_id='huda-2025';
-- Expected: act_count=10, honors_count=6
*/

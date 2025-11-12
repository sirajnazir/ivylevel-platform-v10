-- =====================================================
-- JTBD (Jobs To Be Done) - Real Data from Huda's Sessions
-- =====================================================
-- Student: huda-2025
-- Extraction Date: 2025-10-12
-- Source: 92 weeks of coaching session transcripts
-- Schema: v10.6 (jtbd table)

-- Phase 2: Key Milestone Weeks Only (6 weeks)
-- Note: These are COMPLETED jobs from actual sessions
-- Week boundaries calculated from session dates

-- Week 8: School Year Start (Aug 2023)
INSERT INTO jtbd (jtbd_id, student_id, week_number, week_start_date, week_end_date, job_type, job_description, linked_chip_id, linked_table, status, completion_date, outcome_metric, outcome_value, outcome_unit, source_id, notes)
VALUES
('JTBD-HUDA-W008-001', 'huda-2025', 8, '2023-08-07', '2023-08-13', 'ec_milestone', 'School year start and club fair signups', 'CHIP-EC-GENERAL-001', 'ec_vitals', 'completed', '2023-08-08', NULL, NULL, NULL, 'SRC-SNAPSHOT-2023-08-08', 'Beginning of junior year, foundation setting');

-- Week 12: Film Club Leadership (Sept 2023)
INSERT INTO jtbd (jtbd_id, student_id, week_number, week_start_date, week_end_date, job_type, job_description, linked_chip_id, linked_table, status, completion_date, outcome_metric, outcome_value, outcome_unit, source_id, notes)
VALUES
('JTBD-HUDA-W012-001', 'huda-2025', 12, '2023-09-11', '2023-09-17', 'ec_milestone', 'Film Makers Club officer election - achieved 60% female leadership transformation', 'CHIP-EC-FILMCLUB-001', 'ec_vitals', 'completed', '2023-09-15', 'female_officer_percentage', 60, 'percent', 'SRC-SNAPSHOT-2023-09-15', 'Major leadership milestone: 3 of 5 officers female'),
('JTBD-HUDA-W012-002', 'huda-2025', 12, '2023-09-11', '2023-09-17', 'ec_milestone', 'Film Makers Club achieved 132 member signups at club fair', 'CHIP-EC-FILMCLUB-001', 'ec_vitals', 'completed', '2023-09-15', 'club_signups', 132, 'members', 'SRC-SNAPSHOT-2023-09-15', 'Significant membership growth');

-- Week 20: Applications and Testing (Nov 2023)
INSERT INTO jtbd (jtbd_id, student_id, week_number, week_start_date, week_end_date, job_type, job_description, linked_chip_id, linked_table, status, completion_date, outcome_metric, outcome_value, outcome_unit, source_id, notes)
VALUES
('JTBD-HUDA-W020-001', 'huda-2025', 20, '2023-11-06', '2023-11-12', 'application', 'Bank of America Student Leaders application with community challenge essays', NULL, NULL, 'completed', '2023-11-10', NULL, NULL, NULL, 'SRC-SNAPSHOT-2023-11-10', 'Summer program application submitted'),
('JTBD-HUDA-W020-002', 'huda-2025', 20, '2023-11-06', '2023-11-12', 'test', 'SAT test administration', NULL, NULL, 'completed', '2023-11-10', NULL, NULL, NULL, 'SRC-SNAPSHOT-2023-11-10', 'Official SAT test taken');

-- Week 30: Platform Pivot and Program Application (Jan 2024)
INSERT INTO jtbd (jtbd_id, student_id, week_number, week_start_date, week_end_date, job_type, job_description, linked_chip_id, linked_table, status, completion_date, outcome_metric, outcome_value, outcome_unit, source_id, notes)
VALUES
('JTBD-HUDA-W030-001', 'huda-2025', 30, '2024-01-29', '2024-02-04', 'ec_milestone', 'Folklift platform pivot from Muslim businesses to youth journalism', 'CHIP-EC-FOLKLIFT-001', 'ec_vitals', 'completed', '2024-01-30', 'writers_recruited', 5, 'writers', 'SRC-SNAPSHOT-2024-01-30', 'Strategic pivot with immediate traction: 5 writers recruited'),
('JTBD-HUDA-W030-002', 'huda-2025', 30, '2024-01-29', '2024-02-04', 'application', 'J-Camp journalism program application', NULL, NULL, 'completed', '2024-01-30', NULL, NULL, NULL, 'SRC-SNAPSHOT-2024-01-30', 'Summer journalism program application submitted');

-- Week 40: Competition and Outreach (Mar 2024)
INSERT INTO jtbd (jtbd_id, student_id, week_number, week_start_date, week_end_date, job_type, job_description, linked_chip_id, linked_table, status, completion_date, outcome_metric, outcome_value, outcome_unit, source_id, notes)
VALUES
('JTBD-HUDA-W040-001', 'huda-2025', 40, '2024-03-18', '2024-03-24', 'ec_milestone', 'Elementary school AI toolkit creation and distribution strategy', 'CHIP-EC-AIGAME-001', 'ec_vitals', 'completed', '2024-03-23', NULL, NULL, NULL, 'SRC-SNAPSHOT-2024-03-23', 'Educational outreach initiative'),
('JTBD-HUDA-W040-002', 'huda-2025', 40, '2024-03-18', '2024-03-24', 'award', 'Games for Change competition submission', 'CHIP-EC-SYNTHORIA-001', 'ec_vitals', 'completed', '2024-03-23', NULL, NULL, NULL, 'SRC-SNAPSHOT-2024-03-23', 'National game competition submission');

-- Week 48: Game Launch and Marketing (June 2024)
INSERT INTO jtbd (jtbd_id, student_id, week_number, week_start_date, week_end_date, job_type, job_description, linked_chip_id, linked_table, status, completion_date, outcome_metric, outcome_value, outcome_unit, source_id, notes)
VALUES
('JTBD-HUDA-W048-001', 'huda-2025', 48, '2024-06-03', '2024-06-09', 'ec_milestone', 'Synthoria game distribution - reached 150 people via email and social media', 'CHIP-EC-SYNTHORIA-001', 'ec_vitals', 'completed', '2024-06-06', 'people_reached', 150, 'people', 'SRC-SNAPSHOT-2024-06-06', 'Major distribution milestone'),
('JTBD-HUDA-W048-002', 'huda-2025', 48, '2024-06-03', '2024-06-09', 'ec_milestone', 'TikTok marketing campaign for Synthoria achieving 2500-3000 views per video', 'CHIP-EC-SYNTHORIA-001', 'ec_vitals', 'completed', '2024-06-06', 'avg_video_views', 2750, 'views', 'SRC-SNAPSHOT-2024-06-06', 'Social media marketing success');

-- Notes:
-- - All jobs are 'completed' status (Phase 2 focus on completed milestones)
-- - Week boundaries calculated from session dates
-- - linked_chip_id references ec_vitals chip_ids where applicable
-- - outcome_metric/value/unit populated when quantifiable outcomes exist
-- - source_id uses SRC-SNAPSHOT-YYYY-MM-DD format matching session dates
-- - Phase 3 will add remaining 86 weeks of JTBD data

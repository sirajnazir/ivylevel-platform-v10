-- =============================================================================
-- HUDA'S JTBD (JOBS TO BE DONE) - Sample Weekly Execution Data
-- =============================================================================
-- Student: huda-2025
-- Program: 52-week college application coaching
-- Sample weeks: Week 8, Week 12, Week 20, Week 30, Week 40
-- Focus: WHAT got done (pure facts), not HOW or WHY (coaching stays in KB)
-- =============================================================================

-- =============================================================================
-- WEEK 8 (Feb 2024) - Early Program Execution
-- Week dates: 2024-02-19 to 2024-02-25
-- =============================================================================

INSERT INTO jtbd (jtbd_id, student_id, week_number, week_start_date, week_end_date, job_type, job_description, linked_chip_id, linked_table, status, completion_date, outcome_metric, outcome_value, outcome_unit, source_id, notes)
VALUES
  ('J001', 'huda-2025', 8, '2024-02-19', '2024-02-25', 'ec_milestone', 'Launched Empowering AI website', 'E001', 'kb_items', 'completed', '2024-02-21',
   'product_launches', 1, 'product', 'SRC-SNAPSHOT-2024-02-25', 'First major milestone for Empowering AI'),

  ('J002', 'huda-2025', 8, '2024-02-19', '2024-02-25', 'essay', 'Drafted personal statement v1', NULL, NULL, 'completed', '2024-02-23',
   'essays_drafted', 1, 'essay', 'SRC-SNAPSHOT-2024-02-25', 'First full draft completed'),

  ('J003', 'huda-2025', 8, '2024-02-19', '2024-02-25', 'academic', 'Finalized junior year course selection', NULL, NULL, 'completed', '2024-02-20',
   'courses_selected', 6, 'courses', 'SRC-SNAPSHOT-2024-02-25', 'Locked in senior year schedule'),

  ('J004', 'huda-2025', 8, '2024-02-19', '2024-02-25', 'test', 'Registered for SAT (March date)', NULL, NULL, 'completed', '2024-02-19',
   'tests_registered', 1, 'test', 'SRC-SNAPSHOT-2024-02-25', 'Second SAT attempt scheduled');

-- =============================================================================
-- WEEK 12 (Mar 2024) - Mid-Program Push
-- Week dates: 2024-03-18 to 2024-03-24
-- =============================================================================

INSERT INTO jtbd (jtbd_id, student_id, week_number, week_start_date, week_end_date, job_type, job_description, linked_chip_id, linked_table, status, completion_date, outcome_metric, outcome_value, outcome_unit, source_id, notes)
VALUES
  ('J005', 'huda-2025', 12, '2024-03-18', '2024-03-24', 'test', 'Took SAT (2nd attempt)', NULL, NULL, 'completed', '2024-03-23',
   'tests_taken', 1, 'test', 'SRC-SNAPSHOT-2024-03-24', 'Scored 1480 (120-point improvement)'),

  ('J006', 'huda-2025', 12, '2024-03-18', '2024-03-24', 'ec_milestone', 'Secured $5k grant for Empowering AI', 'E001', 'kb_items', 'completed', '2024-03-20',
   'funding_raised', 5000, '$', 'SRC-SNAPSHOT-2024-03-24', 'First major funding milestone'),

  ('J007', 'huda-2025', 12, '2024-03-18', '2024-03-24', 'application', 'Submitted Kode With Klossy application', 'E005', 'kb_items', 'completed', '2024-03-22',
   'program_apps_submitted', 1, 'application', 'SRC-SNAPSHOT-2024-03-24', 'Summer program application'),

  ('J008', 'huda-2025', 12, '2024-03-18', '2024-03-24', 'essay', 'Revised personal statement (v2)', NULL, NULL, 'completed', '2024-03-21',
   'essays_revised', 1, 'essay', 'SRC-SNAPSHOT-2024-03-24', 'Incorporated feedback from Week 10 session');

-- =============================================================================
-- WEEK 20 (May 2024) - Summer Program Season
-- Week dates: 2024-05-13 to 2024-05-19
-- =============================================================================

INSERT INTO jtbd (jtbd_id, student_id, week_number, week_start_date, week_end_date, job_type, job_description, linked_chip_id, linked_table, status, completion_date, outcome_metric, outcome_value, outcome_unit, source_id, notes)
VALUES
  ('J009', 'huda-2025', 20, '2024-05-13', '2024-05-19', 'application', 'Submitted 3 summer program applications', NULL, NULL, 'completed', '2024-05-17',
   'program_apps_submitted', 3, 'applications', 'SRC-SNAPSHOT-2024-05-19', 'MIT MITES, AI4ALL, STEM summer programs'),

  ('J010', 'huda-2025', 20, '2024-05-13', '2024-05-19', 'ec_milestone', 'Folklift secured first partnership', 'E002', 'kb_items', 'completed', '2024-05-15',
   'partnerships_formed', 1, 'partnership', 'SRC-SNAPSHOT-2024-05-19', 'Partnership with local cultural organization'),

  ('J011', 'huda-2025', 20, '2024-05-13', '2024-05-19', 'test', 'Took 3 AP exams (CS, Calc AB, Lang)', NULL, NULL, 'completed', '2024-05-14',
   'tests_taken', 3, 'tests', 'SRC-SNAPSHOT-2024-05-19', 'AP testing week'),

  ('J012', 'huda-2025', 20, '2024-05-13', '2024-05-19', 'ec_milestone', 'Reached 1,000 students through Empowering AI', 'E001', 'kb_items', 'completed', '2024-05-18',
   'students_reached', 1000, 'students', 'SRC-SNAPSHOT-2024-05-19', 'Scale milestone - expanded to 2 cities');

-- =============================================================================
-- WEEK 30 (Jul 2024) - College List Finalization
-- Week dates: 2024-07-22 to 2024-07-28
-- =============================================================================

INSERT INTO jtbd (jtbd_id, student_id, week_number, week_start_date, week_end_date, job_type, job_description, linked_chip_id, linked_table, status, completion_date, outcome_metric, outcome_value, outcome_unit, source_id, notes)
VALUES
  ('J013', 'huda-2025', 30, '2024-07-22', '2024-07-28', 'application', 'Finalized college list (12 schools)', NULL, NULL, 'completed', '2024-07-25',
   'colleges_finalized', 12, 'colleges', 'SRC-SNAPSHOT-2024-07-28', '4 reach, 5 match, 3 safety'),

  ('J014', 'huda-2025', 30, '2024-07-22', '2024-07-28', 'essay', 'Drafted 5 supplemental essays', NULL, NULL, 'completed', '2024-07-27',
   'essays_drafted', 5, 'essays', 'SRC-SNAPSHOT-2024-07-28', 'Common App supplements for reach schools'),

  ('J015', 'huda-2025', 30, '2024-07-22', '2024-07-28', 'test', 'Took SAT (3rd attempt)', NULL, NULL, 'completed', '2024-07-27',
   'tests_taken', 1, 'test', 'SRC-SNAPSHOT-2024-07-28', 'Final SAT - scored 1530 (50-point improvement)'),

  ('J016', 'huda-2025', 30, '2024-07-22', '2024-07-28', 'ec_milestone', 'Released Synthoria game (indie project)', 'E004', 'kb_items', 'completed', '2024-07-26',
   'products_shipped', 1, 'product', 'SRC-SNAPSHOT-2024-07-28', 'First game release on itch.io');

-- =============================================================================
-- WEEK 40 (Sep 2024) - Early Action Push
-- Week dates: 2024-09-30 to 2024-10-06
-- =============================================================================

INSERT INTO jtbd (jtbd_id, student_id, week_number, week_start_date, week_end_date, job_type, job_description, linked_chip_id, linked_table, status, completion_date, outcome_metric, outcome_value, outcome_unit, source_id, notes)
VALUES
  ('J017', 'huda-2025', 40, '2024-09-30', '2024-10-06', 'application', 'Submitted 3 Early Action applications', NULL, NULL, 'completed', '2024-10-03',
   'college_apps_submitted', 3, 'applications', 'SRC-SNAPSHOT-2024-10-06', 'MIT EA, Caltech EA, UChicago EA'),

  ('J018', 'huda-2025', 40, '2024-09-30', '2024-10-06', 'ec_milestone', 'Empowering AI reached 5,000 students', 'E001', 'kb_items', 'completed', '2024-10-01',
   'students_reached', 5000, 'students', 'SRC-SNAPSHOT-2024-10-06', 'Major scale milestone - 10x growth since launch'),

  ('J019', 'huda-2025', 40, '2024-09-30', '2024-10-06', 'ec_milestone', 'Raised $15k total for Empowering AI', 'E001', 'kb_items', 'completed', '2024-10-02',
   'funding_raised', 15000, '$', 'SRC-SNAPSHOT-2024-10-06', 'Cumulative funding milestone - 3x initial goal'),

  ('J020', 'huda-2025', 40, '2024-09-30', '2024-10-06', 'award', 'Won NCWIT Aspirations in Computing - National Awardee', NULL, 'outcomes', 'completed', '2024-10-04',
   'awards_won', 1, 'award', 'SRC-SNAPSHOT-2024-10-06', 'National-level recognition for CS work');

-- =============================================================================
-- WEEK 48 (Nov 2024) - Regular Decision Push
-- Week dates: 2024-11-25 to 2024-12-01
-- =============================================================================

INSERT INTO jtbd (jtbd_id, student_id, week_number, week_start_date, week_end_date, job_type, job_description, linked_chip_id, linked_table, status, completion_date, outcome_metric, outcome_value, outcome_unit, source_id, notes)
VALUES
  ('J021', 'huda-2025', 48, '2024-11-25', '2024-12-01', 'application', 'Submitted remaining 9 Regular Decision applications', NULL, NULL, 'completed', '2024-11-30',
   'college_apps_submitted', 9, 'applications', 'SRC-SNAPSHOT-2024-12-01', 'All 12 college apps submitted'),

  ('J022', 'huda-2025', 48, '2024-11-25', '2024-12-01', 'ec_milestone', 'Empowering AI reached 6,400 students (final)', 'E001', 'kb_items', 'completed', '2024-11-28',
   'students_reached', 6400, 'students', 'SRC-SNAPSHOT-2024-12-01', 'Final count for CommonApp submission'),

  ('J023', 'huda-2025', 48, '2024-11-25', '2024-12-01', 'ec_milestone', 'Raised $23k total for Empowering AI (final)', 'E001', 'kb_items', 'completed', '2024-11-29',
   'funding_raised', 23000, '$', 'SRC-SNAPSHOT-2024-12-01', 'Final funding total for CommonApp'),

  ('J024', 'huda-2025', 48, '2024-11-25', '2024-12-01', 'ec_milestone', 'Folklift hit 413% membership growth', 'E002', 'kb_items', 'completed', '2024-11-27',
   'membership_growth', 413, '%', 'SRC-SNAPSHOT-2024-12-01', 'Final growth metric for CommonApp');

-- =============================================================================
-- SUMMARY STATS
-- =============================================================================
-- Total jobs tracked: 24 jobs across 6 weeks
-- Weeks sampled: 8, 12, 20, 30, 40, 48 (program milestones)
-- Job types:
--   - application: 6 (summer programs, college apps)
--   - ec_milestone: 11 (funding, scale, partnerships, products)
--   - test: 4 (SAT, AP exams)
--   - essay: 3 (drafts and revisions)
--   - award: 1 (NCWIT)
--   - academic: 1 (course selection)
-- All jobs: status = 'completed'
-- Date range: 2024-02-19 to 2024-12-01 (10 months)

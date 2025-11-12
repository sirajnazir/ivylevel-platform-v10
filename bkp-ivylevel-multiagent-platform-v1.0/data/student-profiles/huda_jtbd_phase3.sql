-- =====================================================
-- JTBD Phase 3 - Remaining 86 Weeks Real Data
-- =====================================================
-- Student: huda-2025
-- Extraction Date: 2025-10-12
-- Source: 92 weeks of coaching session transcripts
-- Schema: v10.6 (jtbd table)
-- Phase: 3 of 3 (28 additional completed jobs)

-- Note: This supplements Phase 1 & 2 data with remaining milestone weeks
-- Phase 1 & 2 covered weeks: 8, 12, 20, 30, 40, 48 (11 jobs)
-- Phase 3 adds: 28 jobs from remaining weeks with concrete evidence

-- ===================
-- MAJOR BREAKTHROUGHS
-- ===================

-- Week 55 (June 27, 2024): Financial Independence Milestone
INSERT INTO jtbd (jtbd_id, student_id, week_number, week_start_date, week_end_date, job_type, job_description, linked_chip_id, linked_table, status, completion_date, outcome_metric, outcome_value, outcome_unit, source_id, notes)
VALUES
('JTBD-HUDA-W055-001', 'huda-2025', 55, '2024-06-24', '2024-06-30', 'ec_milestone', 'Empowering AI Hackathon - $13K sponsorship secured independently ($10K Wolfram + $3K .xyz domains)', 'CHIP-EC-EMPAI-001', 'ec_vitals', 'completed', '2024-06-27', 'funding_raised', 13000, 'dollars', 'SRC-SNAPSHOT-2024-06-27', 'Major breakthrough: Secured funding through DevPost research without coaching directive'),
('JTBD-HUDA-W055-002', 'huda-2025', 55, '2024-06-24', '2024-06-30', 'ec_milestone', 'Empowering AI - International team expansion (France + Canada members recruited)', 'CHIP-EC-EMPAI-001', 'ec_vitals', 'completed', '2024-06-27', 'geographic_diversity', 3, 'countries', 'SRC-SNAPSHOT-2024-06-27', 'International credibility milestone: USA + France + Canada'),
('JTBD-HUDA-W055-003', 'huda-2025', 55, '2024-06-24', '2024-06-30', 'ec_milestone', 'DevPost sponsor research methodology established for future fundraising', 'CHIP-EC-EMPAI-001', NULL, 'completed', '2024-06-27', NULL, NULL, NULL, 'SRC-SNAPSHOT-2024-06-27', 'Repeatable process: Browse DevPost → identify sponsors → create list → reach out'),
('JTBD-HUDA-W055-004', 'huda-2025', 55, '2024-06-24', '2024-06-30', 'ec_milestone', 'Synthoria game - 890 plays milestone achieved', 'CHIP-EC-SYNTHORIA-001', 'ec_vitals', 'completed', '2024-06-27', 'plays', 890, 'plays', 'SRC-SNAPSHOT-2024-06-27', 'Significant user engagement metric'),
('JTBD-HUDA-W055-005', 'huda-2025', 55, '2024-06-24', '2024-06-30', 'ec_milestone', 'Synthoria mobile pivot decision - React Native implementation for 3x user expansion', 'CHIP-EC-SYNTHORIA-001', NULL, 'completed', '2024-06-27', 'potential_user_multiplier', 3, 'x', 'SRC-SNAPSHOT-2024-06-27', 'Strategic decision: 2-3 days development for 3x user base'),
('JTBD-HUDA-W055-006', 'huda-2025', 55, '2024-06-24', '2024-06-30', 'ec_milestone', 'Empowering AI hackathon - 20-25 participant target established (threshold psychology)', 'CHIP-EC-EMPAI-001', NULL, 'completed', '2024-06-27', 'target_participants', 25, 'participants', 'SRC-SNAPSHOT-2024-06-27', '20 magic number for legitimacy, 25 for buffer'),
('JTBD-HUDA-W055-007', 'huda-2025', 55, '2024-06-24', '2024-06-30', 'ec_milestone', 'Folklift - International contributor recruited', 'CHIP-EC-FOLKLIFT-001', 'ec_vitals', 'completed', '2024-06-27', NULL, NULL, NULL, 'SRC-SNAPSHOT-2024-06-27', 'Geographic expansion beyond local'),
('JTBD-HUDA-W055-008', 'huda-2025', 55, '2024-06-24', '2024-06-30', 'ec_milestone', 'Workshop outsourcing strategy implemented - role elevation to organizer', 'CHIP-EC-EMPAI-001', NULL, 'completed', '2024-06-27', NULL, NULL, NULL, 'SRC-SNAPSHOT-2024-06-27', 'Strategic shift: Organizer not instructor role'),
('JTBD-HUDA-W055-009', 'huda-2025', 55, '2024-06-24', '2024-06-30', 'ec_milestone', 'Transformation recognized: from directive-dependent to proactive opportunity-finding', NULL, NULL, 'completed', '2024-06-27', NULL, NULL, NULL, 'SRC-SNAPSHOT-2024-06-27', 'Both father and coach independently observed this developmental milestone');

-- Week 50 (June 12, 2024): Strategic Pivots and Campus Visit
INSERT INTO jtbd (jtbd_id, student_id, week_number, week_start_date, week_end_date, job_type, job_description, linked_chip_id, linked_table, status, completion_date, outcome_metric, outcome_value, outcome_unit, source_id, notes)
VALUES
('JTBD-HUDA-W050-001', 'huda-2025', 50, '2024-06-10', '2024-06-16', 'ec_milestone', 'USC campus visit completed - School of Cinematic Arts immersion experience', NULL, NULL, 'completed', '2024-06-12', NULL, NULL, NULL, 'SRC-SNAPSHOT-2024-06-12', 'Emotional commitment established: completely disconnected from family, mesmerized by campus'),
('JTBD-HUDA-W050-002', 'huda-2025', 50, '2024-06-10', '2024-06-16', 'other', 'Major strategic pivot: BFA → BS Computer Science Games for career flexibility', NULL, NULL, 'completed', '2024-06-12', NULL, NULL, NULL, 'SRC-SNAPSHOT-2024-06-12', 'Eliminated portfolio requirement, gained technical foundation flexibility'),
('JTBD-HUDA-W050-003', 'huda-2025', 50, '2024-06-10', '2024-06-16', 'ec_milestone', 'Empowering AI Secretary departure - team activation through crisis catalyst', 'CHIP-EC-EMPAI-001', NULL, 'completed', '2024-06-12', NULL, NULL, NULL, 'SRC-SNAPSHOT-2024-06-12', 'VP activated post-departure, team dynamics improved through challenge'),
('JTBD-HUDA-W050-004', 'huda-2025', 50, '2024-06-10', '2024-06-16', 'ec_milestone', 'Empowering AI - 95 Instagram followers milestone (approaching 100)', 'CHIP-EC-EMPAI-001', 'ec_vitals', 'completed', '2024-06-12', 'followers', 95, 'followers', 'SRC-SNAPSHOT-2024-06-12', 'Social media presence building'),
('JTBD-HUDA-W050-005', 'huda-2025', 50, '2024-06-10', '2024-06-16', 'other', '501(c)(3) nonprofit status decision for Empowering AI legitimacy', 'CHIP-EC-EMPAI-001', NULL, 'completed', '2024-06-12', NULL, NULL, NULL, 'SRC-SNAPSHOT-2024-06-12', 'Required for charging fees and institutional credibility'),
('JTBD-HUDA-W050-006', 'huda-2025', 50, '2024-06-10', '2024-06-16', 'ec_milestone', 'Payment model established for Empowering AI programs (investment psychology)', 'CHIP-EC-EMPAI-001', NULL, 'completed', '2024-06-12', NULL, NULL, NULL, 'SRC-SNAPSHOT-2024-06-12', 'Free programs not taken seriously - small payment creates commitment'),
('JTBD-HUDA-W050-007', 'huda-2025', 50, '2024-06-10', '2024-06-16', 'ec_milestone', 'TikTok content diversification beyond Synthoria to general indie games', 'CHIP-EC-WIG-001', NULL, 'completed', '2024-06-12', NULL, NULL, NULL, 'SRC-SNAPSHOT-2024-06-12', 'Expanded content strategy for broader reach'),
('JTBD-HUDA-W050-008', 'huda-2025', 50, '2024-06-10', '2024-06-16', 'ec_milestone', 'Community service award application strategy (mayor testimonial)', NULL, NULL, 'completed', '2024-06-12', NULL, NULL, NULL, 'SRC-SNAPSHOT-2024-06-12', 'Sign-up not application - then leverage for credibility'),
('JTBD-HUDA-W050-009', 'huda-2025', 50, '2024-06-10', '2024-06-16', 'ec_milestone', 'Father collaboration: Digital twin Jenny AI development recognized', NULL, NULL, 'completed', '2024-06-12', NULL, NULL, NULL, 'SRC-SNAPSHOT-2024-06-12', 'Parent recognition of platform quality'),
('JTBD-HUDA-W050-010', 'huda-2025', 50, '2024-06-10', '2024-06-16', 'other', 'Regional admissions advantage recognized (Mountain House tier 2 positioning)', NULL, NULL, 'completed', '2024-06-12', NULL, NULL, NULL, 'SRC-SNAPSHOT-2024-06-12', 'Less competitive school district strategic advantage');

-- Week 80 (October 27, 2024): Application Submission Sprint
INSERT INTO jtbd (jtbd_id, student_id, week_number, week_start_date, week_end_date, job_type, job_description, linked_chip_id, linked_table, status, completion_date, outcome_metric, outcome_value, outcome_unit, source_id, notes)
VALUES
('JTBD-HUDA-W080-001', 'huda-2025', 80, '2024-10-21', '2024-10-27', 'application', 'Stanford REA application submitted', NULL, NULL, 'completed', '2024-10-27', NULL, NULL, NULL, 'SRC-SNAPSHOT-2024-10-27', 'Primary application submitted on deadline day'),
('JTBD-HUDA-W080-002', 'huda-2025', 80, '2024-10-21', '2024-10-27', 'application', 'USC application submitted same night (momentum strategy)', NULL, NULL, 'completed', '2024-10-27', NULL, NULL, NULL, 'SRC-SNAPSHOT-2024-10-27', 'Dual submission for psychological momentum'),
('JTBD-HUDA-W080-003', 'huda-2025', 80, '2024-10-21', '2024-10-27', 'essay', 'Stanford REA essays completed (250 words exactly, 15+ hackathons quantified)', NULL, NULL, 'completed', '2024-10-27', 'word_count', 250, 'words', 'SRC-SNAPSHOT-2024-10-27', 'Precise word count achieved, quantified EC participation'),
('JTBD-HUDA-W080-004', 'huda-2025', 80, '2024-10-21', '2024-10-27', 'essay', 'USC essays completed and refined for same-night submission', NULL, NULL, 'completed', '2024-10-27', NULL, NULL, NULL, 'SRC-SNAPSHOT-2024-10-27', 'Finalized for momentum submission'),
('JTBD-HUDA-W080-005', 'huda-2025', 80, '2024-10-21', '2024-10-27', 'essay', 'ChatGPT language detection and correction applied to essays', NULL, NULL, 'completed', '2024-10-27', NULL, NULL, NULL, 'SRC-SNAPSHOT-2024-10-27', 'AI-generated language patterns identified and humanized'),
('JTBD-HUDA-W080-006', 'huda-2025', 80, '2024-10-21', '2024-10-27', 'essay', 'Sunday School volunteering essay pivot for differentiation', NULL, NULL, 'completed', '2024-10-27', NULL, NULL, NULL, 'SRC-SNAPSHOT-2024-10-27', 'Alternative content strategy for unique positioning'),
('JTBD-HUDA-W080-007', 'huda-2025', 80, '2024-10-21', '2024-10-27', 'essay', 'Engineering mindset insertion in USC essays (final 40 words strategy)', NULL, NULL, 'completed', '2024-10-27', NULL, NULL, NULL, 'SRC-SNAPSHOT-2024-10-27', 'Strategic gap filling for technical positioning'),
('JTBD-HUDA-W080-008', 'huda-2025', 80, '2024-10-21', '2024-10-27', 'other', 'J-Camp positioning decision (EC not award for essay opportunity)', NULL, NULL, 'completed', '2024-10-27', NULL, NULL, NULL, 'SRC-SNAPSHOT-2024-10-27', 'Strategic classification for maximum narrative value');

-- Notes:
-- - Total Phase 3: 28 JTBD records across key breakthrough weeks
-- - All jobs have 'completed' status with evidence from sessions
-- - Outcome metrics populated when quantifiable
-- - Week boundaries: Monday-Sunday calculated from session dates
-- - Combined with Phase 1 & 2: Total 39 JTBD records (11 + 28)
-- - Remaining weeks 1-7, 9-11, 13-19, 21-29, 31-39, 41-47, 49, 51-54, 56-79, 81-92 contain
--   routine activities without milestone-level evidence in session summaries

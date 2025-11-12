-- =====================================================
-- EC Vitals - Real Data Extracted from Huda's Sessions
-- =====================================================
-- Student: huda-2025
-- Extraction Date: 2025-10-12
-- Source: 92 weeks of coaching session transcripts
-- Schema: v10.6 (ec_vitals table)

-- Phase 1: Major quantifiable EC milestones only
-- Note: These represent DISTINCT progression snapshots, not duplicates

-- AI Ethics Game: Initial baseline (Week 1, June 2023)
INSERT INTO ec_vitals (vital_id, student_id, chip_id, activity_name, metric_type, metric_name, numeric_value, text_value, unit, as_of, source_id, evidence_text, notes)
VALUES
('VIT-HUDA-001', 'huda-2025', 'CHIP-EC-AIGAME-001', 'AI Ethics Game', 'scale', 'users_reached', 100, NULL, 'users', '2023-06-21', 'SRC-SNAPSHOT-2023-06-21', '100 users reached, 60% girls mentioned in W001 session', 'Baseline measurement from first coaching session'),
('VIT-HUDA-002', 'huda-2025', 'CHIP-EC-AIGAME-001', 'AI Ethics Game', 'scale', 'female_percentage', 60, NULL, 'percent', '2023-06-21', 'SRC-SNAPSHOT-2023-06-21', '60% girls user demographic', 'Gender diversity metric'),
('VIT-HUDA-003', 'huda-2025', 'CHIP-EC-AIGAME-001', 'AI Ethics Game', 'impact', 'stem_confidence_increase', 40, NULL, 'percent', '2023-08-08', 'SRC-SNAPSHOT-2023-08-08', '40% reported increased STEM confidence from W008 session', 'Impact measurement from user surveys');

-- Film Makers Club: Leadership transformation (Week 20, Nov 2023)
INSERT INTO ec_vitals (vital_id, student_id, chip_id, activity_name, metric_type, metric_name, numeric_value, text_value, unit, as_of, source_id, evidence_text, notes)
VALUES
('VIT-HUDA-004', 'huda-2025', 'CHIP-EC-FILMCLUB-001', 'Film Makers Club', 'leadership', 'total_officers', 5, NULL, 'officers', '2023-11-10', 'SRC-SNAPSHOT-2023-11-10', '5 total officers after election (3 of 5 female)', 'Post-election officer count'),
('VIT-HUDA-005', 'huda-2025', 'CHIP-EC-FILMCLUB-001', 'Film Makers Club', 'leadership', 'female_officers', 3, NULL, 'officers', '2023-11-10', 'SRC-SNAPSHOT-2023-11-10', 'Achieved 3 of 5 female officers (60%)', 'Gender diversity in leadership'),
('VIT-HUDA-006', 'huda-2025', 'CHIP-EC-FILMCLUB-001', 'Film Makers Club', 'leadership', 'female_officer_percentage', 60, NULL, 'percent', '2023-11-10', 'SRC-SNAPSHOT-2023-11-10', '0% to 60% female officers transformation mentioned in W020', 'Significant leadership transformation'),
('VIT-HUDA-007', 'huda-2025', 'CHIP-EC-FILMCLUB-001', 'Film Makers Club', 'scale', 'club_signups', 132, NULL, 'members', '2023-09-15', 'SRC-SNAPSHOT-2023-09-15', '132 signups at club fair (W012)', 'Initial membership growth');

-- Folklift: Youth journalism platform pivot (Week 30, Jan 2024)
INSERT INTO ec_vitals (vital_id, student_id, chip_id, activity_name, metric_type, metric_name, numeric_value, text_value, unit, as_of, source_id, evidence_text, notes)
VALUES
('VIT-HUDA-008', 'huda-2025', 'CHIP-EC-FOLKLIFT-001', 'Folklift Youth Journalism Platform', 'scale', 'writers_recruited', 5, NULL, 'writers', '2024-01-30', 'SRC-SNAPSHOT-2024-01-30', '5 writers recruited after pivot from Muslim businesses to youth journalism (W030)', 'Platform pivot milestone'),
('VIT-HUDA-009', 'huda-2025', 'CHIP-EC-FOLKLIFT-001', 'Folklift Youth Journalism Platform', 'product', 'pieces_published', 3, NULL, 'articles', '2024-01-30', 'SRC-SNAPSHOT-2024-01-30', '3 pieces published at time of W030 session', 'Content production metric');

-- Synthoria: Educational game distribution (Week 48, June 2024)
INSERT INTO ec_vitals (vital_id, student_id, chip_id, activity_name, metric_type, metric_name, numeric_value, text_value, unit, as_of, source_id, evidence_text, notes)
VALUES
('VIT-HUDA-010', 'huda-2025', 'CHIP-EC-SYNTHORIA-001', 'Synthoria Educational Game', 'scale', 'people_reached', 150, NULL, 'people', '2024-06-06', 'SRC-SNAPSHOT-2024-06-06', 'Sent to 150 people via email/social in W048', 'Distribution milestone'),
('VIT-HUDA-011', 'huda-2025', 'CHIP-EC-SYNTHORIA-001', 'Synthoria Educational Game', 'impact', 'tiktok_avg_views', 2750, NULL, 'views', '2024-06-06', 'SRC-SNAPSHOT-2024-06-06', 'TikTok posts getting 2500-3000 views (avg 2750) in W048', 'Social media reach'),
('VIT-HUDA-012', 'huda-2025', 'CHIP-EC-SYNTHORIA-001', 'Synthoria Educational Game', 'product', 'tiktok_posts', 1, NULL, 'posts', '2024-06-06', 'SRC-SNAPSHOT-2024-06-06', 'TikTok marketing campaign launched', 'Marketing initiative');

-- Notes:
-- - All metrics are FACTUAL and QUANTIFIABLE
-- - No coaching intelligence or strategy included
-- - chip_id references follow pattern: CHIP-EC-{PROJECT}-001
-- - source_id uses SRC-SNAPSHOT-YYYY-MM-DD format
-- - as_of dates represent actual measurement dates from session transcripts
-- - Phase 3 will add intermediate progression snapshots for all activities

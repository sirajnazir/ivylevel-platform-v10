-- =====================================================
-- Test Scores - Real Data Extracted from Huda's Sessions
-- =====================================================
-- Student: huda-2025
-- Extraction Date: 2025-10-12
-- Source: 92 weeks of coaching session transcripts + academics timeline
-- Note: These should integrate with existing test_scores table if present

-- SAT Progression
-- Note: Baseline SAT 1360 mentioned in W001, practice tests showing 1480 progression

-- Baseline SAT (Pre-coaching, June 2023)
-- SAT: 1360 (W001 baseline)
-- Evidence: "SAT 1360, 5 on AP HUG" from W001 coaching_intelligence.diagnostic.academic_baseline

-- Practice SAT improvements documented in W013, W015, W018, W030
-- SAT: 1480 (practice) - consistent performance across multiple practice tests

-- AP Test Scores
-- AP Human Geography: 5 (taken before coaching began, reported in W001)

-- Note: Full test score integration would require:
-- 1. Checking if test_scores table exists in schema
-- 2. Mapping to existing test score tracking if present
-- 3. For v10.6, we focus on EC vitals and JTBD tables only
-- 4. Test scores can be added to academics vitals in future iterations

-- Placeholder for future integration:
-- INSERT INTO test_scores (score_id, student_id, test_type, test_date, score_value, subject, source_id)
-- VALUES
-- ('SCORE-HUDA-SAT-001', 'huda-2025', 'SAT', '2023-06-01', 1360, NULL, 'SRC-GAMEPLAN-BASELINE'),
-- ('SCORE-HUDA-AP-001', 'huda-2025', 'AP', '2023-05-15', 5, 'Human Geography', 'SRC-GAMEPLAN-BASELINE'),
-- ('SCORE-HUDA-SAT-002', 'huda-2025', 'SAT_PRACTICE', '2023-10-01', 1480, NULL, 'SRC-SNAPSHOT-2023-10-01');

-- For now, test score tracking remains outside v10.6 scope
-- v10.6 focuses on: ec_vitals + jtbd tables only

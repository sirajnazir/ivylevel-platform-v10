-- =====================================================
-- Migration 20: Populate kb_items with Huda's ECs and Awards
-- Date: 2025-10-29
-- Purpose: Populate kb_items table for Awards Agent v18.1 fact sources
-- =====================================================

SET app.migration = true;

-- ========================================
-- Huda's Extracurricular Activities
-- ========================================

INSERT INTO kb_items (item_id, student_id, item_type, subtype, title_name, tier1_state, tier2_substate, status_detail, key_metric_type, key_metric_value, key_metric_unit, source_ref, created_ts, updated_ts) VALUES
  ('huda-ec-empowering-ai', 'huda-2025', 'Extracurricular', 'Leadership', 'Empowering AI - Founder & Director', 'In Transit', 'High Impact', 'Teaching AI ethics to young women through game-based learning platform', 'Students Impacted', '500', 'students', 'gameplan_extraction_02b', NOW() - INTERVAL '18 months', NOW()),
  ('huda-ec-synthoria', 'huda-2025', 'Extracurricular', 'Creative', 'Synthoria - AI Ethics Game Developer', 'In Transit', 'High Impact', 'Developed educational game teaching AI ethics through storytelling', 'Users', '1000', 'users', 'gameplan_extraction_02b', NOW() - INTERVAL '15 months', NOW()),
  ('huda-ec-content', 'huda-2025', 'Extracurricular', 'Communication', 'Tech Education Content Creator', 'In Transit', 'Medium Impact', 'Creating educational content about AI and computer science for high school students', 'Views', '5000', 'views', 'gameplan_extraction_02b', NOW() - INTERVAL '12 months', NOW()),
  ('huda-ec-cs-club', 'huda-2025', 'Extracurricular', 'Leadership', 'Computer Science Club - President', 'In Transit', 'Medium Impact', 'Leading school CS club, organizing hackathons and coding workshops', 'Members', '45', 'members', 'gameplan_extraction_02b', NOW() - INTERVAL '24 months', NOW())
ON CONFLICT (item_id) DO NOTHING;

-- ========================================
-- Huda's Award Goals (from GamePlan)
-- ========================================

INSERT INTO kb_items (item_id, student_id, item_type, subtype, title_name, tier1_state, tier2_substate, status_detail, source_ref, created_ts, updated_ts) VALUES
  ('huda-award-ncwit', 'huda-2025', 'Goal', 'Award', 'NCWIT Aspirations in Computing Award', 'In Transit', 'Application Submitted', 'Applied for NCWIT with Empowering AI project, 70% win probability based on profile fit', 'gameplan_extraction_02b', NOW() - INTERVAL '2 months', NOW()),
  ('huda-award-congressional', 'huda-2025', 'Goal', 'Award', 'Congressional App Challenge', 'In Transit', 'Planning', 'Preparing Synthoria game submission for Congressional App Challenge, 60% win probability', 'gameplan_extraction_02b', NOW() - INTERVAL '1 month', NOW()),
  ('huda-award-scholastic', 'huda-2025', 'Goal', 'Award', 'Scholastic Art & Writing Awards', 'Planned', 'Not Started', 'Planning to submit creative writing or film work about technology', 'gameplan_extraction_02b', NOW(), NOW()),
  ('huda-award-presidential', 'huda-2025', 'Goal', 'Award', 'Presidential Service Award', 'In Transit', 'Accumulating Hours', 'Accumulating service hours through teaching and community work', 'gameplan_extraction_02b', NOW() - INTERVAL '6 months', NOW())
ON CONFLICT (item_id) DO NOTHING;

-- ========================================
-- Assessment Data (from GamePlan Assessment)
-- ========================================

INSERT INTO kb_items (item_id, student_id, item_type, subtype, title_name, tier1_state, tier2_substate, status_detail, source_ref, created_ts, updated_ts) VALUES
  ('huda-assess-strength-tech', 'huda-2025', 'Assessment', 'Strength', 'Technical Skills - AI/ML Development', 'In Transit', 'High Strength', 'Strong foundation in Python, AI ethics, machine learning concepts', 'gameplan_extraction_01c', NOW() - INTERVAL '18 months', NOW()),
  ('huda-assess-strength-creative', 'huda-2025', 'Assessment', 'Strength', 'Creative Problem Solving', 'In Transit', 'High Strength', 'Ability to blend technology with storytelling and education', 'gameplan_extraction_01c', NOW() - INTERVAL '18 months', NOW()),
  ('huda-assess-gap-awards', 'huda-2025', 'Assessment', 'Gap', 'Awards Recognition', 'In Transit', 'Priority Gap', 'No significant awards yet - must win NCWIT and Congressional App for competitive profile', 'gameplan_extraction_01c', NOW() - INTERVAL '18 months', NOW()),
  ('huda-assess-gap-testing', 'huda-2025', 'Assessment', 'Gap', 'Test Scores', 'In Transit', 'Needs Improvement', 'SAT 1450+ needed for competitive positioning, targeting 1500+', 'gameplan_extraction_01c', NOW() - INTERVAL '6 months', NOW())
ON CONFLICT (item_id) DO NOTHING;

-- ========================================
-- Verification Query
-- ========================================

SELECT
  item_type,
  subtype,
  COUNT(*) as count,
  string_agg(title_name, ', ' ORDER BY title_name) as items
FROM kb_items
WHERE student_id = 'huda-2025'
GROUP BY item_type, subtype
ORDER BY item_type, subtype;

SELECT COUNT(*) as total_kb_items FROM kb_items WHERE student_id = 'huda-2025';

COMMENT ON TABLE kb_items IS 'Universal enumeration table for awards, extracurriculars, programs, and goals';

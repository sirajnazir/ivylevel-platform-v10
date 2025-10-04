-- ================================================================
-- v3.2 GPT-5 Intent Router - Missing SQL Views
-- ================================================================
-- Created: 2025-10-03
-- Purpose: Create v_programs_admits alias (other views already exist)
-- Part of: V3.2_GPT5_INTENT_ROUTER.md implementation
--
-- NOTE: The following views already exist and don't need to be created:
-- - v_awards_won (already exists)
-- - v_gpa_timeline (already exists)
-- - v_programs_final, v_ecs_final, v_transcript_final (already exist)

-- ================================================================
-- v_programs_admits: Summer program admission decisions
-- Alias of v_programs_final for semantic clarity
-- ================================================================
CREATE OR REPLACE VIEW v_programs_admits AS
SELECT
  student_id,
  program_name as title_name,
  provider,
  event_date as occurred_at,
  source_id,
  chip_id,
  chip_table
FROM v_programs_final;

COMMENT ON VIEW v_programs_admits IS 'Summer program admissions (alias of v_programs_final for GPT-5 intent router)';

-- ================================================================
-- Verification Queries (for testing)
-- ================================================================

-- Test v_programs_admits
-- SELECT * FROM v_programs_admits WHERE student_id = 'huda-2025';

-- Test v_awards_won (already exists)
-- SELECT * FROM v_awards_won WHERE student_id = 'huda-2025';

-- Test v_gpa_timeline (already exists)
-- SELECT * FROM v_gpa_timeline WHERE student_id = 'huda-2025';

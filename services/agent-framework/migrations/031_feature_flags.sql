-- Migration: Feature Flags for LangGraph Zero-Downtime Rollout
-- Version: v31.0
-- Date: 2025-11-04
-- Purpose: Enable gradual migration from existing v30 multi-agent system to LangGraph orchestration

-- Enable migration mode to bypass DDL block
SET app.migration = true;

-- ============================================================================
-- Table: feature_flags
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_name VARCHAR(100) NOT NULL,
  student_id TEXT,  -- NULL = global setting, NOT NULL = student-specific override
  enabled BOOLEAN DEFAULT false,
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraint: Either student-specific OR global (not both)
  CONSTRAINT unique_flag_student UNIQUE (flag_name, student_id),
  CONSTRAINT global_or_student CHECK (
    (student_id IS NULL AND rollout_percentage >= 0) OR
    (student_id IS NOT NULL AND enabled IS NOT NULL)
  )
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_feature_flags_name ON feature_flags(flag_name);
CREATE INDEX IF NOT EXISTS idx_feature_flags_student ON feature_flags(student_id) WHERE student_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feature_flags_global ON feature_flags(flag_name) WHERE student_id IS NULL;

-- ============================================================================
-- Initialize: LangGraph orchestration OFF globally (0% rollout)
-- ============================================================================

INSERT INTO feature_flags (flag_name, rollout_percentage)
VALUES ('langgraph_orchestration', 0)
ON CONFLICT (flag_name, student_id) WHERE student_id IS NULL
DO NOTHING;

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE feature_flags IS 'v31.0: Controls gradual rollout of LangGraph orchestration (zero-downtime migration)';
COMMENT ON COLUMN feature_flags.flag_name IS 'Feature flag identifier (e.g., langgraph_orchestration)';
COMMENT ON COLUMN feature_flags.student_id IS 'NULL = global rollout %, NOT NULL = student-specific override';
COMMENT ON COLUMN feature_flags.enabled IS 'Student-specific enable/disable (only used when student_id IS NOT NULL)';
COMMENT ON COLUMN feature_flags.rollout_percentage IS 'Global rollout 0-100%. 0 = all use existing v30 system, 100 = all use LangGraph';

-- ============================================================================
-- Sample Queries for Monitoring and Management
-- ============================================================================

COMMENT ON TABLE feature_flags IS 'v31.0: Feature flags for zero-downtime migration

-- Check current rollout percentage:
SELECT rollout_percentage FROM feature_flags
WHERE flag_name = ''langgraph_orchestration'' AND student_id IS NULL;

-- Enable LangGraph for specific student (testing):
INSERT INTO feature_flags (flag_name, student_id, enabled)
VALUES (''langgraph_orchestration'', ''huda-v26-2025'', true)
ON CONFLICT (flag_name, student_id) DO UPDATE SET enabled = true, updated_at = NOW();

-- Gradually increase rollout (5% → 25% → 50% → 100%):
UPDATE feature_flags
SET rollout_percentage = 5, updated_at = NOW()
WHERE flag_name = ''langgraph_orchestration'' AND student_id IS NULL;

-- Emergency rollback (set to 0% - all traffic back to existing system):
UPDATE feature_flags
SET rollout_percentage = 0, updated_at = NOW()
WHERE flag_name = ''langgraph_orchestration'' AND student_id IS NULL;

-- Check rollout status:
SELECT
  flag_name,
  rollout_percentage AS "Global Rollout %",
  COUNT(*) FILTER (WHERE student_id IS NOT NULL AND enabled = true) AS "Students Enabled",
  COUNT(*) FILTER (WHERE student_id IS NOT NULL AND enabled = false) AS "Students Disabled"
FROM feature_flags
WHERE flag_name = ''langgraph_orchestration''
GROUP BY flag_name, rollout_percentage;
';

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Show initial state (should be 0% rollout)
DO $$
BEGIN
  RAISE NOTICE '=== Feature Flags Migration Complete ===';
  RAISE NOTICE 'Default state: langgraph_orchestration = 0%% rollout (all traffic to existing v30 system)';
  RAISE NOTICE 'To test LangGraph with one student: INSERT INTO feature_flags (flag_name, student_id, enabled) VALUES (''langgraph_orchestration'', ''huda-v26-2025'', true);';
  RAISE NOTICE 'To rollout 5%%: UPDATE feature_flags SET rollout_percentage = 5 WHERE flag_name = ''langgraph_orchestration'' AND student_id IS NULL;';
  RAISE NOTICE 'Emergency rollback: UPDATE feature_flags SET rollout_percentage = 0 WHERE flag_name = ''langgraph_orchestration'' AND student_id IS NULL;';
END $$;

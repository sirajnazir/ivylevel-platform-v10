-- ========================================
-- Migration: Add Weekly Action Plan Column
-- Version: v10.9
-- Date: 2025-10-27
-- Purpose: Add comprehensive action_plan JSONB column to weekly_vitals
-- Safety: Additive only - does NOT modify existing columns
-- ========================================

-- Enable migration mode to allow DDL
SET app.migration = true;

-- Step 1: Add action_plan JSONB column (nullable, no default)
ALTER TABLE weekly_vitals
ADD COLUMN IF NOT EXISTS action_plan JSONB;

-- Step 2: Add comment documenting the column
COMMENT ON COLUMN weekly_vitals.action_plan IS
'Weekly Action Plan & Tasks - Contains outcomes, execution items, tasks, time allocation, critical dates, progress tracking, and context. Spec: docs/guides/WEEKLY_ACTION_PLAN_SPEC_V1.0.md';

-- Step 3: Add GIN index for JSONB performance
CREATE INDEX IF NOT EXISTS idx_weekly_vitals_action_plan
ON weekly_vitals USING gin(action_plan);

-- Step 4: Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_action_plan_outcomes
ON weekly_vitals USING gin((action_plan -> 'outcomes'));

CREATE INDEX IF NOT EXISTS idx_action_plan_execution_items
ON weekly_vitals USING gin((action_plan -> 'execution_items'));

CREATE INDEX IF NOT EXISTS idx_action_plan_tasks
ON weekly_vitals USING gin((action_plan -> 'tasks'));

-- Step 5: Archive bespoke action_items and deadlines columns (rename to _legacy)
-- These columns exist but are mostly empty (55 weeks have empty arrays)
-- We'll keep them for safety but mark as legacy

COMMENT ON COLUMN weekly_vitals.action_items IS
'[LEGACY - Use action_plan instead] Old action_items column - archived 2025-10-27';

COMMENT ON COLUMN weekly_vitals.deadlines IS
'[LEGACY - Use action_plan instead] Old deadlines column - archived 2025-10-27';

-- Step 6: Verify migration
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weekly_vitals' AND column_name = 'action_plan'
  ) THEN
    RAISE NOTICE 'SUCCESS: action_plan column added to weekly_vitals';
  ELSE
    RAISE EXCEPTION 'FAILED: action_plan column not found';
  END IF;
END $$;

-- Step 7: Check index creation
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'weekly_vitals' AND indexname = 'idx_weekly_vitals_action_plan'
  ) THEN
    RAISE NOTICE 'SUCCESS: GIN index created on action_plan';
  ELSE
    RAISE WARNING 'WARNING: GIN index not found on action_plan';
  END IF;
END $$;

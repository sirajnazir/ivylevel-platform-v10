-- Transition migration for Jenny v3
-- This handles the existing schema and creates the v3 tables

-- 1. Rename existing outcomes table if it exists
ALTER TABLE IF EXISTS outcomes RENAME TO outcomes_old;

-- 2. Drop any conflicting constraints
DROP INDEX IF EXISTS idx_outcomes_student_category_period;

-- 3. Now run the v3 migration
\i migration_fixed.sql
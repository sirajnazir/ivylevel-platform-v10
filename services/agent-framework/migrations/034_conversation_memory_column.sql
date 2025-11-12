-- Migration: Add conversation_memory column for v36.0 Universal Conversation Intelligence
-- Version: v36.2
-- Purpose: Store conversation state to prevent infinite loops
-- Created: 2025-11-07

-- Enable migrations
SET app.migration = true;

-- ============================================================================
-- STEP 1: Add conversation_memory column if not exists
-- ============================================================================

DO $$
BEGIN
  -- Check if column exists
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'multiagent_sessions'
    AND column_name = 'conversation_memory'
  ) THEN
    -- Add column
    ALTER TABLE multiagent_sessions
    ADD COLUMN conversation_memory JSONB DEFAULT '{}'::jsonb;

    RAISE NOTICE '✅ Added conversation_memory column';
  ELSE
    RAISE NOTICE '⚠️  conversation_memory column already exists - skipping';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Add GIN index for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_multiagent_sessions_conversation_memory
ON multiagent_sessions USING GIN (conversation_memory);

DO $$
BEGIN
  RAISE NOTICE '✅ Created GIN index on conversation_memory';
END $$;

-- ============================================================================
-- STEP 3: Initialize existing rows with default structure
-- ============================================================================

UPDATE multiagent_sessions
SET conversation_memory = jsonb_build_object(
  'session_id', id,
  'student_id', student_id,
  'turns', '[]'::jsonb,
  'collected_fields', '[]'::jsonb,
  'topic_coverage', '{}'::jsonb,
  'frustration_level', 0,
  'last_updated', NOW()
)
WHERE conversation_memory IS NULL
   OR conversation_memory = '{}'::jsonb
   OR NOT (conversation_memory ? 'turns');

-- Get count of updated rows
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM multiagent_sessions
  WHERE conversation_memory IS NOT NULL
    AND conversation_memory ? 'turns';

  RAISE NOTICE '✅ Initialized % existing sessions with conversation_memory', updated_count;
END $$;

-- ============================================================================
-- STEP 4: Create validation trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_conversation_memory()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure conversation_memory has required structure
  IF NEW.conversation_memory IS NULL THEN
    NEW.conversation_memory = '{}'::jsonb;
  END IF;

  -- Add required fields if missing
  IF NOT (NEW.conversation_memory ? 'turns') THEN
    NEW.conversation_memory = jsonb_set(NEW.conversation_memory, '{turns}', '[]'::jsonb);
  END IF;

  IF NOT (NEW.conversation_memory ? 'collected_fields') THEN
    NEW.conversation_memory = jsonb_set(NEW.conversation_memory, '{collected_fields}', '[]'::jsonb);
  END IF;

  IF NOT (NEW.conversation_memory ? 'topic_coverage') THEN
    NEW.conversation_memory = jsonb_set(NEW.conversation_memory, '{topic_coverage}', '{}'::jsonb);
  END IF;

  IF NOT (NEW.conversation_memory ? 'frustration_level') THEN
    NEW.conversation_memory = jsonb_set(NEW.conversation_memory, '{frustration_level}', '0'::jsonb);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS ensure_conversation_memory_valid ON multiagent_sessions;

-- Create trigger
CREATE TRIGGER ensure_conversation_memory_valid
  BEFORE INSERT OR UPDATE ON multiagent_sessions
  FOR EACH ROW
  EXECUTE FUNCTION validate_conversation_memory();

DO $$
BEGIN
  RAISE NOTICE '✅ Created validation trigger';
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify column exists and show structure
SELECT
  table_name,
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'multiagent_sessions'
  AND column_name = 'conversation_memory';

-- Show sample data
SELECT
  id,
  student_id,
  conversation_memory IS NOT NULL as has_memory,
  jsonb_typeof(conversation_memory) as memory_type,
  conversation_memory ? 'turns' as has_turns,
  conversation_memory ? 'collected_fields' as has_fields
FROM multiagent_sessions
LIMIT 5;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ Migration 034 Complete: conversation_memory column    ║';
  RAISE NOTICE '║                                                            ║';
  RAISE NOTICE '║  v36.0 Universal Conversation Intelligence ready!          ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
END $$;

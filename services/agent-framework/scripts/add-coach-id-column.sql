-- ============================================================================
-- Multi-Coach Infrastructure - Add coach_id column
-- Created: 2025-10-16 (Week 15)
-- Purpose: Enable multi-coach support with data isolation
-- ============================================================================

-- Enable DDL (required by database protection)
SET app.migration = true;

-- Add coach_id column to conversation sessions
ALTER TABLE agent_conversation_sessions
ADD COLUMN coach_id TEXT DEFAULT 'jenny-coach-1';

-- Create index for efficient coach filtering
CREATE INDEX idx_sessions_coach_id ON agent_conversation_sessions(coach_id);

-- Update existing sessions to have default coach_id
UPDATE agent_conversation_sessions
SET coach_id = 'jenny-coach-1'
WHERE coach_id IS NULL;

-- Make coach_id NOT NULL now that all rows have values
ALTER TABLE agent_conversation_sessions
ALTER COLUMN coach_id SET NOT NULL;

-- Add coach_id to turns table for denormalization (faster queries)
ALTER TABLE agent_conversation_turns
ADD COLUMN coach_id TEXT;

-- Update turns with coach_id from their sessions
UPDATE agent_conversation_turns t
SET coach_id = s.coach_id
FROM agent_conversation_sessions s
WHERE t.session_id = s.session_id;

-- Make turns coach_id NOT NULL
ALTER TABLE agent_conversation_turns
ALTER COLUMN coach_id SET NOT NULL;

-- Create index on turns for coach filtering
CREATE INDEX idx_turns_coach_id ON agent_conversation_turns(coach_id);

-- Add coach_id to handoffs table
ALTER TABLE agent_conversation_handoffs
ADD COLUMN coach_id TEXT;

-- Update handoffs with coach_id from sessions
UPDATE agent_conversation_handoffs h
SET coach_id = s.coach_id
FROM agent_conversation_sessions s
WHERE h.session_id = s.session_id;

-- Make handoffs coach_id NOT NULL
ALTER TABLE agent_conversation_handoffs
ALTER COLUMN coach_id SET NOT NULL;

-- Create index on handoffs for coach filtering
CREATE INDEX idx_handoffs_coach_id ON agent_conversation_handoffs(coach_id);

-- Verification queries
SELECT 'agent_conversation_sessions' AS table_name, COUNT(*) AS row_count, COUNT(DISTINCT coach_id) AS unique_coaches
FROM agent_conversation_sessions
UNION ALL
SELECT 'agent_conversation_turns', COUNT(*), COUNT(DISTINCT coach_id)
FROM agent_conversation_turns
UNION ALL
SELECT 'agent_conversation_handoffs', COUNT(*), COUNT(DISTINCT coach_id)
FROM agent_conversation_handoffs;

-- Check indexes
SELECT
  tablename,
  indexname
FROM pg_indexes
WHERE tablename LIKE 'agent_conversation%'
  AND indexname LIKE '%coach%'
ORDER BY tablename, indexname;

SELECT '✅ coach_id column added successfully to all tables!' AS status;

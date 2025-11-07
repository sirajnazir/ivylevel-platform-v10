-- Migration: Add conversation_memory to multiagent_sessions
-- Version: v36.0
-- Created: 2025-11-07
-- Purpose: Universal conversation intelligence state tracking

ALTER TABLE multiagent_sessions
ADD COLUMN IF NOT EXISTS conversation_memory JSONB DEFAULT '{}'::jsonb;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_multiagent_sessions_conversation_memory
ON multiagent_sessions USING GIN (conversation_memory);

-- Add comment
COMMENT ON COLUMN multiagent_sessions.conversation_memory IS
'v36.0: Universal conversation memory state (ConversationMemory) - tracks turns, collected fields, frustration level';

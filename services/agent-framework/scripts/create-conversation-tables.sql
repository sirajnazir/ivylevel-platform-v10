-- ============================================================================
-- Agent Conversation Persistence Schema
-- Created: 2025-10-16 (Week 15)
-- Purpose: Store agent conversation sessions and turns for replay and analytics
-- ============================================================================

-- Enable DDL (required by database protection)
SET app.migration = true;

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS agent_conversation_handoffs CASCADE;
DROP TABLE IF EXISTS agent_conversation_turns CASCADE;
DROP TABLE IF EXISTS agent_conversation_sessions CASCADE;

-- ============================================================================
-- 1. agent_conversation_sessions
-- Stores session metadata and student context
-- ============================================================================

CREATE TABLE agent_conversation_sessions (
  session_id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  student_context JSONB DEFAULT '{}',
  category TEXT,
  resolution_status TEXT DEFAULT 'active' CHECK (resolution_status IN ('active', 'resolved', 'abandoned', 'escalated')),
  satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  started_at TIMESTAMP DEFAULT NOW(),
  last_active_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  turn_count INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  total_cost_usd DECIMAL(10, 6) DEFAULT 0,
  tags TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_sessions_student_id ON agent_conversation_sessions(student_id);
CREATE INDEX idx_sessions_status ON agent_conversation_sessions(resolution_status);
CREATE INDEX idx_sessions_started_at ON agent_conversation_sessions(started_at DESC);
CREATE INDEX idx_sessions_last_active ON agent_conversation_sessions(last_active_at DESC);

-- ============================================================================
-- 2. agent_conversation_turns
-- Stores individual conversation turns
-- ============================================================================

CREATE TABLE agent_conversation_turns (
  turn_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES agent_conversation_sessions(session_id) ON DELETE CASCADE,
  turn_number INTEGER NOT NULL,
  turn_timestamp TIMESTAMP DEFAULT NOW(),
  user_message TEXT NOT NULL,
  user_intent TEXT,
  agent_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  agent_response TEXT NOT NULL,
  response_chips JSONB DEFAULT '[]',
  response_hits JSONB DEFAULT '[]',
  handoff_suggested BOOLEAN DEFAULT FALSE,
  handoff_to_agent TEXT,
  handoff_reason TEXT,
  handoff_executed BOOLEAN DEFAULT FALSE,
  tools_called TEXT[] DEFAULT '{}',
  tool_results JSONB DEFAULT '[]',
  execution_time_ms INTEGER,
  tokens_used INTEGER,
  model_used TEXT,
  error_occurred BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_turns_session_id ON agent_conversation_turns(session_id);
CREATE INDEX idx_turns_agent_id ON agent_conversation_turns(agent_id);
CREATE INDEX idx_turns_timestamp ON agent_conversation_turns(turn_timestamp DESC);
CREATE INDEX idx_turns_handoff ON agent_conversation_turns(handoff_suggested) WHERE handoff_suggested = TRUE;

-- Unique constraint to prevent duplicate turn numbers per session
CREATE UNIQUE INDEX idx_turns_session_turn ON agent_conversation_turns(session_id, turn_number);

-- ============================================================================
-- 3. agent_conversation_handoffs
-- Tracks agent handoffs for analytics
-- ============================================================================

CREATE TABLE agent_conversation_handoffs (
  handoff_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES agent_conversation_sessions(session_id) ON DELETE CASCADE,
  turn_id TEXT NOT NULL REFERENCES agent_conversation_turns(turn_id) ON DELETE CASCADE,
  from_agent_id TEXT NOT NULL,
  to_agent_id TEXT NOT NULL,
  handoff_reason TEXT,
  suggested_at TIMESTAMP DEFAULT NOW(),
  executed_at TIMESTAMP,
  user_accepted BOOLEAN,
  context_transferred JSONB DEFAULT '{}'
);

-- Indexes for analytics
CREATE INDEX idx_handoffs_session_id ON agent_conversation_handoffs(session_id);
CREATE INDEX idx_handoffs_from_agent ON agent_conversation_handoffs(from_agent_id);
CREATE INDEX idx_handoffs_to_agent ON agent_conversation_handoffs(to_agent_id);
CREATE INDEX idx_handoffs_suggested_at ON agent_conversation_handoffs(suggested_at DESC);

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check tables created successfully
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'agent_conversation%'
ORDER BY table_name;

-- Check indexes
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename LIKE 'agent_conversation%'
ORDER BY tablename, indexname;

-- Success message
SELECT '✅ Agent conversation tables created successfully!' AS status;

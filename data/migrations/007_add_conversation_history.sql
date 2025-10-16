-- Migration 007: Add Conversation History Tables
-- Created: 2025-10-16 (Week 10)
-- Purpose: Persist agent conversations for replay and analysis

SET app.migration=true;

-- ==============================================================================
-- Conversation Sessions Table
-- ==============================================================================
-- Stores top-level conversation sessions with metadata
CREATE TABLE IF NOT EXISTS agent_conversation_sessions (
  session_id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,

  -- Session metadata
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,

  -- Session state
  turn_count INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  total_cost_usd DECIMAL(10, 6) NOT NULL DEFAULT 0,

  -- Student context snapshot (for replay)
  student_context JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Session tags and categorization
  tags TEXT[] DEFAULT '{}',
  category TEXT,  -- e.g., 'gameplan', 'college_list', 'essays', etc.

  -- Outcome tracking
  resolution_status TEXT,  -- 'active', 'resolved', 'abandoned', 'escalated'
  satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),

  -- Indexes for common queries
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversation_sessions_student ON agent_conversation_sessions(student_id, started_at DESC);
CREATE INDEX idx_conversation_sessions_status ON agent_conversation_sessions(resolution_status, last_active DESC);
CREATE INDEX idx_conversation_sessions_category ON agent_conversation_sessions(category, started_at DESC);

-- ==============================================================================
-- Conversation Turns Table
-- ==============================================================================
-- Stores individual turns (user message + agent response) in conversations
CREATE TABLE IF NOT EXISTS agent_conversation_turns (
  turn_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES agent_conversation_sessions(session_id) ON DELETE CASCADE,

  -- Turn sequence
  turn_number INTEGER NOT NULL,
  turn_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- User input
  user_message TEXT NOT NULL,
  user_intent TEXT,  -- Detected intent category

  -- Agent execution
  agent_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,

  -- Agent response
  agent_response TEXT NOT NULL,
  response_chips JSONB DEFAULT '[]'::jsonb,  -- Evidence chips
  response_hits JSONB DEFAULT '[]'::jsonb,   -- Raw data hits

  -- Handoff tracking
  handoff_suggested BOOLEAN DEFAULT FALSE,
  handoff_to_agent TEXT,
  handoff_reason TEXT,
  handoff_executed BOOLEAN DEFAULT FALSE,

  -- Tool execution tracking
  tools_called TEXT[] DEFAULT '{}',
  tool_results JSONB DEFAULT '[]'::jsonb,

  -- Performance metrics
  execution_time_ms INTEGER NOT NULL,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  model_used TEXT,

  -- Error tracking
  error_occurred BOOLEAN DEFAULT FALSE,
  error_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversation_turns_session ON agent_conversation_turns(session_id, turn_number);
CREATE INDEX idx_conversation_turns_agent ON agent_conversation_turns(agent_id, turn_timestamp DESC);
CREATE INDEX idx_conversation_turns_handoff ON agent_conversation_turns(handoff_suggested, handoff_executed) WHERE handoff_suggested = TRUE;
CREATE INDEX idx_conversation_turns_errors ON agent_conversation_turns(error_occurred, turn_timestamp DESC) WHERE error_occurred = TRUE;

-- ==============================================================================
-- Agent Handoffs Table
-- ==============================================================================
-- Tracks all agent handoffs for analysis
CREATE TABLE IF NOT EXISTS agent_handoffs (
  handoff_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES agent_conversation_sessions(session_id) ON DELETE CASCADE,
  turn_id TEXT NOT NULL REFERENCES agent_conversation_turns(turn_id) ON DELETE CASCADE,

  -- Handoff details
  from_agent_id TEXT NOT NULL,
  to_agent_id TEXT NOT NULL,
  handoff_reason TEXT NOT NULL,

  -- User decision
  suggested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  executed_at TIMESTAMPTZ,
  user_accepted BOOLEAN,

  -- Context carried over
  context_transferred JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_handoffs_session ON agent_handoffs(session_id, suggested_at);
CREATE INDEX idx_handoffs_agents ON agent_handoffs(from_agent_id, to_agent_id);
CREATE INDEX idx_handoffs_acceptance ON agent_handoffs(user_accepted, suggested_at DESC) WHERE user_accepted IS NOT NULL;

-- ==============================================================================
-- Conversation Analytics View
-- ==============================================================================
-- Real-time analytics for conversation patterns
CREATE OR REPLACE VIEW v_conversation_analytics AS
SELECT
  s.session_id,
  s.student_id,
  s.started_at,
  s.last_active,
  s.ended_at,
  s.turn_count,
  s.total_tokens,
  s.total_cost_usd,
  s.category,
  s.resolution_status,
  s.satisfaction_rating,

  -- Agent usage breakdown
  (
    SELECT jsonb_agg(jsonb_build_object(
      'agent_id', agent_id,
      'agent_name', agent_name,
      'turn_count', COUNT(*)
    ))
    FROM agent_conversation_turns
    WHERE session_id = s.session_id
    GROUP BY agent_id, agent_name
  ) AS agent_usage,

  -- Handoff summary
  (
    SELECT jsonb_build_object(
      'total_suggested', COUNT(*),
      'total_executed', COUNT(*) FILTER (WHERE executed_at IS NOT NULL),
      'acceptance_rate',
        CASE
          WHEN COUNT(*) > 0 THEN
            ROUND(100.0 * COUNT(*) FILTER (WHERE user_accepted = TRUE) / COUNT(*), 2)
          ELSE 0
        END
    )
    FROM agent_handoffs
    WHERE session_id = s.session_id
  ) AS handoff_summary,

  -- Performance metrics
  (
    SELECT jsonb_build_object(
      'avg_response_time_ms', ROUND(AVG(execution_time_ms)),
      'total_tools_called', COUNT(DISTINCT unnest(tools_called)),
      'error_count', COUNT(*) FILTER (WHERE error_occurred = TRUE)
    )
    FROM agent_conversation_turns
    WHERE session_id = s.session_id
  ) AS performance_metrics,

  -- Session duration
  EXTRACT(EPOCH FROM (COALESCE(s.ended_at, NOW()) - s.started_at)) AS duration_seconds

FROM agent_conversation_sessions s;

-- ==============================================================================
-- Agent Performance View
-- ==============================================================================
-- Per-agent performance metrics
CREATE OR REPLACE VIEW v_agent_performance AS
SELECT
  t.agent_id,
  t.agent_name,
  COUNT(DISTINCT t.session_id) AS unique_sessions,
  COUNT(*) AS total_turns,
  AVG(t.execution_time_ms) AS avg_response_time_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t.execution_time_ms) AS median_response_time_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY t.execution_time_ms) AS p95_response_time_ms,
  SUM(t.tokens_used) AS total_tokens,
  COUNT(*) FILTER (WHERE t.error_occurred = TRUE) AS error_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE t.error_occurred = TRUE) / COUNT(*), 2) AS error_rate_pct,

  -- Tool usage
  (
    SELECT COUNT(DISTINCT unnest(tools_called))
    FROM agent_conversation_turns
    WHERE agent_id = t.agent_id
  ) AS unique_tools_used,

  -- Handoff patterns
  (
    SELECT jsonb_build_object(
      'handoffs_suggested', COUNT(*),
      'handoffs_accepted', COUNT(*) FILTER (WHERE user_accepted = TRUE)
    )
    FROM agent_handoffs
    WHERE from_agent_id = t.agent_id
  ) AS handoff_stats,

  -- Time range
  MIN(t.turn_timestamp) AS first_seen,
  MAX(t.turn_timestamp) AS last_seen

FROM agent_conversation_turns t
GROUP BY t.agent_id, t.agent_name;

-- ==============================================================================
-- Session Replay Helper Function
-- ==============================================================================
-- Function to retrieve full conversation history for replay
CREATE OR REPLACE FUNCTION get_conversation_replay(p_session_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'session', (
      SELECT row_to_json(s)
      FROM agent_conversation_sessions s
      WHERE s.session_id = p_session_id
    ),
    'turns', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'turn_number', t.turn_number,
          'timestamp', t.turn_timestamp,
          'user_message', t.user_message,
          'agent_id', t.agent_id,
          'agent_name', t.agent_name,
          'agent_response', t.agent_response,
          'chips', t.response_chips,
          'hits', t.response_hits,
          'tools_called', t.tools_called,
          'execution_time_ms', t.execution_time_ms,
          'handoff', CASE
            WHEN t.handoff_suggested THEN jsonb_build_object(
              'to_agent', t.handoff_to_agent,
              'reason', t.handoff_reason,
              'executed', t.handoff_executed
            )
            ELSE NULL
          END,
          'error', CASE
            WHEN t.error_occurred THEN t.error_message
            ELSE NULL
          END
        )
        ORDER BY t.turn_number
      )
      FROM agent_conversation_turns t
      WHERE t.session_id = p_session_id
    ),
    'handoffs', (
      SELECT jsonb_agg(
        row_to_json(h)
        ORDER BY h.suggested_at
      )
      FROM agent_handoffs h
      WHERE h.session_id = p_session_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ==============================================================================
-- Update Trigger for session last_active
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_session_last_active()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE agent_conversation_sessions
  SET
    last_active = NEW.turn_timestamp,
    turn_count = turn_count + 1,
    total_tokens = total_tokens + COALESCE(NEW.tokens_used, 0),
    updated_at = NOW()
  WHERE session_id = NEW.session_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_session_last_active
AFTER INSERT ON agent_conversation_turns
FOR EACH ROW
EXECUTE FUNCTION update_session_last_active();

-- ==============================================================================
-- Grant Permissions
-- ==============================================================================
-- Grant access to application role (adjust role name as needed)
-- GRANT SELECT, INSERT, UPDATE ON agent_conversation_sessions TO jenny_app_role;
-- GRANT SELECT, INSERT ON agent_conversation_turns TO jenny_app_role;
-- GRANT SELECT, INSERT, UPDATE ON agent_handoffs TO jenny_app_role;
-- GRANT SELECT ON v_conversation_analytics TO jenny_app_role;
-- GRANT SELECT ON v_agent_performance TO jenny_app_role;
-- GRANT EXECUTE ON FUNCTION get_conversation_replay(TEXT) TO jenny_app_role;

-- ==============================================================================
-- Sample Queries
-- ==============================================================================
-- Get recent conversations for a student:
-- SELECT * FROM agent_conversation_sessions
-- WHERE student_id = 'huda-2025'
-- ORDER BY started_at DESC
-- LIMIT 10;

-- Get full conversation replay:
-- SELECT get_conversation_replay('sess_huda-2025_1760644130094');

-- Get agent performance metrics:
-- SELECT * FROM v_agent_performance ORDER BY total_turns DESC;

-- Find conversations with handoffs:
-- SELECT s.*, h.handoff_summary
-- FROM v_conversation_analytics s
-- WHERE (h.handoff_summary->>'total_suggested')::int > 0;

-- Find slow responses:
-- SELECT * FROM agent_conversation_turns
-- WHERE execution_time_ms > 5000
-- ORDER BY execution_time_ms DESC;

COMMIT;

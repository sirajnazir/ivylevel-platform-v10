/**
 * v26.0 MultiAgents Infrastructure Migration
 *
 * Purpose: Enable multi-agent orchestration with session-based state management,
 * real-time intelligence tracing, and conversation history.
 *
 * Features:
 * - MultiAgent sessions with state machine (assessment → gameplan → execution → complete)
 * - Message history with agent metadata and intelligence traces
 * - Intelligence activation tracking with source code mapping
 * - Session analytics and performance metrics
 *
 * Tables:
 * 1. multiagent_sessions - Session state and data packages
 * 2. multiagent_messages - Conversation history per session
 * 3. intelligence_activations - Intelligence execution traces
 *
 * Created: 2025-11-01
 * Version: v26.0
 */

-- Enable migration mode to bypass DDL block
SET app.migration = true;

-- ============================================================================
-- Table 1: multiagent_sessions
-- ============================================================================

CREATE TABLE IF NOT EXISTS multiagent_sessions (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Student reference (v26.0 siloed mode - no foreign key)
  student_id TEXT NOT NULL,

  -- Session metadata
  session_type TEXT NOT NULL CHECK (session_type IN ('onboarding', 'weekly_execution', 'ad_hoc')),
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'paused', 'error')),
  current_phase TEXT CHECK (current_phase IN ('assessment', 'gameplan', 'execution', 'complete')),
  current_agent TEXT, -- e.g., 'assessment-agent-v18', 'gameplan-agent-v18'

  -- Data packages (stored as JSONB for flexibility)
  assessment_package JSONB, -- Output from AssessmentAgent (4 phases)
  gameplan_package JSONB,   -- Output from GamePlanAgent (multi-agent coordination)
  execution_package JSONB,  -- Output from ExecutionAgent (168-hour framework)

  -- Session analytics
  analytics JSONB DEFAULT '{
    "total_messages": 0,
    "total_intelligence_activations": 0,
    "agents_used": [],
    "intelligence_types_triggered": [],
    "total_duration_ms": 0,
    "total_tokens_input": 0,
    "total_tokens_output": 0,
    "total_cost": 0.0
  }'::jsonb,

  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for multiagent_sessions
CREATE INDEX idx_multiagent_sessions_student_id ON multiagent_sessions(student_id);
CREATE INDEX idx_multiagent_sessions_status ON multiagent_sessions(status);
CREATE INDEX idx_multiagent_sessions_current_phase ON multiagent_sessions(current_phase);
CREATE INDEX idx_multiagent_sessions_started_at ON multiagent_sessions(started_at DESC);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_multiagent_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER multiagent_sessions_updated_at_trigger
  BEFORE UPDATE ON multiagent_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_multiagent_sessions_updated_at();

-- ============================================================================
-- Table 2: multiagent_messages
-- ============================================================================

CREATE TABLE IF NOT EXISTS multiagent_messages (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Session reference
  session_id UUID NOT NULL REFERENCES multiagent_sessions(id) ON DELETE CASCADE,

  -- Agent metadata
  agent_id TEXT NOT NULL, -- e.g., 'assessment-agent-v18', 'gameplan-agent-v18'
  role TEXT NOT NULL CHECK (role IN ('user', 'agent', 'system')),

  -- Message content
  content TEXT NOT NULL,

  -- Intelligence metadata
  intelligence_type TEXT, -- e.g., 'TYPE-080', 'TYPE-001', null for user messages
  processing_time INTEGER, -- milliseconds
  confidence NUMERIC(5,2) CHECK (confidence >= 0 AND confidence <= 100), -- 0-100 scale

  -- Structured metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamp
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for multiagent_messages
CREATE INDEX idx_multiagent_messages_session_id ON multiagent_messages(session_id);
CREATE INDEX idx_multiagent_messages_agent_id ON multiagent_messages(agent_id);
CREATE INDEX idx_multiagent_messages_timestamp ON multiagent_messages(timestamp DESC);
CREATE INDEX idx_multiagent_messages_intelligence_type ON multiagent_messages(intelligence_type) WHERE intelligence_type IS NOT NULL;

-- ============================================================================
-- Table 3: intelligence_activations
-- ============================================================================

CREATE TABLE IF NOT EXISTS intelligence_activations (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Session and message references
  session_id UUID NOT NULL REFERENCES multiagent_sessions(id) ON DELETE CASCADE,
  message_id UUID REFERENCES multiagent_messages(id) ON DELETE CASCADE,

  -- Agent metadata
  agent_id TEXT NOT NULL,

  -- Intelligence type metadata
  intelligence_type TEXT NOT NULL, -- e.g., 'TYPE-080', 'TYPE-001'
  version TEXT, -- e.g., 'v20.5', 'v18.1'

  -- Source code traceability
  source_file TEXT, -- e.g., 'services/agent-framework/src/intelligence/types/TYPE-080-FourPhaseAssessmentFlow.ts'
  source_lines TEXT, -- e.g., '145-289'
  training_data TEXT, -- e.g., 'Jenny Session Week 12 (2024-09-15) - Huda Assessment Phase 2'

  -- Execution trace
  execution_steps JSONB, -- Array of step-by-step execution flow
  generated_text TEXT, -- Raw output from intelligence type
  intelligence_mapping JSONB, -- Maps text segments to intelligence components

  -- Model metadata
  model_used TEXT, -- e.g., 'gpt-4o', 'claude-sonnet-3.7'
  tokens_input INTEGER,
  tokens_output INTEGER,
  cost NUMERIC(10,6), -- USD cost

  -- Result metadata
  confidence NUMERIC(5,2) CHECK (confidence >= 0 AND confidence <= 100), -- 0-100 scale
  status TEXT NOT NULL CHECK (status IN ('triggered', 'not_triggered', 'error')),
  error TEXT,

  -- Timestamp and duration
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duration INTEGER -- milliseconds
);

-- Indexes for intelligence_activations
CREATE INDEX idx_intelligence_activations_session_id ON intelligence_activations(session_id);
CREATE INDEX idx_intelligence_activations_message_id ON intelligence_activations(message_id);
CREATE INDEX idx_intelligence_activations_agent_id ON intelligence_activations(agent_id);
CREATE INDEX idx_intelligence_activations_intelligence_type ON intelligence_activations(intelligence_type);
CREATE INDEX idx_intelligence_activations_status ON intelligence_activations(status);
CREATE INDEX idx_intelligence_activations_timestamp ON intelligence_activations(timestamp DESC);

-- ============================================================================
-- Views for analytics
-- ============================================================================

-- View: Recent multiagent sessions with key metrics (v26 siloed - no students table)
CREATE OR REPLACE VIEW v_multiagent_sessions_summary AS
SELECT
  s.id,
  s.student_id,
  s.student_id AS student_name, -- v26 siloed mode - use student_id as name
  s.session_type,
  s.status,
  s.current_phase,
  s.current_agent,
  COUNT(DISTINCT m.id) AS message_count,
  COUNT(DISTINCT ia.id) AS intelligence_activation_count,
  COUNT(DISTINCT ia.intelligence_type) AS unique_intelligence_types,
  s.analytics,
  s.started_at,
  s.completed_at,
  CASE
    WHEN s.completed_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (s.completed_at - s.started_at)) * 1000
    ELSE EXTRACT(EPOCH FROM (NOW() - s.started_at)) * 1000
  END AS duration_ms
FROM multiagent_sessions s
LEFT JOIN multiagent_messages m ON s.id = m.session_id
LEFT JOIN intelligence_activations ia ON s.id = ia.session_id
GROUP BY s.id
ORDER BY s.started_at DESC;

-- View: Intelligence type usage statistics
CREATE OR REPLACE VIEW v_intelligence_type_usage AS
SELECT
  ia.intelligence_type,
  ia.agent_id,
  COUNT(*) AS activation_count,
  COUNT(*) FILTER (WHERE ia.status = 'triggered') AS triggered_count,
  COUNT(*) FILTER (WHERE ia.status = 'not_triggered') AS not_triggered_count,
  COUNT(*) FILTER (WHERE ia.status = 'error') AS error_count,
  ROUND(AVG(ia.confidence), 2) AS avg_confidence,
  ROUND(AVG(ia.duration), 2) AS avg_duration_ms,
  SUM(ia.tokens_input) AS total_tokens_input,
  SUM(ia.tokens_output) AS total_tokens_output,
  ROUND(SUM(ia.cost), 4) AS total_cost_usd,
  MIN(ia.timestamp) AS first_used,
  MAX(ia.timestamp) AS last_used
FROM intelligence_activations ia
GROUP BY ia.intelligence_type, ia.agent_id
ORDER BY activation_count DESC;

-- View: Session conversation flow
CREATE OR REPLACE VIEW v_multiagent_conversation_flow AS
SELECT
  m.id AS message_id,
  m.session_id,
  s.student_id,
  s.session_type,
  s.current_phase,
  m.agent_id,
  m.role,
  m.content,
  m.intelligence_type,
  m.processing_time,
  m.confidence,
  m.timestamp,
  COUNT(ia.id) AS intelligence_activations_count,
  ARRAY_AGG(DISTINCT ia.intelligence_type) FILTER (WHERE ia.intelligence_type IS NOT NULL) AS intelligence_types_used
FROM multiagent_messages m
JOIN multiagent_sessions s ON m.session_id = s.id
LEFT JOIN intelligence_activations ia ON m.id = ia.message_id
GROUP BY m.id, s.student_id, s.session_type, s.current_phase
ORDER BY m.timestamp DESC;

-- ============================================================================
-- Sample queries for v26.0 development and testing
-- ============================================================================

-- Query 1: Get active sessions for a student
-- SELECT * FROM v_multiagent_sessions_summary
-- WHERE student_id = 'huda-2025' AND status = 'in_progress';

-- Query 2: Get conversation history for a session
-- SELECT * FROM v_multiagent_conversation_flow
-- WHERE session_id = 'abc123'
-- ORDER BY timestamp ASC;

-- Query 3: Get intelligence activations for a message
-- SELECT * FROM intelligence_activations
-- WHERE message_id = 'msg123'
-- ORDER BY timestamp ASC;

-- Query 4: Get intelligence type usage statistics
-- SELECT * FROM v_intelligence_type_usage
-- WHERE agent_id = 'assessment-agent-v18'
-- ORDER BY activation_count DESC;

-- Query 5: Get session analytics
-- SELECT
--   session_id,
--   analytics->>'total_messages' AS total_messages,
--   analytics->>'total_intelligence_activations' AS total_activations,
--   analytics->>'agents_used' AS agents_used,
--   analytics->>'total_cost' AS total_cost
-- FROM multiagent_sessions
-- WHERE student_id = 'huda-2025' AND status = 'completed'
-- ORDER BY completed_at DESC;

-- ============================================================================
-- Migration complete
-- ============================================================================

-- Log migration
DO $$
BEGIN
  RAISE NOTICE 'v26.0 MultiAgents Infrastructure Migration Complete';
  RAISE NOTICE 'Tables created: multiagent_sessions, multiagent_messages, intelligence_activations';
  RAISE NOTICE 'Views created: v_multiagent_sessions_summary, v_intelligence_type_usage, v_multiagent_conversation_flow';
END $$;

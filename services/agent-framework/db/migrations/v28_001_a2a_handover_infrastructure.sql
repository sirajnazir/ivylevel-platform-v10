/**
 * v28.0: A2A (Agent-to-Agent) Handover Infrastructure
 *
 * Purpose: Log all agent-to-agent handovers for debugging, analytics, and optimization
 *
 * Created: 2025-11-02
 * Version: v28.0
 */

-- Enable migration mode to bypass DDL block (same as v26.0)
SET app.migration = true;

-- ============================================================================
-- A2A Handover Log Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS a2a_handover_log (
  -- Primary identifiers
  handover_id VARCHAR(255) PRIMARY KEY,
  handover_type VARCHAR(50) NOT NULL, -- 'sync_handoff', 'async_event', 'collaboration'

  -- Routing
  from_agent VARCHAR(100) NOT NULL,
  to_agent VARCHAR(100) NOT NULL,
  session_id VARCHAR(255),
  student_id VARCHAR(255) NOT NULL,

  -- Payload metadata
  domain_payload_type VARCHAR(100) NOT NULL, -- 'assessment_to_gameplan', 'gameplan_to_execution', etc.
  domain_payload JSONB NOT NULL, -- Full domain-specific payload

  -- Fact transfer
  facts_transferred INTEGER DEFAULT 0, -- Number of facts in FactSet
  facts_summary JSONB, -- High-level summary of fact categories

  -- Execution context
  execution_context JSONB, -- Session context, timeline, capabilities

  -- Handover metadata
  handover_metadata JSONB, -- Intelligence types used, confidence, message count, etc.

  -- Result tracking
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  error_message TEXT,
  processing_time_ms INTEGER,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Indexes
  CONSTRAINT a2a_handover_log_status_check CHECK (status IN ('pending', 'completed', 'failed')),
  CONSTRAINT a2a_handover_log_type_check CHECK (handover_type IN ('sync_handoff', 'async_event', 'collaboration'))
);

-- Index for querying by student
CREATE INDEX IF NOT EXISTS idx_a2a_handover_log_student_id ON a2a_handover_log(student_id);

-- Index for querying by session
CREATE INDEX IF NOT EXISTS idx_a2a_handover_log_session_id ON a2a_handover_log(session_id);

-- Index for querying by agent pair
CREATE INDEX IF NOT EXISTS idx_a2a_handover_log_agent_pair ON a2a_handover_log(from_agent, to_agent);

-- Index for querying by type
CREATE INDEX IF NOT EXISTS idx_a2a_handover_log_type ON a2a_handover_log(handover_type);

-- Index for querying by status
CREATE INDEX IF NOT EXISTS idx_a2a_handover_log_status ON a2a_handover_log(status);

-- Index for querying by time
CREATE INDEX IF NOT EXISTS idx_a2a_handover_log_created_at ON a2a_handover_log(created_at DESC);

-- ============================================================================
-- Analytics View: Handover Success Rates
-- ============================================================================

CREATE OR REPLACE VIEW a2a_handover_analytics AS
SELECT
  from_agent,
  to_agent,
  handover_type,
  COUNT(*) AS total_handovers,
  COUNT(*) FILTER (WHERE status = 'completed') AS successful_handovers,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed_handovers,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE status = 'completed') / NULLIF(COUNT(*), 0),
    2
  ) AS success_rate_pct,
  ROUND(AVG(processing_time_ms), 2) AS avg_processing_time_ms,
  ROUND(AVG(facts_transferred), 2) AS avg_facts_transferred
FROM a2a_handover_log
GROUP BY from_agent, to_agent, handover_type
ORDER BY total_handovers DESC;

-- ============================================================================
-- Analytics View: Recent Handovers (Last 100)
-- ============================================================================

CREATE OR REPLACE VIEW a2a_recent_handovers AS
SELECT
  handover_id,
  from_agent,
  to_agent,
  handover_type,
  student_id,
  status,
  facts_transferred,
  processing_time_ms,
  error_message,
  created_at
FROM a2a_handover_log
ORDER BY created_at DESC
LIMIT 100;

-- ============================================================================
-- Analytics View: Student Handover History
-- ============================================================================

CREATE OR REPLACE VIEW a2a_student_handover_history AS
SELECT
  student_id,
  handover_id,
  from_agent,
  to_agent,
  handover_type,
  domain_payload_type,
  status,
  created_at,
  completed_at,
  processing_time_ms
FROM a2a_handover_log
ORDER BY student_id, created_at;

-- ============================================================================
-- Grant Permissions
-- ============================================================================

-- Grant SELECT to read-only analytics users (if exists)
-- GRANT SELECT ON a2a_handover_log TO analytics_user;
-- GRANT SELECT ON a2a_handover_analytics TO analytics_user;
-- GRANT SELECT ON a2a_recent_handovers TO analytics_user;
-- GRANT SELECT ON a2a_student_handover_history TO analytics_user;

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE a2a_handover_log IS 'v28.0: Logs all agent-to-agent handovers for debugging and analytics';
COMMENT ON COLUMN a2a_handover_log.handover_id IS 'Unique identifier for handover (format: a2a_{session_id}_{timestamp})';
COMMENT ON COLUMN a2a_handover_log.handover_type IS 'Type of handover: sync_handoff (immediate), async_event (scheduled), collaboration (consultation)';
COMMENT ON COLUMN a2a_handover_log.domain_payload_type IS 'Discriminator for domain-specific payload type (e.g., assessment_to_gameplan)';
COMMENT ON COLUMN a2a_handover_log.domain_payload IS 'Full domain-specific payload with all handover data';
COMMENT ON COLUMN a2a_handover_log.facts_transferred IS 'Number of facts in FactSet transferred to target agent';
COMMENT ON COLUMN a2a_handover_log.processing_time_ms IS 'Total time taken for handover processing (ms)';
COMMENT ON COLUMN a2a_handover_log.status IS 'Handover status: pending (initializing), completed (success), failed (error)';

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Verify table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'a2a_handover_log') THEN
    RAISE NOTICE 'v28.0: A2A handover infrastructure migration completed successfully';
  ELSE
    RAISE EXCEPTION 'v28.0: A2A handover infrastructure migration FAILED - table not created';
  END IF;
END $$;

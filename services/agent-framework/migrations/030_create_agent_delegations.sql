-- Migration: Create agent_delegations table for async multi-agent coordination
-- Version: v30.2
-- Created: 2025-11-04
-- Purpose: Track async delegation from GamePlan to specialist agents (Awards, ECs)

CREATE TABLE IF NOT EXISTS agent_delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES multiagent_sessions(id) ON DELETE CASCADE,
  delegating_agent VARCHAR(100) NOT NULL,  -- e.g. 'gameplan-agent-v18'
  delegation_id VARCHAR(255) NOT NULL UNIQUE,  -- e.g. 'delegation_[session_id]_[timestamp]'
  delegated_to TEXT[] NOT NULL,  -- ['awards-agent-v18', 'extracurriculars-agent-v18']
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  results JSONB,  -- Specialist agent responses when complete
  metadata JSONB,  -- Additional delegation context (errors, timing, etc.)
  CONSTRAINT valid_delegation_status CHECK (
    (status IN ('pending', 'in_progress') AND completed_at IS NULL) OR
    (status IN ('completed', 'failed') AND completed_at IS NOT NULL)
  )
);

-- Indexes for fast lookups
CREATE INDEX idx_delegations_session ON agent_delegations(session_id);
CREATE INDEX idx_delegations_status ON agent_delegations(status);
CREATE INDEX idx_delegations_delegation_id ON agent_delegations(delegation_id);
CREATE INDEX idx_delegations_created_at ON agent_delegations(created_at DESC);

-- Comments for documentation
COMMENT ON TABLE agent_delegations IS 'v30.2: Tracks async delegation between agents for parallel specialist coordination';
COMMENT ON COLUMN agent_delegations.delegating_agent IS 'Agent that initiated the delegation (e.g. GamePlan Agent)';
COMMENT ON COLUMN agent_delegations.delegated_to IS 'Array of specialist agent IDs that were delegated to';
COMMENT ON COLUMN agent_delegations.status IS 'Current delegation status: pending (queued), in_progress (processing), completed (success), failed (error)';
COMMENT ON COLUMN agent_delegations.results IS 'JSONB containing specialist agent responses: { awards: {...}, extracurriculars: {...} }';
COMMENT ON COLUMN agent_delegations.metadata IS 'Additional context: processing_time_ms, errors, retry_count, etc.';

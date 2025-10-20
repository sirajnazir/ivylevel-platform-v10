-- ============================================================================
-- Fix RLS Policies - Handle empty string from current_setting
-- Created: 2025-10-16 (Week 16)
-- ============================================================================

-- Enable DDL
SET app.migration = true;

-- Drop and recreate policies with better handling of unset context
DROP POLICY IF EXISTS coach_sessions_isolation ON agent_conversation_sessions;
DROP POLICY IF EXISTS coach_turns_isolation ON agent_conversation_turns;
DROP POLICY IF EXISTS coach_handoffs_isolation ON agent_conversation_handoffs;

-- Policy: Coaches can only see their own sessions
-- Block access when app.coach_id is not set (empty string) or doesn't match
CREATE POLICY coach_sessions_isolation ON agent_conversation_sessions
  FOR ALL
  USING (
    current_setting('app.coach_id', true) != ''
    AND coach_id = current_setting('app.coach_id', true)
  )
  WITH CHECK (
    current_setting('app.coach_id', true) != ''
    AND coach_id = current_setting('app.coach_id', true)
  );

-- Policy: Coaches can only see turns from their sessions
CREATE POLICY coach_turns_isolation ON agent_conversation_turns
  FOR ALL
  USING (
    current_setting('app.coach_id', true) != ''
    AND coach_id = current_setting('app.coach_id', true)
  )
  WITH CHECK (
    current_setting('app.coach_id', true) != ''
    AND coach_id = current_setting('app.coach_id', true)
  );

-- Policy: Coaches can only see handoffs from their sessions
CREATE POLICY coach_handoffs_isolation ON agent_conversation_handoffs
  FOR ALL
  USING (
    current_setting('app.coach_id', true) != ''
    AND coach_id = current_setting('app.coach_id', true)
  )
  WITH CHECK (
    current_setting('app.coach_id', true) != ''
    AND coach_id = current_setting('app.coach_id', true)
  );

-- Verification
SELECT tablename, policyname
FROM pg_policies
WHERE tablename LIKE 'agent_conversation%'
ORDER BY tablename;

SELECT '✅ RLS policies fixed successfully!' AS status;

-- ============================================================================
-- Week 16: Row Level Security (RLS) Policies
-- Created: 2025-10-16
-- Purpose: Implement coach-level data isolation for multi-tenant architecture
-- ============================================================================

-- Enable DDL (required by database protection)
SET app.migration = true;

-- ============================================================================
-- Step 1: Enable RLS on all conversation tables
-- FORCE RLS to apply even to superusers (important for testing)
-- ============================================================================

ALTER TABLE agent_conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_conversation_sessions FORCE ROW LEVEL SECURITY;

ALTER TABLE agent_conversation_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_conversation_turns FORCE ROW LEVEL SECURITY;

ALTER TABLE agent_conversation_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_conversation_handoffs FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- Step 2: Create RLS policies for coach isolation
-- ============================================================================

-- Policy: Coaches can only see their own sessions
CREATE POLICY coach_sessions_isolation ON agent_conversation_sessions
  FOR ALL
  USING (coach_id = current_setting('app.coach_id', true))
  WITH CHECK (coach_id = current_setting('app.coach_id', true));

-- Policy: Coaches can only see turns from their sessions
CREATE POLICY coach_turns_isolation ON agent_conversation_turns
  FOR ALL
  USING (coach_id = current_setting('app.coach_id', true))
  WITH CHECK (coach_id = current_setting('app.coach_id', true));

-- Policy: Coaches can only see handoffs from their sessions
CREATE POLICY coach_handoffs_isolation ON agent_conversation_handoffs
  FOR ALL
  USING (coach_id = current_setting('app.coach_id', true))
  WITH CHECK (coach_id = current_setting('app.coach_id', true));

-- ============================================================================
-- Step 3: Grant necessary permissions
-- ============================================================================

-- Ensure the application user can bypass RLS when needed (for admin operations)
-- Note: In production, create separate admin and coach roles

-- For testing: Allow postgres superuser to bypass RLS
-- GRANT ALL ON agent_conversation_sessions TO postgres;
-- GRANT ALL ON agent_conversation_turns TO postgres;
-- GRANT ALL ON agent_conversation_handoffs TO postgres;

-- ============================================================================
-- Step 4: Verification
-- ============================================================================

-- Check RLS is enabled
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename LIKE 'agent_conversation%'
ORDER BY tablename;

-- Check policies exist
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename LIKE 'agent_conversation%'
ORDER BY tablename, policyname;

-- ============================================================================
-- Step 5: Test RLS (Manual verification)
-- ============================================================================

-- Test Case 1: Set coach_id and verify we only see that coach's data
-- SET LOCAL app.coach_id = 'jenny-coach-1';
-- SELECT COUNT(*) FROM agent_conversation_sessions;  -- Should see jenny-coach-1 sessions

-- Test Case 2: Set different coach_id and verify isolation
-- SET LOCAL app.coach_id = 'coach-2';
-- SELECT COUNT(*) FROM agent_conversation_sessions;  -- Should see 0 (no coach-2 sessions yet)

-- Test Case 3: Without setting coach_id, should see nothing (RLS blocks)
-- RESET app.coach_id;
-- SELECT COUNT(*) FROM agent_conversation_sessions;  -- Should see 0

SELECT '✅ RLS policies enabled successfully!' AS status;

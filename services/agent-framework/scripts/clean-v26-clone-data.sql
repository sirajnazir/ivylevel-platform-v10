-- Clean ALL v26 clone data for fresh testing
-- Run this before each test session to ensure clean baseline
--
-- Usage: psql $DATABASE_URL -f scripts/clean-v26-clone-data.sql

BEGIN;

-- 1. Delete intelligence activations for clone students
DELETE FROM intelligence_activations WHERE student_id LIKE '%v26%';

-- 2. Delete multiagent messages for clone student sessions
DELETE FROM multiagent_messages WHERE session_id IN (
  SELECT id FROM multiagent_sessions WHERE student_id LIKE '%v26%'
);

-- 3. Delete multiagent sessions for clone students
DELETE FROM multiagent_sessions WHERE student_id LIKE '%v26%';

-- 4. Delete kb_items (facts) for clone students
DELETE FROM kb_items WHERE student_id LIKE '%v26%';

-- 5. Reset any student profile metadata for clone students (if table exists)
-- DELETE FROM students WHERE student_id LIKE '%v26%';

COMMIT;

-- Verify cleanup
SELECT 'intelligence_activations' as table_name, COUNT(*) as remaining FROM intelligence_activations WHERE student_id LIKE '%v26%'
UNION ALL
SELECT 'multiagent_messages', COUNT(*) FROM multiagent_messages WHERE session_id IN (SELECT id FROM multiagent_sessions WHERE student_id LIKE '%v26%')
UNION ALL
SELECT 'multiagent_sessions', COUNT(*) FROM multiagent_sessions WHERE student_id LIKE '%v26%'
UNION ALL
SELECT 'kb_items', COUNT(*) FROM kb_items WHERE student_id LIKE '%v26%';

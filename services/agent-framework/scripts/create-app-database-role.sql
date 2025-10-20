-- ============================================================================
-- Create Non-Superuser Application Database Role
-- Purpose: RLS policies work properly with non-superuser roles
-- Created: 2025-10-16 (Week 16 - Multi-Coach Production Prep)
-- ============================================================================

-- Enable DDL
SET app.migration = true;

-- ============================================================================
-- Step 1: Create application role (if not exists)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ivylevel_app') THEN
    CREATE ROLE ivylevel_app WITH LOGIN PASSWORD 'ivylevel_app_password_change_in_prod';
    RAISE NOTICE 'Created role: ivylevel_app';
  ELSE
    RAISE NOTICE 'Role ivylevel_app already exists';
  END IF;
END
$$;

-- ============================================================================
-- Step 2: Grant necessary permissions
-- ============================================================================

-- Grant CONNECT to database
GRANT CONNECT ON DATABASE ivylevel TO ivylevel_app;

-- Grant USAGE on schema
GRANT USAGE ON SCHEMA public TO ivylevel_app;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ivylevel_app;

-- Grant sequence permissions (for auto-increment IDs if any)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ivylevel_app;

-- Make sure future tables also get permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ivylevel_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO ivylevel_app;

-- ============================================================================
-- Step 3: Verify permissions
-- ============================================================================

-- Check role attributes
SELECT
  rolname,
  rolsuper,
  rolcreaterole,
  rolcreatedb,
  rolcanlogin
FROM pg_roles
WHERE rolname = 'ivylevel_app';

-- Check table permissions
SELECT
  grantee,
  table_schema,
  table_name,
  privilege_type
FROM information_schema.table_privileges
WHERE grantee = 'ivylevel_app'
  AND table_schema = 'public'
  AND table_name LIKE 'agent_conversation%'
ORDER BY table_name, privilege_type;

-- ============================================================================
-- Step 4: Test RLS with new role (manual verification)
-- ============================================================================

-- Instructions for manual testing:
-- 1. Connect as ivylevel_app:
--    psql "postgresql://ivylevel_app:ivylevel_app_password_change_in_prod@localhost:5432/ivylevel"
--
-- 2. Test RLS enforcement:
--    BEGIN;
--    SET LOCAL app.coach_id = 'jenny-coach-1';
--    SELECT COUNT(*) FROM agent_conversation_sessions WHERE coach_id = 'jenny-coach-1';
--    -- Should see only jenny-coach-1 sessions
--    COMMIT;
--
-- 3. Test without coach context:
--    SELECT COUNT(*) FROM agent_conversation_sessions;
--    -- Should see 0 rows (RLS blocks all without context)

SELECT '✅ Application role created successfully!' AS status;
SELECT '⚠️  IMPORTANT: Change password in production!' AS warning;
SELECT 'Connection string: postgresql://ivylevel_app:PASSWORD@localhost:5432/ivylevel' AS connection_string;

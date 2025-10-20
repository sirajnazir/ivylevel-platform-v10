-- ============================================================================
-- Add Password Authentication to Coaches Table
-- Created: 2025-10-16
-- Purpose: Enable self-hosted authentication for coaches
-- ============================================================================

-- Enable DDL
SET app.migration = true;

-- Add password_hash column
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Add password-related fields for security
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS password_updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;

-- Create index for email lookups (authentication)
CREATE INDEX IF NOT EXISTS idx_coaches_email ON coaches(email);

-- Add some test passwords (CHANGE IN PRODUCTION!)
-- Password: "IvyLevel2024!" (bcrypt hashed)
-- Generated with: bcrypt.hash('IvyLevel2024!', 10)

UPDATE coaches
SET password_hash = '$2b$10$rYvLMNOvZtGLDkJJvjN0qeqKCxB0B8kJjIqE4xLO7KkLVGJ4yQ8sK',
    password_updated_at = NOW()
WHERE email = 'jenny@ivylevel.com' AND password_hash IS NULL;

-- Verify setup
SELECT
  coach_id,
  email,
  name,
  CASE
    WHEN password_hash IS NOT NULL THEN '✓ Password set'
    ELSE '✗ No password'
  END as password_status,
  is_active
FROM coaches
ORDER BY coach_id;

SELECT '✅ Password authentication enabled for coaches!' AS status;
SELECT '⚠️  Default password: IvyLevel2024! (CHANGE IN PRODUCTION!)' AS warning;

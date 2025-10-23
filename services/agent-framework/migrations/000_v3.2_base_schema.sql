-- Migration 000: v3.2 Base Schema
-- Date: 2025-10-23
-- Purpose: Create foundational tables required for v3.2 (students, feature_defs, feature_snapshots)
-- Version: v3.2.0-base

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- STUDENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS students (
  student_id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  graduation_year INTEGER NOT NULL,
  high_school TEXT,
  target_major TEXT,
  primary_coach_id TEXT,  -- References coaches(coach_id) - string type
  assessment_mode TEXT DEFAULT 'interactive' CHECK (assessment_mode IN ('interactive', 'simulated')),
  parent_student_id TEXT REFERENCES students(student_id),  -- Link to "template" student
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_students_email ON students(email);
CREATE INDEX idx_students_coach ON students(primary_coach_id);
CREATE INDEX idx_students_parent ON students(parent_student_id);

COMMENT ON TABLE students IS 'Student profiles with assessment mode preferences';
COMMENT ON COLUMN students.assessment_mode IS 'interactive = real coaching dialogue, simulated = autonomous fast execution';
COMMENT ON COLUMN students.parent_student_id IS 'If this is a "new" student, link to the historical student they are based on (e.g., huda-2025)';

-- ============================================================================
-- FEATURE DEFINITIONS (IvyScore/Readiness Features)
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_defs (
  feature_id TEXT PRIMARY KEY,  -- 'sat_total', 'ec_leadership_count', 'award_national_count', 'gpa_weighted'
  domain TEXT NOT NULL,  -- 'testing' | 'academics' | 'ecs' | 'awards' | 'narrative'
  label TEXT NOT NULL,
  scale_max NUMERIC DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feature_defs_domain ON feature_defs(domain);

COMMENT ON TABLE feature_defs IS 'IvyScore feature definitions (academic, testing, ECs, awards, narrative)';

-- ============================================================================
-- FEATURE SNAPSHOTS (IvyScore/Readiness System)
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_snapshots (
  snapshot_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  as_of DATE NOT NULL,
  rubric_id TEXT NOT NULL,
  engine TEXT DEFAULT 'sql_v1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, rubric_id, as_of, engine)
);

CREATE INDEX idx_feature_snapshots_student ON feature_snapshots(student_id);
CREATE INDEX idx_feature_snapshots_as_of ON feature_snapshots(as_of DESC);

COMMENT ON TABLE feature_snapshots IS 'IvyScore/readiness snapshots computed at a point in time';

CREATE TABLE IF NOT EXISTS feature_snapshot_values (
  snapshot_id UUID NOT NULL REFERENCES feature_snapshots(snapshot_id) ON DELETE CASCADE,
  feature_id TEXT NOT NULL REFERENCES feature_defs(feature_id),
  value NUMERIC,
  PRIMARY KEY (snapshot_id, feature_id)
);

CREATE INDEX idx_feature_snapshot_values_feature ON feature_snapshot_values(feature_id);

COMMENT ON TABLE feature_snapshot_values IS 'Individual feature values for a snapshot';

-- ============================================================================
-- SEED DATA: Create test student (huda-2025)
-- ============================================================================

-- Create "Old Huda" student (simulated mode)
INSERT INTO students (
  student_id,
  email,
  password_hash,
  full_name,
  graduation_year,
  high_school,
  target_major,
  primary_coach_id,
  assessment_mode
) VALUES (
  'huda-2025',
  'huda@test.com',
  crypt('huda123', gen_salt('bf')),  -- Password: huda123
  'Huda Ahmed',
  2025,
  'Suncoast High School',
  'Computer Science',
  'jenny',
  'simulated'
) ON CONFLICT (student_id) DO NOTHING;

-- Create "New Huda" student (interactive mode, based on Old Huda)
INSERT INTO students (
  student_id,
  email,
  password_hash,
  full_name,
  graduation_year,
  high_school,
  target_major,
  primary_coach_id,
  assessment_mode,
  parent_student_id
) VALUES (
  'huda-2025-new',
  'newhuda@test.com',
  crypt('newhuda123', gen_salt('bf')),  -- Password: newhuda123
  'Huda New',
  2029,
  'Test High School',
  'Computer Science',
  'jenny',
  'interactive',
  'huda-2025'
) ON CONFLICT (student_id) DO UPDATE SET
  assessment_mode = 'interactive',
  parent_student_id = 'huda-2025',
  primary_coach_id = 'jenny';

-- ============================================================================
-- SEED DATA: Feature definitions
-- ============================================================================

-- Academic features
INSERT INTO feature_defs (feature_id, domain, label, scale_max) VALUES
  ('gpa_weighted', 'academics', 'Weighted GPA', 5.0),
  ('gpa_unweighted', 'academics', 'Unweighted GPA', 4.0),
  ('class_rank', 'academics', 'Class Rank Percentile', 100),
  ('course_rigor', 'academics', 'Course Rigor Score', 100)
ON CONFLICT (feature_id) DO NOTHING;

-- Testing features
INSERT INTO feature_defs (feature_id, domain, label, scale_max) VALUES
  ('sat_total', 'testing', 'SAT Total Score', 1600),
  ('sat_math', 'testing', 'SAT Math', 800),
  ('sat_ebrw', 'testing', 'SAT Evidence-Based Reading and Writing', 800),
  ('act_composite', 'testing', 'ACT Composite', 36),
  ('ap_count', 'testing', 'AP Exams Count', 20),
  ('ap_avg_score', 'testing', 'AP Average Score', 5)
ON CONFLICT (feature_id) DO NOTHING;

-- EC features
INSERT INTO feature_defs (feature_id, domain, label, scale_max) VALUES
  ('ec_leadership_count', 'ecs', 'Leadership Positions Count', 10),
  ('ec_hours_total', 'ecs', 'Total EC Hours', 2000),
  ('ec_depth_score', 'ecs', 'EC Depth Score', 100)
ON CONFLICT (feature_id) DO NOTHING;

-- Award features
INSERT INTO feature_defs (feature_id, domain, label, scale_max) VALUES
  ('award_national_count', 'awards', 'National Awards Count', 10),
  ('award_state_count', 'awards', 'State Awards Count', 10),
  ('award_regional_count', 'awards', 'Regional Awards Count', 10)
ON CONFLICT (feature_id) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'students' AS table_name, COUNT(*) AS row_count FROM students
UNION ALL
SELECT 'feature_defs', COUNT(*) FROM feature_defs
UNION ALL
SELECT 'feature_snapshots', COUNT(*) FROM feature_snapshots;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Migration 000 creates:
-- - students table with assessment_mode and parent_student_id
-- - feature_defs table for IvyScore features
-- - feature_snapshots + feature_snapshot_values for readiness snapshots
-- - Seed data: huda-2025 (simulated), huda-2025-new (interactive)
-- - Seed data: 19 feature definitions (academic, testing, ECs, awards)
--
-- Next: Run migrations 006, 007 to complete v3.2 infrastructure
-- ============================================================================

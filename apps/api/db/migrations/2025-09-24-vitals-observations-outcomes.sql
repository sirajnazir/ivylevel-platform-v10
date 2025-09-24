-- Student state to store vitals JSON
CREATE TABLE IF NOT EXISTS student_state (
  student_id TEXT PRIMARY KEY,
  vitals JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Observations table for tracking student events
CREATE TABLE IF NOT EXISTS observations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  student_id TEXT NOT NULL,
  kind TEXT NOT NULL, -- "SAT" | "GPA" | "ACTIVITY" | "AWARD" | "SUMMER" | "WELLNESS" | "ESSAY" | "APP" | "TRAIT" | "APPS"
  subtype TEXT, -- e.g., "SAT.final", "Synthoria.studentsReached"
  value JSONB NOT NULL, -- payload
  source TEXT NOT NULL, -- file/link or "coach_note"
  at TIMESTAMP NOT NULL, -- event time
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_observations_student_kind_subtype_at ON observations(student_id, kind, subtype, at);

-- Outcomes table for tracking transformation metrics
CREATE TABLE IF NOT EXISTS outcomes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  student_id TEXT NOT NULL,
  category TEXT NOT NULL, -- "ACADEMICS" | "ACTIVITIES" | "AWARDS" | "SUMMER" | "TRANSFORMATION"
  name TEXT NOT NULL,
  metrics JSONB NOT NULL,
  period TEXT, -- "Wk-26", "Q3-2024"
  evidence TEXT[] DEFAULT '{}', -- KB links/ids for auditability
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outcomes_student_category_period ON outcomes(student_id, category, period);
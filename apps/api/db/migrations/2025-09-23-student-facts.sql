-- canonical facts (fast lookup for things like SAT_FINAL, submission dates, etc.)
CREATE TABLE IF NOT EXISTS student_facts (
  id SERIAL PRIMARY KEY,
  student_id TEXT NOT NULL,
  fact_key TEXT NOT NULL,
  fact_value TEXT NOT NULL,
  fact_when TIMESTAMP NULL,
  provenance_chip_id TEXT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_student_facts_student_key ON student_facts(student_id, fact_key);

-- lightweight policy memory (what works for me)
CREATE TABLE IF NOT EXISTS student_policy_memory (
  id SERIAL PRIMARY KEY,
  student_id TEXT NOT NULL,
  memory_key TEXT NOT NULL,        -- e.g., "motiv_style", "identity_arc"
  memory_value JSONB NOT NULL,     -- structured blob
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_policy_memory_student_key ON student_policy_memory(student_id, memory_key);
-- Canon registry (the right doc per intent)
CREATE TABLE IF NOT EXISTS canon (
  key TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  source_type TEXT NOT NULL,   -- "APP-DOC"|"EXEC-INTEL"|"TRANS-INTEL"|"IMSG-INTEL"|"GAMEPLAN"
  source_title TEXT NOT NULL,
  section TEXT,
  jtbd_id TEXT,
  drive_link TEXT,
  date_range TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for efficient lookups by student
CREATE INDEX IF NOT EXISTS idx_canon_student_id ON canon(student_id);

-- Index for source type filtering
CREATE INDEX IF NOT EXISTS idx_canon_source_type ON canon(source_type);
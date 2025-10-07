-- v5.4 KB Schema (future-proof, contributor-ready)
-- Run once to create/update schema

CREATE TABLE IF NOT EXISTS kb_sources (
  source_id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  meta JSONB
);

CREATE TABLE IF NOT EXISTS kb_docs (
  doc_id TEXT PRIMARY KEY,
  student_id TEXT,
  source_kind TEXT CHECK (source_kind IN ('TRANS-INTEL','EXEC-INTEL','IMSG-INTEL','DOCX-RECOVERED','RAW','OTHER')),
  phase TEXT,
  week INT,
  doc_date DATE,
  title TEXT,
  path TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- v5.4 chip definition (future-proof + contributor-ready)
CREATE TABLE IF NOT EXISTS kb_chips (
  chip_id TEXT PRIMARY KEY,
  content_hash TEXT UNIQUE,
  doc_id TEXT REFERENCES kb_docs(doc_id) ON DELETE CASCADE,
  chip_type TEXT CHECK (chip_type IN ('tactic','micro_moment','jtbd','framework','reflection','success_path','style')),
  text TEXT NOT NULL,
  tokens INT,
  student_id TEXT,
  source_kind TEXT,
  phase TEXT,
  week INT,
  chip_date DATE,
  award TEXT,
  activity TEXT,
  framework TEXT,
  metrics TEXT[] DEFAULT '{}',
  confidence NUMERIC,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_kb_chips_doc ON kb_chips(doc_id);
CREATE INDEX IF NOT EXISTS idx_kb_chips_type ON kb_chips(chip_type);
CREATE INDEX IF NOT EXISTS idx_kb_chips_student ON kb_chips(student_id);
CREATE INDEX IF NOT EXISTS idx_kb_chips_award ON kb_chips(award) WHERE award IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kb_chips_framework ON kb_chips(framework) WHERE framework IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kb_chips_date ON kb_chips(chip_date) WHERE chip_date IS NOT NULL;

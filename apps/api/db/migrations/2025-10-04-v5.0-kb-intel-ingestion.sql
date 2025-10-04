-- v5.0 KB + LLM Intel Ingestion Schema
-- Date: 2025-10-04
-- Purpose: Store normalized intel chips from Drive INTEL JSONs for coach-like reasoning

-- 1) Source docs registry (dedup + provenance)
CREATE TABLE IF NOT EXISTS kb_docs (
  doc_id           TEXT PRIMARY KEY,
  source_system    TEXT NOT NULL,  -- "gdrive"
  drive_file_id    TEXT NOT NULL,
  drive_path       TEXT,           -- folder path string
  filename         TEXT NOT NULL,
  mime_type        TEXT,
  student_id       TEXT,           -- e.g., 'huda-2025'
  phase            TEXT,           -- P1..P5 if available
  domain           TEXT,           -- 'sessions' | 'execution' | 'imessage' | 'gameplan'
  dt_anchor        TIMESTAMPTZ,    -- parsed from filename if present
  sha256           TEXT NOT NULL,
  meta_json        JSONB DEFAULT '{}'::jsonb,
  created_ts       TIMESTAMPTZ DEFAULT now(),
  UNIQUE (drive_file_id, sha256)
);

CREATE INDEX IF NOT EXISTS idx_kb_docs_student ON kb_docs(student_id);
CREATE INDEX IF NOT EXISTS idx_kb_docs_domain ON kb_docs(domain);
CREATE INDEX IF NOT EXISTS idx_kb_docs_dt_anchor ON kb_docs(dt_anchor);

-- 2) Normalized intel chips (seven families)
CREATE TABLE IF NOT EXISTS kb_chips (
  chip_id          TEXT PRIMARY KEY,     -- deterministic hash
  doc_id           TEXT NOT NULL REFERENCES kb_docs(doc_id) ON DELETE CASCADE,
  student_id       TEXT NOT NULL,
  chip_type        TEXT NOT NULL CHECK (chip_type IN (
                     'jtbd','tactic','micro_moment','framework','reflection','success_path','style'
                   )),
  title            TEXT,
  summary          TEXT,
  content_json     JSONB NOT NULL,       -- normalized payload
  tokens_est       INT,
  started_at       TIMESTAMPTZ,          -- optional temporal anchor
  ended_at         TIMESTAMPTZ,
  tags             TEXT[],               -- e.g. ['NCWIT','essay','168']
  created_ts       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kb_chips_student ON kb_chips(student_id);
CREATE INDEX IF NOT EXISTS idx_kb_chips_type ON kb_chips(chip_type);
CREATE INDEX IF NOT EXISTS idx_kb_chips_tags ON kb_chips USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_kb_chips_temporal ON kb_chips(student_id, ended_at DESC NULLS LAST, started_at DESC NULLS LAST);

-- 3) Cross-links (chips↔vitals/awards/apps)
CREATE TABLE IF NOT EXISTS kb_chip_links (
  chip_id          TEXT NOT NULL REFERENCES kb_chips(chip_id) ON DELETE CASCADE,
  link_type        TEXT NOT NULL,        -- 'award','program','ec','application','essay','factor'
  link_key         TEXT NOT NULL,        -- e.g. 'NCWIT', 'UNC App', 'SAT', 'IvyReady:testing'
  PRIMARY KEY (chip_id, link_type, link_key)
);

CREATE INDEX IF NOT EXISTS idx_kb_chip_links_type_key ON kb_chip_links(link_type, link_key);

-- 4) Embeddings (stored as JSONB for FAISS external index)
CREATE TABLE IF NOT EXISTS kb_embeddings (
  chip_id          TEXT PRIMARY KEY REFERENCES kb_chips(chip_id) ON DELETE CASCADE,
  embed_model      TEXT NOT NULL,        -- e.g., 'text-embedding-3-large'
  embedding_dims   INT NOT NULL,         -- 3072 for text-embedding-3-large
  embedding_json   JSONB NOT NULL,       -- stored as array for export to FAISS
  created_ts       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kb_embeddings_model ON kb_embeddings(embed_model);

-- 5) Scanner watermark per folder (optional for incremental sync)
CREATE TABLE IF NOT EXISTS kb_scan_cursors (
  source_system    TEXT PRIMARY KEY,     -- 'gdrive_sessions', 'gdrive_exec', etc.
  last_sync_ts     TIMESTAMPTZ,
  last_cursor      TEXT
);

-- 6) Retrieval views
CREATE OR REPLACE VIEW v_kb_recent AS
SELECT
  c.chip_id,
  c.student_id,
  c.chip_type,
  c.title,
  c.summary,
  c.tags,
  c.started_at,
  c.ended_at,
  c.content_json,
  d.filename,
  d.domain,
  d.dt_anchor,
  d.drive_file_id,
  COALESCE(c.ended_at, c.started_at, d.dt_anchor, c.created_ts) as sort_ts
FROM kb_chips c
JOIN kb_docs d ON d.doc_id = c.doc_id
ORDER BY sort_ts DESC NULLS LAST;

COMMENT ON VIEW v_kb_recent IS 'Recent KB chips ordered by temporal anchor (ended_at > started_at > dt_anchor > created_ts)';

-- 7) Batch fetch for FAISS results
COMMENT ON TABLE kb_embeddings IS 'Embeddings stored as JSONB; FAISS index is maintained externally';

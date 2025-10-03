-- Enable UUID if not already
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Root trace per request
CREATE TABLE IF NOT EXISTS query_traces (
  trace_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id      TEXT NOT NULL,
  q               TEXT NOT NULL,
  routed_mode     TEXT,                 -- facts_first | rag_first | mixed
  llm_model       TEXT,
  status          TEXT,                 -- ok | error
  error_message   TEXT,
  total_ms        INTEGER,
  prompt_tokens   INTEGER,
  completion_tokens INTEGER,
  cost_usd        NUMERIC(10,6),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_query_traces_student_created
  ON query_traces (student_id, created_at DESC);

-- Fine-grained steps
CREATE TABLE IF NOT EXISTS query_trace_events (
  id            BIGSERIAL PRIMARY KEY,
  trace_id      UUID NOT NULL REFERENCES query_traces(trace_id) ON DELETE CASCADE,
  phase         TEXT NOT NULL,          -- received|vitals|rewrite|hybrid.search|pinecone|rerank|evidence|compose.start|compose.end|responded|error
  ts            TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_ms   INTEGER,
  success       BOOLEAN,
  payload       JSONB                   -- redacted details
);

CREATE INDEX IF NOT EXISTS idx_qte_trace_ts ON query_trace_events(trace_id, ts);

-- Optional: artifacts (big blobs kept separate)
CREATE TABLE IF NOT EXISTS query_trace_artifacts (
  id        BIGSERIAL PRIMARY KEY,
  trace_id  UUID NOT NULL REFERENCES query_traces(trace_id) ON DELETE CASCADE,
  kind      TEXT NOT NULL,              -- rewritten_query|vitals|jtbd_hits|interaction_hits|chips|answer_preview
  content   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
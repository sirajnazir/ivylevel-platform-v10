-- Materialized views for FTS (refresh after ETL)
CREATE MATERIALIZED VIEW IF NOT EXISTS jtbd_fts AS
SELECT
  jtbd_id AS id,
  (coalesce(jtbd_title,'') || ' ' || coalesce(synopsis,'')) AS text,
  json_build_object('student_id', student_id, 'jtbd_id', jtbd_id, 'phase', phase, 'domain', domain) AS metadata,
  to_tsvector('english', coalesce(jtbd_title,'') || ' ' || coalesce(synopsis,'')) AS tsv
FROM jtbd;

CREATE INDEX IF NOT EXISTS jtbd_fts_gin ON jtbd_fts USING GIN(tsv);

CREATE MATERIALIZED VIEW IF NOT EXISTS interactions_fts AS
SELECT
  snippet_id AS id,
  (coalesce(user_ask,'') || ' ' || coalesce(jenny_reply,'')) AS text,
  json_build_object('student_id', student_id, 'jtbd_id', jtbd_id, 'tactic_name', tactic_name, 'framework', framework, 'occurred_at', occurred_at) AS metadata,
  to_tsvector('english', coalesce(user_ask,'') || ' ' || coalesce(jenny_reply,'')) AS tsv
FROM interactions;

CREATE INDEX IF NOT EXISTS interactions_fts_gin ON interactions_fts USING GIN(tsv);

-- Refresh helpers
CREATE OR REPLACE FUNCTION refresh_fts() RETURNS void AS $
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY jtbd_fts;
  REFRESH MATERIALIZED VIEW CONCURRENTLY interactions_fts;
END;
$ LANGUAGE plpgsql;
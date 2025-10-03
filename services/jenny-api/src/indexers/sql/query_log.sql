-- Query logging for observability
CREATE TABLE IF NOT EXISTS query_log(
  id bigserial PRIMARY KEY,
  ts timestamptz default now(),
  route text, 
  student_id text, 
  q text,
  latency_ms int, 
  hits int, 
  chips int, 
  index_name text
);

CREATE INDEX IF NOT EXISTS query_log_ts ON query_log(ts DESC);

-- Cleanup old logs (keep 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_logs() RETURNS void AS $$
BEGIN
  DELETE FROM query_log WHERE ts < now() - interval '7 days';
END;
$$ LANGUAGE plpgsql;
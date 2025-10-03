-- Query Traces Schema for Deep Tracing
-- This enables end-to-end tracing of every query through the Jenny v3 system

-- Main trace table - one row per user query
CREATE TABLE IF NOT EXISTS query_traces (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id              text NOT NULL,
  student_id              text NOT NULL,
  message                 text NOT NULL,
  intent                  text, -- 'fact_query' or 'general_query'
  detected_fact_kinds     text[], -- For fact queries, which kinds were detected
  start_time              timestamptz NOT NULL DEFAULT now(),
  end_time                timestamptz,
  duration_ms             integer GENERATED ALWAYS AS (
    CASE 
      WHEN end_time IS NOT NULL 
      THEN EXTRACT(MILLISECONDS FROM (end_time - start_time))::integer
      ELSE NULL 
    END
  ) STORED,
  final_answer            text,
  error                   text,
  model_used              text,
  tokens_used             jsonb, -- {prompt: n, completion: n, total: n}
  created_at              timestamptz NOT NULL DEFAULT now()
);

-- Trace events - detailed steps within each trace
CREATE TABLE IF NOT EXISTS query_trace_events (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id                uuid NOT NULL REFERENCES query_traces(id) ON DELETE CASCADE,
  sequence                integer NOT NULL, -- Order of events
  component               text NOT NULL, -- e.g., 'orchestrator', 'retriever', 'composer'
  operation               text NOT NULL, -- e.g., 'intent_detection', 'pinecone_search', 'openai_completion'
  start_time              timestamptz NOT NULL DEFAULT now(),
  end_time                timestamptz,
  duration_ms             integer GENERATED ALWAYS AS (
    CASE 
      WHEN end_time IS NOT NULL 
      THEN EXTRACT(MILLISECONDS FROM (end_time - start_time))::integer
      ELSE NULL 
    END
  ) STORED,
  
  -- 3P API call details
  api_provider            text, -- 'pinecone', 'openai', 'cohere', 'postgres'
  api_method              text, -- 'query', 'completion', 'rerank', etc.
  api_request             jsonb, -- Sanitized request (no keys)
  api_response            jsonb, -- Sanitized response
  api_error               text,
  
  -- Metadata
  metadata                jsonb, -- Component-specific data
  created_at              timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(trace_id, sequence)
);

-- Indexes for efficient querying
CREATE INDEX idx_query_traces_session_id ON query_traces(session_id);
CREATE INDEX idx_query_traces_student_id ON query_traces(student_id);
CREATE INDEX idx_query_traces_created_at ON query_traces(created_at DESC);
CREATE INDEX idx_query_traces_intent ON query_traces(intent);
CREATE INDEX idx_trace_events_trace_id ON query_trace_events(trace_id);
CREATE INDEX idx_trace_events_component ON query_trace_events(component);
CREATE INDEX idx_trace_events_operation ON query_trace_events(operation);
CREATE INDEX idx_trace_events_api_provider ON query_trace_events(api_provider);

-- Helper view for recent traces with event counts
CREATE OR REPLACE VIEW recent_traces AS
SELECT 
  t.id,
  t.session_id,
  t.student_id,
  t.message,
  t.intent,
  t.detected_fact_kinds,
  t.start_time,
  t.duration_ms,
  t.model_used,
  t.error,
  COUNT(e.id) AS event_count,
  COUNT(DISTINCT e.api_provider) AS api_providers_used
FROM query_traces t
LEFT JOIN query_trace_events e ON t.id = e.trace_id
WHERE t.created_at > now() - interval '24 hours'
GROUP BY t.id
ORDER BY t.created_at DESC;

-- Helper function to get trace details
CREATE OR REPLACE FUNCTION get_trace_details(p_trace_id uuid)
RETURNS TABLE (
  trace_id uuid,
  message text,
  intent text,
  duration_ms integer,
  events jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as trace_id,
    t.message,
    t.intent,
    t.duration_ms,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'sequence', e.sequence,
          'component', e.component,
          'operation', e.operation,
          'duration_ms', e.duration_ms,
          'api_provider', e.api_provider,
          'api_method', e.api_method,
          'metadata', e.metadata
        ) ORDER BY e.sequence
      ) FILTER (WHERE e.id IS NOT NULL),
      '[]'::jsonb
    ) as events
  FROM query_traces t
  LEFT JOIN query_trace_events e ON t.id = e.trace_id
  WHERE t.id = p_trace_id
  GROUP BY t.id;
END;
$$ LANGUAGE plpgsql;
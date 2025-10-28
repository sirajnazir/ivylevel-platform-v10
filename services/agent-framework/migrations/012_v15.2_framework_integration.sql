-- Migration 012: v15.2 Framework Integration Enhancement
-- Purpose: Add LangChain LCEL orchestration, LLM-based intent routing, producer-critic reflection, and context engineering
-- Author: v15.2 Implementation
-- Date: 2025-10-28
-- Status: Additive (zero breaking changes to v14.0)

-- Enable DDL execution in migrations
SET app.migration = true;

-- ============================================================================
-- INTENT CLASSIFICATION TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS intent_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL REFERENCES students(student_id),
  session_id TEXT REFERENCES agent_conversation_sessions(session_id),
  query TEXT NOT NULL,
  classified_intent TEXT NOT NULL, -- gameplan_strategy, ec_discovery, essay_help, scholarship_search, schedule_optimization, mental_health, clarification_needed
  confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  model_used TEXT NOT NULL, -- gpt-3.5-turbo, gpt-4, etc.
  reasoning TEXT, -- LLM's reasoning for classification
  context_snapshot JSONB, -- {archetype, grade, burnout_level, recent_topics}
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processing_time_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_intent_classifications_student ON intent_classifications(student_id);
CREATE INDEX IF NOT EXISTS idx_intent_classifications_session ON intent_classifications(session_id);
CREATE INDEX IF NOT EXISTS idx_intent_classifications_intent ON intent_classifications(classified_intent);
CREATE INDEX IF NOT EXISTS idx_intent_classifications_created_at ON intent_classifications(created_at DESC);

COMMENT ON TABLE intent_classifications IS 'v15.2: LLM-based intent classification logs for routing optimization';
COMMENT ON COLUMN intent_classifications.confidence_score IS 'LLM confidence in classification (0.0-1.0)';
COMMENT ON COLUMN intent_classifications.context_snapshot IS 'Student context at time of classification for debugging';

-- ============================================================================
-- REFLECTION ITERATIONS TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS reflection_iterations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL REFERENCES students(student_id),
  session_id TEXT REFERENCES agent_conversation_sessions(session_id),
  query TEXT NOT NULL,
  iteration_number INTEGER NOT NULL CHECK (iteration_number >= 1),
  producer_response TEXT NOT NULL, -- GPT-4's initial strategy response
  producer_model TEXT NOT NULL, -- gpt-4-turbo, gpt-4o, etc.
  critic_feedback TEXT NOT NULL, -- Claude's critique
  critic_model TEXT NOT NULL, -- claude-3-5-sonnet-20241022, etc.
  quality_scores JSONB NOT NULL, -- {actionable: 0-10, empathetic: 0-10, data_grounded: 0-10, ivyscore_optimal: 0-10}
  improvement_suggestions TEXT[], -- Array of specific improvements
  passed_quality_gate BOOLEAN NOT NULL, -- true if avg score >= 7.5
  final_iteration BOOLEAN NOT NULL DEFAULT false, -- true if this is the last iteration before sending to user
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processing_time_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_reflection_iterations_student ON reflection_iterations(student_id);
CREATE INDEX IF NOT EXISTS idx_reflection_iterations_session ON reflection_iterations(session_id);
CREATE INDEX IF NOT EXISTS idx_reflection_iterations_passed ON reflection_iterations(passed_quality_gate);
CREATE INDEX IF NOT EXISTS idx_reflection_iterations_created_at ON reflection_iterations(created_at DESC);

COMMENT ON TABLE reflection_iterations IS 'v15.2: Producer-critic reflection loops for quality gates';
COMMENT ON COLUMN reflection_iterations.quality_scores IS 'JSON: {actionable: 0-10, empathetic: 0-10, data_grounded: 0-10, ivyscore_optimal: 0-10}';
COMMENT ON COLUMN reflection_iterations.passed_quality_gate IS 'True if average quality score >= 7.5/10';

-- ============================================================================
-- STRATEGY CHAIN EXECUTION TRACES
-- ============================================================================

CREATE TABLE IF NOT EXISTS strategy_chain_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL REFERENCES students(student_id),
  session_id TEXT REFERENCES agent_conversation_sessions(session_id),
  chain_name TEXT NOT NULL, -- strategyChain, contextEngineeringChain, reflectionChain
  query TEXT NOT NULL,
  chain_steps JSONB NOT NULL, -- [{step: 'intent_routing', duration_ms: 120, output: {...}}, {step: 'context_engineering', ...}]
  total_duration_ms INTEGER NOT NULL,
  tokens_used JSONB, -- {prompt: 1500, completion: 800, total: 2300}
  success BOOLEAN NOT NULL,
  error_message TEXT, -- If success=false
  langchain_run_id TEXT, -- LangSmith run ID for deep tracing
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_strategy_chain_traces_student ON strategy_chain_traces(student_id);
CREATE INDEX IF NOT EXISTS idx_strategy_chain_traces_session ON strategy_chain_traces(session_id);
CREATE INDEX IF NOT EXISTS idx_strategy_chain_traces_chain_name ON strategy_chain_traces(chain_name);
CREATE INDEX IF NOT EXISTS idx_strategy_chain_traces_success ON strategy_chain_traces(success);
CREATE INDEX IF NOT EXISTS idx_strategy_chain_traces_created_at ON strategy_chain_traces(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_strategy_chain_traces_langsmith ON strategy_chain_traces(langchain_run_id) WHERE langchain_run_id IS NOT NULL;

COMMENT ON TABLE strategy_chain_traces IS 'v15.2: LangChain LCEL execution traces for performance monitoring and debugging';
COMMENT ON COLUMN strategy_chain_traces.chain_steps IS 'Array of chain steps with timing and outputs for observability';
COMMENT ON COLUMN strategy_chain_traces.langchain_run_id IS 'LangSmith run ID for correlation with LangSmith dashboard';

-- ============================================================================
-- CONTEXT ENGINEERING LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS context_engineering_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL REFERENCES students(student_id),
  session_id TEXT REFERENCES agent_conversation_sessions(session_id),
  query TEXT NOT NULL,
  intent TEXT NOT NULL, -- From intent classification
  few_shot_examples JSONB, -- [{query: "...", response: "...", similarity: 0.92}]
  sql_facts JSONB, -- {gpa: 3.9, sat: 1530, awards: [...]}
  coach_persona TEXT, -- Jenny's voice instructions
  final_prompt TEXT NOT NULL, -- Complete prompt sent to LLM
  prompt_tokens INTEGER NOT NULL,
  context_sources TEXT[], -- ['pinecone_rag', 'sql_facts', 'eq_profile', 'recent_history']
  retrieval_duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_context_engineering_logs_student ON context_engineering_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_context_engineering_logs_session ON context_engineering_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_context_engineering_logs_intent ON context_engineering_logs(intent);
CREATE INDEX IF NOT EXISTS idx_context_engineering_logs_created_at ON context_engineering_logs(created_at DESC);

COMMENT ON TABLE context_engineering_logs IS 'v15.2: Context engineering pipeline logs showing how prompts are built';
COMMENT ON COLUMN context_engineering_logs.few_shot_examples IS 'Top-k similar examples retrieved from Pinecone for in-context learning';
COMMENT ON COLUMN context_engineering_logs.context_sources IS 'Array of sources used: pinecone_rag, sql_facts, eq_profile, recent_history';

-- ============================================================================
-- MATERIALIZED VIEW: REFLECTION QUALITY METRICS
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_reflection_quality_metrics AS
SELECT
  student_id,
  COUNT(*) as total_reflections,
  COUNT(*) FILTER (WHERE passed_quality_gate = true) as passed_reflections,
  ROUND(AVG(iteration_number), 2) as avg_iterations_per_query,
  ROUND(AVG((quality_scores->>'actionable')::DECIMAL), 2) as avg_actionable_score,
  ROUND(AVG((quality_scores->>'empathetic')::DECIMAL), 2) as avg_empathetic_score,
  ROUND(AVG((quality_scores->>'data_grounded')::DECIMAL), 2) as avg_data_grounded_score,
  ROUND(AVG((quality_scores->>'ivyscore_optimal')::DECIMAL), 2) as avg_ivyscore_optimal_score,
  ROUND(AVG(
    ((quality_scores->>'actionable')::DECIMAL +
     (quality_scores->>'empathetic')::DECIMAL +
     (quality_scores->>'data_grounded')::DECIMAL +
     (quality_scores->>'ivyscore_optimal')::DECIMAL) / 4
  ), 2) as avg_overall_quality,
  MAX(created_at) as last_reflection_at
FROM reflection_iterations
WHERE final_iteration = true
GROUP BY student_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_reflection_quality_metrics_student ON mv_reflection_quality_metrics(student_id);

COMMENT ON MATERIALIZED VIEW mv_reflection_quality_metrics IS 'v15.2: Aggregated reflection quality metrics per student for monitoring coaching quality';

-- ============================================================================
-- FUNCTION: Refresh reflection quality metrics
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_reflection_quality_metrics()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_reflection_quality_metrics;
END;
$$;

COMMENT ON FUNCTION refresh_reflection_quality_metrics IS 'v15.2: Refresh reflection quality metrics materialized view (called by cron worker)';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Assuming ivylevel_app role exists from v14.0
GRANT SELECT, INSERT ON intent_classifications TO ivylevel_app;
GRANT SELECT, INSERT ON reflection_iterations TO ivylevel_app;
GRANT SELECT, INSERT ON strategy_chain_traces TO ivylevel_app;
GRANT SELECT, INSERT ON context_engineering_logs TO ivylevel_app;
GRANT SELECT ON mv_reflection_quality_metrics TO ivylevel_app;
GRANT EXECUTE ON FUNCTION refresh_reflection_quality_metrics TO ivylevel_app;

-- ============================================================================
-- MIGRATION METADATA
-- ============================================================================

-- Log migration completion
INSERT INTO system_events (event_type, metadata, created_at)
SELECT
  'migration_completed',
  jsonb_build_object(
    'migration_number', '012',
    'migration_name', 'v15.2_framework_integration',
    'tables_added', ARRAY['intent_classifications', 'reflection_iterations', 'strategy_chain_traces', 'context_engineering_logs'],
    'views_added', ARRAY['mv_reflection_quality_metrics'],
    'functions_added', ARRAY['refresh_reflection_quality_metrics']
  ),
  NOW()
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_events');

-- ============================================================================
-- VERIFICATION QUERIES (commented out - run manually if needed)
-- ============================================================================

-- SELECT 'intent_classifications' as table_name, COUNT(*) as row_count FROM intent_classifications
-- UNION ALL
-- SELECT 'reflection_iterations', COUNT(*) FROM reflection_iterations
-- UNION ALL
-- SELECT 'strategy_chain_traces', COUNT(*) FROM strategy_chain_traces
-- UNION ALL
-- SELECT 'context_engineering_logs', COUNT(*) FROM context_engineering_logs;

-- SELECT * FROM mv_reflection_quality_metrics WHERE student_id = 'huda-2025';

-- Migration 007: v3.2 Production Readiness - Facts Views & Infrastructure
-- Date: 2025-10-23
-- Purpose: Production-grade facts views, outbox pattern, RLS, HGTI, and governance infrastructure
-- Version: v3.2.0
-- Reference: docs/guides/V3.2_PRODUCTION_READINESS_CHECKLIST.md

-- ============================================================================
-- FIX #1: PRODUCTION FACTS VIEWS (map to real tables, not kb_items narrative)
-- ============================================================================

-- Awards Facts View (authoritative source for award_nth, award_latest, etc.)
CREATE OR REPLACE VIEW v_awards_facts AS
SELECT
  ki.student_id,
  ki.item_id AS award_id,
  ki.title_name,
  ki.subtype AS tier,  -- 'National', 'State', 'Regional', 'School'
  ki.outcome_date,
  ki.status_detail AS status,  -- 'Winner', 'Finalist', 'Honorable Mention'
  ki.key_metric_value AS placement,
  ki.created_ts AS created_at,
  ki.updated_ts AS updated_at
FROM kb_items ki
WHERE ki.item_type = 'Award_Competition'
  AND ki.tier1_state = 'Outcome'  -- Only completed awards with outcomes
  AND ki.status_detail IN ('Winner', 'Finalist', 'Honorable Mention')
ORDER BY ki.student_id, ki.outcome_date ASC;

COMMENT ON VIEW v_awards_facts IS 'Authoritative facts view for awards - maps to kb_items with item_type=Award_Competition';

-- Tests Facts View (authoritative source for sat_nth, sat_latest, etc.)
CREATE OR REPLACE VIEW v_tests_facts AS
SELECT
  ki.student_id,
  ki.item_id AS test_id,
  ki.subtype AS test_type,  -- 'SAT', 'ACT', 'AP', 'Subject Test'
  ki.outcome_date AS test_date,
  CAST(ki.key_metric_value AS INTEGER) AS composite_score,
  ki.key_metric_unit AS score_scale,  -- '1600', '36', '5'
  ki.title_name AS test_name,
  ki.created_ts AS created_at,
  ki.updated_ts AS updated_at
FROM kb_items ki
WHERE ki.item_type = 'Test'
  AND ki.tier1_state = 'Outcome'  -- Only completed tests with scores
  AND ki.outcome_date IS NOT NULL
  AND ki.key_metric_value IS NOT NULL
ORDER BY ki.student_id, ki.outcome_date ASC;

COMMENT ON VIEW v_tests_facts IS 'Authoritative facts view for tests - maps to kb_items with item_type=Test';

-- GPA Facts View (authoritative source for gpa_as_of)
-- NOTE: Using feature_snapshot_values as authoritative source for GPA
CREATE OR REPLACE VIEW v_gpa_facts AS
SELECT
  fs.student_id,
  fsv.feature_id AS gpa_type,  -- 'gpa_weighted', 'gpa_unweighted'
  fsv.value AS gpa_value,
  CASE
    WHEN fsv.feature_id = 'gpa_weighted' THEN 5.0
    WHEN fsv.feature_id = 'gpa_unweighted' THEN 4.0
    ELSE 4.0
  END AS gpa_scale,
  fs.as_of AS as_of_date,
  fs.snapshot_id
FROM feature_snapshots fs
JOIN feature_snapshot_values fsv ON fs.snapshot_id = fsv.snapshot_id
WHERE fsv.feature_id IN ('gpa_weighted', 'gpa_unweighted')
ORDER BY fs.student_id, fs.as_of DESC;

COMMENT ON VIEW v_gpa_facts IS 'Authoritative facts view for GPA - maps to feature_snapshot_values';

-- Deadlines Facts View (authoritative source for deadline_latest)
-- Using kb_items for college application deadlines
CREATE OR REPLACE VIEW v_deadlines_facts AS
SELECT
  ki.student_id,
  ki.title_name AS college_name,
  ki.deadline_date,
  ki.subtype AS deadline_type,  -- 'ED', 'EA', 'RD', 'Rolling'
  CASE
    WHEN ki.subtype = 'ED' THEN 1  -- Highest priority
    WHEN ki.subtype = 'EA' THEN 2
    WHEN ki.subtype = 'RD' THEN 3
    WHEN ki.subtype = 'Rolling' THEN 4
    ELSE 5
  END AS priority,
  ki.created_ts AS created_at,
  ki.updated_ts AS updated_at
FROM kb_items ki
WHERE ki.item_type = 'Application'
  AND ki.deadline_date >= CURRENT_DATE  -- Only future deadlines
  AND ki.deadline_date IS NOT NULL
ORDER BY ki.student_id, ki.deadline_date ASC, priority ASC;

COMMENT ON VIEW v_deadlines_facts IS 'Authoritative facts view for college deadlines - maps to kb_items with item_type=Application';

-- ============================================================================
-- TEMPORAL UDFs (Updated to use facts views, not kb_items directly)
-- ============================================================================

-- award_nth: Get nth award by outcome date
CREATE OR REPLACE FUNCTION award_nth(p_student_id TEXT, p_n INTEGER, p_as_of DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
  award_id TEXT,
  title_name TEXT,
  tier TEXT,
  outcome_date DATE,
  status TEXT,
  placement TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.award_id,
    v.title_name,
    v.tier,
    v.outcome_date,
    v.status,
    v.placement
  FROM v_awards_facts v
  WHERE v.student_id = p_student_id
    AND v.outcome_date <= p_as_of
  ORDER BY v.outcome_date ASC
  OFFSET GREATEST(p_n - 1, 0)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION award_nth IS 'Returns nth award for student as of date (1-indexed) from v_awards_facts';

-- award_latest: Get latest award
CREATE OR REPLACE FUNCTION award_latest(p_student_id TEXT, p_as_of DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
  award_id TEXT,
  title_name TEXT,
  tier TEXT,
  outcome_date DATE,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.award_id,
    v.title_name,
    v.tier,
    v.outcome_date,
    v.status
  FROM v_awards_facts v
  WHERE v.student_id = p_student_id
    AND v.outcome_date <= p_as_of
  ORDER BY v.outcome_date DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- sat_latest: Get latest SAT score
CREATE OR REPLACE FUNCTION sat_latest(p_student_id TEXT, p_as_of DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
  test_id TEXT,
  test_date DATE,
  composite_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.test_id,
    v.test_date,
    v.composite_score
  FROM v_tests_facts v
  WHERE v.student_id = p_student_id
    AND v.test_type = 'SAT'
    AND v.test_date <= p_as_of
  ORDER BY v.test_date DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- gpa_as_of: Get GPA as of date
CREATE OR REPLACE FUNCTION gpa_as_of(p_student_id TEXT, p_as_of DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
  gpa_type TEXT,
  gpa_value NUMERIC,
  gpa_scale NUMERIC,
  as_of_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.gpa_type,
    v.gpa_value,
    v.gpa_scale,
    v.as_of_date
  FROM v_gpa_facts v
  WHERE v.student_id = p_student_id
    AND v.as_of_date <= p_as_of
  ORDER BY v.as_of_date DESC, v.gpa_type DESC  -- Prefer weighted GPA
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- deadline_latest: Get next upcoming deadline with stable tie-breaker
CREATE OR REPLACE FUNCTION deadline_latest(p_student_id TEXT)
RETURNS TABLE(
  college_name TEXT,
  deadline_date DATE,
  deadline_type TEXT,
  priority INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.college_name,
    v.deadline_date,
    v.deadline_type,
    v.priority,
    v.created_at
  FROM v_deadlines_facts v
  WHERE v.student_id = p_student_id
  ORDER BY
    v.deadline_date ASC,
    v.priority ASC,  -- Stable tie-breaker: priority (ED > EA > RD)
    v.created_at ASC,  -- Then oldest entry first
    v.college_name ASC  -- Finally alphabetical
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION deadline_latest IS 'Returns next upcoming deadline with deterministic tie-breaker (priority → created_at → college_name)';

-- ============================================================================
-- OUTBOX PATTERN (Fix #2 & #5: Idempotent event delivery)
-- ============================================================================

CREATE TABLE IF NOT EXISTS outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,  -- 'tool.executed', 'chip.created', 'session.completed'
  payload JSONB NOT NULL,
  idempotency_key TEXT UNIQUE NOT NULL,  -- Prevents duplicates
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ  -- NULL = pending delivery
);

CREATE INDEX idx_outbox_undelivered ON outbox(created_at) WHERE delivered_at IS NULL;
CREATE INDEX idx_outbox_topic ON outbox(topic);

COMMENT ON TABLE outbox IS 'Idempotent outbox pattern for reliable event delivery';
COMMENT ON COLUMN outbox.idempotency_key IS 'Format: {agent_run_id}:{tool_name}:{chip_hash} - ensures exactly-once semantics';

-- ============================================================================
-- AGENT RUNS (Fix #3: Real budget tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL,  -- 'knowledge_agent', 'readiness_agent', 'coaching_agent'
  student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  session_id TEXT,  -- Link to chat session or interactive session
  tokens_used INTEGER DEFAULT 0,
  total_latency_ms INTEGER DEFAULT 0,
  tool_calls INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'budget_exceeded', 'failed'))
);

CREATE INDEX idx_agent_runs_student ON agent_runs(student_id);
CREATE INDEX idx_agent_runs_status ON agent_runs(status);
CREATE INDEX idx_agent_runs_started ON agent_runs(started_at DESC);

COMMENT ON TABLE agent_runs IS 'Tracks agent execution for budget enforcement and monitoring';
COMMENT ON COLUMN agent_runs.status IS 'running → completed | budget_exceeded | failed';

-- ============================================================================
-- CHIPS TABLE (Evidence provenance)
-- ============================================================================

CREATE TABLE IF NOT EXISTS chips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('SQL', 'RAG', 'LLM', 'EQ', 'NARRATIVE')),
  source JSONB NOT NULL,  -- {resolver, params (scrubbed), result, invoked_at}
  hash TEXT NOT NULL,  -- SHA-256 of source (for deduplication)
  trace_id TEXT NOT NULL,  -- OpenTelemetry trace ID
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, hash)  -- Deduplication: same query = same chip
);

CREATE INDEX idx_chips_student ON chips(student_id);
CREATE INDEX idx_chips_kind ON chips(kind);
CREATE INDEX idx_chips_trace ON chips(trace_id);
CREATE INDEX idx_chips_hash ON chips(hash);

COMMENT ON TABLE chips IS 'Evidence provenance chips for all agent reasoning';
COMMENT ON COLUMN chips.source IS 'JSON: {resolver, params (PII scrubbed), result, invoked_at}';
COMMENT ON COLUMN chips.hash IS 'SHA-256(source) for deduplication';

-- ============================================================================
-- HGTI (Human Growth & Transformation Index) - Fix #9
-- ============================================================================

CREATE TABLE IF NOT EXISTS growth_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  barrier_type TEXT NOT NULL CHECK (barrier_type IN (
    'INTERNAL_CONFIDENCE', 'SOCIAL_EXCLUSION', 'NEURODIVERSITY',
    'PARENT_CONFLICT', 'SELF_IMAGE', 'MOTIVATION_DROP', 'BURNOUT', 'TIME_MANAGEMENT'
  )),
  trigger TEXT NOT NULL,
  coach_reflection TEXT NOT NULL,
  student_reflection TEXT,  -- Private, not shown to parents
  breakthrough BOOLEAN DEFAULT false,
  transformation_delta NUMERIC CHECK (transformation_delta BETWEEN 0 AND 1),
  occurred_at DATE NOT NULL,
  linked_artifacts JSONB DEFAULT '[]'::jsonb,  -- Links to chips, essays, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_growth_events_student ON growth_events(student_id, occurred_at DESC);
CREATE INDEX idx_growth_events_barrier ON growth_events(barrier_type);
CREATE INDEX idx_growth_events_breakthrough ON growth_events(breakthrough) WHERE breakthrough = true;

COMMENT ON TABLE growth_events IS 'Human growth & transformation tracking (HGTI) - 28% of IvyScore non-academic weight';
COMMENT ON COLUMN growth_events.transformation_delta IS 'Magnitude of growth (0-1): 0.2=minor, 0.5=moderate, 0.8=major, 1.0=breakthrough';
COMMENT ON COLUMN growth_events.student_reflection IS 'Private student notes - NOT visible to parents';

-- HGTI Scores Materialized View (refreshed every 5 min via cron)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_hgti_scores AS
SELECT
  student_id,
  AVG(transformation_delta) AS avg_transformation,
  SUM(CASE WHEN breakthrough THEN 1 ELSE 0 END) AS breakthrough_count,
  COUNT(*) AS total_events,
  MAX(occurred_at) AS latest_event_date
FROM growth_events
GROUP BY student_id;

CREATE UNIQUE INDEX idx_mv_hgti_student ON mv_hgti_scores(student_id);

COMMENT ON MATERIALIZED VIEW mv_hgti_scores IS 'Cached HGTI scores - refreshed every 5 min via cron (not per-insert)';

-- ============================================================================
-- IVYSCORE HISTORY (Fix #9: Versioned scoring for rollout)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ivyscore_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  score NUMERIC NOT NULL CHECK (score BETWEEN 0 AND 1),
  version INTEGER NOT NULL,  -- Scoring version: 1=baseline, 2=10% HGTI, 3=20%, 4=28%
  academic_score NUMERIC,
  achievement_score NUMERIC,
  hgti_score NUMERIC,
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ivyscore_history_student ON ivyscore_history(student_id, computed_at DESC);
CREATE INDEX idx_ivyscore_history_version ON ivyscore_history(version);

COMMENT ON TABLE ivyscore_history IS 'IvyScore calculation history with versioning for phased HGTI rollout';
COMMENT ON COLUMN ivyscore_history.version IS '1=0% HGTI, 2=10% HGTI, 3=20% HGTI, 4=28% HGTI (target)';

-- ============================================================================
-- EQ PROFILES (Fix #7: Digital twin tone)
-- ============================================================================

CREATE TABLE IF NOT EXISTS eq_profiles (
  coach_id INTEGER PRIMARY KEY REFERENCES coaches(id) ON DELETE CASCADE,
  tone_vector JSONB NOT NULL,  -- {warmth: 0.82, direct: 0.61, humor: 0.3}
  lex_map JSONB NOT NULL,  -- {"great job": "nice progress", "awesome": "solid work"}
  audience_styles JSONB NOT NULL,  -- {student: {...}, parent: {...}, coach: {...}}
  model_ref TEXT,  -- Fine-tune ID or LoRA reference
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_coach_eq_tuning (
  student_id TEXT REFERENCES students(student_id) ON DELETE CASCADE,
  coach_id INTEGER REFERENCES coaches(id) ON DELETE CASCADE,
  tone_overrides JSONB,  -- Student-specific tone adjustments
  banned_phrases TEXT[],  -- Phrases coach should avoid for this student
  PRIMARY KEY (student_id, coach_id)
);

COMMENT ON TABLE eq_profiles IS 'Coach EQ profiles for digital twin tone adaptation';
COMMENT ON TABLE student_coach_eq_tuning IS 'Student-specific EQ tuning overrides';

-- EQ QA Samples (monthly audit trail)
CREATE TABLE IF NOT EXISTS eq_qa_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  styled_text TEXT NOT NULL,
  similarity_score NUMERIC,  -- Embedding cosine similarity (should be ≥ 0.85)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_eq_qa_samples_created ON eq_qa_samples(created_at DESC);
CREATE INDEX idx_eq_qa_samples_similarity ON eq_qa_samples(similarity_score);

COMMENT ON TABLE eq_qa_samples IS 'EQ adaptation quality assurance samples for monthly audits';
COMMENT ON COLUMN eq_qa_samples.similarity_score IS 'Embedding similarity between raw and styled (guard: ≥ 0.85)';

-- ============================================================================
-- RLS POLICIES (Fix #3: Student data isolation)
-- ============================================================================

-- Enable RLS on all student-scoped tables
ALTER TABLE chips ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_coach_eq_tuning ENABLE ROW LEVEL SECURITY;
ALTER TABLE ivyscore_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Students can only see their own data
CREATE POLICY chips_student_isolation ON chips
  USING (student_id = current_setting('app.student_id', true));

CREATE POLICY growth_events_student_isolation ON growth_events
  USING (student_id = current_setting('app.student_id', true));

CREATE POLICY agent_runs_student_isolation ON agent_runs
  USING (student_id = current_setting('app.student_id', true));

CREATE POLICY student_coach_eq_tuning_isolation ON student_coach_eq_tuning
  USING (student_id = current_setting('app.student_id', true));

CREATE POLICY ivyscore_history_isolation ON ivyscore_history
  USING (student_id = current_setting('app.student_id', true));

COMMENT ON POLICY chips_student_isolation ON chips IS 'RLS: Students can only see their own chips';
COMMENT ON POLICY growth_events_student_isolation ON growth_events IS 'RLS: Students can only see their own growth events (student_reflection is private)';

-- ============================================================================
-- SYSTEM EVENTS (Monitoring & Telemetry)
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,  -- 'tool.executed', 'chip.created', 'budget.exceeded', 'eq.adapted'
  metadata JSONB NOT NULL,  -- {student_id, agent_name, tool_name, trace_id, ...}
  trace_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_system_events_type ON system_events(event_type);
CREATE INDEX idx_system_events_trace ON system_events(trace_id);
CREATE INDEX idx_system_events_created ON system_events(created_at DESC);

-- RLS for system_events (filter by student_id in metadata)
ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY system_events_student_isolation ON system_events
  USING ((metadata->>'student_id')::text = current_setting('app.student_id', true));

COMMENT ON TABLE system_events IS 'System-wide event log for monitoring and debugging';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON v_awards_facts TO PUBLIC;
GRANT SELECT ON v_tests_facts TO PUBLIC;
GRANT SELECT ON v_gpa_facts TO PUBLIC;
GRANT SELECT ON v_deadlines_facts TO PUBLIC;

GRANT SELECT, INSERT, UPDATE ON outbox TO PUBLIC;
GRANT SELECT, INSERT, UPDATE ON agent_runs TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON chips TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON growth_events TO PUBLIC;
GRANT SELECT, INSERT, UPDATE ON ivyscore_history TO PUBLIC;
GRANT SELECT, INSERT, UPDATE ON eq_profiles TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON student_coach_eq_tuning TO PUBLIC;
GRANT SELECT, INSERT ON eq_qa_samples TO PUBLIC;
GRANT SELECT, INSERT ON system_events TO PUBLIC;

GRANT SELECT ON mv_hgti_scores TO PUBLIC;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Test facts views work
SELECT 'v_awards_facts' AS view_name, COUNT(*) AS row_count FROM v_awards_facts
UNION ALL
SELECT 'v_tests_facts', COUNT(*) FROM v_tests_facts
UNION ALL
SELECT 'v_gpa_facts', COUNT(*) FROM v_gpa_facts
UNION ALL
SELECT 'v_deadlines_facts', COUNT(*) FROM v_deadlines_facts;

-- Test temporal UDFs
-- SELECT * FROM award_nth('huda-2025', 1, CURRENT_DATE);
-- SELECT * FROM sat_latest('huda-2025', CURRENT_DATE);
-- SELECT * FROM gpa_as_of('huda-2025', CURRENT_DATE);
-- SELECT * FROM deadline_latest('huda-2025');

-- Verify RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('chips', 'growth_events', 'agent_runs', 'system_events')
ORDER BY tablename;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Migration 007 creates:
-- - 4 production facts views (v_awards_facts, v_tests_facts, v_gpa_facts, v_deadlines_facts)
-- - 5 temporal UDFs with stable tie-breakers (award_nth, award_latest, sat_latest, gpa_as_of, deadline_latest)
-- - 8 infrastructure tables (outbox, agent_runs, chips, growth_events, ivyscore_history, eq_profiles, student_coach_eq_tuning, eq_qa_samples, system_events)
-- - 1 materialized view (mv_hgti_scores)
-- - RLS policies on all student-scoped tables
-- - Permissions granted
--
-- Next: Apply migration, run canary validation, update master specs
-- ============================================================================

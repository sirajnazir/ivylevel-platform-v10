--
-- PostgreSQL database dump
--

\restrict MD8B62r28eqsxccGwqKYyTEhI0s2hapBYkVzVnmR98GJOtTKD80DemImpxlxEbQ

-- Dumped from database version 14.19 (Homebrew)
-- Dumped by pg_dump version 14.19 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: compat; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA compat;


--
-- Name: SCHEMA compat; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA compat IS 'Compatibility layer bridging legacy vital_facts to v3.0 canonical schema';


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: admission_result; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.admission_result AS ENUM (
    'accepted',
    'waitlisted',
    'rejected',
    'deferred',
    'withdrawn',
    'unknown'
);


--
-- Name: fact_confidence; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.fact_confidence AS ENUM (
    'high',
    'medium',
    'low'
);


--
-- Name: fact_datatype; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.fact_datatype AS ENUM (
    'int',
    'float',
    'date',
    'boolean',
    'enum',
    'string'
);


--
-- Name: lifecycle_domain; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.lifecycle_domain AS ENUM (
    'application',
    'award',
    'test',
    'essay',
    'recommender',
    'ec_portfolio',
    'aid_css_fafsa',
    'ops_policy'
);


--
-- Name: lifecycle_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.lifecycle_status AS ENUM (
    'planned',
    'in_progress',
    'submitted',
    'outcome',
    'archived'
);


--
-- Name: momentum_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.momentum_status AS ENUM (
    'booked',
    'sent',
    'received',
    'logged',
    'won'
);


--
-- Name: outcome_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.outcome_type AS ENUM (
    'admission',
    'plan',
    'tracking',
    'momentum',
    'artifact',
    'draft',
    'submission',
    'result',
    'milestone',
    'ops',
    'policy',
    'registry',
    'content_bank',
    'communication',
    'planning',
    'asset',
    'proof',
    'essay',
    'narrative',
    'applications',
    'achievement',
    'portfolio',
    'recommendation',
    'distribution',
    'evidence'
);


--
-- Name: block_ddl(); Type: FUNCTION; Schema: compat; Owner: -
--

CREATE FUNCTION compat.block_ddl() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF current_setting('app.migration', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'DDL blocked: run DDL only via migrations (SET app.migration=true)';
  END IF;
END $$;


--
-- Name: FUNCTION block_ddl(); Type: COMMENT; Schema: compat; Owner: -
--

COMMENT ON FUNCTION compat.block_ddl() IS 'Blocks DDL commands unless app.migration session variable is set to true';


--
-- Name: try_date(text); Type: FUNCTION; Schema: compat; Owner: -
--

CREATE FUNCTION compat.try_date(text) RETURNS date
    LANGUAGE plpgsql IMMUTABLE
    AS $_$
DECLARE
  d DATE;
BEGIN
  d := NULLIF($1,'')::DATE;
  RETURN d;
EXCEPTION
  WHEN others THEN RETURN NULL;
END $_$;


--
-- Name: FUNCTION try_date(text); Type: COMMENT; Schema: compat; Owner: -
--

COMMENT ON FUNCTION compat.try_date(text) IS 'Safely convert text to date, returning NULL on failure';


--
-- Name: try_num(text); Type: FUNCTION; Schema: compat; Owner: -
--

CREATE FUNCTION compat.try_num(text) RETURNS numeric
    LANGUAGE plpgsql IMMUTABLE
    AS $_$
DECLARE
  n NUMERIC;
BEGIN
  n := NULLIF($1,'')::NUMERIC;
  RETURN n;
EXCEPTION
  WHEN others THEN RETURN NULL;
END $_$;


--
-- Name: FUNCTION try_num(text); Type: COMMENT; Schema: compat; Owner: -
--

COMMENT ON FUNCTION compat.try_num(text) IS 'Safely convert text to numeric, returning NULL on failure';


--
-- Name: awards_enum_as_of(text, date, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.awards_enum_as_of(p_student text, p_date date, p_phase text DEFAULT 'initial'::text) RETURNS TABLE(item_label text, as_of date, source_id text, jtbd_id text)
    LANGUAGE sql STABLE
    AS $$
  SELECT item_label, as_of, source_id, jtbd_id
  FROM award_targets_enum
  WHERE student_id = p_student
    AND phase = p_phase
    AND (as_of IS NULL OR as_of <= p_date)
  ORDER BY as_of NULLS LAST, item_label;
$$;


--
-- Name: backfill_fact_observations(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.backfill_fact_observations() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Migrate existing vital_facts to fact_observations
  INSERT INTO fact_observations (
    obs_id,
    student_id,
    kind,
    value_numeric,
    value_text,
    unit,
    is_official,
    is_practice,
    event_date,
    recorded_at,
    source_id,
    confidence,
    origin,
    dedupe_fingerprint,
    meta
  )
  SELECT 
    'obs_' || md5(student_id || kind || value || fact_date::TEXT || source_id) AS obs_id,
    student_id,
    kind,
    numeric_value,
    value,
    CASE 
      WHEN kind IN ('sat_total_score', 'act_composite') THEN 'score'
      WHEN kind LIKE '%_score' THEN 'score'
      WHEN kind LIKE 'gpa_%' THEN 'points'
      ELSE 'label'
    END AS unit,
    COALESCE(modality = 'official', FALSE) AS is_official,
    COALESCE(modality = 'practice', FALSE) AS is_practice,
    fact_date::DATE AS event_date,
    COALESCE(created_ts, NOW()) AS recorded_at,
    source_id,
    confidence::TEXT,
    'migrated_vital_facts' AS origin,
    md5(student_id || kind || value || fact_date::TEXT || COALESCE(modality, 'any') || source_id) AS dedupe_fingerprint,
    CASE 
      WHEN modality IS NOT NULL THEN jsonb_build_object('modality', modality)
      ELSE '{}'::JSONB
    END AS meta
  FROM vital_facts
  WHERE NOT EXISTS (
    SELECT 1 FROM fact_observations fo 
    WHERE fo.dedupe_fingerprint = md5(vital_facts.student_id || vital_facts.kind || vital_facts.value || vital_facts.fact_date::TEXT || COALESCE(vital_facts.modality, 'any') || vital_facts.source_id)
  );
END;
$$;


--
-- Name: canon_label(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.canon_label(p text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT lower(regexp_replace(trim(p), '\s+', ' ', 'g'));
$$;


--
-- Name: FUNCTION canon_label(p text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.canon_label(p text) IS 'Canonicalize labels by lowercasing and normalizing whitespace for de-duplication';


--
-- Name: cleanup_old_logs(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_logs() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  DELETE FROM query_log WHERE ts < now() - interval '7 days';
END;
$$;


--
-- Name: confidence_weight(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.confidence_weight(c text) RETURNS integer
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT CASE lower(c)
    WHEN 'high' THEN 3
    WHEN 'medium' THEN 2
    WHEN 'low' THEN 1
    ELSE 0 
  END;
$$;


--
-- Name: confidence_weight(public.fact_confidence); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.confidence_weight(c public.fact_confidence) RETURNS integer
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT CASE c
    WHEN 'high' THEN 3
    WHEN 'medium' THEN 2
    WHEN 'low' THEN 1
    ELSE 0 
  END;
$$;


--
-- Name: fact_asof(text, text, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fact_asof(p_student text, p_kind text, p_date date) RETURNS TABLE(obs_id text, event_date date, value_numeric numeric, value_text text, is_official boolean, confidence text, source_id text, meta jsonb)
    LANGUAGE sql STABLE
    AS $$
  SELECT obs_id, event_date, value_numeric, value_text, is_official, confidence, source_id, meta
  FROM v_fact_timeline
  WHERE student_id = p_student AND kind = p_kind
    AND event_date <= p_date
  ORDER BY event_date DESC, policy_score DESC, recorded_at DESC
  LIMIT 1;
$$;


--
-- Name: fact_first(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fact_first(p_student text, p_kind text) RETURNS TABLE(obs_id text, event_date date, value_numeric numeric, value_text text, is_official boolean, confidence text, source_id text, meta jsonb)
    LANGUAGE sql STABLE
    AS $$
  SELECT obs_id, event_date, value_numeric, value_text, is_official, confidence, source_id, meta
  FROM v_fact_timeline
  WHERE student_id = p_student AND kind = p_kind
  ORDER BY rank_chron ASC
  LIMIT 1;
$$;


--
-- Name: fact_latest(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fact_latest(p_student text, p_kind text) RETURNS TABLE(obs_id text, event_date date, value_numeric numeric, value_text text, is_official boolean, confidence text, source_id text, meta jsonb)
    LANGUAGE sql STABLE
    AS $$
  SELECT obs_id, event_date, value_numeric, value_text, is_official, confidence, source_id, meta
  FROM v_fact_timeline
  WHERE student_id = p_student AND kind = p_kind
  ORDER BY rank_reverse ASC
  LIMIT 1;
$$;


--
-- Name: fact_nth(text, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fact_nth(p_student text, p_kind text, p_n integer) RETURNS TABLE(obs_id text, event_date date, value_numeric numeric, value_text text, is_official boolean, confidence text, source_id text, meta jsonb)
    LANGUAGE sql STABLE
    AS $$
  SELECT obs_id, event_date, value_numeric, value_text, is_official, confidence, source_id, meta
  FROM v_fact_timeline
  WHERE student_id = p_student AND kind = p_kind
  ORDER BY rank_chron ASC
  OFFSET GREATEST(p_n - 1, 0) LIMIT 1;
$$;


--
-- Name: fact_series(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fact_series(p_student text, p_kind text) RETURNS TABLE(idx integer, obs_id text, event_date date, value_numeric numeric, value_text text, is_official boolean, confidence text, source_id text, meta jsonb)
    LANGUAGE sql STABLE
    AS $$
  SELECT rank_chron::INT AS idx, obs_id, event_date, value_numeric, value_text, is_official, confidence, source_id, meta
  FROM v_fact_timeline
  WHERE student_id = p_student AND kind = p_kind
  ORDER BY rank_chron ASC;
$$;


--
-- Name: fact_series_filtered(text, text, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fact_series_filtered(p_student text, p_kind text, p_official_only boolean DEFAULT false) RETURNS TABLE(idx integer, obs_id text, event_date date, value_numeric numeric, value_text text, is_official boolean, confidence text, source_id text, meta jsonb)
    LANGUAGE sql STABLE
    AS $$
  WITH filtered AS (
    SELECT *, ROW_NUMBER() OVER (ORDER BY event_date ASC) as filtered_idx
    FROM v_fact_timeline
    WHERE student_id = p_student AND kind = p_kind
      AND (NOT p_official_only OR is_official = TRUE)
    ORDER BY rank_chron ASC
  )
  SELECT filtered_idx::INT AS idx, obs_id, event_date, value_numeric, value_text, is_official, confidence, source_id, meta
  FROM filtered
  ORDER BY filtered_idx;
$$;


--
-- Name: fact_superscore(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fact_superscore(p_student text, p_kind text) RETURNS TABLE(value_numeric numeric, event_dates date[], source_ids text[])
    LANGUAGE sql STABLE
    AS $$
  WITH scores AS (
    SELECT value_numeric, event_date, source_id
    FROM v_fact_timeline
    WHERE student_id = p_student AND kind = p_kind
      AND value_numeric IS NOT NULL
    ORDER BY value_numeric DESC
  )
  SELECT 
    MAX(value_numeric) AS value_numeric,
    array_agg(DISTINCT event_date ORDER BY event_date) AS event_dates,
    array_agg(DISTINCT source_id) AS source_ids
  FROM scores
  WHERE value_numeric = (SELECT MAX(value_numeric) FROM scores);
$$;


--
-- Name: freshness_score(timestamp with time zone, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.freshness_score(d timestamp with time zone, half_life_days integer) RETURNS double precision
    LANGUAGE sql IMMUTABLE
    AS $_$
  SELECT CASE
    WHEN $1 IS NULL OR $2 IS NULL OR $2 <= 0 THEN 1.0
    ELSE exp(-greatest(extract(epoch from (now() - $1))/86400.0, 0) / $2 * 0.693147)  -- ln(2) = 0.693147
  END;
$_$;


--
-- Name: generate_fts_vector(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_fts_vector(text_content text) RETURNS tsvector
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
  RETURN to_tsvector('english', COALESCE(text_content, ''));
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: award_targets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.award_targets (
    id bigint NOT NULL,
    student_id text NOT NULL,
    award_label text NOT NULL,
    tier text,
    rationale text,
    phase text NOT NULL,
    as_of timestamp with time zone NOT NULL,
    confidence text DEFAULT 'medium'::text NOT NULL,
    source_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT award_targets_phase_check CHECK ((phase = ANY (ARRAY['initial'::text, 'revised'::text, 'final'::text])))
);


--
-- Name: get_award_targets_asof(text, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_award_targets_asof(p_student_id text, p_ts timestamp with time zone) RETURNS SETOF public.award_targets
    LANGUAGE sql STABLE
    AS $$
  SELECT *
  FROM award_targets
  WHERE student_id = p_student_id
    AND as_of = (
      SELECT MAX(as_of)
      FROM award_targets
      WHERE student_id = p_student_id
        AND as_of <= p_ts
    )
  ORDER BY award_label;
$$;


--
-- Name: get_award_targets_by_phase(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_award_targets_by_phase(p_student_id text, p_phase text) RETURNS TABLE(award_label text, tier text, phase text, as_of timestamp with time zone, confidence text, source_id text, rationale text)
    LANGUAGE sql STABLE
    AS $$
  SELECT 
    award_label,
    tier,
    phase,
    as_of,
    confidence,
    source_id,
    rationale
  FROM award_targets
  WHERE student_id = p_student_id
    AND phase = p_phase
  ORDER BY award_label ASC;
$$;


--
-- Name: get_kb_items_by_type_state(text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_kb_items_by_type_state(p_student_id text, p_item_type text, p_tier1_state text DEFAULT NULL::text, p_tier2_substate text DEFAULT NULL::text) RETURNS TABLE(item_id text, title_name text, tier1_state text, tier2_substate text, status_detail text, key_metric_type text, key_metric_value text, event_date date, outcome_date date, source_ref text, evidence_links text[], confidence text)
    LANGUAGE sql STABLE
    AS $$
  SELECT
    item_id,
    title_name,
    tier1_state,
    tier2_substate,
    status_detail,
    key_metric_type,
    key_metric_value,
    event_date,
    outcome_date,
    source_ref,
    evidence_links,
    confidence
  FROM kb_items
  WHERE student_id = p_student_id
    AND item_type = p_item_type
    AND (p_tier1_state IS NULL OR tier1_state = p_tier1_state)
    AND (p_tier2_substate IS NULL OR tier2_substate = p_tier2_substate)
  ORDER BY COALESCE(outcome_date, event_date, submit_date, deadline_date) NULLS LAST;
$$;


--
-- Name: get_kb_items_progression(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_kb_items_progression(p_student_id text, p_item_type text) RETURNS TABLE(item_id text, title_name text, tier1_state text, status_detail text, key_metric_value text, temporal_date date, source_ref text, nth integer)
    LANGUAGE sql STABLE
    AS $$
  SELECT
    item_id,
    title_name,
    tier1_state,
    status_detail,
    key_metric_value,
    COALESCE(outcome_date, event_date, submit_date, deadline_date) AS temporal_date,
    source_ref,
    ROW_NUMBER() OVER (
      ORDER BY COALESCE(outcome_date, event_date, submit_date, deadline_date) ASC
    )::INTEGER AS nth
  FROM kb_items
  WHERE student_id = p_student_id
    AND item_type = p_item_type
  ORDER BY nth;
$$;


--
-- Name: get_sat_nth(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_sat_nth(p_student text, p_nth integer) RETURNS TABLE(student_id text, as_of date, numeric_value integer, type text, confidence text, source_id text, nth bigint)
    LANGUAGE sql STABLE
    AS $$
  SELECT *
  FROM v_sat_enum_progression
  WHERE student_id = p_student AND nth = p_nth;
$$;


--
-- Name: get_trace_details(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_trace_details(p_trace_id uuid) RETURNS TABLE(trace_id uuid, message text, intent text, duration_ms integer, events jsonb)
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: increment_session_turn_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_session_turn_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE sessions
    SET turn_count = turn_count + 1,
        total_student_messages = total_student_messages + 1,
        total_coach_messages = total_coach_messages + 1
    WHERE session_id = NEW.session_id;
    RETURN NEW;
END;
$$;


--
-- Name: invalidate_stale_context(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.invalidate_stale_context() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE unified_context
    SET is_stale = TRUE
    WHERE student_id = (SELECT student_id FROM sessions WHERE session_id = NEW.session_id)
      AND is_stale = FALSE
      AND expires_at < NOW();
    RETURN NEW;
END;
$$;


--
-- Name: ivyready_asof(text, date, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ivyready_asof(p_student text, p_date date, p_rubric text DEFAULT 'ivyplus_v1'::text) RETURNS TABLE(student_id text, as_of date, rubric_id text, snapshot_phase text, overall_score numeric)
    LANGUAGE sql STABLE
    AS $$
  SELECT student_id, as_of, rubric_id, snapshot_phase, overall_score
  FROM ivyready_snapshots
  WHERE student_id = p_student AND rubric_id = p_rubric AND as_of <= p_date
  ORDER BY as_of DESC
  LIMIT 1;
$$;


--
-- Name: refresh_fts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_fts() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY jtbd_fts;
  REFRESH MATERIALIZED VIEW CONCURRENTLY interactions_fts;
END;
$$;


--
-- Name: rubric_scores_asof(text, date, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rubric_scores_asof(p_student text, p_date date, p_rubric text DEFAULT 'ivyplus_v1'::text) RETURNS TABLE(student_id text, as_of date, ivyready_score numeric, factor_scores jsonb)
    LANGUAGE sql STABLE
    AS $$
  SELECT student_id, p_date AS as_of,
         SUM(weighted_score) AS ivyready_score,
         JSONB_OBJECT_AGG(factor_id, raw_score) AS factor_scores
  FROM admissions_rubric_scores
  WHERE student_id=p_student AND rubric_id=p_rubric AND as_of<=p_date
  GROUP BY student_id;
$$;


--
-- Name: FUNCTION rubric_scores_asof(p_student text, p_date date, p_rubric text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.rubric_scores_asof(p_student text, p_date date, p_rubric text) IS 'Get rubric scores as of a specific date (temporal query)';


--
-- Name: sat_enum_as_of(text, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sat_enum_as_of(p_student text, p_date date) RETURNS TABLE(student_id text, as_of date, numeric_value integer, type text, confidence text, source_id text)
    LANGUAGE sql STABLE
    AS $$
  SELECT student_id, as_of, numeric_value, type, confidence, source_id
  FROM sat_timeline_enum
  WHERE student_id = p_student AND as_of <= p_date
  ORDER BY as_of DESC, numeric_value DESC
  LIMIT 1;
$$;


--
-- Name: select_current_fact(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.select_current_fact(p_student_id text, p_kind text) RETURNS TABLE(student_id text, kind text, normalized_value text, original_value text, fact_date timestamp with time zone, confidence text, source_id text, selection_reason jsonb)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  WITH rules AS (
    SELECT r.* FROM fact_kind_rules r WHERE r.kind = p_kind
  ),
  candidates AS (
    SELECT
      fn.student_id,
      fn.kind,
      fn.normalized_value::text AS normalized_value,
      fn.value AS original_value,
      fn.fact_date,
      fn.confidence::text AS confidence,
      fn.source_id,
      confidence_weight(fn.confidence::text) AS conf_weight,
      freshness_score(fn.fact_date, rules.freshness_half_life_d) AS fresh_weight,
      COALESCE((
        SELECT 100 - idx
        FROM jsonb_array_elements_text(rules.source_priority) WITH ORDINALITY sp(val, idx)
        WHERE sp.val = fn.source_id
        LIMIT 1
      ), 0) AS source_weight,
      fn.is_valid,
      fn.validation_error
    FROM facts_normalized fn
    CROSS JOIN rules
    WHERE fn.student_id = p_student_id
      AND fn.kind = p_kind
      AND fn.is_valid = true
  ),
  scored AS (
    SELECT c.*,
      (c.conf_weight * c.fresh_weight + c.source_weight * 0.1) AS total_score
    FROM candidates c
  )
  SELECT
    s.student_id,
    s.kind,
    s.normalized_value,
    s.original_value,
    s.fact_date, 
    s.confidence, 
    s.source_id,
    jsonb_build_object(
      'confidence_weight', s.conf_weight,
      'freshness_weight', round(s.fresh_weight::numeric, 3),
      'source_weight', s.source_weight,
      'total_score', round(s.total_score::numeric, 3),
      'selection_criteria', 'is_valid=true, highest_score'
    ) AS selection_reason
  FROM scored s
  ORDER BY s.total_score DESC, s.fact_date DESC
  LIMIT 1;
END $$;


--
-- Name: select_current_facts(text, text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.select_current_facts(p_student_id text, p_kinds text[]) RETURNS TABLE(student_id text, kind text, normalized_value text, original_value text, fact_date timestamp with time zone, confidence text, source_id text, selection_reason jsonb)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM (
    SELECT DISTINCT ON (scf.kind) scf.*
    FROM unnest(p_kinds) AS k(kind),
    LATERAL select_current_fact(p_student_id, k.kind) AS scf
    ORDER BY scf.kind
  ) sub;
END $$;


--
-- Name: set_context_expiry(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_context_expiry() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.expires_at = NEW.snapshot_at + (NEW.cache_duration_seconds || ' seconds')::INTERVAL;
    RETURN NEW;
END;
$$;


--
-- Name: sync_interactions_fts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_interactions_fts() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM interactions_fts WHERE id = OLD.snippet_id;
    RETURN OLD;
  ELSE
    INSERT INTO interactions_fts (id, student_id, snippet, vector)
    VALUES (
      NEW.snippet_id,
      NEW.student_id,
      COALESCE(NEW.user_ask, '') || ' ' || COALESCE(NEW.jenny_reply, ''),
      generate_fts_vector(COALESCE(NEW.user_ask, '') || ' ' || COALESCE(NEW.jenny_reply, ''))
    )
    ON CONFLICT (id) DO UPDATE SET
      student_id = EXCLUDED.student_id,
      snippet = EXCLUDED.snippet,
      vector = EXCLUDED.vector;
    RETURN NEW;
  END IF;
END;
$$;


--
-- Name: update_coaches_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_coaches_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_insights_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_insights_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_proof_registry_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_proof_registry_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_session_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_session_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE chat_sessions 
  SET updated_ts = now() 
  WHERE session_id = NEW.session_id;
  RETURN NEW;
END;
$$;


--
-- Name: update_students_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_students_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: v_rubric_scores_asof(text, date, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.v_rubric_scores_asof(p_student text, p_date date, p_rubric text DEFAULT 'ivyplus_v1'::text) RETURNS TABLE(student_id text, as_of date, ivyready_score numeric, factor_scores jsonb)
    LANGUAGE sql STABLE
    AS $$
  WITH latest AS (
    SELECT DISTINCT ON (factor_id)
           factor_id, raw_score, weight_pct, (raw_score * weight_pct / 100.0) AS weighted
    FROM admissions_rubric_scores
    WHERE student_id = p_student
      AND rubric_id = p_rubric
      AND as_of <= p_date
    ORDER BY factor_id, as_of DESC
  )
  SELECT p_student AS student_id,
         p_date    AS as_of,
         COALESCE(SUM(weighted),0) AS ivyready_score,
         JSONB_OBJECT_AGG(factor_id, raw_score) AS factor_scores
  FROM latest;
$$;


--
-- Name: FUNCTION v_rubric_scores_asof(p_student text, p_date date, p_rubric text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.v_rubric_scores_asof(p_student text, p_date date, p_rubric text) IS 'Get IvyReady rubric scores as of a specific date (temporal query)';


--
-- Name: vital_facts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vital_facts (
    fact_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    student_id text NOT NULL,
    kind text NOT NULL,
    value text NOT NULL,
    unit text,
    fact_date timestamp with time zone NOT NULL,
    source_id text NOT NULL,
    created_ts timestamp with time zone DEFAULT now(),
    confidence public.fact_confidence DEFAULT 'high'::public.fact_confidence NOT NULL,
    numeric_value integer,
    modality text,
    CONSTRAINT act_score_range CHECK (((kind <> 'act_composite'::text) OR (numeric_value IS NULL) OR ((numeric_value >= 1) AND (numeric_value <= 36)))),
    CONSTRAINT sat_score_range CHECK (((kind <> 'sat_total_score'::text) OR (numeric_value IS NULL) OR ((numeric_value >= 200) AND (numeric_value <= 1600))))
);


--
-- Name: v_academics_latest; Type: VIEW; Schema: compat; Owner: -
--

CREATE VIEW compat.v_academics_latest AS
 SELECT vital_facts.student_id,
    max(
        CASE
            WHEN (vital_facts.kind = 'sat_total_score'::text) THEN vital_facts.numeric_value
            ELSE NULL::integer
        END) AS sat_total,
    max(
        CASE
            WHEN (vital_facts.kind = 'sat_math'::text) THEN vital_facts.numeric_value
            ELSE NULL::integer
        END) AS sat_math,
    max(
        CASE
            WHEN (vital_facts.kind = 'sat_ebrw'::text) THEN vital_facts.numeric_value
            ELSE NULL::integer
        END) AS sat_ebrw,
    max(
        CASE
            WHEN ((vital_facts.kind = 'act_composite'::text) AND (vital_facts.numeric_value IS NOT NULL)) THEN vital_facts.numeric_value
            ELSE NULL::integer
        END) AS act_composite,
    max(
        CASE
            WHEN (vital_facts.kind = 'gpa_weighted'::text) THEN compat.try_num(vital_facts.value)
            ELSE NULL::numeric
        END) AS gpa_weighted,
    max(
        CASE
            WHEN (vital_facts.kind = 'gpa_unweighted'::text) THEN compat.try_num(vital_facts.value)
            ELSE NULL::numeric
        END) AS gpa_unweighted,
    count(DISTINCT
        CASE
            WHEN ((vital_facts.kind = 'ap_score'::text) AND ((compat.try_num(vital_facts.value) >= (1)::numeric) AND (compat.try_num(vital_facts.value) <= (5)::numeric))) THEN vital_facts.fact_id
            ELSE NULL::uuid
        END) AS ap_count,
    now() AS computed_at
   FROM public.vital_facts
  GROUP BY vital_facts.student_id;


--
-- Name: VIEW v_academics_latest; Type: COMMENT; Schema: compat; Owner: -
--

COMMENT ON VIEW compat.v_academics_latest IS 'Latest academic vitals (SAT, ACT, GPA, AP count) from vital_facts';


--
-- Name: v_academics_series; Type: VIEW; Schema: compat; Owner: -
--

CREATE VIEW compat.v_academics_series AS
 SELECT vf.student_id,
    vf.fact_date AS as_of,
        CASE
            WHEN (vf.kind = 'sat_total_score'::text) THEN 'sat_total'::text
            WHEN (vf.kind = 'sat_math'::text) THEN 'sat_math'::text
            WHEN (vf.kind = 'sat_ebrw'::text) THEN 'sat_ebrw'::text
            WHEN (vf.kind = 'act_composite'::text) THEN 'act_composite'::text
            WHEN (vf.kind = 'gpa_weighted'::text) THEN 'gpa_weighted'::text
            WHEN (vf.kind = 'gpa_unweighted'::text) THEN 'gpa_unweighted'::text
            WHEN (vf.kind = 'ap_score'::text) THEN 'ap_score'::text
            ELSE NULL::text
        END AS metric,
    COALESCE((vf.numeric_value)::numeric, compat.try_num(vf.value)) AS value_num,
    vf.value AS value_text,
    jsonb_build_object('confidence', (vf.confidence)::text, 'modality', vf.modality, 'unit', vf.unit) AS meta,
    vf.source_id,
    vf.created_ts
   FROM public.vital_facts vf
  WHERE ((vf.kind = ANY (ARRAY['sat_total_score'::text, 'sat_math'::text, 'sat_ebrw'::text, 'act_composite'::text, 'gpa_weighted'::text, 'gpa_unweighted'::text, 'ap_score'::text])) AND ((vf.numeric_value IS NOT NULL) OR (compat.try_num(vf.value) IS NOT NULL)));


--
-- Name: VIEW v_academics_series; Type: COMMENT; Schema: compat; Owner: -
--

COMMENT ON VIEW compat.v_academics_series IS 'Time-series academic data (SAT/ACT/GPA progression) from vital_facts';


--
-- Name: v_awards_final; Type: VIEW; Schema: compat; Owner: -
--

CREATE VIEW compat.v_awards_final AS
 SELECT DISTINCT ON (vf.student_id, vf.value) vf.student_id,
    vf.value AS award_name,
    vf.fact_date AS won_date,
    vf.source_id,
    vf.confidence,
    vf.created_ts
   FROM public.vital_facts vf
  WHERE (vf.kind = 'award_won'::text)
  ORDER BY vf.student_id, vf.value, vf.fact_date DESC;


--
-- Name: VIEW v_awards_final; Type: COMMENT; Schema: compat; Owner: -
--

COMMENT ON VIEW compat.v_awards_final IS 'Final/won awards from vital_facts';


--
-- Name: v_kb_items; Type: VIEW; Schema: compat; Owner: -
--

CREATE VIEW compat.v_kb_items AS
 SELECT vf.student_id,
        CASE
            WHEN (vf.kind ~~ 'ec:%'::text) THEN 'ec'::text
            WHEN (vf.kind ~~ 'program:%'::text) THEN 'program'::text
            WHEN (vf.kind ~~ 'award:%'::text) THEN 'award'::text
            ELSE 'fact'::text
        END AS item_type,
    split_part(vf.kind, ':'::text, 2) AS item_key,
    vf.value AS item_value,
    vf.fact_date AS as_of,
    jsonb_build_object('confidence', (vf.confidence)::text, 'modality', vf.modality, 'kind', vf.kind) AS meta,
    vf.source_id,
    vf.created_ts
   FROM public.vital_facts vf
  WHERE ((vf.kind ~~ 'ec:%'::text) OR (vf.kind ~~ 'program:%'::text) OR (vf.kind ~~ 'award:%'::text));


--
-- Name: VIEW v_kb_items; Type: COMMENT; Schema: compat; Owner: -
--

COMMENT ON VIEW compat.v_kb_items IS 'ECs, programs, awards from vital_facts, compatible with v3.0 kb_items schema';


--
-- Name: v_outcomes; Type: VIEW; Schema: compat; Owner: -
--

CREATE VIEW compat.v_outcomes AS
 SELECT vf.student_id,
    'award_won'::text AS outcome_type,
    vf.value AS title,
    NULL::text AS tier,
    vf.fact_date AS occurred_at,
    jsonb_build_object('confidence', (vf.confidence)::text, 'modality', vf.modality, 'unit', vf.unit) AS meta,
    vf.source_id,
    vf.created_ts
   FROM public.vital_facts vf
  WHERE (vf.kind = 'award_won'::text);


--
-- Name: VIEW v_outcomes; Type: COMMENT; Schema: compat; Owner: -
--

COMMENT ON VIEW compat.v_outcomes IS 'Awards won from vital_facts, compatible with v3.0 outcomes table schema';


--
-- Name: v_sat_timeline; Type: VIEW; Schema: compat; Owner: -
--

CREATE VIEW compat.v_sat_timeline AS
 SELECT vf.student_id,
    vf.numeric_value AS total_score,
    vf.fact_date,
    vf.source_id,
    vf.confidence,
    row_number() OVER (PARTITION BY vf.student_id ORDER BY vf.fact_date) AS attempt_number,
    vf.created_ts
   FROM public.vital_facts vf
  WHERE ((vf.kind = 'sat_total_score'::text) AND (vf.numeric_value IS NOT NULL))
  ORDER BY vf.student_id, vf.fact_date;


--
-- Name: VIEW v_sat_timeline; Type: COMMENT; Schema: compat; Owner: -
--

COMMENT ON VIEW compat.v_sat_timeline IS 'SAT scores with temporal ordering (attempt 1, 2, 3...) from vital_facts';


--
-- Name: academic_courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academic_courses (
    course_id text NOT NULL,
    student_id text NOT NULL,
    term_id text NOT NULL,
    course_code text,
    subject_area text,
    course_title text NOT NULL,
    level text,
    source_id text NOT NULL,
    confidence text DEFAULT 'medium'::text NOT NULL,
    created_ts timestamp with time zone DEFAULT now(),
    updated_ts timestamp with time zone DEFAULT now(),
    CONSTRAINT academic_courses_confidence_check CHECK ((confidence = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text])))
);


--
-- Name: academic_gpa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academic_gpa (
    gpa_id text NOT NULL,
    student_id text NOT NULL,
    scope text NOT NULL,
    scope_key text,
    gpa_unweighted numeric,
    gpa_weighted numeric,
    credits_attempted numeric,
    credits_earned numeric,
    calc_method text,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    source_id text NOT NULL,
    confidence text DEFAULT 'medium'::text NOT NULL,
    CONSTRAINT academic_gpa_confidence_check CHECK ((confidence = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text])))
);


--
-- Name: academic_grades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academic_grades (
    grade_id text NOT NULL,
    student_id text NOT NULL,
    course_id text NOT NULL,
    grade_letter text,
    grade_percent numeric,
    credits numeric,
    weighting text,
    status text,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    source_id text NOT NULL,
    confidence text DEFAULT 'medium'::text NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT academic_grades_confidence_check CHECK ((confidence = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text])))
);


--
-- Name: academic_terms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academic_terms (
    term_id text NOT NULL,
    student_id text NOT NULL,
    term_code text NOT NULL,
    grade_level text,
    start_date date,
    end_date date,
    source_id text NOT NULL,
    as_of timestamp with time zone DEFAULT now(),
    confidence text DEFAULT 'medium'::text NOT NULL,
    created_ts timestamp with time zone DEFAULT now(),
    updated_ts timestamp with time zone DEFAULT now(),
    CONSTRAINT academic_terms_confidence_check CHECK ((confidence = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text])))
);


--
-- Name: academics_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academics_events (
    student_id text NOT NULL,
    event_id text NOT NULL,
    week_no integer NOT NULL,
    event_date date NOT NULL,
    event_type text NOT NULL,
    label text NOT NULL,
    details jsonb,
    provenance jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE academics_events; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.academics_events IS 'Discrete academic milestone events with proof citations (v8.0)';


--
-- Name: academics_vitals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academics_vitals (
    student_id text NOT NULL,
    week_no integer NOT NULL,
    as_of_date date NOT NULL,
    gpa_unweighted numeric(4,3),
    gpa_weighted numeric(4,3),
    ap_count_cum integer,
    honors_count_cum integer,
    core_stem_load integer,
    workload_hours_week integer,
    current_courses jsonb,
    assessments jsonb,
    notes text,
    provenance jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE academics_vitals; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.academics_vitals IS 'Weekly academic vitals timeline with GPA, AP rigor, course load (v8.0)';


--
-- Name: action_defs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.action_defs (
    action_id text NOT NULL,
    label text NOT NULL,
    description text,
    domain text NOT NULL,
    params_schema jsonb NOT NULL
);


--
-- Name: action_feature_effects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.action_feature_effects (
    action_id text NOT NULL,
    feature_id text NOT NULL,
    effect_model text NOT NULL,
    k1 numeric,
    k2 numeric,
    k3 numeric
);


--
-- Name: admissions_rubric; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admissions_rubric (
    rubric_id text NOT NULL,
    rubric_name text NOT NULL,
    version text NOT NULL,
    created_ts timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE admissions_rubric; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.admissions_rubric IS 'Admissions rubric definitions (e.g., Ivy+, UC, LAC)';


--
-- Name: admissions_rubric_factors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admissions_rubric_factors (
    factor_id text NOT NULL,
    rubric_id text NOT NULL,
    factor_label text NOT NULL,
    weight_pct numeric NOT NULL,
    description text,
    "position" integer DEFAULT 0 NOT NULL,
    created_ts timestamp with time zone DEFAULT now(),
    CONSTRAINT admissions_rubric_factors_weight_pct_check CHECK (((weight_pct >= (0)::numeric) AND (weight_pct <= (100)::numeric)))
);


--
-- Name: TABLE admissions_rubric_factors; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.admissions_rubric_factors IS 'Weighted factors for each rubric (academics, testing, ECs, etc.)';


--
-- Name: COLUMN admissions_rubric_factors.weight_pct; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admissions_rubric_factors.weight_pct IS 'Weight percentage (0-100) for weighted score calculation';


--
-- Name: admissions_rubric_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admissions_rubric_scores (
    score_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    student_id text NOT NULL,
    rubric_id text NOT NULL,
    snapshot_phase text NOT NULL,
    as_of date NOT NULL,
    factor_id text NOT NULL,
    raw_score numeric NOT NULL,
    weight_pct numeric NOT NULL,
    weighted_score numeric GENERATED ALWAYS AS (((raw_score * weight_pct) / 100.0)) STORED,
    details_json jsonb DEFAULT '{}'::jsonb,
    source_id text,
    created_ts timestamp with time zone DEFAULT now(),
    CONSTRAINT admissions_rubric_scores_snapshot_phase_check CHECK ((snapshot_phase = ANY (ARRAY['assessment'::text, 'midpoint'::text, 'final_submit'::text])))
);


--
-- Name: TABLE admissions_rubric_scores; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.admissions_rubric_scores IS 'Temporal rubric score snapshots (assessment, midpoint, final_submit)';


--
-- Name: COLUMN admissions_rubric_scores.snapshot_phase; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admissions_rubric_scores.snapshot_phase IS 'Scoring phase: assessment (initial), midpoint (progress check), final_submit (application)';


--
-- Name: COLUMN admissions_rubric_scores.weighted_score; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admissions_rubric_scores.weighted_score IS 'Computed: raw_score * weight_pct / 100';


--
-- Name: autonomy_loop_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.autonomy_loop_log (
    id integer NOT NULL,
    user_id text NOT NULL,
    loop_stage text NOT NULL,
    input_data jsonb NOT NULL,
    output_data jsonb,
    success boolean,
    error text,
    latency_ms integer,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT autonomy_loop_log_loop_stage_check CHECK ((loop_stage = ANY (ARRAY['diagnose'::text, 'plan'::text, 'simulate'::text, 'act'::text, 'verify'::text, 'learn'::text])))
);


--
-- Name: TABLE autonomy_loop_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.autonomy_loop_log IS 'v8.0: Tracks execution of autonomous agent loop stages';


--
-- Name: autonomy_loop_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.autonomy_loop_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: autonomy_loop_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.autonomy_loop_log_id_seq OWNED BY public.autonomy_loop_log.id;


--
-- Name: award_targets_enum; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.award_targets_enum (
    id bigint NOT NULL,
    student_id text NOT NULL,
    phase text NOT NULL,
    item_label text NOT NULL,
    as_of date,
    source_id text,
    jtbd_id text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT award_targets_enum_phase_check CHECK ((phase = ANY (ARRAY['initial'::text, 'revised'::text, 'final'::text])))
);


--
-- Name: TABLE award_targets_enum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.award_targets_enum IS 'Canonical award targets from JTBD Index (initial/revised/final phases)';


--
-- Name: award_targets_enum_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.award_targets_enum_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: award_targets_enum_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.award_targets_enum_id_seq OWNED BY public.award_targets_enum.id;


--
-- Name: award_targets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.award_targets_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: award_targets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.award_targets_id_seq OWNED BY public.award_targets.id;


--
-- Name: canon; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.canon (
    key text NOT NULL,
    student_id text NOT NULL,
    source_type text NOT NULL,
    source_title text NOT NULL,
    section text,
    jtbd_id text,
    drive_link text,
    date_range text,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    message_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    session_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    created_ts timestamp with time zone DEFAULT now(),
    CONSTRAINT chat_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])))
);


--
-- Name: chat_session_summaries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_session_summaries (
    session_id uuid NOT NULL,
    summary text NOT NULL,
    message_count integer DEFAULT 0 NOT NULL,
    last_summarized_at timestamp with time zone DEFAULT now(),
    created_ts timestamp with time zone DEFAULT now(),
    updated_ts timestamp with time zone DEFAULT now()
);


--
-- Name: chat_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_sessions (
    session_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    student_id text NOT NULL,
    created_ts timestamp with time zone DEFAULT now(),
    updated_ts timestamp with time zone DEFAULT now()
);


--
-- Name: coaches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coaches (
    coach_id character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    name text NOT NULL,
    email text,
    bio text,
    specialization text[] DEFAULT '{}'::text[] NOT NULL,
    expertise_areas text[],
    llm_adapter_model text,
    system_prompt_override text,
    temperature numeric(3,2) DEFAULT 0.7,
    response_style text DEFAULT 'balanced'::text,
    emoji_usage boolean DEFAULT true,
    warmth_level text DEFAULT 'high'::text,
    is_active boolean DEFAULT true,
    CONSTRAINT valid_response_style CHECK ((response_style = ANY (ARRAY['balanced'::text, 'concise'::text, 'detailed'::text]))),
    CONSTRAINT valid_temperature CHECK (((temperature >= 0.0) AND (temperature <= 2.0))),
    CONSTRAINT valid_warmth CHECK ((warmth_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])))
);


--
-- Name: TABLE coaches; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.coaches IS 'v13.0: Multi-coach support with specialization and LLM configuration';


--
-- Name: college_list; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.college_list (
    college_id integer NOT NULL,
    student_id text,
    college_name text NOT NULL,
    bucket_category text,
    decision_plan text,
    decision_result text,
    waitlist boolean DEFAULT false,
    program text,
    supplements text,
    location text,
    acceptance_rate numeric,
    interview_status text,
    ivyready_score_at_submit numeric,
    created_ts timestamp with time zone DEFAULT now(),
    attending boolean DEFAULT false,
    CONSTRAINT college_list_bucket_category_check CHECK ((bucket_category = ANY (ARRAY['Wild Card'::text, 'Reach'::text, 'Match'::text, 'Safety'::text]))),
    CONSTRAINT college_list_decision_plan_check CHECK ((decision_plan = ANY (ARRAY['EA'::text, 'ED'::text, 'RD'::text, 'REA'::text, 'Rolling'::text]))),
    CONSTRAINT college_list_decision_result_check CHECK ((decision_result = ANY (ARRAY['Accepted'::text, 'Rejected'::text, 'Waitlisted'::text, 'Deferred'::text, 'Withdrawn'::text, 'Pending'::text])))
);


--
-- Name: college_list_college_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.college_list_college_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: college_list_college_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.college_list_college_id_seq OWNED BY public.college_list.college_id;


--
-- Name: conversation_turns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversation_turns (
    turn_id bigint NOT NULL,
    session_id character varying(100) NOT NULL,
    turn_number integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    student_message text NOT NULL,
    coach_response text NOT NULL,
    intent_detected jsonb,
    intelligence_used jsonb,
    cat1_data jsonb,
    cat2_data jsonb,
    cat3_data jsonb,
    quality_score jsonb,
    was_healed boolean DEFAULT false,
    healing_reason text,
    has_pronouns boolean DEFAULT false,
    resolved_references jsonb,
    action_items_given text[],
    latency_ms integer,
    cat1_latency_ms integer,
    cat2_latency_ms integer,
    cat3_latency_ms integer,
    context_hydration_latency_ms integer
);


--
-- Name: TABLE conversation_turns; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.conversation_turns IS 'v13.0: Turn-by-turn dialogue tracking with multi-dimensional intent';


--
-- Name: conversation_turns_turn_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.conversation_turns_turn_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: conversation_turns_turn_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.conversation_turns_turn_id_seq OWNED BY public.conversation_turns.turn_id;


--
-- Name: cross_namespace_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cross_namespace_links (
    id integer NOT NULL,
    source_chip_id text NOT NULL,
    target_chip_id text NOT NULL,
    relation_type text NOT NULL,
    confidence numeric(5,4),
    created_by text DEFAULT 'system'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT cross_namespace_links_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric))),
    CONSTRAINT cross_namespace_links_relation_type_check CHECK ((relation_type = ANY (ARRAY['supports'::text, 'contradicts'::text, 'elaborates'::text, 'supersedes'::text, 'references'::text])))
);


--
-- Name: TABLE cross_namespace_links; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cross_namespace_links IS 'v8.0: Semantic graph edges connecting chips across namespaces';


--
-- Name: cross_namespace_links_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cross_namespace_links_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cross_namespace_links_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cross_namespace_links_id_seq OWNED BY public.cross_namespace_links.id;


--
-- Name: ec_targets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ec_targets (
    id bigint NOT NULL,
    student_id text NOT NULL,
    phase text NOT NULL,
    item_label text NOT NULL,
    as_of date,
    source_id text,
    jtbd_id text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ec_targets_phase_check CHECK ((phase = ANY (ARRAY['initial'::text, 'revised'::text, 'final'::text])))
);


--
-- Name: TABLE ec_targets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ec_targets IS 'Canonical EC targets from JTBD Index (initial/revised/final phases)';


--
-- Name: ec_targets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ec_targets_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ec_targets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ec_targets_id_seq OWNED BY public.ec_targets.id;


--
-- Name: ec_vitals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ec_vitals (
    vital_id text NOT NULL,
    student_id text NOT NULL,
    chip_id text NOT NULL,
    activity_name text NOT NULL,
    metric_type text NOT NULL,
    metric_name text NOT NULL,
    numeric_value numeric,
    text_value text,
    unit text,
    as_of date NOT NULL,
    source_id text NOT NULL,
    notes text,
    evidence_text text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ec_vitals_check CHECK (((numeric_value IS NOT NULL) OR (text_value IS NOT NULL))),
    CONSTRAINT ec_vitals_metric_type_check CHECK ((metric_type = ANY (ARRAY['scale'::text, 'financial'::text, 'product'::text, 'leadership'::text, 'impact'::text, 'selection'::text])))
);


--
-- Name: TABLE ec_vitals; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ec_vitals IS 'v10.6: Fact-based metric tracking for EC progression (Cat-1)';


--
-- Name: COLUMN ec_vitals.metric_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ec_vitals.metric_type IS 'Category from CommonApp analysis: scale, financial, product, leadership, impact, selection';


--
-- Name: COLUMN ec_vitals.metric_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ec_vitals.metric_name IS 'Specific metric tracked: funding_raised, students_reached, team_size, etc.';


--
-- Name: COLUMN ec_vitals.as_of; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ec_vitals.as_of IS 'Snapshot date - enables temporal progression queries';


--
-- Name: COLUMN ec_vitals.source_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ec_vitals.source_id IS 'Source gating: SRC-GAMEPLAN (initial), SRC-COMMONAPP (final), SRC-SNAPSHOT (weekly)';


--
-- Name: COLUMN ec_vitals.evidence_text; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ec_vitals.evidence_text IS 'Original text from description where metric was extracted';


--
-- Name: emotional_trajectory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emotional_trajectory (
    trajectory_id bigint NOT NULL,
    student_id character varying(100) NOT NULL,
    session_id character varying(100),
    turn_id bigint,
    measured_at timestamp with time zone DEFAULT now() NOT NULL,
    detection_method text NOT NULL,
    mood text NOT NULL,
    stress_level integer NOT NULL,
    sentiment_score numeric(4,3),
    trigger_event text,
    trigger_category text,
    detected_from text NOT NULL,
    confidence_score numeric(3,2),
    CONSTRAINT valid_confidence_et CHECK (((confidence_score IS NULL) OR ((confidence_score >= 0.0) AND (confidence_score <= 1.0)))),
    CONSTRAINT valid_sentiment CHECK (((sentiment_score IS NULL) OR ((sentiment_score >= '-1.0'::numeric) AND (sentiment_score <= 1.0)))),
    CONSTRAINT valid_stress_level CHECK (((stress_level >= 1) AND (stress_level <= 10)))
);


--
-- Name: TABLE emotional_trajectory; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.emotional_trajectory IS 'v13.0: Emotional state tracking over time for pattern detection';


--
-- Name: emotional_trajectory_trajectory_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.emotional_trajectory_trajectory_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: emotional_trajectory_trajectory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.emotional_trajectory_trajectory_id_seq OWNED BY public.emotional_trajectory.trajectory_id;


--
-- Name: eq_signal_sets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.eq_signal_sets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_path text NOT NULL,
    student_id text NOT NULL,
    phase text,
    weeks text,
    date_label text,
    summary jsonb,
    created_at timestamp with time zone DEFAULT now(),
    hash_sha256 text,
    week text,
    source_type text DEFAULT 'sessions'::text,
    title text,
    started_at text,
    ended_at text,
    provenance_uri text,
    ingested_at timestamp without time zone DEFAULT now()
);


--
-- Name: TABLE eq_signal_sets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.eq_signal_sets IS 'Parent container for each EQ analysis file (iMessage/session)';


--
-- Name: eq_signals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.eq_signals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    set_id uuid,
    cue text NOT NULL,
    strength numeric,
    exemplar text,
    provenance jsonb,
    counts jsonb,
    meta jsonb,
    evidence_hash text GENERATED ALWAYS AS (md5(COALESCE(exemplar, ''::text))) STORED
);


--
-- Name: TABLE eq_signals; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.eq_signals IS 'Atomic emotional intelligence cues extracted from conversations';


--
-- Name: eq_cue_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.eq_cue_summary AS
 SELECT ss.student_id,
    ss.phase,
    s.cue,
    count(*) AS signal_count,
    avg(s.strength) AS avg_strength,
    array_agg(DISTINCT s.exemplar) FILTER (WHERE (s.exemplar IS NOT NULL)) AS exemplars
   FROM (public.eq_signals s
     JOIN public.eq_signal_sets ss ON ((s.set_id = ss.id)))
  GROUP BY ss.student_id, ss.phase, s.cue;


--
-- Name: VIEW eq_cue_summary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.eq_cue_summary IS 'Aggregated cue statistics per student/phase';


--
-- Name: eq_cues_by_source; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.eq_cues_by_source AS
 SELECT
        CASE
            WHEN (ss.source_path ~~ '%imsg%'::text) THEN 'imsg'::text
            WHEN (ss.source_path ~~ '%session%'::text) THEN 'sessions'::text
            ELSE 'unknown'::text
        END AS source_type,
    s.cue AS cue_type,
    count(*) AS signal_count,
    avg(s.strength) AS avg_strength,
    count(DISTINCT ss.id) AS n_files
   FROM (public.eq_signals s
     JOIN public.eq_signal_sets ss ON ((s.set_id = ss.id)))
  GROUP BY
        CASE
            WHEN (ss.source_path ~~ '%imsg%'::text) THEN 'imsg'::text
            WHEN (ss.source_path ~~ '%session%'::text) THEN 'sessions'::text
            ELSE 'unknown'::text
        END, s.cue;


--
-- Name: VIEW eq_cues_by_source; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.eq_cues_by_source IS 'Cue distribution by source type (imsg/sessions)';


--
-- Name: eq_signal_cues; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.eq_signal_cues AS
 SELECT s.id AS signal_id,
    s.set_id,
    s.cue AS cue_type,
    s.strength AS score,
    s.exemplar,
    s.provenance
   FROM public.eq_signals s;


--
-- Name: VIEW eq_signal_cues; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.eq_signal_cues IS 'Compatibility view: maps eq_signals to cue-focused format';


--
-- Name: eq_utterances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.eq_utterances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    set_id uuid,
    speaker text,
    text text,
    move_type text,
    cues jsonb,
    provenance jsonb
);


--
-- Name: TABLE eq_utterances; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.eq_utterances IS 'Turn-level conversation spans with style annotations';


--
-- Name: eq_signal_tactics; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.eq_signal_tactics AS
 SELECT u.id AS utterance_id,
    u.set_id AS signal_id,
    u.move_type AS tactic_type,
    u.speaker,
    u.text,
    u.cues,
    u.provenance
   FROM public.eq_utterances u
  WHERE (u.move_type IS NOT NULL);


--
-- Name: VIEW eq_signal_tactics; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.eq_signal_tactics IS 'Compatibility view: maps eq_utterances to tactic-focused format';


--
-- Name: eq_tactics_by_student; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.eq_tactics_by_student AS
 SELECT ss.student_id,
    ss.phase,
    u.move_type AS tactic_type,
    count(*) AS usage_count,
    array_agg("left"(u.text, 100)) AS sample_texts
   FROM (public.eq_utterances u
     JOIN public.eq_signal_sets ss ON ((u.set_id = ss.id)))
  WHERE (u.move_type IS NOT NULL)
  GROUP BY ss.student_id, ss.phase, u.move_type;


--
-- Name: VIEW eq_tactics_by_student; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.eq_tactics_by_student IS 'Tactic usage patterns per student/phase';


--
-- Name: evidence_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evidence_links (
    evidence_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    source_id text NOT NULL,
    snippet_id text,
    offset_start integer,
    offset_end integer,
    quote text,
    created_ts timestamp with time zone DEFAULT now()
);


--
-- Name: fact_kind_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fact_kind_rules (
    kind text NOT NULL,
    datatype public.fact_datatype NOT NULL,
    min_numeric double precision,
    max_numeric double precision,
    enum_values text[],
    regex text,
    unit text,
    prefer_confidence boolean DEFAULT true,
    freshness_half_life_d integer DEFAULT 365,
    source_priority jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: facts_normalized; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.facts_normalized AS
 SELECT f.fact_id,
    f.student_id,
    f.kind,
    f.value,
    f.unit,
    f.fact_date,
    f.source_id,
    f.created_ts,
    f.confidence,
    r.datatype,
        CASE
            WHEN (r.datatype = 'int'::public.fact_datatype) THEN
            CASE
                WHEN (f.value ~ '^\d+$'::text) THEN ((f.value)::bigint)::text
                WHEN (f.value ~ '^\d+\.\d+$'::text) THEN ((round((f.value)::numeric))::bigint)::text
                ELSE NULL::text
            END
            WHEN (r.datatype = 'float'::public.fact_datatype) THEN
            CASE
                WHEN (f.value ~ '^\d+(\.\d+)?$'::text) THEN ((f.value)::double precision)::text
                ELSE NULL::text
            END
            WHEN (r.datatype = 'boolean'::public.fact_datatype) THEN
            CASE
                WHEN (lower(f.value) = ANY (ARRAY['true'::text, 'false'::text, '1'::text, '0'::text, 'yes'::text, 'no'::text, 't'::text, 'f'::text, 'y'::text, 'n'::text])) THEN ((lower(f.value) = ANY (ARRAY['true'::text, '1'::text, 'yes'::text, 't'::text, 'y'::text])))::text
                ELSE NULL::text
            END
            WHEN (r.datatype = 'date'::public.fact_datatype) THEN
            CASE
                WHEN (f.value ~ '^\d{4}-\d{2}-\d{2}'::text) THEN ((f.value)::date)::text
                ELSE NULL::text
            END
            WHEN (r.datatype = 'enum'::public.fact_datatype) THEN f.value
            ELSE f.value
        END AS normalized_value,
        CASE
            WHEN (r.kind IS NULL) THEN false
            WHEN (r.datatype = ANY (ARRAY['int'::public.fact_datatype, 'float'::public.fact_datatype])) THEN
            CASE
                WHEN (f.value ~ '^\d+(\.\d+)?$'::text) THEN (((r.min_numeric IS NULL) OR (((f.value)::numeric)::double precision >= r.min_numeric)) AND ((r.max_numeric IS NULL) OR (((f.value)::numeric)::double precision <= r.max_numeric)))
                ELSE false
            END
            WHEN (r.datatype = 'boolean'::public.fact_datatype) THEN (lower(f.value) = ANY (ARRAY['true'::text, 'false'::text, '1'::text, '0'::text, 'yes'::text, 'no'::text, 't'::text, 'f'::text, 'y'::text, 'n'::text]))
            WHEN (r.datatype = 'date'::public.fact_datatype) THEN (f.value ~ '^\d{4}-\d{2}-\d{2}'::text)
            WHEN (r.datatype = 'enum'::public.fact_datatype) THEN ((r.enum_values IS NULL) OR (f.value = ANY (r.enum_values)))
            WHEN (r.datatype = 'string'::public.fact_datatype) THEN ((r.regex IS NULL) OR (f.value ~ r.regex))
            ELSE false
        END AS is_valid,
        CASE
            WHEN (r.kind IS NULL) THEN ('Unknown fact kind: '::text || f.kind)
            WHEN ((r.datatype = ANY (ARRAY['int'::public.fact_datatype, 'float'::public.fact_datatype])) AND (NOT (f.value ~ '^\d+(\.\d+)?$'::text))) THEN ('Not a number: '::text || f.value)
            WHEN ((r.datatype = ANY (ARRAY['int'::public.fact_datatype, 'float'::public.fact_datatype])) AND (f.value ~ '^\d+(\.\d+)?$'::text)) THEN
            CASE
                WHEN ((r.min_numeric IS NOT NULL) AND (((f.value)::numeric)::double precision < r.min_numeric)) THEN ((('Below minimum '::text || r.min_numeric) || ': '::text) || f.value)
                WHEN ((r.max_numeric IS NOT NULL) AND (((f.value)::numeric)::double precision > r.max_numeric)) THEN ((('Above maximum '::text || r.max_numeric) || ': '::text) || f.value)
                ELSE NULL::text
            END
            WHEN ((r.datatype = 'boolean'::public.fact_datatype) AND (lower(f.value) <> ALL (ARRAY['true'::text, 'false'::text, '1'::text, '0'::text, 'yes'::text, 'no'::text, 't'::text, 'f'::text, 'y'::text, 'n'::text]))) THEN ('Not a boolean: '::text || f.value)
            WHEN ((r.datatype = 'date'::public.fact_datatype) AND (NOT (f.value ~ '^\d{4}-\d{2}-\d{2}'::text))) THEN ('Not a valid date: '::text || f.value)
            WHEN ((r.datatype = 'enum'::public.fact_datatype) AND (r.enum_values IS NOT NULL) AND (NOT (f.value = ANY (r.enum_values)))) THEN ((('Not in allowed values ('::text || array_to_string(r.enum_values, ', '::text)) || '): '::text) || f.value)
            ELSE NULL::text
        END AS validation_error
   FROM (public.vital_facts f
     LEFT JOIN public.fact_kind_rules r ON ((f.kind = r.kind)));


--
-- Name: fact_invalid_examples; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.fact_invalid_examples AS
 SELECT facts_normalized.kind,
    facts_normalized.student_id,
    facts_normalized.value AS invalid_value,
    facts_normalized.validation_error,
    facts_normalized.source_id,
    facts_normalized.fact_date
   FROM public.facts_normalized
  WHERE (facts_normalized.is_valid = false)
  ORDER BY facts_normalized.fact_date DESC
 LIMIT 100;


--
-- Name: fact_kinds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fact_kinds (
    kind text NOT NULL,
    description text
);


--
-- Name: fact_observations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fact_observations (
    obs_id text NOT NULL,
    student_id text NOT NULL,
    kind text NOT NULL,
    value_numeric numeric,
    value_text text,
    unit text,
    is_official boolean DEFAULT false NOT NULL,
    is_practice boolean DEFAULT false NOT NULL,
    attempt_no integer,
    event_date date NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    source_id text NOT NULL,
    confidence text NOT NULL,
    origin text NOT NULL,
    dedupe_fingerprint text NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT fact_observations_confidence_check CHECK ((confidence = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])))
);


--
-- Name: fact_priorities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fact_priorities (
    kind text NOT NULL,
    weight_official integer DEFAULT 100 NOT NULL,
    weight_conf_high integer DEFAULT 30 NOT NULL,
    weight_conf_med integer DEFAULT 15 NOT NULL,
    weight_recent_days integer DEFAULT 0 NOT NULL,
    preferred_sources text[] DEFAULT '{}'::text[] NOT NULL,
    blocked_sources text[] DEFAULT '{}'::text[] NOT NULL
);


--
-- Name: fact_quality_report; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.fact_quality_report AS
 SELECT facts_normalized.kind,
    count(*) FILTER (WHERE (facts_normalized.is_valid = true)) AS valid_count,
    count(*) FILTER (WHERE (facts_normalized.is_valid = false)) AS invalid_count,
    round(((100.0 * (count(*) FILTER (WHERE (facts_normalized.is_valid = true)))::numeric) / (NULLIF(count(*), 0))::numeric), 2) AS validity_pct,
    array_agg(DISTINCT facts_normalized.validation_error ORDER BY facts_normalized.validation_error) FILTER (WHERE (facts_normalized.validation_error IS NOT NULL)) AS error_types
   FROM public.facts_normalized
  GROUP BY facts_normalized.kind
  ORDER BY (count(*) FILTER (WHERE (facts_normalized.is_valid = false))) DESC, facts_normalized.kind;


--
-- Name: factor_feature_map; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.factor_feature_map (
    rubric_id text NOT NULL,
    factor_id text NOT NULL,
    feature_id text NOT NULL,
    weight_pct numeric NOT NULL
);


--
-- Name: facts_normalized_mv; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.facts_normalized_mv AS
 SELECT facts_normalized.fact_id,
    facts_normalized.student_id,
    facts_normalized.kind,
    facts_normalized.value,
    facts_normalized.unit,
    facts_normalized.fact_date,
    facts_normalized.source_id,
    facts_normalized.created_ts,
    facts_normalized.confidence,
    facts_normalized.datatype,
    facts_normalized.normalized_value,
    facts_normalized.is_valid,
    facts_normalized.validation_error
   FROM public.facts_normalized
  WITH NO DATA;


--
-- Name: feature_defs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_defs (
    feature_id text NOT NULL,
    domain text NOT NULL,
    label text NOT NULL,
    description text,
    scale_max numeric DEFAULT 100 NOT NULL,
    created_ts timestamp with time zone DEFAULT now()
);


--
-- Name: feature_snapshot_values; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_snapshot_values (
    snapshot_id uuid NOT NULL,
    feature_id text NOT NULL,
    value_norm numeric NOT NULL,
    evidence jsonb DEFAULT '{}'::jsonb
);


--
-- Name: feature_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_snapshots (
    snapshot_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    student_id text NOT NULL,
    as_of date NOT NULL,
    rubric_id text NOT NULL,
    engine text DEFAULT 'sql_v1'::text NOT NULL,
    created_ts timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE feature_snapshots; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.feature_snapshots IS 'Point-in-time feature captures for historical readiness tracking';


--
-- Name: framework_kinds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.framework_kinds (
    name text NOT NULL,
    description text
);


--
-- Name: interactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interactions (
    snippet_id text NOT NULL,
    jtbd_id text NOT NULL,
    student_id text NOT NULL,
    occurred_at timestamp with time zone NOT NULL,
    channel text NOT NULL,
    user_ask text,
    jenny_reply text,
    tactic_name text,
    framework text,
    tags text[],
    source_id text,
    excluded_from_tactic_scoring boolean DEFAULT false NOT NULL,
    created_ts timestamp with time zone DEFAULT now(),
    confidence public.fact_confidence
);


--
-- Name: interactions_fts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interactions_fts (
    id text NOT NULL,
    student_id text NOT NULL,
    snippet text NOT NULL,
    vector tsvector,
    created_ts timestamp with time zone DEFAULT now()
);


--
-- Name: ivyready_snapshot_factors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ivyready_snapshot_factors (
    snapshot_id uuid NOT NULL,
    factor_id text NOT NULL,
    raw_score numeric NOT NULL,
    weight_pct numeric NOT NULL,
    weighted_score numeric GENERATED ALWAYS AS (((raw_score * weight_pct) / 100.0)) STORED,
    details_json jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: ivyready_snapshot_features; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ivyready_snapshot_features (
    feature_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    snapshot_id uuid NOT NULL,
    feature_name text NOT NULL,
    feature_value text,
    feature_unit text,
    weight numeric,
    source_ref text,
    created_ts timestamp with time zone DEFAULT now()
);


--
-- Name: ivyready_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ivyready_snapshots (
    snapshot_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    student_id text NOT NULL,
    rubric_id text NOT NULL,
    snapshot_phase text NOT NULL,
    as_of date NOT NULL,
    engine text DEFAULT 'sql'::text NOT NULL,
    overall_score numeric,
    notes text,
    source_id text,
    created_ts timestamp with time zone DEFAULT now(),
    CONSTRAINT ivyready_snapshots_snapshot_phase_check CHECK ((snapshot_phase = ANY (ARRAY['assessment'::text, 'midpoint'::text, 'final_submit'::text, 'rolling'::text])))
);


--
-- Name: jtbd; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jtbd (
    jtbd_id text NOT NULL,
    student_id text NOT NULL,
    jtbd_title text NOT NULL,
    phase text,
    date_start timestamp with time zone,
    date_end timestamp with time zone,
    synopsis text,
    created_ts timestamp with time zone DEFAULT now()
);


--
-- Name: jtbd_fts; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.jtbd_fts AS
 SELECT jtbd.jtbd_id AS id,
    ((COALESCE(jtbd.jtbd_title, ''::text) || ' '::text) || COALESCE(jtbd.synopsis, ''::text)) AS text,
    json_build_object('student_id', jtbd.student_id, 'jtbd_id', jtbd.jtbd_id, 'phase', jtbd.phase) AS metadata,
    to_tsvector('english'::regconfig, ((COALESCE(jtbd.jtbd_title, ''::text) || ' '::text) || COALESCE(jtbd.synopsis, ''::text))) AS tsv
   FROM public.jtbd
  WITH NO DATA;


--
-- Name: jtbd_weekly; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jtbd_weekly (
    jtbd_id text NOT NULL,
    student_id text NOT NULL,
    week_number integer NOT NULL,
    week_start_date date NOT NULL,
    week_end_date date NOT NULL,
    job_type text NOT NULL,
    job_description text NOT NULL,
    linked_chip_id text,
    linked_table text,
    status text NOT NULL,
    completion_date date,
    outcome_metric text,
    outcome_value numeric,
    outcome_unit text,
    source_id text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT jtbd_weekly_check CHECK ((((status = 'completed'::text) AND (completion_date IS NOT NULL)) OR (status <> 'completed'::text))),
    CONSTRAINT jtbd_weekly_job_type_check CHECK ((job_type = ANY (ARRAY['application'::text, 'test'::text, 'award'::text, 'ec_milestone'::text, 'academic'::text, 'essay'::text, 'other'::text]))),
    CONSTRAINT jtbd_weekly_status_check CHECK ((status = ANY (ARRAY['planned'::text, 'in_progress'::text, 'completed'::text, 'deferred'::text, 'cancelled'::text])))
);


--
-- Name: kb_chip_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kb_chip_links (
    chip_id text NOT NULL,
    link_type text NOT NULL,
    link_key text NOT NULL
);


--
-- Name: kb_chips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kb_chips (
    chip_id text NOT NULL,
    doc_id text NOT NULL,
    student_id text NOT NULL,
    chip_type text NOT NULL,
    title text,
    summary text,
    content_json jsonb,
    tokens_est integer,
    started_at timestamp with time zone,
    ended_at timestamp with time zone,
    tags text[],
    created_ts timestamp with time zone DEFAULT now(),
    award text,
    activity text,
    framework text,
    metrics text[] DEFAULT '{}'::text[],
    confidence numeric,
    chip_date date,
    week integer,
    source_kind text,
    content_hash text,
    text text,
    tokens integer,
    meta jsonb DEFAULT '{}'::jsonb,
    phase text,
    CONSTRAINT kb_chips_chip_type_check CHECK ((chip_type = ANY (ARRAY['jtbd'::text, 'tactic'::text, 'micro_moment'::text, 'framework'::text, 'reflection'::text, 'success_path'::text, 'style'::text])))
);


--
-- Name: kb_docs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kb_docs (
    doc_id text NOT NULL,
    source_system text,
    drive_file_id text,
    drive_path text,
    filename text,
    mime_type text,
    student_id text,
    phase text,
    domain text,
    dt_anchor timestamp with time zone,
    sha256 text,
    meta_json jsonb DEFAULT '{}'::jsonb,
    created_ts timestamp with time zone DEFAULT now(),
    source_kind text,
    week integer,
    doc_date date,
    title text,
    path text,
    meta jsonb DEFAULT '{}'::jsonb
);


--
-- Name: kb_embeddings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kb_embeddings (
    chip_id text NOT NULL,
    embed_model text NOT NULL,
    embedding_dims integer NOT NULL,
    embedding_json jsonb NOT NULL,
    created_ts timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE kb_embeddings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.kb_embeddings IS 'Embeddings stored as JSONB; FAISS index is maintained externally';


--
-- Name: kb_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kb_items (
    item_id text NOT NULL,
    student_id text NOT NULL,
    item_type text NOT NULL,
    subtype text,
    title_name text NOT NULL,
    tier1_state text NOT NULL,
    tier2_substate text,
    status_detail text,
    key_metric_type text,
    key_metric_value text,
    key_metric_unit text,
    deadline_date date,
    event_date date,
    submit_date date,
    outcome_date date,
    owner text,
    cadence text,
    evidence_links text[],
    source_ref text NOT NULL,
    confidence text DEFAULT 'medium'::text,
    created_ts timestamp with time zone DEFAULT now(),
    updated_ts timestamp with time zone DEFAULT now(),
    edges jsonb DEFAULT '[]'::jsonb,
    CONSTRAINT kb_items_confidence_check CHECK ((confidence = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text]))),
    CONSTRAINT kb_items_tier1_state_check CHECK ((tier1_state = ANY (ARRAY['Planned'::text, 'In Transit'::text, 'Submitted'::text, 'Outcome'::text, 'Archived'::text])))
);


--
-- Name: TABLE kb_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.kb_items IS 'Universal ledger for all student targets and outcomes with explicit state machine (Planned → In Transit → Submitted → Outcome → Archived)';


--
-- Name: COLUMN kb_items.tier1_state; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kb_items.tier1_state IS 'Primary state: Planned | In Transit | Submitted | Outcome | Archived';


--
-- Name: COLUMN kb_items.tier2_substate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kb_items.tier2_substate IS 'Secondary state specific to item_type (e.g., Targeted, Applied, Winner, Finalist)';


--
-- Name: COLUMN kb_items.evidence_links; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kb_items.evidence_links IS 'Array of URLs to proofs, artifacts, confirmations';


--
-- Name: COLUMN kb_items.source_ref; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kb_items.source_ref IS 'Provenance reference (e.g., Common App UNC, Outcomes.csv row 42, GamePlan v1)';


--
-- Name: COLUMN kb_items.edges; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kb_items.edges IS 'v8.0: JSONB array of {target_id, relation} for self-learning graph';


--
-- Name: kb_scan_cursors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kb_scan_cursors (
    source_system text NOT NULL,
    last_sync_ts timestamp with time zone,
    last_cursor text
);


--
-- Name: kb_sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kb_sources (
    source_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    meta jsonb
);


--
-- Name: lifecycle_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lifecycle_items (
    item_id text NOT NULL,
    student_id text NOT NULL,
    jtbd_id text,
    school text,
    submitted_at timestamp with time zone,
    outcome_date timestamp with time zone,
    created_ts timestamp with time zone DEFAULT now(),
    status public.lifecycle_status NOT NULL,
    domain public.lifecycle_domain NOT NULL
);


--
-- Name: narrative_targets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.narrative_targets (
    id bigint NOT NULL,
    student_id text NOT NULL,
    narrative text NOT NULL,
    as_of date,
    source_id text,
    jtbd_id text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE narrative_targets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.narrative_targets IS 'Initial narrative targets from GamePlan';


--
-- Name: narrative_targets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.narrative_targets_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: narrative_targets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.narrative_targets_id_seq OWNED BY public.narrative_targets.id;


--
-- Name: observations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.observations (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    student_id text NOT NULL,
    kind text NOT NULL,
    subtype text,
    value jsonb NOT NULL,
    source text NOT NULL,
    at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: outcomes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.outcomes (
    outcome_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    jtbd_id text,
    student_id text NOT NULL,
    type public.outcome_type NOT NULL,
    admission_result public.admission_result,
    lifecycle_item_id text,
    details_json jsonb,
    occurred_at timestamp with time zone,
    source_id text,
    created_ts timestamp with time zone DEFAULT now()
);


--
-- Name: outcomes_backup_20250930_151933; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.outcomes_backup_20250930_151933 (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    student_id text NOT NULL,
    category text NOT NULL,
    name text NOT NULL,
    metrics jsonb NOT NULL,
    period text,
    evidence text[] DEFAULT '{}'::text[],
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: outcomes_backup_20250930_152339; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.outcomes_backup_20250930_152339 (
    outcome_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    jtbd_id text,
    student_id text NOT NULL,
    lifecycle_item_id text,
    details_json jsonb,
    occurred_at timestamp with time zone,
    source_id text,
    created_ts timestamp with time zone DEFAULT now()
);


--
-- Name: outcomes_backup_20250930_152520; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.outcomes_backup_20250930_152520 (
    outcome_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    jtbd_id text,
    student_id text NOT NULL,
    lifecycle_item_id text,
    details_json jsonb,
    occurred_at timestamp with time zone,
    source_id text,
    created_ts timestamp with time zone DEFAULT now()
);


--
-- Name: outcomes_backup_20250930_152622; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.outcomes_backup_20250930_152622 (
    outcome_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    jtbd_id text,
    student_id text NOT NULL,
    lifecycle_item_id text,
    details_json jsonb,
    occurred_at timestamp with time zone,
    source_id text,
    created_ts timestamp with time zone DEFAULT now()
);


--
-- Name: outcomes_backup_20250930_152919; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.outcomes_backup_20250930_152919 (
    outcome_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    jtbd_id text,
    student_id text NOT NULL,
    lifecycle_item_id text,
    details_json jsonb,
    occurred_at timestamp with time zone,
    source_id text,
    created_ts timestamp with time zone DEFAULT now()
);


--
-- Name: outcomes_backup_20250930_153115; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.outcomes_backup_20250930_153115 (
    outcome_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    jtbd_id text,
    student_id text NOT NULL,
    lifecycle_item_id text,
    details_json jsonb,
    occurred_at timestamp with time zone,
    source_id text,
    created_ts timestamp with time zone DEFAULT now()
);


--
-- Name: outcomes_backup_20250930_153331; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.outcomes_backup_20250930_153331 (
    outcome_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    jtbd_id text,
    student_id text NOT NULL,
    lifecycle_item_id text,
    details_json jsonb,
    occurred_at timestamp with time zone,
    source_id text,
    created_ts timestamp with time zone DEFAULT now()
);


--
-- Name: outcomes_backup_20250930_153430; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.outcomes_backup_20250930_153430 (
    outcome_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    jtbd_id text,
    student_id text NOT NULL,
    lifecycle_item_id text,
    details_json jsonb,
    occurred_at timestamp with time zone,
    source_id text,
    created_ts timestamp with time zone DEFAULT now()
);


--
-- Name: plan_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_events (
    id bigint NOT NULL,
    student_id text NOT NULL,
    as_of date NOT NULL,
    event text NOT NULL,
    jtbd_id text,
    snippet_id text,
    source_id text,
    text text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE plan_events; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.plan_events IS 'Execution timeline events from Interactions.csv (iMessage/calls)';


--
-- Name: plan_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.plan_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: plan_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.plan_events_id_seq OWNED BY public.plan_events.id;


--
-- Name: proof_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proof_audit_log (
    id integer NOT NULL,
    artifact_id text,
    action text,
    actor text NOT NULL,
    previous_score numeric(5,4),
    new_score numeric(5,4),
    reason text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT proof_audit_log_action_check CHECK ((action = ANY (ARRAY['verify'::text, 'update'::text, 'invalidate'::text, 'escalate'::text])))
);


--
-- Name: proof_audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.proof_audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: proof_audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.proof_audit_log_id_seq OWNED BY public.proof_audit_log.id;


--
-- Name: proof_registry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proof_registry (
    artifact_id text NOT NULL,
    chip_id text,
    hash character(64) NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    verified boolean DEFAULT false,
    score numeric(5,4),
    artifact_type text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT proof_registry_artifact_type_check CHECK ((artifact_type = ANY (ARRAY['chip'::text, 'session'::text, 'outcome'::text, 'plan'::text]))),
    CONSTRAINT proof_registry_score_check CHECK (((score >= (0)::numeric) AND (score <= (1)::numeric)))
);


--
-- Name: TABLE proof_registry; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.proof_registry IS 'v8.0: Tracks all artifacts with cryptographic verification hashes';


--
-- Name: query_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.query_log (
    id bigint NOT NULL,
    ts timestamp with time zone DEFAULT now(),
    route text,
    student_id text,
    q text,
    latency_ms integer,
    hits integer,
    chips integer,
    index_name text
);


--
-- Name: query_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.query_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: query_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.query_log_id_seq OWNED BY public.query_log.id;


--
-- Name: query_trace_artifacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.query_trace_artifacts (
    id bigint NOT NULL,
    trace_id uuid NOT NULL,
    kind text NOT NULL,
    content jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: query_trace_artifacts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.query_trace_artifacts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: query_trace_artifacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.query_trace_artifacts_id_seq OWNED BY public.query_trace_artifacts.id;


--
-- Name: query_trace_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.query_trace_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trace_id uuid NOT NULL,
    sequence integer NOT NULL,
    component text NOT NULL,
    operation text NOT NULL,
    start_time timestamp with time zone DEFAULT now() NOT NULL,
    end_time timestamp with time zone,
    duration_ms integer GENERATED ALWAYS AS (
CASE
    WHEN (end_time IS NOT NULL) THEN (EXTRACT(milliseconds FROM (end_time - start_time)))::integer
    ELSE NULL::integer
END) STORED,
    api_provider text,
    api_method text,
    api_request jsonb,
    api_response jsonb,
    api_error text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: query_traces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.query_traces (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id text NOT NULL,
    student_id text NOT NULL,
    message text NOT NULL,
    intent text,
    detected_fact_kinds text[],
    start_time timestamp with time zone DEFAULT now() NOT NULL,
    end_time timestamp with time zone,
    duration_ms integer GENERATED ALWAYS AS (
CASE
    WHEN (end_time IS NOT NULL) THEN (EXTRACT(milliseconds FROM (end_time - start_time)))::integer
    ELSE NULL::integer
END) STORED,
    final_answer text,
    error text,
    model_used text,
    tokens_used jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: readiness_feature_weights; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.readiness_feature_weights (
    feature_key text NOT NULL,
    domain text NOT NULL,
    target_value numeric,
    impact_coefficient numeric,
    qualitative_weight numeric DEFAULT 0,
    description text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE readiness_feature_weights; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.readiness_feature_weights IS 'Universal feature impact model for IvyReady scoring';


--
-- Name: COLUMN readiness_feature_weights.feature_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.readiness_feature_weights.feature_key IS 'Unique feature identifier (e.g., sat_total, ecs_users_empowering_ai)';


--
-- Name: COLUMN readiness_feature_weights.domain; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.readiness_feature_weights.domain IS 'Feature domain (testing, academics, awards, ecs, narrative, programs)';


--
-- Name: COLUMN readiness_feature_weights.target_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.readiness_feature_weights.target_value IS 'Ivy+ competitive benchmark value';


--
-- Name: COLUMN readiness_feature_weights.impact_coefficient; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.readiness_feature_weights.impact_coefficient IS 'Weight of feature on IvyReady score (0-1)';


--
-- Name: readiness_forecast_features; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.readiness_forecast_features (
    id integer NOT NULL,
    user_id text NOT NULL,
    snapshot_date date NOT NULL,
    readiness_score numeric(5,4),
    sat_act_delta integer,
    essay_quality_score numeric(5,4),
    award_tier_count integer,
    ec_depth_score numeric(5,4),
    recommendation_count integer,
    features jsonb NOT NULL,
    predicted_outcome text,
    confidence numeric(5,4),
    actual_outcome text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE readiness_forecast_features; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.readiness_forecast_features IS 'v8.0: Feature store for outcome forecasting model';


--
-- Name: readiness_forecast_features_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.readiness_forecast_features_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: readiness_forecast_features_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.readiness_forecast_features_id_seq OWNED BY public.readiness_forecast_features.id;


--
-- Name: readiness_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.readiness_snapshots (
    snapshot_id text DEFAULT ('snap-'::text || (gen_random_uuid())::text) NOT NULL,
    student_id text NOT NULL,
    snapshot_name text NOT NULL,
    ivy_ready_score numeric(5,2),
    features_json jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE readiness_snapshots; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.readiness_snapshots IS 'Time-series snapshots of student readiness state';


--
-- Name: COLUMN readiness_snapshots.features_json; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.readiness_snapshots.features_json IS 'Serialized v_features_all snapshot with domain grouping';


--
-- Name: recent_traces; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.recent_traces AS
SELECT
    NULL::uuid AS id,
    NULL::text AS session_id,
    NULL::text AS student_id,
    NULL::text AS message,
    NULL::text AS intent,
    NULL::text[] AS detected_fact_kinds,
    NULL::timestamp with time zone AS start_time,
    NULL::integer AS duration_ms,
    NULL::text AS model_used,
    NULL::text AS error,
    NULL::bigint AS event_count,
    NULL::bigint AS api_providers_used;


--
-- Name: sat_timeline_enum; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sat_timeline_enum (
    id bigint NOT NULL,
    student_id text NOT NULL,
    as_of date NOT NULL,
    numeric_value integer NOT NULL,
    type text,
    confidence text,
    source_id text,
    raw_name text,
    raw_value text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE sat_timeline_enum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.sat_timeline_enum IS 'SAT score timeline from Facts.csv with temporal ordering';


--
-- Name: sat_timeline_enum_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sat_timeline_enum_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sat_timeline_enum_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sat_timeline_enum_id_seq OWNED BY public.sat_timeline_enum.id;


--
-- Name: scholarships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scholarships (
    scholarship_id integer NOT NULL,
    student_id text,
    scholarship_name text NOT NULL,
    sponsor_org text,
    amount_usd numeric,
    application_status text,
    decision_date date,
    notes text,
    created_ts timestamp with time zone DEFAULT now(),
    CONSTRAINT scholarships_application_status_check CHECK ((application_status = ANY (ARRAY['Applied'::text, 'Accepted'::text, 'Rejected'::text, 'Pending'::text])))
);


--
-- Name: scholarships_scholarship_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.scholarships_scholarship_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: scholarships_scholarship_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.scholarships_scholarship_id_seq OWNED BY public.scholarships.scholarship_id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    session_id character varying(100) NOT NULL,
    student_id character varying(100) NOT NULL,
    coach_id character varying(100) NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    session_type text NOT NULL,
    session_title text,
    turn_count integer DEFAULT 0,
    total_student_messages integer DEFAULT 0,
    total_coach_messages integer DEFAULT 0,
    cat1_queries_count integer DEFAULT 0,
    cat2_queries_count integer DEFAULT 0,
    cat3_queries_count integer DEFAULT 0,
    unified_queries_count integer DEFAULT 0,
    emotional_trajectory jsonb,
    avg_quality_score numeric(3,2),
    healing_rate numeric(3,2),
    action_items_given text[],
    deadlines_identified jsonb,
    is_active boolean DEFAULT true,
    CONSTRAINT valid_session_type CHECK ((session_type = ANY (ARRAY['Initial Assessment'::text, 'Weekly Check-in'::text, 'Essay Review'::text, 'Application Strategy'::text, 'EQ Support'::text, 'Test Prep'::text, 'General Chat'::text])))
);


--
-- Name: TABLE sessions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.sessions IS 'v13.0: Conversation groupings with multi-turn tracking';


--
-- Name: COLUMN sessions.unified_queries_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sessions.unified_queries_count IS 'v13.0: Queries using all 3 CATs simultaneously';


--
-- Name: sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sources (
    source_id text NOT NULL,
    student_id text NOT NULL,
    source_type text NOT NULL,
    title text NOT NULL,
    date_start timestamp with time zone,
    date_end timestamp with time zone,
    drive_link text,
    local_name text,
    notes text,
    created_ts timestamp with time zone DEFAULT now(),
    canonical_id text,
    CONSTRAINT sources_source_type_check CHECK ((source_type = ANY (ARRAY['transcript'::text, 'exec_doc'::text, 'imessage'::text, 'artifact'::text, 'submission'::text, 'email'::text, 'other'::text])))
);


--
-- Name: strategic_insights; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.strategic_insights (
    insight_id bigint NOT NULL,
    student_id character varying(100) NOT NULL,
    coach_id character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    insight_type text NOT NULL,
    insight_text text NOT NULL,
    insight_summary text,
    confidence_score numeric(3,2),
    quality_score numeric(3,2),
    source_chips text[],
    source_sessions text[],
    source_type text NOT NULL,
    is_active boolean DEFAULT true,
    is_evergreen boolean DEFAULT false,
    expires_at timestamp with time zone,
    times_surfaced integer DEFAULT 0,
    times_actioned integer DEFAULT 0,
    last_surfaced_at timestamp with time zone,
    CONSTRAINT valid_confidence CHECK (((confidence_score IS NULL) OR ((confidence_score >= 0.0) AND (confidence_score <= 1.0)))),
    CONSTRAINT valid_quality CHECK (((quality_score IS NULL) OR ((quality_score >= 0.0) AND (quality_score <= 1.0)))),
    CONSTRAINT valid_source_type CHECK ((source_type = ANY (ARRAY['kb_chip'::text, 'session_transcript'::text, 'manual'::text])))
);


--
-- Name: TABLE strategic_insights; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.strategic_insights IS 'v13.0: Persisted strategic insights from KB analysis';


--
-- Name: strategic_insights_insight_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.strategic_insights_insight_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: strategic_insights_insight_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.strategic_insights_insight_id_seq OWNED BY public.strategic_insights.insight_id;


--
-- Name: student_coach_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_coach_assignments (
    student_id character varying(100) NOT NULL,
    coach_id character varying(100) NOT NULL,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    assigned_by text,
    is_primary boolean DEFAULT false,
    role text NOT NULL,
    is_active boolean DEFAULT true,
    unassigned_at timestamp with time zone,
    unassignment_reason text,
    CONSTRAINT valid_role CHECK ((role = ANY (ARRAY['Primary Strategist'::text, 'Essay Specialist'::text, 'EQ Support'::text, 'Test Prep Coach'::text, 'Activities Coach'::text, 'General Coach'::text])))
);


--
-- Name: TABLE student_coach_assignments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.student_coach_assignments IS 'v13.0: N:M relationship between students and coaches';


--
-- Name: student_facts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_facts (
    id integer NOT NULL,
    student_id text NOT NULL,
    fact_key text NOT NULL,
    fact_value text NOT NULL,
    fact_when timestamp without time zone,
    provenance_chip_id text,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: student_facts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.student_facts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: student_facts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.student_facts_id_seq OWNED BY public.student_facts.id;


--
-- Name: student_policy_memory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_policy_memory (
    id integer NOT NULL,
    student_id text NOT NULL,
    memory_key text NOT NULL,
    memory_value jsonb NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: student_policy_memory_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.student_policy_memory_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: student_policy_memory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.student_policy_memory_id_seq OWNED BY public.student_policy_memory.id;


--
-- Name: student_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_state (
    student_id text NOT NULL,
    vitals jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.students (
    student_id text NOT NULL,
    full_name text,
    grad_year integer,
    created_ts timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    email text,
    phone text,
    high_school text,
    graduation_year integer,
    gpa_unweighted numeric(3,2),
    gpa_weighted numeric(3,2),
    sat_score integer,
    act_score integer,
    ap_courses_count integer DEFAULT 0,
    ec_spike_theme text,
    awards_count integer DEFAULT 0,
    leadership_positions text[],
    target_schools text[],
    target_major text,
    early_decision_school text,
    CONSTRAINT valid_act_students CHECK (((act_score IS NULL) OR ((act_score >= 1) AND (act_score <= 36)))),
    CONSTRAINT valid_gpa_uw_students CHECK (((gpa_unweighted IS NULL) OR ((gpa_unweighted >= 0.0) AND (gpa_unweighted <= 4.0)))),
    CONSTRAINT valid_gpa_w_students CHECK (((gpa_weighted IS NULL) OR ((gpa_weighted >= 0.0) AND (gpa_weighted <= 5.0)))),
    CONSTRAINT valid_grad_year_students CHECK (((graduation_year IS NULL) OR ((graduation_year >= 2020) AND (graduation_year <= 2030)))),
    CONSTRAINT valid_sat_students CHECK (((sat_score IS NULL) OR ((sat_score >= 400) AND (sat_score <= 1600))))
);


--
-- Name: TABLE students; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.students IS 'v13.0: Extended with profile snapshots (denormalized for <100ms context hydration)';


--
-- Name: COLUMN students.gpa_unweighted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.students.gpa_unweighted IS 'Denormalized from v_academics_gpa_latest view for fast context hydration';


--
-- Name: COLUMN students.ec_spike_theme; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.students.ec_spike_theme IS 'Denormalized strategic insight from KB analysis';


--
-- Name: COLUMN students.target_schools; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.students.target_schools IS 'Array for fast IN queries during outcome prediction';


--
-- Name: tactic_kinds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tactic_kinds (
    name text NOT NULL,
    description text
);


--
-- Name: tone_cue_training; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tone_cue_training (
    id integer NOT NULL,
    chip_id text,
    prompt text NOT NULL,
    response text NOT NULL,
    tone_label text,
    tone_score numeric(5,4),
    source_namespace text,
    user_id text,
    session_id text,
    validated boolean DEFAULT false,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tone_cue_training_tone_label_check CHECK ((tone_label = ANY (ARRAY['warm'::text, 'firm'::text, 'encouraging'::text, 'reflective'::text, 'analytical'::text, 'empathetic'::text]))),
    CONSTRAINT tone_cue_training_tone_score_check CHECK (((tone_score >= (0)::numeric) AND (tone_score <= (1)::numeric)))
);


--
-- Name: TABLE tone_cue_training; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tone_cue_training IS 'v8.0: Training data for LLM Adapter v2 tone fine-tuning';


--
-- Name: tone_cue_training_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tone_cue_training_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tone_cue_training_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tone_cue_training_id_seq OWNED BY public.tone_cue_training.id;


--
-- Name: trust_cue_training; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trust_cue_training (
    id integer NOT NULL,
    session_id text NOT NULL,
    user_id text NOT NULL,
    interaction_sequence jsonb NOT NULL,
    trust_score numeric(5,4),
    eq_score numeric(5,4),
    citation_accuracy numeric(5,4),
    validated boolean DEFAULT false,
    validator_notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT trust_cue_training_citation_accuracy_check CHECK (((citation_accuracy >= (0)::numeric) AND (citation_accuracy <= (1)::numeric))),
    CONSTRAINT trust_cue_training_eq_score_check CHECK (((eq_score >= (0)::numeric) AND (eq_score <= (1)::numeric))),
    CONSTRAINT trust_cue_training_trust_score_check CHECK (((trust_score >= (0)::numeric) AND (trust_score <= (1)::numeric)))
);


--
-- Name: TABLE trust_cue_training; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.trust_cue_training IS 'v8.0: Session transcripts for EQ and trust modeling';


--
-- Name: trust_cue_training_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.trust_cue_training_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: trust_cue_training_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.trust_cue_training_id_seq OWNED BY public.trust_cue_training.id;


--
-- Name: unified_context; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unified_context (
    context_id bigint NOT NULL,
    student_id character varying(100) NOT NULL,
    session_id character varying(100),
    snapshot_at timestamp with time zone DEFAULT now() NOT NULL,
    cache_key text NOT NULL,
    profile_snapshot jsonb NOT NULL,
    progress_snapshot jsonb NOT NULL,
    emotional_state jsonb NOT NULL,
    strategy_memory jsonb NOT NULL,
    recent_turns jsonb,
    outcome_metrics jsonb,
    is_stale boolean DEFAULT false,
    cache_duration_seconds integer DEFAULT 300,
    expires_at timestamp with time zone,
    hydration_latency_ms integer,
    source_tables text[],
    CONSTRAINT valid_cache_duration CHECK ((cache_duration_seconds > 0))
);


--
-- Name: TABLE unified_context; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.unified_context IS 'v13.0: Cached context snapshots for <100ms hydration';


--
-- Name: unified_context_context_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.unified_context_context_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: unified_context_context_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.unified_context_context_id_seq OWNED BY public.unified_context.context_id;


--
-- Name: v_academics_latest; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_academics_latest AS
 SELECT DISTINCT ON (academics_vitals.student_id) academics_vitals.student_id,
    academics_vitals.week_no,
    academics_vitals.as_of_date,
    academics_vitals.gpa_unweighted,
    academics_vitals.gpa_weighted,
    academics_vitals.ap_count_cum,
    academics_vitals.honors_count_cum,
    academics_vitals.core_stem_load,
    academics_vitals.workload_hours_week
   FROM public.academics_vitals
  ORDER BY academics_vitals.student_id, academics_vitals.week_no DESC;


--
-- Name: VIEW v_academics_latest; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_academics_latest IS 'Latest academic vitals for quick lookups';


--
-- Name: v_gpa_latest; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_gpa_latest AS
 SELECT DISTINCT ON (academic_gpa.student_id, academic_gpa.scope, academic_gpa.scope_key) academic_gpa.student_id,
    academic_gpa.scope,
    academic_gpa.scope_key,
    academic_gpa.gpa_unweighted,
    academic_gpa.gpa_weighted,
    academic_gpa.credits_attempted,
    academic_gpa.credits_earned,
    academic_gpa.calc_method,
    academic_gpa.recorded_at,
    academic_gpa.source_id,
    academic_gpa.confidence,
    academic_gpa.gpa_id AS chip_id,
    'academic_gpa'::text AS chip_table
   FROM public.academic_gpa
  ORDER BY academic_gpa.student_id, academic_gpa.scope, academic_gpa.scope_key, (academic_gpa.source_id = 'SRC-COMMONAPP-UNC'::text) DESC, academic_gpa.confidence DESC, academic_gpa.recorded_at DESC;


--
-- Name: v_academics_overview; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_academics_overview AS
 WITH sat_progress AS (
         SELECT sat_timeline_enum.student_id,
            sat_timeline_enum.as_of AS sat_date,
            sat_timeline_enum.numeric_value AS sat_score,
            sat_timeline_enum.type,
            sat_timeline_enum.confidence,
            sat_timeline_enum.source_id
           FROM public.sat_timeline_enum
        )
 SELECT g.student_id,
    g.scope,
    g.scope_key,
    g.gpa_unweighted,
    g.gpa_weighted,
    g.recorded_at AS gpa_recorded_at,
    g.source_id AS gpa_source,
    s.sat_date,
    s.sat_score,
    s.type AS sat_type,
    s.source_id AS sat_source
   FROM (public.v_gpa_latest g
     LEFT JOIN sat_progress s ON ((s.student_id = g.student_id)))
  ORDER BY g.student_id, g.recorded_at DESC, s.sat_date;


--
-- Name: v_academics_trend; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_academics_trend AS
 SELECT academics_vitals.student_id,
    min(academics_vitals.week_no) AS first_week,
    max(academics_vitals.week_no) AS last_week,
    min(academics_vitals.gpa_unweighted) FILTER (WHERE (academics_vitals.gpa_unweighted IS NOT NULL)) AS gpa_u_min,
    max(academics_vitals.gpa_unweighted) FILTER (WHERE (academics_vitals.gpa_unweighted IS NOT NULL)) AS gpa_u_max,
    min(academics_vitals.gpa_weighted) FILTER (WHERE (academics_vitals.gpa_weighted IS NOT NULL)) AS gpa_w_min,
    max(academics_vitals.gpa_weighted) FILTER (WHERE (academics_vitals.gpa_weighted IS NOT NULL)) AS gpa_w_max,
    max(academics_vitals.ap_count_cum) AS ap_max,
    count(*) AS weeks_recorded
   FROM public.academics_vitals
  GROUP BY academics_vitals.student_id;


--
-- Name: VIEW v_academics_trend; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_academics_trend IS 'Academic trend aggregates (min/max GPA, AP count) for analysis';


--
-- Name: v_awards_won; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_awards_won AS
 SELECT outcomes.student_id,
    COALESCE((outcomes.details_json ->> 'award_name'::text), (outcomes.details_json ->> 'label'::text), (outcomes.details_json ->> 'title'::text), '(award)'::text) AS award_name,
    COALESCE((outcomes.details_json ->> 'tier'::text), (outcomes.details_json ->> 'level'::text)) AS tier,
    (outcomes.occurred_at)::date AS won_date,
    outcomes.source_id,
    (outcomes.outcome_id)::text AS chip_id,
    'outcomes'::text AS chip_table
   FROM public.outcomes
  WHERE (outcomes.type = 'achievement'::public.outcome_type);


--
-- Name: VIEW v_awards_won; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_awards_won IS 'Awards won from final awards (alias of v_awards_final)';


--
-- Name: v_features_academics; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_features_academics AS
 WITH latest_gpa_unweighted AS (
         SELECT DISTINCT ON (academic_gpa.student_id) academic_gpa.student_id,
            academic_gpa.gpa_id,
            academic_gpa.source_id,
            academic_gpa.gpa_unweighted,
            academic_gpa.recorded_at
           FROM public.academic_gpa
          WHERE (academic_gpa.gpa_unweighted IS NOT NULL)
          ORDER BY academic_gpa.student_id, academic_gpa.recorded_at DESC
        ), latest_gpa_weighted AS (
         SELECT DISTINCT ON (academic_gpa.student_id) academic_gpa.student_id,
            academic_gpa.gpa_id,
            academic_gpa.source_id,
            academic_gpa.gpa_weighted,
            academic_gpa.recorded_at
           FROM public.academic_gpa
          WHERE (academic_gpa.gpa_weighted IS NOT NULL)
          ORDER BY academic_gpa.student_id, academic_gpa.recorded_at DESC
        )
 SELECT latest_gpa_unweighted.student_id,
    'academic_gpa'::text AS chip_table,
    latest_gpa_unweighted.gpa_id AS chip_id,
    latest_gpa_unweighted.source_id,
    'academics'::text AS domain,
    'gpa_unweighted'::text AS feature_key,
    latest_gpa_unweighted.gpa_unweighted AS feature_value,
    latest_gpa_unweighted.recorded_at AS measured_at
   FROM latest_gpa_unweighted
UNION ALL
 SELECT latest_gpa_weighted.student_id,
    'academic_gpa'::text AS chip_table,
    latest_gpa_weighted.gpa_id AS chip_id,
    latest_gpa_weighted.source_id,
    'academics'::text AS domain,
    'gpa_weighted'::text AS feature_key,
    latest_gpa_weighted.gpa_weighted AS feature_value,
    latest_gpa_weighted.recorded_at AS measured_at
   FROM latest_gpa_weighted
UNION ALL
 SELECT academic_courses.student_id,
    'academic_courses'::text AS chip_table,
    academic_courses.student_id AS chip_id,
    'aggregate'::text AS source_id,
    'academics'::text AS domain,
    'ap_courses_count'::text AS feature_key,
    (count(*))::numeric AS feature_value,
    max(academic_courses.updated_ts) AS measured_at
   FROM public.academic_courses
  WHERE (academic_courses.level = 'AP'::text)
  GROUP BY academic_courses.student_id;


--
-- Name: v_features_awards; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_features_awards AS
 SELECT v_awards_won.student_id,
    'v_awards_won'::text AS chip_table,
    v_awards_won.student_id AS chip_id,
    'aggregate'::text AS source_id,
    'awards'::text AS domain,
    'national_awards_count'::text AS feature_key,
    (count(*) FILTER (WHERE (v_awards_won.tier = 'National'::text)))::numeric AS feature_value,
    max((v_awards_won.won_date AT TIME ZONE 'UTC'::text)) AS measured_at
   FROM public.v_awards_won
  GROUP BY v_awards_won.student_id
UNION ALL
 SELECT v_awards_won.student_id,
    'v_awards_won'::text AS chip_table,
    v_awards_won.student_id AS chip_id,
    'aggregate'::text AS source_id,
    'awards'::text AS domain,
    'regional_awards_count'::text AS feature_key,
    (count(*) FILTER (WHERE (v_awards_won.tier = 'Regional'::text)))::numeric AS feature_value,
    max((v_awards_won.won_date AT TIME ZONE 'UTC'::text)) AS measured_at
   FROM public.v_awards_won
  GROUP BY v_awards_won.student_id
UNION ALL
 SELECT v_awards_won.student_id,
    'v_awards_won'::text AS chip_table,
    v_awards_won.student_id AS chip_id,
    'aggregate'::text AS source_id,
    'awards'::text AS domain,
    'international_awards_count'::text AS feature_key,
    (count(*) FILTER (WHERE (v_awards_won.tier = 'International'::text)))::numeric AS feature_value,
    max((v_awards_won.won_date AT TIME ZONE 'UTC'::text)) AS measured_at
   FROM public.v_awards_won
  GROUP BY v_awards_won.student_id;


--
-- Name: VIEW v_features_awards; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_features_awards IS 'Awards features: Award counts by tier from v_awards_won';


--
-- Name: v_features_ecs; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_features_ecs AS
 SELECT kb_items.student_id,
    'kb_items'::text AS chip_table,
    kb_items.student_id AS chip_id,
    'aggregate'::text AS source_id,
    'ecs'::text AS domain,
    'leadership_roles_count'::text AS feature_key,
    (count(*) FILTER (WHERE ((kb_items.title_name ~~* '%president%'::text) OR (kb_items.title_name ~~* '%founder%'::text) OR (kb_items.title_name ~~* '%captain%'::text) OR (kb_items.title_name ~~* '%director%'::text))))::numeric AS feature_value,
    max(kb_items.updated_ts) AS measured_at
   FROM public.kb_items
  WHERE (kb_items.item_type = ANY (ARRAY['ec'::text, 'activity'::text]))
  GROUP BY kb_items.student_id
UNION ALL
 SELECT kb_items.student_id,
    'kb_items'::text AS chip_table,
    kb_items.student_id AS chip_id,
    'aggregate'::text AS source_id,
    'ecs'::text AS domain,
    'scale_signal_ecs_count'::text AS feature_key,
    (count(*))::numeric AS feature_value,
    max(kb_items.updated_ts) AS measured_at
   FROM public.kb_items
  WHERE ((kb_items.item_type = ANY (ARRAY['ec'::text, 'activity'::text])) AND ((kb_items.key_metric_value IS NOT NULL) OR (kb_items.tier1_state IS NOT NULL)))
  GROUP BY kb_items.student_id;


--
-- Name: VIEW v_features_ecs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_features_ecs IS 'EC features: Leadership roles and scale signals from kb_items';


--
-- Name: v_features_narrative; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_features_narrative AS
 SELECT kb_items.student_id,
    'kb_items'::text AS chip_table,
    kb_items.student_id AS chip_id,
    'aggregate'::text AS source_id,
    'narrative'::text AS domain,
    'essay_completeness_pct'::text AS feature_key,
    round((((count(*) FILTER (WHERE (kb_items.status_detail IS NOT NULL)))::numeric / (NULLIF(count(*), 0))::numeric) * (100)::numeric), 2) AS feature_value,
    max(kb_items.updated_ts) AS measured_at
   FROM public.kb_items
  WHERE (kb_items.item_type = 'narrative'::text)
  GROUP BY kb_items.student_id
UNION ALL
 SELECT kb_items.student_id,
    'kb_items'::text AS chip_table,
    kb_items.item_id AS chip_id,
    kb_items.source_ref AS source_id,
    'narrative'::text AS domain,
    'personal_statement_word_count'::text AS feature_key,
        CASE
            WHEN (kb_items.key_metric_value ~ '^[0-9]+$'::text) THEN (kb_items.key_metric_value)::numeric
            ELSE (0)::numeric
        END AS feature_value,
    kb_items.updated_ts AS measured_at
   FROM public.kb_items
  WHERE ((kb_items.item_type = 'narrative'::text) AND (kb_items.title_name ~~* '%personal statement%'::text));


--
-- Name: VIEW v_features_narrative; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_features_narrative IS 'Narrative features: Essay completeness from kb_items';


--
-- Name: v_programs_final; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_programs_final AS
 SELECT kb_items.item_id,
    kb_items.student_id,
    kb_items.title_name AS program_name,
    COALESCE(kb_items.status_detail, 'N/A'::text) AS provider,
    kb_items.event_date,
    kb_items.submit_date,
    kb_items.source_ref AS source_id,
    kb_items.item_id AS chip_id,
    'kb_items'::text AS chip_table
   FROM public.kb_items
  WHERE ((kb_items.item_type = 'ec'::text) AND (kb_items.subtype = 'summer_program'::text) AND (kb_items.tier1_state = 'Submitted'::text));


--
-- Name: v_features_programs; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_features_programs AS
 SELECT v_programs_final.student_id,
    'v_programs_final'::text AS chip_table,
    v_programs_final.student_id AS chip_id,
    'aggregate'::text AS source_id,
    'programs'::text AS domain,
    'acceptances_count'::text AS feature_key,
    (count(*))::numeric AS feature_value,
    max((v_programs_final.submit_date AT TIME ZONE 'UTC'::text)) AS measured_at
   FROM public.v_programs_final
  GROUP BY v_programs_final.student_id;


--
-- Name: VIEW v_features_programs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_features_programs IS 'Programs features: Summer program counts from v_programs_final';


--
-- Name: v_features_testing; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_features_testing AS
 SELECT DISTINCT ON (sat_timeline_enum.student_id) sat_timeline_enum.student_id,
    'sat_timeline_enum'::text AS chip_table,
    (sat_timeline_enum.id)::text AS chip_id,
    sat_timeline_enum.source_id,
    'testing'::text AS domain,
    'sat_composite'::text AS feature_key,
    (sat_timeline_enum.numeric_value)::numeric AS feature_value,
    (sat_timeline_enum.as_of AT TIME ZONE 'UTC'::text) AS measured_at
   FROM public.sat_timeline_enum
  WHERE ((sat_timeline_enum.type = 'official'::text) AND (sat_timeline_enum.numeric_value IS NOT NULL))
  ORDER BY sat_timeline_enum.student_id, sat_timeline_enum.as_of DESC;


--
-- Name: VIEW v_features_testing; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_features_testing IS 'Testing features: Latest SAT score from sat_timeline_enum';


--
-- Name: v_features_all; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_features_all AS
 SELECT v_features_testing.student_id,
    v_features_testing.chip_table,
    v_features_testing.chip_id,
    v_features_testing.source_id,
    v_features_testing.domain,
    v_features_testing.feature_key,
    v_features_testing.feature_value,
    v_features_testing.measured_at
   FROM public.v_features_testing
UNION ALL
 SELECT v_features_awards.student_id,
    v_features_awards.chip_table,
    v_features_awards.chip_id,
    v_features_awards.source_id,
    v_features_awards.domain,
    v_features_awards.feature_key,
    v_features_awards.feature_value,
    v_features_awards.measured_at
   FROM public.v_features_awards
UNION ALL
 SELECT v_features_ecs.student_id,
    v_features_ecs.chip_table,
    v_features_ecs.chip_id,
    v_features_ecs.source_id,
    v_features_ecs.domain,
    v_features_ecs.feature_key,
    v_features_ecs.feature_value,
    v_features_ecs.measured_at
   FROM public.v_features_ecs
UNION ALL
 SELECT v_features_narrative.student_id,
    v_features_narrative.chip_table,
    v_features_narrative.chip_id,
    v_features_narrative.source_id,
    v_features_narrative.domain,
    v_features_narrative.feature_key,
    v_features_narrative.feature_value,
    v_features_narrative.measured_at
   FROM public.v_features_narrative
UNION ALL
 SELECT v_features_academics.student_id,
    v_features_academics.chip_table,
    v_features_academics.chip_id,
    v_features_academics.source_id,
    v_features_academics.domain,
    v_features_academics.feature_key,
    v_features_academics.feature_value,
    v_features_academics.measured_at
   FROM public.v_features_academics
UNION ALL
 SELECT v_features_programs.student_id,
    v_features_programs.chip_table,
    v_features_programs.chip_id,
    v_features_programs.source_id,
    v_features_programs.domain,
    v_features_programs.feature_key,
    v_features_programs.feature_value,
    v_features_programs.measured_at
   FROM public.v_features_programs;


--
-- Name: VIEW v_features_all; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_features_all IS 'Unified view of all student features for readiness analysis';


--
-- Name: v_factor_scores_current; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_factor_scores_current AS
 WITH feature_values AS (
         SELECT v_features_all.student_id,
            v_features_all.domain,
            v_features_all.feature_key,
            v_features_all.feature_value
           FROM public.v_features_all
        ), academics_score AS (
         SELECT fv.student_id,
            'academics'::text AS factor,
            round(LEAST((100)::numeric, GREATEST((0)::numeric, ((COALESCE(( SELECT feature_values.feature_value
                   FROM feature_values
                  WHERE ((feature_values.student_id = fv.student_id) AND (feature_values.feature_key = 'gpa_unweighted'::text))), (0)::numeric) * (25)::numeric) + (COALESCE(( SELECT feature_values.feature_value
                   FROM feature_values
                  WHERE ((feature_values.student_id = fv.student_id) AND (feature_values.feature_key = 'ap_courses_count'::text))), (0)::numeric) * (5)::numeric)))), 2) AS score,
            0.40 AS weight
           FROM ( SELECT DISTINCT feature_values.student_id
                   FROM feature_values) fv
        ), awards_score AS (
         SELECT fv.student_id,
            'awards'::text AS factor,
            round(LEAST((100)::numeric, GREATEST((0)::numeric, (((COALESCE(( SELECT feature_values.feature_value
                   FROM feature_values
                  WHERE ((feature_values.student_id = fv.student_id) AND (feature_values.feature_key = 'international_awards_count'::text))), (0)::numeric) * (40)::numeric) + (COALESCE(( SELECT feature_values.feature_value
                   FROM feature_values
                  WHERE ((feature_values.student_id = fv.student_id) AND (feature_values.feature_key = 'national_awards_count'::text))), (0)::numeric) * (20)::numeric)) + (COALESCE(( SELECT feature_values.feature_value
                   FROM feature_values
                  WHERE ((feature_values.student_id = fv.student_id) AND (feature_values.feature_key = 'regional_awards_count'::text))), (0)::numeric) * (10)::numeric)))), 2) AS score,
            0.25 AS weight
           FROM ( SELECT DISTINCT feature_values.student_id
                   FROM feature_values) fv
        ), leadership_score AS (
         SELECT fv.student_id,
            'leadership'::text AS factor,
            round(LEAST((100)::numeric, GREATEST((0)::numeric, ((COALESCE(( SELECT feature_values.feature_value
                   FROM feature_values
                  WHERE ((feature_values.student_id = fv.student_id) AND (feature_values.feature_key = 'leadership_roles_count'::text))), (0)::numeric) * (15)::numeric) + (COALESCE(( SELECT feature_values.feature_value
                   FROM feature_values
                  WHERE ((feature_values.student_id = fv.student_id) AND (feature_values.feature_key = 'scale_signal_ecs_count'::text))), (0)::numeric) * (10)::numeric)))), 2) AS score,
            0.20 AS weight
           FROM ( SELECT DISTINCT feature_values.student_id
                   FROM feature_values) fv
        ), programs_score AS (
         SELECT fv.student_id,
            'programs'::text AS factor,
            round(LEAST((100)::numeric, GREATEST((0)::numeric, (COALESCE(( SELECT feature_values.feature_value
                   FROM feature_values
                  WHERE ((feature_values.student_id = fv.student_id) AND (feature_values.feature_key = 'acceptances_count'::text))), (0)::numeric) * (20)::numeric))), 2) AS score,
            0.10 AS weight
           FROM ( SELECT DISTINCT feature_values.student_id
                   FROM feature_values) fv
        ), narrative_score AS (
         SELECT fv.student_id,
            'narrative'::text AS factor,
            round(LEAST((100)::numeric, GREATEST((0)::numeric, COALESCE(( SELECT feature_values.feature_value
                   FROM feature_values
                  WHERE ((feature_values.student_id = fv.student_id) AND (feature_values.feature_key = 'essay_completeness_pct'::text))), (0)::numeric))), 2) AS score,
            0.05 AS weight
           FROM ( SELECT DISTINCT feature_values.student_id
                   FROM feature_values) fv
        )
 SELECT academics_score.student_id,
    academics_score.factor,
    academics_score.score,
    academics_score.weight
   FROM academics_score
UNION ALL
 SELECT awards_score.student_id,
    awards_score.factor,
    awards_score.score,
    awards_score.weight
   FROM awards_score
UNION ALL
 SELECT leadership_score.student_id,
    leadership_score.factor,
    leadership_score.score,
    leadership_score.weight
   FROM leadership_score
UNION ALL
 SELECT programs_score.student_id,
    programs_score.factor,
    programs_score.score,
    programs_score.weight
   FROM programs_score
UNION ALL
 SELECT narrative_score.student_id,
    narrative_score.factor,
    narrative_score.score,
    narrative_score.weight
   FROM narrative_score;


--
-- Name: VIEW v_factor_scores_current; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_factor_scores_current IS 'Weighted factor scores from current features (academics 40%, awards 25%, leadership 20%, programs 10%, narrative 5%)';


--
-- Name: v_ivyready_current; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ivyready_current AS
 SELECT v_factor_scores_current.student_id,
    round(sum((v_factor_scores_current.score * v_factor_scores_current.weight)), 2) AS ivy_ready_score,
    jsonb_object_agg(v_factor_scores_current.factor, v_factor_scores_current.score ORDER BY v_factor_scores_current.factor) AS factor_breakdown,
    now() AS calculated_at
   FROM public.v_factor_scores_current
  GROUP BY v_factor_scores_current.student_id;


--
-- Name: VIEW v_ivyready_current; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_ivyready_current IS 'Composite IvyReady score (0-100) with factor breakdown';


--
-- Name: v_action_ivyready_delta; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_action_ivyready_delta AS
 WITH base_scores AS (
         SELECT v_ivyready_current.student_id,
            v_ivyready_current.ivy_ready_score AS base_score,
            v_ivyready_current.factor_breakdown
           FROM public.v_ivyready_current
        ), sat_actions AS (
         SELECT bs.student_id,
            'raise_sat_to'::text AS action_type,
            (targets.target_sat)::text AS action_param,
            bs.base_score,
            round((bs.base_score + (((((targets.target_sat)::numeric / 1600.0) * (60)::numeric) - COALESCE((((bs.factor_breakdown ->> 'academics'::text))::numeric * 0.6), (0)::numeric)) * 0.40)), 2) AS projected_score,
            round((((((targets.target_sat)::numeric / 1600.0) * (60)::numeric) - COALESCE((((bs.factor_breakdown ->> 'academics'::text))::numeric * 0.6), (0)::numeric)) * 0.40), 2) AS delta
           FROM (base_scores bs
             CROSS JOIN ( SELECT generate_series(1200, 1600, 50) AS target_sat) targets)
        ), award_actions AS (
         SELECT bs.student_id,
            'win_award_tier'::text AS action_type,
            tiers.tier AS action_param,
            bs.base_score,
            round((bs.base_score + ((tiers.tier_bump)::numeric * 0.25)), 2) AS projected_score,
            round(((tiers.tier_bump)::numeric * 0.25), 2) AS delta
           FROM (base_scores bs
             CROSS JOIN ( VALUES ('International'::text,40), ('National'::text,20), ('Regional'::text,10)) tiers(tier, tier_bump))
        )
 SELECT sat_actions.student_id,
    sat_actions.action_type,
    sat_actions.action_param,
    sat_actions.base_score,
    sat_actions.projected_score,
    sat_actions.delta
   FROM sat_actions
UNION ALL
 SELECT award_actions.student_id,
    award_actions.action_type,
    award_actions.action_param,
    award_actions.base_score,
    award_actions.projected_score,
    award_actions.delta
   FROM award_actions;


--
-- Name: VIEW v_action_ivyready_delta; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_action_ivyready_delta IS 'Pre-calculated what-if deltas for SAT targets and award tiers';


--
-- Name: v_applications_timeline; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_applications_timeline AS
 SELECT kb_items.item_id,
    kb_items.student_id,
    kb_items.item_type,
    kb_items.subtype,
    kb_items.title_name,
    kb_items.tier1_state,
    kb_items.tier2_substate,
    kb_items.status_detail,
    kb_items.key_metric_type,
    kb_items.key_metric_value,
    kb_items.key_metric_unit,
    kb_items.deadline_date,
    kb_items.event_date,
    kb_items.submit_date,
    kb_items.outcome_date,
    kb_items.owner,
    kb_items.cadence,
    kb_items.evidence_links,
    kb_items.source_ref,
    kb_items.confidence,
    kb_items.created_ts,
    kb_items.updated_ts
   FROM public.kb_items
  WHERE (kb_items.item_type = 'Application'::text)
  ORDER BY kb_items.student_id, COALESCE(kb_items.submit_date, kb_items.deadline_date);


--
-- Name: v_award_targets_asof; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_award_targets_asof AS
 SELECT at1.id,
    at1.student_id,
    at1.award_label,
    at1.tier,
    at1.rationale,
    at1.phase,
    at1.as_of,
    at1.confidence,
    at1.source_id,
    at1.created_at,
    at1.updated_at
   FROM (public.award_targets at1
     JOIN ( SELECT award_targets.student_id,
            max(award_targets.as_of) AS max_as_of
           FROM public.award_targets
          GROUP BY award_targets.student_id) last ON (((last.student_id = at1.student_id) AND (last.max_as_of = at1.as_of))));


--
-- Name: v_award_targets_initial; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_award_targets_initial AS
 SELECT award_targets.id,
    award_targets.student_id,
    award_targets.award_label,
    award_targets.tier,
    award_targets.rationale,
    award_targets.phase,
    award_targets.as_of,
    award_targets.confidence,
    award_targets.source_id,
    award_targets.created_at,
    award_targets.updated_at
   FROM public.award_targets
  WHERE (award_targets.phase = 'initial'::text);


--
-- Name: v_award_targets_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_award_targets_summary AS
 SELECT award_targets.student_id,
    award_targets.phase,
    count(*) AS target_count,
    award_targets.as_of,
    string_agg(award_targets.award_label, '; '::text ORDER BY award_targets.award_label) AS awards_list,
    award_targets.source_id
   FROM public.award_targets
  GROUP BY award_targets.student_id, award_targets.phase, award_targets.as_of, award_targets.source_id;


--
-- Name: v_awards_enum_final; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_awards_enum_final AS
 SELECT award_targets_enum.id,
    award_targets_enum.student_id,
    award_targets_enum.phase,
    award_targets_enum.item_label,
    award_targets_enum.as_of,
    award_targets_enum.source_id,
    award_targets_enum.jtbd_id,
    award_targets_enum.created_at,
    award_targets_enum.updated_at
   FROM public.award_targets_enum
  WHERE (award_targets_enum.phase = 'final'::text)
  ORDER BY award_targets_enum.as_of, award_targets_enum.item_label;


--
-- Name: v_awards_enum_initial; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_awards_enum_initial AS
 SELECT award_targets_enum.id,
    award_targets_enum.student_id,
    award_targets_enum.phase,
    award_targets_enum.item_label,
    award_targets_enum.as_of,
    award_targets_enum.source_id,
    award_targets_enum.jtbd_id,
    award_targets_enum.created_at,
    award_targets_enum.updated_at
   FROM public.award_targets_enum
  WHERE (award_targets_enum.phase = 'initial'::text)
  ORDER BY award_targets_enum.as_of, award_targets_enum.item_label;


--
-- Name: v_awards_enum_won; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_awards_enum_won AS
 SELECT plan_events.student_id,
    plan_events.as_of,
    plan_events.text AS evidence,
    plan_events.source_id,
    plan_events.jtbd_id,
    plan_events.snippet_id
   FROM public.plan_events
  WHERE (plan_events.event = 'award_won'::text)
  ORDER BY plan_events.as_of;


--
-- Name: VIEW v_awards_enum_won; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_awards_enum_won IS 'Awards won from execution timeline (plan_events)';


--
-- Name: v_awards_final_targets; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_awards_final_targets AS
 SELECT award_targets.student_id,
    award_targets.award_label AS award_name,
    award_targets.tier,
    award_targets.rationale,
    (award_targets.as_of)::date AS as_of,
    award_targets.source_id,
    (award_targets.id)::text AS chip_id
   FROM public.award_targets
  WHERE (award_targets.phase = 'final'::text);


--
-- Name: v_awards_initial; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_awards_initial AS
 WITH base AS (
         SELECT award_targets_enum.student_id,
            award_targets_enum.item_label AS award_label,
            ''::text AS tier,
            ''::text AS rationale,
            award_targets_enum.as_of,
            award_targets_enum.source_id,
            NULL::text AS chip_id,
            public.canon_label(award_targets_enum.item_label) AS canon
           FROM public.award_targets_enum
          WHERE (award_targets_enum.phase = 'initial'::text)
        )
 SELECT DISTINCT ON (base.student_id, base.canon) base.student_id,
    base.award_label AS award_name,
    base.tier,
    base.rationale,
    base.as_of,
    base.source_id,
    base.chip_id
   FROM base
  ORDER BY base.student_id, base.canon, base.as_of DESC;


--
-- Name: VIEW v_awards_initial; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_awards_initial IS 'Initial award targets with canonicalized label de-duplication';


--
-- Name: v_awards_progression; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_awards_progression AS
 WITH t AS (
         SELECT award_targets.student_id,
            award_targets.award_label AS award_name,
            'target'::text AS phase,
            (award_targets.as_of)::date AS as_of,
            award_targets.source_id,
            (award_targets.id)::text AS chip_id,
            'award_targets'::text AS chip_table
           FROM public.award_targets
        ), w AS (
         SELECT outcomes.student_id,
            COALESCE((outcomes.details_json ->> 'award_name'::text), (outcomes.details_json ->> 'title'::text), '(award)'::text) AS award_name,
            'won'::text AS phase,
            (outcomes.occurred_at)::date AS as_of,
            outcomes.source_id,
            (outcomes.outcome_id)::text AS chip_id,
            'outcomes'::text AS chip_table
           FROM public.outcomes
          WHERE ((outcomes.type)::text = 'award'::text)
        )
 SELECT u.student_id,
    u.award_name,
    u.phase,
    u.as_of,
    u.source_id,
    u.chip_id,
    u.chip_table
   FROM ( SELECT t.student_id,
            t.award_name,
            t.phase,
            t.as_of,
            t.source_id,
            t.chip_id,
            t.chip_table
           FROM t
        UNION ALL
         SELECT w.student_id,
            w.award_name,
            w.phase,
            w.as_of,
            w.source_id,
            w.chip_id,
            w.chip_table
           FROM w) u
  ORDER BY u.student_id, u.award_name, u.as_of;


--
-- Name: VIEW v_awards_progression; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_awards_progression IS 'Timeline: targets → wins';


--
-- Name: v_awards_timeline; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_awards_timeline AS
 SELECT kb_items.item_id,
    kb_items.student_id,
    kb_items.item_type,
    kb_items.subtype,
    kb_items.title_name,
    kb_items.tier1_state,
    kb_items.tier2_substate,
    kb_items.status_detail,
    kb_items.key_metric_type,
    kb_items.key_metric_value,
    kb_items.key_metric_unit,
    kb_items.deadline_date,
    kb_items.event_date,
    kb_items.submit_date,
    kb_items.outcome_date,
    kb_items.owner,
    kb_items.cadence,
    kb_items.evidence_links,
    kb_items.source_ref,
    kb_items.confidence,
    kb_items.created_ts,
    kb_items.updated_ts
   FROM public.kb_items
  WHERE (kb_items.item_type = 'Award_Competition'::text)
  ORDER BY kb_items.student_id, COALESCE((kb_items.event_date)::timestamp with time zone, (kb_items.submit_date)::timestamp with time zone, (kb_items.outcome_date)::timestamp with time zone, (kb_items.deadline_date)::timestamp with time zone, kb_items.created_ts);


--
-- Name: v_college_readiness_correlation; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_college_readiness_correlation AS
 SELECT c.student_id,
    c.college_name,
    c.bucket_category,
    c.decision_result,
    c.acceptance_rate,
    COALESCE(r.overall_score, (0)::numeric) AS ivyready_score_at_submit,
    rf.domain,
    rf.feature_key,
    rf.feature_value,
    (rf.feature_value / NULLIF(rfw.target_value, (0)::numeric)) AS relative_strength,
        CASE
            WHEN (c.decision_result = 'Accepted'::text) THEN (1)::numeric
            WHEN (c.decision_result = 'Waitlisted'::text) THEN 0.5
            ELSE (0)::numeric
        END AS acceptance_numeric
   FROM (((public.college_list c
     LEFT JOIN public.ivyready_snapshots r ON (((r.student_id = c.student_id) AND (r.snapshot_phase = 'final_submit'::text))))
     LEFT JOIN public.v_features_all rf ON ((rf.student_id = c.student_id)))
     LEFT JOIN public.readiness_feature_weights rfw ON ((rfw.feature_key = rf.feature_key)));


--
-- Name: v_ecs_all; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ecs_all AS
 SELECT kb_items.student_id,
    kb_items.title_name AS activity_name,
    kb_items.subtype AS category,
    kb_items.tier1_state,
    kb_items.tier2_substate,
    kb_items.status_detail,
    kb_items.key_metric_type,
    kb_items.key_metric_value,
    kb_items.key_metric_unit,
    kb_items.event_date,
    kb_items.submit_date,
    kb_items.outcome_date,
    kb_items.evidence_links,
    kb_items.source_ref AS source_id,
    kb_items.confidence,
    kb_items.item_id AS chip_id
   FROM public.kb_items
  WHERE (lower(kb_items.item_type) = ANY (ARRAY['ec'::text, 'activity'::text]));


--
-- Name: VIEW v_ecs_all; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_ecs_all IS 'All ECs/Activities from kb_items';


--
-- Name: v_ecs_final; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ecs_final AS
 SELECT v_ecs_all.student_id,
    v_ecs_all.activity_name,
    v_ecs_all.category,
    v_ecs_all.tier1_state,
    v_ecs_all.tier2_substate,
    v_ecs_all.status_detail,
    v_ecs_all.key_metric_type,
    v_ecs_all.key_metric_value,
    v_ecs_all.key_metric_unit,
    v_ecs_all.event_date,
    v_ecs_all.submit_date,
    v_ecs_all.outcome_date,
    v_ecs_all.evidence_links,
    v_ecs_all.source_id,
    v_ecs_all.confidence,
    v_ecs_all.chip_id
   FROM public.v_ecs_all
  WHERE (v_ecs_all.tier1_state = ANY (ARRAY['Submitted'::text, 'Outcome'::text]))
  ORDER BY COALESCE(v_ecs_all.outcome_date, v_ecs_all.submit_date), v_ecs_all.activity_name;


--
-- Name: VIEW v_ecs_final; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_ecs_final IS 'Final ECs (Submitted/Outcome states)';


--
-- Name: v_commonapp_activities; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_commonapp_activities AS
 WITH src AS (
         SELECT v_ecs_final.student_id,
            v_ecs_final.activity_name,
            v_ecs_final.category,
            v_ecs_final.tier1_state,
            v_ecs_final.tier2_substate,
            v_ecs_final.status_detail,
            v_ecs_final.key_metric_type,
            v_ecs_final.key_metric_value,
            v_ecs_final.key_metric_unit,
            v_ecs_final.event_date,
            v_ecs_final.submit_date,
            v_ecs_final.outcome_date,
            v_ecs_final.evidence_links,
            v_ecs_final.source_id,
            v_ecs_final.confidence,
            v_ecs_final.chip_id,
            public.canon_label(v_ecs_final.activity_name) AS canon_title,
                CASE
                    WHEN (v_ecs_final.activity_name ~* '^(founder|president|lead|captain|co-?founder|vp|director)\b'::text) THEN 2
                    ELSE 1
                END AS role_rank
           FROM public.v_ecs_final
        ), pick AS (
         SELECT DISTINCT ON (src.student_id, src.canon_title) src.student_id,
            src.activity_name,
            src.category,
            src.tier2_substate AS subcategory,
            src.status_detail AS role,
            src.key_metric_value AS metrics,
            src.submit_date,
            src.source_id,
            src.chip_id
           FROM src
          ORDER BY src.student_id, src.canon_title, src.role_rank DESC, src.submit_date DESC NULLS LAST
        )
 SELECT pick.student_id,
    pick.activity_name,
    pick.category,
    pick.subcategory,
    pick.role,
    pick.metrics,
    pick.submit_date,
    pick.source_id,
    pick.chip_id
   FROM pick
  ORDER BY COALESCE(pick.submit_date, CURRENT_DATE), pick.activity_name;


--
-- Name: VIEW v_commonapp_activities; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_commonapp_activities IS 'Common App activities (max 10) with duplicate collapse and role-prefix preference';


--
-- Name: v_commonapp_honors; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_commonapp_honors AS
 SELECT outcomes.student_id,
    COALESCE((outcomes.details_json ->> 'award_name'::text), (outcomes.details_json ->> 'title'::text)) AS honor_name,
    NULLIF((outcomes.details_json ->> 'tier'::text), ''::text) AS level,
    (outcomes.occurred_at)::date AS date_received,
    outcomes.source_id,
    (outcomes.outcome_id)::text AS chip_id
   FROM public.outcomes
  WHERE (((outcomes.type)::text = 'achievement'::text) AND (COALESCE((outcomes.details_json ->> 'award_name'::text), (outcomes.details_json ->> 'title'::text)) IS NOT NULL))
  ORDER BY ((outcomes.occurred_at)::date), COALESCE((outcomes.details_json ->> 'award_name'::text), (outcomes.details_json ->> 'title'::text));


--
-- Name: VIEW v_commonapp_honors; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_commonapp_honors IS 'Common App honors/awards (max 5) with null filtering';


--
-- Name: v_commonapp_submitted; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_commonapp_submitted AS
 SELECT s.student_id,
    ( SELECT jsonb_agg(row_to_json(a.*)) AS jsonb_agg
           FROM public.v_commonapp_activities a
          WHERE (a.student_id = s.student_id)) AS activities,
    ( SELECT jsonb_agg(row_to_json(h.*)) AS jsonb_agg
           FROM public.v_commonapp_honors h
          WHERE (h.student_id = s.student_id)) AS honors,
    ( SELECT jsonb_agg(row_to_json(v.*)) AS jsonb_agg
           FROM ( SELECT vital_facts.kind,
                    vital_facts.value,
                    vital_facts.numeric_value,
                    vital_facts.fact_date
                   FROM public.vital_facts
                  WHERE ((vital_facts.student_id = s.student_id) AND (vital_facts.kind = ANY (ARRAY['gpa_weighted'::text, 'gpa_unweighted'::text, 'sat_total_score'::text, 'sat_math'::text, 'sat_ebrw'::text])))
                  ORDER BY vital_facts.fact_date) v) AS academics
   FROM public.students s;


--
-- Name: VIEW v_commonapp_submitted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_commonapp_submitted IS 'Common App final template: Consolidated submission (activities + honors + academics)';


--
-- Name: v_cross_namespace_stats; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_cross_namespace_stats AS
 SELECT cross_namespace_links.relation_type,
    count(*) AS link_count,
    avg(cross_namespace_links.confidence) AS avg_confidence,
    count(DISTINCT cross_namespace_links.source_chip_id) AS unique_sources,
    count(DISTINCT cross_namespace_links.target_chip_id) AS unique_targets
   FROM public.cross_namespace_links
  GROUP BY cross_namespace_links.relation_type
  ORDER BY (count(*)) DESC;


--
-- Name: v_decisions_timeline; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_decisions_timeline AS
 SELECT kb_items.item_id,
    kb_items.student_id,
    kb_items.item_type,
    kb_items.subtype,
    kb_items.title_name,
    kb_items.tier1_state,
    kb_items.tier2_substate,
    kb_items.status_detail,
    kb_items.key_metric_type,
    kb_items.key_metric_value,
    kb_items.key_metric_unit,
    kb_items.deadline_date,
    kb_items.event_date,
    kb_items.submit_date,
    kb_items.outcome_date,
    kb_items.owner,
    kb_items.cadence,
    kb_items.evidence_links,
    kb_items.source_ref,
    kb_items.confidence,
    kb_items.created_ts,
    kb_items.updated_ts
   FROM public.kb_items
  WHERE (kb_items.item_type = 'Decision'::text)
  ORDER BY kb_items.student_id, COALESCE(kb_items.outcome_date, kb_items.event_date);


--
-- Name: v_ec_enum_final; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ec_enum_final AS
 SELECT ec_targets.id,
    ec_targets.student_id,
    ec_targets.phase,
    ec_targets.item_label,
    ec_targets.as_of,
    ec_targets.source_id,
    ec_targets.jtbd_id,
    ec_targets.created_at,
    ec_targets.updated_at
   FROM public.ec_targets
  WHERE (ec_targets.phase = 'final'::text)
  ORDER BY ec_targets.as_of, ec_targets.item_label;


--
-- Name: v_ec_enum_initial; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ec_enum_initial AS
 SELECT ec_targets.id,
    ec_targets.student_id,
    ec_targets.phase,
    ec_targets.item_label,
    ec_targets.as_of,
    ec_targets.source_id,
    ec_targets.jtbd_id,
    ec_targets.created_at,
    ec_targets.updated_at
   FROM public.ec_targets
  WHERE (ec_targets.phase = 'initial'::text)
  ORDER BY ec_targets.as_of, ec_targets.item_label;


--
-- Name: v_ec_vitals_by_type; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ec_vitals_by_type AS
 SELECT ec_vitals.student_id,
    ec_vitals.metric_type,
    count(DISTINCT ec_vitals.chip_id) AS activities_count,
    count(DISTINCT ec_vitals.metric_name) AS metrics_count,
    count(*) AS total_snapshots,
    min(ec_vitals.as_of) AS earliest_snapshot,
    max(ec_vitals.as_of) AS latest_snapshot
   FROM public.ec_vitals
  GROUP BY ec_vitals.student_id, ec_vitals.metric_type;


--
-- Name: v_ec_vitals_latest; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ec_vitals_latest AS
 SELECT DISTINCT ON (ec_vitals.student_id, ec_vitals.chip_id, ec_vitals.metric_name) ec_vitals.vital_id,
    ec_vitals.student_id,
    ec_vitals.chip_id,
    ec_vitals.activity_name,
    ec_vitals.metric_type,
    ec_vitals.metric_name,
    ec_vitals.numeric_value,
    ec_vitals.text_value,
    ec_vitals.unit,
    ec_vitals.as_of,
    ec_vitals.source_id,
    ec_vitals.evidence_text
   FROM public.ec_vitals
  ORDER BY ec_vitals.student_id, ec_vitals.chip_id, ec_vitals.metric_name, ec_vitals.as_of DESC;


--
-- Name: v_ec_vitals_progression; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ec_vitals_progression AS
 SELECT ec_vitals.vital_id,
    ec_vitals.student_id,
    ec_vitals.chip_id,
    ec_vitals.activity_name,
    ec_vitals.metric_type,
    ec_vitals.metric_name,
    ec_vitals.numeric_value,
    ec_vitals.text_value,
    ec_vitals.unit,
    ec_vitals.as_of,
    ec_vitals.source_id,
    ec_vitals.evidence_text,
    row_number() OVER (PARTITION BY ec_vitals.student_id, ec_vitals.chip_id, ec_vitals.metric_name ORDER BY ec_vitals.as_of) AS nth
   FROM public.ec_vitals
  ORDER BY ec_vitals.student_id, ec_vitals.chip_id, ec_vitals.metric_name, ec_vitals.as_of;


--
-- Name: v_ec_vitals_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ec_vitals_summary AS
 SELECT ec_vitals.student_id,
    count(DISTINCT ec_vitals.chip_id) AS activities_tracked,
    count(DISTINCT ec_vitals.metric_name) AS unique_metrics,
    count(*) AS total_snapshots,
    min(ec_vitals.as_of) AS tracking_start,
    max(ec_vitals.as_of) AS tracking_latest,
    array_agg(DISTINCT ec_vitals.metric_type ORDER BY ec_vitals.metric_type) AS metric_types_tracked
   FROM public.ec_vitals
  GROUP BY ec_vitals.student_id;


--
-- Name: v_ecs_initial; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ecs_initial AS
 SELECT v_ecs_all.student_id,
    v_ecs_all.activity_name,
    v_ecs_all.category,
    v_ecs_all.tier1_state,
    v_ecs_all.tier2_substate,
    v_ecs_all.status_detail,
    v_ecs_all.key_metric_type,
    v_ecs_all.key_metric_value,
    v_ecs_all.key_metric_unit,
    v_ecs_all.event_date,
    v_ecs_all.submit_date,
    v_ecs_all.outcome_date,
    v_ecs_all.evidence_links,
    v_ecs_all.source_id,
    v_ecs_all.confidence,
    v_ecs_all.chip_id
   FROM public.v_ecs_all
  WHERE (v_ecs_all.tier1_state = 'Planned'::text);


--
-- Name: VIEW v_ecs_initial; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_ecs_initial IS 'Initial EC targets (Planned state)';


--
-- Name: v_ecs_progression; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ecs_progression AS
 WITH tgt AS (
         SELECT v_ecs_all.student_id,
            v_ecs_all.activity_name,
            v_ecs_all.category,
            'target'::text AS phase,
            COALESCE(v_ecs_all.event_date, v_ecs_all.submit_date, v_ecs_all.outcome_date) AS as_of,
            v_ecs_all.source_id,
            v_ecs_all.chip_id,
            'kb_items'::text AS chip_table
           FROM public.v_ecs_all
          WHERE (v_ecs_all.tier1_state = 'Planned'::text)
        ), sub AS (
         SELECT v_ecs_all.student_id,
            v_ecs_all.activity_name,
            v_ecs_all.category,
            'submitted'::text AS phase,
            COALESCE(v_ecs_all.submit_date, v_ecs_all.event_date, v_ecs_all.outcome_date) AS as_of,
            v_ecs_all.source_id,
            v_ecs_all.chip_id,
            'kb_items'::text AS chip_table
           FROM public.v_ecs_all
          WHERE (v_ecs_all.tier1_state = 'Submitted'::text)
        ), outc AS (
         SELECT v_ecs_all.student_id,
            v_ecs_all.activity_name,
            v_ecs_all.category,
            'outcome'::text AS phase,
            COALESCE(v_ecs_all.outcome_date, v_ecs_all.submit_date, v_ecs_all.event_date) AS as_of,
            v_ecs_all.source_id,
            v_ecs_all.chip_id,
            'kb_items'::text AS chip_table
           FROM public.v_ecs_all
          WHERE (v_ecs_all.tier1_state = 'Outcome'::text)
        )
 SELECT u.student_id,
    u.activity_name,
    u.category,
    u.phase,
    u.as_of,
    u.source_id,
    u.chip_id,
    u.chip_table
   FROM ( SELECT tgt.student_id,
            tgt.activity_name,
            tgt.category,
            tgt.phase,
            tgt.as_of,
            tgt.source_id,
            tgt.chip_id,
            tgt.chip_table
           FROM tgt
        UNION ALL
         SELECT sub.student_id,
            sub.activity_name,
            sub.category,
            sub.phase,
            sub.as_of,
            sub.source_id,
            sub.chip_id,
            sub.chip_table
           FROM sub
        UNION ALL
         SELECT outc.student_id,
            outc.activity_name,
            outc.category,
            outc.phase,
            outc.as_of,
            outc.source_id,
            outc.chip_id,
            outc.chip_table
           FROM outc) u
  ORDER BY u.student_id, u.activity_name, u.as_of;


--
-- Name: VIEW v_ecs_progression; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_ecs_progression IS 'Timeline: target → submitted → outcome';


--
-- Name: v_ecs_timeline; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ecs_timeline AS
 SELECT kb_items.item_id,
    kb_items.student_id,
    kb_items.item_type,
    kb_items.subtype,
    kb_items.title_name,
    kb_items.tier1_state,
    kb_items.tier2_substate,
    kb_items.status_detail,
    kb_items.key_metric_type,
    kb_items.key_metric_value,
    kb_items.key_metric_unit,
    kb_items.deadline_date,
    kb_items.event_date,
    kb_items.submit_date,
    kb_items.outcome_date,
    kb_items.owner,
    kb_items.cadence,
    kb_items.evidence_links,
    kb_items.source_ref,
    kb_items.confidence,
    kb_items.created_ts,
    kb_items.updated_ts
   FROM public.kb_items
  WHERE (kb_items.item_type ~~ 'EC_%'::text)
  ORDER BY kb_items.student_id, COALESCE((kb_items.event_date)::timestamp with time zone, (kb_items.submit_date)::timestamp with time zone, kb_items.created_ts);


--
-- Name: v_eq_signals_flat; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_eq_signals_flat AS
 SELECT ss.id AS signal_set_id,
    ss.student_id,
    ss.phase,
    ss.weeks AS session_week,
    ss.source_path AS source_file,
        CASE
            WHEN (ss.source_path ~~ '%imsg%'::text) THEN 'imsg'::text
            WHEN (ss.source_path ~~ '%session%'::text) THEN 'sessions'::text
            ELSE 'unknown'::text
        END AS source_type,
    s.id AS signal_id,
    s.cue AS cue_type,
    s.strength AS intensity,
    s.exemplar,
    s.provenance,
    s.counts,
    s.meta,
    ss.summary AS raw_payload,
    ss.created_at
   FROM (public.eq_signal_sets ss
     LEFT JOIN public.eq_signals s ON ((s.set_id = ss.id)));


--
-- Name: VIEW v_eq_signals_flat; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_eq_signals_flat IS 'Flattened view for runtime queries with denormalized data';


--
-- Name: v_eq_signals_runtime; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_eq_signals_runtime AS
 SELECT v_eq_signals_flat.cue_type,
    avg(v_eq_signals_flat.intensity) AS avg_intensity,
    count(*) AS n,
    count(DISTINCT v_eq_signals_flat.signal_set_id) AS n_sessions,
    array_agg(DISTINCT v_eq_signals_flat.student_id) AS students,
    array_agg(DISTINCT v_eq_signals_flat.phase) AS phases
   FROM public.v_eq_signals_flat
  WHERE (v_eq_signals_flat.cue_type IS NOT NULL)
  GROUP BY v_eq_signals_flat.cue_type;


--
-- Name: VIEW v_eq_signals_runtime; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_eq_signals_runtime IS 'Aggregated cue statistics for runtime guards';


--
-- Name: v_fact_timeline; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_fact_timeline AS
 WITH base AS (
         SELECT fo.student_id,
            fo.kind,
            fo.obs_id,
            fo.event_date,
            fo.recorded_at,
            fo.value_numeric,
            fo.value_text,
            fo.is_official,
            fo.is_practice,
            fo.confidence,
            fo.source_id,
            fo.meta,
            fo.attempt_no,
            ((
                CASE
                    WHEN fo.is_official THEN COALESCE(fp.weight_official, 100)
                    ELSE 0
                END +
                CASE fo.confidence
                    WHEN 'high'::text THEN COALESCE(fp.weight_conf_high, 30)
                    WHEN 'medium'::text THEN COALESCE(fp.weight_conf_med, 15)
                    ELSE 0
                END) +
                CASE
                    WHEN (fo.source_id = ANY (COALESCE(fp.preferred_sources, ARRAY[]::text[]))) THEN 5
                    ELSE 0
                END) AS policy_score
           FROM (public.fact_observations fo
             LEFT JOIN public.fact_priorities fp USING (kind))
          WHERE (fo.source_id <> ALL (COALESCE(fp.blocked_sources, ARRAY[]::text[])))
        ), ordered AS (
         SELECT base.student_id,
            base.kind,
            base.obs_id,
            base.event_date,
            base.recorded_at,
            base.value_numeric,
            base.value_text,
            base.is_official,
            base.is_practice,
            base.confidence,
            base.source_id,
            base.meta,
            base.attempt_no,
            base.policy_score,
            row_number() OVER (PARTITION BY base.student_id, base.kind ORDER BY base.event_date, base.policy_score DESC, base.recorded_at, base.obs_id) AS rank_chron,
            row_number() OVER (PARTITION BY base.student_id, base.kind ORDER BY base.event_date DESC, base.policy_score DESC, base.recorded_at DESC, base.obs_id DESC) AS rank_reverse
           FROM base
        ), numbered AS (
         SELECT ordered.student_id,
            ordered.kind,
            ordered.obs_id,
            ordered.event_date,
            ordered.recorded_at,
            ordered.value_numeric,
            ordered.value_text,
            ordered.is_official,
            ordered.is_practice,
            ordered.confidence,
            ordered.source_id,
            ordered.meta,
            ordered.attempt_no,
            ordered.policy_score,
            ordered.rank_chron,
            ordered.rank_reverse,
            COALESCE((ordered.attempt_no)::bigint, dense_rank() OVER (PARTITION BY ordered.student_id, ordered.kind ORDER BY ordered.event_date)) AS attempt_resolved
           FROM ordered
        )
 SELECT numbered.student_id,
    numbered.kind,
    numbered.obs_id,
    numbered.event_date,
    numbered.recorded_at,
    numbered.value_numeric,
    numbered.value_text,
    numbered.is_official,
    numbered.is_practice,
    numbered.confidence,
    numbered.source_id,
    numbered.meta,
    numbered.policy_score,
    numbered.rank_chron,
    numbered.rank_reverse,
    numbered.attempt_resolved
   FROM numbered;


--
-- Name: v_feature_gaps_current; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_feature_gaps_current AS
 SELECT f.student_id,
    f.domain,
    f.feature_key,
    f.feature_value AS current_value,
    w.target_value,
    (w.target_value - f.feature_value) AS gap_raw,
    w.impact_coefficient,
    (w.impact_coefficient * GREATEST((w.target_value - f.feature_value), (0)::numeric)) AS gap_weighted,
    w.description
   FROM (public.v_features_all f
     JOIN public.readiness_feature_weights w USING (feature_key))
  WHERE (f.feature_value IS NOT NULL);


--
-- Name: VIEW v_feature_gaps_current; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_feature_gaps_current IS 'Current gap analysis between student features and Ivy+ benchmarks';


--
-- Name: v_gameplan_summary_initial; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_gameplan_summary_initial AS
 SELECT s.student_id,
    COALESCE(n_init.items, '[]'::jsonb) AS narrative_items,
    COALESCE(aw.items, '[]'::jsonb) AS award_targets,
    COALESCE(ec.items, '[]'::jsonb) AS ec_targets,
    COALESCE(pg.items, '[]'::jsonb) AS program_targets
   FROM ((((public.students s
     LEFT JOIN LATERAL ( SELECT jsonb_agg(jsonb_build_object('category', kb_items.subtype, 'content', kb_items.title_name, 'chip', kb_items.item_id)) AS items
           FROM public.kb_items
          WHERE ((kb_items.student_id = s.student_id) AND (kb_items.item_type = 'narrative'::text) AND (kb_items.tier1_state = 'Planned'::text))) n_init ON (true))
     LEFT JOIN LATERAL ( SELECT jsonb_agg(jsonb_build_object('label', award_targets_enum.item_label, 'as_of', award_targets_enum.as_of, 'source_id', award_targets_enum.source_id)) AS items
           FROM public.award_targets_enum
          WHERE ((award_targets_enum.student_id = s.student_id) AND (award_targets_enum.phase = 'initial'::text) AND (award_targets_enum.as_of = ( SELECT min(award_targets_enum_1.as_of) AS min
                   FROM public.award_targets_enum award_targets_enum_1
                  WHERE ((award_targets_enum_1.student_id = s.student_id) AND (award_targets_enum_1.phase = 'initial'::text)))))) aw ON (true))
     LEFT JOIN LATERAL ( SELECT jsonb_agg(jsonb_build_object('label', ec_targets.item_label, 'as_of', ec_targets.as_of, 'source_id', ec_targets.source_id)) AS items
           FROM public.ec_targets
          WHERE ((ec_targets.student_id = s.student_id) AND (ec_targets.phase = 'initial'::text) AND (ec_targets.as_of = ( SELECT min(ec_targets_1.as_of) AS min
                   FROM public.ec_targets ec_targets_1
                  WHERE ((ec_targets_1.student_id = s.student_id) AND (ec_targets_1.phase = 'initial'::text)))))) ec ON (true))
     LEFT JOIN LATERAL ( SELECT jsonb_agg(jsonb_build_object('program', kb_items.title_name, 'provider', kb_items.subtype, 'chip', kb_items.item_id)) AS items
           FROM public.kb_items
          WHERE ((kb_items.student_id = s.student_id) AND (lower(kb_items.item_type) = ANY (ARRAY['program'::text, 'summer_program'::text])) AND (kb_items.tier1_state = 'Planned'::text))) pg ON (true));


--
-- Name: v_program_outcomes; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_program_outcomes AS
 SELECT outcomes.student_id,
    COALESCE((outcomes.details_json ->> 'program_name'::text), (outcomes.details_json ->> 'title'::text), '(program)'::text) AS program_name,
    (outcomes.details_json ->> 'provider'::text) AS provider,
    (outcomes.details_json ->> 'decision'::text) AS decision,
    (outcomes.details_json ->> 'session'::text) AS session,
    (outcomes.details_json ->> 'site'::text) AS site,
    ((outcomes.details_json ->> 'attending'::text))::boolean AS attending,
    (outcomes.occurred_at)::date AS decision_date,
    outcomes.source_id,
    (outcomes.type)::text AS type,
    (outcomes.outcome_id)::text AS chip_id
   FROM public.outcomes
  WHERE ((outcomes.type)::text = ANY (ARRAY['program'::text, 'program_application'::text]));


--
-- Name: VIEW v_program_outcomes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_program_outcomes IS 'Program decisions from outcomes';


--
-- Name: v_programs_all; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_programs_all AS
 SELECT kb_items.student_id,
    kb_items.title_name AS program_name,
    kb_items.subtype AS provider_or_track,
    kb_items.tier1_state,
    kb_items.tier2_substate,
    kb_items.status_detail,
    kb_items.key_metric_type,
    kb_items.key_metric_value,
    kb_items.key_metric_unit,
    kb_items.event_date,
    kb_items.submit_date,
    kb_items.outcome_date,
    kb_items.source_ref AS source_id,
    kb_items.confidence,
    kb_items.item_id AS chip_id
   FROM public.kb_items
  WHERE (lower(kb_items.item_type) = ANY (ARRAY['program'::text, 'summer_program'::text]));


--
-- Name: VIEW v_programs_all; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_programs_all IS 'All summer programs from kb_items';


--
-- Name: v_programs_progression; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_programs_progression AS
 WITH tgt AS (
         SELECT v_programs_all.student_id,
            v_programs_all.program_name,
            v_programs_all.provider_or_track AS provider,
            'target'::text AS phase,
            COALESCE(v_programs_all.event_date, v_programs_all.submit_date, v_programs_all.outcome_date) AS as_of,
            v_programs_all.source_id,
            v_programs_all.chip_id,
            'kb_items'::text AS chip_table
           FROM public.v_programs_all
          WHERE (v_programs_all.tier1_state = 'Planned'::text)
        ), subm AS (
         SELECT v_programs_all.student_id,
            v_programs_all.program_name,
            v_programs_all.provider_or_track AS provider,
            'submitted'::text AS phase,
            COALESCE(v_programs_all.submit_date, v_programs_all.event_date, v_programs_all.outcome_date) AS as_of,
            v_programs_all.source_id,
            v_programs_all.chip_id,
            'kb_items'::text AS chip_table
           FROM public.v_programs_all
          WHERE ((v_programs_all.tier1_state = 'Submitted'::text) OR (v_programs_all.submit_date IS NOT NULL))
        ), "dec" AS (
         SELECT v_program_outcomes.student_id,
            v_program_outcomes.program_name,
            v_program_outcomes.provider,
                CASE
                    WHEN (v_program_outcomes.decision IS NULL) THEN 'outcome'::text
                    ELSE v_program_outcomes.decision
                END AS phase,
            v_program_outcomes.decision_date AS as_of,
            v_program_outcomes.source_id,
            v_program_outcomes.chip_id,
            'outcomes'::text AS chip_table
           FROM public.v_program_outcomes
        )
 SELECT u.student_id,
    u.program_name,
    u.provider,
    u.phase,
    u.as_of,
    u.source_id,
    u.chip_id,
    u.chip_table
   FROM ( SELECT tgt.student_id,
            tgt.program_name,
            tgt.provider,
            tgt.phase,
            tgt.as_of,
            tgt.source_id,
            tgt.chip_id,
            tgt.chip_table
           FROM tgt
        UNION ALL
         SELECT subm.student_id,
            subm.program_name,
            subm.provider,
            subm.phase,
            subm.as_of,
            subm.source_id,
            subm.chip_id,
            subm.chip_table
           FROM subm
        UNION ALL
         SELECT "dec".student_id,
            "dec".program_name,
            "dec".provider,
            "dec".phase,
            "dec".as_of,
            "dec".source_id,
            "dec".chip_id,
            "dec".chip_table
           FROM "dec") u
  ORDER BY u.student_id, u.program_name, u.as_of;


--
-- Name: VIEW v_programs_progression; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_programs_progression IS 'Timeline: target → submitted → decision';


--
-- Name: v_gameplan_vs_execution; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_gameplan_vs_execution AS
 WITH awards AS (
         SELECT 'award'::text AS domain,
            v_awards_progression.student_id,
            v_awards_progression.award_name,
            v_awards_progression.phase,
            v_awards_progression.as_of,
            v_awards_progression.source_id,
            v_awards_progression.chip_id,
            v_awards_progression.chip_table
           FROM public.v_awards_progression
        ), ecs AS (
         SELECT 'ec'::text AS domain,
            v_ecs_progression.student_id,
            v_ecs_progression.activity_name,
            v_ecs_progression.category,
            v_ecs_progression.phase,
            v_ecs_progression.as_of,
            v_ecs_progression.source_id,
            v_ecs_progression.chip_id,
            v_ecs_progression.chip_table
           FROM public.v_ecs_progression
        ), progs AS (
         SELECT 'program'::text AS domain,
            v_programs_progression.student_id,
            v_programs_progression.program_name,
            v_programs_progression.provider,
            v_programs_progression.phase,
            v_programs_progression.as_of,
            v_programs_progression.source_id,
            v_programs_progression.chip_id,
            v_programs_progression.chip_table
           FROM public.v_programs_progression
        )
 SELECT u.domain,
    u.student_id,
    u.item,
    u.phase,
    u.as_of,
    u.source_id,
    u.chip_id,
    u.chip_table
   FROM ( SELECT awards.domain,
            awards.student_id,
            awards.award_name AS item,
            awards.phase,
            awards.as_of,
            awards.source_id,
            awards.chip_id,
            awards.chip_table
           FROM awards
        UNION ALL
         SELECT ecs.domain,
            ecs.student_id,
            ecs.activity_name AS item,
            ecs.phase,
            ecs.as_of,
            ecs.source_id,
            ecs.chip_id,
            ecs.chip_table
           FROM ecs
        UNION ALL
         SELECT progs.domain,
            progs.student_id,
            progs.program_name AS item,
            progs.phase,
            progs.as_of,
            progs.source_id,
            progs.chip_id,
            progs.chip_table
           FROM progs) u
  ORDER BY u.student_id, u.domain, u.item, u.as_of;


--
-- Name: VIEW v_gameplan_vs_execution; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_gameplan_vs_execution IS 'GamePlan v2: Unified progression timeline (initial → execution → outcomes) across awards/ECs/programs';


--
-- Name: v_gpa_final; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_gpa_final AS
 SELECT academic_gpa.student_id,
    academic_gpa.scope,
    academic_gpa.scope_key,
    academic_gpa.gpa_unweighted,
    academic_gpa.gpa_weighted,
    academic_gpa.credits_attempted,
    academic_gpa.credits_earned,
    academic_gpa.calc_method,
    academic_gpa.recorded_at,
    academic_gpa.source_id,
    academic_gpa.confidence,
    academic_gpa.gpa_id AS chip_id,
    'academic_gpa'::text AS chip_table
   FROM public.academic_gpa
  WHERE (academic_gpa.source_id = 'SRC-COMMONAPP-UNC'::text);


--
-- Name: v_gpa_progression; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_gpa_progression AS
 SELECT academic_gpa.student_id,
    academic_gpa.scope,
    academic_gpa.scope_key,
    academic_gpa.gpa_unweighted,
    academic_gpa.gpa_weighted,
    academic_gpa.credits_attempted,
    academic_gpa.credits_earned,
    academic_gpa.calc_method,
    academic_gpa.recorded_at,
    academic_gpa.source_id,
    academic_gpa.confidence,
    academic_gpa.gpa_id AS chip_id,
    'academic_gpa'::text AS chip_table
   FROM public.academic_gpa
  ORDER BY academic_gpa.student_id, academic_gpa.scope, COALESCE(academic_gpa.scope_key, ''::text), academic_gpa.recorded_at;


--
-- Name: v_gpa_timeline; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_gpa_timeline AS
 SELECT academic_gpa.student_id,
    academic_gpa.scope,
    academic_gpa.scope_key,
    academic_gpa.scope_key AS scope_label,
    academic_gpa.gpa_unweighted,
    academic_gpa.gpa_weighted,
    academic_gpa.credits_attempted,
    academic_gpa.credits_earned,
    academic_gpa.calc_method,
    academic_gpa.recorded_at,
    academic_gpa.source_id,
    academic_gpa.confidence
   FROM public.academic_gpa
  ORDER BY academic_gpa.student_id, academic_gpa.recorded_at;


--
-- Name: VIEW v_gpa_timeline; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_gpa_timeline IS 'Temporal GPA progression with scope labels for resolver';


--
-- Name: v_ivyready_assessment_vs_final; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ivyready_assessment_vs_final AS
 WITH a AS (
         SELECT ivyready_snapshots.snapshot_id,
            ivyready_snapshots.student_id,
            ivyready_snapshots.rubric_id,
            ivyready_snapshots.snapshot_phase,
            ivyready_snapshots.as_of,
            ivyready_snapshots.engine,
            ivyready_snapshots.overall_score,
            ivyready_snapshots.notes,
            ivyready_snapshots.source_id,
            ivyready_snapshots.created_ts
           FROM public.ivyready_snapshots
          WHERE (ivyready_snapshots.snapshot_phase = 'assessment'::text)
        ), f AS (
         SELECT ivyready_snapshots.snapshot_id,
            ivyready_snapshots.student_id,
            ivyready_snapshots.rubric_id,
            ivyready_snapshots.snapshot_phase,
            ivyready_snapshots.as_of,
            ivyready_snapshots.engine,
            ivyready_snapshots.overall_score,
            ivyready_snapshots.notes,
            ivyready_snapshots.source_id,
            ivyready_snapshots.created_ts
           FROM public.ivyready_snapshots
          WHERE (ivyready_snapshots.snapshot_phase = 'final_submit'::text)
        )
 SELECT a.student_id,
    a.as_of AS assessment_as_of,
    a.overall_score AS assessment_score,
    f.as_of AS final_as_of,
    f.overall_score AS final_score,
    (f.overall_score - a.overall_score) AS delta
   FROM (a
     JOIN f USING (student_id, rubric_id));


--
-- Name: v_ivyready_factor_deltas; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ivyready_factor_deltas AS
 SELECT a.student_id,
    a.snapshot_id AS assessment_sid,
    f.snapshot_id AS final_sid,
    a_f.factor_id,
    a_f.raw_score AS assessment_factor,
    f_f.raw_score AS final_factor,
    (f_f.raw_score - a_f.raw_score) AS delta
   FROM (((public.ivyready_snapshots a
     JOIN public.ivyready_snapshots f ON (((f.student_id = a.student_id) AND (f.rubric_id = a.rubric_id) AND (a.snapshot_phase = 'assessment'::text) AND (f.snapshot_phase = 'final_submit'::text))))
     JOIN public.ivyready_snapshot_factors a_f ON ((a_f.snapshot_id = a.snapshot_id)))
     JOIN public.ivyready_snapshot_factors f_f ON (((f_f.snapshot_id = f.snapshot_id) AND (f_f.factor_id = a_f.factor_id))))
  ORDER BY a.student_id, a_f.factor_id;


--
-- Name: v_ivyready_latest; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ivyready_latest AS
 SELECT DISTINCT ON (i.student_id) i.student_id,
    i.rubric_id,
    i.snapshot_phase,
    i.as_of,
    i.overall_score,
    i.snapshot_id
   FROM public.ivyready_snapshots i
  ORDER BY i.student_id, i.as_of DESC;


--
-- Name: v_ivyready_progression; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ivyready_progression AS
 SELECT i.student_id,
    i.rubric_id,
    i.snapshot_phase,
    i.as_of,
    i.overall_score,
    jsonb_object_agg(f.factor_id, f.raw_score ORDER BY f.factor_id) AS factor_scores
   FROM (public.ivyready_snapshots i
     JOIN public.ivyready_snapshot_factors f USING (snapshot_id))
  GROUP BY i.student_id, i.rubric_id, i.snapshot_phase, i.as_of, i.overall_score
  ORDER BY i.student_id, i.as_of;


--
-- Name: v_jtbd_weekly_by_week; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_jtbd_weekly_by_week AS
 SELECT jtbd_weekly.student_id,
    jtbd_weekly.week_number,
    jtbd_weekly.week_start_date,
    jtbd_weekly.week_end_date,
    count(*) AS total_jobs,
    count(*) FILTER (WHERE (jtbd_weekly.status = 'completed'::text)) AS completed_jobs,
    count(*) FILTER (WHERE (jtbd_weekly.status = 'in_progress'::text)) AS in_progress_jobs,
    count(*) FILTER (WHERE (jtbd_weekly.status = 'planned'::text)) AS planned_jobs,
    array_agg(jtbd_weekly.job_type ORDER BY jtbd_weekly.job_type) FILTER (WHERE (jtbd_weekly.status = 'completed'::text)) AS completed_job_types,
    array_agg(jtbd_weekly.job_description ORDER BY jtbd_weekly.job_description) FILTER (WHERE (jtbd_weekly.status = 'completed'::text)) AS completed_descriptions
   FROM public.jtbd_weekly
  GROUP BY jtbd_weekly.student_id, jtbd_weekly.week_number, jtbd_weekly.week_start_date, jtbd_weekly.week_end_date;


--
-- Name: v_jtbd_weekly_completed; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_jtbd_weekly_completed AS
 SELECT jtbd_weekly.jtbd_id,
    jtbd_weekly.student_id,
    jtbd_weekly.week_number,
    jtbd_weekly.week_start_date,
    jtbd_weekly.week_end_date,
    jtbd_weekly.job_type,
    jtbd_weekly.job_description,
    jtbd_weekly.linked_chip_id,
    jtbd_weekly.linked_table,
    jtbd_weekly.status,
    jtbd_weekly.completion_date,
    jtbd_weekly.outcome_metric,
    jtbd_weekly.outcome_value,
    jtbd_weekly.outcome_unit,
    jtbd_weekly.source_id,
    jtbd_weekly.notes,
    jtbd_weekly.created_at
   FROM public.jtbd_weekly
  WHERE (jtbd_weekly.status = 'completed'::text)
  ORDER BY jtbd_weekly.completion_date;


--
-- Name: v_jtbd_weekly_milestones; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_jtbd_weekly_milestones AS
 SELECT jtbd_weekly.jtbd_id,
    jtbd_weekly.student_id,
    jtbd_weekly.week_number,
    jtbd_weekly.week_start_date,
    jtbd_weekly.week_end_date,
    jtbd_weekly.job_type,
    jtbd_weekly.job_description,
    jtbd_weekly.linked_chip_id,
    jtbd_weekly.linked_table,
    jtbd_weekly.status,
    jtbd_weekly.completion_date,
    jtbd_weekly.outcome_metric,
    jtbd_weekly.outcome_value,
    jtbd_weekly.outcome_unit,
    jtbd_weekly.source_id,
    jtbd_weekly.notes,
    jtbd_weekly.created_at
   FROM public.jtbd_weekly
  WHERE ((jtbd_weekly.job_type = 'ec_milestone'::text) AND (jtbd_weekly.status = 'completed'::text))
  ORDER BY jtbd_weekly.completion_date;


--
-- Name: v_jtbd_weekly_pending; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_jtbd_weekly_pending AS
 SELECT jtbd_weekly.jtbd_id,
    jtbd_weekly.student_id,
    jtbd_weekly.week_number,
    jtbd_weekly.week_start_date,
    jtbd_weekly.week_end_date,
    jtbd_weekly.job_type,
    jtbd_weekly.job_description,
    jtbd_weekly.linked_chip_id,
    jtbd_weekly.linked_table,
    jtbd_weekly.status,
    jtbd_weekly.completion_date,
    jtbd_weekly.outcome_metric,
    jtbd_weekly.outcome_value,
    jtbd_weekly.outcome_unit,
    jtbd_weekly.source_id,
    jtbd_weekly.notes,
    jtbd_weekly.created_at
   FROM public.jtbd_weekly
  WHERE (jtbd_weekly.status = ANY (ARRAY['planned'::text, 'in_progress'::text]))
  ORDER BY jtbd_weekly.week_number;


--
-- Name: v_jtbd_weekly_progression; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_jtbd_weekly_progression AS
 SELECT jtbd_weekly.student_id,
    jtbd_weekly.week_number,
    count(*) AS total_jobs,
    count(*) FILTER (WHERE (jtbd_weekly.status = 'completed'::text)) AS completed_jobs,
    round(((100.0 * (count(*) FILTER (WHERE (jtbd_weekly.status = 'completed'::text)))::numeric) / (NULLIF(count(*), 0))::numeric), 1) AS completion_rate
   FROM public.jtbd_weekly
  GROUP BY jtbd_weekly.student_id, jtbd_weekly.week_number
  ORDER BY jtbd_weekly.student_id, jtbd_weekly.week_number;


--
-- Name: v_kb_items_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_kb_items_summary AS
 SELECT kb_items.student_id,
    kb_items.item_type,
    kb_items.tier1_state,
    count(*) AS item_count,
    string_agg(kb_items.title_name, '; '::text ORDER BY kb_items.title_name) AS items_list,
    min(COALESCE(kb_items.event_date, kb_items.submit_date, kb_items.deadline_date)) AS earliest_date,
    max(COALESCE(kb_items.outcome_date, kb_items.event_date, kb_items.submit_date)) AS latest_date
   FROM public.kb_items
  GROUP BY kb_items.student_id, kb_items.item_type, kb_items.tier1_state;


--
-- Name: v_kb_recent; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_kb_recent AS
 SELECT c.chip_id,
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
    COALESCE(c.ended_at, c.started_at, d.dt_anchor, c.created_ts) AS sort_ts
   FROM (public.kb_chips c
     JOIN public.kb_docs d ON ((d.doc_id = c.doc_id)))
  ORDER BY COALESCE(c.ended_at, c.started_at, d.dt_anchor, c.created_ts) DESC NULLS LAST;


--
-- Name: VIEW v_kb_recent; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_kb_recent IS 'Recent KB chips ordered by temporal anchor (ended_at > started_at > dt_anchor > created_ts)';


--
-- Name: v_narrative_final; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_narrative_final AS
 SELECT kb_items.student_id,
    kb_items.subtype AS narrative_category,
    kb_items.title_name AS content,
    kb_items.source_ref,
    kb_items.item_id
   FROM public.kb_items
  WHERE ((kb_items.item_type = 'narrative'::text) AND (kb_items.tier1_state = 'Submitted'::text))
  ORDER BY kb_items.subtype;


--
-- Name: v_narrative_initial; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_narrative_initial AS
 SELECT kb_items.student_id,
    kb_items.subtype AS narrative_category,
    kb_items.title_name AS content,
    kb_items.source_ref,
    kb_items.item_id
   FROM public.kb_items
  WHERE ((kb_items.item_type = 'narrative'::text) AND (kb_items.tier1_state = 'Planned'::text))
  ORDER BY kb_items.subtype;


--
-- Name: v_narrative_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_narrative_summary AS
 SELECT narrative_targets.student_id,
    count(*) AS narrative_count,
    min(narrative_targets.as_of) AS earliest_date,
    string_agg("left"(narrative_targets.narrative, 100), ' | '::text) AS narrative_preview
   FROM public.narrative_targets
  GROUP BY narrative_targets.student_id;


--
-- Name: v_plan_events_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_plan_events_summary AS
 SELECT plan_events.student_id,
    plan_events.event,
    count(*) AS event_count,
    min(plan_events.as_of) AS first_date,
    max(plan_events.as_of) AS last_date,
    string_agg(DISTINCT plan_events.source_id, ', '::text) AS sources
   FROM public.plan_events
  GROUP BY plan_events.student_id, plan_events.event
  ORDER BY plan_events.student_id, (min(plan_events.as_of));


--
-- Name: v_programs_admits; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_programs_admits AS
 SELECT v_programs_final.student_id,
    v_programs_final.program_name AS title_name,
    v_programs_final.provider,
    v_programs_final.event_date AS occurred_at,
    v_programs_final.source_id,
    v_programs_final.chip_id,
    v_programs_final.chip_table
   FROM public.v_programs_final;


--
-- Name: VIEW v_programs_admits; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_programs_admits IS 'Summer program admissions (alias of v_programs_final for GPT-5 intent router)';


--
-- Name: v_programs_initial; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_programs_initial AS
 SELECT v_programs_all.student_id,
    v_programs_all.program_name,
    v_programs_all.provider_or_track,
    v_programs_all.tier1_state,
    v_programs_all.tier2_substate,
    v_programs_all.status_detail,
    v_programs_all.key_metric_type,
    v_programs_all.key_metric_value,
    v_programs_all.key_metric_unit,
    v_programs_all.event_date,
    v_programs_all.submit_date,
    v_programs_all.outcome_date,
    v_programs_all.source_id,
    v_programs_all.confidence,
    v_programs_all.chip_id
   FROM public.v_programs_all
  WHERE (v_programs_all.tier1_state = 'Planned'::text);


--
-- Name: VIEW v_programs_initial; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_programs_initial IS 'Initial program targets (Planned)';


--
-- Name: v_programs_submitted; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_programs_submitted AS
 SELECT v_programs_all.student_id,
    v_programs_all.program_name,
    v_programs_all.provider_or_track,
    v_programs_all.tier1_state,
    v_programs_all.tier2_substate,
    v_programs_all.status_detail,
    v_programs_all.key_metric_type,
    v_programs_all.key_metric_value,
    v_programs_all.key_metric_unit,
    v_programs_all.event_date,
    v_programs_all.submit_date,
    v_programs_all.outcome_date,
    v_programs_all.source_id,
    v_programs_all.confidence,
    v_programs_all.chip_id
   FROM public.v_programs_all
  WHERE ((v_programs_all.tier1_state = 'Submitted'::text) OR (v_programs_all.submit_date IS NOT NULL));


--
-- Name: VIEW v_programs_submitted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_programs_submitted IS 'Programs submitted';


--
-- Name: v_proof_health; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_proof_health AS
 SELECT date_trunc('day'::text, proof_registry."timestamp") AS day,
    proof_registry.artifact_type,
    count(*) AS total_artifacts,
    sum(
        CASE
            WHEN proof_registry.verified THEN 1
            ELSE 0
        END) AS verified_count,
    avg(proof_registry.score) AS avg_score,
    percentile_cont((0.5)::double precision) WITHIN GROUP (ORDER BY ((proof_registry.score)::double precision)) AS median_score,
    min(proof_registry.score) AS min_score,
    max(proof_registry.score) AS max_score
   FROM public.proof_registry
  GROUP BY (date_trunc('day'::text, proof_registry."timestamp")), proof_registry.artifact_type
  ORDER BY (date_trunc('day'::text, proof_registry."timestamp")) DESC, proof_registry.artifact_type;


--
-- Name: v_readiness_weakspots; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_readiness_weakspots AS
 SELECT g.student_id,
    g.domain,
    g.feature_key,
    g.current_value,
    g.target_value,
    g.gap_raw,
    g.impact_coefficient,
    g.gap_weighted,
    rank() OVER (PARTITION BY g.student_id ORDER BY g.gap_weighted DESC) AS gap_rank
   FROM public.v_feature_gaps_current g
  WHERE (g.gap_weighted > (0)::numeric);


--
-- Name: v_readiness_top_priorities; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_readiness_top_priorities AS
 SELECT w.student_id,
    w.domain,
    w.feature_key,
    w.current_value,
    w.target_value,
    w.gap_raw,
    w.gap_weighted,
        CASE w.domain
            WHEN 'testing'::text THEN 'Raise SAT/ACT via targeted prep/retake'::text
            WHEN 'awards'::text THEN 'Pursue higher-tier competitions (Nat/Intl)'::text
            WHEN 'ecs'::text THEN 'Scale users/funding/footprint; formalize leadership'::text
            WHEN 'academics'::text THEN 'Optimize GPA/rigor (AP adds or grade repair)'::text
            WHEN 'narrative'::text THEN 'Tighten essay coherence w/ identity–passion–cause'::text
            WHEN 'programs'::text THEN 'Apply to selective programs aligned to your narrative'::text
            ELSE 'Work on the highest impact domain gap'::text
        END AS recommended_action,
    'Next 4–6 weeks'::text AS recommended_window,
    round((w.gap_weighted * 1.5), 1) AS estimated_lift
   FROM public.v_readiness_weakspots w
  ORDER BY w.gap_weighted DESC
 LIMIT 10;


--
-- Name: v_rubric_scores_latest; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_rubric_scores_latest AS
 SELECT s.student_id,
    s.rubric_id,
    s.snapshot_phase,
    s.as_of,
    sum(s.weighted_score) AS ivyready_score,
    jsonb_object_agg(s.factor_id, s.raw_score) FILTER (WHERE (s.factor_id IS NOT NULL)) AS factor_scores
   FROM ( SELECT DISTINCT ON (admissions_rubric_scores.student_id, admissions_rubric_scores.rubric_id, admissions_rubric_scores.snapshot_phase, admissions_rubric_scores.factor_id) admissions_rubric_scores.score_id,
            admissions_rubric_scores.student_id,
            admissions_rubric_scores.rubric_id,
            admissions_rubric_scores.snapshot_phase,
            admissions_rubric_scores.as_of,
            admissions_rubric_scores.factor_id,
            admissions_rubric_scores.raw_score,
            admissions_rubric_scores.weight_pct,
            admissions_rubric_scores.weighted_score,
            admissions_rubric_scores.details_json,
            admissions_rubric_scores.source_id,
            admissions_rubric_scores.created_ts
           FROM public.admissions_rubric_scores
          ORDER BY admissions_rubric_scores.student_id, admissions_rubric_scores.rubric_id, admissions_rubric_scores.snapshot_phase, admissions_rubric_scores.factor_id, admissions_rubric_scores.as_of DESC) s
  GROUP BY s.student_id, s.rubric_id, s.snapshot_phase, s.as_of;


--
-- Name: VIEW v_rubric_scores_latest; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_rubric_scores_latest IS 'Latest rubric scores per student per snapshot phase with aggregated IvyReady score';


--
-- Name: v_rubric_scores_phase_latest; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_rubric_scores_phase_latest AS
 SELECT s.student_id,
    s.rubric_id,
    s.snapshot_phase,
    max(s.as_of) AS as_of,
    sum(s.weighted_score) AS ivyready_score,
    jsonb_object_agg(s.factor_id, s.raw_score ORDER BY s.factor_id) AS factor_scores
   FROM public.admissions_rubric_scores s
  GROUP BY s.student_id, s.rubric_id, s.snapshot_phase;


--
-- Name: VIEW v_rubric_scores_phase_latest; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_rubric_scores_phase_latest IS 'Latest IvyReady rubric scores per snapshot phase (assessment, midpoint, final_submit)';


--
-- Name: v_sat_enum_first; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_sat_enum_first AS
 SELECT DISTINCT ON (sat_timeline_enum.student_id) sat_timeline_enum.student_id,
    sat_timeline_enum.as_of,
    sat_timeline_enum.numeric_value,
    sat_timeline_enum.type,
    sat_timeline_enum.confidence,
    sat_timeline_enum.source_id
   FROM public.sat_timeline_enum
  ORDER BY sat_timeline_enum.student_id, sat_timeline_enum.as_of, sat_timeline_enum.numeric_value;


--
-- Name: v_sat_enum_latest; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_sat_enum_latest AS
 SELECT DISTINCT ON (sat_timeline_enum.student_id) sat_timeline_enum.student_id,
    sat_timeline_enum.as_of,
    sat_timeline_enum.numeric_value,
    sat_timeline_enum.type,
    sat_timeline_enum.confidence,
    sat_timeline_enum.source_id
   FROM public.sat_timeline_enum
  ORDER BY sat_timeline_enum.student_id, sat_timeline_enum.as_of DESC, sat_timeline_enum.numeric_value DESC;


--
-- Name: v_sat_enum_progression; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_sat_enum_progression AS
 SELECT sat_timeline_enum.student_id,
    sat_timeline_enum.as_of,
    sat_timeline_enum.numeric_value,
    sat_timeline_enum.type,
    sat_timeline_enum.confidence,
    sat_timeline_enum.source_id,
    row_number() OVER (PARTITION BY sat_timeline_enum.student_id ORDER BY sat_timeline_enum.as_of) AS nth
   FROM public.sat_timeline_enum
  ORDER BY sat_timeline_enum.student_id, sat_timeline_enum.as_of;


--
-- Name: VIEW v_sat_enum_progression; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_sat_enum_progression IS 'SAT scores ordered chronologically with nth numbering';


--
-- Name: v_sat_progression; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_sat_progression AS
 SELECT vital_facts.student_id,
    vital_facts.fact_date,
        CASE
            WHEN (vital_facts.value ~ '^[0-9]+$'::text) THEN (vital_facts.value)::integer
            ELSE NULL::integer
        END AS score_total,
    vital_facts.modality,
    vital_facts.confidence,
    vital_facts.source_id,
    row_number() OVER (PARTITION BY vital_facts.student_id ORDER BY vital_facts.fact_date, vital_facts.source_id) AS nth
   FROM public.vital_facts
  WHERE (vital_facts.kind = 'sat_total_score'::text);


--
-- Name: v_scholarship_impact; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_scholarship_impact AS
 SELECT sch.student_id,
    sch.scholarship_name,
    sch.amount_usd,
    sch.application_status,
    sch.decision_date,
    COALESCE(r.overall_score, (0)::numeric) AS ivyready_score_final,
    (sch.amount_usd / 1000.0) AS affordability_boost,
    (r.overall_score + (sch.amount_usd / 5000.0)) AS adjusted_readiness_score
   FROM (public.scholarships sch
     LEFT JOIN public.ivyready_snapshots r ON (((r.student_id = sch.student_id) AND (r.snapshot_phase = 'final_submit'::text))));


--
-- Name: v_testing_timeline; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_testing_timeline AS
 SELECT kb_items.item_id,
    kb_items.student_id,
    kb_items.item_type,
    kb_items.subtype,
    kb_items.title_name,
    kb_items.tier1_state,
    kb_items.tier2_substate,
    kb_items.status_detail,
    kb_items.key_metric_type,
    kb_items.key_metric_value,
    kb_items.key_metric_unit,
    kb_items.deadline_date,
    kb_items.event_date,
    kb_items.submit_date,
    kb_items.outcome_date,
    kb_items.owner,
    kb_items.cadence,
    kb_items.evidence_links,
    kb_items.source_ref,
    kb_items.confidence,
    kb_items.created_ts,
    kb_items.updated_ts
   FROM public.kb_items
  WHERE (kb_items.item_type = 'Test'::text)
  ORDER BY kb_items.student_id, COALESCE(kb_items.event_date, kb_items.submit_date);


--
-- Name: v_transcript_final; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_transcript_final AS
 SELECT t.student_id,
    t.term_code,
    t.grade_level,
    c.course_title,
    c.subject_area,
    c.level,
    g.grade_letter,
    g.grade_percent,
    g.credits,
    g.weighting,
    t.source_id AS term_source,
    c.source_id AS course_source,
    g.source_id AS grade_source,
    LEAST(g.confidence, c.confidence, t.confidence) AS confidence,
    c.course_id AS chip_id,
    'academic_courses'::text AS chip_table
   FROM ((public.academic_terms t
     JOIN public.academic_courses c ON ((c.term_id = t.term_id)))
     JOIN public.academic_grades g ON ((g.course_id = c.course_id)))
  WHERE ((t.source_id = 'SRC-COMMONAPP-UNC'::text) AND (g.status = 'final'::text));


--
-- Name: v_transcript_initial; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_transcript_initial AS
 SELECT t.student_id,
    t.term_code,
    t.grade_level,
    c.course_title,
    c.subject_area,
    c.level,
    g.grade_letter,
    g.grade_percent,
    g.credits,
    g.weighting,
    t.source_id AS term_source,
    c.source_id AS course_source,
    g.source_id AS grade_source,
    LEAST(g.confidence, c.confidence, t.confidence) AS confidence,
    c.course_id AS chip_id,
    'academic_courses'::text AS chip_table
   FROM ((public.academic_terms t
     JOIN public.academic_courses c ON ((c.term_id = t.term_id)))
     JOIN public.academic_grades g ON ((g.course_id = c.course_id)))
  WHERE ((t.source_id ~~ 'SRC-GAMEPLAN%'::text) OR ((t.source_id ~~ 'SRC-GP%'::text) AND (g.status = ANY (ARRAY['final'::text, 'in_progress'::text]))));


--
-- Name: v_transcript_progression; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_transcript_progression AS
 SELECT t.student_id,
    t.term_code,
    t.grade_level,
    c.course_title,
    c.subject_area,
    c.level,
    g.grade_letter,
    g.grade_percent,
    g.credits,
    g.weighting,
    g.status,
    t.start_date,
    t.end_date,
    g.recorded_at,
    t.source_id AS term_source,
    c.source_id AS course_source,
    g.source_id AS grade_source,
    LEAST(g.confidence, c.confidence, t.confidence) AS confidence,
    c.course_id AS chip_id,
    'academic_courses'::text AS chip_table
   FROM ((public.academic_terms t
     JOIN public.academic_courses c ON ((c.term_id = t.term_id)))
     JOIN public.academic_grades g ON ((g.course_id = c.course_id)))
  ORDER BY t.start_date, t.term_code, c.course_title;


--
-- Name: vw_facts_normalized; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_facts_normalized AS
 SELECT vf.student_id,
    vf.kind,
    vf.value,
    vf.numeric_value,
    (vf.fact_date)::date AS fact_date,
    vf.confidence,
    vf.source_id,
    COALESCE(vf.modality, 'any'::text) AS modality
   FROM public.vital_facts vf
  WHERE (vf.value IS NOT NULL);


--
-- Name: autonomy_loop_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.autonomy_loop_log ALTER COLUMN id SET DEFAULT nextval('public.autonomy_loop_log_id_seq'::regclass);


--
-- Name: award_targets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.award_targets ALTER COLUMN id SET DEFAULT nextval('public.award_targets_id_seq'::regclass);


--
-- Name: award_targets_enum id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.award_targets_enum ALTER COLUMN id SET DEFAULT nextval('public.award_targets_enum_id_seq'::regclass);


--
-- Name: college_list college_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_list ALTER COLUMN college_id SET DEFAULT nextval('public.college_list_college_id_seq'::regclass);


--
-- Name: conversation_turns turn_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_turns ALTER COLUMN turn_id SET DEFAULT nextval('public.conversation_turns_turn_id_seq'::regclass);


--
-- Name: cross_namespace_links id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cross_namespace_links ALTER COLUMN id SET DEFAULT nextval('public.cross_namespace_links_id_seq'::regclass);


--
-- Name: ec_targets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ec_targets ALTER COLUMN id SET DEFAULT nextval('public.ec_targets_id_seq'::regclass);


--
-- Name: emotional_trajectory trajectory_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emotional_trajectory ALTER COLUMN trajectory_id SET DEFAULT nextval('public.emotional_trajectory_trajectory_id_seq'::regclass);


--
-- Name: narrative_targets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.narrative_targets ALTER COLUMN id SET DEFAULT nextval('public.narrative_targets_id_seq'::regclass);


--
-- Name: plan_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_events ALTER COLUMN id SET DEFAULT nextval('public.plan_events_id_seq'::regclass);


--
-- Name: proof_audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proof_audit_log ALTER COLUMN id SET DEFAULT nextval('public.proof_audit_log_id_seq'::regclass);


--
-- Name: query_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.query_log ALTER COLUMN id SET DEFAULT nextval('public.query_log_id_seq'::regclass);


--
-- Name: query_trace_artifacts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.query_trace_artifacts ALTER COLUMN id SET DEFAULT nextval('public.query_trace_artifacts_id_seq'::regclass);


--
-- Name: readiness_forecast_features id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.readiness_forecast_features ALTER COLUMN id SET DEFAULT nextval('public.readiness_forecast_features_id_seq'::regclass);


--
-- Name: sat_timeline_enum id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sat_timeline_enum ALTER COLUMN id SET DEFAULT nextval('public.sat_timeline_enum_id_seq'::regclass);


--
-- Name: scholarships scholarship_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scholarships ALTER COLUMN scholarship_id SET DEFAULT nextval('public.scholarships_scholarship_id_seq'::regclass);


--
-- Name: strategic_insights insight_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strategic_insights ALTER COLUMN insight_id SET DEFAULT nextval('public.strategic_insights_insight_id_seq'::regclass);


--
-- Name: student_facts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_facts ALTER COLUMN id SET DEFAULT nextval('public.student_facts_id_seq'::regclass);


--
-- Name: student_policy_memory id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_policy_memory ALTER COLUMN id SET DEFAULT nextval('public.student_policy_memory_id_seq'::regclass);


--
-- Name: tone_cue_training id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tone_cue_training ALTER COLUMN id SET DEFAULT nextval('public.tone_cue_training_id_seq'::regclass);


--
-- Name: trust_cue_training id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trust_cue_training ALTER COLUMN id SET DEFAULT nextval('public.trust_cue_training_id_seq'::regclass);


--
-- Name: unified_context context_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unified_context ALTER COLUMN context_id SET DEFAULT nextval('public.unified_context_context_id_seq'::regclass);


--
-- Name: academic_courses academic_courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_courses
    ADD CONSTRAINT academic_courses_pkey PRIMARY KEY (course_id);


--
-- Name: academic_courses academic_courses_student_id_term_id_course_title_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_courses
    ADD CONSTRAINT academic_courses_student_id_term_id_course_title_key UNIQUE (student_id, term_id, course_title);


--
-- Name: academic_gpa academic_gpa_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_gpa
    ADD CONSTRAINT academic_gpa_pkey PRIMARY KEY (gpa_id);


--
-- Name: academic_gpa academic_gpa_student_id_scope_scope_key_source_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_gpa
    ADD CONSTRAINT academic_gpa_student_id_scope_scope_key_source_id_key UNIQUE (student_id, scope, scope_key, source_id);


--
-- Name: academic_grades academic_grades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_grades
    ADD CONSTRAINT academic_grades_pkey PRIMARY KEY (grade_id);


--
-- Name: academic_grades academic_grades_student_id_course_id_status_source_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_grades
    ADD CONSTRAINT academic_grades_student_id_course_id_status_source_id_key UNIQUE (student_id, course_id, status, source_id);


--
-- Name: academic_terms academic_terms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_terms
    ADD CONSTRAINT academic_terms_pkey PRIMARY KEY (term_id);


--
-- Name: academic_terms academic_terms_student_id_term_code_source_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_terms
    ADD CONSTRAINT academic_terms_student_id_term_code_source_id_key UNIQUE (student_id, term_code, source_id);


--
-- Name: academics_events academics_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academics_events
    ADD CONSTRAINT academics_events_pkey PRIMARY KEY (student_id, event_id);


--
-- Name: academics_vitals academics_vitals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academics_vitals
    ADD CONSTRAINT academics_vitals_pkey PRIMARY KEY (student_id, week_no);


--
-- Name: action_defs action_defs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_defs
    ADD CONSTRAINT action_defs_pkey PRIMARY KEY (action_id);


--
-- Name: action_feature_effects action_feature_effects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_feature_effects
    ADD CONSTRAINT action_feature_effects_pkey PRIMARY KEY (action_id, feature_id);


--
-- Name: admissions_rubric_factors admissions_rubric_factors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admissions_rubric_factors
    ADD CONSTRAINT admissions_rubric_factors_pkey PRIMARY KEY (factor_id);


--
-- Name: admissions_rubric_factors admissions_rubric_factors_rubric_id_factor_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admissions_rubric_factors
    ADD CONSTRAINT admissions_rubric_factors_rubric_id_factor_id_key UNIQUE (rubric_id, factor_id);


--
-- Name: admissions_rubric admissions_rubric_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admissions_rubric
    ADD CONSTRAINT admissions_rubric_pkey PRIMARY KEY (rubric_id);


--
-- Name: admissions_rubric_scores admissions_rubric_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admissions_rubric_scores
    ADD CONSTRAINT admissions_rubric_scores_pkey PRIMARY KEY (score_id);


--
-- Name: admissions_rubric_scores admissions_rubric_scores_student_id_rubric_id_snapshot_phas_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admissions_rubric_scores
    ADD CONSTRAINT admissions_rubric_scores_student_id_rubric_id_snapshot_phas_key UNIQUE (student_id, rubric_id, snapshot_phase, as_of, factor_id);


--
-- Name: autonomy_loop_log autonomy_loop_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.autonomy_loop_log
    ADD CONSTRAINT autonomy_loop_log_pkey PRIMARY KEY (id);


--
-- Name: award_targets_enum award_targets_enum_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.award_targets_enum
    ADD CONSTRAINT award_targets_enum_pkey PRIMARY KEY (id);


--
-- Name: award_targets_enum award_targets_enum_student_id_phase_item_label_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.award_targets_enum
    ADD CONSTRAINT award_targets_enum_student_id_phase_item_label_key UNIQUE (student_id, phase, item_label);


--
-- Name: award_targets award_targets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.award_targets
    ADD CONSTRAINT award_targets_pkey PRIMARY KEY (id);


--
-- Name: award_targets award_targets_unique_student_label_phase; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.award_targets
    ADD CONSTRAINT award_targets_unique_student_label_phase UNIQUE (student_id, award_label, phase);


--
-- Name: canon canon_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.canon
    ADD CONSTRAINT canon_pkey PRIMARY KEY (key);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (message_id);


--
-- Name: chat_session_summaries chat_session_summaries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_session_summaries
    ADD CONSTRAINT chat_session_summaries_pkey PRIMARY KEY (session_id);


--
-- Name: chat_sessions chat_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_pkey PRIMARY KEY (session_id);


--
-- Name: coaches coaches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coaches
    ADD CONSTRAINT coaches_pkey PRIMARY KEY (coach_id);


--
-- Name: college_list college_list_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_list
    ADD CONSTRAINT college_list_pkey PRIMARY KEY (college_id);


--
-- Name: conversation_turns conversation_turns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_turns
    ADD CONSTRAINT conversation_turns_pkey PRIMARY KEY (turn_id);


--
-- Name: conversation_turns conversation_turns_session_id_turn_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_turns
    ADD CONSTRAINT conversation_turns_session_id_turn_number_key UNIQUE (session_id, turn_number);


--
-- Name: cross_namespace_links cross_namespace_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cross_namespace_links
    ADD CONSTRAINT cross_namespace_links_pkey PRIMARY KEY (id);


--
-- Name: cross_namespace_links cross_namespace_links_source_chip_id_target_chip_id_relatio_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cross_namespace_links
    ADD CONSTRAINT cross_namespace_links_source_chip_id_target_chip_id_relatio_key UNIQUE (source_chip_id, target_chip_id, relation_type);


--
-- Name: ec_targets ec_targets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ec_targets
    ADD CONSTRAINT ec_targets_pkey PRIMARY KEY (id);


--
-- Name: ec_targets ec_targets_student_id_phase_item_label_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ec_targets
    ADD CONSTRAINT ec_targets_student_id_phase_item_label_key UNIQUE (student_id, phase, item_label);


--
-- Name: ec_vitals ec_vitals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ec_vitals
    ADD CONSTRAINT ec_vitals_pkey PRIMARY KEY (vital_id);


--
-- Name: ec_vitals ec_vitals_student_id_chip_id_metric_name_as_of_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ec_vitals
    ADD CONSTRAINT ec_vitals_student_id_chip_id_metric_name_as_of_key UNIQUE (student_id, chip_id, metric_name, as_of);


--
-- Name: emotional_trajectory emotional_trajectory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emotional_trajectory
    ADD CONSTRAINT emotional_trajectory_pkey PRIMARY KEY (trajectory_id);


--
-- Name: eq_signal_sets eq_signal_sets_hash_sha256_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eq_signal_sets
    ADD CONSTRAINT eq_signal_sets_hash_sha256_key UNIQUE (hash_sha256);


--
-- Name: eq_signal_sets eq_signal_sets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eq_signal_sets
    ADD CONSTRAINT eq_signal_sets_pkey PRIMARY KEY (id);


--
-- Name: eq_signals eq_signals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eq_signals
    ADD CONSTRAINT eq_signals_pkey PRIMARY KEY (id);


--
-- Name: eq_utterances eq_utterances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eq_utterances
    ADD CONSTRAINT eq_utterances_pkey PRIMARY KEY (id);


--
-- Name: evidence_links evidence_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_links
    ADD CONSTRAINT evidence_links_pkey PRIMARY KEY (evidence_id);


--
-- Name: fact_kind_rules fact_kind_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_kind_rules
    ADD CONSTRAINT fact_kind_rules_pkey PRIMARY KEY (kind);


--
-- Name: fact_kinds fact_kinds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_kinds
    ADD CONSTRAINT fact_kinds_pkey PRIMARY KEY (kind);


--
-- Name: fact_observations fact_obs_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_observations
    ADD CONSTRAINT fact_obs_unique UNIQUE (dedupe_fingerprint);


--
-- Name: fact_observations fact_observations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_observations
    ADD CONSTRAINT fact_observations_pkey PRIMARY KEY (obs_id);


--
-- Name: fact_priorities fact_priorities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_priorities
    ADD CONSTRAINT fact_priorities_pkey PRIMARY KEY (kind);


--
-- Name: factor_feature_map factor_feature_map_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factor_feature_map
    ADD CONSTRAINT factor_feature_map_pkey PRIMARY KEY (rubric_id, factor_id, feature_id);


--
-- Name: feature_defs feature_defs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_defs
    ADD CONSTRAINT feature_defs_pkey PRIMARY KEY (feature_id);


--
-- Name: feature_snapshot_values feature_snapshot_values_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_snapshot_values
    ADD CONSTRAINT feature_snapshot_values_pkey PRIMARY KEY (snapshot_id, feature_id);


--
-- Name: feature_snapshots feature_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_snapshots
    ADD CONSTRAINT feature_snapshots_pkey PRIMARY KEY (snapshot_id);


--
-- Name: feature_snapshots feature_snapshots_student_id_rubric_id_as_of_engine_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_snapshots
    ADD CONSTRAINT feature_snapshots_student_id_rubric_id_as_of_engine_key UNIQUE (student_id, rubric_id, as_of, engine);


--
-- Name: framework_kinds framework_kinds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.framework_kinds
    ADD CONSTRAINT framework_kinds_pkey PRIMARY KEY (name);


--
-- Name: interactions_fts interactions_fts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactions_fts
    ADD CONSTRAINT interactions_fts_pkey PRIMARY KEY (id);


--
-- Name: interactions interactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactions
    ADD CONSTRAINT interactions_pkey PRIMARY KEY (snippet_id);


--
-- Name: ivyready_snapshot_factors ivyready_snapshot_factors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ivyready_snapshot_factors
    ADD CONSTRAINT ivyready_snapshot_factors_pkey PRIMARY KEY (snapshot_id, factor_id);


--
-- Name: ivyready_snapshot_features ivyready_snapshot_features_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ivyready_snapshot_features
    ADD CONSTRAINT ivyready_snapshot_features_pkey PRIMARY KEY (feature_id);


--
-- Name: ivyready_snapshots ivyready_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ivyready_snapshots
    ADD CONSTRAINT ivyready_snapshots_pkey PRIMARY KEY (snapshot_id);


--
-- Name: ivyready_snapshots ivyready_snapshots_student_id_rubric_id_snapshot_phase_as_o_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ivyready_snapshots
    ADD CONSTRAINT ivyready_snapshots_student_id_rubric_id_snapshot_phase_as_o_key UNIQUE (student_id, rubric_id, snapshot_phase, as_of);


--
-- Name: jtbd jtbd_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jtbd
    ADD CONSTRAINT jtbd_pkey PRIMARY KEY (jtbd_id);


--
-- Name: jtbd_weekly jtbd_weekly_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jtbd_weekly
    ADD CONSTRAINT jtbd_weekly_pkey PRIMARY KEY (jtbd_id);


--
-- Name: jtbd_weekly jtbd_weekly_student_id_week_number_job_type_job_description_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jtbd_weekly
    ADD CONSTRAINT jtbd_weekly_student_id_week_number_job_type_job_description_key UNIQUE (student_id, week_number, job_type, job_description);


--
-- Name: kb_chip_links kb_chip_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_chip_links
    ADD CONSTRAINT kb_chip_links_pkey PRIMARY KEY (chip_id, link_type, link_key);


--
-- Name: kb_chips kb_chips_content_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_chips
    ADD CONSTRAINT kb_chips_content_hash_key UNIQUE (content_hash);


--
-- Name: kb_chips kb_chips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_chips
    ADD CONSTRAINT kb_chips_pkey PRIMARY KEY (chip_id);


--
-- Name: kb_docs kb_docs_drive_file_id_sha256_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_docs
    ADD CONSTRAINT kb_docs_drive_file_id_sha256_key UNIQUE (drive_file_id, sha256);


--
-- Name: kb_docs kb_docs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_docs
    ADD CONSTRAINT kb_docs_pkey PRIMARY KEY (doc_id);


--
-- Name: kb_embeddings kb_embeddings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_embeddings
    ADD CONSTRAINT kb_embeddings_pkey PRIMARY KEY (chip_id);


--
-- Name: kb_items kb_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_items
    ADD CONSTRAINT kb_items_pkey PRIMARY KEY (item_id);


--
-- Name: kb_scan_cursors kb_scan_cursors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_scan_cursors
    ADD CONSTRAINT kb_scan_cursors_pkey PRIMARY KEY (source_system);


--
-- Name: kb_sources kb_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_sources
    ADD CONSTRAINT kb_sources_pkey PRIMARY KEY (source_id);


--
-- Name: lifecycle_items lifecycle_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lifecycle_items
    ADD CONSTRAINT lifecycle_items_pkey PRIMARY KEY (item_id);


--
-- Name: narrative_targets narrative_targets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.narrative_targets
    ADD CONSTRAINT narrative_targets_pkey PRIMARY KEY (id);


--
-- Name: observations observations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.observations
    ADD CONSTRAINT observations_pkey PRIMARY KEY (id);


--
-- Name: outcomes_backup_20250930_151933 outcomes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcomes_backup_20250930_151933
    ADD CONSTRAINT outcomes_pkey PRIMARY KEY (id);


--
-- Name: outcomes_backup_20250930_152339 outcomes_pkey1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcomes_backup_20250930_152339
    ADD CONSTRAINT outcomes_pkey1 PRIMARY KEY (outcome_id);


--
-- Name: outcomes_backup_20250930_152520 outcomes_pkey2; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcomes_backup_20250930_152520
    ADD CONSTRAINT outcomes_pkey2 PRIMARY KEY (outcome_id);


--
-- Name: outcomes_backup_20250930_152622 outcomes_pkey3; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcomes_backup_20250930_152622
    ADD CONSTRAINT outcomes_pkey3 PRIMARY KEY (outcome_id);


--
-- Name: outcomes_backup_20250930_152919 outcomes_pkey4; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcomes_backup_20250930_152919
    ADD CONSTRAINT outcomes_pkey4 PRIMARY KEY (outcome_id);


--
-- Name: outcomes_backup_20250930_153115 outcomes_pkey5; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcomes_backup_20250930_153115
    ADD CONSTRAINT outcomes_pkey5 PRIMARY KEY (outcome_id);


--
-- Name: outcomes_backup_20250930_153331 outcomes_pkey6; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcomes_backup_20250930_153331
    ADD CONSTRAINT outcomes_pkey6 PRIMARY KEY (outcome_id);


--
-- Name: outcomes_backup_20250930_153430 outcomes_pkey7; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcomes_backup_20250930_153430
    ADD CONSTRAINT outcomes_pkey7 PRIMARY KEY (outcome_id);


--
-- Name: outcomes outcomes_pkey8; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcomes
    ADD CONSTRAINT outcomes_pkey8 PRIMARY KEY (outcome_id);


--
-- Name: plan_events plan_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_events
    ADD CONSTRAINT plan_events_pkey PRIMARY KEY (id);


--
-- Name: proof_audit_log proof_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proof_audit_log
    ADD CONSTRAINT proof_audit_log_pkey PRIMARY KEY (id);


--
-- Name: proof_registry proof_registry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proof_registry
    ADD CONSTRAINT proof_registry_pkey PRIMARY KEY (artifact_id);


--
-- Name: query_log query_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.query_log
    ADD CONSTRAINT query_log_pkey PRIMARY KEY (id);


--
-- Name: query_trace_artifacts query_trace_artifacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.query_trace_artifacts
    ADD CONSTRAINT query_trace_artifacts_pkey PRIMARY KEY (id);


--
-- Name: query_trace_events query_trace_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.query_trace_events
    ADD CONSTRAINT query_trace_events_pkey PRIMARY KEY (id);


--
-- Name: query_trace_events query_trace_events_trace_id_sequence_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.query_trace_events
    ADD CONSTRAINT query_trace_events_trace_id_sequence_key UNIQUE (trace_id, sequence);


--
-- Name: query_traces query_traces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.query_traces
    ADD CONSTRAINT query_traces_pkey PRIMARY KEY (id);


--
-- Name: readiness_feature_weights readiness_feature_weights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.readiness_feature_weights
    ADD CONSTRAINT readiness_feature_weights_pkey PRIMARY KEY (feature_key);


--
-- Name: readiness_forecast_features readiness_forecast_features_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.readiness_forecast_features
    ADD CONSTRAINT readiness_forecast_features_pkey PRIMARY KEY (id);


--
-- Name: readiness_forecast_features readiness_forecast_features_user_id_snapshot_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.readiness_forecast_features
    ADD CONSTRAINT readiness_forecast_features_user_id_snapshot_date_key UNIQUE (user_id, snapshot_date);


--
-- Name: readiness_snapshots readiness_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.readiness_snapshots
    ADD CONSTRAINT readiness_snapshots_pkey PRIMARY KEY (snapshot_id);


--
-- Name: sat_timeline_enum sat_timeline_enum_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sat_timeline_enum
    ADD CONSTRAINT sat_timeline_enum_pkey PRIMARY KEY (id);


--
-- Name: scholarships scholarships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scholarships
    ADD CONSTRAINT scholarships_pkey PRIMARY KEY (scholarship_id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (session_id);


--
-- Name: sources sources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sources
    ADD CONSTRAINT sources_pkey PRIMARY KEY (source_id);


--
-- Name: strategic_insights strategic_insights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strategic_insights
    ADD CONSTRAINT strategic_insights_pkey PRIMARY KEY (insight_id);


--
-- Name: student_coach_assignments student_coach_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_coach_assignments
    ADD CONSTRAINT student_coach_assignments_pkey PRIMARY KEY (student_id, coach_id);


--
-- Name: student_facts student_facts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_facts
    ADD CONSTRAINT student_facts_pkey PRIMARY KEY (id);


--
-- Name: student_policy_memory student_policy_memory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_policy_memory
    ADD CONSTRAINT student_policy_memory_pkey PRIMARY KEY (id);


--
-- Name: student_state student_state_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_state
    ADD CONSTRAINT student_state_pkey PRIMARY KEY (student_id);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (student_id);


--
-- Name: tactic_kinds tactic_kinds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tactic_kinds
    ADD CONSTRAINT tactic_kinds_pkey PRIMARY KEY (name);


--
-- Name: tone_cue_training tone_cue_training_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tone_cue_training
    ADD CONSTRAINT tone_cue_training_pkey PRIMARY KEY (id);


--
-- Name: trust_cue_training trust_cue_training_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trust_cue_training
    ADD CONSTRAINT trust_cue_training_pkey PRIMARY KEY (id);


--
-- Name: unified_context unified_context_cache_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unified_context
    ADD CONSTRAINT unified_context_cache_key_key UNIQUE (cache_key);


--
-- Name: unified_context unified_context_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unified_context
    ADD CONSTRAINT unified_context_pkey PRIMARY KEY (context_id);


--
-- Name: vital_facts vital_facts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vital_facts
    ADD CONSTRAINT vital_facts_pkey PRIMARY KEY (fact_id);


--
-- Name: idx_acad_events_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_acad_events_student ON public.academics_events USING btree (student_id);


--
-- Name: idx_acad_events_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_acad_events_type ON public.academics_events USING btree (student_id, event_type);


--
-- Name: idx_acad_vitals_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_acad_vitals_student ON public.academics_vitals USING btree (student_id);


--
-- Name: idx_acad_vitals_student_week; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_acad_vitals_student_week ON public.academics_vitals USING btree (student_id, week_no);


--
-- Name: idx_academic_courses_sid_term; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_academic_courses_sid_term ON public.academic_courses USING btree (student_id, term_id);


--
-- Name: idx_academic_gpa_sid_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_academic_gpa_sid_scope ON public.academic_gpa USING btree (student_id, scope, scope_key);


--
-- Name: idx_academic_grades_course; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_academic_grades_course ON public.academic_grades USING btree (course_id);


--
-- Name: idx_academic_grades_sid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_academic_grades_sid ON public.academic_grades USING btree (student_id);


--
-- Name: idx_academic_terms_sid_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_academic_terms_sid_code ON public.academic_terms USING btree (student_id, term_code);


--
-- Name: idx_assignments_coach; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignments_coach ON public.student_coach_assignments USING btree (coach_id) WHERE (is_active = true);


--
-- Name: idx_assignments_primary; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignments_primary ON public.student_coach_assignments USING btree (student_id, is_primary) WHERE (is_primary = true);


--
-- Name: idx_assignments_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignments_student ON public.student_coach_assignments USING btree (student_id) WHERE (is_active = true);


--
-- Name: idx_autonomy_loop_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_autonomy_loop_log_created_at ON public.autonomy_loop_log USING btree (created_at DESC);


--
-- Name: idx_autonomy_loop_log_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_autonomy_loop_log_stage ON public.autonomy_loop_log USING btree (loop_stage);


--
-- Name: idx_autonomy_loop_log_success; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_autonomy_loop_log_success ON public.autonomy_loop_log USING btree (success);


--
-- Name: idx_autonomy_loop_log_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_autonomy_loop_log_user_id ON public.autonomy_loop_log USING btree (user_id);


--
-- Name: idx_award_targets_asof; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_award_targets_asof ON public.award_targets USING btree (student_id, as_of);


--
-- Name: idx_award_targets_enum_asof; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_award_targets_enum_asof ON public.award_targets_enum USING btree (as_of);


--
-- Name: idx_award_targets_enum_sid_phase; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_award_targets_enum_sid_phase ON public.award_targets_enum USING btree (student_id, phase);


--
-- Name: idx_award_targets_sid_phase; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_award_targets_sid_phase ON public.award_targets USING btree (student_id, phase);


--
-- Name: idx_award_targets_student_phase; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_award_targets_student_phase ON public.award_targets USING btree (student_id, phase);


--
-- Name: idx_canon_source_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_canon_source_type ON public.canon USING btree (source_type);


--
-- Name: idx_canon_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_canon_student_id ON public.canon USING btree (student_id);


--
-- Name: idx_chat_messages_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_session ON public.chat_messages USING btree (session_id, created_ts DESC);


--
-- Name: idx_chat_sessions_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_sessions_student ON public.chat_sessions USING btree (student_id);


--
-- Name: idx_chat_sessions_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_sessions_updated ON public.chat_sessions USING btree (updated_ts DESC);


--
-- Name: idx_coaches_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coaches_active ON public.coaches USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_coaches_specialization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coaches_specialization ON public.coaches USING gin (specialization);


--
-- Name: idx_context_cache_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_context_cache_key ON public.unified_context USING btree (cache_key) WHERE (is_stale = false);


--
-- Name: idx_context_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_context_expiry ON public.unified_context USING btree (expires_at) WHERE (is_stale = false);


--
-- Name: idx_context_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_context_session ON public.unified_context USING btree (session_id) WHERE (session_id IS NOT NULL);


--
-- Name: idx_context_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_context_student ON public.unified_context USING btree (student_id, snapshot_at DESC);


--
-- Name: idx_cross_namespace_links_confidence; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cross_namespace_links_confidence ON public.cross_namespace_links USING btree (confidence DESC);


--
-- Name: idx_cross_namespace_links_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cross_namespace_links_source ON public.cross_namespace_links USING btree (source_chip_id);


--
-- Name: idx_cross_namespace_links_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cross_namespace_links_target ON public.cross_namespace_links USING btree (target_chip_id);


--
-- Name: idx_ec_targets_sid_phase; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ec_targets_sid_phase ON public.ec_targets USING btree (student_id, phase);


--
-- Name: idx_ec_vitals_as_of; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ec_vitals_as_of ON public.ec_vitals USING btree (as_of);


--
-- Name: idx_ec_vitals_chip; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ec_vitals_chip ON public.ec_vitals USING btree (chip_id);


--
-- Name: idx_ec_vitals_metric_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ec_vitals_metric_name ON public.ec_vitals USING btree (metric_name);


--
-- Name: idx_ec_vitals_metric_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ec_vitals_metric_type ON public.ec_vitals USING btree (metric_type);


--
-- Name: idx_ec_vitals_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ec_vitals_source ON public.ec_vitals USING btree (source_id);


--
-- Name: idx_ec_vitals_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ec_vitals_student ON public.ec_vitals USING btree (student_id);


--
-- Name: idx_ec_vitals_student_chip; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ec_vitals_student_chip ON public.ec_vitals USING btree (student_id, chip_id);


--
-- Name: idx_eq_signal_sets_phase; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eq_signal_sets_phase ON public.eq_signal_sets USING btree (phase);


--
-- Name: idx_eq_signal_sets_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eq_signal_sets_student ON public.eq_signal_sets USING btree (student_id);


--
-- Name: idx_eq_signals_cue; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eq_signals_cue ON public.eq_signals USING btree (cue);


--
-- Name: idx_eq_signals_set; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eq_signals_set ON public.eq_signals USING btree (set_id);


--
-- Name: idx_eq_utterances_move_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eq_utterances_move_type ON public.eq_utterances USING btree (move_type);


--
-- Name: idx_eq_utterances_set; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eq_utterances_set ON public.eq_utterances USING btree (set_id);


--
-- Name: idx_eq_utterances_speaker; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eq_utterances_speaker ON public.eq_utterances USING btree (speaker);


--
-- Name: idx_evidence_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_evidence_source ON public.evidence_links USING btree (source_id);


--
-- Name: idx_fact_obs_dedupe; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_obs_dedupe ON public.fact_observations USING btree (dedupe_fingerprint);


--
-- Name: idx_fact_obs_event_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_obs_event_date ON public.fact_observations USING btree (event_date);


--
-- Name: idx_fact_obs_student_kind; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fact_obs_student_kind ON public.fact_observations USING btree (student_id, kind);


--
-- Name: idx_factor_feature_map_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_factor_feature_map_lookup ON public.factor_feature_map USING btree (rubric_id, factor_id);


--
-- Name: idx_facts_kind; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facts_kind ON public.vital_facts USING btree (kind);


--
-- Name: idx_facts_norm_mv_invalid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facts_norm_mv_invalid ON public.facts_normalized_mv USING btree (kind, is_valid) WHERE (is_valid = false);


--
-- Name: idx_facts_norm_mv_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facts_norm_mv_lookup ON public.facts_normalized_mv USING btree (student_id, kind, is_valid, fact_date DESC);


--
-- Name: idx_facts_student_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facts_student_date ON public.vital_facts USING btree (student_id, fact_date DESC);


--
-- Name: idx_feature_snapshot_values_snapshot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feature_snapshot_values_snapshot ON public.feature_snapshot_values USING btree (snapshot_id);


--
-- Name: idx_feature_snapshots_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feature_snapshots_student ON public.feature_snapshots USING btree (student_id, as_of DESC);


--
-- Name: idx_insights_confidence; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_insights_confidence ON public.strategic_insights USING btree (student_id, confidence_score DESC) WHERE (is_active = true);


--
-- Name: idx_insights_evergreen; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_insights_evergreen ON public.strategic_insights USING btree (student_id, is_evergreen) WHERE (is_evergreen = true);


--
-- Name: idx_insights_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_insights_expiry ON public.strategic_insights USING btree (expires_at) WHERE (expires_at IS NOT NULL);


--
-- Name: idx_insights_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_insights_student ON public.strategic_insights USING btree (student_id, is_active) WHERE (is_active = true);


--
-- Name: idx_insights_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_insights_type ON public.strategic_insights USING btree (insight_type);


--
-- Name: idx_interactions_fts_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interactions_fts_student ON public.interactions_fts USING btree (student_id);


--
-- Name: idx_interactions_fts_vector; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interactions_fts_vector ON public.interactions_fts USING gin (vector);


--
-- Name: idx_interactions_jtbd; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interactions_jtbd ON public.interactions USING btree (jtbd_id);


--
-- Name: idx_interactions_student_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interactions_student_date ON public.interactions USING btree (student_id, occurred_at DESC);


--
-- Name: idx_interactions_tactic; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interactions_tactic ON public.interactions USING btree (tactic_name);


--
-- Name: idx_jtbd_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jtbd_student ON public.jtbd USING btree (student_id);


--
-- Name: idx_jtbd_weekly_completion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jtbd_weekly_completion ON public.jtbd_weekly USING btree (completion_date);


--
-- Name: idx_jtbd_weekly_job_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jtbd_weekly_job_type ON public.jtbd_weekly USING btree (job_type);


--
-- Name: idx_jtbd_weekly_linked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jtbd_weekly_linked ON public.jtbd_weekly USING btree (linked_chip_id);


--
-- Name: idx_jtbd_weekly_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jtbd_weekly_source ON public.jtbd_weekly USING btree (source_id);


--
-- Name: idx_jtbd_weekly_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jtbd_weekly_status ON public.jtbd_weekly USING btree (status);


--
-- Name: idx_jtbd_weekly_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jtbd_weekly_student ON public.jtbd_weekly USING btree (student_id);


--
-- Name: idx_jtbd_weekly_student_week; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jtbd_weekly_student_week ON public.jtbd_weekly USING btree (student_id, week_number);


--
-- Name: idx_jtbd_weekly_week; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jtbd_weekly_week ON public.jtbd_weekly USING btree (week_number);


--
-- Name: idx_kb_chip_links_type_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kb_chip_links_type_key ON public.kb_chip_links USING btree (link_type, link_key);


--
-- Name: idx_kb_chips_award; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kb_chips_award ON public.kb_chips USING btree (award) WHERE (award IS NOT NULL);


--
-- Name: idx_kb_chips_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kb_chips_date ON public.kb_chips USING btree (chip_date) WHERE (chip_date IS NOT NULL);


--
-- Name: idx_kb_chips_doc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kb_chips_doc ON public.kb_chips USING btree (doc_id);


--
-- Name: idx_kb_chips_framework; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kb_chips_framework ON public.kb_chips USING btree (framework) WHERE (framework IS NOT NULL);


--
-- Name: idx_kb_chips_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kb_chips_student ON public.kb_chips USING btree (student_id);


--
-- Name: idx_kb_chips_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kb_chips_tags ON public.kb_chips USING gin (tags);


--
-- Name: idx_kb_chips_temporal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kb_chips_temporal ON public.kb_chips USING btree (student_id, ended_at DESC NULLS LAST, started_at DESC NULLS LAST);


--
-- Name: idx_kb_chips_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kb_chips_type ON public.kb_chips USING btree (chip_type);


--
-- Name: idx_kb_docs_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kb_docs_domain ON public.kb_docs USING btree (domain);


--
-- Name: idx_kb_docs_dt_anchor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kb_docs_dt_anchor ON public.kb_docs USING btree (dt_anchor);


--
-- Name: idx_kb_docs_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kb_docs_student ON public.kb_docs USING btree (student_id);


--
-- Name: idx_kb_embeddings_model; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kb_embeddings_model ON public.kb_embeddings USING btree (embed_model);


--
-- Name: idx_kb_items_by_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kb_items_by_student ON public.kb_items USING btree (student_id);


--
-- Name: idx_kb_items_edges; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kb_items_edges ON public.kb_items USING gin (edges);


--
-- Name: idx_kb_items_type_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kb_items_type_state ON public.kb_items USING btree (item_type, tier1_state, outcome_date, event_date, submit_date);


--
-- Name: idx_lifecycle_jtbd; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lifecycle_jtbd ON public.lifecycle_items USING btree (jtbd_id);


--
-- Name: idx_lifecycle_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lifecycle_student ON public.lifecycle_items USING btree (student_id);


--
-- Name: idx_narrative_targets_sid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_narrative_targets_sid ON public.narrative_targets USING btree (student_id);


--
-- Name: idx_observations_student_kind_subtype_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_observations_student_kind_subtype_at ON public.observations USING btree (student_id, kind, subtype, at);


--
-- Name: idx_one_primary_coach_per_student; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_one_primary_coach_per_student ON public.student_coach_assignments USING btree (student_id) WHERE ((is_primary = true) AND (is_active = true));


--
-- Name: idx_outcomes_jtbd; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_outcomes_jtbd ON public.outcomes_backup_20250930_152339 USING btree (jtbd_id);


--
-- Name: idx_outcomes_programs; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_outcomes_programs ON public.outcomes USING btree (student_id, type, occurred_at);


--
-- Name: idx_outcomes_student_category_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_outcomes_student_category_period ON public.outcomes_backup_20250930_151933 USING btree (student_id, category, period);


--
-- Name: idx_outcomes_student_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_outcomes_student_date ON public.outcomes_backup_20250930_152339 USING btree (student_id, occurred_at DESC);


--
-- Name: idx_plan_events_kind; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_events_kind ON public.plan_events USING btree (event);


--
-- Name: idx_plan_events_sid_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_events_sid_date ON public.plan_events USING btree (student_id, as_of);


--
-- Name: idx_policy_memory_student_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_policy_memory_student_key ON public.student_policy_memory USING btree (student_id, memory_key);


--
-- Name: idx_proof_audit_log_artifact_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proof_audit_log_artifact_id ON public.proof_audit_log USING btree (artifact_id);


--
-- Name: idx_proof_audit_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proof_audit_log_created_at ON public.proof_audit_log USING btree (created_at DESC);


--
-- Name: idx_proof_registry_artifact_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proof_registry_artifact_type ON public.proof_registry USING btree (artifact_type);


--
-- Name: idx_proof_registry_chip_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proof_registry_chip_id ON public.proof_registry USING btree (chip_id);


--
-- Name: idx_proof_registry_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proof_registry_score ON public.proof_registry USING btree (score DESC);


--
-- Name: idx_proof_registry_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proof_registry_timestamp ON public.proof_registry USING btree ("timestamp" DESC);


--
-- Name: idx_proof_registry_verified; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proof_registry_verified ON public.proof_registry USING btree (verified);


--
-- Name: idx_query_traces_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_traces_created_at ON public.query_traces USING btree (created_at DESC);


--
-- Name: idx_query_traces_intent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_traces_intent ON public.query_traces USING btree (intent);


--
-- Name: idx_query_traces_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_traces_session_id ON public.query_traces USING btree (session_id);


--
-- Name: idx_query_traces_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_traces_student_id ON public.query_traces USING btree (student_id);


--
-- Name: idx_readiness_forecast_readiness_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_readiness_forecast_readiness_score ON public.readiness_forecast_features USING btree (readiness_score DESC);


--
-- Name: idx_readiness_forecast_snapshot_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_readiness_forecast_snapshot_date ON public.readiness_forecast_features USING btree (snapshot_date DESC);


--
-- Name: idx_readiness_forecast_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_readiness_forecast_user_id ON public.readiness_forecast_features USING btree (user_id);


--
-- Name: idx_readiness_snapshots_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_readiness_snapshots_name ON public.readiness_snapshots USING btree (student_id, snapshot_name);


--
-- Name: idx_readiness_snapshots_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_readiness_snapshots_student ON public.readiness_snapshots USING btree (student_id, created_at DESC);


--
-- Name: idx_rfw_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rfw_domain ON public.readiness_feature_weights USING btree (domain);


--
-- Name: idx_rubric_scores_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rubric_scores_lookup ON public.admissions_rubric_scores USING btree (student_id, rubric_id, snapshot_phase, factor_id);


--
-- Name: idx_rubric_scores_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rubric_scores_student ON public.admissions_rubric_scores USING btree (student_id, snapshot_phase, as_of DESC);


--
-- Name: idx_sat_timeline_enum_sid_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sat_timeline_enum_sid_date ON public.sat_timeline_enum USING btree (student_id, as_of);


--
-- Name: idx_sessions_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_active ON public.sessions USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_sessions_coach; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_coach ON public.sessions USING btree (coach_id, started_at DESC);


--
-- Name: idx_sessions_started_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_started_at ON public.sessions USING btree (started_at DESC);


--
-- Name: idx_sessions_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_student ON public.sessions USING btree (student_id, started_at DESC);


--
-- Name: idx_sessions_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_type ON public.sessions USING btree (session_type);


--
-- Name: idx_sources_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sources_student ON public.sources USING btree (student_id);


--
-- Name: idx_student_facts_student_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_facts_student_key ON public.student_facts USING btree (student_id, fact_key);


--
-- Name: idx_students_grad_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_grad_year ON public.students USING btree (graduation_year);


--
-- Name: idx_students_target_schools; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_target_schools ON public.students USING gin (target_schools);


--
-- Name: idx_tone_cue_training_source_namespace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tone_cue_training_source_namespace ON public.tone_cue_training USING btree (source_namespace);


--
-- Name: idx_tone_cue_training_tone_label; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tone_cue_training_tone_label ON public.tone_cue_training USING btree (tone_label);


--
-- Name: idx_tone_cue_training_validated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tone_cue_training_validated ON public.tone_cue_training USING btree (validated);


--
-- Name: idx_trace_events_api_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trace_events_api_provider ON public.query_trace_events USING btree (api_provider);


--
-- Name: idx_trace_events_component; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trace_events_component ON public.query_trace_events USING btree (component);


--
-- Name: idx_trace_events_operation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trace_events_operation ON public.query_trace_events USING btree (operation);


--
-- Name: idx_trace_events_trace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trace_events_trace_id ON public.query_trace_events USING btree (trace_id);


--
-- Name: idx_trajectory_mood; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trajectory_mood ON public.emotional_trajectory USING btree (student_id, mood);


--
-- Name: idx_trajectory_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trajectory_session ON public.emotional_trajectory USING btree (session_id, measured_at) WHERE (session_id IS NOT NULL);


--
-- Name: idx_trajectory_stress; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trajectory_stress ON public.emotional_trajectory USING btree (student_id, stress_level DESC);


--
-- Name: idx_trajectory_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trajectory_student ON public.emotional_trajectory USING btree (student_id, measured_at DESC);


--
-- Name: idx_trajectory_trigger; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trajectory_trigger ON public.emotional_trajectory USING btree (trigger_category);


--
-- Name: idx_trust_cue_training_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trust_cue_training_session_id ON public.trust_cue_training USING btree (session_id);


--
-- Name: idx_trust_cue_training_trust_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trust_cue_training_trust_score ON public.trust_cue_training USING btree (trust_score DESC);


--
-- Name: idx_trust_cue_training_validated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trust_cue_training_validated ON public.trust_cue_training USING btree (validated);


--
-- Name: idx_turns_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_turns_created_at ON public.conversation_turns USING btree (created_at DESC);


--
-- Name: idx_turns_healed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_turns_healed ON public.conversation_turns USING btree (session_id, was_healed) WHERE (was_healed = true);


--
-- Name: idx_turns_quality; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_turns_quality ON public.conversation_turns USING btree (session_id) WHERE (((quality_score ->> 'factuality'::text))::numeric < 0.9);


--
-- Name: idx_turns_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_turns_session ON public.conversation_turns USING btree (session_id, turn_number);


--
-- Name: ix_ae_student_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ae_student_type ON public.academics_events USING btree (student_id, event_type);


--
-- Name: ix_av_student_week; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_av_student_week ON public.academics_vitals USING btree (student_id, week_no);


--
-- Name: jtbd_fts_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX jtbd_fts_gin ON public.jtbd_fts USING gin (tsv);


--
-- Name: jtbd_fts_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX jtbd_fts_id ON public.jtbd_fts USING btree (id);


--
-- Name: kb_items_by_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kb_items_by_student ON public.kb_items USING btree (student_id);


--
-- Name: kb_items_source_ref; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kb_items_source_ref ON public.kb_items USING btree (source_ref);


--
-- Name: kb_items_temporal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kb_items_temporal ON public.kb_items USING btree (student_id, item_type, COALESCE(outcome_date, event_date, submit_date, deadline_date));


--
-- Name: kb_items_type_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kb_items_type_state ON public.kb_items USING btree (item_type, tier1_state, outcome_date, event_date, submit_date);


--
-- Name: query_log_ts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX query_log_ts ON public.query_log USING btree (ts DESC);


--
-- Name: uq_eq_signals_set_cue_evh; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_eq_signals_set_cue_evh ON public.eq_signals USING btree (set_id, cue, evidence_hash);


--
-- Name: recent_traces _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.recent_traces AS
 SELECT t.id,
    t.session_id,
    t.student_id,
    t.message,
    t.intent,
    t.detected_fact_kinds,
    t.start_time,
    t.duration_ms,
    t.model_used,
    t.error,
    count(e.id) AS event_count,
    count(DISTINCT e.api_provider) AS api_providers_used
   FROM (public.query_traces t
     LEFT JOIN public.query_trace_events e ON ((t.id = e.trace_id)))
  WHERE (t.created_at > (now() - '24:00:00'::interval))
  GROUP BY t.id
  ORDER BY t.created_at DESC;


--
-- Name: coaches coaches_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER coaches_updated_at_trigger BEFORE UPDATE ON public.coaches FOR EACH ROW EXECUTE FUNCTION public.update_coaches_updated_at();


--
-- Name: conversation_turns conversation_turns_increment_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER conversation_turns_increment_trigger AFTER INSERT ON public.conversation_turns FOR EACH ROW EXECUTE FUNCTION public.increment_session_turn_count();


--
-- Name: strategic_insights insights_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER insights_updated_at_trigger BEFORE UPDATE ON public.strategic_insights FOR EACH ROW EXECUTE FUNCTION public.update_insights_updated_at();


--
-- Name: conversation_turns invalidate_stale_context_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER invalidate_stale_context_trigger AFTER INSERT ON public.conversation_turns FOR EACH ROW EXECUTE FUNCTION public.invalidate_stale_context();


--
-- Name: proof_registry proof_registry_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER proof_registry_updated_at BEFORE UPDATE ON public.proof_registry FOR EACH ROW EXECUTE FUNCTION public.update_proof_registry_timestamp();


--
-- Name: students students_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER students_updated_at_trigger BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_students_updated_at();


--
-- Name: interactions sync_interactions_fts_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sync_interactions_fts_trigger AFTER INSERT OR DELETE OR UPDATE ON public.interactions FOR EACH ROW EXECUTE FUNCTION public.sync_interactions_fts();


--
-- Name: unified_context unified_context_expiry_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER unified_context_expiry_trigger BEFORE INSERT OR UPDATE ON public.unified_context FOR EACH ROW EXECUTE FUNCTION public.set_context_expiry();


--
-- Name: chat_messages update_session_on_message; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_session_on_message AFTER INSERT ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION public.update_session_timestamp();


--
-- Name: academic_courses academic_courses_term_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_courses
    ADD CONSTRAINT academic_courses_term_id_fkey FOREIGN KEY (term_id) REFERENCES public.academic_terms(term_id) ON DELETE CASCADE;


--
-- Name: academic_grades academic_grades_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_grades
    ADD CONSTRAINT academic_grades_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.academic_courses(course_id) ON DELETE CASCADE;


--
-- Name: action_feature_effects action_feature_effects_action_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_feature_effects
    ADD CONSTRAINT action_feature_effects_action_id_fkey FOREIGN KEY (action_id) REFERENCES public.action_defs(action_id);


--
-- Name: action_feature_effects action_feature_effects_feature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_feature_effects
    ADD CONSTRAINT action_feature_effects_feature_id_fkey FOREIGN KEY (feature_id) REFERENCES public.feature_defs(feature_id);


--
-- Name: admissions_rubric_factors admissions_rubric_factors_rubric_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admissions_rubric_factors
    ADD CONSTRAINT admissions_rubric_factors_rubric_id_fkey FOREIGN KEY (rubric_id) REFERENCES public.admissions_rubric(rubric_id);


--
-- Name: admissions_rubric_scores admissions_rubric_scores_factor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admissions_rubric_scores
    ADD CONSTRAINT admissions_rubric_scores_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES public.admissions_rubric_factors(factor_id);


--
-- Name: admissions_rubric_scores admissions_rubric_scores_rubric_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admissions_rubric_scores
    ADD CONSTRAINT admissions_rubric_scores_rubric_id_fkey FOREIGN KEY (rubric_id) REFERENCES public.admissions_rubric(rubric_id);


--
-- Name: admissions_rubric_scores admissions_rubric_scores_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admissions_rubric_scores
    ADD CONSTRAINT admissions_rubric_scores_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.sources(source_id);


--
-- Name: admissions_rubric_scores admissions_rubric_scores_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admissions_rubric_scores
    ADD CONSTRAINT admissions_rubric_scores_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: award_targets award_targets_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.award_targets
    ADD CONSTRAINT award_targets_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.sources(source_id);


--
-- Name: chat_messages chat_messages_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(session_id) ON DELETE CASCADE;


--
-- Name: chat_session_summaries chat_session_summaries_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_session_summaries
    ADD CONSTRAINT chat_session_summaries_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(session_id) ON DELETE CASCADE;


--
-- Name: chat_sessions chat_sessions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: college_list college_list_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_list
    ADD CONSTRAINT college_list_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: conversation_turns conversation_turns_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_turns
    ADD CONSTRAINT conversation_turns_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(session_id) ON DELETE CASCADE;


--
-- Name: cross_namespace_links cross_namespace_links_source_chip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cross_namespace_links
    ADD CONSTRAINT cross_namespace_links_source_chip_id_fkey FOREIGN KEY (source_chip_id) REFERENCES public.kb_items(item_id) ON DELETE CASCADE;


--
-- Name: cross_namespace_links cross_namespace_links_target_chip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cross_namespace_links
    ADD CONSTRAINT cross_namespace_links_target_chip_id_fkey FOREIGN KEY (target_chip_id) REFERENCES public.kb_items(item_id) ON DELETE CASCADE;


--
-- Name: ec_vitals ec_vitals_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ec_vitals
    ADD CONSTRAINT ec_vitals_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id);


--
-- Name: emotional_trajectory emotional_trajectory_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emotional_trajectory
    ADD CONSTRAINT emotional_trajectory_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(session_id) ON DELETE SET NULL;


--
-- Name: emotional_trajectory emotional_trajectory_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emotional_trajectory
    ADD CONSTRAINT emotional_trajectory_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: emotional_trajectory emotional_trajectory_turn_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emotional_trajectory
    ADD CONSTRAINT emotional_trajectory_turn_id_fkey FOREIGN KEY (turn_id) REFERENCES public.conversation_turns(turn_id) ON DELETE SET NULL;


--
-- Name: eq_signals eq_signals_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eq_signals
    ADD CONSTRAINT eq_signals_set_id_fkey FOREIGN KEY (set_id) REFERENCES public.eq_signal_sets(id) ON DELETE CASCADE;


--
-- Name: eq_utterances eq_utterances_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eq_utterances
    ADD CONSTRAINT eq_utterances_set_id_fkey FOREIGN KEY (set_id) REFERENCES public.eq_signal_sets(id) ON DELETE CASCADE;


--
-- Name: evidence_links evidence_links_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_links
    ADD CONSTRAINT evidence_links_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.sources(source_id) ON DELETE RESTRICT;


--
-- Name: fact_observations fact_observations_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fact_observations
    ADD CONSTRAINT fact_observations_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.sources(source_id);


--
-- Name: factor_feature_map factor_feature_map_factor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factor_feature_map
    ADD CONSTRAINT factor_feature_map_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES public.admissions_rubric_factors(factor_id);


--
-- Name: factor_feature_map factor_feature_map_feature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factor_feature_map
    ADD CONSTRAINT factor_feature_map_feature_id_fkey FOREIGN KEY (feature_id) REFERENCES public.feature_defs(feature_id);


--
-- Name: factor_feature_map factor_feature_map_rubric_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factor_feature_map
    ADD CONSTRAINT factor_feature_map_rubric_id_fkey FOREIGN KEY (rubric_id) REFERENCES public.admissions_rubric(rubric_id);


--
-- Name: feature_snapshot_values feature_snapshot_values_feature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_snapshot_values
    ADD CONSTRAINT feature_snapshot_values_feature_id_fkey FOREIGN KEY (feature_id) REFERENCES public.feature_defs(feature_id);


--
-- Name: feature_snapshot_values feature_snapshot_values_snapshot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_snapshot_values
    ADD CONSTRAINT feature_snapshot_values_snapshot_id_fkey FOREIGN KEY (snapshot_id) REFERENCES public.feature_snapshots(snapshot_id) ON DELETE CASCADE;


--
-- Name: feature_snapshots feature_snapshots_rubric_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_snapshots
    ADD CONSTRAINT feature_snapshots_rubric_id_fkey FOREIGN KEY (rubric_id) REFERENCES public.admissions_rubric(rubric_id);


--
-- Name: feature_snapshots feature_snapshots_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_snapshots
    ADD CONSTRAINT feature_snapshots_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: readiness_snapshots fk_student_readiness; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.readiness_snapshots
    ADD CONSTRAINT fk_student_readiness FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: interactions interactions_framework_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactions
    ADD CONSTRAINT interactions_framework_fkey FOREIGN KEY (framework) REFERENCES public.framework_kinds(name);


--
-- Name: interactions_fts interactions_fts_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactions_fts
    ADD CONSTRAINT interactions_fts_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: interactions interactions_jtbd_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactions
    ADD CONSTRAINT interactions_jtbd_id_fkey FOREIGN KEY (jtbd_id) REFERENCES public.jtbd(jtbd_id) ON DELETE CASCADE;


--
-- Name: interactions interactions_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactions
    ADD CONSTRAINT interactions_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.sources(source_id) ON DELETE SET NULL;


--
-- Name: interactions interactions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactions
    ADD CONSTRAINT interactions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: interactions interactions_tactic_name_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactions
    ADD CONSTRAINT interactions_tactic_name_fkey FOREIGN KEY (tactic_name) REFERENCES public.tactic_kinds(name);


--
-- Name: ivyready_snapshot_factors ivyready_snapshot_factors_factor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ivyready_snapshot_factors
    ADD CONSTRAINT ivyready_snapshot_factors_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES public.admissions_rubric_factors(factor_id);


--
-- Name: ivyready_snapshot_factors ivyready_snapshot_factors_snapshot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ivyready_snapshot_factors
    ADD CONSTRAINT ivyready_snapshot_factors_snapshot_id_fkey FOREIGN KEY (snapshot_id) REFERENCES public.ivyready_snapshots(snapshot_id) ON DELETE CASCADE;


--
-- Name: ivyready_snapshot_features ivyready_snapshot_features_snapshot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ivyready_snapshot_features
    ADD CONSTRAINT ivyready_snapshot_features_snapshot_id_fkey FOREIGN KEY (snapshot_id) REFERENCES public.ivyready_snapshots(snapshot_id) ON DELETE CASCADE;


--
-- Name: ivyready_snapshots ivyready_snapshots_rubric_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ivyready_snapshots
    ADD CONSTRAINT ivyready_snapshots_rubric_id_fkey FOREIGN KEY (rubric_id) REFERENCES public.admissions_rubric(rubric_id);


--
-- Name: ivyready_snapshots ivyready_snapshots_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ivyready_snapshots
    ADD CONSTRAINT ivyready_snapshots_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.sources(source_id);


--
-- Name: ivyready_snapshots ivyready_snapshots_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ivyready_snapshots
    ADD CONSTRAINT ivyready_snapshots_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: jtbd jtbd_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jtbd
    ADD CONSTRAINT jtbd_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: jtbd_weekly jtbd_weekly_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jtbd_weekly
    ADD CONSTRAINT jtbd_weekly_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id);


--
-- Name: kb_chip_links kb_chip_links_chip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_chip_links
    ADD CONSTRAINT kb_chip_links_chip_id_fkey FOREIGN KEY (chip_id) REFERENCES public.kb_chips(chip_id) ON DELETE CASCADE;


--
-- Name: kb_chips kb_chips_doc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_chips
    ADD CONSTRAINT kb_chips_doc_id_fkey FOREIGN KEY (doc_id) REFERENCES public.kb_docs(doc_id) ON DELETE CASCADE;


--
-- Name: kb_embeddings kb_embeddings_chip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_embeddings
    ADD CONSTRAINT kb_embeddings_chip_id_fkey FOREIGN KEY (chip_id) REFERENCES public.kb_chips(chip_id) ON DELETE CASCADE;


--
-- Name: lifecycle_items lifecycle_items_jtbd_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lifecycle_items
    ADD CONSTRAINT lifecycle_items_jtbd_id_fkey FOREIGN KEY (jtbd_id) REFERENCES public.jtbd(jtbd_id) ON DELETE SET NULL;


--
-- Name: lifecycle_items lifecycle_items_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lifecycle_items
    ADD CONSTRAINT lifecycle_items_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: outcomes_backup_20250930_152339 outcomes_jtbd_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcomes_backup_20250930_152339
    ADD CONSTRAINT outcomes_jtbd_id_fkey FOREIGN KEY (jtbd_id) REFERENCES public.jtbd(jtbd_id) ON DELETE SET NULL;


--
-- Name: outcomes_backup_20250930_152520 outcomes_jtbd_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcomes_backup_20250930_152520
    ADD CONSTRAINT outcomes_jtbd_id_fkey1 FOREIGN KEY (jtbd_id) REFERENCES public.jtbd(jtbd_id) ON DELETE SET NULL;


--
-- Name: outcomes_backup_20250930_152622 outcomes_jtbd_id_fkey2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcomes_backup_20250930_152622
    ADD CONSTRAINT outcomes_jtbd_id_fkey2 FOREIGN KEY (jtbd_id) REFERENCES public.jtbd(jtbd_id) ON DELETE SET NULL;


--
-- Name: outcomes_backup_20250930_152919 outcomes_jtbd_id_fkey3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcomes_backup_20250930_152919
    ADD CONSTRAINT outcomes_jtbd_id_fkey3 FOREIGN KEY (jtbd_id) REFERENCES public.jtbd(jtbd_id) ON DELETE SET NULL;


--
-- Name: outcomes_backup_20250930_153115 outcomes_jtbd_id_fkey4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcomes_backup_20250930_153115
    ADD CONSTRAINT outcomes_jtbd_id_fkey4 FOREIGN KEY (jtbd_id) REFERENCES public.jtbd(jtbd_id) ON DELETE SET NULL;


--
-- Name: outcomes_backup_20250930_153331 outcomes_jtbd_id_fkey5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcomes_backup_20250930_153331
    ADD CONSTRAINT outcomes_jtbd_id_fkey5 FOREIGN KEY (jtbd_id) REFERENCES public.jtbd(jtbd_id) ON DELETE SET NULL;


--
-- Name: outcomes_backup_20250930_153430 outcomes_jtbd_id_fkey6; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcomes_backup_20250930_153430
    ADD CONSTRAINT outcomes_jtbd_id_fkey6 FOREIGN KEY (jtbd_id) REFERENCES public.jtbd(jtbd_id) ON DELETE SET NULL;


--
-- Name: outcomes outcomes_jtbd_id_fkey7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcomes
    ADD CONSTRAINT outcomes_jtbd_id_fkey7 FOREIGN KEY (jtbd_id) REFERENCES public.jtbd(jtbd_id) ON DELETE SET NULL;


--
-- Name: outcomes_backup_20250930_152339 outcomes_lifecycle_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcomes_backup_20250930_152339
    ADD CONSTRAINT outcomes_lifecycle_item_id_fkey FOREIGN KEY (lifecycle_item_id) REFERENCES public.lifecycle_items(item_id) ON DELETE SET NULL;


--
-- Name: outcomes_backup_20250930_152520 outcomes_lifecycle_item_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcomes_backup_20250930_152520
    ADD CONSTRAINT outcomes_lifecycle_item_id_fkey1 FOREIGN KEY (lifecycle_item_id) REFERENCES public.lifecycle_items(item_id) ON DELETE SET NULL;


--
-- Name: outcomes_backup_20250930_152622 outcomes_lifecycle_item_id_fkey2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcomes_backup_20250930_152622
    ADD CONSTRAINT outcomes_lifecycle_item_id_fkey2 FOREIGN KEY (lifecycle_item_id) REFERENCES public.lifecycle_items(item_id) ON DELETE SET NULL;


--
-- Name: outcomes_backup_20250930_152919 outcomes_lifecycle_item_id_fkey3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcomes_backup_20250930_152919
    ADD CONSTRAINT outcomes_lifecycle_item_id_fkey3 FOREIGN KEY (lifecycle_item_id) REFERENCES public.lifecycle_items(item_id) ON DELETE SET NULL;


--
-- Name: outcomes_backup_20250930_153115 outcomes_lifecycle_item_id_fkey4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcomes_backup_20250930_153115
    ADD CONSTRAINT outcomes_lifecycle_item_id_fkey4 FOREIGN KEY (lifecycle_item_id) REFERENCES public.lifecycle_items(item_id) ON DELETE SET NULL;


--
-- Name: outcomes_backup_20250930_153331 outcomes_lifecycle_item_id_fkey5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcomes_backup_20250930_153331
    ADD CONSTRAINT outcomes_lifecycle_item_id_fkey5 FOREIGN KEY (lifecycle_item_id) REFERENCES public.lifecycle_items(item_id) ON DELETE SET NULL;


--
-- Name: outcomes_backup_20250930_153430 outcomes_lifecycle_item_id_fkey6; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcomes_backup_20250930_153430
    ADD CONSTRAINT outcomes_lifecycle_item_id_fkey6 FOREIGN KEY (lifecycle_item_id) REFERENCES public.lifecycle_items(item_id) ON DELETE SET NULL;


--
-- Name: outcomes outcomes_lifecycle_item_id_fkey7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcomes
    ADD CONSTRAINT outcomes_lifecycle_item_id_fkey7 FOREIGN KEY (lifecycle_item_id) REFERENCES public.lifecycle_items(item_id) ON DELETE SET NULL;


--
-- Name: outcomes_backup_20250930_152339 outcomes_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcomes_backup_20250930_152339
    ADD CONSTRAINT outcomes_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.sources(source_id) ON DELETE SET NULL;


--
-- Name: outcomes_backup_20250930_152520 outcomes_source_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcomes_backup_20250930_152520
    ADD CONSTRAINT outcomes_source_id_fkey1 FOREIGN KEY (source_id) REFERENCES public.sources(source_id) ON DELETE SET NULL;


--
-- Name: outcomes_backup_20250930_152622 outcomes_source_id_fkey2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcomes_backup_20250930_152622
    ADD CONSTRAINT outcomes_source_id_fkey2 FOREIGN KEY (source_id) REFERENCES public.sources(source_id) ON DELETE SET NULL;


--
-- Name: outcomes_backup_20250930_152919 outcomes_source_id_fkey3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcomes_backup_20250930_152919
    ADD CONSTRAINT outcomes_source_id_fkey3 FOREIGN KEY (source_id) REFERENCES public.sources(source_id) ON DELETE SET NULL;


--
-- Name: outcomes_backup_20250930_153115 outcomes_source_id_fkey4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcomes_backup_20250930_153115
    ADD CONSTRAINT outcomes_source_id_fkey4 FOREIGN KEY (source_id) REFERENCES public.sources(source_id) ON DELETE SET NULL;


--
-- Name: outcomes_backup_20250930_153331 outcomes_source_id_fkey5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcomes_backup_20250930_153331
    ADD CONSTRAINT outcomes_source_id_fkey5 FOREIGN KEY (source_id) REFERENCES public.sources(source_id) ON DELETE SET NULL;


--
-- Name: outcomes_backup_20250930_153430 outcomes_source_id_fkey6; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcomes_backup_20250930_153430
    ADD CONSTRAINT outcomes_source_id_fkey6 FOREIGN KEY (source_id) REFERENCES public.sources(source_id) ON DELETE SET NULL;


--
-- Name: outcomes outcomes_source_id_fkey7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcomes
    ADD CONSTRAINT outcomes_source_id_fkey7 FOREIGN KEY (source_id) REFERENCES public.sources(source_id) ON DELETE SET NULL;


--
-- Name: outcomes_backup_20250930_152339 outcomes_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcomes_backup_20250930_152339
    ADD CONSTRAINT outcomes_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: outcomes_backup_20250930_152520 outcomes_student_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcomes_backup_20250930_152520
    ADD CONSTRAINT outcomes_student_id_fkey1 FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: outcomes_backup_20250930_152622 outcomes_student_id_fkey2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcomes_backup_20250930_152622
    ADD CONSTRAINT outcomes_student_id_fkey2 FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: outcomes_backup_20250930_152919 outcomes_student_id_fkey3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcomes_backup_20250930_152919
    ADD CONSTRAINT outcomes_student_id_fkey3 FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: outcomes_backup_20250930_153115 outcomes_student_id_fkey4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcomes_backup_20250930_153115
    ADD CONSTRAINT outcomes_student_id_fkey4 FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: outcomes_backup_20250930_153331 outcomes_student_id_fkey5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcomes_backup_20250930_153331
    ADD CONSTRAINT outcomes_student_id_fkey5 FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: outcomes_backup_20250930_153430 outcomes_student_id_fkey6; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcomes_backup_20250930_153430
    ADD CONSTRAINT outcomes_student_id_fkey6 FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: outcomes outcomes_student_id_fkey7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outcomes
    ADD CONSTRAINT outcomes_student_id_fkey7 FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: proof_audit_log proof_audit_log_artifact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proof_audit_log
    ADD CONSTRAINT proof_audit_log_artifact_id_fkey FOREIGN KEY (artifact_id) REFERENCES public.proof_registry(artifact_id) ON DELETE CASCADE;


--
-- Name: proof_registry proof_registry_chip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proof_registry
    ADD CONSTRAINT proof_registry_chip_id_fkey FOREIGN KEY (chip_id) REFERENCES public.kb_items(item_id) ON DELETE CASCADE;


--
-- Name: query_trace_events query_trace_events_trace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.query_trace_events
    ADD CONSTRAINT query_trace_events_trace_id_fkey FOREIGN KEY (trace_id) REFERENCES public.query_traces(id) ON DELETE CASCADE;


--
-- Name: scholarships scholarships_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scholarships
    ADD CONSTRAINT scholarships_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: sessions sessions_coach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.coaches(coach_id) ON DELETE CASCADE;


--
-- Name: sessions sessions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: sources sources_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sources
    ADD CONSTRAINT sources_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: strategic_insights strategic_insights_coach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strategic_insights
    ADD CONSTRAINT strategic_insights_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.coaches(coach_id) ON DELETE SET NULL;


--
-- Name: strategic_insights strategic_insights_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strategic_insights
    ADD CONSTRAINT strategic_insights_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: student_coach_assignments student_coach_assignments_coach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_coach_assignments
    ADD CONSTRAINT student_coach_assignments_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.coaches(coach_id) ON DELETE CASCADE;


--
-- Name: student_coach_assignments student_coach_assignments_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_coach_assignments
    ADD CONSTRAINT student_coach_assignments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: tone_cue_training tone_cue_training_chip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tone_cue_training
    ADD CONSTRAINT tone_cue_training_chip_id_fkey FOREIGN KEY (chip_id) REFERENCES public.kb_items(item_id) ON DELETE CASCADE;


--
-- Name: unified_context unified_context_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unified_context
    ADD CONSTRAINT unified_context_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(session_id) ON DELETE SET NULL;


--
-- Name: unified_context unified_context_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unified_context
    ADD CONSTRAINT unified_context_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: vital_facts vital_facts_kind_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vital_facts
    ADD CONSTRAINT vital_facts_kind_fkey FOREIGN KEY (kind) REFERENCES public.fact_kinds(kind);


--
-- Name: vital_facts vital_facts_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vital_facts
    ADD CONSTRAINT vital_facts_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.sources(source_id) ON DELETE RESTRICT;


--
-- Name: vital_facts vital_facts_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vital_facts
    ADD CONSTRAINT vital_facts_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: SCHEMA compat; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA compat TO PUBLIC;


--
-- Name: TABLE v_academics_latest; Type: ACL; Schema: compat; Owner: -
--

GRANT SELECT ON TABLE compat.v_academics_latest TO PUBLIC;


--
-- Name: TABLE v_academics_series; Type: ACL; Schema: compat; Owner: -
--

GRANT SELECT ON TABLE compat.v_academics_series TO PUBLIC;


--
-- Name: TABLE v_awards_final; Type: ACL; Schema: compat; Owner: -
--

GRANT SELECT ON TABLE compat.v_awards_final TO PUBLIC;


--
-- Name: TABLE v_kb_items; Type: ACL; Schema: compat; Owner: -
--

GRANT SELECT ON TABLE compat.v_kb_items TO PUBLIC;


--
-- Name: TABLE v_outcomes; Type: ACL; Schema: compat; Owner: -
--

GRANT SELECT ON TABLE compat.v_outcomes TO PUBLIC;


--
-- Name: TABLE v_sat_timeline; Type: ACL; Schema: compat; Owner: -
--

GRANT SELECT ON TABLE compat.v_sat_timeline TO PUBLIC;


--
-- Name: TABLE readiness_feature_weights; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.readiness_feature_weights TO PUBLIC;


--
-- Name: TABLE readiness_snapshots; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.readiness_snapshots TO PUBLIC;


--
-- Name: TABLE v_features_all; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.v_features_all TO PUBLIC;


--
-- Name: TABLE v_feature_gaps_current; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.v_feature_gaps_current TO PUBLIC;


--
-- Name: et_ddl_block; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER et_ddl_block ON ddl_command_start
         WHEN TAG IN ('CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'CREATE VIEW', 'ALTER VIEW', 'DROP VIEW', 'CREATE INDEX', 'ALTER INDEX', 'DROP INDEX', 'CREATE SCHEMA', 'DROP SCHEMA', 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW', 'DROP MATERIALIZED VIEW')
   EXECUTE FUNCTION compat.block_ddl();


--
-- Name: EVENT TRIGGER et_ddl_block; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EVENT TRIGGER et_ddl_block IS 'Enforces migration-only DDL to prevent schema drift';


--
-- PostgreSQL database dump complete
--

\unrestrict MD8B62r28eqsxccGwqKYyTEhI0s2hapBYkVzVnmR98GJOtTKD80DemImpxlxEbQ


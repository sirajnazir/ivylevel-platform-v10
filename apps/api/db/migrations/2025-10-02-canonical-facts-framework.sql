-- Canonical Facts Framework (CFF) - Jenny v3
-- Purpose: Prevent invalid facts (like SAT=3) through systematic validation
-- Non-destructive: Adds overlay without modifying existing data

-- 1) Create fact datatype enum
DO $$ BEGIN
  CREATE TYPE fact_datatype AS ENUM ('int','float','date','boolean','enum','string');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Registry of fact kinds with validation rules
CREATE TABLE IF NOT EXISTS fact_kind_rules (
  kind                    text PRIMARY KEY,
  datatype                fact_datatype NOT NULL,
  -- Numeric constraints
  min_numeric             double precision,
  max_numeric             double precision,
  -- Enum constraints
  enum_values             text[],
  -- Pattern for strings
  regex                   text,
  -- Preferred unit or canonicalization notes
  unit                    text,
  -- Selection policy
  prefer_confidence       boolean DEFAULT true,
  freshness_half_life_d   integer DEFAULT 365,
  -- Source priority (optional) e.g. ["official_portal","coach_log"]
  source_priority         jsonb,
  created_at              timestamp DEFAULT CURRENT_TIMESTAMP,
  updated_at              timestamp DEFAULT CURRENT_TIMESTAMP
);

-- 3) Seed common fact kinds with proper validation rules
INSERT INTO fact_kind_rules(kind, datatype, min_numeric, max_numeric, enum_values, regex, unit, freshness_half_life_d)
VALUES
  -- Test scores
  ('sat_total_score', 'int', 200, 1600, NULL, NULL, NULL, 730),
  ('sat_math_score', 'int', 200, 800, NULL, NULL, NULL, 730),
  ('sat_ebrw_score', 'int', 200, 800, NULL, NULL, NULL, 730),
  ('act_composite', 'int', 1, 36, NULL, NULL, NULL, 730),
  ('act_english', 'int', 1, 36, NULL, NULL, NULL, 730),
  ('act_math', 'int', 1, 36, NULL, NULL, NULL, 730),
  ('act_reading', 'int', 1, 36, NULL, NULL, NULL, 730),
  ('act_science', 'int', 1, 36, NULL, NULL, NULL, 730),
  ('ap_score', 'int', 1, 5, NULL, NULL, NULL, 365),
  ('psat_total_score', 'int', 320, 1520, NULL, NULL, NULL, 730),
  
  -- GPA
  ('gpa_unweighted', 'float', 0.0, 4.0, NULL, NULL, NULL, 90),
  ('gpa_weighted', 'float', 0.0, 6.0, NULL, NULL, NULL, 90),
  ('gpa_scale', 'float', 4.0, 100.0, NULL, NULL, NULL, 365),
  
  -- Application status
  ('uc_app_submitted', 'boolean', NULL, NULL, NULL, NULL, NULL, 365),
  ('common_app_submitted', 'boolean', NULL, NULL, NULL, NULL, NULL, 365),
  ('css_profile_submitted', 'boolean', NULL, NULL, NULL, NULL, NULL, 365),
  ('fafsa_submitted', 'boolean', NULL, NULL, NULL, NULL, NULL, 365),
  
  -- Counts
  ('coach_session_count', 'int', 0, 1000, NULL, NULL, NULL, 30),
  ('portfolio_demo_count', 'int', 0, 100, NULL, NULL, NULL, 90),
  ('award_won', 'int', 0, 100, NULL, NULL, NULL, 180),
  
  -- Dates
  ('uc_deadline', 'date', NULL, NULL, NULL, NULL, NULL, 365),
  ('ed_deadline', 'date', NULL, NULL, NULL, NULL, NULL, 365),
  ('rd_deadline', 'date', NULL, NULL, NULL, NULL, NULL, 365),
  
  -- Enums
  ('application_status', 'enum', NULL, NULL, 
   ARRAY['not_started', 'in_progress', 'submitted', 'accepted', 'rejected', 'waitlisted'], 
   NULL, NULL, 30),
  ('student_year', 'enum', NULL, NULL, 
   ARRAY['freshman', 'sophomore', 'junior', 'senior', 'gap_year'], 
   NULL, NULL, 365)
ON CONFLICT (kind) DO UPDATE SET
  datatype = EXCLUDED.datatype,
  min_numeric = EXCLUDED.min_numeric,
  max_numeric = EXCLUDED.max_numeric,
  enum_values = EXCLUDED.enum_values,
  updated_at = CURRENT_TIMESTAMP;

-- 4) Normalization & validation view
CREATE OR REPLACE VIEW facts_normalized AS
SELECT
  f.*,
  r.datatype,
  -- Normalize value based on datatype
  CASE r.datatype
    WHEN 'int' THEN 
      CASE 
        WHEN f.value ~ '^\d+$' THEN f.value::bigint
        WHEN f.value ~ '^\d+\.\d+$' THEN round(f.value::numeric)::bigint  -- Round floats to int
        ELSE NULL 
      END
    WHEN 'float' THEN 
      CASE 
        WHEN f.value ~ '^\d+(\.\d+)?$' THEN f.value::double precision
        ELSE NULL 
      END
    WHEN 'boolean' THEN 
      CASE 
        WHEN lower(f.value) IN ('true','false','1','0','yes','no','t','f','y','n') THEN
          (lower(f.value) IN ('true','1','yes','t','y'))::boolean
        ELSE NULL 
      END
    WHEN 'date' THEN 
      CASE 
        WHEN f.value ~ '^\d{4}-\d{2}-\d{2}' THEN f.value::date::timestamp
        ELSE NULL 
      END
    WHEN 'enum' THEN f.value
    ELSE f.value
  END AS normalized_value,
  
  -- Validate based on datatype and constraints
  CASE
    WHEN r.kind IS NULL THEN false  -- Unknown fact kind
    WHEN r.datatype IN ('int','float') THEN
      CASE
        WHEN f.value ~ '^\d+(\.\d+)?$' THEN
          (r.min_numeric IS NULL OR 
           CASE r.datatype 
             WHEN 'int' THEN f.value::numeric >= r.min_numeric
             WHEN 'float' THEN f.value::numeric >= r.min_numeric
           END)
          AND 
          (r.max_numeric IS NULL OR 
           CASE r.datatype
             WHEN 'int' THEN f.value::numeric <= r.max_numeric
             WHEN 'float' THEN f.value::numeric <= r.max_numeric
           END)
        ELSE false
      END
    WHEN r.datatype = 'boolean' THEN 
      lower(f.value) IN ('true','false','1','0','yes','no','t','f','y','n')
    WHEN r.datatype = 'date' THEN 
      f.value ~ '^\d{4}-\d{2}-\d{2}'
    WHEN r.datatype = 'enum' THEN 
      (r.enum_values IS NULL OR f.value = ANY(r.enum_values))
    WHEN r.datatype = 'string' THEN 
      (r.regex IS NULL OR f.value ~ r.regex)
    ELSE false
  END AS is_valid,
  
  -- Explain why invalid
  CASE
    WHEN r.kind IS NULL THEN 'Unknown fact kind'
    WHEN r.datatype IN ('int','float') AND NOT (f.value ~ '^\d+(\.\d+)?$') THEN 'Not a number'
    WHEN r.datatype IN ('int','float') AND f.value ~ '^\d+(\.\d+)?$' THEN
      CASE
        WHEN r.min_numeric IS NOT NULL AND f.value::numeric < r.min_numeric THEN 
          'Below minimum: ' || r.min_numeric
        WHEN r.max_numeric IS NOT NULL AND f.value::numeric > r.max_numeric THEN 
          'Above maximum: ' || r.max_numeric
        ELSE NULL
      END
    WHEN r.datatype = 'boolean' AND lower(f.value) NOT IN ('true','false','1','0','yes','no','t','f','y','n') THEN
      'Not a boolean value'
    WHEN r.datatype = 'date' AND NOT (f.value ~ '^\d{4}-\d{2}-\d{2}') THEN
      'Not a valid date format'
    WHEN r.datatype = 'enum' AND r.enum_values IS NOT NULL AND NOT (f.value = ANY(r.enum_values)) THEN
      'Not in allowed values: ' || array_to_string(r.enum_values, ', ')
    ELSE NULL
  END AS validation_error
  
FROM vital_facts f
LEFT JOIN fact_kind_rules r USING(kind);

-- 5) Create materialized view for performance (optional but recommended)
CREATE MATERIALIZED VIEW IF NOT EXISTS facts_normalized_mv AS 
SELECT * FROM facts_normalized;

CREATE INDEX IF NOT EXISTS idx_facts_norm_mv_lookup
  ON facts_normalized_mv(student_id, kind, is_valid, fact_date DESC);

CREATE INDEX IF NOT EXISTS idx_facts_norm_mv_invalid
  ON facts_normalized_mv(kind, is_valid) WHERE is_valid = false;

-- 6) Helper functions for scoring
CREATE OR REPLACE FUNCTION confidence_weight(c text)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE lower($1)
    WHEN 'high' THEN 3
    WHEN 'medium' THEN 2
    WHEN 'low' THEN 1
    ELSE 0 
  END;
$$;

CREATE OR REPLACE FUNCTION freshness_score(d timestamptz, half_life_days integer)
RETURNS double precision LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN $1 IS NULL OR $2 IS NULL OR $2 <= 0 THEN 1.0
    ELSE exp(-greatest(extract(epoch from (now() - $1))/86400.0, 0) / $2 * 0.693147)  -- ln(2) = 0.693147
  END;
$$;

-- 7) Deterministic fact selector
CREATE OR REPLACE FUNCTION select_current_fact(p_student_id text, p_kind text)
RETURNS TABLE (
  student_id text, 
  kind text, 
  normalized_value text,
  original_value text,
  fact_date timestamptz, 
  confidence text, 
  source_id text,
  selection_reason jsonb
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH rules AS (
    SELECT * FROM fact_kind_rules WHERE kind = p_kind
  ), 
  candidates AS (
    SELECT
      fn.student_id, 
      fn.kind,
      fn.normalized_value::text AS normalized_value,
      fn.value AS original_value,
      fn.fact_date, 
      fn.confidence, 
      fn.source_id,
      confidence_weight(fn.confidence) AS conf_weight,
      freshness_score(fn.fact_date, rules.freshness_half_life_d) AS fresh_weight,
      -- Source priority (higher index = higher priority)
      COALESCE((
        SELECT 100 - idx
        FROM jsonb_array_elements_text(rules.source_priority) WITH ORDINALITY sp(val, idx)
        WHERE sp.val = fn.source_id
        LIMIT 1
      ), 0) AS source_weight,
      fn.is_valid,
      fn.validation_error
    FROM facts_normalized fn
    JOIN rules ON rules.kind = fn.kind
    WHERE fn.student_id = p_student_id
      AND fn.kind = p_kind
      AND fn.is_valid = true
  ),
  scored AS (
    SELECT *,
      (conf_weight * fresh_weight + source_weight * 0.1) AS total_score
    FROM candidates
  )
  SELECT 
    student_id, 
    kind, 
    normalized_value, 
    original_value,
    fact_date, 
    confidence, 
    source_id,
    jsonb_build_object(
      'confidence_weight', conf_weight,
      'freshness_weight', round(fresh_weight::numeric, 3),
      'source_weight', source_weight,
      'total_score', round(total_score::numeric, 3),
      'selection_criteria', 'is_valid=true, highest_score'
    ) AS selection_reason
  FROM scored
  ORDER BY total_score DESC, fact_date DESC
  LIMIT 1;
END $$;

-- 8) Batch fact resolution for efficiency
CREATE OR REPLACE FUNCTION select_current_facts(p_student_id text, p_kinds text[])
RETURNS TABLE (
  student_id text, 
  kind text, 
  normalized_value text,
  original_value text,
  fact_date timestamptz, 
  confidence text, 
  source_id text,
  selection_reason jsonb
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM (
    SELECT DISTINCT ON (scf.kind) scf.*
    FROM unnest(p_kinds) AS k(kind),
    LATERAL select_current_fact(p_student_id, k.kind) AS scf
    ORDER BY scf.kind
  ) sub;
END $$;

-- 9) Monitoring queries
CREATE OR REPLACE VIEW fact_quality_report AS
SELECT 
  kind,
  COUNT(*) FILTER (WHERE is_valid = true) AS valid_count,
  COUNT(*) FILTER (WHERE is_valid = false) AS invalid_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE is_valid = true) / NULLIF(COUNT(*), 0), 2) AS validity_pct,
  array_agg(DISTINCT validation_error) FILTER (WHERE validation_error IS NOT NULL) AS error_types
FROM facts_normalized
GROUP BY kind
ORDER BY invalid_count DESC, kind;

-- 10) Example invalid facts for debugging
CREATE OR REPLACE VIEW fact_invalid_examples AS
SELECT 
  kind,
  student_id,
  value AS invalid_value,
  validation_error,
  source_id,
  fact_date
FROM facts_normalized
WHERE is_valid = false
ORDER BY fact_date DESC
LIMIT 100;

-- Initial validation check
SELECT 
  'Total facts' AS metric, COUNT(*)::text AS value 
FROM vital_facts
UNION ALL
SELECT 
  'Invalid facts', COUNT(*)::text 
FROM facts_normalized 
WHERE is_valid = false
UNION ALL
SELECT 
  'SAT scores < 200 or > 1600', COUNT(*)::text 
FROM vital_facts 
WHERE kind = 'sat_total_score' 
  AND (value::numeric < 200 OR value::numeric > 1600 OR value !~ '^\d+$');
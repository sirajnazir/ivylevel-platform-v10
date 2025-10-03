-- Fix the column ambiguity issue in select_current_fact function

-- Drop both functions
DROP FUNCTION IF EXISTS select_current_facts(text, text[]);
DROP FUNCTION IF EXISTS select_current_fact(text, text);

-- Recreate select_current_fact with proper aliases to avoid ambiguity
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

-- Recreate batch fact resolution
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
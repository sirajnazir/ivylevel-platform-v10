-- Fix the confidence column type mismatch by recreating the functions with correct types

-- First drop the dependent function
DROP FUNCTION IF EXISTS select_current_facts(text, text[]);

-- Recreate select_current_fact with confidence as text (not fact_confidence)
CREATE OR REPLACE FUNCTION select_current_fact(p_student_id text, p_kind text)
RETURNS TABLE (
  student_id text, 
  kind text, 
  normalized_value text,
  original_value text,
  fact_date timestamptz, 
  confidence text,  -- Changed from fact_confidence to text
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
      fn.confidence::text AS confidence,  -- Cast to text
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
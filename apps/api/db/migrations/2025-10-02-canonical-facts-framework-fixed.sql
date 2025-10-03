-- Fix for facts_normalized view with proper type casting

-- Drop existing view if exists
DROP VIEW IF EXISTS facts_normalized CASCADE;

-- Create normalized view with fixed type handling
CREATE OR REPLACE VIEW facts_normalized AS
SELECT
  f.*,
  r.datatype,
  -- Normalize value based on datatype (always return as variant type)
  CASE 
    WHEN r.datatype = 'int' THEN 
      CASE 
        WHEN f.value ~ '^\d+$' THEN f.value::bigint::text
        WHEN f.value ~ '^\d+\.\d+$' THEN round(f.value::numeric)::bigint::text
        ELSE NULL 
      END
    WHEN r.datatype = 'float' THEN 
      CASE 
        WHEN f.value ~ '^\d+(\.\d+)?$' THEN f.value::double precision::text
        ELSE NULL 
      END
    WHEN r.datatype = 'boolean' THEN 
      CASE 
        WHEN lower(f.value) IN ('true','false','1','0','yes','no','t','f','y','n') THEN
          (lower(f.value) IN ('true','1','yes','t','y'))::boolean::text
        ELSE NULL 
      END
    WHEN r.datatype = 'date' THEN 
      CASE 
        WHEN f.value ~ '^\d{4}-\d{2}-\d{2}' THEN f.value::date::text
        ELSE NULL 
      END
    WHEN r.datatype = 'enum' THEN f.value
    ELSE f.value
  END AS normalized_value,
  
  -- Validate based on datatype and constraints
  CASE
    WHEN r.kind IS NULL THEN false
    WHEN r.datatype IN ('int','float') THEN
      CASE
        WHEN f.value ~ '^\d+(\.\d+)?$' THEN
          (r.min_numeric IS NULL OR f.value::numeric >= r.min_numeric)
          AND 
          (r.max_numeric IS NULL OR f.value::numeric <= r.max_numeric)
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
    WHEN r.kind IS NULL THEN 'Unknown fact kind: ' || f.kind
    WHEN r.datatype IN ('int','float') AND NOT (f.value ~ '^\d+(\.\d+)?$') THEN 
      'Not a number: ' || f.value
    WHEN r.datatype IN ('int','float') AND f.value ~ '^\d+(\.\d+)?$' THEN
      CASE
        WHEN r.min_numeric IS NOT NULL AND f.value::numeric < r.min_numeric THEN 
          'Below minimum ' || r.min_numeric || ': ' || f.value
        WHEN r.max_numeric IS NOT NULL AND f.value::numeric > r.max_numeric THEN 
          'Above maximum ' || r.max_numeric || ': ' || f.value
        ELSE NULL
      END
    WHEN r.datatype = 'boolean' AND lower(f.value) NOT IN ('true','false','1','0','yes','no','t','f','y','n') THEN
      'Not a boolean: ' || f.value
    WHEN r.datatype = 'date' AND NOT (f.value ~ '^\d{4}-\d{2}-\d{2}') THEN
      'Not a valid date: ' || f.value
    WHEN r.datatype = 'enum' AND r.enum_values IS NOT NULL AND NOT (f.value = ANY(r.enum_values)) THEN
      'Not in allowed values (' || array_to_string(r.enum_values, ', ') || '): ' || f.value
    ELSE NULL
  END AS validation_error
  
FROM vital_facts f
LEFT JOIN fact_kind_rules r ON f.kind = r.kind;

-- Create materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS facts_normalized_mv AS 
SELECT * FROM facts_normalized;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_facts_norm_mv_lookup
  ON facts_normalized_mv(student_id, kind, is_valid, fact_date DESC);

CREATE INDEX IF NOT EXISTS idx_facts_norm_mv_invalid
  ON facts_normalized_mv(kind, is_valid) WHERE is_valid = false;

-- Quality report view
CREATE OR REPLACE VIEW fact_quality_report AS
SELECT 
  kind,
  COUNT(*) FILTER (WHERE is_valid = true) AS valid_count,
  COUNT(*) FILTER (WHERE is_valid = false) AS invalid_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE is_valid = true) / NULLIF(COUNT(*), 0), 2) AS validity_pct,
  array_agg(DISTINCT validation_error ORDER BY validation_error) FILTER (WHERE validation_error IS NOT NULL) AS error_types
FROM facts_normalized
GROUP BY kind
ORDER BY invalid_count DESC, kind;

-- Invalid examples view
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

-- Refresh materialized view
REFRESH MATERIALIZED VIEW facts_normalized_mv;

-- Check results
SELECT * FROM fact_quality_report WHERE kind IN ('sat_total_score', 'act_composite', 'gpa_unweighted') ORDER BY kind;
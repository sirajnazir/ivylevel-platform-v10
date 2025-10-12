-- ============================================
-- Migration: Compatibility Views for Legacy Schema Bridge
-- Date: 2025-10-09
-- Purpose: Create compat.* views to bridge vital_facts (legacy) → v3.0 canonical schema
--
-- This allows v10.1 resolvers to work with existing data without ETL migration
-- ============================================

-- Enable migration mode (bypasses DDL lock if installed)
SELECT set_config('app.migration', 'true', false);

-- ============================================
-- 1. Create compat schema
-- ============================================
CREATE SCHEMA IF NOT EXISTS compat;

COMMENT ON SCHEMA compat IS 'Compatibility layer bridging legacy vital_facts to v3.0 canonical schema';

-- ============================================
-- 2. Helper Functions
-- ============================================

-- Safe numeric conversion
CREATE OR REPLACE FUNCTION compat.try_num(text)
RETURNS NUMERIC
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  n NUMERIC;
BEGIN
  n := NULLIF($1,'')::NUMERIC;
  RETURN n;
EXCEPTION
  WHEN others THEN RETURN NULL;
END $$;

COMMENT ON FUNCTION compat.try_num IS 'Safely convert text to numeric, returning NULL on failure';

-- Safe date conversion
CREATE OR REPLACE FUNCTION compat.try_date(text)
RETURNS DATE
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  d DATE;
BEGIN
  d := NULLIF($1,'')::DATE;
  RETURN d;
EXCEPTION
  WHEN others THEN RETURN NULL;
END $$;

COMMENT ON FUNCTION compat.try_date IS 'Safely convert text to date, returning NULL on failure';

-- ============================================
-- 3. Outcomes Compatibility View
-- ============================================

DROP VIEW IF EXISTS compat.v_outcomes CASCADE;

CREATE VIEW compat.v_outcomes AS
SELECT
  vf.student_id,
  'award_won'::text AS outcome_type,
  vf.value AS title,
  NULL::text AS tier,
  vf.fact_date AS occurred_at,
  jsonb_build_object(
    'confidence', vf.confidence::text,
    'modality', vf.modality,
    'unit', vf.unit
  ) AS meta,
  vf.source_id,
  vf.created_ts
FROM vital_facts vf
WHERE vf.kind = 'award_won';

COMMENT ON VIEW compat.v_outcomes IS 'Awards won from vital_facts, compatible with v3.0 outcomes table schema';

-- ============================================
-- 4. Academics Compatibility Views
-- ============================================

-- A) Latest academics snapshot (for "What's my GPA/SAT?" queries)
DROP VIEW IF EXISTS compat.v_academics_latest CASCADE;

CREATE VIEW compat.v_academics_latest AS
SELECT
  student_id,
  MAX(CASE WHEN kind = 'sat_total_score' THEN numeric_value END) AS sat_total,
  MAX(CASE WHEN kind = 'sat_math' THEN numeric_value END) AS sat_math,
  MAX(CASE WHEN kind = 'sat_ebrw' THEN numeric_value END) AS sat_ebrw,
  MAX(CASE WHEN kind = 'act_composite' AND numeric_value IS NOT NULL THEN numeric_value END) AS act_composite,
  MAX(CASE WHEN kind = 'gpa_weighted' THEN compat.try_num(value) END) AS gpa_weighted,
  MAX(CASE WHEN kind = 'gpa_unweighted' THEN compat.try_num(value) END) AS gpa_unweighted,
  COUNT(DISTINCT CASE WHEN kind = 'ap_score' AND compat.try_num(value) BETWEEN 1 AND 5 THEN fact_id END) AS ap_count,
  now() AS computed_at
FROM vital_facts
GROUP BY student_id;

COMMENT ON VIEW compat.v_academics_latest IS 'Latest academic vitals (SAT, ACT, GPA, AP count) from vital_facts';

-- B) Time-series academics (for "What's my SAT progression?" queries)
DROP VIEW IF EXISTS compat.v_academics_series CASCADE;

CREATE VIEW compat.v_academics_series AS
SELECT
  vf.student_id,
  vf.fact_date AS as_of,
  CASE
    WHEN vf.kind = 'sat_total_score' THEN 'sat_total'
    WHEN vf.kind = 'sat_math' THEN 'sat_math'
    WHEN vf.kind = 'sat_ebrw' THEN 'sat_ebrw'
    WHEN vf.kind = 'act_composite' THEN 'act_composite'
    WHEN vf.kind = 'gpa_weighted' THEN 'gpa_weighted'
    WHEN vf.kind = 'gpa_unweighted' THEN 'gpa_unweighted'
    WHEN vf.kind = 'ap_score' THEN 'ap_score'
    ELSE NULL
  END AS metric,
  COALESCE(vf.numeric_value, compat.try_num(vf.value)) AS value_num,
  vf.value AS value_text,
  jsonb_build_object(
    'confidence', vf.confidence::text,
    'modality', vf.modality,
    'unit', vf.unit
  ) AS meta,
  vf.source_id,
  vf.created_ts
FROM vital_facts vf
WHERE vf.kind IN ('sat_total_score', 'sat_math', 'sat_ebrw', 'act_composite',
                  'gpa_weighted', 'gpa_unweighted', 'ap_score')
  AND (vf.numeric_value IS NOT NULL OR compat.try_num(vf.value) IS NOT NULL);

COMMENT ON VIEW compat.v_academics_series IS 'Time-series academic data (SAT/ACT/GPA progression) from vital_facts';

-- C) SAT temporal resolution (for UTFA "first/second/latest" queries)
DROP VIEW IF EXISTS compat.v_sat_timeline CASCADE;

CREATE VIEW compat.v_sat_timeline AS
SELECT
  vf.student_id,
  vf.numeric_value AS total_score,
  vf.fact_date,
  vf.source_id,
  vf.confidence,
  ROW_NUMBER() OVER (PARTITION BY vf.student_id ORDER BY vf.fact_date ASC) AS attempt_number,
  vf.created_ts
FROM vital_facts vf
WHERE vf.kind = 'sat_total_score'
  AND vf.numeric_value IS NOT NULL
ORDER BY vf.student_id, vf.fact_date;

COMMENT ON VIEW compat.v_sat_timeline IS 'SAT scores with temporal ordering (attempt 1, 2, 3...) from vital_facts';

-- ============================================
-- 5. KB Items Compatibility View
-- ============================================

DROP VIEW IF EXISTS compat.v_kb_items CASCADE;

CREATE VIEW compat.v_kb_items AS
SELECT
  vf.student_id,
  CASE
    WHEN vf.kind LIKE 'ec:%' THEN 'ec'
    WHEN vf.kind LIKE 'program:%' THEN 'program'
    WHEN vf.kind LIKE 'award:%' THEN 'award'
    ELSE 'fact'
  END AS item_type,
  split_part(vf.kind, ':', 2) AS item_key,
  vf.value AS item_value,
  vf.fact_date AS as_of,
  jsonb_build_object(
    'confidence', vf.confidence::text,
    'modality', vf.modality,
    'kind', vf.kind
  ) AS meta,
  vf.source_id,
  vf.created_ts
FROM vital_facts vf
WHERE vf.kind LIKE 'ec:%'
   OR vf.kind LIKE 'program:%'
   OR vf.kind LIKE 'award:%';

COMMENT ON VIEW compat.v_kb_items IS 'ECs, programs, awards from vital_facts, compatible with v3.0 kb_items schema';

-- ============================================
-- 6. Awards Temporal Views (initial/final/progression)
-- ============================================

DROP VIEW IF EXISTS compat.v_awards_final CASCADE;

CREATE VIEW compat.v_awards_final AS
SELECT DISTINCT ON (vf.student_id, vf.value)
  vf.student_id,
  vf.value AS award_name,
  vf.fact_date AS won_date,
  vf.source_id,
  vf.confidence,
  vf.created_ts
FROM vital_facts vf
WHERE vf.kind = 'award_won'
ORDER BY vf.student_id, vf.value, vf.fact_date DESC;

COMMENT ON VIEW compat.v_awards_final IS 'Final/won awards from vital_facts';

-- ============================================
-- 7. Grant permissions
-- ============================================

GRANT USAGE ON SCHEMA compat TO PUBLIC;
GRANT SELECT ON ALL TABLES IN SCHEMA compat TO PUBLIC;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA compat TO PUBLIC;

-- ============================================
-- 8. Schema Lock (DDL Blocking Outside Migrations)
-- ============================================

-- Create DDL blocking function
CREATE OR REPLACE FUNCTION compat.block_ddl()
RETURNS event_trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('app.migration', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'DDL blocked: run DDL only via migrations (SET app.migration=true)';
  END IF;
END $$;

COMMENT ON FUNCTION compat.block_ddl IS 'Blocks DDL commands unless app.migration session variable is set to true';

-- Install DDL blocking trigger
DROP EVENT TRIGGER IF EXISTS et_ddl_block;

CREATE EVENT TRIGGER et_ddl_block ON ddl_command_start
WHEN TAG IN (
  'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE',
  'CREATE VIEW', 'ALTER VIEW', 'DROP VIEW',
  'CREATE INDEX', 'ALTER INDEX', 'DROP INDEX',
  'CREATE SCHEMA', 'DROP SCHEMA',
  'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW', 'DROP MATERIALIZED VIEW'
)
EXECUTE PROCEDURE compat.block_ddl();

COMMENT ON EVENT TRIGGER et_ddl_block IS 'Enforces migration-only DDL to prevent schema drift';

-- ============================================
-- Migration Complete
-- ============================================

-- Disable migration mode
SELECT set_config('app.migration', 'false', false);

-- Verification queries (optional - comment out for production)
-- SELECT 'v_outcomes' AS view_name, count(*) AS row_count FROM compat.v_outcomes WHERE student_id='huda-2025'
-- UNION ALL
-- SELECT 'v_academics_latest', count(*) FROM compat.v_academics_latest WHERE student_id='huda-2025'
-- UNION ALL
-- SELECT 'v_academics_series', count(*) FROM compat.v_academics_series WHERE student_id='huda-2025'
-- UNION ALL
-- SELECT 'v_sat_timeline', count(*) FROM compat.v_sat_timeline WHERE student_id='huda-2025'
-- UNION ALL
-- SELECT 'v_kb_items', count(*) FROM compat.v_kb_items WHERE student_id='huda-2025'
-- UNION ALL
-- SELECT 'v_awards_final', count(*) FROM compat.v_awards_final WHERE student_id='huda-2025';

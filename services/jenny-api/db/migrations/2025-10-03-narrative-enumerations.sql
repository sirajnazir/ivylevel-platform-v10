-- === Narrative Enumerations Migration ===
-- Loads initial and final narrative data into kb_items
-- Uses deterministic item_id pattern: NARR-<student_id>-<phase>-<category>

-- === STAGE: make a tiny staging table (temp) and load CSVs ===
DROP TABLE IF EXISTS _stg_narrative CASCADE;
CREATE TEMP TABLE _stg_narrative (
  student_id text NOT NULL,
  phase text NOT NULL CHECK (phase IN ('initial','final')),
  narrative_category text NOT NULL,          -- aptitude|passion|advocacy|framing|why_statement
  content text NOT NULL,
  source_ref text NOT NULL
);

-- Load initial
\copy _stg_narrative (student_id,phase,narrative_category,content,source_ref) FROM '/Users/snazir/ivylevel-platform-v10/data/kbase/00-MasterProgramLogs/initial_narrative.csv' CSV HEADER;

-- Load final
\copy _stg_narrative (student_id,phase,narrative_category,content,source_ref) FROM '/Users/snazir/ivylevel-platform-v10/data/kbase/00-MasterProgramLogs/final_narrative.csv' CSV HEADER;

-- === STAGE: upsert into kb_items (one row per category per phase) ===
-- item_id pattern: NARR-<student_id>-<phase>-<category>
WITH up AS (
  SELECT
    ('NARR-'||student_id||'-'||phase||'-'||narrative_category) AS item_id,
    student_id,
    'narrative'::text AS item_type,
    narrative_category AS subtype,
    content AS title_name,
    CASE WHEN phase='initial' THEN 'Planned' ELSE 'Submitted' END AS tier1_state,
    NULL::text AS tier2_substate,
    NULL::text AS status_detail,
    NULL::text AS key_metric_type,
    NULL::text AS key_metric_value,
    NULL::text AS key_metric_unit,
    NULL::date AS deadline_date,
    NULL::date AS event_date,
    CASE WHEN phase='final' THEN now()::date ELSE NULL::date END AS submit_date,
    NULL::date AS outcome_date,
    'coach'::text AS owner,
    NULL::text AS cadence,
    ARRAY[]::text[] AS evidence_links,
    source_ref,
    'high'::text AS confidence
  FROM _stg_narrative
)
INSERT INTO kb_items AS k (
  item_id, student_id, item_type, subtype, title_name,
  tier1_state, tier2_substate, status_detail,
  key_metric_type, key_metric_value, key_metric_unit,
  deadline_date, event_date, submit_date, outcome_date,
  owner, cadence, evidence_links, source_ref, confidence
)
SELECT *
FROM up
ON CONFLICT (item_id) DO UPDATE
SET
  title_name    = EXCLUDED.title_name,
  tier1_state   = EXCLUDED.tier1_state,
  source_ref    = EXCLUDED.source_ref,
  confidence    = EXCLUDED.confidence,
  updated_ts    = now();

-- === VIEWS for deterministic answering ===

DROP VIEW IF EXISTS v_narrative_initial CASCADE;
CREATE VIEW v_narrative_initial AS
SELECT
  student_id,
  subtype      AS narrative_category,
  title_name   AS content,
  source_ref,
  item_id
FROM kb_items
WHERE item_type='narrative' AND tier1_state='Planned'
ORDER BY narrative_category;

DROP VIEW IF EXISTS v_narrative_final CASCADE;
CREATE VIEW v_narrative_final AS
SELECT
  student_id,
  subtype      AS narrative_category,
  title_name   AS content,
  source_ref,
  item_id
FROM kb_items
WHERE item_type='narrative' AND tier1_state='Submitted'
ORDER BY narrative_category;

-- === Sanity checks (should be 5 rows each) ===
SELECT count(*) AS initial_rows FROM v_narrative_initial WHERE student_id='huda-2025';
SELECT count(*) AS final_rows   FROM v_narrative_final   WHERE student_id='huda-2025';

-- Display loaded data
SELECT * FROM v_narrative_initial WHERE student_id='huda-2025';
SELECT * FROM v_narrative_final WHERE student_id='huda-2025';

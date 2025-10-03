-- Temporal Facts Normalization Migration
-- This adds temporal and modality awareness to the fact resolution system

-- 1) Add normalized numeric column and modality tag
ALTER TABLE vital_facts
  ADD COLUMN IF NOT EXISTS numeric_value INT,
  ADD COLUMN IF NOT EXISTS modality TEXT;  -- 'official' | 'practice' | null

-- 2) Backfill numeric_value for SAT/ACT-like kinds
UPDATE vital_facts
SET numeric_value = NULLIF(REGEXP_REPLACE(value, '[^0-9]', '', 'g'), '')::INT
WHERE kind IN ('sat_total_score','act_composite');

-- 3) Constrain plausible ranges (optional, if you control writes)
-- This avoids junk values like "3" slipping in.
ALTER TABLE vital_facts
  ADD CONSTRAINT sat_score_range CHECK (
    kind <> 'sat_total_score'
    OR numeric_value IS NULL
    OR (numeric_value BETWEEN 200 AND 1600)
  );

ALTER TABLE vital_facts
  ADD CONSTRAINT act_score_range CHECK (
    kind <> 'act_composite'
    OR numeric_value IS NULL
    OR (numeric_value BETWEEN 1 AND 36)
  );

-- 4) Heuristic modality (improve with your real source taxonomy)
-- If you already have a sources table with type/category, prefer that.
UPDATE vital_facts vf
SET modality = CASE
  WHEN EXISTS (
    SELECT 1 FROM sources s
    WHERE s.source_id = vf.source_id
      AND (s.title ILIKE '%practice%' OR s.title ILIKE '%diagnostic%' OR s.title ILIKE '%mock%')
  ) THEN 'practice'
  WHEN EXISTS (
    SELECT 1 FROM sources s
    WHERE s.source_id = vf.source_id
      AND (s.title ILIKE '%College Board%' OR s.title ILIKE '%official%')
  ) THEN 'official'
  ELSE NULL
END
WHERE vf.modality IS NULL;

-- 5) Create a normalized view (reusable for any kind)
CREATE OR REPLACE VIEW vw_facts_normalized AS
SELECT
  vf.student_id,
  vf.kind,
  vf.value,
  vf.numeric_value,
  vf.fact_date::date AS fact_date,
  vf.confidence,
  vf.source_id,
  COALESCE(vf.modality, 'any') AS modality
FROM vital_facts vf
WHERE vf.value IS NOT NULL;
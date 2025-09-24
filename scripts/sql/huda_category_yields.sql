-- Per-category outcome rates for Huda (no external data needed)
WITH base AS (
  SELECT
    (o.body->>'category')::text AS category,
    (o.body->>'name')::text     AS name,
    (o.body->>'status')::text   AS status
  FROM observations o
  WHERE o.student_id = 'huda'
    AND o.type = 'APPLICATION'
    AND o.subtype IN ('accepted','rejected','waitlisted')
),
stats AS (
  SELECT 
    category,
    COUNT(*) AS total,
    SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) AS accepted,
    SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
    SUM(CASE WHEN status = 'waitlisted' THEN 1 ELSE 0 END) AS waitlisted
  FROM base
  GROUP BY category
)
SELECT 
  category,
  total,
  accepted,
  rejected,
  waitlisted,
  ROUND(100.0 * accepted / NULLIF(total, 0), 1) AS win_rate_pct,
  -- Strategic insights
  CASE 
    WHEN accepted / NULLIF(total::float, 0) > 0.8 THEN 'High-yield category'
    WHEN accepted / NULLIF(total::float, 0) < 0.5 THEN 'Challenging category'
    ELSE 'Moderate success'
  END AS insight
FROM stats
ORDER BY win_rate_pct DESC;

-- Example output:
-- category          | total | accepted | rejected | waitlisted | win_rate_pct | insight
-- Summer Programs   | 12    | 10       | 2        | 0          | 83.3         | High-yield category  
-- Honor Societies   | 8     | 8        | 0        | 0          | 100.0        | High-yield category
-- Research          | 5     | 2        | 2        | 1          | 40.0         | Challenging category
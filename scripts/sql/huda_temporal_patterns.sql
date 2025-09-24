-- Temporal analysis: rejection → acceptance patterns and bombardment outcomes
WITH timeline AS (
  SELECT 
    o.value->>'name' AS opportunity_name,
    o.subtype AS status,
    o.at::date AS decision_date,
    LAG(o.subtype) OVER (PARTITION BY o.value->>'name' ORDER BY o.at) AS prev_status,
    LAG(o.at::date) OVER (PARTITION BY o.value->>'name' ORDER BY o.at) AS prev_date
  FROM observations o
  WHERE o.student_id = 'huda'
    AND o.kind = 'APPLICATION'
    AND o.subtype IN ('accepted', 'rejected', 'waitlisted')
    AND o.value->>'name' IS NOT NULL
),
rebounds AS (
  SELECT 
    opportunity_name,
    prev_status || ' → ' || status AS pattern,
    decision_date - prev_date AS days_between
  FROM timeline
  WHERE prev_status = 'rejected' AND status = 'accepted'
),
weekly_activity AS (
  SELECT 
    DATE_TRUNC('week', o.at) AS week,
    COUNT(*) AS applications,
    SUM(CASE WHEN o.subtype = 'accepted' THEN 1 ELSE 0 END) AS wins,
    SUM(CASE WHEN o.subtype = 'rejected' THEN 1 ELSE 0 END) AS losses
  FROM observations o
  WHERE o.student_id = 'huda'
    AND o.kind = 'APPLICATION'
    AND o.subtype IN ('accepted', 'rejected', 'waitlisted')
  GROUP BY DATE_TRUNC('week', o.at)
),
bombardment_episodes AS (
  SELECT 
    week,
    applications,
    wins,
    losses,
    ROUND(100.0 * wins / NULLIF(applications, 0), 1) AS win_rate_pct,
    CASE 
      WHEN applications >= 5 THEN 'Bombardment week'
      WHEN applications >= 3 THEN 'Active week'
      ELSE 'Light week'
    END AS intensity
  FROM weekly_activity
)
SELECT 
  'Rejection to Acceptance Rebounds' AS analysis_type,
  COUNT(*)::text AS value,
  'Shows resilience and reapplication success' AS insight
FROM rebounds
UNION ALL
SELECT 
  'Average Days Between Rebound',
  ROUND(AVG(days_between))::text,
  'Time to pivot strategy after rejection'
FROM rebounds
UNION ALL
SELECT 
  'Bombardment Weeks (5+ apps)',
  COUNT(*)::text,
  'High-volume application periods'
FROM bombardment_episodes
WHERE applications >= 5
UNION ALL
SELECT 
  'Best Bombardment Win Rate',
  MAX(win_rate_pct) || '%',
  'Peak performance during high-volume weeks'
FROM bombardment_episodes
WHERE applications >= 5
UNION ALL
SELECT 
  'Post-Rejection Win Rate',
  ROUND(100.0 * 
    SUM(CASE WHEN status = 'accepted' AND prev_status = 'rejected' THEN 1 ELSE 0 END) / 
    NULLIF(SUM(CASE WHEN prev_status = 'rejected' THEN 1 ELSE 0 END), 0), 1
  ) || '%',
  'Success rate after initial rejection'
FROM timeline
WHERE prev_status IS NOT NULL;

-- Detailed bombardment analysis
SELECT 
  TO_CHAR(week, 'YYYY-MM-DD') AS week_start,
  applications,
  wins,
  losses,
  win_rate_pct || '%' AS win_rate,
  intensity,
  CASE 
    WHEN wins >= 3 THEN '🎯 Major victory'
    WHEN win_rate_pct >= 80 THEN '✨ High efficiency'
    WHEN applications >= 5 AND wins >= 2 THEN '💪 Volume success'
    ELSE '📊 Standard week'
  END AS outcome
FROM bombardment_episodes
WHERE applications > 0
ORDER BY week;
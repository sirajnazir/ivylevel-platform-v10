-- Migration Script: Refresh HGTI Materialized View
-- Purpose: Compute HGTI score from newly migrated growth events
-- Target: mv_hgti_scores (materialized view)

-- Refresh the materialized view
REFRESH MATERIALIZED VIEW mv_hgti_scores;

-- Verification: Show HGTI score and breakdown for Huda
SELECT
  'HGTI Score' as metric,
  student_id,
  (avg_transformation * 100)::numeric(5,2) as hgti_score,
  total_events,
  breakthrough_count,
  avg_transformation,
  latest_event_date
FROM mv_hgti_scores
WHERE student_id = 'huda-2025';

-- Detailed breakdown by barrier type
SELECT
  'HGTI Barrier Breakdown' as metric,
  barrier_type,
  COUNT(*) as event_count,
  COUNT(*) FILTER (WHERE breakthrough = TRUE) as breakthroughs,
  AVG(transformation_delta) as avg_transformation,
  MIN(created_at) as first_event,
  MAX(created_at) as last_event
FROM growth_events
WHERE student_id = 'huda-2025'
GROUP BY barrier_type
ORDER BY event_count DESC;

-- Timeline view (last 10 events)
SELECT
  'HGTI Timeline' as metric,
  created_at::date as event_date,
  barrier_type,
  LEFT(trigger, 60) || '...' as trigger_preview,
  transformation_delta,
  breakthrough
FROM growth_events
WHERE student_id = 'huda-2025'
ORDER BY created_at DESC
LIMIT 10;

-- Summary stats
SELECT
  'HGTI Summary' as metric,
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE breakthrough = TRUE) as breakthroughs,
  AVG(transformation_delta)::numeric(4,2) as avg_delta,
  MIN(transformation_delta)::numeric(4,2) as min_delta,
  MAX(transformation_delta)::numeric(4,2) as max_delta,
  (AVG(transformation_delta) * 100)::numeric(5,2) as hgti_score
FROM growth_events
WHERE student_id = 'huda-2025';

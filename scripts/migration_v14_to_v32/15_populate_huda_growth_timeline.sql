-- Migration: Populate timeline_events with Huda's awards, programs, projects, and growth events
-- Version: v13.1
-- Date: 2025-10-28
-- Purpose: Import existing kb_items (awards, programs, ECs) and growth_events into unified timeline

SET app.migration=true;

-- ============================================================================
-- AWARDS (from kb_items Award_Competition)
-- ============================================================================

INSERT INTO timeline_events (
  student_id,
  event_type,
  subtype,
  title,
  event_date,
  description,
  impact,
  metadata,
  source_table,
  source_id
)
SELECT
  'huda-2025',
  'award',
  subtype,
  title_name,
  COALESCE(outcome_date, event_date),
  'Received ' || title_name,
  CASE
    WHEN subtype = 'national' THEN 'major'
    WHEN subtype = 'regional' THEN 'moderate'
    ELSE 'minor'
  END,
  jsonb_build_object(
    'award_name', title_name,
    'level', subtype,
    'state', tier1_state
  ),
  'kb_items',
  item_id::uuid
FROM kb_items
WHERE student_id = 'huda-2025'
  AND item_type = 'Award_Competition'
  AND outcome_date IS NOT NULL;

-- ============================================================================
-- PROGRAMS (from kb_items program - only those with dates)
-- ============================================================================

-- Note: Current programs in kb_items are "Planned" without dates
-- We'll add them when actual participation dates are known
-- For now, skip programs without dates

-- ============================================================================
-- GROWTH EVENTS (from growth_events table - HGTI breakthroughs)
-- ============================================================================

INSERT INTO timeline_events (
  student_id,
  event_type,
  subtype,
  title,
  event_date,
  description,
  impact,
  metadata,
  source_table,
  source_id
)
SELECT
  student_id,
  'growth_event',
  barrier_type,
  CASE
    WHEN breakthrough THEN '🌟 Breakthrough: ' || REPLACE(INITCAP(barrier_type), '_', ' ')
    ELSE 'Working on: ' || REPLACE(INITCAP(barrier_type), '_', ' ')
  END,
  occurred_at,
  COALESCE(coach_reflection, 'Growth moment in ' || REPLACE(LOWER(barrier_type), '_', ' ')),
  CASE
    WHEN breakthrough AND transformation_delta > 0.5 THEN 'major'
    WHEN breakthrough THEN 'moderate'
    ELSE 'minor'
  END,
  jsonb_build_object(
    'barrier_type', barrier_type,
    'breakthrough', breakthrough,
    'transformation_delta', transformation_delta,
    'coach_reflection', coach_reflection,
    'student_reflection', student_reflection
  ),
  'growth_events',
  id
FROM growth_events
WHERE student_id = 'huda-2025'
  AND breakthrough = true;  -- Only include breakthroughs for timeline

-- ============================================================================
-- PROJECTS/ECs (from kb_items ec - only those with meaningful dates)
-- ============================================================================

-- For now, we'll skip ECs as most don't have specific milestone dates
-- These will need to be extracted from execution docs/session transcripts
-- as the user specified

-- ============================================================================
-- ACADEMIC MILESTONES (from vital_facts - test scores, GPA)
-- ============================================================================

-- SAT Score
INSERT INTO timeline_events (
  student_id,
  event_type,
  subtype,
  title,
  event_date,
  description,
  impact,
  metadata
)
SELECT
  student_id,
  'academic',
  'test_score',
  'SAT Score: ' || fact_value::INTEGER,
  from_dt::date,
  'Achieved SAT score of ' || fact_value::INTEGER,
  CASE
    WHEN fact_value::INTEGER >= 1500 THEN 'major'
    WHEN fact_value::INTEGER >= 1400 THEN 'moderate'
    ELSE 'minor'
  END,
  jsonb_build_object(
    'test_type', 'SAT',
    'score', fact_value::INTEGER,
    'perfect_score', 1600
  )
FROM vital_facts
WHERE student_id = 'huda-2025'
  AND fact_name = 'sat_total'
  AND fact_value IS NOT NULL
  AND from_dt IS NOT NULL
ORDER BY from_dt DESC
LIMIT 1;  -- Only most recent score

-- GPA milestone (if available with date)
INSERT INTO timeline_events (
  student_id,
  event_type,
  subtype,
  title,
  event_date,
  description,
  impact,
  metadata
)
SELECT
  student_id,
  'academic',
  'gpa',
  'Weighted GPA: ' || fact_value::NUMERIC(3,2),
  from_dt::date,
  'Achieved weighted GPA of ' || fact_value::NUMERIC(3,2),
  CASE
    WHEN fact_value::NUMERIC >= 4.5 THEN 'major'
    WHEN fact_value::NUMERIC >= 4.0 THEN 'moderate'
    ELSE 'minor'
  END,
  jsonb_build_object(
    'gpa_type', 'weighted',
    'gpa', fact_value::NUMERIC(3,2),
    'scale', 5.0
  )
FROM vital_facts
WHERE student_id = 'huda-2025'
  AND fact_name = 'gpa_weighted'
  AND fact_value IS NOT NULL
  AND from_dt IS NOT NULL
ORDER BY from_dt DESC
LIMIT 1;  -- Only most recent GPA

-- ============================================================================
-- PHASE TRANSITIONS (manually defined based on Huda's journey)
-- ============================================================================

-- Foundation Phase Start (Week 1)
INSERT INTO timeline_events (
  student_id, event_type, subtype, title, event_date, description, impact, metadata
) VALUES (
  'huda-2025',
  'phase_transition',
  'start',
  'Foundation Phase: Beginning the Journey',
  '2023-09-01',
  'Started college prep journey with Jenny - building foundations',
  'major',
  jsonb_build_object(
    'from_phase', null,
    'to_phase', 'Foundation',
    'trigger', 'Onboarding complete',
    'week_number', 1
  )
);

-- Build Phase Start (Week 30)
INSERT INTO timeline_events (
  student_id, event_type, subtype, title, event_date, description, impact, metadata
) VALUES (
  'huda-2025',
  'phase_transition',
  'transition',
  'Build Phase: Amplifying the Profile',
  '2024-04-01',
  'Transitioned to Build phase - deepening ECs and building narrative',
  'major',
  jsonb_build_object(
    'from_phase', 'Foundation',
    'to_phase', 'Build',
    'trigger', 'Strong baseline established',
    'week_number', 30
  )
);

-- Application Phase Start (Week 70)
INSERT INTO timeline_events (
  student_id, event_type, subtype, title, event_date, description, impact, metadata
) VALUES (
  'huda-2025',
  'phase_transition',
  'transition',
  'Application Phase: Bringing It All Together',
  '2024-08-01',
  'Transitioned to Application phase - essays, apps, and final push',
  'major',
  jsonb_build_object(
    'from_phase', 'Build',
    'to_phase', 'Application',
    'trigger', 'Summer before senior year',
    'week_number', 70
  )
);

-- Decision Phase Start (Week 87)
INSERT INTO timeline_events (
  student_id, event_type, subtype, title, event_date, description, impact, metadata
) VALUES (
  'huda-2025',
  'phase_transition',
  'transition',
  'Decision Phase: Results Coming In',
  '2024-12-01',
  'Transitioned to Decision phase - receiving decisions and choosing college',
  'major',
  jsonb_build_object(
    'from_phase', 'Application',
    'to_phase', 'Decision',
    'trigger', 'All applications submitted',
    'week_number', 87
  )
);

-- ============================================================================
-- SUMMARY STATISTICS
-- ============================================================================

DO $$
DECLARE
  award_count INTEGER;
  growth_count INTEGER;
  academic_count INTEGER;
  phase_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO award_count FROM timeline_events WHERE event_type = 'award';
  SELECT COUNT(*) INTO growth_count FROM timeline_events WHERE event_type = 'growth_event';
  SELECT COUNT(*) INTO academic_count FROM timeline_events WHERE event_type = 'academic';
  SELECT COUNT(*) INTO phase_count FROM timeline_events WHERE event_type = 'phase_transition';
  total_count := award_count + growth_count + academic_count + phase_count;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration Complete: Growth Timeline';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Awards: %', award_count;
  RAISE NOTICE 'Growth Events (Breakthroughs): %', growth_count;
  RAISE NOTICE 'Academic Milestones: %', academic_count;
  RAISE NOTICE 'Phase Transitions: %', phase_count;
  RAISE NOTICE 'New Events Added: %', total_count;
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Combined with % application events', (SELECT COUNT(*) FROM timeline_events WHERE event_type = 'application');
  RAISE NOTICE 'Total Timeline Events: %', (SELECT COUNT(*) FROM timeline_events WHERE student_id = 'huda-2025');
  RAISE NOTICE '========================================';
END $$;

-- Verify complete timeline
SELECT
  event_type,
  COUNT(*) as count,
  MIN(event_date) as earliest,
  MAX(event_date) as latest
FROM timeline_events
WHERE student_id = 'huda-2025'
GROUP BY event_type
ORDER BY MIN(event_date);

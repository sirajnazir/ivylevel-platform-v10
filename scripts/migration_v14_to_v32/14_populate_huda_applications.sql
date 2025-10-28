-- Migration: Populate timeline_events with Huda's college applications
-- Version: v13.1
-- Date: 2025-10-28
-- Purpose: Import 28 college applications from huda-final-college-list-and-decisions.json
--          into timeline_events table
--
-- Data Source: /data/canonical/jenny-huda/09-Raw-ApplicationDocs/huda-final-college-list-and-decisions.json
--
-- Note: Since the JSON doesn't contain submission dates or application types (EA/RD),
--       we're using estimated dates based on typical application timelines:
--       - REA (Restrictive Early Action): Nov 1, 2024
--       - EA (Early Action): Nov 1, 2024
--       - UC (UC Applications): Nov 30, 2024
--       - RD (Regular Decision): Jan 1, 2025
--
--       Decision dates estimated based on:
--       - REA/EA: Mid-December 2024
--       - UC: Late March 2025
--       - RD: Late March / Early April 2025

SET app.migration=true;

-- ============================================================================
-- APPLICATION SUBMISSIONS
-- ============================================================================

-- REA: UNC Chapel Hill (Nov 1, 2024 → Accepted Dec 15, 2024)
INSERT INTO timeline_events (
  student_id, event_type, subtype, title, event_date, description, impact, metadata
) VALUES (
  'huda-2025',
  'application',
  'submission',
  'Submitted UNC Chapel Hill Application (REA)',
  '2024-11-01',
  'Submitted Restrictive Early Action application to University of North Carolina at Chapel Hill',
  'major',
  jsonb_build_object(
    'college', 'UNC Chapel Hill',
    'application_type', 'REA',
    'status', 'submitted'
  )
);

-- EA Submissions (Nov 1, 2024)
INSERT INTO timeline_events (student_id, event_type, subtype, title, event_date, description, impact, metadata)
SELECT
  'huda-2025',
  'application',
  'submission',
  'Submitted ' || college || ' Application (EA)',
  '2024-11-01',
  'Submitted Early Action application to ' || college,
  'moderate',
  jsonb_build_object(
    'college', college,
    'application_type', 'EA',
    'status', 'submitted'
  )
FROM (VALUES
  ('MIT'),
  ('Stanford University'),
  ('Harvard'),
  ('Yale'),
  ('Brown'),
  ('Columbia'),
  ('Cornell'),
  ('Duke'),
  ('Northwestern University'),
  ('University of Pennsylvania'),
  ('Carnegie Mellon University'),
  ('Georgia Tech'),
  ('Barnard University'),
  ('New York University'),
  ('University of Southern California'),
  ('Northeastern University'),
  ('UIUC')
) AS ea_colleges(college);

-- UC Applications (Nov 30, 2024)
INSERT INTO timeline_events (student_id, event_type, subtype, title, event_date, description, impact, metadata)
SELECT
  'huda-2025',
  'application',
  'submission',
  'Submitted UC ' || campus || ' Application',
  '2024-11-30',
  'Submitted University of California application to ' || campus || ' campus',
  CASE
    WHEN campus IN ('Berkeley', 'Los Angeles', 'San Diego') THEN 'major'
    ELSE 'moderate'
  END,
  jsonb_build_object(
    'college', 'UC ' || campus,
    'application_type', 'UC',
    'status', 'submitted'
  )
FROM (VALUES
  ('Berkeley'),
  ('Los Angeles'),
  ('San Diego'),
  ('Irvine'),
  ('Davis'),
  ('Santa Cruz'),
  ('Riverside')
) AS uc_campuses(campus);

-- RD Submissions (Jan 1, 2025)
INSERT INTO timeline_events (student_id, event_type, subtype, title, event_date, description, impact, metadata)
SELECT
  'huda-2025',
  'application',
  'submission',
  'Submitted ' || college || ' Application (RD)',
  '2025-01-01',
  'Submitted Regular Decision application to ' || college,
  'moderate',
  jsonb_build_object(
    'college', college,
    'application_type', 'RD',
    'status', 'submitted'
  )
FROM (VALUES
  ('UT Austin'),
  ('Cal Poly SLO'),
  ('SJSU')
) AS rd_colleges(college);

-- ============================================================================
-- DECISIONS
-- ============================================================================

-- REA Decision: UNC Chapel Hill Acceptance (Dec 15, 2024)
INSERT INTO timeline_events (
  student_id, event_type, subtype, title, event_date, description, impact, metadata
) VALUES (
  'huda-2025',
  'application',
  'decision',
  'Accepted to UNC Chapel Hill! 🎉',
  '2024-12-15',
  'Received acceptance from University of North Carolina at Chapel Hill (REA)',
  'major',
  jsonb_build_object(
    'college', 'UNC Chapel Hill',
    'decision', 'Accepted',
    'application_type', 'REA',
    'milestone', 'first_acceptance'
  )
);

-- EA Decisions (Mid-December 2024)
INSERT INTO timeline_events (student_id, event_type, subtype, title, event_date, description, impact, metadata)
SELECT
  'huda-2025',
  'application',
  'decision',
  CASE
    WHEN decision = 'Accepted' THEN 'Accepted to ' || college || '! 🎉'
    WHEN decision = 'Waitlisted' THEN 'Waitlisted at ' || college
    ELSE 'Decision from ' || college || ': ' || decision
  END,
  '2024-12-18',
  'Received ' || decision || ' decision from ' || college || ' (EA)',
  CASE
    WHEN decision = 'Accepted' AND college IN ('MIT', 'Stanford University', 'Harvard', 'Yale') THEN 'major'
    WHEN decision = 'Accepted' THEN 'moderate'
    ELSE 'minor'
  END,
  jsonb_build_object(
    'college', college,
    'decision', decision,
    'application_type', 'EA'
  )
FROM (VALUES
  ('MIT', 'Rejected'),
  ('Stanford University', 'Rejected'),
  ('Harvard', 'Rejected'),
  ('Carnegie Mellon University', 'Waitlisted'),
  ('Northwestern University', 'Rejected'),
  ('University of Pennsylvania', 'Rejected'),
  ('New York University', 'Waitlisted'),
  ('Northeastern University', 'Accepted'),
  ('University of Southern California', 'Accepted'),
  ('UIUC', 'Accepted')
) AS ea_decisions(college, decision);

-- UC Decisions (Late March 2025)
INSERT INTO timeline_events (student_id, event_type, subtype, title, event_date, description, impact, metadata)
SELECT
  'huda-2025',
  'application',
  'decision',
  CASE
    WHEN decision = 'Accepted' THEN 'Accepted to UC ' || campus || '! 🎉'
    WHEN decision = 'Waitlisted' THEN 'Waitlisted at UC ' || campus
    ELSE 'Decision from UC ' || campus || ': ' || decision
  END,
  '2025-03-28',
  'Received ' || decision || ' decision from UC ' || campus,
  CASE
    WHEN decision = 'Accepted' AND campus IN ('Berkeley', 'Los Angeles') THEN 'major'
    WHEN decision = 'Accepted' THEN 'moderate'
    ELSE 'minor'
  END,
  jsonb_build_object(
    'college', 'UC ' || campus,
    'decision', decision,
    'application_type', 'UC'
  )
FROM (VALUES
  ('Irvine', 'Accepted'),
  ('San Diego', 'Waitlisted'),
  ('Davis', 'Accepted'),
  ('Santa Cruz', 'Accepted'),
  ('Riverside', 'Accepted'),
  ('Los Angeles', 'Waitlisted'),
  ('Berkeley', 'Waitlisted')
) AS uc_decisions(campus, decision);

-- RD Decisions (Late March / Early April 2025)
INSERT INTO timeline_events (student_id, event_type, subtype, title, event_date, description, impact, metadata)
SELECT
  'huda-2025',
  'application',
  'decision',
  CASE
    WHEN decision = 'Accepted' THEN 'Accepted to ' || college || '! 🎉'
    WHEN decision = 'Waitlisted' THEN 'Waitlisted at ' || college
    ELSE 'Decision from ' || college || ': ' || decision
  END,
  CASE
    WHEN college = 'UT Austin' THEN '2025-03-31'::date
    ELSE '2025-04-01'::date
  END,
  'Received ' || decision || ' decision from ' || college || ' (RD)',
  CASE
    WHEN decision = 'Accepted' THEN 'moderate'
    ELSE 'minor'
  END,
  jsonb_build_object(
    'college', college,
    'decision', decision,
    'application_type', 'RD'
  )
FROM (VALUES
  ('UT Austin', 'Rejected'),
  ('Cal Poly SLO', 'Waitlisted'),
  ('SJSU', 'Accepted'),
  ('Yale', 'Rejected'),
  ('Brown', 'Rejected'),
  ('Columbia', 'Rejected'),
  ('Cornell', 'Rejected'),
  ('Duke', 'Rejected'),
  ('Georgia Tech', 'Waitlisted'),
  ('Barnard University', 'Waitlisted')
) AS rd_decisions(college, decision);

-- ============================================================================
-- SUMMARY STATISTICS
-- ============================================================================

-- Display import summary
DO $$
DECLARE
  submission_count INTEGER;
  decision_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO submission_count FROM timeline_events WHERE event_type = 'application' AND subtype = 'submission';
  SELECT COUNT(*) INTO decision_count FROM timeline_events WHERE event_type = 'application' AND subtype = 'decision';
  total_count := submission_count + decision_count;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration Complete: Huda Applications';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Application Submissions: %', submission_count;
  RAISE NOTICE 'Decision Events: %', decision_count;
  RAISE NOTICE 'Total Timeline Events: %', total_count;
  RAISE NOTICE '========================================';
END $$;

-- Verify data
SELECT
  event_type,
  subtype,
  COUNT(*) as count,
  MIN(event_date) as earliest,
  MAX(event_date) as latest
FROM timeline_events
WHERE student_id = 'huda-2025'
GROUP BY event_type, subtype
ORDER BY event_type, subtype;

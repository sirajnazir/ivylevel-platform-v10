-- Migration Script: Academic Courses → SQL Chips
-- Source: academic_courses (v14)
-- Target: chips (v3.2)
-- Expected: 1 chip with all 7 course records

-- Clear any existing course chips for this migration (idempotent)
DELETE FROM chips
WHERE student_id = 'huda-2025'
AND kind = 'SQL'
AND source->>'source_table' = 'academic_courses'
AND trace_id LIKE 'migration_v14_to_v32_courses%';

-- Insert Courses chip
INSERT INTO chips (id, student_id, kind, source, hash, trace_id, created_at)
SELECT
  gen_random_uuid(),
  'huda-2025',
  'SQL',
  jsonb_build_object(
    'query', 'SELECT * FROM academic_courses WHERE student_id = ''huda-2025'' ORDER BY term_id, course_title',
    'result', jsonb_agg(
      jsonb_build_object(
        'term_id', term_id,
        'course_title', course_title,
        'course_code', course_code,
        'level', level,
        'subject_area', subject_area,
        'created_ts', created_ts
      ) ORDER BY term_id, course_title
    ),
    'metadata', jsonb_build_object(
      'source_table', 'academic_courses',
      'migration_source', 'v14_to_v32',
      'migration_date', NOW(),
      'record_count', COUNT(*)
    )
  ),
  md5('huda_courses_v14_migration'),
  'migration_v14_to_v32_courses',
  NOW()
FROM academic_courses
WHERE student_id = 'huda-2025'
GROUP BY student_id;

-- Verification
SELECT
  'Course Chips' as migration_step,
  COUNT(*) as chips_created,
  jsonb_array_length(source->'result') as course_records
FROM chips
WHERE student_id = 'huda-2025'
AND kind = 'SQL'
AND source->>'source_table' = 'academic_courses';

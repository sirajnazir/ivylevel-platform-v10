-- Fix Huda's Senior Year Courses
-- Date: 2025-10-20
-- Issue: Database contains INCORRECT senior year courses that don't match final college application
--
-- INCORRECT COURSES IN DATABASE:
-- - AP Calculus BC
-- - AP Computer Science A
-- - AP English Language
-- - AP Physics 1
-- - AP US History
-- - Spanish 3 Honors
--
-- CORRECT COURSES FROM FINAL APPLICATION:
-- - AP Literature and Composition
-- - AP Statistics
-- - AP Spanish Language and Culture
-- - AP US Government and Politics
-- - AP Psychology
-- - Adulting (REG)
-- - Applied Computer Science practices (REG)

BEGIN;

-- Step 1: Delete incorrect grades (must delete grades before courses due to FK constraint)
DELETE FROM academic_grades
WHERE student_id = 'huda-2025'
  AND course_id IN (
    SELECT course_id
    FROM academic_courses
    WHERE student_id = 'huda-2025'
      AND term_id = 'huda-2025-2024-SENIOR'
  );

-- Step 2: Delete incorrect courses
DELETE FROM academic_courses
WHERE student_id = 'huda-2025'
  AND term_id = 'huda-2025-2024-SENIOR';

-- Step 3: Insert correct courses from final college application
INSERT INTO academic_courses (course_id, student_id, term_id, course_code, subject_area, course_title, level, source_id, confidence, created_ts, updated_ts)
VALUES
  -- AP Literature and Composition
  (
    'huda-2025-2024-SENIOR-' || md5('AP Literature and Composition'),
    'huda-2025',
    'huda-2025-2024-SENIOR',
    'AP-LIT',
    'English',
    'AP Literature and Composition',
    'AP',
    'final_college_app',
    'high',
    NOW(),
    NOW()
  ),
  -- AP Statistics
  (
    'huda-2025-2024-SENIOR-' || md5('AP Statistics'),
    'huda-2025',
    'huda-2025-2024-SENIOR',
    'AP-STAT',
    'Mathematics',
    'AP Statistics',
    'AP',
    'final_college_app',
    'high',
    NOW(),
    NOW()
  ),
  -- AP Spanish Language and Culture
  (
    'huda-2025-2024-SENIOR-' || md5('AP Spanish Language and Culture'),
    'huda-2025',
    'huda-2025-2024-SENIOR',
    'AP-SPAN',
    'World Language',
    'AP Spanish Language and Culture',
    'AP',
    'final_college_app',
    'high',
    NOW(),
    NOW()
  ),
  -- AP US Government and Politics
  (
    'huda-2025-2024-SENIOR-' || md5('AP US Government and Politics'),
    'huda-2025',
    'huda-2025-2024-SENIOR',
    'AP-GOV',
    'Social Studies',
    'AP US Government and Politics',
    'AP',
    'final_college_app',
    'high',
    NOW(),
    NOW()
  ),
  -- AP Psychology
  (
    'huda-2025-2024-SENIOR-' || md5('AP Psychology'),
    'huda-2025',
    'huda-2025-2024-SENIOR',
    'AP-PSYCH',
    'Social Studies',
    'AP Psychology',
    'AP',
    'final_college_app',
    'high',
    NOW(),
    NOW()
  ),
  -- Adulting (REG)
  (
    'huda-2025-2024-SENIOR-' || md5('Adulting'),
    'huda-2025',
    'huda-2025-2024-SENIOR',
    'ADULT',
    'Life Skills',
    'Adulting',
    'Regular',
    'final_college_app',
    'high',
    NOW(),
    NOW()
  ),
  -- Applied Computer Science practices (REG)
  (
    'huda-2025-2024-SENIOR-' || md5('Applied Computer Science practices'),
    'huda-2025',
    'huda-2025-2024-SENIOR',
    'CS-PRACT',
    'Computer Science',
    'Applied Computer Science practices',
    'Regular',
    'final_college_app',
    'high',
    NOW(),
    NOW()
  );

-- Step 4: Insert final grades for correct courses (all A's as mentioned in execution notes)
INSERT INTO academic_grades (grade_id, student_id, course_id, grade_letter, grade_percent, credits, weighting, status, recorded_at, source_id, confidence)
SELECT
  course_id || '-final',
  student_id,
  course_id,
  'A',
  95.0,
  5,
  CASE WHEN level = 'AP' THEN 1.0 ELSE 0.0 END,
  'final',
  NOW(),
  'final_college_app',
  'high'
FROM academic_courses
WHERE student_id = 'huda-2025'
  AND term_id = 'huda-2025-2024-SENIOR';

-- Verify the changes
SELECT
  'After update:' as status,
  course_title,
  level
FROM academic_courses
WHERE student_id = 'huda-2025'
  AND term_id = 'huda-2025-2024-SENIOR'
ORDER BY course_title;

COMMIT;

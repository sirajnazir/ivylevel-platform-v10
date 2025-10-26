/**
 * Seed v10.0 Data for Huda's Account
 * Purpose: Add sample tasks, timeline events, and projects for testing
 */

import { pool } from '../db/pool.js';

const STUDENT_ID = 'huda-2025-new';

async function seedV10Data() {
  console.log('🌱 Seeding v10.0 data for Huda...');

  try {
    // Seed Tasks
    console.log('📋 Creating tasks...');
    await pool.query(`
      INSERT INTO tasks (student_id, title, description, status, priority, category, due_date, week_number)
      VALUES
        ($1, 'Complete MIT Application Essay', 'Write and revise main Common App essay', 'in_progress', 'high', 'essay', CURRENT_DATE + INTERVAL '14 days', 1),
        ($1, 'Prepare for SAT Retake', 'Review math and reading comprehension', 'not_started', 'medium', 'test_prep', CURRENT_DATE + INTERVAL '30 days', 2),
        ($1, 'Update Resume with Summer Research', 'Add details about cancer research project', 'completed', 'high', 'application', CURRENT_DATE - INTERVAL '7 days', 0),
        ($1, 'Schedule Stanford Interview', 'Contact alumni interviewer', 'not_started', 'critical', 'application', CURRENT_DATE + INTERVAL '5 days', 1),
        ($1, 'Submit Recommendation Letter Requests', 'Request from Physics and English teachers', 'completed', 'high', 'application', CURRENT_DATE - INTERVAL '14 days', 0)
      ON CONFLICT DO NOTHING
    `, [STUDENT_ID]);

    // Seed Timeline Events
    console.log('📅 Creating timeline events...');
    await pool.query(`
      INSERT INTO timeline_events (student_id, title, description, event_date, event_type, icon, color, importance)
      VALUES
        ($1, 'Started Oncology Research Internship', 'Began summer research at NIH studying cancer immunotherapy', '2024-06-15', 'growth_event', '🔬', '#4CAF50', 'high'),
        ($1, 'SAT Score Improvement', 'Improved SAT score from 1450 to 1520', '2024-08-20', 'academic', '📈', '#2196F3', 'high'),
        ($1, 'Published Research Paper Co-Author', 'Paper accepted in Journal of Young Investigators', '2024-09-10', 'academic', '📄', '#FF9800', 'critical'),
        ($1, 'MIT Early Action Submitted', 'Submitted Early Action application to MIT', '2024-11-01', 'decision', '🎓', '#9C27B0', 'critical'),
        ($1, 'Founded Science Tutoring Program', 'Created free tutoring initiative for underserved students', '2024-03-15', 'program', '👥', '#00BCD4', 'medium')
      ON CONFLICT DO NOTHING
    `, [STUDENT_ID]);

    // Seed Projects
    console.log('💼 Creating projects...');
    await pool.query(`
      INSERT INTO projects (student_id, title, description, category, status, start_date, milestones, metrics, used_in_applications)
      VALUES
        (
          $1,
          'Cancer Immunotherapy Research Project',
          'Independent research on CAR-T cell therapy effectiveness, conducted at NIH during summer internship',
          'research',
          'completed',
          '2024-06-15',
          '[
            {"title": "Literature Review", "completed": true, "date": "2024-06-20"},
            {"title": "Experimental Design", "completed": true, "date": "2024-07-01"},
            {"title": "Data Collection", "completed": true, "date": "2024-08-01"},
            {"title": "Analysis & Paper Writing", "completed": true, "date": "2024-08-31"}
          ]'::jsonb,
          '{"hours_invested": "320", "papers_reviewed": "45", "experiments_conducted": "12", "publication_status": "accepted"}'::jsonb,
          true
        ),
        (
          $1,
          'STEM Tutoring Initiative',
          'Free tutoring program for underprivileged high school students in science and math',
          'service',
          'active',
          '2024-03-15',
          '[
            {"title": "Program Design", "completed": true, "date": "2024-03-20"},
            {"title": "Recruit Volunteer Tutors", "completed": true, "date": "2024-04-01"},
            {"title": "Launch Pilot Program", "completed": true, "date": "2024-04-15"},
            {"title": "Expand to 3 Schools", "completed": false}
          ]'::jsonb,
          '{"students_helped": "42", "volunteer_tutors": "15", "schools_partnered": "2", "avg_grade_improvement": "1.2 GPA points"}'::jsonb,
          true
        ),
        (
          $1,
          'Science Olympiad Competition Preparation',
          'Leading team preparation for state-level Science Olympiad in Biology and Chemistry events',
          'other',
          'active',
          '2024-09-01',
          '[
            {"title": "Form Competition Team", "completed": true, "date": "2024-09-05"},
            {"title": "Weekly Practice Sessions", "completed": true, "date": "2024-09-10"},
            {"title": "Regional Competition", "completed": false},
            {"title": "State Finals Preparation", "completed": false}
          ]'::jsonb,
          '{"team_members": "8", "practice_hours_weekly": "6", "regional_rank": "TBD"}'::jsonb,
          false
        )
      ON CONFLICT DO NOTHING
    `, [STUDENT_ID]);

    // Refresh materialized views
    console.log('🔄 Refreshing materialized views...');
    await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_task_completion_stats');
    await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_timeline_summary');

    console.log('✅ v10.0 data seeding complete!');
    console.log('\nSummary:');
    console.log('- 5 tasks created (2 completed, 1 in progress, 2 not started)');
    console.log('- 5 timeline events created (research, academics, achievements)');
    console.log('- 3 projects created (1 completed, 1 active, 1 in progress)');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the seed function
seedV10Data().catch(console.error);

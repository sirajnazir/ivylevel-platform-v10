import { pool } from '../src/db/pool.js';

async function verify() {
  const result = await pool.query(`
    SELECT
      title, pattern_slug, outcome_category, quality_score
    FROM moat_student_success_patterns
    WHERE student_id = 'huda-2025'
    ORDER BY created_at
  `);

  console.log('✅ Success Patterns Loaded:\n');
  result.rows.forEach((p: any, i: number) => {
    console.log(`${i+1}. ${p.title} (${p.pattern_slug})`);
    console.log(`   Category: ${p.outcome_category}, Quality: ${p.quality_score}`);
  });
  console.log(`\nTotal: ${result.rows.length} patterns`);
  process.exit(0);
}

verify();

/**
 * load-ds6-ds7-data.ts
 * Load DS6 (Essay Examples) and DS7 (AO Perspectives) from real Jenny-Huda coaching intelligence
 * Created: 2025-10-16 (Week 14)
 */

import { pool } from '../src/db.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../../..');

async function loadDS6EssayExamples() {
  console.log('📝 Loading DS6: Essay Examples from real coaching sessions...');

  const sqlPath = join(rootDir, 'data/migrations/scripts/009a_seed_essay_examples_real.sql');
  const sql = readFileSync(sqlPath, 'utf-8');

  await pool.query(sql);

  const result = await pool.query('SELECT COUNT(*) FROM moat_essay_examples');
  console.log(`✅ DS6 Loaded: ${result.rows[0].count} essay examples`);

  // Show sample
  const sample = await pool.query(`
    SELECT student_id, college_name, prompt_type,
           array_length(themes, 1) as theme_count,
           writing_quality,
           LEFT(analysis_notes, 60) as notes_preview
    FROM moat_essay_examples
    LIMIT 3
  `);
  console.log('   Sample entries:');
  sample.rows.forEach((row, i) => {
    console.log(`   ${i + 1}. ${row.student_id} → ${row.college_name} (${row.prompt_type})`);
    console.log(`      Quality: ${row.writing_quality}, Themes: ${row.theme_count}`);
    console.log(`      Notes: ${row.notes_preview}...`);
  });
}

async function loadDS7AOPerspectives() {
  console.log('\n🎓 Loading DS7: AO Perspectives from real coaching intelligence...');

  const sqlPath = join(rootDir, 'data/migrations/scripts/009b_seed_ao_perspectives_real.sql');
  const sql = readFileSync(sqlPath, 'utf-8');

  await pool.query(sql);

  const result = await pool.query('SELECT COUNT(*) FROM moat_ao_perspectives');
  console.log(`✅ DS7 Loaded: ${result.rows[0].count} AO perspectives`);

  // Show distribution
  const distribution = await pool.query(`
    SELECT college_name, COUNT(*) as perspective_count
    FROM moat_ao_perspectives
    GROUP BY college_name
    ORDER BY perspective_count DESC
  `);
  console.log('   Distribution by college:');
  distribution.rows.forEach(row => {
    console.log(`   - ${row.college_name}: ${row.perspective_count} perspectives`);
  });

  // Show sample
  const sample = await pool.query(`
    SELECT college_name, topic,
           LEFT(question, 50) as question_preview,
           credibility_score
    FROM moat_ao_perspectives
    ORDER BY credibility_score DESC
    LIMIT 3
  `);
  console.log('   Sample high-quality perspectives:');
  sample.rows.forEach((row, i) => {
    console.log(`   ${i + 1}. ${row.college_name} - ${row.topic}`);
    console.log(`      Q: ${row.question_preview}...`);
    console.log(`      Credibility: ${row.credibility_score}`);
  });
}

async function createTables() {
  console.log('📋 Creating DS6/DS7 tables...');

  const schemaPath = join(rootDir, 'data/migrations/scripts/008_create_ds6_ds7_tables.sql');
  const schemaSql = readFileSync(schemaPath, 'utf-8');

  // Set migration mode to allow DDL
  await pool.query("SET app.migration = 'true'");
  await pool.query(schemaSql);
  console.log('✅ Tables created\n');
}

async function main() {
  console.log('🚀 LOADING DS6/DS7 REAL DATA FROM JENNY-HUDA COACHING INTELLIGENCE\n');
  console.log('='.repeat(80));

  try {
    await createTables();
    await loadDS6EssayExamples();
    await loadDS7AOPerspectives();

    console.log('\n' + '='.repeat(80));
    console.log('✅ DS6/DS7 Load Complete - All Real Data from 90+ Weeks of Coaching!');
    console.log('   NO DUMMY DATA - 100% extracted from actual Jenny-Huda sessions');

  } catch (error: any) {
    console.error('\n❌ Error loading data:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

#!/usr/bin/env tsx

/**
 * Run NSM Extensions Migration (v15_005_nsm_extensions.sql)
 *
 * Purpose: Deploy NSM tracking infrastructure using existing schema
 * - 2 new tables (essay_progress, admission_checklist)
 * - 13 NSM views (aggregate existing data)
 * - Zero duplicate data structures
 */

import { pool } from '../src/db/pool.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🚀 Running NSM Extensions Migration (v15.005)...');
    console.log('Strategy: Leverage existing schema (kb_items, feature_snapshots, college_list, scholarships)');
    console.log('');

    // Set migration flag to allow DDL
    await client.query('SET app.migration = true');

    // Read migration file
    const migrationPath = join(__dirname, '../db/migrations/v15_005_nsm_extensions.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Execute migration
    console.log('Executing migration...');
    await client.query(migrationSQL);

    console.log('✅ Migration complete!');
    console.log('');
    console.log('Created:');
    console.log('  - essay_progress table');
    console.log('  - admission_checklist table');
    console.log('  - 13 NSM views (v_nsm_ivyscore_trajectory, v_nsm_recognition_vitals, etc.)');
    console.log('');

    // Verify views exist
    const viewsResult = await client.query(`
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'public'
        AND table_name LIKE 'v_nsm_%'
      ORDER BY table_name
    `);

    console.log(`✅ Verified ${viewsResult.rows.length} NSM views created:`);
    viewsResult.rows.forEach((row: any) => {
      console.log(`  - ${row.table_name}`);
    });
    console.log('');

    // Test with huda-2025 data
    console.log('🧪 Testing NSM dashboard with huda-2025 data...');
    const dashboardResult = await client.query(`
      SELECT
        student_id,
        current_ivyscore,
        sat_score_latest,
        national_awards_won,
        officer_positions_held,
        total_volunteer_hours,
        research_papers_published,
        reach_schools_count
      FROM v_nsm_dashboard
      WHERE student_id = 'huda-2025'
    `);

    if (dashboardResult.rows.length > 0) {
      console.log('✅ NSM Dashboard Data for huda-2025:');
      console.log(JSON.stringify(dashboardResult.rows[0], null, 2));
    } else {
      console.log('⚠️  No dashboard data found for huda-2025 (may need feature snapshots)');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

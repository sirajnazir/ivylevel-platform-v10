/**
 * Run Migration 008c: Seed Success Pattern Chips
 * Created: 2025-10-16
 */

import { pool } from '../src/db/pool.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  console.log('🚀 Running Migration 008c: Seed Success Pattern Chips\n');

  const migrationFile = path.join(__dirname, '../../../data/migrations/008c_seed_jenny_huda_success_patterns.sql');

  console.log(`📄 Reading migration file: ${migrationFile}\n`);

  const sql = fs.readFileSync(migrationFile, 'utf-8');

  // Extract INSERT statements only (they start with "INSERT INTO" after comments/whitespace)
  const insertRegex = /INSERT INTO[^;]+;/gis;
  const statements = sql.match(insertRegex) || [];

  console.log(`Found ${statements.length} INSERT statements\n`);

  try {
    console.log('⏳ Executing migration...\n');

    // Enable migration mode first
    await pool.query('SET app.migration = true');

    // Clear existing success patterns for huda-2025
    const deleteResult = await pool.query("DELETE FROM moat_student_success_patterns WHERE student_id = 'huda-2025'");
    console.log(`  🗑️  Cleared ${deleteResult.rowCount} existing patterns\n`);

    // Execute each statement
    let count = 0;
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await pool.query(statement);
          count++;
          if (count % 5 === 0) {
            console.log(`  ✅ Executed ${count}/${statements.length} statements`);
          }
        } catch (err: any) {
          console.error(`\n❌ Error in statement #${count + 1}:`);
          console.error(`Statement preview: ${statement.substring(0, 200)}...`);
          throw err;
        }
      }
    }

    console.log(`✅ Migration executed successfully! (${count} statements)\n`);

    // Run verification query
    const verify = await pool.query(`
      SELECT
        'Seed Complete' as status,
        COUNT(*) as patterns_loaded,
        STRING_AGG(DISTINCT outcome_category, ', ') as categories
      FROM moat_student_success_patterns
      WHERE student_id = 'huda-2025'
    `);

    console.log('📊 Verification Results:');
    console.log(verify.rows[0]);
    console.log();

    process.exit(0);
  } catch (err: any) {
    console.error('❌ Migration failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

runMigration();

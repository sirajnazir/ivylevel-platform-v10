/**
 * Run v15_003 student context intelligence migration
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  // Use postgres superuser for migrations to avoid permission issues
  const pool = new Pool({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/ivylevel',
  });

  try {
    console.log('📄 Reading migration file...');
    const migrationPath = join(__dirname, '../db/migrations/v15_003_student_context_intelligence.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('🚀 Running migration: v15_003_student_context_intelligence.sql');
    console.log(`📊 SQL length: ${migrationSQL.length} characters`);

    await pool.query(migrationSQL);

    console.log('✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration()
  .then(() => {
    console.log('✅ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });

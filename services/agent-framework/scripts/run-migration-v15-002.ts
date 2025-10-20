/**
 * Run v15_002 proactivity infrastructure migration
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ivylevel',
  });

  try {
    console.log('📄 Reading migration file...');
    const migrationPath = join(__dirname, '../db/migrations/v15_002_proactivity_infrastructure.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('🚀 Running migration: v15_002_proactivity_infrastructure.sql');
    console.log(`📊 SQL length: ${migrationSQL.length} characters`);

    const result = await pool.query(migrationSQL);

    console.log('✅ Migration completed successfully!');
    console.log(`📈 Result:`, result);

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

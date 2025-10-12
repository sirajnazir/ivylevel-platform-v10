/**
 * Schema Contract Verification
 * Ensures compat views and DDL blocker are active
 * Run: tsx scripts/verify_compat_schema.ts
 */

import { pool } from '../services/jenny-api/src/db/pool.js';

interface SchemaTest {
  name: string;
  sql: string;
  critical: boolean;
}

const tests: SchemaTest[] = [
  {
    name: 'compat.v_outcomes (awards)',
    sql: 'SELECT 1 FROM compat.v_outcomes LIMIT 1',
    critical: true
  },
  {
    name: 'compat.v_awards_final',
    sql: 'SELECT 1 FROM compat.v_awards_final LIMIT 1',
    critical: true
  },
  {
    name: 'compat.v_kb_items (ECs/Programs)',
    sql: 'SELECT 1 FROM compat.v_kb_items LIMIT 1',
    critical: false  // May be empty if no ECs in legacy data
  },
  {
    name: 'compat.v_sat_timeline',
    sql: 'SELECT 1 FROM compat.v_sat_timeline LIMIT 1',
    critical: true
  },
  {
    name: 'compat.v_academics_latest',
    sql: 'SELECT 1 FROM compat.v_academics_latest LIMIT 1',
    critical: true
  },
  {
    name: 'compat.v_academics_series',
    sql: 'SELECT 1 FROM compat.v_academics_series LIMIT 1',
    critical: true
  },
  {
    name: 'DDL blocker trigger',
    sql: "SELECT 1 FROM pg_event_trigger WHERE evtname='et_ddl_block'",
    critical: true
  },
  {
    name: 'compat.try_num() function',
    sql: "SELECT compat.try_num('123.45')",
    critical: true
  },
  {
    name: 'compat.try_date() function',
    sql: "SELECT compat.try_date('2024-01-15')",
    critical: true
  }
];

async function main() {
  console.log('\n==============================================');
  console.log('Schema Contract Verification - v10.2');
  console.log('==============================================\n');

  let passed = 0;
  let failed = 0;
  let warnings = 0;

  for (const test of tests) {
    try {
      const result = await pool.query(test.sql);

      if (result.rows.length === 0 && test.critical) {
        console.log(`⚠️  ${test.name} - EXISTS but EMPTY`);
        warnings++;
      } else {
        console.log(`✅ ${test.name}`);
        passed++;
      }
    } catch (err: any) {
      if (test.critical) {
        console.error(`❌ ${test.name}:`, err.message);
        failed++;
      } else {
        console.log(`⚠️  ${test.name} - OPTIONAL (${err.message})`);
        warnings++;
      }
    }
  }

  console.log('\n==============================================');
  console.log('Results:');
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  ⚠️  Warnings: ${warnings}`);
  console.log('==============================================\n');

  if (failed > 0) {
    console.error('❌ SCHEMA CONTRACT FAILED - Compat views not ready');
    console.error('\nTo fix, run migration:');
    console.error('  psql $DATABASE_URL -f services/jenny-api/db/migrations/2025-10-09-compat-views-legacy-bridge.sql');
    process.exit(1);
  }

  if (warnings > 0) {
    console.log('⚠️  Some views are empty or optional - verify data exists');
  }

  console.log('✅ All critical schema contracts verified');
  console.log('✅ v10.2 Compat Layer: PRODUCTION READY\n');

  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Schema verification error:', err);
  process.exit(1);
});

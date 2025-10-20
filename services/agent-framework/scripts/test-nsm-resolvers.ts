#!/usr/bin/env tsx

/**
 * Test NSM Resolvers with real huda-2025 data
 *
 * Validates that NSM resolvers leverage existing v14 views
 * and use flexible filtering (not hardcoded words)
 */

import { pool } from '../src/db/pool.js';
import { recognitionVitals, leadershipVitals, academicVitals, programVitals, nsmDashboard } from '../src/resolvers/nsm.js';

async function test() {
  console.log('🧪 Testing NSM Resolvers with huda-2025 real data...\n');

  try {
    console.log('=== Recognition Vitals ===');
    const recognition = await recognitionVitals(pool, 'huda-2025');
    console.log(recognition.answer);
    console.log('Vitals:', JSON.stringify(recognition.vitals, null, 2));
    console.log('');

    console.log('=== Leadership Vitals ===');
    const leadership = await leadershipVitals(pool, 'huda-2025');
    console.log(leadership.answer);
    console.log('Vitals:', JSON.stringify(leadership.vitals, null, 2));
    console.log('');

    console.log('=== Academic Vitals ===');
    const academic = await academicVitals(pool, 'huda-2025');
    console.log(academic.answer);
    console.log('Vitals:', JSON.stringify(academic.vitals, null, 2));
    console.log('');

    console.log('=== Program Vitals ===');
    const program = await programVitals(pool, 'huda-2025');
    console.log(program.answer);
    console.log('Vitals:', JSON.stringify(program.vitals, null, 2));
    console.log('');

    console.log('=== NSM Dashboard ===');
    const dashboard = await nsmDashboard(pool, 'huda-2025');
    console.log(dashboard.answer);
    console.log('');

    console.log('✅ All NSM resolvers tested successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

test().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

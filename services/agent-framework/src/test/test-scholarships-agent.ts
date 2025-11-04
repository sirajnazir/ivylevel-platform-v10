/**
 * Test Script for ScholarshipsAgent v21.0
 *
 * Purpose: Validate Scholarships Agent implementation with Intelligence Types Architecture
 *
 * Test Cases:
 * 1. General scholarship recommendations ("What scholarships should I apply to?")
 * 2. Financial aid analysis ("How much financial aid can I get?")
 * 3. Timeline planning ("When should I apply to scholarships?")
 * 4. Specific college cost ("How much will Stanford cost me?")
 *
 * Usage:
 * ```bash
 * cd services/agent-framework
 * pnpm tsx src/test/test-scholarships-agent.ts
 * ```
 *
 * Created: 2025-10-29 (v21.0 ScholarshipsAgent Foundation)
 */

import { Pool } from 'pg';
import { AgentRegistry } from '../agents/registry.js';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('test-scholarships-agent');

/**
 * Test queries
 */
const TEST_QUERIES = [
  {
    name: 'Core Scholarship Recommendations',
    query: 'What scholarships should I apply to?',
    expected_intelligence: ['TYPE-031', 'TYPE-020'], // Scholarship Selection Matrix + Opportunity Pipeline
  },
  {
    name: 'Financial Aid Analysis',
    query: 'How much financial aid can I get?',
    expected_intelligence: ['TYPE-033', 'TYPE-020'], // Financial Aid Intelligence + Opportunity Pipeline
  },
  {
    name: 'Application Timeline',
    query: 'When should I apply to scholarships?',
    expected_intelligence: ['TYPE-032', 'TYPE-031'], // Application Timeline + Selection Matrix
  },
  {
    name: 'College Cost Inquiry',
    query: 'How much will college cost me after aid?',
    expected_intelligence: ['TYPE-033'], // Financial Aid Intelligence
  },
  {
    name: 'EFC Calculation',
    query: 'What is my expected family contribution?',
    expected_intelligence: ['TYPE-033'], // Financial Aid Intelligence
  },
  {
    name: 'Stacking Strategy',
    query: 'Can I stack scholarships with college aid?',
    expected_intelligence: ['TYPE-033'], // Financial Aid Intelligence
  },
];

/**
 * Test student ID (from canonical data)
 */
const TEST_STUDENT_ID = 'huda-2025'; // Real student from database

/**
 * Initialize database connection
 */
function initializeDatabase(): Pool {
  const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'ivylevel',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
  });

  return pool;
}

/**
 * Run test for a single query
 */
async function runTest(
  testCase: typeof TEST_QUERIES[0],
  registry: AgentRegistry,
  testNumber: number
) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TEST ${testNumber}: ${testCase.name}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Query: "${testCase.query}"`);
  console.log(`Expected Intelligence: ${testCase.expected_intelligence.join(', ')}`);
  console.log('');

  const startTime = Date.now();

  try {
    const result = await registry.routeQuery({
      student_id: TEST_STUDENT_ID,
      query: testCase.query,
      session_id: `test_session_${Date.now()}`,
    });

    const duration = Date.now() - startTime;

    console.log(`✅ SUCCESS (${duration}ms)`);
    console.log('');
    console.log('Agent Used:', result.agent_used);
    console.log('');

    if (result.metadata) {
      console.log('Metadata:');
      console.log('  Duration:', result.metadata.duration_ms + 'ms');
      console.log('  Facts Used:', result.metadata.facts_used_count || 0);
      console.log('  Validation Score:', result.metadata.validation_score);
      console.log('  Intelligence Count:', result.metadata.intelligence_count || 0);

      if (result.metadata.intelligence_triggered) {
        console.log('  Intelligence Triggered:', result.metadata.intelligence_triggered.join(', '));

        // Validate expected intelligence types were triggered
        const triggered = result.metadata.intelligence_triggered;
        const expected = testCase.expected_intelligence;

        const missingIntelligence = expected.filter((exp) => !triggered.includes(exp));
        if (missingIntelligence.length > 0) {
          console.log('');
          console.log(`⚠️  WARNING: Expected intelligence not triggered: ${missingIntelligence.join(', ')}`);
        }
      }
    }

    console.log('');
    console.log('Response:');
    console.log('-'.repeat(80));
    console.log(result.response);
    console.log('-'.repeat(80));

    return { success: true, duration, testCase: testCase.name };
  } catch (error: any) {
    const duration = Date.now() - startTime;

    console.log(`❌ FAILED (${duration}ms)`);
    console.log('');
    console.log('Error:', error.message);
    console.log('');
    console.log('Stack:', error.stack);

    return { success: false, duration, testCase: testCase.name, error: error.message };
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                  Scholarships Agent v21.0 Test Suite                      ║');
  console.log('║               Intelligence Types Architecture Validation                   ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  log.event('test_scholarships_agent.start', {
    test_count: TEST_QUERIES.length,
    student_id: TEST_STUDENT_ID,
  });

  // Initialize database
  console.log('Initializing database connection...');
  const pool = initializeDatabase();
  console.log('✅ Database connected');
  console.log('');

  // Initialize agent registry
  console.log('Initializing Agent Registry...');
  const registry = AgentRegistry.getInstance();
  await registry.initialize(pool);
  console.log('✅ Agent Registry initialized');
  console.log('');

  // Run all tests
  const results = [];
  for (let i = 0; i < TEST_QUERIES.length; i++) {
    const result = await runTest(TEST_QUERIES[i], registry, i + 1);
    results.push(result);

    // Pause between tests
    if (i < TEST_QUERIES.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Summary
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                              Test Summary                                  ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  const avgDuration = totalDuration / results.length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`⏱️  Average Duration: ${Math.round(avgDuration)}ms`);
  console.log('');

  if (failCount > 0) {
    console.log('Failed Tests:');
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`  • ${r.testCase}: ${r.error}`);
      });
    console.log('');
  }

  // Cleanup
  await pool.end();
  console.log('✅ Database connection closed');
  console.log('');

  log.event('test_scholarships_agent.complete', {
    total: results.length,
    passed: successCount,
    failed: failCount,
    avg_duration_ms: Math.round(avgDuration),
  });

  // Exit with appropriate code
  process.exit(failCount > 0 ? 1 : 0);
}

// Run tests
main().catch((error) => {
  console.error('❌ Test suite failed:', error);
  log.error('test_scholarships_agent.fatal_error', { error: String(error) });
  process.exit(1);
});

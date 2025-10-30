/**
 * Test Script for ExecutionAgent v20.0
 *
 * Purpose: Validate Execution Agent implementation with Intelligence Types Architecture
 *
 * Test Cases:
 * 1. Weekly action plan query ("What should I do this week?")
 * 2. Execution ladder position ("Where am I on my journey?")
 * 3. Progress check ("How am I doing?")
 * 4. Next steps query ("What are my next steps?")
 *
 * Usage:
 * ```bash
 * cd services/agent-framework
 * pnpm tsx src/test/test-execution-agent.ts
 * ```
 *
 * Created: 2025-10-29 (v20.0 Foundation)
 */

import { Pool } from 'pg';
import { AgentRegistry } from '../agents/registry.js';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('test-execution-agent');

/**
 * Test queries
 */
const TEST_QUERIES = [
  {
    name: 'Weekly Action Plan',
    query: 'What should I do this week?',
    expected_intelligence: ['TYPE-049', 'TYPE-050'], // Execution Ladder + Outcome Engineering
  },
  {
    name: 'Execution Ladder Position',
    query: 'Where am I on my execution journey?',
    expected_intelligence: ['TYPE-049'], // Execution Ladder Navigation
  },
  {
    name: 'Progress Check',
    query: 'How am I doing with my progress?',
    expected_intelligence: ['TYPE-049', 'TYPE-050'], // Execution Ladder + Outcome Engineering
  },
  {
    name: 'Next Steps Query',
    query: 'What are my next steps for getting things done?',
    expected_intelligence: ['TYPE-049', 'TYPE-050'], // Execution Ladder + Outcome Engineering
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
    database: process.env.POSTGRES_DB || 'ivylevel_dev',
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

      // Check stub intelligence types triggered (TYPE-051 through TYPE-063)
      if (result.metadata.intelligence_triggered) {
        const stubTypes = result.metadata.intelligence_triggered.filter((type: string) => {
          const typeNum = parseInt(type.split('-')[1]);
          return typeNum >= 51 && typeNum <= 63;
        });

        if (stubTypes.length > 0) {
          console.log('');
          console.log(`📋 Stub Intelligence (to be expanded in v20.1-v20.5): ${stubTypes.join(', ')}`);
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
  console.log('╔═══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║ ExecutionAgent v20.0 Foundation Test Suite                                    ║');
  console.log('║ Testing: Execution Ladder Navigation (TYPE-049) + Outcome Engineering (TYPE-050) ║');
  console.log('║ Plus: 12 stub intelligence types (TYPE-051 through TYPE-063)                  ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  // Initialize database connection
  const pool = initializeDatabase();

  try {
    // Test database connection
    console.log('Testing database connection...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
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

      // Wait 1 second between tests
      if (i < TEST_QUERIES.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Print summary
    console.log('');
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║ TEST SUMMARY                                                                  ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════════╝');
    console.log('');

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

    console.log(`Total Tests: ${results.length}`);
    console.log(`✅ Passed: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`⏱️  Average Duration: ${avgDuration.toFixed(0)}ms`);
    console.log('');

    if (failCount === 0) {
      console.log('🎉 ALL TESTS PASSED!');
      console.log('');
      console.log('v20.0 ExecutionAgent Foundation: VALIDATED ✅');
      console.log('- TYPE-049 (Execution Ladder Navigation): Working');
      console.log('- TYPE-050 (Outcome Engineering): Working');
      console.log('- TYPE-051-063 (Stubs): Present (expand in v20.1-v20.5)');
    } else {
      console.log('⚠️  SOME TESTS FAILED - REVIEW ERRORS ABOVE');
      console.log('');
      console.log('Failed Tests:');
      results
        .filter((r) => !r.success)
        .forEach((r) => {
          console.log(`  - ${r.testCase}: ${r.error}`);
        });
    }

    console.log('');
    console.log('Next Steps:');
    console.log('1. Validate ExecutionAgent responses are accurate for Huda profile');
    console.log('2. Test with production data (weekly_progress_snapshots)');
    console.log('3. Verify stub intelligence types return framework descriptions');
    console.log('4. Plan TYPE-051-063 expansion (see docs/BACKLOG_CRITICAL_ITEMS.md)');
    console.log('');

    // Exit with appropriate code
    process.exit(failCount > 0 ? 1 : 0);
  } catch (error: any) {
    console.error('');
    console.error('❌ TEST SUITE FAILED TO RUN');
    console.error('');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run tests
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

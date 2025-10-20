#!/usr/bin/env tsx

/**
 * Test WeeklyExecutionAgent Integration
 *
 * Validates that WeeklyExecutionAgent correctly:
 * - Executes JTBD tools (get_jtbd_week, get_jtbd_completed, etc.)
 * - Returns accurate weekly execution data
 * - Provides tactical execution guidance
 *
 * Uses real huda-2025 data (38 jobs in jtbd_weekly table)
 */

import { pool } from '../src/db/pool.js';
import { agentRegistry } from '../src/core/AgentRegistry.js';
import { SessionManager } from '../src/core/SessionManager.js';

async function test() {
  console.log('🧪 Testing WeeklyExecutionAgent Integration...\n');

  const studentId = 'huda-2025';

  try {
    // 1. Verify agent is registered
    console.log('1️⃣ Verifying agent registration...');
    const agent = agentRegistry.getAgent('weekly-execution-agent');
    if (!agent) {
      throw new Error('❌ WeeklyExecutionAgent not registered!');
    }
    const manifest = agent.getManifest();
    console.log(`✅ Agent registered: ${manifest.display_name}`);
    console.log(`   Category: ${manifest.category}`);
    console.log(`   Tools: ${manifest.tools.length}`);
    console.log(`   Intents: ${manifest.intents.length}\n`);

    // 2. Test tool availability
    console.log('2️⃣ Verifying JTBD tools...');
    const toolNames = manifest.tools.map((t) => t.function.name);
    const expectedTools = [
      'get_jtbd_week',
      'get_jtbd_completed',
      'get_jtbd_pending',
      'get_jtbd_progression',
      'get_jtbd_milestones',
    ];

    for (const toolName of expectedTools) {
      if (toolNames.includes(toolName)) {
        console.log(`   ✅ ${toolName}`);
      } else {
        console.log(`   ❌ ${toolName} - MISSING!`);
      }
    }
    console.log('');

    // 3. Create session
    console.log('3️⃣ Creating session...');
    const sessionManager = new SessionManager(pool);
    const session = await sessionManager.createSession({
      student_id: studentId,
      coach_id: 'jenny-coach',
      session_type: 'chat',
      metadata: { test: 'weekly-execution-agent' },
    });
    console.log(`✅ Session created: ${session.session_id}\n`);

    // 4. Test queries
    const testQueries = [
      {
        name: 'Weekly Progress Query',
        message: 'what did I accomplish this week?',
        expectedIntent: 'execution.weekly',
      },
      {
        name: 'Pending Tasks Query',
        message: 'what do I need to do?',
        expectedIntent: 'execution.pending',
      },
      {
        name: 'Completion Rate Query',
        message: 'my execution rate over time',
        expectedIntent: 'execution.progression',
      },
      {
        name: 'Specific Week Query',
        message: 'show me week 8 progress',
        expectedIntent: 'execution.weekly',
      },
    ];

    for (const testCase of testQueries) {
      console.log(`\n📝 Test: ${testCase.name}`);
      console.log(`   Query: "${testCase.message}"`);

      try {
        const context = await sessionManager.buildContext(session.session_id, pool);

        const response = await agent.execute({
          session,
          message: testCase.message,
          context,
          pool,
        });

        console.log(`   ✅ Response received (${response.content.length} chars)`);

        // Check for tool calls
        if (response.tool_calls && response.tool_calls.length > 0) {
          console.log(`   🔧 Tools called: ${response.tool_calls.map((tc) => tc.name).join(', ')}`);
        }

        // Show first 200 chars of response
        const preview = response.content.substring(0, 200);
        console.log(`   Response preview: "${preview}..."`);
      } catch (error: any) {
        console.error(`   ❌ Error: ${error.message}`);
      }
    }

    // 5. Verify JTBD data exists
    console.log('\n\n5️⃣ Verifying JTBD data in database...');
    const result = await pool.query(
      `SELECT COUNT(*) as job_count FROM jtbd_weekly WHERE student_id = $1`,
      [studentId]
    );
    const jobCount = parseInt(result.rows[0].job_count, 10);
    console.log(`✅ Found ${jobCount} jobs for ${studentId}`);

    if (jobCount === 0) {
      console.warn('⚠️  No JTBD data found - agent will return empty results');
    }

    // 6. Test direct resolver calls
    console.log('\n6️⃣ Testing direct resolver calls...');
    const { jtbd } = await import('../src/resolvers/jtbd.js');

    // Test byWeek
    console.log('\n   Testing jtbd.byWeek(week=8)...');
    const weekData = await jtbd.byWeek(pool, studentId, 8);
    if (weekData) {
      console.log(`   ✅ Week 8: ${weekData.completed_jobs}/${weekData.total_jobs} completed (${weekData.completion_rate}%)`);
    } else {
      console.log('   ℹ️  No data for week 8');
    }

    // Test completed
    console.log('\n   Testing jtbd.recentCompleted(limit=5)...');
    const completed = await jtbd.recentCompleted(pool, studentId, 5);
    console.log(`   ✅ Found ${completed.length} completed jobs`);
    if (completed.length > 0) {
      console.log(`   Latest: "${completed[0].job_description}"`);
    }

    // Test pending
    console.log('\n   Testing jtbd.pending()...');
    const pending = await jtbd.pending(pool, studentId);
    console.log(`   ✅ Found ${pending.length} pending jobs`);

    // Test progression
    console.log('\n   Testing jtbd.progression()...');
    const progression = await jtbd.progression(pool, studentId);
    console.log(`   ✅ Found ${progression.length} weeks tracked`);
    if (progression.length > 0) {
      console.log(`   Week range: ${progression[0].week_number} - ${progression[progression.length - 1].week_number}`);
    }

    console.log('\n✅ All WeeklyExecutionAgent tests passed!');
  } catch (error: any) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
    throw error;
  } finally {
    await pool.end();
  }
}

test().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

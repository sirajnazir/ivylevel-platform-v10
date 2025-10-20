/**
 * test-multi-coach-isolation.ts
 * Tests for multi-coach RLS (Row Level Security) data isolation
 * Verifies coaches cannot access each other's data
 */

import { pool, withCoachContext } from '../src/db/pool.js';
import { sessionManager } from '../src/core/SessionManager.js';

async function testMultiCoachIsolation() {
  console.log('\n=== MULTI-COACH DATA ISOLATION TESTS ===\n');

  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // ========================================================================
    // TEST 1: Create sessions for different coaches
    // ========================================================================
    console.log('TEST 1: Create sessions for two different coaches');

    const coach1 = 'jenny-coach-1';
    const coach2 = 'alex-coach-2';
    const studentId = 'test-student-multi-coach';

    // Create session for coach 1
    const session1 = await sessionManager.createSession(studentId, 'test', coach1);
    console.log(`✓ Created session for ${coach1}: ${session1.session_id}`);

    // Create session for coach 2
    const session2 = await sessionManager.createSession(studentId, 'test', coach2);
    console.log(`✓ Created session for ${coach2}: ${session2.session_id}`);

    if (session1.coach_id === coach1 && session2.coach_id === coach2) {
      console.log('✅ TEST 1 PASSED: Sessions created with different coach_ids\n');
      testsPassed++;
    } else {
      console.log('❌ TEST 1 FAILED: coach_id not set correctly on sessions\n');
      testsFailed++;
    }

    // ========================================================================
    // TEST 2: RLS - Coach 1 can only see their own sessions
    // ========================================================================
    console.log('TEST 2: Coach 1 queries sessions (should only see their own)');

    const coach1Sessions = await withCoachContext(coach1, async (client) => {
      // Debug: Check what coach_id is actually set to
      const settingCheck = await client.query("SELECT current_setting('app.coach_id', true) as coach_setting");
      console.log(`  DEBUG: current_setting = '${settingCheck.rows[0].coach_setting}'`);

      const result = await client.query(
        'SELECT session_id, coach_id FROM agent_conversation_sessions WHERE student_id = $1',
        [studentId]
      );
      return result.rows;
    });

    console.log(`✓ Coach 1 sees ${coach1Sessions.length} session(s)`);
    console.log(`  Sessions: ${coach1Sessions.map((s) => s.session_id).join(', ')}`);

    if (
      coach1Sessions.length >= 1 &&
      coach1Sessions.every((s) => s.coach_id === coach1) &&
      !coach1Sessions.some((s) => s.session_id === session2.session_id)
    ) {
      console.log('✅ TEST 2 PASSED: Coach 1 only sees their own sessions\n');
      testsPassed++;
    } else {
      console.log('❌ TEST 2 FAILED: Coach 1 can see other coaches\' sessions\n');
      testsFailed++;
    }

    // ========================================================================
    // TEST 3: RLS - Coach 2 can only see their own sessions
    // ========================================================================
    console.log('TEST 3: Coach 2 queries sessions (should only see their own)');

    const coach2Sessions = await withCoachContext(coach2, async (client) => {
      const result = await client.query(
        'SELECT session_id, coach_id FROM agent_conversation_sessions WHERE student_id = $1',
        [studentId]
      );
      return result.rows;
    });

    console.log(`✓ Coach 2 sees ${coach2Sessions.length} session(s)`);
    console.log(`  Sessions: ${coach2Sessions.map((s) => s.session_id).join(', ')}`);

    if (
      coach2Sessions.length >= 1 &&
      coach2Sessions.every((s) => s.coach_id === coach2) &&
      !coach2Sessions.some((s) => s.session_id === session1.session_id)
    ) {
      console.log('✅ TEST 3 PASSED: Coach 2 only sees their own sessions\n');
      testsPassed++;
    } else {
      console.log('❌ TEST 3 FAILED: Coach 2 can see other coaches\' sessions\n');
      testsFailed++;
    }

    // ========================================================================
    // TEST 4: RLS - Without coach context, no sessions visible
    // ========================================================================
    console.log('TEST 4: Query sessions without setting coach_id (should see nothing)');

    const noCoachSessions = await pool.query(
      'SELECT session_id, coach_id FROM agent_conversation_sessions WHERE student_id = $1',
      [studentId]
    );

    console.log(`✓ Without coach context: ${noCoachSessions.rows.length} session(s) visible`);

    if (noCoachSessions.rows.length === 0) {
      console.log('✅ TEST 4 PASSED: RLS blocks all access without coach_id\n');
      testsPassed++;
    } else {
      console.log('❌ TEST 4 FAILED: Sessions visible without coach_id (RLS not working)\n');
      testsFailed++;
    }

    // ========================================================================
    // TEST 5: Coach 1 cannot insert sessions for Coach 2
    // ========================================================================
    console.log('TEST 5: Coach 1 tries to insert session for Coach 2 (should fail)');

    try {
      await withCoachContext(coach1, async (client) => {
        await client.query(
          `INSERT INTO agent_conversation_sessions
           (session_id, student_id, student_context, coach_id, resolution_status, started_at, last_active_at)
           VALUES ($1, $2, $3, $4, 'active', NOW(), NOW())`,
          ['sess_test_malicious', studentId, '{}', coach2]
        );
      });
      console.log('❌ TEST 5 FAILED: Coach 1 successfully inserted session for Coach 2 (RLS bypass!)\n');
      testsFailed++;
    } catch (error: any) {
      if (error.message.includes('new row violates row-level security policy')) {
        console.log('✅ TEST 5 PASSED: RLS blocked Coach 1 from inserting Coach 2 session\n');
        testsPassed++;
      } else {
        console.log(`❌ TEST 5 FAILED: Unexpected error: ${error.message}\n`);
        testsFailed++;
      }
    }

    // ========================================================================
    // TEST 6: Coach 1 cannot update Coach 2's sessions
    // ========================================================================
    console.log('TEST 6: Coach 1 tries to update Coach 2 session (should fail)');

    try {
      const updateResult = await withCoachContext(coach1, async (client) => {
        const result = await client.query(
          `UPDATE agent_conversation_sessions
           SET resolution_status = 'resolved'
           WHERE session_id = $1`,
          [session2.session_id]
        );
        return result.rowCount;
      });

      if (updateResult === 0) {
        console.log('✅ TEST 6 PASSED: RLS prevented Coach 1 from updating Coach 2 session\n');
        testsPassed++;
      } else {
        console.log('❌ TEST 6 FAILED: Coach 1 updated Coach 2 session (RLS bypass!)\n');
        testsFailed++;
      }
    } catch (error: any) {
      console.log(`❌ TEST 6 FAILED: Unexpected error: ${error.message}\n`);
      testsFailed++;
    }

    // ========================================================================
    // TEST 7: Coach 1 cannot delete Coach 2's sessions
    // ========================================================================
    console.log('TEST 7: Coach 1 tries to delete Coach 2 session (should fail)');

    try {
      const deleteResult = await withCoachContext(coach1, async (client) => {
        const result = await client.query(
          'DELETE FROM agent_conversation_sessions WHERE session_id = $1',
          [session2.session_id]
        );
        return result.rowCount;
      });

      if (deleteResult === 0) {
        console.log('✅ TEST 7 PASSED: RLS prevented Coach 1 from deleting Coach 2 session\n');
        testsPassed++;
      } else {
        console.log('❌ TEST 7 FAILED: Coach 1 deleted Coach 2 session (RLS bypass!)\n');
        testsFailed++;
      }
    } catch (error: any) {
      console.log(`❌ TEST 7 FAILED: Unexpected error: ${error.message}\n`);
      testsFailed++;
    }

    // ========================================================================
    // CLEANUP: Delete test sessions
    // ========================================================================
    console.log('Cleaning up test sessions...');

    // Delete as coach1 (will only delete coach1 sessions)
    await withCoachContext(coach1, async (client) => {
      await client.query(
        'DELETE FROM agent_conversation_sessions WHERE student_id = $1',
        [studentId]
      );
    });

    // Delete as coach2 (will only delete coach2 sessions)
    await withCoachContext(coach2, async (client) => {
      await client.query(
        'DELETE FROM agent_conversation_sessions WHERE student_id = $1',
        [studentId]
      );
    });

    console.log('✓ Cleaned up test sessions\n');

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log('=== MULTI-COACH ISOLATION TEST SUMMARY ===');
    console.log(`Total Tests: ${testsPassed + testsFailed}`);
    console.log(`✅ Passed: ${testsPassed}`);
    console.log(`❌ Failed: ${testsFailed}`);
    console.log(`Pass Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%\n`);

    if (testsFailed === 0) {
      console.log('🎉 ALL MULTI-COACH ISOLATION TESTS PASSED!\n');
      console.log('RLS is working correctly:');
      console.log('- Coaches can only see their own sessions');
      console.log('- Coaches cannot access other coaches\' data');
      console.log('- Coaches cannot insert/update/delete other coaches\' sessions');
      console.log('- Without coach_id, no data is visible');
      console.log('\n✅ Multi-coach infrastructure is PRODUCTION-READY!\n');
    } else {
      console.log('⚠️  Some tests failed - review RLS implementation\n');
    }

    process.exit(testsFailed === 0 ? 0 : 1);
  } catch (error: any) {
    console.error('❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testMultiCoachIsolation();

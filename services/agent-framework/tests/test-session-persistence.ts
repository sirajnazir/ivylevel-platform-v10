/**
 * test-session-persistence.ts
 * Tests for PostgreSQL session persistence
 * Verifies sessions can be loaded from database
 */

import { sessionManager } from '../src/core/SessionManager.js';
import { pool } from '../src/db/pool.js';

async function testSessionPersistence() {
  console.log('\n=== SESSION PERSISTENCE TESTS ===\n');

  const studentId = 'huda-2025';
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // TEST 1: Create new session and verify it persists
    console.log('TEST 1: Create session and verify database persistence');
    const session1 = await sessionManager.createSession(studentId, 'test');
    console.log(`✓ Created session: ${session1.session_id}`);

    // Verify session exists in database
    const dbResult = await pool.query(
      'SELECT session_id, student_id, resolution_status FROM agent_conversation_sessions WHERE session_id = $1',
      [session1.session_id]
    );

    if (dbResult.rows.length === 1 && dbResult.rows[0].session_id === session1.session_id) {
      console.log('✅ TEST 1 PASSED: Session persisted to database\n');
      testsPassed++;
    } else {
      console.log('❌ TEST 1 FAILED: Session not found in database\n');
      testsFailed++;
    }

    // TEST 2: Load session from database (simulate cache miss)
    console.log('TEST 2: Load session from database after cache clear');

    // Clear in-memory cache to simulate server restart
    (sessionManager as any).sessions.clear();
    console.log('✓ Cleared in-memory cache');

    // Load session - should come from database
    const loadedSession = await sessionManager.getSession(session1.session_id);

    if (loadedSession && loadedSession.session_id === session1.session_id) {
      console.log(`✅ TEST 2 PASSED: Session loaded from database (student: ${loadedSession.student_id})\n`);
      testsPassed++;
    } else {
      console.log('❌ TEST 2 FAILED: Could not load session from database\n');
      testsFailed++;
    }

    // TEST 3: getOrCreateSession finds existing database session
    console.log('TEST 3: getOrCreateSession finds existing session in database');

    // Clear cache again (critical for this test)
    (sessionManager as any).sessions.clear();
    console.log('✓ Cleared in-memory cache again');

    // This should find the existing session in database
    const foundSession = await sessionManager.getOrCreateSession(studentId);

    if (foundSession.session_id === session1.session_id) {
      console.log(`✅ TEST 3 PASSED: Found existing session from database (${foundSession.session_id})\n`);
      testsPassed++;
    } else {
      console.log(`❌ TEST 3 FAILED: Created new session instead of finding existing (${foundSession.session_id})\n`);
      testsFailed++;
    }

    // TEST 4: Session with conversation turns loads correctly
    console.log('TEST 4: Session with conversation turns loads correctly');

    // Add a conversation turn
    await pool.query(
      `INSERT INTO agent_conversation_turns
       (turn_id, session_id, turn_number, user_message, agent_response, agent_name, agent_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        'turn_test_' + Date.now(),
        session1.session_id,
        1,
        'What are my chances at MIT?',
        JSON.stringify({ answer: 'Let me check your profile...', chips: [] }),
        'Jenny - College Advisor',
        'college-agent',
      ]
    );
    console.log('✓ Added conversation turn to database');

    // Clear cache and reload
    (sessionManager as any).sessions.clear();
    const sessionWithTurns = await sessionManager.getSession(session1.session_id);

    if (
      sessionWithTurns &&
      sessionWithTurns.turn_count === 1 &&
      sessionWithTurns.messages.length === 1 &&
      sessionWithTurns.messages[0].content === 'What are my chances at MIT?'
    ) {
      console.log(`✅ TEST 4 PASSED: Session loaded with conversation history (${sessionWithTurns.turn_count} turns)\n`);
      testsPassed++;
    } else {
      console.log(
        `❌ TEST 4 FAILED: Session conversation history not loaded correctly (turns: ${sessionWithTurns?.turn_count})\n`
      );
      testsFailed++;
    }

    // TEST 5: Non-existent session returns null
    console.log('TEST 5: Non-existent session returns null');

    const nonExistent = await sessionManager.getSession('sess_nonexistent_123');

    if (nonExistent === null) {
      console.log('✅ TEST 5 PASSED: Non-existent session returns null\n');
      testsPassed++;
    } else {
      console.log('❌ TEST 5 FAILED: Non-existent session did not return null\n');
      testsFailed++;
    }

    // CLEANUP: Delete test session
    await pool.query('DELETE FROM agent_conversation_turns WHERE session_id = $1', [
      session1.session_id,
    ]);
    await pool.query('DELETE FROM agent_conversation_sessions WHERE session_id = $1', [
      session1.session_id,
    ]);
    console.log(`✓ Cleaned up test session: ${session1.session_id}\n`);

    // SUMMARY
    console.log('=== SESSION PERSISTENCE TEST SUMMARY ===');
    console.log(`Total Tests: ${testsPassed + testsFailed}`);
    console.log(`✅ Passed: ${testsPassed}`);
    console.log(`❌ Failed: ${testsFailed}`);
    console.log(`Pass Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%\n`);

    if (testsFailed === 0) {
      console.log('🎉 ALL SESSION PERSISTENCE TESTS PASSED!\n');
      console.log('Session persistence is working correctly:');
      console.log('- Sessions persist to PostgreSQL');
      console.log('- Sessions can be loaded from database after cache miss');
      console.log('- Conversation history is preserved');
      console.log('- getOrCreateSession finds existing sessions in database');
      console.log('\n✅ Ready to proceed with Multi-Coach Infrastructure (RLS)\n');
    } else {
      console.log('⚠️  Some tests failed - review implementation\n');
    }

    process.exit(testsFailed === 0 ? 0 : 1);
  } catch (error: any) {
    console.error('❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testSessionPersistence();

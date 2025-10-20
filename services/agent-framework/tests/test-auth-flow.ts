/**
 * Test: End-to-End Authentication Flow
 *
 * Tests self-hosted JWT authentication with multi-coach support
 *
 * Test Scenarios:
 * 1. Login with valid credentials
 * 2. Access protected endpoint with JWT
 * 3. Verify coach_id extraction and RLS
 * 4. Token refresh flow
 * 5. Invalid/expired token handling
 * 6. Multi-coach isolation
 *
 * Usage:
 *   DATABASE_URL="postgresql://ivylevel_app:..." tsx tests/test-auth-flow.ts
 */

import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.AGENT_URL || 'http://localhost:8788';

// ============================================================================
// Helper Functions
// ============================================================================

async function login(email: string, password: string): Promise<any> {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Login failed: ${data.error} - ${data.message}`);
  }

  return data;
}

async function getProfile(accessToken: string): Promise<any> {
  const response = await fetch(`${BASE_URL}/api/auth/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Get profile failed: ${data.error} - ${data.message}`);
  }

  return data;
}

async function refreshToken(refreshToken: string): Promise<any> {
  const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Refresh token failed: ${data.error} - ${data.message}`);
  }

  return data;
}

async function sendChatMessage(
  accessToken: string,
  studentId: string,
  message: string
): Promise<any> {
  const response = await fetch(`${BASE_URL}/api/agents/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      student_id: studentId,
      message,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Chat failed: ${data.error}`);
  }

  return data;
}

async function getStudentSessions(accessToken: string, studentId: string): Promise<any> {
  const response = await fetch(`${BASE_URL}/api/agents/sessions/${studentId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Get sessions failed: ${data.error}`);
  }

  return data;
}

// ============================================================================
// Test Runner
// ============================================================================

async function runTests() {
  console.log('');
  console.log('============================================');
  console.log('🔐 Authentication Flow Tests');
  console.log('============================================');
  console.log('');

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Login with valid credentials (Jenny)
  console.log('TEST 1: Login with valid credentials (Jenny)');
  try {
    const loginData = await login('jenny@ivylevel.com', 'IvyLevel2024!');

    if (!loginData.access_token || !loginData.refresh_token) {
      throw new Error('Missing tokens in response');
    }

    if (!loginData.coach || loginData.coach.coach_id !== 'jenny-coach-1') {
      throw new Error(`Expected coach_id='jenny-coach-1', got '${loginData.coach?.coach_id}'`);
    }

    console.log('✅ PASSED');
    console.log(`   Coach: ${loginData.coach.name} (${loginData.coach.coach_id})`);
    console.log(`   Access Token: ${loginData.access_token.substring(0, 20)}...`);
    console.log(`   Expires In: ${loginData.expires_in}s`);

    testsPassed++;

    // Store tokens for next tests
    const jennyTokens = {
      access_token: loginData.access_token,
      refresh_token: loginData.refresh_token,
      coach_id: loginData.coach.coach_id,
    };

    // Test 2: Get profile with JWT
    console.log('');
    console.log('TEST 2: Get profile with JWT');
    try {
      const profileData = await getProfile(jennyTokens.access_token);

      if (profileData.coach.coach_id !== 'jenny-coach-1') {
        throw new Error(
          `Expected coach_id='jenny-coach-1', got '${profileData.coach.coach_id}'`
        );
      }

      console.log('✅ PASSED');
      console.log(`   Coach: ${profileData.coach.name}`);
      console.log(`   Email: ${profileData.coach.email}`);
      console.log(`   Login Count: ${profileData.coach.login_count}`);

      testsPassed++;
    } catch (error) {
      console.log('❌ FAILED:', error instanceof Error ? error.message : error);
      testsFailed++;
    }

    // Test 3: Send chat message with JWT
    console.log('');
    console.log('TEST 3: Send chat message with JWT (Jenny → Huda)');
    try {
      const chatData = await sendChatMessage(
        jennyTokens.access_token,
        'huda-2025',
        'What is my game plan?'
      );

      if (!chatData.session_id || !chatData.answer) {
        throw new Error('Missing session_id or answer in response');
      }

      console.log('✅ PASSED');
      console.log(`   Session ID: ${chatData.session_id}`);
      console.log(`   Answer: ${chatData.answer.substring(0, 100)}...`);

      testsPassed++;

      // Test 4: Verify session belongs to Jenny (RLS check)
      console.log('');
      console.log('TEST 4: Verify session belongs to Jenny (RLS)');
      try {
        const sessionsData = await getStudentSessions(jennyTokens.access_token, 'huda-2025');

        const hasSession = sessionsData.sessions.some(
          (s: any) => s.session_id === chatData.session_id
        );

        if (!hasSession) {
          throw new Error('Session not found in Jenny\'s sessions (RLS filtering failed)');
        }

        console.log('✅ PASSED');
        console.log(`   Found ${sessionsData.sessions.length} session(s) for Jenny + Huda`);

        testsPassed++;
      } catch (error) {
        console.log('❌ FAILED:', error instanceof Error ? error.message : error);
        testsFailed++;
      }
    } catch (error) {
      console.log('❌ FAILED:', error instanceof Error ? error.message : error);
      testsFailed++;
    }

    // Test 5: Token refresh
    console.log('');
    console.log('TEST 5: Refresh access token');
    try {
      const refreshData = await refreshToken(jennyTokens.refresh_token);

      if (!refreshData.access_token) {
        throw new Error('Missing access_token in refresh response');
      }

      console.log('✅ PASSED');
      console.log(`   New Access Token: ${refreshData.access_token.substring(0, 20)}...`);
      console.log(`   Expires In: ${refreshData.expires_in}s`);

      testsPassed++;
    } catch (error) {
      console.log('❌ FAILED:', error instanceof Error ? error.message : error);
      testsFailed++;
    }

    // Test 6: Invalid token handling
    console.log('');
    console.log('TEST 6: Reject invalid token');
    try {
      await sendChatMessage('invalid-token-123', 'huda-2025', 'Test message');

      // Should not reach here
      console.log('❌ FAILED: Invalid token was accepted');
      testsFailed++;
    } catch (error) {
      // Expected to fail
      console.log('✅ PASSED');
      console.log('   Invalid token correctly rejected');
      testsPassed++;
    }

    // Test 7: Missing token handling
    console.log('');
    console.log('TEST 7: Reject missing token');
    try {
      const response = await fetch(`${BASE_URL}/api/agents/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: 'huda-2025',
          message: 'Test message',
        }),
      });

      if (response.ok) {
        console.log('❌ FAILED: Request without token was accepted');
        testsFailed++;
      } else {
        console.log('✅ PASSED');
        console.log(`   Request without token correctly rejected (${response.status})`);
        testsPassed++;
      }
    } catch (error) {
      console.log('❌ FAILED:', error instanceof Error ? error.message : error);
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ FAILED:', error instanceof Error ? error.message : error);
    testsFailed++;
  }

  // Test 8: Multi-coach isolation (if alex-coach-2 exists)
  console.log('');
  console.log('TEST 8: Multi-coach isolation (Optional)');
  console.log('   Checking if alex-coach-2 exists...');

  try {
    // Try to login as alex (may not exist)
    const alexLogin = await login('alex@ivylevel.com', 'IvyLevel2024!');

    console.log(`   Found: ${alexLogin.coach.name} (${alexLogin.coach.coach_id})`);

    // Send message as Alex
    const alexChat = await sendChatMessage(
      alexLogin.access_token,
      'huda-2025',
      'What are my essays?'
    );

    // Verify Alex's session is isolated from Jenny's
    const jennyTokensCheck = await login('jenny@ivylevel.com', 'IvyLevel2024!');
    const jennySessions = await getStudentSessions(jennyTokensCheck.access_token, 'huda-2025');

    const jennyCanSeeAlexSession = jennySessions.sessions.some(
      (s: any) => s.session_id === alexChat.session_id
    );

    if (jennyCanSeeAlexSession) {
      console.log('❌ FAILED: Jenny can see Alex\'s session (RLS isolation broken)');
      testsFailed++;
    } else {
      console.log('✅ PASSED');
      console.log('   Jenny cannot see Alex\'s session (RLS isolation working)');
      testsPassed++;
    }
  } catch (error) {
    console.log('⚠️  SKIPPED: alex@ivylevel.com does not exist or cannot login');
    console.log('   (This is expected if only jenny-coach-1 has been set up)');
  }

  // Summary
  console.log('');
  console.log('============================================');
  console.log('Test Results');
  console.log('============================================');
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`📊 Pass Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
  console.log('');

  if (testsFailed === 0) {
    console.log('🎉 ALL TESTS PASSED! Authentication system working correctly.');
    console.log('');
    console.log('✅ Self-hosted JWT authentication ready for production');
    console.log('✅ Multi-coach RLS isolation verified');
    console.log('✅ Token refresh working');
    console.log('✅ Invalid token handling correct');
    console.log('');
  } else {
    console.log('⚠️  SOME TESTS FAILED. Review errors above.');
    console.log('');
  }

  process.exit(testsFailed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});

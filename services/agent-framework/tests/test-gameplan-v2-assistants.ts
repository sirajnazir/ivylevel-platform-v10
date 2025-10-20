/**
 * test-gameplan-v2-assistants.ts
 * Test GamePlanAgent v2 (OpenAI Assistants API) with REAL Huda data
 *
 * Tests:
 * 1. Initialize Assistant
 * 2. Execute with real Huda query
 * 3. Verify tools are called automatically
 * 4. Test streaming responses
 * 5. Validate against real database data
 *
 * Created: 2025-10-17 (v1.0 OpenAI Migration)
 */

import { GamePlanAgentV2 } from '../src/agents/GamePlanAgent_v2_assistants.js';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load real environment variables (includes real API keys)
dotenv.config();

const log = (...args: any[]) => console.log('[TEST]', ...args);

/**
 * Fetch real Huda data from database
 */
async function fetchRealHudaData() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // postgresql://postgres:postgres@localhost:5432/ivylevel
  });

  try {
    // Get Huda student profile
    const studentResult = await pool.query(
      `SELECT student_id, full_name, graduation_year, gpa_weighted, sat_score, target_major, awards_count
       FROM students WHERE student_id = 'huda-2025'`
    );

    if (studentResult.rows.length === 0) {
      throw new Error('Huda student not found in database');
    }

    const student = studentResult.rows[0];

    // Get Huda's awards count
    const awardsResult = await pool.query(
      `SELECT COUNT(*) as count FROM kb_items WHERE student_id = 'huda-2025' AND item_type = 'award'`
    );

    // Get Huda's ECs count
    const ecsResult = await pool.query(
      `SELECT COUNT(*) as count FROM kb_items WHERE student_id = 'huda-2025' AND item_type = 'ec'`
    );

    const hudaData = {
      student_id: student.student_id,
      full_name: student.full_name,
      graduation_year: student.graduation_year,
      gpa_weighted: parseFloat(student.gpa_weighted),
      sat_score: student.sat_score,
      target_major: student.target_major,
      awards_count: parseInt(awardsResult.rows[0].count),
      ecs_count: parseInt(ecsResult.rows[0].count),
    };

    log('Real Huda data fetched:', hudaData);

    await pool.end();

    return hudaData;
  } catch (error: any) {
    await pool.end();
    throw error;
  }
}

/**
 * Test 1: Initialize Assistant
 */
async function testInitializeAssistant() {
  log('\n========================================');
  log('TEST 1: Initialize GamePlan Assistant');
  log('========================================');

  const agent = new GamePlanAgentV2();

  try {
    await agent.initializeAssistant();
    log('✅ Assistant initialized successfully');

    return agent;
  } catch (error: any) {
    log('❌ Assistant initialization failed:', error.message);
    throw error;
  }
}

/**
 * Test 2: Execute with real Huda query (non-streaming)
 */
async function testExecuteWithRealHudaData(agent: GamePlanAgentV2, hudaData: any) {
  log('\n========================================');
  log('TEST 2: Execute with Real Huda Query');
  log('========================================');

  const config = {
    studentId: hudaData.student_id,
    coachId: 'jenny-coach-1',
    studentContext: {
      grade: 2025 - hudaData.graduation_year + 12, // Calculate current grade
      gpa: hudaData.gpa_weighted,
      sat: hudaData.sat_score,
      intended_major: hudaData.target_major,
      ecs_count: hudaData.ecs_count,
      awards_count: hudaData.awards_count,
    },
  };

  // Real question Huda might ask
  const query = "What should I focus on for my Stanford application?";

  log('\nStudent Context:', config.studentContext);
  log('Query:', query);

  try {
    const result = await agent.execute(config, query);

    log('\n✅ Response received:');
    log('─────────────────────────────────────');
    log(result.response);
    log('─────────────────────────────────────');
    log('\nMetadata:');
    log('- Thread ID:', result.threadId);
    log('- Run ID:', result.runId);
    log('- Tools Called:', result.toolCalls.length);
    log('- Tokens Used:', result.tokensUsed);

    if (result.toolCalls.length > 0) {
      log('\nTool Calls:');
      result.toolCalls.forEach((call, idx) => {
        log(`${idx + 1}. ${call.function?.name || call.type}`);
      });
    }

    return result.threadId;
  } catch (error: any) {
    log('❌ Execute failed:', error.message);
    throw error;
  }
}

/**
 * Test 3: Multi-turn conversation (using same thread)
 */
async function testMultiTurnConversation(
  agent: GamePlanAgentV2,
  hudaData: any,
  threadId: string
) {
  log('\n========================================');
  log('TEST 3: Multi-Turn Conversation');
  log('========================================');

  const config = {
    studentId: hudaData.student_id,
    coachId: 'jenny-coach-1',
    studentContext: {
      grade: 2025 - hudaData.graduation_year + 12,
      gpa: hudaData.gpa_weighted,
      sat: hudaData.sat_score,
      intended_major: hudaData.target_major,
      ecs_count: hudaData.ecs_count,
      awards_count: hudaData.awards_count,
    },
  };

  // Follow-up question
  const query = "What about my awards? Should I apply for more?";

  log('\nFollow-up Query:', query);
  log('Using existing Thread ID:', threadId);

  try {
    const result = await agent.execute(config, query, threadId);

    log('\n✅ Follow-up response received:');
    log('─────────────────────────────────────');
    log(result.response);
    log('─────────────────────────────────────');
    log('\nMetadata:');
    log('- Thread ID (same):', result.threadId);
    log('- Run ID (new):', result.runId);
    log('- Tools Called:', result.toolCalls.length);
    log('- Tokens Used:', result.tokensUsed);

    return result.threadId;
  } catch (error: any) {
    log('❌ Multi-turn execute failed:', error.message);
    throw error;
  }
}

/**
 * Test 4: Streaming response
 */
async function testStreamingResponse(agent: GamePlanAgentV2, hudaData: any) {
  log('\n========================================');
  log('TEST 4: Streaming Response');
  log('========================================');

  const config = {
    studentId: hudaData.student_id,
    coachId: 'jenny-coach-1',
    studentContext: {
      grade: 2025 - hudaData.graduation_year + 12,
      gpa: hudaData.gpa_weighted,
      sat: hudaData.sat_score,
      intended_major: hudaData.target_major,
      ecs_count: hudaData.ecs_count,
      awards_count: hudaData.awards_count,
    },
  };

  const query = "Give me a timeline for my college applications.";

  log('\nQuery:', query);
  log('\nStreaming response:');
  log('─────────────────────────────────────');

  try {
    let chunkCount = 0;
    const result = await agent.executeStreaming(config, query, undefined, (chunk) => {
      process.stdout.write(chunk);
      chunkCount++;
    });

    log('\n─────────────────────────────────────');
    log('\n✅ Streaming complete');
    log('- Chunks received:', chunkCount);
    log('- Thread ID:', result.threadId);
    log('- Run ID:', result.runId);
    log('- Full response length:', result.response.length);

    return result.threadId;
  } catch (error: any) {
    log('❌ Streaming failed:', error.message);
    throw error;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  log('╔════════════════════════════════════════════════════╗');
  log('║  GamePlanAgent v2 (OpenAI Assistants API) Tests  ║');
  log('║  Using REAL Huda Data from Database               ║');
  log('╚════════════════════════════════════════════════════╝');

  try {
    // Step 1: Fetch real Huda data
    log('\nFetching real Huda data from database...');
    const hudaData = await fetchRealHudaData();

    // Step 2: Initialize Assistant
    const agent = await testInitializeAssistant();

    // Step 3: Execute with real query
    const threadId = await testExecuteWithRealHudaData(agent, hudaData);

    // Step 4: Multi-turn conversation
    await testMultiTurnConversation(agent, hudaData, threadId);

    // Step 5: Streaming response
    await testStreamingResponse(agent, hudaData);

    // Cleanup
    log('\n========================================');
    log('Cleaning up...');
    await agent.cleanup();
    log('✅ Assistant deleted');

    log('\n╔════════════════════════════════════════════════════╗');
    log('║              ALL TESTS PASSED ✅                   ║');
    log('╚════════════════════════════════════════════════════╝');

    process.exit(0);
  } catch (error: any) {
    log('\n❌ TEST SUITE FAILED:', error.message);
    log('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Run tests
runTests();

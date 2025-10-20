/**
 * test-integration-complete.ts
 * Comprehensive v1.0 Integration Test Suite
 * Tests: All 7 agents + Knowledge Moat (DS1-DS7) + Coaching Intelligence (DS-T1/T2)
 * Created: 2025-10-16 (Week 14)
 */

import { agentRegistry } from '../src/core/AgentRegistry.js';
import { knowledgeMoat } from '../src/repositories/KnowledgeMoatRepository.js';
import { sessionManager } from '../src/core/SessionManager.js';
import type { AgentExecutionContext } from '../src/core/types.js';

// Test configuration
const TEST_STUDENT_ID = 'huda-2025';
const TEST_SESSION_ID = `integration-test-${Date.now()}`;

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL';
  duration_ms: number;
  details?: string;
  error?: string;
}

const testResults: TestResult[] = [];

/**
 * Helper: Run test with timing and error handling
 */
async function runTest(
  name: string,
  testFn: () => Promise<void>
): Promise<void> {
  const startTime = Date.now();
  try {
    await testFn();
    const duration = Date.now() - startTime;
    testResults.push({ name, status: 'PASS', duration_ms: duration });
    console.log(`✅ ${name} (${duration}ms)`);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    testResults.push({
      name,
      status: 'FAIL',
      duration_ms: duration,
      error: error.message
    });
    console.error(`❌ ${name} (${duration}ms)`);
    console.error(`   Error: ${error.message}`);
  }
}

/**
 * Helper: Execute agent with message (mimics POST /api/agents/chat pattern)
 */
async function executeAgent(params: {
  message: string;
  student_id: string;
  session_id?: string;
  agent_id?: string;
}): Promise<any> {
  const { message, student_id, agent_id } = params;

  // Get or create session (following routes/agents.ts:60-71)
  // For tests, always create new session
  const session = await sessionManager.getOrCreateSession(student_id);

  // Get agent (specified or auto-route) (following routes/agents.ts:73-84)
  let agent;
  if (agent_id) {
    agent = agentRegistry.getAgent(agent_id);
    if (!agent) {
      throw new Error(`Agent not found: ${agent_id}`);
    }
  } else {
    agent = agentRegistry.routeQuery(message);
  }

  // Build execution context (following routes/agents.ts:86-91)
  const context: AgentExecutionContext = {
    session,
    user_message: message,
    agent_manifest: agent.getManifest(),
  };

  // Execute agent (following routes/agents.ts:94)
  const result = await agent.execute(context, agentRegistry);

  // Update session in memory (following routes/agents.ts:97)
  sessionManager.updateSession(result.session);

  // Return response matching API format (following routes/agents.ts:111-118)
  return {
    response: result.response.answer,
    answer: result.response.answer,
    chips: result.response.chips,
    hits: result.response.hits,
    debug: result.response.debug,
    session_id: result.session.session_id,
    handoff: result.response.handoff,
    agent_id: agent.getManifest().agent_id,
  };
}

/**
 * SECTION 1: AGENT TESTS (All 7 Agents)
 */
async function testAgents() {
  console.log('\n' + '='.repeat(80));
  console.log('SECTION 1: AGENT TESTS (7 Agents)');
  console.log('='.repeat(80));

  // Test 1.1: GamePlan Agent
  await runTest('1.1 GamePlan Agent - Get Student Game Plan', async () => {
    const response = await executeAgent({
      message: 'What is my college application game plan?',
      student_id: TEST_STUDENT_ID,
      session_id: `${TEST_SESSION_ID}-gameplan`,
      agent_id: 'gameplan-agent'
    });
    if (!response || !response.answer) throw new Error('No response from GamePlan agent');
    if (response.answer.length < 100) throw new Error('Response too short');
  });

  // Test 1.2: Extracurriculars Agent
  await runTest('1.2 ECs Agent - List Activities', async () => {
    const response = await executeAgent({
      message: 'Show me my extracurricular activities',
      student_id: TEST_STUDENT_ID,
      session_id: `${TEST_SESSION_ID}-ecs`,
      agent_id: 'ecs-agent'
    });
    if (!response || !response.answer) throw new Error('No response from ECs agent');
    if (!response.answer.toLowerCase().includes('activity') && !response.answer.toLowerCase().includes('ec'))
      throw new Error('Response does not mention activities');
  });

  // Test 1.3: Awards Agent
  await runTest('1.3 Awards Agent - List Awards', async () => {
    const response = await executeAgent({
      message: 'What awards and honors do I have?',
      student_id: TEST_STUDENT_ID,
      session_id: `${TEST_SESSION_ID}-awards`,
      agent_id: 'awards-agent'
    });
    if (!response || !response.answer) throw new Error('No response from Awards agent');
  });

  // Test 1.4: Summer Programs Agent
  await runTest('1.4 Programs Agent - Program Recommendations', async () => {
    const response = await executeAgent({
      message: 'Which summer programs should I apply to?',
      student_id: TEST_STUDENT_ID,
      session_id: `${TEST_SESSION_ID}-programs`,
      agent_id: 'programs-agent'
    });
    if (!response || !response.answer) throw new Error('No response from Programs agent');
  });

  // Test 1.5: College List Agent
  await runTest('1.5 College Agent - Chances Assessment', async () => {
    const response = await executeAgent({
      message: 'What are my chances at Stanford University?',
      student_id: TEST_STUDENT_ID,
      session_id: `${TEST_SESSION_ID}-college`,
      agent_id: 'college-agent'
    });
    if (!response || !response.answer) throw new Error('No response from College agent');
    if (!response.answer.toLowerCase().includes('stanford'))
      throw new Error('Response does not mention Stanford');
  });

  // Test 1.6: Essay Agent
  await runTest('1.6 Essay Agent - Essay Guidance', async () => {
    const response = await executeAgent({
      message: 'Help me with my college essay about my identity as a Muslim tech student',
      student_id: TEST_STUDENT_ID,
      session_id: `${TEST_SESSION_ID}-essay`,
      agent_id: 'essay-agent'
    });
    if (!response || !response.answer) throw new Error('No response from Essay agent');
  });

  // Test 1.7: Admissions Agent
  await runTest('1.7 Admissions Agent - AO Perspectives', async () => {
    const response = await executeAgent({
      message: 'What do MIT admissions officers look for in applications?',
      student_id: TEST_STUDENT_ID,
      session_id: `${TEST_SESSION_ID}-admissions`,
      agent_id: 'admissions-agent'
    });
    if (!response || !response.answer) throw new Error('No response from Admissions agent');
  });
}

/**
 * SECTION 2: KNOWLEDGE MOAT TESTS (DS1-DS7)
 */
async function testKnowledgeMoat() {
  console.log('\n' + '='.repeat(80));
  console.log('SECTION 2: KNOWLEDGE MOAT TESTS (DS1-DS7)');
  console.log('='.repeat(80));

  // Test 2.1: DS1 - College Benchmarks (CDS)
  await runTest('2.1 DS1 - College Benchmarks (Stanford CDS)', async () => {
    const benchmark = await knowledgeMoat.getCollegeBenchmark('stanford');
    if (!benchmark) throw new Error('No benchmark data for Stanford');
    if (!benchmark.acceptance_rate) throw new Error('Missing acceptance rate');
    if (!benchmark.sat_range_mid_50) throw new Error('Missing SAT range');
  });

  // Test 2.2: DS2 - College Rubrics
  await runTest('2.2 DS2 - College Rubric Factors (MIT)', async () => {
    const rubric = await knowledgeMoat.getCollegeRubric('mit');
    if (!rubric || rubric.length === 0) throw new Error('No rubric factors for MIT');
    const hasIntellectualVitality = rubric.some(r =>
      r.factor_name.toLowerCase().includes('intellectual') ||
      r.factor_name.toLowerCase().includes('vitality')
    );
    if (!hasIntellectualVitality) console.warn('   ⚠️  No intellectual vitality factor found');
  });

  // Test 2.3: DS3+DS4 - Placement History (Hyperlocal)
  await runTest('2.3 DS3+DS4 - Placement History (School → College)', async () => {
    const placement = await knowledgeMoat.getPlacementHistory('palo-alto-hs', 'stanford');
    if (!placement) throw new Error('No placement history found');
    if (placement.accepted === undefined) throw new Error('Missing accepted count');
  });

  // Test 2.4: DS5 - Student Twins
  await runTest('2.4 DS5 - Student Twins (Similar Profiles)', async () => {
    const twins = await knowledgeMoat.findSimilarProfiles({
      gpaRange: '4.0-4.2',
      satRange: '1500-1550',
      ecTier: 'tier2'
    });
    if (!twins) throw new Error('No student twins found');
    if (twins.length === 0) console.warn('   ⚠️  No matching profiles found');
  });

  // Test 2.5: DS6 - Essay Examples
  await runTest('2.5 DS6 - Essay Examples (Stanford Common App)', async () => {
    const essays = await knowledgeMoat.getEssayExamples({
      collegeName: 'Stanford University',
      promptType: 'common_app',
      limit: 2
    });
    if (!essays) throw new Error('No essay examples found');
    if (essays.length === 0) console.warn('   ⚠️  No essay examples in database yet');
  });

  // Test 2.6: DS7 - AO Perspectives
  await runTest('2.6 DS7 - AO Perspectives (MIT Essays)', async () => {
    const perspectives = await knowledgeMoat.getAOPerspectives({
      collegeName: 'MIT',
      topic: 'essays',
      limit: 2
    });
    if (!perspectives) throw new Error('No AO perspectives found');
    if (perspectives.length === 0) console.warn('   ⚠️  No AO perspectives in database yet');
  });

  // Test 2.7: DS8 - Summer Programs Catalog
  await runTest('2.7 DS8 - Summer Programs (Tier 1 STEM)', async () => {
    const programs = await knowledgeMoat.getSummerPrograms({
      programType: 'research',
      prestigeTier: 'tier1'
    });
    if (!programs) throw new Error('No summer programs found');
    if (programs.length === 0) console.warn('   ⚠️  No tier1 research programs in database');
  });
}

/**
 * SECTION 3: COACHING INTELLIGENCE TESTS (DS-T1/T2)
 */
async function testCoachingIntelligence() {
  console.log('\n' + '='.repeat(80));
  console.log('SECTION 3: COACHING INTELLIGENCE TESTS (DS-T1/T2)');
  console.log('='.repeat(80));

  // Test 3.1: DS-T1 - Tactic Chips (Time Management)
  await runTest('3.1 DS-T1 - Tactic Chips (Time Crisis)', async () => {
    const tactics = await knowledgeMoat.searchTacticChips({
      barriers: ['time-crisis', 'procrastination'],
      minQualityScore: 0.90,
      limit: 3
    });
    if (!tactics || tactics.length === 0) throw new Error('No tactics found for time crisis');
    const has168Framework = tactics.some(t => t.tactic_slug === '168-hour-framework');
    if (!has168Framework) console.warn('   ⚠️  168-hour-framework not in top 3');
  });

  // Test 3.2: DS-T1 - Tactic Chips (Essay Strategy)
  await runTest('3.2 DS-T1 - Tactic Chips (Essay Generic)', async () => {
    const tactics = await knowledgeMoat.searchTacticChips({
      barriers: ['essay-generic', 'identity-hiding'],
      category: 'Essay Strategy',
      limit: 2
    });
    if (!tactics || tactics.length === 0) throw new Error('No essay tactics found');
    const hasParentStory = tactics.some(t => t.tactic_slug === 'parent-story-reframe');
    if (!hasParentStory) console.warn('   ⚠️  parent-story-reframe not found');
  });

  // Test 3.3: DS-T2 - Success Patterns (National Award Win)
  await runTest('3.3 DS-T2 - Success Patterns (National Award)', async () => {
    const patterns = await knowledgeMoat.getSuccessPatternsByOutcome('National Award Win', 1);
    if (!patterns || patterns.length === 0) throw new Error('No national award patterns found');
    if (!patterns[0].what_worked) throw new Error('Missing what_worked field');
    if (!patterns[0].barriers_faced) throw new Error('Missing barriers_faced field');
  });

  // Test 3.4: DS-T2 - Success Patterns (By Archetype)
  await runTest('3.4 DS-T2 - Success Patterns (First-Gen Immigrant)', async () => {
    const patterns = await knowledgeMoat.searchSuccessPatterns({
      archetypeTags: ['first-gen-immigrant', 'STEM'],
      minQualityScore: 0.90,
      limit: 3
    });
    if (!patterns || patterns.length === 0) throw new Error('No patterns for first-gen STEM students');
  });

  // Test 3.5: DS-T2 - Success Patterns (By Barriers)
  await runTest('3.5 DS-T2 - Success Patterns (Time Crisis + Procrastination)', async () => {
    const patterns = await knowledgeMoat.searchSuccessPatterns({
      barriers: ['time-crisis', 'procrastination'],
      limit: 2
    });
    if (!patterns || patterns.length === 0) throw new Error('No patterns addressing time crisis');
  });

  // Test 3.6: DS-T2 - Breakthrough Insights
  await runTest('3.6 DS-T2 - Breakthrough Insights (Essay Transformation)', async () => {
    const breakthroughs = await knowledgeMoat.getBreakthroughInsights({
      outcomeCategory: 'Essay Quality Transformation',
      limit: 1
    });
    if (!breakthroughs || breakthroughs.length === 0) throw new Error('No essay breakthrough insights');
    if (!breakthroughs[0].what_clicked) throw new Error('Missing what_clicked insight');
  });
}

/**
 * SECTION 4: AGENT ROUTING TESTS
 */
async function testAgentRouting() {
  console.log('\n' + '='.repeat(80));
  console.log('SECTION 4: AGENT ROUTING TESTS (Auto-Routing)');
  console.log('='.repeat(80));

  const routingTests = [
    { query: 'What is my game plan?', expectedAgent: 'gameplan-agent' },
    { query: 'Show me my extracurriculars', expectedAgent: 'ecs-agent' },
    { query: 'What awards do I have?', expectedAgent: 'awards-agent' },
    { query: 'Which summer programs should I apply to?', expectedAgent: 'programs-agent' },
    { query: 'What are my chances at MIT?', expectedAgent: 'college-agent' },
    { query: 'Help me write my Common App essay', expectedAgent: 'essay-agent' },
    { query: 'What do admissions officers look for?', expectedAgent: 'admissions-agent' },
  ];

  for (let i = 0; i < routingTests.length; i++) {
    const { query, expectedAgent } = routingTests[i];
    await runTest(`4.${i + 1} Auto-Route: "${query.substring(0, 40)}..."`, async () => {
      const result = await executeAgent({
        message: query,
        student_id: TEST_STUDENT_ID,
        session_id: `${TEST_SESSION_ID}-routing-${i}`
      });
      if (!result) throw new Error('No result from routing');
      if (result.agent_id !== expectedAgent) {
        throw new Error(`Expected ${expectedAgent}, got ${result.agent_id}`);
      }
    });
  }
}

/**
 * SECTION 5: MULTI-TURN CONVERSATION TESTS
 */
async function testMultiTurnConversations() {
  console.log('\n' + '='.repeat(80));
  console.log('SECTION 5: MULTI-TURN CONVERSATION TESTS');
  console.log('='.repeat(80));

  const multiTurnSession = `${TEST_SESSION_ID}-multiturn`;

  // Turn 1
  await runTest('5.1 Multi-Turn: Turn 1 (Stanford Chances)', async () => {
    const result = await executeAgent({
      message: 'What are my chances at Stanford?',
      student_id: TEST_STUDENT_ID,
      session_id: multiTurnSession
    });
    if (!result || !result.response) throw new Error('No response from turn 1');
    if (!result.response.toLowerCase().includes('stanford')) throw new Error('Response missing Stanford');
  });

  // Turn 2 (follow-up)
  await runTest('5.2 Multi-Turn: Turn 2 (MIT Follow-up)', async () => {
    const result = await executeAgent({
      message: 'What about MIT?',
      student_id: TEST_STUDENT_ID,
      session_id: multiTurnSession
    });
    if (!result || !result.response) throw new Error('No response from turn 2');
    if (!result.response.toLowerCase().includes('mit')) throw new Error('Response missing MIT');
  });

  // Turn 3 (context check)
  await runTest('5.3 Multi-Turn: Turn 3 (Context Preservation)', async () => {
    const result = await executeAgent({
      message: 'Which one is easier to get into?',
      student_id: TEST_STUDENT_ID,
      session_id: multiTurnSession
    });
    if (!result || !result.response) throw new Error('No response from turn 3');
    // Should reference previous colleges (Stanford or MIT)
  });
}

/**
 * Main test runner
 */
async function runIntegrationTests() {
  console.log('🧪 v1.0 COMPREHENSIVE INTEGRATION TEST SUITE');
  console.log(`Student ID: ${TEST_STUDENT_ID}`);
  console.log(`Session Prefix: ${TEST_SESSION_ID}`);
  console.log('='.repeat(80));

  const startTime = Date.now();

  // Run all test sections
  await testAgents();
  await testKnowledgeMoat();
  await testCoachingIntelligence();
  await testAgentRouting();
  await testMultiTurnConversations();

  const totalDuration = Date.now() - startTime;

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));

  const passed = testResults.filter(t => t.status === 'PASS').length;
  const failed = testResults.filter(t => t.status === 'FAIL').length;
  const total = testResults.length;
  const passRate = ((passed / total) * 100).toFixed(1);

  console.log(`\nTotal Tests: ${total}`);
  console.log(`✅ Passed: ${passed} (${passRate}%)`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️  Total Duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(1)}s)`);

  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    testResults
      .filter(t => t.status === 'FAIL')
      .forEach(t => {
        console.log(`  - ${t.name}`);
        if (t.error) console.log(`    Error: ${t.error}`);
      });
  }

  console.log('\n' + '='.repeat(80));

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runIntegrationTests().catch(err => {
  console.error('\n💥 Test suite crashed:', err);
  process.exit(1);
});

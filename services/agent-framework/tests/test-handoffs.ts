/**
 * test-handoffs.ts
 * Test suite for agent handoff functionality
 * Created: 2025-10-16 (Week 9)
 */

import { createLogger } from '../../../packages/observability/dist/unified-logger.js';

const log = createLogger('test-handoffs');

const AGENT_URL = process.env.AGENT_URL || 'http://localhost:4101';
const TEST_STUDENT_ID = 'huda-2025';

interface HandoffTestCase {
  name: string;
  fromAgent: string;
  message: string;
  expectedHandoffTo?: string;
  shouldHandoff: boolean;
}

/**
 * Test cases for agent handoff detection
 */
const testCases: HandoffTestCase[] = [
  // GamePlan agent handoffs
  {
    name: 'GamePlan → College (chances query)',
    fromAgent: 'gameplan-agent',
    message: 'What are my chances at Stanford?',
    expectedHandoffTo: 'college-agent',
    shouldHandoff: true,
  },
  {
    name: 'GamePlan → Awards (award strategy)',
    fromAgent: 'gameplan-agent',
    message: 'Tell me about my award strategy',
    expectedHandoffTo: 'awards-agent',
    shouldHandoff: true,
  },
  {
    name: 'GamePlan stays (game plan query)',
    fromAgent: 'gameplan-agent',
    message: 'What is my game plan?',
    shouldHandoff: false,
  },

  // ECs agent handoffs
  {
    name: 'ECs → Programs (summer programs)',
    fromAgent: 'ecs-agent',
    message: 'which summer programs should i apply to',
    expectedHandoffTo: 'programs-agent',
    shouldHandoff: true,
  },
  {
    name: 'ECs → College (college list)',
    fromAgent: 'ecs-agent',
    message: 'What colleges should I apply to?',
    expectedHandoffTo: 'college-agent',
    shouldHandoff: true,
  },
  {
    name: 'ECs stays (EC query)',
    fromAgent: 'ecs-agent',
    message: 'Show me my extracurricular activities',
    shouldHandoff: false,
  },

  // Awards agent handoffs
  {
    name: 'Awards → GamePlan (overall strategy)',
    fromAgent: 'awards-agent',
    message: 'What is my overall strategy?',
    expectedHandoffTo: 'gameplan-agent',
    shouldHandoff: true,
  },
  {
    name: 'Awards stays (award query)',
    fromAgent: 'awards-agent',
    message: 'What awards have I won?',
    shouldHandoff: false,
  },

  // Programs agent handoffs
  {
    name: 'Programs → College (college advice)',
    fromAgent: 'programs-agent',
    message: 'Help me build my college list',
    expectedHandoffTo: 'college-agent',
    shouldHandoff: true,
  },
  {
    name: 'Programs stays (program query)',
    fromAgent: 'programs-agent',
    message: 'Which summer programs did I attend?',
    shouldHandoff: false,
  },

  // College agent handoffs
  {
    name: 'College → ECs (EC advice)',
    fromAgent: 'college-agent',
    message: 'What extracurriculars should I focus on?',
    expectedHandoffTo: 'ecs-agent',
    shouldHandoff: true,
  },
  {
    name: 'College stays (chances query)',
    fromAgent: 'college-agent',
    message: 'What are my chances at MIT?',
    shouldHandoff: false,
  },
];

/**
 * Execute agent chat API call
 */
async function callAgentAPI(
  message: string,
  agentId?: string,
  sessionId?: string
): Promise<any> {
  const response = await fetch(`${AGENT_URL}/api/agents/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      student_id: TEST_STUDENT_ID,
      message,
      agent_id: agentId,
      session_id: sessionId,
    }),
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Run handoff test case
 */
async function runHandoffTest(testCase: HandoffTestCase): Promise<boolean> {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log(`   From: ${testCase.fromAgent}`);
  console.log(`   Message: "${testCase.message}"`);

  try {
    const result = await callAgentAPI(testCase.message, testCase.fromAgent);

    const hasHandoff = result.handoff !== undefined && result.handoff !== null;

    if (testCase.shouldHandoff) {
      if (!hasHandoff) {
        console.log(`   ❌ FAIL: Expected handoff but none detected`);
        return false;
      }

      if (testCase.expectedHandoffTo && result.handoff.to_agent !== testCase.expectedHandoffTo) {
        console.log(
          `   ❌ FAIL: Expected handoff to ${testCase.expectedHandoffTo} but got ${result.handoff.to_agent}`
        );
        return false;
      }

      console.log(`   ✅ PASS: Handoff detected to ${result.handoff.to_agent}`);
      console.log(`   Reason: ${result.handoff.reason}`);
      return true;
    } else {
      if (hasHandoff) {
        console.log(`   ❌ FAIL: Expected no handoff but detected ${result.handoff.to_agent}`);
        return false;
      }

      console.log(`   ✅ PASS: No handoff (stayed with ${testCase.fromAgent})`);
      return true;
    }
  } catch (error: any) {
    console.log(`   ❌ ERROR: ${error.message}`);
    return false;
  }
}

/**
 * Test multi-turn conversation with handoff execution
 */
async function testMultiTurnHandoff(): Promise<boolean> {
  console.log(`\n🧪 Testing: Multi-turn conversation with handoff execution`);

  try {
    // Turn 1: Start with gameplan agent
    console.log(`   Turn 1: "What is my game plan?"`);
    const turn1 = await callAgentAPI('What is my game plan?');
    const sessionId = turn1.session_id;
    console.log(`   Session created: ${sessionId}`);

    // Turn 2: Ask about colleges (should suggest handoff)
    console.log(`   Turn 2: "What are my chances at Stanford?" (should suggest college-agent)`);
    const turn2 = await callAgentAPI('What are my chances at Stanford?', undefined, sessionId);

    if (!turn2.handoff || turn2.handoff.to_agent !== 'college-agent') {
      console.log(`   ❌ FAIL: Expected handoff to college-agent`);
      return false;
    }

    console.log(`   ✅ Handoff suggested: ${turn2.handoff.to_agent}`);

    // Turn 3: Execute handoff (explicitly specify college-agent)
    console.log(`   Turn 3: Execute handoff to college-agent`);
    const turn3 = await callAgentAPI(
      'What are my chances at Stanford?',
      'college-agent',
      sessionId
    );

    if (turn3.debug.agent_id !== 'college-agent') {
      console.log(`   ❌ FAIL: Expected to execute with college-agent`);
      return false;
    }

    console.log(`   ✅ PASS: Successfully executed handoff`);
    console.log(`   Final agent: ${turn3.debug.agent_id}`);
    return true;
  } catch (error: any) {
    console.log(`   ❌ ERROR: ${error.message}`);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('============================================');
  console.log('🤖 Agent Handoff Test Suite');
  console.log('============================================');
  console.log(`Agent URL: ${AGENT_URL}`);
  console.log(`Test Student: ${TEST_STUDENT_ID}`);
  console.log(`Total Tests: ${testCases.length + 1}`);

  // Check if server is running
  try {
    const healthCheck = await fetch(`${AGENT_URL}/health`);
    if (!healthCheck.ok) {
      console.log('\n❌ Agent server is not running!');
      console.log('Start the server with: pnpm dev:agents');
      process.exit(1);
    }
  } catch (error) {
    console.log('\n❌ Cannot connect to agent server!');
    console.log('Start the server with: pnpm dev:agents');
    process.exit(1);
  }

  let passed = 0;
  let failed = 0;

  // Run individual handoff tests
  for (const testCase of testCases) {
    const result = await runHandoffTest(testCase);
    if (result) {
      passed++;
    } else {
      failed++;
    }

    // Wait a bit between tests to avoid overwhelming the API
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Run multi-turn handoff test
  const multiTurnResult = await testMultiTurnHandoff();
  if (multiTurnResult) {
    passed++;
  } else {
    failed++;
  }

  // Print summary
  console.log('\n============================================');
  console.log('📊 Test Summary');
  console.log('============================================');
  console.log(`✅ Passed: ${passed}/${testCases.length + 1}`);
  console.log(`❌ Failed: ${failed}/${testCases.length + 1}`);
  console.log(`Success Rate: ${((passed / (testCases.length + 1)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed');
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

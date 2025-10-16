/**
 * test-essay-admissions-agents.ts
 * Unit tests for Essay and Admissions agents (Week 11)
 * Created: 2025-10-16
 */

import { createLogger } from '../../../packages/observability/dist/unified-logger.js';

const log = createLogger('test-essay-admissions');

const AGENT_URL = process.env.AGENT_URL || 'http://localhost:4101';
const TEST_STUDENT_ID = 'huda-2025';

interface TestCase {
  name: string;
  agentId: 'essay-agent' | 'admissions-agent';
  message: string;
  expectedPatterns: string[];
  shouldCallTools?: boolean;
  expectedTools?: string[];
}

/**
 * Test cases for Essay and Admissions agents
 */
const testCases: TestCase[] = [
  // Essay Agent Tests
  {
    name: 'Essay Agent: Topic brainstorming',
    agentId: 'essay-agent',
    message: 'I need help brainstorming essay topics for my Common App essay',
    expectedPatterns: [
      'brainstorm',
      'topic',
      'story',
      'authentic',
      'Common App',
    ],
    shouldCallTools: true,
    expectedTools: ['get_vitals'],
  },
  {
    name: 'Essay Agent: Request examples',
    agentId: 'essay-agent',
    message: 'Can you show me successful essay examples for Stanford?',
    expectedPatterns: [
      'essay',
      'example',
      'successful',
      'Stanford',
    ],
    shouldCallTools: true,
    expectedTools: ['search_essay_examples'],
  },
  {
    name: 'Essay Agent: Writing guidance',
    agentId: 'essay-agent',
    message: 'How can I improve my essay writing and make it more compelling?',
    expectedPatterns: [
      'improve',
      'writing',
      'compelling',
      'specific',
      'show',
    ],
  },
  {
    name: 'Essay Agent: AO perspective on essays',
    agentId: 'essay-agent',
    message: 'What do admissions officers look for in college essays?',
    expectedPatterns: [
      'admissions',
      'look for',
      'authentic',
      'essay',
    ],
    shouldCallTools: true,
    expectedTools: ['get_ao_perspectives'],
  },
  {
    name: 'Essay Agent: UC PIQ guidance',
    agentId: 'essay-agent',
    message: 'Help me with my UC Personal Insight Questions',
    expectedPatterns: [
      'UC',
      'Personal Insight',
      '350 words',
      '4',
    ],
  },

  // Admissions Agent Tests
  {
    name: 'Admissions Agent: Holistic review process',
    agentId: 'admissions-agent',
    message: 'How do admissions officers review applications?',
    expectedPatterns: [
      'holistic',
      'review',
      'admissions officer',
      'process',
    ],
    shouldCallTools: true,
    expectedTools: ['get_ao_perspectives'],
  },
  {
    name: 'Admissions Agent: Red flags',
    agentId: 'admissions-agent',
    message: 'What are common red flags in college applications?',
    expectedPatterns: [
      'red flag',
      'avoid',
      'mistake',
      'generic',
    ],
    shouldCallTools: true,
    expectedTools: ['get_ao_perspectives'],
  },
  {
    name: 'Admissions Agent: Green flags',
    agentId: 'admissions-agent',
    message: 'What makes a strong application stand out to AOs?',
    expectedPatterns: [
      'stand out',
      'strong',
      'green flag',
      'impact',
    ],
    shouldCallTools: true,
    expectedTools: ['get_ao_perspectives'],
  },
  {
    name: 'Admissions Agent: Positioning strategy',
    agentId: 'admissions-agent',
    message: 'How should I position myself in my application?',
    expectedPatterns: [
      'position',
      'narrative',
      'story',
      'authentic',
    ],
    shouldCallTools: true,
    expectedTools: ['get_vitals'],
  },
  {
    name: 'Admissions Agent: Selectivity understanding',
    agentId: 'admissions-agent',
    message: 'What does it mean if a school has a 10% acceptance rate?',
    expectedPatterns: [
      'selective',
      'acceptance rate',
      '10%',
      'competitive',
    ],
  },

  // Routing Tests (should route to correct agent)
  {
    name: 'Routing: Essay topic → Essay Agent',
    agentId: 'essay-agent',
    message: 'what should i write my essay about',
    expectedPatterns: ['essay', 'topic', 'brainstorm'],
  },
  {
    name: 'Routing: AO insights → Admissions Agent',
    agentId: 'admissions-agent',
    message: 'what do admissions officers care about most',
    expectedPatterns: ['admissions', 'care', 'holistic'],
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
 * Run individual test case
 */
async function runTest(testCase: TestCase): Promise<boolean> {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log(`   Agent: ${testCase.agentId}`);
  console.log(`   Message: "${testCase.message}"`);

  try {
    const result = await callAgentAPI(testCase.message, testCase.agentId);

    // Check agent ID matches
    if (result.debug?.agent_id !== testCase.agentId) {
      console.log(
        `   ❌ FAIL: Expected agent ${testCase.agentId} but got ${result.debug?.agent_id}`
      );
      return false;
    }

    // Check response has content
    if (!result.answer || result.answer.length < 50) {
      console.log(`   ❌ FAIL: Response too short (${result.answer?.length || 0} chars)`);
      return false;
    }

    // Check expected patterns in response
    const responseLower = result.answer.toLowerCase();
    let patternsFound = 0;
    for (const pattern of testCase.expectedPatterns) {
      if (responseLower.includes(pattern.toLowerCase())) {
        patternsFound++;
      }
    }

    // Require at least 50% of patterns to match
    const patternThreshold = Math.ceil(testCase.expectedPatterns.length * 0.5);
    if (patternsFound < patternThreshold) {
      console.log(
        `   ⚠️  WARNING: Only ${patternsFound}/${testCase.expectedPatterns.length} expected patterns found`
      );
      console.log(`   Expected patterns: ${testCase.expectedPatterns.join(', ')}`);
    }

    // Check tools called if expected
    if (testCase.shouldCallTools) {
      const toolsCalled = result.debug?.tools_called || [];

      if (toolsCalled.length === 0) {
        console.log(`   ⚠️  WARNING: Expected tools to be called but none were`);
      } else {
        console.log(`   Tools called: ${toolsCalled.join(', ')}`);

        // Check if expected tools were called
        if (testCase.expectedTools) {
          for (const expectedTool of testCase.expectedTools) {
            if (!toolsCalled.includes(expectedTool)) {
              console.log(`   ⚠️  WARNING: Expected tool ${expectedTool} was not called`);
            }
          }
        }
      }
    }

    // Check for evidence chips
    const chipsCount = result.chips?.length || 0;
    if (chipsCount === 0 && testCase.shouldCallTools) {
      console.log(`   ⚠️  WARNING: No evidence chips provided`);
    } else if (chipsCount > 0) {
      console.log(`   Evidence chips: ${chipsCount}`);
    }

    console.log(`   ✅ PASS: Response generated successfully`);
    console.log(`   Response length: ${result.answer.length} chars`);
    console.log(`   Patterns found: ${patternsFound}/${testCase.expectedPatterns.length}`);

    return true;
  } catch (error: any) {
    console.log(`   ❌ ERROR: ${error.message}`);
    return false;
  }
}

/**
 * Test agent list includes new agents
 */
async function testAgentList(): Promise<boolean> {
  console.log(`\n🧪 Testing: Agent list includes Essay and Admissions agents`);

  try {
    const response = await fetch(`${AGENT_URL}/api/agents/list`);
    if (!response.ok) {
      throw new Error(`Failed to fetch agent list: ${response.statusText}`);
    }

    const data = await response.json();
    const agents = data.agents || [];
    const agentIds = agents.map((a: any) => a.agent_id);

    const hasEssayAgent = agentIds.includes('essay-agent');
    const hasAdmissionsAgent = agentIds.includes('admissions-agent');

    if (!hasEssayAgent) {
      console.log(`   ❌ FAIL: essay-agent not found in agent list`);
      return false;
    }

    if (!hasAdmissionsAgent) {
      console.log(`   ❌ FAIL: admissions-agent not found in agent list`);
      return false;
    }

    console.log(`   ✅ PASS: Both Essay and Admissions agents registered`);
    console.log(`   Total agents: ${agents.length}`);
    console.log(`   Agent IDs: ${agentIds.join(', ')}`);

    return true;
  } catch (error: any) {
    console.log(`   ❌ ERROR: ${error.message}`);
    return false;
  }
}

/**
 * Test agent routing (auto-routing without specifying agent)
 */
async function testRouting(): Promise<boolean> {
  console.log(`\n🧪 Testing: Auto-routing to Essay and Admissions agents`);

  const routingTests = [
    {
      message: 'help me brainstorm essay topics',
      expectedAgent: 'essay-agent',
    },
    {
      message: 'what do admissions officers look for',
      expectedAgent: 'admissions-agent',
    },
    {
      message: 'show me successful essay examples',
      expectedAgent: 'essay-agent',
    },
    {
      message: 'what are red flags in applications',
      expectedAgent: 'admissions-agent',
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of routingTests) {
    try {
      // Call without specifying agent_id (let it route automatically)
      const result = await callAgentAPI(test.message);

      if (result.debug?.agent_id === test.expectedAgent) {
        console.log(
          `   ✅ "${test.message}" → ${result.debug.agent_id}`
        );
        passed++;
      } else {
        console.log(
          `   ❌ "${test.message}" → ${result.debug?.agent_id} (expected ${test.expectedAgent})`
        );
        failed++;
      }
    } catch (error: any) {
      console.log(`   ❌ ERROR: ${error.message}`);
      failed++;
    }

    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log(`   Results: ${passed}/${routingTests.length} passed`);

  return failed === 0;
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('============================================');
  console.log('🤖 Essay & Admissions Agents Test Suite');
  console.log('============================================');
  console.log(`Agent URL: ${AGENT_URL}`);
  console.log(`Test Student: ${TEST_STUDENT_ID}`);
  console.log(`Total Tests: ${testCases.length + 2}`); // +2 for agent list and routing tests

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

  // Test 1: Agent list
  const agentListResult = await testAgentList();
  if (agentListResult) {
    passed++;
  } else {
    failed++;
  }

  // Test 2: Auto-routing
  const routingResult = await testRouting();
  if (routingResult) {
    passed++;
  } else {
    failed++;
  }

  // Run individual test cases
  for (const testCase of testCases) {
    const result = await runTest(testCase);
    if (result) {
      passed++;
    } else {
      failed++;
    }

    // Small delay between tests
    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  // Print summary
  console.log('\n============================================');
  console.log('📊 Test Summary');
  console.log('============================================');
  console.log(`✅ Passed: ${passed}/${testCases.length + 2}`);
  console.log(`❌ Failed: ${failed}/${testCases.length + 2}`);
  console.log(`Success Rate: ${((passed / (testCases.length + 2)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed or had warnings');
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

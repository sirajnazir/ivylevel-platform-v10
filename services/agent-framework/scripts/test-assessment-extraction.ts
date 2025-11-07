/**
 * v31.3: Automated Assessment Extraction Test Script
 *
 * Purpose: Test Assessment Agent extraction inch-by-inch with detailed logging
 * Tests each message in isolation to identify where extraction breaks
 */

// Using native fetch API (Node.js 18+)

const API_URL = 'http://localhost:8787/api/v26';
const API_KEY = 'test-key';

interface TestMessage {
  message: string;
  expected_fields: string[];
  description: string;
}

const TEST_MESSAGES: TestMessage[] = [
  {
    message: "10",
    expected_fields: ['grade'],
    description: "Test 1: Simple grade extraction"
  },
  {
    message: "I'm in 10th grade",
    expected_fields: ['grade'],
    description: "Test 2: Grade in sentence"
  },
  {
    message: "Dublin High School",
    expected_fields: ['high_school'],
    description: "Test 3: School name only"
  },
  {
    message: "I attend Dublin High School",
    expected_fields: ['high_school'],
    description: "Test 4: School in sentence"
  },
  {
    message: "CS, Game Development, Math",
    expected_fields: ['interests'],
    description: "Test 5: Multiple interests"
  },
  {
    message: "I'm passionate about Computer Science and Game Development",
    expected_fields: ['interests'],
    description: "Test 6: Interests in sentence"
  }
];

async function createSession(): Promise<string> {
  console.log('\n🔵 Creating new session...');

  const response = await fetch(`${API_URL}/session/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY
    },
    body: JSON.stringify({
      student_id: 'test-extraction-debug',
      session_type: 'onboarding'
    })
  });

  const data = await response.json();
  console.log('✅ Session created:', data.session_id);
  return data.session_id;
}

async function sendMessage(sessionId: string, message: string): Promise<any> {
  console.log(`\n📤 Sending message: "${message}"`);

  const response = await fetch(`${API_URL}/agents/assessment-agent-v18/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY
    },
    body: JSON.stringify({
      session_id: sessionId,
      student_id: 'test-extraction-debug',
      message
    })
  });

  const data = await response.json();
  console.log('📥 Response received');
  return data;
}

async function runTests() {
  console.log('='.repeat(80));
  console.log('🧪 Assessment Extraction Test Suite');
  console.log('='.repeat(80));
  console.log(`Testing ${TEST_MESSAGES.length} scenarios`);
  console.log(`Log file: /Users/snazir/ivylevel-platform-v10/logs/debug/assessment-debug-${new Date().toISOString().split('T')[0]}.log`);
  console.log('='.repeat(80));

  const results: any[] = [];

  for (let i = 0; i < TEST_MESSAGES.length; i++) {
    const test = TEST_MESSAGES[i];
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Test ${i + 1}/${TEST_MESSAGES.length}: ${test.description}`);
    console.log('='.repeat(80));

    try {
      // Create fresh session for each test
      const sessionId = await createSession();

      // Wait for session to be fully created
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Send message
      const response = await sendMessage(sessionId, test.message);

      // Analyze response
      const metadata = response.metadata || {};
      const dataCollected = metadata.data_collected_so_far || {};
      const collectedKeys = Object.keys(dataCollected);

      const testResult = {
        test_number: i + 1,
        description: test.description,
        message: test.message,
        expected_fields: test.expected_fields,
        collected_fields: collectedKeys,
        success: test.expected_fields.some(field => collectedKeys.includes(field)),
        response_length: response.response?.length || 0,
        intelligence_triggered: response.intelligence_triggered || [],
        metadata: metadata
      };

      results.push(testResult);

      console.log('\n📊 Test Result:');
      console.log(`  Expected: [${test.expected_fields.join(', ')}]`);
      console.log(`  Got: [${collectedKeys.join(', ')}]`);
      console.log(`  Status: ${testResult.success ? '✅ PASS' : '❌ FAIL'}`);

      if (!testResult.success) {
        console.log(`  ⚠️  Expected fields not found in collected data`);
        console.log(`  Raw collected data:`, JSON.stringify(dataCollected, null, 2));
      }

      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`❌ Test ${i + 1} failed with error:`, error);
      results.push({
        test_number: i + 1,
        description: test.description,
        error: String(error),
        success: false
      });
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);

  console.log('\n📝 Detailed Results:');
  results.forEach(r => {
    console.log(`\n  Test ${r.test_number}: ${r.description}`);
    console.log(`    Message: "${r.message}"`);
    console.log(`    Expected: [${r.expected_fields?.join(', ')}]`);
    console.log(`    Got: [${r.collected_fields?.join(', ')}]`);
    console.log(`    Status: ${r.success ? '✅' : '❌'}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log(`📁 Full debug logs available at:`);
  console.log(`   /Users/snazir/ivylevel-platform-v10/logs/debug/assessment-debug-${new Date().toISOString().split('T')[0]}.log`);
  console.log('='.repeat(80));
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});

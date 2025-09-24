#!/usr/bin/env node

/**
 * Quick Contract Test for v1.1.1
 * Run with: node tests/quick-contract-test.js
 */

const fetch = require('node-fetch');

const API_URL = process.env.API_URL || 'http://localhost:4000';
const AGENT_URL = process.env.AGENT_URL || 'http://localhost:4101';

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

async function runTests() {
  console.log('=== v1.1.1 Contract Tests ===\n');

  // Test 1: Application view contract
  await test('Application view returns exactly 10 ECs and 5 awards', async () => {
    const response = await fetch(`${API_URL}/students/huda/state?view=application`);
    const data = await response.json();
    
    assert(response.ok, 'API response not OK');
    assert(data.apps?.submitted, 'No submitted subset in application view');
    assert(data.apps.submitted.ecs?.length === 10, `Expected 10 ECs, got ${data.apps.submitted.ecs?.length}`);
    assert(data.apps.submitted.awards?.length === 5, `Expected 5 awards, got ${data.apps.submitted.awards?.length}`);
  });

  // Test 2: EC structure validation
  await test('Each EC has required fields (id, name, position)', async () => {
    const response = await fetch(`${API_URL}/students/huda/state?view=application`);
    const data = await response.json();
    
    data.apps.submitted.ecs.forEach((ec, i) => {
      assert(ec.id, `EC ${i} missing id`);
      assert(ec.name, `EC ${i} missing name`);
      assert(ec.position, `EC ${i} missing position`);
      assert(ec.id.startsWith('ec_'), `EC ${i} id doesn't start with ec_`);
    });
  });

  // Test 3: Award structure validation
  await test('Each award has required fields (id, name, level)', async () => {
    const response = await fetch(`${API_URL}/students/huda/state?view=application`);
    const data = await response.json();
    
    data.apps.submitted.awards.forEach((award, i) => {
      assert(award.id, `Award ${i} missing id`);
      assert(award.name, `Award ${i} missing name`);
      assert(award.level, `Award ${i} missing level`);
      assert(award.id.startsWith('award_'), `Award ${i} id doesn't start with award_`);
      assert(['School', 'State', 'National', 'International'].includes(award.level), 
        `Award ${i} has invalid level: ${award.level}`);
    });
  });

  // Test 4: No hedging in SAT response
  await test('SAT query returns specific score without hedging', async () => {
    const response = await fetch(`${AGENT_URL}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: 'huda',
        message: 'What is my SAT score?'
      })
    });
    
    const data = await response.json();
    assert(response.ok, 'Agent response not OK');
    assert(data.reply, 'No reply from agent');
    
    const reply = data.reply.toLowerCase();
    const forbiddenPhrases = [
      "don't have access",
      "cannot access",
      "don't have information",
      "unable to see"
    ];
    
    forbiddenPhrases.forEach(phrase => {
      assert(!reply.includes(phrase), `Found hedging phrase: "${phrase}"`);
    });
    
    assert(/\b1550\b/.test(data.reply), 'SAT score 1550 not found in response');
  });

  // Test 5: College list completeness
  await test('College list query returns all 28 colleges', async () => {
    const response = await fetch(`${AGENT_URL}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: 'huda',
        message: 'What was my complete college list and the final decisions for each?'
      })
    });
    
    const data = await response.json();
    
    // Check for key colleges
    const keyColleges = ['Northwestern', 'MIT', 'Stanford', 'UC Irvine', 'Harvard'];
    keyColleges.forEach(college => {
      assert(data.reply.includes(college), `College "${college}" not found in response`);
    });
    
    // Check for decision statuses
    assert(data.reply.includes('ACCEPTED'), 'No ACCEPTED status found');
    assert(data.reply.includes('REJECTED'), 'No REJECTED status found');
    assert(data.reply.includes('WAITLISTED'), 'No WAITLISTED status found');
    
    // Count numbered items (should be 28)
    const numberedItems = data.reply.match(/\d+\./g) || [];
    assert(numberedItems.length >= 28, `Expected at least 28 colleges, found ${numberedItems.length}`);
  });

  // Test 6: Evidence citation
  await test('NCWIT query includes evidence citation', async () => {
    const response = await fetch(`${AGENT_URL}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: 'huda',
        message: 'Where did we capture my NCWIT win?'
      })
    });
    
    const data = await response.json();
    const reply = data.reply.toLowerCase();
    
    const evidencePatterns = [
      'from your',
      'captured in',
      'recorded',
      'vitals',
      'records',
      'week'
    ];
    
    const hasEvidence = evidencePatterns.some(pattern => reply.includes(pattern));
    assert(hasEvidence, 'No evidence citation found in response');
  });

  // Test 7: Consistent college counts
  await test('College acceptance count is consistent (9 accepted)', async () => {
    const response = await fetch(`${AGENT_URL}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: 'huda',
        message: 'How many colleges accepted me?'
      })
    });
    
    const data = await response.json();
    assert(/\b9\b/.test(data.reply), 'Expected count of 9 not found');
    assert(data.reply.toLowerCase().includes('accepted'), 'Word "accepted" not found');
  });

  // Summary
  console.log('\n=== Test Summary ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total:  ${passed + failed}`);
  
  if (failed > 0) {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  }
}

// Check if services are available before running tests
async function checkServices() {
  try {
    const apiHealth = await fetch(`${API_URL}/health`);
    if (!apiHealth.ok) throw new Error('API not healthy');
    
    const agentHealth = await fetch(`${AGENT_URL}/health`);
    if (!agentHealth.ok) throw new Error('Agent not healthy');
    
    return true;
  } catch (error) {
    console.error('❌ Services not available. Please ensure API and Agent are running.');
    console.error(`   API: ${API_URL}`);
    console.error(`   Agent: ${AGENT_URL}`);
    return false;
  }
}

// Main
(async () => {
  if (await checkServices()) {
    await runTests();
  } else {
    process.exit(1);
  }
})().catch(console.error);
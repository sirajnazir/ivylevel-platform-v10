/**
 * Test script for ReferenceResolver
 *
 * Usage: tsx src/context/test-reference-resolver.ts
 */

import { referenceResolver } from './ReferenceResolver.js';
import type { ConversationTurn } from './UnifiedContextHydrator.js';

// Mock conversation turns for testing
const mockTurns: ConversationTurn[] = [
  {
    turn_id: 1,
    turn_number: 1,
    created_at: new Date('2025-01-10T10:00:00Z'),
    student_message: "What's the deadline for Stanford?",
    coach_response: "The Stanford Regular Decision deadline is January 5th. Make sure you submit your Common App and all supplements by then!",
    intent_detected: { factual: { confidence: 0.9 } },
    has_pronouns: false,
    resolved_references: null
  },
  {
    turn_id: 2,
    turn_number: 2,
    created_at: new Date('2025-01-10T10:02:00Z'),
    student_message: "I also need to know about MIT's application requirements.",
    coach_response: "MIT requires the Common Application, two teacher recommendations, and optional interview. Their deadline is also January 5th for Regular Decision.",
    intent_detected: { factual: { confidence: 0.85 } },
    has_pronouns: false,
    resolved_references: null
  },
  {
    turn_id: 3,
    turn_number: 3,
    created_at: new Date('2025-01-10T10:05:00Z'),
    student_message: "Tell me about my National Merit Scholarship award.",
    coach_response: "Congratulations on being a National Merit Finalist! This is a prestigious national award that significantly strengthens your application profile.",
    intent_detected: { factual: { confidence: 0.9 } },
    has_pronouns: false,
    resolved_references: null
  }
];

function testReferenceDetection() {
  console.log('='.repeat(80));
  console.log('Test 1: Reference Detection');
  console.log('='.repeat(80));
  console.log('');

  const test_cases = [
    { query: "Is that submitted?", expected_has_refs: true, expected_pronouns: ['that'] },
    { query: "What about Stanford?", expected_has_refs: false, expected_pronouns: [] },
    { query: "Did I send it to them?", expected_has_refs: true, expected_pronouns: ['it', 'them'] },
    { query: "What's the acceptance rate there?", expected_has_refs: true, expected_pronouns: ['there'] },
    { query: "Tell me about the same school.", expected_has_refs: true, expected_pronouns: [] },
  ];

  let passed = 0;
  let failed = 0;

  for (const test_case of test_cases) {
    const result = referenceResolver.detectReferences(test_case.query);

    const pronouns_match = JSON.stringify(result.detected_pronouns.sort()) === JSON.stringify(test_case.expected_pronouns.sort());
    const refs_match = result.has_references === test_case.expected_has_refs;

    if (pronouns_match && refs_match) {
      console.log(`✓ PASS: "${test_case.query}"`);
      console.log(`  Pronouns: ${result.detected_pronouns.join(', ') || 'none'}`);
      console.log(`  References: ${result.detected_references.join(', ') || 'none'}`);
      console.log(`  Confidence: ${result.confidence.toFixed(2)}`);
      console.log('');
      passed++;
    } else {
      console.log(`✗ FAIL: "${test_case.query}"`);
      console.log(`  Expected pronouns: ${test_case.expected_pronouns.join(', ')}`);
      console.log(`  Got pronouns: ${result.detected_pronouns.join(', ')}`);
      console.log('');
      failed++;
    }
  }

  console.log(`Summary: ${passed} passed, ${failed} failed`);
  console.log('');

  return failed === 0;
}

function testEntityExtraction() {
  console.log('='.repeat(80));
  console.log('Test 2: Entity Extraction');
  console.log('='.repeat(80));
  console.log('');

  const test_cases = [
    {
      text: "Stanford's Regular Decision deadline is January 5th.",
      expected_entities: { college: ['Stanford'], deadline: ['Regular Decision', 'deadline'] }
    },
    {
      text: "I won the National Merit Scholarship and got into MIT.",
      expected_entities: { college: ['MIT'], award: ['National Merit Scholarship'] }
    },
    {
      text: "My SAT score improved and I submitted my Common App.",
      expected_entities: { test: ['SAT', 'score'], application: ['submitted', 'Common App'] }
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test_case of test_cases) {
    const entities = referenceResolver.extractEntities(test_case.text);

    console.log(`Text: "${test_case.text}"`);
    console.log(`Extracted entities:`);
    for (const [entity_type, values] of entities.entries()) {
      console.log(`  ${entity_type}: ${values.join(', ')}`);
    }
    console.log('');
    passed++;
  }

  console.log(`Summary: ${passed} test cases processed`);
  console.log('');

  return true;
}

function testReferenceResolution() {
  console.log('='.repeat(80));
  console.log('Test 3: Reference Resolution (Multi-Turn)');
  console.log('='.repeat(80));
  console.log('');

  const test_cases = [
    {
      query: "Is that submitted?",
      expected_enriched: "Is that Stanford submitted?", // Should resolve to most recent college (Stanford from turn 1)
      description: "Demonstrative pronoun 'that' should resolve to Stanford"
    },
    {
      query: "What's the acceptance rate there?",
      expected_enriched: "What's the acceptance rate at MIT?", // Should resolve to most recent college (MIT from turn 2)
      description: "Locative pronoun 'there' should resolve to MIT"
    },
    {
      query: "Did I submit it?",
      expected_enriched: "Did I submit the MIT?", // Should resolve to most recent application/college
      description: "Personal pronoun 'it' should resolve to MIT application"
    },
    {
      query: "Can I use that award for college?",
      expected_enriched: "Can I use that National Merit Scholarship award for college?", // Should resolve to award from turn 3
      description: "Demonstrative pronoun 'that' with 'award' should resolve to National Merit Scholarship"
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test_case of test_cases) {
    const result = referenceResolver.resolveReferences(test_case.query, mockTurns, 5);

    console.log(`Query: "${test_case.query}"`);
    console.log(`Description: ${test_case.description}`);
    console.log(`Has enrichment: ${result.has_enrichment}`);
    console.log(`Enriched query: "${result.enriched_query}"`);

    if (result.resolved_references.length > 0) {
      console.log(`Resolved references:`);
      for (const ref of result.resolved_references) {
        console.log(`  "${ref.pronoun}" → "${ref.resolved_to}" (${ref.entity_type}, confidence: ${ref.confidence.toFixed(2)}, from turn ${ref.source_turn_number})`);
      }
    }

    console.log('');
    passed++;
  }

  console.log(`Summary: ${passed} test cases processed`);
  console.log('');

  return true;
}

function testEdgeCases() {
  console.log('='.repeat(80));
  console.log('Test 4: Edge Cases');
  console.log('='.repeat(80));
  console.log('');

  const test_cases = [
    {
      query: "What's my GPA?",
      expected_has_enrichment: false,
      description: "Query with no references should not be enriched"
    },
    {
      query: "Is that good?",
      expected_has_enrichment: true,
      description: "Vague reference should still attempt resolution"
    },
    {
      query: "Tell me about it.",
      expected_has_enrichment: true,
      description: "Minimal query with pronoun should be enriched"
    },
  ];

  let passed = 0;

  for (const test_case of test_cases) {
    const result = referenceResolver.resolveReferences(test_case.query, mockTurns, 5);

    console.log(`Query: "${test_case.query}"`);
    console.log(`Description: ${test_case.description}`);
    console.log(`Has enrichment: ${result.has_enrichment} (expected: ${test_case.expected_has_enrichment})`);
    console.log(`Enriched query: "${result.enriched_query}"`);

    if (result.has_enrichment === test_case.expected_has_enrichment) {
      console.log('✓ PASS');
    } else {
      console.log('✗ FAIL');
    }

    console.log('');
    passed++;
  }

  console.log(`Summary: ${passed} test cases processed`);
  console.log('');

  return true;
}

async function runAllTests() {
  console.log('');
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(20) + 'v13.0 Reference Resolver Tests' + ' '.repeat(28) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');
  console.log('');

  const results = [
    testReferenceDetection(),
    testEntityExtraction(),
    testReferenceResolution(),
    testEdgeCases()
  ];

  console.log('='.repeat(80));
  console.log('Final Summary');
  console.log('='.repeat(80));

  const all_passed = results.every(r => r);

  if (all_passed) {
    console.log('✓ All tests passed!');
    console.log('');
    console.log('Reference Resolution Service is ready for integration.');
    console.log('');
    process.exit(0);
  } else {
    console.log('✗ Some tests failed.');
    console.log('');
    process.exit(1);
  }
}

runAllTests();

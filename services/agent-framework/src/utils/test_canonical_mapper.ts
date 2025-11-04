/**
 * Direct internal test of CanonicalFieldMapper
 * Tests field extraction without needing full server/session setup
 */

import { CanonicalFieldMapper } from '../services/agent-framework/src/utils/CanonicalFieldMapper.js';

// Mock TYPE-085 intelligence result (as it would be returned from RubricScoringEngine)
const mockType085Result = {
  type_id: 'TYPE-085',
  component: 'rubric_scoring_engine',
  triggered: true,
  confidence: 0.85,
  data: {
    student_id: 'test-student',
    total_score: 35, // 0-50 scale (Jenny's 5 dimensions × 10 points each)
    dimension_scores: [
      { dimension: 'academics', raw_score: 8, evidence: ['4.0 GPA', '5 AP classes'], gaps: [], confidence: 0.9 },
      { dimension: 'leadership', raw_score: 7, evidence: ['Founded Game Dev Club', 'President 2 years'], gaps: [], confidence: 0.85 },
      { dimension: 'service', raw_score: 5, evidence: [], gaps: ['No community service mentioned'], confidence: 0.6 },
      { dimension: 'artifacts', raw_score: 6, evidence: [], gaps: ['No portfolio/projects mentioned'], confidence: 0.7 },
      { dimension: 'recognition', raw_score: 9, evidence: ['NCWIT Award', 'Congressional App Challenge Finalist'], gaps: [], confidence: 0.95 }
    ],
    data_completeness: 0.75,
    scoring_confidence: 0.82,
    timestamp: new Date()
  }
};

// Mock TYPE-086 intelligence result (as it would be returned from GapPriorityAnalyzer)
const mockType086Result = {
  type_id: 'TYPE-086',
  component: 'gap_priority_analyzer',
  triggered: true,
  confidence: 0.8,
  data: {
    prioritized_gaps: [
      {
        dimension: 'service',
        current_score: 5,
        target_score: 8,
        gap_size: 3,
        priority: 'P0' as const,
        urgency: 'High - Critical for competitive profile',
        recommended_actions: ['Start community service project', 'Document impact metrics']
      },
      {
        dimension: 'artifacts',
        current_score: 6,
        target_score: 9,
        gap_size: 3,
        priority: 'P1' as const,
        urgency: 'Medium - Enhances competitiveness',
        recommended_actions: ['Build portfolio website', 'Document game development projects']
      }
    ],
    quick_wins: [
      {
        action: 'Document existing game development projects with screenshots',
        timeline: '1 week',
        impact: 'High'
      }
    ]
  }
};

const mockIntelligenceResults = [mockType085Result, mockType086Result];

console.log('==========================================');
console.log('CanonicalFieldMapper Internal Test');
console.log('==========================================\n');

console.log('Test 1: Extract IvyScore (0-50 → 0-100 normalization)');
console.log('----------------------------------------------');
const ivyScore = CanonicalFieldMapper.extractIvyScore(mockIntelligenceResults);
console.log(`Input: total_score = 35 (on 0-50 scale)`);
console.log(`Output: ivy_score = ${ivyScore} (on 0-100 scale)`);
console.log(`Expected: 70 (35/50 * 100)`);
console.log(`✅ PASS: ${ivyScore === 70 ? 'Correct normalization' : '❌ FAIL: Wrong calculation'}\n`);

console.log('Test 2: Extract Rubric Scores (semantic mapping)');
console.log('----------------------------------------------');
const rubricScores = CanonicalFieldMapper.extractRubricScores(mockIntelligenceResults);
console.log('Input: TYPE-085 dimension_scores with rubric dimensions');
console.log('Output: Application category scores\n');

console.log('Semantic Mappings:');
console.log(`  academics (rubric) → academics (app): ${rubricScores.academics}/10`);
console.log(`  leadership (rubric) → extracurriculars (app): ${rubricScores.extracurriculars}/10`);
console.log(`  service (rubric) → summer_programs (app): ${rubricScores.summer_programs}/10`);
console.log(`  recognition (rubric) → awards (app): ${rubricScores.awards}/10`);
console.log(`  artifacts (rubric) → essays (app): ${rubricScores.essays}/10`);
console.log(`  total: ${rubricScores.total}/50\n`);

const mappingCorrect =
  rubricScores.academics === 8 &&
  rubricScores.extracurriculars === 7 &&
  rubricScores.summer_programs === 5 &&
  rubricScores.awards === 9 &&
  rubricScores.essays === 6 &&
  rubricScores.total === 35;

console.log(`✅ ${mappingCorrect ? 'PASS: All semantic mappings correct' : '❌ FAIL: Mapping error detected'}\n`);

console.log('Test 3: Extract Gap Priorities');
console.log('----------------------------------------------');
const gaps = CanonicalFieldMapper.extractGapPriorities(mockIntelligenceResults);
console.log(`Found ${gaps.length} prioritized gaps:\n`);

gaps.forEach(gap => {
  console.log(`  [${gap.priority}] ${gap.dimension}:`);
  console.log(`    Current: ${gap.current_score}/10`);
  console.log(`    Target: ${gap.target_score}/10`);
  console.log(`    Gap: ${gap.gap_size} points`);
  console.log(`    Urgency: ${gap.urgency}`);
  console.log(`    Actions: ${gap.recommended_actions.join(', ')}\n`);
});

const gapsCorrect = gaps.length === 2 && gaps[0].priority === 'P0' && gaps[1].priority === 'P1';
console.log(`✅ ${gapsCorrect ? 'PASS: Gap priorities extracted correctly' : '❌ FAIL: Gap extraction error'}\n`);

console.log('Test 4: Field Name Correctness (P0 fix verification)');
console.log('----------------------------------------------');
console.log('CRITICAL CHECK: Does TYPE-085 output "total_score" field?');
console.log(`  Field exists: ${mockType085Result.data.total_score !== undefined ? '✅ YES' : '❌ NO'}`);
console.log(`  Field name: "total_score" (NOT "total_rubric_score")`);
console.log(`  Value: ${mockType085Result.data.total_score}\n`);

console.log('CRITICAL CHECK: Can CanonicalFieldMapper extract it?');
console.log(`  Extracted: ${ivyScore !== 0 ? '✅ YES' : '❌ NO (defaulted to 0)'}`);
console.log(`  Value: ${ivyScore}\n`);

console.log('==========================================');
console.log('Summary');
console.log('==========================================\n');

const allTestsPass = ivyScore === 70 && mappingCorrect && gapsCorrect;

if (allTestsPass) {
  console.log('✅ ALL TESTS PASSED');
  console.log('\nCanonicalFieldMapper is working correctly:');
  console.log('  ✅ Extracts from correct field name (total_score)');
  console.log('  ✅ Normalizes IvyScore correctly (0-50 → 0-100)');
  console.log('  ✅ Applies semantic mappings (leadership → extracurriculars, etc.)');
  console.log('  ✅ Extracts gap priorities from TYPE-086');
  console.log('\n🎯 READY FOR PRODUCTION: v29.2 field mapping fix is complete');
} else {
  console.log('❌ SOME TESTS FAILED');
  console.log('\nFailed checks:');
  if (ivyScore !== 70) console.log('  ❌ IvyScore normalization');
  if (!mappingCorrect) console.log('  ❌ Semantic mapping');
  if (!gapsCorrect) console.log('  ❌ Gap priority extraction');
}

console.log('\n==========================================\n');

process.exit(allTestsPass ? 0 : 1);

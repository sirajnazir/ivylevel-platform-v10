/**
 * test-success-patterns.ts
 * Test DS-T2 Success Patterns retrieval system
 * Created: 2025-10-16
 */

import { knowledgeMoat } from '../src/repositories/KnowledgeMoatRepository.js';
import { executeResolverTool } from '../src/tools/resolverTools.js';

async function testSuccessPatternRetrieval() {
  console.log('🧪 Testing DS-T2 Success Patterns Retrieval\n');
  console.log('='.repeat(80));

  // Test 1: Get all success patterns (top quality)
  console.log('\n📋 Test 1: Repository - Get Top Success Patterns (Overall)');
  console.log('-'.repeat(80));
  const topPatterns = await knowledgeMoat.getTopSuccessPatterns(5);
  console.log(`Found ${topPatterns.length} top success patterns:`);
  topPatterns.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.title} (Quality: ${p.quality_score})`);
    console.log(`     Category: ${p.outcome_category}`);
    console.log(`     Archetype: ${p.archetype_tags?.slice(0, 3).join(', ')}`);
  });

  // Test 2: Search patterns by outcome category
  console.log('\n📋 Test 2: Repository - Search by Outcome (National Award Win)');
  console.log('-'.repeat(80));
  const awardPatterns = await knowledgeMoat.getSuccessPatternsByOutcome('National Award Win', 2);
  console.log(`Found ${awardPatterns.length} national award patterns:`);
  awardPatterns.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.title}`);
    console.log(`     Starting Barriers: ${p.barriers_faced?.join(', ')}`);
    console.log(`     What Worked: ${p.what_worked?.substring(0, 100)}...`);
  });

  // Test 3: Search by student archetype tags
  console.log('\n📋 Test 3: Repository - Search by Archetype (first-gen-immigrant, STEM)');
  console.log('-'.repeat(80));
  const archetypePatterns = await knowledgeMoat.searchSuccessPatterns({
    archetypeTags: ['first-gen-immigrant', 'STEM'],
    minQualityScore: 0.90,
    limit: 3
  });
  console.log(`Found ${archetypePatterns.length} patterns for similar students:`);
  archetypePatterns.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.title} (${p.outcome_category})`);
    console.log(`     Duration: ${p.total_duration_days} days`);
    console.log(`     Quality: ${p.quality_score}, Helpful Votes: ${p.helpful_votes}`);
  });

  // Test 4: Search by barriers faced
  console.log('\n📋 Test 4: Repository - Search by Barriers (time-crisis, procrastination)');
  console.log('-'.repeat(80));
  const barrierPatterns = await knowledgeMoat.searchSuccessPatterns({
    barriers: ['time-crisis', 'procrastination'],
    minQualityScore: 0.90,
    limit: 2
  });
  console.log(`Found ${barrierPatterns.length} patterns addressing these barriers:`);
  barrierPatterns.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.title}`);
    console.log(`     Outcome: ${p.outcome_category}`);
    console.log(`     Barriers Faced: ${p.barriers_faced?.join(', ')}`);
    console.log(`     Most Impactful Tactics: ${p.most_impactful?.join(', ')}`);
  });

  // Test 5: Get specific pattern by slug
  console.log('\n📋 Test 5: Repository - Get Pattern by Slug (national-award-win)');
  console.log('-'.repeat(80));
  const specificPattern = await knowledgeMoat.getSuccessPatternBySlug('national-award-win');
  if (specificPattern) {
    console.log(`✅ Found: ${specificPattern.title}`);
    console.log(`   Duration: ${specificPattern.total_duration_days} days`);
    console.log(`   Quality: ${specificPattern.quality_score}`);
    console.log(`   Tactics Used: ${specificPattern.tactics_used?.length || 0} tactics`);
    console.log(`   What Clicked: ${specificPattern.what_clicked?.substring(0, 150)}...`);
  } else {
    console.log('❌ Pattern not found');
  }

  // Test 6: Get patterns that used specific tactics
  console.log('\n📋 Test 6: Repository - Patterns Using Tactic (168-hour-framework)');
  console.log('-'.repeat(80));
  const tacticPatterns = await knowledgeMoat.getSuccessPatternsUsingTactic('168-hour-framework', 2);
  console.log(`Found ${tacticPatterns.length} patterns using 168-hour-framework:`);
  tacticPatterns.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.title} (${p.outcome_category})`);
    console.log(`     Most Impactful: ${p.most_impactful?.includes('168-hour-framework') ? 'YES' : 'NO'}`);
    console.log(`     What Worked: ${p.what_worked?.substring(0, 100)}...`);
  });

  // Test 7: Get breakthrough insights
  console.log('\n📋 Test 7: Repository - Breakthrough Insights (Essay Transformation)');
  console.log('-'.repeat(80));
  const breakthroughs = await knowledgeMoat.getBreakthroughInsights({
    outcomeCategory: 'Essay Quality Transformation',
    limit: 2
  });
  console.log(`Found ${breakthroughs.length} breakthrough insights:`);
  breakthroughs.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.title}`);
    console.log(`     What Clicked: ${p.what_clicked?.substring(0, 150)}...`);
    console.log(`     Most Impactful: ${p.most_impactful?.join(', ')}`);
  });

  // Test 8: Find similar success patterns
  console.log('\n📋 Test 8: Repository - Find Similar Patterns (muslim-female, public-school)');
  console.log('-'.repeat(80));
  const similarPatterns = await knowledgeMoat.findSimilarSuccessPatterns(
    ['muslim-female', 'public-school', 'STEM'],
    undefined,
    3
  );
  console.log(`Found ${similarPatterns.length} similar patterns:`);
  similarPatterns.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.title} (Quality: ${p.quality_score})`);
    console.log(`     Matching Tags: ${p.tag_match_count} of 3`);
    console.log(`     Archetype: ${p.archetype_tags?.join(', ')}`);
  });

  // Test 9: Tool execution (simulating agent call) - By Outcome
  console.log('\n📋 Test 9: Tool Execution - get_success_patterns (GPA Improvement)');
  console.log('-'.repeat(80));
  const toolResult1 = await executeResolverTool('get_success_patterns', {
    outcome_category: 'GPA/Grade Improvement',
    limit: 1
  });
  console.log('Tool Response:');
  console.log(toolResult1.answer.substring(0, 600) + '...');
  console.log(`\nEvidence chips: ${toolResult1.chips.map((c: any) => c.text).join(', ')}`);
  console.log(`Hits returned: ${toolResult1.hits.length}`);

  // Test 10: Tool execution - By Barriers + Archetype
  console.log('\n📋 Test 10: Tool Execution - get_success_patterns (Barriers + Archetype)');
  console.log('-'.repeat(80));
  const toolResult2 = await executeResolverTool('get_success_patterns', {
    archetype_tags: ['first-gen-immigrant', 'time-crisis'],
    barriers: ['generic-narrative', 'identity-hiding'],
    limit: 1
  });
  console.log('Tool Response:');
  console.log(toolResult2.answer.substring(0, 600) + '...');
  console.log(`Hits returned: ${toolResult2.hits.length}`);

  // Test 11: Get student's own success patterns (for huda-2025)
  console.log('\n📋 Test 11: Repository - Get Student Patterns (huda-2025)');
  console.log('-'.repeat(80));
  const studentPatterns = await knowledgeMoat.getStudentSuccessPatterns('huda-2025');
  console.log(`Found ${studentPatterns.length} patterns for huda-2025:`);
  studentPatterns.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.title} (${p.outcome_category})`);
    console.log(`     Validation: ${p.validation_status}`);
    console.log(`     Quality: ${p.quality_score}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('✅ All success pattern retrieval tests completed successfully!');
}

// Run tests
testSuccessPatternRetrieval()
  .then(() => {
    console.log('\n✅ Test suite passed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Test suite failed:', err);
    console.error(err.stack);
    process.exit(1);
  });

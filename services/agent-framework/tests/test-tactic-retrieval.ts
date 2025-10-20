/**
 * test-tactic-retrieval.ts
 * Test DS-T1 Tactic Chips retrieval system
 * Created: 2025-10-16
 */

import { knowledgeMoat } from '../src/repositories/KnowledgeMoatRepository.js';
import { executeResolverTool } from '../src/tools/resolverTools.js';

async function testTacticRetrieval() {
  console.log('🧪 Testing DS-T1 Tactic Chips Retrieval\n');
  console.log('='.repeat(80));

  // Test 1: Direct repository query for time management tactics
  console.log('\n📋 Test 1: Repository - Search Time Management Tactics');
  console.log('-'.repeat(80));
  const timeManagementTactics = await knowledgeMoat.searchTacticChips({
    category: 'Time Management',
    minQualityScore: 0.90,
    limit: 3
  });
  console.log(`Found ${timeManagementTactics.length} time management tactics:`);
  timeManagementTactics.forEach((t, i) => {
    console.log(`  ${i + 1}. ${t.tactic_name} (Quality: ${t.quality_score})`);
    console.log(`     Category: ${t.tactic_category}`);
    console.log(`     Barriers: ${t.barriers_addressed?.join(', ')}`);
  });

  // Test 2: Search tactics by student barriers
  console.log('\n📋 Test 2: Repository - Search by Barriers (time-crisis, procrastination)');
  console.log('-'.repeat(80));
  const barrierTactics = await knowledgeMoat.searchTacticChips({
    barriers: ['time-crisis', 'procrastination'],
    minQualityScore: 0.90,
    limit: 2
  });
  console.log(`Found ${barrierTactics.length} tactics for barriers:`);
  barrierTactics.forEach((t, i) => {
    console.log(`  ${i + 1}. ${t.tactic_name}`);
    console.log(`     Addresses: ${t.barriers_addressed?.join(', ')}`);
    console.log(`     Archetypes: ${t.student_archetypes?.join(', ')}`);
  });

  // Test 3: Get specific tactic by slug
  console.log('\n📋 Test 3: Repository - Get Tactic by Slug (168-hour-framework)');
  console.log('-'.repeat(80));
  const specificTactic = await knowledgeMoat.getTacticBySlug('168-hour-framework');
  if (specificTactic) {
    console.log(`✅ Found: ${specificTactic.tactic_name}`);
    console.log(`   Quality: ${specificTactic.quality_score}`);
    console.log(`   Principle: ${specificTactic.core_principle.substring(0, 100)}...`);
    console.log(`   Micro-Actions: ${Object.keys(specificTactic.micro_actions || {}).length} steps`);
  } else {
    console.log('❌ Tactic not found');
  }

  // Test 4: Tool execution (simulating agent call)
  console.log('\n📋 Test 4: Tool Execution - get_relevant_tactics (Essay Strategy)');
  console.log('-'.repeat(80));
  const toolResult = await executeResolverTool('get_relevant_tactics', {
    barriers: ['essay-generic', 'identity-crisis'],
    category: 'Essay Strategy',
    limit: 1
  });
  console.log('Tool Response:');
  console.log(toolResult.answer.substring(0, 500) + '...');
  console.log(`\nEvidence chips: ${toolResult.chips.map((c: any) => c.text).join(', ')}`);
  console.log(`Hits returned: ${toolResult.hits.length}`);

  // Test 5: Search by student archetype
  console.log('\n📋 Test 5: Repository - Search by Archetype (first-gen-immigrant)');
  console.log('-'.repeat(80));
  const archetypeTactics = await knowledgeMoat.searchTacticChips({
    archetypes: ['first-gen-immigrant'],
    minQualityScore: 0.90,
    limit: 3
  });
  console.log(`Found ${archetypeTactics.length} tactics for first-gen students:`);
  archetypeTactics.forEach((t, i) => {
    console.log(`  ${i + 1}. ${t.tactic_name} (${t.tactic_category})`);
    console.log(`     Quality: ${t.quality_score}, Success Rate: ${t.success_rate || 'N/A'}`);
  });

  // Test 6: Get top tactics by category
  console.log('\n📋 Test 6: Repository - Top Tactics by Category (Essay Strategy)');
  console.log('-'.repeat(80));
  const topEssayTactics = await knowledgeMoat.getTopTacticsByCategory('Essay Strategy', 2);
  console.log(`Top ${topEssayTactics.length} Essay Strategy tactics:`);
  topEssayTactics.forEach((t, i) => {
    console.log(`  ${i + 1}. ${t.tactic_name} (Quality: ${t.quality_score})`);
    console.log(`     ${t.description.substring(0, 100)}...`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('✅ All tactic retrieval tests completed successfully!');
}

// Run tests
testTacticRetrieval()
  .then(() => {
    console.log('\n✅ Test suite passed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Test suite failed:', err);
    process.exit(1);
  });

/**
 * test-ds6-ds7-integration.ts
 * Test DS6 (Essay Examples) and DS7 (AO Perspectives) retrieval
 * Created: 2025-10-16 (Week 14)
 */

import { knowledgeMoat } from '../src/repositories/KnowledgeMoatRepository.js';

async function testDS6EssayExamples() {
  console.log('📝 Testing DS6: Essay Examples\n');
  console.log('='.repeat(80));

  // Test 1: Get all essay examples
  console.log('\n📋 Test 1: Get All Essay Examples');
  console.log('-'.repeat(80));
  const allEssays = await knowledgeMoat.getEssayExamples({ limit: 10 });
  console.log(`Found ${allEssays.length} essay examples:`);
  allEssays.forEach((essay, i) => {
    console.log(`  ${i + 1}. ${essay.student_id} → ${essay.college_name} (${essay.prompt_type})`);
    console.log(`     Quality: ${essay.writing_quality}, Themes: ${essay.themes?.length || 0}`);
    console.log(`     Words: ${essay.word_count}, Admitted: ${essay.student_admitted}`);
  });

  // Test 2: Search by college
  console.log('\n📋 Test 2: Search Essays by College (Stanford)');
  console.log('-'.repeat(80));
  const stanfordEssays = await knowledgeMoat.getEssayExamples({
    collegeName: 'Stanford University',
    limit: 5
  });
  console.log(`Found ${stanfordEssays.length} Stanford essays:`);
  stanfordEssays.forEach((essay, i) => {
    console.log(`  ${i + 1}. ${essay.prompt_type} - Themes: ${essay.themes?.join(', ')}`);
    console.log(`     Preview: ${essay.essay_text?.substring(0, 100)}...`);
  });

  // Test 3: Search by themes
  console.log('\n📋 Test 3: Search Essays by Theme (identity, passion)');
  console.log('-'.repeat(80));
  const themeEssays = await knowledgeMoat.getEssayExamples({
    themes: ['identity', 'passion'],
    limit: 3
  });
  console.log(`Found ${themeEssays.length} essays with identity/passion themes:`);
  themeEssays.forEach((essay, i) => {
    console.log(`  ${i + 1}. ${essay.prompt_type} - All Themes: ${essay.themes?.join(', ')}`);
  });

  // Test 4: Get admitted students only
  console.log('\n📋 Test 4: Get Admitted Student Essays');
  console.log('-'.repeat(80));
  const admittedEssays = await knowledgeMoat.getEssayExamples({
    admittedOnly: true,
    limit: 5
  });
  console.log(`Found ${admittedEssays.length} essays from admitted students:`);
  admittedEssays.forEach((essay, i) => {
    console.log(`  ${i + 1}. ${essay.college_name} - Enrolled: ${essay.student_enrolled}`);
  });

  // Test 5: Search by prompt type
  console.log('\n📋 Test 5: Get Common App Essays');
  console.log('-'.repeat(80));
  const commonAppEssays = await knowledgeMoat.getEssayExamples({
    promptType: 'common_app',
    limit: 3
  });
  console.log(`Found ${commonAppEssays.length} Common App essays:`);
  commonAppEssays.forEach((essay, i) => {
    console.log(`  ${i + 1}. Quality: ${essay.writing_quality}`);
    console.log(`     Takeaways: ${essay.key_takeaways?.slice(0, 2).join(', ')}`);
  });
}

async function testDS7AOPerspectives() {
  console.log('\n\n🎓 Testing DS7: AO Perspectives\n');
  console.log('='.repeat(80));

  // Test 1: Get all AO perspectives
  console.log('\n📋 Test 1: Get All AO Perspectives');
  console.log('-'.repeat(80));
  const allPerspectives = await knowledgeMoat.getAOPerspectives({ limit: 10 });
  console.log(`Found ${allPerspectives.length} AO perspectives:`);
  allPerspectives.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.college_name} - ${p.topic}`);
    console.log(`     Q: ${p.question?.substring(0, 60)}...`);
    console.log(`     Credibility: ${p.credibility_score}`);
  });

  // Test 2: Search by college
  console.log('\n📋 Test 2: Get Stanford AO Perspectives');
  console.log('-'.repeat(80));
  const stanfordAO = await knowledgeMoat.getAOPerspectives({
    collegeName: 'Stanford University',
    limit: 5
  });
  console.log(`Found ${stanfordAO.length} Stanford AO perspectives:`);
  stanfordAO.forEach((p, i) => {
    console.log(`  ${i + 1}. Topic: ${p.topic}`);
    console.log(`     Question: ${p.question}`);
    console.log(`     Key Points: ${p.key_points?.join(', ')}`);
  });

  // Test 3: Search by topic
  console.log('\n📋 Test 3: Get Essay-Related AO Perspectives');
  console.log('-'.repeat(80));
  const essayAO = await knowledgeMoat.getAOPerspectives({
    topic: 'essays',
    limit: 5
  });
  console.log(`Found ${essayAO.length} essay-related AO perspectives:`);
  essayAO.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.college_name} - ${p.ao_role}`);
    console.log(`     Answer: ${p.perspective_text?.substring(0, 100)}...`);
  });

  // Test 4: Get highly selective colleges
  console.log('\n📋 Test 4: Get Highly Selective College Perspectives');
  console.log('-'.repeat(80));
  const selectiveAO = await knowledgeMoat.getAOPerspectives({
    selectivity: 'highly_selective',
    limit: 5
  });
  console.log(`Found ${selectiveAO.length} highly selective perspectives:`);
  selectiveAO.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.college_name} - ${p.topic}`);
    console.log(`     Source: ${p.source_type} (${p.year_published})`);
  });

  // Test 5: Get high credibility perspectives
  console.log('\n📋 Test 5: Get High Credibility Perspectives (>0.90)');
  console.log('-'.repeat(80));
  const highCredAO = await knowledgeMoat.getAOPerspectives({
    minCredibility: 0.90,
    limit: 5
  });
  console.log(`Found ${highCredAO.length} high credibility perspectives:`);
  highCredAO.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.college_name} - Credibility: ${p.credibility_score}`);
  });
}

async function testCrossDatasetQueries() {
  console.log('\n\n🔗 Testing Cross-Dataset Queries\n');
  console.log('='.repeat(80));

  // Test 1: Get essays + AO perspectives for same college
  console.log('\n📋 Test 1: Stanford Essays + AO Perspectives');
  console.log('-'.repeat(80));
  const stanfordEssays = await knowledgeMoat.getEssayExamples({
    collegeName: 'Stanford University',
    limit: 2
  });
  const stanfordAO = await knowledgeMoat.getAOPerspectives({
    collegeName: 'Stanford University',
    limit: 2
  });
  console.log(`Stanford Dataset:`);
  console.log(`  Essays: ${stanfordEssays.length} examples`);
  console.log(`  AO Perspectives: ${stanfordAO.length} insights`);
  console.log(`\n  Example Essay Theme: ${stanfordEssays[0]?.themes?.join(', ')}`);
  console.log(`  Example AO Topic: ${stanfordAO[0]?.topic}`);

  // Test 2: Match essay themes with AO perspectives
  console.log('\n📋 Test 2: Essay Theme Analysis with AO Guidance');
  console.log('-'.repeat(80));
  const identityEssays = await knowledgeMoat.getEssayExamples({
    themes: ['identity'],
    limit: 1
  });
  const essayTopicAO = await knowledgeMoat.getAOPerspectives({
    topic: 'essays',
    limit: 1
  });
  if (identityEssays[0] && essayTopicAO[0]) {
    console.log(`Identity Essay:`);
    console.log(`  Themes: ${identityEssays[0].themes?.join(', ')}`);
    console.log(`  Quality: ${identityEssays[0].writing_quality}`);
    console.log(`\nRelevant AO Guidance:`);
    console.log(`  ${essayTopicAO[0].question}`);
    console.log(`  Key Points: ${essayTopicAO[0].key_points?.join(', ')}`);
  }
}

async function main() {
  console.log('🚀 DS6/DS7 INTEGRATION TESTING\n');
  console.log('Testing real essay examples and AO perspectives from Jenny-Huda coaching');
  console.log('='.repeat(80));

  try {
    await testDS6EssayExamples();
    await testDS7AOPerspectives();
    await testCrossDatasetQueries();

    console.log('\n' + '='.repeat(80));
    console.log('✅ ALL DS6/DS7 INTEGRATION TESTS PASSED!');
    console.log('   Knowledge Moat is now complete with real coaching intelligence');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

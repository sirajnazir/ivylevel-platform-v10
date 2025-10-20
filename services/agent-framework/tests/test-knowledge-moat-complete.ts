/**
 * test-knowledge-moat-complete.ts
 * Comprehensive validation of ALL Knowledge Moat datasets (DS1-DS8) with real Jenny-Huda data
 * Created: 2025-10-16 (Week 14)
 */

import { knowledgeMoat } from '../src/repositories/KnowledgeMoatRepository.js';
import { pool } from '../src/db.js';

interface TestResult {
  dataset: string;
  description: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  dataCount: number;
  error?: string;
}

const results: TestResult[] = [];

async function testDS1_CDS() {
  console.log('\n📊 DS1: Common Data Set (CDS) - College Benchmarks');
  console.log('='.repeat(80));

  try {
    const cds = await knowledgeMoat.getCDSData({ collegeId: 'stanford', limit: 1 });

    if (cds.length === 0) {
      results.push({
        dataset: 'DS1',
        description: 'CDS College Benchmarks',
        status: 'SKIP',
        dataCount: 0,
        error: 'No CDS data loaded yet'
      });
      console.log('⚠️  DS1: No data (not yet loaded for v1.0)');
      return;
    }

    console.log(`✅ Found ${cds.length} CDS records`);
    console.log(`   Sample: ${cds[0].college_name} - Acceptance Rate: ${cds[0].acceptance_rate}`);

    results.push({
      dataset: 'DS1',
      description: 'CDS College Benchmarks',
      status: 'PASS',
      dataCount: cds.length
    });
  } catch (error: any) {
    console.log(`❌ DS1 Failed: ${error.message}`);
    results.push({
      dataset: 'DS1',
      description: 'CDS College Benchmarks',
      status: 'FAIL',
      dataCount: 0,
      error: error.message
    });
  }
}

async function testDS2_Rubrics() {
  console.log('\n📋 DS2: Rubric Factors - What Colleges Value');
  console.log('='.repeat(80));

  try {
    const rubrics = await knowledgeMoat.getRubricFactors({ collegeId: 'stanford', limit: 5 });

    if (rubrics.length === 0) {
      results.push({
        dataset: 'DS2',
        description: 'Rubric Factors',
        status: 'SKIP',
        dataCount: 0,
        error: 'No rubric data loaded yet'
      });
      console.log('⚠️  DS2: No data (not yet loaded for v1.0)');
      return;
    }

    console.log(`✅ Found ${rubrics.length} rubric factors`);
    rubrics.forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.factor_name} (${r.importance})`);
    });

    results.push({
      dataset: 'DS2',
      description: 'Rubric Factors',
      status: 'PASS',
      dataCount: rubrics.length
    });
  } catch (error: any) {
    console.log(`❌ DS2 Failed: ${error.message}`);
    results.push({
      dataset: 'DS2',
      description: 'Rubric Factors',
      status: 'FAIL',
      dataCount: 0,
      error: error.message
    });
  }
}

async function testDS3_SchoolProfiles() {
  console.log('\n🏫 DS3: School Profiles - Hyperlocal Context');
  console.log('='.repeat(80));

  try {
    const profiles = await knowledgeMoat.getSchoolProfiles({ limit: 3 });

    if (profiles.length === 0) {
      results.push({
        dataset: 'DS3',
        description: 'School Profiles',
        status: 'SKIP',
        dataCount: 0,
        error: 'No school profile data loaded yet'
      });
      console.log('⚠️  DS3: No data (not yet loaded for v1.0)');
      return;
    }

    console.log(`✅ Found ${profiles.length} school profiles`);
    profiles.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.school_name} (${p.competitiveness_tier})`);
    });

    results.push({
      dataset: 'DS3',
      description: 'School Profiles',
      status: 'PASS',
      dataCount: profiles.length
    });
  } catch (error: any) {
    console.log(`❌ DS3 Failed: ${error.message}`);
    results.push({
      dataset: 'DS3',
      description: 'School Profiles',
      status: 'FAIL',
      dataCount: 0,
      error: error.message
    });
  }
}

async function testDS4_NavianceScattergrams() {
  console.log('\n📈 DS4: Naviance Scattergrams - Real Admission Data');
  console.log('='.repeat(80));

  try {
    const scattergrams = await knowledgeMoat.getNavianceData({
      collegeId: 'stanford',
      limit: 5
    });

    if (scattergrams.length === 0) {
      results.push({
        dataset: 'DS4',
        description: 'Naviance Scattergrams',
        status: 'SKIP',
        dataCount: 0,
        error: 'No Naviance data loaded yet'
      });
      console.log('⚠️  DS4: No data (not yet loaded for v1.0)');
      return;
    }

    console.log(`✅ Found ${scattergrams.length} Naviance data points`);

    results.push({
      dataset: 'DS4',
      description: 'Naviance Scattergrams',
      status: 'PASS',
      dataCount: scattergrams.length
    });
  } catch (error: any) {
    console.log(`❌ DS4 Failed: ${error.message}`);
    results.push({
      dataset: 'DS4',
      description: 'Naviance Scattergrams',
      status: 'FAIL',
      dataCount: 0,
      error: error.message
    });
  }
}

async function testDS5_PastStudents() {
  console.log('\n👥 DS5: Past Student Outcomes - Historical Data');
  console.log('='.repeat(80));

  try {
    const students = await knowledgeMoat.getPastStudentOutcomes({
      collegeId: 'stanford',
      limit: 5
    });

    if (students.length === 0) {
      results.push({
        dataset: 'DS5',
        description: 'Past Student Outcomes',
        status: 'SKIP',
        dataCount: 0,
        error: 'No past student data loaded yet'
      });
      console.log('⚠️  DS5: No data (not yet loaded for v1.0)');
      return;
    }

    console.log(`✅ Found ${students.length} past student outcomes`);

    results.push({
      dataset: 'DS5',
      description: 'Past Student Outcomes',
      status: 'PASS',
      dataCount: students.length
    });
  } catch (error: any) {
    console.log(`❌ DS5 Failed: ${error.message}`);
    results.push({
      dataset: 'DS5',
      description: 'Past Student Outcomes',
      status: 'FAIL',
      dataCount: 0,
      error: error.message
    });
  }
}

async function testDS6_EssayExamples() {
  console.log('\n📝 DS6: Essay Examples - Real Successful Essays');
  console.log('='.repeat(80));

  try {
    const essays = await knowledgeMoat.getEssayExamples({ limit: 5 });

    if (essays.length === 0) {
      throw new Error('No essay examples found');
    }

    console.log(`✅ Found ${essays.length} essay examples`);
    essays.forEach((e, i) => {
      console.log(`   ${i + 1}. ${e.college_name} (${e.prompt_type}) - Themes: ${e.themes?.join(', ')}`);
      console.log(`      Quality: ${e.writing_quality}, Admitted: ${e.student_admitted}`);
    });

    results.push({
      dataset: 'DS6',
      description: 'Essay Examples (Real Jenny-Huda Data)',
      status: 'PASS',
      dataCount: essays.length
    });
  } catch (error: any) {
    console.log(`❌ DS6 Failed: ${error.message}`);
    results.push({
      dataset: 'DS6',
      description: 'Essay Examples',
      status: 'FAIL',
      dataCount: 0,
      error: error.message
    });
  }
}

async function testDS7_AOPerspectives() {
  console.log('\n🎓 DS7: AO Perspectives - Admissions Officer Intelligence');
  console.log('='.repeat(80));

  try {
    const perspectives = await knowledgeMoat.getAOPerspectives({ limit: 5 });

    if (perspectives.length === 0) {
      throw new Error('No AO perspectives found');
    }

    console.log(`✅ Found ${perspectives.length} AO perspectives`);
    perspectives.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.college_name} - ${p.topic} (Credibility: ${p.credibility_score})`);
      console.log(`      Q: ${p.question?.substring(0, 60)}...`);
    });

    results.push({
      dataset: 'DS7',
      description: 'AO Perspectives (Real Coaching Intelligence)',
      status: 'PASS',
      dataCount: perspectives.length
    });
  } catch (error: any) {
    console.log(`❌ DS7 Failed: ${error.message}`);
    results.push({
      dataset: 'DS7',
      description: 'AO Perspectives',
      status: 'FAIL',
      dataCount: 0,
      error: error.message
    });
  }
}

async function testDS8_MentorAdvice() {
  console.log('\n💡 DS8: Mentor Advice - Expert Guidance');
  console.log('='.repeat(80));

  try {
    const advice = await knowledgeMoat.getMentorAdvice({ limit: 5 });

    if (advice.length === 0) {
      results.push({
        dataset: 'DS8',
        description: 'Mentor Advice',
        status: 'SKIP',
        dataCount: 0,
        error: 'No mentor advice loaded yet'
      });
      console.log('⚠️  DS8: No data (not yet loaded for v1.0)');
      return;
    }

    console.log(`✅ Found ${advice.length} mentor advice entries`);

    results.push({
      dataset: 'DS8',
      description: 'Mentor Advice',
      status: 'PASS',
      dataCount: advice.length
    });
  } catch (error: any) {
    console.log(`❌ DS8 Failed: ${error.message}`);
    results.push({
      dataset: 'DS8',
      description: 'Mentor Advice',
      status: 'FAIL',
      dataCount: 0,
      error: error.message
    });
  }
}

async function testDST1_TacticChips() {
  console.log('\n🧩 DS-T1: Tactic Chips - Actionable Tactics');
  console.log('='.repeat(80));

  try {
    const tactics = await knowledgeMoat.searchTacticChips({ limit: 10 });

    if (tactics.length === 0) {
      throw new Error('No tactic chips found');
    }

    console.log(`✅ Found ${tactics.length} tactic chips`);
    console.log(`   Sample tactics: ${tactics.slice(0, 3).map(t => t.tactic_name).join(', ')}`);

    results.push({
      dataset: 'DS-T1',
      description: 'Tactic Chips (Real Coaching Tactics)',
      status: 'PASS',
      dataCount: tactics.length
    });
  } catch (error: any) {
    console.log(`❌ DS-T1 Failed: ${error.message}`);
    results.push({
      dataset: 'DS-T1',
      description: 'Tactic Chips',
      status: 'FAIL',
      dataCount: 0,
      error: error.message
    });
  }
}

async function testDST2_SuccessPatterns() {
  console.log('\n🎯 DS-T2: Success Patterns - Proven Journeys');
  console.log('='.repeat(80));

  try {
    const patterns = await knowledgeMoat.getTopSuccessPatterns(5);

    if (patterns.length === 0) {
      throw new Error('No success patterns found');
    }

    console.log(`✅ Found ${patterns.length} success patterns`);
    patterns.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.title} (${p.outcome_category}) - Quality: ${p.quality_score}`);
    });

    results.push({
      dataset: 'DS-T2',
      description: 'Success Patterns (Real Jenny-Huda Journeys)',
      status: 'PASS',
      dataCount: patterns.length
    });
  } catch (error: any) {
    console.log(`❌ DS-T2 Failed: ${error.message}`);
    results.push({
      dataset: 'DS-T2',
      description: 'Success Patterns',
      status: 'FAIL',
      dataCount: 0,
      error: error.message
    });
  }
}

async function generateSummaryReport() {
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 KNOWLEDGE MOAT VALIDATION SUMMARY');
  console.log('='.repeat(80));

  const passed = results.filter(r => r.status === 'PASS');
  const failed = results.filter(r => r.status === 'FAIL');
  const skipped = results.filter(r => r.status === 'SKIP');

  console.log(`\n✅ PASSED: ${passed.length}`);
  passed.forEach(r => {
    console.log(`   ${r.dataset}: ${r.description} (${r.dataCount} records)`);
  });

  if (skipped.length > 0) {
    console.log(`\n⚠️  SKIPPED: ${skipped.length} (Not yet implemented for v1.0)`);
    skipped.forEach(r => {
      console.log(`   ${r.dataset}: ${r.description}`);
    });
  }

  if (failed.length > 0) {
    console.log(`\n❌ FAILED: ${failed.length}`);
    failed.forEach(r => {
      console.log(`   ${r.dataset}: ${r.description}`);
      console.log(`      Error: ${r.error}`);
    });
  }

  const totalDataPoints = results
    .filter(r => r.status === 'PASS')
    .reduce((sum, r) => sum + r.dataCount, 0);

  console.log('\n' + '='.repeat(80));
  console.log(`Total Datasets Tested: ${results.length}`);
  console.log(`Datasets with Data: ${passed.length}`);
  console.log(`Total Data Points: ${totalDataPoints}`);
  console.log(`Real Jenny-Huda Data: DS6 (${passed.find(r => r.dataset === 'DS6')?.dataCount || 0}), DS7 (${passed.find(r => r.dataset === 'DS7')?.dataCount || 0}), DS-T1, DS-T2`);
  console.log('='.repeat(80));

  const criticalDatasets = ['DS6', 'DS7', 'DS-T1', 'DS-T2'];
  const criticalPassed = passed.filter(r => criticalDatasets.includes(r.dataset));

  if (criticalPassed.length === criticalDatasets.length) {
    console.log('\n✅ CRITICAL DATASETS: ALL OPERATIONAL');
    console.log('   Knowledge Moat is PRODUCTION-READY for Jenny-Huda use case');
  } else {
    console.log('\n⚠️  CRITICAL DATASETS: Some missing');
    console.log('   Missing:', criticalDatasets.filter(ds => !criticalPassed.find(p => p.dataset === ds)));
  }

  return failed.length === 0;
}

async function main() {
  console.log('🚀 COMPREHENSIVE KNOWLEDGE MOAT VALIDATION');
  console.log('Testing ALL datasets (DS1-DS8 + DS-T1/T2) with real Jenny-Huda data');
  console.log('='.repeat(80));

  try {
    await testDS1_CDS();
    await testDS2_Rubrics();
    await testDS3_SchoolProfiles();
    await testDS4_NavianceScattergrams();
    await testDS5_PastStudents();
    await testDS6_EssayExamples();
    await testDS7_AOPerspectives();
    await testDS8_MentorAdvice();
    await testDST1_TacticChips();
    await testDST2_SuccessPatterns();

    const success = await generateSummaryReport();

    if (!success) {
      process.exit(1);
    }

  } catch (error: any) {
    console.error('\n❌ Validation failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

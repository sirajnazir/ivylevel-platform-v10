// Golden tests for temporal SAT fact resolution
const { Pool } = require('pg');
const { resolveFact } = require('../../../../services/jenny-api/dist/services/facts');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testTemporalSAT() {
  const studentId = 'huda-2025';
  const results = {};

  // Test 1: First SAT score (earliest)
  const firstSAT = await resolveFact(pool, {
    student_id: studentId,
    kind: 'sat_total_score',
    temporal: 'earliest',
    modality: 'any'
  });
  results['first_sat'] = {
    expected: 1360,
    actual: firstSAT.row?.numeric_value,
    date: firstSAT.row?.fact_date,
    why: firstSAT.why
  };

  // Test 2: First official SAT score
  const firstOfficialSAT = await resolveFact(pool, {
    student_id: studentId,
    kind: 'sat_total_score',
    temporal: 'earliest',
    modality: 'official'
  });
  results['first_official_sat'] = {
    expected: 1480,
    actual: firstOfficialSAT.row?.numeric_value,
    date: firstOfficialSAT.row?.fact_date,
    why: firstOfficialSAT.why
  };

  // Test 3: Last SAT score (latest)
  const lastSAT = await resolveFact(pool, {
    student_id: studentId,
    kind: 'sat_total_score',
    temporal: 'latest',
    modality: 'any'
  });
  results['last_sat'] = {
    expected: 1530,
    actual: lastSAT.row?.numeric_value,
    date: lastSAT.row?.fact_date,
    why: lastSAT.why
  };

  // Test 4: Lowest SAT score (min)
  const lowestSAT = await resolveFact(pool, {
    student_id: studentId,
    kind: 'sat_total_score',
    temporal: 'min',
    modality: 'any'
  });
  results['lowest_sat'] = {
    expected: 1360,
    actual: lowestSAT.row?.numeric_value,
    date: lowestSAT.row?.fact_date,
    why: lowestSAT.why
  };

  // Test 5: Highest SAT score (max)
  const highestSAT = await resolveFact(pool, {
    student_id: studentId,
    kind: 'sat_total_score',
    temporal: 'max',
    modality: 'any'
  });
  results['highest_sat'] = {
    expected: 1530,
    actual: highestSAT.row?.numeric_value,
    date: highestSAT.row?.fact_date,
    why: highestSAT.why
  };

  // Print results
  console.log('=== Temporal SAT Fact Resolution Tests ===');
  console.log(JSON.stringify(results, null, 2));

  // Assert all tests pass
  let allPassed = true;
  for (const [test, result] of Object.entries(results)) {
    const passed = result.expected === result.actual;
    console.log(`${test}: ${passed ? 'PASS' : 'FAIL'} (expected: ${result.expected}, actual: ${result.actual})`);
    if (!passed) allPassed = false;
  }

  await pool.end();
  process.exit(allPassed ? 0 : 1);
}

// Run tests
testTemporalSAT().catch(console.error);
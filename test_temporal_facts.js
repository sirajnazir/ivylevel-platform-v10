// Test temporal fact resolution directly
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function resolveFact(pool, q) {
  const { student_id, kind, temporal = 'latest', modality = 'any' } = q;

  // Range rules
  const range = kind === 'sat_total_score'
    ? { min: 200, max: 1600 }
    : kind === 'act_composite'
    ? { min: 1, max: 36 }
    : null;

  // Order & aggregate selector
  let orderSql = `ORDER BY fact_date DESC, confidence DESC`;
  if (temporal === 'earliest') orderSql = `ORDER BY fact_date ASC, confidence DESC`;
  if (temporal === 'min')      orderSql = `ORDER BY numeric_value ASC NULLS LAST, fact_date ASC`;
  if (temporal === 'max')      orderSql = `ORDER BY numeric_value DESC NULLS LAST, fact_date DESC`;

  const modalityFilter = modality === 'any'
    ? `TRUE`
    : `modality = $4`;

  const rangeFilter = range
    ? `AND numeric_value BETWEEN ${range.min} AND ${range.max}`
    : ``;

  // Prefer official over practice over any when modality=any (tie-break)
  const modalityBias = modality === 'any'
    ? `CASE modality WHEN 'official' THEN 2 WHEN 'practice' THEN 1 ELSE 0 END DESC,`
    : ``;

  const sql = `
    WITH base AS (
      SELECT *
      FROM vw_facts_normalized
      WHERE student_id = $1
        AND kind = $2
        ${range ? 'AND numeric_value IS NOT NULL' : ''}
        ${rangeFilter}
        AND ${modalityFilter}
    )
    SELECT student_id, kind, value, numeric_value, fact_date, confidence, source_id, modality
    FROM base
    ${temporal === 'min' || temporal === 'max'
      ? orderSql
      : `ORDER BY ${modalityBias} confidence DESC, fact_date ${temporal==='earliest'?'ASC':'DESC'}`}
    LIMIT 1;
  `;

  const params =
    modality === 'any' ? [student_id, kind] : [student_id, kind, /*unused*/ null, modality];

  const r = await pool.query(sql, params);
  const row = r.rows[0] || null;

  const why = {
    temporal,
    modality_requested: modality,
    modality_bias_applied: modality === 'any',
    order_explained: temporal,
  };

  return { row, why };
}

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
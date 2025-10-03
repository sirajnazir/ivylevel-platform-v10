#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config();

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ivylevel',
  });

  console.log('=== Facts-First Verification ===\n');

  try {
    // 1. Get vitals/facts for huda-2025
    const factsResult = await pool.query(`
      SELECT 
        f.kind,
        f.value,
        f.fact_date,
        f.confidence,
        f.source_id,
        s.title as source_title
      FROM vital_facts f
      JOIN sources s ON s.source_id = f.source_id
      WHERE f.student_id = 'huda-2025'
      ORDER BY f.fact_date DESC
      LIMIT 5
    `);

    console.log('Top 5 Facts from PostgreSQL:');
    factsResult.rows.forEach((fact, i) => {
      console.log(`${i + 1}. ${fact.kind}: ${fact.value}`);
      console.log(`   Date: ${fact.fact_date.toISOString().split('T')[0]}, Confidence: ${fact.confidence}`);
      console.log(`   Source: ${fact.source_title}\n`);
    });

    // 2. Get lifecycle items
    const lifecycleResult = await pool.query(`
      SELECT 
        l.item_id,
        l.domain,
        l.status,
        l.school,
        l.submitted_at,
        l.outcome_date
      FROM lifecycle_items l
      WHERE l.student_id = 'huda-2025'
      LIMIT 5
    `);

    console.log(`\nLifecycle Items: ${lifecycleResult.rows.length} found`);
    
    // 3. Get SAT fact specifically
    const satResult = await pool.query(`
      SELECT 
        kind,
        value,
        fact_date,
        confidence,
        source_id
      FROM vital_facts
      WHERE student_id = 'huda-2025' 
        AND kind = 'sat_total_score'
        AND value = '1530'
    `);

    console.log('\nGolden SAT Fact:');
    if (satResult.rows.length > 0) {
      const sat = satResult.rows[0];
      console.log(`✓ SAT: ${sat.value} on ${sat.fact_date.toISOString().split('T')[0]}`);
      console.log(`  Confidence: ${sat.confidence}, Source: ${sat.source_id}`);
    } else {
      console.log('✗ SAT 1530 not found!');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

main();
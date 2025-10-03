#!/usr/bin/env ts-node

import { Pool } from 'pg';
import { applyObservationToVitals, Observation } from '../../../services/agent/src/vitals/reducer';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function recomputeVitals(studentId: string) {
  const result = await pool.query(
    'SELECT * FROM observations WHERE student_id = $1 ORDER BY at ASC',
    [studentId]
  );
  
  const observations: Observation[] = result.rows.map(row => ({
    id: row.id,
    studentId: row.student_id,
    kind: row.kind,
    subtype: row.subtype,
    value: row.value,
    source: row.source,
    at: row.at,
    createdAt: row.created_at
  }));
  
  console.log(`Processing ${observations.length} observations for ${studentId}`);
  
  let v: any = {};
  for (const o of observations) {
    v = applyObservationToVitals(v, o);
  }
  
  await pool.query(
    `INSERT INTO student_state (student_id, vitals, updated_at) 
     VALUES ($1, $2, NOW()) 
     ON CONFLICT (student_id) 
     DO UPDATE SET vitals = $2, updated_at = NOW()`,
    [studentId, JSON.stringify(v)]
  );
  
  return v;
}

async function main() {
  console.log('Starting vitals recomputation...');
  
  try {
    const vitals = await recomputeVitals('huda-2025');
    
    console.log('\n=== Computed Vitals ===');
    console.log(JSON.stringify(vitals, null, 2));
    
    // Verify key facts
    console.log('\n=== Key Facts ===');
    console.log(`SAT Score: ${vitals.academics?.sat?.current || 'Not found'}`);
    console.log(`SAT Superscore: ${vitals.academics?.sat?.superscore || 'Not found'}`);
    console.log(`College Stats: ${JSON.stringify(vitals.apps?.stats || {})}`);
    console.log(`Total Awards: ${Object.keys(vitals.awards || {}).length}`);
    console.log(`Total Activities: ${Object.keys(vitals.activities || {}).length}`);
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch(console.error);
}
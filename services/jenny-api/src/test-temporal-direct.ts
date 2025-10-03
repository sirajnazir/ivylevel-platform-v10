import { pool } from './db/pool.js';
import { resolveFact } from './services/facts.js';
import { extractTemporalAndModality } from './orchestrator/intent.js';

async function testDirect() {
  const query = "What was my first SAT score?";
  const { temporal, modality } = extractTemporalAndModality(query);
  
  console.log('Query:', query);
  console.log('Detected temporal:', temporal);
  console.log('Detected modality:', modality);
  
  const result = await resolveFact(pool, {
    student_id: 'huda-2025',
    kind: 'sat_total_score',
    temporal: temporal || 'latest',
    modality: modality || 'any'
  });
  
  console.log('Result:', result.row);
  console.log('Why:', result.why);
  
  await pool.end();
}

testDirect().catch(console.error);
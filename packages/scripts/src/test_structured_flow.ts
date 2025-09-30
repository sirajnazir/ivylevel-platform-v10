#!/usr/bin/env ts-node

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ivylevel'
});

async function testStructuredFlow() {
  console.log('Testing StructuredFirst Flow for SAT Query...\n');
  
  // 1. Check Vitals
  console.log('1. VITALS CHECK:');
  const vitalsResult = await pool.query(
    "SELECT vitals->'academics'->'sat' as sat_data FROM student_state WHERE student_id='huda-2025'"
  );
  const satData = vitalsResult.rows[0]?.sat_data;
  console.log('SAT in Vitals:', JSON.stringify(satData, null, 2));
  
  // 2. Check Canon
  console.log('\n2. CANON CHECK:');
  const canonResult = await pool.query(
    "SELECT * FROM canon WHERE key='APP_COMMON' AND student_id='huda-2025'"
  );
  console.log('Canon Entry:', canonResult.rows[0] || 'Not found');
  
  // 3. Check Pinecone has SAT-related content
  console.log('\n3. PINECONE CHECK:');
  console.log('Run: PINECONE_INDEX=jenny-v2 node dist/test_pinecone_v2.cjs');
  
  // 4. Test Evidence Discipline
  console.log('\n4. EVIDENCE DISCIPLINE:');
  console.log('- Vitals provide SAT score: 1530');
  console.log('- Canon provides document reference');
  console.log('- RAG should provide supporting context from transcripts');
  
  // 5. Summary
  console.log('\n5. EXPECTED FLOW:');
  console.log('Query: "What is my SAT score?"');
  console.log('→ Intent: factual_sat');
  console.log('→ Plan: { vitalsNeeded: true, canonKey: "APP_COMMON", ragKind: "TRANS-INTEL" }');
  console.log('→ Evidence: Vitals(SAT:1530) + Canon(Common App) + RAG(transcript context)');
  console.log('→ Reply: "Your final SAT superscore is 1530" with citations');
  
  await pool.end();
}

if (require.main === module) {
  testStructuredFlow()
    .then(() => console.log('\nTest complete!'))
    .catch(console.error);
}
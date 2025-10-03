#!/usr/bin/env ts-node

import { respond } from '../../../services/agent/src/orchestrator';

async function testOrchestrator() {
  console.log('Testing Orchestrator with SAT Query...\n');
  
  const query = "What is my SAT score?";
  console.log(`Query: "${query}"\n`);
  
  try {
    const result = await respond({
      message: query,
      coachId: "jenny",
      studentId: "huda-2025", 
      nowWeek: 100,
      state: {
        coachId: "jenny",
        studentId: "huda-2025", 
        nowWeek: 100,
        phase: 1,
        memory: {}
      }
    });
    
    console.log('RESPONSE:');
    console.log('---------');
    console.log(result.reply);
    console.log('\nEVIDENCE CHIPS:', result.evidence_chips?.length || 0);
    
    if (result.evidence_chips && result.evidence_chips.length > 0) {
      console.log('\nEvidence sources:');
      result.evidence_chips.forEach((chip, i) => {
        console.log(`${i + 1}. ${chip.kind || 'unknown'} - ${chip.text?.substring(0, 50)}...`);
      });
    }
    
    // Validate response
    console.log('\nVALIDATION:');
    const hasSatScore = result.reply.includes('1530');
    const hasEvidence = (result.evidence_chips?.length || 0) > 0;
    
    console.log(`✓ Contains SAT score (1530): ${hasSatScore ? 'YES' : 'NO'}`);
    console.log(`✓ Has evidence chips: ${hasEvidence ? 'YES' : 'NO'}`);
    
    if (!hasSatScore) {
      console.error('\n❌ FAILURE: SAT score not found in response!');
    } else {
      console.log('\n✅ SUCCESS: SAT score correctly retrieved from vitals!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

if (require.main === module) {
  testOrchestrator();
}
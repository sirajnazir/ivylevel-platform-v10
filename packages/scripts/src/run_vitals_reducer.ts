#!/usr/bin/env ts-node

import { recomputeVitals } from '../../../services/agent/src/vitals/recompute';

async function main() {
  const studentId = process.argv[2] || 'huda-2025';
  
  console.log(`Running vitals reducer for student: ${studentId}`);
  
  try {
    const vitals = await recomputeVitals(studentId);
    console.log('Vitals updated successfully');
    console.log('SAT score:', vitals.sat);
    process.exit(0);
  } catch (error) {
    console.error('Error running vitals reducer:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
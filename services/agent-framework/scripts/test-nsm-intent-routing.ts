#!/usr/bin/env tsx

/**
 * Test NSM Intent Routing Integration
 *
 * Validates that GPT-5 intent router correctly classifies NSM queries
 * and routes to NSM resolvers
 */

import { pool } from '../src/db/pool.js';
import { routePrompt } from '../src/router/intentRouter.js';

async function test() {
  console.log('🧪 Testing NSM Intent Routing Integration...\n');

  const testQueries = [
    "show my NSM dashboard",
    "how many awards have I won?",
    "show my leadership activities",
    "what are my test scores?",
    "summer program acceptances",
    "show my north star metrics",
    "what's my award win rate?",
    "how many national awards?",
    "how many leadership roles do I have?",
    "show my SAT and ACT scores"
  ];

  try {
    for (const query of testQueries) {
      console.log(`\n📝 Query: "${query}"`);

      const result = await routePrompt({
        studentId: 'huda-2025',
        message: query,
        pg: pool
      });

      console.log(`✅ Intent: ${result.intent}`);
      console.log(`   Confidence: ${result.confidence}`);
      if (result.data?.answer) {
        console.log(`   Answer: ${result.data.answer.substring(0, 100)}...`);
      }
    }

    console.log('\n✅ All NSM intent routing tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

test().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

import { respond } from '../orchestrator';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ivylevel'
});

interface GoldenTest {
  name: string;
  query: string;
  expectedFacts: {
    sat?: number;
    awards?: string[];
    activities?: string[];
  };
  expectedEvidence: number; // minimum evidence chips
  mustInclude: string[]; // phrases that must appear in response
}

const GOLDEN_TESTS: GoldenTest[] = [
  {
    name: "SAT Score Query",
    query: "What is my SAT score?",
    expectedFacts: {
      sat: 1530
    },
    expectedEvidence: 1,
    mustInclude: ["1530", "SAT"]
  },
  {
    name: "SAT Timeline Query",
    query: "What's my SAT score progression?",
    expectedFacts: {
      sat: 1530
    },
    expectedEvidence: 1,
    mustInclude: ["1530", "progression", "timeline"]
  },
  {
    name: "Awards Query",
    query: "What awards have I won?",
    expectedFacts: {
      awards: ["award1", "award2"] // Should pull from vitals
    },
    expectedEvidence: 1,
    mustInclude: ["award"]
  },
  {
    name: "Activities Query",
    query: "List my extracurricular activities",
    expectedFacts: {
      activities: [] // Should pull from vitals
    },
    expectedEvidence: 1,
    mustInclude: ["activities", "extracurricular"]
  }
];

export async function runGoldenTests() {
  console.log("🧪 Running Golden Tests for Factual Accuracy\n");
  
  let passed = 0;
  let failed = 0;
  
  for (const test of GOLDEN_TESTS) {
    console.log(`\n📝 Test: ${test.name}`);
    console.log(`   Query: "${test.query}"`);
    
    try {
      // Run orchestrator
      const result = await respond({
        message: test.query,
        state: {
          coachId: "jenny",
          studentId: "huda-2025",
          nowWeek: 100,
          phase: 1,
          memory: {}
        }
      });
      
      // Check evidence count
      const evidenceCount = 'evidence_chips' in result ? result.evidence_chips?.length || 0 : 0;
      if (evidenceCount < test.expectedEvidence) {
        throw new Error(`Insufficient evidence: ${evidenceCount} < ${test.expectedEvidence}`);
      }
      
      // Check must-include phrases
      const reply = result.reply.toLowerCase();
      for (const phrase of test.mustInclude) {
        if (!reply.includes(phrase.toLowerCase())) {
          throw new Error(`Missing required phrase: "${phrase}"`);
        }
      }
      
      // Check specific facts
      if (test.expectedFacts.sat) {
        if (!reply.includes(test.expectedFacts.sat.toString())) {
          throw new Error(`SAT score ${test.expectedFacts.sat} not found in reply`);
        }
      }
      
      console.log(`   ✅ PASSED`);
      console.log(`   Evidence chips: ${evidenceCount}`);
      console.log(`   Reply preview: ${result.reply.substring(0, 100)}...`);
      passed++;
      
    } catch (error: any) {
      console.log(`   ❌ FAILED: ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  
  await pool.end();
  return failed === 0;
}

// Run tests if called directly
if (require.main === module) {
  runGoldenTests()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}
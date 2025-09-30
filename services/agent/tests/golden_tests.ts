import { describe, it, expect, beforeAll } from '@jest/globals';
import { respond } from '../src/orchestrator';
import { respondStructured } from '../src/orchestrator_structured';
import { child } from '@packages/logger';

const log = child({ svc: 'golden-tests' });

interface GoldenTest {
  name: string;
  message: string;
  expectedIncludes: string[];
  expectedExcludes?: string[];
  expectedEvidence?: {
    minCount: number;
    requiredKind?: string;
  };
}

const GOLDEN_TESTS: GoldenTest[] = [
  {
    name: "SAT Final Score",
    message: "What's my final SAT score?",
    expectedIncludes: ["1530"],
    expectedExcludes: ["don't have access", "cannot access", "as an AI"],
    expectedEvidence: {
      minCount: 1,
      requiredKind: "APP-DOC"
    }
  },
  {
    name: "SAT Timeline",
    message: "Show me my SAT score progression",
    expectedIncludes: ["1530", "timeline", "progression"],
    expectedExcludes: ["don't know"],
    expectedEvidence: {
      minCount: 1
    }
  },
  {
    name: "Awards List",
    message: "What awards did I win?",
    expectedIncludes: ["award", "won"],
    expectedExcludes: ["don't have", "cannot find"],
    expectedEvidence: {
      minCount: 1,
      requiredKind: "APP-DOC"
    }
  },
  {
    name: "Awards Comparison",
    message: "Compare my planned awards vs what I actually won",
    expectedIncludes: ["planned", "won", "compare"],
    expectedEvidence: {
      minCount: 2
    }
  },
  {
    name: "EC List",
    message: "List my extracurricular activities",
    expectedIncludes: ["extracurricular", "activities"],
    expectedExcludes: ["don't have access"],
    expectedEvidence: {
      minCount: 1,
      requiredKind: "APP-DOC"
    }
  },
  {
    name: "College Decisions",
    message: "What are my college decisions?",
    expectedIncludes: ["college", "decision", "status"],
    expectedEvidence: {
      minCount: 1
    }
  },
  {
    name: "Week 67 Plan",
    message: "What was the plan for week 67?",
    expectedIncludes: ["week 67", "plan"],
    expectedEvidence: {
      minCount: 1,
      requiredKind: "EXEC-INTEL"
    }
  },
  {
    name: "Stanford Essay Guidance",
    message: "What was the guidance for my Stanford essays in week 67?",
    expectedIncludes: ["Stanford", "essay"],
    expectedEvidence: {
      minCount: 1,
      requiredKind: "TRANS-INTEL"
    }
  }
];

// Helper to run a single test
async function runGoldenTest(test: GoldenTest, studentId: string = 'huda-2025'): Promise<{
  passed: boolean;
  issues: string[];
  response?: any;
}> {
  const issues: string[] = [];
  
  try {
    const response = await respond({
      message: test.message,
      studentId,
      coachId: 'jenny',
      nowWeek: 93
    });
    
    // Check expected includes
    for (const expected of test.expectedIncludes) {
      if (!response.reply.toLowerCase().includes(expected.toLowerCase())) {
        issues.push(`Missing expected content: "${expected}"`);
      }
    }
    
    // Check expected excludes
    if (test.expectedExcludes) {
      for (const excluded of test.expectedExcludes) {
        if (response.reply.toLowerCase().includes(excluded.toLowerCase())) {
          issues.push(`Contains excluded phrase: "${excluded}"`);
        }
      }
    }
    
    // Check evidence requirements
    if (test.expectedEvidence) {
      const chips = response.evidence_chips || [];
      
      if (chips.length < test.expectedEvidence.minCount) {
        issues.push(`Insufficient evidence: ${chips.length} < ${test.expectedEvidence.minCount}`);
      }
      
      if (test.expectedEvidence.requiredKind) {
        const hasRequiredKind = chips.some(c => 
          c.kind === test.expectedEvidence.requiredKind ||
          c.metadata?.kind === test.expectedEvidence.requiredKind
        );
        if (!hasRequiredKind) {
          issues.push(`Missing required evidence kind: ${test.expectedEvidence.requiredKind}`);
        }
      }
    }
    
    // Check for evidence citations
    if (!response.reply.includes('[source:') && !response.reply.includes('from your')) {
      issues.push('Missing evidence citation');
    }
    
    return {
      passed: issues.length === 0,
      issues,
      response
    };
  } catch (error) {
    issues.push(`Test error: ${error}`);
    return {
      passed: false,
      issues
    };
  }
}

// Run all golden tests
export async function runGoldenTests(): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: Array<{
    test: GoldenTest;
    result: any;
  }>;
}> {
  const results = [];
  let passed = 0;
  let failed = 0;
  
  for (const test of GOLDEN_TESTS) {
    log.info({ test: test.name }, "Running golden test");
    const result = await runGoldenTest(test);
    
    if (result.passed) {
      passed++;
      log.info({ test: test.name }, "✓ Test passed");
    } else {
      failed++;
      log.error({ test: test.name, issues: result.issues }, "✗ Test failed");
    }
    
    results.push({ test, result });
  }
  
  const passRate = (passed / GOLDEN_TESTS.length) * 100;
  log.info({ 
    total: GOLDEN_TESTS.length, 
    passed, 
    failed,
    passRate: `${passRate.toFixed(1)}%`
  }, "Golden tests complete");
  
  return {
    total: GOLDEN_TESTS.length,
    passed,
    failed,
    results
  };
}

// Evidence compliance gate
export async function checkEvidenceGate(threshold: number = 95): Promise<boolean> {
  const factualTests = GOLDEN_TESTS.filter(t => 
    t.expectedEvidence && t.expectedEvidence.minCount > 0
  );
  
  let compliant = 0;
  
  for (const test of factualTests) {
    const result = await runGoldenTest(test);
    if (result.response?.evidence_chips?.length >= (test.expectedEvidence?.minCount || 1)) {
      compliant++;
    }
  }
  
  const compliance = (compliant / factualTests.length) * 100;
  log.info({ 
    compliance: `${compliance.toFixed(1)}%`,
    threshold: `${threshold}%`,
    passed: compliance >= threshold
  }, "Evidence compliance check");
  
  return compliance >= threshold;
}

// Jest tests
describe('Golden Tests', () => {
  beforeAll(async () => {
    // Ensure services are running
    // You may need to add service health checks here
  });
  
  describe('Individual Tests', () => {
    GOLDEN_TESTS.forEach(test => {
      it(test.name, async () => {
        const result = await runGoldenTest(test);
        expect(result.issues).toEqual([]);
        expect(result.passed).toBe(true);
      }, 30000); // 30 second timeout
    });
  });
  
  describe('Gates', () => {
    it('should meet evidence compliance gate', async () => {
      const passed = await checkEvidenceGate(95);
      expect(passed).toBe(true);
    }, 60000);
    
    it('should have >90% pass rate', async () => {
      const results = await runGoldenTests();
      const passRate = (results.passed / results.total) * 100;
      expect(passRate).toBeGreaterThanOrEqual(90);
    }, 120000);
  });
});

// CLI runner
if (require.main === module) {
  runGoldenTests()
    .then(results => {
      console.log('\n=== Golden Test Results ===');
      console.log(`Total: ${results.total}`);
      console.log(`Passed: ${results.passed}`);
      console.log(`Failed: ${results.failed}`);
      console.log(`Pass Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
      
      if (results.failed > 0) {
        console.log('\nFailed Tests:');
        results.results
          .filter(r => !r.result.passed)
          .forEach(({ test, result }) => {
            console.log(`\n- ${test.name}:`);
            result.issues.forEach((issue: string) => console.log(`  • ${issue}`));
          });
      }
      
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Test runner error:', error);
      process.exit(1);
    });
}
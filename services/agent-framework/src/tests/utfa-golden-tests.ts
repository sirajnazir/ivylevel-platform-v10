import { Pool } from 'pg';
import { resolveTemporalFact } from '../services/temporalFacts.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

interface TestCase {
  name: string;
  query: any;
  expected: {
    operator: string;
    rowCount: number;
    firstValue?: number | string;
    allValues?: (number | string)[];
  };
}

const testCases: TestCase[] = [
  {
    name: 'First SAT score',
    query: {
      student_id: 'huda-2025',
      kind: 'sat_total_score',
      operator: 'first' as const
    },
    expected: {
      operator: 'first',
      rowCount: 1,
      firstValue: 1360
    }
  },
  {
    name: 'Second SAT score',
    query: {
      student_id: 'huda-2025',
      kind: 'sat_total_score',
      operator: 'nth' as const,
      nth: 2
    },
    expected: {
      operator: 'nth',
      rowCount: 1,
      firstValue: 1480
    }
  },
  {
    name: 'Latest SAT score',
    query: {
      student_id: 'huda-2025',
      kind: 'sat_total_score',
      operator: 'latest' as const
    },
    expected: {
      operator: 'latest',
      rowCount: 1,
      firstValue: 1530
    }
  },
  {
    name: 'All SAT scores series',
    query: {
      student_id: 'huda-2025',
      kind: 'sat_total_score',
      operator: 'series' as const
    },
    expected: {
      operator: 'series',
      rowCount: 3,
      allValues: [1360, 1480, 1530]
    }
  },
  {
    name: 'SAT as of March 2024',
    query: {
      student_id: 'huda-2025',
      kind: 'sat_total_score',
      operator: 'asof' as const,
      asof_date: '2024-03-15'
    },
    expected: {
      operator: 'asof',
      rowCount: 1,
      firstValue: 1480
    }
  },
  {
    name: 'Official SAT scores only',
    query: {
      student_id: 'huda-2025',
      kind: 'sat_total_score',
      operator: 'series' as const,
      official_only: true
    },
    expected: {
      operator: 'series',
      rowCount: 2,
      allValues: [1480, 1530]
    }
  },
  {
    name: 'SAT superscore',
    query: {
      student_id: 'huda-2025',
      kind: 'sat_total_score',
      operator: 'superscore' as const
    },
    expected: {
      operator: 'superscore',
      rowCount: 1,
      firstValue: 1530
    }
  },
  {
    name: 'Non-existent student',
    query: {
      student_id: 'doesnt-exist',
      kind: 'sat_total_score',
      operator: 'first' as const
    },
    expected: {
      operator: 'first',
      rowCount: 0
    }
  }
];

async function runGoldenTests() {
  console.log('=== UTFA Golden Tests ===\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const test of testCases) {
    try {
      const result = await resolveTemporalFact(pool, test.query);
      
      // Check operator
      if (result.operator !== test.expected.operator) {
        throw new Error(`Operator mismatch: expected ${test.expected.operator}, got ${result.operator}`);
      }
      
      // Check row count
      if (result.facts.length !== test.expected.rowCount) {
        throw new Error(`Row count mismatch: expected ${test.expected.rowCount}, got ${result.facts.length}`);
      }
      
      // Check first value if expected
      if (test.expected.firstValue !== undefined && result.facts.length > 0) {
        const actualValue = result.facts[0].value_numeric || result.facts[0].value_text;
        if (actualValue != test.expected.firstValue) {
          throw new Error(`Value mismatch: expected ${test.expected.firstValue}, got ${actualValue}`);
        }
      }
      
      // Check all values for series
      if (test.expected.allValues && result.facts.length > 0) {
        const actualValues = result.facts.map(f => f.value_numeric || f.value_text);
        const expectedStr = test.expected.allValues.join(',');
        const actualStr = actualValues.join(',');
        if (actualStr !== expectedStr) {
          throw new Error(`Series mismatch: expected [${expectedStr}], got [${actualStr}]`);
        }
      }
      
      console.log(`✅ ${test.name}`);
      console.log(`   Result: ${JSON.stringify(result.facts.map(f => ({
        value: f.value_numeric || f.value_text,
        date: f.event_date,
        official: f.is_official
      })))}`);
      console.log(`   Trace: ${result.trace.sql_function} took ${result.trace.took_ms}ms\n`);
      
      passed++;
      
    } catch (error: any) {
      console.log(`❌ ${test.name}`);
      console.log(`   Error: ${error.message}\n`);
      failed++;
    }
  }
  
  console.log(`\n=== Results ===`);
  console.log(`Passed: ${passed}/${testCases.length}`);
  console.log(`Failed: ${failed}/${testCases.length}`);
  
  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runGoldenTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
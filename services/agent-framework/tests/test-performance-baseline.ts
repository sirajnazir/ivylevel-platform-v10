/**
 * test-performance-baseline.ts
 * Performance baseline measurements with real Jenny-Huda queries
 * Created: 2025-10-16 (Week 14+)
 *
 * Purpose: Establish performance baselines for production monitoring
 */

import { agentRegistry } from '../src/core/AgentRegistry.js';
import { sessionManager } from '../src/core/SessionManager.js';
import { knowledgeMoat } from '../src/repositories/KnowledgeMoatRepository.js';
import type { AgentExecutionContext } from '../src/core/types.js';

// Test student
const TEST_STUDENT_ID = 'huda-2025';

interface PerformanceMetric {
  category: string;
  operation: string;
  iterations: number;
  avg_ms: number;
  min_ms: number;
  max_ms: number;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
}

const metrics: PerformanceMetric[] = [];

/**
 * Helper: Execute agent (from integration tests)
 */
async function executeAgent(params: {
  message: string;
  student_id: string;
  agent_id?: string;
}): Promise<any> {
  const { message, student_id, agent_id } = params;
  const session = await sessionManager.getOrCreateSession(student_id);

  let agent;
  if (agent_id) {
    agent = agentRegistry.getAgent(agent_id);
    if (!agent) throw new Error(`Agent not found: ${agent_id}`);
  } else {
    agent = agentRegistry.routeQuery(message);
  }

  const context: AgentExecutionContext = {
    session,
    user_message: message,
    agent_manifest: agent.getManifest(),
  };

  const result = await agent.execute(context, agentRegistry);
  sessionManager.updateSession(result.session);

  return {
    answer: result.response.answer,
    chips: result.response.chips,
    hits: result.response.hits,
    debug: result.response.debug,
    session_id: result.session.session_id,
    handoff: result.response.handoff,
    agent_id: agent.getManifest().agent_id,
  };
}

/**
 * Helper: Run performance benchmark
 */
async function benchmark(
  category: string,
  operation: string,
  fn: () => Promise<void>,
  iterations: number = 10
): Promise<void> {
  console.log(`\n📊 ${category}: ${operation}`);
  console.log(`   Running ${iterations} iterations...`);

  const durations: number[] = [];

  // Warmup run
  await fn();

  // Benchmark runs
  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    await fn();
    const duration = Date.now() - start;
    durations.push(duration);
    process.stdout.write('.');
  }

  console.log('');

  // Calculate statistics
  durations.sort((a, b) => a - b);
  const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
  const min = durations[0];
  const max = durations[durations.length - 1];
  const p50 = durations[Math.floor(durations.length * 0.5)];
  const p95 = durations[Math.floor(durations.length * 0.95)];
  const p99 = durations[Math.floor(durations.length * 0.99)];

  console.log(`   avg: ${avg.toFixed(0)}ms, min: ${min}ms, max: ${max}ms`);
  console.log(`   p50: ${p50}ms, p95: ${p95}ms, p99: ${p99}ms`);

  metrics.push({
    category,
    operation,
    iterations,
    avg_ms: Math.round(avg),
    min_ms: min,
    max_ms: max,
    p50_ms: p50,
    p95_ms: p95,
    p99_ms: p99,
  });
}

/**
 * SECTION 1: Knowledge Moat Query Performance
 */
async function testKnowledgeMoatPerformance() {
  console.log('\n' + '='.repeat(80));
  console.log('SECTION 1: KNOWLEDGE MOAT QUERY PERFORMANCE');
  console.log('='.repeat(80));

  // Test 1.1: Essay Examples Query
  await benchmark('Knowledge Moat', 'DS6 - Get Essay Examples (Stanford)', async () => {
    await knowledgeMoat.getEssayExamples({
      collegeName: 'Stanford University',
      limit: 5
    });
  }, 20);

  // Test 1.2: AO Perspectives Query
  await benchmark('Knowledge Moat', 'DS7 - Get AO Perspectives (Essays)', async () => {
    await knowledgeMoat.getAOPerspectives({
      topic: 'essays',
      minCredibility: 0.90,
      limit: 5
    });
  }, 20);

  // Test 1.3: Tactic Chips Search
  await benchmark('Knowledge Moat', 'DS-T1 - Search Tactic Chips (Time Crisis)', async () => {
    await knowledgeMoat.searchTacticChips({
      barriers: ['time-crisis'],
      limit: 5
    });
  }, 20);

  // Test 1.4: Success Patterns Query
  await benchmark('Knowledge Moat', 'DS-T2 - Get Success Patterns (First-Gen)', async () => {
    await knowledgeMoat.searchSuccessPatterns({
      archetypeTags: ['first-gen-immigrant'],
      limit: 5
    });
  }, 20);

  // Test 1.5: College Rubric Query
  await benchmark('Knowledge Moat', 'DS2 - Get College Rubric (Stanford)', async () => {
    await knowledgeMoat.getCollegeRubric('stanford');
  }, 20);
}

/**
 * SECTION 2: Agent Execution Performance
 */
async function testAgentPerformance() {
  console.log('\n' + '='.repeat(80));
  console.log('SECTION 2: AGENT EXECUTION PERFORMANCE');
  console.log('='.repeat(80));

  // Test 2.1: GamePlan Agent
  await benchmark('Agent Execution', 'GamePlan - Get Summary', async () => {
    await executeAgent({
      message: 'What is my college application game plan?',
      student_id: TEST_STUDENT_ID,
      agent_id: 'gameplan-agent'
    });
  }, 10);

  // Test 2.2: ECs Agent
  await benchmark('Agent Execution', 'ECs - List Activities', async () => {
    await executeAgent({
      message: 'Show me my extracurricular activities',
      student_id: TEST_STUDENT_ID,
      agent_id: 'ecs-agent'
    });
  }, 10);

  // Test 2.3: Awards Agent
  await benchmark('Agent Execution', 'Awards - List Honors', async () => {
    await executeAgent({
      message: 'What awards do I have?',
      student_id: TEST_STUDENT_ID,
      agent_id: 'awards-agent'
    });
  }, 10);

  // Test 2.4: College Agent
  await benchmark('Agent Execution', 'College - Chances Assessment', async () => {
    await executeAgent({
      message: 'What are my chances at Stanford?',
      student_id: TEST_STUDENT_ID,
      agent_id: 'college-agent'
    });
  }, 10);

  // Test 2.5: Essay Agent
  await benchmark('Agent Execution', 'Essay - Topic Guidance', async () => {
    await executeAgent({
      message: 'Help me with my Common App essay about identity',
      student_id: TEST_STUDENT_ID,
      agent_id: 'essay-agent'
    });
  }, 10);

  // Test 2.6: Admissions Agent
  await benchmark('Agent Execution', 'Admissions - AO Perspectives', async () => {
    await executeAgent({
      message: 'What do MIT admissions officers look for?',
      student_id: TEST_STUDENT_ID,
      agent_id: 'admissions-agent'
    });
  }, 10);
}

/**
 * SECTION 3: Real Jenny-Huda Query Patterns
 */
async function testRealQueryPatterns() {
  console.log('\n' + '='.repeat(80));
  console.log('SECTION 3: REAL JENNY-HUDA QUERY PATTERNS');
  console.log('='.repeat(80));

  // Test 3.1: Complex gameplan query
  await benchmark('Real Queries', 'Complex GamePlan Query', async () => {
    await executeAgent({
      message: 'What should I focus on this week for my college applications?',
      student_id: TEST_STUDENT_ID,
    });
  }, 5);

  // Test 3.2: College chances with context
  await benchmark('Real Queries', 'College Chances with Context', async () => {
    await executeAgent({
      message: 'Based on my profile, what are my realistic chances at getting into Stanford?',
      student_id: TEST_STUDENT_ID,
    });
  }, 5);

  // Test 3.3: Essay strategy query
  await benchmark('Real Queries', 'Essay Strategy with Theme', async () => {
    await executeAgent({
      message: 'How can I write about my Muslim identity in my Stanford supplemental essay without being too cliche?',
      student_id: TEST_STUDENT_ID,
    });
  }, 5);

  // Test 3.4: Time management crisis
  await benchmark('Real Queries', 'Time Management Help', async () => {
    await executeAgent({
      message: 'I am overwhelmed with deadlines and procrastinating - what should I do?',
      student_id: TEST_STUDENT_ID,
    });
  }, 5);

  // Test 3.5: Award strategy
  await benchmark('Real Queries', 'Award Target Strategy', async () => {
    await executeAgent({
      message: 'Which national awards should I be targeting based on my profile?',
      student_id: TEST_STUDENT_ID,
    });
  }, 5);
}

/**
 * Generate performance report
 */
function generateReport() {
  console.log('\n\n' + '='.repeat(80));
  console.log('PERFORMANCE BASELINE REPORT');
  console.log('='.repeat(80));
  console.log(`Date: ${new Date().toISOString()}`);
  console.log(`Student: ${TEST_STUDENT_ID}`);
  console.log(`Total Tests: ${metrics.length}`);

  // Group by category
  const categories = new Set(metrics.map(m => m.category));

  for (const category of categories) {
    console.log(`\n${category}:`);
    console.log('-'.repeat(80));

    const categoryMetrics = metrics.filter(m => m.category === category);

    for (const metric of categoryMetrics) {
      console.log(`\n  ${metric.operation}`);
      console.log(`    Iterations: ${metric.iterations}`);
      console.log(`    Average:    ${metric.avg_ms}ms`);
      console.log(`    Min:        ${metric.min_ms}ms`);
      console.log(`    Max:        ${metric.max_ms}ms`);
      console.log(`    P50:        ${metric.p50_ms}ms`);
      console.log(`    P95:        ${metric.p95_ms}ms`);
      console.log(`    P99:        ${metric.p99_ms}ms`);
    }
  }

  // Summary statistics
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));

  const allAvgs = metrics.map(m => m.avg_ms);
  const overallAvg = allAvgs.reduce((sum, a) => sum + a, 0) / allAvgs.length;

  console.log(`\nOverall Average Response Time: ${Math.round(overallAvg)}ms`);

  const knowledgeMoatAvg = metrics
    .filter(m => m.category === 'Knowledge Moat')
    .reduce((sum, m) => sum + m.avg_ms, 0) / metrics.filter(m => m.category === 'Knowledge Moat').length;
  console.log(`Knowledge Moat Average: ${Math.round(knowledgeMoatAvg)}ms`);

  const agentAvg = metrics
    .filter(m => m.category === 'Agent Execution')
    .reduce((sum, m) => sum + m.avg_ms, 0) / metrics.filter(m => m.category === 'Agent Execution').length;
  console.log(`Agent Execution Average: ${Math.round(agentAvg)}ms`);

  const realQueryAvg = metrics
    .filter(m => m.category === 'Real Queries')
    .reduce((sum, m) => sum + m.avg_ms, 0) / metrics.filter(m => m.category === 'Real Queries').length;
  console.log(`Real Query Average: ${Math.round(realQueryAvg)}ms`);

  // Performance targets
  console.log('\n' + '='.repeat(80));
  console.log('PERFORMANCE TARGETS');
  console.log('='.repeat(80));
  console.log(`\n  Knowledge Moat Queries:  <50ms  (Current: ${Math.round(knowledgeMoatAvg)}ms) ${knowledgeMoatAvg < 50 ? '✅' : '⚠️'}`);
  console.log(`  Agent Execution:         <8s    (Current: ${Math.round(agentAvg)}ms) ${agentAvg < 8000 ? '✅' : '⚠️'}`);
  console.log(`  Real Queries (E2E):      <10s   (Current: ${Math.round(realQueryAvg)}ms) ${realQueryAvg < 10000 ? '✅' : '⚠️'}`);

  console.log('\n' + '='.repeat(80));
  console.log('✅ Performance Baseline Established');
  console.log('   Use these metrics for production monitoring and regression testing');
  console.log('='.repeat(80));
}

/**
 * Main runner
 */
async function main() {
  console.log('🔬 PERFORMANCE BASELINE TESTING');
  console.log('Testing with real Jenny-Huda data and queries');
  console.log('='.repeat(80));

  try {
    await testKnowledgeMoatPerformance();
    await testAgentPerformance();
    await testRealQueryPatterns();

    generateReport();

  } catch (error: any) {
    console.error('\n❌ Performance testing failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

/**
 * Facts Test Suite Runner
 * Runs the 10 Facts tests and validates against quality gates
 */

import * as fs from "fs";
import * as path from "path";

const JENNY_API_URL = "http://localhost:8787";
const STUDENT_ID = "huda-2025";

interface TestCase {
  id: string;
  label: string;
  category: string;
  prompt: string;
  expected: {
    source: string;
    minProof: number;
    noMetaLeak: boolean;
  };
}

interface TestSuite {
  id: string;
  label: string;
  category: string;
  tests: TestCase[];
}

interface RunResult {
  id: string;
  label: string;
  prompt: string;
  answer: string;
  source: string;
  latency_ms: number;
  metaLeak: boolean;
  passed: boolean;
  error?: string;
}

async function runTest(test: TestCase): Promise<RunResult> {
  const t0 = Date.now();

  try {
    const response = await fetch(`${JENNY_API_URL}/agent/chat/gpt5`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: test.prompt,
        student_id: STUDENT_ID,  // v10.2: server expects snake_case
        sessionId: `facts-test-${test.id}`,
        observability: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const t1 = Date.now();

    // Detect source from intent.detector
    // - "keyword-floor" means fact guardrails (SQL)
    // - intent with "progression", "awards", "academics", "sat", etc = SQL
    // - "kb.search" = KB/RAG
    let source = "unknown";
    if (data.intent) {
      const intentStr = data.intent.intent || "";
      if (
        data.intent.detector === "keyword-floor" ||
        intentStr.startsWith("progression.") ||
        intentStr.startsWith("awards.") ||
        intentStr.startsWith("academics.") ||
        intentStr.startsWith("sat.") ||
        intentStr.startsWith("ecs.") ||
        intentStr.startsWith("programs.") ||
        intentStr.startsWith("college.") ||
        intentStr.startsWith("application.")
      ) {
        source = "sql";
      } else if (intentStr === "kb.search") {
        source = "kb";
      }
    }

    // Detect meta-leakage
    const metaLeak = detectMetaLeakage(data.answer || "");

    // Validate against expected
    const passed =
      source === test.expected.source &&
      !metaLeak;

    return {
      id: test.id,
      label: test.label,
      prompt: test.prompt,
      answer: data.answer || "",
      source,
      intent: data.intent?.intent || "unknown",
      detector: data.intent?.detector || "unknown",
      latency_ms: t1 - t0,
      metaLeak,
      passed,
    };
  } catch (error: any) {
    const t1 = Date.now();
    return {
      id: test.id,
      label: test.label,
      prompt: test.prompt,
      answer: `[ERROR] ${error.message}`,
      source: "unknown",
      intent: "unknown",
      detector: "unknown",
      latency_ms: t1 - t0,
      metaLeak: false,
      passed: false,
      error: error.message,
    };
  }
}

function detectMetaLeakage(answer: string): boolean {
  const metaPatterns = [
    /\*Source\*:/i,
    /\bchip_id\b/i,
    /\bKBv\d+/i,
    /@\s?KBv/i,
    /\bSRC-[A-Z]+-/i,
    /\bscaffold\./i,
    /System:|User:|Assistant:/i,
    /\([A-Z]\d+-[A-Z]+-\d+\)/,
  ];

  return metaPatterns.some((pattern) => pattern.test(answer));
}

async function main() {
  console.log("\n============================================");
  console.log("Jenny Test Lab - Facts Suite Runner");
  console.log("============================================\n");

  // Load Facts test suite
  const suitePath = path.join(__dirname, "../apps/test-chat-ui/lib/testlab/suites/facts.json");
  const suiteData = fs.readFileSync(suitePath, "utf-8");
  const suite: TestSuite = JSON.parse(suiteData);

  console.log(`Suite: ${suite.label}`);
  console.log(`Tests: ${suite.tests.length}\n`);
  console.log("Running tests...\n");

  const results: RunResult[] = [];

  // Run tests sequentially
  for (const test of suite.tests) {
    console.log(`[${test.id}] ${test.label}`);
    console.log(`  Query: "${test.prompt}"`);

    const result = await runTest(test);
    results.push(result);

    const status = result.passed ? "✅ PASS" : "❌ FAIL";
    console.log(`  ${status}`);
    console.log(`  Source: ${result.source} (expected: ${test.expected.source})`);
    console.log(`  Intent: ${result.intent} | Detector: ${result.detector}`);
    console.log(`  Meta-Leak: ${result.metaLeak} (expected: false)`);
    console.log(`  Latency: ${result.latency_ms}ms`);

    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }

    console.log();
  }

  // Summary
  const passCount = results.filter(r => r.passed).length;
  const failCount = results.length - passCount;
  const sqlRoutingCount = results.filter(r => r.source === "sql").length;
  const metaLeakCount = results.filter(r => r.metaLeak).length;
  const avgLatency = results.reduce((sum, r) => sum + r.latency_ms, 0) / results.length;
  const p95Latency = results.map(r => r.latency_ms).sort((a, b) => b - a)[Math.floor(results.length * 0.05)];

  console.log("============================================");
  console.log("RESULTS SUMMARY");
  console.log("============================================\n");
  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${passCount} (${(passCount/results.length*100).toFixed(1)}%)`);
  console.log(`Failed: ${failCount}`);
  console.log();
  console.log("Quality Gates:");
  console.log(`  SQL Routing: ${sqlRoutingCount}/${results.length} (${(sqlRoutingCount/results.length*100).toFixed(1)}%) - Target: 100%`);
  console.log(`  Meta-Leakage: ${metaLeakCount}/${results.length} - Target: 0`);
  console.log(`  Avg Latency: ${avgLatency.toFixed(0)}ms - Target: ≤1500ms`);
  console.log(`  P95 Latency: ${p95Latency.toFixed(0)}ms - Target: ≤6000ms`);
  console.log();

  // Gate validation
  const sqlGate = sqlRoutingCount === results.length;
  const metaGate = metaLeakCount === 0;
  const latencyGate = avgLatency <= 1500;

  console.log("Gate Status:");
  console.log(`  ${sqlGate ? "✅" : "❌"} SQL Routing (100%)`);
  console.log(`  ${metaGate ? "✅" : "❌"} No Meta-Leakage`);
  console.log(`  ${latencyGate ? "✅" : "❌"} Latency p50 ≤1.5s`);
  console.log();

  const allGatesPassed = sqlGate && metaGate && latencyGate;

  if (allGatesPassed) {
    console.log("🎉 ALL GATES PASSED - Facts suite validated!");
  } else {
    console.log("⚠️  SOME GATES FAILED - Review results above");
  }

  console.log("============================================\n");

  // Save results to file
  const resultsPath = path.join(__dirname, "../logs/facts_test_results.json");
  fs.mkdirSync(path.dirname(resultsPath), { recursive: true });
  fs.writeFileSync(resultsPath, JSON.stringify({
    suite: suite.label,
    timestamp: new Date().toISOString(),
    results,
    summary: {
      total: results.length,
      passed: passCount,
      failed: failCount,
      sqlRouting: `${sqlRoutingCount}/${results.length}`,
      metaLeakage: metaLeakCount,
      avgLatency_ms: avgLatency,
      p95Latency_ms: p95Latency,
      gatesPassed: allGatesPassed,
    },
  }, null, 2));

  console.log(`Results saved to: ${resultsPath}\n`);

  process.exit(allGatesPassed ? 0 : 1);
}

main().catch(console.error);

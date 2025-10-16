/**
 * Test Lab Suite Runner API
 * Executes multiple test cases and returns aggregate metrics
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { TestCase, SuiteResult, TestRunResponse } from "@/lib/testlab/schema";

const SuiteRequestSchema = z.object({
  suiteId: z.string(),
  label: z.string(),
  category: z.enum(["facts", "kb", "eq"]),
  tests: z.array(z.object({
    id: z.string(),
    label: z.string(),
    category: z.enum(["facts", "kb", "eq"]),
    prompt: z.string(),
    studentId: z.string().optional(),
    sessionId: z.string().optional(),
    intentOverride: z.string().optional(),
    expected: z.any().optional()
  })),
  parallel: z.boolean().optional()
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { suiteId, label, category, tests, parallel } = SuiteRequestSchema.parse(body);

    // Suite runner calls its own /api/testlab/run endpoint (same server)
    const baseUrl = "http://localhost:3000";

    // Run tests (parallel or sequential)
    // NOTE: Sequential mode adds 7s delay between tests to respect Cohere API rate limit (10 calls/min)
    let results: TestRunResponse[];
    if (parallel) {
      results = await Promise.all(
        tests.map(test => runSingleTest(baseUrl, test))
      );
    } else {
      results = [];
      for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        const result = await runSingleTest(baseUrl, test);
        results.push(result);

        // Add 7-second delay between tests (respects Cohere 10 calls/min limit)
        // Skip delay after last test
        if (i < tests.length - 1) {
          console.log(`[Suite] Rate limiting: waiting 7s before next test (${i + 1}/${tests.length} complete)...`);
          await new Promise(resolve => setTimeout(resolve, 7000));
        }
      }
    }

    // Calculate aggregates
    const latencies = results.map(r => r.run.metrics.latency.total_ms);
    const sortedLatencies = [...latencies].sort((a, b) => a - b);
    const p50Index = Math.floor(sortedLatencies.length * 0.5);
    const p95Index = Math.floor(sortedLatencies.length * 0.95);

    const adapterCount = results.filter(r => r.run.modelBadge === "🔶" || r.run.modelBadge === "adapter").length;
    const baseCount = results.length - adapterCount;

    const gateVerdicts = results.flatMap(r => r.gates.map(g => g.verdict));
    const passed = gateVerdicts.filter(v => v === "pass").length;
    const warned = gateVerdicts.filter(v => v === "warn").length;
    const failed = gateVerdicts.filter(v => v === "fail").length;

    // Calculate scorecard
    const proofGates = results.flatMap(r => r.gates.filter(g => g.name === "Proof Presence" || g.name === "Provenance"));
    const proofPassed = proofGates.filter(g => g.verdict === "pass").length;
    const proofPresence = proofGates.length > 0 ? (proofPassed / proofGates.length) * 100 : 0;

    const warmthGates = results.flatMap(r => r.gates.filter(g => g.name === "Warmth Opener"));
    const warmthPassed = warmthGates.filter(g => g.verdict === "pass").length;
    const toneWarmth = warmthGates.length > 0 ? (warmthPassed / warmthGates.length) * 100 : 0;

    const actionGates = results.flatMap(r => r.gates.filter(g => g.name === "Actionability"));
    const actionPassed = actionGates.filter(g => g.verdict === "pass").length;
    const toneAction = actionGates.length > 0 ? (actionPassed / actionGates.length) * 100 : 0;

    const metaGates = results.flatMap(r => r.gates.filter(g => g.name === "No Meta-Leakage"));
    const metaPassed = metaGates.filter(g => g.verdict === "pass").length;
    const noMetaLeak = metaGates.length > 0 ? (metaPassed / metaGates.length) * 100 : 0;

    const sourceGates = results.flatMap(r => r.gates.filter(g => g.name === "Source = SQL"));
    const sourcePassed = sourceGates.filter(g => g.verdict === "pass").length;
    const sourceCorrectness = sourceGates.length > 0 ? (sourcePassed / sourceGates.length) * 100 : 0;

    const suite: SuiteResult = {
      id: suiteId,
      label,
      category,
      tests: results,
      aggregate: {
        total: gateVerdicts.length,
        passed,
        warned,
        failed,
        passRate: (passed / gateVerdicts.length) * 100,
        latency: {
          p50: sortedLatencies[p50Index] ?? 0,
          p95: sortedLatencies[p95Index] ?? 0,
          max: Math.max(...latencies)
        },
        modelMix: {
          adapter: adapterCount,
          base: baseCount
        }
      },
      scorecard: {
        proofPresence,
        toneWarmth,
        toneAction,
        noMetaLeak,
        sourceCorrectness
      }
    };

    return NextResponse.json(suite);
  } catch (error: any) {
    console.error("Suite run error:", error);
    return NextResponse.json(
      {
        error: error.message,
        stack: error.stack
      },
      { status: 500 }
    );
  }
}

async function runSingleTest(baseUrl: string, test: TestCase): Promise<TestRunResponse> {
  const resp = await fetch(`${baseUrl}/api/testlab/run`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ test })
  });

  if (!resp.ok) {
    throw new Error(`Test ${test.id} failed: ${resp.status}`);
  }

  return resp.json();
}

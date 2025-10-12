/**
 * Test Lab Single Run API
 * Executes a single test case and validates against PRD gates
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateTest } from "@/lib/testlab/validators";
import type { RunResult, TestCase } from "@/lib/testlab/schema";

const TestCaseSchema = z.object({
  id: z.string(),
  label: z.string(),
  category: z.enum(["facts", "kb", "eq"]),
  prompt: z.string(),
  studentId: z.string().optional(),
  sessionId: z.string().optional(),
  intentOverride: z.string().optional(),
  expected: z.any().optional()
});

const RequestSchema = z.object({
  test: TestCaseSchema
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { test } = RequestSchema.parse(body);

    // Build kb-chat request
    const kbReq = {
      userMessage: test.prompt,
      studentId: test.studentId ?? "huda-2025",
      sessionId: test.sessionId ?? `testlab-${test.id}`,
      intentOverride: test.intentOverride,
      includeDebug: true,
      includeTrace: true
    };

    // Execute query
    const t0 = Date.now();
    const baseUrl = process.env.NEXT_PUBLIC_UI_BASE || "http://localhost:8787";
    const resp = await fetch(`${baseUrl}/api/kb-chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(kbReq)
    });

    if (!resp.ok) {
      throw new Error(`kb-chat failed: ${resp.status} ${resp.statusText}`);
    }

    const data = await resp.json();
    const t1 = Date.now();

    // Parse response into RunResult
    const run: RunResult = {
      id: test.id,
      label: test.label,
      category: test.category,
      prompt: test.prompt,
      answer: data.answer ?? "",
      source: (data.source ?? data.debug?.source ?? "unknown") as any,
      modelBadge: data.debug?.modelBadge ?? data.model ?? null,
      scaffold: data.debug?.scaffold_used ?? null,
      debug: {
        tags: data.debug?.tags ?? [],
        router: data.debug?.routing ?? data.debug?.router ?? null,
        sql: data.debug?.sql ?? null,
        provenance: data.chips ?? data.debug?.provenance ?? [],
        metaLeak: detectMetaLeak(data.answer ?? ""),
        tone: {
          warmth: detectWarmth(data.answer ?? ""),
          action: detectAction(data.answer ?? "")
        },
        trace: data.__trace ?? data.debug?.trace ?? null
      },
      metrics: {
        latency: {
          total_ms: t1 - t0,
          router_ms: data.debug?.timing?.router_ms ?? null,
          source_ms: data.debug?.timing?.source_ms ?? null,
          guard_ms: data.debug?.timing?.guard_ms ?? null,
          p95_ms: data.debug?.timing?.p95_ms ?? null
        }
      }
    };

    // Validate gates
    const gates = validateTest(run);

    // Store telemetry (async, non-blocking)
    storeTelemetry(test, run, gates).catch(console.error);

    return NextResponse.json({
      test,
      run,
      gates
    });
  } catch (error: any) {
    console.error("Test lab run error:", error);
    return NextResponse.json(
      {
        error: error.message,
        stack: error.stack
      },
      { status: 500 }
    );
  }
}

// Helper: Detect meta-instruction leakage
function detectMetaLeak(answer: string): boolean {
  const metaPatterns = [
    /respond in \d+ sentences/i,
    /use exactly \d+ words/i,
    /chip[-_]?\d+/i,
    /scaffold[-_]?\w+/i,
    /internal note/i,
    /\[debug\]/i,
    /\[trace\]/i
  ];
  return metaPatterns.some(p => p.test(answer));
}

// Helper: Detect warmth signals
function detectWarmth(answer: string): boolean {
  const warmthPatterns = [
    /i'm with you/i,
    /we've got this/i,
    /you're not alone/i,
    /this is completely normal/i,
    /that makes total sense/i,
    /i understand/i,
    /totally get it/i,
    /this happens/i
  ];
  return warmthPatterns.some(p => p.test(answer));
}

// Helper: Detect action signals
function detectAction(answer: string): boolean {
  const actionPatterns = [
    /next step/i,
    /here's what/i,
    /let's/i,
    /you should/i,
    /try this/i,
    /start by/i,
    /first,/i,
    /in the next \d+ (minutes|hours|days)/i
  ];
  return actionPatterns.some(p => p.test(answer));
}

// Helper: Store telemetry (async)
async function storeTelemetry(test: TestCase, run: RunResult, gates: any[]) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_UI_BASE || "http://localhost:8787";
    await fetch(`${baseUrl}/api/testlab/telemetry`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ test, run, gates })
    });
  } catch (err) {
    console.error("Telemetry storage failed:", err);
  }
}

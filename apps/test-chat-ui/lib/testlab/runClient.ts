/**
 * Test Lab Run Client
 * Client-side test execution with full observability
 */

import { TestCase, RunResult, TestSource } from "./schema";

const JENNY_API_URL = process.env.NEXT_PUBLIC_JENNY_API_URL || "http://localhost:8787";

export interface RunOptions {
  studentId?: string;
  sessionId?: string;
  intentOverride?: string;
}

export async function runTest(testCase: TestCase): Promise<RunResult> {
  const startMs = Date.now();

  try {
    // Call jenny-api server (production orchestrator)
    const response = await fetch(`${JENNY_API_URL}/agent/chat/gpt5`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: testCase.prompt,
        studentId: testCase.studentId || "huda-2025",
        sessionId: testCase.sessionId || `testlab-${Date.now()}`,
        intentOverride: testCase.intentOverride,
        observability: true, // Request full debug info
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const totalMs = Date.now() - startMs;

    // Extract debug info
    const debug = data.debug || {};
    const router = debug.router || null;
    const sql = debug.sql || null;
    const provenance = debug.provenance || [];
    const trace = debug.trace || null;
    const tags = debug.tags || [];

    // Detect meta-leakage
    const metaLeak = detectMetaLeakage(data.answer || "");

    // Detect tone (warmth & action)
    const tone = detectTone(data.answer || "");

    // Determine source
    const source: TestSource = detectSource(data);

    // Extract model badge
    const modelBadge = data.modelBadge || null;

    // Extract scaffold
    const scaffold = data.scaffold || null;

    return {
      id: testCase.id,
      label: testCase.label,
      category: testCase.category,
      prompt: testCase.prompt,
      answer: data.answer || "",
      source,
      modelBadge,
      scaffold,
      debug: {
        tags,
        router,
        sql,
        provenance,
        metaLeak,
        tone,
        trace,
      },
      metrics: {
        latency: {
          total_ms: totalMs,
          router_ms: debug.latency?.router_ms || null,
          source_ms: debug.latency?.source_ms || null,
          guard_ms: debug.latency?.guard_ms || null,
          p95_ms: debug.latency?.p95_ms || null,
        },
      },
    };
  } catch (error: any) {
    const totalMs = Date.now() - startMs;

    // Return error result
    return {
      id: testCase.id,
      label: testCase.label,
      category: testCase.category,
      prompt: testCase.prompt,
      answer: `[ERROR] ${error.message}`,
      source: "unknown",
      modelBadge: null,
      scaffold: null,
      debug: {
        tags: [],
        router: null,
        sql: null,
        provenance: [],
        metaLeak: false,
        tone: { warmth: false, action: false },
        trace: null,
      },
      metrics: {
        latency: {
          total_ms: totalMs,
          router_ms: null,
          source_ms: null,
          guard_ms: null,
          p95_ms: null,
        },
      },
    };
  }
}

// Helper: Detect meta-leakage in answer
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

// Helper: Detect tone (warmth & action)
function detectTone(answer: string): { warmth: boolean; action: boolean } {
  const warmthPatterns = [
    /\b(totally|absolutely|completely|definitely|makes sense|no worries|excited|proud|great job)\b/i,
    /\b(congrats|congratulations|amazing|awesome|fantastic|impressive)\b/i,
    /\b(I understand|I see|I hear you|I get it|that's normal|that's common)\b/i,
  ];

  const actionPatterns = [
    /\b(let's|you should|you could|consider|try|think about|explore|look into)\b/i,
    /\b(here's what|next step|moving forward|going forward|from here)\b/i,
    /\b(focus on|prioritize|start by|begin with|first)\b/i,
  ];

  const warmth = warmthPatterns.some((p) => p.test(answer));
  const action = actionPatterns.some((p) => p.test(answer));

  return { warmth, action };
}

// Helper: Detect source
function detectSource(data: any): TestSource {
  if (data.source) return data.source;
  if (data.debug?.sql?.rows_count !== undefined) return "sql";
  if (data.debug?.provenance?.length > 0) return "kb";
  if (data.scaffold) return "scaffold";
  return "unknown";
}

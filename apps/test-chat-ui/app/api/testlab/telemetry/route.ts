/**
 * Test Lab Telemetry API
 * Stores test run results for analysis
 */

import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { test, run, gates } = body;

    // Create telemetry directory if it doesn't exist
    const telemetryDir = path.join(process.cwd(), "data", "testlab");
    if (!existsSync(telemetryDir)) {
      await mkdir(telemetryDir, { recursive: true });
    }

    // Write run to JSONL file (append mode)
    const timestamp = new Date().toISOString();
    const logEntry = JSON.stringify({
      timestamp,
      test_id: test.id,
      category: test.category,
      label: test.label,
      prompt: test.prompt,
      source: run.source,
      model_badge: run.modelBadge,
      latency_ms: run.metrics.latency.total_ms,
      warmth: run.debug.tone.warmth,
      action: run.debug.tone.action,
      meta_leak: run.debug.metaLeak,
      provenance_count: run.debug.provenance.length,
      gates_passed: gates.filter((g: any) => g.verdict === "pass").length,
      gates_warned: gates.filter((g: any) => g.verdict === "warn").length,
      gates_failed: gates.filter((g: any) => g.verdict === "fail").length,
      gates
    });

    const logFile = path.join(telemetryDir, "runs.jsonl");
    await writeFile(logFile, logEntry + "\n", { flag: "a" });

    return NextResponse.json({ status: "stored", timestamp });
  } catch (error: any) {
    console.error("Telemetry storage error:", error);
    return NextResponse.json(
      {
        error: error.message
      },
      { status: 500 }
    );
  }
}

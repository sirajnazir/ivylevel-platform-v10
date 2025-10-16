/**
 * Unified Chat API Route
 *
 * Single entry point for ALL queries (fact-based + KB-based)
 * Uses ensemble intent classifier → unified orchestrator → hybrid retrieval
 *
 * Flow:
 * 1. GPT-5 JSON intent + embeddings + regex guards
 * 2. Confidence fusion (policy-driven)
 * 3. Route to: SQL facts | KB RAG | hybrid | clarifier
 * 4. Compose answer with evidence
 *
 * Replaces:
 * - apps/test-chat-ui/app/api/kb-chat/route.ts (KB-only)
 * - Direct calls to services/agent-framework (fact-only)
 */

import { NextRequest, NextResponse } from "next/server";
import { classifyIntent, initializeIntentSystem } from "@/lib/intent/classifier";
import { orchestrateResponse } from "@/lib/orchestrator";
import { validateRequest } from "@/lib/validation";

// Initialize intent centroids on server boot (once)
let initialized = false;
async function ensureInitialized() {
  if (!initialized) {
    console.log("[chat] Initializing unified intent system...");
    await initializeIntentSystem();
    initialized = true;
    console.log("[chat] Intent system ready (GPT-5 + embeddings + regex)");
  }
}

/**
 * Unified chat endpoint
 *
 * Request:
 * {
 *   message: string,
 *   student_id: string,
 *   week?: number,
 *   context?: { session_id?: string; history?: Array<{role, content}> }
 * }
 *
 * Response:
 * {
 *   answer: string,
 *   chips?: Array<{chip_id, source_id, ...}>,
 *   facts?: Record<string, any>,
 *   hits?: Array<{namespace, score, text, ...}>,
 *   intent: { intents[], tags[], confidence, source },
 *   trace?: { ... }
 * }
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    await ensureInitialized();

    const body = await req.json();
    const validation = validateRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.errors },
        { status: 400 }
      );
    }

    const { message, student_id, week, context } = body;

    // 1. Ensemble intent classification (GPT-5 + embeddings + regex)
    console.log(`[chat] Classifying intent for: "${message.slice(0, 60)}..."`);
    const intent = await classifyIntent(message);

    console.log(`[chat] Intent result:`, {
      intents: intent.intents,
      tags: intent.tags,
      source: intent.source,
      confidence: intent.confidence.toFixed(3)
    });

    // 2. Unified orchestration (SQL facts | KB RAG | hybrid | clarifier)
    const response = await orchestrateResponse({
      message,
      student_id,
      week,
      intent,
      context
    });

    const elapsed = Date.now() - startTime;
    console.log(`[chat] Response ready in ${elapsed}ms`);

    return NextResponse.json({
      ...response,
      intent: {
        intents: intent.intents,
        tags: intent.tags,
        confidence: intent.confidence,
        source: intent.source
      },
      trace: {
        elapsed_ms: elapsed,
        timestamp: new Date().toISOString(),
        ...response.trace
      }
    });

  } catch (error: any) {
    console.error("[chat] Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * Health check
 */
export async function GET(req: NextRequest) {
  try {
    await ensureInitialized();
    return NextResponse.json({
      status: "healthy",
      intent_system: "ready",
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "unhealthy", error: error.message },
      { status: 503 }
    );
  }
}

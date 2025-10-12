/**
 * KB-powered Chat API Route (v2.0 - Universal Policy-Driven System)
 * Unified endpoint for fact-based and KB/RAG queries
 */

import { NextRequest, NextResponse } from "next/server";
import { retrieve } from "@/lib/retrieval";
import { tagQuery } from "@/lib/intentLexicon";
import { composeAnswer } from "@/lib/composeAnswer";
import { composeAnswer as llmCompose } from "@/lib/llmAdapter";
import { guardAndPolish } from "@/lib/composerGuards";
import { loadPolicy } from "@/lib/policy";
import { loadIntentLexicon } from "@/lib/intentLexicon";
import { loadScaffolds } from "@/lib/scaffoldRegistry";
import type { Hit } from "@/lib/types";
import routing from "@/config/routing.json";

// Initialize loaders on first request
let initialized = false;
function ensureInitialized() {
  if (!initialized) {
    console.log("[KB Chat] Initializing universal system...");
    try {
      loadPolicy();
      loadIntentLexicon();
      loadScaffolds();
      initialized = true;
      console.log("[KB Chat] Initialization complete");
    } catch (e) {
      console.error("[KB Chat] Initialization failed:", e);
      throw e;
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    ensureInitialized();

    const body = await req.json();
    const {
      userMessage,
      filters,
      namespaces,
      topK = 6,
      userId,
      sessionId,
      studentId,
    } = body;

    if (!userMessage) {
      return NextResponse.json(
        { error: "userMessage is required" },
        { status: 400 }
      );
    }

    // Generate sessionId from timestamp if not provided
    const effectiveSessionId = sessionId ?? userId ?? `session-${Date.now()}`;

    console.log(`\n[KB Chat] New query: "${userMessage}"`);

    // 1) Tag query using intent lexicon
    const { tags, preferTypes } = tagQuery(userMessage);
    console.log(`[KB Chat] Tags: [${tags.join(", ")}]`);
    console.log(`[KB Chat] Prefer types: [${preferTypes.join(", ")}]`);

    // 1.5) Authoritative SQL routing - if preferTypes includes "sql", use orchestrator instead
    if (preferTypes.includes("sql")) {
      console.log(`[KB Chat] Authoritative SQL preference detected → using orchestrator`);
      const { orchestrateResponse } = await import("@/lib/orchestrator");

      const orchestratorResult = await orchestrateResponse({
        message: userMessage,
        intent: { intents: tags, tags, preferTypes },
        student_id: studentId || "unknown",
        context: { userId, sessionId: effectiveSessionId }
      });

      return NextResponse.json({
        answer: orchestratorResult.answer,
        source: orchestratorResult.source,
        chips: orchestratorResult.chips || [],
        facts: orchestratorResult.facts || [],
        debug: {
          routing: orchestratorResult.routing,
          modelBadge: null
        },
        meta: {
          tags,
          preferTypes,
          executionMode: orchestratorResult.source
        }
      });
    }

    // 2) Retrieve evidence from KB (with policy-driven priors)
    const evidence = await retrieve({
      query: userMessage,
      filters,
      namespaces,
      topK,
      tags, // Pass tags for prior boosting
    });

    // 3) Convert Evidence[] to Hit[] for composer
    const hits: Hit[] = evidence.map(e => ({
      id: e.chip_id,
      score: e.score ?? 0,
      content: e.content || "",
      namespace: e.namespace,
      metadata: e.metadata || {}
    }));

    console.log(`[KB Chat] Retrieved ${hits.length} hits`);
    if (hits.length > 0) {
      console.log(`[KB Chat] Top hit: ${hits[0].id} (score: ${hits[0].score.toFixed(3)})`);
    }

    // 4) Compose answer: use LLM adapter for tone-sensitive intents, scaffolds for fact-based
    const toneSensitive = new Set(routing.composer.tone_sensitive_intents);
    const useLLM = tags.some(tag => toneSensitive.has(tag));

    let result;
    let rawAnswer = "";

    if (useLLM && hits.length > 0) {
      console.log(`[KB Chat] Using LLM adapter for tone-sensitive intent`);

      // Build context from top hits
      const context = hits.slice(0, 3).map(h =>
        `[${h.id}] ${h.content.slice(0, 200)}`
      ).join("\n\n");

      const prompt = `Context from knowledge base:\n${context}\n\nUser question: ${userMessage}\n\nProvide a warm, empathetic response using the context above.`;

      const llmResult = await llmCompose({
        prompt,
        intent: tags[0] || "general",
        system: "You are Jenny, an empathetic college admissions coach. Provide warm, supportive guidance while grounding your response in the provided context.",
        temperature: 0.7,
        userId,
        sessionId: effectiveSessionId,
        studentId
      });

      rawAnswer = llmResult.text;

      // Log trace info
      if (llmResult.__trace) {
        console.log(`[KB Chat] Model used: ${llmResult.__trace.isAdapter ? "🔶 Adapter v8" : "⚪ Base"} (${llmResult.__trace.model})`);
        console.log(`[KB Chat] Latency: ${llmResult.__trace.latency_ms}ms`);
      }

      // Build result in same format as scaffold composer
      result = {
        answer: rawAnswer,
        chips: hits.slice(0, 3).map(h => h.id),
        hits,
        scaffold_used: "llm_adapter_v8",
        __trace: llmResult.__trace
      };
    } else {
      console.log(`[KB Chat] Using scaffold-based composition`);
      result = composeAnswer(userMessage, tags, hits);
      rawAnswer = result.answer;
    }

    // 5) Apply guards to polish tone and proof
    const primaryIntentRaw = tags[0] || "general";

    // Map noisy tags to tone intents for guard
    const toneIntentMap: Record<string,string> = {
      tactic: "deadline_crunch",
      micro_interaction: "message_template"
    };
    const primaryIntent = toneIntentMap[primaryIntentRaw] || primaryIntentRaw;

    const topScore = hits[0]?.score ?? 0;
    const source = result.scaffold_used ? "scaffold" : (result.source || undefined);
    const guarded = await guardAndPolish(rawAnswer, primaryIntent, { topScore, source });

    if (guarded.rewritten) {
      console.log(`[KB Chat] Answer rewritten by guards (tone: ${guarded.toneScore.toFixed(2)}, proof: ${guarded.proofScore.toFixed(2)})`);
      result.answer = guarded.text;
    }

    console.log(`[KB Chat] Answer generated (${result.answer.length} chars)`);
    console.log(`[KB Chat] Chips used: [${result.chips.join(", ")}]`);
    if (result.scaffold_used) {
      console.log(`[KB Chat] Scaffold: ${result.scaffold_used}`);
    }

    // 6) Build response
    const modelBadge = result.__trace?.isAdapter ? "🔶 Adapter v8" : (result.__trace ? "⚪ Base" : null);

    const response = {
      answer: result.answer,
      evidence: evidence, // Keep original Evidence format for UI compatibility
      chips: result.chips,
      scaffold_used: result.scaffold_used,
      debug: {
        ...result.debug,
        trace: result.__trace,
        modelBadge
      },
      meta: {
        topScore: hits[0]?.score ?? 0,
        lowConfidence: hits.length === 0 || (hits[0]?.score ?? 0) < 0.40,
        evidenceCount: evidence.length,
        tags,
        preferTypes,
        toneScore: guarded.toneScore,
        proofScore: guarded.proofScore,
        guardRewritten: guarded.rewritten
      },
    };

    // 7) Log for QA
    logQueryForQA({
      query: userMessage,
      tags,
      namespaces: hits.map(h => h.namespace),
      filters,
      top1_chip: hits[0]?.id,
      top1_score: hits[0]?.score ?? 0,
      evidence_count: hits.length,
      scaffold_used: result.scaffold_used
    });

    return NextResponse.json(response);

  } catch (error: any) {
    console.error("[KB Chat] Error:", error);
    return NextResponse.json(
      {
        error: error.message || "Internal server error",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * Log queries for QA analysis
 */
function logQueryForQA(data: {
  query: string;
  tags: string[];
  namespaces: string[];
  filters?: any;
  top1_chip?: string;
  top1_score: number;
  evidence_count: number;
  scaffold_used?: string;
}) {
  // In production, send to logging service (e.g., Datadog, CloudWatch)
  console.log(`[QA Log]`, JSON.stringify(data));
}

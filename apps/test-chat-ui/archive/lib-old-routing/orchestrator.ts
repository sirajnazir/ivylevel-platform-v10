/**
 * Universal Query Orchestrator
 *
 * Routes queries to appropriate resolver(s) based on intent classification
 * Supports: SQL Facts (jenny-api) | KB RAG (Pinecone) | Hybrid (both)
 *
 * Architecture:
 * Intent → Routing Decision → [SQL | KB | Hybrid] → Compose Answer
 */

import { Pool } from "pg";
import policy from "../config/policy.json";
import { retrieve } from "./retrieval";
import { composeAnswer } from "./composeAnswer";
// SQL resolver temporarily disabled (module import issues)
// import { resolveSQLFact } from "./resolvers/sql";
import type { FusedIntent } from "./intent/classifier";

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Initialize pool
pool.on("error", (err) => {
  console.error("[orchestrator] Unexpected DB pool error:", err);
});

/**
 * Orchestrator Request
 */
export interface OrchestratorRequest {
  message: string;  // Changed from 'query' to match route.ts
  intent: FusedIntent;
  student_id: string;
  week?: number;
  context?: Record<string, any>;
}

/**
 * Orchestrator Response
 */
export interface OrchestratorResponse {
  answer: string;
  chips?: any[];
  facts?: any[];
  hits?: any[];
  source: "sql" | "kb" | "hybrid" | "clarify" | "refuse";
  routing?: {
    decision: string;
    sql_enabled: boolean;
    kb_enabled: boolean;
    execution_mode: "sql" | "kb" | "parallel" | "clarify" | "refuse";
  };
  factsTrace?: any;
  retrievalTrace?: any;
  trace?: any;
}

/**
 * Intent → Source Routing Table
 *
 * Defines which resolver(s) to use for each intent
 */
const INTENT_ROUTING: Record<string, "sql" | "kb" | "hybrid"> = {
  // SQL Facts (jenny-api resolvers)
  "ecs.list": "sql",
  "awards.list": "sql",
  "programs.list": "sql",
  "academics.summary": "sql",
  "narrative.summary": "sql",
  "progression.timeline": "sql",
  "sat.ordinal": "sql",
  "gameplan.initial": "sql",
  "gameplan.vs_progress": "sql",
  "application.final": "sql",
  "ivyready.score": "sql",
  "ivyready.initial": "sql",
  "ivyready.final": "sql",
  "ivyready.compare": "sql",
  "ivyready.factors": "sql",
  "readiness.now": "sql",
  "readiness.progress": "sql",
  "readiness.drivers": "sql",
  "readiness.whatif.sat": "sql",
  "readiness.whatif.award": "sql",
  "readiness.whatif.ec": "sql",
  "readiness.whatif.gpa": "sql",
  "readiness.whatif.program": "sql",
  "readiness.next_moves": "sql",
  "readiness.weakspots.now": "sql",
  "readiness.boost.max": "sql",
  "readiness.boost.plan": "sql",
  "readiness.progression": "sql",
  "college.list": "sql",
  "college.compare.readiness": "sql",
  "scholarship.list": "sql",
  "scholarship.total": "sql",

  // KB RAG (Pinecone)
  "kb.search": "kb",
  "coaching.strategy": "kb",
  "time_math": "kb",
  "message_template": "kb",
  "rejection_response": "kb",
  "whatif_priority": "kb",
  "launchx_pivot": "kb",
  "proofpack": "kb",
  "school_stats": "kb",
  "parent_pushback": "kb",
  "escalation": "kb",

  // Hybrid (SQL facts + KB coaching context)
  "assessment": "hybrid",
  "next_steps": "hybrid",
  "progress_review": "hybrid",
  "strategy_review": "hybrid",
};

/**
 * Main orchestrator function
 *
 * Routes query to appropriate resolver(s) based on intent + policy
 */
export async function orchestrateResponse(req: OrchestratorRequest): Promise<OrchestratorResponse> {
  const { message, intent, student_id, week = 0, context = {} } = req;
  const query = message; // Alias for compatibility

  console.log(`[orchestrator] Routing query: "${query.slice(0, 60)}..." | Intent: ${intent.intents[0] || "(none)"} | Source: ${intent.source}`);

  // Check policy flags (with safe defaults)
  const routingPolicy = (policy as any).routing || {};
  const sqlEnabled = routingPolicy.sql_enabled ?? true;
  const kbEnabled = routingPolicy.kb_enabled ?? true;
  const hybridEnabled = routingPolicy.hybrid_enabled ?? true;

  // ====== UNIVERSAL ROUTER INTEGRATION ======
  // Use the new universal router for deterministic routing
  const { routeQuery } = await import('./universalRouter');

  const routerDecision = routeQuery({
    message,
    gptIntent: intent.intents[0],
    lexiconTags: intent.tags || [],
    preferTypes: intent.preferTypes || [],
    context
  });

  console.log(`[orchestrator] Universal router decision:`, routerDecision);
  console.log(`[orchestrator] Reasoning:`, routerDecision.reasoning.join(' | '));

  // Apply policy overrides
  let finalRouting = routerDecision.route;
  let finalIntent = routerDecision.intent;

  if (finalRouting === "sql" && !sqlEnabled) {
    console.log(`[orchestrator] SQL disabled by policy, falling back to KB`);
    finalRouting = "kb";
  }
  if (finalRouting === "kb" && !kbEnabled) {
    console.log(`[orchestrator] KB disabled by policy, falling back to SQL`);
    finalRouting = "sql";
  }
  if (finalRouting === "hybrid" && !hybridEnabled) {
    console.log(`[orchestrator] Hybrid disabled by policy, falling back to SQL`);
    finalRouting = "sql";
  }

  const routing = {
    decision: routerDecision.route,
    sql_enabled: sqlEnabled,
    kb_enabled: kbEnabled,
    execution_mode: finalRouting as "sql" | "kb" | "parallel" | "clarifier" | "refuse",
    confidence: routerDecision.confidence,
    intent: finalIntent,
    reasoning: routerDecision.reasoning
  };

  // Execute resolver(s) based on final routing
  switch (finalRouting) {
    case "refuse":
      return executeRefusalResolver({ message, intentStr: finalIntent, student_id, week, context, routing });

    case "clarify":
      return executeClarifierResolver({ message, intentStr: finalIntent, student_id, week, context, routing });

    case "sql":
      return executeSQLResolver({ message, intentStr: finalIntent, student_id, week, context, routing });

    case "kb":
      return executeKBResolver({ message, intentStr: finalIntent, student_id, week, context, routing });

    case "hybrid":
      return executeHybridResolver({ message, intentStr: finalIntent, student_id, week, context, routing });

    default:
      // Fallback: KB search
      return executeKBResolver({ message, intentStr: finalIntent, student_id, week, context, routing });
  }
}

/**
 * Execute SQL Fact Resolver (jenny-api)
 */
async function executeSQLResolver(
  req: { message: string; intentStr: string; student_id: string; week?: number; context?: any; routing: any }
): Promise<OrchestratorResponse> {
  const { message, intentStr, student_id, week, context, routing } = req;

  console.log(`[orchestrator] Executing SQL resolver via jenny-api for query: "${message.slice(0, 60)}..."`);

  try {
    // Import jenny-api client dynamically
    const { callJennyApi, checkJennyApiHealth } = await import('./jennyApiClient');

    // Check if jenny-api is available
    const isHealthy = await checkJennyApiHealth();
    if (!isHealthy) {
      console.log(`[orchestrator] Jenny API not available, falling back to KB`);
      return executeKBResolver({ ...req, routing: { ...routing, execution_mode: "kb" } });
    }

    // Call jenny-api HTTP service
    const jennyResponse = await callJennyApi({
      message,
      student_id,
      week,
      context,
    });

    console.log(`[orchestrator] Jenny API returned: ${jennyResponse.chips?.length || 0} chips, ${jennyResponse.hits?.length || 0} hits`);

    // Deduplicate answer lines (jenny-api sometimes returns duplicate rows)
    let cleanedAnswer = jennyResponse.answer || "No answer from jenny-api";
    if (cleanedAnswer && cleanedAnswer.includes('\n')) {
      const lines = cleanedAnswer.split('\n');
      const seen = new Set<string>();
      const dedupedLines = lines.filter(line => {
        // Normalize: lowercase, remove dashes/spaces for comparison
        const normalized = line.toLowerCase().replace(/[—\-\s]/g, '');
        if (normalized && !seen.has(normalized)) {
          seen.add(normalized);
          return true;
        }
        return false;
      });
      cleanedAnswer = dedupedLines.join('\n');
      if (dedupedLines.length < lines.length) {
        console.log(`[orchestrator] Deduped answer: ${lines.length} → ${dedupedLines.length} lines`);
      }
    }

    // Transform jenny-api response to unified format
    return {
      answer: cleanedAnswer,
      chips: jennyResponse.chips || [],
      facts: jennyResponse.hits || [], // jenny-api calls them 'hits' but they're SQL facts
      hits: [], // No KB hits for SQL-only queries
      source: "sql",
      routing,
      factsTrace: {
        student_id,
        intent: intentStr,
        fact_count: jennyResponse.hits?.length || 0,
        model: jennyResponse.model || "jenny-api",
      },
    };
  } catch (error: any) {
    console.error(`[orchestrator] SQL resolver error:`, error);

    // Fallback to KB on error
    console.log(`[orchestrator] Falling back to KB due to SQL error`);
    return executeKBResolver({ ...req, routing: { ...routing, execution_mode: "kb" } });
  }
}

/**
 * Execute KB RAG Resolver (Pinecone)
 */
async function executeKBResolver(
  req: { message: string; intentStr: string; student_id: string; week?: number; context?: any; routing: any }
): Promise<OrchestratorResponse> {
  const { message, intentStr, student_id, routing } = req;
  const query = message; // Alias for retrieval API

  console.log(`[orchestrator] Executing KB resolver for query: "${query.slice(0, 60)}..."`);

  try {
    // Retrieve from Pinecone
    const compositionPolicy = (policy as any).composition || {};
    const hits = await retrieve({
      query,
      k: compositionPolicy.max_kb_hits || 10,
      namespace: "KBv6_2025-10-06_v1.0", // Default namespace
    });

    console.log(`[orchestrator] Retrieved ${hits.length} KB hits`);

    if (!hits.length) {
      return {
        answer: "I don't have enough context to answer that question. Could you rephrase or provide more details?",
        hits: [],
        source: "kb",
        routing,
      };
    }

    // Transform Evidence[] to Hit[] for composeAnswer
    const hitsForCompose = hits.map((e: any) => ({
      id: e.chip_id,
      score: e.score,
      content: e.content,
      namespace: e.namespace,
      metadata: e.metadata,
    }));

    // Compose answer using KB hits
    const result = composeAnswer(query, [], hitsForCompose); // No tags available from intentStr
    const answer = result.answer;

    // Extract chips from hits (if any)
    const chips = hits
      .filter((h: any) => h.metadata?.chip_id)
      .map((h: any) => ({
        chip_id: h.metadata.chip_id,
        source_id: h.metadata.source_id,
        text: h.metadata.text?.slice(0, 100) || "",
        score: h.score,
      }))
      .slice(0, 10);

    return {
      answer,
      chips,
      hits,
      source: "kb",
      routing,
      retrievalTrace: {
        query,
        tags: [],
        hit_count: hits.length,
        top_score: hits[0]?.score,
      },
    };
  } catch (error: any) {
    console.error(`[orchestrator] KB resolver error:`, error);
    return {
      answer: `Error retrieving knowledge base: ${error.message}`,
      chips: [{ kind: "error", text: "kb_resolver_error" }],
      source: "kb",
      routing,
    };
  }
}

/**
 * Execute Hybrid Resolver (SQL Facts + KB Coaching Context)
 *
 * Runs both resolvers in parallel, then fuses results
 */
async function executeHybridResolver(
  req: { message: string; intentStr: string; student_id: string; week?: number; context?: any; routing: any }
): Promise<OrchestratorResponse> {
  const { message, intentStr, student_id, routing } = req;
  const query = message; // Alias for compatibility

  console.log(`[orchestrator] Executing HYBRID resolver (SQL + KB in parallel)`);

  try {
    const parallelEnabled = policy.routing?.parallel_execution ?? true;

    let sqlResult: OrchestratorResponse;
    let kbResult: OrchestratorResponse;

    if (parallelEnabled) {
      // Execute in parallel for speed
      [sqlResult, kbResult] = await Promise.all([
        executeSQLResolver({ ...req, routing: { ...routing, execution_mode: "sql" } }),
        executeKBResolver({ ...req, routing: { ...routing, execution_mode: "kb" } }),
      ]);
    } else {
      // Sequential execution (fallback)
      sqlResult = await executeSQLResolver({ ...req, routing: { ...routing, execution_mode: "sql" } });
      kbResult = await executeKBResolver({ ...req, routing: { ...routing, execution_mode: "kb" } });
    }

    console.log(`[orchestrator] Hybrid results: SQL facts=${sqlResult.facts?.length || 0}, KB hits=${kbResult.hits?.length || 0}`);

    // Fuse results: SQL facts + KB coaching context
    const fusedAnswer = fuseHybridAnswer(sqlResult, kbResult, query);

    return {
      answer: fusedAnswer,
      chips: [...(sqlResult.chips || []), ...(kbResult.chips || [])],
      facts: sqlResult.facts || [],
      hits: kbResult.hits || [],
      source: "hybrid",
      routing: {
        ...routing,
        execution_mode: "parallel",
      },
      factsTrace: sqlResult.factsTrace,
      retrievalTrace: kbResult.retrievalTrace,
    };
  } catch (error: any) {
    console.error(`[orchestrator] Hybrid resolver error:`, error);
    return {
      answer: `Error in hybrid retrieval: ${error.message}`,
      chips: [{ kind: "error", text: "hybrid_resolver_error" }],
      source: "hybrid",
      routing,
    };
  }
}

/**
 * Fuse SQL facts + KB context into unified answer
 *
 * Strategy: Lead with facts, then add coaching context/recommendations
 */
function fuseHybridAnswer(
  sqlResult: OrchestratorResponse,
  kbResult: OrchestratorResponse,
  query: string
): string {
  const hasFacts = sqlResult.facts && sqlResult.facts.length > 0;
  const hasKB = kbResult.hits && kbResult.hits.length > 0;

  // If we have both, fuse them intelligently
  if (hasFacts && hasKB) {
    return `${sqlResult.answer}\n\n---\n\n**Coaching Context:**\n${kbResult.answer}`;
  }

  // If only facts, return facts
  if (hasFacts) {
    return sqlResult.answer;
  }

  // If only KB, return KB
  if (hasKB) {
    return kbResult.answer;
  }

  // Neither: fallback
  return "I don't have enough information to answer that question comprehensively.";
}

/**
 * Execute Refusal Resolver (policy/privacy violations)
 */
async function executeRefusalResolver(
  req: { message: string; intentStr: string; student_id: string; week?: number; context?: any; routing: any }
): Promise<OrchestratorResponse> {
  const { message, intentStr, routing } = req;

  console.log(`[orchestrator] Refusing query due to: ${intentStr}`);

  let refusalMessage = "";
  if (intentStr === "policy.guard") {
    refusalMessage = "I cannot help with creating essays from scratch or impersonating others. However, I can help you brainstorm ideas, review drafts, or provide feedback on your authentic work.";
  } else if (intentStr === "privacy") {
    refusalMessage = "I cannot provide personal contact information for recommenders, teachers, or counselors. Please reach out to them directly through your school's systems.";
  } else {
    refusalMessage = "I'm not able to help with that request. Is there something else I can assist you with?";
  }

  return {
    answer: refusalMessage,
    chips: [],
    facts: [],
    hits: [],
    source: "refuse",
    routing
  };
}

/**
 * Execute Clarifier Resolver (ambiguous/too short queries)
 */
async function executeClarifierResolver(
  req: { message: string; intentStr: string; student_id: string; week?: number; context?: any; routing: any }
): Promise<OrchestratorResponse> {
  const { message, routing } = req;

  console.log(`[orchestrator] Clarifying ambiguous query: "${message}"`);

  const clarificationMessage = `I'd love to help! Could you be more specific? For example:
- "What awards did I win?"
- "Show me my college list"
- "What's my current GPA?"
- "Explain the 168-hour framework"

What would you like to know?`;

  return {
    answer: clarificationMessage,
    chips: [],
    facts: [],
    hits: [],
    source: "clarify",
    routing
  };
}

/**
 * Initialize orchestrator (called on server boot)
 */
export async function initializeOrchestrator() {
  console.log("[orchestrator] Initializing...");

  // Test DB connection
  try {
    await pool.query("SELECT 1");
    console.log("[orchestrator] PostgreSQL connection pool ready");
  } catch (error: any) {
    console.error("[orchestrator] Failed to connect to PostgreSQL:", error.message);
    throw error;
  }

  console.log("[orchestrator] Ready (SQL + KB + Hybrid)");
}

/**
 * Cleanup (called on server shutdown)
 */
export async function shutdownOrchestrator() {
  console.log("[orchestrator] Shutting down...");
  await pool.end();
  console.log("[orchestrator] PostgreSQL pool closed");
}

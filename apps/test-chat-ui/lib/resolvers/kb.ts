/**
 * KB RAG Resolver Adapter
 *
 * Wrapper around Pinecone retrieval with policy-driven namespace routing
 * Exports unified interface for orchestrator
 */

import { retrieveWithPolicy } from "../retrieval";
import type { IntentResult } from "../types";

/**
 * KB Resolver Request
 */
export interface KBResolverRequest {
  query: string;
  student_id: string;
  intent: IntentResult;
  k?: number;
}

/**
 * KB Resolver Response
 */
export interface KBResolverResponse {
  hits: any[];
  trace?: {
    query: string;
    tags: string[];
    namespaces: string[];
    hit_count: number;
    top_score?: number;
  };
}

/**
 * Retrieve from KB with policy-driven namespace routing
 */
export async function retrieveKB(req: KBResolverRequest): Promise<any[]> {
  const { query, student_id, intent, k = 10 } = req;

  console.log(
    `[kb-adapter] Retrieving KB for query: "${query.slice(0, 60)}..." | Tags: ${intent.tags.join(", ")}`
  );

  try {
    // Use existing retrieval.ts with policy-driven namespace routing
    const hits = await retrieveWithPolicy({
      query,
      tags: intent.tags,
      filters: {
        student_id, // Optional: filter by student if needed
      },
      k,
    });

    console.log(`[kb-adapter] Retrieved ${hits.length} hits`);

    return hits;
  } catch (error: any) {
    console.error(`[kb-adapter] Retrieval error:`, error);
    throw error;
  }
}

/**
 * Check if intent requires KB resolver
 */
export function isKBIntent(intent: string): boolean {
  const KB_INTENTS = new Set([
    "kb.search",
    "coaching.strategy",
    "time_math",
    "message_template",
    "rejection_response",
    "whatif_priority",
    "launchx_pivot",
    "proofpack",
    "school_stats",
    "parent_pushback",
    "escalation",
  ]);

  return KB_INTENTS.has(intent);
}

/**
 * Extract facet filters from query (used by policy-driven namespace boosting)
 *
 * Examples:
 * - "how did Jenny coach me on NCWIT?" → { award: "NCWIT" }
 * - "show me the 168 framework" → { framework: "168" }
 * - "how did we scale Empowering AI?" → { activity: "Empowering AI" }
 */
export function extractFacets(query: string): Record<string, string> {
  const facets: Record<string, string> = {};
  const q = query.toLowerCase();

  // Award facets
  if (/ncwit|national\s+center\s+for\s+women.*computing/.test(q)) {
    facets.award = "NCWIT";
  }
  if (/bank\s+of\s+america/.test(q)) {
    facets.award = "Bank of America";
  }
  if (/regeneron|sts/.test(q)) {
    facets.award = "Regeneron STS";
  }
  if (/coca[\s-]?cola/.test(q)) {
    facets.award = "Coca-Cola Scholars";
  }

  // Framework facets
  if (/\b168([- ]?hour)?\b/.test(q)) {
    facets.framework = "168";
  }
  if (/proof[\s-]?pack/.test(q)) {
    facets.framework = "ProofPack";
  }

  // Activity facets
  if (/empowering\s+ai/.test(q)) {
    facets.activity = "Empowering AI";
  }
  if (/synthoria/.test(q)) {
    facets.activity = "Synthoria";
  }
  if (/folklift/.test(q)) {
    facets.activity = "Folklift";
  }
  if (/jcamp|j-camp/.test(q)) {
    facets.activity = "JCamp";
  }
  if (/kode\s+with\s+klossy|kwk/.test(q)) {
    facets.activity = "Kode With Klossy";
  }

  return facets;
}

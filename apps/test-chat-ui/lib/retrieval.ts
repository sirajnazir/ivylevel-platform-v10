/**
 * KB Retrieval Client (v1.2)
 * Federated search across KBv6 namespaces with namespace guard
 */

import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

// Initialize clients
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export type RetrievalOptions = {
  query: string;
  namespaces?: string[]; // federated search
  topK?: number;
  filters?: Record<string, any>; // e.g., { phase: "P1-FOUNDATION", type: "Trust_Chip" }
};

export type Evidence = {
  rank: number;
  score?: number;
  namespace: string;
  chip_id: string;
  type?: string;
  week?: string;
  phase?: string;
  content?: string;
  metadata?: Record<string, any>;
};

/**
 * Namespace guard - blocks unauthorized namespaces
 */
function assertAllowedNamespaces(namespaces: string[]) {
  const allowed = (process.env.PINECONE_ALLOWED_NAMESPACES || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  if (!allowed.length) {
    // If not set, allow all (backwards compatible)
    return;
  }

  for (const ns of namespaces) {
    if (!allowed.includes(ns)) {
      throw new Error(
        `❌ Blocked namespace: "${ns}" | Allowed: [${allowed.join(", ")}]`
      );
    }
  }
}

/**
 * Embed query using text-embedding-3-large (3072 dims)
 */
async function embed(query: string): Promise<number[]> {
  const { data } = await openai.embeddings.create({
    model: "text-embedding-3-large",
    input: query,
  });
  return data[0].embedding;
}

/**
 * Federated retrieval across multiple namespaces
 */
export async function retrieve(opts: RetrievalOptions): Promise<Evidence[]> {
  const {
    query,
    namespaces = (process.env.PINECONE_NAMESPACES || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean),
    topK = 6,
    filters,
  } = opts;

  // Namespace guard check
  assertAllowedNamespaces(namespaces);

  // Embed query
  const vector = await embed(query);
  const index = pc.index(process.env.PINECONE_INDEX!);

  console.log(`[Retrieval] Query: "${query}"`);
  console.log(`[Retrieval] Namespaces: ${namespaces.join(", ")}`);
  console.log(`[Retrieval] Filters:`, filters);

  // Federated search: query each namespace in parallel
  const results = await Promise.all(
    namespaces.map(ns =>
      index
        .namespace(ns)
        .query({
          vector,
          topK,
          includeMetadata: true,
          filter: filters || undefined,
        })
        .then(r => r.matches?.map(m => ({ ...m, _ns: ns })) || [])
    )
  );

  // Pool results from all namespaces
  const pooled = results.flat();

  // Apply hybrid heuristics (optional score nudges based on query patterns)
  applyHybridHeuristics(query, pooled);

  // Rerank by score descending
  pooled.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  // Take top-k and format as Evidence
  const topK_results = pooled.slice(0, topK);

  const evidence: Evidence[] = topK_results.map((hit, i) => ({
    rank: i + 1,
    score: hit.score,
    namespace: hit._ns as string,
    chip_id: hit.id,
    type: hit.metadata?.type as string,
    week: hit.metadata?.source_doc?.week || hit.metadata?.week,
    phase: hit.metadata?.source_doc?.phase || hit.metadata?.phase,
    content: hit.metadata?.content as string,
    metadata: hit.metadata as Record<string, any>,
  }));

  console.log(`[Retrieval] Top-${topK} results:`);
  evidence.forEach(e => {
    console.log(`  [${e.rank}] ${e.chip_id} (${e.namespace}, ${e.type}, score: ${e.score?.toFixed(3)})`);
  });

  return evidence;
}

/**
 * Apply hybrid heuristics (score nudges based on query patterns)
 */
function applyHybridHeuristics(query: string, pooled: any[]) {
  const queryLower = query.toLowerCase();

  // Time-related queries: boost Sessions+Exec namespace
  if (/\b(168|hours?|time\s*math|weekly|schedule|framework)\b/i.test(query)) {
    pooled.forEach(m => {
      if (m._ns === "KBv6_2025-10-06_v1.0") {
        m.score = (m.score ?? 0) + 0.05;
      }
    });
  }

  // iMessage micro-interactions: boost iMessage namespace
  if (
    /\b(template|message|text|note|thank\s*you|parent|emoji|tone)\b/i.test(query)
  ) {
    pooled.forEach(m => {
      if (m._ns === "KBv6_iMessage_2025-10-07_v1.0") {
        m.score = (m.score ?? 0) + 0.03;
      }
    });
  }

  // Assessment/GamePlan: boost Assessment namespace
  if (/\b(assessment|gameplan|trust|initial|gaps|synthesis)\b/i.test(query)) {
    pooled.forEach(m => {
      if (m._ns === "KBv6_Assessment_2025-10-07_v1.0") {
        m.score = (m.score ?? 0) + 0.04;
      }
    });
  }
}

/**
 * Truncate long strings for display
 */
export function truncate(s: string, maxLen: number = 450): string {
  if (!s) return "";
  return s.length > maxLen ? s.slice(0, maxLen) + "…" : s;
}

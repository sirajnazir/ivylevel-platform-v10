/**
 * KB Retrieval Client (v1.3)
 * Federated search across KBv6 namespaces with namespace guard + LRU cache
 */

import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import { LRUCache } from "lru-cache";
import { getChipContent } from "./chip-lookup";

// Initialize clients
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// LRU cache for retrieval results (normalized query + tags as key)
// Cache for 120 seconds, max 100 entries
const retrievalCache = new LRUCache<string, Evidence[]>({
  max: 100,
  ttl: 1000 * 120, // 120 seconds
  updateAgeOnGet: true
});

export type RetrievalOptions = {
  query: string;
  namespaces?: string[]; // federated search
  topK?: number;
  filters?: Record<string, any>; // e.g., { phase: "P1-FOUNDATION", type: "Trust_Chip" }
  tags?: string[]; // intent tags for policy-driven boosting
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
 * Generate cache key from normalized query + tags
 */
function getCacheKey(query: string, tags: string[]): string {
  const normalizedQuery = query.trim().toLowerCase();
  const sortedTags = [...tags].sort().join(",");
  return `${normalizedQuery}||${sortedTags}`;
}

/**
 * Federated retrieval across multiple namespaces (with LRU cache)
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
    tags = [],
  } = opts;

  // Check cache first
  const cacheKey = getCacheKey(query, tags);
  const cached = retrievalCache.get(cacheKey);
  if (cached) {
    console.log(`[Retrieval] Cache hit for: "${query.slice(0, 60)}..."`);
    return cached;
  }

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

  // Apply hybrid heuristics (optional score nudges based on query patterns + tags)
  applyHybridHeuristics(query, tags, pooled);

  // Apply type-based micro-rerank for intent matching
  applyTypeMicroRerank(query, pooled);

  // Rerank by score descending
  pooled.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  // Take top-k and format as Evidence
  const topK_results = pooled.slice(0, topK);

  const evidence: Evidence[] = topK_results.map((hit, i) => {
    const md = hit.metadata || {};
    const chip_id = hit.id;

    // Try metadata first, then fallback to file lookup
    let content = (md.content || md.text || md.chunk || "") as string;
    if (!content) {
      content = getChipContent(chip_id);
    }

    return {
      rank: i + 1,
      score: hit.score,
      namespace: hit._ns as string,
      chip_id,
      type: (md.type || md.chip_type || md.category || "UnknownType") as string,
      week: md.source_doc?.week || md.week || "",
      phase: md.source_doc?.phase || md.phase || "",
      content,
      metadata: md as Record<string, any>,
    };
  });

  console.log(`[Retrieval] Top-${topK} results:`);
  evidence.forEach(e => {
    console.log(`  [${e.rank}] ${e.chip_id} (${e.namespace}, ${e.type}, score: ${e.score?.toFixed(3)})`);
  });

  // Store in cache
  retrievalCache.set(cacheKey, evidence);

  return evidence;
}

/**
 * Apply type-based micro-rerank for intent matching
 */
function applyTypeMicroRerank(query: string, pooled: any[]) {
  const q = query.toLowerCase();

  // Assessment intent → boost Insight_Chip, Trust_Chip, Result_Chip
  if (/\b(assessment|baseline|gaps?|diagnose|initial)\b/i.test(q)) {
    pooled.forEach(m => {
      const type = m.metadata?.type || m.metadata?.chip_type || "";
      if (/(Insight|Trust|Result)_Chip/i.test(type)) {
        m.score = (m.score ?? 0) + 0.05;
      }
    });
  }

  // Template/message intent → boost Message_Template_Chip, Micro_Tactic_Chip
  if (/\b(template|message|note|text)\b/i.test(q)) {
    pooled.forEach(m => {
      const type = m.metadata?.type || m.metadata?.chip_type || "";
      if (/(Message_Template|Micro_Tactic)_Chip/i.test(type)) {
        m.score = (m.score ?? 0) + 0.05;
      }
    });
  }

  // Framework/system intent → boost Framework_Chip, Strategy_Chip
  if (/\b(framework|system|approach|methodology)\b/i.test(q)) {
    pooled.forEach(m => {
      const type = m.metadata?.type || m.metadata?.chip_type || "";
      if (/(Framework|Strategy)_Chip/i.test(type)) {
        m.score = (m.score ?? 0) + 0.05;
      }
    });
  }
}

/**
 * Apply hybrid heuristics (policy-driven score nudges)
 * Uses both base namespace priors and tag-specific priors from policy.json
 */
function applyHybridHeuristics(query: string, tags: string[], pooled: any[]) {
  // Import getPolicy dynamically to avoid circular dependency issues
  let policy: any;
  try {
    policy = require("./policy").getPolicy();
  } catch (e) {
    console.warn("[Retrieval] Policy not available, skipping priors");
    return;
  }

  const add = (ns: string, bump: number) =>
    pooled.forEach(m => {
      if (m._ns === ns) {
        m.score = (m.score ?? 0) + bump;
      }
    });

  // Apply base namespace priors (with safety check)
  if (policy.priors && typeof policy.priors === "object") {
    Object.keys(policy.priors).forEach(ns => {
      if (ns !== "tags" && typeof policy.priors[ns] === "number") {
        add(ns, policy.priors[ns]);
      }
    });
  }

  // Apply tag-specific priors (higher priority)
  if (policy.priors && policy.priors.tags && tags.length > 0) {
    tags.forEach(tag => {
      const tagPriors = policy.priors.tags[tag];
      if (tagPriors) {
        Object.keys(tagPriors).forEach(ns => {
          add(ns, tagPriors[ns]);
        });
      }
    });
  }

  console.log(`[Retrieval] Applied priors for tags: [${tags.join(", ")}]`);
}

/**
 * Truncate long strings for display
 */
export function truncate(s: string, maxLen: number = 450): string {
  if (!s) return "";
  return s.length > maxLen ? s.slice(0, maxLen) + "…" : s;
}

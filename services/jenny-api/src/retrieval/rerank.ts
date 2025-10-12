import { CohereClient } from 'cohere-ai';

interface RerankConfig {
  topk: number;
  min_score: number;
  keep_at_least: number;
}

/**
 * KBv6 Reranker with min_score and keep_at_least logic
 *
 * Ensures we always keep at least N results even if scores are below threshold,
 * preventing "zero result" fallbacks that look like failures.
 *
 * @param query - Search query
 * @param candidates - Results from vector + lexical search (must have _text field)
 * @param config - Rerank configuration { topk, min_score, keep_at_least }
 */
export async function rerank(
  query: string,
  candidates: any[],
  config: RerankConfig | number
) {
  if (candidates.length === 0) return [];

  // Handle legacy number-only topK parameter
  const cfg: RerankConfig = typeof config === 'number'
    ? { topk: config, min_score: 0.12, keep_at_least: 3 }
    : config;

  // Create client with current env var
  const cohere = new CohereClient({ token: process.env.COHERE_API_KEY! });

  const { results } = await cohere.rerank({
    model: 'rerank-english-v3.0',
    query,
    documents: candidates.map(c => c._text || c.text || ''),
    topN: Math.min(cfg.topk, candidates.length)
  });

  // Map rerank scores back to candidates
  const scored = results.map(r => ({
    ...candidates[r.index],
    rerankScore: r.relevanceScore
  }));

  // Filter by min_score
  const passThreshold = scored.filter(x => x.rerankScore >= cfg.min_score);

  // Keep at least N results (prevent zero results)
  if (passThreshold.length >= cfg.keep_at_least) {
    return passThreshold;
  }

  // If we have fewer than keep_at_least passing threshold, return top-N scored items
  return scored.slice(0, cfg.keep_at_least);
}
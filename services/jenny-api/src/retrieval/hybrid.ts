import { queryVectors } from './pinecone';
import { lexicalSearch } from './lexical';
import { rerank } from './rerank';
import cfg from './retrieval.config.json';

/**
 * KBv6 Hybrid Search - Config-driven namespace queries
 * Queries 2 or 3 namespaces based on include_assessments_in_rag flag
 *
 * Default: jtbd (924 vectors) + interactions (40 vectors)
 * Optional: assessments (9 vectors) - source-gated, excluded by default
 */
export async function hybridSearch(q: string, studentId: string) {
  // Query KBv6 namespaces (config-driven)
  const jobs = [
    queryVectors('jtbd', q, cfg.rag_topk_per_ns),
    queryVectors('interactions', q, cfg.rag_topk_per_ns),
  ];

  // Conditionally include assessments namespace
  if (cfg.include_assessments_in_rag) {
    jobs.push(queryVectors('assessments', q, cfg.rag_topk_per_ns));
  }

  const results = await Promise.all(jobs);
  const [jtbd, inter, assess = []] = results;

  // Student-scoped lexical search
  const scoped = await lexicalSearch(studentId, q, cfg.lexical_topk);

  // Global fallback if no student-scoped results (KBv6 behavior)
  const globalFallback = scoped.length ? [] : await lexicalSearch(null, q, cfg.lexical_topk);

  // Extract text content from various possible field names
  const getText = (m: any) => m.text || m.content || m.body || m.chunk || m.snippet || '';

  const merged = [...jtbd, ...inter, ...assess, ...scoped, ...globalFallback]
    .map(m => ({ ...m, _text: getText(m) }))
    .filter(m => m._text?.trim().length > 0);

  // Rerank with KBv6 config (topk, min_score, keep_at_least)
  return rerank(q, merged, cfg.rerank);
}
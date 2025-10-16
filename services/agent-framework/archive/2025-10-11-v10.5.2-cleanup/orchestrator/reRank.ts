import { SearchHit } from '../utils/types.js';

export function reRank(hits: SearchHit[], q: string): SearchHit[] {
  // Lightweight heuristic reranker; swap with LLM‑based or cross‑encoder later
  // Boost recent interactions and exact term matches
  const now = Date.now();
  const terms = new Set(q.toLowerCase().split(/\s+/g).filter(Boolean));
  const scored = hits.map(h => {
    const t = (h.metadata?.occurred_at ? new Date(h.metadata.occurred_at).getTime() : now - 365*86400e3);
    const recency = Math.max(0, 1 - (now - t)/(180*86400e3)); // within 6 months
    const exact = [...terms].some(term => String(h.text).toLowerCase().includes(term)) ? 0.1 : 0;
    const score = h.score + 0.2*recency + exact;
    return { ...h, score };
  });
  return scored.sort((a,b)=>b.score-a.score);
}
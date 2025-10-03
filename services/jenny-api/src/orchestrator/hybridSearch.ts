import { Pinecone } from '@pinecone-database/pinecone';
import { cfg } from '../config.js';
import { SearchFilters, SearchHit } from '../utils/types.js';
import { lexicalSearch } from '../services/search.js';

export type EmbedFn = (text: string)=> Promise<number[]>;

const pc = new Pinecone({ apiKey: cfg.pinecone.apiKey });

export async function hybridSearch(q: string, filters: SearchFilters, embed: EmbedFn): Promise<SearchHit[]> {
  // dense side
  const vec = await embed(q);
  const index = pc.index(cfg.pinecone.indexName);
  const denseRes = await index.namespace('interactions').query({
    vector: vec,
    topK: 50,
    includeMetadata: true,
  });
  const denseHits: SearchHit[] = denseRes.matches?.map((m:any)=>({
    namespace: 'interactions' as const, id: m.id, text: (m.metadata?.text as string) || '', metadata: m.metadata || {}, score: Number(m.score), dense: Number(m.score)
  })) || [];

  // lexical side (Postgres FTS)
  const lexHits = await lexicalSearch(q, filters);

  // simple hybrid fuse: normalized score with weights
  const byId = new Map<string, SearchHit>();
  const push = (h: SearchHit) => {
    const key = h.namespace + ':' + h.id;
    const prev = byId.get(key);
    if (!prev) { byId.set(key, h); return; }
    byId.set(key, { ...prev, bm25: h.bm25 ?? prev.bm25, dense: h.dense ?? prev.dense, score: (prev.score + h.score)/2 });
  };
  denseHits.forEach(push); lexHits.forEach(push);

  // re‑score
  const W_BM25 = 0.45, W_DENSE = 0.55;
  for (const h of byId.values()){
    const bm = h.bm25 ?? 0; const de = h.dense ?? h.score;
    h.score = W_BM25*bm + W_DENSE*de;
  }
  return Array.from(byId.values()).sort((a,b)=>b.score-a.score).slice(0,50);
}
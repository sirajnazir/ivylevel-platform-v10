import { queryVectors } from './pinecone-logged.js';
import { lexicalSearch } from './lexical-logged.js';
import { rerank } from './rerank-logged.js';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('hybrid_search');

export async function hybridSearch(q:string, studentId:string){
  const searchStart = Date.now();
  
  log.event('hybrid_search_start', { 
    query_preview: q.slice(0, 120), 
    student_id: studentId 
  });

  const [jtbd, inter] = await Promise.all([
    queryVectors('jtbd', q, 6),
    queryVectors('interactions', q, 6)
  ]);
  
  const lexical = await lexicalSearch(studentId, q, 10);

  log.event('retrieval_complete', {
    jtbd_count: jtbd.length,
    interactions_count: inter.length,
    lexical_count: lexical.length,
    duration_ms: Date.now() - searchStart
  });

  // Prefer entries with text
  const merged = [...jtbd, ...inter, ...lexical].filter(m => (m as any).text?.length>0);
  
  const reranked = await rerank(q, merged, 8);
  
  log.event('hybrid_search_complete', {
    pre_rerank_count: merged.length,
    post_rerank_count: reranked.length,
    total_duration_ms: Date.now() - searchStart
  });
  
  return reranked;
}
import { CohereClient } from 'cohere-ai';
import { wrapCohere } from '../observability/wrappers.js';

export async function rerank(query:string, candidates:{text:string}[], topK=8){
  if(candidates.length===0) return [];
  
  // Create client with current env var
  const cohere = new CohereClient({ token: process.env.COHERE_API_KEY! });
  const wrapped = wrapCohere(cohere);
  
  const { results } = await wrapped.rerank({
    query,
    documents: candidates.map(c => ({ text: c.text })),
    topN: Math.min(topK, candidates.length)
  });
  
  return results.map((r:any,i:number)=>({ 
    ...candidates[i], 
    rerankScore: r.relevance_score 
  }));
}
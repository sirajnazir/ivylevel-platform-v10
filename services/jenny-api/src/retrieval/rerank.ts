import { CohereClient } from 'cohere-ai';

export async function rerank(query:string, candidates:{text:string}[], topK=8){
  if(candidates.length===0) return [];
  
  // Create client with current env var
  const cohere = new CohereClient({ token: process.env.COHERE_API_KEY! });
  
  const { results } = await cohere.rerank({
    model: 'rerank-english-v3.0', query, documents: candidates.map(c=>c.text), topN: Math.min(topK,candidates.length)
  });
  return results.map(r=>({ ...candidates[r.index], rerankScore: r.relevanceScore }));
}
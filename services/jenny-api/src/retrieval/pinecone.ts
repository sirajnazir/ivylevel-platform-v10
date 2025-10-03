import { Pinecone } from '@pinecone-database/pinecone';
import { embed } from '../ai/openai';

let pc: Pinecone | null = null;
function getPinecone() {
  if (!pc) {
    pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  }
  return pc;
}
export async function queryVectors(ns:'jtbd'|'interactions', q:string, topK=6){
  const vector = await embed(q);
  const INDEX = process.env.PINECONE_INDEX!; // Get index at runtime
  const res = await getPinecone().index(INDEX).namespace(ns).query({
    vector, topK, includeMetadata: true
  });
  return (res.matches||[]).map(m=>({
    id: m.id, namespace: ns, text: (m.metadata as any)?.text ?? '', score: m.score ?? 0, metadata: m.metadata
  }));
}
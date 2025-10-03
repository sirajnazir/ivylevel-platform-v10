import { Pinecone } from '@pinecone-database/pinecone';
import { embed } from '../ai/openai-logged.js';
import { wrapPinecone } from '../observability/wrappers.js';

let pc: Pinecone | null = null;
let wrappedIndex: any = null;

function getPinecone() {
  if (!pc) {
    pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  }
  return pc;
}

function getWrappedIndex() {
  if (!wrappedIndex) {
    const INDEX = process.env.PINECONE_INDEX!;
    wrappedIndex = wrapPinecone(getPinecone().index(INDEX));
  }
  return wrappedIndex;
}

export async function queryVectors(ns:'jtbd'|'interactions', q:string, topK=6){
  const vector = await embed(q);
  const res = await getWrappedIndex().queryNamespace(ns, vector, topK);
  return (res.matches||[]).map((m: any) =>({
    id: m.id, namespace: ns, text: (m.metadata as any)?.text ?? '', score: m.score ?? 0, metadata: m.metadata
  }));
}
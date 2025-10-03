import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import type { RagRecord } from "../../../packages/types/dist";
import { child } from "@packages/logger";

const log = child({ svc: "retriever" });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function embed(texts: string[]) {
  const res = await openai.embeddings.create({ model: "text-embedding-3-small", input: texts });
  return res.data.map(d => d.embedding);
}

export async function pineconeQuery({ q, k, namespace, filter }: { q: string; k: number; namespace: string; filter?: any; }) {
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  const idx = pc.index(process.env.PINECONE_INDEX!);
  const [vec] = await embed([q]);
  const res = await idx.namespace(namespace).query({ vector: vec, topK: k, filter, includeMetadata: true });
  return res.matches?.map(m => ({ id: m.id, score: m.score, ...m.metadata })) || [];
}

export async function pineconeUpsert(records: RagRecord[], ns: string) {
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  const idx = pc.index(process.env.PINECONE_INDEX!);
  const chunks = [];
  for (let i=0; i<records.length; i+=64) chunks.push(records.slice(i, i+64));
  for (const batch of chunks) {
    const embs = await embed(batch.map(b => b.text));
    const vectors = batch.map((b, i) => ({
      id: b.id, 
      values: embs[i],
      metadata: { 
        text: b.text,
        ...(b.metadata ? Object.fromEntries(
          Object.entries(b.metadata).filter(([k, v]) => 
            typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
          )
        ) : {})
      }
    }));
    log.debug({ upserting: vectors.length });
    await idx.namespace(ns).upsert(vectors);
  }
}

// Kind-locked query that ensures single kind retrieval
export async function queryKindLocked({ 
  q, 
  k, 
  kind, 
  namespace, 
  additionalFilter 
}: { 
  q: string; 
  k: number; 
  kind: string; 
  namespace?: string; 
  additionalFilter?: any; 
}) {
  const filter = {
    kind,
    ...(additionalFilter || {})
  };
  
  // Map kind to namespace for v2 index
  const nsMapping: Record<string, string> = {
    'TRANS-INTEL': 'transcript',
    'EXEC-INTEL': 'exec',
    'IMSG-INTEL': 'imessage',
    'APP-DOC': 'appdoc',
    'GAMEPLAN': 'gameplan'
  };
  
  const effectiveNamespace = namespace || nsMapping[kind] || process.env.PINECONE_NAMESPACE || 'default';
  
  log.debug({ kind, namespace: effectiveNamespace, filter }, "retriever.kind_locked_query");
  
  return pineconeQuery({ q, k, namespace: effectiveNamespace, filter });
}

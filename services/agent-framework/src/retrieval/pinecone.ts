import { Pinecone } from '@pinecone-database/pinecone';
import { embed } from '../ai/openai';
import { CFG } from '../config/env';
import cfg from './retrieval.config.json';

let pc: Pinecone | null = null;
function getPinecone() {
  if (!pc) {
    pc = new Pinecone({ apiKey: CFG.PINECONE_API_KEY });
  }
  return pc;
}

/**
 * Assert embedding/index parity to prevent KBv6 mismatches
 * Throws if configuration doesn't match KBv6 requirements
 */
export async function assertIndexParity(
  expectedDim: number = 3072,
  expectedModel: string = 'text-embedding-3-large'
) {
  const dim = CFG.PINECONE_INDEX_DIM;
  const model = CFG.EMBEDDING_MODEL_ID;

  if (dim !== expectedDim) {
    throw new Error(`❌ Pinecone dimension mismatch: got ${dim}, expected ${expectedDim} for KBv6`);
  }

  if (model !== expectedModel) {
    throw new Error(`❌ Embedding model mismatch: got ${model}, expected ${expectedModel} for KBv6`);
  }

  console.log('[KBv6] Index parity verified:', { dim, model, index: CFG.PINECONE_INDEX_NAME });
}

// Map logical names to actual Pinecone namespaces (KBv6)
const NAMESPACE_MAP: Record<string, string> = cfg.namespaces;

export async function queryVectors(ns: string, q: string, topK: number = 6) {
  const vector = await embed(q);
  const INDEX = CFG.PINECONE_INDEX_NAME;
  const actualNamespace = NAMESPACE_MAP[ns] || ns;

  const res = await getPinecone().index(INDEX).namespace(actualNamespace).query({
    vector,
    topK,
    includeMetadata: true
  });

  return (res.matches || []).map(m => ({
    id: m.id,
    namespace: actualNamespace,
    text: (m.metadata as any)?.text ?? '',
    score: m.score ?? 0,
    metadata: m.metadata
  }));
}
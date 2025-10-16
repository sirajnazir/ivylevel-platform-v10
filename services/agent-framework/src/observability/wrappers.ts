import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';
import type { Pool } from 'pg';
const log = createLogger('wrappers');

/** PG */
export async function pgQuery(pool: Pool, label: string, text: string, params: any[]) {
  const t0 = Date.now();
  try {
    const res = await pool.query(text, params);
    log.event('pg_query', { label, rows: res.rowCount, duration_ms: Date.now() - t0 });
    return res;
  } catch (err: any) {
    log.error('pg_query_error', err, { label, duration_ms: Date.now() - t0 });
    throw err;
  }
}

/** OpenAI */
export function wrapOpenAI(client: any) {
  return {
    async embed(input: string, model = 'text-embedding-3-large') {
      const t0 = Date.now();
      try {
        const resp = await client.embeddings.create({ model, input });
        const duration_ms = Date.now() - t0;
        log.event('openai_embeddings', { model, duration_ms, dim: resp.data?.[0]?.embedding?.length || 0 });
        return resp;
      } catch (err: any) {
        log.error('openai_embeddings_error', err, { model, duration_ms: Date.now() - t0 });
        throw err;
      }
    },
    async chat(messages: any[], model: string, opts: any = {}) {
      const t0 = Date.now();
      try {
        const resp = await client.chat.completions.create({ model, messages, ...opts });
        const duration_ms = Date.now() - t0;
        const usage = (resp as any).usage || {};
        log.event('openai_chat', { model, duration_ms, prompt_tokens: usage.prompt_tokens, completion_tokens: usage.completion_tokens });
        return resp;
      } catch (err: any) {
        log.error('openai_chat_error', err, { model, duration_ms: Date.now() - t0 });
        throw err;
      }
    }
  };
}

/** Pinecone */
export function wrapPinecone(index: any) {
  return {
    async queryNamespace(namespace: string, vector: number[], topK = 5, filter?: any) {
      const t0 = Date.now();
      try {
        const res = await index.namespace(namespace).query({ vector, topK, includeMetadata: true, filter });
        log.event('pinecone_query', { namespace, topK, duration_ms: Date.now() - t0, matches: res.matches?.length || 0 });
        return res;
      } catch (err: any) {
        log.error('pinecone_query_error', err, { namespace, duration_ms: Date.now() - t0 });
        throw err;
      }
    },
    async upsertNamespace(namespace: string, vectors: any[]) {
      const t0 = Date.now();
      try {
        const res = await index.namespace(namespace).upsert(vectors);
        log.event('pinecone_upsert', { namespace, count: vectors.length, duration_ms: Date.now() - t0 });
        return res;
      } catch (err: any) {
        log.error('pinecone_upsert_error', err, { namespace, duration_ms: Date.now() - t0 });
        throw err;
      }
    }
  };
}

/** Cohere */
export function wrapCohere(cohere: any) {
  return {
    async rerank(inputs: { query: string; documents: { text: string; }[]; topN?: number; model?: string; }) {
      const t0 = Date.now();
      try {
        const res = await cohere.rerank({ model: inputs.model || 'rerank-english-v3.0', query: inputs.query, documents: inputs.documents, topN: inputs.topN || 10 });
        log.event('cohere_rerank', { model: inputs.model || 'rerank-english-v3.0', docs: inputs.documents.length, duration_ms: Date.now() - t0 });
        return res;
      } catch (err: any) {
        log.error('cohere_rerank_error', err, { duration_ms: Date.now() - t0 });
        throw err;
      }
    }
  };
}
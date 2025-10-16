import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import { CohereClient } from 'cohere-ai';
import { Trace, sanitizers } from './trace.js';
import { pool } from '../db/pool.js';

// Wrapped Pinecone client
export function createTracedPinecone(trace?: Trace) {
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!
  });

  const index = pinecone.index(process.env.PINECONE_INDEX!);
  
  return {
    ...index,
    query: async (queryOptions: any) => {
      if (!trace) {
        return index.query(queryOptions);
      }

      return trace.wrap(
        'retriever',
        'pinecone_query',
        () => index.query(queryOptions),
        {
          api_provider: 'pinecone',
          api_method: 'query',
          sanitizeRequest: () => sanitizers.pinecone.request(queryOptions),
          sanitizeResponse: sanitizers.pinecone.response,
          extractMetadata: (result) => ({
            namespace: queryOptions.namespace,
            topK: queryOptions.topK,
            match_count: result.matches?.length || 0
          })
        }
      );
    },
    upsert: async (vectors: any) => {
      if (!trace) {
        return index.upsert(vectors);
      }

      return trace.wrap(
        'ingestion',
        'pinecone_upsert',
        () => index.upsert(vectors),
        {
          api_provider: 'pinecone',
          api_method: 'upsert',
          sanitizeRequest: () => ({ vector_count: vectors.length }),
          sanitizeResponse: (res) => ({ upserted_count: res.upsertedCount })
        }
      );
    }
  };
}

// Wrapped OpenAI client
export function createTracedOpenAI(trace?: Trace) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!
  });

  return {
    ...openai,
    chat: {
      completions: {
        create: async (params: any) => {
          if (!trace) {
            return openai.chat.completions.create(params);
          }

          const result = await trace.wrap(
            'composer',
            params.stream ? 'openai_stream' : 'openai_completion',
            () => openai.chat.completions.create(params),
            {
              api_provider: 'openai',
              api_method: 'chat.completions',
              sanitizeRequest: () => sanitizers.openai.request(params),
              sanitizeResponse: params.stream ? 
                () => ({ streaming: true }) : 
                sanitizers.openai.response,
              extractMetadata: (result: any) => ({
                model: params.model,
                temperature: params.temperature,
                max_tokens: params.max_tokens,
                streaming: params.stream || false
              })
            }
          );

          // Track token usage if available
          if (!params.stream && result.usage) {
            trace.setTokensUsed(result.usage);
          }

          return result;
        }
      }
    },
    embeddings: {
      create: async (params: any) => {
        if (!trace) {
          return openai.embeddings.create(params);
        }

        return trace.wrap(
          'embedder',
          'openai_embedding',
          () => openai.embeddings.create(params),
          {
            api_provider: 'openai',
            api_method: 'embeddings',
            sanitizeRequest: () => ({
              model: params.model,
              input_count: Array.isArray(params.input) ? params.input.length : 1
            }),
            sanitizeResponse: (res) => ({
              usage: res.usage,
              dimension: res.data?.[0]?.embedding?.length
            })
          }
        );
      }
    },
    moderations: {
      create: async (params: any) => {
        if (!trace) {
          return openai.moderations.create(params);
        }

        return trace.wrap(
          'moderation',
          'openai_moderation',
          () => openai.moderations.create(params),
          {
            api_provider: 'openai',
            api_method: 'moderations',
            sanitizeRequest: () => ({ input_length: params.input?.length }),
            sanitizeResponse: (res) => ({
              flagged: res.results?.[0]?.flagged,
              categories: res.results?.[0]?.categories
            })
          }
        );
      }
    }
  };
}

// Wrapped Cohere client
export function createTracedCohere(trace?: Trace) {
  const cohere = new CohereClient({
    token: process.env.COHERE_API_KEY!
  });

  return {
    ...cohere,
    rerank: async (params: any) => {
      if (!trace) {
        return cohere.rerank(params);
      }

      return trace.wrap(
        'reranker',
        'cohere_rerank',
        () => cohere.rerank(params),
        {
          api_provider: 'cohere',
          api_method: 'rerank',
          sanitizeRequest: () => sanitizers.cohere.request(params),
          sanitizeResponse: sanitizers.cohere.response,
          extractMetadata: (result) => ({
            model: params.model,
            document_count: params.documents?.length,
            top_n: params.topN || params.top_n
          })
        }
      );
    }
  };
}

// Wrapped PostgreSQL query
export async function tracedPgQuery(
  trace: Trace | undefined,
  component: string,
  queryName: string,
  query: string,
  params: any[]
): Promise<any> {
  if (!trace) {
    return pool.query(query, params);
  }

  return trace.wrap(
    component,
    `postgres_${queryName}`,
    () => pool.query(query, params),
    {
      api_provider: 'postgres',
      api_method: 'query',
      sanitizeRequest: () => sanitizers.postgres.request({ name: queryName, params }),
      sanitizeResponse: sanitizers.postgres.response,
      extractMetadata: (result) => ({
        query_name: queryName,
        row_count: result.rows?.length || 0,
        param_count: params.length
      })
    }
  );
}
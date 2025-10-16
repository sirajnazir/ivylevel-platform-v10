import type { Pinecone } from '@pinecone-database/pinecone';
import type { Pool } from 'pg';
import { hybridSearch } from '../orchestrator/hybridSearch.js';
import { embed } from '../orchestrator/embeddings.js';

export function createSearch(pinecone: Pinecone, pool: Pool) {
  return {
    async jtbd(params: { q: string; filters?: any }) {
      const hits = await hybridSearch(params.q, params.filters || {}, embed);
      return hits.filter(h => h.namespace === 'jtbd');
    },
    
    async interactions(params: { q: string; filters?: any }) {
      const hits = await hybridSearch(params.q, params.filters || {}, embed);
      return hits.filter(h => h.namespace === 'interactions');
    }
  };
}
import { embedText } from './embed.js';
import { pineconeSearch } from './pinecone.js';
import { lexicalSearch } from './lexical.js';
import { rerankHits } from './rerank.js';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';
import { Trace } from '../tracing/trace.js';
import { createTracedPinecone, createTracedCohere, createTracedOpenAI } from '../tracing/wrapped-clients.js';

const log = createLogger('hybrid-search-traced');

// Constants
const PINECONE_WEIGHT_JTBD = 0.7;
const PINECONE_WEIGHT_INTERACTIONS = 0.3;
const LEXICAL_BOOST = 1.2;

export async function hybridSearchTraced(
  query: string,
  studentId: string,
  trace: Trace
): Promise<any[]> {
  
  const searchEvent = await trace.startEvent({
    component: 'hybrid_search',
    operation: 'full_search_pipeline',
    metadata: { query_length: query.length }
  });

  try {
    // Step 1: Embed query
    const embeddings = await trace.wrap(
      'retrieval',
      'embed_query',
      async () => {
        const openai = createTracedOpenAI(trace);
        const response = await openai.embeddings.create({
          model: 'text-embedding-3-large',
          input: query,
          dimensions: 3072
        });
        return response.data[0].embedding;
      },
      {
        extractMetadata: (embedding) => ({
          dimension: embedding.length,
          model: 'text-embedding-3-large'
        })
      }
    );

    // Step 2: Parallel searches
    const [pineconeJtbd, pineconeInteractions, lexicalResults] = await Promise.all([
      // Pinecone JTBD search
      trace.wrap(
        'retrieval',
        'pinecone_search_jtbd',
        async () => {
          const pinecone = createTracedPinecone(trace);
          const results = await pinecone.query({
            vector: embeddings,
            topK: 10,
            namespace: 'jtbd',
            includeMetadata: true
          });
          return results.matches || [];
        },
        {
          extractMetadata: (matches) => ({
            namespace: 'jtbd',
            match_count: matches.length,
            top_score: matches[0]?.score || 0
          })
        }
      ),

      // Pinecone interactions search
      trace.wrap(
        'retrieval',
        'pinecone_search_interactions',
        async () => {
          const pinecone = createTracedPinecone(trace);
          const results = await pinecone.query({
            vector: embeddings,
            topK: 10,
            namespace: 'interactions',
            includeMetadata: true,
            filter: { student_id: { $eq: studentId } }
          });
          return results.matches || [];
        },
        {
          extractMetadata: (matches) => ({
            namespace: 'interactions',
            match_count: matches.length,
            top_score: matches[0]?.score || 0,
            filtered_by: 'student_id'
          })
        }
      ),

      // Lexical search
      trace.wrap(
        'retrieval',
        'lexical_search',
        () => lexicalSearch(query),
        {
          api_provider: 'postgres',
          api_method: 'fts_query',
          extractMetadata: (results) => ({
            result_count: results.length,
            top_rank: results[0]?.rank || 0
          })
        }
      )
    ]);

    // Step 3: Merge and weight results
    const mergedHits = await trace.wrap(
      'retrieval',
      'merge_results',
      async () => {
        const hits: any[] = [];
        const seenIds = new Set<string>();

        // Add JTBD hits
        pineconeJtbd.forEach(match => {
          const id = match.id || match.metadata?.item_id;
          if (id && !seenIds.has(id)) {
            seenIds.add(id);
            hits.push({
              id,
              score: (match.score || 0) * PINECONE_WEIGHT_JTBD,
              metadata: match.metadata,
              source: 'pinecone_jtbd'
            });
          }
        });

        // Add interaction hits
        pineconeInteractions.forEach(match => {
          const id = match.id || match.metadata?.item_id;
          if (id && !seenIds.has(id)) {
            seenIds.add(id);
            hits.push({
              id,
              score: (match.score || 0) * PINECONE_WEIGHT_INTERACTIONS,
              metadata: match.metadata,
              source: 'pinecone_interactions'
            });
          }
        });

        // Add lexical hits with boost
        lexicalResults.forEach(result => {
          const existingHit = hits.find(h => h.id === result.id);
          if (existingHit) {
            existingHit.score *= LEXICAL_BOOST;
            existingHit.lexical_rank = result.rank;
          } else {
            hits.push({
              id: result.id,
              score: (1 / (result.rank + 1)) * 0.5,
              metadata: result,
              source: 'lexical',
              lexical_rank: result.rank
            });
          }
        });

        // Sort by score
        hits.sort((a, b) => b.score - a.score);
        return hits.slice(0, 20);
      },
      {
        extractMetadata: (hits) => ({
          total_hits: hits.length,
          sources: {
            pinecone_jtbd: hits.filter(h => h.source === 'pinecone_jtbd').length,
            pinecone_interactions: hits.filter(h => h.source === 'pinecone_interactions').length,
            lexical: hits.filter(h => h.source === 'lexical').length
          }
        })
      }
    );

    // Step 4: Rerank with Cohere
    const rerankedHits = await trace.wrap(
      'retrieval',
      'cohere_rerank',
      async () => {
        const cohere = createTracedCohere(trace);
        
        // Prepare documents for reranking
        const documents = mergedHits.map(hit => {
          const content = hit.metadata?.content || hit.metadata?.chunk || '';
          const title = hit.metadata?.title || '';
          return `${title}\n${content}`.trim();
        });

        const response = await cohere.rerank({
          model: 'rerank-english-v3.0',
          query,
          documents,
          topN: 10,
          returnDocuments: false
        });

        // Apply rerank scores
        const reranked: any[] = [];
        response.results?.forEach(result => {
          const originalHit = mergedHits[result.index];
          if (originalHit) {
            reranked.push({
              ...originalHit,
              rerank_score: result.relevanceScore,
              final_score: result.relevanceScore
            });
          }
        });

        return reranked;
      },
      {
        extractMetadata: (hits) => ({
          reranked_count: hits.length,
          top_relevance: hits[0]?.rerank_score || 0
        })
      }
    );

    await trace.endEvent(searchEvent, {
      metadata: {
        final_hit_count: rerankedHits.length,
        pipeline_stages: ['embed', 'search', 'merge', 'rerank']
      }
    });

    log.event('hybrid_search_complete', {
      trace_id: trace.getId(),
      query_preview: query.slice(0, 50),
      hit_count: rerankedHits.length
    });

    return rerankedHits;

  } catch (error: any) {
    await trace.endEvent(searchEvent, {
      api_error: error.message
    });
    throw error;
  }
}
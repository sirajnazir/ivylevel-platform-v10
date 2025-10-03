import { Builder, Index } from 'lunr';
import { child } from "@packages/logger";
import { RagRecord } from '../../../packages/types/dist';

const log = child({ svc: "retriever.bm25" });

interface BM25Document {
  id: string;
  text: string;
  kind?: string;
  student?: string;
  week?: number;
  phase?: string;
  [key: string]: any;
}

class BM25Index {
  private index: Index | null = null;
  private documents: Map<string, BM25Document> = new Map();
  private lastBuilt: Date | null = null;

  constructor() {}

  async build(records: RagRecord[]) {
    log.info({ recordCount: records.length }, "bm25.building_index");
    
    const startTime = Date.now();
    
    this.index = Builder(function() {
      this.ref('id');
      this.field('text');
      this.field('kind');
      this.field('student');
      
      // Add documents
      for (const record of records) {
        const doc: BM25Document = {
          id: record.id,
          text: record.text,
          kind: record.metadata?.kind,
          student: record.metadata?.student,
          week: record.metadata?.week,
          phase: record.metadata?.phase,
          ...record.metadata
        };
        
        this.add(doc);
        // Store for later retrieval
        (this as any).documents.set(record.id, doc);
      }
    });
    
    // Copy documents map from builder context
    this.documents = (this.index as any).documents || this.documents;
    this.lastBuilt = new Date();
    
    const duration = Date.now() - startTime;
    log.info({ duration, documentCount: this.documents.size }, "bm25.index_built");
  }

  search(query: string, filter?: Record<string, any>, topK: number = 10): BM25Document[] {
    if (!this.index) {
      log.warn("bm25.search_no_index");
      return [];
    }

    try {
      const results = this.index.search(query);
      
      // Apply filters and get documents
      const filtered = results
        .map(result => this.documents.get(result.ref))
        .filter(doc => {
          if (!doc) return false;
          
          if (filter) {
            // Apply simple equality filters
            for (const [key, value] of Object.entries(filter)) {
              if (key === 'kind' && doc.kind !== value) return false;
              if (key === 'student' && doc.student !== value) return false;
              if (key === 'week' && doc.week !== value) return false;
              if (key === 'phase' && doc.phase !== value) return false;
            }
          }
          
          return true;
        })
        .slice(0, topK)
        .filter((doc): doc is BM25Document => doc !== undefined);
      
      log.debug({ 
        query, 
        totalResults: results.length, 
        filteredCount: filtered.length 
      }, "bm25.search_complete");
      
      return filtered;
    } catch (error) {
      log.error({ error, query }, "bm25.search_error");
      return [];
    }
  }

  isStale(maxAgeMs: number = 3600000): boolean { // 1 hour default
    if (!this.lastBuilt) return true;
    return Date.now() - this.lastBuilt.getTime() > maxAgeMs;
  }

  clear() {
    this.index = null;
    this.documents.clear();
    this.lastBuilt = null;
  }
}

// Singleton instance
let bm25Instance: BM25Index | null = null;

export function getBM25Index(): BM25Index {
  if (!bm25Instance) {
    bm25Instance = new BM25Index();
  }
  return bm25Instance;
}

// Hybrid search combining vector and BM25
export async function hybridSearch({
  vectorResults,
  query,
  filter,
  alpha = 0.7 // Weight for vector results (0.7 vector, 0.3 BM25)
}: {
  vectorResults: Array<{ id: string; score: number; [key: string]: any }>;
  query: string;
  filter?: Record<string, any>;
  alpha?: number;
}): Promise<Array<{ id: string; score: number; [key: string]: any }>> {
  const bm25 = getBM25Index();
  const bm25Results = bm25.search(query, filter, 20);
  
  // Normalize scores
  const maxVectorScore = Math.max(...vectorResults.map(r => r.score || 0), 0.001);
  const vectorScoreMap = new Map(
    vectorResults.map(r => [r.id, (r.score || 0) / maxVectorScore])
  );
  
  // BM25 scores are already normalized by Lunr
  const bm25ScoreMap = new Map(
    bm25Results.map((doc, idx) => [doc.id, 1 - (idx / bm25Results.length)])
  );
  
  // Combine scores
  const allIds = new Set([...vectorScoreMap.keys(), ...bm25ScoreMap.keys()]);
  const combined: Array<{ id: string; score: number; [key: string]: any }> = [];
  
  for (const id of allIds) {
    const vectorScore = vectorScoreMap.get(id) || 0;
    const bm25Score = bm25ScoreMap.get(id) || 0;
    const hybridScore = alpha * vectorScore + (1 - alpha) * bm25Score;
    
    // Find the original result object
    const original = vectorResults.find(r => r.id === id) || 
                     { id, ...bm25Results.find(d => d.id === id) };
    
    combined.push({
      ...original,
      score: hybridScore,
      _vectorScore: vectorScore,
      _bm25Score: bm25Score
    });
  }
  
  // Sort by hybrid score
  combined.sort((a, b) => b.score - a.score);
  
  log.debug({
    vectorCount: vectorResults.length,
    bm25Count: bm25Results.length,
    combinedCount: combined.length,
    topResult: combined[0]?.id
  }, "bm25.hybrid_search");
  
  return combined;
}
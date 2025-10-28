/**
 * v15.3 Pinecone Memory Store Implementation
 *
 * Date: 2025-10-28
 * Purpose: Long-term memory storage using Pinecone vector database
 * Architecture: Implements MemoryStore<TMemory> interface
 * Data Source: AWS-hosted Pinecone instance (credentials in .env)
 *
 * Memory Types Supported:
 * 1. Semantic Memory: Facts, concepts, knowledge (what)
 * 2. Episodic Memory: Session experiences, outcomes (when/where)
 * 3. Procedural Memory: Successful strategies, patterns (how)
 *
 * @module primitives/PineconeMemoryStore
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { MemoryStore, Memory } from './types';

// ============================================================================
// TYPES: Memory Store Configuration
// ============================================================================

export interface PineconeConfig {
  apiKey: string;
  environment: string;
  indexName: string;
  namespace?: string;
}

export interface EmbeddingService {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

export interface MemoryMetadata {
  type: 'semantic' | 'episodic' | 'procedural';
  timestamp: string;
  student_id?: string;
  coach_id?: string;
  session_id?: string;
  effectiveness_score?: number;
  tags?: string[];
  [key: string]: any;
}

// ============================================================================
// PINECONE MEMORY STORE IMPLEMENTATION
// ============================================================================

/**
 * PineconeMemoryStore: Production memory storage with vector similarity search
 *
 * Features:
 * - Vector embedding for semantic similarity
 * - 3 memory types with different retrieval strategies
 * - Metadata filtering for precise queries
 * - Batch operations for efficiency
 * - TTL support for memory decay
 */
export class PineconeMemoryStore<TMemory = any> implements MemoryStore<TMemory> {
  private client: Pinecone;
  private index: any;
  private namespace: string;
  private embeddingService: EmbeddingService;

  constructor(
    config: PineconeConfig,
    embeddingService: EmbeddingService
  ) {
    this.client = new Pinecone({
      apiKey: config.apiKey,
      environment: config.environment,
    });
    this.namespace = config.namespace || 'default';
    this.embeddingService = embeddingService;

    // Initialize index (lazy load in actual methods)
    this.index = null;
  }

  /**
   * Initialize Pinecone index connection
   */
  private async getIndex() {
    if (!this.index) {
      // Lazy initialization
      // TODO: Get index name from config
      const indexName = process.env.PINECONE_INDEX_NAME || 'ivylevel-memories';
      this.index = this.client.index(indexName);
    }
    return this.index;
  }

  /**
   * Store a memory with vector embedding
   *
   * @param memory - Memory object to store
   * @returns Memory ID
   */
  async store(memory: Memory<TMemory>): Promise<string> {
    const index = await this.getIndex();

    // Generate embedding from memory content
    const contentText = this.extractTextFromContent(memory.content);
    const embedding = await this.embeddingService.embed(contentText);

    // Prepare metadata
    const metadata: MemoryMetadata = {
      type: memory.type,
      timestamp: memory.timestamp.toISOString(),
      effectiveness_score: memory.effectiveness_score,
      tags: memory.tags,
      ...memory.metadata,
    };

    // Store in Pinecone
    await index.namespace(this.namespace).upsert([
      {
        id: memory.id,
        values: embedding,
        metadata: {
          ...metadata,
          content_json: JSON.stringify(memory.content),
        },
      },
    ]);

    return memory.id;
  }

  /**
   * Retrieve memories by semantic similarity
   *
   * @param query - Natural language query
   * @param limit - Maximum memories to return (default: 5)
   * @param filter - Metadata filters (e.g., { type: 'procedural', student_id: '123' })
   * @returns Array of relevant memories
   */
  async retrieve(
    query: string,
    limit: number = 5,
    filter?: any
  ): Promise<Memory<TMemory>[]> {
    const index = await this.getIndex();

    // Generate query embedding
    const queryEmbedding = await this.embeddingService.embed(query);

    // Build Pinecone filter
    const pineconeFilter = this.buildPineconeFilter(filter);

    // Query Pinecone
    const results = await index.namespace(this.namespace).query({
      vector: queryEmbedding,
      topK: limit,
      includeMetadata: true,
      filter: pineconeFilter,
    });

    // Convert Pinecone results to Memory objects
    return results.matches?.map((match: any) => this.pineconeToMemory(match)) || [];
  }

  /**
   * Get specific memory by ID
   *
   * @param id - Memory ID
   * @returns Memory object or null if not found
   */
  async get(id: string): Promise<Memory<TMemory> | null> {
    const index = await this.getIndex();

    try {
      const result = await index.namespace(this.namespace).fetch([id]);

      if (!result.records || !result.records[id]) {
        return null;
      }

      return this.pineconeToMemory({
        id,
        metadata: result.records[id].metadata,
      });
    } catch (error) {
      console.error(`Failed to fetch memory ${id}:`, error);
      return null;
    }
  }

  /**
   * Delete memory by ID
   *
   * @param id - Memory ID to delete
   */
  async delete(id: string): Promise<void> {
    const index = await this.getIndex();
    await index.namespace(this.namespace).deleteOne(id);
  }

  /**
   * Store multiple memories in batch
   *
   * @param memories - Array of memories to store
   * @returns Array of memory IDs
   */
  async storeBatch(memories: Memory<TMemory>[]): Promise<string[]> {
    const index = await this.getIndex();

    // Generate embeddings in batch
    const contentTexts = memories.map(m => this.extractTextFromContent(m.content));
    const embeddings = await this.embeddingService.embedBatch(contentTexts);

    // Prepare vectors for Pinecone
    const vectors = memories.map((memory, i) => ({
      id: memory.id,
      values: embeddings[i],
      metadata: {
        type: memory.type,
        timestamp: memory.timestamp.toISOString(),
        effectiveness_score: memory.effectiveness_score,
        tags: memory.tags,
        ...memory.metadata,
        content_json: JSON.stringify(memory.content),
      },
    }));

    // Upsert in batch
    await index.namespace(this.namespace).upsert(vectors);

    return memories.map(m => m.id);
  }

  /**
   * Retrieve memories by type and effectiveness threshold
   *
   * @param type - Memory type (semantic, episodic, procedural)
   * @param minEffectiveness - Minimum effectiveness score (0-1)
   * @param limit - Maximum memories to return
   * @returns Array of high-quality memories
   */
  async retrieveByTypeAndQuality(
    type: 'semantic' | 'episodic' | 'procedural',
    minEffectiveness: number = 0.7,
    limit: number = 10
  ): Promise<Memory<TMemory>[]> {
    // Use a generic query for the type
    const query = this.getTypeSpecificQuery(type);

    return this.retrieve(query, limit, {
      type,
      effectiveness_score: { $gte: minEffectiveness },
    });
  }

  /**
   * Retrieve recent memories within time window
   *
   * @param hours - Time window in hours (e.g., 24 = last 24 hours)
   * @param limit - Maximum memories to return
   * @returns Array of recent memories
   */
  async retrieveRecent(hours: number = 24, limit: number = 10): Promise<Memory<TMemory>[]> {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Use a generic query to get all recent memories
    const query = 'recent coaching session outcomes and learnings';

    return this.retrieve(query, limit, {
      timestamp: { $gte: cutoffTime.toISOString() },
    });
  }

  /**
   * Clear all memories in namespace (use with caution!)
   */
  async clearAll(): Promise<void> {
    const index = await this.getIndex();
    await index.namespace(this.namespace).deleteAll();
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Extract text from memory content for embedding
   */
  private extractTextFromContent(content: TMemory): string {
    if (typeof content === 'string') {
      return content;
    }

    if (typeof content === 'object') {
      // Extract all string values from object
      const strings: string[] = [];
      const extract = (obj: any) => {
        for (const key in obj) {
          const value = obj[key];
          if (typeof value === 'string') {
            strings.push(value);
          } else if (typeof value === 'object' && value !== null) {
            extract(value);
          }
        }
      };
      extract(content);
      return strings.join(' ');
    }

    return String(content);
  }

  /**
   * Build Pinecone metadata filter from generic filter object
   */
  private buildPineconeFilter(filter?: any): any {
    if (!filter) {
      return undefined;
    }

    // Convert filter to Pinecone format
    const pineconeFilter: any = {};

    for (const key in filter) {
      const value = filter[key];

      // Handle comparison operators
      if (typeof value === 'object' && value !== null) {
        if (value.$gte !== undefined) {
          pineconeFilter[key] = { $gte: value.$gte };
        } else if (value.$lte !== undefined) {
          pineconeFilter[key] = { $lte: value.$lte };
        } else if (value.$gt !== undefined) {
          pineconeFilter[key] = { $gt: value.$gt };
        } else if (value.$lt !== undefined) {
          pineconeFilter[key] = { $lt: value.$lt };
        }
      } else {
        // Simple equality
        pineconeFilter[key] = { $eq: value };
      }
    }

    return pineconeFilter;
  }

  /**
   * Convert Pinecone match to Memory object
   */
  private pineconeToMemory(match: any): Memory<TMemory> {
    const metadata = match.metadata;

    return {
      id: match.id,
      content: JSON.parse(metadata.content_json) as TMemory,
      type: metadata.type,
      timestamp: new Date(metadata.timestamp),
      effectiveness_score: metadata.effectiveness_score,
      tags: metadata.tags,
      metadata: {
        student_id: metadata.student_id,
        coach_id: metadata.coach_id,
        session_id: metadata.session_id,
        similarity_score: match.score,
      },
    };
  }

  /**
   * Get type-specific query for retrieving memories by type
   */
  private getTypeSpecificQuery(type: 'semantic' | 'episodic' | 'procedural'): string {
    switch (type) {
      case 'semantic':
        return 'important facts concepts knowledge about student';
      case 'episodic':
        return 'past coaching session experiences outcomes';
      case 'procedural':
        return 'successful coaching strategies techniques patterns';
      default:
        return 'coaching memory';
    }
  }
}

// ============================================================================
// EMBEDDING SERVICE IMPLEMENTATION
// ============================================================================

/**
 * OpenAI Embedding Service
 * Uses OpenAI's text-embedding-3-small model for vector generation
 */
export class OpenAIEmbeddingService implements EmbeddingService {
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model: string = 'text-embedding-3-small') {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    this.model = model;
  }

  async embed(text: string): Promise<number[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        input: text,
        model: this.model,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI embedding failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        input: texts,
        model: this.model,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI batch embedding failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.map((item: any) => item.embedding);
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create PineconeMemoryStore with default configuration
 */
export function createPineconeMemoryStore<TMemory = any>(
  namespace?: string
): PineconeMemoryStore<TMemory> {
  const config: PineconeConfig = {
    apiKey: process.env.PINECONE_API_KEY || '',
    environment: process.env.PINECONE_ENVIRONMENT || 'us-east-1-aws',
    indexName: process.env.PINECONE_INDEX_NAME || 'ivylevel-memories',
    namespace: namespace || 'default',
  };

  const embeddingService = new OpenAIEmbeddingService();

  return new PineconeMemoryStore(config, embeddingService);
}

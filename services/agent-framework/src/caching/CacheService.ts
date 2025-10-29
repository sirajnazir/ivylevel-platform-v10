/**
 * CacheService - Redis-based Caching for Cost Optimization
 *
 * Caches:
 * - Intent classifications (24h TTL) - 40-60% savings
 * - Embeddings (7 day TTL) - Reduces OpenAI API calls
 *
 * From: V15.2 Implementation Plan (lines 1910-1975)
 * Version: v17.0
 *
 * Note: This uses in-memory cache for now. In production, integrate with Upstash Redis.
 */

import crypto from 'crypto';

// Cache entry
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class CacheService {
  private cache: Map<string, CacheEntry<any>>;

  constructor() {
    this.cache = new Map();

    // Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Get cached intent classification
   */
  async getCachedIntent(query: string): Promise<any | null> {
    const cacheKey = `intent:${this.hashQuery(query)}`;
    return this.get(cacheKey);
  }

  /**
   * Cache intent classification (24h TTL)
   */
  async cacheIntent(query: string, intent: any): Promise<void> {
    const cacheKey = `intent:${this.hashQuery(query)}`;
    await this.set(cacheKey, intent, 24 * 60 * 60); // 24 hours
  }

  /**
   * Get cached embedding
   */
  async getCachedEmbedding(text: string): Promise<number[] | null> {
    const cacheKey = `embedding:${this.hashText(text)}`;
    return this.get(cacheKey);
  }

  /**
   * Cache embedding (7 day TTL)
   */
  async cacheEmbedding(text: string, embedding: number[]): Promise<void> {
    const cacheKey = `embedding:${this.hashText(text)}`;
    await this.set(cacheKey, embedding, 7 * 24 * 60 * 60); // 7 days
  }

  /**
   * Generic get from cache
   */
  private async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    console.log(`[Cache] HIT: ${key}`);
    return entry.value as T;
  }

  /**
   * Generic set to cache
   */
  private async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiresAt });
    console.log(`[Cache] SET: ${key} (TTL: ${ttlSeconds}s)`);
  }

  /**
   * Hash query for cache key (case-insensitive, trimmed)
   */
  private hashQuery(query: string): string {
    const normalized = query.toLowerCase().trim().substring(0, 100);
    return crypto.createHash('md5').update(normalized).digest('hex');
  }

  /**
   * Hash text for embedding cache key
   */
  private hashText(text: string): string {
    return crypto.createHash('md5').update(text).digest('hex');
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[Cache] Cleaned up ${cleaned} expired entries`);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.cache.clear();
    console.log('[Cache] Cleared all entries');
  }

  /**
   * Get cache stats
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance
let cacheInstance: CacheService | null = null;

export function getCacheService(): CacheService {
  if (!cacheInstance) {
    cacheInstance = new CacheService();
  }
  return cacheInstance;
}

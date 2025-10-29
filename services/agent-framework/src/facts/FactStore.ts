/**
 * FactStore: Central registry of all fact sources
 * v18.0: Universal primitive for fact-first agent architecture
 *
 * Design Doc: docs/FACT_FIRST_ARCHITECTURE.md
 *
 * Responsibilities:
 * - Register fact sources (database, APIs, files)
 * - Route fact queries to appropriate sources
 * - Deduplicate and merge facts from multiple sources
 * - Prioritize by confidence score
 */

import { Fact, FactCategory, FactQuery, FactSource } from './types.js';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('fact-store');

export class FactStore {
  private sources: Map<FactCategory, FactSource[]> = new Map();

  /**
   * Register a fact source (database, API, file)
   */
  registerSource(category: FactCategory, source: FactSource): void {
    if (!this.sources.has(category)) {
      this.sources.set(category, []);
    }

    this.sources.get(category)!.push(source);

    log.event('fact_store.source_registered', {
      category,
      source_id: source.source_id,
      source_type: source.source_type,
    });
  }

  /**
   * Fetch facts from all registered sources for a category
   */
  async getFacts(query: FactQuery): Promise<Fact[]> {
    const sources = this.sources.get(query.category) || [];

    if (sources.length === 0) {
      log.event('fact_store.no_sources', {
        category: query.category,
        entity_id: query.entity_id,
      }, 'warn');
      return [];
    }

    log.event('fact_store.fetch_start', {
      category: query.category,
      entity_id: query.entity_id,
      sources_count: sources.length,
    });

    // Fetch from all sources in parallel
    const factPromises = sources.map(async (source) => {
      try {
        return await source.fetchFacts(query);
      } catch (error) {
        log.error('fact_store.source_fetch_error', {
          source_id: source.source_id,
          category: query.category,
          error: String(error),
        });
        return [];
      }
    });

    const results = await Promise.all(factPromises);
    const allFacts = results.flat();

    // Deduplicate and prioritize by confidence
    const dedupedFacts = this.deduplicateFacts(allFacts);

    log.event('fact_store.fetch_complete', {
      category: query.category,
      entity_id: query.entity_id,
      raw_facts: allFacts.length,
      deduped_facts: dedupedFacts.length,
    });

    return dedupedFacts;
  }

  /**
   * Deduplicate facts (prefer higher confidence)
   * When multiple sources provide same fact, keep highest confidence
   */
  private deduplicateFacts(facts: Fact[]): Fact[] {
    const factMap = new Map<string, Fact>();

    facts.forEach((fact) => {
      // Key: combination of fact_type and entity_id
      const key = `${fact.fact_type}_${fact.entity_id}`;
      const existing = factMap.get(key);

      // Keep fact with higher confidence
      if (!existing || fact.confidence > existing.confidence) {
        factMap.set(key, fact);
      } else if (fact.confidence === existing.confidence) {
        // Same confidence: prefer more recent
        const existingTime = existing.provenance.timestamp.getTime();
        const newTime = fact.provenance.timestamp.getTime();
        if (newTime > existingTime) {
          factMap.set(key, fact);
        }
      }
    });

    return Array.from(factMap.values());
  }

  /**
   * Get all registered categories
   */
  getRegisteredCategories(): FactCategory[] {
    return Array.from(this.sources.keys());
  }

  /**
   * Get sources for a category
   */
  getSourcesForCategory(category: FactCategory): FactSource[] {
    return this.sources.get(category) || [];
  }

  /**
   * Check if category has sources
   */
  hasSourcesForCategory(category: FactCategory): boolean {
    const sources = this.sources.get(category);
    return sources !== undefined && sources.length > 0;
  }
}

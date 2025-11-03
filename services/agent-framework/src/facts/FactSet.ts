/**
 * FactSet: Utility class for working with collections of facts
 * v18.0: Universal primitive for all agents
 *
 * Design Doc: docs/FACT_FIRST_ARCHITECTURE.md
 */

import { Fact, FactCategory, FactProvenance } from './types.js';

// Re-export Fact for external use
export { Fact, FactCategory, FactProvenance } from './types.js';

export class FactSet {
  private facts: Map<string, Fact> = new Map();

  constructor(facts: Fact[]) {
    facts.forEach((fact) => {
      this.facts.set(fact.fact_id, fact);
    });
  }

  /**
   * Get all facts of a specific type
   */
  getFactsByType(factType: string): Fact[] {
    return Array.from(this.facts.values()).filter((f) => f.fact_type === factType);
  }

  /**
   * Get all facts for a category
   */
  getFactsByCategory(category: FactCategory): Fact[] {
    return Array.from(this.facts.values()).filter((f) => f.category === category);
  }

  /**
   * Check if sufficient data exists
   */
  hasSufficientData(requiredCategories: FactCategory[]): boolean {
    return requiredCategories.every(
      (category) => this.getFactsByCategory(category).length > 0
    );
  }

  /**
   * Get missing categories
   */
  getMissingCategories(requiredCategories: FactCategory[]): FactCategory[] {
    return requiredCategories.filter(
      (category) => this.getFactsByCategory(category).length === 0
    );
  }

  /**
   * Get all facts as array
   */
  getAllFacts(): Fact[] {
    return Array.from(this.facts.values());
  }

  /**
   * Get provenance for all facts
   */
  getProvenance(): FactProvenance[] {
    return this.getAllFacts().map((f) => f.provenance);
  }

  /**
   * Get single fact by type (returns first match)
   */
  getFactByType(factType: string): Fact | undefined {
    return this.getFactsByType(factType)[0];
  }

  /**
   * Get fact value by type (convenience method)
   */
  getValueByType(factType: string): any | undefined {
    return this.getFactByType(factType)?.value;
  }

  /**
   * Check if fact exists
   */
  hasFact(factType: string): boolean {
    return this.getFactsByType(factType).length > 0;
  }

  /**
   * Get count of facts
   */
  count(): number {
    return this.facts.size;
  }

  /**
   * Get count by category
   */
  countByCategory(category: FactCategory): number {
    return this.getFactsByCategory(category).length;
  }
}

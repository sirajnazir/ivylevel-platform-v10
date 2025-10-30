/**
 * BaseIntelligenceType - Interface for all intelligence types
 *
 * Intelligence Types are atomic reusable units of coaching intelligence.
 * Each type bundles: Framework + Tactics + Techniques + Chips + Metrics + Triggers
 *
 * Hierarchy:
 * Level 1: Intelligence Type (atomic unit)
 * Level 2: Framework (conceptual model)
 * Level 3: Tactic (executable procedure)
 * Level 4: Technique (atomic action)
 * Level 5: Chip (knowledge artifact)
 *
 * Created: 2025-10-29
 * Architecture: v3.0 Intelligence Types
 */

import { FactSet } from '../../facts/FactSet.js';
import { FactCategory } from '../../facts/types.js';

// Re-export for convenience
export { FactSet } from '../../facts/FactSet.js';
export { FactCategory } from '../../facts/types.js';

/**
 * Agent Query - Input to intelligence type
 */
export interface AgentQuery {
  entity_id: string;        // student_id, coach_id, etc.
  query: string;            // User's question/request
  session_id: string;       // Session context
  context?: Record<string, any>; // Additional context
}

/**
 * Intelligence Result - Output from intelligence type
 */
export interface IntelligenceResult {
  type_id: string;          // e.g., "TYPE-023"
  component: string;        // e.g., "award_recommendations"
  data: any;                // Intelligence-specific output
  confidence: number;       // 0.0-1.0
  metadata?: Record<string, any>;
  chips_used?: string[];    // Knowledge chips referenced
  triggered?: boolean;      // Was this intelligence activated?
}

/**
 * Conceptual Model - Framework (Level 2)
 */
export interface ConceptualModel {
  name: string;
  description: string;
  mental_model: string;     // How to think about this
}

/**
 * Tactic - Executable procedure (Level 3)
 */
export interface Tactic {
  name: string;
  description: string;
  steps: string[];          // Step-by-step procedure
  when_to_use?: string;
}

/**
 * Technique - Atomic action (Level 4)
 */
export interface Technique {
  name: string;
  action: string;           // What to do
  example?: string;
}

/**
 * Chip - Knowledge artifact (Level 5)
 */
export interface Chip {
  type: 'data' | 'template' | 'example' | 'formula';
  name: string;
  content: string | Record<string, any>;
}

/**
 * Success Criteria - Measurable outcomes
 */
export interface SuccessCriteria {
  success_criteria: string[];
  validation: string;
  target_metrics?: Record<string, number>;
}

/**
 * Activation Condition - When to fire
 */
export interface ActivationCondition {
  conditions: string[];
  triggers?: string[];
}

/**
 * Intelligence Type Components
 */
export interface IntelligenceComponents {
  framework: ConceptualModel;
  tactics: Tactic[];
  techniques: Technique[];
  chips: Chip[];
  metrics: SuccessCriteria;
  triggers: ActivationCondition;
}

/**
 * Base Intelligence Type Interface
 *
 * All intelligence types must implement this interface.
 */
export interface IntelligenceType {
  // Identity
  type_id: string;          // "TYPE-023"
  name: string;             // "Award Arbitrage System"
  category: 'UNIVERSAL' | 'DOMAIN_SPECIFIC';
  description: string;      // Brief purpose

  // Components (5-level hierarchy)
  components: IntelligenceComponents;

  // Core execution method
  process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult>;

  // Optional: Check if this intelligence should activate
  shouldActivate?(query: AgentQuery, facts: FactSet): boolean;
}

/**
 * Abstract Base Class for Intelligence Types
 *
 * Provides common functionality and enforces interface.
 */
export abstract class BaseIntelligenceType implements IntelligenceType {
  abstract type_id: string;
  abstract name: string;
  abstract category: 'UNIVERSAL' | 'DOMAIN_SPECIFIC';
  abstract description: string;
  abstract components: IntelligenceComponents;

  /**
   * Process query with this intelligence type
   * Subclasses must implement this method
   */
  abstract process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult>;

  /**
   * Default activation check
   * Subclasses can override for custom logic
   */
  shouldActivate(query: AgentQuery, facts: FactSet): boolean {
    // By default, check if any trigger conditions match query
    const lowerQuery = query.query.toLowerCase();

    if (!this.components.triggers.conditions) {
      return true; // Always activate if no conditions specified
    }

    return this.components.triggers.conditions.some(condition =>
      lowerQuery.includes(condition.toLowerCase())
    );
  }

  /**
   * Helper: Create inactive result (intelligence not triggered)
   */
  protected createInactiveResult(component: string): IntelligenceResult {
    return {
      type_id: this.type_id,
      component,
      data: null,
      confidence: 0,
      triggered: false
    };
  }
}

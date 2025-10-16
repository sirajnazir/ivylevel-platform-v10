/**
 * v13.0 Reference Resolver
 *
 * Purpose: Detect and resolve pronouns/references in student queries for multi-turn conversations
 *
 * Examples:
 * - "What's my Stanford deadline?" → "Is that submitted?" → Resolve "that" to "Stanford application"
 * - "Tell me about MIT" → "What's the acceptance rate there?" → Resolve "there" to "MIT"
 * - "I got into Harvard!" → "When do I need to decide?" → Resolve implicit "decide" to "Harvard acceptance"
 *
 * Architecture:
 * - Pattern-based pronoun detection (that, this, it, they, them, there, etc.)
 * - Entity extraction from previous turns (colleges, deadlines, applications, awards, etc.)
 * - Recency-weighted entity resolution
 * - Query enrichment with resolved references
 */

import type { ConversationTurn } from './UnifiedContextHydrator.js';

// ============================================================================
// TYPES
// ============================================================================

export interface ReferenceDetectionResult {
  has_references: boolean;
  detected_pronouns: string[];
  detected_references: string[];
  confidence: number; // 0.0-1.0
}

export interface ResolvedReference {
  pronoun: string;
  resolved_to: string;
  entity_type: 'college' | 'application' | 'award' | 'ec' | 'deadline' | 'essay' | 'program' | 'test' | 'other';
  confidence: number;
  source_turn_number: number;
}

export interface EnrichedQuery {
  original_query: string;
  enriched_query: string;
  resolved_references: ResolvedReference[];
  has_enrichment: boolean;
}

// ============================================================================
// PATTERNS
// ============================================================================

// Pronouns to detect (sorted by specificity)
const PRONOUN_PATTERNS = [
  // Demonstrative pronouns
  /\b(that|this|these|those)\b/gi,

  // Personal pronouns (third person)
  /\b(it|its|they|them|their|theirs)\b/gi,

  // Locative pronouns
  /\b(there|here)\b/gi,

  // Possessive determiners (when used anaphorically)
  /\b(the\s+(?:application|deadline|essay|school|college|program|award))\b/gi,
];

// Reference patterns (more specific than pronouns)
const REFERENCE_PATTERNS = [
  // Anaphoric references
  /\b(the\s+(?:same|above|aforementioned|previous|last|first|second))\b/gi,

  // Implicit references via verbs
  /\b(submitted?|applied?|accepted?|rejected?|waitlisted?|deferred?)\b(?!\s+(?:to|for|at|by))/gi,
];

// Entity extraction patterns
const ENTITY_PATTERNS = {
  college: /\b(Stanford|MIT|Harvard|Yale|Princeton|Columbia|UPenn|Brown|Dartmouth|Cornell|Berkeley|UCLA|USC|Caltech|CMU|(?:University\s+of\s+\w+)|(?:\w+\s+University))\b/gi,

  application: /\b(application|app|submission|common\s+app|coalition\s+app)\b/gi,

  deadline: /\b(deadline|due\s+date|submission\s+date|early\s+(?:decision|action)|regular\s+decision|ED|EA|RD|REA)\b/gi,

  award: /\b(award|honor|recognition|prize|scholarship|medal|achievement)\b/gi,

  ec: /\b(extracurricular|EC|activity|club|sport|team|volunteer|internship|research)\b/gi,

  essay: /\b(essay|personal\s+statement|supplemental|supplement|writing\s+sample)\b/gi,

  program: /\b(summer\s+program|camp|workshop|conference|competition)\b/gi,

  test: /\b(SAT|ACT|AP|test|exam|score)\b/gi,
};

// ============================================================================
// REFERENCE RESOLVER
// ============================================================================

export class ReferenceResolver {
  /**
   * Detect if a query contains pronouns or references
   */
  detectReferences(query: string): ReferenceDetectionResult {
    const detected_pronouns: string[] = [];
    const detected_references: string[] = [];

    // Check for pronouns
    for (const pattern of PRONOUN_PATTERNS) {
      const matches = query.match(pattern);
      if (matches) {
        detected_pronouns.push(...matches.map(m => m.toLowerCase()));
      }
    }

    // Check for anaphoric references
    for (const pattern of REFERENCE_PATTERNS) {
      const matches = query.match(pattern);
      if (matches) {
        detected_references.push(...matches.map(m => m.toLowerCase()));
      }
    }

    // Deduplicate
    const unique_pronouns = [...new Set(detected_pronouns)];
    const unique_references = [...new Set(detected_references)];

    const has_references = unique_pronouns.length > 0 || unique_references.length > 0;

    // Calculate confidence based on specificity
    let confidence = 0;
    if (has_references) {
      // High confidence for demonstrative pronouns (that, this, these, those)
      if (unique_pronouns.some(p => ['that', 'this', 'these', 'those'].includes(p))) {
        confidence = 0.9;
      }
      // Medium confidence for personal pronouns (it, they)
      else if (unique_pronouns.some(p => ['it', 'they', 'them'].includes(p))) {
        confidence = 0.7;
      }
      // Lower confidence for locative pronouns (there, here)
      else if (unique_pronouns.some(p => ['there', 'here'].includes(p))) {
        confidence = 0.5;
      }
      // High confidence for anaphoric references
      else if (unique_references.length > 0) {
        confidence = 0.8;
      }
    }

    return {
      has_references,
      detected_pronouns: unique_pronouns,
      detected_references: unique_references,
      confidence
    };
  }

  /**
   * Extract entities from a query or coach response
   */
  extractEntities(text: string): Map<string, string[]> {
    const entities = new Map<string, string[]>();

    for (const [entity_type, pattern] of Object.entries(ENTITY_PATTERNS)) {
      const matches = text.match(pattern);
      if (matches) {
        const unique_matches = [...new Set(matches.map(m => m.trim()))];
        entities.set(entity_type, unique_matches);
      }
    }

    return entities;
  }

  /**
   * Resolve references in a query using recent conversation turns
   *
   * Strategy:
   * 1. Extract entities from last N turns (recency-weighted)
   * 2. Match pronouns to most recent entities of appropriate type
   * 3. Enrich query by replacing pronouns with resolved entities
   */
  resolveReferences(
    query: string,
    recent_turns: ConversationTurn[],
    max_lookback: number = 5
  ): EnrichedQuery {
    const detection = this.detectReferences(query);

    // No references detected
    if (!detection.has_references) {
      return {
        original_query: query,
        enriched_query: query,
        resolved_references: [],
        has_enrichment: false
      };
    }

    // Extract entities from recent turns (most recent first)
    const entity_history: Array<{
      turn_number: number;
      entities: Map<string, string[]>;
      recency_weight: number;
    }> = [];

    const turns_to_check = recent_turns.slice(-max_lookback).reverse(); // Last N turns, most recent first

    turns_to_check.forEach((turn, index) => {
      // Combine student message and coach response for entity extraction
      const combined_text = `${turn.student_message} ${turn.coach_response}`;
      const entities = this.extractEntities(combined_text);

      if (entities.size > 0) {
        // Recency weight: 1.0 for most recent, decaying to 0.2 for oldest
        const recency_weight = 1.0 - (index / turns_to_check.length) * 0.8;

        entity_history.push({
          turn_number: turn.turn_number,
          entities,
          recency_weight
        });
      }
    });

    // No entities found in history
    if (entity_history.length === 0) {
      return {
        original_query: query,
        enriched_query: query,
        resolved_references: [],
        has_enrichment: false
      };
    }

    // Resolve each pronoun/reference
    const resolved_references: ResolvedReference[] = [];
    let enriched_query = query;

    // Resolve demonstrative pronouns (that, this, these, those)
    const demonstratives = detection.detected_pronouns.filter(p =>
      ['that', 'this', 'these', 'those'].includes(p)
    );

    for (const pronoun of demonstratives) {
      const resolution = this.resolveDemonstrativePronoun(pronoun, entity_history);
      if (resolution) {
        resolved_references.push(resolution);

        // Enrich query by appending resolved entity
        // Example: "Is that submitted?" → "Is that Stanford application submitted?"
        enriched_query = enriched_query.replace(
          new RegExp(`\\b${pronoun}\\b`, 'i'),
          `${pronoun} ${resolution.resolved_to}`
        );
      }
    }

    // Resolve personal pronouns (it, they)
    const personal_pronouns = detection.detected_pronouns.filter(p =>
      ['it', 'they', 'them'].includes(p)
    );

    for (const pronoun of personal_pronouns) {
      const resolution = this.resolvePersonalPronoun(pronoun, entity_history);
      if (resolution) {
        resolved_references.push(resolution);

        // Enrich query by replacing pronoun with resolved entity
        // Example: "Did I submit it?" → "Did I submit the Stanford application?"
        enriched_query = enriched_query.replace(
          new RegExp(`\\b${pronoun}\\b`, 'i'),
          resolution.resolved_to
        );
      }
    }

    // Resolve locative pronouns (there, here)
    const locatives = detection.detected_pronouns.filter(p =>
      ['there', 'here'].includes(p)
    );

    for (const pronoun of locatives) {
      const resolution = this.resolveLocativePronoun(pronoun, entity_history);
      if (resolution) {
        resolved_references.push(resolution);

        // Enrich query by replacing pronoun with resolved location
        // Example: "What's the acceptance rate there?" → "What's the acceptance rate at Stanford?"
        enriched_query = enriched_query.replace(
          new RegExp(`\\b${pronoun}\\b`, 'i'),
          `at ${resolution.resolved_to}`
        );
      }
    }

    return {
      original_query: query,
      enriched_query,
      resolved_references,
      has_enrichment: resolved_references.length > 0
    };
  }

  // ============================================================================
  // PRIVATE RESOLUTION METHODS
  // ============================================================================

  private resolveDemonstrativePronoun(
    pronoun: string,
    entity_history: Array<{ turn_number: number; entities: Map<string, string[]>; recency_weight: number }>
  ): ResolvedReference | null {
    // Demonstrative pronouns typically refer to the most recent salient entity
    // Priority: application > college > deadline > essay > award > ec > program > test

    const priority_order: Array<keyof typeof ENTITY_PATTERNS> = [
      'application', 'college', 'deadline', 'essay', 'award', 'ec', 'program', 'test'
    ];

    for (const entity_type of priority_order) {
      for (const history_item of entity_history) {
        const entities = history_item.entities.get(entity_type);
        if (entities && entities.length > 0) {
          // Return most recent entity of this type
          return {
            pronoun,
            resolved_to: entities[0],
            entity_type,
            confidence: history_item.recency_weight * 0.9, // High confidence for demonstratives
            source_turn_number: history_item.turn_number
          };
        }
      }
    }

    return null;
  }

  private resolvePersonalPronoun(
    pronoun: string,
    entity_history: Array<{ turn_number: number; entities: Map<string, string[]>; recency_weight: number }>
  ): ResolvedReference | null {
    // Personal pronouns typically refer to concrete objects
    // Priority: application > college > award > essay > program

    const priority_order: Array<keyof typeof ENTITY_PATTERNS> = [
      'application', 'college', 'award', 'essay', 'program'
    ];

    for (const entity_type of priority_order) {
      for (const history_item of entity_history) {
        const entities = history_item.entities.get(entity_type);
        if (entities && entities.length > 0) {
          return {
            pronoun,
            resolved_to: `the ${entities[0]}`,
            entity_type,
            confidence: history_item.recency_weight * 0.7, // Medium confidence for personal pronouns
            source_turn_number: history_item.turn_number
          };
        }
      }
    }

    return null;
  }

  private resolveLocativePronoun(
    pronoun: string,
    entity_history: Array<{ turn_number: number; entities: Map<string, string[]>; recency_weight: number }>
  ): ResolvedReference | null {
    // Locative pronouns typically refer to places (colleges, programs)
    // Priority: college > program

    const priority_order: Array<keyof typeof ENTITY_PATTERNS> = ['college', 'program'];

    for (const entity_type of priority_order) {
      for (const history_item of entity_history) {
        const entities = history_item.entities.get(entity_type);
        if (entities && entities.length > 0) {
          return {
            pronoun,
            resolved_to: entities[0],
            entity_type,
            confidence: history_item.recency_weight * 0.6, // Lower confidence for locatives
            source_turn_number: history_item.turn_number
          };
        }
      }
    }

    return null;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const referenceResolver = new ReferenceResolver();

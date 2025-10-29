/**
 * FactValidator: Validates that agent responses only contain facts
 * v18.0: Prevents hallucination at architectural level
 *
 * Design Doc: docs/FACT_FIRST_ARCHITECTURE.md
 *
 * Validation Strategy:
 * 1. Extract claims from response text
 * 2. Check each claim is grounded in a Fact
 * 3. Calculate validation score (1.0 = all claims grounded)
 * 4. Flag violations (ungrounded claims)
 */

import { FactSet } from './FactSet.js';
import { ValidationResult } from './types.js';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('fact-validator');

export class FactValidator {
  /**
   * Validate that response only contains statements backed by facts
   */
  static async validate(response: string, facts: FactSet): Promise<ValidationResult> {
    log.event('fact_validator.validate_start', {
      response_length: response.length,
      facts_count: facts.count(),
    });

    const violations: string[] = [];
    let score = 1.0;

    // Extract claims from response
    const claims = this.extractClaims(response);

    log.event('fact_validator.claims_extracted', {
      claims_count: claims.length,
    });

    // Check each claim against facts
    for (const claim of claims) {
      const isGrounded = this.isClaimGrounded(claim, facts);
      if (!isGrounded) {
        violations.push(claim);
        score -= 0.05; // Penalize 5% per ungrounded claim
      }
    }

    score = Math.max(0, score); // Floor at 0

    const result: ValidationResult = {
      isValid: violations.length === 0,
      score,
      violations,
    };

    log.event('fact_validator.validate_complete', {
      is_valid: result.isValid,
      score: result.score,
      violations_count: violations.length,
    });

    return result;
  }

  /**
   * Extract factual claims from response text
   *
   * Current implementation: Simple sentence splitting
   * TODO: Use NLP to extract actual factual claims (not questions, greetings, etc.)
   */
  private static extractClaims(response: string): string[] {
    // Split by sentence terminators
    const sentences = response.split(/[.!?]\n/).filter((s) => s.trim());

    // Filter out non-factual sentences
    const claims = sentences.filter((sentence) => {
      const s = sentence.trim().toLowerCase();

      // Skip headings/labels (e.g., "**Who You Are:**")
      if (s.match(/^\*\*.*\*\*:?$/)) return false;

      // Skip bullet points without content
      if (s.match(/^[•\-\*]\s*$/)) return false;

      // Skip section dividers
      if (s.match(/^---+$/)) return false;

      // Skip very short fragments (< 10 chars)
      if (s.length < 10) return false;

      return true;
    });

    return claims;
  }

  /**
   * Check if a claim is grounded in facts
   *
   * Current implementation: Simple substring matching
   * TODO: Use semantic similarity, NLP, embedding comparison
   */
  private static isClaimGrounded(claim: string, facts: FactSet): boolean {
    const claimLower = claim.toLowerCase();
    const allFacts = facts.getAllFacts();

    // Check if claim contains any fact values
    for (const fact of allFacts) {
      const factValue = this.extractSearchableValue(fact.value);

      if (factValue && claimLower.includes(factValue.toLowerCase())) {
        return true;
      }

      // For complex objects, check nested values
      if (typeof fact.value === 'object' && fact.value !== null) {
        if (this.isClaimGroundedInObject(claimLower, fact.value)) {
          return true;
        }
      }
    }

    // Special case: Meta-statements about the data itself
    // e.g., "This game plan is grounded in your assessment data"
    if (this.isMetaStatement(claimLower)) {
      return true;
    }

    return false;
  }

  /**
   * Extract searchable string from fact value
   */
  private static extractSearchableValue(value: any): string | null {
    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    if (Array.isArray(value)) {
      return value.join(' ');
    }

    return null;
  }

  /**
   * Check if claim is grounded in object properties
   */
  private static isClaimGroundedInObject(claim: string, obj: any): boolean {
    for (const key in obj) {
      const value = obj[key];

      if (typeof value === 'string' && claim.includes(value.toLowerCase())) {
        return true;
      }

      if (typeof value === 'object' && value !== null) {
        if (this.isClaimGroundedInObject(claim, value)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if statement is meta-commentary (not a factual claim)
   * e.g., "This roadmap adapts to your progress"
   */
  private static isMetaStatement(claim: string): boolean {
    const metaPatterns = [
      /this.*adapts/,
      /this.*grounded/,
      /check.*quarterly/,
      /let me know/,
      /feel free to/,
      /missing data/,
      /need more information/,
    ];

    return metaPatterns.some((pattern) => pattern.test(claim));
  }
}

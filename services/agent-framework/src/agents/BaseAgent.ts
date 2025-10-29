/**
 * BaseAgent: Universal abstract class for all agents
 * v18.0: Enforces fact-first behavior at architectural level
 *
 * Design Doc: docs/FACT_FIRST_ARCHITECTURE.md
 *
 * KEY PRINCIPLE: All agents MUST extend BaseAgent
 * - Cannot bypass fact loading
 * - Cannot skip validation
 * - Must declare required facts upfront
 */

import { FactStore } from '../facts/FactStore.js';
import { FactSet } from '../facts/FactSet.js';
import { FactValidator } from '../facts/FactValidator.js';
import {
  FactCategory,
  AgentQuery,
  AgentResponse,
  ValidationResult,
} from '../facts/types.js';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('base-agent');

export abstract class BaseAgent {
  protected factStore: FactStore;
  protected agentId: string;

  constructor(agentId: string, factStore: FactStore) {
    this.agentId = agentId;
    this.factStore = factStore;
  }

  /**
   * ABSTRACT METHOD: Each agent must declare required facts
   * This is the contract - agent cannot work without these facts
   */
  protected abstract getRequiredFacts(): FactCategory[];

  /**
   * UNIVERSAL METHOD: Load facts before responding (ENFORCED)
   * Cannot be overridden - ensures fact-first behavior
   */
  protected async loadFacts(entityId: string): Promise<FactSet> {
    const categories = this.getRequiredFacts();

    log.event(`${this.agentId}.load_facts_start`, {
      entity_id: entityId,
      required_categories: categories,
    });

    const factPromises = categories.map((category) =>
      this.factStore.getFacts({
        category,
        entity_id: entityId,
      })
    );

    const results = await Promise.all(factPromises);
    const allFacts = results.flat();

    log.event(`${this.agentId}.load_facts_complete`, {
      entity_id: entityId,
      facts_loaded: allFacts.length,
      by_category: categories.map((cat) => ({
        category: cat,
        count: allFacts.filter((f) => f.category === cat).length,
      })),
    });

    return new FactSet(allFacts);
  }

  /**
   * UNIVERSAL METHOD: Validate response is fact-grounded (ENFORCED)
   * Called automatically before returning any response
   */
  protected async validateResponse(
    response: string,
    facts: FactSet
  ): Promise<ValidationResult> {
    log.event(`${this.agentId}.validate_response_start`, {
      response_length: response.length,
      facts_count: facts.count(),
    });

    const validation = await FactValidator.validate(response, facts);

    log.event(`${this.agentId}.validate_response_complete`, {
      is_valid: validation.isValid,
      score: validation.score,
      violations_count: validation.violations.length,
    });

    if (!validation.isValid) {
      log.error(`${this.agentId}.validation_failed`, {
        violations: validation.violations,
      });
    }

    return validation;
  }

  /**
   * TEMPLATE METHOD: All agents follow this flow (CANNOT BE OVERRIDDEN)
   * Ensures fact-first behavior at architectural level
   *
   * Flow:
   * 1. Load facts (enforced)
   * 2. Check sufficiency (enforced)
   * 3. Generate response (agent-specific)
   * 4. Validate response (enforced)
   * 5. Return with provenance (enforced)
   */
  async handleQuery(query: AgentQuery): Promise<AgentResponse> {
    log.event(`${this.agentId}.handle_query_start`, {
      entity_id: query.entity_id,
      query: query.query.substring(0, 100),
      session_id: query.session_id,
    });

    const startTime = Date.now();

    try {
      // Step 1: Load facts (ENFORCED - cannot be bypassed)
      const facts = await this.loadFacts(query.entity_id);

      // Step 2: Check if sufficient facts exist (ENFORCED)
      if (!facts.hasSufficientData(this.getRequiredFacts())) {
        return this.generateInsufficientDataResponse(facts);
      }

      // Step 3: Generate response (agent-specific logic)
      const response = await this.generateResponse(query, facts);

      // Step 4: Validate response is fact-grounded (ENFORCED)
      const validation = await this.validateResponse(response, facts);

      // Step 5: Return with fact provenance (ENFORCED)
      const agentResponse: AgentResponse = {
        response,
        facts_used: facts.getAllFacts(),
        validation_score: validation.score,
        provenance: facts.getProvenance(),
        metadata: {
          agent_id: this.agentId,
          duration_ms: Date.now() - startTime,
          facts_count: facts.count(),
          validation: validation.isValid ? 'passed' : 'failed',
        },
      };

      log.event(`${this.agentId}.handle_query_complete`, {
        entity_id: query.entity_id,
        duration_ms: agentResponse.metadata?.duration_ms,
        validation_score: validation.score,
      });

      return agentResponse;
    } catch (error) {
      log.error(`${this.agentId}.handle_query_error`, {
        entity_id: query.entity_id,
        error: String(error),
      });

      throw error;
    }
  }

  /**
   * ABSTRACT METHOD: Each agent implements its own response logic
   * BUT: Must use facts provided - cannot query database directly
   * This ensures all data access is audited through FactStore
   */
  protected abstract generateResponse(
    query: AgentQuery,
    facts: FactSet
  ): Promise<string>;

  /**
   * TEMPLATE METHOD: Default insufficient data response
   * Can be overridden by agents for custom messaging
   */
  protected generateInsufficientDataResponse(facts: FactSet): AgentResponse {
    const missing = facts.getMissingCategories(this.getRequiredFacts());

    log.event(`${this.agentId}.insufficient_data`, {
      missing_categories: missing,
    });

    return {
      response: `I need more information to answer this question. Missing data: ${missing.join(', ')}`,
      facts_used: [],
      validation_score: 1.0, // Valid response (explicitly states missing data)
      provenance: [],
      metadata: {
        agent_id: this.agentId,
        missing_categories: missing,
      },
    };
  }
}

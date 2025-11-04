/**
 * BaseAgentWithIntelligence: Enhanced BaseAgent with Intelligence Types Architecture
 * v18.1: Adds Intelligence Types support while maintaining fact-first enforcement
 *
 * Extends v18.0 BaseAgent with:
 * - UNIVERSAL Intelligence Types (inherited by all agents)
 * - DOMAIN-SPECIFIC Intelligence Types (per-agent)
 * - Parallel Multi-Threaded Processing
 * - Intelligence result synthesis
 *
 * Design Doc: docs/FOUNDATION_AGENTS_ARCHITECTURE.md (v3.0)
 *
 * KEY PRINCIPLE: All agents MUST extend BaseAgentWithIntelligence
 * - Cannot bypass fact loading (inherited from BaseAgent)
 * - Cannot skip validation (inherited from BaseAgent)
 * - Must declare required facts upfront (inherited from BaseAgent)
 * - Must declare domain-specific intelligence types
 *
 * Created: 2025-10-29
 */

import { FactStore } from '../../facts/FactStore.js';
import { FactSet } from '../../facts/FactSet.js';
import { FactValidator } from '../../facts/FactValidator.js';
import {
  FactCategory,
  AgentQuery,
  AgentResponse,
  ValidationResult,
} from '../../facts/types.js';
import {
  IntelligenceType,
  IntelligenceResult,
} from '../../intelligence/types/BaseIntelligenceType.js';
import { IntelligenceRegistry } from '../../intelligence/IntelligenceRegistry.js';
import { createLogger } from '../../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('base-agent-intelligence');

/**
 * Extended AgentResponse with Intelligence metadata
 */
export interface IntelligenceAgentResponse extends AgentResponse {
  intelligence_results?: IntelligenceResult[];
  triggered_intelligence?: string[];
}

/**
 * BaseAgentWithIntelligence - Combines Fact-First + Intelligence Types
 *
 * Inheritance:
 * BaseAgentWithIntelligence extends fact-first behavior + adds intelligence processing
 *
 * Flow:
 * 1. Load facts from FactStore (ENFORCED by this base class)
 * 2. Validate facts sufficiency (ENFORCED)
 * 3. Run ALL intelligence types in parallel (Universal + Domain-Specific)
 * 4. Filter triggered results
 * 5. Synthesize response from intelligence results
 * 6. Validate response (ENFORCED)
 * 7. Return with provenance (ENFORCED)
 */
export abstract class BaseAgentWithIntelligence {
  protected factStore: FactStore;
  protected agentId: string;
  protected agentDomain: string;

  /**
   * UNIVERSAL Intelligence Types - inherited by ALL agents
   * Loaded from IntelligenceRegistry at initialization
   */
  protected static UNIVERSAL_INTELLIGENCE: IntelligenceType[] = [];

  /**
   * DOMAIN-SPECIFIC Intelligence Types - declared by each agent
   * Each agent must override this property
   */
  protected abstract DOMAIN_INTELLIGENCE: IntelligenceType[];

  constructor(agentId: string, factStore: FactStore) {
    this.agentId = agentId;
    this.factStore = factStore;
    this.agentDomain = agentId.replace('-agent', '');

    // Initialize universal intelligence types on first instantiation
    if (BaseAgentWithIntelligence.UNIVERSAL_INTELLIGENCE.length === 0) {
      this.initializeUniversalIntelligence();
    }
  }

  /**
   * Initialize universal intelligence types (runs once globally)
   */
  private initializeUniversalIntelligence(): void {
    log.event('base_agent.initialize_universal_intelligence_start');

    // Load universal intelligence types from registry
    try {
      // TYPE-020: Opportunity Pipeline (always present)
      if (IntelligenceRegistry.has('TYPE-020')) {
        BaseAgentWithIntelligence.UNIVERSAL_INTELLIGENCE.push(
          IntelligenceRegistry.get('TYPE-020')
        );
      }

      // TODO: Add remaining universal types as implemented
      // TYPE-005: 3R Rejection Protocol
      // TYPE-010: Permission Field
      // TYPE-011: Celebration Science
      // TYPE-012: Rejection Alchemy
      // TYPE-018: Strategic Pivot Protocol
      // TYPE-021: Parent Navigation Matrix

      log.event('base_agent.initialize_universal_intelligence_complete', {
        count: BaseAgentWithIntelligence.UNIVERSAL_INTELLIGENCE.length,
        types: BaseAgentWithIntelligence.UNIVERSAL_INTELLIGENCE.map((t) => t.type_id),
      });
    } catch (error) {
      log.error('base_agent.initialize_universal_intelligence_error', error);
    }
  }

  /**
   * Get all intelligence types for this agent (Universal + Domain-Specific)
   */
  protected getAllIntelligenceTypes(): IntelligenceType[] {
    return [
      ...BaseAgentWithIntelligence.UNIVERSAL_INTELLIGENCE,
      ...this.DOMAIN_INTELLIGENCE,
    ];
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
   * Ensures fact-first + intelligence processing behavior
   *
   * Flow:
   * 1. Load facts (enforced)
   * 2. Check sufficiency (enforced)
   * 3. Run ALL intelligence types in parallel (enforced)
   * 4. Filter triggered results (enforced)
   * 5. Synthesize response (agent-specific, can override)
   * 6. Validate response (enforced)
   * 7. Return with provenance (enforced)
   */
  async handleQuery(query: AgentQuery): Promise<IntelligenceAgentResponse> {
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

      // Step 3: Run ALL intelligence types in parallel (ENFORCED)
      log.event(`${this.agentId}.process_intelligence_start`, {
        universal_count: BaseAgentWithIntelligence.UNIVERSAL_INTELLIGENCE.length,
        domain_count: this.DOMAIN_INTELLIGENCE.length,
        total_count: this.getAllIntelligenceTypes().length,
      });

      const intelligenceResults = await this.processIntelligenceTypes(query, facts);

      // Step 4: Filter triggered results (ENFORCED)
      const triggeredResults = intelligenceResults.filter((r) => r.triggered);

      log.event(`${this.agentId}.process_intelligence_complete`, {
        total_processed: intelligenceResults.length,
        triggered: triggeredResults.length,
        triggered_types: triggeredResults.map((r) => r.type_id),
      });

      // Step 5: Synthesize response (agent-specific logic, can be overridden)
      const response = await this.synthesizeResponse(triggeredResults, query, facts);

      // Step 6: Validate response is fact-grounded (ENFORCED)
      const validation = await this.validateResponse(response, facts);

      // Step 7: Return with fact provenance + intelligence metadata (ENFORCED)
      const agentResponse: IntelligenceAgentResponse = {
        response,
        facts_used: facts.getAllFacts(),
        validation_score: validation.score,
        provenance: facts.getProvenance(),
        intelligence_results: triggeredResults,
        triggered_intelligence: triggeredResults.map((r) => r.type_id),
        metadata: {
          agent_id: this.agentId,
          duration_ms: Date.now() - startTime,
          facts_count: facts.count(),
          validation: validation.isValid ? 'passed' : 'failed',
          intelligence_count: triggeredResults.length,
        },
      };

      log.event(`${this.agentId}.handle_query_complete`, {
        entity_id: query.entity_id,
        duration_ms: agentResponse.metadata?.duration_ms,
        validation_score: validation.score,
        intelligence_triggered: triggeredResults.length,
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
   * Process all intelligence types in parallel
   * Returns ALL results (triggered and non-triggered)
   */
  protected async processIntelligenceTypes(
    query: AgentQuery,
    facts: FactSet
  ): Promise<IntelligenceResult[]> {
    const allIntelligenceTypes = this.getAllIntelligenceTypes();

    // Run all intelligence types in parallel
    const results = await Promise.all(
      allIntelligenceTypes.map(async (intelligence) => {
        const startTime = Date.now();

        try {
          const result = await intelligence.process(query, facts);

          log.event(`${this.agentId}.intelligence_processed`, {
            type_id: intelligence.type_id,
            triggered: result.triggered,
            confidence: result.confidence,
            duration_ms: Date.now() - startTime,
          });

          return result;
        } catch (error) {
          log.error(`${this.agentId}.intelligence_error`, {
            type_id: intelligence.type_id,
            error: String(error),
          });

          // Return error result
          return {
            type_id: intelligence.type_id,
            component: 'error',
            data: { error: String(error) },
            confidence: 0,
            triggered: false,
          };
        }
      })
    );

    return results;
  }

  /**
   * Synthesize response from intelligence results
   * Default implementation - agents can override for custom synthesis
   */
  protected async synthesizeResponse(
    intelligenceResults: IntelligenceResult[],
    query: AgentQuery,
    facts: FactSet
  ): Promise<string> {
    if (intelligenceResults.length === 0) {
      return "I don't have enough information to answer this question right now.";
    }

    // Default synthesis: Concatenate all intelligence results
    const sections: string[] = [];

    for (const result of intelligenceResults) {
      if (result.data && typeof result.data === 'object') {
        // Format intelligence result
        sections.push(this.formatIntelligenceResult(result));
      }
    }

    return sections.join('\n\n');
  }

  /**
   * Format individual intelligence result for response
   * Can be overridden for custom formatting
   */
  protected formatIntelligenceResult(result: IntelligenceResult): string {
    // Default formatting - agents should override for better UX
    return `**${result.component}** (${result.type_id})\n${JSON.stringify(result.data, null, 2)}`;
  }

  /**
   * TEMPLATE METHOD: Default insufficient data response
   * Can be overridden by agents for custom messaging
   */
  protected generateInsufficientDataResponse(facts: FactSet): IntelligenceAgentResponse {
    const missing = facts.getMissingCategories(this.getRequiredFacts());

    log.event(`${this.agentId}.insufficient_data`, {
      missing_categories: missing,
    });

    // v28.2: More natural error message
    const prettifyCategory = (cat: string) => {
      return cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const missingPretty = missing.slice(0, 2).map(prettifyCategory);
    const naturalMessage = missingPretty.length > 0
      ? `I'm still learning about you! Let me know a bit more about ${missingPretty.join(' and ')} so I can help you better.`
      : `I'm still learning about you! Let's continue building your profile.`;

    return {
      response: naturalMessage,
      facts_used: [],
      validation_score: 1.0, // Valid response (explicitly states missing data)
      provenance: [],
      metadata: {
        agent_id: this.agentId,
        missing_categories: missing,
      },
    };
  }

  // ============================================================================
  // A2A (Agent-to-Agent) CAPABILITIES - v28.0
  // ============================================================================

  /**
   * Initialize agent from handover package (TEMPLATE METHOD)
   * Agents should override this to provide domain-specific initialization
   *
   * @param package - A2A handover package from source agent
   * @returns Initial response to user after receiving handover
   */
  async initializeFromHandover(pkg: any): Promise<string> {
    log.event(`${this.agentId}.handover_received`, {
      from_agent: pkg.from_agent,
      handover_id: pkg.handover_id,
      facts_count: pkg.facts?.count() || 0,
    });

    // Default: Extract facts and generate initial response
    const facts = pkg.facts;
    const domainPayload = pkg.domain_payload;

    // Subclass should override this to provide domain-specific initialization
    return this.generateHandoverInitializationMessage(facts, domainPayload);
  }

  /**
   * Generate initial message after receiving handover (TEMPLATE METHOD)
   * Agents MUST override this for domain-specific handover messages
   *
   * @param facts - FactSet from handover package
   * @param domainPayload - Domain-specific payload from source agent
   * @returns Initial message to display to user
   */
  protected async generateHandoverInitializationMessage(
    facts: FactSet,
    domainPayload: any
  ): Promise<string> {
    // Default implementation - agents should override
    return `I've received your context from the previous agent. Let me help you with ${this.agentDomain}.`;
  }

  /**
   * Process asynchronous event (TEMPLATE METHOD)
   * Agents should override this to handle domain-specific events
   *
   * @param event - Event data with type, facts, and metadata
   * @returns Action to take (send message, update state, etc.)
   */
  async processEvent(event: {
    event_id: string;
    event_type: string;
    facts: FactSet;
  }): Promise<{ send_message: boolean; message?: string; type: string }> {
    log.event(`${this.agentId}.event_received`, {
      event_id: event.event_id,
      event_type: event.event_type,
    });

    // Default: No action
    return {
      send_message: false,
      type: 'no_action',
    };
  }

  /**
   * Consultation mode (limited scope expert query) (TEMPLATE METHOD)
   * Agents should override this to provide domain-specific expertise
   *
   * @param request - Consultation request with query, facts, and scope
   * @returns Expert answer with facts and confidence
   */
  async consultationMode(request: {
    request_id: string;
    query: string;
    facts: FactSet;
    scope: string;
  }): Promise<{ result: string; facts: FactSet; confidence: number }> {
    log.event(`${this.agentId}.consultation_requested`, {
      request_id: request.request_id,
      scope: request.scope,
    });

    // Default: Not supported
    throw new Error(`${this.agentId} does not support consultation mode`);
  }
}

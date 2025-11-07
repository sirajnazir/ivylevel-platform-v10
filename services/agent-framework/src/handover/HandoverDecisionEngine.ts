/**
 * HandoverDecisionEngine
 *
 * Universal handover decision engine - SINGLE SOURCE OF TRUTH
 * All orchestrators (v26, v34, future) call this
 *
 * Integration points:
 * - Uses HandoverValidator (existing v29 code) for quality gates
 * - Uses AgentHandoverConfig for declarative requirements
 * - Works with UniversalFact protocol
 *
 * @file src/handover/HandoverDecisionEngine.ts
 */

import { HandoverValidator } from '../a2a/HandoverValidator.js';
import { getAgentConfig, AgentConfig } from '../config/AgentHandoverConfig.js';
import { UniversalFact } from '../facts/UniversalFact.js';
import { HandoverLogger } from './HandoverLogger.js';
import { FactCategory } from '../facts/types.js';

export interface HandoverDecision {
  should_handover: boolean;
  from_agent: string;
  to_agent: string;
  quality_score: number;
  quality_gates_passed: number;
  quality_gates_total: number;
  reason: string;
  timestamp: string;
  metadata?: {
    conversation_turns?: number;
    missing_facts?: string[];
    collected_facts?: string[];
  };
}

export class HandoverDecisionEngine {
  /**
   * Convert UniversalFacts to FactCategory map for HandoverValidator
   *
   * @private
   */
  private static convertToFactCategoryMap(facts: UniversalFact[]): Map<FactCategory, any[]> {
    const factMap = new Map<FactCategory, any[]>();

    // For now, group all facts under STUDENT_PROFILE category
    // HandoverValidator mainly checks for presence of data, not specific categories
    const profileFacts: any[] = [];

    for (const fact of facts) {
      // Convert UniversalFact to simple fact object
      const simpleFact = {
        fact_type: fact.category,
        value: fact.data.fields,
        confidence: fact.confidence,
        source_ref: fact.source.extraction_method
      };
      profileFacts.push(simpleFact);
    }

    if (profileFacts.length > 0) {
      factMap.set(FactCategory.STUDENT_PROFILE, profileFacts);
    }

    return factMap;
  }

  /**
   * Universal handover check
   *
   * Returns null if not ready, HandoverDecision if ready
   */
  static async checkHandover(
    sessionId: string,
    currentAgent: string,
    facts: UniversalFact[],
    conversationTurns: number = 0
  ): Promise<HandoverDecision | null> {

    HandoverLogger.logCheckStart(
      sessionId,
      currentAgent,
      facts.length,
      conversationTurns
    );

    try {
      // 1. Get declarative requirements for current agent
      const config = getAgentConfig(currentAgent);

      if (!config) {
        HandoverLogger.logNoConfig(sessionId, currentAgent);
        return null;
      }

      if (!config.handover_to) {
        HandoverLogger.logNoTarget(sessionId, currentAgent);
        return null;
      }

      // 2. Check minimum conversation turns
      if (conversationTurns < config.minimum_turns) {
        HandoverLogger.logInsufficientTurns(
          sessionId,
          currentAgent,
          conversationTurns,
          config.minimum_turns
        );
        return null;
      }

      // 3. Run custom validation if provided
      if (config.custom_validation) {
        const customResult = await config.custom_validation(facts);
        if (!customResult) {
          HandoverLogger.logCustomValidationFailed(sessionId, currentAgent);
          return null;
        }
      }

      // 4. Use HandoverValidator (existing v29 code with 20 quality gates)
      const factMap = this.convertToFactCategoryMap(facts);
      const validation = await HandoverValidator.validateHandover(
        currentAgent,
        config.handover_to,
        factMap
      );

      HandoverLogger.logValidationComplete(
        sessionId,
        currentAgent,
        validation.quality_score,
        validation.quality_gates_passed,
        validation.quality_gates_total,
        validation.recommendation
      );

      // 5. Check quality threshold
      if (validation.quality_score < config.quality_threshold) {
        HandoverLogger.logBelowThreshold(
          sessionId,
          currentAgent,
          validation.quality_score,
          config.quality_threshold,
          validation.quality_gates_passed,
          validation.quality_gates_total,
          validation.recommendation
        );
        return null;
      }

      // 6. Extract collected field names
      const collectedFacts = facts
        .map(f => (f.data as any).metadata?.field_name)
        .filter(Boolean) as string[];

      // 7. Find missing required facts
      const missingFacts = config.minimum_required.filter(
        req => !collectedFacts.includes(req)
      );

      if (missingFacts.length > 0) {
        HandoverLogger.logMissingRequired(
          sessionId,
          currentAgent,
          missingFacts,
          collectedFacts
        );
        return null;
      }

      // 8. ✅ HANDOVER READY - Create decision
      const decision: HandoverDecision = {
        should_handover: true,
        from_agent: currentAgent,
        to_agent: config.handover_to,
        quality_score: validation.quality_score,
        quality_gates_passed: validation.quality_gates_passed,
        quality_gates_total: validation.quality_gates_total,
        reason: validation.recommendation,
        timestamp: new Date().toISOString(),
        metadata: {
          conversation_turns: conversationTurns,
          missing_facts: [],
          collected_facts: collectedFacts
        }
      };

      HandoverLogger.logHandoverReady(sessionId, decision);

      return decision;

    } catch (error) {
      HandoverLogger.logError(
        sessionId,
        currentAgent,
        error instanceof Error ? error : String(error)
      );

      // Don't block on error
      return null;
    }
  }

  /**
   * Check if agent can delegate to target
   */
  static canDelegateTo(
    sourceAgent: string,
    targetAgent: string
  ): boolean {
    const config = getAgentConfig(sourceAgent);
    return config?.can_delegate_to?.includes(targetAgent) || false;
  }

  /**
   * Get missing facts for user feedback
   */
  static getMissingFacts(
    currentAgent: string,
    facts: UniversalFact[]
  ): string[] {
    const config = getAgentConfig(currentAgent);
    if (!config) return [];

    const collectedFacts = facts
      .map(f => (f.data as any).metadata?.field_name)
      .filter(Boolean) as string[];

    return config.minimum_required.filter(
      req => !collectedFacts.includes(req)
    );
  }
}

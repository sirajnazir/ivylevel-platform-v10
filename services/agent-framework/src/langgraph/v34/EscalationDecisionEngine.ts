/**
 * Escalation Decision Engine
 *
 * v34.0: Orchestrator owns escalation decisions (not agents)
 *
 * Responsibilities:
 * - Evaluate if human coach escalation needed
 * - Determine escalation type (coach, technical support, data quality)
 * - Apply escalation rules (confidence, data quality, conversation length)
 *
 * NOT responsible for:
 * - Domain logic (belongs in agents)
 * - Human handoff execution (belongs in orchestrator)
 *
 * Created: 2025-11-05
 */

import { WorkflowState } from '../state.js';
import { AgentCompletionSignals, EscalationDecision } from './types.js';
import { createLogger } from '../../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('escalation-decision-engine');

/**
 * Escalation Decision Engine
 *
 * Centralized logic for human coach escalation
 */
export class EscalationDecisionEngine {
  /**
   * Evaluate if escalation should occur
   *
   * @param state - Current workflow state
   * @param signals - Agent completion signals
   * @returns Decision with escalation information
   */
  shouldEscalate(
    state: WorkflowState,
    signals: AgentCompletionSignals
  ): EscalationDecision {
    const currentAgent = state.agent_context.current_agent;
    const conversationLength = state.conversation_history?.length || 0;

    log.event('escalation.evaluate_start', {
      current_agent: currentAgent,
      conversation_length: conversationLength,
      confidence: signals.confidence,
      needs_human_escalation: signals.needs_human_escalation,
      needs_more_data: signals.needs_more_data
    });

    // Track rules evaluated (for debugging)
    const rulesEvaluated: string[] = [];

    // ========================================================================
    // RULE 1: Agent explicitly requests escalation
    // ========================================================================
    rulesEvaluated.push('explicit_escalation_check');

    if (signals.needs_human_escalation) {
      log.event('escalation.agent_requested', {
        current_agent: currentAgent,
        confidence: signals.confidence
      });

      return {
        should_escalate: true,
        reason: 'Agent requested human intervention',
        escalation_type: 'human_coach',
        metadata: {
          trigger: 'agent_request',
          confidence_at_escalation: signals.confidence,
          conversation_length: conversationLength
        }
      };
    }

    // ========================================================================
    // RULE 2: Low confidence threshold
    // ========================================================================
    rulesEvaluated.push('confidence_threshold_check');

    const ESCALATION_CONFIDENCE_THRESHOLD = 0.3;  // TODO v35.0: Make configurable
    if (signals.confidence < ESCALATION_CONFIDENCE_THRESHOLD) {
      log.event('escalation.low_confidence', {
        current_agent: currentAgent,
        confidence: signals.confidence,
        threshold: ESCALATION_CONFIDENCE_THRESHOLD
      });

      return {
        should_escalate: true,
        reason: `Confidence ${signals.confidence.toFixed(2)} below threshold ${ESCALATION_CONFIDENCE_THRESHOLD}`,
        escalation_type: 'human_coach',
        metadata: {
          trigger: 'low_confidence',
          confidence_at_escalation: signals.confidence,
          conversation_length: conversationLength
        }
      };
    }

    // ========================================================================
    // RULE 3: Conversation length limit
    // ========================================================================
    rulesEvaluated.push('conversation_length_check');

    const MAX_CONVERSATION_LENGTH = 50;  // TODO v35.0: Make configurable
    if (conversationLength >= MAX_CONVERSATION_LENGTH) {
      log.event('escalation.conversation_too_long', {
        current_agent: currentAgent,
        conversation_length: conversationLength,
        limit: MAX_CONVERSATION_LENGTH
      });

      return {
        should_escalate: true,
        reason: `Conversation exceeded ${MAX_CONVERSATION_LENGTH} turns`,
        escalation_type: 'human_coach',
        metadata: {
          trigger: 'conversation_length',
          confidence_at_escalation: signals.confidence,
          conversation_length: conversationLength
        }
      };
    }

    // ========================================================================
    // RULE 4: Data quality issues
    // ========================================================================
    rulesEvaluated.push('data_quality_check');

    if (signals.needs_more_data && signals.fact_coverage !== undefined) {
      const MIN_FACT_COVERAGE = 0.2;  // TODO v35.0: Make configurable

      if (signals.fact_coverage < MIN_FACT_COVERAGE) {
        log.event('escalation.insufficient_data', {
          current_agent: currentAgent,
          fact_coverage: signals.fact_coverage,
          threshold: MIN_FACT_COVERAGE
        });

        return {
          should_escalate: true,
          reason: `Fact coverage ${(signals.fact_coverage * 100).toFixed(0)}% below minimum`,
          escalation_type: 'data_quality',
          metadata: {
            trigger: 'low_fact_coverage',
            confidence_at_escalation: signals.confidence,
            conversation_length: conversationLength
          }
        };
      }
    }

    // ========================================================================
    // RULE 5: Stuck in loop (repeated questions)
    // ========================================================================
    rulesEvaluated.push('loop_detection_check');

    const loopDetected = this.detectConversationLoop(state);
    if (loopDetected) {
      log.event('escalation.conversation_loop', {
        current_agent: currentAgent,
        conversation_length: conversationLength
      });

      return {
        should_escalate: true,
        reason: 'Conversation appears stuck in loop',
        escalation_type: 'human_coach',
        metadata: {
          trigger: 'conversation_loop',
          confidence_at_escalation: signals.confidence,
          conversation_length: conversationLength
        }
      };
    }

    // ========================================================================
    // NO ESCALATION NEEDED
    // ========================================================================

    log.event('escalation.not_needed', {
      current_agent: currentAgent,
      confidence: signals.confidence,
      conversation_length: conversationLength,
      rules_evaluated: rulesEvaluated
    });

    return {
      should_escalate: false
    };
  }

  /**
   * Detect conversation loop
   *
   * Simple heuristic: If last 3 agent messages are similar, likely looping
   *
   * TODO v35.0: Implement more sophisticated loop detection
   * - Embedding-based similarity
   * - Intent repetition tracking
   * - Fact collection stagnation
   *
   * @private
   */
  private detectConversationLoop(state: WorkflowState): boolean {
    const history = state.conversation_history || [];

    // Need at least 6 messages to detect loop (3 user + 3 agent)
    if (history.length < 6) {
      return false;
    }

    // Get last 6 messages
    const recent = history.slice(-6);

    // Extract agent messages
    const agentMessages = recent
      .filter(msg => msg.role === 'assistant')
      .map(msg => msg.content.toLowerCase());

    if (agentMessages.length < 3) {
      return false;
    }

    // Simple heuristic: Check if last 3 agent messages have high overlap
    const [msg1, msg2, msg3] = agentMessages.slice(-3);

    // Calculate Jaccard similarity (simple word overlap)
    const similarity12 = this.calculateWordOverlap(msg1, msg2);
    const similarity23 = this.calculateWordOverlap(msg2, msg3);
    const similarity13 = this.calculateWordOverlap(msg1, msg3);

    const avgSimilarity = (similarity12 + similarity23 + similarity13) / 3;

    const LOOP_SIMILARITY_THRESHOLD = 0.6;  // TODO v35.0: Make configurable

    if (avgSimilarity >= LOOP_SIMILARITY_THRESHOLD) {
      log.event('escalation.loop_detected', {
        avg_similarity: avgSimilarity.toFixed(2),
        threshold: LOOP_SIMILARITY_THRESHOLD,
        sample_messages: agentMessages.slice(-3).map(m => m.substring(0, 50))
      });

      return true;
    }

    return false;
  }

  /**
   * Calculate word overlap between two strings
   *
   * Returns Jaccard similarity: intersection / union
   *
   * @private
   */
  private calculateWordOverlap(str1: string, str2: string): number {
    const words1 = new Set(str1.split(/\s+/).filter(w => w.length > 3));
    const words2 = new Set(str2.split(/\s+/).filter(w => w.length > 3));

    if (words1.size === 0 && words2.size === 0) {
      return 0;
    }

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Get escalation rules (for documentation/debugging)
   *
   * TODO v35.0: This will become the configuration schema
   */
  getEscalationRules(): {
    rule: string;
    trigger: string;
    threshold?: number | string;
  }[] {
    return [
      {
        rule: 'explicit_request',
        trigger: 'Agent sets needs_human_escalation: true',
        threshold: 'N/A'
      },
      {
        rule: 'low_confidence',
        trigger: 'Confidence < threshold',
        threshold: 0.3
      },
      {
        rule: 'conversation_length',
        trigger: 'Turns > threshold',
        threshold: 50
      },
      {
        rule: 'low_fact_coverage',
        trigger: 'Fact coverage < threshold',
        threshold: 0.2
      },
      {
        rule: 'conversation_loop',
        trigger: 'Repeated agent messages (similarity > 60%)',
        threshold: 0.6
      }
    ];
  }

  /**
   * Format escalation message for user
   *
   * Generate user-friendly message explaining why escalation occurred
   */
  formatEscalationMessage(decision: EscalationDecision): string {
    if (!decision.should_escalate) {
      return '';
    }

    switch (decision.metadata?.trigger) {
      case 'agent_request':
        return "I think it would be helpful to connect you with a human coach who can provide more personalized guidance.";

      case 'low_confidence':
        return "I want to make sure you get the best advice. Let me connect you with a human coach who can help.";

      case 'conversation_length':
        return "We've been chatting for a while! A human coach might be able to help us move forward more efficiently.";

      case 'low_fact_coverage':
        return "I need a bit more information to give you the best recommendations. A human coach can help us gather the details we need.";

      case 'conversation_loop':
        return "I notice we might be going in circles. Let me connect you with a human coach who can help clarify things.";

      default:
        return "I'd like to connect you with a human coach to provide additional support.";
    }
  }
}

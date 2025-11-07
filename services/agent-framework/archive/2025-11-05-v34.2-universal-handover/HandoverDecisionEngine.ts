/**
 * Handover Decision Engine
 *
 * v34.0: Orchestrator owns routing decisions (not agents)
 *
 * Responsibilities:
 * - Evaluate if agent handover should occur
 * - Determine next agent based on current state + signals
 * - Apply routing rules (currently hardcoded, v35.0 will be config-driven)
 *
 * NOT responsible for:
 * - Domain logic (belongs in agents)
 * - Intelligence processing (belongs in agents)
 *
 * Created: 2025-11-05
 */

import { WorkflowState } from '../state.js';
import { AgentCompletionSignals, HandoverDecision } from './types.js';
import { createLogger } from '../../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('handover-decision-engine');

/**
 * Handover Decision Engine
 *
 * Centralized routing logic for agent transitions
 */
export class HandoverDecisionEngine {
  /**
   * Evaluate if handover should occur
   *
   * @param state - Current workflow state
   * @param signals - Agent completion signals
   * @returns Decision with routing information
   */
  shouldHandover(
    state: WorkflowState,
    signals: AgentCompletionSignals
  ): HandoverDecision {
    const currentAgent = state.agent_context.current_agent;

    log.event('handover.evaluate_start', {
      current_agent: currentAgent,
      phase_complete: signals.phase_complete,
      completion: signals.completion_percentage,
      confidence: signals.confidence,
      suggested_next: signals.suggested_next_phase
    });

    // Track rules evaluated (for debugging)
    const rulesEvaluated: string[] = [];

    // ========================================================================
    // RULE 1: Phase must be complete
    // ========================================================================
    rulesEvaluated.push('phase_complete_check');

    if (!signals.phase_complete) {
      log.event('handover.blocked_phase_incomplete', {
        current_agent: currentAgent,
        completion: signals.completion_percentage
      });

      return {
        should_handover: false,
        reason: 'phase_incomplete',
        metadata: {
          phase_completion: signals.completion_percentage,
          confidence: signals.confidence,
          rules_evaluated: rulesEvaluated
        }
      };
    }

    // ========================================================================
    // RULE 2: Minimum completion threshold
    // ========================================================================
    rulesEvaluated.push('completion_threshold_check');

    const MIN_COMPLETION = 100;  // TODO v35.0: Make configurable
    if (signals.completion_percentage < MIN_COMPLETION) {
      log.event('handover.blocked_below_threshold', {
        current_agent: currentAgent,
        completion: signals.completion_percentage,
        threshold: MIN_COMPLETION
      });

      return {
        should_handover: false,
        reason: 'below_completion_threshold',
        metadata: {
          phase_completion: signals.completion_percentage,
          confidence: signals.confidence,
          rules_evaluated: rulesEvaluated
        }
      };
    }

    // ========================================================================
    // RULE 3: Confidence threshold
    // ========================================================================
    rulesEvaluated.push('confidence_threshold_check');

    const MIN_CONFIDENCE = 0.8;  // TODO v35.0: Make configurable
    if (signals.confidence < MIN_CONFIDENCE) {
      log.event('handover.blocked_low_confidence', {
        current_agent: currentAgent,
        confidence: signals.confidence,
        threshold: MIN_CONFIDENCE
      });

      return {
        should_handover: false,
        reason: 'low_confidence',
        metadata: {
          phase_completion: signals.completion_percentage,
          confidence: signals.confidence,
          rules_evaluated: rulesEvaluated
        }
      };
    }

    // ========================================================================
    // RULE 4: Route based on current agent
    // ========================================================================
    rulesEvaluated.push('agent_routing');

    const decision = this.routeAgent(currentAgent, signals, rulesEvaluated);

    log.event('handover.decision_final', {
      current_agent: currentAgent,
      should_handover: decision.should_handover,
      next_agent: decision.next_agent,
      reason: decision.reason,
      rules_evaluated: rulesEvaluated
    });

    return decision;
  }

  /**
   * Route to next agent based on current agent
   *
   * TODO v35.0: Make this configuration-driven instead of hardcoded
   *
   * Current routing:
   * - Assessment → GamePlan
   * - GamePlan → Execution
   * - Execution → Terminal (no handover)
   *
   * @private
   */
  private routeAgent(
    currentAgent: string,
    signals: AgentCompletionSignals,
    rulesEvaluated: string[]
  ): HandoverDecision {
    // ========================================================================
    // ROUTE 1: Assessment → GamePlan
    // ========================================================================
    if (currentAgent === 'assessment-agent-v18') {
      log.event('handover.route_assessment_to_gameplan', {
        completion: signals.completion_percentage,
        confidence: signals.confidence
      });

      return {
        should_handover: true,
        next_agent: 'gameplan-agent-v18',
        reason: 'assessment_complete',
        metadata: {
          phase_completion: signals.completion_percentage,
          confidence: signals.confidence,
          rules_evaluated: rulesEvaluated
        }
      };
    }

    // ========================================================================
    // ROUTE 2: GamePlan → Execution
    // ========================================================================
    if (currentAgent === 'gameplan-agent-v18') {
      log.event('handover.route_gameplan_to_execution', {
        completion: signals.completion_percentage,
        confidence: signals.confidence
      });

      return {
        should_handover: true,
        next_agent: 'execution-agent',
        reason: 'gameplan_complete',
        metadata: {
          phase_completion: signals.completion_percentage,
          confidence: signals.confidence,
          rules_evaluated: rulesEvaluated
        }
      };
    }

    // ========================================================================
    // TERMINAL AGENTS: No further handover
    // ========================================================================
    if (currentAgent === 'execution-agent') {
      log.event('handover.terminal_agent_reached', {
        agent: currentAgent
      });

      return {
        should_handover: false,
        reason: 'terminal_agent',
        metadata: {
          phase_completion: signals.completion_percentage,
          confidence: signals.confidence,
          rules_evaluated: rulesEvaluated
        }
      };
    }

    // ========================================================================
    // UNKNOWN AGENT: Log error and don't handover
    // ========================================================================
    log.error('handover.unknown_agent', {
      agent: currentAgent,
      available_routes: [
        'assessment-agent-v18 → gameplan-agent-v18',
        'gameplan-agent-v18 → execution-agent',
        'execution-agent → terminal'
      ]
    });

    return {
      should_handover: false,
      reason: 'unknown_agent',
      metadata: {
        phase_completion: signals.completion_percentage,
        confidence: signals.confidence,
        rules_evaluated: [...rulesEvaluated, 'unknown_agent_error']
      }
    };
  }

  /**
   * Get routing map (for documentation/debugging)
   *
   * TODO v35.0: This will become the configuration schema
   */
  getRoutingMap(): Record<string, { next_agent: string; conditions: string[] }> {
    return {
      'assessment-agent-v18': {
        next_agent: 'gameplan-agent-v18',
        conditions: ['phase_complete', 'completion >= 100', 'confidence >= 0.8']
      },
      'gameplan-agent-v18': {
        next_agent: 'execution-agent',
        conditions: ['phase_complete', 'completion >= 100', 'confidence >= 0.8']
      },
      'execution-agent': {
        next_agent: 'terminal',
        conditions: ['no_handover']
      }
    };
  }
}

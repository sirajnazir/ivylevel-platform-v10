/**
 * Delegation Decision Engine
 *
 * v34.0: Orchestrator owns delegation decisions (not agents)
 *
 * Responsibilities:
 * - Evaluate if specialist agents needed
 * - Map delegation domains to target agents
 * - Coordinate parallel specialist execution
 *
 * NOT responsible for:
 * - Domain logic (belongs in agents)
 * - Specialist execution (belongs in orchestrator)
 *
 * Created: 2025-11-05
 */

import { WorkflowState } from '../state.js';
import { AgentCompletionSignals, DelegationDecision, DelegationRequest } from './types.js';
import { createLogger } from '../../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('delegation-decision-engine');

/**
 * Delegation Decision Engine
 *
 * Centralized logic for specialist agent delegation
 */
export class DelegationDecisionEngine {
  /**
   * Set of available agent IDs (for validation)
   */
  private availableAgents: Set<string>;

  /**
   * Constructor
   *
   * @param availableAgents - Set of registered agent IDs
   */
  constructor(availableAgents: Set<string>) {
    this.availableAgents = availableAgents;

    log.event('delegation_engine.initialized', {
      available_agents: Array.from(availableAgents),
      agent_count: availableAgents.size
    });
  }

  /**
   * Evaluate if delegation should occur
   *
   * @param state - Current workflow state
   * @param signals - Agent completion signals
   * @returns Decision with delegation targets
   */
  shouldDelegate(
    state: WorkflowState,
    signals: AgentCompletionSignals
  ): DelegationDecision {
    const currentAgent = state.agent_context.current_agent;

    log.event('delegation.evaluate_start', {
      current_agent: currentAgent,
      has_delegation_requests: !!signals.requires_delegation,
      request_count: signals.requires_delegation?.length || 0
    });

    // Track rules evaluated (for debugging)
    const rulesEvaluated: string[] = [];

    // ========================================================================
    // RULE 1: Only GamePlan agent can delegate
    // ========================================================================
    rulesEvaluated.push('agent_authorization_check');

    if (currentAgent !== 'gameplan-agent-v18') {
      log.event('delegation.blocked_unauthorized_agent', {
        current_agent: currentAgent,
        authorized_agents: ['gameplan-agent-v18']
      });

      return {
        should_delegate: false,
        metadata: {
          requesting_agent: currentAgent,
          domains_requested: []
        }
      };
    }

    // ========================================================================
    // RULE 2: Must have delegation requests
    // ========================================================================
    rulesEvaluated.push('delegation_requests_check');

    if (!signals.requires_delegation || signals.requires_delegation.length === 0) {
      log.event('delegation.no_requests', {
        current_agent: currentAgent
      });

      return {
        should_delegate: false,
        metadata: {
          requesting_agent: currentAgent,
          domains_requested: []
        }
      };
    }

    // ========================================================================
    // RULE 3: Map domains to target agents
    // ========================================================================
    rulesEvaluated.push('domain_mapping');

    const requestedAgents = this.mapDomainsToAgents(signals.requires_delegation);

    if (requestedAgents.length === 0) {
      log.error('delegation.mapping_failed', {
        current_agent: currentAgent,
        requested_domains: signals.requires_delegation.map(r => r.domain),
        error: 'No valid target agents mapped'
      });

      return {
        should_delegate: false,
        metadata: {
          requesting_agent: currentAgent,
          domains_requested: signals.requires_delegation.map(r => r.domain)
        }
      };
    }

    // ========================================================================
    // RULE 4: ✅ VALIDATE AGENT AVAILABILITY
    // Filter to only agents that are registered and available
    // ========================================================================
    rulesEvaluated.push('agent_availability_check');

    const availableTargets = requestedAgents.filter(agent =>
      this.availableAgents.has(agent)
    );

    const unavailableTargets = requestedAgents.filter(agent =>
      !this.availableAgents.has(agent)
    );

    // Log unavailable agents (but continue with available ones)
    if (unavailableTargets.length > 0) {
      log.warn('delegation.agents_unavailable', {
        requested: requestedAgents,
        available: availableTargets,
        unavailable: unavailableTargets,
        registered_agents: Array.from(this.availableAgents)
      });
    }

    // If no available agents, fail delegation
    if (availableTargets.length === 0) {
      log.error('delegation.no_available_agents', {
        requested: requestedAgents,
        available_agents: Array.from(this.availableAgents),
        requested_domains: signals.requires_delegation.map(r => r.domain)
      });

      return {
        should_delegate: false,
        metadata: {
          requesting_agent: currentAgent,
          domains_requested: signals.requires_delegation.map(r => r.domain),
          error: 'No requested specialists are available',
          unavailable_agents: unavailableTargets
        }
      };
    }

    // ========================================================================
    // DECISION: Delegate to available specialists only
    // ========================================================================

    log.event('delegation.decision_delegate', {
      current_agent: currentAgent,
      target_agents: availableTargets,
      domains: signals.requires_delegation.map(r => r.domain),
      request_count: signals.requires_delegation.length,
      unavailable_count: unavailableTargets.length
    });

    return {
      should_delegate: true,
      target_agents: availableTargets,
      delegation_requests: signals.requires_delegation,
      metadata: {
        requesting_agent: currentAgent,
        domains_requested: signals.requires_delegation.map(r => r.domain),
        unavailable_agents: unavailableTargets.length > 0 ? unavailableTargets : undefined
      }
    };
  }

  /**
   * Map delegation domains to target agent IDs
   *
   * TODO v35.0: Make this configuration-driven instead of hardcoded
   *
   * Current mapping:
   * - awards → awards-agent-v18
   * - extracurriculars → extracurriculars-agent-v18
   * - programs → summer-programs-agent-v18
   * - scholarships → scholarships-agent-v18
   *
   * @private
   */
  private mapDomainsToAgents(requests: DelegationRequest[]): string[] {
    const agentMap: Record<string, string> = {
      'awards': 'awards-agent-v18',
      'extracurriculars': 'extracurriculars-agent-v18',
      'programs': 'summer-programs-agent-v18',
      'scholarships': 'scholarships-agent-v18'
    };

    const targetAgents: string[] = [];
    const unmappedDomains: string[] = [];

    for (const request of requests) {
      const agentId = agentMap[request.domain];

      if (agentId) {
        // Deduplicate (same domain requested multiple times)
        if (!targetAgents.includes(agentId)) {
          targetAgents.push(agentId);

          log.event('delegation.domain_mapped', {
            domain: request.domain,
            target_agent: agentId,
            reason: request.reason
          });
        }
      } else {
        unmappedDomains.push(request.domain);

        log.error('delegation.unknown_domain', {
          domain: request.domain,
          available_domains: Object.keys(agentMap)
        });
      }
    }

    if (unmappedDomains.length > 0) {
      log.error('delegation.mapping_partial_failure', {
        unmapped_domains: unmappedDomains,
        mapped_agents: targetAgents
      });
    }

    return targetAgents;
  }

  /**
   * Get delegation map (for documentation/debugging)
   *
   * TODO v35.0: This will become the configuration schema
   */
  getDelegationMap(): Record<string, { agent_id: string; capabilities: string[] }> {
    return {
      'awards': {
        agent_id: 'awards-agent-v18',
        capabilities: ['Award discovery', 'Eligibility analysis', 'Application timeline']
      },
      'extracurriculars': {
        agent_id: 'extracurriculars-agent-v18',
        capabilities: ['EC discovery', 'Impact analysis', 'Portfolio optimization']
      },
      'programs': {
        agent_id: 'summer-programs-agent-v18',
        capabilities: ['Summer program discovery', 'Alignment analysis', 'Application support']
      },
      'scholarships': {
        agent_id: 'scholarships-agent-v18',
        capabilities: ['Scholarship discovery', 'Financial aid analysis', 'Application timeline']
      }
    };
  }

  /**
   * Validate delegation requests
   *
   * Check if delegation requests are well-formed
   * (Used for testing/debugging)
   */
  validateRequests(requests: DelegationRequest[]): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const validDomains = ['awards', 'extracurriculars', 'programs', 'scholarships'];

    for (const [index, request] of requests.entries()) {
      // Check domain
      if (!validDomains.includes(request.domain)) {
        errors.push(`Request ${index}: Invalid domain "${request.domain}". Must be one of: ${validDomains.join(', ')}`);
      }

      // Check reason
      if (!request.reason || request.reason.trim().length === 0) {
        errors.push(`Request ${index}: Reason is required`);
      }

      // Check context
      if (!request.context || typeof request.context !== 'object') {
        errors.push(`Request ${index}: Context must be an object`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

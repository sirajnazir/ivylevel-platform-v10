/**
 * Agent Delegator (Temporary Stub for v34 Migration)
 *
 * v34 NOTE: This is a compatibility stub.
 * Real delegation will be handled by DelegationDecisionEngine in v34 orchestrator.
 *
 * TODO: Remove after GamePlanAgent migrated to use signals instead of direct delegation
 */

import { FactStore } from '../facts/FactStore.js';

export interface DelegationResult {
  success: boolean;
  awards_data?: any;
  ecs_data?: any;
  error?: string;
}

export class AgentDelegator {
  private factStore: FactStore;

  constructor(factStore: FactStore) {
    this.factStore = factStore;
  }

  /**
   * Temporary stub - returns empty result
   * v34: Orchestrator will handle delegation via signals
   */
  async delegateToSubAgents(studentId: string, context: any): Promise<DelegationResult> {
    console.log('[AgentDelegator] STUB: Delegation not yet implemented in v34');
    console.log('[AgentDelegator] Use requires_delegation signal in agent response instead');

    return {
      success: false,
      error: 'Delegation handled by v34 orchestrator - use signals'
    };
  }
}

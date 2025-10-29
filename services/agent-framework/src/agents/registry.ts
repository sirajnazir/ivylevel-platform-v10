/**
 * Agent Registry - Central initialization for all agents
 *
 * Responsibilities:
 * - Initialize agents with dependencies (EventBus, Pool, FactStore)
 * - Register event handlers
 * - Provide singleton access to agents
 *
 * Updated: 2025-10-29 (v18.0 - Fact-First Architecture)
 */

import { Pool } from 'pg';
import { EventBus } from '../events/EventBus.js';
import { GamePlanAgent } from './v18/GamePlanAgentRefactored.js';
import { AssessmentAgent } from './v18/AssessmentAgentRefactored.js';
import { initializeFactStore } from '../facts/initializeFactStore.js';
import { FactStore } from '../facts/FactStore.js';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('agent-registry');

/**
 * Agent Registry
 * Manages agent lifecycle and dependencies
 */
export class AgentRegistry {
  private static instance: AgentRegistry | null = null;

  private gamePlanAgent: GamePlanAgent | null = null;
  private assessmentAgent: AssessmentAgent | null = null;
  private eventBus: EventBus | null = null;
  private pool: Pool | null = null;
  private factStore: FactStore | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  /**
   * Initialize all agents with dependencies
   * v18.0: Uses Fact-First Architecture with FactStore
   */
  async initialize(pool: Pool): Promise<void> {
    log.event('agent_registry.initialize_start', {});

    try {
      // Initialize dependencies
      this.pool = pool;
      this.eventBus = new EventBus(pool);

      // Initialize FactStore with all fact sources
      log.event('agent_registry.initialize_fact_store', {});
      this.factStore = initializeFactStore(pool);

      // Initialize GamePlanAgent v18 with FactStore
      this.gamePlanAgent = new GamePlanAgent(this.factStore);
      this.gamePlanAgent.initializeEventBus(this.eventBus, pool);

      // Initialize AssessmentAgent v18 with FactStore
      this.assessmentAgent = new AssessmentAgent(this.factStore);
      this.assessmentAgent.initializeEventBus(this.eventBus, pool);

      log.event('agent_registry.initialize_complete', {
        agents_initialized: ['GamePlanAgent-v18', 'AssessmentAgent-v18'],
        event_bus_ready: true,
        fact_store_ready: true,
        fact_sources_registered: this.factStore.getRegisteredCategories().length,
      });
    } catch (error) {
      log.error('agent_registry.initialize_error', {
        error: String(error),
      });
      throw error;
    }
  }

  /**
   * Get GamePlanAgent instance
   */
  getGamePlanAgent(): GamePlanAgent {
    if (!this.gamePlanAgent) {
      throw new Error('GamePlanAgent not initialized. Call initialize() first.');
    }
    return this.gamePlanAgent;
  }

  /**
   * Get AssessmentAgent instance
   */
  getAssessmentAgent(): AssessmentAgent {
    if (!this.assessmentAgent) {
      throw new Error('AssessmentAgent not initialized. Call initialize() first.');
    }
    return this.assessmentAgent;
  }

  /**
   * Get EventBus instance
   */
  getEventBus(): EventBus {
    if (!this.eventBus) {
      throw new Error('EventBus not initialized. Call initialize() first.');
    }
    return this.eventBus;
  }

  /**
   * Get FactStore instance
   */
  getFactStore(): FactStore {
    if (!this.factStore) {
      throw new Error('FactStore not initialized. Call initialize() first.');
    }
    return this.factStore;
  }

  /**
   * Emit event (convenience method)
   */
  async emitEvent(
    event_type: any,
    student_id: string,
    coach_id: string,
    payload: Record<string, any>
  ): Promise<number> {
    const eventBus = this.getEventBus();
    return await eventBus.emit({
      event_type,
      student_id,
      coach_id,
      payload,
    });
  }

  /**
   * Route query to appropriate agent
   * v18.0: Simple routing logic - routes queries based on intent
   */
  async routeQuery(params: {
    student_id: string;
    query: string;
    session_id: string;
  }): Promise<{
    response: string;
    agent_used: string;
    metadata?: any;
  }> {
    const { student_id, query, session_id } = params;

    log.event('agent_registry.route_query', {
      student_id,
      query: query.slice(0, 100),
      session_id,
    });

    const lowerQuery = query.toLowerCase();

    // Check for assessment queries
    const isAssessmentQuery =
      lowerQuery.includes('assessment') ||
      lowerQuery.includes('evaluate') ||
      lowerQuery.includes('strengths') ||
      lowerQuery.includes('weaknesses') ||
      lowerQuery.includes('profile') ||
      lowerQuery.includes('activities');

    if (isAssessmentQuery) {

      // Route to AssessmentAgent
      const assessmentAgent = this.getAssessmentAgent();
      const result = await assessmentAgent.handleQuery({
        entity_id: student_id,
        query,
        session_id,
      });

      return {
        response: result.response,
        agent_used: 'AssessmentAgent-v18',
        metadata: {
          ...result.metadata,
          facts_used_count: result.facts_used.length,
          validation_score: result.validation_score,
        },
      };
    }

    // Check for game plan queries
    const isGamePlanQuery =
      lowerQuery.includes('game plan') ||
      lowerQuery.includes('gameplan') ||
      lowerQuery.includes('roadmap') ||
      lowerQuery.includes('quarterly') ||
      lowerQuery.includes('strategy') ||
      lowerQuery.includes('timeline');

    if (isGamePlanQuery) {
      // Route to GamePlanAgent
      const gamePlanAgent = this.getGamePlanAgent();
      const result = await gamePlanAgent.handleGamePlanQuery({
        student_id,
        query,
        session_id,
      });

      return {
        response: result.response,
        agent_used: 'GamePlanAgent-v18',
        metadata: result.metadata,
      };
    }

    // Default fallback: return helpful message
    return {
      response: "I can help you with:\n• Game plan and strategic roadmap\n• Profile assessment and strengths\n\nTry asking: 'What is my game plan?' or 'Show me my assessment.'",
      agent_used: 'agent-registry-fallback',
      metadata: {
        intent: 'unknown',
        available_agents: ['GamePlanAgent-v18', 'AssessmentAgent-v18'],
      },
    };
  }
}

/**
 * Convenience function to get registry instance
 */
export function getAgentRegistry(): AgentRegistry {
  return AgentRegistry.getInstance();
}

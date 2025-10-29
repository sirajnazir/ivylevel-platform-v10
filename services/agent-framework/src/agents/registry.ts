/**
 * Agent Registry - Central initialization for all agents
 *
 * Responsibilities:
 * - Initialize agents with dependencies (EventBus, Pool)
 * - Register event handlers
 * - Provide singleton access to agents
 *
 * Created: 2025-10-29 (v18.0)
 */

import { Pool } from 'pg';
import { EventBus } from '../events/EventBus.js';
import { GamePlanAgent } from './v18/GamePlanAgent.js';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('agent-registry');

/**
 * Agent Registry
 * Manages agent lifecycle and dependencies
 */
export class AgentRegistry {
  private static instance: AgentRegistry | null = null;

  private gamePlanAgent: GamePlanAgent | null = null;
  private eventBus: EventBus | null = null;
  private pool: Pool | null = null;

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
   */
  async initialize(pool: Pool): Promise<void> {
    log.event('agent_registry.initialize_start', {});

    try {
      // Initialize EventBus
      this.pool = pool;
      this.eventBus = new EventBus(pool);

      // Initialize GamePlanAgent v18
      this.gamePlanAgent = new GamePlanAgent();
      this.gamePlanAgent.initializeEventBus(this.eventBus, pool);

      log.event('agent_registry.initialize_complete', {
        agents_initialized: ['GamePlanAgent-v18'],
        event_bus_ready: true,
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
   * Get EventBus instance
   */
  getEventBus(): EventBus {
    if (!this.eventBus) {
      throw new Error('EventBus not initialized. Call initialize() first.');
    }
    return this.eventBus;
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
}

/**
 * Convenience function to get registry instance
 */
export function getAgentRegistry(): AgentRegistry {
  return AgentRegistry.getInstance();
}

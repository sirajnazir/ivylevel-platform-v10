/**
 * AgentRegistry.ts
 * Central registry for all agents with routing capabilities
 * Created: 2025-10-16 (Phase 1, Week 3)
 * Updated: 2025-10-16 (Week 11 - Added Essay & Admissions agents)
 */

import type { RegisteredAgent, AgentCategory } from './types.js';
import { BaseAgent } from './BaseAgent.js';
import { GamePlanAgent } from '../agents/GamePlanAgent.js';
import { ExtracurricularsAgent } from '../agents/ExtracurricularsAgent.js';
import { AwardsAgent } from '../agents/AwardsAgent.js';
import { SummerProgramsAgent } from '../agents/SummerProgramsAgent.js';
import { CollegeListAgent } from '../agents/CollegeListAgent.js';
import { EssayAgent } from '../agents/EssayAgent.js';
import { AdmissionsAgent } from '../agents/AdmissionsAgent.js';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('agent-registry');

/**
 * AgentRegistry - Central registry and router for all agents
 *
 * Responsibilities:
 * - Register and manage agent instances
 * - Route queries to appropriate agent
 * - Handle multi-agent handoffs
 * - Track agent usage stats
 */
export class AgentRegistry {
  private agents: Map<string, RegisteredAgent> = new Map();

  constructor() {
    this.initializeAgents();
  }

  /**
   * Initialize all agents
   */
  private initializeAgents(): void {
    log.event('registry.init_start');

    // Create agent instances with debug logging
    const agentConstructors = [
      { name: 'GamePlanAgent', constructor: GamePlanAgent },
      { name: 'ExtracurricularsAgent', constructor: ExtracurricularsAgent },
      { name: 'AwardsAgent', constructor: AwardsAgent },
      { name: 'SummerProgramsAgent', constructor: SummerProgramsAgent },
      { name: 'CollegeListAgent', constructor: CollegeListAgent },
      { name: 'EssayAgent', constructor: EssayAgent },           // Week 11: Essay strategy
      { name: 'AdmissionsAgent', constructor: AdmissionsAgent }, // Week 11: AO perspectives
    ];

    const agents: BaseAgent[] = [];
    for (const { name, constructor } of agentConstructors) {
      try {
        log.event('registry.agent_constructing', { agent_name: name });
        const agent = new constructor();
        agents.push(agent);
        log.event('registry.agent_constructed', {
          agent_name: name,
          agent_id: agent.getManifest().agent_id
        });
      } catch (error: any) {
        log.error('registry.agent_construction_error', {
          agent_name: name,
          error: error.message,
          stack: error.stack
        });
      }
    }

    // Register each agent
    for (const agent of agents) {
      try {
        const manifest = agent.getManifest();
        this.agents.set(manifest.agent_id, {
          manifest,
          instance: agent,
          status: 'active',
          last_used: new Date(),
          request_count: 0,
        });

        log.event('registry.agent_registered', {
          agent_id: manifest.agent_id,
          category: manifest.category,
          tools_count: manifest.tools.length,
        });
      } catch (error: any) {
        log.error('registry.agent_registration_error', {
          error: error.message,
          stack: error.stack
        });
      }
    }

    log.event('registry.init_complete', {
      agents_count: this.agents.size,
      agent_ids: Array.from(this.agents.keys())
    });
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): BaseAgent | null {
    const registered = this.agents.get(agentId);

    if (!registered) {
      log.event('registry.agent_not_found', { agent_id: agentId });
      return null;
    }

    if (registered.status !== 'active') {
      log.event('registry.agent_inactive', {
        agent_id: agentId,
        status: registered.status,
      });
      return null;
    }

    // Update usage stats
    registered.last_used = new Date();
    registered.request_count++;

    return registered.instance;
  }

  /**
   * Get agent by category
   */
  getAgentByCategory(category: AgentCategory): BaseAgent | null {
    for (const registered of this.agents.values()) {
      if (registered.manifest.category === category && registered.status === 'active') {
        registered.last_used = new Date();
        registered.request_count++;
        return registered.instance;
      }
    }

    return null;
  }

  /**
   * Route query to appropriate agent based on intent
   * Simple keyword-based routing (can be enhanced with LLM later)
   */
  routeQuery(query: string): BaseAgent {
    const queryLower = query.toLowerCase();

    log.event('registry.route_start', { query_preview: query.substring(0, 100) });

    // Check each agent's intent patterns
    for (const registered of this.agents.values()) {
      if (registered.status !== 'active') continue;

      for (const intent of registered.manifest.intents) {
        for (const pattern of intent.patterns) {
          if (queryLower.includes(pattern.toLowerCase())) {
            log.event('registry.route_match', {
              agent_id: registered.manifest.agent_id,
              matched_pattern: pattern,
              intent_id: intent.intent_id,
            });

            registered.last_used = new Date();
            registered.request_count++;

            return registered.instance;
          }
        }
      }
    }

    // Default to GamePlanAgent if no match
    log.event('registry.route_default', { defaulted_to: 'gameplan-agent' });

    const gamePlan = this.agents.get('gameplan-agent');
    if (gamePlan) {
      gamePlan.last_used = new Date();
      gamePlan.request_count++;
      return gamePlan.instance;
    }

    // Fallback (should never happen)
    throw new Error('No agents available');
  }

  /**
   * Get all active agents
   */
  getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values())
      .filter((r) => r.status === 'active')
      .map((r) => r.instance);
  }

  /**
   * Get agent statistics
   */
  getStats(): Record<string, any> {
    const stats: Record<string, any> = {
      total_agents: this.agents.size,
      active_agents: 0,
      agents: [],
    };

    for (const [agentId, registered] of this.agents.entries()) {
      if (registered.status === 'active') {
        stats.active_agents++;
      }

      stats.agents.push({
        agent_id: agentId,
        category: registered.manifest.category,
        status: registered.status,
        request_count: registered.request_count,
        last_used: registered.last_used,
      });
    }

    return stats;
  }

  /**
   * Deactivate an agent (for maintenance)
   */
  deactivateAgent(agentId: string): boolean {
    const registered = this.agents.get(agentId);

    if (!registered) {
      return false;
    }

    registered.status = 'inactive';
    log.event('registry.agent_deactivated', { agent_id: agentId });

    return true;
  }

  /**
   * Reactivate an agent
   */
  reactivateAgent(agentId: string): boolean {
    const registered = this.agents.get(agentId);

    if (!registered) {
      return false;
    }

    registered.status = 'active';
    log.event('registry.agent_reactivated', { agent_id: agentId });

    return true;
  }

  /**
   * Check if agent can handle query (based on intents)
   */
  canHandleQuery(agentId: string, query: string): boolean {
    const registered = this.agents.get(agentId);

    if (!registered || registered.status !== 'active') {
      return false;
    }

    const queryLower = query.toLowerCase();

    for (const intent of registered.manifest.intents) {
      for (const pattern of intent.patterns) {
        if (queryLower.includes(pattern.toLowerCase())) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get recommended agent handoff
   * Used for multi-agent routing
   */
  getHandoffRecommendation(fromAgentId: string, query: string): string | null {
    const fromAgent = this.agents.get(fromAgentId);

    if (!fromAgent) {
      return null;
    }

    // Check handoff targets
    const handoffTargets = fromAgent.manifest.handoffs || [];

    for (const targetId of handoffTargets) {
      if (this.canHandleQuery(targetId, query)) {
        log.event('registry.handoff_recommended', {
          from_agent: fromAgentId,
          to_agent: targetId,
          query_preview: query.substring(0, 100),
        });

        return targetId;
      }
    }

    return null;
  }
}

// Singleton instance
export const agentRegistry = new AgentRegistry();

/**
 * Agent Registry - Central initialization for all agents
 *
 * Responsibilities:
 * - Initialize agents with dependencies (EventBus, Pool, FactStore)
 * - Register event handlers
 * - Provide singleton access to agents
 * - Initialize IntelligenceRegistry with all intelligence types
 *
 * Updated: 2025-10-29 (v18.1 - Intelligence Types Architecture)
 */

import { Pool } from 'pg';
import { EventBus } from '../events/EventBus.js';
import { GamePlanAgent } from './v18/GamePlanAgentRefactored.js';
import { AssessmentAgent } from './v18/AssessmentAgentRefactored.js';
import { ExtracurricularsAgentRefactored } from './v18/ExtracurricularsAgentRefactored.js';
import { AwardsAgentRefactored } from './v18/AwardsAgentRefactored.js';
import { SummerProgramsAgentRefactored } from './v18/SummerProgramsAgentRefactored.js';
import { ExecutionAgent } from './v18/ExecutionAgent.js';
import { initializeFactStore } from '../facts/initializeFactStore.js';
import { FactStore } from '../facts/FactStore.js';
import { IntelligenceRegistry } from '../intelligence/IntelligenceRegistry.js';
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
  private extracurricularsAgent: ExtracurricularsAgentRefactored | null = null;
  private awardsAgent: AwardsAgentRefactored | null = null;
  private summerProgramsAgent: SummerProgramsAgentRefactored | null = null;
  private executionAgent: ExecutionAgent | null = null;
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
   * v18.1: Uses Fact-First Architecture with FactStore + Intelligence Types
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

      // Initialize IntelligenceRegistry with all intelligence types
      log.event('agent_registry.initialize_intelligence_registry', {});
      IntelligenceRegistry.initialize();
      log.event('agent_registry.intelligence_registry_ready', {
        intelligence_types_count: IntelligenceRegistry.count(),
        universal_types: IntelligenceRegistry.getByCategory('UNIVERSAL').length,
        domain_types: IntelligenceRegistry.getByCategory('DOMAIN_SPECIFIC').length,
      });

      // Initialize GamePlanAgent v18 with FactStore
      this.gamePlanAgent = new GamePlanAgent(this.factStore);
      // GamePlanAgent uses old BaseAgent pattern with EventBus
      if (typeof (this.gamePlanAgent as any).initializeEventBus === 'function') {
        (this.gamePlanAgent as any).initializeEventBus(this.eventBus, pool);
      }

      // Initialize AssessmentAgent v18 with FactStore
      this.assessmentAgent = new AssessmentAgent(this.factStore);
      // AssessmentAgent uses old BaseAgent pattern with EventBus
      if (typeof (this.assessmentAgent as any).initializeEventBus === 'function') {
        (this.assessmentAgent as any).initializeEventBus(this.eventBus, pool);
      }

      // Initialize ExtracurricularsAgent v18 with FactStore
      this.extracurricularsAgent = new ExtracurricularsAgentRefactored(this.factStore);
      // ExtracurricularsAgent uses new fact-first BaseAgent (no EventBus)

      // Initialize AwardsAgent v18.1 with FactStore
      log.event('agent_registry.initialize_awards_agent', {});
      this.awardsAgent = new AwardsAgentRefactored(this.factStore);
      // AwardsAgent uses new BaseAgentWithIntelligence (no EventBus)
      log.event('agent_registry.awards_agent_ready', {
        intelligence_types_loaded: this.awardsAgent ? 3 : 0, // TYPE-020, TYPE-023, TYPE-027
      });

      // Initialize SummerProgramsAgent v19.0 with FactStore (NEW)
      log.event('agent_registry.initialize_summer_programs_agent', {});
      this.summerProgramsAgent = new SummerProgramsAgentRefactored(this.factStore);
      // SummerProgramsAgent uses new BaseAgentWithIntelligence (no EventBus)
      log.event('agent_registry.summer_programs_agent_ready', {
        intelligence_types_loaded: this.summerProgramsAgent ? 3 : 0, // TYPE-020, TYPE-028, TYPE-029, TYPE-030
      });

      // Initialize ExecutionAgent v20.0 with FactStore (NEW)
      log.event('agent_registry.initialize_execution_agent', {});
      this.executionAgent = new ExecutionAgent(this.factStore);
      // ExecutionAgent uses new BaseAgentWithIntelligence (no EventBus)
      log.event('agent_registry.execution_agent_ready', {
        intelligence_types_loaded: this.executionAgent ? 14 : 0, // TYPE-020, TYPE-049, TYPE-050, TYPE-051-063
        complete_types: 2, // TYPE-049, TYPE-050
        stub_types: 12, // TYPE-051-063
      });

      log.event('agent_registry.initialize_complete', {
        agents_initialized: [
          'GamePlanAgent-v18',
          'AssessmentAgent-v18',
          'ExtracurricularsAgent-v18',
          'AwardsAgent-v18.1',
          'SummerProgramsAgent-v19.0',
          'ExecutionAgent-v20.0',
        ],
        event_bus_ready: true,
        fact_store_ready: true,
        intelligence_registry_ready: true,
        fact_sources_registered: this.factStore.getRegisteredCategories().length,
        intelligence_types_registered: IntelligenceRegistry.count(),
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
   * Get ExtracurricularsAgent instance
   */
  getExtracurricularsAgent(): ExtracurricularsAgentRefactored {
    if (!this.extracurricularsAgent) {
      throw new Error('ExtracurricularsAgent not initialized. Call initialize() first.');
    }
    return this.extracurricularsAgent;
  }

  /**
   * Get AwardsAgent instance
   */
  getAwardsAgent(): AwardsAgentRefactored {
    if (!this.awardsAgent) {
      throw new Error('AwardsAgent not initialized. Call initialize() first.');
    }
    return this.awardsAgent;
  }

  /**
   * Get SummerProgramsAgent instance
   */
  getSummerProgramsAgent(): SummerProgramsAgentRefactored {
    if (!this.summerProgramsAgent) {
      throw new Error('SummerProgramsAgent not initialized. Call initialize() first.');
    }
    return this.summerProgramsAgent;
  }

  /**
   * Get ExecutionAgent instance
   */
  getExecutionAgent(): ExecutionAgent {
    if (!this.executionAgent) {
      throw new Error('ExecutionAgent not initialized. Call initialize() first.');
    }
    return this.executionAgent;
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
   * v18.1: Routes queries based on intent with Awards Agent support
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

    // Check for awards queries (highest priority for award-specific terms)
    const isAwardsQuery =
      lowerQuery.includes('award') ||
      lowerQuery.includes('competition') ||
      lowerQuery.includes('honor') ||
      lowerQuery.includes('recognition') ||
      lowerQuery.includes('win') ||
      lowerQuery.includes('ncwit') ||
      lowerQuery.includes('congressional app') ||
      lowerQuery.includes('scholastic') ||
      lowerQuery.includes('quick win') ||
      lowerQuery.includes('momentum') ||
      lowerQuery.includes('what awards');

    if (isAwardsQuery) {
      // Route to AwardsAgent
      const awardsAgent = this.getAwardsAgent();
      const result = await awardsAgent.handleQuery({
        entity_id: student_id,
        query,
        session_id,
      });

      return {
        response: result.response,
        agent_used: 'AwardsAgent-v18.1',
        metadata: {
          ...result.metadata,
          facts_used_count: result.facts_used.length,
          validation_score: result.validation_score,
          intelligence_triggered: result.triggered_intelligence || [],
        },
      };
    }

    // Check for execution queries (v20.0 - NEW)
    const isExecutionQuery =
      lowerQuery.includes('this week') ||
      lowerQuery.includes('weekly plan') ||
      lowerQuery.includes('weekly action') ||
      lowerQuery.includes('execution') ||
      lowerQuery.includes('what should i do') ||
      lowerQuery.includes('what to do') ||
      lowerQuery.includes('next steps') ||
      lowerQuery.includes('getting things done') ||
      lowerQuery.includes('gsd') ||
      lowerQuery.includes('progress') ||
      lowerQuery.includes('momentum') ||
      lowerQuery.includes('outcome') ||
      lowerQuery.includes('task') ||
      lowerQuery.includes('action item') ||
      lowerQuery.includes('ladder') ||
      lowerQuery.includes('where am i');

    if (isExecutionQuery) {
      // Route to ExecutionAgent
      const executionAgent = this.getExecutionAgent();
      const result = await executionAgent.handleQuery({
        entity_id: student_id,
        query,
        session_id,
      });

      return {
        response: result.response,
        agent_used: 'ExecutionAgent-v20.0',
        metadata: {
          ...result.metadata,
          facts_used_count: result.facts_used.length,
          validation_score: result.validation_score,
          intelligence_triggered: result.triggered_intelligence || [],
        },
      };
    }

    // Check for summer programs queries (v19.0)
    const isSummerProgramsQuery =
      lowerQuery.includes('summer program') ||
      lowerQuery.includes('summer course') ||
      lowerQuery.includes('summer opportunity') ||
      lowerQuery.includes('summer research') ||
      lowerQuery.includes('summer plan') ||
      lowerQuery.includes('summer activit') ||
      lowerQuery.includes('program recommend') ||
      lowerQuery.includes('which program') ||
      lowerQuery.includes('what program') ||
      lowerQuery.includes('mit launch') ||
      lowerQuery.includes('rsi') ||
      lowerQuery.includes('columbia science') ||
      lowerQuery.includes('garcia') ||
      lowerQuery.includes('sstp') ||
      lowerQuery.includes('yygs') ||
      lowerQuery.includes('tasp');

    if (isSummerProgramsQuery) {
      // Route to SummerProgramsAgent
      const summerProgramsAgent = this.getSummerProgramsAgent();
      const result = await summerProgramsAgent.handleQuery({
        entity_id: student_id,
        query,
        session_id,
      });

      return {
        response: result.response,
        agent_used: 'SummerProgramsAgent-v19.0',
        metadata: {
          ...result.metadata,
          facts_used_count: result.facts_used.length,
          validation_score: result.validation_score,
          intelligence_triggered: result.triggered_intelligence || [],
        },
      };
    }

    // Check for extracurriculars queries (high priority for EC-specific terms)
    const isExtracurricularsQuery =
      lowerQuery.includes('extracurricular') ||
      lowerQuery.includes('activities list') ||
      lowerQuery.includes('ec portfolio') ||
      lowerQuery.includes('cookie cutter') ||
      lowerQuery.includes('narrative alignment') ||
      lowerQuery.includes('tier classification') ||
      lowerQuery.includes('improve my activities');

    if (isExtracurricularsQuery) {
      // Route to ExtracurricularsAgent
      const ecAgent = this.getExtracurricularsAgent();
      const result = await ecAgent.handleQuery({
        entity_id: student_id,
        query,
        session_id,
      });

      return {
        response: result.response,
        agent_used: 'ExtracurricularsAgent-v18',
        metadata: {
          ...result.metadata,
          facts_used_count: result.facts_used.length,
          validation_score: result.validation_score,
        },
      };
    }

    // Check for assessment queries
    const isAssessmentQuery =
      lowerQuery.includes('assessment') ||
      lowerQuery.includes('evaluate') ||
      lowerQuery.includes('strengths') ||
      lowerQuery.includes('weaknesses') ||
      lowerQuery.includes('profile');

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
      response: "I can help you with:\n• Weekly execution and action planning (NEW in v20.0)\n• Game plan and strategic roadmap\n• Profile assessment and strengths\n• Extracurriculars portfolio optimization\n• Award recommendations and quick wins strategy\n• Summer program selection and application strategy\n\nTry asking: 'What should I do this week?', 'What is my game plan?', 'Show me my assessment', 'How can I improve my extracurriculars?', 'What awards should I apply to?', or 'What summer programs should I apply to?'",
      agent_used: 'agent-registry-fallback',
      metadata: {
        intent: 'unknown',
        available_agents: [
          'ExecutionAgent-v20.0',
          'GamePlanAgent-v18',
          'AssessmentAgent-v18',
          'ExtracurricularsAgent-v18',
          'AwardsAgent-v18.1',
          'SummerProgramsAgent-v19.0',
        ],
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

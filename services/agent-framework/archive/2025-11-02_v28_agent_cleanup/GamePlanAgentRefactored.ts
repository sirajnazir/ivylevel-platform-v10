/**
 * GamePlanAgent v18.0 - Refactored to use Universal Fact-First Primitives
 *
 * EXTENDS: BaseAgent (enforces fact-first behavior)
 * USES: FactStore for all data access (no direct DB queries)
 * VALIDATES: All responses automatically validated against facts
 *
 * Responsibilities:
 * - Strategic game plan creation and adaptation
 * - Quarterly review orchestration
 * - Multi-path convergence for undecided students
 * - Event-driven plan revisions
 */

import { Pool } from 'pg';
import { BaseAgent } from '../BaseAgent.js';
import { FactStore } from '../../facts/FactStore.js';
import { FactSet } from '../../facts/FactSet.js';
import { FactCategory, AgentQuery, AgentResponse } from '../../facts/types.js';
import { EventBus, LifecycleEvent } from '../../events/EventBus.js';
import { createLogger } from '../../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('gameplan-agent-v18');

export class GamePlanAgent extends BaseAgent {
  private eventBus: EventBus | null = null;
  private pool: Pool | null = null;

  constructor(factStore: FactStore) {
    super('GamePlanAgent-v18', factStore);
  }

  /**
   * REQUIRED: Declare which facts this agent needs (ENFORCED by BaseAgent)
   */
  protected getRequiredFacts(): FactCategory[] {
    return [
      FactCategory.ASSESSMENT_DATA,  // narrative, weak_spots, strengths, target_schools
      FactCategory.ACTIVITY_DATA,    // extracurricular activities
    ];
  }

  /**
   * REQUIRED: Generate response using ONLY provided facts (ENFORCED by BaseAgent)
   * Cannot query database directly - must use facts from FactSet
   */
  protected async generateResponse(query: AgentQuery, facts: FactSet): Promise<string> {
    log.event('gameplan_agent.generate_response_start', {
      entity_id: query.entity_id,
      facts_count: facts.count(),
    });

    // Extract facts using type-safe FactSet methods
    const narrative = facts.getValueByType('unique_narrative');
    const spikes = facts.getValueByType('potential_spikes') || [];
    const weakSpotsP0 = facts
      .getFactsByType('weak_spot')
      .filter((f) => f.value.priority === 'P0')
      .map((f) => f.value);
    const strengths = facts.getFactsByType('standout_strength').map((f) => f.value);
    const activities = facts.getFactsByType('extracurricular_activity').map((f) => f.value);
    const targetSchools = facts.getValueByType('target_schools') || [];

    // Build response using facts
    let response = '**Your Strategic Game Plan**\n\n';

    // 1. Unique Narrative
    if (narrative) {
      response += `**Who You Are:**\n${narrative}\n\n`;
    }

    // 2. Potential Spikes
    if (spikes.length > 0) {
      response += `**Your Potential Spikes:**\n`;
      spikes.forEach((spike: string) => {
        response += `• ${spike}\n`;
      });
      response += '\n';
    }

    // 3. P0 Priorities
    if (weakSpotsP0.length > 0) {
      response += `**🎯 Top Priorities (P0 - Must Address):**\n`;
      weakSpotsP0.forEach((ws) => {
        response += `• **${ws.title}**: ${ws.status || ws.description}\n`;
      });
      response += '\n';
    }

    // 4. Standout Strengths (top 3)
    if (strengths.length > 0) {
      const topStrengths = strengths.slice(0, 3);
      response += `**💪 Your Standout Strengths:**\n`;
      topStrengths.forEach((strength) => {
        response += `• **${strength.title}**: ${strength.description}\n`;
      });
      response += '\n';
    }

    // 5. Key Activities (top 5)
    if (activities.length > 0) {
      const topActivities = activities.slice(0, 5);
      response += `**📊 Your Key Activities:**\n`;
      topActivities.forEach((activity) => {
        response += `• **${activity.title}** (${activity.role})`;
        if (activity.impact) {
          response += ` - ${activity.impact}`;
        }
        response += '\n';
      });
      response += '\n';
    }

    // 6. Target Schools
    if (targetSchools.length > 0) {
      response += `**🎓 Target Schools:**\n`;
      targetSchools.forEach((school: any) => {
        response += `• ${school.name || school}`;
        if (school.tier) {
          response += ` (${school.tier})`;
        }
        response += '\n';
      });
      response += '\n';
    }

    response += '---\n';
    response += '💡 *This game plan is grounded in your actual assessment data and adapts as you progress.*';

    log.event('gameplan_agent.generate_response_complete', {
      entity_id: query.entity_id,
      response_length: response.length,
    });

    return response;
  }

  /**
   * OVERRIDE: Custom insufficient data message for GamePlanAgent
   */
  protected generateInsufficientDataResponse(facts: FactSet): AgentResponse {
    const missing = facts.getMissingCategories(this.getRequiredFacts());

    log.event('gameplan_agent.insufficient_data', {
      missing_categories: missing,
    });

    let response = "Your game plan is being built. ";

    if (missing.includes(FactCategory.ASSESSMENT_DATA)) {
      response += "Complete your assessment first, and I'll create a strategic 2-year roadmap for you!";
    } else {
      response += `Missing data: ${missing.join(', ')}`;
    }

    return {
      response,
      facts_used: [],
      validation_score: 1.0,
      provenance: [],
      metadata: {
        agent_id: this.agentId,
        missing_categories: missing,
      },
    };
  }

  /**
   * Initialize with EventBus for event-driven triggers
   * NOTE: This is separate from BaseAgent - event handling is GamePlanAgent-specific
   */
  initializeEventBus(eventBus: EventBus, pool: Pool): void {
    this.eventBus = eventBus;
    this.pool = pool;

    // Subscribe to lifecycle events
    this.eventBus.on('assessment_completed', this.handleAssessmentCompleted.bind(this));
    this.eventBus.on('milestone_achieved', this.handleMilestoneAchieved.bind(this));

    log.event('gameplan_agent.event_bus_initialized', {
      subscribed_events: ['assessment_completed', 'milestone_achieved'],
    });
  }

  /**
   * Event Handler: Assessment completed
   * Trigger: AssessmentAgent completes 27-layer assessment
   * Action: Create initial strategic game plan
   */
  private async handleAssessmentCompleted(event: LifecycleEvent): Promise<void> {
    log.event('gameplan_agent.assessment_completed_received', {
      student_id: event.student_id,
      payload: event.payload,
    });

    try {
      // Use FactStore to get assessment data
      const query: AgentQuery = {
        entity_id: event.student_id,
        query: 'Create initial game plan',
        session_id: `event-${event.event_id}`,
      };

      // BaseAgent.handleQuery() will load facts and generate plan
      const response = await this.handleQuery(query);

      log.event('gameplan_agent.initial_plan_created', {
        student_id: event.student_id,
        facts_used: response.facts_used.length,
        validation_score: response.validation_score,
      });
    } catch (error) {
      log.error('gameplan_agent.assessment_completed_error', {
        student_id: event.student_id,
        error: String(error),
      });
    }
  }

  /**
   * Event Handler: Milestone achieved
   * Trigger: Student achieves significant milestone (award won, program accepted, etc.)
   * Action: Evaluate if game plan needs revision
   */
  private async handleMilestoneAchieved(event: LifecycleEvent): Promise<void> {
    log.event('gameplan_agent.milestone_achieved_received', {
      student_id: event.student_id,
      milestone: event.payload.milestone_type,
    });

    // TODO: Implement milestone-driven plan revision
    // Use FactStore to check current plan vs new milestone
    // Determine if plan needs updating
  }

  /**
   * Legacy compatibility: handleGamePlanQuery
   * Wraps BaseAgent.handleQuery() for backward compatibility
   */
  async handleGamePlanQuery(params: {
    student_id: string;
    query: string;
    session_id: string;
  }): Promise<{
    response: string;
    metadata?: any;
  }> {
    const agentQuery: AgentQuery = {
      entity_id: params.student_id,
      query: params.query,
      session_id: params.session_id,
    };

    const agentResponse = await this.handleQuery(agentQuery);

    return {
      response: agentResponse.response,
      metadata: {
        ...agentResponse.metadata,
        facts_used_count: agentResponse.facts_used.length,
        validation_score: agentResponse.validation_score,
      },
    };
  }
}

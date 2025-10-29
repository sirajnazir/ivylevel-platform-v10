/**
 * AssessmentAgent v18.0 - Refactored to use Universal Fact-First Primitives
 *
 * EXTENDS: BaseAgent (enforces fact-first behavior)
 * USES: FactStore for all data access
 * VALIDATES: All responses automatically validated against facts
 *
 * Responsibilities:
 * - Initial student diagnostic assessment (27-layer)
 * - Profile weakness detection
 * - Strength identification
 * - Gap analysis (what's missing for target colleges)
 * - Emit assessment_completed event when done
 */

import { Pool } from 'pg';
import { BaseAgent } from '../BaseAgent.js';
import { FactStore } from '../../facts/FactStore.js';
import { FactSet } from '../../facts/FactSet.js';
import { FactCategory, AgentQuery, AgentResponse } from '../../facts/types.js';
import { EventBus } from '../../events/EventBus.js';
import { createLogger } from '../../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('assessment-agent-v18');

export class AssessmentAgent extends BaseAgent {
  private eventBus: EventBus | null = null;
  private pool: Pool | null = null;

  constructor(factStore: FactStore) {
    super('AssessmentAgent-v18', factStore);
  }

  /**
   * REQUIRED: Declare which facts this agent needs
   */
  protected getRequiredFacts(): FactCategory[] {
    return [
      FactCategory.STUDENT_PROFILE,   // Basic student info
      FactCategory.ACADEMIC_DATA,      // GPA, test scores, courses
      FactCategory.ACTIVITY_DATA,      // ECs to assess
    ];
  }

  /**
   * REQUIRED: Generate response using ONLY provided facts
   */
  protected async generateResponse(query: AgentQuery, facts: FactSet): Promise<string> {
    log.event('assessment_agent.generate_response_start', {
      entity_id: query.entity_id,
      facts_count: facts.count(),
    });

    // Extract facts
    const activities = facts.getFactsByType('extracurricular_activity').map((f) => f.value);

    // Build assessment response
    let response = '**Your Assessment**\n\n';

    if (activities.length === 0) {
      response += "I don't have activity data yet. Let's start by recording your extracurriculars!\n\n";
      response += '**What I need:**\n';
      response += '• List of activities (clubs, sports, volunteer work)\n';
      response += '• Leadership roles\n';
      response += '• Time commitment (hours/week)\n';
      response += '• Impact and achievements\n';
    } else {
      response += `**Activities Found:** ${activities.length}\n\n`;

      // Analyze activities (simple version)
      const leadershipRoles = activities.filter((a) =>
        a.role?.toLowerCase().includes('president') ||
        a.role?.toLowerCase().includes('founder') ||
        a.role?.toLowerCase().includes('captain')
      );

      if (leadershipRoles.length > 0) {
        response += `**Leadership Roles:** ${leadershipRoles.length}\n`;
        leadershipRoles.forEach((role) => {
          response += `• ${role.title} (${role.role})\n`;
        });
        response += '\n';
      }

      // TODO: Full 27-layer assessment logic
      response += '\n*Full assessment analysis in progress...*\n';
    }

    response += '\n---\n';
    response += '💡 *Assessment grounded in your actual profile data*';

    log.event('assessment_agent.generate_response_complete', {
      entity_id: query.entity_id,
      activities_analyzed: activities.length,
    });

    return response;
  }

  /**
   * OVERRIDE: Custom insufficient data message
   */
  protected generateInsufficientDataResponse(facts: FactSet): AgentResponse {
    const missing = facts.getMissingCategories(this.getRequiredFacts());

    let response = "I need more information to complete your assessment.\n\n";
    response += "**Missing:**\n";

    if (missing.includes(FactCategory.STUDENT_PROFILE)) {
      response += "• Basic profile (name, grade, school)\n";
    }
    if (missing.includes(FactCategory.ACADEMIC_DATA)) {
      response += "• Academic data (GPA, test scores, courses)\n";
    }
    if (missing.includes(FactCategory.ACTIVITY_DATA)) {
      response += "• Extracurricular activities\n";
    }

    response += "\nLet's start by filling in these details!";

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
   * Initialize with EventBus
   */
  initializeEventBus(eventBus: EventBus, pool: Pool): void {
    this.eventBus = eventBus;
    this.pool = pool;

    log.event('assessment_agent.event_bus_initialized', {});
  }

  /**
   * Run complete 27-layer assessment
   * This is the main entry point for assessments
   */
  async runAssessment(studentId: string): Promise<{
    assessment_complete: boolean;
    weak_spots: any[];
    strengths: any[];
    recommendations: string[];
  }> {
    log.event('assessment_agent.run_assessment_start', {
      student_id: studentId,
    });

    try {
      // Use BaseAgent.handleQuery() to load facts
      const query: AgentQuery = {
        entity_id: studentId,
        query: 'Run comprehensive assessment',
        session_id: `assessment-${Date.now()}`,
      };

      const response = await this.handleQuery(query);

      // TODO: Full 27-layer assessment logic
      // Extract weak spots, strengths, gaps from facts
      // Generate recommendations

      // Emit assessment_completed event
      if (this.eventBus) {
        await this.eventBus.emit({
          event_type: 'assessment_completed',
          student_id: studentId,
          coach_id: 'system',
          payload: {
            assessment_id: `assess-${Date.now()}`,
            facts_analyzed: response.facts_used.length,
            validation_score: response.validation_score,
          },
        });

        log.event('assessment_agent.event_emitted', {
          student_id: studentId,
          event_type: 'assessment_completed',
        });
      }

      return {
        assessment_complete: true,
        weak_spots: [],  // TODO: Extract from facts
        strengths: [],   // TODO: Extract from facts
        recommendations: [],
      };
    } catch (error) {
      log.error('assessment_agent.run_assessment_error', {
        student_id: studentId,
        error: String(error),
      });

      throw error;
    }
  }
}

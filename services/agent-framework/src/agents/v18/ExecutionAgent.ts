/**
 * ExecutionAgent (v20.0 Foundation)
 * Jenny's Digital Twin - Master Orchestrator for Weekly Execution
 *
 * Purpose: Drives tactical execution across all college prep domains using
 * Jenny's 15+ execution frameworks extracted from 93-week coaching sessions.
 *
 * Architecture: Extends BaseAgentWithIntelligence, composes 14 domain-specific
 * intelligence types (2 complete + 12 stubs in v20.0, full expansion in v20.1-v20.5)
 *
 * Focus: Getting Shit Done (GSD) - converts plans into outcomes through
 * systematic proof generation and momentum tracking.
 */

import { BaseAgentWithIntelligence } from './BaseAgentWithIntelligence.js';
import { AgentQuery, AgentResponse } from '../types.js';
import { FactStore, FactCategory, FactSet } from '../../facts/FactStore.js';
import { IntelligenceType, IntelligenceResult, IntelligenceRegistry } from '../../intelligence/IntelligenceRegistry.js';

export class ExecutionAgent extends BaseAgentWithIntelligence {
  protected agentDomain = 'execution' as const;

  /**
   * Domain-specific intelligence types for ExecutionAgent
   *
   * v20.0 Status:
   * - TYPE-049 ✅ Complete: Execution Ladder Navigation
   * - TYPE-050 ✅ Complete: Outcome Engineering
   * - TYPE-051-063 🚧 Stubs: To be expanded in v20.1-v20.5
   */
  protected DOMAIN_INTELLIGENCE: IntelligenceType[] = [];

  constructor(factStore: FactStore) {
    super('execution-agent-v20', factStore);

    // Load domain-specific intelligence types from registry
    this.DOMAIN_INTELLIGENCE = [
      IntelligenceRegistry.get('TYPE-049'), // Execution Ladder Navigation ✅
      IntelligenceRegistry.get('TYPE-050'), // Outcome Engineering ✅
      IntelligenceRegistry.get('TYPE-051'), // Task Decomposition 🚧
      IntelligenceRegistry.get('TYPE-052'), // Portfolio Operating Cadence 🚧
      IntelligenceRegistry.get('TYPE-053'), // Time Architecture 🚧
      IntelligenceRegistry.get('TYPE-054'), // Metric Ladder 🚧
      IntelligenceRegistry.get('TYPE-055'), // Blocking Detection 🚧
      IntelligenceRegistry.get('TYPE-056'), // LoR Engineering 🚧
      IntelligenceRegistry.get('TYPE-057'), // Proof Engineering 🚧
      IntelligenceRegistry.get('TYPE-058'), // Application Mastery Rail 🚧
      IntelligenceRegistry.get('TYPE-059'), // Narrative Harmonization 🚧
      IntelligenceRegistry.get('TYPE-060'), // Seasonal Energy Allocation 🚧
      IntelligenceRegistry.get('TYPE-061'), // Multi-Agent Delegation 🚧
      IntelligenceRegistry.get('TYPE-062'), // Qualitative Transformation 🚧
      IntelligenceRegistry.get('TYPE-063'), // Progress Velocity 🚧
      // TYPE-020 (Opportunity Pipeline) inherited as UNIVERSAL
    ];
  }

  /**
   * Define required fact categories for ExecutionAgent
   */
  protected getRequiredFacts(): FactCategory[] {
    return [
      FactCategory.STUDENT_PROFILE,   // Name, grade, school, interests
      FactCategory.ACTIVITY_DATA,     // ECs, awards, programs, projects
      FactCategory.ASSESSMENT_DATA,   // Strengths, weaknesses, capacities
      FactCategory.WEEKLY_PROGRESS,   // Weekly execution snapshots (NEW)
      FactCategory.SESSION_HISTORY,   // Recent coaching conversations (NEW)
    ];
  }

  /**
   * Synthesize response from multiple intelligence results
   *
   * Priority Logic (v20.0):
   * 1. Execution Ladder Position (TYPE-049) - Where are we on the journey?
   * 2. Outcome Engineering (TYPE-050) - What should we focus on this week?
   * 3. Stub intelligence results (informational only in v20.0)
   */
  protected async synthesizeResponse(
    intelligenceResults: IntelligenceResult[],
    query: AgentQuery,
    facts: FactSet
  ): Promise<string> {
    const sections: string[] = [];

    // Extract key intelligence results
    const ladderResult = intelligenceResults.find((r) => r.type_id === 'TYPE-049');
    const outcomeResult = intelligenceResults.find((r) => r.type_id === 'TYPE-050');

    // Section 1: Execution Ladder Position (foundational context)
    if (ladderResult && ladderResult.data.ladder_position) {
      sections.push(this.formatLadderPosition(ladderResult));
    }

    // Section 2: Outcome Engineering (this week's focus)
    if (outcomeResult && outcomeResult.data.outcomes_generated) {
      sections.push(this.formatOutcomeEngineering(outcomeResult));
    }

    // Section 3: Stub intelligence (v20.0 - informational only)
    const stubResults = intelligenceResults.filter(
      (r) => r.data.stub === true
    );
    if (stubResults.length > 0) {
      sections.push(this.formatStubIntelligence(stubResults));
    }

    // Section 4: Next Actions Summary
    sections.push(this.formatNextActions(ladderResult, outcomeResult));

    return sections.join('\n\n---\n\n');
  }

  /**
   * Format execution ladder position section
   */
  private formatLadderPosition(result: IntelligenceResult): string {
    const position = result.data.ladder_position;
    const currentRung = position.current_rung;

    let output = `## 🪜 Execution Ladder Position\n\n`;
    output += `**Current Rung:** ${currentRung.rung_number}/9 - ${currentRung.current_rung.toUpperCase()} (${currentRung.completion_percentage}% complete)\n\n`;
    output += `**Overall Progress:** ${position.overall_progress_percentage}% of journey to Submission\n\n`;

    if (position.at_risk) {
      output += `⚠️ **Status:** Behind expected timeline - needs acceleration\n\n`;
    } else {
      output += `✅ **Status:** On track\n\n`;
    }

    output += `**Rungs Completed:** ${position.rungs_completed.length}/9\n`;
    output += `**Estimated Weeks to Submission:** ${position.estimated_weeks_to_submission} weeks\n\n`;

    if (currentRung.proof_validated.length > 0) {
      output += `**Proof Validated:**\n`;
      currentRung.proof_validated.forEach((proof) => {
        output += `- ✅ ${proof}\n`;
      });
      output += `\n`;
    }

    if (currentRung.proof_missing.length > 0) {
      output += `**Proof Missing:**\n`;
      currentRung.proof_missing.forEach((proof) => {
        output += `- ❌ ${proof}\n`;
      });
      output += `\n`;
    }

    if (position.recommendations.length > 0) {
      output += `**Recommendations:**\n`;
      position.recommendations.forEach((rec) => {
        output += `- ${rec}\n`;
      });
    }

    return output;
  }

  /**
   * Format outcome engineering section
   */
  private formatOutcomeEngineering(result: IntelligenceResult): string {
    const data = result.data;

    let output = `## 🎯 This Week's Outcomes (Outcome Engineering)\n\n`;
    output += `**Total Outcomes:** ${data.outcomes_generated.length}\n`;
    output += `**Priority Distribution:** P0: ${data.priority_distribution.p0_count}, P1: ${data.priority_distribution.p1_count}, P2: ${data.priority_distribution.p2_count}, P3: ${data.priority_distribution.p3_count}\n\n`;

    // High-density outcomes (focus here!)
    if (data.high_density_outcomes.length > 0) {
      output += `### 🔥 High-Density Outcomes (3+ proof artifacts)\n\n`;
      output += `Focus on these - they generate maximum proof:\n\n`;

      data.high_density_outcomes.slice(0, 5).forEach((outcome: any) => {
        output += `**${outcome.title}** [${outcome.priority_level}]\n`;
        output += `- Domain: ${outcome.outcome_domain}\n`;
        output += `- Proof Tags: ${outcome.outcome_tags.join(', ')}\n`;
        output += `- Density Score: ${outcome.outcome_density_score}/5\n`;
        output += `- Effort: ~${outcome.estimated_effort_hours}h\n`;
        if (outcome.deadline) {
          output += `- Deadline: ${outcome.deadline}\n`;
        }
        output += `\n`;
      });
    }

    // Priority outcomes (P0/P1)
    const priorityOutcomes = data.outcomes_generated.filter(
      (o: any) => o.priority_level === 'P0' || o.priority_level === 'P1'
    );

    if (priorityOutcomes.length > 0 && priorityOutcomes.length !== data.high_density_outcomes.length) {
      output += `### ⚡ Priority Outcomes (P0/P1)\n\n`;
      priorityOutcomes.slice(0, 5).forEach((outcome: any) => {
        output += `**${outcome.title}** [${outcome.priority_level}]\n`;
        output += `- Urgency: ${outcome.urgency_score}/10, Impact: ${outcome.impact_score}/10\n`;
        output += `- Proof Tags: ${outcome.outcome_tags.join(', ')}\n`;
        output += `\n`;
      });
    }

    // Orphan risk outcomes (warning)
    if (data.orphan_risk_outcomes.length > 0) {
      output += `### ⚠️ Orphan Risk Outcomes (0 proof tags)\n\n`;
      output += `Consider eliminating or re-scoping these:\n\n`;
      data.orphan_risk_outcomes.forEach((outcome: any) => {
        output += `- ${outcome.title} (${outcome.outcome_domain})\n`;
      });
      output += `\n`;
    }

    // Recommendations
    if (data.recommendations.length > 0) {
      output += `**Recommendations:**\n`;
      data.recommendations.forEach((rec: string) => {
        output += `- ${rec}\n`;
      });
    }

    return output;
  }

  /**
   * Format stub intelligence section
   */
  private formatStubIntelligence(stubResults: IntelligenceResult[]): string {
    let output = `## 🚧 Additional Intelligence (Coming in v20.1-v20.5)\n\n`;
    output += `The following intelligence types are available as stubs and will be fully implemented soon:\n\n`;

    stubResults.forEach((result) => {
      output += `**${result.type_id}: ${result.data.message}**\n`;
      if (result.data.framework) {
        output += `- Framework: ${result.data.framework}\n`;
      }
      output += `\n`;
    });

    output += `See \`docs/BACKLOG_CRITICAL_ITEMS.md\` for expansion timeline.\n`;

    return output;
  }

  /**
   * Format next actions summary
   */
  private formatNextActions(
    ladderResult: IntelligenceResult | undefined,
    outcomeResult: IntelligenceResult | undefined
  ): string {
    let output = `## 📋 Next Actions\n\n`;

    const actions: string[] = [];

    // From ladder position
    if (ladderResult && ladderResult.data.ladder_position) {
      const recommendations = ladderResult.data.ladder_position.recommendations || [];
      actions.push(...recommendations.slice(0, 2));
    }

    // From outcome engineering
    if (outcomeResult && outcomeResult.data.recommendations) {
      actions.push(...outcomeResult.data.recommendations.slice(0, 2));
    }

    if (actions.length === 0) {
      actions.push('Continue executing on current week\'s outcomes');
      actions.push('Review weekly progress and adjust priorities');
    }

    actions.forEach((action, index) => {
      output += `${index + 1}. ${action}\n`;
    });

    return output;
  }
}

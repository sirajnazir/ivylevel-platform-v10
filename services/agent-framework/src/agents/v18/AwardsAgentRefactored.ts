/**
 * AwardsAgentRefactored.ts (v18.1 - Intelligence Types Architecture)
 *
 * Agent specialized in award opportunity recommendations and strategic positioning
 *
 * Architecture: Extends BaseAgentWithIntelligence (Fact-First + Intelligence Types)
 *
 * Intelligence Types:
 * - TYPE-023: Award Arbitrage System (Domain-Specific)
 * - TYPE-027: Quick Wins Strategy (Domain-Specific)
 * - TYPE-020: Opportunity Pipeline (Universal - inherited)
 *
 * Created: 2025-10-29 (Phase 3: Build AwardsAgent)
 * Spec: docs/agents/AWARDS_AGENT_TECH_SPEC.md (50,000 words, 14 intelligence types)
 * Implementation Plan: docs/IMPLEMENTATION_PLAN_AWARDS_AGENT.md
 *
 * Key Features:
 * - 4-dimension award scoring: (Alignment × 3) + (Odds × 2) + (Prestige × 2) + (Essay Reuse × 1)
 * - NCWIT 70% win probability, Congressional App 60% win probability
 * - 8-week momentum engine (Foundation → Recognition → Scale)
 * - 1.2 opportunities/interaction bombardment (inherited from TYPE-020)
 * - 33% win rate target, 70% application rate
 *
 * Data Sources:
 * - /data/coaching_intelligence/extractions/huda_assess_plus_gameplan/02-B-Huda-GamePlan-Creation.jsonl (Line 7: Award probabilities)
 * - /data/eq/sessions/jenny_eq_session_w008_extract.json (Award reverse engineering)
 * - 93 weeks validated coaching patterns
 */

import { BaseAgentWithIntelligence, IntelligenceAgentResponse } from './BaseAgentWithIntelligence.js';
import { FactStore } from '../../facts/FactStore.js';
import { FactSet } from '../../facts/FactSet.js';
import { FactCategory, AgentQuery } from '../../facts/types.js';
import { IntelligenceType, IntelligenceResult } from '../../intelligence/types/BaseIntelligenceType.js';
import { IntelligenceRegistry } from '../../intelligence/IntelligenceRegistry.js';
import { createLogger } from '../../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('awards-agent-v18');

/**
 * AwardsAgentRefactored - Award Opportunity Specialist
 *
 * Responsibilities:
 * - Score and rank award opportunities (4-dimension matrix)
 * - Generate quick wins strategy (8-week momentum)
 * - Maintain opportunity pipeline (1.2 opportunities/interaction)
 * - Reverse engineer past winners
 * - Strategic positioning for applications
 *
 * NOT Responsible For:
 * - Essay writing (EssayAgent)
 * - Activity tracking (ExtracurricularsAgent)
 * - Timeline management (GamePlanAgent)
 */
export class AwardsAgentRefactored extends BaseAgentWithIntelligence {
  protected agentDomain = 'awards' as const;

  /**
   * DOMAIN-SPECIFIC Intelligence Types for Awards Agent
   */
  protected DOMAIN_INTELLIGENCE: IntelligenceType[] = [];

  constructor(factStore: FactStore) {
    super('awards-agent-v18', factStore);

    log.event('awards_agent.initialize_start');

    // Load domain-specific intelligence types from registry
    try {
      this.DOMAIN_INTELLIGENCE = [
        IntelligenceRegistry.get('TYPE-017'), // Task Multiplication (5X Formula)
        IntelligenceRegistry.get('TYPE-022'), // Award Strategy Orchestration
        IntelligenceRegistry.get('TYPE-023'), // Award Arbitrage System
        IntelligenceRegistry.get('TYPE-024'), // Award Tier Classification
        IntelligenceRegistry.get('TYPE-025'), // Content Recycling Matrix
        IntelligenceRegistry.get('TYPE-026'), // 70/20/10 Portfolio Rule
        IntelligenceRegistry.get('TYPE-027'), // Quick Wins Strategy
        // TYPE-020 (Opportunity Pipeline) is inherited as UNIVERSAL
      ];

      log.event('awards_agent.initialize_complete', {
        domain_intelligence_count: this.DOMAIN_INTELLIGENCE.length,
        total_intelligence_count: this.getAllIntelligenceTypes().length,
      });
    } catch (error) {
      log.error('awards_agent.initialize_error', error);
      throw new Error('Failed to initialize AwardsAgent: ' + String(error));
    }
  }

  /**
   * Declare required facts for Awards Agent
   * These facts MUST be present before agent can respond
   */
  protected getRequiredFacts(): FactCategory[] {
    return [
      FactCategory.STUDENT_PROFILE,     // Demographics, grade, gender, location
      FactCategory.ACTIVITY_DATA,       // Extracurriculars and projects (used for award alignment)
      FactCategory.ASSESSMENT_DATA,     // For unique narrative and strengths
      // TODO: Add AWARDS_WON, UNIQUE_NARRATIVE, TARGET_SCHOOLS when available in FactStore
    ];
  }

  /**
   * Synthesize response from intelligence results
   * Override default to provide award-specific formatting
   */
  protected async synthesizeResponse(
    intelligenceResults: IntelligenceResult[],
    query: AgentQuery,
    facts: FactSet
  ): Promise<string> {
    if (intelligenceResults.length === 0) {
      return "I need more information about your profile to recommend awards. Let's start with your current activities and interests.";
    }

    const sections: string[] = [];

    // Check which intelligence types were triggered
    const awardArbitrageResult = intelligenceResults.find((r) => r.type_id === 'TYPE-023');
    const quickWinsResult = intelligenceResults.find((r) => r.type_id === 'TYPE-027');
    const opportunityPipelineResult = intelligenceResults.find((r) => r.type_id === 'TYPE-020');

    // Priority 1: Quick Wins (if query mentions urgency/momentum)
    if (quickWinsResult && quickWinsResult.data.momentum_plan) {
      sections.push(this.formatQuickWinsResponse(quickWinsResult));
    }

    // Priority 2: Award Arbitrage (core recommendations)
    if (awardArbitrageResult && awardArbitrageResult.data.recommended_awards) {
      sections.push(this.formatAwardArbitrageResponse(awardArbitrageResult));
    }

    // Priority 3: Opportunity Pipeline (additional opportunities)
    if (opportunityPipelineResult && opportunityPipelineResult.data.opportunities) {
      sections.push(this.formatOpportunityPipelineResponse(opportunityPipelineResult));
    }

    // If no specific intelligence triggered, provide general guidance
    if (sections.length === 0) {
      return this.generateGeneralGuidance(query, facts);
    }

    return sections.join('\n\n---\n\n');
  }

  /**
   * Format Quick Wins Strategy result
   */
  private formatQuickWinsResponse(result: IntelligenceResult): string {
    const { momentum_plan, immediate_wins, timeline } = result.data;

    let response = `## 🚀 Quick Wins Strategy (${timeline})\n\n`;

    response += `I've identified a strategic 8-week momentum plan to build your profile quickly:\n\n`;

    // Phase 1: Foundation (Week 1-2)
    if (momentum_plan.phase_1_foundation && momentum_plan.phase_1_foundation.length > 0) {
      response += `### Week 1-2: Foundation\n`;
      momentum_plan.phase_1_foundation.forEach((win: any, idx: number) => {
        response += `${idx + 1}. **${win.name}** (${win.timeline})\n`;
        response += `   - Effort: ${win.effort_level}, Impact: ${win.impact_level}\n`;
        response += `   - ${win.success_criteria}\n\n`;
      });
    }

    // Phase 2: Recognition (Week 3-6)
    if (momentum_plan.phase_2_recognition && momentum_plan.phase_2_recognition.length > 0) {
      response += `### Week 3-6: Recognition\n`;
      momentum_plan.phase_2_recognition.forEach((win: any, idx: number) => {
        response += `${idx + 1}. **${win.name}** (${win.timeline})\n`;
        response += `   - Effort: ${win.effort_level}, Impact: ${win.impact_level}\n`;
        response += `   - ${win.success_criteria}\n\n`;
      });
    }

    // Phase 3: Scale (Week 7-8)
    if (momentum_plan.phase_3_scale && momentum_plan.phase_3_scale.length > 0) {
      response += `### Week 7-8: Scale\n`;
      momentum_plan.phase_3_scale.forEach((win: any, idx: number) => {
        response += `${idx + 1}. **${win.name}** (${win.timeline})\n`;
        response += `   - Effort: ${win.effort_level}, Impact: ${win.impact_level}\n`;
        response += `   - ${win.success_criteria}\n\n`;
      });
    }

    response += `**Expected Outcomes:** ${momentum_plan.expected_outcomes.join(', ')}`;

    return response;
  }

  /**
   * Format Award Arbitrage result
   */
  private formatAwardArbitrageResponse(result: IntelligenceResult): string {
    const { recommended_awards, scoring_breakdown } = result.data;

    let response = `## 🏆 Recommended Awards (Top ${recommended_awards.length})\n\n`;

    response += `Based on your profile, I've scored ${result.data.total_evaluated} awards and identified your best opportunities:\n\n`;

    recommended_awards.forEach((award: any, idx: number) => {
      response += `### ${idx + 1}. ${award.name}\n`;
      response += `- **Win Probability:** ${Math.round(award.probability)}%\n`;
      response += `- **Tier:** ${award.tier}\n`;
      response += `- **Deadline:** ${award.deadline}\n`;
      response += `- **Score Breakdown:**\n`;
      response += `  - Alignment: ${award.alignment_score}/10\n`;
      response += `  - Odds: ${award.odds_score}/10\n`;
      response += `  - Prestige: ${award.prestige_score}/10\n`;
      response += `  - Essay Reuse: ${award.essay_reuse_score}/10\n`;
      response += `  - **Total: ${Math.round(award.total_score)}/80**\n`;
      response += `- **Why This Award:** ${award.reasoning}\n`;
      response += `- **Strategic Positioning:** ${award.strategic_positioning}\n\n`;
    });

    return response;
  }

  /**
   * Format Opportunity Pipeline result
   */
  private formatOpportunityPipelineResponse(result: IntelligenceResult): string {
    const { opportunities, pipeline_health } = result.data;

    let response = `## 💼 Additional Opportunities\n\n`;

    if (pipeline_health.status !== 'healthy') {
      response += `⚠️ ${pipeline_health.message}\n\n`;
    }

    response += `Here are ${opportunities.length} more opportunities to consider:\n\n`;

    opportunities.forEach((opp: any, idx: number) => {
      response += `${idx + 1}. **${opp.name}** (${opp.type})\n`;
      response += `   - Fit Score: ${opp.fit_score}/10\n`;
      response += `   - Effort: ${opp.effort_estimate}, ROI: ${opp.roi_potential}\n`;
      if (opp.deadline) {
        response += `   - Deadline: ${opp.deadline}\n`;
      }
      response += `   - Why: ${opp.reasoning}\n\n`;
    });

    return response;
  }

  /**
   * Generate general guidance if no intelligence triggered
   */
  private generateGeneralGuidance(query: AgentQuery, facts: FactSet): string {
    return `I can help you find the best award opportunities based on your profile. To give you personalized recommendations, I need to understand:

1. Your main interests and activities
2. Any awards or recognitions you've already won
3. Your timeline (when do you need awards by?)
4. Your target colleges

Could you share more about your current activities and interests?`;
  }

  /**
   * Format individual intelligence result (fallback)
   */
  protected formatIntelligenceResult(result: IntelligenceResult): string {
    // Fallback for any intelligence types not handled above
    return `**${result.component}** (${result.type_id})\nConfidence: ${result.confidence}\n${JSON.stringify(result.data, null, 2)}`;
  }
}

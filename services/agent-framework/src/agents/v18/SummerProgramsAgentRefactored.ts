/**
 * SummerProgramsAgentRefactored.ts (v19.0 - Intelligence Types Architecture)
 *
 * Agent specialized in summer program selection, application strategy, and ROI analysis
 *
 * Architecture: Extends BaseAgentWithIntelligence (Fact-First + Intelligence Types)
 *
 * Intelligence Types:
 * - TYPE-028: Program Selection Matrix (Domain-Specific)
 * - TYPE-029: Program Application Strategy (Domain-Specific)
 * - TYPE-030: Cost-Benefit Intelligence (Domain-Specific)
 * - TYPE-020: Opportunity Pipeline (Universal - inherited)
 *
 * Created: 2025-10-29 (v19.0: Summer Programs Agent)
 * Pattern: Follows AwardsAgentRefactored.ts architecture
 *
 * Key Features:
 * - Multi-dimensional program scoring: (Alignment × 4) + (Selectivity_Fit × 3) + (Impact × 3) + (Feasibility × 2)
 * - Deadline clustering (batch applications to minimize overwhelm)
 * - Reach/match/safety balancing (2:3:2 ratio)
 * - ROI analysis (free T1/T2 programs >>> paid programs)
 * - Application velocity tracking (60%+ completion rate target)
 *
 * Program Tier Classification:
 * - T1: Elite (<5% admit) - RSI, TASP, SSP, Telluride
 * - T2: Selective (5-25% admit) - Garcia, Columbia SHP, YYGS
 * - T3: Competitive (25-50% admit) - Local university programs
 * - T4: Open enrollment (>50% admit) - Commercial camps
 */

import { BaseAgentWithIntelligence } from './BaseAgentWithIntelligence.js';
import { FactStore } from '../../facts/FactStore.js';
import { FactSet } from '../../facts/FactSet.js';
import { FactCategory, AgentQuery } from '../../facts/types.js';
import { IntelligenceType, IntelligenceResult } from '../../intelligence/types/BaseIntelligenceType.js';
import { IntelligenceRegistry } from '../../intelligence/IntelligenceRegistry.js';
import { createLogger } from '../../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('summer-programs-agent-v19');

/**
 * SummerProgramsAgentRefactored - Summer Program Specialist
 *
 * Responsibilities:
 * - Score and rank summer programs (multi-dimensional matrix)
 * - Generate strategic application timeline (deadline clustering)
 * - Analyze cost-benefit and ROI
 * - Balance reach/match/safety programs
 * - Maximize essay reuse opportunities
 *
 * NOT Responsible For:
 * - Essay writing (EssayAgent)
 * - Activity tracking (ExtracurricularsAgent)
 * - College list (CollegeListAgent)
 */
export class SummerProgramsAgentRefactored extends BaseAgentWithIntelligence {
  protected agentDomain = 'summer-programs' as const;

  /**
   * DOMAIN-SPECIFIC Intelligence Types for Summer Programs Agent
   */
  protected DOMAIN_INTELLIGENCE: IntelligenceType[] = [];

  constructor(factStore: FactStore) {
    super('summer-programs-agent-v19', factStore);

    log.event('summer_programs_agent.initialize_start');

    // Load domain-specific intelligence types from registry
    try {
      this.DOMAIN_INTELLIGENCE = [
        IntelligenceRegistry.get('TYPE-028'), // Program Selection Matrix
        IntelligenceRegistry.get('TYPE-029'), // Program Application Strategy
        IntelligenceRegistry.get('TYPE-030'), // Cost-Benefit Intelligence
        // TYPE-020 (Opportunity Pipeline) is inherited as UNIVERSAL
      ];

      log.event('summer_programs_agent.initialize_complete', {
        domain_intelligence_count: this.DOMAIN_INTELLIGENCE.length,
        total_intelligence_count: this.getAllIntelligenceTypes().length,
      });
    } catch (error) {
      log.error('summer_programs_agent.initialize_error', error);
      throw new Error('Failed to initialize SummerProgramsAgent: ' + String(error));
    }
  }

  /**
   * Declare required facts for Summer Programs Agent
   * These facts MUST be present before agent can respond
   */
  protected getRequiredFacts(): FactCategory[] {
    return [
      FactCategory.STUDENT_PROFILE,     // Demographics, grade, interests
      FactCategory.ACTIVITY_DATA,       // Extracurriculars (used for program alignment)
      FactCategory.ASSESSMENT_DATA,     // Strengths and interests
      // TODO: Add AVAILABLE_HOURS_WEEKLY, TARGET_SCHOOLS when available in FactStore
    ];
  }

  /**
   * Synthesize response from intelligence results
   * Override default to provide summer programs-specific formatting
   */
  protected async synthesizeResponse(
    intelligenceResults: IntelligenceResult[],
    query: AgentQuery,
    facts: FactSet
  ): Promise<string> {
    if (intelligenceResults.length === 0) {
      return "I need more information about your profile to recommend summer programs. Let's start with your interests and goals.";
    }

    const sections: string[] = [];

    // Check which intelligence types were triggered
    const programSelectionResult = intelligenceResults.find((r) => r.type_id === 'TYPE-028');
    const applicationStrategyResult = intelligenceResults.find((r) => r.type_id === 'TYPE-029');
    const costBenefitResult = intelligenceResults.find((r) => r.type_id === 'TYPE-030');
    const opportunityPipelineResult = intelligenceResults.find((r) => r.type_id === 'TYPE-020');

    // Priority 1: Program Selection (core recommendations)
    if (programSelectionResult && programSelectionResult.data.top_programs) {
      sections.push(this.formatProgramSelectionResponse(programSelectionResult));
    }

    // Priority 2: Application Strategy (timeline + batching)
    if (applicationStrategyResult && applicationStrategyResult.data.timeline) {
      sections.push(this.formatApplicationStrategyResponse(applicationStrategyResult));
    }

    // Priority 3: Cost-Benefit Analysis (if query mentions cost/value)
    if (costBenefitResult && costBenefitResult.data.analyses) {
      sections.push(this.formatCostBenefitResponse(costBenefitResult));
    }

    // Priority 4: Opportunity Pipeline (additional opportunities)
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
   * Format Program Selection Matrix result
   */
  private formatProgramSelectionResponse(result: IntelligenceResult): string {
    const { top_programs, total_evaluated, scoring_algorithm } = result.data;

    let response = `## 🏕️ Recommended Summer Programs (Top ${top_programs.length})\n\n`;

    response += `Based on your profile, I've evaluated ${total_evaluated} programs and identified your best opportunities:\n\n`;

    top_programs.forEach((program: any, idx: number) => {
      response += `### ${idx + 1}. ${program.program_name}\n`;
      response += `- **Program Score:** ${program.total_score}/120\n`;
      response += `- **Tier:** ${program.tier} `;

      // Add tier description
      if (program.tier === 'T1') response += '(Elite - <5% admit rate)\n';
      else if (program.tier === 'T2') response += '(Selective - 15-25% admit rate)\n';
      else if (program.tier === 'T3') response += '(Competitive - 25-50% admit rate)\n';
      else response += '(Open enrollment)\n';

      response += `- **Selectivity:** ${this.formatSelectivityCategory(program.admit_rate)}\n`;
      response += `- **Fit Score:** ${program.alignment_score}/10 - ${this.getAlignmentLabel(program.alignment_score)}\n`;
      response += `- **Impact:** ${program.impact_score}/10 - ${this.getImpactLabel(program.impact_score, program.tier)}\n`;
      response += `- **Cost:** ${program.cost}\n`;
      response += `- **Deadline:** ${program.deadline}\n`;
      response += `- **Why This Program:** ${program.why_recommended}\n`;

      if (program.strategic_positioning) {
        response += `- **Strategic Positioning:** ${program.strategic_positioning}\n`;
      }

      response += `\n`;
    });

    response += `\n**Scoring Algorithm:** ${scoring_algorithm}`;

    return response;
  }

  /**
   * Format Application Strategy result
   */
  private formatApplicationStrategyResponse(result: IntelligenceResult): string {
    const { timeline, strategy_summary } = result.data;

    let response = `## 📅 Strategic Application Timeline\n\n`;

    response += `${strategy_summary}\n\n`;

    timeline.batches.forEach((batch: any) => {
      response += `### ${batch.batch_name} (${batch.batch_window})\n`;

      batch.programs.forEach((program: any, idx: number) => {
        response += `${idx + 1}. **${program.program_name}** (Due ${program.deadline})\n`;
        response += `   - Priority Score: ${program.priority_score}/100\n`;
        response += `   - Tier: ${program.tier}, Selectivity: ${this.capitalizeFirst(program.selectivity_category)}\n`;
        response += `   - Essay Reuse: ${program.essay_reuse_potential}%\n`;
        response += `   - Time Needed: ${program.estimated_hours}\n`;
        response += `   - Notes: ${program.strategic_notes}\n\n`;
      });
    });

    // Portfolio balance summary
    response += `\n### Portfolio Balance:\n`;
    response += `- **Reach:** ${timeline.portfolio_balance.reach_count} programs\n`;
    response += `- **Match:** ${timeline.portfolio_balance.match_count} programs\n`;
    response += `- **Safety:** ${timeline.portfolio_balance.safety_count} programs\n`;
    response += `- **Total:** ${timeline.portfolio_balance.total_count} programs\n\n`;

    response += `**Total Estimated Time:** ${timeline.total_estimated_hours} hours across all applications\n\n`;

    // Essay reuse opportunities
    if (timeline.essay_reuse_opportunities && timeline.essay_reuse_opportunities.length > 0) {
      response += `\n### Essay Reuse Opportunities:\n`;
      timeline.essay_reuse_opportunities.forEach((opportunity: string) => {
        response += `- ${opportunity}\n`;
      });
    }

    return response;
  }

  /**
   * Format Cost-Benefit Analysis result
   */
  private formatCostBenefitResponse(result: IntelligenceResult): string {
    const { analyses, summary } = result.data;

    let response = `## 💰 Cost-Benefit Analysis\n\n`;

    response += `${summary}\n\n`;

    // Group by ROI category
    const highROI = analyses.filter((a: any) => a.roi_category === 'high');
    const mediumROI = analyses.filter((a: any) => a.roi_category === 'medium');
    const lowROI = analyses.filter((a: any) => a.roi_category === 'low');
    const negativeROI = analyses.filter((a: any) => a.roi_category === 'negative');

    if (highROI.length > 0) {
      response += `### High ROI (Strongly Recommend)\n`;
      highROI.forEach((program: any, idx: number) => {
        response += `${idx + 1}. **${program.program_name}** - ROI Score: ${program.roi_score}/100\n`;
        response += `   - Cost: $${program.financial_cost.toLocaleString()}\n`;
        response += `   - Time: ${program.time_cost_hours} hours\n`;
        response += `   - Admissions Impact: +${program.admissions_impact_points} Ivy score points\n`;
        response += `   - Learning Value: ${program.learning_value_score}/10\n`;
        response += `   - **Bottom Line:** ${program.bottom_line}\n\n`;
      });
    }

    if (mediumROI.length > 0) {
      response += `### Medium ROI (Recommend)\n`;
      mediumROI.forEach((program: any, idx: number) => {
        response += `${idx + 1}. **${program.program_name}** - ROI Score: ${program.roi_score}/100\n`;
        response += `   - Cost: $${program.financial_cost.toLocaleString()}\n`;
        response += `   - Time: ${program.time_cost_hours} hours\n`;
        response += `   - Admissions Impact: +${program.admissions_impact_points} Ivy score points\n`;
        response += `   - **Bottom Line:** ${program.bottom_line}\n\n`;
      });
    }

    if (lowROI.length > 0) {
      response += `### Low ROI (Consider Alternatives)\n`;
      lowROI.forEach((program: any) => {
        response += `- **${program.program_name}**: ${program.bottom_line}\n`;
      });
    }

    if (negativeROI.length > 0) {
      response += `\n### Negative ROI (Not Recommended)\n`;
      negativeROI.forEach((program: any) => {
        response += `- **${program.program_name}**: ${program.bottom_line}\n`;
        if (program.alternatives) {
          response += `  - **Alternative:** ${program.alternatives}\n`;
        }
      });
    }

    return response;
  }

  /**
   * Format Opportunity Pipeline result
   */
  private formatOpportunityPipelineResponse(result: IntelligenceResult): string {
    const { opportunities, pipeline_health } = result.data;

    let response = `## 💼 Additional Opportunities\n\n`;

    if (pipeline_health && pipeline_health.status !== 'healthy') {
      response += `⚠️ ${pipeline_health.message}\n\n`;
    }

    response += `Here are ${opportunities.length} more opportunities to consider:\n\n`;

    opportunities.forEach((opp: any, idx: number) => {
      response += `${idx + 1}. **${opp.name}** (${opp.type || 'Program'})\n`;
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
    return `I can help you find the best summer programs based on your profile and goals. To give you personalized recommendations, I need to understand:

1. Your main interests (STEM, humanities, arts, leadership, etc.)
2. Your academic strengths and current activities
3. Your timeline (which summer are you planning for?)
4. Your target colleges and intended major
5. Your budget constraints (if any)

Could you share more about your interests and what you're hoping to achieve this summer?`;
  }

  /**
   * Format selectivity category with percentage
   */
  private formatSelectivityCategory(admitRate: string): string {
    if (!admitRate) return 'Unknown';
    const rate = parseInt(admitRate.replace('%', ''), 10);
    if (rate < 10) return `Reach (${admitRate} admit rate, highly competitive)`;
    if (rate < 25) return `Match (${admitRate} admit rate, competitive)`;
    if (rate < 50) return `Safety (${admitRate} admit rate, likely)`;
    return `Safety (${admitRate} admit rate, very likely)`;
  }

  /**
   * Get alignment label
   */
  private getAlignmentLabel(score: number): string {
    if (score >= 9) return 'Exceptional match for your profile';
    if (score >= 7) return 'Strong profile alignment';
    if (score >= 5) return 'Moderate alignment';
    return 'Limited alignment';
  }

  /**
   * Get impact label
   */
  private getImpactLabel(score: number, tier: string): string {
    if (tier === 'T1') return 'Significant college admissions boost';
    if (tier === 'T2') return 'Valuable for Ivy applications';
    if (tier === 'T3') return 'Moderate admissions value';
    return 'Minimal admissions impact';
  }

  /**
   * Capitalize first letter
   */
  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Format individual intelligence result (fallback)
   */
  protected formatIntelligenceResult(result: IntelligenceResult): string {
    // Fallback for any intelligence types not handled above
    return `**${result.component}** (${result.type_id})\nConfidence: ${result.confidence}\n${JSON.stringify(result.data, null, 2)}`;
  }
}

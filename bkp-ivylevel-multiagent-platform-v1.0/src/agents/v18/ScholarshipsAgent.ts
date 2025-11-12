/**
 * ScholarshipsAgent.ts (v30.1 - 100% Complete - All 3 Intelligence Types Wired)
 *
 * Agent specialized in scholarship opportunity recommendations and financial aid strategy
 *
 * Architecture: Extends BaseAgentWithIntelligence (Fact-First + Intelligence Types)
 *
 * Intelligence Types (3 domain-specific):
 * - TYPE-031: Scholarship Selection Matrix (Domain-Specific)
 * - TYPE-032: Application Timeline Strategy (Domain-Specific)
 * - TYPE-033: Financial Aid Intelligence (Domain-Specific)
 * - TYPE-020: Opportunity Pipeline (Universal - inherited)
 *
 * Created: 2025-10-29 (v21.0 ScholarshipsAgent Foundation)
 * Updated: 2025-11-04 (v30.1: Enhanced initialization with logging and error handling)
 * Pattern: Follows v30.0 agent initialization pattern
 *
 * Key Features:
 * - 4-dimension scholarship scoring: (Eligibility × 4) + (Award Amount × 3) + (Win Odds × 2) + (Essay Reuse × 1)
 * - Strategic timeline planning with 2-week deadline windows
 * - Financial aid optimization (need-based + merit + external stacking)
 * - EFC estimation and aid package comparison
 * - Stacking policy intelligence (full vs partial vs no stacking)
 *
 * Data Sources:
 * - W019 session transcript (scholarship strategy discussion)
 * - Awards Agent pattern (TYPE-023 Award Arbitrage)
 * - Summer Programs Agent pattern (TYPE-029 Application Strategy)
 */

import { BaseAgentWithIntelligence } from './BaseAgentWithIntelligence.js';
import { FactStore } from '../../facts/FactStore.js';
import { FactSet } from '../../facts/FactSet.js';
import { FactCategory, AgentQuery } from '../../facts/types.js';
import { IntelligenceType, IntelligenceResult } from '../../intelligence/types/BaseIntelligenceType.js';
import { IntelligenceRegistry } from '../../intelligence/IntelligenceRegistry.js';
import { createLogger } from '../../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('scholarships-agent-v21');

/**
 * ScholarshipsAgent - Scholarship Opportunity & Financial Aid Specialist
 *
 * Responsibilities:
 * - Score and rank scholarship opportunities (4-dimension matrix)
 * - Generate application timeline strategy (2-week deadline windows)
 * - Analyze financial aid packages (need-based + merit + external)
 * - Identify stacking opportunities (college policies)
 * - Build negotiation leverage (competitive offers)
 *
 * NOT Responsible For:
 * - Essay writing (EssayAgent)
 * - FAFSA/CSS Profile completion (financial aid counselor)
 * - College selection (CollegeAppsAgent)
 */
export class ScholarshipsAgent extends BaseAgentWithIntelligence {
  protected agentDomain = 'scholarships' as const;

  /**
   * DOMAIN-SPECIFIC Intelligence Types for Scholarships Agent
   */
  protected DOMAIN_INTELLIGENCE: IntelligenceType[] = [];

  constructor(factStore: FactStore) {
    super('scholarships-agent-v30', factStore);

    // Load domain-specific intelligence types from registry
    this.initializeDomainIntelligence();
  }

  /**
   * Initialize Scholarships-specific intelligence types
   * v30.1: Enhanced initialization with proper logging and error handling (100% spec-compliant)
   */
  private initializeDomainIntelligence(): void {
    log.event('scholarships_agent.initialize_start', {
      agent_id: this.agentId,
      intelligence_types_expected: 3,
    });

    try {
      this.DOMAIN_INTELLIGENCE = [
        IntelligenceRegistry.get('TYPE-031'), // Scholarship Selection Matrix
        IntelligenceRegistry.get('TYPE-032'), // Application Timeline Strategy
        IntelligenceRegistry.get('TYPE-033'), // Financial Aid Intelligence
        // TYPE-020 (Opportunity Pipeline) is inherited as UNIVERSAL
      ];

      log.event('scholarships_agent.initialize_complete', {
        domain_intelligence_count: this.DOMAIN_INTELLIGENCE.length,
        types_loaded: this.DOMAIN_INTELLIGENCE.map(t => t.type_id),
      });
    } catch (error) {
      log.error('scholarships_agent.initialize_error', error);
      throw new Error('Failed to initialize ScholarshipsAgent: ' + String(error));
    }
  }

  /**
   * Declare required facts for Scholarships Agent
   * These facts MUST be present before agent can respond
   */
  protected getRequiredFacts(): FactCategory[] {
    return [
      FactCategory.STUDENT_PROFILE,     // Demographics, grade, GPA, test scores, household income
      FactCategory.ACTIVITY_DATA,       // Extracurriculars, awards (used for scholarship alignment)
      FactCategory.ASSESSMENT_DATA,     // Strengths, competitiveness level
      // TODO: Add COLLEGE_LIST, FINANCIAL_PROFILE when available in FactStore
    ];
  }

  /**
   * Synthesize response from intelligence results
   *
   * Response Structure:
   * 1. Top Scholarship Recommendations (from TYPE-031)
   * 2. Application Timeline (from TYPE-032)
   * 3. Financial Aid Analysis (from TYPE-033)
   * 4. Strategic Next Steps
   */
  protected async synthesizeResponse(
    intelligenceResults: IntelligenceResult[],
    query: AgentQuery,
    facts: FactSet
  ): Promise<string> {
    const sections: string[] = [];

    // Extract intelligence results by type
    const selectionResult = intelligenceResults.find((r) => r.type_id === 'TYPE-031');
    const timelineResult = intelligenceResults.find((r) => r.type_id === 'TYPE-032');
    const financialAidResult = intelligenceResults.find((r) => r.type_id === 'TYPE-033');

    // Section 1: Top Scholarship Recommendations (TYPE-031)
    if (selectionResult && selectionResult.data.top_recommendations) {
      sections.push(this.formatScholarshipRecommendations(selectionResult));
    }

    // Section 2: Application Timeline (TYPE-032)
    if (timelineResult && timelineResult.data.deadline_windows) {
      sections.push(this.formatApplicationTimeline(timelineResult));
    }

    // Section 3: Financial Aid Analysis (TYPE-033)
    if (financialAidResult && financialAidResult.data.estimated_college_packages) {
      sections.push(this.formatFinancialAidAnalysis(financialAidResult));
    }

    // Section 4: Strategic Next Steps
    sections.push(this.formatNextSteps(selectionResult, timelineResult, financialAidResult));

    return sections.join('\n\n---\n\n');
  }

  /**
   * Format scholarship recommendations section
   */
  private formatScholarshipRecommendations(result: IntelligenceResult): string {
    const data = result.data;
    let output = `## 🎓 Top Scholarship Recommendations\n\n`;

    output += `**Total Potential Aid:** $${Math.round(data.total_potential_aid / 1000)}K\n`;
    output += `**Applications to Submit:** ${data.top_recommendations.length}\n`;
    output += `**Estimated Effort:** ${data.estimated_effort_hours} hours\n\n`;

    // Top recommendations
    if (data.top_recommendations.length > 0) {
      output += `### Recommended Scholarships\n\n`;
      data.top_recommendations.forEach((scholarship: any, index: number) => {
        output += `**${index + 1}. ${scholarship.scholarship_name}** (Score: ${scholarship.total_score}/100)\n`;
        output += `- Award Amount: ${scholarship.award_amount_score}/10\n`;
        output += `- Eligibility Match: ${scholarship.eligibility_match}\n`;
        output += `- Win Probability: ${Math.round(scholarship.estimated_win_probability * 100)}%\n`;
        output += `- Effective Value: $${Math.round(scholarship.effective_hourly_value)}/hour\n`;
        output += `- Recommendation: ${scholarship.recommendation.toUpperCase()}\n\n`;
      });
    }

    // Quick wins
    if (data.quick_wins.length > 0) {
      output += `### 🎯 Quick Wins (High Award + High Win Probability)\n\n`;
      data.quick_wins.slice(0, 3).forEach((scholarship: any) => {
        output += `- ${scholarship.scholarship_name} (${Math.round(scholarship.estimated_win_probability * 100)}% win probability)\n`;
      });
      output += `\n`;
    }

    // Reach opportunities
    if (data.reach_opportunities.length > 0) {
      output += `### 🚀 Reach Opportunities (High Award Value)\n\n`;
      data.reach_opportunities.slice(0, 2).forEach((scholarship: any) => {
        output += `- ${scholarship.scholarship_name} (worth applying even with lower odds)\n`;
      });
      output += `\n`;
    }

    // Recommendations
    if (data.recommendations.length > 0) {
      output += `**Strategic Recommendations:**\n`;
      data.recommendations.forEach((rec: string) => {
        output += `- ${rec}\n`;
      });
    }

    return output;
  }

  /**
   * Format application timeline section
   */
  private formatApplicationTimeline(result: IntelligenceResult): string {
    const data = result.data;
    let output = `## 📅 Application Timeline Strategy\n\n`;

    // Current window
    if (data.current_window) {
      output += `### This Week's Focus\n\n`;
      output += `**Window:** ${data.current_window.window_id}\n`;
      output += `**Scholarships Due:** ${data.current_window.recommended_batch.length}\n\n`;

      data.current_window.recommended_batch.forEach((scholarship: any) => {
        output += `- **${scholarship.scholarship_name}** - Deadline: ${new Date(scholarship.deadline).toLocaleDateString()}\n`;
      });
      output += `\n`;
    }

    // Next window
    if (data.next_window) {
      output += `### Coming Up Next\n\n`;
      output += `**Window:** ${data.next_window.window_id}\n`;
      output += `**Scholarships:** ${data.next_window.recommended_batch.length}\n\n`;

      data.next_window.recommended_batch.forEach((scholarship: any) => {
        output += `- ${scholarship.scholarship_name} - Start drafting now\n`;
      });
      output += `\n`;
    }

    // Buffer alerts
    if (data.buffer_alerts.length > 0) {
      output += `### ⚠️ Deadline Conflicts\n\n`;
      data.buffer_alerts.forEach((alert: string) => {
        output += `${alert}\n\n`;
      });
    }

    // Pacing recommendations
    if (data.pacing_recommendations.length > 0) {
      output += `**Pacing Guidance:**\n`;
      data.pacing_recommendations.forEach((rec: string) => {
        output += `- ${rec}\n`;
      });
    }

    return output;
  }

  /**
   * Format financial aid analysis section
   */
  private formatFinancialAidAnalysis(result: IntelligenceResult): string {
    const data = result.data;
    let output = `## 💰 Financial Aid Analysis\n\n`;

    // Financial profile summary
    const profile = data.financial_profile;
    output += `**Estimated EFC:** $${Math.round(profile.estimated_efc / 1000)}K\n`;
    output += `**Financial Need Level:** ${profile.financial_need_level}\n`;
    output += `**Merit Competitiveness:** ${profile.merit_competitiveness}/10\n`;
    output += `**Pell Grant Eligible:** ${profile.pell_grant_eligible ? 'Yes' : 'No'}\n\n`;

    // College aid packages comparison
    if (data.estimated_college_packages.length > 0) {
      output += `### College Aid Packages (Estimated)\n\n`;

      data.estimated_college_packages.forEach((pkg: any) => {
        output += `**${pkg.college_name}**\n`;
        output += `- Total Cost: $${Math.round(pkg.total_cost_of_attendance / 1000)}K/year\n`;
        output += `- Need-Based Grant: $${Math.round(pkg.need_based_grant / 1000)}K\n`;
        output += `- Merit Scholarship: $${Math.round(pkg.merit_scholarship / 1000)}K\n`;
        output += `- External Scholarships Allowed: $${Math.round(pkg.external_scholarships_allowed / 1000)}K\n`;
        output += `- **Net Cost: $${Math.round(pkg.net_cost_per_year / 1000)}K/year** (${pkg.aid_percentage}% aid)\n`;
        output += `- Stacking Policy: ${pkg.stacking_policy}\n\n`;
      });
    }

    // Aid strategy
    if (data.recommended_aid_strategy) {
      output += `### Recommended Aid Strategy\n\n`;
      output += `${data.recommended_aid_strategy}\n\n`;
    }

    // Stacking opportunities
    if (data.stacking_opportunities.length > 0) {
      output += `### Scholarship Stacking Opportunities\n\n`;
      data.stacking_opportunities.forEach((opp: string) => {
        output += `${opp}\n\n`;
      });
    }

    // Negotiation leverage
    if (data.negotiation_leverage.length > 0) {
      output += `### Negotiation Leverage\n\n`;
      data.negotiation_leverage.forEach((leverage: string) => {
        output += `- ${leverage}\n`;
      });
      output += `\n`;
    }

    // Warnings
    if (data.warnings.length > 0) {
      output += `### Warnings\n\n`;
      data.warnings.forEach((warning: string) => {
        output += `${warning}\n\n`;
      });
    }

    return output;
  }

  /**
   * Format next steps section
   */
  private formatNextSteps(
    selectionResult: IntelligenceResult | undefined,
    timelineResult: IntelligenceResult | undefined,
    financialAidResult: IntelligenceResult | undefined
  ): string {
    let output = `## 📋 Next Steps\n\n`;

    const steps: string[] = [];

    // From timeline
    if (timelineResult?.data.current_window?.recommended_batch.length > 0) {
      const currentBatch = timelineResult.data.current_window.recommended_batch;
      steps.push(
        `Complete applications for ${currentBatch.length} scholarship(s) this week: ${currentBatch.map((s: any) => s.scholarship_name).join(', ')}`
      );
    }

    // From selection
    if (selectionResult?.data.quick_wins.length > 0) {
      steps.push(
        `Prioritize quick wins with high win probability (${selectionResult.data.quick_wins.length} opportunities)`
      );
    }

    // From financial aid
    if (financialAidResult?.data.financial_profile.financial_need_level !== 'none') {
      steps.push('Complete FAFSA and CSS Profile applications (priority deadlines)');
    }

    if (financialAidResult?.data.stacking_opportunities.length > 0) {
      steps.push(
        'Apply to colleges with full external scholarship stacking policies to maximize aid'
      );
    }

    // Default steps
    if (steps.length === 0) {
      steps.push('Review scholarship recommendations above and select top 3-5 to apply');
      steps.push('Create application timeline with 2-3 submissions per week');
      steps.push('Reuse essays from college applications where possible');
    }

    steps.forEach((step, index) => {
      output += `${index + 1}. ${step}\n`;
    });

    return output;
  }
}

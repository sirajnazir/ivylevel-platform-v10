/**
 * AssessmentAgentV3 (v23.0 - Intelligence Types Architecture)
 *
 * Refactored AssessmentAgent using Intelligence Types Architecture v3.0
 *
 * Extends BaseAgentWithIntelligence with 4 domain-specific intelligence types:
 * - TYPE-080: 4-Phase Assessment Flow (Discovery → Narrative → Strategy → Time)
 * - TYPE-081: IvyScore Calculation (9-dimension weighted rubric)
 * - TYPE-082: Gap Analysis Engine (Academic, EC, Awards, Narrative gaps)
 * - TYPE-083: Potential Indicator Extraction (Hidden strengths, untapped opportunities)
 *
 * Created: 2025-10-29
 * Architecture: v3.0 Intelligence Types
 */

import { BaseAgentWithIntelligence } from './BaseAgentWithIntelligence.js';
import { FactStore } from '../../facts/FactStore.js';
import { FactCategory, AgentQuery } from '../../facts/types.js';
import { IntelligenceType, IntelligenceResult } from '../../intelligence/types/BaseIntelligenceType.js';
import { IntelligenceRegistry } from '../../intelligence/IntelligenceRegistry.js';
import { createLogger } from '../../../../../packages/observability/dist/unified-logger.js';
import { FactSet } from '../../facts/FactSet.js';

const log = createLogger('assessment-agent-v3');

export class AssessmentAgentV3 extends BaseAgentWithIntelligence {
  protected DOMAIN_INTELLIGENCE: IntelligenceType[] = [];

  constructor(factStore: FactStore) {
    super('assessment-agent-v3', factStore);
    this.initializeDomainIntelligence();
  }

  private initializeDomainIntelligence(): void {
    log.event('assessment_agent.initialize_domain_intelligence_start');

    try {
      const typeIds = ['TYPE-080', 'TYPE-081', 'TYPE-082', 'TYPE-083'];

      for (const typeId of typeIds) {
        if (IntelligenceRegistry.has(typeId)) {
          this.DOMAIN_INTELLIGENCE.push(IntelligenceRegistry.get(typeId));
        } else {
          log.event('assessment_agent.missing_intelligence_type', { type_id: typeId }, 'warn');
        }
      }

      log.event('assessment_agent.initialize_domain_intelligence_complete', {
        count: this.DOMAIN_INTELLIGENCE.length,
        types: this.DOMAIN_INTELLIGENCE.map((t) => t.type_id),
      });
    } catch (error) {
      log.error('assessment_agent.initialize_domain_intelligence_error', error);
    }
  }

  protected getRequiredFacts(): FactCategory[] {
    return [
      FactCategory.STUDENT_PROFILE,
      FactCategory.ASSESSMENT_DATA,
      FactCategory.ACTIVITY_DATA,
    ];
  }

  protected async synthesizeResponse(
    intelligenceResults: IntelligenceResult[],
    query: AgentQuery,
    facts: FactSet
  ): Promise<string> {
    if (intelligenceResults.length === 0) {
      return "Let's start your assessment! Tell me about yourself - your interests, activities, and goals.";
    }

    const intent = this.classifyIntent(query.query);

    switch (intent) {
      case 'phase_status':
        return this.synthesizePhaseStatusResponse(intelligenceResults);
      case 'ivyscore':
        return this.synthesizeIvyScoreResponse(intelligenceResults);
      case 'gaps':
        return this.synthesizeGapsResponse(intelligenceResults);
      case 'potential':
        return this.synthesizePotentialResponse(intelligenceResults);
      default:
        return this.synthesizeOverviewResponse(intelligenceResults);
    }
  }

  private classifyIntent(query: string): string {
    const q = query.toLowerCase();
    if (q.includes('phase') || q.includes('progress') || q.includes('complete')) return 'phase_status';
    if (q.includes('score') || q.includes('competitive') || q.includes('ivy')) return 'ivyscore';
    if (q.includes('gap') || q.includes('weakness') || q.includes('improve')) return 'gaps';
    if (q.includes('potential') || q.includes('hidden') || q.includes('strength')) return 'potential';
    return 'overview';
  }

  private synthesizePhaseStatusResponse(results: IntelligenceResult[]): string {
    const phaseFlow = results.find((r) => r.type_id === 'TYPE-080');
    if (!phaseFlow?.data) return 'Assessment phase data not available.';

    const data = phaseFlow.data as any;
    const sections: string[] = [];

    sections.push(`# Assessment Progress\n`);
    sections.push(`**Current Phase:** ${data.current_phase}`);
    sections.push(`**Overall Completion:** ${data.overall_completion.toFixed(0)}%\n`);

    sections.push(`## Phase Status\n`);
    data.phase_statuses?.forEach((status: any) => {
      const icon = status.is_complete ? '✅' : '⏳';
      sections.push(`${icon} **${status.phase}:** ${status.completion_percentage.toFixed(0)}%`);
    });

    if (data.adaptive_questions?.length > 0) {
      sections.push(`\n## Next Questions\n`);
      data.adaptive_questions.slice(0, 3).forEach((q: any) => {
        sections.push(`**${q.category}** (${q.priority}): ${q.question}`);
      });
    }

    return sections.join('\n');
  }

  private synthesizeIvyScoreResponse(results: IntelligenceResult[]): string {
    const ivyScore = results.find((r) => r.type_id === 'TYPE-081');
    if (!ivyScore?.data) return 'IvyScore data not available.';

    const data = ivyScore.data as any;
    const sections: string[] = [];

    sections.push(`# IvyScore Analysis\n`);
    sections.push(`**Your IvyScore:** ${data.ivy_score.toFixed(1)}/100`);
    sections.push(`**Tier:** ${data.competitiveness_tier}\n`);

    if (data.top_strengths?.length > 0) {
      sections.push(`## Top Strengths\n`);
      data.top_strengths.forEach((strength: any) => {
        sections.push(`- **${strength.dimension}** (${strength.score}/10): ${strength.rationale}`);
      });
    }

    if (data.critical_gaps?.length > 0) {
      sections.push(`\n## Areas for Growth\n`);
      data.critical_gaps.forEach((gap: any) => {
        sections.push(`- **${gap.dimension}** (${gap.score}/10): ${gap.gap}`);
      });
    }

    sections.push(`\n**Growth Potential:** +${data.score_trajectory.growth_opportunity.toFixed(0)} points possible`);

    return sections.join('\n');
  }

  private synthesizeGapsResponse(results: IntelligenceResult[]): string {
    const gapAnalysis = results.find((r) => r.type_id === 'TYPE-082');
    if (!gapAnalysis?.data) return 'Gap analysis data not available.';

    const data = gapAnalysis.data as any;
    const sections: string[] = [];

    sections.push(`# Gap Analysis\n`);
    sections.push(`**Total Gaps:** ${data.total_gaps}`);
    sections.push(`**Gap Score:** ${data.overall_gap_score.toFixed(0)}/100\n`);

    if (data.p0_gaps?.length > 0) {
      sections.push(`## Critical Gaps (P0)\n`);
      data.p0_gaps.slice(0, 3).forEach((gap: any) => {
        sections.push(`### ${gap.gap_title}`);
        sections.push(`- Current: ${gap.current_state}`);
        sections.push(`- Target: ${gap.target_state}`);
        sections.push(`- Action: ${gap.closing_actions[0]}\n`);
      });
    }

    if (data.quick_wins?.length > 0) {
      sections.push(`## Quick Wins\n`);
      data.quick_wins.slice(0, 3).forEach((win: any) => {
        sections.push(`- ${win.gap_title} (+${win.impact_on_ivyscore} points, ${win.estimated_weeks} weeks)`);
      });
    }

    return sections.join('\n');
  }

  private synthesizePotentialResponse(results: IntelligenceResult[]): string {
    const potential = results.find((r) => r.type_id === 'TYPE-083');
    if (!potential?.data) return 'Potential indicator data not available.';

    const data = potential.data as any;
    const sections: string[] = [];

    sections.push(`# Hidden Potential\n`);
    sections.push(`**Total Indicators:** ${data.total_indicators}`);
    sections.push(`**Potential Boost:** +${data.potential_ivyscore_boost.toFixed(0)} points\n`);

    if (data.highest_potential_activations?.length > 0) {
      sections.push(`## Top Activation Opportunities\n`);
      data.highest_potential_activations.slice(0, 3).forEach((ind: any) => {
        sections.push(`### ${ind.title} (+${ind.activation_potential} points)`);
        sections.push(`- ${ind.evidence.join('; ')}`);
        sections.push(`- Action: ${ind.activation_actions[0]}\n`);
      });
    }

    return sections.join('\n');
  }

  private synthesizeOverviewResponse(results: IntelligenceResult[]): string {
    const sections: string[] = [];
    sections.push(`# Assessment Overview\n`);

    const phaseFlow = results.find((r) => r.type_id === 'TYPE-080');
    if (phaseFlow?.data) {
      const data = phaseFlow.data as any;
      sections.push(`**Phase:** ${data.current_phase} (${data.overall_completion.toFixed(0)}% complete)`);
    }

    const ivyScore = results.find((r) => r.type_id === 'TYPE-081');
    if (ivyScore?.data) {
      const data = ivyScore.data as any;
      sections.push(`**IvyScore:** ${data.ivy_score.toFixed(1)}/100 (${data.competitiveness_tier})`);
    }

    const gaps = results.find((r) => r.type_id === 'TYPE-082');
    if (gaps?.data) {
      const data = gaps.data as any;
      sections.push(`**Critical Gaps:** ${data.p0_gaps?.length || 0}`);
    }

    const potential = results.find((r) => r.type_id === 'TYPE-083');
    if (potential?.data) {
      const data = potential.data as any;
      sections.push(`**Potential Boost:** +${data.potential_ivyscore_boost?.toFixed(0) || 0} points available`);
    }

    return sections.join('\n');
  }
}

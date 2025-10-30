/**
 * GamePlanAgentV3.ts (v18.0 - Intelligence Types Architecture v3.0)
 *
 * Refactored GamePlanAgent using Intelligence Types Architecture v3.0
 *
 * Extends BaseAgentWithIntelligence with 6 domain-specific intelligence types:
 * - TYPE-001: Game Plan Synthesis (IDENTITY + APTITUDE + PASSION + SERVICE = NARRATIVE)
 * - TYPE-002: Weak Spot Prioritization (Gap Priority Score = Gap × Weight × Urgency)
 * - TYPE-003: Timeline Architecture (93-Week Framework, 9 quarters)
 * - TYPE-004: Multi-Path Convergence (Parallel planning for undecided students)
 * - TYPE-006: Quarterly Adaptation (Dynamic replanning based on progress)
 * - TYPE-007: Time Mathematician (168-Hour Weekly Framework + ROI optimization)
 *
 * Key Changes from v18.0:
 * - Fact-first enforcement (cannot bypass fact loading)
 * - Intelligence types run in parallel (6 domain + 1 universal)
 * - Synthesis from intelligence results (not monolithic prompt)
 * - Automatic validation + provenance tracking
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

const log = createLogger('gameplan-agent-v3');

/**
 * GamePlanAgentV3 - Strategic planning using Intelligence Types
 *
 * Responsibilities:
 * - Initial plan creation (post-assessment)
 * - Quarterly reviews (every 12 weeks)
 * - Event-driven pivots (award won/lost, program accepted/rejected)
 * - Parallel plan management (undecided students)
 * - Time architecture and capacity planning
 *
 * Fact Dependencies:
 * - STUDENT_PROFILE (identity, grade_level, current_quarter)
 * - ASSESSMENT_DATA (rubric scores, gaps, identity_fusion)
 * - ACTIVITY_DATA (current commitments for time planning)
 * - MILESTONE_DATA (quarterly progress for adaptation)
 * - GOAL_DATA (target schools, narrative thread)
 */
export class GamePlanAgentV3 extends BaseAgentWithIntelligence {
  /**
   * Domain-specific intelligence types for GamePlan
   */
  protected DOMAIN_INTELLIGENCE: IntelligenceType[] = [];

  constructor(factStore: FactStore) {
    super('gameplan-agent-v3', factStore);

    // Load GamePlan intelligence types from registry
    this.initializeDomainIntelligence();
  }

  /**
   * Initialize GamePlan-specific intelligence types
   */
  private initializeDomainIntelligence(): void {
    log.event('gameplan_agent.initialize_domain_intelligence_start');

    try {
      // Load all 6 GamePlan intelligence types
      const typeIds = [
        'TYPE-001', // Game Plan Synthesis
        'TYPE-002', // Weak Spot Prioritization
        'TYPE-003', // Timeline Architecture
        'TYPE-004', // Multi-Path Convergence
        'TYPE-006', // Quarterly Adaptation
        'TYPE-007', // Time Mathematician
      ];

      for (const typeId of typeIds) {
        if (IntelligenceRegistry.has(typeId)) {
          this.DOMAIN_INTELLIGENCE.push(IntelligenceRegistry.get(typeId));
        } else {
          log.warn('gameplan_agent.missing_intelligence_type', { type_id: typeId });
        }
      }

      log.event('gameplan_agent.initialize_domain_intelligence_complete', {
        count: this.DOMAIN_INTELLIGENCE.length,
        types: this.DOMAIN_INTELLIGENCE.map((t) => t.type_id),
      });
    } catch (error) {
      log.error('gameplan_agent.initialize_domain_intelligence_error', error);
    }
  }

  /**
   * Required facts for GamePlan agent
   */
  protected getRequiredFacts(): FactCategory[] {
    return [
      FactCategory.STUDENT_PROFILE,
      FactCategory.ASSESSMENT_DATA,
      FactCategory.ACTIVITY_DATA,
    ];
  }

  /**
   * Synthesize GamePlan response from intelligence results
   *
   * Override base implementation for GamePlan-specific formatting
   */
  protected async synthesizeResponse(
    intelligenceResults: IntelligenceResult[],
    query: AgentQuery,
    facts: FactSet
  ): Promise<string> {
    log.event('gameplan_agent.synthesize_response_start', {
      intelligence_count: intelligenceResults.length,
      triggered_types: intelligenceResults.map((r) => r.type_id),
    });

    if (intelligenceResults.length === 0) {
      return "I don't have enough information to create your strategic plan yet. Let's complete your assessment first!";
    }

    // Classify query intent
    const intent = this.classifyIntent(query.query);

    // Route to appropriate synthesis handler
    let response: string;
    switch (intent) {
      case 'overview':
        response = this.synthesizeOverviewResponse(intelligenceResults, facts);
        break;
      case 'profile':
        response = this.synthesizeProfileResponse(intelligenceResults, facts);
        break;
      case 'quarterly':
        response = this.synthesizeQuarterlyResponse(intelligenceResults, facts);
        break;
      case 'timeline':
        response = this.synthesizeTimelineResponse(intelligenceResults, facts);
        break;
      case 'parallel':
        response = this.synthesizeParallelPathsResponse(intelligenceResults, facts);
        break;
      case 'time':
        response = this.synthesizeTimeAllocationResponse(intelligenceResults, facts);
        break;
      default:
        response = this.synthesizeDefaultResponse(intelligenceResults, facts);
    }

    log.event('gameplan_agent.synthesize_response_complete', {
      intent,
      response_length: response.length,
    });

    return response;
  }

  /**
   * Classify user query intent
   */
  private classifyIntent(query: string): string {
    const q = query.toLowerCase();

    if (q.includes('game plan') || q.includes('strategic plan') || q.includes('overview')) {
      return 'overview';
    }
    if (q.includes('profile') || q.includes('rubric') || q.includes('gaps') || q.includes('weaknesses')) {
      return 'profile';
    }
    if (q.includes('quarter') || q.includes('this quarter') || q.includes('quarterly')) {
      return 'quarterly';
    }
    if (q.includes('timeline') || q.includes('roadmap') || q.includes('milestones')) {
      return 'timeline';
    }
    if (q.includes('parallel') || q.includes('undecided') || q.includes('both') || q.includes('paths')) {
      return 'parallel';
    }
    if (q.includes('time') || q.includes('hours') || q.includes('capacity') || q.includes('overcommit')) {
      return 'time';
    }

    return 'overview'; // Default to overview
  }

  /**
   * Synthesize overview response (full strategic plan)
   */
  private synthesizeOverviewResponse(results: IntelligenceResult[], facts: FactSet): string {
    const sections: string[] = [];

    // Header
    sections.push('# Your Strategic Game Plan\n');

    // TYPE-001: Identity Synthesis
    const synthesis = results.find((r) => r.type_id === 'TYPE-001');
    if (synthesis && synthesis.data) {
      const data = synthesis.data as any;
      sections.push(`## Your Unique Identity\n`);
      sections.push(`**Narrative Thread:** ${data.target_profile?.narrative_thread || 'Not yet defined'}\n`);
      sections.push(`**Identity Fusion:** ${data.target_profile?.identity_fusion || 'Exploring'}\n`);
      sections.push(`**Positioning:** ${data.target_profile?.unique_positioning?.join(', ') || 'Developing'}\n`);
    }

    // TYPE-002: Weak Spots + Priority Actions
    const weakSpots = results.find((r) => r.type_id === 'TYPE-002');
    if (weakSpots && weakSpots.data) {
      const data = weakSpots.data as any;
      sections.push(`\n## Priority Focus Areas\n`);
      const p0Actions = data.prioritized_actions?.filter((a: any) => a.priority === 'P0') || [];
      if (p0Actions.length > 0) {
        sections.push('**Critical (P0):**');
        p0Actions.slice(0, 3).forEach((action: any) => {
          sections.push(`- ${action.action} (${action.dimension})`);
        });
      }
    }

    // TYPE-003: Quarterly Timeline
    const timeline = results.find((r) => r.type_id === 'TYPE-003');
    if (timeline && timeline.data) {
      const data = timeline.data as any;
      sections.push(`\n## Quarterly Roadmap\n`);
      const plans = data.quarterly_plans || [];
      plans.slice(0, 3).forEach((plan: any) => {
        sections.push(`\n**Q${plan.quarter}: ${plan.goal}**`);
        const topMilestones = plan.key_milestones?.slice(0, 3) || [];
        topMilestones.forEach((m: any) => {
          sections.push(`- ${m.title || m}`);
        });
      });
    }

    // TYPE-007: Time Allocation
    const timeMath = results.find((r) => r.type_id === 'TYPE-007');
    if (timeMath && timeMath.data) {
      const data = timeMath.data as any;
      const currentPlan = data.time_plans?.[0];
      if (currentPlan) {
        sections.push(`\n## Time Architecture\n`);
        sections.push(`**Status:** ${currentPlan.weekly_allocation?.capacity_status || 'Unknown'}`);
        sections.push(`**Deep Work:** ${currentPlan.weekly_allocation?.allocated_discretionary?.deep_work || 0}h/week`);
        sections.push(`**Buffer:** ${currentPlan.weekly_allocation?.allocated_discretionary?.buffer || 0}h/week`);
      }
    }

    return sections.join('\n');
  }

  /**
   * Synthesize profile/gaps response
   */
  private synthesizeProfileResponse(results: IntelligenceResult[], facts: FactSet): string {
    const sections: string[] = [];
    sections.push('# Your Current Profile\n');

    // TYPE-002: Weak Spots
    const weakSpots = results.find((r) => r.type_id === 'TYPE-002');
    if (weakSpots && weakSpots.data) {
      const data = weakSpots.data as any;
      sections.push(`## Profile Gaps Analysis\n`);

      // Group by priority
      const actions = data.prioritized_actions || [];
      const byPriority = {
        P0: actions.filter((a: any) => a.priority === 'P0'),
        P1: actions.filter((a: any) => a.priority === 'P1'),
        P2: actions.filter((a: any) => a.priority === 'P2'),
        P3: actions.filter((a: any) => a.priority === 'P3'),
      };

      if (byPriority.P0.length > 0) {
        sections.push(`\n**Critical Gaps (P0):** ${byPriority.P0.length} areas need immediate attention`);
        byPriority.P0.forEach((action: any) => {
          sections.push(`- **${action.dimension}**: ${action.action} (Gap: ${action.gap?.toFixed(1)})`);
        });
      }

      if (byPriority.P1.length > 0) {
        sections.push(`\n**High Priority (P1):** ${byPriority.P1.length} areas`);
        byPriority.P1.slice(0, 3).forEach((action: any) => {
          sections.push(`- ${action.dimension}: ${action.action}`);
        });
      }
    }

    return sections.join('\n');
  }

  /**
   * Synthesize quarterly focus response
   */
  private synthesizeQuarterlyResponse(results: IntelligenceResult[], facts: FactSet): string {
    const sections: string[] = [];

    // TYPE-003: Timeline
    const timeline = results.find((r) => r.type_id === 'TYPE-003');
    if (timeline && timeline.data) {
      const data = timeline.data as any;
      const currentPlan = data.quarterly_plans?.[0];

      if (currentPlan) {
        sections.push(`# Quarter ${currentPlan.quarter} Focus\n`);
        sections.push(`**Goal:** ${currentPlan.goal}\n`);
        sections.push(`**Weeks:** ${currentPlan.start_week}-${currentPlan.end_week}\n`);
        sections.push(`\n## Key Milestones\n`);
        currentPlan.key_milestones?.forEach((milestone: any) => {
          sections.push(`- ${milestone.title || milestone} (Week ${milestone.target_week || '?'})`);
        });
      }
    }

    // TYPE-006: Quarterly Adaptation
    const adaptation = results.find((r) => r.type_id === 'TYPE-006');
    if (adaptation && adaptation.data) {
      const data = adaptation.data as any;
      if (data.adaptation_actions?.length > 0) {
        sections.push(`\n## Adaptive Actions\n`);
        data.adaptation_actions.slice(0, 5).forEach((action: any) => {
          sections.push(`- ${action.action} (${action.rationale})`);
        });
      }
    }

    return sections.join('\n');
  }

  /**
   * Synthesize timeline/roadmap response
   */
  private synthesizeTimelineResponse(results: IntelligenceResult[], facts: FactSet): string {
    const sections: string[] = [];
    sections.push('# Strategic Timeline (93-Week Framework)\n');

    // TYPE-003: Timeline Architecture
    const timeline = results.find((r) => r.type_id === 'TYPE-003');
    if (timeline && timeline.data) {
      const data = timeline.data as any;
      const plans = data.quarterly_plans || [];

      // Group by phase
      const p1Plans = plans.filter((p: any) => p.phase === 'P1');
      const p2Plans = plans.filter((p: any) => p.phase === 'P2');
      const p3Plans = plans.filter((p: any) => p.phase === 'P3');

      if (p1Plans.length > 0) {
        sections.push(`\n## Phase 1: Foundation (Q1-Q4)\n`);
        p1Plans.forEach((plan: any) => {
          sections.push(`**Q${plan.quarter}:** ${plan.goal}`);
        });
      }

      if (p2Plans.length > 0) {
        sections.push(`\n## Phase 2: Build (Q5-Q7)\n`);
        p2Plans.forEach((plan: any) => {
          sections.push(`**Q${plan.quarter}:** ${plan.goal}`);
        });
      }

      if (p3Plans.length > 0) {
        sections.push(`\n## Phase 3: Decision (Q8-Q9)\n`);
        p3Plans.forEach((plan: any) => {
          sections.push(`**Q${plan.quarter}:** ${plan.goal}`);
        });
      }

      // Critical path
      if (data.critical_path) {
        sections.push(`\n## Critical Path\n`);
        sections.push(`**Risk Score:** ${data.critical_path.risk_score?.toFixed(2) || 'Unknown'}`);
        sections.push(`**Longest Chain:** ${data.critical_path.longest_chain?.length || 0} P0 milestones`);
      }
    }

    return sections.join('\n');
  }

  /**
   * Synthesize parallel paths response (for undecided students)
   */
  private synthesizeParallelPathsResponse(results: IntelligenceResult[], facts: FactSet): string {
    const sections: string[] = [];
    sections.push('# Parallel Paths Exploration\n');

    // TYPE-004: Multi-Path Convergence
    const multiPath = results.find((r) => r.type_id === 'TYPE-004');
    if (multiPath && multiPath.data) {
      const data = multiPath.data as any;

      sections.push(`**Status:** ${data.overall_status || 'Exploring'}\n`);

      if (data.paths && data.paths.length > 0) {
        sections.push(`\n## Your Paths\n`);
        data.paths.forEach((path: any) => {
          sections.push(`\n**${path.path_name}**`);
          sections.push(`- Viability: ${(path.viability_score * 100).toFixed(0)}%`);
          sections.push(`- Supporting Activities: ${path.supporting_activities?.length || 0}`);
        });
      }

      if (data.convergence_opportunities && data.convergence_opportunities.length > 0) {
        sections.push(`\n## Convergence Opportunities\n`);
        data.convergence_opportunities.forEach((opp: any) => {
          sections.push(`- **${opp.convergence_point}**: ${opp.rationale}`);
        });
      }

      if (data.recommendation) {
        sections.push(`\n## Recommendation\n`);
        sections.push(data.recommendation.action);
        sections.push(`\n*Rationale:* ${data.recommendation.rationale}`);
      }
    }

    return sections.join('\n');
  }

  /**
   * Synthesize time allocation response
   */
  private synthesizeTimeAllocationResponse(results: IntelligenceResult[], facts: FactSet): string {
    const sections: string[] = [];
    sections.push('# Time Architecture & Capacity\n');

    // TYPE-007: Time Mathematician
    const timeMath = results.find((r) => r.type_id === 'TYPE-007');
    if (timeMath && timeMath.data) {
      const data = timeMath.data as any;

      sections.push(`**Overall Feasibility:** ${data.overall_feasibility}\n`);

      const currentPlan = data.time_plans?.[0];
      if (currentPlan) {
        const alloc = currentPlan.weekly_allocation;
        sections.push(`\n## Current Week Allocation\n`);
        sections.push(`**Status:** ${alloc.capacity_status}`);
        sections.push(`**Total Committed:** ${alloc.total_committed_hours}h / ${alloc.discretionary_hours}h discretionary`);
        sections.push(`**Deep Work:** ${alloc.allocated_discretionary?.deep_work || 0}h`);
        sections.push(`**Buffer:** ${alloc.allocated_discretionary?.buffer || 0}h`);

        if (alloc.overcommitment_hours) {
          sections.push(`\n⚠️ **Overcommitted by ${alloc.overcommitment_hours.toFixed(0)}h** - optimizations needed`);
        }

        // Optimizations
        if (currentPlan.optimizations && currentPlan.optimizations.length > 0) {
          sections.push(`\n## Recommended Optimizations\n`);
          const drops = currentPlan.optimizations.filter((o: any) => o.action === 'Drop');
          const reduces = currentPlan.optimizations.filter((o: any) => o.action === 'Reduce');

          if (drops.length > 0) {
            sections.push(`\n**Drop (Low ROI):**`);
            drops.forEach((opt: any) => {
              sections.push(`- ${opt.activity} (ROI: ${opt.roi_per_hour.toFixed(2)}) - ${opt.rationale}`);
            });
          }

          if (reduces.length > 0) {
            sections.push(`\n**Reduce:**`);
            reduces.slice(0, 3).forEach((opt: any) => {
              sections.push(`- ${opt.activity}: ${opt.current_hours}h → ${opt.recommended_hours}h`);
            });
          }
        }
      }

      // Summary
      if (data.summary) {
        sections.push(`\n## Overall Summary\n`);
        sections.push(`- Total Activities: ${data.summary.total_activities}`);
        sections.push(`- High ROI Activities: ${data.summary.high_roi_activities}`);
        sections.push(`- Low ROI Activities: ${data.summary.low_roi_activities}`);
      }
    }

    return sections.join('\n');
  }

  /**
   * Default synthesis (fallback)
   */
  private synthesizeDefaultResponse(results: IntelligenceResult[], facts: FactSet): string {
    const sections: string[] = [];
    sections.push('# Strategic Insights\n');

    results.forEach((result) => {
      if (result.data) {
        sections.push(`\n## ${result.type_id}\n`);
        sections.push(this.formatIntelligenceResult(result));
      }
    });

    return sections.join('\n');
  }

  /**
   * Format individual intelligence result
   */
  protected formatIntelligenceResult(result: IntelligenceResult): string {
    // Custom formatting per intelligence type
    switch (result.type_id) {
      case 'TYPE-001':
        return this.formatGamePlanSynthesis(result);
      case 'TYPE-002':
        return this.formatWeakSpotPrioritization(result);
      case 'TYPE-003':
        return this.formatTimelineArchitecture(result);
      case 'TYPE-004':
        return this.formatMultiPathConvergence(result);
      case 'TYPE-006':
        return this.formatQuarterlyAdaptation(result);
      case 'TYPE-007':
        return this.formatTimeMathematician(result);
      default:
        return JSON.stringify(result.data, null, 2);
    }
  }

  /**
   * Format TYPE-001: Game Plan Synthesis
   */
  private formatGamePlanSynthesis(result: IntelligenceResult): string {
    const data = result.data as any;
    const profile = data.target_profile || {};
    return `**Identity Fusion:** ${profile.identity_fusion || 'Not defined'}\n**Narrative:** ${profile.narrative_thread || 'Developing'}`;
  }

  /**
   * Format TYPE-002: Weak Spot Prioritization
   */
  private formatWeakSpotPrioritization(result: IntelligenceResult): string {
    const data = result.data as any;
    const actions = data.prioritized_actions || [];
    const p0Count = actions.filter((a: any) => a.priority === 'P0').length;
    return `**Critical Gaps:** ${p0Count}\n**Total Actions:** ${actions.length}`;
  }

  /**
   * Format TYPE-003: Timeline Architecture
   */
  private formatTimelineArchitecture(result: IntelligenceResult): string {
    const data = result.data as any;
    const plans = data.quarterly_plans || [];
    return `**Quarters Planned:** ${plans.length}\n**Total Milestones:** ${data.total_milestones || 0}`;
  }

  /**
   * Format TYPE-004: Multi-Path Convergence
   */
  private formatMultiPathConvergence(result: IntelligenceResult): string {
    const data = result.data as any;
    const paths = data.paths || [];
    return `**Paths Exploring:** ${paths.length}\n**Status:** ${data.overall_status || 'Unknown'}`;
  }

  /**
   * Format TYPE-006: Quarterly Adaptation
   */
  private formatQuarterlyAdaptation(result: IntelligenceResult): string {
    const data = result.data as any;
    const actions = data.adaptation_actions || [];
    return `**Progress Status:** ${data.progress_status || 'Unknown'}\n**Adaptive Actions:** ${actions.length}`;
  }

  /**
   * Format TYPE-007: Time Mathematician
   */
  private formatTimeMathematician(result: IntelligenceResult): string {
    const data = result.data as any;
    const feasibility = data.overall_feasibility || 'Unknown';
    return `**Feasibility:** ${feasibility}\n**Critical Quarters:** ${data.critical_capacity_quarters?.length || 0}`;
  }
}

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
 * v29.4 Changes (A2A Handover Synthesis Fix):
 * - Priority Focus Areas: Now PRIORITIZES TYPE-086 (from A2A handover) over TYPE-002
 * - Quarterly Roadmap: Integrates TYPE-086 action recommendations with TYPE-003 timeline
 * - Rationale: Assessment's rubric-based gap analysis (TYPE-085/086) is more accurate
 *   than GamePlan's own weak spot detection, following real game plan report structure
 *
 * Created: 2025-10-29
 * Architecture: v3.0 Intelligence Types
 * Last Updated: 2025-11-04 (v29.4)
 */

import { BaseAgentWithIntelligence } from './BaseAgentWithIntelligence.js';
import { FactStore } from '../../facts/FactStore.js';
import { FactCategory, AgentQuery, Fact } from '../../facts/types.js';
import { IntelligenceType, IntelligenceResult } from '../../intelligence/types/BaseIntelligenceType.js';
import { IntelligenceRegistry } from '../../intelligence/IntelligenceRegistry.js';
import { createLogger } from '../../../../../packages/observability/dist/unified-logger.js';
import { FactSet } from '../../facts/FactSet.js';
import type { Pool } from 'pg';
import { FactCategoryMapper } from '../../facts/FactCategoryMapper.js';
import { HandoverPayloadExtractor, type AssessmentHandoverPayload } from '../../a2a/HandoverPayloadExtractor.js';

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
  private pool: Pool;

  /**
   * Domain-specific intelligence types for GamePlan
   */
  protected DOMAIN_INTELLIGENCE: IntelligenceType[] = [];

  constructor(factStore: FactStore, pool: Pool) {
    super('gameplan-agent-v3', factStore);
    this.pool = pool;

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
          log.event('gameplan_agent.missing_intelligence_type', { type_id: typeId }, 'warn');
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
   * v29.3: Override handleQuery to inject handover intelligence results
   *
   * Problem: GamePlan was reloading facts from database, losing intelligence
   * results (TYPE-085, TYPE-086) passed via handover payload.
   *
   * Solution: Check for handover payload first, extract intelligence results
   * using HandoverPayloadExtractor, then call super.handleQuery with injected results.
   *
   * Universal Pattern: This approach can be replicated in Execution, Awards, etc.
   */
  async handleQuery(query: AgentQuery): Promise<any> {
    // v29.3: Check for A2A handover payload in metadata
    const handoverPayload = query.metadata?.handover_payload as AssessmentHandoverPayload | undefined;

    console.log('[GP_v29.3_HANDOVER] 🔍 Checking for handover payload...', {
      has_payload: !!handoverPayload,
      payload_keys: handoverPayload ? Object.keys(handoverPayload) : [],
    });

    if (handoverPayload && HandoverPayloadExtractor.isPayloadSufficient(handoverPayload)) {
      console.log('[GP_v29.3_HANDOVER] ✅ Handover payload found with sufficient data!', {
        ivy_score: handoverPayload.ivy_score,
        competitiveness_tier: handoverPayload.competitiveness_tier,
        total_score: handoverPayload.rubric_scores.total,
        p0_gaps: handoverPayload.p0_gaps.length,
        p1_gaps: handoverPayload.p1_gaps.length,
      });

      // Extract intelligence results from handover payload (instead of reloading from DB)
      const injectedIntelligence = HandoverPayloadExtractor.extractAllIntelligenceResults(handoverPayload);

      console.log('[GP_v29.3_HANDOVER] 🎯 Injected intelligence results:', {
        count: injectedIntelligence.length,
        types: injectedIntelligence.map((r) => r.type_id),
        triggered: injectedIntelligence.filter((r) => r.triggered).length,
      });

      // Store injected results in query metadata for base class to use
      query.metadata = {
        ...query.metadata,
        injected_intelligence_results: injectedIntelligence,
        handover_intelligence_used: true,
      };

      console.log('[GP_v29.3_HANDOVER] 🚀 Proceeding with handover intelligence (NO database reload)');
    } else {
      console.log('[GP_v29.3_HANDOVER] ℹ️ No sufficient handover payload, proceeding with normal fact loading from database');
    }

    // Call parent handleQuery (will use injected intelligence if available)
    return super.handleQuery(query);
  }

  /**
   * Required facts for GamePlan agent
   * v28.4: Relaxed to only STUDENT_PROFILE for A2A handover compatibility
   * GamePlan can work with partial data and ask follow-up questions
   */
  protected getRequiredFacts(): FactCategory[] {
    return [
      FactCategory.STUDENT_PROFILE,
      // v28.4: Made optional - GamePlan can work without these initially
      // FactCategory.ASSESSMENT_DATA,
      // FactCategory.ACTIVITY_DATA,
    ];
  }

  /**
   * v28.1 OVERRIDE: Load facts from kb_items with source_ref=gpt4o_conversational_extraction_v28
   * This ensures GamePlan can access facts collected by Assessment Agent
   */
  protected async loadFacts(entityId: string): Promise<FactSet> {
    console.log('[GP_v28_LOAD] 🔍 Loading facts for:', entityId);
    log.event('gameplan_agent.load_facts_v28_start', {
      entity_id: entityId,
      source_ref: 'gpt4o_conversational_extraction_v28',
    });

    try {
      // Query all v28.1 facts for this student
      console.log('[GP_v28_LOAD] 📊 Querying kb_items table...');
      const result = await this.pool.query(
        `SELECT item_type, edges, created_ts
         FROM kb_items
         WHERE student_id = $1 AND source_ref = 'gpt4o_conversational_extraction_v28'
         ORDER BY created_ts DESC`,
        [entityId]
      );

      console.log('[GP_v28_LOAD] ✅ Query complete. Rows found:', result.rows.length);
      log.event('gameplan_agent.load_facts_v28_loaded', {
        entity_id: entityId,
        kb_items_count: result.rows.length,
      });

      // Convert kb_items to Fact[] array
      const facts: Fact[] = [];

      for (const row of result.rows) {
        const category = FactCategoryMapper.mapFromItemType(row.item_type);
        const edges = row.edges || {};

        log.event('gameplan_agent.load_facts_v28_processing_row', {
          item_type: row.item_type,
          category,
          edges_keys: Object.keys(edges),
        });

        // Extract all fields from edges (except v28_metadata)
        for (const [fact_type, value] of Object.entries(edges)) {
          if (fact_type === 'v28_metadata') continue;

          facts.push({
            entity_id: entityId,
            category,
            fact_type,
            value,
            confidence: (edges as any).v28_metadata?.confidence || 0.8,
            quality_score: (edges as any).v28_metadata?.quality_score || 7,
            source: 'gpt4o_conversational_extraction_v28',
            timestamp: row.created_ts,
          });
        }
      }

      log.event('gameplan_agent.load_facts_v28_complete', {
        entity_id: entityId,
        facts_count: facts.length,
        by_category: this.getRequiredFacts().map((cat) => ({
          category: cat,
          count: facts.filter((f) => f.category === cat).length,
        })),
      });

      return new FactSet(facts);
    } catch (error) {
      log.error('gameplan_agent.load_facts_v28_error', {
        entity_id: entityId,
        error: String(error),
      });
      return new FactSet([]);
    }
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
   * v29.3.2: Added TYPE-085/TYPE-086 support for A2A handover payloads
   */
  private synthesizeOverviewResponse(results: IntelligenceResult[], facts: FactSet): string {
    console.log('[GP_v29.3.4_ENTRY] 🚀 synthesizeOverviewResponse CALLED!', {
      results_count: results.length,
      results_types: results.map((r) => r.type_id),
      triggered_count: results.filter((r) => r.triggered).length,
    });

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

    // v29.4: Priority Focus Areas - ALWAYS prefer TYPE-086 (A2A handover) over TYPE-002
    // Rationale: TYPE-086 comes from Assessment's rubric-based gap analysis which is more accurate
    // than GamePlan's own TYPE-002 weak spot detection. TYPE-002 is only a fallback.
    const gapAnalyzer = results.find((r) => r.type_id === 'TYPE-086');
    const weakSpots = results.find((r) => r.type_id === 'TYPE-002');

    console.log('[GP_v29.4_PRIORITY] 🎯 Priority Focus Areas data sources:', {
      has_TYPE_086: !!gapAnalyzer,
      has_TYPE_002: !!weakSpots,
      will_use: gapAnalyzer ? 'TYPE-086 (A2A handover)' : (weakSpots ? 'TYPE-002 (fallback)' : 'none'),
    });

    if (gapAnalyzer && gapAnalyzer.data) {
      // TYPE-086: Gap Priority Analyzer (from A2A handover - PREFERRED)
      const data = gapAnalyzer.data as any;
      const prioritized_gaps = data.prioritized_gaps || [];

      console.log('[GP_v29.4_086] TYPE-086 gap data:', {
        prioritized_gaps_count: prioritized_gaps.length,
        data_keys: Object.keys(data),
        first_gap: prioritized_gaps[0],
      });

      sections.push(`\n## Priority Focus Areas\n`);

      // Show P0 gaps (highest priority weak spots)
      const p0Gaps = prioritized_gaps.filter((g: any) => g.priority === 'P0');
      console.log('[GP_v29.4_086] P0 gaps:', { count: p0Gaps.length, sample: p0Gaps[0] });

      if (p0Gaps.length > 0) {
        sections.push('**Critical Gaps (P0) - Must Address:**');
        p0Gaps.slice(0, 3).forEach((gap: any) => {
          const actions = gap.recommended_actions || [];
          const action = actions[0] || `Address ${gap.dimension} gap`;
          sections.push(`- ${action} (${gap.dimension}, Gap: ${gap.gap_size.toFixed(1)})`);
        });
      }

      // Show P1 gaps if no P0 (or as secondary priorities)
      const p1Gaps = prioritized_gaps.filter((g: any) => g.priority === 'P1');
      console.log('[GP_v29.4_086] P1 gaps:', { count: p1Gaps.length });

      if (p1Gaps.length > 0 && p0Gaps.length === 0) {
        sections.push('**High Priority (P1):**');
        p1Gaps.slice(0, 3).forEach((gap: any) => {
          const actions = gap.recommended_actions || [];
          const action = actions[0] || `Address ${gap.dimension} gap`;
          sections.push(`- ${action} (${gap.dimension}, Gap: ${gap.gap_size.toFixed(1)})`);
        });
      }

      // Show Quick Wins
      const quickWins = data.quick_wins || [];
      console.log('[GP_v29.4_086] Quick wins:', { count: quickWins.length, wins: quickWins });

      if (quickWins.length > 0) {
        sections.push('\n**Quick Wins (2-4 weeks):**');
        quickWins.slice(0, 2).forEach((win: any) => {
          sections.push(`- ${win.action} (Impact: ${win.impact})`);
        });
      }
    } else if (weakSpots && weakSpots.data) {
      // TYPE-002: Weak Spots + Priority Actions (fallback when no A2A handover)
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

    // v29.4: Quarterly Roadmap - Integrate TYPE-086 action recommendations with TYPE-003 timeline
    // Rationale: Roadmap should map tactical "boosters" (actions) to prioritized gaps from TYPE-086
    const timeline = results.find((r) => r.type_id === 'TYPE-003');

    sections.push(`\n## Quarterly Roadmap\n`);

    if (gapAnalyzer && gapAnalyzer.data && timeline && timeline.data) {
      // BEST CASE: Both TYPE-086 gaps and TYPE-003 timeline available
      const gapData = gapAnalyzer.data as any;
      const timelineData = timeline.data as any;
      const plans = timelineData.quarterly_plans || [];
      const prioritized_gaps = gapData.prioritized_gaps || [];

      console.log('[GP_v29.4_ROADMAP] Building integrated roadmap:', {
        has_gaps: prioritized_gaps.length > 0,
        has_timeline: plans.length > 0,
      });

      // Map P0 gaps to quarterly actions
      const p0Gaps = prioritized_gaps.filter((g: any) => g.priority === 'P0');
      if (p0Gaps.length > 0 && plans.length > 0) {
        plans.slice(0, 3).forEach((plan: any, idx: number) => {
          sections.push(`\n**Q${plan.quarter}: ${plan.goal}**`);

          // Show timeline milestones
          const topMilestones = plan.key_milestones?.slice(0, 2) || [];
          topMilestones.forEach((m: any) => {
            sections.push(`- ${m.title || m}`);
          });

          // Add relevant P0 gap actions for this quarter
          const relevantGap = p0Gaps[idx];
          if (relevantGap && relevantGap.recommended_actions) {
            const action = relevantGap.recommended_actions[0];
            sections.push(`- **Focus:** ${action} (${relevantGap.dimension})`);
          }
        });
      }
    } else if (gapAnalyzer && gapAnalyzer.data) {
      // FALLBACK 1: Only TYPE-086 available (no timeline) - create action-based roadmap
      const gapData = gapAnalyzer.data as any;
      const prioritized_gaps = gapData.prioritized_gaps || [];
      const p0Gaps = prioritized_gaps.filter((g: any) => g.priority === 'P0');

      console.log('[GP_v29.4_ROADMAP] Building gap-based roadmap (no timeline):', {
        p0_gaps: p0Gaps.length,
      });

      if (p0Gaps.length > 0) {
        sections.push('**Immediate Actions (Next 3 Months):**');
        p0Gaps.slice(0, 3).forEach((gap: any) => {
          const actions = gap.recommended_actions || [];
          actions.slice(0, 2).forEach((action: string) => {
            sections.push(`- ${action} (${gap.dimension})`);
          });
        });
      }
    } else if (timeline && timeline.data) {
      // FALLBACK 2: Only TYPE-003 available (no gaps) - standard timeline
      const data = timeline.data as any;
      const plans = data.quarterly_plans || [];
      plans.slice(0, 3).forEach((plan: any) => {
        sections.push(`\n**Q${plan.quarter}: ${plan.goal}**`);
        const topMilestones = plan.key_milestones?.slice(0, 3) || [];
        topMilestones.forEach((m: any) => {
          sections.push(`- ${m.title || m}`);
        });
      });
    } else {
      // NO DATA: Show placeholder
      sections.push('*Roadmap will be generated after initial assessment*');
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

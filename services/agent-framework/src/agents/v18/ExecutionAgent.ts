/**
 * ExecutionAgent (v20.5 Complete - All 16 Intelligence Types)
 * Jenny's Digital Twin - Master Orchestrator for Weekly Execution
 *
 * Purpose: Drives tactical execution across all college prep domains using
 * Jenny's 16 execution frameworks extracted from 93-week coaching sessions.
 *
 * Architecture: Extends BaseAgentWithIntelligence, composes 14 domain-specific
 * intelligence types + 2 universal types (all 16 complete in v20.5)
 *
 * Complete Intelligence Types (16 total):
 * v20.0: TYPE-049 (Execution Ladder), TYPE-050 (Outcome Engineering)
 * v20.1: TYPE-051 (Task Decomposition), TYPE-052 (Portfolio Cadence), TYPE-061 (Delegation), TYPE-063 (Progress Velocity)
 * v20.2: TYPE-053 (Time Architecture), TYPE-054 (Metric Ladder)
 * v20.3: TYPE-055 (Blocking Detection), TYPE-056 (LoR Engineering)
 * v20.4: TYPE-057 (Proof Engineering), TYPE-058 (Application Mastery Rail)
 * v20.5: TYPE-059 (Narrative Harmonization), TYPE-060 (Seasonal Energy), TYPE-062 (Qualitative Transformation)
 * + TYPE-020 (Opportunity Pipeline - UNIVERSAL)
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
   * v20.5 Status: ALL 14 types complete!
   * - TYPE-049 ✅ Execution Ladder Navigation (v20.0)
   * - TYPE-050 ✅ Outcome Engineering (v20.0)
   * - TYPE-051 ✅ Task Decomposition (v20.1)
   * - TYPE-052 ✅ Portfolio Operating Cadence (v20.1)
   * - TYPE-053 ✅ Time Architecture (v20.2)
   * - TYPE-054 ✅ Metric Ladder (v20.2)
   * - TYPE-055 ✅ Blocking Detection (v20.3)
   * - TYPE-056 ✅ LoR Engineering (v20.3)
   * - TYPE-057 ✅ Proof Engineering (v20.4)
   * - TYPE-058 ✅ Application Mastery Rail (v20.4)
   * - TYPE-059 ✅ Narrative Harmonization (v20.5)
   * - TYPE-060 ✅ Seasonal Energy Allocation (v20.5)
   * - TYPE-061 ✅ Multi-Agent Delegation (v20.1)
   * - TYPE-062 ✅ Qualitative Transformation (v20.5)
   * - TYPE-063 ✅ Progress Velocity (v20.1)
   */
  protected DOMAIN_INTELLIGENCE: IntelligenceType[] = [];

  constructor(factStore: FactStore) {
    super('execution-agent-v20', factStore);

    // Load domain-specific intelligence types from registry
    this.DOMAIN_INTELLIGENCE = [
      IntelligenceRegistry.get('TYPE-049'), // Execution Ladder Navigation ✅
      IntelligenceRegistry.get('TYPE-050'), // Outcome Engineering ✅
      IntelligenceRegistry.get('TYPE-051'), // Task Decomposition ✅
      IntelligenceRegistry.get('TYPE-052'), // Portfolio Operating Cadence ✅
      IntelligenceRegistry.get('TYPE-053'), // Time Architecture ✅
      IntelligenceRegistry.get('TYPE-054'), // Metric Ladder ✅
      IntelligenceRegistry.get('TYPE-055'), // Blocking Detection ✅
      IntelligenceRegistry.get('TYPE-056'), // LoR Engineering ✅
      IntelligenceRegistry.get('TYPE-057'), // Proof Engineering ✅
      IntelligenceRegistry.get('TYPE-058'), // Application Mastery Rail ✅
      IntelligenceRegistry.get('TYPE-059'), // Narrative Harmonization ✅
      IntelligenceRegistry.get('TYPE-060'), // Seasonal Energy Allocation ✅
      IntelligenceRegistry.get('TYPE-061'), // Multi-Agent Delegation ✅
      IntelligenceRegistry.get('TYPE-062'), // Qualitative Transformation ✅
      IntelligenceRegistry.get('TYPE-063'), // Progress Velocity ✅
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
   * Priority Logic (v20.5 - All 16 types integrated):
   * 1. Progress Velocity (TYPE-063) - How are we performing week-over-week?
   * 2. Execution Ladder Position (TYPE-049) - Where are we on the journey?
   * 3. Time Architecture (TYPE-053) - Do we have capacity for this week's work?
   * 4. Seasonal Energy Allocation (TYPE-060) - Are we exploring/exploiting correctly?
   * 5. Outcome Engineering (TYPE-050) - What should we focus on this week?
   * 6. Task Decomposition (TYPE-051) - Break down P0 outcome into actionable tasks
   * 7. Blocking Detection (TYPE-055) - Any stalled tasks needing escalation?
   * 8. Portfolio Operating Cadence (TYPE-052) - Day-by-day weekly rhythm
   * 9. Metric Ladder (TYPE-054) - Are we tracking M0→M4 milestones with proof?
   * 10. Proof Engineering (TYPE-057) - Do we have 6-component proofpacks?
   * 11. Application Mastery Rail (TYPE-058) - Are all 5 lanes on track? (12th grade)
   * 12. LoR Engineering (TYPE-056) - Are we cultivating recommenders? (11th-12th)
   * 13. Narrative Harmonization (TYPE-059) - Is our story consistent?
   * 14. Qualitative Transformation (TYPE-062) - How are we growing internally?
   * 15. Multi-Agent Delegation (TYPE-061) - Route to specialist agents if needed
   */
  protected async synthesizeResponse(
    intelligenceResults: IntelligenceResult[],
    query: AgentQuery,
    facts: FactSet
  ): Promise<string> {
    const sections: string[] = [];

    // Extract all intelligence results
    const velocityResult = intelligenceResults.find((r) => r.type_id === 'TYPE-063');
    const ladderResult = intelligenceResults.find((r) => r.type_id === 'TYPE-049');
    const timeArchResult = intelligenceResults.find((r) => r.type_id === 'TYPE-053');
    const seasonalEnergyResult = intelligenceResults.find((r) => r.type_id === 'TYPE-060');
    const outcomeResult = intelligenceResults.find((r) => r.type_id === 'TYPE-050');
    const taskDecompResult = intelligenceResults.find((r) => r.type_id === 'TYPE-051');
    const blockingResult = intelligenceResults.find((r) => r.type_id === 'TYPE-055');
    const cadenceResult = intelligenceResults.find((r) => r.type_id === 'TYPE-052');
    const metricLadderResult = intelligenceResults.find((r) => r.type_id === 'TYPE-054');
    const proofEngResult = intelligenceResults.find((r) => r.type_id === 'TYPE-057');
    const appMasteryResult = intelligenceResults.find((r) => r.type_id === 'TYPE-058');
    const lorEngResult = intelligenceResults.find((r) => r.type_id === 'TYPE-056');
    const narrativeResult = intelligenceResults.find((r) => r.type_id === 'TYPE-059');
    const qualitativeResult = intelligenceResults.find((r) => r.type_id === 'TYPE-062');
    const delegationResult = intelligenceResults.find((r) => r.type_id === 'TYPE-061');

    // Section 1: Progress Velocity - start with momentum check
    if (velocityResult && velocityResult.data.trend) {
      sections.push(this.formatProgressVelocity(velocityResult));
    }

    // Section 2: Execution Ladder Position - foundational context
    if (ladderResult && ladderResult.data.ladder_position) {
      sections.push(this.formatLadderPosition(ladderResult));
    }

    // Section 3: Time Architecture (v20.2) - capacity check
    if (timeArchResult && timeArchResult.data) {
      sections.push(this.formatTimeArchitecture(timeArchResult));
    }

    // Section 4: Seasonal Energy Allocation (v20.5) - explore/exploit balance
    if (seasonalEnergyResult && seasonalEnergyResult.data) {
      sections.push(this.formatSeasonalEnergy(seasonalEnergyResult));
    }

    // Section 5: Outcome Engineering - this week's focus
    if (outcomeResult && outcomeResult.data.outcomes_generated) {
      sections.push(this.formatOutcomeEngineering(outcomeResult));
    }

    // Section 6: Task Decomposition - break down P0
    if (taskDecompResult && taskDecompResult.data.outcomes) {
      sections.push(this.formatTaskDecomposition(taskDecompResult));
    }

    // Section 7: Blocking Detection (v20.3) - stalled tasks
    if (blockingResult && blockingResult.data) {
      sections.push(this.formatBlockingDetection(blockingResult));
    }

    // Section 8: Portfolio Operating Cadence - weekly rhythm
    if (cadenceResult && cadenceResult.data.current_day) {
      sections.push(this.formatPortfolioCadence(cadenceResult));
    }

    // Section 9: Metric Ladder (v20.2) - M0→M4 milestones
    if (metricLadderResult && metricLadderResult.data) {
      sections.push(this.formatMetricLadder(metricLadderResult));
    }

    // Section 10: Proof Engineering (v20.4) - proofpack assembly
    if (proofEngResult && proofEngResult.data) {
      sections.push(this.formatProofEngineering(proofEngResult));
    }

    // Section 11: Application Mastery Rail (v20.4) - 5-lane throughput (12th grade)
    if (appMasteryResult && appMasteryResult.data) {
      sections.push(this.formatApplicationMastery(appMasteryResult));
    }

    // Section 12: LoR Engineering (v20.3) - recommendation cultivation (11th-12th)
    if (lorEngResult && lorEngResult.data) {
      sections.push(this.formatLoREngineering(lorEngResult));
    }

    // Section 13: Narrative Harmonization (v20.5) - story consistency
    if (narrativeResult && narrativeResult.data) {
      sections.push(this.formatNarrativeHarmonization(narrativeResult));
    }

    // Section 14: Qualitative Transformation (v20.5) - internal growth
    if (qualitativeResult && qualitativeResult.data) {
      sections.push(this.formatQualitativeTransformation(qualitativeResult));
    }

    // Section 15: Multi-Agent Delegation - if specialist needed
    if (delegationResult && delegationResult.data.delegation_request) {
      sections.push(this.formatDelegation(delegationResult));
    }

    // Section 16: Next Actions Summary
    sections.push(this.formatNextActions(
      velocityResult,
      ladderResult,
      timeArchResult,
      blockingResult,
      outcomeResult,
      taskDecompResult,
      cadenceResult
    ));

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
   * Format progress velocity section (v20.1 NEW)
   */
  private formatProgressVelocity(result: IntelligenceResult): string {
    const data = result.data;
    const trend = data.trend;
    const momentum = data.momentum;
    const recommendations = data.recommendations;

    let output = `## 📊 Progress Velocity & Momentum\n\n`;
    output += `**Current Velocity:** ${trend.current_week_velocity} (${trend.current_week_velocity >= 0.8 ? '✅ On track' : '⚠️ Below target'})\n`;
    output += `**Momentum:** ${momentum.current_momentum.toUpperCase()} (Score: ${momentum.momentum_score}/10)\n`;
    output += `**Week-over-Week Change:** ${trend.week_over_week_change >= 0 ? '+' : ''}${trend.week_over_week_change}%\n`;
    output += `**Consistency Streak:** ${trend.streak_count} week(s) with velocity ≥ 0.8\n\n`;

    if (recommendations.priority === 'celebrate') {
      output += `🎉 **Celebrate!** Strong momentum - ahead of schedule\n\n`;
    } else if (recommendations.priority === 'escalate') {
      output += `🚨 **Escalate:** Velocity critical - immediate intervention needed\n\n`;
    }

    if (recommendations.recommended_actions.length > 0) {
      output += `**Actions:**\n`;
      recommendations.recommended_actions.slice(0, 3).forEach((action: string) => {
        output += `- ${action}\n`;
      });
    }

    return output;
  }

  /**
   * Format task decomposition section (v20.1 NEW)
   */
  private formatTaskDecomposition(result: IntelligenceResult): string {
    const data = result.data;

    let output = `## 🧩 Task Decomposition\n\n`;
    output += `**Total Outcomes:** ${data.outcomes.length}\n`;
    output += `**Execution Items:** ${data.execution_items.length}\n`;
    output += `**Tasks:** ${data.tasks.length}\n`;
    output += `**Estimated Effort:** ${data.total_estimated_hours} hours\n\n`;

    if (data.capacity_warning) {
      output += `${data.capacity_warning}\n\n`;
    }

    // Show P0 outcome breakdown
    if (data.outcomes.length > 0) {
      const p0Outcome = data.outcomes.find((o: any) => o.priority === 'P0');
      if (p0Outcome) {
        output += `### P0 Outcome: ${p0Outcome.outcome_text}\n\n`;

        const p0Items = data.execution_items.filter((item: any) => item.outcome_id === p0Outcome.outcome_id);
        if (p0Items.length > 0) {
          output += `**Execution Items:**\n`;
          p0Items.forEach((item: any, index: number) => {
            output += `${index + 1}. ${item.item_text} (${item.estimated_effort_hours}h)\n`;
          });
          output += `\n`;
        }

        // Show first 5 tasks
        const p0ItemIds = p0Items.map((item: any) => item.item_id);
        const p0Tasks = data.tasks.filter((task: any) => p0ItemIds.includes(task.execution_item_id));
        if (p0Tasks.length > 0) {
          output += `**Tasks (first 5):**\n`;
          p0Tasks.slice(0, 5).forEach((task: any, index: number) => {
            output += `${index + 1}. ${task.task_text} (${task.estimated_effort_minutes}min)\n`;
          });
          output += `\n`;
        }
      }
    }

    return output;
  }

  /**
   * Format portfolio operating cadence section (v20.1 NEW)
   */
  private formatPortfolioCadence(result: IntelligenceResult): string {
    const data = result.data;

    let output = `## 📅 Weekly Operating Cadence\n\n`;
    output += `**Today:** ${data.current_day} (${data.current_phase.toUpperCase()} phase)\n`;
    output += `**Rhythm Health:** ${data.rhythm_health.score}/10\n\n`;

    // Show today's plan
    const todayPlan = data.daily_plans.find((plan: any) => plan.day === data.current_day);
    if (todayPlan) {
      output += `### Today's Focus: ${todayPlan.focus}\n\n`;
      output += `**Time Blocks:**\n`;
      todayPlan.time_blocks.slice(0, 3).forEach((block: any) => {
        output += `- ${block.start_time}: ${block.activity_type} (${block.duration_hours}h)\n`;
      });
      output += `\n`;

      if (todayPlan.proof_target) {
        output += `**Proof Target:** ${todayPlan.proof_target}\n\n`;
      }
    }

    // Show week summary
    output += `**Week Summary:**\n`;
    output += `- Deep Work: ${data.week_summary.total_deep_work_hours}h\n`;
    output += `- Admin: ${data.week_summary.total_admin_hours}h\n`;
    output += `- Communication: ${data.week_summary.total_communication_hours}h\n\n`;

    if (data.rhythm_health.warnings.length > 0) {
      output += `**Warnings:**\n`;
      data.rhythm_health.warnings.slice(0, 2).forEach((warning: string) => {
        output += `- ${warning}\n`;
      });
      output += `\n`;
    }

    return output;
  }

  /**
   * Format multi-agent delegation section (v20.1 NEW)
   */
  private formatDelegation(result: IntelligenceResult): string {
    const data = result.data;

    if (!data.delegation_request) {
      return '';
    }

    let output = `## 🤝 Specialist Delegation\n\n`;
    output += `**Delegating to:** ${data.delegation_request.target_agent}\n`;
    output += `**Reason:** ${data.delegation_request.delegation_reason}\n\n`;

    if (data.synthesized_plan) {
      const plan = data.synthesized_plan;
      output += `**Integrated Execution Plan:**\n`;
      output += `- Weekly Focus: ${plan.weekly_focus}\n`;
      output += `- P0 Outcome: ${plan.p0_outcome}\n`;
      output += `- Total Hours: ${plan.capacity_check.total_hours_required}h (${plan.capacity_check.feasible ? 'Feasible' : 'Over capacity'})\n\n`;

      if (plan.next_steps.length > 0) {
        output += `**Next Steps:**\n`;
        plan.next_steps.forEach((step: string) => {
          output += `${step}\n`;
        });
      }
    }

    return output;
  }

  /**
   * Format time architecture section (v20.2)
   */
  private formatTimeArchitecture(result: IntelligenceResult): string {
    const data = result.data;
    let output = `## ⏰ Time Architecture & Capacity\n\n`;

    output += `**Total Available Hours:** ${data.weekly_capacity.available_hours}h (168h total - ${data.weekly_capacity.fixed_hours}h fixed)\n`;
    output += `**Requested Hours:** ${data.capacity_stress_test.requested_hours}h\n`;
    output += `**Utilization Rate:** ${Math.round(data.capacity_stress_test.utilization_rate * 100)}%\n`;
    output += `**Status:** ${data.capacity_stress_test.status.toUpperCase()}\n\n`;

    if (data.capacity_stress_test.warning_message) {
      output += `${data.capacity_stress_test.warning_message}\n\n`;
    }

    if (data.recommendations.length > 0) {
      output += `**Recommendations:**\n`;
      data.recommendations.slice(0, 3).forEach((rec: string) => {
        output += `- ${rec}\n`;
      });
    }

    return output;
  }

  /**
   * Format seasonal energy allocation section (v20.5)
   */
  private formatSeasonalEnergy(result: IntelligenceResult): string {
    const data = result.data;
    let output = `## 🌱 Seasonal Energy Allocation\n\n`;

    output += `**Current Phase:** ${data.current_phase} (${data.phase_description})\n`;
    output += `**Recommended Ratio:** ${data.recommended_ratio.explore_percentage}% Explore / ${data.recommended_ratio.exploit_percentage}% Exploit\n`;
    output += `**Actual Ratio:** ${data.actual_ratio.explore_percentage}% Explore / ${data.actual_ratio.exploit_percentage}% Exploit\n`;
    output += `**Alignment Score:** ${data.alignment_score}%\n\n`;

    if (data.red_flags.length > 0) {
      output += `**Red Flags:**\n`;
      data.red_flags.forEach((flag: string) => {
        output += `${flag}\n`;
      });
      output += `\n`;
    }

    if (data.recommendations.length > 0) {
      output += `**Recommendations:**\n`;
      data.recommendations.slice(0, 3).forEach((rec: string) => {
        output += `- ${rec}\n`;
      });
    }

    return output;
  }

  /**
   * Format blocking detection section (v20.3)
   */
  private formatBlockingDetection(result: IntelligenceResult): string {
    const data = result.data;
    if (!data.blocked_tasks || data.blocked_tasks.length === 0) {
      return '';
    }

    let output = `## 🚧 Blocking Detection & Escalation\n\n`;
    output += `**Blocked Tasks:** ${data.blocked_tasks.length}\n`;
    output += `**Critical Blocks (P0):** ${data.blocked_tasks.filter((t: any) => t.priority === 'P0').length}\n\n`;

    if (data.escalation_recommendations.length > 0) {
      output += `### Escalation Recommendations\n\n`;
      data.escalation_recommendations.slice(0, 3).forEach((rec: any) => {
        output += `**${rec.task_id}** - Strategy: ${rec.strategy.toUpperCase()}\n`;
        output += `- Rationale: ${rec.rationale}\n`;
        output += `- Success Probability: ${Math.round(rec.success_probability * 100)}%\n`;
        if (rec.action_steps.length > 0) {
          output += `- Actions: ${rec.action_steps[0]}\n`;
        }
        output += `\n`;
      });
    }

    return output;
  }

  /**
   * Format metric ladder section (v20.2)
   */
  private formatMetricLadder(result: IntelligenceResult): string {
    const data = result.data;
    if (!data.project_milestones || data.project_milestones.length === 0) {
      return '';
    }

    let output = `## 📊 Metric Ladder (M0→M4 Milestones)\n\n`;

    const featured = data.project_milestones[0];
    if (featured) {
      output += `**Featured Project:** ${featured.project_name}\n`;
      output += `**Current Milestone:** ${featured.current_milestone.level}\n`;
      output += `**Progress:** ${Math.round(featured.current_milestone.completion_percentage)}%\n\n`;

      if (featured.recommendations.length > 0) {
        output += `**Next Steps:**\n`;
        featured.recommendations.slice(0, 3).forEach((rec: string) => {
          output += `- ${rec}\n`;
        });
      }
    }

    return output;
  }

  /**
   * Format proof engineering section (v20.4)
   */
  private formatProofEngineering(result: IntelligenceResult): string {
    const data = result.data;
    if (!data.proofpacks || data.proofpacks.length === 0) {
      return '';
    }

    let output = `## 📦 Proof Engineering\n\n`;
    output += `**Total Proofpacks:** ${data.proofpacks.length}\n`;
    output += `**Average Completeness:** ${Math.round(data.proofpacks.reduce((sum: number, p: any) => sum + p.completeness_score, 0) / data.proofpacks.length)}%\n\n`;

    const incomplete = data.proofpacks.filter((p: any) => !p.can_pitch);
    if (incomplete.length > 0) {
      output += `**Incomplete Proofpacks (${incomplete.length}):**\n`;
      incomplete.slice(0, 2).forEach((pack: any) => {
        output += `- ${pack.achievement_name} (${pack.completeness_score}% complete)\n`;
      });
      output += `\n`;
    }

    return output;
  }

  /**
   * Format application mastery rail section (v20.4)
   */
  private formatApplicationMastery(result: IntelligenceResult): string {
    const data = result.data;
    let output = `## 🎓 Application Mastery Rail (5-Lane Throughput)\n\n`;

    output += `**Weeks Until Deadline:** ${data.weeks_until_deadline}\n`;
    output += `**Overall Progress:** ${Math.round(data.overall_progress_percentage)}%\n`;
    output += `**Status:** ${data.status.toUpperCase()}\n\n`;

    if (data.bottleneck_lane) {
      output += `**Bottleneck Lane:** ${data.bottleneck_lane.lane_name} (${Math.round(data.bottleneck_lane.completion_percentage)}% complete)\n\n`;
    }

    if (data.recommendations.focus_this_week) {
      output += `**Focus This Week:** ${data.recommendations.focus_this_week}\n`;
    }

    return output;
  }

  /**
   * Format LoR engineering section (v20.3)
   */
  private formatLoREngineering(result: IntelligenceResult): string {
    const data = result.data;
    if (!data.touch_sequences || data.touch_sequences.length === 0) {
      return '';
    }

    let output = `## 💌 LoR Engineering (4-Touch Sequence)\n\n`;
    output += `**Recommenders in Pipeline:** ${data.touch_sequences.length}\n\n`;

    const activeSequence = data.touch_sequences[0];
    if (activeSequence && activeSequence.next_touch) {
      output += `**Next Touch Due:**\n`;
      output += `- Recommender: ${activeSequence.target_name}\n`;
      output += `- Touch Type: ${activeSequence.next_touch.touch_type.toUpperCase()}\n`;
      output += `- Target Week: Week ${activeSequence.next_touch.target_week}\n`;
      output += `- Action: ${activeSequence.next_touch.action_items[0]}\n`;
    }

    return output;
  }

  /**
   * Format narrative harmonization section (v20.5)
   */
  private formatNarrativeHarmonization(result: IntelligenceResult): string {
    const data = result.data;
    let output = `## 📖 Narrative Harmonization\n\n`;

    output += `**Alignment Score:** ${Math.round(data.alignment_score * 100)}%\n`;
    output += `**Surfaces Analyzed:** ${data.surface_analyses.length}\n\n`;

    if (data.red_flags.length > 0) {
      output += `**Red Flags:**\n`;
      data.red_flags.slice(0, 2).forEach((flag: any) => {
        output += `- ${flag.contradiction}\n`;
      });
      output += `\n`;
    }

    if (data.recommendations.length > 0) {
      output += `**Recommendations:**\n`;
      data.recommendations.slice(0, 2).forEach((rec: string) => {
        output += `- ${rec}\n`;
      });
    }

    return output;
  }

  /**
   * Format qualitative transformation section (v20.5)
   */
  private formatQualitativeTransformation(result: IntelligenceResult): string {
    const data = result.data;
    let output = `## 🌟 Qualitative Transformation\n\n`;

    if (data.confidence_scores.length > 0) {
      const avgDelta = data.confidence_scores.reduce((sum: number, s: any) => sum + s.delta, 0) / data.confidence_scores.length;
      output += `**Average Confidence Growth:** ${avgDelta >= 0 ? '+' : ''}${avgDelta.toFixed(1)} points\n\n`;
    }

    if (data.grit_examples.length > 0) {
      output += `**Grit Examples:** ${data.grit_examples.length}\n`;
      const topGrit = data.grit_examples.sort((a: any, b: any) => b.grit_score - a.grit_score)[0];
      if (topGrit) {
        output += `- Strongest: ${topGrit.example_name} (${topGrit.grit_score}/10 grit score)\n`;
      }
      output += `\n`;
    }

    if (data.celebration_moments.length > 0) {
      output += `**Celebrate:**\n`;
      data.celebration_moments.slice(0, 2).forEach((moment: string) => {
        output += `- ${moment}\n`;
      });
    }

    return output;
  }

  /**
   * Format next actions summary (updated for v20.5)
   */
  private formatNextActions(
    velocityResult: IntelligenceResult | undefined,
    ladderResult: IntelligenceResult | undefined,
    timeArchResult: IntelligenceResult | undefined,
    blockingResult: IntelligenceResult | undefined,
    outcomeResult: IntelligenceResult | undefined,
    taskDecompResult: IntelligenceResult | undefined,
    cadenceResult: IntelligenceResult | undefined
  ): string {
    let output = `## 📋 Next Actions\n\n`;

    const actions: string[] = [];

    // From blocking detection (highest priority - unblock first!)
    if (blockingResult && blockingResult.data.escalation_recommendations) {
      const topEscalation = blockingResult.data.escalation_recommendations[0];
      if (topEscalation && topEscalation.action_steps.length > 0) {
        actions.push(`UNBLOCK: ${topEscalation.action_steps[0]}`);
      }
    }

    // From velocity
    if (velocityResult && velocityResult.data.recommendations) {
      actions.push(...velocityResult.data.recommendations.recommended_actions.slice(0, 2));
    }

    // From time architecture
    if (timeArchResult && timeArchResult.data.recommendations) {
      actions.push(...timeArchResult.data.recommendations.slice(0, 1));
    }

    // From task decomposition
    if (taskDecompResult && taskDecompResult.data.tasks) {
      const nextTask = taskDecompResult.data.tasks.find((t: any) => t.status === 'todo');
      if (nextTask) {
        actions.push(`Start next task: ${nextTask.task_text}`);
      }
    }

    // From cadence
    if (cadenceResult && cadenceResult.data.current_day) {
      const todayPlan = cadenceResult.data.daily_plans.find((p: any) => p.day === cadenceResult.data.current_day);
      if (todayPlan && todayPlan.recommended_actions.length > 0) {
        actions.push(todayPlan.recommended_actions[0]);
      }
    }

    // From ladder position
    if (ladderResult && ladderResult.data.ladder_position) {
      const recommendations = ladderResult.data.ladder_position.recommendations || [];
      actions.push(...recommendations.slice(0, 1));
    }

    // From outcome engineering
    if (outcomeResult && outcomeResult.data.recommendations) {
      actions.push(...outcomeResult.data.recommendations.slice(0, 1));
    }

    if (actions.length === 0) {
      actions.push('Continue executing on current week\'s outcomes');
      actions.push('Review weekly progress and adjust priorities');
    }

    // Deduplicate and limit to top 5
    const uniqueActions = Array.from(new Set(actions)).slice(0, 5);

    uniqueActions.forEach((action, index) => {
      output += `${index + 1}. ${action}\n`;
    });

    return output;
  }
}

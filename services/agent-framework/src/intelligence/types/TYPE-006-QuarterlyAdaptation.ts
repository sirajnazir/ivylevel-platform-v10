/**
 * TYPE-006: Quarterly Adaptation Intelligence
 * Category: DOMAIN_SPECIFIC (GamePlanAgent)
 *
 * Framework: Milestone Achievement/Miss Tactics + Context Change Pivot
 *
 * Purpose: Respond to student progress and setbacks with dynamic replanning.
 * Transforms static game plan → living adaptive roadmap that adjusts quarterly.
 *
 * Real-World Pattern (from Huda coaching):
 * - Q2 Goal: Win NCWIT Aspirations Award
 * - Actual: NCWIT semifinalist (didn't win)
 * - Adaptation: Pivot to Congressional App Challenge (faster turnaround, still recognition)
 * - Result: Won Congressional App, closed recognition gap ahead of schedule
 *
 * Algorithm: Progress Assessment + Adaptive Replanning
 *
 * **Quarterly Review Triggers:**
 * - End of each quarter (Q1-Q9)
 * - Major milestone achieved (award won, leadership role secured)
 * - Major setback (award lost, project failed, GPA dropped)
 * - External context change (new opportunity, deadline change, life event)
 *
 * **Adaptation Logic:**
 * ```
 * IF quarter ahead of schedule:
 *   → Accelerate timeline (pull forward Q3 milestones to Q2)
 *   → Add stretch goals (pursue higher-tier opportunities)
 *
 * IF quarter on track:
 *   → Continue current plan (no changes needed)
 *   → Celebrate progress
 *
 * IF quarter behind schedule:
 *   → Scope cut (reduce P1/P2 goals, focus on P0)
 *   → Deadline swap (move non-urgent to next quarter)
 *   → Ally recruit (get help from parent, teacher, coach)
 *
 * IF major setback:
 *   → Rejection alchemy (reframe as progress: semifinalist validates narrative)
 *   → Pivot to alternative (NCWIT miss → Congressional App)
 *   → Timeline recalibration (adjust expectations)
 * ```
 *
 * Output: Quarterly Adaptation Result
 * - quarter_review: Performance vs plan for last quarter
 * - progress_status: ahead/on_track/behind/at_risk
 * - milestones_achieved: What got done
 * - milestones_missed: What didn't get done
 * - adaptation_actions: Specific changes to make
 * - updated_priorities: Adjusted P0/P1/P2 for next quarter
 *
 * Data Sources:
 * - 05-huda_game_plan_progression_2year_extraction.json (8 quarters of adaptations)
 * - W000-STRATEGY-015 (Quarterly review patterns)
 * - Quarterly review coaching sessions (W012, W024, W036, W048, W060, W072, W084)
 *
 * Created: 2025-10-29
 * Version: v18.0
 */

import { IntelligenceType, IntelligenceResult, AgentQuery, FactSet, FactCategory } from './BaseIntelligenceType.js';

/**
 * Quarter review (assessment of last quarter)
 */
interface QuarterReview {
  quarter_number: number;
  planned_milestones: number;
  achieved_milestones: number;
  achievement_rate: number; // 0-100%
  total_planned_hours: number;
  total_actual_hours: number;
  execution_rate: number; // 0-100%
  rubric_delta_planned: number;
  rubric_delta_actual: number;
}

/**
 * Milestone achievement
 */
interface MilestoneAchievement {
  milestone_id: string;
  milestone_title: string;
  status: 'achieved' | 'missed' | 'partial';
  achievement_percentage: number; // 0-100%
  rubric_impact_planned: number;
  rubric_impact_actual: number;
  lessons_learned: string[];
}

/**
 * Adaptation action
 */
interface AdaptationAction {
  action_type: 'accelerate' | 'scope_cut' | 'deadline_swap' | 'pivot' | 'continue';
  action_title: string;
  rationale: string;
  affected_milestones: string[];
  priority: 'P0' | 'P1' | 'P2';
  target_quarter: number;
}

/**
 * Updated priority
 */
interface UpdatedPriority {
  dimension: string;
  old_priority: 'P0' | 'P1' | 'P2';
  new_priority: 'P0' | 'P1' | 'P2';
  rationale: string;
}

/**
 * Quarterly adaptation result
 */
interface QuarterlyAdaptationResult {
  quarter_review: QuarterReview;
  progress_status: 'ahead' | 'on_track' | 'behind' | 'at_risk';
  milestones_achieved: MilestoneAchievement[];
  milestones_missed: MilestoneAchievement[];
  adaptation_actions: AdaptationAction[];
  updated_priorities: UpdatedPriority[];
  celebration_moments: string[];
  recommendations: string[];
}

export class QuarterlyAdaptation implements IntelligenceType {
  type_id = 'TYPE-006';
  name = 'Quarterly Adaptation';
  category = 'DOMAIN_SPECIFIC' as const;
  agent_id = 'GamePlanAgent';
  version = 'v18.0';

  /**
   * Achievement rate thresholds
   */
  private readonly ACHIEVEMENT_THRESHOLDS = {
    ahead: 1.2,      // ≥120% achievement = ahead of schedule
    on_track_high: 0.8,   // 80-120% = on track
    on_track_low: 0.6,    // 60-80% = on track but monitor
    behind: 0.6,     // 40-60% = behind
    at_risk: 0.4,    // <40% = at risk
  };

  /**
   * Process quarterly adaptation
   */
  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {
    const studentId = query.entity_id;

    // Extract facts
    const assessmentFacts = facts.getFactsByCategory(FactCategory.ASSESSMENT_DATA);
    const progressFacts = facts.getFactsByCategory(FactCategory.WEEKLY_PROGRESS);
    const profileFacts = facts.getFactsByCategory(FactCategory.STUDENT_PROFILE);

    // Determine current quarter (from profile or calculated)
    const currentQuarter = this.getCurrentQuarter(profileFacts);

    // Review last quarter's performance
    const quarterReview = this.reviewLastQuarter(currentQuarter, progressFacts, assessmentFacts);

    // Assess progress status
    const progressStatus = this.assessProgressStatus(quarterReview);

    // Analyze milestone achievements
    const { achieved, missed } = this.analyzeMilestones(quarterReview, progressFacts);

    // Generate adaptation actions
    const adaptationActions = this.generateAdaptationActions(
      quarterReview,
      progressStatus,
      achieved,
      missed
    );

    // Update priorities based on progress
    const updatedPriorities = this.updatePriorities(
      quarterReview,
      progressStatus,
      assessmentFacts
    );

    // Identify celebration moments
    const celebrationMoments = this.identifyCelebrationMoments(achieved, progressStatus);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      quarterReview,
      progressStatus,
      adaptationActions
    );

    const result: QuarterlyAdaptationResult = {
      quarter_review: quarterReview,
      progress_status: progressStatus,
      milestones_achieved: achieved,
      milestones_missed: missed,
      adaptation_actions: adaptationActions,
      updated_priorities: updatedPriorities,
      celebration_moments: celebrationMoments,
      recommendations: recommendations,
    };

    return {
      type_id: this.type_id,
      component: 'quarterly_adaptation',
      triggered: true,
      confidence: 0.9,
      data: result,
    };
  }

  /**
   * Get current quarter
   */
  private getCurrentQuarter(profileFacts: any[]): number {
    const profile = profileFacts[0]?.data || {};

    // Calculate from program start date if available
    if (profile.program_start_date) {
      const startDate = new Date(profile.program_start_date);
      const now = new Date();
      const weeksElapsed = Math.floor((now.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));

      // Map weeks to quarters
      if (weeksElapsed <= 12) return 1;
      if (weeksElapsed <= 24) return 2;
      if (weeksElapsed <= 36) return 3;
      if (weeksElapsed <= 40) return 4;
      if (weeksElapsed <= 52) return 5;
      if (weeksElapsed <= 64) return 6;
      if (weeksElapsed <= 76) return 7;
      if (weeksElapsed <= 88) return 8;
      return 9;
    }

    // Fallback: estimate from grade level
    const gradeLevel = profile.grade_level || '10';
    if (gradeLevel === '10' || gradeLevel === '10th') return 1;
    if (gradeLevel === '11' || gradeLevel === '11th') return 5;
    if (gradeLevel === '12' || gradeLevel === '12th') return 8;

    return 1;
  }

  /**
   * Review last quarter's performance
   */
  private reviewLastQuarter(
    currentQuarter: number,
    progressFacts: any[],
    assessmentFacts: any[]
  ): QuarterReview {
    const lastQuarter = currentQuarter - 1;
    if (lastQuarter < 1) {
      // First quarter, no prior quarter to review
      return {
        quarter_number: 0,
        planned_milestones: 0,
        achieved_milestones: 0,
        achievement_rate: 100,
        total_planned_hours: 0,
        total_actual_hours: 0,
        execution_rate: 100,
        rubric_delta_planned: 0,
        rubric_delta_actual: 0,
      };
    }

    // Extract planned vs actual from progress facts (simplified - would need real data structure)
    const plannedMilestones = 5; // Default estimate
    const achievedMilestones = progressFacts.filter(f => f.data?.status === 'completed').length || 3;
    const achievementRate = (achievedMilestones / plannedMilestones) * 100;

    const totalPlannedHours = plannedMilestones * 20; // Estimate
    const totalActualHours = achievedMilestones * 20; // Estimate
    const executionRate = (totalActualHours / totalPlannedHours) * 100;

    const rubricDeltaPlanned = 2.0; // Default quarterly goal
    const rubricDeltaActual = achievementRate >= 80 ? 2.0 : achievementRate >= 60 ? 1.5 : 1.0;

    return {
      quarter_number: lastQuarter,
      planned_milestones: plannedMilestones,
      achieved_milestones: achievedMilestones,
      achievement_rate: achievementRate,
      total_planned_hours: totalPlannedHours,
      total_actual_hours: totalActualHours,
      execution_rate: executionRate,
      rubric_delta_planned: rubricDeltaPlanned,
      rubric_delta_actual: rubricDeltaActual,
    };
  }

  /**
   * Assess progress status
   */
  private assessProgressStatus(quarterReview: QuarterReview): 'ahead' | 'on_track' | 'behind' | 'at_risk' {
    const rate = quarterReview.achievement_rate / 100;

    if (rate >= this.ACHIEVEMENT_THRESHOLDS.ahead) {
      return 'ahead';
    } else if (rate >= this.ACHIEVEMENT_THRESHOLDS.on_track_high) {
      return 'on_track';
    } else if (rate >= this.ACHIEVEMENT_THRESHOLDS.behind) {
      return 'behind';
    } else {
      return 'at_risk';
    }
  }

  /**
   * Analyze milestone achievements
   */
  private analyzeMilestones(
    quarterReview: QuarterReview,
    progressFacts: any[]
  ): { achieved: MilestoneAchievement[]; missed: MilestoneAchievement[] } {
    const achieved: MilestoneAchievement[] = [];
    const missed: MilestoneAchievement[] = [];

    // Parse progress facts to identify achieved/missed milestones
    // (Simplified - would need actual milestone data structure)
    const completedCount = quarterReview.achieved_milestones;
    const missedCount = quarterReview.planned_milestones - quarterReview.achieved_milestones;

    // Create sample achieved milestones
    for (let i = 0; i < completedCount; i++) {
      achieved.push({
        milestone_id: `M${(i + 1).toString().padStart(3, '0')}`,
        milestone_title: `Milestone ${i + 1} (Completed)`,
        status: 'achieved',
        achievement_percentage: 100,
        rubric_impact_planned: 0.5,
        rubric_impact_actual: 0.5,
        lessons_learned: ['Consistent effort led to success', 'Clear deadline helped focus'],
      });
    }

    // Create sample missed milestones
    for (let i = 0; i < missedCount; i++) {
      missed.push({
        milestone_id: `M${(completedCount + i + 1).toString().padStart(3, '0')}`,
        milestone_title: `Milestone ${completedCount + i + 1} (Missed)`,
        status: 'missed',
        achievement_percentage: 0,
        rubric_impact_planned: 0.5,
        rubric_impact_actual: 0,
        lessons_learned: ['Underestimated time required', 'Need to scope cut earlier'],
      });
    }

    return { achieved, missed };
  }

  /**
   * Generate adaptation actions
   */
  private generateAdaptationActions(
    quarterReview: QuarterReview,
    progressStatus: string,
    achieved: MilestoneAchievement[],
    missed: MilestoneAchievement[]
  ): AdaptationAction[] {
    const actions: AdaptationAction[] = [];

    if (progressStatus === 'ahead') {
      // Accelerate timeline
      actions.push({
        action_type: 'accelerate',
        action_title: 'Pull forward Q+2 milestones to Q+1 (ahead of schedule)',
        rationale: `Achievement rate ${Math.round(quarterReview.achievement_rate)}% - can handle more`,
        affected_milestones: ['All P1 milestones in future quarters'],
        priority: 'P1',
        target_quarter: quarterReview.quarter_number + 2,
      });

      // Add stretch goals
      actions.push({
        action_type: 'accelerate',
        action_title: 'Add stretch goal: Pursue higher-tier competition',
        rationale: 'Strong momentum - aim for more prestigious opportunities',
        affected_milestones: [],
        priority: 'P1',
        target_quarter: quarterReview.quarter_number + 1,
      });
    } else if (progressStatus === 'on_track') {
      // Continue current plan
      actions.push({
        action_type: 'continue',
        action_title: 'Continue current plan - no changes needed',
        rationale: `Achievement rate ${Math.round(quarterReview.achievement_rate)}% - on track`,
        affected_milestones: [],
        priority: 'P1',
        target_quarter: quarterReview.quarter_number + 1,
      });
    } else if (progressStatus === 'behind') {
      // Scope cut
      actions.push({
        action_type: 'scope_cut',
        action_title: 'Scope cut: Drop P2 goals, focus on P0/P1 only',
        rationale: `Achievement rate ${Math.round(quarterReview.achievement_rate)}% - need to reduce scope`,
        affected_milestones: missed.map(m => m.milestone_id),
        priority: 'P0',
        target_quarter: quarterReview.quarter_number + 1,
      });

      // Deadline swap for missed milestones
      if (missed.length > 0) {
        actions.push({
          action_type: 'deadline_swap',
          action_title: `Move ${missed.length} missed milestones to next quarter`,
          rationale: 'Better to complete milestones late than to abandon them',
          affected_milestones: missed.map(m => m.milestone_id),
          priority: 'P1',
          target_quarter: quarterReview.quarter_number + 1,
        });
      }
    } else {
      // At risk - aggressive intervention
      actions.push({
        action_type: 'scope_cut',
        action_title: '🚨 CRITICAL: Focus on P0 only, pause all P1/P2',
        rationale: `Achievement rate ${Math.round(quarterReview.achievement_rate)}% - at risk of not closing critical gaps`,
        affected_milestones: missed.map(m => m.milestone_id),
        priority: 'P0',
        target_quarter: quarterReview.quarter_number + 1,
      });

      // Pivot strategy
      actions.push({
        action_type: 'pivot',
        action_title: 'Pivot to faster-turnaround opportunities',
        rationale: 'Need quick wins to build momentum',
        affected_milestones: [],
        priority: 'P0',
        target_quarter: quarterReview.quarter_number + 1,
      });
    }

    return actions;
  }

  /**
   * Update priorities based on progress
   */
  private updatePriorities(
    quarterReview: QuarterReview,
    progressStatus: string,
    assessmentFacts: any[]
  ): UpdatedPriority[] {
    const updates: UpdatedPriority[] = [];

    // If behind/at_risk, escalate P1 → P0
    if (progressStatus === 'behind' || progressStatus === 'at_risk') {
      updates.push({
        dimension: 'Recognition',
        old_priority: 'P1',
        new_priority: 'P0',
        rationale: 'Behind schedule - escalating critical gaps to P0',
      });
    }

    // If ahead, some P0 → P1 (already addressed)
    if (progressStatus === 'ahead') {
      updates.push({
        dimension: 'Community_Service',
        old_priority: 'P0',
        new_priority: 'P1',
        rationale: 'Ahead of schedule - already closed critical gap',
      });
    }

    return updates;
  }

  /**
   * Identify celebration moments
   */
  private identifyCelebrationMoments(
    achieved: MilestoneAchievement[],
    progressStatus: string
  ): string[] {
    const celebrations: string[] = [];

    if (achieved.length > 0) {
      celebrations.push(`🎉 ${achieved.length} milestones achieved this quarter!`);
      achieved.slice(0, 2).forEach(m => {
        celebrations.push(`✅ ${m.milestone_title}`);
      });
    }

    if (progressStatus === 'ahead') {
      celebrations.push('🚀 Ahead of schedule - incredible progress!');
    } else if (progressStatus === 'on_track') {
      celebrations.push('✅ On track - great consistency!');
    }

    return celebrations;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    quarterReview: QuarterReview,
    progressStatus: string,
    adaptationActions: AdaptationAction[]
  ): string[] {
    const recommendations: string[] = [];

    recommendations.push(`Q${quarterReview.quarter_number} Review: ${Math.round(quarterReview.achievement_rate)}% achievement rate`);
    recommendations.push(`Status: ${progressStatus.toUpperCase()}`);

    recommendations.push('\nAdaptation Actions:');
    adaptationActions.forEach((action, i) => {
      recommendations.push(`${i + 1}. [${action.action_type.toUpperCase()}] ${action.action_title}`);
      recommendations.push(`   Rationale: ${action.rationale}`);
    });

    if (progressStatus === 'ahead' || progressStatus === 'on_track') {
      recommendations.push('\n💡 Continue current approach - it\'s working!');
    } else {
      recommendations.push('\n⚠️ Adjust approach - scope cut and focus on P0 priorities');
    }

    return recommendations;
  }
}

/**
 * TYPE-002: Weak Spot Prioritization Intelligence
 * Category: DOMAIN_SPECIFIC (GamePlanAgent)
 *
 * Framework: Rubric Gap Analysis + P0/P1/P2 Prioritization
 *
 * Purpose: Identify and sequence gap-closing actions based on rubric analysis.
 * Transforms assessment gaps → prioritized action plan with quarterly sequencing.
 *
 * Algorithm: Gap Priority Scoring + Action Sequencing
 *
 * **Priority Logic:**
 * ```
 * P0 (Critical): Gap ≥ 5 points OR blocking admission (e.g., GPA < 3.5 for top schools)
 * P1 (High):     Gap 3-4 points OR important but not blocking
 * P2 (Medium):   Gap 1-2 points OR polish/optimization
 * P3 (Low):      Gap < 1 point OR nice-to-have
 * ```
 *
 * **Sequencing Strategy:**
 * - P0 gaps: Address in Q1-Q2 (earliest quarters)
 * - P1 gaps: Address in Q2-Q3 (middle quarters)
 * - P2 gaps: Address in Q3-Q4 (later quarters)
 * - P3 gaps: Address in Q4+ (if time permits)
 *
 * **Gap Scoring Formula:**
 * ```
 * Gap Priority Score = Gap Size × Rubric Weight × Urgency Multiplier
 *
 * Gap Size: Current gap (target - current)
 * Rubric Weight: Importance of dimension (Academics = 1.5, Recognition = 1.2, etc.)
 * Urgency Multiplier: Time sensitivity (12th grade = 2.0, 11th = 1.5, 10th = 1.0)
 * ```
 *
 * Output: Weak Spot Prioritization
 * - weak_spots: All rubric gaps sorted by priority
 * - p0_actions: Immediate critical actions (Q1-Q2)
 * - p1_actions: High-priority actions (Q2-Q3)
 * - p2_actions: Medium-priority actions (Q3-Q4)
 * - action_plan: Quarterly sequencing of all actions
 *
 * Data Sources:
 * - Assessment rubric analysis (27-layer rubric scores)
 * - W000-STRATEGY-003 (Gap prioritization patterns from coaching)
 * - NSM rubric weights and benchmarks
 *
 * Created: 2025-10-29
 * Version: v18.0
 */

import { IntelligenceType, IntelligenceResult, AgentQuery, FactSet } from './BaseIntelligenceType.js';

/**
 * Weak spot (rubric gap)
 */
interface WeakSpot {
  dimension: string;
  current_score: number;
  target_score: number;
  gap: number;
  gap_priority_score: number; // Gap Size × Rubric Weight × Urgency
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  urgency_level: 'critical' | 'high' | 'medium' | 'low';
  blocking_admission: boolean; // True if this gap blocks target schools
  recommended_actions: string[];
  quarter_assignment: string; // e.g., "Q1", "Q2-Q3"
  estimated_effort_hours: number;
}

/**
 * Prioritized action
 */
interface PrioritizedAction {
  action_id: string;
  action_title: string;
  dimension: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  quarter: number;
  target_week: number;
  estimated_hours: number;
  expected_rubric_delta: number; // How much this closes the gap
  dependencies: string[]; // Other actions that must complete first
  success_criteria: string[];
}

/**
 * Quarterly action plan
 */
interface QuarterlyActionPlan {
  quarter: number;
  total_actions: number;
  p0_actions: number;
  total_hours: number;
  actions: PrioritizedAction[];
  capacity_warning: string | null; // If too many hours for quarter
}

/**
 * Weak spot prioritization result
 */
interface WeakSpotPrioritizationResult {
  weak_spots: WeakSpot[];
  p0_weak_spots: WeakSpot[];
  p1_weak_spots: WeakSpot[];
  p2_weak_spots: WeakSpot[];
  total_gap_points: number;
  quarterly_action_plans: QuarterlyActionPlan[];
  critical_path_actions: PrioritizedAction[]; // Most urgent sequence
  recommendations: string[];
}

export class WeakSpotPrioritization implements IntelligenceType {
  type_id = 'TYPE-002';
  name = 'Weak Spot Prioritization';
  category = 'DOMAIN_SPECIFIC' as const;
  agent_id = 'GamePlanAgent';
  version = 'v18.0';

  /**
   * Rubric dimension weights (importance multipliers)
   */
  private readonly RUBRIC_WEIGHTS: Record<string, number> = {
    Academics: 1.5,           // Most important (GPA, test scores, course rigor)
    Recognition: 1.2,         // High importance (awards, competitions, honors)
    Leadership: 1.1,          // High importance (officer roles, initiative)
    Personal_Initiative: 1.0, // Moderate importance (projects, independent work)
    Community_Service: 0.9,   // Moderate importance (volunteering, service)
    Extracurriculars: 0.8,    // Lower importance (participation alone)
  };

  /**
   * Urgency multipliers by grade level
   */
  private readonly URGENCY_MULTIPLIERS: Record<string, number> = {
    '12': 2.0,  // 12th grade: Critical (application season)
    '11': 1.5,  // 11th grade: High urgency (building phase)
    '10': 1.0,  // 10th grade: Normal (foundation phase)
    '9': 0.8,   // 9th grade: Lower urgency (exploration)
  };

  /**
   * Process weak spot prioritization
   */
  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {
    const studentId = query.student_id;

    // Extract facts
    const assessmentFacts = facts.facts.filter(f => f.category === 'ASSESSMENT_DATA');
    const profileFacts = facts.facts.filter(f => f.category === 'STUDENT_PROFILE');

    // Extract rubric gaps and grade level
    const assessmentData = assessmentFacts[0]?.data || {};
    const rubricScores = assessmentData.rubric_scores || {};
    const gradeLevel = profileFacts[0]?.data?.grade_level || '10';

    // Identify weak spots
    const weakSpots = this.identifyWeakSpots(rubricScores, gradeLevel);

    // Calculate total gap points
    const totalGapPoints = weakSpots.reduce((sum, ws) => sum + ws.gap, 0);

    // Categorize by priority
    const p0WeakSpots = weakSpots.filter(ws => ws.priority === 'P0');
    const p1WeakSpots = weakSpots.filter(ws => ws.priority === 'P1');
    const p2WeakSpots = weakSpots.filter(ws => ws.priority === 'P2');

    // Generate prioritized actions
    const allActions = this.generatePrioritizedActions(weakSpots);

    // Create quarterly action plans
    const quarterlyActionPlans = this.createQuarterlyActionPlans(allActions);

    // Identify critical path (P0 actions sequenced)
    const criticalPathActions = this.identifyCriticalPath(allActions);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      weakSpots,
      p0WeakSpots,
      quarterlyActionPlans
    );

    const result: WeakSpotPrioritizationResult = {
      weak_spots: weakSpots,
      p0_weak_spots: p0WeakSpots,
      p1_weak_spots: p1WeakSpots,
      p2_weak_spots: p2WeakSpots,
      total_gap_points: totalGapPoints,
      quarterly_action_plans: quarterlyActionPlans,
      critical_path_actions: criticalPathActions,
      recommendations: recommendations,
    };

    return {
      type_id: this.type_id,
      triggered: true,
      confidence: 0.95,
      data: result,
    };
  }

  /**
   * Identify weak spots from rubric scores
   */
  private identifyWeakSpots(rubricScores: any, gradeLevel: string): WeakSpot[] {
    const weakSpots: WeakSpot[] = [];

    // Standard rubric dimensions
    const dimensions = [
      'Academics',
      'Recognition',
      'Leadership',
      'Community_Service',
      'Personal_Initiative',
      'Extracurriculars',
    ];

    dimensions.forEach(dimension => {
      const dimensionData = rubricScores[dimension] || {};
      const current = dimensionData.current || 0;
      const target = dimensionData.target || 10;
      const gap = target - current;

      if (gap > 0) {
        // Calculate priority score
        const rubricWeight = this.RUBRIC_WEIGHTS[dimension] || 1.0;
        const urgencyMultiplier = this.URGENCY_MULTIPLIERS[gradeLevel] || 1.0;
        const gapPriorityScore = gap * rubricWeight * urgencyMultiplier;

        // Determine priority level (P0/P1/P2/P3)
        let priority: 'P0' | 'P1' | 'P2' | 'P3' = 'P3';
        let urgencyLevel: 'critical' | 'high' | 'medium' | 'low' = 'low';

        if (gap >= 5 || gapPriorityScore >= 7.5) {
          priority = 'P0';
          urgencyLevel = 'critical';
        } else if (gap >= 3 || gapPriorityScore >= 4.5) {
          priority = 'P1';
          urgencyLevel = 'high';
        } else if (gap >= 1 || gapPriorityScore >= 2.0) {
          priority = 'P2';
          urgencyLevel = 'medium';
        } else {
          priority = 'P3';
          urgencyLevel = 'low';
        }

        // Check if blocking admission
        const blockingAdmission = this.isBlockingAdmission(dimension, current);

        // Get recommended actions
        const recommendedActions = this.getRecommendedActions(dimension, gap);

        // Assign to quarter based on priority
        let quarterAssignment = 'Q4';
        if (priority === 'P0') quarterAssignment = current < 3 ? 'Q1' : 'Q1-Q2';
        else if (priority === 'P1') quarterAssignment = 'Q2-Q3';
        else if (priority === 'P2') quarterAssignment = 'Q3-Q4';

        // Estimate effort (10 hours per rubric point as rough estimate)
        const estimatedEffortHours = gap * 10;

        weakSpots.push({
          dimension: dimension,
          current_score: current,
          target_score: target,
          gap: gap,
          gap_priority_score: gapPriorityScore,
          priority: priority,
          urgency_level: urgencyLevel,
          blocking_admission: blockingAdmission,
          recommended_actions: recommendedActions,
          quarter_assignment: quarterAssignment,
          estimated_effort_hours: estimatedEffortHours,
        });
      }
    });

    // Sort by priority score (highest first)
    weakSpots.sort((a, b) => b.gap_priority_score - a.gap_priority_score);

    return weakSpots;
  }

  /**
   * Check if gap is blocking admission to target schools
   */
  private isBlockingAdmission(dimension: string, currentScore: number): boolean {
    // Blocking thresholds (rough estimates)
    const blockingThresholds: Record<string, number> = {
      Academics: 6.0,           // GPA < 3.7 (6/10) may block top schools
      Recognition: 4.0,         // No awards may block competitive programs
      Leadership: 3.0,          // No leadership roles concerning
      Community_Service: 2.0,   // Minimal service acceptable for some schools
      Personal_Initiative: 2.0, // Minimal initiative acceptable
      Extracurriculars: 2.0,    // Minimal ECs acceptable
    };

    const threshold = blockingThresholds[dimension] || 0;
    return currentScore < threshold;
  }

  /**
   * Get recommended actions for dimension
   */
  private getRecommendedActions(dimension: string, gap: number): string[] {
    const actionMap: Record<string, string[]> = {
      Academics: [
        'Enroll in 2-3 AP/Honors courses next semester',
        'Improve GPA through targeted tutoring in weak subjects',
        'Take SAT/ACT prep course to improve test scores',
        'Join academic competition team (Math Olympiad, Science Bowl)',
      ],
      Recognition: [
        'Apply to 3-5 high-ROI competitions (NCWIT, Congressional App, Scholastic)',
        'Submit work to regional/national competitions in passion area',
        'Pursue school-level awards (Honor Roll, Subject Awards)',
        'Document all achievements for portfolio',
      ],
      Leadership: [
        'Run for club officer position (target: VP or President)',
        'Start new club aligned with passion (Film, AI, Service)',
        'Lead a project team within existing club',
        'Mentor underclassmen in area of expertise',
      ],
      Community_Service: [
        'Design service project aligned with identity (teach coding, film workshops)',
        'Commit to 100+ hours sustained service (not one-off events)',
        'Measure and document impact (# students taught, skills learned)',
        'Seek leadership role in service organization',
      ],
      Personal_Initiative: [
        'Launch passion project (app, film, research)',
        'Document journey (blog, portfolio, case study)',
        'Grow project to 10+ users or meaningful impact metric',
        'Present project at school or local venue',
      ],
      Extracurriculars: [
        'Join 2-3 clubs aligned with identity fusion',
        'Commit to 4-year participation (depth over breadth)',
        'Achieve measurable contribution within each EC',
        'Connect ECs to core narrative',
      ],
    };

    return actionMap[dimension] || ['Work with coach to develop action plan'];
  }

  /**
   * Generate prioritized actions from weak spots
   */
  private generatePrioritizedActions(weakSpots: WeakSpot[]): PrioritizedAction[] {
    const actions: PrioritizedAction[] = [];
    let actionCounter = 1;

    weakSpots.forEach(ws => {
      // Create 1-3 actions per weak spot depending on gap size
      const actionCount = Math.min(ws.recommended_actions.length, ws.gap >= 5 ? 3 : ws.gap >= 3 ? 2 : 1);

      for (let i = 0; i < actionCount; i++) {
        const actionTitle = ws.recommended_actions[i];
        if (!actionTitle) continue;

        // Parse quarter assignment to get quarter number
        const quarterMatch = ws.quarter_assignment.match(/Q(\d+)/);
        const quarter = quarterMatch ? parseInt(quarterMatch[1]) : 1;

        // Calculate target week (middle of assigned quarter)
        const quarterWeeks: Record<number, [number, number]> = {
          1: [1, 12], 2: [13, 24], 3: [25, 36], 4: [37, 40],
          5: [41, 52], 6: [53, 64], 7: [65, 76], 8: [77, 88], 9: [89, 93],
        };
        const [startWeek, endWeek] = quarterWeeks[quarter] || [1, 12];
        const targetWeek = Math.floor((startWeek + endWeek) / 2) + (i * 2); // Spread actions

        // Calculate expected rubric delta
        const expectedDelta = ws.gap / actionCount;

        // Estimate hours for this action
        const estimatedHours = Math.ceil(ws.estimated_effort_hours / actionCount);

        actions.push({
          action_id: `A${actionCounter.toString().padStart(3, '0')}`,
          action_title: actionTitle,
          dimension: ws.dimension,
          priority: ws.priority,
          quarter: quarter,
          target_week: targetWeek,
          estimated_hours: estimatedHours,
          expected_rubric_delta: expectedDelta,
          dependencies: [], // Would be calculated based on logical dependencies
          success_criteria: this.getSuccessCriteria(ws.dimension, actionTitle),
        });

        actionCounter++;
      }
    });

    // Sort by priority then target week
    actions.sort((a, b) => {
      const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.target_week - b.target_week;
    });

    return actions;
  }

  /**
   * Get success criteria for action
   */
  private getSuccessCriteria(dimension: string, actionTitle: string): string[] {
    // Generic success criteria based on dimension
    if (dimension === 'Academics') {
      return ['GPA increase by 0.2+', 'Course grade A- or better', 'Test score improvement'];
    } else if (dimension === 'Recognition') {
      return ['Award application submitted', 'Semifinalist or higher', 'Award won'];
    } else if (dimension === 'Leadership') {
      return ['Leadership position achieved', 'Team of 3+ members', 'Measurable project outcome'];
    } else if (dimension === 'Community_Service') {
      return ['100+ hours committed', 'Impact documented (# people helped)', 'Leadership role achieved'];
    } else if (dimension === 'Personal_Initiative') {
      return ['Project launched', '10+ users or equivalent impact', 'Portfolio/proof created'];
    } else {
      return ['Activity joined', '1+ year commitment', 'Contribution documented'];
    }
  }

  /**
   * Create quarterly action plans
   */
  private createQuarterlyActionPlans(actions: PrioritizedAction[]): QuarterlyActionPlan[] {
    const quarterlyPlans: QuarterlyActionPlan[] = [];

    // Group actions by quarter
    for (let q = 1; q <= 9; q++) {
      const quarterActions = actions.filter(a => a.quarter === q);
      const p0Actions = quarterActions.filter(a => a.priority === 'P0').length;
      const totalHours = quarterActions.reduce((sum, a) => sum + a.estimated_hours, 0);

      // Capacity warning (>150 hours in a quarter is ambitious)
      let capacityWarning: string | null = null;
      if (totalHours > 200) {
        capacityWarning = '🚨 CRITICAL: >200 hours in quarter - reduce scope or extend timeline';
      } else if (totalHours > 150) {
        capacityWarning = '⚠️ WARNING: >150 hours in quarter - ambitious, monitor closely';
      }

      quarterlyPlans.push({
        quarter: q,
        total_actions: quarterActions.length,
        p0_actions: p0Actions,
        total_hours: totalHours,
        actions: quarterActions,
        capacity_warning: capacityWarning,
      });
    }

    return quarterlyPlans.filter(qp => qp.total_actions > 0);
  }

  /**
   * Identify critical path (P0 actions in sequence)
   */
  private identifyCriticalPath(actions: PrioritizedAction[]): PrioritizedAction[] {
    const p0Actions = actions.filter(a => a.priority === 'P0');
    return p0Actions.sort((a, b) => a.target_week - b.target_week);
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    weakSpots: WeakSpot[],
    p0WeakSpots: WeakSpot[],
    quarterlyPlans: QuarterlyActionPlan[]
  ): string[] {
    const recommendations: string[] = [];

    // Overall summary
    recommendations.push(`Total Weak Spots: ${weakSpots.length} (${p0WeakSpots.length} P0, ${weakSpots.filter(ws => ws.priority === 'P1').length} P1)`);

    // P0 weak spots
    if (p0WeakSpots.length > 0) {
      recommendations.push('\n🚨 P0 Critical Weak Spots (address in Q1-Q2):');
      p0WeakSpots.forEach(ws => {
        recommendations.push(`- ${ws.dimension}: ${ws.gap} point gap${ws.blocking_admission ? ' [BLOCKING ADMISSION]' : ''}`);
        recommendations.push(`  Action: ${ws.recommended_actions[0]}`);
      });
    }

    // Capacity warnings
    const overloadedQuarters = quarterlyPlans.filter(qp => qp.capacity_warning);
    if (overloadedQuarters.length > 0) {
      recommendations.push('\n⚠️ Capacity Warnings:');
      overloadedQuarters.forEach(qp => {
        recommendations.push(`- Q${qp.quarter}: ${qp.capacity_warning}`);
      });
    }

    // Strategic guidance
    recommendations.push('\n💡 Strategic Guidance:');
    recommendations.push('- Focus on P0 gaps first (critical for admission)');
    recommendations.push('- Distribute P1 gaps across Q2-Q3 to avoid overload');
    recommendations.push('- Address P2 gaps only after P0/P1 complete');

    return recommendations;
  }
}

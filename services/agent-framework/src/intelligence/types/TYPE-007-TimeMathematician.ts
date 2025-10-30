/**
 * TYPE-007: Time Mathematician Intelligence
 *
 * Purpose: Calculate realistic hour allocations across all student commitments
 * using the 168-Hour Weekly Framework + ROI-per-hour optimization.
 *
 * Framework:
 * - 168 hours/week total
 * - Fixed commitments: ~116 hours (school, sleep, family)
 * - Discretionary: ~52 hours available
 * - Deep Work allocation: ~30 hours (priority activities)
 * - Social/Wellness: ~10 hours (balance)
 * - Buffer: ~12 hours (unexpected)
 *
 * Core Algorithm:
 * 1. Map all student commitments → weekly hour estimates
 * 2. Calculate fixed vs discretionary hours
 * 3. Identify overcommitment (>52h discretionary)
 * 4. Calculate ROI-per-hour for each activity (rubric impact / hours)
 * 5. Recommend cuts/swaps based on lowest ROI
 * 6. Generate weekly time architecture
 *
 * Intelligence Extraction: Week 4-8, 12-15, 20-25 coaching sessions
 * (Time management, capacity planning, activity pruning)
 *
 * Created: 2025-10-29
 * Version: v20.1 Intelligence Types Architecture
 */

import { IntelligenceType, FactSet, AgentQuery } from './BaseIntelligenceType.js';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Weekly hour commitment for a single activity
 */
interface ActivityCommitment {
  activity_name: string;
  category: 'Fixed' | 'Academic' | 'EC' | 'Recognition' | 'Service' | 'Personal';
  hours_per_week: number;
  rubric_category?: string; // For ROI calculation
  rubric_impact?: number; // 0-10 scale
  roi_per_hour?: number; // rubric_impact / hours_per_week
  priority?: 'P0' | 'P1' | 'P2' | 'P3';
  is_droppable: boolean; // Can this be cut if overcommitted?
  rationale?: string;
}

/**
 * Weekly time allocation breakdown
 */
interface WeeklyTimeAllocation {
  total_hours: 168;
  fixed_commitments: {
    sleep: number; // 56h (8h/night)
    school: number; // 35h (7h/day × 5 days)
    meals_family: number; // 21h (3h/day)
    hygiene_transit: number; // 7h (1h/day)
    total: number;
  };
  discretionary_hours: number; // 168 - fixed_commitments.total
  allocated_discretionary: {
    deep_work: number; // Priority activities (P0/P1)
    social_wellness: number; // Friends, exercise, hobbies
    buffer: number; // Unexpected events
    total: number;
  };
  current_commitments: ActivityCommitment[];
  total_committed_hours: number;
  capacity_status: 'Feasible' | 'At_Capacity' | 'Overcommitted';
  overcommitment_hours?: number; // If overcommitted, by how much
}

/**
 * ROI-based activity optimization recommendation
 */
interface ActivityOptimization {
  action: 'Keep' | 'Reduce' | 'Drop' | 'Swap';
  activity: string;
  current_hours: number;
  recommended_hours: number;
  roi_per_hour: number;
  rationale: string;
  alternative?: string; // If swap recommended
}

/**
 * Time architecture plan (weekly + quarterly)
 */
interface TimePlan {
  quarter: number;
  weeks: [number, number];
  weekly_allocation: WeeklyTimeAllocation;
  optimizations: ActivityOptimization[];
  feasibility_score: number; // 0-1 (1 = perfectly feasible)
  recommendations: string[];
}

/**
 * Complete Time Mathematician analysis result
 */
interface TimeMathematicianResult {
  student_id: string;
  current_quarter: number;
  time_plans: TimePlan[]; // One per remaining quarter
  overall_feasibility: 'Feasible' | 'Challenging' | 'Impossible';
  critical_capacity_quarters: number[]; // Quarters with overcommitment
  summary: {
    avg_discretionary_hours: number;
    avg_deep_work_hours: number;
    avg_buffer_hours: number;
    total_activities: number;
    high_roi_activities: number; // ROI > 0.3
    low_roi_activities: number; // ROI < 0.1
  };
  next_actions: string[];
}

// ============================================================================
// TIME MATHEMATICIAN INTELLIGENCE
// ============================================================================

export class TimeMathematician extends IntelligenceType {
  constructor() {
    super(
      'TYPE-007',
      'Time Mathematician',
      'DOMAIN_SPECIFIC',
      'GamePlanAgent',
      [
        'Calculates realistic weekly hour allocations using 168-hour framework',
        'Identifies overcommitment and capacity constraints',
        'Computes ROI-per-hour for activity optimization',
        'Recommends activity cuts/swaps based on rubric impact vs time cost',
        'Generates quarterly time architecture with feasibility checks',
      ]
    );
  }

  // ==========================================================================
  // CORE CONSTANTS
  // ==========================================================================

  /**
   * Fixed weekly commitments (non-negotiable)
   */
  private readonly FIXED_HOURS = {
    sleep: 56, // 8 hours/night
    school: 35, // 7 hours/day × 5 days
    meals_family: 21, // 3 hours/day
    hygiene_transit: 7, // 1 hour/day
    get total() {
      return this.sleep + this.school + this.meals_family + this.hygiene_transit;
    },
  };

  /**
   * Discretionary hour allocation targets
   */
  private readonly DISCRETIONARY_TARGETS = {
    deep_work: 30, // Priority activities
    social_wellness: 10, // Balance
    buffer: 12, // Unexpected
    get total() {
      return this.deep_work + this.social_wellness + this.buffer;
    },
  };

  /**
   * Capacity thresholds
   */
  private readonly CAPACITY_THRESHOLDS = {
    feasible: 0.85, // ≤85% of discretionary hours
    at_capacity: 1.0, // 85-100%
    overcommitted: 1.0, // >100%
  };

  /**
   * ROI-per-hour thresholds (rubric impact per hour)
   */
  private readonly ROI_THRESHOLDS = {
    high: 0.3, // >0.3 impact/hour = high ROI
    medium: 0.15, // 0.15-0.3 = medium ROI
    low: 0.1, // <0.1 = low ROI (consider cutting)
  };

  /**
   * Typical hour estimates for common activities
   */
  private readonly ACTIVITY_HOUR_ESTIMATES: Record<string, number> = {
    // Academic (beyond school)
    'Homework': 10,
    'Test Prep': 5,
    'Independent Study': 3,
    'Tutoring': 2,

    // Recognition (awards, competitions)
    'Competition Prep': 8,
    'Research Project': 10,
    'Portfolio Development': 5,

    // Leadership
    'Club Leadership': 4,
    'Student Government': 3,
    'Team Captain': 2,

    // Service
    'Community Service': 3,
    'Tutoring/Teaching': 2,
    'Nonprofit Work': 4,

    // Extracurriculars
    'Sport (Varsity)': 15,
    'Sport (Club)': 8,
    'Music Practice': 7,
    'Theater Rehearsal': 10,
    'Debate Team': 6,
    'Robotics Team': 10,
    'School Newspaper': 4,
    'Art Studio': 5,

    // Personal
    'Social Time': 5,
    'Exercise': 3,
    'Creative Hobbies': 3,
    'Reading': 2,
  };

  // ==========================================================================
  // MAIN INTELLIGENCE INTERFACE
  // ==========================================================================

  async process(facts: FactSet, query: AgentQuery): Promise<TimeMathematicianResult> {
    const studentId = query.student_id;
    const currentQuarter = this.extractCurrentQuarter(facts, query);

    // Extract all student commitments
    const commitments = this.extractActivityCommitments(facts);

    // Calculate current weekly allocation
    const currentAllocation = this.calculateWeeklyAllocation(commitments);

    // Generate time plans for remaining quarters
    const timePlans = this.generateQuarterlyTimePlans(
      commitments,
      currentAllocation,
      currentQuarter
    );

    // Analyze overall feasibility
    const feasibility = this.analyzeOverallFeasibility(timePlans);

    // Generate summary and next actions
    const summary = this.generateSummary(timePlans);
    const nextActions = this.generateNextActions(timePlans, feasibility);

    return {
      student_id: studentId,
      current_quarter: currentQuarter,
      time_plans: timePlans,
      overall_feasibility: feasibility.status,
      critical_capacity_quarters: feasibility.critical_quarters,
      summary,
      next_actions,
    };
  }

  // ==========================================================================
  // EXTRACTION & PARSING
  // ==========================================================================

  /**
   * Extract current quarter from facts
   */
  private extractCurrentQuarter(facts: FactSet, query: AgentQuery): number {
    // Look for grade_level fact
    const gradeLevel = facts.filter_by_type?.('profile')
      .find((f: any) => f.grade_level)?.[0]?.grade_level || query.context?.grade_level || '10';

    // Map grade → default starting quarter
    const gradeQuarterMap: Record<string, number> = {
      '9': 1, '10': 3, '11': 5, '12': 8,
    };

    return gradeQuarterMap[gradeLevel] || 1;
  }

  /**
   * Extract all student activity commitments from facts
   */
  private extractActivityCommitments(facts: FactSet): ActivityCommitment[] {
    const commitments: ActivityCommitment[] = [];

    // Extract from activities facts
    const activities = facts.filter_by_type?.('activity') || [];

    for (const activity of activities) {
      const activityName = activity.activity_name || activity.name || 'Unknown';
      const category = this.mapActivityCategory(activity);
      const hoursPerWeek = activity.hours_per_week || this.estimateHours(activityName);
      const rubricCategory = activity.rubric_category || this.inferRubricCategory(category);
      const rubricImpact = activity.rubric_impact || this.estimateRubricImpact(activity);

      commitments.push({
        activity_name: activityName,
        category,
        hours_per_week: hoursPerWeek,
        rubric_category: rubricCategory,
        rubric_impact: rubricImpact,
        roi_per_hour: rubricImpact / hoursPerWeek,
        priority: activity.priority || this.inferPriority(rubricImpact / hoursPerWeek),
        is_droppable: category !== 'Fixed' && category !== 'Academic',
        rationale: activity.rationale || '',
      });
    }

    return commitments;
  }

  /**
   * Map activity to category
   */
  private mapActivityCategory(activity: any): ActivityCommitment['category'] {
    const type = activity.type?.toLowerCase() || '';
    const name = activity.activity_name?.toLowerCase() || activity.name?.toLowerCase() || '';

    if (name.includes('homework') || name.includes('study')) return 'Academic';
    if (type === 'recognition' || name.includes('competition') || name.includes('award')) return 'Recognition';
    if (type === 'service' || name.includes('volunteer') || name.includes('tutoring')) return 'Service';
    if (type === 'leadership' || name.includes('president') || name.includes('captain')) return 'EC';
    if (type === 'extracurricular' || type === 'ec') return 'EC';

    return 'Personal';
  }

  /**
   * Estimate hours if not provided
   */
  private estimateHours(activityName: string): number {
    // Try exact match
    if (this.ACTIVITY_HOUR_ESTIMATES[activityName]) {
      return this.ACTIVITY_HOUR_ESTIMATES[activityName];
    }

    // Try fuzzy match
    const nameLower = activityName.toLowerCase();
    for (const [key, hours] of Object.entries(this.ACTIVITY_HOUR_ESTIMATES)) {
      if (nameLower.includes(key.toLowerCase())) {
        return hours;
      }
    }

    // Default: 3 hours/week
    return 3;
  }

  /**
   * Infer rubric category from activity category
   */
  private inferRubricCategory(category: ActivityCommitment['category']): string {
    const map: Record<string, string> = {
      'Academic': 'Academics',
      'Recognition': 'Recognition',
      'EC': 'Extracurriculars',
      'Service': 'Community_Service',
      'Personal': 'Personal_Initiative',
      'Fixed': 'N/A',
    };
    return map[category] || 'Extracurriculars';
  }

  /**
   * Estimate rubric impact (0-10 scale)
   */
  private estimateRubricImpact(activity: any): number {
    const level = activity.level?.toLowerCase() || '';
    const recognition = activity.recognition?.toLowerCase() || '';

    // High impact: National/International recognition
    if (level.includes('national') || level.includes('international') || recognition.includes('award')) {
      return 9;
    }

    // Medium-high: State/Regional, leadership
    if (level.includes('state') || level.includes('regional') || activity.is_leadership) {
      return 7;
    }

    // Medium: School-level leadership, consistent participation
    if (level.includes('school') || activity.is_leadership) {
      return 5;
    }

    // Low: General participation
    return 3;
  }

  /**
   * Infer priority from ROI
   */
  private inferPriority(roi: number): 'P0' | 'P1' | 'P2' | 'P3' {
    if (roi >= this.ROI_THRESHOLDS.high) return 'P0';
    if (roi >= this.ROI_THRESHOLDS.medium) return 'P1';
    if (roi >= this.ROI_THRESHOLDS.low) return 'P2';
    return 'P3';
  }

  // ==========================================================================
  // TIME ALLOCATION CALCULATIONS
  // ==========================================================================

  /**
   * Calculate weekly time allocation from commitments
   */
  private calculateWeeklyAllocation(commitments: ActivityCommitment[]): WeeklyTimeAllocation {
    const discretionaryHours = 168 - this.FIXED_HOURS.total;
    const totalCommittedHours = commitments.reduce((sum, c) => sum + c.hours_per_week, 0);

    const capacityRatio = totalCommittedHours / discretionaryHours;
    let capacityStatus: 'Feasible' | 'At_Capacity' | 'Overcommitted';

    if (capacityRatio <= this.CAPACITY_THRESHOLDS.feasible) {
      capacityStatus = 'Feasible';
    } else if (capacityRatio <= this.CAPACITY_THRESHOLDS.at_capacity) {
      capacityStatus = 'At_Capacity';
    } else {
      capacityStatus = 'Overcommitted';
    }

    const overcommitmentHours = capacityStatus === 'Overcommitted'
      ? totalCommittedHours - discretionaryHours
      : undefined;

    // Calculate allocated discretionary
    const deepWorkCommitments = commitments.filter(c => c.priority === 'P0' || c.priority === 'P1');
    const deepWorkHours = deepWorkCommitments.reduce((sum, c) => sum + c.hours_per_week, 0);

    const socialWellnessHours = commitments
      .filter(c => c.category === 'Personal')
      .reduce((sum, c) => sum + c.hours_per_week, 0);

    const bufferHours = discretionaryHours - totalCommittedHours;

    return {
      total_hours: 168,
      fixed_commitments: this.FIXED_HOURS,
      discretionary_hours: discretionaryHours,
      allocated_discretionary: {
        deep_work: deepWorkHours,
        social_wellness: socialWellnessHours,
        buffer: bufferHours > 0 ? bufferHours : 0,
        total: totalCommittedHours,
      },
      current_commitments: commitments,
      total_committed_hours: totalCommittedHours,
      capacity_status: capacityStatus,
      overcommitment_hours: overcommitmentHours,
    };
  }

  // ==========================================================================
  // QUARTERLY TIME PLANNING
  // ==========================================================================

  /**
   * Generate time plans for remaining quarters
   */
  private generateQuarterlyTimePlans(
    commitments: ActivityCommitment[],
    baseAllocation: WeeklyTimeAllocation,
    currentQuarter: number
  ): TimePlan[] {
    const plans: TimePlan[] = [];

    // Generate plans for Q = currentQuarter to Q9
    for (let q = currentQuarter; q <= 9; q++) {
      const weekRange = this.getQuarterWeekRange(q);
      const allocation = { ...baseAllocation }; // Start with base, adjust per quarter

      // Identify optimizations if overcommitted
      const optimizations = this.generateOptimizations(allocation);

      // Apply optimizations to calculate adjusted allocation
      const adjustedAllocation = this.applyOptimizations(allocation, optimizations);

      // Calculate feasibility score
      const feasibilityScore = this.calculateFeasibilityScore(adjustedAllocation);

      // Generate recommendations
      const recommendations = this.generateRecommendations(adjustedAllocation, q);

      plans.push({
        quarter: q,
        weeks: weekRange,
        weekly_allocation: adjustedAllocation,
        optimizations,
        feasibility_score: feasibilityScore,
        recommendations,
      });
    }

    return plans;
  }

  /**
   * Get week range for a quarter
   */
  private getQuarterWeekRange(q: number): [number, number] {
    const ranges: Record<number, [number, number]> = {
      1: [1, 12],
      2: [13, 24],
      3: [25, 36],
      4: [37, 48],
      5: [49, 60],
      6: [61, 72],
      7: [73, 84],
      8: [85, 90],
      9: [91, 93],
    };
    return ranges[q] || [1, 12];
  }

  /**
   * Generate activity optimizations (cuts/swaps) if needed
   */
  private generateOptimizations(allocation: WeeklyTimeAllocation): ActivityOptimization[] {
    const optimizations: ActivityOptimization[] = [];

    // If not overcommitted, keep all
    if (allocation.capacity_status === 'Feasible') {
      allocation.current_commitments.forEach(c => {
        optimizations.push({
          action: 'Keep',
          activity: c.activity_name,
          current_hours: c.hours_per_week,
          recommended_hours: c.hours_per_week,
          roi_per_hour: c.roi_per_hour || 0,
          rationale: `High ROI (${(c.roi_per_hour || 0).toFixed(2)}) - keep current commitment`,
        });
      });
      return optimizations;
    }

    // Sort by ROI (lowest first - candidates for cutting)
    const sorted = [...allocation.current_commitments].sort(
      (a, b) => (a.roi_per_hour || 0) - (b.roi_per_hour || 0)
    );

    let hoursToFree = allocation.overcommitment_hours || 0;

    for (const commitment of sorted) {
      if (hoursToFree <= 0) {
        // No more cuts needed, keep rest
        optimizations.push({
          action: 'Keep',
          activity: commitment.activity_name,
          current_hours: commitment.hours_per_week,
          recommended_hours: commitment.hours_per_week,
          roi_per_hour: commitment.roi_per_hour || 0,
          rationale: 'Capacity freed, keep this activity',
        });
        continue;
      }

      if (!commitment.is_droppable) {
        // Can't drop fixed/academic
        optimizations.push({
          action: 'Keep',
          activity: commitment.activity_name,
          current_hours: commitment.hours_per_week,
          recommended_hours: commitment.hours_per_week,
          roi_per_hour: commitment.roi_per_hour || 0,
          rationale: 'Non-droppable commitment',
        });
        continue;
      }

      const roi = commitment.roi_per_hour || 0;

      // Low ROI → Drop
      if (roi < this.ROI_THRESHOLDS.low) {
        optimizations.push({
          action: 'Drop',
          activity: commitment.activity_name,
          current_hours: commitment.hours_per_week,
          recommended_hours: 0,
          roi_per_hour: roi,
          rationale: `Low ROI (${roi.toFixed(2)}) - drop to free ${commitment.hours_per_week}h`,
        });
        hoursToFree -= commitment.hours_per_week;
      }
      // Medium ROI → Reduce
      else if (roi < this.ROI_THRESHOLDS.medium) {
        const reduction = Math.min(commitment.hours_per_week * 0.5, hoursToFree);
        optimizations.push({
          action: 'Reduce',
          activity: commitment.activity_name,
          current_hours: commitment.hours_per_week,
          recommended_hours: commitment.hours_per_week - reduction,
          roi_per_hour: roi,
          rationale: `Medium ROI (${roi.toFixed(2)}) - reduce by ${reduction}h to balance capacity`,
        });
        hoursToFree -= reduction;
      }
      // High ROI → Keep or swap
      else {
        optimizations.push({
          action: 'Keep',
          activity: commitment.activity_name,
          current_hours: commitment.hours_per_week,
          recommended_hours: commitment.hours_per_week,
          roi_per_hour: roi,
          rationale: `High ROI (${roi.toFixed(2)}) - prioritize this activity`,
        });
      }
    }

    return optimizations;
  }

  /**
   * Apply optimizations to allocation
   */
  private applyOptimizations(
    allocation: WeeklyTimeAllocation,
    optimizations: ActivityOptimization[]
  ): WeeklyTimeAllocation {
    const adjustedCommitments: ActivityCommitment[] = [];

    for (const opt of optimizations) {
      const original = allocation.current_commitments.find(c => c.activity_name === opt.activity);
      if (!original) continue;

      if (opt.action === 'Drop') {
        // Don't add to adjusted commitments
        continue;
      }

      adjustedCommitments.push({
        ...original,
        hours_per_week: opt.recommended_hours,
      });
    }

    return this.calculateWeeklyAllocation(adjustedCommitments);
  }

  /**
   * Calculate feasibility score (0-1)
   */
  private calculateFeasibilityScore(allocation: WeeklyTimeAllocation): number {
    const capacityRatio = allocation.total_committed_hours / allocation.discretionary_hours;

    // Ideal: 70-85% capacity
    if (capacityRatio >= 0.7 && capacityRatio <= 0.85) return 1.0;

    // Good: 50-70% or 85-95%
    if ((capacityRatio >= 0.5 && capacityRatio < 0.7) || (capacityRatio > 0.85 && capacityRatio <= 0.95)) {
      return 0.8;
    }

    // Acceptable: 95-100%
    if (capacityRatio > 0.95 && capacityRatio <= 1.0) return 0.6;

    // Poor: >100% (overcommitted)
    if (capacityRatio > 1.0) return Math.max(0, 1.0 - (capacityRatio - 1.0));

    // Low: <50% (underutilized)
    return 0.5;
  }

  /**
   * Generate recommendations for a quarter
   */
  private generateRecommendations(allocation: WeeklyTimeAllocation, quarter: number): string[] {
    const recommendations: string[] = [];

    if (allocation.capacity_status === 'Overcommitted') {
      recommendations.push(`⚠️ Q${quarter} is overcommitted by ${allocation.overcommitment_hours}h - cut low-ROI activities`);
      recommendations.push('Consider dropping activities with ROI < 0.1 or reducing time on medium-ROI activities');
    } else if (allocation.capacity_status === 'At_Capacity') {
      recommendations.push(`Q${quarter} is at capacity - maintain current commitments, avoid new activities`);
    } else {
      const unusedHours = allocation.discretionary_hours - allocation.total_committed_hours;
      if (unusedHours > 10) {
        recommendations.push(`Q${quarter} has ${unusedHours.toFixed(0)}h unused capacity - consider adding P0/P1 activities`);
      } else {
        recommendations.push(`Q${quarter} is well-balanced with ${unusedHours.toFixed(0)}h buffer`);
      }
    }

    // Deep work check
    if (allocation.allocated_discretionary.deep_work < 25) {
      recommendations.push('⚠️ Deep work hours below target (25h) - prioritize P0/P1 activities');
    }

    return recommendations;
  }

  // ==========================================================================
  // OVERALL ANALYSIS
  // ==========================================================================

  /**
   * Analyze overall feasibility across all quarters
   */
  private analyzeOverallFeasibility(plans: TimePlan[]): {
    status: 'Feasible' | 'Challenging' | 'Impossible';
    critical_quarters: number[];
  } {
    const criticalQuarters = plans
      .filter(p => p.weekly_allocation.capacity_status === 'Overcommitted')
      .map(p => p.quarter);

    const avgFeasibility = plans.reduce((sum, p) => sum + p.feasibility_score, 0) / plans.length;

    let status: 'Feasible' | 'Challenging' | 'Impossible';
    if (criticalQuarters.length === 0 && avgFeasibility >= 0.8) {
      status = 'Feasible';
    } else if (criticalQuarters.length <= 2 || avgFeasibility >= 0.6) {
      status = 'Challenging';
    } else {
      status = 'Impossible';
    }

    return { status, critical_quarters: criticalQuarters };
  }

  /**
   * Generate summary statistics
   */
  private generateSummary(plans: TimePlan[]): TimeMathematicianResult['summary'] {
    const avgDiscretionary = plans.reduce((sum, p) => sum + p.weekly_allocation.discretionary_hours, 0) / plans.length;
    const avgDeepWork = plans.reduce((sum, p) => sum + p.weekly_allocation.allocated_discretionary.deep_work, 0) / plans.length;
    const avgBuffer = plans.reduce((sum, p) => sum + p.weekly_allocation.allocated_discretionary.buffer, 0) / plans.length;

    // Count unique activities across all plans
    const allActivities = new Set<string>();
    let highROICount = 0;
    let lowROICount = 0;

    for (const plan of plans) {
      for (const commitment of plan.weekly_allocation.current_commitments) {
        allActivities.add(commitment.activity_name);
        const roi = commitment.roi_per_hour || 0;
        if (roi > this.ROI_THRESHOLDS.high) highROICount++;
        if (roi < this.ROI_THRESHOLDS.low) lowROICount++;
      }
    }

    return {
      avg_discretionary_hours: avgDiscretionary,
      avg_deep_work_hours: avgDeepWork,
      avg_buffer_hours: avgBuffer,
      total_activities: allActivities.size,
      high_roi_activities: highROICount,
      low_roi_activities: lowROICount,
    };
  }

  /**
   * Generate next actions
   */
  private generateNextActions(
    plans: TimePlan[],
    feasibility: { status: string; critical_quarters: number[] }
  ): string[] {
    const actions: string[] = [];

    if (feasibility.status === 'Impossible') {
      actions.push('🚨 CRITICAL: Current plan is impossible - immediate capacity reduction required');
      actions.push('Drop all activities with ROI < 0.1 immediately');
      actions.push('Reduce medium-ROI activities by 50%');
    } else if (feasibility.status === 'Challenging') {
      actions.push('⚠️ WARNING: Plan is challenging - proactive cuts recommended');
      actions.push(`Focus capacity optimization on Q${feasibility.critical_quarters.join(', Q')}`);
    } else {
      actions.push('✅ Plan is feasible - maintain current commitments');
    }

    // Add specific quarter actions
    const overcommittedPlans = plans.filter(p => p.weekly_allocation.capacity_status === 'Overcommitted');
    if (overcommittedPlans.length > 0) {
      actions.push(`Review and optimize quarters: Q${overcommittedPlans.map(p => p.quarter).join(', Q')}`);
    }

    return actions;
  }
}

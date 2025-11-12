/**
 * TYPE-063: Progress Velocity & Momentum
 * Category: DOMAIN_SPECIFIC (ExecutionAgent only)
 *
 * Purpose: Tracks completion velocity and momentum to identify acceleration/deceleration patterns
 *
 * Framework: Velocity Tracking
 * - Velocity = Actual Completion / Expected Completion
 * - >1.0 = ahead of schedule (celebrate!)
 * - 0.8-1.0 = on track (maintain)
 * - <0.8 = at risk (escalate to coach)
 *
 * Momentum Indicators:
 * - accelerating: velocity increasing week-over-week
 * - steady: velocity stable (±10%)
 * - decelerating: velocity decreasing week-over-week
 *
 * Data Source: W000-STRATEGY-021, weekly progress snapshots
 * Pattern: Real Jenny coaching - tracks trends, not just point-in-time status
 *
 * Created: 2025-10-29 (v20.1 ExecutionAgent Expansion)
 */

import {
  IntelligenceType,
  IntelligenceResult,
  AgentQuery,
  FactSet,
  FactCategory,
} from './BaseIntelligenceType.js';

/**
 * Weekly velocity snapshot
 */
interface VelocitySnapshot {
  week_number: number;
  week_start_date: Date;
  expected_completion_count: number; // Tasks planned
  actual_completion_count: number; // Tasks completed
  velocity_score: number; // actual / expected
  momentum_indicator: 'accelerating' | 'steady' | 'decelerating' | 'stalled';
  proof_artifacts_count: number; // Public proof generated this week
  deep_work_hours: number; // Actual deep work hours logged
}

/**
 * Velocity trend analysis
 */
interface VelocityTrend {
  current_week_velocity: number;
  previous_week_velocity: number;
  week_over_week_change: number; // Percentage change
  average_velocity_4_weeks: number;
  best_week_velocity: number;
  worst_week_velocity: number;
  streak_count: number; // Consecutive weeks with velocity >= 0.8
}

/**
 * Momentum analysis
 */
interface MomentumAnalysis {
  current_momentum: 'accelerating' | 'steady' | 'decelerating' | 'stalled';
  momentum_score: number; // -10 to +10 (-10 = severe deceleration, +10 = strong acceleration)
  contributing_factors: {
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    description: string;
  }[];
  at_risk_indicators: string[]; // Warning signs of burnout/blocking
  momentum_drivers: string[]; // What's working well
}

/**
 * Velocity recommendations
 */
interface VelocityRecommendations {
  priority: 'celebrate' | 'maintain' | 'adjust' | 'escalate';
  recommended_actions: string[];
  scope_adjustments: string[]; // If at risk, recommend scope cuts
  support_needed: string[]; // When to escalate to coach/parent
  next_week_target_velocity: number; // Realistic velocity goal for next week
}

/**
 * Full progress velocity result
 */
interface ProgressVelocityResult {
  snapshots: VelocitySnapshot[]; // Last 4-8 weeks
  trend: VelocityTrend;
  momentum: MomentumAnalysis;
  recommendations: VelocityRecommendations;
  capacity_analysis: {
    total_capacity_hours: number; // Available discretionary hours
    actual_utilization_hours: number; // Hours actually worked
    utilization_rate: number; // actual / total (0-1)
    overcommitment_risk: 'none' | 'low' | 'medium' | 'high' | 'critical';
  };
}

export class ProgressVelocity implements IntelligenceType {
  type_id = 'TYPE-063';
  name = 'Progress Velocity & Momentum';
  category: 'UNIVERSAL' | 'DOMAIN_SPECIFIC' = 'DOMAIN_SPECIFIC';

  /**
   * Process query to calculate velocity and momentum
   */
  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {
    const studentId = query.entity_id;

    // Extract relevant facts
    const profileFacts = facts.get(FactCategory.STUDENT_PROFILE) || [];
    const activityFacts = facts.get(FactCategory.ACTIVITY_DATA) || [];

    // Get velocity snapshots (last 4-8 weeks)
    const snapshots = this.getVelocitySnapshots(studentId, profileFacts);

    // Calculate velocity trend
    const trend = this.calculateVelocityTrend(snapshots);

    // Analyze momentum
    const momentum = this.analyzeMomentum(snapshots, trend);

    // Generate recommendations
    const recommendations = this.generateRecommendations(trend, momentum);

    // Analyze capacity utilization
    const capacityAnalysis = this.analyzeCapacity(snapshots);

    const result: ProgressVelocityResult = {
      snapshots,
      trend,
      momentum,
      recommendations,
      capacity_analysis: capacityAnalysis,
    };

    return {
      type_id: this.type_id,
      triggered: true,
      confidence_score: 0.9,
      data: result,
    };
  }

  /**
   * Get velocity snapshots from database
   * TODO: Query velocity_snapshots table in production
   */
  private getVelocitySnapshots(studentId: string, profileFacts: any[]): VelocitySnapshot[] {
    // Mock data for demonstration
    // In production, query: SELECT * FROM velocity_snapshots WHERE student_id = $1 ORDER BY week_number DESC LIMIT 8

    const now = new Date();
    const snapshots: VelocitySnapshot[] = [];

    // Generate sample data for last 6 weeks
    for (let i = 5; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - i * 7);

      // Simulate varying velocity patterns
      let expected = 10 + Math.floor(Math.random() * 5);
      let actual: number;

      if (i === 5) {
        // 5 weeks ago: slower start
        actual = Math.floor(expected * 0.7);
      } else if (i === 4) {
        // 4 weeks ago: building momentum
        actual = Math.floor(expected * 0.85);
      } else if (i === 3) {
        // 3 weeks ago: good week
        actual = Math.floor(expected * 1.1);
      } else if (i === 2) {
        // 2 weeks ago: excellent week
        actual = Math.floor(expected * 1.2);
      } else if (i === 1) {
        // Last week: slight dip
        actual = Math.floor(expected * 0.95);
      } else {
        // This week: current pace
        actual = Math.floor(expected * 0.8); // Incomplete week
      }

      const velocity = expected > 0 ? actual / expected : 0;

      snapshots.push({
        week_number: 52 - i, // Assuming week 52 is current
        week_start_date: weekStart,
        expected_completion_count: expected,
        actual_completion_count: actual,
        velocity_score: parseFloat(velocity.toFixed(2)),
        momentum_indicator: this.calculateMomentumIndicator(velocity, i === 0),
        proof_artifacts_count: Math.floor(actual / 3), // ~1 proof per 3 tasks
        deep_work_hours: actual * 0.5, // ~30 min per task
      });
    }

    return snapshots;
  }

  /**
   * Calculate momentum indicator for a single week
   */
  private calculateMomentumIndicator(
    velocity: number,
    isCurrentWeek: boolean
  ): 'accelerating' | 'steady' | 'decelerating' | 'stalled' {
    if (isCurrentWeek && velocity < 0.5) {
      return 'stalled'; // Mid-week with <50% completion
    }

    if (velocity >= 1.0) {
      return 'accelerating';
    } else if (velocity >= 0.8) {
      return 'steady';
    } else if (velocity >= 0.5) {
      return 'decelerating';
    } else {
      return 'stalled';
    }
  }

  /**
   * Calculate velocity trend analysis
   */
  private calculateVelocityTrend(snapshots: VelocitySnapshot[]): VelocityTrend {
    if (snapshots.length === 0) {
      return {
        current_week_velocity: 0,
        previous_week_velocity: 0,
        week_over_week_change: 0,
        average_velocity_4_weeks: 0,
        best_week_velocity: 0,
        worst_week_velocity: 0,
        streak_count: 0,
      };
    }

    const currentWeek = snapshots[snapshots.length - 1];
    const previousWeek = snapshots.length > 1 ? snapshots[snapshots.length - 2] : currentWeek;

    // Week-over-week change
    const weekOverWeekChange =
      previousWeek.velocity_score > 0
        ? ((currentWeek.velocity_score - previousWeek.velocity_score) / previousWeek.velocity_score) *
          100
        : 0;

    // Average velocity (last 4 weeks)
    const last4Weeks = snapshots.slice(-4);
    const avg4Weeks =
      last4Weeks.reduce((sum, s) => sum + s.velocity_score, 0) / last4Weeks.length;

    // Best and worst week
    const velocities = snapshots.map((s) => s.velocity_score);
    const bestWeek = Math.max(...velocities);
    const worstWeek = Math.min(...velocities);

    // Streak count (consecutive weeks >= 0.8)
    let streak = 0;
    for (let i = snapshots.length - 1; i >= 0; i--) {
      if (snapshots[i].velocity_score >= 0.8) {
        streak++;
      } else {
        break;
      }
    }

    return {
      current_week_velocity: currentWeek.velocity_score,
      previous_week_velocity: previousWeek.velocity_score,
      week_over_week_change: parseFloat(weekOverWeekChange.toFixed(1)),
      average_velocity_4_weeks: parseFloat(avg4Weeks.toFixed(2)),
      best_week_velocity: parseFloat(bestWeek.toFixed(2)),
      worst_week_velocity: parseFloat(worstWeek.toFixed(2)),
      streak_count: streak,
    };
  }

  /**
   * Analyze momentum patterns
   */
  private analyzeMomentum(snapshots: VelocitySnapshot[], trend: VelocityTrend): MomentumAnalysis {
    const contributingFactors: {
      factor: string;
      impact: 'positive' | 'negative' | 'neutral';
      description: string;
    }[] = [];

    const atRiskIndicators: string[] = [];
    const momentumDrivers: string[] = [];

    // Analyze velocity trend
    if (trend.week_over_week_change > 10) {
      contributingFactors.push({
        factor: 'Velocity Acceleration',
        impact: 'positive',
        description: `Velocity increased ${trend.week_over_week_change.toFixed(1)}% from last week`,
      });
      momentumDrivers.push('Strong week-over-week velocity improvement');
    } else if (trend.week_over_week_change < -10) {
      contributingFactors.push({
        factor: 'Velocity Deceleration',
        impact: 'negative',
        description: `Velocity decreased ${Math.abs(trend.week_over_week_change).toFixed(1)}% from last week`,
      });
      atRiskIndicators.push('Velocity declining week-over-week');
    }

    // Analyze current velocity
    if (trend.current_week_velocity >= 1.0) {
      momentumDrivers.push('Ahead of schedule (velocity ≥ 1.0)');
    } else if (trend.current_week_velocity < 0.8) {
      atRiskIndicators.push('Below target velocity (< 0.8)');
    }

    // Analyze streak
    if (trend.streak_count >= 3) {
      contributingFactors.push({
        factor: 'Consistency Streak',
        impact: 'positive',
        description: `${trend.streak_count} consecutive weeks with velocity ≥ 0.8`,
      });
      momentumDrivers.push(`Strong ${trend.streak_count}-week consistency streak`);
    } else if (trend.streak_count === 0) {
      atRiskIndicators.push('No recent weeks with velocity ≥ 0.8');
    }

    // Analyze proof generation
    const recentSnapshots = snapshots.slice(-4);
    const avgProofArtifacts =
      recentSnapshots.reduce((sum, s) => sum + s.proof_artifacts_count, 0) / recentSnapshots.length;

    if (avgProofArtifacts >= 3) {
      contributingFactors.push({
        factor: 'Proof Generation',
        impact: 'positive',
        description: `Averaging ${avgProofArtifacts.toFixed(1)} proof artifacts per week`,
      });
      momentumDrivers.push('Consistent public proof generation');
    } else if (avgProofArtifacts < 1) {
      contributingFactors.push({
        factor: 'Low Proof Output',
        impact: 'negative',
        description: `Only ${avgProofArtifacts.toFixed(1)} proof artifacts per week (target: 3+)`,
      });
      atRiskIndicators.push('Insufficient proof generation (< 1 per week)');
    }

    // Calculate momentum score (-10 to +10)
    let momentumScore = 0;

    // Factor in velocity trend
    momentumScore += trend.week_over_week_change / 10; // ±10% = ±1 point

    // Factor in absolute velocity
    if (trend.current_week_velocity >= 1.2) {
      momentumScore += 3;
    } else if (trend.current_week_velocity >= 1.0) {
      momentumScore += 2;
    } else if (trend.current_week_velocity >= 0.8) {
      momentumScore += 1;
    } else if (trend.current_week_velocity < 0.5) {
      momentumScore -= 3;
    } else if (trend.current_week_velocity < 0.8) {
      momentumScore -= 1;
    }

    // Factor in streak
    momentumScore += Math.min(trend.streak_count, 3); // Max +3 for streaks

    // Clamp to -10 to +10
    momentumScore = Math.max(-10, Math.min(10, momentumScore));

    // Determine current momentum
    let currentMomentum: 'accelerating' | 'steady' | 'decelerating' | 'stalled';

    if (momentumScore >= 5) {
      currentMomentum = 'accelerating';
    } else if (momentumScore >= 0) {
      currentMomentum = 'steady';
    } else if (momentumScore >= -5) {
      currentMomentum = 'decelerating';
    } else {
      currentMomentum = 'stalled';
    }

    return {
      current_momentum: currentMomentum,
      momentum_score: parseFloat(momentumScore.toFixed(1)),
      contributing_factors: contributingFactors,
      at_risk_indicators: atRiskIndicators,
      momentum_drivers: momentumDrivers,
    };
  }

  /**
   * Generate velocity recommendations
   */
  private generateRecommendations(
    trend: VelocityTrend,
    momentum: MomentumAnalysis
  ): VelocityRecommendations {
    const recommendedActions: string[] = [];
    const scopeAdjustments: string[] = [];
    const supportNeeded: string[] = [];
    let priority: 'celebrate' | 'maintain' | 'adjust' | 'escalate';
    let nextWeekTarget: number;

    // Determine priority level
    if (momentum.current_momentum === 'accelerating' && trend.current_week_velocity >= 1.0) {
      priority = 'celebrate';
      nextWeekTarget = Math.min(1.3, trend.current_week_velocity + 0.1); // Incremental stretch

      recommendedActions.push('🎉 Celebrate wins! Share progress publicly to build momentum');
      recommendedActions.push('Document what worked this week (repeat winning strategies)');
      recommendedActions.push('Consider adding one P2 stretch goal if energy allows');
    } else if (
      momentum.current_momentum === 'steady' &&
      trend.current_week_velocity >= 0.8
    ) {
      priority = 'maintain';
      nextWeekTarget = trend.average_velocity_4_weeks; // Maintain average

      recommendedActions.push('Maintain current pace - velocity is healthy');
      recommendedActions.push('Continue weekly cadence (TYPE-052): Prioritize → Produce → Publish');
      recommendedActions.push('Protect deep work blocks on Tue-Thu');
    } else if (
      momentum.current_momentum === 'decelerating' ||
      trend.current_week_velocity < 0.8
    ) {
      priority = 'adjust';
      nextWeekTarget = 0.8; // Reset to baseline target

      recommendedActions.push('⚠️ Velocity below target - time to adjust scope');
      recommendedActions.push('Review weekly plan: Are goals realistic?');
      recommendedActions.push('Identify 1-2 blockers and escalate to coach');

      scopeAdjustments.push('Cut P2/P3 outcomes - focus only on P0/P1');
      scopeAdjustments.push('Reduce task complexity: Break large tasks into smaller chunks');
      scopeAdjustments.push('Extend deadlines by 1 week for non-critical items');
    } else {
      // Stalled momentum
      priority = 'escalate';
      nextWeekTarget = 0.5; // Minimal target to regain momentum

      recommendedActions.push('🚨 ESCALATE: Stalled velocity requires intervention');
      recommendedActions.push('Schedule emergency session with coach');
      recommendedActions.push('Identify root cause: Burnout? Blocking? Overwhelm?');

      scopeAdjustments.push('AGGRESSIVE SCOPE CUT: Focus on 1 single P0 outcome only');
      scopeAdjustments.push('Cancel all P1/P2/P3 outcomes this week');
      scopeAdjustments.push('Simplify P0 to absolute MVP (10 users → 3 users, 5 features → 1 feature)');

      supportNeeded.push('Coach: Emergency check-in to diagnose blocking');
      supportNeeded.push('Parent: May need help with time/resource constraints');
      supportNeeded.push('Teacher/Mentor: Consider recruiting ally for blocked technical work');
    }

    // Add proof generation recommendations
    if (momentum.at_risk_indicators.some((indicator) => indicator.includes('proof'))) {
      recommendedActions.push('Increase proof generation: Aim for 3+ public artifacts per week');
      recommendedActions.push('Friday publish ritual: Ship something publicly every Friday');
    }

    // Add capacity recommendations
    if (trend.current_week_velocity < 0.8 && trend.average_velocity_4_weeks < 0.8) {
      recommendedActions.push('Chronic underdelivery - review time capacity (TYPE-053)');
      scopeAdjustments.push('May be overcommitted - reduce total weekly hours to 12-15');
    }

    return {
      priority,
      recommended_actions: recommendedActions,
      scope_adjustments: scopeAdjustments,
      support_needed: supportNeeded,
      next_week_target_velocity: parseFloat(nextWeekTarget.toFixed(2)),
    };
  }

  /**
   * Analyze capacity utilization
   */
  private analyzeCapacity(snapshots: VelocitySnapshot[]): {
    total_capacity_hours: number;
    actual_utilization_hours: number;
    utilization_rate: number;
    overcommitment_risk: 'none' | 'low' | 'medium' | 'high' | 'critical';
  } {
    if (snapshots.length === 0) {
      return {
        total_capacity_hours: 20,
        actual_utilization_hours: 0,
        utilization_rate: 0,
        overcommitment_risk: 'none',
      };
    }

    // Calculate average weekly capacity and utilization
    const recentSnapshots = snapshots.slice(-4); // Last 4 weeks

    // Assume 20 hours/week discretionary capacity (Jenny's coaching standard)
    const totalCapacity = 20;

    // Calculate average actual hours worked
    const avgActualHours =
      recentSnapshots.reduce((sum, s) => sum + s.deep_work_hours, 0) / recentSnapshots.length;

    const utilizationRate = avgActualHours / totalCapacity;

    // Determine overcommitment risk
    let overcommitmentRisk: 'none' | 'low' | 'medium' | 'high' | 'critical';

    if (utilizationRate > 1.25) {
      overcommitmentRisk = 'critical'; // >25 hours/week
    } else if (utilizationRate > 1.1) {
      overcommitmentRisk = 'high'; // 22-25 hours/week
    } else if (utilizationRate > 1.0) {
      overcommitmentRisk = 'medium'; // 20-22 hours/week
    } else if (utilizationRate > 0.9) {
      overcommitmentRisk = 'low'; // 18-20 hours/week
    } else {
      overcommitmentRisk = 'none'; // <18 hours/week
    }

    return {
      total_capacity_hours: totalCapacity,
      actual_utilization_hours: parseFloat(avgActualHours.toFixed(1)),
      utilization_rate: parseFloat(utilizationRate.toFixed(2)),
      overcommitment_risk: overcommitmentRisk,
    };
  }
}

/**
 * TYPE-053: Time Architecture & Capacity Intelligence
 * Category: DOMAIN_SPECIFIC (ExecutionAgent)
 *
 * Framework: 168-Hour Weekly Framework
 *
 * Purpose: Calculate available capacity for student work using 168-hour weekly breakdown.
 * Prevents burnout through capacity stress testing and realistic time allocation.
 *
 * Algorithm:
 * 1. Total weekly hours = 168
 * 2. Fixed commitments = School (40h) + Sleep (56h) + Family (20h) = 116h
 * 3. Available discretionary = 52h
 * 4. Optimal allocation = Deep Work (30h) + Social (10h) + Buffer (12h)
 * 5. Capacity stress test = Compare requested hours vs. available capacity
 * 6. Warning levels:
 *    - <8h/week = Light week (underutilized)
 *    - 8-20h/week = Healthy (sustainable)
 *    - 20-25h/week = Ambitious (warning)
 *    - >25h/week = Critical overcommitment (burnout risk)
 *
 * Data Sources:
 * - W007 session transcript (time capacity assessment)
 * - W000-FRAMEWORK-003 (168-Hour Framework)
 * - Student weekly_vitals (actual time logged)
 *
 * Output: TimeArchitectureResult
 * - total_available_hours: 52h discretionary
 * - current_allocation: { deep_work, social, buffer }
 * - requested_allocation: { from outcomes/tasks }
 * - capacity_status: 'underutilized' | 'healthy' | 'ambitious' | 'critical'
 * - recommendations: Capacity adjustment suggestions
 *
 * Created: 2025-10-29
 * Version: v20.2
 */

import { IntelligenceType, IntelligenceResult, AgentQuery, FactSet } from './BaseIntelligenceType.js';

/**
 * Time allocation breakdown
 */
interface TimeAllocation {
  deep_work_hours: number;      // Focused work on projects/tasks
  social_hours: number;          // Social activities, clubs, friends
  buffer_hours: number;          // Flex time, rest, recovery
  total_discretionary: number;   // Sum of above (should = 52h)
}

/**
 * Fixed weekly commitments
 */
interface FixedCommitments {
  school_hours: number;          // Class time + homework (default 40h)
  sleep_hours: number;           // 8h/night × 7 = 56h
  family_hours: number;          // Meals, family time (default 20h)
  total_fixed: number;           // Sum of above (default 116h)
}

/**
 * Capacity stress analysis
 */
interface CapacityStressTest {
  requested_hours: number;       // Total hours requested from tasks/outcomes
  available_hours: number;       // Total discretionary available (52h)
  utilization_rate: number;      // requested / available (0.0-1.0+)
  status: 'underutilized' | 'healthy' | 'ambitious' | 'critical';
  warning_message: string | null;
}

/**
 * Time architecture result
 */
interface TimeArchitectureResult {
  total_weekly_hours: number;    // Always 168
  fixed_commitments: FixedCommitments;
  available_discretionary: number; // Always 52h (168 - 116)
  current_allocation: TimeAllocation;
  requested_allocation: number;  // From tasks/outcomes
  capacity_stress: CapacityStressTest;
  recommendations: string[];
}

export class TimeArchitecture implements IntelligenceType {
  type_id = 'TYPE-053';
  name = 'Time Architecture & Capacity';
  category = 'DOMAIN_SPECIFIC' as const;
  agent_id = 'ExecutionAgent';
  version = 'v20.2';

  /**
   * Process time architecture analysis
   */
  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {
    const studentId = query.student_id;

    // Extract facts
    const weeklyVitalsFacts = facts.facts.filter(f => f.category === 'WEEKLY_VITALS');
    const outcomesFacts = facts.facts.filter(f => f.category === 'OUTCOMES');
    const tasksFacts = facts.facts.filter(f => f.category === 'TASKS');

    // Calculate fixed commitments (default values)
    const fixedCommitments = this.calculateFixedCommitments(weeklyVitalsFacts);

    // Calculate available discretionary time
    const availableDiscretionary = 168 - fixedCommitments.total_fixed; // Should be 52h

    // Get current time allocation from weekly vitals
    const currentAllocation = this.getCurrentAllocation(weeklyVitalsFacts);

    // Calculate requested hours from outcomes/tasks
    const requestedHours = this.calculateRequestedHours(outcomesFacts, tasksFacts);

    // Perform capacity stress test
    const capacityStress = this.performCapacityStressTest(requestedHours, availableDiscretionary);

    // Generate recommendations
    const recommendations = this.generateRecommendations(capacityStress, currentAllocation, fixedCommitments);

    const result: TimeArchitectureResult = {
      total_weekly_hours: 168,
      fixed_commitments: fixedCommitments,
      available_discretionary: availableDiscretionary,
      current_allocation: currentAllocation,
      requested_allocation: requestedHours,
      capacity_stress: capacityStress,
      recommendations: recommendations,
    };

    return {
      type_id: this.type_id,
      triggered: true,
      confidence: 0.9,
      data: result,
    };
  }

  /**
   * Calculate fixed weekly commitments
   */
  private calculateFixedCommitments(weeklyVitalsFacts: any[]): FixedCommitments {
    // Default values from 168-Hour Framework
    let schoolHours = 40; // Class time (30h) + homework (10h)
    let sleepHours = 56;  // 8h/night × 7 days
    let familyHours = 20; // Meals + family time

    // Override with actual logged hours if available
    const latestVitals = weeklyVitalsFacts[weeklyVitalsFacts.length - 1];
    if (latestVitals?.data) {
      schoolHours = latestVitals.data.school_hours || schoolHours;
      sleepHours = latestVitals.data.sleep_hours || sleepHours;
      familyHours = latestVitals.data.family_hours || familyHours;
    }

    return {
      school_hours: schoolHours,
      sleep_hours: sleepHours,
      family_hours: familyHours,
      total_fixed: schoolHours + sleepHours + familyHours,
    };
  }

  /**
   * Get current time allocation from weekly vitals
   */
  private getCurrentAllocation(weeklyVitalsFacts: any[]): TimeAllocation {
    // Default optimal allocation
    let deepWorkHours = 30;
    let socialHours = 10;
    let bufferHours = 12;

    // Override with actual logged hours if available
    const latestVitals = weeklyVitalsFacts[weeklyVitalsFacts.length - 1];
    if (latestVitals?.data) {
      deepWorkHours = latestVitals.data.deep_work_hours || deepWorkHours;
      socialHours = latestVitals.data.social_hours || socialHours;
      bufferHours = latestVitals.data.buffer_hours || bufferHours;
    }

    return {
      deep_work_hours: deepWorkHours,
      social_hours: socialHours,
      buffer_hours: bufferHours,
      total_discretionary: deepWorkHours + socialHours + bufferHours,
    };
  }

  /**
   * Calculate requested hours from outcomes and tasks
   */
  private calculateRequestedHours(outcomesFacts: any[], tasksFacts: any[]): number {
    let totalHours = 0;

    // Sum hours from outcomes (if they have time estimates)
    outcomesFacts.forEach(fact => {
      if (fact.data?.estimated_hours) {
        totalHours += fact.data.estimated_hours;
      }
    });

    // Sum hours from tasks (if they have time estimates)
    tasksFacts.forEach(fact => {
      if (fact.data?.estimated_effort_minutes) {
        totalHours += fact.data.estimated_effort_minutes / 60;
      }
    });

    // If no explicit estimates, use heuristic based on task count
    if (totalHours === 0 && (outcomesFacts.length > 0 || tasksFacts.length > 0)) {
      // Estimate: 2h per outcome, 0.5h per task
      totalHours = (outcomesFacts.length * 2) + (tasksFacts.length * 0.5);
    }

    return Math.round(totalHours * 10) / 10; // Round to 1 decimal
  }

  /**
   * Perform capacity stress test
   */
  private performCapacityStressTest(requestedHours: number, availableHours: number): CapacityStressTest {
    const utilizationRate = requestedHours / availableHours;

    let status: 'underutilized' | 'healthy' | 'ambitious' | 'critical';
    let warningMessage: string | null = null;

    if (requestedHours < 8) {
      status = 'underutilized';
      warningMessage = '✅ Light week - consider adding P1/P2 outcomes if capacity allows';
    } else if (requestedHours >= 8 && requestedHours <= 20) {
      status = 'healthy';
      warningMessage = null; // No warning, this is the sweet spot
    } else if (requestedHours > 20 && requestedHours <= 25) {
      status = 'ambitious';
      warningMessage = '⚠️ WARNING: Ambitious workload (20-25h). Monitor for overwhelm signals.';
    } else {
      status = 'critical';
      warningMessage = '🚨 CRITICAL: Burnout risk (>25h requested). SCOPE CUT required immediately.';
    }

    return {
      requested_hours: requestedHours,
      available_hours: availableHours,
      utilization_rate: Math.round(utilizationRate * 100) / 100,
      status: status,
      warning_message: warningMessage,
    };
  }

  /**
   * Generate capacity recommendations
   */
  private generateRecommendations(
    capacityStress: CapacityStressTest,
    currentAllocation: TimeAllocation,
    fixedCommitments: FixedCommitments
  ): string[] {
    const recommendations: string[] = [];

    // Critical overcommitment - aggressive scope cut needed
    if (capacityStress.status === 'critical') {
      recommendations.push('🚨 PRIORITY: Cut scope to 1 P0 outcome only (drop all P1/P2)');
      recommendations.push('Consider: Can any tasks be delegated to parents/collaborators?');
      recommendations.push('Consider: Can any deadlines be pushed to next week?');
      recommendations.push(`Target: Reduce from ${capacityStress.requested_hours}h to 15-20h max`);
    }

    // Ambitious workload - monitor and prepare to cut
    if (capacityStress.status === 'ambitious') {
      recommendations.push('⚠️ Monitor overwhelm signals (stress, missed deadlines, quality drops)');
      recommendations.push('Have backup plan: Which P1 outcomes can be dropped if needed?');
      recommendations.push('Protect buffer time (12h/week) - do NOT reduce to add capacity');
    }

    // Healthy range - optimize allocation
    if (capacityStress.status === 'healthy') {
      recommendations.push(`✅ Sustainable workload (${capacityStress.requested_hours}h/week)`);
      recommendations.push('Maintain current pace - no scope changes needed');

      // Check if deep work allocation is optimal
      if (currentAllocation.deep_work_hours < 20) {
        recommendations.push('Consider: Increase deep work time (currently ${currentAllocation.deep_work_hours}h, target 25-30h)');
      }
    }

    // Underutilized - can add more
    if (capacityStress.status === 'underutilized') {
      recommendations.push(`Light week (${capacityStress.requested_hours}h) - capacity available for P1/P2 outcomes`);
      recommendations.push('Consider: Add 1-2 P1 outcomes (awards applications, program research)');
      recommendations.push('Or: Use extra time for proofpack assembly, portfolio updates');
    }

    // Check for sleep deprivation warning
    if (fixedCommitments.sleep_hours < 49) { // Less than 7h/night average
      recommendations.push('🚨 SLEEP WARNING: <7h/night detected. Sleep must be protected (56h/week minimum).');
      recommendations.push('Scope cut immediately - insufficient sleep = performance collapse');
    }

    // Check for zero buffer time (burnout indicator)
    if (currentAllocation.buffer_hours < 5) {
      recommendations.push('⚠️ BUFFER WARNING: <5h buffer time detected. Burnout risk.');
      recommendations.push('Protect 10-12h buffer time for rest/recovery/flexibility');
    }

    return recommendations;
  }
}

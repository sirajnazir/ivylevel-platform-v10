/**
 * TYPE-016: Time Mathematics (168-Hour Architecture)
 *
 * **Purpose:** Validate realistic hour claims and ensure activities fit within actual weekly availability.
 * Prevents students from overclaiming hours and validates commitments align with real available time.
 *
 * **Core Framework:**
 * - 168-Hour Weekly Architecture: 168h total - 56h sleep - 37.5h school = 74.5h available
 * - Reality Check Formula: totalClaimedHours ≤ 74.5h (non-negotiable)
 * - Individual Activity Validation: No single activity > 20h/week
 * - Task Load Validation: hours/week × weeks/year = total annual hours
 *
 * **Data Dependencies:**
 * - EXEC chips Batch v2: 168-Hour Architecture, Hours Reality Check formulas
 * - W005: Naviance analysis, multi-project management
 *
 * **Example Usage:**
 * Query: "I have 4 activities totaling 83h/week. Is this realistic?"
 * TYPE-016 Output: "❌ INVALID: 83h exceeds 74.5h limit by 8.5h. Reduce hours or be honest about time."
 *
 * **Spec Reference:**
 * /docs/agents/EXTRACURRICULARS_AGENT_TECH_SPEC.md (Lines 157, 226-230, 270-275)
 *
 * @module Intelligence/Types
 * @intelligence-type TYPE-016
 */

import { BaseIntelligenceType } from './BaseIntelligenceType.js';
import { Fact } from '../../a2a/types';

// ==================== INTERFACES ====================

/**
 * 168-Hour Weekly Architecture breakdown
 */
interface WeeklyHoursBreakdown {
  total_hours: number; // 168h fixed
  sleep: number; // 56h (8h/night × 7)
  school: number; // 37.5h (7.5h/day × 5)
  meals_transit_downtime: number; // ~20h estimate
  available_discretionary: number; // 74.5h after essentials
}

/**
 * Hours audit result
 */
interface HoursAudit {
  realistic: boolean;
  total_claimed_hours: number;
  available_hours: number;
  overclaimed_by?: number; // If >0, student overclaimed
  buffer?: number; // If realistic, how much capacity left
  recommendation: string;
  activity_breakdown: {
    activity_name: string;
    hours_per_week: number;
    weeks_per_year: number;
    annual_hours: number;
    flag?: string; // 'unrealistic' | 'suspicious' | 'valid'
  }[];
}

/**
 * Individual activity time validation
 */
interface ActivityTimeValidation {
  activity_name: string;
  hours_per_week: number;
  weeks_per_year: number;
  annual_hours: number;
  valid: boolean;
  issues: string[];
  recommendation: string;
}

/**
 * Portfolio-level time assessment
 */
interface PortfolioTimeAssessment {
  hours_audit: HoursAudit;
  activity_validations: ActivityTimeValidation[];
  overall_health: {
    status: 'VALID' | 'TIGHT' | 'OVERCAPACITY' | 'UNDERUTILIZED';
    score: number; // 0-100, based on realistic time management
    message: string;
  };
  recommendations: string[];
}

// ==================== TYPE-016 IMPLEMENTATION ====================

export class TimeMathematics extends BaseIntelligenceType {
  readonly type_id = 'TYPE-016';
  readonly name = 'Time_Mathematics';
  readonly category = 'extracurriculars';

  // 168-Hour Architecture constants
  private readonly TOTAL_HOURS_PER_WEEK = 168;
  private readonly SLEEP_HOURS = 56; // 8h/night × 7
  private readonly SCHOOL_HOURS = 37.5; // 7.5h/day × 5
  private readonly MEALS_TRANSIT_DOWNTIME = 20; // Estimate
  private readonly AVAILABLE_DISCRETIONARY = 74.5; // After essentials
  private readonly MAX_SINGLE_ACTIVITY = 20; // No single activity >20h/week
  private readonly HEALTHY_MIN = 40; // Minimum for engaged student
  private readonly HEALTHY_MAX = 60; // Maximum for sustainable load
  private readonly TIGHT_THRESHOLD = 70; // Very tight, no margin

  /**
   * Primary entry point: Validate time claims across portfolio
   */
  async process(facts: Fact[]): Promise<Fact[]> {
    // Extract required facts
    const activities = facts.filter(f => f.fact_type === 'ACTIVITY');
    const profile = facts.find(f => f.fact_type === 'STUDENT_PROFILE');

    if (activities.length === 0) {
      return [{
        fact_type: 'TIME_MATHEMATICS_ASSESSMENT',
        student_id: profile?.student_id || 'unknown',
        metadata: {
          status: 'insufficient_data',
          message: 'No activities found to validate. Need ACTIVITY facts.',
        },
      }];
    }

    // Perform portfolio-level time assessment
    const assessment = this.assessPortfolioTime(activities);

    // Convert to facts
    return this.convertAssessmentToFacts(assessment, profile?.student_id || 'unknown');
  }

  // ==================== PORTFOLIO TIME ASSESSMENT ====================

  /**
   * Assess time across entire portfolio
   */
  private assessPortfolioTime(activities: Fact[]): PortfolioTimeAssessment {
    // Audit total hours
    const hours_audit = this.auditTotalHours(activities);

    // Validate each activity individually
    const activity_validations = activities.map(a => this.validateActivityTime(a));

    // Calculate overall health
    const overall_health = this.calculateTimeHealth(hours_audit, activity_validations);

    // Generate recommendations
    const recommendations = this.generateTimeRecommendations(
      hours_audit,
      activity_validations,
      overall_health
    );

    return {
      hours_audit,
      activity_validations,
      overall_health,
      recommendations,
    };
  }

  // ==================== HOURS AUDIT ====================

  /**
   * Audit total claimed hours against 168-Hour Architecture
   */
  private auditTotalHours(activities: Fact[]): HoursAudit {
    const activity_breakdown = activities.map(a => {
      const name = a.metadata?.activity_name || 'Unknown';
      const hours_per_week = a.metadata?.hours_per_week || 0;
      const weeks_per_year = a.metadata?.weeks_per_year || 0;
      const annual_hours = hours_per_week * weeks_per_year;

      // Flag unrealistic activities
      let flag: string | undefined;
      if (hours_per_week > this.MAX_SINGLE_ACTIVITY) {
        flag = 'unrealistic';
      } else if (hours_per_week >= 15 && weeks_per_year >= 50) {
        flag = 'suspicious'; // High hours year-round is unusual
      } else {
        flag = 'valid';
      }

      return {
        activity_name: name,
        hours_per_week,
        weeks_per_year,
        annual_hours,
        flag,
      };
    });

    const total_claimed_hours = activity_breakdown.reduce(
      (sum, a) => sum + a.hours_per_week,
      0
    );

    const available_hours = this.AVAILABLE_DISCRETIONARY;
    const realistic = total_claimed_hours <= available_hours;

    let recommendation: string;
    if (!realistic) {
      const overclaimed_by = total_claimed_hours - available_hours;
      recommendation = `❌ TIME OVERCAPACITY: Claimed ${total_claimed_hours}h/week but only ${available_hours}h available. Overclaimed by ${overclaimed_by.toFixed(1)}h. Reduce hours or be honest about time commitment.`;
    } else {
      const buffer = available_hours - total_claimed_hours;
      if (total_claimed_hours >= this.TIGHT_THRESHOLD) {
        recommendation = `⚠️ VERY TIGHT SCHEDULE: ${total_claimed_hours}h/week claimed (${buffer.toFixed(1)}h buffer). No margin for error. Consider reducing if unsustainable.`;
      } else if (total_claimed_hours >= this.HEALTHY_MAX) {
        recommendation = `⚠️ HIGH LOAD: ${total_claimed_hours}h/week is sustainable but intense. Buffer: ${buffer.toFixed(1)}h. Limited flexibility for new commitments.`;
      } else if (total_claimed_hours >= this.HEALTHY_MIN) {
        recommendation = `✅ HEALTHY RANGE: ${total_claimed_hours}h/week is realistic and sustainable. Buffer: ${buffer.toFixed(1)}h available for expansion or personal time.`;
      } else {
        recommendation = `📊 UNDERUTILIZED: ${total_claimed_hours}h/week leaves ${buffer.toFixed(1)}h unused capacity. You have room to add 1-2 more activities or increase commitments.`;
      }
    }

    return {
      realistic,
      total_claimed_hours,
      available_hours,
      overclaimed_by: !realistic ? total_claimed_hours - available_hours : undefined,
      buffer: realistic ? available_hours - total_claimed_hours : undefined,
      recommendation,
      activity_breakdown,
    };
  }

  // ==================== ACTIVITY VALIDATION ====================

  /**
   * Validate individual activity time claims
   */
  private validateActivityTime(activity: Fact): ActivityTimeValidation {
    const name = activity.metadata?.activity_name || 'Unknown';
    const hours_per_week = activity.metadata?.hours_per_week || 0;
    const weeks_per_year = activity.metadata?.weeks_per_year || 0;
    const annual_hours = hours_per_week * weeks_per_year;

    const issues: string[] = [];
    let valid = true;

    // Check 1: Single activity >20h/week (unrealistic)
    if (hours_per_week > this.MAX_SINGLE_ACTIVITY) {
      issues.push(`${hours_per_week}h/week exceeds realistic limit of ${this.MAX_SINGLE_ACTIVITY}h for single activity`);
      valid = false;
    }

    // Check 2: Weeks per year >52 (impossible)
    if (weeks_per_year > 52) {
      issues.push(`${weeks_per_year} weeks/year exceeds 52 weeks in a year`);
      valid = false;
    }

    // Check 3: Suspicious year-round high commitment (15+ hrs, 50+ weeks)
    if (hours_per_week >= 15 && weeks_per_year >= 50) {
      issues.push(`${hours_per_week}h/week for ${weeks_per_year} weeks/year is unusually intense year-round. Verify accuracy.`);
    }

    // Check 4: Low annual hours but high weekly hours (suspicious)
    if (hours_per_week >= 10 && weeks_per_year < 10) {
      issues.push(`High weekly hours (${hours_per_week}h) but low weeks/year (${weeks_per_year}). Seasonal activity?`);
    }

    // Generate recommendation
    let recommendation: string;
    if (!valid) {
      recommendation = `Reduce ${name} hours to realistic level. ${issues.join('. ')}`;
    } else if (issues.length > 0) {
      recommendation = `Review ${name} time claims: ${issues.join('. ')}`;
    } else {
      recommendation = `✅ ${name} time commitment is realistic: ${hours_per_week}h/week × ${weeks_per_year} weeks = ${annual_hours}h/year`;
    }

    return {
      activity_name: name,
      hours_per_week,
      weeks_per_year,
      annual_hours,
      valid,
      issues,
      recommendation,
    };
  }

  // ==================== TIME HEALTH ====================

  /**
   * Calculate overall portfolio time health (0-100 score)
   */
  private calculateTimeHealth(
    hours_audit: HoursAudit,
    activity_validations: ActivityTimeValidation[]
  ): PortfolioTimeAssessment['overall_health'] {
    let score = 50; // Baseline

    // Factor 1: Realistic total hours
    if (!hours_audit.realistic) {
      score -= 40; // Major penalty for overcapacity
    } else if (hours_audit.total_claimed_hours >= this.TIGHT_THRESHOLD) {
      score -= 15; // Penalty for very tight schedule
    } else if (hours_audit.total_claimed_hours >= this.HEALTHY_MAX) {
      score -= 5; // Small penalty for high load
    } else if (hours_audit.total_claimed_hours >= this.HEALTHY_MIN) {
      score += 20; // Bonus for healthy range
    } else {
      score -= 10; // Penalty for underutilization
    }

    // Factor 2: Individual activity validity
    const invalid_activities = activity_validations.filter(v => !v.valid).length;
    score -= invalid_activities * 15; // -15 per invalid activity

    // Factor 3: Suspicious activities
    const suspicious_activities = activity_validations.filter(
      v => v.issues.length > 0 && v.valid
    ).length;
    score -= suspicious_activities * 5; // -5 per suspicious activity

    // Clamp score to 0-100
    score = Math.max(0, Math.min(100, score));

    // Determine status
    let status: PortfolioTimeAssessment['overall_health']['status'];
    let message: string;

    if (!hours_audit.realistic) {
      status = 'OVERCAPACITY';
      message = `Time overcapacity detected: ${hours_audit.total_claimed_hours}h claimed but only ${hours_audit.available_hours}h available. Score: ${score}/100`;
    } else if (hours_audit.total_claimed_hours >= this.TIGHT_THRESHOLD) {
      status = 'TIGHT';
      message = `Very tight schedule: ${hours_audit.total_claimed_hours}h/week with ${hours_audit.buffer?.toFixed(1)}h buffer. Score: ${score}/100`;
    } else if (hours_audit.total_claimed_hours < this.HEALTHY_MIN) {
      status = 'UNDERUTILIZED';
      message = `Underutilized capacity: ${hours_audit.total_claimed_hours}h/week leaves ${hours_audit.buffer?.toFixed(1)}h unused. Score: ${score}/100`;
    } else {
      status = 'VALID';
      message = `Healthy time management: ${hours_audit.total_claimed_hours}h/week with ${hours_audit.buffer?.toFixed(1)}h buffer. Score: ${score}/100`;
    }

    return { status, score, message };
  }

  // ==================== RECOMMENDATIONS ====================

  /**
   * Generate time management recommendations
   */
  private generateTimeRecommendations(
    hours_audit: HoursAudit,
    activity_validations: ActivityTimeValidation[],
    overall_health: PortfolioTimeAssessment['overall_health']
  ): string[] {
    const recommendations: string[] = [];

    // Rec 1: Overall health message
    recommendations.push(overall_health.message);

    // Rec 2: Overcapacity specific actions
    if (!hours_audit.realistic) {
      const overclaimed = hours_audit.overclaimed_by || 0;
      recommendations.push(
        `⚠️ ACTION REQUIRED: Reduce total hours by ${overclaimed.toFixed(1)}h. Options:`,
        `   - Drop ${Math.ceil(overclaimed / 5)} low-impact activities (~5h each)`,
        `   - Reduce hours on validation activities (keep flagship hours accurate)`,
        `   - Be honest about actual time spent (don't inflate for resume)`
      );
    }

    // Rec 3: Invalid activities
    const invalid_activities = activity_validations.filter(v => !v.valid);
    if (invalid_activities.length > 0) {
      recommendations.push(
        `⚠️ UNREALISTIC ACTIVITIES (${invalid_activities.length}):`
      );
      for (const activity of invalid_activities.slice(0, 3)) {
        recommendations.push(
          `   - ${activity.activity_name}: ${activity.issues[0]}`
        );
      }
    }

    // Rec 4: Suspicious activities (review needed)
    const suspicious_activities = activity_validations.filter(
      v => v.valid && v.issues.length > 0
    );
    if (suspicious_activities.length > 0) {
      recommendations.push(
        `📋 REVIEW NEEDED (${suspicious_activities.length} activities):`
      );
      for (const activity of suspicious_activities.slice(0, 3)) {
        recommendations.push(
          `   - ${activity.activity_name}: ${activity.issues[0]}`
        );
      }
    }

    // Rec 5: Capacity recommendations
    if (overall_health.status === 'UNDERUTILIZED') {
      const buffer = hours_audit.buffer || 0;
      recommendations.push(
        `💡 CAPACITY AVAILABLE: You have ${buffer.toFixed(1)}h/week unused. Consider:`,
        `   - Add 1-2 new activities aligned with your narrative`,
        `   - Increase commitment to existing flagship activities`,
        `   - Start a new self-initiated project (founder role)`
      );
    } else if (overall_health.status === 'TIGHT') {
      recommendations.push(
        `⚠️ SCHEDULE WARNING: Very tight schedule with minimal buffer. If unsustainable:`,
        `   - Reduce hours on 1-2 validation activities`,
        `   - Drop activities that don't align with narrative`,
        `   - Be realistic about homework time (typically 14-21h/week for AP/IB)`
      );
    } else if (overall_health.status === 'VALID') {
      recommendations.push(
        `✅ WELL-BALANCED: Time management is realistic and sustainable. Continue current commitments.`
      );
    }

    return recommendations;
  }

  // ==================== FACT CONVERSION ====================

  /**
   * Convert time assessment to structured facts
   */
  private convertAssessmentToFacts(
    assessment: PortfolioTimeAssessment,
    studentId: string
  ): Fact[] {
    const facts: Fact[] = [];

    // Fact 1: Overall time health
    facts.push({
      fact_type: 'TIME_PORTFOLIO_HEALTH',
      student_id: studentId,
      metadata: {
        status: assessment.overall_health.status,
        score: assessment.overall_health.score,
        total_claimed_hours: assessment.hours_audit.total_claimed_hours,
        available_hours: assessment.hours_audit.available_hours,
        realistic: assessment.hours_audit.realistic,
        recommendations: assessment.recommendations,
      },
    });

    // Fact 2: Hours audit details
    facts.push({
      fact_type: 'HOURS_AUDIT',
      student_id: studentId,
      metadata: {
        realistic: assessment.hours_audit.realistic,
        total_claimed_hours: assessment.hours_audit.total_claimed_hours,
        available_hours: assessment.hours_audit.available_hours,
        overclaimed_by: assessment.hours_audit.overclaimed_by,
        buffer: assessment.hours_audit.buffer,
        recommendation: assessment.hours_audit.recommendation,
        activity_breakdown: assessment.hours_audit.activity_breakdown,
      },
    });

    // Fact 3: Individual activity validations
    for (const validation of assessment.activity_validations) {
      facts.push({
        fact_type: 'ACTIVITY_TIME_VALIDATION',
        student_id: studentId,
        metadata: {
          activity_name: validation.activity_name,
          hours_per_week: validation.hours_per_week,
          weeks_per_year: validation.weeks_per_year,
          annual_hours: validation.annual_hours,
          valid: validation.valid,
          issues: validation.issues,
          recommendation: validation.recommendation,
        },
      });
    }

    return facts;
  }
}

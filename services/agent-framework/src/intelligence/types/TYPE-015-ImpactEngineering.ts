/**
 * TYPE-015: Impact Engineering
 *
 * **Purpose:** Escalate evidence ladder for extracurricular activities from creation (M0)
 * through external validation (M4). Transform vague claims into quantifiable, progressive evidence.
 *
 * **Core Frameworks:**
 * - Evidence Ladder: M0 (Built) → M1 (Used) → M2 (Measured Impact) → M3 (Dollars) → M4 (Media)
 * - Metric Hierarchy: Hours → Users → Beneficiaries → Dollars → Media
 * - Proof Before Pitch: Build evidence BEFORE claiming impact
 * - Quantify Vague Claims: "helped community" → "taught 400 students across 200 classrooms"
 *
 * **Data Dependencies:**
 * - W048: Formalization Ladder, Legitimacy Stack, Impact Scaling patterns
 * - W076: Statistical Bridge - Metric Hierarchy, outcome measurement frameworks
 * - EXEC chips: Outcome-Driven 15 Frameworks, Impact Scaling Hierarchy
 *
 * **Example Usage:**
 * Query: "How can I make my coding club more impressive?"
 * TYPE-015 Output: "Move from M1 (30 users) to M2 (measured outcomes): Implement pre/post survey, track learning gains"
 *
 * **Spec Reference:**
 * /docs/agents/EXTRACURRICULARS_AGENT_TECH_SPEC.md (Lines 157, 221-225, 264-268)
 *
 * @module Intelligence/Types
 * @intelligence-type TYPE-015
 */

import { BaseIntelligenceType } from '../BaseIntelligenceType';
import { Fact } from '../../a2a/types';

// ==================== INTERFACES ====================

/**
 * Evidence Ladder levels (M0-M4)
 */
export enum EvidenceLevel {
  M0 = 'M0', // Built: Project/activity exists
  M1 = 'M1', // Used: Real users adopted
  M2 = 'M2', // Measured Impact: Quantified outcomes
  M3 = 'M3', // Dollars: Financial validation (raised/earned/saved)
  M4 = 'M4', // Media: External validation (publications, news, awards)
}

/**
 * Activity with impact level diagnosis
 */
interface ImpactDiagnosis {
  activity_name: string;
  current_level: EvidenceLevel;
  current_level_evidence: string; // What evidence supports current level
  next_milestone: {
    level: EvidenceLevel;
    action: string;
    timeline: string;
    expected_outcome: string;
  } | null;
  metrics: {
    hours_total: number;
    users_reached: number;
    beneficiaries_with_outcomes: number;
    dollars_validated: number;
    media_mentions: number;
  };
  stagnation_risk: boolean; // True if stuck at same level for >3 months
  recommendation: string;
}

/**
 * Metric ladder tracking (M0-M4 metrics)
 */
interface MetricLadder {
  M0_hours: number; // Time invested
  M1_users: number; // People reached/served
  M2_beneficiaries: number; // People with measurable outcomes
  M3_dollars: number; // Money raised/earned/saved
  M4_media: number; // External validation count
  max_level_achieved: EvidenceLevel;
  next_target_level: EvidenceLevel | null;
}

/**
 * Impact claim validation
 */
interface ImpactClaimValidation {
  claim: string;
  valid: boolean;
  error?: string;
  required_evidence: string;
  has_evidence: boolean;
}

/**
 * Portfolio-level impact assessment
 */
interface PortfolioImpactAssessment {
  activities_by_level: {
    M0: ImpactDiagnosis[];
    M1: ImpactDiagnosis[];
    M2: ImpactDiagnosis[];
    M3: ImpactDiagnosis[];
    M4: ImpactDiagnosis[];
  };
  flagship_progress: {
    flagship_name: string;
    current_level: EvidenceLevel;
    target_level: EvidenceLevel;
    on_track: boolean;
  }[];
  portfolio_health: {
    stuck_at_M0: number; // Activities not progressing
    reached_M2_plus: number; // Activities with measurable impact
    reached_M4: number; // Activities with media validation
    overall_score: number; // 0-100, based on progression health
  };
  recommendations: string[];
}

// ==================== TYPE-015 IMPLEMENTATION ====================

export class ImpactEngineering extends BaseIntelligenceType {
  readonly typeId = 'TYPE-015';
  readonly name = 'Impact_Engineering';
  readonly category = 'extracurriculars';

  /**
   * Primary entry point: Assess impact level and provide escalation roadmap
   */
  async process(facts: Fact[]): Promise<Fact[]> {
    // Extract required facts
    const activities = facts.filter(f => f.fact_type === 'ACTIVITY');
    const profile = facts.find(f => f.fact_type === 'STUDENT_PROFILE');
    const classifications = facts.filter(f => f.fact_type === 'ACTIVITY_CLASSIFICATION');

    if (activities.length === 0) {
      return [{
        fact_type: 'IMPACT_ENGINEERING_ASSESSMENT',
        student_id: profile?.student_id || 'unknown',
        metadata: {
          status: 'insufficient_data',
          message: 'No activities found to assess. Need ACTIVITY facts.',
        },
      }];
    }

    // Perform portfolio-level impact assessment
    const assessment = this.assessPortfolioImpact(activities, classifications);

    // Convert to facts
    return this.convertAssessmentToFacts(assessment, profile?.student_id || 'unknown');
  }

  // ==================== PORTFOLIO IMPACT ASSESSMENT ====================

  /**
   * Assess impact across entire portfolio
   */
  private assessPortfolioImpact(
    activities: Fact[],
    classifications: Fact[]
  ): PortfolioImpactAssessment {
    // Diagnose each activity's impact level
    const diagnoses = activities.map(a => this.diagnoseActivityImpact(a));

    // Group by evidence level
    const activities_by_level = {
      M0: diagnoses.filter(d => d.current_level === EvidenceLevel.M0),
      M1: diagnoses.filter(d => d.current_level === EvidenceLevel.M1),
      M2: diagnoses.filter(d => d.current_level === EvidenceLevel.M2),
      M3: diagnoses.filter(d => d.current_level === EvidenceLevel.M3),
      M4: diagnoses.filter(d => d.current_level === EvidenceLevel.M4),
    };

    // Assess flagship activities (from classifications)
    const flagship_progress = this.assessFlagshipProgress(diagnoses, classifications);

    // Calculate portfolio health
    const portfolio_health = this.calculatePortfolioHealth(diagnoses);

    // Generate recommendations
    const recommendations = this.generateImpactRecommendations(
      activities_by_level,
      flagship_progress,
      portfolio_health
    );

    return {
      activities_by_level,
      flagship_progress,
      portfolio_health,
      recommendations,
    };
  }

  // ==================== ACTIVITY-LEVEL IMPACT DIAGNOSIS ====================

  /**
   * Diagnose single activity's impact level on Evidence Ladder
   */
  private diagnoseActivityImpact(activity: Fact): ImpactDiagnosis {
    const name = activity.metadata?.activity_name || 'Unknown Activity';
    const hours_total = (activity.metadata?.hours_per_week || 0) * (activity.metadata?.weeks_per_year || 0);
    const users_reached = activity.metadata?.users || 0;
    const beneficiaries_with_outcomes = activity.metadata?.beneficiaries || 0;
    const dollars_validated = (activity.metadata?.dollars_raised || 0) + (activity.metadata?.revenue || 0);
    const media_mentions = activity.metadata?.media_coverage?.length || 0;

    // Determine current evidence level
    let current_level: EvidenceLevel = EvidenceLevel.M0;
    let current_level_evidence = 'Activity exists (built)';

    if (media_mentions > 0) {
      current_level = EvidenceLevel.M4;
      current_level_evidence = `${media_mentions} media mention(s): External validation achieved`;
    } else if (dollars_validated >= 1000) {
      current_level = EvidenceLevel.M3;
      current_level_evidence = `$${dollars_validated.toLocaleString()} raised/earned: Financial validation`;
    } else if (beneficiaries_with_outcomes > 0) {
      current_level = EvidenceLevel.M2;
      current_level_evidence = `${beneficiaries_with_outcomes} beneficiaries with measured outcomes`;
    } else if (users_reached > 0) {
      current_level = EvidenceLevel.M1;
      current_level_evidence = `${users_reached} users reached: Real adoption proof`;
    }

    // Determine next milestone
    const next_milestone = this.determineNextMilestone(current_level, activity);

    // Check stagnation risk (simplified: if at M0 with >50 total hours, consider stagnant)
    const stagnation_risk = current_level === EvidenceLevel.M0 && hours_total > 50;

    // Generate recommendation
    const recommendation = this.generateActivityRecommendation(
      current_level,
      next_milestone,
      stagnation_risk
    );

    return {
      activity_name: name,
      current_level,
      current_level_evidence,
      next_milestone,
      metrics: {
        hours_total,
        users_reached,
        beneficiaries_with_outcomes,
        dollars_validated,
        media_mentions,
      },
      stagnation_risk,
      recommendation,
    };
  }

  /**
   * Determine next milestone on Evidence Ladder
   */
  private determineNextMilestone(
    current: EvidenceLevel,
    activity: Fact
  ): ImpactDiagnosis['next_milestone'] {
    switch (current) {
      case EvidenceLevel.M0:
        return {
          level: EvidenceLevel.M1,
          action: 'Get to M1: Ship to real users immediately',
          timeline: '1-2 weeks',
          expected_outcome: 'Stop perfecting in isolation. Launch to 10+ users to prove adoption.',
        };

      case EvidenceLevel.M1:
        return {
          level: EvidenceLevel.M2,
          action: 'Get to M2: Measure outcomes with data',
          timeline: '4-6 weeks',
          expected_outcome: 'Implement pre/post survey or assessment to quantify learning/impact. Aim for measurable change in beneficiaries.',
        };

      case EvidenceLevel.M2:
        return {
          level: EvidenceLevel.M3,
          action: 'Get to M3: Pursue funding/revenue',
          timeline: '8-12 weeks',
          expected_outcome: 'Apply for grants ($2K-$10K), secure sponsorships, or develop revenue model. Financial validation proves value.',
        };

      case EvidenceLevel.M3:
        return {
          level: EvidenceLevel.M4,
          action: 'Get to M4: Secure media coverage',
          timeline: '12+ weeks',
          expected_outcome: 'Pitch story to local news, write guest blog post, win award, or get published. External validation amplifies credibility.',
        };

      case EvidenceLevel.M4:
        return null; // Maximized - no further milestone
    }
  }

  /**
   * Generate activity-level recommendation
   */
  private generateActivityRecommendation(
    current: EvidenceLevel,
    next: ImpactDiagnosis['next_milestone'],
    stagnant: boolean
  ): string {
    if (current === EvidenceLevel.M4) {
      return '✅ MAXIMIZED: Activity reached M4 (media coverage). Continue maintaining and scaling.';
    }

    if (stagnant) {
      return `⚠️ STAGNATION RISK: Stuck at ${current} for too long. ${next?.action || 'Move to next level immediately'}`;
    }

    return `📈 NEXT STEP: ${next?.action || 'Continue progressing'}. Timeline: ${next?.timeline || 'TBD'}`;
  }

  // ==================== FLAGSHIP PROGRESS TRACKING ====================

  /**
   * Assess progress of flagship activities specifically
   */
  private assessFlagshipProgress(
    diagnoses: ImpactDiagnosis[],
    classifications: Fact[]
  ): PortfolioImpactAssessment['flagship_progress'] {
    const flagship_progress: PortfolioImpactAssessment['flagship_progress'] = [];

    // Find flagship activities from classifications
    const flagships = classifications.filter(c => c.metadata?.portfolio_role === 'flagship');

    for (const flagship of flagships) {
      const name = flagship.metadata?.activity_name || '';
      const diagnosis = diagnoses.find(d => d.activity_name === name);

      if (!diagnosis) continue;

      // Target: Flagship activities should reach M2-M3 by senior year
      const target_level = EvidenceLevel.M3;
      const on_track = diagnosis.current_level >= EvidenceLevel.M2;

      flagship_progress.push({
        flagship_name: name,
        current_level: diagnosis.current_level,
        target_level,
        on_track,
      });
    }

    return flagship_progress;
  }

  // ==================== PORTFOLIO HEALTH ====================

  /**
   * Calculate overall portfolio impact health (0-100 score)
   */
  private calculatePortfolioHealth(diagnoses: ImpactDiagnosis[]): PortfolioImpactAssessment['portfolio_health'] {
    const stuck_at_M0 = diagnoses.filter(d => d.stagnation_risk).length;
    const reached_M2_plus = diagnoses.filter(d => d.current_level >= EvidenceLevel.M2).length;
    const reached_M4 = diagnoses.filter(d => d.current_level === EvidenceLevel.M4).length;

    // Scoring formula
    let overall_score = 50; // Baseline

    // Penalties
    overall_score -= stuck_at_M0 * 10; // -10 per stagnant activity

    // Bonuses
    overall_score += reached_M2_plus * 15; // +15 per M2+ activity
    overall_score += reached_M4 * 25; // +25 per M4 activity

    // Clamp to 0-100
    overall_score = Math.max(0, Math.min(100, overall_score));

    return {
      stuck_at_M0,
      reached_M2_plus,
      reached_M4,
      overall_score,
    };
  }

  // ==================== RECOMMENDATIONS ====================

  /**
   * Generate portfolio-level impact engineering recommendations
   */
  private generateImpactRecommendations(
    activities_by_level: PortfolioImpactAssessment['activities_by_level'],
    flagship_progress: PortfolioImpactAssessment['flagship_progress'],
    portfolio_health: PortfolioImpactAssessment['portfolio_health']
  ): string[] {
    const recommendations: string[] = [];

    // Rec 1: Overall health assessment
    if (portfolio_health.overall_score >= 75) {
      recommendations.push(
        `✅ STRONG IMPACT PORTFOLIO (${portfolio_health.overall_score}/100): ${portfolio_health.reached_M2_plus} activities with measurable impact, ${portfolio_health.reached_M4} with media validation.`
      );
    } else if (portfolio_health.overall_score >= 50) {
      recommendations.push(
        `📊 MODERATE IMPACT PORTFOLIO (${portfolio_health.overall_score}/100): Need to escalate more activities to M2+. Focus on measuring outcomes.`
      );
    } else {
      recommendations.push(
        `⚠️ LOW IMPACT PORTFOLIO (${portfolio_health.overall_score}/100): Most activities stuck at M0-M1. URGENT: Move to measurable impact (M2).`
      );
    }

    // Rec 2: Stagnation warnings
    if (portfolio_health.stuck_at_M0 > 0) {
      const stagnant_activities = [
        ...activities_by_level.M0.filter(d => d.stagnation_risk).map(d => d.activity_name)
      ].slice(0, 3);

      recommendations.push(
        `⚠️ STAGNATION ALERT: ${portfolio_health.stuck_at_M0} activities stuck at M0 (built but not used). Stagnant activities: ${stagnant_activities.join(', ')}. Action: Ship to real users immediately.`
      );
    }

    // Rec 3: Flagship tracking
    const flagships_off_track = flagship_progress.filter(f => !f.on_track);
    if (flagships_off_track.length > 0) {
      recommendations.push(
        `🎯 FLAGSHIP ALERT: ${flagships_off_track.length} flagship activities below M2 target. Flagships: ${flagships_off_track.map(f => `${f.flagship_name} (${f.current_level})`).join(', ')}. Must reach M2-M3 by senior year.`
      );
    }

    // Rec 4: M4 opportunities
    if (portfolio_health.reached_M4 === 0 && activities_by_level.M3.length > 0) {
      const m3_candidates = activities_by_level.M3.slice(0, 2).map(d => d.activity_name);
      recommendations.push(
        `📰 MEDIA OPPORTUNITY: ${m3_candidates.length} activities at M3 (financial validation). Next: Secure media coverage for: ${m3_candidates.join(', ')}. Pitch local news or win external award.`
      );
    }

    // Rec 5: M2 priority (if many at M1)
    if (activities_by_level.M1.length >= 3 && portfolio_health.reached_M2_plus < 2) {
      recommendations.push(
        `📊 M2 PRIORITY: ${activities_by_level.M1.length} activities have users (M1) but no measured impact (M2). Action: Implement surveys/assessments to quantify outcomes for top 2 activities.`
      );
    }

    // Rec 6: Proof Before Pitch reminder
    if (activities_by_level.M0.length > 2) {
      recommendations.push(
        `⚠️ PROOF BEFORE PITCH: ${activities_by_level.M0.length} activities still at M0 (built only). Don't perfect in isolation—ship to users NOW. Get to M1 within 1-2 weeks.`
      );
    }

    return recommendations;
  }

  // ==================== IMPACT CLAIM VALIDATION ====================

  /**
   * Validate impact claims against Proof Before Pitch guardrail
   */
  private validateImpactClaim(activity: Fact, claim: string): ImpactClaimValidation {
    const claimLower = claim.toLowerCase();

    // Check for M2 claims (impact/outcomes)
    if (claimLower.includes('impact') || claimLower.includes('outcomes') || claimLower.includes('helped')) {
      const beneficiaries = activity.metadata?.beneficiaries || 0;
      const has_evidence = beneficiaries > 0;

      if (!has_evidence) {
        return {
          claim,
          valid: false,
          error: 'Cannot claim impact without M2 data',
          required_evidence: 'Survey results, assessment data, or outcome metrics showing measurable change in beneficiaries',
          has_evidence: false,
        };
      }
    }

    // Check for M3 claims (funding/raised/earned)
    if (claimLower.includes('raised') || claimLower.includes('funding') || claimLower.includes('earned') || claimLower.includes('revenue')) {
      const dollars = (activity.metadata?.dollars_raised || 0) + (activity.metadata?.revenue || 0);
      const has_evidence = dollars >= 1000;

      if (!has_evidence) {
        return {
          claim,
          valid: false,
          error: 'Cannot claim funding without M3 proof',
          required_evidence: 'Documented funding sources (receipts, nonprofit filings, bank statements showing $1K+)',
          has_evidence: false,
        };
      }
    }

    // Check for M4 claims (media/featured/published)
    if (claimLower.includes('media') || claimLower.includes('featured') || claimLower.includes('published') || claimLower.includes('coverage')) {
      const media = activity.metadata?.media_coverage?.length || 0;
      const has_evidence = media > 0;

      if (!has_evidence) {
        return {
          claim,
          valid: false,
          error: 'Cannot claim media coverage without M4 proof',
          required_evidence: 'Publication links, news article screenshots, or award certificates',
          has_evidence: false,
        };
      }
    }

    // Claim is valid
    return {
      claim,
      valid: true,
      required_evidence: 'N/A - Claim validated',
      has_evidence: true,
    };
  }

  // ==================== QUANTIFY VAGUE CLAIMS ====================

  /**
   * Transform vague claims into quantifiable specifics
   */
  private quantifyVagueClaim(vague_claim: string, activity: Fact): string {
    const users = activity.metadata?.users || 0;
    const beneficiaries = activity.metadata?.beneficiaries || 0;
    const dollars = (activity.metadata?.dollars_raised || 0) + (activity.metadata?.revenue || 0);
    const media = activity.metadata?.media_coverage?.length || 0;

    const claimLower = vague_claim.toLowerCase();

    // "Helped community" → Quantified version
    if (claimLower.includes('helped') || claimLower.includes('community')) {
      if (beneficiaries > 0) {
        return `Taught ${users} students across ${Math.floor(users / 2)} classrooms, with ${beneficiaries} beneficiaries reporting measurable outcomes`;
      }
      if (users > 0) {
        return `Reached ${users} community members through program`;
      }
      return 'Built community program (M0: Need user data to quantify impact)';
    }

    // "Made a difference" → Quantified version
    if (claimLower.includes('difference') || claimLower.includes('impact')) {
      if (beneficiaries > 0) {
        return `${beneficiaries} beneficiaries gained measurable outcomes (M2 evidence)`;
      }
      return 'Need M2 data: Implement survey to measure outcomes';
    }

    // "Impactful project" → Quantified version
    if (claimLower.includes('impactful') || claimLower.includes('successful')) {
      if (media > 0 && dollars >= 1000) {
        return `Achieved M4 validation (${media} media mentions) and M3 financial proof ($${dollars.toLocaleString()} raised)`;
      }
      if (dollars >= 1000) {
        return `Secured $${dollars.toLocaleString()} in funding (M3 financial validation)`;
      }
      if (beneficiaries > 0) {
        return `${beneficiaries} beneficiaries with measured outcomes (M2 impact)`;
      }
      if (users > 0) {
        return `${users} users reached (M1 adoption proof)`;
      }
      return 'Project launched (M0: Need user/impact data)';
    }

    // Default: Return with guidance
    return `"${vague_claim}" → Need specific metrics. Current: ${users} users (M1), ${beneficiaries} beneficiaries (M2), $${dollars} (M3), ${media} media (M4)`;
  }

  // ==================== FACT CONVERSION ====================

  /**
   * Convert impact assessment to structured facts
   */
  private convertAssessmentToFacts(
    assessment: PortfolioImpactAssessment,
    studentId: string
  ): Fact[] {
    const facts: Fact[] = [];

    // Fact 1: Overall portfolio impact health
    facts.push({
      fact_type: 'IMPACT_PORTFOLIO_HEALTH',
      student_id: studentId,
      metadata: {
        overall_score: assessment.portfolio_health.overall_score,
        stuck_at_M0: assessment.portfolio_health.stuck_at_M0,
        reached_M2_plus: assessment.portfolio_health.reached_M2_plus,
        reached_M4: assessment.portfolio_health.reached_M4,
        recommendations: assessment.recommendations,
      },
    });

    // Fact 2: Activity-level diagnoses (grouped by evidence level)
    for (const level of Object.keys(assessment.activities_by_level) as EvidenceLevel[]) {
      const activities = assessment.activities_by_level[level];
      if (activities.length > 0) {
        facts.push({
          fact_type: `IMPACT_LEVEL_${level}`,
          student_id: studentId,
          metadata: {
            count: activities.length,
            activities: activities.map(a => ({
              name: a.activity_name,
              evidence: a.current_level_evidence,
              next_milestone: a.next_milestone,
              metrics: a.metrics,
              recommendation: a.recommendation,
            })),
          },
        });
      }
    }

    // Fact 3: Flagship progress tracking
    if (assessment.flagship_progress.length > 0) {
      facts.push({
        fact_type: 'FLAGSHIP_IMPACT_PROGRESS',
        student_id: studentId,
        metadata: {
          flagships: assessment.flagship_progress,
          off_track_count: assessment.flagship_progress.filter(f => !f.on_track).length,
        },
      });
    }

    // Fact 4: Individual activity impact diagnoses
    for (const level of Object.keys(assessment.activities_by_level) as EvidenceLevel[]) {
      for (const diagnosis of assessment.activities_by_level[level]) {
        facts.push({
          fact_type: 'ACTIVITY_IMPACT_DIAGNOSIS',
          student_id: studentId,
          metadata: {
            activity_name: diagnosis.activity_name,
            current_level: diagnosis.current_level,
            evidence: diagnosis.current_level_evidence,
            next_milestone: diagnosis.next_milestone,
            metrics: diagnosis.metrics,
            stagnation_risk: diagnosis.stagnation_risk,
            recommendation: diagnosis.recommendation,
          },
        });
      }
    }

    return facts;
  }

  // ==================== METRIC LADDER TRACKING ====================

  /**
   * Track metric ladder (M0-M4 metrics) for activity
   */
  private trackMetricLadder(activity: Fact): MetricLadder {
    const hours = (activity.metadata?.hours_per_week || 0) * (activity.metadata?.weeks_per_year || 0);
    const users = activity.metadata?.users || 0;
    const beneficiaries = activity.metadata?.beneficiaries || 0;
    const dollars = (activity.metadata?.dollars_raised || 0) + (activity.metadata?.revenue || 0);
    const media = activity.metadata?.media_coverage?.length || 0;

    // Determine max level achieved
    let max_level: EvidenceLevel = EvidenceLevel.M0;
    if (media > 0) max_level = EvidenceLevel.M4;
    else if (dollars >= 1000) max_level = EvidenceLevel.M3;
    else if (beneficiaries > 0) max_level = EvidenceLevel.M2;
    else if (users > 0) max_level = EvidenceLevel.M1;

    // Determine next target
    let next_target: EvidenceLevel | null = null;
    if (max_level === EvidenceLevel.M0) next_target = EvidenceLevel.M1;
    else if (max_level === EvidenceLevel.M1) next_target = EvidenceLevel.M2;
    else if (max_level === EvidenceLevel.M2) next_target = EvidenceLevel.M3;
    else if (max_level === EvidenceLevel.M3) next_target = EvidenceLevel.M4;

    return {
      M0_hours: hours,
      M1_users: users,
      M2_beneficiaries: beneficiaries,
      M3_dollars: dollars,
      M4_media: media,
      max_level_achieved: max_level,
      next_target_level: next_target,
    };
  }
}

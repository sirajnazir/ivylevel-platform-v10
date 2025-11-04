/**
 * TYPE-026: 70/20/10 Portfolio Rule
 * Category: DOMAIN_SPECIFIC (AwardsAgent)
 *
 * Purpose: Risk-balanced award portfolio prevents demoralization while
 * building legitimate credentials. Balances confidence-building (early wins)
 * with credential-building (national/state recognition).
 *
 * Framework: Risk-Balanced Portfolio
 *
 * 70% HIGH-PROBABILITY (40-70% win rate): Confidence builders, early momentum
 * 20% MEDIUM-REACH (10-30% win rate): Legitimate T1/T2 credentials
 * 10% LONG-SHOT (0-5% win rate): Transformative upside plays
 *
 * Expected Outcome: 10 applications → 4-5 wins across T1-T3 tiers
 * (7×0.55) + (2×0.20) + (1×0.025) = 3.85 + 0.40 + 0.025 = 4.3 wins
 *
 * Critical Rule: Students with <3 high-probability wins by month 3 enter crisis mode.
 * Long-shot applications only appropriate if student has ≥2 wins already.
 *
 * Source: W001 portfolio analysis (weeks 1-93), win rate calibration
 *
 * Created: 2025-11-04
 * Version: v29.6
 */

import {
  IntelligenceType,
  IntelligenceResult,
  AgentQuery,
  FactSet,
  FactCategory,
} from './BaseIntelligenceType.js';

/**
 * Risk bucket
 */
type RiskBucket = 'high_probability' | 'medium_reach' | 'long_shot';

/**
 * Portfolio allocation
 */
interface PortfolioAllocation {
  bucket: RiskBucket;
  target_percentage: number; // 70, 20, or 10
  target_applications: number;
  target_hours: number;
  win_rate_range: string; // "40-70%"
  award_tiers: string[]; // ["T2", "T3"]
  purpose: string;
}

/**
 * Award recommendation with risk classification
 */
interface RiskClassifiedAward {
  award_name: string;
  risk_bucket: RiskBucket;
  estimated_win_rate: number; // 0.0-1.0
  award_tier: 'T1' | 'T2' | 'T3' | 'T4';
  estimated_hours: number;
  deadline: string;
  rationale: string;
}

/**
 * Portfolio compliance result
 */
interface PortfolioComplianceResult {
  allocations: PortfolioAllocation[];
  recommended_awards: RiskClassifiedAward[];
  current_distribution: {
    high_probability_pct: number;
    medium_reach_pct: number;
    long_shot_pct: number;
  };
  compliance_status: 'compliant' | 'needs_adjustment' | 'crisis_mode';
  adjustments_needed: string[];
  expected_wins: number; // Calculated from portfolio
  win_targets: {
    high_probability_wins: number;
    medium_reach_wins: number;
    long_shot_wins: number;
    total_wins: number;
  };
  recommendations: string[];
}

export class SeventyTwentyTenRule implements IntelligenceType {
  type_id = 'TYPE-026';
  name = '70/20/10 Portfolio Rule';
  category = 'DOMAIN_SPECIFIC' as const;
  agent_id = 'AwardsAgent';
  version = 'v29.6';

  /**
   * Standard portfolio allocation (70/20/10)
   */
  private readonly STANDARD_ALLOCATION = {
    high_probability: 70,
    medium_reach: 20,
    long_shot: 10,
  };

  /**
   * Win rate ranges by bucket
   */
  private readonly WIN_RATE_RANGES: Record<RiskBucket, [number, number]> = {
    high_probability: [0.4, 0.7],
    medium_reach: [0.1, 0.3],
    long_shot: [0.0, 0.05],
  };

  /**
   * Process 70/20/10 portfolio rule
   */
  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {
    const studentId = query.entity_id;

    // Extract relevant facts
    const profileFacts = facts.getFactsByCategory(FactCategory.STUDENT_PROFILE);
    const awardsWonFacts = facts.get(FactCategory.AWARDS_WON) || [];
    const availableHoursFacts = facts.get(FactCategory.AVAILABLE_HOURS_WEEKLY) || [];

    // Determine available capacity (hours per quarter)
    const availableHours = this.calculateAvailableHours(availableHoursFacts);

    // Check student motivation state (crisis mode if <2 wins by month 3)
    const winsCount = awardsWonFacts.length;
    const motivationState = this.assessMotivationState(winsCount, profileFacts);

    // Adjust allocation based on capacity and motivation
    const adjustedAllocation = this.adjustAllocation(availableHours, motivationState);

    // Generate portfolio allocations
    const allocations = this.generateAllocations(adjustedAllocation, availableHours);

    // Generate award recommendations by risk bucket
    const recommendedAwards = this.generateAwardRecommendations(allocations, profileFacts);

    // Calculate current distribution (if awards already in pipeline)
    const currentDistribution = this.calculateCurrentDistribution(recommendedAwards);

    // Assess compliance
    const complianceStatus = this.assessCompliance(currentDistribution, adjustedAllocation);

    // Calculate expected wins
    const expectedWins = this.calculateExpectedWins(recommendedAwards);
    const winTargets = this.calculateWinTargets(allocations);

    // Generate adjustments needed
    const adjustmentsNeeded = this.generateAdjustments(
      currentDistribution,
      adjustedAllocation,
      motivationState
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      allocations,
      expectedWins,
      winTargets,
      motivationState
    );

    const result: PortfolioComplianceResult = {
      allocations: allocations,
      recommended_awards: recommendedAwards,
      current_distribution: currentDistribution,
      compliance_status: complianceStatus,
      adjustments_needed: adjustmentsNeeded,
      expected_wins: expectedWins,
      win_targets: winTargets,
      recommendations: recommendations,
    };

    return {
      type_id: this.type_id,
      component: 'portfolio_rule',
      triggered: true,
      confidence: 0.90,
      data: result,
    };
  }

  /**
   * Calculate available hours for award applications
   */
  private calculateAvailableHours(availableHoursFacts: any[]): number {
    // For v29.6, return reasonable default (30 hours per quarter)
    // TODO: Extract from fact store
    return 30;
  }

  /**
   * Assess student motivation state
   */
  private assessMotivationState(winsCount: number, profileFacts: any[]): 'normal' | 'crisis' | 'high_achiever' {
    // Crisis mode: <2 wins by month 3
    if (winsCount < 2) return 'crisis';

    // High achiever: 5+ wins already
    if (winsCount >= 5) return 'high_achiever';

    return 'normal';
  }

  /**
   * Adjust allocation based on capacity and motivation
   */
  private adjustAllocation(
    availableHours: number,
    motivationState: string
  ): { high_probability: number; medium_reach: number; long_shot: number } {
    // Crisis mode: 100/0/0 (confidence only)
    if (motivationState === 'crisis') {
      return { high_probability: 100, medium_reach: 0, long_shot: 0 };
    }

    // Limited time (<15 hours): 85/15/0
    if (availableHours < 15) {
      return { high_probability: 85, medium_reach: 15, long_shot: 0 };
    }

    // High achiever (abundant time): 70/15/15
    if (motivationState === 'high_achiever' && availableHours > 40) {
      return { high_probability: 70, medium_reach: 15, long_shot: 15 };
    }

    // Standard: 70/20/10
    return this.STANDARD_ALLOCATION;
  }

  /**
   * Generate allocations by bucket
   */
  private generateAllocations(
    allocation: { high_probability: number; medium_reach: number; long_shot: number },
    totalHours: number
  ): PortfolioAllocation[] {
    const allocations: PortfolioAllocation[] = [];

    // High-Probability bucket
    const highProbHours = (totalHours * allocation.high_probability) / 100;
    allocations.push({
      bucket: 'high_probability',
      target_percentage: allocation.high_probability,
      target_applications: Math.floor(highProbHours / 7), // ~7 hours per application
      target_hours: highProbHours,
      win_rate_range: '40-70%',
      award_tiers: ['T2', 'T3'],
      purpose: 'Build early momentum, establish track record',
    });

    // Medium-Reach bucket
    const mediumReachHours = (totalHours * allocation.medium_reach) / 100;
    allocations.push({
      bucket: 'medium_reach',
      target_percentage: allocation.medium_reach,
      target_applications: Math.floor(mediumReachHours / 6), // ~6 hours per application
      target_hours: mediumReachHours,
      win_rate_range: '10-30%',
      award_tiers: ['T1', 'T2'],
      purpose: 'Build legitimate national/state credentials',
    });

    // Long-Shot bucket
    const longShotHours = (totalHours * allocation.long_shot) / 100;
    allocations.push({
      bucket: 'long_shot',
      target_percentage: allocation.long_shot,
      target_applications: Math.floor(longShotHours / 3), // ~3 hours per application
      target_hours: longShotHours,
      win_rate_range: '0-5%',
      award_tiers: ['T1'],
      purpose: 'Pursue transformative outcomes (if you win, game changes)',
    });

    return allocations;
  }

  /**
   * Generate award recommendations by risk bucket
   */
  private generateAwardRecommendations(
    allocations: PortfolioAllocation[],
    profileFacts: any[]
  ): RiskClassifiedAward[] {
    const recommendations: RiskClassifiedAward[] = [];

    // For v29.6, return mock recommendations to establish architecture
    // TODO: Query kb_items for actual award opportunities

    // High-Probability awards
    const highProbAllocation = allocations.find((a) => a.bucket === 'high_probability');
    if (highProbAllocation && highProbAllocation.target_applications > 0) {
      recommendations.push({
        award_name: 'Congressional App Challenge',
        risk_bucket: 'high_probability',
        estimated_win_rate: 0.5,
        award_tier: 'T2',
        estimated_hours: 5,
        deadline: '2025-11-01',
        rationale: 'District-level competition, strong CS profile fit, manageable time investment',
      });

      recommendations.push({
        award_name: 'Games for Change Student Challenge',
        risk_bucket: 'high_probability',
        estimated_win_rate: 0.4,
        award_tier: 'T2',
        estimated_hours: 6,
        deadline: '2025-03-15',
        rationale: 'Aligned with digital storytelling focus, moderate competition',
      });

      recommendations.push({
        award_name: 'Local Tech Innovation Award',
        risk_bucket: 'high_probability',
        estimated_win_rate: 0.6,
        award_tier: 'T3',
        estimated_hours: 4,
        deadline: '2025-02-01',
        rationale: 'Local competition, strong alignment, high win probability',
      });
    }

    // Medium-Reach awards
    const mediumReachAllocation = allocations.find((a) => a.bucket === 'medium_reach');
    if (mediumReachAllocation && mediumReachAllocation.target_applications > 0) {
      recommendations.push({
        award_name: 'NCWIT Aspirations in Computing',
        risk_bucket: 'medium_reach',
        estimated_win_rate: 0.14,
        award_tier: 'T1',
        estimated_hours: 6,
        deadline: '2025-02-15',
        rationale: 'National T1 award, female CS focus, strong narrative alignment',
      });
    }

    // Long-Shot awards
    const longShotAllocation = allocations.find((a) => a.bucket === 'long_shot');
    if (longShotAllocation && longShotAllocation.target_applications > 0) {
      recommendations.push({
        award_name: 'YoungArts Film',
        risk_bucket: 'long_shot',
        estimated_win_rate: 0.03,
        award_tier: 'T1',
        estimated_hours: 3,
        deadline: '2025-10-15',
        rationale: 'Elite national award, transformative if achieved, low time investment',
      });
    }

    return recommendations;
  }

  /**
   * Calculate current distribution
   */
  private calculateCurrentDistribution(
    awards: RiskClassifiedAward[]
  ): { high_probability_pct: number; medium_reach_pct: number; long_shot_pct: number } {
    const total = awards.length;
    if (total === 0) return { high_probability_pct: 0, medium_reach_pct: 0, long_shot_pct: 0 };

    const highProbCount = awards.filter((a) => a.risk_bucket === 'high_probability').length;
    const mediumCount = awards.filter((a) => a.risk_bucket === 'medium_reach').length;
    const longShotCount = awards.filter((a) => a.risk_bucket === 'long_shot').length;

    return {
      high_probability_pct: Math.round((highProbCount / total) * 100),
      medium_reach_pct: Math.round((mediumCount / total) * 100),
      long_shot_pct: Math.round((longShotCount / total) * 100),
    };
  }

  /**
   * Assess compliance with 70/20/10 rule
   */
  private assessCompliance(
    current: { high_probability_pct: number; medium_reach_pct: number; long_shot_pct: number },
    target: { high_probability: number; medium_reach: number; long_shot: number }
  ): 'compliant' | 'needs_adjustment' | 'crisis_mode' {
    const tolerance = 10; // ±10%

    const highProbCompliant = Math.abs(current.high_probability_pct - target.high_probability) <= tolerance;
    const mediumCompliant = Math.abs(current.medium_reach_pct - target.medium_reach) <= tolerance;
    const longShotCompliant = Math.abs(current.long_shot_pct - target.long_shot) <= tolerance;

    if (target.high_probability === 100) return 'crisis_mode';
    if (highProbCompliant && mediumCompliant && longShotCompliant) return 'compliant';
    return 'needs_adjustment';
  }

  /**
   * Calculate expected wins from portfolio
   */
  private calculateExpectedWins(awards: RiskClassifiedAward[]): number {
    return awards.reduce((sum, award) => sum + award.estimated_win_rate, 0);
  }

  /**
   * Calculate win targets by bucket
   */
  private calculateWinTargets(allocations: PortfolioAllocation[]): {
    high_probability_wins: number;
    medium_reach_wins: number;
    long_shot_wins: number;
    total_wins: number;
  } {
    const highProb = allocations.find((a) => a.bucket === 'high_probability');
    const mediumReach = allocations.find((a) => a.bucket === 'medium_reach');
    const longShot = allocations.find((a) => a.bucket === 'long_shot');

    const highProbWins = highProb ? highProb.target_applications * 0.55 : 0;
    const mediumReachWins = mediumReach ? mediumReach.target_applications * 0.2 : 0;
    const longShotWins = longShot ? longShot.target_applications * 0.025 : 0;

    return {
      high_probability_wins: Math.round(highProbWins * 10) / 10,
      medium_reach_wins: Math.round(mediumReachWins * 10) / 10,
      long_shot_wins: Math.round(longShotWins * 10) / 10,
      total_wins: Math.round((highProbWins + mediumReachWins + longShotWins) * 10) / 10,
    };
  }

  /**
   * Generate adjustments needed
   */
  private generateAdjustments(
    current: any,
    target: any,
    motivationState: string
  ): string[] {
    const adjustments: string[] = [];

    if (motivationState === 'crisis') {
      adjustments.push('🚨 CRISIS MODE: Focus 100% on high-probability awards (rebuild confidence)');
      adjustments.push('   → Skip medium-reach and long-shot until 2+ wins achieved');
    }

    const highProbGap = target.high_probability - current.high_probability_pct;
    if (highProbGap > 10) {
      adjustments.push(`⚠️ Need ${Math.round(highProbGap)}% more high-probability awards`);
    }

    return adjustments;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    allocations: PortfolioAllocation[],
    expectedWins: number,
    winTargets: any,
    motivationState: string
  ): string[] {
    const recommendations: string[] = [];

    recommendations.push(
      `📊 Portfolio Strategy: ${allocations[0].target_percentage}/${allocations[1].target_percentage}/${allocations[2].target_percentage} (High-Prob/Medium/Long-Shot)`
    );

    recommendations.push(
      `🎯 Expected Wins: ${Math.round(expectedWins * 10) / 10} total (${winTargets.high_probability_wins} high-prob + ${winTargets.medium_reach_wins} medium + ${winTargets.long_shot_wins} long-shot)`
    );

    if (motivationState === 'crisis') {
      recommendations.push('\n💡 Crisis Protocol: 100% focus on confidence-building wins');
      recommendations.push('   → Target: 2-3 high-probability wins in next 4-8 weeks');
      recommendations.push('   → Resume 70/20/10 after confidence restored');
    } else {
      recommendations.push('\n💡 70/20/10 Rule balances confidence-building with credential-building');
      recommendations.push('   → Early wins (high-prob) sustain motivation');
      recommendations.push('   → T1/T2 credentials (medium-reach) transform Ivy odds');
      recommendations.push('   → Long-shots (10%) provide upside without risking morale');
    }

    return recommendations;
  }
}

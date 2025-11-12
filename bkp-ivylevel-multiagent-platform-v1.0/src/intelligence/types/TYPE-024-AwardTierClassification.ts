/**
 * TYPE-024: Award Tier Classification (T1-T4)
 * Category: DOMAIN_SPECIFIC (AwardsAgent)
 *
 * Purpose: Objective classification system for award quality/prestige.
 * Transforms subjective perception ("I won an important award!") into
 * objective Ivy AO-calibrated tier system.
 *
 * Framework: 4-Tier Hierarchy (T1-T4)
 *
 * T1 (National/International): <500 winners nationally, Ivy Impact +15-40%
 * T2 (State/Regional): 500-2K winners regionally, Ivy Impact +5-15%
 * T3 (Local/School): 2K-10K winners, Expected baseline
 * T4 (Participation): No selection or >50% recipients, No impact
 *
 * Critical Insight: Volume of T3/T4 awards doesn't compensate for lack of T1/T2
 * 10 school honor rolls < 1 NCWIT national winner in Ivy AO perception
 *
 * Source: W001 coaching (Ivy AO calibration), award database analysis
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
 * Award tier
 */
type AwardTier = 'T1' | 'T2' | 'T3' | 'T4';

/**
 * Award tier details
 */
interface AwardTierInfo {
  selectivity: string; // "<500 winners nationally"
  acceptance_rate: string; // "<5%"
  ivy_impact: string; // "HIGH (+15-40% acceptance boost)"
  time_investment: string; // "20-60 hours application"
  examples: string[];
}

/**
 * Classified award
 */
interface ClassifiedAward {
  award_name: string;
  award_id: string;
  tier: AwardTier;
  tier_confidence: number; // 0.0-1.0
  selectivity_score: number; // 0-10 (higher = more selective)
  scope: 'school' | 'local' | 'regional' | 'state' | 'national' | 'international';
  estimated_winners: number;
  estimated_applicants: number;
  ivy_impact_boost: number; // Estimated % increase in Ivy acceptance odds
  recommendations: string[];
}

/**
 * Portfolio analysis result
 */
interface PortfolioTierAnalysis {
  classified_awards: ClassifiedAward[];
  tier_distribution: {
    T1: number;
    T2: number;
    T3: number;
    T4: number;
  };
  portfolio_strength: 'ivy_competitive' | 'ivy_possible' | 'ivy_unlikely' | 'weak';
  gap_analysis: string[];
  target_state: {
    T1_target: number;
    T2_target: number;
    T3_target: number;
    T4_target: number;
  };
  strategic_recommendations: string[];
}

export class AwardTierClassification implements IntelligenceType {
  type_id = 'TYPE-024';
  name = 'Award Tier Classification';
  category = 'DOMAIN_SPECIFIC' as const;
  agent_id = 'AwardsAgent';
  version = 'v29.6';

  /**
   * Tier classification criteria
   */
  private readonly TIER_CRITERIA: Record<AwardTier, AwardTierInfo> = {
    T1: {
      selectivity: '<500 winners nationally',
      acceptance_rate: '<5%',
      ivy_impact: 'HIGH (+15-40% acceptance boost)',
      time_investment: '20-60 hours application, 6-24 months underlying work',
      examples: [
        'NCWIT Winner',
        'Regeneron STS Finalist',
        'YoungArts Winner',
        'Presidential Scholar',
        'Davidson Fellow',
        'Intel ISEF Grand Award',
        'USA Olympiad Winner (USAMO, USABO, etc.)',
      ],
    },
    T2: {
      selectivity: '500-2,000 winners regionally',
      acceptance_rate: '1-10%',
      ivy_impact: 'MEDIUM (+5-15% acceptance boost)',
      time_investment: '10-30 hours per application',
      examples: [
        'NCWIT State Winner',
        'Congressional App District Winner',
        'State Science Fair Winner',
        'National Merit Finalist',
        'AIME Qualifier',
        'Scholastic Art & Writing Gold Key',
        'FIRST Robotics Regional Winner',
      ],
    },
    T3: {
      selectivity: '2,000-10,000 winners',
      acceptance_rate: '10-30%',
      ivy_impact: 'LOW (expected baseline)',
      time_investment: '2-10 hours per award',
      examples: [
        'School Honor Society',
        'Local Essay Contest Winner',
        'Community Service Award',
        'School Departmental Award',
        'Scholastic Art & Writing Honorable Mention',
        'Regional Math Competition Top 10',
      ],
    },
    T4: {
      selectivity: 'No selection or >50% recipients',
      acceptance_rate: '>50%',
      ivy_impact: 'NONE (table stakes)',
      time_investment: '0-2 hours',
      examples: [
        'AP Scholar',
        'Honor Roll',
        'Perfect Attendance',
        'Club Membership Certificate',
        'Participation Award',
        'NHS Member',
      ],
    },
  };

  /**
   * Portfolio strength thresholds
   */
  private readonly PORTFOLIO_THRESHOLDS = {
    ivy_competitive: { T1: 1, T2: 3 }, // 1+ T1 OR 3+ T2
    ivy_possible: { T1: 0, T2: 4 }, // 0 T1 but 4+ T2
    ivy_unlikely: { T1: 0, T2: 2 }, // 0-2 T2
  };

  /**
   * Process award tier classification
   */
  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {
    const studentId = query.entity_id;

    // Extract awards from facts
    const awardsWonFacts = facts.get(FactCategory.AWARDS_WON) || [];

    // Classify each award
    const classifiedAwards = this.classifyAwards(awardsWonFacts);

    // Calculate tier distribution
    const tierDistribution = this.calculateTierDistribution(classifiedAwards);

    // Assess portfolio strength
    const portfolioStrength = this.assessPortfolioStrength(tierDistribution);

    // Perform gap analysis
    const gapAnalysis = this.performGapAnalysis(tierDistribution, portfolioStrength);

    // Define target state
    const targetState = this.defineTargetState(tierDistribution, portfolioStrength);

    // Generate strategic recommendations
    const strategicRecommendations = this.generateStrategicRecommendations(
      tierDistribution,
      targetState,
      gapAnalysis
    );

    const result: PortfolioTierAnalysis = {
      classified_awards: classifiedAwards,
      tier_distribution: tierDistribution,
      portfolio_strength: portfolioStrength,
      gap_analysis: gapAnalysis,
      target_state: targetState,
      strategic_recommendations: strategicRecommendations,
    };

    return {
      type_id: this.type_id,
      component: 'tier_classification',
      triggered: true,
      confidence: 0.90,
      data: result,
    };
  }

  /**
   * Classify awards into T1-T4 tiers
   */
  private classifyAwards(awardsWonFacts: any[]): ClassifiedAward[] {
    return awardsWonFacts.map((fact) => {
      const awardData = fact.value || {};
      const awardName = awardData.name || awardData.award_name || 'Unknown Award';
      const awardId = fact.fact_id || `award_${Date.now()}`;

      // Classify tier based on award name patterns and known awards
      const tierResult = this.classifyAwardTier(awardName, awardData);

      return {
        award_name: awardName,
        award_id: awardId,
        tier: tierResult.tier,
        tier_confidence: tierResult.confidence,
        selectivity_score: tierResult.selectivity_score,
        scope: tierResult.scope,
        estimated_winners: tierResult.estimated_winners,
        estimated_applicants: tierResult.estimated_applicants,
        ivy_impact_boost: tierResult.ivy_impact_boost,
        recommendations: tierResult.recommendations,
      };
    });
  }

  /**
   * Classify individual award tier
   */
  private classifyAwardTier(
    awardName: string,
    awardData: any
  ): {
    tier: AwardTier;
    confidence: number;
    selectivity_score: number;
    scope: string;
    estimated_winners: number;
    estimated_applicants: number;
    ivy_impact_boost: number;
    recommendations: string[];
  } {
    const nameLower = awardName.toLowerCase();

    // T1 National/International patterns
    if (
      nameLower.includes('regeneron') ||
      nameLower.includes('intel isef') ||
      nameLower.includes('youngarts') ||
      nameLower.includes('presidential scholar') ||
      nameLower.includes('davidson fellow') ||
      nameLower.includes('usamo') ||
      nameLower.includes('usabo') ||
      nameLower.includes('usaco platinum') ||
      (nameLower.includes('ncwit') && nameLower.includes('national'))
    ) {
      return {
        tier: 'T1',
        confidence: 0.95,
        selectivity_score: 10,
        scope: 'national',
        estimated_winners: 300,
        estimated_applicants: 15000,
        ivy_impact_boost: 25,
        recommendations: [
          'T1 national award - significant Ivy credential',
          'Feature prominently in college applications',
        ],
      };
    }

    // T2 State/Regional patterns
    if (
      nameLower.includes('state') ||
      nameLower.includes('regional') ||
      nameLower.includes('congressional app') ||
      nameLower.includes('national merit finalist') ||
      nameLower.includes('aime') ||
      (nameLower.includes('ncwit') && !nameLower.includes('national')) ||
      (nameLower.includes('scholastic') && nameLower.includes('gold'))
    ) {
      return {
        tier: 'T2',
        confidence: 0.85,
        selectivity_score: 7,
        scope: 'state',
        estimated_winners: 1500,
        estimated_applicants: 10000,
        ivy_impact_boost: 10,
        recommendations: [
          'T2 state/regional award - strong credential',
          'Build portfolio with 3+ T2 awards for Ivy competitiveness',
        ],
      };
    }

    // T3 Local/School patterns
    if (
      nameLower.includes('school') ||
      nameLower.includes('local') ||
      nameLower.includes('community') ||
      nameLower.includes('departmental') ||
      nameLower.includes('honor society') ||
      nameLower.includes('honorable mention')
    ) {
      return {
        tier: 'T3',
        confidence: 0.75,
        selectivity_score: 4,
        scope: 'school',
        estimated_winners: 5000,
        estimated_applicants: 15000,
        ivy_impact_boost: 2,
        recommendations: [
          'T3 local award - expected baseline for competitive applicants',
          'Supplement with T1/T2 awards for Ivy admissions',
        ],
      };
    }

    // T4 Participation patterns
    if (
      nameLower.includes('ap scholar') ||
      nameLower.includes('honor roll') ||
      nameLower.includes('attendance') ||
      nameLower.includes('membership') ||
      nameLower.includes('participation') ||
      nameLower.includes('certificate')
    ) {
      return {
        tier: 'T4',
        confidence: 0.90,
        selectivity_score: 1,
        scope: 'school',
        estimated_winners: 50000,
        estimated_applicants: 100000,
        ivy_impact_boost: 0,
        recommendations: [
          'T4 participation award - no Ivy impact',
          'Consider omitting from college applications to save space',
        ],
      };
    }

    // Default: T3 (cautious middle ground)
    return {
      tier: 'T3',
      confidence: 0.50,
      selectivity_score: 5,
      scope: 'local',
      estimated_winners: 3000,
      estimated_applicants: 10000,
      ivy_impact_boost: 3,
      recommendations: ['Tier uncertain - requires manual classification'],
    };
  }

  /**
   * Calculate tier distribution
   */
  private calculateTierDistribution(
    classifiedAwards: ClassifiedAward[]
  ): { T1: number; T2: number; T3: number; T4: number } {
    return {
      T1: classifiedAwards.filter((a) => a.tier === 'T1').length,
      T2: classifiedAwards.filter((a) => a.tier === 'T2').length,
      T3: classifiedAwards.filter((a) => a.tier === 'T3').length,
      T4: classifiedAwards.filter((a) => a.tier === 'T4').length,
    };
  }

  /**
   * Assess portfolio strength
   */
  private assessPortfolioStrength(tierDist: {
    T1: number;
    T2: number;
    T3: number;
    T4: number;
  }): 'ivy_competitive' | 'ivy_possible' | 'ivy_unlikely' | 'weak' {
    if (tierDist.T1 >= 1 || tierDist.T2 >= 3) return 'ivy_competitive';
    if (tierDist.T2 >= 4) return 'ivy_possible';
    if (tierDist.T2 >= 2) return 'ivy_unlikely';
    return 'weak';
  }

  /**
   * Perform gap analysis
   */
  private performGapAnalysis(
    tierDist: { T1: number; T2: number; T3: number; T4: number },
    strength: string
  ): string[] {
    const gaps: string[] = [];

    if (tierDist.T1 === 0) {
      gaps.push('❌ MAJOR GAP: No T1 national awards (Ivy differentiator missing)');
    }

    if (tierDist.T2 < 3) {
      gaps.push(`⚠️ GAP: Only ${tierDist.T2} T2 awards (target: 3+ for Ivy competitiveness)`);
    }

    if (tierDist.T4 > tierDist.T1 + tierDist.T2) {
      gaps.push('⚠️ Over-reliance on T4 participation awards (limited Ivy impact)');
    }

    if (tierDist.T1 === 0 && tierDist.T2 === 0) {
      gaps.push('🚨 CRITICAL: Zero T1/T2 awards - profile lacks external validation');
    }

    return gaps;
  }

  /**
   * Define target state for portfolio
   */
  private defineTargetState(
    currentDist: { T1: number; T2: number; T3: number; T4: number },
    strength: string
  ): { T1_target: number; T2_target: number; T3_target: number; T4_target: number } {
    // Ideal Ivy-competitive portfolio
    return {
      T1_target: Math.max(1, currentDist.T1), // At least 1 T1
      T2_target: Math.max(3, currentDist.T2), // At least 3 T2
      T3_target: Math.max(5, currentDist.T3), // 5-7 T3
      T4_target: 0, // Omit T4 from applications
    };
  }

  /**
   * Generate strategic recommendations
   */
  private generateStrategicRecommendations(
    currentDist: { T1: number; T2: number; T3: number; T4: number },
    targetState: { T1_target: number; T2_target: number; T3_target: number; T4_target: number },
    gaps: string[]
  ): string[] {
    const recommendations: string[] = [];

    // T1 recommendations
    if (currentDist.T1 < targetState.T1_target) {
      recommendations.push(
        `🎯 Priority 1: Target ${targetState.T1_target - currentDist.T1} T1 national award(s)`
      );
      recommendations.push('   → Recommended: NCWIT, Congressional App, Scholastic Gold Key');
      recommendations.push('   → Timeline: Start 6-month orchestration campaign now');
    }

    // T2 recommendations
    if (currentDist.T2 < targetState.T2_target) {
      recommendations.push(
        `🎯 Priority 2: Target ${targetState.T2_target - currentDist.T2} additional T2 award(s)`
      );
      recommendations.push('   → Focus on state/regional competitions aligned with strengths');
    }

    // T4 elimination
    if (currentDist.T4 > 0) {
      recommendations.push('💡 Application Strategy: Omit T4 awards to save space for T1/T2');
    }

    // Portfolio balance
    if (currentDist.T1 >= 1 && currentDist.T2 >= 3) {
      recommendations.push('✅ Portfolio Strength: Ivy-competitive (1+ T1, 3+ T2)');
    }

    return recommendations;
  }
}

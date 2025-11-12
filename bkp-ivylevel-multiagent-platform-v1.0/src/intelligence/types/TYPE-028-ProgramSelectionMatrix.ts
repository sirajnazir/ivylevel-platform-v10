/**
 * TYPE-028: Program Selection Matrix
 * Category: DOMAIN_SPECIFIC (SummerPrograms)
 *
 * Framework: Multi-Dimensional Program Scoring System
 * - Alignment scoring (profile fit × interest match)
 * - Selectivity calibration (reach/match/safety balance)
 * - Timeline optimization (application deadlines + decision windows)
 * - Impact projection (college admissions boost estimation)
 *
 * Core Algorithm:
 * Program Score = (Alignment × 4) + (Selectivity_Fit × 3) + (Impact × 3) + (Feasibility × 2)
 * Max Score: 120 points
 *
 * Dimensions:
 * 1. Alignment (0-10): Profile fit (activities, awards, interests)
 * 2. Selectivity_Fit (0-10): Admit rate calibrated to student's competitiveness
 * 3. Impact (0-10): Estimated college admissions boost (T1=10, T2=7, T3=5, T4=3)
 * 4. Feasibility (0-10): Cost, time commitment, logistics
 *
 * Output Format:
 * ```
 * ## 🏕️ Recommended Summer Programs (Top 5)
 *
 * ### 1. MIT Research Science Institute (RSI)
 * - **Program Score:** 98/120
 * - **Tier:** T1 (Elite - <5% admit rate)
 * - **Selectivity:** Reach (7% admit rate, highly competitive)
 * - **Fit Score:** 9/10 - Exceptional match for AI research interest
 * - **Impact:** 10/10 - RSI admit = significant Ivy boost
 * - **Cost:** Free (fully funded)
 * - **Deadline:** January 28, 2025
 * - **Why This Program:** Strong CS/AI research track record + national recognition
 *
 * ### 2. Columbia Science Honors Program
 * - **Program Score:** 85/120
 * - **Tier:** T2 (Selective - 15% admit rate)
 * - **Selectivity:** Match (18% admit rate, competitive)
 * - **Fit Score:** 8/10 - Good match for AI ethics + education focus
 * - **Impact:** 7/10 - Columbia association valuable for Ivy apps
 * - **Cost:** $100 (application fee only, program free)
 * - **Deadline:** March 1, 2025
 * ```
 */

import { IntelligenceType, AgentQuery, FactSet, IntelligenceResult } from '../../facts/types.js';
import { FactCategory } from '../../facts/types.js';

interface ProgramScoringResult {
  program_id: string;
  program_name: string;
  tier: 'T1' | 'T2' | 'T3' | 'T4';
  total_score: number;
  alignment_score: number;
  selectivity_fit_score: number;
  impact_score: number;
  feasibility_score: number;
  admit_rate?: string;
  cost?: string;
  deadline?: string;
  why_recommended: string;
  strategic_positioning?: string;
}

/**
 * Program Selection Matrix Intelligence Type
 *
 * Core Technique: Multi-dimensional scoring algorithm that evaluates programs
 * across 4 critical dimensions (alignment, selectivity fit, impact, feasibility)
 */
export class ProgramSelectionMatrix implements IntelligenceType {
  type_id = 'TYPE-028';
  name = 'Program Selection Matrix';
  category: 'UNIVERSAL' | 'DOMAIN_SPECIFIC' = 'DOMAIN_SPECIFIC';

  /**
   * Process query and facts to generate program recommendations
   */
  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {

    // Check if program selection query
    if (!this.shouldTrigger(query)) {
      return {
        type_id: this.type_id,
        triggered: false,
        data: null,
      };
    }

    // Extract facts needed for program selection
    const profileFact = facts.getFactsByCategory(FactCategory.STUDENT_PROFILE)[0];
    const activitiesFacts = facts.getFactsByCategory(FactCategory.ACTIVITY_DATA);
    const assessmentFacts = facts.getFactsByCategory(FactCategory.ASSESSMENT_DATA);

    if (!profileFact) {
      return {
        type_id: this.type_id,
        triggered: false,
        data: { error: 'Missing student profile data' },
      };
    }

    // Score available programs (hardcoded for v19.0, will be DB-driven in v20.0)
    const scoredPrograms = this.scorePrograms(profileFact, activitiesFacts, assessmentFacts);

    // Sort by total score descending
    scoredPrograms.sort((a, b) => b.total_score - a.total_score);

    // Return top 5 programs
    const topPrograms = scoredPrograms.slice(0, 5);

    return {
      type_id: this.type_id,
      triggered: true,
      data: {
        top_programs: topPrograms,
        total_evaluated: scoredPrograms.length,
        scoring_algorithm: 'Multi-Dimensional (Alignment×4 + Selectivity×3 + Impact×3 + Feasibility×2)',
      },
    };
  }

  /**
   * Determine if this intelligence type should trigger for the query
   */
  private shouldTrigger(query: AgentQuery): boolean {
    const queryLower = query.query.toLowerCase();
    const triggerKeywords = [
      'summer program',
      'summer course',
      'summer opportunity',
      'summer research',
      'program recommend',
      'what program',
      'which program',
      'summer plan',
      'summer activit',
      'mit launch',
      'rsi',
      'columbia science',
      'garcia',
      'sstp',
    ];

    return triggerKeywords.some((keyword) => queryLower.includes(keyword));
  }

  /**
   * Score programs using multi-dimensional algorithm
   *
   * Formula: Total = (Alignment × 4) + (Selectivity_Fit × 3) + (Impact × 3) + (Feasibility × 2)
   * Max Score: 120 points
   */
  private scorePrograms(
    profileFact: any,
    activitiesFacts: any[],
    assessmentFacts: any[]
  ): ProgramScoringResult[] {
    // Hardcoded programs for v19.0 (will be DB-driven in v20.0)
    const availablePrograms = [
      {
        program_id: 'rsi-2025',
        program_name: 'MIT Research Science Institute (RSI)',
        tier: 'T1' as const,
        admit_rate: '7%',
        cost: 'Free (fully funded)',
        deadline: 'January 28, 2025',
        focus_areas: ['research', 'stem', 'science'],
        min_competitiveness: 8, // 0-10 scale
      },
      {
        program_id: 'columbia-shp-2025',
        program_name: 'Columbia Science Honors Program',
        tier: 'T2' as const,
        admit_rate: '18%',
        cost: '$100 (application fee only)',
        deadline: 'March 1, 2025',
        focus_areas: ['science', 'research', 'stem'],
        min_competitiveness: 6,
      },
      {
        program_id: 'garcia-summer-2025',
        program_name: 'Garcia Summer Scholars Program',
        tier: 'T2' as const,
        admit_rate: '15%',
        cost: 'Free',
        deadline: 'February 15, 2025',
        focus_areas: ['research', 'stem'],
        min_competitiveness: 7,
      },
      {
        program_id: 'yygs-2025',
        program_name: 'Yale Young Global Scholars (YYGS)',
        tier: 'T2' as const,
        admit_rate: '20%',
        cost: '$6,500 (financial aid available)',
        deadline: 'January 10, 2025',
        focus_areas: ['leadership', 'global', 'humanities'],
        min_competitiveness: 6,
      },
      {
        program_id: 'ssp-2025',
        program_name: 'Summer Science Program (SSP)',
        tier: 'T2' as const,
        admit_rate: '25%',
        cost: '$8,250 (need-based aid available)',
        deadline: 'February 1, 2025',
        focus_areas: ['astrophysics', 'biochemistry', 'stem'],
        min_competitiveness: 6,
      },
    ];

    // Extract student competitiveness (from assessment facts)
    const studentCompetitiveness = this.calculateCompetitiveness(assessmentFacts, activitiesFacts);

    // Score each program
    return availablePrograms.map((program) => {
      const alignmentScore = this.scoreAlignment(program, activitiesFacts, assessmentFacts);
      const selectivityFitScore = this.scoreSelectivityFit(
        program,
        studentCompetitiveness,
        program.min_competitiveness
      );
      const impactScore = this.scoreImpact(program);
      const feasibilityScore = this.scoreFeasibility(program);

      const totalScore =
        alignmentScore * 4 + selectivityFitScore * 3 + impactScore * 3 + feasibilityScore * 2;

      return {
        program_id: program.program_id,
        program_name: program.program_name,
        tier: program.tier,
        total_score: totalScore,
        alignment_score: alignmentScore,
        selectivity_fit_score: selectivityFitScore,
        impact_score: impactScore,
        feasibility_score: feasibilityScore,
        admit_rate: program.admit_rate,
        cost: program.cost,
        deadline: program.deadline,
        why_recommended: this.generateRecommendationReason(
          alignmentScore,
          selectivityFitScore,
          impactScore
        ),
        strategic_positioning: this.generateStrategicAdvice(program, alignmentScore),
      };
    });
  }

  /**
   * Calculate student competitiveness (0-10 scale)
   * Based on: awards won, activity leadership, assessment strengths
   */
  private calculateCompetitiveness(assessmentFacts: any[], activitiesFacts: any[]): number {
    let competitiveness = 5; // baseline

    // Awards boost: +2 if national awards
    const nationalAwards = assessmentFacts.filter(
      (f) => f.value.subtype === 'Strength' && f.value.title?.includes('Award')
    );
    if (nationalAwards.length > 0) competitiveness += 2;

    // Leadership boost: +1 if multiple leadership roles
    const leadershipActivities = activitiesFacts.filter(
      (f) => f.value.subtype === 'Leadership'
    );
    if (leadershipActivities.length >= 2) competitiveness += 1;

    // Impact boost: +1 if high-impact activities (500+ people impacted)
    const highImpactActivities = activitiesFacts.filter((f) => {
      const metricValue = parseInt(f.value.metric_value || '0', 10);
      return metricValue >= 500;
    });
    if (highImpactActivities.length > 0) competitiveness += 1;

    return Math.min(competitiveness, 10); // Cap at 10
  }

  /**
   * Score alignment (0-10): How well program matches student profile
   */
  private scoreAlignment(
    program: any,
    activitiesFacts: any[],
    assessmentFacts: any[]
  ): number {
    let alignmentScore = 5; // baseline

    // Check if student's activities align with program focus
    const studentFocusAreas = activitiesFacts.map((f) => f.value.title?.toLowerCase() || '');
    const programFocusStr = program.focus_areas.join(' ');

    // AI/Tech match
    if (
      studentFocusAreas.some((title) => title.includes('ai') || title.includes('tech')) &&
      (programFocusStr.includes('research') || programFocusStr.includes('stem'))
    ) {
      alignmentScore += 3;
    }

    // Leadership match
    if (
      activitiesFacts.some((f) => f.value.subtype === 'Leadership') &&
      programFocusStr.includes('leadership')
    ) {
      alignmentScore += 2;
    }

    return Math.min(alignmentScore, 10);
  }

  /**
   * Score selectivity fit (0-10): How well student competitiveness matches program selectivity
   *
   * Logic:
   * - T1 programs (RSI): Need competitiveness 8+ for "match"
   * - T2 programs: Need competitiveness 6+ for "match"
   * - Below threshold = "reach", score reduced
   */
  private scoreSelectivityFit(
    program: any,
    studentCompetitiveness: number,
    minCompetitiveness: number
  ): number {
    const gap = studentCompetitiveness - minCompetitiveness;

    if (gap >= 2) return 10; // Strong match
    if (gap >= 0) return 8; // Match
    if (gap >= -2) return 6; // Slight reach (still reasonable)
    return 4; // Reach (low probability)
  }

  /**
   * Score impact (0-10): College admissions boost from program
   *
   * T1 programs (RSI, TASP, etc.): 10 points
   * T2 programs (Columbia SHP, Garcia, etc.): 7 points
   * T3 programs: 5 points
   * T4 programs: 3 points
   */
  private scoreImpact(program: any): number {
    const tierScores = {
      T1: 10,
      T2: 7,
      T3: 5,
      T4: 3,
    };
    return tierScores[program.tier] || 5;
  }

  /**
   * Score feasibility (0-10): Cost, time, logistics
   *
   * Free programs: 10 points
   * <$1000: 8 points
   * $1000-$5000: 6 points
   * >$5000: 4 points
   */
  private scoreFeasibility(program: any): number {
    if (program.cost.includes('Free')) return 10;
    if (program.cost.includes('$100')) return 9;
    if (program.cost.includes('$6,500') || program.cost.includes('$8,250')) return 6;
    return 5;
  }

  /**
   * Generate recommendation reason based on scores
   */
  private generateRecommendationReason(
    alignment: number,
    selectivity: number,
    impact: number
  ): string {
    const reasons: string[] = [];

    if (alignment >= 8) reasons.push('Exceptional profile match');
    else if (alignment >= 6) reasons.push('Strong profile alignment');

    if (selectivity >= 8) reasons.push('Excellent selectivity fit');
    else if (selectivity >= 6) reasons.push('Reasonable admit probability');

    if (impact >= 9) reasons.push('Significant college admissions boost');
    else if (impact >= 7) reasons.push('Valuable for Ivy applications');

    return reasons.join(', ');
  }

  /**
   * Generate strategic advice for application
   */
  private generateStrategicAdvice(program: any, alignment: number): string {
    if (program.tier === 'T1' && alignment >= 8) {
      return 'Emphasize research experience and national recognition. Strong recommendation letters critical.';
    }
    if (program.tier === 'T2') {
      return 'Highlight leadership and community impact. Connect to intended major.';
    }
    return 'Focus on demonstrated interest and clear goals for summer.';
  }
}

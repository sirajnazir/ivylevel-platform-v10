/**
 * TYPE-031: Scholarship Selection Matrix
 * Category: DOMAIN_SPECIFIC (ScholarshipsAgent only)
 *
 * Purpose: Multi-dimensional scholarship scoring to identify best-fit opportunities
 * and maximize application success rate while minimizing effort.
 *
 * Formula:
 * Scholarship Score = (Eligibility × 4) + (Award Amount × 3) + (Win Odds × 2) + (Essay Reuse × 1)
 * Max Score: 100 points
 *
 * Dimensions:
 * 1. Eligibility (0-10): How well student matches requirements (GPA, major, demographics, activities)
 * 2. Award Amount (0-10): Financial value (scaled: $500=1, $1K=3, $5K=6, $10K=8, $25K+=10)
 * 3. Win Odds (0-10): Competition level vs student profile strength
 * 4. Essay Reuse (0-10): Overlap with existing essays (Common App, supplements, award essays)
 *
 * Source: W019 session transcript (scholarship strategy discussion) + Awards Agent pattern
 * Pattern: Similar to Award Arbitrage (TYPE-023) but with financial aid focus
 *
 * Created: 2025-10-29 (v21.0 ScholarshipsAgent Foundation)
 */

import {
  IntelligenceType,
  IntelligenceResult,
  AgentQuery,
  FactSet,
  FactCategory,
} from './BaseIntelligenceType.js';

type EligibilityMatch = 'perfect' | 'strong' | 'moderate' | 'weak' | 'ineligible';
type ScholarshipType = 'merit' | 'need' | 'hybrid' | 'demographic' | 'major_specific' | 'community_service';

interface ScholarshipOpportunity {
  scholarship_id: string;
  scholarship_name: string;
  organization: string;
  scholarship_type: ScholarshipType;
  award_amount_min: number; // USD
  award_amount_max: number; // USD
  deadline: string; // ISO date

  // Eligibility requirements
  eligibility: {
    min_gpa?: number;
    max_gpa?: number;
    grade_levels: string[]; // ['11', '12']
    majors?: string[]; // ['STEM', 'Arts', 'Business']
    demographics?: string[]; // ['female', 'underrepresented_minority', 'first_gen']
    activities?: string[]; // ['community_service', 'leadership', 'research']
    geographic?: string[]; // ['California', 'National', 'International']
  };

  // Application requirements
  application: {
    essay_required: boolean;
    essay_prompts?: string[];
    essay_word_count?: number;
    recommendation_letters: number;
    transcript_required: boolean;
    test_scores_required: boolean;
  };

  // Selection factors
  selectivity: string; // 'highly_competitive' | 'competitive' | 'moderate' | 'accessible'
  estimated_applicant_pool: number;
  awards_per_year: number;
  renewable: boolean;
  renewable_years?: number;
}

interface ScholarshipScoring {
  scholarship_id: string;
  scholarship_name: string;
  total_score: number; // 0-100

  // Dimension scores
  eligibility_score: number; // 0-10
  award_amount_score: number; // 0-10
  win_odds_score: number; // 0-10
  essay_reuse_score: number; // 0-10

  // Details
  eligibility_match: EligibilityMatch;
  estimated_win_probability: number; // 0.0-1.0
  effective_hourly_value: number; // Award amount / estimated effort hours
  recommendation: 'highly_recommended' | 'recommended' | 'consider' | 'skip';
}

interface ScholarshipSelectionResult {
  scholarships_scored: ScholarshipScoring[];
  top_recommendations: ScholarshipScoring[]; // Top 5 by score
  quick_wins: ScholarshipScoring[]; // High award_amount + high win_odds
  reach_opportunities: ScholarshipScoring[]; // High award_amount + lower win_odds
  safety_opportunities: ScholarshipScoring[]; // Moderate award_amount + high win_odds
  total_potential_aid: number; // Sum of top recommendations award amounts
  estimated_effort_hours: number;
  recommendations: string[];
}

export class ScholarshipSelectionMatrix implements IntelligenceType {
  type_id = 'TYPE-031';
  name = 'Scholarship Selection Matrix';
  category: 'UNIVERSAL' | 'DOMAIN_SPECIFIC' = 'DOMAIN_SPECIFIC';

  /**
   * Process query to score and rank scholarship opportunities
   */
  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {
    const studentId = query.entity_id;

    // Extract relevant facts
    const profileFacts = facts.get(FactCategory.STUDENT_PROFILE) || [];
    const activityFacts = facts.get(FactCategory.ACTIVITY_DATA) || [];
    const assessmentFacts = facts.get(FactCategory.ASSESSMENT_DATA) || [];

    // Get available scholarship opportunities (from kb_items or hardcoded catalog)
    const availableScholarships = this.getAvailableScholarships();

    // Score each scholarship opportunity
    const scoredScholarships = this.scoreScholarships(
      availableScholarships,
      profileFacts,
      activityFacts,
      assessmentFacts
    );

    // Categorize scholarships
    const topRecommendations = scoredScholarships
      .filter((s) => s.total_score >= 60)
      .slice(0, 5);

    const quickWins = scoredScholarships.filter(
      (s) => s.award_amount_score >= 6 && s.win_odds_score >= 7
    );

    const reachOpportunities = scoredScholarships.filter(
      (s) => s.award_amount_score >= 8 && s.win_odds_score >= 4 && s.win_odds_score < 7
    );

    const safetyOpportunities = scoredScholarships.filter(
      (s) => s.award_amount_score >= 5 && s.award_amount_score < 8 && s.win_odds_score >= 7
    );

    // Calculate total potential aid
    const totalPotentialAid = topRecommendations.reduce((sum, s) => {
      const scholarship = availableScholarships.find((sch) => sch.scholarship_id === s.scholarship_id);
      return sum + (scholarship?.award_amount_max || 0);
    }, 0);

    // Estimate effort hours (avg 8 hours per scholarship application)
    const estimatedEffortHours = topRecommendations.length * 8;

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      topRecommendations,
      quickWins,
      reachOpportunities,
      safetyOpportunities
    );

    const result: ScholarshipSelectionResult = {
      scholarships_scored: scoredScholarships,
      top_recommendations: topRecommendations,
      quick_wins: quickWins,
      reach_opportunities: reachOpportunities,
      safety_opportunities: safetyOpportunities,
      total_potential_aid: totalPotentialAid,
      estimated_effort_hours: estimatedEffortHours,
      recommendations,
    };

    return {
      type_id: this.type_id,
      triggered: true,
      confidence_score: 0.88,
      data: result,
    };
  }

  /**
   * Get available scholarship opportunities
   * TODO: Replace with database query to kb_items where item_type='Scholarship'
   */
  private getAvailableScholarships(): ScholarshipOpportunity[] {
    return [
      {
        scholarship_id: 'ncwit-aspirations-2025',
        scholarship_name: 'NCWIT Aspirations in Computing',
        organization: 'National Center for Women & Information Technology',
        scholarship_type: 'demographic',
        award_amount_min: 500,
        award_amount_max: 10000,
        deadline: '2025-02-15',
        eligibility: {
          min_gpa: 3.0,
          grade_levels: ['11', '12'],
          majors: ['STEM', 'Computer Science'],
          demographics: ['female'],
          activities: ['technology', 'computer_science', 'coding'],
        },
        application: {
          essay_required: true,
          essay_prompts: ['Describe a computing project you created', 'How will you use computing to make an impact?'],
          essay_word_count: 500,
          recommendation_letters: 1,
          transcript_required: true,
          test_scores_required: false,
        },
        selectivity: 'competitive',
        estimated_applicant_pool: 5000,
        awards_per_year: 50,
        renewable: false,
      },
      {
        scholarship_id: 'coca-cola-scholars-2025',
        scholarship_name: 'Coca-Cola Scholars Program',
        organization: 'Coca-Cola Foundation',
        scholarship_type: 'merit',
        award_amount_min: 20000,
        award_amount_max: 20000,
        deadline: '2024-10-31',
        eligibility: {
          min_gpa: 3.0,
          grade_levels: ['12'],
          activities: ['leadership', 'community_service'],
          geographic: ['National'],
        },
        application: {
          essay_required: true,
          essay_prompts: ['Leadership experience', 'Community impact'],
          essay_word_count: 750,
          recommendation_letters: 1,
          transcript_required: true,
          test_scores_required: false,
        },
        selectivity: 'highly_competitive',
        estimated_applicant_pool: 95000,
        awards_per_year: 150,
        renewable: false,
      },
      {
        scholarship_id: 'gates-scholarship-2025',
        scholarship_name: 'Gates Scholarship',
        organization: 'Gates Foundation',
        scholarship_type: 'need',
        award_amount_min: 100000,
        award_amount_max: 100000,
        deadline: '2024-09-15',
        eligibility: {
          min_gpa: 3.3,
          grade_levels: ['12'],
          demographics: ['pell_eligible', 'underrepresented_minority'],
          activities: ['leadership', 'community_service'],
        },
        application: {
          essay_required: true,
          essay_prompts: ['Personal background and challenges', 'Leadership and goals'],
          essay_word_count: 1000,
          recommendation_letters: 2,
          transcript_required: true,
          test_scores_required: true,
        },
        selectivity: 'highly_competitive',
        estimated_applicant_pool: 34000,
        awards_per_year: 300,
        renewable: true,
        renewable_years: 4,
      },
      {
        scholarship_id: 'dell-scholars-2025',
        scholarship_name: 'Dell Scholars Program',
        organization: 'Michael & Susan Dell Foundation',
        scholarship_type: 'hybrid',
        award_amount_min: 20000,
        award_amount_max: 20000,
        deadline: '2024-12-01',
        eligibility: {
          min_gpa: 2.4,
          grade_levels: ['12'],
          demographics: ['pell_eligible', 'first_gen'],
          activities: ['overcome_adversity', 'community_service'],
        },
        application: {
          essay_required: true,
          essay_prompts: ['Describe a challenge you overcame', 'How will this scholarship help?'],
          essay_word_count: 500,
          recommendation_letters: 1,
          transcript_required: true,
          test_scores_required: false,
        },
        selectivity: 'competitive',
        estimated_applicant_pool: 15000,
        awards_per_year: 500,
        renewable: false,
      },
      {
        scholarship_id: 'jack-kent-cooke-2025',
        scholarship_name: 'Jack Kent Cooke College Scholarship',
        organization: 'Jack Kent Cooke Foundation',
        scholarship_type: 'merit',
        award_amount_min: 40000,
        award_amount_max: 40000,
        deadline: '2024-11-14',
        eligibility: {
          min_gpa: 3.5,
          grade_levels: ['12'],
          demographics: ['low_income'],
          activities: ['academic_excellence', 'leadership'],
        },
        application: {
          essay_required: true,
          essay_prompts: ['Academic interests and goals', 'Personal background'],
          essay_word_count: 1000,
          recommendation_letters: 2,
          transcript_required: true,
          test_scores_required: true,
        },
        selectivity: 'highly_competitive',
        estimated_applicant_pool: 2500,
        awards_per_year: 60,
        renewable: true,
        renewable_years: 4,
      },
      {
        scholarship_id: 'horatio-alger-2025',
        scholarship_name: 'Horatio Alger Scholarship',
        organization: 'Horatio Alger Association',
        scholarship_type: 'hybrid',
        award_amount_min: 25000,
        award_amount_max: 25000,
        deadline: '2024-10-25',
        eligibility: {
          min_gpa: 2.0,
          grade_levels: ['12'],
          demographics: ['financial_need'],
          activities: ['overcome_adversity', 'community_service'],
        },
        application: {
          essay_required: true,
          essay_prompts: ['Adversity you have overcome', 'Future goals'],
          essay_word_count: 500,
          recommendation_letters: 1,
          transcript_required: true,
          test_scores_required: false,
        },
        selectivity: 'moderate',
        estimated_applicant_pool: 8000,
        awards_per_year: 1000,
        renewable: false,
      },
    ];
  }

  /**
   * Score all scholarship opportunities for the student
   */
  private scoreScholarships(
    scholarships: ScholarshipOpportunity[],
    profileFacts: any[],
    activityFacts: any[],
    assessmentFacts: any[]
  ): ScholarshipScoring[] {
    return scholarships.map((scholarship) => {
      const eligibilityScore = this.scoreEligibility(scholarship, profileFacts, activityFacts);
      const awardAmountScore = this.scoreAwardAmount(scholarship);
      const winOddsScore = this.scoreWinOdds(scholarship, eligibilityScore, activityFacts, assessmentFacts);
      const essayReuseScore = this.scoreEssayReuse(scholarship, activityFacts);

      // Weighted total: Eligibility × 4 + Award Amount × 3 + Win Odds × 2 + Essay Reuse × 1
      const totalScore = eligibilityScore * 4 + awardAmountScore * 3 + winOddsScore * 2 + essayReuseScore * 1;

      // Eligibility match classification
      const eligibilityMatch = this.classifyEligibilityMatch(eligibilityScore);

      // Estimated win probability (simplified model)
      const estimatedWinProbability = this.estimateWinProbability(winOddsScore, eligibilityScore);

      // Effective hourly value (award amount / estimated effort)
      const estimatedEffortHours = scholarship.application.essay_required ? 8 : 3;
      const effectiveHourlyValue = scholarship.award_amount_max / estimatedEffortHours;

      // Recommendation
      const recommendation = this.getRecommendation(totalScore, eligibilityMatch);

      return {
        scholarship_id: scholarship.scholarship_id,
        scholarship_name: scholarship.scholarship_name,
        total_score: Math.round(totalScore),
        eligibility_score: eligibilityScore,
        award_amount_score: awardAmountScore,
        win_odds_score: winOddsScore,
        essay_reuse_score: essayReuseScore,
        eligibility_match,
        estimated_win_probability: estimatedWinProbability,
        effective_hourly_value: Math.round(effectiveHourlyValue),
        recommendation,
      };
    });
  }

  /**
   * Score eligibility match (0-10)
   */
  private scoreEligibility(
    scholarship: ScholarshipOpportunity,
    profileFacts: any[],
    activityFacts: any[]
  ): number {
    let score = 5; // Baseline

    // TODO: Extract GPA, grade, demographics from profileFacts
    // For now, using placeholder logic

    // GPA match
    if (scholarship.eligibility.min_gpa) {
      // Assume student GPA is 3.7 (extract from profileFacts in production)
      const studentGPA = 3.7;
      if (studentGPA >= scholarship.eligibility.min_gpa + 0.5) score += 2;
      else if (studentGPA >= scholarship.eligibility.min_gpa) score += 1;
      else score -= 3; // Below minimum
    }

    // Grade level match
    // Assume student is grade 11 (extract from profileFacts in production)
    const studentGrade = '11';
    if (scholarship.eligibility.grade_levels.includes(studentGrade)) {
      score += 1;
    } else {
      score -= 5; // Ineligible
    }

    // Activities alignment
    if (scholarship.eligibility.activities) {
      const activityTypes = activityFacts.map((f) => f.value.subtype || '').filter(Boolean);
      const matches = scholarship.eligibility.activities.filter((req) =>
        activityTypes.some((act) => act.toLowerCase().includes(req))
      );
      score += Math.min(matches.length, 2); // +2 max for activity alignment
    }

    return Math.max(0, Math.min(score, 10));
  }

  /**
   * Score award amount (0-10)
   */
  private scoreAwardAmount(scholarship: ScholarshipOpportunity): number {
    const amount = scholarship.award_amount_max;

    if (amount >= 25000) return 10;
    if (amount >= 10000) return 8;
    if (amount >= 5000) return 6;
    if (amount >= 1000) return 3;
    if (amount >= 500) return 1;
    return 0;
  }

  /**
   * Score win odds (0-10) - higher score = better odds
   */
  private scoreWinOdds(
    scholarship: ScholarshipOpportunity,
    eligibilityScore: number,
    activityFacts: any[],
    assessmentFacts: any[]
  ): number {
    let score = 5; // Baseline

    // Selectivity adjustment
    if (scholarship.selectivity === 'accessible') score += 3;
    else if (scholarship.selectivity === 'moderate') score += 2;
    else if (scholarship.selectivity === 'competitive') score += 0;
    else if (scholarship.selectivity === 'highly_competitive') score -= 2;

    // Eligibility strength boost
    if (eligibilityScore >= 9) score += 2;
    else if (eligibilityScore >= 7) score += 1;
    else if (eligibilityScore < 5) score -= 2;

    // Activity strength (awards won, leadership roles)
    const awardsFacts = activityFacts.filter((f) => f.value.item_type === 'Award' && f.value.tier1_state === 'Won');
    if (awardsFacts.length >= 3) score += 1;

    // Assessment strengths
    const strengths = assessmentFacts.filter((f) => f.value.subtype === 'Strength');
    if (strengths.length >= 5) score += 1;

    return Math.max(0, Math.min(score, 10));
  }

  /**
   * Score essay reuse potential (0-10)
   */
  private scoreEssayReuse(scholarship: ScholarshipOpportunity, activityFacts: any[]): number {
    if (!scholarship.application.essay_required) return 10; // No essay = maximum reuse value

    // Check essay prompt overlap with Common App / award essays
    // For now, simple heuristic: if prompts mention "leadership" or "impact", assume 70% reuse
    const prompts = scholarship.application.essay_prompts || [];
    const commonThemes = ['leadership', 'impact', 'community', 'challenge', 'goal'];

    const themeMatches = prompts.filter((prompt) =>
      commonThemes.some((theme) => prompt.toLowerCase().includes(theme))
    );

    if (themeMatches.length >= 2) return 8; // High reuse
    if (themeMatches.length === 1) return 6; // Moderate reuse
    return 3; // Low reuse (unique prompts)
  }

  /**
   * Classify eligibility match
   */
  private classifyEligibilityMatch(eligibilityScore: number): EligibilityMatch {
    if (eligibilityScore >= 9) return 'perfect';
    if (eligibilityScore >= 7) return 'strong';
    if (eligibilityScore >= 5) return 'moderate';
    if (eligibilityScore >= 3) return 'weak';
    return 'ineligible';
  }

  /**
   * Estimate win probability (0.0-1.0)
   */
  private estimateWinProbability(winOddsScore: number, eligibilityScore: number): number {
    // Simple model: (winOddsScore + eligibilityScore) / 20
    const combinedScore = (winOddsScore + eligibilityScore) / 2;
    return Math.min(combinedScore / 10, 1.0);
  }

  /**
   * Get recommendation level
   */
  private getRecommendation(
    totalScore: number,
    eligibilityMatch: EligibilityMatch
  ): 'highly_recommended' | 'recommended' | 'consider' | 'skip' {
    if (eligibilityMatch === 'ineligible') return 'skip';
    if (totalScore >= 75) return 'highly_recommended';
    if (totalScore >= 60) return 'recommended';
    if (totalScore >= 45) return 'consider';
    return 'skip';
  }

  /**
   * Generate strategic recommendations
   */
  private generateRecommendations(
    topRecommendations: ScholarshipScoring[],
    quickWins: ScholarshipScoring[],
    reachOpportunities: ScholarshipScoring[],
    safetyOpportunities: ScholarshipScoring[]
  ): string[] {
    const recommendations: string[] = [];

    if (quickWins.length > 0) {
      recommendations.push(
        `Focus on ${quickWins.length} quick win scholarships (high award + high win odds): ${quickWins.map((s) => s.scholarship_name).slice(0, 3).join(', ')}`
      );
    }

    if (reachOpportunities.length > 0) {
      recommendations.push(
        `Apply to ${Math.min(reachOpportunities.length, 2)} reach scholarships (high award amounts): ${reachOpportunities.map((s) => s.scholarship_name).slice(0, 2).join(', ')}`
      );
    }

    if (safetyOpportunities.length > 0) {
      recommendations.push(
        `Include ${Math.min(safetyOpportunities.length, 3)} safety scholarships (high win probability): ${safetyOpportunities.map((s) => s.scholarship_name).slice(0, 3).join(', ')}`
      );
    }

    if (topRecommendations.length === 0) {
      recommendations.push('No strong scholarship matches found. Consider building stronger profile (GPA, activities, awards) before applying.');
    }

    if (topRecommendations.length > 8) {
      recommendations.push(
        `⚠️ Too many applications (${topRecommendations.length}). Prioritize top ${Math.min(topRecommendations.length, 5)} to maintain quality.`
      );
    }

    return recommendations;
  }
}

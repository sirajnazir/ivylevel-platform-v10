/**
 * TYPE-081: IvyScore Calculation Intelligence
 *
 * Purpose: Calculate comprehensive competitiveness score across 9 dimensions
 * using Jenny's rubric framework with weighted scoring.
 *
 * Framework: 9-Dimension Rubric (0-10 scale per dimension)
 * - Academics (weight: 1.5) - GPA, rigor, test scores
 * - Extracurriculars (weight: 1.2) - Depth, leadership, impact
 * - Recognition (weight: 1.3) - Awards, competitions, honors
 * - Leadership (weight: 1.1) - Roles, influence, responsibility
 * - Community Service (weight: 0.9) - Service hours, impact, consistency
 * - Personal Initiative (weight: 1.0) - Self-directed projects, entrepreneurship
 * - Passion/Narrative (weight: 1.4) - Story coherence, authenticity
 * - Recommendations (weight: 0.8) - Teacher/counselor quality
 * - Essays (weight: 1.3) - Writing quality, vulnerability, insight
 *
 * Core Algorithm:
 * 1. Score each of 9 dimensions (0-10 scale)
 * 2. Apply dimension weights
 * 3. Calculate weighted IvyScore (0-100)
 * 4. Determine competitiveness tier (Elite/Strong/Competitive/Developing)
 * 5. Identify score drivers (top strengths) and detractors (gaps)
 *
 * Intelligence Extraction: W001-W008 initial assessment sessions
 * (Jenny's systematic rubric evaluation approach)
 *
 * Created: 2025-10-29
 * Version: v23.0 AssessmentAgent Intelligence Types
 */

import { IntelligenceType, IntelligenceResult, AgentQuery, FactSet, FactCategory } from './BaseIntelligenceType.js';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Rubric Dimension
 */
type RubricDimension =
  | 'academics'
  | 'extracurriculars'
  | 'recognition'
  | 'leadership'
  | 'community_service'
  | 'personal_initiative'
  | 'passion_narrative'
  | 'recommendations'
  | 'essays';

/**
 * Dimension Score
 */
interface DimensionScore {
  dimension: RubricDimension;
  raw_score: number; // 0-10
  weight: number;
  weighted_score: number; // raw_score × weight
  percentile?: number; // 0-100 (vs peer group)
  evidence: string[]; // What contributed to this score
  gaps: string[]; // What's missing
}

/**
 * Competitiveness Tier
 */
type CompetitivenessTier = 'Elite' | 'Strong' | 'Competitive' | 'Developing';

/**
 * Complete IvyScore Result
 */
interface IvyScoreCalculationResult {
  student_id: string;
  ivy_score: number; // 0-100 weighted score
  competitiveness_tier: CompetitivenessTier;
  dimension_scores: DimensionScore[];
  top_strengths: Array<{ dimension: string; score: number; rationale: string }>;
  critical_gaps: Array<{ dimension: string; score: number; gap: string }>;
  peer_comparison: {
    vs_ivy_admits: string; // "Above/At/Below average"
    vs_grade_level: string;
  };
  score_trajectory: {
    current: number;
    potential_max: number; // If all gaps filled
    growth_opportunity: number; // potential_max - current
  };
  next_actions: string[];
}

// ============================================================================
// IVYSCORE CALCULATION INTELLIGENCE
// ============================================================================

export class IvyScoreCalculation implements IntelligenceType {
  type_id = 'TYPE-081';
  name = 'IvyScore Calculation';
  category: 'UNIVERSAL' | 'DOMAIN_SPECIFIC' = 'DOMAIN_SPECIFIC';
  description = 'Calculates comprehensive competitiveness score across 9 dimensions using weighted rubric framework';

  components = {
    framework: {
      name: '9-Dimension Weighted Rubric',
      description: 'Holistic competitiveness scoring across academics, activities, narrative, and presentation',
      mental_model: 'Not just what you did, but how well you did it across all dimensions that matter',
    },
    tactics: [
      {
        name: 'Dimension Scoring',
        description: 'Score each dimension 0-10 based on evidence',
        steps: [
          'Gather evidence for dimension (GPA, awards, activities, etc.)',
          'Apply scoring rubric (0-10 scale)',
          'Document evidence used',
          'Identify gaps vs. ideal',
        ],
      },
      {
        name: 'Weighted Aggregation',
        description: 'Combine scores with dimension weights',
        steps: [
          'Apply weight to each dimension score',
          'Sum weighted scores',
          'Normalize to 0-100 scale',
          'Determine competitiveness tier',
        ],
      },
    ],
    techniques: [],
    chips: [],
    metrics: {
      success_criteria: [
        'All 9 dimensions scored',
        'Evidence documented per dimension',
        'Tier assignment accurate',
      ],
      validation: 'IvyScore correlates with admission outcomes',
    },
    triggers: {
      conditions: ['score', 'ivyscore', 'competitiveness', 'rubric', 'evaluate'],
    },
  };

  // ==========================================================================
  // CORE CONSTANTS
  // ==========================================================================

  /**
   * Dimension weights (sum to ~10.5 for normalization)
   */
  private readonly DIMENSION_WEIGHTS: Record<RubricDimension, number> = {
    academics: 1.5,
    extracurriculars: 1.2,
    recognition: 1.3,
    leadership: 1.1,
    community_service: 0.9,
    personal_initiative: 1.0,
    passion_narrative: 1.4,
    recommendations: 0.8,
    essays: 1.3,
  };

  /**
   * Competitiveness tier thresholds
   */
  private readonly TIER_THRESHOLDS = {
    Elite: 85, // Top 1-5% (HYPSM competitive)
    Strong: 75, // Top 10-15% (T20 competitive)
    Competitive: 60, // Top 30-40% (T50 competitive)
    Developing: 0, // Below 60 (needs work)
  };

  // ==========================================================================
  // MAIN INTELLIGENCE INTERFACE
  // ==========================================================================

  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {
    const studentId = query.entity_id;

    // Score all 9 dimensions
    const dimensionScores = this.scoreDimensions(facts);

    // Calculate weighted IvyScore
    const ivyScore = this.calculateIvyScore(dimensionScores);

    // Determine competitiveness tier
    const competitivenessTier = this.determineCompetitivenessTier(ivyScore);

    // Identify top strengths and critical gaps
    const topStrengths = this.identifyTopStrengths(dimensionScores);
    const criticalGaps = this.identifyCriticalGaps(dimensionScores);

    // Peer comparison (simplified - would use real data)
    const peerComparison = this.calculatePeerComparison(ivyScore);

    // Score trajectory
    const scoreTrajectory = this.calculateScoreTrajectory(dimensionScores, ivyScore);

    // Generate next actions
    const nextActions = this.generateNextActions(criticalGaps, scoreTrajectory);

    const result: IvyScoreCalculationResult = {
      student_id: studentId,
      ivy_score: ivyScore,
      competitiveness_tier: competitivenessTier,
      dimension_scores: dimensionScores,
      top_strengths: topStrengths,
      critical_gaps: criticalGaps,
      peer_comparison: peerComparison,
      score_trajectory: scoreTrajectory,
      next_actions: nextActions,
    };

    return {
      type_id: this.type_id,
      component: 'ivyscore_calculation',
      triggered: true,
      confidence: 0.9,
      data: result,
    };
  }

  // ==========================================================================
  // DIMENSION SCORING
  // ==========================================================================

  /**
   * Score all 9 dimensions
   */
  private scoreDimensions(facts: FactSet): DimensionScore[] {
    const dimensions: RubricDimension[] = [
      'academics',
      'extracurriculars',
      'recognition',
      'leadership',
      'community_service',
      'personal_initiative',
      'passion_narrative',
      'recommendations',
      'essays',
    ];

    return dimensions.map(dim => this.scoreDimension(dim, facts));
  }

  /**
   * Score individual dimension
   */
  private scoreDimension(dimension: RubricDimension, facts: FactSet): DimensionScore {
    const allFacts = facts.getAllFacts();
    const evidence: string[] = [];
    const gaps: string[] = [];

    let rawScore = 5; // Default middle score

    switch (dimension) {
      case 'academics':
        rawScore = this.scoreAcademics(allFacts, evidence, gaps);
        break;
      case 'extracurriculars':
        rawScore = this.scoreExtracurriculars(allFacts, evidence, gaps);
        break;
      case 'recognition':
        rawScore = this.scoreRecognition(allFacts, evidence, gaps);
        break;
      case 'leadership':
        rawScore = this.scoreLeadership(allFacts, evidence, gaps);
        break;
      case 'community_service':
        rawScore = this.scoreCommunityService(allFacts, evidence, gaps);
        break;
      case 'personal_initiative':
        rawScore = this.scorePersonalInitiative(allFacts, evidence, gaps);
        break;
      case 'passion_narrative':
        rawScore = this.scorePassionNarrative(allFacts, evidence, gaps);
        break;
      case 'recommendations':
        rawScore = this.scoreRecommendations(allFacts, evidence, gaps);
        break;
      case 'essays':
        rawScore = this.scoreEssays(allFacts, evidence, gaps);
        break;
    }

    const weight = this.DIMENSION_WEIGHTS[dimension];
    const weightedScore = rawScore * weight;

    return {
      dimension,
      raw_score: rawScore,
      weight,
      weighted_score: weightedScore,
      evidence,
      gaps,
    };
  }

  /**
   * Score Academics dimension
   */
  private scoreAcademics(facts: any[], evidence: string[], gaps: string[]): number {
    let score = 5;

    // Check for GPA
    const gpaFact = facts.find(f => JSON.stringify(f).toLowerCase().includes('gpa'));
    if (gpaFact) {
      const gpaMatch = JSON.stringify(gpaFact).match(/(\d\.\d+)/);
      if (gpaMatch) {
        const gpa = parseFloat(gpaMatch[1]);
        if (gpa >= 3.9) {
          score += 2;
          evidence.push(`Strong GPA: ${gpa}`);
        } else if (gpa >= 3.7) {
          score += 1;
          evidence.push(`Good GPA: ${gpa}`);
        } else {
          gaps.push(`GPA below 3.7 (current: ${gpa})`);
        }
      }
    } else {
      gaps.push('GPA not provided');
    }

    // Check for AP/IB courses
    const rigorFact = facts.find(f => JSON.stringify(f).toLowerCase().includes('ap') || JSON.stringify(f).toLowerCase().includes('honors'));
    if (rigorFact) {
      score += 1;
      evidence.push('Taking rigorous courses (AP/Honors)');
    } else {
      gaps.push('No AP/Honors courses mentioned');
    }

    // Check for test scores
    const testFact = facts.find(f => JSON.stringify(f).toLowerCase().includes('sat') || JSON.stringify(f).toLowerCase().includes('act'));
    if (testFact) {
      score += 1;
      evidence.push('Standardized test scores provided');
    } else {
      gaps.push('No standardized test scores');
    }

    return Math.min(10, Math.max(0, score));
  }

  /**
   * Score Extracurriculars dimension
   */
  private scoreExtracurriculars(facts: any[], evidence: string[], gaps: string[]): number {
    let score = 5;

    const activityCount = facts.filter(f =>
      f.category === 'ACTIVITY_DATA' ||
      JSON.stringify(f).toLowerCase().includes('activity') ||
      JSON.stringify(f).toLowerCase().includes('club')
    ).length;

    if (activityCount >= 5) {
      score += 2;
      evidence.push(`${activityCount} activities (strong breadth)`);
    } else if (activityCount >= 3) {
      score += 1;
      evidence.push(`${activityCount} activities`);
    } else {
      gaps.push(`Only ${activityCount} activities (need 3-5)`);
    }

    // Check for depth/consistency
    const deepActivity = facts.find(f =>
      JSON.stringify(f).toLowerCase().includes('years') ||
      JSON.stringify(f).toLowerCase().includes('founded') ||
      JSON.stringify(f).toLowerCase().includes('president')
    );
    if (deepActivity) {
      score += 2;
      evidence.push('Deep commitment in key activities');
    } else {
      gaps.push('Lacks depth/leadership in activities');
    }

    return Math.min(10, Math.max(0, score));
  }

  /**
   * Score Recognition dimension
   */
  private scoreRecognition(facts: any[], evidence: string[], gaps: string[]): number {
    let score = 4; // Start lower - awards are harder

    const awardCount = facts.filter(f =>
      JSON.stringify(f).toLowerCase().includes('award') ||
      JSON.stringify(f).toLowerCase().includes('competition') ||
      JSON.stringify(f).toLowerCase().includes('winner') ||
      JSON.stringify(f).toLowerCase().includes('finalist')
    ).length;

    if (awardCount >= 3) {
      score += 3;
      evidence.push(`${awardCount} awards/recognitions`);
    } else if (awardCount >= 1) {
      score += 2;
      evidence.push(`${awardCount} awards`);
    } else {
      gaps.push('No major awards or recognitions');
    }

    // Check for national-level
    const nationalAward = facts.find(f =>
      JSON.stringify(f).toLowerCase().includes('national') ||
      JSON.stringify(f).toLowerCase().includes('international')
    );
    if (nationalAward) {
      score += 2;
      evidence.push('National/international recognition');
    }

    return Math.min(10, Math.max(0, score));
  }

  /**
   * Score Leadership dimension
   */
  private scoreLeadership(facts: any[], evidence: string[], gaps: string[]): number {
    let score = 5;

    const leadershipRoles = facts.filter(f =>
      JSON.stringify(f).toLowerCase().includes('president') ||
      JSON.stringify(f).toLowerCase().includes('captain') ||
      JSON.stringify(f).toLowerCase().includes('founder') ||
      JSON.stringify(f).toLowerCase().includes('leader')
    ).length;

    if (leadershipRoles >= 2) {
      score += 2;
      evidence.push(`${leadershipRoles} leadership roles`);
    } else if (leadershipRoles >= 1) {
      score += 1;
      evidence.push(`${leadershipRoles} leadership role`);
    } else {
      gaps.push('No formal leadership positions');
    }

    return Math.min(10, Math.max(0, score));
  }

  /**
   * Score Community Service dimension
   */
  private scoreCommunityService(facts: any[], evidence: string[], gaps: string[]): number {
    let score = 5;

    const serviceActivities = facts.filter(f =>
      JSON.stringify(f).toLowerCase().includes('volunteer') ||
      JSON.stringify(f).toLowerCase().includes('service') ||
      JSON.stringify(f).toLowerCase().includes('community')
    ).length;

    if (serviceActivities >= 2) {
      score += 2;
      evidence.push(`${serviceActivities} service activities`);
    } else if (serviceActivities >= 1) {
      score += 1;
      evidence.push(`${serviceActivities} service activity`);
    } else {
      gaps.push('Limited community service');
    }

    return Math.min(10, Math.max(0, score));
  }

  /**
   * Score Personal Initiative dimension
   */
  private scorePersonalInitiative(facts: any[], evidence: string[], gaps: string[]): number {
    let score = 5;

    const initiativeFacts = facts.filter(f =>
      JSON.stringify(f).toLowerCase().includes('founded') ||
      JSON.stringify(f).toLowerCase().includes('created') ||
      JSON.stringify(f).toLowerCase().includes('built') ||
      JSON.stringify(f).toLowerCase().includes('started')
    ).length;

    if (initiativeFacts >= 2) {
      score += 3;
      evidence.push('Strong personal initiative (founded/created projects)');
    } else if (initiativeFacts >= 1) {
      score += 2;
      evidence.push('Demonstrated personal initiative');
    } else {
      gaps.push('No evidence of self-directed projects');
    }

    return Math.min(10, Math.max(0, score));
  }

  /**
   * Score Passion/Narrative dimension
   */
  private scorePassionNarrative(facts: any[], evidence: string[], gaps: string[]): number {
    let score = 5;

    const narrativeFacts = facts.filter(f =>
      f.category === 'ASSESSMENT_DATA' ||
      JSON.stringify(f).toLowerCase().includes('identity') ||
      JSON.stringify(f).toLowerCase().includes('passion') ||
      JSON.stringify(f).toLowerCase().includes('narrative')
    ).length;

    if (narrativeFacts >= 3) {
      score += 2;
      evidence.push('Clear identity and narrative thread');
    } else if (narrativeFacts >= 1) {
      score += 1;
      evidence.push('Some narrative elements present');
    } else {
      gaps.push('Narrative/identity not yet defined');
    }

    return Math.min(10, Math.max(0, score));
  }

  /**
   * Score Recommendations dimension
   */
  private scoreRecommendations(facts: any[], evidence: string[], gaps: string[]): number {
    // Placeholder - would need teacher relationship data
    const score = 6; // Default good score
    evidence.push('Recommendations quality to be assessed');
    return score;
  }

  /**
   * Score Essays dimension
   */
  private scoreEssays(facts: any[], evidence: string[], gaps: string[]): number {
    // Placeholder - would need essay drafts
    const score = 6; // Default good score
    evidence.push('Essays quality to be assessed');
    return score;
  }

  // ==========================================================================
  // SCORE CALCULATION & ANALYSIS
  // ==========================================================================

  /**
   * Calculate weighted IvyScore
   */
  private calculateIvyScore(dimensionScores: DimensionScore[]): number {
    const totalWeightedScore = dimensionScores.reduce((sum, ds) => sum + ds.weighted_score, 0);
    const maxPossibleScore = dimensionScores.reduce((sum, ds) => sum + (10 * ds.weight), 0);

    return (totalWeightedScore / maxPossibleScore) * 100;
  }

  /**
   * Determine competitiveness tier
   */
  private determineCompetitivenessTier(ivyScore: number): CompetitivenessTier {
    if (ivyScore >= this.TIER_THRESHOLDS.Elite) return 'Elite';
    if (ivyScore >= this.TIER_THRESHOLDS.Strong) return 'Strong';
    if (ivyScore >= this.TIER_THRESHOLDS.Competitive) return 'Competitive';
    return 'Developing';
  }

  /**
   * Identify top strengths
   */
  private identifyTopStrengths(dimensionScores: DimensionScore[]): Array<{ dimension: string; score: number; rationale: string }> {
    return dimensionScores
      .filter(ds => ds.raw_score >= 7)
      .sort((a, b) => b.raw_score - a.raw_score)
      .slice(0, 3)
      .map(ds => ({
        dimension: ds.dimension,
        score: ds.raw_score,
        rationale: ds.evidence.join('; '),
      }));
  }

  /**
   * Identify critical gaps
   */
  private identifyCriticalGaps(dimensionScores: DimensionScore[]): Array<{ dimension: string; score: number; gap: string }> {
    return dimensionScores
      .filter(ds => ds.raw_score < 6)
      .sort((a, b) => a.raw_score - b.raw_score)
      .map(ds => ({
        dimension: ds.dimension,
        score: ds.raw_score,
        gap: ds.gaps.join('; '),
      }));
  }

  /**
   * Calculate peer comparison
   */
  private calculatePeerComparison(ivyScore: number): { vs_ivy_admits: string; vs_grade_level: string } {
    // Simplified - would use real admission data
    let vsIvyAdmits = 'Below average';
    let vsGradeLevel = 'Average';

    if (ivyScore >= 85) {
      vsIvyAdmits = 'Competitive';
      vsGradeLevel = 'Top 5%';
    } else if (ivyScore >= 75) {
      vsIvyAdmits = 'Reach but possible';
      vsGradeLevel = 'Top 15%';
    }

    return { vs_ivy_admits: vsIvyAdmits, vs_grade_level: vsGradeLevel };
  }

  /**
   * Calculate score trajectory
   */
  private calculateScoreTrajectory(dimensionScores: DimensionScore[], currentScore: number): {
    current: number;
    potential_max: number;
    growth_opportunity: number;
  } {
    // Calculate potential if all dimensions at 8+ (realistic max)
    const potentialScores = dimensionScores.map(ds => ({
      ...ds,
      raw_score: Math.max(ds.raw_score, 8),
      weighted_score: Math.max(ds.raw_score, 8) * ds.weight,
    }));

    const potentialMax = this.calculateIvyScore(potentialScores);
    const growthOpportunity = potentialMax - currentScore;

    return {
      current: currentScore,
      potential_max: potentialMax,
      growth_opportunity: growthOpportunity,
    };
  }

  /**
   * Generate next actions
   */
  private generateNextActions(
    criticalGaps: Array<{ dimension: string; score: number; gap: string }>,
    scoreTrajectory: { current: number; potential_max: number; growth_opportunity: number }
  ): string[] {
    const actions: string[] = [];

    if (criticalGaps.length > 0) {
      actions.push(`🎯 PRIORITY: Address ${criticalGaps.length} critical gaps to boost IvyScore`);
      const topGap = criticalGaps[0];
      actions.push(`Start with ${topGap.dimension}: ${topGap.gap}`);
    }

    if (scoreTrajectory.growth_opportunity >= 10) {
      actions.push(`📈 Growth potential: +${scoreTrajectory.growth_opportunity.toFixed(0)} points possible → target ${scoreTrajectory.potential_max.toFixed(0)}`);
    }

    return actions;
  }
}

/**
 * TYPE-085: Rubric Scoring Engine Intelligence
 *
 * Purpose: Calculate Jenny's 5-dimension rubric scores from conversation data
 * extracted by Assessment Agent during early assessment phase.
 *
 * Framework: 5-Dimension Rubric (Jenny's Real Model from W001-W093)
 * - Academics (0-10): GPA, AP/IB rigor, test scores
 * - Leadership (0-10): Formal titles, influence scope, depth
 * - Service (0-10): Hours, impact, consistency
 * - Artifacts (0-10): Tangible outputs, complexity, validation
 * - Recognition (0-10): Awards, competitions, prestige
 *
 * Baseline Example (Huda W001): 14/50
 * - Academics: 5/10 (GPA 4.3, 11/18 APs)
 * - Leadership: 2/10 (P0 gap - largest upside)
 * - Service: 2/10
 * - Artifacts: 4/10
 * - Recognition: 1/10 (P0 gap - largest upside)
 *
 * Data Source: W001-REALITY_CHECK-003 intelligence chip
 * "Hidden rubric math across 5 dimensions (academics, leadership, service, artifacts, recognition).
 *  Baseline 14/50 with largest upside in leadership (2/10) and recognition (1/10)."
 *
 * Created: 2025-11-04
 * Version: v29.1 - Rubric Scoring Architecture
 */

import { IntelligenceType, IntelligenceResult, AgentQuery, FactSet, FactCategory } from './BaseIntelligenceType.js';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Rubric Dimension (5-dimension model from Jenny's coaching)
 */
export type RubricDimension = 'academics' | 'leadership' | 'service' | 'artifacts' | 'recognition';

/**
 * Dimension Score with evidence and gaps
 */
export interface DimensionScore {
  dimension: RubricDimension;
  raw_score: number; // 0-10
  evidence: string[]; // What contributed to this score
  gaps: string[]; // What's missing to reach target
  confidence: number; // 0-1 (how confident is this score based on data collected)
}

/**
 * Complete Rubric Scoring Result
 */
export interface RubricScoringResult {
  student_id: string;
  total_score: number; // 0-50 (sum of 5 dimensions)
  dimension_scores: DimensionScore[];
  data_completeness: number; // 0-1 (% of data collected for full assessment)
  scoring_confidence: number; // 0-1 (overall confidence in scores)
  timestamp: Date;
}

// ============================================================================
// RUBRIC SCORING ENGINE
// ============================================================================

export class RubricScoringEngine implements IntelligenceType {
  type_id = 'TYPE-085';
  name = 'Rubric Scoring Engine';
  category: 'UNIVERSAL' | 'DOMAIN_SPECIFIC' = 'DOMAIN_SPECIFIC';
  description = 'Calculates Jenny\'s 5-dimension rubric scores from conversation data';

  components = {
    framework: {
      name: '5-Dimension Rubric (Jenny\'s Real Model)',
      description: 'Holistic assessment across academics, leadership, service, artifacts, recognition',
      mental_model: 'Where is the student NOW vs. where they need to be for Ivy+ admissions',
    },
    tactics: [
      {
        name: 'Conversational Extraction Scoring',
        description: 'Score dimensions based on data extracted from conversation',
        steps: [
          'Extract relevant facts for each dimension from FactSet',
          'Apply Jenny\'s scoring rubric (0-10 per dimension)',
          'Document evidence used for each score',
          'Identify gaps vs. Ivy+ benchmarks',
          'Calculate confidence based on data completeness',
        ],
      },
    ],
    techniques: [],
    chips: [],
    metrics: {
      success_criteria: [
        'All 5 dimensions scored',
        'Evidence documented per dimension',
        'Gaps identified for each dimension',
        'Confidence calculated based on data available',
      ],
      validation: 'Rubric scores match Jenny\'s manual assessment patterns from W001-W093',
    },
    triggers: {
      conditions: ['assessment', 'rubric', 'score', 'evaluate', 'baseline'],
    },
  };

  // ==========================================================================
  // MAIN INTELLIGENCE INTERFACE
  // ==========================================================================

  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {
    const studentId = query.entity_id;

    console.log(`[TYPE-085] Starting rubric scoring for ${studentId}`);
    console.log(`[TYPE-085] Total facts available: ${facts.getAllFacts().length}`);

    // Score all 5 dimensions
    const dimensionScores: DimensionScore[] = [
      this.scoreAcademics(facts),
      this.scoreLeadership(facts),
      this.scoreService(facts),
      this.scoreArtifacts(facts),
      this.scoreRecognition(facts),
    ];

    // Calculate total score (sum of all dimensions)
    const totalScore = dimensionScores.reduce((sum, ds) => sum + ds.raw_score, 0);

    // Calculate data completeness (how much data do we have vs. ideal)
    const dataCompleteness = this.calculateDataCompleteness(facts);

    // Calculate overall scoring confidence (average of dimension confidences)
    const scoringConfidence = dimensionScores.reduce((sum, ds) => sum + ds.confidence, 0) / dimensionScores.length;

    const result: RubricScoringResult = {
      student_id: studentId,
      total_score: totalScore,
      dimension_scores: dimensionScores,
      data_completeness: dataCompleteness,
      scoring_confidence: scoringConfidence,
      timestamp: new Date(),
    };

    console.log(`[TYPE-085] Rubric Scoring Complete:`, {
      total_score: `${totalScore}/50`,
      academics: dimensionScores[0].raw_score,
      leadership: dimensionScores[1].raw_score,
      service: dimensionScores[2].raw_score,
      artifacts: dimensionScores[3].raw_score,
      recognition: dimensionScores[4].raw_score,
      confidence: `${(scoringConfidence * 100).toFixed(0)}%`,
      data_completeness: `${(dataCompleteness * 100).toFixed(0)}%`,
    });

    return {
      type_id: this.type_id,
      component: 'rubric_scoring_engine',
      triggered: true,
      confidence: scoringConfidence,
      data: result,
    };
  }

  // ==========================================================================
  // DIMENSION SCORING (Jenny's Real Formulas from Intelligence Chips)
  // ==========================================================================

  /**
   * Score Academics (0-10)
   *
   * Formula from W001 intelligence chips:
   * - Base: 3 points
   * - GPA 3.9+: +2 points
   * - GPA 3.7-3.9: +1 point
   * - AP/IB courses 8+: +2 points
   * - AP/IB courses 5-7: +1 point
   * - Test scores (SAT 1500+/ACT 34+): +2 points
   */
  private scoreAcademics(facts: FactSet): DimensionScore {
    const allFacts = facts.getAllFacts();
    const evidence: string[] = [];
    const gaps: string[] = [];
    let score = 3; // Base score
    let confidence = 0.5; // Start with medium confidence

    console.log(`[TYPE-085] Scoring Academics dimension`);

    // Check GPA
    const gpaFact = allFacts.find(f =>
      f.category === FactCategory.STUDENT_PROFILE &&
      typeof f.value === 'object' &&
      f.value !== null &&
      ('gpa' in f.value || 'gpa_weighted' in f.value)
    );

    if (gpaFact && typeof gpaFact.value === 'object' && gpaFact.value !== null) {
      const gpa = (gpaFact.value as any).gpa || (gpaFact.value as any).gpa_weighted;
      if (typeof gpa === 'number') {
        confidence += 0.2;
        if (gpa >= 3.9) {
          score += 2;
          evidence.push(`Strong GPA: ${gpa}/4.0`);
        } else if (gpa >= 3.7) {
          score += 1;
          evidence.push(`Good GPA: ${gpa}/4.0`);
        } else if (gpa >= 3.5) {
          evidence.push(`GPA: ${gpa}/4.0`);
        } else {
          gaps.push(`GPA below 3.7 (current: ${gpa})`);
        }
      }
    } else {
      gaps.push('GPA not yet provided');
    }

    // Check AP/IB course rigor
    const apCount = this.countAPCourses(allFacts);
    if (apCount > 0) {
      confidence += 0.15;
      if (apCount >= 8) {
        score += 2;
        evidence.push(`Strong AP rigor: ${apCount}+ AP courses`);
      } else if (apCount >= 5) {
        score += 1;
        evidence.push(`Good AP rigor: ${apCount} AP courses`);
      } else {
        evidence.push(`${apCount} AP courses`);
        gaps.push(`Only ${apCount} APs (target: 8+ for top colleges)`);
      }
    } else {
      gaps.push('AP/IB course count not yet determined');
    }

    // Check test scores
    const testScore = this.extractTestScore(allFacts);
    if (testScore) {
      confidence += 0.15;
      if (testScore.sat && testScore.sat >= 1500) {
        score += 2;
        evidence.push(`Strong SAT: ${testScore.sat}`);
      } else if (testScore.act && testScore.act >= 34) {
        score += 2;
        evidence.push(`Strong ACT: ${testScore.act}`);
      } else if (testScore.sat && testScore.sat >= 1400) {
        score += 1;
        evidence.push(`Good SAT: ${testScore.sat}`);
      } else if (testScore.act && testScore.act >= 32) {
        score += 1;
        evidence.push(`Good ACT: ${testScore.act}`);
      }
    } else {
      gaps.push('Standardized test scores not yet provided');
    }

    const finalScore = Math.min(10, Math.max(0, score));
    console.log(`[TYPE-085] Academics score: ${finalScore}/10 (confidence: ${confidence.toFixed(2)})`);

    return {
      dimension: 'academics',
      raw_score: finalScore,
      evidence,
      gaps,
      confidence: Math.min(1, confidence),
    };
  }

  /**
   * Score Leadership (0-10)
   *
   * Formula from W001 intelligence chips:
   * - Base: 1 point
   * - Founder of organization: +3 points
   * - President/Captain: +2 points
   * - Vice President/Officer: +1 point
   * - Multi-year commitment (2+ years): +2 points
   * - Scope: school-level: +1, regional: +2, national: +3
   */
  private scoreLeadership(facts: FactSet): DimensionScore {
    const allFacts = facts.getAllFacts();
    const evidence: string[] = [];
    const gaps: string[] = [];
    let score = 1; // Base score
    let confidence = 0.5;

    console.log(`[TYPE-085] Scoring Leadership dimension`);

    // Check for leadership roles
    const leadershipRoles = allFacts.filter(f =>
      JSON.stringify(f).toLowerCase().includes('president') ||
      JSON.stringify(f).toLowerCase().includes('captain') ||
      JSON.stringify(f).toLowerCase().includes('founder') ||
      JSON.stringify(f).toLowerCase().includes('leader') ||
      JSON.stringify(f).toLowerCase().includes('officer')
    );

    if (leadershipRoles.length > 0) {
      confidence += 0.3;

      // Check for founder (highest tier)
      const isFounder = leadershipRoles.some(f => JSON.stringify(f).toLowerCase().includes('founder'));
      if (isFounder) {
        score += 3;
        evidence.push('Founded organization (highest leadership tier)');
      }

      // Check for president/captain
      const isPresident = leadershipRoles.some(f =>
        JSON.stringify(f).toLowerCase().includes('president') ||
        JSON.stringify(f).toLowerCase().includes('captain')
      );
      if (isPresident && !isFounder) {
        score += 2;
        evidence.push('President/Captain role');
      }

      // Check for officer/VP
      const isOfficer = leadershipRoles.some(f =>
        JSON.stringify(f).toLowerCase().includes('officer') ||
        JSON.stringify(f).toLowerCase().includes('vice')
      );
      if (isOfficer && !isPresident && !isFounder) {
        score += 1;
        evidence.push('Officer/Vice President role');
      }

      // Check for multi-year commitment
      const hasMultiYear = leadershipRoles.some(f =>
        JSON.stringify(f).toLowerCase().includes('years') ||
        JSON.stringify(f).toLowerCase().includes('2+') ||
        JSON.stringify(f).toLowerCase().includes('3+')
      );
      if (hasMultiYear) {
        score += 2;
        evidence.push('Multi-year leadership commitment');
      }

      // Check scope (national > regional > school)
      const isNational = leadershipRoles.some(f =>
        JSON.stringify(f).toLowerCase().includes('national') ||
        JSON.stringify(f).toLowerCase().includes('international')
      );
      const isRegional = leadershipRoles.some(f =>
        JSON.stringify(f).toLowerCase().includes('regional') ||
        JSON.stringify(f).toLowerCase().includes('state')
      );

      if (isNational) {
        score += 3;
        evidence.push('National/international scope');
      } else if (isRegional) {
        score += 2;
        evidence.push('Regional scope');
      } else {
        score += 1;
        evidence.push('School-level scope');
      }
    } else {
      gaps.push('No formal leadership positions identified');
      gaps.push('Target: President/Captain/Founder role with multi-year commitment');
    }

    const finalScore = Math.min(10, Math.max(0, score));
    console.log(`[TYPE-085] Leadership score: ${finalScore}/10 (confidence: ${confidence.toFixed(2)})`);

    return {
      dimension: 'leadership',
      raw_score: finalScore,
      evidence,
      gaps,
      confidence: Math.min(1, confidence),
    };
  }

  /**
   * Score Service (0-10)
   *
   * Formula from W001 intelligence chips:
   * - Base: 1 point
   * - 100+ hours: +3 points
   * - 50-100 hours: +2 points
   * - Consistent (2+ years): +2 points
   * - Impact documented: +2 points
   * - Leadership in service: +1 point
   */
  private scoreService(facts: FactSet): DimensionScore {
    const allFacts = facts.getAllFacts();
    const evidence: string[] = [];
    const gaps: string[] = [];
    let score = 1; // Base score
    let confidence = 0.5;

    console.log(`[TYPE-085] Scoring Service dimension`);

    // Check for service activities
    const serviceActivities = allFacts.filter(f =>
      JSON.stringify(f).toLowerCase().includes('volunteer') ||
      JSON.stringify(f).toLowerCase().includes('service') ||
      JSON.stringify(f).toLowerCase().includes('community')
    );

    if (serviceActivities.length > 0) {
      confidence += 0.3;
      evidence.push(`${serviceActivities.length} service activities identified`);

      // Check for hours (extract from text)
      const hoursMatch = JSON.stringify(serviceActivities).match(/(\d+)\s*hours/i);
      if (hoursMatch) {
        const hours = parseInt(hoursMatch[1], 10);
        if (hours >= 100) {
          score += 3;
          evidence.push(`${hours}+ hours of service (excellent)`);
        } else if (hours >= 50) {
          score += 2;
          evidence.push(`${hours} hours of service (good)`);
        }
      } else {
        gaps.push('Service hours not yet quantified');
      }

      // Check for consistency
      const isConsistent = serviceActivities.some(f =>
        JSON.stringify(f).toLowerCase().includes('years') ||
        JSON.stringify(f).toLowerCase().includes('ongoing') ||
        JSON.stringify(f).toLowerCase().includes('consistent')
      );
      if (isConsistent) {
        score += 2;
        evidence.push('Consistent service commitment (2+ years)');
      }

      // Check for documented impact
      const hasImpact = serviceActivities.some(f =>
        JSON.stringify(f).toLowerCase().includes('impact') ||
        JSON.stringify(f).toLowerCase().includes('helped') ||
        JSON.stringify(f).toLowerCase().includes('benefited')
      );
      if (hasImpact) {
        score += 2;
        evidence.push('Documented service impact');
      }

      // Check for leadership in service
      const hasLeadership = serviceActivities.some(f =>
        JSON.stringify(f).toLowerCase().includes('lead') ||
        JSON.stringify(f).toLowerCase().includes('organize') ||
        JSON.stringify(f).toLowerCase().includes('coordinate')
      );
      if (hasLeadership) {
        score += 1;
        evidence.push('Leadership role in service');
      }
    } else {
      gaps.push('No community service activities identified');
      gaps.push('Target: 100+ hours with documented impact and consistency');
    }

    const finalScore = Math.min(10, Math.max(0, score));
    console.log(`[TYPE-085] Service score: ${finalScore}/10 (confidence: ${confidence.toFixed(2)})`);

    return {
      dimension: 'service',
      raw_score: finalScore,
      evidence,
      gaps,
      confidence: Math.min(1, confidence),
    };
  }

  /**
   * Score Artifacts (0-10)
   *
   * Formula from W001 intelligence chips:
   * - Base: 1 point
   * - Published/deployed project: +3 points
   * - Complex project (app/research/film): +2 points
   * - Multiple artifacts: +1 per additional
   * - External validation (users/citations/views): +2 points
   */
  private scoreArtifacts(facts: FactSet): DimensionScore {
    const allFacts = facts.getAllFacts();
    const evidence: string[] = [];
    const gaps: string[] = [];
    let score = 1; // Base score
    let confidence = 0.5;

    console.log(`[TYPE-085] Scoring Artifacts dimension`);

    // Check for projects/artifacts
    const artifacts = allFacts.filter(f =>
      JSON.stringify(f).toLowerCase().includes('project') ||
      JSON.stringify(f).toLowerCase().includes('app') ||
      JSON.stringify(f).toLowerCase().includes('website') ||
      JSON.stringify(f).toLowerCase().includes('research') ||
      JSON.stringify(f).toLowerCase().includes('film') ||
      JSON.stringify(f).toLowerCase().includes('built') ||
      JSON.stringify(f).toLowerCase().includes('created')
    );

    if (artifacts.length > 0) {
      confidence += 0.3;

      // Check for published/deployed
      const isPublished = artifacts.some(f =>
        JSON.stringify(f).toLowerCase().includes('published') ||
        JSON.stringify(f).toLowerCase().includes('deployed') ||
        JSON.stringify(f).toLowerCase().includes('live') ||
        JSON.stringify(f).toLowerCase().includes('released')
      );
      if (isPublished) {
        score += 3;
        evidence.push('Published/deployed project');
      }

      // Check for complexity
      const isComplex = artifacts.some(f =>
        JSON.stringify(f).toLowerCase().includes('app') ||
        JSON.stringify(f).toLowerCase().includes('research') ||
        JSON.stringify(f).toLowerCase().includes('film') ||
        JSON.stringify(f).toLowerCase().includes('algorithm') ||
        JSON.stringify(f).toLowerCase().includes('ml') ||
        JSON.stringify(f).toLowerCase().includes('ai')
      );
      if (isComplex) {
        score += 2;
        evidence.push('Complex technical/creative project');
      }

      // Multiple artifacts
      if (artifacts.length > 1) {
        score += Math.min(2, artifacts.length - 1);
        evidence.push(`${artifacts.length} artifacts created`);
      }

      // External validation
      const hasValidation = artifacts.some(f =>
        JSON.stringify(f).toLowerCase().includes('users') ||
        JSON.stringify(f).toLowerCase().includes('citations') ||
        JSON.stringify(f).toLowerCase().includes('views') ||
        JSON.stringify(f).toLowerCase().includes('downloads')
      );
      if (hasValidation) {
        score += 2;
        evidence.push('External validation (users/citations/engagement)');
      }
    } else {
      gaps.push('No tangible artifacts/projects identified');
      gaps.push('Target: Published project with external validation');
    }

    const finalScore = Math.min(10, Math.max(0, score));
    console.log(`[TYPE-085] Artifacts score: ${finalScore}/10 (confidence: ${confidence.toFixed(2)})`);

    return {
      dimension: 'artifacts',
      raw_score: finalScore,
      evidence,
      gaps,
      confidence: Math.min(1, confidence),
    };
  }

  /**
   * Score Recognition (0-10)
   *
   * Formula from W001 intelligence chips:
   * - Base: 0 points (awards are earned, not assumed)
   * - National/International award: +4 points
   * - Regional award: +2 points
   * - School award: +1 point
   * - Competition finalist: +2 points
   * - Multiple awards: +1 per additional
   */
  private scoreRecognition(facts: FactSet): DimensionScore {
    const allFacts = facts.getAllFacts();
    const evidence: string[] = [];
    const gaps: string[] = [];
    let score = 0; // Base score (awards must be earned)
    let confidence = 0.5;

    console.log(`[TYPE-085] Scoring Recognition dimension`);

    // Check for awards/recognition
    const awards = allFacts.filter(f =>
      JSON.stringify(f).toLowerCase().includes('award') ||
      JSON.stringify(f).toLowerCase().includes('competition') ||
      JSON.stringify(f).toLowerCase().includes('winner') ||
      JSON.stringify(f).toLowerCase().includes('finalist') ||
      JSON.stringify(f).toLowerCase().includes('recognition') ||
      JSON.stringify(f).toLowerCase().includes('honor')
    );

    if (awards.length > 0) {
      confidence += 0.4;

      // Check for national/international
      const isNational = awards.some(f =>
        JSON.stringify(f).toLowerCase().includes('national') ||
        JSON.stringify(f).toLowerCase().includes('international') ||
        JSON.stringify(f).toLowerCase().includes('usa')
      );
      if (isNational) {
        score += 4;
        evidence.push('National/international award');
      }

      // Check for regional
      const isRegional = awards.some(f =>
        JSON.stringify(f).toLowerCase().includes('regional') ||
        JSON.stringify(f).toLowerCase().includes('state')
      );
      if (isRegional && !isNational) {
        score += 2;
        evidence.push('Regional award');
      }

      // Check for school-level
      const isSchool = awards.some(f =>
        JSON.stringify(f).toLowerCase().includes('school')
      );
      if (isSchool && !isRegional && !isNational) {
        score += 1;
        evidence.push('School-level award');
      }

      // Competition finalist
      const isFinalist = awards.some(f =>
        JSON.stringify(f).toLowerCase().includes('finalist') ||
        JSON.stringify(f).toLowerCase().includes('semifinalist')
      );
      if (isFinalist) {
        score += 2;
        evidence.push('Competition finalist');
      }

      // Multiple awards
      if (awards.length > 1) {
        score += Math.min(3, awards.length - 1);
        evidence.push(`${awards.length} awards/recognitions`);
      }
    } else {
      gaps.push('No major awards or recognitions identified');
      gaps.push('Target: National/regional awards in area of passion');
    }

    const finalScore = Math.min(10, Math.max(0, score));
    console.log(`[TYPE-085] Recognition score: ${finalScore}/10 (confidence: ${confidence.toFixed(2)})`);

    return {
      dimension: 'recognition',
      raw_score: finalScore,
      evidence,
      gaps,
      confidence: Math.min(1, confidence),
    };
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Count AP/IB courses from facts
   */
  private countAPCourses(facts: any[]): number {
    const apFacts = facts.filter(f =>
      JSON.stringify(f).toLowerCase().includes('ap ') ||
      JSON.stringify(f).toLowerCase().includes('ib ') ||
      JSON.stringify(f).toLowerCase().includes('advanced placement')
    );

    if (apFacts.length === 0) return 0;

    // Try to extract count from text (e.g., "11 AP courses", "taking 5 APs")
    const countMatch = JSON.stringify(apFacts).match(/(\d+)\s*(ap|ib)/i);
    if (countMatch) {
      return parseInt(countMatch[1], 10);
    }

    // Count individual AP mentions as fallback
    return apFacts.length;
  }

  /**
   * Extract test scores (SAT/ACT) from facts
   */
  private extractTestScore(facts: any[]): { sat?: number; act?: number } | null {
    const testFacts = facts.filter(f =>
      JSON.stringify(f).toLowerCase().includes('sat') ||
      JSON.stringify(f).toLowerCase().includes('act')
    );

    if (testFacts.length === 0) return null;

    const result: { sat?: number; act?: number } = {};

    // Extract SAT score
    const satMatch = JSON.stringify(testFacts).match(/sat[:\s]+(\d{4})/i);
    if (satMatch) {
      result.sat = parseInt(satMatch[1], 10);
    }

    // Extract ACT score
    const actMatch = JSON.stringify(testFacts).match(/act[:\s]+(\d{1,2})/i);
    if (actMatch) {
      result.act = parseInt(actMatch[1], 10);
    }

    return Object.keys(result).length > 0 ? result : null;
  }

  /**
   * Calculate data completeness (how much data collected vs. ideal for full assessment)
   */
  private calculateDataCompleteness(facts: FactSet): number {
    const allFacts = facts.getAllFacts();
    const requiredDataPoints = [
      'grade',
      'school',
      'gpa',
      'ap_courses',
      'test_scores',
      'activities',
      'leadership',
      'service',
      'projects',
      'awards',
      'interests',
      'target_major',
      'target_schools',
    ];

    let collectedCount = 0;

    for (const dataPoint of requiredDataPoints) {
      const hasData = allFacts.some(f =>
        JSON.stringify(f).toLowerCase().includes(dataPoint.toLowerCase())
      );
      if (hasData) collectedCount++;
    }

    return collectedCount / requiredDataPoints.length;
  }
}

/**
 * CanonicalFieldMapper
 * v29.2: Universal field mapping utility to prevent field mismatches
 *
 * PROBLEM SOLVED:
 * - Eliminates field name mismatches (total_score vs total_rubric_score)
 * - Provides semantic mapping (leadership → extracurriculars, etc.)
 * - Normalizes scores (0-50 → 0-100)
 * - Single source of truth for all intelligence result extraction
 *
 * Design Doc: docs/agents/ASSESSMENT_AGENT_TECH_SPEC.md
 */

import { IntelligenceResult } from '../intelligence/types/BaseIntelligenceType.js';

/**
 * RubricDimension: Canonical enum matching TYPE-085 output
 */
export enum RubricDimension {
  ACADEMICS = 'academics',
  LEADERSHIP = 'leadership',
  SERVICE = 'service',
  ARTIFACTS = 'artifacts',
  RECOGNITION = 'recognition',
}

/**
 * ApplicationCategory: Canonical enum matching A2A handover contract
 */
export enum ApplicationCategory {
  ACADEMICS = 'academics',
  EXTRACURRICULARS = 'extracurriculars',
  SUMMER_PROGRAMS = 'summer_programs',
  AWARDS = 'awards',
  ESSAYS = 'essays',
}

/**
 * Canonical Semantic Mapping: Rubric Dimensions → Application Categories
 *
 * This mapping bridges Jenny's 5-dimension coaching rubric with
 * the application review categories used in college admissions.
 */
const SEMANTIC_MAPPING: Record<RubricDimension, ApplicationCategory> = {
  [RubricDimension.ACADEMICS]: ApplicationCategory.ACADEMICS,
  [RubricDimension.LEADERSHIP]: ApplicationCategory.EXTRACURRICULARS,
  [RubricDimension.SERVICE]: ApplicationCategory.SUMMER_PROGRAMS,
  [RubricDimension.RECOGNITION]: ApplicationCategory.AWARDS,
  [RubricDimension.ARTIFACTS]: ApplicationCategory.ESSAYS,
};

/**
 * CanonicalFieldMapper: Universal extraction methods for intelligence results
 *
 * USAGE:
 * ```typescript
 * // In prepareGamePlanHandover():
 * ivy_score: CanonicalFieldMapper.extractIvyScore(intelligenceResults),
 * rubric_scores: CanonicalFieldMapper.extractRubricScores(intelligenceResults),
 * gap_priorities: CanonicalFieldMapper.extractGapPriorities(intelligenceResults),
 * ```
 *
 * GUARANTEES:
 * - Always uses correct field names from TYPE-085/TYPE-086 output
 * - Always applies correct semantic mapping
 * - Always normalizes scores correctly
 * - Returns safe defaults if data missing
 */
export class CanonicalFieldMapper {
  /**
   * Extract IvyScore (0-100) from TYPE-085 RubricScoringEngine
   *
   * v29.2: Correctly extracts total_score (not total_rubric_score)
   * and normalizes from 0-50 scale to 0-100 scale
   *
   * @param intelligenceResults - All intelligence results from current request
   * @returns IvyScore (0-100), or 0 if not available
   */
  static extractIvyScore(intelligenceResults: IntelligenceResult[]): number {
    const rubricScoring = intelligenceResults.find(r => r.type_id === 'TYPE-085');

    if (!rubricScoring || !rubricScoring.triggered) {
      return 0;
    }

    const totalScore = (rubricScoring.data as any)?.total_score;

    if (typeof totalScore !== 'number') {
      return 0;
    }

    // v29.2: Normalize TYPE-085 scale (0-50) → IvyScore scale (0-100)
    // Jenny's rubric: 5 dimensions × 10 points = 50 max
    // IvyScore: 0-100 scale for percentile representation
    return Math.round((totalScore / 50) * 100);
  }

  /**
   * Extract rubric dimension scores with canonical semantic mapping
   *
   * v29.2: Correctly maps rubric dimensions to application categories:
   * - academics → academics (direct mapping)
   * - leadership → extracurriculars (semantic mapping)
   * - service → summer_programs (semantic mapping)
   * - recognition → awards (semantic mapping)
   * - artifacts → essays (semantic mapping)
   *
   * @param intelligenceResults - All intelligence results from current request
   * @returns Rubric scores keyed by application category, with total
   */
  static extractRubricScores(
    intelligenceResults: IntelligenceResult[]
  ): {
    academics: number;
    extracurriculars: number;
    summer_programs: number;
    awards: number;
    essays: number;
    total: number;
  } {
    const rubricScoring = intelligenceResults.find(r => r.type_id === 'TYPE-085');

    if (!rubricScoring || !rubricScoring.triggered) {
      return {
        academics: 0,
        extracurriculars: 0,
        summer_programs: 0,
        awards: 0,
        essays: 0,
        total: 0,
      };
    }

    const dimensionScores = (rubricScoring.data as any)?.dimension_scores || [];
    const totalScore = (rubricScoring.data as any)?.total_score || 0;

    return {
      academics: this.findDimensionScore(dimensionScores, RubricDimension.ACADEMICS),
      extracurriculars: this.findDimensionScore(dimensionScores, RubricDimension.LEADERSHIP),
      summer_programs: this.findDimensionScore(dimensionScores, RubricDimension.SERVICE),
      awards: this.findDimensionScore(dimensionScores, RubricDimension.RECOGNITION),
      essays: this.findDimensionScore(dimensionScores, RubricDimension.ARTIFACTS),
      total: totalScore,
    };
  }

  /**
   * Extract gap priorities (P0/P1/P2) from TYPE-086 GapPriorityAnalyzer
   *
   * v29.2: Correctly extracts prioritized_gaps array
   *
   * @param intelligenceResults - All intelligence results from current request
   * @returns Gap priorities array, or empty array if not available
   */
  static extractGapPriorities(
    intelligenceResults: IntelligenceResult[]
  ): Array<{
    dimension: string;
    current_score: number;
    target_score: number;
    gap_size: number;
    priority: 'P0' | 'P1' | 'P2';
    urgency: string;
    recommended_actions: string[];
  }> {
    const gapAnalysis = intelligenceResults.find(r => r.type_id === 'TYPE-086');

    if (!gapAnalysis || !gapAnalysis.triggered) {
      return [];
    }

    return (gapAnalysis.data as any)?.prioritized_gaps || [];
  }

  /**
   * Helper: Find dimension score from TYPE-085 dimension_scores array
   *
   * @param dimensionScores - Array of {dimension, raw_score, ...} from TYPE-085
   * @param dimension - RubricDimension to find
   * @returns raw_score (0-10), or 0 if not found
   */
  private static findDimensionScore(
    dimensionScores: any[],
    dimension: RubricDimension
  ): number {
    const dimensionData = dimensionScores.find(
      (ds: any) => ds.dimension === dimension
    );

    if (!dimensionData || typeof dimensionData.raw_score !== 'number') {
      return 0;
    }

    return dimensionData.raw_score;
  }

  /**
   * Get semantic mapping for a rubric dimension
   *
   * @param rubricDimension - RubricDimension enum value
   * @returns ApplicationCategory enum value
   */
  static getApplicationCategory(
    rubricDimension: RubricDimension
  ): ApplicationCategory {
    return SEMANTIC_MAPPING[rubricDimension];
  }

  /**
   * Get rubric dimension for an application category (reverse lookup)
   *
   * @param applicationCategory - ApplicationCategory enum value
   * @returns RubricDimension enum value, or null if no mapping
   */
  static getRubricDimension(
    applicationCategory: ApplicationCategory
  ): RubricDimension | null {
    for (const [rubricDim, appCat] of Object.entries(SEMANTIC_MAPPING)) {
      if (appCat === applicationCategory) {
        return rubricDim as RubricDimension;
      }
    }
    return null;
  }
}

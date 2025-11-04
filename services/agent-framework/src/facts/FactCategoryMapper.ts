/**
 * Fact Category Mapper - v28.1
 *
 * Intelligent multi-category fact mapping with:
 * - Automatic category detection from fact types
 * - Hyper-personalization awareness (student-specific vs generalizable)
 * - Persona alignment metadata
 * - Longitudinal tracking support
 * - Quality scoring
 *
 * Design Principles:
 * 1. One fact type → one primary category (clear ownership)
 * 2. Some facts may be duplicated to multiple categories if needed by different personas
 * 3. Student-specific facts flagged for hyper-personalization
 * 4. Longitudinal facts tracked for vulnerability ladder progression
 */

import { FactCategory } from './types.js';
import { CoachingPersona, FactPurpose } from '../a2a/AgentFactRequirements.js';

/**
 * Enhanced fact interface with metadata
 */
export interface EnhancedFact {
  // Core fact data
  fact_type: string;
  category: FactCategory;
  value: any;
  confidence: number; // 0-1

  // Hyper-personalization
  is_student_specific: boolean;
  is_generalizable_pattern: boolean;

  // Persona alignment
  used_by_personas: CoachingPersona[];
  primary_purpose: FactPurpose;

  // Longitudinal tracking
  track_over_time: boolean;
  snapshot_date?: string; // ISO date for time-series

  // Quality
  quality_score: number; // 0-10
  extraction_method: 'user_input' | 'llm_extraction' | 'derived' | 'web_search';

  // Provenance
  source_agent?: string;
  source_session?: string;
  created_at: string;
}

/**
 * Fact type to category mapping
 */
export const FACT_TYPE_TO_CATEGORY: Record<string, FactCategory> = {
  // STUDENT_PROFILE - Identity, demographics, goals
  grade: FactCategory.STUDENT_PROFILE,
  grade_level: FactCategory.STUDENT_PROFILE,
  current_quarter: FactCategory.STUDENT_PROFILE,
  high_school: FactCategory.STUDENT_PROFILE,
  target_major: FactCategory.STUDENT_PROFILE,
  target_field: FactCategory.STUDENT_PROFILE,
  interests: FactCategory.STUDENT_PROFILE,
  personality_type: FactCategory.STUDENT_PROFILE,
  confidence_level: FactCategory.STUDENT_PROFILE,

  // ASSESSMENT_DATA - Coaching intelligence, rubric scores, gaps
  unique_narrative: FactCategory.ASSESSMENT_DATA,
  identity_fusion: FactCategory.ASSESSMENT_DATA,
  rubric_scores: FactCategory.ASSESSMENT_DATA,
  ivy_score: FactCategory.ASSESSMENT_DATA,
  gaps: FactCategory.ASSESSMENT_DATA,
  weak_spots: FactCategory.ASSESSMENT_DATA,
  strengths: FactCategory.ASSESSMENT_DATA,
  potential_indicators: FactCategory.ASSESSMENT_DATA,
  competitiveness_tier: FactCategory.ASSESSMENT_DATA,

  // ACTIVITY_DATA - Current commitments, time allocation
  current_activities: FactCategory.ACTIVITY_DATA,
  extracurriculars: FactCategory.ACTIVITY_DATA,
  time_commitments: FactCategory.ACTIVITY_DATA,
  weekly_hours: FactCategory.ACTIVITY_DATA,
  current_projects: FactCategory.ACTIVITY_DATA,
  leadership_roles: FactCategory.ACTIVITY_DATA,
  time_capacity: FactCategory.ACTIVITY_DATA,

  // GOAL_DATA - Target schools, deadlines, aspirations
  target_schools: FactCategory.GOAL_DATA,
  dream_schools: FactCategory.GOAL_DATA,
  safety_schools: FactCategory.GOAL_DATA,
  application_deadlines: FactCategory.GOAL_DATA,
  scholarship_goals: FactCategory.GOAL_DATA,

  // ACADEMIC_DATA - GPA, courses, test scores
  gpa: FactCategory.ACADEMIC_DATA,
  weighted_gpa: FactCategory.ACADEMIC_DATA,
  unweighted_gpa: FactCategory.ACADEMIC_DATA,
  test_scores: FactCategory.ACADEMIC_DATA,
  sat_score: FactCategory.ACADEMIC_DATA,
  act_score: FactCategory.ACADEMIC_DATA,
  ap_courses: FactCategory.ACADEMIC_DATA,
  honors_courses: FactCategory.ACADEMIC_DATA,
  class_rank: FactCategory.ACADEMIC_DATA,
};

/**
 * Fact type to persona mapping
 */
export const FACT_TYPE_TO_PERSONAS: Record<string, CoachingPersona[]> = {
  // Strategic positioning
  unique_narrative: [CoachingPersona.STRATEGIC_ARCHITECT, CoachingPersona.THERAPIST, CoachingPersona.CONFIDENCE_ALCHEMIST],
  identity_fusion: [CoachingPersona.STRATEGIC_ARCHITECT, CoachingPersona.THERAPIST],
  target_major: [CoachingPersona.STRATEGIC_ARCHITECT, CoachingPersona.NETWORK_CONNECTOR],

  // Hidden calculations
  rubric_scores: [CoachingPersona.ADMISSIONS_OFFICER],
  ivy_score: [CoachingPersona.ADMISSIONS_OFFICER],
  competitiveness_tier: [CoachingPersona.ADMISSIONS_OFFICER],
  target_schools: [CoachingPersona.ADMISSIONS_OFFICER, CoachingPersona.PARENT_WHISPERER],

  // Time planning
  grade: [CoachingPersona.STRATEGIC_ARCHITECT, CoachingPersona.TIME_MATHEMATICIAN],
  current_quarter: [CoachingPersona.TIME_MATHEMATICIAN],
  time_commitments: [CoachingPersona.TIME_MATHEMATICIAN],
  time_capacity: [CoachingPersona.TIME_MATHEMATICIAN],

  // Portfolio building
  current_activities: [CoachingPersona.STRATEGIC_ARCHITECT, CoachingPersona.TIME_MATHEMATICIAN],
  gaps: [CoachingPersona.STRATEGIC_ARCHITECT],
  weak_spots: [CoachingPersona.STRATEGIC_ARCHITECT],

  // Confidence & emotional
  confidence_level: [CoachingPersona.CONFIDENCE_ALCHEMIST, CoachingPersona.THERAPIST],
  personality_type: [CoachingPersona.THERAPIST, CoachingPersona.CONFIDENCE_ALCHEMIST],

  // Network & opportunities
  interests: [CoachingPersona.NETWORK_CONNECTOR, CoachingPersona.STRATEGIC_ARCHITECT],
  leadership_roles: [CoachingPersona.NETWORK_CONNECTOR],
};

/**
 * Fact types that are student-specific (vs generalizable patterns)
 */
export const STUDENT_SPECIFIC_FACT_TYPES = new Set([
  'unique_narrative',
  'identity_fusion',
  'grade',
  'high_school',
  'target_major',
  'target_schools',
  'current_activities',
  'rubric_scores',
  'ivy_score',
  'personality_type',
  'confidence_level',
]);

/**
 * Fact types to track longitudinally (vulnerability ladder, confidence evolution)
 */
export const LONGITUDINAL_FACT_TYPES = new Set([
  'confidence_level',
  'unique_narrative',
  'rubric_scores',
  'ivy_score',
  'current_activities',
  'leadership_roles',
  'gaps',
  'strengths',
]);

/**
 * Fact Category Mapper
 */
export class FactCategoryMapper {
  /**
   * Get primary category for a fact type
   */
  static getCategoryForFactType(fact_type: string): FactCategory {
    return FACT_TYPE_TO_CATEGORY[fact_type] || FactCategory.ASSESSMENT_DATA;
  }

  /**
   * Get personas that use this fact type
   */
  static getPersonasForFactType(fact_type: string): CoachingPersona[] {
    return FACT_TYPE_TO_PERSONAS[fact_type] || [];
  }

  /**
   * Check if fact type is student-specific
   */
  static isStudentSpecific(fact_type: string): boolean {
    return STUDENT_SPECIFIC_FACT_TYPES.has(fact_type);
  }

  /**
   * Check if fact type should be tracked longitudinally
   */
  static shouldTrackOverTime(fact_type: string): boolean {
    return LONGITUDINAL_FACT_TYPES.has(fact_type);
  }

  /**
   * Map assessment response data to multiple categories
   *
   * Returns: Map of FactCategory → EnhancedFact[]
   */
  static mapToCategories(
    data: Record<string, any>,
    student_id: string,
    source_agent: string,
    source_session: string
  ): Map<FactCategory, EnhancedFact[]> {
    const categorized = new Map<FactCategory, EnhancedFact[]>();

    for (const [fact_type, value] of Object.entries(data)) {
      if (value === null || value === undefined) continue;

      // Determine category
      const category = this.getCategoryForFactType(fact_type);

      // Get personas using this fact
      const personas = this.getPersonasForFactType(fact_type);

      // Determine purpose
      const purpose = this.inferPurpose(fact_type);

      // Create enhanced fact
      const enhanced_fact: EnhancedFact = {
        fact_type,
        category,
        value,
        confidence: this.calculateConfidence(fact_type, value),
        is_student_specific: this.isStudentSpecific(fact_type),
        is_generalizable_pattern: !this.isStudentSpecific(fact_type),
        used_by_personas: personas,
        primary_purpose: purpose,
        track_over_time: this.shouldTrackOverTime(fact_type),
        snapshot_date: new Date().toISOString(),
        quality_score: this.calculateQualityScore(fact_type, value),
        extraction_method: 'llm_extraction',
        source_agent,
        source_session,
        created_at: new Date().toISOString(),
      };

      // Add to category
      if (!categorized.has(category)) {
        categorized.set(category, []);
      }
      categorized.get(category)!.push(enhanced_fact);
    }

    return categorized;
  }

  /**
   * Infer purpose from fact type
   */
  private static inferPurpose(fact_type: string): FactPurpose {
    // Hidden calculations (strategic omissions)
    if (['rubric_scores', 'ivy_score', 'competitiveness_tier'].includes(fact_type)) {
      return FactPurpose.HIDDEN_PROBABILITY_CALCULATION;
    }
    if (['target_schools', 'dream_schools'].includes(fact_type)) {
      return FactPurpose.DUAL_LAYER_MESSAGING;
    }
    if (['confidence_level', 'personality_type'].includes(fact_type)) {
      return FactPurpose.CONFIDENCE_CALIBRATION;
    }

    // Visible to student
    if (['grade', 'current_quarter', 'time_capacity'].includes(fact_type)) {
      return FactPurpose.TIMELINE_GENERATION;
    }
    if (['current_activities', 'gaps', 'weak_spots'].includes(fact_type)) {
      return FactPurpose.ACTIVITY_RECOMMENDATION;
    }

    // Portfolio multiplication
    if (['unique_narrative', 'identity_fusion', 'interests'].includes(fact_type)) {
      return FactPurpose.PORTFOLIO_MULTIPLICATION;
    }

    return FactPurpose.DIRECT_RESPONSE;
  }

  /**
   * Calculate confidence score (0-1)
   */
  private static calculateConfidence(fact_type: string, value: any): number {
    // User-provided demographic facts: high confidence
    if (['grade', 'high_school', 'target_major'].includes(fact_type)) {
      return 1.0;
    }

    // LLM-extracted narrative elements: medium-high confidence
    if (['unique_narrative', 'identity_fusion'].includes(fact_type)) {
      return 0.85;
    }

    // Calculated scores: depends on rubric quality
    if (['rubric_scores', 'ivy_score'].includes(fact_type)) {
      return 0.90;
    }

    // Estimated/derived values: lower confidence
    if (['time_capacity', 'competitiveness_tier'].includes(fact_type)) {
      return 0.75;
    }

    return 0.80; // Default
  }

  /**
   * Calculate quality score (0-10)
   */
  private static calculateQualityScore(fact_type: string, value: any): number {
    // Check for empty/trivial values
    if (!value || (typeof value === 'string' && value.trim().length < 5)) {
      return 2;
    }

    // Rich narrative content: high quality
    if (['unique_narrative', 'identity_fusion'].includes(fact_type)) {
      if (typeof value === 'string' && value.length > 100) {
        return 9;
      }
      if (typeof value === 'string' && value.length > 50) {
        return 7;
      }
      return 5;
    }

    // Structured scores: check completeness
    if (['rubric_scores'].includes(fact_type)) {
      if (typeof value === 'object' && Object.keys(value).length >= 5) {
        return 10;
      }
      return 6;
    }

    // Simple demographic facts: always high quality if present
    if (['grade', 'high_school', 'target_major'].includes(fact_type)) {
      return 10;
    }

    // Arrays: quality based on length
    if (Array.isArray(value)) {
      if (value.length >= 3) return 8;
      if (value.length >= 1) return 6;
      return 3;
    }

    return 7; // Default medium-high
  }

  /**
   * Prepare facts for database storage
   */
  static prepareForStorage(
    enhanced_facts: EnhancedFact[],
    student_id: string
  ): Array<{
    student_id: string;
    item_type: string;
    subtype: string;
    data: any;
    metadata: any;
  }> {
    return enhanced_facts.map(fact => ({
      student_id,
      item_type: fact.category,
      subtype: fact.fact_type,
      data: {
        value: fact.value,
        confidence: fact.confidence,
        quality_score: fact.quality_score,
      },
      metadata: {
        is_student_specific: fact.is_student_specific,
        is_generalizable_pattern: fact.is_generalizable_pattern,
        used_by_personas: fact.used_by_personas,
        primary_purpose: fact.primary_purpose,
        track_over_time: fact.track_over_time,
        snapshot_date: fact.snapshot_date,
        extraction_method: fact.extraction_method,
        source_agent: fact.source_agent,
        source_session: fact.source_session,
        created_at: fact.created_at,
      },
    }));
  }

  /**
   * Extract facts from kb_items result for handover
   * v28.1: Handles multi-category storage where facts are in edges JSONB column
   */
  static extractFactsFromKbItems(kb_items: any[]): Map<FactCategory, any[]> {
    const categorized = new Map<FactCategory, any[]>();

    for (const item of kb_items) {
      const category = item.item_type as FactCategory;
      if (!categorized.has(category)) {
        categorized.set(category, []);
      }

      // v28.1: Facts are stored in edges JSONB column
      const edges = item.edges || {};

      // Extract all fields from edges (except v28_metadata)
      for (const [fact_type, value] of Object.entries(edges)) {
        if (fact_type === 'v28_metadata') continue; // Skip metadata

        categorized.get(category)!.push({
          fact_type,
          value,
          confidence: edges.v28_metadata?.confidence || 0.8,
          quality_score: edges.v28_metadata?.quality_score || 7,
          metadata: edges.v28_metadata || {},
        });
      }
    }

    return categorized;
  }
}

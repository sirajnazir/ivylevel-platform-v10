/**
 * HandoverPayloadExtractor: Universal extraction methods for A2A handover payloads
 * v29.3: Part of holistic fix for field mapping issues across all agents
 *
 * Purpose: Single source of truth for extracting intelligence data from handover payloads
 * Pattern: Same universal approach as CanonicalFieldMapper (v29.2)
 *
 * Usage:
 * - GamePlan Agent uses this to extract rubric scores and gaps from Assessment handover
 * - Future agents can use this for their specific handover needs
 *
 * Benefits:
 * - Prevents "reload from database" anti-pattern
 * - Ensures intelligence results are used (not lost)
 * - Universal pattern applicable to all agents
 *
 * Created: 2025-11-04 (v29.3)
 */

import { IntelligenceResult } from '../intelligence/types/BaseIntelligenceType.js';

/**
 * Handover payload structure from Assessment Agent
 */
export interface AssessmentHandoverPayload {
  agent_id: string;
  handover_id: string;
  timestamp: Date;
  student_id: string;
  session_id: string;

  // Competitive Analysis (from TYPE-085 RubricScoringEngine)
  ivy_score: number; // 0-100 scale
  competitiveness_tier: string;
  rubric_scores: {
    academics: number;       // 0-10
    extracurriculars: number;  // 0-10 (mapped from leadership)
    summer_programs: number;   // 0-10 (mapped from service)
    awards: number;            // 0-10 (mapped from recognition)
    essays: number;            // 0-10 (mapped from artifacts)
    total: number;             // 0-50
  };

  // Gap Analysis (from TYPE-086 GapPriorityAnalyzer)
  p0_gaps: Array<{
    dimension: string;
    current_score: number;
    target_score: number;
    gap_size: number;
    priority: 'P0';
    urgency: string;
    recommended_actions: string[];
  }>;
  p1_gaps: Array<{
    dimension: string;
    current_score: number;
    target_score: number;
    gap_size: number;
    priority: 'P1';
    urgency: string;
    recommended_actions: string[];
  }>;

  // Identity Fusion (from conversational data)
  identity_fusion?: {
    identity_element: string;
    aptitude_element: string;
    passion_element: string;
    service_element: string;
    narrative_thread: string;
  };

  // Profile info
  current_grade?: string;
  graduation_year?: string;
  target_schools?: string[];
}

/**
 * HandoverPayloadExtractor - Universal extraction methods for A2A handover payloads
 *
 * v29.3: Prevents "reload from database" anti-pattern by extracting intelligence
 * results directly from handover payload instead of querying kb_items
 *
 * Design Philosophy:
 * - Single source of truth for handover data extraction
 * - Type-safe interfaces
 * - Consistent with CanonicalFieldMapper pattern
 * - Applicable to all agents receiving handovers
 */
export class HandoverPayloadExtractor {
  /**
   * Extract TYPE-085 RubricScoringEngine intelligence result from handover payload
   *
   * GamePlan Agent needs TYPE-085 data to:
   * - Generate Priority Focus Areas based on rubric scores
   * - Create quarterly roadmap with score-aware priorities
   * - Show student's current standing (IvyScore/competitiveness tier)
   *
   * @param payload Assessment Agent handover payload
   * @returns Synthetic TYPE-085 intelligence result (as if it ran in GamePlan)
   */
  static extractRubricScoringResult(payload: AssessmentHandoverPayload): IntelligenceResult {
    // Reverse-map application categories back to rubric dimensions for TYPE-085 format
    // (Assessment uses CanonicalFieldMapper for forward mapping, this is inverse)
    const dimension_scores = [
      {
        dimension: 'academics',
        raw_score: payload.rubric_scores.academics,
        evidence: [],
        gaps: payload.p0_gaps.filter(g => g.dimension === 'academics').map(g => g.recommended_actions).flat(),
        confidence: 0.85,
      },
      {
        dimension: 'leadership', // GamePlan sees original rubric dimension names
        raw_score: payload.rubric_scores.extracurriculars,
        evidence: [],
        gaps: payload.p0_gaps.filter(g => g.dimension === 'leadership').map(g => g.recommended_actions).flat(),
        confidence: 0.85,
      },
      {
        dimension: 'service',
        raw_score: payload.rubric_scores.summer_programs,
        evidence: [],
        gaps: payload.p0_gaps.filter(g => g.dimension === 'service').map(g => g.recommended_actions).flat(),
        confidence: 0.85,
      },
      {
        dimension: 'artifacts',
        raw_score: payload.rubric_scores.essays,
        evidence: [],
        gaps: payload.p0_gaps.filter(g => g.dimension === 'artifacts').map(g => g.recommended_actions).flat(),
        confidence: 0.85,
      },
      {
        dimension: 'recognition',
        raw_score: payload.rubric_scores.awards,
        evidence: [],
        gaps: payload.p0_gaps.filter(g => g.dimension === 'recognition').map(g => g.recommended_actions).flat(),
        confidence: 0.85,
      },
    ];

    return {
      type_id: 'TYPE-085',
      component: 'rubric_scoring_engine',
      triggered: true,
      confidence: 0.85,
      data: {
        student_id: payload.student_id,
        total_score: payload.rubric_scores.total, // 0-50 scale (correct field name)
        dimension_scores,
        data_completeness: 0.8,
        scoring_confidence: 0.85,
        timestamp: payload.timestamp,
        source: 'handover_payload_extraction_v29.3',
      },
    };
  }

  /**
   * Extract TYPE-086 GapPriorityAnalyzer intelligence result from handover payload
   *
   * GamePlan Agent needs TYPE-086 data to:
   * - Populate "Priority Focus Areas" section with P0/P1 gaps
   * - Generate quarterly roadmap with gap-aware milestones
   * - Create recommended actions based on priorities
   *
   * @param payload Assessment Agent handover payload
   * @returns Synthetic TYPE-086 intelligence result (as if it ran in GamePlan)
   */
  static extractGapPriorityResult(payload: AssessmentHandoverPayload): IntelligenceResult {
    // v29.4.1: Normalize Assessment payload format to GamePlan expected format
    // Assessment format: { category, severity: 'p0'/'p1', description, recommendation }
    // GamePlan format: { dimension, priority: 'P0'/'P1', recommended_actions: [], gap_size, ... }

    const normalizeGap = (gap: any) => {
      // Parse gap_size from description (e.g., "recognition gap: 0/7" → gap_size = 7)
      const gapMatch = gap.description.match(/(\d+)\/(\d+)/);
      const current_score = gapMatch ? parseInt(gapMatch[1]) : 0;
      const target_score = gapMatch ? parseInt(gapMatch[2]) : 10;
      const gap_size = target_score - current_score;

      return {
        dimension: gap.category,  // 'recognition', 'leadership', etc.
        current_score,
        target_score,
        gap_size,
        priority: gap.severity.toUpperCase() as 'P0' | 'P1',  // 'p0' → 'P0'
        urgency: gap.severity === 'p0' ? 'Critical' : 'High',
        recommended_actions: [gap.recommendation],  // Convert single recommendation to array
      };
    };

    const normalizedP0 = payload.p0_gaps.map(normalizeGap);
    const normalizedP1 = payload.p1_gaps.map(normalizeGap);
    const prioritized_gaps = [...normalizedP0, ...normalizedP1];

    console.log('[EXTRACTOR_v29.4.1] Normalized gaps:', {
      original_p0_count: payload.p0_gaps.length,
      original_p1_count: payload.p1_gaps.length,
      normalized_count: prioritized_gaps.length,
      sample_normalized: prioritized_gaps[0],
    });

    return {
      type_id: 'TYPE-086',
      component: 'gap_priority_analyzer',
      triggered: true,
      confidence: 0.8,
      data: {
        prioritized_gaps,
        quick_wins: normalizedP0
          .filter((g) => g.gap_size <= 3)  // Quick wins are small gaps
          .map((g) => ({
            action: g.recommended_actions[0],
            timeline: '2-4 weeks',
            impact: 'High',
          })),
        source: 'handover_payload_extraction_v29.4.1',
        timestamp: payload.timestamp,
      },
    };
  }

  /**
   * Extract all relevant intelligence results from handover payload
   *
   * This is the main method agents should use. It returns a complete set of
   * intelligence results as if the agent had run its own intelligence types.
   *
   * @param payload Assessment Agent handover payload
   * @returns Array of synthetic intelligence results for GamePlan Agent
   */
  static extractAllIntelligenceResults(payload: AssessmentHandoverPayload): IntelligenceResult[] {
    return [
      this.extractRubricScoringResult(payload),
      this.extractGapPriorityResult(payload),
    ];
  }

  /**
   * Check if handover payload contains sufficient data for GamePlan
   *
   * GamePlan Agent minimally needs:
   * - Rubric scores (for current standing assessment)
   * - At least one gap (for roadmap generation)
   *
   * @param payload Assessment Agent handover payload
   * @returns True if payload has minimum required data
   */
  static isPayloadSufficient(payload: AssessmentHandoverPayload | null | undefined): boolean {
    if (!payload) return false;

    // Check required fields exist
    if (!payload.rubric_scores || !payload.rubric_scores.total) return false;
    if (!payload.p0_gaps && !payload.p1_gaps) return false;

    // Check rubric scores are non-zero (at least some data collected)
    if (payload.rubric_scores.total === 0) return false;

    // Check at least one gap exists
    const totalGaps = (payload.p0_gaps?.length || 0) + (payload.p1_gaps?.length || 0);
    if (totalGaps === 0) return false;

    return true;
  }

  /**
   * Extract IvyScore from handover payload (normalized 0-100 scale)
   *
   * @param payload Assessment Agent handover payload
   * @returns IvyScore (0-100) or 0 if not available
   */
  static extractIvyScore(payload: AssessmentHandoverPayload | null | undefined): number {
    if (!payload || !payload.ivy_score) return 0;
    return payload.ivy_score;
  }

  /**
   * Extract competitiveness tier from handover payload
   *
   * @param payload Assessment Agent handover payload
   * @returns Competitiveness tier or 'Unknown'
   */
  static extractCompetitivenessTier(payload: AssessmentHandoverPayload | null | undefined): string {
    if (!payload || !payload.competitiveness_tier) return 'Unknown';
    return payload.competitiveness_tier;
  }

  /**
   * Extract identity fusion narrative from handover payload
   *
   * @param payload Assessment Agent handover payload
   * @returns Identity fusion narrative or null
   */
  static extractIdentityFusion(
    payload: AssessmentHandoverPayload | null | undefined
  ): AssessmentHandoverPayload['identity_fusion'] | null {
    if (!payload || !payload.identity_fusion) return null;
    return payload.identity_fusion;
  }
}

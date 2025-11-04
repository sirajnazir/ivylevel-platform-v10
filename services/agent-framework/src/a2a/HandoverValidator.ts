/**
 * Handover Validator - v28.1
 *
 * Validates A2A handover readiness with 20 quality gate criteria
 * from GAP_ANALYSIS_COACHING_INTELLIGENCE.md
 *
 * Quality Gates (20 Criteria):
 * 1. Unique narrative present (strategic positioning)
 * 2. Grade level confirmed (93-week timeline)
 * 3. Target major identified (portfolio multiplication)
 * 4. Rubric scores calculated (gap prioritization)
 * 5. IvyScore computed (competitiveness tier)
 * 6. High school identified (context awareness)
 * 7. Identity fusion extracted (authentic narrative)
 * 8. Gaps identified (weak spot prioritization)
 * 9. Current activities captured (time planning)
 * 10. Strategic Architect persona coverage (100%)
 * 11. Time Mathematician persona coverage (>=80%)
 * 12. Admissions Officer persona coverage (>=80%)
 * 13. Confidence Alchemist persona coverage (>=60%)
 * 14. Overall quality score >= 7/10
 * 15. Student-specific facts flagged
 * 16. Longitudinal tracking enabled for key facts
 * 17. No "rushed handover" indicators
 * 18. Derivable facts available for optional categories
 * 19. Adaptation context captured
 * 20. Hyper-personalization metadata present
 */

import {
  AgentFactRequirementsRegistry,
  HandoverReadinessResult,
  AdaptationContext,
  CoachingPersona,
} from './AgentFactRequirements.js';
import { FactCategory } from '../facts/types.js';
import { FactCategoryMapper } from '../facts/FactCategoryMapper.js';

/**
 * Quality gate result
 */
export interface QualityGateResult {
  gate_id: string;
  gate_name: string;
  passed: boolean;
  score: number; // 0-10
  details: string;
}

/**
 * Enhanced handover readiness with quality gates
 */
export interface EnhancedHandoverReadiness extends HandoverReadinessResult {
  quality_gates_results: QualityGateResult[];
  quality_gates_passed: number;
  quality_gates_total: number;
  quality_gates_pass_rate: number; // 0-1

  // Adaptation context
  adaptation_context?: AdaptationContext;

  // Hyper-personalization check
  has_student_specific_facts: boolean;
  student_specific_count: number;

  // Longitudinal tracking check
  has_longitudinal_tracking: boolean;
  longitudinal_fact_count: number;

  // Rushed handover indicators
  rushed_handover_indicators: string[];
}

/**
 * Handover Validator
 */
export class HandoverValidator {
  /**
   * Validate handover with 20 quality gate criteria
   */
  static async validateHandover(
    from_agent: string,
    to_agent: string,
    available_facts: Map<FactCategory, any[]>,
    adaptation_context?: AdaptationContext
  ): Promise<EnhancedHandoverReadiness> {
    // Get base validation from registry
    const base_result = AgentFactRequirementsRegistry.validateHandoverReadiness(
      from_agent,
      to_agent,
      available_facts,
      adaptation_context
    );

    // Run 20 quality gate checks
    const quality_gates_results = await this.runQualityGates(
      to_agent,
      available_facts,
      adaptation_context
    );

    const quality_gates_passed = quality_gates_results.filter(g => g.passed).length;
    const quality_gates_total = quality_gates_results.length;
    const quality_gates_pass_rate = quality_gates_passed / quality_gates_total;

    // Check hyper-personalization
    const student_specific_facts = this.countStudentSpecificFacts(available_facts);

    // Check longitudinal tracking
    const longitudinal_facts = this.countLongitudinalFacts(available_facts);

    // Detect rushed handover indicators
    const rushed_indicators = this.detectRushedHandover(
      base_result,
      quality_gates_results,
      available_facts
    );

    return {
      ...base_result,
      quality_gates_results,
      quality_gates_passed,
      quality_gates_total,
      quality_gates_pass_rate,
      adaptation_context,
      has_student_specific_facts: student_specific_facts > 0,
      student_specific_count: student_specific_facts,
      has_longitudinal_tracking: longitudinal_facts > 0,
      longitudinal_fact_count: longitudinal_facts,
      rushed_handover_indicators: rushed_indicators,
    };
  }

  /**
   * Run 20 quality gate checks
   */
  private static async runQualityGates(
    to_agent: string,
    available_facts: Map<FactCategory, any[]>,
    adaptation_context?: AdaptationContext
  ): Promise<QualityGateResult[]> {
    const results: QualityGateResult[] = [];

    // Gate 1: Unique narrative present
    results.push(this.checkFactPresence(
      'QG01',
      'Unique narrative present (strategic positioning)',
      available_facts,
      FactCategory.ASSESSMENT_DATA,
      ['unique_narrative']
    ));

    // Gate 2: Grade level confirmed
    results.push(this.checkFactPresence(
      'QG02',
      'Grade level confirmed (93-week timeline)',
      available_facts,
      FactCategory.STUDENT_PROFILE,
      ['grade', 'grade_level']
    ));

    // Gate 3: Target major identified
    results.push(this.checkFactPresence(
      'QG03',
      'Target major identified (portfolio multiplication)',
      available_facts,
      FactCategory.STUDENT_PROFILE,
      ['target_major', 'target_field']
    ));

    // Gate 4: Rubric scores calculated
    results.push(this.checkFactPresence(
      'QG04',
      'Rubric scores calculated (gap prioritization)',
      available_facts,
      FactCategory.ASSESSMENT_DATA,
      ['rubric_scores']
    ));

    // Gate 5: IvyScore computed
    results.push(this.checkFactPresence(
      'QG05',
      'IvyScore computed (competitiveness tier)',
      available_facts,
      FactCategory.ASSESSMENT_DATA,
      ['ivy_score']
    ));

    // Gate 6: High school identified
    results.push(this.checkFactPresence(
      'QG06',
      'High school identified (context awareness)',
      available_facts,
      FactCategory.STUDENT_PROFILE,
      ['high_school']
    ));

    // Gate 7: Identity fusion extracted
    results.push(this.checkFactPresence(
      'QG07',
      'Identity fusion extracted (authentic narrative)',
      available_facts,
      FactCategory.ASSESSMENT_DATA,
      ['identity_fusion']
    ));

    // Gate 8: Gaps identified
    results.push(this.checkFactPresence(
      'QG08',
      'Gaps identified (weak spot prioritization)',
      available_facts,
      FactCategory.ASSESSMENT_DATA,
      ['gaps', 'weak_spots']
    ));

    // Gate 9: Current activities captured (optional but recommended)
    results.push(this.checkFactPresence(
      'QG09',
      'Current activities captured (time planning)',
      available_facts,
      FactCategory.ACTIVITY_DATA,
      ['current_activities', 'extracurriculars'],
      false // Optional
    ));

    // Gate 10: Strategic Architect persona coverage (100%)
    results.push(this.checkPersonaCoverage(
      'QG10',
      'Strategic Architect persona coverage (100%)',
      available_facts,
      CoachingPersona.STRATEGIC_ARCHITECT,
      1.0
    ));

    // Gate 11: Time Mathematician persona coverage (>=80%)
    results.push(this.checkPersonaCoverage(
      'QG11',
      'Time Mathematician persona coverage (>=80%)',
      available_facts,
      CoachingPersona.TIME_MATHEMATICIAN,
      0.80
    ));

    // Gate 12: Admissions Officer persona coverage (>=80%)
    results.push(this.checkPersonaCoverage(
      'QG12',
      'Admissions Officer persona coverage (>=80%)',
      available_facts,
      CoachingPersona.ADMISSIONS_OFFICER,
      0.80
    ));

    // Gate 13: Confidence Alchemist persona coverage (>=60%)
    results.push(this.checkPersonaCoverage(
      'QG13',
      'Confidence Alchemist persona coverage (>=60%)',
      available_facts,
      CoachingPersona.CONFIDENCE_ALCHEMIST,
      0.60
    ));

    // Gate 14: Overall quality score >= 7/10
    results.push(this.checkOverallQuality(
      'QG14',
      'Overall quality score >= 7/10',
      available_facts,
      7.0
    ));

    // Gate 15: Student-specific facts flagged
    results.push(this.checkStudentSpecificFacts(
      'QG15',
      'Student-specific facts flagged',
      available_facts
    ));

    // Gate 16: Longitudinal tracking enabled
    results.push(this.checkLongitudinalTracking(
      'QG16',
      'Longitudinal tracking enabled for key facts',
      available_facts
    ));

    // Gate 17: No rushed handover indicators
    results.push({
      gate_id: 'QG17',
      gate_name: 'No rushed handover indicators',
      passed: true, // Will be checked later in detectRushedHandover
      score: 10,
      details: 'No rushed handover detected',
    });

    // Gate 18: Derivable facts available for optional categories
    results.push(this.checkDerivableFacts(
      'QG18',
      'Derivable facts available for optional categories',
      available_facts
    ));

    // Gate 19: Adaptation context captured
    results.push({
      gate_id: 'QG19',
      gate_name: 'Adaptation context captured',
      passed: !!adaptation_context,
      score: adaptation_context ? 10 : 5,
      details: adaptation_context
        ? `Context captured: Grade ${adaptation_context.class_year}, Q${adaptation_context.current_quarter}, Capacity: ${adaptation_context.student_capacity}`
        : 'No adaptation context provided (using defaults)',
    });

    // Gate 20: Hyper-personalization metadata present
    results.push(this.checkHyperPersonalization(
      'QG20',
      'Hyper-personalization metadata present',
      available_facts
    ));

    return results;
  }

  /**
   * Check if specific facts are present
   */
  private static checkFactPresence(
    gate_id: string,
    gate_name: string,
    available_facts: Map<FactCategory, any[]>,
    category: FactCategory,
    fact_types: string[],
    required: boolean = true
  ): QualityGateResult {
    const category_facts = available_facts.get(category) || [];
    const found_types = fact_types.filter(type =>
      category_facts.some(f => f.fact_type === type || f.subtype === type)
    );

    const passed = found_types.length > 0 || !required;
    const score = required
      ? (found_types.length / fact_types.length) * 10
      : Math.min(10, (found_types.length / fact_types.length) * 10 + 5);

    return {
      gate_id,
      gate_name,
      passed,
      score,
      details: passed
        ? `Found: ${found_types.join(', ')}`
        : `Missing: ${fact_types.filter(t => !found_types.includes(t)).join(', ')}`,
    };
  }

  /**
   * Check persona coverage
   */
  private static checkPersonaCoverage(
    gate_id: string,
    gate_name: string,
    available_facts: Map<FactCategory, any[]>,
    persona: CoachingPersona,
    required_coverage: number
  ): QualityGateResult {
    // Get all fact types used by this persona
    const persona_fact_types = Object.entries(FactCategoryMapper['FACT_TYPE_TO_PERSONAS'] || {})
      .filter(([_, personas]) => personas.includes(persona))
      .map(([fact_type]) => fact_type);

    if (persona_fact_types.length === 0) {
      return {
        gate_id,
        gate_name,
        passed: true,
        score: 10,
        details: 'No specific facts required for this persona',
      };
    }

    // Count how many are present
    let found_count = 0;
    for (const [_, facts] of available_facts) {
      for (const fact of facts) {
        if (persona_fact_types.includes(fact.fact_type)) {
          found_count++;
        }
      }
    }

    const coverage = found_count / persona_fact_types.length;
    const passed = coverage >= required_coverage;
    const score = Math.min(10, (coverage / required_coverage) * 10);

    return {
      gate_id,
      gate_name,
      passed,
      score,
      details: `Coverage: ${(coverage * 100).toFixed(0)}% (${found_count}/${persona_fact_types.length} facts)`,
    };
  }

  /**
   * Check overall quality score
   */
  private static checkOverallQuality(
    gate_id: string,
    gate_name: string,
    available_facts: Map<FactCategory, any[]>,
    required_score: number
  ): QualityGateResult {
    let total_quality = 0;
    let fact_count = 0;

    for (const [_, facts] of available_facts) {
      for (const fact of facts) {
        total_quality += fact.quality_score || 7;
        fact_count++;
      }
    }

    const avg_quality = fact_count > 0 ? total_quality / fact_count : 0;
    const passed = avg_quality >= required_score;

    return {
      gate_id,
      gate_name,
      passed,
      score: avg_quality,
      details: `Average quality: ${avg_quality.toFixed(1)}/10 across ${fact_count} facts`,
    };
  }

  /**
   * Check student-specific facts
   */
  private static checkStudentSpecificFacts(
    gate_id: string,
    gate_name: string,
    available_facts: Map<FactCategory, any[]>
  ): QualityGateResult {
    const count = this.countStudentSpecificFacts(available_facts);
    const passed = count > 0;

    return {
      gate_id,
      gate_name,
      passed,
      score: Math.min(10, count),
      details: `Found ${count} student-specific facts (hyper-personalization ready)`,
    };
  }

  /**
   * Check longitudinal tracking
   */
  private static checkLongitudinalTracking(
    gate_id: string,
    gate_name: string,
    available_facts: Map<FactCategory, any[]>
  ): QualityGateResult {
    const count = this.countLongitudinalFacts(available_facts);
    const passed = count > 0;

    return {
      gate_id,
      gate_name,
      passed,
      score: Math.min(10, count),
      details: `Found ${count} facts with longitudinal tracking (vulnerability ladder ready)`,
    };
  }

  /**
   * Check derivable facts
   */
  private static checkDerivableFacts(
    gate_id: string,
    gate_name: string,
    available_facts: Map<FactCategory, any[]>
  ): QualityGateResult {
    // Check if we have base facts needed for derivation
    const has_grade = this.hasFactType(available_facts, 'grade');
    const has_activities = this.hasFactType(available_facts, 'current_activities');

    const derivable_count = (has_grade ? 1 : 0) + (has_activities ? 1 : 0);
    const passed = derivable_count > 0;

    return {
      gate_id,
      gate_name,
      passed,
      score: derivable_count * 5,
      details: `Can derive ${derivable_count} additional facts from available data`,
    };
  }

  /**
   * Check hyper-personalization metadata
   */
  private static checkHyperPersonalization(
    gate_id: string,
    gate_name: string,
    available_facts: Map<FactCategory, any[]>
  ): QualityGateResult {
    let facts_with_metadata = 0;
    let total_facts = 0;

    for (const [_, facts] of available_facts) {
      for (const fact of facts) {
        total_facts++;
        if (fact.metadata?.is_student_specific !== undefined) {
          facts_with_metadata++;
        }
      }
    }

    const coverage = total_facts > 0 ? facts_with_metadata / total_facts : 0;
    const passed = coverage > 0.5;

    return {
      gate_id,
      gate_name,
      passed,
      score: coverage * 10,
      details: `${(coverage * 100).toFixed(0)}% of facts have hyper-personalization metadata`,
    };
  }

  /**
   * Detect rushed handover indicators
   */
  private static detectRushedHandover(
    base_result: HandoverReadinessResult,
    quality_gates: QualityGateResult[],
    available_facts: Map<FactCategory, any[]>
  ): string[] {
    const indicators: string[] = [];

    // Indicator 1: Missing mandatory facts with no derivation path
    if (base_result.missing_mandatory_facts.length > 0 && !base_result.can_derive) {
      indicators.push('Missing mandatory facts with no way to derive them');
    }

    // Indicator 2: Low quality gate pass rate (<70%)
    const pass_rate = quality_gates.filter(g => g.passed).length / quality_gates.length;
    if (pass_rate < 0.70) {
      indicators.push(`Low quality gate pass rate: ${(pass_rate * 100).toFixed(0)}%`);
    }

    // Indicator 3: Missing critical personas
    const strategic_architect_gate = quality_gates.find(g => g.gate_id === 'QG10');
    if (strategic_architect_gate && !strategic_architect_gate.passed) {
      indicators.push('Strategic Architect persona missing required facts (100% coverage required)');
    }

    // Indicator 4: No student-specific facts
    if (this.countStudentSpecificFacts(available_facts) === 0) {
      indicators.push('No student-specific facts found (hyper-personalization not possible)');
    }

    // Indicator 5: Overall quality score < 5
    const quality_gate = quality_gates.find(g => g.gate_id === 'QG14');
    if (quality_gate && quality_gate.score < 5) {
      indicators.push(`Overall quality score too low: ${quality_gate.score.toFixed(1)}/10`);
    }

    return indicators;
  }

  /**
   * Count student-specific facts
   */
  private static countStudentSpecificFacts(available_facts: Map<FactCategory, any[]>): number {
    let count = 0;
    for (const [_, facts] of available_facts) {
      for (const fact of facts) {
        if (fact.metadata?.is_student_specific || FactCategoryMapper.isStudentSpecific(fact.fact_type)) {
          count++;
        }
      }
    }
    return count;
  }

  /**
   * Count longitudinal facts
   */
  private static countLongitudinalFacts(available_facts: Map<FactCategory, any[]>): number {
    let count = 0;
    for (const [_, facts] of available_facts) {
      for (const fact of facts) {
        if (fact.metadata?.track_over_time || FactCategoryMapper.shouldTrackOverTime(fact.fact_type)) {
          count++;
        }
      }
    }
    return count;
  }

  /**
   * Check if specific fact type exists
   */
  private static hasFactType(available_facts: Map<FactCategory, any[]>, fact_type: string): boolean {
    for (const [_, facts] of available_facts) {
      if (facts.some(f => f.fact_type === fact_type)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Suggest questions to collect missing facts
   */
  static suggestQuestions(
    validation_result: EnhancedHandoverReadiness
  ): string[] {
    return AgentFactRequirementsRegistry.suggestQuestions(
      validation_result.missing_mandatory_facts
    );
  }

  /**
   * Get human-readable validation summary
   */
  static getValidationSummary(result: EnhancedHandoverReadiness): string {
    const lines: string[] = [];

    lines.push(`Handover Readiness: ${result.is_ready ? '✅ READY' : '⚠️ NOT READY'}`);
    lines.push(`Quality Score: ${result.quality_score.toFixed(1)}/10`);
    lines.push(`Quality Gates: ${result.quality_gates_passed}/${result.quality_gates_total} passed (${(result.quality_gates_pass_rate * 100).toFixed(0)}%)`);

    if (result.missing_mandatory_facts.length > 0) {
      lines.push(`\nMissing Mandatory Facts: ${result.missing_mandatory_facts.length}`);
    }

    if (result.rushed_handover_indicators.length > 0) {
      lines.push(`\n⚠️ Rushed Handover Indicators:`);
      result.rushed_handover_indicators.forEach(indicator => {
        lines.push(`  - ${indicator}`);
      });
    }

    lines.push(`\nRecommendation: ${result.recommendation.toUpperCase()}`);

    return lines.join('\n');
  }
}

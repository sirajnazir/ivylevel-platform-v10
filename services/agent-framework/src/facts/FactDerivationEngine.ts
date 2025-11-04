/**
 * Fact Derivation Engine - v28.1
 *
 * Auto-derives missing facts from available data with:
 * - Dynamic adaptation based on class year, capacity, personality
 * - Adaptive derivation rules
 * - Confidence scoring
 * - Strategic omission support (hidden calculations)
 *
 * Derivation Rules:
 * 1. calculate_quarter_from_grade - Infer current quarter from grade + date
 * 2. calculate_time_capacity - Estimate weekly capacity from grade + activities
 * 3. estimate_from_narrative - Extract activities from unique narrative
 * 4. infer_from_major_and_profile - Suggest target schools from major + profile
 * 5. calculate_competitiveness - Determine tier from IvyScore + high school
 * 6. estimate_personality_from_narrative - Infer shy/confident from narrative
 * 7. calculate_urgency_mode - Determine if Grade 11/12 urgency applies
 */

import { FactCategory } from './types.js';
import { EnhancedFact, FactCategoryMapper } from './FactCategoryMapper.js';
import { CoachingPersona, FactPurpose, AdaptationContext } from '../a2a/AgentFactRequirements.js';

/**
 * Derivation rule interface
 */
export interface DerivationRule {
  rule_id: string;
  rule_name: string;
  output_fact_type: string;
  output_category: FactCategory;
  input_fact_types: string[];
  derivation_function: (inputs: Map<string, any>, context?: AdaptationContext) => any;
  confidence_calculator: (inputs: Map<string, any>, context?: AdaptationContext) => number;
  required_personas?: CoachingPersona[];
  adaptation_sensitive: boolean; // Does this rule adapt based on context?
}

/**
 * Derived fact result
 */
export interface DerivedFactResult {
  fact: EnhancedFact;
  rule_used: string;
  confidence: number;
  derivation_log: string;
}

/**
 * Fact Derivation Engine
 */
export class FactDerivationEngine {
  private static rules: Map<string, DerivationRule> = new Map();

  /**
   * Initialize with standard derivation rules
   */
  static initialize(): void {
    // Rule 1: Calculate current quarter from grade + date
    this.registerRule({
      rule_id: 'calculate_quarter_from_grade',
      rule_name: 'Calculate Quarter from Grade',
      output_fact_type: 'current_quarter',
      output_category: FactCategory.STUDENT_PROFILE,
      input_fact_types: ['grade', 'grade_level'],
      derivation_function: (inputs, context) => {
        const grade = inputs.get('grade') || inputs.get('grade_level');
        const month = new Date().getMonth() + 1; // 1-12

        // Q1: Sep-Nov (months 9-11)
        // Q2: Dec-Feb (months 12, 1-2)
        // Q3: Mar-May (months 3-5)
        // Q4: Jun-Aug (months 6-8)

        if (month >= 9 && month <= 11) return 1;
        if (month === 12 || month <= 2) return 2;
        if (month >= 3 && month <= 5) return 3;
        return 4;
      },
      confidence_calculator: () => 0.95,
      required_personas: [CoachingPersona.TIME_MATHEMATICIAN],
      adaptation_sensitive: false,
    });

    // Rule 2: Calculate time capacity from grade + activities
    this.registerRule({
      rule_id: 'calculate_time_capacity',
      rule_name: 'Calculate Time Capacity',
      output_fact_type: 'time_capacity',
      output_category: FactCategory.ACTIVITY_DATA,
      input_fact_types: ['grade', 'current_activities'],
      derivation_function: (inputs, context) => {
        const grade = inputs.get('grade') || inputs.get('grade_level') || 10;
        const activities = inputs.get('current_activities') || inputs.get('extracurriculars') || [];

        // Base hours available per week (decreases with grade)
        let base_hours = 50;
        if (grade >= 11) base_hours = 40;
        if (grade >= 12) base_hours = 35;

        // Adjust for student capacity from context
        if (context?.student_capacity === 'low') base_hours *= 0.7;
        if (context?.student_capacity === 'high') base_hours *= 1.2;

        // Estimate activity hours (5 hours per activity on average)
        const activity_count = Array.isArray(activities) ? activities.length : 0;
        const activity_hours = activity_count * 5;

        // Calculate available capacity
        const available = Math.max(5, base_hours - activity_hours);

        return {
          weekly_hours_available: available,
          base_capacity: base_hours,
          committed_hours: activity_hours,
          activity_count,
        };
      },
      confidence_calculator: (inputs, context) => {
        // Higher confidence if we have activity data
        const has_activities = inputs.has('current_activities') || inputs.has('extracurriculars');
        return has_activities ? 0.85 : 0.70;
      },
      required_personas: [CoachingPersona.TIME_MATHEMATICIAN],
      adaptation_sensitive: true, // Adapts based on context.student_capacity
    });

    // Rule 3: Estimate activities from narrative
    this.registerRule({
      rule_id: 'estimate_from_narrative',
      rule_name: 'Estimate Activities from Narrative',
      output_fact_type: 'current_activities',
      output_category: FactCategory.ACTIVITY_DATA,
      input_fact_types: ['unique_narrative', 'identity_fusion'],
      derivation_function: (inputs) => {
        const narrative = inputs.get('unique_narrative') || inputs.get('identity_fusion') || '';

        // Extract activity mentions from narrative
        const activities: string[] = [];

        // Look for common activity keywords
        const activity_patterns = [
          /built?\s+(?:a|an)\s+([^.!?]+)/gi,
          /creat(?:ed|ing)\s+([^.!?]+)/gi,
          /develop(?:ed|ing)\s+([^.!?]+)/gi,
          /lead(?:ing|s)?\s+([^.!?]+)/gi,
          /organiz(?:ed|ing)\s+([^.!?]+)/gi,
          /founder\s+of\s+([^.!?]+)/gi,
          /president\s+of\s+([^.!?]+)/gi,
        ];

        for (const pattern of activity_patterns) {
          const matches = narrative.matchAll(pattern);
          for (const match of matches) {
            if (match[1] && match[1].length > 5 && match[1].length < 100) {
              activities.push(match[1].trim());
            }
          }
        }

        // Remove duplicates
        return [...new Set(activities)];
      },
      confidence_calculator: (inputs) => {
        const narrative = inputs.get('unique_narrative') || inputs.get('identity_fusion') || '';
        return narrative.length > 50 ? 0.65 : 0.40;
      },
      required_personas: [CoachingPersona.STRATEGIC_ARCHITECT],
      adaptation_sensitive: false,
    });

    // Rule 4: Infer target schools from major + profile
    this.registerRule({
      rule_id: 'infer_from_major_and_profile',
      rule_name: 'Infer Target Schools from Major',
      output_fact_type: 'target_schools',
      output_category: FactCategory.GOAL_DATA,
      input_fact_types: ['target_major', 'ivy_score', 'interests'],
      derivation_function: (inputs) => {
        const major = inputs.get('target_major') || inputs.get('target_field') || '';
        const ivy_score = inputs.get('ivy_score') || 50;

        // This is a STRATEGIC OMISSION - we calculate but don't show directly
        // Used by Admissions Officer persona for hidden probability calculations

        const schools: string[] = [];

        // CS/Tech majors
        if (major.toLowerCase().includes('computer') || major.toLowerCase().includes('cs')) {
          if (ivy_score >= 70) schools.push('MIT', 'Stanford', 'CMU');
          if (ivy_score >= 50) schools.push('UC Berkeley', 'UIUC', 'Georgia Tech');
          schools.push('UW Madison', 'UT Austin');
        }

        // Data Science
        if (major.toLowerCase().includes('data')) {
          if (ivy_score >= 70) schools.push('Stanford', 'MIT', 'UC Berkeley');
          if (ivy_score >= 50) schools.push('CMU', 'UW Madison', 'UIUC');
        }

        // General STEM
        if (major.toLowerCase().includes('engineering') || major.toLowerCase().includes('science')) {
          if (ivy_score >= 70) schools.push('Caltech', 'MIT', 'Stanford');
          if (ivy_score >= 50) schools.push('Georgia Tech', 'Purdue', 'UIUC');
        }

        return schools.slice(0, 6); // Top 6 matches
      },
      confidence_calculator: () => 0.60, // Medium confidence - this is inference
      required_personas: [CoachingPersona.ADMISSIONS_OFFICER, CoachingPersona.PARENT_WHISPERER],
      adaptation_sensitive: false,
    });

    // Rule 5: Calculate competitiveness tier
    this.registerRule({
      rule_id: 'calculate_competitiveness',
      rule_name: 'Calculate Competitiveness Tier',
      output_fact_type: 'competitiveness_tier',
      output_category: FactCategory.ASSESSMENT_DATA,
      input_fact_types: ['ivy_score', 'high_school'],
      derivation_function: (inputs) => {
        const ivy_score = inputs.get('ivy_score') || 50;
        const high_school = inputs.get('high_school') || '';

        // This is a STRATEGIC OMISSION - hidden calculation for internal use only

        let tier = 'DEVELOPING';
        if (ivy_score >= 80) tier = 'HIGHLY_COMPETITIVE';
        else if (ivy_score >= 65) tier = 'COMPETITIVE';
        else if (ivy_score >= 50) tier = 'EMERGING';

        // Boost if from competitive high school
        const competitive_keywords = ['prep', 'academy', 'magnet', 'international', 'charter'];
        const is_competitive_hs = competitive_keywords.some(kw =>
          high_school.toLowerCase().includes(kw)
        );

        return {
          tier,
          ivy_score,
          high_school_boost: is_competitive_hs ? 5 : 0,
          adjusted_score: is_competitive_hs ? Math.min(100, ivy_score + 5) : ivy_score,
        };
      },
      confidence_calculator: () => 0.80,
      required_personas: [CoachingPersona.ADMISSIONS_OFFICER],
      adaptation_sensitive: false,
    });

    // Rule 6: Estimate personality from narrative
    this.registerRule({
      rule_id: 'estimate_personality_from_narrative',
      rule_name: 'Estimate Personality from Narrative',
      output_fact_type: 'personality_type',
      output_category: FactCategory.STUDENT_PROFILE,
      input_fact_types: ['unique_narrative', 'identity_fusion'],
      derivation_function: (inputs) => {
        const narrative = inputs.get('unique_narrative') || inputs.get('identity_fusion') || '';

        // Look for confidence indicators
        const confident_keywords = ['lead', 'founded', 'organized', 'presented', 'spoke', 'won', 'achieved'];
        const shy_keywords = ['struggle', 'nervous', 'quiet', 'shy', 'anxious', 'internal'];

        const confident_count = confident_keywords.filter(kw =>
          narrative.toLowerCase().includes(kw)
        ).length;

        const shy_count = shy_keywords.filter(kw =>
          narrative.toLowerCase().includes(kw)
        ).length;

        if (confident_count > shy_count + 1) return 'confident';
        if (shy_count > confident_count + 1) return 'shy';
        return 'balanced';
      },
      confidence_calculator: (inputs) => {
        const narrative = inputs.get('unique_narrative') || inputs.get('identity_fusion') || '';
        return narrative.length > 100 ? 0.60 : 0.40;
      },
      required_personas: [CoachingPersona.CONFIDENCE_ALCHEMIST, CoachingPersona.THERAPIST],
      adaptation_sensitive: false,
    });

    // Rule 7: Calculate urgency mode (Grade 11/12 adaptation)
    this.registerRule({
      rule_id: 'calculate_urgency_mode',
      rule_name: 'Calculate Urgency Mode',
      output_fact_type: 'urgency_mode',
      output_category: FactCategory.STUDENT_PROFILE,
      input_fact_types: ['grade', 'current_quarter'],
      derivation_function: (inputs, context) => {
        const grade = inputs.get('grade') || inputs.get('grade_level') || 10;
        const quarter = inputs.get('current_quarter') || context?.current_quarter || 1;

        // Grade 11/12 = urgency mode enabled
        const is_urgent = grade >= 11;

        // Calculate weeks to early decision deadline (Nov 1)
        const weeks_to_ed = grade === 12 ? Math.max(0, 12 - quarter * 12) : null;

        return {
          enabled: is_urgent,
          grade,
          quarter,
          weeks_to_ed_deadline: weeks_to_ed,
          message: is_urgent
            ? 'Urgency mode: Application timeline optimization required'
            : 'Standard timeline: Focus on foundational building',
        };
      },
      confidence_calculator: () => 1.0,
      required_personas: [CoachingPersona.TIME_MATHEMATICIAN, CoachingPersona.STRATEGIC_ARCHITECT],
      adaptation_sensitive: true, // Uses context.current_quarter
    });

    console.log('[FactDerivationEngine] Initialized with 7 derivation rules');
  }

  /**
   * Register a derivation rule
   */
  static registerRule(rule: DerivationRule): void {
    this.rules.set(rule.rule_id, rule);
  }

  /**
   * Get all registered rule IDs
   */
  static getAllRuleIds(): string[] {
    return Array.from(this.rules.keys());
  }

  /**
   * Derive missing facts from available data
   */
  static deriveFacts(
    available_facts: Map<FactCategory, any[]>,
    required_fact_types: string[],
    student_id: string,
    source_agent: string,
    source_session: string,
    adaptation_context?: AdaptationContext
  ): DerivedFactResult[] {
    const results: DerivedFactResult[] = [];

    for (const required_type of required_fact_types) {
      // Check if we already have this fact
      const already_exists = this.hasFactType(available_facts, required_type);
      if (already_exists) continue;

      // Find rules that can derive this fact type
      const applicable_rules = Array.from(this.rules.values()).filter(
        rule => rule.output_fact_type === required_type
      );

      for (const rule of applicable_rules) {
        // Check if we have all input facts needed
        const input_values = new Map<string, any>();
        let has_all_inputs = true;

        for (const input_type of rule.input_fact_types) {
          const value = this.getFactValue(available_facts, input_type);
          if (value === null) {
            has_all_inputs = false;
            break;
          }
          input_values.set(input_type, value);
        }

        if (!has_all_inputs) continue;

        // Apply derivation rule
        try {
          const derived_value = rule.derivation_function(input_values, adaptation_context);
          const confidence = rule.confidence_calculator(input_values, adaptation_context);

          // Create enhanced fact
          const category = rule.output_category;
          const personas = FactCategoryMapper.getPersonasForFactType(rule.output_fact_type);
          const purpose = this.inferPurpose(rule.output_fact_type);

          const enhanced_fact: EnhancedFact = {
            fact_type: rule.output_fact_type,
            category,
            value: derived_value,
            confidence,
            is_student_specific: FactCategoryMapper.isStudentSpecific(rule.output_fact_type),
            is_generalizable_pattern: !FactCategoryMapper.isStudentSpecific(rule.output_fact_type),
            used_by_personas: rule.required_personas || personas,
            primary_purpose: purpose,
            track_over_time: FactCategoryMapper.shouldTrackOverTime(rule.output_fact_type),
            snapshot_date: new Date().toISOString(),
            quality_score: confidence * 10,
            extraction_method: 'derived',
            source_agent,
            source_session,
            created_at: new Date().toISOString(),
          };

          results.push({
            fact: enhanced_fact,
            rule_used: rule.rule_id,
            confidence,
            derivation_log: `Derived ${rule.output_fact_type} using rule ${rule.rule_id} with confidence ${confidence.toFixed(2)}`,
          });

          // Only derive once per fact type
          break;
        } catch (error) {
          console.error(`[FactDerivationEngine] Error applying rule ${rule.rule_id}:`, error);
        }
      }
    }

    return results;
  }

  /**
   * Check if fact type exists in available facts
   */
  private static hasFactType(available_facts: Map<FactCategory, any[]>, fact_type: string): boolean {
    for (const [_, facts] of available_facts) {
      if (facts.some(f => f.fact_type === fact_type || f.subtype === fact_type)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get fact value by type
   */
  private static getFactValue(available_facts: Map<FactCategory, any[]>, fact_type: string): any {
    for (const [_, facts] of available_facts) {
      const fact = facts.find(f => f.fact_type === fact_type || f.subtype === fact_type);
      if (fact) {
        return fact.value || fact.data?.value || fact.data;
      }
    }
    return null;
  }

  /**
   * Infer purpose from fact type (same as FactCategoryMapper)
   */
  private static inferPurpose(fact_type: string): FactPurpose {
    if (['competitiveness_tier', 'target_schools'].includes(fact_type)) {
      return FactPurpose.HIDDEN_PROBABILITY_CALCULATION;
    }
    if (['personality_type'].includes(fact_type)) {
      return FactPurpose.CONFIDENCE_CALIBRATION;
    }
    if (['current_quarter', 'time_capacity', 'urgency_mode'].includes(fact_type)) {
      return FactPurpose.TIMELINE_GENERATION;
    }
    if (['current_activities'].includes(fact_type)) {
      return FactPurpose.PORTFOLIO_MULTIPLICATION;
    }
    return FactPurpose.DIRECT_RESPONSE;
  }
}

// Auto-initialize on import
FactDerivationEngine.initialize();

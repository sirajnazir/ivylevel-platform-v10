/**
 * Agent Fact Requirements Contract - v28.1
 *
 * Universal declarative system for agent fact requirements with:
 * - Multi-persona processing alignment
 * - Dynamic adaptation rules
 * - Strategic omission support
 * - Quality gate criteria
 * - Longitudinal tracking metadata
 *
 * Design Principles:
 * 1. Future-proof: Works for any current or future agent handovers
 * 2. Declarative: Agents declare their fact requirements explicitly
 * 3. Persona-aligned: Maps fact categories to 7 coaching personas
 * 4. Adaptive: Rules adjust based on class year, capacity, personality
 * 5. Quality-gated: 20 criteria for handover readiness
 */

import { FactCategory } from '../facts/types.js';

/**
 * 7 Coaching Personas (from GAP_ANALYSIS_COACHING_INTELLIGENCE.md)
 */
export enum CoachingPersona {
  THERAPIST = 'therapist',
  ADMISSIONS_OFFICER = 'admissions_officer',
  PARENT_WHISPERER = 'parent_whisperer',
  STRATEGIC_ARCHITECT = 'strategic_architect',
  CONFIDENCE_ALCHEMIST = 'confidence_alchemist',
  TIME_MATHEMATICIAN = 'time_mathematician',
  NETWORK_CONNECTOR = 'network_connector',
}

/**
 * Fact usage purpose (supports strategic omissions)
 */
export enum FactPurpose {
  // Visible to student
  DIRECT_RESPONSE = 'DIRECT_RESPONSE',
  TIMELINE_GENERATION = 'TIMELINE_GENERATION',
  ACTIVITY_RECOMMENDATION = 'ACTIVITY_RECOMMENDATION',

  // Hidden calculations (strategic omissions)
  HIDDEN_PROBABILITY_CALCULATION = 'HIDDEN_PROBABILITY_CALCULATION',
  INTERNAL_COMPETITIVENESS_SCORE = 'INTERNAL_COMPETITIVENESS_SCORE',
  DUAL_LAYER_MESSAGING = 'DUAL_LAYER_MESSAGING',
  CONFIDENCE_CALIBRATION = 'CONFIDENCE_CALIBRATION',
  PORTFOLIO_MULTIPLICATION = 'PORTFOLIO_MULTIPLICATION',
}

/**
 * Dynamic adaptation context
 */
export interface AdaptationContext {
  class_year: 9 | 10 | 11 | 12;
  current_quarter: 1 | 2 | 3 | 4;
  student_capacity: 'low' | 'medium' | 'high';
  personality_type?: 'shy' | 'confident' | 'balanced';
  weeks_to_deadline?: number; // For urgency-based adaptation
}

/**
 * Fact requirement specification
 */
export interface FactRequirement {
  category: FactCategory;
  fact_types: string[];
  is_mandatory: boolean;

  // Agentic pattern support
  purpose?: FactPurpose;
  personas_using?: CoachingPersona[];

  // Dynamic adaptation
  required_when?: (context: AdaptationContext) => boolean;

  // Derivation rules
  derivation_rules?: string[]; // IDs of derivation rules that can provide this

  // Quality criteria
  quality_threshold?: number; // 0-10 quality score required

  // Hyper-personalization
  student_specific?: boolean; // vs generalizable pattern

  // Longitudinal tracking
  track_over_time?: boolean; // For vulnerability ladder, confidence evolution
}

/**
 * Derived fact specification
 */
export interface DerivedFactSpec {
  output_fact_type: string;
  output_category: FactCategory;
  input_fact_types: string[];
  derivation_rule_id: string;
  confidence_threshold: number; // Only use if confidence >= this
  personas_using?: CoachingPersona[];
}

/**
 * Agent fact requirements contract
 */
export interface AgentFactContract {
  agent_id: string;
  agent_version: string;

  // Core requirements
  required_facts: FactRequirement[];
  optional_facts: FactRequirement[];
  derived_facts?: DerivedFactSpec[];

  // Quality gates (20 criteria from gap analysis)
  quality_gates?: string[];
  min_quality_score?: number; // 0-10

  // Persona alignment
  primary_personas?: CoachingPersona[];

  // Adaptation rules
  adaptation_rules?: string[];
}

/**
 * Handover readiness result
 */
export interface HandoverReadinessResult {
  is_ready: boolean;
  quality_score: number; // 0-10

  missing_mandatory_facts: FactRequirement[];
  missing_optional_facts: FactRequirement[];

  can_derive: boolean;
  derivable_facts: string[];

  quality_gate_failures: string[];

  recommendation: 'proceed' | 'derive_first' | 'collect_more';

  // Persona coverage
  persona_coverage: {
    persona: CoachingPersona;
    has_required_facts: boolean;
    missing_fact_types: string[];
  }[];
}

/**
 * Centralized registry of agent fact requirements
 */
export class AgentFactRequirementsRegistry {
  private static requirements: Map<string, AgentFactContract> = new Map();

  /**
   * Register an agent's fact contract
   */
  static register(contract: AgentFactContract): void {
    this.requirements.set(contract.agent_id, contract);
    console.log(`[AgentFactRequirements] Registered contract for ${contract.agent_id} (${contract.agent_version})`);
  }

  /**
   * Get agent's fact contract
   */
  static get(agent_id: string): AgentFactContract | null {
    return this.requirements.get(agent_id) || null;
  }

  /**
   * Validate handover readiness
   */
  static validateHandoverReadiness(
    from_agent: string,
    to_agent: string,
    available_facts: Map<FactCategory, any[]>,
    adaptation_context?: AdaptationContext
  ): HandoverReadinessResult {
    const target_contract = this.get(to_agent);

    if (!target_contract) {
      return {
        is_ready: false,
        quality_score: 0,
        missing_mandatory_facts: [],
        missing_optional_facts: [],
        can_derive: false,
        derivable_facts: [],
        quality_gate_failures: ['No contract found for target agent'],
        recommendation: 'collect_more',
        persona_coverage: [],
      };
    }

    // Check which mandatory facts are missing
    const missing_mandatory: FactRequirement[] = [];
    const missing_optional: FactRequirement[] = [];

    for (const req of target_contract.required_facts) {
      // Check dynamic adaptation rules
      if (req.required_when && adaptation_context) {
        if (!req.required_when(adaptation_context)) {
          continue; // Skip if not required in this context
        }
      }

      const category_facts = available_facts.get(req.category) || [];
      const has_all_types = req.fact_types.every(type =>
        category_facts.some((f: any) => f.fact_type === type || f.subtype === type)
      );

      if (!has_all_types) {
        missing_mandatory.push(req);
      }
    }

    for (const req of target_contract.optional_facts || []) {
      const category_facts = available_facts.get(req.category) || [];
      const has_all_types = req.fact_types.every(type =>
        category_facts.some((f: any) => f.fact_type === type || f.subtype === type)
      );

      if (!has_all_types) {
        missing_optional.push(req);
      }
    }

    // Check if missing facts can be derived
    const derivable_facts: string[] = [];
    for (const missing of missing_mandatory) {
      if (missing.derivation_rules && missing.derivation_rules.length > 0) {
        derivable_facts.push(...missing.fact_types);
      }
    }

    const can_derive = derivable_facts.length > 0;

    // Calculate quality score (0-10)
    let quality_score = 10;
    if (missing_mandatory.length > 0) {
      quality_score -= missing_mandatory.length * 2;
    }
    if (missing_optional.length > 0) {
      quality_score -= missing_optional.length * 0.5;
    }
    quality_score = Math.max(0, Math.min(10, quality_score));

    // Check persona coverage
    const persona_coverage = (target_contract.primary_personas || []).map(persona => {
      // Find all requirements used by this persona
      const persona_requirements = [
        ...target_contract.required_facts,
        ...(target_contract.optional_facts || []),
      ].filter(req => req.personas_using?.includes(persona));

      const missing_for_persona = persona_requirements.filter(req => {
        const category_facts = available_facts.get(req.category) || [];
        return !req.fact_types.every(type =>
          category_facts.some((f: any) => f.fact_type === type || f.subtype === type)
        );
      });

      return {
        persona,
        has_required_facts: missing_for_persona.length === 0,
        missing_fact_types: missing_for_persona.flatMap(r => r.fact_types),
      };
    });

    // Quality gate failures
    const quality_gate_failures: string[] = [];
    if (missing_mandatory.length > 0 && !can_derive) {
      quality_gate_failures.push('Missing mandatory facts with no derivation path');
    }
    if (quality_score < (target_contract.min_quality_score || 7)) {
      quality_gate_failures.push(`Quality score ${quality_score} below threshold ${target_contract.min_quality_score || 7}`);
    }

    // Recommendation
    let recommendation: 'proceed' | 'derive_first' | 'collect_more';
    if (missing_mandatory.length === 0) {
      recommendation = 'proceed';
    } else if (can_derive) {
      recommendation = 'derive_first';
    } else {
      recommendation = 'collect_more';
    }

    return {
      is_ready: missing_mandatory.length === 0,
      quality_score,
      missing_mandatory_facts: missing_mandatory,
      missing_optional_facts: missing_optional,
      can_derive,
      derivable_facts,
      quality_gate_failures,
      recommendation,
      persona_coverage,
    };
  }

  /**
   * Suggest questions to collect missing facts
   */
  static suggestQuestions(missing_facts: FactRequirement[]): string[] {
    const questions: string[] = [];

    for (const req of missing_facts) {
      for (const fact_type of req.fact_types) {
        // Map fact types to natural questions
        if (fact_type === 'grade' || fact_type === 'grade_level') {
          questions.push("What grade are you currently in?");
        } else if (fact_type === 'high_school') {
          questions.push("What high school do you attend?");
        } else if (fact_type === 'target_major') {
          questions.push("What majors or fields are you interested in studying?");
        } else if (fact_type === 'target_schools') {
          questions.push("Do you have any specific colleges or universities in mind?");
        } else if (fact_type === 'current_activities') {
          questions.push("What extracurricular activities are you currently involved in?");
        } else if (fact_type === 'time_commitments') {
          questions.push("How much time do you dedicate to your activities each week?");
        } else {
          questions.push(`Could you tell me about your ${fact_type.replace(/_/g, ' ')}?`);
        }
      }
    }

    return questions;
  }

  /**
   * Get all registered agent IDs
   */
  static getAllAgentIds(): string[] {
    return Array.from(this.requirements.keys());
  }

  /**
   * Clear all registrations (for testing)
   */
  static clear(): void {
    this.requirements.clear();
  }
}

/**
 * GamePlan Agent V3 Fact Contract
 * Based on GAMEPLAN_AGENT_TECH_SPEC.md and gap analysis patterns
 */
export const GAMEPLAN_AGENT_V3_CONTRACT: AgentFactContract = {
  agent_id: 'gameplan-agent-v3',
  agent_version: 'v18.0',

  primary_personas: [
    CoachingPersona.STRATEGIC_ARCHITECT,
    CoachingPersona.TIME_MATHEMATICIAN,
    CoachingPersona.ADMISSIONS_OFFICER,
  ],

  required_facts: [
    // STUDENT_PROFILE - Strategic Architect + Admissions Officer
    {
      category: FactCategory.STUDENT_PROFILE,
      fact_types: ['grade', 'grade_level'],
      is_mandatory: true,
      purpose: FactPurpose.TIMELINE_GENERATION,
      personas_using: [CoachingPersona.STRATEGIC_ARCHITECT, CoachingPersona.TIME_MATHEMATICIAN],
      quality_threshold: 10,
      student_specific: true,
    },
    {
      category: FactCategory.STUDENT_PROFILE,
      fact_types: ['high_school'],
      is_mandatory: true,
      purpose: FactPurpose.INTERNAL_COMPETITIVENESS_SCORE,
      personas_using: [CoachingPersona.ADMISSIONS_OFFICER],
      quality_threshold: 8,
      student_specific: true,
    },
    {
      category: FactCategory.STUDENT_PROFILE,
      fact_types: ['target_major', 'target_field'],
      is_mandatory: true,
      purpose: FactPurpose.PORTFOLIO_MULTIPLICATION,
      personas_using: [CoachingPersona.STRATEGIC_ARCHITECT, CoachingPersona.NETWORK_CONNECTOR],
      quality_threshold: 8,
      student_specific: true,
    },

    // ASSESSMENT_DATA - All personas
    {
      category: FactCategory.ASSESSMENT_DATA,
      fact_types: ['unique_narrative', 'identity_fusion'],
      is_mandatory: true,
      purpose: FactPurpose.ACTIVITY_RECOMMENDATION,
      personas_using: [
        CoachingPersona.STRATEGIC_ARCHITECT,
        CoachingPersona.THERAPIST,
        CoachingPersona.CONFIDENCE_ALCHEMIST,
      ],
      quality_threshold: 9,
      student_specific: true,
      track_over_time: true,
    },
    {
      category: FactCategory.ASSESSMENT_DATA,
      fact_types: ['rubric_scores', 'ivy_score'],
      is_mandatory: true,
      purpose: FactPurpose.HIDDEN_PROBABILITY_CALCULATION,
      personas_using: [CoachingPersona.ADMISSIONS_OFFICER],
      quality_threshold: 9,
      student_specific: true,
    },
    {
      category: FactCategory.ASSESSMENT_DATA,
      fact_types: ['gaps', 'weak_spots'],
      is_mandatory: true,
      purpose: FactPurpose.ACTIVITY_RECOMMENDATION,
      personas_using: [CoachingPersona.STRATEGIC_ARCHITECT],
      quality_threshold: 8,
      student_specific: true,
    },
  ],

  optional_facts: [
    // ACTIVITY_DATA - Time Mathematician + Strategic Architect
    {
      category: FactCategory.ACTIVITY_DATA,
      fact_types: ['current_activities', 'extracurriculars'],
      is_mandatory: false,
      purpose: FactPurpose.PORTFOLIO_MULTIPLICATION,
      personas_using: [CoachingPersona.STRATEGIC_ARCHITECT, CoachingPersona.TIME_MATHEMATICIAN],
      derivation_rules: ['estimate_from_narrative'],
      quality_threshold: 6,
      student_specific: true,
    },
    {
      category: FactCategory.ACTIVITY_DATA,
      fact_types: ['time_commitments', 'weekly_hours'],
      is_mandatory: false,
      purpose: FactPurpose.TIMELINE_GENERATION,
      personas_using: [CoachingPersona.TIME_MATHEMATICIAN],
      derivation_rules: ['estimate_from_grade_and_activities'],
      quality_threshold: 5,
      student_specific: true,
    },

    // GOAL_DATA - Admissions Officer (hidden calculations)
    {
      category: FactCategory.GOAL_DATA,
      fact_types: ['target_schools', 'dream_schools'],
      is_mandatory: false,
      purpose: FactPurpose.HIDDEN_PROBABILITY_CALCULATION,
      personas_using: [CoachingPersona.ADMISSIONS_OFFICER, CoachingPersona.PARENT_WHISPERER],
      derivation_rules: ['infer_from_major_and_profile'],
      quality_threshold: 5,
      student_specific: true,
    },
  ],

  derived_facts: [
    {
      output_fact_type: 'current_quarter',
      output_category: FactCategory.STUDENT_PROFILE,
      input_fact_types: ['grade'],
      derivation_rule_id: 'calculate_quarter_from_grade',
      confidence_threshold: 0.95,
      personas_using: [CoachingPersona.TIME_MATHEMATICIAN],
    },
    {
      output_fact_type: 'time_capacity',
      output_category: FactCategory.ACTIVITY_DATA,
      input_fact_types: ['grade', 'current_activities'],
      derivation_rule_id: 'calculate_time_capacity',
      confidence_threshold: 0.75,
      personas_using: [CoachingPersona.TIME_MATHEMATICIAN],
    },
    {
      output_fact_type: 'competitiveness_tier',
      output_category: FactCategory.ASSESSMENT_DATA,
      input_fact_types: ['ivy_score', 'high_school'],
      derivation_rule_id: 'calculate_competitiveness',
      confidence_threshold: 0.80,
      personas_using: [CoachingPersona.ADMISSIONS_OFFICER],
    },
  ],

  quality_gates: [
    'Has unique narrative for strategic positioning',
    'Has grade level for 93-week timeline calculation',
    'Has rubric scores for gap prioritization',
    'Persona coverage: Strategic Architect (100%)',
    'Persona coverage: Time Mathematician (>=80%)',
    'Persona coverage: Admissions Officer (>=80%)',
    'Quality score >= 7/10',
  ],

  min_quality_score: 7,

  adaptation_rules: [
    'grade_11_12_requires_urgency_mode',
    'shy_personality_requires_confidence_scaffolding',
    'high_capacity_enables_portfolio_multiplication',
  ],
};

// Auto-register GamePlan Agent V3 contract
AgentFactRequirementsRegistry.register(GAMEPLAN_AGENT_V3_CONTRACT);

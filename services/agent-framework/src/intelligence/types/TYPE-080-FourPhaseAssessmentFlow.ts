/**
 * TYPE-080: 4-Phase Assessment Flow Intelligence
 *
 * Purpose: Orchestrate comprehensive student assessment through 4 progressive phases
 * with readiness gates and adaptive questioning strategies.
 *
 * Framework: Discovery → Narrative → Strategy → Time (4-Phase Flow)
 * - Phase 1 (Discovery): Identity, passions, strengths, constraints (weeks 1-2)
 * - Phase 2 (Narrative): Unique story, positioning, authentic voice (weeks 3-4)
 * - Phase 3 (Strategy): Target schools, gaps, roadmap (weeks 5-6)
 * - Phase 4 (Time): Capacity, priorities, execution plan (weeks 7-8)
 *
 * Core Algorithm:
 * 1. Detect current assessment phase and completion %
 * 2. Check readiness gates (min data required to advance)
 * 3. Generate phase-specific questions (adaptive based on gaps)
 * 4. Validate phase completion before advancement
 * 5. Synthesize cross-phase insights
 *
 * Intelligence Extraction: W001-W008 coaching sessions
 * (Jenny's systematic assessment approach with Huda)
 *
 * Created: 2025-10-29
 * Version: v23.0 AssessmentAgent Intelligence Types
 */

import { IntelligenceType, IntelligenceResult, AgentQuery, FactSet, FactCategory } from './BaseIntelligenceType.js';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Assessment Phase
 */
type AssessmentPhase = 'discovery' | 'narrative' | 'strategy' | 'time';

/**
 * Phase Requirements - Data needed to complete each phase
 */
interface PhaseRequirements {
  phase: AssessmentPhase;
  required_data: string[];
  optional_data: string[];
  completion_threshold: number; // % of required data needed (0-1)
}

/**
 * Phase Status
 */
interface PhaseStatus {
  phase: AssessmentPhase;
  completion_percentage: number; // 0-100
  is_complete: boolean;
  missing_data: string[];
  collected_data: string[];
  readiness_gate_passed: boolean;
}

/**
 * Adaptive Question
 */
interface AdaptiveQuestion {
  question: string;
  category: string; // What this question reveals
  priority: 'P0' | 'P1' | 'P2';
  rationale: string; // Why ask this now
  follow_ups?: string[]; // Conditional follow-ups
}

/**
 * Phase Transition
 */
interface PhaseTransition {
  from_phase: AssessmentPhase | null;
  to_phase: AssessmentPhase;
  readiness_score: number; // 0-1
  can_transition: boolean;
  blocking_factors?: string[];
  recommendations: string[];
}

/**
 * Complete 4-Phase Assessment Result
 */
interface FourPhaseAssessmentResult {
  student_id: string;
  current_phase: AssessmentPhase;
  phase_statuses: PhaseStatus[];
  overall_completion: number; // 0-100
  next_phase_transition: PhaseTransition | null;
  adaptive_questions: AdaptiveQuestion[];
  cross_phase_insights: string[];
  next_actions: string[];
}

// ============================================================================
// 4-PHASE ASSESSMENT FLOW INTELLIGENCE
// ============================================================================

export class FourPhaseAssessmentFlow implements IntelligenceType {
  type_id = 'TYPE-080';
  name = '4-Phase Assessment Flow';
  category: 'UNIVERSAL' | 'DOMAIN_SPECIFIC' = 'DOMAIN_SPECIFIC';
  description = 'Orchestrates comprehensive student assessment through 4 progressive phases with readiness gates';

  components = {
    framework: {
      name: 'Discovery → Narrative → Strategy → Time',
      description: '4-phase progressive assessment with readiness gates and adaptive questioning',
      mental_model: 'Layer by layer revelation: Who are you? → What\'s your story? → What\'s the plan? → How will you execute?',
    },
    tactics: [
      {
        name: 'Phase Progression',
        description: 'Systematic advancement through assessment phases',
        steps: [
          'Check current phase completion %',
          'Validate readiness gate (min required data)',
          'If ready: transition to next phase',
          'If not: generate gap-filling questions',
        ],
      },
      {
        name: 'Adaptive Questioning',
        description: 'Generate questions based on current gaps',
        steps: [
          'Identify missing data in current phase',
          'Prioritize questions by impact (P0 > P1 > P2)',
          'Adapt follow-ups based on previous answers',
          'Avoid redundant questions (check collected data)',
        ],
      },
    ],
    techniques: [],
    chips: [],
    metrics: {
      success_criteria: [
        'All phases reach ≥80% completion',
        'Readiness gates passed with ≥70% required data',
        'Adaptive questions fill critical gaps',
      ],
      validation: 'Student completes all 4 phases with comprehensive data',
    },
    triggers: {
      conditions: ['assessment', 'evaluate', 'understand', 'profile', 'phase'],
    },
  };

  // ==========================================================================
  // CORE CONSTANTS
  // ==========================================================================

  /**
   * Phase requirements (data needed per phase)
   */
  private readonly PHASE_REQUIREMENTS: Record<AssessmentPhase, PhaseRequirements> = {
    discovery: {
      phase: 'discovery',
      required_data: [
        'grade', 'high_school', 'interests', 'activities',
        'target_major', 'target_colleges',
      ],
      optional_data: [
        'personality_type', 'friend_group_size', 'career_goals',
      ],
      completion_threshold: 0.7, // 70% of required data
    },
    narrative: {
      phase: 'narrative',
      required_data: [
        'unique_experiences', 'core_values', 'challenges_overcome', 'defining_moments',
        'identity_keywords', 'authentic_voice', 'standout_qualities',
      ],
      optional_data: [
        'family_immigration_story', 'cultural_background', 'adversity_faced',
      ],
      completion_threshold: 0.7,
    },
    strategy: {
      phase: 'strategy',
      required_data: [
        'target_schools', 'academic_gaps', 'ec_gaps', 'awards_gaps',
        'competitive_positioning', 'reach_match_safety_schools', 'application_strategy',
      ],
      optional_data: [
        'legacy_connections', 'recruited_athlete_status', 'geographic_diversity',
      ],
      completion_threshold: 0.75,
    },
    time: {
      phase: 'time',
      required_data: [
        'weekly_schedule', 'time_constraints', 'available_hours', 'priority_activities',
        'execution_capacity', 'deadline_awareness', 'commitment_level',
      ],
      optional_data: [
        'family_obligations', 'work_commitments', 'health_constraints',
      ],
      completion_threshold: 0.7,
    },
  };

  /**
   * Phase order
   */
  private readonly PHASE_ORDER: AssessmentPhase[] = ['discovery', 'narrative', 'strategy', 'time'];

  // ==========================================================================
  // MAIN INTELLIGENCE INTERFACE
  // ==========================================================================

  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {
    const studentId = query.entity_id;

    // Detect current phase and statuses
    const currentPhase = this.detectCurrentPhase(facts);
    const phaseStatuses = this.calculatePhaseStatuses(facts);

    // Calculate overall completion
    const overallCompletion = this.calculateOverallCompletion(phaseStatuses);

    // Check if ready for next phase
    const nextPhaseTransition = this.checkPhaseTransition(currentPhase, phaseStatuses);

    // Generate adaptive questions for current phase
    const adaptiveQuestions = this.generateAdaptiveQuestions(currentPhase, phaseStatuses, facts);

    // Extract cross-phase insights
    const crossPhaseInsights = this.extractCrossPhaseInsights(phaseStatuses, facts);

    // Generate next actions
    const nextActions = this.generateNextActions(currentPhase, nextPhaseTransition, phaseStatuses);

    const result: FourPhaseAssessmentResult = {
      student_id: studentId,
      current_phase: currentPhase,
      phase_statuses: phaseStatuses,
      overall_completion: overallCompletion,
      next_phase_transition: nextPhaseTransition,
      adaptive_questions: adaptiveQuestions,
      cross_phase_insights: crossPhaseInsights,
      next_actions: nextActions,
    };

    return {
      type_id: this.type_id,
      component: 'four_phase_assessment_flow',
      triggered: true,
      confidence: 0.9,
      data: result,
    };
  }

  // ==========================================================================
  // PHASE DETECTION & STATUS
  // ==========================================================================

  /**
   * Detect current assessment phase
   */
  private detectCurrentPhase(facts: FactSet): AssessmentPhase {
    const phaseStatuses = this.calculatePhaseStatuses(facts);

    // Find first incomplete phase
    for (const phase of this.PHASE_ORDER) {
      const status = phaseStatuses.find(s => s.phase === phase);
      if (status && !status.is_complete) {
        return phase;
      }
    }

    // All complete, return last phase
    return 'time';
  }

  /**
   * Calculate status for all phases
   */
  private calculatePhaseStatuses(facts: FactSet): PhaseStatus[] {
    return this.PHASE_ORDER.map(phase => this.calculatePhaseStatus(phase, facts));
  }

  /**
   * Calculate status for single phase
   */
  private calculatePhaseStatus(phase: AssessmentPhase, facts: FactSet): PhaseStatus {
    const requirements = this.PHASE_REQUIREMENTS[phase];
    const allFacts = facts.getAllFacts();

    console.log(`[TYPE-080] Calculating phase status for: ${phase}`);
    console.log(`[TYPE-080] Total facts loaded: ${allFacts.length}`);
    console.log(`[TYPE-080] Required data fields: ${requirements.required_data.join(', ')}`);

    // Check which required data exists
    const collectedData: string[] = [];
    const missingData: string[] = [];

    for (const dataKey of requirements.required_data) {
      // Check if field exists as actual property in fact.value (canonical schema)
      const hasData = allFacts.some(f => {
        if (typeof f.value === 'object' && f.value !== null) {
          // Direct property check (e.g., value.grade, value.high_school)
          const hasDirectProperty = dataKey in f.value;

          // Also check if property has a non-empty value
          if (hasDirectProperty) {
            const val = (f.value as any)[dataKey];
            // Consider data collected if: number (including 0), non-empty string, non-empty array, boolean
            if (typeof val === 'number' || typeof val === 'boolean') {
              console.log(`[TYPE-080] ✅ Found ${dataKey} = ${val} (${typeof val})`);
              return true;
            }
            if (typeof val === 'string' && val.length > 0) {
              console.log(`[TYPE-080] ✅ Found ${dataKey} = "${val}"`);
              return true;
            }
            if (Array.isArray(val) && val.length > 0) {
              console.log(`[TYPE-080] ✅ Found ${dataKey} = [${val.length} items]`);
              return true;
            }
          }
        }
        return false;
      });

      if (hasData) {
        collectedData.push(dataKey);
      } else {
        console.log(`[TYPE-080] ❌ Missing: ${dataKey}`);
        missingData.push(dataKey);
      }
    }

    const completionPercentage = (collectedData.length / requirements.required_data.length) * 100;
    const isComplete = completionPercentage >= (requirements.completion_threshold * 100);
    const readinessGatePassed = completionPercentage >= 70; // Min 70% to advance

    console.log(`[TYPE-080] Phase ${phase} status:`, {
      collected: collectedData.length,
      missing: missingData.length,
      completion: `${completionPercentage.toFixed(0)}%`,
      collected_fields: collectedData.join(', '),
      missing_fields: missingData.slice(0, 3).join(', ')
    });

    return {
      phase,
      completion_percentage: completionPercentage,
      is_complete: isComplete,
      missing_data: missingData,
      collected_data: collectedData,
      readiness_gate_passed: readinessGatePassed,
    };
  }

  /**
   * Calculate overall completion across all phases
   */
  private calculateOverallCompletion(phaseStatuses: PhaseStatus[]): number {
    const total = phaseStatuses.reduce((sum, status) => sum + status.completion_percentage, 0);
    return total / phaseStatuses.length;
  }

  // ==========================================================================
  // PHASE TRANSITIONS
  // ==========================================================================

  /**
   * Check if ready to transition to next phase
   */
  private checkPhaseTransition(
    currentPhase: AssessmentPhase,
    phaseStatuses: PhaseStatus[]
  ): PhaseTransition | null {
    const currentStatus = phaseStatuses.find(s => s.phase === currentPhase);
    if (!currentStatus) return null;

    // Check if current phase is complete enough to advance
    const currentIndex = this.PHASE_ORDER.indexOf(currentPhase);
    const nextPhase = this.PHASE_ORDER[currentIndex + 1];

    if (!nextPhase) {
      // Already on last phase
      return null;
    }

    const readinessScore = currentStatus.completion_percentage / 100;
    const canTransition = currentStatus.readiness_gate_passed;

    const blockingFactors: string[] = [];
    if (!canTransition) {
      blockingFactors.push(`Current phase (${currentPhase}) only ${currentStatus.completion_percentage.toFixed(0)}% complete (need ≥70%)`);
      blockingFactors.push(`Missing: ${currentStatus.missing_data.slice(0, 3).join(', ')}`);
    }

    const recommendations: string[] = [];
    if (canTransition) {
      recommendations.push(`✅ Ready to advance to ${nextPhase} phase!`);
      recommendations.push(`Complete ${currentPhase} remaining items first for best results`);
    } else {
      recommendations.push(`Focus on completing ${currentPhase} phase (${currentStatus.missing_data.length} items missing)`);
      recommendations.push(`Priority: ${currentStatus.missing_data.slice(0, 3).join(', ')}`);
    }

    return {
      from_phase: currentPhase,
      to_phase: nextPhase,
      readiness_score: readinessScore,
      can_transition: canTransition,
      blocking_factors: blockingFactors.length > 0 ? blockingFactors : undefined,
      recommendations,
    };
  }

  // ==========================================================================
  // ADAPTIVE QUESTIONING
  // ==========================================================================

  /**
   * Generate adaptive questions for current phase
   */
  private generateAdaptiveQuestions(
    currentPhase: AssessmentPhase,
    phaseStatuses: PhaseStatus[],
    facts: FactSet
  ): AdaptiveQuestion[] {
    const currentStatus = phaseStatuses.find(s => s.phase === currentPhase);
    if (!currentStatus) return [];

    const questions: AdaptiveQuestion[] = [];

    // Generate questions for missing data (prioritized)
    const priorityMissing = currentStatus.missing_data.slice(0, 5); // Top 5

    for (const dataKey of priorityMissing) {
      const question = this.generateQuestionForDataKey(currentPhase, dataKey);
      if (question) {
        questions.push(question);
      }
    }

    return questions;
  }

  /**
   * Generate question for specific data key
   */
  private generateQuestionForDataKey(phase: AssessmentPhase, dataKey: string): AdaptiveQuestion | null {
    const questionMap: Record<string, Record<string, AdaptiveQuestion>> = {
      discovery: {
        grade: {
          question: 'What grade are you in right now?',
          category: 'Academic Foundation',
          priority: 'P0',
          rationale: 'Essential baseline for timeline planning',
        },
        high_school: {
          question: 'What school do you currently attend?',
          category: 'Academic Foundation',
          priority: 'P0',
          rationale: 'Context for rigor and opportunities',
        },
        interests: {
          question: 'What subjects make you lose track of time? What topics do you find yourself researching outside of class?',
          category: 'Interests',
          priority: 'P0',
          rationale: 'Critical for understanding intellectual passions and hobbies',
        },
        activities: {
          question: 'Walk me through your activities outside of school. What do you spend your time on and why?',
          category: 'Activities',
          priority: 'P0',
          rationale: 'Reveals extracurriculars and time allocation',
        },
        target_major: {
          question: 'What do you think you might want to study in college? Any major or field that excites you?',
          category: 'Academic Goals',
          priority: 'P1',
          rationale: 'Helps frame narrative and school selection',
        },
        target_colleges: {
          question: 'Do you have any dream schools or colleges you are thinking about?',
          category: 'College Goals',
          priority: 'P1',
          rationale: 'Informs strategic planning and positioning',
        },
      },
      narrative: {
        unique_experiences: {
          question: 'What experiences have shaped who you are? What moments defined your journey?',
          category: 'Unique Experiences',
          priority: 'P0',
          rationale: 'Foundation of authentic narrative',
        },
        core_values: {
          question: 'What principles guide your decisions? What do you stand for?',
          category: 'Core Values',
          priority: 'P0',
          rationale: 'Essential for narrative coherence',
        },
        challenges_overcome: {
          question: 'What obstacles have you faced, and how did you navigate them?',
          category: 'Narrative Depth',
          priority: 'P0',
          rationale: 'Reveals resilience and growth',
        },
        defining_moments: {
          question: 'If you had to pick one or two moments that made you who you are today, what would they be?',
          category: 'Narrative Depth',
          priority: 'P0',
          rationale: 'Core essay material',
        },
        identity_keywords: {
          question: 'How would your closest friends describe you in 3-5 words?',
          category: 'Identity Formation',
          priority: 'P1',
          rationale: 'External validation of self-perception',
        },
      },
      strategy: {
        target_schools: {
          question: 'What schools excite you and why? What programs/opportunities align with your goals?',
          category: 'Target Schools',
          priority: 'P0',
          rationale: 'Drives entire strategic plan',
        },
        academic_gaps: {
          question: 'Looking at your transcript, where do you see room for growth academically?',
          category: 'Academic Gaps',
          priority: 'P1',
          rationale: 'Identifies areas for improvement',
        },
      },
      time: {
        weekly_schedule: {
          question: 'Walk me through a typical week. What takes up your time?',
          category: 'Weekly Schedule',
          priority: 'P0',
          rationale: 'Reality check on capacity',
        },
        available_hours: {
          question: 'How many hours per week can you realistically dedicate to priority activities?',
          category: 'Available Hours',
          priority: 'P0',
          rationale: 'Capacity planning foundation',
        },
      },
    };

    return questionMap[phase]?.[dataKey] || null;
  }

  // ==========================================================================
  // INSIGHTS & ACTIONS
  // ==========================================================================

  /**
   * Extract cross-phase insights
   */
  private extractCrossPhaseInsights(phaseStatuses: PhaseStatus[], facts: FactSet): string[] {
    const insights: string[] = [];

    const discoveryComplete = phaseStatuses.find(s => s.phase === 'discovery')?.is_complete;
    const narrativeComplete = phaseStatuses.find(s => s.phase === 'narrative')?.is_complete;
    const strategyComplete = phaseStatuses.find(s => s.phase === 'strategy')?.is_complete;
    const timeComplete = phaseStatuses.find(s => s.phase === 'time')?.is_complete;

    if (discoveryComplete && narrativeComplete) {
      insights.push('Strong foundation: Identity (Discovery) + Story (Narrative) aligned');
    }

    if (narrativeComplete && strategyComplete) {
      insights.push('Narrative → Strategy coherence validated');
    }

    if (strategyComplete && !timeComplete) {
      insights.push('⚠️ Strategy defined but execution capacity not assessed - reality check needed');
    }

    const completedPhases = phaseStatuses.filter(s => s.is_complete).length;
    if (completedPhases === 4) {
      insights.push('🎉 Comprehensive assessment complete! Ready for strategic execution.');
    }

    return insights;
  }

  /**
   * Generate next actions
   */
  private generateNextActions(
    currentPhase: AssessmentPhase,
    nextPhaseTransition: PhaseTransition | null,
    phaseStatuses: PhaseStatus[]
  ): string[] {
    const actions: string[] = [];

    const currentStatus = phaseStatuses.find(s => s.phase === currentPhase);

    if (!currentStatus) return actions;

    if (nextPhaseTransition?.can_transition) {
      actions.push(`✅ Complete ${currentPhase} phase remaining items (${currentStatus.missing_data.length} left)`);
      actions.push(`→ Then advance to ${nextPhaseTransition.to_phase} phase`);
    } else {
      actions.push(`📋 Complete ${currentPhase} phase (${currentStatus.completion_percentage.toFixed(0)}% done)`);
      actions.push(`Priority: ${currentStatus.missing_data.slice(0, 3).join(', ')}`);
    }

    // Check for stalled phases
    const stalledPhases = phaseStatuses.filter(s => s.completion_percentage > 0 && s.completion_percentage < 50);
    if (stalledPhases.length > 0) {
      actions.push(`⚠️ Resume incomplete phases: ${stalledPhases.map(s => s.phase).join(', ')}`);
    }

    return actions;
  }
}

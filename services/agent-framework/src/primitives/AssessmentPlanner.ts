/**
 * v15.3 Assessment Planner
 *
 * Date: 2025-10-28
 * Purpose: Autonomous 4-phase assessment planning with 27-layer execution
 * Architecture: Implements Planner<AssessmentGoal, AssessmentPhase>
 *
 * Assessment Flow (Jenny's proven pattern from 11 real sessions):
 * 1. Discovery Phase (Layers 1-7): Rapport + initial data gathering
 * 2. Narrative Phase (Layers 8-15): Identity fusion + story extraction
 * 3. Strategy Phase (Layers 16-22): Gap analysis + prioritization
 * 4. Time Phase (Layers 23-27): Timeline + next steps
 *
 * Critical Moment: Minute 12:53 - Synthesis (identity creation from chaos)
 *
 * @module primitives/AssessmentPlanner
 */

import { Planner } from './types';
import { CoachingIntelligence, Framework } from '../intelligence/CoachingIntelligenceLoader';
import { EQProfile } from '../intelligence/EQProfileLoader';

// ============================================================================
// TYPES: Assessment Planning
// ============================================================================

export interface AssessmentGoal {
  student_id: string;
  trigger: 'student_onboarded' | 'manual_assessment' | 'reassessment';
  context: {
    class_year: number;         // 9-12
    current_week: number;        // 1-93
    prior_sessions: number;      // 0 for new students
    student_archetype?: string;  // From intake or prior data
  };
}

export interface AssessmentPhase {
  phase_number: number;          // 1-4
  phase_name: string;            // discovery, narrative, strategy, time
  layers: number[];              // Which of 27 layers (e.g., [1,2,3,4,5,6,7])
  duration_estimate_minutes: number;
  objectives: string[];          // What to accomplish
  frameworks_to_introduce: string[];  // Which frameworks apply
  tactics_to_use: string[];      // Which coaching tactics
  questions_to_ask: string[];    // Phase-specific questions
  success_criteria: string[];    // How to know phase succeeded
  synthesis_required: boolean;   // True for phase 2 (minute 12:53)
}

export interface AssessmentPlan {
  goal: AssessmentGoal;
  phases: AssessmentPhase[];
  total_layers: number;          // Always 27
  estimated_duration_minutes: number;  // ~40-50 minutes
  coaching_intelligence_used: string[];  // Which student profiles referenced
  eq_adaptations: any;           // EQ adjustments based on context
  synthesis_moment_timing: string;  // "Phase 2, minute 12:53"
}

// ============================================================================
// ASSESSMENT PLANNER IMPLEMENTATION
// ============================================================================

/**
 * AssessmentPlanner: Autonomous 4-phase assessment orchestration
 *
 * Uses coaching intelligence from 11 real sessions to plan optimal assessment flow
 */
export class AssessmentPlanner implements Planner<AssessmentGoal, AssessmentPhase> {
  private coachingIntelligence: CoachingIntelligence[] = [];
  private eqProfile: EQProfile | null = null;

  constructor(
    coachingIntelligence?: CoachingIntelligence[],
    eqProfile?: EQProfile
  ) {
    this.coachingIntelligence = coachingIntelligence || [];
    this.eqProfile = eqProfile || null;
  }

  /**
   * Plan autonomous 4-phase assessment
   *
   * @param goal - Assessment goal with student context
   * @param context - Additional context (student profile, prior data)
   * @returns Assessment plan with 4 phases, 27 layers
   */
  async plan(goal: AssessmentGoal, context?: any): Promise<AssessmentPhase[]> {
    // Phase 1: Discovery (Layers 1-7) - Rapport + Data Gathering
    const phase1 = await this.planDiscoveryPhase(goal, context);

    // Phase 2: Narrative (Layers 8-15) - Identity Fusion + Story
    const phase2 = await this.planNarrativePhase(goal, context);

    // Phase 3: Strategy (Layers 16-22) - Gap Analysis + Priorities
    const phase3 = await this.planStrategyPhase(goal, context);

    // Phase 4: Time (Layers 23-27) - Timeline + Next Steps
    const phase4 = await this.planTimePhase(goal, context);

    return [phase1, phase2, phase3, phase4];
  }

  /**
   * Decompose plan into sub-goals
   * (Each phase is a sub-goal)
   */
  async decompose(plan: AssessmentPhase[]): Promise<AssessmentPhase[]> {
    // Already decomposed into 4 phases
    return plan;
  }

  /**
   * Validate assessment plan
   */
  async validate(plan: AssessmentPhase[]): Promise<boolean> {
    // Validation checks
    if (plan.length !== 4) {
      console.warn(`[AssessmentPlanner] Invalid plan: Expected 4 phases, got ${plan.length}`);
      return false;
    }

    const totalLayers = plan.reduce((sum, phase) => sum + phase.layers.length, 0);
    if (totalLayers !== 27) {
      console.warn(`[AssessmentPlanner] Invalid plan: Expected 27 layers, got ${totalLayers}`);
      return false;
    }

    // Check synthesis moment is in phase 2
    const phase2 = plan[1];
    if (!phase2.synthesis_required) {
      console.warn(`[AssessmentPlanner] Missing synthesis moment in Phase 2`);
      return false;
    }

    return true;
  }

  // ============================================================================
  // PHASE PLANNING METHODS
  // ============================================================================

  /**
   * Phase 1: Discovery (Layers 1-7)
   * Objective: Build rapport + gather initial diagnostic data
   */
  private async planDiscoveryPhase(
    goal: AssessmentGoal,
    context?: any
  ): Promise<AssessmentPhase> {
    // Get relevant questions from coaching intelligence
    const questions = this.getQuestionsForPhase('discovery');

    // Get frameworks that apply early (e.g., Growth Mindset)
    const frameworks = this.getFrameworksForPhase('discovery');

    // Get tactics for rapport building
    const tactics = this.getTacticsForPhase('rapport_building', 'initial_probing');

    return {
      phase_number: 1,
      phase_name: 'discovery',
      layers: [1, 2, 3, 4, 5, 6, 7],
      duration_estimate_minutes: 10,
      objectives: [
        'Establish credibility in 27 seconds',
        'Build psychological safety',
        'Gather diagnostic data (personality, capacity, social style)',
        'Identify initial interests and passions',
        'Assess parent anxiety level',
        'Understand current academic standing',
        'Probe for hidden barriers',
      ],
      frameworks_to_introduce: frameworks,
      tactics_to_use: tactics,
      questions_to_ask: questions,
      success_criteria: [
        'Student feels heard and understood',
        'Coach has diagnostic hypothesis',
        'Initial passion areas identified',
        'Parent dynamics understood',
      ],
      synthesis_required: false,
    };
  }

  /**
   * Phase 2: Narrative (Layers 8-15)
   * Objective: Extract identity fusion + unique positioning
   * CRITICAL: Minute 12:53 - Synthesis moment (identity from chaos)
   */
  private async planNarrativePhase(
    goal: AssessmentGoal,
    context?: any
  ): Promise<AssessmentPhase> {
    const questions = this.getQuestionsForPhase('narrative');
    const frameworks = this.getFrameworksForPhase('narrative');
    const tactics = this.getTacticsForPhase('narrative_extraction', 'reframing', 'validation');

    return {
      phase_number: 2,
      phase_name: 'narrative',
      layers: [8, 9, 10, 11, 12, 13, 14, 15],
      duration_estimate_minutes: 15,
      objectives: [
        'Extract scattered interests and convert to coherent identity',
        'Identify narrative thread connecting experiences',
        'Discover unique positioning vs peers',
        'Uncover authentic passion (not parent-driven)',
        'Find identity fusion (e.g., Film × CS → Digital Storyteller)',
        '🎯 SYNTHESIS MOMENT (minute 12:53): Create identity from chaos',
        'Validate identity resonance with student',
        'Establish confidence trajectory',
      ],
      frameworks_to_introduce: frameworks,
      tactics_to_use: tactics,
      questions_to_ask: questions,
      success_criteria: [
        'Identity fusion articulated',
        'Student recognizes themselves in the narrative',
        'Narrative thread connects past experiences to future',
        'Unique positioning vs peers clear',
        'Student expresses excitement about identity',
      ],
      synthesis_required: true,  // 🔥 CRITICAL MOMENT
    };
  }

  /**
   * Phase 3: Strategy (Layers 16-22)
   * Objective: Gap analysis + strategic prioritization
   */
  private async planStrategyPhase(
    goal: AssessmentGoal,
    context?: any
  ): Promise<AssessmentPhase> {
    const questions = this.getQuestionsForPhase('strategy');
    const frameworks = this.getFrameworksForPhase('strategy');
    const tactics = this.getTacticsForPhase('strategic_thinking', 'prioritization', 'transparency');

    return {
      phase_number: 3,
      phase_name: 'strategy',
      layers: [16, 17, 18, 19, 20, 21, 22],
      duration_estimate_minutes: 12,
      objectives: [
        'Calculate rubric scores (current vs target = 25)',
        'Identify gap and priority areas',
        'Determine high-ROI opportunities',
        'Assess time architecture (weeks remaining)',
        'Recommend strategic interventions',
        'Prioritize based on impact × feasibility',
        'Identify barriers to execution',
      ],
      frameworks_to_introduce: frameworks,
      tactics_to_use: tactics,
      questions_to_ask: questions,
      success_criteria: [
        'Gap clearly quantified (e.g., current: 12, target: 25, gap: 13)',
        'Top 3 priority areas identified',
        'High-ROI opportunities mapped to identity',
        'Student understands strategic rationale',
        'Barriers surfaced and addressed',
      ],
      synthesis_required: false,
    };
  }

  /**
   * Phase 4: Time (Layers 23-27)
   * Objective: Timeline + immediate next steps
   */
  private async planTimePhase(
    goal: AssessmentGoal,
    context?: any
  ): Promise<AssessmentPhase> {
    const questions = this.getQuestionsForPhase('time');
    const frameworks = this.getFrameworksForPhase('time');
    const tactics = this.getTacticsForPhase('action_orientation', 'commitment_building');

    return {
      phase_number: 4,
      phase_name: 'time',
      layers: [23, 24, 25, 26, 27],
      duration_estimate_minutes: 8,
      objectives: [
        'Map timeline from current week to graduation',
        'Identify critical milestones',
        'Define immediate next steps (next 2 weeks)',
        'Establish accountability structure',
        'Set expectations for coaching cadence',
        'Trigger GamePlan agent for detailed strategy',
        'Close with confidence boost',
      ],
      frameworks_to_introduce: frameworks,
      tactics_to_use: tactics,
      questions_to_ask: questions,
      success_criteria: [
        'Timeline clearly visualized',
        'Next steps concrete and actionable',
        'Student commits to first actions',
        'Assessment → GamePlan handoff triggered',
        'Student leaves energized and clear',
      ],
      synthesis_required: false,
    };
  }

  // ============================================================================
  // INTELLIGENCE LOOKUP METHODS
  // ============================================================================

  /**
   * Get questions for assessment phase from coaching intelligence
   */
  private getQuestionsForPhase(phase: string): string[] {
    if (this.coachingIntelligence.length === 0) {
      return this.getDefaultQuestionsForPhase(phase);
    }

    // Aggregate questions from all coaching intelligence
    const questionsSet = new Set<string>();

    this.coachingIntelligence.forEach(intel => {
      const phaseQuestions = intel.questions_by_phase?.[phase] || [];
      phaseQuestions.forEach(q => questionsSet.add(q));
    });

    return Array.from(questionsSet);
  }

  /**
   * Get frameworks to introduce in assessment phase
   */
  private getFrameworksForPhase(phase: string): string[] {
    if (this.coachingIntelligence.length === 0) {
      return this.getDefaultFrameworksForPhase(phase);
    }

    const frameworksSet = new Set<string>();

    this.coachingIntelligence.forEach(intel => {
      intel.frameworks_introduced?.forEach(fw => {
        // Match framework to phase based on triggers
        if (this.frameworkMatchesPhase(fw, phase)) {
          frameworksSet.add(fw.framework_name);
        }
      });
    });

    return Array.from(frameworksSet);
  }

  /**
   * Get coaching tactics for categories
   */
  private getTacticsForPhase(...categories: string[]): string[] {
    if (this.coachingIntelligence.length === 0) {
      return [];
    }

    const tacticsSet = new Set<string>();

    this.coachingIntelligence.forEach(intel => {
      categories.forEach(category => {
        const tactics = intel.coaching_tactics_observed?.[category] || [];
        tactics.forEach(t => tacticsSet.add(t));
      });
    });

    return Array.from(tacticsSet);
  }

  /**
   * Check if framework applies to phase
   */
  private frameworkMatchesPhase(framework: Framework, phase: string): boolean {
    const triggers = framework.triggers || [];

    switch (phase) {
      case 'discovery':
        return triggers.some(t =>
          t.toLowerCase().includes('rapport') ||
          t.toLowerCase().includes('opening') ||
          t.toLowerCase().includes('initial')
        );
      case 'narrative':
        return triggers.some(t =>
          t.toLowerCase().includes('identity') ||
          t.toLowerCase().includes('story') ||
          t.toLowerCase().includes('narrative')
        );
      case 'strategy':
        return triggers.some(t =>
          t.toLowerCase().includes('gap') ||
          t.toLowerCase().includes('priority') ||
          t.toLowerCase().includes('strategic')
        );
      case 'time':
        return triggers.some(t =>
          t.toLowerCase().includes('timeline') ||
          t.toLowerCase().includes('next steps') ||
          t.toLowerCase().includes('action')
        );
      default:
        return false;
    }
  }

  // ============================================================================
  // DEFAULT FALLBACKS (when coaching intelligence not available)
  // ============================================================================

  private getDefaultQuestionsForPhase(phase: string): string[] {
    const defaults: Record<string, string[]> = {
      discovery: [
        'Tell me about yourself - what are you passionate about?',
        'What's your current academic standing?',
        'What do your parents think about your college process?',
        'What are your initial thoughts about what you want to study?',
      ],
      narrative: [
        'I'm noticing a pattern here - you seem to connect A and B. Does that resonate?',
        'What draws you to both X and Y?',
        'If you could create your own major, what would it be?',
        'What makes you different from other students interested in this field?',
      ],
      strategy: [
        'Looking at where you are now vs where you need to be, what do you think the priorities are?',
        'What's preventing you from achieving X right now?',
        'If you had to pick one thing to focus on in the next 2 weeks, what would have the biggest impact?',
      ],
      time: [
        'What are you going to do in the next week based on what we discussed?',
        'What would success look like 2 weeks from now?',
        'What support do you need from me to make this happen?',
      ],
    };

    return defaults[phase] || [];
  }

  private getDefaultFrameworksForPhase(phase: string): string[] {
    const defaults: Record<string, string[]> = {
      discovery: ['Growth Mindset Framework', 'Trust-Building Framework'],
      narrative: ['Narrative Identity Framework', 'Unique Positioning Framework', 'Identity Fusion Framework'],
      strategy: ['Gap Analysis Framework', 'Strategic Prioritization Framework'],
      time: ['Time Architecture Framework', 'Commitment Framework'],
    };

    return defaults[phase] || [];
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create AssessmentPlanner with coaching intelligence
 */
export function createAssessmentPlanner(
  coachingIntelligence?: CoachingIntelligence[],
  eqProfile?: EQProfile
): AssessmentPlanner {
  return new AssessmentPlanner(coachingIntelligence, eqProfile);
}

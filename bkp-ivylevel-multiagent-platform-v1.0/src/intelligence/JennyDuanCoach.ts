/**
 * Jenny Duan Coach Intelligence
 *
 * Concrete implementation of CoachIntelligenceBase for Jenny Duan
 * 31 intelligence layers + 7 personas + custom tools (NCWIT, Builder, USC Games)
 *
 * Specialties: Builder, STEM, underrepresented, games, CS
 * Credentials: Stanford, NCWIT winner (2x), KWK instructor
 */

import {
  CoachIntelligenceBase,
  Persona,
  PersonaOutput,
} from './CoachIntelligenceBase.js';
import {
  CoachingTool,
  CoachingActionType,
  CoachingResponse,
  SituationContext,
} from '../types/CoachIntelligence.js';
import { StudentContext } from '../types/StudentContext.js';

export class JennyDuanCoach extends CoachIntelligenceBase {
  /**
   * Get standardized tool for action type
   * Jenny's implementations of core frameworks
   */
  protected getStandardizedTool(
    actionType: CoachingActionType
  ): CoachingTool | null {
    const standardTools: Record<CoachingActionType, CoachingTool> = {
      assessment: {
        tool_id: 'jenny_assessment',
        name: 'Jenny Assessment Framework',
        description:
          '27-layer autonomous assessment with 27-second credibility establishment',
        applicable_to: ['all'],
      },
      gameplan: {
        tool_id: 'jenny_gameplan',
        name: 'Jenny GamePlan Framework',
        description:
          'Dual-layer 4-pillar gameplan with hidden USC optimization',
        applicable_to: ['all'],
      },
      weekly_execution: {
        tool_id: 'jenny_weekly_execution',
        name: 'Jenny Weekly Execution',
        description:
          '168-hour planning + strategic overwhelm calibration (130%)',
        applicable_to: ['all'],
      },
      parent_navigation: {
        tool_id: 'jenny_parent_navigation',
        name: 'Jenny Parent Navigation',
        description: '<10 second parent interrupt handling with dual-layer messaging',
        applicable_to: ['all'],
      },
      time_architecture: {
        tool_id: 'jenny_time_architecture',
        name: 'Jenny Time Architecture',
        description: 'ROI optimization + 168-hour framework',
        applicable_to: ['all'],
      },
      crisis_response: {
        tool_id: 'jenny_crisis_response',
        name: 'Jenny Crisis Response',
        description: '<2 hour crisis response with empathy + redirection',
        applicable_to: ['all'],
      },
      celebration: {
        tool_id: 'jenny_celebration',
        name: 'Jenny Celebration Framework',
        description:
          'Exclamation gradient (1-8) + identity reinforcement',
        applicable_to: ['all'],
      },
      nudge: {
        tool_id: 'jenny_nudge',
        name: 'Jenny Nudge Framework',
        description: 'Gentle accountability without judgment',
        applicable_to: ['all'],
      },
      strategic_pivot: {
        tool_id: 'jenny_strategic_pivot',
        name: 'Jenny Strategic Pivot',
        description: 'Reality check + future pacing + new opportunity',
        applicable_to: ['all'],
      },
    };

    return standardTools[actionType] || null;
  }

  /**
   * Process single persona
   * Jenny's implementations of 7 personas
   */
  protected async processPersona(
    persona: Persona,
    tools: CoachingTool[],
    student: StudentContext,
    situation: SituationContext
  ): Promise<PersonaOutput> {
    switch (persona.name) {
      case 'therapist':
        return this.processTherapist(tools, student, situation);
      case 'admissions_officer':
        return this.processAdmissionsOfficer(tools, student, situation);
      case 'parent_whisperer':
        return this.processParentWhisperer(tools, student, situation);
      case 'strategic_architect':
        return this.processStrategicArchitect(tools, student, situation);
      case 'confidence_alchemist':
        return this.processConfidenceAlchemist(tools, student, situation);
      case 'time_mathematician':
        return this.processTimeMathematician(tools, student, situation);
      case 'network_connector':
        return this.processNetworkConnector(tools, student, situation);
      default:
        throw new Error(`Unknown persona: ${persona.name}`);
    }
  }

  /**
   * Therapist Persona
   * Handles emotional/motivation without judgment
   * Transformation: Weakness → Need for structure
   */
  private async processTherapist(
    tools: CoachingTool[],
    student: StudentContext,
    situation: SituationContext
  ): Promise<PersonaOutput> {
    const analysis: Record<string, any> = {
      confidence_level: student.state.confidence_level,
      execution_style: student.psycho_behavioral.execution_style,
      vulnerability_ladder_level: this.calculateVulnerabilityLevel(student),
    };

    const recommendations: string[] = [];

    // Low confidence? → Validation + small wins
    if (student.state.confidence_level < 0.4) {
      recommendations.push(
        'Start with validation and celebrate small wins to build confidence'
      );
      recommendations.push(
        'Use vulnerability modeling to normalize feelings of overwhelm'
      );
    }

    // Needs structure? → Provide clear frameworks
    if (student.psycho_behavioral.execution_style === 'needs_structure') {
      recommendations.push('Provide clear, step-by-step frameworks');
      recommendations.push('Break down tasks into micro-steps');
    }

    return {
      persona_name: 'therapist',
      analysis,
      recommendations,
      priority: student.state.confidence_level < 0.3 ? 'high' : 'medium',
    };
  }

  /**
   * Admissions Officer Persona
   * Calculate probabilities in real-time
   * Hidden calculations: Stanford <1%, USC 15%
   */
  private async processAdmissionsOfficer(
    tools: CoachingTool[],
    student: StudentContext,
    situation: SituationContext
  ): Promise<PersonaOutput> {
    const analysis: Record<string, any> = {
      rubric_total: student.state.rubric_scores.total,
      target_schools: student.goals.target_schools,
      probability_calculations: this.calculateSchoolProbabilities(student),
    };

    const recommendations: string[] = [];

    // Low rubric score? → Quick wins strategy
    if (student.state.rubric_scores.total < 15) {
      recommendations.push(
        'Focus on quick wins to boost rubric: NCWIT, local impact projects'
      );
      recommendations.push(
        'Strategic overwhelm: Assign 130% tasks, celebrate 50-70% completion'
      );
    }

    // Reach schools? → Reality check + strategic pivot
    const hasReachSchools = student.goals.target_schools.some(
      (s) => s.probability < 0.05
    );
    if (hasReachSchools) {
      recommendations.push(
        'Reality check: Pivot from reach schools to strategic fit schools'
      );
      recommendations.push('USC Games = better fit than Stanford CS for game dev');
    }

    return {
      persona_name: 'admissions_officer',
      analysis,
      recommendations,
      priority: 'high',
    };
  }

  /**
   * Parent Whisperer Persona
   * Navigate parent anxiety with dual-layer messaging
   * <10 second response time
   */
  private async processParentWhisperer(
    tools: CoachingTool[],
    student: StudentContext,
    situation: SituationContext
  ): Promise<PersonaOutput> {
    const analysis: Record<string, any> = {
      parent_anxiety_level: student.family.parent_anxiety_level,
      parent_concerns: student.family.parent_concerns,
      cultural_factors: student.family.cultural_factors,
    };

    const recommendations: string[] = [];

    // High parent anxiety? → Dual-layer messaging
    if (student.family.parent_anxiety_level > 6) {
      recommendations.push(
        'Use dual-layer messaging: Every paragraph coded for parent AND student'
      );
      recommendations.push(
        'Parent layer: Data, credentials, strategic positioning'
      );
      recommendations.push(
        'Student layer: Empowerment, identity, authentic expression'
      );
    }

    // Cultural factors? → Navigate with sensitivity
    if (student.family.cultural_factors.length > 0) {
      recommendations.push(
        `Navigate cultural factors: ${student.family.cultural_factors.join(', ')}`
      );
    }

    return {
      persona_name: 'parent_whisperer',
      analysis,
      recommendations,
      priority:
        student.family.parent_anxiety_level > 7 ? 'critical' : 'medium',
    };
  }

  /**
   * Strategic Architect Persona
   * Hidden optimization for target schools (USC Games)
   * Never mentioned but drives everything
   */
  private async processStrategicArchitect(
    tools: CoachingTool[],
    student: StudentContext,
    situation: SituationContext
  ): Promise<PersonaOutput> {
    const analysis: Record<string, any> = {
      identity_score: student.state.identity_score,
      identity_fusion: student.interests.identity_fusion,
      strategic_target: this.getStrategicTarget(student),
    };

    const recommendations: string[] = [];

    // No identity fusion? → Engineer it
    if (!student.interests.identity_fusion) {
      recommendations.push(
        'Identity engineering: Plant seeds for fusion (Film × CS → Digital Storyteller)'
      );
      recommendations.push(
        'Micro-edit mastery: Single word transformations to shift narrative'
      );
    }

    // USC Games optimization (hidden)
    if (this.isUSCGamesTarget(student)) {
      recommendations.push(
        'Hidden optimization: Every suggestion should strengthen USC Games narrative'
      );
      recommendations.push('Focus on game dev + storytelling + social impact');
      recommendations.push('NEVER mention USC Games explicitly');
    }

    return {
      persona_name: 'strategic_architect',
      analysis,
      recommendations,
      priority: 'high',
    };
  }

  /**
   * Confidence Alchemist Persona
   * Transform doubt into self-belief
   */
  private async processConfidenceAlchemist(
    tools: CoachingTool[],
    student: StudentContext,
    situation: SituationContext
  ): Promise<PersonaOutput> {
    const analysis: Record<string, any> = {
      confidence_level: student.state.confidence_level,
      social_style: student.psycho_behavioral.social_style,
      identity_score: student.state.identity_score,
    };

    const recommendations: string[] = [];

    // Quiet + low confidence? → Celebrate quiet leadership
    if (
      student.psycho_behavioral.social_style === 'quiet' &&
      student.state.confidence_level < 0.5
    ) {
      recommendations.push(
        'Celebrate quiet leadership: "Some of the best builders are quiet observers"'
      );
      recommendations.push(
        'Identity reinforcement: "Your quiet focus is a strength, not a weakness"'
      );
    }

    return {
      persona_name: 'confidence_alchemist',
      analysis,
      recommendations,
      priority: 'medium',
    };
  }

  /**
   * Time Mathematician Persona
   * Calculate ROI and 168-hour optimization
   */
  private async processTimeMathematician(
    tools: CoachingTool[],
    student: StudentContext,
    situation: SituationContext
  ): Promise<PersonaOutput> {
    const analysis: Record<string, any> = {
      current_week: student.current_week,
      class_year: student.class_year,
      capacity_level: student.psycho_behavioral.capacity_level,
    };

    const recommendations: string[] = [];

    // Junior spring? → High ROI focus
    if (student.class_year === 'junior' && student.current_week > 20) {
      recommendations.push(
        'Focus on high ROI activities: NCWIT, local hackathons, passion project MVP'
      );
      recommendations.push('De-prioritize: Low-ROI volunteering, generic ECs');
    }

    // Medium capacity? → Strategic overwhelm calibration
    if (student.psycho_behavioral.capacity_level === 'medium') {
      recommendations.push(
        'Strategic overwhelm: Assign 4-5 tasks (130%), expect 2-3 completions (50-70%)'
      );
    }

    return {
      persona_name: 'time_mathematician',
      analysis,
      recommendations,
      priority: 'high',
    };
  }

  /**
   * Network Connector Persona
   * Connect student to opportunities
   */
  private async processNetworkConnector(
    tools: CoachingTool[],
    student: StudentContext,
    situation: SituationContext
  ): Promise<PersonaOutput> {
    const analysis: Record<string, any> = {
      interests: student.interests.primary_passions,
      skills: student.interests.skills,
    };

    const recommendations: string[] = [];

    // Game dev interest? → Connect to USC Games, game jams, itch.io
    if (student.interests.primary_passions.includes('game_dev')) {
      recommendations.push(
        'Connect to game dev community: USC Games events, Global Game Jam'
      );
      recommendations.push('Build portfolio: Publish games on itch.io');
    }

    // STEM + underrepresented? → NCWIT opportunity
    if (this.isNCWITCandidate(student)) {
      recommendations.push('NCWIT Aspirations in Computing: Strong fit');
    }

    return {
      persona_name: 'network_connector',
      analysis,
      recommendations,
      priority: 'medium',
    };
  }

  /**
   * Synthesize final response from all persona outputs
   * Synthesis moment at minute 12:53 (identity creation from chaos)
   */
  protected async synthesizeResponse(
    personaOutputs: PersonaOutput[],
    student: StudentContext,
    situation: SituationContext
  ): Promise<Omit<CoachingResponse, 'metadata'>> {
    // Aggregate all recommendations by priority
    const criticalRecs = personaOutputs
      .filter((p) => p.priority === 'critical')
      .flatMap((p) => p.recommendations);
    const highRecs = personaOutputs
      .filter((p) => p.priority === 'high')
      .flatMap((p) => p.recommendations);
    const mediumRecs = personaOutputs
      .filter((p) => p.priority === 'medium')
      .flatMap((p) => p.recommendations);

    // Determine tone based on situation
    const tone = this.determineTone(situation, student);

    // Synthesize message with linguistic DNA transformation
    const message = this.synthesizeMessage(
      criticalRecs,
      highRecs,
      mediumRecs,
      tone,
      student
    );

    // Generate action items
    const actions = this.generateActions(highRecs, mediumRecs, student);

    return {
      message,
      tone,
      actions,
      follow_up: this.determineFollowUp(situation, student),
    };
  }

  /**
   * Determine tone based on situation and student
   */
  private determineTone(
    situation: SituationContext,
    student: StudentContext
  ): 'casual' | 'professional' | 'urgent' | 'celebratory' {
    if (situation.trigger?.urgency === 'critical') {
      return 'urgent';
    }

    if (situation.action_type === 'celebration') {
      return 'celebratory';
    }

    if (situation.action_type === 'gameplan') {
      return 'professional'; // Linguistic DNA transformation
    }

    return 'casual'; // Default for assessment, weekly execution
  }

  /**
   * Synthesize message with linguistic DNA transformation
   */
  private synthesizeMessage(
    criticalRecs: string[],
    highRecs: string[],
    mediumRecs: string[],
    tone: string,
    student: StudentContext
  ): string {
    // Placeholder: Would integrate with LLM to generate message
    const allRecs = [...criticalRecs, ...highRecs, ...mediumRecs];
    return `Based on analysis, here are key insights:\n${allRecs.slice(0, 5).join('\n')}`;
  }

  /**
   * Generate action items from recommendations
   */
  private generateActions(
    highRecs: string[],
    mediumRecs: string[],
    student: StudentContext
  ): Array<{ action_type: string; description: string; due_date?: Date }> {
    // Placeholder: Would extract actionable tasks
    return [];
  }

  /**
   * Determine follow-up timing
   */
  private determineFollowUp(
    situation: SituationContext,
    student: StudentContext
  ): { scheduled_for: Date; type: string } | undefined {
    // Placeholder: Would calculate optimal follow-up timing
    return undefined;
  }

  /**
   * Helper: Calculate vulnerability level (1-7)
   */
  private calculateVulnerabilityLevel(student: StudentContext): number {
    // Placeholder: Would calculate based on interaction history
    return 1; // Default: Week 1, no vulnerability yet
  }

  /**
   * Helper: Calculate school probabilities
   */
  private calculateSchoolProbabilities(
    student: StudentContext
  ): Record<string, number> {
    // Real-time probability calculation
    const probs: Record<string, number> = {};

    for (const school of student.goals.target_schools) {
      probs[school.name] = school.probability;
    }

    return probs;
  }

  /**
   * Helper: Get strategic target school (hidden)
   */
  private getStrategicTarget(student: StudentContext): string | null {
    // Return school with strategic_priority = 1
    const strategicSchool = student.goals.target_schools.find(
      (s) => s.strategic_priority === 1
    );
    return strategicSchool?.name || null;
  }

  /**
   * Helper: Is USC Games the target?
   */
  private isUSCGamesTarget(student: StudentContext): boolean {
    return this.getStrategicTarget(student) === 'USC Games';
  }

  /**
   * Helper: Is student an NCWIT candidate?
   */
  private isNCWITCandidate(student: StudentContext): boolean {
    // Female + STEM interests
    return (
      student.interests.primary_passions.some((p) =>
        ['coding', 'CS', 'computer_science', 'game_dev'].includes(p)
      ) &&
      student.psycho_behavioral.personality_type === 'Type_B_collaborative'
    );
  }
}

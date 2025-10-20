/**
 * Coach Intelligence Base Class
 *
 * Abstract base class for all coach intelligence implementations
 * Standardized core (80%) + customizable extensions (20%)
 *
 * Based on FIRST_PRINCIPLES_ARCHITECTURE.md and 31-layer intelligence spec
 */

import {
  CoachIntelligence,
  CoachingTool,
  CoachingActionType,
  SituationContext,
  CoachingResponse,
} from '../types/CoachIntelligence.js';
import { StudentContext } from '../types/StudentContext.js';
import { CoachIntelligenceRepository } from '../repositories/CoachIntelligenceRepository.js';

/**
 * Abstract Base Class for Coach Intelligence
 * All coaches must implement standardized frameworks + custom tools
 */
export abstract class CoachIntelligenceBase {
  protected intelligence: CoachIntelligence;
  protected repository: CoachIntelligenceRepository;

  constructor(
    intelligence: CoachIntelligence,
    repository: CoachIntelligenceRepository
  ) {
    this.intelligence = intelligence;
    this.repository = repository;
  }

  /**
   * Execute coaching action with full intelligence processing
   *
   * Multi-threaded intelligence processor:
   * - All 31 layers process input in parallel
   * - 7 personas run simultaneously
   * - Dynamic tool selection based on context
   * - Synthesis moment after all processing complete
   */
  async executeCoachingAction(
    actionType: CoachingActionType,
    student: StudentContext,
    situation: SituationContext
  ): Promise<CoachingResponse> {
    const startTime = Date.now();

    // Step 1: Select tools based on context
    const tools = this.selectTools(actionType, student, situation);

    // Step 2: Process with all personas in parallel
    const personaOutputs = await this.processWithPersonas(
      tools,
      student,
      situation
    );

    // Step 3: Synthesize response
    const response = await this.synthesizeResponse(
      personaOutputs,
      student,
      situation
    );

    const processingTime = Date.now() - startTime;

    return {
      ...response,
      metadata: {
        personas_used: personaOutputs.map((p) => p.persona_name),
        tools_applied: tools.map((t) => t.tool_id),
        processing_time_ms: processingTime,
      },
    };
  }

  /**
   * Tool Selection Algorithm
   * Context-aware: Student × Coach × Timing × Situation → Tools
   */
  protected selectTools(
    actionType: CoachingActionType,
    student: StudentContext,
    situation: SituationContext
  ): CoachingTool[] {
    const tools: CoachingTool[] = [];

    // Always include standardized framework for this action
    const standardTool = this.getStandardizedTool(actionType);
    if (standardTool) {
      tools.push(standardTool);
    }

    // Add context-based custom tools
    for (const customTool of this.intelligence.custom_tools) {
      if (this.isToolApplicable(customTool, student, situation)) {
        tools.push(customTool);
      }
    }

    return tools;
  }

  /**
   * Check if custom tool is applicable to this student/situation
   */
  protected isToolApplicable(
    tool: CoachingTool,
    student: StudentContext,
    situation: SituationContext
  ): boolean {
    // Check personality type
    if (
      tool.applicable_to.includes(student.psycho_behavioral.personality_type)
    ) {
      return true;
    }

    // Check capacity level
    if (
      tool.applicable_to.includes(
        `capacity_${student.psycho_behavioral.capacity_level}`
      )
    ) {
      return true;
    }

    // Check interests/skills
    for (const passion of student.interests.primary_passions) {
      if (tool.applicable_to.includes(passion)) {
        return true;
      }
    }

    // Check situation urgency
    if (
      situation.trigger &&
      tool.applicable_to.includes(`urgency_${situation.trigger.urgency}`)
    ) {
      return true;
    }

    return false;
  }

  /**
   * Process with all personas in parallel
   * 7 simultaneous personas (therapist, admissions officer, parent whisperer, etc.)
   */
  protected async processWithPersonas(
    tools: CoachingTool[],
    student: StudentContext,
    situation: SituationContext
  ): Promise<PersonaOutput[]> {
    const personas = this.getPersonas();

    // Process all personas in parallel
    const personaPromises = personas.map((persona) =>
      this.processPersona(persona, tools, student, situation)
    );

    return await Promise.all(personaPromises);
  }

  /**
   * Process single persona
   * Each persona has specific function and transformation logic
   */
  protected abstract processPersona(
    persona: Persona,
    tools: CoachingTool[],
    student: StudentContext,
    situation: SituationContext
  ): Promise<PersonaOutput>;

  /**
   * Synthesize final response from all persona outputs
   * Synthesis moment: Combine all perspectives into coherent action
   */
  protected abstract synthesizeResponse(
    personaOutputs: PersonaOutput[],
    student: StudentContext,
    situation: SituationContext
  ): Promise<Omit<CoachingResponse, 'metadata'>>;

  /**
   * Get standardized tool for action type
   * All coaches must implement these core frameworks (80%)
   */
  protected abstract getStandardizedTool(
    actionType: CoachingActionType
  ): CoachingTool | null;

  /**
   * Get personas for this coach
   * Default: 7 standard personas
   * Can be overridden for custom persona configurations
   */
  protected getPersonas(): Persona[] {
    return [
      {
        name: 'therapist',
        function: 'Handle emotional/motivation without judgment',
        transformation: 'Weakness → Need for structure',
      },
      {
        name: 'admissions_officer',
        function: 'Calculate probabilities in real-time',
        transformation: 'Stats → Strategic positioning',
      },
      {
        name: 'parent_whisperer',
        function: 'Navigate parent anxiety with dual-layer messaging',
        transformation: 'Anxiety → Confidence',
      },
      {
        name: 'strategic_architect',
        function: 'Hidden optimization for target schools',
        transformation: 'Interests → Spike narrative',
      },
      {
        name: 'confidence_alchemist',
        function: 'Transform doubt into self-belief',
        transformation: 'Doubt → Empowerment',
      },
      {
        name: 'time_mathematician',
        function: 'Calculate ROI and 168-hour optimization',
        transformation: 'Time → Strategic leverage',
      },
      {
        name: 'network_connector',
        function: 'Connect student to opportunities',
        transformation: 'Isolation → Community',
      },
    ];
  }

  /**
   * Get coach intelligence profile
   */
  getIntelligence(): CoachIntelligence {
    return this.intelligence;
  }
}

/**
 * Persona definition
 */
export interface Persona {
  name: string;
  function: string;
  transformation: string;
}

/**
 * Persona output
 */
export interface PersonaOutput {
  persona_name: string;
  analysis: Record<string, any>;
  recommendations: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
}

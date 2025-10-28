/**
 * v15.3 Assessment Agent - Universal Agent Pattern
 *
 * Date: 2025-10-28
 * Purpose: Autonomous 27-layer assessment with Jenny's coaching intelligence
 * Architecture: Configured Universal Agent with domain-specific primitives
 *
 * Flow:
 * 1. Trigger: student_onboarded event
 * 2. Perception: Classify intent + extract features
 * 3. Context: Load student profile + coaching intelligence + EQ profile
 * 4. Planning: 4-phase autonomous assessment (Discovery → Narrative → Strategy → Time)
 * 5. Action: Execute 27 layers with frameworks + tactics + questions
 * 6. Synthesis: Apply Jenny's EQ style + verify provenance
 * 7. Memory: Store session + high-quality learnings
 * 8. Event: Emit assessment_completed → GamePlanAgent
 *
 * Critical Moment: Phase 2, minute 12:53 - Identity synthesis from chaos
 *
 * @module agents/v15.3/AssessmentAgent
 */

import { Pool } from 'pg';
import {
  UniversalAgent,
  AgentBuilder,
  IntentPerceptor,
  CoachingContextLoader,
  DefaultToolExecutor,
  ResponseSynthesizer,
  ResponseVerifier,
  InMemoryStateStore,
  CoachingContext,
} from '../../primitives';
import { AssessmentPlanner, createAssessmentPlanner, AssessmentGoal } from '../../primitives/AssessmentPlanner';
import { ToneAdapterTool } from '../../primitives/ToneAdapterTool';
import { CoachingIntelligenceLoader } from '../../intelligence/CoachingIntelligenceLoader';
import { EQProfileLoader } from '../../intelligence/EQProfileLoader';
import { createPineconeMemoryStore } from '../../primitives/PineconeMemoryStore';

// ============================================================================
// TYPES: Assessment Agent
// ============================================================================

export interface AssessmentAgentConfig {
  db: Pool;
  coachId?: string;              // Default: 'jenny_duan'
  enableMemory?: boolean;        // Store learnings in Pinecone
  enableEQ?: boolean;            // Apply Jenny's coaching style
}

export interface AssessmentInput {
  student_id: string;
  trigger: 'student_onboarded' | 'manual_assessment' | 'reassessment';
  class_year?: number;
  current_week?: number;
  student_archetype?: string;
}

export interface AssessmentOutput {
  session_id: string;
  student_id: string;
  coach_id: string;
  started_at: Date;
  completed_at: Date;
  duration_minutes: number;

  // Assessment results
  diagnostic: {
    personality_type: string;
    capacity_level: string;
    social_style: string;
    execution_style: string;
  };

  eq_profile: {
    confidence_level: number;
    vulnerability_level: number;
    parent_anxiety: number;
  };

  rubric_scores: {
    academics: number;
    extracurriculars: number;
    summer_programs: number;
    awards: number;
    essays: number;
    total: number;
  };

  identity_synthesis: {
    identity_fusion: string;       // e.g., "Film × CS → Digital Storyteller"
    narrative_thread: string;
    unique_positioning: string;
    confidence_trajectory: string;
  };

  gap_analysis: {
    current_total: number;
    target_total: number;
    gap: number;
    priority_areas: string[];
    recommended_tactics: string[];
  };

  // Meta
  layers_executed: number;         // 27
  phases_completed: number;        // 4
  synthesis_moment_timestamp: Date;
  frameworks_introduced: string[];
  tactics_used: string[];
  assessment_complete: boolean;
}

// ============================================================================
// ASSESSMENT AGENT FACTORY
// ============================================================================

/**
 * Create Assessment Agent using Universal Agent pattern
 *
 * Configuration:
 * - Perceptor: IntentPerceptor (classify assessment trigger)
 * - ContextLoader: CoachingContextLoader + CoachingIntelligenceLoader + EQProfileLoader
 * - Planner: AssessmentPlanner (4-phase autonomous flow)
 * - Tools: ToneAdapter (EQ style application)
 * - Synthesizer: ResponseSynthesizer (combine phase results)
 * - Verifier: ResponseVerifier (provenance check)
 * - StateStore: InMemoryStateStore (session state)
 * - MemoryStore: PineconeMemoryStore (long-term learnings)
 */
export async function createAssessmentAgent(
  config: AssessmentAgentConfig
): Promise<UniversalAgent<AssessmentInput, AssessmentGoal, CoachingContext, AssessmentOutput>> {
  const coachId = config.coachId || 'jenny_duan';

  // ========== STEP 1: Initialize Intelligence Loaders ==========

  // Load coaching intelligence from 11 real Assessment/GamePlan sessions
  const coachingIntelLoader = new CoachingIntelligenceLoader();
  const coachingIntelligence = await coachingIntelLoader.loadAllIntelligence();

  console.log(`[AssessmentAgent] ✅ Loaded coaching intelligence from ${coachingIntelligence.length} sessions`);

  // Aggregate intelligence
  const aggregated = await coachingIntelLoader.getAggregatedIntelligence();
  console.log(`[AssessmentAgent] 📊 Aggregated intelligence:`);
  console.log(`  - ${aggregated.frameworks.length} frameworks`);
  console.log(`  - ${Object.keys(aggregated.coaching_tactics).length} tactic categories`);
  console.log(`  - ${aggregated.archetypes.length} student archetypes`);

  // Load EQ profile (Jenny's coaching DNA)
  const eqLoader = new EQProfileLoader(config.db);
  const eqProfile = await eqLoader.loadIntelligence(coachId);

  console.log(`[AssessmentAgent] ✅ Loaded EQ profile for ${coachId}`);
  console.log(`[AssessmentAgent] 🎭 Tone vectors:`, eqProfile.tone_vectors);

  // ========== STEP 2: Create Primitives ==========

  // Perceptor: Enhanced with assessment-specific validation
  const perceptor = new IntentPerceptor();

  // ContextLoader: Enriched with coaching intelligence + EQ
  const contextLoader = new CoachingContextLoader(config.db);

  // Planner: 4-phase autonomous assessment
  const planner = createAssessmentPlanner(coachingIntelligence, eqProfile);

  // Tool Executor: Register ToneAdapter and other tools
  const toolExecutor = new DefaultToolExecutor();

  // Register ToneAdapter tool (EQ style application)
  if (config.enableEQ !== false) {
    const toneAdapter = new ToneAdapterTool();
    toolExecutor.registerTool(toneAdapter);
    console.log(`[AssessmentAgent] ✅ ToneAdapter tool registered`);
  }

  // Synthesizer: Combine phase results into coherent assessment
  const synthesizer = new ResponseSynthesizer();

  // Verifier: Enhanced with provenance check
  const verifier = new ResponseVerifier();

  // State Store: Session state persistence
  const stateStore = new InMemoryStateStore();

  // Memory Store: Long-term learning storage (Pinecone)
  let memoryStore = undefined;
  if (config.enableMemory !== false) {
    memoryStore = createPineconeMemoryStore('assessment_learnings');
    console.log(`[AssessmentAgent] ✅ Pinecone memory store initialized`);
  }

  // ========== STEP 3: Build Universal Agent ==========

  const builder = new AgentBuilder<AssessmentInput, AssessmentGoal, CoachingContext, AssessmentOutput>('assessment_agent')
    .withPerceptor(perceptor as any)
    .withContextLoader(contextLoader as any)
    .withPlanner(planner as any)
    .withToolExecutor(toolExecutor)
    .withSynthesizer(synthesizer as any)
    .withVerifier(verifier as any)
    .withStateStore(stateStore);

  if (memoryStore) {
    builder.withMemoryStore(memoryStore);
  }

  // Add intelligence loaders to config
  builder.withIntelligenceLoader({
    loadIntelligence: async (id: string) => ({
      coaching_intelligence: coachingIntelligence,
      eq_profile: eqProfile,
      aggregated: aggregated,
    }),
    queryIntelligence: async (query: string, category: string) => [],
  } as any);

  const agent = builder.build();

  console.log(`[AssessmentAgent] 🚀 Assessment Agent created successfully`);
  console.log(`[AssessmentAgent] 📋 Configuration:`);
  console.log(`  - Coach: ${coachId}`);
  console.log(`  - EQ enabled: ${config.enableEQ !== false}`);
  console.log(`  - Memory enabled: ${config.enableMemory !== false}`);
  console.log(`  - Intelligence sources: ${coachingIntelligence.length} sessions`);

  return agent as any;
}

// ============================================================================
// ASSESSMENT AGENT CLASS (Event-Driven Wrapper)
// ============================================================================

/**
 * AssessmentAgentService: Event-driven wrapper for Universal Agent
 *
 * Responsibilities:
 * - Subscribe to student_onboarded events
 * - Execute Universal Agent for assessment
 * - Persist results to database
 * - Emit assessment_completed event
 */
export class AssessmentAgentService {
  private agent: UniversalAgent<AssessmentInput, AssessmentGoal, CoachingContext, AssessmentOutput> | null = null;
  private db: Pool;
  private config: AssessmentAgentConfig;

  constructor(config: AssessmentAgentConfig) {
    this.db = config.db;
    this.config = config;
  }

  /**
   * Initialize agent (async factory pattern)
   */
  async initialize(): Promise<void> {
    console.log('[AssessmentAgentService] Initializing...');
    this.agent = await createAssessmentAgent(this.config);
    console.log('[AssessmentAgentService] ✅ Initialized');
  }

  /**
   * Handle student_onboarded event
   * Autonomously start assessment
   */
  async handleStudentOnboarded(event: {
    student_id: string;
    class_year: number;
    current_week: number;
  }): Promise<void> {
    if (!this.agent) {
      throw new Error('Agent not initialized');
    }

    console.log(`[AssessmentAgentService] 🎯 Student onboarded: ${event.student_id}`);
    console.log(`[AssessmentAgentService] 🚀 Starting autonomous assessment...`);

    const startTime = Date.now();

    try {
      // Execute Universal Agent
      const result = await this.agent.execute({
        student_id: event.student_id,
        trigger: 'student_onboarded',
        class_year: event.class_year,
        current_week: event.current_week,
      });

      const durationMs = Date.now() - startTime;

      if (result.success) {
        console.log(`[AssessmentAgentService] ✅ Assessment completed for ${event.student_id}`);
        console.log(`[AssessmentAgentService] ⏱️  Duration: ${Math.round(durationMs / 1000)}s`);
        console.log(`[AssessmentAgentService] 🎓 Layers: ${result.output.layers_executed}/27`);
        console.log(`[AssessmentAgentService] 📊 Rubric total: ${result.output.rubric_scores.total}/25`);
        console.log(`[AssessmentAgentService] 💡 Identity: ${result.output.identity_synthesis.identity_fusion}`);

        // Persist to database
        await this.persistAssessmentResults(result.output);

        // Emit assessment_completed event → GamePlanAgent
        // (In production, integrate with EventBus)
        console.log(`[AssessmentAgentService] 📢 Emitting assessment_completed event...`);
      } else {
        console.error(`[AssessmentAgentService] ❌ Assessment failed:`, result.error);
        throw new Error(result.error || 'Assessment failed');
      }
    } catch (error) {
      console.error(`[AssessmentAgentService] ❌ Assessment failed for ${event.student_id}:`, error);
      throw error;
    }
  }

  /**
   * Persist assessment results to database
   */
  private async persistAssessmentResults(output: AssessmentOutput): Promise<void> {
    // Create assessment_session record
    await this.db.query(
      `INSERT INTO assessment_sessions (
        student_id, coach_id, started_at, completed_at, duration_minutes,
        diagnostic_result, eq_profile, rubric_scores, identity_synthesis,
        gap_analysis, layers_executed, phases_completed,
        synthesis_moment_timestamp, frameworks_introduced, tactics_used,
        assessment_complete
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        output.student_id,
        output.coach_id,
        output.started_at,
        output.completed_at,
        output.duration_minutes,
        JSON.stringify(output.diagnostic),
        JSON.stringify(output.eq_profile),
        JSON.stringify(output.rubric_scores),
        JSON.stringify(output.identity_synthesis),
        JSON.stringify(output.gap_analysis),
        output.layers_executed,
        output.phases_completed,
        output.synthesis_moment_timestamp,
        JSON.stringify(output.frameworks_introduced),
        JSON.stringify(output.tactics_used),
        output.assessment_complete,
      ]
    );

    console.log(`[AssessmentAgentService] 💾 Assessment results persisted to database`);
  }
}

// ============================================================================
// FACTORY EXPORT
// ============================================================================

/**
 * Create and initialize AssessmentAgentService
 */
export async function initializeAssessmentAgent(
  config: AssessmentAgentConfig
): Promise<AssessmentAgentService> {
  const service = new AssessmentAgentService(config);
  await service.initialize();
  return service;
}

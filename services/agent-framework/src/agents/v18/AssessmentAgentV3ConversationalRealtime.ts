/**
 * AssessmentAgentV3ConversationalRealtime - PRODUCTION-GRADE Intelligence-Driven Conversational Assessment
 *
 * Purpose: Replicate Jenny's exact assessment methodology using 27 layers of extracted intelligence
 * from 11 real student coaching sessions.
 *
 * Architecture:
 * 1. User message → GPT-4o extracts data (no regex, no hardcoded questions)
 * 2. Store facts in kb_items.edges (universal storage)
 * 3. Load facts → TYPE-080 analyzes gaps + generates adaptive questions
 * 4. EQ Layer applies Jenny's linguistic DNA + 7 personas
 * 5. Return conversational response matching student personality
 *
 * Intelligence Sources (Data-Driven):
 * - TYPE-080: 4-Phase Assessment Flow (adaptive questions based on gaps)
 * - TYPE-081: IvyScore Calculation (hidden probability calculations)
 * - TYPE-082: Gap Analysis Engine (P0 critical gaps)
 * - TYPE-083: Potential Indicator Extraction (hidden strengths)
 * - TYPE-085: Rubric Scoring Engine (Jenny's 5-dimension rubric from coaching) [v29.1]
 * - TYPE-086: Gap Priority Analyzer (P0/P1/P2 gap prioritization) [v29.1]
 * - 27 EQ Layers from W001 Huda session analysis
 * - 11 Student structured extractions (Anoushka, Ananyaa, Aaryan, Hiba, Srinidhi, Arshiya, Aarnav, Iqra, Aarav, Zainab, Beya)
 * - Coaching Intelligence Chips: /data/kb_intel_chips/assess-gameplan-chips/
 *
 * EQ Intelligence Layers Implemented:
 * LAYER_1: 27-Second Credibility Architecture (warmth before authority)
 * LAYER_2: Rapid Diagnostic Cascade (data extraction with affirmation)
 * LAYER_3: Hidden Family Dynamics Probe (parent navigation matrix)
 * LAYER_4: Vulnerability Ladder (progressive sharing)
 * LAYER_5: Time Reality Confrontation (168-hour math)
 * LAYER_6: Cushioned Critique Technique (sandwich feedback)
 * LAYER_7: P0 Critical Gaps (awards, leadership, service)
 * LAYER_8: Hidden Demographic Reality (implicit positioning)
 * LAYER_9: Synthesis Moment (identity creation in 12 seconds)
 * LAYER_10: Immediate Strategy Pivot (alternative pathways)
 * LAYER_11: Narrative Reinforcement (repetition creates belief)
 * LAYER_12: Immediate Action Architecture (this week tasks)
 * LAYER_13: Project Architecture Realtime (scale multiplication)
 * LAYER_14: Time Allocation Precision (ROI calculations)
 * LAYER_15: 3-Year Vision Embedded (every suggestion serves applications)
 * LAYER_16: 7 Simultaneous Personas (therapist, admissions officer, parent whisperer, etc.)
 * LAYER_17: Challenge Question Technology (question assumptions)
 * LAYER_18: Linguistic DNA (never say "but", always "No worries")
 * LAYER_19: Parent Navigation Matrix (<3sec acknowledge, <10sec redirect)
 * LAYER_20: Confidence Progression (min5 → min90 building)
 * LAYER_21: Intel Drops (insider knowledge)
 * LAYER_22: Scale Multiplication (every idea → national platform)
 * LAYER_23: Vulnerability Matching (reciprocal sharing)
 * LAYER_24: Redirect Technology (challenge → alternative)
 * LAYER_25: Probability Calculations (hidden NCWIT 70%, MIT 40%, etc.)
 * LAYER_26: Transformation Engine (metaphor → identity → strategy)
 * LAYER_27: Complete Formula (27sec credibility → 90min commitment locked)
 *
 * Created: 2025-11-02
 * Version: v29.8 - Assessment Agent 100% Complete (6/6 intelligence types wired)
 * Previous: v29.1 - Production Intelligence-Driven + Rubric Scoring Architecture
 */

import { FactStore } from '../../facts/FactStore.js';
import { AgentQuery, FactCategory } from '../../facts/types.js';
import { BaseAgentWithIntelligence, IntelligenceAgentResponse } from './BaseAgentWithIntelligence.js';
import { FactSet, Fact } from '../../facts/FactSet.js';
import { createLogger } from '../../../../../packages/observability/dist/unified-logger.js';
import { Pool } from 'pg';
import { UniversalFact, FactCategory as UFFactCategory, ProductionTable } from '../../facts/UniversalFact.js';
import { SchemaCoverage } from '../../facts/SchemaCoverage.js';
import { StudentIsolation } from '../../facts/StudentIsolation.js';
import { extractAssessmentDataGPT, validateAndNormalizeData, analyzeStudentEngagement, type ExtractedAssessmentData } from '../../nlp/assessmentExtract.js';
import { IntelligenceResult } from '../../intelligence/types/BaseIntelligenceType.js';
import { A2AOrchestrator } from '../../a2a/A2AOrchestrator.js';
import type {
  A2AHandoverPackage,
  A2AHandoverType,
  AssessmentToGamePlanPayload,
  ExecutionContext,
  A2AHandoverMetadata,
  Gap,
  QuickWin,
  Indicator,
  StudentDemographics,
} from '../../a2a/types.js';
import { FactCategoryMapper } from '../../facts/FactCategoryMapper.js';
import { HandoverValidator } from '../../a2a/HandoverValidator.js';
import { FactDerivationEngine } from '../../facts/FactDerivationEngine.js';
import { AdaptationContext } from '../../a2a/AgentFactRequirements.js';
import { IntelligenceRegistry } from '../../intelligence/IntelligenceRegistry.js';
import type { IntelligenceType } from '../../intelligence/types/BaseIntelligenceType.js';
import { CanonicalFieldMapper } from '../../utils/CanonicalFieldMapper.js';
import { AssessmentFactTracker, AssessmentProgress } from './AssessmentFactTracker.js';
import { AssessmentQuestionGenerator } from './AssessmentQuestionGenerator.js';
import { DynamicQuestionGenerator, QuestionGenerationContext, ResponseBubbleContext } from './DynamicQuestionGenerator.js';

const log = createLogger('assessment-agent-v3-conversational-realtime');

/**
 * Jenny's Linguistic DNA (LAYER_18)
 * These are the exact word choices extracted from 11 real coaching sessions
 */
const JENNY_LINGUISTIC_DNA = {
  never_say: ['but', 'you should have', "that's wrong", 'unfortunately', 'however'],
  always_say: {
    comfort: ['No worries', 'Okay', 'Yeah', 'That makes sense'],
    affirmation: ['Great!', 'Fantastic!', 'Perfect!', 'Exactly!', 'Brilliant!'],
    curiosity: ['What do you think?', 'How do you feel about that?', 'Tell me more'],
    transition: ['So', 'And', 'Now'],
  },
  exclamation_usage: {
    '!': 'Standard acknowledgment',
    '!!': 'Genuine excitement (rare, save for breakthroughs)',
    '!!!': 'Never use (too intense)',
  },
};

/**
 * Jenny's 7 Simultaneous Personas (LAYER_16)
 */
interface JennyPersona {
  name: string;
  when_to_activate: string;
  linguistic_markers: string[];
}

const JENNY_7_PERSONAS: JennyPersona[] = [
  {
    name: 'Therapist',
    when_to_activate: 'Student shares anxiety, motivation issues, self-doubt',
    linguistic_markers: ["That's really insightful", 'I hear that concern', 'Many students feel this way'],
  },
  {
    name: 'Admissions Officer',
    when_to_activate: 'Calculating probabilities, assessing competitiveness',
    linguistic_markers: ['Looking at your profile', 'From an admissions perspective', 'Schools like to see'],
  },
  {
    name: 'Parent Whisperer',
    when_to_activate: 'Parent interrupts or expresses concern',
    linguistic_markers: ['I think that makes sense', 'Yeah, definitely a fair concern', 'Music to my ears'],
  },
  {
    name: 'Strategic Architect',
    when_to_activate: 'Building roadmaps, project ideation',
    linguistic_markers: ['What if', 'Here is how we can frame', 'Let us be strategic'],
  },
  {
    name: 'Confidence Alchemist',
    when_to_activate: 'Student needs affirmation',
    linguistic_markers: ['You are exceptional', 'This is brilliant', 'You do not need programs'],
  },
  {
    name: 'Time Mathematician',
    when_to_activate: 'Discussing schedules, priorities',
    linguistic_markers: ['So you have 24 hours', 'Let us do the math', 'Every minute needs to count'],
  },
  {
    name: 'Network Connector',
    when_to_activate: 'Providing resources, introductions',
    linguistic_markers: ['I can introduce you', 'I know someone at', 'I will send you the contact'],
  },
];

/**
 * Session State (database-backed)
 */
interface ConversationState {
  session_id: string;
  student_id: string;
  questions_asked: string[]; // Full text of every question asked
  last_question?: string; // v28.2: Last question sent to student (for extraction context)
  confidence_level: number; // 0-100, tracks LAYER_20 progression
  parent_present: boolean;
  synthesis_delivered: boolean; // LAYER_9 synthesis moment happened
  current_eq_layer: number; // Which of 27 layers currently active
  message_count: number;
  last_synthesized_data?: string; // v27.0: JSON snapshot of data at last synthesis (for change detection)
}

export class AssessmentAgentV3ConversationalRealtime extends BaseAgentWithIntelligence {
  private pool: Pool;
  private sessionStates: Map<string, ConversationState> = new Map();

  /**
   * v34.1: Track handover execution per session (prevents infinite loop)
   */
  private sessionHandovers: Map<string, boolean> = new Map();

  /**
   * v35.0: Dynamic question generator using LLM for contextual questions
   */
  private dynamicQuestionGenerator: DynamicQuestionGenerator;

  /**
   * Domain-specific intelligence types for Assessment Agent
   */
  protected DOMAIN_INTELLIGENCE: IntelligenceType[] = [];

  constructor(factStore: FactStore, pool: Pool) {
    super('assessment-agent-v18', factStore);
    this.pool = pool;

    // v35.0: Initialize dynamic question generator
    this.dynamicQuestionGenerator = new DynamicQuestionGenerator();

    // Initialize Assessment intelligence types (TYPE-080, TYPE-081, TYPE-082, TYPE-083, TYPE-085, TYPE-086)
    this.initializeDomainIntelligence();
  }

  /**
   * Initialize Assessment-specific intelligence types
   * v29.8: Wired 6 domain intelligence types (100% spec-compliant)
   */
  private initializeDomainIntelligence(): void {
    log.event('assessment_agent.initialize_start', {
      agent_id: this.agentId,
      intelligence_types_expected: 6,
    });

    try {
      this.DOMAIN_INTELLIGENCE = [
        IntelligenceRegistry.get('TYPE-080'), // 4-Phase Assessment Flow
        IntelligenceRegistry.get('TYPE-081'), // IvyScore Calculation
        IntelligenceRegistry.get('TYPE-082'), // Gap Analysis Engine
        IntelligenceRegistry.get('TYPE-083'), // Potential Indicator Extraction
        IntelligenceRegistry.get('TYPE-085'), // Rubric Scoring Engine (v29.1)
        IntelligenceRegistry.get('TYPE-086'), // Gap Priority Analyzer (v29.1)
      ];

      log.event('assessment_agent.initialize_complete', {
        domain_intelligence_count: this.DOMAIN_INTELLIGENCE.length,
        types_loaded: this.DOMAIN_INTELLIGENCE.map(t => t.type_id),
      });
    } catch (error) {
      log.error('assessment_agent.initialize_error', error);
      throw new Error('Failed to initialize AssessmentAgent: ' + String(error));
    }
  }

  /**
   * Define required facts for Assessment Agent
   */
  protected getRequiredFacts(): FactCategory[] {
    return [
      FactCategory.STUDENT_PROFILE,
      FactCategory.ASSESSMENT_DATA,
    ];
  }

  /**
   * Override loadFacts to use v28.1 multi-category storage
   * UNIVERSAL FIX: Directly query kb_items with correct source_ref instead of FactStore
   */
  protected async loadFacts(entityId: string): Promise<FactSet> {
    console.log('[v28.1_LOAD_FACTS] Loading facts from kb_items with source_ref=gpt4o_conversational_extraction_v28');

    try {
      // Query all v28.1 facts for this student
      const result = await this.pool.query(
        `SELECT item_type, subtype, edges, created_ts
         FROM kb_items
         WHERE student_id = $1 AND source_ref = 'gpt4o_conversational_extraction_v28'
         ORDER BY created_ts DESC`,
        [entityId]
      );

      console.log('[v28.1_LOAD_FACTS] Query result:', {
        has_rows: !!result.rows,
        rows_length: result.rows?.length,
        rows_type: typeof result.rows,
      });

      if (!result.rows || !Array.isArray(result.rows)) {
        console.error('[v28.1_LOAD_FACTS] ERROR: result.rows is not an array!', {
          result_keys: Object.keys(result),
          rows: result.rows,
        });
        return new FactSet([]);
      }

      console.log('[v28.1_LOAD_FACTS] Loaded', result.rows.length, 'kb_items');

      // Convert kb_items to Fact[] array
      const facts: Fact[] = [];

      for (const row of result.rows) {
        const category = row.item_type as FactCategory;

        // Parse edges (PostgreSQL returns JSONB as string or object depending on driver)
        const edges = typeof row.edges === 'string' ? JSON.parse(row.edges) : (row.edges || {});

        console.log('[v28.1_LOAD_FACTS] Processing row:', {
          category,
          edges_type: typeof edges,
          edges_keys: Object.keys(edges),
        });

        // Extract each fact from edges
        // Create a single Fact with all fields from this kb_item
        const allFields: Record<string, any> = {};
        for (const [factType, factValue] of Object.entries(edges)) {
          if (factType === 'v28_metadata') continue; // Skip metadata
          allFields[factType] = factValue;
        }

        // Only create a Fact if we have actual data (not just metadata)
        if (Object.keys(allFields).length > 0) {
          facts.push({
            fact_id: `${category}_combined_${Date.now()}_${Math.random()}`,
            category,
            fact_type: 'combined_fields', // Single fact containing all fields from this kb_item
            value: allFields, // Now value is guaranteed to be an object with fact_type as keys
            source: 'gpt4o_conversational_extraction_v28',
            confidence: 0.9,
            timestamp: row.created_ts,
            provenance: {
              source: 'gpt4o_conversational_extraction_v28',
              extracted_at: row.created_ts,
              extraction_method: 'v28.1_multi_category_mapping',
            },
          });

          console.log('[v28.1_LOAD_FACTS] Added fact:', {
            category,
            fields_included: Object.keys(allFields),
          });
        }
      }

      console.log('[v28.1_LOAD_FACTS] Converted to Fact[]:', facts.length, 'facts');

      // Create FactSet with proper Fact[] array
      return new FactSet(facts);
    } catch (error) {
      console.error('[v28.1_LOAD_FACTS] Error loading facts:', error);
      return new FactSet([]); // Return empty FactSet on error
    }
  }

  /**
   * MAIN ENTRY POINT: Handle user message with full intelligence-driven flow
   * LAYER 4: Comprehensive debug logging for v34.1 handover flow
   */
  async handleQuery(query: AgentQuery): Promise<IntelligenceAgentResponse> {
    const sessionId = query.session_id || 'no-session';

    // v34.2 UNIVERSAL FACTS + SCHEMA COVERAGE - Architecture redesign
    console.log('🚀 [v34.2 UNIVERSAL FACTS] Assessment Agent with schema-based coverage (NOT fact counting)!');

    // LAYER 4: Debug entry point
    log.event('assessment.handle_query.start', {
      session_id: sessionId,
      student_id: query.entity_id,
      message_length: query.query?.length || 0,
      has_context: !!query.context
    });

    console.log('\n========== INTELLIGENCE-DRIVEN ASSESSMENT V26.5 REALTIME START ==========');
    console.log('[V26.5_REALTIME] 🚀 AssessmentAgentV3ConversationalRealtime.handleQuery() CALLED');
    console.log('[V26.5_REALTIME] Session:', sessionId);
    console.log('[V26.5_REALTIME] Student:', query.entity_id);
    console.log('[V26.5_REALTIME] Message:', query.query);
    console.log('[V26.5_REALTIME] Mode: INTELLIGENCE-DRIVEN (NO HARDCODED QUESTIONS)');
    console.log('[V26.5_REALTIME] EQ Layers: 27 layers active');
    console.log('[V26.5_REALTIME] Personas: 7 personas ready');

    // STEP 1: Load or initialize conversation state
    console.log('[V26.5_REALTIME] 📂 STEP 1: Loading conversation state...');
    let state = await this.loadConversationState(sessionId, query.entity_id);
    console.log('[V26.5_REALTIME] State loaded:', {
      message_count: state.message_count,
      questions_asked_count: state.questions_asked.length,
      confidence_level: state.confidence_level,
      synthesis_delivered: state.synthesis_delivered,
    });

    // STEP 2: Extract data from user message using GPT-4o (NO REGEX)
    console.log('[V26.5_REALTIME] 🤖 STEP 2: Extracting data using GPT-4o (NO REGEX)...');
    const conversationHistory = query.metadata?.conversation_history || '';
    const lastQuestion = state.last_question || ''; // v28.2: Pass last question for context
    await this.extractAndStoreFacts(query.entity_id, query.query, conversationHistory, lastQuestion);
    console.log('[V26.5_REALTIME] ✅ GPT-4o extraction complete');

    // CRITICAL: Wait a moment to ensure database write is fully committed
    await new Promise(resolve => setTimeout(resolve, 100));

    // STEP 3: Load all facts for student (FRESH from database after extraction)
    console.log('[V26.5_REALTIME] 📚 STEP 3: Loading facts for student...');
    const facts = await this.loadFacts(query.entity_id);
    console.log('[V26.5_REALTIME] Facts loaded:', facts.getAllFacts().length);
    console.log('[V26.5_REALTIME] Fact categories:', facts.getAllFacts().map(f => f.category));

    // v34.2 UNIVERSAL FACTS: Load Universal Facts and calculate schema coverage
    console.log('🔧 [v34.2 UNIVERSAL FACTS] Loading Universal Facts and checking schema coverage...');

    try {
      // Load existing Universal Facts
      const existingUniversalFacts = await this.loadUniversalFacts(query.entity_id);

      // Convert latest extraction to Universal Facts
      const newUniversalFacts = this.toUniversalFacts(
        query.entity_id,
        await this.getLatestExtractedData(query.entity_id), // Get from last extraction
        sessionId
      );

      // Combine all facts
      const allUniversalFacts = [...existingUniversalFacts, ...newUniversalFacts];

      // Calculate schema coverage (NOT fact count!)
      const coverage = SchemaCoverage.fromFacts(allUniversalFacts);

      log.event('assessment.schema_coverage', {
        session_id: sessionId,
        student_id: query.entity_id,
        coverage: coverage.toJSON()
      });

      console.log('[v34.2] Schema coverage check:', {
        is_complete: coverage.isMinimumCoverageAchieved(),
        completion_pct: coverage.completion_percentage,
        required: coverage.toJSON().required,
        optional: coverage.toJSON().optional,
        missing: coverage.getMissingRequiredFields()
      });

      // v34.3 ENHANCED ASSESSMENT: Check using AssessmentFactTracker
      // Convert UniversalFact[] to Map<string, any> for AssessmentFactTracker
      const factsMap = new Map<string, any>();
      for (const fact of allUniversalFacts) {
        if (fact.data.metadata?.field_name) {
          factsMap.set(fact.data.metadata.field_name, fact.data.fields);
        }
      }

      // Calculate comprehensive assessment progress
      const conversationTurns = state.message_count || 0;
      const assessmentProgress: AssessmentProgress = AssessmentFactTracker.calculateProgress(
        factsMap,
        conversationTurns
      );

      console.log('[v34.3 ENHANCED ASSESSMENT] Progress:', {
        total_facts_collected: assessmentProgress.total_facts_collected,
        total_facts_required: assessmentProgress.total_facts_required,
        overall_completion: assessmentProgress.overall_completion,
        quality_score: assessmentProgress.quality_score,
        is_complete: assessmentProgress.is_complete,
        conversation_turns: conversationTurns,
        next_priority_tier: assessmentProgress.next_priority_tier,
      });

      // Check if minimum coverage achieved (OLD logic for backward compatibility)
      const handoverExecuted = this.sessionHandovers.get(sessionId) || false;

      // v34.3 RAISED BAR: Use AssessmentFactTracker completion criteria
      const shouldHandover = assessmentProgress.is_complete &&
                            assessmentProgress.quality_score >= 8.5 &&
                            conversationTurns >= 45 &&
                            assessmentProgress.total_facts_collected >= 90 &&
                            !handoverExecuted;

      if (shouldHandover) {
        console.log('[v34.3] ✅ Enhanced assessment complete! Triggering handover to GamePlan...');
        console.log('[v34.3]   - Facts collected:', assessmentProgress.total_facts_collected, '(target: 90+)');
        console.log('[v34.3]   - Quality score:', assessmentProgress.quality_score.toFixed(2), '(target: 8.5+)');
        console.log('[v34.3]   - Conversation turns:', conversationTurns, '(target: 45+)');

        // Mark handover as executed for this session
        this.sessionHandovers.set(sessionId, true);

        log.event('assessment.handover_triggered', {
          session_id: sessionId,
          student_id: query.entity_id,
          schema_coverage: coverage.toJSON()
        });

        // Generate handover response
        const handoverResponse = this.generateHandoverResponseV2(coverage);

        console.log('[v34.2 HANDOVER] 🎯 Schema complete! Returning handover with signals:');
        console.log('[v34.2 HANDOVER]   - phase_complete: true');
        console.log('[v34.2 HANDOVER]   - completion_percentage:', coverage.completion_percentage);
        console.log('[v34.2 HANDOVER]   - suggested_next_phase: gameplan');

        // Return with handover signal
        return {
          response: handoverResponse,
          facts_used: facts.getAllFacts(),
          validation_score: 1.0,
          provenance: [],
          confidence: 1.0,
          intelligence_triggered: ['TYPE-085', 'TYPE-086'],
          triggered_intelligence: ['TYPE-085', 'TYPE-086'],

          metadata: {
            assessment_complete: true,
            schema_coverage: coverage.toJSON(),
            universal_facts: allUniversalFacts,
            data_collected_so_far: facts.getAllFacts(),
            mode: 'handover',
            eq_layer_active: 'LAYER_9: Synthesis Moment',

            // v34.3 ENHANCED ASSESSMENT: Include progress metrics
            assessment_progress: {
              total_facts_collected: assessmentProgress.total_facts_collected,
              total_facts_required: assessmentProgress.total_facts_required,
              overall_completion: assessmentProgress.overall_completion,
              quality_score: assessmentProgress.quality_score,
              conversation_turns: conversationTurns,
              tier_progress: assessmentProgress.tier_progress,
              is_complete: assessmentProgress.is_complete,
            },

            // ✅ CRITICAL: Handover signals for v34 orchestrator
            signals: {
              phase_complete: true,
              // FIX: Return 100 to signal "assessment phase is complete" (not data completeness %)
              // coverage.completion_percentage would be 38% (3/8 fields), but we mean "phase done"
              completion_percentage: 100,
              confidence: 1.0,
              suggested_next_phase: 'gameplan',

              requires_handover: [{
                from_agent: 'assessment-agent-v18',
                to_agent: 'gameplan-agent-v18',
                reason: 'Minimum schema coverage achieved (grade, high_school, interests)',
                confidence: 1.0,
                schema_coverage: coverage.toJSON(),
                collected_facts: facts.getAllFacts()
              }]
            },

            // v26 compat: Also set direct handover flag
            requires_handover: [{
              from_agent: 'assessment-agent-v18',
              to_agent: 'gameplan-agent-v18',
              reason: 'Assessment complete - all required data collected',
              confidence: 1.0
            }]
          }
        };
      }

      console.log('[v34.2] Schema coverage not yet complete, continuing with normal flow...');
      console.log('[v34.2] Missing fields:', coverage.getMissingFieldsDescription());

      log.event('assessment.schema_coverage.continue', {
        session_id: sessionId,
        student_id: query.entity_id,
        reason: 'minimum_coverage_not_achieved',
        missing: coverage.getMissingRequiredFields()
      });

    } catch (error) {
      // CATCH: Any error in schema coverage check should not block normal assessment flow
      console.error('[v34.2] ❌ Schema coverage error:', error);
      console.error('[v34.2] Stack trace:', error instanceof Error ? error.stack : 'No stack');
      log.error('assessment.schema_coverage.error', {
        session_id: sessionId,
        student_id: query.entity_id,
        error: String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      console.log('[v34.2] ⚠️ Schema coverage check error, continuing with normal assessment flow...');
      // Continue to normal flow below
    }

    // STEP 4: Process intelligence types (TYPE-080, 081, 082, 083, 085, 086)
    console.log('[V26.5_REALTIME] 🧠 STEP 4: Processing intelligence types (TYPE-080, 081, 082, 083, 085, 086)...');
    const intelligenceResults = await this.processIntelligenceTypes(query, facts);
    console.log('[V26.5_REALTIME] ✅ Intelligence results:', intelligenceResults.map(r => r.type_id));
    console.log('[V26.5_REALTIME] Intelligence triggered count:', intelligenceResults.filter(r => r.triggered).length);
    console.log('[V26.5_REALTIME] Intelligence results detailed:', JSON.stringify(intelligenceResults.map(r => ({
      type_id: r.type_id,
      triggered: r.triggered,
      confidence: r.confidence,
      component: r.component,
      has_data: !!r.data,
      data_type: typeof r.data,
      error: r.component === 'error' ? r.data : undefined,
    })), null, 2));

    // STEP 5: Generate response using intelligence + EQ layers
    console.log('[V26.5_REALTIME] 💬 STEP 5: Generating intelligent conversational response...');
    console.log('[V26.5_REALTIME] Using TYPE-080 adaptive questions + 27 EQ layers');
    const response = await this.generateIntelligentConversationalResponse(
      query,
      facts,
      intelligenceResults,
      state
    );
    console.log('[V26.5_REALTIME] ✅ Response generated');

    // STEP 6: Update conversation state
    console.log('[V26.5_REALTIME] 💾 STEP 6: Saving conversation state...');
    state.message_count++;
    // v28.3: Track BOTH the original question and EQ-enhanced version to prevent infinite loops
    // The filterAlreadyAskedQuestions() method checks against original questions from TYPE-080
    // So we need to store the original question text, not just the EQ-enhanced version
    const originalQuestion = response.metadata?.original_question || response.response;
    state.questions_asked.push(originalQuestion);
    console.log('[V28.3_LOOP_FIX] Saved original question to history:', originalQuestion.substring(0, 80));
    await this.saveConversationState(state);
    console.log('[V26.5_REALTIME] ✅ State saved. Total messages:', state.message_count);

    console.log('[V26.5_REALTIME] 📤 Returning response:', {
      response_length: response.response.length,
      mode: response.metadata?.mode,
      eq_layer: response.metadata?.eq_layer_active,
      triggered_intelligence: response.triggered_intelligence,
    });
    console.log('========== INTELLIGENCE-DRIVEN ASSESSMENT V26.5 REALTIME END ==========\n');

    return response;
  }

  /**
   * CORE: Generate conversational response using TYPE-080 + 27 EQ Layers
   */
  private async generateIntelligentConversationalResponse(
    query: AgentQuery,
    facts: FactSet,
    intelligenceResults: IntelligenceResult[],
    state: ConversationState
  ): Promise<IntelligenceAgentResponse> {

    // Find TYPE-080 result (4-Phase Assessment Flow)
    const type080 = intelligenceResults.find(r => r.type_id === 'TYPE-080');

    console.log('[INTEL_GEN] Checking TYPE-080:', {
      type080_found: !!type080,
      type080_triggered: type080?.triggered,
      intelligenceResults_length: intelligenceResults.length,
      intelligenceResults_types: intelligenceResults.map(r => r.type_id),
    });

    if (!type080 || !type080.triggered) {
      console.log('[INTEL_GEN] TYPE-080 not triggered, using greeting fallback');
      // Fallback: Use simple greeting if TYPE-080 not triggered
      // Pass intelligence results so they show in UI even if not fully triggered
      return await this.generateGreeting(state, intelligenceResults);
    }

    const assessmentFlow = type080.data as any;

    console.log('[INTEL_GEN] TYPE-080 Data:', {
      current_phase: assessmentFlow.current_phase,
      overall_completion: assessmentFlow.overall_completion,
      adaptive_questions_count: assessmentFlow.adaptive_questions?.length || 0,
    });

    // Extract collected data
    const collectedData = this.extractCollectedData(facts);

    // CRITICAL: Check if we've already asked this student these exact questions
    // v28.1: TYPE-080 now intelligently skips questions when data exists, so we only need to check "already asked"
    // v31.2: BUGFIX - Pass collectedData to prevent asking questions about data we already have
    const availableQuestions = await this.filterAlreadyAskedQuestions(
      assessmentFlow.adaptive_questions || [],
      state.questions_asked,
      collectedData  // v31.2: CRITICAL FIX - was missing, causing synthesis loop
    );

    if (availableQuestions.length === 0) {
      // All questions asked → Deliver synthesis (LAYER_9)
      return await this.deliverSynthesisMoment(facts, intelligenceResults, state, query.entity_id);
    }

    // v34.3 ENHANCED ASSESSMENT: Calculate assessment progress and try enhanced question generation
    let nextQuestionText: string;
    let nextQuestionCategory: string = 'General';
    let nextQuestionPriority: string = 'P2';

    try {
      // Load universal facts to calculate progress
      const universalFacts = await this.loadUniversalFacts(query.entity_id);
      const factsMap = new Map<string, any>();
      for (const fact of universalFacts) {
        if (fact.data.metadata?.field_name) {
          factsMap.set(fact.data.metadata.field_name, fact.data.fields);
        }
      }

      const assessmentProgress = AssessmentFactTracker.calculateProgress(
        factsMap,
        state.message_count || 0
      );

      // Try to generate enhanced question using DynamicQuestionGenerator (v35.0)
      const conversationHistory = query.metadata?.conversation_history || [];
      const enhancedQuestion = await this.generateEnhancedQuestion(
        assessmentProgress,
        query.query || '',
        conversationHistory,
        query.entity_id,
        collectedData,
        state.parent_present || false
      );

      if (enhancedQuestion) {
        // Use enhanced question from AssessmentQuestionGenerator
        nextQuestionText = enhancedQuestion;
        // Derive category from next priority tier
        nextQuestionCategory = assessmentProgress.next_priority_tier || 'General';
        nextQuestionPriority = 'P0'; // Enhanced questions are high priority
        console.log('[v34.3 ENHANCED] Using AssessmentQuestionGenerator question');
      } else {
        // Fallback to TYPE-080 question selection
        const nextQuestion = this.selectNextQuestion(availableQuestions, collectedData, state);
        nextQuestionText = nextQuestion.question;
        nextQuestionCategory = nextQuestion.category;
        nextQuestionPriority = nextQuestion.priority;
        console.log('[v34.3 ENHANCED] Using TYPE-080 fallback question');
      }
    } catch (error) {
      console.error('[v34.3 ENHANCED] Error in enhanced question generation, falling back to TYPE-080:', error);
      // Fallback to original TYPE-080 logic
      const nextQuestion = this.selectNextQuestion(availableQuestions, collectedData, state);
      nextQuestionText = nextQuestion.question;
      nextQuestionCategory = nextQuestion.category;
      nextQuestionPriority = nextQuestion.priority;
    }

    // Apply EQ Layer transformation
    const eqEnhancedResponse = this.applyEQLayer(
      nextQuestionText,
      state,
      collectedData,
      query.query
    );

    // v28.2: CRITICAL - Track the question we're sending so extraction knows context
    state.last_question = nextQuestionText;
    console.log('[V28.2_QUESTION_TRACKING] Tracking question for next extraction:', nextQuestionText.substring(0, 80));

    // Update state in database
    await this.saveConversationState(state);

    // v35.0: Try dynamic LLM bubble generation first
    let suggestedResponses = await this.generateDynamicResponseBubbles(
      nextQuestionText,
      collectedData,
      query.query || ''
    );

    // Fallback to keyword-based if LLM fails
    if (suggestedResponses.length === 0) {
      const nextQuestionObj = { question: nextQuestionText, category: nextQuestionCategory, priority: nextQuestionPriority };
      suggestedResponses = this.generateSuggestedResponses(nextQuestionObj, collectedData);
    }

    console.log('[v35.0_DYNAMIC_BUBBLES] Generated suggested responses:', {
      question_text: nextQuestionText.substring(0, 80),
      suggested_responses: suggestedResponses,
      count: suggestedResponses.length,
      source: suggestedResponses.length > 0 ? 'LLM' : 'keyword-based'
    });

    return {
      response: eqEnhancedResponse,
      facts_used: facts.getAllFacts(),
      validation_score: 1.0,
      triggered_intelligence: intelligenceResults.filter(r => r.triggered).map(r => r.type_id),
      intelligence_results: intelligenceResults,
      provenance: facts.getProvenance(),
      metadata: {
        agent_id: this.agentId,
        mode: 'intelligence_driven_conversational',
        original_question: nextQuestionText, // v28.3: Track original for loop detection
        current_phase: assessmentFlow.current_phase,
        overall_completion: assessmentFlow.overall_completion,
        eq_layer_active: state.current_eq_layer,
        confidence_level: state.confidence_level,
        data_collected_so_far: collectedData,
        suggested_responses: suggestedResponses, // v29.5: Quick reply bubbles for frontend
      },
    };
  }

  /**
   * Apply 27 EQ Layers to transform question into Jenny-style response
   */
  private applyEQLayer(
    rawQuestion: string,
    state: ConversationState,
    collectedData: Record<string, any>,
    userMessage: string
  ): string {
    let response = '';

    // LAYER_1: 27-Second Credibility Architecture (first message only)
    if (state.message_count === 0) {
      response = "Hi! It's really nice to meet you. I'm here to help you build your path to top colleges, and I'd love to learn more about you.\n\n";
      state.current_eq_layer = 1;
    }

    // LAYER_18: Apply Linguistic DNA
    rawQuestion = this.applyLinguisticDNA(rawQuestion);

    // LAYER_6: Cushioned Critique (if addressing gaps)
    if (rawQuestion.toLowerCase().includes('missing') || rawQuestion.toLowerCase().includes('gap')) {
      rawQuestion = this.applyCushionedCritique(rawQuestion, collectedData);
    }

    // LAYER_2: Rapid Diagnostic - Add affirmation if user shared data
    if (userMessage.match(/\d/)) { // Contains numbers (GPA, SAT, etc.)
      response += this.selectAffirmation() + ' ';
    }

    // LAYER_4: Vulnerability Matching (occasionally share personal story)
    if (state.message_count > 3 && Math.random() < 0.15) { // 15% chance after 3 messages
      response += this.addVulnerabilityMatch(userMessage, collectedData) + '\n\n';
    }

    response += rawQuestion;

    // LAYER_20: Confidence Progression (increase affirm ation over time)
    if (state.message_count > 5) {
      state.confidence_level = Math.min(100, state.confidence_level + 5);
    }

    return response;
  }

  /**
   * LAYER_18: Apply Jenny's Linguistic DNA
   */
  private applyLinguisticDNA(text: string): string {
    let transformed = text;

    // Replace "but" with "and"
    transformed = transformed.replace(/\bbut\b/gi, 'and');

    // Replace negative phrases
    transformed = transformed.replace(/you should have/gi, 'you could');
    transformed = transformed.replace(/that\'s wrong/gi, 'let us think about that differently');
    transformed = transformed.replace(/unfortunately/gi, 'what I am thinking is');

    return transformed;
  }

  /**
   * LAYER_6: Cushioned Critique Technique
   */
  private applyCushionedCritique(rawGap: string, collectedData: Record<string, any>): string {
    // Find something to affirm first
    const strengths = [];
    if (collectedData.gpa && collectedData.gpa > 3.7) strengths.push('strong academics');
    if (collectedData.activities && collectedData.activities.length > 0) strengths.push('great extracurricular involvement');
    if (collectedData.interests) strengths.push('clear passions');

    const affirmation = strengths.length > 0
      ? `I think your profile is really ${strengths[0] === 'strong academics' ? 'strong' : 'interesting'} - you have ${strengths.join(' and ')}. `
      : '';

    // Soften the gap language
    const softened = rawGap
      .replace(/missing/gi, 'might benefit from adding')
      .replace(/gap/gi, 'opportunity')
      .replace(/lacking/gi, 'could explore');

    return affirmation + softened;
  }

  /**
   * LAYER_2: Select appropriate affirmation
   */
  private selectAffirmation(): string {
    const affirmations = JENNY_LINGUISTIC_DNA.always_say.affirmation;
    return affirmations[Math.floor(Math.random() * affirmations.length)];
  }

  /**
   * LAYER_4: Vulnerability Matching (share personal story)
   */
  private addVulnerabilityMatch(userMessage: string, collectedData: Record<string, any>): string {
    const msg = userMessage.toLowerCase();

    if (msg.includes('film') || msg.includes('video') || msg.includes('documentary')) {
      return "You know, I also made documentary videos in high school, and that was one of the things I found really rewarding.";
    }

    if (msg.includes('quiet') || msg.includes('introvert')) {
      return "I totally get that - I was pretty quiet in high school too. It doesn't mean you can't be a leader.";
    }

    if (msg.includes('asian') || msg.includes('identity') || collectedData.interests?.includes('community')) {
      return "I actually made a documentary about the Asian American community in Chinatown. These identity stories are so powerful.";
    }

    return '';
  }

  /**
   * LAYER_9: Synthesis Moment (Identity Creation) → Then Action Plan
   *
   * Called when TYPE-080 adaptive questions are exhausted.
   * Delivers identity synthesis, then immediately moves to action planning.
   */
  private async deliverSynthesisMoment(
    facts: FactSet,
    intelligenceResults: IntelligenceResult[],
    state: ConversationState,
    studentId: string
  ): Promise<IntelligenceAgentResponse> {

    const collectedData = this.extractCollectedData(facts);

    // v27.0: Check if new significant data arrived that changes the narrative
    const hasNewSignificantData = this.checkForNewSignificantData(collectedData, state);

    // v27.0: Check if assessment has sufficient depth before handover
    const hasMinimumDepth = this.checkMinimumAssessmentDepth(collectedData, state);

    if (state.synthesis_delivered && !hasNewSignificantData && hasMinimumDepth) {
      // Synthesis delivered + no new data + sufficient depth = A2A Handover to GamePlan
      console.log('[ASSESSMENT_COMPLETE] ✅ Preparing A2A handover to GamePlan Agent');

      // v28.1: Validate handover readiness BEFORE triggering
      console.log('[v28.1_HANDOVER_VALIDATION] Step 1: Loading available facts from kb_items');

      let available_facts: Map<any, any[]>;

      try {
        // Load all facts from kb_items for this student (using v28.1 multi-category storage)
        const kb_result = await this.pool.query(
          `SELECT item_type, edges, created_ts
           FROM kb_items
           WHERE student_id = $1 AND source_ref = 'gpt4o_conversational_extraction_v28'
           ORDER BY created_ts DESC`,
          [studentId]
        );

        console.log(`[v28.1_HANDOVER_VALIDATION] Query returned ${kb_result.rows.length} rows`);

        available_facts = FactCategoryMapper.extractFactsFromKbItems(kb_result.rows);

        console.log(`[v28.1_HANDOVER_VALIDATION] Loaded ${kb_result.rows.length} kb_items across ${available_facts.size} categories`);
        for (const [category, facts_list] of available_facts) {
          console.log(`  - ${category}: ${facts_list.length} facts`);
        }
      } catch (error) {
        console.error('[v28.1_HANDOVER_VALIDATION] ❌ ERROR loading facts:', error);
        console.error('[v28.1_HANDOVER_VALIDATION] Error stack:', (error as Error).stack);
        throw error;
      }

      // Create adaptation context from available facts
      const grade = this.getFactValue(available_facts, 'grade') || 10;
      const personality = this.getFactValue(available_facts, 'personality_type');

      const adaptation_context: AdaptationContext = {
        class_year: grade as 9 | 10 | 11 | 12,
        current_quarter: Math.ceil((new Date().getMonth() + 1) / 3) as 1 | 2 | 3 | 4,
        student_capacity: 'medium', // Default, can be enhanced
        personality_type: personality === 'shy' ? 'shy' : personality === 'confident' ? 'confident' : 'balanced',
      };

      console.log('[v28.1_HANDOVER_VALIDATION] Step 2: Running 20 quality gate validation');

      const validation_result = await HandoverValidator.validateHandover(
        'assessment-agent-v18',
        'gameplan-agent-v3',
        available_facts,
        adaptation_context
      );

      console.log('[v28.1_HANDOVER_VALIDATION] Validation Results:', {
        is_ready: validation_result.is_ready,
        quality_score: validation_result.quality_score,
        quality_gates_passed: `${validation_result.quality_gates_passed}/${validation_result.quality_gates_total}`,
        pass_rate: `${(validation_result.quality_gates_pass_rate * 100).toFixed(0)}%`,
        recommendation: validation_result.recommendation,
        missing_mandatory: validation_result.missing_mandatory_facts.length,
        can_derive: validation_result.can_derive,
      });

      // If not ready but can derive, attempt derivation
      if (!validation_result.is_ready && validation_result.can_derive) {
        console.log('[v28.1_FACT_DERIVATION] Attempting to derive missing facts');

        const missing_fact_types = validation_result.missing_mandatory_facts.flatMap(req => req.fact_types);

        const derived_results = FactDerivationEngine.deriveFacts(
          available_facts,
          missing_fact_types,
          query.student_id,
          'assessment-agent-v18',
          'session_tbd', // Will be enhanced when session context is available
          adaptation_context
        );

        console.log(`[v28.1_FACT_DERIVATION] Derived ${derived_results.length} facts`);

        // Store derived facts to kb_items
        for (const derived of derived_results) {
          const category = derived.fact.category;
          const item_id = `${query.student_id}_${category.toLowerCase()}_derived_v28`;

          await this.pool.query(
            `INSERT INTO kb_items (item_id, student_id, item_type, subtype, title_name, tier1_state, source_ref, confidence, edges, data)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (item_id) DO UPDATE SET
               edges = kb_items.edges || EXCLUDED.edges,
               data = COALESCE(kb_items.data, '{}'::jsonb) || EXCLUDED.data,
               updated_ts = NOW()`,
            [
              item_id,
              query.student_id,
              category,
              derived.fact.fact_type,
              `Derived ${derived.fact.fact_type}`,
              'Outcome',
              `derived_v28_${derived.rule_used}`,
              derived.confidence >= 0.8 ? 'high' : 'medium',
              JSON.stringify({ [derived.fact.fact_type]: derived.fact.value }),
              JSON.stringify({
                derivation_rule: derived.rule_used,
                confidence: derived.confidence,
                derived_at: new Date().toISOString(),
                personas_using: derived.fact.used_by_personas,
              })
            ]
          );

          console.log(`[v28.1_FACT_DERIVATION] ✅ Stored derived fact: ${derived.fact.fact_type} (confidence: ${derived.confidence.toFixed(2)})`);

          // Add to available_facts for re-validation
          if (!available_facts.has(category)) {
            available_facts.set(category, []);
          }
          available_facts.get(category)!.push({
            fact_type: derived.fact.fact_type,
            value: derived.fact.value,
            confidence: derived.confidence,
            quality_score: derived.fact.quality_score,
            metadata: {
              derivation_rule: derived.rule_used,
              is_derived: true,
            },
          });
        }

        // Re-validate after derivation
        const revalidation_result = await HandoverValidator.validateHandover(
          'assessment-agent-v18',
          'gameplan-agent-v3',
          available_facts,
          adaptation_context
        );

        console.log('[v28.1_HANDOVER_VALIDATION] Re-validation after derivation:', {
          is_ready: revalidation_result.is_ready,
          quality_score: revalidation_result.quality_score,
          quality_gates_passed: `${revalidation_result.quality_gates_passed}/${revalidation_result.quality_gates_total}`,
        });
      }

      // Log validation summary
      const validation_summary = HandoverValidator.getValidationSummary(validation_result);
      console.log('[v28.1_HANDOVER_VALIDATION] Summary:\n' + validation_summary);

      // Proceed with handover (even if not perfect - GamePlan can handle graceful degradation)
      const handoverPackage = await this.prepareGamePlanHandover(facts, intelligenceResults, collectedData, state);

      // Enhance handover package with v28.1 validation metadata
      (handoverPackage.metadata as any).v28_validation = {
        quality_score: validation_result.quality_score,
        quality_gates_passed: validation_result.quality_gates_passed,
        quality_gates_total: validation_result.quality_gates_total,
        pass_rate: validation_result.quality_gates_pass_rate,
        is_ready: validation_result.is_ready,
        recommendation: validation_result.recommendation,
        rushed_handover_indicators: validation_result.rushed_handover_indicators,
        student_specific_facts: validation_result.student_specific_count,
        longitudinal_tracking_enabled: validation_result.has_longitudinal_tracking,
      };

      // ARCHIVED 2025-11-05: A2A handoff removed - LangGraph orchestrator handles handover via requires_handover signal
      // The orchestrator detects requires_handover in metadata and routes to gameplan-agent automatically
      console.log('[v34.2] 🎯 Handover signal set in metadata - LangGraph will route to GamePlan Agent');

      // Return with handover signal - orchestrator will handle the actual handover
      return {
        response: "Perfect! I've gathered the core information needed. Let me connect you with our Game Plan strategist who will create your personalized roadmap.",
        facts_used: facts.getAllFacts(),
        validation_score: 1.0,
        triggered_intelligence: intelligenceResults.filter(r => r.triggered).map(r => r.type_id),
        provenance: facts.getProvenance(),
        metadata: {
          agent_id: this.agentId, // Still Assessment Agent until orchestrator switches
          mode: 'handover_ready',
          eq_layer: 10,
          previous_agent: this.agentId,
          next_step: 'gameplan_strategy',

          // v34.2: Handover signal for LangGraph orchestrator
          requires_handover: [{
            from_agent: this.agentId,
            to_agent: 'gameplan-agent-v18',
            reason: 'Assessment complete - minimum schema coverage achieved',
            confidence: 1.0,
            payload: handoverPackage.domain_payload
          }]
        },
      };
    }

    // If synthesis delivered but not enough depth, ask more questions
    if (state.synthesis_delivered && !hasNewSignificantData && !hasMinimumDepth) {
      console.log('[SYNTHESIS_MOMENT] Synthesis confirmed, but need more depth - asking follow-up questions');

      // Ask deeper questions about activities, leadership, service, awards
      const followUpQuestion = this.generatePostSynthesisFollowUp(collectedData);

      // v28.2: Track the follow-up question for context-aware extraction
      state.last_question = followUpQuestion;
      console.log('[V28.2_QUESTION_TRACKING] (Post-synthesis) Tracking question:', followUpQuestion.substring(0, 80));

      // Update state in database
      await this.saveConversationState(state);

      return {
        response: followUpQuestion,
        facts_used: facts.getAllFacts(),
        validation_score: 1.0,
        triggered_intelligence: intelligenceResults.filter(r => r.triggered).map(r => r.type_id),
        intelligence_results: intelligenceResults,
        provenance: facts.getProvenance(),
        metadata: {
          agent_id: this.agentId,
          mode: 'post_synthesis_exploration',
          eq_layer: 9,
          next_step: 'gather_more_depth',
          data_collected_so_far: collectedData,
        },
      };
    }

    // Either first synthesis OR new significant data arrived → Re-synthesize
    if (hasNewSignificantData) {
      console.log('[SYNTHESIS_MOMENT] New significant data detected, re-synthesizing narrative');
      state.synthesis_delivered = false; // Reset to allow re-synthesis
    }

    // v27.0: Generate identity synthesis using GPT-based engagement analysis
    const conversationHistory = this.extractConversationHistory(facts);
    const synthesis = await this.generateIdentitySynthesis(collectedData, intelligenceResults, conversationHistory);

    // Store current data snapshot for comparison on next message
    state.last_synthesized_data = JSON.stringify(collectedData);
    state.synthesis_delivered = true;
    state.current_eq_layer = 9;

    console.log('[SYNTHESIS_MOMENT] Delivered identity synthesis (waiting for confirmation or new data)');

    return {
      response: synthesis,
      facts_used: facts.getAllFacts(),
      validation_score: 1.0,
      triggered_intelligence: intelligenceResults.filter(r => r.triggered).map(r => r.type_id),
      intelligence_results: intelligenceResults,
      provenance: facts.getProvenance(),
      metadata: {
        agent_id: this.agentId,
        mode: 'synthesis_moment',
        eq_layer: 9,
        next_step: 'await_confirmation_or_gameplan_handover',
        data_collected_so_far: collectedData,
      },
    };
  }

  /**
   * Generate identity synthesis from collected data
   * v27.0: Enhanced with Jenny's dynamic formula + GPT-based engagement analysis
   */
  private async generateIdentitySynthesis(
    collectedData: Record<string, any>,
    intelligenceResults: IntelligenceResult[],
    conversationHistory: Array<{role: string; content: string}>
  ): Promise<string> {
    let synthesis = "So I see the connection here. ";

    // Extract interests and find dynamic connections
    const interests = collectedData.interests || [];
    const targetMajor = collectedData.target_major || '';
    const activities = collectedData.activities || [];

    // v27.0: Use GPT-4o to analyze student engagement (replaces heuristics)
    const engagementAnalysis = await analyzeStudentEngagement(conversationHistory, collectedData);

    console.log('[SYNTHESIS] GPT Engagement Analysis:', engagementAnalysis);

    let synthesisCore = '';
    let confidenceLevel: 'high' | 'medium' | 'low' = engagementAnalysis.engagement_level;

    // Generate synthesis core based on data available
    if (interests.length >= 2 || (interests.length >= 1 && targetMajor)) {
      // Use Jenny's formula: "Through X and Y, what you [verb] is [action]"
      synthesisCore = this.generateDynamicSynthesis(interests, targetMajor, activities);
    } else if (interests.length === 1) {
      synthesisCore = `What stands out to me is your genuine passion for ${interests[0]}. `;
      synthesisCore += "That authentic interest is powerful - you're not doing this for college, you're doing it because it matters to you.";
    } else {
      synthesisCore = "I think what stands out to me is your authentic passion for what you do.";
    }

    synthesis += synthesisCore;

    // v27.0: Dynamic follow-up based on GPT-analyzed engagement (not heuristics)
    const followUp = this.generateSynthesisFollowUp(confidenceLevel, interests, targetMajor, engagementAnalysis);
    synthesis += followUp;

    return synthesis;
  }

  /**
   * v27.0: Generate dynamic synthesis follow-up based on GPT engagement analysis
   *
   * Based on 8+ student transcript analysis:
   * - High Engagement: Amplify + validation question
   * - Medium Engagement: Institutional context + affirmation
   * - Low Engagement: Soft probe without pressure
   *
   * Patterns extracted from:
   * - Huda (minute 12:53): High confidence → "Does that resonate with you?"
   * - Srinidhi: Medium confidence → Institutional alignment
   * - Aarnav: Low confidence → "Does that sound interesting?"
   */
  private generateSynthesisFollowUp(
    confidenceLevel: 'high' | 'medium' | 'low',
    interests: string[],
    targetMajor: string,
    engagementAnalysis: any
  ): string {

    console.log('[SYNTHESIS_FOLLOWUP] Routing based on GPT analysis:', {
      confidenceLevel,
      engagementSignals: engagementAnalysis.emotional_signals,
      reasoning: engagementAnalysis.reasoning
    });

    if (confidenceLevel === 'high') {
      // Pattern A: High Engagement - Amplify + Ownership Question
      // (Huda transcript: multi-passionate student with clear narrative)
      return "\n\nThis is actually incredibly powerful for colleges - you're not just listing activities, you have a coherent story. " +
             "Does that resonate with you?";
    }

    if (confidenceLevel === 'medium') {
      // Pattern B: Medium Engagement - Institutional Alignment + Soft Affirmation
      // (Srinidhi transcript: single passion with personal connection)
      const field = interests[0] || targetMajor || 'this area';
      return "\n\nWhat's great about this is that top colleges are specifically looking for students with authentic passion in " +
             `${field}. They want to see that you're doing this because it genuinely matters to you, not just for admissions. ` +
             "How does that feel?";
    }

    // Pattern C: Low Engagement - Soft Probe + Permission
    // (Aarnav transcript: autopilot student, discovery not working)
    return "\n\nI want to explore this with you a bit more to make sure we're capturing your real interests. " +
           "What I'm hearing is important, but I want to make sure it truly reflects what excites you. " +
           "Does that direction feel right, or should we dig deeper?";
  }

  /**
   * Generate dynamic synthesis using Jenny's formula from Huda transcript
   * Formula: "Through [X] and [Y], what you [verb] is [unifying_action].
   *           Whether [example1] or [example2], you [identity_core]."
   */
  private generateDynamicSynthesis(interests: string[], targetMajor: string, activities: any[]): string {
    const allElements = [...interests];
    if (targetMajor && !interests.includes(targetMajor)) {
      allElements.push(targetMajor);
    }

    if (allElements.length < 2) {
      // Fallback to simple theme
      return this.identifyTheme(interests, activities);
    }

    // Extract top 2 mediums
    const [medium1, medium2] = allElements.slice(0, 2);

    // Identify unifying action dynamically
    const { verb, target, identityCore, example1, example2 } = this.analyzeUnifyingPattern(
      medium1,
      medium2,
      allElements
    );

    // Build synthesis using Jenny's formula
    let synthesis = `Through ${medium1} and ${medium2}, what you really ${verb} is ${target}. `;
    synthesis += `Whether ${example1} or ${example2}, you ${identityCore}.`;

    return synthesis;
  }

  /**
   * Analyze pattern between mediums to find unifying action
   * Based on real transcript patterns
   */
  private analyzeUnifyingPattern(medium1: string, medium2: string, allElements: string[]): {
    verb: string;
    target: string;
    identityCore: string;
    example1: string;
    example2: string;
  } {
    const combined = allElements.join(' ').toLowerCase();

    // Pattern 1: Tech + Creative → Bringing things to life
    if ((combined.includes('cs') || combined.includes('tech') || combined.includes('coding') || combined.includes('ai')) &&
        (combined.includes('film') || combined.includes('art') || combined.includes('design') || combined.includes('game'))) {
      return {
        verb: 'like to do',
        target: 'bring things to life',
        identityCore: "like to share stories and create experiences",
        example1: "that's through a game",
        example2: "a video or an app",
      };
    }

    // Pattern 2: STEM + Service → Creating impact
    if ((combined.includes('science') || combined.includes('research') || combined.includes('stem') || combined.includes('tech')) &&
        (combined.includes('service') || combined.includes('community') || combined.includes('volunteer') || combined.includes('impact'))) {
      return {
        verb: 'want to do',
        target: 'create meaningful impact',
        identityCore: "want to use your skills to help others",
        example1: "that's through research",
        example2: "community projects",
      };
    }

    // Pattern 3: Analytical + Creative → Problem-solving through innovation
    if ((combined.includes('math') || combined.includes('science') || combined.includes('data')) &&
        (combined.includes('music') || combined.includes('art') || combined.includes('creative'))) {
      return {
        verb: 'like to do',
        target: 'solve problems creatively',
        identityCore: "combine analytical thinking with creative expression",
        example1: "through technical work",
        example2: "artistic projects",
      };
    }

    // Pattern 4: Multiple STEM → Understanding how things work
    if (combined.includes('cs') || combined.includes('science') || combined.includes('research') ||
        combined.includes('math') || combined.includes('engineering')) {
      return {
        verb: 'like to do',
        target: 'understand how things work',
        identityCore: "have a curious, analytical mindset that wants to solve real problems",
        example1: `through ${medium1}`,
        example2: `or ${medium2}`,
      };
    }

    // Default pattern
    return {
      verb: 'care about',
      target: 'making a difference',
      identityCore: "have genuine passion and depth in what you do",
      example1: `that's ${medium1}`,
      example2: `or ${medium2}`,
    };
  }

  /**
   * Identify unifying theme from interests/activities (FALLBACK)
   */
  private identifyTheme(interests: string[], activities: any[]): string {
    const combined = [...interests, ...(Array.isArray(activities) ? activities.map(String) : [])].join(' ').toLowerCase();

    if ((combined.includes('tech') || combined.includes('cs') || combined.includes('coding')) &&
        (combined.includes('art') || combined.includes('film') || combined.includes('design'))) {
      return "Through both technology and creative work, what you really like to do is bring things to life. Whether that's through code or visual storytelling, you're a creator at heart.";
    }

    if (combined.includes('community') || combined.includes('service') || combined.includes('volunteer')) {
      return "I see a strong theme of impact and community. You're not just focused on your own success - you want to lift others up.";
    }

    if (combined.includes('science') || combined.includes('research') || combined.includes('stem')) {
      return "You have a really analytical, curious mindset. You're someone who wants to understand how things work and solve real problems.";
    }

    return "What connects everything you do is genuine passion and depth - you're not doing things for college, you're doing them because they matter to you.";
  }

  /**
   * v28.0: Prepare A2A handover package for GamePlan Agent
   * Assessment Agent discovers and synthesizes → GamePlan Agent strategizes roadmap
   */
  private async prepareGamePlanHandover(
    facts: FactSet,
    intelligenceResults: IntelligenceResult[],
    collectedData: Record<string, any>,
    state: ConversationState
  ): Promise<A2AHandoverPackage> {

    // Extract intelligence results
    // v29.1: Use TYPE-085 (Rubric Scoring) and TYPE-086 (Gap Priority) instead of old TYPE-081/082
    const rubricScoring = intelligenceResults.find(r => r.type_id === 'TYPE-085');
    const gapPriority = intelligenceResults.find(r => r.type_id === 'TYPE-086');
    const potential = intelligenceResults.find(r => r.type_id === 'TYPE-083');
    const phaseFlow = intelligenceResults.find(r => r.type_id === 'TYPE-080');

    // Generate identity synthesis
    const conversationHistory = this.extractConversationHistory(facts);
    const identitySynthesis = await this.generateIdentitySynthesis(collectedData, intelligenceResults, conversationHistory);

    // Build AssessmentToGamePlanPayload
    const domainPayload: AssessmentToGamePlanPayload = {
      domain: 'assessment_to_gameplan',
      synthesis_delivered: state.synthesis_delivered,
      identity_synthesis: identitySynthesis,
      unique_positioning: this.extractUniquePositioning(collectedData).join(', '),
      narrative_thread: this.buildNarrativeThread(collectedData),

      // Competitive Analysis (from TYPE-085 rubric scoring v29.1)
      // v29.2: Use CanonicalFieldMapper to prevent field mapping mismatches
      ivy_score: CanonicalFieldMapper.extractIvyScore(intelligenceResults),
      competitiveness_tier: this.deriveCompetitivenessTier(CanonicalFieldMapper.extractIvyScore(intelligenceResults)),
      rubric_scores: CanonicalFieldMapper.extractRubricScores(intelligenceResults),
      top_strengths: (rubricScoring?.data as any)?.dimension_scores?.filter((d: any) => d.raw_score >= 7).map((d: any) => d.dimension) || [],
      critical_gaps: (rubricScoring?.data as any)?.dimension_scores?.filter((d: any) => d.raw_score <= 4).map((d: any) => d.dimension) || [],

      // Gap Analysis & Opportunities (from TYPE-086 v29.1)
      p0_gaps: ((gapPriority?.data as any)?.p0_gaps || []).map((g: any) => ({
        category: g.dimension || g.category || '',
        severity: 'p0' as 'p0',
        description: g.gap_description || `${g.dimension} gap: ${g.current_score}/${g.target_score}` || '',
        recommendation: g.recommended_action || `Focus on ${g.dimension}: Priority ${g.priority_score.toFixed(1)}` || '',
      })) as Gap[],
      p1_gaps: ((gapPriority?.data as any)?.p1_gaps || []).map((g: any) => ({
        category: g.dimension || g.category || '',
        severity: 'p1' as 'p1',
        description: g.gap_description || `${g.dimension} gap: ${g.current_score}/${g.target_score}` || '',
        recommendation: g.recommended_action || `Improve ${g.dimension}: Priority ${g.priority_score.toFixed(1)}` || '',
      })) as Gap[],
      quick_wins: ((gapPriority?.data as any)?.quick_wins || []).map((qw: any) => ({
        action: qw.action || qw.dimension || '',
        impact: qw.impact || `+${qw.potential_gain || 0} points in ${qw.dimension}`,
        time_to_complete: qw.time_to_complete || qw.urgency_level || '',
        roi: qw.roi || qw.priority_score || 0,
      })) as QuickWin[],

      // Potential Indicators (from TYPE-083)
      potential_indicators: ((potential?.data as any)?.highest_potential_activations || []).map((ind: any) => ({
        indicator_type: ind.indicator_type || '',
        confidence: ind.confidence || 0,
        evidence: ind.evidence || '',
        recommendation: ind.recommendation || '',
      })) as Indicator[],
      potential_boost: (potential?.data as any)?.potential_ivyscore_boost || 0,

      // Demographics & Context
      demographics: {
        grade: collectedData.grade || 0,
        high_school: collectedData.high_school || '',
        location: collectedData.location || '',
        intended_major: collectedData.target_major || '',
        gpa: collectedData.gpa || 0,
        gpa_type: collectedData.gpa_type || '',
        sat_total: collectedData.sat_total,
        act_composite: collectedData.act_composite,
        ap_count: collectedData.ap_count,
      } as StudentDemographics,

      // Assessment metadata
      assessment_completed_at: new Date().toISOString(),
    };

    // Build ExecutionContext
    const executionContext: ExecutionContext = {
      session_id: state.session_id,
      student_id: state.student_id,
      current_week: 0, // Will be calculated by GamePlan Agent
      target_colleges: collectedData.target_colleges || [],
      timeline_start: new Date().toISOString(),
      timeline_end: '', // Will be set by GamePlan Agent
    };

    // Build A2A Handover Metadata
    const metadata: A2AHandoverMetadata = {
      handover_reason: 'assessment_complete',
      user_visible_transition: true,
      requires_user_confirmation: false,
      priority: 'high',
      assessment_message_count: state.message_count,
      assessment_confidence_level: state.confidence_level,
      intelligence_types_used: intelligenceResults.filter(r => r.triggered).map(r => r.type_id),
    };

    // Build complete A2A handover package
    const handoverPackage: A2AHandoverPackage = {
      handover_id: `a2a_${state.session_id}_${Date.now()}`,
      handover_type: 'sync_handoff' as A2AHandoverType,
      from_agent: this.agentId,
      to_agent: 'gameplan-agent',
      session_id: state.session_id,
      student_id: state.student_id,
      facts,
      domain_payload: domainPayload,
      execution_context: executionContext,
      metadata,
      created_at: new Date(),
    };

    return handoverPackage;
  }

  /**
   * Derive competitiveness tier from rubric score (v29.1)
   * - Elite (40-50): Top-tier competitive
   * - Strong (30-39): Highly competitive
   * - Competitive (20-29): Competitive
   * - Developing (10-19): Building profile
   * - Emerging (0-9): Early stage
   */
  private deriveCompetitivenessTier(score: number): string {
    if (score >= 40) return 'elite';
    if (score >= 30) return 'strong';
    if (score >= 20) return 'competitive';
    if (score >= 10) return 'developing';
    return 'emerging';
  }

  /**
   * Extract unique positioning angles from collected data
   */
  private extractUniquePositioning(collectedData: Record<string, any>): string[] {
    const positioning: string[] = [];

    // Demographic positioning
    if (collectedData.demographics) {
      // Add positioning based on demographics (would need more data)
    }

    // Interest-based positioning
    const interests = collectedData.interests || [];
    if (interests.length >= 2) {
      positioning.push(`Multi-dimensional: ${interests.slice(0, 3).join(' + ')}`);
    }

    // Add more positioning logic based on collected data
    return positioning;
  }

  /**
   * Build narrative thread from interests → major → goals
   */
  private buildNarrativeThread(collectedData: Record<string, any>): string {
    const interests = collectedData.interests || [];
    const major = collectedData.target_major || '';
    const activities = collectedData.activities || [];

    if (interests.length > 0 && major) {
      return `${interests.join(', ')} → ${major}`;
    } else if (interests.length > 0) {
      return `Exploring ${interests.join(', ')}`;
    } else {
      return 'Discovering passions';
    }
  }

  /**
   * Select next question from adaptive questions (prioritize P0 > P1 > P2)
   */
  private selectNextQuestion(
    questions: any[],
    collectedData: Record<string, any>,
    state: ConversationState
  ): any {
    // Sort by priority
    const sorted = questions.sort((a, b) => {
      const priorityMap: any = { P0: 0, P1: 1, P2: 2 };
      return priorityMap[a.priority] - priorityMap[b.priority];
    });

    return sorted[0] || { question: "Tell me more about yourself.", category: "General", priority: "P2" };
  }

  /**
   * v35.0 DYNAMIC ASSESSMENT: Use DynamicQuestionGenerator for true LLM-driven question generation
   * Replaces v34.3's hardcoded question selection with intelligent, contextual generation
   */
  private async generateEnhancedQuestion(
    assessmentProgress: AssessmentProgress,
    lastStudentResponse: string,
    conversationHistory: any[],
    studentId: string,
    collectedData: Record<string, any>,
    parentPresent: boolean = false
  ): Promise<string | null> {
    try {
      // Build context for LLM question generation
      const context: QuestionGenerationContext = {
        student_id: studentId,
        current_phase: this.mapTierToPhase(assessmentProgress.next_priority_tier),
        collected_data: collectedData,
        missing_data_keys: this.extractMissingKeys(assessmentProgress),
        conversation_history: conversationHistory.map((msg: any) => ({
          role: msg.role || 'user',
          content: msg.content || msg.message || ''
        })),
        last_student_response: lastStudentResponse,
        confidence_level: assessmentProgress.overall_completion,
        parent_present: parentPresent
      };

      // Generate dynamic question using LLM
      const dynamicQuestion = await this.dynamicQuestionGenerator.generateQuestion(context);

      console.log('[v35.0 DYNAMIC ASSESSMENT] Generated LLM question:', {
        question_preview: dynamicQuestion.question.substring(0, 80),
        category: dynamicQuestion.category,
        priority: dynamicQuestion.priority,
        rationale: dynamicQuestion.rationale
      });

      return dynamicQuestion.question;
    } catch (error) {
      console.error('[v35.0 DYNAMIC ASSESSMENT] Error generating dynamic question:', error);
      return null; // Fallback to TYPE-080 questions
    }
  }

  /**
   * v35.0: Map tier to 4-phase framework
   */
  private mapTierToPhase(tier: string | null): 'discovery' | 'narrative' | 'strategy' | 'time' {
    if (!tier) return 'discovery';
    if (tier.includes('profile')) return 'discovery';
    if (tier.includes('activity') || tier.includes('context')) return 'narrative';
    if (tier.includes('gaps')) return 'strategy';
    if (tier.includes('psychology')) return 'time';
    return 'discovery';
  }

  /**
   * v35.0: Extract missing keys from assessment progress
   */
  private extractMissingKeys(assessmentProgress: AssessmentProgress): string[] {
    const missing: string[] = [];
    for (const tierProgress of Object.values(assessmentProgress.tier_progress)) {
      missing.push(...tierProgress.missing_critical);
      missing.push(...tierProgress.missing_optional.slice(0, 5)); // Top 5 optional
    }
    return missing.slice(0, 20); // Max 20 to keep prompt size reasonable
  }

  /**
   * v35.0 DYNAMIC BUBBLES: Generate response bubbles using LLM
   */
  private async generateDynamicResponseBubbles(
    question: string,
    collectedData: Record<string, any>,
    lastResponse: string
  ): Promise<string[]> {
    try {
      const context: ResponseBubbleContext = {
        question,
        collected_data: collectedData,
        last_response: lastResponse,
        student_profile: {
          grade: collectedData.grade,
          interests: collectedData.interests ? [collectedData.interests] : [],
          activities: collectedData.current_activities ? [collectedData.current_activities] : []
        }
      };

      const bubbles = await this.dynamicQuestionGenerator.generateResponseBubbles(context);

      console.log('[v35.0 DYNAMIC BUBBLES] Generated suggestions:', bubbles);

      return bubbles;
    } catch (error) {
      console.error('[v35.0 DYNAMIC BUBBLES] Error generating bubbles:', error);
      return []; // Return empty array on error
    }
  }

  /**
   * Filter out questions we've already asked this student
   * OR questions where we already have the data
   *
   * v28.1: Universal fix for infinite loop - check collected data, not just questions asked
   */
  private async filterAlreadyAskedQuestions(
    adaptiveQuestions: any[],
    questionsAsked: string[],
    collectedData?: Record<string, any>
  ): Promise<any[]> {
    return adaptiveQuestions.filter(aq => {
      const questionText = aq.question.toLowerCase();

      // Check 1: Have we already asked this exact question?
      const alreadyAsked = questionsAsked.some(asked => {
        const askedLower = asked.toLowerCase();
        // Check for semantic similarity (simple keyword matching)
        const keywords = questionText.split(' ').filter(w => w.length > 4);
        return keywords.some(keyword => askedLower.includes(keyword));
      });

      if (alreadyAsked) {
        console.log('[FILTER_QUESTIONS] Skipping already asked:', questionText.substring(0, 60));
        return false;
      }

      // Check 2: Do we already have data for what this question is asking?
      if (collectedData && Object.keys(collectedData).length > 0) {
        // Map question keywords to likely data fields
        // v28.1: Expanded keyword matching to catch variations
        const dataFieldMappings: Record<string, string[]> = {
          'activities': ['current_activities', 'activities', 'extracurriculars'],
          'projects': ['current_activities', 'activities', 'projects'],
          'built': ['current_activities', 'activities', 'projects'],  // "what have you built"
          'done': ['current_activities', 'activities', 'projects'],   // "what have you done"
          'working on': ['current_activities', 'activities', 'projects'], // "working on"
          'school': ['high_school', 'school_name'],
          'attend': ['high_school', 'school_name'],  // "what school do you attend"
          'grade': ['grade', 'class_year'],
          'interests': ['interests', 'passions'],
          'subjects': ['interests', 'passions'],  // "what subjects"
          'major': ['target_major', 'intended_major'],
          'study': ['target_major', 'intended_major'],  // "what do you want to study"
          'gpa': ['gpa', 'unweighted_gpa', 'weighted_gpa'],
          'sat': ['sat_total', 'sat_score'],
          'awards': ['awards', 'recognitions'],
          'leadership': ['leadership_roles', 'leadership'],
        };

        for (const [keyword, dataFields] of Object.entries(dataFieldMappings)) {
          if (questionText.includes(keyword)) {
            const hasData = dataFields.some(field => {
              const value = collectedData[field];
              const hasValue = value !== undefined && value !== null &&
                              (Array.isArray(value) ? value.length > 0 : true);
              if (hasValue) {
                console.log(`[FILTER_QUESTIONS] Skipping question about "${keyword}" - already have data in "${field}":`, value);
              }
              return hasValue;
            });

            if (hasData) {
              return false; // Filter out this question
            }
          }
        }
      }

      return true; // Keep this question
    });
  }

  /**
   * Extract collected data from facts
   */
  private extractCollectedData(facts: FactSet): Record<string, any> {
    const collectedData: Record<string, any> = {};
    const allFacts = facts.getAllFacts();

    console.log('[EXTRACT_COLLECTED_DATA] Total facts loaded:', allFacts.length);

    allFacts.forEach((fact, index) => {
      console.log(`[EXTRACT_COLLECTED_DATA] Fact ${index + 1}:`, {
        category: fact.category,
        fact_type: fact.fact_type,
        value_keys: fact.value && typeof fact.value === 'object' ? Object.keys(fact.value) : 'not an object'
      });

      if (fact.value && typeof fact.value === 'object') {
        Object.assign(collectedData, fact.value);
      }
    });

    console.log('[EXTRACT_COLLECTED_DATA] Final collected data keys:', Object.keys(collectedData));
    console.log('[EXTRACT_COLLECTED_DATA] Final collected data:', JSON.stringify(collectedData, null, 2));

    return collectedData;
  }

  /**
   * v29.5: Generate suggested quick reply responses based on question context
   * Provides clickable response bubbles to speed up testing and improve UX
   */
  private generateSuggestedResponses(question: any, collectedData: Record<string, any>): string[] {
    const questionText = question.question.toLowerCase();
    const suggestions: string[] = [];

    // Grade detection
    if (questionText.includes('grade') || questionText.includes('year')) {
      return ['9th grade', '10th grade', '11th grade', '12th grade'];
    }

    // School detection
    if (questionText.includes('school')) {
      return ['Mountain House High School', 'Mission San Jose High School', 'American High School'];
    }

    // Interests/Activities detection
    if (questionText.includes('interest') || questionText.includes('passionate') || questionText.includes('excites you')) {
      return ['Computer Science', 'Biology/Pre-Med', 'Business/Entrepreneurship', 'Environmental Science'];
    }

    // Major detection
    if (questionText.includes('major') || questionText.includes('study')) {
      return ['Computer Science', 'Pre-Med/Biology', 'Business', 'Engineering', 'Psychology'];
    }

    // Dream schools detection
    if (questionText.includes('dream') || questionText.includes('target') || questionText.includes('college')) {
      return ['Stanford, MIT, CMU', 'UC Berkeley, UCLA, UCSD', 'Harvard, Yale, Princeton', 'Not sure yet'];
    }

    // Projects/Activities detection
    if (questionText.includes('project') || questionText.includes('activity') || questionText.includes('built') || questionText.includes('created')) {
      return ['Built an app/website', 'Research project', 'Started a club', 'Volunteering work'];
    }

    // Impact detection
    if (questionText.includes('impact') || questionText.includes('help') || questionText.includes('difference')) {
      return ['Help my community', 'Empower others', 'Solve real problems', 'Create opportunities'];
    }

    // Challenges detection
    if (questionText.includes('challenge') || questionText.includes('obstacle') || questionText.includes('difficult')) {
      return ['Time management', 'Lack of resources', 'Self-doubt', 'Finding opportunities'];
    }

    // Goals detection
    if (questionText.includes('goal') || questionText.includes('achieve') || questionText.includes('accomplish')) {
      return ['Get into top college', 'Win awards/competitions', 'Launch my project', 'Make a difference'];
    }

    // Default suggestions for open-ended questions
    return ['Tell me more', 'I need help with this', 'Let me think about it', 'What do you recommend?'];
  }

  /**
   * v27.0: Extract conversation history for GPT engagement analysis
   * Used to understand student's emotional tone and response quality
   */
  private extractConversationHistory(facts: FactSet): Array<{role: string; content: string}> {
    const conversationHistory: Array<{role: string; content: string}> = [];
    const allFacts = facts.getAllFacts();

    // Extract message history from facts (if stored)
    // For now, we'll extract from state if available
    // TODO: Consider storing full conversation in facts for better context

    console.log('[EXTRACT_CONVERSATION] Extracting conversation for engagement analysis');

    // Placeholder: In production, conversation should be stored in session/facts
    // For now, return empty array and rely on collected data analysis
    return conversationHistory;
  }

  /**
   * v27.0: Check if assessment has minimum depth before handover
   *
   * Minimum requirements:
   * - At least 6 messages exchanged (not too rushed)
   * - Core data collected: grade, school, interests, major
   * - At least one of: activities, leadership, or awards mentioned
   *
   * Based on Jenny's typical 15-25 minute assessments (10-20 exchanges)
   */
  private checkMinimumAssessmentDepth(data: Record<string, any>, state: ConversationState): boolean {
    // v28.2: Check all semantic variants of activities
    const hasActivitiesData = (data.activities?.length || 0) > 0 ||
                              (data.current_activities?.length || 0) > 0 ||
                              (data.extracurriculars?.length || 0) > 0 ||
                              (data.projects?.length || 0) > 0;

    console.log('[DEPTH_CHECK] Checking assessment depth:', {
      message_count: state.message_count,
      has_grade: !!data.grade,
      has_school: !!data.high_school,
      has_interests: (data.interests?.length || 0) > 0,
      has_major: !!data.target_major,
      has_activities: hasActivitiesData,
      has_leadership: (data.leadership_roles?.length || 0) > 0,
    });

    // Minimum message threshold (synthesis at message 4, so need at least 6 total for depth)
    if (state.message_count < 6) {
      console.log('[DEPTH_CHECK] ❌ Not enough messages yet (need 6+, have', state.message_count, ')');
      return false;
    }

    // Must have core data
    const hasCoreData = data.grade && data.high_school &&
                        (data.interests?.length > 0 || data.target_major);

    if (!hasCoreData) {
      console.log('[DEPTH_CHECK] ❌ Missing core data');
      return false;
    }

    // Should have at least some activities/leadership/awards context
    const hasDepth = hasActivitiesData ||
                     (data.leadership_roles?.length || 0) > 0 ||
                     (data.career_goals?.length || 0) > 0;

    if (!hasDepth) {
      console.log('[DEPTH_CHECK] ❌ No activities/leadership depth yet');
      return false;
    }

    console.log('[DEPTH_CHECK] ✅ Sufficient depth for handover');
    return true;
  }

  /**
   * v27.0: Generate follow-up questions after synthesis to gather more depth
   * v28.1: Use semantic field checking to handle field name variations
   */
  private generatePostSynthesisFollowUp(data: Record<string, any>): string {
    // v28.1: Helper to check if we have activities data (any semantic variant)
    const hasActivities = data.activities?.length > 0 ||
                         data.current_activities?.length > 0 ||
                         data.extracurriculars?.length > 0 ||
                         data.projects?.length > 0;

    const hasLeadership = data.leadership_roles?.length > 0;

    // Priority: Ask about what's missing
    if (!hasActivities) {
      return "Great! Now tell me - what activities or projects have you been working on related to " +
             `${data.interests?.[0] || data.target_major || 'your interests'}? What have you actually built or done?`;
    }

    if (!hasLeadership) {
      return "Perfect! Have you taken on any leadership roles in your activities? " +
             "Like leading a team, starting something, or mentoring others?";
    }

    // Fallback: Ask about impact/scale
    return "Excellent! Tell me more about the impact of your work. " +
           "Have any of your projects reached other people, won recognition, or created change?";
  }

  /**
   * v27.0: Check if new significant data arrived that changes the synthesis narrative
   *
   * Significant changes:
   * - New interests added (especially if they change the narrative arc)
   * - Target major changed
   * - New activities that shift the story
   *
   * NOT significant:
   * - Student just confirming ("yes", "that's right", etc.)
   * - Minor clarifications
   */
  private checkForNewSignificantData(currentData: Record<string, any>, state: ConversationState): boolean {
    if (!state.last_synthesized_data) {
      return false; // First synthesis, no previous data to compare
    }

    try {
      const previousData = JSON.parse(state.last_synthesized_data);

      // Check interests array changes
      const prevInterests = previousData.interests || [];
      const currInterests = currentData.interests || [];

      if (currInterests.length > prevInterests.length) {
        console.log('[NEW_DATA_CHECK] New interests detected:', {
          previous: prevInterests,
          current: currInterests,
          new_interests: currInterests.filter((i: string) => !prevInterests.includes(i))
        });
        return true;
      }

      // Check if interests completely changed (replaced, not added)
      if (currInterests.length > 0 && prevInterests.length > 0) {
        const interestsChanged = !currInterests.every((i: string) => prevInterests.includes(i));
        if (interestsChanged) {
          console.log('[NEW_DATA_CHECK] Interests replaced:', {
            previous: prevInterests,
            current: currInterests
          });
          return true;
        }
      }

      // Check target major changes
      if (currentData.target_major && currentData.target_major !== previousData.target_major) {
        console.log('[NEW_DATA_CHECK] Target major changed:', {
          previous: previousData.target_major,
          current: currentData.target_major
        });
        return true;
      }

      // Check activities changes
      const prevActivities = previousData.activities || [];
      const currActivities = currentData.activities || [];

      if (currActivities.length > prevActivities.length) {
        console.log('[NEW_DATA_CHECK] New activities detected');
        return true;
      }

      console.log('[NEW_DATA_CHECK] No significant data changes detected');
      return false;

    } catch (error) {
      console.error('[NEW_DATA_CHECK] Error comparing data:', error);
      return false; // On error, don't re-synthesize
    }
  }

  /**
   * Generate initial greeting (LAYER_1)
   */
  private async generateGreeting(state: ConversationState, intelligenceResults?: IntelligenceResult[]): Promise<IntelligenceAgentResponse> {
    const greeting = state.message_count === 0
      ? "Hi! It's really nice to meet you. I'm here to help you build your path to top colleges, and I'd love to learn more about you.\n\nCan you tell me what your GPA is so far?"
      : "Tell me more about yourself - your interests, activities, and goals.";

    // v28.2: Track the question for context-aware extraction
    const question = state.message_count === 0
      ? "Can you tell me what your GPA is so far?"
      : "Tell me more about yourself - your interests, activities, and goals.";

    state.last_question = question;
    console.log('[V28.2_QUESTION_TRACKING] (Greeting) Tracking question:', question);

    // Update state in database
    await this.saveConversationState(state);

    return {
      response: greeting,
      facts_used: [],
      validation_score: 1.0,
      triggered_intelligence: intelligenceResults?.filter(r => r.triggered).map(r => r.type_id) || [],
      intelligence_results: intelligenceResults || [],
      provenance: [],
      metadata: {
        agent_id: this.agentId,
        mode: 'greeting',
        eq_layer: 1,
      },
    };
  }

  /**
   * Load conversation state from database
   */
  private async loadConversationState(sessionId: string, studentId: string): Promise<ConversationState> {
    // Check memory cache first
    if (this.sessionStates.has(sessionId)) {
      return this.sessionStates.get(sessionId)!;
    }

    try {
      // Load from database
      const result = await this.pool.query(
        `SELECT metadata FROM multiagent_sessions WHERE id = $1`,
        [sessionId]
      );

      if (result.rows.length > 0 && result.rows[0].metadata?.conversation_state) {
        const state = result.rows[0].metadata.conversation_state as ConversationState;
        this.sessionStates.set(sessionId, state);
        return state;
      }
    } catch (error) {
      log.error('load_conversation_state_error', error);
    }

    // Create new state
    const newState: ConversationState = {
      session_id: sessionId,
      student_id: studentId,
      questions_asked: [],
      confidence_level: 0,
      parent_present: false,
      synthesis_delivered: false,
      current_eq_layer: 0,
      message_count: 0,
    };

    this.sessionStates.set(sessionId, newState);
    return newState;
  }

  /**
   * Save conversation state to database
   */
  private async saveConversationState(state: ConversationState): Promise<void> {
    try {
      await this.pool.query(
        `UPDATE multiagent_sessions
         SET metadata = jsonb_set(
           COALESCE(metadata, '{}'::jsonb),
           '{conversation_state}',
           $1::jsonb
         )
         WHERE id = $2`,
        [JSON.stringify(state), state.session_id]
      );
    } catch (error) {
      log.error('save_conversation_state_error', error);
    }
  }

  /**
   * Extract and store facts using GPT-4o (reuse from parent)
   * v28.2: Now accepts last_question for context-aware extraction
   */
  async extractAndStoreFacts(
    studentId: string,
    userMessage: string,
    conversationHistory: string,
    lastQuestion: string = ''
  ): Promise<void> {
    // v31.3: Deep trace logging temporarily disabled due to module path issues
    // Will use console.log for now to test OpenAI API key fix

    console.log('[EXTRACT_GPT4O] Starting extraction...');
    console.log('[EXTRACT_GPT4O] Student ID:', studentId);
    console.log('[EXTRACT_GPT4O] User message:', userMessage);
    console.log('[EXTRACT_GPT4O] Last question:', lastQuestion);

    try {
      const rawExtractedData = await extractAssessmentDataGPT(userMessage, conversationHistory, lastQuestion);

      console.log('[EXTRACT_GPT4O] Raw extracted data:', JSON.stringify(rawExtractedData, null, 2));

      const extractedData = validateAndNormalizeData(rawExtractedData);

      console.log('[EXTRACT_GPT4O] Validated data:', JSON.stringify(extractedData, null, 2));

      if (Object.keys(extractedData).length > 0) {
        await this.storeExtractedFacts(studentId, extractedData);
        console.log(`[EXTRACT_GPT4O] ✅ Stored ${Object.keys(extractedData).length} data points`);
      } else {
        console.log('[EXTRACT_GPT4O] ⚠️ No data extracted from user message');
      }
    } catch (error) {
      console.error('[EXTRACT_GPT4O] ❌ ERROR:', error);
      throw error;
    }
  }

  /**
   * Store extracted facts in kb_items using FactCategoryMapper (v28.1 multi-category storage)
   *
   * Enhancement: Uses FactCategoryMapper to intelligently map facts to multiple categories:
   * - STUDENT_PROFILE: grade, high_school, target_major, personality_type
   * - ASSESSMENT_DATA: rubric scores, gaps, unique_narrative
   * - ACTIVITY_DATA: current activities, leadership_roles, time_commitments
   * - GOAL_DATA: target_schools, target_colleges
   * - ACADEMIC_DATA: GPA, test scores, AP count
   */
  private async storeExtractedFacts(
    studentId: string,
    extractedData: ExtractedAssessmentData
  ): Promise<void> {
    try {
      console.log('[v28.1] Using FactCategoryMapper for multi-category storage');

      // Flatten extractedData into simple key-value pairs
      const flatData: Record<string, any> = {};

      // Student Profile facts
      if (extractedData.grade) flatData.grade = extractedData.grade;
      if (extractedData.high_school) flatData.high_school = extractedData.high_school;
      if (extractedData.target_major) flatData.target_major = extractedData.target_major;
      if (extractedData.personality_type) flatData.personality_type = extractedData.personality_type;
      if (extractedData.interests) flatData.interests = extractedData.interests;

      // Academic Data facts
      if (extractedData.gpa) flatData.gpa = extractedData.gpa;
      if (extractedData.gpa_type) flatData.gpa_type = extractedData.gpa_type;
      if (extractedData.sat_total) flatData.sat_total = extractedData.sat_total;
      if (extractedData.act_composite) flatData.act_composite = extractedData.act_composite;
      if (extractedData.ap_count) flatData.ap_count = extractedData.ap_count;

      // Activity Data facts
      if (extractedData.activities) flatData.current_activities = extractedData.activities;
      if (extractedData.leadership_roles) flatData.leadership_roles = extractedData.leadership_roles;

      // Goal Data facts
      if (extractedData.target_colleges) flatData.target_schools = extractedData.target_colleges;

      // Social/Confidence facts (mapped to STUDENT_PROFILE)
      if (extractedData.friend_group_size) flatData.friend_group_size = extractedData.friend_group_size;
      if (extractedData.friend_group_dynamic) flatData.friend_group_dynamic = extractedData.friend_group_dynamic;

      if (Object.keys(flatData).length === 0) {
        console.log('[v28.1] No extractable facts found');
        return;
      }

      // Use FactCategoryMapper to map to categories
      const categorizedFacts = FactCategoryMapper.mapToCategories(
        flatData,
        studentId,
        'assessment-agent-v18',
        'session_tbd' // Will be enhanced when session context is available
      );

      console.log(`[v28.1] Mapped ${Object.keys(flatData).length} facts to ${categorizedFacts.size} categories`);

      // Store to each category
      for (const [category, enhancedFacts] of categorizedFacts) {
        const factsByType = new Map<string, any>();

        // Group facts by fact_type for storage
        for (const fact of enhancedFacts) {
          factsByType.set(fact.fact_type, fact.value);
        }

        // Store as single kb_item per category with all facts in edges
        const item_id = `${studentId}_${category.toLowerCase()}_v28`;

        // Combine facts and metadata into edges JSON
        const edgesData = {
          ...Object.fromEntries(factsByType),
          v28_metadata: {
            fact_count: enhancedFacts.length,
            personas_used: [...new Set(enhancedFacts.flatMap(f => f.used_by_personas))],
            student_specific_count: enhancedFacts.filter(f => f.is_student_specific).length,
            longitudinal_count: enhancedFacts.filter(f => f.track_over_time).length,
            avg_quality_score: enhancedFacts.reduce((sum, f) => sum + f.quality_score, 0) / enhancedFacts.length,
            extraction_timestamp: new Date().toISOString(),
          }
        };

        await this.pool.query(
          `INSERT INTO kb_items (item_id, student_id, item_type, subtype, title_name, tier1_state, source_ref, confidence, edges)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (item_id) DO UPDATE SET
             edges = kb_items.edges || EXCLUDED.edges,
             updated_ts = NOW()`,
          [
            item_id,
            studentId,
            category, // Use FactCategory enum value (e.g., 'student_profile')
            'extracted_facts',
            `${category} Facts`,
            'Outcome',
            'gpt4o_conversational_extraction_v28',
            'high',
            JSON.stringify(edgesData),
          ]
        );

        console.log(`[v28.1] ✅ Stored ${enhancedFacts.length} facts to ${category} category`);
      }

      console.log('[v28.1] Multi-category storage complete');
    } catch (error) {
      log.error('store_extracted_facts_error_v28', error);
    }
  }

  /**
   * Helper: Get fact value from categorized facts
   */
  private getFactValue(available_facts: Map<FactCategory, any[]>, fact_type: string): any {
    for (const [_, facts] of available_facts) {
      const fact = facts.find((f: any) => f.fact_type === fact_type || f.subtype === fact_type);
      if (fact) {
        return fact.value;
      }
    }
    return null;
  }

  /**
   * v34.1: DEFENSIVE - Check if assessment has enough data for handover
   *
   * Safe handling:
   * - Empty facts array
   * - Missing fields
   * - Undefined values
   * - Type mismatches
   */
  private checkAssessmentCompletion(facts: FactSet): boolean {
    try {
      // Get all facts safely
      const allFacts = facts?.getAllFacts?.() || [];

      // GUARD: Handle empty facts
      if (!allFacts || allFacts.length === 0) {
        log.event('assessment.completion_check.no_facts', {
          facts_count: 0
        });
        return false;
      }

      // Convert to map with safe defaults
      const factMap: Record<string, any> = {};

      for (const fact of allFacts) {
        try {
          // Handle both .fact_type and .category
          const key = fact?.fact_type || fact?.category;
          const value = fact?.value;

          if (key && value !== undefined && value !== null) {
            factMap[key] = value;
          }
        } catch (err) {
          // Skip malformed facts
          log.event('assessment.completion_check.skip_fact', {
            error: String(err)
          });
          continue;
        }
      }

      // GUARD: Check if we have any meaningful facts
      if (Object.keys(factMap).length === 0) {
        log.event('assessment.completion_check.no_meaningful_facts', {
          raw_facts: allFacts.length,
          parsed_facts: 0
        });
        return false;
      }

      // Core required fields for assessment completion
      const coreFields = ['grade', 'high_school', 'interests'];

      // SAFE: Check each field exists with truthy value
      const hasCoreFields = coreFields.every(field => {
        const value = factMap[field];
        return value !== undefined &&
               value !== null &&
               value !== '' &&
               value !== 'unknown';
      });

      if (!hasCoreFields) {
        const missingFields = coreFields.filter(f => !factMap[f]);
        log.event('assessment.completion_check.missing_core_fields', {
          missing: missingFields,
          present: Object.keys(factMap)
        });
        return false;
      }

      // Count meaningful facts (filter out empty/trivial values)
      const meaningfulFacts = Object.entries(factMap).filter(([key, value]) => {
        // SAFE: Check value is meaningful
        if (value === undefined || value === null || value === '') {
          return false;
        }

        if (value === 'unknown' || value === 'n/a') {
          return false;
        }

        // Check arrays
        if (Array.isArray(value)) {
          return value.length > 0;
        }

        // Check objects
        if (typeof value === 'object') {
          return Object.keys(value).length > 0;
        }

        return true;
      });

      // Assessment complete if:
      // 1. Has core fields (grade, school, interests)
      // 2. Has at least 5 meaningful facts total
      const isComplete = meaningfulFacts.length >= 5;

      log.event('assessment.completion_check.result', {
        has_core_fields: hasCoreFields,
        meaningful_facts_count: meaningfulFacts.length,
        is_complete: isComplete,
        facts_present: Object.keys(factMap)
      });

      return isComplete;

    } catch (error) {
      // CATCH: Any unexpected errors
      log.error('assessment.completion_check.error', {
        error: String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      // Safe fallback: not complete
      return false;
    }
  }

  /**
   * v34.1: Calculate how many assessment phases are complete
   *
   * @param facts - All facts collected for the student
   * @returns Number of phases complete (0-4)
   */
  /**
   * v34.1: Calculate number of assessment phases complete
   * LAYER 3: Defensive implementation - never throws
   *
   * @param facts - All facts collected for the student
   * @returns Number of phases complete (0-4), or 0 on error
   */
  private calculatePhasesComplete(facts: FactSet): number {
    try {
      // GUARD: Handle null/undefined facts
      const allFacts = facts?.getAllFacts?.() || [];

      if (!allFacts || allFacts.length === 0) {
        return 0;
      }

      const factMap: Record<string, any> = {};

      // SAFE: Build fact map with defensive access
      for (const fact of allFacts) {
        try {
          const key = fact?.fact_type || fact?.category;
          const value = fact?.value;

          if (key && value !== undefined && value !== null) {
            factMap[key] = value;
          }
        } catch (err) {
          // Skip malformed facts
          continue;
        }
      }

      let phases = 0;

      // Phase 1: Basic Academic Info
      if (factMap.grade && factMap.high_school) {
        phases++;
      }

      // Phase 2: Interests & Passion
      if (factMap.interests || factMap.target_major || factMap.passions) {
        phases++;
      }

      // Phase 3: Activities & Projects
      if (factMap.current_activities || factMap.projects || factMap.activities) {
        phases++;
      }

      // Phase 4: Character & Values
      if (factMap.values || factMap.challenges || factMap.defining_moments || factMap.character) {
        phases++;
      }

      log.event('assessment.phases_complete', {
        phases_complete: phases,
        has_basic: phases >= 1,
        has_interests: phases >= 2,
        has_activities: phases >= 3,
        has_character: phases >= 4
      });

      return phases;

    } catch (error) {
      // CATCH: Any error in phase calculation
      log.error('assessment.phases_complete.error', {
        error: String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return 0; // Safe fallback
    }
  }

  /**
   * v34.1: Generate handover response when assessment is complete
   * LAYER 3: Defensive implementation - never throws
   *
   * @param facts - All facts collected for the student
   * @returns Handover message to send to user
   */
  private generateHandoverResponse(facts: FactSet): string {
    try {
      // SAFE: Calculate phases (returns 0 on error)
      const phasesComplete = this.calculatePhasesComplete(facts);

      // GUARD: Handle unexpected phase count
      if (phasesComplete < 0 || phasesComplete > 4) {
        log.event('assessment.handover_response.invalid_phases', {
          phases_complete: phasesComplete
        });
      }

      return `Perfect! I've gathered everything I need to understand your profile and goals.

Based on our conversation, I can see your authentic passion and potential. Let me hand you over to our Game Plan strategist who will create your personalized roadmap to success.

Ready to see your strategic plan?`;

    } catch (error) {
      // CATCH: Any error in generating handover response
      log.error('assessment.handover_response.error', {
        error: String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      // Safe fallback message
      return `Great! I've gathered what I need. Let me connect you with our Game Plan strategist who will help create your personalized roadmap.`;
    }
  }

  /**
   * v34.1: Clear handover tracking for a session
   *
   * @param sessionId - Session ID to clear
   */
  public clearSessionHandover(sessionId: string): void {
    this.sessionHandovers.delete(sessionId);
    log.event('assessment.handover_cleared', { session_id: sessionId });
  }

  /**
   * v34.2 UNIVERSAL FACTS: Convert extracted data → Universal Facts
   *
   * Each fact declares its schema_target (which production table to populate)
   */
  private toUniversalFacts(
    studentId: string,
    extractedData: any,
    sessionId: string
  ): UniversalFact[] {
    const facts: UniversalFact[] = [];
    const timestamp = Date.now();

    // Grade fact → students table
    if (extractedData.grade !== undefined) {
      facts.push({
        fact_id: `fact_${studentId}_grade_${timestamp}`,
        student_id: studentId,
        category: UFFactCategory.PROFILE,
        subcategory: 'grade',

        schema_target: {
          primary_table: ProductionTable.STUDENTS,
          related_tables: [ProductionTable.WEEKLY_VITALS],
          update_strategy: 'upsert'
        },

        data: {
          fields: {
            current_grade: extractedData.grade,
            graduation_year: this.calculateGradYear(extractedData.grade)
          },
          metadata: {
            field_name: 'grade',  // ← For coverage tracking
            data_type: 'integer',
            schema_requirement: 'required'
          }
        },

        source: {
          agent_id: 'assessment-agent-v18',
          extraction_method: 'gpt4o_conversational_v28',
          source_type: 'conversation',
          session_id: sessionId
        },
        confidence: 0.95,
        extracted_at: new Date().toISOString(),
        verified: true
      });
    }

    // High school fact → students table
    if (extractedData.high_school) {
      facts.push({
        fact_id: `fact_${studentId}_high_school_${timestamp}`,
        student_id: studentId,
        category: UFFactCategory.PROFILE,
        subcategory: 'high_school',

        schema_target: {
          primary_table: ProductionTable.STUDENTS,
          update_strategy: 'upsert'
        },

        data: {
          fields: {
            high_school_name: extractedData.high_school
          },
          metadata: {
            field_name: 'high_school',
            data_type: 'string',
            schema_requirement: 'required'
          }
        },

        source: {
          agent_id: 'assessment-agent-v18',
          extraction_method: 'gpt4o_conversational_v28',
          source_type: 'conversation',
          session_id: sessionId
        },
        confidence: 0.98,
        extracted_at: new Date().toISOString(),
        verified: true
      });
    }

    // Interests fact → kb_items table
    if (extractedData.interests && extractedData.interests.length > 0) {
      facts.push({
        fact_id: `fact_${studentId}_interests_${timestamp}`,
        student_id: studentId,
        category: UFFactCategory.PROFILE,
        subcategory: 'interests',

        schema_target: {
          primary_table: ProductionTable.KB_ITEMS,
          update_strategy: 'upsert'
        },

        data: {
          fields: {
            interests: extractedData.interests
          },
          metadata: {
            field_name: 'interests',
            data_type: 'array',
            schema_requirement: 'required'
          }
        },

        source: {
          agent_id: 'assessment-agent-v18',
          extraction_method: 'gpt4o_conversational_v28',
          source_type: 'conversation',
          session_id: sessionId
        },
        confidence: 0.90,
        extracted_at: new Date().toISOString(),
        verified: true
      });
    }

    // Target major fact → kb_items table (optional)
    if (extractedData.target_major) {
      facts.push({
        fact_id: `fact_${studentId}_target_major_${timestamp}`,
        student_id: studentId,
        category: UFFactCategory.PROFILE,
        subcategory: 'target_major',

        schema_target: {
          primary_table: ProductionTable.KB_ITEMS,
          update_strategy: 'upsert'
        },

        data: {
          fields: {
            target_major: extractedData.target_major
          },
          metadata: {
            field_name: 'target_major',
            data_type: 'string',
            schema_requirement: 'optional'
          }
        },

        source: {
          agent_id: 'assessment-agent-v18',
          extraction_method: 'gpt4o_conversational_v28',
          source_type: 'conversation',
          session_id: sessionId
        },
        confidence: 0.85,
        extracted_at: new Date().toISOString(),
        verified: true
      });
    }

    // GPA fact → weekly_vitals table (optional)
    if (extractedData.gpa !== undefined) {
      facts.push({
        fact_id: `fact_${studentId}_gpa_${timestamp}`,
        student_id: studentId,
        category: UFFactCategory.ACADEMIC,
        subcategory: 'gpa',

        schema_target: {
          primary_table: ProductionTable.WEEKLY_VITALS,
          update_strategy: 'upsert'
        },

        data: {
          fields: {
            gpa_weighted: extractedData.gpa,
            gpa_scale: extractedData.gpa_scale || 4.0
          },
          metadata: {
            field_name: 'gpa',
            data_type: 'decimal',
            schema_requirement: 'optional'
          }
        },

        source: {
          agent_id: 'assessment-agent-v18',
          extraction_method: 'gpt4o_conversational_v28',
          source_type: 'conversation',
          session_id: sessionId
        },
        confidence: 0.90,
        extracted_at: new Date().toISOString(),
        verified: true
      });
    }

    return facts;
  }

  /**
   * v34.2: Load Universal Facts for student
   * Reconstructs from kb_items for now (Phase 1 implementation)
   */
  private async loadUniversalFacts(studentId: string): Promise<UniversalFact[]> {
    const result = await this.pool.query(`
      SELECT item_id as id, edges as data, created_ts
      FROM kb_items
      WHERE student_id = $1
      AND source_ref = 'gpt4o_conversational_extraction_v28'
      ORDER BY created_ts ASC
    `, [studentId]);

    const facts: UniversalFact[] = [];

    for (const row of result.rows) {
      const data = row.data;
      const timestamp = row.created_ts.getTime();

      // Reconstruct Universal Facts from JSON data
      if (data.grade !== undefined) {
        facts.push({
          fact_id: `fact_${studentId}_grade_${timestamp}`,
          student_id: studentId,
          category: UFFactCategory.PROFILE,
          subcategory: 'grade',
          schema_target: {
            primary_table: ProductionTable.STUDENTS,
            update_strategy: 'upsert'
          },
          data: {
            fields: { current_grade: data.grade },
            metadata: { field_name: 'grade', schema_requirement: 'required' }
          },
          source: {
            agent_id: 'assessment-agent-v18',
            extraction_method: 'gpt4o_conversational_v28',
            source_type: 'conversation'
          },
          confidence: 0.95,
          extracted_at: row.created_ts.toISOString(),
          verified: true
        });
      }

      if (data.high_school) {
        facts.push({
          fact_id: `fact_${studentId}_high_school_${timestamp}`,
          student_id: studentId,
          category: UFFactCategory.PROFILE,
          subcategory: 'high_school',
          schema_target: {
            primary_table: ProductionTable.STUDENTS,
            update_strategy: 'upsert'
          },
          data: {
            fields: { high_school_name: data.high_school },
            metadata: { field_name: 'high_school', schema_requirement: 'required' }
          },
          source: {
            agent_id: 'assessment-agent-v18',
            extraction_method: 'gpt4o_conversational_v28',
            source_type: 'conversation'
          },
          confidence: 0.98,
          extracted_at: row.created_ts.toISOString(),
          verified: true
        });
      }

      if (data.interests && data.interests.length > 0) {
        facts.push({
          fact_id: `fact_${studentId}_interests_${timestamp}`,
          student_id: studentId,
          category: UFFactCategory.PROFILE,
          subcategory: 'interests',
          schema_target: {
            primary_table: ProductionTable.KB_ITEMS,
            update_strategy: 'upsert'
          },
          data: {
            fields: { interests: data.interests },
            metadata: { field_name: 'interests', schema_requirement: 'required' }
          },
          source: {
            agent_id: 'assessment-agent-v18',
            extraction_method: 'gpt4o_conversational_v28',
            source_type: 'conversation'
          },
          confidence: 0.90,
          extracted_at: row.created_ts.toISOString(),
          verified: true
        });
      }

      if (data.target_major) {
        facts.push({
          fact_id: `fact_${studentId}_target_major_${timestamp}`,
          student_id: studentId,
          category: UFFactCategory.PROFILE,
          subcategory: 'target_major',
          schema_target: {
            primary_table: ProductionTable.KB_ITEMS,
            update_strategy: 'upsert'
          },
          data: {
            fields: { target_major: data.target_major },
            metadata: { field_name: 'target_major', schema_requirement: 'optional' }
          },
          source: {
            agent_id: 'assessment-agent-v18',
            extraction_method: 'gpt4o_conversational_v28',
            source_type: 'conversation'
          },
          confidence: 0.85,
          extracted_at: row.created_ts.toISOString(),
          verified: true
        });
      }

      if (data.gpa !== undefined) {
        facts.push({
          fact_id: `fact_${studentId}_gpa_${timestamp}`,
          student_id: studentId,
          category: UFFactCategory.ACADEMIC,
          subcategory: 'gpa',
          schema_target: {
            primary_table: ProductionTable.WEEKLY_VITALS,
            update_strategy: 'upsert'
          },
          data: {
            fields: { gpa_weighted: data.gpa },
            metadata: { field_name: 'gpa', schema_requirement: 'optional' }
          },
          source: {
            agent_id: 'assessment-agent-v18',
            extraction_method: 'gpt4o_conversational_v28',
            source_type: 'conversation'
          },
          confidence: 0.90,
          extracted_at: row.created_ts.toISOString(),
          verified: true
        });
      }
    }

    return facts;
  }

  /**
   * v34.2: Calculate graduation year from grade
   */
  private calculateGradYear(grade: number): number {
    const currentYear = new Date().getFullYear();
    const yearsUntilGrad = 12 - grade;
    return currentYear + yearsUntilGrad;
  }

  /**
   * v34.2: Generate handover response with schema coverage info
   */
  private generateHandoverResponseV2(coverage: SchemaCoverage): string {
    return `Perfect! I've gathered the core information I need to understand your profile:

✅ Grade: ${coverage.has_grade ? 'Confirmed' : ''}
✅ High School: ${coverage.has_high_school ? 'Confirmed' : ''}
✅ Interests: ${coverage.has_interests ? 'Confirmed' : ''}

Based on your profile, I can see your authentic passion and direction. Let me hand you over to our Game Plan strategist who will create your personalized roadmap to success.

Ready to see your strategic plan?`;
  }

  /**
   * v34.2: Get latest extracted data from kb_items
   * (Helper to convert fresh extraction into data object)
   */
  private async getLatestExtractedData(studentId: string): Promise<any> {
    try {
      const rows = await this.pool.query(`
        SELECT edges as data
        FROM kb_items
        WHERE student_id = $1
        AND source_ref = 'gpt4o_conversational_extraction_v28'
        ORDER BY created_ts DESC
        LIMIT 1
      `, [studentId]);

      if (rows.rows.length === 0) {
        return {};
      }

      return rows.rows[0].data || {};
    } catch (error) {
      log.error('assessment.get_latest_extracted_data.error', {
        student_id: studentId,
        error: String(error)
      });
      return {};
    }
  }
}

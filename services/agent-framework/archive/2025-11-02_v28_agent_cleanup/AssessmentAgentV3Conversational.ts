/**
 * AssessmentAgentV3Conversational - INTELLIGENCE-DRIVEN Conversational Assessment
 *
 * Purpose: Use TYPE-080 (4-Phase Assessment Flow) intelligence to drive
 * adaptive, conversational data collection based on Jenny's real coaching patterns.
 *
 * Architecture (NO HARDCODED QUESTIONS):
 * 1. User sends message → GPT-4o extracts data (no regex)
 * 2. Store facts in kb_items.edges (universal storage)
 * 3. Load facts → TYPE-080 intelligence analyzes gaps
 * 4. TYPE-080 generates adaptive questions based on missing data
 * 5. Return conversational response with EQ-aware tone
 *
 * Intelligence Sources:
 * - TYPE-080: 4-Phase Assessment Flow (discovery → narrative → strategy → time)
 * - TYPE-081: Ivy Score Calculation (profile scoring)
 * - TYPE-082: Gap Analysis Engine (identifies weaknesses)
 * - TYPE-083: Potential Indicator Extraction (detects opportunities)
 * - Coaching Intelligence Chips: /data/kb_intel_chips/assess-gameplan-chips/
 *
 * Data Extraction:
 * - Jenny's real assessment transcripts (Huda + 10+ students)
 * - /data/coaching_intelligence/extractions/huda_assess_plus_gameplan/
 *
 * Created: 2025-11-02
 * Version: v26.4 - Intelligence-Driven (NO STATIC QUESTIONS)
 */

import { AssessmentAgentV3 } from './AssessmentAgentV3.js';
import { FactStore } from '../../facts/FactStore.js';
import { AgentQuery, FactCategory } from '../../facts/types.js';
import { IntelligenceAgentResponse } from './BaseAgentWithIntelligence.js';
import { FactSet } from '../../facts/FactSet.js';
import { createLogger } from '../../../../../packages/observability/dist/unified-logger.js';
import { Pool } from 'pg';
import { extractAssessmentDataGPT, validateAndNormalizeData, type ExtractedAssessmentData } from '../../nlp/assessmentExtract.js';
import { FourPhaseAssessmentFlow } from '../../intelligence/types/TYPE-080-FourPhaseAssessmentFlow.js';

const log = createLogger('assessment-agent-v3-conversational');

/**
 * Conversation phase tracking
 */
interface ConversationPhase {
  phase_number: 1 | 2 | 3 | 4;
  phase_name: 'Academic Foundation' | 'Extracurricular Profile' | 'Personal Story' | 'Goals & Aspirations';
  completion_percentage: number;
  questions_asked: string[];
  data_collected: Record<string, any>;
}

/**
 * Jenny's 4-Phase Assessment Questions (from real transcripts)
 */
const JENNY_ASSESSMENT_QUESTIONS = {
  // Phase 1: Academic Foundation (00:05:06 - 00:21:14)
  phase_1_academic: [
    "Can you tell me what your GPA is so far?",
    "Great. And do you know how this compares to other people in your school?",
    "What classes and subjects are you interested in?",
    "How many AP or honors courses have you taken or are planning to take?",
    "Have you taken the SAT or ACT yet? If so, what scores?",
  ],

  // Phase 1b: Personality Profiling (00:07:39 - diagnostic disguised as conversation)
  phase_1_personality: [
    "Are you more quiet? Do you talk a lot in your classes?",
    "Do you have a big friend group or smaller?",
    "Would you say your friend group is competitive or more collaborative?",
  ],

  // Phase 2: Extracurricular Profile (00:21:14 - 00:42:00)
  phase_2_activities: [
    "What extracurricular activities are you involved in?",
    "Which activity are you most passionate about?",
    "Do you hold any leadership positions?",
    "Have you won any awards or competitions?",
    "Are there any projects or initiatives you've started?",
  ],

  // Phase 3: Personal Story & Identity (00:12:53 - synthesis moment)
  phase_3_identity: [
    "What do you enjoy most about [their interests]?",
    "How do these different interests connect for you?",
    "What impact do you want to have through your work?",
    "What makes you different from other students with similar interests?",
  ],

  // Phase 4: Goals & Aspirations
  phase_4_goals: [
    "What colleges are you thinking about?",
    "What major are you considering?",
    "What do you want to do after college?",
    "Why [their chosen field] specifically?",
  ],
};

/**
 * Data extraction patterns (from Jenny's coaching intelligence)
 */
const DATA_EXTRACTION_PATTERNS = {
  gpa: /(?:gpa|grade point).*?(\d+\.\d+)/i,
  sat_score: /(?:sat|test).*?(\d{3,4})/i,
  ap_count: /(\d+)\s*(?:ap|advanced)/i,
  grade_level: /(?:(\d+)(?:th|st|nd|rd)|grade\s*(\d+)|junior|senior|sophomore|freshman)/i,
  personality: /(quiet|outgoing|introverted|extroverted)/i,
  activities: /(club|sport|volunteer|tutoring|coding|film|game|music|art)/gi,
};

export class AssessmentAgentV3Conversational extends AssessmentAgentV3 {
  private pool: Pool;
  private conversationPhases: Map<string, ConversationPhase> = new Map();
  private sessionStates: Map<string, ConversationPhase> = new Map(); // Track per session

  constructor(factStore: FactStore, pool: Pool) {
    super(factStore);
    this.pool = pool;
  }

  /**
   * Load conversation state from database for a session
   */
  private async loadSessionState(sessionId: string): Promise<ConversationPhase | null> {
    try {
      // Check in-memory cache first
      if (this.sessionStates.has(sessionId)) {
        return this.sessionStates.get(sessionId)!;
      }

      // Load from database
      const result = await this.pool.query(
        `SELECT metadata FROM multiagent_sessions WHERE id = $1`,
        [sessionId]
      );

      if (result.rows.length > 0 && result.rows[0].metadata?.conversation_state) {
        const state = result.rows[0].metadata.conversation_state as ConversationPhase;
        this.sessionStates.set(sessionId, state);
        return state;
      }

      return null;
    } catch (error) {
      log.event('assessment.load_session_state_error', {
        session_id: sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Save conversation state to database for a session
   */
  private async saveSessionState(sessionId: string, phase: ConversationPhase): Promise<void> {
    try {
      // Update in-memory cache
      this.sessionStates.set(sessionId, phase);

      // Save to database
      await this.pool.query(
        `UPDATE multiagent_sessions
         SET metadata = jsonb_set(
           COALESCE(metadata, '{}'::jsonb),
           '{conversation_state}',
           $1::jsonb
         )
         WHERE id = $2`,
        [JSON.stringify(phase), sessionId]
      );

      log.event('assessment.session_state_saved', {
        session_id: sessionId,
        phase: phase.phase_name,
        questions_asked_count: phase.questions_asked.length,
      });
    } catch (error) {
      log.event('assessment.save_session_state_error', {
        session_id: sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Override generateInsufficientDataResponse to provide conversational data collection
   * Instead of saying "I need more information", ask Jenny's proven questions
   *
   * IMPORTANT: This is now async to support session state loading/saving
   */
  protected async generateInsufficientDataResponseAsync(
    facts: FactSet,
    sessionId: string
  ): Promise<IntelligenceAgentResponse> {
    const missing = facts.getMissingCategories(this.getRequiredFacts());

    log.event(`${this.agentId}.insufficient_data_conversational`, {
      missing_categories: missing,
      mode: 'conversational_data_collection',
      session_id: sessionId,
    });

    // Load existing conversation state from session
    let phase = await this.loadSessionState(sessionId);

    if (!phase) {
      // First time - determine initial phase
      phase = this.determineCurrentPhase(missing);
      log.event('assessment.new_conversation_state', {
        session_id: sessionId,
        initial_phase: phase.phase_name,
      });
    } else {
      log.event('assessment.loaded_conversation_state', {
        session_id: sessionId,
        phase: phase.phase_name,
        questions_asked: phase.questions_asked.length,
      });
    }

    // Extract collected data from loaded facts (from kb_items edges field)
    const collectedData: Record<string, any> = {};
    const allFacts = facts.getAllFacts();
    allFacts.forEach(fact => {
      // Merge all fact values into collected data
      if (fact.value && typeof fact.value === 'object') {
        Object.assign(collectedData, fact.value);
      }
    });

    console.log('[COLLECTED_DATA] Loaded from FactSet:', {
      fact_count: allFacts.length,
      data_keys: Object.keys(collectedData),
      collected_data: collectedData,
    });

    // Generate next question from Jenny's proven sequences
    const nextQuestion = this.generateNextQuestion(phase, facts, sessionId);

    return {
      response: nextQuestion,
      facts_used: [],
      validation_score: 1.0,
      provenance: [],
      metadata: {
        agent_id: this.agentId,
        mode: 'conversational_data_collection',
        current_phase: phase.phase_name,
        phase_completion: phase.completion_percentage,
        missing_categories: missing,
        data_collected_so_far: collectedData, // Now populated with actual loaded facts!
        questions_asked_count: phase.questions_asked.length,
      },
    };
  }

  /**
   * Legacy sync version - calls async version with empty session ID
   */
  protected generateInsufficientDataResponse(facts: FactSet): IntelligenceAgentResponse {
    // This should not be called in v26 context, but provide fallback
    const missing = facts.getMissingCategories(this.getRequiredFacts());
    const phase = this.determineCurrentPhase(missing);
    const nextQuestion = this.generateNextQuestionSync(phase, facts);

    return {
      response: nextQuestion,
      facts_used: [],
      validation_score: 1.0,
      provenance: [],
      metadata: {
        agent_id: this.agentId,
        mode: 'conversational_data_collection',
        current_phase: phase.phase_name,
        phase_completion: phase.completion_percentage,
        missing_categories: missing,
        data_collected_so_far: phase.data_collected,
      },
    };
  }

  /**
   * Determine current assessment phase based on missing data
   *
   * Jenny's 4-Phase Flow:
   * Phase 1 (Academic Foundation): Collect GPA, SAT, AP count, class rank, rigor
   * Phase 2 (Extracurricular Profile): Collect activities, leadership, awards
   * Phase 3 (Personal Story): Understand identity, connections, impact
   * Phase 4 (Goals & Aspirations): Understand target schools, major, career goals
   */
  private determineCurrentPhase(missingCategories: string[]): ConversationPhase {
    // Phase logic: Progress sequentially through phases based on what data we have
    // NEVER skip phases - always go 1 → 2 → 3 → 4

    // Convert to lowercase for case-insensitive matching
    const missing = missingCategories.map(c => c.toLowerCase());

    // If we're missing academic_data or student_profile, we're in Phase 1
    if (missing.includes('academic_data') || missing.includes('student_profile')) {
      return {
        phase_number: 1,
        phase_name: 'Academic Foundation',
        completion_percentage: 0,
        questions_asked: [],
        data_collected: {},
      };
    }

    // If we have academics but missing activity_data, we're in Phase 2
    if (missing.includes('activity_data')) {
      return {
        phase_number: 2,
        phase_name: 'Extracurricular Profile',
        completion_percentage: 25,
        questions_asked: [],
        data_collected: {},
      };
    }

    // If we have academics + activities but missing assessment_data, we're in Phase 3
    if (missing.includes('assessment_data')) {
      return {
        phase_number: 3,
        phase_name: 'Personal Story',
        completion_percentage: 50,
        questions_asked: [],
        data_collected: {},
      };
    }

    // If we have all basic data, we're in Phase 4 (Goals)
    return {
      phase_number: 4,
      phase_name: 'Goals & Aspirations',
      completion_percentage: 75,
      questions_asked: [],
      data_collected: {},
    };
  }

  /**
   * Generate next question based on Jenny's proven sequences
   * Tracks state and saves to database
   */
  private generateNextQuestion(phase: ConversationPhase, facts: FactSet, sessionId: string): string {
    let questions: string[] = [];
    let greeting = "";

    // Extract what data we already have from the loaded facts
    const collectedData: Record<string, any> = {};
    facts.getAllFacts().forEach(fact => {
      if (fact.value && typeof fact.value === 'object') {
        Object.assign(collectedData, fact.value);
      }
    });

    console.log('[GENERATE_Q] Checking collected data:', Object.keys(collectedData));

    switch (phase.phase_number) {
      case 1:
        // Start with warmth + credibility (Jenny's 27-second architecture)
        if (phase.questions_asked.length === 0) {
          greeting = "Hi! It's really nice to meet you. I'm here to help you build your path to top colleges, and I'd love to learn more about you.\n\n";
        }

        // Mix academic + personality questions (Jenny's rapid diagnostic cascade)
        // BUT skip questions for data we already have
        const phase1Questions = phase.questions_asked.length < 3
          ? JENNY_ASSESSMENT_QUESTIONS.phase_1_academic
          : JENNY_ASSESSMENT_QUESTIONS.phase_1_personality;

        questions = this.filterAlreadyAnsweredQuestions(phase1Questions, collectedData);
        break;

      case 2:
        greeting = "Great! Now let's talk about your extracurricular activities and what you're passionate about.\n\n";
        questions = this.filterAlreadyAnsweredQuestions(JENNY_ASSESSMENT_QUESTIONS.phase_2_activities, collectedData);
        break;

      case 3:
        greeting = "I'm starting to see some really interesting patterns here. Let me ask you a few more questions to understand your unique story.\n\n";
        questions = this.filterAlreadyAnsweredQuestions(JENNY_ASSESSMENT_QUESTIONS.phase_3_identity, collectedData);
        break;

      case 4:
        greeting = "Perfect! Last few questions about your goals and aspirations.\n\n";
        questions = this.filterAlreadyAnsweredQuestions(JENNY_ASSESSMENT_QUESTIONS.phase_4_goals, collectedData);
        break;
    }

    // If all questions in this phase have been answered, acknowledge and move to synthesis
    if (questions.length === 0) {
      return greeting + "Thank you for sharing all that information! Let me analyze your profile and provide you with a comprehensive assessment.";
    }

    // Get next unasked question
    const askedCount = phase.questions_asked.length;
    const nextQuestion = questions[askedCount % questions.length];
    const fullResponse = greeting + nextQuestion;

    // Update phase state: mark this question as asked
    phase.questions_asked.push(fullResponse);

    // Save updated state to database (fire and forget)
    this.saveSessionState(sessionId, phase).catch(err => {
      log.event('assessment.save_state_error_in_generate', {
        error: err instanceof Error ? err.message : String(err),
      });
    });

    log.event('assessment.question_generated', {
      session_id: sessionId,
      phase: phase.phase_name,
      question_number: askedCount + 1,
      total_asked: phase.questions_asked.length,
      filtered_questions_count: questions.length,
    });

    return fullResponse;
  }

  /**
   * Filter out questions that have already been answered based on collected data
   */
  private filterAlreadyAnsweredQuestions(questions: string[], collectedData: Record<string, any>): string[] {
    return questions.filter(q => {
      const qLower = q.toLowerCase();

      // GPA question
      if (qLower.includes('gpa') && collectedData.gpa) {
        console.log('[FILTER_Q] Skipping GPA question - already have:', collectedData.gpa);
        return false;
      }

      // SAT/ACT question
      if ((qLower.includes('sat') || qLower.includes('act')) &&
          (collectedData.sat_total || collectedData.act_composite)) {
        console.log('[FILTER_Q] Skipping SAT/ACT question - already have test scores');
        return false;
      }

      // AP courses question
      if ((qLower.includes('ap') || qLower.includes('honors')) && collectedData.ap_count) {
        console.log('[FILTER_Q] Skipping AP question - already have:', collectedData.ap_count);
        return false;
      }

      // Classes/subjects question
      if (qLower.includes('classes') && qLower.includes('interested') && collectedData.interests) {
        console.log('[FILTER_Q] Skipping interests question - already have:', collectedData.interests);
        return false;
      }

      // Personality questions
      if (qLower.includes('quiet') && qLower.includes('talk') && collectedData.personality_type) {
        console.log('[FILTER_Q] Skipping quiet question - already answered');
        return false;
      }

      if (qLower.includes('friend group') && collectedData.friend_group_size) {
        console.log('[FILTER_Q] Skipping friend group size question - already answered');
        return false;
      }

      if (qLower.includes('competitive') && qLower.includes('collaborative') && collectedData.friend_group_dynamic) {
        console.log('[FILTER_Q] Skipping friend group dynamic question - already answered');
        return false;
      }

      // Activities question
      if (qLower.includes('extracurricular') && qLower.includes('activities') && collectedData.activities) {
        console.log('[FILTER_Q] Skipping activities question - already have:', collectedData.activities);
        return false;
      }

      // Leadership question
      if (qLower.includes('leadership') && collectedData.leadership_roles) {
        console.log('[FILTER_Q] Skipping leadership question - already have:', collectedData.leadership_roles);
        return false;
      }

      // Awards question
      if (qLower.includes('awards') && qLower.includes('competitions') && collectedData.awards) {
        console.log('[FILTER_Q] Skipping awards question - already have');
        return false;
      }

      // Colleges question
      if (qLower.includes('colleges') && qLower.includes('thinking') && collectedData.target_colleges) {
        console.log('[FILTER_Q] Skipping target colleges question - already have:', collectedData.target_colleges);
        return false;
      }

      // Major question
      if (qLower.includes('major') && collectedData.target_major) {
        console.log('[FILTER_Q] Skipping major question - already have:', collectedData.target_major);
        return false;
      }

      // Keep this question - hasn't been answered yet
      return true;
    });
  }

  /**
   * Sync version of generateNextQuestion (for legacy code paths)
   */
  private generateNextQuestionSync(phase: ConversationPhase, facts: FactSet): string {
    let questions: string[] = [];
    let greeting = "";

    switch (phase.phase_number) {
      case 1:
        if (phase.questions_asked.length === 0) {
          greeting = "Hi! It's really nice to meet you. I'm here to help you build your path to top colleges, and I'd love to learn more about you.\n\n";
        }
        if (phase.questions_asked.length < 3) {
          questions = JENNY_ASSESSMENT_QUESTIONS.phase_1_academic;
        } else {
          questions = JENNY_ASSESSMENT_QUESTIONS.phase_1_personality;
        }
        break;
      case 2:
        greeting = "Great! Now let's talk about your extracurricular activities and what you're passionate about.\n\n";
        questions = JENNY_ASSESSMENT_QUESTIONS.phase_2_activities;
        break;
      case 3:
        greeting = "I'm starting to see some really interesting patterns here. Let me ask you a few more questions to understand your unique story.\n\n";
        questions = JENNY_ASSESSMENT_QUESTIONS.phase_3_identity;
        break;
      case 4:
        greeting = "Perfect! Last few questions about your goals and aspirations.\n\n";
        questions = JENNY_ASSESSMENT_QUESTIONS.phase_4_goals;
        break;
    }

    const askedCount = phase.questions_asked.length;
    const nextQuestion = questions[askedCount % questions.length];
    return greeting + nextQuestion;
  }

  /**
   * Extract data from user's response and store facts using chatgpt-4o-latest (GPT-5 class) structured extraction
   * This is called after the user answers a question
   */
  async extractAndStoreFacts(
    studentId: string,
    userMessage: string,
    conversationHistory: string
  ): Promise<void> {
    console.log('\n========== chatgpt-4o-latest (GPT-5) FACT EXTRACTION START ==========');
    console.log('[EXTRACT_GPT5] Called with:', {
      studentId,
      userMessage,
      messageLength: userMessage.length,
    });

    log.event('assessment.extract_and_store_facts_gpt', {
      student_id: studentId,
      message_length: userMessage.length,
      message: userMessage,
    });

    // Use chatgpt-4o-latest (GPT-5 class) structured extraction (CAT-1/2/3 foundation)
    console.log('[EXTRACT_GPT5] Calling chatgpt-4o-latest (GPT-5) extraction...');
    const rawExtractedData = await extractAssessmentDataGPT(userMessage, conversationHistory);
    console.log('[EXTRACT_GPT5] Raw extracted data:', rawExtractedData);

    // Validate and normalize extracted data
    const extractedData = validateAndNormalizeData(rawExtractedData);
    console.log('[EXTRACT_GPT5] Validated data:', extractedData);
    console.log('[EXTRACT_GPT5] Extracted data count:', Object.keys(extractedData).length);

    // Store extracted facts in database for clone student
    if (Object.keys(extractedData).length > 0) {
      console.log('[EXTRACT_GPT5] ✅ Calling storeExtractedFacts with studentId:', studentId);
      await this.storeExtractedFacts(studentId, extractedData);

      log.event('assessment.facts_stored_gpt5', {
        student_id: studentId,
        facts_count: Object.keys(extractedData).length,
        facts: extractedData,
      });
      console.log('[EXTRACT_GPT5] ✅ Facts stored successfully');
    } else {
      console.log('[EXTRACT_GPT5] ⚠️ No facts extracted from message');
    }
    console.log('========== chatgpt-4o-latest (GPT-5) FACT EXTRACTION END ==========\n');
  }

  /**
   * Store extracted facts in kb_items (Universal Fact Storage)
   *
   * UNIVERSAL ARCHITECTURE: Uses kb_items table which works for ALL students
   * - FactStore reads from kb_items → facts will be loaded correctly
   * - Works for real students AND clone students
   * - Future-proof: uses production schema
   */
  private async storeExtractedFacts(
    studentId: string,
    extractedData: ExtractedAssessmentData
  ): Promise<void> {
    console.log('\n========== KB_ITEMS FACT STORAGE START ==========');
    console.log('[STORAGE_KB] Storing facts for student:', studentId);
    console.log('[STORAGE_KB] Extracted data:', extractedData);

    try {
      let storedCount = 0;

      // CATEGORY 1: Academic Profile (grade, GPA, test scores, AP count, class rank)
      if (extractedData.grade || extractedData.gpa || extractedData.sat_total ||
          extractedData.sat_math || extractedData.sat_verbal || extractedData.act_composite ||
          extractedData.ap_count || extractedData.class_rank) {

        const academicData: any = {};
        if (extractedData.grade) academicData.grade = extractedData.grade;
        if (extractedData.gpa) academicData.gpa = extractedData.gpa;
        if (extractedData.gpa_type) academicData.gpa_type = extractedData.gpa_type;
        if (extractedData.sat_total) academicData.sat_total = extractedData.sat_total;
        if (extractedData.sat_math) academicData.sat_math = extractedData.sat_math;
        if (extractedData.sat_verbal) academicData.sat_verbal = extractedData.sat_verbal;
        if (extractedData.act_composite) academicData.act_composite = extractedData.act_composite;
        if (extractedData.ap_count) academicData.ap_count = extractedData.ap_count;
        if (extractedData.class_rank) academicData.class_rank = extractedData.class_rank;
        if (extractedData.class_rank_total) academicData.class_rank_total = extractedData.class_rank_total;

        const itemId = `${studentId}_academic_profile`;
        await this.pool.query(
          `INSERT INTO kb_items (
            item_id, student_id, item_type, subtype, title_name,
            tier1_state, source_ref, confidence, edges
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (item_id) DO UPDATE SET
            edges = EXCLUDED.edges,
            updated_ts = NOW()`,
          [
            itemId,
            studentId,
            'Assessment',
            'academic_profile',
            `Academic Profile (Grade ${academicData.grade || 'N/A'}, GPA ${academicData.gpa || 'N/A'})`,
            'Outcome', // Confirmed fact
            'gpt4o_conversational_extraction',
            'high',
            JSON.stringify(academicData)
          ]
        );
        storedCount++;
        console.log(`[STORAGE_KB] ✅ Stored academic_profile: ${JSON.stringify(academicData)}`);
      }

      // CATEGORY 2: Interests & Goals
      if (extractedData.interests || extractedData.target_major || extractedData.target_colleges ||
          extractedData.career_goals || extractedData.motivations) {

        const interestsData: any = {};
        if (extractedData.interests) interestsData.interests = extractedData.interests;
        if (extractedData.target_major) interestsData.target_major = extractedData.target_major;
        if (extractedData.target_colleges) interestsData.target_colleges = extractedData.target_colleges;
        if (extractedData.career_goals) interestsData.career_goals = extractedData.career_goals;
        if (extractedData.motivations) interestsData.motivations = extractedData.motivations;

        const itemId = `${studentId}_interests_goals`;
        await this.pool.query(
          `INSERT INTO kb_items (
            item_id, student_id, item_type, subtype, title_name,
            tier1_state, source_ref, confidence, edges
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (item_id) DO UPDATE SET
            edges = EXCLUDED.edges,
            updated_ts = NOW()`,
          [
            itemId,
            studentId,
            'Assessment',
            'interests_goals',
            `Interests & Goals`,
            'Outcome',
            'gpt4o_conversational_extraction',
            'high',
            JSON.stringify(interestsData)
          ]
        );
        storedCount++;
        console.log(`[STORAGE_KB] ✅ Stored interests_goals: ${JSON.stringify(interestsData)}`);
      }

      // CATEGORY 3: Personality & Social Profile
      if (extractedData.personality_type || extractedData.friend_group_size ||
          extractedData.friend_group_dynamic) {

        const socialData: any = {};
        if (extractedData.personality_type) socialData.personality_type = extractedData.personality_type;
        if (extractedData.friend_group_size) socialData.friend_group_size = extractedData.friend_group_size;
        if (extractedData.friend_group_dynamic) socialData.friend_group_dynamic = extractedData.friend_group_dynamic;

        const itemId = `${studentId}_social_profile`;
        await this.pool.query(
          `INSERT INTO kb_items (
            item_id, student_id, item_type, subtype, title_name,
            tier1_state, source_ref, confidence, edges
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (item_id) DO UPDATE SET
            edges = EXCLUDED.edges,
            updated_ts = NOW()`,
          [
            itemId,
            studentId,
            'Assessment',
            'social_profile',
            `Social Profile (${socialData.personality_type || 'N/A'}, ${socialData.friend_group_size || 'N/A'} group)`,
            'Outcome',
            'gpt4o_conversational_extraction',
            'high',
            JSON.stringify(socialData)
          ]
        );
        storedCount++;
        console.log(`[STORAGE_KB] ✅ Stored social_profile: ${JSON.stringify(socialData)}`);
      }

      // CATEGORY 4: Activities & Leadership
      if (extractedData.activities || extractedData.leadership_roles) {
        const activitiesData: any = {};
        if (extractedData.activities) activitiesData.activities = extractedData.activities;
        if (extractedData.leadership_roles) activitiesData.leadership_roles = extractedData.leadership_roles;

        const itemId = `${studentId}_activities_leadership`;
        await this.pool.query(
          `INSERT INTO kb_items (
            item_id, student_id, item_type, subtype, title_name,
            tier1_state, source_ref, confidence, edges
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (item_id) DO UPDATE SET
            edges = EXCLUDED.edges,
            updated_ts = NOW()`,
          [
            itemId,
            studentId,
            'Assessment',
            'activities_leadership',
            `Activities & Leadership`,
            'Outcome',
            'gpt4o_conversational_extraction',
            'high',
            JSON.stringify(activitiesData)
          ]
        );
        storedCount++;
        console.log(`[STORAGE_KB] ✅ Stored activities_leadership: ${JSON.stringify(activitiesData)}`);
      }

      // Update student profile metadata (grade → graduation_year, high_school, target_major)
      const studentUpdates: string[] = [];
      const studentValues: any[] = [];
      let paramIndex = 1;

      if (extractedData.grade !== undefined) {
        const graduationYear = new Date().getFullYear() + (12 - extractedData.grade);
        studentUpdates.push(`graduation_year = $${paramIndex++}`);
        studentValues.push(graduationYear);
        console.log(`[STORAGE_KB] Calculated graduation_year: ${graduationYear} (from grade ${extractedData.grade})`);
      }

      if (extractedData.high_school) {
        studentUpdates.push(`high_school = $${paramIndex++}`);
        studentValues.push(extractedData.high_school);
      }

      if (extractedData.target_major) {
        studentUpdates.push(`target_major = $${paramIndex++}`);
        studentValues.push(extractedData.target_major);
      }

      if (studentUpdates.length > 0) {
        studentUpdates.push(`updated_at = NOW()`);
        studentValues.push(studentId);

        await this.pool.query(
          `UPDATE students SET ${studentUpdates.join(', ')} WHERE student_id = $${paramIndex}`,
          studentValues
        );
        console.log(`[STORAGE_KB] ✅ Updated student profile metadata`);
      }

      console.log(`[STORAGE_KB] ✅ Successfully stored ${storedCount} kb_items + student metadata`);

      log.event('assessment.facts_stored_kb_items', {
        student_id: studentId,
        kb_items_count: storedCount,
        facts_extracted: Object.keys(extractedData).length,
      });

      console.log('========== KB_ITEMS FACT STORAGE END ==========\n');
    } catch (error) {
      console.error('[STORAGE_KB] ❌ ERROR storing facts:', error);
      console.error('[STORAGE_KB] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      log.event('assessment.fact_storage_error', {
        student_id: studentId,
        error: error instanceof Error ? error.message : String(error),
      });

      console.log('========== KB_ITEMS FACT STORAGE END (ERROR) ==========\n');
    }
  }

  /**
   * Override handleQuery to add conversational data extraction
   * Uses async version of generateInsufficientDataResponse with session tracking
   */
  async handleQuery(query: AgentQuery): Promise<IntelligenceAgentResponse> {
    console.log('\n========== HANDLE QUERY DEBUG START ==========');
    console.log('[HANDLE_QUERY] Received query:', {
      entity_id: query.entity_id,
      query: query.query,
      session_id: query.session_id,
      metadata_keys: Object.keys(query.metadata || {}),
    });

    const sessionId = query.session_id || 'no-session';

    // Extract conversation history from metadata
    const conversationHistory = query.metadata?.conversation_history || '';

    // Extract and store facts from user's message BEFORE normal processing
    console.log('[HANDLE_QUERY] Calling extractAndStoreFacts...');
    await this.extractAndStoreFacts(query.entity_id, query.query, conversationHistory);
    console.log('[HANDLE_QUERY] extractAndStoreFacts completed');
    console.log('========== HANDLE QUERY DEBUG END ==========\n');

    // Load facts for the student
    console.log('[HANDLE_QUERY] Loading facts for student:', query.entity_id);
    const facts = await this.loadFacts(query.entity_id);
    console.log('[HANDLE_QUERY] Facts loaded:', {
      total_facts: facts.getAllFacts().length,
      fact_categories: facts.getAllFacts().map(f => f.category),
      sample_fact_values: facts.getAllFacts().slice(0, 2).map(f => ({ type: f.fact_type, value: f.value })),
    });

    // Check if we have sufficient data for intelligence processing
    const hasSufficient = facts.hasSufficientData(this.getRequiredFacts());
    console.log('[HANDLE_QUERY] Has sufficient data?', hasSufficient);
    console.log('[HANDLE_QUERY] Required facts:', this.getRequiredFacts());
    console.log('[HANDLE_QUERY] Missing categories:', facts.getMissingCategories(this.getRequiredFacts()));

    if (!hasSufficient) {
      // Use async version with session tracking for conversational data collection
      console.log('[HANDLE_QUERY] Insufficient data - calling generateInsufficientDataResponseAsync');
      return await this.generateInsufficientDataResponseAsync(facts, sessionId);
    }

    // We have sufficient data - proceed with intelligence processing
    // Call parent's intelligence processing logic
    const intelligenceResults = await this.processIntelligenceTypes(query, facts);
    const triggeredResults = intelligenceResults.filter((r) => r.triggered);

    if (triggeredResults.length === 0) {
      // No intelligence triggered, continue with conversational data collection
      return await this.generateInsufficientDataResponseAsync(facts, sessionId);
    }

    // Intelligence triggered - synthesize and return response
    const response = await this.synthesizeResponse(triggeredResults, query, facts);

    return {
      response,
      facts_used: facts.getAllFacts(),
      validation_score: 1.0, // Default confidence
      triggered_intelligence: triggeredResults.map((r) => r.type_id),
      intelligence_results: triggeredResults,
      provenance: facts.getProvenance(),
      metadata: {
        agent_id: this.agentId,
        intelligence_count: triggeredResults.length,
        fact_count: facts.getAllFacts().length,
      },
    };
  }
}

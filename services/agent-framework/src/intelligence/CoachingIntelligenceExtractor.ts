/**
 * CoachingIntelligenceExtractor.ts
 *
 * Extracts coaching intelligence from successful historical student (Old Huda) to use
 * for proactive coaching of new students.
 *
 * Data Sources (Old Huda):
 * - assessment_sessions: 27-layer diagnostic with EQ profile, rubric scores, time architecture
 * - agent_conversation_turns: Actual coaching conversations with Jenny
 * - kb_items: Student accomplishments (awards, ECs, programs, narratives)
 * - vital_facts: GPA progression, SAT scores, demographics
 * - eq_signals: EQ cues detected in conversations
 * - moat_tactic_chips: Coaching tactics used during sessions
 *
 * Extraction Types:
 * 1. Assessment Intelligence: 27-layer questions + follow-up patterns
 * 2. Week 1 Framework: 168-Hour planning conversation structure
 * 3. Tactic Application: When/how tactics were applied
 * 4. Rejection Handling: How Jenny handled obstacles/resistance
 *
 * Version: v10.2
 * Created: 2025-10-20
 */

import { pool } from '../db/pool';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = (process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY) ? new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY,
}) : null;

// Flag to determine if we should use mock extraction (no API key) or real extraction
const USE_MOCK_EXTRACTION = !(process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY);

/**
 * Data structure mapping for Old Huda:
 *
 * KB Items (huda-2025):
 * - Award_Competition: 6 items
 * - activity: 10 items
 * - award: 6 items
 * - ec: 20 items
 * - narrative: 10 items
 * - program: 5 items
 *
 * Assessment Sessions:
 * - 27 layers executed
 * - diagnostic_result: social_style, capacity_level, execution_style, personality_type
 * - eq_profile: parent_anxiety, confidence_level, vulnerability_level
 * - rubric_scores: total, service, academics, artifacts, leadership, recognition
 * - time_architecture: class_year, current_week, weeks_remaining, high_roi_opportunities
 * - gap_analysis: gap, target_total, recommended_tactics
 *
 * Conversation Turns:
 * - user_message, agent_response from agent_conversation_turns
 * - agent_name: "Jenny - Game Plan Advisor"
 * - response_chips: JSONB array of chips used
 * - tools_called: Array of resolvers used
 *
 * EQ Signals (huda-2025):
 * - cue types: specificity, trust_microacts, future_pacing, celebration,
 *   identity_reinforcement, escalation_deescalation, warmth, normalization, permissioning
 * - strength: numeric
 * - exemplar: text examples
 */

export interface AssessmentLayer {
  layer_number: number;
  layer_type: 'diagnostic' | 'eq_profile' | 'rubric_scoring' | 'time_architecture' | 'gap_analysis' | 'synthesis';
  question: string;
  follow_up_conditions: {
    trigger: string;
    follow_up_question: string;
  }[];
  expected_signals: string[]; // EQ cues to look for
  tactic_application?: string; // Which tactic to apply based on response
}

export interface Week1Framework {
  session_type: 'week_1_planning';
  total_hours: 168;
  conversation_flow: {
    phase: string;
    phase_goal: string;
    questions: string[];
    tactics_used: string[];
    expected_outputs: string[];
  }[];
}

export interface CoachingIntelligence {
  extraction_id: string;
  source_student_id: string;
  extraction_type: 'assessment_questions' | 'weekly_framework' | 'tactic_application' | 'rejection_handling';
  week_number?: number;
  extracted_content: any; // JSONB
  quality_score: number;
  extraction_method: string;
  created_at: Date;
}

export interface CoachingFramework {
  framework_id: string;
  framework_name: string;
  source_student_id: string;
  framework_content: any; // JSONB
  prompts: {
    prompts: string[];
    follow_ups: {
      trigger: string;
      question: string;
    }[];
  };
  tactics_referenced: string[];
  quality_score: number;
}

export class CoachingIntelligenceExtractor {
  /**
   * Extract 27-layer assessment intelligence from Old Huda's assessment sessions
   *
   * This analyzes Old Huda's completed assessment to understand:
   * - What questions Jenny asked at each layer
   * - How Jenny adapted based on responses
   * - Which EQ signals triggered which tactics
   * - Follow-up question patterns
   *
   * Layers 1-5: Diagnostic (social style, execution mode, capacity)
   * Layers 6-10: EQ Profile (parent anxiety, confidence, vulnerability)
   * Layers 11-15: Rubric Scoring (academics, ECs, leadership, service, etc.)
   * Layers 16-20: Time Architecture (weeks remaining, high-ROI opportunities)
   * Layers 21-25: Gap Analysis (target rubric vs current, priority tactics)
   * Layers 26-27: Synthesis (final assessment + gameplan trigger)
   *
   * @param oldStudentId - Student to extract from (default: huda-2025)
   * @returns Coaching intelligence extraction ID
   */
  async extractAssessmentIntelligence(oldStudentId: string = 'huda-2025'): Promise<string> {
    console.log(`[CoachingIntelligenceExtractor] Extracting assessment intelligence from ${oldStudentId}...`);

    // 1. Get Old Huda's most recent completed assessment
    const assessmentQuery = `
      SELECT
        session_id,
        student_id,
        diagnostic_result,
        eq_profile,
        rubric_scores,
        time_architecture,
        gap_analysis,
        layers_executed,
        started_at,
        completed_at
      FROM assessment_sessions
      WHERE student_id = $1
        AND assessment_complete = true
        AND layers_executed = 27
      ORDER BY completed_at DESC
      LIMIT 1
    `;

    const assessmentResult = await pool.query(assessmentQuery, [oldStudentId]);

    if (assessmentResult.rows.length === 0) {
      throw new Error(`No completed 27-layer assessment found for student: ${oldStudentId}`);
    }

    const assessment = assessmentResult.rows[0];
    console.log(`[CoachingIntelligenceExtractor] Found assessment session: ${assessment.session_id}`);

    // 2. Get conversation turns from the assessment timeframe
    // Find conversations around the same time as assessment
    // Note: Use two separate queries since we can't use SET in prepared statements
    await pool.query(`SET app.coach_id='jenny'`);

    const conversationQuery = `
      SELECT
        t.turn_number,
        t.user_message,
        t.user_intent,
        t.agent_name,
        t.agent_response,
        t.response_chips,
        t.tools_called,
        t.turn_timestamp
      FROM agent_conversation_turns t
      JOIN agent_conversation_sessions s ON t.session_id = s.session_id
      WHERE s.student_id = $1
        AND t.turn_timestamp BETWEEN $2::timestamp - INTERVAL '7 days' AND $2::timestamp + INTERVAL '7 days'
      ORDER BY t.turn_timestamp ASC
      LIMIT 100
    `;

    const conversationResult = await pool.query(conversationQuery, [oldStudentId, assessment.started_at]);
    console.log(`[CoachingIntelligenceExtractor] Found ${conversationResult.rows.length} conversation turns`);

    // 3. Get EQ signals detected
    const eqSignalsQuery = `
      SELECT
        s.cue,
        s.strength,
        s.exemplar,
        s.provenance,
        s.meta
      FROM eq_signals s
      JOIN eq_signal_sets ss ON s.set_id = ss.id
      WHERE ss.student_id = $1
      ORDER BY s.strength DESC NULLS LAST
    `;

    const eqSignalsResult = await pool.query(eqSignalsQuery, [oldStudentId]);
    console.log(`[CoachingIntelligenceExtractor] Found ${eqSignalsResult.rows.length} EQ signals`);

    // 4. Get tactics used (from gap_analysis.recommended_tactics)
    const recommendedTactics = assessment.gap_analysis?.recommended_tactics || [];
    console.log(`[CoachingIntelligenceExtractor] Found ${recommendedTactics.length} recommended tactics`);

    // 5. Extract 27-layer question structure (mock or real)
    let extractedLayers: any[];

    if (USE_MOCK_EXTRACTION) {
      console.log(`[CoachingIntelligenceExtractor] ⚠️  ANTHROPIC_API_KEY not set, using MOCK extraction`);
      extractedLayers = this.generateMock27Layers(assessment, eqSignalsResult.rows, recommendedTactics);
    } else {
      // Use GPT-4 to extract 27-layer question structure
      const extractionPrompt = `You are analyzing a successful coaching assessment to extract the 27-layer question structure.

**Context:**
- Student: ${oldStudentId}
- Assessment completed: ${assessment.completed_at}
- Layers executed: ${assessment.layers_executed}

**Assessment Results:**
\`\`\`json
${JSON.stringify({
  diagnostic_result: assessment.diagnostic_result,
  eq_profile: assessment.eq_profile,
  rubric_scores: assessment.rubric_scores,
  time_architecture: assessment.time_architecture,
  gap_analysis: assessment.gap_analysis,
}, null, 2)}
\`\`\`

**Conversation Turns (sample):**
\`\`\`json
${JSON.stringify(conversationResult.rows.slice(0, 20), null, 2)}
\`\`\`

**EQ Signals Detected:**
\`\`\`json
${JSON.stringify(eqSignalsResult.rows.slice(0, 20), null, 2)}
\`\`\`

**Task:**
Extract the 27-layer assessment question structure that Jenny likely used to arrive at these results.

For each layer, provide:
1. layer_number (1-27)
2. layer_type (diagnostic | eq_profile | rubric_scoring | time_architecture | gap_analysis | synthesis)
3. question (the actual question to ask)
4. follow_up_conditions (array of {trigger, follow_up_question})
5. expected_signals (EQ cues to detect in response)
6. tactic_application (which tactic to apply based on response, if any)

**Layer Distribution:**
- Layers 1-5: Diagnostic (social_style, execution_style, capacity_level, personality_type)
- Layers 6-10: EQ Profile (parent_anxiety, confidence_level, vulnerability_level)
- Layers 11-15: Rubric Scoring (academics, leadership, service, recognition, artifacts)
- Layers 16-20: Time Architecture (current_week, weeks_remaining, high_roi_opportunities)
- Layers 21-25: Gap Analysis (gap calculation, priority areas, tactic recommendations)
- Layers 26-27: Synthesis (final assessment summary, gameplan trigger)

Return ONLY a JSON array of 27 layer objects, no additional text.`;

      console.log(`[CoachingIntelligenceExtractor] Calling Claude to extract 27-layer structure...`);

      if (!anthropic) {
        throw new Error('Anthropic client not initialized');
      }

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16000,
        messages: [
          {
            role: 'user',
            content: extractionPrompt,
          },
        ],
      });

      const responseText = response.content[0].type === 'text' ? response.content[0].text : '[]';
      // Strip markdown code blocks if present
      const cleanedText = responseText.replace(/^```json\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
      extractedLayers = JSON.parse(cleanedText);
      console.log(`[CoachingIntelligenceExtractor] Extracted ${extractedLayers.length} layers`);
    }

    // 6. Store in coaching_intelligence_extraction table
    const extractionId = `extract_${oldStudentId}_assessment_${Date.now()}`;

    const insertQuery = `
      INSERT INTO coaching_intelligence_extraction (
        extraction_id,
        source_student_id,
        extraction_type,
        extracted_content,
        quality_score,
        extraction_method
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING extraction_id
    `;

    await pool.query(insertQuery, [
      extractionId,
      oldStudentId,
      'assessment_questions',
      JSON.stringify({ layers: extractedLayers }),
      0.95, // High quality since extracted from real successful session
      'claude-sonnet-4-20250514',
    ]);

    console.log(`[CoachingIntelligenceExtractor] ✅ Stored assessment intelligence: ${extractionId}`);

    return extractionId;
  }

  /**
   * Extract Week 1 168-Hour Framework from Old Huda's first week planning session
   *
   * This analyzes the conversation where Jenny helped Huda plan her first week
   * using the 168-hour time architecture framework.
   *
   * Extracts:
   * - Conversation phases (time audit → opportunity identification → scheduling → commitment)
   * - Questions asked at each phase
   * - Tactics used (168-hour-framework, delegation, batching, feedback loops)
   * - Expected outputs (time allocation, high-ROI activities, execution plan)
   *
   * @param oldStudentId - Student to extract from (default: huda-2025)
   * @returns Coaching intelligence extraction ID
   */
  async extractWeek1Framework(oldStudentId: string = 'huda-2025'): Promise<string> {
    console.log(`[CoachingIntelligenceExtractor] Extracting Week 1 framework from ${oldStudentId}...`);

    // 1. Get Old Huda's assessment to find week 1 timeframe
    const assessmentQuery = `
      SELECT
        time_architecture,
        started_at,
        completed_at
      FROM assessment_sessions
      WHERE student_id = $1
        AND assessment_complete = true
      ORDER BY completed_at DESC
      LIMIT 1
    `;

    const assessmentResult = await pool.query(assessmentQuery, [oldStudentId]);

    if (assessmentResult.rows.length === 0) {
      throw new Error(`No assessment found for ${oldStudentId}`);
    }

    const assessment = assessmentResult.rows[0];
    const week1Start = new Date(assessment.completed_at);
    const week1End = new Date(week1Start.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days

    console.log(`[CoachingIntelligenceExtractor] Week 1 timeframe: ${week1Start.toISOString()} to ${week1End.toISOString()}`);

    // 2. Get conversation turns from Week 1
    await pool.query(`SET app.coach_id='jenny'`);

    const conversationQuery = `
      SELECT
        t.turn_number,
        t.user_message,
        t.agent_response,
        t.response_chips,
        t.tools_called,
        t.turn_timestamp
      FROM agent_conversation_turns t
      JOIN agent_conversation_sessions s ON t.session_id = s.session_id
      WHERE s.student_id = $1
        AND t.turn_timestamp BETWEEN $2 AND $3
      ORDER BY t.turn_timestamp ASC
    `;

    const conversationResult = await pool.query(conversationQuery, [oldStudentId, week1Start, week1End]);
    console.log(`[CoachingIntelligenceExtractor] Found ${conversationResult.rows.length} Week 1 conversation turns`);

    // 3. Get tactics referenced in gap_analysis
    const tacticsUsed = assessment.time_architecture?.high_roi_opportunities || [];

    // 4. Use GPT-4 to extract Week 1 framework structure
    const extractionPrompt = `You are analyzing a successful Week 1 coaching session to extract the 168-Hour Framework structure.

**Context:**
- Student: ${oldStudentId}
- Week 1 timeframe: ${week1Start.toISOString()} to ${week1End.toISOString()}
- High-ROI opportunities identified: ${JSON.stringify(tacticsUsed)}

**Week 1 Conversation Turns:**
\`\`\`json
${JSON.stringify(conversationResult.rows, null, 2)}
\`\`\`

**Task:**
Extract the Week 1 planning framework that Jenny used to help the student plan their first 168 hours.

Return a JSON object with the following structure:
\`\`\`json
{
  "session_type": "week_1_planning",
  "total_hours": 168,
  "conversation_flow": [
    {
      "phase": "Phase name (e.g., 'Time Audit', 'Opportunity Identification')",
      "phase_goal": "What this phase aims to achieve",
      "questions": ["Question 1", "Question 2", ...],
      "tactics_used": ["tactic-slug-1", "tactic-slug-2"],
      "expected_outputs": ["Output 1", "Output 2"]
    },
    ...
  ]
}
\`\`\`

Phases should include:
1. Time Audit (understand current time allocation)
2. Opportunity Identification (find high-ROI activities)
3. Scheduling & Optimization (plan the 168 hours)
4. Commitment & Accountability (set expectations for execution)

Return ONLY the JSON object, no additional text.`;

    console.log(`[CoachingIntelligenceExtractor] Calling Claude to extract Week 1 framework...`);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [
        {
          role: 'user',
          content: extractionPrompt,
        },
      ],
    });

    const responseText2 = response.content[0].type === 'text' ? response.content[0].text : '{}';
    const cleanedText2 = responseText2.replace(/^```json\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    const extractedFramework = JSON.parse(cleanedText2);
    console.log(`[CoachingIntelligenceExtractor] Extracted Week 1 framework with ${extractedFramework.conversation_flow?.length || 0} phases`);

    // 5. Store in coaching_intelligence_extraction table
    const extractionId = `extract_${oldStudentId}_week1_${Date.now()}`;

    const insertQuery = `
      INSERT INTO coaching_intelligence_extraction (
        extraction_id,
        source_student_id,
        extraction_type,
        week_number,
        extracted_content,
        quality_score,
        extraction_method
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING extraction_id
    `;

    await pool.query(insertQuery, [
      extractionId,
      oldStudentId,
      'weekly_framework',
      1,
      JSON.stringify(extractedFramework),
      0.95,
      'claude-sonnet-4-20250514',
    ]);

    console.log(`[CoachingIntelligenceExtractor] ✅ Stored Week 1 framework: ${extractionId}`);

    return extractionId;
  }

  /**
   * Generate interactive prompts from extracted intelligence
   *
   * Takes raw extracted intelligence and converts it into conversational prompts
   * suitable for both interactive and simulated modes.
   *
   * For assessment: Converts 27 layers into natural conversational prompts
   * For week 1: Converts framework phases into coaching dialogue
   *
   * @param extractionType - Type of extraction to generate prompts for
   * @returns Framework ID
   */
  async generateInteractivePrompts(
    extractionType: 'assessment' | 'week_1_planning',
  ): Promise<string> {
    console.log(`[CoachingIntelligenceExtractor] Generating interactive prompts for ${extractionType}...`);

    // 1. Get the most recent extraction of this type
    const extractionQuery = `
      SELECT
        extraction_id,
        source_student_id,
        extracted_content,
        quality_score
      FROM coaching_intelligence_extraction
      WHERE extraction_type = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const extractionTypeMap = {
      'assessment': 'assessment_questions',
      'week_1_planning': 'weekly_framework',
    };

    const extractionResult = await pool.query(extractionQuery, [extractionTypeMap[extractionType]]);

    if (extractionResult.rows.length === 0) {
      throw new Error(`No extraction found for type: ${extractionType}`);
    }

    const extraction = extractionResult.rows[0];
    console.log(`[CoachingIntelligenceExtractor] Found extraction: ${extraction.extraction_id}`);

    // 2. Use GPT-4 to convert extraction into conversational prompts
    const promptGenerationPrompt = extractionType === 'assessment'
      ? this.generateAssessmentPromptsPrompt(extraction.extracted_content)
      : this.generateWeek1PromptsPrompt(extraction.extracted_content);

    let generatedPrompts: any;

    if (anthropic) {
      console.log(`[CoachingIntelligenceExtractor] Calling Claude to generate conversational prompts...`);

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 12000,
        messages: [
          {
            role: 'user',
            content: promptGenerationPrompt,
          },
        ],
      });

      const responseText3 = response.content[0].type === 'text' ? response.content[0].text : '{}';
      const cleanedText3 = responseText3.replace(/^```json\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
      generatedPrompts = JSON.parse(cleanedText3);
      console.log(`[CoachingIntelligenceExtractor] Generated ${generatedPrompts.prompts?.length || 0} prompts`);
    } else {
      console.log(`[CoachingIntelligenceExtractor] ⚠️  ANTHROPIC_API_KEY not set, using extracted content as prompts...`);
      // In mock mode, the extracted layers already have questions, so we can use them directly
      generatedPrompts = { prompts: extraction.extracted_content.layers };
    }

    // 3. Store in coaching_frameworks table
    const frameworkId = `framework_${extractionType}_${Date.now()}`;

    const insertQuery = `
      INSERT INTO coaching_frameworks (
        framework_id,
        framework_name,
        source_student_id,
        framework_content,
        prompts,
        tactics_referenced,
        quality_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING framework_id
    `;

    const tacticsReferenced = this.extractTacticsFromContent(extraction.extracted_content);

    await pool.query(insertQuery, [
      frameworkId,
      extractionType === 'assessment' ? '27-Layer Assessment Framework' : '168-Hour Week 1 Planning Framework',
      extraction.source_student_id,
      extraction.extracted_content,
      JSON.stringify(generatedPrompts),
      tacticsReferenced,
      extraction.quality_score,
    ]);

    console.log(`[CoachingIntelligenceExtractor] ✅ Stored framework: ${frameworkId}`);

    return frameworkId;
  }

  /**
   * Generate GPT-4 prompt for converting assessment layers to conversational prompts
   */
  private generateAssessmentPromptsPrompt(extractedContent: any): string {
    return `You are converting assessment layer questions into natural conversational prompts for Jenny, an AI college counselor.

**Extracted 27-Layer Structure:**
\`\`\`json
${JSON.stringify(extractedContent, null, 2)}
\`\`\`

**Task:**
Convert each layer's question into a natural, warm, conversational prompt that Jenny would say.

Requirements:
1. Use Jenny's voice: warm, specific, direct, non-patronizing
2. Each prompt should feel like a real coach asking a question
3. Include context for why the question matters
4. Make follow-up conditions feel natural (not robotic)

Return a JSON object with this structure:
\`\`\`json
{
  "prompts": [
    "Conversational prompt for layer 1",
    "Conversational prompt for layer 2",
    ...
  ],
  "follow_ups": [
    {
      "trigger": "When to ask follow-up (natural language)",
      "question": "Follow-up question (conversational)"
    }
  ]
}
\`\`\`

Return ONLY the JSON object, no additional text.`;
  }

  /**
   * Generate GPT-4 prompt for converting Week 1 framework to conversational prompts
   */
  private generateWeek1PromptsPrompt(extractedContent: any): string {
    return `You are converting a Week 1 planning framework into natural conversational prompts for Jenny, an AI college counselor.

**Extracted Week 1 Framework:**
\`\`\`json
${JSON.stringify(extractedContent, null, 2)}
\`\`\`

**Task:**
Convert each phase's questions into natural, warm, conversational prompts that Jenny would say.

Requirements:
1. Use Jenny's voice: warm, specific, direct, non-patronizing
2. Each prompt should guide the student through the 168-hour planning process
3. Include transitions between phases
4. Make the framework feel like a natural coaching conversation, not a checklist

Return a JSON object with this structure:
\`\`\`json
{
  "prompts": [
    "Conversational prompt for phase 1",
    "Conversational prompt for phase 2",
    ...
  ],
  "follow_ups": [
    {
      "trigger": "When to ask follow-up (natural language)",
      "question": "Follow-up question (conversational)"
    }
  ]
}
\`\`\`

Return ONLY the JSON object, no additional text.`;
  }

  /**
   * Extract tactic slugs from extracted content
   */
  private extractTacticsFromContent(content: any): string[] {
    const tactics: Set<string> = new Set();

    if (content.layers) {
      content.layers.forEach((layer: any) => {
        if (layer.tactic_application) {
          tactics.add(layer.tactic_application);
        }
      });
    }

    if (content.conversation_flow) {
      content.conversation_flow.forEach((phase: any) => {
        if (phase.tactics_used) {
          phase.tactics_used.forEach((tactic: string) => tactics.add(tactic));
        }
      });
    }

    return Array.from(tactics);
  }

  /**
   * Get a coaching framework by type
   *
   * @param frameworkType - assessment or week_1_planning
   * @returns Framework with prompts
   */
  async getFramework(frameworkType: 'assessment' | 'week_1_planning'): Promise<CoachingFramework | null> {
    const frameworkName = frameworkType === 'assessment'
      ? '27-Layer Assessment Framework'
      : '168-Hour Week 1 Planning Framework';

    const query = `
      SELECT
        framework_id,
        framework_name,
        source_student_id,
        framework_content,
        prompts,
        tactics_referenced,
        quality_score
      FROM coaching_frameworks
      WHERE framework_name = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [frameworkName]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  /**
   * Generate mock 27-layer assessment structure based on actual assessment data
   * Used when ANTHROPIC_API_KEY is not available
   *
   * @private
   */
  private generateMock27Layers(assessment: any, eqSignals: any[], recommendedTactics: any[]): any[] {
    const layers: any[] = [];

    // Layers 1-5: Diagnostic
    layers.push(
      {
        layer_number: 1,
        layer_type: 'diagnostic',
        question: 'Tell me about your day-to-day. Are you more of a "head down, grind it out" person, or do you thrive when collaborating with others?',
        follow_up_conditions: [
          { trigger: 'mentions working alone', follow_up_question: 'Got it. So when you\'re in group settings - class projects, club meetings - how do you typically show up?' },
          { trigger: 'mentions collaboration', follow_up_question: 'Nice! Do you usually take the lead in those group settings, or do you prefer contributing in other ways?' },
        ],
        expected_signals: ['specificity', 'warmth', 'future_pacing'],
        tactic_application: null,
      },
      {
        layer_number: 2,
        layer_type: 'diagnostic',
        question: 'When you have a big project or deadline coming up, how do you usually tackle it? Do you block out time weeks in advance, or are you more of a "figure it out as I go" type?',
        follow_up_conditions: [
          { trigger: 'very structured', follow_up_question: 'Interesting. Has that always worked well for you, or have there been times when rigid planning backfired?' },
          { trigger: 'flexible/improvising', follow_up_question: 'Makes sense. Have you ever missed a deadline or felt overwhelmed because you waited too long to start?' },
        ],
        expected_signals: ['trust_microacts', 'normalization'],
        tactic_application: '168-hour-framework',
      },
      {
        layer_number: 3,
        layer_type: 'diagnostic',
        question: 'How many hours a week do you realistically have for college prep stuff - essays, extracurriculars, applications - on top of school and life?',
        follow_up_conditions: [
          { trigger: 'low capacity (< 10 hrs)', follow_up_question: 'That\'s tight. What\'s eating up most of your time right now - school, family obligations, work?' },
          { trigger: 'medium capacity (10-20 hrs)', follow_up_question: 'That\'s workable. Are those hours concentrated on weekends, or spread throughout the week?' },
          { trigger: 'high capacity (> 20 hrs)', follow_up_question: 'Wow, that\'s a lot of available time. Are you currently using all of it productively, or is some of it just... open?' },
        ],
        expected_signals: ['trust_microacts', 'permissioning'],
        tactic_application: null,
      },
      {
        layer_number: 4,
        layer_type: 'diagnostic',
        question: 'Quick gut check: When you think about college admissions, do you feel excited, stressed, or somewhere in between?',
        follow_up_conditions: [
          { trigger: 'stressed/anxious', follow_up_question: 'What specifically is stressing you out the most right now?' },
          { trigger: 'excited/confident', follow_up_question: 'Love that energy. What are you most excited about?' },
        ],
        expected_signals: ['celebration', 'escalation_deescalation'],
        tactic_application: null,
      },
      {
        layer_number: 5,
        layer_type: 'diagnostic',
        question: 'Are you more of a "Type A perfectionist" or a "go with the flow collaborator"? Or maybe something entirely different?',
        follow_up_conditions: [
          { trigger: 'perfectionist', follow_up_question: 'How does that perfectionism show up for you - does it help you excel, or does it sometimes hold you back?' },
          { trigger: 'collaborative', follow_up_question: 'Do you find yourself stepping up to lead, or are you more comfortable supporting others?' },
        ],
        expected_signals: ['identity_reinforcement', 'normalization'],
        tactic_application: null,
      },
    );

    // Layers 6-10: EQ Profile
    layers.push(
      {
        layer_number: 6,
        layer_type: 'eq_profile',
        question: 'How involved are your parents in your college process? Are they hands-on, hands-off, or somewhere in the middle?',
        follow_up_conditions: [
          { trigger: 'very involved', follow_up_question: 'On a scale of 1-10, how anxious would you say they are about your college outcomes?' },
          { trigger: 'not involved', follow_up_question: 'Got it. Is that because they trust you to handle it, or because they\'re not familiar with the process?' },
        ],
        expected_signals: ['trust_microacts', 'warmth', 'permissioning'],
        tactic_application: 'parent-story-reframe',
      },
      {
        layer_number: 7,
        layer_type: 'eq_profile',
        question: 'On a scale of 1-10, how confident do you feel about getting into your dream schools?',
        follow_up_conditions: [
          { trigger: 'low confidence (< 5)', follow_up_question: 'What would need to happen for that number to go up?' },
          { trigger: 'high confidence (> 7)', follow_up_question: 'That\'s awesome. What makes you feel so confident?' },
        ],
        expected_signals: ['trust_microacts', 'celebration'],
        tactic_application: 'early-work-showcase',
      },
      {
        layer_number: 8,
        layer_type: 'eq_profile',
        question: 'Have you ever opened up to a coach or mentor about something that felt vulnerable - like a fear, a failure, or a family challenge?',
        follow_up_conditions: [
          { trigger: 'yes, comfortable', follow_up_question: 'That\'s great. What made you feel safe enough to share that?' },
          { trigger: 'no, uncomfortable', follow_up_question: 'Totally fair. What would make it easier for you to open up in this process?' },
        ],
        expected_signals: ['trust_microacts', 'permissioning', 'warmth'],
        tactic_application: null,
      },
      {
        layer_number: 9,
        layer_type: 'eq_profile',
        question: 'When you hit a setback - like a bad grade or a rejection - how do you typically respond? Do you bounce back quickly, or does it stick with you?',
        follow_up_conditions: [
          { trigger: 'bounces back', follow_up_question: 'That resilience is huge. Where does that come from for you?' },
          { trigger: 'dwells on it', follow_up_question: 'That\'s really common. What helps you eventually move past it?' },
        ],
        expected_signals: ['normalization', 'escalation_deescalation'],
        tactic_application: null,
      },
      {
        layer_number: 10,
        layer_type: 'eq_profile',
        question: 'Is there anything about your background or identity - cultural, religious, family situation - that you think colleges should know about?',
        follow_up_conditions: [
          { trigger: 'mentions identity', follow_up_question: 'How does that identity show up in your daily life and your activities?' },
          { trigger: 'unsure', follow_up_question: 'No pressure to have an answer now. We\'ll explore this as we go.' },
        ],
        expected_signals: ['identity_reinforcement', 'permissioning'],
        tactic_application: 'identity-as-differentiator',
      },
    );

    // Layers 11-15: Rubric Scoring
    const rubric = assessment.rubric_scores || {};
    layers.push(
      {
        layer_number: 11,
        layer_type: 'rubric_scoring',
        question: `Tell me about your academics. What's your current GPA (weighted and unweighted), and how has it trended over the years?`,
        follow_up_conditions: [
          { trigger: 'upward trend', follow_up_question: 'That upward trend is impressive! What changed for you?' },
          { trigger: 'downward trend', follow_up_question: 'What do you think caused the dip, and have you course-corrected since?' },
        ],
        expected_signals: ['specificity', 'celebration'],
        tactic_application: null,
      },
      {
        layer_number: 12,
        layer_type: 'rubric_scoring',
        question: 'What leadership roles do you currently hold - in school, clubs, community organizations, anywhere?',
        follow_up_conditions: [
          { trigger: 'multiple leadership roles', follow_up_question: 'That\'s a lot! Which one has been the most meaningful to you?' },
          { trigger: 'no leadership', follow_up_question: 'No worries - leadership can show up in many forms. Have you ever led a project or initiative, even informally?' },
        ],
        expected_signals: ['celebration', 'normalization'],
        tactic_application: null,
      },
      {
        layer_number: 13,
        layer_type: 'rubric_scoring',
        question: 'What are your most significant service or community impact activities? How many hours have you logged?',
        follow_up_conditions: [
          { trigger: 'significant hours', follow_up_question: 'That\'s amazing. What impact have you seen from that work?' },
          { trigger: 'low hours', follow_up_question: 'Quality matters more than quantity. What\'s the most meaningful service experience you\'ve had?' },
        ],
        expected_signals: ['celebration', 'specificity'],
        tactic_application: null,
      },
      {
        layer_number: 14,
        layer_type: 'rubric_scoring',
        question: 'Have you won any awards or recognition - academic, extracurricular, community, anything?',
        follow_up_conditions: [
          { trigger: 'major awards', follow_up_question: 'Those are incredible! How did you feel when you found out?' },
          { trigger: 'no awards', follow_up_question: 'That\'s okay - we can work on finding award opportunities that align with your work.' },
        ],
        expected_signals: ['celebration'],
        tactic_application: null,
      },
      {
        layer_number: 15,
        layer_type: 'rubric_scoring',
        question: 'What tangible artifacts or outputs have you created - apps, websites, research papers, art portfolios, anything you can show?',
        follow_up_conditions: [
          { trigger: 'has artifacts', follow_up_question: 'Can you send me links or files? I\'d love to see your work!' },
          { trigger: 'no artifacts', follow_up_question: 'No worries - let\'s talk about how we can create something portfolio-worthy from your existing activities.' },
        ],
        expected_signals: ['early-work-showcase', 'celebration'],
        tactic_application: 'early-work-showcase',
      },
    );

    // Layers 16-20: Time Architecture
    const timeArch = assessment.time_architecture || {};
    layers.push(
      {
        layer_number: 16,
        layer_type: 'time_architecture',
        question: `You mentioned you're currently in ${timeArch.class_year || 'junior'} year. How many weeks do you have until college apps are due?`,
        follow_up_conditions: [
          { trigger: 'mentions exact number', follow_up_question: 'Got it. Does that timeline feel tight, comfortable, or somewhere in between?' },
        ],
        expected_signals: ['specificity', 'future_pacing'],
        tactic_application: '168-hour-framework',
      },
      {
        layer_number: 17,
        layer_type: 'time_architecture',
        question: 'If you could only focus on 2-3 high-impact activities this year, what would give you the biggest ROI for college apps?',
        follow_up_conditions: [],
        expected_signals: ['future_pacing', 'specificity'],
        tactic_application: null,
      },
      {
        layer_number: 18,
        layer_type: 'time_architecture',
        question: 'Are there any opportunities coming up soon - competitions, programs, deadlines - that you\'re considering?',
        follow_up_conditions: [
          { trigger: 'mentions specific opportunities', follow_up_question: 'Which ones align most with your strengths and narrative?' },
        ],
        expected_signals: ['future_pacing'],
        tactic_application: null,
      },
      {
        layer_number: 19,
        layer_type: 'time_architecture',
        question: 'What\'s one thing you\'re currently spending time on that you could delegate, automate, or eliminate?',
        follow_up_conditions: [],
        expected_signals: ['specificity'],
        tactic_application: '168-hour-framework',
      },
      {
        layer_number: 20,
        layer_type: 'time_architecture',
        question: 'If we could map out your next 168 hours (one week) to maximize impact, would you be open to that?',
        follow_up_conditions: [
          { trigger: 'yes', follow_up_question: 'Perfect! We\'ll do that in our next session.' },
          { trigger: 'hesitant', follow_up_question: 'Totally fair - we can start smaller. What about mapping out just the weekend?' },
        ],
        expected_signals: ['future_pacing', 'permissioning'],
        tactic_application: '168-hour-framework',
      },
    );

    // Layers 21-25: Gap Analysis
    const gap = assessment.gap_analysis || {};
    layers.push(
      {
        layer_number: 21,
        layer_type: 'gap_analysis',
        question: `Based on what you've shared, I'd estimate your current IvyReady rubric score at ${gap.current_total || 13} out of 25. Does that sound about right to you?`,
        follow_up_conditions: [
          { trigger: 'agrees', follow_up_question: 'Great. Let\'s talk about how to close that gap.' },
          { trigger: 'disagrees', follow_up_question: 'Fair! What do you think it should be, and why?' },
        ],
        expected_signals: ['specificity', 'trust_microacts'],
        tactic_application: null,
      },
      {
        layer_number: 22,
        layer_type: 'gap_analysis',
        question: `To hit a competitive score (22-25), you'd need to strengthen: ${(gap.priority_areas || []).join(', ')}. Which of those resonates most with you?`,
        follow_up_conditions: [],
        expected_signals: ['specificity', 'future_pacing'],
        tactic_application: null,
      },
      {
        layer_number: 23,
        layer_type: 'gap_analysis',
        question: 'If you could pick one area to level up in the next 4 weeks, what would have the biggest impact on your profile?',
        follow_up_conditions: [],
        expected_signals: ['future_pacing'],
        tactic_application: null,
      },
      {
        layer_number: 24,
        layer_type: 'gap_analysis',
        question: 'Are you open to trying some unconventional tactics - like leveraging your parent\'s story, or reframing your identity as a strategic asset?',
        follow_up_conditions: [
          { trigger: 'yes', follow_up_question: 'Awesome. Let me walk you through a few specific tactics I think could work for you.' },
          { trigger: 'hesitant', follow_up_question: 'No pressure. We can stick to more traditional approaches if that feels better.' },
        ],
        expected_signals: ['permissioning', 'trust_microacts'],
        tactic_application: 'parent-story-reframe',
      },
      {
        layer_number: 25,
        layer_type: 'gap_analysis',
        question: 'Last check-in: On a scale of 1-10, how confident are you feeling about this process after our conversation?',
        follow_up_conditions: [
          { trigger: 'low confidence', follow_up_question: 'What would help you feel more confident?' },
          { trigger: 'high confidence', follow_up_question: 'That\'s what I like to hear! Let\'s keep that momentum going.' },
        ],
        expected_signals: ['celebration', 'warmth'],
        tactic_application: null,
      },
    );

    // Layers 26-27: Synthesis
    layers.push(
      {
        layer_number: 26,
        layer_type: 'synthesis',
        question: 'Based on everything you\'ve shared, here\'s what I\'m seeing: [SYNTHESIS SUMMARY]. Does this capture where you\'re at?',
        follow_up_conditions: [],
        expected_signals: ['specificity', 'warmth'],
        tactic_application: null,
      },
      {
        layer_number: 27,
        layer_type: 'synthesis',
        question: 'Ready to build your personalized game plan? I\'ll create a roadmap based on our conversation. Should take about 24 hours.',
        follow_up_conditions: [],
        expected_signals: ['future_pacing', 'celebration'],
        tactic_application: null,
      },
    );

    return layers;
  }

  /**
   * Run full extraction pipeline for a student
   *
   * 1. Extract assessment intelligence
   * 2. Extract Week 1 framework
   * 3. Generate interactive prompts for both
   *
   * @param oldStudentId - Student to extract from (default: huda-2025)
   * @returns Object with all extraction and framework IDs
   */
  async runFullExtraction(oldStudentId: string = 'huda-2025'): Promise<{
    assessmentExtractionId: string;
    week1ExtractionId: string;
    assessmentFrameworkId: string;
    week1FrameworkId: string;
  }> {
    console.log(`[CoachingIntelligenceExtractor] Running full extraction pipeline for ${oldStudentId}...`);

    const assessmentExtractionId = await this.extractAssessmentIntelligence(oldStudentId);
    const week1ExtractionId = await this.extractWeek1Framework(oldStudentId);

    console.log(`[CoachingIntelligenceExtractor] Generating interactive prompts...`);

    const assessmentFrameworkId = await this.generateInteractivePrompts('assessment');
    const week1FrameworkId = await this.generateInteractivePrompts('week_1_planning');

    console.log(`[CoachingIntelligenceExtractor] ✅ Full extraction pipeline complete!`);

    return {
      assessmentExtractionId,
      week1ExtractionId,
      assessmentFrameworkId,
      week1FrameworkId,
    };
  }
}

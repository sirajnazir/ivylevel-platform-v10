/**
 * v15.2 Framework Integration - Intent Routing Service
 * Purpose: LLM-based intent classification using LangChain + GPT-3.5-turbo (cost-optimized)
 * Author: v15.2 Implementation
 * Date: 2025-10-28
 */

import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { z } from 'zod';
import { pool } from '../../db/pool.js';
import type {
  IntentType,
  IntentClassification,
  StudentContext,
  IntentClassificationRecord,
} from '../types/index.js';

// ============================================================================
// INTENT SCHEMA (Zod validation for structured output)
// ============================================================================

const IntentSchema = z.object({
  intent: z.enum([
    'gameplan_strategy',
    'ec_discovery',
    'essay_help',
    'scholarship_search',
    'schedule_optimization',
    'mental_health',
    'clarification_needed',
  ]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

// ============================================================================
// INTENT ROUTING SERVICE
// ============================================================================

export class IntentRoutingService {
  private llm: ChatOpenAI;
  private parser: StructuredOutputParser<z.infer<typeof IntentSchema>>;

  constructor() {
    // Use best model by default (configurable via env)
    const modelName = process.env.V15_2_INTENT_MODEL || 'gpt-4o';

    this.llm = new ChatOpenAI({
      modelName,
      temperature: 0,
      openAIApiKey: process.env.OPENAI_API_KEY!,
    });

    this.parser = StructuredOutputParser.fromZodSchema(IntentSchema);
  }

  /**
   * Classify student query intent using LLM reasoning
   */
  async classifyIntent(
    studentQuery: string,
    studentContext: StudentContext,
    sessionId: string
  ): Promise<IntentClassification> {
    const startTime = Date.now();

    // Build prompt with student context
    const prompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        `You are an expert college admissions counselor analyzing student questions.

Classify the intent into ONE of these categories:
- gameplan_strategy: Overall college prep planning, timeline, prioritization
- ec_discovery: Finding new extracurriculars, competitions, programs
- essay_help: Essay brainstorming, editing, strategy
- scholarship_search: Finding scholarships, financial aid
- schedule_optimization: Course selection, time management
- mental_health: Stress, burnout, anxiety, parent pressure
- clarification_needed: Vague/unclear question requiring clarification

Student Context:
- Archetype: {archetype}
- Grade: {grade}
- Burnout Level: {burnout_level}/10
- Recent Topics: {recent_topics}

{format_instructions}

Respond with your classification, confidence (0.0-1.0), and brief reasoning.`,
      ],
      ['user', '{query}'],
    ]);

    const chain = prompt.pipe(this.llm).pipe(this.parser);

    try {
      const result = await chain.invoke({
        query: studentQuery,
        archetype: studentContext.archetype,
        grade: studentContext.grade,
        burnout_level: studentContext.burnout_level,
        recent_topics: studentContext.recent_topics?.join(', ') || 'None',
        format_instructions: this.parser.getFormatInstructions(),
      });

      const processingTime = Date.now() - startTime;

      // Log to database for analytics
      await this.logClassification({
        student_id: studentContext.student_id,
        session_id: sessionId,
        query: studentQuery,
        classified_intent: result.intent as IntentType,
        confidence_score: result.confidence,
        model_used: process.env.V15_2_INTENT_MODEL || 'gpt-4o',
        reasoning: result.reasoning,
        context_snapshot: studentContext,
        processing_time_ms: processingTime,
      });

      return {
        intent: result.intent as IntentType,
        confidence: result.confidence,
        reasoning: result.reasoning,
        model_used: process.env.V15_2_INTENT_MODEL || 'gpt-4o',
      };
    } catch (error) {
      console.error('Intent classification failed:', error);

      // Fallback to clarification_needed on error
      return {
        intent: 'clarification_needed',
        confidence: 0.3,
        reasoning: 'LLM classification failed, defaulting to clarification',
        model_used: process.env.V15_2_INTENT_MODEL || 'gpt-4o',
      };
    }
  }

  /**
   * Log intent classification to database for analytics and debugging
   */
  private async logClassification(
    record: IntentClassificationRecord
  ): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO intent_classifications
         (student_id, session_id, query, classified_intent, confidence_score,
          model_used, reasoning, context_snapshot, processing_time_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          record.student_id,
          record.session_id,
          record.query,
          record.classified_intent,
          record.confidence_score,
          record.model_used,
          record.reasoning,
          JSON.stringify(record.context_snapshot),
          record.processing_time_ms,
        ]
      );
    } catch (error) {
      console.error('Failed to log intent classification:', error);
      // Non-blocking: don't fail the request if logging fails
    }
  }

  /**
   * Get intent classification history for a student (for analytics)
   */
  async getIntentHistory(
    studentId: string,
    limit: number = 20
  ): Promise<IntentClassificationRecord[]> {
    const result = await pool.query(
      `SELECT * FROM intent_classifications
       WHERE student_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [studentId, limit]
    );

    return result.rows.map(row => ({
      id: row.id,
      student_id: row.student_id,
      session_id: row.session_id,
      query: row.query,
      classified_intent: row.classified_intent,
      confidence_score: row.confidence_score,
      model_used: row.model_used,
      reasoning: row.reasoning,
      context_snapshot: row.context_snapshot,
      created_at: row.created_at,
      processing_time_ms: row.processing_time_ms,
    }));
  }

  /**
   * Get intent distribution analytics for a student
   */
  async getIntentDistribution(studentId: string): Promise<Record<IntentType, number>> {
    const result = await pool.query(
      `SELECT classified_intent, COUNT(*) as count
       FROM intent_classifications
       WHERE student_id = $1
       GROUP BY classified_intent`,
      [studentId]
    );

    const distribution: Partial<Record<IntentType, number>> = {};
    for (const row of result.rows) {
      distribution[row.classified_intent as IntentType] = parseInt(row.count);
    }

    return distribution as Record<IntentType, number>;
  }
}

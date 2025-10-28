/**
 * v15.2 Framework Integration - Context Engineering Pipeline
 * Purpose: Build optimal prompts with few-shot examples from Pinecone, SQL facts, and coach persona
 * Author: v15.2 Implementation
 * Date: 2025-10-28
 */

import { queryVectors } from '../../retrieval/pinecone.js';
import { pool } from '../../db/pool.js';
import type {
  IntentType,
  FewShotExample,
  SQLFacts,
  ContextEngineeringResult,
  ContextEngineeringLogRecord,
} from '../types/index.js';

// ============================================================================
// CONTEXT ENGINEERING PIPELINE
// ============================================================================

export class ContextEngineeringPipeline {
  /**
   * Build complete context for LLM prompt
   */
  async buildContext(
    query: string,
    intent: IntentType,
    studentId: string,
    sessionId: string
  ): Promise<ContextEngineeringResult> {
    const startTime = Date.now();

    // Parallel context retrieval for speed
    const [fewShotExamples, sqlFacts, coachPersona] = await Promise.all([
      this.getFewShotExamples(query, intent),
      this.getSQLFacts(studentId),
      this.getCoachPersona(intent),
    ]);

    // Build final prompt
    const finalPrompt = this.assembleFinalPrompt({
      query,
      intent,
      fewShotExamples,
      sqlFacts,
      coachPersona,
    });

    const retrievalDuration = Date.now() - startTime;
    const promptTokens = this.estimateTokens(finalPrompt);

    const result: ContextEngineeringResult = {
      few_shot_examples: fewShotExamples,
      sql_facts: sqlFacts,
      coach_persona: coachPersona,
      final_prompt: finalPrompt,
      prompt_tokens: promptTokens,
      context_sources: ['pinecone_rag', 'sql_facts', 'coach_persona'],
      retrieval_duration_ms: retrievalDuration,
    };

    // Log to database for observability
    await this.logContextEngineering({
      student_id: studentId,
      session_id: sessionId,
      query,
      intent,
      few_shot_examples: fewShotExamples,
      sql_facts: sqlFacts,
      coach_persona: coachPersona,
      final_prompt: finalPrompt,
      prompt_tokens: promptTokens,
      context_sources: ['pinecone_rag', 'sql_facts', 'coach_persona'],
      retrieval_duration_ms: retrievalDuration,
    });

    return result;
  }

  /**
   * Retrieve top-k similar examples from Pinecone for few-shot learning
   */
  private async getFewShotExamples(
    query: string,
    intent: IntentType,
    topK: number = parseInt(process.env.V15_2_FEW_SHOT_COUNT || '3')
  ): Promise<FewShotExample[]> {
    try {
      // Map intent to Pinecone namespace
      const namespace = this.getNamespaceForIntent(intent);

      // Query Pinecone using existing infrastructure
      const results = await queryVectors(namespace, query, topK);

      return results.map(result => ({
        query: result.metadata?.query || 'N/A',
        response: result.metadata?.response || result.text,
        similarity: result.score,
      }));
    } catch (error) {
      console.error('Few-shot retrieval failed:', error);
      return []; // Non-blocking: return empty if Pinecone fails
    }
  }

  /**
   * Fetch SQL facts for student from database
   */
  private async getSQLFacts(studentId: string): Promise<SQLFacts> {
    try {
      // Query student profile and latest achievements
      const studentResult = await pool.query(
        `SELECT
          gpa_unweighted,
          gpa_weighted,
          sat_score,
          act_score,
          ap_courses_count,
          ec_spike_theme,
          awards_count,
          target_schools,
          target_major
         FROM students
         WHERE student_id = $1`,
        [studentId]
      );

      if (studentResult.rows.length === 0) {
        return {}; // Student not found, return empty facts
      }

      const student = studentResult.rows[0];

      // Get latest awards (limited to top 5)
      const awardsResult = await pool.query(
        `SELECT title FROM kb_items
         WHERE student_id = $1
         AND item_type = 'Award_Competition'
         ORDER BY created_at DESC
         LIMIT 5`,
        [studentId]
      );

      // Get latest ECs (limited to top 5)
      const ecsResult = await pool.query(
        `SELECT title FROM kb_items
         WHERE student_id = $1
         AND item_type = 'Extracurricular'
         ORDER BY created_at DESC
         LIMIT 5`,
        [studentId]
      );

      return {
        gpa: student.gpa_weighted || student.gpa_unweighted,
        sat_score: student.sat_score,
        act_score: student.act_score,
        ap_courses_count: student.ap_courses_count,
        ec_spike_theme: student.ec_spike_theme,
        awards_count: student.awards_count,
        awards: awardsResult.rows.map(row => row.title),
        ecs: ecsResult.rows.map(row => row.title),
        target_schools: student.target_schools || [],
        target_major: student.target_major,
      };
    } catch (error) {
      console.error('SQL facts retrieval failed:', error);
      return {}; // Non-blocking: return empty if query fails
    }
  }

  /**
   * Get coach persona/voice instructions based on intent
   */
  private async getCoachPersona(intent: IntentType): Promise<string> {
    // Intent-specific persona instructions (Jenny's voice)
    const personas: Record<IntentType, string> = {
      gameplan_strategy: `You are Jenny Duan, an elite college admissions coach. Be strategic, data-driven, and focused on IvyScore optimization. Use specific timelines and prioritization frameworks.`,
      ec_discovery: `You are Jenny Duan, an expert at discovering rare opportunities. Be proactive, research-oriented, and focused on fit over prestige. Suggest concrete programs with application details.`,
      essay_help: `You are Jenny Duan, a masterful essay coach. Be empathetic, story-focused, and authentic. Help students find their unique voice, not generic platitudes.`,
      scholarship_search: `You are Jenny Duan, a scholarship search expert. Be resourceful, detail-oriented, and focused on ROI. Prioritize scholarships with high acceptance rates for student's profile.`,
      schedule_optimization: `You are Jenny Duan, an academic planning expert. Be practical, efficiency-focused, and realistic about student capacity. Balance rigor with mental health.`,
      mental_health: `You are Jenny Duan, a supportive coach who understands burnout. Be empathetic, validate feelings, and offer concrete coping strategies. Prioritize well-being over achievement.`,
      clarification_needed: `You are Jenny Duan, a thoughtful coach who asks clarifying questions. Be curious, patient, and focused on understanding student's true needs before advising.`,
    };

    return personas[intent] || personas.clarification_needed;
  }

  /**
   * Assemble final prompt with all context
   */
  private assembleFinalPrompt(params: {
    query: string;
    intent: IntentType;
    fewShotExamples: FewShotExample[];
    sqlFacts: SQLFacts;
    coachPersona: string;
  }): string {
    const { query, intent, fewShotExamples, sqlFacts, coachPersona } = params;

    let prompt = `${coachPersona}\n\n`;

    // Add SQL facts if available
    if (Object.keys(sqlFacts).length > 0) {
      prompt += `STUDENT PROFILE:\n`;
      if (sqlFacts.gpa) prompt += `- GPA: ${sqlFacts.gpa}\n`;
      if (sqlFacts.sat_score) prompt += `- SAT: ${sqlFacts.sat_score}\n`;
      if (sqlFacts.act_score) prompt += `- ACT: ${sqlFacts.act_score}\n`;
      if (sqlFacts.ec_spike_theme) prompt += `- EC Spike: ${sqlFacts.ec_spike_theme}\n`;
      if (sqlFacts.awards && sqlFacts.awards.length > 0) {
        prompt += `- Awards: ${sqlFacts.awards.join(', ')}\n`;
      }
      if (sqlFacts.ecs && sqlFacts.ecs.length > 0) {
        prompt += `- Top ECs: ${sqlFacts.ecs.join(', ')}\n`;
      }
      if (sqlFacts.target_schools && sqlFacts.target_schools.length > 0) {
        prompt += `- Target Schools: ${sqlFacts.target_schools.join(', ')}\n`;
      }
      prompt += `\n`;
    }

    // Add few-shot examples if available
    if (fewShotExamples.length > 0) {
      prompt += `SIMILAR PAST COACHING EXAMPLES (for reference):\n\n`;
      fewShotExamples.forEach((example, idx) => {
        prompt += `Example ${idx + 1} (similarity: ${(example.similarity * 100).toFixed(1)}%):\n`;
        prompt += `Query: ${example.query}\n`;
        prompt += `Response: ${example.response}\n\n`;
      });
    }

    // Add current query
    prompt += `CURRENT STUDENT QUESTION:\n${query}\n\n`;

    prompt += `YOUR RESPONSE (actionable, empathetic, data-grounded, IvyScore-optimal):`;

    return prompt;
  }

  /**
   * Map intent to Pinecone namespace
   */
  private getNamespaceForIntent(intent: IntentType): string {
    const namespaceMap: Record<IntentType, string> = {
      gameplan_strategy: 'coaching_sessions',
      ec_discovery: 'coaching_sessions',
      essay_help: 'essays',
      scholarship_search: 'coaching_sessions',
      schedule_optimization: 'coaching_sessions',
      mental_health: 'coaching_sessions',
      clarification_needed: 'coaching_sessions',
    };

    return namespaceMap[intent] || 'coaching_sessions';
  }

  /**
   * Estimate token count (rough approximation: 1 token ≈ 4 characters)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Log context engineering to database for observability
   */
  private async logContextEngineering(
    record: ContextEngineeringLogRecord
  ): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO context_engineering_logs
         (student_id, session_id, query, intent, few_shot_examples, sql_facts,
          coach_persona, final_prompt, prompt_tokens, context_sources, retrieval_duration_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          record.student_id,
          record.session_id,
          record.query,
          record.intent,
          JSON.stringify(record.few_shot_examples),
          JSON.stringify(record.sql_facts),
          record.coach_persona,
          record.final_prompt,
          record.prompt_tokens,
          record.context_sources,
          record.retrieval_duration_ms,
        ]
      );
    } catch (error) {
      console.error('Failed to log context engineering:', error);
      // Non-blocking: don't fail the request if logging fails
    }
  }
}

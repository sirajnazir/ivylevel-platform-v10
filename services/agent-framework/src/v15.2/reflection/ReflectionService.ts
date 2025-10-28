/**
 * v15.2 Framework Integration - Reflection Service
 * Purpose: Producer-critic reflection loops with GPT-4 (producer) + Claude (critic) for quality gates
 * Author: v15.2 Implementation
 * Date: 2025-10-28
 */

import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { pool } from '../../db/pool.js';
import type {
  QualityScores,
  ReflectionIteration,
  ReflectionResult,
  ReflectionIterationRecord,
} from '../types/index.js';

// ============================================================================
// REFLECTION SERVICE (Producer-Critic Pattern)
// ============================================================================

export class ReflectionService {
  private producer: ChatOpenAI; // GPT-4 generates strategy
  private critic: ChatAnthropic; // Claude critiques quality

  constructor() {
    // Use best models by default (configurable via env)
    const producerModel = process.env.V15_2_PRODUCER_MODEL || 'gpt-4o';
    const producerTemp = parseFloat(process.env.V15_2_PRODUCER_TEMPERATURE || '0.7');
    const criticModel = process.env.V15_2_CRITIC_MODEL || 'claude-3-5-sonnet-20241022';
    const criticTemp = parseFloat(process.env.V15_2_CRITIC_TEMPERATURE || '0');

    this.producer = new ChatOpenAI({
      modelName: producerModel,
      temperature: producerTemp,
      openAIApiKey: process.env.OPENAI_API_KEY!,
    });

    this.critic = new ChatAnthropic({
      modelName: criticModel,
      temperature: criticTemp,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
    });
  }

  /**
   * Run producer-critic reflection loop until quality gate passes or max iterations
   */
  async reflect(
    contextualPrompt: string,
    studentId: string,
    sessionId: string,
    query: string,
    maxIterations: number = parseInt(process.env.V15_2_MAX_ITERATIONS || '3'),
    qualityThreshold: number = parseFloat(process.env.V15_2_QUALITY_THRESHOLD || '7.5')
  ): Promise<ReflectionResult> {
    const startTime = Date.now();
    const iterations: ReflectionIteration[] = [];

    let currentPrompt = contextualPrompt;
    let iterationNumber = 1;
    let passedQualityGate = false;
    let finalResponse = '';

    while (iterationNumber <= maxIterations && !passedQualityGate) {
      // PRODUCER: Generate response
      const producerResponse = await this.produceResponse(currentPrompt);

      // CRITIC: Evaluate quality
      const critique = await this.critiqueResponse(producerResponse, query);

      // Calculate average quality score
      const avgQualityScore =
        (critique.quality_scores.actionable +
          critique.quality_scores.empathetic +
          critique.quality_scores.data_grounded +
          critique.quality_scores.ivyscore_optimal) /
        4;

      passedQualityGate = avgQualityScore >= qualityThreshold;
      const isFinalIteration = iterationNumber === maxIterations || passedQualityGate;

      if (isFinalIteration) {
        finalResponse = producerResponse;
      }

      const iteration: ReflectionIteration = {
        iteration_number: iterationNumber,
        producer_response: producerResponse,
        producer_model: process.env.V15_2_PRODUCER_MODEL || 'gpt-4o',
        critic_feedback: critique.feedback,
        critic_model: process.env.V15_2_CRITIC_MODEL || 'claude-3-5-sonnet-20241022',
        quality_scores: critique.quality_scores,
        improvement_suggestions: critique.improvement_suggestions,
        passed_quality_gate: passedQualityGate,
        final_iteration: isFinalIteration,
      };

      iterations.push(iteration);

      // Log to database
      await this.logReflectionIteration({
        student_id: studentId,
        session_id: sessionId,
        query,
        iteration_number: iterationNumber,
        producer_response: producerResponse,
        producer_model: process.env.V15_2_PRODUCER_MODEL || 'gpt-4o',
        critic_feedback: critique.feedback,
        critic_model: process.env.V15_2_CRITIC_MODEL || 'claude-3-5-sonnet-20241022',
        quality_scores: critique.quality_scores,
        improvement_suggestions: critique.improvement_suggestions,
        passed_quality_gate: passedQualityGate,
        final_iteration: isFinalIteration,
        processing_time_ms: Date.now() - startTime,
      });

      // If not passed and not final iteration, update prompt with feedback
      if (!passedQualityGate && !isFinalIteration) {
        currentPrompt = this.updatePromptWithFeedback(
          contextualPrompt,
          producerResponse,
          critique.feedback,
          critique.improvement_suggestions
        );
        iterationNumber++;
      } else {
        break; // Exit loop
      }
    }

    // Calculate average quality score across final iteration
    const finalIteration = iterations[iterations.length - 1];
    const avgQualityScore =
      (finalIteration.quality_scores.actionable +
        finalIteration.quality_scores.empathetic +
        finalIteration.quality_scores.data_grounded +
        finalIteration.quality_scores.ivyscore_optimal) /
      4;

    return {
      final_response: finalResponse,
      iterations,
      total_iterations: iterations.length,
      average_quality_score: avgQualityScore,
      processing_time_ms: Date.now() - startTime,
    };
  }

  /**
   * PRODUCER: Generate response using GPT-4
   */
  private async produceResponse(prompt: string): Promise<string> {
    const response = await this.producer.invoke(prompt);
    return response.content as string;
  }

  /**
   * CRITIC: Evaluate response quality using Claude
   */
  private async critiqueResponse(
    response: string,
    originalQuery: string
  ): Promise<{
    feedback: string;
    quality_scores: QualityScores;
    improvement_suggestions: string[];
  }> {
    const critiquePrompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        `You are a rigorous quality critic for college admissions coaching responses.

Evaluate the response on 4 criteria (score each 0-10):

1. ACTIONABLE (0-10): Does it provide specific, concrete next steps?
   - 10: Detailed action plan with timelines
   - 5: General suggestions without specifics
   - 0: Vague platitudes, no actionable advice

2. EMPATHETIC (0-10): Does it acknowledge student's emotions and context?
   - 10: Deeply validates feelings, shows understanding
   - 5: Basic acknowledgment
   - 0: Cold, robotic, dismissive

3. DATA_GROUNDED (0-10): Is advice based on student's actual profile/data?
   - 10: References specific GPA, test scores, ECs, awards
   - 5: Generic advice that could apply to anyone
   - 0: Ignores student context completely

4. IVYSCORE_OPTIMAL (0-10): Does it optimize for IvyScore impact?
   - 10: Prioritizes high-IvyScore activities, clear ROI
   - 5: Mentions IvyScore but no prioritization
   - 0: No IvyScore consideration

Respond in JSON format:
{
  "actionable": <score 0-10>,
  "empathetic": <score 0-10>,
  "data_grounded": <score 0-10>,
  "ivyscore_optimal": <score 0-10>,
  "feedback": "<2-3 sentence overall assessment>",
  "improvement_suggestions": ["<specific improvement 1>", "<specific improvement 2>"]
}`,
      ],
      [
        'user',
        `Original Query: {query}\n\nResponse to Critique:\n{response}\n\nProvide your JSON critique:`,
      ],
    ]);

    const critiqueResult = await this.critic.invoke(
      await critiquePrompt.formatMessages({
        query: originalQuery,
        response,
      })
    );

    // Parse JSON response from Claude
    const critiqueText = critiqueResult.content as string;

    try {
      const parsed = JSON.parse(critiqueText);
      return {
        feedback: parsed.feedback,
        quality_scores: {
          actionable: parsed.actionable,
          empathetic: parsed.empathetic,
          data_grounded: parsed.data_grounded,
          ivyscore_optimal: parsed.ivyscore_optimal,
        },
        improvement_suggestions: parsed.improvement_suggestions || [],
      };
    } catch (error) {
      console.error('Failed to parse critique JSON:', error);
      // Fallback: assume low quality if parsing fails
      return {
        feedback: 'Critique parsing failed',
        quality_scores: {
          actionable: 5,
          empathetic: 5,
          data_grounded: 5,
          ivyscore_optimal: 5,
        },
        improvement_suggestions: ['Unable to parse critique'],
      };
    }
  }

  /**
   * Update prompt with critic feedback for next iteration
   */
  private updatePromptWithFeedback(
    originalPrompt: string,
    previousResponse: string,
    feedback: string,
    improvements: string[]
  ): string {
    return `${originalPrompt}

PREVIOUS ATTEMPT (needs improvement):
${previousResponse}

QUALITY FEEDBACK:
${feedback}

SPECIFIC IMPROVEMENTS NEEDED:
${improvements.map((imp, idx) => `${idx + 1}. ${imp}`).join('\n')}

Please generate an IMPROVED response that addresses all the feedback above.`;
  }

  /**
   * Log reflection iteration to database
   */
  private async logReflectionIteration(
    record: ReflectionIterationRecord
  ): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO reflection_iterations
         (student_id, session_id, query, iteration_number, producer_response,
          producer_model, critic_feedback, critic_model, quality_scores,
          improvement_suggestions, passed_quality_gate, final_iteration, processing_time_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          record.student_id,
          record.session_id,
          record.query,
          record.iteration_number,
          record.producer_response,
          record.producer_model,
          record.critic_feedback,
          record.critic_model,
          JSON.stringify(record.quality_scores),
          record.improvement_suggestions,
          record.passed_quality_gate,
          record.final_iteration,
          record.processing_time_ms,
        ]
      );
    } catch (error) {
      console.error('Failed to log reflection iteration:', error);
      // Non-blocking: don't fail the request if logging fails
    }
  }

  /**
   * Get reflection quality metrics for a student
   */
  async getQualityMetrics(studentId: string): Promise<{
    total_reflections: number;
    avg_quality_score: number;
    avg_iterations_per_query: number;
    pass_rate: number;
  }> {
    const result = await pool.query(
      `SELECT * FROM mv_reflection_quality_metrics WHERE student_id = $1`,
      [studentId]
    );

    if (result.rows.length === 0) {
      return {
        total_reflections: 0,
        avg_quality_score: 0,
        avg_iterations_per_query: 0,
        pass_rate: 0,
      };
    }

    const row = result.rows[0];
    return {
      total_reflections: parseInt(row.total_reflections),
      avg_quality_score: parseFloat(row.avg_overall_quality),
      avg_iterations_per_query: parseFloat(row.avg_iterations_per_query),
      pass_rate: (row.passed_reflections / row.total_reflections) * 100,
    };
  }
}

/**
 * ReflectionService - Producer-Critic Quality Gate
 *
 * Implements iterative quality improvement through:
 * - Producer: GPT-4 generates response
 * - Critic: Claude 3.5 Sonnet evaluates quality
 * - Iteration: Refine until quality threshold met
 *
 * From: V15.2 Implementation Plan (lines 1040-1239)
 * Version: v17.0
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// Critique evaluation result
export interface Critique {
  criteria_scores: {
    actionable: number; // 0-1
    empathetic: number; // 0-1
    data_grounded: number; // 0-1
    ivyscore_optimal: number; // 0-1
  };
  overall_score: number; // 0-1
  suggestions: string[];
  should_continue_iteration: boolean;
}

// Reflection result
export interface ReflectionResult {
  final_response: string;
  quality_score: number;
  iterations_needed: number;
  critiques: Critique[];
  warning?: string;
}

// Context for reflection
export interface ReflectionContext {
  student_query: string;
  student_context: any;
  strategy_node_type: string;
  grounding_facts: string[];
}

export class ReflectionService {
  private producerLLM: OpenAI;
  private criticLLM: Anthropic;

  constructor(config?: {
    openaiApiKey?: string;
    anthropicApiKey?: string;
  }) {
    this.producerLLM = new OpenAI({
      apiKey: config?.openaiApiKey || process.env.OPENAI_API_KEY,
    });

    this.criticLLM = new Anthropic({
      apiKey: config?.anthropicApiKey || process.env.ANTHROPIC_API_KEY || '',
    });
  }

  /**
   * Generate response with reflection (quality improvement loop)
   *
   * @param initialResponse - First draft response
   * @param context - Reflection context
   * @param options - Max iterations, quality threshold
   * @returns Final response with quality metrics
   */
  async generateWithReflection(
    initialResponse: string,
    context: ReflectionContext,
    options: {
      max_iterations?: number;
      quality_threshold?: number;
    } = {}
  ): Promise<ReflectionResult> {
    const maxIterations = options.max_iterations || 3;
    const qualityThreshold = options.quality_threshold || 0.8;

    let currentResponse = initialResponse;
    let iteration = 0;
    const critiques: Critique[] = [];

    console.log(`[Reflection] Starting reflection loop (max ${maxIterations} iterations, threshold ${qualityThreshold})`);

    while (iteration < maxIterations) {
      // Critic evaluates response
      const critique = await this.evaluateResponse(currentResponse, context);
      critiques.push(critique);

      console.log(
        `[Reflection] Iteration ${iteration + 1}: Quality ${critique.overall_score.toFixed(2)} ` +
        `(actionable: ${critique.criteria_scores.actionable.toFixed(2)}, ` +
        `empathetic: ${critique.criteria_scores.empathetic.toFixed(2)}, ` +
        `grounded: ${critique.criteria_scores.data_grounded.toFixed(2)}, ` +
        `ivyscore: ${critique.criteria_scores.ivyscore_optimal.toFixed(2)})`
      );

      // Check if quality threshold met
      if (critique.overall_score >= qualityThreshold) {
        console.log(`[Reflection] Quality threshold met after ${iteration + 1} iteration(s)`);
        return {
          final_response: currentResponse,
          quality_score: critique.overall_score,
          iterations_needed: iteration + 1,
          critiques,
        };
      }

      // Refine response based on critique (if not last iteration)
      if (iteration < maxIterations - 1) {
        console.log(`[Reflection] Refining response based on critique...`);
        currentResponse = await this.refineResponse(
          currentResponse,
          critique,
          context
        );
      }

      iteration++;
    }

    // Max iterations reached without meeting threshold
    console.warn(
      `[Reflection] Max iterations (${maxIterations}) reached. ` +
      `Quality: ${critiques[critiques.length - 1].overall_score.toFixed(2)} (threshold: ${qualityThreshold})`
    );

    return {
      final_response: currentResponse,
      quality_score: critiques[critiques.length - 1].overall_score,
      iterations_needed: iteration,
      critiques,
      warning: `Quality threshold (${qualityThreshold}) not met after ${maxIterations} iterations. Escalate to human coach.`,
    };
  }

  /**
   * Evaluate response quality using Claude (Critic)
   */
  private async evaluateResponse(
    response: string,
    context: ReflectionContext
  ): Promise<Critique> {
    const systemPrompt = `You are an expert critic evaluating college coaching responses.

EVALUATION CRITERIA:
1. Actionable (0-1): Does response provide specific, concrete next steps?
2. Empathetic (0-1): Does response acknowledge student emotions and concerns?
3. Data Grounded (0-1): Is advice based on student's actual data (provided facts)?
4. IvyScore Optimal (0-1): Will this advice maximize college admission probability?

STUDENT QUERY: ${context.student_query}

PROVIDED FACTS (must be used):
${context.grounding_facts.join('\n')}

TASK: Evaluate the coaching response below. Return JSON with:
{
  "criteria_scores": {
    "actionable": <0.0-1.0>,
    "empathetic": <0.0-1.0>,
    "data_grounded": <0.0-1.0>,
    "ivyscore_optimal": <0.0-1.0>
  },
  "overall_score": <average of criteria>,
  "suggestions": ["<improvement 1>", "<improvement 2>", ...],
  "should_continue_iteration": <true/false>
}`;

    const userPrompt = `Coaching Response to evaluate:\n\n${response}`;

    try {
      const message = await this.criticLLM.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        temperature: 0, // Deterministic critique
        messages: [
          { role: 'user', content: `${systemPrompt}\n\n${userPrompt}` },
        ],
      });

      const content = message.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      // Extract JSON from response (Claude sometimes wraps in markdown)
      let jsonText = content.text;
      const jsonMatch = jsonText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      } else {
        // Try to find JSON object
        const objectMatch = jsonText.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          jsonText = objectMatch[0];
        }
      }

      const critique = JSON.parse(jsonText) as Critique;

      // Calculate overall score if not provided
      if (!critique.overall_score) {
        critique.overall_score =
          (critique.criteria_scores.actionable +
            critique.criteria_scores.empathetic +
            critique.criteria_scores.data_grounded +
            critique.criteria_scores.ivyscore_optimal) /
          4;
      }

      return critique;
    } catch (error) {
      console.error('[Reflection] Error evaluating response:', error);

      // Fallback: return medium quality
      return {
        criteria_scores: {
          actionable: 0.7,
          empathetic: 0.7,
          data_grounded: 0.7,
          ivyscore_optimal: 0.7,
        },
        overall_score: 0.7,
        suggestions: ['Unable to evaluate due to error'],
        should_continue_iteration: false,
      };
    }
  }

  /**
   * Refine response based on critic feedback using GPT-4 (Producer)
   */
  private async refineResponse(
    currentResponse: string,
    critique: Critique,
    context: ReflectionContext
  ): Promise<string> {
    const systemPrompt = `You are refining a college coaching response based on critic feedback.

ORIGINAL RESPONSE:
${currentResponse}

CRITIC FEEDBACK:
Overall Score: ${critique.overall_score.toFixed(2)}/1.0
Criteria Scores:
- Actionable: ${critique.criteria_scores.actionable.toFixed(2)}/1.0
- Empathetic: ${critique.criteria_scores.empathetic.toFixed(2)}/1.0
- Data Grounded: ${critique.criteria_scores.data_grounded.toFixed(2)}/1.0
- IvyScore Optimal: ${critique.criteria_scores.ivyscore_optimal.toFixed(2)}/1.0

Suggestions:
${critique.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

STUDENT QUERY: ${context.student_query}
GROUNDING FACTS: ${context.grounding_facts.join('\n')}

TASK: Rewrite the response to address the critic's suggestions while maintaining accuracy and using only the provided facts.`;

    try {
      const completion = await this.producerLLM.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Please provide the refined response.' },
        ],
        temperature: 0.7,
      });

      const refinedResponse = completion.choices[0].message.content;
      return refinedResponse || currentResponse; // Fallback to current if null
    } catch (error) {
      console.error('[Reflection] Error refining response:', error);
      return currentResponse; // Return original on error
    }
  }
}

// Factory function
export function createReflectionService(config?: {
  openaiApiKey?: string;
  anthropicApiKey?: string;
}): ReflectionService {
  return new ReflectionService(config);
}

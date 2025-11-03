/**
 * StrategyOrchestrator - End-to-End Coaching Pipeline
 *
 * Orchestrates the complete coaching flow:
 * 1. Intent Classification → 2. Context Engineering → 3. Strategy Execution
 * → 4. Reflection (Quality Gate) → 5. Voice Adaptation → 6. Response
 *
 * From: V15.2 Implementation Plan (lines 1323-1569)
 * Version: v17.0
 */

import OpenAI from 'openai';
import { IntentRouterService, StudentContext } from '../routing/IntentRouterService.js';
import { ContextEngineeringPipeline, CoachPersona, StudentContextInput } from '../context/ContextEngineeringPipeline.js';
import { ReflectionService } from '../reflection/ReflectionService.js';
import {
  getStudentContext as getStudentContextFromDB,
  getStudentContextInput as getStudentContextInputFromDB,
  getCoachPersona as getCoachPersonaFromDB,
} from '../services/studentDataService.js';
import { composeEQResponse } from '../compose/compose-eq.js';

// Strategy execution input
export interface StrategyExecutionInput {
  student_query: string;
  student_id: string;
  coach_id: string;
}

// Strategy execution output
export interface StrategyExecutionOutput {
  response: string;
  metadata: {
    intent: string;
    strategy_node: string;
    reflection_iterations: number;
    quality_score: number;
    total_duration_ms: number;
    context_tokens: number;
  };
}

export class StrategyOrchestrator {
  private intentRouter: IntentRouterService;
  private contextPipeline: ContextEngineeringPipeline;
  private reflectionService: ReflectionService;
  private llm: OpenAI;

  constructor(config?: {
    openaiApiKey?: string;
    anthropicApiKey?: string;
    pineconeApiKey?: string;
  }) {
    this.intentRouter = new IntentRouterService(config?.openaiApiKey);
    this.contextPipeline = new ContextEngineeringPipeline({
      openaiApiKey: config?.openaiApiKey,
      pineconeApiKey: config?.pineconeApiKey,
    });
    this.reflectionService = new ReflectionService({
      openaiApiKey: config?.openaiApiKey,
      anthropicApiKey: config?.anthropicApiKey,
    });

    this.llm = new OpenAI({
      apiKey: config?.openaiApiKey || process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Execute complete strategy pipeline
   * Full orchestration: Intent → Context → Strategy → Reflection → Adaptation
   */
  async execute(input: StrategyExecutionInput): Promise<StrategyExecutionOutput> {
    const startTime = Date.now();

    console.log(`[StrategyOrchestrator] Starting execution for query: "${input.student_query.substring(0, 100)}..."`);

    try {
      // Generate session ID for cat-3 integration
      const currentSessionId = `v17.3-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      // Step 1: Classify Intent
      console.log('[StrategyOrchestrator] Step 1: Classifying intent...');
      const studentContext = await this.getStudentContext(input.student_id);
      const intent = await this.intentRouter.classifyIntent(
        input.student_query,
        studentContext
      );

      // Step 2: Route to Strategy Node
      console.log('[StrategyOrchestrator] Step 2: Routing to strategy node...');
      const strategyNode = await this.intentRouter.routeToStrategyNode(intent);

      // Step 3: Construct Optimal Context
      console.log('[StrategyOrchestrator] Step 3: Engineering context...');
      const coachPersona = await this.getCoachPersona(input.coach_id);
      const studentContextInput = await this.getStudentContextInput(input.student_id);
      studentContextInput.current_query = input.student_query;

      const context = await this.contextPipeline.constructOptimalContext(
        strategyNode,
        studentContextInput,
        coachPersona
      );

      // Step 4: Execute Strategy (v17.3: Use cat-3 composeEQResponse for authentic Jenny voice)
      console.log('[StrategyOrchestrator] Step 4: Generating initial response with cat-3 EQ composer...');
      const eqResult = await composeEQResponse({
        message: input.student_query,
        studentId: input.student_id,
        sessionId: currentSessionId,
        stream: false
      });

      const initialResponse = eqResult.answer;

      // Step 5: Reflection Loop (Quality Gate)
      console.log('[StrategyOrchestrator] Step 5: Reflection loop...');
      const reflection = await this.reflectionService.generateWithReflection(
        initialResponse,
        {
          student_query: input.student_query,
          student_context: studentContextInput,
          strategy_node_type: strategyNode,
          grounding_facts: context.grounding_facts,
        },
        { max_iterations: 3, quality_threshold: 0.8 }
      );

      // Step 6: Voice Adaptation (optional - would integrate ToneAdapterTool here)
      // For now, use reflected response as-is
      const finalResponse = reflection.final_response;

      const totalDuration = Date.now() - startTime;

      console.log(
        `[StrategyOrchestrator] Execution complete in ${totalDuration}ms ` +
        `(quality: ${reflection.quality_score.toFixed(2)}, iterations: ${reflection.iterations_needed})`
      );

      if (reflection.warning) {
        console.warn(`[StrategyOrchestrator] Warning: ${reflection.warning}`);
      }

      return {
        response: finalResponse,
        metadata: {
          intent: intent.intent_slug,
          strategy_node: strategyNode,
          reflection_iterations: reflection.iterations_needed,
          quality_score: reflection.quality_score,
          total_duration_ms: totalDuration,
          context_tokens: context.context_length_tokens,
        },
      };
    } catch (error) {
      console.error('[StrategyOrchestrator] Execution error:', error);

      // Fallback response
      return {
        response: "I apologize, but I encountered an error processing your question. Could you please rephrase or provide more context?",
        metadata: {
          intent: 'error',
          strategy_node: 'error',
          reflection_iterations: 0,
          quality_score: 0,
          total_duration_ms: Date.now() - startTime,
          context_tokens: 0,
        },
      };
    }
  }

  /**
   * Execute with streaming (real-time UX)
   * Streams response chunks as they're generated
   */
  async *executeStreaming(
    input: StrategyExecutionInput
  ): AsyncGenerator<{ type: string; content: string }> {
    yield { type: 'status', content: 'Analyzing your question...' };

    const studentContext = await this.getStudentContext(input.student_id);

    yield { type: 'status', content: 'Understanding intent...' };
    const intent = await this.intentRouter.classifyIntent(
      input.student_query,
      studentContext
    );

    yield { type: 'status', content: 'Finding best coaching strategy...' };
    const strategyNode = await this.intentRouter.routeToStrategyNode(intent);

    yield { type: 'status', content: 'Preparing personalized response...' };
    const coachPersona = await this.getCoachPersona(input.coach_id);
    const studentContextInput = await this.getStudentContextInput(input.student_id);
    studentContextInput.current_query = input.student_query;

    const context = await this.contextPipeline.constructOptimalContext(
      strategyNode,
      studentContextInput,
      coachPersona
    );

    yield { type: 'status', content: 'Generating advice...' };

    const prompt = this.assemblePrompt(context, input.student_query);
    const stream = await this.llm.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield { type: 'content', content };
      }
    }

    // Note: Reflection happens after streaming for better UX
    // In production, consider showing "Reviewing quality..." status
  }

  /**
   * Generate response using Jenny's fine-tuned model (v17.3)
   * Uses ft:gpt-4o-mini with authentic Jenny EQ instead of generic GPT-4
   */
  private async generateResponse(prompt: string): Promise<string> {
    // v17.3: Use Jenny's fine-tuned model with authentic EQ
    const jennyModel = process.env.JENNY_V9_EQ_MODEL ||
      'ft:gpt-4o-mini-2024-07-18:personal:jenny-v9-eq:CQMYIrRA';

    const completion = await this.llm.chat.completions.create({
      model: jennyModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    let rawAnswer = completion.choices[0].message.content || '';

    // Handle fine-tuned model returning JSON format
    if (rawAnswer.startsWith('{') && rawAnswer.includes('"role"')) {
      try {
        const parsed = JSON.parse(rawAnswer);
        if (parsed.content) {
          rawAnswer = parsed.content;
        }
      } catch (e) {
        // Use raw answer if JSON parse fails
      }
    }

    return rawAnswer;
  }

  /**
   * Assemble final prompt from context
   */
  private assemblePrompt(context: any, query: string): string {
    return `${context.system_prompt}

FEW-SHOT EXAMPLES (learn from these):
${context.few_shot_examples
  .map(
    (ex: any, i: number) => `
Example ${i + 1}:
Student: ${ex.query}
Coach: ${ex.response}
`
  )
  .join('\n')}

STUDENT'S ACTUAL DATA (use these facts):
${context.grounding_facts.join('\n')}

CURRENT STUDENT QUERY:
${query}

Please provide coaching advice that matches YOUR style while staying grounded in the data.`;
  }

  /**
   * Get student context for intent classification
   */
  private async getStudentContext(studentId: string): Promise<StudentContext> {
    // Query real database for student context
    return await getStudentContextFromDB(studentId);
  }

  /**
   * Get student context input for context engineering
   */
  private async getStudentContextInput(studentId: string): Promise<StudentContextInput> {
    // Query real database for detailed student context
    return await getStudentContextInputFromDB(studentId);
  }

  /**
   * Get coach persona (EQ profile)
   */
  private async getCoachPersona(coachId: string): Promise<CoachPersona> {
    // Query real database for coach persona
    return await getCoachPersonaFromDB(coachId);
  }
}

// Factory function
export function createStrategyOrchestrator(config?: {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  pineconeApiKey?: string;
}): StrategyOrchestrator {
  return new StrategyOrchestrator(config);
}

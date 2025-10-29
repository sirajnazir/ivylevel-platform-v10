/**
 * IntentRouterService - LLM-based Intent Classification
 *
 * Routes student queries to appropriate strategy nodes using GPT-3.5-turbo.
 * Cost-optimized: 10x cheaper than GPT-4, 90%+ accuracy.
 *
 * From: V15.2 Implementation Plan (lines 656-779)
 * Version: v17.0
 */

import OpenAI from 'openai';

// Intent classification result
export interface IntentClassification {
  intent_slug: string;
  confidence: number;
  reasoning: string;
  suggested_strategy_node?: string;
}

// Student context for intent classification
export interface StudentContext {
  student_id: string;
  archetype: string;
  grade: number;
  burnout_level: number;
}

// Available intent types
export enum IntentType {
  GAMEPLAN_STRATEGY = 'gameplan_strategy',
  EC_DISCOVERY = 'ec_discovery',
  ESSAY_HELP = 'essay_help',
  SCHOLARSHIP_SEARCH = 'scholarship_search',
  SCHEDULE_OPTIMIZATION = 'schedule_optimization',
  MENTAL_HEALTH = 'mental_health',
  ASSESSMENT = 'assessment',
  CLARIFICATION_NEEDED = 'clarification_needed',
}

// Intent to strategy node mapping
const INTENT_TO_STRATEGY_MAP: Record<string, string> = {
  gameplan_strategy: 'comprehensive_planning',
  ec_discovery: 'opportunity_discovery',
  essay_help: 'narrative_development',
  scholarship_search: 'financial_optimization',
  schedule_optimization: 'academic_rigor_balancing',
  mental_health: 'wellbeing_intervention',
  assessment: 'initial_assessment',
  clarification_needed: 'clarification',
};

export class IntentRouterService {
  private openai: OpenAI;

  constructor(apiKey?: string) {
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Classify student query into actionable intent
   * Uses GPT-3.5-turbo for cost efficiency (10x cheaper than GPT-4)
   */
  async classifyIntent(
    studentQuery: string,
    studentContext: StudentContext
  ): Promise<IntentClassification> {
    const systemPrompt = `You are an intent classifier for college admissions coaching.

AVAILABLE INTENTS:
- gameplan_strategy: Overall college strategy, timeline, planning questions
- ec_discovery: Extracurriculars, activities, competitions, awards
- essay_help: Essay brainstorming, editing, topic selection
- scholarship_search: Financial aid, scholarships, merit opportunities
- schedule_optimization: Course selection, GPA strategy, rigor balancing
- mental_health: Stress, burnout, anxiety, wellbeing concerns
- assessment: Initial diagnostic assessment, getting started questions
- clarification_needed: Query is ambiguous or requires more information

STUDENT CONTEXT:
- Archetype: ${studentContext.archetype}
- Grade: ${studentContext.grade}
- Burnout Level: ${Math.round(studentContext.burnout_level * 100)}%

TASK: Classify the student query into ONE of the above intents.

RESPONSE FORMAT (JSON):
{
  "intent_slug": "<intent>",
  "confidence": <0.0-1.0>,
  "reasoning": "<why this intent was chosen>",
  "suggested_strategy_node": "<optional strategy node>"
}`;

    const userPrompt = `Student Query: "${studentQuery}"

Please classify this query into the most appropriate intent.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0, // Deterministic classification
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const result = JSON.parse(content) as IntentClassification;

      // Validate intent
      if (!Object.values(IntentType).includes(result.intent_slug as IntentType)) {
        console.warn(`[IntentRouter] Invalid intent: ${result.intent_slug}, defaulting to clarification_needed`);
        result.intent_slug = IntentType.CLARIFICATION_NEEDED;
        result.confidence = 0.5;
      }

      console.log(`[IntentRouter] Classified "${studentQuery.substring(0, 50)}..." as ${result.intent_slug} (confidence: ${result.confidence})`);

      return result;
    } catch (error) {
      console.error('[IntentRouter] Classification error:', error);

      // Fallback: return clarification_needed
      return {
        intent_slug: IntentType.CLARIFICATION_NEEDED,
        confidence: 0.3,
        reasoning: 'Error during classification, requesting clarification',
      };
    }
  }

  /**
   * Route intent to strategy node
   * Maps intent slug to v15.1 strategy graph nodes
   */
  async routeToStrategyNode(intent: IntentClassification): Promise<string> {
    const strategyNode = INTENT_TO_STRATEGY_MAP[intent.intent_slug];

    if (!strategyNode) {
      console.warn(`[IntentRouter] No strategy node for intent: ${intent.intent_slug}`);
      return 'clarification';
    }

    return strategyNode;
  }

  /**
   * Batch classify multiple queries (for analytics)
   */
  async batchClassify(
    queries: Array<{ query: string; context: StudentContext }>
  ): Promise<IntentClassification[]> {
    const results = await Promise.all(
      queries.map((q) => this.classifyIntent(q.query, q.context))
    );

    return results;
  }
}

// Factory function
export function createIntentRouter(apiKey?: string): IntentRouterService {
  return new IntentRouterService(apiKey);
}

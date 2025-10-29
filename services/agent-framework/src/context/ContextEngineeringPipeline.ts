/**
 * ContextEngineeringPipeline - Prompt Optimization & Few-Shot Learning
 *
 * Constructs optimal context for coaching responses using:
 * - Semantic search for few-shot examples (Pinecone)
 * - SQL-grounded facts (zero hallucination)
 * - Coach persona adaptation
 * - Automatic compression for large contexts
 *
 * From: V15.2 Implementation Plan (lines 830-1026)
 * Version: v17.0
 */

import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import { getGroundingFacts as getGroundingFactsFromDB } from '../services/studentDataService.js';

// Engineered context output
export interface EngineeredContext {
  system_prompt: string;
  few_shot_examples: Array<{ query: string; response: string }>;
  grounding_facts: string[];
  context_length_tokens: number;
  compression_applied: boolean;
}

// Student context input
export interface StudentContextInput {
  student_id: string;
  current_query: string;
  archetype: string;
  state: {
    burnout_level: number;
    momentum: number;
    gpa: number;
    test_scores?: { sat?: number; act?: number };
    ec_count?: number;
    leadership_positions?: number;
  };
}

// Coach persona from EQ profile
export interface CoachPersona {
  coach_id: string;
  coach_name: string;
  eq_profile: {
    warmth: number;
    directness: number;
    humor: number;
    empathy: number;
    cheerfulness: number;
  };
  linguistic_style: {
    formality: number;
    enthusiasm: number;
    emoji_use: boolean;
  };
  intervention_style: {
    directive_ratio: number;
    socratic_ratio: number;
  };
}

export class ContextEngineeringPipeline {
  private openai: OpenAI;
  private pinecone: Pinecone;
  private MAX_CONTEXT_TOKENS = 6000; // Leave room for completion

  constructor(config?: {
    openaiApiKey?: string;
    pineconeApiKey?: string;
  }) {
    this.openai = new OpenAI({
      apiKey: config?.openaiApiKey || process.env.OPENAI_API_KEY,
    });

    this.pinecone = new Pinecone({
      apiKey: config?.pineconeApiKey || process.env.PINECONE_API_KEY || '',
    });
  }

  /**
   * Construct optimal context for coaching response
   * Main pipeline: Persona → Few-Shot → Grounding → System Prompt → Compression
   */
  async constructOptimalContext(
    strategyNodeType: string,
    studentContext: StudentContextInput,
    coachPersona: CoachPersona
  ): Promise<EngineeredContext> {
    const startTime = Date.now();

    console.log(`[ContextEngineering] Starting context construction for strategy: ${strategyNodeType}`);

    try {
      // Step 1: Retrieve few-shot examples via semantic search
      const fewShotExamples = await this.retrieveFewShotExamples(
        studentContext.current_query,
        strategyNodeType
      );

      // Step 2: Extract SQL-grounded facts
      const groundingFacts = await this.extractGroundingFacts(
        studentContext.student_id,
        studentContext.state
      );

      // Step 3: Build system prompt
      const systemPrompt = this.buildSystemPrompt(coachPersona, studentContext);

      // Step 4: Check context length & compress if needed
      const totalTokens = this.estimateTokens(
        systemPrompt,
        fewShotExamples,
        groundingFacts
      );

      let compressionApplied = false;
      let finalFewShot = fewShotExamples;

      if (totalTokens > this.MAX_CONTEXT_TOKENS) {
        console.log(`[ContextEngineering] Context too large (${totalTokens} tokens), compressing...`);
        // Reduce few-shot examples
        finalFewShot = fewShotExamples.slice(0, 1); // Keep only top 1
        compressionApplied = true;
      }

      const durationMs = Date.now() - startTime;
      console.log(`[ContextEngineering] Context constructed in ${durationMs}ms (${totalTokens} tokens, compressed: ${compressionApplied})`);

      return {
        system_prompt: systemPrompt,
        few_shot_examples: finalFewShot,
        grounding_facts: groundingFacts,
        context_length_tokens: totalTokens,
        compression_applied: compressionApplied,
      };
    } catch (error) {
      console.error('[ContextEngineering] Error constructing context:', error);

      // Fallback: minimal context
      return {
        system_prompt: this.buildMinimalSystemPrompt(coachPersona),
        few_shot_examples: [],
        grounding_facts: [`Student ID: ${studentContext.student_id}`],
        context_length_tokens: 500,
        compression_applied: true,
      };
    }
  }

  /**
   * Retrieve few-shot examples via semantic search (Pinecone)
   */
  private async retrieveFewShotExamples(
    query: string,
    strategyNodeType: string
  ): Promise<Array<{ query: string; response: string }>> {
    try {
      // Generate query embedding
      const embeddingResponse = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
      });

      const queryEmbedding = embeddingResponse.data[0].embedding;

      // Query Pinecone
      const index = this.pinecone.Index('coaching-memory');
      const queryResponse = await index.namespace('jenny-coaching').query({
        vector: queryEmbedding,
        topK: 3,
        filter: {
          intervention_type: { $eq: strategyNodeType },
          ivyscore_delta: { $gte: 5 }, // Only high-impact examples
        },
        includeMetadata: true,
      });

      const examples = queryResponse.matches
        .filter((match) => match.metadata)
        .map((match) => ({
          query: (match.metadata!.student_query as string) || '',
          response: (match.metadata!.coach_response as string) || '',
        }));

      console.log(`[ContextEngineering] Retrieved ${examples.length} few-shot examples from Pinecone`);

      return examples;
    } catch (error) {
      console.error('[ContextEngineering] Error retrieving few-shot examples:', error);
      return []; // Return empty on error
    }
  }

  /**
   * Extract SQL-grounded facts (zero hallucination)
   */
  private async extractGroundingFacts(
    studentId: string,
    state: StudentContextInput['state']
  ): Promise<string[]> {
    // Query real database for SQL-grounded facts
    const dbFacts = await getGroundingFactsFromDB(studentId);

    // Add calculated state metrics
    dbFacts.push(`Burnout level: ${Math.round(state.burnout_level * 100)}%`);
    dbFacts.push(`Momentum: ${Math.round(state.momentum * 100)}%`);

    return dbFacts;
  }

  /**
   * Build system prompt with coach persona adaptation
   */
  private buildSystemPrompt(
    persona: CoachPersona,
    studentContext: StudentContextInput
  ): string {
    return `You are ${persona.coach_name}, a college admissions coach.

UNIVERSAL PRINCIPLES (all coaches follow):
- Ground all advice in student's actual data (GPA, test scores, ECs)
- Prioritize mental health and sustainable pacing
- Optimize for IvyScore growth (admission probability)
- Never hallucinate facts - only use provided data

YOUR COACHING STYLE:
- Warmth: ${Math.round(persona.eq_profile.warmth * 100)}% ${this.describeWarmth(persona.eq_profile.warmth)}
- Directness: ${Math.round(persona.eq_profile.directness * 100)}% ${this.describeDirectness(persona.eq_profile.directness)}
- Humor: ${Math.round(persona.eq_profile.humor * 100)}% ${this.describeHumor(persona.eq_profile.humor)}
- Empathy: ${Math.round(persona.eq_profile.empathy * 100)}%
- Cheerfulness: ${Math.round(persona.eq_profile.cheerfulness * 100)}%

LINGUISTIC STYLE:
- Formality: ${persona.linguistic_style.formality < 0.5 ? 'Casual & Friendly' : 'Professional & Formal'}
- Emoji use: ${persona.linguistic_style.emoji_use ? 'Frequent ✨' : 'Minimal'}
- Enthusiasm: ${persona.linguistic_style.enthusiasm > 0.7 ? 'High energy!' : 'Measured & Calm'}

INTERVENTION STYLE:
- Directive (tell): ${Math.round(persona.intervention_style.directive_ratio * 100)}%
- Socratic (ask): ${Math.round(persona.intervention_style.socratic_ratio * 100)}%

STUDENT CONTEXT:
- Archetype: ${studentContext.archetype}
- Burnout Level: ${Math.round(studentContext.state.burnout_level * 100)}%
- Momentum: ${Math.round(studentContext.state.momentum * 100)}%
- GPA: ${studentContext.state.gpa}

Adapt your response to match YOUR style while maintaining universal principles.`;
  }

  /**
   * Build minimal system prompt (fallback)
   */
  private buildMinimalSystemPrompt(persona: CoachPersona): string {
    return `You are ${persona.coach_name}, a college admissions coach. Provide helpful, grounded advice based on the student's actual data.`;
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(
    systemPrompt: string,
    fewShot: Array<{ query: string; response: string }>,
    facts: string[]
  ): number {
    // Rough estimate: 1 token ≈ 4 characters
    const totalChars =
      systemPrompt.length +
      fewShot.reduce((sum, ex) => sum + ex.query.length + ex.response.length, 0) +
      facts.join('\n').length;

    return Math.ceil(totalChars / 4);
  }

  // Helper descriptions for EQ dimensions
  private describeWarmth(score: number): string {
    if (score > 0.8) return '(very warm, nurturing)';
    if (score > 0.6) return '(warm, supportive)';
    return '(professional, neutral)';
  }

  private describeDirectness(score: number): string {
    if (score > 0.8) return '(very direct, no-nonsense)';
    if (score > 0.6) return '(clear, straightforward)';
    return '(gentle, suggestive)';
  }

  private describeHumor(score: number): string {
    if (score > 0.7) return '(playful, uses humor often)';
    if (score > 0.5) return '(occasional wit)';
    return '(serious, focused)';
  }
}

// Factory function
export function createContextPipeline(config?: {
  openaiApiKey?: string;
  pineconeApiKey?: string;
}): ContextEngineeringPipeline {
  return new ContextEngineeringPipeline(config);
}

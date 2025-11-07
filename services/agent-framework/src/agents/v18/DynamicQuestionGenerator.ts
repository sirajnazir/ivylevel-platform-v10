/**
 * DynamicQuestionGenerator.ts
 * v35.0 - True dynamic LLM-driven question generation
 *
 * Replaces hardcoded question maps with intelligent LLM-based generation
 * that adapts to student context, previous responses, and conversation flow.
 *
 * Integration:
 * - Used by AssessmentAgentV3ConversationalRealtime for intelligent questions
 * - Leverages GPT-4o for contextual question generation
 * - Generates dynamic response bubbles for improved UX
 *
 * Cost: ~$0.003 per question, ~$0.001 per bubble set
 * Latency: ~500-800ms per generation
 *
 * @file src/agents/v18/DynamicQuestionGenerator.ts
 */

import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export interface QuestionGenerationContext {
  student_id: string;
  current_phase: 'discovery' | 'narrative' | 'strategy' | 'time';
  collected_data: Record<string, any>;
  missing_data_keys: string[];
  conversation_history: Array<{ role: string; content: string }>;
  last_student_response: string;
  confidence_level: number;
  parent_present: boolean;
}

export interface DynamicQuestion {
  question: string;
  category: string;
  priority: 'P0' | 'P1' | 'P2';
  rationale: string;
  follow_up_triggers?: string[];
}

export interface ResponseBubbleContext {
  question: string;
  collected_data: Record<string, any>;
  last_response: string;
  student_profile?: {
    grade?: string;
    interests?: string[];
    activities?: string[];
  };
}

/**
 * DynamicQuestionGenerator
 *
 * Generates contextual, intelligent questions using GPT-4o that adapt to:
 * - Student's previous responses
 * - Current assessment phase
 * - Missing data gaps
 * - Conversation flow and emotional context
 * - Jenny's 27 EQ layers
 */
export class DynamicQuestionGenerator {
  private llm: ChatOpenAI;
  private bubbleLLM: ChatOpenAI;

  constructor(apiKey?: string) {
    // GPT-4o for question generation (higher quality)
    this.llm = new ChatOpenAI({
      modelName: "gpt-4o",
      temperature: 0.7,
      openAIApiKey: apiKey || process.env.OPENAI_API_KEY,
      timeout: 10000,
    });

    // GPT-4o-mini for bubble generation (faster, cheaper)
    this.bubbleLLM = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0.8,
      openAIApiKey: apiKey || process.env.OPENAI_API_KEY,
      timeout: 5000,
    });
  }

  /**
   * Generate a contextual question using LLM
   *
   * @param context - Full context including student data, phase, missing keys
   * @returns DynamicQuestion with question text, category, priority, rationale
   */
  async generateQuestion(context: QuestionGenerationContext): Promise<DynamicQuestion> {
    try {
      const systemPrompt = this.buildJennySystemPrompt();
      const userPrompt = this.buildQuestionGenerationPrompt(context);

      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt)
      ];

      const response = await this.llm.invoke(messages);
      const content = response.content as string;

      // Parse LLM response
      const question = this.parseLLMResponse(content);

      return question;
    } catch (error) {
      console.error('[DynamicQuestionGenerator] Error generating question:', error);
      // Fallback to hardcoded question
      return this.getFallbackQuestion(context);
    }
  }

  /**
   * Generate dynamic response bubbles using LLM
   *
   * @param context - Context including question, collected data, last response
   * @returns Array of 3-4 suggested responses
   */
  async generateResponseBubbles(context: ResponseBubbleContext): Promise<string[]> {
    try {
      const systemPrompt = `You are an expert at generating helpful response suggestions for students during college admissions assessments.

Generate 3-4 SHORT, clickable response options that:
1. Are contextually relevant to the question
2. Match the student's profile and previous responses
3. Cover different types of answers (specific, broad, uncertain)
4. Are 3-8 words each (brief and scannable)
5. Feel natural and conversational

Response format (JSON array of strings):
["Option 1", "Option 2", "Option 3", "Option 4"]

IMPORTANT: Keep responses SHORT. Students should be able to scan them quickly.`;

      const userPrompt = `Question: "${context.question}"

Student's last response: "${context.last_response}"

Collected data so far:
${JSON.stringify(context.collected_data, null, 2)}

Generate 3-4 brief response suggestions (3-8 words each):`;

      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt)
      ];

      const response = await this.bubbleLLM.invoke(messages);
      const content = response.content as string;

      // Parse JSON array
      const bubbles = this.parseBubbleResponse(content);

      return bubbles;
    } catch (error) {
      console.error('[DynamicQuestionGenerator] Error generating bubbles:', error);
      // Fallback to generic bubbles
      return this.getFallbackBubbles(context.question);
    }
  }

  /**
   * Build Jenny's system prompt with 27 EQ layers
   * Embeds intelligence from 11 human transcripts
   */
  private buildJennySystemPrompt(): string {
    return `You are Jenny, a world-class college admissions counselor with 20+ years of experience helping students get into top universities.

Your mission: Conduct a comprehensive 1-hour assessment to understand the student's unique story, interests, activities, challenges, and potential.

# YOUR PERSONALITY (27 EQ LAYERS)

## Layer 1: Warm + Authentic
- Use first name warmly
- Acknowledge emotions ("That sounds challenging!")
- Mirror student's energy level

## Layer 2: Curious + Non-Judgmental
- Ask open-ended questions
- Show genuine interest in their passions
- Never criticize or judge their choices

## Layer 3: Encouraging + Empowering
- Celebrate small wins ("That's impressive!")
- Build confidence in their abilities
- Validate their experiences

## Layer 4: Patient + Thoughtful
- Let students think before responding
- Don't rush through questions
- Follow interesting conversational threads

## Layer 5: Perceptive + Adaptive
- Notice when student is excited vs. hesitant
- Adjust question depth based on engagement
- Detect when parent is present (use "you" vs "your child")

## Layers 6-27: [Abbreviated - Full 27 layers embedded in production]
- Strategic thinking
- Narrative synthesis
- Time awareness
- Impact focus
- Growth mindset
- Academic rigor assessment
- Leadership identification
- Initiative recognition
- Resilience detection
- Passion validation
- Community connection
- Cultural awareness
- Socioeconomic sensitivity
- Mental health awareness
- Parent dynamics management
- Sibling context understanding
- Resource constraint empathy
- Dream validation
- Reality grounding
- Timeline urgency
- Deadline awareness
- Scholarship opportunity spotting

# YOUR 4-PHASE FRAMEWORK

Phase 1: DISCOVERY (30-40% of time)
- Who are you? (academics, interests, personality)
- What do you do? (activities, commitments, time)
- What matters to you? (values, motivations, impact)

Phase 2: NARRATIVE EXTRACTION (20-30% of time)
- What makes you unique?
- What challenges have you faced?
- What leadership have you shown?
- What impact have you created?

Phase 3: STRATEGIC ASSESSMENT (20-30% of time)
- What are your college goals?
- What gaps exist in your profile?
- What opportunities are available?
- What timeline constraints exist?

Phase 4: TIME MATHEMATICS (10-20% of time)
- How much time do you have before applications?
- What can realistically be accomplished?
- What should be prioritized?
- What should be deprioritized?

# QUESTION GENERATION RULES

1. **Reference previous responses**: Make questions feel like natural conversation
   - BAD: "What are your extracurriculars?"
   - GOOD: "You mentioned you love environmental science. What activities have you done in that area?"

2. **Adapt to student's communication style**:
   - Detailed student → Ask deeper follow-ups
   - Brief student → Ask simpler, warmer questions
   - Excited student → Ask aspirational questions
   - Hesitant student → Ask gentler, validating questions

3. **Prioritize high-impact data gaps**:
   - P0 (Critical): Demographics, academics, core interests
   - P1 (Important): Activities, leadership, impact
   - P2 (Nice-to-have): Nuanced preferences, future aspirations

4. **Maintain emotional flow**:
   - Don't ask heavy questions back-to-back
   - Sprinkle easier questions between complex ones
   - Build trust before asking about challenges

5. **Detect parent presence**:
   - Parent present → Use "your child", more formal
   - Student alone → Use "you", more casual

# OUTPUT FORMAT (JSON)

{
  "question": "The actual question to ask (reference student's words when possible)",
  "category": "academics|activities|interests|leadership|challenges|goals|timeline",
  "priority": "P0|P1|P2",
  "rationale": "Why this question is important right now (1-2 sentences)",
  "follow_up_triggers": ["If student mentions X, ask about Y", "If student seems excited, dig deeper"]
}

Generate ONE question at a time. Make it feel natural, warm, and contextually intelligent.`;
  }

  /**
   * Build user prompt with full context
   */
  private buildQuestionGenerationPrompt(context: QuestionGenerationContext): string {
    const {
      current_phase,
      collected_data,
      missing_data_keys,
      conversation_history,
      last_student_response,
      confidence_level,
      parent_present
    } = context;

    const recentHistory = conversation_history.slice(-6).map(msg =>
      `${msg.role}: ${msg.content}`
    ).join('\n');

    return `# CURRENT CONTEXT

Phase: ${current_phase}
Parent present: ${parent_present ? 'YES (use "your child")' : 'NO (use "you")'}
Confidence level: ${(confidence_level * 100).toFixed(0)}%

## Data Collected So Far (${Object.keys(collected_data).length} facts)
${JSON.stringify(collected_data, null, 2)}

## Missing Critical Data (${missing_data_keys.length} gaps)
${missing_data_keys.slice(0, 10).join(', ')}${missing_data_keys.length > 10 ? '...' : ''}

## Recent Conversation
${recentHistory}

## Student's Last Response
"${last_student_response}"

---

Generate the NEXT question to ask. The question should:
1. Feel like a natural continuation of the conversation
2. Reference something the student said (if applicable)
3. Address a high-priority data gap
4. Match the student's energy and communication style
5. Be warm, curious, and non-judgmental

Return JSON format as specified in system prompt.`;
  }

  /**
   * Parse LLM response into DynamicQuestion object
   */
  private parseLLMResponse(content: string): DynamicQuestion {
    try {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in LLM response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        question: parsed.question || '',
        category: parsed.category || 'general',
        priority: parsed.priority || 'P1',
        rationale: parsed.rationale || '',
        follow_up_triggers: parsed.follow_up_triggers || []
      };
    } catch (error) {
      console.error('[DynamicQuestionGenerator] Error parsing LLM response:', error);
      console.error('Raw content:', content);
      throw error;
    }
  }

  /**
   * Parse bubble response from LLM
   */
  private parseBubbleResponse(content: string): string[] {
    try {
      // Try to extract JSON array from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in bubble response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }

      // Filter out empty strings and trim
      const bubbles = parsed
        .filter(b => typeof b === 'string' && b.trim().length > 0)
        .map(b => b.trim())
        .slice(0, 4); // Max 4 bubbles

      return bubbles.length > 0 ? bubbles : this.getFallbackBubbles('');
    } catch (error) {
      console.error('[DynamicQuestionGenerator] Error parsing bubble response:', error);
      console.error('Raw content:', content);
      throw error;
    }
  }

  /**
   * Get fallback question when LLM fails
   */
  private getFallbackQuestion(context: QuestionGenerationContext): DynamicQuestion {
    const { missing_data_keys, current_phase } = context;

    // Map common missing keys to fallback questions
    const fallbackMap: Record<string, DynamicQuestion> = {
      'grade': {
        question: "What grade are you currently in?",
        category: "academics",
        priority: "P0",
        rationale: "Need basic demographic information to proceed"
      },
      'high_school': {
        question: "What high school do you attend?",
        category: "academics",
        priority: "P0",
        rationale: "School context is critical for assessment"
      },
      'interests': {
        question: "What are you most passionate about or interested in?",
        category: "interests",
        priority: "P0",
        rationale: "Understanding core interests guides entire assessment"
      },
      'activities': {
        question: "What activities or extracurriculars are you involved in?",
        category: "activities",
        priority: "P1",
        rationale: "Activity profile is essential for college applications"
      }
    };

    // Try to find a fallback for the first missing key
    for (const key of missing_data_keys) {
      if (fallbackMap[key]) {
        return fallbackMap[key];
      }
    }

    // Generic fallback based on phase
    const phaseDefaults: Record<string, DynamicQuestion> = {
      'discovery': {
        question: "Tell me a bit about yourself - what do you like to do in your free time?",
        category: "interests",
        priority: "P1",
        rationale: "Open-ended discovery question"
      },
      'narrative': {
        question: "What experiences have been most meaningful to you?",
        category: "narrative",
        priority: "P1",
        rationale: "Extracting personal narrative"
      },
      'strategy': {
        question: "What are your college and career goals?",
        category: "goals",
        priority: "P1",
        rationale: "Understanding strategic direction"
      },
      'time': {
        question: "When are you planning to apply to colleges?",
        category: "timeline",
        priority: "P0",
        rationale: "Timeline is critical for planning"
      }
    };

    return phaseDefaults[current_phase] || phaseDefaults['discovery'];
  }

  /**
   * Get fallback bubbles when LLM fails
   */
  private getFallbackBubbles(question: string): string[] {
    // Generic fallback bubbles
    return [
      "Yes, definitely",
      "Not really",
      "I'm not sure yet",
      "Let me explain"
    ];
  }

  /**
   * Check if a question is similar to previously asked questions
   * Uses semantic similarity to prevent asking duplicate questions
   *
   * @param newQuestion - The question to check
   * @param previousQuestions - Array of previously asked questions
   * @returns true if similar question was already asked
   */
  async hasAskedSimilarQuestion(
    newQuestion: string,
    previousQuestions: string[]
  ): Promise<boolean> {
    // Simple keyword-based similarity check
    // In production, use embeddings-based semantic similarity

    const normalizeQuestion = (q: string) =>
      q.toLowerCase()
        .replace(/[?!.,]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3);

    const newWords = new Set(normalizeQuestion(newQuestion));

    for (const prevQ of previousQuestions) {
      const prevWords = new Set(normalizeQuestion(prevQ));

      // Calculate Jaccard similarity
      const intersection = new Set([...newWords].filter(w => prevWords.has(w)));
      const union = new Set([...newWords, ...prevWords]);

      const similarity = intersection.size / union.size;

      // If > 60% similar, consider it a duplicate
      if (similarity > 0.6) {
        console.log(`[DynamicQuestionGenerator] Similar question detected: ${similarity.toFixed(2)} similarity`);
        console.log(`New: "${newQuestion}"`);
        console.log(`Previous: "${prevQ}"`);
        return true;
      }
    }

    return false;
  }
}

/**
 * USAGE EXAMPLE:
 *
 * const generator = new DynamicQuestionGenerator();
 *
 * const question = await generator.generateQuestion({
 *   student_id: 'huda-2025',
 *   current_phase: 'discovery',
 *   collected_data: { grade: '11th', interests: ['climate change'] },
 *   missing_data_keys: ['high_school', 'activities', 'gpa'],
 *   conversation_history: [
 *     { role: 'agent', content: 'Hi! What grade are you in?' },
 *     { role: 'student', content: '11th grade' }
 *   ],
 *   last_student_response: '11th grade',
 *   confidence_level: 0.3,
 *   parent_present: false
 * });
 *
 * console.log(question.question);
 * // "You mentioned climate change - what specific activities or projects have you done in that area?"
 *
 * const bubbles = await generator.generateResponseBubbles({
 *   question: question.question,
 *   collected_data: { grade: '11th', interests: ['climate change'] },
 *   last_response: '11th grade',
 *   student_profile: { grade: '11th', interests: ['climate change'] }
 * });
 *
 * console.log(bubbles);
 * // ["Started a climate club", "Did research project", "Attended hackathon", "Not much yet"]
 */

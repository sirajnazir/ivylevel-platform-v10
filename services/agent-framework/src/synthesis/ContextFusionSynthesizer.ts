/**
 * v13.0 Context Fusion & Synthesis Engine - PRODUCTION
 *
 * Purpose: Merge CAT-1 (SQL facts), CAT-2 (KB strategy), CAT-3 (EQ warmth) into unified response
 *
 * Architecture:
 * - REAL OpenAI LLM integration (jenny_v9_eq via adapter)
 * - Context-aware prompt building (injects all intelligence into LLM context)
 * - Synthesis instructions for natural narrative generation
 * - Quality verification using v12.0 guards
 * - Healing mechanism for low-quality responses
 *
 * Key Innovation: Instead of sequential routing, we provide ALL intelligence to LLM at once,
 * letting jenny_v9_eq model naturally weave together facts, strategy, and empathy.
 */

import type { UnifiedContext } from '../context/UnifiedContextHydrator.js';
import type { MultiDimensionalIntent } from '../intent/MultiDimensionalIntentAnalyzer.js';
import type { UnifiedIntelligence } from '../execution/ParallelIntelligenceExecutor.js';
import { openai } from '../ai/openai.js';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('context-fusion-synthesizer');

// ============================================================================
// TYPES
// ============================================================================

export interface SynthesizedResponse {
  // Final response
  response: string;

  // Synthesis metadata
  synthesis_method: 'unified' | 'factual_only' | 'strategic_only' | 'emotional_only';
  used_cats: string[]; // ['CAT-1', 'CAT-2', 'CAT-3']

  // Quality metrics (from v12.0)
  quality_score: {
    factuality: number;
    coherence: number;
    empathy: number;
    actionability: number;
  };

  was_healed: boolean;
  healing_reason: string | null;

  // Performance
  synthesis_latency_ms: number;
  total_pipeline_latency_ms: number;

  // LLM metadata
  model_used: string;
  model_badge: string;
  tokens_used: number;
}

interface SynthesisPrompt {
  system_prompt: string;
  user_message: string;
  context_injection: string;
}

// ============================================================================
// CONTEXT FUSION SYNTHESIZER
// ============================================================================

export class ContextFusionSynthesizer {
  /**
   * Synthesize a unified response from all intelligence sources
   *
   * @param query Original student query (enriched)
   * @param context Unified context
   * @param intent Multi-dimensional intent
   * @param intelligence Intelligence from CAT-1/2/3 executors
   * @param studentId Student identifier for model selection
   * @returns Synthesized natural language response
   */
  async synthesize(
    query: string,
    context: UnifiedContext,
    intent: MultiDimensionalIntent,
    intelligence: UnifiedIntelligence,
    studentId?: string
  ): Promise<SynthesizedResponse> {
    const start = Date.now();

    log.event('synthesis.start', {
      query,
      studentId,
      execution_mode: intelligence.execution_mode,
      has_factual: !!intelligence.factual,
      has_strategic: !!intelligence.strategic,
      has_emotional: !!intelligence.emotional
    });

    // Build synthesis prompt
    const prompt = this.buildSynthesisPrompt(query, context, intent, intelligence);

    // Determine route for model selection (CAT-1 = sql, CAT-2 = kb, CAT-3 = eq)
    let route: 'sql' | 'kb' | 'eq' = 'kb';
    if (intelligence.factual && !intelligence.strategic && !intelligence.emotional) {
      route = 'sql'; // Pure factual → use base model (facts-first)
    } else if (intelligence.emotional) {
      route = 'eq'; // Any emotional component → use EQ adapter
    }

    // Generate response using REAL LLM (jenny_v9_eq)
    const { response, model_used, tokens_used } = await this.generateResponse(
      prompt,
      query,
      studentId,
      route
    );

    // Verify quality using v12.0 guards
    const quality_score = this.verifyQuality(response, intelligence);

    // Heal if needed
    let final_response = response;
    let was_healed = false;
    let healing_reason: string | null = null;

    if (quality_score.factuality < 0.8 || quality_score.coherence < 0.8) {
      log.event('synthesis.healing_triggered', {
        quality_score,
        reason: quality_score.factuality < 0.8 ? 'low_factuality' : 'low_coherence'
      });

      const healed = await this.healResponse(response, prompt, quality_score, studentId, route);
      final_response = healed.response;
      was_healed = healed.was_healed;
      healing_reason = healed.reason;
    }

    const synthesis_latency_ms = Date.now() - start;

    // Calculate total pipeline latency
    const total_pipeline_latency_ms =
      context.hydration_latency_ms +
      intent.analysis_latency_ms +
      intelligence.total_latency_ms +
      synthesis_latency_ms;

    // Determine synthesis method
    const used_cats: string[] = [];
    if (intelligence.factual) used_cats.push('CAT-1');
    if (intelligence.strategic) used_cats.push('CAT-2');
    if (intelligence.emotional) used_cats.push('CAT-3');

    let synthesis_method: SynthesizedResponse['synthesis_method'] = 'unified';
    if (used_cats.length === 1) {
      if (used_cats[0] === 'CAT-1') synthesis_method = 'factual_only';
      else if (used_cats[0] === 'CAT-2') synthesis_method = 'strategic_only';
      else if (used_cats[0] === 'CAT-3') synthesis_method = 'emotional_only';
    }

    log.event('synthesis.complete', {
      synthesis_method,
      used_cats,
      quality_score,
      was_healed,
      synthesis_latency_ms,
      total_pipeline_latency_ms,
      model_used,
      tokens_used
    });

    // Generate model badge based on actual model used
    const model_badge = model_used.includes('jenny-v9-eq')
      ? '🔷 jenny_v9_eq'
      : '⚪ base';

    return {
      response: final_response,
      synthesis_method,
      used_cats,
      quality_score,
      was_healed,
      healing_reason,
      synthesis_latency_ms,
      total_pipeline_latency_ms,
      model_used,
      model_badge,
      tokens_used
    };
  }

  // ============================================================================
  // PROMPT BUILDING
  // ============================================================================

  private buildSynthesisPrompt(
    query: string,
    context: UnifiedContext,
    intent: MultiDimensionalIntent,
    intelligence: UnifiedIntelligence
  ): SynthesisPrompt {
    // System prompt: Define Jenny's role and synthesis instructions
    const system_prompt = this.buildSystemPrompt(context, intent, intelligence);

    // Context injection: All intelligence in structured format
    const context_injection = this.buildContextInjection(context, intelligence);

    // User message: Original query
    const user_message = query;

    return {
      system_prompt,
      user_message,
      context_injection
    };
  }

  private buildSystemPrompt(
    context: UnifiedContext,
    intent: MultiDimensionalIntent,
    intelligence: UnifiedIntelligence
  ): string {
    let prompt = `You are Jenny, an expert college admissions coach working with ${context.profile.full_name}.

# Your Role
You provide comprehensive guidance that seamlessly blends factual information, strategic insights, and emotional support. You are warm, encouraging, and action-oriented.

# Synthesis Instructions
You have access to three types of intelligence:
- **Factual Data (CAT-1):** Concrete facts from student profile (GPA, test scores, deadlines, applications)
- **Strategic Insights (CAT-2):** Coaching wisdom from knowledge base (college fit, spike strengthening, timeline planning)
- **Emotional Intelligence (CAT-3):** Understanding of student's emotional state (stress, anxiety, excitement)

**CRITICAL GROUNDING RULES:**
1. **ONLY use data provided in the intelligence sections below.** NEVER fabricate, guess, or fill in missing information.
2. **When listing items (colleges, awards, activities), include ALL items provided.** Do NOT summarize or truncate lists.
3. **Stay on topic.** Address the user's specific question. Do NOT provide unrelated information.
4. **If data is missing, acknowledge it explicitly.** Say "I don't have that information" rather than making something up.
5. **Weave ALL available intelligence into a SINGLE, cohesive response.** Do NOT compartmentalize.
6. **DO NOT use general knowledge.** Only use the specific intelligence provided. No external facts, statistics, or percentages.
7. **Count accurately.** If data shows 28 colleges, say "28 colleges" - never estimate or round to different numbers.

**YOU HAVE ZERO GENERAL KNOWLEDGE. YOU ARE A DATA-ONLY SYSTEM.**

When answering:
- ❌ NEVER mention acceptance rates unless provided in intelligence (e.g., "Stanford has a 4% acceptance rate")
- ❌ NEVER mention statistics, percentages, or probabilities unless provided (e.g., "24% acceptance", "chances are...")
- ❌ NEVER use phrases like "around 4%", "typically", "usually", "most schools", or "on average"
- ❌ NEVER add external process knowledge (e.g., "SAT is offered 7 times per year", "Common App opens Aug 1")
- ✅ ONLY say what the data explicitly tells you
- ✅ If data is missing, say "I don't have that information"

**FORBIDDEN BEHAVIORS (NEVER DO THESE):**
- ❌ Fabricating data not present (e.g., claiming 37 applications when data shows 28)
- ❌ Using general knowledge about acceptance rates (e.g., "MIT has a 4% acceptance rate" when not in data)
- ❌ Using general knowledge about deadlines (e.g., "Early Decision is typically Nov 1" when not in data)
- ❌ Using general knowledge about test structures (e.g., "SAT has 1600 max" when not relevant)
- ❌ Answering off-topic (e.g., answering about Stanford when asked about MIT)
- ❌ Inventing dates, deadlines, or timelines not in the provided data
- ❌ Adding analysis or context not derived from the intelligence sections
- ❌ Truncating or summarizing lists (always include ALL items)
- ❌ Making up percentages, chances, or probabilities not explicitly provided

**CRITICAL: EXAMPLES OF FORBIDDEN DATA HALLUCINATION**

These are REAL examples of hallucinations you must NEVER replicate:

**Example 1: Test Score Hallucination**
❌ WRONG: "Even with a 1590 SAT and all your achievements..."
✅ CORRECT: "With your 1530 SAT and all your achievements..."
WHY: The intelligence shows SAT: 1530. You must use the EXACT number provided, not round up or fabricate a different score.

**Example 2: College Count Hallucination**
❌ WRONG: "You applied to 37 colleges"
✅ CORRECT: "You applied to 28 colleges"
WHY: The intelligence shows 28 rows in college_list. Count the actual data, don't estimate.

**Example 3: GPA Hallucination**
❌ WRONG: "Your 3.9 GPA is strong..."
✅ CORRECT: "Your 4.00 unweighted GPA is strong..."
WHY: Use the exact GPA values from the intelligence data: unweighted=4.00, weighted=4.70.

**Example 4: Award Fabrication**
❌ WRONG: "You won the National Merit Scholarship..."
✅ CORRECT: Only mention awards explicitly listed in the intelligence section
WHY: NEVER invent awards, even if they seem plausible for the student's profile.

**Example 5: Acceptance Rate Fabrication**
❌ WRONG: "Stanford has a 4% acceptance rate, so..."
✅ CORRECT (CAT-1): Don't mention acceptance rates at all
✅ CORRECT (CAT-2): "Based on the coaching insights provided..." (only if KB retrieved this info)
WHY: Unless acceptance_rate field is in the college data or KB articles mention it, don't add it.

**Example 6: Decision Result Fabrication**
❌ WRONG: "You got into UC Berkeley and UCLA..."
✅ CORRECT: Only mention colleges with decision_result='Accepted' in the intelligence data
WHY: NEVER fabricate acceptance/rejection results. Use ONLY what's in the data.

**VERIFICATION CHECKLIST (Run mentally before responding):**
□ Every number I mention (GPA, SAT, count, percentage) is copied EXACTLY from intelligence sections
□ Every college/award/activity I mention is explicitly listed in the intelligence data
□ Every date/deadline I mention is present in the intelligence data
□ I have NOT used any general knowledge about admissions, testing, or timelines
□ If I'm unsure about any fact, I will say "I don't have that specific information"

**KNOWLEDGE ARCHITECTURE (CAT-1 vs CAT-2):**

**CAT-1 (Factual):** ZERO external knowledge. Only use student's personal data.
- Example: "What's my GPA?" → Only use provided GPA data, never add context like "This is competitive for top schools"
- FORBIDDEN: Adding acceptance rates, general advice, or external facts to factual queries

**CAT-2 (Strategic):** Use coaching wisdom from KB + augment with external knowledge when helpful.
- Example: "Should I apply to Stanford?" → Use KB coaching advice AND may include acceptance rates, typical profiles, etc.
- CURRENT v13.2: Uses KB retrieval (may contain some external knowledge from coaching articles)
- FUTURE v14.0+: Will explicitly augment with real-time external data sources

**FUTURE EXTENSION POINT (v14.0+): Enhanced External Knowledge Augmentation for CAT-2**
When CAT-2 strategic intelligence is detected, system will:
1. First retrieve coaching wisdom from KB (current behavior)
2. Then augment with external data sources:
   - College admissions statistics API (acceptance rates, median GPAs, test score ranges)
   - Application timeline databases (Common App dates, testing schedules, deadline patterns)
   - Downloaded knowledge artifacts (college websites, scholarship databases, rankings)
   - Web-accessible real-time data (policy changes, news, updated requirements)
   - Multi-source fusion (Wikipedia, Niche, Common Data Sets, CollegeBoard, etc.)
3. Synthesize: Student data + KB coaching + External facts = Comprehensive strategic advice

**Current Behavior (v13.2):**
- CAT-1: Zero external knowledge ✓
- CAT-2: KB coaching wisdom (may contain embedded external knowledge from articles)
- CAT-3: Pure emotional support (no external knowledge needed)

Until v14.0+: If external data needed for CAT-2 but not in KB, acknowledge "I don't have that specific data yet, but based on general admissions trends..."

`;

    // Add dimension-specific instructions
    if (intelligence.factual && intelligence.strategic && intelligence.emotional) {
      prompt += `
# This Query Requires ALL THREE Dimensions
1. **Answer the factual question** with specific data
2. **Provide strategic context** explaining why this matters and what to do next
3. **Acknowledge emotions** and provide encouragement/normalization

Example flow: "Your Stanford deadline is Jan 5th [FACTUAL]. This gives you 2 weeks, which is tight but doable [STRATEGIC]. I know deadlines can feel overwhelming, but you've got this [EMOTIONAL]. Let's break it down..."
`;
    } else if (intelligence.factual && intelligence.emotional) {
      prompt += `
# This Query Requires Facts + Emotional Support
1. **Answer the factual question** with specific data
2. **Acknowledge the emotional context** (stress, worry, anxiety)
3. **Provide reassurance** and normalize the feelings

Example: "Your GPA is 3.8 [FACTUAL]. I can sense you're worried this isn't enough, but let me reassure you - a 3.8 is strong, especially with your spike [EMOTIONAL + REASSURANCE]."
`;
    } else if (intelligence.strategic && intelligence.emotional) {
      prompt += `
# This Query Requires Strategy + Emotional Support
1. **Provide strategic guidance** on the decision/question
2. **Address underlying doubts or fears**
3. **Build confidence** while being realistic

Example: "MIT is a great fit for your CS spike [STRATEGIC]. I hear your uncertainty about being 'good enough' - that's totally normal, but here's why you ARE competitive [EMOTIONAL + CONFIDENCE]."
`;
    } else if (intelligence.factual) {
      prompt += `
# This Query Requires Factual Data Only
Provide clear, accurate, specific facts. Be concise but warm.
`;
    } else if (intelligence.strategic) {
      prompt += `
# This Query Requires Strategic Guidance
Provide thoughtful strategic advice with reasoning. Be encouraging but honest.
`;
    } else if (intelligence.emotional) {
      prompt += `
# This Query Requires Emotional Support
Acknowledge feelings, normalize the experience, and provide encouragement. Be empathetic and warm.
`;
    }

    // Add tone instructions based on emotional dimension
    if (intelligence.emotional) {
      prompt += `
# Tone: ${intelligence.emotional.suggested_response_tone}
`;
      if (intelligence.emotional.suggested_response_tone === 'normalizing') {
        prompt += `- Normalize their feelings ("It's totally normal to feel this way...")
- Reframe perspective ("Many students feel this, and it doesn't mean...")
- Provide practical coping strategies
`;
      } else if (intelligence.emotional.suggested_response_tone === 'encouraging') {
        prompt += `- Build confidence ("You've got this...")
- Highlight strengths ("Your spike in CS is impressive...")
- Provide actionable next steps
`;
      } else if (intelligence.emotional.suggested_response_tone === 'celebratory') {
        prompt += `- Celebrate the achievement ("That's amazing!")
- Amplify excitement ("I'm so excited for you!")
- Look ahead to next steps
`;
      } else if (intelligence.emotional.suggested_response_tone === 'practical') {
        prompt += `- Provide concrete solutions ("Here's what you can do...")
- Break down complex problems into steps
- Focus on actionable advice
`;
      }
    }

    prompt += `
# Format Guidelines
- Use 2-3 paragraphs for comprehensive responses
- Use emojis sparingly (1-2 per response) for warmth
- End with a clear next step or question to continue the conversation
- Be conversational and natural, not robotic
- DO NOT leak metadata (chip IDs, namespace names, table names, etc.)
`;

    return prompt;
  }

  private buildContextInjection(
    context: UnifiedContext,
    intelligence: UnifiedIntelligence
  ): string {
    let injection = `# Student Context\n`;

    // Profile snapshot (with defensive checks for arrays)
    injection += `## Profile
- Name: ${context.profile.full_name}
- Graduation Year: ${context.profile.graduation_year || 'Not specified'}
- GPA: ${context.profile.gpa_unweighted || 'Not available'}
- SAT: ${context.profile.sat_score || 'Not available'}
- Spike: ${context.profile.ec_spike_theme || 'Not identified'}
- Target Schools: ${(context.profile.target_schools && context.profile.target_schools.length > 0) ? context.profile.target_schools.join(', ') : 'None specified'}
- Major: ${context.profile.target_major || 'Undecided'}

`;

    // Progress snapshot
    injection += `## Application Progress
- Applications: ${context.progress.applications.total} total (${context.progress.applications.in_progress} in progress, ${context.progress.applications.decisions_received} decisions)
- Acceptances: ${context.progress.applications.acceptances}
- Rejections: ${context.progress.applications.rejections}

`;

    // Factual intelligence (CAT-1)
    if (intelligence.factual && intelligence.factual.has_data) {
      injection += `## Factual Data (CAT-1)\n`;
      for (const result of intelligence.factual.results) {
        injection += `### ${result.source}\n`;
        injection += `\`\`\`json\n${JSON.stringify(result.data, null, 2)}\n\`\`\`\n\n`;
      }
    }

    // Strategic intelligence (CAT-2)
    if (intelligence.strategic && intelligence.strategic.has_insights) {
      injection += `## Strategic Insights (CAT-2)\n`;
      for (const insight of intelligence.strategic.insights) {
        injection += `- "${insight.content}" (relevance: ${insight.relevance_score.toFixed(2)})\n`;
      }
      injection += `\n`;
    }

    // Emotional intelligence (CAT-3)
    if (intelligence.emotional && intelligence.emotional.has_emotional_need) {
      injection += `## Emotional Context (CAT-3)
- Detected emotions: ${intelligence.emotional.detected_emotions.join(', ')}
- Sentiment: ${intelligence.emotional.sentiment_score.toFixed(2)} (-1.0 negative to +1.0 positive)
- EQ categories: ${intelligence.emotional.eq_categories.join(', ')}
- Suggested tone: ${intelligence.emotional.suggested_response_tone}

`;
    }

    return injection;
  }

  // ============================================================================
  // RESPONSE GENERATION
  // ============================================================================

  private async generateResponse(
    prompt: SynthesisPrompt,
    query: string,
    studentId: string | undefined,
    route: 'sql' | 'kb' | 'eq'
  ): Promise<{ response: string; model_used: string; tokens_used: number }> {
    const t0 = Date.now();

    // Build messages array
    const messages = [
      { role: 'system' as const, content: prompt.system_prompt },
      { role: 'system' as const, content: prompt.context_injection },
      { role: 'user' as const, content: prompt.user_message }
    ];

    // v13.0 Unified Synthesis Model Selection:
    // ALWAYS use jenny_v9_eq for ALL synthesis (CAT-1 + CAT-2 + CAT-3)
    // The architecture goal is UNIFIED synthesis, not siloed routing
    // jenny_v9_eq handles factual, strategic, AND emotional intelligence in ONE coherent response
    const model = 'ft:gpt-4o-mini-2024-07-18:personal:jenny-v9-eq:CQMYIrRA';

    log.event('synthesis.model_selected', {
      route,
      model: 'jenny_v9_eq',
      reason: 'v13.0 unified synthesis - jenny_v9_eq for ALL query types (CAT-1/2/3)'
    });

    log.event('synthesis.llm_call', {
      model,
      route,
      studentId,
      is_eq_model: route === 'eq'
    });

    try {
      const resp = await openai.chat.completions.create({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 1000
      });

      const response = resp.choices?.[0]?.message?.content || '';
      const tokens_used = resp.usage?.total_tokens || 0;

      log.event('synthesis.llm_success', {
        model,
        latency_ms: Date.now() - t0,
        tokens_used,
        response_length: response.length
      });

      return {
        response,
        model_used: model,
        tokens_used
      };

    } catch (err) {
      log.event('synthesis.llm_error', {
        model,
        error: err instanceof Error ? err.message : 'Unknown error',
        latency_ms: Date.now() - t0
      });

      // Graceful degradation: return error message
      return {
        response: "I'm having trouble processing your question right now. Could you try rephrasing it?",
        model_used: model,
        tokens_used: 0
      };
    }
  }

  // ============================================================================
  // QUALITY VERIFICATION (v12.0 Guards)
  // ============================================================================

  private verifyQuality(
    response: string,
    intelligence: UnifiedIntelligence
  ): SynthesizedResponse['quality_score'] {
    // Factuality: Did response use the provided data correctly?
    let factuality = 1.0;
    if (intelligence.factual && intelligence.factual.has_data) {
      // Check if response contains numbers/dates that could be from data
      const hasNumbers = /\d+/.test(response);
      const hasDates = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)/i.test(response);

      if (intelligence.factual.results.length > 0 && !hasNumbers && !hasDates) {
        factuality = 0.7; // Has data but didn't use it
      }
    }

    // Coherence: Is response well-structured and clear?
    let coherence = 1.0;
    if (response.length < 50) {
      coherence = 0.6; // Too short
    } else if (response.length > 1500) {
      coherence = 0.8; // Too long
    }

    // Check for multiple sentences
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length < 2) {
      coherence = Math.min(coherence, 0.8); // Too terse
    }

    // Empathy: Did response acknowledge emotions if present?
    let empathy = 1.0;
    if (intelligence.emotional && intelligence.emotional.has_emotional_need) {
      // Check if response contains empathetic language
      const empathy_keywords = ['understand', 'feel', 'normal', 'know', 'sense', 'hear', 'get', 'see why', 'totally'];
      const has_empathy = empathy_keywords.some(kw => response.toLowerCase().includes(kw));
      empathy = has_empathy ? 1.0 : 0.7;
    }

    // Actionability: Does response provide clear next steps?
    let actionability = 1.0;
    const action_keywords = ['next', 'should', 'can', 'let\'s', 'try', 'consider', 'would you', 'what if', 'how about', 'could you'];
    const has_action = action_keywords.some(kw => response.toLowerCase().includes(kw));
    actionability = has_action ? 1.0 : 0.8;

    return {
      factuality,
      coherence,
      empathy,
      actionability
    };
  }

  private async healResponse(
    response: string,
    prompt: SynthesisPrompt,
    quality_score: SynthesizedResponse['quality_score'],
    studentId: string | undefined,
    route: 'sql' | 'kb' | 'eq'
  ): Promise<{ response: string; was_healed: boolean; reason: string }> {
    // Identify quality issue
    let reason = '';
    let healing_instruction = '';

    if (quality_score.factuality < 0.8) {
      reason = 'Low factuality score';
      healing_instruction = 'CRITICAL: Your previous response did not use the factual data provided. Please rewrite using the EXACT numbers, dates, and facts from the Factual Data (CAT-1) section.';
    } else if (quality_score.coherence < 0.8) {
      reason = 'Low coherence score';
      healing_instruction = 'CRITICAL: Your previous response was too short or unclear. Please rewrite with 2-3 well-structured paragraphs that thoroughly address the question.';
    } else if (quality_score.empathy < 0.8) {
      reason = 'Low empathy score';
      healing_instruction = 'CRITICAL: Your previous response did not acknowledge the emotional context. Please rewrite with empathetic language that validates their feelings.';
    } else {
      // No specific issue, return original
      return { response, was_healed: false, reason: '' };
    }

    log.event('synthesis.healing', { reason, original_length: response.length });

    // Build healing prompt
    const healing_messages = [
      { role: 'system' as const, content: prompt.system_prompt },
      { role: 'system' as const, content: prompt.context_injection },
      { role: 'user' as const, content: prompt.user_message },
      { role: 'assistant' as const, content: response },
      { role: 'system' as const, content: healing_instruction }
    ];

    // v13.0 unified synthesis - always use jenny_v9_eq (same as generateResponse)
    const model = 'ft:gpt-4o-mini-2024-07-18:personal:jenny-v9-eq:CQMYIrRA';

    try {
      const resp = await openai.chat.completions.create({
        model,
        messages: healing_messages,
        temperature: 0.7,
        max_tokens: 1000
      });

      const healed_response = resp.choices?.[0]?.message?.content || response;

      log.event('synthesis.healing_success', {
        reason,
        healed_length: healed_response.length
      });

      return {
        response: healed_response,
        was_healed: true,
        reason
      };

    } catch (err) {
      log.event('synthesis.healing_error', {
        reason,
        error: err instanceof Error ? err.message : 'Unknown error'
      });

      // If healing fails, return original response
      return {
        response,
        was_healed: false,
        reason: 'Healing failed'
      };
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const contextFusionSynthesizer = new ContextFusionSynthesizer();

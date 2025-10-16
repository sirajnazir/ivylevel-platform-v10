/**
 * v13.0 Multi-Dimensional Intent Analyzer
 *
 * Purpose: Detect factual, strategic, AND emotional needs simultaneously (not priority-based)
 *
 * Evolution from v12.0:
 * - v12.0: Priority routing (CAT-1 → CAT-2 → CAT-3)
 * - v13.0: Parallel detection (all three dimensions at once)
 *
 * Key Insight: Real student queries often have MULTIPLE needs:
 * - "I'm stressed about Stanford's deadline" = FACTUAL (deadline) + EMOTIONAL (stress)
 * - "What's my GPA? I'm worried it's not good enough" = FACTUAL (GPA) + EMOTIONAL (worry)
 * - "Should I apply to MIT?" = FACTUAL (application status) + STRATEGIC (college fit)
 *
 * Architecture:
 * - Three parallel classifiers (factual, strategic, emotional)
 * - Confidence scoring (0.0-1.0) for each dimension
 * - Execution mode selector (parallel, sequential, hybrid)
 * - Sub-intent detection for routing to specific resolvers
 */

import type { UnifiedContext } from '../context/UnifiedContextHydrator.js';

// ============================================================================
// TYPES
// ============================================================================

export interface MultiDimensionalIntent {
  // Three parallel dimensions
  dimensions: {
    factual: FactualDimension;
    strategic: StrategicDimension;
    emotional: EmotionalDimension;
  };

  // Execution strategy
  execution: {
    mode: 'sequential' | 'parallel' | 'hybrid';
    reasoning: string;
    order?: string[]; // For sequential/hybrid modes
  };

  // Metadata
  analyzed_at: Date;
  analysis_latency_ms: number;
}

export interface FactualDimension {
  confidence: number; // 0.0-1.0
  sub_intents: string[]; // e.g., ["deadline.stanford", "gpa.latest"]
  data_sources: string[]; // SQL views to query
  has_intent: boolean;
}

export interface StrategicDimension {
  confidence: number; // 0.0-1.0
  sub_intents: string[]; // e.g., ["spike.strengthen", "essay.strategy"]
  kb_namespaces: string[]; // Pinecone namespaces to search
  has_intent: boolean;
}

export interface EmotionalDimension {
  confidence: number; // 0.0-1.0
  sub_intents: string[]; // e.g., ["stress.overwhelm", "support.normalization"]
  eq_categories: string[]; // EQ response types
  detected_emotions: string[]; // e.g., ["anxiety", "stress", "overwhelm"]
  sentiment_score: number; // -1.0 (negative) to +1.0 (positive)
  has_intent: boolean;
}

// ============================================================================
// PATTERNS
// ============================================================================

// Factual intent patterns (CAT-1 SQL queries)
const FACTUAL_PATTERNS = {
  // Deadlines
  'deadline': /\b(deadline|due\s+date|when\s+is|submission\s+date|application\s+date)\b/i,
  'deadline.specific': /\b(stanford|mit|harvard|yale|berkeley)\s+(deadline|due|application)/i,

  // GPA
  'gpa.latest': /\b(my\s+gpa|current\s+gpa|what('|')s\s+my\s+gpa|gpa\s+is)\b/i,
  'gpa.trend': /\b(gpa\s+(improving|declining|trend|over\s+time))\b/i,

  // Test scores
  'test.sat': /\b(my\s+sat|sat\s+score)\b/i,
  'test.act': /\b(my\s+act|act\s+score)\b/i,

  // Applications
  'application.status': /\b(submitted|applied|application\s+status|decision)\b/i,
  'application.count': /\b(how\s+many\s+(?:schools|colleges)|number\s+of\s+applications)\b/i,

  // Awards
  'award.list': /\b(my\s+awards?|honors?|achievements?|recognitions?)\b/i,

  // Awards
  'awards': /\b(what\s+awards?|awards?\s+(?:have\s+i\s+)?won|honors?|recognitions?|achievements?)\b/i,

  // ECs
  'ec.list': /\b((?:my\s+)?(?:extracurriculars?|activities|clubs|ecs)|what\s+(?:extracurriculars?|activities))\b/i,

  // Summer programs
  'program.list': /\b(summer\s+programs?|camps?)\b/i,

  // Transcript
  'transcript': /\b((?:my\s+)?transcript|courses?|classes?|what\s+(?:courses?|classes?))\b/i,
};

// Strategic intent patterns (CAT-2 KB retrieval)
const STRATEGIC_PATTERNS = {
  // College fit
  'college.fit': /\b(should\s+i\s+(?:even\s+)?apply|good\s+fit|match\s+for|chances\s+at)\b/i,
  'college.comparison': /\b(stanford\s+(?:vs|or)\s+mit|compare|better\s+for)\b/i,

  // Spike strengthening
  'spike.strengthen': /\b(strengthen\s+(?:my\s+)?(?:spike|profile)|stand\s+out|differentiate)\b/i,
  'spike.identify': /\b(what('|')s\s+my\s+spike|identify\s+spike|theme)\b/i,

  // Essay strategy
  'essay.topic': /\b(essay\s+topic|write\s+about|essay\s+ideas?)\b/i,
  'essay.review': /\b(review\s+(?:my\s+)?essay|feedback\s+on)\b/i,

  // Timeline planning
  'timeline.overall': /\b(timeline|when\s+should\s+i|plan\s+(?:for|out)|schedule)\b/i,
  'timeline.priority': /\b(what\s+should\s+i\s+do\s+(?:first|next)|priority|priorities)\b/i,

  // School list strategy
  'schoollist.build': /\b(build\s+(?:my\s+)?(?:college\s+)?list|which\s+schools?|add\s+schools?)\b/i,
  'schoollist.balance': /\b(reach|target|safety|balanced\s+list)\b/i,
};

// Emotional intent patterns (CAT-3 EQ responses)
const EMOTIONAL_PATTERNS = {
  // Stress/anxiety
  'stress.overwhelm': /\b(stressed|overwhelmed|too\s+much|can('|')t\s+handle)\b/i,
  'stress.deadline': /\b(stressed\s+about|anxious\s+about|worried\s+about)\s+.*(deadline|application|decision)/i,

  // Fear/worry
  'fear.rejection': /\b(afraid|scared|worried)\s+.*(rejected?|not\s+get\s+in|won('|')t\s+(?:get\s+)?in)\b/i,
  'fear.inadequacy': /\b(not\s+good\s+enough|won('|')t\s+make\s+it|too\s+competitive)\b/i,

  // Confidence/doubt
  'doubt.self': /\b(not\s+sure|don('|')t\s+know|uncertain|doubt)\b/i,
  'confidence.low': /\b(low\s+confidence|unconfident|insecure)\b/i,

  // Support seeking
  'support.validation': /\b(is\s+that\s+(?:ok|good|fine|normal)|am\s+i\s+on\s+track)\b/i,
  'support.encouragement': /\b(need\s+(?:help|support)|struggling|difficult|hard)\b/i,

  // Excitement/hope
  'hope.optimistic': /\b(excited|hopeful|looking\s+forward|can('|')t\s+wait)\b/i,
  'hope.dream': /\b(dream\s+school|always\s+wanted|would\s+love)\b/i,
};

// Emotion detection patterns
const EMOTION_KEYWORDS = {
  anxiety: ['anxious', 'anxiety', 'nervous', 'worried', 'fear', 'scared'],
  stress: ['stressed', 'stressful', 'overwhelmed', 'pressure', 'too much'],
  sadness: ['sad', 'disappointed', 'down', 'discouraged', 'upset'],
  frustration: ['frustrated', 'annoying', 'irritated', 'stuck'],
  excitement: ['excited', 'thrilled', 'can\'t wait', 'amazing', 'awesome'],
  hope: ['hopeful', 'optimistic', 'looking forward', 'confident'],
  doubt: ['doubt', 'unsure', 'uncertain', 'don\'t know'],
};

// ============================================================================
// MULTI-DIMENSIONAL INTENT ANALYZER
// ============================================================================

export class MultiDimensionalIntentAnalyzer {
  /**
   * Analyze a query across all three dimensions simultaneously
   *
   * @param query Student query (potentially enriched with reference resolution)
   * @param context Unified context for personalized analysis
   * @returns Multi-dimensional intent with execution strategy
   */
  async analyze(query: string, context: UnifiedContext): Promise<MultiDimensionalIntent> {
    const start = Date.now();

    // Parallel analysis across all three dimensions
    const [factual, strategic, emotional] = await Promise.all([
      this.analyzeFactualDimension(query, context),
      this.analyzeStrategicDimension(query, context),
      this.analyzeEmotionalDimension(query, context)
    ]);

    // Determine execution strategy
    const execution = this.selectExecutionMode(factual, strategic, emotional);

    const analysis_latency_ms = Date.now() - start;

    return {
      dimensions: {
        factual,
        strategic,
        emotional
      },
      execution,
      analyzed_at: new Date(),
      analysis_latency_ms
    };
  }

  // ============================================================================
  // DIMENSION ANALYZERS
  // ============================================================================

  private async analyzeFactualDimension(
    query: string,
    context: UnifiedContext
  ): Promise<FactualDimension> {
    const sub_intents: string[] = [];
    const data_sources: string[] = [];

    // Check each factual pattern
    for (const [intent_name, pattern] of Object.entries(FACTUAL_PATTERNS)) {
      if (pattern.test(query)) {
        sub_intents.push(intent_name);

        // Map intent to data source
        if (intent_name.startsWith('deadline')) {
          data_sources.push('v_college_deadlines');
        } else if (intent_name.startsWith('gpa')) {
          data_sources.push('v_academics_gpa_latest', 'v_academics_gpa_progression');
        } else if (intent_name.startsWith('test')) {
          data_sources.push('v_test_scores');
        } else if (intent_name.startsWith('application')) {
          data_sources.push('outcomes');
        } else if (intent_name.startsWith('award')) {
          data_sources.push('kb_awards');
        } else if (intent_name.startsWith('ec')) {
          data_sources.push('kb_ecs');
        } else if (intent_name.startsWith('program')) {
          data_sources.push('kb_summer_programs');
        }
      }
    }

    // Calculate confidence based on number of matches and specificity
    let confidence = 0;
    if (sub_intents.length > 0) {
      // Base confidence: 0.6
      confidence = 0.6;

      // Boost for specific intents (e.g., "deadline.specific" vs just "deadline")
      const has_specific = sub_intents.some(si => si.includes('.'));
      if (has_specific) {
        confidence += 0.2;
      }

      // Boost for multiple factual needs
      if (sub_intents.length > 1) {
        confidence += 0.1;
      }

      // Cap at 1.0
      confidence = Math.min(confidence, 1.0);
    }

    return {
      confidence,
      sub_intents: [...new Set(sub_intents)],
      data_sources: [...new Set(data_sources)],
      has_intent: sub_intents.length > 0
    };
  }

  private async analyzeStrategicDimension(
    query: string,
    context: UnifiedContext
  ): Promise<StrategicDimension> {
    const sub_intents: string[] = [];
    const kb_namespaces: string[] = [];

    // Check each strategic pattern
    for (const [intent_name, pattern] of Object.entries(STRATEGIC_PATTERNS)) {
      if (pattern.test(query)) {
        sub_intents.push(intent_name);

        // Map intent to KB namespace
        if (intent_name.startsWith('college')) {
          kb_namespaces.push('KBv6_Session', 'KBv6_Assessment');
        } else if (intent_name.startsWith('spike')) {
          kb_namespaces.push('KBv6_Session', 'KBv6_Assessment');
        } else if (intent_name.startsWith('essay')) {
          kb_namespaces.push('KBv6_Session');
        } else if (intent_name.startsWith('timeline')) {
          kb_namespaces.push('KBv6_Session');
        } else if (intent_name.startsWith('schoollist')) {
          kb_namespaces.push('KBv6_Session', 'KBv6_Assessment');
        }
      }
    }

    // Calculate confidence
    let confidence = 0;
    if (sub_intents.length > 0) {
      // Base confidence: 0.5 (strategic is inherently more ambiguous than factual)
      confidence = 0.5;

      // Boost for question words (should, how, why, what)
      if (/\b(should|how|why|what)\b/i.test(query)) {
        confidence += 0.2;
      }

      // Boost for multiple strategic needs
      if (sub_intents.length > 1) {
        confidence += 0.1;
      }

      confidence = Math.min(confidence, 1.0);
    }

    return {
      confidence,
      sub_intents: [...new Set(sub_intents)],
      kb_namespaces: [...new Set(kb_namespaces)],
      has_intent: sub_intents.length > 0
    };
  }

  private async analyzeEmotionalDimension(
    query: string,
    context: UnifiedContext
  ): Promise<EmotionalDimension> {
    const sub_intents: string[] = [];
    const eq_categories: string[] = [];
    const detected_emotions: string[] = [];

    // Check each emotional pattern
    for (const [intent_name, pattern] of Object.entries(EMOTIONAL_PATTERNS)) {
      if (pattern.test(query)) {
        sub_intents.push(intent_name);

        // Map intent to EQ category
        if (intent_name.startsWith('stress')) {
          eq_categories.push('stress_management', 'time_planning');
        } else if (intent_name.startsWith('fear')) {
          eq_categories.push('confidence_building', 'perspective_reframing');
        } else if (intent_name.startsWith('doubt')) {
          eq_categories.push('confidence_building', 'validation');
        } else if (intent_name.startsWith('support')) {
          eq_categories.push('validation', 'normalization');
        } else if (intent_name.startsWith('hope')) {
          eq_categories.push('encouragement', 'celebration');
        }
      }
    }

    // Detect emotions
    for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
      for (const keyword of keywords) {
        if (new RegExp(`\\b${keyword}\\b`, 'i').test(query)) {
          detected_emotions.push(emotion);
          break;
        }
      }
    }

    // Calculate sentiment score
    const sentiment_score = this.calculateSentimentScore(detected_emotions);

    // Calculate confidence
    let confidence = 0;
    if (sub_intents.length > 0 || detected_emotions.length > 0) {
      // Base confidence from pattern matches
      confidence = sub_intents.length > 0 ? 0.6 : 0.0;

      // Boost from emotion keywords
      confidence += detected_emotions.length * 0.15;

      // Boost for first-person language (I'm, I feel, I think)
      if (/\b(i('|')m|i\s+feel|i\s+think|i\s+am)\b/i.test(query)) {
        confidence += 0.2;
      }

      // Boost for exclamation marks or question marks (emotional intensity)
      if (/[!?]{2,}/.test(query)) {
        confidence += 0.1;
      }

      confidence = Math.min(confidence, 1.0);
    }

    return {
      confidence,
      sub_intents: [...new Set(sub_intents)],
      eq_categories: [...new Set(eq_categories)],
      detected_emotions: [...new Set(detected_emotions)],
      sentiment_score,
      has_intent: sub_intents.length > 0 || detected_emotions.length > 0
    };
  }

  // ============================================================================
  // EXECUTION MODE SELECTOR
  // ============================================================================

  private selectExecutionMode(
    factual: FactualDimension,
    strategic: StrategicDimension,
    emotional: EmotionalDimension
  ): MultiDimensionalIntent['execution'] {
    const active_dimensions = [
      factual.has_intent && factual.confidence >= 0.5,
      strategic.has_intent && strategic.confidence >= 0.5,
      emotional.has_intent && emotional.confidence >= 0.5
    ].filter(Boolean).length;

    // Case 1: Single dimension (sequential)
    if (active_dimensions === 1) {
      if (factual.has_intent) {
        return {
          mode: 'sequential',
          reasoning: 'Pure factual query - CAT-1 only',
          order: ['factual']
        };
      } else if (strategic.has_intent) {
        return {
          mode: 'sequential',
          reasoning: 'Pure strategic query - CAT-2 only',
          order: ['strategic']
        };
      } else {
        return {
          mode: 'sequential',
          reasoning: 'Pure emotional query - CAT-3 only',
          order: ['emotional']
        };
      }
    }

    // Case 2: Factual + Emotional (hybrid: factual first, then wrap with EQ)
    if (factual.has_intent && emotional.has_intent && !strategic.has_intent) {
      return {
        mode: 'hybrid',
        reasoning: 'Factual query with emotional context - Get facts, then add EQ warmth',
        order: ['factual', 'emotional']
      };
    }

    // Case 3: Strategic + Emotional (hybrid: strategic first, then wrap with EQ)
    if (strategic.has_intent && emotional.has_intent && !factual.has_intent) {
      return {
        mode: 'hybrid',
        reasoning: 'Strategic query with emotional context - Get strategy, then add EQ support',
        order: ['strategic', 'emotional']
      };
    }

    // Case 4: All three dimensions (parallel execution)
    if (factual.has_intent && strategic.has_intent && emotional.has_intent) {
      return {
        mode: 'parallel',
        reasoning: 'Multi-dimensional query - Execute all three CATs in parallel',
        order: ['factual', 'strategic', 'emotional']
      };
    }

    // Case 5: Factual + Strategic (parallel)
    if (factual.has_intent && strategic.has_intent) {
      return {
        mode: 'parallel',
        reasoning: 'Factual + Strategic query - Parallel execution',
        order: ['factual', 'strategic']
      };
    }

    // Default: parallel if any two dimensions active
    return {
      mode: 'parallel',
      reasoning: 'Multiple dimensions detected - Parallel execution',
      order: ['factual', 'strategic', 'emotional'].filter((_, i) =>
        [factual.has_intent, strategic.has_intent, emotional.has_intent][i]
      )
    };
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private calculateSentimentScore(emotions: string[]): number {
    // Sentiment mapping
    const positive_emotions = ['excitement', 'hope'];
    const negative_emotions = ['anxiety', 'stress', 'sadness', 'frustration', 'doubt'];

    const positive_count = emotions.filter(e => positive_emotions.includes(e)).length;
    const negative_count = emotions.filter(e => negative_emotions.includes(e)).length;

    if (positive_count === 0 && negative_count === 0) {
      return 0; // Neutral
    }

    // Calculate score: -1.0 (all negative) to +1.0 (all positive)
    const total = positive_count + negative_count;
    const score = (positive_count - negative_count) / total;

    return score;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const multiDimensionalIntentAnalyzer = new MultiDimensionalIntentAnalyzer();

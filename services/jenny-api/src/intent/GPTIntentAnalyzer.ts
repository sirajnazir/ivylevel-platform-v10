/**
 * v13.0 GPT-4o-mini Multi-Dimensional Intent Analyzer
 *
 * ARCHITECTURE PRINCIPLE: Use proven GPT-4o-mini structured JSON from v12.0,
 * NOT regex patterns. This ensures accurate multi-dimensional intent detection.
 *
 * Based on: /services/jenny-api/src/router/intentRouter.ts:683-722
 * Proven in production v12.0 with 48 few-shot examples
 */

import OpenAI from 'openai';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';
import type { UnifiedContext } from '../context/UnifiedContextHydrator.js';

const log = createLogger('gpt-intent-analyzer');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ============================================================================
// TYPES (v13.0 Multi-Dimensional)
// ============================================================================

export interface MultiDimensionalIntent {
  // Three parallel dimensions
  dimensions: {
    factual: {
      sub_intents: string[];  // e.g., ["gpa.latest", "sat.latest", "awards", "ecs"]
      confidence: number;
      has_intent: boolean;
      data_sources: string[];  // Deprecated, kept for compatibility
    };
    strategic: {
      sub_intents: string[];  // e.g., ["spike.strengthen", "essay.strategy"]
      confidence: number;
      has_intent: boolean;
      kb_namespaces: string[];  // Pinecone namespaces
    };
    emotional: {
      sub_intents: string[];      // e.g., ["stress.overwhelm", "support.normalization"]
      detected_emotions: string[]; // e.g., ["anxiety", "stress", "overwhelm"]
      sentiment_score: number;     // -1.0 (negative) to +1.0 (positive)
      confidence: number;
      has_intent: boolean;
      eq_categories: string[];  // EQ response categories
    };
  };

  // Execution strategy (simplified for v13.0)
  execution: {
    mode: 'sequential' | 'parallel' | 'hybrid';
    reasoning: string;
    order?: string[];
  };

  // Metadata
  analyzed_at: Date;
  analysis_latency_ms: number;
}

// ============================================================================
// GPT-4o-mini MULTI-DIMENSIONAL INTENT CLASSIFIER
// ============================================================================

/**
 * Classify query into factual, strategic, and emotional dimensions using GPT-4o-mini
 *
 * @param query - User's natural language query
 * @param context - Unified context (student_id, session_id, etc.)
 * @returns Multi-dimensional intent analysis
 */
export async function analyzeMultiDimensionalIntent(
  query: string,
  context: UnifiedContext
): Promise<MultiDimensionalIntent> {
  const start = Date.now();

  try {
    // Use GPT-4o-mini with structured JSON output (proven in v12.0)
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: MULTI_DIMENSIONAL_SYSTEM_PROMPT
        },
        {
          role: "user",
          content: `Analyze this query and return JSON with factual, strategic, and emotional dimensions:

QUERY: ${query}

Return format:
{
  "factual": {
    "sub_intents": ["gpa.latest", "sat.latest", ...],
    "confidence": 0.0-1.0
  },
  "strategic": {
    "sub_intents": ["spike.strengthen", ...],
    "confidence": 0.0-1.0
  },
  "emotional": {
    "sub_intents": ["stress.overwhelm", ...],
    "detected_emotions": ["anxiety", "stress"],
    "sentiment_score": -1.0 to +1.0,
    "confidence": 0.0-1.0
  }
}`
        }
      ]
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);

    log.event('gpt_intent.analysis_complete', {
      query: query.substring(0, 80),
      factual_count: parsed.factual?.sub_intents?.length || 0,
      strategic_count: parsed.strategic?.sub_intents?.length || 0,
      emotional_count: parsed.emotional?.sub_intents?.length || 0,
      latency_ms: Date.now() - start
    });

    // Determine execution mode
    const hasFactual = (parsed.factual?.sub_intents?.length || 0) > 0;
    const hasStrategic = (parsed.strategic?.sub_intents?.length || 0) > 0;
    const hasEmotional = (parsed.emotional?.sub_intents?.length || 0) > 0;

    let mode: 'sequential' | 'parallel' | 'hybrid' = 'parallel';
    let reasoning = 'Default parallel execution';
    let order: string[] | undefined = undefined;

    // Execution strategy: Emotional takes priority
    if (hasEmotional && (hasFactual || hasStrategic)) {
      mode = 'hybrid';
      reasoning = 'Emotional query with factual/strategic needs';
      order = ['emotional', 'factual', 'strategic'].filter(dim =>
        (dim === 'emotional' && hasEmotional) ||
        (dim === 'factual' && hasFactual) ||
        (dim === 'strategic' && hasStrategic)
      );
    } else if (hasFactual && hasStrategic) {
      mode = 'parallel';
      reasoning = 'Both factual and strategic needs';
    }

    return {
      dimensions: {
        factual: {
          sub_intents: parsed.factual?.sub_intents || [],
          confidence: parsed.factual?.confidence || 0,
          has_intent: hasFactual,
          data_sources: []  // Deprecated - resolver mapper handles this
        },
        strategic: {
          sub_intents: parsed.strategic?.sub_intents || [],
          confidence: parsed.strategic?.confidence || 0,
          has_intent: hasStrategic,
          kb_namespaces: hasStrategic ? ['KBv6_Session'] : []
        },
        emotional: {
          sub_intents: parsed.emotional?.sub_intents || [],
          detected_emotions: parsed.emotional?.detected_emotions || [],
          sentiment_score: parsed.emotional?.sentiment_score || 0,
          confidence: parsed.emotional?.confidence || 0,
          has_intent: hasEmotional,
          eq_categories: hasEmotional ? ['support', 'normalization'] : []
        }
      },
      execution: {
        mode,
        reasoning,
        order
      },
      analyzed_at: new Date(),
      analysis_latency_ms: Date.now() - start
    };

  } catch (error) {
    log.error('gpt_intent.analysis_failed', { error, query: query.substring(0, 80) });

    // Fallback: empty intents
    return {
      dimensions: {
        factual: { sub_intents: [], confidence: 0, has_intent: false, data_sources: [] },
        strategic: { sub_intents: [], confidence: 0, has_intent: false, kb_namespaces: [] },
        emotional: { sub_intents: [], detected_emotions: [], sentiment_score: 0, confidence: 0, has_intent: false, eq_categories: [] }
      },
      execution: {
        mode: 'parallel',
        reasoning: 'Error fallback'
      },
      analyzed_at: new Date(),
      analysis_latency_ms: Date.now() - start
    };
  }
}

// ============================================================================
// SYSTEM PROMPT (Multi-Dimensional Intent Classification)
// ============================================================================

const MULTI_DIMENSIONAL_SYSTEM_PROMPT = `You are a multi-dimensional intent analyzer for a college admissions AI coach.

Your job: Analyze student queries and identify THREE dimensions simultaneously:
1. FACTUAL (CAT-1): SQL-based data queries (GPA, SAT, awards, ECs, colleges, transcript)
2. STRATEGIC (CAT-2): Coaching/advice queries (college fit, spike, essay topics, planning)
3. EMOTIONAL (CAT-3): Emotional support needs (stress, anxiety, encouragement, celebration)

KEY INSIGHT: Queries often have MULTIPLE dimensions at once:
- "What's my GPA? I'm worried it's not good enough" = FACTUAL + EMOTIONAL
- "Should I apply to MIT?" = FACTUAL (application status) + STRATEGIC (college fit)
- "I got rejected from Stanford" = EMOTIONAL (grief) + FACTUAL (outcome)

Return JSON with ALL detected dimensions:

{
  "factual": {
    "sub_intents": ["gpa.latest", "sat.latest", "awards", "ecs", "programs", "transcript", "college.list"],
    "confidence": 0.0-1.0
  },
  "strategic": {
    "sub_intents": ["spike.strengthen", "essay.strategy", "college.fit", "timeline.planning", "schoollist.balance"],
    "confidence": 0.0-1.0
  },
  "emotional": {
    "sub_intents": ["stress.overwhelm", "fear.rejection", "doubt.self", "hope.encouragement", "celebration.acceptance"],
    "detected_emotions": ["anxiety", "stress", "excitement", "doubt", "hope"],
    "sentiment_score": -1.0 to +1.0,
    "confidence": 0.0-1.0
  }
}

## FACTUAL SUB-INTENTS (CAT-1):

ACADEMICS:
- "gpa.latest" - current/latest GPA
- "gpa.trend" - GPA over time
- "transcript" - course grades
- "sat.latest" - latest SAT score
- "sat.first" - first SAT score
- "sat.progression" - all SAT scores

ACHIEVEMENTS:
- "awards" - awards won
- "ecs" - extracurricular activities
- "programs" - summer programs attended

COLLEGES:
- "college.list" - colleges applied to
- "college.attending" - where attending
- "college.accepted" - acceptances
- "college.deadlines" - application deadlines

PROFILE:
- "profile.summary" - entire academic profile
- "vitals" - overall student summary

JOURNEY/TIMELINE (Personal Progress):
- "journey.timeline" - student's personal application journey with milestones
- "jtbd.completed" - completed tasks/milestones
- "jtbd.milestones" - EC/application milestones achieved
- "jtbd.progression" - week-over-week progress

NOTE: These are PERSONAL journey queries (student's OWN progress/milestones).
EXTERNAL process queries ("how does college application process work?", "when does Common App open?")
should be routed to strategic dimension or require external knowledge extension (v14.0+).

## STRATEGIC SUB-INTENTS (CAT-2):

PLANNING:
- "spike.strengthen" - how to strengthen spike
- "essay.strategy" - essay topic/approach
- "timeline.planning" - what to prioritize
- "schoollist.balance" - reach/target/safety balance

COLLEGE FIT:
- "college.fit" - should I apply to X college?
- "college.comparison" - compare colleges
- "application.timing" - ED vs EA vs RD

PROFILE BUILDING:
- "ec.differentiation" - make ECs stand out
- "chances.assessment" - realistic chances

## EMOTIONAL SUB-INTENTS (CAT-3):

STRESS/ANXIETY:
- "stress.overwhelm" - feeling overwhelmed
- "anxiety.general" - general anxiety
- "fear.rejection" - fear of not getting in

SUPPORT:
- "support.normalization" - need validation
- "support.practical" - need actionable steps
- "encouragement" - need confidence boost

CELEBRATION:
- "celebration.acceptance" - got accepted!
- "celebration.achievement" - achieved goal

## EXAMPLES:

Query: "What's my GPA?"
Output: {
  "factual": {"sub_intents": ["gpa.latest"], "confidence": 0.95},
  "strategic": {"sub_intents": [], "confidence": 0.0},
  "emotional": {"sub_intents": [], "detected_emotions": [], "sentiment_score": 0.0, "confidence": 0.0}
}

Query: "What's my GPA? I'm worried it's not good enough for MIT"
Output: {
  "factual": {"sub_intents": ["gpa.latest"], "confidence": 0.95},
  "strategic": {"sub_intents": ["chances.assessment"], "confidence": 0.7},
  "emotional": {"sub_intents": ["anxiety.general", "doubt.self"], "detected_emotions": ["worry", "anxiety"], "sentiment_score": -0.6, "confidence": 0.9}
}

Query: "Help me understand my entire profile - academics, activities, fit for MIT - and reassure me I'm on the right track"
Output: {
  "factual": {"sub_intents": ["gpa.latest", "sat.latest", "awards", "ecs", "transcript", "profile.summary"], "confidence": 0.95},
  "strategic": {"sub_intents": ["college.fit", "chances.assessment"], "confidence": 0.9},
  "emotional": {"sub_intents": ["support.normalization", "encouragement"], "detected_emotions": ["doubt", "hope"], "sentiment_score": -0.3, "confidence": 0.8}
}

Query: "I just got rejected from Stanford and I'm devastated"
Output: {
  "factual": {"sub_intents": ["college.list"], "confidence": 0.4},
  "strategic": {"sub_intents": [], "confidence": 0.0},
  "emotional": {"sub_intents": ["grief.rejection", "support.normalization"], "detected_emotions": ["sadness", "devastation"], "sentiment_score": -0.9, "confidence": 0.98}
}

Query: "Should I apply to Stanford?"
Output: {
  "factual": {"sub_intents": ["college.list"], "confidence": 0.6},
  "strategic": {"sub_intents": ["college.fit", "chances.assessment"], "confidence": 0.95},
  "emotional": {"sub_intents": [], "detected_emotions": [], "sentiment_score": 0.0, "confidence": 0.0}
}

Query: "Walk me through my entire college application journey"
Output: {
  "factual": {"sub_intents": ["journey.timeline", "jtbd.milestones", "jtbd.completed"], "confidence": 0.95},
  "strategic": {"sub_intents": [], "confidence": 0.0},
  "emotional": {"sub_intents": [], "detected_emotions": [], "sentiment_score": 0.0, "confidence": 0.0}
}
NOTE: This is asking for PERSONAL journey (student's own milestones/progress), so use JTBD data.

Query: "What's my application timeline?"
Output: {
  "factual": {"sub_intents": ["journey.timeline", "jtbd.progression"], "confidence": 0.90},
  "strategic": {"sub_intents": [], "confidence": 0.0},
  "emotional": {"sub_intents": [], "detected_emotions": [], "sentiment_score": 0.0, "confidence": 0.0}
}
NOTE: "My timeline" = personal progress (JTBD). "The timeline" = external process (future extension).

Query: "Show me my milestones over time"
Output: {
  "factual": {"sub_intents": ["jtbd.milestones", "jtbd.progression"], "confidence": 0.92},
  "strategic": {"sub_intents": [], "confidence": 0.0},
  "emotional": {"sub_intents": [], "detected_emotions": [], "sentiment_score": 0.0, "confidence": 0.0}
}

Query: "How does the college application process work?"
Output: {
  "factual": {"sub_intents": [], "confidence": 0.0},
  "strategic": {"sub_intents": ["timeline.planning"], "confidence": 0.7},
  "emotional": {"sub_intents": [], "detected_emotions": [], "sentiment_score": 0.0, "confidence": 0.0}
}
NOTE: This is EXTERNAL process knowledge (not personal journey). Will require external knowledge extension (v14.0+).

RULES:
1. ALWAYS check all three dimensions - don't skip any
2. For "entire profile" queries, include ALL relevant factual sub-intents
3. Confidence scoring:
   - 0.9-1.0: Explicit, clear intent
   - 0.7-0.89: Strong implicit intent
   - 0.5-0.69: Weak/ambiguous intent
   - 0.0-0.49: No clear intent
4. Return empty arrays if no intent detected in a dimension
5. Sentiment: -1.0 (very negative) to +1.0 (very positive), 0.0 (neutral)

Output ONLY valid JSON. No explanations.`;

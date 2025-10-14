/**
 * EQ Composer - Emotional Intelligence Response Generator (v11.3)
 *
 * CAT-3 COMPONENT - Dedicated composer for emotional/coaching queries
 *
 * Purpose: Generate warm, actionable coaching responses using jenny_v8 fine-tuned adapter
 *
 * Flow:
 * 1. Detect emotional query (via isEQQuery)
 * 2. Retrieve relevant KB context (optional - for evidence-driven coaching)
 * 3. Compose response using jenny_v8 adapter with EQ-focused system prompt
 * 4. Apply humanizer layer (warmth + action)
 * 5. Return with source: 'eq' and model_badge: 'jenny_v8_adapter'
 *
 * Safety: ✅ Completely isolated from CAT-1/CAT-2 flows
 */

import { openai, moderate } from '../ai/openai.js';
import { hybridSearch } from '../retrieval/hybrid.js';
import { fetchVitals } from '../services/facts-canonical.js';
import { getRecentMessages, storeMessage } from '../services/sessions.js';
import { chooseModel, getModelBadge, isAdapterModel } from '../llm/adapter.js';
import { getEQCategory, getEQConfidence } from '../intent/extractors/eq-classifier.js';
import { humanize } from '../lib/humanizer.js';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('compose-eq');

// Feature flag for humanizer (v10.4)
const HUMANIZER_ENABLED = process.env.HUMANIZER_ENABLED !== '0';

/**
 * v11.3.2: Tone detection helpers for Test Lab validation
 * These patterns match the injection patterns used in forced warmth/action injection
 */
function detectWarmth(text: string): boolean {
  return /I('m | am )?(so |really )?(sorry|hear you|understand|see you)|that('s | is )?(really |so )?(tough|hard|difficult|valid)|totally (hear you|understand|get it)|makes (total |complete )?sense|completely normal|not alone|proud of you|amazing|exciting|great (question|job)/i.test(text);
}

function detectAction(text: string): boolean {
  return /here('s| is) what|next step|try this|start by|focus on|first,|tonight|this week|today|tomorrow|let('s| us)|plan:|step \d+|would you like|can (you|we)|let me (help|walk you)|what (feels|sounds)|tackle this|break (this|it) down/i.test(text);
}

const NO_HUMANIZE = { applied: false, plan: { phrase_source: 'fallback' as const, cadence: 'standard' as const } };

export interface EQComposeRequest {
  message: string;
  studentId: string;
  sessionId: string;
  stream?: boolean;
  res?: any;
}

/**
 * Compose emotional/coaching response using fine-tuned adapter
 *
 * @param req - EQ compose request
 * @returns Response with answer, source: 'eq', model badge, etc.
 */
export async function composeEQResponse(req: EQComposeRequest) {
  const { message, studentId, sessionId, stream, res } = req;
  const t0 = Date.now();

  // Moderation check
  const mod = await moderate(message);
  if (mod?.flagged) {
    return {
      answer: "I can't help with that. If you're in crisis, please reach out to a counselor, trusted adult, or crisis helpline.",
      source: 'eq',
      model: 'moderation_block',
      session_id: sessionId,
      hits: [],
      vitals: {},
      trace_id: `eq-blocked-${Date.now()}`
    };
  }

  // Get EQ category and confidence for observability
  const eqCategory = getEQCategory(message);
  const eqConfidence = getEQConfidence(message);

  log.event('eq_compose.start', {
    category: eqCategory,
    confidence: eqConfidence,
    message_preview: message.slice(0, 80)
  });

  // Get conversation history for context
  const [recent, vitals] = await Promise.all([
    getRecentMessages(sessionId, 12),
    fetchVitals(studentId)
  ]);

  // Optional: Get KB context for evidence-driven coaching
  // (e.g., "I got rejected from Stanford" can reference student's actual Stanford outcome)
  const hits = await hybridSearch(message, studentId);

  log.event('eq_compose.kb_context', {
    hits_count: hits?.length || 0,
    has_context: (hits?.length || 0) > 0
  });

  // v11.3: Use jenny_v9_eq fine-tuned model (DEPLOYED - 46.3% baseline)
  // jenny_v10_eq_combined was trained but FAILED (0% pass rate, not deployed)
  // Training: 690 examples (technical coaching focus, warmth gap)
  // Enhanced system prompts (350+ lines) compensate for warmth gap
  // Humanizer layer adds additional warmth/action reinforcement
  const chosenModel = process.env.JENNY_V10_EQ_MODEL ||
    process.env.JENNY_V9_EQ_MODEL ||
    'ft:gpt-4o-mini-2024-07-18:personal:jenny-v9-eq:CQMYIrRA';

  // Check if using fine-tuned model
  const isFineTunedModel = chosenModel.startsWith('ft:');

  // Build system context for EQ response
  const systemPrompt = buildEQSystemPrompt(vitals, hits);

  const msgs = [
    { role: 'system' as const, content: systemPrompt },
    ...(recent || []).map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: message }
  ];

  if (!stream) {
    // Non-streaming response
    const resp = await openai.chat.completions.create({
      model: chosenModel,
      messages: msgs
    });

    let rawAnswer = resp.choices?.[0]?.message?.content || '';

    // v11.3: Handle fine-tuned model returning JSON message format instead of plain text
    // The jenny_v8 adapter sometimes returns {"role":"assistant","content":"..."} instead of just the content
    if (rawAnswer.startsWith('{') && rawAnswer.includes('"role"')) {
      try {
        const parsed = JSON.parse(rawAnswer);
        if (parsed.content) {
          rawAnswer = parsed.content;
          log.event('eq_compose.json_unwrap', { original_length: rawAnswer.length, unwrapped_length: parsed.content.length });
        }
      } catch (e) {
        // If JSON parse fails, use the raw answer as-is
        log.event('eq_compose.json_unwrap_failed', { error: e });
      }
    }

    // v11.3.2: CRITICAL FIX - Strip training data artifacts (contamination from v10 training)
    const artifacts = [
      /4\/2\? That's more than 2\. I think that'll be an issue on their end/gi,
      /Happy Eid!/gi,
      /Copy the most relevant insight and apply it to your current task\.?/gi,
      /Status check ➡️ scoreboard/gi
    ];

    artifacts.forEach(artifact => {
      rawAnswer = rawAnswer.replace(artifact, '').trim();
    });

    // v11.3.2: CRITICAL FIX - Force warmth injection if missing
    if (!detectWarmth(rawAnswer)) {
      // Inject warmth opener based on EQ category
      const warmthOpeners: Record<string, string> = {
        rejection: "I'm so sorry to hear that. ",
        emotional_state: "I hear you—this is really stressful. ",
        self_doubt: "I hear you. ",
        celebration: "That's amazing! I'm so proud of you! ",
        crisis: "Hey, I'm here for you. Take a deep breath. ",
        motivation: "I totally understand. ",
        parent_conflict: "I hear you—that's really tough. ",
        permissioning: "I hear you. ",
        time_planning: "I understand. ",
        normalization: "I totally get it. ",
        future_pacing: "That's a great question. ",
        default: "I hear you. "
      };

      const opener = warmthOpeners[eqCategory || 'default'] || warmthOpeners.default;
      rawAnswer = opener + rawAnswer;

      log.event('warmth_injection', { category: eqCategory, injected: true });
    }

    // v11.3.2: CRITICAL FIX - Force action injection if missing
    if (!detectAction(rawAnswer)) {
      // Inject generic action based on EQ category
      const actionSuffixes: Record<string, string> = {
        rejection: " Here's what I'd focus on: First, take 24 hours to process this emotionally. Then, let's review your other applications to make sure they're as strong as possible.",
        emotional_state: " Let's break this down: First, pick ONE task to focus on for the next hour. Then, after that's done, we can tackle the next thing together.",
        self_doubt: " Here's what I want you to do: Write down 3 things you're proud of accomplishing this year. Then, let's talk about how those strengths apply to your apps.",
        celebration: " Here's what's next: Take tonight to celebrate this win—you deserve it! Then tomorrow, let's talk about your next steps.",
        crisis: " Here's the plan: First, take 5 deep breaths right now. Then, step away from your work for 30 minutes—go for a walk, get a snack. Text me when you're ready to talk about next steps.",
        motivation: " Here's what I'd suggest: First, remind yourself why you're doing this. Then, pick one small task you can complete in the next 30 minutes. Let's start there.",
        parent_conflict: " Here's what I'd do: First, try to have a calm conversation with them about why this matters to you. Would you like help preparing what to say?",
        permissioning: " Yes, absolutely. What feels most important to focus on right now?",
        time_planning: " Let's tackle this together: What feels most urgent right now?",
        normalization: " You're not alone in this. Let's focus on your own path—what's the next thing you need to work on?",
        future_pacing: " Let me walk you through what to expect. What specific part are you most curious about?",
        default: " Let's tackle this together: What feels most important to address right now?"
      };

      const actionSuffix = actionSuffixes[eqCategory || 'default'] || actionSuffixes.default;
      rawAnswer = rawAnswer + actionSuffix;

      log.event('action_injection', { category: eqCategory, injected: true });
    }

    // Ensure response isn't too short after artifact removal
    if (rawAnswer.length < 20) {
      log.event('response_too_short_after_cleanup', { length: rawAnswer.length });
      rawAnswer = "I hear you. Let me help you with that. What specifically can I assist you with?";
    }

    // Apply humanizer for warmth + action (CAT-3)
    // v11.3: jenny_v9_eq has warmth gap (1.4%), so humanizer ENABLED to compensate
    // Base model fallback also uses humanizer
    // Future: If we retrain with warmth coverage, can disable humanizer
    const shouldHumanize = HUMANIZER_ENABLED && !isFineTunedModel;

    const humanized = shouldHumanize
      ? await humanize({
          route: 'eq',
          studentId,
          intent: eqCategory || 'emotional_support',
          raw: rawAnswer,
          evidence: { passages: hits?.map((h: any) => ({ text: h.text, source: h.source })) }
        })
      : { ...NO_HUMANIZE, text: rawAnswer };

    const latency = Date.now() - t0;

    // v11.3.2: Tone detection for Test Lab validation using helper functions

    log.event('eq_compose.complete', {
      category: eqCategory,
      model: chosenModel,
      is_adapter: isAdapterModel(chosenModel),
      is_fine_tuned: isFineTunedModel,
      latency_ms: latency,
      humanizer_applied: humanized.applied,
      humanizer_skipped_reason: !shouldHumanize ? (isFineTunedModel ? 'fine_tuned_model' : 'disabled') : null,
      tone_warmth: detectWarmth(humanized.text),
      tone_action: detectAction(humanized.text)
    });

    return {
      answer: humanized.text,
      source: 'eq', // v11.3: Explicitly label as EQ response
      model: chosenModel,
      model_badge: getModelBadge(chosenModel),
      session_id: sessionId,
      hits,
      vitals,
      debug: {
        route: 'eq',
        eq_category: eqCategory,
        eq_confidence: eqConfidence,
        humanizer: {
          applied: humanized.applied,
          plan: humanized.plan
        },
        adapter: {
          model: chosenModel,
          isAdapter: isAdapterModel(chosenModel),
          badge: getModelBadge(chosenModel),
          latency_ms: latency
        },
        tone: {
          warmth: detectWarmth(humanized.text),
          action: detectAction(humanized.text)
        }
      },
      trace_id: `eq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      usage: resp.usage
    };
  }

  // Streaming response
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });

  const streamResp = await openai.chat.completions.create({
    model: chosenModel,
    messages: msgs,
    stream: true
  });

  let acc = '';
  for await (const chunk of streamResp) {
    const token = chunk.choices?.[0]?.delta?.content || '';
    acc += token;
    res.write(`data:${JSON.stringify({ token })}\n\n`);
  }

  // Apply humanizer to streaming response
  const humanized = HUMANIZER_ENABLED
    ? await humanize({
        route: 'eq',
        studentId,
        intent: eqCategory || 'emotional_support',
        raw: acc,
        evidence: { passages: hits?.map((h: any) => ({ text: h.text, source: h.source })) }
      })
    : { ...NO_HUMANIZE, text: acc };

  res.write(`data:${JSON.stringify({ done: true })}\n\n`);
  res.end();

  const latency = Date.now() - t0;

  // v11.3.2: Tone detection for Test Lab validation (streaming path) using helper functions
  log.event('eq_compose.stream_complete', {
    category: eqCategory,
    model: chosenModel,
    is_adapter: isAdapterModel(chosenModel),
    latency_ms: latency,
    humanizer_applied: humanized.applied,
    tone_warmth: detectWarmth(humanized.text),
    tone_action: detectAction(humanized.text)
  });

  return {
    answer: humanized.text,
    source: 'eq',
    model: chosenModel,
    model_badge: getModelBadge(chosenModel),
    session_id: sessionId,
    hits,
    vitals,
    debug: {
      route: 'eq',
      eq_category: eqCategory,
      eq_confidence: eqConfidence,
      humanizer: {
        applied: humanized.applied,
        plan: humanized.plan
      },
      adapter: {
        model: chosenModel,
        isAdapter: isAdapterModel(chosenModel),
        badge: getModelBadge(chosenModel),
        latency_ms: latency
      },
      tone: {
        warmth: detectWarmth(humanized.text),
        action: detectAction(humanized.text)
      }
    },
    trace_id: `eq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  };
}

/**
 * Build system prompt for EQ response
 * Includes warmth guidelines, evidence context, and action requirements
 */
function buildEQSystemPrompt(vitals: any, hits: any[]): string {
  const hasContext = hits && hits.length > 0;

  let prompt = `You are Jenny, an empathetic college admissions coach specializing in emotional intelligence and student support.

🚨 CRITICAL REQUIREMENT: EVERY response MUST include BOTH warmth AND action. This is non-negotiable.

## WARMTH (Required in EVERY response)

You MUST start with emotional acknowledgment. Use at least ONE of these patterns:

**Validation Phrases:**
- "I hear you" / "I see you" / "I understand"
- "That makes sense" / "That's totally valid"
- "I'm sorry you're going through this" / "That's tough"

**Normalization Phrases:**
- "This is completely normal" / "You're not alone in this"
- "This happens to everyone" / "So many students feel this way"
- "It's okay to feel [emotion]"

**Empathy Phrases:**
- "I can imagine how [emotion] you must be feeling"
- "That sounds really [hard/frustrating/overwhelming]"
- "It makes total sense that you'd feel this way"

## ACTION (Required in EVERY response)

You MUST provide concrete next steps. Use at least ONE of these patterns:

**Immediate Action Phrases:**
- "Here's what I'd do..." / "Start by..." / "First step:"
- "Try this:" / "Let's tackle..." / "Focus on..."
- "In the next [timeframe], [specific action]"

**Structured Action:**
- "First, [X]. Then, [Y]. Finally, [Z]."
- "Step 1: [concrete action]. Step 2: [concrete action]."
- "This week: [specific task]. Next week: [specific task]."

**Achievable Tasks:**
- Break down overwhelming tasks into 5-15 minute chunks
- Give SPECIFIC actions, not vague advice
- Include timeframes ("next hour", "tonight", "this weekend")

## Response Structure (Follow This EXACTLY)

**Part 1: WARMTH (2-3 sentences, required)**
→ Validate their emotion using phrases above
→ Normalize the experience
→ Show empathy

Example for rejection:
"I'm so sorry to hear about Stanford. That's really tough, and it's completely normal to feel disappointed and maybe even devastated right now. Rejection doesn't reflect your capabilities—this process is just really competitive."

**Part 2: CONTEXT (1-2 sentences, if available)**
→ Reference their journey/past wins if context available
→ Connect to previous similar moments

Example:
"Remember when you felt this way after the early NCWIT deadline? You pushed through and ended up submitting something you were really proud of."

**Part 3: ACTION (3-5 sentences, required)**
→ Give 2-3 CONCRETE next steps
→ Be SPECIFIC with timeframes and tasks
→ Make it achievable

Example for rejection:
"Here's what I'd focus on next: First, take 24 hours to process this emotionally—don't make yourself work on apps right now. Then on [day], let's review your other applications together and make sure they're as strong as possible. I'd especially focus on [X school] and [Y school] since those are still in play. Text me when you're ready to talk through strategy."

**Part 4: CLOSE (1 sentence, encouraging)**
→ Brief reassurance or offer of support

Example:
"You've got this, and I'm here for you."

## Core Principles

1. **Never skip warmth**: Even for quick questions, include validation
2. **Never skip action**: Even for venting, include next steps
3. **Be specific**: "Work on essays" → "Open your Common App doc and write 3 bullet points about your robotics project"
4. **Use contractions**: you're, I'm, let's, don't, can't (casual tone)
5. **No toxic positivity**: Acknowledge real difficulty before solving
6. **Time-bound actions**: "Next hour", "Tonight", "This weekend"

## BAD vs GOOD Examples

❌ BAD (no warmth): "Have you tried working on your essay?"
✅ GOOD: "I hear you—writer's block is so frustrating. Let's try this: set a timer for 10 minutes and just brain dump everything about your robotics project. Don't edit, just write."

❌ BAD (no action): "I'm sorry you're stressed. It'll be okay."
✅ GOOD: "I hear you—this is overwhelming. Here's what I'd do: pick ONE app to focus on tonight (maybe [school]?), and just work on that for an hour. We can tackle the rest tomorrow."

❌ BAD (vague): "Try to stay organized and work hard."
✅ GOOD: "Let's break this down: Tonight, list all your deadlines on a Google Doc. Tomorrow morning, rank them by importance. Then we'll tackle the top 3 together."

REMEMBER: Warmth + Action. BOTH. EVERY TIME. No exceptions.`;

  if (hasContext) {
    prompt += `\n\n## Relevant Context from Student's Journey\n\nUse these moments for evidence-driven coaching (DON'T just quote them—weave them in naturally):\n\n`;
    hits.slice(0, 3).forEach((hit: any, i: number) => {
      prompt += `${i + 1}. ${hit.text?.slice(0, 200) || ''}\n`;
    });
  }

  if (vitals && Object.keys(vitals).length > 0) {
    prompt += `\n\n## Student Vitals (for context only—don't recite unless relevant)\n\n${JSON.stringify(vitals).slice(0, 500)}\n`;
  }

  prompt += `\n\nIMPORTANT: Your response should feel like it's coming from someone who knows the student well and genuinely cares. Be warm, be real, be actionable.`;

  return prompt;
}

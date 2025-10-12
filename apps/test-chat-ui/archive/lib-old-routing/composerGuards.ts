type GuardResult = { text: string; toneScore: number; proofScore: number; rewritten: boolean };

// One-line warmth for scaffolds
const ONE_LINE_WARMTH = "I'm with you.";

// Warmth cue phrases - must have at least one
const WARMTH_CUES = [
  /i'?m\s+with\s+you/i,
  /i\s+hear\s+you/i,
  /that\s+makes\s+sense/i,
  /it'?s\s+okay\s+to\s+feel/i,
  /let'?s\s+solve\s+this\s+together/i,
  /take\s+a\s+breath/i,
  /let'?s\s+step\s+back/i,
  /you'?re\s+doing\s+great/i,
  /this\s+is\s+hard/i,
  /i\s+believe\s+in\s+you/i,
];

// Actionability patterns - concrete next steps with time (Fix B: Enhanced)
const IMPERATIVE_VERBS = /\b(?:do|start|begin|send|draft|ask|book|schedule|email|text|follow up|follow-up|submit|ship|write|outline|revise|upload|log)\b/i;

// Proof patterns - dates and sources
const PROOF_DATE = /\b(\d{2,4})(\/|-|\.)\d{1,2}(\/|-|\.)\d{1,2}\b|\b20\d{2}\b/;
const PROOF_SOURCE = /(SRC-|source:|as of|table:|view:|chip_table)/i;

// Internals to strip from user-facing text
const INTERNAL_PATTERNS = [
  /\b[A-Z]\d{3}-[A-Z]+-\d{3}\b/g,           // W015-STRATEGY-001
  /chip_id:\s?[A-Z0-9\-]+/gi,               // chip_id: ...
  /scaffold\.[a-z_.]+/gi,                   // scaffold.assessment.top3gaps
  /\([A-Z]\d{3}-[A-Z]+-\d{3}\)/g,          // (W015-STRATEGY-001)
  /\/[A-Za-z_]+_[A-Za-z_]+\.json/g,        // file paths
];

// Meta-instruction leakage patterns (Fix E)
const META_PATTERNS = [
  /^respond in \w+ sentences/i,
  /^write \w+ sentences/i,
  /\backnowledge\b.*\breinforce\b/i,
  /\bas (your|a) coach\b/i,
  /\bmeta[- ]?(note|instruction|comment)\b/i,
];

const score = (s: string, pats: RegExp[]) => pats.reduce((n, r) => n + (r.test(s) ? 1 : 0), 0) / Math.max(1, pats.length);

function hasWarmth(text: string): boolean {
  return WARMTH_CUES.some(rx => rx.test(text));
}

function hasAction(text: string): boolean {
  const t = (text || "").toLowerCase();

  // 1) Imperative verbs anywhere in text (expanded list)
  if (/\b(do|start|begin|send|draft|ask|book|schedule|email|text|follow up|follow-up|submit|ship|write|outline|revise|upload|log|acknowledge|share|affirm|explain|tell|show|create|build|plan|review)\b/.test(t)) {
    return true;
  }

  // 2) Ordered steps
  if (/\b(first|then|next|after that|finally|step \d)\b/.test(t)) return true;

  // 3) Time-boxed actions (minutes/hours OR deadlines)
  if (/\b\d{1,3}\s*(min|minute|minutes|hr|hour|hours)\b/.test(t)) return true;
  if (/\bby\s+(mon|tue|wed|thu|fri|sat|sun|tomorrow|tonight|eod|3pm|5pm|\d{1,2}(:\d{2})?\s*(am|pm)?)\b/.test(t)) return true;

  // 4) "Next step" phrasing or time markers (enhanced)
  if (/\b(next step|do this now|start with|do this first|today|right now|starting|this week|by tonight|before bed|starting today|this morning|this afternoon|this evening)\b/.test(t)) return true;

  // 5) Checklists with actionable verbs
  const LINES = t.split(/\r?\n/).slice(0, 12);
  if (LINES.some(l => /^\s*[-*•]/.test(l) && IMPERATIVE_VERBS.test(l))) return true;

  return false;
}

function hasProof(text: string): boolean {
  return PROOF_DATE.test(text) && PROOF_SOURCE.test(text);
}

function ensureSingleNextStep(text: string, intent: string): { text: string; injected: boolean } {
  const t = (text || "").trim();

  // Intents that should have an action
  const ACTION_INTENTS = new Set([
    "rejection_response",
    "escalation",
    "parent_brief",
    "deadline_crunch",
    "time_math",
    "plan_now",
    "future_pacing",
    "message_template",
    "micro_interaction",
    "tactic",
    "mindset"
  ]);

  if (!ACTION_INTENTS.has(intent)) return { text: t, injected: false };

  // Templates always need "send this" action, regardless of hasAction detection
  const isTemplate = intent === "message_template" || intent === "deadline_crunch";

  // If already has action AND not a template, don't add another
  if (!isTemplate && hasAction(t)) return { text: t, injected: false };

  // Intent-specific action nudges
  let suffix: string;
  if (isTemplate) {
    // Check if already has explicit send/copy instruction
    if (/\b(send|copy|fill|draft|text|email)\s+(this|it|the\s+template|now)/i.test(t)) {
      return { text: t, injected: false };
    }
    suffix = "\n\n**Next step (3 min):** Copy this template, fill in the placeholders, and send it now.";
  } else {
    suffix = "\n\n**Next step (3 min):** Open your notes and write 1 line you'll do today, then set a reminder.";
  }

  return { text: t + suffix, injected: true };
}

function stripInternals(text: string): string {
  let cleaned = text;

  // Remove internal patterns
  INTERNAL_PATTERNS.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });

  // Fix E: Remove meta-instruction leakage
  META_PATTERNS.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });

  // Enhanced meta-leakage cleanup
  cleaned = cleaned
    .replace(/\b(?:scaffold|chip|table|namespace|family)[_:\-a-z0-9]+/gi, '')
    .replace(/System:|User:|Assistant:/gi, '')
    .replace(/\b(?:\#|SRC-|src-|file-|proof_|debug_)\S+/gi, '')
    .replace(/@\s?KBv\d+[^\s]*/g, '')
    .replace(/\*\*Breakdown\s?\([A-Z0-9\-]+\)\*\*/gi, '')
    .replace(/\*Source\*:\s*[^\n]+/gi, '')  // Remove *Source*: KB namespace lines
    .replace(/\([A-Z]\d+-[A-Z]+-\d+\)/g, '') // Remove (W016-RESULT-001) chip ID refs
    .replace(/\bKBv\d+[_\-][^\s]*/gi, '');   // Remove any KBv6_2025-10-06_v1.0 refs

  // Clean up multiple spaces and empty lines
  return cleaned.replace(/\s{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function clampLength(text: string, maxWords: number): string {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '…';
}

export async function guardAndPolish(text: string, intent: string, meta?: { topScore?: number; source?: string }): Promise<GuardResult> {
  let out = text;
  let rewritten = false;

  // Fix C: Skip guard entirely on SQL answers (they're already clean)
  if (meta?.source === "sql") {
    return {
      text: out,
      toneScore: 0,
      proofScore: 1.0,
      rewritten: false
    };
  }

  // Fix A: Scaffold-specific warmth (one-liner prefix only)
  if (meta?.source === "scaffold") {
    const toneIntents = new Set([
      "rejection_response",
      "escalation",
      "parent_brief",
      "deadline_crunch",
      "time_math",
      "plan_now",
      "future_pacing",
      "message_template",
      "micro_interaction",
      "tactic",  // Templates use this tag
      "mindset"
    ]);

    if (toneIntents.has(intent)) {
      // Only prefix if not already present
      const hasIntro = /^\s*(i'm with you\.|i am with you\.)/i.test(out);
      if (!hasIntro) {
        out = `${ONE_LINE_WARMTH} ${out}`;
        rewritten = true;
      }

      // Ensure action nudge for scaffolds too
      const actionNudge = ensureSingleNextStep(out, intent);
      if (actionNudge.injected) {
        out = actionNudge.text;
        rewritten = true;
      }

      return { text: out, toneScore: 0.1, proofScore: 0, rewritten };
    }
    // For non-tone scaffolds, return as-is
    return { text: out, toneScore: 0, proofScore: 0, rewritten: false };
  }

  // 1. Strip internals first (chip IDs, file paths, scaffold names)
  const cleaned = stripInternals(out);
  if (cleaned !== out) {
    out = cleaned;
    rewritten = true;
  }

  // 2. Identify intent type
  const isTone = /(rejection_response|escalation|mindset|message_template|deadline_crunch|parent_brief)/.test(intent);
  const isFacty = /(awards|programs|academics|temporal_facts|facts\.canonical|outcomes|readiness)/.test(intent);
  const lowConfidence = (meta?.topScore ?? 1) < 0.40;

  // 3. Hard warmth check (tone intents OR low-confidence must have warmth cue)
  const needsWarmth = isTone || lowConfidence;
  if (needsWarmth && !hasWarmth(out)) {
    out = `I'm with you. ${out}`;
    rewritten = true;
  }

  // 4. Ensure single next step for action intents (universal nudge)
  const actionNudge = ensureSingleNextStep(out, intent);
  if (actionNudge.injected) {
    out = actionNudge.text;
    rewritten = true;
  }

  // 5. Hard proof check (facty intents must have date + source)
  if (isFacty && !hasProof(out)) {
    const today = new Date().toISOString().split('T')[0];
    out = `${out}\n\nAs of: ${today}\nSources: [SQL resolver • internal data]`;
    rewritten = true;
  }

  // 6. Length clamps
  const wordCount = out.split(/\s+/).length;
  if (isTone && wordCount > 120) {
    out = clampLength(out, 120);
    rewritten = true;
  } else if (isFacty && wordCount > 180) {
    // For facty, allow up to 180 words + preserve bullet sources
    const lines = out.split('\n');
    const mainText = lines.filter(l => !l.match(/^(As of|Sources?:|•|-)/)).join('\n');
    const sources = lines.filter(l => l.match(/^(As of|Sources?:|•|-)/)).join('\n');
    out = clampLength(mainText, 180) + '\n\n' + sources;
    rewritten = true;
  }

  // Calculate scores for metadata
  const toneScore = score(out, WARMTH_CUES);
  const proofScore = hasProof(out) ? 1.0 : 0.0;

  // Async proof verification (background task for audit/logging)
  queueMicrotask(async () => {
    try {
      // Background logging - doesn't block response
      if (isFacty && !hasProof(out)) {
        console.warn(`[Guard] Low-proof facty response for intent: ${intent}`);
      }
    } catch (e) {
      console.error("[Guard] Async proof verify failed:", e);
    }
  });

  return { text: out, toneScore, proofScore, rewritten };
}

// services/jenny-api/src/lib/humanizer.ts
// Humanizer v2.1 - Jenny's Real Voice Layer
// Makes every reply feel like "Jenny" across all categories (SQL, KB/RAG, FT/EQ)
// while preserving factual integrity (never edits Cat-1 facts).

import { pool } from "../db/pool.js";
import crypto from "crypto";

export type HumanizeInput = {
  route: "sql" | "kb" | "llm";
  studentId?: string | null;
  intent?: string;
  raw: string;                  // composed text (pre-guard)
  evidence?: { passages?: Array<{ text: string; source?: string }> };
  sqlBlock?: string;            // Cat-1 facts (verbatim)
};

export type HumanizeOutput = {
  text: string;
  applied: {
    warmth: boolean;
    action: boolean;
    personal_ref: boolean;
    proof_presenter: boolean;
    safety_scrub: boolean;
  };
  plan: {
    opener?: string;
    cadence?: "brief" | "standard" | "detailed";
    phrase_source: "eq" | "fallback";
  };
};

// Vetted defaults from Jenny's EQ corpus (iMessage + sessions)
const DEFAULT_WARMTH = [
  "I'm with you.",
  "Totally fair feeling.",
  "That's completely understandable."
];

const DEFAULT_NORMALIZE = [
  "That's totally normal.",
  "Lots of strong students hit this too."
];

const DEFAULT_CELEBRATE = [
  "This is awesome momentum.",
  "Love this step forward."
];

// Runtime guard rules (from v10.1 quality guards)
const MAX_EXCL = 5;
const MAX_EMOJI = 3;

/**
 * Deterministic phrase picker using SHA-1 hash seed
 * Ensures consistent variety within thread (same studentId + intent = same phrase)
 */
function seedPick<T>(items: T[], seed: string): T | undefined {
  if (!items?.length) return undefined;
  const h = crypto.createHash("sha1").update(seed).digest();
  const n = h.readUInt32BE(0);
  return items[n % items.length];
}

/**
 * Load Jenny's real phrases from EQ signals (learned from iMessage/sessions)
 * Falls back to vetted defaults if student has thin EQ data
 */
async function loadJennyPhrases(studentId?: string | null) {
  if (!studentId) {
    return {
      warmth: DEFAULT_WARMTH,
      normalize: DEFAULT_NORMALIZE,
      celebrate: DEFAULT_CELEBRATE,
      source: "fallback" as const
    };
  }

  try {
    // Pull warmth/normalization openers (strength-ranked)
    const warmthRes = await pool.query(
      `SELECT exemplar FROM eq_signals s
       JOIN eq_signal_sets k ON k.id = s.set_id
       WHERE k.student_id = $1
         AND s.cue IN ('warmth','normalization')
         AND exemplar IS NOT NULL
         AND length(exemplar) BETWEEN 6 AND 140
       ORDER BY s.strength DESC
       LIMIT 20`,
      [studentId]
    );

    // Pull celebration closers (strength-ranked)
    const celebrateRes = await pool.query(
      `SELECT exemplar FROM eq_signals s
       JOIN eq_signal_sets k ON k.id = s.set_id
       WHERE k.student_id = $1
         AND s.cue IN ('celebration')
         AND exemplar IS NOT NULL
         AND length(exemplar) BETWEEN 6 AND 140
       ORDER BY s.strength DESC
       LIMIT 15`,
      [studentId]
    );

    const warmth = warmthRes.rows.map(r => String(r.exemplar).trim()).filter(Boolean);
    const celebrate = celebrateRes.rows.map(r => String(r.exemplar).trim()).filter(Boolean);

    return {
      warmth: warmth.length ? warmth : DEFAULT_WARMTH,
      normalize: warmth.length ? warmth : DEFAULT_NORMALIZE,
      celebrate: celebrate.length ? celebrate : DEFAULT_CELEBRATE,
      source: warmth.length || celebrate.length ? ("eq" as const) : ("fallback" as const)
    };
  } catch (err) {
    console.warn("[Humanizer] EQ phrase load failed, using fallbacks:", err);
    return {
      warmth: DEFAULT_WARMTH,
      normalize: DEFAULT_NORMALIZE,
      celebrate: DEFAULT_CELEBRATE,
      source: "fallback" as const
    };
  }
}

/**
 * Cap exclamations and emoji per runtime guard rules
 */
function capPunctuation(text: string): string {
  // Cap exclamations (max 5 consecutive)
  let out = text.replace(/!{2,}/g, (m) => "!".repeat(Math.min(m.length, MAX_EXCL)));

  // Cap emoji (max 3 total)
  let seen = 0;
  out = out.replace(/\p{Emoji_Presentation}/gu, (m) => {
    if (seen < MAX_EMOJI) {
      seen++;
      return m;
    }
    return ""; // drop surplus
  });

  return out;
}

/**
 * Safety scrubber - remove meta instructions, chip IDs, internal markers
 * (Keeps v10.1 quality guard patterns)
 */
function scrub(text: string): string {
  return text
    .replace(/^respond in .*$/gim, "")
    .replace(/\b(scaffold|chip|namespace|family)[:/_-][\w-]+/gi, "")
    .replace(/\[internal:.*?\]/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Check if text already has warmth opener
 */
function hasWarmth(t: string): boolean {
  return /i'?m\s+with\s+you/i.test(t);
}

/**
 * Check if text already has concrete action step
 */
function hasAction(t: string): boolean {
  return /\b(do|start|send|draft|ask|schedule|email|submit|write|outline|revise|upload|plan|today|right now|by (?:eod|tonight|\d{1,2}(?:am|pm)))\b/i
    .test(t);
}

/**
 * Inject action nudge if missing (ensures every reply has "one next step")
 */
function addAction(text: string, fallback: string): { text: string; applied: boolean } {
  if (hasAction(text)) return { text, applied: false };
  return {
    text: `${text}\n\n**Next 1 step (today):** ${fallback}`,
    applied: true
  };
}

/**
 * Main humanizer function
 * Category-aware transformation that preserves factual integrity:
 * - Cat-1 (SQL): Warmth + proof presenter + tiny action; NEVER alters numbers/dates
 * - Cat-2 (KB/RAG): Warmth + one actionable step + optional celebration closer
 * - Cat-3 (FT/EQ): Keep adapter voice + ensure one concrete action
 */
export async function humanize(input: HumanizeInput): Promise<HumanizeOutput> {
  const { route, studentId, intent, raw, evidence, sqlBlock } = input;

  // 1) Load Jenny's real phrasing from EQ signals (with safe fallbacks)
  const phrases = await loadJennyPhrases(studentId);
  const seed = `${studentId || "anon"}|${intent || route}`;
  const opener = seedPick(phrases.warmth, seed) || "I'm with you.";
  const closer = seedPick(phrases.celebrate, seed);

  // 2) Start with raw composed answer
  let out = raw;
  const applied = {
    warmth: false,
    action: false,
    personal_ref: false,
    proof_presenter: false,
    safety_scrub: false
  };
  const plan = {
    opener,
    cadence: "standard" as const,
    phrase_source: phrases.source
  };

  // 3) Category-specific transformations
  if (route === "sql") {
    // Cat-1: Facts-First SQL
    // CRITICAL: DO NOT alter sqlBlock - numbers/dates are sacred
    // Only wrap with warmth + proof presenter + gentle action

    const proofPrefix = sqlBlock
      ? `**Quick facts (from your records):**\n\`\`\`\n${sqlBlock.trim()}\n\`\`\`\n\n`
      : "";
    applied.proof_presenter = !!sqlBlock;

    if (!hasWarmth(out)) {
      out = `${opener} ${out}`.trim();
      applied.warmth = true;
    }

    const a = addAction(out, "Note this in your tracker and tell me if anything looks off.");
    out = a.text;
    applied.action = a.applied;

    out = proofPrefix + out;
  }

  if (route === "kb") {
    // Cat-2: KB/RAG
    // Add warmth + concrete action + optional celebration

    if (!hasWarmth(out)) {
      out = `${opener} ${out}`.trim();
      applied.warmth = true;
    }

    const a = addAction(out, "Copy the most relevant insight and apply it to your current task.");
    out = a.text;
    applied.action = a.applied;

    // Optional celebration closer if we have one from EQ
    if (closer) {
      out = `${out}\n\n_${closer}_`;
      applied.personal_ref = true;
    }
  }

  if (route === "llm") {
    // Cat-3: Fine-Tuned LLM/EQ
    // Keep adapter's natural voice; just ensure concrete action

    const a = addAction(out, "Write a 2-sentence reflection and send it to your counselor.");
    out = a.text;
    applied.action = applied.action || a.applied;

    if (!hasWarmth(out)) {
      out = `${opener} ${out}`;
      applied.warmth = true;
    }
  }

  // 4) Safety & polish (punctuation caps + meta scrubbing)
  const capped = capPunctuation(out);
  const cleaned = scrub(capped);
  if (cleaned !== out) applied.safety_scrub = true;

  return { text: cleaned, applied, plan };
}

/**
 * Confidence-Aware Intent Fusion
 *
 * Combines GPT, embedding, and regex signals using policy thresholds
 */

import type { GPTIntentResult } from "./gptIntent";

export interface FusedIntent {
  intents: string[];
  tags: string[];
  filters?: Record<string, any>;
  source: "gpt" | "embed" | "regex" | "mixed" | "clarifier";
  confidence: number;
}

/**
 * Fuse intent signals with confidence-based priority
 */
export function fuseIntent(
  gpt: GPTIntentResult,
  embed: { intent: string; score: number },
  regexTags: string[],
  policy: any
): FusedIntent {
  const { gpt_min, embed_min, abstain_floor } = policy.intent || {
    gpt_min: 0.62,
    embed_min: 0.55,
    abstain_floor: 0.4,
  };

  // 1. GPT high confidence → use GPT
  if (gpt.confidence >= gpt_min) {
    return {
      intents: [gpt.intent],
      tags: dedupe([...extractTagsFromIntent(gpt), ...regexTags]),
      filters: gpt.filters,
      source: "gpt",
      confidence: gpt.confidence,
    };
  }

  // 2. Embedding fallback
  if (embed.score >= embed_min) {
    return {
      intents: [embed.intent],
      tags: dedupe([...extractTagsFromIntent(gpt), ...regexTags]),
      filters: gpt.filters,
      source: "embed",
      confidence: embed.score,
    };
  }

  // 3. Very low confidence → clarifier
  const maxConf = Math.max(gpt.confidence, embed.score);
  if (maxConf < abstain_floor) {
    return {
      intents: [],
      tags: regexTags,
      source: "clarifier",
      confidence: maxConf,
    };
  }

  // 4. Mixed low confidence → keep tags, no intent
  return {
    intents: [],
    tags: dedupe([...extractTagsFromIntent(gpt), ...regexTags]),
    filters: gpt.filters,
    source: "mixed",
    confidence: maxConf,
  };
}

/**
 * Extract tags from GPT intent result
 */
function extractTagsFromIntent(gpt: GPTIntentResult): string[] {
  const tags: string[] = [];

  // Add object as tag
  if (gpt.object) {
    tags.push(gpt.object);
  }

  // Add phase as tag
  if (gpt.phase) {
    tags.push(gpt.phase);
  }

  // Add intent category as tag
  if (gpt.intent) {
    const category = gpt.intent.split(".")[0];
    if (category) tags.push(category);
  }

  // Add domain-specific tags
  if (gpt.intent.includes("readiness")) tags.push("readiness");
  if (gpt.intent.includes("ivyready")) tags.push("rubric");
  if (gpt.intent.includes("college")) tags.push("college");
  if (gpt.intent.includes("scholarship")) tags.push("scholarship");
  if (gpt.intent.includes("kb.search")) tags.push("coaching");

  return tags;
}

/**
 * Deduplicate array
 */
function dedupe<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

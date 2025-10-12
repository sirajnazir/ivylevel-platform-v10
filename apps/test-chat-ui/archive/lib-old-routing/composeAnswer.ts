/**
 * Universal Answer Composer
 * Policy-driven composition with scaffold matching and type-aware fallback
 */

import Handlebars from "handlebars";
import { selectScaffold, fillTemplate } from "./scaffoldRegistry";
import { getPolicy } from "./policy";
import type { Hit, ComposeResult } from "./types";

const normType = (md: any) =>
  (md?.type || md?.chip_type || md?.category || "UnknownType").toString();

const snip = (t?: string, n = 220) =>
  (t || "").slice(0, n).trim() + ((t || "").length > n ? "…" : "");

/**
 * Pick best chip based on selection rule
 */
function pick(hits: Hit[], rule: any): Hit | undefined {
  if (!rule || !hits.length) return hits[0];

  const { preferIdPrefix = [], preferType, fallbackTopK = 5 } = rule;

  // Try ID prefix match first
  const byPrefix = hits.find(h =>
    preferIdPrefix.some((p: string) => h.id.startsWith(p))
  );
  if (byPrefix) return byPrefix;

  // Try type match
  if (preferType) {
    const byType = hits.find(h => normType(h.metadata) === preferType);
    if (byType) return byType;
  }

  // Fallback to top-K
  return hits.slice(0, fallbackTopK)[0];
}

/**
 * Build template slots from select rules and hits
 */
function buildSlots(select: any, hits: Hit[]) {
  const slots: Record<string, any> = {};

  for (const [k, v] of Object.entries(select || {})) {
    slots[k] = pick(hits, v);
  }

  // Ensure topChip always exists
  if (!slots.topChip) {
    slots.topChip = hits[0];
  }

  return slots;
}

/**
 * Extract chip IDs from template strings with variable substitution
 */
function extractChipIds(templates: string[] | undefined, ctx: any): string[] {
  if (!templates?.length) return [];
  return templates
    .map(t => {
      try {
        return Handlebars.compile(t)(ctx);
      } catch (e) {
        console.warn(`[ComposeAnswer] Failed to compile chip template: ${t}`, e);
        return null;
      }
    })
    .filter(Boolean) as string[];
}

/**
 * Type-aware universal renderer (fallback when no scaffold matches)
 */
function typeAwareRender(h: Hit): string {
  const t = normType(h.metadata);
  const tags = h.metadata?.tags || [];
  const phase = h.metadata?.phase || null;

  // Message_Template_Chip: show template with placeholders clearly marked
  if (t.includes("Message_Template_Chip")) {
    const placeholders = h.content.match(/\{\{[^}]+\}\}/g) || [];
    const placeholderNote = placeholders.length > 0
      ? `\n\n*Placeholders*: ${placeholders.join(", ")}`
      : "";
    return `**Message Template** (${h.id}):\n\n${h.content}${placeholderNote}\n\n*Source*: ${h.namespace}`;
  }

  // Framework_Chip: 3-bullet (what/why/how) + action
  if (t.includes("Framework_Chip")) {
    const lines = h.content.split("\n").filter(l => l.trim());
    const what = lines[0] || h.content;
    const context = tags.length > 0 ? tags.slice(0,3).join(", ") : "strategic planning";
    return `**Framework** (${h.id}):\n\n**What**: ${what}\n\n**Context**: ${context}\n\n**Action**: Apply this framework when ${context} is needed.\n\n*Source*: ${h.namespace}`;
  }

  // Strategy_Chip: thesis + decision rule + trade-offs + next test
  if (t.includes("Strategy_Chip")) {
    const preview = snip(h.content, 200);
    return `**Strategy** (${h.id}):\n\n**Thesis**: ${preview}\n\n**Decision Rule**: Use when optimizing for ${tags.slice(0,2).join(" + ") || "strategic outcomes"}.\n\n**Trade-offs**: This approach may require trade-offs in time allocation or other priorities.\n\n**Next Test**: Validate this strategy with concrete metrics or milestones.\n\n*Source*: ${h.namespace}`;
  }

  // Tactic_Chip: steps + owner + success metric
  if (t.includes("Tactic_Chip")) {
    const steps = h.content.split("\n").filter(l => l.trim()).slice(0,3);
    const stepsText = steps.length > 0 ? steps.map((s,i) => `${i+1}. ${s}`).join("\n") : h.content;
    return `**Tactic** (${h.id}):\n\n**Steps**:\n${stepsText}\n\n**Owner**: Student (with coach support)\n\n**Success Metric**: Completion + tangible output/proof\n\n*Source*: ${h.namespace}`;
  }

  // Result_Chip: targets vs actuals
  if (t.includes("Result_Chip")) {
    return `**Result** (${h.id}):\n\n**Outcome**: ${snip(h.content, 200)}\n\n**Context**: ${phase ? `Phase ${phase}` : "Execution phase"}\n\n**Evidence**: See full result details in source chip.\n\n*Source*: ${h.namespace}`;
  }

  // Insight_Chip: key insight + implications
  if (t.includes("Insight_Chip")) {
    return `**Insight** (${h.id}):\n\n${h.content}\n\n**Implication**: This insight shapes strategy decisions around ${tags.slice(0,2).join(", ") || "student positioning"}.\n\n*Source*: ${h.namespace}`;
  }

  // Trust_Chip: trust-building pattern
  if (t.includes("Trust_Chip")) {
    return `**Trust-Building** (${h.id}):\n\n${h.content}\n\n**Use when**: Building rapport or addressing concern/hesitation.\n\n*Source*: ${h.namespace}`;
  }

  // Micro_Tactic_Chip: trigger → protocol → cooldown
  if (t.includes("Micro_Tactic_Chip")) {
    return `**Micro-Tactic** (${h.id}):\n\n**Trigger**: ${tags.slice(0,2).join(", ") || "micro-interaction scenario"}\n\n**Protocol**:\n${h.content}\n\n**Cooldown**: Re-evaluate after 24-48h or next check-in.\n\n*Source*: ${h.namespace}`;
  }

  // Escalation_Pattern_Chip: trigger → protocol → cooldown
  if (t.includes("Escalation_Pattern_Chip")) {
    return `**Escalation Pattern** (${h.id}):\n\n**Trigger**: ${tags.slice(0,2).join(", ") || "escalation scenario"}\n\n**De-escalation Protocol**:\n${h.content}\n\n**Cooldown**: Monitor for 48-72h; loop in parent/support if pattern persists.\n\n*Source*: ${h.namespace}`;
  }

  // Tone_Cue_Chip: trigger → tone adjustment
  if (t.includes("Tone_Cue_Chip")) {
    return `**Tone Cue** (${h.id}):\n\n**Scenario**: ${tags.slice(0,2).join(", ") || "tone-sensitive interaction"}\n\n**Tone Adjustment**:\n${h.content}\n\n*Source*: ${h.namespace}`;
  }

  // Silver_Bullet_Chip: challenge question
  if (t.includes("Silver_Bullet_Chip")) {
    return `**Challenge Question** (${h.id}):\n\n${h.content}\n\n**Purpose**: Surface hidden blockers or reframe the problem.\n\n*Source*: ${h.namespace}`;
  }

  // Decision_Chip: decision framework
  if (t.includes("Decision_Chip")) {
    return `**Decision Framework** (${h.id}):\n\n${h.content}\n\n**Use when**: Facing a fork-in-the-road decision requiring structured analysis.\n\n*Source*: ${h.namespace}`;
  }

  // Generic fallback for unknown types
  return `**${t}** (${h.id}):\n\n${snip(h.content, 300)}\n\n*Source*: ${h.namespace}`;
}

/**
 * Analytics logging for intent/namespace/scaffold routing
 */
function logAnalytics(
  query: string,
  tags: string[],
  hits: Hit[],
  scaffold_id?: string
) {
  const topHit = hits[0];
  if (!topHit) return;

  const analytics = {
    timestamp: new Date().toISOString(),
    query: query.slice(0, 100),
    tags,
    chosen_scaffold_id: scaffold_id || "type_aware_fallback",
    top_hit_namespace: topHit.namespace,
    top_hit_id: topHit.id,
    top_hit_type: normType(topHit.metadata),
    top_score: topHit.score,
    hit_count: hits.length
  };

  console.log(`[Analytics] ${JSON.stringify(analytics)}`);
}

/**
 * Main composer - orchestrates scaffold matching and answer generation
 */
export function composeAnswer(
  message: string,
  tags: string[],
  hits: Hit[]
): ComposeResult {
  const policy = getPolicy();

  // Guard: low confidence (early return to save token budget)
  const topScore = hits[0]?.score ?? 0;
  const lowConfidence = topScore < policy.confidence.top1_min;

  if (lowConfidence) {
    console.log(`[ComposeAnswer] Low confidence: ${topScore.toFixed(3)} < ${policy.confidence.top1_min} - early return (token budget guard)`);
    return {
      answer: `⚠️ **Low-confidence match detected** (score: ${topScore.toFixed(2)}).\n\nThe top evidence may not be directly relevant. Could you:\n• Add more context (who/when/which)?\n• Rephrase with specific keywords?\n• Clarify if you're looking for tactics, insights, or templates?`,
      chips: [],
      hits
    };
  }

  // Guard: no hits
  if (!hits.length) {
    return {
      answer: "⚠️ **No grounded evidence found.**\n\nTry:\n• Verifying the query relates to coaching sessions, frameworks, or micro-interactions\n• Refining keywords or filters (e.g., phase, week, chip type)",
      chips: [],
      hits: []
    };
  }

  console.log(`[ComposeAnswer] Query: "${message.slice(0, 60)}..."`);
  console.log(`[ComposeAnswer] Tags: [${tags.join(", ")}]`);
  console.log(`[ComposeAnswer] Top score: ${topScore.toFixed(3)}`);

  // Try scaffold matching
  const scaffold = selectScaffold(tags, hits);

  if (scaffold) {
    const ctx = buildSlots(scaffold.conf.select, hits);
    const text = fillTemplate(scaffold, ctx);
    const chips = extractChipIds(scaffold.conf.outputs?.chips, ctx);

    console.log(`[ComposeAnswer] Using scaffold: ${scaffold.conf.id}`);
    console.log(`[ComposeAnswer] Chips: [${chips.join(", ")}]`);

    // Log analytics
    logAnalytics(message, tags, hits, scaffold.conf.id);

    return {
      answer: text,
      chips,
      hits,
      scaffold_used: scaffold.conf.id,
      debug: {
        matched_tags: tags,
        applied_priors: policy.priors,
        scaffold_id: scaffold.conf.id,
        top1_score: topScore
      }
    };
  }

  // Universal fallback: type-aware rendering
  console.log(`[ComposeAnswer] No scaffold matched, using type-aware fallback`);

  const bullets = hits
    .slice(0, 3)
    .map(h => typeAwareRender(h))
    .join("\n\n---\n\n");

  // Log analytics for fallback
  logAnalytics(message, tags, hits);

  return {
    answer: bullets || "No sufficiently grounded evidence.",
    chips: hits.slice(0, 3).map(h => h.id),
    hits,
    debug: {
      matched_tags: tags,
      applied_priors: policy.priors,
      scaffold_id: undefined,
      top1_score: topScore
    }
  };
}

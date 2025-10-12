/**
 * Post-Retrieval Intent Backfill
 *
 * After KB retrieval, if we got homogeneous chip types, we can infer
 * the true intent from the evidence rather than relying on the initial
 * classification which might have been "kb.search".
 */

export type ChipType =
  | "Message_Template_Chip"
  | "Silver_Bullet_Chip"
  | "Framework_Chip"
  | "Proof_Rubric_Chip"
  | "Trust_Chip"
  | "Relatability_Chip"
  | "Tactic_Chip"
  | "Assessment_Chip"
  | "Identity_Chip"
  | "Strategy_Chip"
  | "Execution_Chip"
  | "Handoff_Chip"
  | "Proof_Link_Chip"
  | "Mindset_Chip"
  | "Escalation_Chip"
  | "Unknown_Chip";

export interface ChipReference {
  id: string;
  type: ChipType;
  score?: number;
  namespace?: string;
}

/**
 * Map chip types to their canonical intent names
 */
const CHIP_TO_INTENT: Partial<Record<ChipType, string>> = {
  "Message_Template_Chip": "message_template",
  "Silver_Bullet_Chip": "silver_bullet",
  "Framework_Chip": "execution_framework",
  "Proof_Rubric_Chip": "proofpack",
  "Trust_Chip": "trust",
  "Relatability_Chip": "rejection_response",
  "Tactic_Chip": "tactic",
  "Assessment_Chip": "assessment",
  "Identity_Chip": "identity",
  "Strategy_Chip": "strategy",
  "Execution_Chip": "execution_framework",
  "Handoff_Chip": "handoff",
  "Proof_Link_Chip": "proof_links",
  "Mindset_Chip": "mindset",
  "Escalation_Chip": "escalation"
};

/**
 * Analyze chip types from retrieval results
 */
export function analyzeChipTypes(chips: ChipReference[]): {
  topType: ChipType | null;
  distribution: Map<ChipType, number>;
  isHomogeneous: boolean;
  dominantType: ChipType | null;
} {
  if (!chips || chips.length === 0) {
    return {
      topType: null,
      distribution: new Map(),
      isHomogeneous: false,
      dominantType: null
    };
  }

  // Count chip types
  const distribution = new Map<ChipType, number>();
  for (const chip of chips) {
    const count = distribution.get(chip.type) || 0;
    distribution.set(chip.type, count + 1);
  }

  // Get top type
  let topType: ChipType | null = null;
  let maxCount = 0;
  for (const [type, count] of distribution.entries()) {
    if (count > maxCount) {
      maxCount = count;
      topType = type;
    }
  }

  // Check if homogeneous (>70% of same type in top 3)
  const top3 = chips.slice(0, Math.min(3, chips.length));
  const top3Types = new Set(top3.map(c => c.type));
  const isHomogeneous = top3Types.size === 1;

  // Get dominant type (>50% overall)
  let dominantType: ChipType | null = null;
  if (topType && maxCount > chips.length / 2) {
    dominantType = topType;
  }

  return {
    topType,
    distribution,
    isHomogeneous,
    dominantType
  };
}

/**
 * Backfill intent based on chip evidence
 */
export function backfillIntentFromChips(
  chips: ChipReference[],
  currentIntent: string
): string {
  // Don't override if we already have a specific intent (not kb.search or unknown)
  if (currentIntent && currentIntent !== "kb.search" && currentIntent !== "unknown") {
    return currentIntent;
  }

  if (!chips || chips.length === 0) {
    return currentIntent || "kb.search";
  }

  const analysis = analyzeChipTypes(chips);

  // If homogeneous in top 3, use that type's intent
  if (analysis.isHomogeneous && analysis.topType) {
    const mappedIntent = CHIP_TO_INTENT[analysis.topType];
    if (mappedIntent) {
      console.log(`[backfill] Homogeneous chips (${analysis.topType}) → ${mappedIntent}`);
      return mappedIntent;
    }
  }

  // If dominant type overall, use that
  if (analysis.dominantType) {
    const mappedIntent = CHIP_TO_INTENT[analysis.dominantType];
    if (mappedIntent) {
      console.log(`[backfill] Dominant type (${analysis.dominantType}) → ${mappedIntent}`);
      return mappedIntent;
    }
  }

  // Check for specific patterns in chip IDs
  const intentFromIds = inferIntentFromChipIds(chips);
  if (intentFromIds) {
    console.log(`[backfill] ID pattern → ${intentFromIds}`);
    return intentFromIds;
  }

  // No clear backfill available
  return currentIntent || "kb.search";
}

/**
 * Infer intent from chip ID patterns
 */
function inferIntentFromChipIds(chips: ChipReference[]): string | null {
  const ids = chips.slice(0, 5).map(c => c.id);

  // Handoff patterns
  if (ids.some(id => /ASSESS-|GAMEPLAN-/.test(id)) && ids.some(id => /W00[12]-/.test(id))) {
    return "handoff";
  }

  // Proof links patterns
  if (ids.some(id => /W00[12]-.*-(RESULT|TACTIC|FRAMEWORK)/.test(id))) {
    return "proof_links";
  }

  // Framework patterns
  if (ids.some(id => /FRAMEWORK-\d+/.test(id))) {
    return "frameworks.catalog";
  }

  // Template patterns
  if (ids.some(id => /TEMPLATE-/.test(id))) {
    return "message_template";
  }

  // Assessment patterns
  if (ids.some(id => /ASSESS-/.test(id))) {
    return "assessment";
  }

  return null;
}

/**
 * Enhance intent with chip evidence context
 */
export function enhanceIntentWithContext(
  intent: string,
  chips: ChipReference[]
): { intent: string; confidence: number; evidence: string[] } {
  const backfilled = backfillIntentFromChips(chips, intent);
  const analysis = analyzeChipTypes(chips);

  // Calculate confidence based on chip homogeneity
  let confidence = 0.5; // Base confidence

  if (analysis.isHomogeneous) {
    confidence = 0.9;
  } else if (analysis.dominantType) {
    confidence = 0.75;
  } else if (backfilled !== "kb.search") {
    confidence = 0.6;
  }

  // Generate evidence summary
  const evidence: string[] = [];
  if (analysis.topType) {
    evidence.push(`Top chip type: ${analysis.topType}`);
  }
  if (analysis.isHomogeneous) {
    evidence.push(`Homogeneous retrieval (100% ${analysis.topType})`);
  }
  if (analysis.dominantType) {
    const pct = Math.round((analysis.distribution.get(analysis.dominantType)! / chips.length) * 100);
    evidence.push(`Dominant type: ${analysis.dominantType} (${pct}%)`);
  }

  return {
    intent: backfilled,
    confidence,
    evidence
  };
}

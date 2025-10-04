/**
 * v3.7.1 Parameter Extraction Module
 *
 * Extracts structured parameters from natural language queries using:
 * 1. Regex patterns for common cases (fast, deterministic)
 * 2. LLM tool call fallback for complex cases (flexible, accurate) - TODO: enable when SDK works
 */

// NOTE: Anthropic SDK disabled due to pnpm workspace issues - using regex only for now
// import Anthropic from "@anthropic-ai/sdk";
//
// const anthropic = new Anthropic({
//   apiKey: process.env.ANTHROPIC_API_KEY,
// });

// ========================================
// REGEX PATTERNS
// ========================================

const SAT_PATTERNS = [
  // "raise SAT to 1560", "increase SAT to 1500"
  /(?:raise|increase|improve|boost|get|score)\s+(?:my\s+)?SAT\s+(?:to|up\s+to)\s+(\d{3,4})/i,
  // "1560 SAT", "SAT 1560"
  /(?:^|\s)(\d{3,4})\s+SAT(?:\s|$)/i,
  /SAT\s+(\d{3,4})(?:\s|$)/i,
  // "SAT of 1560"
  /SAT\s+of\s+(\d{3,4})/i,
];

const SAT_DELTA_PATTERNS = [
  // "raise SAT by 100", "improve SAT by 50 points"
  /(?:raise|increase|improve|boost)\s+(?:my\s+)?SAT\s+by\s+(\d+)/i,
];

const AWARD_TIER_PATTERNS = [
  // "win national award", "get international recognition"
  /(?:win|earn|get|receive)\s+(?:a\s+|an\s+)?(international|national|regional)\s+(?:award|recognition|honor)/i,
  // "national award", "international level"
  /(international|national|regional)\s+(?:award|level|tier)/i,
];

// ========================================
// REGEX EXTRACTION
// ========================================

export function extractSATTarget(message: string): number | null {
  // Try absolute SAT patterns
  for (const pattern of SAT_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      const value = parseInt(match[1], 10);
      // Validate SAT range (400-1600)
      if (value >= 400 && value <= 1600) {
        return value;
      }
    }
  }

  // Try delta patterns (requires current SAT - will be handled in resolver)
  for (const pattern of SAT_DELTA_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      const delta = parseInt(match[1], 10);
      // Return negative to signal delta (resolver will add to current)
      return -delta;
    }
  }

  return null;
}

export function extractAwardTier(message: string): string | null {
  for (const pattern of AWARD_TIER_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      const tier = match[1].toLowerCase();
      // Normalize to title case
      return tier.charAt(0).toUpperCase() + tier.slice(1);
    }
  }

  return null;
}

// ========================================
// LLM FALLBACK (Tool Use)
// ========================================

const PARAM_EXTRACT_TOOLS: Anthropic.Tool[] = [
  {
    name: "extract_sat_target",
    description: "Extract SAT target score from user query. Use when user asks about SAT improvement, score targets, or testing scenarios.",
    input_schema: {
      type: "object",
      properties: {
        target_score: {
          type: "number",
          description: "Target SAT composite score (400-1600). If user mentions delta (e.g., 'raise by 100'), add to their current score first.",
        },
        is_delta: {
          type: "boolean",
          description: "True if user specified a delta (e.g., 'raise by 100'), false if absolute target (e.g., 'raise to 1500')",
        },
      },
      required: ["target_score"],
    },
  },
  {
    name: "extract_award_tier",
    description: "Extract award tier from user query. Use when user asks about winning awards or recognition levels.",
    input_schema: {
      type: "object",
      properties: {
        tier: {
          type: "string",
          enum: ["International", "National", "Regional"],
          description: "Award tier level. International = global/world, National = country-wide, Regional = state/local.",
        },
      },
      required: ["tier"],
    },
  },
];

export async function extractSATTargetLLM(message: string, currentSAT?: number): Promise<number | null> {
  // LLM fallback disabled - return null to skip
  console.log("[ParamExtract] LLM fallback disabled (Anthropic SDK not available)");
  return null;
}

export async function extractAwardTierLLM(message: string): Promise<string | null> {
  // LLM fallback disabled - return null to skip
  console.log("[ParamExtract] LLM fallback disabled (Anthropic SDK not available)");
  return null;
}

// ========================================
// UNIFIED EXTRACTION (Regex → LLM Fallback)
// ========================================

export async function extractWhatIfParams(
  message: string,
  intent: "readiness.whatif.sat" | "readiness.whatif.award",
  currentSAT?: number
): Promise<{ actionParam?: number | string; error?: string }> {
  if (intent === "readiness.whatif.sat") {
    // Try regex first
    let satTarget = extractSATTarget(message);

    // If delta (negative), add to current
    if (satTarget !== null && satTarget < 0 && currentSAT) {
      satTarget = currentSAT + Math.abs(satTarget);
    }

    // If regex worked, return
    if (satTarget !== null && satTarget > 0) {
      return { actionParam: satTarget };
    }

    // Fallback to LLM
    satTarget = await extractSATTargetLLM(message, currentSAT);
    if (satTarget !== null) {
      return { actionParam: satTarget };
    }

    return { error: "Could not extract SAT target from query" };
  }

  if (intent === "readiness.whatif.award") {
    // Try regex first
    let awardTier = extractAwardTier(message);
    if (awardTier !== null) {
      return { actionParam: awardTier };
    }

    // Fallback to LLM
    awardTier = await extractAwardTierLLM(message);
    if (awardTier !== null) {
      return { actionParam: awardTier };
    }

    return { error: "Could not extract award tier from query" };
  }

  return { error: "Unknown what-if intent" };
}

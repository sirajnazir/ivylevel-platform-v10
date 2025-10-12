/**
 * Universal Intent Contract
 *
 * Defines canonical intent names, their expected routes, and all synonyms/variants.
 * This prevents drift where GPT-5 or regex might return slightly different labels.
 */

export type RouteType = "sql" | "kb" | "hybrid" | "clarify" | "refuse";

export interface IntentConfig {
  route: RouteType;
  synonyms: string[];
  description?: string;
}

export const INTENT_CONTRACT: Record<string, IntentConfig> = {
  // ========== SQL FACTS ==========

  // Academics
  "academics.gpa": {
    route: "sql",
    synonyms: ["gpa.now", "academics_summary", "current gpa", "weighted gpa", "unweighted gpa", "gpa?"],
    description: "Current GPA with precision"
  },

  "academics.transcript": {
    route: "sql",
    synonyms: ["transcript", "courses", "grades"],
    description: "Academic transcript"
  },

  "academics.aps": {
    route: "sql",
    synonyms: ["ap count", "ap 5s", "how many aps", "ap scores"],
    description: "AP course counts and scores"
  },

  // Testing
  "testing.timeline": {
    route: "sql",
    synonyms: ["sat.ordinal", "first sat", "last sat", "first/last sat", "sat timeline", "testing history", "act timeline"],
    description: "Temporal SAT/ACT progression"
  },

  "testing.superscore": {
    route: "sql",
    synonyms: ["sat superscore", "best sat", "highest sat"],
    description: "Best composite SAT score"
  },

  // Awards
  "awards.list": {
    route: "sql",
    synonyms: ["what awards", "awards won", "my awards", "awards did i win"],
    description: "All awards won"
  },

  "awards.breakdown": {
    route: "sql",
    synonyms: ["awards by tier", "tiered awards", "national awards", "regional awards"],
    description: "Awards grouped by tier"
  },

  "awards.timeline": {
    route: "sql",
    synonyms: ["first award", "most recent award", "awards over time"],
    description: "Temporal award progression"
  },

  // Programs & Competitions
  "programs.list": {
    route: "sql",
    synonyms: ["which programs", "programs applied", "programs accepted", "summer programs"],
    description: "Summer programs applied/accepted"
  },

  "scholarships.list": {
    route: "sql",
    synonyms: ["scholarship", "scholarships", "scholarship outcomes", "scholarship amounts", "financial aid"],
    description: "Scholarship applications and outcomes"
  },

  "competitions.todo": {
    route: "sql",
    synonyms: ["competitions not submitted", "pending competitions", "competitions entered"],
    description: "Competitions in progress"
  },

  // ECs & Activities
  "ecs.list": {
    route: "sql",
    synonyms: ["ecs.enumeration", "my ecs", "extracurriculars", "activities"],
    description: "Extracurricular activities"
  },

  "ecs.leadership": {
    route: "sql",
    synonyms: ["leadership titles", "leadership positions", "ecs with leadership"],
    description: "ECs with leadership roles"
  },

  // College Outcomes
  "college.list": {
    route: "sql",
    synonyms: ["college list", "schools applied", "college outcomes"],
    description: "College application list"
  },

  "outcomes.list": {
    route: "sql",
    synonyms: ["list outcomes", "final outcomes", "decisions", "acceptances"],
    description: "All college decisions"
  },

  "outcomes.search": {
    route: "sql",
    synonyms: ["publications", "papers", "research outcomes", "published work"],
    description: "Search for specific outcomes or publications"
  },

  // Gameplan
  "gameplan.initial": {
    route: "sql",
    synonyms: ["initial gameplan", "first gameplan", "original plan"],
    description: "Initial strategic plan"
  },

  // Canonical Facts (counts, precise numbers)
  "facts.canonical": {
    route: "sql",
    synonyms: ["canonical", "how many", "count of", "titles now", "right now", "current count"],
    description: "Precise counts and current state"
  },

  // Readiness
  "readiness.score": {
    route: "sql",
    synonyms: ["readiness score", "readiness now", "factor deltas"],
    description: "Current readiness metrics"
  },

  // ========== KB ONLY ==========

  // Templates & Communications
  "message_template": {
    route: "kb",
    synonyms: ["template", "note to", "thank-you", "thank you note", "follow-up", "email template"],
    description: "Message templates for various scenarios"
  },

  "deadline_crunch": {
    route: "kb",
    synonyms: ["crunch text", "missing form", "deadline text", "urgent deadline"],
    description: "Deadline pressure communications"
  },

  // Frameworks & Methodology
  "time_math": {
    route: "kb",
    synonyms: ["168 hour", "168-hour", "time audit", "hours this week", "allocate time"],
    description: "Time allocation framework"
  },

  "frameworks.catalog": {
    route: "kb",
    synonyms: ["canonical frameworks", "framework list", "list frameworks", "when to deploy"],
    description: "All execution frameworks"
  },

  "execution_framework": {
    route: "kb",
    synonyms: ["portfolio cadence", "operating cadence", "execution cadence"],
    description: "Portfolio operating system"
  },

  "proofpack": {
    route: "kb",
    synonyms: ["proof rubric", "validation rubric", "ec validation", "proof requirements"],
    description: "EC validation proof requirements"
  },

  "silver_bullet": {
    route: "kb",
    synonyms: ["challenge question", "silver bullet question"],
    description: "Challenge question methodology"
  },

  // Assessment & Strategy
  "assessment": {
    route: "kb",
    synonyms: ["top 3 gaps", "initial assessment", "run assessment", "gaps and why"],
    description: "Initial student assessment"
  },

  "identity": {
    route: "kb",
    synonyms: ["identity synthesis", "digital storyteller", "identity influenced"],
    description: "Identity synthesis and positioning"
  },

  "strategy": {
    route: "kb",
    synonyms: ["college strategy", "school fit", "best fit schools"],
    description: "College selection strategy"
  },

  "gameplan.results": {
    route: "kb",
    synonyms: ["first-month outputs", "promised outputs", "gameplan outputs"],
    description: "Expected gameplan deliverables"
  },

  "tactic": {
    route: "kb",
    synonyms: ["proof artifacts", "tactic proof", "small business stories"],
    description: "Tactical execution details"
  },

  // Coaching & Mindset
  "trust": {
    route: "kb",
    synonyms: ["parent alignment", "talk to parents", "parent conversation", "parent blueprint"],
    description: "Parent relationship management"
  },

  "mindset": {
    route: "kb",
    synonyms: ["not good enough", "imposter", "confidence", "doubt"],
    description: "Mindset and confidence building"
  },

  "rejection_response": {
    route: "kb",
    synonyms: ["rejected", "didn't get in", "denial", "rejection from"],
    description: "Rejection coping and response"
  },

  "escalation": {
    route: "kb",
    synonyms: ["parent pushback", "de-escalate", "pushback about time"],
    description: "De-escalation strategies"
  },

  // Handoff & Proof Linking
  "handoff": {
    route: "kb",
    synonyms: ["assessment to week-1", "handoff checks", "what moved from assessment"],
    description: "Assessment to execution handoff"
  },

  "proof_links": {
    route: "kb",
    synonyms: ["chips backing week-1", "proof links", "which chips back up"],
    description: "Evidence backing execution plan"
  },

  // ========== HYBRID (SQL + KB) ==========

  "whatif_priority": {
    route: "hybrid",
    synonyms: ["if i win", "if sat goes", "what if", "if x then", "what changes"],
    description: "What-if scenario planning"
  },

  "simulate": {
    route: "hybrid",
    synonyms: ["if x then delta", "tradeoff", "readiness change", "if i drop"],
    description: "Feature delta simulation"
  },

  "prioritize.next": {
    route: "hybrid",
    synonyms: ["single action maximizes", "what next", "which action", "maximize roi"],
    description: "Next action prioritization"
  },

  "parent_brief": {
    route: "hybrid",
    synonyms: ["progress for parents", "risks + wins", "summarize progress"],
    description: "Parent progress report"
  },

  // ========== FALLBACK ==========

  "kb.search": {
    route: "kb",
    synonyms: ["unknown", "general search"],
    description: "Generic KB search"
  }
};

/**
 * Normalize a raw intent string to its canonical form
 */
export function normalizeIntent(rawIntent: string): { intent: string; route: RouteType } {
  if (!rawIntent) return { intent: "kb.search", route: "kb" };

  const normalized = rawIntent.toLowerCase().trim();

  // Direct match
  if (INTENT_CONTRACT[normalized]) {
    return {
      intent: normalized,
      route: INTENT_CONTRACT[normalized].route
    };
  }

  // Synonym match
  for (const [canonicalIntent, config] of Object.entries(INTENT_CONTRACT)) {
    if (config.synonyms.some(syn => {
      const synPattern = syn.toLowerCase();
      // Exact match or contains match for multi-word synonyms
      return normalized === synPattern ||
             normalized.includes(synPattern) ||
             synPattern.includes(normalized);
    })) {
      return {
        intent: canonicalIntent,
        route: config.route
      };
    }
  }

  // No match found
  return { intent: "kb.search", route: "kb" };
}

/**
 * Get all intents for a given route type
 */
export function getIntentsByRoute(route: RouteType): string[] {
  return Object.entries(INTENT_CONTRACT)
    .filter(([_, config]) => config.route === route)
    .map(([intent, _]) => intent);
}

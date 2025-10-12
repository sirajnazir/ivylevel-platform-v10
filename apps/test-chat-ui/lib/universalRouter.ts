/**
 * Universal Router
 *
 * Deterministic routing system that combines:
 * 1. Text normalization
 * 2. Safety guards (refuse/clarify)
 * 3. Query shape analysis
 * 4. Intent contract normalization
 * 5. Post-retrieval backfill
 *
 * This is the single source of truth for routing decisions.
 */

import { normalizeQuery } from './textNormalization';
import { analyzeQueryShape } from './queryShapes';
import { normalizeIntent, type RouteType } from './intentContract';
import { backfillIntentFromChips, type ChipReference } from './intentBackfill';

export interface RouterInput {
  message: string;
  gptIntent?: string;
  lexiconTags?: string[];
  preferTypes?: string[];
  context?: Record<string, any>;
}

export interface RouterDecision {
  route: RouteType;
  intent: string;
  confidence: number;
  reasoning: string[];
  normalized: string;
  shapeAnalysis: any;
}

/**
 * Main routing function - deterministic decision tree
 */
export function routeQuery(input: RouterInput): RouterDecision {
  const reasoning: string[] = [];

  // Step 1: Normalize text
  const { normalized, language, patterns } = normalizeQuery(input.message);
  reasoning.push(`Normalized: "${normalized}" (lang: ${language})`);

  if (patterns.length > 0) {
    reasoning.push(`Patterns: ${JSON.stringify(patterns)}`);
  }

  // Step 1.5: Authoritative SQL routing - if preferTypes contains "sql", force SQL
  const { preferTypes = [] } = input;
  if (preferTypes.includes("sql")) {
    reasoning.push("Authoritative SQL preference detected → forcing SQL route");
    return {
      route: "sql",
      intent: "facts.canonical",
      confidence: 1.0,
      reasoning,
      normalized,
      shapeAnalysis: { suggestedRoute: "sql" }
    };
  }

  // Step 2: Shape analysis
  const shape = analyzeQueryShape(normalized);

  // Step 3: Safety guards (highest precedence)
  if (shape.isPolicyViolation) {
    reasoning.push("Policy violation detected → refuse");
    return {
      route: "refuse",
      intent: "policy.guard",
      confidence: 1.0,
      reasoning,
      normalized,
      shapeAnalysis: shape
    };
  }

  if (shape.isPrivacyViolation) {
    reasoning.push("Privacy boundary violation → refuse");
    return {
      route: "refuse",
      intent: "privacy",
      confidence: 1.0,
      reasoning,
      normalized,
      shapeAnalysis: shape
    };
  }

  // Step 4: Clarifier guard (second precedence)
  if (shape.isClarifier) {
    reasoning.push("Ambiguous/too short → clarify");
    return {
      route: "clarify",
      intent: "unknown",
      confidence: 1.0,
      reasoning,
      normalized,
      shapeAnalysis: shape
    };
  }

  // Step 4.5: Assessment keyword override (before shape checks)
  // Fixes: B11, O48 - "Run initial assessment" should be KB, not SQL
  // Exclude SQL metric assessments (Fixes: P52 - "Assessment of my GPA trend" should be SQL)
  if (!/(gpa|sat|act|score|grade|transcript|testing).*(trend|progression|timeline|delta)/i.test(normalized)) {
    if (/(run|execute|perform|do|start).*(assessment|initial assessment)/i.test(normalized) ||
        /assessment.*(top|gaps|initial)/i.test(normalized) ||
        /^(assessment|initial assessment)$/i.test(normalized)) {
      reasoning.push("Assessment keyword detected → forcing KB route (assessment)");
      return {
        route: "kb",
        intent: "assessment",
        confidence: 0.95,
        reasoning,
        normalized,
        shapeAnalysis: shape
      };
    }
  }

  // Step 4.6: Chips/Metadata/Evidence query override
  // Fixes: Z73 - "Which chips back up my plan?" should be KB (proof_links), not SQL
  if (/(chips|metadata|evidence|artifacts|quotes|sessions).*(back|backing|support|prove)/i.test(normalized) ||
      /(which|what|show).*(chips|metadata|evidence|artifacts|quotes|sessions)/i.test(normalized)) {
    reasoning.push("Chips/metadata query detected → forcing KB route (proof_links)");
    return {
      route: "kb",
      intent: "proof_links",
      confidence: 0.95,
      reasoning,
      normalized,
      shapeAnalysis: shape
    };
  }

  // Step 4.7: Strategy query pattern detection
  // Fixes: U62 - "Given my profile, which schools best fit" should be HYBRID (needs facts + reasoning)
  // Fixes: U63 - "Why is Berkeley CS hard" should be KB (pure strategy)
  if (/(given|considering).*(profile|stats|background).*(which|what|where).*(school|college)/i.test(normalized)) {
    reasoning.push("Strategy + school list query detected → forcing Hybrid route (school_list_strategy)");
    return {
      route: "hybrid",
      intent: "school_list_strategy",
      confidence: 0.90,
      reasoning,
      normalized,
      shapeAnalysis: shape
    };
  }

  if (/(why|explain).*(school|college|fit|best|match|cs|major|program)/i.test(normalized) ||
      /(best fit|good fit|right fit).*(school|college)/i.test(normalized) ||
      /(hard to|difficult to|switch into|transfer into).*(cs|major|program)/i.test(normalized) ||
      /what's the plan/i.test(normalized)) {
    reasoning.push("Strategy query detected → forcing KB route (strategy)");
    return {
      route: "kb",
      intent: "strategy",
      confidence: 0.90,
      reasoning,
      normalized,
      shapeAnalysis: shape
    };
  }

  // Step 5: Shape-based routing (overrides GPT if strong signal)
  // Order matters: What-if checks MUST come before temporal to avoid false positives
  if (shape.suggestedRoute) {
    reasoning.push(`Shape suggests: ${shape.suggestedRoute}`);

    // What-if scenarios → Hybrid (check FIRST, before temporal)
    if (shape.isWhatIf || shape.isSimulation) {
      reasoning.push("What-if/simulation detected → simulate (Hybrid)");
      return {
        route: "hybrid",
        intent: shape.isSimulation ? "prioritize.next" : "whatif_priority",
        confidence: 0.90,
        reasoning,
        normalized,
        shapeAnalysis: shape
      };
    }

    // Parent brief → Hybrid
    if (shape.isParentBrief) {
      reasoning.push("Parent progress request → parent_brief (Hybrid)");
      return {
        route: "hybrid",
        intent: "parent_brief",
        confidence: 0.90,
        reasoning,
        normalized,
        shapeAnalysis: shape
      };
    }

    // Temporal queries → SQL (check after what-if)
    if (shape.isTemporal) {
      reasoning.push("Temporal comparison detected → testing.timeline (SQL)");
      return {
        route: "sql",
        intent: "testing.timeline",
        confidence: 0.95,
        reasoning,
        normalized,
        shapeAnalysis: shape
      };
    }

    // Numeric/precise facts → SQL
    if (shape.isNumeric) {
      reasoning.push("Numeric/precise fact query → facts.canonical (SQL)");
      return {
        route: "sql",
        intent: "facts.canonical",
        confidence: 0.95,
        reasoning,
        normalized,
        shapeAnalysis: shape
      };
    }
  }

  // Step 6: Normalize GPT intent through contract
  let finalIntent = "kb.search";
  let finalRoute: RouteType = "kb";
  let confidence = 0.5;

  if (input.gptIntent) {
    const normalized = normalizeIntent(input.gptIntent);
    finalIntent = normalized.intent;
    finalRoute = normalized.route;
    confidence = normalized.intent !== "kb.search" ? 0.85 : 0.5;
    reasoning.push(`GPT intent "${input.gptIntent}" → normalized to "${finalIntent}" (${finalRoute})`);
  }

  // Step 7: Lexicon tags enhancement
  if (input.lexiconTags && input.lexiconTags.length > 0) {
    reasoning.push(`Lexicon tags: [${input.lexiconTags.join(', ')}]`);

    // Check if tags suggest different intent
    const tagIntent = inferIntentFromTags(input.lexiconTags, normalized);
    if (tagIntent && tagIntent !== finalIntent) {
      reasoning.push(`Tags suggest: ${tagIntent.intent} (${tagIntent.route})`);
      // Only override if GPT had low confidence
      if (confidence < 0.7) {
        finalIntent = tagIntent.intent;
        finalRoute = tagIntent.route;
        confidence = 0.75;
        reasoning.push("Using tag-based intent");
      }
    }
  }

  // Step 8: Enumeration patterns → SQL
  if (shape.isEnumeration && finalRoute === "kb") {
    reasoning.push("Enumeration pattern detected, forcing SQL route");
    finalRoute = "sql";

    // Also infer SQL intent from text patterns
    const sqlIntent = inferSQLIntentFromEnumeration(normalized);
    if (sqlIntent) {
      finalIntent = sqlIntent;
      reasoning.push(`Inferred SQL intent: ${sqlIntent}`);
    }

    confidence = 0.85;
  }

  return {
    route: finalRoute,
    intent: finalIntent,
    confidence,
    reasoning,
    normalized,
    shapeAnalysis: shape
  };
}

/**
 * Post-retrieval intent backfill
 * Called after KB retrieval to refine intent based on evidence
 */
export function backfillFromEvidence(
  decision: RouterDecision,
  chips: ChipReference[]
): RouterDecision {
  if (decision.route !== "kb" || !chips || chips.length === 0) {
    return decision;
  }

  const backfilled = backfillIntentFromChips(chips, decision.intent);

  if (backfilled !== decision.intent) {
    return {
      ...decision,
      intent: backfilled,
      confidence: Math.min(0.95, decision.confidence + 0.15),
      reasoning: [
        ...decision.reasoning,
        `Post-retrieval backfill: ${decision.intent} → ${backfilled} (from chip evidence)`
      ]
    };
  }

  return decision;
}

/**
 * Infer intent from lexicon tags
 */
function inferIntentFromTags(tags: string[], query: string): { intent: string; route: RouteType } | null {
  // Award tags
  if (tags.includes('award') || tags.includes('awards')) {
    return { intent: 'awards.list', route: 'sql' };
  }

  // Testing tags
  if (tags.includes('sat') || tags.includes('act') || tags.includes('testing')) {
    return { intent: 'testing.timeline', route: 'sql' };
  }

  // GPA tags
  if (tags.includes('gpa') || tags.includes('grades')) {
    return { intent: 'academics.gpa', route: 'sql' };
  }

  // EC tags
  if (tags.includes('ec') || tags.includes('extracurricular') || tags.includes('activities')) {
    return { intent: 'ecs.list', route: 'sql' };
  }

  // College tags
  if (tags.includes('college') || tags.includes('university') || tags.includes('school')) {
    return { intent: 'college.list', route: 'sql' };
  }

  // Assessment tags (Fixes: P52 - Skip if query contains SQL metric trends)
  if (tags.includes('assessment') || tags.includes('gaps')) {
    // Don't override to assessment if query is about SQL metric trends
    if (!/(gpa|sat|act|score|grade|transcript|testing).*(trend|progression|timeline|delta)/i.test(query)) {
      return { intent: 'assessment', route: 'kb' };
    }
  }

  // Framework tags
  if (tags.includes('framework') || tags.includes('168')) {
    return { intent: 'time_math', route: 'kb' };
  }

  // Template tags
  if (tags.includes('template') || tags.includes('message')) {
    return { intent: 'message_template', route: 'kb' };
  }

  // Trust/parent tags
  if (tags.includes('parent') || tags.includes('trust')) {
    return { intent: 'trust', route: 'kb' };
  }

  // Rejection tags
  if (tags.includes('rejection') || tags.includes('rejected')) {
    return { intent: 'rejection_response', route: 'kb' };
  }

  return null;
}

/**
 * Infer SQL intent from enumeration query
 */
function inferSQLIntentFromEnumeration(query: string): string | null {
  const q = query.toLowerCase();

  // Awards
  if (/award/i.test(q)) {
    if (/tier|national|regional|school/i.test(q)) return 'awards.breakdown';
    return 'awards.list';
  }

  // ECs
  if (/ec|extracurricular|activit/i.test(q)) {
    if (/leadership/i.test(q)) return 'ecs.leadership';
    return 'ecs.list';
  }

  // Programs
  if (/program|summer/i.test(q)) return 'programs.list';

  // Scholarships
  if (/scholarship/i.test(q)) return 'scholarships.list';

  // Competitions
  if (/competition/i.test(q)) return 'competitions.todo';

  // College list
  if (/college|school|university/i.test(q) && /list|outcomes/i.test(q)) {
    return 'college.list';
  }

  // Outcomes
  if (/outcome/i.test(q)) return 'outcomes.list';

  // Publications (Fixes: X69 - "List my publications in Nature")
  if (/publication|paper|research/i.test(q)) return 'outcomes.search';

  // Default SQL enumeration intent
  return 'facts.canonical';
}

/**
 * Validate routing decision against expected patterns
 * Useful for testing
 */
export function validateRouting(
  decision: RouterDecision,
  expected: { route?: RouteType; intent?: string }
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (expected.route && decision.route !== expected.route) {
    errors.push(`Route mismatch: expected ${expected.route}, got ${decision.route}`);
  }

  if (expected.intent && decision.intent !== expected.intent) {
    errors.push(`Intent mismatch: expected ${expected.intent}, got ${decision.intent}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

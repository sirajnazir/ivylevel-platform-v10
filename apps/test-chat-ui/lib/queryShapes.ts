/**
 * Query Shape Detectors
 *
 * Deterministic rules that analyze query structure to force correct routing,
 * regardless of what GPT-5 or regex tags suggest.
 */

/**
 * Detect if query is asking for temporal comparison (first vs last, etc.)
 */
export function isTemporalCompare(query: string): boolean {
  const q = query.toLowerCase();

  // First/last patterns
  if (/(first|1st|earliest|initial).*(last|final|most recent|latest)/i.test(q)) return true;
  if (/(vs|versus|→|->|compared to).*(first|last|initial|final)/i.test(q)) return true;

  // Delta/change patterns with temporal indicators
  if (/(delta|change|improve|increase|decrease|progress)/i.test(q) &&
      /(sat|act|award|gpa|score)/i.test(q)) return true;

  // Ordinal patterns
  if (/(first|second|third|nth|1st|2nd|3rd).*(sat|act|award|test)/i.test(q)) return true;

  return false;
}

/**
 * Detect if query asks for precise numeric facts or counts FROM SQL
 * Exclude KB-based queries (time management, vector counts, abstract concepts)
 */
export function asksForNumberOrPreciseFact(query: string): boolean {
  const q = query.toLowerCase();

  // Exclude KB-only queries
  if (/(hours.*free|free.*hours|time.*available|vector counts|namespace)/i.test(q)) return false;
  if (/(artifacts|quotes|sessions|chips|evidence)/i.test(q)) return false;

  // Direct count questions for SQL entities
  if (/(how many|count|number of|total).*(award|ec|program|scholarship|ap|course|college)/i.test(q)) return true;

  // Precision requirements for SQL metrics
  if (/(2 decimals|precise|exact).*(gpa|score)/i.test(q)) return true;
  if (/(what's my|what is my).*(current|latest).*(gpa|score)/i.test(q)) return true;

  // Canonical state questions
  if (/(what's my|what is my).*(gpa|score|count|titles)/i.test(q)) return true;

  // Leadership/role counts
  if (/(leadership titles|leadership positions|how many.*lead)/i.test(q)) return true;

  return false;
}

/**
 * Detect what-if / hypothetical scenarios
 */
export function isWhatIf(query: string): boolean {
  const q = query.toLowerCase();

  // Direct what-if patterns
  if (/^(what if|if i|suppose|imagine)/i.test(q)) return true;
  if (/(if|when).*(then|what|how|which)/i.test(q)) return true;

  // Conditional patterns with deltas
  if (/(if|when).*(goes|win|ship|drop|add).*(what|which|how)/i.test(q)) return true;

  // Tradeoff/impact questions
  if (/(tradeoff|impact|effect|consequence|result).*(if|when)/i.test(q)) return true;

  // Change/delta patterns
  if (/(\d+)\s*(-|to|→)\s*(\d+)/i.test(q)) return true; // e.g., "1430 to 1530"

  return false;
}

/**
 * Detect simulation/prioritization queries
 */
export function isSimulationOrPriority(query: string): boolean {
  const q = query.toLowerCase();

  // Prioritization
  if (/(which|what).*(action|move|step).*(maximize|best|optimal|roi)/i.test(q)) return true;
  if (/(single action|one thing|top priority)/i.test(q)) return true;

  // Simulation/optimization
  if (/(simulate|model|predict|forecast)/i.test(q)) return true;
  if (/(readiness change|readiness impact)/i.test(q)) return true;

  return false;
}

/**
 * Detect queries that need parent briefing (hybrid: facts + narrative)
 */
export function isParentBrief(query: string): boolean {
  const q = query.toLowerCase();

  if (/(progress|summary|update).*(parent|mom|dad)/i.test(q)) return true;
  if (/(parent|mom|dad).*(progress|summary|update)/i.test(q)) return true;
  if (/(risks|wins|this month).*(parent)/i.test(q)) return true;

  return false;
}

/**
 * Safety Guards
 */

/**
 * Detect if query is too vague and needs clarification
 */
export function isClarifier(query: string): boolean {
  const q = query.trim().toLowerCase();

  // Very short queries (1 word, length <= 4)
  const tokens = q.split(/\s+/);
  if (tokens.length === 1 && tokens[0].length <= 4) return true;

  // Two-word vague queries (Fixes: L40 - "help me" should trigger clarifier)
  if (tokens.length === 2) {
    const twoWordAmbiguous = ["help me", "help please", "show me"];
    if (twoWordAmbiguous.includes(q)) return true;
  }

  // Single-word ambiguous queries
  const ambiguous = ["help", "essay", "stats", "info", "data", "show", "list", "??", "?"];
  if (ambiguous.includes(q)) return true;

  // Question marks without content
  if (/^\?+$/.test(q)) return true;

  return false;
}

/**
 * Detect policy violations that should be refused
 */
export function isPolicyRefusal(query: string): boolean {
  const q = query.toLowerCase();

  // Essay writing requests
  if (/(write|create|generate).*(entire|full|complete).*(essay|personal statement|common app)/i.test(q)) return true;
  if (/common app essay.*(from scratch|for me)/i.test(q)) return true;

  // Impersonation
  if (/(pretend|impersonate|act as|pose as)/i.test(q)) return true;

  // Plagiarism
  if (/(plagiar|copy|steal|cheat)/i.test(q)) return true;

  // Unethical requests
  if (/(lie|fake|fabricate|make up).*(award|achievement|ec|recommendation)/i.test(q)) return true;

  return false;
}

/**
 * Detect privacy boundary violations
 */
export function isPrivacyRequest(query: string): boolean {
  const q = query.toLowerCase();

  // Exclude template requests (not privacy violations)
  // Fixes: P53 - "Template ask vs email teacher" is a template request, not privacy violation
  if (/(template|note|message|text).*(email|ask|reach out)/i.test(q)) return false;

  // Contact information requests
  if (/(phone|email|contact|address).*(recommender|teacher|counselor|coach)/i.test(q)) return true;
  if (/(give me|show me|what is).*(phone|email|contact)/i.test(q)) return true;

  // Social security, financial details
  if (/(ssn|social security|bank account|credit card)/i.test(q)) return true;

  return false;
}

/**
 * Detect SQL enumeration patterns (list all X)
 * Only match queries asking for SQL-backed entities (awards, ECs, programs, scholarships, competitions, colleges, outcomes, publications)
 */
export function isEnumeration(query: string): boolean {
  const q = query.toLowerCase();

  // List/show MY SQL entities (not artifacts, quotes, chips, etc.)
  if (/(list|show|enumerate|give me).*(my|all my).*(award|ec|extracurricular|program|scholarship|competition|college|outcome|publication)/i.test(q)) return true;

  // List/show ALL SQL entities (Fixes: J37 - "Show all competitions entered")
  if (/(list|show|enumerate).*(all).*(award|ec|extracurricular|program|scholarship|competition|college|outcome|publication)/i.test(q)) return true;

  // What/which SQL entities did I...
  if (/(what|which).*(award|ec|extracurricular|program|scholarship|competition|college|outcome|publication).*(did i|have i|do i)/i.test(q)) return true;

  return false;
}

/**
 * Detect filter/subset patterns
 */
export function hasFilters(query: string): boolean {
  const q = query.toLowerCase();

  // Tier filters
  if (/(national|regional|school|local).*(award|tier)/i.test(q)) return true;

  // Leadership filter
  if (/(leadership|lead|president|founder)/i.test(q)) return true;

  // Numeric filters
  if (/>\s*\d+|<\s*\d+|more than|less than|at least/i.test(q)) return true;

  // Status filters
  if (/(submitted|pending|todo|completed|accepted|rejected)/i.test(q)) return true;

  return false;
}

/**
 * Master shape analysis
 */
export interface QueryShapeAnalysis {
  isTemporal: boolean;
  isNumeric: boolean;
  isWhatIf: boolean;
  isSimulation: boolean;
  isParentBrief: boolean;
  isClarifier: boolean;
  isPolicyViolation: boolean;
  isPrivacyViolation: boolean;
  isEnumeration: boolean;
  hasFilters: boolean;
  suggestedRoute?: "sql" | "kb" | "hybrid" | "clarify" | "refuse";
}

export function analyzeQueryShape(query: string): QueryShapeAnalysis {
  const analysis: QueryShapeAnalysis = {
    isTemporal: isTemporalCompare(query),
    isNumeric: asksForNumberOrPreciseFact(query),
    isWhatIf: isWhatIf(query),
    isSimulation: isSimulationOrPriority(query),
    isParentBrief: isParentBrief(query),
    isClarifier: isClarifier(query),
    isPolicyViolation: isPolicyRefusal(query),
    isPrivacyViolation: isPrivacyRequest(query),
    isEnumeration: isEnumeration(query),
    hasFilters: hasFilters(query)
  };

  // Determine suggested route based on shape
  if (analysis.isPolicyViolation || analysis.isPrivacyViolation) {
    analysis.suggestedRoute = "refuse";
  } else if (analysis.isClarifier) {
    analysis.suggestedRoute = "clarify";
  } else if (analysis.isWhatIf || analysis.isSimulation || analysis.isParentBrief) {
    analysis.suggestedRoute = "hybrid";
  } else if (analysis.isTemporal || analysis.isNumeric || analysis.isEnumeration) {
    analysis.suggestedRoute = "sql";
  }

  return analysis;
}

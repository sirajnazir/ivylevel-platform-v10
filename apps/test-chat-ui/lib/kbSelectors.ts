/**
 * KB Selectors
 *
 * Specialized selection and filtering logic for specific intent types
 * to ensure we return the most relevant chips for handoff, proof-links, etc.
 */

export interface Hit {
  id: string;
  type: string;
  score: number;
  namespace?: string;
  metadata?: Record<string, any>;
  text?: string;
}

/**
 * Select chips for assessment-to-week1 handoff
 */
export function selectHandoffChips(hits: Hit[]): Hit[] {
  if (!hits || hits.length === 0) return [];

  // Handoff needs:
  // 1. Assessment chips (ASSESS-)
  // 2. Gameplan chips (GAMEPLAN-)
  // 3. Early week execution chips (W001-, W002-)

  const handoffChips = hits.filter(hit => {
    const id = hit.id || "";
    return /ASSESS-|GAMEPLAN-|W00[12]-/.test(id);
  });

  // Sort by relevance: Assessment > GamePlan > W001 > W002
  handoffChips.sort((a, b) => {
    const priority = (id: string) => {
      if (/ASSESS-/.test(id)) return 1;
      if (/GAMEPLAN-/.test(id)) return 2;
      if (/W001-/.test(id)) return 3;
      if (/W002-/.test(id)) return 4;
      return 5;
    };

    const priA = priority(a.id);
    const priB = priority(b.id);

    if (priA !== priB) return priA - priB;
    return (b.score || 0) - (a.score || 0); // Then by score
  });

  return handoffChips.slice(0, 10);
}

/**
 * Select chips that provide proof/evidence for week-1 execution
 */
export function selectProofLinksWeek1(hits: Hit[]): Hit[] {
  if (!hits || hits.length === 0) return [];

  // Proof links need:
  // 1. Result chips (RESULT)
  // 2. Tactic chips (TACTIC)
  // 3. Framework chips (FRAMEWORK)
  // 4. Insight chips (INSIGHT)
  // From early weeks (W001-, W002-)

  const proofChips = hits.filter(hit => {
    const id = hit.id || "";
    const type = hit.type || "";

    const isEarlyWeek = /W00[12]-/.test(id);
    const isProofType = /RESULT|TACTIC|FRAMEWORK|INSIGHT/.test(type) || /RESULT|TACTIC|FRAMEWORK|INSIGHT/.test(id);

    return isEarlyWeek && isProofType;
  });

  // Sort by type priority then score
  proofChips.sort((a, b) => {
    const typePriority = (hit: Hit) => {
      const combined = `${hit.id}${hit.type}`;
      if (/RESULT/.test(combined)) return 1;
      if (/TACTIC/.test(combined)) return 2;
      if (/FRAMEWORK/.test(combined)) return 3;
      if (/INSIGHT/.test(combined)) return 4;
      return 5;
    };

    const priA = typePriority(a);
    const priB = typePriority(b);

    if (priA !== priB) return priA - priB;
    return (b.score || 0) - (a.score || 0);
  });

  return proofChips.slice(0, 10);
}

/**
 * Select framework catalog chips
 */
export function selectFrameworks(hits: Hit[]): Hit[] {
  if (!hits || hits.length === 0) return [];

  const frameworks = hits.filter(hit => {
    const id = hit.id || "";
    const type = hit.type || "";
    return /FRAMEWORK-|Framework_Chip/.test(id) || /Framework/.test(type);
  });

  return frameworks.slice(0, 10);
}

/**
 * Select message template chips
 */
export function selectMessageTemplates(hits: Hit[]): Hit[] {
  if (!hits || hits.length === 0) return [];

  const templates = hits.filter(hit => {
    const type = hit.type || "";
    return /Message_Template_Chip|Template/.test(type);
  });

  return templates.slice(0, 5);
}

/**
 * Select trust/parent-related chips
 */
export function selectTrustChips(hits: Hit[]): Hit[] {
  if (!hits || hits.length === 0) return [];

  const trust = hits.filter(hit => {
    const type = hit.type || "";
    const id = hit.id || "";
    return /Trust_Chip|TRUST-|PARENT-/.test(type) || /Trust_Chip|TRUST-|PARENT-/.test(id);
  });

  return trust.slice(0, 8);
}

/**
 * Select assessment chips
 */
export function selectAssessmentChips(hits: Hit[]): Hit[] {
  if (!hits || hits.length === 0) return [];

  const assessment = hits.filter(hit => {
    const id = hit.id || "";
    const type = hit.type || "";
    return /ASSESS-|Assessment_Chip/.test(id) || /Assessment/.test(type);
  });

  return assessment.slice(0, 10);
}

/**
 * Select strategy chips for college selection
 */
export function selectStrategyChips(hits: Hit[]): Hit[] {
  if (!hits || hits.length === 0) return [];

  const strategy = hits.filter(hit => {
    const type = hit.type || "";
    const id = hit.id || "";
    return /Strategy_Chip|STRATEGY-|SCHOOL-FIT/.test(type) || /Strategy_Chip|STRATEGY-|SCHOOL-FIT/.test(id);
  });

  return strategy.slice(0, 8);
}

/**
 * Select coaching/mindset chips
 */
export function selectMindsetChips(hits: Hit[]): Hit[] {
  if (!hits || hits.length === 0) return [];

  const mindset = hits.filter(hit => {
    const type = hit.type || "";
    return /Mindset_Chip|Relatability_Chip/.test(type);
  });

  return mindset.slice(0, 8);
}

/**
 * Master selector - applies appropriate selection logic based on intent
 */
export function applyIntentSelector(intent: string, hits: Hit[]): Hit[] {
  if (!hits || hits.length === 0) return [];

  switch (intent) {
    case "handoff":
      return selectHandoffChips(hits);

    case "proof_links":
      return selectProofLinksWeek1(hits);

    case "frameworks.catalog":
    case "execution_framework":
      return selectFrameworks(hits);

    case "message_template":
    case "deadline_crunch":
      return selectMessageTemplates(hits);

    case "trust":
    case "escalation":
      return selectTrustChips(hits);

    case "assessment":
      return selectAssessmentChips(hits);

    case "strategy":
      return selectStrategyChips(hits);

    case "mindset":
    case "rejection_response":
      return selectMindsetChips(hits);

    default:
      // No specialized selector, return top hits by score
      return hits.slice(0, 10);
  }
}

/**
 * Filter hits by namespace preferences
 */
export function filterByNamespace(hits: Hit[], preferredNamespaces: string[]): Hit[] {
  if (!hits || hits.length === 0) return [];
  if (!preferredNamespaces || preferredNamespaces.length === 0) return hits;

  // Separate into preferred and others
  const preferred = hits.filter(h => preferredNamespaces.includes(h.namespace || ""));
  const others = hits.filter(h => !preferredNamespaces.includes(h.namespace || ""));

  // Return preferred first, then others
  return [...preferred, ...others];
}

/**
 * Deduplicate hits by ID
 */
export function deduplicateHits(hits: Hit[]): Hit[] {
  const seen = new Set<string>();
  const unique: Hit[] = [];

  for (const hit of hits) {
    if (!seen.has(hit.id)) {
      seen.add(hit.id);
      unique.push(hit);
    }
  }

  return unique;
}

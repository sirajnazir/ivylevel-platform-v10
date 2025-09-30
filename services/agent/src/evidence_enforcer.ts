import { child } from "@packages/logger";

const log = child({ svc: "evidence-enforcer" });

interface EvidenceChip {
  id?: string;
  text?: string;
  kind?: string;
  doc_name?: string;
  metadata?: any;
  canonical?: boolean;
}

interface EvidenceValidation {
  valid: boolean;
  issues: string[];
  fixedChips?: EvidenceChip[];
}

// Validate evidence meets requirements
export function validateEvidence(
  chips: EvidenceChip[],
  intent: string,
  message: string
): EvidenceValidation {
  const issues: string[] = [];
  
  // Rule 1: At least 1 chip required for factual queries
  if (isFactualQuery(message) && chips.length === 0) {
    issues.push("No evidence chips provided for factual query");
  }
  
  // Rule 2: No mixed kinds for structured intents
  const kinds = new Set(chips.map(c => c.kind).filter(k => k));
  if (kinds.size > 1 && isStructuredIntent(intent)) {
    issues.push(`Mixed kinds detected: ${Array.from(kinds).join(', ')}. Only single kind allowed for structured queries.`);
  }
  
  // Rule 3: Phase consistency
  const phases = new Set(chips.map(c => c.metadata?.phase).filter(p => p));
  if (phases.size > 1) {
    log.warn({ phases: Array.from(phases) }, "Multiple phases in evidence");
  }
  
  // Rule 4: Canon chip should come first if present
  const canonIndex = chips.findIndex(c => c.canonical);
  if (canonIndex > 0) {
    issues.push("Canonical chip should be first in evidence list");
  }
  
  // Rule 5: Maximum 3 chips
  if (chips.length > 3) {
    issues.push(`Too many evidence chips: ${chips.length}. Maximum is 3.`);
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}

// Fix evidence issues
export function fixEvidence(
  chips: EvidenceChip[],
  intent: string
): EvidenceChip[] {
  let fixed = [...chips];
  
  // Fix 1: Move canon chip to front
  const canonIndex = fixed.findIndex(c => c.canonical);
  if (canonIndex > 0) {
    const [canonChip] = fixed.splice(canonIndex, 1);
    fixed.unshift(canonChip);
  }
  
  // Fix 2: Limit to 3 chips
  if (fixed.length > 3) {
    fixed = fixed.slice(0, 3);
  }
  
  // Fix 3: Remove mixed kinds for structured intents
  if (isStructuredIntent(intent)) {
    const primaryKind = fixed[0]?.kind;
    if (primaryKind) {
      fixed = fixed.filter(c => c.kind === primaryKind);
    }
  }
  
  return fixed;
}

// Check if query is factual
function isFactualQuery(message: string): boolean {
  return /(score|gpa|list|status|deadline|how many|when|what is my|what's my|final|submitted)/i.test(message);
}

// Check if intent is structured
function isStructuredIntent(intent: string): boolean {
  return ['awards.list', 'awards.compare', 'sat.status', 'sat.timeline', 'apps.status', 'ecs.list']
    .includes(intent);
}

// Ensure evidence is cited in reply
export function ensureEvidenceCitation(
  reply: string,
  chips: EvidenceChip[]
): string {
  // Check if reply already has citations
  if (/\[source:|from your|according to|based on/i.test(reply)) {
    return reply;
  }
  
  // Add citation if missing
  if (chips.length > 0) {
    const source = chips[0].canonical 
      ? chips[0].doc_name || 'official records'
      : chips[0].metadata?.doc_name || 'transcript';
    
    // Add citation at the end if not present
    if (!reply.includes(source)) {
      reply += `\n\n[source: ${source}]`;
    }
  }
  
  return reply;
}

// Evidence quality scoring
export function scoreEvidenceQuality(chips: EvidenceChip[]): number {
  let score = 0;
  const weights = {
    hasCanon: 30,
    correctKind: 20,
    hasText: 15,
    hasMetadata: 10,
    recentWeek: 10,
    phaseMatch: 15
  };
  
  // Check each quality factor
  if (chips.some(c => c.canonical)) score += weights.hasCanon;
  if (chips.every(c => c.kind)) score += weights.correctKind;
  if (chips.every(c => c.text && c.text.length > 50)) score += weights.hasText;
  if (chips.every(c => c.metadata)) score += weights.hasMetadata;
  
  // Recent chips are better
  const weeks = chips.map(c => c.metadata?.week).filter(w => w);
  if (weeks.length > 0 && Math.max(...weeks) > 80) score += weights.recentWeek;
  
  // Phase consistency
  const phases = new Set(chips.map(c => c.metadata?.phase).filter(p => p));
  if (phases.size === 1) score += weights.phaseMatch;
  
  return score;
}

// Main evidence enforcement
export function enforceEvidence(
  chips: EvidenceChip[],
  reply: string,
  intent: string,
  message: string
): {
  chips: EvidenceChip[];
  reply: string;
  quality: number;
  warnings: string[];
} {
  // Validate evidence
  const validation = validateEvidence(chips, intent, message);
  
  // Fix if needed
  let finalChips = chips;
  if (!validation.valid) {
    log.warn({ issues: validation.issues }, "Evidence validation failed, attempting fixes");
    finalChips = fixEvidence(chips, intent);
  }
  
  // Ensure citation in reply
  const citedReply = ensureEvidenceCitation(reply, finalChips);
  
  // Score quality
  const quality = scoreEvidenceQuality(finalChips);
  
  return {
    chips: finalChips,
    reply: citedReply,
    quality,
    warnings: validation.issues
  };
}
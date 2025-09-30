// services/agent/src/facts/fact_synthesizer.ts
import type { UserIntent } from "../intent";
import { child } from "@packages/logger";
import { extractAwardsUniversal, parseNumberedInlineAwards, parseFinalAwardList as parseAppDocAwards } from "./award_parsers";

const log = child({ module: "fact_synthesizer" });

// Junk label / negative-pattern guards
const JUNK_LABELS = new Set([
  "awards and honors", "awards:", "honors:", "achievements:",
  "only 2 academic awards", // negative assessment line
  "extracurriculars:", "activities:", "ec list",
]);

function isJunkLine(s: string) {
  const t = s.toLowerCase().trim();
  if (JUNK_LABELS.has(t)) return true;
  // Very short or ends with colon → likely a section header
  if (t.length < 5 || /:$/.test(t)) return true;
  // Obvious meta/assessment phrases
  if (/only \d+ (academic|community) awards/i.test(t)) return true;
  return false;
}

function cleanAwardName(s: string) {
  return s
    .replace(/^["'\s\-•*]+/, "")
    .replace(/["']+$/, "")
    .replace(/\s+-\s+(International|National|Regional|State|School).*$/i, "")
    .trim();
}

function normalizeAwardName(s: string): string {
  return cleanAwardName(s);
}

export interface ExtractedFacts {
  awardsInitial?: string[];
  awardsWon?: string[];
  awardsCounts?: { academic?: number; community?: number; total?: number };
  satTimeline?: Array<{ date?: string; score: number }>;
  satSubmitted?: number | null;
  submissions?: Array<{ date: string; schools: string[] }>;
  gameplanLists?: {
    extracurriculars?: string[];
    awards?: string[];
  };
  keyFacts?: string[];
  // NEW: for comparisons
  _sources?: { initialAwards?: string[]; finalAwards?: string[] };
}

type SectionHint = "awards" | "extracurriculars";
type Scope = { topic?: "awards" | "ecs" | "sat" | "submissions"; phaseHint?: string; weekHint?: number };

function extractAwardsFromEvidenceItem(text: string, kind: string): string[] {
  // Use the universal parser
  const awards = extractAwardsUniversal(text, kind);
  
  // Additional logging for debugging
  if (awards.length > 0 && kind === 'GAMEPLAN') {
    log.info({ count: awards.length, first3: awards.slice(0, 3) }, "Extracted GAMEPLAN awards");
  }
  
  return awards;
}

// Keep old function for backward compatibility but delegate to new parser
function parseFinalAwardList(text: string): string[] {
  return parseAppDocAwards(text);
}

export function synthesizeFactsFromEvidence(evidence: any[], _scope: any): ExtractedFacts {
  const facts: ExtractedFacts = { keyFacts: [], _sources: {} as any };

  for (const item of evidence || []) {
    const text = item.text || item.content || "";
    const kind = item.kind || item.metadata?.kind || "";

    // Extract awards using universal parser
    const extractedAwards = extractAwardsFromEvidenceItem(text, kind);
    
    // Final awards (APP-DOC)
    if (/APP-DOC/i.test(kind) && (/Final\s+Award\s+List/i.test(text) || /actually won/i.test(text))) {
      if (extractedAwards.length) {
        facts.awardsWon = extractedAwards;
        (facts._sources as any).finalAwards = extractedAwards;
      }
    } 
    // Initial awards (GAMEPLAN)
    else if (/GAMEPLAN/i.test(kind) && /award/i.test(text)) {
      if (extractedAwards.length) {
        facts.awardsInitial = extractedAwards;
        (facts._sources as any).initialAwards = extractedAwards;
      }
    }

    // SAT timeline extraction
    const arrowSeq = text.match(/(\d{3,4})(?:\s*[→\-–>\s]\s*)(\d{3,4}(?:\s*[→\-–>\s]\s*\d{3,4})*)/g);
    if (arrowSeq) {
      facts.satTimeline ??= [];
      const nums = arrowSeq.join(" ").match(/\b(1[0-5]\d{2}|1600|\d{3})\b/g);
      if (nums) {
        for (const n of nums) {
          const score = parseInt(n, 10);
          if (score >= 400 && score <= 1600) facts.satTimeline.push({ score });
        }
      }
    }
    const satSimple = text.match(/SAT[:\s]+(1[0-5]\d{2}|1600|\d{3})/gi);
    if (satSimple) {
      facts.satTimeline ??= [];
      for (const m of satSimple) {
        const sc = parseInt((m.match(/\d{3,4}/) || [])[0] || "0", 10);
        if (sc >= 400 && sc <= 1600) facts.satTimeline.push({ score: sc });
      }
    }
    const submitted = text.match(/(submitted|submit).*?(SAT).*?(\d{3,4})/i);
    if (submitted) {
      const sc = parseInt(submitted[3], 10);
      if (sc >= 400 && sc <= 1600) facts.satSubmitted = sc;
    }
  }

  // Dedup SAT
  if (facts.satTimeline) {
    const seen = new Set<number>();
    facts.satTimeline = facts.satTimeline.filter(s => {
      if (seen.has(s.score)) return false;
      seen.add(s.score);
      return true;
    });
  }

  // Dedup awards + normalize
  const dedupeAwards = (awards: string[] | undefined) => {
    if (!awards) return undefined;
    const norm = new Map<string,string>();
    for (const a of awards) {
      const k = a.toLowerCase().replace(/\s+/g," ").trim();
      if (!JUNK_LABELS.has(k) && !/only \d+/.test(k)) {
        if (!norm.has(k)) norm.set(k, a);
      }
    }
    return [...norm.values()];
  };
  
  if (facts.awardsInitial) facts.awardsInitial = dedupeAwards(facts.awardsInitial);
  if (facts.awardsWon) facts.awardsWon = dedupeAwards(facts.awardsWon);
  if (facts.gameplanLists?.awards) facts.gameplanLists.awards = dedupeAwards(facts.gameplanLists.awards);

  return facts;
}
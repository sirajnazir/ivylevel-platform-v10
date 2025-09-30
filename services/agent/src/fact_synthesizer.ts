// services/agent/src/fact_synthesizer.ts

/**
 * Evidence-aware, metadata-weighted fact synthesizer
 * - Disambiguates INITIAL (Week 0 GamePlan) vs FINAL (Apps) using metadata.kind/phase/week + text cues
 * - Prefers Vitals (if provided) for SAT/GPA when available
 * - Extracts: SAT timeline, submissions (basic), GamePlan lists (ECs, awards), and key facts
 * - Returns de-duplicated, scored results with optional provenance
 */

export type EvidenceKind =
  | "TRANS-INTEL"
  | "EXEC-INTEL"
  | "IMSG-INTEL"
  | "APP-DOC"
  | "GAMEPLAN"
  | string;

export interface EvidenceMeta {
  kind?: EvidenceKind;
  week?: number | null;
  phase?: string | null; // e.g., P1, P2...
  doc_name?: string;
  link?: string;
  student?: string;
  coach?: string;
  // passthrough for any other metadata
  [k: string]: any;
}

export interface EvidenceItem {
  text?: string;
  content?: string;
  score?: number;
  metadata?: EvidenceMeta;
}

export interface ExtractedFacts {
  satTimeline?: Array<{ date?: string; score: number }>;
  satCurrent?: number;

  // Basic inference of score submission moments
  submissions?: Array<{ date: string; schools: string[] }>;

  // Disambiguated lists
  gameplanLists?: {
    extracurriculars?: string[]; // Prefer INITIAL (Week 0) list
    awards?: string[];           // Prefer INITIAL (Week 0) list
  };

  // OPTIONAL: final lists if present (kept separate to avoid confusion)
  finalLists?: {
    extracurriculars?: string[];
    awards?: string[];
  };

  // Handy quick grabs
  keyFacts?: string[];
}

export interface ExtractedFactsWithProvenance extends ExtractedFacts {
  _provenance?: {
    satTimeline?: number[]; // indices of evidence used
    gameplanECs?: number[];
    gameplanAwards?: number[];
    finalECs?: number[];
    finalAwards?: number[];
    submissions?: number[];
    keyFacts?: number[];
  };
}

/** Public API (kept for backward compatibility) */
export function synthesizeFactsFromEvidence(
  evidence: EvidenceItem[],
  opts?: { vitals?: any }
): ExtractedFacts {
  const out = extractFactsWithProvenance(evidence, opts);
  // strip provenance for legacy callers
  const { _provenance, ...facts } = out;
  return facts;
}

/** New: richer API with provenance for orchestrator usage */
export function extractFactsWithProvenance(
  evidence: EvidenceItem[],
  opts?: { vitals?: any; preferInitial?: boolean; queryHint?: string }
): ExtractedFactsWithProvenance {
  const vitals = opts?.vitals;
  const query = (opts?.queryHint || "").toLowerCase();

  const wantInitial = /(^|\b)(initial|week\s*0|assessment|game\s*plan)\b/i.test(opts?.queryHint || "");
  const wantFinal =
    /(^|\b)(final|submitted|outcomes|apps?|common\s*app|uc\s*app)\b/i.test(opts?.queryHint || "");

  const result: ExtractedFactsWithProvenance = {
    _provenance: {},
  };

  // 0) SAT/GPA fast path from vitals if available
  if (vitals?.academics?.sat?.timeline?.length) {
    const vt: Array<{ date?: string; score?: number }> = vitals.academics.sat.timeline;
    const sorted = vt
      .filter(t => typeof t.score === "number")
      .sort((a, b) => (String(a.date || "")).localeCompare(String(b.date || "")));

    result.satTimeline = sorted.map(t => ({ date: t.date, score: t.score! }));
    if (sorted.length) {
      result.satCurrent = sorted[sorted.length - 1].score!;
    }
  }

  // 1) Score each evidence item for INITIAL vs FINAL relevance
  const scored = evidence.map((ev, idx) => {
    const text = (ev.text ?? ev.content ?? "").slice(0, 6500);
    const md = ev.metadata || {};

    const base = typeof ev.score === "number" ? ev.score : 0.0;

    // Heuristic weights
    const isInitialMeta =
      md.kind === "GAMEPLAN" ||
      md.kind === "TRANS-INTEL" ||
      (md.phase && /^p?1$/i.test(md.phase)) ||
      (typeof md.week === "number" && md.week >= 0 && md.week <= 6);

    const isFinalMeta =
      md.kind === "APP-DOC" ||
      /submitted|final/i.test(text) ||
      (md.phase && /^p?5$/i.test(md.phase));

    let wInitial = base;
    let wFinal = base;

    if (isInitialMeta) wInitial += 0.6;
    if (isFinalMeta) wFinal += 0.6;

    // Query-hint nudges
    if (wantInitial) wInitial += 0.4;
    if (wantFinal) wFinal += 0.4;

    // Text cues
    if (/initial|week\s*0|assessment|game\s*plan/i.test(text)) wInitial += 0.3;
    if (/final|submitted|apps?|common\s*app|uc\s*app/i.test(text)) wFinal += 0.3;

    return { idx, text, md, wInitial, wFinal };
  });

  // 2) Parse SAT, submissions, lists from evidence (with preference ordering)
  const initialOrdered = [...scored].sort((a, b) => b.wInitial - a.wInitial);
  const finalOrdered = [...scored].sort((a, b) => b.wFinal - a.wFinal);

  // SAT from evidence (only if vitals didn't already give a clean answer)
  if (!result.satTimeline?.length) {
    const satFacts = pickFirstSatTimeline(initialOrdered) || pickFirstSatTimeline(finalOrdered);
    if (satFacts?.timeline?.length) {
      result.satTimeline = satFacts.timeline;
      result.satCurrent = satFacts.timeline[satFacts.timeline.length - 1]?.score;
      result._provenance!.satTimeline = [satFacts.evidenceIdx];
    }
  }

  // Submissions (basic)
  {
    const subs = extractSubmissions(initialOrdered) || extractSubmissions(finalOrdered);
    if (subs?.list.length) {
      result.submissions = dedupeObjArray([...result.submissions ?? [], ...subs.list], objKey);
      result._provenance!.submissions = uniq([...(result._provenance!.submissions ?? []), subs.evidenceIdx]);
    }
  }

  // ECs/Awards — INITIAL (GamePlan) lists
  {
    const fromInitial = extractECsAwards(initialOrdered, { prefer: "initial" });
    if (fromInitial.ecs.length) {
      result.gameplanLists ??= {};
      result.gameplanLists.extracurriculars = dedupeStr([...fromInitial.ecs]);
      result._provenance!.gameplanECs = [fromInitial.evidenceIdx];
    }
    if (fromInitial.awards.length) {
      result.gameplanLists ??= {};
      result.gameplanLists.awards = dedupeStr([...fromInitial.awards]);
      result._provenance!.gameplanAwards = [fromInitial.evidenceIdx];
    }
  }

  // ECs/Awards — FINAL (Apps/outcomes) lists
  {
    const fromFinal = extractECsAwards(finalOrdered, { prefer: "final" });
    if (fromFinal.ecs.length) {
      result.finalLists ??= {};
      result.finalLists.extracurriculars = dedupeStr([...(result.finalLists.extracurriculars ?? []), ...fromFinal.ecs]);
      result._provenance!.finalECs = uniq([...(result._provenance!.finalECs ?? []), fromFinal.evidenceIdx]);
    }
    if (fromFinal.awards.length) {
      result.finalLists ??= {};
      result.finalLists.awards = dedupeStr([...(result.finalLists.awards ?? []), ...fromFinal.awards]);
      result._provenance!.finalAwards = uniq([...(result._provenance!.finalAwards ?? []), fromFinal.evidenceIdx]);
    }
  }

  // Key facts (quick picks; keep yours but add provenance + dedupe)
  {
    const k = extractKeyFacts(initialOrdered, finalOrdered);
    if (k.items.length) {
      result.keyFacts = dedupeStr([...(result.keyFacts ?? []), ...k.items]);
      result._provenance!.keyFacts = uniq([...(result._provenance!.keyFacts ?? []), ...k.provIdxs]);
    }
  }

  // Final dedupe/cleanup
  if (result.satTimeline?.length) {
    const best = dedupeSatByScore(result.satTimeline);
    result.satTimeline = best.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    result.satCurrent = best[best.length - 1]?.score ?? result.satCurrent;
  }
  if (result.gameplanLists?.extracurriculars) {
    result.gameplanLists.extracurriculars = compactLongish(result.gameplanLists.extracurriculars);
  }
  if (result.gameplanLists?.awards) {
    result.gameplanLists.awards = compactLongish(result.gameplanLists.awards);
  }
  if (result.finalLists?.extracurriculars) {
    result.finalLists.extracurriculars = compactLongish(result.finalLists.extracurriculars);
  }
  if (result.finalLists?.awards) {
    result.finalLists.awards = compactLongish(result.finalLists.awards);
  }

  return result;
}

/** Optional helper to render a Jenny-style answer deterministically */
export function composeAnswerFromFacts(
  query: string,
  facts: ExtractedFacts,
  opts?: { preferInitial?: boolean }
): { reply: string } {
  const q = query.toLowerCase();
  const lines: string[] = [];

  // SAT
  if (q.includes("sat")) {
    if (facts.satTimeline?.length) {
      const tl = facts.satTimeline.map(s => s.score).filter(Boolean).join(" → ");
      lines.push(`Your SAT progression: **${tl}**.`);
    }
    if (typeof facts.satCurrent === "number") {
      lines.push(`Current best: **${facts.satCurrent}**.`);
    }
  }

  // ECs/Awards with initial/final disambiguation
  const wantInitial = opts?.preferInitial ?? /\b(initial|week\s*0|assessment|game\s*plan)\b/i.test(query);
  if (/(award|awards|ec|activities)/i.test(query)) {
    if (wantInitial) {
      if (facts.gameplanLists?.awards?.length) {
        lines.push(`**Initial GamePlan awards** (Week 0):`);
        lines.push(listify(facts.gameplanLists.awards));
      }
      if (facts.gameplanLists?.extracurriculars?.length) {
        lines.push(`**Initial GamePlan ECs**:`);
        lines.push(listify(facts.gameplanLists.extracurriculars));
      }
    } else {
      if (facts.finalLists?.awards?.length) {
        lines.push(`**Final awards (submitted/outcomes)**:`);
        lines.push(listify(facts.finalLists.awards));
      }
      if (facts.finalLists?.extracurriculars?.length) {
        lines.push(`**Final ECs (submitted/outcomes)**:`);
        lines.push(listify(facts.finalLists.extracurriculars));
      }
    }
  }

  if (!lines.length) {
    lines.push("I pulled relevant records but didn't extract enough specifics. Want me to open the underlying docs and fill the exact items?");
  }

  return { reply: lines.join("\n") };
}

/* --------------------------- Internals / helpers --------------------------- */

const SAT_SCORE_RE = /\b(1[0-5]\d{2}|1600|[6-9]\d{2})\b/g; // conservative 600-1600; adjust if needed
const DATE_ISO_RE = /\b(20\d{2}[-/\.]\d{1,2}[-/\.]\d{1,2})\b/;
const DATE_LONG_RE = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},\s+20\d{2}\b/i;

function normalizeDate(str?: string): string | undefined {
  if (!str) return undefined;
  const iso = str.match(DATE_ISO_RE)?.[1];
  if (iso) return iso.replace(/[\.]/g, "-");
  const long = str.match(DATE_LONG_RE)?.[0];
  return long || undefined;
}

function dedupeStr(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of arr.map(x => x.trim()).filter(Boolean)) {
    const k = s.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(s);
    }
  }
  return out;
}

function compactLongish(arr: string[], min = 2, max = 160): string[] {
  return arr
    .map(s => s.trim())
    .filter(s => s.length >= min && s.length <= max);
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function objKey(o: any): string {
  return JSON.stringify(o);
}
function dedupeObjArray<T>(arr: T[], keyFn: (t: T) => string): T[] {
  const m = new Map<string, T>();
  for (const t of arr) m.set(keyFn(t), t);
  return Array.from(m.values());
}

function dedupeSatByScore(items: Array<{ date?: string; score: number }>) {
  const byScore = new Map<number, { date?: string; score: number }>();
  for (const it of items) {
    if (!byScore.has(it.score) || (it.date && !byScore.get(it.score)?.date)) {
      byScore.set(it.score, it);
    }
  }
  return Array.from(byScore.values());
}

function parseSatScoresWithOptionalDate(text: string): Array<{ date?: string; score: number }> {
  const found: Array<{ date?: string; score: number }> = [];
  // Look for date nearby (+/- 60 chars)
  const matches = Array.from(text.matchAll(SAT_SCORE_RE));
  for (const m of matches) {
    const score = parseInt(m[0], 10);
    if (isNaN(score) || score < 400 || score > 1600) continue;
    const start = Math.max(0, (m.index ?? 0) - 60);
    const end = Math.min(text.length, (m.index ?? 0) + 60);
    const window = text.slice(start, end);
    const date = normalizeDate(window);
    found.push({ date, score });
  }
  return found;
}

function extractBulletedOrNumberedLists(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const items: string[] = [];
  for (const line of lines) {
    const m = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.+?)\s*$/);
    if (m && m[1]) {
      const s = m[1].trim();
      if (s && !/^(hr\/wk|continue)$/i.test(s)) items.push(s);
    }
  }
  return items;
}

function pickFirstSatTimeline(
  ordered: Array<{ idx: number; text: string; md: EvidenceMeta; wInitial: number; wFinal: number }>
): { timeline: Array<{ date?: string; score: number }>; evidenceIdx: number } | null {
  for (const h of ordered.slice(0, 8)) {
    const tl = parseSatScoresWithOptionalDate(h.text);
    if (tl.length >= 2) {
      // sort by date if present, else by score asc
      const dated = tl.filter(x => !!x.date);
      const timeline = dated.length
        ? tl.sort((a, b) => (a.date || "").localeCompare(b.date || ""))
        : tl.sort((a, b) => a.score - b.score);
      return { timeline, evidenceIdx: h.idx };
    }
  }
  return null;
}

function extractSubmissions(
  ordered: Array<{ idx: number; text: string; md: EvidenceMeta; wInitial: number; wFinal: number }>
): { list: Array<{ date: string; schools: string[] }>; evidenceIdx: number } | null {
  for (const h of ordered.slice(0, 10)) {
    const text = h.text;
    if (!/submitted/i.test(text)) continue;
    const dates: string[] = [];
    const iso = text.match(DATE_ISO_RE)?.[1];
    if (iso) dates.push(iso.replace(/[\.]/g, "-"));
    const longAll = Array.from(text.matchAll(DATE_LONG_RE)).map(m => m[0]);
    dates.push(...longAll);

    if (!dates.length) continue;

    // naive school extraction
    const schools: string[] = [];
    const schoolRe = /\b(Stanford|MIT|Harvard|Berkeley|UCLA|UC\s?[A-Z][a-z]+|Cornell|Columbia|Princeton|Yale|Duke|CMU|Georgia Tech|NYU|Northwestern)\b/g;
    for (const m of text.matchAll(schoolRe)) {
      schools.push(m[0]);
    }

    const list = dates.map(d => ({ date: d, schools: dedupeStr(schools) }));
    return { list, evidenceIdx: h.idx };
  }
  return null;
}

function extractECsAwards(
  ordered: Array<{ idx: number; text: string; md: EvidenceMeta; wInitial: number; wFinal: number }>,
  cfg: { prefer: "initial" | "final" }
): { ecs: string[]; awards: string[]; evidenceIdx: number } {
  const ecsOut: string[] = [];
  const awdOut: string[] = [];

  for (const h of ordered.slice(0, 12)) {
    const t = h.text;
    const isAppDoc = h.md.kind === "APP-DOC" || /Final Award List|Award List|Common App/i.test(t);
    const isInitialCue =
      h.md.kind === "GAMEPLAN" ||
      h.md.kind === "TRANS-INTEL" ||
      (h.md.phase && /^p?1$/i.test(h.md.phase)) ||
      /initial|week\s*0|assessment|game\s*plan/i.test(t);

    // Respect preference:
    if (cfg.prefer === "initial" && !isInitialCue) continue;
    if (cfg.prefer === "final" && !isAppDoc) continue;

    // Try bullet/numbered lists
    const items = extractBulletedOrNumberedLists(t);

    // If no bullets, try loose splits (commas/semicolons)
    let loose: string[] = [];
    if (items.length < 3) {
      const maybeList = t.split(/\n/).find(l => /(Awards|Honors|ECs|Activities)[:\s]/i.test(l));
      if (maybeList) {
        loose = maybeList
          .replace(/^(Awards|Honors|ECs|Activities)[:\s-]*/i, "")
          .split(/[;,|]/)
          .map(s => s.trim())
          .filter(Boolean);
      }
    }

    const cleaned = dedupeStr([...items, ...loose])
      .map(s => s.replace(/\s+-\s+(International|National|Regional|State|School).*$/i, "").trim())
      .filter(s => s.length > 2);

    if (!cleaned.length) continue;

    // naive routing: if contains "award", "honor", "scholar" → awards; else EC
    const awards = cleaned.filter(s => /\b(award|honor|scholar|prize|competition|finalist|winner)\b/i.test(s));
    const ecs = cleaned.filter(s => !awards.includes(s));

    ecsOut.push(...ecs);
    awdOut.push(...awards);

    // Return on first strong hit per preference to avoid mixing sources
    if ((ecsOut.length + awdOut.length) >= 4) {
      return { ecs: ecsOut, awards: awdOut, evidenceIdx: h.idx };
    }
  }

  // If nothing strong, return best we have from top item
  const firstIdx = ordered[0]?.idx ?? -1;
  return { ecs: ecsOut, awards: awdOut, evidenceIdx: firstIdx };
}

function extractKeyFacts(
  initialOrdered: Array<{ idx: number; text: string }>,
  finalOrdered: Array<{ idx: number; text: string }>
): { items: string[]; provIdxs: number[] } {
  const items: string[] = [];
  const prov: number[] = [];

  function scan(h: { idx: number; text: string }) {
    // GPA
    const gpa = h.text.match(/\bGPA[:\s]*([\d.]{3,4})\b/i);
    if (gpa) { items.push(`GPA: ${gpa[1]}`); prov.push(h.idx); }

    // NCWIT
    const ncwit = h.text.match(/\bNCWIT\b.*?\b(winner|finalist|honorable|recipient)\b/i);
    if (ncwit) { items.push(`NCWIT ${ncwit[1]}`); prov.push(h.idx); }

    // Synthoria students
    const syn = h.text.match(/\bSynthoria\b.*?(\d{3,})\s*students/i);
    if (syn) { items.push(`Synthoria reached ${syn[1]} students`); prov.push(h.idx); }
  }

  for (const h of initialOrdered.slice(0, 8)) scan(h);
  for (const h of finalOrdered.slice(0, 8)) scan(h);

  return { items: dedupeStr(items), provIdxs: uniq(prov) };
}

function listify(arr: string[]): string {
  return arr.slice(0, 10).map((s, i) => `${i + 1}. ${s}`).join("\n");
}
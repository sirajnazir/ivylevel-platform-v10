import { CANON_REGISTRY } from "./canon/registry";
import { detectCanonKey } from "./canon/detect";
import { pickInitialEvidence } from "./facts/initial_selector";
import { synthesizeFactsFromEvidence } from "./facts/fact_synthesizer";
import { compareAwardSets } from "./facts/compare";
import { composeJennyReply } from "./reply/jenny_composer";
import { getVitals, satFromVitals } from "./vitals/fetch";
import { child } from "@packages/logger";

const log = child({ svc: "agent" });

async function canonPassSearch(studentId: string, canonKey: string, message: string, k = 8) {
  const canon = CANON_REGISTRY[canonKey as keyof typeof CANON_REGISTRY];
  if (!canon) return [];
  const filter = { kind: { $in: canon.kind } };

  const r1 = await fetch(process.env.RETRIEVER_URL || "http://localhost:4102/search", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ q: message, k, filter })
  });
  let hits: any[] = await r1.json().catch(() => []);

  // Pin by doc_name hints
  const hints = canon.nameHints.map(h => h.toLowerCase());
  hits = hits.map(h => {
    const name = (h.doc_name || h.metadata?.doc_name || "").toLowerCase();
    const bonus = hints.some(hh => name.includes(hh)) ? canon.boost : 0;
    return { ...h, _canonScore: (h.score||0) + bonus };
  }).sort((a,b) => (b._canonScore||0) - (a._canonScore||0));

  log.info({ canonKey, top: hits[0]?.doc_name }, "canon-pass.selected");
  return hits;
}

async function retrieverSearch(q: string, k = 8, filter?: any) {
  const r = await fetch(process.env.RETRIEVER_URL || "http://localhost:4102/search", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ q, k, filter })
  });
  return await r.json().catch(() => []);
}

export async function respond(message: string, state: any) {
  const { studentId = "huda" } = state || {};
  const canonKey = detectCanonKey(message);

  // 0) SAT from vitals (if query hints 'sat')
  const isSatIntent = /sat/i.test(message);
  let vitals = null;
  let vitalsSat: { timeline?: any[]; submitted?: number | null } | null = null;
  if (isSatIntent) {
    vitals = await getVitals(studentId);
    const sat = satFromVitals(vitals);
    if (sat?.timeline?.length) vitalsSat = sat;
  }

  // 1) Canon-first retrieval
  let evidence: any[] = [];
  if (canonKey) evidence = await canonPassSearch(studentId, canonKey, message, 10);

  // 2) Guarded fallback if canon is empty or looks junky
  const looksJunky = (arr: any[]) => {
    const joined = (arr.map(x=>x.text||"").join(" ").toLowerCase());
    return /(awards and honors|only \d+ academic|activities:)/.test(joined);
  };
  if (!evidence?.length || looksJunky(evidence)) {
    const q2 = /award/i.test(message) && /(final|actually won|won so far)/i.test(message)
      ? "Final Award List - International - National"
      : message;
    const filter = /award/i.test(message) ? { kind: { $in: ["APP-DOC","GAMEPLAN"] } } : undefined;
    const fallback = await retrieverSearch(q2, 10, filter);
    if (fallback?.length) evidence = fallback;
    log.warn({ reason: "fallback", q2, count: evidence?.length }, "retrieval.fallback.used");
  }

  // 3) Select and synthesize
  const selected = pickInitialEvidence(evidence, { message });
  let facts = synthesizeFactsFromEvidence(selected, { message });

  // 4) If SAT: merge vitals-first
  if (vitalsSat) {
    facts = facts || {};
    facts.satTimeline = vitalsSat.timeline?.length ? vitalsSat.timeline : facts.satTimeline;
    facts.satSubmitted = typeof vitalsSat.submitted === "number" ? vitalsSat.submitted : facts.satSubmitted ?? null;
  }

  // 5) If comparison intent: compute set ops (initial vs final)
  const wantsCompare = /compare|gap|vs/i.test(message) && /award/i.test(message);
  let comparison: any = null;
  if (wantsCompare) {
    // Pull both sets deterministically
    const initialHits = await canonPassSearch(studentId, "GAMEPLAN_INITIAL_AWARDS", "initial awards gameplan", 8);
    const finalHits = await canonPassSearch(studentId, "APP_FINAL_AWARDS_STRICT", "final award list", 8);
    const initialFacts = synthesizeFactsFromEvidence(initialHits, { message: "initial awards" });
    const finalFacts = synthesizeFactsFromEvidence(finalHits, { message: "final awards" });

    const initial = initialFacts.gameplanLists?.awards || [];
    const actual = finalFacts.gameplanLists?.awards || [];
    comparison = compareAwardSets(initial, actual);

    // Merge into main facts (so composer can render)
    facts = facts || {};
    (facts as any)._sources = { initialAwards: initial, finalAwards: actual };
    (facts as any).comparison = comparison;
  }

  // 6) Compose deterministically in Jenny voice if we have any solid facts
  const haveAwards = facts?.gameplanLists?.awards?.length;
  const haveSat = facts?.satTimeline?.length;
  if (haveAwards || haveSat || comparison) {
    const reply = composeJennyReply(message, facts, { persona: "jenny" });
    return {
      reply,
      evidence_chips: (selected || []).slice(0,3).map((h:any) => ({
        title: h.doc_name || h.metadata?.doc_name || h.title,
        kind: h.kind, link: h.link, week: h.week, phase: h.phase
      })),
      state
    };
  }

  // 7) If still thin → last resort fallback re-query with anchors
  if (/award/i.test(message)) {
    const anchors = [
      "Final Award List - International - National",
      "Common App Final Awards",
      "NCWIT AP Scholar College Board Award"
    ];
    for (const a of anchors) {
      const hits = await retrieverSearch(a, 8, { kind: { $in: ["APP-DOC","GAMEPLAN"] } });
      const pick = pickInitialEvidence(hits, { message });
      const f2 = synthesizeFactsFromEvidence(pick, { message });
      if (f2?.gameplanLists?.awards?.length) {
        const reply = composeJennyReply(message, f2, { persona: "jenny" });
        return { reply, evidence_chips: pick.slice(0,3), state };
      }
    }
  }

  // 8) Final fallback: generic response
  return {
    reply: "I'm on it — give me a nudge if you want me to pull the exact doc name while I fetch the specifics.",
    evidence_chips: [],
    state
  };
}
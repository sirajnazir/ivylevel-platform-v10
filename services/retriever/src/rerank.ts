// services/retriever/src/rerank.ts
import type { Hit } from "./types";

// intent-aware weights
const WEIGHTS = {
  gameplanForInitial:  5,   // initial -> GAMEPLAN
  appdocForActual:     5,   // actual  -> APP-DOC
  transIntelBoost:     1.5, // general boost for context
  execIntelPenalty:   -1,   // avoid weekly when looking for canonical lists
  referencePenalty:   -2,   // architecture/pattern docs
};

type IntentHint = { timeframe?: string; topic?: string };

export function globalReRank(hits: Hit[], userQuery: string, hint?: IntentHint): Hit[] {
  const q = userQuery.toLowerCase();
  const timeframe = hint?.timeframe || (
    /(initial|game\s*plan|gameplan)/.test(q) ? "initial" :
    /(actually|won|final|outcome|accepted)/.test(q) ? "actual" : "unspecified"
  );

  const scored = hits.map(h => {
    const kind = (h.metadata?.kind || "").toUpperCase();
    let s = h.score ?? 0;

    // prefer by intent
    if (timeframe === "initial" && kind === "GAMEPLAN") s += WEIGHTS.gameplanForInitial;
    if (timeframe === "actual"  && kind === "APP-DOC")  s += WEIGHTS.appdocForActual;

    // light boosts/penalties
    if (/TRANS-INTEL/i.test(kind)) s += WEIGHTS.transIntelBoost;
    if (/EXEC-INTEL/i.test(kind))  s += WEIGHTS.execIntelPenalty;
    if (/REFERENCE/i.test(kind))   s += WEIGHTS.referencePenalty;

    // discourage "architecture/pattern library" in names
    const name = (h.metadata?.doc_name || "").toLowerCase();
    if (/architecture|pattern library/.test(name)) s -= 3;

    return { ...h, score: s };
  });

  return scored.sort((a,b) => (b.score ?? 0) - (a.score ?? 0));
}
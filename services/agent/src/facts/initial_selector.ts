// services/agent/src/facts/initial_selector.ts
import { isInitialIntent } from "../intent";

export function pickInitialEvidence(
  evidence: any[], 
  scope: { topic?: string; phaseHint?: string; weekHint?: number; message?: string }
) {
  const message = scope?.message || "";
  const initial = isInitialIntent(message);

  // 0) If initial intent and a GAMEPLAN exists, pin it first
  if (initial) {
    const gp = evidence.find(
      (e) => String(e?.metadata?.kind || e?.kind || "").toUpperCase() === "GAMEPLAN"
        && /assessment|gameplan/i.test(String(e?.metadata?.doc_name || ""))
    );
    if (gp) return [gp, ...evidence.filter((x) => x !== gp)].slice(0, 6);
  }
  
  const topic = (scope.topic || "").toLowerCase();
  const phaseHint = scope.phaseHint || "";
  const weekHint = scope.weekHint || 0;

  // Prefer GAMEPLAN in early phase, then TRANS-INTEL, else anything with early week/date.
  const scored = evidence.map((e) => {
    const kind = (e.kind || e.metadata?.kind || "").toUpperCase();
    const phase = e.phase || e.metadata?.phase || "";
    const week = e.week || e.metadata?.week || 999;
    const date_iso = e.date_iso || e.metadata?.date_iso || "";

    let s = 0;
    // For initial/gameplan queries, HEAVILY prefer GAMEPLAN
    if (message && (message.includes("initial") || message.includes("game plan") || message.includes("gameplan"))) {
      if (kind === "GAMEPLAN") s += 20;
    } else if (kind === "GAMEPLAN") {
      s += 5;
    }
    if (/TRANS-INTEL/i.test(kind)) s += 2;
    if (phaseHint && phase === phaseHint) s += 2;
    if (weekHint && typeof week === "number") s += Math.max(0, 4 - Math.abs(week - weekHint));
    if (topic && (e.text || e.content || "").toLowerCase().includes(topic)) s += 1;
    // earlier week → slightly higher
    if (typeof week === "number") s += Math.max(0, 3 - Math.floor((week || 0) / 10));
    // earlier date_iso → bonus
    if (date_iso) s += 1;

    return { e, s };
  });

  scored.sort((a,b)=>b.s-a.s);
  return scored.slice(0, 5).map(x=>x.e);
}
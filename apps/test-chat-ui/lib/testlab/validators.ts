/**
 * Test Lab Validators
 * PRD gate validation for Facts, KB, and EQ test categories
 */

import { RunResult, GateResult, GateVerdict } from "./schema";

export function validateFacts(r: RunResult): GateResult[] {
  const gates: GateResult[] = [];

  // Gate 1: Source must be SQL
  gates.push({
    name: "Source = SQL",
    verdict: r.source === "sql" ? "pass" : "fail",
    message: r.source === "sql"
      ? "✓ Correctly routed to SQL"
      : `✗ Wrong source: ${r.source} (expected SQL)`,
    actual: r.source,
    expected: "sql"
  });

  // Gate 2: Proof presence ≥98%
  const proofCount = r.debug?.provenance?.length ?? 0;
  const rowsCount = r.debug?.sql?.rows_count ?? 0;
  const hasProof = proofCount > 0 || rowsCount > 0;

  gates.push({
    name: "Proof Presence",
    verdict: hasProof ? "pass" : "fail",
    message: hasProof
      ? `✓ Proof found (${proofCount} provenance, ${rowsCount} rows)`
      : "✗ No proof/provenance found",
    actual: { proofCount, rowsCount },
    expected: { minProof: 1 }
  });

  // Gate 3: No meta-leakage
  gates.push({
    name: "No Meta-Leakage",
    verdict: !r.debug?.metaLeak ? "pass" : "fail",
    message: !r.debug?.metaLeak
      ? "✓ No meta-instruction leakage"
      : "✗ Meta-instructions leaked to answer",
    actual: r.debug?.metaLeak,
    expected: false
  });

  // Gate 4: Latency thresholds (p95 ≤ 6s)
  const latency = r.metrics?.latency?.total_ms ?? 0;
  let latencyVerdict: GateVerdict = "pass";
  let latencyMsg = `✓ Latency OK (${latency}ms)`;

  if (latency > 6000) {
    latencyVerdict = "fail";
    latencyMsg = `✗ Latency too high (${latency}ms > 6000ms)`;
  } else if (latency > 1500) {
    latencyVerdict = "warn";
    latencyMsg = `⚠ Latency acceptable but slow (${latency}ms > 1500ms)`;
  }

  gates.push({
    name: "Latency",
    verdict: latencyVerdict,
    message: latencyMsg,
    actual: latency,
    expected: { p50: 1500, p95: 6000 }
  });

  // Gate 5: Guard should skip tone rewrite on SQL
  const toneApplied = r.debug?.tone?.warmth || r.debug?.tone?.action;
  gates.push({
    name: "SQL Skip Guards",
    verdict: !toneApplied ? "pass" : "warn",
    message: !toneApplied
      ? "✓ Tone guards skipped (SQL-only)"
      : "⚠ Tone guards applied to SQL query (unexpected)",
    actual: { warmth: r.debug?.tone?.warmth, action: r.debug?.tone?.action },
    expected: { warmth: false, action: false }
  });

  return gates;
}

export function validateKB(r: RunResult): GateResult[] {
  const gates: GateResult[] = [];

  // Gate 1: Evidence tags present
  const hasTags = (r.debug?.tags?.length ?? 0) > 0;
  gates.push({
    name: "Evidence Tags",
    verdict: hasTags ? "pass" : "warn",
    message: hasTags
      ? `✓ Tags found (${r.debug?.tags?.length})`
      : "⚠ No evidence tags detected",
    actual: r.debug?.tags?.length,
    expected: { min: 1 }
  });

  // Gate 2: No meta-leakage
  gates.push({
    name: "No Meta-Leakage",
    verdict: !r.debug?.metaLeak ? "pass" : "fail",
    message: !r.debug?.metaLeak
      ? "✓ No meta-instruction leakage"
      : "✗ Meta-instructions leaked to answer",
    actual: r.debug?.metaLeak,
    expected: false
  });

  // Gate 3: Latency guidance (warn only)
  const latency = r.metrics?.latency?.total_ms ?? 0;
  let latencyVerdict: GateVerdict = "pass";
  let latencyMsg = `✓ Latency OK (${latency}ms)`;

  if (latency > 6000) {
    latencyVerdict = "warn";
    latencyMsg = `⚠ Latency high (${latency}ms > 6000ms)`;
  }

  gates.push({
    name: "Latency",
    verdict: latencyVerdict,
    message: latencyMsg,
    actual: latency,
    expected: { p95: 6000 }
  });

  // Gate 4: Provenance (should have some)
  const proofCount = r.debug?.provenance?.length ?? 0;
  gates.push({
    name: "Provenance",
    verdict: proofCount > 0 ? "pass" : "warn",
    message: proofCount > 0
      ? `✓ Provenance found (${proofCount})`
      : "⚠ No provenance chips",
    actual: proofCount,
    expected: { min: 1 }
  });

  return gates;
}

export function validateEQ(r: RunResult): GateResult[] {
  const gates: GateResult[] = [];

  // Gate 1: Warmth detected
  const warmth = r.debug?.tone?.warmth ?? false;
  gates.push({
    name: "Warmth Opener",
    verdict: warmth ? "pass" : "fail",
    message: warmth
      ? "✓ Warmth detected (empathy/normalization)"
      : "✗ No warmth opener found",
    actual: warmth,
    expected: true
  });

  // Gate 2: Action detected
  const action = r.debug?.tone?.action ?? false;
  gates.push({
    name: "Actionability",
    verdict: action ? "pass" : "fail",
    message: action
      ? "✓ Action nudge detected (next step/imperative)"
      : "✗ No actionable guidance found",
    actual: action,
    expected: true
  });

  // Gate 3: No meta-leakage
  gates.push({
    name: "No Meta-Leakage",
    verdict: !r.debug?.metaLeak ? "pass" : "fail",
    message: !r.debug?.metaLeak
      ? "✓ No meta-instruction leakage"
      : "✗ Meta-instructions leaked to answer",
    actual: r.debug?.metaLeak,
    expected: false
  });

  // Gate 4: Model mix (adapter considered for tone intents)
  // v11.4: Check debug.adapter.used field directly (set by orchestrator/composer)
  const adapterUsed = r.debug?.adapter?.used ?? false;
  const adapterConsidered = adapterUsed || r.debug?.trace?.routerDecision?.includes("adapter");

  gates.push({
    name: "Adapter Consideration",
    verdict: adapterConsidered ? "pass" : "warn",
    message: adapterConsidered
      ? `✓ Adapter ${adapterUsed ? "used" : "considered"} for tone intent`
      : "⚠ Adapter not considered for EQ query",
    actual: { badge: r.modelBadge, used: adapterUsed },
    expected: { considered: true }
  });

  // Gate 5: Latency (informational)
  const latency = r.metrics?.latency?.total_ms ?? 0;
  gates.push({
    name: "Latency",
    verdict: latency < 6000 ? "pass" : "warn",
    message: latency < 6000
      ? `✓ Latency OK (${latency}ms)`
      : `⚠ Latency high (${latency}ms)`,
    actual: latency,
    expected: { p95: 6000 }
  });

  return gates;
}

export function validateTest(r: RunResult): GateResult[] {
  switch (r.category) {
    case "facts":
      return validateFacts(r);
    case "kb":
      return validateKB(r);
    case "eq":
      return validateEQ(r);
    default:
      return [{
        name: "Unknown Category",
        verdict: "fail",
        message: `✗ Unknown category: ${r.category}`,
        actual: r.category,
        expected: "facts | kb | eq"
      }];
  }
}

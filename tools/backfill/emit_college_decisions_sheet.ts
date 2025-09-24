import * as fs from "node:fs";
import * as path from "node:path";
import fetch from "node-fetch";

const API = process.env.AGENT_API || "http://localhost:4000";

function toDecision(value: string) {
  const v = (value || "").toLowerCase().trim();
  if (/accept|admit|admission|offer/.test(v)) return "ACCEPTED";
  if (/deny|reject/.test(v)) return "REJECTED";
  if (/wait/.test(v)) return "WAITLISTED";
  if (/defer/.test(v)) return "DEFERRED";
  return "UNKNOWN";
}

async function emit(observation: any) {
  const r = await fetch(`${API}/observe`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(observation),
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`POST /observe failed: ${r.status} ${txt}`);
  }
}

export async function run(inputCanonicalJson: string, studentId = "huda") {
  const doc = JSON.parse(fs.readFileSync(inputCanonicalJson, "utf8"));
  const items = doc.items || [];
  let count = 0;

  for (const it of items) {
    const rows = it.entries || [];
    for (const row of rows) {
      const college = (row.college || "").trim();
      const decisionRaw = (row.decision || "").trim();
      if (!college || !decisionRaw) continue;

      const observation = {
        studentId,
        kind: "APPS",
        subtype: "college-decision",
        value: {
          college,
          decision: toDecision(decisionRaw),
          round: row.round || null,
          date: row.date || null,
          notes: row.notes || null,
        },
        source: path.basename(inputCanonicalJson),
        at: row.date || new Date().toISOString()
      };
      await emit(observation);
      count++;
    }
  }
  console.log(`[emit_college_decisions_sheet] Emitted ${count} APPS observations from ${path.basename(inputCanonicalJson)}`);
}

// CLI
if (require.main === module) {
  const file = process.argv[2];
  const sid = process.argv[3] || "huda";
  if (!file) {
    console.error("Usage: ts-node tools/backfill/emit_college_decisions_sheet.ts <canonical.json> [studentId]");
    process.exit(1);
  }
  run(file, sid).catch(e => { console.error(e); process.exit(1); });
}
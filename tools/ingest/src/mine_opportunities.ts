#!/usr/bin/env ts-node
/**
 * Scans normalized canonical corpus → emits OPPORTUNITY/APPLICATION observations.
 * Sources: TRANS-RAW turns, IMSG-RAW turns, EXEC-RAW text, GAMEPLAN text, REPORTS.
 *
 * Usage:
 *   pnpm --filter @tools/ingest mine-opps \
 *     --in data/canonical/jenny-huda \
 *     --student huda \
 *     --observe http://localhost:4000/observe \
 *     --out data/processed/jenny-huda/opportunities.jsonl
 */

import * as fs from "fs";
import * as path from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { canonicalize } from "./lib/opportunity_aliases.js";
import { APPLY_PAT, ACCEPT_PAT, REJECT_PAT, WAITLIST_PAT, DEADLINE_PAT, OPP_NAME_PAT } from "./lib/opportunity_regex.js";
import { extractNearbyDate } from "./lib/date_window.js";
import { hashId } from "./lib/hash.js";
import { postJson } from "./lib/http.js";

type CanonicalDoc = {
  id: string; name: string; path: string; kind: string;
  week?: number; phase?: string; date?: string;
  text?: string; turns?: { speaker: string; text: string; tsStart?: number; tsEnd?: number }[];
  meta?: Record<string, any>;
};

const argv = yargs(hideBin(process.argv))
  .option("in", { type: "string", demandOption: true, describe: "canonical root dir" })
  .option("student", { type: "string", demandOption: true })
  .option("observe", { type: "string", describe: "POST /observe endpoint (optional)" })
  .option("out", { type: "string", describe: "optional JSONL output of mined observations" })
  .option("dry", { type: "boolean", default: false })
  .parseSync();

const CANONICAL_ROOT = path.resolve(argv.in);
const STUDENT = argv.student;
const OBSERVE_URL = argv.observe;
const OUT_PATH = argv.out ? path.resolve(argv.out) : undefined;
const DRY = !!argv.dry;

type MinedObs = {
  type: "OPPORTUNITY" | "APPLICATION";
  subtype: "proposal" | "applied" | "accepted" | "rejected" | "waitlisted";
  student_id: string;
  ts?: string;            // fallback to doc date
  source: { file: string; kind: string; week?: number; phase?: string; span?: string };
  opportunity: {
    name: string;
    category: string;
    tags: string[];
    deadline?: string;
    rationale?: string;
  };
  metadata?: Record<string, any>;
  idempotency_key: string;
};

function* walk(dir: string): any {
  for (const entry of fs.readdirSync(dir)) {
    const p = path.join(dir, entry);
    const st = fs.statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else if (st.isFile() && p.endsWith(".json")) yield p;
  }
}

function extractFromLines(lines: string[], fileMeta: Pick<CanonicalDoc, "id"|"name"|"path"|"kind"|"week"|"phase"|"date">): MinedObs[] {
  const out: MinedObs[] = [];
  for (let i=0; i<lines.length; i++) {
    const line = lines[i];

    // quick guard: must mention an opportunity-looking token
    if (!OPP_NAME_PAT.test(line) && !APPLY_PAT.test(line)) continue;

    // candidate names (grab a few capitalized tokens near verbs)
    const nameGuess = (line.match(/([A-Z][A-Za-z&\-]+(?: [A-Z][A-Za-z&\-]+){0,4})/g) || [])
      .filter(x => x.length <= 60)
      .slice(0, 3);

    const candidates = nameGuess.length ? nameGuess : [line]; // fallback entire line

    const status: Array<{ subtype: MinedObs["subtype"]; deadline?: string }> = [];
    if (ACCEPT_PAT.test(line)) status.push({ subtype: "accepted" });
    if (WAITLIST_PAT.test(line)) status.push({ subtype: "waitlisted" });
    if (REJECT_PAT.test(line)) status.push({ subtype: "rejected" });
    if (APPLY_PAT.test(line)) status.push({ subtype: "applied" });
    if (status.length === 0) status.push({ subtype: "proposal" });

    let deadline: string | undefined;
    const dlMatch = line.match(DEADLINE_PAT);
    if (dlMatch && dlMatch[2]) deadline = dlMatch[2];
    if (!deadline) deadline = extractNearbyDate(line, i, lines);

    for (const rawName of candidates) {
      const { canonical, category, tags } = canonicalize(rawName);
      // filter out junky generic capitalized phrases
      if (canonical.split(" ").length < 1 || canonical.length < 3) continue;

      // build obs per status (highest precedence last write wins in reducer)
      for (const s of status) {
        const obs: MinedObs = {
          type: s.subtype === "applied" || s.subtype === "accepted" || s.subtype === "rejected" || s.subtype === "waitlisted"
            ? "APPLICATION" : "OPPORTUNITY",
          subtype: s.subtype,
          student_id: STUDENT,
          ts: fileMeta.date,
          source: { file: fileMeta.path, kind: fileMeta.kind, week: fileMeta.week, phase: fileMeta.phase, span: line.slice(0, 240) },
          opportunity: { name: canonical, category, tags, deadline },
          metadata: {},
          idempotency_key: ""
        };
        obs.idempotency_key = hashId(`${obs.type}|${obs.subtype}|${obs.student_id}|${canonical}|${fileMeta.path}|${fileMeta.week}|${obs.opportunity.deadline ?? ""}`);
        out.push(obs);
      }
    }
  }
  return out;
}

function extractFromDoc(doc: CanonicalDoc): MinedObs[] {
  const fileMeta = { id: doc.id, name: doc.name, path: doc.path, kind: doc.kind, week: doc.week, phase: doc.phase, date: doc.date };
  const results: MinedObs[] = [];
  if (doc.turns && doc.turns.length) {
    const lines = doc.turns.map(t => (t.text || "").replace(/\s+/g, " ").trim()).filter(Boolean);
    results.push(...extractFromLines(lines, fileMeta));
  } else if (doc.text) {
    const lines = (doc.text || "").split(/\n+/).map(s => s.replace(/\s+/g," ").trim()).filter(Boolean);
    results.push(...extractFromLines(lines, fileMeta));
  }
  return results;
}

async function main() {
  const jsonl = OUT_PATH ? fs.createWriteStream(OUT_PATH, { flags: "w" }) : undefined;
  const seen = new Set<string>();
  let found = 0, emitted = 0;

  for (const p of walk(CANONICAL_ROOT)) {
    // limit to relevant kinds
    const raw = JSON.parse(fs.readFileSync(p, "utf8")) as CanonicalDoc;
    if (!/^(03\-Raw\-SessionTranscripts|04\-Raw\-iMessages|02\-Raw\-ExecutionDocs|01\-Raw\-GamePlan|06\-Raw\-AdditionalReports|09\-Raw\-ApplicationDocs)/.test(raw.path)) {
      continue;
    }
    const obs = extractFromDoc(raw);
    found += obs.length;
    for (const o of obs) {
      if (seen.has(o.idempotency_key)) continue;
      seen.add(o.idempotency_key);
      if (jsonl) jsonl.write(JSON.stringify(o) + "\n");
      if (OBSERVE_URL && !DRY) {
        await postJson(OBSERVE_URL, o);
      }
      emitted++;
    }
  }
  if (jsonl) jsonl.end();
  console.log(`[mine_opportunities] found=${found} unique=${seen.size} emitted=${emitted} out=${OUT_PATH ?? "(none)"} observe=${!!OBSERVE_URL}`);
}

main().catch(e => { console.error(e); process.exit(1); });
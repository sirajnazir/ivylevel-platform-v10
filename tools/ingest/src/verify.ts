/* eslint-disable no-console */
import fs from "fs";
import path from "path";
import fg from "fast-glob";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import crypto from "crypto";

type Rec = {
  id: string;
  name: string;
  path: string;
  kind: string;
  week?: string;
  phase?: string;
  date?: string;
  link?: string | null;
  text: string;
  segments?: string[];
  turns?: { speaker: string; text: string }[];
  meta: Record<string, any>;
};
type Row = Record<string, string|number|boolean|null>;

function toUnix(p:string){ return p.split(path.sep).join("/"); }
function ensureDir(p:string){ if (!fs.existsSync(p)) fs.mkdirSync(p,{recursive:true}); }

const argv = await yargs(hideBin(process.argv))
  .scriptName("verify")
  .option("raw", { type: "string", demandOption: true, desc: "RAW root (e.g., data/raw/jenny-huda)" })
  .option("canon", { type: "string", demandOption: true, desc: "Canonical root (e.g., data/normalized/jenny-huda)" })
  .option("schema", { type: "string", default: path.join(process.cwd(),"tools/ingest/schema/canonical.schema.json") })
  .option("reportDir", { type: "string", default: "data/reports" })
  .option("sample", { type: "number", default: 8, desc: "How many random samples to print" })
  .help().argv as any;

const RAW = path.resolve(argv.raw);
const CAN = path.resolve(argv.canon);
const SCHEMA = path.resolve(argv.schema);
const REPORT_DIR = path.resolve(argv.reportDir);

if (!fs.existsSync(RAW))  throw new Error(`RAW not found: ${RAW}`);
if (!fs.existsSync(CAN))  throw new Error(`CANONICAL not found: ${CAN}`);
if (!fs.existsSync(SCHEMA)) throw new Error(`Schema not found: ${SCHEMA}`);
ensureDir(REPORT_DIR);

const schema = JSON.parse(fs.readFileSync(SCHEMA,"utf8"));
const ajv = new Ajv({ allErrors:true, strict:false });
addFormats(ajv);
const validate = ajv.compile(schema);

const ALLOWED_KINDS = new Set(["GAMEPLAN","EXEC-RAW","EXEC-INTEL","TRANS-RAW","TRANS-INTEL","IMSG-RAW","IMSG-INTEL","APP-DOC","EMAIL","REPORT","OTHER"]);

function sha1(s:string){ return crypto.createHash("sha1").update(s).digest("hex"); }

function countRawByFolder() {
  const folders = [
    "01-Raw-GamePlan",
    "02-Raw-ExecutionDocs",
    "03-Raw-SessionTranscripts",
    "04-Raw-iMessages",
    "05-Raw-Emails",
    "06-Raw-AdditionalReports",
    "07-Raw-ChatTranscripts",
    "09-Raw-ApplicationDocs"
  ];
  const out: Record<string, number> = {};
  for (const f of folders) {
    const base = path.join(RAW, f);
    if (!fs.existsSync(base)) { out[f]=0; continue; }
    const files = fg.sync("**/*.*", { cwd: base, absolute: false, dot:false });
    out[f] = files.filter(n=>!path.basename(n).startsWith("Copy_of")).length;
  }
  return out;
}

function countCanonByFolder() {
  const files = fg.sync("**/*.json", { cwd: CAN, absolute: true, dot:false });
  const out: Record<string, number> = {};
  for (const abs of files) {
    const rel = toUnix(path.relative(CAN, abs));
    const top = rel.split("/").slice(0,1)[0];
    out[top] = (out[top]||0)+1;
  }
  return { files, byTop: out };
}

function parseJsonSafe(abs:string): Rec|null {
  try {
    return JSON.parse(fs.readFileSync(abs,"utf8"));
  } catch { return null; }
}

function writeCsv(rows: Row[], outPath: string) {
  if (!rows.length) { fs.writeFileSync(outPath, ""); return; }
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const r of rows) {
    const vals = headers.map(h => {
      const v = r[h];
      if (v === null || v === undefined) return "";
      const s = String(v).replace(/"/g,'""');
      return /[,"\n]/.test(s) ? `"${s}"` : s;
    });
    lines.push(vals.join(","));
  }
  fs.writeFileSync(outPath, lines.join("\n"));
}

const now = new Date();
const stamp = `${now.toISOString().replace(/[:.]/g,"-")}`;

const rawCounts = countRawByFolder();
const { files: canonFiles, byTop: canonCounts } = countCanonByFolder();

let ok=0, bad=0;
const errors: Row[] = [];
const samples: Row[] = [];
const kindDist: Record<string, number> = {};
const weekSet = new Set<string>();
const phaseSet = new Set<string>();

for (const abs of canonFiles) {
  const rel = toUnix(path.relative(CAN, abs));
  const rec = parseJsonSafe(abs);
  if (!rec) {
    bad++;
    errors.push({ file: rel, error: "json-parse-failed" });
    continue;
  }

  // validate schema
  const valid = validate(rec);
  if (!valid) {
    bad++;
    errors.push({ file: rel, error: "schema-fail", detail: JSON.stringify(validate.errors) });
    continue;
  }

  // extra checks
  if (!ALLOWED_KINDS.has(rec.kind)) {
    bad++; errors.push({ file: rel, error: "invalid-kind", kind: rec.kind }); continue;
  }

  if (!rec.text || rec.text.trim().length < 5) {
    bad++; errors.push({ file: rel, error: "empty-text" }); continue;
  }

  if (rec.week) weekSet.add(rec.week);
  if (rec.phase) phaseSet.add(rec.phase);
  kindDist[rec.kind] = (kindDist[rec.kind]||0)+1;

  ok++;

  // pick a few samples (deterministic by hash)
  const h = parseInt(sha1(rel).slice(0,6), 16);
  if ((h % 97) === 0 && samples.length < argv.sample) {
    const first = rec.text.split(/\n/).slice(0, 4).join(" ").slice(0, 240);
    samples.push({ file: rel, kind: rec.kind, week: rec.week||"", phase: rec.phase||"", preview: first });
  }
}

const report = {
  verifiedAt: now.toISOString(),
  rawCounts,
  canonCounts,
  totals: { rawFolders: Object.values(rawCounts).reduce((a,b)=>a+b,0), canonicalFiles: canonFiles.length, ok, bad },
  kindDist,
  weeksDetected: Array.from(weekSet).sort((a,b)=>Number(a)-Number(b)),
  phasesDetected: Array.from(phaseSet).sort((a,b)=>Number(a)-Number(b)),
  samples
};

ensureDir(REPORT_DIR);
const outJson = path.join(REPORT_DIR, `normalize_report_${stamp}.json`);
const outCsv  = path.join(REPORT_DIR, `normalize_errors_${stamp}.csv`);
const outSumm = path.join(REPORT_DIR, `normalize_summary_${stamp}.csv`);

fs.writeFileSync(outJson, JSON.stringify(report, null, 2));
writeCsv(errors, outCsv);

// summary CSV (one row)
writeCsv([{
  verifiedAt: report.verifiedAt,
  raw_total: report.totals.rawFolders,
  canonical_total: report.totals.canonicalFiles,
  ok: report.totals.ok,
  bad: report.totals.bad,
  kinds: Object.entries(kindDist).map(([k,v])=>`${k}:${v}`).join("|"),
  weeks: report.weeksDetected.join(" "),
  phases: report.phasesDetected.join(" ")
}], outSumm);

// human-readable printout
console.log("=== NORMALIZE QA REPORT ===");
console.log(`verifiedAt:   ${report.verifiedAt}`);
console.log(`raw total:    ${report.totals.rawFolders}`);
console.log(`canonical:    ${report.totals.canonicalFiles} (ok=${ok}, bad=${bad})`);
console.log("by kind:      ", kindDist);
console.log("weeks seen:   ", report.weeksDetected.slice(0,10), report.weeksDetected.length>10 ? `... total ${report.weeksDetected.length}` : "");
console.log("phases seen:  ", report.phasesDetected);
console.log("raw counts:   ", rawCounts);
console.log("canon counts: ", canonCounts);
console.log("\nSAMPLES:");
for (const s of samples) {
  console.log(`- ${s.file} [${s.kind}] w=${s.week} p=${s.phase}`);
  console.log(`  ${s.preview}…`);
}
console.log(`\nSaved:\n  ${toUnix(outJson)}\n  ${toUnix(outCsv)}\n  ${toUnix(outSumm)}`);
/* eslint-disable no-console */
import fs from "fs";
import path from "path";
import fg from "fast-glob";
import minimist from "minimist";
import _ from "lodash";

// ---------- Types ----------
type Canonical = {
  id: string;
  name: string;
  path: string;
  kind:
    | "GAMEPLAN" | "EXEC-RAW" | "EXEC-INTEL"
    | "TRANS-RAW" | "TRANS-INTEL"
    | "IMSG-RAW"  | "IMSG-INTEL"
    | "APP-DOC"   | "EMAIL"   | "REPORT" | "OTHER";
  week?: string;
  phase?: string;
  date?: string;
  link?: string | null;
  text: string;
  segments?: string[];
  turns?: { speaker: "coach"|"student"|"unknown", text: string }[];
  meta?: Record<string, any>;
};

type FtMessage = { role: "system"|"user"|"assistant"; content: string };
type FtExample = { messages: FtMessage[]; metadata: Record<string, any> };

// ---------- CLI & constants ----------
const args = minimist(process.argv.slice(2));

// Your exact folder layout:
// - RAW (normalized canonical JSON): ./data/jenny-huda/canonical/*-Raw*/**/*.json
// - INTEL (already JSON):            ./data/jenny-huda/canonical/*-Intelligence-*/**/*.json
const RAW_CANON_ROOT   = args.rawRoot   || "data/jenny-huda/canonical";
const INTEL_JSON_ROOT  = args.intelRoot || "data/jenny-huda/canonical";

const OUT_DIR = args.out || "data/processed/jenny-huda/finetune";

// Config via env (tune without code changes)
const RAW_WINDOW       = Number(process.env.RAW_WINDOW || 10);
const SCORE_THRESHOLD  = Number(process.env.SCORE_THRESHOLD || 5);
const MAX_PER_TOPIC    = Number(process.env.MAX_PER_TOPIC || 250);
const SCRUB_PII        = String(process.env.SCRUB_PII || "true") === "true";
const DEDUP_STRICT     = String(process.env.DEDUP_STRICT || "true") === "true";
const KEEP_LOGISTICS   = String(process.env.KEEP_LOGISTICS || "false") === "true";

function ensureDir(p:string){ if(!fs.existsSync(p)) fs.mkdirSync(p, { recursive:true }); }
function loadJson(abs:string){ return JSON.parse(fs.readFileSync(abs, "utf8")); }
function saveJsonl(arr:any[], outPath:string){
  fs.writeFileSync(outPath, arr.map(o => JSON.stringify(o)).join("\n"));
}

// ---------- Discovery with your exact globs ----------
function listRawCanonicalFiles(root:string){
  // only folders that contain "-Raw" in their names (e.g., 03-Raw-SessionTranscripts, 04-Raw-iMessages, etc.)
  return fg.sync("**/*-Raw*/**/*.json", { cwd: root, absolute: true, dot:false });
}

function listIntelJsonFiles(root:string){
  // only folders that contain "-Intelligence-" in their names (e.g., 03-Intelligence-SessionTranscripts, 02-Intelligence-ExecutionDocs)
  return fg.sync("**/*-Intelligence-*/**/*.json", { cwd: root, absolute: true, dot:false });
}

// ---------- Helpers ----------
function basicScrubPII(s:string){
  if(!SCRUB_PII) return s;
  return s
    .replace(/\b[\w.%+-]+@[\w.-]+\.[a-zA-Z]{2,}\b/g, "[redacted-email]")
    .replace(/\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?){2}\d{4}\b/g, "[redacted-phone]")
    .replace(/\b\d{1,5}\s+\w+(?:\s+\w+){0,3}\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln)\b/gi, "[redacted-address]")
    .replace(/\bHuda\b/g, "the student")
    .replace(/\bJenny\b/g, "the coach");
}

function looksLogistics(s:string){
  if (KEEP_LOGISTICS) return false;
  const l = s.toLowerCase();
  return (
    /zoom|link|join|mute|audio|resched|reschedule|calendar|time|recording|doc link|file attached/.test(l) ||
    /waiting room|meeting id|passcode|minutes/.test(l)
  );
}

function scoreSignal(t:string){
  const l = t.toLowerCase();
  let score = 0;
  if (/i'm stuck|i am stuck|how do i|not sure|should i|blocked|struggling/.test(l)) score += 2; // JTBD/problem
  if (/here's the plan|let's do this|priority|this week|focus|roadmap|gameplan/.test(l)) score += 2; // priority/plan
  if (/\bwhy\b/.test(l))  score += 1;
  if (/\bwhat\b/.test(l)) score += 1;
  if (/\bhow\b/.test(l))  score += 1;
  if (/\bwhen\b/.test(l)) score += 1;
  if (/metric|goal|hours|deadline|apply|submi|wins|touchpoints|impact|views|plays|interviews/.test(l)) score += 2; // metrics/outcomes
  if (/shy|outgoing|anxious|overwhelmed|small steps|async|in-person|capacity|80\/20|fast-win/.test(l)) score += 2; // fit-adaptive
  return score;
}

// Build a single FT example
function toFt(user:string, assistant:string): FtExample {
  const sys =
    "You are Jenny, a Stanford-caliber college prep coach. Use empathy, precision, and evidence. " +
    "Tailor the HOW to the student's capacity and style (80/20). Always anchor advice in concrete next steps and metrics.";
  return {
    messages: [
      { role: "system", content: sys },
      { role: "user", content: user },
      { role: "assistant", content: assistant }
    ],
    metadata: {}
  };
}

// Deduplicate examples
function dedupe(examples: FtExample[]) {
  const seen = new Set<string>();
  const out: FtExample[] = [];
  for (const ex of examples) {
    const sig = ex.messages.map(m => (m.role+":"+m.content.trim().toLowerCase().replace(/\s+/g," "))).join("|");
    const key = DEDUP_STRICT ? sig : sig.slice(0, 220);
    if (!seen.has(key)) { seen.add(key); out.push(ex); }
  }
  return out;
}

// ---------- Mining ----------
function mineFromTurns(doc: Canonical){
  if (!doc.turns || doc.turns.length < 2) return [] as { user:string; assistant:string; score:number; kind:string; phase?:string }[];
  const out:any[] = [];
  for (let i=0;i<doc.turns.length;i++){
    const t = doc.turns[i];
    if (t.speaker === "student" && /i|how do i|should i|stuck|can't|dont know|don't know/i.test(t.text)) {
      const window = doc.turns.slice(i+1, i+1+RAW_WINDOW);
      const coach = window.find(x => x.speaker === "coach");
      if (coach) {
        const u = basicScrubPII(t.text);
        const a = basicScrubPII(coach.text);
        const score = scoreSignal(t.text + " " + coach.text);
        out.push({ user: u, assistant: a, score, kind: doc.kind, phase: doc.phase });
      }
    }
  }
  return out;
}

function mineFromIntel(doc: Canonical){
  const text = doc.text || "";
  if (text.trim().length < 80) return [] as any[];
  const lines = text.split(/\n+/).map(s => s.trim()).filter(Boolean);

  // Sliding window (e.g., 12 lines per window, stride 8)
  const WIN = 12, STRIDE = 8, MAX_PER_DOC = 8;
  let out:any[] = [];
  for (let i=0; i<lines.length && out.length<MAX_PER_DOC; i+=STRIDE){
    const chunk = lines.slice(i, i+WIN).join(" ");
    if (chunk.length < 200) continue;

    // classify ask by chunk content
    const l = chunk.toLowerCase();
    const ask =
      /168|hours|schedule/.test(l) ? "I'm overwhelmed. How do I set an effective 168-hour plan this week?" :
      /ncwit|award|scholarship|jcamp|summer/.test(l) ? "What should I target this month to earn meaningful awards or a summer program aligned to my narrative?" :
      /essay|personal statement|supplement/.test(l) ? "How should I approach my essays to reflect my narrative and wins?" :
      /rejection|waitlist|defer/.test(l) ? "I just got rejected/waitlisted. What now?" :
      /synthoria|empowering ai|folklift|project|bootcamp|launch|scale|outreach/.test(l) ? "I need to scale impact on my project. What's the 80/20 plan and the next 3 moves?" :
      "What are my biggest gaps and what's the focused plan for this week?";

    const answer = basicScrubPII(chunk.slice(0, 1200));
    const score  = scoreSignal(chunk);
    out.push({ user: basicScrubPII(ask), assistant: answer, score, kind: doc.kind, phase: doc.phase });
  }
  return out;
}

// ---------- Main ----------
function main(){
  console.log(`[build_finetune_dataset] rawRoot=${RAW_CANON_ROOT} intelRoot=${INTEL_JSON_ROOT} out=${OUT_DIR}`);

  const rawFiles   = listRawCanonicalFiles(RAW_CANON_ROOT);   // ./data/jenny-huda/canonical/*-Raw*/**/*.json
  const intelFiles = listIntelJsonFiles(INTEL_JSON_ROOT);     // ./data/raw/jenny-huda/*-Intelligence-*/**/*.json

  if (!rawFiles.length && !intelFiles.length) {
    console.error("No input files found. Check paths.");
    process.exit(1);
  }

  const mined: { user:string; assistant:string; score:number; kind:string; phase?:string }[] = [];

  // Mine INTEL first (policy/strategy language is dense)
  for (const abs of intelFiles) {
    const rec: Canonical = loadJson(abs);
    if (!rec.text || looksLogistics(rec.text)) continue;
    // Expected INTEL kinds: TRANS-INTEL, EXEC-INTEL, IMSG-INTEL, GAMEPLAN, APP-DOC, REPORT
    mined.push(...mineFromIntel(rec));
  }

  // Then mine RAW (turn pairs)
  for (const abs of rawFiles) {
    const rec: Canonical = loadJson(abs);
    if (!rec.turns || !Array.isArray(rec.turns)) continue;
    mined.push(...mineFromTurns(rec));
  }

  // Score filter
  const high = mined.filter(x => x.score >= SCORE_THRESHOLD);

  // Cap per topic (topic = kind+phase) to avoid overfitting
  const grouped = _.groupBy(high, x => `${x.kind || "UNK"}::${x.phase || "X"}`);
  const capped  = Object.values(grouped).flatMap(arr => arr.slice(0, MAX_PER_TOPIC));

  // Build FT examples
  let examples: FtExample[] = capped.map(x => toFt(x.user, x.assistant));
  examples = dedupe(examples);

  // 80/10/10 split
  const shuffled = _.shuffle(examples);
  const n = shuffled.length;
  const nTrain = Math.floor(n*0.8);
  const nVal   = Math.floor(n*0.1);
  const train  = shuffled.slice(0, nTrain);
  const val    = shuffled.slice(nTrain, nTrain+nVal);
  const test   = shuffled.slice(nTrain+nVal);

  // Stats
  const stats = {
    inputs: { rawFiles: rawFiles.length, intelFiles: intelFiles.length },
    mined_pairs: mined.length,
    score_threshold: SCORE_THRESHOLD,
    kept_pairs: high.length,
    capped_pairs: capped.length,
    deduped_pairs: examples.length,
    splits: { train: train.length, val: val.length, test: test.length },
    params: { RAW_WINDOW, MAX_PER_TOPIC, SCRUB_PII, DEDUP_STRICT, KEEP_LOGISTICS }
  };

  // Save
  ensureDir(OUT_DIR);
  saveJsonl(train, path.join(OUT_DIR, "finetune.train.jsonl"));
  saveJsonl(val,   path.join(OUT_DIR, "finetune.val.jsonl"));
  saveJsonl(test,  path.join(OUT_DIR, "finetune.test.jsonl"));
  fs.writeFileSync(path.join(OUT_DIR, "finetune.stats.json"), JSON.stringify(stats, null, 2));

  console.log("[build_finetune_dataset] DONE", stats);
}

main();
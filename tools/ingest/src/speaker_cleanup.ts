import fs from "fs";
import path from "path";
import fg from "fast-glob";

type Turn = { speaker: "coach"|"student"|"unknown"; text: string; start?: number; end?: number; ts?: string; conf?: number };

function cleanupTurns(turns: Turn[]): Turn[] {
  const out = turns.map(t => ({ ...t }));
  for (let i=0;i<out.length;i++){
    const cur = out[i];
    if (cur.speaker !== "unknown") continue;
    const prev = out[i-1]?.speaker;
    const next = out[i+1]?.speaker;

    // Rule 1: surrounded by coach → probably student
    if (prev === "coach" && (!next || next === "coach")) {
      cur.speaker = "student"; cur.conf = Math.min(cur.conf ?? 0.7, 0.7);
      continue;
    }
    // Rule 2: alternation pattern coach→unknown→coach→unknown … → flip unknown to student
    if (prev === "coach" && next === "coach") {
      cur.speaker = "student"; cur.conf = Math.min(cur.conf ?? 0.7, 0.7);
      continue;
    }
    // Rule 3: long first-person narrative → student
    if (/\bI\b.*\b(my|me)\b/i.test(cur.text)) {
      cur.speaker = "student"; cur.conf = Math.min(cur.conf ?? 0.7, 0.75);
      continue;
    }
  }
  return out;
}

function processFile(abs: string) {
  const j = JSON.parse(fs.readFileSync(abs, "utf8"));
  if (!Array.isArray(j.turns) || j.turns.length < 2) return { updated:false, count:0 };
  const before = JSON.stringify(j.turns);
  j.turns = cleanupTurns(j.turns);
  const after = JSON.stringify(j.turns);
  if (after !== before) {
    fs.writeFileSync(abs, JSON.stringify(j, null, 2), "utf8");
    return { updated:true, count:j.turns.length };
  }
  return { updated:false, count:j.turns.length };
}

function main() {
  const root = process.argv[2] || "data/canonical/jenny-huda";
  const files = fg.sync([
    "**/03-Raw-SessionTranscripts/*.json",
    "**/04-Raw-iMessages/*.json"
  ], { cwd: root, absolute: true });

  let touched = 0; let total = 0;
  for (const f of files) {
    const r = processFile(f);
    if (r.updated) { touched++; total += r.count; console.log(`[speaker-clean] ${path.basename(f)} → ${r.count}`); }
  }
  console.log(`[speaker-clean] updated files: ${touched}, avg turns: ${touched ? Math.round(total/touched) : 0}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
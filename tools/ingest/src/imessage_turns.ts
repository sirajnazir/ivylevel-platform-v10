import fs from "fs";
import path from "path";
import fg from "fast-glob";
import { IMSG_TIMESTAMP_RE, IMSG_TS_ALT, IMSG_DAYONLY,
         COACH_ALIASES, STUDENT_ALIASES, COACH_HINTS, STUDENT_HINTS } from "./lib/imsg_rules.js";

type Turn = { speaker: "coach"|"student"|"unknown"; text: string; ts?: string; conf: number };

function chunkByTimestamps(s: string): { ts?: string; body: string }[] {
  const src = (s || "").replace(/\uFEFF/g, "");
  // Insert a sentinel before any probable timestamp header
  let marked = src.replace(/\s+/g, " "); // flatten spaces
  marked = marked
    .replace(IMSG_TIMESTAMP_RE, "\n@@TS@@$&")
    .replace(IMSG_TS_ALT, "\n@@TS@@$&")
    .replace(IMSG_DAYONLY, "\n@@TS@@$&");

  const parts = marked.split(/\n@@TS@@/).map(p => p.trim()).filter(Boolean);
  const out: { ts?: string; body: string }[] = [];
  for (const p of parts) {
    // If the chunk begins with a timestamp, separate it
    const m = p.match(IMSG_TIMESTAMP_RE) || p.match(IMSG_TS_ALT) || p.match(IMSG_DAYONLY);
    if (m && m.index === 0) {
      out.push({ ts: m[0], body: p.slice(m[0].length).trim() });
    } else {
      out.push({ body: p });
    }
  }
  return out;
}

function classifySpeaker(t: string): { speaker: Turn["speaker"]; conf: number } {
  const L = t.toLowerCase();
  // explicit labels sometimes appear
  if (COACH_ALIASES.some(a => L.includes(a))) return { speaker: "coach", conf: 0.9 };
  if (STUDENT_ALIASES.some(a => L.includes(a))) return { speaker: "student", conf: 0.9 };
  // hints
  const coachHit = COACH_HINTS.some(re => re.test(t));
  const studHit  = STUDENT_HINTS.some(re => re.test(t));
  if (coachHit && !studHit) return { speaker: "coach", conf: 0.75 };
  if (studHit && !coachHit) return { speaker: "student", conf: 0.75 };
  return { speaker: "unknown", conf: 0.5 };
}

function imsgToTurns(text: string): Turn[] {
  const chunks = chunkByTimestamps(text);
  const turns: Turn[] = [];
  for (const c of chunks) {
    if (!c.body) continue;
    // break "message unit" on obvious separators
    const pieces = c.body
      .split(/(?<=\.)\s+(?=[A-Z])|(?<!https?:\/\/)\s{2,}|\n{1,}/)
      .map(x => x.trim()).filter(Boolean);

    for (const p of pieces) {
      const { speaker, conf } = classifySpeaker(p);
      turns.push({ speaker, text: p, ts: c.ts, conf });
    }
  }
  // adjacency smooth: alternate unknown → likely student
  for (let i=0;i<turns.length;i++){
    if (turns[i].speaker === "unknown") {
      const prev = turns[i-1]?.speaker, next = turns[i+1]?.speaker;
      if (prev === "coach" && (!next || next === "coach")) {
        turns[i].speaker = "student";
        turns[i].conf = Math.min(turns[i].conf, 0.7);
      }
    }
  }
  return turns;
}

function processFile(abs: string) {
  const json = JSON.parse(fs.readFileSync(abs, "utf8"));
  const text = (json.text || "").toString();
  if (!text || text.length < 40) return { updated:false, count:0 };

  const turns = imsgToTurns(text);
  if (turns.length < 4) return { updated:false, count:turns.length }; // safety

  json.turns = turns.map(t => ({ speaker: t.speaker, text: t.text, ts: t.ts, conf: t.conf }));
  fs.writeFileSync(abs, JSON.stringify(json, null, 2), "utf8");
  return { updated:true, count:turns.length };
}

function main() {
  const root = process.argv[2] || "data/canonical/jenny-huda";
  const files = fg.sync("**/04-Raw-iMessages/*.json", { cwd: root, absolute: true });
  let touched = 0, total = 0;
  for (const f of files) {
    const { updated, count } = processFile(f);
    if (updated) { touched++; total += count; console.log(`[imsg-turns] ${path.basename(f)} → ${count} turns`); }
  }
  console.log(`[imsg-turns] updated files: ${touched}, avg turns: ${touched ? Math.round(total/touched) : 0}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
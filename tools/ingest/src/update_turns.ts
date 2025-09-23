import fs from "fs";
import path from "path";
import fg from "fast-glob";
import { parseVttFromFlat } from "./lib/parse_vtt_flat.js";
import { cuesToTurns } from "./lib/speaker_detect.js";

function recoverRawTextFromAccidentalJsonString(doc: any): string {
  const s = doc?.text ?? "";
  if (typeof s !== "string") return "";
  const t = s.trimStart();
  if (t.startsWith("{") && t.includes('"kind"') && t.includes('"text"')) {
    try { const p = JSON.parse(t); if (typeof p?.text === "string") return p.text; } catch {}
  }
  return s;
}

function tryUpdateOne(abs: string) {
  const doc = JSON.parse(fs.readFileSync(abs, "utf8"));
  const text = recoverRawTextFromAccidentalJsonString(doc);

  // Flexible check: treat as VTT if we see ≥3 timecode pairs
  const cues = parseVttFromFlat(text);
  if (cues.length < 5) return { updated: false, count: Array.isArray(doc.turns) ? doc.turns.length : 0 };

  const turns = cuesToTurns(cues);
  if (turns.length < 5) return { updated: false, count: Array.isArray(doc.turns) ? doc.turns.length : 0 };

  doc.turns = turns;
  fs.writeFileSync(abs, JSON.stringify(doc, null, 2), "utf8");
  return { updated: true, count: turns.length };
}

export async function updateAll(root: string) {
  const files = fg.sync(["**/*-Raw*/**/*.json", "**/*RAW*.json"], { cwd: root, absolute: true });
  let touched = 0, total = 0;
  for (const f of files) {
    const { updated, count } = tryUpdateOne(f);
    if (updated) {
      touched++; total += count;
      console.log(`[update_turns] ${path.basename(f)} → ${count} turns`);
    }
  }
  console.log(`[update_turns] updated files: ${touched}, avg turns/file: ${touched ? Math.round(total/touched) : 0}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2];
  if (!dir) { console.error("Usage: node update_turns.js <canonical_dir>"); process.exit(1); }
  updateAll(dir);
}
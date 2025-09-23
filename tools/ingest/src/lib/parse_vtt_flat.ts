// tools/ingest/src/lib/parse_vtt_flat.ts
export type Cue = { start: number; end: number; text: string };

const TIME = String.raw`(?:\d{2}:)?\d{2}:\d{2}\.\d{3}`; // HH:MM:SS.mmm or MM:SS.mmm
const TC_RE = new RegExp(`(?<start>${TIME})\\s*-->\\s*(?<end>${TIME})`, "g");

function toSec(ts: string): number {
  // "HH:MM:SS.mmm" or "MM:SS.mmm"
  const p = ts.replace(",", ".").split(":").map(Number);
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
  if (p.length === 2) return p[0] * 60 + p[1];
  return 0;
}

export function parseVttFromFlat(text: string): Cue[] {
  const src = (text || "").replace(/^\uFEFF/, "");
  const matches: { index: number; start: string; end: string; full: string }[] = [];

  let m: RegExpExecArray | null;
  while ((m = TC_RE.exec(src)) !== null) {
    matches.push({
      index: m.index,
      start: (m.groups?.start || "").trim(),
      end: (m.groups?.end || "").trim(),
      full: m[0]
    });
  }

  if (matches.length < 3) return []; // not enough for a real transcript

  const cues: Cue[] = [];
  for (let i = 0; i < matches.length; i++) {
    const here = matches[i];
    const next = matches[i + 1];
    const contentStart = here.index + here.full.length;
    const contentEnd = next ? next.index : src.length;
    let chunk = src.slice(contentStart, contentEnd);
    // soften any weird spacing
    chunk = chunk.replace(/\s+/g, " ").replace(/\s([?.!,;:])/g, "$1").trim();
    if (chunk.length) {
      cues.push({
        start: toSec(here.start),
        end: toSec(here.end),
        text: chunk
      });
    }
  }
  return cues;
}
// tools/ingest/src/lib/speaker_detect.ts
export type Turn = { speaker: "coach"|"student"|"unknown"; start: number; end: number; text: string; conf: number };

const RE_LABEL = /^(?:-+\s*)?([A-Za-z][\w .'-]{0,40})\s*:\s*/;
const COACH_ALIASES = (process.env.SPEAKER_COACH_ALIASES || "jenny,jenny duan,coach,mentor,ivy mentors").split(",").map(s=>s.trim().toLowerCase());
const STUD_ALIASES  = (process.env.SPEAKER_STUDENT_ALIASES || "huda,student,mentee,heather").split(",").map(s=>s.trim().toLowerCase());

function classifyNameToken(name: string) {
  const l = name.toLowerCase();
  if (COACH_ALIASES.some(a => l.includes(a))) return "coach";
  if (STUD_ALIASES.some(a => l.includes(a))) return "student";
  return "unknown";
}

export function detectSpeaker(chunk: string): { speaker: Turn["speaker"]; conf: number; stripped: string } {
  let t = chunk.trim();

  // 1) Label at start: "Jenny Duan:" / "Huda:"
  const m = t.match(RE_LABEL);
  if (m) {
    const s = classifyNameToken(m[1]);
    t = t.slice(m[0].length).trim();
    return { speaker: s as Turn["speaker"], conf: s==="unknown" ? 0.75 : 0.98, stripped: t };
  }

  // 2) WebVTT voice tag variant "<v Jenny> ..."
  if (/^<v[^>]*>/.test(t)) {
    const tag = t.match(/^<v[^>]*>/i)?.[0] || "";
    const name = tag.replace(/^<v/i, "").replace(/>/g, "").trim();
    const s = classifyNameToken(name);
    t = t.slice(tag.length).trim();
    return { speaker: s as Turn["speaker"], conf: s==="unknown" ? 0.7 : 0.95, stripped: t };
  }

  // 3) Heuristics
  const low = t.toLowerCase();
  const coachHints = /(let's|please|email|send|schedule|here's|do this|we will|step|^#\d+)/.test(low)
                  || /yay|great job|awesome|so proud/i.test(t)
                  || /1\)|2\)|3\)|\bfirst\b.*\bthen\b/.test(low);
  const studentHints = /\bi\b.*\b(my|me)\b|\bgot\b|\bapplied\b|\bsubmitted\b|\brejected\b|\bwaitlisted\b/i.test(low)
                    || /here is my draft|i'm really|im really/i.test(low);

  if (coachHints && !studentHints) return { speaker: "coach", conf: 0.8, stripped: t };
  if (studentHints && !coachHints) return { speaker: "student", conf: 0.8, stripped: t };
  return { speaker: "unknown", conf: 0.5, stripped: t };
}

export function cuesToTurns(cues: {start:number; end:number; text:string}[]): Turn[] {
  const GAP_SEC = 4;
  const MAX_MERGE_CHARS = 800;

  const out: Turn[] = [];
  let cur: Turn | null = null;

  for (const c of cues) {
    const d = detectSpeaker(c.text);
    const piece: Turn = { speaker: d.speaker, conf: d.conf, start: c.start, end: c.end, text: d.stripped };

    const canMerge =
      cur &&
      piece.speaker !== "unknown" &&
      cur.speaker === piece.speaker &&
      (piece.start - cur.end) <= GAP_SEC &&
      (cur.text.length + 1 + piece.text.length) <= MAX_MERGE_CHARS;

    if (canMerge) {
      cur.text = (cur.text + " " + piece.text).trim();
      cur.end = piece.end;
      cur.conf = Math.min(cur.conf, piece.conf);
    } else {
      if (cur) out.push(cur);
      cur = piece;
    }
  }
  if (cur) out.push(cur);

  return out.map(t => ({ ...t, text: t.text.replace(/\s+/g, " ").replace(/\s([?.!,;:])/g, "$1").trim() }));
}
/* eslint-disable no-console */
import fs from "fs";
import path from "path";
import fg from "fast-glob";
import { fileURLToPath } from "url";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
import { exec } from "child_process";
import { promisify } from "util";
import { normalizeCollegeDecisions } from "./normalize_college_decisions.js";

const execAsync = promisify(exec);

// -------------------- PDF EXTRACTION --------------------
async function extractPdfText(pdfPath: string): Promise<string> {
  // Strategy 1: Try pdfjs-dist
  try {
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const pdf = await getDocument({ data, useSystemFonts: true }).promise;
    let fullText = "";
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      
      // Extract text and reconstruct VTT structure
      let pageText = content.items
        .filter((item: any) => item.str)
        .map((item: any) => item.str)
        .join(" ");
        
      // Post-process the text to reconstruct VTT structure with proper line breaks
      pageText = pageText
        // Add line breaks before cue numbers (standalone numbers)
        .replace(/(\s|^)(\d+)(\s+\d{2}:\d{2}:\d{2})/g, "$1\n$2\n$3")
        // Add line breaks before timestamps
        .replace(/(\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3})/g, "\n$1\n")
        // Add line breaks before speaker labels (name followed by colon)
        .replace(/(\s)([A-Za-z][\w\s]*:)(\s)/g, "$1\n$2$3")
        // Clean up multiple consecutive spaces and line breaks
        .replace(/ +/g, " ")
        .replace(/\n\s*\n\s*\n/g, "\n\n")
        .replace(/^\s+|\s+$/g, ""); // Trim whitespace
      
      fullText += pageText + "\n\n";
    }
    
    if (fullText.trim().length > 50) {
      return fullText;
    }
  } catch (e: any) {
    console.warn(`[pdf] pdfjs-dist failed for ${path.basename(pdfPath)}: ${e.message}`);
  }
  
  // Strategy 2: Try pdftotext if available
  try {
    const { stdout } = await execAsync(`pdftotext "${pdfPath}" -`);
    if (stdout && stdout.trim().length > 50) {
      return stdout;
    }
  } catch (e: any) {
    console.warn(`[pdf] pdftotext failed for ${path.basename(pdfPath)}: ${e.message}`);
  }
  
  // Strategy 3: Try tesseract OCR as last resort
  try {
    const { stdout } = await execAsync(`tesseract "${pdfPath}" - -l eng pdf`);
    if (stdout && stdout.trim().length > 50) {
      return stdout;
    }
  } catch (e: any) {
    console.warn(`[pdf] tesseract failed for ${path.basename(pdfPath)}: ${e.message}`);
  }
  
  console.error(`[pdf] All extraction methods failed for ${path.basename(pdfPath)}`);
  return "";
}

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
  turns?: { speaker: "coach"|"student"|"unknown"; start?: number; end?: number; text: string }[];
  meta?: Record<string, any>;
};

// -------------------- CONFIG / ALIASES --------------------
const SPEAKER_COACH = (process.env.SPEAKER_COACH_ALIASES || "jenny,coach,mentor").split(",").map(s=>s.trim().toLowerCase());
const SPEAKER_STUDENT = (process.env.SPEAKER_STUDENT_ALIASES || "huda,student,mentee").split(",").map(s=>s.trim().toLowerCase());

// -------------------- UTILS --------------------
function readUtf8(p:string){ return fs.readFileSync(p,"utf8"); }
function ensureDir(p:string){ if(!fs.existsSync(p)) fs.mkdirSync(p,{recursive:true}); }

// parse timestamps like 00:01:02.345 → seconds
function tsToSec(ts: string): number {
  // supports "HH:MM:SS.mmm" or "MM:SS.mmm"
  const parts = ts.split(":");
  let h=0, m=0, s=0;
  if (parts.length === 3) {
    h = Number(parts[0]);
    m = Number(parts[1]);
    s = Number(parts[2].replace(",","."));
  } else if (parts.length === 2) {
    m = Number(parts[0]);
    s = Number(parts[1].replace(",","."));
  }
  return (h*3600)+(m*60)+s;
}

function cleanLine(s:string): string {
  // strip bracketed/parenthetical annotations and excess spaces
  return s
    .replace(/<v[^>]*>/gi, "")              // remove <v Jenny>
    .replace(/\[.*?\]|\(.*?\)/g, "")        // [music], (laughs), (noise)
    .replace(/\s+/g, " ")
    .trim();
}

function classifySpeaker(rawLabel: string): "coach"|"student"|"unknown" {
  const l = rawLabel.trim().toLowerCase();
  if (SPEAKER_COACH.some(a => l.includes(a))) return "coach";
  if (SPEAKER_STUDENT.some(a => l.includes(a))) return "student";
  return "unknown";
}

// -------------------- VTT PARSER --------------------
type VttCue = { start: number; end: number; text: string };
function parseVttCues(content: string): VttCue[] {
  // Remove BOM, normalize newlines
  const src = content.replace(/^\uFEFF/, "").replace(/\r\n/g,"\n");
  const lines = src.split("\n");

  // Find header
  const isVtt = /^WEBVTT/i.test(lines[0] || "");
  if (!isVtt) return []; // not VTT; caller will fallback

  const cues: VttCue[] = [];
  let i = 1;

  while (i < lines.length) {
    // skip empty / comment / cue id lines
    while (i < lines.length && lines[i].trim() === "") i++;
    if (i >= lines.length) break;

    // optional cue identifier line (non-timing)
    let maybeId = lines[i].trim();
    // Next line should be timing, but sometimes the current line is timing.
    // Timing format: 00:00:01.000 --> 00:00:04.000
    const timingLine = /-->/i.test(maybeId) ? maybeId : (lines[i+1] || "");
    let start = 0, end = 0, textLines: string[] = [];

    if (/-->/i.test(timingLine)) {
      // timing line is either current or next
      const timing = /-->/i.test(maybeId) ? maybeId : timingLine;
      const [sPart, ePart] = timing.split(/-->/i).map(s => s.trim());
      try {
        start = tsToSec(sPart);
        end   = tsToSec(ePart.split(/\s+/)[0]); // remove any trailing settings
      } catch {
        // malformed timing – skip cue
        i += /-->/i.test(maybeId) ? 1 : 2;
        continue;
      }

      // advance index past timing line
      i += /-->/i.test(maybeId) ? 1 : 2;

      // collect text lines until blank
      while (i < lines.length && lines[i].trim() !== "") {
        textLines.push(lines[i]);
        i++;
      }
      // skip blank separator
      while (i < lines.length && lines[i].trim() === "") i++;

      const text = textLines.map(cleanLine).filter(Boolean).join(" ").trim();
      if (text) cues.push({ start, end, text });
    } else {
      // no timing → skip this line
      i++;
    }
  }

  return cues;
}

type Turn = { speaker: "coach"|"student"|"unknown"; start?: number; end?: number; text: string };

function vttCuesToTurns(cues: VttCue[]): Turn[] {
  // try to detect speaker on each cue text:
  // patterns:
  //   "Jenny: …"
  //   "- Jenny: …"
  //   "<v Jenny> …" (already stripped in cleanLine)
  const reLabel = /^(?:-+\s*)?([A-Za-z][\w .'-]{1,40})\s*:\s*/;

  const turns: Turn[] = [];
  let current: Turn | null = null;

  for (const cue of cues) {
    let text = cue.text.trim();
    let speaker: "coach"|"student"|"unknown" = "unknown";

    // extract label
    const m = text.match(reLabel);
    if (m) {
      const raw = m[1];
      speaker = classifySpeaker(raw);
      text = text.slice(m[0].length).trim();
    } else {
      // sometimes the label comes as a mid-text indicator (rare in VTT); keep unknown
    }

    // drop empties and pure filler
    if (!text || text.length < 2) continue;

    // merge consecutive same-speaker
    if (current && current.speaker === speaker) {
      current.text = `${current.text} ${text}`.trim();
      current.end = cue.end;
    } else {
      // push previous
      if (current) turns.push(current);
      current = { speaker, start: cue.start, end: cue.end, text };
    }
  }
  if (current) turns.push(current);

  // final cleanup: collapse extra spaces, remove duplicate punctuation
  return turns.map(t => ({ ...t, text: t.text.replace(/\s+/g, " ").replace(/\s([?.!,;:])/g, "$1").trim() }));
}

// -------------------- KIND/NAME PARSING --------------------
function inferKindFromPath(p: string): Canonical["kind"] {
  const l = p.toLowerCase();
  if (l.includes("-raw-") && l.includes("trans")) return "TRANS-RAW";
  if (l.includes("-intelligence-") && l.includes("trans")) return "TRANS-INTEL";
  if (l.includes("-raw-imessage") || l.includes("raw-imessages") || l.includes("raw-imsg")) return "IMSG-RAW";
  if (l.includes("-intelligence-") && l.includes("imsg")) return "IMSG-INTEL";
  if (l.includes("-raw-execution") || l.includes("raw-execution")) return "EXEC-RAW";
  if (l.includes("-intelligence-") && l.includes("exec")) return "EXEC-INTEL";
  if (l.includes("gameplan")) return "GAMEPLAN";
  if (l.includes("application")) return "APP-DOC";
  if (l.includes("email")) return "EMAIL";
  if (l.includes("report") || l.includes("notes")) return "REPORT";
  return "OTHER";
}

function parseWeekPhaseDateFromName(name: string){
  // matches like: 2023-06-21_W001_P1-FOUNDATION_...
  const re = /(\d{4}-\d{2}-\d{2})?_?W(\d{1,3})(?:_P(\d))?/i;
  const m = name.match(re);
  const date = (name.match(/\d{4}-\d{2}-\d{2}/) || [])[0] || undefined;
  const week = m ? String(Number(m[2])) : undefined;
  const phase = m && m[3] ? String(Number(m[3])) : undefined;
  return { date, week, phase };
}

// -------------------- ENTRY: normalize one file --------------------
async function normalizeFile(absIn: string, baseDir: string, outRoot: string){
  const rel = path.relative(baseDir, absIn);
  const name = path.basename(absIn);
  const kind = inferKindFromPath(rel);
  const { date, week, phase } = parseWeekPhaseDateFromName(name);

  let raw = "";
  
  // Check file extension
  const ext = path.extname(absIn).toLowerCase();
  
  // Handle Excel/CSV files for college decisions
  if ([".xlsx", ".xls", ".csv"].includes(ext)) {
    // Only process files that look like college lists/decisions
    if (/college|decision|status|common[_-]?app/i.test(name)) {
      try {
        const outPath = await normalizeCollegeDecisions(absIn, outRoot, "huda");
        console.log(`[normalize] college decisions → ${outPath}`);
        return; // Skip regular processing
      } catch (e: any) {
        console.warn(`[normalize] failed college decisions: ${name}: ${e.message}`);
      }
    }
    // For other Excel/CSV files, skip processing
    console.log(`[normalize] Skipping non-college Excel/CSV file: ${name}`);
    return;
  }
  
  // Check if PDF and extract text
  if (ext === '.pdf') {
    raw = await extractPdfText(absIn);
    if (!raw) {
      console.error(`[normalize] Failed to extract text from PDF: ${name}`);
      raw = "";
    }
  } else {
    // For non-PDF files, just read as text
    try {
      raw = readUtf8(absIn);
    } catch (e: any) {
      console.error(`[normalize] Failed to read file: ${name}`);
      raw = "";
    }
  }
  
  // Check if content looks like VTT (regardless of file extension)
  const looksVtt = /WEBVTT/i.test(raw.split(/\r?\n/)[0] || "") || raw.includes("-->") && raw.includes("00:");

  // If it looks like VTT → parse cues/turns; else, just plaintext with no turns
  let turns: Turn[] | undefined = undefined;
  if (looksVtt) {
    const cues = parseVttCues(raw);
    turns = vttCuesToTurns(cues);
  }

  // Plain text for `text` field (cleaned but without labels)
  let text = raw
    .replace(/^WEBVTT.*?\n+/is, "")                 // strip header
    .replace(/^\d+\n\d{2}:\d{2}:\d{2}\.\d{3}\s+-->\s+\d{2}:\d{2}:\d{2}\.\d{3}\n/gm, "") // strip timing-only lines
    .replace(/<v[^>]*>/gi, "")
    .replace(/\[.*?\]|\(.*?\)/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const out: Canonical = {
    id: rel.replace(/[^\w/.-]+/g, "_"),
    name,
    path: rel,
    kind,
    week,
    phase,
    date,
    link: null,
    text,
    segments: text ? chunk(text, 2000) : [],
    turns,
    meta: { ext: path.extname(absIn).toLowerCase(), source: "normalize-v1", vtt: looksVtt }
  };

  const outAbs = path.join(outRoot, rel).replace(/\.[^.]+$/, ".json");
  ensureDir(path.dirname(outAbs));
  fs.writeFileSync(outAbs, JSON.stringify(out, null, 2), "utf8");
  return outAbs;
}

function chunk(s: string, size: number): string[] {
  const out: string[] = [];
  for (let i=0;i<s.length;i+=size) out.push(s.slice(i, i+size));
  return out;
}

// -------------------- MAIN: normalize a folder --------------------
export async function normalizeFolder(inRoot: string, outRoot: string) {
  const files = fg.sync("**/*.{vtt,txt,md,json,pdf,docx,xlsx,xls,csv}", { cwd: inRoot, absolute: true, dot: false });
  if (!files.length) {
    console.warn(`[normalize] no files under ${inRoot}`);
    return { count: 0, outputs: [] as string[] };
  }
  const outputs: string[] = [];
  for (const f of files) {
    try {
      const out = await normalizeFile(f, inRoot, outRoot);
      outputs.push(out);
    } catch (e:any) {
      console.error(`[normalize] failed ${f}: ${e.message}`);
    }
  }
  return { count: outputs.length, outputs };
}

// CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const inDir  = process.argv[2] || "data/raw/jenny-huda";  // default RAW input root
  const outDir = process.argv[3] || "data/jenny-huda/canonical";  // default canonical output
  normalizeFolder(inDir, outDir).then(res => {
    console.log(`[normalize] done: ${res.count} files`);
  });
}
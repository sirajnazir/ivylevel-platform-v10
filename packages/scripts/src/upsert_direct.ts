import fs from "node:fs";
import readline from "node:readline";
import path from "node:path";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
// Inline the filename parsing and kind detection functions to avoid import issues

interface FilenameMeta {
  studentName?: string;
  docType?: string;
  dateIso?: string;
  coachName?: string;
  modelId?: string;
}

function parseFilenameMeta(filename: string): FilenameMeta {
  const base = filename.replace(/\.\w+$/, "");
  const parts = base.split("_");
  if (parts.length < 3) return {};
  
  const meta: FilenameMeta = {};
  meta.studentName = parts[0];
  
  let dateIdx = -1;
  for (let i = 1; i < parts.length; i++) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(parts[i])) {
      meta.dateIso = parts[i];
      dateIdx = i;
      break;
    }
  }
  
  if (dateIdx === -1) return meta;
  meta.docType = parts.slice(1, dateIdx).join("_");
  if (dateIdx + 1 < parts.length) meta.coachName = parts[dateIdx + 1];
  if (dateIdx + 2 < parts.length) meta.modelId = parts[dateIdx + 2];
  
  return meta;
}

function dateToPhase(dateIso: string): number {
  const d = new Date(dateIso);
  const month = d.getMonth() + 1;
  if (month >= 6 && month <= 8) return 1;
  if (month >= 9 && month <= 12) return 2;
  if (month >= 1 && month <= 3) return 3;
  if (month >= 4 && month <= 5) return 4;
  return 5;
}

function dateToWeek(dateIso: string, baseDate: string = "2024-06-01"): number {
  const d = new Date(dateIso);
  const base = new Date(baseDate);
  const diffMs = d.getTime() - base.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, Math.floor(diffDays / 7));
}

function detectKind(filename: string, content?: string): string {
  const fn = filename.toLowerCase();
  const text = (content || "").toLowerCase().slice(0, 2000);
  
  if (fn.includes("assessment") || fn.includes("gameplan") || fn.includes("game_plan")) {
    return "GAMEPLAN";
  }
  if (text.includes("assessment report") || text.includes("game plan") || text.includes("initial evaluation")) {
    return "GAMEPLAN";
  }
  
  if (fn.includes("transcript") || fn.includes("trans_intel") || fn.includes("grade")) {
    return "TRANS-INTEL";
  }
  if (text.includes("transcript analysis") || text.includes("gpa") || text.includes("course rigor")) {
    return "TRANS-INTEL";
  }
  
  if (fn.includes("executive") || fn.includes("exec_intel") || fn.includes("weekly_report")) {
    return "EXEC-INTEL";
  }
  if (text.includes("executive summary") || text.includes("weekly progress") || text.includes("action items")) {
    return "EXEC-INTEL";
  }
  
  if (fn.includes("essay") || fn.includes("application") || fn.includes("supplement")) {
    return "APP-DOC";
  }
  if (fn.includes("activities") || fn.includes("awards") || fn.includes("honors")) {
    return "APP-DOC";
  }
  if (text.includes("common app") || text.includes("supplemental essay") || text.includes("why us")) {
    return "APP-DOC";
  }
  
  if (fn.includes("architecture")) return "ARCHITECTURE";
  if (fn.includes("strategy")) return "STRATEGY";
  if (fn.includes("research")) return "RESEARCH";
  
  return "GENERAL";
}

function normalizeDocType(docType: string): string {
  const dt = docType.toLowerCase().replace(/[_-]/g, " ");
  
  if (dt.includes("assessment") && dt.includes("gameplan")) return "Assessment_GamePlan";
  if (dt.includes("assessment") && dt.includes("report")) return "Assessment_GamePlan";
  if (dt.includes("transcript") && dt.includes("intel")) return "Transcript_Intelligence";
  if (dt.includes("executive") && dt.includes("intel")) return "Executive_Intelligence";
  if (dt.includes("weekly") && dt.includes("report")) return "Weekly_Report";
  if (dt.includes("activities") || dt.includes("awards")) return "Activities_Awards_List";
  
  return docType.replace(/\s+/g, "_");
}

type RagRec = {
  id: string;
  text: string;
  kind?: string;
  week?: number | null;
  phase?: string | null;
  layers?: string[];
  doc_name?: string;
  link?: string;
  coach?: string;
  student?: string;
};

type PineconeVector = {
  id: string;
  values: number[];
  metadata: Record<string, string | number | boolean | string[]>;
};

const {
  PINECONE_API_KEY,
  PINECONE_INDEX = "jenny-v1",
  PINECONE_NAMESPACE = "jenny_v1",
  OPENAI_API_KEY,
  RAG_JSONL = "data/processed/jenny-huda/rag_index.jsonl",
  UPSERT_BATCH = "50",
  UPSERT_CONCURRENCY = "1", // currently not used; concurrency kept at 1 for stability
  EMBEDDING_MODEL = "text-embedding-3-small",
  CHECKPOINT_PATH = "data/processed/jenny-huda/.upsert_checkpoint.txt",
} = process.env;

if (!PINECONE_API_KEY || !OPENAI_API_KEY) {
  console.error("Missing PINECONE_API_KEY or OPENAI_API_KEY");
  process.exit(1);
}

const BATCH = Math.max(1, parseInt(UPSERT_BATCH, 10) || 50);

// normalize + trim helpers
function norm(s: string) {
  return (s || "").replace(/\s+/g, " ").trim();
}
function trimText(s: string, max = 1500) {
  s = norm(s);
  return s.length > max ? s.slice(0, max) : s;
}

// Pinecone metadata must be: string | number | boolean | string[]
function sanitize(meta: Record<string, unknown>): Record<string, string | number | boolean | string[]> | null {
  const out: Record<string, string | number | boolean | string[]> = {};
  const entries = Object.entries(meta || {});
  for (const [k, v] of entries) {
    if (v === null || v === undefined) continue;

    if (Array.isArray(v)) {
      const arr: string[] = v
        .map((x) => (x === null || x === undefined ? null : String(x)))
        .filter((x): x is string => !!x && x.length > 0);
      if (arr.length) out[k] = arr;
      continue;
    }

    const t = typeof v;
    if (t === "string" || t === "number" || t === "boolean") {
      out[k] = t === "string" ? (v as string).slice(0, 4000) : (v as number | boolean);
    }
  }

  // require non-trivial text for this vector
  const text = out["text"];
  if (typeof text !== "string" || text.trim().length < 10) return null;

  return out;
}

async function withRetry<T>(fn: () => Promise<T>, label: string, maxAttempts = 6): Promise<T> {
  let err: unknown;
  for (let a = 1; a <= maxAttempts; a++) {
    try {
      return await fn();
    } catch (e: any) {
      err = e;
      const wait = Math.min(1000 * 2 ** (a - 1), 15000);
      console.warn(`[${label}] attempt ${a}/${maxAttempts} failed → ${e?.message || e}; retry in ${wait}ms`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw new Error(`[${label}] failed after ${maxAttempts} attempts: ${(err as any)?.message || String(err)}`);
}

async function main() {
  // clients
  const pc = new Pinecone({ apiKey: PINECONE_API_KEY! });
  const index = pc.index(PINECONE_INDEX).namespace(PINECONE_NAMESPACE);
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY! });

  // resume support
  let startLine = 0;
  if (fs.existsSync(CHECKPOINT_PATH)) {
    const v = parseInt(fs.readFileSync(CHECKPOINT_PATH, "utf-8").trim() || "0", 10);
    if (!isNaN(v)) startLine = v;
  }

  if (!fs.existsSync(RAG_JSONL)) {
    console.error(`RAG_JSONL not found at: ${RAG_JSONL}`);
    process.exit(1);
  }

  // streaming reader
  const stream = fs.createReadStream(RAG_JSONL, { encoding: "utf-8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let lineNo = -1;
  let batch: { id: string; metadata: Record<string, unknown> }[] = [];
  let total = 0;
  let droppedShort = 0;
  let droppedMeta = 0;
  let parseErrors = 0;

  // allow-list kinds - expanded with new standardized types
  const ALLOW_KINDS = new Set([
    "TRANS-INTEL",
    "EXEC-INTEL",
    "IMSG-INTEL",
    "GAMEPLAN",
    "APP-DOC",
    "TRANS-RAW",
    "ARCHITECTURE",
    "STRATEGY",
    "RESEARCH",
    "GENERAL",
  ]);

  async function flush() {
    if (!batch.length) return;

    // Prepare texts for embedding
    const texts: string[] = [];
    const items: { id: string; metadata: Record<string, unknown> }[] = [];

    for (const b of batch) {
      const t = norm(String((b.metadata as any).text || ""));
      if (t.length < 10) {
        droppedShort++;
        continue;
      }
      (b.metadata as any).text = trimText(t, 1500);
      texts.push((b.metadata as any).text);
      items.push(b);
    }
    if (!items.length) {
      batch = [];
      return;
    }

    // Embeddings
    const emb = await withRetry(
      () => openai.embeddings.create({ model: EMBEDDING_MODEL, input: texts }),
      "openai.embeddings"
    );

    const n = Math.min(emb.data.length, items.length);
    const vectors: PineconeVector[] = [];

    for (let i = 0; i < n; i++) {
      const meta = sanitize(items[i].metadata);
      if (!meta) {
        droppedMeta++;
        continue;
      }
      const embedding = emb.data[i]?.embedding as number[] | undefined;
      if (!embedding || !Array.isArray(embedding)) continue;

      vectors.push({ id: items[i].id, values: embedding, metadata: meta });
    }

    if (!vectors.length) {
      batch = [];
      return;
    }

    // Upsert to Pinecone
    await withRetry(() => index.upsert(vectors), "pinecone.upsert");

    total += vectors.length;
    fs.writeFileSync(CHECKPOINT_PATH, String(lineNo)); // persist progress
    process.stdout.write(`\rUpserted: ${total} (line ${lineNo})`);
    batch = [];
  }

  for await (const line of rl) {
    lineNo++;
    if (lineNo < startLine) continue; // resume skip

    const s = line.trim();
    if (!s) continue;

    let rec: RagRec;
    try {
      rec = JSON.parse(s) as RagRec;
    } catch {
      parseErrors++;
      continue;
    }

    // kind filter
    if (rec.kind && !ALLOW_KINDS.has(rec.kind)) continue;

    // Extract temporal data from filename
    const sourcePath = rec.link || rec.doc_name || rec.id || "";
    const base = sourcePath ? path.basename(sourcePath) : String(rec.id || "");
    const parsed = parseFilenameMeta(base);

    // Detect kind from filename and content
    const detectedKind = detectKind(base, rec.text);
    
    // Calculate phase and week from date
    const phase = parsed.dateIso ? dateToPhase(parsed.dateIso) : rec.phase;
    const week = parsed.dateIso ? dateToWeek(parsed.dateIso) : rec.week;
    
    // Normalize doc type
    const docType = parsed.docType ? normalizeDocType(parsed.docType) : undefined;

    const metadata: Record<string, unknown> = {
      text: rec.text ?? "",
      kind: detectedKind || rec.kind || undefined,
      week: week ?? undefined,
      phase: phase ?? undefined,
      date_iso: parsed.dateIso ?? undefined,
      layers: Array.isArray(rec.layers) ? rec.layers.map(String) : undefined,
      doc_name: rec.doc_name ?? (base || undefined),
      doc_type: docType,
      link: rec.link ?? undefined,
      coach: parsed.coachName ?? rec.coach ?? undefined,
      student: parsed.studentName ?? rec.student ?? undefined,
      model_id: parsed.modelId ?? undefined,
    };

    // ensure id
    const id = rec.id || `auto_${lineNo}`;
    batch.push({ id, metadata });

    if (batch.length >= BATCH) {
      await flush();
    }
  }

  await flush();
  console.log(
    `\nDone. Total upserted: ${total} (dropped_short=${droppedShort}, dropped_meta=${droppedMeta}, parse_errors=${parseErrors}, last_line=${lineNo})`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
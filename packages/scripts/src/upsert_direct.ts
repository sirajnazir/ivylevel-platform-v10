import fs from "node:fs";
import readline from "node:readline";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

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

const {
  PINECONE_API_KEY,
  PINECONE_INDEX = "jenny-v1",
  PINECONE_NAMESPACE = "jenny_v1",
  OPENAI_API_KEY,
  RAG_JSONL = "data/processed/jenny-huda/rag_index.jsonl",
  UPSERT_BATCH = "50",
  UPSERT_CONCURRENCY = "1",                // keep 1 for stability
  EMBEDDING_MODEL = "text-embedding-3-small",
  CHECKPOINT_PATH = "data/processed/jenny-huda/.upsert_checkpoint.txt"
} = process.env;

if (!PINECONE_API_KEY || !OPENAI_API_KEY) {
  console.error("Missing PINECONE_API_KEY or OPENAI_API_KEY"); process.exit(1);
}

const BATCH = parseInt(UPSERT_BATCH, 10);

function norm(s: string) { return (s || "").replace(/\s+/g, " ").trim(); }
function trimText(s: string, max=1500){ s = norm(s); return s.length>max ? s.slice(0,max) : s; }

// sanitize Pinecone metadata
function sanitize(meta: any) {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(meta || {})) {
    if (v === null || v === undefined) continue;
    if (Array.isArray(v)) {
      const arr = v.map(x => (x === null || x === undefined) ? null : String(x))
                   .filter((x): x is string => !!x && x.length > 0);
      if (arr.length) out[k] = arr;
      continue;
    }
    const t = typeof v;
    if (t === "string" || t === "number" || t === "boolean") {
      out[k] = (t === "string") ? (v as string).slice(0, 4000) : v;
    }
  }
  if (!out.text || typeof out.text !== "string" || out.text.trim().length < 10) return null;
  return out;
}

async function withRetry<T>(fn: () => Promise<T>, label: string, maxAttempts=6): Promise<T> {
  let err: any;
  for (let a=1; a<=maxAttempts; a++) {
    try { return await fn(); }
    catch (e: any) {
      err = e; const wait = Math.min(1000 * (2 ** (a-1)), 15000);
      console.warn(`[${label}] attempt ${a}/${maxAttempts} failed → ${e?.message || e}; retry in ${wait}ms`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
  throw new Error(`[${label}] failed after ${maxAttempts} attempts: ${err?.message || String(err)}`);
}

async function main() {
  const pc = new Pinecone({ apiKey: PINECONE_API_KEY! });
  const index = pc.index(PINECONE_INDEX).namespace(PINECONE_NAMESPACE);
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY! });

  // resume support
  let startLine = 0;
  if (fs.existsSync(CHECKPOINT_PATH)) {
    const v = parseInt(fs.readFileSync(CHECKPOINT_PATH, "utf-8").trim() || "0", 10);
    if (!isNaN(v)) startLine = v;
  }

  const stream = fs.createReadStream(RAG_JSONL, { encoding: "utf-8" });
  const rl = readline.createInterface({ input: stream });

  let lineNo = -1;
  let batch: { id: string; metadata: any }[] = [];
  let total = 0, droppedShort = 0, droppedMeta = 0, sent = 0;

  async function flush() {
    if (!batch.length) return;

    // prepare text
    const texts = [];
    const items = [];
    for (const b of batch) {
      const t = norm(b.metadata.text || "");
      if (t.length < 10) { droppedShort++; continue; }
      b.metadata.text = trimText(t, 1500);
      texts.push(b.metadata.text);
      items.push(b);
    }
    if (!items.length) { batch = []; return; }

    const emb = await withRetry(
      () => openai.embeddings.create({ model: EMBEDDING_MODEL, input: texts }),
      "openai.embeddings"
    );
    const n = Math.min(emb.data.length, items.length);

    const vectors = [];
    for (let i=0; i<n; i++) {
      const m = sanitize(items[i].metadata);
      if (!m) { droppedMeta++; continue; }
      vectors.push({ id: items[i].id, values: emb.data[i].embedding, metadata: m });
    }
    if (!vectors.length) { batch = []; return; }

    await withRetry(() => index.upsert(vectors), "pinecone.upsert");
    total += vectors.length;
    sent += items.length;
    fs.writeFileSync(CHECKPOINT_PATH, String(lineNo));        // persist progress
    process.stdout.write(`\rUpserted: ${total} (line ${lineNo})`);
    batch = [];
  }

  for await (const line of rl) {
    lineNo++;
    if (lineNo < startLine) continue;                         // resume skip
    const s = line.trim();
    if (!s) continue;

    const rec: RagRec = JSON.parse(s);
    // skip OTHER by default
    if (rec.kind && !["TRANS-INTEL","EXEC-INTEL","IMSG-INTEL","GAMEPLAN","APP-DOC","TRANS-RAW"].includes(rec.kind)) continue;

    const metadata = {
      text: rec.text ?? "",
      kind: rec.kind ?? undefined,
      week: (typeof rec.week === "number" ? rec.week : undefined),
      phase: (typeof rec.phase === "string" && rec.phase) ? rec.phase : undefined,
      layers: Array.isArray(rec.layers) ? rec.layers.map(String) : undefined,
      doc_name: rec.doc_name ?? undefined,
      link: rec.link ?? undefined,
      coach: rec.coach ?? undefined,
      student: rec.student ?? undefined,
    };

    batch.push({ id: rec.id, metadata });
    if (batch.length >= BATCH) await flush();
  }
  await flush();
  console.log(`\nDone. Total upserted: ${total} (dropped_short=${droppedShort}, dropped_meta=${droppedMeta}, last_line=${lineNo})`);
}

main().catch(e => { console.error(e); process.exit(1); });
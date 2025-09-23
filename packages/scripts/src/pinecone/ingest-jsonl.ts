import fs from "node:fs";
import fetch from "node-fetch";

const RAG_JSONL = process.env.RAG_JSONL || "./jenny_master_corpus.jsonl";
const UPSERT_URL = process.env.RETRIEVER_UPSERT_URL || "http://localhost:4102/upsert";

function* readJsonl(path:string) {
  const lines = fs.readFileSync(path, "utf-8").split(/\r?\n/).filter(Boolean);
  for (const ln of lines) yield JSON.parse(ln);
}

(async () => {
  const batch:any[] = [];
  for (const rec of readJsonl(RAG_JSONL)) batch.push(rec);
  const payload = { records: batch };
  const r = await fetch(UPSERT_URL, { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify(payload) });
  console.log("Upsert status", r.status);
  const out = await r.json();
  console.log(out);
})().catch(e => { console.error(e); process.exit(1); });

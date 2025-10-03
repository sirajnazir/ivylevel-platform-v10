// services/agent/src/retriever/kindLocked.ts
import fetch from "node-fetch";

type Kind = "APP-DOC"|"EXEC-INTEL"|"TRANS-INTEL"|"IMSG-INTEL"|"GAMEPLAN";

export async function pineconeQueryKindLocked(opts: {
  q: string; k?: number; kind: Kind; studentId?: string; week?: number;
  extraFilter?: Record<string, any>;
}) {
  const body: any = {
    q: opts.q,
    k: opts.k ?? 4,
    filter: { kind: opts.kind, ...(opts.studentId ? { student: opts.studentId } : {}), ...(opts.week ? { week: opts.week } : {}), ...(opts.extraFilter||{}) }
  };
  const baseUrl = process.env.RETRIEVER_URL || "http://localhost:4102";
  const url = `${baseUrl}/search`;
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`retriever ${res.status}`);
  const hits: any = await res.json();
  // normalize to chips
  return (Array.isArray(hits) ? hits : hits.hits || []).map((h: any) => ({
    title: h.metadata?.title || h.id,
    kind: h.metadata?.kind || opts.kind,
    week: h.metadata?.week,
    phase: h.metadata?.phase,
    link: h.metadata?.link || h.metadata?.doc_name,
    span: h.metadata?.span || h.id,
    score: h.score
  }));
}

// federatedSearch.ts — pools results from sessions + iMessage (and future execution)
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

type Hit = {
  id: string;
  score: number;
  metadata: Record<string, any>;
  namespace: string;
};

export async function federatedSearch(query: string, opts?: {
  topK?: number;
  namespaces?: string[]; // defaults to sessions + iMessage
  source?: "session" | "imessage" | "both";
  metadataFilter?: Record<string, any>;
}) {
  const topK = opts?.topK ?? 10;
  const namespaces = opts?.namespaces ?? [
    "KBv6_2025-10-06_v1.0",          // sessions
    "KBv6_iMessage_2025-10-07_v1.0", // iMessage
  ];
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  const index = pc.index(process.env.PINECONE_INDEX || "jenny-v3-3072-093025");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  // embed the query
  const emb = await openai.embeddings.create({
    model: "text-embedding-3-large",
    input: query
  });
  const vec = emb.data[0].embedding;

  // per-namespace searches in parallel
  const queries = namespaces.map(ns => index.namespace(ns).query({
    vector: vec,
    topK,
    includeMetadata: true,
    filter: buildFilter(opts?.source, opts?.metadataFilter),
  }));

  const results = await Promise.all(queries);
  const hits: Hit[] = [];
  results.forEach((res, i) => {
    const ns = namespaces[i];
    (res.matches || []).forEach(m => hits.push({
      id: m.id as string,
      score: m.score as number,
      metadata: (m.metadata || {}) as any,
      namespace: ns,
    }));
  });

  // pool + rerank by score
  hits.sort((a,b)=> b.score - a.score);
  return hits.slice(0, topK);
}

function buildFilter(source?: "session"|"imessage"|"both", extra?: Record<string, any>) {
  const filter: any = extra ? { ...extra } : {};
  if (source && source !== "both") {
    filter.chip_family = source;
  }
  return Object.keys(filter).length ? filter : undefined;
}

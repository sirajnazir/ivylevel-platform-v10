import OpenAI from "openai";
import { baseIndex, resolveNamespaceForKind } from "./pinecone";
import { hybridSearch } from "./bm25";
import { child } from "@packages/logger";

const log = child({ svc: "retriever.query" });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function queryPinecone({
  q,
  topK,
  filter,
  hybrid = false
}: { q: string; topK: number; filter?: Record<string, any>; hybrid?: boolean }) {
  // embed the query
  const emb = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: q
  });
  const vector = emb.data[0].embedding;

  // Determine namespace dynamically: prefer explicit namespace on env; else by kind
  const requestedKind: string | undefined = (filter as any)?.kind || (filter as any)?.kind?.$eq || undefined;
  const explicitNs = process.env.PINECONE_NAMESPACE;
  const namespace = resolveNamespaceForKind(
    typeof requestedKind === "string" ? requestedKind : undefined,
    explicitNs
  );

  const res = await baseIndex.namespace(namespace).query({
    topK,
    vector,
    includeMetadata: true,
    filter: filter ?? {}
  });

  // Normalize for API
  const vectorResults = (res.matches ?? []).map(m => ({
    id: m.id,
    score: m.score,
    text: m.metadata?.text || "",         // Include text field
    kind: m.metadata?.kind,
    week: m.metadata?.week,
    phase: m.metadata?.phase,
    date_iso: m.metadata?.date_iso,
    grade: m.metadata?.grade,
    season: m.metadata?.season,
    school_year: m.metadata?.school_year,
    link: m.metadata?.link,
    doc_name: m.metadata?.doc_name,
    metadata: m.metadata
  }));
  
  // If hybrid search requested, combine with BM25
  if (hybrid) {
    log.debug({ query: q, vectorHits: vectorResults.length }, "query.hybrid_search");
    return hybridSearch({
      vectorResults,
      query: q,
      filter,
      alpha: 0.7 // 70% vector, 30% BM25
    });
  }
  
  return vectorResults;
}
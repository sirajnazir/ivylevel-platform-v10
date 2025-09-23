import OpenAI from "openai";
import { index } from "./pinecone";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function queryPinecone({
  q, topK, filter
}: { q: string; topK: number; filter?: Record<string, any> }) {
  // embed the query
  const emb = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: q
  });
  const vector = emb.data[0].embedding;

  const res = await index.query({
    topK,
    vector,
    includeMetadata: true,
    filter: filter ?? {}
  });

  // Normalize for API
  return (res.matches ?? []).map(m => ({
    id: m.id,
    score: m.score,
    metadata: m.metadata
  }));
}
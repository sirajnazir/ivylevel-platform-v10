import { NextRequest, NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function GET(req: NextRequest) {
  try {
    const queries = [
      { query: "168-hour framework", namespace: "KBv6_2025-10-06_v1.0" },
      { query: "thank you template", namespace: "KBv6_iMessage_2025-10-07_v1.0" },
      { query: "assessment", namespace: "KBv6_Assessment_2025-10-07_v1.0" },
    ];

    const results = [];

    for (const { query, namespace } of queries) {
      // Embed query
      const { data } = await openai.embeddings.create({
        model: "text-embedding-3-large",
        input: query,
      });
      const vector = data[0].embedding;

      // Query namespace
      const index = pc.index(process.env.PINECONE_INDEX!);
      const result = await index.namespace(namespace).query({
        vector,
        topK: 1,
        includeMetadata: true,
      });

      const hit = result.matches[0];

      results.push({
        namespace,
        chip_id: hit.id,
        score: hit.score,
        metadata_keys: Object.keys(hit.metadata || {}),
        has_content: !!hit.metadata?.content,
        has_text: !!hit.metadata?.text,
        has_chunk: !!hit.metadata?.chunk,
        sample_fields: {
          content: hit.metadata?.content?.substring(0, 200),
          text: hit.metadata?.text?.substring(0, 200),
          chunk: hit.metadata?.chunk?.substring(0, 200),
        },
      });
    }

    return NextResponse.json({ results }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

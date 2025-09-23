import { Pinecone } from "@pinecone-database/pinecone";

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
export const index = pc.index(process.env.PINECONE_INDEX!).namespace(
  process.env.PINECONE_NAMESPACE || "jenny_v1"
);

// (optional) for logs:
console.log(JSON.stringify({
  pinecone_index: process.env.PINECONE_INDEX,
  pinecone_ns: process.env.PINECONE_NAMESPACE || "jenny_v1"
}));
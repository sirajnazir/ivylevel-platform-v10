import { Pinecone } from "@pinecone-database/pinecone";

const { PINECONE_API_KEY, PINECONE_INDEX = "jenny-v1", PINECONE_NAMESPACE = "jenny_v1" } = process.env;
if (!PINECONE_API_KEY) { console.error("Missing PINECONE_API_KEY"); process.exit(1); }

async function main() {
  const pc = new Pinecone({ apiKey: PINECONE_API_KEY! });
  const idx = pc.index(PINECONE_INDEX);
  const stats = await idx.describeIndexStats({ filter: {}, namespaces: [PINECONE_NAMESPACE] as any });
  console.log(JSON.stringify(stats, null, 2));
}
main().catch(e => { console.error(e); process.exit(1); });
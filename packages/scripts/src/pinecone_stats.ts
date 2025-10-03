import { Pinecone } from "@pinecone-database/pinecone";

const {
  PINECONE_API_KEY,
  PINECONE_INDEX = "jenny-v1",
  PINECONE_NAMESPACE = "jenny_v1",
} = process.env;

if (!PINECONE_API_KEY) {
  console.error("Missing PINECONE_API_KEY");
  process.exit(1);
}

async function main() {
  const pc = new Pinecone({ apiKey: PINECONE_API_KEY! });
  const index = pc.index(PINECONE_INDEX);

  // New SDK: no params to describeIndexStats()
  const stats: any = await index.describeIndexStats();

  const total = Number(stats?.totalVectorCount ?? 0);
  // Namespaces map may or may not be present depending on serverless backend
  const nsStats = (stats as any)?.namespaces?.[PINECONE_NAMESPACE];
  const nsCount = Number(nsStats?.vectorCount ?? 0);

  console.log(JSON.stringify({
    index: PINECONE_INDEX,
    namespace: PINECONE_NAMESPACE,
    totalVectorCount: total,
    namespaceVectorCount: nsCount,
    dimension: stats?.dimension ?? null,
    // Some backends expose 'indexFullness' etc.; keep optional
    indexFullness: stats?.indexFullness ?? null,
    namespacesKnown: Object.keys((stats as any)?.namespaces ?? {}).length,
  }, null, 2));
}

main().catch((err) => {
  console.error("pinecone_stats error:", err?.message || err);
  process.exit(1);
});
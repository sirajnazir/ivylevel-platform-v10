import { Pinecone } from "@pinecone-database/pinecone";

export type PineEnv = {
  apiKey?: string;
  indexName?: string;
  namespace?: string;
};

// ===== Namespace Guard =====
// Hard block legacy namespaces to prevent retrieval pollution
const ALLOWED_NAMESPACES = (process.env.PINECONE_ALLOWED_NAMESPACES ?? "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

export function assertAllowedNamespace(ns: string): void {
  if (!ALLOWED_NAMESPACES.length) {
    // If env var not set, allow all (backwards compatible)
    return;
  }
  if (!ALLOWED_NAMESPACES.includes(ns)) {
    throw new Error(`❌ Blocked namespace: "${ns}" | Allowed: [${ALLOWED_NAMESPACES.join(", ")}]`);
  }
}

export const loadPineEnv = (): PineEnv => {
  const ns = process.env.PINECONE_NAMESPACE;

  // Guard check before returning
  if (ns) {
    assertAllowedNamespace(ns);
  }

  return {
    apiKey: process.env.PINECONE_API_KEY,
    indexName: process.env.PINECONE_INDEX_NAME,
    namespace: ns,
  };
};

let cached: { client: Pinecone; index: ReturnType<Pinecone["Index"]> } | null = null;

export const getPinecone = () => {
  const env = loadPineEnv();
  if (!env.apiKey || !env.indexName) return null;

  if (!cached) {
    const client = new Pinecone({ apiKey: env.apiKey });
    const index = client.Index(env.indexName);
    cached = { client, index };
  }
  return cached;
};

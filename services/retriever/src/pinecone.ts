import { Pinecone } from "@pinecone-database/pinecone";

// Create a single Pinecone client and index handle (without locking namespace)
const pineconeClient = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
export const baseIndex = pineconeClient.index(process.env.PINECONE_INDEX!);

// Helper to resolve namespace by kind for jenny-v2
export function resolveNamespaceForKind(kind?: string, explicitNamespace?: string): string {
  if (explicitNamespace && explicitNamespace.trim().length > 0) return explicitNamespace.trim();
  const mapping: Record<string, string> = {
    // v2 namespaces
    "TRANS-INTEL": "transcript",
    "EXEC-INTEL": "transcript", // execution intel lives in transcripts namespace
    "IMSG-INTEL": "transcript",
    "GAMEPLAN": "gameplan",
    "APP-DOC": "appdoc"
  };
  const key = (kind || "").toUpperCase();
  return mapping[key] || process.env.PINECONE_NAMESPACE || "jenny_v1";
}

// For startup logs (do not imply fixed namespace)
console.log(JSON.stringify({
  pinecone_index: process.env.PINECONE_INDEX,
  pinecone_ns: process.env.PINECONE_NAMESPACE || "(dynamic by kind)"
}));
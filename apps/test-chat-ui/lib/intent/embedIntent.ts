/**
 * Embedding-based Intent Classifier (Fallback)
 *
 * Uses centroid-based cosine similarity for semantic matching
 * Bootstrap from intent.seed.json
 */

import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type Centroid = { intent: string; vector: number[] };
let CENTROIDS: Centroid[] | null = null;

/**
 * Embed texts using OpenAI text-embedding-3-large
 */
async function embed(texts: string[]): Promise<number[][]> {
  try {
    const response = await client.embeddings.create({
      model: "text-embedding-3-large",
      input: texts,
    });
    return response.data.map((d) => d.embedding);
  } catch (error: any) {
    console.error("[embed-intent] Embedding error:", error.message);
    throw error;
  }
}

/**
 * Cosine similarity
 */
function cosine(a: number[], b: number[]): number {
  let sum = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return sum / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Load intent centroids from seed examples
 */
export async function loadIntentCentroids(seed: Record<string, string[]>) {
  console.log("[embed-intent] Loading centroids...");
  const intents = Object.keys(seed);

  const centroids: Centroid[] = [];

  for (const intent of intents) {
    const examples = seed[intent];
    if (!examples || examples.length === 0) continue;

    try {
      // Embed all examples
      const vectors = await embed(examples);

      // Compute centroid (mean vector)
      const dim = vectors[0].length;
      const mean = Array(dim).fill(0);
      for (const vec of vectors) {
        for (let i = 0; i < dim; i++) {
          mean[i] += vec[i];
        }
      }
      for (let i = 0; i < dim; i++) {
        mean[i] /= vectors.length;
      }

      centroids.push({ intent, vector: mean });
      console.log(`[embed-intent] Loaded centroid for "${intent}" (${examples.length} examples)`);
    } catch (error: any) {
      console.error(`[embed-intent] Failed to load centroid for "${intent}":`, error.message);
    }
  }

  CENTROIDS = centroids;
  console.log(`[embed-intent] Loaded ${centroids.length} centroids`);
}

/**
 * Classify query using embedding similarity
 */
export async function classifyWithEmbeddings(query: string): Promise<{ intent: string; score: number }> {
  if (!CENTROIDS || CENTROIDS.length === 0) {
    console.warn("[embed-intent] Centroids not loaded");
    return { intent: "kb.search", score: 0.4 };
  }

  try {
    // Embed query
    const [qv] = await embed([query]);

    // Find nearest centroid
    let best = { intent: "kb.search", score: 0 };
    for (const centroid of CENTROIDS) {
      const sim = cosine(qv, centroid.vector);
      if (sim > best.score) {
        best = { intent: centroid.intent, score: sim };
      }
    }

    return best;
  } catch (error: any) {
    console.error("[embed-intent] Classification error:", error.message);
    return { intent: "kb.search", score: 0.3 };
  }
}

/**
 * Check if centroids are loaded
 */
export function areCentroidsLoaded(): boolean {
  return CENTROIDS !== null && CENTROIDS.length > 0;
}

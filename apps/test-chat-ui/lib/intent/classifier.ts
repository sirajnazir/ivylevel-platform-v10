/**
 * Ensemble Intent Classifier
 *
 * Main coordinator: GPT-5 JSON + Embeddings + Regex Guards
 * Exports unified classifyIntent() function
 */

import { classifyWithGPT } from "./gptIntent";
import { classifyWithEmbeddings, loadIntentCentroids, areCentroidsLoaded } from "./embedIntent";
import { regexTags } from "./regexIntent";
import { fuseIntent, type FusedIntent } from "./fuse";
import policy from "../../config/policy.json";

/**
 * Initialize intent system (load centroids)
 */
export async function initializeIntentSystem() {
  if (areCentroidsLoaded()) {
    console.log("[classifier] Intent system already initialized");
    return;
  }

  try {
    // Load intent seeds
    const intentSeeds = await import("../../config/intent.seed.json");
    await loadIntentCentroids(intentSeeds.default);
    console.log("[classifier] Intent system initialized");
  } catch (error: any) {
    console.error("[classifier] Failed to initialize:", error.message);
    // Don't throw - can still use GPT + regex without embeddings
  }
}

/**
 * Main intent classification function (ensemble)
 */
export async function classifyIntent(query: string): Promise<FusedIntent> {
  const t0 = Date.now();

  console.log(`[classifier] Classifying: "${query.slice(0, 60)}..."`);

  try {
    // Run all 3 classifiers in parallel
    const [gpt, embed, rtags] = await Promise.all([
      classifyWithGPT(query),
      areCentroidsLoaded()
        ? classifyWithEmbeddings(query)
        : Promise.resolve({ intent: "kb.search", score: 0.4 }),
      Promise.resolve(regexTags(query)),
    ]);

    console.log(`[classifier] GPT: ${gpt.intent} (${gpt.confidence.toFixed(2)})`);
    console.log(`[classifier] Embed: ${embed.intent} (${embed.score.toFixed(2)})`);
    console.log(`[classifier] Regex tags: ${rtags.join(", ") || "(none)"}`);

    // Fuse with policy-driven confidence thresholds
    const fused = fuseIntent(gpt, embed, rtags, policy);

    const elapsed = Date.now() - t0;
    console.log(
      `[classifier] Result: ${fused.intents[0] || "(clarifier)"} | Source: ${fused.source} | Confidence: ${fused.confidence.toFixed(2)} (${elapsed}ms)`
    );

    return fused;
  } catch (error: any) {
    console.error("[classifier] Error:", error.message);

    // Fallback to low-confidence KB search
    return {
      intents: ["kb.search"],
      tags: [],
      source: "clarifier",
      confidence: 0.3,
    };
  }
}

/**
 * Export types
 */
export type { FusedIntent } from "./fuse";

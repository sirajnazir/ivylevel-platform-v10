/**
 * Policy loader and accessor
 * Loads configuration for confidence thresholds, namespace priors, and guards
 */

import fs from "fs";
import path from "path";

export type Policy = {
  confidence: { top1_min: number };
  assessment_gate: { enabled: boolean; topN: number; namespace: string };
  priors: {
    [namespace: string]: number | any;
    tags?: {
      [tag: string]: {
        [namespace: string]: number;
      };
    };
  };
  rerank: { semantic: number; lexical: number; type_prior: number };
};

let policy: Policy | null = null;

export function loadPolicy(configPath = "config/policy.json") {
  const fullPath = path.resolve(process.cwd(), configPath);
  console.log(`[Policy] Loading from: ${fullPath}`);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Policy file not found: ${fullPath}`);
  }

  policy = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  console.log(`[Policy] Loaded successfully`);
  return policy;
}

export function getPolicy(): Policy {
  if (!policy) {
    return loadPolicy();
  }
  return policy;
}

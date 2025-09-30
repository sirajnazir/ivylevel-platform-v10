// shared/intent.ts
export function isInitialIntent(message: string) {
  const m = (message || "").toLowerCase();
  return /(initial|first|week 0|week0|w0|game\s*plan|gameplan|assessment)/i.test(m);
}

export function isAwardsTopic(message: string) {
  return /\b(award|awards|honor|honors|achievement|achievements)\b/i.test(message);
}

export function isECsTopic(message: string) {
  return /\b(ec|ecs|activities|extracurriculars?)\b/i.test(message);
}

export type UserIntent = {
  topic?: "awards" | "ecs" | "summer" | "sat" | "gpa" | "college-list" | "other";
  timeframe?: "initial" | "actual" | "historical" | "unspecified";
  wantNames?: boolean;  // user wants names vs counts
};

export function detectIntent(message: string): UserIntent {
  const m = message.toLowerCase();

  const topic: UserIntent["topic"] =
    /award|honor/.test(m) ? "awards" :
    /ec|extracurricular|activities/.test(m) ? "ecs" :
    /summer|camp|program/.test(m) ? "summer" :
    /sat/.test(m) ? "sat" :
    /gpa/.test(m) ? "gpa" :
    /college/.test(m) ? "college-list" : "other";

  const timeframe: UserIntent["timeframe"] =
    /(initial|first|assessment|game\s*plan|gameplan)/.test(m) ? "initial" :
    /(actually won|won|accepted|final|outcome|result|did i|get)/.test(m) ? "actual" :
    /(week|w\d+|phase|p\d+)/.test(m) ? "historical" : "unspecified";

  const wantNames = /(list|name|which)/.test(m);

  return { topic, timeframe, wantNames };
}

// Import canonical key type
import type { CanonKey } from "./canon/registry";

// Map intent to canonical key
export function intentToCanonKey(intent: UserIntent | undefined): CanonKey | undefined {
  if (!intent) return undefined;
  
  if (intent.topic === "awards") {
    if (intent.timeframe === "initial") return "GAMEPLAN_INITIAL_AWARDS";
    if (intent.timeframe === "actual") return "APP_FINAL_AWARDS_STRICT";
  } else if (intent.topic === "ecs") {
    if (intent.timeframe === "initial") return "ecs.initial";
    if (intent.timeframe === "actual") return "ecs.final";
  } else if (intent.topic === "sat") {
    return "SAT_TIMELINE";
  } else if (intent.topic === "college-list") {
    return "college.list";
  }
  
  return undefined;
}
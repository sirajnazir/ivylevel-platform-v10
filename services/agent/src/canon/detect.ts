import { CanonKey } from "./registry";

export function detectCanonKey(message: string): CanonKey | null {
  const m = message.toLowerCase();

  // INITIAL (GamePlan)
  if (m.includes("initial") && m.includes("award") && (m.includes("game plan") || m.includes("gameplan")))
    return "GAMEPLAN_INITIAL_AWARDS";

  // ACTUAL / FINAL (prefer strict)
  if ((m.includes("final") || m.includes("actually won") || m.includes("won so far")) && m.includes("award"))
    return "APP_FINAL_AWARDS_STRICT";

  if (m.includes("final") && (m.includes("ec") || m.includes("extracurricular")))
    return "APP_FINAL_ECS";

  if (m.includes("sat") && (m.includes("progression") || m.includes("trajectory") || m.includes("timeline")))
    return "SAT_TIMELINE";

  if (m.includes("sat") && (m.includes("submit") || m.includes("submitted")))
    return "SAT_SUBMISSION";

  // Legacy mappings
  if (m.includes("initial") && m.includes("award")) return "awards.initial";
  if (m.includes("final") && m.includes("award")) return "awards.final";
  if (m.includes("initial") && (m.includes("ec") || m.includes("extracurricular"))) return "ecs.initial";
  if (m.includes("final") && (m.includes("ec") || m.includes("extracurricular"))) return "ecs.final";
  if (m.includes("sat")) return "sat.timeline";
  if (m.includes("college") && m.includes("list")) return "college.list";

  return null;
}
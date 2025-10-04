/**
 * v3.7.2 Universal Action Parameter Extraction (UAPX)
 * Domain-agnostic parameter schema for what-if/change/goal queries
 */

export type Domain =
  | "testing"        // SAT/ACT/AP
  | "awards"         // tier/level wins
  | "ecs"            // activities scaling: users, hours/week, leadership, funds, reach
  | "academics"      // GPA, grades, rigor deltas
  | "programs"       // summer programs admits/attend
  | "narrative";     // completeness milestones

export type Action =
  | "set"           // Set to exact value
  | "increase"      // Increase by delta
  | "decrease"      // Decrease by delta
  | "win"           // Win award
  | "admit"         // Get admitted
  | "convert"       // Convert grade
  | "complete";     // Complete milestone

export type Tier = "school" | "regional" | "national" | "international";

export interface UAPXTarget {
  name: string;                // "sat_total", "gpa_unweighted", "users", "funds_usd", "leadership_roles"
  value: number | string;      // numeric or enum like "national"
  unit?: string;               // "points", "users", "usd", "tier", "hours_per_week"
}

export interface UAPXDelta {
  name: string;                // same as target.name
  value: number;               // positive/negative
  unit?: string;               // "points", "%", "users"
}

export interface UAPXBounds {
  min?: number;
  max?: number;
}

export interface UAPXQualifiers {
  activity_name?: string;      // "Empowering AI", "Synthoria"
  award_name?: string;
  tier?: Tier;
  program_name?: string;
  subject?: string;            // "AP Calc BC"
  years?: string;              // "10-12", or explicit year(s)
}

export interface UAPX {
  domain: Domain;
  action: Action;
  target?: UAPXTarget;
  delta?: UAPXDelta;
  bounds?: UAPXBounds;
  qualifiers?: UAPXQualifiers;
  confidence: number;          // 0..1
  source: "rule" | "pattern" | "llm";
}

// Validation bounds by domain
export const DOMAIN_BOUNDS: Record<string, UAPXBounds> = {
  "sat_total": { min: 400, max: 1600 },
  "act_composite": { min: 1, max: 36 },
  "gpa_unweighted": { min: 0, max: 4.0 },
  "gpa_weighted": { min: 0, max: 5.0 },
  "users": { min: 0, max: 10_000_000 },
  "funds_usd": { min: 0, max: 10_000_000 },
  "hours_per_week": { min: 0, max: 168 },
};

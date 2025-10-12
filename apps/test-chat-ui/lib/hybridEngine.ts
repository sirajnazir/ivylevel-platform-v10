/**
 * Hybrid Engine
 *
 * Handles what-if scenarios, simulations, and prioritization by combining:
 * - SQL fact retrieval (current state)
 * - Feature delta computation (what-if logic)
 * - KB policy retrieval (strategic guidance)
 */

import { extractNumericPatterns } from './textNormalization';

/**
 * Student feature snapshot (from SQL)
 */
export interface FeatureSnapshot {
  sat_total?: number;
  sat_math?: number;
  sat_verbal?: number;
  act_composite?: number;
  gpa_weighted?: number;
  gpa_unweighted?: number;
  ap_count?: number;
  ap_5s?: number;
  awards_national?: number;
  awards_regional?: number;
  awards_school?: number;
  ec_leadership?: number;
  ec_impact_users?: number;
  programs_accepted?: number;
  readiness_score?: number;
}

/**
 * What-if parameters extracted from query
 */
export interface WhatIfParams {
  satDelta?: number;
  actDelta?: number;
  gpaDelta?: number;
  newAwards?: number;
  awardTier?: 'national' | 'regional' | 'school';
  dropAP?: boolean;
  newECs?: number;
  films?: number;
  leadershipTitles?: number;
}

/**
 * Feature deltas after applying what-if
 */
export interface FeatureDelta {
  before: FeatureSnapshot;
  after: FeatureSnapshot;
  changes: Array<{
    field: string;
    before: number;
    after: number;
    delta: number;
    deltaPct?: number;
  }>;
}

/**
 * Parse what-if parameters from query text
 */
export function parseWhatIf(query: string): WhatIfParams {
  const params: WhatIfParams = {};
  const q = query.toLowerCase();

  // Extract numeric patterns (e.g., "1430 to 1530")
  const patterns = extractNumericPatterns(query);
  for (const pattern of patterns) {
    if (pattern.type === 'sat') {
      params.satDelta = pattern.to - pattern.from;
    } else if (pattern.type === 'act') {
      params.actDelta = pattern.to - pattern.from;
    } else if (pattern.type === 'gpa') {
      params.gpaDelta = pattern.to - pattern.from;
    }
  }

  // Awards
  if (/win\s+(\w+)/i.test(q)) {
    const match = q.match(/win\s+(\w+)/i);
    if (match) {
      const awardName = match[1].toLowerCase();
      if (/ncwit|youngarts|national/i.test(awardName)) {
        params.newAwards = 1;
        params.awardTier = 'national';
      } else if (/regional/i.test(awardName)) {
        params.newAwards = 1;
        params.awardTier = 'regional';
      }
    }
  }

  // Multiple awards
  const awardMatch = q.match(/(\d+)\s+(?:more\s+)?award/i);
  if (awardMatch) {
    params.newAwards = parseInt(awardMatch[1], 10);
  }

  // Films/Projects
  const filmMatch = q.match(/(\d+)\s+film/i);
  if (filmMatch) {
    params.films = parseInt(filmMatch[1], 10);
  }

  // Drop AP
  if (/drop.*ap/i.test(q)) {
    params.dropAP = true;
  }

  // Leadership
  const leaderMatch = q.match(/(\d+)\s+(?:more\s+)?(?:leadership|lead)/i);
  if (leaderMatch) {
    params.leadershipTitles = parseInt(leaderMatch[1], 10);
  }

  return params;
}

/**
 * Apply what-if parameters to feature snapshot
 */
export function applyWhatIf(base: FeatureSnapshot, params: WhatIfParams): FeatureSnapshot {
  const after = { ...base };

  // SAT changes
  if (params.satDelta !== undefined && after.sat_total !== undefined) {
    after.sat_total = Math.min(1600, after.sat_total + params.satDelta);
  }

  // ACT changes
  if (params.actDelta !== undefined && after.act_composite !== undefined) {
    after.act_composite = Math.min(36, after.act_composite + params.actDelta);
  }

  // GPA changes
  if (params.gpaDelta !== undefined && after.gpa_weighted !== undefined) {
    after.gpa_weighted = Math.min(5.0, Math.max(0, after.gpa_weighted + params.gpaDelta));
  }

  // Drop AP impact
  if (params.dropAP) {
    if (after.ap_count !== undefined) after.ap_count = Math.max(0, after.ap_count - 1);
    if (after.gpa_weighted !== undefined) after.gpa_weighted = Math.max(0, after.gpa_weighted - 0.05);
  }

  // New awards
  if (params.newAwards !== undefined) {
    if (params.awardTier === 'national' && after.awards_national !== undefined) {
      after.awards_national += params.newAwards;
    } else if (params.awardTier === 'regional' && after.awards_regional !== undefined) {
      after.awards_regional += params.newAwards;
    } else if (params.awardTier === 'school' && after.awards_school !== undefined) {
      after.awards_school += params.newAwards;
    }
  }

  // Films (count as leadership ECs with impact)
  if (params.films !== undefined) {
    if (after.ec_leadership !== undefined) {
      after.ec_leadership += Math.min(2, params.films); // Cap contribution
    }
    if (after.ec_impact_users !== undefined) {
      after.ec_impact_users += params.films * 500; // Assume 500 views per film
    }
  }

  // Leadership titles
  if (params.leadershipTitles !== undefined && after.ec_leadership !== undefined) {
    after.ec_leadership += params.leadershipTitles;
  }

  return after;
}

/**
 * Compute deltas between before and after
 */
export function computeDeltas(before: FeatureSnapshot, after: FeatureSnapshot): FeatureDelta {
  const changes: FeatureDelta['changes'] = [];

  for (const key of Object.keys(before) as Array<keyof FeatureSnapshot>) {
    const beforeVal = before[key];
    const afterVal = after[key];

    if (beforeVal !== undefined && afterVal !== undefined && beforeVal !== afterVal) {
      const delta = afterVal - beforeVal;
      const deltaPct = beforeVal !== 0 ? (delta / beforeVal) * 100 : 0;

      changes.push({
        field: key,
        before: beforeVal,
        after: afterVal,
        delta,
        deltaPct
      });
    }
  }

  return {
    before,
    after,
    changes
  };
}

/**
 * Compute readiness impact from feature changes
 * Simple heuristic model - can be replaced with ML model later
 */
export function computeReadinessImpact(deltas: FeatureDelta): {
  readinessDelta: number;
  topFactors: Array<{ factor: string; impact: number }>;
} {
  const weights: Partial<Record<keyof FeatureSnapshot, number>> = {
    sat_total: 0.15,
    act_composite: 0.15,
    gpa_weighted: 0.20,
    awards_national: 0.25,
    awards_regional: 0.10,
    awards_school: 0.05,
    ec_leadership: 0.15,
    ap_5s: 0.10
  };

  let readinessDelta = 0;
  const factorImpacts: Array<{ factor: string; impact: number }> = [];

  for (const change of deltas.changes) {
    const weight = weights[change.field as keyof FeatureSnapshot] || 0;
    const normalizedDelta = change.delta / (change.before || 1); // Normalize by baseline
    const impact = weight * normalizedDelta * 100; // Scale to 0-100

    readinessDelta += impact;
    factorImpacts.push({
      factor: change.field,
      impact
    });
  }

  // Sort by impact magnitude
  factorImpacts.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

  return {
    readinessDelta: Math.round(readinessDelta * 10) / 10, // 1 decimal
    topFactors: factorImpacts.slice(0, 3)
  };
}

/**
 * Generate action recommendations based on current state and goals
 */
export function prioritizeActions(
  features: FeatureSnapshot,
  kbGuidance: any[]
): Array<{ action: string; roi: number; rationale: string }> {
  const actions: Array<{ action: string; roi: number; rationale: string }> = [];

  // SAT improvement if below 1500
  if (features.sat_total && features.sat_total < 1500) {
    actions.push({
      action: "Retake SAT (target 1520+)",
      roi: 0.85,
      rationale: "High-impact standardized testing signal for T20 schools"
    });
  }

  // National award pursuit if <2
  if ((features.awards_national || 0) < 2) {
    actions.push({
      action: "Submit to 2 national competitions (NCWIT, Scholastic, YoungArts)",
      roi: 0.90,
      rationale: "National recognition critical for spike narrative"
    });
  }

  // Leadership expansion if <3
  if ((features.ec_leadership || 0) < 3) {
    actions.push({
      action: "Secure 1 new leadership role in existing EC",
      roi: 0.65,
      rationale: "Demonstrates initiative and responsibility"
    });
  }

  // AP 5s if low
  if ((features.ap_5s || 0) < 3) {
    actions.push({
      action: "Focus on AP exam prep for May exams",
      roi: 0.55,
      rationale: "Academic rigor signal for selective schools"
    });
  }

  // GPA boost if below 4.0 weighted
  if ((features.gpa_weighted || 0) < 4.0) {
    actions.push({
      action: "Prioritize GPA maintenance (all A's this semester)",
      roi: 0.75,
      rationale: "GPA trend matters - upward trajectory shows resilience"
    });
  }

  // Sort by ROI
  actions.sort((a, b) => b.roi - a.roi);

  return actions.slice(0, 5);
}

/**
 * Generate what-if scenario summary for composition
 */
export interface WhatIfSummary {
  query: string;
  params: WhatIfParams;
  deltas: FeatureDelta;
  readinessImpact: {
    readinessDelta: number;
    topFactors: Array<{ factor: string; impact: number }>;
  };
  recommendations: Array<{ action: string; roi: number; rationale: string }>;
}

export function generateWhatIfSummary(
  query: string,
  before: FeatureSnapshot,
  after: FeatureSnapshot,
  kbGuidance: any[]
): WhatIfSummary {
  const params = parseWhatIf(query);
  const deltas = computeDeltas(before, after);
  const readinessImpact = computeReadinessImpact(deltas);
  const recommendations = prioritizeActions(after, kbGuidance);

  return {
    query,
    params,
    deltas,
    readinessImpact,
    recommendations
  };
}

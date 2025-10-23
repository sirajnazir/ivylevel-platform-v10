/**
 * IvyScore Resolver with HGTI Integration
 *
 * Computes IvyScore with phased HGTI rollout (10% → 20% → 28%).
 *
 * Version: v3.2.0
 * Fix #9: IvyScore HGTI Rollout (Feature Flag)
 */

import { pool } from '../db/pool-rls.js';
import { GrowthTracker } from '../hgti/growth-tracker.js';

// ============================================================================
// TYPES
// ============================================================================

export interface IvyScoreResult {
  score: number; // 0-1
  version: number; // Scoring version (1-4)
  academic_score: number;
  achievement_score: number;
  hgti_score: number;
  computed_at: Date;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Current scoring version (set via environment variable).
 *
 * Version 1: HGTI weight = 0% (baseline)
 * Version 2: HGTI weight = 10% (week 2-3)
 * Version 3: HGTI weight = 20% (week 4)
 * Version 4: HGTI weight = 28% (week 5+, target)
 */
let CURRENT_SCORING_VERSION = parseInt(process.env.IVYSCORE_VERSION || '1', 10);

/**
 * Sets the current scoring version.
 *
 * Use this to control phased rollout.
 *
 * @param version - Scoring version (1-4)
 */
export function setScoringVersion(version: number): void {
  if (version < 1 || version > 4) {
    throw new Error(`Invalid scoring version: ${version}. Must be 1-4.`);
  }

  CURRENT_SCORING_VERSION = version;
  console.log(`[IvyScore] Scoring version set to ${version} (HGTI weight: ${getHGTIWeight(version) * 100}%)`);
}

/**
 * Gets the current scoring version.
 */
export function getScoringVersion(): number {
  return CURRENT_SCORING_VERSION;
}

// ============================================================================
// HGTI WEIGHT SCHEDULE
// ============================================================================

/**
 * Gets the HGTI weight for a given scoring version.
 *
 * Version 1: 0% (baseline, no HGTI)
 * Version 2: 10%
 * Version 3: 20%
 * Version 4: 28% (target)
 *
 * @param version - Scoring version
 * @returns HGTI weight (0-1)
 */
function getHGTIWeight(version: number): number {
  switch (version) {
    case 1:
      return 0.0; // Baseline (no HGTI)
    case 2:
      return 0.1; // 10%
    case 3:
      return 0.2; // 20%
    case 4:
      return 0.28; // 28% (target)
    default:
      return 0.28; // Default to target
  }
}

// ============================================================================
// IVYSCORE COMPUTATION
// ============================================================================

/**
 * Computes IvyScore for a student with phased HGTI rollout.
 *
 * Formula:
 * - Academic score: 40% base (adjusted based on HGTI weight)
 * - Achievement score: 32% base (adjusted based on HGTI weight)
 * - HGTI score: 0% → 10% → 20% → 28% (phased rollout)
 *
 * @param studentId - Student ID
 * @param opts - Options (scoring_version override, realtime HGTI)
 * @returns IvyScore result
 */
export async function computeIvyScore(
  studentId: string,
  opts: { scoring_version?: number; realtime_hgti?: boolean } = {}
): Promise<IvyScoreResult> {
  // Get component scores
  const academicScore = await getAcademicScore(studentId);
  const achievementScore = await getAchievementScore(studentId);

  const growthTracker = new GrowthTracker();
  const hgtiScore = await growthTracker.getHGTIScore(studentId, {
    realtime: opts.realtime_hgti,
  });

  // Determine scoring version
  const version = opts.scoring_version || CURRENT_SCORING_VERSION;

  // Get HGTI weight for this version
  const hgtiWeight = getHGTIWeight(version);

  // Rebalance academic/achievement weights to sum to (1 - hgtiWeight)
  // Base weights: academic 40%, achievement 32%, HGTI 28%
  // As HGTI increases, academic/achievement decrease proportionally
  const baseAcademicWeight = 0.4;
  const baseAchievementWeight = 0.32;
  const baseSum = baseAcademicWeight + baseAchievementWeight; // 0.72

  const academicWeight = baseAcademicWeight * (1 - hgtiWeight) / baseSum;
  const achievementWeight = baseAchievementWeight * (1 - hgtiWeight) / baseSum;

  // Compute IvyScore
  const ivyScore =
    academicScore * academicWeight +
    achievementScore * achievementWeight +
    hgtiScore * hgtiWeight;

  // Persist to history
  await pool.query(
    `
    INSERT INTO ivyscore_history (
      student_id,
      score,
      version,
      academic_score,
      achievement_score,
      hgti_score,
      computed_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `,
    [studentId, ivyScore, version, academicScore, achievementScore, hgtiScore]
  );

  console.log(
    `[IvyScore] Computed for ${studentId}: ${(ivyScore * 100).toFixed(1)}% ` +
    `(academic: ${(academicScore * 100).toFixed(1)}%, achievement: ${(achievementScore * 100).toFixed(1)}%, ` +
    `HGTI: ${(hgtiScore * 100).toFixed(1)}%, version: ${version})`
  );

  return {
    score: ivyScore,
    version,
    academic_score: academicScore,
    achievement_score: achievementScore,
    hgti_score: hgtiScore,
    computed_at: new Date(),
  };
}

/**
 * Gets IvyScore history for a student.
 *
 * @param studentId - Student ID
 * @param limit - Optional limit (default 10)
 * @returns Array of IvyScore results
 */
export async function getIvyScoreHistory(
  studentId: string,
  limit: number = 10
): Promise<IvyScoreResult[]> {
  const result = await pool.query(
    `
    SELECT * FROM ivyscore_history
    WHERE student_id = $1
    ORDER BY computed_at DESC
    LIMIT $2
    `,
    [studentId, limit]
  );

  return result.rows.map((row) => ({
    score: parseFloat(row.score),
    version: parseInt(row.version, 10),
    academic_score: parseFloat(row.academic_score),
    achievement_score: parseFloat(row.achievement_score),
    hgti_score: parseFloat(row.hgti_score),
    computed_at: new Date(row.computed_at),
  }));
}

// ============================================================================
// COMPONENT SCORE HELPERS (Stubs - Replace with real implementations)
// ============================================================================

/**
 * Computes academic score (0-1) from GPA, test scores, course rigor.
 *
 * TODO: Replace with real implementation.
 *
 * @param studentId - Student ID
 * @returns Academic score (0-1)
 */
async function getAcademicScore(studentId: string): Promise<number> {
  // Stub implementation - replace with real calculation
  // Should query feature_snapshots for GPA, SAT, course rigor, etc.

  const result = await pool.query(
    `
    SELECT AVG(value) / 100 AS score
    FROM feature_snapshot_values fsv
    JOIN feature_snapshots fs ON fsv.snapshot_id = fs.snapshot_id
    WHERE fs.student_id = $1
      AND fsv.feature_id IN ('gpa_weighted', 'sat_total', 'course_rigor')
    `,
    [studentId]
  );

  return result.rows[0]?.score || 0.5; // Default to 50% if no data
}

/**
 * Computes achievement score (0-1) from awards, ECs, programs.
 *
 * TODO: Replace with real implementation.
 *
 * @param studentId - Student ID
 * @returns Achievement score (0-1)
 */
async function getAchievementScore(studentId: string): Promise<number> {
  // Stub implementation - replace with real calculation
  // Should query kb_items for awards, ECs, etc.

  const result = await pool.query(
    `
    SELECT COUNT(*) AS count
    FROM kb_items
    WHERE student_id = $1
      AND item_type IN ('Award_Competition', 'EC_Project', 'EC_Club')
      AND tier1_state = 'Outcome'
    `,
    [studentId]
  );

  const count = parseInt(result.rows[0]?.count || '0', 10);

  // Simple formula: min(count / 10, 1) → 10+ achievements = 100%
  return Math.min(count / 10, 1);
}

// ============================================================================
// EXPORTS
// ============================================================================

export { getHGTIWeight };

/**
 * Quarterly Review Cron Job
 *
 * Runs daily to check which game plans are due for quarterly review
 * Triggers review for plans with next_review_date <= NOW()
 *
 * Schedule: Daily at 9:00 AM
 * Created: 2025-10-29 (v18.0)
 */

import { Pool } from 'pg';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('quarterly-review-cron');

/**
 * Execute quarterly review for all due game plans
 */
export async function runQuarterlyReviewJob(pool: Pool): Promise<void> {
  const startTime = Date.now();
  log.event('quarterly_review_job.start', {});

  try {
    // Query game plans due for review
    const result = await pool.query(`
      SELECT * FROM v_game_plans_due_for_review
      ORDER BY days_overdue DESC
    `);

    const dueGamePlans = result.rows;

    log.event('quarterly_review_job.plans_found', {
      count: dueGamePlans.length,
      plans: dueGamePlans.map((gp) => ({
        student_id: gp.student_id,
        game_plan_id: gp.game_plan_id,
        days_overdue: gp.days_overdue,
      })),
    });

    if (dueGamePlans.length === 0) {
      log.event('quarterly_review_job.no_plans_due', {});
      return;
    }

    // Process each game plan
    for (const gamePlan of dueGamePlans) {
      try {
        await executeQuarterlyReview(pool, gamePlan);
      } catch (error) {
        log.error('quarterly_review_job.review_error', {
          student_id: gamePlan.student_id,
          game_plan_id: gamePlan.game_plan_id,
          error: String(error),
        });
        // Continue with next plan even if one fails
      }
    }

    log.event('quarterly_review_job.complete', {
      plans_processed: dueGamePlans.length,
      took_ms: Date.now() - startTime,
    });
  } catch (error) {
    log.error('quarterly_review_job.error', {
      error: String(error),
      took_ms: Date.now() - startTime,
    });
    throw error;
  }
}

/**
 * Execute quarterly review for a single game plan
 */
async function executeQuarterlyReview(pool: Pool, gamePlan: any): Promise<void> {
  log.event('quarterly_review.execute_start', {
    student_id: gamePlan.student_id,
    game_plan_id: gamePlan.game_plan_id,
  });

  // 1. Get current game plan state
  const gamePlanResult = await pool.query(
    `SELECT * FROM game_plans WHERE game_plan_id = $1`,
    [gamePlan.game_plan_id]
  );

  if (gamePlanResult.rows.length === 0) {
    throw new Error(`Game plan ${gamePlan.game_plan_id} not found`);
  }

  const currentGamePlan = gamePlanResult.rows[0];

  // 2. Get current rubric scores (from latest assessment or student context)
  const currentRubricScores = currentGamePlan.readiness_score?.dimensional_scores || {};

  // 3. Get previous rubric scores (from previous quarterly review or initial)
  const previousReviewResult = await pool.query(
    `SELECT * FROM quarterly_reviews
     WHERE game_plan_id = $1
     ORDER BY review_date DESC
     LIMIT 1`,
    [gamePlan.game_plan_id]
  );

  const previousRubricScores =
    previousReviewResult.rows.length > 0
      ? previousReviewResult.rows[0].current_rubric_scores
      : currentGamePlan.readiness_score?.dimensional_scores || {};

  // 4. Calculate rubric score delta
  const currentTotal = calculateTotalScore(currentRubricScores);
  const previousTotal = calculateTotalScore(previousRubricScores);
  const rubricScoreDelta = currentTotal - previousTotal;

  // 5. Determine progress velocity
  const progressVelocity = determineProgressVelocity(rubricScoreDelta);

  // 6. Determine quarter name
  const quarterName = determineQuarterName(currentGamePlan);

  // 7. Get planned outcomes for this quarter (from game_plan_phases)
  const phasesResult = await pool.query(
    `SELECT * FROM game_plan_phases
     WHERE game_plan_id = $1 AND status = 'in_progress'
     ORDER BY phase_number ASC
     LIMIT 1`,
    [gamePlan.game_plan_id]
  );

  const currentPhase = phasesResult.rows[0] || null;
  const plannedOutcomes = currentPhase ? currentPhase.expected_outcomes : [];

  // 8. Get actual outcomes (milestones completed)
  const milestonesResult = await pool.query(
    `SELECT * FROM game_plan_milestones
     WHERE phase_id = $1`,
    [currentPhase?.phase_id || null]
  );

  const actualOutcomes = milestonesResult.rows.map((m) => ({
    milestone: m.title,
    status: m.status,
    target_date: m.target_date,
  }));

  // 9. Determine if revision needed
  const requiresRevision = progressVelocity === 'stalled' || progressVelocity === 'behind';

  // 10. Create quarterly review record
  const reviewResult = await pool.query(
    `INSERT INTO quarterly_reviews (
      student_id, game_plan_id, quarter, review_week_start, review_week_end,
      planned_outcomes, actual_outcomes,
      previous_rubric_scores, current_rubric_scores, rubric_score_delta,
      progress_velocity, velocity_explanation,
      requires_revision, reviewed_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING review_id`,
    [
      gamePlan.student_id,
      gamePlan.game_plan_id,
      quarterName,
      currentPhase?.start_week || 1,
      currentPhase?.end_week || 12,
      JSON.stringify(plannedOutcomes),
      JSON.stringify(actualOutcomes),
      JSON.stringify(previousRubricScores),
      JSON.stringify(currentRubricScores),
      rubricScoreDelta,
      progressVelocity,
      generateVelocityExplanation(progressVelocity, rubricScoreDelta),
      requiresRevision,
      'QuarterlyReviewCron',
    ]
  );

  const reviewId = reviewResult.rows[0].review_id;

  // 11. Update game plan next_review_date (12 weeks from now)
  await pool.query(
    `UPDATE game_plans
     SET next_review_date = NOW() + INTERVAL '12 weeks'
     WHERE game_plan_id = $1`,
    [gamePlan.game_plan_id]
  );

  log.event('quarterly_review.execute_complete', {
    student_id: gamePlan.student_id,
    game_plan_id: gamePlan.game_plan_id,
    review_id: reviewId,
    rubric_score_delta: rubricScoreDelta,
    progress_velocity: progressVelocity,
    requires_revision: requiresRevision,
  });

  // 12. If requires revision, create gameplan_revision record
  if (requiresRevision) {
    await pool.query(
      `INSERT INTO gameplan_revisions (
        game_plan_id, version_number, revision_trigger, revision_reason, revised_by,
        previous_state, new_state, rubric_score_change, review_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        gamePlan.game_plan_id,
        currentGamePlan.version + 1,
        'quarterly_review',
        `Quarterly review indicated ${progressVelocity} progress (${rubricScoreDelta > 0 ? '+' : ''}${rubricScoreDelta} score change)`,
        'QuarterlyReviewCron',
        JSON.stringify(currentGamePlan),
        JSON.stringify(currentGamePlan), // Same for now, agent will update
        rubricScoreDelta,
        reviewId,
      ]
    );

    log.event('quarterly_review.revision_created', {
      student_id: gamePlan.student_id,
      game_plan_id: gamePlan.game_plan_id,
      review_id: reviewId,
    });
  }
}

/**
 * Calculate total rubric score
 */
function calculateTotalScore(rubricScores: any): number {
  if (!rubricScores) return 0;
  const dimensions = ['academics', 'leadership', 'service', 'artifacts', 'recognition'];
  return dimensions.reduce((sum, dim) => sum + (rubricScores[dim] || 0), 0);
}

/**
 * Determine progress velocity based on score change
 */
function determineProgressVelocity(
  scoreDelta: number
): 'ahead' | 'on_track' | 'behind' | 'stalled' {
  if (scoreDelta >= 3) return 'ahead';
  if (scoreDelta >= 1) return 'on_track';
  if (scoreDelta === 0) return 'stalled';
  return 'behind';
}

/**
 * Generate velocity explanation
 */
function generateVelocityExplanation(velocity: string, scoreDelta: number): string {
  const change = scoreDelta > 0 ? '+' : '';
  const changeStr = `${change}${scoreDelta}`;

  switch (velocity) {
    case 'ahead':
      return `Excellent progress - rubric score improved by ${changeStr} points (exceeding expectations)`;
    case 'on_track':
      return `Good progress - rubric score improved by ${changeStr} points (meeting expectations)`;
    case 'stalled':
      return `Stalled progress - rubric score unchanged (no improvement this quarter)`;
    case 'behind':
      return `Behind pace - rubric score declined by ${changeStr} points (falling behind expectations)`;
    default:
      return `Progress status: ${velocity}`;
  }
}

/**
 * Determine quarter name based on game plan creation date
 */
function determineQuarterName(gamePlan: any): string {
  const createdDate = new Date(gamePlan.created_date);
  const now = new Date();
  const monthsSinceCreation = Math.floor(
    (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
  );
  const quarterNumber = Math.floor(monthsSinceCreation / 3) + 1;

  const academicYear = `${now.getFullYear()}-${(now.getFullYear() + 1) % 100}`;
  return `Q${quarterNumber} ${academicYear}`;
}

/**
 * Schedule quarterly review job (to be called from server startup)
 */
export function scheduleQuarterlyReviewJob(pool: Pool): void {
  // Run daily at 9:00 AM
  const DAILY_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  // Calculate time until next 9:00 AM
  const now = new Date();
  const next9AM = new Date();
  next9AM.setHours(9, 0, 0, 0);

  if (now.getTime() >= next9AM.getTime()) {
    // If it's past 9 AM today, schedule for tomorrow
    next9AM.setDate(next9AM.getDate() + 1);
  }

  const timeUntilNext9AM = next9AM.getTime() - now.getTime();

  log.event('quarterly_review_cron.scheduled', {
    next_run: next9AM.toISOString(),
    time_until_next_run_hours: Math.round(timeUntilNext9AM / (1000 * 60 * 60)),
  });

  // Schedule first run
  setTimeout(() => {
    runQuarterlyReviewJob(pool).catch((error) => {
      log.error('quarterly_review_cron.execution_error', {
        error: String(error),
      });
    });

    // Schedule daily runs
    setInterval(() => {
      runQuarterlyReviewJob(pool).catch((error) => {
        log.error('quarterly_review_cron.execution_error', {
          error: String(error),
        });
      });
    }, DAILY_INTERVAL);
  }, timeUntilNext9AM);
}

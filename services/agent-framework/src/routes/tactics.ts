/**
 * Tactics Routes
 * POST /api/tactics/apply - Track tactic application
 * GET /api/tactics/:slug - Get tactic details
 * GET /api/tactics/student/:studentId - Get student's applied tactics
 *
 * Purpose: Track tactic usage to enable learning flywheel (times_applied, times_succeeded counters)
 */

import { Router } from 'express';
import { KnowledgeMoatRepository } from '../repositories/KnowledgeMoatRepository.js';

const router = Router();
const moatRepo = new KnowledgeMoatRepository();

/**
 * POST /api/tactics/apply
 * Track when a student applies a tactic
 *
 * Body:
 * {
 *   student_id: string,
 *   coach_id: string,
 *   tactic_slug: string,
 *   context: {
 *     source: 'assessment' | 'gameplan' | 'chat' | 'autonomous',
 *     session_id?: string,
 *     barriers_addressed?: string[]
 *   }
 * }
 *
 * Returns:
 * {
 *   application_id: number,
 *   tactic: { ... },
 *   success_patterns: [ ... ]  // Students who used this tactic successfully
 * }
 */
router.post('/apply', async (req, res) => {
  try {
    const { student_id, coach_id, tactic_slug, context } = req.body;

    // Validate required fields
    if (!student_id || !coach_id || !tactic_slug) {
      return res.status(400).json({
        error: 'Missing required fields: student_id, coach_id, tactic_slug',
      });
    }

    // 1. Get tactic details
    const tactic = await moatRepo.getTacticBySlug(tactic_slug);
    if (!tactic) {
      return res.status(404).json({
        error: `Tactic not found: ${tactic_slug}`,
      });
    }

    // 2. Record tactic application
    const applicationId = await moatRepo.recordTacticApplication({
      student_id,
      coach_id,
      tactic_id: tactic.tactic_id,
      applied_at: new Date(),
      application_context: context || {},
      status: 'active', // active | completed | abandoned
    });

    console.log(
      `[TacticTracking] Student ${student_id} applied tactic: ${tactic_slug} (application_id: ${applicationId})`
    );

    // 3. Get success patterns using this tactic
    const successPatterns = await moatRepo.getSuccessPatternsUsingTactic(
      tactic_slug
    );

    // 4. Get related tactics
    const relatedTactics = await moatRepo.getRelatedTactics(tactic.tactic_id, 3);

    res.json({
      success: true,
      application_id: applicationId,
      tactic: {
        tactic_id: tactic.tactic_id,
        tactic_name: tactic.tactic_name,
        tactic_slug: tactic.tactic_slug,
        category: tactic.tactic_category,
        core_principle: tactic.core_principle,
        micro_actions: tactic.micro_actions,
        estimated_duration: tactic.estimated_duration,
        times_applied: tactic.times_applied + 1, // Incremented
      },
      success_patterns: successPatterns.map((p) => ({
        title: p.title,
        outcome_category: p.outcome_category,
        duration_days: p.total_duration_days,
        what_worked: p.what_worked,
        what_clicked: p.what_clicked,
        final_outcomes: p.final_outcomes,
      })),
      related_tactics: relatedTactics.map((t) => ({
        tactic_name: t.tactic_name,
        tactic_slug: t.tactic_slug,
        category: t.tactic_category,
      })),
      next_steps: {
        message: `You've started: ${tactic.tactic_name}`,
        recommended_duration: tactic.estimated_duration,
        check_in_after: calculateCheckInTime(tactic.estimated_duration),
      },
    });
  } catch (error) {
    console.error('[TacticTracking] Error applying tactic:', error);
    res.status(500).json({
      error: 'Failed to record tactic application',
      details: error.message,
    });
  }
});

/**
 * POST /api/tactics/complete
 * Mark tactic application as completed
 *
 * Body:
 * {
 *   application_id: number,
 *   outcome: 'succeeded' | 'partial' | 'abandoned',
 *   reflection?: string,
 *   results?: object
 * }
 */
router.post('/complete', async (req, res) => {
  try {
    const { application_id, outcome, reflection, results } = req.body;

    if (!application_id || !outcome) {
      return res.status(400).json({
        error: 'Missing required fields: application_id, outcome',
      });
    }

    await moatRepo.completeTacticApplication({
      application_id,
      completed_at: new Date(),
      status: outcome === 'succeeded' ? 'completed' : outcome,
      outcome_reflection: reflection,
      measured_results: results,
    });

    // If succeeded, increment times_succeeded counter
    if (outcome === 'succeeded') {
      const application = await moatRepo.getTacticApplication(application_id);
      await moatRepo.incrementTacticCounters(application.tactic_id, {
        times_succeeded: 1,
      });
    }

    console.log(
      `[TacticTracking] Tactic application ${application_id} completed with outcome: ${outcome}`
    );

    res.json({
      success: true,
      message: `Tactic marked as ${outcome}`,
    });
  } catch (error) {
    console.error('[TacticTracking] Error completing tactic:', error);
    res.status(500).json({
      error: 'Failed to complete tactic',
      details: error.message,
    });
  }
});

/**
 * GET /api/tactics/:slug
 * Get detailed tactic information
 */
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const tactic = await moatRepo.getTacticBySlug(slug);

    if (!tactic) {
      return res.status(404).json({
        error: `Tactic not found: ${slug}`,
      });
    }

    // Get success patterns using this tactic
    const successPatterns = await moatRepo.getSuccessPatternsUsingTactic(slug);

    // Get related tactics
    const relatedTactics = await moatRepo.getRelatedTactics(tactic.tactic_id, 5);

    res.json({
      tactic,
      success_patterns: successPatterns,
      related_tactics: relatedTactics,
      usage_stats: {
        times_applied: tactic.times_applied,
        times_succeeded: tactic.times_succeeded,
        success_rate: tactic.success_rate,
      },
    });
  } catch (error) {
    console.error('[TacticTracking] Error fetching tactic:', error);
    res.status(500).json({
      error: 'Failed to fetch tactic',
      details: error.message,
    });
  }
});

/**
 * GET /api/tactics/student/:studentId
 * Get all tactics applied by a student
 */
router.get('/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const applications = await moatRepo.getStudentTacticApplications(studentId);

    res.json({
      student_id: studentId,
      total_tactics_applied: applications.length,
      active_tactics: applications.filter((a) => a.status === 'active').length,
      completed_tactics: applications.filter((a) => a.status === 'completed')
        .length,
      applications,
    });
  } catch (error) {
    console.error('[TacticTracking] Error fetching student tactics:', error);
    res.status(500).json({
      error: 'Failed to fetch student tactics',
      details: error.message,
    });
  }
});

/**
 * Helper: Calculate check-in time based on estimated duration
 */
function calculateCheckInTime(
  estimatedDuration: { hours?: number; days?: number; weeks?: number } | null
): string {
  if (!estimatedDuration) return '3 days';

  if (estimatedDuration.hours) {
    return `${Math.ceil(estimatedDuration.hours / 24)} days`;
  }
  if (estimatedDuration.days) {
    return `${Math.ceil(estimatedDuration.days / 2)} days`;
  }
  if (estimatedDuration.weeks) {
    return `${estimatedDuration.weeks} weeks`;
  }

  return '3 days';
}

export default router;

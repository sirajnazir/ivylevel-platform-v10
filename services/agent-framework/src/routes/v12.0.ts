/**
 * v12.0 API Routes - Game Plan / Precision Roadmap
 * Purpose: Backend APIs for multi-year game plan, phases, milestones, tactical plans, opportunities
 * Database: game_plans, game_plan_phases, game_plan_milestones, tactical_plans, opportunities, application_components
 * Date: 2025-10-28
 *
 * IMPORTANT: This is additive-only, does not modify any existing v10/v11 functionality
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

export function v12Router(pool: Pool): Router {
  const router = Router();

  // ============================================================================
  // GAME PLAN APIs
  // ============================================================================

  /**
   * GET /api/v12/students/:studentId/game-plan
   * Get complete game plan for student (latest version)
   */
  router.get('/students/:studentId/game-plan', async (req: Request, res: Response) => {
    try {
      const { studentId } = req.params;

      // Get latest game plan
      const gamePlanResult = await pool.query(`
        SELECT * FROM game_plans
        WHERE student_id = $1
        ORDER BY version DESC
        LIMIT 1
      `, [studentId]);

      if (gamePlanResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Game plan not found',
          message: `No game plan exists for student ${studentId}`
        });
      }

      const gamePlan = gamePlanResult.rows[0];

      // Get all phases for this game plan
      const phasesResult = await pool.query(`
        SELECT * FROM game_plan_phases
        WHERE game_plan_id = $1
        ORDER BY phase_number ASC
      `, [gamePlan.game_plan_id]);

      // Get opportunities summary
      const opportunitiesResult = await pool.query(`
        SELECT
          category,
          priority,
          status,
          COUNT(*) as count
        FROM opportunities
        WHERE game_plan_id = $1
        GROUP BY category, priority, status
      `, [gamePlan.game_plan_id]);

      // Get overall progress metrics
      const progressResult = await pool.query(`
        SELECT
          COUNT(DISTINCT m.milestone_id) FILTER (WHERE m.status = 'completed') as completed_milestones,
          COUNT(DISTINCT m.milestone_id) as total_milestones,
          COUNT(DISTINCT tp.tactical_plan_id) FILTER (WHERE tp.status = 'completed') as completed_tactical_plans,
          COUNT(DISTINCT tp.tactical_plan_id) as total_tactical_plans
        FROM game_plan_phases gpp
        LEFT JOIN game_plan_milestones m ON m.phase_id = gpp.phase_id
        LEFT JOIN tactical_plans tp ON tp.phase_id = gpp.phase_id
        WHERE gpp.game_plan_id = $1
      `, [gamePlan.game_plan_id]);

      const progress = progressResult.rows[0];

      res.json({
        game_plan_id: gamePlan.game_plan_id,
        student_id: gamePlan.student_id,
        version: gamePlan.version,
        created_by: gamePlan.created_by,
        created_date: gamePlan.created_date,
        last_updated: gamePlan.last_updated,

        profile_assessment: gamePlan.profile_assessment,
        readiness_score: gamePlan.readiness_score,
        target_profile: gamePlan.target_profile,
        target_schools: gamePlan.target_schools,
        school_context: gamePlan.school_context,

        current_phase_id: gamePlan.current_phase_id,
        phases: phasesResult.rows,

        opportunities_summary: opportunitiesResult.rows,

        overall_progress: {
          milestones: {
            completed: parseInt(progress.completed_milestones) || 0,
            total: parseInt(progress.total_milestones) || 0,
            percentage: progress.total_milestones > 0
              ? Math.round((progress.completed_milestones / progress.total_milestones) * 100)
              : 0
          },
          tactical_plans: {
            completed: parseInt(progress.completed_tactical_plans) || 0,
            total: parseInt(progress.total_tactical_plans) || 0,
            percentage: progress.total_tactical_plans > 0
              ? Math.round((progress.completed_tactical_plans / progress.total_tactical_plans) * 100)
              : 0
          }
        }
      });

    } catch (error) {
      console.error('Error fetching game plan:', error);
      res.status(500).json({ error: 'Internal server error', message: (error as Error).message });
    }
  });

  /**
   * GET /api/v12/students/:studentId/game-plan/phases/:phaseId
   * Get detailed information for a specific phase
   */
  router.get('/students/:studentId/game-plan/phases/:phaseId', async (req: Request, res: Response) => {
    try {
      const { studentId, phaseId } = req.params;

      // Get phase details
      const phaseResult = await pool.query(`
        SELECT gpp.*, gp.student_id
        FROM game_plan_phases gpp
        JOIN game_plans gp ON gp.game_plan_id = gpp.game_plan_id
        WHERE gpp.phase_id = $1 AND gp.student_id = $2
      `, [phaseId, studentId]);

      if (phaseResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Phase not found',
          message: `Phase ${phaseId} not found for student ${studentId}`
        });
      }

      const phase = phaseResult.rows[0];

      // Get milestones for this phase
      const milestonesResult = await pool.query(`
        SELECT * FROM game_plan_milestones
        WHERE phase_id = $1
        ORDER BY target_week ASC
      `, [phaseId]);

      // Get tactical plans for this phase
      const tacticalPlansResult = await pool.query(`
        SELECT * FROM tactical_plans
        WHERE phase_id = $1
        ORDER BY priority ASC, start_week ASC
      `, [phaseId]);

      // Get linked weekly plans
      const linkedWeeksResult = await pool.query(`
        SELECT DISTINCT week_number
        FROM weekly_vitals
        WHERE student_id = $1
          AND week_number >= $2
          AND week_number <= $3
        ORDER BY week_number ASC
      `, [studentId, phase.start_week, phase.end_week]);

      res.json({
        ...phase,
        milestones: milestonesResult.rows,
        tactical_plans: tacticalPlansResult.rows,
        linked_weeks: linkedWeeksResult.rows.map(r => r.week_number)
      });

    } catch (error) {
      console.error('Error fetching phase details:', error);
      res.status(500).json({ error: 'Internal server error', message: (error as Error).message });
    }
  });

  /**
   * GET /api/v12/students/:studentId/opportunities
   * Get all opportunities with filtering
   */
  router.get('/students/:studentId/opportunities', async (req: Request, res: Response) => {
    try {
      const { studentId } = req.params;
      const { priority, status, category, deadline_before } = req.query;

      // Build query with filters
      let query = `
        SELECT o.*, gp.student_id
        FROM opportunities o
        JOIN game_plans gp ON gp.game_plan_id = o.game_plan_id
        WHERE gp.student_id = $1
      `;
      const params: any[] = [studentId];
      let paramIndex = 2;

      if (priority) {
        query += ` AND o.priority = $${paramIndex}`;
        params.push(priority);
        paramIndex++;
      }

      if (status) {
        query += ` AND o.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (category) {
        query += ` AND o.category = $${paramIndex}`;
        params.push(category);
        paramIndex++;
      }

      if (deadline_before) {
        query += ` AND o.deadline < $${paramIndex}`;
        params.push(deadline_before);
        paramIndex++;
      }

      query += ` ORDER BY o.deadline ASC, o.priority ASC`;

      const result = await pool.query(query, params);

      // Calculate weeks until deadline for each opportunity
      const opportunities = result.rows.map(opp => ({
        ...opp,
        weeks_until_deadline: Math.ceil(
          (new Date(opp.deadline).getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000)
        )
      }));

      // Separate urgent opportunities (< 30 days)
      const urgentOpportunities = opportunities.filter(o => o.weeks_until_deadline < 5);

      res.json({
        opportunities,
        urgent_opportunities: urgentOpportunities
      });

    } catch (error) {
      console.error('Error fetching opportunities:', error);
      res.status(500).json({ error: 'Internal server error', message: (error as Error).message });
    }
  });

  /**
   * GET /api/v12/students/:studentId/milestones
   * Get all milestones with filtering
   */
  router.get('/students/:studentId/milestones', async (req: Request, res: Response) => {
    try {
      const { studentId } = req.params;
      const { phase_id, status, target_week_start, target_week_end } = req.query;

      let query = `
        SELECT m.*, gpp.phase_name, gpp.phase_number
        FROM game_plan_milestones m
        JOIN game_plan_phases gpp ON gpp.phase_id = m.phase_id
        JOIN game_plans gp ON gp.game_plan_id = gpp.game_plan_id
        WHERE gp.student_id = $1
      `;
      const params: any[] = [studentId];
      let paramIndex = 2;

      if (phase_id) {
        query += ` AND m.phase_id = $${paramIndex}`;
        params.push(phase_id);
        paramIndex++;
      }

      if (status) {
        query += ` AND m.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (target_week_start) {
        query += ` AND m.target_week >= $${paramIndex}`;
        params.push(target_week_start);
        paramIndex++;
      }

      if (target_week_end) {
        query += ` AND m.target_week <= $${paramIndex}`;
        params.push(target_week_end);
        paramIndex++;
      }

      query += ` ORDER BY m.target_week ASC`;

      const result = await pool.query(query, params);

      res.json({
        milestones: result.rows
      });

    } catch (error) {
      console.error('Error fetching milestones:', error);
      res.status(500).json({ error: 'Internal server error', message: (error as Error).message });
    }
  });

  /**
   * GET /api/v12/students/:studentId/tactical-plans
   * Get all tactical plans with filtering
   */
  router.get('/students/:studentId/tactical-plans', async (req: Request, res: Response) => {
    try {
      const { studentId } = req.params;
      const { phase_id, priority, status } = req.query;

      let query = `
        SELECT tp.*, gpp.phase_name, gpp.phase_number
        FROM tactical_plans tp
        JOIN game_plan_phases gpp ON gpp.phase_id = tp.phase_id
        JOIN game_plans gp ON gp.game_plan_id = gpp.game_plan_id
        WHERE gp.student_id = $1
      `;
      const params: any[] = [studentId];
      let paramIndex = 2;

      if (phase_id) {
        query += ` AND tp.phase_id = $${paramIndex}`;
        params.push(phase_id);
        paramIndex++;
      }

      if (priority) {
        query += ` AND tp.priority = $${paramIndex}`;
        params.push(priority);
        paramIndex++;
      }

      if (status) {
        query += ` AND tp.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      query += ` ORDER BY tp.priority ASC, tp.start_week ASC`;

      const result = await pool.query(query, params);

      res.json({
        tactical_plans: result.rows
      });

    } catch (error) {
      console.error('Error fetching tactical plans:', error);
      res.status(500).json({ error: 'Internal server error', message: (error as Error).message });
    }
  });

  /**
   * GET /api/v12/students/:studentId/application-components
   * Get college application components with game plan linkages
   */
  router.get('/students/:studentId/application-components', async (req: Request, res: Response) => {
    try {
      const { studentId } = req.params;

      const result = await pool.query(`
        SELECT ac.*
        FROM application_components ac
        JOIN game_plans gp ON gp.game_plan_id = ac.game_plan_id
        WHERE gp.student_id = $1
        ORDER BY ac.component_type, ac.created_at ASC
      `, [studentId]);

      res.json({
        components: result.rows
      });

    } catch (error) {
      console.error('Error fetching application components:', error);
      res.status(500).json({ error: 'Internal server error', message: (error as Error).message });
    }
  });

  /**
   * GET /api/v12/students/:studentId/weeks/:weekNumber/game-plan-links
   * Get game plan elements linked to a specific week (for Preparation tab integration)
   */
  router.get('/students/:studentId/weeks/:weekNumber/game-plan-links', async (req: Request, res: Response) => {
    try {
      const { studentId, weekNumber } = req.params;

      // Get weekly vitals for this week
      const vitalsResult = await pool.query(`
        SELECT linked_milestone_ids, linked_tactical_plan_ids
        FROM weekly_vitals
        WHERE student_id = $1 AND week_number = $2
      `, [studentId, weekNumber]);

      if (vitalsResult.rows.length === 0) {
        return res.json({
          week_number: parseInt(weekNumber),
          milestones: [],
          tactical_plan_steps: [],
          phase_info: null
        });
      }

      const vitals = vitalsResult.rows[0];
      const milestoneIds = vitals.linked_milestone_ids || [];
      const tacticalPlanIds = vitals.linked_tactical_plan_ids || [];

      // Get milestones
      let milestones = [];
      if (milestoneIds.length > 0) {
        const milestonesResult = await pool.query(`
          SELECT m.*, gpp.phase_name
          FROM game_plan_milestones m
          JOIN game_plan_phases gpp ON gpp.phase_id = m.phase_id
          WHERE m.milestone_id = ANY($1::text[])
        `, [milestoneIds]);
        milestones = milestonesResult.rows;
      }

      // Get tactical plans
      let tacticalPlans = [];
      if (tacticalPlanIds.length > 0) {
        const tacticalPlansResult = await pool.query(`
          SELECT tp.*, gpp.phase_name
          FROM tactical_plans tp
          JOIN game_plan_phases gpp ON gpp.phase_id = tp.phase_id
          WHERE tp.tactical_plan_id = ANY($1::text[])
        `, [tacticalPlanIds]);
        tacticalPlans = tacticalPlansResult.rows;
      }

      // Get current phase info for this week
      const phaseResult = await pool.query(`
        SELECT gpp.*, gp.student_id
        FROM game_plan_phases gpp
        JOIN game_plans gp ON gp.game_plan_id = gpp.game_plan_id
        WHERE gp.student_id = $1
          AND gpp.start_week <= $2
          AND gpp.end_week >= $2
      `, [studentId, weekNumber]);

      const phaseInfo = phaseResult.rows.length > 0 ? phaseResult.rows[0] : null;

      res.json({
        week_number: parseInt(weekNumber),
        milestones,
        tactical_plan_steps: tacticalPlans,
        phase_info: phaseInfo ? {
          phase_id: phaseInfo.phase_id,
          phase_name: phaseInfo.phase_name,
          phase_number: phaseInfo.phase_number,
          completion_percentage: phaseInfo.completion_percentage
        } : null
      });

    } catch (error) {
      console.error('Error fetching week game plan links:', error);
      res.status(500).json({ error: 'Internal server error', message: (error as Error).message });
    }
  });

  // ============================================================================
  // ASSESSMENT API - Comprehensive Ivy+ Ready Score
  // ============================================================================

  /**
   * GET /api/v12/students/:studentId/assessment
   * Get comprehensive assessment data including:
   * - Ivy+ Ready Score (overall)
   * - Three Pillar Model (Aptitude, Passion, Service) - 9/10, 10/10, 8/10 format
   * - Identity Score (derived from narrative strength)
   * - Dimensional Scores (5 dimensions: Academic, EC, Service, Narrative, Application)
   * - Standout Strengths (8 strengths with evidence)
   * - Weak Spots (5 weak spots with priority, ROI, status)
   * - Historical Score Progression
   * - Admissions Rubric Correlation
   */
  router.get('/students/:studentId/assessment', async (req: Request, res: Response) => {
    try {
      const { studentId } = req.params;

      // Query game_plans table for comprehensive assessment data
      const result = await pool.query(`
        SELECT
          game_plan_id,
          student_id,
          created_date,
          last_updated,
          version,
          profile_assessment,
          readiness_score,
          target_profile,
          school_context,
          family_context
        FROM game_plans
        WHERE student_id = $1
        ORDER BY version DESC
        LIMIT 1
      `, [studentId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'No game plan found',
          message: 'Student does not have a game plan yet'
        });
      }

      const gamePlan = result.rows[0];

      // Extract Three Pillar Model scores
      const threePillarModel = gamePlan.target_profile?.three_pillar_model || {};
      const aptitude = threePillarModel.aptitude || {};
      const passion = threePillarModel.passion || {};
      const service = threePillarModel.service || {};

      // Extract readiness score data
      const readinessScore = gamePlan.readiness_score || {};
      const overallScore = readinessScore.overall_score || 0;
      const dimensionalScores = readinessScore.dimensional_scores || [];
      const historicalScores = readinessScore.historical_scores || [];

      // Calculate Identity score from Narrative dimension
      const narrativeDimension = dimensionalScores.find(
        (d: any) => d.dimension === 'Narrative & Differentiation'
      );
      const identityScore = narrativeDimension ? Math.round(narrativeDimension.score / 10) : 0;

      // Extract profile assessment data
      const profileAssessment = gamePlan.profile_assessment || {};
      const standoutStrengths = profileAssessment.standout_strengths || [];
      const weakSpots = profileAssessment.weak_spots || [];
      const uniqueStory = profileAssessment.unique_story || '';
      const potentialSpikes = profileAssessment.potential_spikes || [];

      // Calculate Admissions Rubric Correlation
      const admissionsRubric = calculateAdmissionsRubric(overallScore, dimensionalScores);

      // Calculate scoring breakdown based on v100 Ivylevel Scoring Table
      // Formula: 30% Aptitude + 25% Passion + 20% Service + 25% Narrative
      const scoringBreakdown = {
        aptitude: {
          score: aptitude.score || 0,
          maxScore: 10,
          percentage: aptitude.score ? (aptitude.score / 10) * 100 : 0,
          weight: 30, // 30% of overall score
          contribution: aptitude.score ? (aptitude.score / 10) * 30 : 0,
          strength: aptitude.strength || '',
          evidence: aptitude.evidence || ''
        },
        passion: {
          score: passion.score || 0,
          maxScore: 10,
          percentage: passion.score ? (passion.score / 10) * 100 : 0,
          weight: 25, // 25% of overall score
          contribution: passion.score ? (passion.score / 10) * 25 : 0,
          strength: passion.strength || '',
          evidence: passion.evidence || ''
        },
        service: {
          score: service.score || 0,
          maxScore: 10,
          percentage: service.score ? (service.score / 10) * 100 : 0,
          weight: 20, // 20% of overall score
          contribution: service.score ? (service.score / 10) * 20 : 0,
          strength: service.strength || '',
          evidence: service.evidence || ''
        },
        identity: {
          score: identityScore,
          maxScore: 10,
          percentage: identityScore ? (identityScore / 10) * 100 : 0,
          weight: 25, // 25% of overall score (Narrative & Fit)
          contribution: identityScore ? (identityScore / 10) * 25 : 0,
          strength: 'Narrative strength and personal differentiation',
          evidence: uniqueStory
        }
      };

      // Transform dimensional scores to frontend format
      const transformedDimensionalScores = dimensionalScores.map((d: any) => ({
        dimension: d.dimension,
        score: d.score,
        percentile: d.percentile || null,
        tier: getScoreTier(d.score),
        subfactors: d.subfactors || []
      }));

      // Transform standout strengths
      const transformedStrengths = standoutStrengths.map((s: any, index: number) => ({
        id: s.strength_id || `str_${index + 1}`,
        title: s.title || '',
        dimension: s.dimension || '',
        description: s.description || '',
        evidenceIds: s.evidence_ids || [],
        impact: s.impact || '',
        roiScore: s.roi_score || 0
      }));

      // Transform weak spots
      const transformedWeakSpots = weakSpots.map((w: any, index: number) => ({
        id: w.weak_spot_id || `ws_${index + 1}`,
        title: w.title || '',
        priority: w.priority || 'P2',
        roiScore: w.roi_score || 0,
        status: w.status || 'active',
        tacticalPlan: w.tactical_plan || '',
        targetWeeks: w.target_weeks || null,
        progressNote: w.progress_note || ''
      }));

      // Transform historical scores for progression chart
      const transformedHistoricalScores = historicalScores.map((h: any) => ({
        weekNumber: h.week_number,
        overallScore: h.overall_score,
        date: h.date,
        milestone: h.milestone || null
      }));

      // Response structure
      res.json({
        studentId: gamePlan.student_id,
        gamePlanId: gamePlan.game_plan_id,
        version: gamePlan.version,
        lastUpdated: gamePlan.last_updated,

        // Overall Ivy+ Ready Score
        ivyReadyScore: {
          overall: overallScore,
          tier: getScoreTier(overallScore),
          t20Level: getT20Level(overallScore),
          changeVs180Days: calculateScoreChange(historicalScores, overallScore)
        },

        // Three Pillar Model + Identity (4 rings)
        pillars: {
          aptitude: scoringBreakdown.aptitude,
          passion: scoringBreakdown.passion,
          service: scoringBreakdown.service,
          identity: scoringBreakdown.identity
        },

        // Dimensional Scores (5 dimensions)
        dimensionalScores: transformedDimensionalScores,

        // Standout Strengths (8 strengths)
        strengths: transformedStrengths,

        // Weak Spots (5 weak spots)
        weakSpots: transformedWeakSpots,

        // Historical Score Progression
        scoreProgression: transformedHistoricalScores,

        // Admissions Rubric Correlation
        admissionsRubric: admissionsRubric,

        // Context
        schoolContext: gamePlan.school_context || null,
        familyContext: gamePlan.family_context || null,

        // Metadata
        uniqueStory: uniqueStory,
        potentialSpikes: potentialSpikes
      });

    } catch (error) {
      console.error('[v12.0] Error fetching assessment data:', error);
      res.status(500).json({
        error: 'Failed to fetch assessment data',
        message: (error as Error).message
      });
    }
  });

  // ============================================================================
  // ASSESSMENT HELPER FUNCTIONS
  // ============================================================================

  /**
   * Calculate Admissions Rubric Correlation
   * Maps Ivy+ Ready Score to actual admissions rubric factors
   * Based on Raj Chetty's research and comprehensive specification
   */
  function calculateAdmissionsRubric(
    overallScore: number,
    dimensionalScores: any[]
  ): any {
    // Get specific dimensional scores
    const academicScore = dimensionalScores.find(d => d.dimension === 'Academic Readiness')?.score || 0;
    const ecScore = dimensionalScores.find(d => d.dimension === 'Extracurricular Depth & Impact')?.score || 0;
    const serviceScore = dimensionalScores.find(d => d.dimension === 'Service & Leadership')?.score || 0;
    const narrativeScore = dimensionalScores.find(d => d.dimension === 'Narrative & Differentiation')?.score || 0;
    const applicationScore = dimensionalScores.find(d => d.dimension === 'Application Execution')?.score || 0;

    // Map to admissions rubric categories
    return {
      academicIndex: {
        score: academicScore,
        tier: getScoreTier(academicScore),
        factors: [
          { name: 'GPA & Course Rigor', weight: 40, score: academicScore },
          { name: 'Test Scores', weight: 25, score: academicScore },
          { name: 'Academic Awards', weight: 20, score: academicScore },
          { name: 'Advanced Coursework', weight: 15, score: academicScore }
        ]
      },
      extracurricularRating: {
        score: ecScore,
        tier: getScoreTier(ecScore),
        factors: [
          { name: 'Depth of Involvement', weight: 30, score: ecScore },
          { name: 'Leadership Roles', weight: 25, score: ecScore },
          { name: 'Impact & Outcomes', weight: 25, score: ecScore },
          { name: 'National/International Recognition', weight: 20, score: ecScore }
        ]
      },
      personalQualities: {
        score: narrativeScore,
        tier: getScoreTier(narrativeScore),
        factors: [
          { name: 'Character & Values', weight: 30, score: narrativeScore },
          { name: 'Unique Perspective', weight: 25, score: narrativeScore },
          { name: 'Resilience & Growth', weight: 25, score: narrativeScore },
          { name: 'Authentic Voice', weight: 20, score: narrativeScore }
        ]
      },
      recommendationStrength: {
        score: applicationScore,
        tier: getScoreTier(applicationScore),
        description: 'Quality and strength of teacher/counselor recommendations'
      },
      overallAdmissionsScore: {
        score: overallScore,
        tier: getScoreTier(overallScore),
        admitProbability: getAdmitProbability(overallScore),
        targetSchools: getTargetSchoolTier(overallScore)
      }
    };
  }

  /**
   * Get score tier (Bronze, Silver, Gold, Platinum, Diamond)
   */
  function getScoreTier(score: number): string {
    if (score >= 95) return 'Diamond';
    if (score >= 85) return 'Platinum';
    if (score >= 75) return 'Gold';
    if (score >= 60) return 'Silver';
    return 'Bronze';
  }

  /**
   * Get T20 Level classification
   */
  function getT20Level(score: number): string {
    if (score >= 90) return 'Exceptional (HYPSM Range)';
    if (score >= 85) return 'Strong (T5-T10 Range)';
    if (score >= 75) return 'Competitive (T10-T20 Range)';
    if (score >= 65) return 'Solid (T20-T30 Range)';
    return 'Developing (T30-T50 Range)';
  }

  /**
   * Calculate score change vs 180 days ago (~26 weeks)
   */
  function calculateScoreChange(historicalScores: any[], currentScore: number): number {
    if (!historicalScores || historicalScores.length === 0) return 0;

    // Find score from ~26 weeks ago (180 days)
    const currentWeek = historicalScores[historicalScores.length - 1]?.week_number || 0;
    const targetWeek = Math.max(1, currentWeek - 26);

    const historicalScore = historicalScores.find(
      (h: any) => h.week_number >= targetWeek && h.week_number < targetWeek + 4
    );

    if (!historicalScore) return 0;

    const change = currentScore - historicalScore.overall_score;
    return Math.round(change);
  }

  /**
   * Get admit probability based on overall Ivy+ Ready Score
   */
  function getAdmitProbability(score: number): string {
    if (score >= 95) return '25-35% (HYPSM range)';
    if (score >= 90) return '20-30% (T5 range)';
    if (score >= 85) return '15-25% (T10 range)';
    if (score >= 75) return '10-20% (T20 range)';
    if (score >= 65) return '5-15% (T30 range)';
    return '<5% (T50+ range)';
  }

  /**
   * Get target school tier recommendations
   */
  function getTargetSchoolTier(score: number): string[] {
    if (score >= 95) return ['HYPSM', 'T5 Reaches', 'T10 Targets', 'T20 Safeties'];
    if (score >= 90) return ['T5 Reaches', 'T10 Targets', 'T20 Safeties', 'T30 Likelies'];
    if (score >= 85) return ['T10 Reaches', 'T20 Targets', 'T30 Safeties', 'T50 Likelies'];
    if (score >= 75) return ['T20 Reaches', 'T30 Targets', 'T50 Safeties', 'State Flagships'];
    if (score >= 65) return ['T30 Reaches', 'T50 Targets', 'State Flagships', 'Regional Universities'];
    return ['T50 Reaches', 'State Flagships', 'Regional Universities'];
  }

  // ============================================================================
  // UPDATE APIs (PATCH)
  // ============================================================================

  /**
   * PATCH /api/v12/students/:studentId/milestones/:milestoneId
   * Update milestone status
   */
  router.patch('/students/:studentId/milestones/:milestoneId', async (req: Request, res: Response) => {
    try {
      const { studentId, milestoneId } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      const validStatuses = ['not_started', 'in_progress', 'completed', 'blocked', 'missed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
      }

      const result = await pool.query(`
        UPDATE game_plan_milestones
        SET status = $1, updated_at = NOW()
        WHERE milestone_id = $2
        RETURNING *
      `, [status, milestoneId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Milestone not found' });
      }

      res.json(result.rows[0]);

    } catch (error) {
      console.error('Error updating milestone:', error);
      res.status(500).json({ error: 'Internal server error', message: (error as Error).message });
    }
  });

  /**
   * PATCH /api/v12/students/:studentId/tactical-plans/:planId
   * Update tactical plan progress
   */
  router.patch('/students/:studentId/tactical-plans/:planId', async (req: Request, res: Response) => {
    try {
      const { studentId, planId } = req.params;
      const { completion_percentage, status } = req.body;

      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (completion_percentage !== undefined) {
        updates.push(`completion_percentage = $${paramIndex}`);
        params.push(completion_percentage);
        paramIndex++;
      }

      if (status) {
        updates.push(`status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      updates.push(`updated_at = NOW()`);

      if (updates.length === 1) {
        return res.status(400).json({ error: 'No updates provided' });
      }

      params.push(planId);

      const result = await pool.query(`
        UPDATE tactical_plans
        SET ${updates.join(', ')}
        WHERE tactical_plan_id = $${paramIndex}
        RETURNING *
      `, params);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Tactical plan not found' });
      }

      res.json(result.rows[0]);

    } catch (error) {
      console.error('Error updating tactical plan:', error);
      res.status(500).json({ error: 'Internal server error', message: (error as Error).message });
    }
  });

  /**
   * PATCH /api/v12/students/:studentId/opportunities/:opportunityId
   * Update opportunity status or application progress
   */
  router.patch('/students/:studentId/opportunities/:opportunityId', async (req: Request, res: Response) => {
    try {
      const { studentId, opportunityId } = req.params;
      const { status, application_progress } = req.body;

      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (status) {
        updates.push(`status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      if (application_progress) {
        updates.push(`application_progress = $${paramIndex}`);
        params.push(JSON.stringify(application_progress));
        paramIndex++;
      }

      updates.push(`updated_at = NOW()`);

      if (updates.length === 1) {
        return res.status(400).json({ error: 'No updates provided' });
      }

      params.push(opportunityId);

      const result = await pool.query(`
        UPDATE opportunities
        SET ${updates.join(', ')}
        WHERE opportunity_id = $${paramIndex}
        RETURNING *
      `, params);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Opportunity not found' });
      }

      res.json(result.rows[0]);

    } catch (error) {
      console.error('Error updating opportunity:', error);
      res.status(500).json({ error: 'Internal server error', message: (error as Error).message });
    }
  });

  return router;
}

/**
 * v15.3 Assessment Agent - API Routes
 *
 * Date: 2025-10-28
 * Purpose: HTTP endpoints for universal Assessment Agent with rich EQ integration
 * Architecture: Universal Agent + Rich Communication Intelligence (100 EQ chips)
 *
 * Key Features:
 * - 4-phase autonomous assessment (Discovery, Narrative, Strategy, Time)
 * - 27-layer analysis per assessment
 * - Jenny's authentic voice from 100 conversations (7 iMessage + 93 sessions)
 * - Real training examples for LLM few-shot prompts
 * - EQ-aware tone adaptation
 * - Full database persistence
 *
 * @module routes/v15.3
 */

import express, { Request, Response } from 'express';
import { pool } from '../db/pool.js';
import { createAssessmentAgent } from '../v15.3/agents/AssessmentAgent.js';
import { createEQProfileLoader } from '../intelligence/EQProfileLoader.js';
import { createCoachingIntelligenceLoader } from '../intelligence/CoachingIntelligenceLoader.js';

export const v153Router = express.Router();

// ============================================================================
// POST /api/v15.3/assessment - Execute 4-phase assessment
// ============================================================================

v153Router.post('/assessment', async (req: Request, res: Response) => {
  try {
    const {
      student_id,
      session_id,
      assessment_trigger,
    }: {
      student_id: string;
      session_id?: string;
      assessment_trigger?: 'onboarding' | 'quarterly' | 'manual';
    } = req.body;

    // Validation
    if (!student_id) {
      res.status(400).json({
        error: 'Missing required field: student_id',
      });
      return;
    }

    // Generate session ID if not provided
    const actualSessionId = session_id || `v153-assessment-${Date.now()}`;

    console.log(`[v15.3] ✅ Starting assessment for student ${student_id}`);
    console.log(`  Session ID: ${actualSessionId}`);
    console.log(`  Trigger: ${assessment_trigger || 'manual'}`);

    // Initialize loaders
    const eqProfileLoader = createEQProfileLoader(pool);
    const coachingIntelligenceLoader = createCoachingIntelligenceLoader();

    // Create Assessment Agent
    const assessmentAgent = createAssessmentAgent(
      pool,
      coachingIntelligenceLoader,
      eqProfileLoader
    );

    console.log(`[v15.3] 🚀 Executing 4-phase assessment...`);

    // Execute assessment (autonomous 4 phases)
    const result = await assessmentAgent.execute({
      student_id,
      session_id: actualSessionId,
      assessment_trigger: assessment_trigger || 'manual',
    });

    if (!result.success) {
      res.status(500).json({
        success: false,
        error: result.error,
        error_code: result.error_code,
      });
      return;
    }

    console.log(`[v15.3] ✅ Assessment complete!`);
    console.log(`  Phases completed: ${result.data?.phase_results.length || 0}/4`);
    console.log(`  Total layers analyzed: ${result.data?.total_layers_analyzed || 0}`);
    console.log(`  Assessment doc ID: ${result.data?.assessment_doc_id}`);

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('[v15.3] Assessment error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// ============================================================================
// GET /api/v15.3/assessment/:studentId - Get latest assessment
// ============================================================================

v153Router.get('/assessment/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;

    console.log(`[v15.3] 📊 Fetching latest assessment for ${studentId}`);

    // Query database for latest assessment
    const result = await pool.query(
      `SELECT
        assessment_doc_id,
        student_id,
        created_at,
        doc_type,
        content
      FROM assessment_docs
      WHERE student_id = $1
      AND doc_type = 'complete_assessment'
      ORDER BY created_at DESC
      LIMIT 1`,
      [studentId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'No assessment found for this student',
      });
      return;
    }

    const assessment = result.rows[0];

    res.json({
      success: true,
      data: {
        assessment_doc_id: assessment.assessment_doc_id,
        student_id: assessment.student_id,
        created_at: assessment.created_at,
        content: assessment.content,
      },
    });
  } catch (error) {
    console.error('[v15.3] Get assessment error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// ============================================================================
// GET /api/v15.3/assessment/:studentId/history - Get all assessments
// ============================================================================

v153Router.get('/assessment/:studentId/history', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { limit = '10' } = req.query;

    console.log(`[v15.3] 📚 Fetching assessment history for ${studentId}`);

    // Query database for all assessments
    const result = await pool.query(
      `SELECT
        assessment_doc_id,
        student_id,
        created_at,
        doc_type,
        content
      FROM assessment_docs
      WHERE student_id = $1
      AND doc_type = 'complete_assessment'
      ORDER BY created_at DESC
      LIMIT $2`,
      [studentId, parseInt(limit as string, 10)]
    );

    res.json({
      success: true,
      data: {
        count: result.rows.length,
        assessments: result.rows.map(row => ({
          assessment_doc_id: row.assessment_doc_id,
          created_at: row.created_at,
          summary: row.content?.summary || 'N/A',
        })),
      },
    });
  } catch (error) {
    console.error('[v15.3] Get history error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// ============================================================================
// GET /api/v15.3/health - Health check for v15.3
// ============================================================================

v153Router.get('/health', async (_req: Request, res: Response) => {
  try {
    // Test database connection
    const dbResult = await pool.query('SELECT 1 as ok');

    // Test intelligence loaders
    const eqProfileLoader = createEQProfileLoader(pool);
    const coachingIntelligenceLoader = createCoachingIntelligenceLoader();

    // Load Jenny's profile to verify data
    const jennyProfile = await eqProfileLoader.loadIntelligence('jenny_duan');

    res.json({
      success: true,
      version: 'v15.3',
      features: [
        '4-phase autonomous assessment',
        '27-layer analysis per assessment',
        'Rich EQ integration (100 communication chips)',
        'Real training examples from iMessages + sessions',
        'Database persistence',
      ],
      database: dbResult.rows[0].ok === 1 ? 'connected' : 'error',
      eq_profile_loaded: jennyProfile ? true : false,
      communication_intelligence: {
        conversations_analyzed: jennyProfile.communication_profile?.total_conversations || 0,
        linguistic_markers: jennyProfile.communication_profile?.linguistic_markers.length || 0,
        move_types: jennyProfile.communication_profile?.move_types.length || 0,
        training_examples: jennyProfile.communication_profile?.training_examples.length || 0,
      },
    });
  } catch (error) {
    console.error('[v15.3] Health check error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Health check failed',
    });
  }
});

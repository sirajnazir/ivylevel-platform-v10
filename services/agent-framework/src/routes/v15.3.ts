/**
 * v15.3 Universal Agent Routes - Assessment Agent
 * Purpose: HTTP endpoints for Universal Agent Architecture
 */

import express, { Request, Response } from 'express';
import { initializeAssessmentAgent, AssessmentAgentService } from '../agents/v15.3/AssessmentAgent.js';
import { pool } from '../db/pool.js';

export const v153Router = express.Router();

// Create agent instance
let assessmentAgent: AssessmentAgentService | null = null;

// Initialize agent on first request
async function ensureAgent() {
  if (!assessmentAgent) {
    assessmentAgent = await initializeAssessmentAgent(pool);
  }
  return assessmentAgent;
}

// ============================================================================
// POST /api/v15.3/assessment/chat - Assessment chat endpoint
// ============================================================================

v153Router.post('/assessment/chat', async (req: Request, res: Response) => {
  try {
    const { student_id, session_id, query } = req.body;

    if (!student_id || !session_id || !query) {
      res.status(400).json({
        error: 'Missing required fields: student_id, session_id, query',
      });
      return;
    }

    // Initialize agent if needed
    const agent = await ensureAgent();

    const response = await agent.processQuery({
      studentId: student_id,
      sessionId: session_id,
      query,
    });

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('v15.3 assessment chat error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// ============================================================================
// GET /api/v15.3/health - Health check endpoint
// ============================================================================

v153Router.get('/health', async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      version: 'v15.3',
      agent: 'AssessmentAgent',
    },
  });
});

// ============================================================================
// GET /api/v15.3/version - Version information
// ============================================================================

v153Router.get('/version', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      version: 'v15.3',
      name: 'Universal Agent Architecture',
      features: [
        'Universal Agent Framework',
        'Assessment Agent with 6-Phase Lifecycle',
        'Rich EQ Integration',
        'Communication Intelligence',
        'Tone Adaptation',
      ],
      release_date: '2025-10-28',
      status: 'active',
    },
  });
});

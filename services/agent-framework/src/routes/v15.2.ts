/**
 * v15.2 Framework Integration - API Routes
 * Purpose: HTTP endpoints for v15.2 LangChain LCEL orchestration
 * Author: v15.2 Implementation
 * Date: 2025-10-28
 */

import express, { Request, Response } from 'express';
import { strategyOrchestrator } from '../v15.2/index.js';
import type { StrategyRequest, StudentContext } from '../v15.2/index.js';

export const v152Router = express.Router();

// ============================================================================
// POST /api/v15.2/chat - Main strategy chat endpoint
// ============================================================================

v152Router.post('/chat', async (req: Request, res: Response) => {
  try {
    const {
      student_id,
      session_id,
      query,
      student_context,
    }: {
      student_id: string;
      session_id: string;
      query: string;
      student_context: StudentContext;
    } = req.body;

    // Validation
    if (!student_id || !session_id || !query) {
      res.status(400).json({
        error: 'Missing required fields: student_id, session_id, query',
      });
      return;
    }

    // Default student context if not provided
    const context: StudentContext = student_context || {
      student_id,
      archetype: 'balanced',
      grade: 11,
      burnout_level: 5,
      recent_topics: [],
    };

    const strategyRequest: StrategyRequest = {
      student_id,
      session_id,
      query,
      student_context: context,
    };

    // Execute strategy orchestration
    const response = await strategyOrchestrator.executeStrategy(strategyRequest);

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('v15.2 chat error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// ============================================================================
// GET /api/v15.2/analytics/:studentId - Get analytics for a student
// ============================================================================

v152Router.get('/analytics/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;

    const analytics = await strategyOrchestrator.getChainAnalytics(studentId);

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('v15.2 analytics error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// ============================================================================
// GET /api/v15.2/health - Health check endpoint
// ============================================================================

v152Router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await strategyOrchestrator.healthCheck();

    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 503 : 503;

    res.status(statusCode).json({
      success: health.status === 'healthy',
      data: health,
    });
  } catch (error) {
    console.error('v15.2 health check error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Health check failed',
    });
  }
});

// ============================================================================
// GET /api/v15.2/version - Version information
// ============================================================================

v152Router.get('/version', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      version: 'v15.2',
      name: 'Framework Integration Enhancement',
      features: [
        'LangChain LCEL Orchestration',
        'LLM-based Intent Routing (GPT-3.5)',
        'Context Engineering Pipeline (Pinecone + SQL)',
        'Producer-Critic Reflection (GPT-4 + Claude)',
        'Quality Gates (7.5/10 threshold)',
        'Comprehensive Observability (4 logging tables)',
      ],
      release_date: '2025-10-28',
      status: 'production-ready',
    },
  });
});

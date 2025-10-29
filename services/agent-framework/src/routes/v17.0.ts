/**
 * v17.0 Enhanced Assessment Agent Routes
 * Purpose: Full v15.2 orchestration with StrategyOrchestrator
 *
 * Key Differences from v15.3:
 * - v15.3: Pattern-matching conversations (existing functionality)
 * - v17.0: Complete orchestration pipeline (Intent → Context → Reflection → Strategy)
 *
 * Both endpoints coexist - v17.0 is 100% additive, zero breaking changes
 */

import express, { Request, Response } from 'express';
import { createStrategyOrchestrator, StrategyExecutionInput } from '../orchestration/StrategyOrchestrator.js';
import { pool } from '../db/pool.js';

export const v170Router = express.Router();

// Feature flag - can be toggled via environment variable
const USE_V17_ORCHESTRATOR = process.env.USE_V17_ORCHESTRATOR === 'true';

// ============================================================================
// POST /api/v17.0/assessment/chat - Enhanced assessment with full orchestration
// ============================================================================

v170Router.post('/assessment/chat', async (req: Request, res: Response) => {
  try {
    const { student_id, session_id, query } = req.body;

    if (!student_id || !session_id || !query) {
      res.status(400).json({
        error: 'Missing required fields: student_id, session_id, query',
      });
      return;
    }

    console.log('[v17.0] Processing query with StrategyOrchestrator:', {
      student_id,
      session_id,
      query: query.substring(0, 100),
    });

    // Create orchestrator instance
    const orchestrator = createStrategyOrchestrator({
      openaiApiKey: process.env.OPENAI_API_KEY,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      pineconeApiKey: process.env.PINECONE_API_KEY,
    });

    // Execute full orchestration pipeline
    const input: StrategyExecutionInput = {
      student_query: query,
      student_id,
      coach_id: 'jenny', // For now, hardcode Jenny as coach
    };

    const result = await orchestrator.execute(input);

    console.log('[v17.0] Orchestration complete:', {
      intent: result.metadata.intent,
      quality_score: result.metadata.quality_score,
      iterations: result.metadata.reflection_iterations,
      duration_ms: result.metadata.total_duration_ms,
    });

    res.json({
      success: true,
      data: {
        response: result.response,
        metadata: {
          version: 'v17.0',
          agent: 'AssessmentAgent',
          orchestration: result.metadata,
        },
      },
    });
  } catch (error) {
    console.error('[v17.0] Assessment chat error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// ============================================================================
// POST /api/v17.0/assessment/chat/streaming - Streaming version for real-time UX
// ============================================================================

v170Router.post('/assessment/chat/streaming', async (req: Request, res: Response) => {
  try {
    const { student_id, session_id, query } = req.body;

    if (!student_id || !session_id || !query) {
      res.status(400).json({
        error: 'Missing required fields: student_id, session_id, query',
      });
      return;
    }

    // Set up SSE headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    console.log('[v17.0] Starting streaming orchestration:', {
      student_id,
      session_id,
      query: query.substring(0, 100),
    });

    const orchestrator = createStrategyOrchestrator({
      openaiApiKey: process.env.OPENAI_API_KEY,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      pineconeApiKey: process.env.PINECONE_API_KEY,
    });

    const input: StrategyExecutionInput = {
      student_query: query,
      student_id,
      coach_id: 'jenny',
    };

    // Stream response chunks
    for await (const chunk of orchestrator.executeStreaming(input)) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('[v17.0] Streaming error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', content: 'Internal server error' })}\n\n`);
    res.end();
  }
});

// ============================================================================
// GET /api/v17.0/health - Health check endpoint
// ============================================================================

v170Router.get('/health', async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      version: 'v17.0',
      agent: 'AssessmentAgent',
      orchestrator: 'StrategyOrchestrator',
      feature_flag_enabled: USE_V17_ORCHESTRATOR,
    },
  });
});

// ============================================================================
// GET /api/v17.0/version - Version information
// ============================================================================

v170Router.get('/version', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      version: 'v17.0',
      name: 'Enhanced Assessment Agent with Full Orchestration',
      features: [
        'GPT-3.5-turbo Intent Classification',
        'Pinecone Semantic Search for Few-Shot Learning',
        'SQL-Grounded Facts (Zero Hallucination)',
        'Producer-Critic Reflection (GPT-4 + Claude 3.5)',
        'Coach Persona Adaptation',
        'Automatic Context Compression',
        'In-Memory Caching (40-60% cost savings)',
        'Streaming Support',
      ],
      services: [
        'IntentRouterService',
        'ContextEngineeringPipeline',
        'ReflectionService',
        'StrategyOrchestrator',
        'CacheService',
      ],
      quality_targets: {
        quality_score: '0.8+',
        latency_p95: '<10s',
        cache_hit_rate: '40%+',
      },
      release_date: '2025-10-28',
      status: 'active',
    },
  });
});

// ============================================================================
// GET /api/v17.0/features - Feature comparison with v15.3
// ============================================================================

v170Router.get('/features', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      v15_3: {
        description: 'Pattern-matching conversations with EQ intelligence',
        features: [
          'Universal Agent Framework',
          'Assessment Agent with 6-Phase Lifecycle',
          'Rich EQ Integration',
          'Communication Intelligence',
          'Tone Adaptation',
        ],
        endpoint: '/api/v15.3/assessment/chat',
      },
      v17_0: {
        description: 'Full v15.2 orchestration pipeline',
        features: [
          'Intent Classification (GPT-3.5-turbo)',
          'Semantic Search for Few-Shot Examples',
          'SQL-Grounded Facts',
          'Producer-Critic Reflection Loop',
          'Coach Persona Adaptation',
          'Context Engineering',
          'Cost Optimization via Caching',
          'Streaming Support',
        ],
        endpoint: '/api/v17.0/assessment/chat',
      },
      recommendation: 'Both endpoints coexist. Use v15.3 for existing functionality, v17.0 for enhanced orchestration.',
    },
  });
});

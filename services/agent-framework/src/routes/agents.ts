/**
 * routes/agents.ts
 * API endpoints for agent execution
 * Created: 2025-10-16 (Phase 1, Week 4)
 * Updated: 2025-10-16 - Added JWT authentication
 */

import express from 'express';
import { agentRegistry } from '../core/AgentRegistry.js';
import { sessionManager } from '../core/SessionManager.js';
import type { AgentExecutionContext } from '../core/types.js';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';
import { withJWT, getCoachId } from '../middleware/auth.js';
import { postHogService } from '../services/PostHogService.js';

const router = express.Router();
const log = createLogger('agents-api');

/**
 * POST /api/agents/chat
 * Execute agent with user message
 *
 * Request body:
 * {
 *   student_id: string;
 *   message: string;
 *   agent_id?: string;  // Optional: specify agent, otherwise auto-route
 *   session_id?: string;  // Optional: continue existing session
 * }
 *
 * Response:
 * {
 *   answer: string;
 *   chips: Array<{kind: string, text: string}>;
 *   debug: {
 *     agent_id: string;
 *     tools_called: string[];
 *     took_ms: number;
 *   };
 *   session_id: string;
 * }
 */
router.post('/chat', withJWT, async (req, res) => {
  const startTime = Date.now();

  try {
    const { student_id, message, agent_id, session_id } = req.body;

    // Extract coach_id from JWT token
    const coachId = getCoachId(req);

    // Validate required fields
    if (!student_id || !message) {
      return res.status(400).json({
        error: 'Missing required fields: student_id, message',
      });
    }

    log.event('agents.chat_request', {
      student_id,
      coach_id: coachId,
      message_preview: message.substring(0, 100),
      agent_id: agent_id || 'auto-route',
      session_id: session_id || 'new',
    });

    // Get or create session (with coach_id from JWT)
    let session;
    if (session_id) {
      session = await sessionManager.getSession(session_id);
      if (!session) {
        return res.status(404).json({
          error: `Session not found: ${session_id}`,
        });
      }
      // Verify session belongs to this coach (RLS enforcement)
      if (session.coach_id && session.coach_id !== coachId) {
        return res.status(403).json({
          error: 'Access denied: Session belongs to different coach',
        });
      }
    } else {
      session = await sessionManager.getOrCreateSession(student_id, undefined, coachId);
    }

    // Get agent (specified or auto-route)
    let agent;
    if (agent_id) {
      agent = agentRegistry.getAgent(agent_id);
      if (!agent) {
        return res.status(404).json({
          error: `Agent not found: ${agent_id}`,
        });
      }
    } else {
      agent = agentRegistry.routeQuery(message);
    }

    // Build execution context
    const context: AgentExecutionContext = {
      session,
      user_message: message,
      agent_manifest: agent.getManifest(),
    };

    // Execute agent (pass registry for handoff detection)
    const result = await agent.execute(context, agentRegistry);

    // Update session in memory
    sessionManager.updateSession(result.session);

    // Persist conversation turn to database
    try {
      const conversationRepo = sessionManager.getConversationRepo();
      await conversationRepo.recordTurn(session, message, result, agent.getManifest(), coachId);
    } catch (error: any) {
      log.error('agents.persist_turn_error', error, {
        session_id: result.session.session_id,
        coach_id: coachId,
      });
      // Continue even if persistence fails
    }

    // Track agent execution in PostHog
    const executionTime = Date.now() - startTime;
    postHogService.trackAgentExecution({
      agent_id: agent.getManifest().agent_id,
      student_id,
      coach_id: coachId,
      session_id: result.session.session_id,
      message,
      response_length: result.response.answer.length,
      latency_ms: executionTime,
      tools_used: result.response.debug?.tools_called || [],
    });

    // Return response
    res.json({
      answer: result.response.answer,
      chips: result.response.chips,
      hits: result.response.hits,
      debug: result.response.debug,
      session_id: result.session.session_id,
      handoff: result.response.handoff,
    });

    log.event('agents.chat_success', {
      student_id,
      agent_id: agent.getManifest().agent_id,
      session_id: result.session.session_id,
      took_ms: executionTime,
    });
  } catch (error: any) {
    log.error('agents.chat_error', error, {
      student_id: req.body.student_id,
    });

    res.status(500).json({
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

/**
 * GET /api/agents/list
 * List all available agents
 */
router.get('/list', withJWT, (req, res) => {
  const agents = agentRegistry.getAllAgents();

  res.json({
    agents: agents.map((agent) => {
      const manifest = agent.getManifest();
      return {
        agent_id: manifest.agent_id,
        display_name: manifest.display_name,
        tagline: manifest.tagline,
        category: manifest.category,
        version: manifest.version,
        tools_count: manifest.tools.length,
        intents_count: manifest.intents.length,
      };
    }),
  });
});

/**
 * GET /api/agents/:agent_id
 * Get agent details
 */
router.get('/:agent_id', (req, res) => {
  const { agent_id } = req.params;
  const agent = agentRegistry.getAgent(agent_id);

  if (!agent) {
    return res.status(404).json({
      error: `Agent not found: ${agent_id}`,
    });
  }

  const manifest = agent.getManifest();

  res.json({
    agent_id: manifest.agent_id,
    display_name: manifest.display_name,
    tagline: manifest.tagline,
    category: manifest.category,
    version: manifest.version,
    jtbd: manifest.jtbd,
    tools: manifest.tools.map((t) => ({
      name: t.function.name,
      description: t.function.description,
    })),
    intents: manifest.intents,
    handoffs: manifest.handoffs,
  });
});

/**
 * GET /api/agents/stats
 * Get agent usage statistics
 */
router.get('/stats', (req, res) => {
  const stats = agentRegistry.getStats();
  res.json(stats);
});

/**
 * GET /api/agents/sessions/stats
 * Get session statistics
 */
router.get('/sessions/stats', (req, res) => {
  const stats = sessionManager.getStats();
  res.json(stats);
});

/**
 * POST /api/agents/sessions/cleanup
 * Clean up old sessions
 */
router.post('/sessions/cleanup', (req, res) => {
  const { max_age_ms = 3600000 } = req.body;
  const cleared = sessionManager.clearOldSessions(max_age_ms);

  res.json({
    cleared_count: cleared,
    max_age_ms,
  });
});

// ==============================================================================
// Conversation History & Replay Endpoints
// ==============================================================================

/**
 * GET /api/agents/sessions/:student_id
 * Get conversation history for a student
 * Protected: Requires JWT authentication
 */
router.get('/sessions/:student_id', withJWT, async (req, res) => {
  try {
    const { student_id } = req.params;
    const coachId = getCoachId(req);
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    const conversationRepo = sessionManager.getConversationRepo();
    // RLS will automatically filter to only this coach's sessions
    const sessions = await conversationRepo.getStudentSessions(student_id, limit, offset);

    res.json({
      sessions,
      student_id,
      limit,
      offset,
      count: sessions.length,
    });

    log.event('agents.sessions_retrieved', {
      student_id,
      count: sessions.length,
    });
  } catch (error: any) {
    log.error('agents.sessions_error', error, {
      student_id: req.params.student_id,
    });

    res.status(500).json({
      error: error.message || 'Failed to retrieve sessions',
    });
  }
});

/**
 * GET /api/agents/replay/:session_id
 * Get full conversation replay
 * Protected: Requires JWT authentication
 */
router.get('/replay/:session_id', withJWT, async (req, res) => {
  try {
    const { session_id } = req.params;
    const coachId = getCoachId(req);

    const conversationRepo = sessionManager.getConversationRepo();
    // RLS will automatically ensure only this coach's sessions are accessible
    const replay = await conversationRepo.getConversationReplay(session_id);

    if (!replay) {
      return res.status(404).json({
        error: `Session not found: ${session_id}`,
      });
    }

    res.json({
      session_id,
      replay,
    });

    log.event('agents.replay_retrieved', {
      session_id,
      turn_count: replay.turns.length,
    });
  } catch (error: any) {
    log.error('agents.replay_error', error, {
      session_id: req.params.session_id,
    });

    res.status(500).json({
      error: error.message || 'Failed to retrieve replay',
    });
  }
});

/**
 * GET /api/agents/analytics/:session_id
 * Get conversation analytics
 * Protected: Requires JWT authentication
 */
router.get('/analytics/:session_id', withJWT, async (req, res) => {
  try {
    const { session_id } = req.params;
    const coachId = getCoachId(req);

    const conversationRepo = sessionManager.getConversationRepo();
    // RLS will automatically ensure only this coach's sessions are accessible
    const analytics = await conversationRepo.getConversationAnalytics(session_id);

    if (!analytics) {
      return res.status(404).json({
        error: `Session not found: ${session_id}`,
      });
    }

    res.json({
      session_id,
      analytics,
    });

    log.event('agents.analytics_retrieved', {
      session_id,
    });
  } catch (error: any) {
    log.error('agents.analytics_error', error, {
      session_id: req.params.session_id,
    });

    res.status(500).json({
      error: error.message || 'Failed to retrieve analytics',
    });
  }
});

/**
 * GET /api/agents/performance
 * Get agent performance metrics
 */
router.get('/performance', async (req, res) => {
  try {
    const conversationRepo = sessionManager.getConversationRepo();
    const metrics = await conversationRepo.getAgentPerformanceMetrics();

    res.json({
      metrics,
      count: metrics.length,
    });

    log.event('agents.performance_retrieved', {
      count: metrics.length,
    });
  } catch (error: any) {
    log.error('agents.performance_error', error);

    res.status(500).json({
      error: error.message || 'Failed to retrieve performance metrics',
    });
  }
});

/**
 * POST /api/agents/sessions/:session_id/rate
 * Add satisfaction rating to session
 * Protected: Requires JWT authentication
 */
router.post('/sessions/:session_id/rate', withJWT, async (req, res) => {
  try {
    const { session_id } = req.params;
    const coachId = getCoachId(req);
    const { rating } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        error: 'Rating must be between 1 and 5',
      });
    }

    const conversationRepo = sessionManager.getConversationRepo();
    await conversationRepo.addSatisfactionRating(session_id, rating);

    res.json({
      session_id,
      rating,
      success: true,
    });

    log.event('agents.rating_added', {
      session_id,
      rating,
    });
  } catch (error: any) {
    log.error('agents.rating_error', error, {
      session_id: req.params.session_id,
    });

    res.status(500).json({
      error: error.message || 'Failed to add rating',
    });
  }
});

/**
 * POST /api/agents/sessions/:session_id/status
 * Update session status
 * Protected: Requires JWT authentication
 */
router.post('/sessions/:session_id/status', withJWT, async (req, res) => {
  try {
    const { session_id } = req.params;
    const coachId = getCoachId(req);
    const { status } = req.body;

    if (!['active', 'resolved', 'abandoned', 'escalated'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status. Must be: active, resolved, abandoned, or escalated',
      });
    }

    const conversationRepo = sessionManager.getConversationRepo();
    await conversationRepo.updateSessionStatus(session_id, status);

    res.json({
      session_id,
      status,
      success: true,
    });

    log.event('agents.status_updated', {
      session_id,
      status,
    });
  } catch (error: any) {
    log.error('agents.status_error', error, {
      session_id: req.params.session_id,
    });

    res.status(500).json({
      error: error.message || 'Failed to update status',
    });
  }
});

export default router;

/**
 * routes/agents.ts
 * API endpoints for agent execution
 * Created: 2025-10-16 (Phase 1, Week 4)
 */

import express from 'express';
import { agentRegistry } from '../core/AgentRegistry.js';
import { sessionManager } from '../core/SessionManager.js';
import type { AgentExecutionContext } from '../core/types.js';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

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
router.post('/chat', async (req, res) => {
  const startTime = Date.now();

  try {
    const { student_id, message, agent_id, session_id } = req.body;

    // Validate required fields
    if (!student_id || !message) {
      return res.status(400).json({
        error: 'Missing required fields: student_id, message',
      });
    }

    log.event('agents.chat_request', {
      student_id,
      message_preview: message.substring(0, 100),
      agent_id: agent_id || 'auto-route',
      session_id: session_id || 'new',
    });

    // Get or create session
    let session;
    if (session_id) {
      session = sessionManager.getSession(session_id);
      if (!session) {
        return res.status(404).json({
          error: `Session not found: ${session_id}`,
        });
      }
    } else {
      session = await sessionManager.getOrCreateSession(student_id);
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

    // Execute agent
    const result = await agent.execute(context);

    // Update session
    sessionManager.updateSession(result.session);

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
      took_ms: Date.now() - startTime,
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
router.get('/list', (req, res) => {
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

export default router;

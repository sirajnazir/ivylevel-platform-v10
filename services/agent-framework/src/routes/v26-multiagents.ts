/**
 * v26.0 MultiAgents Routes
 *
 * Purpose: API endpoints for multi-agent orchestration with session-based state management.
 *
 * Architecture:
 * - Session lifecycle: start → assessment → gameplan → execution → complete
 * - Agent routing: Assessment → GamePlan → (Awards + Programs + Scholarships) → Execution
 * - Real-time intelligence tracing and conversation history
 *
 * Endpoints:
 * - POST /api/v26/session/start - Start new multiagent session
 * - GET /api/v26/session/:sessionId - Get session state and history
 * - POST /api/v26/session/:sessionId/pause - Pause active session
 * - POST /api/v26/session/:sessionId/resume - Resume paused session
 * - POST /api/v26/agents/:agentId/message - Send message to specific agent
 * - GET /api/v26/agents/:agentId/status - Get agent status and capabilities
 * - GET /api/v26/session/:sessionId/trace - Get intelligence activation traces
 * - POST /api/v26/session/:sessionId/handoff - Trigger agent handoff
 *
 * Created: 2025-11-01
 * Version: v26.0
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { AgentRegistry } from '../agents/registry.js';
import { withApiKey, withRateLimit } from '../middleware/security.js';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';
import { V26AgentWrapper } from '../agents/V26AgentWrapper.js';

const router = Router();
const logger = createLogger('v26-multiagents');

/**
 * Initialize router with dependencies
 */
export function createV26MultiAgentsRouter(pool: Pool, agentRegistry: AgentRegistry): Router {
  // Initialize V26AgentWrapper with intelligence-guided responses
  const v26Wrapper = new V26AgentWrapper(agentRegistry);

  logger.event('v26.router.initialized', {
    v26_wrapper: 'enabled',
    mode: 'intelligence_guided_new_student',
    real_intelligence_frameworks: true,
    clean_slate_context: true,
  });
  // ============================================================================
  // POST /api/v26/session/start
  // ============================================================================
  /**
   * Start new multiagent session
   *
   * Body:
   * - student_id: Student ID
   * - session_type: 'onboarding' | 'weekly_execution' | 'ad_hoc'
   *
   * Response:
   * - session_id: UUID
   * - status: 'in_progress'
   * - current_phase: 'assessment'
   * - current_agent: 'assessment-agent-v18'
   * - welcome_message: Initial message from system
   */
  router.post('/session/start', withRateLimit, withApiKey, async (req: Request, res: Response) => {
    try {
      const { student_id, session_type = 'onboarding' } = req.body;

      if (!student_id) {
        return res.status(400).json({
          error: 'Missing student_id',
          message: 'student_id is required to start a session',
        });
      }

      logger.event('v26.session.start', { student_id, session_type });

      // Create new session in database
      const sessionResult = await pool.query(
        `INSERT INTO multiagent_sessions (
          student_id, session_type, status, current_phase, current_agent
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id, status, current_phase, current_agent, started_at`,
        [student_id, session_type, 'in_progress', 'assessment', 'assessment-agent-v18']
      );

      const session = sessionResult.rows[0];

      // Get student name from student_id (v26 siloed mode - no students table)
      // Format: "huda-2025" → "Huda A."
      const studentName = student_id.split('-')[0].charAt(0).toUpperCase() +
                         student_id.split('-')[0].slice(1) + ' A.';

      // Generate welcome message based on session type
      let welcomeMessage = '';
      if (session_type === 'onboarding') {
        welcomeMessage = `Hi ${studentName}! 👋 Welcome to IvyLevel's MultiAgent Coaching Platform v2.0.

I'm your Assessment Agent, and I'll be working with a team of specialized AI agents to help you build your path to top colleges.

**Your Journey Today:**
1. **Assessment** (Phase 1-4): We'll evaluate your current profile
2. **GamePlan**: Create your strategic roadmap
3. **Week 1 Execution**: Plan your first week of action

Ready to begin? Let's start with Phase 1: Understanding your academic foundation.

What grade are you currently in?`;
      } else if (session_type === 'weekly_execution') {
        welcomeMessage = `Welcome back, ${studentName}! 🚀

I'm your Execution Agent. Let's plan your weekly execution strategy using Jenny's proven frameworks.

What would you like to focus on this week?`;
      }

      // Insert welcome message
      await pool.query(
        `INSERT INTO multiagent_messages (
          session_id, agent_id, role, content
        ) VALUES ($1, $2, $3, $4)`,
        [session.id, 'system', 'system', welcomeMessage]
      );

      logger.event('v26.session.started', {
        session_id: session.id,
        student_id,
        session_type,
        current_phase: session.current_phase,
      });

      return res.status(201).json({
        session_id: session.id,
        status: session.status,
        current_phase: session.current_phase,
        current_agent: session.current_agent,
        started_at: session.started_at,
        welcome_message: welcomeMessage,
      });
    } catch (error) {
      logger.error('v26.session.start.error', { error: String(error) });
      return res.status(500).json({
        error: 'Failed to start session',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ============================================================================
  // GET /api/v26/session/:sessionId
  // ============================================================================
  /**
   * Get session state and conversation history
   */
  router.get('/session/:sessionId', withRateLimit, withApiKey, async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;

      // Get session info
      const sessionResult = await pool.query(
        `SELECT * FROM multiagent_sessions WHERE id = $1`,
        [sessionId]
      );

      if (sessionResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Session not found',
          message: `Session ${sessionId} does not exist`,
        });
      }

      const session = sessionResult.rows[0];

      // Get conversation history
      const messagesResult = await pool.query(
        `SELECT * FROM multiagent_messages WHERE session_id = $1 ORDER BY timestamp ASC`,
        [sessionId]
      );

      // Get intelligence activations count
      const intelligenceResult = await pool.query(
        `SELECT COUNT(*) as count FROM intelligence_activations WHERE session_id = $1`,
        [sessionId]
      );

      return res.status(200).json({
        session: {
          id: session.id,
          student_id: session.student_id,
          session_type: session.session_type,
          status: session.status,
          current_phase: session.current_phase,
          current_agent: session.current_agent,
          assessment_package: session.assessment_package,
          gameplan_package: session.gameplan_package,
          execution_package: session.execution_package,
          analytics: session.analytics,
          started_at: session.started_at,
          completed_at: session.completed_at,
        },
        messages: messagesResult.rows,
        intelligence_activations_count: parseInt(intelligenceResult.rows[0].count),
      });
    } catch (error) {
      logger.error('v26.session.get.error', { error: String(error) });
      return res.status(500).json({
        error: 'Failed to get session',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ============================================================================
  // POST /api/v26/agents/:agentId/message
  // ============================================================================
  /**
   * Send message to specific agent and get response
   */
  router.post('/agents/:agentId/message', withRateLimit, withApiKey, async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      const { session_id, message, student_id } = req.body;

      if (!session_id || !message || !student_id) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'session_id, message, and student_id are required',
        });
      }

      logger.event('v26.agent.message', { agent_id: agentId, session_id, student_id });

      // Save user message
      const userMessageResult = await pool.query(
        `INSERT INTO multiagent_messages (
          session_id, agent_id, role, content
        ) VALUES ($1, $2, $3, $4) RETURNING id, timestamp`,
        [session_id, agentId, 'user', message]
      );

      const userMessage = userMessageResult.rows[0];

      // Route to V26AgentWrapper (uses real agents with clean-slate student context)
      const startTime = Date.now();

      const agentResponse = await v26Wrapper.handleQuery({
        agent_id: agentId,
        student_id,
        session_id,
        message,
      });

      const processingTime = Date.now() - startTime;

      // Log v26 context
      logger.event('v26.agent.response_with_context', {
        agent_id: agentId,
        session_id,
        is_new_student: agentResponse.v26_context.is_new_student,
        facts_from_session: agentResponse.v26_context.facts_from_session,
        facts_from_db: agentResponse.v26_context.facts_from_db,
      });

      // Save agent response
      const agentMessageResult = await pool.query(
        `INSERT INTO multiagent_messages (
          session_id, agent_id, role, content, processing_time, confidence, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, timestamp`,
        [
          session_id,
          agentId,
          'agent',
          agentResponse.response,
          processingTime,
          agentResponse.validation_score ? agentResponse.validation_score * 100 : null,
          JSON.stringify(agentResponse.metadata || {}),
        ]
      );

      const agentMessage = agentMessageResult.rows[0];

      // Save intelligence activations if available
      if ((agentResponse as any).intelligence_results) {
        const intelligenceResults = (agentResponse as any).intelligence_results;
        for (const result of intelligenceResults) {
          await pool.query(
            `INSERT INTO intelligence_activations (
              session_id, message_id, agent_id, intelligence_type,
              status, confidence, generated_text, timestamp
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
            [
              session_id,
              agentMessage.id,
              agentId,
              result.type_id,
              result.triggered ? 'triggered' : 'not_triggered',
              result.confidence || 0,
              result.data ? JSON.stringify(result.data) : null,
            ]
          );
        }
      }

      // Update session analytics
      await pool.query(
        `UPDATE multiagent_sessions
         SET analytics = jsonb_set(
           jsonb_set(analytics, '{total_messages}', (COALESCE((analytics->>'total_messages')::int, 0) + 2)::text::jsonb),
           '{agents_used}',
           COALESCE(analytics->'agents_used', '[]'::jsonb) || $1::jsonb
         )
         WHERE id = $2`,
        [JSON.stringify([agentId]), session_id]
      );

      logger.event('v26.agent.message.success', {
        agent_id: agentId,
        session_id,
        processing_time: processingTime,
        intelligence_triggered: (agentResponse as any).triggered_intelligence?.length || 0,
      });

      return res.status(200).json({
        user_message_id: userMessage.id,
        agent_message_id: agentMessage.id,
        agent_response: agentResponse.response,
        processing_time: processingTime,
        confidence: agentResponse.validation_score,
        intelligence_triggered: (agentResponse as any).triggered_intelligence || [],
        metadata: agentResponse.metadata,
      });
    } catch (error) {
      logger.error('v26.agent.message.error', { error: String(error) });
      return res.status(500).json({
        error: 'Failed to process message',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ============================================================================
  // GET /api/v26/session/:sessionId/trace
  // ============================================================================
  /**
   * Get intelligence activation traces for a session
   */
  router.get('/session/:sessionId/trace', withRateLimit, withApiKey, async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;

      const result = await pool.query(
        `SELECT * FROM intelligence_activations
         WHERE session_id = $1
         ORDER BY timestamp ASC`,
        [sessionId]
      );

      return res.status(200).json({
        session_id: sessionId,
        activations: result.rows,
        total_count: result.rows.length,
        triggered_count: result.rows.filter((r) => r.status === 'triggered').length,
      });
    } catch (error) {
      logger.error('v26.session.trace.error', { error: String(error) });
      return res.status(500).json({
        error: 'Failed to get traces',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ============================================================================
  // POST /api/v26/session/:sessionId/pause
  // ============================================================================
  /**
   * Pause active session
   */
  router.post('/session/:sessionId/pause', withRateLimit, withApiKey, async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;

      await pool.query(
        `UPDATE multiagent_sessions SET status = 'paused', updated_at = NOW() WHERE id = $1`,
        [sessionId]
      );

      logger.event('v26.session.paused', { session_id: sessionId });

      return res.status(200).json({
        session_id: sessionId,
        status: 'paused',
        message: 'Session paused successfully',
      });
    } catch (error) {
      logger.error('v26.session.pause.error', { error: String(error) });
      return res.status(500).json({
        error: 'Failed to pause session',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ============================================================================
  // POST /api/v26/session/:sessionId/resume
  // ============================================================================
  /**
   * Resume paused session
   */
  router.post('/session/:sessionId/resume', withRateLimit, withApiKey, async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;

      await pool.query(
        `UPDATE multiagent_sessions SET status = 'in_progress', updated_at = NOW() WHERE id = $1`,
        [sessionId]
      );

      logger.event('v26.session.resumed', { session_id: sessionId });

      return res.status(200).json({
        session_id: sessionId,
        status: 'in_progress',
        message: 'Session resumed successfully',
      });
    } catch (error) {
      logger.error('v26.session.resume.error', { error: String(error) });
      return res.status(500).json({
        error: 'Failed to resume session',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ============================================================================
  // GET /api/v26/agents/:agentId/status
  // ============================================================================
  /**
   * Get agent status and capabilities
   */
  router.get('/agents/:agentId/status', withRateLimit, withApiKey, async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;

      // Define agent capabilities
      const agentCapabilities: Record<string, any> = {
        'assessment-agent-v18': {
          name: 'Assessment Agent',
          version: 'v18',
          intelligence_types: ['TYPE-080', 'TYPE-081', 'TYPE-082', 'TYPE-083'],
          capabilities: ['Four-Phase Assessment', 'IvyScore Calculation', 'Gap Analysis', 'Potential Indicator Extraction'],
          color: '#4F46E5',
        },
        'gameplan-agent-v18': {
          name: 'GamePlan Agent',
          version: 'v18',
          intelligence_types: ['TYPE-001', 'TYPE-002', 'TYPE-003', 'TYPE-004', 'TYPE-006', 'TYPE-007'],
          capabilities: ['GamePlan Synthesis', 'Weak Spot Prioritization', 'Timeline Architecture', 'Multi-Path Convergence', 'Quarterly Adaptation', 'Time Mathematician'],
          color: '#059669',
        },
        'execution-agent-v20': {
          name: 'Execution Agent',
          version: 'v20',
          intelligence_types: ['TYPE-049', 'TYPE-050', 'TYPE-051', 'TYPE-052', 'TYPE-053', 'TYPE-054', 'TYPE-055', 'TYPE-056', 'TYPE-057', 'TYPE-058', 'TYPE-059', 'TYPE-060', 'TYPE-061', 'TYPE-062', 'TYPE-063'],
          capabilities: ['Execution Ladder', 'Outcome Engineering', 'Task Decomposition', 'Portfolio Cadence', 'Time Architecture', 'Metric Ladder', 'Blocking Detection', 'LoR Engineering', 'Proof Engineering', 'Application Mastery', 'Narrative Harmonization', 'Seasonal Energy', 'Multi-Agent Delegation', 'Qualitative Transformation', 'Progress Velocity'],
          color: '#DC2626',
        },
        'awards-agent-v18': {
          name: 'Awards Agent',
          version: 'v18.1',
          intelligence_types: ['TYPE-023', 'TYPE-026', 'TYPE-027'],
          capabilities: ['Award Arbitrage System', 'Quick Wins Strategy', 'Momentum Plan'],
          color: '#D97706',
        },
        'programs-agent-v19': {
          name: 'Summer Programs Agent',
          version: 'v19',
          intelligence_types: ['TYPE-028', 'TYPE-029', 'TYPE-030'],
          capabilities: ['Program Selection Matrix', 'Program Application Strategy', 'Cost-Benefit Intelligence'],
          color: '#7C3AED',
        },
        'scholarships-agent-v21': {
          name: 'Scholarships Agent',
          version: 'v21',
          intelligence_types: ['TYPE-031', 'TYPE-032', 'TYPE-033'],
          capabilities: ['Scholarship Selection Matrix', 'Application Timeline Strategy', 'Financial Aid Intelligence'],
          color: '#0891B2',
        },
      };

      const agentInfo = agentCapabilities[agentId];

      if (!agentInfo) {
        return res.status(404).json({
          error: 'Agent not found',
          message: `Agent ${agentId} is not recognized`,
        });
      }

      return res.status(200).json({
        agent_id: agentId,
        ...agentInfo,
        status: 'active',
      });
    } catch (error) {
      logger.error('v26.agent.status.error', { error: String(error) });
      return res.status(500).json({
        error: 'Failed to get agent status',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ============================================================================
  // POST /api/v26/session/:sessionId/handoff
  // ============================================================================
  /**
   * Trigger agent handoff (phase transition)
   */
  router.post('/session/:sessionId/handoff', withRateLimit, withApiKey, async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { from_agent, to_agent, data_package } = req.body;

      logger.event('v26.session.handoff', {
        session_id: sessionId,
        from_agent,
        to_agent,
      });

      // Determine new phase based on target agent
      let newPhase = 'assessment';
      if (to_agent.includes('gameplan')) {
        newPhase = 'gameplan';
      } else if (to_agent.includes('execution')) {
        newPhase = 'execution';
      }

      // Update session with handoff
      await pool.query(
        `UPDATE multiagent_sessions
         SET current_agent = $1, current_phase = $2, updated_at = NOW()
         WHERE id = $3`,
        [to_agent, newPhase, sessionId]
      );

      // Optionally store data package
      if (data_package) {
        const packageField = newPhase === 'gameplan' ? 'assessment_package' :
                            newPhase === 'execution' ? 'gameplan_package' : null;

        if (packageField) {
          await pool.query(
            `UPDATE multiagent_sessions SET ${packageField} = $1 WHERE id = $2`,
            [JSON.stringify(data_package), sessionId]
          );
        }
      }

      logger.event('v26.session.handoff.success', {
        session_id: sessionId,
        new_phase: newPhase,
        new_agent: to_agent,
      });

      return res.status(200).json({
        session_id: sessionId,
        status: 'handoff_complete',
        from_agent,
        to_agent,
        new_phase: newPhase,
        message: `Handoff from ${from_agent} to ${to_agent} completed successfully`,
      });
    } catch (error) {
      logger.error('v26.session.handoff.error', { error: String(error) });
      return res.status(500).json({
        error: 'Failed to complete handoff',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
}

export default router;

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
import { V26AgentWrapperReal } from '../agents/V26AgentWrapperReal.js';
import { HandoverValidator } from '../a2a/HandoverValidator.js';
import { FactCategory } from '../facts/types.js';

const router = Router();
const logger = createLogger('v26-multiagents');

/**
 * Initialize router with dependencies
 */
export function createV26MultiAgentsRouter(pool: Pool, agentRegistry: AgentRegistry): Router {
  // Initialize V26AgentWrapperReal with REAL agents for clone students
  const v26Wrapper = new V26AgentWrapperReal(agentRegistry, pool);

  logger.event('v26.router.initialized', {
    v26_wrapper: 'real_agents',
    mode: 'clone_student_with_empty_facts',
    agents_used: ['AssessmentAgentV3', 'GamePlanAgent', 'ExecutionAgent', 'AwardsAgent', 'SummerProgramsAgent', 'ScholarshipsAgent'],
    intelligence_types: 'all_real_types_TYPE-001_through_TYPE-083',
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

      // Get clone student ID from mapping (MUST happen BEFORE creating session)
      const V26_STUDENT_MAPPING: Record<string, string> = {
        'huda-2025': 'huda-v26-2025',
      };
      const cloneStudentId = V26_STUDENT_MAPPING[student_id] || `${student_id}-v26-clone`;

      console.log('[V26_SESSION_START] Student ID mapping:', {
        real_student_id: student_id,
        clone_student_id: cloneStudentId
      });

      // CRITICAL: Clean ALL old data for clone student before starting new session
      // This ensures fresh baseline with no cached facts from previous test runs
      console.log('[V26_SESSION_START] 🧹 Cleaning old clone student data...');
      try {
        // Delete intelligence activations (linked via session_id)
        const r1 = await pool.query(`
          DELETE FROM intelligence_activations
          WHERE session_id IN (SELECT id FROM multiagent_sessions WHERE student_id = $1)
        `, [cloneStudentId]);

        // Delete multiagent messages
        const r2 = await pool.query(`
          DELETE FROM multiagent_messages
          WHERE session_id IN (SELECT id FROM multiagent_sessions WHERE student_id = $1)
        `, [cloneStudentId]);

        // Delete multiagent sessions
        const r3 = await pool.query(`
          DELETE FROM multiagent_sessions WHERE student_id = $1
        `, [cloneStudentId]);

        // Delete kb_items (facts)
        const r4 = await pool.query(`
          DELETE FROM kb_items WHERE student_id = $1
        `, [cloneStudentId]);

        console.log('[V26_SESSION_START] ✅ Cleanup complete:', {
          intelligence_activations: r1.rowCount,
          messages: r2.rowCount,
          sessions: r3.rowCount,
          facts: r4.rowCount,
        });
      } catch (cleanupError) {
        console.error('[V26_SESSION_START] ⚠️  Cleanup error (non-fatal):', cleanupError);
        // Continue with session creation even if cleanup fails
      }

      // Create new session in database with CLONE student ID
      const sessionResult = await pool.query(
        `INSERT INTO multiagent_sessions (
          student_id, session_type, status, current_phase, current_agent
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id, status, current_phase, current_agent, started_at`,
        [cloneStudentId, session_type, 'in_progress', 'assessment', 'assessment-agent-v18']
      );

      const session = sessionResult.rows[0];

      // Get student name from real student_id (v26 siloed mode - no students table)
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
        real_student_id: student_id,
        clone_student_id: cloneStudentId,
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
        // v26 Context: Real vs Clone Student IDs for intelligence tracing
        v26_context: {
          real_student_id: student_id,
          clone_student_id: cloneStudentId,
          is_clone_student: true,
        },
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

      // Get session to retrieve clone student_id (session already stores clone ID)
      const sessionResult = await pool.query(
        `SELECT student_id, current_phase FROM multiagent_sessions WHERE id = $1`,
        [session_id]
      );

      if (sessionResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Session not found',
          message: `No session found with id ${session_id}`,
        });
      }

      const cloneStudentId = sessionResult.rows[0].student_id; // Already the clone ID!

      console.log('[V26_MESSAGE] Using clone student ID from session:', {
        session_id,
        clone_student_id: cloneStudentId,
        real_student_id_from_frontend: student_id
      });

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
        student_id: cloneStudentId, // Use clone ID from session, not frontend student_id
        session_id,
        message,
      });

      const processingTime = Date.now() - startTime;

      // Log v26 context
      logger.event('v26.agent.response_with_context', {
        agent_id: agentId,
        session_id,
        is_clone_student: agentResponse.v26_context.is_clone_student,
        clone_student_id: agentResponse.v26_context.clone_student_id,
        real_student_id: agentResponse.v26_context.real_student_id,
        conversation_turns: agentResponse.v26_context.conversation_turns,
        intent_classification: agentResponse.v26_context.intent_classification,
        processing_steps: agentResponse.v26_context.processing_steps,
        intelligence_triggered_count: agentResponse.intelligence_triggered.length,
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

      let agentMessage = agentMessageResult.rows[0];

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

      // v28.0: Check for A2A handover in metadata
      const a2a_handover_complete = agentResponse.metadata?.a2a_handover_complete || false;
      const handover_id = agentResponse.metadata?.handover_id;
      const new_agent_id = agentResponse.metadata?.agent_id;

      // Phase mapping for agent transitions
      const phaseMap: Record<string, string> = {
        'assessment-agent-v18': 'assessment',
        'gameplan-agent': 'gameplan',
        'execution-agent': 'execution'
      };

      if (a2a_handover_complete && handover_id && new_agent_id) {
        console.log('[V26_A2A] 🔄 A2A Handover detected!', {
          handover_id,
          from_agent: agentId,
          to_agent: new_agent_id,
          session_id
        });

        // v28.5: Load available facts from kb_items for handover validation
        console.log('[V28.5_HANDOVER] 📊 Loading facts for handover validation...');
        const factsResult = await pool.query(
          `SELECT category, fact_type, fact_value, fact_text, confidence, metadata
           FROM kb_items
           WHERE student_id = $1
             AND source_ref = $2
           ORDER BY created_at DESC`,
          [cloneStudentId, 'gpt4o_conversational_extraction_v28']
        );

        // Group facts by category
        const available_facts = new Map<FactCategory, any[]>();
        for (const row of factsResult.rows) {
          const category = row.category as FactCategory;
          if (!available_facts.has(category)) {
            available_facts.set(category, []);
          }
          available_facts.get(category)!.push(row);
        }

        console.log('[V28.5_HANDOVER] 📋 Facts loaded by category:', {
          categories: Array.from(available_facts.keys()),
          total_facts: factsResult.rows.length,
          breakdown: Array.from(available_facts.entries()).map(([cat, facts]) => ({
            category: cat,
            count: facts.length
          }))
        });

        // v28.5: Validate handover readiness with HandoverValidator
        console.log('[V28.5_HANDOVER] 🔍 Validating handover with 20 quality gates...');
        const handoverValidation = await HandoverValidator.validateHandover(
          agentId,
          new_agent_id,
          available_facts
        );

        console.log('[V28.5_HANDOVER] 📊 Validation Result:', {
          is_ready: handoverValidation.is_ready,
          quality_score: handoverValidation.quality_score,
          quality_gates_passed: `${handoverValidation.quality_gates_passed}/${handoverValidation.quality_gates_total}`,
          recommendation: handoverValidation.recommendation,
          missing_mandatory: handoverValidation.missing_mandatory_facts.length,
          rushed_indicators: handoverValidation.rushed_handover_indicators.length
        });

        // Update session to reflect new active agent
        const newPhase = phaseMap[new_agent_id] || sessionResult.rows[0].current_phase;

        await pool.query(
          `UPDATE multiagent_sessions
           SET current_agent = $1,
               current_phase = $2,
               updated_at = NOW()
           WHERE id = $3`,
          [new_agent_id, newPhase, session_id]
        );

        console.log('[V26_A2A] ✅ Session updated:', {
          new_agent: new_agent_id,
          new_phase: newPhase
        });

        // v28.5: Call new agent based on validation result
        console.log('[V28.5_HANDOVER] 🚀 Proceeding with handover...');

        try {
          // v28.5: Always call the new agent (it will handle insufficient data internally)
          // The agent's generateInsufficientDataResponse() will ask natural questions if needed
          const handoverResponse = await v26Wrapper.handleQuery({
            agent_id: new_agent_id,
            student_id: cloneStudentId,
            session_id,
            message: 'continue', // Trigger agent initialization
          });

          console.log('[V28.5_HANDOVER] ✅ New agent response generated:', {
            response_length: handoverResponse.response?.length || 0,
            validation_score: handoverResponse.validation_score,
            handover_quality: handoverValidation.quality_score
          });

          // Replace the placeholder response with the actual new agent response
          agentResponse.response = handoverResponse.response;
          agentResponse.metadata = {
            ...agentResponse.metadata,
            ...handoverResponse.metadata,
            handover_validation: {
              quality_score: handoverValidation.quality_score,
              quality_gates_passed: handoverValidation.quality_gates_passed,
              quality_gates_total: handoverValidation.quality_gates_total,
              is_ready: handoverValidation.is_ready,
              recommendation: handoverValidation.recommendation,
            }
          };

          // Store the new agent's message
          const newAgentMessageResult = await pool.query(
            `INSERT INTO multiagent_messages
             (session_id, agent_id, role, content, processing_time, confidence, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, timestamp`,
            [
              session_id,
              new_agent_id,
              'agent',
              handoverResponse.response,
              processingTime,
              handoverResponse.validation_score || 1,
              JSON.stringify({
                agent_id: handoverResponse.agent_id,
                intelligence_triggered: handoverResponse.intelligence_triggered,
                handover_received: true,
                handover_validation: {
                  quality_score: handoverValidation.quality_score,
                  quality_gates_passed: handoverValidation.quality_gates_passed,
                  is_ready: handoverValidation.is_ready,
                }
              }),
            ]
          );

          // Update agentMessage reference to the new agent's message
          agentMessage = newAgentMessageResult.rows[0];

          console.log('[V28.5_HANDOVER] 💾 New agent message stored:', agentMessage.id);
        } catch (handoverError) {
          console.error('[V28.5_HANDOVER] ❌ Failed to call new agent:', handoverError);
          // Keep the placeholder response if agent call fails
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
        intelligence_triggered: (agentResponse as any).intelligence_triggered?.length || 0,
        a2a_handover: a2a_handover_complete ? handover_id : null,
      });

      return res.status(200).json({
        user_message_id: userMessage.id,
        agent_message_id: agentMessage.id,
        agent_response: agentResponse.response,
        processing_time: processingTime,
        confidence: agentResponse.validation_score,
        intelligence_triggered: (agentResponse as any).intelligence_triggered || [],
        metadata: agentResponse.metadata,
        // v28.0: A2A Handover information
        a2a_handover: a2a_handover_complete ? {
          handover_complete: true,
          handover_id,
          from_agent: agentId,
          to_agent: new_agent_id,
          new_phase: phaseMap[new_agent_id] || sessionResult.rows[0].current_phase
        } : null,
        // v26 Context: Real vs Clone Student IDs for intelligence tracing
        v26_context: {
          real_student_id: student_id,
          clone_student_id: agentResponse.v26_context?.clone_student_id || `${student_id}-v26-clone`,
          is_clone_student: true,
        },
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

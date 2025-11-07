/**
 * v31.4 MultiAgents Routes (Clean LangGraph Orchestration)
 *
 * Purpose: Thin API layer over LangGraph orchestration for multi-agent interactions.
 *
 * Architecture (v31.4):
 * - Single orchestration path: All requests → LangGraphOrchestratorV31
 * - State management: Redis-backed checkpointing + database persistence
 * - Memory: Conversation history and collected facts preserved across turns
 * - Agents: UNCHANGED - wrapped as LangGraph tools
 * - Intelligence: 83 types preserved (TYPE-001 through TYPE-083)
 *
 * Session lifecycle: start → assessment → gameplan → execution → complete
 * Agent flow: Assessment → GamePlan → (Awards + ECs + Scholarships) → Execution
 *
 * Endpoints:
 * - POST /api/v26/session/start - Start new multiagent session
 * - GET /api/v26/session/:sessionId - Get session state and history
 * - POST /api/v26/session/:sessionId/pause - Pause active session
 * - POST /api/v26/session/:sessionId/resume - Resume paused session
 * - POST /api/v26/agents/:agentId/message - Send message to specific agent (via orchestrator)
 * - GET /api/v26/agents/:agentId/status - Get agent status and capabilities
 * - GET /api/v26/session/:sessionId/trace - Get intelligence activation traces
 * - POST /api/v26/session/:sessionId/handoff - Trigger agent handoff
 *
 * Created: 2025-11-01
 * Updated: 2025-11-04 (v31.4 - Clean orchestration)
 * Version: v31.4
 */

console.log('[v31.4 MODULE] Loading v26-multiagents routes module...');

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { AgentRegistry } from '../agents/registry.js';
import { withApiKey, withRateLimit } from '../middleware/security.js';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';
import { HandoverValidator } from '../a2a/HandoverValidator.js';
import { FactCategory } from '../facts/types.js';
// v31.4: Clean LangGraph Orchestration (Single Path)
import { LangGraphOrchestratorV31 } from '../langgraph/LangGraphOrchestratorV31.js';
// v34.0: Universal Orchestration (Signal Protocol + Decision Engines)
import { LangGraphOrchestratorV34 } from '../langgraph/v34/LangGraphOrchestratorV34.js';

const router = Router();
const logger = createLogger('v26-multiagents');

/**
 * Initialize router with dependencies
 */
export function createV26MultiAgentsRouter(pool: Pool, agentRegistry: AgentRegistry): Router {
  console.log('[v31.4 FUNCTION] createV26MultiAgentsRouter() called!');

  // v34.0: Feature flag for universal orchestration
  const USE_V34_ORCHESTRATION = process.env.USE_V34_ORCHESTRATION === 'true';

  // Initialize orchestrator (v31.4 or v34.0 based on feature flag)
  let orchestrator: any = null;
  const orchestratorVersion = USE_V34_ORCHESTRATION ? 'v34.0' : 'v31.4';

  console.log(`[${orchestratorVersion} DEBUG] About to enter try block...`);
  try {
    console.log(`[${orchestratorVersion} DEBUG] Inside try block!`);
    const factStore = agentRegistry.getFactStore();
    console.log(`[${orchestratorVersion} DEBUG] Got factStore`);

    logger.event('router.init_start', {
      version: orchestratorVersion,
      redis_url: process.env.REDIS_URL ? 'present' : 'absent',
      feature_flag_v34: USE_V34_ORCHESTRATION
    });
    console.log(`[${orchestratorVersion} DEBUG] Logged init_start event`);

    if (USE_V34_ORCHESTRATION) {
      console.log('[v34.0 DEBUG] Creating LangGraphOrchestratorV34...');
      orchestrator = new LangGraphOrchestratorV34(
        pool,
        factStore,
        undefined // v34.0: Disable Redis for now - use stateless mode with database persistence
      );
      console.log('[v34.0 DEBUG] LangGraphOrchestratorV34 created successfully!');

      logger.event('v34.router.initialized', {
        orchestration: 'langgraph_v34.0',
        checkpointing: 'stateless',
        decision_engines: ['handover', 'delegation', 'escalation'],
        signal_protocol: 'universal',
        backward_compatible: true,
        agents: ['assessment-agent-v18', 'gameplan-agent-v18', 'execution-agent', 'awards-agent-v18', 'extracurriculars-agent-v18', 'scholarships-agent'],
        intelligence_types: '83_types_TYPE-001_through_TYPE-083'
      });
    } else {
      console.log('[v31.4 DEBUG] Creating LangGraphOrchestratorV31...');
      orchestrator = new LangGraphOrchestratorV31(
        pool,
        factStore,
        undefined // v31.4: Disable Redis for now - use stateless mode with database persistence
      );
      console.log('[v31.4 DEBUG] LangGraphOrchestratorV31 created successfully!');

      logger.event('v31.router.initialized', {
        orchestration: 'langgraph_v31.4',
        checkpointing: 'stateless',
        agents: ['assessment-agent-v18', 'gameplan-agent-v18', 'execution-agent', 'awards-agent-v18', 'extracurriculars-agent-v18', 'scholarships-agent'],
        intelligence_types: '83_types_TYPE-001_through_TYPE-083'
      });
    }

    console.log(`[${orchestratorVersion} DEBUG] Logged router.initialized event`);
  } catch (error) {
    console.log(`[${orchestratorVersion} DEBUG] CAUGHT ERROR:`, error);
    logger.error('router.init_failed', {
      version: orchestratorVersion,
      error: String(error),
      stack: error instanceof Error ? error.stack : 'no stack',
      message: error instanceof Error ? error.message : String(error)
    });
    throw error; // Re-throw to see the error in server logs
  }
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
    console.log('[MESSAGE_ROUTE] ========== REQUEST RECEIVED ==========');
    console.log('[MESSAGE_ROUTE] agentId:', req.params.agentId);
    console.log('[MESSAGE_ROUTE] body keys:', Object.keys(req.body || {}));

    try {
      const { agentId } = req.params;
      const { session_id, message, student_id } = req.body;

      console.log('[MESSAGE_ROUTE] Extracted params:', { agentId, session_id, student_id, message_length: message?.length });

      if (!session_id || !message || !student_id) {
        console.log('[MESSAGE_ROUTE] Missing required fields!');
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'session_id, message, and student_id are required',
        });
      }

      console.log('[MESSAGE_ROUTE] All required fields present');
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

      console.log(`[${orchestratorVersion}_MESSAGE] Using clone student ID from session:`, {
        session_id,
        clone_student_id: cloneStudentId,
        real_student_id_from_frontend: student_id,
        orchestration: orchestratorVersion
      });

      // Save user message
      const userMessageResult = await pool.query(
        `INSERT INTO multiagent_messages (
          session_id, agent_id, role, content
        ) VALUES ($1, $2, $3, $4) RETURNING id, timestamp`,
        [session_id, agentId, 'user', message]
      );

      const userMessage = userMessageResult.rows[0];

      // v31.4: Single orchestration path through LangGraph
      const startTime = Date.now();

      console.log(`[${orchestratorVersion}_ROUTE] About to call orchestrator.handleMessage:`, {
        orchestrator_version: orchestratorVersion,
        session_id,
        cloneStudentId,
        agentId,
        message_preview: message.substring(0, 50)
      });

      logger.event(`${orchestratorVersion}.orchestrator.invoke`, {
        session_id,
        student_id: cloneStudentId,
        agent_id: agentId,
        message_length: message.length
      });

      // ✅ Layer 3 Fix: Wrap orchestrator call in try-catch
      let result: any;

      try {
        result = await orchestrator.handleMessage({
          student_id: cloneStudentId,
          session_id,
          message
        });
      } catch (orchestratorError) {
        logger.error('router.orchestrator.failed', {
          session_id,
          error: String(orchestratorError),
          stack: orchestratorError instanceof Error ? orchestratorError.stack : undefined
        });

        return res.status(500).json({
          error: 'Orchestrator failed',
          message: orchestratorError instanceof Error ? orchestratorError.message : 'Unknown error'
        });
      }

      const processingTime = Date.now() - startTime;

      // ✅ Layer 3 Fix: Guard against undefined result (triple check)
      if (!result) {
        logger.error('router.orchestrator.returned_undefined', {
          session_id,
          use_v34: USE_V34_ORCHESTRATION
        });

        return res.status(500).json({
          error: 'Orchestrator returned no result',
          message: 'Internal error - orchestrator.handleMessage() returned undefined'
        });
      }

      // ✅ Layer 3 Fix: Debug log AFTER guard
      logger.event('router.orchestrator.result', {
        session_id,
        has_agent_response: !!result.agent_response,
        has_confidence: !!result.confidence,
        has_metadata: !!result.metadata,
        result_keys: Object.keys(result)
      });

      // ✅ Layer 3 Fix: Safe access with optional chaining
      const confidence = result.confidence ?? result.current_confidence ?? 0.0;
      const metadata = result.metadata ?? {};
      const intelligenceTriggered = result.intelligence_triggered ?? [];

      // v34.0: Convert orchestrator result to route response format
      // v34.0 returns FrontendOrchestratorResponse, v31.4 returns WorkflowState
      const isV34Response = result?.agent_response !== undefined;

      const agentResponse = isV34Response ? {
        // v34.0 format (FrontendOrchestratorResponse)
        response: result.agent_response,
        validation_score: result.confidence || 0.8,
        intelligence_triggered: result.intelligence_triggered || [],
        intelligence_results: [],
        // v34.0: a2a_handover at root level if present
        ...(result.a2a_handover ? { a2a_handover: result.a2a_handover } : {}),
        metadata: {
          ...result.metadata,
          orchestration: 'langgraph_v34.0',
          processing_time_ms: processingTime,
          // v34.0: Preserve collaboration events if present, otherwise create default
          collaboration_events: result.metadata?.collaboration_events || [
            {
              timestamp: new Date().toISOString(),
              event: 'orchestrator_invoke',
              message: '🚀 LangGraph v34.0 universal orchestration',
              details: { session_id, agent_id: agentId, decision_engines: ['handover', 'delegation', 'escalation'] }
            },
            {
              timestamp: new Date().toISOString(),
              event: 'workflow_complete',
              message: `✅ Workflow completed (${processingTime}ms)`,
              details: { duration_ms: processingTime, confidence: result.confidence || 0.8 }
            }
          ]
        },
        v26_context: {
          real_student_id: student_id,
          clone_student_id: cloneStudentId,
          is_clone_student: true,
          orchestration: 'langgraph_v34.0'
        }
      } : {
        // v31.4 format (WorkflowState)
        response: result.current_response,
        validation_score: result.current_confidence,
        intelligence_triggered: result.current_intelligence_triggered || [],
        intelligence_results: [],
        metadata: {
          ...result.current_metadata,
          orchestration: 'langgraph_v31.4',
          processing_time_ms: processingTime,
          state_management: 'database_persisted',
          data_collected_so_far: result.current_metadata?.data_collected_so_far,
          collaboration_events: [
            {
              timestamp: new Date().toISOString(),
              event: 'orchestrator_invoke',
              message: '🚀 LangGraph v31.4 orchestration',
              details: { session_id, agent_id: agentId }
            },
            {
              timestamp: new Date().toISOString(),
              event: 'state_loaded',
              message: '💾 Conversation history and facts loaded',
              details: {
                history_messages: result.conversation_history?.length || 0,
                facts_keys: Object.keys(result.collected_facts || {}).length
              }
            },
            {
              timestamp: new Date().toISOString(),
              event: 'agent_execution',
              message: `🤖 ${agentId} executed with full context`,
              details: { agent: result.agent_context?.current_agent }
            },
            {
              timestamp: new Date().toISOString(),
              event: 'intelligence_triggered',
              message: `🧠 ${result.current_intelligence_triggered?.length || 0} intelligence types activated`,
              details: { types: result.current_intelligence_triggered }
            },
            {
              timestamp: new Date().toISOString(),
              event: 'workflow_complete',
              message: `✅ Workflow completed (${processingTime}ms)`,
              details: { duration_ms: processingTime, confidence: result.current_confidence }
            }
          ]
        },
        v26_context: {
          real_student_id: student_id,
          clone_student_id: cloneStudentId,
          is_clone_student: true,
          orchestration: 'langgraph_v31.4'
        }
      };

      logger.event('orchestrator.success', {
        version: orchestratorVersion,
        session_id,
        duration_ms: processingTime,
        agent_used: isV34Response ? agentId : result.agent_context?.current_agent,
        confidence: isV34Response ? result.confidence : result.current_confidence,
        intelligence_count: agentResponse.intelligence_triggered?.length || 0,
        had_handover: isV34Response ? !!result.a2a_handover : false,
        had_delegation: isV34Response ? !!result.metadata?.delegation_started : false
      });

      // Log context
      logger.event('agent.response_context', {
        version: orchestratorVersion,
        agent_id: agentId,
        session_id,
        clone_student_id: cloneStudentId,
        real_student_id: student_id,
        intelligence_triggered_count: agentResponse.intelligence_triggered?.length || 0,
        metadata_keys: Object.keys(agentResponse.metadata || {}),
        has_data_collected: !!agentResponse.metadata?.data_collected_so_far,
        has_handover_data: !!agentResponse.a2a_handover
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

      // v29.0.2: Save collected facts to kb_items (Assessment Agent conversational extraction)
      console.log('[V29.0.2_DEBUG] Checking fact-saving conditions:', {
        agentId,
        is_assessment: agentId === 'assessment-agent-v18',
        has_metadata: !!agentResponse.metadata,
        metadata_keys: agentResponse.metadata ? Object.keys(agentResponse.metadata) : [],
        has_data_collected: !!agentResponse.metadata?.data_collected_so_far,
      });

      if (agentId === 'assessment-agent-v18' && agentResponse.metadata?.data_collected_so_far) {
        const collectedData = agentResponse.metadata.data_collected_so_far;

        console.log('[V29.0.2_FACT_SAVE] 💾 Saving conversational facts to kb_items...', {
          clone_student_id: cloneStudentId,
          fact_count: Object.keys(collectedData).length,
          fact_keys: Object.keys(collectedData)
        });

        // Import FactCategoryMapper to categorize facts
        const { FactCategoryMapper } = await import('../facts/FactCategoryMapper.js');

        // Map collected data to categories using FactCategoryMapper
        const categorizedFacts = FactCategoryMapper.mapToCategories(
          collectedData,
          cloneStudentId,
          'assessment-agent-v18',
          session_id
        );

        // Save each categorized fact to kb_items with v28.1 multi-category storage
        for (const [category, facts] of categorizedFacts.entries()) {
          for (const fact of facts) {
            const item_id = `${cloneStudentId}_${category.toLowerCase()}_conversational_v28`;

            // Build edges JSONB with fact data
            const edges: any = {};
            edges[fact.fact_type] = fact.value;
            edges.v28_metadata = {
              confidence: fact.confidence,
              quality_score: fact.quality_score,
              is_student_specific: fact.is_student_specific,
              extraction_method: fact.extraction_method,
              source_agent: fact.source_agent,
              source_session: fact.source_session,
              created_at: fact.created_at
            };

            try {
              const result = await pool.query(
                `INSERT INTO kb_items (item_id, student_id, item_type, subtype, title_name, tier1_state, source_ref, confidence, edges)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 ON CONFLICT (item_id) DO UPDATE SET
                   edges = kb_items.edges || EXCLUDED.edges,
                   updated_ts = NOW()`,
                [
                  item_id,
                  cloneStudentId,
                  category, // item_type = FactCategory
                  fact.fact_type,
                  `Conversational Assessment - ${category}`,
                  'In Transit',
                  'gpt4o_conversational_extraction_v28',
                  'medium',
                  JSON.stringify(edges)
                ]
              );
              console.log('[V29.0.2_FACT_SAVE] ✅ INSERT successful:', {
                item_id,
                category,
                fact_type: fact.fact_type,
                rows_affected: result.rowCount
              });
            } catch (error: any) {
              console.error('[V29.0.2_FACT_SAVE] ❌ INSERT FAILED:', {
                item_id,
                category,
                fact_type: fact.fact_type,
                error: error.message,
                code: error.code
              });
            }
          }
        }

        console.log('[V29.0.2_FACT_SAVE] ✅ Facts saved to kb_items:', {
          categories_saved: categorizedFacts.size,
          total_facts: Array.from(categorizedFacts.values()).reduce((sum, facts) => sum + facts.length, 0)
        });
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

      // v29.0.4: Declare handover variables outside block scope for response
      let available_facts: Map<any, any[]> = new Map();
      let handoverValidation: any = null;

      if (a2a_handover_complete && handover_id && new_agent_id) {
        console.log('[V26_A2A] 🔄 A2A Handover detected!', {
          handover_id,
          from_agent: agentId,
          to_agent: new_agent_id,
          session_id
        });

        // v29.0: Load available facts from kb_items for handover validation
        // Note: kb_items stores category in item_type field, facts in edges JSONB
        console.log('[V29.0_HANDOVER] 📊 Loading facts for handover validation...');
        const factsResult = await pool.query(
          `SELECT item_type, subtype, edges, confidence, created_ts
           FROM kb_items
           WHERE student_id = $1
             AND source_ref = $2
           ORDER BY created_ts DESC`,
          [cloneStudentId, 'gpt4o_conversational_extraction_v28']
        );

        // Group facts by category (item_type = FactCategory)
        // v28.1: Facts stored in edges JSONB, extract using FactCategoryMapper
        const { FactCategoryMapper } = await import('../facts/FactCategoryMapper.js');
        available_facts = FactCategoryMapper.extractFactsFromKbItems(factsResult.rows);

        console.log('[V29.0_HANDOVER] 📋 Facts loaded by category:', {
          categories: Array.from(available_facts.keys()),
          total_facts: factsResult.rows.length,
          breakdown: Array.from(available_facts.entries()).map(([cat, facts]) => ({
            category: cat,
            count: facts.length
          }))
        });

        // v28.5: Validate handover readiness with HandoverValidator
        console.log('[V28.5_HANDOVER] 🔍 Validating handover with 20 quality gates...');
        handoverValidation = await HandoverValidator.validateHandover(
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

        // TODO v31.4 Phase 2: Implement handover through orchestrator's check_handover node
        // For now, handover is detected but not auto-triggered
        // The orchestrator will handle this in the next message when user continues conversation
        console.log('[V31.4_HANDOVER] 🚧 Handover detected - will be triggered on next message', {
          from_agent: agentId,
          to_agent: new_agent_id,
          validation_score: handoverValidation.quality_score
        });

        // Store handover metadata for next turn
        agentResponse.metadata = {
          ...agentResponse.metadata,
          handover_pending: true,
          handover_to: new_agent_id,
          handover_validation: {
            quality_score: handoverValidation.quality_score,
            quality_gates_passed: handoverValidation.quality_gates_passed,
            quality_gates_total: handoverValidation.quality_gates_total,
            is_ready: handoverValidation.is_ready,
            recommendation: handoverValidation.recommendation,
          }
        };
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

      const responsePayload = {
        user_message_id: userMessage.id,
        agent_message_id: agentMessage.id,
        agent_response: agentResponse.response,
        processing_time: processingTime,
        confidence: agentResponse.validation_score,
        intelligence_triggered: (agentResponse as any).intelligence_triggered || [],
        metadata: agentResponse.metadata,
        // v28.0: A2A Handover information (v29.0.4: Include available_facts and validation)
        a2a_handover: a2a_handover_complete ? {
          handover_complete: true,
          handover_id,
          from_agent: agentId,
          to_agent: new_agent_id,
          new_phase: phaseMap[new_agent_id] || sessionResult.rows[0].current_phase,
          // v29.0.4: Include available facts loaded from database
          available_facts: Array.from(available_facts.entries()).map(([category, facts]) => ({
            category,
            facts: facts.map(f => ({
              fact_type: f.fact_type,
              value: f.value,
              confidence: f.confidence,
              quality_score: f.quality_score
            }))
          })),
          // v29.0.4: Include validation results from HandoverValidator
          handover_validation: handoverValidation ? {
            is_ready: handoverValidation.is_ready,
            quality_score: handoverValidation.quality_score,
            quality_gates_passed: handoverValidation.quality_gates_passed,
            quality_gates_total: handoverValidation.quality_gates_total,
            quality_gates_pass_rate: handoverValidation.quality_gates_pass_rate,
            missing_mandatory_facts: handoverValidation.missing_mandatory_facts,
            recommendation: handoverValidation.recommendation,
            rushed_handover_indicators: handoverValidation.rushed_handover_indicators,
            student_specific_count: handoverValidation.student_specific_count,
            longitudinal_fact_count: handoverValidation.longitudinal_fact_count
          } : null
        } : null,
        // v26 Context: Real vs Clone Student IDs for intelligence tracing
        v26_context: {
          real_student_id: student_id,
          clone_student_id: agentResponse.v26_context?.clone_student_id || `${student_id}-v26-clone`,
          is_clone_student: true,
        },
      };

      return res.status(200).json(responsePayload);
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

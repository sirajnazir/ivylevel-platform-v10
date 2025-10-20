/**
 * ConversationRepository.ts
 * Repository for persisting and retrieving conversation history
 * Created: 2025-10-16 (Week 10)
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import type {
  IvyLevelSession,
  AgentResponse,
  AgentExecutionResult,
} from '../core/types.js';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('conversation-repository');

// ==============================================================================
// Type Definitions
// ==============================================================================

export interface ConversationSession {
  session_id: string;
  student_id: string;
  started_at: Date;
  last_active: Date;
  ended_at?: Date;
  turn_count: number;
  total_tokens: number;
  total_cost_usd: number;
  student_context: any;
  tags?: string[];
  category?: string;
  resolution_status?: 'active' | 'resolved' | 'abandoned' | 'escalated';
  satisfaction_rating?: number;
}

export interface ConversationTurn {
  turn_id: string;
  session_id: string;
  turn_number: number;
  turn_timestamp: Date;
  user_message: string;
  user_intent?: string;
  agent_id: string;
  agent_name: string;
  agent_response: string;
  response_chips: any[];
  response_hits: any[];
  handoff_suggested: boolean;
  handoff_to_agent?: string;
  handoff_reason?: string;
  handoff_executed: boolean;
  tools_called: string[];
  tool_results: any[];
  execution_time_ms: number;
  tokens_used: number;
  model_used?: string;
  error_occurred: boolean;
  error_message?: string;
}

export interface AgentHandoff {
  handoff_id: string;
  session_id: string;
  turn_id: string;
  from_agent_id: string;
  to_agent_id: string;
  handoff_reason: string;
  suggested_at: Date;
  executed_at?: Date;
  user_accepted?: boolean;
  context_transferred: any;
}

export interface ConversationReplay {
  session: ConversationSession;
  turns: ConversationTurn[];
  handoffs: AgentHandoff[];
}

// ==============================================================================
// ConversationRepository Class
// ==============================================================================

export class ConversationRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Create a new conversation session
   */
  async createSession(
    sessionId: string,
    studentId: string,
    studentContext: any,
    category?: string,
    coachId: string = 'jenny'
  ): Promise<ConversationSession> {
    const query = `
      INSERT INTO agent_conversation_sessions (
        session_id,
        student_id,
        student_context,
        category,
        resolution_status,
        coach_id,
        started_at,
        last_active_at
      )
      VALUES ($1, $2, $3, $4, 'active', $5, NOW(), NOW())
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      sessionId,
      studentId,
      JSON.stringify(studentContext),
      category,
      coachId,
    ]);

    log.event('conversation.session_created', {
      session_id: sessionId,
      student_id: studentId,
      category,
      coach_id: coachId,
    });

    return result.rows[0];
  }

  /**
   * Record a conversation turn
   */
  async recordTurn(
    session: IvyLevelSession,
    userMessage: string,
    result: AgentExecutionResult,
    agentManifest: any,
    coachId: string = 'jenny'
  ): Promise<ConversationTurn> {
    const turnId = `turn_${uuidv4()}`;
    const turnNumber = session.turn_count;

    const query = `
      INSERT INTO agent_conversation_turns (
        turn_id,
        session_id,
        turn_number,
        turn_timestamp,
        user_message,
        agent_id,
        agent_name,
        agent_response,
        response_chips,
        response_hits,
        handoff_suggested,
        handoff_to_agent,
        handoff_reason,
        handoff_executed,
        tools_called,
        tool_results,
        execution_time_ms,
        tokens_used,
        model_used,
        error_occurred,
        error_message,
        coach_id
      )
      VALUES (
        $1, $2, $3, NOW(), $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      )
      RETURNING *
    `;

    const handoffSuggested = !!result.response.handoff;
    const toolsCalled = result.response.debug?.tools_called || [];

    const values = [
      turnId,
      session.session_id,
      turnNumber,
      userMessage,
      agentManifest.agent_id,
      agentManifest.display_name,
      result.response.answer,
      JSON.stringify(result.response.chips || []),
      JSON.stringify(result.response.hits || []),
      handoffSuggested,
      result.response.handoff?.to_agent,
      result.response.handoff?.reason,
      false,  // handoff_executed (updated later if user accepts)
      toolsCalled,
      JSON.stringify([]),  // tool_results (can be populated from debug if available)
      result.execution_time_ms,
      result.tokens_used,
      result.response.debug?.model,
      false,  // error_occurred
      null,   // error_message
      coachId,
    ];

    const turnResult = await this.pool.query(query, values);

    log.event('conversation.turn_recorded', {
      turn_id: turnId,
      session_id: session.session_id,
      turn_number: turnNumber,
      agent_id: agentManifest.agent_id,
      handoff_suggested: handoffSuggested,
    });

    // If handoff was suggested, record it in handoffs table
    if (handoffSuggested && result.response.handoff) {
      await this.recordHandoffSuggestion(
        session.session_id,
        turnId,
        agentManifest.agent_id,
        result.response.handoff.to_agent,
        result.response.handoff.reason
      );
    }

    return turnResult.rows[0];
  }

  /**
   * Record a handoff suggestion
   */
  async recordHandoffSuggestion(
    sessionId: string,
    turnId: string,
    fromAgentId: string,
    toAgentId: string,
    reason: string
  ): Promise<AgentHandoff> {
    const handoffId = `handoff_${uuidv4()}`;

    const query = `
      INSERT INTO agent_handoffs (
        handoff_id,
        session_id,
        turn_id,
        from_agent_id,
        to_agent_id,
        handoff_reason,
        suggested_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      handoffId,
      sessionId,
      turnId,
      fromAgentId,
      toAgentId,
      reason,
    ]);

    log.event('conversation.handoff_suggested', {
      handoff_id: handoffId,
      session_id: sessionId,
      from_agent: fromAgentId,
      to_agent: toAgentId,
    });

    return result.rows[0];
  }

  /**
   * Mark handoff as executed
   */
  async markHandoffExecuted(
    sessionId: string,
    fromAgentId: string,
    toAgentId: string,
    userAccepted: boolean = true
  ): Promise<void> {
    // Find the most recent handoff suggestion for this agent pair in this session
    const query = `
      UPDATE agent_handoffs
      SET
        executed_at = NOW(),
        user_accepted = $4
      WHERE handoff_id = (
        SELECT handoff_id
        FROM agent_handoffs
        WHERE session_id = $1
          AND from_agent_id = $2
          AND to_agent_id = $3
          AND executed_at IS NULL
        ORDER BY suggested_at DESC
        LIMIT 1
      )
    `;

    await this.pool.query(query, [sessionId, fromAgentId, toAgentId, userAccepted]);

    // Also update the corresponding turn
    const turnUpdateQuery = `
      UPDATE agent_conversation_turns
      SET handoff_executed = TRUE
      WHERE turn_id = (
        SELECT turn_id
        FROM agent_handoffs
        WHERE session_id = $1
          AND from_agent_id = $2
          AND to_agent_id = $3
        ORDER BY suggested_at DESC
        LIMIT 1
      )
    `;

    await this.pool.query(turnUpdateQuery, [sessionId, fromAgentId, toAgentId]);

    log.event('conversation.handoff_executed', {
      session_id: sessionId,
      from_agent: fromAgentId,
      to_agent: toAgentId,
      user_accepted: userAccepted,
    });
  }

  /**
   * Update session status
   */
  async updateSessionStatus(
    sessionId: string,
    status: 'active' | 'resolved' | 'abandoned' | 'escalated'
  ): Promise<void> {
    const query = `
      UPDATE agent_conversation_sessions
      SET
        resolution_status = $2,
        ended_at = CASE WHEN $2 != 'active' THEN NOW() ELSE ended_at END,
        updated_at = NOW()
      WHERE session_id = $1
    `;

    await this.pool.query(query, [sessionId, status]);

    log.event('conversation.status_updated', {
      session_id: sessionId,
      status,
    });
  }

  /**
   * Add satisfaction rating
   */
  async addSatisfactionRating(sessionId: string, rating: number): Promise<void> {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const query = `
      UPDATE agent_conversation_sessions
      SET
        satisfaction_rating = $2,
        updated_at = NOW()
      WHERE session_id = $1
    `;

    await this.pool.query(query, [sessionId, rating]);

    log.event('conversation.rating_added', {
      session_id: sessionId,
      rating,
    });
  }

  /**
   * Get conversation session by ID
   */
  async getSession(sessionId: string): Promise<ConversationSession | null> {
    const query = `
      SELECT * FROM agent_conversation_sessions
      WHERE session_id = $1
    `;

    const result = await this.pool.query(query, [sessionId]);

    return result.rows[0] || null;
  }

  /**
   * Get all turns for a session
   */
  async getSessionTurns(sessionId: string): Promise<ConversationTurn[]> {
    const query = `
      SELECT * FROM agent_conversation_turns
      WHERE session_id = $1
      ORDER BY turn_number ASC
    `;

    const result = await this.pool.query(query, [sessionId]);

    return result.rows;
  }

  /**
   * Get full conversation replay using database function
   */
  async getConversationReplay(sessionId: string): Promise<ConversationReplay | null> {
    const query = `SELECT get_conversation_replay($1) AS replay`;

    const result = await this.pool.query(query, [sessionId]);

    if (!result.rows[0]?.replay) {
      return null;
    }

    const replay = result.rows[0].replay;

    return {
      session: replay.session,
      turns: replay.turns || [],
      handoffs: replay.handoffs || [],
    };
  }

  /**
   * Get recent sessions for a student
   */
  async getStudentSessions(
    studentId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<ConversationSession[]> {
    const query = `
      SELECT * FROM agent_conversation_sessions
      WHERE student_id = $1
      ORDER BY started_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await this.pool.query(query, [studentId, limit, offset]);

    return result.rows;
  }

  /**
   * Get conversation analytics
   */
  async getConversationAnalytics(sessionId: string): Promise<any> {
    const query = `
      SELECT * FROM v_conversation_analytics
      WHERE session_id = $1
    `;

    const result = await this.pool.query(query, [sessionId]);

    return result.rows[0] || null;
  }

  /**
   * Get agent performance metrics
   */
  async getAgentPerformanceMetrics(): Promise<any[]> {
    const query = `
      SELECT * FROM v_agent_performance
      ORDER BY total_turns DESC
    `;

    const result = await this.pool.query(query);

    return result.rows;
  }

  /**
   * Search conversations by query
   */
  async searchConversations(
    filters: {
      studentId?: string;
      agentId?: string;
      category?: string;
      status?: string;
      startDate?: Date;
      endDate?: Date;
    },
    limit: number = 20,
    offset: number = 0
  ): Promise<ConversationSession[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (filters.studentId) {
      conditions.push(`student_id = $${paramCount++}`);
      params.push(filters.studentId);
    }

    if (filters.category) {
      conditions.push(`category = $${paramCount++}`);
      params.push(filters.category);
    }

    if (filters.status) {
      conditions.push(`resolution_status = $${paramCount++}`);
      params.push(filters.status);
    }

    if (filters.startDate) {
      conditions.push(`started_at >= $${paramCount++}`);
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      conditions.push(`started_at <= $${paramCount++}`);
      params.push(filters.endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT * FROM agent_conversation_sessions
      ${whereClause}
      ORDER BY started_at DESC
      LIMIT $${paramCount++} OFFSET $${paramCount}
    `;

    params.push(limit, offset);

    const result = await this.pool.query(query, params);

    return result.rows;
  }
}

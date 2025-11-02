/**
 * V26AgentWrapper - Real Agent Integration for Clone Students
 *
 * Purpose: Use REAL agents (AssessmentAgentV3, GamePlanAgent, etc.) with REAL
 * intelligence types, but for clone students with empty fact tables.
 *
 * Architecture:
 * - Maps real student_id (huda-2025) to clone student_id (huda-v26-2025)
 * - Calls real agents with clone student_id
 * - Retrieves conversation history from multiagent_messages table
 * - Returns real intelligence activation results
 * - Logs detailed intent classification and processing steps
 *
 * Created: 2025-11-02
 * Version: v26.2 - Real Agent Integration
 */

import { Pool } from 'pg';
import { AgentRegistry } from './registry.js';
import { AgentQuery, AgentResponse } from '../facts/types.js';
import { IntelligenceAgentResponse } from './v18/BaseAgentWithIntelligence.js';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const logger = createLogger('v26-agent-wrapper-real');

/**
 * Student ID mapping: real student → clone student
 */
const V26_STUDENT_MAPPING: Record<string, string> = {
  'huda-2025': 'huda-v26-2025',
};

/**
 * Conversation message from database
 */
interface ConversationMessage {
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
  agent_id?: string;
}

/**
 * V26 Agent response with detailed logging metadata
 */
interface V26AgentResponse {
  response: string;
  agent_id: string;
  intelligence_triggered: string[];
  intelligence_results?: any[];
  facts_used: any[];
  validation_score?: number;
  metadata?: any;
  v26_context: {
    is_clone_student: true;
    clone_student_id: string;
    real_student_id: string;
    conversation_turns: number;
    intent_classification: string;
    processing_steps: string[];
  };
}

/**
 * V26AgentWrapperReal - Uses REAL agents with clone student data
 */
export class V26AgentWrapperReal {
  private agentRegistry: AgentRegistry;
  private pool: Pool;

  constructor(agentRegistry: AgentRegistry, pool: Pool) {
    this.agentRegistry = agentRegistry;
    this.pool = pool;
  }

  /**
   * Handle query using REAL agents with clone student context
   */
  async handleQuery(params: {
    agent_id: string;
    student_id: string;
    session_id: string;
    message: string;
  }): Promise<V26AgentResponse> {
    const { agent_id, student_id, session_id, message } = params;

    // Map real student to clone student
    const cloneStudentId = V26_STUDENT_MAPPING[student_id] || `${student_id}-v26-clone`;

    logger.event('v26_wrapper.handle_query_start', {
      agent_id,
      real_student_id: student_id,
      clone_student_id: cloneStudentId,
      session_id,
      message_preview: message.slice(0, 100),
    });

    // STEP 1: Retrieve conversation history
    const conversationHistory = await this.getConversationHistory(session_id);
    logger.event('v26_wrapper.conversation_history_loaded', {
      session_id,
      message_count: conversationHistory.length,
    });

    // STEP 2: Classify intent
    const intent = this.classifyIntent(message, conversationHistory);
    logger.event('v26_wrapper.intent_classified', {
      intent,
      message: message.slice(0, 50),
      conversation_context: conversationHistory.length > 0 ? 'existing' : 'new',
    });

    // STEP 3: Route to appropriate real agent
    let agentResponse: IntelligenceAgentResponse | AgentResponse;
    let processingSteps: string[] = [];

    if (agent_id.includes('assessment')) {
      processingSteps.push('Routing to AssessmentAgentV3 (TYPE-080, 081, 082, 083)');
      agentResponse = await this.callAssessmentAgentV3(
        cloneStudentId,
        session_id,
        message,
        conversationHistory,
        intent
      );
    } else if (agent_id.includes('gameplan')) {
      processingSteps.push('Routing to GamePlanAgent (TYPE-001 through TYPE-007)');
      agentResponse = await this.callGamePlanAgent(
        cloneStudentId,
        session_id,
        message,
        conversationHistory
      );
    } else if (agent_id.includes('execution')) {
      processingSteps.push('Routing to ExecutionAgent (TYPE-049 through TYPE-063)');
      agentResponse = await this.callExecutionAgent(
        cloneStudentId,
        session_id,
        message,
        conversationHistory
      );
    } else if (agent_id.includes('awards')) {
      processingSteps.push('Routing to AwardsAgent (TYPE-020, TYPE-023, TYPE-027)');
      agentResponse = await this.callAwardsAgent(
        cloneStudentId,
        session_id,
        message
      );
    } else if (agent_id.includes('programs')) {
      processingSteps.push('Routing to SummerProgramsAgent (TYPE-028, 029, 030)');
      agentResponse = await this.callSummerProgramsAgent(
        cloneStudentId,
        session_id,
        message
      );
    } else if (agent_id.includes('scholarships')) {
      processingSteps.push('Routing to ScholarshipsAgent (TYPE-031, 032, 033)');
      agentResponse = await this.callScholarshipsAgent(
        cloneStudentId,
        session_id,
        message
      );
    } else {
      throw new Error(`Unknown agent: ${agent_id}`);
    }

    // STEP 4: Return response with v26 context
    // Extract intelligence data if available (from IntelligenceAgentResponse)
    const intelligenceResponse = agentResponse as IntelligenceAgentResponse;
    const triggered = intelligenceResponse.triggered_intelligence || [];
    const results = intelligenceResponse.intelligence_results || [];

    const v26Response: V26AgentResponse = {
      response: agentResponse.response,
      agent_id,
      intelligence_triggered: triggered,
      intelligence_results: results,
      facts_used: agentResponse.facts_used || [],
      validation_score: agentResponse.validation_score,
      metadata: agentResponse.metadata,
      v26_context: {
        is_clone_student: true,
        clone_student_id: cloneStudentId,
        real_student_id: student_id,
        conversation_turns: conversationHistory.length,
        intent_classification: intent,
        processing_steps: processingSteps,
      },
    };

    logger.event('v26_wrapper.response_generated', {
      agent_id,
      intelligence_triggered_count: v26Response.intelligence_triggered.length,
      response_length: v26Response.response.length,
      intent,
    });

    return v26Response;
  }

  /**
   * Retrieve conversation history from database
   */
  private async getConversationHistory(session_id: string): Promise<ConversationMessage[]> {
    const result = await this.pool.query(
      `SELECT role, content, timestamp, agent_id
       FROM multiagent_messages
       WHERE session_id = $1
       ORDER BY timestamp ASC`,
      [session_id]
    );

    return result.rows.map((row) => ({
      role: row.role,
      content: row.content,
      timestamp: row.timestamp,
      agent_id: row.agent_id,
    }));
  }

  /**
   * Classify user intent based on message and conversation history
   */
  private classifyIntent(
    message: string,
    conversationHistory: ConversationMessage[]
  ): string {
    const lowerMessage = message.toLowerCase();

    // NEW conversation (first message after welcome)
    if (conversationHistory.length <= 1) {
      if (lowerMessage.match(/\d+(th|st|nd|rd)|grade|year/)) {
        return 'academic_foundation_start';
      }
      return 'assessment_start';
    }

    // Get last agent message to understand context
    const lastAgentMessage = conversationHistory
      .filter((m) => m.role === 'agent')
      .pop();

    // User is answering a question
    if (lastAgentMessage?.content.includes('?')) {
      if (lastAgentMessage.content.match(/grade|gpa|sat|act|ap/i)) {
        return 'academic_data_response';
      }
      if (lastAgentMessage.content.match(/extracurricular|activities|leadership/i)) {
        return 'extracurricular_data_response';
      }
      if (lastAgentMessage.content.match(/background|challenges|story/i)) {
        return 'narrative_data_response';
      }
      if (lastAgentMessage.content.match(/goals|colleges|major/i)) {
        return 'goals_data_response';
      }
      return 'question_response';
    }

    // User is asking for status/progress
    if (lowerMessage.match(/progress|status|where|phase/)) {
      return 'assessment_status_check';
    }

    // User is asking for score/results
    if (lowerMessage.match(/score|results|analysis|ivyscore/)) {
      return 'assessment_results_request';
    }

    // Default
    return 'general_query';
  }

  /**
   * Call real AssessmentAgentV3 with intelligence types
   */
  private async callAssessmentAgentV3(
    studentId: string,
    sessionId: string,
    message: string,
    conversationHistory: ConversationMessage[],
    intent: string
  ): Promise<AgentResponse> {
    const agent = this.agentRegistry.getAssessmentAgentV3();

    logger.event('v26_wrapper.calling_assessment_agent_v3', {
      student_id: studentId,
      session_id: sessionId,
      intent,
      message_preview: message.slice(0, 50),
      conversation_turns: conversationHistory.length,
    });

    // Build conversation context for agent
    const conversationContext = this.buildConversationContext(conversationHistory);

    // Call real agent
    const query: AgentQuery = {
      entity_id: studentId,
      query: message,
      session_id: sessionId,
      metadata: {
        conversation_history: conversationContext,
        intent_classification: intent,
        is_clone_student: true,
      },
    };

    const response = await agent.handleQuery(query) as IntelligenceAgentResponse;

    logger.event('v26_wrapper.assessment_agent_v3_response', {
      triggered_intelligence: response.triggered_intelligence || [],
      intelligence_results_count: response.intelligence_results?.length || 0,
      facts_used_count: response.facts_used?.length || 0,
      confidence: response.validation_score,
    });

    return response;
  }

  /**
   * Call real GamePlanAgent
   */
  private async callGamePlanAgent(
    studentId: string,
    sessionId: string,
    message: string,
    conversationHistory: ConversationMessage[]
  ): Promise<AgentResponse> {
    const agent = this.agentRegistry.getGamePlanAgent();

    const query: AgentQuery = {
      entity_id: studentId,
      query: message,
      session_id: sessionId,
      metadata: {
        conversation_history: this.buildConversationContext(conversationHistory),
      },
    };

    return await agent.handleQuery(query);
  }

  /**
   * Call real ExecutionAgent
   */
  private async callExecutionAgent(
    studentId: string,
    sessionId: string,
    message: string,
    conversationHistory: ConversationMessage[]
  ): Promise<AgentResponse> {
    const agent = this.agentRegistry.getExecutionAgent();

    const query: AgentQuery = {
      entity_id: studentId,
      query: message,
      session_id: sessionId,
      metadata: {
        conversation_history: this.buildConversationContext(conversationHistory),
      },
    };

    return await agent.handleQuery(query);
  }

  /**
   * Call real AwardsAgent
   */
  private async callAwardsAgent(
    studentId: string,
    sessionId: string,
    message: string
  ): Promise<AgentResponse> {
    const agent = this.agentRegistry.getAwardsAgent();

    const query: AgentQuery = {
      entity_id: studentId,
      query: message,
      session_id: sessionId,
    };

    return await agent.handleQuery(query);
  }

  /**
   * Call real SummerProgramsAgent
   */
  private async callSummerProgramsAgent(
    studentId: string,
    sessionId: string,
    message: string
  ): Promise<AgentResponse> {
    const agent = this.agentRegistry.getSummerProgramsAgent();

    const query: AgentQuery = {
      entity_id: studentId,
      query: message,
      session_id: sessionId,
    };

    return await agent.handleQuery(query);
  }

  /**
   * Call real ScholarshipsAgent
   */
  private async callScholarshipsAgent(
    studentId: string,
    sessionId: string,
    message: string
  ): Promise<AgentResponse> {
    const agent = this.agentRegistry.getScholarshipsAgent();

    const query: AgentQuery = {
      entity_id: studentId,
      query: message,
      session_id: sessionId,
    };

    return await agent.handleQuery(query);
  }

  /**
   * Build conversation context string from history
   */
  private buildConversationContext(history: ConversationMessage[]): string {
    if (history.length === 0) return '';

    return history
      .map((msg) => {
        const role = msg.role === 'user' ? 'Student' : 'Agent';
        return `${role}: ${msg.content}`;
      })
      .join('\n\n');
  }
}

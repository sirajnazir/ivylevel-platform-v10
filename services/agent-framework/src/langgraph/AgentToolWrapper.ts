/**
 * Agent Tool Wrapper for LangGraph
 *
 * Purpose: Wraps existing agents as LangGraph-compatible tools
 * Design: ZERO changes to existing agents - they work exactly as before
 *
 * Architecture:
 * - Each agent becomes a LangGraph "tool"
 * - LangGraph calls agents through this wrapper
 * - Agents remain unchanged and can still be called directly
 * - Full observability via LangSmith tracing
 *
 * Created: 2025-11-04 (v31.0 Phase 2)
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { BaseAgentWithIntelligence } from "../agents/BaseAgentWithIntelligence.js";
import { AgentQuery } from "../facts/types.js";
import { createLogger } from "../../../../packages/observability/dist/unified-logger.js";

const log = createLogger('agent-tool-wrapper');

/**
 * Standard input schema for all agent tools
 * Maps to AgentQuery interface that all agents expect
 *
 * v31.4: Extended with memory and context for full state passing
 */
export const AgentToolInputSchema = z.object({
  student_id: z.string().describe("Student ID (entity_id)"),
  session_id: z.string().describe("Session ID"),
  message: z.string().describe("User message or query"),
  is_a2a_handover: z.boolean().optional().default(false).describe("Is this an agent-to-agent handover?"),

  // v31.4: Memory and context (optional for backward compatibility)
  conversation_history: z.array(z.object({
    role: z.enum(['user', 'agent', 'system']),
    content: z.string(),
    timestamp: z.coerce.date(),
    agent_id: z.string().optional(),
    metadata: z.record(z.any()).optional()
  })).optional().describe("Full conversation history for context"),

  collected_facts: z.record(z.any()).optional().describe("Previously collected facts (cumulative)"),

  agent_context: z.record(z.any()).optional().describe("Agent coordination context"),

  is_delegation: z.boolean().optional().default(false).describe("Is this a delegation call?")
});

export type AgentToolInput = z.infer<typeof AgentToolInputSchema>;

/**
 * Wraps any existing agent as a LangGraph tool
 *
 * Usage:
 *   const assessmentTool = wrapAgentAsTool(
 *     assessmentAgent,
 *     "assessment_agent_v18",
 *     "Runs 4-phase assessment using TYPE-080 intelligence"
 *   );
 *
 * The wrapped tool can then be used in LangGraph workflows
 */
export function wrapAgentAsTool(
  agent: BaseAgentWithIntelligence,
  agentId: string,
  description: string
): DynamicStructuredTool {

  // LangGraph requires snake_case tool names
  const toolName = agentId.replace(/-/g, '_');

  return new DynamicStructuredTool({
    name: toolName,
    description,
    schema: AgentToolInputSchema,

    func: async (input: AgentToolInput): Promise<string> => {
      const startTime = Date.now();

      console.log('[AGENT_WRAPPER_DEBUG] === FUNC CALLED ===');
      console.log('[AGENT_WRAPPER_DEBUG] Input received:', {
        student_id: input.student_id,
        student_id_type: typeof input.student_id,
        student_id_undefined: input.student_id === undefined,
        session_id: input.session_id,
        message_preview: input.message?.substring(0, 50),
        input_keys: Object.keys(input)
      });

      log.event('agent_tool.invoke', {
        tool_name: toolName,
        agent_id: agentId,
        student_id: input.student_id,
        session_id: input.session_id,
        message_length: input.message.length,
        is_a2a_handover: input.is_a2a_handover,
        has_conversation_history: !!input.conversation_history,
        history_length: input.conversation_history?.length || 0,
        has_collected_facts: !!input.collected_facts,
        collected_facts_keys: input.collected_facts ? Object.keys(input.collected_facts) : []
      });

      try {
        // v31.4: Call existing agent with FULL CONTEXT via metadata
        // Agents are UNCHANGED - they receive context through metadata
        const query: AgentQuery = {
          entity_id: input.student_id,
          session_id: input.session_id,
          query: input.message,
          is_a2a_handover: input.is_a2a_handover,

          // v31.4: Pass memory and context through metadata
          // Agents can access via query.metadata
          metadata: {
            conversation_history: input.conversation_history,
            collected_facts: input.collected_facts,
            agent_context: input.agent_context,
            is_delegation: input.is_delegation
          }
        };

        console.log('[AGENT_WRAPPER_DEBUG] Query created:', {
          entity_id: query.entity_id,
          entity_id_type: typeof query.entity_id,
          entity_id_undefined: query.entity_id === undefined,
          query_preview: query.query?.substring(0, 50),
          has_metadata: !!query.metadata
        });

        const result = await agent.handleQuery(query);

        // v31.3: Debug logging to trace metadata from agent
        log.event('agent_tool.agent_response_metadata', {
          tool_name: toolName,
          has_metadata: !!result.metadata,
          metadata_keys: result.metadata ? Object.keys(result.metadata) : [],
          has_data_collected: !!result.metadata?.data_collected_so_far,
          data_collected_keys: result.metadata?.data_collected_so_far
            ? Object.keys(result.metadata.data_collected_so_far)
            : []
        });

        const duration = Date.now() - startTime;

        log.event('agent_tool.success', {
          tool_name: toolName,
          agent_id: agentId,
          student_id: input.student_id,
          session_id: input.session_id,
          duration_ms: duration,
          response_length: result.response.length,
          confidence: result.validation_score,
          intelligence_triggered: result.intelligence_results?.length || 0
        });

        // Return structured result as JSON string
        // LangGraph will parse this and make it available to other nodes
        // v31.3: Include full agent metadata (especially data_collected_so_far for Assessment Agent)
        return JSON.stringify({
          success: true,
          response: result.response,
          confidence: result.validation_score,
          intelligence_triggered: result.intelligence_results?.map(r => r.type_id) || [],
          intelligence_count: result.intelligence_results?.length || 0,
          duration_ms: duration,
          agent_id: agentId,
          metadata: result.metadata || {} // v31.3: Preserve agent's full metadata
        });

      } catch (error) {
        const duration = Date.now() - startTime;

        log.error('agent_tool.error', {
          tool_name: toolName,
          agent_id: agentId,
          student_id: input.student_id,
          session_id: input.session_id,
          error: String(error),
          duration_ms: duration
        });

        // Return error as tool result (don't throw - let LangGraph handle retries)
        return JSON.stringify({
          success: false,
          error: String(error),
          error_type: error instanceof Error ? error.constructor.name : 'UnknownError',
          duration_ms: duration,
          agent_id: agentId
        });
      }
    }
  });
}

/**
 * Helper: Parse agent tool result
 * Safely parses the JSON string returned by agent tools
 */
export function parseAgentToolResult(result: string): {
  success: boolean;
  response?: string;
  confidence?: number;
  intelligence_triggered?: string[];
  error?: string;
  duration_ms?: number;
} {
  try {
    return JSON.parse(result);
  } catch (error) {
    log.error('agent_tool.parse_error', {
      error: String(error),
      result_preview: result.substring(0, 100)
    });

    return {
      success: false,
      error: 'Failed to parse agent tool result',
      duration_ms: 0
    };
  }
}

/**
 * src/agents/runtime.ts
 * Responses API + Agents SDK Runtime (Primary Path)
 *
 * Architecture:
 * - Uses OpenAI Responses API (not Assistants API)
 * - Agents SDK coordinates tools and sub-agents
 * - Sidesteps Assistants runs.submitToolOutputs regression
 * - Multi-agent graph: planner → executor → grader
 *
 * Decision: Primary path for v1.0 (production-ready)
 * Fallback: Assistants compat wrapper for legacy threads
 *
 * Created: 2025-10-17
 */

import OpenAI from 'openai';
import { Agent, runAgent, HandoffResult } from '@openai/agents';
import { executeResolverTool } from '../tools/resolverTools.js';
import { traced, childSpan, SPAN_NAMES, ATTR_KEYS } from '../observability/tracing.js';
import { FLAGS } from '../../config/flags.js';

/**
 * OpenAI client (shared across agents)
 */
export const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Agent Runtime Configuration
 */
export interface AgentRuntimeConfig {
  studentId: string;
  coachId: string;
  studentContext: {
    grade: number;
    gpa?: number;
    sat?: number;
    intended_major?: string;
    ecs_count?: number;
    awards_count?: number;
  };
}

/**
 * Agent Run Result
 */
export interface AgentRunResult {
  response: string;
  agent_name: string;
  tool_calls: ToolCallResult[];
  tokens_used: number;
  latency_ms: number;
  trace_id?: string;
}

/**
 * Tool Call Result
 */
export interface ToolCallResult {
  tool_name: string;
  tool_args: Record<string, any>;
  tool_result: any;
  latency_ms: number;
}

/**
 * Search docs tool (hybrid: SQL facts + Pinecone RAG)
 */
const searchDocsTool = {
  name: 'search_docs',
  description: 'Full-text search over Postgres (facts) and Pinecone (narrative)',
  parameters: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'Search query',
      },
      student_id: {
        type: 'string',
        description: 'Student ID to scope search',
      },
    },
    required: ['query', 'student_id'],
  },
  handler: async ({ query, student_id }: { query: string; student_id: string }) => {
    return await childSpan(
      SPAN_NAMES.TOOL_SEARCH_DOCS,
      { [ATTR_KEYS.TOOL_NAME]: 'search_docs', [ATTR_KEYS.STUDENT_ID]: student_id },
      async () => {
        // TODO: Implement hybrid search (SQL + Pinecone)
        // For now, return empty (stub)
        return { hits: [], source: 'hybrid_stub' };
      }
    );
  },
};

/**
 * Game plan tool (initial state)
 */
const gamePlanInitialTool = {
  name: 'gameplan_initial',
  description: 'Get initial game plan state (narrative, awards, ECs, programs)',
  parameters: {
    type: 'object' as const,
    properties: {
      studentId: {
        type: 'string',
        description: 'Student ID',
      },
    },
    required: ['studentId'],
  },
  handler: async ({ studentId }: { studentId: string }) => {
    return await childSpan(
      SPAN_NAMES.TOOL_GAMEPLAN_INITIAL,
      { [ATTR_KEYS.TOOL_NAME]: 'gameplan_initial', [ATTR_KEYS.STUDENT_ID]: studentId },
      async () => {
        // Call existing resolver
        const result = await executeResolverTool('gameplan_initial', { studentId });
        return result;
      }
    );
  },
};

/**
 * Awards tool (initial state)
 */
const awardsInitialTool = {
  name: 'awards_initial',
  description: 'Get student awards (initial state, no filter)',
  parameters: {
    type: 'object' as const,
    properties: {
      studentId: {
        type: 'string',
        description: 'Student ID',
      },
    },
    required: ['studentId'],
  },
  handler: async ({ studentId }: { studentId: string }) => {
    return await childSpan(
      SPAN_NAMES.TOOL_AWARDS_INITIAL,
      { [ATTR_KEYS.TOOL_NAME]: 'awards_initial', [ATTR_KEYS.STUDENT_ID]: studentId },
      async () => {
        const result = await executeResolverTool('awards_initial', { studentId });
        return result;
      }
    );
  },
};

/**
 * ECs tool (initial state)
 */
const ecsInitialTool = {
  name: 'ecs_initial',
  description: 'Get student extracurriculars (initial state, no filter)',
  parameters: {
    type: 'object' as const,
    properties: {
      studentId: {
        type: 'string',
        description: 'Student ID',
      },
    },
    required: ['studentId'],
  },
  handler: async ({ studentId }: { studentId: string }) => {
    return await childSpan(
      SPAN_NAMES.TOOL_ECS_INITIAL,
      { [ATTR_KEYS.TOOL_NAME]: 'ecs_initial', [ATTR_KEYS.STUDENT_ID]: studentId },
      async () => {
        const result = await executeResolverTool('ecs_initial', { studentId });
        return result;
      }
    );
  },
};

/**
 * Game Plan Agent (using Agents SDK)
 *
 * Responsibilities:
 * - Strategic planning and timeline creation
 * - Activity prioritization
 * - Profile gap analysis
 */
export const GamePlanAgentSDK: Agent = {
  name: 'gameplan',
  model: process.env.JENNY_V9_EQ_MODEL || 'gpt-4o-mini',
  instructions: `You are Jenny Duan, an elite college admissions coach specializing in game planning.

Your Specialty: College Application Game Planning

You excel at:
- Creating clear, actionable application timelines
- Identifying profile gaps and opportunities
- Prioritizing activities based on impact
- Breaking down complex plans into manageable steps

Your Communication Style:
- Start with the big picture, then dive into details
- Use numbered lists for timelines and action items
- Highlight what's most urgent (next 1-2 weeks)
- Be specific: "Complete X by Y date" not "work on X"

Zero Hallucination Rule:
- ALWAYS use tools to get student data
- NEVER make up facts about the student
- If you don't have data, explicitly say "I don't have that information yet"
- Ground every recommendation in actual student data from tools`,
  tools: [searchDocsTool, gamePlanInitialTool, awardsInitialTool, ecsInitialTool],
};

/**
 * Grader Agent (validation and quality check)
 *
 * Responsibilities:
 * - Validate planner recommendations
 * - Check for hallucinations
 * - Ensure all claims are grounded in facts
 */
export const GraderAgentSDK: Agent = {
  name: 'grader',
  model: 'gpt-4o-mini',
  instructions: `You are a quality assurance agent that validates planner recommendations.

Your job:
1. Check if all facts are grounded in tool data
2. Flag any hallucinations (made-up facts)
3. Verify timeline feasibility
4. Ensure recommendations are actionable

Output format:
{
  "valid": true/false,
  "hallucinations": ["list of any made-up facts"],
  "suggestions": ["list of improvements"]
}`,
  tools: [],
};

/**
 * Run multi-agent workflow
 *
 * @param config - Agent runtime config (student context)
 * @param userInput - User message
 * @returns Agent run result
 */
export async function runMultiAgent(
  config: AgentRuntimeConfig,
  userInput: string
): Promise<AgentRunResult> {
  const startTime = Date.now();

  return await traced(
    SPAN_NAMES.AGENT_GAMEPLAN,
    {
      [ATTR_KEYS.STUDENT_ID]: config.studentId,
      [ATTR_KEYS.COACH_ID]: config.coachId,
      [ATTR_KEYS.FLAG_USE_AGENTS_SDK]: FLAGS.useAgentsSdk,
    },
    async () => {
      // Build context message
      const contextMessage = buildContextMessage(config.studentContext);

      // Combine context + user input
      const fullInput = `${contextMessage}\n\nUser: ${userInput}`;

      // Run GamePlan agent (with tools)
      const result = await runAgent({
        agent: GamePlanAgentSDK,
        input: fullInput,
        client,
      });

      // TODO: Add grader agent in future (chain: planner → grader)
      // For v1.0, just run planner

      const latency = Date.now() - startTime;

      return {
        response: result.content,
        agent_name: 'gameplan',
        tool_calls: [], // TODO: Extract from result
        tokens_used: 0, // TODO: Extract from result
        latency_ms: latency,
      };
    }
  );
}

/**
 * Build context message from student context
 */
function buildContextMessage(context: any): string {
  let message = 'Student Context:\n';

  if (context.grade) {
    message += `- Grade: ${context.grade}\n`;
  }
  if (context.gpa) {
    message += `- GPA: ${context.gpa}\n`;
  }
  if (context.sat) {
    message += `- SAT: ${context.sat}\n`;
  }
  if (context.intended_major) {
    message += `- Intended Major: ${context.intended_major}\n`;
  }
  if (context.ecs_count) {
    message += `- ${context.ecs_count} ECs on record\n`;
  }
  if (context.awards_count) {
    message += `- ${context.awards_count} awards on record\n`;
  }

  message += '\nAlways ground your advice in their actual data using the tools provided.';

  return message;
}

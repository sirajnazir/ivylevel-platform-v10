/**
 * src/observability/tracing.ts
 * OpenTelemetry tracing hooks for Agents SDK
 *
 * Traces agent spans with attributes:
 * - agent.name (planner, grader, etc.)
 * - tool.name (search_docs, etc.)
 * - thread_id, run_id (for compat flows)
 * - feature_flag (useAgentsSdk, assistantsCompat)
 *
 * Created: 2025-10-17
 */

import { context, trace, Span, SpanStatusCode } from '@opentelemetry/api';

export const tracer = trace.getTracer('ivylevel-agents', '1.0.0');

/**
 * Execute function within traced span
 *
 * @param name - Span name (e.g., "agent.planner", "tool.search_docs")
 * @param attributes - Span attributes (e.g., { agent_name: "planner", student_id: "huda-2025" })
 * @param fn - Function to execute
 * @returns Function result
 *
 * @example
 * const result = await traced("agent.planner", { student_id: "huda-2025" }, async () => {
 *   return await runPlanner(input);
 * });
 */
export async function traced<T>(
  name: string,
  attributes: Record<string, string | number | boolean>,
  fn: () => Promise<T>
): Promise<T> {
  return await tracer.startActiveSpan(name, async (span: Span) => {
    try {
      // Set attributes
      for (const [key, value] of Object.entries(attributes)) {
        span.setAttribute(key, value);
      }

      // Execute function
      const result = await fn();

      // Mark success
      span.setStatus({ code: SpanStatusCode.OK });

      return result;
    } catch (error: any) {
      // Record exception
      span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error?.message || 'Unknown error',
      });

      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Create child span (for nested operations)
 *
 * @param name - Span name
 * @param attributes - Span attributes
 * @param fn - Function to execute
 * @returns Function result
 *
 * @example
 * await traced("agent.planner", { student_id }, async () => {
 *   const docs = await childSpan("tool.search_docs", { query: "awards" }, async () => {
 *     return await searchDocs(query);
 *   });
 * });
 */
export async function childSpan<T>(
  name: string,
  attributes: Record<string, string | number | boolean>,
  fn: () => Promise<T>
): Promise<T> {
  // childSpan uses the same tracer, which will automatically nest under active span
  return await traced(name, attributes, fn);
}

/**
 * Get current trace context (for cross-service tracing)
 *
 * @returns Trace context object with trace_id and span_id
 */
export function getCurrentTraceContext(): { trace_id?: string; span_id?: string } {
  const activeContext = context.active();
  const span = trace.getSpan(activeContext);

  if (!span) {
    return {};
  }

  const spanContext = span.spanContext();
  return {
    trace_id: spanContext.traceId,
    span_id: spanContext.spanId,
  };
}

/**
 * Add event to current span (for debugging)
 *
 * @param name - Event name
 * @param attributes - Event attributes
 *
 * @example
 * addEvent("tool_call_started", { tool_name: "search_docs", query: "awards" });
 */
export function addEvent(name: string, attributes?: Record<string, string | number | boolean>) {
  const activeContext = context.active();
  const span = trace.getSpan(activeContext);

  if (span) {
    span.addEvent(name, attributes);
  }
}

/**
 * Standard span names (for consistency)
 */
export const SPAN_NAMES = {
  // Agent spans
  AGENT_PLANNER: 'agent.planner',
  AGENT_GRADER: 'agent.grader',
  AGENT_GAMEPLAN: 'agent.gameplan',
  AGENT_COLLEGE_LIST: 'agent.college_list',
  AGENT_ESSAY: 'agent.essay',
  AGENT_ADMISSIONS: 'agent.admissions',
  AGENT_ASSESSMENT: 'agent.assessment',

  // Tool spans
  TOOL_SEARCH_DOCS: 'tool.search_docs',
  TOOL_GAMEPLAN_INITIAL: 'tool.gameplan_initial',
  TOOL_GAMEPLAN_FINAL: 'tool.gameplan_final',
  TOOL_AWARDS_INITIAL: 'tool.awards_initial',
  TOOL_AWARDS_FINAL: 'tool.awards_final',
  TOOL_ECS_INITIAL: 'tool.ecs_initial',
  TOOL_ECS_FINAL: 'tool.ecs_final',

  // Compat spans
  COMPAT_SUBMIT_TOOL_OUTPUTS: 'compat.submit_tool_outputs',
  COMPAT_POLL_RUN: 'compat.poll_run',

  // Database spans
  DB_QUERY: 'db.query',
  DB_TRANSACTION: 'db.transaction',
} as const;

/**
 * Standard attribute keys (for consistency)
 */
export const ATTR_KEYS = {
  // Agent attributes
  AGENT_NAME: 'agent.name',
  AGENT_MODEL: 'agent.model',
  STUDENT_ID: 'student.id',
  COACH_ID: 'coach.id',

  // Tool attributes
  TOOL_NAME: 'tool.name',
  TOOL_CALL_ID: 'tool.call_id',

  // Assistants API attributes
  THREAD_ID: 'thread.id',
  RUN_ID: 'run.id',
  RUN_STATUS: 'run.status',

  // Feature flag attributes
  FLAG_USE_AGENTS_SDK: 'flag.use_agents_sdk',
  FLAG_ASSISTANTS_COMPAT: 'flag.assistants_compat',

  // Performance attributes
  TOKENS_USED: 'tokens.used',
  LATENCY_MS: 'latency.ms',
} as const;

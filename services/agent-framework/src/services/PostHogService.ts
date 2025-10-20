/**
 * PostHogService - Observability & Analytics Integration
 * Week 19-20 - Production Observability
 *
 * Tracks:
 * - Agent usage (which agents are used, how often)
 * - Query patterns (what students ask about)
 * - Tool invocations (which tools get called)
 * - Performance metrics (latency, errors)
 * - User engagement (session duration, message count)
 */

import { PostHog } from 'posthog-node';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const logger = createLogger('posthog-service');

export interface AgentEvent {
  agent_id: string;
  student_id: string;
  coach_id: string;
  session_id: string;
  message: string;
  response_length: number;
  latency_ms: number;
  tools_used?: string[];
  error?: string;
}

export interface ToolEvent {
  tool_name: string;
  student_id: string;
  agent_id: string;
  session_id: string;
  args: Record<string, any>;
  result_count?: number;
  latency_ms: number;
  success: boolean;
  error?: string;
}

export interface SessionEvent {
  session_id: string;
  student_id: string;
  coach_id: string;
  session_type: 'chat' | 'autonomous';
  duration_seconds?: number;
  message_count?: number;
  agents_used?: string[];
}

/**
 * PostHogService - Analytics and Observability
 */
export class PostHogService {
  private client: PostHog | null = null;
  private enabled: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize PostHog client
   */
  private initialize(): void {
    const apiKey = process.env.POSTHOG_API_KEY;
    const host = process.env.POSTHOG_HOST || 'https://us.i.posthog.com';

    if (!apiKey) {
      logger.event('posthog.disabled', {}, 'warn');
      return;
    }

    try {
      this.client = new PostHog(apiKey, {
        host,
        flushAt: 20, // Flush after 20 events
        flushInterval: 10000, // Flush every 10 seconds
      });

      this.enabled = true;
      logger.event('posthog.initialized', { host });
    } catch (error: any) {
      logger.error('posthog.init_error', error, {});
    }
  }

  /**
   * Track agent execution
   */
  trackAgentExecution(event: AgentEvent): void {
    if (!this.enabled || !this.client) return;

    try {
      this.client.capture({
        distinctId: event.student_id,
        event: 'agent_execution',
        properties: {
          agent_id: event.agent_id,
          coach_id: event.coach_id,
          session_id: event.session_id,
          message_length: event.message.length,
          response_length: event.response_length,
          latency_ms: event.latency_ms,
          tools_used: event.tools_used || [],
          tools_count: event.tools_used?.length || 0,
          success: !event.error,
          error: event.error,
        },
      });

      logger.event('posthog.agent_tracked', {
        agent_id: event.agent_id,
        student_id: event.student_id,
        latency_ms: event.latency_ms,
      });
    } catch (error: any) {
      logger.error('posthog.track_agent_error', error, {});
    }
  }

  /**
   * Track tool invocation
   */
  trackToolInvocation(event: ToolEvent): void {
    if (!this.enabled || !this.client) return;

    try {
      this.client.capture({
        distinctId: event.student_id,
        event: 'tool_invocation',
        properties: {
          tool_name: event.tool_name,
          agent_id: event.agent_id,
          session_id: event.session_id,
          args: JSON.stringify(event.args),
          result_count: event.result_count || 0,
          latency_ms: event.latency_ms,
          success: event.success,
          error: event.error,
        },
      });

      logger.event('posthog.tool_tracked', {
        tool_name: event.tool_name,
        student_id: event.student_id,
        success: event.success,
      }, 'debug');
    } catch (error: any) {
      logger.error('posthog.track_tool_error', error, {});
    }
  }

  /**
   * Track session start
   */
  trackSessionStart(event: SessionEvent): void {
    if (!this.enabled || !this.client) return;

    try {
      this.client.capture({
        distinctId: event.student_id,
        event: 'session_start',
        properties: {
          session_id: event.session_id,
          coach_id: event.coach_id,
          session_type: event.session_type,
        },
      });

      logger.event('posthog.session_start_tracked', {
        session_id: event.session_id,
        student_id: event.student_id,
        session_type: event.session_type,
      });
    } catch (error: any) {
      logger.error('posthog.track_session_start_error', error, {});
    }
  }

  /**
   * Track session end
   */
  trackSessionEnd(event: SessionEvent): void {
    if (!this.enabled || !this.client) return;

    try {
      this.client.capture({
        distinctId: event.student_id,
        event: 'session_end',
        properties: {
          session_id: event.session_id,
          coach_id: event.coach_id,
          session_type: event.session_type,
          duration_seconds: event.duration_seconds || 0,
          message_count: event.message_count || 0,
          agents_used: event.agents_used || [],
          agents_count: event.agents_used?.length || 0,
        },
      });

      logger.event('posthog.session_end_tracked', {
        session_id: event.session_id,
        student_id: event.student_id,
        duration_seconds: event.duration_seconds,
        message_count: event.message_count,
      });
    } catch (error: any) {
      logger.error('posthog.track_session_end_error', error, {});
    }
  }

  /**
   * Track user identification (for cohorts and properties)
   */
  identifyUser(studentId: string, properties: Record<string, any>): void {
    if (!this.enabled || !this.client) return;

    try {
      this.client.identify({
        distinctId: studentId,
        properties: {
          ...properties,
          last_seen: new Date().toISOString(),
        },
      });

      logger.event('posthog.user_identified', { student_id: studentId });
    } catch (error: any) {
      logger.error('posthog.identify_user_error', error, {});
    }
  }

  /**
   * Track custom event
   */
  trackEvent(
    studentId: string,
    eventName: string,
    properties?: Record<string, any>
  ): void {
    if (!this.enabled || !this.client) return;

    try {
      this.client.capture({
        distinctId: studentId,
        event: eventName,
        properties: properties || {},
      });

      logger.event('posthog.custom_event_tracked', {
        student_id: studentId,
        event: eventName,
      }, 'debug');
    } catch (error: any) {
      logger.error('posthog.track_custom_event_error', error, {});
    }
  }

  /**
   * Flush pending events (call before shutdown)
   */
  async flush(): Promise<void> {
    if (!this.enabled || !this.client) return;

    try {
      await this.client.flush();
      logger.event('posthog.flushed');
    } catch (error: any) {
      logger.error('posthog.flush_error', error, {});
    }
  }

  /**
   * Shutdown PostHog client
   */
  async shutdown(): Promise<void> {
    if (!this.enabled || !this.client) return;

    try {
      await this.client.shutdown();
      logger.event('posthog.shutdown');
    } catch (error: any) {
      logger.error('posthog.shutdown_error', error, {});
    }
  }
}

// Singleton instance
export const postHogService = new PostHogService();

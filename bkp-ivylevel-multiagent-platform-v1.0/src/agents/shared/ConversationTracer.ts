/**
 * v36.0 Diagnostic: ConversationTracer
 *
 * Purpose: Track exactly which v36.0 methods are being called during conversation flow.
 * This helps identify WHERE the infinite loop prevention is failing.
 *
 * Usage:
 * - Add ConversationTracer.trace() calls at key points in code
 * - Query /debug/trace/:session_id to see what happened
 * - Query /debug/trace/:session_id/missing to see what DIDN'T happen
 */

export interface TraceEvent {
  event_type: string;
  agent_id: string;
  session_id: string;
  timestamp: Date;
  data: Record<string, any>;
}

export class ConversationTracer {
  private static events: TraceEvent[] = [];
  private static maxEvents = 1000; // Prevent memory leak

  /**
   * Record a trace event
   */
  static trace(
    eventType: string,
    agentId: string,
    sessionId: string,
    data: Record<string, any> = {}
  ): void {
    const event: TraceEvent = {
      event_type: eventType,
      agent_id: agentId,
      session_id: sessionId,
      timestamp: new Date(),
      data,
    };

    this.events.push(event);

    // Log to console with visual separator
    console.log('═'.repeat(65));
    console.log(`[TRACE:${eventType}]`, {
      agent: agentId,
      session: sessionId.substring(0, 8),
      ...data,
    });
    console.log('═'.repeat(65));

    // Trim old events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  /**
   * Get all events for a session
   */
  static getSessionEvents(sessionId: string): TraceEvent[] {
    return this.events.filter(e => e.session_id === sessionId);
  }

  /**
   * Analyze conversation flow for a session
   * Returns which v36.0 methods were called and which were NOT
   */
  static analyzeFlow(sessionId: string): {
    events_found: string[];
    missing_events: string[];
    analysis: string;
  } {
    const events = this.getSessionEvents(sessionId);
    const eventTypes = events.map(e => e.event_type);

    // Expected v36.0 events in a complete conversation turn
    const expectedEvents = [
      'QUERY_RECEIVED',
      'FACTS_LOADED',
      'EXTRACTION_STARTED',
      'FRUSTRATION_CHECK',
      'GPT_EXTRACTION_COMPLETE',
      'FIELD_NORMALIZATION_STARTED',
      'FIELD_NORMALIZATION_COMPLETE',
      'MEMORY_UPDATE_STARTED',
      'MEMORY_UPDATE_COMPLETE',
      'QUESTION_GENERATION',
      'QUESTION_VALIDATION_STARTED',
      'QUESTION_VALIDATION_COMPLETE',
      'RESPONSE_RETURNED',
    ];

    const missingEvents = expectedEvents.filter(
      expected => !eventTypes.includes(expected)
    );

    let analysis = '';
    if (missingEvents.length === 0) {
      analysis = '✅ All v36.0 methods are being called correctly!';
    } else {
      analysis = `❌ ${missingEvents.length} v36.0 methods are NOT being called:\n`;
      analysis += missingEvents.map(e => `  - ${e}`).join('\n');
    }

    return {
      events_found: [...new Set(eventTypes)],
      missing_events: missingEvents,
      analysis,
    };
  }

  /**
   * Clear all events (for testing)
   */
  static clear(): void {
    this.events = [];
  }

  /**
   * Get event timeline for a session
   */
  static getTimeline(sessionId: string): string {
    const events = this.getSessionEvents(sessionId);

    if (events.length === 0) {
      return 'No events recorded for this session';
    }

    const startTime = events[0].timestamp.getTime();

    return events.map(e => {
      const elapsed = e.timestamp.getTime() - startTime;
      return `[+${elapsed}ms] ${e.event_type} (${e.agent_id})`;
    }).join('\n');
  }
}

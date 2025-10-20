/**
 * Event Bus System
 *
 * Pub/Sub event system for agent lifecycle events
 * Enables autonomous agent triggering:
 * - student_onboarded → AssessmentAgent
 * - assessment_completed → GamePlanAgent
 * - gameplan_generated → WeeklyExecutionAgent
 * - task_overdue → NudgeAgent
 */

import { Pool } from 'pg';
import { EventEmitter } from 'events';

/**
 * Lifecycle Event Types
 */
export type LifecycleEventType =
  | 'student_onboarded'
  | 'assessment_started'
  | 'assessment_completed'
  | 'game_plan_generated'  // Note: uses underscore to match DB constraint
  | 'weekly_plan_generated'
  | 'task_created'
  | 'task_completed'
  | 'task_overdue'
  | 'deadline_approaching'
  | 'no_activity_detected'
  | 'milestone_achieved'
  | 'parent_message_received'
  | 'crisis_detected'
  | 'celebration_triggered';

/**
 * Lifecycle Event
 */
export interface LifecycleEvent {
  event_id?: number;
  event_type: LifecycleEventType;
  student_id: string;
  coach_id: string;
  payload: Record<string, any>;
  created_at?: Date;
  processed?: boolean;
  processed_at?: Date | null;
  handler_result?: Record<string, any> | null;
}

/**
 * Event Handler
 */
export type EventHandler = (event: LifecycleEvent) => Promise<void>;

/**
 * Event Bus
 * In-memory pub/sub + database persistence
 */
export class EventBus {
  private emitter: EventEmitter;
  private handlers: Map<LifecycleEventType, EventHandler[]>;
  private pool: Pool;

  constructor(pool: Pool) {
    this.emitter = new EventEmitter();
    this.handlers = new Map();
    this.pool = pool;
  }

  /**
   * Subscribe to event type
   */
  on(eventType: LifecycleEventType, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }

    this.handlers.get(eventType)!.push(handler);

    // Also listen on in-memory emitter
    this.emitter.on(eventType, handler);
  }

  /**
   * Publish event
   * Persists to database + triggers in-memory handlers
   */
  async emit(event: Omit<LifecycleEvent, 'event_id' | 'created_at' | 'processed' | 'processed_at' | 'handler_result'>): Promise<number> {
    // 1. Persist to database
    const result = await this.pool.query(
      `INSERT INTO events (event_type, student_id, coach_id, payload, created_at, processed)
       VALUES ($1, $2, $3, $4, NOW(), false)
       RETURNING event_id`,
      [
        event.event_type,
        event.student_id,
        event.coach_id,
        JSON.stringify(event.payload),
      ]
    );

    const eventId = result.rows[0].event_id;

    // 2. Trigger in-memory handlers
    const fullEvent: LifecycleEvent = {
      event_id: eventId,
      ...event,
      created_at: new Date(),
      processed: false,
    };

    // Execute handlers asynchronously (don't await)
    this.executeHandlers(event.event_type, fullEvent).catch((error) => {
      console.error(`[EventBus] Error executing handlers for ${event.event_type}:`, error);
    });

    return eventId;
  }

  /**
   * Execute all handlers for event type
   */
  private async executeHandlers(
    eventType: LifecycleEventType,
    event: LifecycleEvent
  ): Promise<void> {
    const handlers = this.handlers.get(eventType) || [];

    if (handlers.length === 0) {
      console.log(`[EventBus] No handlers registered for ${eventType}`);
      return;
    }

    console.log(`[EventBus] Executing ${handlers.length} handlers for ${eventType}`);

    // Execute all handlers in parallel
    await Promise.all(
      handlers.map((handler) =>
        handler(event).catch((error) => {
          console.error(
            `[EventBus] Handler failed for ${eventType}:`,
            error
          );
        })
      )
    );
  }

  /**
   * Get recent events for student
   */
  async getRecentEvents(
    studentId: string,
    limit: number = 10
  ): Promise<LifecycleEvent[]> {
    const result = await this.pool.query(
      `SELECT event_id, event_type, student_id, coach_id, payload, created_at, processed, processed_at, handler_result
       FROM events
       WHERE student_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [studentId, limit]
    );

    return result.rows.map((row) => ({
      event_id: row.event_id,
      event_type: row.event_type,
      student_id: row.student_id,
      coach_id: row.coach_id,
      payload: row.payload,
      created_at: row.created_at,
      processed: row.processed,
      processed_at: row.processed_at,
      handler_result: row.handler_result,
    }));
  }

  /**
   * Get events by type
   */
  async getEventsByType(
    eventType: LifecycleEventType,
    limit: number = 100
  ): Promise<LifecycleEvent[]> {
    const result = await this.pool.query(
      `SELECT event_id, event_type, student_id, coach_id, payload, created_at, processed, processed_at, handler_result
       FROM events
       WHERE event_type = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [eventType, limit]
    );

    return result.rows.map((row) => ({
      event_id: row.event_id,
      event_type: row.event_type,
      student_id: row.student_id,
      coach_id: row.coach_id,
      payload: row.payload,
      created_at: row.created_at,
      processed: row.processed,
      processed_at: row.processed_at,
      handler_result: row.handler_result,
    }));
  }

  /**
   * Clear all handlers (for testing)
   */
  clear(): void {
    this.handlers.clear();
    this.emitter.removeAllListeners();
  }
}

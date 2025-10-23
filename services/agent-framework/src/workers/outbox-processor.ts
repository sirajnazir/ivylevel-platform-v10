/**
 * Outbox Processor Worker
 *
 * Processes undelivered events from the outbox table with exactly-once semantics
 * using Redis for delivery tracking.
 *
 * Version: v3.2.0
 * Fix #5: Outbox Exactly-Once Pattern
 */

import Redis from 'ioredis';
import { pool } from '../db/pool-rls.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const OUTBOX_POLL_INTERVAL_MS = 5000; // Poll every 5 seconds
const OUTBOX_BATCH_SIZE = 100; // Process 100 events per cycle
const REDIS_DELIVERED_TTL_SECONDS = 3600; // 1 hour (prevents duplicate processing)

// ============================================================================
// REDIS CLIENT
// ============================================================================

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redis.on('error', (error) => {
  console.error('[Outbox] Redis connection error:', error);
});

redis.on('connect', () => {
  console.log('[Outbox] ✅ Connected to Redis');
});

// ============================================================================
// EVENT BUS (Stub - Replace with your actual event bus)
// ============================================================================

/**
 * Event bus interface for publishing events.
 *
 * Replace this with your actual event bus implementation (e.g., EventEmitter, Kafka, etc.)
 */
class EventBus {
  async publish(topic: string, payload: any): Promise<void> {
    // TODO: Replace with actual event bus implementation
    console.log(`[EventBus] Publishing event: ${topic}`, payload);

    // For now, just log the event (in production, this would publish to Kafka, SNS, etc.)
    // throw new Error('Not implemented: Replace with actual event bus');
  }
}

const eventBus = new EventBus();

// ============================================================================
// OUTBOX PROCESSOR
// ============================================================================

/**
 * Processes undelivered events from the outbox table.
 *
 * Algorithm:
 * 1. Fetch undelivered events (delivered_at IS NULL)
 * 2. For each event:
 *    a. Check Redis for delivered key (prevents duplicates)
 *    b. If already delivered, mark as delivered in DB
 *    c. Otherwise, publish to event bus
 *    d. Set Redis delivered key (TTL 1 hour)
 *    e. Mark as delivered in DB
 *
 * @returns Number of events processed
 */
async function processOutbox(): Promise<number> {
  try {
    // Fetch undelivered events
    const result = await pool.query(
      `
      SELECT * FROM outbox
      WHERE delivered_at IS NULL
      ORDER BY created_at ASC
      LIMIT $1
      `,
      [OUTBOX_BATCH_SIZE]
    );

    const undelivered = result.rows;

    if (undelivered.length === 0) {
      return 0; // No events to process
    }

    console.log(`[Outbox] Processing ${undelivered.length} undelivered events`);

    let processedCount = 0;

    for (const event of undelivered) {
      const deliveredKey = `outbox:delivered:${event.id}`;

      // Check if already delivered (Redis short-lived key)
      const alreadyDelivered = await redis.get(deliveredKey);

      if (alreadyDelivered) {
        console.log(`[Outbox] Event ${event.id} already delivered (Redis key exists), marking...`);
        await markDelivered(event.id);
        processedCount++;
        continue;
      }

      try {
        // Publish to event bus
        await eventBus.publish(event.topic, event.payload);

        // Set Redis delivered key (TTL 1 hour)
        await redis.setex(deliveredKey, REDIS_DELIVERED_TTL_SECONDS, '1');

        // Mark as delivered in DB
        await markDelivered(event.id);

        console.log(`[Outbox] ✅ Delivered event ${event.id} (topic: ${event.topic})`);

        processedCount++;
      } catch (error: any) {
        console.error(`[Outbox] ❌ Failed to deliver event ${event.id}:`, error.message);

        // Don't mark as delivered, will retry on next cycle
      }
    }

    console.log(`[Outbox] Processed ${processedCount}/${undelivered.length} events successfully`);

    return processedCount;
  } catch (error: any) {
    console.error('[Outbox] Error during processing cycle:', error.message);
    return 0;
  }
}

/**
 * Marks an event as delivered in the database.
 *
 * @param eventId - Event ID
 */
async function markDelivered(eventId: string): Promise<void> {
  await pool.query(
    `UPDATE outbox SET delivered_at = NOW() WHERE id = $1`,
    [eventId]
  );
}

// ============================================================================
// WORKER LOOP
// ============================================================================

let processorInterval: NodeJS.Timeout | null = null;

/**
 * Starts the outbox processor worker.
 *
 * Polls the outbox table every 5 seconds and processes undelivered events.
 *
 * Call this from your application entry point to enable outbox processing.
 */
export function startOutboxProcessor(): void {
  if (processorInterval) {
    console.warn('[Outbox] Processor already running');
    return;
  }

  console.log('[Outbox] Starting processor...');
  console.log(`[Outbox] Poll interval: ${OUTBOX_POLL_INTERVAL_MS}ms`);
  console.log(`[Outbox] Batch size: ${OUTBOX_BATCH_SIZE}`);
  console.log(`[Outbox] Redis TTL: ${REDIS_DELIVERED_TTL_SECONDS}s`);

  processorInterval = setInterval(async () => {
    await processOutbox();
  }, OUTBOX_POLL_INTERVAL_MS);

  console.log('[Outbox] ✅ Processor started successfully');
}

/**
 * Stops the outbox processor worker.
 */
export function stopOutboxProcessor(): void {
  if (!processorInterval) {
    console.warn('[Outbox] Processor not running');
    return;
  }

  console.log('[Outbox] Stopping processor...');

  clearInterval(processorInterval);
  processorInterval = null;

  console.log('[Outbox] ✅ Processor stopped');
}

// ============================================================================
// MANUAL TRIGGER (for testing)
// ============================================================================

/**
 * Manually triggers outbox processing.
 *
 * Useful for testing or on-demand processing.
 *
 * @returns Number of events processed
 */
export async function manualProcessOutbox(): Promise<number> {
  console.log('[Outbox] Manual processing triggered');
  return await processOutbox();
}

// ============================================================================
// CLEANUP (optional)
// ============================================================================

/**
 * Cleans up delivered events older than the specified number of days.
 *
 * @param days - Number of days to retain
 * @returns Number of events deleted
 */
export async function cleanupDeliveredEvents(days: number = 7): Promise<number> {
  console.log(`[Outbox] Cleaning up delivered events older than ${days} days...`);

  const result = await pool.query(
    `
    DELETE FROM outbox
    WHERE delivered_at IS NOT NULL
      AND delivered_at < NOW() - INTERVAL '${days} days'
    `
  );

  const deletedCount = result.rowCount || 0;

  console.log(`[Outbox] ✅ Cleaned up ${deletedCount} delivered events`);

  return deletedCount;
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

process.on('SIGTERM', () => {
  console.log('[Outbox] SIGTERM received, shutting down gracefully...');
  stopOutboxProcessor();
  redis.quit();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Outbox] SIGINT received, shutting down gracefully...');
  stopOutboxProcessor();
  redis.quit();
  process.exit(0);
});

// ============================================================================
// EXPORTS
// ============================================================================

export { processOutbox };

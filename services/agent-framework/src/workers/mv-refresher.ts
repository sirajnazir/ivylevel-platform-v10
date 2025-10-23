/**
 * Materialized View Refresher Worker
 *
 * Refreshes materialized views on a schedule (every 5 minutes) to avoid
 * lock contention on hot write paths.
 *
 * Version: v3.2.0
 * Fix #2: MV Refresh Strategy (Cron Worker)
 */

import { CronJob } from 'cron';
import { pool } from '../db/pool-rls.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const MV_REFRESH_INTERVAL = '*/5 * * * *'; // Every 5 minutes
const MV_REFRESH_TIMEOUT_MS = 30000; // 30 seconds timeout

// ============================================================================
// MATERIALIZED VIEWS TO REFRESH
// ============================================================================

const MATERIALIZED_VIEWS = [
  {
    name: 'mv_hgti_scores',
    description: 'HGTI (Human Growth & Transformation Index) scores',
  },
  // Add more MVs here as needed
];

// ============================================================================
// REFRESH FUNCTION
// ============================================================================

/**
 * Refreshes a single materialized view concurrently (non-blocking).
 *
 * Uses REFRESH MATERIALIZED VIEW CONCURRENTLY to avoid locking the table
 * during refresh. Requires a UNIQUE index on the MV.
 *
 * @param viewName - Materialized view name
 * @returns True if successful, false otherwise
 */
async function refreshMaterializedView(viewName: string): Promise<boolean> {
  const startTime = Date.now();

  try {
    console.log(`[MV-Refresher] Starting refresh: ${viewName}`);

    // Use CONCURRENTLY to avoid locking (requires UNIQUE index)
    await pool.query(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${viewName}`);

    const duration = Date.now() - startTime;
    console.log(`[MV-Refresher] ✅ Refreshed ${viewName} in ${duration}ms`);

    return true;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[MV-Refresher] ❌ Failed to refresh ${viewName} after ${duration}ms:`, error.message);

    // Log specific error types
    if (error.message.includes('does not have a unique index')) {
      console.error(`[MV-Refresher] ⚠️  ${viewName} requires a UNIQUE index for CONCURRENTLY. Add one with:`);
      console.error(`  CREATE UNIQUE INDEX idx_${viewName}_unique ON ${viewName}(primary_key_column);`);
    }

    return false;
  }
}

/**
 * Refreshes all materialized views in sequence.
 *
 * @returns Number of successfully refreshed views
 */
async function refreshAllMaterializedViews(): Promise<number> {
  console.log(`[MV-Refresher] Starting refresh cycle (${MATERIALIZED_VIEWS.length} views)`);

  let successCount = 0;

  for (const mv of MATERIALIZED_VIEWS) {
    const success = await refreshMaterializedView(mv.name);

    if (success) {
      successCount++;
    }
  }

  console.log(`[MV-Refresher] Refresh cycle complete: ${successCount}/${MATERIALIZED_VIEWS.length} successful`);

  return successCount;
}

// ============================================================================
// CRON JOB
// ============================================================================

/**
 * Cron job that runs every 5 minutes to refresh materialized views.
 */
export const mvRefreshJob = new CronJob(
  MV_REFRESH_INTERVAL,
  async () => {
    try {
      await refreshAllMaterializedViews();
    } catch (error: any) {
      console.error('[MV-Refresher] Unexpected error during refresh cycle:', error.message);
    }
  },
  null, // onComplete
  false, // Start immediately? (false = manual start)
  'America/New_York' // Timezone
);

// ============================================================================
// MANUAL REFRESH API (for testing)
// ============================================================================

/**
 * Manually triggers a refresh of all materialized views.
 *
 * Useful for testing or on-demand refreshes.
 *
 * @returns Number of successfully refreshed views
 */
export async function manualRefresh(): Promise<number> {
  console.log('[MV-Refresher] Manual refresh triggered');
  return await refreshAllMaterializedViews();
}

/**
 * Manually refreshes a specific materialized view.
 *
 * @param viewName - Materialized view name
 * @returns True if successful
 */
export async function manualRefreshView(viewName: string): Promise<boolean> {
  console.log(`[MV-Refresher] Manual refresh triggered for ${viewName}`);
  return await refreshMaterializedView(viewName);
}

// ============================================================================
// STARTUP
// ============================================================================

/**
 * Starts the MV refresher worker.
 *
 * Call this from your application entry point to enable automatic MV refresh.
 */
export function startMVRefresher(): void {
  console.log('[MV-Refresher] Starting worker...');
  console.log(`[MV-Refresher] Schedule: ${MV_REFRESH_INTERVAL} (every 5 minutes)`);
  console.log(`[MV-Refresher] Watching ${MATERIALIZED_VIEWS.length} materialized views`);

  // Start the cron job
  mvRefreshJob.start();

  console.log('[MV-Refresher] ✅ Worker started successfully');
}

/**
 * Stops the MV refresher worker.
 */
export function stopMVRefresher(): void {
  console.log('[MV-Refresher] Stopping worker...');
  mvRefreshJob.stop();
  console.log('[MV-Refresher] ✅ Worker stopped');
}

// ============================================================================
// EXPORTS
// ============================================================================

export { refreshAllMaterializedViews, refreshMaterializedView };

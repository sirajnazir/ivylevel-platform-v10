/**
 * Enhanced Database Pool with RLS Session Hygiene
 *
 * Enforces Row-Level Security by setting app.student_id and app.coach_id
 * on every database session checkout.
 *
 * Version: v3.2.0
 * Fix #3: RLS Session Hygiene
 */

import { Pool, PoolClient } from 'pg';
import { cfg } from '../config.js';

// ============================================================================
// POOL INSTANCE
// ============================================================================

export const pool = new Pool(cfg.pg);

// ============================================================================
// RLS CONTEXT
// ============================================================================

export interface RLSContext {
  student_id: string;
  coach_id?: string;
}

// ============================================================================
// RLS-AWARE CLIENT CHECKOUT
// ============================================================================

/**
 * Gets a database client with RLS session variables set.
 *
 * Sets:
 * - app.student_id = context.student_id
 * - app.coach_id = context.coach_id (if provided)
 *
 * These session variables are used by RLS policies to enforce data isolation.
 *
 * IMPORTANT: Session variables are automatically cleared on client release
 * (PostgreSQL LOCAL scope auto-resets on transaction end).
 *
 * @param context - RLS context (student_id, optional coach_id)
 * @returns PoolClient with RLS session variables set
 *
 * @example
 * const client = await getClientWithRLS({ student_id: 'huda-2025', coach_id: 'jenny' });
 * try {
 *   const result = await client.query('SELECT * FROM chips'); // Only sees huda-2025's chips
 * } finally {
 *   releaseClientWithRLS(client);
 * }
 */
export async function getClientWithRLS(context: RLSContext): Promise<PoolClient> {
  const client = await pool.connect();

  try {
    // Set RLS session variables (LOCAL scope = auto-reset on transaction end)
    await client.query(`SET LOCAL app.student_id = $1`, [context.student_id]);

    if (context.coach_id) {
      await client.query(`SET LOCAL app.coach_id = $1`, [context.coach_id]);
    }

    return client;
  } catch (error) {
    // If setting session vars fails, release client immediately
    client.release();
    throw error;
  }
}

/**
 * Releases a client obtained via getClientWithRLS().
 *
 * Session variables (app.student_id, app.coach_id) are automatically cleared
 * by PostgreSQL's LOCAL scope when the client is released.
 *
 * @param client - PoolClient to release
 */
export function releaseClientWithRLS(client: PoolClient): void {
  // PostgreSQL auto-resets LOCAL vars on transaction end
  client.release();
}

// ============================================================================
// RLS-AWARE TRANSACTION HELPER
// ============================================================================

/**
 * Executes a transaction with RLS context enforced.
 *
 * Automatically:
 * - Checks out client with RLS session vars
 * - Begins transaction
 * - Executes callback
 * - Commits on success, rollbacks on error
 * - Releases client
 *
 * @param context - RLS context
 * @param fn - Transaction callback
 * @returns Result of callback
 *
 * @example
 * const chip = await txWithRLS(
 *   { student_id: 'huda-2025' },
 *   async (client) => {
 *     await client.query('INSERT INTO chips (...) VALUES (...)');
 *     return chip;
 *   }
 * );
 */
export async function txWithRLS<T>(
  context: RLSContext,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClientWithRLS(context);

  try {
    await client.query('BEGIN');

    const result = await fn(client);

    await client.query('COMMIT');

    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    releaseClientWithRLS(client);
  }
}

// ============================================================================
// LEGACY TRANSACTION HELPER (without RLS)
// ============================================================================

/**
 * Legacy transaction helper without RLS enforcement.
 *
 * ⚠️ WARNING: Does NOT enforce RLS. Use txWithRLS() for student-scoped operations.
 *
 * @deprecated Use txWithRLS() for student-scoped operations
 */
export async function tx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await fn(client);

    await client.query('COMMIT');

    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================================
// QUERY HELPERS WITH RLS
// ============================================================================

/**
 * Executes a query with RLS context enforced.
 *
 * @param context - RLS context
 * @param query - SQL query
 * @param values - Query parameters
 * @returns Query result
 */
export async function queryWithRLS<T = any>(
  context: RLSContext,
  query: string,
  values?: any[]
): Promise<T> {
  const client = await getClientWithRLS(context);

  try {
    const result = await client.query(query, values);
    return result.rows as T;
  } finally {
    releaseClientWithRLS(client);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { pool };

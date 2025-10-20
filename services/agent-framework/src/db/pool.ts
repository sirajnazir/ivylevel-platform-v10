import { Pool, PoolClient } from 'pg';

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Execute a query with coach_id context set for RLS
 * This ensures Row Level Security policies filter data by coach
 */
export async function withCoachContext<T>(
  coachId: string,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    // Start transaction (required for SET LOCAL)
    await client.query('BEGIN');

    // Set coach_id for RLS policies
    // Note: SET LOCAL doesn't support parameterized queries, so we escape the value
    await client.query(`SET LOCAL app.coach_id = '${coachId.replace(/'/g, "''")}'`);

    // Execute the callback with the configured client
    const result = await callback(client);

    // Commit transaction
    await client.query('COMMIT');

    return result;
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    throw error;
  } finally {
    // Release client back to pool
    client.release();
  }
}
/**
 * Database connection helper
 * Used across v8.0 services for PostgreSQL access
 */

import { Pool } from 'pg';

let pool: Pool | null = null;

export async function getDbClient() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  return pool;
}

export async function closeDbPool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

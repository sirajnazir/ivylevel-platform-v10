import { Pool } from 'pg';
import { cfg } from './config.js';
export const pool = new Pool(cfg.pg);

export async function tx<T>(fn: (client: any)=>Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
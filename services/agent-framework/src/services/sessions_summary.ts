import { pool } from '../db/pool';
export async function getSummary(sessionId:string){
  const { rows } = await pool.query(`SELECT summary FROM chat_session_summaries WHERE session_id=$1`, [sessionId]);
  return rows[0] || null;
}
export async function maybeRefreshSummary(sessionId:string){
  // implement summarization job or cron; keep stubbed for now
}
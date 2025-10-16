import { pool } from '../db/pool';
export async function ensureSession(sessionId:string|undefined, studentId:string){
  if(sessionId) return sessionId;
  const { rows } = await pool.query(`INSERT INTO chat_sessions(student_id) VALUES($1) RETURNING session_id`, [studentId]);
  return rows[0].session_id as string;
}
export async function getRecentMessages(sessionId:string, limit=12){
  const { rows } = await pool.query(
    `SELECT role, content FROM chat_messages
     WHERE session_id=$1 ORDER BY created_ts DESC LIMIT $2`, [sessionId, limit]
  );
  return rows.reverse();
}
export async function storeMessage(sessionId:string, msg:{role:'user'|'assistant';content:string}){
  await pool.query(`INSERT INTO chat_messages(session_id, role, content) VALUES($1,$2,$3)`, [sessionId, msg.role, msg.content]);
}
import { pool } from '../db.js';

export async function resolveEvidence(ids: string[]){
  if (ids.length === 0) return [];
  const res = await pool.query(
    `SELECT e.evidence_id, e.source_id, s.title, s.drive_link, e.snippet_id, e.offset_start, e.offset_end, e.quote
     FROM evidence_links e JOIN sources s ON s.source_id=e.source_id
     WHERE e.evidence_id = ANY($1)`, [ids]
  );
  return res.rows;
}
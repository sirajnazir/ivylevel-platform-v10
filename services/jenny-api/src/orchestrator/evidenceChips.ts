import { pool } from '../db.js';

export async function evidenceChipsFromHits(hits: {namespace: string; id: string}[]) {
  // Look for any evidence_links tied via snippet_id for interaction hits
  const ids = hits.filter(h=>h.namespace==='interactions').map(h=>h.id);
  if (!ids.length) return [] as any[];
  const res = await pool.query(`
    SELECT e.evidence_id, e.source_id, e.snippet_id, e.quote, s.title, s.drive_link
    FROM evidence_links e JOIN sources s ON s.source_id=e.source_id
    WHERE e.snippet_id = ANY($1)`, [ids]);
  return res.rows.map(r=>({ evidence_id: r.evidence_id, source_id: r.source_id, snippet_id: r.snippet_id, quote: r.quote, title: r.title, drive_link: r.drive_link }));
}
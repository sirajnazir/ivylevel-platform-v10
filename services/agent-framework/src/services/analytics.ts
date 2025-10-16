import { pool } from '../db.js';

export async function tacticOutcomeMatrix(studentId: string){
  // Correlate interactions.tactic_name → outcomes (application admission results)
  // Join via jtbd_id or lifecycle_item_id; using jtbd_id for simplicity
  const sql = `
    WITH inter AS (
      SELECT i.jtbd_id, i.tactic_name
      FROM interactions i
      WHERE i.student_id = $1 AND i.tactic_name IS NOT NULL AND i.excluded_from_tactic_scoring = FALSE
    ),
    adm AS (
      SELECT o.jtbd_id, o.admission_result
      FROM outcomes o
      WHERE o.student_id = $1 AND o.type IN ('admission','result') AND o.admission_result IS NOT NULL
    )
    SELECT tactic_name, admission_result, COUNT(*)::int as n
    FROM inter JOIN adm USING (jtbd_id)
    GROUP BY tactic_name, admission_result
    ORDER BY tactic_name, admission_result;`;
  const res = await pool.query(sql, [studentId]);
  
  // Count total instances per tactic
  const counts = new Map<string, number>();
  res.rows.forEach(r => counts.set(r.tactic_name, (counts.get(r.tactic_name)||0)+Number(r.n)));

  // Normalize to matrix shape with n≥5 gating
  const matrix: Record<string, Record<string, number|string>> = {};
  for (const r of res.rows){
    const nTot = counts.get(r.tactic_name)!;
    if (nTot < 5) { 
      matrix[r.tactic_name] = { note: 'insufficient data (n<5)' }; 
      continue; 
    }
    (matrix[r.tactic_name] ||= {})[r.admission_result] = Number(r.n);
  }
  return { matrix };
}
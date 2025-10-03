import { pool } from '../db/pool';

export async function fetchVitals(studentId:string){
  const { rows } = await pool.query(
    `SELECT kind, value, fact_date, confidence, source_id
     FROM vital_facts WHERE student_id=$1 ORDER BY fact_date DESC LIMIT 500`, [studentId]
  );
  return { student_id: studentId, facts: rows };
}

// Keep backward compatibility
export async function getStudentVitals(studentId: string): Promise<{facts: any[]; timelines: any}> {
  const result = await fetchVitals(studentId);
  const timelinesRes = await pool.query(
    `SELECT kind, json_agg(json_build_object('date', fact_date, 'value', value) ORDER BY fact_date ASC) AS series
     FROM vital_facts WHERE student_id=$1 GROUP BY kind`, [studentId]
  );
  const timelines = Object.fromEntries(timelinesRes.rows.map((r: any) => [r.kind, r.series]));
  return { facts: result.facts, timelines };
}
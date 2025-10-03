import { pool } from '../db/pool';

export async function fetchLifecycle(studentId:string){
  const { rows } = await pool.query(
    `SELECT item_id, domain, status, school, submitted_at, outcome_date
     FROM lifecycle_items WHERE student_id=$1`, [studentId]
  );
  return rows;
}

// Keep backward compatibility
export async function getLifecycle(studentId: string, domain?: string): Promise<any[]> {
  const params: any[] = [studentId];
  let where = 'WHERE student_id=$1';
  if (domain) { params.push(domain); where += ` AND domain=$${params.length}`; }
  const res = await pool.query(
    `SELECT item_id, school, status, submitted_at as submitted, outcome_date
     FROM lifecycle_items ${where} ORDER BY created_ts DESC`, params
  );
  return res.rows;
}
import { Pool } from 'pg';
import { applyObservationToVitals } from './reducer';
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ivylevel',
});
export async function recomputeVitals(studentId) {
    const result = await pool.query('SELECT * FROM observations WHERE student_id = $1 ORDER BY at ASC', [studentId]);
    const observations = result.rows.map(row => ({
        id: row.id,
        studentId: row.student_id,
        kind: row.kind,
        subtype: row.subtype,
        value: row.value,
        source: row.source,
        at: row.at,
        createdAt: row.created_at
    }));
    let v = {};
    for (const o of observations) {
        v = applyObservationToVitals(v, o);
    }
    await pool.query(`INSERT INTO student_state (student_id, vitals, updated_at) 
     VALUES ($1, $2, NOW()) 
     ON CONFLICT (student_id) 
     DO UPDATE SET vitals = $2, updated_at = NOW()`, [studentId, JSON.stringify(v)]);
    return v;
}

import { Pool } from 'pg';
import { applyObservationToVitals } from '../services/agent/src/vitals/reducer';

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'ivylevel',
  password: process.env.DB_PASSWORD || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function recomputeVitals(studentId: string) {
  try {
    // Get all observations for student
    const result = await pool.query(
      `SELECT * FROM observations WHERE student_id = $1 ORDER BY at ASC`,
      [studentId]
    );
    
    // Start with empty vitals
    let vitals: any = {};
    
    // Apply each observation
    for (const obs of result.rows) {
      vitals = applyObservationToVitals(vitals, obs);
    }
    
    // Update student state
    await pool.query(
      `INSERT INTO student_state (student_id, vitals) 
       VALUES ($1, $2) 
       ON CONFLICT (student_id) 
       DO UPDATE SET vitals = $2, updated_at = NOW()`,
      [studentId, JSON.stringify(vitals)]
    );
    
    console.log(`Updated vitals for ${studentId}:`, JSON.stringify(vitals, null, 2));
  } catch (error) {
    console.error('Error recomputing vitals:', error);
  } finally {
    await pool.end();
  }
}

// CLI
const studentId = process.argv[2] || 'huda';
recomputeVitals(studentId);
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ivylevel',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = {
  query: (text: string, params?: any[]) => pool.query(text, params),
  
  async getStudentState(studentId: string) {
    const result = await pool.query(
      'SELECT vitals FROM student_state WHERE student_id = $1',
      [studentId]
    );
    return result.rows[0]?.vitals || {};
  },
  
  async upsertStudentState(studentId: string, vitals: any) {
    await pool.query(
      `INSERT INTO student_state (student_id, vitals, updated_at) 
       VALUES ($1, $2, NOW()) 
       ON CONFLICT (student_id) 
       DO UPDATE SET vitals = $2, updated_at = NOW()`,
      [studentId, JSON.stringify(vitals)]
    );
  },
  
  async createObservation(data: {
    studentId: string;
    kind: string;
    subtype?: string;
    value: any;
    source: string;
    at?: Date;
    idempotency_key?: string;
  }) {
    const result = await pool.query(
      `INSERT INTO observations (student_id, kind, subtype, value, source, at) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id`,
      [
        data.studentId,
        data.kind,
        data.subtype || null,
        JSON.stringify(data.value),
        data.source,
        data.at || new Date()
      ]
    );
    return result.rows[0].id;
  },
  
  async checkObservationExists(idempotency_key: string) {
    const result = await pool.query(
      'SELECT id FROM observations WHERE value->>\'idempotency_key\' = $1 LIMIT 1',
      [idempotency_key]
    );
    return result.rows[0] || null;
  },
  
  async getObservations(studentId: string) {
    const result = await pool.query(
      'SELECT * FROM observations WHERE student_id = $1 ORDER BY at ASC',
      [studentId]
    );
    return result.rows.map(row => ({
      ...row,
      value: row.value,
      at: row.at
    }));
  },
  
  async createOutcome(data: {
    studentId: string;
    category: string;
    name: string;
    metrics: any;
    period?: string;
    evidence?: string[];
  }) {
    const result = await pool.query(
      `INSERT INTO outcomes (student_id, category, name, metrics, period, evidence) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id`,
      [
        data.studentId,
        data.category,
        data.name,
        JSON.stringify(data.metrics),
        data.period || null,
        data.evidence || []
      ]
    );
    return result.rows[0].id;
  },

  async getLatestObservationAt(studentId: string): Promise<Date | null> {
    const result = await pool.query(
      'SELECT MAX(created_at) as latest FROM observations WHERE student_id = $1',
      [studentId]
    );
    return result.rows[0]?.latest || null;
  }
};

export default db;
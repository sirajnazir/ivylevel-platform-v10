// services/agent/src/vitals/read.ts
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export type SatVitals = {
  current?: number;
  superscore?: number;
  timeline?: Array<{ date: string; score: number; note?: string }>;
};

export type StudentVitals = {
  academics?: {
    gpa?: { weighted?: number; unweighted?: number; trend?: string };
    sat?: SatVitals;
    apsCompleted?: number;
  };
  activities?: Record<string, any>;
  awards?: Record<string, any>;
  summer?: Record<string, any>;
  wellness?: Record<string, any>;
};

export async function readVitals(studentId: string): Promise<StudentVitals | null> {
  const { rows } = await pool.query(
    "SELECT vitals FROM student_state WHERE student_id = $1 LIMIT 1",
    [studentId]
  );
  return rows[0]?.vitals ?? null;
}

// Helpers the orchestrator can call
export function pickSat(vitals: StudentVitals | null): { current?: number; timeline: SatVitals["timeline"] } {
  const sat = vitals?.academics?.sat || {};
  const tl = Array.isArray(sat.timeline) ? sat.timeline : [];
  return { current: sat.current, timeline: tl };
}
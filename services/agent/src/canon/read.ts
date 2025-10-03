// services/agent/src/canon/read.ts
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export type CanonRow = {
  key: string;
  student_id: string;
  source_type: "APP-DOC"|"EXEC-INTEL"|"TRANS-INTEL"|"IMSG-INTEL"|"GAMEPLAN";
  source_title: string;
  section?: string;
  jtbd_id?: string;
};

export async function readCanon(key: string, studentId: string): Promise<CanonRow | null> {
  const { rows } = await pool.query(
    "SELECT key, student_id, source_type, source_title, section, jtbd_id FROM canon WHERE key = $1 AND student_id = $2 LIMIT 1",
    [key, studentId]
  );
  return rows[0] ?? null;
}

// Shape chips for UI (canon-first)
export function canonToChip(c: CanonRow) {
  return {
    title: c.source_title,
    kind: c.source_type,
    week: undefined,
    phase: undefined,
    link: `canon://${c.key}`,   // logical pointer; your UI/agent resolves to real URL
    span: c.section ?? "root",
    reason: "canon-first"
  };
}
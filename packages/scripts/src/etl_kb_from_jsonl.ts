// packages/scripts/src/etl_kb_from_jsonl.ts
import fs from "fs";
import path from "path";
import readline from "readline";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function upsertObservation(o: any) {
  await pool.query(
    `INSERT INTO observations (id, student_id, kind, subtype, value, source, at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (id) DO NOTHING`,
    [o.id, o.student_id, o.kind, o.subtype, o.value, o.source, o.at]
  );
}

async function ingestJsonl(filePath: string, studentId: string) {
  const rl = readline.createInterface({ input: fs.createReadStream(filePath), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    const row = JSON.parse(line);
    // map JSONL → observation(s) (example: SAT / awards / apps)
    if (row?.facts) {
      for (const f of row.facts) {
        const id = f.id || `sha1:${require("crypto").createHash("sha1").update(JSON.stringify(f)).digest("hex")}`;
        await upsertObservation({
          id,
          student_id: studentId,
          kind: f.kind || "FACT",
          subtype: f.subtype || f.topic || null,
          value: f,
          source: row.source || path.basename(filePath),
          at: f.date_iso || row.date_iso || new Date().toISOString()
        });
      }
    }
  }
}

async function main() {
  const inDir = process.argv[2] || "data/kbase";
  const student = process.argv[3] || "huda";
  const files = [];
  (function walk(d: string) {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (p.endsWith(".jsonl")) files.push(p);
    }
  })(inDir);

  for (const fp of files) await ingestJsonl(fp, student);
  console.log(`Ingested ${files.length} JSONL files for ${student}.`);
  // Optional: call your recompute script here or leave to cron
}

main().catch(e => { console.error(e); process.exit(1); });
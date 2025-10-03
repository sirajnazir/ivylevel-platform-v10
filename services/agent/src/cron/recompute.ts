import cron from "node-cron";
import { Pool } from "pg";
import { recomputeVitals } from "../vitals/recompute";
import { child } from "@packages/logger";

const log = child({ svc: "agent-cron" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ivylevel',
});

export function startVitalsCron() {
  cron.schedule("7 3 * * *", async () => {
    log.info("Starting nightly vitals recomputation");
    
    try {
      const result = await pool.query(
        'SELECT DISTINCT student_id FROM observations'
      );
      
      const studentIds = result.rows.map(row => row.student_id);
      log.info(`Found ${studentIds.length} students to recompute`);
      
      for (const studentId of studentIds) {
        try {
          await recomputeVitals(studentId);
          log.debug(`Recomputed vitals for student: ${studentId}`);
        } catch (error) {
          log.error({ error, studentId }, "Failed to recompute vitals for student");
        }
      }
      
      log.info(`[cron] vitals recomputed for ${studentIds.length} students`);
    } catch (error) {
      log.error({ error }, "Failed to run vitals recomputation cron");
    }
  });
  
  log.info("Vitals cron job scheduled for 03:07 daily");
}
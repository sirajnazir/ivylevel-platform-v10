import pg from 'pg';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createLogger } from '../../../observability/dist/unified-logger.js';

const { Client } = pg;
const log = createLogger('etl-seed-awards');

async function main() {
  const studentId = process.env.STUDENT_ID || 'huda-2025';
  const sourceId  = process.env.SOURCE_ID  || 'SRC-huda-2025-gameplan-report';
  const asOf      = process.env.AS_OF      || '2025-06-22T00:00:00Z';
  const phase     = process.env.PHASE      || 'initial';
  const jsonPath  = process.env.GAMEPLAN_JSON || path.resolve(process.cwd(),
    'data/kbase/01-GamePlan/Huda_Assessment_Gameplan_Report_2025-06-22_Jenny_v1.json');

  log.info('Starting award targets seed', {
    studentId,
    sourceId,
    asOf,
    phase,
    jsonPath
  });

  // Read the GamePlan JSON
  try {
    const raw = await fs.readFile(jsonPath, 'utf8');
    log.info('Successfully read GamePlan file', { fileSize: raw.length });
  } catch (error: any) {
    log.error('Failed to read GamePlan file', { error: error.message, jsonPath });
    process.exit(1);
  }

  // The initial awards list from the GamePlan document
  const awards = [
    "NCWiT Aspirations in Computing Award",
    "Presidential Volunteer Service Award", 
    "National Merit Finalist Award",
    "Game Hackathon Awards",
    "Advocacy Award",
    "Game Impact Challenge Award",
    "JCamp"
  ];

  log.info('Preparing to insert awards', { count: awards.length });

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  
  try {
    await client.connect();
    log.info('Connected to database');

    await client.query('BEGIN');
    
    let insertCount = 0;
    for (const label of awards) {
      const result = await client.query(
        `
        INSERT INTO award_targets
          (student_id, award_label, tier, rationale, phase, as_of, confidence, source_id)
        VALUES
          ($1, $2, NULL, NULL, $3, $4, 'high', $5)
        ON CONFLICT (student_id, award_label, phase) DO UPDATE
        SET 
          as_of = EXCLUDED.as_of,
          source_id = EXCLUDED.source_id,
          updated_at = now()
        RETURNING id;
        `,
        [studentId, label, phase, asOf, sourceId]
      );
      
      if (result.rowCount > 0) {
        insertCount++;
        log.info('Inserted award target', { 
          award_label: label, 
          id: result.rows[0].id 
        });
      }
    }
    
    await client.query('COMMIT');
    log.info('Transaction committed', { insertCount });
    
    // Verify the inserts
    const verifyResult = await client.query(
      `SELECT COUNT(*) as count FROM award_targets WHERE student_id = $1 AND phase = $2`,
      [studentId, phase]
    );
    
    log.info('Verification complete', { 
      totalAwards: verifyResult.rows[0].count,
      expectedCount: awards.length
    });
    
  } catch (error: any) {
    await client.query('ROLLBACK');
    log.error('Failed to insert award targets', { error: error.message });
    throw error;
  } finally {
    await client.end();
  }

  console.log(`✅ Successfully upserted ${awards.length} initial awards for ${studentId} as_of=${asOf}`);
}

// Handle conflicts by adding unique constraint
const createConstraintSQL = `
ALTER TABLE award_targets 
ADD CONSTRAINT award_targets_unique_student_label_phase 
UNIQUE (student_id, award_label, phase);
`;

main().catch(e => {
  log.error('ETL script failed', { error: e.message, stack: e.stack });
  process.exit(1);
});
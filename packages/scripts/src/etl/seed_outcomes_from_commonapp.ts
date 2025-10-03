/**
 * ETL: Seed actual outcomes from Common App and Outcomes data
 *
 * Based on the Common App submission, this seeds the actual honors/awards won
 * Reference awards from the spec:
 * - NCWIT Aspirations in Computing (National Awardee + Regional Winner)
 * - Games for Change Writing Impact Award
 * - AP Scholar with Distinction
 * - College Board National Rural and Small Town Award
 * - Mountain House HS Computer Science CTE Award
 */

import pg from 'pg';
import { createLogger } from '../../../observability/dist/unified-logger.js';

const { Client } = pg;
const log = createLogger('etl-seed-outcomes');

// Actual outcomes from Common App UNC submission
const HUDA_OUTCOMES = [
  {
    item_id: 'award-huda-2025-ncwit-national',
    title_name: 'NCWIT Aspirations in Computing Award - National Awardee',
    subtype: 'national',
    status_detail: 'National Awardee',
    outcome_date: '2024-03-15',
    source_ref: 'Common App UNC - Honors Section'
  },
  {
    item_id: 'award-huda-2025-ncwit-regional',
    title_name: 'NCWIT Aspirations in Computing Award - Northern California Regional Winner',
    subtype: 'regional',
    status_detail: 'Regional Winner',
    outcome_date: '2024-03-15',
    source_ref: 'Common App UNC - Honors Section'
  },
  {
    item_id: 'award-huda-2025-g4c-writing-impact',
    title_name: 'Games for Change Writing Impact Award',
    subtype: 'national',
    status_detail: 'Winner',
    outcome_date: '2024-07-20',
    source_ref: 'Common App UNC - Honors Section'
  },
  {
    item_id: 'award-huda-2025-ap-scholar-distinction',
    title_name: 'AP Scholar with Distinction',
    subtype: 'national',
    status_detail: 'Recipient',
    outcome_date: '2024-07-01',
    source_ref: 'Common App UNC - Honors Section'
  },
  {
    item_id: 'award-huda-2025-college-board-rural',
    title_name: 'College Board National Rural and Small Town Award',
    subtype: 'national',
    status_detail: 'Recipient',
    outcome_date: '2024-09-01',
    source_ref: 'Common App UNC - Honors Section'
  },
  {
    item_id: 'award-huda-2025-mhhs-cs-cte',
    title_name: 'Mountain House High School Computer Science CTE Award',
    subtype: 'school',
    status_detail: 'Recipient',
    outcome_date: '2024-06-01',
    source_ref: 'Common App UNC - Honors Section'
  }
];

async function main() {
  const studentId = process.env.STUDENT_ID || 'huda-2025';

  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();
    log.info('Connected to database');

    await client.query('BEGIN');

    let insertedCount = 0;

    for (const outcome of HUDA_OUTCOMES) {
      await client.query(
        `
        INSERT INTO kb_items (
          item_id,
          student_id,
          item_type,
          subtype,
          title_name,
          tier1_state,
          tier2_substate,
          status_detail,
          key_metric_type,
          key_metric_value,
          outcome_date,
          event_date,
          source_ref,
          confidence,
          evidence_links
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (item_id) DO UPDATE SET
          tier1_state = EXCLUDED.tier1_state,
          tier2_substate = EXCLUDED.tier2_substate,
          status_detail = EXCLUDED.status_detail,
          outcome_date = EXCLUDED.outcome_date,
          source_ref = EXCLUDED.source_ref,
          updated_ts = now()
        RETURNING item_id
        `,
        [
          outcome.item_id,
          studentId,
          'Award_Competition',
          outcome.subtype,
          outcome.title_name,
          'Outcome', // tier1_state
          'Winner', // tier2_substate
          outcome.status_detail,
          'placement',
          outcome.status_detail,
          outcome.outcome_date,
          outcome.outcome_date, // also set as event_date
          outcome.source_ref,
          'high', // Common App data is high confidence
          [] // evidence_links (can add later)
        ]
      );

      insertedCount++;
      log.info('Inserted outcome', { item_id: outcome.item_id, title: outcome.title_name });
    }

    await client.query('COMMIT');
    log.info('Outcomes seeded successfully', { count: insertedCount });

    // Verify outcomes
    const { rows: verifyRows } = await client.query(
      `
      SELECT title_name, status_detail, outcome_date, source_ref
      FROM v_awards_won
      WHERE student_id = $1
      ORDER BY outcome_date NULLS LAST
      `,
      [studentId]
    );

    log.info('Verification', { won_awards: verifyRows });

    console.log(`✅ Successfully seeded ${insertedCount} outcomes for ${studentId}`);
    console.log('\nWon awards:');
    verifyRows.forEach(row => {
      console.log(`  - ${row.title_name} (${row.status_detail}) - ${row.outcome_date}`);
    });

  } catch (error: any) {
    await client.query('ROLLBACK');
    log.error('Seeding failed', { error: error.message, stack: error.stack });
    throw error;
  } finally {
    await client.end();
  }
}

main().catch(e => {
  log.error('ETL script failed', { error: e.message });
  process.exit(1);
});

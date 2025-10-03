/**
 * ETL: Migrate award_targets to kb_items
 *
 * Transforms existing award_targets rows into the universal kb_items structure
 * Maps phase to tier1_state and tier2_substate
 */

import pg from 'pg';
import { createLogger } from '../../../observability/dist/unified-logger.js';

const { Client } = pg;
const log = createLogger('etl-migrate-awards');

// Phase mapping: award_targets.phase -> kb_items state
const PHASE_TO_STATE_MAP: Record<string, { tier1: string; tier2: string }> = {
  'initial': { tier1: 'Planned', tier2: 'Targeted' },
  'revised': { tier1: 'Planned', tier2: 'Revised' },
  'final': { tier1: 'Submitted', tier2: 'Applied' }
};

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();
    log.info('Connected to database');

    // Fetch all award_targets
    const { rows: awards } = await client.query(`
      SELECT *
      FROM award_targets
      ORDER BY student_id, as_of
    `);

    log.info('Fetched award_targets', { count: awards.length });

    await client.query('BEGIN');

    let migratedCount = 0;

    for (const award of awards) {
      const stateMapping = PHASE_TO_STATE_MAP[award.phase] || {
        tier1: 'Planned',
        tier2: 'Unknown'
      };

      const itemId = `award-${award.student_id}-${award.award_label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

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
          deadline_date,
          event_date,
          source_ref,
          confidence,
          created_ts,
          updated_ts
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (item_id) DO UPDATE SET
          tier1_state = EXCLUDED.tier1_state,
          tier2_substate = EXCLUDED.tier2_substate,
          event_date = EXCLUDED.event_date,
          source_ref = EXCLUDED.source_ref,
          updated_ts = now()
        `,
        [
          itemId,
          award.student_id,
          'Award_Competition',
          award.tier || null,
          award.award_label,
          stateMapping.tier1,
          stateMapping.tier2,
          award.rationale || null,
          award.tier ? 'tier' : null,
          award.tier || null,
          null, // deadline_date
          award.as_of, // event_date
          award.source_id,
          award.confidence,
          award.created_at,
          award.updated_at
        ]
      );

      migratedCount++;

      if (migratedCount % 10 === 0) {
        log.info('Migration progress', { migrated: migratedCount, total: awards.length });
      }
    }

    await client.query('COMMIT');
    log.info('Migration complete', { migrated_count: migratedCount });

    // Verify migration
    const { rows: verifyRows } = await client.query(`
      SELECT item_type, tier1_state, COUNT(*) as count
      FROM kb_items
      WHERE item_type = 'Award_Competition'
      GROUP BY item_type, tier1_state
    `);

    log.info('Verification', { summary: verifyRows });

    console.log(`✅ Successfully migrated ${migratedCount} award_targets to kb_items`);
    console.log('Summary:', verifyRows);

  } catch (error: any) {
    await client.query('ROLLBACK');
    log.error('Migration failed', { error: error.message, stack: error.stack });
    throw error;
  } finally {
    await client.end();
  }
}

main().catch(e => {
  log.error('ETL script failed', { error: e.message });
  process.exit(1);
});

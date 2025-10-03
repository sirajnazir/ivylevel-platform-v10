#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { Pool } from 'pg';
import { child } from '@packages/logger';

const log = child({ service: 'seed-canon' });

interface CanonEntry {
  student_id: string;
  source_type: string;
  source_title: string;
  doc_name: string;
  link: string;
  section?: string;
  notes?: string;
}

async function main() {
  const args = process.argv.slice(2);
  const inputFile = args.find(arg => arg.startsWith('--in='))?.split('=')[1] || 
                    args[args.indexOf('--in') + 1] || 
                    'data/kbase/canon.seed.yaml';

  if (!fs.existsSync(inputFile)) {
    log.error({ inputFile }, 'Canon seed file not found');
    process.exit(1);
  }

  log.info({ inputFile }, 'Loading canon seed file');

  // Load YAML
  const content = fs.readFileSync(inputFile, 'utf8');
  const canonSeed = yaml.parse(content) as Record<string, CanonEntry>;

  // Connect to database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ivylevel',
  });

  try {
    // Create canon table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS canon (
        key VARCHAR(255) PRIMARY KEY,
        student_id VARCHAR(255) NOT NULL,
        source_type VARCHAR(50) NOT NULL,
        source_title TEXT NOT NULL,
        doc_name VARCHAR(255),
        link TEXT,
        section VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    log.info('Canon table ready');

    // Process each entry
    let inserted = 0;
    let updated = 0;

    for (const [key, entry] of Object.entries(canonSeed)) {
      try {
        // Check if exists
        const existing = await pool.query(
          'SELECT key FROM canon WHERE key = $1',
          [key]
        );

        if (existing.rows.length > 0) {
          // Update
          await pool.query(`
            UPDATE canon 
            SET student_id = $2,
                source_type = $3,
                source_title = $4,
                doc_name = $5,
                link = $6,
                section = $7,
                notes = $8,
                updated_at = NOW()
            WHERE key = $1
          `, [
            key,
            entry.student_id,
            entry.source_type,
            entry.source_title,
            entry.doc_name,
            entry.link,
            entry.section || null,
            entry.notes || null
          ]);
          updated++;
          log.info({ key }, 'Updated canon entry');
        } else {
          // Insert
          await pool.query(`
            INSERT INTO canon (key, student_id, source_type, source_title, doc_name, link, section, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [
            key,
            entry.student_id,
            entry.source_type,
            entry.source_title,
            entry.doc_name,
            entry.link,
            entry.section || null,
            entry.notes || null
          ]);
          inserted++;
          log.info({ key }, 'Inserted canon entry');
        }
      } catch (error) {
        log.error({ key, error }, 'Failed to process canon entry');
      }
    }

    log.info({ inserted, updated, total: Object.keys(canonSeed).length }, 'Canon seeding complete');

    // Show sample entries
    const sample = await pool.query(`
      SELECT key, source_type, source_title
      FROM canon
      WHERE student_id = 'huda'
      ORDER BY key
      LIMIT 5
    `);

    log.info({ sample: sample.rows }, 'Sample canon entries');

  } catch (error) {
    log.error({ error }, 'Canon seeding failed');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(error => {
  log.error({ error }, 'Unhandled error');
  process.exit(1);
});
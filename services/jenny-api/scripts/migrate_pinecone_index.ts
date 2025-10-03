import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load from parent directory .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

console.log('Using Pinecone index:', process.env.PINECONE_INDEX);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const NEW_INDEX = process.env.PINECONE_INDEX || 'jenny-v3-3072-20250930';

async function embed(text: string): Promise<number[]> {
  const { data } = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: text
  });
  return data[0].embedding;
}

async function migrateJTBD() {
  console.log('Migrating JTBD vectors...');
  const { rows } = await pool.query(`
    SELECT jtbd_id as id, student_id, jtbd_title, synopsis
    FROM jtbd
    WHERE jtbd_title IS NOT NULL
  `);
  
  const index = pc.index(NEW_INDEX).namespace('jtbd');
  let count = 0;
  
  for (const row of rows) {
    const text = `${row.jtbd_title}\n${row.synopsis || ''}`.trim();
    if (!text) continue;
    
    const vector = await embed(text);
    await index.upsert([{
      id: row.id,
      values: vector,
      metadata: {
        student_id: row.student_id,
        text: text.slice(0, 1000) // Truncate for metadata limits
      }
    }]);
    
    count++;
    if (count % 10 === 0) console.log(`  Processed ${count}/${rows.length} JTBD items`);
  }
  
  console.log(`✓ Migrated ${count} JTBD vectors to namespace 'jtbd'`);
}

async function migrateInteractions() {
  console.log('Migrating interaction vectors...');
  const { rows } = await pool.query(`
    SELECT snippet_id as id, student_id, user_ask, jenny_reply
    FROM interactions
    WHERE user_ask IS NOT NULL OR jenny_reply IS NOT NULL
  `);
  
  const index = pc.index(NEW_INDEX).namespace('interactions');
  let count = 0;
  
  for (const row of rows) {
    const text = `${row.user_ask || ''}\n${row.jenny_reply || ''}`.trim();
    if (!text) continue;
    
    const vector = await embed(text);
    await index.upsert([{
      id: row.id,
      values: vector,
      metadata: {
        student_id: row.student_id,
        text: text.slice(0, 1000) // Truncate for metadata limits
      }
    }]);
    
    count++;
    if (count % 10 === 0) console.log(`  Processed ${count}/${rows.length} interactions`);
  }
  
  console.log(`✓ Migrated ${count} interaction vectors to namespace 'interactions'`);
}

async function verifyMigration() {
  console.log('\nVerifying migration...');
  const index = pc.index(NEW_INDEX);
  
  const jtbdStats = await index.namespace('jtbd').describeIndexStats();
  const interStats = await index.namespace('interactions').describeIndexStats();
  
  console.log('Index stats:');
  console.log(`  JTBD namespace: ${jtbdStats.recordCount} vectors`);
  console.log(`  Interactions namespace: ${interStats.recordCount} vectors`);
  console.log(`  Total: ${(jtbdStats.recordCount || 0) + (interStats.recordCount || 0)} vectors`);
}

async function main() {
  console.log(`Starting migration to index: ${NEW_INDEX}`);
  console.log('This will re-embed all data from Postgres and upload to Pinecone.\n');
  
  try {
    await migrateJTBD();
    await migrateInteractions();
    await verifyMigration();
    
    console.log('\n✅ Migration complete!');
    console.log(`\nNext steps:
1. Update your .env file:
   PINECONE_INDEX=${NEW_INDEX}
2. Restart your services
3. Run test queries to verify
`);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
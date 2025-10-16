import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Override with correct index
process.env.PINECONE_INDEX = 'jenny-v3-3072-20250930';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const INDEX = 'jenny-v3-3072-20250930';

async function embedBatch(texts: string[]): Promise<number[][]> {
  const { data } = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: texts
  });
  return data.map(d => d.embedding);
}

async function migrateJTBD() {
  console.log('Migrating JTBD vectors...');
  const { rows } = await pool.query(`
    SELECT jtbd_id as id, student_id, jtbd_title, synopsis
    FROM jtbd
    WHERE jtbd_title IS NOT NULL
    ORDER BY jtbd_id
  `);
  
  const index = pc.index(INDEX).namespace('jtbd');
  const batchSize = 10;
  
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const texts = batch.map(row => `${row.jtbd_title}\n${row.synopsis || ''}`.trim());
    const validBatch = batch.filter((row, idx) => texts[idx].length > 0);
    
    if (validBatch.length === 0) continue;
    
    const embeddings = await embedBatch(validBatch.map((_, idx) => texts[idx]));
    
    const vectors = validBatch.map((row, idx) => ({
      id: row.id,
      values: embeddings[idx],
      metadata: {
        student_id: row.student_id,
        text: texts[idx].slice(0, 1000)
      }
    }));
    
    await index.upsert(vectors);
    console.log(`  Processed ${Math.min(i + batchSize, rows.length)}/${rows.length} JTBD items`);
  }
  
  console.log(`✓ Migrated ${rows.length} JTBD vectors`);
}

async function migrateInteractions() {
  console.log('Migrating interaction vectors...');
  const { rows } = await pool.query(`
    SELECT snippet_id as id, student_id, user_ask, jenny_reply
    FROM interactions
    WHERE user_ask IS NOT NULL OR jenny_reply IS NOT NULL
    ORDER BY snippet_id
  `);
  
  const index = pc.index(INDEX).namespace('interactions');
  const batchSize = 10;
  
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const texts = batch.map(row => `${row.user_ask || ''}\n${row.jenny_reply || ''}`.trim());
    const validBatch = batch.filter((row, idx) => texts[idx].length > 0);
    
    if (validBatch.length === 0) continue;
    
    const embeddings = await embedBatch(validBatch.map((_, idx) => texts[idx]));
    
    const vectors = validBatch.map((row, idx) => ({
      id: row.id,
      values: embeddings[idx],
      metadata: {
        student_id: row.student_id,
        text: texts[idx].slice(0, 1000)
      }
    }));
    
    await index.upsert(vectors);
    console.log(`  Processed ${Math.min(i + batchSize, rows.length)}/${rows.length} interactions`);
  }
  
  console.log(`✓ Migrated ${rows.length} interaction vectors`);
}

async function main() {
  console.log(`Starting batch migration to index: ${INDEX}\n`);
  
  try {
    await migrateJTBD();
    await migrateInteractions();
    
    // Wait a moment for index to update
    console.log('\nWaiting for index to update...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Verify
    const index = pc.index(INDEX);
    const jtbdStats = await index.namespace('jtbd').describeIndexStats();
    const interStats = await index.namespace('interactions').describeIndexStats();
    
    console.log('\nFinal stats:');
    console.log(`  JTBD: ${jtbdStats.recordCount || 0} vectors`);
    console.log(`  Interactions: ${interStats.recordCount || 0} vectors`);
    
    console.log('\n✅ Migration complete!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
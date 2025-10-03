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

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const NEW_INDEX = process.env.PINECONE_INDEX || 'jenny-v3-3072-093025';

async function embed(text: string): Promise<number[]> {
  const { data } = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: text
  });
  return data[0].embedding;
}

async function migrateRemainingInteractions() {
  console.log('Checking existing interactions...');
  const index = pc.index(NEW_INDEX).namespace('interactions');
  
  // Get existing IDs
  const existingIds = new Set<string>();
  let paginationToken: string | undefined;
  
  do {
    const listResponse = await index.listPaginated({
      limit: 100,
      paginationToken
    });
    
    if (listResponse.vectors) {
      listResponse.vectors.forEach(v => existingIds.add(v.id));
    }
    
    paginationToken = listResponse.pagination?.next;
  } while (paginationToken);
  
  console.log(`Found ${existingIds.size} existing interactions in index`);
  
  // Get all interactions from DB
  const { rows } = await pool.query(`
    SELECT snippet_id as id, student_id, user_ask, jenny_reply
    FROM interactions
    WHERE user_ask IS NOT NULL OR jenny_reply IS NOT NULL
    ORDER BY snippet_id
  `);
  
  console.log(`Found ${rows.length} total interactions in database`);
  
  // Filter out already migrated ones
  const toMigrate = rows.filter(row => !existingIds.has(row.id));
  console.log(`Need to migrate ${toMigrate.length} remaining interactions`);
  
  let count = 0;
  const batchSize = 10;
  
  for (let i = 0; i < toMigrate.length; i += batchSize) {
    const batch = toMigrate.slice(i, i + batchSize);
    const vectors = [];
    
    for (const row of batch) {
      const text = `${row.user_ask || ''}\n${row.jenny_reply || ''}`.trim();
      if (!text) continue;
      
      try {
        const vector = await embed(text);
        vectors.push({
          id: row.id,
          values: vector,
          metadata: {
            student_id: row.student_id,
            text: text.slice(0, 1000) // Truncate for metadata limits
          }
        });
      } catch (error) {
        console.error(`Error embedding ${row.id}:`, error);
      }
    }
    
    if (vectors.length > 0) {
      await index.upsert(vectors);
      count += vectors.length;
      console.log(`  Processed ${count}/${toMigrate.length} remaining interactions`);
    }
  }
  
  console.log(`✓ Migrated ${count} additional interaction vectors`);
}

async function verifyFinal() {
  console.log('\nVerifying final migration...');
  const index = pc.index(NEW_INDEX);
  
  const stats = await index.describeIndexStats();
  console.log('Final index stats:');
  console.log(`  JTBD namespace: ${stats.namespaces?.jtbd?.recordCount || 0} vectors`);
  console.log(`  Interactions namespace: ${stats.namespaces?.interactions?.recordCount || 0} vectors`);
  console.log(`  Total: ${stats.totalRecordCount || 0} vectors`);
}

async function main() {
  try {
    await migrateRemainingInteractions();
    await verifyFinal();
    console.log('\n✅ Migration complete!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
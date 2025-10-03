import { Pinecone } from '@pinecone-database/pinecone';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load from parent directory .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

const OLD_INDEX = 'jenny-v3-3072-20250930';
const NEW_INDEX = 'jenny-v3-3072-093025';

async function copyNamespace(namespace: string) {
  console.log(`\nCopying namespace: ${namespace}`);
  
  const oldIndex = pc.index(OLD_INDEX).namespace(namespace);
  const newIndex = pc.index(NEW_INDEX).namespace(namespace);
  
  let paginationToken: string | undefined;
  let totalCopied = 0;
  
  do {
    // Fetch vectors from old index
    const listResponse = await oldIndex.listPaginated({
      limit: 100,
      paginationToken
    });
    
    if (!listResponse.vectors || listResponse.vectors.length === 0) {
      break;
    }
    
    // Fetch full vectors with values
    const ids = listResponse.vectors.map(v => v.id);
    const fetchResponse = await oldIndex.fetch(ids);
    
    // Prepare vectors for upsert
    const vectors = [];
    for (const id of ids) {
      const record = fetchResponse.records[id];
      if (record && record.values) {
        vectors.push({
          id: record.id,
          values: record.values,
          metadata: record.metadata
        });
      }
    }
    
    // Upsert to new index
    if (vectors.length > 0) {
      await newIndex.upsert(vectors);
      totalCopied += vectors.length;
      console.log(`  Copied ${totalCopied} vectors so far...`);
    }
    
    paginationToken = listResponse.pagination?.next;
  } while (paginationToken);
  
  console.log(`✓ Copied ${totalCopied} vectors in namespace '${namespace}'`);
  return totalCopied;
}

async function verifyIndexes() {
  console.log('\nVerifying indexes...');
  
  try {
    const oldStats = await pc.index(OLD_INDEX).describeIndexStats();
    console.log(`\nOld index (${OLD_INDEX}):`);
    console.log(`  Total vectors: ${oldStats.totalRecordCount || 0}`);
    console.log(`  Namespaces:`, oldStats.namespaces);
    
    const newStats = await pc.index(NEW_INDEX).describeIndexStats();
    console.log(`\nNew index (${NEW_INDEX}):`);
    console.log(`  Total vectors: ${newStats.totalRecordCount || 0}`);
    console.log(`  Namespaces:`, newStats.namespaces);
  } catch (error) {
    console.error('Error checking indexes:', error);
  }
}

async function main() {
  console.log(`Copying data from ${OLD_INDEX} to ${NEW_INDEX}`);
  console.log('This preserves existing embeddings without re-computing them.\n');
  
  try {
    // Check initial state
    await verifyIndexes();
    
    // Copy both namespaces
    const jtbdCount = await copyNamespace('jtbd');
    const interactionsCount = await copyNamespace('interactions');
    
    console.log(`\n✅ Copy complete!`);
    console.log(`   JTBD vectors: ${jtbdCount}`);
    console.log(`   Interaction vectors: ${interactionsCount}`);
    console.log(`   Total: ${jtbdCount + interactionsCount}`);
    
    // Verify final state
    await verifyIndexes();
    
    console.log(`\nNext steps:
1. Update your .env file:
   PINECONE_INDEX=${NEW_INDEX}
2. Restart your services
3. Run test queries to verify
`);
  } catch (error) {
    console.error('Copy failed:', error);
    process.exit(1);
  }
}

main();
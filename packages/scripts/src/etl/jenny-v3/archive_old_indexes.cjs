#!/usr/bin/env node

const { Pinecone } = require('@pinecone-database/pinecone');
require('dotenv').config();

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

async function listIndexes() {
  console.log('=== Listing All Pinecone Indexes ===\n');
  const indexes = await pc.listIndexes();
  
  for (const idx of indexes.indexes || []) {
    console.log(`${idx.name}:`);
    console.log(`  - Dimensions: ${idx.dimension}`);
    console.log(`  - Metric: ${idx.metric}`);
    console.log(`  - Status: ${idx.status?.ready ? 'Ready' : 'Not Ready'}`);
    
    if (idx.dimension === 1536) {
      console.log('  ⚠️  OLD INDEX - Should be archived');
    }
    console.log('');
  }
}

async function deleteIndex(indexName) {
  console.log(`=== Deleting Index: ${indexName} ===\n`);
  
  try {
    // Confirm it's an old index
    const indexes = await pc.listIndexes();
    const targetIndex = indexes.indexes?.find(idx => idx.name === indexName);
    
    if (!targetIndex) {
      console.error(`❌ Index '${indexName}' not found`);
      return;
    }
    
    if (targetIndex.dimension === 3072) {
      console.error(`❌ SAFETY CHECK: Refusing to delete 3072-dim index '${indexName}'`);
      console.error('   This appears to be a current v3 index!');
      return;
    }
    
    console.log(`Deleting ${indexName} (${targetIndex.dimension} dims)...`);
    await pc.deleteIndex(indexName);
    console.log(`✅ Successfully deleted index: ${indexName}`);
    
  } catch (error) {
    console.error('❌ Error deleting index:', error.message);
  }
}

async function main() {
  const command = process.argv[2];
  const indexName = process.argv[3];
  
  switch (command) {
    case 'list':
      await listIndexes();
      break;
      
    case 'delete':
      if (!indexName) {
        console.error('Usage: node archive_old_indexes.cjs delete <index-name>');
        process.exit(1);
      }
      await deleteIndex(indexName);
      break;
      
    default:
      console.log('Usage:');
      console.log('  node archive_old_indexes.cjs list');
      console.log('  node archive_old_indexes.cjs delete <index-name>');
      process.exit(1);
  }
}

main().catch(console.error);
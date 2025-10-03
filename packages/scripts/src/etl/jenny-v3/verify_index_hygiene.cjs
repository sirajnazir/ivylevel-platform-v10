#!/usr/bin/env node

const { Pinecone } = require('@pinecone-database/pinecone');
require('dotenv').config();

async function verifyIndexHygiene() {
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  
  console.log('=== Pinecone Index Hygiene Check ===\n');
  
  // Check current index
  const index = pc.index('jenny-v3-3072-20250930');
  const stats = await index.describeIndexStats();
  
  console.log('Current Index: jenny-v3-3072-20250930');
  console.log('Dimensions:', stats.dimension);
  console.log('Total Records:', stats.totalRecordCount);
  
  // Verify namespaces
  const namespaces = Object.keys(stats.namespaces || {});
  console.log('Namespaces:', namespaces);
  
  const validNamespaces = namespaces.every(ns => ['jtbd', 'interactions'].includes(ns));
  console.log('\nNamespace Check:', validNamespaces ? 'PASS ✓' : 'FAIL ✗');
  
  if (!validNamespaces) {
    const invalidNs = namespaces.filter(ns => !['jtbd', 'interactions'].includes(ns));
    console.log('❌ Invalid namespaces found:', invalidNs);
  }
  
  // Show namespace counts
  console.log('\nNamespace Record Counts:');
  for (const [ns, data] of Object.entries(stats.namespaces || {})) {
    console.log(`  - ${ns}: ${data.recordCount} records`);
  }
  
  // List all indexes
  console.log('\n=== All Pinecone Indexes ===');
  const indexes = await pc.listIndexes();
  
  let oldIndexFound = false;
  for (const idx of indexes.indexes || []) {
    console.log(`- ${idx.name}: ${idx.dimension} dims, ${idx.metric}`);
    if (idx.dimension === 1536) {
      console.log('  ⚠️  OLD INDEX - Should be archived');
      oldIndexFound = true;
    }
  }
  
  // Summary
  console.log('\n=== Summary ===');
  console.log('Current index (jenny-v3-3072-20250930):', validNamespaces ? 'CLEAN ✓' : 'NEEDS CLEANUP ✗');
  console.log('Old 1536-dim indexes:', oldIndexFound ? 'FOUND - Need archival ⚠️' : 'NONE ✓');
}

verifyIndexHygiene().catch(console.error);
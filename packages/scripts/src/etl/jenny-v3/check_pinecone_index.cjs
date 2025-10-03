#!/usr/bin/env node

const { Pinecone } = require('@pinecone-database/pinecone');
require('dotenv').config();

async function checkIndex() {
  const indexName = process.argv[2] || process.env.PINECONE_INDEX_NAME || 'jenny-v3-20250930';
  
  const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });

  try {
    console.log(`Checking index: ${indexName}\n`);
    
    // Check if index exists
    const indexes = await pc.listIndexes();
    const indexInfo = indexes.indexes?.find(idx => idx.name === indexName);
    
    if (!indexInfo) {
      console.log('Index not found!');
      console.log('\nAvailable indexes:');
      indexes.indexes?.forEach(idx => {
        console.log(`  - ${idx.name}`);
      });
      return;
    }

    console.log('Index found!');
    console.log(`Status: ${indexInfo.status?.state}`);
    console.log(`Ready: ${indexInfo.status?.ready}`);

    // Get index stats
    const index = pc.index(indexName);
    const stats = await index.describeIndexStats();
    
    console.log('\nIndex statistics:');
    console.log(`Total vectors: ${stats.totalRecordCount || 0}`);
    console.log(`Dimensions: ${stats.dimension || 'N/A'}`);
    
    if (stats.namespaces) {
      console.log('\nNamespaces:');
      Object.entries(stats.namespaces).forEach(([ns, info]) => {
        console.log(`  ${ns}: ${info.recordCount} vectors`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkIndex();
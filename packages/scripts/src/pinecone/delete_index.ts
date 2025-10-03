#!/usr/bin/env ts-node

import { Pinecone } from '@pinecone-database/pinecone';

async function deleteIndex(indexName: string) {
  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) {
    throw new Error('PINECONE_API_KEY environment variable is required');
  }

  const client = new Pinecone({
    apiKey,
  });

  try {
    console.log(`Checking if index "${indexName}" exists...`);
    const indexes = await client.listIndexes();
    const indexExists = indexes.indexes?.some(idx => idx.name === indexName);

    if (!indexExists) {
      console.log(`Index "${indexName}" does not exist.`);
      return;
    }

    console.log(`Deleting index "${indexName}"...`);
    await client.deleteIndex(indexName);
    console.log(`Index "${indexName}" deleted successfully.`);
  } catch (error) {
    console.error('Error deleting index:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  const indexName = process.argv[2] || process.env.PINECONE_INDEX || 'jenny-v1';
  
  console.log(`Pinecone Index Deletion Script`);
  console.log(`==============================`);
  console.log(`Index to delete: ${indexName}`);
  console.log();

  deleteIndex(indexName)
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Failed:', error.message);
      process.exit(1);
    });
}
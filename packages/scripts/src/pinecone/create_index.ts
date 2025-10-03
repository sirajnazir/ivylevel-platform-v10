#!/usr/bin/env ts-node

import { Pinecone } from '@pinecone-database/pinecone';

async function createIndex(
  indexName: string, 
  dimension: number = 1536, 
  metric: 'cosine' | 'euclidean' | 'dotproduct' = 'cosine'
) {
  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) {
    throw new Error('PINECONE_API_KEY environment variable is required');
  }

  const client = new Pinecone({
    apiKey,
  });

  try {
    console.log(`Checking if index "${indexName}" already exists...`);
    const indexes = await client.listIndexes();
    const indexExists = indexes.indexes?.some(idx => idx.name === indexName);

    if (indexExists) {
      console.log(`Index "${indexName}" already exists.`);
      return;
    }

    console.log(`Creating index "${indexName}"...`);
    console.log(`- Dimension: ${dimension}`);
    console.log(`- Metric: ${metric}`);

    await client.createIndex({
      name: indexName,
      dimension,
      metric,
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1'
        }
      }
    });

    console.log(`Index "${indexName}" created successfully.`);
    
    // Wait for index to be ready
    console.log('Waiting for index to be ready...');
    let isReady = false;
    let attempts = 0;
    const maxAttempts = 30;

    while (!isReady && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      const description = await client.describeIndex(indexName);
      isReady = description.status?.ready ?? false;
      attempts++;
      
      if (!isReady) {
        console.log(`Index status: ${description.status?.state || 'initializing'}... (attempt ${attempts}/${maxAttempts})`);
      }
    }

    if (isReady) {
      console.log('Index is ready!');
    } else {
      console.warn('Index creation timed out. It may still be initializing.');
    }
  } catch (error) {
    console.error('Error creating index:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  const indexName = process.argv[2] || 'jenny-v2';
  const dimension = parseInt(process.argv[3] || '1536');
  const metric = (process.argv[4] || 'cosine') as 'cosine' | 'euclidean' | 'dotproduct';
  
  console.log(`Pinecone Index Creation Script`);
  console.log(`==============================`);
  console.log(`Index name: ${indexName}`);
  console.log(`Dimension: ${dimension}`);
  console.log(`Metric: ${metric}`);
  console.log();

  createIndex(indexName, dimension, metric)
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Failed:', error.message);
      process.exit(1);
    });
}
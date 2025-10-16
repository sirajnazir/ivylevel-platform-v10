import { Pinecone } from '@pinecone-database/pinecone';
import * as dotenv from 'dotenv';

dotenv.config();

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

async function main() {
  console.log('🔍 Checking Pinecone configuration...\n');
  
  try {
    // List all indexes
    const indexes = await pc.listIndexes();
    console.log('Available indexes:');
    indexes.indexes?.forEach(idx => {
      console.log(`  - ${idx.name} (${idx.dimension}D, ${idx.metric}, ${idx.spec.pod?.replicas || 'serverless'})`);
    });
    
    if (indexes.indexes?.length === 0) {
      console.log('  No indexes found. You need to create one.');
    }
    
    console.log('\nExpected index from .env:', process.env.PINECONE_INDEX);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
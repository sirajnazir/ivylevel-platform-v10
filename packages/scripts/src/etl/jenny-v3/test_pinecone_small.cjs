#!/usr/bin/env node

const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAI } = require('openai');
require('dotenv').config();

async function testPinecone() {
  const indexName = 'jenny-v3-20250930';
  
  console.log('Testing Pinecone with small dataset...');
  console.log('Index:', indexName);
  
  try {
    // Initialize clients
    const pc = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    const index = pc.index(indexName);
    
    // Test data
    const testDocs = [
      { id: 'test-1', text: 'Huda scored 1530 on the SAT' },
      { id: 'test-2', text: 'Jenny helped with college applications' },
      { id: 'test-3', text: 'AI and journalism are key interests' }
    ];
    
    console.log('\nEmbedding and indexing test documents...');
    
    for (const doc of testDocs) {
      console.log(`Processing: ${doc.id}`);
      
      // Get embedding
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: doc.text,
      });
      
      // Upsert to Pinecone
      await index.namespace('test').upsert([{
        id: doc.id,
        values: response.data[0].embedding,
        metadata: { text: doc.text }
      }]);
      
      console.log(`  ✓ Indexed ${doc.id}`);
    }
    
    // Check stats
    console.log('\nChecking index stats...');
    await new Promise(r => setTimeout(r, 2000)); // Wait for eventual consistency
    
    const stats = await index.describeIndexStats();
    console.log('Total vectors:', stats.totalRecordCount || 0);
    
    if (stats.namespaces) {
      console.log('Namespaces:');
      Object.entries(stats.namespaces).forEach(([ns, info]) => {
        console.log(`  ${ns}: ${info.recordCount} vectors`);
      });
    }
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testPinecone();
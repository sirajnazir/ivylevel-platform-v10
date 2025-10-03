#!/usr/bin/env ts-node

const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAI } = require('openai');

async function testPineconeV2() {
  const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!
  });
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  
  console.log('Testing Pinecone jenny-v2 index...\n');
  
  try {
    // Get index
    const index = pc.index('jenny-v2');
    
    // Check index stats
    const indexStats = await index.describeIndexStats();
    console.log('Index Stats:', JSON.stringify(indexStats, null, 2));
    
    // Test embedding and query
    console.log('\nTesting query...');
    const testQuery = "What is my SAT score?";
    
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: testQuery
    });
    
    const vector = embedding.data[0].embedding;
    
    // Query transcript namespace
    const results = await index.namespace('transcript').query({
      vector,
      topK: 5,
      includeMetadata: true
    });
    
    console.log(`\nQuery: "${testQuery}"`);
    console.log(`Results: ${results.matches?.length || 0} matches`);
    
    if (results.matches && results.matches.length > 0) {
      console.log('\nTop matches:');
      results.matches.forEach((match, i) => {
        console.log(`\n${i + 1}. Score: ${match.score?.toFixed(3)}`);
        console.log(`   ID: ${match.id}`);
        console.log(`   Text: ${match.metadata?.text?.substring(0, 100)}...`);
      });
    }
    
    // Test other namespaces
    const namespaces = ['transcript', 'exec', 'imessage', 'appdoc', 'gameplan'];
    console.log('\n\nChecking all namespaces:');
    
    for (const ns of namespaces) {
      try {
        const nsStats = await index.namespace(ns).describeIndexStats();
        console.log(`- ${ns}: ${nsStats.vectors?.count || 0} vectors`);
      } catch (e) {
        console.log(`- ${ns}: No data yet`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

if (require.main === module) {
  testPineconeV2()
    .then(() => console.log('\nTest complete!'))
    .catch(console.error);
}
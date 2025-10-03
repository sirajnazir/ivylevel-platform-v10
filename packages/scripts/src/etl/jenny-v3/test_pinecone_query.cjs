#!/usr/bin/env node

const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAI } = require('openai');
require('dotenv').config();

async function testQuery(query, namespace) {
  const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const index = pc.index('jenny-v3-3072-20250930');
  
  console.log(`\nQuery: "${query}"`);
  console.log(`Namespace: ${namespace || 'all'}\n`);
  
  // Get embedding for query
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: query,
  });
  
  const queryEmbedding = response.data[0].embedding;
  
  // Search
  const ns = namespace ? index.namespace(namespace) : index;
  const results = await ns.query({
    vector: queryEmbedding,
    topK: 5,
    includeMetadata: true
  });
  
  console.log(`Found ${results.matches.length} matches:\n`);
  
  results.matches.forEach((match, i) => {
    console.log(`${i + 1}. [${match.score.toFixed(3)}] ${match.id}`);
    if (match.metadata?.text) {
      console.log(`   Text: ${match.metadata.text.slice(0, 100)}...`);
    }
    if (match.metadata?.tactic_name) {
      console.log(`   Tactic: ${match.metadata.tactic_name}`);
    }
    console.log('');
  });
}

async function main() {
  console.log('Testing Pinecone Query Capabilities');
  console.log('===================================');
  
  // Test JTBD query
  await testQuery('SAT score improvements', 'jtbd');
  
  // Test Interactions query
  await testQuery('how did we fix SAT slips?', 'interactions');
  
  // Test cross-namespace
  await testQuery('spaced practice tactics', null);
}

main().catch(console.error);
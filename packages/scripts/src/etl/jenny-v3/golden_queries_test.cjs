#!/usr/bin/env node

const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAI } = require('openai');
require('dotenv').config();

async function searchQuery(query) {
  const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const index = pc.index('jenny-v3-3072-20250930');
  
  // Get embedding
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: query,
  });
  
  // Search both namespaces
  const [jtbdResults, interResults] = await Promise.all([
    index.namespace('jtbd').query({
      vector: response.data[0].embedding,
      topK: 3,
      includeMetadata: true
    }),
    index.namespace('interactions').query({
      vector: response.data[0].embedding,
      topK: 3,
      includeMetadata: true
    })
  ]);
  
  return {
    jtbd: jtbdResults.matches.length,
    interactions: interResults.matches.length,
    topHit: interResults.matches[0] || jtbdResults.matches[0]
  };
}

async function main() {
  console.log('Golden Query Test Suite');
  console.log('======================\n');
  
  const queries = [
    "how did we fix SAT slips?",
    "UC outcomes and dates",
    "top reusable replies for spaced practice",
    "JTBD W041 synopsis"
  ];
  
  for (const q of queries) {
    try {
      const result = await searchQuery(q);
      console.log(`✔ "${q}"`);
      console.log(`  JTBD hits: ${result.jtbd}, Interaction hits: ${result.interactions}`);
      if (result.topHit) {
        console.log(`  Top: [${result.topHit.score.toFixed(3)}] ${result.topHit.id}`);
      }
      console.log('');
    } catch (error) {
      console.log(`✗ "${q}" - Error: ${error.message}`);
    }
  }
}

main().catch(console.error);
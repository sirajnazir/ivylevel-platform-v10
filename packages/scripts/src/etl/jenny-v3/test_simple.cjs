#!/usr/bin/env node

const fetch = require('node-fetch');

async function testSystem() {
  console.log('=== Jenny v3 System Test ===\n');
  
  // Test 1: Direct PostgreSQL query
  console.log('1. Testing PostgreSQL facts...');
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/ivylevel'
  });
  
  try {
    const result = await pool.query(`
      SELECT kind, value, fact_date, confidence, source_id 
      FROM vital_facts 
      WHERE student_id = 'huda-2025' 
      AND kind = 'sat_total_score'
      LIMIT 1
    `);
    
    if (result.rows.length > 0) {
      console.log('✓ PostgreSQL: SAT fact found');
      console.log(`  Value: ${result.rows[0].value}`);
      console.log(`  Date: ${result.rows[0].fact_date}`);
      console.log(`  Source: ${result.rows[0].source_id}`);
    } else {
      console.log('✗ No SAT fact found in PostgreSQL');
    }
  } catch (error) {
    console.error('✗ PostgreSQL error:', error.message);
  } finally {
    await pool.end();
  }
  console.log();
  
  // Test 2: Test server health
  console.log('2. Testing Test Server...');
  try {
    const resp = await fetch('http://localhost:4000/health');
    const data = await resp.json();
    console.log('✓ Test Server:', data.ok ? 'Running' : 'Error');
  } catch (error) {
    console.log('✗ Test Server not responding');
  }
  console.log();
  
  // Test 3: Chat via test server
  console.log('3. Testing chat through Test Server...');
  try {
    const resp = await fetch('http://localhost:4000/agent/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message: 'What is Huda\'s SAT score?',
        student_id: 'huda-2025'
      })
    });
    
    if (resp.ok) {
      const data = await resp.json();
      console.log('✓ Chat response received');
      console.log(`  Answer: ${data.answer?.substring(0, 100)}...`);
      console.log(`  Facts: ${data.vitals?.facts?.length || 0}`);
      console.log(`  Chips: ${data.chips?.length || 0}`);
    } else {
      console.log('✗ Chat failed:', resp.status, resp.statusText);
    }
  } catch (error) {
    console.log('✗ Chat error:', error.message);
  }
  console.log();
  
  // Test 4: Pinecone
  console.log('4. Testing Pinecone...');
  const { Pinecone } = require('@pinecone-database/pinecone');
  const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY || 'dummy'
  });
  
  try {
    const index = pc.index('jenny-v3-3072-20250930');
    const stats = await index.describeIndexStats();
    console.log('✓ Pinecone index accessible');
    console.log(`  Total vectors: ${stats.totalRecordCount}`);
    console.log(`  Namespaces: ${Object.keys(stats.namespaces || {}).join(', ')}`);
  } catch (error) {
    console.log('✗ Pinecone error:', error.message);
  }
  
  console.log('\n=== Summary ===');
  console.log('Chat UI: http://localhost:3000');
  console.log('Test Server: http://localhost:4000');
  console.log('Jenny API: http://localhost:8787');
  console.log('\nTest queries:');
  console.log('- "What is Huda\'s SAT score?"');
  console.log('- "How did we fix SAT slips?"');
  console.log('- "What were the UC outcomes?"');
}

testSystem().catch(console.error);
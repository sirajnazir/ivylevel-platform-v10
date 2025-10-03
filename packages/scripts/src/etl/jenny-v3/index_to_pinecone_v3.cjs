#!/usr/bin/env node

const { Pinecone } = require('@pinecone-database/pinecone');
const { Pool } = require('pg');
const { OpenAI } = require('openai');
require('dotenv').config();

const BATCH_SIZE = 20; // Smaller batch size to avoid timeouts
const INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'jenny-v3';
const TIMESTAMP = new Date().toISOString().slice(0, 10).replace(/-/g, '');

async function getOpenAIEmbedding(text) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: text,
  });

  return response.data[0].embedding;
}

async function createPineconeIndex(indexName) {
  const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });

  console.log(`Creating index "${indexName}"...`);

  try {
    await pc.createIndex({
      name: indexName,
      dimension: 3072,
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1'
        }
      }
    });

    console.log('Index created. Waiting for it to be ready...');
    
    // Wait for index to be ready
    let ready = false;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const desc = await pc.describeIndex(indexName);
      if (desc.status?.ready) {
        ready = true;
        break;
      }
      console.log(`  Status: ${desc.status?.state}...`);
    }

    if (!ready) {
      throw new Error('Index creation timed out');
    }

    console.log('Index is ready!');
  } catch (error) {
    if (error.message?.includes('already exists')) {
      console.log('Index already exists');
    } else {
      throw error;
    }
  }

  return pc.index(indexName);
}

async function archiveOldIndexes(pc, currentIndex) {
  console.log('\nArchiving old indexes...');
  
  const indexes = await pc.listIndexes();
  for (const idx of indexes.indexes || []) {
    if (idx.name.startsWith('jenny-v') && idx.name !== currentIndex) {
      const newName = `archive-${idx.name}-${TIMESTAMP}`;
      console.log(`  Renaming ${idx.name} to ${newName}`);
      
      // Pinecone doesn't support renaming, so we'll just log this
      console.log(`  NOTE: Manual action required - delete ${idx.name} after verifying ${currentIndex} works`);
    }
  }
}

async function indexDocuments(index, docs, namespace, getEmbedding) {
  console.log(`\nIndexing ${docs.length} documents to namespace "${namespace}"...`);

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE);
    const vectors = [];

    for (const doc of batch) {
      try {
        const embedding = await getEmbedding(doc.text);
        vectors.push({
          id: doc.id,
          values: embedding,
          metadata: {
            ...doc.metadata,
            text: doc.text.slice(0, 1000), // Truncate for metadata
          }
        });
      } catch (error) {
        console.error(`Error embedding document ${doc.id}:`, error.message);
      }
    }

    if (vectors.length > 0) {
      // Retry logic for upsert
      let retries = 3;
      while (retries > 0) {
        try {
          await index.namespace(namespace).upsert(vectors);
          console.log(`  Indexed ${i + vectors.length}/${docs.length} documents`);
          break;
        } catch (error) {
          retries--;
          if (retries === 0) {
            console.error(`Failed to index batch after 3 attempts: ${error.message}`);
          } else {
            console.log(`  Retry ${3 - retries}/3 after error: ${error.message}`);
            await new Promise(r => setTimeout(r, 2000)); // Wait 2s before retry
          }
        }
      }
    }
  }
}

async function main() {
  console.log('Jenny v3 Pinecone Indexing');
  console.log('==========================');

  // Database connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ivylevel',
  });

  try {
    // Create new index
    const pc = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    const index = await createPineconeIndex(INDEX_NAME);

    // Fetch JTBDs
    console.log('\nFetching JTBD data...');
    const jtbdResult = await pool.query(`
      SELECT 
        jtbd_id as id,
        COALESCE(jtbd_title, '') || ' ' || COALESCE(synopsis, '') AS text,
        json_build_object(
          'student_id', student_id,
          'jtbd_id', jtbd_id, 
          'phase', COALESCE(phase, ''),
          'date_start', COALESCE(date_start::text, ''),
          'created_ts', COALESCE(created_ts::text, '')
        ) AS metadata
      FROM jtbd
      WHERE LENGTH(COALESCE(jtbd_title, '') || ' ' || COALESCE(synopsis, '')) > 10
    `);
    console.log(`  Found ${jtbdResult.rows.length} JTBDs`);

    // Fetch Interactions
    console.log('\nFetching Interaction data...');
    const interResult = await pool.query(`
      SELECT 
        snippet_id as id,
        COALESCE(user_ask, '') || ' ' || COALESCE(jenny_reply, '') AS text,
        json_build_object(
          'student_id', student_id,
          'jtbd_id', jtbd_id,
          'tactic_name', COALESCE(tactic_name, ''),
          'framework', COALESCE(framework, ''),
          'occurred_at', COALESCE(occurred_at::text, ''),
          'channel', COALESCE(channel, '')
        ) AS metadata
      FROM interactions 
      WHERE excluded_from_tactic_scoring = false
        AND LENGTH(COALESCE(user_ask, '') || ' ' || COALESCE(jenny_reply, '')) > 10
    `);
    console.log(`  Found ${interResult.rows.length} Interactions`);

    // Fetch Outcomes
    console.log('\nFetching Outcome data...');
    const outcomeResult = await pool.query(`
      SELECT 
        outcome_id::text as id,
        COALESCE(type::text, '') || ' ' || 
        COALESCE(admission_result::text, '') || ' ' ||
        COALESCE(details_json::text, '') AS text,
        json_build_object(
          'student_id', student_id,
          'jtbd_id', jtbd_id,
          'type', type,
          'admission_result', admission_result,
          'occurred_at', occurred_at
        ) AS metadata
      FROM outcomes
      WHERE LENGTH(
        COALESCE(type::text, '') || ' ' || 
        COALESCE(admission_result::text, '') || ' ' ||
        COALESCE(details_json::text, '')
      ) > 10
    `);
    console.log(`  Found ${outcomeResult.rows.length} Outcomes`);

    // Index all documents
    await indexDocuments(index, jtbdResult.rows, 'jtbd', getOpenAIEmbedding);
    await indexDocuments(index, interResult.rows, 'interactions', getOpenAIEmbedding);
    await indexDocuments(index, outcomeResult.rows, 'outcomes', getOpenAIEmbedding);

    // Archive old indexes
    await archiveOldIndexes(pc, INDEX_NAME);

    console.log('\nIndexing complete!');
    console.log(`New index name: ${INDEX_NAME}`);
    console.log('\nUpdate your environment variables:');
    console.log(`  PINECONE_INDEX_NAME=${INDEX_NAME}`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}
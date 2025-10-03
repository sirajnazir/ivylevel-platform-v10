#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Map kind to namespace
function kindToNamespace(kind) {
  const mapping = {
    'TRANS-INTEL': 'transcript',
    'EXEC-INTEL': 'exec',
    'IMSG-INTEL': 'imessage',
    'IMSG': 'imessage',
    'APP-DOC': 'appdoc',
    'GAMEPLAN': 'gameplan'
  };
  return mapping[kind] || kind.toLowerCase();
}

async function embedText(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000), // Ensure we don't exceed token limit
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error creating embedding:', error);
    throw error;
  }
}

async function processAndUpsert() {
  const ragJsonl = process.env.RAG_JSONL || '/Users/snazir/ivylevel-platform-v10/data/kbase/rag_index_v2.jsonl';
  const indexName = process.env.PINECONE_INDEX || 'jenny-v2';
  const checkpointFile = ragJsonl + '.checkpoint';
  
  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) {
    throw new Error('PINECONE_API_KEY environment variable is required');
  }

  console.log(`Reading from: ${ragJsonl}`);
  console.log(`Upserting to index: ${indexName}`);

  const client = new Pinecone({ apiKey });
  const index = client.index(indexName);

  // Load entries from JSONL
  const entries = [];
  const fileStream = fs.createReadStream(ragJsonl);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line);
      if (entry.text && entry.text.trim().length > 10) {
        entries.push(entry);
      }
    } catch (err) {
      console.error(`Error parsing line: ${err}`);
    }
  }

  console.log(`Loaded ${entries.length} entries`);

  // Group by namespace
  const byNamespace = new Map();
  for (const entry of entries) {
    const namespace = entry._ns || kindToNamespace(entry.kind);
    if (!byNamespace.has(namespace)) {
      byNamespace.set(namespace, []);
    }
    byNamespace.get(namespace).push(entry);
  }

  console.log('Entries by namespace:');
  for (const [ns, items] of byNamespace.entries()) {
    console.log(`  ${ns}: ${items.length} entries`);
  }

  // Load checkpoint
  let processedIds = new Set();
  if (fs.existsSync(checkpointFile)) {
    const checkpoint = JSON.parse(fs.readFileSync(checkpointFile, 'utf-8'));
    processedIds = new Set(checkpoint.processedIds || []);
    console.log(`Resuming from checkpoint: ${processedIds.size} already processed`);
  }

  // Process each namespace
  for (const [namespace, namespaceEntries] of byNamespace.entries()) {
    console.log(`\nProcessing namespace: ${namespace}`);
    
    const toProcess = namespaceEntries.filter(e => !processedIds.has(e.id));
    console.log(`  ${toProcess.length} entries to process`);

    const batchSize = 50;
    for (let i = 0; i < toProcess.length; i += batchSize) {
      const batch = toProcess.slice(i, i + batchSize);
      console.log(`  Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(toProcess.length / batchSize)}...`);

      // Create vectors for batch
      const vectors = [];
      for (const entry of batch) {
        try {
          const embedding = await embedText(entry.text);
          
          // Prepare metadata
          const metadata = {
            text: entry.text.slice(0, 4000), // Pinecone text limit
            kind: entry.kind,
            phase: entry.phase || 'P1',
            week: entry.week || 0,
            student: entry.student || 'huda',
            coach: entry.coach || 'jenny',
            doc_name: entry.doc_name || '',
            date_iso: entry.date_iso || ''
          };
          
          vectors.push({
            id: entry.id,
            values: embedding,
            metadata
          });
          
          processedIds.add(entry.id);
        } catch (err) {
          console.error(`Error processing entry ${entry.id}:`, err);
        }
      }

      // Upsert vectors
      if (vectors.length > 0) {
        try {
          await index.namespace(namespace).upsert(vectors);
          console.log(`    Upserted ${vectors.length} vectors`);
        } catch (err) {
          console.error(`Error upserting batch:`, err);
        }
      }

      // Save checkpoint
      fs.writeFileSync(checkpointFile, JSON.stringify({
        processedIds: Array.from(processedIds),
        lastNamespace: namespace,
        timestamp: new Date().toISOString()
      }, null, 2));
    }
  }

  console.log(`\nTotal processed: ${processedIds.size} entries`);
  console.log('Done!');
}

processAndUpsert().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
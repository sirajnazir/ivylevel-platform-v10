#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';

interface RagEntry {
  id: string;
  text: string;
  kind: string;
  phase?: string;
  week?: number;
  date_iso?: string;
  layers?: string[];
  doc_name?: string;
  link?: string;
  coach?: string;
  student?: string;
  span?: string;
  _ns?: string;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Map kind to namespace
function kindToNamespace(kind: string): string {
  const mapping: Record<string, string> = {
    'TRANS-INTEL': 'transcript',
    'EXEC-INTEL': 'exec',
    'IMSG-INTEL': 'imessage',
    'APP-DOC': 'appdoc',
    'GAMEPLAN': 'gameplan'
  };
  return mapping[kind] || kind.toLowerCase();
}

async function embedText(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error creating embedding:', error);
    throw error;
  }
}

async function processAndUpsert(
  indexName: string,
  entries: RagEntry[],
  checkpointFile: string
) {
  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) {
    throw new Error('PINECONE_API_KEY environment variable is required');
  }

  const client = new Pinecone({ apiKey });
  const index = client.index(indexName);

  // Group by namespace
  const byNamespace = new Map<string, RagEntry[]>();
  for (const entry of entries) {
    const namespace = entry._ns || kindToNamespace(entry.kind);
    if (!byNamespace.has(namespace)) {
      byNamespace.set(namespace, []);
    }
    byNamespace.get(namespace)!.push(entry);
  }

  console.log('Entries by namespace:');
  for (const [ns, items] of byNamespace.entries()) {
    console.log(`  ${ns}: ${items.length} entries`);
  }

  // Load checkpoint
  let processedIds = new Set<string>();
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

      const vectors = [];
      for (const entry of batch) {
        try {
          const embedding = await embedText(entry.text);
          
          // Prepare metadata
          const metadata: Record<string, any> = {
            text: entry.text.substring(0, 1000), // Limit text in metadata
            kind: entry.kind,
            student: entry.student || 'huda-2025',
            coach: entry.coach || 'jenny'
          };

          // Add optional fields if present
          if (entry.phase) metadata.phase = entry.phase;
          if (entry.week !== undefined) metadata.week = entry.week;
          if (entry.date_iso) metadata.date_iso = entry.date_iso;
          if (entry.layers?.length) metadata.layers = entry.layers;
          if (entry.doc_name) metadata.doc_name = entry.doc_name;
          if (entry.link) metadata.link = entry.link;
          if (entry.span) metadata.span = entry.span;

          vectors.push({
            id: entry.id,
            values: embedding,
            metadata
          });

          processedIds.add(entry.id);
        } catch (error) {
          console.error(`  Error processing entry ${entry.id}:`, error);
        }
      }

      if (vectors.length > 0) {
        try {
          await index.namespace(namespace).upsert(vectors);
          console.log(`  Upserted ${vectors.length} vectors`);
        } catch (error) {
          console.error('  Error upserting batch:', error);
        }
      }

      // Save checkpoint
      fs.writeFileSync(checkpointFile, JSON.stringify({
        processedIds: Array.from(processedIds),
        lastUpdated: new Date().toISOString()
      }));
    }
  }

  console.log(`\nTotal processed: ${processedIds.size} entries`);
}

// Main execution
if (require.main === module) {
  const indexName = process.argv[2] || process.env.PINECONE_INDEX || 'jenny-v2';
  const jsonlPath = process.argv[3] || process.env.RAG_JSONL || 'data/kbase/rag_index_v2.jsonl';
  const checkpointFile = `${jsonlPath}.checkpoint`;

  console.log(`Pinecone Namespace Upsert Script`);
  console.log(`=================================`);
  console.log(`Index: ${indexName}`);
  console.log(`JSONL file: ${jsonlPath}`);
  console.log(`Checkpoint: ${checkpointFile}`);
  console.log();

  // Load entries
  if (!fs.existsSync(jsonlPath)) {
    console.error(`File not found: ${jsonlPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(jsonlPath, 'utf-8');
  const entries: RagEntry[] = content
    .trim()
    .split('\n')
    .filter(line => line.length > 0)
    .map(line => JSON.parse(line));

  console.log(`Loaded ${entries.length} entries from JSONL`);

  processAndUpsert(indexName, entries, checkpointFile)
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Failed:', error);
      process.exit(1);
    });
}
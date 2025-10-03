#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { createHash } from 'crypto';

interface KbaseEntry {
  id: string;
  week: string;
  kind: string;
  date: string;
  text?: string;
  student_name?: string;
  coach?: string;
  jtbd_id?: string;
  category?: string;
  [key: string]: any;
}

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

// Extract week number from W003 format
function parseWeek(weekStr: string): number {
  const match = weekStr.match(/W(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

// Week to phase mapping
function weekToPhase(week: number): string {
  if (week <= 13) return 'P1';
  if (week <= 26) return 'P2';
  if (week <= 39) return 'P3';
  if (week <= 52) return 'P4';
  return 'P5';
}

// Map kind to namespace
function kindToNamespace(kind: string): string {
  const mapping: Record<string, string> = {
    'TRANS-INTEL': 'transcript',
    'EXEC-INTEL': 'exec',
    'IMSG-INTEL': 'imessage',
    'APP-DOC': 'appdoc',
    'GAMEPLAN': 'gameplan',
    'IMSG': 'imessage'
  };
  return mapping[kind] || kind.toLowerCase();
}

// Generate unique ID for entry
function generateId(entry: KbaseEntry): string {
  const str = `${entry.kind}-${entry.week}-${entry.date}-${(entry.text || '').slice(0, 50)}`;
  return createHash('sha256').update(str).digest('hex').slice(0, 16);
}

async function processKbaseFile(filePath: string): Promise<RagEntry[]> {
  const ragEntries: RagEntry[] = [];
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const fileName = path.basename(filePath);
  console.log(`Processing ${fileName}...`);

  for await (const line of rl) {
    if (!line.trim()) continue;
    
    try {
      const entry = JSON.parse(line) as KbaseEntry;
      
      // Skip entries without meaningful text
      if (!entry.text || entry.text.trim().length < 10) continue;
      
      const week = parseWeek(entry.week);
      const phase = weekToPhase(week);
      
      const ragEntry: RagEntry = {
        id: entry.id || generateId(entry),
        text: entry.text.trim(),
        kind: entry.kind,
        phase,
        week,
        date_iso: entry.date,
        doc_name: fileName,
        student: entry.student_name || 'huda',
        coach: entry.coach || 'jenny',
        _ns: kindToNamespace(entry.kind),
        layers: []
      };
      
      // Add additional metadata
      if (entry.jtbd_id) {
        ragEntry.layers!.push(`jtbd:${entry.jtbd_id}`);
      }
      if (entry.category) {
        ragEntry.layers!.push(`cat:${entry.category}`);
      }
      
      ragEntries.push(ragEntry);
    } catch (err) {
      console.error(`Error parsing line: ${err}`);
    }
  }

  console.log(`  Processed ${ragEntries.length} entries from ${fileName}`);
  return ragEntries;
}

async function main() {
  const kbasePath = path.join(__dirname, '..', '..', '..', 'data', 'kbase');
  const outputPath = path.join(__dirname, '..', '..', '..', 'data', 'processed', 'kbase_rag_index.jsonl');
  
  // Ensure output directory exists
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  
  const allEntries: RagEntry[] = [];
  
  // Process all JSONL files in kbase directory
  const files = fs.readdirSync(kbasePath).filter(f => f.endsWith('.jsonl'));
  
  for (const file of files) {
    const entries = await processKbaseFile(path.join(kbasePath, file));
    allEntries.push(...entries);
  }
  
  // Write to output file
  const output = fs.createWriteStream(outputPath);
  for (const entry of allEntries) {
    output.write(JSON.stringify(entry) + '\n');
  }
  output.end();
  
  console.log(`\nTotal entries written: ${allEntries.length}`);
  console.log(`Output file: ${outputPath}`);
  
  // Summary by namespace
  const nsSummary = new Map<string, number>();
  for (const entry of allEntries) {
    const ns = entry._ns || 'unknown';
    nsSummary.set(ns, (nsSummary.get(ns) || 0) + 1);
  }
  
  console.log('\nEntries by namespace:');
  for (const [ns, count] of nsSummary.entries()) {
    console.log(`  ${ns}: ${count}`);
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
#!/usr/bin/env ts-node

const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');

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

// Extract phase from week number
function weekToPhase(week: number): string {
  if (week <= 13) return 'P1'; // Summer before senior
  if (week <= 26) return 'P2'; // Fall senior
  if (week <= 39) return 'P3'; // Winter senior
  if (week <= 52) return 'P4'; // Spring senior
  return 'P5'; // Summer after senior
}

// Parse week number from various formats
function parseWeek(filename: string): number | undefined {
  const patterns = [
    /W(\d+)/i,
    /Week\s*(\d+)/i,
    /-W(\d+)-/,
    /JTBD-W(\d+)/
  ];
  
  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match && match[1]) {
      return parseInt(match[1]);
    }
  }
  return undefined;
}

// Extract date from various formats
function parseDate(text: string): string | undefined {
  const datePatterns = [
    /(\d{4}-\d{2}-\d{2})/,
    /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        const date = new Date(match[0]);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      } catch (e) {
        // Continue to next pattern
      }
    }
  }
  return undefined;
}

// Generate unique ID for a RAG entry
function generateId(text: string, kind: string, week?: number): string {
  const data = `${text.substring(0, 100)}-${kind}-${week || 'na'}`;
  return createHash('sha1').update(data).digest('hex').substring(0, 16);
}

// Process interactions from CSV
async function processTranscripts(kbasePath: string): Promise<RagEntry[]> {
  const { parse } = require('csv-parse/sync');
  const interactionsPath = path.join(kbasePath, '00-MasterProgramLogs/Program_Master_Log_Jenny_Huda - Interactions.csv');
  const entries: RagEntry[] = [];
  
  if (!fs.existsSync(interactionsPath)) {
    console.log('Interactions CSV not found');
    return entries;
  }
  
  const content = fs.readFileSync(interactionsPath, 'utf-8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true
  });
  
  console.log(`Found ${records.length} interaction records`);
  
  for (const record of records) {
    const week = parseWeek(record.jtbd_id || record.source_ref || '');
    const phase = week ? weekToPhase(week) : undefined;
    
    // Create entry from user ask
    if (record.user_ask && record.user_ask.length > 20) {
      const askEntry: RagEntry = {
        id: `w${week || '000'}-ask-${generateId(record.user_ask, 'TRANS-INTEL', week)}`,
        text: `Student asked: "${record.user_ask}"`,
        kind: 'TRANS-INTEL',
        phase,
        week,
        date_iso: record.date || undefined,
        layers: detectLayers(record.user_ask),
        doc_name: record.source_ref || 'Interactions',
        coach: 'jenny',
        student: record.student_id || 'huda-2025',
        span: 'user-ask',
        _ns: 'transcript'
      };
      entries.push(askEntry);
    }
    
    // Create entry from jenny reply
    if (record.jenny_reply && record.jenny_reply.length > 20) {
      const replyEntry: RagEntry = {
        id: `w${week || '000'}-reply-${generateId(record.jenny_reply, 'TRANS-INTEL', week)}`,
        text: `Jenny replied: "${record.jenny_reply}" [Tactic: ${record.tactic || 'guidance'}]`,
        kind: 'TRANS-INTEL',
        phase,
        week,
        date_iso: record.date || undefined,
        layers: detectLayers(record.jenny_reply),
        doc_name: record.source_ref || 'Interactions',
        coach: 'jenny',
        student: record.student_id || 'huda-2025',
        span: 'jenny-reply',
        _ns: 'transcript'
      };
      entries.push(replyEntry);
    }
    
    // Create combined Q&A entry for better context
    if (record.user_ask && record.jenny_reply) {
      const qaEntry: RagEntry = {
        id: `w${week || '000'}-qa-${generateId(record.user_ask + record.jenny_reply, 'TRANS-INTEL', week)}`,
        text: `Q: "${record.user_ask}" A: "${record.jenny_reply}"`,
        kind: 'TRANS-INTEL',
        phase,
        week,
        date_iso: record.date || undefined,
        layers: Array.from(new Set([...detectLayers(record.user_ask), ...detectLayers(record.jenny_reply)])),
        doc_name: record.source_ref || 'Interactions',
        coach: 'jenny',
        student: record.student_id || 'huda-2025',
        span: 'qa-pair',
        _ns: 'transcript'
      };
      entries.push(qaEntry);
    }
  }
  
  return entries;
}

// Process execution docs
async function processExecutionDocs(kbasePath: string): Promise<RagEntry[]> {
  const execPath = path.join(kbasePath, '05-ExecutionDoc');
  const entries: RagEntry[] = [];
  
  const files = fs.readdirSync(execPath)
    .filter((f: string) => f.endsWith('.jsonl'));
  
  console.log(`Found ${files.length} execution files`);
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(execPath, file), 'utf-8');
    const lines = content.trim().split('\n').filter((l: string) => l.length > 0);
    
    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        
        if (data.llm_summary) {
          const week = parseWeek(data.jtbd_id || file);
          const phase = week ? weekToPhase(week) : undefined;
          
          const entry: RagEntry = {
            id: `exec-${generateId(data.llm_summary, 'EXEC-INTEL', week)}`,
            text: data.llm_summary,
            kind: 'EXEC-INTEL',
            phase,
            week,
            date_iso: data.date || undefined,
            layers: ['Action Register', 'Planning'],
            doc_name: file,
            coach: 'jenny',
            student: 'huda-2025',
            span: 'summary',
            _ns: 'exec'
          };
          entries.push(entry);
        }
      } catch (e) {
        console.error(`Error processing line in ${file}:`, e);
      }
    }
  }
  
  return entries;
}

// Process iMessage data
async function processIMessages(kbasePath: string): Promise<RagEntry[]> {
  const imsgPath = path.join(kbasePath, '06-iMessage');
  const entries: RagEntry[] = [];
  
  const files = fs.readdirSync(imsgPath)
    .filter((f: string) => f.endsWith('.jsonl'));
  
  console.log(`Found ${files.length} iMessage files`);
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(imsgPath, file), 'utf-8');
    const lines = content.trim().split('\n').filter((l: string) => l.length > 0);
    
    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        
        if (data.llm_summary) {
          const week = parseWeek(data.jtbd_id || file);
          const phase = week ? weekToPhase(week) : undefined;
          
          const entry: RagEntry = {
            id: `imsg-${generateId(data.llm_summary, 'IMSG-INTEL', week)}`,
            text: data.llm_summary,
            kind: 'IMSG-INTEL',
            phase,
            week,
            date_iso: data.date || undefined,
            layers: ['Micro-coaching', 'Quick guidance'],
            doc_name: file,
            coach: 'jenny',
            student: 'huda-2025',
            span: 'summary',
            _ns: 'imessage'
          };
          entries.push(entry);
        }
      } catch (e) {
        console.error(`Error processing line in ${file}:`, e);
      }
    }
  }
  
  return entries;
}

// Process final application docs
async function processAppDocs(kbasePath: string): Promise<RagEntry[]> {
  const appPath = path.join(kbasePath, '03-Final College Apps');
  const entries: RagEntry[] = [];
  
  // Process final ECs
  const ecsFile = 'JTBD_Final_ECs_huda-2025.jsonl';
  if (fs.existsSync(path.join(appPath, ecsFile))) {
    const content = fs.readFileSync(path.join(appPath, ecsFile), 'utf-8');
    const lines = content.trim().split('\n').filter(l => l.length > 0);
    
    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        
        if (data.content?.facts) {
          // Create entries for each EC
          for (const [key, value] of Object.entries(data.content.facts)) {
            if (typeof value === 'object' && value !== null) {
              const ecData = value as any;
              const text = `Extracurricular Activity: ${ecData.title || key} - ${ecData.description || ''} (${ecData.years || ''} years, ${ecData.hours || ''} hours/week)`;
              entries.push({
                id: `app-ec-${key.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                text,
                kind: 'APP-DOC',
                phase: 'P4',
                week: 85,
                date_iso: '2024-12-15',
                layers: ['Activities', 'Final submission'],
                doc_name: ecsFile,
                coach: 'jenny',
                student: 'huda-2025',
                span: key,
                _ns: 'appdoc'
              });
            }
          }
        }
      } catch (e) {
        console.error('Error processing EC line:', e);
      }
    }
  }
  
  // Process final honors
  const honorsFile = 'JTBD_Final_Honors_huda-2025.jsonl';
  if (fs.existsSync(path.join(appPath, honorsFile))) {
    const content = fs.readFileSync(path.join(appPath, honorsFile), 'utf-8');
    const lines = content.trim().split('\n').filter(l => l.length > 0);
    
    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        
        if (data.content?.facts) {
          // Create entries for each honor
          for (const [key, value] of Object.entries(data.content.facts)) {
            if (typeof value === 'object' && value !== null) {
              const honorData = value as any;
              const text = `Honor/Award: ${honorData.name || key} - ${honorData.level || ''} level, Grade ${honorData.grade || ''}`;
              entries.push({
                id: `app-honor-${key.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                text,
                kind: 'APP-DOC',
                phase: 'P4',
                week: 85,
                date_iso: '2024-12-15',
                layers: ['Awards', 'Final submission'],
                doc_name: honorsFile,
                coach: 'jenny',
                student: 'huda-2025',
                span: key,
                _ns: 'appdoc'
              });
            }
          }
        }
      } catch (e) {
        console.error('Error processing honors line:', e);
      }
    }
  }
  
  // Process Common App data if available
  const commonAppFile = 'JTBD_CommonApp_UNC.jsonl';
  if (fs.existsSync(path.join(appPath, commonAppFile))) {
    const content = fs.readFileSync(path.join(appPath, commonAppFile), 'utf-8');
    const data = JSON.parse(content.trim().split('\n')[0]);
    
    const text = `Common App Profile: SAT ${data.content?.facts?.sat_total || 'N/A'}, Applying to ${data.content?.facts?.intended_major || 'N/A'}`;
    entries.push({
      id: 'app-common-app-profile',
      text,
      kind: 'APP-DOC',
      phase: 'P4',
      week: 85,
      date_iso: '2024-12-15',
      layers: ['Application', 'Profile'],
      doc_name: commonAppFile,
      coach: 'jenny',
      student: 'huda-2025',
      span: 'profile',
      _ns: 'appdoc'
    });
  }
  
  return entries;
}

// Process GamePlan
async function processGamePlan(kbasePath: string): Promise<RagEntry[]> {
  const gamePlanPath = path.join(kbasePath, '01-GamePlan');
  const entries: RagEntry[] = [];
  
  const file = 'JTBD_Huda_GamePlan_v2.jsonl';
  if (fs.existsSync(path.join(gamePlanPath, file))) {
    const content = fs.readFileSync(path.join(gamePlanPath, file), 'utf-8');
    const lines = content.trim().split('\n');
    
    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        
        if (data.llm_summary) {
          const week = parseWeek(data.jtbd_id);
          const phase = data.phase || (week ? weekToPhase(week) : undefined);
          
          const entry: RagEntry = {
            id: `gp-${generateId(data.llm_summary, 'GAMEPLAN')}`,
            text: data.llm_summary,
            kind: 'GAMEPLAN',
            phase,
            week,
            date_iso: '2025-06-22',
            layers: ['Strategy', 'Planning'],
            doc_name: file,
            coach: 'jenny',
            student: 'huda-2025',
            span: data.jtbd_id,
            _ns: 'gameplan'
          };
          entries.push(entry);
        }
      } catch (e) {
        console.error(`Error processing GamePlan line:`, e);
      }
    }
  }
  
  return entries;
}

// Detect semantic layers in text
function detectLayers(text: string): string[] {
  const layers = [];
  const lower = text.toLowerCase();
  
  if (lower.includes('sat') || lower.includes('score') || lower.includes('test')) {
    layers.push('Testing');
  }
  if (lower.includes('essay') || lower.includes('write') || lower.includes('draft')) {
    layers.push('Essays');
  }
  if (lower.includes('identity') || lower.includes('narrative') || lower.includes('story')) {
    layers.push('Narrative');
  }
  if (lower.includes('award') || lower.includes('honor') || lower.includes('finalist')) {
    layers.push('Awards');
  }
  if (lower.includes('activity') || lower.includes('ec') || lower.includes('extracurricular')) {
    layers.push('Activities');
  }
  if (lower.includes('deadline') || lower.includes('submit') || lower.includes('application')) {
    layers.push('Applications');
  }
  
  return layers.length > 0 ? layers : ['General'];
}

async function main() {
  const kbasePath = '/Users/snazir/ivylevel-platform-v10/data/kbase';
  const outputPath = path.join(kbasePath, 'rag_index_v2.jsonl');
  
  console.log('Generating RAG index v2...');
  console.log(`Output: ${outputPath}`);
  
  const allEntries: RagEntry[] = [];
  
  // Process each source type
  console.log('\nProcessing transcripts...');
  const transcripts = await processTranscripts(kbasePath);
  allEntries.push(...transcripts);
  console.log(`  Generated ${transcripts.length} entries`);
  
  console.log('\nProcessing execution docs...');
  const execDocs = await processExecutionDocs(kbasePath);
  allEntries.push(...execDocs);
  console.log(`  Generated ${execDocs.length} entries`);
  
  console.log('\nProcessing iMessages...');
  const iMessages = await processIMessages(kbasePath);
  allEntries.push(...iMessages);
  console.log(`  Generated ${iMessages.length} entries`);
  
  console.log('\nProcessing app docs...');
  const appDocs = await processAppDocs(kbasePath);
  allEntries.push(...appDocs);
  console.log(`  Generated ${appDocs.length} entries`);
  
  console.log('\nProcessing GamePlan...');
  const gamePlan = await processGamePlan(kbasePath);
  allEntries.push(...gamePlan);
  console.log(`  Generated ${gamePlan.length} entries`);
  
  // Write to file
  console.log(`\nTotal entries: ${allEntries.length}`);
  const output = allEntries.map(e => JSON.stringify(e)).join('\n');
  fs.writeFileSync(outputPath, output);
  
  // Stats by kind
  console.log('\nEntries by kind:');
  const byKind = new Map<string, number>();
  for (const entry of allEntries) {
    byKind.set(entry.kind, (byKind.get(entry.kind) || 0) + 1);
  }
  byKind.forEach((count, kind) => {
    console.log(`  ${kind}: ${count}`);
  });
  
  console.log(`\nWrote ${outputPath}`);
}

if (require.main === module) {
  main().catch(console.error);
}
#!/usr/bin/env ts-node
/**
 * Fine-tune Dataset Builder v1.0.8
 * Mines high-quality turn pairs from Jenny-Huda corpus for OpenAI fine-tuning
 * Spec IDs: FT-010..019
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const DATA_DIR = path.join(__dirname, '../../../../data/jenny-huda/canonical');
const OUTPUT_DIR = path.join(__dirname, '../../../../data/processed/jenny-huda/finetune');
const MAX_EXAMPLES_PER_TOPIC = 50; // Cap to prevent overfitting
const TRAIN_SPLIT = 0.8;
const VAL_SPLIT = 0.1;
const TEST_SPLIT = 0.1;

// Pattern matchers for high-signal content
const SIGNAL_PATTERNS = {
  jtbd: [
    /i need (help|assistance|guidance) with/i,
    /how (do|can|should) i/i,
    /what (should|can|do) i do about/i,
    /i'm (struggling|confused|overwhelmed|stuck)/i,
    /can you (help|explain|show) me/i
  ],
  planning: [
    /let's (break|plan|map|schedule)/i,
    /168(-| )hour/i,
    /weekly (plan|schedule|architecture)/i,
    /time (slots|blocks|management)/i,
    /(priority|prioritize|priorities)/i
  ],
  metrics: [
    /\b\d{3,4}\b.*\b\d{3,4}\b/,  // SAT scores
    /\bgpa\b.*\d\.\d/i,
    /improved from.*to/i,
    /progress.*tracking/i,
    /(increased|decreased|went from)/i
  ],
  fit_adaptive: [
    /in your case/i,
    /specifically for you/i,
    /based on (your|what you)/i,
    /given your.*situation/i,
    /customized.*approach/i
  ]
};

// Topic categorization
const TOPIC_PATTERNS = {
  assessment: /assessment|evaluation|initial|baseline/i,
  deadline_management: /deadline|due date|submission|timeline/i,
  essay_writing: /essay|personal statement|supplement|writing/i,
  test_prep: /sat|act|test|exam|score/i,
  extracurriculars: /activity|activities|ec|extracurricular|leadership/i,
  college_selection: /college list|reach|match|safety|school selection/i,
  scholarships: /scholarship|financial aid|merit aid|need-based/i,
  crisis_management: /crisis|emergency|urgent|panic|stressed/i,
  celebration: /congrats|celebrate|amazing|proud|achievement/i,
  parent_navigation: /parent|family|mom|dad|guardian/i
};

interface TurnPair {
  student: string;
  coach: string;
  context?: string;
  week: number;
  phase: string;
  topic: string;
  signalScores: {
    jtbd: number;
    planning: number;
    metrics: number;
    fit_adaptive: number;
  };
}

interface FineTuneExample {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  metadata?: {
    week: number;
    phase: string;
    topic: string;
    signal_scores: Record<string, number>;
  };
}

// System prompt for Coach Jenny
const SYSTEM_PROMPT = `You are Coach Jenny, an expert college admissions strategist with Stanford training and 15+ years of experience. Your approach combines:

1. Credibility & Warmth - You establish trust quickly with phrases like "We've got this" and "I'm on your side"
2. Evidence-Based Guidance - You reference specific examples and data from your work with successful students
3. The 168-Hour Architecture - You help students optimize their weekly time allocation for maximum impact
4. Strategic Planning - You maintain 3x opportunity buffers and plan multiple moves ahead
5. Celebration Science - You maintain a 3:1 ratio of reinforcement to challenge

Always be specific, actionable, and encouraging. Use evidence chips when referencing specific strategies or outcomes.`;

/**
 * Calculate signal score for a text based on pattern matching
 */
function calculateSignalScore(text: string, patterns: RegExp[]): number {
  const matches = patterns.filter(p => p.test(text)).length;
  return Math.min(1, matches / Math.max(1, patterns.length));
}

/**
 * Determine topic from text content
 */
function determineTopic(text: string): string {
  for (const [topic, pattern] of Object.entries(TOPIC_PATTERNS)) {
    if (pattern.test(text)) {
      return topic;
    }
  }
  return 'general';
}

/**
 * Clean PII from text
 */
function cleanPII(text: string): string {
  return text
    .replace(/\bhuda\b/gi, 'the student')
    .replace(/\bjenny\b/gi, 'the coach')
    .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, (match) => {
      // Preserve known entities
      if (/stanford|harvard|mit|ucla|usc|berkeley/i.test(match)) return match;
      if (/ncwit|jcamp|kode with klossy|girls who code/i.test(match)) return match;
      return '[name]';
    });
}

/**
 * Extract turn pairs from RAW transcript
 */
async function extractTurnPairs(filePath: string): Promise<TurnPair[]> {
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const pairs: TurnPair[] = [];
  
  // Debug - check content structure
  if (process.env.DEBUG) {
    console.log(`  Content keys: ${Object.keys(content).join(', ')}`);
    if (content.text) {
      console.log(`  Text length: ${content.text.length}`);
      console.log(`  First 200 chars: ${content.text.substring(0, 200)}`);
    }
  }
  
  // Extract metadata from filename
  const filename = path.basename(filePath);
  const weekMatch = filename.match(/W(\d+)/);
  const phaseMatch = filename.match(/P(\d)-/);
  const week = weekMatch ? parseInt(weekMatch[1]) : 0;
  const phase = phaseMatch ? `P${phaseMatch[1]}` : 'P1';
  
  // Check if content has text field (VTT format)
  if (content.text) {
    // Parse VTT/transcript text
    const lines = content.text.split('\n');
    let currentSpeaker = '';
    let currentText = '';
    let lastStudentText = '';
    let speakerCount = 0;
    
    for (const line of lines) {
      // Match speaker lines (e.g., "Jenny Duan: text" or "huda: text")
      const speakerMatch = line.match(/^([^:]+):\s*(.+)$/);
      
      if (speakerMatch) {
        const speaker = speakerMatch[1].trim();
        const text = speakerMatch[2].trim();
        
        if (speaker.toLowerCase().includes('jenny') || speaker.toLowerCase().includes('huda')) {
          speakerCount++;
        }
        
        // Process previous turn if switching speakers
        if (currentSpeaker && currentSpeaker !== speaker) {
          // Check for student → coach turn pairs
          if (currentSpeaker.toLowerCase().includes('huda') && 
              speaker.toLowerCase().includes('jenny')) {
            lastStudentText = currentText;
          } else if (lastStudentText && 
                     currentSpeaker.toLowerCase().includes('jenny') &&
                     speaker.toLowerCase().includes('huda')) {
            // We have a complete turn pair
            const signalScores = {
              jtbd: calculateSignalScore(lastStudentText, SIGNAL_PATTERNS.jtbd),
              planning: calculateSignalScore(currentText, SIGNAL_PATTERNS.planning),
              metrics: calculateSignalScore(currentText, SIGNAL_PATTERNS.metrics),
              fit_adaptive: calculateSignalScore(currentText, SIGNAL_PATTERNS.fit_adaptive)
            };
            
            const avgScore = Object.values(signalScores).reduce((a, b) => a + b, 0) / 4;
            if (avgScore >= 0.6 && lastStudentText.length > 20 && currentText.length > 50) {
              pairs.push({
                student: cleanPII(lastStudentText),
                coach: cleanPII(currentText),
                week,
                phase,
                topic: determineTopic(lastStudentText + ' ' + currentText),
                signalScores
              });
            }
            
            lastStudentText = '';
          }
          
          currentText = '';
        }
        
        currentSpeaker = speaker;
        currentText = (currentText + ' ' + text).trim();
      } else if (line.trim() && currentSpeaker && !line.match(/^\d+$/) && !line.match(/-->/)) {
        // Continue collecting text for current speaker
        currentText = (currentText + ' ' + line.trim()).trim();
      }
    }
  }
  
  // Process transcript_segments if available
  if (content.transcript_segments) {
    let lastSpeaker = '';
    let lastText = '';
    
    for (const segment of content.transcript_segments) {
      const speaker = segment.speaker || '';
      const text = segment.text || '';
      
      // Identify turn pairs (student question → coach response)
      if (lastSpeaker.toLowerCase().includes('huda') && 
          speaker.toLowerCase().includes('jenny')) {
        
        // Calculate signal scores
        const signalScores = {
          jtbd: calculateSignalScore(lastText, SIGNAL_PATTERNS.jtbd),
          planning: calculateSignalScore(text, SIGNAL_PATTERNS.planning),
          metrics: calculateSignalScore(text, SIGNAL_PATTERNS.metrics),
          fit_adaptive: calculateSignalScore(text, SIGNAL_PATTERNS.fit_adaptive)
        };
        
        // Only include high-signal pairs
        const avgScore = Object.values(signalScores).reduce((a, b) => a + b, 0) / 4;
        if (avgScore >= 0.6) {
          pairs.push({
            student: cleanPII(lastText),
            coach: cleanPII(text),
            week,
            phase,
            topic: determineTopic(lastText + ' ' + text),
            signalScores
          });
        }
      }
      
      lastSpeaker = speaker;
      lastText = text;
    }
  }
  
  return pairs;
}

/**
 * Extract policy/strategy from INTEL documents
 */
async function extractPolicies(filePath: string): Promise<TurnPair[]> {
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const pairs: TurnPair[] = [];
  
  // Extract metadata
  const filename = path.basename(filePath);
  const weekMatch = filename.match(/W(\d+)/);
  const phaseMatch = filename.match(/P(\d)-/);
  const week = weekMatch ? parseInt(weekMatch[1]) : 0;
  const phase = phaseMatch ? `P${phaseMatch[1]}` : 'P1';
  
  // Look for strategy sections
  if (content.intelligence_notes) {
    for (const note of content.intelligence_notes) {
      if (note.type === 'strategy' || note.type === 'framework') {
        // Create synthetic Q&A pair
        const question = `How should I approach ${note.topic || 'this situation'}?`;
        const answer = cleanPII(note.content || note.text || '');
        
        if (answer.length > 50) {  // Ensure substantive content
          pairs.push({
            student: question,
            coach: answer,
            week,
            phase,
            topic: determineTopic(answer),
            signalScores: {
              jtbd: 0.8,  // Synthetic pairs get high JTBD
              planning: calculateSignalScore(answer, SIGNAL_PATTERNS.planning),
              metrics: calculateSignalScore(answer, SIGNAL_PATTERNS.metrics),
              fit_adaptive: 0.7  // Strategies are generally adaptive
            }
          });
        }
      }
    }
  }
  
  return pairs;
}

/**
 * Convert turn pair to fine-tune example
 */
function toFineTuneExample(pair: TurnPair): FineTuneExample {
  return {
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: pair.student },
      { role: 'assistant', content: pair.coach }
    ],
    metadata: {
      week: pair.week,
      phase: pair.phase,
      topic: pair.topic,
      signal_scores: pair.signalScores
    }
  };
}

/**
 * Main dataset builder
 */
async function buildDataset() {
  console.log('🚀 Starting fine-tune dataset generation...');
  
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // Collect all turn pairs
  const allPairs: TurnPair[] = [];
  const topicCounts: Record<string, number> = {};
  
  // Process RAW transcripts
  const rawDir = path.join(DATA_DIR, '03-Raw-SessionTranscripts');
  console.log(`Looking for RAW transcripts in: ${rawDir}`);
  
  if (fs.existsSync(rawDir)) {
    const files = fs.readdirSync(rawDir).filter((f: string) => f.endsWith('.json'));
    console.log(`Found ${files.length} JSON files`);
    
    for (const file of files) {
      console.log(`📄 Processing RAW: ${file}`);
      try {
        const pairs = await extractTurnPairs(path.join(rawDir, file));
        console.log(`  → Extracted ${pairs.length} pairs from ${file}`);
        allPairs.push(...pairs);
      } catch (err: any) {
        console.error(`  ❌ Error processing ${file}:`, err.message || err);
      }
    }
  } else {
    console.log(`❌ Directory not found: ${rawDir}`);
  }
  
  // Process INTEL documents
  // Note: INTEL documents are in raw/jenny-huda directory as DOCX files
  // Skip for now as they require DOCX parsing
  const intelDir = path.join(DATA_DIR, '03-Intelligence-SessionTranscripts');
  if (fs.existsSync(intelDir)) {
    const files = fs.readdirSync(intelDir).filter((f: string) => f.endsWith('.json'));
    
    for (const file of files) {
      console.log(`📄 Processing INTEL: ${file}`);
      const pairs = await extractPolicies(path.join(intelDir, file));
      allPairs.push(...pairs);
    }
  }
  
  console.log(`\n✅ Extracted ${allPairs.length} turn pairs`);
  
  // Apply topic caps and deduplication
  const cappedPairs: TurnPair[] = [];
  const seenContent = new Set<string>();
  
  for (const pair of allPairs) {
    const contentKey = `${pair.student.toLowerCase()}_${pair.coach.toLowerCase().substring(0, 50)}`;
    
    if (!seenContent.has(contentKey)) {
      const topic = pair.topic;
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      
      if (topicCounts[topic] <= MAX_EXAMPLES_PER_TOPIC) {
        cappedPairs.push(pair);
        seenContent.add(contentKey);
      }
    }
  }
  
  console.log(`\n📊 After deduplication: ${cappedPairs.length} pairs`);
  console.log('\nTopic distribution:');
  for (const [topic, count] of Object.entries(topicCounts)) {
    console.log(`  ${topic}: ${Math.min(count, MAX_EXAMPLES_PER_TOPIC)}`);
  }
  
  // Convert to fine-tune format
  const examples = cappedPairs.map(toFineTuneExample);
  
  // Shuffle for random splits
  const shuffled = examples.sort(() => Math.random() - 0.5);
  
  // Split into train/val/test
  const trainSize = Math.floor(shuffled.length * TRAIN_SPLIT);
  const valSize = Math.floor(shuffled.length * VAL_SPLIT);
  
  const trainExamples = shuffled.slice(0, trainSize);
  const valExamples = shuffled.slice(trainSize, trainSize + valSize);
  const testExamples = shuffled.slice(trainSize + valSize);
  
  // Write JSONL files (without metadata for OpenAI compatibility)
  const writeJsonl = (examples: FineTuneExample[], filename: string) => {
    const lines = examples.map(ex => JSON.stringify({ messages: ex.messages }));
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), lines.join('\n'));
  };
  
  writeJsonl(trainExamples, 'train.jsonl');
  writeJsonl(valExamples, 'val.jsonl');
  writeJsonl(testExamples, 'test.jsonl');
  
  // Write metadata separately for analysis
  const metadata = {
    total_examples: examples.length,
    splits: {
      train: trainExamples.length,
      val: valExamples.length,
      test: testExamples.length
    },
    topic_distribution: topicCounts,
    avg_signal_scores: {
      jtbd: examples.reduce((sum, ex) => sum + (ex.metadata?.signal_scores.jtbd || 0), 0) / examples.length,
      planning: examples.reduce((sum, ex) => sum + (ex.metadata?.signal_scores.planning || 0), 0) / examples.length,
      metrics: examples.reduce((sum, ex) => sum + (ex.metadata?.signal_scores.metrics || 0), 0) / examples.length,
      fit_adaptive: examples.reduce((sum, ex) => sum + (ex.metadata?.signal_scores.fit_adaptive || 0), 0) / examples.length
    }
  };
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'dataset_metadata.json'), 
    JSON.stringify(metadata, null, 2)
  );
  
  console.log('\n✨ Dataset generation complete!');
  console.log(`\nOutput files:`);
  console.log(`  📁 ${OUTPUT_DIR}/`);
  console.log(`     ├── train.jsonl (${trainExamples.length} examples)`);
  console.log(`     ├── val.jsonl (${valExamples.length} examples)`);
  console.log(`     ├── test.jsonl (${testExamples.length} examples)`);
  console.log(`     └── dataset_metadata.json`);
}

// Run if called directly
if (require.main === module) {
  buildDataset().catch(console.error);
}

export { buildDataset };
#!/usr/bin/env ts-node
/**
 * Fine-tune Dataset Builder v1.0.8 - Simplified Version
 * Mines high-quality turn pairs from Jenny-Huda corpus for OpenAI fine-tuning
 * Spec IDs: FT-010..019
 */

const fs = require('fs');
const path = require('path');

// Configuration
const DATA_DIR = path.join(__dirname, '../../../../data/jenny-huda/canonical');
const OUTPUT_DIR = path.join(__dirname, '../../../../data/processed/jenny-huda/finetune');

// System prompt
const SYSTEM_PROMPT = `You are Coach Jenny, an expert college admissions strategist with Stanford training and 15+ years of experience. Your approach combines:

1. Credibility & Warmth - You establish trust quickly with phrases like "We've got this" and "I'm on your side"
2. Evidence-Based Guidance - You reference specific examples and data from your work with successful students
3. The 168-Hour Architecture - You help students optimize their weekly time allocation for maximum impact
4. Strategic Planning - You maintain 3x opportunity buffers and plan multiple moves ahead
5. Celebration Science - You maintain a 3:1 ratio of reinforcement to challenge

Always be specific, actionable, and encouraging.`;

/**
 * Clean PII from text
 */
function cleanPII(text) {
  return text
    .replace(/\bhuda\b/gi, 'the student')
    .replace(/\bjenny\b/gi, 'the coach')
    .trim();
}

/**
 * Extract simple turn pairs from transcript
 */
function extractSimplePairs(filePath) {
  try {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const pairs = [];
    
    // Extract metadata
    const filename = path.basename(filePath);
    const weekMatch = filename.match(/W(\d+)/);
    const week = weekMatch ? parseInt(weekMatch[1]) : 0;
    
    if (!content.text) {
      console.log(`    No text field in ${filename}`);
      return pairs;
    }
    
    // Split by lines and look for speaker patterns
    const lines = content.text.split('\n');
    const turns = [];
    let currentSpeaker = null;
    let currentText = '';
    
    for (const line of lines) {
      // Skip timestamps and empty lines
      if (line.includes('-->') || line.match(/^\d+$/) || line.trim() === '') {
        continue;
      }
      
      // Check if this is a speaker line
      const speakerMatch = line.match(/^([^:]+):\s*(.*)$/);
      
      if (speakerMatch) {
        // Save previous turn if exists
        if (currentSpeaker && currentText.trim()) {
          turns.push({
            speaker: currentSpeaker,
            text: currentText.trim()
          });
        }
        
        // Start new turn
        currentSpeaker = speakerMatch[1].trim();
        currentText = speakerMatch[2] || '';
      } else if (currentSpeaker) {
        // Continue current turn
        currentText += ' ' + line;
      }
    }
    
    // Save last turn
    if (currentSpeaker && currentText.trim()) {
      turns.push({
        speaker: currentSpeaker,
        text: currentText.trim()
      });
    }
    
    console.log(`    Found ${turns.length} turns`);
    
    // Extract Q&A pairs
    for (let i = 0; i < turns.length - 1; i++) {
      const current = turns[i];
      const next = turns[i + 1];
      
      // Look for student -> coach pattern
      if (current.speaker.toLowerCase().includes('huda') && 
          next.speaker.toLowerCase().includes('jenny')) {
        
        // Basic quality filters
        if (current.text.length > 20 && next.text.length > 50) {
          pairs.push({
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: cleanPII(current.text) },
              { role: 'assistant', content: cleanPII(next.text) }
            ]
          });
        }
      }
    }
    
    return pairs;
    
  } catch (err) {
    console.error(`    Error processing ${filePath}: ${err.message}`);
    return [];
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting simplified fine-tune dataset generation...\n');
  
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // Process all transcript files
  const rawDir = path.join(DATA_DIR, '03-Raw-SessionTranscripts');
  
  if (!fs.existsSync(rawDir)) {
    console.error(`Directory not found: ${rawDir}`);
    process.exit(1);
  }
  
  const files = fs.readdirSync(rawDir)
    .filter(f => f.endsWith('.json'))
    .slice(0, 10); // Process first 10 files for testing
    
  console.log(`Processing ${files.length} files...\n`);
  
  const allPairs = [];
  
  for (const file of files) {
    console.log(`📄 ${file}`);
    const pairs = extractSimplePairs(path.join(rawDir, file));
    console.log(`    Extracted ${pairs.length} pairs`);
    allPairs.push(...pairs);
  }
  
  console.log(`\n✅ Total pairs extracted: ${allPairs.length}`);
  
  if (allPairs.length === 0) {
    console.log('\n❌ No pairs extracted. Check the transcript format.');
    return;
  }
  
  // Split into train/val/test
  const shuffled = allPairs.sort(() => Math.random() - 0.5);
  const trainSize = Math.floor(shuffled.length * 0.8);
  const valSize = Math.floor(shuffled.length * 0.1);
  
  const trainData = shuffled.slice(0, trainSize);
  const valData = shuffled.slice(trainSize, trainSize + valSize);
  const testData = shuffled.slice(trainSize + valSize);
  
  // Write JSONL files
  const writeJsonl = (data, filename) => {
    const lines = data.map(item => JSON.stringify(item));
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), lines.join('\n'));
  };
  
  writeJsonl(trainData, 'train.jsonl');
  writeJsonl(valData, 'val.jsonl');
  writeJsonl(testData, 'test.jsonl');
  
  console.log('\n✨ Dataset generation complete!');
  console.log(`\nOutput files:`);
  console.log(`  📁 ${OUTPUT_DIR}/`);
  console.log(`     ├── train.jsonl (${trainData.length} examples)`);
  console.log(`     ├── val.jsonl (${valData.length} examples)`);
  console.log(`     └── test.jsonl (${testData.length} examples)`);
}

// Run
if (require.main === module) {
  main().catch(console.error);
}
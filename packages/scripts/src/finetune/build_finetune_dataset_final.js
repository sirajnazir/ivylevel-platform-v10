#!/usr/bin/env node
/**
 * Fine-tune Dataset Builder v1.0.8 - Final Version
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

Always be specific, actionable, and encouraging. Use evidence chips when referencing specific strategies or outcomes.`;

/**
 * Clean PII from text
 */
function cleanPII(text) {
  return text
    .replace(/\bhuda\b/gi, 'the student')
    .replace(/\bjenny\b/gi, 'the coach')
    .replace(/\bJenny Duan\b/gi, 'the coach')
    .replace(/\bhuda siraj\b/gi, 'the student')
    .replace(/\bsameeha siraj\b/gi, 'the student\'s parent')
    .replace(/\bIvy Mentors\b/gi, '[admin]')
    .trim();
}

/**
 * Parse VTT format and extract turn pairs
 */
function parseVTT(text) {
  const lines = text.split('\n');
  const segments = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Look for timestamp lines
    if (line.includes('-->')) {
      // Get the speaker and text from the next line
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        const speakerMatch = nextLine.match(/^([^:]+):\s*(.*)$/);
        
        if (speakerMatch) {
          const speaker = speakerMatch[1].trim();
          let text = speakerMatch[2].trim();
          
          // Continue collecting text until we hit a number or timestamp
          let j = i + 2;
          while (j < lines.length && 
                 !lines[j].trim().match(/^\d+$/) && 
                 !lines[j].includes('-->')) {
            if (lines[j].trim()) {
              text += ' ' + lines[j].trim();
            }
            j++;
          }
          
          segments.push({
            speaker: speaker,
            text: text.trim()
          });
          
          i = j - 1; // Skip processed lines
        }
      }
    }
  }
  
  return segments;
}

/**
 * Extract high-quality turn pairs
 */
function extractPairs(filePath) {
  try {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const pairs = [];
    
    if (!content.text) {
      return pairs;
    }
    
    // Parse VTT segments
    const segments = parseVTT(content.text);
    console.log(`    Found ${segments.length} segments`);
    
    // Extract turn pairs
    for (let i = 0; i < segments.length - 1; i++) {
      const current = segments[i];
      const next = segments[i + 1];
      
      // Look for student -> coach pattern
      const isStudentTurn = current.speaker.toLowerCase().includes('huda') && 
                           !current.speaker.toLowerCase().includes('jenny');
      const isCoachTurn = next.speaker.toLowerCase().includes('jenny') || 
                         next.speaker.toLowerCase().includes('duan');
      
      if (isStudentTurn && isCoachTurn) {
        // Quality filters
        const studentText = current.text.trim();
        const coachText = next.text.trim();
        
        if (studentText.length > 20 && coachText.length > 50) {
          // Check for question patterns or meaningful exchanges
          const isQuestion = studentText.includes('?') || 
                           studentText.match(/^(how|what|why|when|where|can|could|should|would)/i) ||
                           studentText.match(/(help|advice|guidance|recommend|suggest)/i);
          
          const hasSubstance = coachText.split(' ').length > 10;
          
          if ((isQuestion || studentText.length > 40) && hasSubstance) {
            pairs.push({
              messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: cleanPII(studentText) },
                { role: 'assistant', content: cleanPII(coachText) }
              ]
            });
          }
        }
      }
    }
    
    return pairs;
    
  } catch (err) {
    console.error(`    Error: ${err.message}`);
    return [];
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting fine-tune dataset generation v1.0.8...\n');
  
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // Process transcript files
  const rawDir = path.join(DATA_DIR, '03-Raw-SessionTranscripts');
  
  if (!fs.existsSync(rawDir)) {
    console.error(`Directory not found: ${rawDir}`);
    process.exit(1);
  }
  
  const files = fs.readdirSync(rawDir)
    .filter(f => f.endsWith('.json'))
    .sort(); // Process in chronological order
    
  console.log(`Processing ${files.length} transcript files...\n`);
  
  const allPairs = [];
  const stats = {
    totalSegments: 0,
    totalPairs: 0,
    byPhase: {}
  };
  
  // Process each file
  for (const file of files) {
    console.log(`📄 ${file}`);
    const pairs = extractPairs(path.join(rawDir, file));
    console.log(`    Extracted ${pairs.length} pairs`);
    
    if (pairs.length > 0) {
      allPairs.push(...pairs);
      
      // Track stats
      const phase = file.match(/P(\d)-/) ? `P${file.match(/P(\d)-/)[1]}` : 'Unknown';
      stats.byPhase[phase] = (stats.byPhase[phase] || 0) + pairs.length;
      stats.totalPairs += pairs.length;
    }
  }
  
  console.log(`\n✅ Extraction complete!`);
  console.log(`   Total pairs: ${allPairs.length}`);
  console.log(`   By phase:`, stats.byPhase);
  
  if (allPairs.length === 0) {
    console.log('\n❌ No pairs extracted. Check the transcript format.');
    return;
  }
  
  // Shuffle and split
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
  
  // Write metadata
  const metadata = {
    generated_at: new Date().toISOString(),
    total_examples: allPairs.length,
    splits: {
      train: trainData.length,
      val: valData.length,
      test: testData.length
    },
    phase_distribution: stats.byPhase,
    spec_version: 'v1.0.8'
  };
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'dataset_metadata.json'),
    JSON.stringify(metadata, null, 2)
  );
  
  console.log('\n✨ Dataset generation complete!');
  console.log(`\nOutput files:`);
  console.log(`  📁 ${OUTPUT_DIR}/`);
  console.log(`     ├── train.jsonl (${trainData.length} examples)`);
  console.log(`     ├── val.jsonl (${valData.length} examples)`);
  console.log(`     ├── test.jsonl (${testData.length} examples)`);
  console.log(`     └── dataset_metadata.json`);
  
  // Run validation
  console.log('\n🔍 Running validation...');
  const { validateFile } = require('./validate_jsonl');
  
  try {
    const trainValidation = await validateFile(path.join(OUTPUT_DIR, 'train.jsonl'));
    console.log(`   Train set: ${trainValidation.stats.validLines}/${trainValidation.stats.totalLines} valid`);
    
    if (trainValidation.stats.piiDetections > 0) {
      console.warn(`   ⚠️  PII detected in ${trainValidation.stats.piiDetections} messages`);
    }
  } catch (err) {
    console.log('   Validation skipped (validator not available)');
  }
}

// Run
if (require.main === module) {
  main().catch(console.error);
}
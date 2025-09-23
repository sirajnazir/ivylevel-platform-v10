import fs from "fs";
import path from "path";
import fg from "fast-glob";
import { scrubPII, tokenCount, truncateToTokens, dedupe, safeWriteFile } from "./lib/util.js";

type Turn = { speaker: "coach"|"student"|"unknown"; text: string; start?: number; end?: number; ts?: string; conf?: number };
type FineTuneExample = {
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
};

const SYSTEM_PROMPT = `You are Jenny, an expert college admissions coach with deep experience helping students navigate the complex college application process. You provide strategic guidance, emotional support, and practical advice to help students achieve their academic goals.

Your coaching style is:
- Strategic and outcome-focused
- Empathetic and supportive
- Detail-oriented with actionable steps
- Evidence-based with clear reasoning
- Encouraging while maintaining high standards

You help students with: essay development, strategic planning, application strategy, emotional support during stressful periods, and building compelling narratives that showcase their unique strengths.`;

function extractTurnWindows(turns: Turn[], windowSize: number = 4): Array<{prompt: string; response: string}> {
  const pairs: Array<{prompt: string; response: string}> = [];
  
  for (let i = 0; i < turns.length - 1; i++) {
    const current = turns[i];
    const next = turns[i + 1];
    
    // Look for student → coach pairs
    if (current.speaker === "student" && next.speaker === "coach") {
      // Include context from previous turns
      const start = Math.max(0, i - windowSize + 2);
      const contextTurns = turns.slice(start, i + 1);
      const response = next.text;
      
      // Build conversation context
      const context = contextTurns.map(t => {
        const speaker = t.speaker === "coach" ? "Coach" : "Student";
        return `${speaker}: ${t.text}`;
      }).join("\n\n");
      
      // Quality filters
      if (response.length < 20 || response.length > 2000) continue;
      if (context.length < 10) continue;
      if (next.conf && next.conf < 0.7) continue; // Skip low-confidence attributions
      
      // Prefer responses with strategic elements
      const isStrategic = /(?:let['']s|should|recommend|suggest|strategy|plan|approach|framework|step|first|then|next|goal|focus)/i.test(response);
      const isEmpathetic = /(?:understand|feel|know|realize|proud|amazing|great job|well done|congratulations)/i.test(response);
      const isActionable = /(?:email|send|submit|apply|write|revise|edit|contact|schedule|create|develop)/i.test(response);
      
      if (isStrategic || isEmpathetic || isActionable) {
        pairs.push({
          prompt: context,
          response: response
        });
      }
    }
  }
  
  return pairs;
}

function processRawTranscripts(canonicalDir: string): Array<{prompt: string; response: string}> {
  const files = fg.sync("**/03-Raw-SessionTranscripts/*.json", { cwd: canonicalDir, absolute: true });
  const pairs: Array<{prompt: string; response: string}> = [];
  
  console.log(`[build-ft] Processing ${files.length} transcript files...`);
  
  for (const file of files) {
    try {
      const json = JSON.parse(fs.readFileSync(file, "utf8"));
      if (!Array.isArray(json.turns)) continue;
      
      const windows = extractTurnWindows(json.turns, 4);
      pairs.push(...windows);
    } catch (error) {
      console.warn(`[build-ft] Error processing ${path.basename(file)}: ${error}`);
    }
  }
  
  console.log(`[build-ft] Extracted ${pairs.length} turn windows from transcripts`);
  return pairs;
}

function processRawMessages(canonicalDir: string): Array<{prompt: string; response: string}> {
  const files = fg.sync("**/04-Raw-iMessages/*.json", { cwd: canonicalDir, absolute: true });
  const pairs: Array<{prompt: string; response: string}> = [];
  
  console.log(`[build-ft] Processing ${files.length} iMessage files...`);
  
  for (const file of files) {
    try {
      const json = JSON.parse(fs.readFileSync(file, "utf8"));
      if (!Array.isArray(json.turns)) continue;
      
      const windows = extractTurnWindows(json.turns, 2); // Smaller window for messages
      pairs.push(...windows);
    } catch (error) {
      console.warn(`[build-ft] Error processing ${path.basename(file)}: ${error}`);
    }
  }
  
  console.log(`[build-ft] Extracted ${pairs.length} message windows from iMessages`);
  return pairs;
}

function processIntelligenceFiles(canonicalDir: string): Array<{prompt: string; response: string}> {
  const files = fg.sync("**/*INTEL*.json", { cwd: canonicalDir, absolute: true });
  const pairs: Array<{prompt: string; response: string}> = [];
  
  console.log(`[build-ft] Processing ${files.length} intelligence files...`);
  
  for (const file of files) {
    try {
      const json = JSON.parse(fs.readFileSync(file, "utf8"));
      const text = json.text || "";
      
      if (text.length < 100) continue;
      
      // Extract key insights and frameworks from intelligence files
      const sections = text.split(/\n\s*\n/).filter(s => s.trim().length > 50);
      
      for (const section of sections) {
        // Look for strategic frameworks, insights, or analysis
        if (/(?:framework|strategy|approach|insight|analysis|recommendation|outcome|result)/i.test(section)) {
          // Create a prompt asking for this type of strategic thinking
          const prompt = `Please provide strategic guidance and analysis for a college admissions situation, including frameworks, insights, and actionable recommendations.`;
          
          pairs.push({
            prompt,
            response: section.trim()
          });
        }
      }
    } catch (error) {
      console.warn(`[build-ft] Error processing ${path.basename(file)}: ${error}`);
    }
  }
  
  console.log(`[build-ft] Extracted ${pairs.length} insights from intelligence files`);
  return pairs;
}

function createFineTuneExample(prompt: string, response: string, piiScrub: boolean = false): FineTuneExample {
  let cleanPrompt = prompt.trim();
  let cleanResponse = response.trim();
  
  if (piiScrub) {
    cleanPrompt = scrubPII(cleanPrompt);
    cleanResponse = scrubPII(cleanResponse);
  }
  
  // Truncate if too long
  cleanPrompt = truncateToTokens(cleanPrompt, 1500);
  cleanResponse = truncateToTokens(cleanResponse, 2000);
  
  return {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: cleanPrompt },
      { role: "assistant", content: cleanResponse }
    ]
  };
}

function splitDataset<T>(data: T[], trainRatio: number = 0.8, valRatio: number = 0.1): {
  train: T[];
  val: T[];
  test: T[];
} {
  const shuffled = [...data].sort(() => Math.random() - 0.5);
  const trainSize = Math.floor(shuffled.length * trainRatio);
  const valSize = Math.floor(shuffled.length * valRatio);
  
  return {
    train: shuffled.slice(0, trainSize),
    val: shuffled.slice(trainSize, trainSize + valSize),
    test: shuffled.slice(trainSize + valSize)
  };
}

function main() {
  const args = process.argv.slice(2);
  const canonicalDir = args.find(arg => !arg.startsWith("--")) || "data/canonical/jenny-huda";
  const outputDir = args.find(arg => arg.startsWith("--out="))?.split("=")[1] || "data/processed/jenny-huda/finetune";
  const maxExamples = parseInt(args.find(arg => arg.startsWith("--max-examples="))?.split("=")[1] || "5000");
  const piiScrub = args.includes("--pii-scrub");
  
  console.log(`[build-ft] Building fine-tune dataset from: ${canonicalDir}`);
  console.log(`[build-ft] Output directory: ${outputDir}`);
  console.log(`[build-ft] Max examples: ${maxExamples}`);
  console.log(`[build-ft] PII scrubbing: ${piiScrub ? "enabled" : "disabled"}`);
  
  // Collect all prompt-response pairs
  const allPairs: Array<{prompt: string; response: string}> = [];
  
  // Process RAW transcripts
  allPairs.push(...processRawTranscripts(canonicalDir));
  
  // Process RAW messages
  allPairs.push(...processRawMessages(canonicalDir));
  
  // Process Intelligence files
  allPairs.push(...processIntelligenceFiles(canonicalDir));
  
  console.log(`[build-ft] Total pairs before deduplication: ${allPairs.length}`);
  
  // Deduplicate based on response content
  const uniquePairs = dedupe(allPairs, pair => pair.response.toLowerCase().slice(0, 100));
  console.log(`[build-ft] Unique pairs after deduplication: ${uniquePairs.length}`);
  
  // Limit to max examples
  const finalPairs = uniquePairs.slice(0, maxExamples);
  
  // Convert to fine-tune format
  const examples = finalPairs.map(pair => createFineTuneExample(pair.prompt, pair.response, piiScrub));
  
  // Split dataset
  const split = splitDataset(examples);
  
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Write datasets
  const writeDataset = (data: FineTuneExample[], filename: string) => {
    const jsonl = data.map(ex => JSON.stringify(ex)).join("\n");
    const fullPath = path.resolve(outputDir, filename);
    console.log(`[build-ft] Writing ${data.length} examples to: ${fullPath}`);
    safeWriteFile(fullPath, jsonl);
  };
  
  writeDataset(split.train, "finetune.train.jsonl");
  writeDataset(split.val, "finetune.val.jsonl");
  writeDataset(split.test, "finetune.test.jsonl");
  
  // Write stats
  const stats = {
    timestamp: new Date().toISOString(),
    sourceDir: canonicalDir,
    totalPairs: allPairs.length,
    uniquePairs: uniquePairs.length,
    finalExamples: finalPairs.length,
    splits: {
      train: split.train.length,
      val: split.val.length,
      test: split.test.length
    },
    avgTokens: {
      train: split.train.reduce((sum, ex) => sum + ex.messages.reduce((s, m) => s + tokenCount(m.content), 0), 0) / split.train.length,
      val: split.val.reduce((sum, ex) => sum + ex.messages.reduce((s, m) => s + tokenCount(m.content), 0), 0) / split.val.length,
      test: split.test.reduce((sum, ex) => sum + ex.messages.reduce((s, m) => s + tokenCount(m.content), 0), 0) / split.test.length
    }
  };
  
  safeWriteFile(path.join(outputDir, "finetune.stats.json"), JSON.stringify(stats, null, 2));
  
  console.log(`[build-ft] ✅ Dataset created successfully!`);
  console.log(`[build-ft] Train: ${split.train.length} examples`);
  console.log(`[build-ft] Val: ${split.val.length} examples`);
  console.log(`[build-ft] Test: ${split.test.length} examples`);
  console.log(`[build-ft] Files written to: ${outputDir}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
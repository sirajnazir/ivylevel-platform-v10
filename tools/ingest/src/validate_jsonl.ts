import fs from "fs";
import path from "path";
import { tokenCount } from "./lib/util.js";

type FineTuneExample = {
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
};

function validateFineTuneExample(example: any, lineNum: number): string[] {
  const errors: string[] = [];
  
  // Check basic structure
  if (!example || typeof example !== "object") {
    errors.push(`Line ${lineNum}: Example is not an object`);
    return errors;
  }
  
  if (!Array.isArray(example.messages)) {
    errors.push(`Line ${lineNum}: Missing or invalid 'messages' array`);
    return errors;
  }
  
  if (example.messages.length < 2) {
    errors.push(`Line ${lineNum}: Need at least 2 messages (user + assistant)`);
  }
  
  // Check message structure
  for (const [msgIdx, msg] of example.messages.entries()) {
    if (!msg || typeof msg !== "object") {
      errors.push(`Line ${lineNum}, Message ${msgIdx}: Message is not an object`);
      continue;
    }
    
    if (!["system", "user", "assistant"].includes(msg.role)) {
      errors.push(`Line ${lineNum}, Message ${msgIdx}: Invalid role '${msg.role}'`);
    }
    
    if (typeof msg.content !== "string") {
      errors.push(`Line ${lineNum}, Message ${msgIdx}: Content must be a string`);
      continue;
    }
    
    if (msg.content.trim().length === 0) {
      errors.push(`Line ${lineNum}, Message ${msgIdx}: Content cannot be empty`);
    }
    
    // Token count validation
    const tokens = tokenCount(msg.content);
    if (tokens > 4000) {
      errors.push(`Line ${lineNum}, Message ${msgIdx}: Content too long (${tokens} tokens, max 4000)`);
    }
  }
  
  // Check conversation flow
  const roles = example.messages.map((m: any) => m.role);
  const lastRole = roles[roles.length - 1];
  if (lastRole !== "assistant") {
    errors.push(`Line ${lineNum}: Conversation must end with assistant message`);
  }
  
  return errors;
}

function validateJsonlFile(filePath: string): { valid: boolean; errors: string[]; stats: any } {
  const errors: string[] = [];
  let lineCount = 0;
  let validExamples = 0;
  let totalTokens = 0;
  let maxTokens = 0;
  let minTokens = Infinity;
  
  if (!fs.existsSync(filePath)) {
    return { valid: false, errors: [`File does not exist: ${filePath}`], stats: {} };
  }
  
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.trim().split("\n");
  
  for (const [idx, line] of lines.entries()) {
    lineCount++;
    if (line.trim() === "") continue;
    
    try {
      const example = JSON.parse(line);
      const lineErrors = validateFineTuneExample(example, idx + 1);
      errors.push(...lineErrors);
      
      if (lineErrors.length === 0) {
        validExamples++;
        // Calculate tokens for this example
        const exampleTokens = example.messages.reduce((sum: number, msg: any) => 
          sum + tokenCount(msg.content), 0);
        totalTokens += exampleTokens;
        maxTokens = Math.max(maxTokens, exampleTokens);
        minTokens = Math.min(minTokens, exampleTokens);
      }
    } catch (parseError) {
      errors.push(`Line ${idx + 1}: Invalid JSON - ${parseError}`);
    }
  }
  
  const stats = {
    totalLines: lineCount,
    validExamples,
    invalidExamples: lineCount - validExamples,
    totalTokens,
    avgTokens: validExamples > 0 ? Math.round(totalTokens / validExamples) : 0,
    maxTokens: maxTokens === -Infinity ? 0 : maxTokens,
    minTokens: minTokens === Infinity ? 0 : minTokens
  };
  
  return { valid: errors.length === 0, errors, stats };
}

function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: node validate_jsonl.js <path-to-jsonl-file>");
    process.exit(1);
  }
  
  console.log(`[validate] Validating: ${filePath}`);
  const result = validateJsonlFile(filePath);
  
  console.log(`[validate] Stats:`, result.stats);
  
  if (result.valid) {
    console.log(`[validate] ✅ File is valid!`);
  } else {
    console.log(`[validate] ❌ Found ${result.errors.length} errors:`);
    result.errors.slice(0, 20).forEach(error => console.log(`  ${error}`));
    if (result.errors.length > 20) {
      console.log(`  ... and ${result.errors.length - 20} more errors`);
    }
  }
  
  // Write validation report
  const reportPath = filePath.replace(/\.jsonl$/, ".validation.json");
  fs.writeFileSync(reportPath, JSON.stringify({
    filePath,
    timestamp: new Date().toISOString(),
    valid: result.valid,
    errorCount: result.errors.length,
    stats: result.stats,
    errors: result.errors
  }, null, 2));
  
  console.log(`[validate] Report written to: ${reportPath}`);
  process.exit(result.valid ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
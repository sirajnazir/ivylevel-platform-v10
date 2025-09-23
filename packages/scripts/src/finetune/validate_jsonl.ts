#!/usr/bin/env ts-node
/**
 * JSONL Validator for Fine-tune Datasets
 * Validates format, content, and quality of JSONL files for OpenAI fine-tuning
 * Spec IDs: FT-020..029
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Validation rules
const MIN_USER_LENGTH = 10;
const MAX_USER_LENGTH = 2000;
const MIN_ASSISTANT_LENGTH = 20;
const MAX_ASSISTANT_LENGTH = 4000;
const REQUIRED_ROLES = ['system', 'user', 'assistant'];

interface ValidationIssue {
  line: number;
  type: 'error' | 'warning';
  message: string;
}

interface ValidationStats {
  totalLines: number;
  validLines: number;
  errors: number;
  warnings: number;
  avgUserLength: number;
  avgAssistantLength: number;
  roleDistribution: Record<string, number>;
  piiDetections: number;
}

/**
 * Check for potential PII
 */
function checkPII(text: string): string[] {
  const issues: string[] = [];
  
  // Check for common names that should have been replaced
  if (/\b(huda|jenny)\b/i.test(text)) {
    issues.push('Contains unreplaced names (Huda/Jenny)');
  }
  
  // Check for email addresses
  if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text)) {
    issues.push('Contains email address');
  }
  
  // Check for phone numbers
  if (/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(text)) {
    issues.push('May contain phone number');
  }
  
  // Check for SSN patterns
  if (/\b\d{3}-\d{2}-\d{4}\b/.test(text)) {
    issues.push('May contain SSN');
  }
  
  return issues;
}

/**
 * Validate a single JSONL line
 */
function validateLine(line: string, lineNum: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  // Parse JSON
  let data: any;
  try {
    data = JSON.parse(line);
  } catch (e) {
    issues.push({
      line: lineNum,
      type: 'error',
      message: 'Invalid JSON format'
    });
    return issues;
  }
  
  // Check required structure
  if (!data.messages || !Array.isArray(data.messages)) {
    issues.push({
      line: lineNum,
      type: 'error',
      message: 'Missing or invalid "messages" array'
    });
    return issues;
  }
  
  // Validate messages
  const roles = data.messages.map((m: any) => m.role);
  
  // Check for required roles
  if (!roles.includes('system')) {
    issues.push({
      line: lineNum,
      type: 'error',
      message: 'Missing system message'
    });
  }
  
  if (!roles.includes('user')) {
    issues.push({
      line: lineNum,
      type: 'error',
      message: 'Missing user message'
    });
  }
  
  if (!roles.includes('assistant')) {
    issues.push({
      line: lineNum,
      type: 'error',
      message: 'Missing assistant message'
    });
  }
  
  // Validate each message
  for (let i = 0; i < data.messages.length; i++) {
    const msg = data.messages[i];
    
    if (!msg.role || !msg.content) {
      issues.push({
        line: lineNum,
        type: 'error',
        message: `Message ${i + 1} missing role or content`
      });
      continue;
    }
    
    // Check content length
    if (msg.role === 'user') {
      if (msg.content.length < MIN_USER_LENGTH) {
        issues.push({
          line: lineNum,
          type: 'warning',
          message: `User message too short (${msg.content.length} chars)`
        });
      }
      if (msg.content.length > MAX_USER_LENGTH) {
        issues.push({
          line: lineNum,
          type: 'warning',
          message: `User message too long (${msg.content.length} chars)`
        });
      }
    }
    
    if (msg.role === 'assistant') {
      if (msg.content.length < MIN_ASSISTANT_LENGTH) {
        issues.push({
          line: lineNum,
          type: 'warning',
          message: `Assistant message too short (${msg.content.length} chars)`
        });
      }
      if (msg.content.length > MAX_ASSISTANT_LENGTH) {
        issues.push({
          line: lineNum,
          type: 'warning',
          message: `Assistant message too long (${msg.content.length} chars)`
        });
      }
    }
    
    // Check for PII
    const piiIssues = checkPII(msg.content);
    for (const pii of piiIssues) {
      issues.push({
        line: lineNum,
        type: 'error',
        message: `PII detected in ${msg.role} message: ${pii}`
      });
    }
  }
  
  // Check message order (should be system → user → assistant)
  if (roles.length >= 3) {
    if (roles[0] !== 'system') {
      issues.push({
        line: lineNum,
        type: 'warning',
        message: 'System message should be first'
      });
    }
    
    // Check for alternating pattern after system
    let lastRole = 'system';
    for (let i = 1; i < roles.length; i++) {
      if (roles[i] === lastRole && lastRole !== 'system') {
        issues.push({
          line: lineNum,
          type: 'warning',
          message: `Consecutive ${lastRole} messages at position ${i + 1}`
        });
      }
      lastRole = roles[i];
    }
  }
  
  return issues;
}

/**
 * Validate an entire JSONL file
 */
async function validateFile(filePath: string): Promise<{issues: ValidationIssue[], stats: ValidationStats}> {
  const issues: ValidationIssue[] = [];
  const stats: ValidationStats = {
    totalLines: 0,
    validLines: 0,
    errors: 0,
    warnings: 0,
    avgUserLength: 0,
    avgAssistantLength: 0,
    roleDistribution: {},
    piiDetections: 0
  };
  
  const userLengths: number[] = [];
  const assistantLengths: number[] = [];
  
  // Read file line by line
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  
  let lineNum = 0;
  
  for await (const line of rl) {
    lineNum++;
    stats.totalLines++;
    
    if (line.trim() === '') {
      continue; // Skip empty lines
    }
    
    const lineIssues = validateLine(line, lineNum);
    issues.push(...lineIssues);
    
    const errors = lineIssues.filter(i => i.type === 'error').length;
    const warnings = lineIssues.filter(i => i.type === 'warning').length;
    
    stats.errors += errors;
    stats.warnings += warnings;
    
    if (errors === 0) {
      stats.validLines++;
    }
    
    // Collect stats
    try {
      const data = JSON.parse(line);
      for (const msg of data.messages) {
        stats.roleDistribution[msg.role] = (stats.roleDistribution[msg.role] || 0) + 1;
        
        if (msg.role === 'user') {
          userLengths.push(msg.content.length);
        } else if (msg.role === 'assistant') {
          assistantLengths.push(msg.content.length);
        }
        
        if (checkPII(msg.content).length > 0) {
          stats.piiDetections++;
        }
      }
    } catch (e) {
      // Already handled in validateLine
    }
  }
  
  // Calculate averages
  if (userLengths.length > 0) {
    stats.avgUserLength = userLengths.reduce((a, b) => a + b, 0) / userLengths.length;
  }
  
  if (assistantLengths.length > 0) {
    stats.avgAssistantLength = assistantLengths.reduce((a, b) => a + b, 0) / assistantLengths.length;
  }
  
  return { issues, stats };
}

/**
 * Print validation report
 */
function printReport(filePath: string, issues: ValidationIssue[], stats: ValidationStats) {
  console.log(`\n📋 Validation Report for ${path.basename(filePath)}`);
  console.log('='.repeat(60));
  
  // Summary
  console.log('\n📊 Summary:');
  console.log(`  Total lines: ${stats.totalLines}`);
  console.log(`  Valid lines: ${stats.validLines} (${((stats.validLines / stats.totalLines) * 100).toFixed(1)}%)`);
  console.log(`  Errors: ${stats.errors}`);
  console.log(`  Warnings: ${stats.warnings}`);
  console.log(`  PII detections: ${stats.piiDetections}`);
  
  // Role distribution
  console.log('\n👥 Role Distribution:');
  for (const [role, count] of Object.entries(stats.roleDistribution)) {
    console.log(`  ${role}: ${count}`);
  }
  
  // Content stats
  console.log('\n📏 Content Statistics:');
  console.log(`  Avg user message length: ${Math.round(stats.avgUserLength)} chars`);
  console.log(`  Avg assistant message length: ${Math.round(stats.avgAssistantLength)} chars`);
  
  // Issues by type
  const errorsByType: Record<string, number> = {};
  const warningsByType: Record<string, number> = {};
  
  for (const issue of issues) {
    if (issue.type === 'error') {
      errorsByType[issue.message] = (errorsByType[issue.message] || 0) + 1;
    } else {
      warningsByType[issue.message] = (warningsByType[issue.message] || 0) + 1;
    }
  }
  
  if (Object.keys(errorsByType).length > 0) {
    console.log('\n❌ Errors by Type:');
    for (const [msg, count] of Object.entries(errorsByType)) {
      console.log(`  ${msg}: ${count}`);
    }
  }
  
  if (Object.keys(warningsByType).length > 0) {
    console.log('\n⚠️  Warnings by Type:');
    for (const [msg, count] of Object.entries(warningsByType)) {
      console.log(`  ${msg}: ${count}`);
    }
  }
  
  // Sample issues
  if (issues.length > 0) {
    console.log('\n📍 Sample Issues (first 10):');
    for (const issue of issues.slice(0, 10)) {
      const icon = issue.type === 'error' ? '❌' : '⚠️ ';
      console.log(`  ${icon} Line ${issue.line}: ${issue.message}`);
    }
    
    if (issues.length > 10) {
      console.log(`  ... and ${issues.length - 10} more issues`);
    }
  }
  
  // Final verdict
  console.log('\n✅ Validation Result:');
  if (stats.errors === 0 && stats.piiDetections === 0) {
    console.log('  ✨ File is valid for fine-tuning!');
  } else {
    console.log('  ❌ File has errors that must be fixed before fine-tuning.');
  }
}

/**
 * Main validation runner
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: npm run validate:jsonl <file1.jsonl> [file2.jsonl ...]');
    console.log('');
    console.log('Or validate all default files:');
    console.log('  npm run validate:jsonl data/processed/jenny-huda/finetune/*.jsonl');
    process.exit(1);
  }
  
  // Handle glob patterns
  const files: string[] = [];
  for (const arg of args) {
    if (arg.includes('*')) {
      // Simple glob handling
      const dir = path.dirname(arg);
      const pattern = path.basename(arg);
      if (fs.existsSync(dir)) {
        const dirFiles = fs.readdirSync(dir)
          .filter((f: string) => f.endsWith('.jsonl'))
          .map((f: string) => path.join(dir, f));
        files.push(...dirFiles);
      }
    } else if (fs.existsSync(arg)) {
      files.push(arg);
    } else {
      console.error(`❌ File not found: ${arg}`);
    }
  }
  
  if (files.length === 0) {
    console.error('❌ No JSONL files found to validate');
    process.exit(1);
  }
  
  console.log(`🔍 Validating ${files.length} file(s)...\n`);
  
  let totalErrors = 0;
  
  for (const file of files) {
    const { issues, stats } = await validateFile(file);
    printReport(file, issues, stats);
    totalErrors += stats.errors;
  }
  
  // Exit with error code if validation failed
  if (totalErrors > 0) {
    console.log(`\n❌ Total errors across all files: ${totalErrors}`);
    process.exit(1);
  } else {
    console.log('\n✅ All files validated successfully!');
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { validateFile, ValidationIssue, ValidationStats };
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuration
const INPUT_FILE = 'App.js';
const OUTPUT_FILE = 'App-New.js';
const PATCHES_FILE = 'app-patches.json';
const BACKUP_FILE = 'App-backup.js';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Helper function to log with colors
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Read the patches configuration
function readPatches() {
  try {
    const patchesContent = fs.readFileSync(PATCHES_FILE, 'utf8');
    return JSON.parse(patchesContent);
  } catch (error) {
    log(`Error reading patches file: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Apply a single patch
function applyPatch(content, patch) {
  log(`\nApplying patch: ${patch.id} - ${patch.description}`, 'cyan');
  
  let newContent = content;
  
  switch (patch.action) {
    case 'add_after':
      if (content.includes(patch.search_pattern)) {
        const index = content.indexOf(patch.search_pattern) + patch.search_pattern.length;
        newContent = content.slice(0, index) + patch.new_content + content.slice(index);
        log(`✓ Added content after pattern`, 'green');
      } else {
        log(`✗ Pattern not found: ${patch.search_pattern.substring(0, 50)}...`, 'red');
        throw new Error(`Pattern not found for patch ${patch.id}`);
      }
      break;
      
    case 'add_before':
      if (content.includes(patch.search_pattern)) {
        const index = content.indexOf(patch.search_pattern);
        newContent = content.slice(0, index) + patch.new_content + content.slice(index);
        log(`✓ Added content before pattern`, 'green');
      } else {
        log(`✗ Pattern not found: ${patch.search_pattern.substring(0, 50)}...`, 'red');
        throw new Error(`Pattern not found for patch ${patch.id}`);
      }
      break;
      
    case 'replace':
      if (content.includes(patch.search_pattern)) {
        newContent = content.replace(patch.search_pattern, patch.new_content);
        log(`✓ Replaced content`, 'green');
      } else {
        log(`✗ Pattern not found: ${patch.search_pattern.substring(0, 50)}...`, 'red');
        throw new Error(`Pattern not found for patch ${patch.id}`);
      }
      break;
      
    default:
      log(`✗ Unknown action: ${patch.action}`, 'red');
      throw new Error(`Unknown action ${patch.action} for patch ${patch.id}`);
  }
  
  return newContent;
}

// Main function
async function main() {
  log('=== Smart Resource Hub Integration Script ===\n', 'blue');
  
  // Check if input file exists
  if (!fs.existsSync(INPUT_FILE)) {
    log(`Error: ${INPUT_FILE} not found in current directory`, 'red');
    process.exit(1);
  }
  
  // Check if patches file exists
  if (!fs.existsSync(PATCHES_FILE)) {
    log(`Error: ${PATCHES_FILE} not found in current directory`, 'red');
    process.exit(1);
  }
  
  // Create backup
  log(`Creating backup: ${BACKUP_FILE}`, 'yellow');
  fs.copyFileSync(INPUT_FILE, BACKUP_FILE);
  
  // Read original content
  let content = fs.readFileSync(INPUT_FILE, 'utf8');
  log(`Read ${INPUT_FILE}: ${content.length} characters`, 'green');
  
  // Read patches
  const { patches } = readPatches();
  log(`Loaded ${patches.length} patches to apply`, 'blue');
  
  // Apply each patch
  let successCount = 0;
  for (const patch of patches) {
    try {
      content = applyPatch(content, patch);
      successCount++;
    } catch (error) {
      log(`\nError applying patch ${patch.id}: ${error.message}`, 'red');
      log('Aborting patch process. Original file remains unchanged.', 'yellow');
      process.exit(1);
    }
  }
  
  // Write the new file
  fs.writeFileSync(OUTPUT_FILE, content);
  log(`\n✓ Successfully created ${OUTPUT_FILE}`, 'green');
  log(`✓ Applied ${successCount}/${patches.length} patches`, 'green');
  
  // Show file sizes
  const originalSize = fs.statSync(INPUT_FILE).size;
  const newSize = fs.statSync(OUTPUT_FILE).size;
  const sizeDiff = newSize - originalSize;
  
  log(`\nFile size comparison:`, 'cyan');
  log(`  Original: ${originalSize} bytes`, 'cyan');
  log(`  New:      ${newSize} bytes`, 'cyan');
  log(`  Diff:     ${sizeDiff > 0 ? '+' : ''}${sizeDiff} bytes`, 'cyan');
  
  // Verify SmartResourceHub import was added
  if (content.includes("import SmartResourceHub from './SmartResourceHub'")) {
    log('\n✓ SmartResourceHub import verified', 'green');
  } else {
    log('\n⚠ Warning: SmartResourceHub import may not have been added correctly', 'yellow');
  }
  
  // Verify resource-hub section was added
  if (content.includes("id: 'resource-hub'")) {
    log('✓ Resource hub section verified', 'green');
  } else {
    log('⚠ Warning: Resource hub section may not have been added correctly', 'yellow');
  }
  
  log('\n=== Integration Complete ===', 'blue');
  log(`\nNext steps:`, 'yellow');
  log(`1. Ensure SmartResourceHub.js is in the same directory`, 'yellow');
  log(`2. Review ${OUTPUT_FILE} for correctness`, 'yellow');
  log(`3. Test the integration thoroughly`, 'yellow');
  log(`4. If everything works, you can rename ${OUTPUT_FILE} to ${INPUT_FILE}`, 'yellow');
}

// Run the script
main().catch(error => {
  log(`\nUnexpected error: ${error.message}`, 'red');
  process.exit(1);
});
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

// Normalize whitespace for more flexible matching
function normalizeWhitespace(str) {
  return str.replace(/\s+/g, ' ').trim();
}

// Find pattern with flexible whitespace
function findPatternFlexible(content, pattern) {
  // First try exact match
  let index = content.indexOf(pattern);
  if (index !== -1) return { index, length: pattern.length };
  
  // Try with normalized whitespace
  const normalizedContent = normalizeWhitespace(content);
  const normalizedPattern = normalizeWhitespace(pattern);
  const normalizedIndex = normalizedContent.indexOf(normalizedPattern);
  
  if (normalizedIndex !== -1) {
    // Find the actual position in the original content
    let charCount = 0;
    let originalIndex = 0;
    let inWhitespace = false;
    
    for (let i = 0; i < content.length && charCount < normalizedIndex; i++) {
      if (/\s/.test(content[i])) {
        if (!inWhitespace) {
          charCount++;
          inWhitespace = true;
        }
      } else {
        charCount++;
        inWhitespace = false;
      }
      originalIndex = i;
    }
    
    // Find the end of the pattern in original content
    let endIndex = originalIndex;
    let patternChars = normalizedPattern.length;
    inWhitespace = false;
    
    for (let i = originalIndex; i < content.length && patternChars > 0; i++) {
      if (/\s/.test(content[i])) {
        if (!inWhitespace) {
          patternChars--;
          inWhitespace = true;
        }
      } else {
        patternChars--;
        inWhitespace = false;
      }
      endIndex = i;
    }
    
    return { index: originalIndex, length: endIndex - originalIndex + 1 };
  }
  
  return null;
}

// Apply a single patch with flexible matching
function applyPatch(content, patch) {
  log(`\nApplying patch: ${patch.id} - ${patch.description}`, 'cyan');
  
  let newContent = content;
  
  switch (patch.action) {
    case 'add_after':
      const afterMatch = findPatternFlexible(content, patch.search_pattern);
      if (afterMatch) {
        const index = afterMatch.index + afterMatch.length;
        newContent = content.slice(0, index) + patch.new_content + content.slice(index);
        log(`✓ Added content after pattern`, 'green');
      } else {
        log(`✗ Pattern not found: ${patch.search_pattern.substring(0, 50)}...`, 'red');
        throw new Error(`Pattern not found for patch ${patch.id}`);
      }
      break;
      
    case 'add_before':
      const beforeMatch = findPatternFlexible(content, patch.search_pattern);
      if (beforeMatch) {
        newContent = content.slice(0, beforeMatch.index) + patch.new_content + content.slice(beforeMatch.index);
        log(`✓ Added content before pattern`, 'green');
      } else {
        log(`✗ Pattern not found: ${patch.search_pattern.substring(0, 50)}...`, 'red');
        throw new Error(`Pattern not found for patch ${patch.id}`);
      }
      break;
      
    case 'replace':
      const replaceMatch = findPatternFlexible(content, patch.search_pattern);
      if (replaceMatch) {
        newContent = content.slice(0, replaceMatch.index) + 
                    patch.new_content + 
                    content.slice(replaceMatch.index + replaceMatch.length);
        log(`✓ Replaced content`, 'green');
      } else {
        log(`✗ Pattern not found: ${patch.search_pattern.substring(0, 50)}...`, 'red');
        
        // For patch-5 specifically, try a manual approach
        if (patch.id === 'patch-5') {
          log(`Attempting alternative search for patch-5...`, 'yellow');
          
          // Look for the button that contains "Complete Assessment"
          const completeAssessmentRegex = /disabled=\{[^}]+\}/g;
          const matches = content.match(completeAssessmentRegex);
          
          if (matches) {
            // Find the one that contains quizAnswers and scenarioResponses
            for (const match of matches) {
              if (match.includes('quizAnswers') && match.includes('scenarioResponses')) {
                log(`Found alternative match: ${match.substring(0, 50)}...`, 'yellow');
                newContent = content.replace(match, patch.new_content);
                log(`✓ Replaced content using alternative method`, 'green');
                return newContent;
              }
            }
          }
        }
        
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
  log('=== Smart Resource Hub Integration Script (Flexible) ===\n', 'blue');
  
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
  let skipRemaining = false;
  
  for (const patch of patches) {
    // Skip patches 5-8 if patch 5 fails (they're related)
    if (skipRemaining && ['patch-5', 'patch-6', 'patch-7', 'patch-8'].includes(patch.id)) {
      log(`\nSkipping ${patch.id} - Related to failed patch-5`, 'yellow');
      continue;
    }
    
    try {
      content = applyPatch(content, patch);
      successCount++;
    } catch (error) {
      log(`\nError applying patch ${patch.id}: ${error.message}`, 'red');
      
      if (patch.id === 'patch-5') {
        log('Note: Patches 5-8 modify the Complete Assessment button logic.', 'yellow');
        log('These can be applied manually if needed.', 'yellow');
        skipRemaining = true;
        continue;
      } else if (!['patch-6', 'patch-7', 'patch-8'].includes(patch.id)) {
        log('Aborting patch process. Original file remains unchanged.', 'yellow');
        process.exit(1);
      }
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
  
  if (successCount < patches.length) {
    log(`\n⚠ Note: ${patches.length - successCount} patches could not be applied automatically.`, 'yellow');
    log(`These patches modify the "Complete Assessment" button to include resource hub validation.`, 'yellow');
    log(`You may need to manually update the button's disabled/style logic if this validation is required.`, 'yellow');
  }
  
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
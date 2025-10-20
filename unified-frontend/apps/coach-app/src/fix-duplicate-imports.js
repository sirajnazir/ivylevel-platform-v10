#!/usr/bin/env node

const fs = require('fs');

// Configuration
const FILE_TO_FIX = process.argv[2] || 'App.js';

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

// Main function
function fixDuplicateImports() {
  log('=== Fixing Duplicate Import Statements ===\n', 'blue');
  
  // Check if file exists
  if (!fs.existsSync(FILE_TO_FIX)) {
    log(`Error: ${FILE_TO_FIX} not found`, 'red');
    process.exit(1);
  }
  
  // Read the file
  let content = fs.readFileSync(FILE_TO_FIX, 'utf8');
  log(`Reading ${FILE_TO_FIX}...`, 'cyan');
  
  // Split into lines
  const lines = content.split('\n');
  const importMap = new Map();
  const duplicates = [];
  
  // Track import statements
  lines.forEach((line, index) => {
    const importMatch = line.match(/^import\s+(.+?)\s+from\s+['"](.+?)['"]/);
    if (importMatch) {
      const [fullMatch, importName, importPath] = importMatch;
      const key = `${importName}-${importPath}`;
      
      if (importMap.has(key)) {
        duplicates.push(index);
        log(`Found duplicate import at line ${index + 1}: ${line}`, 'yellow');
      } else {
        importMap.set(key, index);
      }
    }
  });
  
  if (duplicates.length === 0) {
    log('\n✓ No duplicate imports found!', 'green');
    return;
  }
  
  // Remove duplicate lines
  log(`\nRemoving ${duplicates.length} duplicate import(s)...`, 'yellow');
  
  // Remove duplicates (in reverse order to maintain indices)
  duplicates.reverse().forEach(index => {
    lines.splice(index, 1);
  });
  
  // Also remove any duplicate comment lines for imports
  const cleanedLines = [];
  let lastLine = '';
  
  for (const line of lines) {
    // Skip duplicate import comments
    if (line.trim() === '// Import SmartResourceHub component' && 
        lastLine.includes('import SmartResourceHub')) {
      continue;
    }
    cleanedLines.push(line);
    lastLine = line;
  }
  
  // Write back to file
  const fixedContent = cleanedLines.join('\n');
  
  // Create backup
  const backupFile = FILE_TO_FIX.replace('.js', '-before-fix.js');
  fs.writeFileSync(backupFile, content);
  log(`Created backup: ${backupFile}`, 'cyan');
  
  // Write fixed content
  fs.writeFileSync(FILE_TO_FIX, fixedContent);
  log(`✓ Fixed ${FILE_TO_FIX} successfully!`, 'green');
  
  // Show what was removed
  log('\nRemoved imports:', 'cyan');
  duplicates.forEach(index => {
    log(`  Line ${index + 1}: ${lines[index]}`, 'red');
  });
  
  log('\n=== Fix Complete ===', 'blue');
}

// Run the fix
try {
  fixDuplicateImports();
} catch (error) {
  log(`\nError: ${error.message}`, 'red');
  process.exit(1);
}
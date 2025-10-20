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

// Main cleanup function
function cleanupDuplicates() {
  log('=== Cleaning Up All Duplicates in App.js ===\n', 'blue');
  
  // Check if file exists
  if (!fs.existsSync(FILE_TO_FIX)) {
    log(`Error: ${FILE_TO_FIX} not found`, 'red');
    process.exit(1);
  }
  
  // Read the file
  let content = fs.readFileSync(FILE_TO_FIX, 'utf8');
  log(`Reading ${FILE_TO_FIX}...`, 'cyan');
  
  // Create backup
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = FILE_TO_FIX.replace('.js', `-backup-${timestamp}.js`);
  fs.writeFileSync(backupFile, content);
  log(`Created backup: ${backupFile}`, 'cyan');
  
  let fixCount = 0;
  
  // 1. Fix duplicate imports
  log('\nChecking for duplicate imports...', 'yellow');
  
  // Remove duplicate SmartResourceHub imports
  const importPattern = /import SmartResourceHub from ['"]\.\/SmartResourceHub['"];?\s*\n?/g;
  const imports = content.match(importPattern) || [];
  
  if (imports.length > 1) {
    log(`Found ${imports.length} SmartResourceHub imports, keeping only the first one`, 'yellow');
    
    // Keep only the first import
    let firstImportFound = false;
    content = content.replace(importPattern, (match) => {
      if (!firstImportFound) {
        firstImportFound = true;
        return match;
      }
      fixCount++;
      return '';
    });
  }
  
  // Remove duplicate import comments
  content = content.replace(/(\/\/ Import SmartResourceHub component\s*\n)+/g, '');
  
  // 2. Fix duplicate state declarations
  log('\nChecking for duplicate state declarations...', 'yellow');
  
  // Pattern to find resourceHubProgress state declarations
  const statePattern = /const \[resourceHubProgress, setResourceHubProgress\] = useState\(0\);\s*\n?/g;
  const stateDeclarations = content.match(statePattern) || [];
  
  if (stateDeclarations.length > 1) {
    log(`Found ${stateDeclarations.length} resourceHubProgress state declarations, keeping only the first one`, 'yellow');
    
    // Keep only the first state declaration
    let firstStateFound = false;
    content = content.replace(statePattern, (match) => {
      if (!firstStateFound) {
        firstStateFound = true;
        return match;
      }
      fixCount++;
      return '';
    });
  }
  
  // 3. Fix duplicate resource-hub sections in the sections array
  log('\nChecking for duplicate resource-hub sections...', 'yellow');
  
  // Find the sections array
  const sectionsArrayMatch = content.match(/const sections = \[([\s\S]*?)\];/);
  
  if (sectionsArrayMatch) {
    let sectionsContent = sectionsArrayMatch[1];
    const originalSectionsContent = sectionsContent;
    
    // Count resource-hub sections
    const resourceHubPattern = /\{\s*id:\s*['"]resource-hub['"],[\s\S]*?\},?/g;
    const resourceHubSections = sectionsContent.match(resourceHubPattern) || [];
    
    if (resourceHubSections.length > 1) {
      log(`Found ${resourceHubSections.length} resource-hub sections, keeping only the first one`, 'yellow');
      
      // Keep only the first resource-hub section
      let firstResourceHubFound = false;
      sectionsContent = sectionsContent.replace(resourceHubPattern, (match) => {
        if (!firstResourceHubFound) {
          firstResourceHubFound = true;
          return match;
        }
        fixCount++;
        return '';
      });
      
      // Clean up any double commas
      sectionsContent = sectionsContent.replace(/,\s*,/g, ',');
      sectionsContent = sectionsContent.replace(/,\s*\]/g, ']');
      
      // Replace the sections array content
      content = content.replace(originalSectionsContent, sectionsContent);
    }
  }
  
  // 4. Fix duplicate case statements
  log('\nChecking for duplicate case statements...', 'yellow');
  
  // Pattern to find resource-hub case statements
  const casePattern = /case 'resource-hub':[\s\S]*?return \([\s\S]*?\);\s*\n\s*\n/g;
  const caseStatements = content.match(casePattern) || [];
  
  if (caseStatements.length > 1) {
    log(`Found ${caseStatements.length} resource-hub case statements, keeping only the first one`, 'yellow');
    
    // Keep only the first case statement
    let firstCaseFound = false;
    content = content.replace(casePattern, (match) => {
      if (!firstCaseFound) {
        firstCaseFound = true;
        return match;
      }
      fixCount++;
      return '';
    });
  }
  
  // 5. Clean up extra blank lines
  content = content.replace(/\n{3,}/g, '\n\n');
  
  // Write the cleaned content
  fs.writeFileSync(FILE_TO_FIX, content);
  
  log(`\n✓ Cleanup complete! Fixed ${fixCount} duplicate(s)`, 'green');
  log(`✓ ${FILE_TO_FIX} has been cleaned`, 'green');
  log(`✓ Backup saved as: ${backupFile}`, 'green');
  
  // Verify the file is valid JavaScript
  try {
    require('fs').readFileSync(FILE_TO_FIX, 'utf8');
    log('\n✓ File syntax appears valid', 'green');
  } catch (error) {
    log('\n⚠ Warning: File may have syntax errors. Please check manually.', 'yellow');
  }
  
  log('\n=== Cleanup Complete ===', 'blue');
  log('\nNext steps:', 'yellow');
  log('1. Run: npm start', 'yellow');
  log('2. If there are still errors, check the backup file', 'yellow');
  log(`3. Backup location: ${backupFile}`, 'yellow');
}

// Run the cleanup
try {
  cleanupDuplicates();
} catch (error) {
  log(`\nError: ${error.message}`, 'red');
  log('The original file has not been modified.', 'yellow');
  process.exit(1);
}
#!/usr/bin/env node

const fs = require('fs');

// Configuration
const FILE_TO_CHECK = process.argv[2] || 'App.js';

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

// Verification function
function verifyIntegration() {
  log('=== Verifying SmartResourceHub Integration ===\n', 'blue');
  
  // Check if file exists
  if (!fs.existsSync(FILE_TO_CHECK)) {
    log(`Error: ${FILE_TO_CHECK} not found`, 'red');
    process.exit(1);
  }
  
  // Read the file
  const content = fs.readFileSync(FILE_TO_CHECK, 'utf8');
  log(`Checking ${FILE_TO_CHECK}...`, 'cyan');
  
  const checks = {
    import: false,
    state: false,
    section: false,
    caseStatement: false
  };
  
  const issues = [];
  
  // 1. Check for SmartResourceHub import
  log('\n1. Checking import statement...', 'yellow');
  const importPattern = /import SmartResourceHub from ['"]\.\/SmartResourceHub['"];?/;
  const importMatches = content.match(/import SmartResourceHub from ['"]\.\/SmartResourceHub['"];?/g) || [];
  
  if (importMatches.length === 0) {
    issues.push('Missing SmartResourceHub import');
    log('  ✗ No import found', 'red');
  } else if (importMatches.length > 1) {
    issues.push(`Found ${importMatches.length} duplicate imports`);
    log(`  ✗ Found ${importMatches.length} imports (should be 1)`, 'red');
  } else {
    checks.import = true;
    log('  ✓ Import statement found', 'green');
  }
  
  // 2. Check for resourceHubProgress state
  log('\n2. Checking state declaration...', 'yellow');
  const stateMatches = content.match(/const \[resourceHubProgress, setResourceHubProgress\] = useState\(0\);/g) || [];
  
  if (stateMatches.length === 0) {
    issues.push('Missing resourceHubProgress state');
    log('  ✗ No state declaration found', 'red');
  } else if (stateMatches.length > 1) {
    issues.push(`Found ${stateMatches.length} duplicate state declarations`);
    log(`  ✗ Found ${stateMatches.length} state declarations (should be 1)`, 'red');
  } else {
    checks.state = true;
    log('  ✓ State declaration found', 'green');
  }
  
  // 3. Check for resource-hub section
  log('\n3. Checking sections array...', 'yellow');
  const sectionMatches = content.match(/id:\s*['"]resource-hub['"]/g) || [];
  
  if (sectionMatches.length === 0) {
    issues.push('Missing resource-hub section');
    log('  ✗ No resource-hub section found', 'red');
  } else if (sectionMatches.length > 1) {
    issues.push(`Found ${sectionMatches.length} duplicate resource-hub sections`);
    log(`  ✗ Found ${sectionMatches.length} resource-hub sections (should be 1)`, 'red');
  } else {
    checks.section = true;
    log('  ✓ Resource-hub section found', 'green');
  }
  
  // 4. Check for case statement
  log('\n4. Checking case statement...', 'yellow');
  const caseMatches = content.match(/case 'resource-hub':/g) || [];
  
  if (caseMatches.length === 0) {
    issues.push('Missing resource-hub case statement');
    log('  ✗ No case statement found', 'red');
  } else if (caseMatches.length > 1) {
    issues.push(`Found ${caseMatches.length} duplicate case statements`);
    log(`  ✗ Found ${caseMatches.length} case statements (should be 1)`, 'red');
  } else {
    checks.caseStatement = true;
    log('  ✓ Case statement found', 'green');
  }
  
  // 5. Check if SmartResourceHub component is used
  log('\n5. Checking component usage...', 'yellow');
  if (content.includes('<SmartResourceHub')) {
    log('  ✓ SmartResourceHub component is used', 'green');
  } else {
    issues.push('SmartResourceHub component not used in render');
    log('  ✗ SmartResourceHub component not found in render', 'red');
  }
  
  // Summary
  log('\n=== Summary ===', 'blue');
  
  const allChecksPass = Object.values(checks).every(check => check === true);
  
  if (allChecksPass && issues.length === 0) {
    log('\n✓ All integration checks passed!', 'green');
    log('✓ SmartResourceHub is properly integrated', 'green');
    log('\nYou should be able to run: npm start', 'green');
  } else {
    log('\n✗ Integration issues found:', 'red');
    issues.forEach(issue => {
      log(`  - ${issue}`, 'red');
    });
    
    log('\nRecommended actions:', 'yellow');
    if (issues.some(i => i.includes('duplicate'))) {
      log('  1. Run: node cleanup-duplicates.js', 'yellow');
    }
    if (issues.some(i => i.includes('Missing'))) {
      log('  2. Run: node apply-patches.js', 'yellow');
    }
  }
  
  // Check for SmartResourceHub.js file
  log('\n=== File Check ===', 'blue');
  if (fs.existsSync('SmartResourceHub.js')) {
    log('✓ SmartResourceHub.js file exists', 'green');
  } else {
    log('✗ SmartResourceHub.js file not found!', 'red');
    log('  Make sure SmartResourceHub.js is in the same directory', 'yellow');
  }
}

// Run verification
try {
  verifyIntegration();
} catch (error) {
  log(`\nError: ${error.message}`, 'red');
  process.exit(1);
}
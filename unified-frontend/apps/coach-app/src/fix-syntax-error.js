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

// Main function to fix syntax error
function fixSyntaxError() {
  log('=== Fixing Syntax Error in Sections Array ===\n', 'blue');
  
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
  const backupFile = FILE_TO_FIX.replace('.js', `-syntax-backup-${timestamp}.js`);
  fs.writeFileSync(backupFile, content);
  log(`Created backup: ${backupFile}`, 'cyan');
  
  // Split content into lines for better analysis
  const lines = content.split('\n');
  
  // Find the line with the error (around line 2040)
  log('\nLooking for syntax error around line 2040...', 'yellow');
  
  // Check lines around the error
  const errorLine = 2040 - 1; // Arrays are 0-indexed
  const startCheck = Math.max(0, errorLine - 10);
  const endCheck = Math.min(lines.length, errorLine + 10);
  
  log('\nCode around the error:', 'yellow');
  for (let i = startCheck; i < endCheck; i++) {
    const lineNum = i + 1;
    const prefix = lineNum === 2040 ? '>>> ' : '    ';
    const color = lineNum === 2040 ? 'red' : 'reset';
    log(`${prefix}${lineNum}: ${lines[i]}`, color);
  }
  
  // Fix the specific syntax error
  // The error shows there's an extra comma or empty object
  // Let's fix the sections array structure
  
  // Method 1: Fix double closing braces
  let fixed = false;
  
  // Look for patterns like },\n    },
  content = content.replace(/},\s*\n\s*},/g, (match) => {
    log('\nFound double closing brace pattern, fixing...', 'yellow');
    fixed = true;
    return '},';
  });
  
  // Method 2: Look for the specific error pattern around resource-hub
  if (!fixed) {
    // Find the sections array
    const sectionsMatch = content.match(/const sections = \[([\s\S]*?)\];/);
    
    if (sectionsMatch) {
      let sectionsContent = sectionsMatch[1];
      const originalSections = sectionsContent;
      
      // Look for the resource-hub section and fix any syntax issues
      sectionsContent = sectionsContent.replace(/\{\s*id:\s*['"]resource-hub['"],\s*title:\s*['"]Personalized Resources['"],\s*type:\s*['"]resource-hub['"],\s*content:\s*\{\s*\}\s*\},?\s*},?/g, (match) => {
        log('\nFound malformed resource-hub section, fixing...', 'yellow');
        fixed = true;
        return `{
      id: 'resource-hub',
      title: 'Personalized Resources',
      type: 'resource-hub',
      content: {}
    },`;
      });
      
      // Fix any double commas
      sectionsContent = sectionsContent.replace(/,\s*,/g, ',');
      
      // Fix trailing commas before closing bracket
      sectionsContent = sectionsContent.replace(/,\s*\]/g, ']');
      
      // Replace the sections content if we made changes
      if (sectionsContent !== originalSections) {
        content = content.replace(sectionsMatch[0], `const sections = [${sectionsContent}];`);
        fixed = true;
      }
    }
  }
  
  // Method 3: Direct fix for the specific line error
  if (!fixed) {
    // The error shows },\n    }, which suggests an extra closing brace
    const errorPattern = /}\s*,\s*\n\s*},\s*\n\s*\{\s*id:\s*['"]comprehension-check['"]/;
    
    if (content.match(errorPattern)) {
      log('\nFound the exact error pattern, fixing...', 'yellow');
      content = content.replace(errorPattern, '},\n    {\n      id: \'comprehension-check\'');
      fixed = true;
    }
  }
  
  // Method 4: More aggressive fix - clean up the entire sections array
  if (!fixed) {
    log('\nAttempting comprehensive sections array cleanup...', 'yellow');
    
    // Extract sections array
    const sectionsStart = content.indexOf('const sections = [');
    const sectionsEnd = content.indexOf('];', sectionsStart) + 2;
    
    if (sectionsStart !== -1 && sectionsEnd > sectionsStart) {
      const beforeSections = content.substring(0, sectionsStart);
      const afterSections = content.substring(sectionsEnd);
      
      // Rebuild sections array with proper formatting
      const sectionsArray = `const sections = [
    {
      id: 'profile-deep-dive',
      title: 'Profile Deep Dive',
      type: 'interactive-review',
      content: {
        overview: {
          name: student.name,
          grade: student.grade,
          focus: student.focusArea,
          gpa: '3.7',
          satScore: '1350',
          weaknesses: ['Time management', 'Essay writing'],
          strengths: ['STEM subjects', 'Leadership'],
          parentExpectations: 'Ivy League acceptance',
          culturalContext: student.culturalBackground
        }
      }
    },
    {
      id: 'resource-hub',
      title: 'Personalized Resources',
      type: 'resource-hub',
      content: {}
    },
    {
      id: 'comprehension-check',
      title: 'Comprehension Check',
      type: 'quiz',
      questions: [
        {
          id: 'q1',
          question: \`What is \${student.name}'s primary academic weakness that needs immediate attention?\`,
          options: [
            'Mathematics performance',
            'Time management',
            'Science grades',
            'Extracurricular activities'
          ],
          correct: 1,
          explanation: 'Time management is critical for balancing their rigorous course load.'
        },
        {
          id: 'q2',
          question: \`Given \${student.name}'s \${student.focusArea} focus, which standardized test should be prioritized?\`,
          options: [
            'AP Biology and Chemistry',
            'SAT Subject Tests only',
            'ACT over SAT',
            'TOEFL examination'
          ],
          correct: 0,
          explanation: \`For \${student.focusArea} track students, AP sciences are crucial for college applications.\`
        },
        {
          id: 'q3',
          question: 'What cultural consideration is most important for parent communications?',
          options: [
            'Email-only communication',
            'Emphasizing prestige and rankings',
            'Avoiding direct feedback',
            'Informal communication style'
          ],
          correct: 1,
          explanation: \`\${student.culturalBackground} families often prioritize institutional prestige.\`
        }
      ]
    },
    {
      id: 'scenario-practice',
      title: 'Real Scenario Practice',
      type: 'scenarios',
      scenarios: [
        {
          id: 's1',
          situation: \`\${student.name} says: "My parents want me to apply to only Ivy League schools, but my SAT score isn't high enough. I'm stressed and don't know what to do."\`,
          responseOptions: [
            {
              text: "Don't worry about it, there are many great schools beyond the Ivies.",
              score: 0,
              feedback: "Too dismissive of family expectations. Try acknowledging their goals first."
            },
            {
              text: "Let's create a strategic plan to improve your SAT score while also identifying target and safety schools that align with your goals.",
              score: 100,
              feedback: "Perfect! You acknowledged the goal while providing practical solutions."
            },
            {
              text: "Your parents need to be more realistic about college admissions.",
              score: 0,
              feedback: "Never criticize parents directly. Focus on student empowerment."
            }
          ]
        },
        {
          id: 's2',
          situation: \`During a session, \${student.name} breaks down crying: "I got a B+ in AP Chemistry. My parents are going to be so disappointed. I'm a failure."\`,
          responseOptions: [
            {
              text: "A B+ is still a good grade! Don't be so hard on yourself.",
              score: 30,
              feedback: "While positive, this minimizes their feelings. Acknowledge the emotion first."
            },
            {
              text: "I understand this feels overwhelming. Let's talk about what happened and create a plan to improve while maintaining perspective on your overall strong performance.",
              score: 100,
              feedback: "Excellent! You validated feelings while staying solution-focused."
            },
            {
              text: "One B+ won't ruin your college chances. You're overreacting.",
              score: 0,
              feedback: "Dismissive and unhelpful. Always validate student emotions."
            }
          ]
        }
      ]
    }
  ];`;
      
      content = beforeSections + sectionsArray + afterSections;
      fixed = true;
      log('Rebuilt sections array with correct syntax', 'green');
    }
  }
  
  if (fixed) {
    // Write the fixed content
    fs.writeFileSync(FILE_TO_FIX, content);
    log(`\n✓ Fixed syntax error in ${FILE_TO_FIX}`, 'green');
    log(`✓ Backup saved as: ${backupFile}`, 'green');
  } else {
    log('\n⚠ Could not automatically fix the syntax error', 'yellow');
    log('Please check the backup file and fix manually', 'yellow');
  }
  
  log('\n=== Fix Complete ===', 'blue');
  log('\nNext steps:', 'yellow');
  log('1. Run: npm start', 'yellow');
  log('2. If there are still errors, check the backup file', 'yellow');
}

// Run the fix
try {
  fixSyntaxError();
} catch (error) {
  log(`\nError: ${error.message}`, 'red');
  process.exit(1);
}
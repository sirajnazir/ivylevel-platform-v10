// scripts/managePatchesAndTest.js
// Tool to manage patches and test filename parsing

const fs = require('fs').promises;
const path = require('path');
const RobustVideoIndexer = require('./robustVideoIndexer');

async function loadPatches() {
  const patchPath = path.join(__dirname, 'indexer-patches.json');
  const data = await fs.readFile(patchPath, 'utf8');
  return JSON.parse(data);
}

async function savePatches(patches) {
  const patchPath = path.join(__dirname, 'indexer-patches.json');
  await fs.writeFile(patchPath, JSON.stringify(patches, null, 2));
}

// Test filename parsing
async function testFilenames() {
  console.log('🧪 Testing filename parsing...\n');
  
  const indexer = new RobustVideoIndexer();
  await indexer.initialize();
  
  // Test cases - add your problematic filenames here
  const testCases = [
    // Standard formats
    'COACHING_A_Marissa_Iqra_Wk39_2025-01-11_M_81240877673U_Fklj9c+mSpOWVbYGWwyQCA==.mp4',
    'TRIVIAL_A_unknown_Kavya_2025-01-11_M_89548749720U_ZFR07AjMSiKUfW1nYaCFAw==.m4a',
    'MISC_A_unknown_Unknown_WkUnknown_2025-01-12_M_89548749720U_yIC7IGZ5Qn2j9SBaipU0yg==.mp4',
    
    // Problematic formats to test
    'Coaching_A_Jenny_Arshiya_Wk10_2025-01-12_M_82629525135U_NtVUftO2TTauPMQooyTdcg==.m4a',
    'NO_SHOW_A_Ivylevel_Beya_WkUnknown_2025-04-29_M_6623439753U_hd75PPPWSwCBWyZF+r2LzQ==.mp4',
    
    // Edge cases
    'Kelvin_Chen_Session_2025-01-15.mp4',
    'Jamie & Sarah - College Apps Discussion.mp4',
    'SAT Prep - Noor with Michael - Week 5.mp4',
    '168 Hour Session - Andrew and Kevin.mov',
    
    // Add your own test cases here
    'Coaching_B_Jenny_Anoushka_Wk12_2025-01-03_M_e69d0d609def9896U_e69d0d609def9896.mp4',
    'Coaching_B_Rishi_Aarav_Wk05_2024-07-24_M_7cb9aa93e4262a76U_7cb9aa93e4262a76.mp4',
    'Coaching_B_Andrew_Advay_Wk21_2024-09-14_M_6dc91810439554f2U_6dc91810439554f2.mp4'
  ].filter(f => f); // Remove empty entries
  
  console.log('Testing parsing on sample filenames:\n');
  
  for (const filename of testCases) {
    const info = indexer.parseFileName(filename, '/Test/Path');
    
    console.log(`📄 ${filename}`);
    console.log(`   Parse method: ${info.parseMethod || 'failed'}`);
    console.log(`   Coach: ${info.coach} → ${indexer.normalizeCoachName(info.coach)}`);
    console.log(`   Student: ${info.student} → ${indexer.normalizeStudentName(info.student)}`);
    console.log(`   Week: ${info.week || 'N/A'}`);
    console.log(`   Date: ${info.date ? info.date.toLocaleDateString() : 'N/A'}`);
    console.log(`   Type: ${info.sessionType}`);
    console.log(`   Subjects: ${info.subjects.join(', ')}`);
    console.log(`   Confidence: ${indexer.calculateConfidence(info).toFixed(2)}`);
    console.log('');
  }
}

// Add a new patch interactively
async function addPatch() {
  console.log('➕ Add a new patch\n');
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const question = (prompt) => new Promise((resolve) => {
    readline.question(prompt, resolve);
  });
  
  const patchType = await question('Patch type (coach-variation/student-correction/file-pattern/session-type/subject-rule): ');
  
  let patch = {
    name: await question('Patch name/description: '),
    type: patchType,
    description: await question('Detailed description: ')
  };
  
  switch (patchType) {
    case 'coach-variation':
      patch.coach = await question('Coach name (normalized): ');
      const variations = await question('Variations (comma-separated): ');
      patch.variations = variations.split(',').map(v => v.trim());
      break;
      
    case 'student-correction':
      console.log('Enter corrections as "wrong:correct" pairs (use "wrong:null" for review)');
      const corrections = await question('Corrections (comma-separated): ');
      patch.corrections = {};
      corrections.split(',').forEach(pair => {
        const [wrong, correct] = pair.split(':').map(s => s.trim());
        patch.corrections[wrong] = correct === 'null' ? null : correct;
      });
      break;
      
    case 'file-pattern':
      patch.pattern = await question('Regex pattern: ');
      patch.flags = await question('Regex flags (default: i): ') || 'i';
      break;
      
    case 'session-type':
      patch.pattern = await question('Detection pattern: ');
      patch.sessionType = await question('Session type name: ');
      break;
      
    case 'subject-rule':
      patch.pattern = await question('Detection pattern: ');
      patch.subject = await question('Subject name: ');
      break;
  }
  
  readline.close();
  
  // Load existing patches and add new one
  const config = await loadPatches();
  config.patches.push(patch);
  config.lastUpdated = new Date().toISOString().split('T')[0];
  
  await savePatches(config);
  console.log('\n✅ Patch added successfully!');
}

// List all patches
async function listPatches() {
  const config = await loadPatches();
  
  console.log('📋 Current patches:\n');
  config.patches.forEach((patch, index) => {
    console.log(`${index + 1}. ${patch.name} (${patch.type})`);
    console.log(`   ${patch.description}`);
    console.log('');
  });
  
  console.log(`Total patches: ${config.patches.length}`);
  console.log(`Last updated: ${config.lastUpdated}`);
}

// Main menu
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'test':
      await testFilenames();
      break;
      
    case 'add':
      await addPatch();
      break;
      
    case 'list':
      await listPatches();
      break;
      
    default:
      console.log('📋 Patch Management Tool\n');
      console.log('Usage:');
      console.log('  node managePatchesAndTest.js test    - Test filename parsing');
      console.log('  node managePatchesAndTest.js add     - Add a new patch');
      console.log('  node managePatchesAndTest.js list    - List all patches');
      console.log('\nEdit indexer-patches.json directly for more complex changes.');
  }
}

// Run
main().catch(console.error);
// scripts/analyzeUnknownCoaches.js
// Analyze sessions with unknown coaches to identify patterns

const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Initialize Firebase Admin
try {
  const serviceAccount = require('../credentials/firebase-admin.json');
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
  }
} catch (error) {
  console.error('Firebase admin initialization error:', error.message);
  process.exit(1);
}

const db = admin.firestore();

async function analyzeUnknownCoaches() {
  console.log('🔍 Analyzing sessions with unknown coaches...\n');
  
  // Query sessions with unknown coach
  const unknownCoachSnapshot = await db.collection('coaching_sessions')
    .where('participants.coach', '==', 'unknown')
    .limit(20)
    .get();
  
  console.log(`Found ${unknownCoachSnapshot.size} sessions with unknown coach (showing first 20)\n`);
  
  const patterns = {};
  const fileFormats = {};
  
  unknownCoachSnapshot.forEach(doc => {
    const session = doc.data();
    const fileName = session.originalFileName;
    const info = session.extractionInfo;
    
    console.log(`📄 ${fileName}`);
    console.log(`   Parse method: ${info?.parseMethod || 'N/A'}`);
    console.log(`   Raw coach: "${info?.coach || 'N/A'}"`);
    console.log(`   Folder: ${session.folderPath || 'N/A'}`);
    console.log('');
    
    // Collect file format patterns
    const format = fileName.split('_').slice(0, 3).join('_');
    fileFormats[format] = (fileFormats[format] || 0) + 1;
    
    // Look for potential coach names in the filename
    const parts = fileName.split(/[_\-\s]+/);
    parts.forEach(part => {
      if (part.length > 2 && 
          !['unknown', 'misc', 'coaching', 'trivial', 'show', 'week', 'wk'].includes(part.toLowerCase()) &&
          !/^\d+$/.test(part) &&
          !/\.(mp4|m4a|mov|avi)$/i.test(part)) {
        patterns[part.toLowerCase()] = (patterns[part.toLowerCase()] || 0) + 1;
      }
    });
  });
  
  console.log('\n📊 Common file format patterns:');
  Object.entries(fileFormats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([format, count]) => {
      console.log(`  ${format}: ${count} files`);
    });
  
  console.log('\n🔤 Potential unrecognized coach names:');
  Object.entries(patterns)
    .filter(([name, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .forEach(([name, count]) => {
      console.log(`  "${name}": appears ${count} times`);
    });
}

// Also check sessions that were successfully parsed
async function analyzeSuccessfulParsing() {
  console.log('\n\n✅ Analyzing successfully parsed sessions...\n');
  
  const successSnapshot = await db.collection('coaching_sessions')
    .where('participants.coach', '!=', 'unknown')
    .limit(20)
    .get();
  
  console.log('Examples of successfully parsed sessions:\n');
  
  successSnapshot.forEach(doc => {
    const session = doc.data();
    const fileName = session.originalFileName;
    const info = session.extractionInfo;
    
    console.log(`✓ ${fileName}`);
    console.log(`  Coach: ${session.participants.coach} → ${session.participants.coachNormalized}`);
    console.log(`  Parse method: ${info?.parseMethod || 'N/A'}`);
    console.log('');
  });
}

// Main execution
async function main() {
  await analyzeUnknownCoaches();
  await analyzeSuccessfulParsing();
  process.exit(0);
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
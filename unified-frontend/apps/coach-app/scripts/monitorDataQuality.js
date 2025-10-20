// scripts/monitorDataQuality.js
// Monitor and report on video data quality

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

async function generateDataQualityReport() {
  console.log('📊 Generating Data Quality Report...\n');
  
  // Get all coaching sessions
  const snapshot = await db.collection('coaching_sessions').get();
  console.log(`Total sessions in database: ${snapshot.size}\n`);
  
  const stats = {
    total: snapshot.size,
    byQuality: {
      complete: 0,
      partial: 0,
      needsReview: 0
    },
    missingData: {
      coach: 0,
      student: 0,
      week: 0,
      date: 0
    },
    byCoach: {},
    bySessionType: {},
    byYear: {},
    recentIssues: [],
    patterns: {
      commonMissingData: {},
      problematicPaths: {}
    }
  };
  
  // Analyze each session
  snapshot.forEach(doc => {
    const session = doc.data();
    
    // Quality assessment
    if (session.needsReview) {
      stats.byQuality.needsReview++;
      
      // Track recent issues
      if (session.indexedAt && new Date(session.indexedAt.toDate()) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
        stats.recentIssues.push({
          id: doc.id,
          file: session.originalFileName,
          reasons: session.reviewReasons || ['Unknown'],
          path: session.folderPath
        });
      }
    } else if (session.dataQuality && session.dataQuality.confidence >= 0.8) {
      stats.byQuality.complete++;
    } else {
      stats.byQuality.partial++;
    }
    
    // Missing data tracking
    if (!session.participants?.coach || session.participants.coach === 'unknown') {
      stats.missingData.coach++;
    }
    if (!session.participants?.student || session.participants.student === 'Unknown') {
      stats.missingData.student++;
    }
    if (!session.sessionInfo?.week || session.sessionInfo.week === 'Unknown') {
      stats.missingData.week++;
    }
    if (!session.sessionInfo?.date) {
      stats.missingData.date++;
    }
    
    // By coach
    const coach = session.participants?.coachNormalized || session.participants?.coach || 'unknown';
    stats.byCoach[coach] = (stats.byCoach[coach] || 0) + 1;
    
    // By session type
    const type = session.sessionInfo?.type || 'unknown';
    stats.bySessionType[type] = (stats.bySessionType[type] || 0) + 1;
    
    // By year
    const year = session.sessionInfo?.date ? 
      new Date(session.sessionInfo.date.toDate ? session.sessionInfo.date.toDate() : session.sessionInfo.date).getFullYear() : 
      'unknown';
    stats.byYear[year] = (stats.byYear[year] || 0) + 1;
    
    // Pattern detection
    if (session.folderPath) {
      const pathKey = session.folderPath.split('/').slice(0, 2).join('/');
      if (!stats.patterns.problematicPaths[pathKey]) {
        stats.patterns.problematicPaths[pathKey] = { total: 0, issues: 0 };
      }
      stats.patterns.problematicPaths[pathKey].total++;
      if (session.needsReview) {
        stats.patterns.problematicPaths[pathKey].issues++;
      }
    }
  });
  
  // Generate report
  console.log('📊 DATA QUALITY REPORT');
  console.log('====================\n');
  
  console.log('Overall Quality:');
  console.log(`  ✅ Complete: ${stats.byQuality.complete} (${(stats.byQuality.complete / stats.total * 100).toFixed(1)}%)`);
  console.log(`  ⚠️  Partial: ${stats.byQuality.partial} (${(stats.byQuality.partial / stats.total * 100).toFixed(1)}%)`);
  console.log(`  ❌ Needs Review: ${stats.byQuality.needsReview} (${(stats.byQuality.needsReview / stats.total * 100).toFixed(1)}%)`);
  
  console.log('\nMissing Data:');
  console.log(`  Coach: ${stats.missingData.coach} sessions`);
  console.log(`  Student: ${stats.missingData.student} sessions`);
  console.log(`  Week: ${stats.missingData.week} sessions`);
  console.log(`  Date: ${stats.missingData.date} sessions`);
  
  console.log('\nSessions by Coach:');
  Object.entries(stats.byCoach)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([coach, count]) => {
      console.log(`  ${coach}: ${count} sessions`);
    });
  
  console.log('\nSessions by Type:');
  Object.entries(stats.bySessionType)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  ${type}: ${count} sessions`);
    });
  
  console.log('\nProblematic Folder Paths:');
  Object.entries(stats.patterns.problematicPaths)
    .filter(([path, data]) => data.issues > 0)
    .sort((a, b) => b[1].issues - a[1].issues)
    .slice(0, 5)
    .forEach(([path, data]) => {
      const issueRate = (data.issues / data.total * 100).toFixed(1);
      console.log(`  ${path}: ${data.issues}/${data.total} issues (${issueRate}%)`);
    });
  
  if (stats.recentIssues.length > 0) {
    console.log('\nRecent Issues (last 7 days):');
    stats.recentIssues.slice(0, 5).forEach(issue => {
      console.log(`  - ${issue.file}`);
      console.log(`    ${issue.reasons.join(', ')}`);
    });
  }
  
  // Save report to Firestore
  await db.collection('quality_reports').add({
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    stats: stats,
    reportType: 'comprehensive'
  });
  
  console.log('\n✅ Report saved to Firestore');
  
  return stats;
}

async function identifyPatchOpportunities() {
  console.log('\n🔍 Identifying Patch Opportunities...\n');
  
  // Query sessions that need review
  const needsReviewSnapshot = await db.collection('coaching_sessions')
    .where('needsReview', '==', true)
    .limit(100)
    .get();
  
  const patterns = {
    coachNames: {},
    studentNames: {},
    filePatterns: [],
    folderStructures: {}
  };
  
  needsReviewSnapshot.forEach(doc => {
    const session = doc.data();
    const info = session.extractionInfo;
    
    if (info) {
      // Collect unrecognized coach names
      if (info.coach && info.coach !== 'unknown' && info.coach === session.participants?.coach) {
        patterns.coachNames[info.coach] = (patterns.coachNames[info.coach] || 0) + 1;
      }
      
      // Collect problematic student names
      if (info.student && info.student !== 'Unknown') {
        patterns.studentNames[info.student] = (patterns.studentNames[info.student] || 0) + 1;
      }
      
      // Collect file patterns that failed parsing
      if (info.parseMethod === null || info.parseMethod === 'folder-based') {
        patterns.filePatterns.push(session.originalFileName);
      }
    }
  });
  
  console.log('Suggested Patches:\n');
  
  // Suggest coach name patches
  if (Object.keys(patterns.coachNames).length > 0) {
    console.log('Coach Name Variations to Add:');
    Object.entries(patterns.coachNames)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([name, count]) => {
        console.log(`  "${name}" appears ${count} times - consider adding to coach variations`);
      });
  }
  
  // Suggest student corrections
  const problematicStudentNames = Object.entries(patterns.studentNames)
    .filter(([name]) => name.toLowerCase() === name || name.includes('unknown'))
    .sort((a, b) => b[1] - a[1]);
    
  if (problematicStudentNames.length > 0) {
    console.log('\nStudent Names to Correct:');
    problematicStudentNames.slice(0, 5).forEach(([name, count]) => {
      console.log(`  "${name}" appears ${count} times`);
    });
  }
  
  // Show unparseable file patterns
  if (patterns.filePatterns.length > 0) {
    console.log('\nUnparseable File Patterns:');
    patterns.filePatterns.slice(0, 5).forEach(file => {
      console.log(`  ${file}`);
    });
    console.log(`  Consider adding new file patterns for these`);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'patches':
      await identifyPatchOpportunities();
      break;
      
    default:
      await generateDataQualityReport();
      await identifyPatchOpportunities();
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
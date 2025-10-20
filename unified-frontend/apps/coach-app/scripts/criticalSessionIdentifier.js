// scripts/criticalSessionIdentifier.js
// Identify and categorize critical coaching sessions for onboarding

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

// Critical session types for coach onboarding
const CRITICAL_SESSION_TYPES = {
  GAME_PLAN: {
    patterns: [
      /game[\s-]?plan/i,
      /assessment/i,
      /initial[\s-]?consultation/i,
      /strategy[\s-]?session/i,
      /diagnostic/i
    ],
    priority: 1,
    description: 'Initial game plan and assessment session',
    requiredForOnboarding: true
  },
  '168_HOUR': {
    patterns: [
      /168[\s-]?hour/i,
      /first[\s-]?session/i,
      /week[\s-]?[12]/i,
      /onboarding[\s-]?session/i,
      /kick[\s-]?off/i
    ],
    priority: 1,
    description: 'The critical 168-hour session (usually week 1-2)',
    requiredForOnboarding: true
  },
  EXECUTION: {
    patterns: [
      /execution/i,
      /weekly[\s-]?session/i,
      /regular[\s-]?session/i,
      /follow[\s-]?up/i
    ],
    priority: 2,
    description: 'Regular weekly/bi-weekly execution sessions',
    requiredForOnboarding: true,
    sampleSize: 3 // Show 3 examples
  },
  PARENT_SESSION: {
    patterns: [
      /parent/i,
      /family/i,
      /guardian/i
    ],
    priority: 3,
    description: 'Parent/family involvement sessions',
    requiredForOnboarding: false
  },
  MILESTONE: {
    patterns: [
      /milestone/i,
      /achievement/i,
      /celebration/i,
      /review/i
    ],
    priority: 3,
    description: 'Milestone and achievement review sessions',
    requiredForOnboarding: false
  }
};

// Identify session type from multiple data points
function identifySessionType(session) {
  const checkString = [
    session.originalFileName || '',
    session.title || '',
    session.description || '',
    session.folderPath || '',
    session.sessionInfo?.type || ''
  ].join(' ').toLowerCase();

  // Check week number for 168-hour session
  const week = session.sessionInfo?.week;
  if (week && (week === '1' || week === '2' || week === 1 || week === 2)) {
    // Double-check if it's really a 168-hour session
    for (const pattern of CRITICAL_SESSION_TYPES['168_HOUR'].patterns) {
      if (pattern.test(checkString)) {
        return '168_HOUR';
      }
    }
  }

  // Check all patterns
  for (const [type, config] of Object.entries(CRITICAL_SESSION_TYPES)) {
    for (const pattern of config.patterns) {
      if (pattern.test(checkString)) {
        return type;
      }
    }
  }

  // Default to execution if it's a regular coaching session
  if (session.type === 'coaching-session' && session.sessionInfo?.type === 'regular') {
    return 'EXECUTION';
  }

  return null;
}

// Find critical sessions for a specific student
async function findCriticalSessionsForStudent(studentName) {
  console.log(`\n🔍 Finding critical sessions for student: ${studentName}\n`);

  const results = {
    gamePlan: [],
    '168Hour': [],
    executionExamples: [],
    parentSessions: [],
    milestones: [],
    stats: {
      totalSessions: 0,
      criticalSessionsFound: 0,
      coaches: new Set()
    }
  };

  // Query all sessions for this student
  const snapshot = await db.collection('coaching_sessions')
    .where('participants.studentNormalized', '==', studentName.toLowerCase())
    .orderBy('sessionInfo.date', 'desc')
    .get();

  results.stats.totalSessions = snapshot.size;
  console.log(`Found ${snapshot.size} total sessions for ${studentName}`);

  // Categorize sessions
  snapshot.forEach(doc => {
    const session = { id: doc.id, ...doc.data() };
    const sessionType = identifySessionType(session);
    
    if (session.participants?.coachNormalized) {
      results.stats.coaches.add(session.participants.coachNormalized);
    }

    if (sessionType) {
      results.stats.criticalSessionsFound++;
      
      switch (sessionType) {
        case 'GAME_PLAN':
          results.gamePlan.push(session);
          break;
        case '168_HOUR':
          results['168Hour'].push(session);
          break;
        case 'EXECUTION':
          if (results.executionExamples.length < 3) {
            results.executionExamples.push(session);
          }
          break;
        case 'PARENT_SESSION':
          results.parentSessions.push(session);
          break;
        case 'MILESTONE':
          results.milestones.push(session);
          break;
      }
    }
  });

  return results;
}

// Generate onboarding resource package for a new coach
async function generateCoachOnboardingPackage(newCoachName, studentName) {
  console.log(`\n📦 Generating onboarding package for Coach ${newCoachName} → Student ${studentName}\n`);

  const criticalSessions = await findCriticalSessionsForStudent(studentName);
  
  const onboardingPackage = {
    coach: newCoachName,
    student: studentName,
    generatedAt: new Date(),
    requiredViewings: {
      gamePlan: {
        title: 'Game Plan Session (MUST WATCH)',
        description: 'Understand the student\'s goals, challenges, and personalized strategy',
        sessions: criticalSessions.gamePlan.slice(0, 1), // Most recent game plan
        required: true,
        estimatedTime: '45-60 minutes'
      },
      '168Hour': {
        title: '168-Hour Session Examples',
        description: 'Learn how to conduct your first critical session',
        sessions: criticalSessions['168Hour'],
        required: true,
        estimatedTime: '60-90 minutes'
      },
      executionExamples: {
        title: 'Weekly Execution Session Examples',
        description: 'Understand the flow and best practices of regular sessions',
        sessions: criticalSessions.executionExamples,
        required: true,
        estimatedTime: '30 minutes per session'
      }
    },
    additionalResources: {
      parentSessions: {
        title: 'Parent Communication Examples',
        sessions: criticalSessions.parentSessions.slice(0, 2),
        required: false
      },
      milestones: {
        title: 'Milestone & Achievement Sessions',
        sessions: criticalSessions.milestones,
        required: false
      }
    },
    bestPractices: generateBestPractices(criticalSessions),
    previousCoaches: Array.from(criticalSessions.stats.coaches),
    totalHistoricalSessions: criticalSessions.stats.totalSessions,
    checklist: generateOnboardingChecklist()
  };

  // Save to Firestore
  const docRef = await db.collection('coach_onboarding_packages').add(onboardingPackage);
  console.log(`✅ Onboarding package saved: ${docRef.id}`);

  return { id: docRef.id, ...onboardingPackage };
}

// Generate best practices based on session analysis
function generateBestPractices(criticalSessions) {
  const practices = [];

  if (criticalSessions.gamePlan.length > 0) {
    practices.push({
      topic: 'Student Background',
      insights: [
        'Review the game plan thoroughly to understand goals and challenges',
        'Note any specific learning preferences or accommodations',
        'Identify key milestones and success metrics defined in the game plan'
      ]
    });
  }

  if (criticalSessions['168Hour'].length > 0) {
    practices.push({
      topic: 'First Session Preparation',
      insights: [
        'The 168-hour session sets the tone for the entire program',
        'Focus on building rapport and establishing clear expectations',
        'Create a structured agenda based on previous successful sessions'
      ]
    });
  }

  if (criticalSessions.executionExamples.length > 0) {
    practices.push({
      topic: 'Weekly Session Flow',
      insights: [
        'Start with a check-in on previous week\'s action items',
        'Maintain consistent documentation in the execution doc',
        'End each session with clear, achievable action items'
      ]
    });
  }

  return practices;
}

// Generate onboarding checklist
function generateOnboardingChecklist() {
  return [
    {
      task: 'Watch Game Plan Session',
      required: true,
      completed: false,
      estimatedTime: '60 minutes'
    },
    {
      task: 'Review 168-Hour Session Examples',
      required: true,
      completed: false,
      estimatedTime: '90 minutes'
    },
    {
      task: 'Study Weekly Execution Patterns',
      required: true,
      completed: false,
      estimatedTime: '60 minutes'
    },
    {
      task: 'Review Student Execution Doc',
      required: true,
      completed: false,
      estimatedTime: '30 minutes'
    },
    {
      task: 'Complete Onboarding Quiz',
      required: true,
      completed: false,
      estimatedTime: '15 minutes'
    },
    {
      task: 'Schedule First Session',
      required: true,
      completed: false,
      estimatedTime: '5 minutes'
    }
  ];
}

// Batch identify and tag all critical sessions
async function batchIdentifyCriticalSessions() {
  console.log('🏷️  Batch identifying critical sessions...\n');

  let processed = 0;
  let tagged = 0;
  let pageToken = null;
  const batchSize = 500;

  do {
    const query = db.collection('coaching_sessions')
      .limit(batchSize)
      .orderBy('__name__');
    
    if (pageToken) {
      query.startAfter(pageToken);
    }

    const snapshot = await query.get();
    
    if (snapshot.empty) break;

    const batch = db.batch();
    let batchUpdates = 0;

    snapshot.forEach(doc => {
      const session = doc.data();
      const criticalType = identifySessionType(session);
      
      if (criticalType && (!session.criticalSessionType || session.criticalSessionType !== criticalType)) {
        batch.update(doc.ref, {
          criticalSessionType: criticalType,
          criticalSessionPriority: CRITICAL_SESSION_TYPES[criticalType].priority,
          isRequiredForOnboarding: CRITICAL_SESSION_TYPES[criticalType].requiredForOnboarding,
          criticalSessionIdentifiedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        batchUpdates++;
        tagged++;
      }
      processed++;
    });

    if (batchUpdates > 0) {
      await batch.commit();
      console.log(`  Processed: ${processed}, Tagged: ${tagged}`);
    }

    pageToken = snapshot.docs[snapshot.docs.length - 1];
  } while (true);

  console.log(`\n✅ Total processed: ${processed}, Total tagged: ${tagged}`);
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'batch':
      await batchIdentifyCriticalSessions();
      break;
      
    case 'student':
      const studentName = args[1];
      if (!studentName) {
        console.error('Please provide a student name');
        process.exit(1);
      }
      const sessions = await findCriticalSessionsForStudent(studentName);
      console.log('\n📊 Critical Sessions Summary:');
      console.log(`  Game Plans: ${sessions.gamePlan.length}`);
      console.log(`  168-Hour Sessions: ${sessions['168Hour'].length}`);
      console.log(`  Execution Examples: ${sessions.executionExamples.length}`);
      console.log(`  Parent Sessions: ${sessions.parentSessions.length}`);
      console.log(`  Milestones: ${sessions.milestones.length}`);
      console.log(`  Previous Coaches: ${Array.from(sessions.stats.coaches).join(', ')}`);
      break;
      
    case 'onboard':
      const newCoach = args[1];
      const student = args[2];
      if (!newCoach || !student) {
        console.error('Usage: node criticalSessionIdentifier.js onboard <coach> <student>');
        process.exit(1);
      }
      const package = await generateCoachOnboardingPackage(newCoach, student);
      console.log('\n✅ Onboarding package generated successfully!');
      console.log(`Package ID: ${package.id}`);
      break;
      
    default:
      console.log('Usage:');
      console.log('  node criticalSessionIdentifier.js batch                    - Tag all critical sessions');
      console.log('  node criticalSessionIdentifier.js student <name>           - Find critical sessions for a student');
      console.log('  node criticalSessionIdentifier.js onboard <coach> <student> - Generate onboarding package');
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
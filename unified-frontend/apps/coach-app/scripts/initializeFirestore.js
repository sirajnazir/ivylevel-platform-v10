// scripts/initializeFirestore.js
const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Initialize Firebase Admin
// Note: You'll need to download your service account key from Firebase Console
// and save it as credentials/firebase-admin.json
let initialized = false;

try {
  const serviceAccount = require('../credentials/firebase-admin.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
  initialized = true;
  console.log('Using Firebase Admin SDK with service account');
} catch (error) {
  // Try to use environment variables
  if (process.env.REACT_APP_FIREBASE_PROJECT_ID) {
    console.log('Service account not found, using project ID from environment');
    console.log('Note: This script requires Firebase Admin SDK credentials.');
    console.log('Please download your service account key from:');
    console.log('Firebase Console > Project Settings > Service Accounts > Generate New Private Key');
    console.log('Save it as: credentials/firebase-admin.json');
    process.exit(1);
  } else {
    console.error('Error: Firebase configuration not found.');
    console.error('Please either:');
    console.error('1. Add firebase-admin.json to /credentials directory');
    console.error('2. Set REACT_APP_FIREBASE_PROJECT_ID in .env.local');
    process.exit(1);
  }
}

const db = admin.firestore();

async function createCollections() {
  console.log('Initializing Firestore collections...');
  
  // Create sample documents to establish collections
  const collections = [
    'users', 'students', 'resources', 'coachResources',
    'resourceTemplates', 'sessions', 'notifications',
    'analytics', 'emailTemplates', 'emailQueue', 'emailHistory'
  ];

  for (const collectionName of collections) {
    try {
      await db.collection(collectionName).doc('_init').set({
        initialized: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`✓ Created collection: ${collectionName}`);
    } catch (error) {
      console.error(`✗ Error creating collection ${collectionName}:`, error);
    }
  }
  
  console.log('\nCreating sample email templates...');
  await createEmailTemplates();
  
  console.log('\nFirestore initialization complete!');
}

async function createEmailTemplates() {
  const templates = [
    {
      id: 'onboarding-template',
      name: 'Coach Onboarding Email',
      subject: 'Welcome {{coachName}}, Your Mandatory Training & Checklist Items',
      type: 'onboarding',
      isActive: true,
      requiredVariables: ['coachName', 'studentNames', 'trainingDeadline'],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      useCount: 0
    },
    {
      id: 'session-recap-template',
      name: 'Session Recap Email',
      subject: 'Coaching Session Recap - Week {{weekNumber}} Session {{sessionNumber}}',
      type: 'session-recap',
      isActive: true,
      requiredVariables: ['studentName', 'weekNumber', 'sessionNumber'],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      useCount: 0
    },
    {
      id: 'deadline-reminder-template',
      name: 'Training Deadline Reminder',
      subject: '{{urgency}}: {{hoursRemaining}} Hours Remaining to Complete Training',
      type: 'deadline',
      isActive: true,
      requiredVariables: ['coachName', 'urgency', 'hoursRemaining'],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      useCount: 0
    }
  ];

  for (const template of templates) {
    try {
      await db.collection('emailTemplates').doc(template.id).set(template);
      console.log(`✓ Created email template: ${template.name}`);
    } catch (error) {
      console.error(`✗ Error creating template ${template.name}:`, error);
    }
  }
}

// Run the initialization
createCollections().catch(console.error);
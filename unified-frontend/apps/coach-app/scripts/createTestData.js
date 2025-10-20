// scripts/createTestData.js
const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Initialize Firebase Admin
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

async function createTestData() {
  console.log('Creating test data...');
  
  // Create admin user
  const adminUser = {
    email: 'admin@ivylevel.com',
    name: 'Admin User',
    role: 'admin',
    status: 'active',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastLogin: admin.firestore.FieldValue.serverTimestamp()
  };
  
  // Create test coaches
  const coaches = [
    {
      email: 'noor@ivylevel.com',
      name: 'Noor Patel',
      role: 'coach',
      status: 'training',
      trainingStartDate: new Date('2024-11-15'),
      trainingDeadline: new Date('2024-11-17'),
      currentModule: 3,
      completedModules: [1, 2, 3],
      moduleScores: {
        module2: 85,
        module4: null,
        module5: null
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      email: 'kelvin@ivylevel.com',
      name: 'Kelvin Chen',
      role: 'coach',
      status: 'certified',
      trainingStartDate: new Date('2024-11-10'),
      trainingDeadline: new Date('2024-11-12'),
      certificationDate: new Date('2024-11-12'),
      currentModule: 5,
      completedModules: [1, 2, 3, 4, 5],
      moduleScores: {
        module2: 92,
        module4: 88,
        module5: 95
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }
  ];
  
  // Create test students
  const students = [
    {
      name: 'Beya Johnson',
      email: 'beya.johnson@example.com',
      parentEmail: 'parent.johnson@example.com',
      grade: 'junior',
      school: 'Lincoln High School',
      gpa: 3.5,
      academicProfile: 'average',
      interests: ['biomed', 'pre-med'],
      careerAspirations: 'Doctor',
      weakSpots: ['Time Management', 'Research Experience', 'AP Biology'],
      quickWins: ['Biology Olympiad Registration', 'Hospital Volunteering', 'Study Schedule'],
      priorityAreas: ['Grade Improvement', 'Extracurriculars'],
      assignedCoachId: null, // Will be assigned after coach creation
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      name: 'Hiba Martinez',
      email: 'hiba.martinez@example.com',
      parentEmail: 'parent.martinez@example.com',
      grade: 'sophomore',
      school: 'Washington High School',
      gpa: 3.2,
      academicProfile: 'average',
      interests: ['cs', 'business'],
      careerAspirations: 'Tech Entrepreneur',
      weakSpots: ['Math Grades', 'Coding Skills', 'Leadership Experience'],
      quickWins: ['Join CS Club', 'Start Coding Project', 'Math Tutoring'],
      priorityAreas: ['Academic Performance', 'Technical Skills'],
      assignedCoachId: null,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      name: 'Abhi Sharma',
      email: 'abhi.sharma@example.com',
      parentEmail: 'parent.sharma@example.com',
      grade: 'senior',
      school: 'Valley High School',
      gpa: 3.9,
      academicProfile: 'high-achieving',
      interests: ['cs', 'business'],
      careerAspirations: 'Software Engineer at FAANG',
      weakSpots: ['Interview Skills', 'Portfolio Projects'],
      quickWins: ['Hackathon Participation', 'Open Source Contribution'],
      priorityAreas: ['College Applications', 'Interview Prep'],
      assignedCoachId: null,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }
  ];
  
  // Create sample resources
  const resources = [
    {
      title: 'Marissa & Iqra - BioMed Training Session',
      description: 'Complete walkthrough of first 168-hour session with biomedical aspirant',
      type: 'video',
      googleDriveId: 'sample-video-1',
      googleDriveUrl: 'https://drive.google.com/file/d/sample-video-1',
      mimeType: 'video/mp4',
      fileSize: 1024000000,
      duration: '90 min',
      thumbnail: '🎥',
      grade: ['sophomore', 'junior'],
      subject: ['biomed', 'pre-med'],
      studentProfile: ['average'],
      tags: ['168-hour', 'first-session', 'biomed-aspirant', 'training'],
      viewCount: 45,
      downloadCount: 12,
      averageRating: 4.8,
      priority: 'high',
      isRequired: true,
      recommendedFor: ['new-coach', 'biomed-coach'],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'system',
      version: 1,
      isPublic: true,
      restrictedToRoles: []
    },
    {
      title: 'Weekly Execution Template - STEM Students',
      description: 'Standardized template for tracking weekly progress and action items',
      type: 'template',
      googleDriveId: 'sample-template-1',
      googleDriveUrl: 'https://drive.google.com/file/d/sample-template-1',
      mimeType: 'application/vnd.google-apps.document',
      fileSize: 102400,
      thumbnail: '📋',
      grade: ['all'],
      subject: ['stem', 'biomed', 'cs'],
      studentProfile: ['all'],
      tags: ['execution-doc', 'template', 'planning', 'weekly'],
      viewCount: 156,
      downloadCount: 89,
      averageRating: 4.9,
      priority: 'high',
      isRequired: true,
      recommendedFor: ['all-coaches'],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'system',
      version: 2,
      isPublic: true,
      restrictedToRoles: []
    }
  ];
  
  try {
    // Create admin user
    console.log('Creating admin user...');
    await db.collection('users').doc('admin-user-id').set(adminUser);
    console.log('✓ Admin user created');
    
    // Create coaches and store their IDs
    const coachIds = [];
    for (let i = 0; i < coaches.length; i++) {
      const docRef = await db.collection('users').add(coaches[i]);
      coachIds.push(docRef.id);
      console.log(`✓ Coach created: ${coaches[i].name}`);
    }
    
    // Assign students to coaches
    students[0].assignedCoachId = coachIds[0]; // Beya to Noor
    students[1].assignedCoachId = coachIds[0]; // Hiba to Noor
    students[2].assignedCoachId = coachIds[1]; // Abhi to Kelvin
    
    // Create students
    for (const student of students) {
      await db.collection('students').add(student);
      console.log(`✓ Student created: ${student.name}`);
    }
    
    // Create resources
    for (const resource of resources) {
      await db.collection('resources').add(resource);
      console.log(`✓ Resource created: ${resource.title}`);
    }
    
    // Create a sample resource template
    const template = {
      name: 'Sophomore BioMed Starter Pack',
      description: 'Complete resource bundle for coaches working with sophomore biomedical aspirants',
      category: 'biomed',
      resourceIds: [], // Would be populated with actual resource IDs
      targetGrades: ['sophomore'],
      targetSubjects: ['biomed', 'pre-med'],
      targetProfiles: ['average'],
      tags: ['sophomore', 'biomed', 'starter'],
      useCount: 0,
      createdBy: 'admin-user-id',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true
    };
    
    await db.collection('resourceTemplates').add(template);
    console.log('✓ Resource template created');
    
    console.log('\n✅ Test data created successfully!');
    console.log('\nYou can now log in with:');
    console.log('Admin: admin@ivylevel.com');
    console.log('Coach: noor@ivylevel.com or kelvin@ivylevel.com');
    
  } catch (error) {
    console.error('Error creating test data:', error);
  }
  
  process.exit(0);
}

createTestData();
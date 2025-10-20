/**
 * Initialize Firebase with Knowledge Base Schema
 * This script sets up the Firebase collections to match the IvyLevel KB structure
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  addDoc,
  serverTimestamp,
  writeBatch 
} from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

// Import firebase config
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Sample data based on KB schema
const sampleData = {
  coaches: [
    {
      id: 'jenny',
      fullName: 'Jenny Duan',
      email: 'jennyduan@ivymentors.co',
      specialties: ['Essay Writing', 'Activity Planning', 'Interview Prep'],
      totalSessions: 142,
      activeStudents: 8,
      joinedDate: new Date('2023-01-15')
    },
    {
      id: 'kelvin',
      fullName: 'Kelvin',
      email: 'kelvin@ivylevel.com',
      specialties: ['Academic Planning', 'Test Prep', 'School Selection'],
      totalSessions: 89,
      activeStudents: 6,
      joinedDate: new Date('2023-03-20')
    },
    {
      id: 'noor',
      fullName: 'Noor',
      email: 'noor@ivylevel.com',
      specialties: ['STEM Activities', 'Research Projects', 'Competition Prep'],
      totalSessions: 67,
      activeStudents: 5,
      joinedDate: new Date('2023-06-01')
    }
  ],

  students: [
    {
      id: 'arshiya',
      fullName: 'Arshiya',
      programType: '24-Week Comprehensive',
      startDate: new Date('2024-09-01'),
      currentWeek: 18,
      primaryCoach: 'jenny',
      status: 'Active',
      goals: ['Top 20 Universities', 'Computer Science Major', 'Research Focus']
    },
    {
      id: 'anoushka',
      fullName: 'Anoushka',
      programType: '24-Week Comprehensive',
      startDate: new Date('2024-08-15'),
      currentWeek: 20,
      primaryCoach: 'jenny',
      status: 'Active',
      goals: ['Ivy League', 'Pre-med Track', 'Community Service']
    },
    {
      id: 'sarah',
      fullName: 'Sarah Xu',
      programType: '48-Week Ultimate Prep',
      startDate: new Date('2024-01-10'),
      currentWeek: 45,
      primaryCoach: 'kelvin',
      status: 'Active',
      goals: ['MIT/Stanford', 'Engineering', 'Entrepreneurship']
    }
  ],

  programs: [
    {
      id: '24week-comprehensive',
      name: '24-Week Comprehensive Prep',
      durationWeeks: 24,
      phases: [
        { phaseName: 'Foundation', startWeek: 1, endWeek: 4, focusAreas: ['Self-Discovery', 'Goal Setting'] },
        { phaseName: 'Development', startWeek: 5, endWeek: 12, focusAreas: ['Activity Building', 'Academic Excellence'] },
        { phaseName: 'Refinement', startWeek: 13, endWeek: 20, focusAreas: ['Essay Writing', 'Application Strategy'] },
        { phaseName: 'Mastery', startWeek: 21, endWeek: 24, focusAreas: ['Final Review', 'Interview Prep'] }
      ]
    },
    {
      id: '48week-ultimate',
      name: '48-Week Ultimate Prep',
      durationWeeks: 48,
      phases: [
        { phaseName: 'Foundation', startWeek: 1, endWeek: 8, focusAreas: ['Deep Exploration', 'Skill Building'] },
        { phaseName: 'Development', startWeek: 9, endWeek: 24, focusAreas: ['Project Execution', 'Leadership'] },
        { phaseName: 'Refinement', startWeek: 25, endWeek: 40, focusAreas: ['Application Crafting', 'Story Development'] },
        { phaseName: 'Mastery', startWeek: 41, endWeek: 48, focusAreas: ['Final Polish', 'Decision Strategy'] }
      ]
    }
  ],

  recordings: [
    {
      uuid: 'dTXmwxPSTKm0rq9wdRG5pg==',
      meetingId: '85325894179',
      topic: 'Ivylevel Jenny & Arshiya: Week 14',
      date: new Date('2025-03-06'),
      durationMinutes: 60,
      source: 'A',
      category: 'Coaching',
      driveFolderName: 'Coaching_A_Jenny_Arshiya_Wk14_2025-03-06_M_85325894179U_dTXmwxPSTKm0rq9wdRG5pg==',
      hasVideo: true,
      hasAudio: true,
      hasTranscript: true,
      hasInsights: true,
      coachId: 'jenny',
      studentId: 'arshiya',
      programId: '24week-comprehensive',
      files: {
        video: true,
        audio: true,
        transcript: true,
        insights: true,
        timeline: true,
        chat: false
      }
    },
    {
      uuid: 'HhLLp74lRKi4i90lfY2uiQ==',
      meetingId: '81172457268',
      topic: 'Ivylevel Jenny & Arshiya: Week 18',
      date: new Date('2025-07-08'),
      durationMinutes: 75,
      source: 'A',
      category: 'Coaching',
      driveFolderName: 'Coaching_A_Jenny_Arshiya_Wk18_2025-07-08_M_81172457268U_HhLLp74lRKi4i90lfY2uiQ==',
      hasVideo: true,
      hasAudio: true,
      hasTranscript: true,
      hasInsights: true,
      coachId: 'jenny',
      studentId: 'arshiya',
      programId: '24week-comprehensive',
      files: {
        video: true,
        audio: true,
        transcript: true,
        insights: true,
        timeline: false,
        chat: true
      }
    }
  ],

  insights: [
    {
      id: 'dTXmwxPSTKm0rq9wdRG5pg==',
      recordingUuid: 'dTXmwxPSTKm0rq9wdRG5pg==',
      aiSummary: 'In this session, Jenny and Arshiya focused on refining the personal statement essay. They discussed incorporating specific anecdotes about the robotics competition and community service project to strengthen the narrative.',
      keyTopics: ['Personal Statement', 'Essay Structure', 'Anecdote Selection', 'Community Service'],
      actionItems: [
        'Revise opening paragraph with robotics competition story',
        'Add specific metrics about community service impact',
        'Research 3 more universities for the school list',
        'Complete Common App activities section'
      ],
      challenges: [
        {
          issue: 'Difficulty condensing experiences into word limit',
          solution: 'Focus on 2-3 most impactful stories rather than trying to cover everything'
        }
      ],
      sentiment: {
        overall: 0.82,
        breakdown: { positive: 0.75, neutral: 0.20, negative: 0.05 }
      },
      engagement: {
        participationRate: 0.90,
        interactionCount: 45
      },
      progressIndicators: [
        'Essay draft improved from version 2 to version 3',
        'Clearer narrative arc established',
        'Student showing increased confidence in writing'
      ],
      generatedDate: new Date()
    }
  ],

  gamePlans: [
    {
      id: 'gp-arshiya-v2',
      type: 'Game Plan',
      studentId: 'arshiya',
      createdDate: new Date('2024-09-15'),
      driveFileId: '1234567890abcdef',
      fileName: 'Arshiya_GamePlan_v2_2024-09-15.pdf',
      contentSummary: 'Comprehensive 24-week plan focusing on computer science achievements, research projects, and community service. Target schools include MIT, Stanford, and UC Berkeley.',
      version: 'v2',
      status: 'Active',
      relatedRecordings: ['dTXmwxPSTKm0rq9wdRG5pg==', 'HhLLp74lRKi4i90lfY2uiQ==']
    }
  ],

  executionDocs: [
    {
      id: 'exec-arshiya-wk14',
      type: 'Execution Doc',
      studentId: 'arshiya',
      createdDate: new Date('2025-03-06'),
      driveFileId: 'abcdef1234567890',
      fileName: 'Arshiya_Week14_ExecutionTracking.xlsx',
      contentSummary: 'Week 14 progress: Essay draft 3 completed, 2 schools researched, robotics project milestone achieved',
      status: 'Active',
      relatedRecordings: ['dTXmwxPSTKm0rq9wdRG5pg==']
    }
  ]
};

async function initializeKnowledgeBase() {
  try {
    console.log('🚀 Initializing IvyLevel Knowledge Base in Firebase...\n');

    // Create coaches
    console.log('Creating coaches collection...');
    for (const coach of sampleData.coaches) {
      await setDoc(doc(db, 'coaches', coach.id), {
        ...coach,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log(`✅ Created coach: ${coach.fullName}`);
    }

    // Create students
    console.log('\nCreating students collection...');
    for (const student of sampleData.students) {
      await setDoc(doc(db, 'students', student.id), {
        ...student,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log(`✅ Created student: ${student.fullName}`);
    }

    // Create programs
    console.log('\nCreating programs collection...');
    for (const program of sampleData.programs) {
      await setDoc(doc(db, 'programs', program.id), {
        ...program,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log(`✅ Created program: ${program.name}`);
    }

    // Create recordings using batch write for efficiency
    console.log('\nCreating recordings collection...');
    const batch = writeBatch(db);
    
    for (const recording of sampleData.recordings) {
      const recordingRef = doc(collection(db, 'recordings'));
      batch.set(recordingRef, {
        ...recording,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    
    await batch.commit();
    console.log(`✅ Created ${sampleData.recordings.length} recordings`);

    // Create insights
    console.log('\nCreating insights collection...');
    for (const insight of sampleData.insights) {
      await setDoc(doc(db, 'insights', insight.recordingUuid), {
        ...insight,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log(`✅ Created insights for recording: ${insight.recordingUuid}`);
    }

    // Create game plans
    console.log('\nCreating gamePlans collection...');
    for (const gamePlan of sampleData.gamePlans) {
      await setDoc(doc(db, 'gamePlans', gamePlan.id), {
        ...gamePlan,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log(`✅ Created game plan: ${gamePlan.fileName}`);
    }

    // Create execution docs
    console.log('\nCreating executionDocs collection...');
    for (const execDoc of sampleData.executionDocs) {
      await setDoc(doc(db, 'executionDocs', execDoc.id), {
        ...execDoc,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log(`✅ Created execution doc: ${execDoc.fileName}`);
    }

    // Create collection metadata
    console.log('\nCreating metadata...');
    await setDoc(doc(db, 'metadata', 'knowledgeBase'), {
      version: '1.0',
      lastUpdated: serverTimestamp(),
      totalRecordings: sampleData.recordings.length,
      dataSources: ['A', 'B', 'C'],
      rootDriveId: '1dgx7k3J_z0PO7cOVMqKuFOajl_x_Dulg',
      collections: {
        coaches: sampleData.coaches.length,
        students: sampleData.students.length,
        programs: sampleData.programs.length,
        recordings: sampleData.recordings.length,
        insights: sampleData.insights.length,
        gamePlans: sampleData.gamePlans.length,
        executionDocs: sampleData.executionDocs.length
      }
    });

    console.log('\n✨ Knowledge Base initialization complete!');
    console.log('\nSummary:');
    console.log(`- ${sampleData.coaches.length} coaches`);
    console.log(`- ${sampleData.students.length} students`);
    console.log(`- ${sampleData.programs.length} programs`);
    console.log(`- ${sampleData.recordings.length} recordings`);
    console.log(`- ${sampleData.insights.length} insights`);
    console.log(`- ${sampleData.gamePlans.length} game plans`);
    console.log(`- ${sampleData.executionDocs.length} execution documents`);

  } catch (error) {
    console.error('❌ Error initializing Knowledge Base:', error);
    throw error;
  }
}

// Export for use in other scripts
export default initializeKnowledgeBase;

export { initializeKnowledgeBase };
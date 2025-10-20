#!/usr/bin/env node

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('../credentials/firebase-admin.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function populateData() {
  console.log('🚀 Populating Firebase with initial data...\n');
  
  try {
    // 1. Add Coaches
    console.log('👥 Adding coaches...');
    const coaches = [
      {
        name: 'Sarah Chen',
        email: 'sarah@ivymentors.co',
        assignedStudents: ['michael-chen', 'amy-wang', 'david-liu'],
        averageRating: 4.9,
        status: 'active',
        specialties: ['Essay Writing', 'Interview Prep'],
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        name: 'Michael Park',
        email: 'michael@ivymentors.co',
        assignedStudents: ['lisa-kim', 'james-lee'],
        averageRating: 4.8,
        status: 'active',
        specialties: ['SAT Prep', 'Time Management'],
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        name: 'Emma Wilson',
        email: 'emma@ivymentors.co',
        assignedStudents: ['sophia-zhang'],
        averageRating: 4.7,
        status: 'training',
        specialties: ['College Selection', 'Career Planning'],
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }
    ];
    
    for (const coach of coaches) {
      await db.collection('coaches').add(coach);
      console.log(`   ✅ Added coach: ${coach.name}`);
    }
    
    // 2. Add Students
    console.log('\n📚 Adding students...');
    const students = [
      { id: 'michael-chen', name: 'Michael Chen', grade: '11th', school: 'Palo Alto High' },
      { id: 'amy-wang', name: 'Amy Wang', grade: '12th', school: 'Gunn High School' },
      { id: 'david-liu', name: 'David Liu', grade: '10th', school: 'Lynbrook High' },
      { id: 'lisa-kim', name: 'Lisa Kim', grade: '11th', school: 'Monta Vista High' },
      { id: 'james-lee', name: 'James Lee', grade: '12th', school: 'Saratoga High' },
      { id: 'sophia-zhang', name: 'Sophia Zhang', grade: '9th', school: 'Cupertino High' }
    ];
    
    for (const student of students) {
      await db.collection('students').doc(student.id).set({
        ...student,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`   ✅ Added student: ${student.name}`);
    }
    
    // 3. Add Training Videos
    console.log('\n🎥 Adding training videos...');
    const trainingVideos = [
      {
        title: 'Introduction to IvyLevel Coaching',
        duration: '12:34',
        category: 'Getting Started',
        order: 1,
        description: 'Learn the fundamentals of our coaching methodology',
        videoUrl: 'https://example.com/video1'
      },
      {
        title: 'Understanding Student Psychology',
        duration: '18:45',
        category: 'Psychology',
        order: 2,
        description: 'How to connect with and motivate students effectively',
        videoUrl: 'https://example.com/video2'
      },
      {
        title: 'Essay Coaching Techniques',
        duration: '25:12',
        category: 'Academics',
        order: 3,
        description: 'Advanced strategies for helping students with college essays',
        videoUrl: 'https://example.com/video3'
      },
      {
        title: 'Time Management for Students',
        duration: '15:30',
        category: 'Study Skills',
        order: 4,
        description: 'Teaching effective time management and study habits',
        videoUrl: 'https://example.com/video4'
      },
      {
        title: 'College Application Timeline',
        duration: '22:18',
        category: 'Applications',
        order: 5,
        description: 'Navigate the complex college application process',
        videoUrl: 'https://example.com/video5'
      }
    ];
    
    for (const video of trainingVideos) {
      await db.collection('training_videos').add({
        ...video,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`   ✅ Added training video: ${video.title}`);
    }
    
    // 4. Add Sample Indexed Videos (from your 811 videos)
    console.log('\n📹 Adding sample indexed coaching videos...');
    const indexedVideos = [
      {
        title: 'Sarah & Michael - Essay Review Session',
        parsedCoach: 'Sarah',
        parsedStudent: 'Michael',
        duration: '45:23',
        category: 'Essay Review',
        driveId: 'sample-drive-id-1',
        uploadDate: new Date('2024-01-15')
      },
      {
        title: 'Emma & Lisa - SAT Prep Strategy',
        parsedCoach: 'Emma',
        parsedStudent: 'Lisa',
        duration: '38:15',
        category: 'Test Prep',
        driveId: 'sample-drive-id-2',
        uploadDate: new Date('2024-01-20')
      },
      {
        title: 'Michael & James - College List Building',
        parsedCoach: 'Michael',
        parsedStudent: 'James',
        duration: '52:10',
        category: 'College Selection',
        driveId: 'sample-drive-id-3',
        uploadDate: new Date('2024-01-25')
      }
    ];
    
    for (const video of indexedVideos) {
      await db.collection('indexed_videos').add({
        ...video,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`   ✅ Added indexed video: ${video.title}`);
    }
    
    // 5. Add AI Recommendations
    console.log('\n🤖 Adding AI recommendations...');
    const recommendations = [
      {
        type: 'success',
        title: 'Excellent Progress on Essay Structure',
        description: 'Student has shown 23% improvement in organizing their thoughts',
        icon: '✅',
        coachId: 'coach1',
        studentId: 'student1',
        priority: 'high'
      },
      {
        type: 'warning',
        title: 'Focus Area: Time Management',
        description: 'Consider introducing Pomodoro technique for study sessions',
        icon: '⚠️',
        coachId: 'coach1',
        studentId: 'student1',
        priority: 'medium'
      },
      {
        type: 'info',
        title: 'Smart Resource Suggestion',
        description: 'Video: "Advanced Essay Techniques" matches student\'s current level',
        icon: '💡',
        coachId: 'coach1',
        studentId: 'student1',
        priority: 'low'
      }
    ];
    
    for (const rec of recommendations) {
      await db.collection('ai_recommendations').add({
        ...rec,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`   ✅ Added AI recommendation: ${rec.title}`);
    }
    
    // 6. Add Sessions
    console.log('\n📅 Adding sample sessions...');
    const sessions = Array.from({ length: 25 }, (_, i) => ({
      coachId: coaches[i % coaches.length].email,
      studentId: students[i % students.length].id,
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      status: 'completed',
      duration: 45 + Math.floor(Math.random() * 30),
      rating: 4 + Math.random(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }));
    
    for (const session of sessions) {
      await db.collection('sessions').add(session);
    }
    console.log(`   ✅ Added ${sessions.length} completed sessions`);
    
    // 7. Add Resources
    console.log('\n📁 Adding resources...');
    for (let i = 1; i <= 15; i++) {
      await db.collection('resources').add({
        title: `Resource ${i}`,
        type: ['video', 'document', 'worksheet'][i % 3],
        category: ['Essay Writing', 'Test Prep', 'College Planning'][i % 3],
        sharedCount: Math.floor(Math.random() * 50),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    console.log(`   ✅ Added 15 resources`);
    
    console.log('\n✅ All data populated successfully!');
    console.log('\n🎉 Your app should now show real data when you run it.');
    
  } catch (error) {
    console.error('❌ Error populating data:', error);
  }
  
  process.exit(0);
}

populateData();
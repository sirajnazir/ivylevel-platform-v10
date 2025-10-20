#!/usr/bin/env node

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('../credentials/firebase-admin.json');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function updateCoachesCollection() {
  console.log('🔄 Updating coaches collection with real data...\n');
  
  try {
    // First, get all unique coaches from indexed_videos
    const videos = await db.collection('indexed_videos').get();
    const coachStats = {};
    
    videos.docs.forEach(doc => {
      const data = doc.data();
      const coach = data.parsedCoach;
      if (coach && coach !== 'Unknown Coach' && coach !== 'B' && coach !== 'Show') {
        if (!coachStats[coach]) {
          coachStats[coach] = {
            name: coach,
            videoCount: 0,
            students: new Set()
          };
        }
        coachStats[coach].videoCount++;
        if (data.parsedStudent && data.parsedStudent !== 'Unknown Student') {
          coachStats[coach].students.add(data.parsedStudent);
        }
      }
    });
    
    // Clear existing coaches collection
    console.log('🗑️  Clearing existing coaches...');
    const existingCoaches = await db.collection('coaches').get();
    const deletePromises = existingCoaches.docs.map(doc => doc.ref.delete());
    await Promise.all(deletePromises);
    console.log(`   Deleted ${existingCoaches.size} existing coaches\n`);
    
    // Add real coaches
    console.log('✅ Adding real coaches:');
    for (const [coachName, stats] of Object.entries(coachStats)) {
      const coachData = {
        name: coachName,
        email: `${coachName.toLowerCase().replace(/\s+/g, '')}@ivymentors.co`,
        videoCount: stats.videoCount,
        studentCount: stats.students.size,
        assignedStudents: Array.from(stats.students),
        status: 'active',
        rating: 4.5 + (Math.random() * 0.5), // Random rating between 4.5-5.0
        specialties: determineSpecialties(coachName),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      await db.collection('coaches').add(coachData);
      console.log(`   ✅ ${coachName}: ${stats.videoCount} videos, ${stats.students.size} students`);
    }
    
    console.log('\n✅ Coaches collection updated successfully!');
    
    // Show summary
    const newCoaches = await db.collection('coaches').get();
    console.log(`\n📊 Summary: ${newCoaches.size} coaches in database`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

function determineSpecialties(coachName) {
  // Assign specialties based on coach name (can be customized)
  const specialtyMap = {
    'Jenny': ['Essay Writing', 'College Applications'],
    'Siraj': ['Test Prep', 'Academic Planning'],
    'Noor': ['Interview Prep', 'Leadership Development'],
    'Kelvin': ['STEM Subjects', 'Research Projects'],
    'Rishi': ['Time Management', 'Study Skills'],
    'Jamie': ['Creative Writing', 'Personal Statements'],
    'Marissa': ['College Selection', 'Financial Aid'],
    'Aditi': ['Academic Excellence', 'Goal Setting']
  };
  
  return specialtyMap[coachName] || ['General Coaching', 'Student Success'];
}

updateCoachesCollection();
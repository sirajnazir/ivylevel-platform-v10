#!/usr/bin/env node

const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Initialize Firebase Admin
const serviceAccount = require('../credentials/firebase-admin.json');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkData() {
  console.log('🔍 Checking Firestore Data...\n');
  
  try {
    // Check indexed_videos collection
    console.log('📹 Indexed Videos:');
    const videos = await db.collection('indexed_videos')
      .orderBy('indexedAt', 'desc')
      .limit(10)
      .get();
    
    console.log(`Total recent videos: ${videos.size}`);
    
    const coaches = new Set();
    const students = new Set();
    
    videos.docs.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${data.title || data.filename}`);
      console.log(`    Coach: ${data.parsedCoach}, Student: ${data.parsedStudent}`);
      console.log(`    Category: ${data.category}, Date: ${data.sessionDate || 'N/A'}`);
      
      if (data.parsedCoach && data.parsedCoach !== 'Unknown Coach') {
        coaches.add(data.parsedCoach);
      }
      if (data.parsedStudent && data.parsedStudent !== 'Unknown Student') {
        students.add(data.parsedStudent);
      }
    });
    
    // Get total count
    const allVideos = await db.collection('indexed_videos').get();
    console.log(`\n📊 Total Videos in Database: ${allVideos.size}`);
    
    // Show unique coaches and students
    console.log(`\n👥 Unique Coaches Found: ${Array.from(coaches).join(', ')}`);
    console.log(`👤 Unique Students Found: ${Array.from(students).join(', ')}`);
    
    // Check coaches collection
    console.log('\n👨‍🏫 Coaches Collection:');
    const coachDocs = await db.collection('coaches').get();
    console.log(`Total coaches: ${coachDocs.size}`);
    coachDocs.docs.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${data.name}: ${data.videoCount || 0} videos`);
    });
    
    // Check if there are any videos with real coach/student names
    console.log('\n✅ Sample Real Videos:');
    const realVideos = await db.collection('indexed_videos')
      .where('parsedCoach', '!=', 'Unknown Coach')
      .limit(5)
      .get();
    
    realVideos.docs.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${data.parsedCoach} & ${data.parsedStudent} - ${data.category}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

checkData();
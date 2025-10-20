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

async function checkVideoCount() {
  const videos = await db.collection('indexed_videos').get();
  console.log('Total videos in database:', videos.size);
  
  // Get unique coaches and students
  const coaches = new Set();
  const students = new Set();
  
  videos.docs.forEach(doc => {
    const data = doc.data();
    if (data.parsedCoach && data.parsedCoach !== 'Unknown Coach') {
      coaches.add(data.parsedCoach);
    }
    if (data.parsedStudent && data.parsedStudent !== 'Unknown Student') {
      students.add(data.parsedStudent);
    }
  });
  
  console.log('\nUnique coaches:', Array.from(coaches).sort().join(', '));
  console.log('\nUnique students (first 20):', Array.from(students).sort().slice(0, 20).join(', ') + '...');
  console.log('\nTotal unique coaches:', coaches.size);
  console.log('Total unique students:', students.size);
  
  process.exit(0);
}

checkVideoCount();
#!/usr/bin/env node

// Simple Firebase connection test
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Firebase Connection...\n');

// Check for service account file
const serviceAccountPath = path.join(__dirname, '../credentials/firebase-admin.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.log('❌ Firebase Admin credentials not found!');
  console.log('   Expected at:', serviceAccountPath);
  process.exit(1);
}

console.log('✅ Found Firebase Admin credentials');

try {
  // Initialize admin SDK
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  const db = admin.firestore();
  console.log('✅ Connected to Firebase!');
  console.log(`   Project ID: ${serviceAccount.project_id}`);
  
  // Test Firestore access
  async function testFirestore() {
    console.log('\n📊 Testing Firestore access...');
    
    try {
      // Test reading coaches
      const coachesSnapshot = await db.collection('coaches').limit(5).get();
      console.log(`\n👥 Coaches: ${coachesSnapshot.size} found`);
      coachesSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   - ${data.name || doc.id}: ${data.email || 'No email'}`);
      });
      
      // Test reading videos
      const videosSnapshot = await db.collection('indexed_videos').limit(5).get();
      console.log(`\n🎥 Indexed Videos: ${videosSnapshot.size} found`);
      videosSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   - ${data.title || doc.id}`);
      });
      
      console.log('\n✅ All tests passed! Your Firebase setup is working.');
      
    } catch (error) {
      console.log('\n❌ Firestore test failed:', error.message);
      console.log('\n💡 Make sure Firestore is enabled in your Firebase project');
    }
  }
  
  testFirestore();
  
} catch (error) {
  console.log('❌ Failed to initialize Firebase:', error.message);
}
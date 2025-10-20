// Setup Checker - Run this to verify your configuration
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

console.log('🔍 Checking IvyLevel Coach Training Setup...\n');

// Check environment variables
console.log('1️⃣ Environment Variables:');
const requiredEnvVars = [
  'REACT_APP_FIREBASE_API_KEY',
  'REACT_APP_FIREBASE_AUTH_DOMAIN',
  'REACT_APP_FIREBASE_PROJECT_ID',
  'REACT_APP_FIREBASE_STORAGE_BUCKET',
  'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
  'REACT_APP_FIREBASE_APP_ID'
];

let allEnvVarsPresent = true;
requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`   ✅ ${varName}: ${value.substring(0, 10)}...`);
  } else {
    console.log(`   ❌ ${varName}: NOT SET`);
    allEnvVarsPresent = false;
  }
});

if (!allEnvVarsPresent) {
  console.log('\n❌ Missing environment variables! Please check your .env.local file');
  process.exit(1);
}

// Initialize Firebase
console.log('\n2️⃣ Initializing Firebase...');
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

try {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);
  console.log('   ✅ Firebase initialized successfully');
  
  // Check Firestore collections
  console.log('\n3️⃣ Checking Firestore Collections:');
  const collections = ['coaches', 'students', 'sessions', 'resources', 'indexed_videos', 'training_videos'];
  
  for (const collectionName of collections) {
    try {
      const snapshot = await getDocs(collection(db, collectionName));
      console.log(`   ✅ ${collectionName}: ${snapshot.size} documents`);
    } catch (error) {
      console.log(`   ❌ ${collectionName}: ${error.message}`);
    }
  }
  
  console.log('\n✅ Setup check complete!');
  console.log('\n📱 To run the app:');
  console.log('   1. Make sure you\'re in the project directory');
  console.log('   2. Run: PORT=3002 npm start');
  console.log('   3. Open: http://localhost:3002');
  
} catch (error) {
  console.log(`   ❌ Firebase initialization failed: ${error.message}`);
  console.log('\n💡 Troubleshooting tips:');
  console.log('   1. Check your Firebase project settings');
  console.log('   2. Verify your .env.local file has correct values');
  console.log('   3. Make sure Firestore is enabled in Firebase Console');
}

export default {};
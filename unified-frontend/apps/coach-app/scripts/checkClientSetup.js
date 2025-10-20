// scripts/checkClientSetup.js
// Check if the client-side app can run
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

console.log('🔍 Checking Client-Side Setup...\n');

const required = {
  'REACT_APP_FIREBASE_API_KEY': process.env.REACT_APP_FIREBASE_API_KEY,
  'REACT_APP_FIREBASE_AUTH_DOMAIN': process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  'REACT_APP_FIREBASE_PROJECT_ID': process.env.REACT_APP_FIREBASE_PROJECT_ID,
  'REACT_APP_FIREBASE_STORAGE_BUCKET': process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  'REACT_APP_FIREBASE_MESSAGING_SENDER_ID': process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  'REACT_APP_FIREBASE_APP_ID': process.env.REACT_APP_FIREBASE_APP_ID
};

let allPresent = true;

console.log('Required Environment Variables:');
for (const [key, value] of Object.entries(required)) {
  if (value) {
    console.log(`✅ ${key}: Set`);
  } else {
    console.log(`❌ ${key}: Missing`);
    allPresent = false;
  }
}

console.log('\nOptional Features:');
// Check for admin credentials
const hasAdminCreds = fs.existsSync(path.join(__dirname, '../credentials/firebase-admin.json'));
console.log(`${hasAdminCreds ? '✅' : '⚠️ '} Firebase Admin SDK: ${hasAdminCreds ? 'Available' : 'Not configured (scripts won\'t work)'}`);

// Check for Google Drive
const hasGoogleDrive = fs.existsSync(path.join(__dirname, '../credentials/service-account.json'));
console.log(`${hasGoogleDrive ? '✅' : '⚠️ '} Google Drive API: ${hasGoogleDrive ? 'Available' : 'Not configured (feature disabled)'}`);

// Check for SendGrid
const hasSendGrid = !!process.env.SENDGRID_API_KEY;
console.log(`${hasSendGrid ? '✅' : '⚠️ '} SendGrid Email: ${hasSendGrid ? 'Available' : 'Using console fallback'}`);

console.log('\n' + '='.repeat(50));
if (allPresent) {
  console.log('✅ Client app is ready to run!');
  console.log('\nYou can start the development server with:');
  console.log('  npm start');
  console.log('\nNote: Some features may be limited without optional services.');
} else {
  console.log('❌ Missing required configuration!');
  console.log('\nPlease add the missing environment variables to .env.local');
  console.log('See SETUP-INSTRUCTIONS.md for details.');
}
console.log('='.repeat(50));
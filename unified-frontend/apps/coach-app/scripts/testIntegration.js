// scripts/testIntegration.js
const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Test results collector
const testResults = {
  firebase: { status: 'pending', details: '' },
  googleDrive: { status: 'pending', details: '' },
  recommendations: { status: 'pending', details: '' },
  email: { status: 'pending', details: '' }
};

// Initialize Firebase Admin
async function testFirebaseConnection() {
  console.log('\n🔥 Testing Firebase connection...');
  try {
    // Try to initialize with service account first
    let initialized = false;
    try {
      const serviceAccount = require('../credentials/firebase-admin.json');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
      initialized = true;
      console.log('✓ Firebase initialized with service account');
    } catch (error) {
      if (process.env.REACT_APP_FIREBASE_PROJECT_ID) {
        console.log('⚠️  Service account not found');
        console.log('   Firebase Admin SDK requires service account credentials');
        testResults.firebase.status = 'failed';
        testResults.firebase.details = 'Missing firebase-admin.json in /credentials';
        return false;
      } else {
        console.log('✗ No Firebase configuration found');
        testResults.firebase.status = 'failed';
        testResults.firebase.details = 'Missing both service account and environment config';
        return false;
      }
    }

    if (initialized) {
      const db = admin.firestore();
      
      // Test read operation
      const testDoc = await db.collection('users').limit(1).get();
      console.log(`✓ Successfully connected to Firestore (found ${testDoc.size} user documents)`);
      
      testResults.firebase.status = 'success';
      testResults.firebase.details = 'Connected to Firestore successfully';
      return true;
    }
  } catch (error) {
    console.error('✗ Firebase connection failed:', error.message);
    testResults.firebase.status = 'failed';
    testResults.firebase.details = error.message;
    return false;
  }
}

// Test Google Drive API
async function testGoogleDriveAPI() {
  console.log('\n📁 Testing Google Drive API...');
  try {
    // Use mock service for testing
    const { GoogleDriveService } = require('./testServices');
    const driveService = new GoogleDriveService();
    
    const initialized = await driveService.initialize();
    
    if (initialized) {
      console.log('✓ Google Drive API initialized successfully');
      testResults.googleDrive.status = 'success';
      testResults.googleDrive.details = 'API initialized and ready';
    } else {
      console.log('✗ Google Drive API initialization failed');
      console.log('  Please ensure service-account.json is in the credentials directory');
      testResults.googleDrive.status = 'failed';
      testResults.googleDrive.details = 'Missing credentials or initialization failed';
    }
  } catch (error) {
    console.error('✗ Google Drive test failed:', error.message);
    testResults.googleDrive.status = 'failed';
    testResults.googleDrive.details = error.message;
  }
}

// Test Recommendation Engine
async function testRecommendationEngine() {
  console.log('\n🤖 Testing Recommendation Engine...');
  try {
    const { RecommendationEngine } = require('./testServices');
    const engine = new RecommendationEngine();
    
    // Create mock data for testing
    const mockCoachData = {
      id: 'test-coach-123',
      email: 'test@coach.com',
      name: 'Test Coach',
      currentModule: 3,
      completedModules: [1, 2]
    };
    
    const mockStudents = [
      {
        grade: 'sophomore',
        interests: ['biomed', 'pre-med'],
        academicProfile: 'average'
      }
    ];
    
    // Test recommendation generation
    const recommendations = await engine.getRecommendationsForCoach(
      mockCoachData,
      mockStudents,
      []
    );
    
    console.log('✓ Recommendation engine working');
    console.log(`  Generated ${recommendations.length} recommendations`);
    testResults.recommendations.status = 'success';
    testResults.recommendations.details = `Generated ${recommendations.length} recommendations`;
  } catch (error) {
    console.error('✗ Recommendation engine test failed:', error.message);
    testResults.recommendations.status = 'failed';
    testResults.recommendations.details = error.message;
  }
}

// Test Email Service
async function testEmailService() {
  console.log('\n📧 Testing Email Service...');
  try {
    const { EmailProvider } = require('./testServices');
    const emailProvider = new EmailProvider();
    await emailProvider.initialize();
    
    // Create test email
    const testEmail = {
      recipients: {
        to: ['test@example.com'],
        cc: [],
        bcc: []
      },
      subject: 'Test Email - IvyLevel Platform Integration',
      htmlBody: '<h1>Test Email</h1><p>This is a test email from the IvyLevel platform.</p>',
      plainTextBody: 'Test Email\n\nThis is a test email from the IvyLevel platform.'
    };
    
    const result = await emailProvider.sendEmail(testEmail);
    
    if (result.success) {
      console.log(`✓ Email service working (provider: ${result.provider})`);
      if (result.provider === 'console') {
        console.log('  Note: Using console provider for development');
      }
      testResults.email.status = 'success';
      testResults.email.details = `Using ${result.provider} provider`;
    } else {
      throw new Error('Email send failed');
    }
  } catch (error) {
    console.error('✗ Email service test failed:', error.message);
    testResults.email.status = 'failed';
    testResults.email.details = error.message;
  }
}

// Test Email Template Generation
async function testEmailTemplateGeneration() {
  console.log('\n📨 Testing Email Template Generation...');
  try {
    const { generateOnboardingEmail } = require('./testServices');
    
    const mockCoach = {
      name: 'Test Coach',
      email: 'test@coach.com',
      trainingDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days from now
    };
    
    const mockResources = [
      {
        title: 'Test Resource 1',
        type: 'video',
        description: 'A test video resource',
        googleDriveUrl: 'https://drive.google.com/test1'
      },
      {
        title: 'Test Resource 2',
        type: 'template',
        description: 'A test template resource',
        googleDriveUrl: 'https://drive.google.com/test2'
      }
    ];
    
    const emailContent = await generateOnboardingEmail(mockCoach, mockResources);
    
    console.log('✓ Email template generation working');
    console.log(`  Generated email with subject: "${emailContent.subject}"`);
    console.log(`  Included ${mockResources.length} resources`);
  } catch (error) {
    console.error('✗ Email template generation failed:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🧪 Starting Integration Tests...');
  console.log('================================\n');
  
  // Run tests sequentially
  await testFirebaseConnection();
  await testGoogleDriveAPI();
  await testRecommendationEngine();
  await testEmailService();
  await testEmailTemplateGeneration();
  
  // Summary
  console.log('\n\n📊 Test Summary');
  console.log('================');
  
  let allPassed = true;
  for (const [service, result] of Object.entries(testResults)) {
    const emoji = result.status === 'success' ? '✅' : '❌';
    console.log(`${emoji} ${service}: ${result.status}`);
    if (result.details) {
      console.log(`   ${result.details}`);
    }
    if (result.status !== 'success') {
      allPassed = false;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('✅ All tests passed! The platform is ready to use.');
  } else {
    console.log('⚠️  Some tests failed. Please check the configuration:');
    console.log('   1. Ensure all environment variables are set in .env.local');
    console.log('   2. Add service account credentials to /credentials directory');
    console.log('   3. Enable required APIs in Google Cloud Console');
  }
  console.log('='.repeat(50));
  
  process.exit(allPassed ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error during tests:', error);
  process.exit(1);
});
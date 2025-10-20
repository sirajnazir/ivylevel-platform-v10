#!/usr/bin/env node

const admin = require('firebase-admin');
const { google } = require('googleapis');
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

// Initialize Google Drive
async function initializeDrive() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, '../credentials/service-account.json'),
    scopes: ['https://www.googleapis.com/auth/drive.readonly']
  });
  
  const authClient = await auth.getClient();
  return google.drive({ version: 'v3', auth: authClient });
}

// Parse coach and student names from filename
function parseVideoTitle(filename) {
  // Remove file extension
  const nameWithoutExt = filename.replace(/\.(mp4|mov|avi|mkv|webm)$/i, '');
  
  // Common patterns:
  // 1. "Coach & Student - Topic"
  // 2. "Coach and Student - Topic"
  // 3. "Coach_Student_Date"
  // 4. "Student-Coach-Session"
  
  let coach = 'Unknown Coach';
  let student = 'Unknown Student';
  let topic = '';
  
  // Pattern 1: Name & Name or Name and Name
  const pattern1 = /^([^&\-_]+?)\s*[&and]\s*([^&\-_]+?)(?:\s*[-_]\s*(.+))?$/i;
  const match1 = nameWithoutExt.match(pattern1);
  if (match1) {
    coach = match1[1].trim();
    student = match1[2].trim();
    topic = match1[3] ? match1[3].trim() : '';
  } else {
    // Pattern 2: Name_Name or Name-Name
    const pattern2 = /^([^_\-]+?)[_\-]([^_\-]+?)(?:[_\-](.+))?$/;
    const match2 = nameWithoutExt.match(pattern2);
    if (match2) {
      // Try to determine which is coach and which is student
      const name1 = match2[1].trim();
      const name2 = match2[2].trim();
      
      // Common coach names (you can expand this list based on your data)
      const knownCoaches = ['Sarah', 'Michael', 'Emma', 'David', 'Kelvin', 'Noor', 'John', 'Lisa'];
      
      if (knownCoaches.some(c => name1.toLowerCase().includes(c.toLowerCase()))) {
        coach = name1;
        student = name2;
      } else if (knownCoaches.some(c => name2.toLowerCase().includes(c.toLowerCase()))) {
        coach = name2;
        student = name1;
      } else {
        // Default: first name is coach
        coach = name1;
        student = name2;
      }
      topic = match2[3] ? match2[3].trim() : '';
    }
  }
  
  // Clean up names
  coach = coach.replace(/[0-9]/g, '').trim();
  student = student.replace(/[0-9]/g, '').trim();
  
  // Capitalize names
  coach = coach.split(' ').map(n => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase()).join(' ');
  student = student.split(' ').map(n => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase()).join(' ');
  
  return { coach, student, topic };
}

// Get video duration (mock for now, could use ffprobe in production)
function getVideoDuration(size) {
  // Estimate based on file size (rough approximation)
  const mbSize = size / (1024 * 1024);
  const minutes = Math.round(mbSize / 10); // Assume 10MB per minute
  return `${minutes}:00`;
}

// Main import function
async function importRealVideos() {
  console.log('🚀 Starting import of real coaching videos...\n');
  
  try {
    const drive = await initializeDrive();
    
    // Clear existing indexed_videos collection first
    console.log('🗑️  Clearing existing test videos...');
    const existingVideos = await db.collection('indexed_videos').get();
    const deletePromises = existingVideos.docs.map(doc => doc.ref.delete());
    await Promise.all(deletePromises);
    console.log(`   Deleted ${existingVideos.size} test videos\n`);
    
    // Get the root folder ID from environment
    const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
    if (!rootFolderId) {
      console.error('❌ GOOGLE_DRIVE_ROOT_FOLDER_ID not set in .env.local');
      return;
    }
    
    console.log(`📁 Scanning Google Drive folder: ${rootFolderId}\n`);
    
    // List all video files
    let pageToken = null;
    let totalVideos = 0;
    let successCount = 0;
    const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
    
    do {
      const response = await drive.files.list({
        q: `'${rootFolderId}' in parents and (${videoExtensions.map(ext => `name contains '.${ext}'`).join(' or ')})`,
        fields: 'nextPageToken, files(id, name, size, createdTime, modifiedTime, parents)',
        pageSize: 100,
        pageToken: pageToken
      });
      
      const files = response.data.files || [];
      console.log(`📹 Found ${files.length} videos in this batch\n`);
      
      for (const file of files) {
        totalVideos++;
        
        try {
          // Parse the filename
          const { coach, student, topic } = parseVideoTitle(file.name);
          
          // Determine category based on topic or filename
          let category = 'General Coaching';
          if (topic.toLowerCase().includes('essay')) category = 'Essay Review';
          else if (topic.toLowerCase().includes('sat') || topic.toLowerCase().includes('test')) category = 'Test Prep';
          else if (topic.toLowerCase().includes('college')) category = 'College Planning';
          else if (topic.toLowerCase().includes('interview')) category = 'Interview Prep';
          else if (topic.toLowerCase().includes('time') || topic.toLowerCase().includes('study')) category = 'Study Skills';
          
          // Create video document
          const videoData = {
            // Original file info
            driveId: file.id,
            filename: file.name,
            fileSize: parseInt(file.size || 0),
            
            // Parsed info
            title: `${coach} & ${student}${topic ? ' - ' + topic : ''}`,
            parsedCoach: coach,
            parsedStudent: student,
            topic: topic,
            category: category,
            
            // Metadata
            duration: getVideoDuration(parseInt(file.size || 0)),
            uploadDate: new Date(file.createdTime),
            modifiedDate: new Date(file.modifiedTime),
            
            // System fields
            indexed: true,
            indexedAt: admin.firestore.FieldValue.serverTimestamp(),
            source: 'google-drive',
            
            // Analytics
            viewCount: 0,
            lastViewed: null,
            tags: []
          };
          
          // Add to Firestore
          await db.collection('indexed_videos').add(videoData);
          successCount++;
          
          console.log(`   ✅ ${successCount}/${totalVideos}: ${videoData.title}`);
          
        } catch (error) {
          console.log(`   ❌ ${totalVideos}: Failed to process ${file.name} - ${error.message}`);
        }
      }
      
      pageToken = response.data.nextPageToken;
      
    } while (pageToken);
    
    console.log(`\n✅ Import complete!`);
    console.log(`   Total videos found: ${totalVideos}`);
    console.log(`   Successfully imported: ${successCount}`);
    console.log(`   Failed: ${totalVideos - successCount}`);
    
    // Show sample of imported data
    console.log('\n📊 Sample imported videos:');
    const sampleVideos = await db.collection('indexed_videos')
      .orderBy('indexedAt', 'desc')
      .limit(5)
      .get();
    
    sampleVideos.docs.forEach(doc => {
      const data = doc.data();
      console.log(`   - ${data.title} (${data.duration})`);
    });
    
  } catch (error) {
    console.error('❌ Import error:', error);
  }
  
  process.exit(0);
}

// Run the import
importRealVideos();
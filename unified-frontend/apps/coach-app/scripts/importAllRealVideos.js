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
function parseVideoInfo(filename) {
  // Remove file extension
  const nameWithoutExt = filename.replace(/\.(mp4|mov|avi|mkv|webm|m4a)$/i, '');
  
  // The filename format seems to be: Type_A_Coach_Student_Week_Date_ID
  // Example: Coaching_Jenny_Arshiya_Wk18_2025-07-08_M_81172457268U_HhLLp74lRKi4i90lfY2uiQ==
  
  const parts = nameWithoutExt.split('_');
  
  let coach = 'Unknown Coach';
  let student = 'Unknown Student';
  let week = '';
  let date = '';
  let type = 'Coaching';
  
  if (parts.length >= 4) {
    type = parts[0] || 'Coaching';
    
    // Skip 'A' if present
    let startIdx = parts[1] === 'A' ? 2 : 1;
    
    coach = parts[startIdx] || 'Unknown Coach';
    student = parts[startIdx + 1] || 'Unknown Student';
    
    // Look for week number
    const weekPart = parts.find(p => p.toLowerCase().startsWith('wk'));
    if (weekPart) {
      week = weekPart.replace(/wk/i, 'Week ');
    }
    
    // Look for date
    const datePart = parts.find(p => /\d{4}-\d{2}-\d{2}/.test(p));
    if (datePart) {
      date = datePart;
    }
  }
  
  // Clean up names
  coach = coach.charAt(0).toUpperCase() + coach.slice(1).toLowerCase();
  student = student.charAt(0).toUpperCase() + student.slice(1).toLowerCase();
  
  // Handle special cases
  if (coach === 'Unknown' || coach === 'Null') coach = 'Unknown Coach';
  if (student === 'Unknown' || student === 'Null') student = 'Unknown Student';
  
  return { coach, student, week, date, type };
}

// Get all video files recursively
async function getAllVideos(drive, folderId, folderPath = '') {
  const videos = [];
  
  try {
    let pageToken = null;
    
    do {
      // Get all files in current folder
      const response = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime)',
        pageSize: 100,
        pageToken: pageToken
      });
      
      const files = response.data.files || [];
      
      for (const file of files) {
        // If it's a video file
        if (file.mimeType && (file.mimeType.includes('video/') || file.name.endsWith('.mp4') || file.name.endsWith('.mov'))) {
          videos.push({
            ...file,
            folderPath: folderPath
          });
        }
        // If it's a folder, recursively scan it
        else if (file.mimeType === 'application/vnd.google-apps.folder') {
          console.log(`   📁 Scanning subfolder: ${folderPath}/${file.name}`);
          const subVideos = await getAllVideos(drive, file.id, `${folderPath}/${file.name}`);
          videos.push(...subVideos);
        }
      }
      
      pageToken = response.data.nextPageToken;
      
    } while (pageToken);
    
  } catch (error) {
    console.error(`   ❌ Error scanning folder ${folderPath}: ${error.message}`);
  }
  
  return videos;
}

// Main import function
async function importAllRealVideos() {
  console.log('🚀 Starting comprehensive import of all coaching videos...\n');
  
  try {
    const drive = await initializeDrive();
    
    // Clear existing indexed_videos collection first
    console.log('🗑️  Clearing existing videos...');
    const existingVideos = await db.collection('indexed_videos').get();
    const deletePromises = existingVideos.docs.map(doc => doc.ref.delete());
    await Promise.all(deletePromises);
    console.log(`   Deleted ${existingVideos.size} existing videos\n`);
    
    // Get the root folder ID
    const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
    if (!rootFolderId) {
      console.error('❌ GOOGLE_DRIVE_ROOT_FOLDER_ID not set in .env.local');
      return;
    }
    
    console.log(`📁 Starting recursive scan from root folder: ${rootFolderId}\n`);
    
    // Get all videos recursively
    const allVideos = await getAllVideos(drive, rootFolderId, 'Ivylevel Knowledge Base');
    
    console.log(`\n📹 Found ${allVideos.length} total videos\n`);
    
    let successCount = 0;
    const coachStats = {};
    const studentStats = {};
    
    // Import each video
    for (let i = 0; i < allVideos.length; i++) {
      const file = allVideos[i];
      
      try {
        // Parse the filename
        const { coach, student, week, date, type } = parseVideoInfo(file.name);
        
        // Track stats
        coachStats[coach] = (coachStats[coach] || 0) + 1;
        studentStats[student] = (studentStats[student] || 0) + 1;
        
        // Determine category
        let category = 'General Coaching';
        const lowerName = file.name.toLowerCase();
        const lowerPath = file.folderPath.toLowerCase();
        
        if (lowerName.includes('essay') || lowerPath.includes('essay')) category = 'Essay Review';
        else if (lowerName.includes('sat') || lowerName.includes('test') || lowerPath.includes('test')) category = 'Test Prep';
        else if (lowerName.includes('college') || lowerPath.includes('college')) category = 'College Planning';
        else if (lowerName.includes('interview') || lowerPath.includes('interview')) category = 'Interview Prep';
        else if (lowerName.includes('trivial') || lowerPath.includes('trivial')) category = 'Quick Check-in';
        else if (type === 'MISC' || lowerPath.includes('misc')) category = 'Miscellaneous';
        
        // Calculate duration from file size
        const minutes = Math.max(5, Math.round((parseInt(file.size || 0) / (1024 * 1024)) / 10));
        const duration = `${minutes}:00`;
        
        // Create video document
        const videoData = {
          // Original file info
          driveId: file.id,
          filename: file.name,
          fileSize: parseInt(file.size || 0),
          folderPath: file.folderPath,
          
          // Parsed info
          title: `${coach} & ${student}${week ? ' - ' + week : ''}${date ? ' (' + date + ')' : ''}`,
          parsedCoach: coach,
          parsedStudent: student,
          week: week,
          sessionDate: date,
          category: category,
          type: type,
          
          // Metadata
          duration: duration,
          uploadDate: new Date(file.createdTime),
          modifiedDate: new Date(file.modifiedTime),
          
          // System fields
          indexed: true,
          indexedAt: admin.firestore.FieldValue.serverTimestamp(),
          source: 'google-drive',
          
          // Analytics
          viewCount: 0,
          lastViewed: null,
          tags: [coach.toLowerCase(), student.toLowerCase(), category.toLowerCase()]
        };
        
        // Add to Firestore
        await db.collection('indexed_videos').add(videoData);
        successCount++;
        
        console.log(`   ✅ ${successCount}/${allVideos.length}: ${videoData.title}`);
        
      } catch (error) {
        console.log(`   ❌ ${i + 1}/${allVideos.length}: Failed to process ${file.name} - ${error.message}`);
      }
    }
    
    console.log(`\n✅ Import complete!`);
    console.log(`   Total videos found: ${allVideos.length}`);
    console.log(`   Successfully imported: ${successCount}`);
    console.log(`   Failed: ${allVideos.length - successCount}`);
    
    // Show statistics
    console.log('\n📊 Coach Statistics:');
    Object.entries(coachStats).sort((a, b) => b[1] - a[1]).forEach(([coach, count]) => {
      console.log(`   ${coach}: ${count} videos`);
    });
    
    console.log('\n📊 Student Statistics:');
    Object.entries(studentStats).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([student, count]) => {
      console.log(`   ${student}: ${count} videos`);
    });
    
    // Update coach records with real names
    console.log('\n👥 Updating coach records...');
    const realCoaches = Object.keys(coachStats).filter(c => c !== 'Unknown Coach');
    
    for (const coachName of realCoaches) {
      // Check if coach exists
      const existingCoach = await db.collection('coaches')
        .where('name', '==', coachName)
        .limit(1)
        .get();
      
      if (existingCoach.empty) {
        // Add new coach
        await db.collection('coaches').add({
          name: coachName,
          email: `${coachName.toLowerCase()}@ivymentors.co`,
          videoCount: coachStats[coachName],
          status: 'active',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`   ✅ Added coach: ${coachName}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Import error:', error);
  }
  
  process.exit(0);
}

// Run the import
importAllRealVideos();
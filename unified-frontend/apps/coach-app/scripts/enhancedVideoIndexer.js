// scripts/enhancedVideoIndexer.js
// Enhanced indexer for coaching session video recordings

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const { google } = require('googleapis');
const admin = require('firebase-admin');

// Initialize Firebase Admin
try {
  const serviceAccount = require('../credentials/firebase-admin.json');
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
  }
} catch (error) {
  console.error('Firebase admin initialization error:', error.message);
  process.exit(1);
}

const db = admin.firestore();

class EnhancedVideoIndexer {
  constructor() {
    this.drive = null;
    this.auth = null;
    this.rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
    
    // Knowledge base schema patterns
    this.patterns = {
      // Coach patterns
      coaches: {
        'kelvin': ['kelvin', 'chen'],
        'noor': ['noor', 'patel'],
        'jamie': ['jamie'],
        'marissa': ['marissa'],
        'iqra': ['iqra'],
        'andrew': ['andrew'],
        'aarnav': ['aarnav'],
        'hiba': ['hiba']
      },
      
      // Student profile patterns
      studentTypes: {
        'biomed': ['biomed', 'pre-med', 'medical', 'biology', 'health'],
        'cs': ['cs', 'computer science', 'coding', 'programming', 'tech'],
        'business': ['business', 'entrepreneur', 'startup', 'commerce'],
        'stem': ['stem', 'science', 'engineering', 'math'],
        'humanities': ['humanities', 'liberal arts', 'social science']
      },
      
      // Grade levels
      grades: {
        'freshman': ['freshman', '9th', 'grade 9'],
        'sophomore': ['sophomore', '10th', 'grade 10'],
        'junior': ['junior', '11th', 'grade 11'],
        'senior': ['senior', '12th', 'grade 12']
      },
      
      // Session types
      sessionTypes: {
        '168-hour': ['168', 'first session', 'initial', 'onboarding'],
        'game-plan': ['game plan', 'assessment', 'strategy'],
        'execution': ['execution', 'weekly', 'follow-up'],
        'parent': ['parent', 'family'],
        'crisis': ['crisis', 'urgent', 'emergency'],
        'milestone': ['milestone', 'achievement', 'celebration']
      },
      
      // Topics
      topics: {
        'college-apps': ['college', 'application', 'essays', 'common app'],
        'test-prep': ['sat', 'act', 'ap', 'test prep'],
        'extracurriculars': ['extracurricular', 'activities', 'leadership'],
        'internships': ['internship', 'research', 'lab', 'work experience'],
        'time-management': ['time management', 'schedule', 'planning'],
        'motivation': ['motivation', 'mindset', 'confidence'],
        'parent-management': ['parent', 'family', 'expectations']
      }
    };
  }

  async initialize() {
    try {
      const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE || './credentials/service-account.json';
      
      const auth = new google.auth.GoogleAuth({
        keyFile: path.join(__dirname, '..', keyFile),
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      });

      this.auth = await auth.getClient();
      this.drive = google.drive({ version: 'v3', auth: this.auth });
      
      console.log('✅ Google Drive API initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize:', error.message);
      return false;
    }
  }

  async scanForVideos(folderId = null, folderPath = '', depth = 0) {
    const videos = [];
    const targetFolder = folderId || this.rootFolderId;
    let pageToken = null;
    const indent = '  '.repeat(depth);

    console.log(`${indent}📁 Scanning: ${folderPath || 'Root'}`);

    do {
      try {
        const response = await this.drive.files.list({
          q: `'${targetFolder}' in parents and trashed = false`,
          fields: 'nextPageToken, files(id, name, mimeType, webViewLink, size, createdTime, modifiedTime, description)',
          pageToken: pageToken,
          pageSize: 100,
          orderBy: 'createdTime desc'
        });

        const files = response.data.files || [];
        
        for (const file of files) {
          if (file.mimeType === 'application/vnd.google-apps.folder') {
            // Recursively scan subfolders
            const subVideos = await this.scanForVideos(
              file.id, 
              `${folderPath}/${file.name}`,
              depth + 1
            );
            videos.push(...subVideos);
          } else if (this.isVideoFile(file)) {
            // Process video file
            const videoMetadata = this.extractVideoMetadata(file, folderPath);
            if (videoMetadata) {
              videos.push(videoMetadata);
              console.log(`${indent}  🎥 ${file.name}`);
              console.log(`${indent}     → ${videoMetadata.sessionInfo.type} | ${videoMetadata.participants.coach || 'Unknown'} | ${videoMetadata.topics.join(', ')}`);
            }
          }
        }

        pageToken = response.data.nextPageToken;
      } catch (error) {
        console.error(`${indent}  ❌ Error:`, error.message);
        break;
      }
    } while (pageToken);

    return videos;
  }

  isVideoFile(file) {
    const videoMimeTypes = [
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-ms-wmv',
      'video/mpeg',
      'application/vnd.google-apps.video'
    ];
    
    return videoMimeTypes.includes(file.mimeType) || 
           file.name.toLowerCase().match(/\.(mp4|mov|avi|wmv|mpeg|mpg|mkv|webm)$/);
  }

  extractVideoMetadata(file, folderPath) {
    const fileName = file.name.toLowerCase();
    const fullPath = `${folderPath}/${file.name}`.toLowerCase();
    
    // Extract date from filename or use creation date
    const dateMatch = fileName.match(/(\d{4}[-_]\d{2}[-_]\d{2})|(\d{2}[-_]\d{2}[-_]\d{4})/);
    const sessionDate = dateMatch ? this.parseDate(dateMatch[0]) : new Date(file.createdTime);
    
    // Extract participants
    const participants = this.extractParticipants(fileName, fullPath);
    
    // Extract session type
    const sessionType = this.extractSessionType(fileName, fullPath);
    
    // Extract topics
    const topics = this.extractTopics(fileName, fullPath);
    
    // Extract student info
    const studentInfo = this.extractStudentInfo(fileName, fullPath);
    
    // Generate enhanced metadata
    return {
      // Basic info
      id: file.id,
      title: this.generateTitle(file.name, participants, sessionType),
      originalFileName: file.name,
      description: this.generateDescription(participants, sessionType, topics, studentInfo),
      
      // File details
      googleDriveId: file.id,
      googleDriveUrl: file.webViewLink,
      mimeType: file.mimeType,
      fileSize: parseInt(file.size || 0),
      duration: this.estimateDuration(file),
      
      // Categorization
      type: 'coaching-session',
      sessionInfo: {
        type: sessionType,
        date: sessionDate,
        dateString: sessionDate.toISOString().split('T')[0]
      },
      
      // Participants
      participants: participants,
      
      // Student profile
      studentProfile: {
        grade: studentInfo.grade,
        track: studentInfo.track,
        profile: studentInfo.profile
      },
      
      // Content
      topics: topics,
      tags: this.generateTags(participants, sessionType, topics, studentInfo),
      
      // Coaching specific
      coachingMetadata: {
        is168Hour: sessionType === '168-hour',
        isGamePlan: sessionType === 'game-plan',
        isParentSession: topics.includes('parent-management'),
        isCrisis: sessionType === 'crisis'
      },
      
      // Recommendations
      recommendedFor: this.generateRecommendations(participants, sessionType, topics),
      priority: this.calculatePriority(sessionType, topics),
      isRequired: sessionType === '168-hour' || sessionType === 'game-plan',
      
      // Analytics
      viewCount: 0,
      completionRate: 0,
      averageRating: null,
      bookmarks: [],
      
      // Metadata
      folderPath: folderPath,
      createdAt: new Date(file.createdTime),
      modifiedAt: new Date(file.modifiedTime),
      indexedAt: new Date(),
      version: 1,
      
      // Access control
      isPublic: false,
      restrictedToRoles: ['admin', 'coach']
    };
  }

  extractParticipants(fileName, fullPath) {
    const participants = {
      coach: null,
      student: null,
      others: []
    };
    
    // Check for coach names
    for (const [coachKey, patterns] of Object.entries(this.patterns.coaches)) {
      if (patterns.some(pattern => fileName.includes(pattern) || fullPath.includes(pattern))) {
        participants.coach = coachKey;
        break;
      }
    }
    
    // Extract student name (often format: "Coach & Student - Topic")
    const andPattern = /(\w+)\s*&\s*(\w+)/;
    const match = fileName.match(andPattern);
    if (match && participants.coach) {
      // Second name is likely the student
      participants.student = match[2];
    }
    
    return participants;
  }

  extractSessionType(fileName, fullPath) {
    for (const [type, patterns] of Object.entries(this.patterns.sessionTypes)) {
      if (patterns.some(pattern => fileName.includes(pattern) || fullPath.includes(pattern))) {
        return type;
      }
    }
    return 'regular';
  }

  extractTopics(fileName, fullPath) {
    const topics = [];
    
    for (const [topic, patterns] of Object.entries(this.patterns.topics)) {
      if (patterns.some(pattern => fileName.includes(pattern) || fullPath.includes(pattern))) {
        topics.push(topic);
      }
    }
    
    // Also check for subject areas
    for (const [subject, patterns] of Object.entries(this.patterns.studentTypes)) {
      if (patterns.some(pattern => fileName.includes(pattern) || fullPath.includes(pattern))) {
        topics.push(subject);
      }
    }
    
    return topics.length > 0 ? topics : ['general'];
  }

  extractStudentInfo(fileName, fullPath) {
    const info = {
      grade: 'unknown',
      track: 'general',
      profile: 'average'
    };
    
    // Extract grade
    for (const [grade, patterns] of Object.entries(this.patterns.grades)) {
      if (patterns.some(pattern => fileName.includes(pattern) || fullPath.includes(pattern))) {
        info.grade = grade;
        break;
      }
    }
    
    // Extract track
    for (const [track, patterns] of Object.entries(this.patterns.studentTypes)) {
      if (patterns.some(pattern => fileName.includes(pattern) || fullPath.includes(pattern))) {
        info.track = track;
        break;
      }
    }
    
    // Extract profile (high-achieving, average, struggling)
    if (fileName.includes('high achiev') || fileName.includes('advanced')) {
      info.profile = 'high-achieving';
    } else if (fileName.includes('struggl') || fileName.includes('support')) {
      info.profile = 'struggling';
    }
    
    return info;
  }

  generateTitle(originalName, participants, sessionType) {
    const cleanName = originalName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    
    if (participants.coach && participants.student) {
      const typeLabel = sessionType === '168-hour' ? ' - 168 Hour Session' : 
                       sessionType === 'game-plan' ? ' - Game Plan' : '';
      return `${participants.coach} & ${participants.student}${typeLabel}`;
    }
    
    return cleanName;
  }

  generateDescription(participants, sessionType, topics, studentInfo) {
    let desc = 'Coaching session';
    
    if (participants.coach) {
      desc += ` with ${participants.coach}`;
    }
    
    if (sessionType !== 'regular') {
      desc += ` (${sessionType.replace('-', ' ')})`;
    }
    
    if (topics.length > 0 && topics[0] !== 'general') {
      desc += ` covering ${topics.join(', ')}`;
    }
    
    if (studentInfo.grade !== 'unknown') {
      desc += ` for ${studentInfo.grade} student`;
    }
    
    return desc;
  }

  generateTags(participants, sessionType, topics, studentInfo) {
    const tags = new Set();
    
    // Add participant tags
    if (participants.coach) tags.add(participants.coach);
    if (participants.student) tags.add(participants.student.toLowerCase());
    
    // Add session type
    tags.add(sessionType);
    
    // Add topics
    topics.forEach(topic => tags.add(topic));
    
    // Add student info
    if (studentInfo.grade !== 'unknown') tags.add(studentInfo.grade);
    if (studentInfo.track !== 'general') tags.add(studentInfo.track);
    tags.add(studentInfo.profile);
    
    // Add year from session date
    const yearMatch = participants.student?.match(/\d{4}/);
    if (yearMatch) tags.add(`year-${yearMatch[0]}`);
    
    return Array.from(tags);
  }

  generateRecommendations(participants, sessionType, topics) {
    const recommendations = [];
    
    // Recommend for specific coaches
    if (participants.coach) {
      recommendations.push(`${participants.coach}-coaches`);
    }
    
    // Recommend based on session type
    if (sessionType === '168-hour') {
      recommendations.push('new-coaches', 'onboarding');
    } else if (sessionType === 'game-plan') {
      recommendations.push('assessment-training');
    }
    
    // Recommend based on topics
    if (topics.includes('parent-management')) {
      recommendations.push('parent-communication');
    }
    
    topics.forEach(topic => {
      recommendations.push(`${topic}-focused`);
    });
    
    return recommendations;
  }

  calculatePriority(sessionType, topics) {
    if (sessionType === '168-hour' || sessionType === 'game-plan') {
      return 'high';
    }
    if (sessionType === 'crisis' || topics.includes('college-apps')) {
      return 'high';
    }
    if (sessionType === 'milestone' || sessionType === 'parent') {
      return 'medium';
    }
    return 'normal';
  }

  parseDate(dateStr) {
    // Handle various date formats
    dateStr = dateStr.replace(/[_-]/g, '/');
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? new Date() : date;
  }

  estimateDuration(file) {
    const sizeMB = parseInt(file.size || 0) / (1024 * 1024);
    if (sizeMB < 200) return '30 min';
    if (sizeMB < 500) return '45 min';
    if (sizeMB < 1000) return '60 min';
    if (sizeMB < 2000) return '90 min';
    return '120+ min';
  }

  async saveToFirestore(videos) {
    console.log(`\n💾 Saving ${videos.length} coaching sessions to Firestore...`);
    
    const stats = {
      new: 0,
      updated: 0,
      errors: 0,
      byCoach: {},
      byType: {},
      byYear: {}
    };

    for (const video of videos) {
      try {
        // Check if already exists
        const existing = await db
          .collection('coaching_sessions')
          .where('googleDriveId', '==', video.googleDriveId)
          .limit(1)
          .get();

        if (existing.empty) {
          await db.collection('coaching_sessions').add(video);
          stats.new++;
        } else {
          await db.collection('coaching_sessions').doc(existing.docs[0].id).update({
            ...video,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          stats.updated++;
        }

        // Update stats
        if (video.participants.coach) {
          stats.byCoach[video.participants.coach] = (stats.byCoach[video.participants.coach] || 0) + 1;
        }
        stats.byType[video.sessionInfo.type] = (stats.byType[video.sessionInfo.type] || 0) + 1;
        
        const year = new Date(video.sessionInfo.date).getFullYear();
        stats.byYear[year] = (stats.byYear[year] || 0) + 1;

      } catch (error) {
        console.error(`❌ Error saving ${video.title}:`, error.message);
        stats.errors++;
      }
    }

    // Display comprehensive stats
    console.log('\n📊 Import Statistics:');
    console.log(`  ✅ New sessions: ${stats.new}`);
    console.log(`  🔄 Updated sessions: ${stats.updated}`);
    console.log(`  ❌ Errors: ${stats.errors}`);
    
    console.log('\n👥 Sessions by Coach:');
    Object.entries(stats.byCoach).forEach(([coach, count]) => {
      console.log(`  ${coach}: ${count} sessions`);
    });
    
    console.log('\n📋 Sessions by Type:');
    Object.entries(stats.byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} sessions`);
    });
    
    console.log('\n📅 Sessions by Year:');
    Object.entries(stats.byYear).sort().forEach(([year, count]) => {
      console.log(`  ${year}: ${count} sessions`);
    });
  }
}

// Main execution
async function main() {
  console.log('🎥 Enhanced Video Knowledge Base Indexer\n');
  console.log('This will scan and categorize all coaching session recordings...\n');
  
  const indexer = new EnhancedVideoIndexer();
  
  if (!await indexer.initialize()) {
    console.error('Failed to initialize');
    process.exit(1);
  }

  console.log('🔍 Scanning for coaching session videos...\n');
  const videos = await indexer.scanForVideos();
  
  console.log(`\n✅ Found ${videos.length} coaching session videos`);
  
  if (videos.length > 0) {
    await indexer.saveToFirestore(videos);
    
    // Also update the main resources collection with key sessions
    console.log('\n🔗 Linking key sessions to main resources...');
    const keyVideos = videos.filter(v => 
      v.sessionInfo.type === '168-hour' || 
      v.sessionInfo.type === 'game-plan' ||
      v.priority === 'high'
    );
    
    for (const video of keyVideos) {
      try {
        await db.collection('resources').add({
          ...video,
          type: 'video',
          collection: 'coaching_sessions'
        });
      } catch (error) {
        console.error('Error linking video:', error.message);
      }
    }
    console.log(`✅ Linked ${keyVideos.length} key sessions to resources`);
  }
  
  console.log('\n✅ Knowledge base indexing complete!');
  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
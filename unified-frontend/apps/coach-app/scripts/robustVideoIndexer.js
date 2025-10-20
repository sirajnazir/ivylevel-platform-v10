// scripts/robustVideoIndexer.js
// Robust video indexer with patching capabilities for evolving data structures

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const { google } = require('googleapis');
const admin = require('firebase-admin');
const fs = require('fs').promises;

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

// Load patch configuration
async function loadPatchConfig() {
  try {
    const patchPath = path.join(__dirname, 'indexer-patches.json');
    const patchData = await fs.readFile(patchPath, 'utf8');
    return JSON.parse(patchData);
  } catch (error) {
    // Return default config if no patch file exists
    return {
      version: "1.0",
      lastUpdated: new Date().toISOString(),
      patches: []
    };
  }
}

class RobustVideoIndexer {
  constructor() {
    this.drive = null;
    this.auth = null;
    this.rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
    this.patches = [];
    this.stats = {
      processed: 0,
      errors: 0,
      skipped: 0,
      patched: 0
    };
    
    // Flexible patterns that can be extended via patches
    this.patterns = {
      // File naming patterns (can handle various formats)
      filePatterns: [
        // Standard format: TYPE_A_Coach_Student_Wk##_Date_ID
        /^(COACHING|MISC|TRIVIAL|NO_SHOW)_A_([^_]+)_([^_]+)_Wk(\d+|Unknown)_(\d{4}-\d{2}-\d{2})_M_(\w+)_(.+)/i,
        // Alternative format without week
        /^(COACHING|MISC|TRIVIAL)_A_([^_]+)_([^_]+)_(\d{4}-\d{2}-\d{2})_(.+)/i,
        // Legacy format
        /^([^_]+)_([^_]+)_Session_(\d{4}-\d{2}-\d{2})/i,
        // Simple format: Coach_Student_Date
        /^([^_]+)_([^_]+)_(\d{4}-\d{2}-\d{2})/i
      ],
      
      // Coach name variations (will be extended by patches)
      coachVariations: {
        'kelvin': ['kelvin', 'chen', 'kelvinchen'],
        'noor': ['noor', 'patel', 'noorpatel'],
        'jamie': ['jamie', 'jamielee'],
        'marissa': ['marissa', 'marrisa'],  // Common misspelling
        'iqra': ['iqra', 'iqrah'],
        'andrew': ['andrew', 'andy'],
        'jenny': ['jenny', 'jennifer'],
        'juli': ['juli', 'julie', 'julia'],
        'ivylevel': ['ivylevel', 'ivy level', 'admin']
      },
      
      // Student name normalization
      studentCorrections: {
        'unknown': null,  // Will be marked for manual review
        'unkown': null,   // Typo
        'coach': null,    // Generic placeholder
      },
      
      // Session type detection
      sessionTypeRules: [
        { pattern: /168[\s-]?hour|first[\s-]?session|initial|onboarding/i, type: '168-hour' },
        { pattern: /game[\s-]?plan|assessment|strategy/i, type: 'game-plan' },
        { pattern: /parent|family/i, type: 'parent' },
        { pattern: /crisis|urgent|emergency/i, type: 'crisis' },
        { pattern: /milestone|achievement|celebration/i, type: 'milestone' },
        { pattern: /execution|weekly|follow[\s-]?up/i, type: 'execution' },
        { pattern: /NO_SHOW/i, type: 'no-show' },
        { pattern: /TRIVIAL/i, type: 'trivial' }
      ],
      
      // Subject detection rules
      subjectRules: [
        { pattern: /biomed|pre[\s-]?med|medical|biology|health/i, subject: 'biomed' },
        { pattern: /cs|computer[\s-]?science|coding|programming|tech/i, subject: 'cs' },
        { pattern: /business|entrepreneur|startup|commerce/i, subject: 'business' },
        { pattern: /stem|science|engineering|math/i, subject: 'stem' },
        { pattern: /sat|act|test[\s-]?prep/i, subject: 'test-prep' }
      ]
    };
  }

  async initialize() {
    try {
      // Load patches
      const patchConfig = await loadPatchConfig();
      this.patches = patchConfig.patches || [];
      console.log(`📋 Loaded ${this.patches.length} patches`);
      
      // Apply patches to patterns
      this.applyPatches();
      
      // Initialize Google Drive
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

  applyPatches() {
    for (const patch of this.patches) {
      try {
        switch (patch.type) {
          case 'coach-variation':
            // Add new coach name variations
            if (!this.patterns.coachVariations[patch.coach]) {
              this.patterns.coachVariations[patch.coach] = [];
            }
            this.patterns.coachVariations[patch.coach].push(...patch.variations);
            break;
            
          case 'student-correction':
            // Add student name corrections
            Object.assign(this.patterns.studentCorrections, patch.corrections);
            break;
            
          case 'file-pattern':
            // Add new file naming pattern
            this.patterns.filePatterns.push(new RegExp(patch.pattern, patch.flags || 'i'));
            break;
            
          case 'session-type':
            // Add new session type rule
            this.patterns.sessionTypeRules.push({
              pattern: new RegExp(patch.pattern, patch.flags || 'i'),
              type: patch.sessionType
            });
            break;
            
          case 'subject-rule':
            // Add new subject detection rule
            this.patterns.subjectRules.push({
              pattern: new RegExp(patch.pattern, patch.flags || 'i'),
              subject: patch.subject
            });
            break;
        }
        console.log(`  ✓ Applied patch: ${patch.name}`);
      } catch (error) {
        console.error(`  ✗ Failed to apply patch ${patch.name}:`, error.message);
      }
    }
  }

  async scanForVideos(folderId = null, folderPath = '', depth = 0) {
    const videos = [];
    const targetFolder = folderId || this.rootFolderId;
    let pageToken = null;
    const indent = '  '.repeat(depth);

    // Skip OLD_ folders and other archived content
    if (folderPath.includes('/OLD_') || folderPath.includes('_Archive')) {
      console.log(`${indent}⏭️  Skipping archived folder: ${folderPath}`);
      return videos;
    }

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
            try {
              const videoMetadata = await this.extractVideoMetadata(file, folderPath);
              if (videoMetadata) {
                videos.push(videoMetadata);
                this.stats.processed++;
                
                // Log with extracted info
                const info = videoMetadata.extractionInfo;
                console.log(`${indent}  🎥 ${file.name}`);
                console.log(`${indent}     → ${info.type} | ${info.coach || 'Unknown'} & ${info.student || 'Unknown'} | Week ${info.week || '?'}`);
                if (info.wasPatched) {
                  console.log(`${indent}     📋 Patched: ${info.patchApplied}`);
                  this.stats.patched++;
                }
              } else {
                this.stats.skipped++;
              }
            } catch (error) {
              console.error(`${indent}  ❌ Error processing ${file.name}:`, error.message);
              this.stats.errors++;
              
              // Still create a basic entry for problematic files
              const fallbackMetadata = this.createFallbackMetadata(file, folderPath, error);
              videos.push(fallbackMetadata);
            }
          }
        }

        pageToken = response.data.nextPageToken;
      } catch (error) {
        console.error(`${indent}  ❌ Folder error:`, error.message);
        break;
      }
    } while (pageToken);

    return videos;
  }

  isVideoFile(file) {
    const videoMimeTypes = [
      'video/mp4', 'video/quicktime', 'video/x-msvideo',
      'video/x-ms-wmv', 'video/mpeg', 'application/vnd.google-apps.video'
    ];
    
    // Also check by extension for misidentified files
    const videoExtensions = /\.(mp4|mov|avi|wmv|mpeg|mpg|mkv|webm|m4v)$/i;
    
    return videoMimeTypes.includes(file.mimeType) || 
           videoExtensions.test(file.name);
  }

  async extractVideoMetadata(file, folderPath) {
    const fileName = file.name;
    const extractionInfo = this.parseFileName(fileName, folderPath);
    
    // Build comprehensive metadata
    const metadata = {
      // Core identification
      id: file.id,
      googleDriveId: file.id,
      googleDriveUrl: file.webViewLink,
      
      // File info
      originalFileName: fileName,
      fileSize: parseInt(file.size || 0),
      mimeType: file.mimeType,
      
      // Extracted information
      title: this.generateTitle(extractionInfo),
      description: this.generateDescription(extractionInfo, file.description),
      
      // Session details
      type: 'coaching-session',
      sessionInfo: {
        type: extractionInfo.sessionType,
        date: extractionInfo.date,
        week: extractionInfo.week,
        duration: this.estimateDuration(file),
        isNoShow: extractionInfo.sessionType === 'no-show'
      },
      
      // Participants
      participants: {
        coach: extractionInfo.coach,
        student: extractionInfo.student,
        coachNormalized: this.normalizeCoachName(extractionInfo.coach),
        studentNormalized: this.normalizeStudentName(extractionInfo.student)
      },
      
      // Categorization
      subjects: extractionInfo.subjects,
      tags: this.generateTags(extractionInfo),
      priority: this.calculatePriority(extractionInfo),
      
      // Quality indicators
      dataQuality: {
        hasCoach: !!extractionInfo.coach && extractionInfo.coach !== 'unknown',
        hasStudent: !!extractionInfo.student && extractionInfo.student !== 'Unknown',
        hasWeek: !!extractionInfo.week && extractionInfo.week !== 'Unknown',
        hasDate: !!extractionInfo.date,
        confidence: this.calculateConfidence(extractionInfo)
      },
      
      // Metadata
      folderPath: folderPath,
      createdAt: new Date(file.createdTime),
      modifiedAt: new Date(file.modifiedTime),
      indexedAt: new Date(),
      
      // For debugging and improvement
      extractionInfo: extractionInfo,
      indexerVersion: '2.0'
    };
    
    // Mark for review if low quality
    if (metadata.dataQuality.confidence < 0.5) {
      metadata.needsReview = true;
      metadata.reviewReasons = this.getReviewReasons(metadata);
    }
    
    return metadata;
  }

  parseFileName(fileName, folderPath) {
    const info = {
      raw: fileName,
      type: 'unknown',
      coach: 'unknown',
      student: 'Unknown',
      week: null,
      date: null,
      sessionType: 'regular',
      subjects: [],
      wasPatched: false,
      patchApplied: null,
      parseMethod: null
    };
    
    // Try each pattern until one matches
    for (let i = 0; i < this.patterns.filePatterns.length; i++) {
      const pattern = this.patterns.filePatterns[i];
      const match = fileName.match(pattern);
      
      if (match) {
        info.parseMethod = `pattern-${i}`;
        
        // Extract based on pattern structure
        switch (i) {
          case 0: // Standard format
            info.type = match[1];
            info.coach = match[2];
            info.student = match[3];
            info.week = match[4];
            info.date = this.parseDate(match[5]);
            break;
            
          case 1: // Alternative format
            info.type = match[1];
            info.coach = match[2];
            info.student = match[3];
            info.date = this.parseDate(match[4]);
            break;
            
          case 2: // Legacy format
            info.coach = match[1];
            info.student = match[2];
            info.date = this.parseDate(match[3]);
            break;
            
          case 3: // Simple format
            info.coach = match[1];
            info.student = match[2];
            info.date = this.parseDate(match[3]);
            break;
        }
        
        break;
      }
    }
    
    // If no pattern matched, try to extract from folder structure
    if (info.parseMethod === null) {
      info.parseMethod = 'folder-based';
      const pathParts = folderPath.split('/').filter(p => p);
      
      // Check if folder names contain coach/student info
      if (pathParts.length >= 2) {
        const possibleCoach = pathParts[pathParts.length - 2];
        const possibleStudent = pathParts[pathParts.length - 1];
        
        if (this.isKnownCoach(possibleCoach)) {
          info.coach = possibleCoach;
        }
        if (!this.isKnownCoach(possibleStudent)) {
          info.student = possibleStudent;
        }
      }
    }
    
    // Detect session type
    info.sessionType = this.detectSessionType(fileName, info.type);
    
    // Detect subjects
    info.subjects = this.detectSubjects(fileName + ' ' + folderPath);
    
    // Apply corrections from patches
    info.coach = this.normalizeCoachName(info.coach);
    info.student = this.normalizeStudentName(info.student);
    
    return info;
  }

  normalizeCoachName(name) {
    if (!name) return 'unknown';
    
    const normalized = name.toLowerCase().trim();
    
    // Check each known coach's variations
    for (const [coach, variations] of Object.entries(this.patterns.coachVariations)) {
      if (variations.includes(normalized)) {
        return coach;
      }
    }
    
    return name; // Return original if no match
  }

  normalizeStudentName(name) {
    if (!name) return 'Unknown';
    
    const normalized = name.toLowerCase().trim();
    
    // Check corrections
    if (normalized in this.patterns.studentCorrections) {
      return this.patterns.studentCorrections[normalized] || 'Unknown';
    }
    
    // Capitalize properly
    return name.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  isKnownCoach(name) {
    const normalized = name.toLowerCase();
    return Object.keys(this.patterns.coachVariations).includes(normalized) ||
           Object.values(this.patterns.coachVariations).flat().includes(normalized);
  }

  detectSessionType(fileName, typePrefix) {
    const combined = fileName + ' ' + typePrefix;
    
    for (const rule of this.patterns.sessionTypeRules) {
      if (rule.pattern.test(combined)) {
        return rule.type;
      }
    }
    
    return 'regular';
  }

  detectSubjects(text) {
    const subjects = [];
    
    for (const rule of this.patterns.subjectRules) {
      if (rule.pattern.test(text)) {
        subjects.push(rule.subject);
      }
    }
    
    return subjects.length > 0 ? subjects : ['general'];
  }

  parseDate(dateStr) {
    if (!dateStr) return null;
    
    // Handle various date formats
    const cleaned = dateStr.replace(/[_]/g, '-');
    const date = new Date(cleaned);
    
    return isNaN(date.getTime()) ? null : date;
  }

  estimateDuration(file) {
    const sizeMB = parseInt(file.size || 0) / (1024 * 1024);
    if (sizeMB < 100) return '15-30 min';
    if (sizeMB < 300) return '30-45 min';
    if (sizeMB < 600) return '45-60 min';
    if (sizeMB < 1200) return '60-90 min';
    return '90+ min';
  }

  generateTitle(info) {
    if (info.coach !== 'unknown' && info.student !== 'Unknown') {
      const weekPart = info.week && info.week !== 'Unknown' ? ` - Week ${info.week}` : '';
      return `${info.coach} & ${info.student}${weekPart}`;
    }
    
    // Fallback to cleaned filename
    return info.raw.replace(/\.[^/.]+$/, '').replace(/[_]/g, ' ');
  }

  generateDescription(info, originalDesc) {
    const parts = [];
    
    if (info.sessionType !== 'regular') {
      parts.push(`${info.sessionType.replace(/-/g, ' ')} session`);
    } else {
      parts.push('Coaching session');
    }
    
    if (info.coach !== 'unknown') {
      parts.push(`with ${info.coach}`);
    }
    
    if (info.subjects.length > 0 && info.subjects[0] !== 'general') {
      parts.push(`covering ${info.subjects.join(', ')}`);
    }
    
    if (info.date) {
      parts.push(`on ${info.date.toLocaleDateString()}`);
    }
    
    return parts.join(' ') + (originalDesc ? `. ${originalDesc}` : '');
  }

  generateTags(info) {
    const tags = new Set();
    
    // Add all relevant info as tags
    if (info.coach !== 'unknown') tags.add(info.coach);
    if (info.student !== 'Unknown') tags.add(info.student.toLowerCase());
    tags.add(info.sessionType);
    info.subjects.forEach(s => tags.add(s));
    
    // Add week tag
    if (info.week && info.week !== 'Unknown') {
      tags.add(`week-${info.week}`);
    }
    
    // Add year tag
    if (info.date) {
      tags.add(`year-${info.date.getFullYear()}`);
    }
    
    // Add quality tags
    if (info.parseMethod) {
      tags.add(info.parseMethod);
    }
    
    return Array.from(tags);
  }

  calculatePriority(info) {
    if (info.sessionType === '168-hour' || info.sessionType === 'game-plan') {
      return 'high';
    }
    if (info.sessionType === 'crisis' || info.sessionType === 'parent') {
      return 'high';
    }
    if (info.sessionType === 'no-show' || info.sessionType === 'trivial') {
      return 'low';
    }
    return 'normal';
  }

  calculateConfidence(info) {
    let score = 0;
    let factors = 0;
    
    // Check data completeness
    if (info.coach !== 'unknown') { score += 1; factors += 1; }
    if (info.student !== 'Unknown') { score += 1; factors += 1; }
    if (info.week && info.week !== 'Unknown') { score += 0.5; factors += 0.5; }
    if (info.date) { score += 1; factors += 1; }
    if (info.parseMethod && info.parseMethod.startsWith('pattern')) { score += 0.5; factors += 0.5; }
    
    return factors > 0 ? score / factors : 0;
  }

  getReviewReasons(metadata) {
    const reasons = [];
    
    if (!metadata.dataQuality.hasCoach) reasons.push('Missing coach information');
    if (!metadata.dataQuality.hasStudent) reasons.push('Missing student information');
    if (!metadata.dataQuality.hasDate) reasons.push('Missing or invalid date');
    if (metadata.dataQuality.confidence < 0.3) reasons.push('Low parsing confidence');
    
    return reasons;
  }

  createFallbackMetadata(file, folderPath, error) {
    return {
      id: file.id,
      googleDriveId: file.id,
      googleDriveUrl: file.webViewLink,
      originalFileName: file.name,
      title: file.name.replace(/\.[^/.]+$/, ''),
      description: `Failed to parse: ${error.message}`,
      type: 'coaching-session',
      sessionInfo: {
        type: 'unknown',
        date: new Date(file.createdTime)
      },
      participants: {
        coach: 'unknown',
        student: 'Unknown'
      },
      dataQuality: {
        hasError: true,
        error: error.message,
        confidence: 0
      },
      needsReview: true,
      folderPath: folderPath,
      createdAt: new Date(file.createdTime),
      indexedAt: new Date(),
      indexerVersion: '2.0'
    };
  }

  async saveToFirestore(videos) {
    console.log(`\n💾 Saving ${videos.length} videos to Firestore...`);
    
    const stats = {
      new: 0,
      updated: 0,
      errors: 0,
      needsReview: 0
    };

    // Use batched writes for performance
    const batchSize = 500;
    for (let i = 0; i < videos.length; i += batchSize) {
      const batch = db.batch();
      const batchVideos = videos.slice(i, i + batchSize);
      
      for (const video of batchVideos) {
        try {
          // Check if exists
          const existing = await db
            .collection('coaching_sessions')
            .where('googleDriveId', '==', video.googleDriveId)
            .limit(1)
            .get();

          if (existing.empty) {
            const docRef = db.collection('coaching_sessions').doc();
            batch.set(docRef, video);
            stats.new++;
          } else {
            const docRef = db.collection('coaching_sessions').doc(existing.docs[0].id);
            batch.update(docRef, {
              ...video,
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            stats.updated++;
          }

          if (video.needsReview) {
            stats.needsReview++;
          }

        } catch (error) {
          console.error(`Error processing ${video.title}:`, error.message);
          stats.errors++;
        }
      }
      
      // Commit batch
      await batch.commit();
      console.log(`  Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(videos.length/batchSize)}`);
    }

    // Display comprehensive stats
    console.log('\n📊 Import Summary:');
    console.log(`  ✅ New sessions: ${stats.new}`);
    console.log(`  🔄 Updated sessions: ${stats.updated}`);
    console.log(`  ⚠️  Need review: ${stats.needsReview}`);
    console.log(`  ❌ Errors: ${stats.errors}`);
    
    // Save indexing stats
    await db.collection('indexing_stats').add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      stats: this.stats,
      importStats: stats,
      version: '2.0'
    });
  }

  async generateQualityReport(videos) {
    const report = {
      total: videos.length,
      byQuality: {
        high: 0,
        medium: 0,
        low: 0,
        needsReview: 0
      },
      byCoach: {},
      bySessionType: {},
      issues: []
    };

    videos.forEach(video => {
      // Quality assessment
      const confidence = video.dataQuality.confidence;
      if (video.needsReview) {
        report.byQuality.needsReview++;
      } else if (confidence >= 0.8) {
        report.byQuality.high++;
      } else if (confidence >= 0.5) {
        report.byQuality.medium++;
      } else {
        report.byQuality.low++;
      }

      // By coach
      const coach = video.participants.coachNormalized || 'unknown';
      report.byCoach[coach] = (report.byCoach[coach] || 0) + 1;

      // By session type
      const type = video.sessionInfo.type;
      report.bySessionType[type] = (report.bySessionType[type] || 0) + 1;

      // Collect issues
      if (video.needsReview) {
        report.issues.push({
          file: video.originalFileName,
          reasons: video.reviewReasons || ['Unknown issue'],
          path: video.folderPath
        });
      }
    });

    // Save report
    await db.collection('quality_reports').add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      report: report,
      version: '2.0'
    });

    return report;
  }
}

// Main execution
async function main() {
  console.log('🎥 Robust Video Knowledge Base Indexer v2.0\n');
  
  const indexer = new RobustVideoIndexer();
  
  if (!await indexer.initialize()) {
    console.error('Failed to initialize');
    process.exit(1);
  }

  console.log('🔍 Scanning for videos...\n');
  const videos = await indexer.scanForVideos();
  
  console.log(`\n✅ Found ${videos.length} videos`);
  console.log(`📊 Processing stats:`, indexer.stats);
  
  if (videos.length > 0) {
    // Save to Firestore
    await indexer.saveToFirestore(videos);
    
    // Generate quality report
    console.log('\n📋 Generating quality report...');
    const report = await indexer.generateQualityReport(videos);
    
    console.log('\n📊 Quality Report:');
    console.log(`  High quality: ${report.byQuality.high}`);
    console.log(`  Medium quality: ${report.byQuality.medium}`);
    console.log(`  Low quality: ${report.byQuality.low}`);
    console.log(`  Needs review: ${report.byQuality.needsReview}`);
    
    if (report.issues.length > 0) {
      console.log(`\n⚠️  Files needing review: ${report.issues.length}`);
      report.issues.slice(0, 5).forEach(issue => {
        console.log(`  - ${issue.file}`);
        console.log(`    Reasons: ${issue.reasons.join(', ')}`);
      });
      if (report.issues.length > 5) {
        console.log(`  ... and ${report.issues.length - 5} more`);
      }
    }
  }
  
  console.log('\n✅ Indexing complete!');
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = RobustVideoIndexer;
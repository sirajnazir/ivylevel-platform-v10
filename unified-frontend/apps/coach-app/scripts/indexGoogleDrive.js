// scripts/indexGoogleDrive.js
// Index real Google Drive resources for IvyLevel coaches

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Import the CommonJS compatible version
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

class GoogleDriveIndexer {
  constructor() {
    this.drive = null;
    this.auth = null;
    this.rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '1dgx7k3J_z0PO7cOVMqKuFOajl_x_Dulg';
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
      
      console.log('✅ Google Drive API initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Google Drive API:', error.message);
      return false;
    }
  }

  async scanFolder(folderId, folderPath = '', depth = 0) {
    const resources = [];
    let pageToken = null;
    const indent = '  '.repeat(depth);

    console.log(`${indent}📁 Scanning folder: ${folderPath || 'Root'}`);

    do {
      try {
        const response = await this.drive.files.list({
          q: `'${folderId}' in parents and trashed = false`,
          fields: 'nextPageToken, files(id, name, mimeType, webViewLink, webContentLink, size, createdTime, modifiedTime, description, parents)',
          pageToken: pageToken,
          pageSize: 100
        });

        const files = response.data.files || [];
        console.log(`${indent}  Found ${files.length} items`);

        for (const file of files) {
          // If it's a folder, scan recursively
          if (file.mimeType === 'application/vnd.google-apps.folder') {
            console.log(`${indent}  📂 ${file.name}/`);
            const subFolderResources = await this.scanFolder(
              file.id, 
              `${folderPath}/${file.name}`,
              depth + 1
            );
            resources.push(...subFolderResources);
          } else {
            // Process the file
            const resource = this.processFile(file, folderPath);
            if (resource) {
              resources.push(resource);
              console.log(`${indent}  ✓ ${file.name} (${resource.type})`);
            }
          }
        }

        pageToken = response.data.nextPageToken;
      } catch (error) {
        console.error(`${indent}  ❌ Error scanning folder:`, error.message);
        break;
      }
    } while (pageToken);

    return resources;
  }

  processFile(file, folderPath) {
    // Extract metadata from file name and path
    const metadata = this.extractMetadata(file.name, folderPath);
    
    // Skip if not a relevant file type
    const type = this.determineResourceType(file);
    if (!type) {
      console.log(`    Skipping: ${file.name} (unsupported type)`);
      return null;
    }

    return {
      title: this.cleanFileName(file.name),
      description: file.description || this.generateDescription(file.name, folderPath),
      type: type,
      googleDriveId: file.id,
      googleDriveUrl: file.webViewLink,
      mimeType: file.mimeType,
      fileSize: parseInt(file.size || 0),
      duration: type === 'video' ? this.estimateDuration(file) : null,
      thumbnail: this.getThumbnail(file),
      
      // Categorization
      grade: metadata.grades,
      subject: metadata.subjects,
      studentProfile: metadata.profiles,
      tags: metadata.tags,
      
      // Metrics
      viewCount: 0,
      downloadCount: 0,
      averageRating: null,
      
      // Priority
      priority: metadata.priority,
      isRequired: metadata.isRequired,
      recommendedFor: metadata.recommendedFor,
      
      // Metadata
      createdAt: new Date(file.createdTime),
      updatedAt: new Date(file.modifiedTime),
      version: 1,
      
      // Access
      isPublic: true,
      restrictedToRoles: [],
      
      // Path info
      folderPath: folderPath
    };
  }

  determineResourceType(file) {
    const mimeType = file.mimeType;
    const fileName = file.name.toLowerCase();

    if (mimeType.includes('video') || 
        fileName.includes('.mp4') || 
        fileName.includes('.mov') ||
        fileName.includes('recording') || 
        fileName.includes('session')) {
      return 'video';
    }

    if (mimeType.includes('pdf') || 
        mimeType.includes('document') ||
        fileName.includes('.pdf') ||
        fileName.includes('.doc')) {
      return 'document';
    }

    if (fileName.includes('template') || 
        fileName.includes('execution')) {
      return 'template';
    }

    if (fileName.includes('case study') || 
        fileName.includes('success')) {
      return 'case-study';
    }

    if (fileName.includes('game plan')) {
      return 'game-plan';
    }

    // Include spreadsheets
    if (mimeType.includes('spreadsheet') || 
        fileName.includes('.xlsx')) {
      return 'spreadsheet';
    }

    // Include presentations
    if (mimeType.includes('presentation') || 
        fileName.includes('.ppt')) {
      return 'presentation';
    }

    return null;
  }

  extractMetadata(fileName, folderPath) {
    const metadata = {
      grades: [],
      subjects: [],
      profiles: [],
      tags: [],
      priority: 'medium',
      isRequired: false,
      recommendedFor: []
    };

    const combined = `${fileName} ${folderPath}`.toLowerCase();

    // Extract coach names if mentioned
    const coaches = ['kelvin', 'noor', 'jamie', 'marissa', 'iqra', 'andrew', 'aarnav', 'hiba'];
    coaches.forEach(coach => {
      if (combined.includes(coach)) {
        metadata.tags.push(coach);
        metadata.recommendedFor.push(`${coach}-related`);
      }
    });

    // Grade levels
    ['freshman', 'sophomore', 'junior', 'senior'].forEach(grade => {
      if (combined.includes(grade)) {
        metadata.grades.push(grade);
      }
    });

    // If no specific grade, mark as all
    if (metadata.grades.length === 0) {
      metadata.grades.push('all');
    }

    // Subjects
    if (combined.includes('biomed') || combined.includes('pre-med') || combined.includes('medical')) {
      metadata.subjects.push('biomed');
      metadata.tags.push('medical-track');
    }
    if (combined.includes('cs') || combined.includes('computer') || combined.includes('coding')) {
      metadata.subjects.push('cs');
      metadata.tags.push('tech-track');
    }
    if (combined.includes('business') || combined.includes('entrepreneur')) {
      metadata.subjects.push('business');
    }
    if (combined.includes('stem')) {
      metadata.subjects.push('stem');
    }

    // Student profiles
    if (combined.includes('high achiev') || combined.includes('advanced')) {
      metadata.profiles.push('high-achieving');
    }
    if (combined.includes('average') || combined.includes('typical')) {
      metadata.profiles.push('average');
    }
    if (combined.includes('struggling') || combined.includes('support')) {
      metadata.profiles.push('struggling');
    }

    // Priority markers
    if (combined.includes('168') || combined.includes('first session') || combined.includes('onboarding')) {
      metadata.priority = 'high';
      metadata.isRequired = true;
      metadata.tags.push('168-hour');
      metadata.recommendedFor.push('new-coach');
    }

    if (combined.includes('mandatory') || combined.includes('required')) {
      metadata.isRequired = true;
      metadata.priority = 'high';
    }

    // Session types
    if (combined.includes('game plan')) {
      metadata.tags.push('assessment');
      metadata.tags.push('planning');
    }

    if (combined.includes('execution')) {
      metadata.tags.push('execution-doc');
      metadata.tags.push('weekly-planning');
    }

    // Additional tags from path
    const pathParts = folderPath.split('/').filter(p => p);
    pathParts.forEach(part => {
      const cleanPart = part.toLowerCase().replace(/[^a-z0-9]/g, '-');
      if (cleanPart && !metadata.tags.includes(cleanPart)) {
        metadata.tags.push(cleanPart);
      }
    });

    return metadata;
  }

  cleanFileName(fileName) {
    return fileName
      .replace(/\.[^/.]+$/, '')
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  generateDescription(fileName, folderPath) {
    const cleanName = this.cleanFileName(fileName);
    let description = `${cleanName}`;
    
    if (folderPath) {
      description += `. Located in: ${folderPath}`;
    }

    // Add context based on content
    if (fileName.includes('168')) {
      description += '. Part of the 168-hour coaching methodology.';
    }
    if (fileName.includes('game plan')) {
      description += '. Strategic planning document for student success.';
    }
    if (fileName.includes('parent')) {
      description += '. Parent communication and management resource.';
    }

    return description;
  }

  getThumbnail(file) {
    const mimeType = file.mimeType;
    if (mimeType.includes('video')) return '🎥';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('document')) return '📝';
    if (mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('presentation')) return '📽️';
    if (mimeType.includes('folder')) return '📁';
    return '📎';
  }

  estimateDuration(file) {
    // Estimate based on file size (rough approximation)
    const sizeMB = parseInt(file.size || 0) / (1024 * 1024);
    if (sizeMB < 100) return '15-30 min';
    if (sizeMB < 500) return '30-60 min';
    if (sizeMB < 1000) return '60-90 min';
    return '90+ min';
  }

  async saveToFirestore(resources) {
    console.log(`\n💾 Saving ${resources.length} resources to Firestore...`);
    
    let newCount = 0;
    let updateCount = 0;
    let errorCount = 0;

    for (const resource of resources) {
      try {
        // Check if resource already exists
        const existingQuery = await db
          .collection('resources')
          .where('googleDriveId', '==', resource.googleDriveId)
          .limit(1)
          .get();

        if (existingQuery.empty) {
          // Add new resource
          await db.collection('resources').add({
            ...resource,
            createdBy: 'system',
            indexedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          newCount++;
          console.log(`  ✅ Added: ${resource.title}`);
        } else {
          // Update existing resource
          const docId = existingQuery.docs[0].id;
          await db.collection('resources').doc(docId).update({
            ...resource,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          updateCount++;
          console.log(`  🔄 Updated: ${resource.title}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`  ❌ Error with ${resource.title}:`, error.message);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`  ✅ New resources: ${newCount}`);
    console.log(`  🔄 Updated resources: ${updateCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);
    console.log(`  📚 Total in database: ${newCount + updateCount}`);
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting Google Drive Resource Indexing...\n');
  
  const indexer = new GoogleDriveIndexer();
  
  // Initialize Google Drive API
  const initialized = await indexer.initialize();
  if (!initialized) {
    console.error('Failed to initialize Google Drive API');
    process.exit(1);
  }

  console.log(`📂 Root folder ID: ${indexer.rootFolderId}\n`);

  // Scan the Drive folder
  console.log('🔍 Scanning Google Drive for resources...\n');
  const resources = await indexer.scanFolder(indexer.rootFolderId);
  
  console.log(`\n✅ Found ${resources.length} total resources`);

  // Show summary by type
  const typeCount = {};
  resources.forEach(r => {
    typeCount[r.type] = (typeCount[r.type] || 0) + 1;
  });
  
  console.log('\n📊 Resources by type:');
  Object.entries(typeCount).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

  // Save to Firestore
  if (resources.length > 0) {
    await indexer.saveToFirestore(resources);
  }

  console.log('\n✅ Indexing complete!');
  process.exit(0);
}

// Run the indexer
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
// googleDriveService.js - Google Drive API integration service

import { google } from 'googleapis';
import { getFirestore } from 'firebase/firestore';

class GoogleDriveService {
  constructor() {
    this.drive = null;
    this.auth = null;
    this.db = getFirestore();
    this.rootFolderId = '1dgx7k3J_z0PO7cOVMqKuFOajl_x_Dulg'; // Your root folder
  }

  /**
   * Initialize Google Drive API with service account
   * Store credentials in environment variables for security
   */
  async initialize() {
    try {
      // Check if we're in a browser environment
      if (typeof window !== 'undefined') {
        console.warn('Google Drive API cannot be initialized in browser environment. This should be run server-side.');
        return false;
      }

      // For production, use service account credentials
      const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE || './credentials/service-account.json';
      
      // Check if credentials file exists
      const fs = require('fs');
      if (!fs.existsSync(keyFile)) {
        console.error(`Service account key file not found at: ${keyFile}`);
        console.error('Please download your service account credentials from Google Cloud Console');
        return false;
      }

      const auth = new google.auth.GoogleAuth({
        keyFile: keyFile,
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      });

      this.auth = await auth.getClient();
      this.drive = google.drive({ version: 'v3', auth: this.auth });
      
      console.log('Google Drive API initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Google Drive API:', error);
      return false;
    }
  }

  /**
   * Scan and index all resources from Google Drive
   */
  async indexAllResources() {
    try {
      const resources = await this.scanFolder(this.rootFolderId);
      const indexedCount = await this.saveResourcesToFirestore(resources);
      
      console.log(`Indexed ${indexedCount} resources from Google Drive`);
      return indexedCount;
    } catch (error) {
      console.error('Error indexing resources:', error);
      throw error;
    }
  }

  /**
   * Recursively scan folder and its subfolders
   */
  async scanFolder(folderId, folderPath = '') {
    const resources = [];
    let pageToken = null;

    do {
      try {
        const response = await this.drive.files.list({
          q: `'${folderId}' in parents and trashed = false`,
          fields: 'nextPageToken, files(id, name, mimeType, webViewLink, webContentLink, size, createdTime, modifiedTime, description, parents)',
          pageToken: pageToken,
          pageSize: 100
        });

        const files = response.data.files || [];

        for (const file of files) {
          // If it's a folder, scan recursively
          if (file.mimeType === 'application/vnd.google-apps.folder') {
            const subFolderResources = await this.scanFolder(
              file.id, 
              `${folderPath}/${file.name}`
            );
            resources.push(...subFolderResources);
          } else {
            // Process the file
            const resource = await this.processFile(file, folderPath);
            if (resource) {
              resources.push(resource);
            }
          }
        }

        pageToken = response.data.nextPageToken;
      } catch (error) {
        console.error(`Error scanning folder ${folderId}:`, error);
        break;
      }
    } while (pageToken);

    return resources;
  }

  /**
   * Process individual file and extract metadata
   */
  async processFile(file, folderPath) {
    try {
      // Determine resource type based on mime type and file name
      const type = this.determineResourceType(file);
      if (!type) return null; // Skip unsupported files

      // Extract metadata from file name and path
      const metadata = this.extractMetadata(file.name, folderPath);

      // Get additional file details if needed
      let duration = null;
      if (type === 'video') {
        // For videos, you might want to get duration from file metadata
        // This would require additional API calls or video processing
        duration = await this.getVideoDuration(file.id);
      }

      return {
        title: this.cleanFileName(file.name),
        description: file.description || this.generateDescription(file.name, folderPath),
        type: type,
        googleDriveId: file.id,
        googleDriveUrl: file.webViewLink,
        mimeType: file.mimeType,
        fileSize: parseInt(file.size || 0),
        duration: duration,
        thumbnail: this.getThumbnail(file),
        
        // Categorization based on folder structure and file name
        grade: metadata.grades,
        subject: metadata.subjects,
        studentProfile: metadata.profiles,
        tags: metadata.tags,
        
        // Initial metrics
        viewCount: 0,
        downloadCount: 0,
        averageRating: null,
        
        // Priority based on folder location and naming
        priority: metadata.priority,
        isRequired: metadata.isRequired,
        recommendedFor: metadata.recommendedFor,
        
        // Metadata
        createdAt: new Date(file.createdTime),
        updatedAt: new Date(file.modifiedTime),
        version: 1,
        relatedResources: [],
        
        // Access control
        isPublic: true,
        restrictedToRoles: []
      };
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
      return null;
    }
  }

  /**
   * Determine resource type from file
   */
  determineResourceType(file) {
    const mimeType = file.mimeType;
    const fileName = file.name.toLowerCase();

    // Video files
    if (mimeType.includes('video') || 
        fileName.includes('recording') || 
        fileName.includes('session') ||
        fileName.includes('training video')) {
      return 'video';
    }

    // Documents (PDFs, Docs)
    if (mimeType.includes('pdf') || 
        mimeType.includes('document') ||
        fileName.includes('report') ||
        fileName.includes('plan')) {
      return 'document';
    }

    // Templates
    if (fileName.includes('template') || 
        fileName.includes('execution doc')) {
      return 'template';
    }

    // Case studies
    if (fileName.includes('case study') || 
        fileName.includes('success story')) {
      return 'case-study';
    }

    // Game plans
    if (fileName.includes('game plan')) {
      return 'game-plan';
    }

    // Skip other file types
    return null;
  }

  /**
   * Extract metadata from file name and folder path
   */
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

    const lowerFileName = fileName.toLowerCase();
    const lowerPath = folderPath.toLowerCase();

    // Extract grade levels
    if (lowerFileName.includes('freshman') || lowerPath.includes('freshman')) {
      metadata.grades.push('freshman');
    }
    if (lowerFileName.includes('sophomore') || lowerPath.includes('sophomore')) {
      metadata.grades.push('sophomore');
    }
    if (lowerFileName.includes('junior') || lowerPath.includes('junior')) {
      metadata.grades.push('junior');
    }
    if (lowerFileName.includes('senior') || lowerPath.includes('senior')) {
      metadata.grades.push('senior');
    }
    if (metadata.grades.length === 0) {
      metadata.grades.push('all');
    }

    // Extract subjects
    if (lowerFileName.includes('biomed') || lowerPath.includes('biomed')) {
      metadata.subjects.push('biomed');
      metadata.tags.push('biomed');
    }
    if (lowerFileName.includes('cs') || lowerFileName.includes('computer science')) {
      metadata.subjects.push('cs');
      metadata.tags.push('computer-science');
    }
    if (lowerFileName.includes('business')) {
      metadata.subjects.push('business');
      metadata.tags.push('business');
    }
    if (lowerFileName.includes('stem')) {
      metadata.subjects.push('stem');
    }
    if (metadata.subjects.length === 0) {
      metadata.subjects.push('general');
    }

    // Extract student profiles
    if (lowerFileName.includes('high achiev') || lowerFileName.includes('advanced')) {
      metadata.profiles.push('high-achieving');
    }
    if (lowerFileName.includes('average') || lowerFileName.includes('typical')) {
      metadata.profiles.push('average');
    }
    if (lowerFileName.includes('struggling') || lowerFileName.includes('support')) {
      metadata.profiles.push('struggling');
    }
    if (metadata.profiles.length === 0) {
      metadata.profiles.push('all');
    }

    // Extract priority and required status
    if (lowerFileName.includes('mandatory') || 
        lowerFileName.includes('required') ||
        lowerFileName.includes('must')) {
      metadata.isRequired = true;
      metadata.priority = 'high';
    }
    
    if (lowerFileName.includes('168') || 
        lowerFileName.includes('first session')) {
      metadata.priority = 'high';
      metadata.tags.push('168-hour');
      metadata.tags.push('first-session');
      metadata.recommendedFor.push('new-coach');
    }

    // Extract additional tags
    if (lowerFileName.includes('game plan')) {
      metadata.tags.push('game-plan');
      metadata.tags.push('assessment');
    }
    if (lowerFileName.includes('execution')) {
      metadata.tags.push('execution-doc');
      metadata.tags.push('planning');
    }
    if (lowerFileName.includes('success')) {
      metadata.tags.push('success-story');
    }

    return metadata;
  }

  /**
   * Clean file name for display
   */
  cleanFileName(fileName) {
    return fileName
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/_/g, ' ')       // Replace underscores with spaces
      .replace(/-/g, ' ')       // Replace hyphens with spaces
      .replace(/\s+/g, ' ')     // Remove extra spaces
      .trim();
  }

  /**
   * Generate description based on file analysis
   */
  generateDescription(fileName, folderPath) {
    const cleanName = this.cleanFileName(fileName);
    const pathParts = folderPath.split('/').filter(p => p);
    
    let description = `Resource: ${cleanName}`;
    
    if (pathParts.length > 0) {
      description += `. Located in: ${pathParts.join(' > ')}`;
    }
    
    // Add context based on keywords
    if (fileName.toLowerCase().includes('168')) {
      description += '. Comprehensive first session training material.';
    }
    if (fileName.toLowerCase().includes('game plan')) {
      description += '. Student assessment and strategic planning document.';
    }
    if (fileName.toLowerCase().includes('execution')) {
      description += '. Weekly planning and execution tracking template.';
    }
    
    return description;
  }

  /**
   * Get thumbnail for file
   */
  getThumbnail(file) {
    // Google Drive provides thumbnail links for certain file types
    if (file.thumbnailLink) {
      return file.thumbnailLink;
    }
    
    // Use emoji placeholders based on type
    const mimeType = file.mimeType;
    if (mimeType.includes('video')) return '🎥';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('document')) return '📝';
    if (mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('presentation')) return '📽️';
    
    return '📁';
  }

  /**
   * Get video duration (placeholder - requires additional processing)
   */
  async getVideoDuration(fileId) {
    // In a real implementation, you would:
    // 1. Download video metadata or
    // 2. Use a video processing service or
    // 3. Store duration in file description/properties
    return '90 min'; // Placeholder
  }

  /**
   * Save resources to Firestore
   */
  async saveResourcesToFirestore(resources) {
    const batch = this.db.batch();
    let count = 0;

    for (const resource of resources) {
      try {
        // Check if resource already exists
        const existingQuery = await this.db
          .collection('resources')
          .where('googleDriveId', '==', resource.googleDriveId)
          .limit(1)
          .get();

        if (existingQuery.empty) {
          // Add new resource
          const docRef = this.db.collection('resources').doc();
          batch.set(docRef, {
            ...resource,
            createdAt: new Date(),
            createdBy: 'system'
          });
          count++;
        } else {
          // Update existing resource
          const docId = existingQuery.docs[0].id;
          batch.update(this.db.collection('resources').doc(docId), {
            ...resource,
            updatedAt: new Date()
          });
        }
      } catch (error) {
        console.error(`Error processing resource ${resource.title}:`, error);
      }
    }

    await batch.commit();
    return count;
  }

  /**
   * Search resources in Google Drive
   */
  async searchResources(query, filters = {}) {
    try {
      let driveQuery = `'${this.rootFolderId}' in parents and trashed = false`;
      
      // Add search query
      if (query) {
        driveQuery += ` and fullText contains '${query}'`;
      }

      // Add mime type filter
      if (filters.type) {
        const mimeTypes = {
          'video': 'video',
          'document': 'application/pdf',
          'spreadsheet': 'application/vnd.google-apps.spreadsheet'
        };
        
        if (mimeTypes[filters.type]) {
          driveQuery += ` and mimeType contains '${mimeTypes[filters.type]}'`;
        }
      }

      const response = await this.drive.files.list({
        q: driveQuery,
        fields: 'files(id, name, mimeType, webViewLink)',
        pageSize: 50
      });

      return response.data.files || [];
    } catch (error) {
      console.error('Error searching Google Drive:', error);
      throw error;
    }
  }

  /**
   * Get file permissions
   */
  async getFilePermissions(fileId) {
    try {
      const response = await this.drive.permissions.list({
        fileId: fileId,
        fields: 'permissions(id, type, role, emailAddress)'
      });

      return response.data.permissions || [];
    } catch (error) {
      console.error('Error getting file permissions:', error);
      throw error;
    }
  }

  /**
   * Share file with view-only access
   */
  async shareFileWithCoach(fileId, coachEmail) {
    try {
      const permission = {
        type: 'user',
        role: 'reader',
        emailAddress: coachEmail
      };

      const response = await this.drive.permissions.create({
        fileId: fileId,
        requestBody: permission,
        sendNotificationEmail: false
      });

      return response.data;
    } catch (error) {
      console.error('Error sharing file:', error);
      throw error;
    }
  }
}

// Usage in your application
export const initializeGoogleDrive = async () => {
  const driveService = new GoogleDriveService();
  await driveService.initialize();
  return driveService;
};

// Scheduled job to sync resources (run daily)
export const syncGoogleDriveResources = async () => {
  const driveService = new GoogleDriveService();
  await driveService.initialize();
  
  console.log('Starting Google Drive sync...');
  const count = await driveService.indexAllResources();
  console.log(`Sync complete. Indexed ${count} new resources.`);
  
  return count;
};

export default GoogleDriveService;
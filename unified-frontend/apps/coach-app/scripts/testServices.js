// scripts/testServices.js
// CommonJS versions of services for testing

// Mock Google Drive Service
class GoogleDriveService {
  constructor() {
    this.drive = null;
    this.auth = null;
    this.rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || 'test-folder-id';
  }

  async initialize() {
    try {
      if (typeof window !== 'undefined') {
        console.warn('Google Drive API cannot be initialized in browser environment');
        return false;
      }

      const fs = require('fs');
      const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE || './credentials/service-account.json';
      
      if (!fs.existsSync(keyFile)) {
        console.error(`Service account key file not found at: ${keyFile}`);
        return false;
      }

      // In a real implementation, we'd initialize Google APIs here
      console.log('Mock Google Drive API initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize Google Drive API:', error);
      return false;
    }
  }
}

// Mock Recommendation Engine
class RecommendationEngine {
  constructor() {
    this.initialized = true;
  }

  async getRecommendationsForCoach(coach, students, existingResources) {
    // Mock recommendations
    return [
      {
        id: 'mock-resource-1',
        title: 'Test Resource 1',
        relevanceScore: 0.95,
        reason: 'Matches coach profile'
      },
      {
        id: 'mock-resource-2',
        title: 'Test Resource 2',
        relevanceScore: 0.85,
        reason: 'Popular with similar coaches'
      }
    ];
  }
}

// Mock Email Provider
class EmailProvider {
  constructor() {
    this.provider = process.env.REACT_APP_EMAIL_PROVIDER || 'console';
    this.initialized = false;
  }

  async initialize() {
    this.initialized = true;
    console.log(`Mock email provider initialized (${this.provider} mode)`);
    return true;
  }

  async sendEmail(emailContent) {
    if (!this.initialized) {
      await this.initialize();
    }

    console.log('Mock email sent successfully');
    return {
      success: true,
      provider: this.provider,
      messageId: `mock-${Date.now()}`
    };
  }
}

// Mock email automation
async function generateOnboardingEmail(coach, resources) {
  return {
    subject: `Welcome ${coach.name}, Your Mandatory Training & Checklist Items`,
    recipients: {
      to: [coach.email],
      cc: [],
      bcc: []
    },
    htmlBody: '<h1>Welcome Email</h1><p>Mock email content</p>',
    plainTextBody: 'Welcome Email - Mock email content',
    metadata: {
      coachId: coach.id,
      type: 'onboarding'
    }
  };
}

module.exports = {
  GoogleDriveService,
  RecommendationEngine,
  EmailProvider,
  generateOnboardingEmail
};
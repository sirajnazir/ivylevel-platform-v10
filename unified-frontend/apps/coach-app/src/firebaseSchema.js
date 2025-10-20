// firebaseSchema.js - Complete Firestore database schema for the platform

/**
 * Firestore Database Schema Documentation
 * Collections and their document structures
 */

const FirestoreSchema = {
  // Users Collection - Stores all user accounts (coaches and admins)
  users: {
    collectionName: 'users',
    documentId: 'userId (auto-generated)',
    fields: {
      // Basic Information
      email: 'string',
      name: 'string',
      role: 'string', // 'admin' | 'coach'
      status: 'string', // 'active' | 'training' | 'inactive' | 'certified'
      createdAt: 'timestamp',
      lastLogin: 'timestamp',
      
      // Coach-specific fields
      trainingStartDate: 'timestamp',
      trainingDeadline: 'timestamp',
      certificationDate: 'timestamp | null',
      profileImageUrl: 'string | null',
      
      // Progress tracking
      currentModule: 'number', // 1-5
      completedModules: 'array<number>',
      moduleScores: {
        module2: 'number | null', // Quiz score
        module4: 'number | null', // Simulation score
        module5: 'number | null'  // Emergency protocols score
      },
      
      // Contact and payment
      phone: 'string | null',
      mercuryAccountEmail: 'string | null',
      zoomEmail: 'string | null',
      paymentMethod: 'string | null',
      
      // Metadata
      lastActivityAt: 'timestamp',
      totalSessionsCompleted: 'number',
      averageRating: 'number | null'
    }
  },

  // Students Collection - All students in the system
  students: {
    collectionName: 'students',
    documentId: 'studentId (auto-generated)',
    fields: {
      // Basic Information
      name: 'string',
      email: 'string',
      parentEmail: 'string',
      phone: 'string | null',
      grade: 'string', // 'freshman' | 'sophomore' | 'junior' | 'senior'
      school: 'string',
      
      // Academic Profile
      gpa: 'number',
      academicProfile: 'string', // 'high-achieving' | 'average' | 'struggling'
      interests: 'array<string>', // ['biomed', 'cs', 'business', etc.]
      careerAspirations: 'string',
      
      // Assessment Data
      weakSpots: 'array<string>',
      quickWins: 'array<string>',
      priorityAreas: 'array<string>',
      gamePlanUrl: 'string | null',
      assessmentVideoUrl: 'string | null',
      assessmentDate: 'timestamp',
      
      // Assignment
      assignedCoachId: 'string | null',
      assignmentDate: 'timestamp | null',
      firstSessionDate: 'timestamp | null',
      
      // Progress
      totalSessions: 'number',
      currentProgress: 'number', // 0-100 percentage
      lastSessionDate: 'timestamp | null',
      nextSessionDate: 'timestamp | null',
      
      // Metadata
      createdAt: 'timestamp',
      updatedAt: 'timestamp',
      status: 'string' // 'active' | 'paused' | 'completed'
    }
  },

  // Resources Collection - All training and educational resources
  resources: {
    collectionName: 'resources',
    documentId: 'resourceId (auto-generated)',
    fields: {
      // Basic Information
      title: 'string',
      description: 'string',
      type: 'string', // 'video' | 'document' | 'template' | 'case-study' | 'game-plan'
      
      // File Information
      googleDriveId: 'string',
      googleDriveUrl: 'string',
      mimeType: 'string',
      fileSize: 'number', // in bytes
      duration: 'string | null', // for videos (e.g., "90 min")
      thumbnail: 'string | null',
      
      // Categorization
      grade: 'array<string>', // ['all'] or ['sophomore', 'junior']
      subject: 'array<string>', // ['biomed', 'cs', 'business', 'stem', 'humanities']
      studentProfile: 'array<string>', // ['all'] or ['high-achieving', 'average', 'struggling']
      tags: 'array<string>',
      
      // Usage Metadata
      viewCount: 'number',
      downloadCount: 'number',
      averageRating: 'number | null',
      lastAccessedAt: 'timestamp',
      
      // Relevance and Priority
      priority: 'string', // 'high' | 'medium' | 'low'
      isRequired: 'boolean',
      recommendedFor: 'array<string>', // Array of scenario tags
      
      // Content Metadata
      createdBy: 'string',
      createdAt: 'timestamp',
      updatedAt: 'timestamp',
      version: 'number',
      relatedResources: 'array<string>', // Resource IDs
      
      // Access Control
      isPublic: 'boolean',
      restrictedToRoles: 'array<string>' // Empty array means all roles
    }
  },

  // Coach-Resource Assignments - Tracks which resources are shared with coaches
  coachResources: {
    collectionName: 'coachResources',
    documentId: 'coachResourceId (auto-generated)',
    fields: {
      coachId: 'string',
      resourceId: 'string',
      sharedAt: 'timestamp',
      sharedBy: 'string', // Admin user ID
      
      // Relevance and Matching
      relevanceScore: 'number', // 0-100
      matchingCriteria: {
        studentMatch: 'boolean',
        gradeMatch: 'boolean',
        subjectMatch: 'boolean',
        profileMatch: 'boolean'
      },
      
      // Usage Tracking
      firstAccessedAt: 'timestamp | null',
      lastAccessedAt: 'timestamp | null',
      accessCount: 'number',
      downloadedAt: 'timestamp | null',
      
      // Feedback
      rating: 'number | null', // 1-5
      feedback: 'string | null',
      wasHelpful: 'boolean | null',
      
      // Metadata
      expiresAt: 'timestamp | null',
      notes: 'string | null'
    }
  },

  // Resource Templates - Pre-configured resource bundles
  resourceTemplates: {
    collectionName: 'resourceTemplates',
    documentId: 'templateId (auto-generated)',
    fields: {
      name: 'string',
      description: 'string',
      category: 'string',
      
      // Resources in this template
      resourceIds: 'array<string>',
      
      // Targeting
      targetGrades: 'array<string>',
      targetSubjects: 'array<string>',
      targetProfiles: 'array<string>',
      tags: 'array<string>',
      
      // Usage
      useCount: 'number',
      lastUsedAt: 'timestamp',
      
      // Metadata
      createdBy: 'string',
      createdAt: 'timestamp',
      updatedAt: 'timestamp',
      isActive: 'boolean'
    }
  },

  // Sessions Collection - Training and coaching sessions
  sessions: {
    collectionName: 'sessions',
    documentId: 'sessionId (auto-generated)',
    fields: {
      // Participants
      coachId: 'string',
      studentId: 'string',
      
      // Session Details
      sessionNumber: 'number',
      type: 'string', // 'training' | 'regular' | '168-hour' | 'check-in'
      scheduledAt: 'timestamp',
      startedAt: 'timestamp | null',
      endedAt: 'timestamp | null',
      duration: 'number | null', // in minutes
      
      // Content
      agenda: 'string',
      notes: 'string | null',
      actionItems: 'array<object>', // [{task: string, dueDate: timestamp, completed: boolean}]
      resourcesUsed: 'array<string>', // Resource IDs
      
      // Zoom Integration
      zoomMeetingId: 'string | null',
      zoomRecordingUrl: 'string | null',
      
      // Status
      status: 'string', // 'scheduled' | 'completed' | 'cancelled' | 'no-show'
      cancellationReason: 'string | null',
      
      // Follow-up
      recapEmailSent: 'boolean',
      recapEmailSentAt: 'timestamp | null',
      parentNotified: 'boolean',
      
      // Metadata
      createdAt: 'timestamp',
      updatedAt: 'timestamp'
    }
  },

  // Notifications Collection - System notifications and alerts
  notifications: {
    collectionName: 'notifications',
    documentId: 'notificationId (auto-generated)',
    fields: {
      // Target
      userId: 'string',
      type: 'string', // 'deadline' | 'resource' | 'session' | 'achievement' | 'system'
      priority: 'string', // 'high' | 'medium' | 'low'
      
      // Content
      title: 'string',
      message: 'string',
      actionUrl: 'string | null',
      actionText: 'string | null',
      
      // Status
      isRead: 'boolean',
      readAt: 'timestamp | null',
      
      // Metadata
      createdAt: 'timestamp',
      expiresAt: 'timestamp | null',
      metadata: 'object' // Additional data specific to notification type
    }
  },

  // Analytics Collection - Platform usage analytics
  analytics: {
    collectionName: 'analytics',
    documentId: 'analyticsId (auto-generated)',
    fields: {
      // Event Information
      eventType: 'string', // 'login' | 'resource_access' | 'module_complete' | 'session_complete'
      userId: 'string',
      userRole: 'string',
      
      // Event Details
      eventData: 'object', // Specific data for each event type
      timestamp: 'timestamp',
      
      // Context
      platform: 'string', // 'web' | 'mobile'
      userAgent: 'string',
      ipAddress: 'string | null',
      
      // Performance
      loadTime: 'number | null', // in milliseconds
      errorOccurred: 'boolean',
      errorMessage: 'string | null'
    }
  },

  // Email Templates Collection - Automated email templates
  emailTemplates: {
    collectionName: 'emailTemplates',
    documentId: 'templateId',
    fields: {
      name: 'string',
      subject: 'string',
      bodyTemplate: 'string', // HTML template with placeholders
      
      // Variables
      requiredVariables: 'array<string>', // ['coachName', 'studentNames', etc.]
      
      // Usage
      type: 'string', // 'onboarding' | 'session-recap' | 'reminder' | 'deadline'
      isActive: 'boolean',
      
      // Metadata
      createdAt: 'timestamp',
      updatedAt: 'timestamp',
      lastUsedAt: 'timestamp | null',
      useCount: 'number'
    }
  }
};

// Firestore Security Rules
const firestoreRules = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isSignedIn() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    function isCoach() {
      return isSignedIn() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'coach';
    }
    
    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isSignedIn() && (isOwner(userId) || isAdmin());
      allow create: if isAdmin();
      allow update: if isOwner(userId) || isAdmin();
      allow delete: if isAdmin();
    }
    
    // Students collection
    match /students/{studentId} {
      allow read: if isSignedIn() && (isAdmin() || 
        (isCoach() && resource.data.assignedCoachId == request.auth.uid));
      allow write: if isAdmin();
    }
    
    // Resources collection
    match /resources/{resourceId} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }
    
    // CoachResources collection
    match /coachResources/{docId} {
      allow read: if isSignedIn() && 
        (isAdmin() || resource.data.coachId == request.auth.uid);
      allow create: if isAdmin();
      allow update: if isAdmin() || 
        (resource.data.coachId == request.auth.uid && 
         request.resource.data.diff(resource.data).affectedKeys()
         .hasOnly(['rating', 'feedback', 'wasHelpful', 'lastAccessedAt', 'accessCount']));
      allow delete: if isAdmin();
    }
    
    // Sessions collection
    match /sessions/{sessionId} {
      allow read: if isSignedIn() && 
        (isAdmin() || resource.data.coachId == request.auth.uid);
      allow write: if isAdmin() || 
        (isCoach() && resource.data.coachId == request.auth.uid);
    }
    
    // Notifications collection
    match /notifications/{notificationId} {
      allow read: if isSignedIn() && resource.data.userId == request.auth.uid;
      allow update: if isSignedIn() && resource.data.userId == request.auth.uid &&
        request.resource.data.diff(resource.data).affectedKeys()
        .hasOnly(['isRead', 'readAt']);
      allow create, delete: if isAdmin();
    }
    
    // Analytics collection
    match /analytics/{analyticsId} {
      allow read: if isAdmin();
      allow create: if isSignedIn();
      allow update, delete: if false; // Analytics should be immutable
    }
    
    // Email templates
    match /emailTemplates/{templateId} {
      allow read: if isAdmin();
      allow write: if isAdmin();
    }
    
    // Resource templates
    match /resourceTemplates/{templateId} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }
  }
}
`;

// Indexes needed for efficient queries
const firestoreIndexes = [
  {
    collectionId: 'users',
    fields: [
      { fieldPath: 'role', mode: 'ASCENDING' },
      { fieldPath: 'status', mode: 'ASCENDING' },
      { fieldPath: 'createdAt', mode: 'DESCENDING' }
    ]
  },
  {
    collectionId: 'students',
    fields: [
      { fieldPath: 'assignedCoachId', mode: 'ASCENDING' },
      { fieldPath: 'status', mode: 'ASCENDING' },
      { fieldPath: 'grade', mode: 'ASCENDING' }
    ]
  },
  {
    collectionId: 'resources',
    fields: [
      { fieldPath: 'type', mode: 'ASCENDING' },
      { fieldPath: 'priority', mode: 'ASCENDING' },
      { fieldPath: 'createdAt', mode: 'DESCENDING' }
    ]
  },
  {
    collectionId: 'coachResources',
    fields: [
      { fieldPath: 'coachId', mode: 'ASCENDING' },
      { fieldPath: 'relevanceScore', mode: 'DESCENDING' },
      { fieldPath: 'sharedAt', mode: 'DESCENDING' }
    ]
  },
  {
    collectionId: 'sessions',
    fields: [
      { fieldPath: 'coachId', mode: 'ASCENDING' },
      { fieldPath: 'studentId', mode: 'ASCENDING' },
      { fieldPath: 'scheduledAt', mode: 'ASCENDING' }
    ]
  },
  {
    collectionId: 'notifications',
    fields: [
      { fieldPath: 'userId', mode: 'ASCENDING' },
      { fieldPath: 'isRead', mode: 'ASCENDING' },
      { fieldPath: 'createdAt', mode: 'DESCENDING' }
    ]
  }
];

export { FirestoreSchema, firestoreRules, firestoreIndexes };
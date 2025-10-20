# Quick Start Guide

## What's Working Now

Your client-side app is configured and ready to run! Here's what you can do:

### ✅ Available Features
- **User Authentication**: Login/logout with Firebase Auth
- **Admin Dashboard**: View and manage coaches
- **Coach Dashboard**: View assigned resources and students  
- **Resource Management UI**: Browse and filter resources
- **Email Preview**: Generate emails (console output only)
- **Real-time Updates**: Firebase Firestore sync

### ⚠️ Limited Features (Need Additional Setup)
- **Google Drive Sync**: Requires service account credentials
- **Database Initialization**: Requires Firebase Admin SDK
- **Test Data Creation**: Requires Firebase Admin SDK
- **Production Email Sending**: Currently using console fallback

## Start the Application

```bash
npm start
```

The app will open at http://localhost:3000

## Manual Setup (Without Scripts)

Since the initialization scripts require admin credentials, you can set up test data manually:

### 1. Create Admin User
- Use Firebase Console to create a user with email: `admin@ivylevel.com`
- In Firestore, create a document in `users` collection with their UID:
  ```json
  {
    "email": "admin@ivylevel.com",
    "name": "Admin User",
    "role": "admin",
    "status": "active"
  }
  ```

### 2. Create Test Coach
- Create another user: `coach@ivylevel.com`
- Add to `users` collection:
  ```json
  {
    "email": "coach@ivylevel.com",
    "name": "Test Coach",
    "role": "coach",
    "status": "training",
    "currentModule": 1
  }
  ```

### 3. Create Test Resources
- Add documents to `resources` collection:
  ```json
  {
    "title": "Getting Started Guide",
    "type": "document",
    "description": "Introduction to coaching",
    "googleDriveUrl": "https://example.com",
    "priority": "high",
    "grade": ["all"],
    "subject": ["general"]
  }
  ```

## Next Steps

1. **For Full Features**: Follow [SETUP-INSTRUCTIONS.md](./SETUP-INSTRUCTIONS.md) to add:
   - Firebase Admin SDK credentials
   - Google Drive service account
   
2. **For Production**: Configure:
   - SendGrid API key for real email sending
   - Google Drive folder sharing
   - Firestore security rules deployment

## Testing the App

1. Login as admin@ivylevel.com
2. Navigate to Admin Dashboard
3. Try the Resource Management tab
4. Generate a test onboarding email (check console)

The app is fully functional for development even without the optional services!
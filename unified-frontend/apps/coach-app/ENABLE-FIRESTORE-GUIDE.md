# Enable Firestore Guide

## Quick Fix - Enable Firestore

The error message gave us a direct link! You have two options:

### Option 1: Use the Direct Link (Fastest)
1. Click this link: https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=ivylevel-coach-train-auth
2. You should see a big blue **"ENABLE"** button
3. Click it
4. Wait about 30 seconds for it to activate

### Option 2: Through Firebase Console
1. Go to: https://console.firebase.google.com/project/ivylevel-coach-train-auth
2. In the left sidebar, find **"Firestore Database"**
3. Click on it
4. Click **"Create database"**
5. Choose:
   - **Start in production mode** (we'll use our security rules)
   - Click **"Next"**
6. Choose location:
   - Select **"nam5 (United States)"** or your nearest location
   - Click **"Enable"**

## After Enabling Firestore

Wait about 1-2 minutes, then run the test again:

```bash
npm run test:integration
```

You should now see:
- ✅ Firebase connection successful
- ✅ Google Drive API initialized
- ✅ All other services working

## If Everything Passes

Run the setup to initialize your database:

```bash
npm run setup
```

This will:
1. Create all the Firestore collections
2. Add sample email templates
3. Create test data (coaches, students, resources)

## What Success Looks Like

```
✅ firebase: success
   Connected to Firestore successfully
✅ googleDrive: success
   API initialized and ready
✅ recommendations: success
   Generated 2 recommendations
✅ email: success
   Using console provider

==================================================
✅ All tests passed! The platform is ready to use.
==================================================
```

You're almost there! Just need to enable Firestore and you'll be all set.
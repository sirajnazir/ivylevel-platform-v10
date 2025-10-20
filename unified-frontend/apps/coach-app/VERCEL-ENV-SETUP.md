# Vercel Environment Variables Setup

## Quick Copy-Paste Guide

1. Go to: https://vercel.com/dashboard
2. Click on your `ivylevel-coach-training` project
3. Navigate to: Settings → Environment Variables
4. Add each variable below (copy the entire line for each):

### Variables to Add:

```
Name: REACT_APP_FIREBASE_API_KEY
Value: AIzaSyDCWR-9lf5Z966lM5WnaHx_P0RPTYoHgVk
```

```
Name: REACT_APP_FIREBASE_AUTH_DOMAIN
Value: ivylevel-coach-train-auth.firebaseapp.com
```

```
Name: REACT_APP_FIREBASE_PROJECT_ID
Value: ivylevel-coach-train-auth
```

```
Name: REACT_APP_FIREBASE_STORAGE_BUCKET
Value: ivylevel-coach-train-auth.firebasestorage.app
```

```
Name: REACT_APP_FIREBASE_MESSAGING_SENDER_ID
Value: 780638660787
```

```
Name: REACT_APP_FIREBASE_APP_ID
Value: 1:780638660787:web:f88fddc8fb5fd21b25e8c6
```

## After Adding All Variables:

1. Go to the "Deployments" tab
2. Find the latest deployment
3. Click the three dots (...) menu
4. Select "Redeploy"
5. Choose "Use existing Build Cache" and click "Redeploy"

## Verify Deployment:

After 2-3 minutes, visit: https://ivylevel-coach-training.vercel.app/

You should see:
- 🧠 AI Coach Pro homepage
- Real data loading when you click on dashboards
- 13 coaches in the Admin Dashboard
- 865+ videos in the video list

## Troubleshooting:

If data doesn't load:
1. Check browser console (F12) for errors
2. Verify all 6 environment variables are added
3. Make sure to redeploy after adding variables
4. Check Firebase Console for any security rule issues
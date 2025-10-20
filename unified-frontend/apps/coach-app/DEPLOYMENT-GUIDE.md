# Deployment Guide for IvyLevel Coach Training Platform

## Option 1: Deploy to Vercel (Recommended)

### Prerequisites
- Vercel account (free at vercel.com)
- Git repository (GitHub, GitLab, or Bitbucket)

### Steps

1. **Push your code to Git**
   ```bash
   git add .
   git commit -m "Production-ready app with Firebase integration"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to https://vercel.com/new
   - Import your Git repository
   - Vercel will auto-detect Create React App

3. **Configure Environment Variables**
   In Vercel dashboard, go to Settings → Environment Variables and add:
   ```
   REACT_APP_FIREBASE_API_KEY=AIzaSyDCWR-9lf5Z966lM5WnaHx_P0RPTYoHgVk
   REACT_APP_FIREBASE_AUTH_DOMAIN=ivylevel-coach-train-auth.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=ivylevel-coach-train-auth
   REACT_APP_FIREBASE_STORAGE_BUCKET=ivylevel-coach-train-auth.firebasestorage.app
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=780638660787
   REACT_APP_FIREBASE_APP_ID=1:780638660787:web:f88fddc8fb5fd21b25e8c6
   ```

4. **Deploy**
   - Click "Deploy"
   - Your app will be live at `https://your-project.vercel.app`

## Option 2: Deploy to Render

### Steps

1. **Create Web Service on Render**
   - Go to https://render.com
   - New → Web Service
   - Connect your GitHub repository

2. **Configure Build Settings**
   - Build Command: `npm install && npm run build`
   - Start Command: `serve -s build`
   - Add to package.json: `"serve": "^14.2.0"` in dependencies

3. **Add Environment Variables**
   Same as Vercel (all REACT_APP_* variables)

4. **Deploy**
   - Click "Create Web Service"
   - Your app will be live at `https://your-project.onrender.com`

## Option 3: Deploy to Netlify

1. **Drag & Drop Deploy**
   - Run `npm run build` locally
   - Go to https://app.netlify.com/drop
   - Drag the `build` folder to deploy instantly

2. **Add Environment Variables**
   - Site Settings → Environment Variables
   - Add all REACT_APP_* variables

## Firebase Security Rules

Make sure your Firebase Firestore rules allow read access:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read access to all collections
    match /{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## Troubleshooting

1. **If data doesn't load:**
   - Check browser console for errors
   - Verify environment variables are set correctly
   - Check Firebase project settings

2. **CORS Issues:**
   - Add your deployment domain to Firebase authorized domains
   - Go to Firebase Console → Authentication → Settings → Authorized domains

3. **Build Errors:**
   - Clear cache: `rm -rf node_modules package-lock.json && npm install`
   - Ensure all dependencies are in package.json

## Production Features

Your deployed app will have:
- ✅ Real coaches from Firebase (13 coaches)
- ✅ 865+ indexed videos from Google Drive
- ✅ Live platform statistics
- ✅ AI coaching dashboard
- ✅ Admin management interface
- ✅ Coach onboarding system

## Quick Deploy Commands

### Vercel CLI
```bash
npm i -g vercel
vercel
```

### Netlify CLI
```bash
npm i -g netlify-cli
netlify deploy --prod --dir=build
```

## Support

For issues with:
- Firebase: Check Firebase Console logs
- Vercel: support@vercel.com
- Render: support@render.com
- Netlify: support@netlify.com
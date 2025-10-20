# Fixing Vercel Environment Variable Issues

## Option 1: Try Different Input Methods

### For REACT_APP_FIREBASE_API_KEY:
Instead of pasting directly, try:
1. Type it manually character by character
2. Or wrap in quotes: `"AIzaSyDCWR-9lf5Z966lM5WnaHx_P0RPTYoHgVk"`
3. Or add it via Vercel CLI (see below)

### For REACT_APP_FIREBASE_AUTH_DOMAIN:
Try without the protocol:
- Use: `ivylevel-coach-train-auth.firebaseapp.com`
- NOT: `https://ivylevel-coach-train-auth.firebaseapp.com`

## Option 2: Use Vercel CLI

Install Vercel CLI and add variables via command line:

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link to your project
vercel link

# Add environment variables
vercel env add REACT_APP_FIREBASE_API_KEY production
# When prompted, paste: AIzaSyDCWR-9lf5Z966lM5WnaHx_P0RPTYoHgVk

vercel env add REACT_APP_FIREBASE_AUTH_DOMAIN production
# When prompted, paste: ivylevel-coach-train-auth.firebaseapp.com

# Add the rest similarly...
vercel env add REACT_APP_FIREBASE_PROJECT_ID production
vercel env add REACT_APP_FIREBASE_STORAGE_BUCKET production
vercel env add REACT_APP_FIREBASE_MESSAGING_SENDER_ID production
vercel env add REACT_APP_FIREBASE_APP_ID production
```

## Option 3: Use a Different Format

If Vercel still blocks it, create a single JSON config:

1. Add one environment variable:
   ```
   Name: REACT_APP_FIREBASE_CONFIG
   Value: {"apiKey":"AIzaSyDCWR-9lf5Z966lM5WnaHx_P0RPTYoHgVk","authDomain":"ivylevel-coach-train-auth.firebaseapp.com","projectId":"ivylevel-coach-train-auth","storageBucket":"ivylevel-coach-train-auth.firebasestorage.app","messagingSenderId":"780638660787","appId":"1:780638660787:web:f88fddc8fb5fd21b25e8c6"}
   ```

2. Then update firebase-config.js to parse it:
   ```javascript
   const firebaseConfig = process.env.REACT_APP_FIREBASE_CONFIG 
     ? JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG)
     : {
         apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
         // ... rest of config
       };
   ```

## Option 4: Bypass Warning

Sometimes you can:
1. Click "Add anyway" or "Confirm" if there's an option
2. Check if there's a checkbox for "I understand the risks"
3. Look for an "Advanced" or "Show more options" link

## Quick Test

Try adding just these first to see if they work:
```
REACT_APP_FIREBASE_PROJECT_ID = ivylevel-coach-train-auth
REACT_APP_FIREBASE_MESSAGING_SENDER_ID = 780638660787
```

If these work, we know the issue is specifically with the API key and auth domain values.